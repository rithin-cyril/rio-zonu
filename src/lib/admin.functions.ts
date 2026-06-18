import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type Status = "pending" | "approved" | "hidden" | "rejected";

// ---- Admin ID <-> synthetic email mapping ----
// Admins sign in with a plain Admin ID (no email required). Internally we
// map it to `<adminId>@admin.local` so we can reuse Supabase Auth for
// password hashing, session JWTs, and rate-limiting.
export const ADMIN_EMAIL_DOMAIN = "admin.local";
const adminIdRegex = /^[a-z0-9][a-z0-9_.-]{2,31}$/;
const adminIdSchema = z
  .string()
  .trim()
  .transform((v) => v.toLowerCase())
  .refine((v) => adminIdRegex.test(v), {
    message: "Admin ID must be 3-32 chars: lowercase letters, digits, . _ -",
  });
const passwordSchema = z.string().min(8).max(128);

function adminIdToEmail(adminId: string) {
  return `${adminId}@${ADMIN_EMAIL_DOMAIN}`;
}
function emailToAdminId(email: string | null | undefined): string | null {
  if (!email) return null;
  const at = email.indexOf("@");
  if (at <= 0) return null;
  return email.slice(0, at);
}

function getMasterCode() {
  return process.env.ADMIN_MASTER_CODE ?? "1810";
}

// In-memory + DB-backed rate limiter for unauthenticated endpoints.
// Counts recent rows in `moderation_logs` for a given key/action.
async function isRateLimited(
  supabaseAdmin: any,
  key: string,
  actions: string[],
  windowSeconds: number,
  max: number,
): Promise<boolean> {
  const since = new Date(Date.now() - windowSeconds * 1000).toISOString();
  const { count } = await supabaseAdmin
    .from("moderation_logs")
    .select("id", { count: "exact", head: true })
    .eq("guest_name", key)
    .in("action", actions)
    .gte("created_at", since);
  return (count ?? 0) >= max;
}

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
// Creates the single administrator account from an Admin ID + password,
// IF and ONLY IF no admin currently exists. Public (unauthenticated)
// because there is no admin yet to authorize the request — server-side
// guarded by the existence check.
export const registerAdmin = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z.object({ adminId: adminIdSchema, password: passwordSchema }).parse(d),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { count, error: cErr } = await supabaseAdmin
      .from("user_roles")
      .select("id", { count: "exact", head: true })
      .eq("role", "admin");
    if (cErr) throw new Error(cErr.message);
    if ((count ?? 0) > 0) {
      throw new Error("An administrator has already been registered.");
    }
    const email = adminIdToEmail(data.adminId);
    const { data: created, error: uErr } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: data.password,
      email_confirm: true,
      user_metadata: { admin_id: data.adminId },
    });
    if (uErr || !created.user) throw new Error(uErr?.message ?? "Could not create admin user");
    const { error: rErr } = await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: created.user.id, role: "admin" });
    if (rErr) {
      // best-effort cleanup so the slot stays open for retry
      await supabaseAdmin.auth.admin.deleteUser(created.user.id).catch(() => {});
      throw new Error(rErr.message);
    }
    await writeLog({
      supabaseAdmin,
      blessing_id: null,
      guest_name: data.adminId,
      action: "admin_registered",
      administrator: data.adminId,
      administrator_id: created.user.id,
      previous_status: null,
      new_status: null,
    });
    return { ok: true };
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
    const email = (context.claims?.email as string | undefined) ?? null;
    return { isAdmin: !!data, email, adminId: emailToAdminId(email) };
  });

// ---- Login / Logout audit ----
export const logAuthEvent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ action: z.enum(["login", "logout"]) }).parse(data))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const email = (context.claims?.email as string | undefined) ?? "admin";
    const adminId = emailToAdminId(email) ?? email;
    await writeLog({
      supabaseAdmin,
      blessing_id: null,
      guest_name: adminId,
      action: data.action,
      administrator: adminId,
      administrator_id: context.userId,
      previous_status: null,
      new_status: null,
    });
    return { ok: true };
  });

// ---- Failed-login audit (public) ----
// Called from the client after signInWithPassword fails. Rate-limited per
// Admin ID so spamming the endpoint can't fill the log.
export const logLoginFailed = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ adminId: adminIdSchema }).parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    if (await isRateLimited(supabaseAdmin, data.adminId, ["login_failed"], 60, 10)) {
      return { ok: true };
    }
    await writeLog({
      supabaseAdmin,
      blessing_id: null,
      guest_name: data.adminId,
      action: "login_failed",
      administrator: data.adminId,
      administrator_id: null,
      previous_status: null,
      new_status: null,
    });
    return { ok: true };
  });

// ---- Forgot-password reset using the master code ----
// Public endpoint. Verifies Admin ID + master code, then sets a new password
// via the Supabase Auth Admin API. Rate-limited and fully audited.
async function findUserByAdminId(supabaseAdmin: any, adminId: string) {
  const email = adminIdToEmail(adminId).toLowerCase();
  // Admin accounts are tiny in number; one page is more than enough.
  const { data, error } = await supabaseAdmin.auth.admin.listUsers({
    page: 1,
    perPage: 200,
  });
  if (error) throw new Error(error.message);
  return data.users.find((u: any) => (u.email ?? "").toLowerCase() === email) ?? null;
}

export const resetAdminPassword = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z
      .object({
        adminId: adminIdSchema,
        masterCode: z.string().min(1).max(64),
        newPassword: passwordSchema,
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    if (
      await isRateLimited(
        supabaseAdmin,
        data.adminId,
        ["password_reset_success", "password_reset_failed", "password_reset_requested"],
        60,
        5,
      )
    ) {
      throw new Error("Too many reset attempts. Please wait a minute and try again.");
    }

    await writeLog({
      supabaseAdmin,
      blessing_id: null,
      guest_name: data.adminId,
      action: "password_reset_requested",
      administrator: data.adminId,
      administrator_id: null,
      previous_status: null,
      new_status: null,
    });

    const codeOk = data.masterCode === getMasterCode();
    const user = codeOk ? await findUserByAdminId(supabaseAdmin, data.adminId) : null;

    if (!codeOk || !user) {
      await writeLog({
        supabaseAdmin,
        blessing_id: null,
        guest_name: data.adminId,
        action: "password_reset_failed",
        administrator: data.adminId,
        administrator_id: user?.id ?? null,
        previous_status: null,
        new_status: null,
        reason: !codeOk ? "invalid_master_code" : "unknown_admin_id",
      });
      // Same message for both to avoid revealing which one was wrong.
      throw new Error("Invalid Admin ID or master code.");
    }

    const { error: upErr } = await supabaseAdmin.auth.admin.updateUserById(user.id, {
      password: data.newPassword,
    });
    if (upErr) {
      await writeLog({
        supabaseAdmin,
        blessing_id: null,
        guest_name: data.adminId,
        action: "password_reset_failed",
        administrator: data.adminId,
        administrator_id: user.id,
        previous_status: null,
        new_status: null,
        reason: "update_failed",
      });
      console.error("[admin] password reset update failed", upErr);
      throw new Error("Could not update password. Please try again.");
    }

    await writeLog({
      supabaseAdmin,
      blessing_id: null,
      guest_name: data.adminId,
      action: "password_reset_success",
      administrator: data.adminId,
      administrator_id: user.id,
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
      .select("id, name, note, created_at, approved, rejected, hidden, approved_at, rejected_at, rejection_reason, sort_order, last_edited_at, last_edited_by")
      .order("sort_order", { ascending: true, nullsFirst: false })
      .order("created_at", { ascending: true });
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
    .select("id, name, note, approved, rejected, hidden, sort_order")
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