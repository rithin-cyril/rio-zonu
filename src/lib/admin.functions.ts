import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { withPositions } from "@/lib/blessing-order";

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

// Permission-aware guard. Loads the caller's role, status, session cutoff and
// effective permissions, then enforces the permission this action requires.
async function requireAdmin(
  context: { userId: string; claims: any; supabase: any },
  permission?: string,
) {
  const { requirePermission } = await import("@/lib/rbac.server");
  const me = await requirePermission(context, permission);
  return {
    supabaseAdmin: me.supabaseAdmin,
    adminId: me.userId,
    adminEmail: me.username,
    me,
  };
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
      .select("id, name, note, created_at, approved, rejected, hidden, approved_at, rejected_at, rejection_reason, sort_order, last_edited_at, last_edited_by, quality_score, ai_probability, analysis, analyzed_at")
      .order("sort_order", { ascending: true, nullsFirst: false })
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);
    const { data: rankingRow } = await supabaseAdmin
      .from("site_settings")
      .select("value")
      .eq("key", "blessings_ranking")
      .maybeSingle();
    const rankingMode =
      (rankingRow?.value as { mode?: string } | null)?.mode === "manual" ? "manual" : "ai";
    return {
      // Ordered exactly like the public wall: visible blessings first in live
      // public order (display_position #1..#N), then everything else.
      blessings: withPositions(
        (data ?? []).map((b: any) => ({ ...b, status: computeStatus(b) })) as any[],
        rankingMode === "manual",
      ),
      rankingMode,
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
    try {
      const { analyzeAndStore } = await import("@/lib/blessing-analysis.server");
      await analyzeAndStore(supabaseAdmin, prev as any);
    } catch (e) {
      console.error("[admin] analysis on approve failed", e);
    }
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

// ---- Version history helpers ----
async function ensureOriginalVersion(
  supabaseAdmin: any,
  blessing: { id: string; name: string; note: string },
  status: Status,
) {
  const { count } = await supabaseAdmin
    .from("blessing_versions")
    .select("id", { count: "exact", head: true })
    .eq("blessing_id", blessing.id);
  if ((count ?? 0) > 0) return;
  await supabaseAdmin.from("blessing_versions").insert({
    blessing_id: blessing.id,
    version: 1,
    name: blessing.name,
    note: blessing.note,
    status,
    edited_by: null,
    edited_by_label: "guest",
    change_type: "original",
  });
}

async function nextVersionNumber(supabaseAdmin: any, blessing_id: string): Promise<number> {
  const { data } = await supabaseAdmin
    .from("blessing_versions")
    .select("version")
    .eq("blessing_id", blessing_id)
    .order("version", { ascending: false })
    .limit(1);
  const top = data?.[0]?.version ?? 0;
  return top + 1;
}

// ---- Edit blessing ----
const editSchema = z.object({
  id: z.string().uuid(),
  name: z.string().trim().min(1).max(80),
  note: z.string().trim().min(1).max(2000),
  status: z.enum(["pending", "approved", "hidden", "rejected"]).optional(),
});

export const adminEditBlessing = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => editSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin, adminId, adminEmail } = await requireAdmin(context as any);
    const prev = await loadBlessing(supabaseAdmin, data.id);
    const prevStatus = computeStatus(prev);

    await ensureOriginalVersion(supabaseAdmin, prev as any, prevStatus);

    const nameChanged = prev.name !== data.name;
    const noteChanged = prev.note !== data.note;
    const nextStatus: Status = data.status ?? prevStatus;
    const statusChanged = nextStatus !== prevStatus;

    const flags: Record<string, any> = {};
    if (statusChanged) {
      flags.approved = nextStatus === "approved";
      flags.rejected = nextStatus === "rejected";
      flags.hidden = nextStatus === "hidden";
      if (nextStatus === "approved") flags.approved_at = new Date().toISOString();
    }

    const nowIso = new Date().toISOString();
    const { error } = await supabaseAdmin
      .from("blessings")
      .update({
        name: data.name,
        note: data.note,
        last_edited_at: nowIso,
        last_edited_by: adminId,
        ...flags,
      })
      .eq("id", data.id);
    if (error) throw new Error(error.message);

    const v = await nextVersionNumber(supabaseAdmin, data.id);
    await supabaseAdmin.from("blessing_versions").insert({
      blessing_id: data.id,
      version: v,
      name: data.name,
      note: data.note,
      status: nextStatus,
      edited_by: adminId,
      edited_by_label: adminEmail,
      change_type: statusChanged ? "edited_with_status" : "edited",
    });

    await writeLog({
      supabaseAdmin,
      blessing_id: data.id,
      guest_name: data.name,
      action: "edited",
      administrator: adminEmail,
      administrator_id: adminId,
      previous_status: prevStatus,
      new_status: nextStatus,
      reason: [
        nameChanged ? `name: "${prev.name}" → "${data.name}"` : null,
        noteChanged ? `message updated (${prev.note.length}→${data.note.length} chars)` : null,
        statusChanged ? `status: ${prevStatus} → ${nextStatus}` : null,
      ].filter(Boolean).join("; ") || "no changes",
    });

    if (noteChanged) {
      try {
        const { analyzeAndStore } = await import("@/lib/blessing-analysis.server");
        await analyzeAndStore(supabaseAdmin, { id: data.id, name: data.name, note: data.note });
      } catch (e) {
        console.error("[admin] analysis on edit failed", e);
      }
    }

    return { ok: true };
  });

// ---- Version history ----
export const adminListBlessingVersions = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => idInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await requireAdmin(context as any);
    const prev = await loadBlessing(supabaseAdmin, data.id);
    await ensureOriginalVersion(supabaseAdmin, prev as any, computeStatus(prev));
    const { data: versions, error } = await supabaseAdmin
      .from("blessing_versions")
      .select("*")
      .eq("blessing_id", data.id)
      .order("version", { ascending: false });
    if (error) throw new Error(error.message);
    return { versions: versions ?? [] };
  });

// ---- Reordering ----
const reorderSchema = z.object({
  orderedIds: z.array(z.string().uuid()).min(1).max(1000),
});

export const adminReorderBlessings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => reorderSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin, adminId, adminEmail } = await requireAdmin(context as any);

    const { data: existing, error: exErr } = await supabaseAdmin
      .from("blessings")
      .select("id, name, sort_order");
    if (exErr) throw new Error(exErr.message);
    const prevMap = new Map<string, { name: string; sort_order: number | null }>(
      (existing ?? []).map((r: any) => [r.id, { name: r.name, sort_order: r.sort_order }]),
    );

    // Validate all ids exist
    for (const id of data.orderedIds) {
      if (!prevMap.has(id)) throw new Error(`Unknown blessing id: ${id}`);
    }

    // Update each row; use 1..N
    const changes: Array<{ id: string; name: string; from: number | null; to: number }> = [];
    for (let i = 0; i < data.orderedIds.length; i++) {
      const id = data.orderedIds[i];
      const to = i + 1;
      const prev = prevMap.get(id)!;
      if (prev.sort_order === to) continue;
      const { error } = await supabaseAdmin
        .from("blessings")
        .update({ sort_order: to })
        .eq("id", id);
      if (error) throw new Error(error.message);
      changes.push({ id, name: prev.name, from: prev.sort_order, to });
    }

    if (changes.length > 0) {
      await writeLog({
        supabaseAdmin,
        blessing_id: null,
        guest_name: null,
        action: "reordered",
        administrator: adminEmail,
        administrator_id: adminId,
        previous_status: null,
        new_status: null,
        reason: changes
          .slice(0, 20)
          .map((c) => `${c.name}: ${c.from ?? "—"}→${c.to}`)
          .join("; ") + (changes.length > 20 ? ` …(+${changes.length - 20} more)` : ""),
      });
    }

    // Saving a manual order overrides automatic score-based ranking.
    await supabaseAdmin.from("site_settings").upsert(
      {
        key: "blessings_ranking",
        value: { mode: "manual" },
        updated_at: new Date().toISOString(),
      },
      { onConflict: "key" },
    );

    return { ok: true, changed: changes.length };
  });

// ---- Analysis & ranking mode ----
export const adminReanalyzeBlessing = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => idInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin, adminId, adminEmail } = await requireAdmin(context as any);
    const prev = await loadBlessing(supabaseAdmin, data.id);
    const { analyzeAndStore } = await import("@/lib/blessing-analysis.server");
    const analysis = await analyzeAndStore(supabaseAdmin, prev as any);
    if (!analysis) throw new Error("Analysis failed. Please try again.");

    // If the submit-time analysis had failed, the Discord approval request was
    // never sent. Send it now that we have a complete analysis.
    try {
      const { data: full } = await supabaseAdmin
        .from("blessings")
        .select("id, name, note, created_at, moderation_token, email_sent, approved, rejected")
        .eq("id", data.id)
        .maybeSingle();
      if (full && !full.email_sent && !full.approved && !full.rejected) {
        const { sendModerationRequest } = await import("@/lib/blessing-notify.server");
        await sendModerationRequest(supabaseAdmin, full as any, analysis);
      }
    } catch (e) {
      console.error("[admin] moderation resend after re-analysis failed", e);
    }

    await writeLog({
      supabaseAdmin,
      blessing_id: data.id,
      guest_name: prev.name,
      action: "reanalyzed",
      administrator: adminEmail,
      administrator_id: adminId,
      previous_status: null,
      new_status: null,
      reason: `score ${analysis.quality_score}/100 • AI ${analysis.ai_probability}%`,
    });
    return { ok: true, analysis };
  });

// Ids of every blessing, so the client can drive a batched bulk re-analysis
// with real progress. Analysis-only — never touches text, status or order.
export const adminListBlessingIdsForAnalysis = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await requireAdmin(context as any);
    const { data, error } = await supabaseAdmin
      .from("blessings")
      .select("id, name")
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);
    return { items: (data ?? []) as { id: string; name: string }[] };
  });

export const adminReanalyzeBatch = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ ids: z.array(z.string().uuid()).min(1).max(5) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await requireAdmin(context as any);
    const { analyzeAndStore } = await import("@/lib/blessing-analysis.server");
    const { data: rows, error } = await supabaseAdmin
      .from("blessings")
      .select("id, name, note")
      .in("id", data.ids);
    if (error) throw new Error(error.message);
    let done = 0;
    let failed = 0;
    for (const row of rows ?? []) {
      const analysis = await analyzeAndStore(supabaseAdmin, row as any);
      if (analysis) done++;
      else failed++;
    }
    return { ok: true, done, failed };
  });

export const adminLogBulkReanalysis = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ total: z.number().int().min(0), failed: z.number().int().min(0) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabaseAdmin, adminId, adminEmail } = await requireAdmin(context as any);
    await writeLog({
      supabaseAdmin,
      blessing_id: null,
      guest_name: null,
      action: "reanalyzed_all",
      administrator: adminEmail,
      administrator_id: adminId,
      previous_status: null,
      new_status: null,
      reason: `re-analysed ${data.total - data.failed}/${data.total} blessings`,
    });
    return { ok: true };
  });

export const adminSetRankingMode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ mode: z.enum(["ai", "manual"]) }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin, adminId, adminEmail } = await requireAdmin(context as any);
    const { error } = await supabaseAdmin.from("site_settings").upsert(
      {
        key: "blessings_ranking",
        value: { mode: data.mode },
        updated_at: new Date().toISOString(),
      },
      { onConflict: "key" },
    );
    if (error) throw new Error(error.message);
    await writeLog({
      supabaseAdmin,
      blessing_id: null,
      guest_name: null,
      action: "settings_updated",
      administrator: adminEmail,
      administrator_id: adminId,
      previous_status: null,
      new_status: null,
      reason: `blessings_ranking.mode=${data.mode}`,
    });
    return { ok: true, mode: data.mode };
  });

// ---- Site settings (admin write, public read) ----
export const adminGetShowPublicDates = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await requireAdmin(context as any);
    const { data } = await supabaseAdmin
      .from("site_settings")
      .select("value")
      .eq("key", "public_dates")
      .maybeSingle();
    const show = (data?.value as { show?: boolean } | null)?.show !== false;
    return { show };
  });

export const adminSetShowPublicDates = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ show: z.boolean() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin, adminId, adminEmail } = await requireAdmin(context as any);
    const { error } = await supabaseAdmin
      .from("site_settings")
      .upsert(
        {
          key: "public_dates",
          value: { show: data.show },
          updated_at: new Date().toISOString(),
        },
        { onConflict: "key" },
      );
    if (error) throw new Error(error.message);
    await writeLog({
      supabaseAdmin,
      blessing_id: null,
      guest_name: null,
      action: "settings_updated",
      administrator: adminEmail,
      administrator_id: adminId,
      previous_status: null,
      new_status: null,
      reason: `public_dates.show=${data.show ? "true" : "false"}`,
    });
    return { ok: true, show: data.show };
  });