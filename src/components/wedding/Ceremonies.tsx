import { motion } from "motion/react";
import { Ornament } from "./Ornament";

const events = [
  {
    n: "01",
    title: "Holy Matrimony",
    date: "Sunday, October 18th, 2026",
    time: "10:30 AM",
    venue: "CSI Kanthi Church",
    address: "Anandapura, South Coorg, Karnataka",
    map: "https://maps.app.goo.gl/TWTM3PtCATfNpP7PA",
  },
  {
    n: "02",
    title: "Wedding Reception",
    date: "Sunday, October 18th, 2026",
    time: "12:00 Noon onwards",
    venue: "Church Hall",
    address: "Siddapura, South Coorg, Karnataka",
    map: "https://maps.app.goo.gl/MQvLuRsfRmm8VZ8y8",
  },
];

export function Ceremonies() {
  return (
    <section className="bg-lux-glass relative overflow-hidden py-10 md:py-14">
      <div className="mx-auto max-w-3xl px-5 text-center sm:px-6">
        <p className="font-display text-[10px] tracking-[0.45em] text-gold-gradient">
          ORDER OF CELEBRATION
        </p>
        <h2 className="font-script mt-2 text-3xl italic tracking-wide text-gold-gradient md:text-5xl">
          THE BLESSED DAY
        </h2>
        <Ornament className="mt-4" />

        <div className="relative mt-8 md:mt-10">
          <div className="absolute left-1/2 top-2 bottom-2 w-px -translate-x-1/2 bg-gradient-to-b from-transparent via-gold/50 to-transparent" />

          <div className="space-y-6 md:space-y-8">
            {events.map((e, i) => (
              <motion.div
                key={e.n}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-80px" }}
                transition={{ duration: 0.7 }}
                className="relative"
              >
                <span className="absolute left-1/2 top-0 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border border-gold bg-white shadow-gold" />

                <div
                  className={`mx-auto max-w-md rounded border border-gold/40 bg-white/80 px-5 py-4 sm:px-6 sm:py-5 text-left backdrop-blur md:max-w-sm ${
                    i % 2 === 0 ? "md:mr-auto md:ml-0" : "md:ml-auto md:mr-0"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-display text-[10px] font-semibold tracking-[0.4em] ink-soft">
                      EVENT
                    </span>
                    <span className="font-display text-[11px] tracking-[0.35em] text-gold-gradient">
                      {e.n}
                    </span>
                  </div>
                  <h3 className="font-script mt-2 text-[26px] sm:text-[28px] italic leading-tight text-gold-gradient">
                    {e.title}
                  </h3>

                  <div className="font-script mt-3 space-y-1 border-t border-gold/40 pt-3 text-[16px] leading-snug ink">
                    <p>📅 {e.date}</p>
                    <p className="font-semibold text-gold-gradient">🕒 {e.time}</p>
                    <p className="pt-0.5 font-semibold ink">📍 {e.venue}</p>
                    <p className="text-[14px] italic ink-soft">{e.address}</p>
                  </div>

                  <a
                    href={e.map}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-3 inline-flex min-h-10 items-center rounded border border-gold/60 px-5 py-2.5 font-display text-[10px] tracking-[0.4em] text-gold-gradient transition hover:bg-gold/10 md:min-h-0 md:px-4 md:py-1.5"
                  >
                    OPEN IN MAPS
                  </a>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}