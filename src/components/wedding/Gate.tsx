import { motion } from "motion/react";
import gopuram from "@/assets/gopuram-hero.jpg";
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
        src={gopuram}
        alt="Tamil temple gopuram"
        width={1920}
        height={1280}
        className="absolute inset-0 h-full w-full object-cover"
      />
      <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/60" />

      <div className="relative z-10 flex h-full w-full flex-col items-center justify-between px-6 py-10 text-center">
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 1 }}
          className="space-y-2"
        >
          <Ornament />
          <p className="font-display text-[10px] tracking-[0.4em] text-gold-gradient">
            SACRED UNION
          </p>
          <p className="font-deva text-2xl text-gold-gradient md:text-3xl">शुभ विवाह</p>
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
          <span className="glow-pulse relative flex h-28 w-28 items-center justify-center rounded-full border-2 border-gold bg-gradient-to-br from-[oklch(0.45_0.18_28)] to-[oklch(0.25_0.12_25)] shadow-2xl md:h-32 md:w-32">
            <span className="absolute inset-2 rounded-full border border-[oklch(0.72_0.11_80)]/40" />
            <span className="font-script text-3xl italic text-gold-gradient md:text-4xl">
              ॐ
            </span>
          </span>
          <span className="font-display text-[11px] tracking-[0.45em] text-gold-gradient">
            TAP TO OPEN THE INVITATION
          </span>
        </motion.button>

        <div className="h-4" />
      </div>
    </motion.section>
  );
}