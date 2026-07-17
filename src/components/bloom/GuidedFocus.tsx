import { useEffect, useState } from "react";
import { Sparkles, ArrowRight } from "lucide-react";
import { isGuided } from "@/lib/guidedSetup";

/**
 * Guided-setup "focus mode" — while she's walking the Today checklist
 * (`isGuided()`), each setup tool strips down to a single, non-disorienting page:
 * a narrow hero (tool label + phase, no CTA), one "Finish on Today" action, only
 * her plan highlighted, and every competing CTA (including opening a full program)
 * gently redirected back to finishing setup.
 */

/** Reactive `isGuided()` — re-reads on focus / storage so the UI follows the flag. */
export function useGuided(): boolean {
  const [g, setG] = useState(isGuided);
  useEffect(() => {
    const check = () => setG(isGuided());
    check();
    window.addEventListener("focus", check);
    window.addEventListener("storage", check);
    window.addEventListener("bloom:guide-updated", check);
    return () => {
      window.removeEventListener("focus", check);
      window.removeEventListener("storage", check);
      window.removeEventListener("bloom:guide-updated", check);
    };
  }, []);
  return g;
}

/** A gentle transient toast — shown when she taps something that's locked while
 *  she's still setting up (e.g. opening a whole program). Self-contained so any
 *  tool can call it without wiring a provider. */
export function guidedNudge(msg = "Let's finish your setup first ✿") {
  try {
    const el = document.createElement("div");
    el.textContent = msg;
    el.setAttribute("role", "status");
    el.style.cssText =
      "position:fixed;left:50%;bottom:calc(88px + env(safe-area-inset-bottom));transform:translateX(-50%) translateY(0);z-index:200;" +
      "background:linear-gradient(135deg,#EC4899,#DB2777);color:#fff;font-weight:700;font-size:13px;padding:10px 18px;border-radius:999px;" +
      "box-shadow:0 10px 30px rgba(219,39,119,.42);opacity:0;transition:opacity .25s ease, transform .25s ease;pointer-events:none;max-width:88vw;text-align:center;";
    document.body.appendChild(el);
    requestAnimationFrame(() => {
      el.style.opacity = "1";
      el.style.transform = "translateX(-50%) translateY(-6px)";
    });
    setTimeout(() => {
      el.style.opacity = "0";
      setTimeout(() => { try { el.remove(); } catch {} }, 300);
    }, 1900);
  } catch {}
}

/** The single primary action during guided setup: her plan is set, head to Today. */
export function GuidedFinishBar({
  toolLabel, phaseLabel, hint, className = "",
}: { toolLabel: string; phaseLabel?: string; hint?: string; className?: string }) {
  return (
    <div className={`relative overflow-hidden rounded-2xl border border-petal/60 bg-gradient-to-r from-blush/70 via-white to-petal/40 px-4 py-3 shadow-sm animate-fade-in ${className}`}>
      <div className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full bg-hotpink/15 blur-2xl" />
      <div className="relative flex items-center gap-3">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-2xl bg-hotpink text-white shadow-md shadow-hotpink/30 animate-icon-breathe">
          <Sparkles className="h-4 w-4" strokeWidth={1.8} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-bold uppercase tracking-wider text-rose/55">
            Setting up · {toolLabel}{phaseLabel ? ` · ${phaseLabel}` : ""}
          </p>
          <p className="text-sm font-bold text-rose leading-tight">{hint || "This is your plan — the rest fills in on Today."}</p>
        </div>
        <button
          onClick={() => { window.location.href = "/app/today"; }}
          className="shrink-0 inline-flex items-center gap-1 rounded-full bg-hotpink text-white px-3.5 py-2 text-[11px] font-bold shadow-sm shadow-hotpink/30 active:scale-95 transition animate-cta-bounce"
        >
          Finish on Today <ArrowRight className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
}

/** A narrow guided hero — only the tool label + phase, no CTAs. */
export function GuidedFocusHero({
  label, phaseLabel, image, className = "",
}: { label: string; phaseLabel?: string; image?: string; className?: string }) {
  return (
    <div className={`relative w-full min-h-[92px] rounded-3xl overflow-hidden border border-pink-200/60 shadow-lg shadow-pink-200/30 mb-3 animate-card-pop-in ${className}`}>
      {image && <img src={image} alt="" className="absolute inset-0 h-full w-full object-cover object-center" referrerPolicy="no-referrer" />}
      <div className="absolute inset-0 bg-gradient-to-r from-hotpink/85 via-hotpink/45 to-hotpink/10" />
      <div className="relative flex items-center min-h-[92px] px-4 py-3">
        <div>
          <p className="font-script text-2xl sm:text-3xl text-white leading-none" style={{ textShadow: "0 2px 8px rgba(0,0,0,0.3)" }}>{label}</p>
          {phaseLabel && (
            <span className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-white/85 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest text-hotpink">
              ✿ {phaseLabel} phase
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
