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
    window.dispatchEvent(new Event("bloom:cycle-updated"));
  } catch {}
}

/**
 * Refreshes `CYCLE_PHASE_KEY` for tools that read the shared phase — but ONLY
 * when the user has actually saved her cycle. With no settings we CLEAR the key
 * so `readCyclePhase()` returns null everywhere (Calendar, Yoga, Meals, Diet…)
 * and no tool shows a phase computed from the placeholder default date.
 */
export function broadcastCyclePhase(): void {
  try {
    if (hasCycleSettings()) {
      localStorage.setItem(CYCLE_PHASE_KEY, JSON.stringify(phaseForDay(new Date(), readCycleSettings())));
    } else {
      localStorage.removeItem(CYCLE_PHASE_KEY);
    }
  } catch {}
}

/* ──────────────────────────────────────────────────────────────────────────
 * Canonical phase mappings — the SINGLE source of truth every tool imports.
 *
 * The cycle has 5 phases (with a distinct fertile window). Meals recipes,
 * Yoga flows and training content use a 4-phase model. Rather than each tool
 * re-deriving its own mapping (which is how they drifted apart — Yoga once
 * treated "fertile" as follicular while Meals treated it as ovulation), every
 * tool now collapses through these functions. DECISION: the fertile window
 * maps onto OVULATION everywhere — peri-ovulatory energy, nutrition and
 * training needs are equivalent — so no tool can disagree again.
 * ────────────────────────────────────────────────────────────────────────── */

/** The 4-phase content model (Meals / Yoga / Workout share this shape). */
export type ContentPhase = "period" | "follicular" | "ovulation" | "luteal" | "any";

/** Collapse the 5-phase cycle to the 4-phase content model (fertile → ovulation). */
export function toContentPhase(p: CyclePhase | null | undefined): ContentPhase {
  switch (p) {
    case "period":
    case "follicular":
    case "ovulation":
    case "luteal":
      return p;
    case "fertile":
      return "ovulation";
    default:
      return "any";
  }
}

/** The recipe database's phase vocabulary. */
export type DietPhaseKey = "menstrual" | "follicular" | "ovulatory" | "luteal";
/** Cycle phase → recipe DB phase (null for "any"). */
export function toDietPhase(p: CyclePhase | null | undefined): DietPhaseKey | null {
  switch (toContentPhase(p)) {
    case "period":     return "menstrual";
    case "follicular": return "follicular";
    case "ovulation":  return "ovulatory";
    case "luteal":     return "luteal";
    default:           return null;
  }
}

/** The Yoga tool's phase vocabulary. */
export type YogaPhaseKey = "menstrual" | "follicular" | "ovulation" | "luteal";
/** Cycle phase → Yoga phase (fertile → ovulation; "any" → follicular default). */
export function toYogaPhase(p: CyclePhase | null | undefined): YogaPhaseKey {
  const c = toContentPhase(p);
  return c === "period" ? "menstrual" : c === "any" ? "follicular" : c;
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
