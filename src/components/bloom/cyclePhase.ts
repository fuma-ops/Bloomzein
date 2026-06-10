import type { CycleSettings } from "./PeriodSetup";

/**
 * Canonical cycle phase used across all tools (Cycle Tracker, Yoga, Meals,
 * Workout, Diet...). "any" is a tool-side filter value, never emitted by
 * the Cycle Tracker itself.
 */
export type CyclePhase = "period" | "follicular" | "fertile" | "ovulation" | "luteal" | "any";

/** localStorage key the Cycle Tracker writes to and other tools read (read-only). */
export const CYCLE_PHASE_KEY = "bloom:cycle-phase";

export const PHASE_LABEL: Record<Exclude<CyclePhase, "any">, string> = {
  period: "Period",
  follicular: "Follicular",
  fertile: "Fertile",
  ovulation: "Ovulation",
  luteal: "Luteal",
};

/** Computes the cycle phase for a given date based on cycle settings. */
export function phaseForDay(date: Date, s: CycleSettings): Exclude<CyclePhase, "any"> {
  const ms = 1000 * 60 * 60 * 24;
  const diff = Math.floor((date.getTime() - s.lastPeriodStart.getTime()) / ms);
  const day = ((diff % s.cycleLength) + s.cycleLength) % s.cycleLength;
  const ovulationDay = s.cycleLength - 14; // luteal phase ~14 days
  if (day < s.periodLength) return "period";
  if (day === ovulationDay) return "ovulation";
  if (day >= ovulationDay - 4 && day <= ovulationDay + 2) return "fertile";
  if (day < ovulationDay) return "follicular";
  return "luteal";
}

/** Reads the cycle phase emitted by the Cycle Tracker (read-only for other tools). */
export function readCyclePhase(): CyclePhase | null {
  try {
    const v = localStorage.getItem(CYCLE_PHASE_KEY);
    if (v === "period" || v === "follicular" || v === "fertile" || v === "ovulation" || v === "luteal") return v;
    return null;
  } catch {
    return null;
  }
}
