// Server-only RBAC guard + activity logging for the admin panel.
import { getRequestHeader } from "@tanstack/react-start/server";
import {
  effectivePermissions,
  hasPermission,
  isSuperRole,
  type Permission,
} from "@/lib/permissions";

export type AdminContext = {
  supabaseAdmin: any;
  userId: string;
  role: string;
  username: string;
  fullName: string;
  email: string | null;
  status: string;
  permissions: string[];
  isSuper: boolean;
};

export class AccessDeniedError extends Error {
  constructor(message = "Access denied.") {
    super(message);
    this.name = "AccessDeniedError";
  }
}

export async function loadAdminContext(context: {
  userId: string;
  claims: any;
}): Promise<AdminContext> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const [{ data: roleRow }, { data: profile }, { data: perms }] = await Promise.all([
    supabaseAdmin.from("user_roles").select("role").eq("user_id", context.userId).maybeSingle(),
    supabaseAdmin
      .from("admin_profiles")
      .select("username, full_name, email, status, sessions_valid_from")
      .eq("user_id", context.userId)
      .maybeSingle(),
    supabaseAdmin.from("admin_permissions").select("permission").eq("user_id", context.userId),
  ]);

  if (!roleRow) throw new AccessDeniedError("Access denied: administrator account required.");
  if (profile?.status === "disabled") {
    throw new AccessDeniedError("This account has been disabled.");
  }

  // Forced-logout / password-change session cutoff: tokens issued before the
  // cutoff are rejected, so the admin must sign in again.
  const iat = Number(context.claims?.iat ?? 0) * 1000;
  if (profile?.sessions_valid_from) {
    const cutoff = new Date(profile.sessions_valid_from).getTime();
    if (iat && iat < cutoff - 1000) {
      throw new AccessDeniedError("Your session has expired. Please sign in again.");
    }
  }

  const email = (context.claims?.email as string | undefined) ?? profile?.email ?? null;
  const username = profile?.username ?? (email ? email.split("@")[0]! : "admin");
  const role = String(roleRow.role);

  return {
    supabaseAdmin,
    userId: context.userId,
    role,
    username,
    fullName: profile?.full_name || username,
    email,
    status: profile?.status ?? "active",
    permissions: effectivePermissions(
      role,
      ((perms ?? []) as Array<{ permission: string }>).map((p) => p.permission),
    ),
    isSuper: isSuperRole(role),
  };
}

/** Loads the admin context and enforces a required permission. */
export async function requirePermission(
  context: { userId: string; claims: any },
  permission?: Permission,
): Promise<AdminContext> {
  const ctx = await loadAdminContext(context);
  if (permission && !hasPermission(ctx.permissions, permission)) {
    throw new AccessDeniedError("Access denied: you do not have permission for this action.");
  }
  return ctx;
}

function requestMeta() {
  let ip: string | null = null;
  let ua: string | null = null;
  try {
    ip =
      (getRequestHeader("cf-connecting-ip") ||
        getRequestHeader("x-forwarded-for")?.split(",")[0]?.trim() ||
        getRequestHeader("x-real-ip") ||
        null) ?? null;
    ua = getRequestHeader("user-agent") ?? null;
  } catch {
    /* outside a request context */
  }
  return { ip, ua };
}

/** Append to the admin activity log. Never throws. */
export async function logActivity(
  supabaseAdmin: any,
  entry: {
    actor_id: string | null;
    actor_label: string | null;
    action: string;
    target_user_id?: string | null;
    target_label?: string | null;
    details?: string | null;
  },
) {
  const { ip, ua } = requestMeta();
  try {
    await supabaseAdmin.from("admin_activity_logs").insert({
      ...entry,
      target_user_id: entry.target_user_id ?? null,
      target_label: entry.target_label ?? null,
      details: entry.details ?? null,
      ip_address: ip,
      user_agent: ua ? ua.slice(0, 400) : null,
    });
  } catch (e) {
    console.error("[rbac] activity log failed", e);
  }
}