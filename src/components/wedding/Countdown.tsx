import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { Ornament } from "./Ornament";

const TARGET = new Date("2026-10-18T09:00:00+05:30").getTime();

function useCountdown() {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    let id: ReturnType<typeof setInterval> | null = null;
    const start = () => {
      if (id !== null) return;
      id = setInterval(() => setNow(Date.now()), 1000);
    };
    const stop = () => {
      if (id !== null) {
        clearInterval(id);
        id = null;
      }
    };
    const onVisibility = () => {
      if (document.hidden) stop();
      else {
        setNow(Date.now());
        start();
      }
    };
    start();
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      stop();
      document.removeEventListener("visibilitychange", onVisibility);
    };
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
    <section className="bg-lux-champagne relative overflow-hidden py-14 md:py-20">
      <div className="mx-auto max-w-4xl px-5 text-center sm:px-6">
        <p className="font-display text-[10px] tracking-[0.45em] text-gold-gradient">
          IN HIS PERFECT TIME
        </p>
        <h2 className="font-script mt-3 text-3xl italic text-gold-gradient md:text-5xl">
          Counting Every Blessed Moment
        </h2>
        <p className="mx-auto mt-3 max-w-xl font-script text-base italic ink-soft md:text-lg">
          Every second brings us closer to the day we say “I do” and begin our forever together.
        </p>

        <Ornament className="mt-6 md:mt-8" />

        <div className="mt-7 grid grid-cols-4 gap-2 sm:gap-4 md:mt-10 md:gap-8">
          {parts.map((p, i) => (
            <motion.div
              key={p.label}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: i * 0.1 }}
              className="flex min-w-0 flex-col items-center"
            >
              <div className="relative aspect-square w-full max-w-[88px] sm:max-w-[110px] md:max-w-[120px]">
                <div className="absolute inset-0 rounded-full border-2 border-gold shadow-gold bg-white/85 backdrop-blur" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="font-display text-2xl font-semibold text-gold-gradient sm:text-3xl md:text-4xl">
                    {String(p.value).padStart(2, "0")}
                  </span>
                </div>
              </div>
              <span className="font-display mt-2 text-[9px] font-semibold tracking-[0.35em] ink-soft md:mt-3 md:text-[10px]">
                {p.label}
              </span>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}