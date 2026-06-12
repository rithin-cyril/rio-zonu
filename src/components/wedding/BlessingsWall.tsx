import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { useServerFn } from "@tanstack/react-start";
import { Ornament } from "./Ornament";
import { getApprovedBlessings } from "@/lib/blessings.functions";

type Blessing = {
  id: string;
  name: string;
  note: string;
  approved_at: string | null;
};

const PAGE_SIZE = 9;

function formatDate(iso: string | null) {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return "";
  }
}

export function BlessingsWall() {
  const fetchApproved = useServerFn(getApprovedBlessings);
  const [items, setItems] = useState<Blessing[]>([]);
  const [loading, setLoading] = useState(true);
  const [visible, setVisible] = useState(PAGE_SIZE);

  useEffect(() => {
    let mounted = true;
    fetchApproved()
      .then((r) => {
        if (mounted) setItems(r.blessings);
      })
      .catch(() => {})
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [fetchApproved]);

  const shown = items.slice(0, visible);
  const hasMore = items.length > visible;

  return (
    <section
      aria-labelledby="blessings-wall-heading"
      className="bg-lux-warm relative overflow-hidden py-14 md:py-20"
    >
      <div className="mx-auto max-w-5xl px-5 sm:px-6">
        <div className="text-center">
          <p className="font-display text-[10px] tracking-[0.45em] text-gold-gradient">
            ✦  WITH LOVE FROM OUR LOVED ONES  ✦
          </p>
          <h2
            id="blessings-wall-heading"
            className="font-script mt-3 text-3xl italic text-gold-gradient md:text-5xl"
          >
            Blessings from Friends &amp; Family
          </h2>
          <p className="mx-auto mt-3 max-w-xl font-script text-base italic ink-soft md:text-lg">
            Your love, prayers, and heartfelt wishes mean the world to us.
          </p>
          <Ornament className="mt-5" />
        </div>

        {loading ? (
          <div
            className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2"
            aria-busy="true"
          >
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="h-44 animate-pulse rounded-lg border border-gold/20 bg-white/70"
              />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="mt-12 flex justify-center">
            <div className="relative w-full max-w-xl rounded-lg border border-gold/40 bg-[#FBF8F1]/95 px-10 py-12 text-center shadow-[0_8px_30px_-12px_rgba(122,111,99,0.25)]">
              <span
                className="font-script absolute left-4 top-2 text-5xl leading-none text-gold-gradient/60"
                aria-hidden
              >
                “
              </span>
              <p className="font-script text-xl italic ink md:text-2xl">
                Be the first to leave a blessing for the couple.
              </p>
              <span
                className="font-script absolute bottom-0 right-4 text-5xl leading-none text-gold-gradient/60"
                aria-hidden
              >
                ”
              </span>
            </div>
          </div>
        ) : (
          <>
            <ul
              role="list"
              className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 md:gap-7"
            >
              {shown.map((b, i) => (
                <motion.li
                  key={b.id}
                  initial={{ opacity: 0, y: 14 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-40px" }}
                  transition={{ duration: 0.5, delay: (i % 2) * 0.05 }}
                  whileHover={{ y: -2 }}
                  className="group relative flex h-full min-w-0 flex-col rounded-lg border border-gold/40 bg-[#FBF8F1]/95 p-7 text-left shadow-[0_6px_24px_-14px_rgba(122,111,99,0.35)] transition-shadow duration-300 hover:shadow-[0_14px_36px_-14px_rgba(184,154,90,0.45)] md:p-8"
                >
                  <span
                    className="font-script pointer-events-none absolute left-4 top-1 text-5xl leading-none text-gold-gradient/40 select-none"
                    aria-hidden
                  >
                    “
                  </span>
                  <p className="relative mt-3 whitespace-pre-wrap break-words hyphens-auto font-script text-lg italic leading-relaxed ink md:text-xl [overflow-wrap:anywhere]">
                    {b.note}
                  </p>
                  <div className="mt-auto pt-5">
                    <div className="mb-3 h-px w-12 bg-[oklch(0.72_0.11_80)]/60" />
                    <p className="font-display text-[11px] font-semibold tracking-[0.38em] text-gold-gradient">
                      — {b.name.toUpperCase()}
                    </p>
                    {b.approved_at && (
                      <time
                        dateTime={b.approved_at}
                        className="mt-1 block font-script text-xs italic ink-soft md:text-sm"
                      >
                        {formatDate(b.approved_at)}
                      </time>
                    )}
                  </div>
                </motion.li>
              ))}
            </ul>

            {hasMore && (
              <div className="mt-8 text-center">
                <button
                  type="button"
                  onClick={() => setVisible((v) => v + PAGE_SIZE)}
                  className="inline-flex min-h-11 items-center rounded border border-gold px-6 py-2.5 font-display text-[11px] font-semibold tracking-[0.4em] text-gold-gradient transition hover:bg-gold/10"
                >
                  LOAD MORE
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
}