import { useMemo } from "react";
import { useReducedMotion } from "motion/react";

type Petal = {
  left: number;
  delay: number;
  duration: number;
  size: number;
  kind: "rose" | "jasmine";
  rot: number;
};

function seededRandom(seed: number) {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

function buildPetals(count: number): Petal[] {
  return Array.from({ length: Math.min(count, 18) }).map((_, i) => ({
    left: seededRandom(i + 1) * 100,
    delay: seededRandom(i + 11) * 12,
    duration: 14 + seededRandom(i + 21) * 10,
    size: 8 + seededRandom(i + 31) * 12,
    kind: seededRandom(i + 41) > 0.5 ? "rose" : "jasmine",
    rot: seededRandom(i + 51) * 360,
  }));
}

export function Petals({ count = 18 }: { count?: number }) {
  const shouldReduceMotion = useReducedMotion();
  const petals = useMemo(() => buildPetals(count), [count]);

  if (shouldReduceMotion) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-20 overflow-hidden contain-paint">
      {petals.map((p, i) => (
        <span
          key={i}
          className="petal absolute top-0 block will-change-transform"
          style={{
            left: `${p.left}%`,
            animationDelay: `-${p.delay}s`,
            animationDuration: `${p.duration}s`,
            width: p.size,
            height: p.size,
            rotate: `${p.rot}deg`,
          }}
        >
          {p.kind === "rose" ? (
            <svg viewBox="0 0 20 20" fill="none" aria-hidden>
              <path
                d="M10 2c2 3 6 4 6 8s-3 8-6 8-6-4-6-8 4-5 6-8z"
                fill="#f4c2c8"
                opacity="0.8"
              />
            </svg>
          ) : (
            <svg viewBox="0 0 20 20" fill="none" aria-hidden>
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
