import { motion } from "motion/react";
import { Ornament } from "./Ornament";

const families = [
  {
    side: "THE GROOM’S FAMILY",
    line1: "Mr. (Late) Regin Cyril",
    line2: "& Mrs. Elizabeth Pushpalatha Cyril",
    glyph: "✝",
  },
  {
    side: "THE BRIDE’S FAMILY",
    line1: "Mr. V. R. Raju",
    line2: "& Mrs. V. Nirmala",
    glyph: "✝",
  },
];

export function Families() {
  return (
    <section className="bg-lux-cream relative overflow-hidden border-y border-[#C9B37E]/40 py-24">
      <div className="mx-auto max-w-4xl px-6 text-center">
        <p className="font-display text-[10px] tracking-[0.45em] text-gold-gradient">
          IN CHRIST’S NAME
        </p>
        <h2 className="font-script mt-4 text-4xl italic text-gold-gradient md:text-5xl">
          With Our Families’ Blessings
        </h2>
        <Ornament className="mt-6" />

        <p className="mx-auto mt-8 max-w-xl font-script text-lg italic ink-soft">
          With love and blessings from those who raised us
        </p>

        <div className="mt-12 grid gap-10 md:grid-cols-2 md:gap-16">
          {families.map((f, i) => (
            <motion.div
              key={f.line1}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.7, delay: i * 0.1 }}
              className="space-y-3"
            >
              <span className="font-script text-2xl text-gold-gradient">{f.glyph}</span>
              <p className="font-display text-[10px] font-semibold tracking-[0.4em] ink-soft">
                {f.side}
              </p>
              <h3 className="font-display text-xl font-semibold ink md:text-2xl">
                {f.line1}
              </h3>
              <p className="font-script text-xl italic ink-soft">
                {f.line2}
              </p>
            </motion.div>
          ))}
        </div>

        <p className="font-script mt-16 text-xl italic text-gold-gradient md:text-2xl">
          joyfully invite you to witness the Holy Matrimony of
        </p>

        <div className="mt-10">
          <p className="font-display text-2xl tracking-[0.35em] text-gold-gradient md:text-3xl">
            RITHIN CYRIL &nbsp;&amp;&nbsp; V. HARSHITA
          </p>
          <p className="font-display mt-3 text-[11px] font-semibold tracking-[0.4em] ink-soft">
            SUNDAY · 18 OCTOBER 2026
          </p>
        </div>
      </div>
    </section>
  );
}