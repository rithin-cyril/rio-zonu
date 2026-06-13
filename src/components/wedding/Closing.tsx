import { Ornament } from "./Ornament";
import { Link } from "@tanstack/react-router";

export function Closing() {
  return (
    <footer className="bg-lux-footer relative overflow-hidden py-12 md:py-14">
      <div className="mx-auto max-w-2xl px-5 text-center sm:px-6">
        <Ornament />
        <p className="font-script mt-5 text-xl italic md:text-3xl" style={{ color: "#F2EADA" }}>
          “The Lord bless you and keep you.”
        </p>
        <p className="font-display mt-2.5 text-[10px] font-semibold tracking-[0.4em] md:text-[11px]" style={{ color: "#C9B37E" }}>
          — NUMBERS 6:24
        </p>
        <p className="font-display mt-8 text-[10px] font-semibold tracking-[0.4em]" style={{ color: "#C9B37E" }}>
          RITHIN &amp; HARSHITA · 2026
        </p>
        <div className="mt-6">
          <Link
            to="/admin"
            aria-label="Admin"
            className="inline-flex items-center gap-1 font-display text-[9px] tracking-[0.35em] opacity-50 transition hover:opacity-90"
            style={{ color: "#C9B37E" }}
          >
            <span aria-hidden>⚙</span> ADMIN
          </Link>
        </div>
      </div>
    </footer>
  );
}