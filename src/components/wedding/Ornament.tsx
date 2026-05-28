export function Ornament({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-center justify-center gap-3 text-[oklch(0.72_0.11_80)] ${className}`}>
      <span className="h-px w-12 bg-gradient-to-r from-transparent to-[oklch(0.72_0.11_80)]" />
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
        <path
          d="M12 2l2.4 6.6L21 11l-6.6 2.4L12 20l-2.4-6.6L3 11l6.6-2.4L12 2z"
          fill="currentColor"
          opacity="0.9"
        />
      </svg>
      <span className="h-px w-12 bg-gradient-to-l from-transparent to-[oklch(0.72_0.11_80)]" />
    </div>
  );
}

export function CornerFlourish({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 80 80" fill="none">
      <path
        d="M2 2 Q40 2 40 40 Q40 78 78 78"
        stroke="currentColor"
        strokeWidth="0.8"
        fill="none"
      />
      <circle cx="2" cy="2" r="2" fill="currentColor" />
      <circle cx="40" cy="40" r="1.5" fill="currentColor" />
      <path
        d="M10 2 Q22 10 30 22 Q22 14 14 6"
        stroke="currentColor"
        strokeWidth="0.6"
        fill="currentColor"
        fillOpacity="0.15"
      />
    </svg>
  );
}