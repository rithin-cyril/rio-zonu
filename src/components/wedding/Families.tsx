import { motion } from "motion/react";
import { Ornament } from "./Ornament";

const families = [
  {
    side: "PARENTS OF THE GROOM",
    name: "Mr. & Mrs. Rajendran",
    note: "Tracing ancestral roots from Tanjavur, uniting two grand families with timeless tradition.",
    glyph: "ॐ",
  },
  {
    side: "PARENTS OF THE BRIDE",
    name: "Mr. & Mrs. Suresh Kumar",
    note: "Tracing ancestral roots from Madurai, offering their cherished daughter under pure love and divine warmth.",
    glyph: "卐",
  },
];

export function Families() {
  return (
    <section className="bg-emerald-royal relative overflow-hidden border-y border-gold/30 py-24">
      <div className="mx-auto max-w-4xl px-6 text-center">
        <p className="font-display text-[10px] tracking-[0.45em] text-gold-gradient">
          MANGALA SHUBH
        </p>
        <h2 className="font-script mt-4 text-4xl italic text-gold-gradient md:text-5xl">
          Family &amp; Blessings
        </h2>
        <Ornament className="mt-6" />

        <p className="font-display mt-10 text-[10px] tracking-[0.35em] text-[oklch(0.82_0.1_85)]/80">
          ✦  WITH THE DIVINE BLESSINGS OF OUR ANCESTORS  ✦
        </p>

        <div className="mt-12 grid gap-10 md:grid-cols-2 md:gap-16">
          {families.map((f, i) => (
            <motion.div
              key={f.name}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.7, delay: i * 0.1 }}
              className="space-y-3"
            >
              <span className="font-script text-2xl text-gold-gradient">{f.glyph}</span>
              <h3 className="font-display text-xl text-[oklch(0.95_0.04_85)] md:text-2xl">
                {f.name}
              </h3>
              <p className="font-display text-[9px] tracking-[0.4em] text-[oklch(0.78_0.1_80)]">
                {f.side}
              </p>
              <p className="mx-auto max-w-xs font-script italic text-[oklch(0.85_0.05_90)]/80">
                {f.note}
              </p>
            </motion.div>
          ))}
        </div>

        <p className="font-script mt-16 text-xl italic text-gold-gradient md:text-2xl">
          cordially request the honour of your esteemed presence
        </p>
        <p className="font-display mt-3 text-[10px] tracking-[0.35em] text-[oklch(0.82_0.1_85)]/80">
          TO CELEBRATE THE AUSPICIOUS WEDDING OF THEIR BELOVED CHILDREN
        </p>

        <div className="mt-10">
          <p className="font-display text-2xl tracking-[0.35em] text-gold-gradient md:text-3xl">
            AARAV &nbsp;&amp;&nbsp; ANANYA
          </p>
          <p className="font-display mt-3 text-[10px] tracking-[0.4em] text-[oklch(0.82_0.1_85)]/80">
            MYLAPORE, CHENNAI · FRIDAY &amp; SATURDAY
          </p>
        </div>
      </div>
    </section>
  );
}