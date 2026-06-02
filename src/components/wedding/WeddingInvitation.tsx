import { useState } from "react";
import { Gate } from "./Gate";
import { Hero } from "./Hero";
import { Welcome } from "./Welcome";
import { Journey } from "./Journey";
import { Countdown } from "./Countdown";
import { Families } from "./Families";
import { Ceremonies } from "./Ceremonies";
import { Blessings } from "./Blessings";
import { Closing } from "./Closing";
import { Petals } from "./Petals";
import { MusicPlayer } from "./MusicPlayer";
import { BackToTop } from "./BackToTop";

export function WeddingInvitation() {
  const [opened, setOpened] = useState(false);
  return (
    <main className="relative min-h-screen overflow-x-hidden bg-[oklch(0.97_0.012_90)] text-[oklch(0.28_0.03_60)]">
      <Gate opened={opened} onOpen={() => setOpened(true)} />
      {opened && <Petals />}
      {opened && <MusicPlayer />}
      {opened && <BackToTop />}
      <Hero />
      <Welcome />
      <Journey />
      <Countdown />
      <Families />
      <Ceremonies />
      <Blessings />
      <Closing />
    </main>
  );
}