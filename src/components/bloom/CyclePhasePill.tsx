import { Sparkles, TrendingUp, Zap, Battery, Leaf, type LucideIcon } from "lucide-react";
import { phaseForDay, readCycleSettings, hasCycleSettings, PHASE_LABEL, type CyclePhase } from "./cyclePhase";

/** Energy read-out per phase — mirrors the Today page so every hero matches. */
const PHASE_ENERGY: Record<Exclude<CyclePhase, "any">, string> = {
  period: "Low", follicular: "Rising", fertile: "High", ovulation: "High", luteal: "Mellow",
};

/** A fitting icon per energy level — mirrors the Today page. */
const ENERGY_ICON: Record<string, LucideIcon> = {
  Low: Battery, Rising: TrendingUp, High: Zap, Mellow: Leaf,
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
  // Solid phase pill — pops on an image hero.
  const base = "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full bg-hotpink/90 text-white text-[10px] sm:text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 sm:px-3 sm:py-1 shadow-sm";
  // Softer, pale-pink energy pill — same family as the phase, lighter weight
  // (mirrors the Today page). The icon breathes softly.
  const soft = "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full bg-petal/80 backdrop-blur text-hotpink border border-hotpink/20 text-[10px] sm:text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 sm:px-3 sm:py-1 shadow-sm shadow-hotpink/10";

  // No cycle saved yet → never show a phase computed from the placeholder default
  // date. Instead invite her to set it up, guiding straight into the Cycle Tracker
  // from whichever hero she's on.
  if (!hasCycleSettings()) {
    return (
      <a href="/app/tools/cycle" className={[base, "transition hover:bg-hotpink active:scale-95", className].join(" ")}>
        <Sparkles className="h-3 w-3 animate-icon-breathe" strokeWidth={2.2} /> Set up your cycle
      </a>
    );
  }

  const phase = phaseForDay(new Date(), readCycleSettings());
  const day = cycleDayNumber();
  const energy = PHASE_ENERGY[phase];
  const EnergyIcon = ENERGY_ICON[energy] ?? Zap;
  return (
    <div className={["inline-flex flex-wrap items-center gap-1.5", className].join(" ")}>
      <span className={base}>✿ Day {day} · {PHASE_LABEL[phase]}</span>
      <span className={soft}>
        <EnergyIcon className="h-3 w-3 animate-icon-breathe" strokeWidth={2.4} /> Energy {energy}
      </span>
    </div>
  );
}
