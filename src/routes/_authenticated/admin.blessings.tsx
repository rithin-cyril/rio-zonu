import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  adminApproveBlessing,
  adminDeleteBlessing,
  adminHideBlessing,
  adminListBlessings,
  adminRestoreBlessing,
} from "@/lib/admin.functions";

export const Route = createFileRoute("/_authenticated/admin/blessings")({
  component: AdminBlessings,
});

type Row = {
  id: string;
  name: string;
  note: string;
  created_at: string;
  status: "pending" | "approved" | "hidden" | "rejected";
  rejection_reason: string | null;
};

const FILTERS = ["all", "pending", "approved", "hidden", "rejected"] as const;
type Filter = (typeof FILTERS)[number];

function StatusBadge({ status }: { status: Row["status"] }) {
  const cls = {
    pending: "bg-amber-100 text-amber-800 border-amber-300",
    approved: "bg-emerald-100 text-emerald-800 border-emerald-300",
    hidden: "bg-slate-100 text-slate-700 border-slate-300",
    rejected: "bg-rose-100 text-rose-800 border-rose-300",
  }[status];
  return (
    <span className={`inline-block rounded-full border px-2 py-0.5 font-display text-[9px] font-semibold tracking-[0.25em] uppercase ${cls}`}>
      {status}
    </span>
  );
}

function AdminBlessings() {
  const list = useServerFn(adminListBlessings);
  const approve = useServerFn(adminApproveBlessing);
  const hide = useServerFn(adminHideBlessing);
  const del = useServerFn(adminDeleteBlessing);
  const restore = useServerFn(adminRestoreBlessing);

  const [rows, setRows] = useState<Row[]>([]);
  const [filter, setFilter] = useState<Filter>("all");
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const r = await list();
      setRows(r.blessings as any);
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [list]);

  useEffect(() => { refresh(); }, [refresh]);

  async function run(id: string, fn: () => Promise<any>, label: string) {
    setPending(id);
    try {
      await fn();
      toast.success(label);
      await refresh();
    } catch (e: any) {
      toast.error(e?.message ?? "Action failed");
    } finally {
      setPending(null);
    }
  }

  const filtered = rows.filter((r) => filter === "all" || r.status === filter);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-md border px-3 py-1.5 font-display text-[10px] tracking-[0.3em] uppercase transition ${filter === f ? "border-gold bg-gold/10 text-gold-gradient" : "border-gold/30 ink-soft hover:bg-gold/5"}`}
          >
            {f} {f !== "all" && `(${rows.filter((r) => r.status === f).length})`}
          </button>
        ))}
        <button onClick={refresh} className="ml-auto rounded-md border border-gold/40 px-3 py-1.5 font-display text-[10px] tracking-[0.3em] uppercase ink-soft hover:bg-gold/5">
          ↻ Refresh
        </button>
      </div>

      {loading ? (
        <p className="font-script italic ink-soft">Loading…</p>
      ) : filtered.length === 0 ? (
        <p className="rounded-lg border border-gold/30 bg-white/80 p-6 text-center font-script italic ink-soft">
          No blessings to show.
        </p>
      ) : (
        <ul className="grid grid-cols-1 gap-4">
          {filtered.map((b) => (
            <li key={b.id} className="rounded-lg border border-gold/30 bg-white/95 p-4 shadow-gold">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-display text-[11px] font-semibold tracking-[0.35em] text-gold-gradient">
                      {b.name.toUpperCase()}
                    </p>
                    <StatusBadge status={b.status} />
                    <time className="font-script text-xs italic ink-soft" dateTime={b.created_at}>
                      {new Date(b.created_at).toLocaleString()}
                    </time>
                  </div>
                  <p className="mt-2 whitespace-pre-wrap break-words font-script text-base italic leading-relaxed ink [overflow-wrap:anywhere]">
                    {b.note}
                  </p>
                  {b.rejection_reason && (
                    <p className="mt-2 rounded border-l-2 border-rose-400 bg-rose-50/60 px-3 py-2 text-xs italic text-rose-800">
                      <strong className="not-italic font-display text-[9px] tracking-[0.3em] uppercase">Reason:</strong> {b.rejection_reason}
                    </p>
                  )}
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-2 border-t border-gold/20 pt-3">
                {b.status !== "approved" && (
                  <button
                    disabled={pending === b.id}
                    onClick={() => run(b.id, () => (b.status === "pending" ? approve({ data: { id: b.id } }) : restore({ data: { id: b.id } })), b.status === "pending" ? "Approved" : "Restored & approved")}
                    className="inline-flex min-h-10 items-center rounded border border-emerald-600 px-3 py-1.5 font-display text-[10px] font-semibold tracking-[0.3em] text-emerald-700 hover:bg-emerald-50 disabled:opacity-50"
                  >
                    {b.status === "pending" ? "✅ APPROVE" : "🔄 RESTORE / APPROVE"}
                  </button>
                )}
                {b.status !== "hidden" && b.status !== "rejected" && (
                  <button
                    disabled={pending === b.id}
                    onClick={() => run(b.id, () => hide({ data: { id: b.id } }), "Hidden")}
                    className="inline-flex min-h-10 items-center rounded border border-slate-500 px-3 py-1.5 font-display text-[10px] font-semibold tracking-[0.3em] text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                  >
                    🙈 HIDE
                  </button>
                )}
                <button
                  disabled={pending === b.id}
                  onClick={() => {
                    if (window.confirm(`Permanently delete blessing from ${b.name}? This cannot be undone.`)) {
                      run(b.id, () => del({ data: { id: b.id } }), "Deleted");
                    }
                  }}
                  className="inline-flex min-h-10 items-center rounded border border-rose-600 px-3 py-1.5 font-display text-[10px] font-semibold tracking-[0.3em] text-rose-700 hover:bg-rose-50 disabled:opacity-50"
                >
                  🗑 DELETE
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}