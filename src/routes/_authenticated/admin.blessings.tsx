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

  const [rows, setRows] = useState<Row[]>([]);
  const [filter, setFilter] = useState<Filter>("all");
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [savingOrder, setSavingOrder] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [historyId, setHistoryId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const r = await list();
      setRows(r.blessings as any);
      setDirty(false);
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [list]);

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
      toast.success("Order saved");
      await refresh();
    } catch (e: any) {
      toast.error(e?.message ?? "Could not save order");
    } finally {
      setSavingOrder(false);
    }
  }

  const editingRow = useMemo(() => rows.find((r) => r.id === editingId) ?? null, [rows, editingId]);

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

      <p className="font-script text-xs italic ink-soft">
        Drag the handle (⋮⋮) to reorder. The order applies to the public website
        after you save. Filtering hides cards but keeps the underlying order.
      </p>

      {loading ? (
        <p className="font-script italic ink-soft">Loading…</p>
      ) : rows.length === 0 ? (
        <p className="rounded-lg border border-gold/30 bg-white/80 p-6 text-center font-script italic ink-soft">
          No blessings yet.
        </p>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={rows.map((r) => r.id)} strategy={verticalListSortingStrategy}>
            <ul className="grid grid-cols-1 gap-4">
              {rows.map((b, position) => {
                const hidden = filter !== "all" && b.status !== filter;
                if (hidden) return null;
                return (
                  <SortableCard
                    key={b.id}
                    row={b}
                    position={position + 1}
                    total={rows.length}
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
    </div>
  );
}

function SortableCard({
  row,
  position,
  total,
  pending,
  onApprove,
  onHide,
  onDelete,
  onEdit,
  onHistory,
  onMove,
}: {
  row: Row;
  position: number;
  total: number;
  pending: boolean;
  onApprove: () => void;
  onHide: () => void;
  onDelete: () => void;
  onEdit: () => void;
  onHistory: () => void;
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
          aria-label="Drag to reorder"
          className="mt-1 cursor-grab select-none rounded border border-gold/30 px-2 py-1 font-mono text-xs ink-soft hover:bg-gold/5 active:cursor-grabbing"
        >
          ⋮⋮
        </button>
        <div className="flex h-7 min-w-9 items-center justify-center rounded-full border border-gold/50 px-2 font-display text-[10px] font-semibold text-gold-gradient">
          #{position}
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
          <MoveBtn label="⤒ Top" disabled={position === 1} onClick={() => onMove("top")} />
          <MoveBtn label="↑ Up" disabled={position === 1} onClick={() => onMove("up")} />
          <MoveBtn label="↓ Down" disabled={position === total} onClick={() => onMove("down")} />
          <MoveBtn label="⤓ Bottom" disabled={position === total} onClick={() => onMove("bottom")} />
        </div>
        <div className="ml-auto flex flex-wrap gap-2">
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
            move buttons. Position #{row.sort_order ?? "—"} currently.
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