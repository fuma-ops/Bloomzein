import { phaseForDay, readCycleSettings, PHASE_LABEL, type CyclePhase } from "./cyclePhase";

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
  const phase = phaseForDay(new Date(), readCycleSettings());
  const day = cycleDayNumber();
  return (
    <div className={["inline-flex items-center gap-1.5 rounded-full bg-hotpink/90 text-white text-[10px] sm:text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 sm:px-3 sm:py-1 shadow-sm", className].join(" ")}>
      ✿ Day {day} · {PHASE_LABEL[phase]} · Energy {PHASE_ENERGY[phase]}
    </div>
  );
}
