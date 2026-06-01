import { motion } from "motion/react";
import portrait from "@/assets/names-bg.jpg";

export function Couple() {
  return (
    <section className="bg-ivory-soft relative overflow-hidden py-24">
      <div className="mx-auto max-w-xl px-6 text-center">
        <p className="font-display text-[11px] tracking-[0.32em] text-gold-gradient">
          OUR JOURNEY
        </p>
        <h2 className="mt-4 font-script text-4xl italic text-gold-gradient md:text-5xl">
          Together Forever
        </h2>
        <div className="divider-hairline mt-6" />

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
          className="mx-auto mt-12 h-72 w-72 overflow-hidden rounded-full border border-[oklch(0.72_0.09_80)]/40 shadow-gold md:h-80 md:w-80"
        >
          <img
            src={portrait}
            alt="Rithin and Harshita"
            loading="lazy"
            decoding="async"
            className="h-full w-full object-cover"
          />
        </motion.div>

        <p className="mx-auto mt-10 max-w-sm font-script text-xl italic leading-relaxed ink md:text-2xl">
          Two hearts, one journey — woven together by God's perfect love.
        </p>
      </div>
    </section>
  );
}