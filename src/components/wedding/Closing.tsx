import { Ornament } from "./Ornament";

export function Closing() {
  return (
    <footer className="bg-lux-footer relative overflow-hidden py-16">
      <div className="gold-divider absolute inset-x-0 top-0" />
      <div className="mx-auto max-w-2xl px-6 text-center">
        <Ornament />
        <p className="font-script mt-6 text-2xl italic md:text-3xl" style={{ color: "#F2EADA" }}>
          “The Lord bless you and keep you.”
        </p>
        <p className="font-display mt-3 text-[11px] font-semibold tracking-[0.4em]" style={{ color: "#C9B37E" }}>
          — NUMBERS 6:24
        </p>
        <p className="font-display mt-10 text-[10px] font-semibold tracking-[0.4em]" style={{ color: "#C9B37E" }}>
          RITHIN &amp; HARSHITA · 2026
        </p>
      </div>
    </footer>
  );
}