/**
 * Me-page PREDICTIONS — the forward-looking, self-correcting layer that sits on
 * top of the honest history in healthHistory.ts.
 *
 * Every prediction here reads THROUGH a canonical engine another part of the app
 * already owns — never a private second copy of the maths:
 *   • cycle length   → avgCycleLength / cycle settings (periodLog + cyclePhase)
 *   • weight to goal → goalProjection() (nutritionTargets — the one BMR engine)
 *   • mood by phase  → moodByPhaseMap() (predictions — personalised once logged)
 *   • planned kcal   → the weekly meal plan (crossToolData), same as the Diet ring
 *
 * The shape of every series is "a reference line you can lay under the real one",
 * so a chart can show *plan vs reality* and let the truth correct the forecast as
 * she logs. Dates are LOCAL calendar days (localDate.ts) throughout.
 */
import { localDateISO, todayISO } from "@/lib/localDate";
import { readCycleSettings, phaseForDay, hasCycleSettings } from "@/components/bloom/cyclePhase";
import { readPeriodStarts, avgCycleLength } from "@/lib/periodLog";
import { goalProjection } from "@/lib/nutritionTargets";
import { moodByPhaseMap } from "@/lib/predictions";

const MS_DAY = 86_400_000;
const toTime = (iso: string) => new Date(iso + "T00:00:00").getTime();
const isoFromT = (t: number): string => localDateISO(new Date(t));
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export interface DatedValue {
  date: string;
  value: number;
}
export interface PredictedCycleBar {
  key: string;
  label: string; // month of the predicted start
  value: number; // predicted length (days)
}

/* ---------- cycle length: predict the next few cycles ---------- */

/** The predicted length of an "average" cycle from what she's confirmed so far
 *  (falls back to her cycle-setup length while she's still learning). */
export function predictedCycleLength(): number {
  const s = readCycleSettings();
  return Math.round(avgCycleLength() ?? s.cycleLength ?? 28);
}

/** Predicted future cycles, drawn as faded bars AFTER her real ones — so the
 *  chart is never empty and shows the rhythm she's heading into. Anchored to her
 *  most recent confirmed start (or her cycle setup), corrected the moment she
 *  confirms a new start. */
export function predictedCycleBars(count = 3): PredictedCycleBar[] {
  if (!hasCycleSettings()) return [];
  const s = readCycleSettings();
  const starts = readPeriodStarts();
  const len = predictedCycleLength();
  const anchorMs = starts.length
    ? toTime(starts[starts.length - 1])
    : new Date(
        s.lastPeriodStart.getFullYear(),
        s.lastPeriodStart.getMonth(),
        s.lastPeriodStart.getDate(),
      ).getTime();
  const out: PredictedCycleBar[] = [];
  for (let i = 1; i <= count; i++) {
    const startMs = anchorMs + i * len * MS_DAY;
    const d = new Date(startMs);
    out.push({ key: `pred-cy-${i}`, label: MONTHS[d.getMonth()], value: len });
  }
  return out;
}

/* ---------- weight: predict the path to her goal ---------- */

/** The predicted weight trajectory from TODAY to her goal, one point per week,
 *  built from her calorie plan's projected rate (goalProjection — the canonical
 *  engine). Starts exactly on her latest real weigh-in so the dashed forecast
 *  continues the solid line. Null when she has no goal set. As she logs new
 *  weigh-ins the projection re-computes, so the plan self-corrects. */
export function predictedWeightSeries(
  lastReal: { date: string; kg: number } | null,
  horizonWeeks = 16,
): DatedValue[] | null {
  const proj = goalProjection();
  if (!proj || proj.target == null) return null;

  const startKg = lastReal?.kg ?? proj.current;
  const startMs = lastReal ? toTime(lastReal.date) : toTime(todayISO());
  const rate = proj.weeklyRateKg; // signed kg/week from her plan

  const out: DatedValue[] = [{ date: isoFromT(startMs), value: +startKg.toFixed(1) }];

  // Maintain / negligible rate → a flat line at where she is (or her target).
  if (Math.abs(rate) < 0.02) {
    const flat = proj.direction === "lose" || proj.direction === "gain" ? proj.target : startKg;
    out.push({ date: isoFromT(startMs + 8 * 7 * MS_DAY), value: +flat.toFixed(1) });
    return out;
  }

  let kg = startKg;
  for (let w = 1; w <= horizonWeeks; w++) {
    kg += rate;
    // Don't overshoot the goal — clamp the last step exactly onto the target.
    const reached = (rate < 0 && kg <= proj.target) || (rate > 0 && kg >= proj.target);
    const v = reached ? proj.target : kg;
    out.push({ date: isoFromT(startMs + w * 7 * MS_DAY), value: +v.toFixed(1) });
    if (reached) break;
  }
  return out.length >= 2 ? out : null;
}

/* ---------- mood: predict the shape of the month by phase ---------- */

/** Predicted daily mood across a window, from her personalised phase→mood map.
 *  This is the "how this month should feel" reference her real logs correct. */
export function predictedMoodSeries(fromISO: string, toISO: string, stepDays = 1): DatedValue[] {
  if (!hasCycleSettings()) return [];
  const s = readCycleSettings();
  const mbp = moodByPhaseMap();
  const out: DatedValue[] = [];
  const t1 = toTime(toISO);
  for (let t = toTime(fromISO); t <= t1; t += stepDays * MS_DAY) {
    const ph = phaseForDay(new Date(t), s);
    out.push({ date: isoFromT(t), value: +mbp[ph].toFixed(2) });
  }
  return out;
}

/* ---------- sleep & symptoms: predict the shape of the month by phase ---------- */

// Typical sleep quality (1–5) and symptom load (count) per cycle phase — the
// reference her real logs then correct. Keys cover the different phase spellings
// phaseForDay may return; a fallback keeps it safe.
const SLEEP_BY_PHASE: Record<string, number> = {
  menstrual: 3.0, period: 3.0, follicular: 4.0, ovulation: 4.2, ovulatory: 4.2, fertile: 4.0, luteal: 3.1,
};
const SYMPTOMS_BY_PHASE: Record<string, number> = {
  menstrual: 2.4, period: 2.4, follicular: 0.6, ovulation: 0.8, ovulatory: 0.8, fertile: 0.7, luteal: 1.8,
};

function seriesByPhase(fromISO: string, toISO: string, map: Record<string, number>, fallback: number, stepDays = 1): DatedValue[] {
  if (!hasCycleSettings()) return [];
  const s = readCycleSettings();
  const out: DatedValue[] = [];
  const t1 = toTime(toISO);
  for (let t = toTime(fromISO); t <= t1; t += stepDays * MS_DAY) {
    const ph = String(phaseForDay(new Date(t), s));
    out.push({ date: isoFromT(t), value: +(map[ph] ?? fallback).toFixed(2) });
  }
  return out;
}

/** Predicted nightly sleep quality across a window, from her phase→sleep map. */
export function predictedSleepSeries(fromISO: string, toISO: string, stepDays = 1): DatedValue[] {
  return seriesByPhase(fromISO, toISO, SLEEP_BY_PHASE, 3.5, stepDays);
}
/** Predicted daily symptom load across a window, from her phase→symptom map. */
export function predictedSymptomSeries(fromISO: string, toISO: string, stepDays = 1): DatedValue[] {
  return seriesByPhase(fromISO, toISO, SYMPTOMS_BY_PHASE, 1, stepDays);
}

/** A near-future window end for forecasts (today + N days), local ISO. */
export function futureISO(days: number): string {
  return isoFromT(toTime(todayISO()) + days * MS_DAY);
}
