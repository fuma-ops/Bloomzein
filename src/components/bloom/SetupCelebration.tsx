import { createPortal } from "react-dom";
import { useEffect } from "react";
import { Sparkles, X } from "lucide-react";
import type { ReactNode } from "react";

/**
 * A soft "you did it!" moment for each guided-setup step — but NON-blocking: it
 * sits at the TOP of the screen and gently scrolls her freshly-made plan into
 * view below, so she actually SEES what she just set up. She can Continue on
 * Today, or dismiss and keep exploring the tool.
 */
export function SetupCelebration({
  title,
  message,
  extra,
  continueLabel = "Continue on Today",
  onContinue,
  onStay,
  icon,
  scrollToId,
}: {
  title: string;
  message: string;
  extra?: ReactNode;
  continueLabel?: string;
  onContinue: () => void;
  stayLabel?: string;
  onStay: () => void;
  icon?: ReactNode;
  /** Element id of the thing she just made — auto-scrolled into view below the banner. */
  scrollToId?: string;
}) {
  useEffect(() => {
    if (!scrollToId) return;
    const t = setTimeout(() => {
      try {
        const el = document.getElementById(scrollToId);
        if (el) {
          const y = el.getBoundingClientRect().top + window.scrollY - 172; // clear the top banner
          window.scrollTo({ top: Math.max(0, y), behavior: "smooth" });
        }
      } catch {}
    }, 260);
    return () => clearTimeout(t);
  }, [scrollToId]);

  return createPortal(
    <div className="pointer-events-none fixed inset-x-0 top-0 z-[95] px-3 pt-3 sm:px-4 sm:pt-4">
      <div className="pointer-events-auto relative mx-auto w-full max-w-md animate-scale-in rounded-[1.75rem] bg-white/97 p-4 shadow-2xl shadow-hotpink/30 ring-1 ring-petal/60 backdrop-blur-xl">
        <button
          onClick={onStay}
          aria-label="Dismiss"
          className="absolute right-3 top-3 grid h-7 w-7 place-items-center rounded-full bg-blush/70 text-rose transition hover:bg-petal"
        >
          <X className="h-3.5 w-3.5" />
        </button>
        <div className="flex items-center gap-3 pr-7">
          <span className="clay-blob grid h-12 w-12 shrink-0 place-items-center rounded-2xl text-white animate-icon-breathe">
            {icon ?? <Sparkles className="h-6 w-6" strokeWidth={1.8} />}
          </span>
          <div className="min-w-0">
            <h2 className="font-script text-2xl leading-tight text-hotpink">{title}</h2>
            <p className="mt-0.5 text-[12px] leading-snug text-rose/75">{message}</p>
          </div>
        </div>
        {extra}
        <button
          onClick={onContinue}
          className="bloom-luxury-btn hover-scale animate-cta-bounce mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded-full py-2.5 text-sm font-bold text-white"
        >
          <Sparkles className="h-4 w-4" strokeWidth={2} /> {continueLabel}
        </button>
        <p className="mt-1.5 text-center text-[10px] text-rose/45">or dismiss to look around — your progress is saved ✿</p>
      </div>
    </div>,
    document.body
  );
}
