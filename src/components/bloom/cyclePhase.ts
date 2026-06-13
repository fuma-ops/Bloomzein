import type { CycleSettings } from "./PeriodSetup";

/**
 * Canonical cycle phase used across all tools (Cycle Tracker, Yoga, Meals,
 * Workout, Diet...). "any" is a tool-side filter value, never emitted by
 * the Cycle Tracker itself.
 */
export type CyclePhase = "period" | "follicular" | "fertile" | "ovulation" | "luteal" | "any";

/** localStorage key the Cycle Tracker writes to and other tools read (read-only). */
export const CYCLE_PHASE_KEY = "bloom:cycle-phase";

/** localStorage key holding the user's actual cycle settings (last period date, lengths, etc). */
export const CYCLE_SETTINGS_KEY = "bloom:cycle-settings";

/** Fallback used until the user saves their own settings in Cycle Tracker. */
export const DEFAULT_CYCLE_SETTINGS: CycleSettings = {
  lastPeriodStart: new Date(2026, 5, 1), // Jun 1, 2026
  periodLength: 5,
  cycleLength: 28,
  trackerMode: "protection",
  contraceptiveReminder: true,
  contraceptiveMethod: "pill",
  reminderHour: "21:00",
  deviceNotifications: true,
};

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

/** True once the user has saved their own cycle settings at least once (vs. still on defaults). */
export function hasCycleSettings(): boolean {
  try {
    return localStorage.getItem(CYCLE_SETTINGS_KEY) !== null;
  } catch {
    return false;
  }
}

/** Reads the user's saved cycle settings, falling back to the defaults if none were saved yet. */
export function readCycleSettings(): CycleSettings {
  try {
    const raw = localStorage.getItem(CYCLE_SETTINGS_KEY);
    if (!raw) return DEFAULT_CYCLE_SETTINGS;
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_CYCLE_SETTINGS, ...parsed, lastPeriodStart: new Date(parsed.lastPeriodStart) };
  } catch {
    return DEFAULT_CYCLE_SETTINGS;
  }
}

/**
 * Persists the user's cycle settings and re-broadcasts today's phase to
 * `CYCLE_PHASE_KEY` so every other tool (Yoga, Meals, Workout, Diet, Today,
 * Calendar...) stays in sync the moment Cycle Tracker is saved.
 */
export function writeCycleSettings(settings: CycleSettings): void {
  try {
    localStorage.setItem(CYCLE_SETTINGS_KEY, JSON.stringify(settings));
    localStorage.setItem(CYCLE_PHASE_KEY, JSON.stringify(phaseForDay(new Date(), settings)));
  } catch {}
}

/**
 * Refreshes `CYCLE_PHASE_KEY` from whatever settings are currently in effect
 * (saved or default) without marking the user as having completed setup.
 */
export function broadcastCyclePhase(): void {
  try {
    localStorage.setItem(CYCLE_PHASE_KEY, JSON.stringify(phaseForDay(new Date(), readCycleSettings())));
  } catch {}
}

/** Reads the cycle phase emitted by the Cycle Tracker (read-only for other tools). */
export function readCyclePhase(): CyclePhase | null {
  try {
    const raw = localStorage.getItem(CYCLE_PHASE_KEY);
    const v = raw ? JSON.parse(raw) : null;
    if (v === "period" || v === "follicular" || v === "fertile" || v === "ovulation" || v === "luteal") return v;
    return null;
  } catch {
    return null;
  }
}
