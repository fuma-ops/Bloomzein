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
  readWorkoutCaloriesToday,
  readTrainingCaloriesToday,
  readSessionsThisWeek,
  readTodayPlannedDay,
  readEatenToday,
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
  workoutDays: number;    // planned workout days
  yogaDays: number;       // planned yoga days
  trainingKcal: number;   // kcal/day the planned movement adds vs sedentary
  activityFactor: number;
  goal: DietGoal;
  lutealBump: boolean;    // luteal +5 % applied
  eatBack: number;        // calories added back from today's logged workouts
}

const SEDENTARY_FACTOR = 1.35; // baseline when nothing is planned

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
  return Math.min(1.6, SEDENTARY_FACTOR + trainingDays * 0.045);
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
  const factor = activityFactor(trainingDays);
  const tdee = Math.round(bmr * factor);
  // How many kcal/day the planned movement adds vs a sedentary baseline —
  // so the yoga/workout ↔ food link is a real, visible number.
  const trainingKcal = Math.round(bmr * (factor - SEDENTARY_FACTOR));

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
    bmr, tdee, trainingDays, workoutDays, yogaDays, trainingKcal,
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
  if (t.trainingDays > 0) parts.push(`${t.trainingDays} training day${t.trainingDays > 1 ? "s" : ""} this week`);
  if (t.lutealBump) parts.push("+5% luteal");
  if (t.eatBack > 0) parts.push(`+${t.eatBack} kcal you burned today`);
  return parts.join(" · ");
}

/** A plain sentence spelling out the movement → food link, e.g.
 *  "2 workouts + 3 yoga planned this week → +180 kcal/day to eat." */
export function movementFoodLine(t: TargetBreakdown): string | null {
  if (t.trainingKcal <= 0 || (t.workoutDays === 0 && t.yogaDays === 0)) return null;
  const bits: string[] = [];
  if (t.workoutDays) bits.push(`${t.workoutDays} workout${t.workoutDays > 1 ? "s" : ""}`);
  if (t.yogaDays) bits.push(`${t.yogaDays} yoga`);
  return `${bits.join(" + ")} planned this week → +${t.trainingKcal} kcal/day to eat`;
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
    const planned = readTodayPlannedDay();
    return (["breakfast", "lunch", "dinner", "snack"] as const).reduce<MacroTargets>((acc, slot) => {
      const id = planned[slot];
      const r = id ? RECIPES.find((x) => x.id === id) : undefined;
      if (!r) return acc;
      return {
        calories: acc.calories + (r.macros.calories || 0),
        protein: acc.protein + (r.macros.protein || 0),
        carbs: acc.carbs + (r.macros.carbs || 0),
        fat: acc.fat + (r.macros.fat || 0),
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

/** Today's full energy picture — target vs eaten vs burned. */
export function energyBalance(): EnergyBalance {
  const t = computeTargets(false);            // base goal, no eat-back
  const burned = Math.round(readTrainingCaloriesToday());
  const allowance = t.calories + burned;
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
