type Variant = "light" | "warm" | "dark";

const tones: Record<Variant, { bg: string; line: string; glyph: string }> = {
  light: {
    bg: "bg-transparent",
    line: "via-[oklch(0.72_0.11_80)]/60",
    glyph: "text-[oklch(0.72_0.11_80)]",
  },
  warm: {
    bg: "bg-gradient-to-b from-[#F2EADA] to-[#FBF8F1]",
    line: "via-[oklch(0.72_0.11_80)]/55",
    glyph: "text-[oklch(0.72_0.11_80)]",
  },
  dark: {
    bg: "bg-[#2E2A26]",
    line: "via-[oklch(0.72_0.11_80)]/70",
    glyph: "text-[oklch(0.78_0.12_80)]",
  },
};

export function SectionDivider({
  variant = "light",
  className = "",
}: {
  variant?: Variant;
  className?: string;
}) {
  const t = tones[variant];
  return (
    <div
      aria-hidden
      className={`${t.bg} relative flex items-center justify-center gap-4 px-6 py-6 sm:py-8 ${className}`}
    >
      <span
        className={`h-px w-16 max-w-[22vw] bg-gradient-to-r from-transparent ${t.line} to-transparent sm:w-28`}
      />
      <svg
        width="28"
        height="14"
        viewBox="0 0 28 14"
        fill="none"
        className={t.glyph}
      >
        <path
          d="M1 7 Q7 1 14 7 Q21 13 27 7"
          stroke="currentColor"
          strokeWidth="0.9"
          fill="none"
        />
        <circle cx="14" cy="7" r="1.4" fill="currentColor" />
      </svg>
      <span
        className={`h-px w-16 max-w-[22vw] bg-gradient-to-l from-transparent ${t.line} to-transparent sm:w-28`}
      />
    </div>
  );
}