import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  DndContext,
  PointerSensor,
  KeyboardSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  adminApproveBlessing,
  adminDeleteBlessing,
  adminEditBlessing,
  adminHideBlessing,
  adminListBlessingVersions,
  adminListBlessings,
  adminReorderBlessings,
  adminRestoreBlessing,
  adminReanalyzeBlessing,
  adminSetRankingMode,
  adminListBlessingIdsForAnalysis,
  adminReanalyzeBatch,
  adminLogBulkReanalysis,
} from "@/lib/admin.functions";

export const Route = createFileRoute("/_authenticated/admin/blessings")({
  component: AdminBlessings,
});

type Status = "pending" | "approved" | "hidden" | "rejected";
type Row = {
  id: string;
  name: string;
  note: string;
  created_at: string;
  status: Status;
  rejection_reason: string | null;
  sort_order: number | null;
  last_edited_at: string | null;
  last_edited_by: string | null;
  quality_score: number | null;
  ai_probability: number | null;
  analysis: any | null;
  analyzed_at: string | null;
  approved_at?: string | null;
  display_position: number | null;
  ai_rank: number | null;
};
type Version = {
  id: string;
  version: number;
  name: string;
  note: string;
  status: string;
  edited_by_label: string | null;
  change_type: string;
  created_at: string;
};

const FILTERS = ["all", "pending", "approved", "hidden", "rejected"] as const;
type Filter = (typeof FILTERS)[number];

const SORTS = {
  manual: "Display position (live public order)",
  score_desc: "Highest score",
  score_asc: "Lowest score",
  ai_desc: "Highest AI probability",
  ai_asc: "Lowest AI probability",
  len_desc: "Longest blessing",
  len_asc: "Shortest blessing",
  new: "Newest",
  old: "Oldest",
} as const;
type SortKey = keyof typeof SORTS;

function classifyProb(p: number | null) {
  if (p === null || p === undefined) return { label: "Not analysed", cls: "border-gray-300 text-gray-600" };
  if (p <= 30) return { label: "🟢 Likely Human", cls: "border-emerald-300 text-emerald-700" };
  if (p <= 70) return { label: "🟡 Mixed / Uncertain", cls: "border-amber-300 text-amber-700" };
  return { label: "🔴 Likely AI-Generated", cls: "border-rose-300 text-rose-700" };
}

function scoreCls(s: number | null) {
  if (s === null || s === undefined) return "border-gray-300 text-gray-600";
  if (s >= 80) return "border-emerald-400 text-emerald-700";
  if (s >= 55) return "border-amber-400 text-amber-700";
  return "border-rose-300 text-rose-700";
}

function StatusBadge({ status }: { status: Status | string }) {
  const cls =
    {
      pending: "bg-amber-100 text-amber-800 border-amber-300",
      approved: "bg-emerald-100 text-emerald-800 border-emerald-300",
      hidden: "bg-slate-100 text-slate-700 border-slate-300",
      rejected: "bg-rose-100 text-rose-800 border-rose-300",
    }[status as Status] ?? "bg-gray-100 text-gray-700 border-gray-300";
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
  const edit = useServerFn(adminEditBlessing);
  const reorder = useServerFn(adminReorderBlessings);
  const listVersions = useServerFn(adminListBlessingVersions);
  const reanalyze = useServerFn(adminReanalyzeBlessing);
  const setRanking = useServerFn(adminSetRankingMode);
  const listIds = useServerFn(adminListBlessingIdsForAnalysis);
  const reanalyzeBatch = useServerFn(adminReanalyzeBatch);
  const logBulk = useServerFn(adminLogBulkReanalysis);

  const [rows, setRows] = useState<Row[]>([]);
  const [filter, setFilter] = useState<Filter>("all");
  const [sort, setSort] = useState<SortKey>("manual");
  const [rankingMode, setRankingMode] = useState<"ai" | "manual">("ai");
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [savingOrder, setSavingOrder] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [historyId, setHistoryId] = useState<string | null>(null);
  const [analysisId, setAnalysisId] = useState<string | null>(null);
  const [confirmBulk, setConfirmBulk] = useState(false);
  const [bulk, setBulk] = useState<BulkState | null>(null);

  const refresh = useCallback(async () => {
    try {
      const r = await list();
      setRows(r.blessings as any);
      setRankingMode(((r as any).rankingMode ?? "ai") as "ai" | "manual");
      setDirty(false);
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [list]);

  const runBulkReanalysis = useCallback(async () => {
    setConfirmBulk(false);
    let items: { id: string; name: string }[] = [];
    try {
      items = (await listIds()).items;
    } catch (e: any) {
      toast.error(e?.message ?? "Could not load blessings");
      return;
    }
    if (items.length === 0) {
      toast.message("No blessings to re-analyse.");
      return;
    }
    const total = items.length;
    const started = Date.now();
    setBulk({ total, done: 0, current: items[0]!.name, etaMs: null, failed: 0, finished: false });

    const BATCH = 3;
    let done = 0;
    let failed = 0;
    for (let i = 0; i < items.length; i += BATCH) {
      const chunk = items.slice(i, i + BATCH);
      try {
        const r = await reanalyzeBatch({ data: { ids: chunk.map((c) => c.id) } });
        failed += (r as any).failed ?? 0;
      } catch {
        failed += chunk.length;
      }
      done += chunk.length;
      const elapsed = Date.now() - started;
      const etaMs = done < total ? Math.round((elapsed / done) * (total - done)) : 0;
      setBulk({
        total,
        done,
        failed,
        current: items[Math.min(done, total - 1)]!.name,
        etaMs,
        finished: false,
      });
      // Yield to the browser so the UI stays responsive between batches.
      await new Promise((r) => setTimeout(r, 0));
    }

    try {
      await logBulk({ data: { total, failed } });
    } catch {
      /* logging is best-effort */
    }
    setBulk({ total, done, failed, current: null, etaMs: 0, finished: true });
    await refresh();
    toast.success(`Re-analysed ${total - failed} of ${total} blessings`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listIds, reanalyzeBatch, logBulk, refresh]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Warn before leaving with unsaved order changes
  useEffect(() => {
    if (!dirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);

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

  // Drag-and-drop (operates on the full ordered list)
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function applyReorder(next: Row[]) {
    setRows(next);
    setDirty(true);
  }

  function handleDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIndex = rows.findIndex((r) => r.id === active.id);
    const newIndex = rows.findIndex((r) => r.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    applyReorder(arrayMove(rows, oldIndex, newIndex));
  }

  function move(id: string, where: "top" | "up" | "down" | "bottom") {
    const idx = rows.findIndex((r) => r.id === id);
    if (idx < 0) return;
    let target = idx;
    if (where === "top") target = 0;
    else if (where === "bottom") target = rows.length - 1;
    else if (where === "up") target = Math.max(0, idx - 1);
    else if (where === "down") target = Math.min(rows.length - 1, idx + 1);
    if (target === idx) return;
    applyReorder(arrayMove(rows, idx, target));
  }

  async function saveOrder() {
    setSavingOrder(true);
    try {
      await reorder({ data: { orderedIds: rows.map((r) => r.id) } });
      toast.success("Manual order saved — it now overrides AI ranking");
      await refresh();
    } catch (e: any) {
      toast.error(e?.message ?? "Could not save order");
    } finally {
      setSavingOrder(false);
    }
  }

  async function resetToAiRanking() {
    try {
      await setRanking({ data: { mode: "ai" } });
      toast.success("Public ordering reset to AI ranking");
      await refresh();
    } catch (e: any) {
      toast.error(e?.message ?? "Could not reset ranking");
    }
  }

  const editingRow = useMemo(() => rows.find((r) => r.id === editingId) ?? null, [rows, editingId]);
  const analysisRow = useMemo(
    () => rows.find((r) => r.id === analysisId) ?? null,
    [rows, analysisId],
  );

  // Display Position is recomputed locally so it stays correct while the
  // admin drags/moves rows before saving. Only publicly visible (approved)
  // blessings occupy a position — it mirrors the live public order.
  const positions = useMemo(() => {
    const map = new Map<string, number>();
    let n = 0;
    for (const r of rows) if (r.status === "approved") map.set(r.id, ++n);
    return map;
  }, [rows]);
  const visibleCount = positions.size;

  const displayRows = useMemo(() => {
    if (sort === "manual") return rows;
    const s = [...rows];
    const n = (v: number | null | undefined, d: number) => (v === null || v === undefined ? d : v);
    s.sort((a, b) => {
      switch (sort) {
        case "score_desc": return n(b.quality_score, -1) - n(a.quality_score, -1);
        case "score_asc": return n(a.quality_score, 101) - n(b.quality_score, 101);
        case "ai_desc": return n(b.ai_probability, -1) - n(a.ai_probability, -1);
        case "ai_asc": return n(a.ai_probability, 101) - n(b.ai_probability, 101);
        case "len_desc": return b.note.length - a.note.length;
        case "len_asc": return a.note.length - b.note.length;
        case "new": return b.created_at.localeCompare(a.created_at);
        case "old": return a.created_at.localeCompare(b.created_at);
        default: return 0;
      }
    });
    return s;
  }, [rows, sort]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-md border px-3 py-1.5 font-display text-[10px] tracking-[0.3em] uppercase transition ${
              filter === f
                ? "border-gold bg-gold/10 text-gold-gradient"
                : "border-gold/30 ink-soft hover:bg-gold/5"
            }`}
          >
            {f} {f !== "all" && `(${rows.filter((r) => r.status === f).length})`}
          </button>
        ))}
        <div className="ml-auto flex items-center gap-2">
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortKey)}
            aria-label="Sort blessings"
            className="rounded-md border border-gold/40 bg-white px-2 py-1.5 font-display text-[10px] tracking-[0.2em] uppercase ink-soft"
          >
            {Object.entries(SORTS).map(([k, label]) => (
              <option key={k} value={k}>{label}</option>
            ))}
          </select>
          {dirty && (
            <span className="font-script text-xs italic text-amber-700">
              Unsaved order changes
            </span>
          )}
          <button
            onClick={saveOrder}
            disabled={!dirty || savingOrder}
            className="rounded-md border border-emerald-600 px-3 py-1.5 font-display text-[10px] font-semibold tracking-[0.3em] uppercase text-emerald-700 transition hover:bg-emerald-50 disabled:opacity-40"
          >
            💾 SAVE ORDER
          </button>
          <button
            onClick={refresh}
            className="rounded-md border border-gold/40 px-3 py-1.5 font-display text-[10px] tracking-[0.3em] uppercase ink-soft hover:bg-gold/5"
          >
            ↻ Refresh
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 rounded-lg border border-gold/30 bg-white/80 px-4 py-3">
        <span className={`rounded-full border px-2 py-0.5 font-display text-[9px] font-semibold tracking-[0.25em] uppercase ${rankingMode === "manual" ? "border-indigo-300 text-indigo-700" : "border-emerald-300 text-emerald-700"}`}>
          {rankingMode === "manual" ? "Manual order active" : "AI ranking active"}
        </span>
        <p className="font-script text-xs italic ink-soft">
          {rankingMode === "manual"
            ? "The public wall uses your saved manual order."
            : "The public wall shows the highest Blessing Quality Scores first."}{" "}
          This list mirrors the exact public order — #Display Position is the live
          website position (never shown to guests), while AI # is a recommendation.
          Drag the handle (⋮⋮) or use the move buttons, then save to override.
          Sorting the list above is a view only — it does not change the public order.
        </p>
        <button
          onClick={resetToAiRanking}
          disabled={rankingMode === "ai"}
          className="ml-auto rounded-md border border-gold/50 px-3 py-1.5 font-display text-[10px] font-semibold tracking-[0.3em] uppercase text-gold-gradient transition hover:bg-gold/5 disabled:opacity-40"
        >
          ✨ Reset to AI ranking
        </button>
        <button
          onClick={() => setConfirmBulk(true)}
          disabled={!!bulk && !bulk.finished}
          className="rounded-md border border-indigo-400 px-3 py-1.5 font-display text-[10px] font-semibold tracking-[0.3em] uppercase text-indigo-700 transition hover:bg-indigo-50 disabled:opacity-40"
        >
          🔄 Re-analyze all blessings
        </button>
      </div>

      {confirmBulk && (
        <ConfirmBulkModal
          onCancel={() => setConfirmBulk(false)}
          onConfirm={runBulkReanalysis}
        />
      )}
      {bulk && <BulkProgressModal state={bulk} onClose={() => setBulk(null)} />}

      {loading ? (
        <p className="font-script italic ink-soft">Loading…</p>
      ) : rows.length === 0 ? (
        <p className="rounded-lg border border-gold/30 bg-white/80 p-6 text-center font-script italic ink-soft">
          No blessings yet.
        </p>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={displayRows.map((r) => r.id)} strategy={verticalListSortingStrategy}>
            <ul className="grid grid-cols-1 gap-4">
              {displayRows.map((b) => {
                const hidden = filter !== "all" && b.status !== filter;
                if (hidden) return null;
                const index = rows.findIndex((r) => r.id === b.id) + 1;
                const position = positions.get(b.id) ?? null;
                return (
                  <SortableCard
                    key={b.id}
                    row={b}
                    position={position}
                    index={index}
                    total={rows.length}
                    visibleCount={visibleCount}
                    draggable={sort === "manual"}
                    pending={pending === b.id}
                    onApprove={() =>
                      run(
                        b.id,
                        () =>
                          b.status === "pending"
                            ? approve({ data: { id: b.id } })
                            : restore({ data: { id: b.id } }),
                        b.status === "pending" ? "Approved" : "Restored & approved",
                      )
                    }
                    onHide={() => run(b.id, () => hide({ data: { id: b.id } }), "Hidden")}
                    onDelete={() => {
                      if (
                        window.confirm(
                          `Permanently delete blessing from ${b.name}? This cannot be undone.`,
                        )
                      ) {
                        run(b.id, () => del({ data: { id: b.id } }), "Deleted");
                      }
                    }}
                    onEdit={() => setEditingId(b.id)}
                    onHistory={() => setHistoryId(b.id)}
                    onAnalysis={() => setAnalysisId(b.id)}
                    onReanalyze={() =>
                      run(b.id, () => reanalyze({ data: { id: b.id } }), "Re-analysed")
                    }
                    onMove={(where) => move(b.id, where)}
                  />
                );
              })}
            </ul>
          </SortableContext>
        </DndContext>
      )}

      {editingRow && (
        <EditModal
          row={editingRow}
          onClose={() => setEditingId(null)}
          onSubmit={async (payload) => {
            try {
              await edit({ data: { id: editingRow.id, ...payload } });
              toast.success("Blessing updated");
              setEditingId(null);
              await refresh();
            } catch (e: any) {
              toast.error(e?.message ?? "Could not save");
            }
          }}
        />
      )}

      {historyId && (
        <HistoryModal
          id={historyId}
          load={async () => (await listVersions({ data: { id: historyId } })).versions as any}
          onClose={() => setHistoryId(null)}
        />
      )}

      {analysisRow && (
        <AnalysisModal row={analysisRow} onClose={() => setAnalysisId(null)} />
      )}
    </div>
  );
}

function SortableCard({
  row,
  position,
  index,
  total,
  visibleCount,
  pending,
  draggable,
  onApprove,
  onHide,
  onDelete,
  onEdit,
  onHistory,
  onAnalysis,
  onReanalyze,
  onMove,
}: {
  row: Row;
  position: number | null;
  index: number;
  total: number;
  visibleCount: number;
  pending: boolean;
  draggable: boolean;
  onApprove: () => void;
  onHide: () => void;
  onDelete: () => void;
  onEdit: () => void;
  onHistory: () => void;
  onAnalysis: () => void;
  onReanalyze: () => void;
  onMove: (where: "top" | "up" | "down" | "bottom") => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: row.id,
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
  };

  return (
    <li
      ref={setNodeRef}
      style={style}
      className="rounded-lg border border-gold/30 bg-white/95 p-4 shadow-gold"
    >
      <div className="flex items-start gap-3">
        <button
          {...attributes}
          {...listeners}
          disabled={!draggable}
          aria-label="Drag to reorder"
          title={draggable ? "Drag to reorder" : "Switch the list to Manual order to drag"}
          className="mt-1 cursor-grab select-none rounded border border-gold/30 px-2 py-1 font-mono text-xs ink-soft hover:bg-gold/5 active:cursor-grabbing disabled:cursor-not-allowed disabled:opacity-30"
        >
          ⋮⋮
        </button>
        <div className="flex flex-col items-center gap-1">
          <div
            title={`Display Position — live position on the public website (admin-only), of ${visibleCount} shown publicly`}
            className={`flex h-7 min-w-9 items-center justify-center rounded-full border px-2 font-display text-[10px] font-semibold ${
              position ? "border-gold/50 text-gold-gradient" : "border-slate-300 text-slate-400"
            }`}
          >
            #{position ?? "—"}
          </div>
          <span
            title="AI Overall Rank — recommendation only"
            className="rounded-full border border-sky-200 px-1.5 py-0.5 font-display text-[8px] tracking-[0.15em] text-sky-700"
          >
            AI #{row.ai_rank ?? "—"}
          </span>
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-display text-[11px] font-semibold tracking-[0.35em] text-gold-gradient">
              {row.name.toUpperCase()}
            </p>
            <StatusBadge status={row.status} />
            <time
              className="font-script text-xs italic ink-soft"
              dateTime={row.created_at}
            >
              {new Date(row.created_at).toLocaleString()}
            </time>
            {row.last_edited_at && (
              <span className="font-script text-xs italic text-amber-700">
                ✎ edited {new Date(row.last_edited_at).toLocaleString()}
              </span>
            )}
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className={`rounded-full border px-2 py-0.5 font-display text-[9px] font-semibold tracking-[0.2em] uppercase ${scoreCls(row.quality_score)}`}>
              ⭐ {row.quality_score ?? "—"}/100
            </span>
            <span className={`rounded-full border px-2 py-0.5 font-display text-[9px] font-semibold tracking-[0.2em] uppercase ${classifyProb(row.ai_probability).cls}`}>
              🤖 {row.ai_probability ?? "—"}% • {classifyProb(row.ai_probability).label}
            </span>
            <span className="rounded-full border border-gold/30 px-2 py-0.5 font-display text-[9px] tracking-[0.2em] uppercase ink-soft">
              📏 {row.note.length} chars
            </span>
          </div>
          <p className="mt-2 whitespace-pre-wrap break-words font-script text-base italic leading-relaxed ink [overflow-wrap:anywhere]">
            {row.note}
          </p>
          {row.rejection_reason && (
            <p className="mt-2 rounded border-l-2 border-rose-400 bg-rose-50/60 px-3 py-2 text-xs italic text-rose-800">
              <strong className="not-italic font-display text-[9px] tracking-[0.3em] uppercase">
                Reason:
              </strong>{" "}
              {row.rejection_reason}
            </p>
          )}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-gold/20 pt-3">
        <div className="flex flex-wrap gap-1">
          <MoveBtn label="⤒ Top" disabled={index === 1} onClick={() => onMove("top")} />
          <MoveBtn label="↑ Up" disabled={index === 1} onClick={() => onMove("up")} />
          <MoveBtn label="↓ Down" disabled={index === total} onClick={() => onMove("down")} />
          <MoveBtn label="⤓ Bottom" disabled={index === total} onClick={() => onMove("bottom")} />
        </div>
        <div className="ml-auto flex flex-wrap gap-2">
          <button
            onClick={onAnalysis}
            className="inline-flex min-h-10 items-center rounded border border-sky-600 px-3 py-1.5 font-display text-[10px] font-semibold tracking-[0.3em] text-sky-700 hover:bg-sky-50"
          >
            📊 ANALYSIS
          </button>
          <button
            onClick={onReanalyze}
            disabled={pending}
            className="inline-flex min-h-10 items-center rounded border border-sky-400 px-3 py-1.5 font-display text-[10px] font-semibold tracking-[0.3em] text-sky-700 hover:bg-sky-50 disabled:opacity-50"
          >
            ♻️ RE-ANALYSE
          </button>
          <button
            onClick={onEdit}
            disabled={pending}
            className="inline-flex min-h-10 items-center rounded border border-indigo-600 px-3 py-1.5 font-display text-[10px] font-semibold tracking-[0.3em] text-indigo-700 hover:bg-indigo-50 disabled:opacity-50"
          >
            ✏️ EDIT
          </button>
          <button
            onClick={onHistory}
            className="inline-flex min-h-10 items-center rounded border border-gold/50 px-3 py-1.5 font-display text-[10px] font-semibold tracking-[0.3em] text-gold-gradient hover:bg-gold/5"
          >
            🕓 HISTORY
          </button>
          {row.status !== "approved" && (
            <button
              disabled={pending}
              onClick={onApprove}
              className="inline-flex min-h-10 items-center rounded border border-emerald-600 px-3 py-1.5 font-display text-[10px] font-semibold tracking-[0.3em] text-emerald-700 hover:bg-emerald-50 disabled:opacity-50"
            >
              {row.status === "pending" ? "✅ APPROVE" : "🔄 RESTORE"}
            </button>
          )}
          {row.status !== "hidden" && row.status !== "rejected" && (
            <button
              disabled={pending}
              onClick={onHide}
              className="inline-flex min-h-10 items-center rounded border border-slate-500 px-3 py-1.5 font-display text-[10px] font-semibold tracking-[0.3em] text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              🙈 HIDE
            </button>
          )}
          <button
            disabled={pending}
            onClick={onDelete}
            className="inline-flex min-h-10 items-center rounded border border-rose-600 px-3 py-1.5 font-display text-[10px] font-semibold tracking-[0.3em] text-rose-700 hover:bg-rose-50 disabled:opacity-50"
          >
            🗑 DELETE
          </button>
        </div>
      </div>
    </li>
  );
}

function MoveBtn({
  label,
  disabled,
  onClick,
}: {
  label: string;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="rounded border border-gold/40 px-2 py-1 font-display text-[9px] tracking-[0.2em] uppercase ink-soft hover:bg-gold/5 disabled:opacity-30"
    >
      {label}
    </button>
  );
}

function EditModal({
  row,
  onClose,
  onSubmit,
}: {
  row: Row;
  onClose: () => void;
  onSubmit: (payload: { name: string; note: string; status: Status }) => Promise<void>;
}) {
  const [name, setName] = useState(row.name);
  const [note, setNote] = useState(row.note);
  const [status, setStatus] = useState<Status>(row.status);
  const [saving, setSaving] = useState(false);

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4" role="dialog" aria-modal="true">
      <div className="w-full max-w-2xl rounded-lg border border-gold/40 bg-white p-6 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-script text-2xl italic text-gold-gradient">Edit blessing</h3>
          <button onClick={onClose} className="rounded px-2 py-1 ink-soft hover:bg-gold/5">✕</button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block font-display text-[10px] tracking-[0.3em] uppercase ink-soft">
              Guest name
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={80}
              className="mt-1 w-full rounded border border-gold/40 bg-white px-3 py-2 font-script italic ink"
            />
          </div>
          <div>
            <label className="block font-display text-[10px] tracking-[0.3em] uppercase ink-soft">
              Blessing message ({note.length}/2000)
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={2000}
              rows={6}
              className="mt-1 w-full rounded border border-gold/40 bg-white px-3 py-2 font-script italic ink"
            />
          </div>
          <div>
            <label className="block font-display text-[10px] tracking-[0.3em] uppercase ink-soft">
              Status
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as Status)}
              className="mt-1 w-full rounded border border-gold/40 bg-white px-3 py-2 ink"
            >
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="hidden">Hidden</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
          <p className="font-script text-xs italic ink-soft">
            Display order is managed from the list using drag-and-drop and the
            move buttons. Display Position #{row.display_position ?? "—"} currently.
          </p>
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded border border-gold/40 px-4 py-2 font-display text-[10px] tracking-[0.3em] uppercase ink-soft hover:bg-gold/5"
          >
            Cancel
          </button>
          <button
            disabled={saving || !name.trim() || !note.trim()}
            onClick={async () => {
              setSaving(true);
              try {
                await onSubmit({ name: name.trim(), note: note.trim(), status });
              } finally {
                setSaving(false);
              }
            }}
            className="rounded border border-emerald-600 bg-emerald-600 px-4 py-2 font-display text-[10px] font-semibold tracking-[0.3em] uppercase text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save changes"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Bar({ label, value }: { label: string; value: number | null | undefined }) {
  const v = value ?? 0;
  return (
    <div>
      <div className="flex items-center justify-between">
        <span className="font-display text-[10px] tracking-[0.25em] uppercase ink-soft">{label}</span>
        <span className="font-display text-[10px] font-semibold ink">{value ?? "—"}/100</span>
      </div>
      <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-gold/10">
        <div
          className="h-full rounded-full bg-[oklch(0.72_0.11_80)]"
          style={{ width: `${Math.max(0, Math.min(100, v))}%` }}
        />
      </div>
    </div>
  );
}

function AnalysisModal({ row, onClose }: { row: Row; onClose: () => void }) {
  const a = row.analysis ?? null;
  const b = a?.breakdown ?? {};
  const cls = classifyProb(row.ai_probability);
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4" role="dialog" aria-modal="true">
      <div className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-lg border border-gold/40 bg-white p-6 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-script text-2xl italic text-gold-gradient">Blessing analysis</h3>
          <button onClick={onClose} className="rounded px-2 py-1 ink-soft hover:bg-gold/5">✕</button>
        </div>

        {!a ? (
          <p className="font-script italic ink-soft">
            This blessing has not been analysed yet. Use ♻️ Re-analyse on the card.
          </p>
        ) : (
          <div className="space-y-5">
            <div className="rounded-lg border border-gold/30 bg-[#FBF8F1]/60 p-4">
              <p className="font-display text-[10px] tracking-[0.3em] uppercase ink-soft">
                Overall blessing score
              </p>
              <p className="font-script text-3xl italic text-gold-gradient">
                {row.quality_score ?? "—"}/100
              </p>
              <p className="mt-1 font-script text-sm italic ink-soft">{a.summary}</p>
            </div>

            <div className="space-y-3">
              <p className="font-display text-[10px] tracking-[0.3em] uppercase ink-soft">Breakdown</p>
              <Bar label="❤️ Emotional quality" value={b.emotional_quality} />
              <Bar label="💍 Wedding relevance" value={b.wedding_relevance} />
              <Bar label="✨ Originality" value={b.originality} />
              <Bar label="📝 Writing quality" value={b.writing_quality} />
              <Bar label="😊 Positive sentiment" value={b.positive_sentiment} />
              <Bar label="📏 Character count contribution" value={b.length_contribution} />
              <Bar label="🚫 Spam penalty" value={b.spam_penalty} />
            </div>

            <div className="rounded-lg border border-gold/30 p-4">
              <p className="font-display text-[10px] tracking-[0.3em] uppercase ink-soft">🤖 AI analysis</p>
              <p className="mt-1 font-script text-xl italic ink">
                AI content probability: {row.ai_probability ?? "—"}%
              </p>
              <span className={`mt-1 inline-block rounded-full border px-2 py-0.5 font-display text-[9px] font-semibold tracking-[0.25em] uppercase ${cls.cls}`}>
                {cls.label}
              </span>
              <ul className="mt-3 list-disc space-y-1 pl-5 font-script text-sm italic ink-soft">
                {(a.ai_indicators ?? []).map((i: string, idx: number) => (
                  <li key={idx}>{i}</li>
                ))}
              </ul>
              <p className="mt-3 font-script text-xs italic ink-soft">
                Advisory only — this estimate never changes the quality score or moderation status.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 font-script text-sm italic ink-soft">
              <p>📏 Characters: {row.note.length}</p>
              <p>🗓 Submitted: {new Date(row.created_at).toLocaleString()}</p>
              <p>✅ Status: {row.status}</p>
              <p>
                🔍 Analysed:{" "}
                {row.analyzed_at ? new Date(row.analyzed_at).toLocaleString() : "—"}
                {a.source === "heuristic" ? " (offline scoring)" : ""}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function HistoryModal({
  id,
  load,
  onClose,
}: {
  id: string;
  load: () => Promise<Version[]>;
  onClose: () => void;
}) {
  const [versions, setVersions] = useState<Version[] | null>(null);
  useEffect(() => {
    let live = true;
    load()
      .then((v) => live && setVersions(v))
      .catch(() => live && setVersions([]));
    return () => {
      live = false;
    };
  }, [id, load]);

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4" role="dialog" aria-modal="true">
      <div className="w-full max-w-2xl rounded-lg border border-gold/40 bg-white p-6 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-script text-2xl italic text-gold-gradient">Version history</h3>
          <button onClick={onClose} className="rounded px-2 py-1 ink-soft hover:bg-gold/5">✕</button>
        </div>
        {versions === null ? (
          <p className="font-script italic ink-soft">Loading…</p>
        ) : versions.length === 0 ? (
          <p className="font-script italic ink-soft">No history yet.</p>
        ) : (
          <ol className="max-h-[60vh] space-y-3 overflow-y-auto pr-1">
            {versions.map((v) => (
              <li key={v.id} className="rounded border border-gold/30 bg-[#FBF8F1]/60 p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full border border-gold/50 px-2 py-0.5 font-display text-[9px] tracking-[0.25em] uppercase text-gold-gradient">
                    v{v.version} • {v.change_type.replace("_", " ")}
                  </span>
                  <StatusBadge status={v.status} />
                  <time className="font-script text-xs italic ink-soft" dateTime={v.created_at}>
                    {new Date(v.created_at).toLocaleString()}
                  </time>
                  <span className="font-script text-xs italic ink-soft">
                    by {v.edited_by_label ?? "—"}
                  </span>
                </div>
                <p className="mt-2 font-display text-[10px] tracking-[0.3em] uppercase ink-soft">
                  {v.name}
                </p>
                <p className="mt-1 whitespace-pre-wrap break-words font-script text-sm italic leading-relaxed ink [overflow-wrap:anywhere]">
                  {v.note}
                </p>
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  );
}