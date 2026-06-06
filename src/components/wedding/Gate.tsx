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
  const mobileSealY = 71.5; // %, tuned for the mobile full-screen crop

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
        initial={false}
        animate={{ opacity: 1 }}
        transition={{ duration: 1.2 }}
        whileTap={{ scale: 0.98 }}
        aria-label="Tap to open the invitation"
        className="group absolute inset-0 h-full w-full cursor-pointer"
      >
        {/* Mobile-first full-screen portrait cover treatment */}
        <div className="absolute inset-0 sm:hidden">
          <motion.img
            src={gateBg.url}
            alt="Holy Matrimony — Sunday, 18 October 2026 — By God's Grace"
            initial={false}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1.6, ease: "easeOut" }}
            className="absolute inset-0 h-full w-full select-none object-cover object-center"
            style={{ transformOrigin: "center center" }}
            draggable={false}
          />

          <span
            aria-hidden
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                "linear-gradient(180deg, rgba(246,236,216,0.38) 0%, rgba(246,236,216,0.22) 18%, rgba(246,236,216,0.44) 45%, rgba(246,236,216,0.28) 68%, rgba(246,236,216,0.58) 100%)",
              backdropFilter: "blur(10px)",
            }}
          />

          <span
            aria-hidden
            className="pointer-events-none absolute inset-y-0 inset-x-[8%]"
            style={{
              background:
                "radial-gradient(ellipse at center, rgba(251,248,241,0.52) 0%, rgba(251,248,241,0.26) 48%, rgba(251,248,241,0.06) 82%, transparent 100%)",
            }}
          />

          <span
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-0 h-[46%]"
            style={{
              background:
                "linear-gradient(180deg, rgba(255,225,170,0.28) 0%, rgba(255,225,170,0.10) 46%, transparent 100%)",
              mixBlendMode: "screen",
              animation: "godray-drift 8s ease-in-out infinite",
            }}
          />

          <div
            className="absolute inset-x-0 flex flex-col items-center px-5 text-center"
            style={{ top: "max(env(safe-area-inset-top), 4.5svh)" }}
          >
            <div className="flex items-center gap-3 text-[#b89a5a] opacity-95">
              <span className="h-px w-12 bg-current/55" />
              <span className="font-display text-[0.95rem]">✝</span>
              <span className="h-px w-12 bg-current/55" />
            </div>

            <h1 className="font-display mt-5 text-[clamp(2.65rem,12vw,4.25rem)] leading-[0.88] tracking-[0.06em] text-[#4f3921]">
              HOLY
              <br />
              MATRIMONY
            </h1>

            <p className="font-body mt-5 text-[clamp(1.15rem,4.8vw,1.45rem)] tracking-[0.22em] text-[#5a4a32]">
              SUNDAY · 18 OCTOBER 2026
            </p>

            <p className="font-script mt-5 text-[clamp(2.2rem,10.8vw,3rem)] leading-none text-[#c79b48]">
              By God's Grace
            </p>
          </div>

          {/* Mobile seal cue */}
          <span
            aria-hidden
            className="pointer-events-none absolute rounded-full border border-[rgba(201,179,126,0.6)]"
            style={{
              left: "50%",
              top: `${mobileSealY}%`,
              width: "clamp(100px, 27vw, 128px)",
              height: "clamp(100px, 27vw, 128px)",
              transform: "translate(-50%, -50%)",
              animation: "seal-ring 2.6s ease-out infinite",
            }}
          />

          <span
            aria-hidden
            className="pointer-events-none absolute rounded-full"
            style={{
              left: "50%",
              top: `${mobileSealY}%`,
              width: "clamp(116px, 31vw, 146px)",
              height: "clamp(116px, 31vw, 146px)",
              transform: "translate(-50%, -50%)",
              background:
                "radial-gradient(circle, rgba(201,179,126,0.55) 0%, rgba(201,179,126,0.25) 45%, rgba(201,179,126,0) 75%)",
              animation: "glow-pulse 2.6s ease-in-out infinite",
            }}
          />

          <span
            aria-hidden
            className="pointer-events-none absolute flex items-center justify-center rounded-full"
            style={{
              left: "50%",
              top: `${mobileSealY}%`,
              width: "clamp(88px, 23vw, 112px)",
              height: "clamp(88px, 23vw, 112px)",
              transform: "translate(-50%, -50%)",
              background:
                "radial-gradient(circle at 30% 30%, rgba(255,255,255,0.98), rgba(248,240,224,0.95) 58%, rgba(231,214,182,0.96) 100%)",
              border: "1px solid rgba(201,179,126,0.6)",
              boxShadow:
                "0 10px 28px rgba(201,179,126,0.22), inset 0 0 0 6px rgba(255,255,255,0.58), inset 0 0 0 1px rgba(201,179,126,0.35)",
              color: "#c9a052",
              fontSize: "clamp(2rem, 8vw, 2.5rem)",
              lineHeight: 1,
            }}
          >
            ✝
          </span>

          <div
            className="absolute inset-x-0 flex flex-col items-center px-5 text-center"
            style={{ bottom: "max(calc(env(safe-area-inset-bottom) + 2svh), 22px)" }}
          >
            <p className="font-script mt-4 text-[clamp(1.8rem,7.4vw,2.35rem)] leading-none text-[#5a4a32]">
              Save the Date · 18 October 2026
            </p>
            <p className="font-display mt-5 text-[clamp(0.82rem,3.5vw,0.96rem)] tracking-[0.3em] text-[#5a4a32]">
              TAP TO OPEN THE INVITATION
            </p>
          </div>
        </div>

        {/* Desktop/tablet artwork stage: centered, fully visible. */}
        <div
          className="absolute left-1/2 top-1/2 hidden -translate-x-1/2 -translate-y-1/2 sm:block"
          style={{
            aspectRatio: "1719 / 915",
            width: "min(100vw, calc(100svh * 1719 / 915))",
            height: "min(100svh, calc(100vw * 915 / 1719))",
            containerType: "size",
          }}
        >
          <motion.img
            src={gateBg.url}
            alt="Holy Matrimony — Sunday, 18 October 2026 — By God's Grace"
            initial={false}
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
          className="font-display absolute bottom-[max(24px,env(safe-area-inset-bottom))] left-1/2 hidden -translate-x-1/2 whitespace-nowrap text-[13px] font-semibold tracking-[0.4em] text-[#5a4a32] sm:block"
        >
          TAP TO OPEN THE INVITATION
        </motion.p>
      </motion.button>
    </motion.section>
  );
}