import { useEffect, useState } from "react";
import { motion } from "motion/react";

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
    <section className="bg-ivory-soft relative overflow-hidden py-24">
      <div className="mx-auto max-w-xl px-6 text-center">
        <h2 className="font-script text-3xl italic text-gold-gradient md:text-4xl">
          Counting Every Blessed Moment
        </h2>
        <p className="mx-auto mt-4 max-w-sm font-script text-lg italic leading-relaxed ink-soft">
          Every second brings us closer to forever.
        </p>
        <div className="divider-hairline mt-8" />

        <div className="mt-12 grid grid-cols-4 gap-2 sm:gap-4">
          {parts.map((p, i) => (
            <motion.div
              key={p.label}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.06 }}
              className="flex flex-col items-center"
            >
              <span className="font-script text-4xl text-gold-gradient md:text-5xl">
                {String(p.value).padStart(2, "0")}
              </span>
              <span className="mt-2 font-display text-[10px] tracking-[0.25em] ink-soft">
                {p.label}
              </span>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}