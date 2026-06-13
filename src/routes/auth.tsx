import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useServerFn } from "@tanstack/react-start";
import { adminExists, claimAdminIfNone, logAuthEvent } from "@/lib/admin.functions";

export const Route = createFileRoute("/auth")({
  ssr: false,
  component: AuthPage,
});

// Simple client-side login attempt throttle (Supabase Auth has server-side
// rate limiting). Limits to 5 attempts per minute per browser.
const ATTEMPT_KEY = "admin_login_attempts";
function getAttempts(): number[] {
  try {
    const raw = sessionStorage.getItem(ATTEMPT_KEY);
    const arr: number[] = raw ? JSON.parse(raw) : [];
    const now = Date.now();
    return arr.filter((t) => now - t < 60_000);
  } catch {
    return [];
  }
}
function pushAttempt() {
  const a = getAttempts();
  a.push(Date.now());
  sessionStorage.setItem(ATTEMPT_KEY, JSON.stringify(a));
}

function AuthPage() {
  const navigate = useNavigate();
  const checkAdminExists = useServerFn(adminExists);
  const claim = useServerFn(claimAdminIfNone);
  const logEvt = useServerFn(logAuthEvent);

  const [needsBootstrap, setNeedsBootstrap] = useState<boolean | null>(null);
  const [mode, setMode] = useState<"login" | "bootstrap">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    // If already signed in, go to admin
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) navigate({ to: "/admin", replace: true });
    });
    checkAdminExists().then((r) => {
      setNeedsBootstrap(!r.exists);
      if (!r.exists) setMode("bootstrap");
    }).catch(() => setNeedsBootstrap(false));
  }, [checkAdminExists, navigate]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (getAttempts().length >= 5) {
      setError("Too many attempts. Please wait a minute and try again.");
      return;
    }

    setBusy(true);
    try {
      if (mode === "bootstrap") {
        const { error: sErr } = await supabase.auth.signUp({
          email: email.trim(),
          password,
        });
        if (sErr) throw sErr;
        // auto-confirm is on; sign in to obtain session
        const { error: lErr } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (lErr) throw lErr;
        const res = await claim({});
        if (!res.claimed) {
          setError("An administrator already exists. Please sign in instead.");
          await supabase.auth.signOut();
          setMode("login");
          setBusy(false);
          return;
        }
        await logEvt({ data: { action: "login" } }).catch(() => {});
        navigate({ to: "/admin", replace: true });
        return;
      }

      pushAttempt();
      const { error: lErr } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (lErr) throw lErr;
      await logEvt({ data: { action: "login" } }).catch(() => {});
      navigate({ to: "/admin", replace: true });
    } catch (err: any) {
      setError(err?.message ?? "Sign-in failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="min-h-dvh bg-[oklch(0.97_0.012_90)] flex items-center justify-center px-5 py-10">
      <div className="w-full max-w-md rounded-md border border-gold/50 bg-white/95 p-8 shadow-gold">
        <p className="text-center font-display text-[10px] tracking-[0.45em] text-gold-gradient">
          ✦  ADMINISTRATOR  ✦
        </p>
        <h1 className="mt-2 text-center font-script text-3xl italic text-gold-gradient">
          {mode === "bootstrap" ? "Create Admin" : "Sign In"}
        </h1>
        <p className="mt-2 text-center font-script text-sm italic ink-soft">
          {mode === "bootstrap"
            ? "Set up the single administrator account for this site."
            : "Restricted area. Sign in to manage blessings."}
        </p>

        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <div>
            <label className="block font-display text-[10px] tracking-[0.35em] ink-soft">EMAIL</label>
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full min-h-11 rounded border border-gold/40 bg-transparent px-3 py-2 ink outline-none focus:border-gold"
            />
          </div>
          <div>
            <label className="block font-display text-[10px] tracking-[0.35em] ink-soft">PASSWORD</label>
            <input
              type="password"
              required
              minLength={8}
              autoComplete={mode === "bootstrap" ? "new-password" : "current-password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full min-h-11 rounded border border-gold/40 bg-transparent px-3 py-2 ink outline-none focus:border-gold"
            />
          </div>
          {error && (
            <p className="font-script italic text-sm text-[oklch(0.45_0.15_25)]">{error}</p>
          )}
          <button
            type="submit"
            disabled={busy}
            className="w-full inline-flex min-h-11 items-center justify-center rounded border border-gold px-6 py-2.5 font-display text-[11px] font-semibold tracking-[0.4em] text-gold-gradient transition hover:bg-gold/10 disabled:opacity-50"
          >
            {busy ? "PLEASE WAIT…" : mode === "bootstrap" ? "CREATE ADMIN" : "SIGN IN"}
          </button>
        </form>

        <div className="mt-6 text-center">
          <Link to="/" className="font-display text-[10px] tracking-[0.35em] text-gold-gradient hover:underline">
            ← BACK TO INVITATION
          </Link>
        </div>
        {needsBootstrap === false && mode === "bootstrap" && (
          <p className="mt-3 text-center font-script text-xs italic ink-soft">
            An admin already exists.
          </p>
        )}
      </div>
    </main>
  );
}