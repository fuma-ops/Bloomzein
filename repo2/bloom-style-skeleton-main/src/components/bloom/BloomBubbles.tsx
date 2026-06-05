import { useMemo } from "react";

interface Props {
  count?: number;
  className?: string;
}

/** Soft translucent 3D pink bubbles slowly floating up. Purely decorative. */
export function BloomBubbles({ count = 18, className = "" }: Props) {
  const bubbles = useMemo(() => {
    return Array.from({ length: count }).map((_, i) => {
      const size = 28 + Math.round(Math.random() * 110); // 28-138px
      const left = Math.round(Math.random() * 100);
      const delay = -Math.round(Math.random() * 18 * 10) / 10; // negative so they're mid-flight on mount
      const duration = 14 + Math.round(Math.random() * 16); // 14-30s
      const drift = (Math.random() * 40 - 20).toFixed(0) + "px";
      const opacity = 0.35 + Math.random() * 0.45;
      return { i, size, left, delay, duration, drift, opacity };
    });
  }, [count]);

  return (
    <div
      aria-hidden
      className={`pointer-events-none absolute inset-0 -z-10 overflow-hidden ${className}`}
    >
      {bubbles.map((b) => (
        <span
          key={b.i}
          className="absolute bottom-[-160px] rounded-full bloom-bubble animate-bloom-rise"
          style={{
            width: b.size,
            height: b.size,
            left: `${b.left}%`,
            animationDelay: `${b.delay}s`,
            animationDuration: `${b.duration}s`,
            opacity: b.opacity,
            // @ts-expect-error custom CSS var
            "--drift": b.drift,
          }}
        />
      ))}
    </div>
  );
}