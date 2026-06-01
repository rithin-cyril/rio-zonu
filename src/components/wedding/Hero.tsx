import { motion } from "motion/react";
import namesBg from "@/assets/names-bg.jpg";

export function Hero() {
  return (
    <section className="relative flex min-h-[100svh] items-center justify-center overflow-hidden">
      <img
        src={namesBg}
        alt=""
        width={1920}
        height={1080}
        className="absolute inset-0 h-full w-full object-cover opacity-25"
      />
      <div className="absolute inset-0 bg-gradient-to-b from-[oklch(0.975_0.012_85)]/95 via-[oklch(0.965_0.014_84)]/90 to-[oklch(0.95_0.02_84)]" />

      <div className="relative z-10 mx-auto w-full max-w-xl px-6 py-20 text-center">
        <motion.h1
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="font-script italic leading-[1.05] text-gold-gradient"
        >
          <span className="block text-5xl md:text-6xl">Rithin Cyril</span>
          <span className="my-4 block text-2xl text-[oklch(0.72_0.09_80)]" aria-hidden>♡</span>
          <span className="block text-5xl md:text-6xl">V. Harshita</span>
        </motion.h1>

        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, delay: 0.25 }}
          className="mt-12"
        >
          <p className="font-display text-[11px] tracking-[0.32em] text-gold-gradient">
            SAVE THE DATE
          </p>
          <p className="mt-4 font-script text-3xl italic ink md:text-4xl">
            18 October 2026
          </p>
        </motion.div>

        <div className="divider-hairline mt-12" />

        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, delay: 0.15 }}
          className="mt-12"
        >
          <p className="font-script text-lg italic leading-relaxed ink-soft md:text-xl">
            “I have found the one whom my soul loves.”
          </p>
          <p className="mt-2 font-display text-[10px] tracking-[0.3em] text-gold-gradient">
            — SONG OF SOLOMON 3:4
          </p>
        </motion.div>

        <motion.h2
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, delay: 0.2 }}
          className="mt-14 font-script text-3xl italic leading-snug text-gold-gradient md:text-4xl"
        >
          By God's Grace,
          <br />
          We Begin Our Forever
        </motion.h2>

        <p className="mx-auto mt-8 max-w-sm font-body text-base leading-relaxed ink-soft md:text-lg">
          Together with our families, we warmly invite you to celebrate our wedding.
        </p>

        <div className="mt-10">
          <p className="font-display text-base tracking-[0.18em] ink md:text-lg">
            CSI Kanthi Church
          </p>
          <p className="mt-2 font-script text-lg italic ink-soft">
            Anandapura, S. Coorg
          </p>
        </div>
      </div>
    </section>
  );
}
