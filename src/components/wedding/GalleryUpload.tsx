import { useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { guestCreateUpload, guestFinalizeUpload } from "@/lib/gallery.functions";
import { GALLERY_CATEGORIES } from "@/lib/gallery-shared";
import { optimizeMedia, guessKind } from "@/lib/media-optimize";

const MAX_PHOTO = 25 * 1024 * 1024;
const MAX_VIDEO = 200 * 1024 * 1024;

export function GalleryUpload({ onSubmitted }: { onSubmitted: () => void }) {
  const create = useServerFn(guestCreateUpload);
  const finalize = useServerFn(guestFinalizeUpload);
  const fileRef = useRef<HTMLInputElement | null>(null);

  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [category, setCategory] = useState<string>("wedding");
  const [caption, setCaption] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    if (!name.trim()) return toast.error("Please add your name.");
    if (!file) return toast.error("Please choose a photo or video.");

    const kind = guessKind(file);
    if (!kind) return toast.error("Only photos and videos can be shared.");
    if (kind === "photo" && file.size > MAX_PHOTO) return toast.error("Photos must be under 25 MB.");
    if (kind === "video" && file.size > MAX_VIDEO) return toast.error("Videos must be under 200 MB.");

    try {
      setBusy("Preparing your memory…");
      const opt = await optimizeMedia(file, kind);

      setBusy("Uploading…");
      const ext = (file.name.split(".").pop() ?? "bin").toLowerCase().replace(/[^a-z0-9]/g, "");
      const slots = await create({
        data: { name: name.trim(), kind, category, caption: caption.trim(), ext: ext || "bin" },
      });

      const put = async (slot: { path: string; token: string }, blob: Blob | null) => {
        if (!blob) return;
        const { error } = await supabase.storage
          .from(slots.bucket)
          .uploadToSignedUrl(slot.path, slot.token, blob);
        if (error) throw new Error(error.message);
      };

      await Promise.all([
        put(slots.original, file),
        put(slots.public, opt.main),
        put(slots.poster, opt.poster),
      ]);

      setBusy("Finishing up…");
      await finalize({
        data: {
          id: slots.id,
          width: opt.width,
          height: opt.height,
          duration: opt.duration,
        },
      });

      toast.success("Thank you! Your memory has been sent for approval.");
      setName("");
      setCaption("");
      setFile(null);
      if (fileRef.current) fileRef.current.value = "";
      setOpen(false);
      onSubmitted();
    } catch (err: any) {
      toast.error(err?.message ?? "Upload failed. Please try again.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="mt-9">
      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex min-h-11 items-center rounded-full border border-gold/60 px-6 py-3 font-display text-[10px] tracking-[0.3em] text-gold-gradient transition hover:bg-gold/10"
        >
          ✦ SHARE YOUR MEMORY ✦
        </button>
      ) : (
        <form
          onSubmit={onSubmit}
          className="lux-card mx-auto max-w-xl rounded-xl p-5 text-left sm:p-6"
        >
          <p className="font-script text-lg italic text-gold-gradient">Share a memory with us</p>
          <p className="mt-1 text-xs ink-soft">
            Photos and videos are reviewed by the couple before they appear here.
          </p>

          <label className="mt-4 block font-display text-[10px] tracking-[0.3em] ink-soft">
            YOUR NAME
          </label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={80}
            autoComplete="name"
            enterKeyHint="next"
            className="mt-1 min-h-11 w-full rounded-md border border-gold/40 bg-white/70 px-3 py-2 text-base outline-none focus:border-gold"
          />

          <label className="mt-4 block font-display text-[10px] tracking-[0.3em] ink-soft">
            MOMENT
          </label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="mt-1 min-h-11 w-full rounded-md border border-gold/40 bg-white/70 px-3 py-2 text-base outline-none focus:border-gold"
          >
            {GALLERY_CATEGORIES.map((c) => (
              <option key={c.key} value={c.key}>
                {c.label}
              </option>
            ))}
          </select>

          <label className="mt-4 block font-display text-[10px] tracking-[0.3em] ink-soft">
            CAPTION (OPTIONAL)
          </label>
          <input
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            maxLength={240}
            className="mt-1 min-h-11 w-full rounded-md border border-gold/40 bg-white/70 px-3 py-2 text-base outline-none focus:border-gold"
          />

          <label className="mt-4 block font-display text-[10px] tracking-[0.3em] ink-soft">
            PHOTO OR VIDEO
          </label>
          <input
            ref={fileRef}
            type="file"
            accept="image/*,video/*"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="mt-1 w-full text-sm file:mr-3 file:min-h-11 file:rounded-full file:border file:border-gold/50 file:bg-white file:px-4 file:py-2 file:font-display file:text-[10px] file:tracking-[0.3em]"
          />

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <button
              type="submit"
              disabled={!!busy}
              className="inline-flex min-h-11 items-center rounded-full border border-gold px-6 py-3 font-display text-[10px] tracking-[0.3em] text-gold-gradient transition hover:bg-gold/10 disabled:opacity-60"
            >
              {busy ? busy.toUpperCase() : "SEND MEMORY"}
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              disabled={!!busy}
              className="min-h-11 px-2 font-display text-[10px] tracking-[0.3em] ink-soft"
            >
              CANCEL
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
