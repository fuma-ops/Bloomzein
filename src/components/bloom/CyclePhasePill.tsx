import { Sparkles } from "lucide-react";
import { phaseForDay, readCycleSettings, hasCycleSettings, PHASE_LABEL, type CyclePhase } from "./cyclePhase";

/** Energy read-out per phase — mirrors the Today page so every hero matches. */
const PHASE_ENERGY: Record<Exclude<CyclePhase, "any">, string> = {
  period: "Low", follicular: "Rising", fertile: "High", ovulation: "High", luteal: "Mellow",
};

function cycleDayNumber(): number {
  const s = readCycleSettings();
  const ms = 1000 * 60 * 60 * 24;
  const diff = Math.floor((new Date().getTime() - s.lastPeriodStart.getTime()) / ms);
  return ((diff % s.cycleLength) + s.cycleLength) % s.cycleLength + 1;
}

/**
 * The Today-page phase pill — "✿ Day X · PHASE · Energy Y" — reused across tool
 * heroes (Yoga, Workout…) so the cycle read-out looks and reads identically
 * everywhere. Solid pink so it pops on an image hero.
 */
export function CyclePhasePill({ className = "" }: { className?: string }) {
  const base = "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full bg-hotpink/90 text-white text-[10px] sm:text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 sm:px-3 sm:py-1 shadow-sm";

  // No cycle saved yet → never show a phase computed from the placeholder default
  // date. Instead invite her to set it up, guiding straight into the Cycle Tracker
  // from whichever hero she's on.
  if (!hasCycleSettings()) {
    return (
      <a href="/app/tools/cycle" className={[base, "transition hover:bg-hotpink active:scale-95", className].join(" ")}>
        <Sparkles className="h-3 w-3" strokeWidth={2.2} /> Set up your cycle
      </a>
    );
  }

  const phase = phaseForDay(new Date(), readCycleSettings());
  const day = cycleDayNumber();
  return (
    <div className={[base, className].join(" ")}>
      ✿ Day {day} · {PHASE_LABEL[phase]} · Energy {PHASE_ENERGY[phase]}
    </div>
  );
}
