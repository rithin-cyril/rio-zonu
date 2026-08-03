import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  PERMISSION_GROUPS,
  ROLES,
  ROLE_LABELS,
  ROLE_PRESETS,
  STRONG_PASSWORD_HINT,
  hasPermission,
  isStrongPassword,
  isSuperRole,
} from "@/lib/permissions";
import {
  adminCreateUser,
  adminDeleteUser,
  adminForceLogoutAll,
  adminListActivityLogs,
  adminListUsers,
  adminMe,
  adminResetUserPassword,
  adminUpdateUser,
} from "@/lib/users.functions";

export const Route = createFileRoute("/_authenticated/admin/users")({
  component: AdminUsers,
});

type Me = Awaited<ReturnType<typeof adminMe>>;
type Row = {
  user_id: string;
  username: string;
  full_name: string;
  email: string | null;
  status: string;
  created_at: string;
  role: string;
  granted: string[];
  permissions: string[];
};

const btn =
  "inline-flex min-h-10 items-center justify-center rounded border border-gold/60 px-3 py-2 font-display text-[10px] tracking-[0.25em] text-gold-gradient transition hover:bg-gold/10 disabled:opacity-50";
const field =
  "w-full rounded border border-gold/40 bg-white px-3 py-2 text-sm ink outline-none focus:border-gold";

function AdminUsers() {
  const getMe = useServerFn(adminMe);
  const list = useServerFn(adminListUsers);
  const createFn = useServerFn(adminCreateUser);
  const updateFn = useServerFn(adminUpdateUser);
  const resetFn = useServerFn(adminResetUserPassword);
  const deleteFn = useServerFn(adminDeleteUser);
  const logoutAllFn = useServerFn(adminForceLogoutAll);
  const logsFn = useServerFn(adminListActivityLogs);

  const [me, setMe] = useState<Me | null>(null);
  const [denied, setDenied] = useState<string | null>(null);
  const [rows, setRows] = useState<Row[] | null>(null);
  const [tab, setTab] = useState<"users" | "activity">("users");
  const [logs, setLogs] = useState<any[] | null>(null);
  const [editing, setEditing] = useState<Row | "new" | null>(null);
  const [resetting, setResetting] = useState<Row | null>(null);

  const refresh = useCallback(async () => {
    try {
      setRows((await list()).users as Row[]);
    } catch (e: any) {
      setDenied(e?.message ?? "Access denied.");
    }
  }, [list]);

  useEffect(() => {
    getMe()
      .then((m) => {
        setMe(m);
        if (!hasPermission(m.permissions, "users.view")) {
          setDenied("Access denied: you do not have permission to manage users.");
          return;
        }
        void refresh();
      })
      .catch((e: any) => setDenied(e?.message ?? "Access denied."));
  }, [getMe, refresh]);

  useEffect(() => {
    if (tab === "activity" && logs === null && me && hasPermission(me.permissions, "moderation.logs")) {
      logsFn()
        .then((r) => setLogs(r.logs as any[]))
        .catch((e: any) => toast.error(e?.message ?? "Could not load the activity log"));
    }
  }, [tab, logs, me, logsFn]);

  if (denied) {
    return (
      <div className="rounded-lg border border-rose-300/60 bg-white/80 p-8 text-center">
        <p className="font-display text-[11px] tracking-[0.3em] text-rose-700">ACCESS DENIED</p>
        <p className="mt-2 font-script italic ink-soft">{denied}</p>
      </div>
    );
  }
  if (!me || !rows) return <p className="font-script italic ink-soft">Loading…</p>;

  const can = (p: string) => hasPermission(me.permissions, p);

  async function onDelete(u: Row) {
    if (!confirm(`Delete “${u.username}”? This cannot be undone.`)) return;
    try {
      await deleteFn({ data: { userId: u.user_id } });
      toast.success("User deleted");
      await refresh();
    } catch (e: any) {
      toast.error(e?.message ?? "Could not delete the user");
    }
  }

  async function onToggleStatus(u: Row) {
    const next = u.status === "active" ? "disabled" : "active";
    try {
      await updateFn({
        data: {
          userId: u.user_id,
          fullName: u.full_name,
          email: u.email ?? "",
          role: u.role as any,
          status: next as any,
          permissions: u.granted,
        },
      });
      toast.success(next === "disabled" ? "User disabled" : "User enabled");
      await refresh();
    } catch (e: any) {
      toast.error(e?.message ?? "Could not update the user");
    }
  }

  async function onForceLogoutAll() {
    if (!confirm("Sign out every administrator, including you?")) return;
    try {
      await logoutAllFn();
      toast.success("All administrator sessions ended");
    } catch (e: any) {
      toast.error(e?.message ?? "Could not end the sessions");
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-1">
          {(["users", "activity"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`rounded-md border px-3 py-1.5 font-display text-[10px] tracking-[0.3em] transition ${
                tab === t
                  ? "border-gold bg-gold/10 text-gold-gradient"
                  : "border-transparent ink-soft hover:bg-gold/5"
              }`}
            >
              {t === "users" ? "USERS" : "ACTIVITY LOG"}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          {can("admin.full") && (
            <button className={btn} onClick={onForceLogoutAll}>
              🚪 FORCE LOGOUT ALL
            </button>
          )}
          {can("users.create") && (
            <button className={btn} onClick={() => setEditing("new")}>
              ➕ NEW USER
            </button>
          )}
        </div>
      </div>

      {tab === "users" ? (
        <div className="overflow-x-auto rounded-lg border border-gold/30 bg-white/85">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="border-b border-gold/25 text-left font-display text-[9px] tracking-[0.3em] ink-soft">
                <th className="px-4 py-3">USER</th>
                <th className="px-4 py-3">ROLE</th>
                <th className="px-4 py-3">STATUS</th>
                <th className="px-4 py-3">PERMISSIONS</th>
                <th className="px-4 py-3 text-right">ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((u) => (
                <tr key={u.user_id} className="border-b border-gold/10 align-top">
                  <td className="px-4 py-3">
                    <p className="font-medium ink">{u.full_name}</p>
                    <p className="text-xs ink-soft">@{u.username}</p>
                    {u.email && <p className="text-xs ink-soft">{u.email}</p>}
                  </td>
                  <td className="px-4 py-3">{ROLE_LABELS[u.role] ?? u.role}</td>
                  <td className="px-4 py-3">
                    <span
                      className={
                        u.status === "active"
                          ? "rounded-full bg-emerald-50 px-2 py-1 text-xs text-emerald-700"
                          : "rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-600"
                      }
                    >
                      {u.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs ink-soft">{u.permissions.length} granted</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap justify-end gap-2">
                      {can("users.edit") && (
                        <button className={btn} onClick={() => setEditing(u)}>
                          EDIT
                        </button>
                      )}
                      {can("users.edit") && (
                        <button className={btn} onClick={() => onToggleStatus(u)}>
                          {u.status === "active" ? "DISABLE" : "ENABLE"}
                        </button>
                      )}
                      {can("users.reset_password") && (
                        <button className={btn} onClick={() => setResetting(u)}>
                          RESET PASSWORD
                        </button>
                      )}
                      {can("users.delete") && u.user_id !== me.userId && (
                        <button
                          className={`${btn} border-rose-300/70 !text-rose-700 hover:bg-rose-50`}
                          onClick={() => onDelete(u)}
                        >
                          DELETE
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <ActivityLog logs={logs} allowed={can("moderation.logs")} />
      )}

      {editing && (
        <UserModal
          me={me}
          user={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          onSave={async (payload, isNew) => {
            if (isNew) await createFn({ data: payload as any });
            else await updateFn({ data: payload as any });
            toast.success(isNew ? "User created" : "User updated");
            setEditing(null);
            await refresh();
          }}
        />
      )}

      {resetting && (
        <ResetModal
          user={resetting}
          onClose={() => setResetting(null)}
          onSave={async (password) => {
            await resetFn({ data: { userId: resetting.user_id, password } });
            toast.success("Password updated — that user's sessions were ended");
            setResetting(null);
          }}
        />
      )}
    </div>
  );
}

function ActivityLog({ logs, allowed }: { logs: any[] | null; allowed: boolean }) {
  if (!allowed) {
    return (
      <p className="rounded-lg border border-gold/30 bg-white/85 p-6 font-script italic ink-soft">
        You do not have permission to view the activity log.
      </p>
    );
  }
  if (!logs) return <p className="font-script italic ink-soft">Loading activity…</p>;
  if (!logs.length)
    return <p className="font-script italic ink-soft">No activity recorded yet.</p>;
  return (
    <div className="overflow-x-auto rounded-lg border border-gold/30 bg-white/85">
      <table className="w-full min-w-[760px] text-sm">
        <thead>
          <tr className="border-b border-gold/25 text-left font-display text-[9px] tracking-[0.3em] ink-soft">
            <th className="px-4 py-3">WHEN</th>
            <th className="px-4 py-3">ACTOR</th>
            <th className="px-4 py-3">ACTION</th>
            <th className="px-4 py-3">TARGET</th>
            <th className="px-4 py-3">DETAILS</th>
            <th className="px-4 py-3">IP</th>
          </tr>
        </thead>
        <tbody>
          {logs.map((l) => (
            <tr key={l.id} className="border-b border-gold/10 align-top">
              <td className="px-4 py-3 whitespace-nowrap text-xs ink-soft">
                {new Date(l.created_at).toLocaleString()}
              </td>
              <td className="px-4 py-3">{l.actor_label ?? "—"}</td>
              <td className="px-4 py-3 font-display text-[10px] tracking-[0.2em]">
                {String(l.action).replace(/_/g, " ").toUpperCase()}
              </td>
              <td className="px-4 py-3">{l.target_label ?? "—"}</td>
              <td className="px-4 py-3 text-xs ink-soft">{l.details ?? "—"}</td>
              <td className="px-4 py-3 text-xs ink-soft">{l.ip_address ?? "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function UserModal({
  me,
  user,
  onClose,
  onSave,
}: {
  me: Me;
  user: Row | null;
  onClose: () => void;
  onSave: (payload: Record<string, unknown>, isNew: boolean) => Promise<void>;
}) {
  const isNew = !user;
  const [fullName, setFullName] = useState(user?.full_name ?? "");
  const [username, setUsername] = useState(user?.username ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<string>(user?.role ?? "viewer");
  const [status, setStatus] = useState<string>(user?.status ?? "active");
  const [granted, setGranted] = useState<string[]>(user?.granted ?? []);
  const [busy, setBusy] = useState(false);

  const preset = useMemo(() => new Set(ROLE_PRESETS[role] ?? []), [role]);
  const canAssign = hasPermission(me.permissions, "users.assign_permissions");
  const assignable = (p: string) => hasPermission(me.permissions, p);
  const effective = (p: string) => preset.has(p) || granted.includes(p);

  function toggle(p: string) {
    setGranted((g) => (g.includes(p) ? g.filter((x) => x !== p) : [...g, p]));
  }

  async function submit() {
    if (!fullName.trim()) return toast.error("Full name is required.");
    if (isNew && !/^[a-z0-9][a-z0-9_.-]{2,31}$/.test(username.trim().toLowerCase()))
      return toast.error("Username must be 3-32 chars: lowercase letters, digits, . _ -");
    if (isNew && !isStrongPassword(password)) return toast.error(STRONG_PASSWORD_HINT);
    if (role === "super_admin" && !me.isSuper)
      return toast.error("Only a Super Admin can assign the Super Admin role.");
    setBusy(true);
    try {
      await onSave(
        isNew
          ? {
              fullName: fullName.trim(),
              username: username.trim().toLowerCase(),
              email: email.trim(),
              password,
              role,
              status,
              permissions: granted,
            }
          : {
              userId: user!.user_id,
              fullName: fullName.trim(),
              email: email.trim(),
              role,
              status,
              permissions: granted,
            },
        isNew,
      );
    } catch (e: any) {
      toast.error(e?.message ?? "Could not save the user");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4">
      <div className="max-h-[88dvh] w-full max-w-3xl overflow-y-auto rounded-lg border border-gold/40 bg-[oklch(0.99_0.008_90)] p-5 shadow-xl">
        <h2 className="font-script text-2xl italic text-gold-gradient">
          {isNew ? "New administrator" : `Edit ${user!.username}`}
        </h2>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="text-xs ink-soft">
            Full name
            <input className={field} value={fullName} onChange={(e) => setFullName(e.target.value)} />
          </label>
          <label className="text-xs ink-soft">
            Admin ID (username)
            <input
              className={field}
              value={username}
              disabled={!isNew}
              onChange={(e) => setUsername(e.target.value)}
            />
          </label>
          <label className="text-xs ink-soft">
            Contact email (optional)
            <input className={field} value={email} onChange={(e) => setEmail(e.target.value)} />
          </label>
          {isNew && (
            <label className="text-xs ink-soft">
              Password
              <input
                className={field}
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <span className="mt-1 block text-[11px] ink-soft">{STRONG_PASSWORD_HINT}</span>
            </label>
          )}
          <label className="text-xs ink-soft">
            Role
            <select className={field} value={role} onChange={(e) => setRole(e.target.value)}>
              {ROLES.map((r) => (
                <option key={r} value={r} disabled={r === "super_admin" && !me.isSuper}>
                  {ROLE_LABELS[r]}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs ink-soft">
            Status
            <select className={field} value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="active">Active</option>
              <option value="disabled">Disabled</option>
            </select>
          </label>
        </div>

        <div className="mt-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="font-display text-[10px] tracking-[0.3em] ink-soft">PERMISSIONS</p>
            {canAssign && !isSuperRole(role) && (
              <div className="flex gap-2">
                <button
                  className={btn}
                  onClick={() =>
                    setGranted(
                      PERMISSION_GROUPS.flatMap((g) => g.permissions.map(([k]) => k as string))
                        .filter(assignable),
                    )
                  }
                >
                  SELECT ALL
                </button>
                <button className={btn} onClick={() => setGranted([])}>
                  CLEAR ALL
                </button>
              </div>
            )}
          </div>
          {isSuperRole(role) ? (
            <p className="mt-2 font-script italic ink-soft">
              Super Admins always hold every permission.
            </p>
          ) : (
            <div className="mt-3 grid gap-4 sm:grid-cols-2">
              {PERMISSION_GROUPS.map((g) => (
                <div key={g.key} className="rounded border border-gold/25 bg-white/70 p-3">
                  <p className="font-display text-[10px] tracking-[0.25em] text-gold-gradient">
                    {g.label.toUpperCase()}
                  </p>
                  <div className="mt-2 space-y-1.5">
                    {g.permissions.map(([k, label]) => {
                      const key = k as string;
                      const fromRole = preset.has(key);
                      return (
                        <label key={key} className="flex items-center gap-2 text-sm ink">
                          <input
                            type="checkbox"
                            className="size-4 accent-[oklch(0.72_0.11_85)]"
                            checked={effective(key)}
                            disabled={!canAssign || fromRole || !assignable(key)}
                            onChange={() => toggle(key)}
                          />
                          <span className={fromRole ? "ink-soft" : ""}>
                            {label}
                            {fromRole && <span className="ml-1 text-[11px]">(role)</span>}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button className={btn} onClick={onClose} disabled={busy}>
            CANCEL
          </button>
          <button className={btn} onClick={submit} disabled={busy}>
            {busy ? "SAVING…" : isNew ? "CREATE USER" : "SAVE CHANGES"}
          </button>
        </div>
      </div>
    </div>
  );
}

function ResetModal({
  user,
  onClose,
  onSave,
}: {
  user: Row;
  onClose: () => void;
  onSave: (password: string) => Promise<void>;
}) {
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-lg border border-gold/40 bg-[oklch(0.99_0.008_90)] p-5 shadow-xl">
        <h2 className="font-script text-2xl italic text-gold-gradient">
          Reset password — {user.username}
        </h2>
        <input
          className={`${field} mt-4`}
          type="password"
          value={password}
          placeholder="New password"
          onChange={(e) => setPassword(e.target.value)}
        />
        <p className="mt-1 text-[11px] ink-soft">{STRONG_PASSWORD_HINT}</p>
        <div className="mt-4 flex justify-end gap-2">
          <button className={btn} onClick={onClose} disabled={busy}>
            CANCEL
          </button>
          <button
            className={btn}
            disabled={busy}
            onClick={async () => {
              if (!isStrongPassword(password)) return toast.error(STRONG_PASSWORD_HINT);
              setBusy(true);
              try {
                await onSave(password);
              } catch (e: any) {
                toast.error(e?.message ?? "Could not update the password");
              } finally {
                setBusy(false);
              }
            }}
          >
            {busy ? "SAVING…" : "UPDATE PASSWORD"}
          </button>
        </div>
      </div>
    </div>
  );
}
