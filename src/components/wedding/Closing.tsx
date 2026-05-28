import { Ornament } from "./Ornament";

export function Closing() {
  return (
    <footer className="bg-royal relative overflow-hidden border-t border-gold/30 py-16">
      <div className="mx-auto max-w-2xl px-6 text-center">
        <Ornament />
        <p className="font-deva mt-6 text-2xl text-gold-gradient">
          लोक: समस्ता: सुखिनो भवन्तु
        </p>
        <p className="font-display mt-3 text-[10px] tracking-[0.4em] text-[oklch(0.82_0.1_85)]/80">
          LOKAH SAMASTAH SUKHINO BHAVANTU
        </p>
        <p className="mt-6 font-script italic text-[oklch(0.85_0.05_90)]/80">
          Thank you for being a part of our sacred union.
        </p>
        <p className="font-display mt-8 text-[9px] tracking-[0.4em] text-[oklch(0.72_0.11_80)]/60">
          © 2026 · AARAV &amp; ANANYA · MADE WITH ✦
        </p>
      </div>
    </footer>
  );
}