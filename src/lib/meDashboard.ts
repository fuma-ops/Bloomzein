// ── Me dashboard — the "am I consistent?" numbers ────────────────────────────
// Pure read helpers that turn the app's REAL canonical stores into the little
// consistency dashboard on the Me page. Nothing here invents data: every figure
// traces back to a store another tool already writes (workout/yoga history, the
// mood log, the diary, the meal-eaten log, the budget, and the hydration history
// stamped by dailyLog.ts). Keep it that way — read stores, don't fork them.
import { localDateISO } from "./localDate";
import { readDailyWaterLog, DEFAULT_WATER_GOAL } from "./dailyLog";
import { goalProjection } from "./nutritionTargets";

function read<T>(key: string, fallback: T): T {
  try { const v = localStorage.getItem(key); return v ? (JSON.parse(v) as T) : fallback; }
  catch { return fallback; }
}

/** Local ISO date `n` days before today (0 = today). Local, never UTC. */
function isoDaysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return localDateISO(d);
}

/** Mood key → valence score (1 low … 5 bright), so a mixed-vocabulary mood log
 *  becomes one honest "mood over time" line. Unknown moods sit at neutral 3. */
const MOOD_VALENCE: Record<string, number> = {
  happy: 5, energetic: 5, calm: 4, sensitive: 3, bloated: 3, tired: 2, sad: 2, cramps: 1,
};
export function moodValence(mood: string): number {
  return MOOD_VALENCE[mood] ?? 3;
}

export interface MoodPoint { date: string; mood: string; score: number }
export interface CalendarDay {
  date: string;
  /** how many of the day's rituals were hit (0–5): workout, yoga, journal, mood, hydration */
  score: number;
  workout: boolean; yoga: boolean; journal: boolean; mood: boolean; hydrated: boolean;
}
export interface Sparkbar { date: string; value: number }
export interface Pillar { key: string; label: string; pct: number }
export interface BudgetSummary { has: boolean; plan: number; spent: number; pct: number; currency: string }
export interface GoalSummary {
  has: boolean;
  goal: "lose" | "maintain" | "gain";
  current: number | null;      // kg
  target: number | null;       // kg (null for maintain / not set)
  startKg: number | null;      // first logged weight
  pct: number;                 // progress toward target (0–100); 100 = maintaining/reached
  toGo: number | null;         // kg still to go (signed)
  etaWeeks: number | null;     // projected weeks to target when the plan pushes that way
  onTrack: boolean;
  series: { date: string; kg: number }[];
}

export interface MeDashboard {
  workoutsTotal: number;
  yogaTotal: number;
  moveStreak: number;
  journalStreak: number;
  bloomScore: number;              // 0–100 aggregate consistency, last `windowDays`
  windowDays: number;
  pillars: Pillar[];               // movement / nourish / hydrate / reflect
  mood: MoodPoint[];               // chronological, within window
  calendar: CalendarDay[];         // last full weeks, week-aligned (Mon→Sun)
  workoutSpark: Sparkbar[];        // sessions per day, last 14
  hydrateRate: number;             // % of tracked days hitting the water goal
  nourishRate: number;             // % of days with ≥2 meals logged
  budget: BudgetSummary;
  goal: GoalSummary;               // diet goal (lose/maintain/gain) + weight progress
  weight: { date: string; kg: number }[];
}

const CURRENCY_SYMBOL: Record<string, string> = { USD: "$", EUR: "€", GBP: "£", MAD: "DH", CAD: "$", AUD: "$" };

/** How many days a set of ISO dates covers within the last `window` days. */
function daysHitInWindow(dates: Set<string>, window: number): number {
  let hit = 0;
  for (let i = 0; i < window; i++) if (dates.has(isoDaysAgo(i))) hit++;
  return hit;
}

/** Consecutive-day streak ending today (or yesterday) from a set of ISO dates. */
function streakFrom(dates: Set<string>): number {
  if (!dates.size) return 0;
  // Allow the streak to still count if today isn't logged yet but yesterday was.
  let start = dates.has(isoDaysAgo(0)) ? 0 : dates.has(isoDaysAgo(1)) ? 1 : -1;
  if (start < 0) return 0;
  let streak = 0;
  for (let i = start; i < 400; i++) {
    if (dates.has(isoDaysAgo(i))) streak++;
    else break;
  }
  return streak;
}

export function computeMeDashboard(windowDays = 30): MeDashboard {
  // ── Raw stores ──
  const workoutHist = read<{ date?: string }[]>("bloom:workout-history", []);
  const yogaHist = read<{ date?: string }[]>("bloom:yoga-history", []);
  const yogaCount = read<number>("bloom:yoga-sessions", 0);
  const moodLog = read<Record<string, string>>("bloom:mood-log-v2", {});
  const diary = read<{ date?: string }[]>("bloom:diary", []);
  const eaten = read<Record<string, string[]>>("bloom:diet-eaten", {});
  const waterLog = readDailyWaterLog();

  const workoutDates = new Set((Array.isArray(workoutHist) ? workoutHist : []).map((h) => h?.date).filter(Boolean) as string[]);
  const yogaDates = new Set((Array.isArray(yogaHist) ? yogaHist : []).map((h) => h?.date).filter(Boolean) as string[]);
  const journalDates = new Set((Array.isArray(diary) ? diary : []).map((d) => d?.date).filter(Boolean) as string[]);
  const moodDates = new Set(Object.keys(moodLog || {}));
  const moveDates = new Set([...workoutDates, ...yogaDates]);
  const hydratedDates = new Set(
    Object.entries(waterLog).filter(([, v]) => v && v.water >= (v.goal || DEFAULT_WATER_GOAL)).map(([d]) => d),
  );
  const nourishedDates = new Set(
    Object.entries(eaten || {}).filter(([, slots]) => Array.isArray(slots) && slots.length >= 2).map(([d]) => d),
  );

  // ── Totals & streaks ──
  const workoutsTotal = Array.isArray(workoutHist) ? workoutHist.length : 0;
  const yogaTotal = typeof yogaCount === "number" && yogaCount > 0 ? yogaCount : yogaDates.size;
  const moveStreak = streakFrom(moveDates);
  const journalStreak = streakFrom(journalDates);

  // ── Pillars (share of the window each ritual was hit) ──
  const pct = (hit: number) => Math.round((Math.min(hit, windowDays) / windowDays) * 100);
  const movementPct = pct(daysHitInWindow(moveDates, windowDays));
  const nourishPct = pct(daysHitInWindow(nourishedDates, windowDays));
  const hydratePct = pct(daysHitInWindow(hydratedDates, windowDays));
  const reflectPct = pct(daysHitInWindow(new Set([...journalDates, ...moodDates]), windowDays));
  const pillars: Pillar[] = [
    { key: "movement", label: "Movement", pct: movementPct },
    { key: "nourish", label: "Nourish", pct: nourishPct },
    { key: "hydrate", label: "Hydrate", pct: hydratePct },
    { key: "reflect", label: "Reflect", pct: reflectPct },
  ];
  const bloomScore = Math.round(pillars.reduce((s, p) => s + p.pct, 0) / pillars.length);

  // ── Mood over time (chronological within window) ──
  const mood: MoodPoint[] = Object.entries(moodLog || {})
    .filter(([d]) => d >= isoDaysAgo(windowDays - 1))
    .sort((a, b) => (a[0] < b[0] ? -1 : 1))
    .map(([date, m]) => ({ date, mood: m, score: moodValence(m) }));

  // ── Consistency calendar (week-aligned, last 5 full weeks incl. this one) ──
  const weeks = 5;
  const todayDow = (new Date().getDay() + 6) % 7; // 0 = Monday
  const spanDays = weeks * 7 - (6 - todayDow); // back-fill to the Monday of the first week
  const calendar: CalendarDay[] = [];
  for (let i = spanDays - 1; i >= 0; i--) {
    const date = isoDaysAgo(i);
    const day = {
      date,
      workout: workoutDates.has(date),
      yoga: yogaDates.has(date),
      journal: journalDates.has(date),
      mood: moodDates.has(date),
      hydrated: hydratedDates.has(date),
    };
    const score = [day.workout, day.yoga, day.journal, day.mood, day.hydrated].filter(Boolean).length;
    calendar.push({ ...day, score });
  }

  // ── Workout sparkline (sessions per day, last 14) ──
  const workoutSpark: Sparkbar[] = [];
  for (let i = 13; i >= 0; i--) {
    const date = isoDaysAgo(i);
    const value = (Array.isArray(workoutHist) ? workoutHist : []).filter((h) => h?.date === date).length
      + (Array.isArray(yogaHist) ? yogaHist : []).filter((h) => h?.date === date).length;
    workoutSpark.push({ date, value });
  }

  const trackedWaterDays = Object.keys(waterLog).filter((d) => d >= isoDaysAgo(windowDays - 1)).length;
  const hydrateRate = trackedWaterDays ? Math.round((daysHitInWindow(hydratedDates, windowDays) / trackedWaterDays) * 100) : 0;
  const trackedMealDays = Object.keys(eaten || {}).filter((d) => d >= isoDaysAgo(windowDays - 1)).length;
  const nourishRate = trackedMealDays ? Math.round((daysHitInWindow(nourishedDates, windowDays) / trackedMealDays) * 100) : 0;

  // ── Budget adherence (this month: planned vs actual spend) ──
  const budgetPlan = read<Record<string, number>>("bp:budget", {});
  const txns = read<{ date?: string; amount?: number; type?: string }[]>("bp:txns", []);
  const currency = read<string>("bp:currency", "USD");
  const monthPrefix = localDateISO(new Date()).slice(0, 7);
  const plan = Object.values(budgetPlan || {}).reduce((s, v) => s + (Number(v) || 0), 0);
  const spent = (Array.isArray(txns) ? txns : [])
    .filter((t) => t?.type === "expense" && typeof t?.date === "string" && t.date.startsWith(monthPrefix))
    .reduce((s, t) => s + (Number(t?.amount) || 0), 0);
  const budget: BudgetSummary = {
    has: plan > 0 || spent > 0,
    plan, spent,
    pct: plan > 0 ? Math.round((spent / plan) * 100) : 0,
    currency: CURRENCY_SYMBOL[currency] ?? "$",
  };

  // ── Diet goal + weight progress (canonical: goalProjection) ──
  const profile = read<{ goal?: string; targetWeight?: number; weight?: number; weightHistory?: { date: string; kg: number }[] }>("bloom:diet-profile", {});
  const weight = (profile?.weightHistory ?? []).filter((w) => w && w.date && typeof w.kg === "number").slice(-30);
  const dietGoal = (profile?.goal === "lose" || profile?.goal === "gain" || profile?.goal === "maintain") ? profile.goal : "maintain";
  const currentKg = weight.length ? weight[weight.length - 1].kg : (typeof profile?.weight === "number" ? profile.weight : null);
  const startKg = weight.length ? weight[0].kg : currentKg;
  const proj = goalProjection(); // null when no targetWeight set
  const goal: GoalSummary = proj
    ? { has: true, goal: dietGoal, current: proj.current, target: proj.target, startKg, pct: proj.pct, toGo: proj.toGo, etaWeeks: proj.etaWeeks, onTrack: dietGoal === "maintain" ? true : proj.etaWeeks != null, series: weight }
    : {
        has: currentKg != null || weight.length > 0,
        goal: dietGoal, current: currentKg, target: typeof profile?.targetWeight === "number" ? profile.targetWeight : null, startKg,
        pct: dietGoal === "maintain" ? 100 : 0,
        toGo: typeof profile?.targetWeight === "number" && currentKg != null ? +(currentKg - profile.targetWeight).toFixed(1) : null,
        etaWeeks: null, onTrack: dietGoal === "maintain", series: weight,
      };

  return {
    workoutsTotal, yogaTotal, moveStreak, journalStreak,
    bloomScore, windowDays, pillars, mood, calendar, workoutSpark,
    hydrateRate, nourishRate, budget, goal, weight,
  };
}
