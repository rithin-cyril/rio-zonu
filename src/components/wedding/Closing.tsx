import { Ornament } from "./Ornament";

export function Closing() {
  return (
    <footer className="bg-royal relative overflow-hidden border-t border-gold/30 py-16">
      <div className="mx-auto max-w-2xl px-6 text-center">
        <Ornament />
        <p className="font-script mt-6 text-2xl italic text-gold-gradient md:text-3xl">
          “The Lord bless you and keep you;
          <br />
          the Lord make his face shine on you and be gracious to you.”
        </p>
        <p className="font-display mt-3 text-[10px] tracking-[0.4em] text-[oklch(0.45_0.04_60)]/80">
          — NUMBERS 6:24–25
        </p>
        <p className="mt-8 font-script italic text-[oklch(0.4_0.04_60)]">
          With grateful hearts, we await your prayers and presence on our blessed day.
        </p>
        <p className="font-display mt-8 text-[9px] tracking-[0.4em] text-gold-gradient/70">
          © 2026 · RITHIN &amp; HARSHITA · TO GOD BE THE GLORY ✝
        </p>
      </div>
    </footer>
  );
}