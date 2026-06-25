/**
 * Cross-tool data layer — mirrors the cyclePhase.ts pattern.
 * All tools read/write through these helpers so the shared keys stay consistent.
 */

function readJSON<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

// ── Keys (single source of truth) ───────────────────────────────────────────

export const TODAY_MOOD_KEY     = "bloom:today-mood";
export const TODAY_WATER_KEY    = "bloom:today-water";
export const TODAY_SYMPTOMS_KEY = "bloom:today-symptoms";
export const WORKOUT_LOG_KEY    = "bloom:workout-history";
export const WORKOUT_STREAK_KEY = "bloom:workout-streak";
export const YOGA_STREAK_KEY    = "bloom:yoga-streak";

// ── Today mood ───────────────────────────────────────────────────────────────

/** Returns the lowercase mood key currently stored for today (e.g. "calm"). */
export function readTodayMood(): string | null {
  try {
    return localStorage.getItem(TODAY_MOOD_KEY);
  } catch {
    return null;
  }
}

/**
 * Writes the today mood.  Pass a lowercase key ("calm", "happy", …).
 * Diary passes `mood.toLowerCase()` before calling this.
 */
export function writeTodayMood(moodKey: string): void {
  try {
    localStorage.setItem(TODAY_MOOD_KEY, moodKey);
    window.dispatchEvent(new Event("storage"));
  } catch {}
}

// ── Today water ──────────────────────────────────────────────────────────────

/** Returns how many glasses the user has logged today (0 if none / different date). */
export function readTodayWaterCount(): number {
  try {
    const raw = readJSON<{ date: string; count: number }>(TODAY_WATER_KEY, { date: "", count: 0 });
    return raw.date === todayISO() ? raw.count : 0;
  } catch {
    return 0;
  }
}

// ── Today symptoms ───────────────────────────────────────────────────────────

/** Returns the array of symptom keys the user tagged today (e.g. ["cramps", "bloated"]). */
export function readTodaySymptoms(): string[] {
  try {
    const raw = readJSON<{ date: string; list: string[] }>(TODAY_SYMPTOMS_KEY, { date: "", list: [] });
    return raw.date === todayISO() ? raw.list : [];
  } catch {
    return [];
  }
}

// ── Workout ──────────────────────────────────────────────────────────────────

/** Returns the workout streak object. */
export function readWorkoutStreak(): { count: number; lastISO: string | null } {
  return readJSON(WORKOUT_STREAK_KEY, { count: 0, lastISO: null });
}

/** Returns the yoga streak object. */
export function readYogaStreak(): { count: number; lastISO: string | null } {
  return readJSON(YOGA_STREAK_KEY, { count: 0, lastISO: null });
}

/** Returns calories burned in workout sessions today (0 if none). */
export function readWorkoutCaloriesToday(): number {
  try {
    const history = readJSON<{ date: string; calories: number }[]>(WORKOUT_LOG_KEY, []);
    const today = todayISO();
    return history.filter((h) => h.date === today).reduce((sum, h) => sum + (h.calories ?? 0), 0);
  } catch {
    return 0;
  }
}
