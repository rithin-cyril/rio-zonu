import { motion } from "motion/react";
import namesBg from "@/assets/names-bg.jpg";
import { Ornament } from "./Ornament";

export function Hero() {
  return (
    <section className="relative flex min-h-[100svh] items-center justify-center overflow-hidden">
      <img
        src={namesBg}
        alt=""
        width={1920}
        height={1080}
        className="absolute inset-0 h-full w-full object-cover opacity-90"
      />
      <div className="absolute inset-0 bg-gradient-to-b from-[oklch(0.18_0.08_25)]/70 via-[oklch(0.16_0.07_25)]/80 to-[oklch(0.14_0.06_25)]" />

      <div className="relative z-10 mx-auto max-w-3xl px-6 text-center">
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="font-display text-[10px] tracking-[0.45em] text-gold-gradient"
        >
          TOGETHER WITH OUR FAMILIES
        </motion.p>

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 1.1, delay: 0.2 }}
          className="font-script mt-8 text-6xl italic leading-none text-gold-gradient md:text-8xl"
        >
          Aarav
          <span className="block py-3 text-3xl md:text-4xl">&amp;</span>
          Ananya
        </motion.h1>

        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 1.1, delay: 0.7 }}
          className="font-script mt-6 text-lg italic text-[oklch(0.85_0.06_85)] md:text-xl"
        >
          “Two hearts, one beautiful journey.”
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.9, delay: 1 }}
          className="mt-10 inline-flex flex-col items-center"
        >
          <p className="font-display text-[9px] tracking-[0.4em] text-[oklch(0.72_0.11_80)]">
            SAVE THE DATE
          </p>
          <div className="relative mt-3 border-y border-gold px-8 py-3">
            <span className="absolute -left-1 top-1/2 h-2 w-2 -translate-y-1/2 rotate-45 border border-gold bg-[oklch(0.18_0.06_25)]" />
            <span className="absolute -right-1 top-1/2 h-2 w-2 -translate-y-1/2 rotate-45 border border-gold bg-[oklch(0.18_0.06_25)]" />
            <p className="font-display text-lg tracking-[0.35em] text-gold-gradient md:text-2xl">
              12 · DECEMBER · 2026
            </p>
          </div>
        </motion.div>

        <Ornament className="mt-12" />
        <p className="font-display mt-3 text-[9px] tracking-[0.45em] text-[oklch(0.72_0.11_80)]/70">
          SCROLL TO EXPLORE
        </p>
      </div>
    </section>
  );
}