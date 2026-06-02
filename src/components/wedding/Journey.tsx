import { motion } from "motion/react";
import { Ornament } from "./Ornament";

export function Journey() {
  return (
    <section className="bg-sage-veil relative overflow-hidden py-24 md:py-28">
      <div className="mx-auto max-w-2xl px-6 text-center">
        <p className="font-display text-[10px] tracking-[0.45em] text-gold-gradient">
          OUR JOURNEY
        </p>
        <motion.h2
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.9 }}
          className="font-script mt-4 text-4xl italic text-gold-gradient md:text-5xl"
        >
          Together Forever
        </motion.h2>
        <p className="font-display mt-3 text-[11px] font-semibold tracking-[0.35em] ink-soft">
          RITHIN &amp; HARSHITA
        </p>
        <Ornament className="mt-6" />
        <p className="mx-auto mt-8 max-w-xl font-script text-lg italic leading-relaxed ink md:text-xl">
          Two hearts, one journey — woven together by God’s perfect love.
          What began as a beautiful blessing has grown into a lifelong promise
          of faith, love, and togetherness.
        </p>
      </div>
    </section>
  );
}