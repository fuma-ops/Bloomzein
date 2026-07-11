import { createPortal } from "react-dom";
import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { Sparkles, X } from "lucide-react";

/**
 * A "Barbie-tour" spotlight coach-mark: everything on the page is dimmed with a
 * soft pink mask EXCEPT one target section, which is cut out and ringed so she
 * looks only there — with a little guide message + CTA. Built with the classic
 * huge-box-shadow cutout so it needs no SVG masking and follows the target's
 * real position. Non-destructive: dismiss to carry on.
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
}: {
  targetId: string;
  title: string;
  message: string;
  /** Optional extra content (e.g. a secondary action) above the primary CTA. */
  extra?: ReactNode;
  primaryLabel: string;
  onPrimary: () => void;
  secondaryLabel?: string;
  onClose: () => void;
  padding?: number;
}) {
  const [rect, setRect] = useState<{ top: number; left: number; width: number; height: number } | null>(null);

  useEffect(() => {
    const el = document.getElementById(targetId);
    if (!el) return;
    // Bring the section into view, then measure once it settles.
    try { el.scrollIntoView({ behavior: "smooth", block: "center" }); } catch {}
    const measure = () => {
      const r = el.getBoundingClientRect();
      setRect({ top: r.top, left: r.left, width: r.width, height: r.height });
    };
    const t = setTimeout(measure, 480);
    // Keep the cutout glued to the section through any scroll/resize.
    const onMove = () => measure();
    window.addEventListener("scroll", onMove, true);
    window.addEventListener("resize", onMove);
    return () => {
      clearTimeout(t);
      window.removeEventListener("scroll", onMove, true);
      window.removeEventListener("resize", onMove);
    };
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

  return createPortal(
    <div className="fixed inset-0 z-[130] animate-fade-in" onClick={onClose}>
      {/* The cutout: transparent window + a giant soft-pink shadow that dims the rest */}
      <div
        className="absolute rounded-[1.5rem] transition-all duration-300"
        style={{
          top,
          left,
          width,
          height,
          pointerEvents: "none",
          boxShadow:
            "0 0 0 9999px rgba(80,10,42,0.60), 0 0 0 3px rgba(236,72,153,0.95), 0 0 34px 6px rgba(236,72,153,0.5)",
        }}
      />

      {/* Guide message card */}
      <div
        className={["absolute inset-x-0 flex justify-center px-4", cardAtTop ? "top-4" : "bottom-6"].join(" ")}
      >
        <div
          onClick={(e) => e.stopPropagation()}
          className="pointer-events-auto w-full max-w-sm rounded-[1.75rem] bg-white/97 p-4 shadow-2xl shadow-hotpink/40 ring-1 ring-petal/60 backdrop-blur-xl animate-scale-in"
        >
          <button
            onClick={onClose}
            aria-label="Dismiss"
            className="absolute right-3 top-3 grid h-7 w-7 place-items-center rounded-full bg-blush/70 text-rose transition hover:bg-petal active:scale-90"
          >
            <X className="h-3.5 w-3.5" />
          </button>
          <div className="flex items-center gap-3 pr-7">
            <span className="clay-blob animate-icon-breathe grid h-11 w-11 shrink-0 place-items-center rounded-2xl text-white">
              <Sparkles className="h-5 w-5" strokeWidth={1.8} />
            </span>
            <div className="min-w-0">
              <h2 className="font-script text-2xl leading-tight text-hotpink">{title}</h2>
            </div>
          </div>
          <p className="mt-2 text-[12.5px] leading-snug text-rose/75">{message}</p>
          {extra}
          <button
            onClick={onPrimary}
            className="bloom-luxury-btn hover-scale animate-cta-bounce mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded-full py-2.5 text-sm font-bold text-white"
          >
            <Sparkles className="h-4 w-4" strokeWidth={2} /> {primaryLabel}
          </button>
          <button
            onClick={onClose}
            className="mt-1.5 w-full text-center text-[11px] font-semibold text-rose/55 transition hover:text-hotpink"
          >
            {secondaryLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
