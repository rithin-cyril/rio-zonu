import { motion } from "motion/react";
import gateBg from "@/assets/gate-bg.png.asset.json";
import { Petals } from "./Petals";

/**
 * Welcome gate. The artwork is rendered inside a container locked to its
 * native 1719x915 aspect ratio so the cross seal stays perfectly aligned
 * with the pulsing glow regardless of viewport size.
 * The container is sized with `max` so mobile gets a true full-screen cover
 * presentation instead of a contained, square-looking frame.
 */
export function Gate({ onOpen, opened }: { onOpen: () => void; opened: boolean }) {
  const SEAL_X = 50; // %
  const SEAL_Y = 67.6; // %, measured from artwork

  return (
    <motion.section
      initial={false}
      animate={opened ? { opacity: 0, scale: 1.03, pointerEvents: "none" } : { opacity: 1, scale: 1 }}
      transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
      className="fixed inset-0 z-50 overflow-hidden bg-[#f6ecd8]"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      {/* Pre-open ambient petals, like the reference site */}
      {!opened && <Petals count={14} />}

      <motion.button
        onClick={onOpen}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1.2 }}
        whileTap={{ scale: 0.98 }}
        aria-label="Tap to open the invitation"
        className="group absolute inset-0 h-full w-full cursor-pointer"
      >
        {/* Aspect-locked artwork stage: centered, always fills the viewport.
            Using max-w/max-h with aspect ratio = CSS object-cover, while still
            letting us place absolute children at exact image coordinates. */}
        <div
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
          style={{
            aspectRatio: "1719 / 915",
            // Cover behavior: mobile fills the full viewport instead of
            // appearing like a centered square card with letterboxing.
            width: "max(100vw, calc(100svh * 1719 / 915))",
            height: "max(100svh, calc(100vw * 915 / 1719))",
            containerType: "size",
          }}
        >
          <motion.img
            src={gateBg.url}
            alt="Holy Matrimony — Sunday, 18 October 2026 — By God's Grace"
            initial={{ opacity: 0, scale: 1.04 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1.6, ease: "easeOut" }}
            className="absolute inset-0 h-full w-full select-none"
            draggable={false}
          />

          {/* Warm godrays over the upper portion */}
          <span
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-0 h-[55%]"
            style={{
              background:
                "linear-gradient(180deg, rgba(255,225,170,0.28) 0%, rgba(255,225,170,0.10) 40%, transparent 100%)",
              mixBlendMode: "screen",
              animation: "godray-drift 8s ease-in-out infinite",
            }}
          />

          {/* Expanding ring cue on the seal */}
          <span
            aria-hidden
            className="pointer-events-none absolute rounded-full border border-[rgba(201,179,126,0.6)]"
            style={{
              left: `${SEAL_X}%`,
              top: `${SEAL_Y}%`,
              width: "10cqh",
              height: "10cqh",
              transform: "translate(-50%, -50%)",
              animation: "seal-ring 2.6s ease-out infinite",
            }}
          />

          {/* Soft pulsing glow directly on the cross */}
          <span
            aria-hidden
            className="pointer-events-none absolute rounded-full"
            style={{
              left: `${SEAL_X}%`,
              top: `${SEAL_Y}%`,
              width: "12cqh",
              height: "12cqh",
              transform: "translate(-50%, -50%)",
              background:
                "radial-gradient(circle, rgba(201,179,126,0.55) 0%, rgba(201,179,126,0.25) 45%, rgba(201,179,126,0) 75%)",
              animation: "glow-pulse 2.6s ease-in-out infinite",
            }}
          />
        </div>

        {/* Mobile-only tap hint (artwork label can be small on narrow screens) */}
        <motion.p
          aria-hidden
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: [0, 1, 1, 0.6, 1], y: 0 }}
          transition={{ duration: 2.6, repeat: Infinity, ease: "easeInOut", delay: 1.2 }}
          className="font-display absolute bottom-[max(24px,env(safe-area-inset-bottom))] left-1/2 -translate-x-1/2 whitespace-nowrap text-[13px] font-semibold tracking-[0.4em] text-[#5a4a32] sm:hidden"
        >
          TAP TO OPEN THE INVITATION
        </motion.p>
      </motion.button>
    </motion.section>
  );
}