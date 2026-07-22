import { useState } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, Check, type LucideIcon } from "lucide-react";

/* ============================================================
   PickerField — an on-brand replacement for a native <select>.
   Tapping the field opens a soft pink bottom-sheet (portaled to
   document.body so it's never trapped/cropped) with the options
   as tappable rows; the selected one is highlighted with a check.
============================================================ */

export interface PickerOption {
  value: string;
  label: string;
}

export function PickerField({
  value,
  options,
  onChange,
  title,
  className = "",
  icon: Icon,
  variant = "field",
}: {
  value: string;
  options: PickerOption[];
  onChange: (v: string) => void;
  /** Sheet heading, e.g. "Choose a zone". */
  title?: string;
  /** Extra classes for the trigger button (width, etc). */
  className?: string;
  /** Optional leading icon in the trigger (e.g. a bell for a reminder). */
  icon?: LucideIcon;
  /** "field" = boxed select look; "pill" = soft rounded-full chip. */
  variant?: "field" | "pill";
}) {
  const [open, setOpen] = useState(false);
  const current = options.find((o) => o.value === value);
  const triggerClass = variant === "pill"
    ? "inline-flex items-center justify-between gap-1 rounded-full bg-blush/60 border border-petal/60 pl-2 pr-1.5 py-1 text-[11px] font-semibold text-rose outline-none transition hover:border-hotpink/50 active:scale-[0.98]"
    : "inline-flex items-center justify-between gap-1 rounded-lg bg-white border border-petal/60 px-2.5 py-1.5 text-[11px] font-semibold text-rose outline-none transition hover:border-hotpink/50 active:scale-[0.98]";

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`${triggerClass} ${className}`}
      >
        {Icon && <Icon className="h-3.5 w-3.5 shrink-0 text-hotpink/80" />}
        <span className="truncate">{current?.label ?? "Select"}</span>
        <ChevronDown className="h-3.5 w-3.5 shrink-0 text-hotpink/70" />
      </button>

      {open && createPortal(
        <div
          className="fixed inset-0 z-[90] flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm p-0 sm:p-4 animate-fade-in"
          onClick={() => setOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full sm:max-w-sm max-h-[72vh] overflow-y-auto rounded-t-[2rem] sm:rounded-[2rem] bg-white shadow-2xl border border-petal/50 animate-scale-in"
          >
            {title && (
              <div className="sticky top-0 z-10 bg-white/95 backdrop-blur px-5 pt-4 pb-2.5 border-b border-petal/40">
                <p className="font-script text-xl text-hotpink leading-none">{title}</p>
              </div>
            )}
            <div className="p-2 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
              {options.map((o) => {
                const sel = o.value === value;
                return (
                  <button
                    key={o.value}
                    type="button"
                    onClick={() => { onChange(o.value); setOpen(false); }}
                    className={`w-full flex items-center justify-between gap-2 rounded-xl px-4 py-3 text-left text-sm font-semibold transition active:scale-[0.99] ${sel ? "bg-hotpink text-white shadow-sm shadow-hotpink/30" : "text-rose hover:bg-blush"}`}
                  >
                    <span>{o.label}</span>
                    {sel && <Check className="h-4 w-4 shrink-0" strokeWidth={3} />}
                  </button>
                );
              })}
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
