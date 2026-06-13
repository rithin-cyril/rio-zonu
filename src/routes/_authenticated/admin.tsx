import {
  createFileRoute,
  Outlet,
  Link,
  useNavigate,
  redirect,
} from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { checkAdmin, logAuthEvent } from "@/lib/admin.functions";

export const Route = createFileRoute("/_authenticated/admin")({
  component: AdminShell,
});

function AdminShell() {
  const navigate = useNavigate();
  const verifyAdmin = useServerFn(checkAdmin);
  const logEvt = useServerFn(logAuthEvent);
  const [ok, setOk] = useState<null | boolean>(null);
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    verifyAdmin()
      .then((r) => {
        setOk(r.isAdmin);
        setEmail(r.email);
        if (!r.isAdmin) {
          navigate({ to: "/auth", replace: true });
        }
      })
      .catch(() => {
        setOk(false);
        navigate({ to: "/auth", replace: true });
      });
  }, [verifyAdmin, navigate]);

  async function onLogout() {
    try { await logEvt({ data: { action: "logout" } }); } catch {}
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  if (ok === null) {
    return (
      <div className="min-h-dvh grid place-items-center bg-[oklch(0.97_0.012_90)]">
        <p className="font-script italic ink-soft">Verifying…</p>
      </div>
    );
  }
  if (!ok) return null;

  return (
    <div className="min-h-dvh bg-[oklch(0.97_0.012_90)] ink">
      <header className="border-b border-gold/30 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-5 py-4">
          <div>
            <p className="font-display text-[10px] tracking-[0.4em] text-gold-gradient">
              ✦  ADMIN DASHBOARD  ✦
            </p>
            <h1 className="font-script text-2xl italic text-gold-gradient">Rithin &amp; Harshita</h1>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden sm:inline font-script italic text-sm ink-soft">{email}</span>
            <button
              onClick={onLogout}
              className="inline-flex min-h-10 items-center rounded border border-gold/60 px-4 py-2 font-display text-[10px] font-semibold tracking-[0.3em] text-gold-gradient transition hover:bg-gold/10"
            >
              🚪 LOGOUT
            </button>
          </div>
        </div>
        <nav className="mx-auto flex max-w-6xl flex-wrap gap-1 px-5 pb-3 text-sm">
          <NavTab to="/admin" exact>Overview</NavTab>
          <NavTab to="/admin/blessings">Blessings</NavTab>
          <NavTab to="/admin/logs">Moderation Logs</NavTab>
        </nav>
      </header>
      <main className="mx-auto max-w-6xl px-5 py-6">
        <Outlet />
      </main>
    </div>
  );
}

function NavTab({ to, exact, children }: { to: string; exact?: boolean; children: React.ReactNode }) {
  return (
    <Link
      to={to as any}
      activeOptions={{ exact: !!exact }}
      activeProps={{ className: "border-gold bg-gold/10 text-gold-gradient" }}
      inactiveProps={{ className: "border-transparent ink-soft hover:bg-gold/5" }}
      className="rounded-md border px-3 py-1.5 font-display text-[10px] tracking-[0.3em] transition"
    >
      {children}
    </Link>
  );
}