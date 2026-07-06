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

import { readDietProfile, type DietGoal } from "@/components/bloom/recipes/data";
import {
  readWorkoutPlanDays,
  readYogaPlanDays,
  readWorkoutCaloriesToday,
} from "@/lib/crossToolData";
import { readCyclePhase } from "@/components/bloom/cyclePhase";

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
  activityFactor: number;
  goal: DietGoal;
  lutealBump: boolean;    // luteal +5 % applied
  eatBack: number;        // calories added back from today's logged workouts
}

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

/**
 * Activity multiplier from real training load. 0 planned days → lightly
 * sedentary (1.35); each planned training day nudges it up, capped at
 * "moderately active" (1.60) so the maths stays honest.
 */
function activityFactor(trainingDays: number): number {
  return Math.min(1.6, 1.35 + trainingDays * 0.045);
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
  const height = (p as { heightCm?: number }).heightCm ?? DEFAULT_HEIGHT_CM;
  const age = (p as { age?: number }).age ?? DEFAULT_AGE;
  const goal = p.goal;

  // Mifflin-St Jeor (female): 10·kg + 6.25·cm − 5·age − 161
  const bmr = Math.round(10 * weight + 6.25 * height - 5 * age - 161);

  const trainingDays = plannedTrainingDays();
  const factor = activityFactor(trainingDays);
  const tdee = Math.round(bmr * factor);

  const phase = readCyclePhase();
  const lutealBump = phase === "luteal";

  let calories = tdee * GOAL_DELTA[goal];
  if (lutealBump) calories *= 1.05;

  const eatBack = forToday ? Math.round(readWorkoutCaloriesToday()) : 0;
  calories += eatBack;

  calories = Math.max(MIN_CALORIES, Math.round(calories / 10) * 10);

  // Protein from bodyweight; fat at 27 % of calories; carbs fill the rest.
  const protein = Math.round(weight * PROTEIN_PER_KG[goal]);
  const fat = Math.round((calories * 0.27) / 9);
  const carbs = Math.max(0, Math.round((calories - protein * 4 - fat * 9) / 4));

  return {
    calories, protein, carbs, fat,
    bmr, tdee, trainingDays, activityFactor: factor, goal, lutealBump, eatBack,
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
  if (t.trainingDays > 0) parts.push(`${t.trainingDays} training day${t.trainingDays > 1 ? "s" : ""} this week`);
  if (t.lutealBump) parts.push("+5% luteal");
  if (t.eatBack > 0) parts.push(`+${t.eatBack} kcal you burned today`);
  return parts.join(" · ");
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

/** How close a day's calories land to target: "under" | "on" | "over" (±12 %). */
export function calorieVerdict(total: number, target: number): "under" | "on" | "over" {
  if (target <= 0) return "on";
  const ratio = total / target;
  if (ratio < 0.88) return "under";
  if (ratio > 1.12) return "over";
  return "on";
}
