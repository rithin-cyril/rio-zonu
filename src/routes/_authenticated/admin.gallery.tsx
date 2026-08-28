import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  adminGalleryList,
  adminSetGalleryVisible,
  adminGalleryCreateUpload,
  adminGalleryFinalizeUpload,
  adminGalleryUpdate,
  adminGalleryReview,
  adminGalleryDelete,
  adminGalleryReorder,
} from "@/lib/gallery-admin.functions";
import { GALLERY_CATEGORIES, categoryLabel, formatBytes } from "@/lib/gallery-shared";
import { optimizeMedia, guessKind } from "@/lib/media-optimize";

export const Route = createFileRoute("/_authenticated/admin/gallery")({
  component: AdminGallery,
});

type Item = Awaited<ReturnType<typeof adminGalleryList>>["items"][number];

function AdminGallery() {
  const list = useServerFn(adminGalleryList);
  const setVisible = useServerFn(adminSetGalleryVisible);
  const createUpload = useServerFn(adminGalleryCreateUpload);
  const finalizeUpload = useServerFn(adminGalleryFinalizeUpload);
  const update = useServerFn(adminGalleryUpdate);
  const review = useServerFn(adminGalleryReview);
  const remove = useServerFn(adminGalleryDelete);
  const reorder = useServerFn(adminGalleryReorder);

  const [data, setData] = useState<Awaited<ReturnType<typeof adminGalleryList>> | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [category, setCategory] = useState<string>("wedding");
  const fileRef = useRef<HTMLInputElement | null>(null);

  const refresh = useCallback(() => {
    list()
      .then((d) => {
        setData(d);
        setErr(null);
      })
      .catch((e: any) => setErr(e?.message ?? "Could not load the gallery."));
  }, [list]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  if (err) return <p className="font-script italic ink-soft">{err}</p>;
  if (!data) return <p className="font-script italic ink-soft">Loading gallery…</p>;

  const pending = data.items.filter((i) => i.approvalStatus === "pending");
  const rejected = data.items.filter((i) => i.approvalStatus === "rejected");
  const library = data.items.filter((i) => i.approvalStatus === "approved");

  async function onUpload(files: FileList | null) {
    if (!files?.length) return;
    for (const file of Array.from(files)) {
      const kind = guessKind(file);
      if (!kind) {
        toast.error(`${file.name}: not a photo or video`);
        continue;
      }
      try {
        setBusy(`Optimising ${file.name}…`);
        const opt = await optimizeMedia(file, kind);
        const ext = (file.name.split(".").pop() ?? "bin").toLowerCase().replace(/[^a-z0-9]/g, "");
        setBusy(`Uploading ${file.name}…`);
        const slots = await createUpload({
          data: { kind, category, ext: ext || "bin" },
        });
        const put = async (slot: { bucket: string; path: string; token: string }, blob: Blob | null) => {
          if (!blob) return;
          const { error } = await supabase.storage
            .from(slot.bucket)
            .uploadToSignedUrl(slot.path, slot.token, blob);
          if (error) throw new Error(error.message);
        };
        await put(slots.original, file);
        await put(slots.public, opt.main);
        await put(slots.poster, opt.poster);
        await finalizeUpload({
          data: {
            id: slots.id,
            width: opt.width,
            height: opt.height,
            duration: opt.duration,
            publish: true,
          },
        });
        toast.success(`${file.name} added to the gallery`);
      } catch (e: any) {
        toast.error(e?.message ?? `Could not upload ${file.name}`);
      }
    }
    setBusy(null);
    if (fileRef.current) fileRef.current.value = "";
    refresh();
  }

  async function act(fn: () => Promise<unknown>, ok: string) {
    try {
      await fn();
      toast.success(ok);
      refresh();
    } catch (e: any) {
      toast.error(e?.message ?? "Action failed");
    }
  }

  async function move(item: Item, dir: -1 | 1) {
    const ids = library.map((i) => i.id);
    const idx = ids.indexOf(item.id);
    const to = idx + dir;
    if (idx < 0 || to < 0 || to >= ids.length) return;
    [ids[idx], ids[to]] = [ids[to]!, ids[idx]!];
    setData({ ...data!, items: ids.map((id) => library.find((i) => i.id === id)!).concat(pending, rejected) });
    await act(() => reorder({ data: { ids } }), "Order updated");
  }

  return (
    <div className="space-y-8">
      <section className="lux-card rounded-xl p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-script text-xl italic text-gold-gradient">Photo &amp; Video Gallery</h2>
            <p className="mt-1 text-xs ink-soft">
              {library.length} in library · {pending.length} awaiting review ·{" "}
              {formatBytes(data.storageBytes)} stored
            </p>
          </div>
          <button
            onClick={() =>
              act(
                () => setVisible({ data: { show: !data.galleryVisible } }),
                data.galleryVisible ? "Gallery hidden from website" : "Gallery is now live",
              )
            }
            className={`min-h-11 rounded-full border px-5 py-2 font-display text-[10px] tracking-[0.3em] transition ${
              data.galleryVisible
                ? "border-gold bg-gold/10 text-gold-gradient"
                : "border-gold/40 ink-soft hover:bg-gold/5"
            }`}
          >
            {data.galleryVisible ? "✦ VISIBLE ON WEBSITE" : "HIDDEN FROM WEBSITE"}
          </button>
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-gold/20 pt-4">
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="min-h-11 rounded-md border border-gold/40 bg-white/70 px-3 py-2 text-sm"
          >
            {GALLERY_CATEGORIES.map((c) => (
              <option key={c.key} value={c.key}>
                {c.label}
              </option>
            ))}
          </select>
          <input
            ref={fileRef}
            type="file"
            multiple
            accept="image/*,video/*"
            disabled={!!busy}
            onChange={(e) => onUpload(e.target.files)}
            className="text-sm file:mr-3 file:min-h-11 file:rounded-full file:border file:border-gold/50 file:bg-white file:px-4 file:py-2 file:font-display file:text-[10px] file:tracking-[0.3em]"
          />
          {busy && <span className="font-script text-sm italic ink-soft">{busy}</span>}
        </div>
      </section>

      {pending.length > 0 && (
        <section>
          <h3 className="font-display text-[10px] tracking-[0.4em] text-gold-gradient">
            GUEST SUBMISSIONS AWAITING APPROVAL
          </h3>
          <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {pending.map((item) => (
              <Card key={item.id} item={item}>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Btn onClick={() => act(() => review({ data: { id: item.id, decision: "approve" } }), "Approved and published")}>
                    ➕ APPROVE
                  </Btn>
                  <Btn
                    onClick={() => {
                      const reason = window.prompt("Reason (optional)") ?? undefined;
                      act(() => review({ data: { id: item.id, decision: "reject", reason } }), "Rejected");
                    }}
                  >
                    ➖ REJECT
                  </Btn>
                </div>
              </Card>
            ))}
          </div>
        </section>
      )}

      <section>
        <h3 className="font-display text-[10px] tracking-[0.4em] text-gold-gradient">LIBRARY</h3>
        {library.length === 0 ? (
          <p className="mt-3 font-script italic ink-soft">No media yet — upload the first memory above.</p>
        ) : (
          <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {library.map((item, i) => (
              <Card key={item.id} item={item}>
                <div className="mt-3 space-y-2">
                  <input
                    defaultValue={item.caption}
                    placeholder="Caption"
                    onBlur={(e) =>
                      e.target.value !== item.caption &&
                      act(() => update({ data: { id: item.id, caption: e.target.value } }), "Caption saved")
                    }
                    className="min-h-10 w-full rounded-md border border-gold/40 bg-white/70 px-2 py-1.5 text-sm"
                  />
                  <select
                    defaultValue={item.category}
                    onChange={(e) =>
                      act(() => update({ data: { id: item.id, category: e.target.value } }), "Category updated")
                    }
                    className="min-h-10 w-full rounded-md border border-gold/40 bg-white/70 px-2 py-1.5 text-sm"
                  >
                    {GALLERY_CATEGORIES.map((c) => (
                      <option key={c.key} value={c.key}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                  <div className="flex flex-wrap gap-2">
                    <Btn
                      onClick={() =>
                        act(
                          () => update({ data: { id: item.id, published: !item.published } }),
                          item.published ? "Hidden" : "Shown",
                        )
                      }
                    >
                      {item.published ? "➖ HIDE" : "➕ SHOW"}
                    </Btn>
                    <Btn onClick={() => move(item, -1)} disabled={i === 0}>↑</Btn>
                    <Btn onClick={() => move(item, 1)} disabled={i === library.length - 1}>↓</Btn>
                    <Btn
                      onClick={() => {
                        if (!window.confirm("Delete this media permanently?")) return;
                        act(() => remove({ data: { id: item.id } }), "Deleted");
                      }}
                    >
                      🗑 DELETE
                    </Btn>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>

      {rejected.length > 0 && (
        <section>
          <h3 className="font-display text-[10px] tracking-[0.4em] text-gold-gradient">REJECTED</h3>
          <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {rejected.map((item) => (
              <Card key={item.id} item={item}>
                <div className="mt-3">
                  <Btn
                    onClick={() => {
                      if (!window.confirm("Delete this submission permanently?")) return;
                      act(() => remove({ data: { id: item.id } }), "Deleted");
                    }}
                  >
                    🗑 DELETE
                  </Btn>
                </div>
              </Card>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function Card({ item, children }: { item: Item; children?: React.ReactNode }) {
  return (
    <div className="lux-card rounded-xl p-3">
      <div className="overflow-hidden rounded-lg bg-black/5">
        {item.poster || item.url ? (
          item.kind === "video" && !item.poster ? (
            <video src={item.url ?? undefined} controls className="max-h-[60vh] w-full object-contain" />
          ) : (
            <img
              src={(item.poster ?? item.url)!}
              alt={item.caption || "Gallery media"}
              loading="lazy"
              className="block h-auto max-h-[60vh] w-full max-w-full object-contain"
            />
          )

        ) : (
          <div className="grid aspect-[4/3] place-items-center text-xs ink-soft">
            {item.status === "failed" ? "Upload failed" : "Processing…"}
          </div>
        )}
      </div>
      <p className="mt-2 text-[11px] ink-soft">
        {item.kind === "video" ? "🎬 Video" : "📷 Photo"} · {categoryLabel(item.category)} ·{" "}
        {formatBytes(item.bytes)}
        {item.source === "guest" && ` · from ${item.submitterName ?? "Guest"}`}
        {!item.published && item.approvalStatus === "approved" && " · hidden"}
      </p>
      {children}
    </div>
  );
}

function Btn({
  children,
  onClick,
  disabled,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="min-h-10 rounded-md border border-gold/50 px-3 py-1.5 font-display text-[10px] tracking-[0.25em] text-gold-gradient transition hover:bg-gold/10 disabled:opacity-40"
    >
      {children}
    </button>
  );
}
