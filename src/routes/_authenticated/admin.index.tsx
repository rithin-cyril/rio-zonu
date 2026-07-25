import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  adminGetShowPublicDates,
  adminListBlessings,
  adminSetShowPublicDates,
} from "@/lib/admin.functions";

export const Route = createFileRoute("/_authenticated/admin/")({
  component: AdminOverview,
});

function AdminOverview() {
  const list = useServerFn(adminListBlessings);
  const getShow = useServerFn(adminGetShowPublicDates);
  const setShow = useServerFn(adminSetShowPublicDates);
  const [stats, setStats] = useState<{ pending: number; approved: number; hidden: number; rejected: number; total: number } | null>(null);
  const [showPublicDates, setShowPublicDates] = useState<boolean | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    list().then((r) => {
      const s = { pending: 0, approved: 0, hidden: 0, rejected: 0, total: r.blessings.length };
      for (const b of r.blessings as any[]) s[b.status as keyof typeof s]++;
      setStats(s);
    }).catch(() => {});
    getShow()
      .then((r) => setShowPublicDates(r.show))
      .catch(() => setShowPublicDates(true));
  }, [list, getShow]);

  async function toggle(next: boolean) {
    const prev = showPublicDates;
    setShowPublicDates(next); // optimistic
    setSaving(true);
    try {
      await setShow({ data: { show: next } });
      toast.success(next ? "Dates visible on public site" : "Dates hidden on public site");
    } catch (e: any) {
      setShowPublicDates(prev);
      toast.error(e?.message ?? "Could not save preference");
    } finally {
      setSaving(false);
    }
  }

  const cards = [
    { label: "Total", value: stats?.total ?? "—", color: "text-gold-gradient" },
    { label: "Pending", value: stats?.pending ?? "—", color: "text-amber-700" },
    { label: "Approved", value: stats?.approved ?? "—", color: "text-emerald-700" },
    { label: "Hidden", value: stats?.hidden ?? "—", color: "text-slate-600" },
    { label: "Rejected", value: stats?.rejected ?? "—", color: "text-rose-700" },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {cards.map((c) => (
          <div key={c.label} className="rounded-lg border border-gold/30 bg-white/90 p-4 shadow-gold">
            <p className="font-display text-[10px] tracking-[0.35em] ink-soft">{c.label.toUpperCase()}</p>
            <p className={`mt-2 font-script text-3xl italic ${c.color}`}>{c.value}</p>
          </div>
        ))}
      </div>

      <section className="rounded-lg border border-gold/30 bg-white/95 p-5 shadow-gold sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="font-display text-[10px] tracking-[0.4em] text-gold-gradient">
              ✦  PUBLIC DISPLAY  ✦
            </p>
            <h2 className="font-script mt-1 text-2xl italic text-gold-gradient">
              Show Dates on Public Blessings
            </h2>
            <p className="mt-1 font-script text-sm italic ink-soft">
              When off, dates are hidden from guests on the public wall. Admins
              still see every timestamp here and in the audit log — nothing is
              deleted.
            </p>
          </div>
          <DateToggle
            checked={showPublicDates ?? true}
            disabled={showPublicDates === null || saving}
            onChange={toggle}
          />
        </div>
      </section>

      <div className="flex flex-wrap gap-3">
        <Link to="/admin/blessings" className="inline-flex min-h-11 items-center rounded border border-gold px-5 py-2 font-display text-[11px] font-semibold tracking-[0.4em] text-gold-gradient hover:bg-gold/10">
          MANAGE BLESSINGS →
        </Link>
        <Link to="/admin/logs" className="inline-flex min-h-11 items-center rounded border border-gold/60 px-5 py-2 font-display text-[11px] font-semibold tracking-[0.4em] text-gold-gradient hover:bg-gold/10">
          MODERATION LOGS →
        </Link>
      </div>
    </div>
  );
}

function DateToggle({
  checked,
  disabled,
  onChange,
}: {
  checked: boolean;
  disabled?: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <label
      className={`inline-flex shrink-0 select-none items-center gap-3 ${
        disabled ? "opacity-60" : "cursor-pointer"
      }`}
    >
      <span className="font-display text-[10px] tracking-[0.35em] uppercase ink-soft">
        {checked ? "Shown" : "Hidden"}
      </span>
      <span
        role="switch"
        aria-checked={checked}
        aria-label="Show dates on public blessings"
        className={`relative inline-flex h-7 w-12 items-center rounded-full border transition ${
          checked
            ? "border-emerald-500/70 bg-emerald-500/80"
            : "border-gold/40 bg-[oklch(0.95_0.02_85)]"
        }`}
      >
        <span
          className={`absolute left-0.5 top-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform ${
            checked ? "translate-x-5" : "translate-x-0"
          }`}
        />
      </span>
      <input
        type="checkbox"
        className="sr-only"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
      />
    </label>
  );
}