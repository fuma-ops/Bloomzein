/**
 * Nutrition target engine — the single source of truth for "how much should
 * she eat today". Every meals surface (daily target card, per-day totals,
 * recovery fuel) reads through here so the numbers can never disagree.
 *
 * The maths is real and defensible for a premium product:
 *   • BMR — Mifflin-St Jeor (the current clinical standard), female equation.
 *   • TDEE — BMR × an activity factor that scales with her ACTUAL planned
 *     training load (workout + yoga days this week), not a guess.
 *   • Goal — a sensible calorie delta (‑18 % to lose, +8 % to gain) with a
 *     safety floor so we never prescribe an unhealthy deficit.
 *   • Protein — goal-calibrated grams per kg bodyweight (1.6–2.0 g/kg), the
 *     evidence-based range for body recomposition.
 *   • Cycle — a small luteal-phase bump (+5 %), reflecting the measured rise
 *     in resting metabolic rate in the luteal phase. A real, felt touch.
 *   • Eat-back — calories she actually burned in today's logged workouts are
 *     added back to today's target, so the training and meals tools close
 *     the loop quantitatively, not just with a nice sentence.
 */

import { readDietProfile, RECIPES, type DietGoal } from "@/components/bloom/recipes/data";
import {
  readWorkoutPlanDays,
  readYogaPlanDays,
  readTrainingCaloriesToday,
  readSessionsThisWeek,
  readTodayPlannedDay,
  readPlannedDay,
  readEatenToday,
  portionFor,
  todayWeekday,
} from "@/lib/crossToolData";
import { readCyclePhase, phaseForDay, readCycleSettings, type CyclePhase } from "@/components/bloom/cyclePhase";

export interface MacroTargets {
  calories: number;
  protein: number; // grams
  carbs: number;   // grams
  fat: number;     // grams
}

export interface TargetBreakdown extends MacroTargets {
  bmr: number;
  tdee: number;
  trainingDays: number;   // distinct planned workout+yoga days this week
  workoutDays: number;    // planned workout days
  yogaDays: number;       // planned yoga days
  trainingKcal: number;   // kcal/day the planned movement adds vs sedentary
  activityFactor: number;
  goal: DietGoal;
  lutealBump: boolean;    // luteal +5 % applied
  eatBack: number;        // calories added back from today's logged workouts
}

// Maintenance from DAILY LIFE only (non-exercise activity). Training is NOT
// folded in here — it's added back per day from what she ACTUALLY burns
// (eat-back model), so a workout can never be counted twice.
const LIFESTYLE_FACTOR = 1.35;

// How much of a day's training burn is added back to the target, per goal.
// 100 % everywhere: on a cut this keeps training calorie-neutral (the deficit
// comes from diet, not from under-eating on training days — safer for energy,
// muscle and cycle health); maintain/gain always fuel fully.
const EATBACK_FRACTION: Record<DietGoal, number> = { lose: 1, maintain: 1, gain: 1 };

/** Sensible fallbacks for the two body inputs we don't always collect. */
const DEFAULT_HEIGHT_CM = 165;
const DEFAULT_AGE = 30;
/** Never prescribe below this for an adult woman, whatever the goal maths says. */
const MIN_CALORIES = 1200;

/** Distinct days this week she has ANY training (workout or yoga) planned. */
export function plannedTrainingDays(): number {
  const set = new Set([...readWorkoutPlanDays(), ...readYogaPlanDays()]);
  return set.size;
}

/** Weekday labels (Mon..Sun) she has any training planned — for meal alignment. */
export function trainingDaySet(): Set<string> {
  return new Set([...readWorkoutPlanDays(), ...readYogaPlanDays()]);
}

const GOAL_DELTA: Record<DietGoal, number> = {
  lose: 0.82,     // ~‑18 %
  maintain: 1.0,
  gain: 1.08,     // ~+8 %
};

/** Goal-calibrated protein, grams per kg bodyweight (evidence-based band). */
const PROTEIN_PER_KG: Record<DietGoal, number> = {
  lose: 1.9,      // preserve lean mass in a deficit
  maintain: 1.6,
  gain: 2.0,      // support new muscle
};

/**
 * The full daily target, personalised from her body, goal, planned training
 * load and cycle phase. `forToday` adds the eat-back from today's workouts.
 */
export function computeTargets(forToday = false): TargetBreakdown {
  const p = readDietProfile();
  const weight = p.weight > 0 ? p.weight : 65;
  const height = p.heightCm && p.heightCm > 0 ? p.heightCm : DEFAULT_HEIGHT_CM;
  const age = p.age && p.age > 0 ? p.age : DEFAULT_AGE;
  const goal = p.goal;

  // Mifflin-St Jeor (female): 10·kg + 6.25·cm − 5·age − 161
  const bmr = Math.round(10 * weight + 6.25 * height - 5 * age - 161);

  const workoutDays = readWorkoutPlanDays().length;
  const yogaDays = readYogaPlanDays().length;
  const trainingDays = plannedTrainingDays();

  // Maintenance from daily life ONLY — training is not baked in here (see
  // LIFESTYLE_FACTOR); it is added back per day as real burn below.
  const factor = LIFESTYLE_FACTOR;
  const tdee = Math.round(bmr * factor);

  const phase = readCyclePhase();
  const lutealBump = phase === "luteal";

  // Base goal target from diet alone (deficit / surplus + luteal bump), floored
  // to a safe minimum BEFORE any eat-back so the floor guards the real deficit.
  let base = tdee * GOAL_DELTA[goal];
  if (lutealBump) base *= 1.05;
  base = Math.max(MIN_CALORIES, Math.round(base / 10) * 10);

  // Eat-back: today's ACTUAL training burn (workout + yoga alike), scaled by the
  // per-goal fraction, added back so training days aren't under-eaten. This is
  // the ONLY place training touches the target — no double count.
  const eatBack = forToday ? Math.round(readTrainingCaloriesToday() * EATBACK_FRACTION[goal]) : 0;
  const calories = Math.max(MIN_CALORIES, Math.round((base + eatBack) / 10) * 10);

  // Protein from bodyweight; fat at 27 % of calories; carbs fill the rest.
  const protein = Math.round(weight * PROTEIN_PER_KG[goal]);
  const fat = Math.round((calories * 0.27) / 9);
  const carbs = Math.max(0, Math.round((calories - protein * 4 - fat * 9) / 4));

  return {
    calories, protein, carbs, fat,
    bmr, tdee, trainingDays, workoutDays, yogaDays,
    trainingKcal: eatBack, // today's eat-back (kept for back-compat consumers)
    activityFactor: factor, goal, lutealBump, eatBack,
  };
}

/** One-line, human explanation of what shaped today's number. */
export function targetRationale(t: TargetBreakdown): string {
  const parts: string[] = [];
  parts.push(
    t.goal === "lose" ? "gentle deficit to lean out"
    : t.goal === "gain" ? "slight surplus to build"
    : "balanced to maintain",
  );
  if (t.lutealBump) parts.push("+5% luteal");
  if (t.eatBack > 0) parts.push(`+${t.eatBack} kcal you burned today`);
  return parts.join(" · ");
}

/** A plain sentence spelling out the movement → food link. Under the eat-back
 *  model the plan doesn't inflate the resting target; instead you eat back what
 *  you actually burn on each training day — so that's what we say. */
export function movementFoodLine(t: TargetBreakdown): string | null {
  if (t.workoutDays === 0 && t.yogaDays === 0) return null;
  const bits: string[] = [];
  if (t.workoutDays) bits.push(`${t.workoutDays} workout${t.workoutDays > 1 ? "s" : ""}`);
  if (t.yogaDays) bits.push(`${t.yogaDays} yoga`);
  return `${bits.join(" + ")} planned this week — you'll eat back what you burn on each training day`;
}

/* ---------- Day totals (sum a day's chosen recipes) ---------- */

export interface DayTotals extends MacroTargets {}

export function sumMacros(recipes: { macros: MacroTargets }[]): DayTotals {
  return recipes.reduce<DayTotals>(
    (acc, r) => ({
      calories: acc.calories + (r.macros.calories || 0),
      protein: acc.protein + (r.macros.protein || 0),
      carbs: acc.carbs + (r.macros.carbs || 0),
      fat: acc.fat + (r.macros.fat || 0),
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 },
  );
}

/* ---------- Portion sizing — make a day's calories actually hit the target ----
   A recipe's macros are per serving; a build day (2 400+ kcal) needs bigger
   servings than a lean day. We give each eating occasion a share of the daily
   target, then scale the chosen recipe toward that share. Shares are the common
   evidence-based split (breakfast 25 %, lunch & dinner 30 % each, snack 15 %). */
export const SLOT_CAL_SHARE: Record<string, number> = {
  breakfast: 0.25, lunch: 0.30, dinner: 0.30, snack: 0.15, lunchbox: 0.30,
};

/** kcal a given eating occasion should provide for this daily target. */
export function slotBudget(dailyTarget: number, slot: string): number {
  return Math.round(dailyTarget * (SLOT_CAL_SHARE[slot] ?? 0.25));
}

/** Servings of `recipeCalories` needed to hit the slot's budget — clamped to a
 *  realistic 0.75×–1.75× and rounded to the nearest quarter serving. Selection
 *  already prefers appropriately-sized recipes, so this stays close to 1. */
export function portionForRecipe(recipeCalories: number, slot: string, dailyTarget: number): number {
  if (!recipeCalories || recipeCalories <= 0 || dailyTarget <= 0) return 1;
  const raw = slotBudget(dailyTarget, slot) / recipeCalories;
  const clamped = Math.max(0.75, Math.min(1.75, raw));
  return Math.round(clamped * 4) / 4;
}

/** How close a day's calories land to target: "under" | "on" | "over" (±12 %). */
export function calorieVerdict(total: number, target: number): "under" | "on" | "over" {
  if (target <= 0) return "on";
  const ratio = total / target;
  if (ratio < 0.88) return "under";
  if (ratio > 1.12) return "over";
  return "on";
}

/* ============================================================================
   Energy balance — the daily "command center" numbers, gathering every tool:
   goal target (body+phase+training) − eaten (logged meals) + burned (workout
   & yoga). One source of truth so Diet, Today and Meals never disagree.
============================================================================ */

/** Sum of macros for TODAY'S planned meals — planning your day fills the rings.
 *  One store: the meals live in the shared weekly plan (bloom:meals-plan). */
export function eatenToday(): MacroTargets {
  const empty = { calories: 0, protein: 0, carbs: 0, fat: 0 };
  try {
    const day = todayWeekday();
    const planned = readTodayPlannedDay();
    return (["breakfast", "lunch", "dinner", "snack"] as const).reduce<MacroTargets>((acc, slot) => {
      const id = planned[slot];
      const r = id ? RECIPES.find((x) => x.id === id) : undefined;
      if (!r) return acc;
      const f = portionFor(day, slot); // servings — so the eaten figure matches the plated plan
      return {
        calories: acc.calories + (r.macros.calories || 0) * f,
        protein: acc.protein + (r.macros.protein || 0) * f,
        carbs: acc.carbs + (r.macros.carbs || 0) * f,
        fat: acc.fat + (r.macros.fat || 0) * f,
      };
    }, empty);
  } catch {
    return empty;
  }
}

export interface EnergyBalance {
  goal: number;        // base daily goal (no eat-back)
  burned: number;      // workout + yoga calories today
  allowance: number;   // goal + burned — what she can eat today
  eaten: number;       // logged so far today
  remaining: number;   // allowance − eaten
  protein: { eaten: number; target: number };
  carbs: { eaten: number; target: number };
  fat: { eaten: number; target: number };
  logged: boolean;     // has she logged any meal today?
  verdict: "start" | "ontrack" | "close" | "over";
}

/** Today's full energy picture — target vs eaten vs burned. The allowance is
 *  the SAME number the Meals planner shows (computeTargets(true)), so Today,
 *  Diet and Meals can never disagree. */
export function energyBalance(): EnergyBalance {
  const t = computeTargets(false);            // resting goal, no eat-back
  const withBurn = computeTargets(true);      // resting goal + today's eat-back
  const burned = withBurn.eatBack;            // workout + yoga burned today
  const allowance = withBurn.calories;        // == what Meals shows as the target
  const e = eatenToday();
  const eaten = Math.round(e.calories);
  const remaining = allowance - eaten;
  const ratio = allowance > 0 ? eaten / allowance : 0;
  const verdict: EnergyBalance["verdict"] =
    eaten === 0 ? "start" : ratio > 1.08 ? "over" : ratio >= 0.9 ? "close" : "ontrack";
  return {
    goal: t.calories, burned, allowance, eaten, remaining,
    protein: { eaten: Math.round(e.protein), target: t.protein },
    carbs: { eaten: Math.round(e.carbs), target: t.carbs },
    fat: { eaten: Math.round(e.fat), target: t.fat },
    logged: eaten > 0,
    verdict,
  };
}

/* ---------- Goal projection (weight → ETA, from the plan she set up) ---------- */

export interface GoalProjection {
  current: number;
  target: number;
  toGo: number;          // kg still to change (signed toward target)
  direction: "lose" | "gain";
  pct: number;           // 0-100 progress from start weight
  weeklyRateKg: number;  // projected kg/week from her calorie plan
  etaWeeks: number | null;
}

/** Projects when she'll reach her goal weight, based on her planned calorie
 *  delta vs maintenance (7,700 kcal ≈ 1 kg). Null if no goal or wrong direction. */
export function goalProjection(): GoalProjection | null {
  const p = readDietProfile();
  const target = p.targetWeight;
  if (target == null) return null;
  const hist = p.weightHistory ?? [];
  const current = hist.length ? hist[hist.length - 1].kg : p.weight;
  const start = hist.length ? hist[0].kg : p.weight;
  const toGo = +(current - target).toFixed(1);
  if (Math.abs(toGo) < 0.1) return { current, target, toGo: 0, direction: toGo >= 0 ? "lose" : "gain", pct: 100, weeklyRateKg: 0, etaWeeks: 0 };

  const t = computeTargets(false);
  const dailyDelta = t.calories - t.tdee;          // negative = deficit
  const weeklyRateKg = +((dailyDelta * 7) / 7700).toFixed(2); // negative = losing
  const pct = start !== target ? Math.max(0, Math.min(100, Math.round(((start - current) / (start - target)) * 100))) : 0;

  // ETA only when the plan pushes toward the goal.
  let etaWeeks: number | null = null;
  const needToLose = toGo > 0;
  if (needToLose && weeklyRateKg < -0.01) etaWeeks = Math.ceil(toGo / Math.abs(weeklyRateKg));
  else if (!needToLose && weeklyRateKg > 0.01) etaWeeks = Math.ceil(Math.abs(toGo) / weeklyRateKg);

  return { current, target, toGo, direction: needToLose ? "lose" : "gain", pct, weeklyRateKg, etaWeeks };
}

/* ---------- This week (training + burn snapshot) ---------- */

export interface WeekSnapshot {
  workoutsDone: number;
  yogaDone: number;
  plannedTraining: number;
  sessionsDone: number;
}
export function weekSnapshot(): WeekSnapshot {
  const s = readSessionsThisWeek();
  return {
    workoutsDone: s.workouts,
    yogaDone: s.yoga,
    plannedTraining: plannedTrainingDays(),
    sessionsDone: s.workouts + s.yoga,
  };
}

/* ---------- Weekly energy (needed vs planned vs burned, by day) ---------- */

/** Daily target for a given cycle phase (same maths as computeTargets, minus
 *  today's eat-back) — so a weekly view can vary the "needed" line by phase. */
export function neededForPhase(phase: CyclePhase | null): number {
  const t = computeTargets(false);
  const base = t.tdee * GOAL_DELTA[t.goal];
  const cal = phase === "luteal" ? base * 1.05 : base;
  return Math.max(MIN_CALORIES, Math.round(cal / 10) * 10);
}

/** Sum of a weekday's PLANNED meal calories (portion-scaled, matching the plate). */
function plannedCaloriesForWeekday(day: string): number {
  const planned = readPlannedDay(day);
  return (["breakfast", "lunch", "dinner", "snack"] as const).reduce((sum, slot) => {
    const id = planned[slot];
    const r = id ? RECIPES.find((x) => x.id === id) : undefined;
    return r ? sum + (r.macros.calories || 0) * portionFor(day, slot) : sum;
  }, 0);
}

const WORKOUT_KCAL_EST = 250;   // typical strength session
const YOGA_KCAL_EST = 140;      // typical flow

export interface EnergyDay {
  label: string;          // Mon..Sun
  needed: number;         // target kcal (phase-adjusted)
  planned: number;        // planned meals kcal
  burned: number;         // planned training kcal
  phase: Exclude<CyclePhase, "any">;
  isToday: boolean;
}

/** This week's energy story, day by day — what her body needs, what she planned
 *  to eat, and what her planned training burns. Planned meals & training are
 *  weekday-keyed (real data); "needed" varies with each day's cycle phase. */
export function weeklyEnergy(): EnergyDay[] {
  const WEEK = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const workoutDays = new Set(readWorkoutPlanDays());
  const yogaDays = new Set(readYogaPlanDays());
  const s = readCycleSettings();
  const now = new Date(); now.setHours(0, 0, 0, 0);
  const dow = (now.getDay() + 6) % 7; // 0 = Monday
  const monday = now.getTime() - dow * 86400000;
  return WEEK.map((label, i) => {
    const date = new Date(monday + i * 86400000);
    const phase = phaseForDay(date, s) as Exclude<CyclePhase, "any">;
    return {
      label,
      needed: neededForPhase(phase),
      planned: Math.round(plannedCaloriesForWeekday(label)),
      burned: (workoutDays.has(label) ? WORKOUT_KCAL_EST : 0) + (yogaDays.has(label) ? YOGA_KCAL_EST : 0),
      phase,
      isToday: i === dow,
    };
  });
}

/* ---------- Coach — the best plan to reach her goal ---------- */

export interface CoachPlan {
  headline: string;
  steps: string[];
  targetCalories: number;
  workoutsPerWeek: number;
  yogaPerWeek: number;
  goal: DietGoal;
}

/** A concrete, personalised recommendation for hitting her goal. */
export function coachRecommendation(): CoachPlan {
  const t = computeTargets(false);
  const proj = goalProjection();
  const goal = t.goal;

  const workoutsPerWeek = goal === "gain" ? 4 : goal === "lose" ? 3 : 3;
  const yogaPerWeek = 2;

  const steps: string[] = [];
  if (goal === "lose") {
    steps.push(`Eat around ${t.calories.toLocaleString()} kcal/day, keeping protein near ${t.protein}g to hold onto muscle.`);
    steps.push(`Train ${workoutsPerWeek}× strength + ${yogaPerWeek}× yoga — strength protects your shape in a deficit.`);
    steps.push("Protein-forward dinners on training days (your meal plan already does this).");
  } else if (goal === "gain") {
    steps.push(`Eat around ${t.calories.toLocaleString()} kcal/day with ${t.protein}g protein to build.`);
    steps.push(`Train ${workoutsPerWeek}× strength + ${yogaPerWeek}× yoga — progressive overload drives growth.`);
    steps.push("Add a recovery meal after each session to fuel repair.");
  } else {
    steps.push(`Hold around ${t.calories.toLocaleString()} kcal/day, ${t.protein}g protein.`);
    steps.push(`Keep moving ${workoutsPerWeek}× strength + ${yogaPerWeek}× yoga to stay strong & even.`);
    steps.push("Let your cycle guide intensity — restorative on period & luteal days.");
  }

  const headline =
    proj?.etaWeeks != null
      ? `Reach ${proj.target}kg in ~${proj.etaWeeks} week${proj.etaWeeks > 1 ? "s" : ""} with this plan`
      : goal === "maintain"
      ? "Your plan to stay strong, lean & steady"
      : "Set a goal weight to see your timeline";

  return { headline, steps, targetCalories: t.calories, workoutsPerWeek, yogaPerWeek, goal };
}
