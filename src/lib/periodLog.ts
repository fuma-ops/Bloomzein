import { readCycleSettings, writeCycleSettings, hasCycleSettings } from "@/components/bloom/cyclePhase";
import { todayISO } from "@/lib/localDate";

/**
 * Real period history — the missing piece that makes the cycle adaptive.
 *
 * When she confirms a period actually started (the daily prompt, or by tapping a
 * day on the calendar), we record the true start date here, move the cycle to
 * it, and re-learn her average cycle length from the gaps between real starts.
 * Everything downstream (phase, predictions, insights) then reflects HER body,
 * not the setup defaults.
 */
export const PERIOD_STARTS_KEY = "bloom:period-starts"; // string[] of local ISO dates
export const PERIOD_SKIP_KEY = "bloom:period-prompt-skip"; // ISO date she last said "not today"
export const PERIOD_EVENT = "bloom:period-updated";

const MS = 86400000;
const toDate = (iso: string) => new Date(iso + "T00:00:00");
const fire = () => { try { window.dispatchEvent(new Event(PERIOD_EVENT)); } catch {} };

export function readPeriodStarts(): string[] {
  try {
    const v = JSON.parse(localStorage.getItem(PERIOD_STARTS_KEY) || "[]");
    return Array.isArray(v) ? [...new Set(v as string[])].sort() : [];
  } catch { return []; }
}

/** Gaps between consecutive real starts, filtered to sane cycle lengths. */
function gaps(list = readPeriodStarts()): number[] {
  const t = list.map((d) => toDate(d).getTime());
  const out: number[] = [];
  for (let i = 1; i < t.length; i++) out.push(Math.round((t[i] - t[i - 1]) / MS));
  return out;
}

/** Learned average cycle length (null until she's logged ≥ 2 real starts). */
export function avgCycleLength(list = readPeriodStarts()): number | null {
  const valid = gaps(list).filter((d) => d >= 18 && d <= 45);
  if (!valid.length) return null;
  return Math.round(valid.reduce((a, b) => a + b, 0) / valid.length);
}

/** The last N real cycle lengths — for the "your rhythm" trend. */
export function recentCycleLengths(n = 6): number[] {
  return gaps().slice(-n);
}

/** Regular if her recent cycle lengths vary by ≤ 3 days. */
export function cycleRegularity(): "regular" | "irregular" | "learning" {
  const g = gaps().slice(-4);
  if (g.length < 2) return "learning";
  return Math.max(...g) - Math.min(...g) <= 3 ? "regular" : "irregular";
}

/** Record a real period start (today, or a tapped calendar day) & adapt the cycle. */
export function logPeriodStart(iso: string): void {
  const list = [...new Set([...readPeriodStarts(), iso])].sort();
  try { localStorage.setItem(PERIOD_STARTS_KEY, JSON.stringify(list)); localStorage.removeItem(PERIOD_SKIP_KEY); } catch {}
  const s = readCycleSettings();
  const latest = list[list.length - 1];
  const avg = avgCycleLength(list);
  writeCycleSettings({ ...s, lastPeriodStart: toDate(latest), ...(avg ? { cycleLength: avg } : {}) });
  fire();
}

/** She said "not today" — don't ask again until tomorrow. */
export function skipPeriodPromptToday(): void {
  try { localStorage.setItem(PERIOD_SKIP_KEY, todayISO()); } catch {}
  fire();
}
export function skippedToday(): boolean {
  try { return localStorage.getItem(PERIOD_SKIP_KEY) === todayISO(); } catch { return false; }
}

/** Day-of-cycle today (0 = predicted first day of a cycle). */
function dayInCycle(): number {
  const s = readCycleSettings();
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const d = Math.floor((today.getTime() - s.lastPeriodStart.getTime()) / MS);
  const len = Math.max(1, s.cycleLength);
  return ((d % len) + len) % len;
}

/**
 * Should we ask "did your period start today?" — she's in the ~5-day window around
 * the predicted start, hasn't already logged today, and didn't dismiss today.
 */
export function shouldAskToday(): boolean {
  if (!hasCycleSettings()) return false;
  if (readPeriodStarts().includes(todayISO())) return false;
  if (skippedToday()) return false;
  const s = readCycleSettings();
  const d = dayInCycle();
  return d <= 3 || d >= s.cycleLength - 2;
}
