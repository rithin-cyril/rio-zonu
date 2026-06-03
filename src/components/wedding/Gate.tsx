import { motion } from "motion/react";
import church from "@/assets/church-hero.jpg";
import { Ornament } from "./Ornament";

export function Gate({ onOpen, opened }: { onOpen: () => void; opened: boolean }) {
  return (
    <motion.section
      initial={false}
      animate={opened ? { opacity: 0, pointerEvents: "none" } : { opacity: 1 }}
      transition={{ duration: 1.1, ease: "easeInOut" }}
      className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden"
    >
      <img
        src={church}
        alt="Church sanctuary with stained glass"
        width={1920}
        height={1280}
        className="absolute inset-0 h-full w-full object-cover"
      />
      <div className="absolute inset-0 bg-gradient-to-b from-[oklch(0.97_0.012_90)]/40 via-[oklch(0.97_0.012_90)]/20 to-[oklch(0.97_0.012_90)]/75" />

      <div className="relative z-10 flex h-full w-full flex-col items-center justify-between px-6 py-10 text-center">
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 1 }}
          className="space-y-4"
        >
          <Ornament />
          <h1 className="font-display text-gold-gradient font-bold tracking-[0.32em] text-3xl sm:text-4xl md:text-6xl lg:text-7xl mt-6 mb-4 drop-shadow-sm">
            HOLY MATRIMONY
          </h1>
          <p className="font-body text-base md:text-xl tracking-[0.2em] uppercase text-[#2E2A26]">
            Sunday · 18 October 2026
          </p>
          <p className="font-hand text-3xl text-gold-gradient md:text-4xl mt-2">By God’s Grace</p>
        </motion.div>

        <motion.button
          onClick={onOpen}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 1, duration: 0.8 }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="group flex flex-col items-center gap-4"
        >
          <span className="glow-pulse relative flex h-28 w-28 items-center justify-center rounded-full border-2 border-gold bg-gradient-to-br from-white to-[oklch(0.92_0.03_85)] shadow-2xl md:h-32 md:w-32">
            <span className="absolute inset-2 rounded-full border border-gold/40" />
            <span className="font-script text-4xl italic text-gold-gradient md:text-5xl" aria-hidden>
              ✝
            </span>
          </span>
          <span className="font-display text-sm md:text-lg font-semibold tracking-[0.4em] text-[#2E2A26] px-6 py-2 animate-pulse">
            TAP TO OPEN THE INVITATION
          </span>
          <span className="font-script text-lg md:text-xl italic ink-soft">
            Save the Date · 18 October 2026
          </span>
        </motion.button>

        <div className="h-4" />
      </div>
    </motion.section>
  );
}