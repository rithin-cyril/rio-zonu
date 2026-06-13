import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { adminListLogs } from "@/lib/admin.functions";

export const Route = createFileRoute("/_authenticated/admin/logs")({
  component: AdminLogs,
});

type Log = {
  id: string;
  blessing_id: string | null;
  guest_name: string | null;
  action: string;
  administrator: string | null;
  previous_status: string | null;
  new_status: string | null;
  reason: string | null;
  created_at: string;
};

const actionColors: Record<string, string> = {
  submitted: "bg-blue-100 text-blue-800 border-blue-300",
  approved: "bg-emerald-100 text-emerald-800 border-emerald-300",
  approved_override: "bg-emerald-200 text-emerald-900 border-emerald-400",
  hidden: "bg-slate-100 text-slate-700 border-slate-300",
  rejected: "bg-rose-100 text-rose-800 border-rose-300",
  deleted: "bg-red-200 text-red-900 border-red-400",
  login: "bg-amber-50 text-amber-800 border-amber-200",
  logout: "bg-amber-50 text-amber-800 border-amber-200",
};

function AdminLogs() {
  const list = useServerFn(adminListLogs);
  const [logs, setLogs] = useState<Log[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    list().then((r) => setLogs(r.logs as any)).catch(() => {}).finally(() => setLoading(false));
  }, [list]);

  if (loading) return <p className="font-script italic ink-soft">Loading…</p>;
  if (logs.length === 0)
    return <p className="rounded-lg border border-gold/30 bg-white/80 p-6 text-center font-script italic ink-soft">No log entries yet.</p>;

  return (
    <div className="overflow-x-auto rounded-lg border border-gold/30 bg-white/95 shadow-gold">
      <table className="w-full min-w-[720px] text-left text-sm">
        <thead className="border-b border-gold/30 bg-gold/5">
          <tr className="font-display text-[10px] uppercase tracking-[0.25em] ink-soft">
            <th className="px-3 py-2">When</th>
            <th className="px-3 py-2">Action</th>
            <th className="px-3 py-2">Guest</th>
            <th className="px-3 py-2">Admin</th>
            <th className="px-3 py-2">Transition</th>
            <th className="px-3 py-2">Reason</th>
          </tr>
        </thead>
        <tbody>
          {logs.map((l) => (
            <tr key={l.id} className="border-b border-gold/10 align-top">
              <td className="px-3 py-2 whitespace-nowrap font-script italic ink-soft text-xs">
                {new Date(l.created_at).toLocaleString()}
              </td>
              <td className="px-3 py-2">
                <span className={`inline-block rounded-full border px-2 py-0.5 font-display text-[9px] font-semibold tracking-[0.25em] uppercase ${actionColors[l.action] ?? "bg-gray-100 text-gray-700 border-gray-300"}`}>
                  {l.action.replace("_", " ")}
                </span>
              </td>
              <td className="px-3 py-2 ink">{l.guest_name ?? "—"}</td>
              <td className="px-3 py-2 ink-soft">{l.administrator ?? "—"}</td>
              <td className="px-3 py-2 ink-soft text-xs">
                {l.previous_status || l.new_status ? `${l.previous_status ?? "—"} → ${l.new_status ?? "—"}` : "—"}
              </td>
              <td className="px-3 py-2 ink-soft text-xs italic max-w-[260px] break-words">{l.reason ?? "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}