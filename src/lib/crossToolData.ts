/**
 * Cross-tool data layer — mirrors the cyclePhase.ts pattern.
 * All tools read/write through these helpers so the shared keys stay consistent.
 */
import { todayISO } from "@/lib/localDate";

function readJSON<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

// ── Keys (single source of truth) ───────────────────────────────────────────

export const TODAY_MOOD_KEY     = "bloom:today-mood";
export const TODAY_WATER_KEY    = "bloom:today-water";
export const TODAY_SYMPTOMS_KEY = "bloom:today-symptoms";
export const WORKOUT_LOG_KEY    = "bloom:workout-history";
export const WORKOUT_STREAK_KEY = "bloom:workout-streak";
export const YOGA_STREAK_KEY    = "bloom:yoga-streak";

// ── Daily contraceptive pill log — ONE source of truth ───────────────────────
// "Did she take her pill on day X" is shared by Today (today's tick) and the
// Cycle tracker (per-day calendar log). Keyed by LOCAL ISO date (YYYY-MM-DD) so
// both agree on which day is "today". Toggling on either page writes here and
// fires "bloom:pill-updated" so the other view stays in sync. See CLAUDE.md § 9.
export const PILL_LOG_KEY = "bloom:pill-log-v2";

export function readPillLog(): Record<string, boolean> {
  return readJSON<Record<string, boolean>>(PILL_LOG_KEY, {});
}
/** Was the pill taken on this local ISO date (defaults to today)? */
export function isPillTaken(iso: string = todayISO()): boolean {
  return !!readPillLog()[iso];
}
/** Mark (or clear) the pill for a local ISO date; notifies every open view. */
export function setPillTaken(iso: string, taken: boolean): void {
  const log = readPillLog();
  if (taken) log[iso] = true; else delete log[iso];
  try {
    localStorage.setItem(PILL_LOG_KEY, JSON.stringify(log));
    window.dispatchEvent(new Event("bloom:pill-updated"));
  } catch {}
}

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

// ── Symptom log (v2) — the ONE store shared by Today (logging) and the Cycle
// Tracker (graph). Keyed by LOCAL date (YYYY-MM-DD) → array of symptom labels.
// Today owns the daily check-in; the Cycle Tracker only reads it to draw its
// symptom line, so the two can never disagree. ───────────────────────────────
export const SYMPTOMS_LOG_KEY = "bloom:symptoms-log-v2";
export const SYMPTOM_OPTIONS = ["Cramps", "Bloating", "Tender", "Fatigue", "Headache", "Nausea", "Backache"] as const;

/** The whole symptom log (date → labels). */
export function readSymptomsLog(): Record<string, string[]> {
  return readJSON<Record<string, string[]>>(SYMPTOMS_LOG_KEY, {});
}
/** Symptom labels logged for one LOCAL date (YYYY-MM-DD). */
export function readSymptomsForDay(day: string): string[] {
  const v = readSymptomsLog()[day];
  return Array.isArray(v) ? v : [];
}
/** Toggle one symptom label for a LOCAL date; persists and returns the new list. */
export function toggleSymptomForDay(day: string, label: string): string[] {
  const log = readSymptomsLog();
  const cur = new Set(log[day] ?? []);
  if (cur.has(label)) cur.delete(label); else cur.add(label);
  const next = [...cur];
  if (next.length) log[day] = next; else delete log[day];
  try { localStorage.setItem(SYMPTOMS_LOG_KEY, JSON.stringify(log)); window.dispatchEvent(new Event("storage")); } catch {}
  return next;
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

export type PlanSlot = "breakfast" | "lunch" | "dinner" | "snack" | "lunchbox";

// ── The ONE weekly meal plan — single source of truth for proposed meals ─────
// Keyed by weekday label (Mon..Sun), slot → recipeId. Every tool that shows or
// proposes "today's / this week's meals" (Meals Planner, Today, Diet) reads
// THROUGH here so they can never disagree. See CLAUDE.md § Meal data contract.

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
/** Today's weekday label (Mon..Sun) — the key into the weekly plan. */
export function todayWeekday(): string {
  return WEEKDAYS[new Date().getDay()];
}

export type PlannedDay = Record<PlanSlot, string | null>;
const EMPTY_PLANNED_DAY: PlannedDay = { breakfast: null, lunch: null, dinner: null, snack: null, lunchbox: null };

// ── The MONTH — 4 distinct weeks that rotate with the calendar, then repeat ──
// The plan is no longer a single repeating week: it's four weeks (a month),
// indexed 0..3 by absolute cycle position. As real weeks pass, the current
// calendar week advances through the four, so the whole month cycles and then
// repeats. Every "current week" read still resolves to ONE week here, so Today,
// Diet & nutrition keep agreeing — they just always see the right week for now.
export const MEALS_MONTH_KEY = "bloom:meals-month";
export const MEAL_WEEKS = 4;
export type WeekPlan = Record<string, PlannedDay>;
export type WeekPortions = Record<string, Partial<Record<PlanSlot, number>>>;
export interface MonthPlan { plans: WeekPlan[]; portions: WeekPortions[] }

function emptyMonth(): MonthPlan {
  return { plans: [{}, {}, {}, {}], portions: [{}, {}, {}, {}] };
}

/** Which of the 4 cycle-weeks the CURRENT calendar week is — from a fixed Monday
 *  anchor, in LOCAL time, so it flips exactly when the week does. */
export function currentMealWeekIndex(): number {
  const now = new Date();
  const diffToMon = (now.getDay() + 6) % 7; // 0 = Mon
  const thisMonday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - diffToMon);
  const anchorMonday = new Date(2024, 0, 1); // Mon 1 Jan 2024
  const weeks = Math.floor((thisMonday.getTime() - anchorMonday.getTime()) / (7 * 86400000));
  return ((weeks % MEAL_WEEKS) + MEAL_WEEKS) % MEAL_WEEKS;
}

/** Read the whole 4-week month, migrating a pre-month single-week plan forward
 *  (duplicated into all four weeks) so nothing looks empty after the upgrade. */
export function readMonthPlan(): MonthPlan {
  const raw = readJSON<Partial<MonthPlan> | null>(MEALS_MONTH_KEY, null);
  if (raw && Array.isArray(raw.plans) && raw.plans.length === MEAL_WEEKS) {
    const portions = Array.isArray(raw.portions) && raw.portions.length === MEAL_WEEKS
      ? (raw.portions as WeekPortions[]) : [{}, {}, {}, {}];
    return { plans: raw.plans as WeekPlan[], portions };
  }
  const legacyPlan = readJSON<WeekPlan>(MEALS_PLAN_KEY, {});
  const legacyPortions = readJSON<WeekPortions>(MEALS_PORTIONS_KEY, {});
  const m = emptyMonth();
  if (Object.keys(legacyPlan).length) {
    for (let i = 0; i < MEAL_WEEKS; i++) { m.plans[i] = legacyPlan; m.portions[i] = legacyPortions; }
  }
  return m;
}

export function writeMonthPlan(m: MonthPlan): void {
  try { localStorage.setItem(MEALS_MONTH_KEY, JSON.stringify(m)); window.dispatchEvent(new Event("storage")); } catch {}
}

/** The whole weekly plan (weekday → slot → recipeId) for the CURRENT week. */
export function readMealPlan(): Record<string, PlannedDay> {
  return readMonthPlan().plans[currentMealWeekIndex()] ?? {};
}
/** The planned recipes for one weekday (Mon..Sun) — slot → recipeId. */
export function readPlannedDay(day: string): PlannedDay {
  const plan = readMealPlan();
  return { ...EMPTY_PLANNED_DAY, ...(plan[day] ?? {}) };
}
/** The planned recipes for TODAY — what every tool should show as today's meals. */
export function readTodayPlannedDay(): PlannedDay {
  return readPlannedDay(todayWeekday());
}

/** Drop a recipe into the Meals weekly plan at day + slot (from a Fuel card). */
export function addRecipeToMealPlan(recipeId: string, day: string, slot: PlanSlot): void {
  setMealPlanSlot(day, slot, recipeId);
}

// ── Portions: how many servings of each planned meal, so a day's calories can
// actually hit the target (a build day needs bigger portions than a lean day).
// Keyed day → slot → factor (1 = one serving). Read THROUGH here everywhere a
// day's calories are summed, so Meals, Today & Diet agree. Default 1.
export const MEALS_PORTIONS_KEY = "bloom:meals-portions"; // legacy, kept for migration
export function readMealPortions(week = currentMealWeekIndex()): Record<string, Partial<Record<PlanSlot, number>>> {
  return readMonthPlan().portions[week] ?? {};
}
export function portionFor(day: string, slot: PlanSlot, week = currentMealWeekIndex()): number {
  const f = readMonthPlan().portions[week]?.[day]?.[slot];
  return f && f > 0 ? f : 1;
}
export function setMealPortion(day: string, slot: PlanSlot, factor: number, week = currentMealWeekIndex()): void {
  const m = readMonthPlan();
  const wk = { ...(m.portions[week] ?? {}) };
  const d = { ...(wk[day] ?? {}) };
  if (!factor || factor === 1) delete d[slot]; else d[slot] = factor;
  wk[day] = d; m.portions[week] = wk;
  writeMonthPlan(m);
}
/** Replace the whole portions map for a week (used when it's freshly generated). */
export function writeMealPortions(portions: Record<string, Partial<Record<PlanSlot, number>>>, week = currentMealWeekIndex()): void {
  const m = readMonthPlan();
  m.portions[week] = portions;
  writeMonthPlan(m);
}

/** Un-plan the WHOLE month — powers the Diet "Meals planned" toggle & resets. */
export function clearMealPlan(): void {
  try {
    ["bloom:meals-from-diet", "bloom:meals-plan-goal", MEALS_PORTIONS_KEY, MEALS_PLAN_KEY, MEALS_MONTH_KEY].forEach((k) => localStorage.removeItem(k));
    window.dispatchEvent(new Event("storage"));
  } catch {}
}

/** Un-plan the Diet-created movement. A plan is "Diet-owned" when it still
 *  carries its goal marker (bloom:*-plan-goal); the moment the user edits it in
 *  the Workout/Yoga tool that marker is cleared and the plan becomes theirs —
 *  so this NEVER wipes a plan the user built or customised themselves. */
export function clearMovementPlan(): void {
  try {
    // Yoga schedule — clear only if it's the goal-tuned one Diet set up.
    if (localStorage.getItem("bloom:yoga-plan-goal")) {
      localStorage.removeItem(YOGA_SCHEDULE_KEY);
      localStorage.removeItem("bloom:yoga-plan-goal");
    }
    // Workout program — clear only if it's the goal-tuned one Diet set up.
    if (localStorage.getItem("bloom:workout-plan-goal")) {
      localStorage.removeItem(WORKOUT_PROGRAM_KEY);
      localStorage.removeItem(WORKOUT_ACTIVE_PROGRAM_KEY);
      localStorage.removeItem("bloom:workout-plan-goal");
    }
    localStorage.removeItem("bloom:workout-autoplan");
    window.dispatchEvent(new Event("storage"));
  } catch {}
}

/** Set (or clear, with null) one slot of a week's plan — the single writer.
 *  Defaults to the current calendar week (what Diet/Fuel always target). */
export function setMealPlanSlot(day: string, slot: PlanSlot, recipeId: string | null, week = currentMealWeekIndex()): void {
  const m = readMonthPlan();
  const wk = { ...(m.plans[week] ?? {}) };
  const dayPlan = { ...(wk[day] ?? EMPTY_PLANNED_DAY) };
  dayPlan[slot] = recipeId;
  wk[day] = dayPlan; m.plans[week] = wk;
  writeMonthPlan(m);
}

/** Overwrite one whole week (plan + portions) at a cycle index — the Meals
 *  Planner's writer when it generates or re-rolls a specific week. */
export function writeWeekPlan(week: number, plan: WeekPlan, portions: WeekPortions): void {
  const m = readMonthPlan();
  m.plans[week] = plan;
  m.portions[week] = portions;
  writeMonthPlan(m);
}

// ── Meal "eaten" markers — what she actually ate, per date + slot ────────────
// Thin layer over the ONE plan: the plan holds the meals; this records which of
// today's planned meals she's ticked off, so "eaten" energy is truthful.

export const MEALS_EATEN_KEY = "bloom:diet-eaten";

/** Which slots she has marked eaten today (subset of breakfast/lunch/dinner/snack). */
export function readEatenToday(): PlanSlot[] {
  const all = readJSON<Record<string, PlanSlot[]>>(MEALS_EATEN_KEY, {});
  const v = all[todayISO()];
  return Array.isArray(v) ? v : [];
}
/** Toggle a slot's eaten state for today; returns the new eaten list. */
export function toggleEatenToday(slot: PlanSlot): PlanSlot[] {
  const all = readJSON<Record<string, PlanSlot[]>>(MEALS_EATEN_KEY, {});
  const today = todayISO();
  const cur = new Set(all[today] ?? []);
  if (cur.has(slot)) cur.delete(slot); else cur.add(slot);
  const next = [...cur];
  all[today] = next;
  try { localStorage.setItem(MEALS_EATEN_KEY, JSON.stringify(all)); window.dispatchEvent(new Event("storage")); } catch {}
  return next;
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

// ── "Show recovery meals inside the plan" preference (shared Workout/Yoga) ────

export const FUEL_IN_PLAN_KEY = "bloom:fuel-in-plan";
export const FUEL_IN_PLAN_EVENT = "bloom:fuel-in-plan";

/** Whether the plan should show recovery meals under each session. Default OFF
 *  so the week stays compact on screen — she can toggle recovery meals on. */
export function readFuelInPlan(): boolean {
  try {
    const v = localStorage.getItem(FUEL_IN_PLAN_KEY);
    return v === null ? false : v === "true";
  } catch {
    return false;
  }
}

export function writeFuelInPlan(v: boolean): void {
  try {
    localStorage.setItem(FUEL_IN_PLAN_KEY, String(v));
    window.dispatchEvent(new Event(FUEL_IN_PLAN_EVENT));
  } catch {}
}

// ── Movement level (logical, from real completed sessions) ───────────────────

export const YOGA_SESSIONS_KEY = "bloom:yoga-sessions";

/** Total workout sessions ever completed (length of the real history log). */
export function readWorkoutSessionCount(): number {
  const h = readJSON<unknown[]>(WORKOUT_LOG_KEY, []);
  return Array.isArray(h) ? h.length : 0;
}
/** Total yoga flows ever completed (a counter bumped on each finish). */
export function readYogaSessionCount(): number {
  const n = readJSON<number>(YOGA_SESSIONS_KEY, 0);
  return typeof n === "number" && n > 0 ? n : 0;
}
/** Bump the yoga completed-flows counter by one (called when a flow finishes). */
export function incrementYogaSession(): void {
  try { localStorage.setItem(YOGA_SESSIONS_KEY, String(readYogaSessionCount() + 1)); } catch {}
}

// ── Yoga energy log (so yoga counts toward the daily energy balance) ─────────

export const YOGA_LOG_KEY = "bloom:yoga-history";

/** Calories a yoga flow of `durationMin` burns for a body of `weightKg`.
 *  MET ~2.8 (gentle hatha/vinyasa): kcal = MET × 3.5 × weight(kg) / 200 × minutes.
 *  ONE formula — the plan's "expected burn" and the logged burn both call this. */
export function yogaSessionKcal(durationMin: number, weightKg = 65): number {
  return Math.round(((2.8 * 3.5 * (weightKg > 0 ? weightKg : 65)) / 200) * durationMin);
}

/** Log a finished yoga flow's calories, scaled by real bodyweight. */
export function logYogaSession(durationMin: number, weightKg = 65): void {
  try {
    const kcal = yogaSessionKcal(durationMin, weightKg);
    const log = readJSON<{ date: string; calories: number; durationMin: number }[]>(YOGA_LOG_KEY, []);
    log.push({ date: todayISO(), calories: kcal, durationMin });
    localStorage.setItem(YOGA_LOG_KEY, JSON.stringify(log));
    window.dispatchEvent(new Event("bloom:workout-updated"));
  } catch {}
}

/** Calories burned in yoga flows today (0 if none). */
export function readYogaCaloriesToday(): number {
  try {
    const log = readJSON<{ date: string; calories: number }[]>(YOGA_LOG_KEY, []);
    const t = todayISO();
    return log.filter((h) => h.date === t).reduce((s, h) => s + (h.calories || 0), 0);
  } catch {
    return 0;
  }
}

/** All training calories burned today (workout + yoga) — the energy-out figure. */
export function readTrainingCaloriesToday(): number {
  return readWorkoutCaloriesToday() + readYogaCaloriesToday();
}

// ── "Did she actually do it today?" — real completion, detected across tools ──
// These let Today auto-tick a plan step the moment she completes it in its own
// tool (finishes a workout/yoga flow, writes a diary entry), even if she never
// ticked it on Today itself.

const DIARY_KEY = "bloom:diary";

/** True if a workout was logged today (a real session finished). */
export function didWorkoutToday(): boolean {
  try {
    const h = readJSON<{ date?: string }[]>(WORKOUT_LOG_KEY, []);
    return Array.isArray(h) && h.some((x) => x?.date === todayISO());
  } catch { return false; }
}

/** True if a yoga flow was logged today. */
export function didYogaToday(): boolean {
  try {
    const h = readJSON<{ date?: string }[]>(YOGA_LOG_KEY, []);
    return Array.isArray(h) && h.some((x) => x?.date === todayISO());
  } catch { return false; }
}

/** True if she has written a diary entry dated today. */
export function hasDiaryEntryToday(): boolean {
  try {
    const entries = readJSON<{ date?: string }[]>(DIARY_KEY, []);
    return Array.isArray(entries) && entries.some((e) => e?.date === todayISO());
  } catch { return false; }
}

/** Count of workout + yoga sessions completed in the last 7 days. */
export function readSessionsThisWeek(): { workouts: number; yoga: number } {
  const cutoff = Date.now() - 7 * 864e5;
  const inWeek = (d?: string) => {
    if (!d) return false;
    const t = new Date(d + "T00:00:00").getTime();
    return !isNaN(t) && t >= cutoff;
  };
  const wk = readJSON<{ date?: string }[]>(WORKOUT_LOG_KEY, []).filter((h) => inWeek(h.date)).length;
  const yg = readJSON<{ date?: string }[]>(YOGA_LOG_KEY, []).filter((h) => inWeek(h.date)).length;
  return { workouts: wk, yoga: yg };
}

// A gentle, bloom-themed ladder. Thresholds ramp up so each level feels earned.
const MOVEMENT_LEVELS: { min: number; name: string; icon: string }[] = [
  { min: 0,   name: "Seedling", icon: "🌱" },
  { min: 3,   name: "Sprout",   icon: "🌿" },
  { min: 8,   name: "Bud",      icon: "🌷" },
  { min: 16,  name: "Bloom",    icon: "🌸" },
  { min: 28,  name: "Blossom",  icon: "🌺" },
  { min: 45,  name: "Radiant",  icon: "🌟" },
  { min: 70,  name: "Luminous", icon: "💫" },
  { min: 100, name: "Icon",     icon: "👑" },
];

export interface MovementLevel {
  total: number;   // combined workout + yoga sessions completed
  level: number;   // 1-based level number
  name: string;
  icon: string;
  toNext: number;  // sessions remaining to the next level (0 at max)
  pct: number;     // 0-100 progress within the current level
  isMax: boolean;
}

/** The user's overall movement level, derived from every session she's done. */
export function readMovementLevel(): MovementLevel {
  const total = readWorkoutSessionCount() + readYogaSessionCount();
  let i = 0;
  for (let k = 0; k < MOVEMENT_LEVELS.length; k++) {
    if (total >= MOVEMENT_LEVELS[k].min) i = k;
  }
  const cur = MOVEMENT_LEVELS[i];
  const next = MOVEMENT_LEVELS[i + 1];
  const span = next ? next.min - cur.min : 1;
  const inLevel = total - cur.min;
  return {
    total,
    level: i + 1,
    name: cur.name,
    icon: cur.icon,
    toNext: next ? next.min - total : 0,
    pct: next ? Math.min(100, Math.round((inLevel / span) * 100)) : 100,
    isMax: !next,
  };
}

// ── Level-up detection (remember the last level the user has seen) ───────────

export const MOVEMENT_LEVEL_SEEN_KEY = "bloom:movement-level-seen";

/** The last level we celebrated for her, or null if never recorded. */
export function readSeenLevel(): number | null {
  try {
    const v = localStorage.getItem(MOVEMENT_LEVEL_SEEN_KEY);
    return v == null ? null : Number(v);
  } catch {
    return null;
  }
}
export function writeSeenLevel(n: number): void {
  try { localStorage.setItem(MOVEMENT_LEVEL_SEEN_KEY, String(n)); } catch {}
}

// ── Reset a tool to a fresh first-time state (for previewing / starting over) ─

/** Clears every localStorage key a tool owns (bloom:<tool>-*) plus the shared
 *  movement-level marker, so the next load looks like a brand-new user. */
export function resetToolState(tool: "workout" | "yoga" | "meals" | "diet"): void {
  try {
    const kill: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(`bloom:${tool}-`)) kill.push(k);
    }
    kill.forEach((k) => localStorage.removeItem(k));
    localStorage.removeItem(MOVEMENT_LEVEL_SEEN_KEY);
  } catch {}
}

// ── "Is this part of my world set up yet?" — one source of truth per concept ──
// Today (and any other dashboard) reads THESE to decide populated-vs-empty, so
// the "have I set this up?" question is answered in one place, never guessed.

/** True once the user has planned at least one meal anywhere in the weekly plan. */
export function hasMealPlan(): boolean {
  const plan = readMealPlan();
  return Object.values(plan).some((day) => day && Object.values(day).some((rid) => !!rid));
}

/** True once the user has any planned movement (workout program/freestyle or a yoga schedule). */
export function hasMovementPlan(): boolean {
  return readWorkoutPlanDays().length > 0 || readYogaPlanDays().length > 0;
}

/** Wipe EVERY Bloomzein key from localStorage — a true "start fresh" so the app
 *  looks exactly like a brand-new user's first visit. The account/profile live
 *  server-side and are intentionally left untouched. */
export function resetEverything(): void {
  try {
    const kill: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      // Covers both the "bloom:" tool keys and the "bloomzein_" onboarding keys.
      if (k && k.startsWith("bloom")) kill.push(k);
    }
    kill.forEach((k) => localStorage.removeItem(k));
    window.dispatchEvent(new Event("storage"));
  } catch {}
}
