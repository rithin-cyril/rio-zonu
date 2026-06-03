import { motion } from "motion/react";
import gateBg from "@/assets/gate-bg.png.asset.json";

export function Gate({ onOpen, opened }: { onOpen: () => void; opened: boolean }) {
  return (
    <motion.section
      initial={false}
      animate={opened ? { opacity: 0, pointerEvents: "none" } : { opacity: 1 }}
      transition={{ duration: 1.1, ease: "easeInOut" }}
      className="fixed inset-0 z-50 overflow-hidden"
    >
      <motion.button
        onClick={onOpen}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1.2 }}
        whileTap={{ scale: 0.98 }}
        aria-label="Tap to open the invitation"
        className="group absolute inset-0 h-full w-full cursor-pointer"
      >
        <img
          src={gateBg.url}
          alt="Holy Matrimony — Sunday, 18 October 2026 — By God's Grace"
          className="absolute inset-0 h-full w-full object-cover"
        />
        {/* Soft pulsing glow over the central cross seal to invite tapping */}
        <span
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-[62%] h-24 w-24 -translate-x-1/2 -translate-y-1/2 rounded-full md:h-32 md:w-32"
          style={{
            background:
              "radial-gradient(circle, rgba(201,179,126,0.55) 0%, rgba(201,179,126,0) 70%)",
            animation: "glow-pulse 2.6s ease-in-out infinite",
          }}
        />
      </motion.button>
    </motion.section>
  );
}