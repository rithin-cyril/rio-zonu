import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useServerFn } from "@tanstack/react-start";
import { X, ChevronLeft, ChevronRight, Play } from "lucide-react";
import { Ornament } from "./Ornament";
import { GalleryUpload } from "./GalleryUpload";
import { getPublicGallery } from "@/lib/gallery.functions";
import { GALLERY_CATEGORIES, type PublicMedia } from "@/lib/gallery-shared";
import { musicBus } from "@/lib/music-bus";

export function Gallery() {
  const load = useServerFn(getPublicGallery);
  const [state, setState] = useState<{ show: boolean; media: PublicMedia[] } | null>(null);
  const [tab, setTab] = useState<string>("all");
  const [active, setActive] = useState<number | null>(null);

  const refresh = useCallback(() => {
    load()
      .then((r) => setState(r as { show: boolean; media: PublicMedia[] }))
      .catch(() => setState({ show: false, media: [] }));
  }, [load]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const tabs = useMemo(() => {
    const present = new Set((state?.media ?? []).map((m) => m.category));
    return [
      { key: "all", label: "All" },
      ...GALLERY_CATEGORIES.filter((c) => present.has(c.key)),
    ];
  }, [state]);

  const items = useMemo(
    () => (state?.media ?? []).filter((m) => tab === "all" || m.category === tab),
    [state, tab],
  );

  if (!state?.show || state.media.length === 0) return null;

  return (
    <section id="gallery" className="lux-section overflow-hidden pb-10 pt-6 md:pb-14 md:pt-8">
      <div className="mx-auto max-w-5xl px-5 text-center sm:px-6">
        <p className="font-display text-[10px] tracking-[0.45em] text-gold-gradient">
          MOMENTS &amp; MEMORIES
        </p>
        <h2 className="font-script mt-2 text-3xl italic tracking-wide text-gold-gradient md:text-5xl">
          OUR GALLERY
        </h2>
        <Ornament className="mt-4" />

        {tabs.length > 1 && (
          <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
            {tabs.map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => setTab(t.key)}
                className={`min-h-11 rounded-full border px-4 py-2 font-display text-[10px] tracking-[0.3em] transition ${
                  tab === t.key
                    ? "border-gold bg-gold/10 text-gold-gradient"
                    : "border-gold/30 ink-soft hover:bg-gold/5"
                }`}
              >
                {t.label.toUpperCase()}
              </button>
            ))}
          </div>
        )}

        <div className="mt-7 grid grid-cols-1 items-start gap-3 sm:grid-cols-2 sm:gap-4 md:grid-cols-3">
          {items.map((m, i) => (
            <motion.button
              key={m.id}
              type="button"
              onClick={() => setActive(i)}
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.55, delay: Math.min(i, 6) * 0.04 }}
              className="lux-card group relative block w-full overflow-hidden rounded-xl"
              aria-label={m.caption || `Open ${m.kind}`}
            >
              <img
                src={m.poster ?? m.url}
                alt={m.caption || "Wedding gallery moment"}
                loading="lazy"
                decoding="async"
                className="block h-auto w-full max-w-full object-contain transition duration-500 group-hover:scale-[1.04]"
              />

              {m.kind === "video" && (
                <span className="pointer-events-none absolute inset-0 grid place-items-center">
                  <span className="grid h-12 w-12 place-items-center rounded-full border border-gold bg-white/80 shadow-gold backdrop-blur">
                    <Play className="h-5 w-5 text-[oklch(0.42_0.1_70)]" strokeWidth={1.6} />
                  </span>
                </span>
              )}
              {m.caption && (
                <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/55 to-transparent px-3 pb-2 pt-6 text-left font-script text-xs italic text-white">
                  {m.caption}
                </span>
              )}
            </motion.button>
          ))}
        </div>

        <GalleryUpload onSubmitted={refresh} />
      </div>

      <Lightbox
        items={items}
        index={active}
        onClose={() => setActive(null)}
        onIndex={setActive}
      />
    </section>
  );
}

function Lightbox({
  items,
  index,
  onClose,
  onIndex,
}: {
  items: PublicMedia[];
  index: number | null;
  onClose: () => void;
  onIndex: (i: number) => void;
}) {
  const item = index === null ? null : items[index];
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    if (!item) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") onIndex((index! + 1) % items.length);
      if (e.key === "ArrowLeft") onIndex((index! - 1 + items.length) % items.length);
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [item, index, items.length, onClose, onIndex]);

  // Background music always yields to a playing video.
  useEffect(() => {
    if (item?.kind === "video") musicBus.pauseForVideo();
    return () => {
      if (item?.kind === "video") musicBus.resumeAfterVideo();
    };
  }, [item]);

  return (
    <AnimatePresence>
      {item && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[80] grid place-items-center bg-black/85 p-3 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          onClick={onClose}
        >
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="absolute right-3 top-3 grid h-11 w-11 place-items-center rounded-full border border-gold/60 bg-white/90"
            style={{ top: "max(0.75rem, env(safe-area-inset-top))" }}
          >
            <X className="h-5 w-5 text-[oklch(0.42_0.1_70)]" />
          </button>

          {items.length > 1 && (
            <>
              <NavBtn
                side="left"
                onClick={(e) => {
                  e.stopPropagation();
                  onIndex((index! - 1 + items.length) % items.length);
                }}
              />
              <NavBtn
                side="right"
                onClick={(e) => {
                  e.stopPropagation();
                  onIndex((index! + 1) % items.length);
                }}
              />
            </>
          )}

          <motion.div
            key={item.id}
            initial={{ scale: 0.96, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="max-h-[86dvh] w-full max-w-4xl"
            onClick={(e) => e.stopPropagation()}
          >
            {item.kind === "photo" ? (
              <img
                src={item.url}
                alt={item.caption || "Wedding gallery moment"}
                className="mx-auto max-h-[78dvh] w-auto max-w-full rounded-xl object-contain"
              />
            ) : (
              <video
                ref={videoRef}
                src={item.url}
                poster={item.poster ?? undefined}
                controls
                autoPlay
                playsInline
                controlsList="nodownload"
                onContextMenu={(e) => e.preventDefault()}
                onPlay={() => musicBus.pauseForVideo()}
                onPause={() => musicBus.resumeAfterVideo()}
                onEnded={() => musicBus.resumeAfterVideo()}
                className="mx-auto max-h-[78dvh] w-full rounded-xl bg-black"
              />
            )}
            {item.caption && (
              <p className="mt-3 text-center font-script text-base italic text-white/90">
                {item.caption}
              </p>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function NavBtn({
  side,
  onClick,
}: {
  side: "left" | "right";
  onClick: (e: React.MouseEvent) => void;
}) {
  const Icon = side === "left" ? ChevronLeft : ChevronRight;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={side === "left" ? "Previous" : "Next"}
      className={`absolute top-1/2 z-10 grid h-12 w-12 -translate-y-1/2 place-items-center rounded-full border border-gold/60 bg-white/85 ${
        side === "left" ? "left-2" : "right-2"
      }`}
    >
      <Icon className="h-6 w-6 text-[oklch(0.42_0.1_70)]" />
    </button>
  );
}
