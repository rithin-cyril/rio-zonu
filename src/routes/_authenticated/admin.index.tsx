import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { adminListBlessings } from "@/lib/admin.functions";

export const Route = createFileRoute("/_authenticated/admin/")({
  component: AdminOverview,
});

function AdminOverview() {
  const list = useServerFn(adminListBlessings);
  const [stats, setStats] = useState<{ pending: number; approved: number; hidden: number; rejected: number; total: number } | null>(null);

  useEffect(() => {
    list().then((r) => {
      const s = { pending: 0, approved: 0, hidden: 0, rejected: 0, total: r.blessings.length };
      for (const b of r.blessings as any[]) s[b.status as keyof typeof s]++;
      setStats(s);
    }).catch(() => {});
  }, [list]);

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