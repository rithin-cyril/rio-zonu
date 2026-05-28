import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { Ornament } from "./Ornament";

const TARGET = new Date("2026-12-12T07:00:00+05:30").getTime();

function useCountdown() {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  const diff = Math.max(0, TARGET - now);
  const d = Math.floor(diff / 86400000);
  const h = Math.floor((diff / 3600000) % 24);
  const m = Math.floor((diff / 60000) % 60);
  const s = Math.floor((diff / 1000) % 60);
  return [
    { label: "DAYS", value: d },
    { label: "HOURS", value: h },
    { label: "MINUTES", value: m },
    { label: "SECONDS", value: s },
  ];
}

export function Countdown() {
  const [revealed, setRevealed] = useState<boolean[]>([false, false, false, false]);
  const parts = useCountdown();

  return (
    <section className="bg-emerald-royal relative overflow-hidden py-24 md:py-32">
      <div className="mx-auto max-w-4xl px-6 text-center">
        <p className="font-display text-[10px] tracking-[0.45em] text-gold-gradient">
          SHUBHA MUHURTAM
        </p>
        <h2 className="font-script mt-4 text-4xl italic text-gold-gradient md:text-5xl">
          The Auspicious Countdown
        </h2>
        <p className="mx-auto mt-4 max-w-xl font-script italic text-[oklch(0.88_0.05_90)]/80">
          Under the divine canopy of stars, we count down the moments leading to a beautiful
          lifetime together.
        </p>

        <Ornament className="mt-10" />
        <p className="font-display mt-6 text-[10px] tracking-[0.35em] text-[oklch(0.78_0.1_80)]/80">
          ✦  GENTLY TAP THE GOLDEN SEALS TO REVEAL THE TIME
        </p>

        <div className="mt-10 grid grid-cols-4 gap-4 md:gap-8">
          {parts.map((p, i) => (
            <button
              key={p.label}
              onClick={() =>
                setRevealed((r) => r.map((v, idx) => (idx === i ? true : v)))
              }
              className="group flex flex-col items-center"
            >
              <div className="relative aspect-square w-full max-w-[120px]">
                <div className="absolute inset-0 rounded-full border-2 border-gold shadow-gold" />
                <motion.div
                  initial={false}
                  animate={{ opacity: revealed[i] ? 0 : 1, scale: revealed[i] ? 0.6 : 1 }}
                  transition={{ duration: 0.6 }}
                  className="absolute inset-1 rounded-full bg-[radial-gradient(circle_at_30%_30%,#fde08a,#caa24a_55%,#7a5a1c)] shadow-inner"
                >
                  <span className="absolute inset-0 flex items-center justify-center font-script text-2xl italic text-[oklch(0.35_0.12_60)]/60">
                    ✦
                  </span>
                </motion.div>
                <motion.div
                  initial={false}
                  animate={{ opacity: revealed[i] ? 1 : 0 }}
                  transition={{ duration: 0.6 }}
                  className="absolute inset-0 flex flex-col items-center justify-center"
                >
                  <span className="font-display text-2xl text-gold-gradient md:text-4xl">
                    {String(p.value).padStart(2, "0")}
                  </span>
                </motion.div>
              </div>
              <span className="font-display mt-3 text-[9px] tracking-[0.35em] text-[oklch(0.78_0.1_80)]/80">
                {p.label}
              </span>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}