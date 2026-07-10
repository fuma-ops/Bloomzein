import { createPortal } from "react-dom";
import { Sparkles } from "lucide-react";
import type { ReactNode } from "react";

/**
 * The soft, gentle full-screen "you did it!" moment used at every guided-setup
 * step (cycle, meals, diet, movement) so the whole journey feels like one cute,
 * continuous flow. Portaled to body so it always centres in the viewport.
 */
export function SetupCelebration({
  title,
  message,
  extra,
  continueLabel = "Continue on Today",
  onContinue,
  stayLabel = "Stay here",
  onStay,
  icon,
}: {
  title: string;
  message: string;
  extra?: ReactNode;
  continueLabel?: string;
  onContinue: () => void;
  stayLabel?: string;
  onStay: () => void;
  icon?: ReactNode;
}) {
  return createPortal(
    <div
      className="fixed inset-0 z-[95] flex items-center justify-center overflow-hidden p-5 animate-fade-in"
      style={{ background: "radial-gradient(120% 120% at 50% 0%, rgba(255,182,217,0.97) 0%, rgba(252,231,243,0.98) 46%, rgba(255,240,248,0.99) 100%)" }}
    >
      {Array.from({ length: 10 }).map((_, i) => (
        <Sparkles
          key={i}
          aria-hidden
          className="pointer-events-none absolute animate-bloom-sparkle text-hotpink/40"
          strokeWidth={1.6}
          style={{ left: `${8 + (i * 37) % 84}%`, top: `${12 + (i * 53) % 70}%`, width: 10 + (i % 3) * 6, height: 10 + (i % 3) * 6, animationDelay: `${(i % 5) * 0.4}s` }}
        />
      ))}
      <div className="relative w-full max-w-sm text-center animate-scale-in">
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-3xl bg-gradient-to-br from-hotpink to-[#DB2777] shadow-xl shadow-hotpink/40 animate-icon-breathe">
          {icon ?? <Sparkles className="h-8 w-8 text-white" strokeWidth={1.8} />}
        </div>
        <h2 className="mt-4 font-script text-4xl leading-tight text-hotpink">{title}</h2>
        <p className="mx-auto mt-3 max-w-xs text-[13px] leading-relaxed text-rose/80">{message}</p>
        {extra}
        <button
          onClick={onContinue}
          className="bloom-luxury-btn hover-scale animate-cta-bounce mt-6 inline-flex w-full items-center justify-center gap-1.5 rounded-full py-3 text-sm font-bold text-white"
        >
          <Sparkles className="h-4 w-4" strokeWidth={2} /> {continueLabel}
        </button>
        <button onClick={onStay} className="mt-3 text-xs font-semibold text-rose/50 transition hover:text-hotpink">
          {stayLabel}
        </button>
      </div>
    </div>,
    document.body
  );
}
