import { motion } from "motion/react";

const families = [
  {
    side: "The Groom's Family",
    line1: "Mr. (Late) Regin Cyril",
    line2: "& Mrs. Elizabeth Pushpalatha Cyril",
  },
  {
    side: "The Bride's Family",
    line1: "Mr. V. R. Raju",
    line2: "& Mrs. V. Nirmala",
  },
];

export function Families() {
  return (
    <section className="bg-royal relative overflow-hidden py-24">
      <div className="mx-auto max-w-xl px-6 text-center">
        <h2 className="font-script text-3xl italic text-gold-gradient md:text-4xl">
          With Our Families' Blessings
        </h2>
        <div className="divider-hairline mt-6" />

        <div className="mt-12 flex flex-col gap-12">
          {families.map((f, i) => (
            <motion.div
              key={f.line1}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: i * 0.1 }}
              className="space-y-3"
            >
              <p className="font-script text-xl italic text-gold-gradient">
                {f.side}
              </p>
              <h3 className="font-script text-2xl italic ink md:text-3xl">
                {f.line1}
              </h3>
              <p className="font-script text-xl italic ink-soft">
                {f.line2}
              </p>
            </motion.div>
          ))}
        </div>

        <div className="divider-hairline mt-16" />
        <p className="mt-10 font-script text-lg italic leading-relaxed ink-soft md:text-xl">
          joyfully invite you to witness the holy matrimony of
        </p>
        <p className="mt-4 font-script text-2xl italic text-gold-gradient md:text-3xl">
          Rithin Cyril &amp; V. Harshita
        </p>
        <p className="mt-3 font-display text-[11px] tracking-[0.28em] ink-soft">
          SUNDAY · 18 OCTOBER 2026
        </p>
      </div>
    </section>
  );
}