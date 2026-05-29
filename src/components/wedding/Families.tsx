import { motion } from "motion/react";
import { Ornament } from "./Ornament";

const families = [
  {
    side: "PARENTS OF THE GROOM",
    line1: "Mr. (Late) Regin Cyril",
    line2: "& Mrs. Elizabeth Pushpalatha Cyril",
    glyph: "✝",
  },
  {
    side: "PARENTS OF THE BRIDE",
    line1: "Mr. V. Raju",
    line2: "& Mrs. V. Nirmala",
    glyph: "✝",
  },
];

export function Families() {
  return (
    <section className="bg-royal relative overflow-hidden border-y border-gold/30 py-24">
      <div className="mx-auto max-w-4xl px-6 text-center">
        <p className="font-display text-[10px] tracking-[0.45em] text-gold-gradient">
          IN CHRIST’S NAME
        </p>
        <h2 className="font-script mt-4 text-4xl italic text-gold-gradient md:text-5xl">
          With the Blessings of Our Families
        </h2>
        <Ornament className="mt-6" />

        <p className="mx-auto mt-8 max-w-xl font-script italic text-[oklch(0.4_0.04_60)]/80">
          “Every good and perfect gift is from above, coming down from the Father of the
          heavenly lights.” — James 1:17
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
              <p className="font-display text-[9px] tracking-[0.4em] text-[oklch(0.45_0.04_60)]/80">
                {f.side}
              </p>
              <h3 className="font-display text-lg text-[oklch(0.28_0.03_60)] md:text-xl">
                {f.line1}
              </h3>
              <p className="font-script italic text-lg text-[oklch(0.32_0.03_60)]">
                {f.line2}
              </p>
            </motion.div>
          ))}
        </div>

        <p className="font-script mt-16 text-xl italic text-gold-gradient md:text-2xl">
          joyfully invite you to witness the holy matrimony of their beloved children
        </p>

        <div className="mt-10">
          <p className="font-display text-2xl tracking-[0.35em] text-gold-gradient md:text-3xl">
            RITHIN CYRIL &nbsp;&amp;&nbsp; V. HARSHITA
          </p>
          <p className="font-display mt-3 text-[10px] tracking-[0.4em] text-[oklch(0.45_0.04_60)]/80">
            SUNDAY · 18 OCTOBER 2026 · ANANDAPURA, S. COORG
          </p>
        </div>
      </div>
    </section>
  );
}