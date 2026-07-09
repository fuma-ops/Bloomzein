// ── Daily hydration history ──────────────────────────────────────────────────
// The raw `bloom:today-water` / `bloom:today-water-goal` keys only ever hold the
// CURRENT day (they reset each morning), so on their own they can't show a trend.
// This module is the ONE place a per-day hydration history is kept: a tiny
// snapshot, keyed by local date, that the Me dashboard reads for the
// "am I hydrating consistently?" graph. Meals already have a per-day log
// (`bloom:diet-eaten`, keyed by date), so only water needs stamping here.
import { todayISO } from "./localDate";

export const DAILY_LOG_KEY = "bloom:daily-log";
export const DEFAULT_WATER_GOAL = 8;

export interface DailyWaterEntry { water: number; goal: number }
export type DailyWaterLog = Record<string, DailyWaterEntry>;

function read<T>(key: string, fallback: T): T {
  try { const v = localStorage.getItem(key); return v ? (JSON.parse(v) as T) : fallback; }
  catch { return fallback; }
}

/** The full hydration history, keyed by local ISO date. */
export function readDailyWaterLog(): DailyWaterLog {
  const v = read<DailyWaterLog>(DAILY_LOG_KEY, {});
  return v && typeof v === "object" && !Array.isArray(v) ? v : {};
}

/** Write an explicit water count + goal for today (used by the Today tool, which
 *  already holds the live values in React state — always accurate). Idempotent
 *  upsert keyed by local date. */
export function stampWater(water: number, goal: number): void {
  try {
    const log = readDailyWaterLog();
    log[todayISO()] = { water: Math.max(0, Number(water) || 0), goal: goal > 0 ? goal : DEFAULT_WATER_GOAL };
    localStorage.setItem(DAILY_LOG_KEY, JSON.stringify(log));
  } catch { /* storage may be unavailable — non-fatal */ }
}

/** Snapshot today's water into the history by reading the live `bloom:today-water`
 *  store ({date, count} — only counts if it's actually today's) + the goal. Safe
 *  to call on every render of Me. Days the app isn't opened are simply absent
 *  (counted as missed, honestly). */
export function stampTodayWater(): void {
  try {
    const today = todayISO();
    const raw = read<{ date?: string; count?: number }>("bloom:today-water", {});
    const water = raw && raw.date === today && typeof raw.count === "number" ? raw.count : 0;
    const goalRaw = read<number>("bloom:today-water-goal", DEFAULT_WATER_GOAL);
    const goal = typeof goalRaw === "number" && goalRaw > 0 ? goalRaw : DEFAULT_WATER_GOAL;
    stampWater(water, goal);
  } catch { /* storage may be unavailable — non-fatal */ }
}
