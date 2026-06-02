import { Ornament } from "./Ornament";

export function Closing() {
  return (
    <footer className="bg-royal relative overflow-hidden border-t border-gold/30 py-16">
      <div className="mx-auto max-w-2xl px-6 text-center">
        <Ornament />
        <p className="font-script mt-6 text-2xl italic text-gold-gradient md:text-3xl">
          “The Lord bless you and keep you.”
        </p>
        <p className="font-display mt-3 text-[11px] font-semibold tracking-[0.4em] ink-soft">
          — NUMBERS 6:24
        </p>
        <p className="font-display mt-10 text-[10px] font-semibold tracking-[0.4em] text-gold-gradient">
          RITHIN &amp; HARSHITA · 2026
        </p>
      </div>
    </footer>
  );
}