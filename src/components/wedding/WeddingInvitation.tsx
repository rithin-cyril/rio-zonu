import { useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { useIsMobile } from "@/hooks/use-mobile";
import { Gate } from "./Gate";
import { Hero } from "./Hero";
import { Welcome } from "./Welcome";
import { Journey } from "./Journey";
import { Countdown } from "./Countdown";
import { Families } from "./Families";
import { Ceremonies } from "./Ceremonies";
import { Blessings } from "./Blessings";
import { BlessingsWall } from "./BlessingsWall";
import { Gallery } from "./Gallery";

import { Closing } from "./Closing";
import { SectionDivider } from "./SectionDivider";
import { Petals } from "./Petals";
import { MusicPlayer } from "./MusicPlayer";
import { BackToTop } from "./BackToTop";
import floralBg from "@/assets/floral-bg.jpg";

export function WeddingInvitation() {
  const [opened, setOpened] = useState(false);
  // Non-critical layers (petals, audio, floating controls) only mount once the
  // reveal animation has finished, so nothing competes with it for the main
  // thread on mobile.
  const [revealed, setRevealed] = useState(false);
  const isMobile = useIsMobile();
  const reduceMotion = useReducedMotion();
  return (
    <main
      id="main"
      className="relative min-h-dvh overflow-x-hidden bg-[oklch(0.97_0.012_90)] text-[oklch(0.28_0.03_60)]"
    >
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-0 opacity-[0.18] mix-blend-multiply"
        style={{
          backgroundImage: `url(${floralBg})`,
          backgroundRepeat: "repeat",
          backgroundSize: "640px 640px",
        }}
      />
      {!revealed && (
        <Gate opened={opened} onOpen={() => setOpened(true)} onRevealed={() => setRevealed(true)} />
      )}

      {/* Soft glimmer that passes across the invitation just as the cover clears. */}
      {revealed && !reduceMotion && (
        <motion.span
          aria-hidden
          initial={{ x: "-70%", opacity: 0 }}
          animate={{ x: "70%", opacity: [0, 0.32, 0] }}
          transition={{ duration: 0.36, ease: "easeOut", delay: 0.06 }}
          className="pointer-events-none fixed inset-y-0 left-0 z-40 w-[70%]"
          style={{
            background:
              "linear-gradient(100deg, transparent 0%, rgba(255,246,224,0.7) 50%, transparent 100%)",
            mixBlendMode: "screen",
            willChange: "transform, opacity",
          }}
        />
      )}

      <motion.div
        className="relative z-10"
        initial={false}
        animate={
          opened
            ? { opacity: 1, y: 0 }
            : { opacity: 0, y: reduceMotion ? 0 : 20 }
        }
        transition={
          reduceMotion
            ? { duration: 0.2, ease: "linear" }
            : { duration: 0.36, ease: [0.16, 1, 0.3, 1], delay: 0.46 }
        }
        style={{ willChange: opened ? "auto" : "transform, opacity" }}
      >
      {revealed && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: reduceMotion ? 0 : 0.8, ease: "easeOut" }}
        >
          <Petals count={isMobile ? 10 : 24} />
        </motion.div>
      )}
      {revealed && <MusicPlayer />}
      {revealed && <BackToTop />}
      <Hero />
      <SectionDivider />
      <Welcome />
      <SectionDivider />
      <Journey />
      <SectionDivider />
      <Countdown />
      <SectionDivider />
      <Families />
      <SectionDivider />
      <Ceremonies />
      <SectionDivider />
      <Blessings />
      <SectionDivider />
      <BlessingsWall />
      <SectionDivider />
      <Gallery />
      <Closing />
      </div>
    </main>
  );
}