import { useMemo } from "react";

/**
 * Cute dynamic 3D-style floating bubbles background.
 * Pure CSS, gentle drift upward, glossy translucent pink spheres.
 */
export function BudgetBubbles({ count = 22 }: { count?: number }) {
  const bubbles = useMemo(
    () =>
      Array.from({ length: count }).map((_, i) => {
        const size = 24 + Math.random() * 110;
        const left = Math.random() * 100;
        const delay = -Math.random() * 18;
        const duration = 14 + Math.random() * 16;
        const drift = (Math.random() - 0.5) * 80;
        const hue = Math.random() > 0.5 ? "#FBCFE8" : "#FFD9EC";
        const hue2 = Math.random() > 0.5 ? "#F9A8D4" : "#FECDD3";
        return { i, size, left, delay, duration, drift, hue, hue2 };
      }),
    [count],
  );

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {bubbles.map((b) => (
        <span
          key={b.i}
          className="bb-bubble"
          style={{
            width: b.size,
            height: b.size,
            left: `${b.left}%`,
            animationDelay: `${b.delay}s`,
            animationDuration: `${b.duration}s`,
            ["--drift" as never]: `${b.drift}px`,
            background: `radial-gradient(circle at 30% 28%, rgba(255,255,255,0.95) 0%, ${b.hue} 35%, ${b.hue2} 70%, rgba(236,72,153,0.35) 100%)`,
            boxShadow: `inset -6px -8px 16px rgba(190,24,93,0.18), 0 6px 22px rgba(236,72,153,0.20)`,
          }}
        />
      ))}
      <style>{`
        .bb-bubble {
          position: absolute;
          bottom: -160px;
          border-radius: 9999px;
          opacity: 0.85;
          animation-name: bb-rise;
          animation-timing-function: ease-in-out;
          animation-iteration-count: infinite;
          will-change: transform, opacity;
          filter: blur(0.3px);
        }
        .bb-bubble::after {
          content: "";
          position: absolute;
          top: 12%; left: 18%;
          width: 28%; height: 22%;
          border-radius: 9999px;
          background: radial-gradient(circle, rgba(255,255,255,0.95), rgba(255,255,255,0) 70%);
          filter: blur(1px);
        }
        @keyframes bb-rise {
          0%   { transform: translate3d(0, 0, 0) scale(0.85); opacity: 0; }
          12%  { opacity: 0.9; }
          50%  { transform: translate3d(calc(var(--drift) * 0.5), -55vh, 0) scale(1); }
          90%  { opacity: 0.85; }
          100% { transform: translate3d(var(--drift), -115vh, 0) scale(1.05); opacity: 0; }
        }
        @media (prefers-reduced-motion: reduce) {
          .bb-bubble { animation: none; opacity: 0.5; }
        }
      `}</style>
    </div>
  );
}

export default BudgetBubbles;