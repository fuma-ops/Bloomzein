/* Recipes, pantry and intention data now live in the unified recipe database
 * shared with the Diet tool. See @/components/bloom/recipes/data. */
export {
  RECIPES,
  PANTRY,
  INTENTIONS,
  passesMyRules,
  readDietProfile,
  DIET_PROFILE_KEY,
  DEFAULT_DIET_PROFILE,
  type Recipe,
  type RecipeIngredient,
  type Intention,
  type Vibe,
  type CyclePhase,
  type MealType,
  type PantryCategoryKey,
  type PantryCategory,
  type DietProfile,
} from "@/components/bloom/recipes/data";

export const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;
export const KID_DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri"] as const;

/* Storage table (days fridge) for "Still good?" checker */
export const STORAGE_TABLE: { keyword: string; fridgeDays: number; note?: string }[] = [
  { keyword: "rice", fridgeDays: 4 },
  { keyword: "pasta", fridgeDays: 4 },
  { keyword: "soup", fridgeDays: 4 },
  { keyword: "stew", fridgeDays: 5 },
  { keyword: "salmon", fridgeDays: 2 },
  { keyword: "chicken", fridgeDays: 3 },
  { keyword: "salad", fridgeDays: 2 },
  { keyword: "oats", fridgeDays: 3 },
  { keyword: "lentil", fridgeDays: 5 },
];

/* Seasonal table — quick reference */
export const SEASONAL: Record<number, string[]> = {
  0:  ["citrus", "kale", "beets", "cabbage"],          // Jan
  1:  ["citrus", "leeks", "spinach", "carrots"],
  2:  ["asparagus", "radish", "spinach", "spring onion"],
  3:  ["asparagus", "strawberries", "peas", "rhubarb"],
  4:  ["strawberries", "asparagus", "lettuce", "peas"],
  5:  ["berries", "zucchini", "tomatoes", "cherries"],
  6:  ["tomatoes", "peaches", "corn", "basil"],
  7:  ["tomatoes", "peppers", "melon", "eggplant"],
  8:  ["figs", "grapes", "apples", "squash"],
  9:  ["apples", "pumpkin", "pears", "mushrooms"],
  10: ["squash", "pumpkin", "pomegranate", "cabbage"],
  11: ["citrus", "pomegranate", "kale", "beets"],
};
