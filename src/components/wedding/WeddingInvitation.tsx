import { useState } from "react";
import { Gate } from "./Gate";
import { Hero } from "./Hero";
import { Countdown } from "./Countdown";
import { Families } from "./Families";
import { Ceremonies } from "./Ceremonies";
import { Blessings } from "./Blessings";
import { Closing } from "./Closing";
import { Petals } from "./Petals";

export function WeddingInvitation() {
  const [opened, setOpened] = useState(false);
  return (
    <main className="relative min-h-screen overflow-x-hidden bg-[oklch(0.14_0.06_25)] text-[oklch(0.95_0.04_85)]">
      <Gate opened={opened} onOpen={() => setOpened(true)} />
      {opened && <Petals />}
      <Hero />
      <Countdown />
      <Families />
      <Ceremonies />
      <Blessings />
      <Closing />
    </main>
  );
}