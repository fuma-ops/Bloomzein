import { useEffect, useState } from "react";
import { Droplet, Check } from "lucide-react";
import { shouldAskToday, logPeriodStart, skipPeriodPromptToday, PERIOD_EVENT } from "@/lib/periodLog";
import { todayISO } from "@/lib/localDate";

/**
 * Around the predicted period day, gently ask her to confirm the real start.
 * "Yes" logs today as a true period start (re-tuning the cycle); "Not yet" hides
 * it until tomorrow. This is how the app learns her real rhythm over time.
 */
export function PeriodConfirm() {
  const [, force] = useState(0);
  useEffect(() => {
    const r = () => force((n) => n + 1);
    window.addEventListener(PERIOD_EVENT, r);
    window.addEventListener("storage", r);
    return () => { window.removeEventListener(PERIOD_EVENT, r); window.removeEventListener("storage", r); };
  }, []);

  if (!shouldAskToday()) return null;

  return (
    <div
      className="rounded-2xl p-3.5 mb-3 animate-fade-in"
      style={{ background: "linear-gradient(135deg, #FDE7F1, #FBCFE8)", border: "1px solid rgba(236,72,153,0.25)", boxShadow: "0 8px 24px rgba(236,72,153,0.14)" }}
    >
      <div className="flex items-start gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-white animate-icon-breathe" style={{ background: "linear-gradient(135deg,#EC4899,#BE185D)" }}>
          <Droplet className="h-5 w-5" />
        </span>
        <div className="flex-1 min-w-0">
          <p className="font-script leading-none" style={{ fontSize: "20px", color: "#BE185D" }}>Did your period start today?</p>
          <p className="text-[11.5px] leading-snug mt-0.5" style={{ color: "#9D5C7E" }}>Confirm and I'll log the real day &amp; re-tune your cycle and predictions.</p>
          <div className="flex gap-2 mt-2.5">
            <button
              onClick={() => logPeriodStart(todayISO())}
              className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-full py-2 text-[13px] font-bold text-white active:scale-95 transition"
              style={{ background: "linear-gradient(135deg,#EC4899,#DB2777)", boxShadow: "0 4px 14px rgba(219,39,119,0.35)" }}
            >
              <Check className="h-4 w-4" strokeWidth={3} /> Yes, today
            </button>
            <button
              onClick={() => skipPeriodPromptToday()}
              className="flex-1 rounded-full py-2 text-[13px] font-bold active:scale-95 transition"
              style={{ background: "rgba(255,255,255,0.75)", color: "#9D5C7E", border: "1px solid rgba(236,72,153,0.2)" }}
            >
              Not yet
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
