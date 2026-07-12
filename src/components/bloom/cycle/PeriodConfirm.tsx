import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Droplet, Check, X } from "lucide-react";
import { shouldAskToday, logPeriodStart, skipPeriodPromptToday, PERIOD_EVENT } from "@/lib/periodLog";
import { todayISO } from "@/lib/localDate";

/**
 * Around the predicted period day, a soft centred pop-up asks her to confirm the
 * real start — so she can't miss it. "Yes" logs today as a true period start
 * (re-tuning the cycle); "Not yet" hides it until tomorrow.
 */
export function PeriodConfirm() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const check = () => setOpen(shouldAskToday());
    check();
    // Re-check after setup (bloom:cycle-updated), a logged/skipped start, cross-tab
    // storage changes, and whenever she returns to the app.
    window.addEventListener(PERIOD_EVENT, check);
    window.addEventListener("bloom:cycle-updated", check);
    window.addEventListener("storage", check);
    window.addEventListener("focus", check);
    document.addEventListener("visibilitychange", check);
    return () => {
      window.removeEventListener(PERIOD_EVENT, check);
      window.removeEventListener("bloom:cycle-updated", check);
      window.removeEventListener("storage", check);
      window.removeEventListener("focus", check);
      document.removeEventListener("visibilitychange", check);
    };
  }, []);

  if (!open) return null;

  const yes = () => { logPeriodStart(todayISO()); setOpen(false); };
  const notYet = () => { skipPeriodPromptToday(); setOpen(false); };

  return createPortal(
    <div className="fixed inset-0 z-[140] flex items-center justify-center p-4" onClick={notYet}>
      <div className="absolute inset-0 animate-fade-in" style={{ background: "rgba(190,24,93,0.22)", backdropFilter: "blur(4px)", WebkitBackdropFilter: "blur(4px)" }} />
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-xs rounded-[2rem] bg-white p-6 text-center animate-scale-in"
        style={{ boxShadow: "0 24px 60px rgba(190,24,93,0.35)" }}
      >
        <button onClick={notYet} aria-label="Dismiss" className="absolute right-3.5 top-3.5 grid h-7 w-7 place-items-center rounded-full text-rose/50 transition hover:bg-blush hover:text-hotpink active:scale-90">
          <X className="h-4 w-4" />
        </button>

        <span className="mx-auto mb-3 grid h-16 w-16 place-items-center rounded-full text-white animate-icon-breathe" style={{ background: "linear-gradient(135deg,#EC4899,#BE185D)", boxShadow: "0 10px 26px rgba(219,39,119,0.42)" }}>
          <Droplet className="h-8 w-8" strokeWidth={1.8} />
        </span>

        <p className="font-script leading-tight" style={{ fontSize: "28px", color: "#BE185D" }}>Did your period<br />start today?</p>
        <p className="mt-2 text-[12.5px] leading-snug" style={{ color: "#9D5C7E" }}>Confirm and I'll log the real day &amp; re-tune your cycle and predictions ✿</p>

        <div className="mt-4 grid gap-2">
          <button onClick={yes} className="inline-flex items-center justify-center gap-1.5 rounded-full py-3 text-[14px] font-bold text-white active:scale-95 transition" style={{ background: "linear-gradient(135deg,#EC4899,#DB2777)", boxShadow: "0 8px 22px rgba(219,39,119,0.4)" }}>
            <Check className="h-4 w-4" strokeWidth={3} /> Yes, it started today
          </button>
          <button onClick={notYet} className="rounded-full py-2.5 text-[13px] font-bold active:scale-95 transition" style={{ color: "#9D5C7E", background: "rgba(252,231,243,0.7)" }}>
            Not yet
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
