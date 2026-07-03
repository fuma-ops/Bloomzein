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

// ── Planned training (for Meals ↔ Workout/Yoga awareness) ────────────────────

export const YOGA_SCHEDULE_KEY          = "bloom:yoga-schedule";
export const WORKOUT_PROGRAM_KEY        = "bloom:workout-program";
export const WORKOUT_ACTIVE_PROGRAM_KEY = "bloom:workout-active-program";
export const WORKOUT_PROFILE_KEY        = "bloom:workout-profile";

// Mirrors ACTIVE_DAY_PATTERNS in the Workout tool — where a program's sessions
// land across the week, so Meals can count training days without importing it.
const ACTIVE_DAY_PATTERNS: Record<number, string[]> = {
  2: ["Mon", "Thu"],
  3: ["Mon", "Wed", "Fri"],
  4: ["Mon", "Tue", "Thu", "Fri"],
  5: ["Mon", "Tue", "Wed", "Thu", "Fri"],
};

/** Weekday labels (Mon..Sun) the user has a yoga flow scheduled. */
export function readYogaPlanDays(): string[] {
  const sched = readJSON<Record<string, string | null>>(YOGA_SCHEDULE_KEY, {});
  return Object.entries(sched).filter(([, v]) => !!v).map(([d]) => d);
}

/** Weekday labels (Mon..Sun) the user has a workout planned (freestyle or program). */
export function readWorkoutPlanDays(): string[] {
  const free = readJSON<Record<string, unknown> | null>(WORKOUT_PROGRAM_KEY, null);
  if (free && typeof free === "object") {
    const days = Object.entries(free).filter(([, v]) => !!v).map(([d]) => d);
    if (days.length) return days;
  }
  const active = readJSON<{ programId: string } | null>(WORKOUT_ACTIVE_PROGRAM_KEY, null);
  if (active) {
    const profile = readJSON<{ daysPerWeek?: number }>(WORKOUT_PROFILE_KEY, {});
    return ACTIVE_DAY_PATTERNS[profile.daysPerWeek ?? 3] ?? ACTIVE_DAY_PATTERNS[3];
  }
  return [];
}

// ── Write-backs from the cross-tool Fuel cards ───────────────────────────────

export const MEALS_PLAN_KEY       = "bloom:meals-plan";
export const MEALS_SHOP_EXTRA_KEY = "bloom:meals-shop-extra";

type PlanSlot = "breakfast" | "lunch" | "dinner" | "snack" | "lunchbox";

/** Drop a recipe into the Meals weekly plan at day + slot (from a Fuel card). */
export function addRecipeToMealPlan(recipeId: string, day: string, slot: PlanSlot): void {
  try {
    const plan = readJSON<Record<string, Record<string, string | null>>>(MEALS_PLAN_KEY, {});
    const dayPlan = plan[day] ?? { breakfast: null, lunch: null, dinner: null, snack: null, lunchbox: null };
    dayPlan[slot] = recipeId;
    plan[day] = dayPlan;
    localStorage.setItem(MEALS_PLAN_KEY, JSON.stringify(plan));
    window.dispatchEvent(new Event("storage"));
  } catch {}
}

/** Merge a recipe's ingredients into the Meals shopping list "extras" bucket. */
export function addIngredientsToShopping(items: string[]): void {
  try {
    const cur = readJSON<string[]>(MEALS_SHOP_EXTRA_KEY, []);
    const seen = new Set(cur.map((s) => s.toLowerCase()));
    const merged = [...cur];
    items.forEach((i) => {
      const key = i.trim().toLowerCase();
      if (key && !seen.has(key)) { merged.push(i.trim()); seen.add(key); }
    });
    localStorage.setItem(MEALS_SHOP_EXTRA_KEY, JSON.stringify(merged));
    window.dispatchEvent(new Event("storage"));
  } catch {}
}

/** Extra shopping items added outside the plan (read by the Meals shop tab). */
export function readShoppingExtras(): string[] {
  return readJSON<string[]>(MEALS_SHOP_EXTRA_KEY, []);
}
