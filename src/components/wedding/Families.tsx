import { motion } from "motion/react";
import { Ornament } from "./Ornament";

const families = [
  {
    side: "THE GROOM’S FAMILY",
    line1: "Mr. (Late) Regin Cyril",
    line2: "Mrs. Elizabeth Pushpalatha Cyril",
    glyph: "✝",
  },
  {
    side: "THE BRIDE’S FAMILY",
    line1: "Mr. V. R. Raju",
    line2: "Mrs. V. Nirmala",
    glyph: "✝",
  },
];

export function Families() {
  return (
    <section className="lux-section overflow-hidden py-11 md:py-16">
      <div className="mx-auto max-w-4xl px-5 text-center sm:px-6">
        <p className="font-display text-[10px] tracking-[0.45em] text-gold-gradient">
          IN CHRIST’S NAME
        </p>
        <h2 className="font-script mt-3 text-3xl italic text-gold-gradient md:text-5xl">
          With Our Families’ Blessings
        </h2>
        <Ornament className="mt-5" />

        <p className="mx-auto mt-5 max-w-xl font-script text-base italic ink-soft md:text-lg">
          With love and blessings from those who raised us
        </p>

        <div className="mt-8 grid gap-8 md:mt-10 md:grid-cols-2 md:gap-16">
          {families.map((f, i) => (
            <motion.div
              key={f.line1}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.7, delay: i * 0.1 }}
              className="space-y-2.5"
            >
              <span className="font-script text-2xl text-gold-gradient">{f.glyph}</span>
              <p className="font-display text-[10px] font-semibold tracking-[0.4em] ink-soft">
                {f.side}
              </p>
              <div className="space-y-1">
                <h3 className="font-display text-base font-semibold tracking-[0.15em] ink md:text-xl">
                  {f.line1}
                </h3>
                <p className="font-display text-[13px] font-medium tracking-[0.12em] ink md:text-[15px]">
                  {f.line2}
                </p>
              </div>
            </motion.div>
          ))}
        </div>

        <p className="font-script mt-10 text-lg italic text-gold-gradient md:mt-12 md:text-2xl">
          joyfully invite you to witness the Holy Matrimony of
        </p>

        <div className="mx-auto mt-6 flex w-full max-w-[90%] flex-col items-center gap-3 md:mt-8">
          <div className="flex flex-col items-center gap-1 sm:flex-row sm:items-center sm:justify-center sm:gap-3">
            <span className="font-display whitespace-nowrap text-[clamp(2rem,5vw,4rem)] leading-none tracking-[0.05em] text-gold-gradient sm:tracking-[0.12em]">
              RITHIN CYRIL
            </span>
            <span className="font-display text-[clamp(1.25rem,3vw,2rem)] leading-none tracking-[0.1em] text-gold-gradient">
              &
            </span>
            <span className="font-display whitespace-nowrap text-[clamp(2rem,5vw,4rem)] leading-none tracking-[0.05em] text-gold-gradient sm:tracking-[0.12em]">
              V. HARSHITA
            </span>
          </div>

          <Ornament className="mt-1" />

          <p className="font-display text-[10px] font-semibold tracking-[0.25em] ink-soft sm:tracking-[0.4em] md:text-[11px]">
            <span className="sm:hidden">
              SUNDAY
              <br />
              18 OCTOBER 2026
            </span>
            <span className="hidden sm:inline">SUNDAY · 18 OCTOBER 2026</span>
          </p>
        </div>
      </div>
    </section>
  );
}