import { motion } from "motion/react";
import { Ornament } from "./Ornament";

export function Journey() {
  return (
    <section className="bg-lux-verse relative overflow-hidden py-14 md:py-20">
      <div className="mx-auto max-w-2xl px-5 text-center sm:px-6">
        <p className="font-display text-[10px] tracking-[0.45em] text-gold-gradient">
          OUR JOURNEY
        </p>
        <motion.h2
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.9 }}
          className="font-script mt-3 text-3xl italic text-gold-gradient md:text-5xl"
        >
          Together Forever
        </motion.h2>
        <p className="font-display mt-2 text-[10px] font-semibold tracking-[0.35em] ink-soft md:text-[11px]">
          RITHIN &amp; HARSHITA
        </p>
        <Ornament className="mt-5" />
        <p className="mx-auto mt-5 max-w-xl font-script text-base italic leading-relaxed ink md:text-xl">
          Two hearts, one journey — woven together by God’s perfect love.
          What began as a beautiful blessing has grown into a lifelong promise
          of faith, love, and togetherness.
        </p>
      </div>
    </section>
  );
}