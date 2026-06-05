import { motion } from "motion/react";
import namesBg from "@/assets/names-bg.jpg";
import { Ornament } from "./Ornament";

export function Hero() {
  return (
    <section className="bg-lux-hero lux-glow relative flex min-h-[88svh] items-center justify-center overflow-hidden py-14 md:py-20">
      <img
        src={namesBg}
        alt=""
        width={1920}
        height={1080}
        className="absolute inset-0 h-full w-full object-cover opacity-40"
      />
      <div className="absolute inset-0 bg-gradient-to-b from-[#FBF8F1]/80 via-[#FBF8F1]/85 to-[#F2EADA]" />

      <div className="relative z-10 mx-auto max-w-3xl px-5 text-center sm:px-6">
        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 1.1, delay: 0.1 }}
          className="font-script text-lg italic ink md:text-2xl"
        >
          “I have found the one whom my soul loves.”
        </motion.p>
        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 1, delay: 0.25 }}
          className="font-display mt-2 text-[9px] tracking-[0.45em] text-gold-gradient md:text-[10px]"
        >
          — SONG OF SOLOMON 3:4
        </motion.p>

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 1.1, delay: 0.5 }}
          className="font-script mt-4 text-[2.6rem] italic leading-[1.05] text-gold-gradient sm:text-5xl md:mt-6 md:text-7xl"
        >
          Rithin Cyril
          <span className="block py-1.5 text-2xl text-[oklch(0.55_0.18_25)] md:py-2 md:text-4xl">♡</span>
          V. Harshita
        </motion.h1>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.9, delay: 0.9 }}
          className="mt-6 inline-flex flex-col items-center md:mt-8"
        >
          <p className="font-display text-xs md:text-lg font-semibold tracking-[0.5em] text-[#2E2A26] uppercase">
            SAVE THE DATE
          </p>
          <div className="relative mt-2 border-y border-gold px-6 py-2 md:mt-3 md:px-8 md:py-3">
            <span className="absolute -left-1 top-1/2 h-2 w-2 -translate-y-1/2 rotate-45 border border-gold bg-[oklch(0.97_0.012_90)]" />
            <span className="absolute -right-1 top-1/2 h-2 w-2 -translate-y-1/2 rotate-45 border border-gold bg-[oklch(0.97_0.012_90)]" />
            <p className="font-display text-base tracking-[0.35em] text-gold-gradient md:text-2xl">
              18 · OCTOBER · 2026
            </p>
          </div>
          <p className="font-display mt-2.5 text-[9px] font-semibold tracking-[0.4em] ink-soft md:text-[10px]">
            CSI KANTHI CHURCH · ANANDAPURA · S. COORG
          </p>
        </motion.div>

        <Ornament className="mt-8 md:mt-10" />
        <p className="font-display mt-2 text-[9px] font-semibold tracking-[0.45em] text-gold-gradient md:text-[10px]">
          SCROLL TO EXPLORE
        </p>
      </div>
    </section>
  );
}
