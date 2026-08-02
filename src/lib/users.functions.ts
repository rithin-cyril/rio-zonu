import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  ALL_PERMISSIONS,
  ROLES,
  ROLE_PRESETS,
  effectivePermissions,
  hasPermission,
  isStrongPassword,
  isSuperRole,
  STRONG_PASSWORD_HINT,
} from "@/lib/permissions";

export const ADMIN_EMAIL_DOMAIN = "admin.local";

const usernameSchema = z
  .string()
  .trim()
  .transform((v) => v.toLowerCase())
  .refine((v) => /^[a-z0-9][a-z0-9_.-]{2,31}$/.test(v), {
    message: "Username must be 3-32 chars: lowercase letters, digits, . _ -",
  });

const strongPassword = z
  .string()
  .max(128)
  .refine(isStrongPassword, { message: STRONG_PASSWORD_HINT });

const roleSchema = z.enum(ROLES);
const statusSchema = z.enum(["active", "disabled"]);
const permsSchema = z.array(z.string()).max(100);

function usernameToEmail(username: string) {
  return `${username}@${ADMIN_EMAIL_DOMAIN}`;
}

async function guard(context: any, permission?: string) {
  const { requirePermission } = await import("@/lib/rbac.server");
  return requirePermission(context, permission);
}

async function countSuperAdmins(supabaseAdmin: any, excludeUserId?: string) {
  const { data } = await supabaseAdmin.from("user_roles").select("user_id, role");
  return ((data ?? []) as Array<{ user_id: string; role: string }>).filter(
    (r) => isSuperRole(String(r.role)) && r.user_id !== excludeUserId,
  ).length;
}

function sanitizePermissions(requested: string[], actorPermissions: string[]) {
  const valid = requested.filter((p) => ALL_PERMISSIONS.includes(p));
  // Privilege escalation guard: an admin can only grant what they hold.
  return valid.filter((p) => hasPermission(actorPermissions, p));
}

// ---- Who am I (drives menus + client-side permission checks) ----
export const adminMe = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const me = await guard(context as any);
    return {
      userId: me.userId,
      username: me.username,
      fullName: me.fullName,
      email: me.email,
      role: me.role,
      status: me.status,
      isSuper: me.isSuper,
      permissions: me.permissions,
    };
  });

// ---- List users ----
export const adminListUsers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const me = await guard(context as any, "users.view");
    const [{ data: profiles }, { data: roles }, { data: perms }] = await Promise.all([
      me.supabaseAdmin
        .from("admin_profiles")
        .select("user_id, username, full_name, email, status, created_at, sessions_valid_from")
        .order("created_at", { ascending: true }),
      me.supabaseAdmin.from("user_roles").select("user_id, role"),
      me.supabaseAdmin.from("admin_permissions").select("user_id, permission"),
    ]);
    const roleBy = new Map<string, string>(
      ((roles ?? []) as any[]).map((r) => [r.user_id, String(r.role)]),
    );
    const permBy = new Map<string, string[]>();
    for (const p of (perms ?? []) as any[]) {
      permBy.set(p.user_id, [...(permBy.get(p.user_id) ?? []), p.permission]);
    }
    return {
      users: ((profiles ?? []) as any[])
        .filter((p) => roleBy.has(p.user_id))
        .map((p) => {
          const role = roleBy.get(p.user_id)!;
          const granted = permBy.get(p.user_id) ?? [];
          return {
            user_id: p.user_id,
            username: p.username,
            full_name: p.full_name,
            email: p.email,
            status: p.status,
            created_at: p.created_at,
            role,
            granted,
            permissions: effectivePermissions(role, granted),
          };
        }),
    };
  });

// ---- Create user ----
export const adminCreateUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        fullName: z.string().trim().min(1).max(120),
        username: usernameSchema,
        email: z.string().trim().email().max(255).or(z.literal("")),
        password: strongPassword,
        role: roleSchema,
        status: statusSchema,
        permissions: permsSchema,
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const me = await guard(context as any, "users.create");
    if (data.role === "super_admin" && !me.isSuper) {
      throw new Error("Only a Super Admin can create another Super Admin.");
    }

    const { data: existing } = await me.supabaseAdmin
      .from("admin_profiles")
      .select("user_id, email")
      .or(`username.eq.${data.username}${data.email ? `,email.eq.${data.email}` : ""}`);
    if ((existing ?? []).length) {
      throw new Error("That username or email is already in use.");
    }

    const { data: created, error: cErr } = await me.supabaseAdmin.auth.admin.createUser({
      email: usernameToEmail(data.username),
      password: data.password,
      email_confirm: true,
      user_metadata: { admin_id: data.username, full_name: data.fullName },
    });
    if (cErr || !created?.user) throw new Error(cErr?.message ?? "Could not create the user.");
    const uid = created.user.id;

    const cleanup = async (msg: string) => {
      await me.supabaseAdmin.auth.admin.deleteUser(uid).catch(() => {});
      throw new Error(msg);
    };

    const { error: pErr } = await me.supabaseAdmin.from("admin_profiles").insert({
      user_id: uid,
      username: data.username,
      full_name: data.fullName,
      email: data.email || null,
      status: data.status,
      created_by: me.userId,
    });
    if (pErr) await cleanup("That username or email is already in use.");

    const { error: rErr } = await me.supabaseAdmin
      .from("user_roles")
      .insert({ user_id: uid, role: data.role });
    if (rErr) {
      await me.supabaseAdmin.from("admin_profiles").delete().eq("user_id", uid);
      await cleanup("Could not assign the role.");
    }

    const grants = sanitizePermissions(data.permissions, me.permissions);
    if (grants.length) {
      await me.supabaseAdmin.from("admin_permissions").insert(
        grants.map((permission) => ({ user_id: uid, permission, granted_by: me.userId })),
      );
    }

    const { logActivity } = await import("@/lib/rbac.server");
    await logActivity(me.supabaseAdmin, {
      actor_id: me.userId,
      actor_label: me.username,
      action: "user_created",
      target_user_id: uid,
      target_label: data.username,
      details: `role=${data.role} status=${data.status} permissions=${grants.length}`,
    });
    return { ok: true, userId: uid };
  });

// ---- Update user (details, role, status, permissions) ----
export const adminUpdateUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        userId: z.string().uuid(),
        fullName: z.string().trim().min(1).max(120),
        email: z.string().trim().email().max(255).or(z.literal("")),
        role: roleSchema,
        status: statusSchema,
        permissions: permsSchema,
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const me = await guard(context as any, "users.edit");

    const { data: target } = await me.supabaseAdmin
      .from("admin_profiles")
      .select("user_id, username, full_name, email, status")
      .eq("user_id", data.userId)
      .maybeSingle();
    if (!target) throw new Error("User not found.");
    const { data: targetRole } = await me.supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", data.userId)
      .maybeSingle();
    const prevRole = String(targetRole?.role ?? "viewer");

    if (!me.isSuper && (isSuperRole(prevRole) || data.role === "super_admin")) {
      throw new Error("Only a Super Admin can manage Super Admin accounts.");
    }
    // Never leave the system without a Super Admin.
    if (isSuperRole(prevRole) && !isSuperRole(data.role)) {
      if ((await countSuperAdmins(me.supabaseAdmin, data.userId)) === 0) {
        throw new Error("This is the last Super Admin — the role cannot be removed.");
      }
    }
    if (isSuperRole(prevRole) && data.status === "disabled") {
      if ((await countSuperAdmins(me.supabaseAdmin, data.userId)) === 0) {
        throw new Error("The last Super Admin cannot be disabled.");
      }
    }

    const statusChanged = target.status !== data.status;
    const { error: uErr } = await me.supabaseAdmin
      .from("admin_profiles")
      .update({
        full_name: data.fullName,
        email: data.email || null,
        status: data.status,
        updated_at: new Date().toISOString(),
        // Disabling (or re-enabling) an account ends its active sessions.
        ...(statusChanged ? { sessions_valid_from: new Date().toISOString() } : {}),
      })
      .eq("user_id", data.userId);
    if (uErr) throw new Error("Could not update the user.");

    if (prevRole !== data.role) {
      await me.supabaseAdmin.from("user_roles").delete().eq("user_id", data.userId);
      const { error: rErr } = await me.supabaseAdmin
        .from("user_roles")
        .insert({ user_id: data.userId, role: data.role });
      if (rErr) throw new Error("Could not update the role.");
    }

    let grants: string[] | null = null;
    if (hasPermission(me.permissions, "users.assign_permissions")) {
      grants = sanitizePermissions(data.permissions, me.permissions).filter(
        (p) => !(ROLE_PRESETS[data.role] ?? []).includes(p),
      );
      await me.supabaseAdmin.from("admin_permissions").delete().eq("user_id", data.userId);
      if (grants.length) {
        await me.supabaseAdmin.from("admin_permissions").insert(
          grants.map((permission) => ({
            user_id: data.userId,
            permission,
            granted_by: me.userId,
          })),
        );
      }
    }

    const { logActivity } = await import("@/lib/rbac.server");
    const details = [
      prevRole !== data.role ? `role ${prevRole} → ${data.role}` : null,
      statusChanged ? `status ${target.status} → ${data.status}` : null,
      grants ? `permissions=${grants.length}` : null,
    ]
      .filter(Boolean)
      .join(", ");
    await logActivity(me.supabaseAdmin, {
      actor_id: me.userId,
      actor_label: me.username,
      action:
        statusChanged && data.status === "disabled"
          ? "user_disabled"
          : statusChanged
            ? "user_enabled"
            : prevRole !== data.role
              ? "role_changed"
              : grants
                ? "permissions_changed"
                : "user_updated",
      target_user_id: data.userId,
      target_label: target.username,
      details: details || "profile updated",
    });
    return { ok: true };
  });

// ---- Reset a user's password ----
export const adminResetUserPassword = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ userId: z.string().uuid(), password: strongPassword }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const me = await guard(context as any, "users.reset_password");
    const { data: target } = await me.supabaseAdmin
      .from("admin_profiles")
      .select("username")
      .eq("user_id", data.userId)
      .maybeSingle();
    if (!target) throw new Error("User not found.");
    const { data: targetRole } = await me.supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", data.userId)
      .maybeSingle();
    if (!me.isSuper && isSuperRole(String(targetRole?.role ?? ""))) {
      throw new Error("Only a Super Admin can reset a Super Admin password.");
    }

    const { error } = await me.supabaseAdmin.auth.admin.updateUserById(data.userId, {
      password: data.password,
    });
    if (error) {
      console.error("[users] password reset failed", error);
      throw new Error("Could not update the password.");
    }
    // Password changes invalidate every existing session for that account.
    await me.supabaseAdmin
      .from("admin_profiles")
      .update({ sessions_valid_from: new Date().toISOString() })
      .eq("user_id", data.userId);

    const { logActivity } = await import("@/lib/rbac.server");
    await logActivity(me.supabaseAdmin, {
      actor_id: me.userId,
      actor_label: me.username,
      action: "password_reset",
      target_user_id: data.userId,
      target_label: target.username,
      details: "password updated; sessions invalidated",
    });
    return { ok: true };
  });

// ---- Delete a user ----
export const adminDeleteUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ userId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const me = await guard(context as any, "users.delete");
    if (data.userId === me.userId) throw new Error("You cannot delete your own account.");
    const { data: target } = await me.supabaseAdmin
      .from("admin_profiles")
      .select("username")
      .eq("user_id", data.userId)
      .maybeSingle();
    const { data: targetRole } = await me.supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", data.userId)
      .maybeSingle();
    const role = String(targetRole?.role ?? "");
    if (isSuperRole(role)) {
      if (!me.isSuper) throw new Error("Only a Super Admin can delete a Super Admin.");
      if ((await countSuperAdmins(me.supabaseAdmin, data.userId)) === 0) {
        throw new Error("The last Super Admin account cannot be deleted.");
      }
    }
    const { error } = await me.supabaseAdmin.auth.admin.deleteUser(data.userId);
    if (error) throw new Error("Could not delete the user.");

    const { logActivity } = await import("@/lib/rbac.server");
    await logActivity(me.supabaseAdmin, {
      actor_id: me.userId,
      actor_label: me.username,
      action: "user_deleted",
      target_user_id: data.userId,
      target_label: target?.username ?? null,
      details: `role=${role}`,
    });
    return { ok: true };
  });

// ---- Force logout every administrator ----
export const adminForceLogoutAll = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const me = await guard(context as any, "admin.full");
    const now = new Date().toISOString();
    const { error } = await me.supabaseAdmin
      .from("admin_profiles")
      .update({ sessions_valid_from: now })
      .neq("user_id", "00000000-0000-0000-0000-000000000000");
    if (error) throw new Error("Could not end the active sessions.");
    const { logActivity } = await import("@/lib/rbac.server");
    await logActivity(me.supabaseAdmin, {
      actor_id: me.userId,
      actor_label: me.username,
      action: "force_logout_all",
      details: "all administrator sessions invalidated",
    });
    return { ok: true };
  });

// ---- Activity log ----
export const adminListActivityLogs = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const me = await guard(context as any, "moderation.logs");
    const { data, error } = await me.supabaseAdmin
      .from("admin_activity_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) throw new Error(error.message);
    return { logs: data ?? [] };
  });