import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type Status = "pending" | "approved" | "hidden" | "rejected";

function computeStatus(row: { approved: boolean; rejected: boolean; hidden: boolean }): Status {
  if (row.hidden) return "hidden";
  if (row.rejected) return "rejected";
  if (row.approved) return "approved";
  return "pending";
}

async function requireAdmin(context: { userId: string; claims: any; supabase: any }) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", context.userId)
    .eq("role", "admin")
    .maybeSingle();
  if (error || !data) throw new Error("Forbidden: admin role required");
  const email = (context.claims?.email as string | undefined) ?? "admin";
  return { supabaseAdmin, adminId: context.userId, adminEmail: email };
}

async function writeLog(opts: {
  supabaseAdmin: any;
  blessing_id: string | null;
  guest_name: string | null;
  action: string;
  administrator: string;
  administrator_id: string | null;
  previous_status: string | null;
  new_status: string | null;
  reason?: string | null;
}) {
  const { supabaseAdmin, ...row } = opts;
  await supabaseAdmin.from("moderation_logs").insert(row);
}

// ---- First-time admin bootstrap ----
// Allows the signed-in user to claim the single admin role IF and ONLY IF
// no admin currently exists. Server-side enforced.
export const claimAdminIfNone = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { count, error: cErr } = await supabaseAdmin
      .from("user_roles")
      .select("id", { count: "exact", head: true })
      .eq("role", "admin");
    if (cErr) throw new Error(cErr.message);
    if ((count ?? 0) > 0) return { claimed: false };
    const { error } = await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: context.userId, role: "admin" });
    if (error) throw new Error(error.message);
    return { claimed: true };
  });

export const adminExists = createServerFn({ method: "GET" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { count, error } = await supabaseAdmin
    .from("user_roles")
    .select("id", { count: "exact", head: true })
    .eq("role", "admin");
  if (error) throw new Error(error.message);
  return { exists: (count ?? 0) > 0 };
});

export const checkAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId)
      .eq("role", "admin")
      .maybeSingle();
    return { isAdmin: !!data, email: (context.claims?.email as string | undefined) ?? null };
  });

// ---- Login / Logout audit ----
export const logAuthEvent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ action: z.enum(["login", "logout"]) }).parse(data))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const email = (context.claims?.email as string | undefined) ?? "admin";
    await writeLog({
      supabaseAdmin,
      blessing_id: null,
      guest_name: null,
      action: data.action,
      administrator: email,
      administrator_id: context.userId,
      previous_status: null,
      new_status: null,
    });
    return { ok: true };
  });

// ---- Blessings management ----
export const adminListBlessings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await requireAdmin(context as any);
    const { data, error } = await supabaseAdmin
      .from("blessings")
      .select("id, name, note, created_at, approved, rejected, hidden, approved_at, rejected_at, rejection_reason")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return {
      blessings: (data ?? []).map((b: any) => ({ ...b, status: computeStatus(b) })),
    };
  });

export const adminListLogs = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await requireAdmin(context as any);
    const { data, error } = await supabaseAdmin
      .from("moderation_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) throw new Error(error.message);
    return { logs: data ?? [] };
  });

const idInput = z.object({ id: z.string().uuid() });

async function loadBlessing(supabaseAdmin: any, id: string) {
  const { data, error } = await supabaseAdmin
    .from("blessings")
    .select("id, name, approved, rejected, hidden")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Blessing not found");
  return data;
}

export const adminApproveBlessing = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => idInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin, adminId, adminEmail } = await requireAdmin(context as any);
    const prev = await loadBlessing(supabaseAdmin, data.id);
    const prevStatus = computeStatus(prev);
    const isOverride = prevStatus === "rejected" || prevStatus === "hidden";
    const { error } = await supabaseAdmin
      .from("blessings")
      .update({
        approved: true,
        rejected: false,
        hidden: false,
        approved_at: new Date().toISOString(),
      })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    await writeLog({
      supabaseAdmin,
      blessing_id: data.id,
      guest_name: prev.name,
      action: isOverride ? "approved_override" : "approved",
      administrator: adminEmail,
      administrator_id: adminId,
      previous_status: prevStatus,
      new_status: "approved",
    });
    return { ok: true };
  });

export const adminHideBlessing = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => idInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin, adminId, adminEmail } = await requireAdmin(context as any);
    const prev = await loadBlessing(supabaseAdmin, data.id);
    const prevStatus = computeStatus(prev);
    const { error } = await supabaseAdmin
      .from("blessings")
      .update({ approved: false, hidden: true })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    await writeLog({
      supabaseAdmin,
      blessing_id: data.id,
      guest_name: prev.name,
      action: "hidden",
      administrator: adminEmail,
      administrator_id: adminId,
      previous_status: prevStatus,
      new_status: "hidden",
    });
    return { ok: true };
  });

export const adminDeleteBlessing = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => idInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin, adminId, adminEmail } = await requireAdmin(context as any);
    const prev = await loadBlessing(supabaseAdmin, data.id);
    const prevStatus = computeStatus(prev);
    const { error } = await supabaseAdmin.from("blessings").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    await writeLog({
      supabaseAdmin,
      blessing_id: null,
      guest_name: prev.name,
      action: "deleted",
      administrator: adminEmail,
      administrator_id: adminId,
      previous_status: prevStatus,
      new_status: "deleted",
    });
    return { ok: true };
  });

export const adminRestoreBlessing = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => idInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin, adminId, adminEmail } = await requireAdmin(context as any);
    const prev = await loadBlessing(supabaseAdmin, data.id);
    const prevStatus = computeStatus(prev);
    const { error } = await supabaseAdmin
      .from("blessings")
      .update({
        approved: true,
        rejected: false,
        hidden: false,
        approved_at: new Date().toISOString(),
      })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    await writeLog({
      supabaseAdmin,
      blessing_id: data.id,
      guest_name: prev.name,
      action: "approved_override",
      administrator: adminEmail,
      administrator_id: adminId,
      previous_status: prevStatus,
      new_status: "approved",
      reason: "restored",
    });
    return { ok: true };
  });