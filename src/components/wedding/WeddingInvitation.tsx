import { useState } from "react";
import { Gate } from "./Gate";
import { Hero } from "./Hero";
import { Welcome } from "./Welcome";
import { Journey } from "./Journey";
import { Countdown } from "./Countdown";
import { Families } from "./Families";
import { Ceremonies } from "./Ceremonies";
import { Blessings } from "./Blessings";
import { BlessingsWall } from "./BlessingsWall";
import { Closing } from "./Closing";
import { Petals } from "./Petals";
import { MusicPlayer } from "./MusicPlayer";
import { BackToTop } from "./BackToTop";
import floralBg from "@/assets/floral-bg.jpg";

export function WeddingInvitation() {
  const [opened, setOpened] = useState(false);
  const isMobile =
    typeof window !== "undefined" &&
    window.matchMedia("(max-width: 640px)").matches;
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
      <div className="relative z-10">
      <Gate opened={opened} onOpen={() => setOpened(true)} />
      {opened && <Petals count={isMobile ? 10 : 24} />}
      {opened && <MusicPlayer />}
      {opened && <BackToTop />}
      <Hero />
      <Welcome />
      <Journey />
      <Countdown />
      <Families />
      <Ceremonies />
      <Blessings />
      <BlessingsWall />
      <Closing />
      </div>
    </main>
  );
}