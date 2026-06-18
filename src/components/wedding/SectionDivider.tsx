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
        className={`h-px w-20 max-w-[28vw] bg-gradient-to-r from-transparent ${t.line} to-transparent sm:w-40`}
      />
      <svg
        width="64"
        height="22"
        viewBox="0 0 64 22"
        fill="none"
        className={t.glyph}
      >
        {/* Left flourish */}
        <path
          d="M2 11 Q9 4 16 11 Q20 14 24 11"
          stroke="currentColor"
          strokeWidth="0.8"
          strokeLinecap="round"
          fill="none"
        />
        <path
          d="M8 11 Q12 7 16 11"
          stroke="currentColor"
          strokeWidth="0.5"
          strokeLinecap="round"
          fill="none"
          opacity="0.7"
        />
        {/* Centre diamond + dot */}
        <path
          d="M28 11 L32 6 L36 11 L32 16 Z"
          stroke="currentColor"
          strokeWidth="0.8"
          fill="none"
        />
        <circle cx="32" cy="11" r="1.3" fill="currentColor" />
        {/* Right flourish (mirror) */}
        <path
          d="M62 11 Q55 4 48 11 Q44 14 40 11"
          stroke="currentColor"
          strokeWidth="0.8"
          strokeLinecap="round"
          fill="none"
        />
        <path
          d="M56 11 Q52 7 48 11"
          stroke="currentColor"
          strokeWidth="0.5"
          strokeLinecap="round"
          fill="none"
          opacity="0.7"
        />
      </svg>
      <span
        className={`h-px w-20 max-w-[28vw] bg-gradient-to-l from-transparent ${t.line} to-transparent sm:w-40`}
      />
    </div>
  );
}