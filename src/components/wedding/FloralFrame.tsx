function Corner({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 160 160"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden
    >
      <g stroke="currentColor" strokeWidth="0.9" strokeLinecap="round" fill="none" opacity="0.95">
        {/* main vine */}
        <path d="M4 4 C 40 18, 70 40, 86 80 S 130 140, 156 156" />
        {/* secondary branch */}
        <path d="M22 6 C 36 28, 52 44, 70 56" opacity="0.7" />
        <path d="M6 22 C 28 36, 44 52, 56 70" opacity="0.7" />
        {/* tendrils */}
        <path d="M70 56 q 10 -2 14 -10" opacity="0.6" />
        <path d="M56 70 q -2 10 -10 14" opacity="0.6" />
        <path d="M100 96 q 14 0 20 -10" opacity="0.55" />
        <path d="M96 100 q 0 14 -10 20" opacity="0.55" />
      </g>
      <g fill="currentColor" opacity="0.85">
        {/* leaves */}
        <path d="M40 20 q 10 -4 16 4 q -10 4 -16 -4 z" opacity="0.55" />
        <path d="M20 40 q -4 10 4 16 q 4 -10 -4 -16 z" opacity="0.55" />
        <path d="M76 60 q 12 -2 18 8 q -12 4 -18 -8 z" opacity="0.5" />
        <path d="M60 76 q -2 12 8 18 q 4 -12 -8 -18 z" opacity="0.5" />
        <path d="M120 110 q 12 -2 18 8 q -12 4 -18 -8 z" opacity="0.45" />
      </g>
      <g fill="currentColor" opacity="0.9">
        {/* tiny blossoms (5 petals) */}
        <g transform="translate(30 30)">
          <circle r="1.6" />
          <circle cx="3.2" cy="0" r="1.6" opacity="0.7" />
          <circle cx="-3.2" cy="0" r="1.6" opacity="0.7" />
          <circle cx="0" cy="3.2" r="1.6" opacity="0.7" />
          <circle cx="0" cy="-3.2" r="1.6" opacity="0.7" />
        </g>
        <g transform="translate(90 70)">
          <circle r="1.4" />
          <circle cx="2.8" cy="0" r="1.4" opacity="0.65" />
          <circle cx="-2.8" cy="0" r="1.4" opacity="0.65" />
          <circle cx="0" cy="2.8" r="1.4" opacity="0.65" />
          <circle cx="0" cy="-2.8" r="1.4" opacity="0.65" />
        </g>
        <g transform="translate(70 90)">
          <circle r="1.2" opacity="0.7" />
        </g>
        <g transform="translate(130 124)">
          <circle r="1.4" opacity="0.7" />
        </g>
      </g>
    </svg>
  );
}

/**
 * Fixed, viewport-anchored floral corner decorations.
 * Pointer-events disabled, painted in soft gold so they never obstruct content.
 */
export function FloralFrame() {
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-[5] text-[oklch(0.72_0.11_80)]"
    >
      {/* Top-left */}
      <Corner className="absolute -left-2 -top-2 h-24 w-24 opacity-50 sm:h-32 sm:w-32 md:h-44 md:w-44 lg:h-52 lg:w-52" />
      {/* Top-right (mirror horizontally) */}
      <Corner className="absolute -right-2 -top-2 h-24 w-24 -scale-x-100 opacity-50 sm:h-32 sm:w-32 md:h-44 md:w-44 lg:h-52 lg:w-52" />
      {/* Bottom-left (mirror vertically) */}
      <Corner className="absolute -bottom-2 -left-2 h-24 w-24 -scale-y-100 opacity-50 sm:h-32 sm:w-32 md:h-44 md:w-44 lg:h-52 lg:w-52" />
      {/* Bottom-right (mirror both) */}
      <Corner className="absolute -bottom-2 -right-2 h-24 w-24 -scale-100 opacity-50 sm:h-32 sm:w-32 md:h-44 md:w-44 lg:h-52 lg:w-52" />
    </div>
  );
}