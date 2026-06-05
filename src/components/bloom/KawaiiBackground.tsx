import { useMemo } from "react";
import { Heart, Star, Flower2, Sparkles } from "lucide-react";

const ICONS = [Heart, Star, Flower2, Sparkles];

interface Props {
  count?: number;
  className?: string;
}

/**
 * Dreamy kawaii 3D-style animated pink gradient background.
 * Layers: animated pink gradient + floating drifting glossy shapes
 * (hearts, stars, flowers, sparkles) with depth via blur and scale.
 */
export function KawaiiBackground({ count = 14, className = "" }: Props) {
  const items = useMemo(() => {
    return Array.from({ length: count }).map((_, i) => {
      const Icon = ICONS[i % ICONS.length];
      const size = 22 + Math.round(Math.random() * 58);
      const top = Math.round(Math.random() * 92);
      const left = Math.round(Math.random() * 92);
      const delay = -Math.round(Math.random() * 16 * 10) / 10;
      const duration = 12 + Math.round(Math.random() * 14);
      const depth = Math.random(); // 0..1 -> blur + opacity
      const blur = depth < 0.35 ? 0 : depth < 0.7 ? 1 : 3;
      const opacity = 0.35 + (1 - depth) * 0.55;
      const hue = Math.random() > 0.5 ? "text-hotpink" : "text-magenta";
      return { i, Icon, size, top, left, delay, duration, blur, opacity, hue };
    });
  }, [count]);

  return (
    <div
      aria-hidden
      className={`pointer-events-none absolute inset-0 -z-10 overflow-hidden bloom-kawaii-bg ${className}`}
    >
      {/* glossy orbs */}
      <span className="absolute -left-24 top-10 h-80 w-80 rounded-full bg-hotpink/20 blur-3xl animate-bloom-pulse" />
      <span className="absolute right-0 top-1/3 h-96 w-96 rounded-full bg-magenta/20 blur-3xl animate-bloom-pulse" style={{ animationDelay: "1.5s" }} />
      <span className="absolute bottom-0 left-1/3 h-80 w-80 rounded-full bg-petal/50 blur-3xl animate-bloom-pulse" style={{ animationDelay: "3s" }} />

      {/* drifting kawaii icons */}
      {items.map((it) => {
        const Icon = it.Icon;
        return (
          <span
            key={it.i}
            className={`absolute animate-bloom-drift ${it.hue} drop-shadow-[0_6px_12px_oklch(0.7_0.25_350_/_0.45)]`}
            style={{
              top: `${it.top}%`,
              left: `${it.left}%`,
              animationDelay: `${it.delay}s`,
              animationDuration: `${it.duration}s`,
              opacity: it.opacity,
              filter: it.blur ? `blur(${it.blur}px)` : undefined,
            }}
          >
            <Icon style={{ width: it.size, height: it.size }} className="fill-current/30" />
          </span>
        );
      })}

      {/* tiny sparkles */}
      {Array.from({ length: 16 }).map((_, i) => (
        <span
          key={`s-${i}`}
          className="absolute h-1.5 w-1.5 rounded-full bg-white shadow-[0_0_8px_2px_oklch(0.85_0.2_350_/_0.8)] animate-bloom-sparkle"
          style={{
            top: `${Math.round(Math.random() * 100)}%`,
            left: `${Math.round(Math.random() * 100)}%`,
            animationDelay: `${(-Math.random() * 3).toFixed(1)}s`,
          }}
        />
      ))}
    </div>
  );
}