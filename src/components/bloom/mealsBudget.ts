import { RECIPES } from "./recipes/data";
import { readMealPlan } from "@/lib/crossToolData";

// Rough per-meal grocery cost by the recipe's "$"/"$$"/"$$$" cost tier,
// in the user's chosen currency unit — a ballpark, not an FX conversion.
const TIER_COST: Record<string, number> = { "$": 4, "$$": 8, "$$$": 14 };

export interface MealPlanEstimate {
  weekly: number;
  monthly: number;
  mealCount: number;
}

// Workout → Meals already biases dinners toward protein; Budget ↔ Meals
// reads the same weekly plan to estimate a grocery cost so it can suggest
// a Food budget amount.
export function estimateWeeklyGroceryCost(): MealPlanEstimate | null {
  try {
    const plan = readMealPlan(); // this week's slice of the 4-week month
    if (!plan || Object.keys(plan).length === 0) return null;
    let weekly = 0;
    let mealCount = 0;
    Object.values(plan).forEach((day) => {
      Object.values(day || {}).forEach((recipeId) => {
        if (!recipeId) return;
        const recipe = RECIPES.find((r) => r.id === recipeId);
        if (!recipe) return;
        weekly += TIER_COST[recipe.cost] ?? 0;
        mealCount++;
      });
    });
    if (mealCount === 0) return null;
    return { weekly, monthly: Math.round(weekly * (52 / 12)), mealCount };
  } catch {
    return null;
  }
}
