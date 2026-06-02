import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { Ornament } from "./Ornament";

const TARGET = new Date("2026-10-18T09:00:00+05:30").getTime();

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
  const parts = useCountdown();

  return (
    <section className="bg-sage-veil relative overflow-hidden py-24 md:py-32">
      <div className="mx-auto max-w-4xl px-6 text-center">
        <p className="font-display text-[10px] tracking-[0.45em] text-gold-gradient">
          IN HIS PERFECT TIME
        </p>
        <h2 className="font-script mt-4 text-4xl italic text-gold-gradient md:text-5xl">
          Counting Every Blessed Moment
        </h2>
        <p className="mx-auto mt-4 max-w-xl font-script text-lg italic ink-soft">
          Every second brings us closer to the day we say “I do” and begin our forever together.
        </p>

        <Ornament className="mt-10" />

        <div className="mt-10 grid grid-cols-4 gap-4 md:gap-8">
          {parts.map((p, i) => (
            <motion.div
              key={p.label}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: i * 0.1 }}
              className="flex flex-col items-center"
            >
              <div className="relative aspect-square w-full max-w-[120px]">
                <div className="absolute inset-0 rounded-full border-2 border-gold shadow-gold bg-white/85 backdrop-blur" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="font-display text-3xl font-semibold text-gold-gradient md:text-4xl">
                    {String(p.value).padStart(2, "0")}
                  </span>
                </div>
              </div>
              <span className="font-display mt-3 text-[10px] font-semibold tracking-[0.35em] ink-soft">
                {p.label}
              </span>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}