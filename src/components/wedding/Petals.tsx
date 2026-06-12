import { useMemo } from "react";

export function Petals({ count = 24 }: { count?: number }) {
  const petals = useMemo(
    () =>
      Array.from({ length: count }).map((_, i) => ({
        left: Math.random() * 100,
        delay: Math.random() * 12,
        duration: 12 + Math.random() * 14,
        size: 8 + Math.random() * 14,
        kind: Math.random() > 0.5 ? "rose" : "jasmine",
        rot: Math.random() * 360,
      })),
    [count],
  );
  return (
    <div className="pointer-events-none fixed inset-0 z-20 overflow-hidden">
      {petals.map((p, i) => (
        <span
          key={i}
          className="petal absolute top-0 block"
          style={{
            left: `${p.left}%`,
            animationDelay: `-${p.delay}s`,
            animationDuration: `${p.duration}s`,
            width: p.size,
            height: p.size,
            transform: `rotate(${p.rot}deg) translateZ(0)`,
            willChange: "transform, opacity",
          }}
        >
          {p.kind === "rose" ? (
            <svg viewBox="0 0 20 20" fill="none">
              <path
                d="M10 2c2 3 6 4 6 8s-3 8-6 8-6-4-6-8 4-5 6-8z"
                fill="#f4c2c8"
                opacity="0.8"
              />
            </svg>
          ) : (
            <svg viewBox="0 0 20 20" fill="none">
              <circle cx="10" cy="10" r="3" fill="#fff8e6" />
              <ellipse cx="10" cy="4" rx="2.4" ry="4" fill="#ffffff" opacity="0.95" />
              <ellipse cx="10" cy="16" rx="2.4" ry="4" fill="#ffffff" opacity="0.95" />
              <ellipse cx="4" cy="10" rx="4" ry="2.4" fill="#ffffff" opacity="0.95" />
              <ellipse cx="16" cy="10" rx="4" ry="2.4" fill="#ffffff" opacity="0.95" />
            </svg>
          )}
        </span>
      ))}
    </div>
  );
}