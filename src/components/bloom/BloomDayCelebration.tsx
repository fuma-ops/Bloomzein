import { createPortal } from "react-dom";
import { useEffect, useMemo, useState } from "react";
import { Heart, Sparkles, Star, Flower2 } from "lucide-react";

/**
 * A one-shot "you fully bloomed today!" moment — a soft Barbie-pink burst of
 * cute icons exploding from the centre of the screen with a little celebration
 * card. NON-blocking (pointer-events-none) and self-dismissing, so she gets the
 * wow without anything getting in her way. Fired once per day from Today when
 * the Bloom checklist hits 100%.
 */
const ICONS = [Heart, Sparkles, Star, Flower2];
const COLORS = ["#EC4899", "#DB2777", "#F472B6", "#F9A8D4", "#BE185D", "#FBCFE8", "#FDE68A"];

export function BloomDayCelebration({ onDone }: { onDone: () => void }) {
  const [leaving, setLeaving] = useState(false);

  // A burst of confetti pieces, computed once — each flies out on its own angle.
  const pieces = useMemo(
    () =>
      Array.from({ length: 46 }, (_, i) => {
        const angle = Math.random() * Math.PI * 2;
        const dist = 120 + Math.random() * 280;
        return {
          id: i,
          Icon: ICONS[i % ICONS.length],
          color: COLORS[Math.floor(Math.random() * COLORS.length)],
          dx: Math.cos(angle) * dist,
          dy: Math.sin(angle) * dist - 70, // gentle upward bias — a joyful pop
          size: 14 + Math.random() * 22,
          delay: Math.random() * 140,
          rot: Math.random() * 720 - 360,
          dur: 1500 + Math.random() * 1000,
        };
      }),
    [],
  );

  useEffect(() => {
    const t1 = setTimeout(() => setLeaving(true), 2700);
    const t2 = setTimeout(onDone, 3500);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [onDone]);

  return createPortal(
    <div className={["pointer-events-none fixed inset-0 z-[120] overflow-hidden transition-opacity duration-700", leaving ? "opacity-0" : "opacity-100"].join(" ")}>
      {/* soft pink flash behind the burst */}
      <div className="absolute inset-0 animate-fade-in" style={{ background: "radial-gradient(circle at 50% 42%, rgba(236,72,153,0.18), transparent 62%)" }} />

      {/* confetti exploding from the centre */}
      <div className="absolute left-1/2 top-[42%]">
        {pieces.map((p) => {
          const Icon = p.Icon;
          return (
            <span
              key={p.id}
              className="bloom-burst-piece absolute block"
              style={{
                ["--dx" as string]: `${p.dx}px`,
                ["--dy" as string]: `${p.dy}px`,
                ["--rot" as string]: `${p.rot}deg`,
                animationDelay: `${p.delay}ms`,
                animationDuration: `${p.dur}ms`,
                color: p.color,
              } as React.CSSProperties}
            >
              <Icon style={{ width: p.size, height: p.size }} fill="currentColor" strokeWidth={1.5} />
            </span>
          );
        })}
      </div>

      {/* centred celebration card */}
      <div className="absolute inset-x-0 top-[37%] flex justify-center px-6">
        <div className="rounded-[2rem] bg-white/95 px-7 py-5 text-center shadow-2xl shadow-hotpink/40 ring-1 ring-petal/60 backdrop-blur-xl animate-scale-in">
          <div className="clay-blob animate-icon-breathe mx-auto mb-2 grid h-14 w-14 place-items-center rounded-full text-white">
            <Star className="h-7 w-7" fill="currentColor" strokeWidth={1.5} />
          </div>
          <p className="font-script text-3xl text-hotpink leading-none">Day complete!</p>
          <p className="mt-1.5 text-[12.5px] font-semibold text-rose/70">You fully bloomed today, gorgeous — every petal ticked ✿</p>
        </div>
      </div>
    </div>,
    document.body,
  );
}
