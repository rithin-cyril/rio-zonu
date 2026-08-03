import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useServerFn } from "@tanstack/react-start";
import {
  ADMIN_EMAIL_DOMAIN,
  adminExists,
  logAuthEvent,
  logLoginFailed,
  registerAdmin,
  resetAdminPassword,
} from "@/lib/admin.functions";

export const Route = createFileRoute("/auth")({
  ssr: false,
  validateSearch: (s: Record<string, unknown>) => ({
    next: typeof s.next === "string" ? s.next : undefined,
  }),
  component: AuthPage,
});

// Simple client-side throttle (Supabase Auth + server fns also enforce
// limits). Limits to 5 attempts per minute per browser per scope.
function getAttempts(key: string): number[] {
  try {
    const raw = sessionStorage.getItem(key);
    const arr: number[] = raw ? JSON.parse(raw) : [];
    const now = Date.now();
    return arr.filter((t) => now - t < 60_000);
  } catch {
    return [];
  }
}
function pushAttempt(key: string) {
  const a = getAttempts(key);
  a.push(Date.now());
  sessionStorage.setItem(key, JSON.stringify(a));
}

const ADMIN_ID_PATTERN = /^[a-z0-9][a-z0-9_.-]{2,31}$/;
function normalizeAdminId(v: string) {
  return v.trim().toLowerCase();
}
function adminIdToEmail(adminId: string) {
  return `${adminId}@${ADMIN_EMAIL_DOMAIN}`;
}

/** Only allow same-origin relative paths as post-login redirect targets. */
function safeNext(next: string | undefined): string | null {
  if (!next) return null;
  if (!next.startsWith("/") || next.startsWith("//")) return null;
  return next;
}

function AuthPage() {
  const navigate = useNavigate();
  const { next } = Route.useSearch();
  const nextPath = safeNext(next);
  const goAfterAuth = () => {
    if (nextPath) {
      window.location.replace(nextPath);
      return;
    }
    navigate({ to: "/admin", replace: true });
  };
  const checkAdminExists = useServerFn(adminExists);
  const register = useServerFn(registerAdmin);
  const logEvt = useServerFn(logAuthEvent);
  const logFail = useServerFn(logLoginFailed);
  const resetPw = useServerFn(resetAdminPassword);

  const [needsBootstrap, setNeedsBootstrap] = useState<boolean | null>(null);
  const [mode, setMode] = useState<"login" | "bootstrap" | "forgot">("login");
  const [adminId, setAdminId] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [masterCode, setMasterCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    // If already signed in, go to admin
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) goAfterAuth();
    });
    checkAdminExists().then((r) => {
      setNeedsBootstrap(!r.exists);
      if (!r.exists) setMode("bootstrap");
    }).catch(() => setNeedsBootstrap(false));
  }, [checkAdminExists, navigate]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setNotice(null);

    const id = normalizeAdminId(adminId);
    if (!ADMIN_ID_PATTERN.test(id)) {
      setError("Admin ID must be 3-32 chars: lowercase letters, digits, . _ -");
      return;
    }

    setBusy(true);
    try {
      if (mode === "bootstrap") {
        if (getAttempts("admin_register_attempts").length >= 5) {
          setError("Too many attempts. Please wait a minute and try again.");
          return;
        }
        if (password.length < 8) {
          setError("Password must be at least 8 characters.");
          return;
        }
        if (password !== confirmPassword) {
          setError("Passwords do not match.");
          return;
        }
        pushAttempt("admin_register_attempts");
        await register({ data: { adminId: id, password } });
        const { error: lErr } = await supabase.auth.signInWithPassword({
          email: adminIdToEmail(id),
          password,
        });
        if (lErr) throw lErr;
        await logEvt({ data: { action: "login" } }).catch(() => {});
        goAfterAuth();
        return;
      }

      if (mode === "forgot") {
        if (getAttempts("admin_reset_attempts").length >= 5) {
          setError("Too many attempts. Please wait a minute and try again.");
          return;
        }
        if (password.length < 8) {
          setError("New password must be at least 8 characters.");
          return;
        }
        if (password !== confirmPassword) {
          setError("Passwords do not match.");
          return;
        }
        if (!masterCode.trim()) {
          setError("Master code is required.");
          return;
        }
        pushAttempt("admin_reset_attempts");
        await resetPw({
          data: { adminId: id, masterCode: masterCode.trim(), newPassword: password },
        });
        setNotice("Password updated. You can sign in with your new password.");
        setMode("login");
        setPassword("");
        setConfirmPassword("");
        setMasterCode("");
        return;
      }

      // login
      if (getAttempts("admin_login_attempts").length >= 5) {
        setError("Too many attempts. Please wait a minute and try again.");
        return;
      }
      pushAttempt("admin_login_attempts");
      const { error: lErr } = await supabase.auth.signInWithPassword({
        email: adminIdToEmail(id),
        password,
      });
      if (lErr) {
        await logFail({ data: { adminId: id } }).catch(() => {});
        throw new Error("Invalid Admin ID or password.");
      }
      await logEvt({ data: { action: "login" } }).catch(() => {});
      goAfterAuth();
    } catch (err: any) {
      setError(err?.message ?? "Request failed");
    } finally {
      setBusy(false);
    }
  }

  const heading =
    mode === "bootstrap" ? "Create Admin" : mode === "forgot" ? "Reset Password" : "Sign In";
  const subhead =
    mode === "bootstrap"
      ? "Set up the single administrator account for this site."
      : mode === "forgot"
        ? "Enter your Admin ID and master code to set a new password."
        : "Restricted area. Sign in to manage blessings.";
  const submitLabel =
    mode === "bootstrap" ? "CREATE ADMIN" : mode === "forgot" ? "UPDATE PASSWORD" : "SIGN IN";

  return (
    <main className="min-h-dvh bg-[oklch(0.97_0.012_90)] flex items-center justify-center px-5 py-10">
      <div className="w-full max-w-md rounded-md border border-gold/50 bg-white/95 p-8 shadow-gold">
        <p className="text-center font-display text-[10px] tracking-[0.45em] text-gold-gradient">
          ✦  ADMINISTRATOR  ✦
        </p>
        <h1 className="mt-2 text-center font-script text-3xl italic text-gold-gradient">{heading}</h1>
        <p className="mt-2 text-center font-script text-sm italic ink-soft">{subhead}</p>

        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <div>
            <label className="block font-display text-[10px] tracking-[0.35em] ink-soft">ADMIN ID</label>
            <input
              type="text"
              required
              autoComplete="username"
              autoCapitalize="none"
              spellCheck={false}
              value={adminId}
              onChange={(e) => setAdminId(e.target.value)}
              placeholder="e.g. rio_admin"
              className="mt-1 w-full min-h-11 rounded border border-gold/40 bg-transparent px-3 py-2 ink outline-none focus:border-gold"
            />
          </div>
          {mode === "forgot" && (
            <div>
              <label className="block font-display text-[10px] tracking-[0.35em] ink-soft">
                MASTER CODE
              </label>
              <input
                type="password"
                required
                autoComplete="off"
                value={masterCode}
                onChange={(e) => setMasterCode(e.target.value)}
                className="mt-1 w-full min-h-11 rounded border border-gold/40 bg-transparent px-3 py-2 ink outline-none focus:border-gold"
              />
            </div>
          )}
          <div>
            <label className="block font-display text-[10px] tracking-[0.35em] ink-soft">
              {mode === "forgot" ? "NEW PASSWORD" : "PASSWORD"}
            </label>
            <input
              type="password"
              required
              minLength={8}
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full min-h-11 rounded border border-gold/40 bg-transparent px-3 py-2 ink outline-none focus:border-gold"
            />
          </div>
          {(mode === "bootstrap" || mode === "forgot") && (
            <div>
              <label className="block font-display text-[10px] tracking-[0.35em] ink-soft">
                CONFIRM PASSWORD
              </label>
              <input
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="mt-1 w-full min-h-11 rounded border border-gold/40 bg-transparent px-3 py-2 ink outline-none focus:border-gold"
              />
            </div>
          )}
          {error && (
            <p className="font-script italic text-sm text-[oklch(0.45_0.15_25)]">{error}</p>
          )}
          {notice && !error && (
            <p className="font-script italic text-sm text-[oklch(0.4_0.08_150)]">{notice}</p>
          )}
          <button
            type="submit"
            disabled={busy}
            className="w-full inline-flex min-h-11 items-center justify-center rounded border border-gold px-6 py-2.5 font-display text-[11px] font-semibold tracking-[0.4em] text-gold-gradient transition hover:bg-gold/10 disabled:opacity-50"
          >
            {busy ? "PLEASE WAIT…" : submitLabel}
          </button>
        </form>

        {mode === "login" && !needsBootstrap && (
          <div className="mt-4 text-center">
            <button
              type="button"
              onClick={() => {
                setMode("forgot");
                setError(null);
                setNotice(null);
                setPassword("");
                setConfirmPassword("");
              }}
              className="font-display text-[10px] tracking-[0.35em] text-gold-gradient hover:underline"
            >
              FORGOT PASSWORD?
            </button>
          </div>
        )}
        {mode === "forgot" && (
          <div className="mt-4 text-center">
            <button
              type="button"
              onClick={() => {
                setMode("login");
                setError(null);
                setNotice(null);
                setPassword("");
                setConfirmPassword("");
                setMasterCode("");
              }}
              className="font-display text-[10px] tracking-[0.35em] text-gold-gradient hover:underline"
            >
              ← BACK TO SIGN IN
            </button>
          </div>
        )}

        <div className="mt-6 text-center">
          <Link to="/" className="font-display text-[10px] tracking-[0.35em] text-gold-gradient hover:underline">
            ← BACK TO INVITATION
          </Link>
        </div>
      </div>
    </main>
  );
}