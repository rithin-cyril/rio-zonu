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
          <div className="mt-12 flex flex-col items-center gap-6" aria-busy="true">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="h-28 w-full max-w-2xl animate-pulse rounded-[2px] bg-white/60"
              />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="mt-12 flex flex-col items-center text-center">
            <div className="relative mx-auto max-w-xl px-10 py-12">
              <span
                className="font-script absolute left-2 top-0 text-6xl leading-none text-gold-gradient/70"
                aria-hidden
              >
                “
              </span>
              <p className="font-script text-xl italic ink md:text-2xl">
                Be the first to leave a blessing for the couple.
              </p>
              <span
                className="font-script absolute -bottom-4 right-2 text-6xl leading-none text-gold-gradient/70"
                aria-hidden
              >
                ”
              </span>
              <div className="mx-auto mt-8 h-px w-24 bg-gradient-to-r from-transparent via-[oklch(0.72_0.11_80)]/60 to-transparent" />
            </div>
          </div>
        ) : (
          <>
            <ul
              role="list"
              className="mx-auto mt-14 flex max-w-3xl flex-col gap-12 md:gap-16"
            >
              {shown.map((b, i) => {
                const side = i % 2 === 0 ? "left" : "right";
                return (
                <motion.li
                  key={b.id}
                  initial={{ opacity: 0, y: 18 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-40px" }}
                  transition={{ duration: 0.6, delay: 0.05 }}
                  className={`relative min-w-0 md:w-[88%] ${side === "right" ? "md:ml-auto md:text-right" : "md:mr-auto md:text-left"}`}
                >
                  <span
                    className={`pointer-events-none absolute -top-6 font-script text-[5rem] leading-none text-gold-gradient/40 select-none ${side === "right" ? "right-0" : "left-0"}`}
                    aria-hidden
                  >
                    “
                  </span>
                  <p className="relative whitespace-pre-wrap break-words hyphens-auto px-2 font-script text-lg italic leading-relaxed ink md:text-2xl [overflow-wrap:anywhere]">
                    {b.note}
                  </p>
                  <div
                    className={`mt-5 flex items-baseline gap-4 ${side === "right" ? "justify-end" : "justify-start"}`}
                  >
                    <span className="h-px w-10 bg-[oklch(0.72_0.11_80)]/60" />
                    <p className="font-display text-[11px] font-semibold tracking-[0.4em] text-gold-gradient">
                      {b.name.toUpperCase()}
                    </p>
                  </div>
                  {b.approved_at && (
                    <time
                      dateTime={b.approved_at}
                      className={`mt-1 block font-script text-xs italic ink-soft md:text-sm ${side === "right" ? "text-right" : "text-left"}`}
                    >
                      {formatDate(b.approved_at)}
                    </time>
                  )}
                </motion.li>
              );})}
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