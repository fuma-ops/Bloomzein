import { Sparkles, Heart, Star } from "lucide-react";

const ICONS = [Sparkles, Heart, Star, Sparkles, Heart, Star, Sparkles, Heart];

export function SparkleRing({ radius = 220 }: { radius?: number }) {
  return (
    <div className="pointer-events-none absolute inset-0" aria-hidden>
      {ICONS.map((Icon, i) => {
        const delay = (i * 0.4).toFixed(2);
        const start = (i * 360) / ICONS.length;
        return (
          <div
            key={i}
            className="absolute left-1/2 top-1/2 h-0 w-0"
            style={{ transform: `rotate(${start}deg)` }}
          >
            <div
              className="animate-bloom-orbit"
              style={
                {
                  ["--r" as string]: `${radius}px`,
                  animationDelay: `${delay}s`,
                } as React.CSSProperties
              }
            >
              <Icon
                className="h-5 w-5 animate-bloom-sparkle text-hotpink drop-shadow-[0_0_8px_oklch(0.7_0.25_0/0.7)]"
                style={{ animationDelay: `${delay}s` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}