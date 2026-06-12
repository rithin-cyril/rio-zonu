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
      <div className="mx-auto max-w-6xl px-5 sm:px-6">
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
            className="mt-10 grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3"
            aria-busy="true"
          >
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="h-40 animate-pulse rounded-md border border-gold/30 bg-white/70"
              />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="mt-10 flex flex-col items-center text-center">
            <div className="rounded-md border border-gold/50 bg-white/90 px-8 py-10 shadow-gold backdrop-blur">
              <span className="font-script text-4xl text-gold-gradient" aria-hidden>
                ✝
              </span>
              <p className="mt-3 font-script text-lg italic ink md:text-xl">
                Be the first to leave a blessing for the couple.
              </p>
            </div>
          </div>
        ) : (
          <>
            <ul
              role="list"
              className="mt-10 grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3"
            >
              {shown.map((b, i) => (
                <motion.li
                  key={b.id}
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-40px" }}
                  transition={{ duration: 0.5, delay: (i % 3) * 0.05 }}
                  whileHover={{ y: -3 }}
                  className="group relative flex h-full flex-col rounded-md border border-gold/50 bg-white/90 p-6 text-left shadow-gold backdrop-blur transition-shadow duration-300 hover:shadow-[0_10px_30px_-12px_oklch(0.72_0.12_75_/_0.55)]"
                >
                  <span
                    className="font-script text-2xl text-gold-gradient"
                    aria-hidden
                  >
                    ✝
                  </span>
                  <p className="mt-2 whitespace-pre-wrap break-words font-script text-base italic leading-relaxed ink md:text-lg">
                    “{b.note}”
                  </p>
                  <div className="mt-4 flex items-baseline justify-between gap-3 border-t border-gold/30 pt-3">
                    <p className="font-display text-[10px] font-semibold tracking-[0.35em] text-gold-gradient">
                      — {b.name.toUpperCase()}
                    </p>
                    {b.approved_at && (
                      <time
                        dateTime={b.approved_at}
                        className="font-display text-[9px] tracking-[0.2em] ink-soft"
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
                  className="inline-block rounded border border-gold px-6 py-2.5 font-display text-[11px] font-semibold tracking-[0.4em] text-gold-gradient transition hover:bg-gold/10"
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