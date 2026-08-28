import { useMemo } from "react";

// Deterministic pseudo-random so the server and client render identical
// petals (Math.random() caused a hydration mismatch).
function rand(seed: number) {
  const x = Math.sin(seed * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

export function Petals({ count = 24 }: { count?: number }) {
  const petals = useMemo(
    () =>
      Array.from({ length: count }).map((_, i) => ({
        // Rounded so SSR markup and client props stringify identically.
        left: +(rand(i + 1) * 100).toFixed(3),
        delay: +(rand(i + 101) * 12).toFixed(3),
        duration: +(12 + rand(i + 201) * 14).toFixed(3),
        size: +(8 + rand(i + 301) * 14).toFixed(3),
        kind: rand(i + 401) > 0.5 ? "rose" : "jasmine",
        rot: +(rand(i + 501) * 360).toFixed(3),
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
            width: `${p.size}px`,
            height: `${p.size}px`,
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