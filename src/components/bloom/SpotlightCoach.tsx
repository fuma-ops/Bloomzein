import { createPortal } from "react-dom";
import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { X } from "lucide-react";

/**
 * A calm guided-setup step card. The page behind gently recedes under a soft
 * pink wash EXCEPT the one section she just finished, which stays visible with a
 * soft glow so her eye lands there. A small, self-contained card floats above
 * it: a progress row (Step n of N), a short title, ONE line of guidance and ONE
 * clear CTA — never a paragraph stacked on a busy page. Non-destructive: dismiss
 * to carry on. Built with the classic huge-box-shadow cutout so it needs no SVG
 * masking and follows the target's real position.
 */
export function SpotlightCoach({
  targetId,
  title,
  message,
  extra,
  primaryLabel,
  onPrimary,
  secondaryLabel = "Look around",
  onClose,
  padding = 10,
  autoDismissMs,
  step,
  total,
}: {
  targetId: string;
  title: string;
  message: string;
  /** Optional extra content (e.g. a secondary action) above the primary CTA. */
  extra?: ReactNode;
  /** Optional primary CTA — omit for an auto-dismissing, button-less spotlight. */
  primaryLabel?: string;
  onPrimary?: () => void;
  secondaryLabel?: string;
  onClose: () => void;
  padding?: number;
  /** If set, the spotlight closes itself this many ms after it appears. */
  autoDismissMs?: number;
  /** Guided-setup progress — show a "Step n of N" row + dots when both are set. */
  step?: number;
  total?: number;
}) {
  const [rect, setRect] = useState<{ top: number; left: number; width: number; height: number } | null>(null);

  useEffect(() => {
    const el = document.getElementById(targetId);
    if (!el) return;
    // Bring the section into view, then measure once it settles.
    try { el.scrollIntoView({ behavior: "smooth", block: "center" }); } catch {}
    let dismiss: ReturnType<typeof setTimeout> | undefined;
    const measure = () => {
      const r = el.getBoundingClientRect();
      setRect({ top: r.top, left: r.left, width: r.width, height: r.height });
    };
    const t = setTimeout(() => {
      measure();
      // Auto-dismiss timer starts once the spotlight is actually visible.
      if (autoDismissMs) dismiss = setTimeout(onClose, autoDismissMs);
    }, 480);
    // Keep the cutout glued to the section through any scroll/resize.
    const onMove = () => measure();
    window.addEventListener("scroll", onMove, true);
    window.addEventListener("resize", onMove);
    return () => {
      clearTimeout(t);
      if (dismiss) clearTimeout(dismiss);
      window.removeEventListener("scroll", onMove, true);
      window.removeEventListener("resize", onMove);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetId]);

  if (!rect) return null;

  const pad = padding;
  const top = Math.max(4, rect.top - pad);
  const left = Math.max(4, rect.left - pad);
  const width = Math.min(window.innerWidth - 8, rect.width + pad * 2);
  const height = rect.height + pad * 2;

  // Put the guide card on the side with the most room, so it never covers the
  // spotlighted section.
  const centerY = rect.top + rect.height / 2;
  const cardAtTop = centerY > window.innerHeight * 0.5;

  const showProgress = typeof step === "number" && typeof total === "number" && total > 0;

  return createPortal(
    <div className="fixed inset-0 z-[130] animate-fade-in" onClick={onClose}>
      {/* The cutout: her finished section stays visible under a soft pink wash,
          with a gentle glow (no hard ring) so her eye lands there — calmly. */}
      <div
        className="absolute rounded-[1.5rem] transition-all duration-300"
        style={{
          top,
          left,
          width,
          height,
          pointerEvents: "none",
          boxShadow:
            "0 0 0 9999px rgba(80,10,42,0.46), 0 0 0 1.5px rgba(236,72,153,0.55), 0 0 30px 8px rgba(236,72,153,0.28)",
        }}
      />

      {/* Guide step card — small, calm, self-contained */}
      <div
        className={["absolute inset-x-0 flex justify-center px-5", cardAtTop ? "top-5" : "bottom-7"].join(" ")}
      >
        <div
          onClick={(e) => e.stopPropagation()}
          className="pointer-events-auto relative w-full max-w-[300px] rounded-[1.6rem] bg-white/96 p-3.5 shadow-2xl shadow-hotpink/25 ring-1 ring-petal/60 backdrop-blur-xl animate-scale-in"
        >
          <button
            onClick={onClose}
            aria-label="Dismiss"
            className="absolute right-2.5 top-2.5 grid h-6 w-6 place-items-center rounded-full bg-blush/70 text-rose transition hover:bg-petal active:scale-90"
          >
            <X className="h-3 w-3" />
          </button>

          {/* Progress — dots + "Step n of N" so she always knows where she is */}
          {showProgress && (
            <div className="mb-2.5 flex items-center gap-2 pr-6">
              <div className="flex items-center gap-1">
                {Array.from({ length: total! }).map((_, i) => (
                  <span
                    key={i}
                    className={["h-1.5 rounded-full transition-all duration-300", i < step! ? "w-4 bg-hotpink" : "w-1.5 bg-petal/60"].join(" ")}
                  />
                ))}
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wide text-hotpink/70">Step {step} of {total}</span>
            </div>
          )}

          <h2 className="font-script text-xl leading-tight text-hotpink pr-6">{title}</h2>
          <p className="mt-1 text-[12px] leading-snug text-rose/75">{message}</p>
          {extra}
          {primaryLabel && onPrimary && (
            <>
              <button
                onClick={onPrimary}
                className="bloom-luxury-btn hover-scale animate-cta-bounce mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded-full py-2.5 text-[13px] font-bold text-white"
              >
                {primaryLabel}
              </button>
              <button
                onClick={onClose}
                className="mt-1.5 w-full text-center text-[11px] font-semibold text-rose/55 transition hover:text-hotpink"
              >
                {secondaryLabel}
              </button>
            </>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
