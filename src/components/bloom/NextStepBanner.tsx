import { Sparkles, ArrowRight } from "lucide-react";

/* ============================================================
   NextStepBanner — a soft, always-there "here's what to do next"
   nudge (mirrors the Budget Planner smart-guide banner). Keeps the
   user guided even after the tour, until they've taken the step.
============================================================ */

export function NextStepBanner({
  label,
  hint,
  actionLabel,
  onAction,
  className = "",
}: {
  label: string;
  hint: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}) {
  return (
    <div className={`relative overflow-hidden rounded-2xl border border-petal/60 bg-gradient-to-r from-blush/60 via-white to-petal/30 px-3.5 py-3 shadow-sm animate-fade-in ${className}`}>
      <div className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full bg-hotpink/15 blur-2xl" />
      <div className="relative flex items-center gap-3">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-2xl bg-hotpink text-white shadow-md shadow-hotpink/30 animate-icon-breathe">
          <Sparkles className="h-4 w-4" strokeWidth={1.8} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-bold uppercase tracking-wider text-rose/55">Next step</p>
          <p className="text-sm font-bold text-rose leading-tight">{label}</p>
          <p className="text-[11px] text-rose/70 leading-snug">{hint}</p>
        </div>
        {actionLabel && onAction && (
          <button
            onClick={onAction}
            className="shrink-0 inline-flex items-center gap-1 rounded-full bg-hotpink text-white px-3.5 py-2 text-[11px] font-bold shadow-sm shadow-hotpink/30 active:scale-95 transition animate-cta-bounce"
          >
            {actionLabel} <ArrowRight className="h-3 w-3" />
          </button>
        )}
      </div>
    </div>
  );
}
