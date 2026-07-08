import type { LucideIcon } from "lucide-react";
import {
  Beef,
  Carrot,
  Wheat,
  Milk,
  Apple,
  Flame,
  Snowflake,
  Cookie,
  Baby,
  SprayCan,
  Bath,
  Scroll,
  HeartPulse,
} from "lucide-react";

/* ---------- Core types ---------- */

export type DietPhase = "menstrual" | "follicular" | "ovulatory" | "luteal";
export type DietGoal = "lose" | "maintain" | "gain";
export type MealType = "breakfast" | "lunch" | "dinner" | "snack" | "lunchbox";
export type DietType = "omnivore" | "vegetarian" | "vegan" | "gluten-free" | "halal";
/** Real, recognised eating plans the Diet tool filters recipes by. */
export type DietRegime =
  | "balanced" | "mediterranean" | "high-protein" | "low-carb"
  | "vegetarian" | "vegan" | "pescatarian" | "gluten-free" | "halal";
export type Allergy = "dairy" | "nuts" | "eggs" | "soy" | "shellfish";
export type CookingFrequency = "quick" | "normal" | "love";

export type CyclePhase = "period" | "follicular" | "ovulation" | "luteal" | "any";
export type Intention =
  | "light"
  | "protein"
  | "plant"
  | "energy"
  | "comfort"
  | "quick"
  | "budget"
  | "cycle";
export type Vibe = "Light" | "Balanced" | "Protein-rich" | "Energizing";
export type Difficulty = "quick" | "easy" | "elaborate" | "medium" | "hard";

export interface WeightEntry { date: string; kg: number }

export interface DietProfile {
  goal: DietGoal;
  dietType: DietType;
  /** The chosen eating plan — drives which recipes are shown. */
  regime: DietRegime;
  allergies: Allergy[];
  cookingFrequency: CookingFrequency;
  /** Weight log over time (kg), oldest → newest. */
  weightHistory: WeightEntry[];
  /** Optional goal weight (kg) to progress toward. */
  targetWeight?: number;
  /** Height in cm — used for an accurate BMR (Mifflin-St Jeor). */
  heightCm?: number;
  /** Age in years — used for an accurate BMR. */
  age?: number;
}

export const DIET_PROFILE_KEY = "bloom:diet-profile";

export const DEFAULT_DIET_PROFILE: DietProfile & { weight: number } = {
  goal: "maintain",
  dietType: "omnivore",
  regime: "balanced",
  allergies: [],
  cookingFrequency: "normal",
  weight: 65,
  weightHistory: [],
};

// ── Recipe photos ───────────────────────────────────────────────────────────
// Every recipe maps to ONE deterministic filename in /public/images/recipes.
// Drop an image with that name and it appears automatically — no per-recipe
// edit. Explicit `image`/`photo` fields still win when set.
function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}
export function recipeSlug(r: { mealType: string; cuisine?: string; name: string }): string {
  return [r.mealType, slugify(r.cuisine || "global"), slugify(r.name)].join("-");
}
export function recipeImageSrc(r: { mealType: string; cuisine?: string; name: string; image?: string; photo?: string }): string {
  if (r.image) return r.image;
  if (r.photo) return `/images/recipes/${r.photo}`;
  return `/images/recipes/${recipeSlug(r)}.webp`;
}

export function readDietProfile(): DietProfile & { weight: number } {
  try {
    const raw = localStorage.getItem(DIET_PROFILE_KEY);
    if (!raw) return DEFAULT_DIET_PROFILE;
    return { ...DEFAULT_DIET_PROFILE, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_DIET_PROFILE;
  }
}

// Has the user actually completed the Diet setup? Until they have, nothing that
// depends on a personalised goal/target (calorie targets, "tuned to your goal")
// should appear — meals then follow only the selected week vibe.
export const DIET_SETUP_KEY = "bloom:diet-setup-complete";
export function hasDietSetup(): boolean {
  try {
    const raw = localStorage.getItem(DIET_SETUP_KEY);
    return raw ? JSON.parse(raw) === true : false;
  } catch {
    return false;
  }
}

/* ---------- Portion scaling — bake the planned serving size straight into the
   ingredient amounts (no "×1.4" label; the recipe just reads naturally). Scales
   a quantity string ("200g", "1/2 cup", "1 tsp") by a factor, formatting mass
   units glued ("280g") and counts as clear ASCII mixed numbers ("3/4 cup",
   "1 1/2 tsp"). Non-numeric quantities ("a pinch", "to taste") are untouched. */
// A whole and a fraction are separated by a space so "1 1/4 cup" can never be
// misread as "1/4 cup".
const NICE_FRACTIONS: [number, string][] = [
  [0, ""], [0.25, "1/4"], [1 / 3, "1/3"], [0.5, "1/2"], [2 / 3, "2/3"], [0.75, "3/4"],
];
function niceFraction(n: number): string {
  const whole = Math.floor(n + 1e-9);
  const frac = n - whole;
  let best = "", bestD = 1;
  for (const [v, s] of NICE_FRACTIONS) { const d = Math.abs(frac - v); if (d < bestD) { bestD = d; best = s; } }
  if (!best) return String(whole);              // whole number, no fraction
  return whole > 0 ? `${whole} ${best}` : best; // "1 1/4"  or  "3/4"
}
export function scaleQuantity(qty: string, factor: number): string {
  if (!qty || !factor || factor === 1) return qty;
  const m = String(qty).match(/^\s*(\d+\s+\d+\/\d+|\d+\/\d+|\d*\.?\d+)\s*(.*)$/);
  if (!m) return qty;
  const numStr = m[1];
  const rest = (m[2] || "").trim();
  let val: number;
  if (/\s/.test(numStr)) { const [w, fr] = numStr.split(/\s+/); const [a, b] = fr.split("/").map(Number); val = Number(w) + a / b; }
  else if (numStr.includes("/")) { const [a, b] = numStr.split("/").map(Number); val = a / b; }
  else val = parseFloat(numStr);
  if (!isFinite(val)) return qty;
  const scaled = val * factor;
  const unit = rest.toLowerCase();
  if (/^(g|ml)\b/.test(unit)) return `${scaled >= 20 ? Math.round(scaled / 5) * 5 : Math.round(scaled)}${rest}`;
  if (/^(kg|l)\b/.test(unit)) return `${Math.round(scaled * 100) / 100}${rest}`;
  return `${niceFraction(Math.round(scaled * 4) / 4)}${rest ? " " + rest : ""}`;
}

// Merge-write the shared Diet profile. Preferences edited elsewhere (e.g. the
// Meal Planner's setup guide: cooking time & allergies) flow through here so
// there is exactly ONE profile — no forked copy. Fires a storage event so any
// open tool re-reads immediately.
export function updateDietProfile(
  patch: Partial<DietProfile & { weight: number }>,
): DietProfile & { weight: number } {
  const next = { ...readDietProfile(), ...patch };
  try {
    localStorage.setItem(DIET_PROFILE_KEY, JSON.stringify(next));
    window.dispatchEvent(new Event("storage"));
  } catch {}
  return next;
}

// Shared preference option lists (used by both Diet setup and the Meal Planner
// setup guide) so labels never drift between tools.
export const COOKING_OPTIONS: { key: CookingFrequency; label: string }[] = [
  { key: "quick", label: "Quick — under 15 min" },
  { key: "normal", label: "Normal — under 30 min" },
  { key: "love", label: "Love cooking" },
];
export const ALLERGY_OPTIONS: { key: Allergy; label: string }[] = [
  { key: "dairy", label: "Dairy" },
  { key: "nuts", label: "Nuts" },
  { key: "eggs", label: "Eggs" },
  { key: "soy", label: "Soy" },
  { key: "shellfish", label: "Shellfish" },
];

/* ---------- Pantry (for shopping list / ingredient categorisation) ---------- */

export type PantryCategoryKey =
  | "proteins"
  | "vegetables"
  | "grains"
  | "dairy"
  | "fruits"
  | "condiments"
  | "frozen"
  | "baking"
  | "baby"
  | "cleaning"
  | "bath"
  | "paper"
  | "personal";

export interface PantryCategory {
  key: PantryCategoryKey;
  label: string;
  icon: LucideIcon;
  isHome?: boolean;
  storeSection: "Produce" | "Dairy" | "Meat & Fish" | "Pantry" | "Frozen" | "Home Needs";
  items: string[];
}

export const PANTRY: PantryCategory[] = [
  {
    key: "proteins", label: "Proteins", icon: Beef, storeSection: "Meat & Fish",
    items: ["chicken breast", "ground beef", "salmon", "tuna", "eggs", "tofu", "tempeh", "lentils", "chickpeas", "black beans", "white beans", "shrimp"],
  },
  {
    key: "vegetables", label: "Vegetables", icon: Carrot, storeSection: "Produce",
    items: ["spinach", "kale", "broccoli", "carrots", "tomatoes", "cucumber", "bell pepper", "onion", "garlic", "sweet potato", "zucchini", "avocado", "beets", "mushrooms", "celery"],
  },
  {
    key: "grains", label: "Grains", icon: Wheat, storeSection: "Pantry",
    items: ["rice", "quinoa", "oats", "pasta", "couscous", "bread", "tortillas", "buckwheat"],
  },
  {
    key: "dairy", label: "Dairy", icon: Milk, storeSection: "Dairy",
    items: ["milk", "greek yogurt", "feta", "parmesan", "cheddar", "mozzarella", "butter", "cream cheese"],
  },
  {
    key: "fruits", label: "Fruits", icon: Apple, storeSection: "Produce",
    items: ["bananas", "apples", "strawberries", "blueberries", "raspberries", "lemons", "limes", "oranges", "grapes", "mango"],
  },
  {
    key: "condiments", label: "Condiments & Spices", icon: Flame, storeSection: "Pantry",
    items: ["olive oil", "salt", "pepper", "cumin", "paprika", "cinnamon", "turmeric", "soy sauce", "honey", "maple syrup", "vinegar", "mustard", "tahini", "hot sauce", "vanilla"],
  },
  {
    key: "frozen", label: "Frozen", icon: Snowflake, storeSection: "Frozen",
    items: ["frozen berries", "frozen peas", "frozen spinach", "frozen corn", "frozen edamame", "frozen mango", "frozen fish fillets"],
  },
  {
    key: "baking", label: "Baking", icon: Cookie, storeSection: "Pantry",
    items: ["flour", "sugar", "brown sugar", "baking powder", "baking soda", "cocoa", "chocolate chips", "almond flour"],
  },
  // Home Needs
  { key: "baby", label: "Baby", icon: Baby, isHome: true, storeSection: "Home Needs",
    items: ["diapers", "wipes", "formula", "baby food jars", "baby cereal", "diaper cream"] },
  { key: "cleaning", label: "Cleaning", icon: SprayCan, isHome: true, storeSection: "Home Needs",
    items: ["dish soap", "laundry detergent", "surface cleaner", "sponges", "trash bags", "dishwasher pods"] },
  { key: "bath", label: "Bath & Shower", icon: Bath, isHome: true, storeSection: "Home Needs",
    items: ["shampoo", "conditioner", "shower gel", "soap bar", "toothpaste", "deodorant"] },
  { key: "paper", label: "Paper goods", icon: Scroll, isHome: true, storeSection: "Home Needs",
    items: ["toilet paper", "paper towels", "tissues", "napkins"] },
  { key: "personal", label: "Personal care", icon: HeartPulse, isHome: true, storeSection: "Home Needs",
    items: ["pads", "tampons", "face wash", "moisturizer", "razors", "cotton pads"] },
];

export const INTENTIONS: { key: Intention; label: string; blurb: string }[] = [
  { key: "light", label: "Light & fresh", blurb: "Bright, easy on the body." },
  { key: "protein", label: "High protein", blurb: "Strong & satiated." },
  { key: "plant", label: "Plant based", blurb: "All-veg week." },
  { key: "energy", label: "Energy boost", blurb: "Steady fuel all day." },
  { key: "comfort", label: "Comfort food", blurb: "Warm and cozy." },
  { key: "quick", label: "Under 20 min", blurb: "Speed-girl week." },
  { key: "budget", label: "Budget week", blurb: "Cheap & cheerful." },
  { key: "cycle", label: "Cycle sync", blurb: "Match your phase." },
];

/* ---------- Phase nutrition content (Tab 1 cards) ---------- */

export interface PhaseInfo {
  key: DietPhase;
  label: string;
  tone: string;
  eat: string[];
  avoid: string[];
  keyNutrients: string[];
  snack: string;
  color: string; // tailwind-friendly base color token
}

export const PHASE_INFO: Record<DietPhase, PhaseInfo> = {
  menstrual: {
    key: "menstrual",
    label: "Menstrual",
    tone: "your body is working hard, nourish it",
    eat: ["Spinach", "Lentils", "Dark chocolate", "Ginger", "Salmon", "Beets", "Pumpkin seeds"],
    avoid: ["Alcohol", "Caffeine", "Salty snacks", "Red meat", "Cold raw foods"],
    keyNutrients: ["Iron", "Magnesium", "Omega-3", "Vitamin C", "Zinc"],
    snack: "Dates + almond butter",
    color: "hotpink",
  },
  follicular: {
    key: "follicular",
    label: "Follicular",
    tone: "energy is rising, fuel the momentum",
    eat: ["Eggs", "Fermented foods (yoghurt, kefir)", "Flaxseeds", "Avocado", "Broccoli", "Citrus"],
    avoid: ["Processed sugar", "Heavy fried foods", "Alcohol"],
    keyNutrients: ["Protein", "B vitamins", "Antioxidants", "Zinc", "Vitamin E"],
    snack: "Greek yoghurt + berries + flaxseeds",
    color: "amber",
  },
  ovulatory: {
    key: "ovulatory",
    label: "Ovulatory",
    tone: "your strongest window — eat to perform",
    eat: ["Raw vegetables", "Cruciferous veg", "Quinoa", "Fibre-rich fruits", "Chickpeas", "Flaxseeds"],
    avoid: ["Excess alcohol", "Estrogen-disrupting foods", "Processed soy"],
    keyNutrients: ["Fibre", "Folate", "Magnesium", "Vitamin B6", "Antioxidants"],
    snack: "Carrot sticks + hummus + handful of seeds",
    color: "rose",
  },
  luteal: {
    key: "luteal",
    label: "Luteal",
    tone: "cravings are real — here's how to satisfy them wisely",
    eat: ["Complex carbs", "Dark chocolate", "Salmon", "Sweet potato", "Chamomile tea", "Walnuts"],
    avoid: ["Caffeine", "Alcohol", "Refined carbs", "Excess salt"],
    keyNutrients: ["Complex carbs", "Omega-3", "Calcium", "Vitamin D", "Magnesium"],
    snack: "Banana + dark chocolate + walnuts",
    color: "violet",
  },
};

/** Phase-relevant micronutrients shown as progress bars on the Today tab. */
export const PHASE_MICROS: Record<DietPhase, { key: keyof Recipe["micros"]; label: string; target: number; unit: string }[]> = {
  menstrual: [
    { key: "iron", label: "Iron", target: 18, unit: "mg" },
    { key: "magnesium", label: "Magnesium", target: 310, unit: "mg" },
    { key: "omega3", label: "Omega-3", target: 1.6, unit: "g" },
  ],
  luteal: [
    { key: "iron", label: "Iron", target: 18, unit: "mg" },
    { key: "magnesium", label: "Magnesium", target: 310, unit: "mg" },
    { key: "omega3", label: "Omega-3", target: 1.6, unit: "g" },
  ],
  follicular: [
    { key: "vitaminB6", label: "Vitamin B", target: 1.5, unit: "mg" },
    { key: "fibre", label: "Fibre", target: 28, unit: "g" },
    { key: "vitaminC", label: "Antioxidants (Vit C)", target: 75, unit: "mg" },
  ],
  ovulatory: [
    { key: "vitaminB6", label: "Vitamin B", target: 1.5, unit: "mg" },
    { key: "fibre", label: "Fibre", target: 28, unit: "g" },
    { key: "vitaminC", label: "Antioxidants (Vit C)", target: 75, unit: "mg" },
  ],
};

/* ---------- Daily target calculator ---------- */

export interface DailyTargets {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export function calculateDailyTargets(opts: {
  goal: DietGoal;
  phase: DietPhase;
  weight: number; // kg
  caloriesBurned: number;
}): DailyTargets {
  const { goal, phase, weight, caloriesBurned } = opts;

  const baseMultiplier = goal === "lose" ? 28 : goal === "gain" ? 35 : 31;
  const baseCals = weight * baseMultiplier;

  const phaseMultiplier: Record<DietPhase, number> = {
    menstrual: 1.0,
    follicular: 0.95,
    ovulatory: 0.93,
    luteal: 1.05,
  };

  const dailyTarget = baseCals * phaseMultiplier[phase] + caloriesBurned * 0.5;

  const proteinPerKg = goal === "lose" ? 1.8 : goal === "gain" ? 2.0 : 1.6;
  const fatRatio = goal === "lose" ? 0.28 : goal === "gain" ? 0.25 : 0.3;

  const protein = weight * proteinPerKg;
  const fat = (dailyTarget * fatRatio) / 9;
  const remaining = dailyTarget - protein * 4 - fat * 9;
  const carbs = Math.max(0, remaining / 4);

  return {
    calories: Math.round(dailyTarget),
    protein: Math.round(protein),
    carbs: Math.round(carbs),
    fat: Math.round(fat),
  };
}

/* ---------- My Rules silent filter ---------- */

export function passesMyRules(r: Recipe, profile: DietProfile): boolean {
  if (r.allergens.some((a) => profile.allergies.includes(a))) return false;
  if (profile.dietType !== "omnivore" && !r.dietTags.includes(profile.dietType)) return false;
  if (profile.regime && !regimeMatches(r, profile.regime)) return false;
  return true;
}

/* ---------- Real eating plans (regimes) — each filters recipes for real ---------- */

export interface DietRegimeInfo {
  key: DietRegime;
  label: string;
  blurb: string;
  match: (r: Recipe) => boolean;
}

export const DIET_REGIMES: DietRegimeInfo[] = [
  { key: "balanced",      label: "Balanced",        blurb: "A varied, sensible mix — every recipe, no restrictions.",         match: () => true },
  { key: "mediterranean", label: "Mediterranean",   blurb: "Plants, fish & good fats — the most-studied heart-healthy diet.", match: (r) => r.dietTags.some((t) => t === "vegetarian" || t === "vegan" || t === "pescatarian") },
  { key: "high-protein",  label: "High-Protein",    blurb: "Protein-forward for muscle, tone & staying full.",               match: (r) => r.macros.protein >= 25 },
  { key: "low-carb",      label: "Low-Carb / Keto", blurb: "Minimises carbs, leans on protein & healthy fats.",              match: (r) => r.macros.carbs <= 25 },
  { key: "vegetarian",    label: "Vegetarian",      blurb: "No meat or fish.",                                              match: (r) => r.dietTags.some((t) => t === "vegetarian" || t === "vegan") },
  { key: "vegan",         label: "Vegan",           blurb: "100% plant-based.",                                             match: (r) => r.dietTags.includes("vegan") },
  { key: "pescatarian",   label: "Pescatarian",     blurb: "Plants plus fish & seafood, no meat.",                          match: (r) => r.dietTags.some((t) => t === "pescatarian" || t === "vegetarian" || t === "vegan") },
  { key: "gluten-free",   label: "Gluten-Free",     blurb: "No gluten — coeliac & sensitivity friendly.",                   match: (r) => r.dietTags.includes("gluten-free") },
  { key: "halal",         label: "Halal",           blurb: "Halal-friendly recipes only.",                                  match: (r) => r.dietTags.includes("halal") },
];

export function dietRegimeInfo(regime: DietRegime): DietRegimeInfo {
  return DIET_REGIMES.find((x) => x.key === regime) ?? DIET_REGIMES[0];
}
export function regimeMatches(r: Recipe, regime: DietRegime | undefined): boolean {
  if (!regime || regime === "balanced") return true;
  return dietRegimeInfo(regime).match(r);
}
export function regimeToDietType(regime: DietRegime): DietType {
  if (regime === "vegan") return "vegan";
  if (regime === "vegetarian") return "vegetarian";
  if (regime === "gluten-free") return "gluten-free";
  if (regime === "halal") return "halal";
  return "omnivore";
}

/* ---------- Tappable sub-recipes ----------
 * Components (sauces, dips, quick sides) that appear inside step text as
 * [[name]]. The user taps the word to reveal a one-line "how to make it",
 * so steps stay short but nothing is a mystery pre-made ingredient. */
export const SUBRECIPES: Record<string, string> = {
  "miso glaze": "Whisk 1 tbsp white miso, 1 tbsp soy sauce, 1 tsp maple syrup and 1 tsp sesame oil into a smooth glaze.",
  "tahini dressing": "Loosen 1 tbsp tahini with lemon juice, a little water, salt and a grated garlic clove until pourable.",
  "mint yoghurt": "Stir chopped mint and a pinch of salt through Greek yoghurt with a squeeze of lemon.",
  "mango salsa": "Toss diced ripe mango with finely chopped red onion, cilantro, a squeeze of lime and a pinch of salt.",
  "teriyaki sauce": "Simmer 3 tbsp soy sauce, 1 tbsp mirin, 1 tbsp honey and a little grated ginger until glossy.",
  "chimichurri": "Blitz (or finely chop) parsley, garlic, red wine vinegar, olive oil, dried oregano and a pinch of chili into a loose, spoonable sauce.",
  "enchilada sauce": "Simmer tomato passata with chili powder, cumin, garlic and a pinch of smoked paprika until lightly thickened.",
  "sesame ginger dressing": "Whisk 1 tbsp soy sauce with 1 tsp toasted sesame oil, 1 tsp grated ginger, 1 tsp rice vinegar and a little honey.",
  "peanut dressing": "Whisk 2 tbsp peanut butter with 1 tbsp soy sauce, 1 tsp lime juice, a little grated ginger and warm water to loosen.",
  "spicy soy dressing": "Mix 1 tbsp soy sauce with 1 tsp sriracha, 1 tsp sesame oil and a squeeze of lime.",
  "sesame dressing": "Whisk 1 tbsp tahini with 1 tbsp soy sauce, 1 tsp rice vinegar, 1 tsp maple syrup and water to a drizzle.",
  "soy-lime dressing": "Whisk 1 tbsp soy sauce with the juice of 1/2 lime, 1 tsp sesame oil, 1 tsp honey and a pinch of grated ginger.",
  "caesar dressing": "Blend 2 tbsp mayo (or Greek yoghurt) with 1 tsp Dijon, 1 minced garlic clove, 1 tsp lemon juice, a little grated parmesan and an anchovy or dash of Worcestershire.",
  "vegan caesar dressing": "Whisk tahini with lemon juice, crushed garlic and nutritional yeast, loosening with a splash of water until pourable; season.",
  "lemon dressing": "Whisk 2 tbsp olive oil with 1 tbsp lemon juice, a little crushed garlic, salt and pepper.",
  "balsamic dressing": "Whisk 1 tbsp balsamic vinegar with 2 tbsp olive oil and a pinch of salt until glossy.",
  "lemon herb dressing": "Whisk olive oil and lemon juice with dried oregano, a little garlic and salt.",
  "balsamic glaze": "Simmer 1/2 cup balsamic vinegar with 1 tsp honey (or maple) over low heat until reduced by half and syrupy, about 5 min; cool to thicken.",
  "honey balsamic dressing": "Whisk 1 tbsp balsamic vinegar, 1 tsp honey, 2 tbsp olive oil and a pinch of salt until emulsified.",
  "chipotle lime dressing": "Whisk 2 tbsp yoghurt or mayo with 1 tsp chipotle paste, the juice of 1/2 lime and a pinch of salt.",
  "lime soy dressing": "Whisk 2 tbsp lime juice, 1 tbsp soy sauce (or tamari), 1 tsp coconut sugar and 1 tbsp water until the sugar dissolves.",
  "soy-ginger sauce": "Whisk 2 tbsp soy sauce (or tamari) with 1 tsp grated ginger, 1 tsp honey, 1 tsp rice vinegar and a few drops of sesame oil.",
  "tahini sauce": "Whisk 3 tbsp tahini with the juice of ½ lemon, 1 grated garlic clove and a pinch of salt; loosen with cold water, 1 tbsp at a time, until smooth and pourable.",
  "quick pickles": "Toss thinly sliced cucumber and red onion with 2 tbsp vinegar, a pinch of salt and 1 tsp sugar; leave 15 min.",
  "tzatziki": "Stir grated, squeezed cucumber into thick Greek yoghurt with 1 grated garlic clove, a squeeze of lemon, olive oil, salt and chopped dill.",
  "pesto": "Blitz a big handful of basil with toasted pine nuts, grated parmesan, 1 garlic clove and olive oil to a loose paste; season.",
  "hummus": "Blend a can of chickpeas with 2 tbsp tahini, lemon juice, 1 garlic clove, olive oil and a splash of water until smooth; season.",
  "guacamole": "Mash ripe avocado with lime juice, finely chopped onion, a little chilli, coriander and salt.",
  "salsa": "Finely chop tomato, red onion, coriander and chilli; dress with lime juice and salt.",
  "yoghurt marinade": "Mix thick yoghurt with grated garlic, lemon, olive oil and spices (paprika, cumin, oregano); coat the protein and rest 20 min+.",
  "vinaigrette": "Shake 3 tbsp olive oil with 1 tbsp vinegar or lemon, ½ tsp mustard, salt and pepper until emulsified.",
};

/* ---------- Recipe shape ---------- */

export interface RecipeIngredient {
  name: string;
  quantity: string;
  /** alias of name, lowercase — used for pantry/shopping-list matching */
  item: string;
  /** alias of quantity */
  qty: string;
  category: PantryCategoryKey;
}

export interface Recipe {
  id: string;
  name: string;
  cuisine?: string;
  image?: string;
  photo?: string;
  mealType: MealType;
  prepTime: number;
  cookTime: number;
  /** aliases of prepTime/cookTime, used by Meals Planner */
  prepMin: number;
  cookMin: number;
  difficulty: Difficulty;
  phases: DietPhase[];
  cyclePhase: CyclePhase[];
  goal: DietGoal[];
  intention: Intention[];
  dietTags: string[];
  allergens: Allergy[];
  cost: "$" | "$$" | "$$$";
  vibe: Vibe;
  /** How many servings the ingredient list makes. Macros are PER serving. */
  servings: number;
  macros: { calories: number; protein: number; carbs: number; fat: number };
  micros: Partial<Record<"iron" | "magnesium" | "omega3" | "vitaminC" | "fibre" | "vitaminB6" | "calcium" | "vitaminD", number>>;
  ingredients: RecipeIngredient[];
  /** Kitchen tools needed — shown so the cook can set up before starting. */
  equipment: string[];
  steps: string[];
  conservation: { fridgeDays: number; freezerWeeks: number; sameDay?: boolean; container?: string };
  batchTip?: string;
  substitutionTip?: string;
  packable?: boolean;
  noReheat?: boolean;
}

/** Authoring shape — only the fields a recipe author needs to set.
 *  Meals-Planner-only fields (cyclePhase, intention, cost, vibe, conservation...)
 *  are derived automatically by `finalizeRecipe` when not provided. */
interface RawRecipe {
  id: string;
  name: string;
  cuisine?: string;
  image?: string;
  photo?: string;
  mealType: MealType;
  prepTime: number;
  cookTime: number;
  difficulty: Difficulty;
  phases: DietPhase[];
  goal: DietGoal[];
  dietTags: string[];
  allergens: Allergy[];
  macros: { calories: number; protein: number; carbs: number; fat: number };
  micros: Recipe["micros"];
  ingredients: { name: string; quantity: string }[];
  steps: string[];
  servings?: number;
  equipment?: string[];
  cyclePhase?: CyclePhase[];
  intention?: Intention[];
  cost?: "$" | "$$" | "$$$";
  vibe?: Vibe;
  conservation?: Recipe["conservation"];
  batchTip?: string;
  substitutionTip?: string;
  packable?: boolean;
  noReheat?: boolean;
}

/* ---------- Derivation helpers ---------- */

const DIET_TO_CYCLE_PHASE: Record<DietPhase, CyclePhase> = {
  menstrual: "period",
  follicular: "follicular",
  ovulatory: "ovulation",
  luteal: "luteal",
};

function phasesToCyclePhase(phases: DietPhase[]): CyclePhase[] {
  if (phases.length >= 4) return ["any"];
  return Array.from(new Set(phases.map((p) => DIET_TO_CYCLE_PHASE[p])));
}

function inferIntentions(r: RawRecipe): Intention[] {
  const out = new Set<Intention>();
  if (r.prepTime + r.cookTime <= 15) out.add("quick");
  if (r.macros.protein >= 22) out.add("protein");
  if (r.dietTags.includes("vegan") || r.dietTags.includes("vegetarian")) out.add("plant");
  if (r.macros.calories <= 320) out.add("light");
  if (r.macros.calories >= 480) out.add("comfort");
  out.add("cycle");
  if (out.size === 1) out.add("energy");
  return Array.from(out);
}

function inferCost(r: RawRecipe): "$" | "$$" | "$$$" {
  const pricey = ["salmon", "shrimp", "tuna", "steak", "beef", "goat cheese", "halloumi"];
  const name = r.name.toLowerCase();
  if (pricey.some((p) => name.includes(p))) return "$$$";
  if (r.dietTags.includes("vegan") || r.dietTags.includes("vegetarian")) return "$";
  return "$$";
}

function inferVibe(r: RawRecipe): Vibe {
  if (r.macros.protein >= 28) return "Protein-rich";
  if (r.macros.calories <= 320) return "Light";
  if (r.macros.calories >= 480) return "Energizing";
  return "Balanced";
}

const PANTRY_LOOKUP: [string, PantryCategoryKey][] = PANTRY.flatMap((cat) =>
  cat.items.map((item) => [item, cat.key] as [string, PantryCategoryKey]),
);

function inferCategory(name: string): PantryCategoryKey {
  const n = name.toLowerCase();
  for (const [item, cat] of PANTRY_LOOKUP) {
    if (n.includes(item)) return cat;
  }
  return "condiments";
}

function finalizeRecipe(r: RawRecipe): Recipe {
  return {
    ...r,
    prepMin: r.prepTime,
    cookMin: r.cookTime,
    cyclePhase: r.cyclePhase ?? phasesToCyclePhase(r.phases),
    intention: r.intention ?? inferIntentions(r),
    cost: r.cost ?? inferCost(r),
    vibe: r.vibe ?? inferVibe(r),
    servings: r.servings ?? 1,
    equipment: r.equipment ?? [],
    conservation: r.conservation ?? { fridgeDays: 3, freezerWeeks: 0 },
    ingredients: r.ingredients.map((i) => ({
      name: i.name,
      quantity: i.quantity,
      item: i.name.toLowerCase(),
      qty: i.quantity,
      category: inferCategory(i.name),
    })),
  };
}

/* ---------- Recipes ---------- */

const RAW_RECIPES: RawRecipe[] = [
  // ───────── Breakfast (10) ─────────
  {
    id: "b01", name: "Greek Yogurt Power Bowl", cuisine: "Mediterranean", mealType: "breakfast",
    prepTime: 5, cookTime: 0, difficulty: "quick",
    servings: 1,
    equipment: [],
    phases: ["follicular", "ovulatory"], goal: ["lose", "maintain"],
    dietTags: ["vegetarian", "gluten-free"], allergens: ["dairy", "nuts"],
    macros: { calories: 590, protein: 33, carbs: 61, fat: 28 },
    micros: { vitaminB6: 0.4, fibre: 8, vitaminC: 30 },
    ingredients: [
      { name: "Greek yoghurt", quantity: "200g" },
      { name: "Almond butter", quantity: "1 tbsp" },
      { name: "Mixed berries", quantity: "1/2 cup" },
      { name: "Pomegranate seeds", quantity: "2 tbsp" },
      { name: "Kiwi", quantity: "1/2, sliced" },
      { name: "Granola", quantity: "1/4 cup" },
      { name: "Flaked almonds", quantity: "1 tbsp" },
      { name: "Pumpkin seeds", quantity: "1 tbsp" },
      { name: "Chia seeds", quantity: "1 tsp" },
      { name: "Honey", quantity: "1 tsp" }
    ],
    steps: [
      "Spoon **Greek yoghurt** into a bowl and smooth into a swirl, then add a dollop of **almond butter**.",
      "Arrange **mixed berries**, **pomegranate seeds** and sliced **kiwi** over the top.",
      "Scatter over **granola**, **flaked almonds**, **pumpkin seeds** and **chia seeds** for crunch.",
      "Finish with a thread of **honey** and eat straight away so the granola stays crisp."
    ],
    batchTip: "Layer yoghurt and berries in a jar the night before; add granola only when you eat so it stays crunchy.",
    substitutionTip: "Dairy-free? Use thick coconut yoghurt and maple syrup instead of honey."
  },
  {
    id: "b02", name: "Avocado Egg Toast", cuisine: "Mediterranean", mealType: "breakfast",
    prepTime: 10, cookTime: 5, difficulty: "quick",
    servings: 1,
    equipment: ["Small pot", "Non-stick pan"],
    phases: ["follicular", "ovulatory", "menstrual"], goal: ["maintain", "gain"],
    dietTags: ["vegetarian"], allergens: ["eggs"],
    macros: { calories: 360, protein: 16, carbs: 28, fat: 20 },
    micros: { fibre: 7, vitaminC: 12 },
    ingredients: [
      { name: "Sourdough bread", quantity: "2 slices" },
      { name: "Avocado", quantity: "1" },
      { name: "Eggs", quantity: "2" },
      { name: "Lemon", quantity: "1/2" },
      { name: "Chili flakes", quantity: "pinch" },
      { name: "Salt & pepper", quantity: "to taste" }
    ],
    steps: [
      "Bring a small pot of water to a gentle simmer to poach, or heat a **non-stick pan** to fry.",
      "Toast the **sourdough** until deep golden.",
      "Mash the **avocado** with a squeeze of **lemon**, salt and pepper, then spread thickly onto the toast.",
      "Poach or fry the **eggs** to your liking, slide onto the avocado and finish with **chili flakes** and flaky salt."
    ],
    batchTip: "Minimal prep - but you can mash the avocado with lemon up to an hour ahead; the acid keeps it green.",
    substitutionTip: "No sourdough? Any hearty wholegrain bread works, or grilled sweet potato slices for gluten-free."
  },
  {
    id: "b03", name: "Salmon & Quinoa Breakfast Bowl", cuisine: "Nordic", mealType: "breakfast",
    prepTime: 10, cookTime: 15, difficulty: "easy",
    servings: 1,
    equipment: ["Small pot"],
    phases: ["luteal", "menstrual"], goal: ["gain", "maintain"],
    dietTags: ["pescatarian", "gluten-free"], allergens: [],
    macros: { calories: 410, protein: 30, carbs: 34, fat: 16 },
    micros: { omega3: 1.8, iron: 2, magnesium: 60 },
    ingredients: [
      { name: "Quinoa", quantity: "1/3 cup, dry" },
      { name: "Smoked salmon", quantity: "100g" },
      { name: "Egg", quantity: "1" },
      { name: "Baby spinach", quantity: "1 handful" },
      { name: "Lemon", quantity: "1/2" },
      { name: "Fresh dill", quantity: "few sprigs" },
      { name: "Olive oil", quantity: "1 tsp" }
    ],
    steps: [
      "Rinse **quinoa** and simmer in 2/3 cup water for 12-15 min until the grains uncurl; fluff and let the steam escape.",
      "Meanwhile, lower the **egg** into boiling water for 6.5 min, then cool under cold water and peel.",
      "Wilt **baby spinach** through the warm quinoa and pile into a bowl.",
      "Drape over the **smoked salmon**, halve the soft egg on top, and finish with **dill**, a squeeze of **lemon** and a drizzle of **olive oil**."
    ],
    batchTip: "Cook a big batch of quinoa - it keeps 4 days chilled and the bowl assembles in minutes.",
    substitutionTip: "Swap smoked salmon for hot-smoked trout or flaked cooked salmon."
  },
  {
    id: "b04", name: "Spiced Chickpea Shakshuka", cuisine: "Middle Eastern", mealType: "breakfast",
    prepTime: 10, cookTime: 20, difficulty: "easy",
    servings: 2,
    equipment: ["Frying pan with lid"],
    phases: ["menstrual", "follicular"], goal: ["maintain", "gain", "lose"],
    dietTags: ["vegetarian", "gluten-free"], allergens: ["eggs"],
    macros: { calories: 380, protein: 26, carbs: 36, fat: 14 },
    micros: { iron: 4, fibre: 9, vitaminC: 22 },
    ingredients: [
      { name: "Chickpeas", quantity: "1 cup, drained" },
      { name: "Crushed tomatoes", quantity: "1 cup" },
      { name: "Eggs", quantity: "2" },
      { name: "Onion", quantity: "1/2" },
      { name: "Garlic", quantity: "2 cloves" },
      { name: "Cumin & paprika", quantity: "1 tsp each" },
      { name: "Olive oil", quantity: "1 tbsp" },
      { name: "Fresh coriander", quantity: "to finish" }
    ],
    steps: [
      "Soften diced **onion** and **garlic** in **olive oil** in a frying pan for 3-4 min.",
      "Stir in **cumin**, **paprika** and a pinch of salt until fragrant, then add **crushed tomatoes** and **chickpeas**; simmer 8-10 min until thick.",
      "Make two wells and crack in the **eggs**; cover and cook 5-6 min until the whites set but the yolks stay soft.",
      "Scatter with **coriander** and serve straight from the pan with bread."
    ],
    batchTip: "Make the tomato-chickpea base ahead and chill 3 days; reheat and add fresh eggs to serve.",
    substitutionTip: "No eggs? Fold in cubed feta or firm tofu and warm through instead."
  },
  {
    id: "b05", name: "Tropical Green Smoothie", cuisine: "Latin", mealType: "breakfast",
    prepTime: 8, cookTime: 0, difficulty: "quick",
    servings: 1,
    equipment: ["Blender"],
    phases: ["ovulatory", "follicular"], goal: ["lose", "maintain"],
    dietTags: ["vegan", "gluten-free"], allergens: [],
    macros: { calories: 240, protein: 8, carbs: 46, fat: 5 },
    micros: { vitaminC: 48, fibre: 6, vitaminB6: 0.3 },
    ingredients: [
      { name: "Mango", quantity: "1 cup" },
      { name: "Spinach", quantity: "1 cup" },
      { name: "Banana", quantity: "1/2" },
      { name: "Coconut water", quantity: "1 cup" },
      { name: "Lime", quantity: "1/2" },
      { name: "Chia seeds", quantity: "1 tsp (optional)" }
    ],
    steps: [
      "Add **coconut water** to the blender first, then the **spinach**, so the leaves blend perfectly smooth.",
      "Add **mango**, **banana**, a squeeze of **lime** and the **chia seeds**.",
      "Blend on high for 45-60 sec until silky; loosen with a splash more coconut water if needed and drink straight away."
    ],
    batchTip: "Freeze mango and banana chunks in bags - blitz from frozen for an instant thick smoothie.",
    substitutionTip: "Swap coconut water for any plant milk to make it creamier and more filling."
  },
  {
    id: "b06", name: "Banana Oat Pancakes with Walnuts", cuisine: "Nordic", mealType: "breakfast",
    prepTime: 10, cookTime: 10, difficulty: "easy",
    servings: 2,
    equipment: ["Blender", "Non-stick pan"],
    phases: ["luteal", "menstrual"], goal: ["maintain", "gain"],
    dietTags: ["vegetarian"], allergens: ["nuts"],
    macros: { calories: 420, protein: 14, carbs: 58, fat: 15 },
    micros: { magnesium: 70, fibre: 6 },
    ingredients: [
      { name: "Oats", quantity: "1 cup" },
      { name: "Banana", quantity: "1" },
      { name: "Eggs", quantity: "2" },
      { name: "Baking powder", quantity: "1/2 tsp" },
      { name: "Cinnamon", quantity: "1/4 tsp" },
      { name: "Walnuts", quantity: "2 tbsp" },
      { name: "Oil", quantity: "for the pan" },
      { name: "Maple syrup", quantity: "to serve" }
    ],
    steps: [
      "Blend **oats**, **banana**, **eggs**, **baking powder** and **cinnamon** to a smooth batter; rest 5 min to thicken.",
      "Heat a little **oil** in a **non-stick pan** over medium; pour small rounds and cook 2 min until bubbles form on top.",
      "Flip and cook 1 min more until springy.",
      "Stack, scatter with toasted **walnuts** and drizzle with **maple syrup**."
    ],
    batchTip: "Cook the full batch and freeze between sheets of baking paper; reheat straight from the toaster.",
    substitutionTip: "No walnuts? Use pecans or seeds; for egg-free, blend 2 tbsp ground flax with 6 tbsp water first."
  },
  {
    id: "b07", name: "Moroccan Spiced Egg Wrap", cuisine: "African", mealType: "breakfast",
    prepTime: 10, cookTime: 8, difficulty: "quick",
    servings: 1,
    equipment: ["Non-stick pan"],
    phases: ["menstrual", "follicular"], goal: ["lose", "maintain"],
    dietTags: ["halal"], allergens: ["eggs"],
    macros: { calories: 330, protein: 20, carbs: 30, fat: 13 },
    micros: { iron: 3, vitaminC: 14 },
    ingredients: [
      { name: "Whole-wheat wrap", quantity: "1" },
      { name: "Eggs", quantity: "2" },
      { name: "Ras el hanout", quantity: "1 tsp" },
      { name: "Tomato", quantity: "1/2" },
      { name: "Onion", quantity: "1/4" },
      { name: "Olive oil", quantity: "1 tsp" },
      { name: "Lemon", quantity: "1/2" },
      { name: "Fresh coriander", quantity: "handful" }
    ],
    steps: [
      "Soften diced **onion** and **tomato** in **olive oil** for 3 min until juicy.",
      "Whisk the **eggs** with **ras el hanout** and salt, pour in and softly scramble for 2 min until just set.",
      "Warm the **wrap** in a dry pan for 20 sec a side until pliable.",
      "Pile in the eggs and **coriander**, add a squeeze of **lemon**, then roll tightly and halve."
    ],
    batchTip: "Scramble double and keep chilled 2 days; warm and wrap fresh for a fast breakfast.",
    substitutionTip: "No ras el hanout? Mix cumin, cinnamon, paprika and a little ground ginger."
  },
  {
    id: "b08", name: "Asian Tofu Scramble", cuisine: "Asian", mealType: "breakfast",
    prepTime: 8, cookTime: 8, difficulty: "quick",
    servings: 1,
    equipment: ["Non-stick pan"],
    phases: ["follicular", "ovulatory"], goal: ["lose", "gain"],
    dietTags: ["vegan", "gluten-free"], allergens: ["soy"],
    macros: { calories: 300, protein: 22, carbs: 18, fat: 16 },
    micros: { iron: 3, magnesium: 50 },
    ingredients: [
      { name: "Firm tofu", quantity: "200g" },
      { name: "Turmeric", quantity: "1/2 tsp" },
      { name: "Garlic", quantity: "1 clove" },
      { name: "Spring onion", quantity: "2" },
      { name: "Soy sauce", quantity: "1 tbsp" },
      { name: "Sesame oil", quantity: "1 tsp" },
      { name: "Chili flakes", quantity: "pinch" }
    ],
    steps: [
      "Press **firm tofu** in a clean towel for a few minutes, then crumble into rough curds.",
      "Heat **sesame oil**, fry **garlic** for 30 sec, then add the tofu and **turmeric**; stir-fry 4-5 min until golden and dry.",
      "Splash in **soy sauce** and toss for a minute to glaze.",
      "Off the heat, fold through **spring onion** and a pinch of **chili flakes**."
    ],
    batchTip: "Keeps 3 days chilled and is great cold in a lunch wrap too.",
    substitutionTip: "Soy-free? Use a chickpea-flour scramble or season with coconut aminos."
  },
  {
    id: "b09", name: "Berry Chia Pudding", cuisine: "Mediterranean", mealType: "breakfast",
    prepTime: 5, cookTime: 0, difficulty: "quick",
    servings: 1,
    equipment: ["Jar or bowl"],
    phases: ["luteal", "ovulatory"], goal: ["lose", "maintain"],
    dietTags: ["vegan", "gluten-free"], allergens: [],
    macros: { calories: 280, protein: 9, carbs: 34, fat: 12 },
    micros: { omega3: 2.2, fibre: 11, calcium: 180 },
    ingredients: [
      { name: "Chia seeds", quantity: "3 tbsp" },
      { name: "Almond milk", quantity: "1 cup" },
      { name: "Maple syrup", quantity: "1 tsp" },
      { name: "Vanilla", quantity: "1/4 tsp" },
      { name: "Mixed berries", quantity: "1/2 cup" }
    ],
    steps: [
      "Whisk **chia seeds**, **almond milk**, **maple syrup** and **vanilla** in a jar.",
      "Wait 5 min, then whisk again to break up any clumps so it sets evenly.",
      "Chill overnight until thick and spoonable.",
      "Top with **mixed berries** just before serving."
    ],
    batchTip: "Make 3-4 jars at once; the plain base keeps 4 days chilled.",
    substitutionTip: "Any milk works; use honey instead of maple if you are not strictly vegan."
  },
  {
    id: "b10", name: "Smoked Salmon Bagel", cuisine: "Nordic", mealType: "breakfast",
    prepTime: 8, cookTime: 0, difficulty: "quick",
    servings: 1,
    equipment: ["Toaster"],
    phases: ["menstrual", "luteal"], goal: ["gain", "maintain"],
    dietTags: ["pescatarian"], allergens: ["dairy"],
    macros: { calories: 390, protein: 26, carbs: 38, fat: 14 },
    micros: { omega3: 1.5, calcium: 90 },
    ingredients: [
      { name: "Bagel", quantity: "1" },
      { name: "Cream cheese", quantity: "30g" },
      { name: "Smoked salmon", quantity: "80g" },
      { name: "Capers", quantity: "1 tsp" },
      { name: "Red onion", quantity: "few rings" },
      { name: "Fresh dill", quantity: "few sprigs" },
      { name: "Lemon", quantity: "1 wedge" }
    ],
    steps: [
      "Slice and toast the **bagel** until golden.",
      "Spread **cream cheese** thickly over both cut halves.",
      "Drape over the **smoked salmon**, then scatter with **capers**, **red onion** and **dill**.",
      "Finish with a squeeze of **lemon** and cracked black pepper; sandwich or serve open."
    ],
    batchTip: "Assembly only - keep the toppings ready and build fresh so the bagel stays crisp.",
    substitutionTip: "Swap cream cheese for whipped ricotta, or use hot-smoked trout for the salmon."
  },

  // ───────── Lunch (12) ─────────
  { id: "l01", name: "Mediterranean Chickpea Salad", cuisine: "Mediterranean", mealType: "lunch", prepTime: 15, cookTime: 0, difficulty: "quick", servings: 2, equipment: ["Mixing bowl"], phases: ["ovulatory", "follicular"], goal: ["lose", "maintain"], dietTags: ["vegan", "gluten-free"], allergens: [], photo: "lunch-mediterranean-chickpea-salad.jpg", macros: { calories: 340, protein: 14, carbs: 42, fat: 14 }, micros: { fibre: 12, vitaminC: 30, vitaminB6: 0.4 }, ingredients: [ { name: "Chickpeas", quantity: "1 can (400g), drained" }, { name: "Cucumber", quantity: "1/2, diced" }, { name: "Cherry tomatoes", quantity: "1 cup, halved" }, { name: "Red onion", quantity: "1/4, thinly sliced" }, { name: "Feta", quantity: "60 g" }, { name: "Olive oil", quantity: "2 tbsp" }, { name: "Lemon", quantity: "1/2, juiced" }, { name: "Parsley", quantity: "small handful" } ], steps: [ "Rinse and drain the **chickpeas**, then tip into a bowl with the diced **cucumber**, halved **cherry tomatoes** and thinly sliced **red onion**.", "Make a quick [[vinaigrette]] by whisking **olive oil**, **lemon** juice, salt and pepper, then toss it through the salad.", "Crumble over the **feta**, scatter with torn **parsley**, and serve now or chill 10 min to let the flavours mingle." ], batchTip: "Keeps 2 days in the fridge - add the feta and dressing only when serving so it stays crisp.", substitutionTip: "Dairy-free? Skip the feta and add a handful of olives for the same salty hit." },
  { id: "l02", name: "Asian Salmon Quinoa Bowl", cuisine: "Asian", mealType: "lunch", prepTime: 20, cookTime: 15, difficulty: "easy", servings: 1, equipment: ["Non-stick pan", "Small pot"], phases: ["luteal", "menstrual"], goal: ["gain"], dietTags: ["pescatarian", "gluten-free"], allergens: [], photo: "lunch-asian-salmon-quinoa-bowl.jpg", macros: { calories: 480, protein: 32, carbs: 44, fat: 18 }, micros: { omega3: 2.0, iron: 3, magnesium: 65 }, ingredients: [ { name: "Salmon fillet", quantity: "150 g" }, { name: "Quinoa", quantity: "1/2 cup dry" }, { name: "Edamame", quantity: "1/2 cup, shelled" }, { name: "Sesame oil", quantity: "1 tsp" }, { name: "Sesame ginger dressing", quantity: "2 tbsp - tap in steps to make it" }, { name: "Spring onion & sesame seeds", quantity: "to garnish" } ], steps: [ "Rinse the **quinoa** and simmer in 1 cup water for 12-15 min until the grains uncurl, then fluff with a fork.", "Pat the **salmon** dry and season, then sear skin-side down in **sesame oil** over medium-high for 3-4 min; flip and cook 2 min more until just opaque.", "Boil the **edamame** 3 min. Bowl up the quinoa, salmon and edamame, spoon over [[sesame ginger dressing]] and finish with **spring onion** and **sesame seeds**." ], batchTip: "Cook a double batch of quinoa and keep it in the fridge for up to 4 days of fast bowls.", substitutionTip: "No salmon? A seared tuna steak or firm tofu works with the same dressing." },
  { id: "l03", name: "Moroccan Lentil Soup", cuisine: "African", mealType: "lunch", prepTime: 15, cookTime: 30, difficulty: "easy", servings: 4, equipment: ["Large pot", "Blender"], phases: ["menstrual", "luteal"], goal: ["maintain", "lose"], dietTags: ["vegan", "gluten-free", "halal"], allergens: [], photo: "lunch-african-moroccan-lentil-soup.jpg", macros: { calories: 320, protein: 17, carbs: 48, fat: 6 }, micros: { iron: 5, fibre: 14, vitaminB6: 0.5 }, ingredients: [ { name: "Red lentils", quantity: "1 cup, rinsed" }, { name: "Carrots", quantity: "2, diced" }, { name: "Celery", quantity: "2 stalks, diced" }, { name: "Onion", quantity: "1, chopped" }, { name: "Garlic", quantity: "2 cloves" }, { name: "Cumin", quantity: "1 tsp" }, { name: "Cinnamon", quantity: "1/2 tsp" }, { name: "Chopped tomatoes", quantity: "1/2 can" }, { name: "Vegetable broth", quantity: "4 cups" }, { name: "Olive oil", quantity: "1 tbsp" }, { name: "Lemon", quantity: "to serve" } ], steps: [ "Soften the **onion**, **carrots** and **celery** in **olive oil** over medium heat for 5-6 min, then stir in the **garlic**, **cumin** and **cinnamon** until fragrant.", "Add the rinsed **red lentils**, **chopped tomatoes** and **vegetable broth**; bring to a boil, then simmer 25 min until the lentils collapse.", "Blend half the pot for a silky body, season well, and finish each bowl with a squeeze of **lemon**." ], batchTip: "Freezes beautifully for up to 3 months - thin with a splash of water when reheating.", substitutionTip: "Only have brown lentils? Use them, but simmer 10-15 min longer until soft." },
  { id: "l04", name: "Thai Peanut Chicken Salad", cuisine: "Asian", mealType: "lunch", prepTime: 15, cookTime: 10, difficulty: "easy", servings: 2, equipment: ["Grill pan"], phases: ["ovulatory", "follicular"], goal: ["lose", "gain"], dietTags: ["gluten-free"], allergens: ["nuts"], photo: "lunch-asian-thai-peanut-chicken-salad.jpg", macros: { calories: 410, protein: 30, carbs: 28, fat: 18 }, micros: { vitaminC: 24, fibre: 7, vitaminB6: 0.6 }, ingredients: [ { name: "Chicken breast", quantity: "2 (~300 g)" }, { name: "White cabbage", quantity: "3 cups, shredded" }, { name: "Carrot", quantity: "1, julienned" }, { name: "Red pepper", quantity: "1, sliced" }, { name: "Coriander", quantity: "handful" }, { name: "Peanut dressing", quantity: "3 tbsp - tap in steps to make it" }, { name: "Roasted peanuts", quantity: "2 tbsp, crushed" }, { name: "Lime", quantity: "1" } ], steps: [ "Season the **chicken breast** and cook on a hot **grill pan** for 5-6 min per side until 74°C inside, then rest and slice.", "Toss the shredded **cabbage**, **carrot** and **red pepper** with [[peanut dressing]] and a squeeze of **lime**.", "Pile the chicken on top and scatter with **coriander** and crushed **roasted peanuts**." ], batchTip: "Keep the dressing separate and the salad stays crunchy in the fridge for 2 days.", substitutionTip: "Peanut allergy? Sunflower seed butter and pumpkin seeds give the same creamy crunch." },
  {
    id: "l05", name: "Falafel Wrap with Tahini", cuisine: "Middle Eastern", mealType: "lunch",
    prepTime: 15, cookTime: 10, difficulty: "easy",
    phases: ["follicular", "ovulatory"], goal: ["maintain"],
    dietTags: ["vegan"], allergens: [],
    servings: 2,
    macros: { calories: 430, protein: 16, carbs: 50, fat: 18 },
    micros: { fibre: 10, iron: 3, vitaminB6: 0.3 },
    equipment: ["Food processor", "Frying pan"],
    ingredients: [
      { name: "Dried chickpeas", quantity: "150 g, soaked overnight" },
      { name: "Onion", quantity: "1/2" },
      { name: "Garlic", quantity: "2 cloves" },
      { name: "Parsley & coriander", quantity: "3/4 cup, packed" },
      { name: "Cumin & ground coriander", quantity: "1 tsp each" },
      { name: "Baking soda", quantity: "1/4 tsp" },
      { name: "Flour", quantity: "1–2 tbsp" },
      { name: "Oil", quantity: "for frying" },
      { name: "Pita or flatbread", quantity: "2" },
      { name: "Tahini sauce", quantity: "3 tbsp — tap in steps to make it" },
      { name: "Cucumber, tomato & lettuce", quantity: "to fill" },
    ],
    steps: [
      "Soak **dried chickpeas** overnight, then drain — don't cook them (raw soaked chickpeas are what hold falafel together).",
      "Pulse the chickpeas with **onion**, **garlic**, **parsley & coriander**, **cumin** and **salt** to a coarse crumb — not a paste. Mix in **baking soda** and **flour**, then shape into ~10 balls.",
      "Fry in **oil** at 170°C for 3–4 min until deep golden (or bake at 220°C for ~20 min, turning once).",
      "Warm the **pita**, spread with [[tahini sauce]], add **lettuce** & **tomato**, tuck in the falafel and [[quick pickles]], then roll.",
    ],
    batchTip: "Cooked falafel freeze well — reheat from frozen in a hot oven for 10 min.",
    substitutionTip: "No time to soak? Use canned chickpeas, patted very dry (softer result — baking is more forgiving).",
  },
  { id: "l06", name: "Sweet Potato Black Bean Bowl", cuisine: "Latin", mealType: "lunch", prepTime: 15, cookTime: 25, difficulty: "easy", servings: 2, equipment: ["Baking tray", "Small pot"], phases: ["luteal", "menstrual"], goal: ["gain", "maintain"], dietTags: ["vegan", "gluten-free"], allergens: [], photo: "lunch-latin-sweet-potato-black-bean-bowl.jpg", macros: { calories: 420, protein: 14, carbs: 64, fat: 12 }, micros: { fibre: 15, magnesium: 70, iron: 3 }, ingredients: [ { name: "Sweet potato", quantity: "2 medium, cubed" }, { name: "Black beans", quantity: "1 can (400g), drained" }, { name: "Olive oil", quantity: "1 tbsp" }, { name: "Cumin & smoked paprika", quantity: "1 tsp each" }, { name: "Avocado", quantity: "1" }, { name: "Lime", quantity: "1" }, { name: "Coriander", quantity: "handful" } ], steps: [ "Toss cubed **sweet potato** with **olive oil**, **cumin** and **smoked paprika**, spread on a **baking tray** and roast at 220°C for 25 min, turning once.", "Warm the **black beans** in a small pot with a splash of water and a squeeze of **lime**.", "Divide between bowls and top with sliced **avocado**, a spoon of [[salsa]] and torn **coriander**." ], batchTip: "Roast a double tray of sweet potato - it reheats crisp and builds three lunches.", substitutionTip: "Swap black beans for kidney beans or lentils; both hold the smoky spice well." },
  { id: "l07", name: "Greek Chicken Souvlaki Plate", cuisine: "Mediterranean", mealType: "lunch", prepTime: 15, cookTime: 20, difficulty: "easy", servings: 2, equipment: ["Grill pan", "Small pot"], phases: ["follicular", "ovulatory"], goal: ["gain"], dietTags: ["gluten-free"], allergens: ["dairy"], photo: "lunch-mediterranean-greek-chicken-souvlaki-plate.jpg", macros: { calories: 460, protein: 35, carbs: 30, fat: 18 }, micros: { vitaminB6: 0.7, fibre: 5 }, ingredients: [ { name: "Chicken thighs", quantity: "4 boneless (~350 g)" }, { name: "Greek yoghurt", quantity: "3 tbsp" }, { name: "Garlic", quantity: "2 cloves" }, { name: "Lemon", quantity: "1" }, { name: "Dried oregano", quantity: "1 tsp" }, { name: "Rice", quantity: "1 cup, cooked" }, { name: "Tzatziki", quantity: "4 tbsp - tap in steps to make it" }, { name: "Tomato & cucumber salad", quantity: "to serve" } ], steps: [ "Coat the **chicken thighs** in a [[yoghurt marinade]] of **greek yoghurt**, **garlic**, **lemon** and **oregano**, and leave 15 min (or overnight).", "Thread onto skewers and cook on a hot **grill pan** for 5-6 min per side until charred and cooked through.", "Cook the **rice**, then plate the chicken with a crisp **tomato & cucumber salad** and a generous spoon of [[tzatziki]]." ], batchTip: "Marinate the chicken the night before - the yoghurt tenderises it and deepens the flavour.", substitutionTip: "No grill pan? Roast the skewers at 220°C for 18-20 min, turning halfway." },
  { id: "l08", name: "Nordic Salmon Rye Sandwich", cuisine: "Nordic", mealType: "lunch", prepTime: 10, cookTime: 0, difficulty: "quick", servings: 1, equipment: [], phases: ["menstrual", "luteal"], goal: ["maintain"], dietTags: ["pescatarian"], allergens: ["dairy"], photo: "lunch-nordic-salmon-rye-sandwich.jpg", macros: { calories: 360, protein: 28, carbs: 32, fat: 13 }, micros: { omega3: 1.6, calcium: 80 }, ingredients: [ { name: "Rye bread", quantity: "2 slices" }, { name: "Smoked salmon", quantity: "100 g" }, { name: "Cream cheese", quantity: "20 g" }, { name: "Cucumber", quantity: "1/4, sliced" }, { name: "Fresh dill", quantity: "few sprigs" }, { name: "Lemon", quantity: "1 wedge" }, { name: "Capers", quantity: "1 tsp (optional)" } ], steps: [ "Spread the **rye bread** with **cream cheese**.", "Layer over the **smoked salmon** and thin ribbons of **cucumber**.", "Scatter with **dill** and **capers**, add a squeeze of **lemon**, then top with the second slice (or serve open-faced)." ], batchTip: "Best assembled fresh, but the dill-caper topping can be prepped a day ahead.", substitutionTip: "Dairy-free? Swap cream cheese for a thick layer of mashed avocado." },
  { id: "l09", name: "Quinoa Tabbouleh with Grilled Halloumi", cuisine: "Middle Eastern", mealType: "lunch", prepTime: 15, cookTime: 10, difficulty: "easy", servings: 2, equipment: ["Grill pan", "Small pot"], phases: ["ovulatory", "follicular"], goal: ["maintain", "lose"], dietTags: ["vegetarian", "gluten-free"], allergens: ["dairy"], photo: "lunch-middle-eastern-quinoa-tabbouleh-grilled-halloumi.jpg", macros: { calories: 450, protein: 27, carbs: 38, fat: 20 }, micros: { fibre: 8, vitaminC: 26, vitaminB6: 0.4 }, ingredients: [ { name: "Quinoa", quantity: "1/2 cup dry" }, { name: "Parsley", quantity: "1 cup, finely chopped" }, { name: "Mint", quantity: "1/4 cup, chopped" }, { name: "Cherry tomatoes", quantity: "1 cup, diced" }, { name: "Spring onion", quantity: "2" }, { name: "Halloumi", quantity: "120 g, sliced" }, { name: "Lemon", quantity: "1" }, { name: "Olive oil", quantity: "2 tbsp" } ], steps: [ "Cook the **quinoa** in 1 cup water for 12-15 min, then spread out to cool.", "Toss with finely chopped **parsley**, **mint**, diced **cherry tomatoes** and **spring onion**, dressed with **lemon** juice and **olive oil**.", "Fry the **halloumi** in a dry **grill pan** for 1-2 min per side until golden and squeaky, then lay over the tabbouleh." ], batchTip: "The herby quinoa base keeps 2 days; grill the halloumi fresh so it stays soft inside.", substitutionTip: "Dairy-free or vegan? Swap halloumi for grilled firm tofu tossed in a little oil." },
  { id: "l10", name: "Spicy Tuna Poke Bowl", cuisine: "Asian", mealType: "lunch", prepTime: 20, cookTime: 0, difficulty: "easy", servings: 1, equipment: ["Small pot"], phases: ["luteal", "ovulatory"], goal: ["lose", "gain"], dietTags: ["pescatarian", "gluten-free"], allergens: ["soy"], photo: "lunch-asian-spicy-tuna-poke-bowl.jpg", macros: { calories: 470, protein: 34, carbs: 46, fat: 16 }, micros: { omega3: 1.4, iron: 2, vitaminC: 18 }, ingredients: [ { name: "Sushi-grade tuna", quantity: "150 g" }, { name: "Sushi rice", quantity: "1/2 cup dry" }, { name: "Rice vinegar", quantity: "1 tsp" }, { name: "Edamame", quantity: "1/2 cup, shelled" }, { name: "Cucumber", quantity: "1/2, diced" }, { name: "Avocado", quantity: "1/4" }, { name: "Spicy soy dressing", quantity: "2 tbsp - tap in steps to make it" }, { name: "Sesame seeds & nori", quantity: "to garnish" } ], steps: [ "Cook the **sushi rice**, then fold through **rice vinegar** and let it cool to room temperature.", "Cut the **tuna** into 2 cm cubes and gently coat in [[spicy soy dressing]].", "Bowl up the rice and top with the tuna, **edamame**, **cucumber** and **avocado**; finish with **sesame seeds** and shredded **nori**." ], batchTip: "Cube and dress the tuna only when ready to eat - it should be served the same day.", substitutionTip: "No sushi-grade fish? Use cooked prawns or diced smoked tofu for a safe swap." },
  { id: "l11", name: "African Peanut Stew with Greens", cuisine: "African", mealType: "lunch", prepTime: 15, cookTime: 25, difficulty: "easy", servings: 4, equipment: ["Large pot"], phases: ["menstrual", "luteal"], goal: ["maintain"], dietTags: ["vegan", "gluten-free"], allergens: ["nuts"], photo: "lunch-african-peanut-stew-greens.jpg", macros: { calories: 400, protein: 15, carbs: 42, fat: 20 }, micros: { iron: 4, magnesium: 75, fibre: 9 }, ingredients: [ { name: "Sweet potato", quantity: "2, cubed" }, { name: "Onion", quantity: "1, chopped" }, { name: "Garlic & ginger", quantity: "1 tbsp each, grated" }, { name: "Chopped tomatoes", quantity: "1 can" }, { name: "Peanut butter", quantity: "4 tbsp" }, { name: "Vegetable broth", quantity: "3 cups" }, { name: "Collard greens", quantity: "4 cups, shredded" }, { name: "Chilli flakes", quantity: "pinch" } ], steps: [ "Soften the **onion** with **garlic & ginger** in a **large pot**, then stir in the **chopped tomatoes** and **chilli flakes**.", "Add the **sweet potato**, **peanut butter** and **vegetable broth**; simmer 20 min until the potato is tender and the stew thickens.", "Fold through the **collard greens** and cook 3-4 min until just wilted. Season and serve over rice." ], batchTip: "Freezes well for 2 months - the peanut base only gets richer on reheating.", substitutionTip: "Nut-free? Sunflower seed butter mimics the creaminess; spinach can stand in for collards." },
  { id: "l12", name: "Turkey & Avocado Power Wrap", cuisine: "Latin", mealType: "lunch", prepTime: 10, cookTime: 5, difficulty: "quick", servings: 1, equipment: ["Non-stick pan"], phases: ["follicular", "ovulatory"], goal: ["gain", "lose"], dietTags: [], allergens: [], photo: "lunch-latin-turkey-avocado-power-wrap.jpg", macros: { calories: 420, protein: 33, carbs: 34, fat: 16 }, micros: { vitaminB6: 0.6, fibre: 8 }, ingredients: [ { name: "Turkey breast", quantity: "150 g" }, { name: "Whole-wheat tortilla", quantity: "1 large" }, { name: "Avocado", quantity: "1/2" }, { name: "Lime", quantity: "1/2" }, { name: "Baby lettuce", quantity: "handful" }, { name: "Salsa", quantity: "2 tbsp - tap in steps to make it" }, { name: "Cumin", quantity: "pinch" } ], steps: [ "Season the **turkey breast** with **cumin**, salt and pepper, then pan-fry 3-4 min per side until cooked through; slice.", "Mash the **avocado** with **lime** and spread it across the **tortilla**.", "Layer with **lettuce**, the turkey and a spoon of [[salsa]], fold in the sides and roll tightly, then halve on the diagonal." ], batchTip: "Cook the turkey ahead and keep sliced in the fridge for 3 days of fast wraps.", substitutionTip: "Swap turkey for shredded chicken or black beans for a vegetarian version." },

  // ───────── Dinner (12) ─────────
  {
    id: "d01", name: "Herb-Crusted Salmon with Greens", cuisine: "Nordic", mealType: "dinner",
    prepTime: 15, cookTime: 20, difficulty: "easy",
    phases: ["luteal", "menstrual"], goal: ["gain", "maintain"],
    dietTags: ["pescatarian", "gluten-free"], allergens: [],
    macros: { calories: 520, protein: 36, carbs: 22, fat: 28 },
    micros: { omega3: 2.4, vitaminD: 400, magnesium: 55 },
    servings: 1,
    equipment: ["Baking tray", "Small bowl"],
    ingredients: [
      { name: "Salmon fillet", quantity: "180g, skin on" },
      { name: "Gluten-free breadcrumbs", quantity: "1/4 cup" },
      { name: "Dill & parsley", quantity: "2 tbsp, chopped" },
      { name: "Dijon mustard", quantity: "1 tsp" },
      { name: "Olive oil", quantity: "1 tbsp" },
      { name: "Asparagus", quantity: "1 cup, trimmed" },
      { name: "Lemon", quantity: "1/2" }
    ],
    steps: [
      "Heat oven to 200°C. Pat the **salmon** dry and brush the top with **dijon mustard**.",
      "Mix **breadcrumbs**, **dill & parsley** and half the **olive oil** into a moist crumb, then press firmly onto the mustard.",
      "Toss **asparagus** with the rest of the oil on a **baking tray**, lay the salmon beside it, and bake 14-16 min until the crust is golden and the fish flakes.",
      "Finish with a squeeze of **lemon** over everything."
    ],
    batchTip: "Mix a double batch of the herb crumb and keep it in the fridge for up to 5 days.",
    substitutionTip: "No salmon? Trout or a thick cod loin work the same way (cod cooks a touch faster)."
  },
  {
    id: "d02", name: "Moroccan Chicken Tagine", cuisine: "African", mealType: "dinner",
    prepTime: 20, cookTime: 40, difficulty: "medium",
    phases: ["menstrual", "luteal"], goal: ["maintain"],
    dietTags: ["gluten-free", "halal"], allergens: [],
    macros: { calories: 480, protein: 31, carbs: 38, fat: 20 },
    micros: { iron: 4, magnesium: 60, vitaminC: 20 },
    servings: 2,
    equipment: ["Heavy pot or tagine", "Small pot"],
    ingredients: [
      { name: "Chicken thighs", quantity: "300g, bone-in" },
      { name: "Onion", quantity: "1, sliced" },
      { name: "Garlic", quantity: "2 cloves" },
      { name: "Ras el hanout", quantity: "1 tbsp" },
      { name: "Dried apricots", quantity: "1/3 cup" },
      { name: "Green olives", quantity: "1/4 cup" },
      { name: "Chicken broth", quantity: "1 cup" },
      { name: "Couscous", quantity: "1/2 cup dry" },
      { name: "Coriander", quantity: "to garnish" }
    ],
    steps: [
      "Brown the **chicken thighs** in a little oil in a **heavy pot**, then lift out.",
      "Soften the **onion** and **garlic** 4 min, stir in **ras el hanout** until fragrant.",
      "Return the chicken with **dried apricots**, **green olives** and **chicken broth**. Cover and simmer gently 30-35 min until the chicken is falling off the bone.",
      "Meanwhile pour boiling water over the **couscous**, cover 5 min, then fluff. Serve the tagine over it, scattered with **coriander**."
    ],
    batchTip: "The tagine deepens overnight - it keeps 3 days in the fridge and reheats gently with a splash of water.",
    substitutionTip: "Swap couscous for cooked quinoa to keep it fully gluten-free."
  },
  {
    id: "d03", name: "Miso Glazed Tofu Stir-fry", cuisine: "Asian", mealType: "dinner",
    prepTime: 15, cookTime: 15, difficulty: "easy",
    phases: ["follicular", "ovulatory"], goal: ["lose", "gain"],
    dietTags: ["vegan"], allergens: ["soy"],
    macros: { calories: 410, protein: 22, carbs: 40, fat: 17 },
    micros: { iron: 3, magnesium: 55, fibre: 6 },
    servings: 1,
    equipment: ["Non-stick pan or wok", "Small bowl"],
    ingredients: [
      { name: "Firm tofu", quantity: "250g, pressed" },
      { name: "White miso paste", quantity: "1 tbsp" },
      { name: "Soy sauce", quantity: "1 tbsp" },
      { name: "Maple syrup", quantity: "1 tsp" },
      { name: "Sesame oil", quantity: "1 tsp" },
      { name: "Broccoli & peppers", quantity: "2 cups, chopped" },
      { name: "Garlic & ginger", quantity: "1 tsp each, grated" },
      { name: "Brown rice", quantity: "1/2 cup dry" }
    ],
    steps: [
      "Cut the **firm tofu** into cubes and pan-fry in a hot **non-stick pan** until golden on all sides, 6-8 min.",
      "Whisk **white miso paste**, **soy sauce**, **maple syrup** and **sesame oil** into a [[miso glaze]] and toss it through the tofu off the heat.",
      "In the same pan, stir-fry **broccoli & peppers** with **garlic & ginger** 4-5 min until crisp-tender.",
      "Serve tofu and vegetables over cooked **brown rice**, spooning any glaze from the pan on top."
    ],
    batchTip: "Press and cube the tofu ahead - it keeps 3 days and crisps faster when already dry.",
    substitutionTip: "No miso? Use 1 extra tbsp soy sauce plus a little tahini for the same savoury glaze."
  },
  {
    id: "d04", name: "Mediterranean Stuffed Peppers", cuisine: "Mediterranean", mealType: "dinner",
    prepTime: 20, cookTime: 35, difficulty: "medium",
    phases: ["follicular", "ovulatory"], goal: ["maintain"],
    dietTags: ["vegetarian", "gluten-free"], allergens: [],
    macros: { calories: 380, protein: 16, carbs: 46, fat: 14 },
    micros: { fibre: 10, vitaminC: 60, vitaminB6: 0.4 },
    servings: 2,
    equipment: ["Baking dish", "Mixing bowl"],
    ingredients: [
      { name: "Bell peppers", quantity: "4" },
      { name: "Cooked rice", quantity: "1.5 cups" },
      { name: "Feta", quantity: "1/2 cup, crumbled" },
      { name: "Cherry tomatoes", quantity: "1 cup, halved" },
      { name: "Parsley & dill", quantity: "1/4 cup, chopped" },
      { name: "Passata", quantity: "1 cup" },
      { name: "Olive oil", quantity: "1 tbsp" }
    ],
    steps: [
      "Heat oven to 190°C. Slice the tops off the **bell peppers** and scoop out the seeds.",
      "In a bowl mix **cooked rice**, **feta**, **cherry tomatoes** and **parsley & dill** with the **olive oil** and season.",
      "Spoon **passata** across the base of a **baking dish**, stand the peppers in it and pack with the filling.",
      "Cover with foil and bake 25 min, then uncover for 10 min until the peppers are tender and lightly charred."
    ],
    batchTip: "Assemble fully the night before and refrigerate - just add 5 min to the covered bake.",
    substitutionTip: "Dairy-free? Swap feta for cubed firm tofu tossed with a pinch of salt and oregano."
  },
  {
    id: "d05", name: "Black Bean & Sweet Potato Enchiladas", cuisine: "Latin", mealType: "dinner",
    prepTime: 20, cookTime: 30, difficulty: "medium",
    phases: ["luteal", "menstrual"], goal: ["maintain", "gain"],
    dietTags: ["vegetarian", "gluten-free"], allergens: [],
    macros: { calories: 460, protein: 18, carbs: 62, fat: 16 },
    micros: { fibre: 14, magnesium: 65, iron: 3 },
    servings: 2,
    equipment: ["Baking dish", "Frying pan"],
    ingredients: [
      { name: "Sweet potato", quantity: "1 large, diced" },
      { name: "Black beans", quantity: "1.5 cups, drained" },
      { name: "Cumin & smoked paprika", quantity: "1 tsp each" },
      { name: "Corn tortillas", quantity: "4" },
      { name: "Passata", quantity: "1 cup" },
      { name: "Chipotle or chilli powder", quantity: "1 tsp" },
      { name: "Cheddar", quantity: "1/2 cup, grated" },
      { name: "Coriander", quantity: "to garnish" }
    ],
    steps: [
      "Heat oven to 200°C. Toss **sweet potato** with a little oil and roast 20 min until tender.",
      "In a pan warm **black beans** with **cumin & smoked paprika** and the roasted sweet potato, mashing lightly to bind.",
      "Stir **chipotle or chilli powder** into the **passata** for a quick [[enchilada sauce]]; spread a little in a **baking dish**.",
      "Fill each **corn tortilla**, roll seam-down in the dish, blanket with the rest of the sauce and the **cheddar**, and bake 12-15 min until bubbling. Scatter with **coriander**."
    ],
    batchTip: "Roll and sauce the enchiladas ahead, refrigerate, then bake straight from cold adding 5 min.",
    substitutionTip: "Vegan? Use a dairy-free cheese and check the tortillas - the filling is already plant-based."
  },
  {
    id: "d06", name: "Lemon Garlic Shrimp Linguine", cuisine: "Mediterranean", mealType: "dinner",
    prepTime: 15, cookTime: 15, difficulty: "easy",
    phases: ["ovulatory", "follicular"], goal: ["gain"],
    dietTags: [], allergens: ["shellfish"],
    macros: { calories: 500, protein: 29, carbs: 56, fat: 16 },
    micros: { omega3: 0.8, vitaminC: 14 },
    servings: 1,
    equipment: ["Pot", "Frying pan"],
    ingredients: [
      { name: "Linguine", quantity: "100g" },
      { name: "Shrimp", quantity: "200g, peeled" },
      { name: "Garlic", quantity: "3 cloves, sliced" },
      { name: "Lemon", quantity: "1 (zest & juice)" },
      { name: "Chilli flakes", quantity: "1 pinch" },
      { name: "Olive oil", quantity: "1.5 tbsp" },
      { name: "Parsley", quantity: "2 tbsp, chopped" }
    ],
    steps: [
      "Cook the **linguine** in well-salted water until al dente, saving a cup of pasta water before draining.",
      "Gently warm **garlic** and **chilli flakes** in **olive oil** until just golden, then add the **shrimp** and cook 2 min a side until pink.",
      "Add the **lemon** zest and juice with a splash of pasta water, swirling into a light sauce.",
      "Toss in the pasta and **parsley**, loosening with more pasta water until glossy."
    ],
    batchTip: "Best fresh, but leftovers reheat well in a pan with a splash of water to revive the sauce.",
    substitutionTip: "No shellfish? Sliced chicken breast or chunks of firm white fish work beautifully here."
  },
  {
    id: "d07", name: "Spiced Lentil Dal with Brown Rice", cuisine: "Middle Eastern", mealType: "dinner",
    prepTime: 10, cookTime: 30, difficulty: "easy",
    phases: ["menstrual", "luteal"], goal: ["lose", "maintain"],
    dietTags: ["vegan", "gluten-free"], allergens: [],
    macros: { calories: 420, protein: 26, carbs: 58, fat: 9 },
    micros: { iron: 6, fibre: 16, magnesium: 70 },
    servings: 2,
    equipment: ["Pot", "Small pot"],
    ingredients: [
      { name: "Red lentils", quantity: "1 cup, rinsed" },
      { name: "Onion", quantity: "1, diced" },
      { name: "Garlic & ginger", quantity: "1 tbsp each, grated" },
      { name: "Turmeric & cumin", quantity: "1 tsp each" },
      { name: "Coconut milk", quantity: "1/2 cup" },
      { name: "Vegetable broth", quantity: "2.5 cups" },
      { name: "Brown rice", quantity: "1/2 cup dry" },
      { name: "Lemon & coriander", quantity: "to finish" }
    ],
    steps: [
      "Soften the **onion** in a little oil, then stir in **garlic & ginger** and **turmeric & cumin** until fragrant.",
      "Add **red lentils** and **vegetable broth**, and simmer 20-25 min until the lentils collapse into a soft dal.",
      "Stir through the **coconut milk** and warm another 2 min; loosen with water if needed.",
      "Serve over cooked **brown rice**, finished with **lemon & coriander**."
    ],
    batchTip: "Dal thickens as it sits and freezes for up to 2 months - loosen with water when reheating.",
    substitutionTip: "No coconut milk? A spoon of tahini stirred in at the end gives the same creamy finish."
  },
  {
    id: "d08", name: "Grilled Chicken Buddha Bowl", cuisine: "Asian", mealType: "dinner",
    prepTime: 15, cookTime: 20, difficulty: "easy",
    phases: ["ovulatory", "follicular"], goal: ["gain", "lose"],
    dietTags: ["gluten-free"], allergens: [],
    macros: { calories: 490, protein: 38, carbs: 42, fat: 17 },
    micros: { fibre: 9, vitaminB6: 0.8, vitaminC: 22 },
    servings: 1,
    equipment: ["Grill pan", "Baking tray"],
    ingredients: [
      { name: "Chicken breast", quantity: "180g" },
      { name: "Quinoa", quantity: "1/3 cup dry" },
      { name: "Sweet potato & broccoli", quantity: "1.5 cups, chopped" },
      { name: "Olive oil", quantity: "1 tbsp" },
      { name: "Paprika & garlic powder", quantity: "1/2 tsp each" },
      { name: "Tahini", quantity: "1 tbsp" },
      { name: "Lemon", quantity: "1/2" }
    ],
    steps: [
      "Heat oven to 200°C. Toss **sweet potato & broccoli** with half the **olive oil** and roast on a **baking tray** 20 min.",
      "Rub the **chicken breast** with **paprika & garlic powder** and grill 5-6 min a side until cooked through, then rest and slice.",
      "Cook the **quinoa** and loosen the **tahini** with **lemon** juice and water into a pourable [[tahini dressing]].",
      "Build the bowl with quinoa, roasted veg and sliced chicken, then drizzle with the dressing."
    ],
    batchTip: "Roast the veg and cook the quinoa in bulk for 3 fast bowls across the week.",
    substitutionTip: "Swap chicken for baked tofu or chickpeas to make it fully plant-based."
  },
  {
    id: "d09", name: "Nordic Beet & Walnut Salad with Goat Cheese", cuisine: "Nordic", mealType: "dinner",
    prepTime: 15, cookTime: 0, difficulty: "quick",
    phases: ["ovulatory", "follicular"], goal: ["lose", "maintain"],
    dietTags: ["vegetarian", "gluten-free"], allergens: ["nuts", "dairy"],
    macros: { calories: 410, protein: 25, carbs: 26, fat: 24 },
    micros: { fibre: 8, vitaminC: 16, magnesium: 50 },
    servings: 1,
    equipment: ["Small bowl", "Frying pan"],
    ingredients: [
      { name: "Cooked beets", quantity: "1.5 cups, wedged" },
      { name: "Mixed greens", quantity: "2 cups" },
      { name: "Goat cheese", quantity: "50g" },
      { name: "Walnuts", quantity: "1/4 cup" },
      { name: "Olive oil", quantity: "1 tbsp" },
      { name: "Red wine vinegar", quantity: "1 tsp" },
      { name: "Honey & dijon", quantity: "1/2 tsp each" }
    ],
    steps: [
      "Toast the **walnuts** in a dry **frying pan** 2-3 min until fragrant, then roughly chop.",
      "Whisk **olive oil**, **red wine vinegar** and **honey & dijon** into a [[vinaigrette]].",
      "Toss the **mixed greens** and **cooked beets** with most of the dressing and pile onto a plate.",
      "Crumble over the **goat cheese**, scatter the walnuts and finish with the last of the vinaigrette."
    ],
    batchTip: "Keep the vinaigrette in a jar for up to a week - shake and pour when you need it.",
    substitutionTip: "Dairy-free? Swap goat cheese for a few slices of avocado for the same creamy contrast."
  },
  {
    id: "d10", name: "African Peanut Chicken Curry", cuisine: "African", mealType: "dinner",
    prepTime: 15, cookTime: 30, difficulty: "easy",
    phases: ["menstrual", "luteal"], goal: ["gain"],
    dietTags: ["gluten-free"], allergens: ["nuts"],
    macros: { calories: 540, protein: 34, carbs: 38, fat: 26 },
    micros: { iron: 4, magnesium: 70, omega3: 0.4 },
    servings: 2,
    equipment: ["Heavy pot", "Small pot"],
    ingredients: [
      { name: "Chicken thighs", quantity: "250g, diced" },
      { name: "Onion", quantity: "1, diced" },
      { name: "Ginger & garlic", quantity: "1 tbsp each, grated" },
      { name: "Chopped tomatoes", quantity: "1 cup" },
      { name: "Peanut butter", quantity: "3 tbsp" },
      { name: "Chicken broth", quantity: "1 cup" },
      { name: "Spinach", quantity: "2 cups" },
      { name: "Rice", quantity: "1/2 cup dry" }
    ],
    steps: [
      "Brown the **chicken thighs** in a **heavy pot**, then lift out.",
      "Soften the **onion** with **ginger & garlic**, add **chopped tomatoes** and cook down 5 min.",
      "Whisk in **peanut butter** and **chicken broth**, return the chicken, and simmer 20 min until thick and glossy.",
      "Wilt in the **spinach** for the last 2 min and serve over cooked **rice**."
    ],
    batchTip: "This curry deepens overnight and freezes well - store up to 2 months in single portions.",
    substitutionTip: "Peanut allergy in the house? Sunflower seed butter gives the same creamy body."
  },
  {
    id: "d11", name: "Zucchini Noodle Bolognese", cuisine: "Mediterranean", mealType: "dinner",
    prepTime: 15, cookTime: 30, difficulty: "easy",
    phases: ["luteal", "menstrual"], goal: ["lose", "maintain"],
    dietTags: ["gluten-free"], allergens: [],
    macros: { calories: 410, protein: 28, carbs: 24, fat: 20 },
    micros: { iron: 4, vitaminC: 28, fibre: 6 },
    servings: 2,
    equipment: ["Frying pan", "Spiralizer"],
    ingredients: [
      { name: "Lean turkey mince", quantity: "200g" },
      { name: "Onion & garlic", quantity: "1 small + 2 cloves" },
      { name: "Passata", quantity: "1.5 cups" },
      { name: "Tomato paste", quantity: "1 tbsp" },
      { name: "Dried oregano", quantity: "1 tsp" },
      { name: "Zucchini", quantity: "2 large" },
      { name: "Basil & parmesan", quantity: "to serve" }
    ],
    steps: [
      "Brown the **turkey mince** in a **frying pan**, breaking it up, then add **onion & garlic** and soften 4 min.",
      "Stir in **tomato paste**, **passata** and **dried oregano**, and simmer 20 min until rich.",
      "Spiralize the **zucchini** into noodles and sauté in a hot dry pan 2 min - just to warm, not soften.",
      "Twirl the noodles onto plates, spoon over the bolognese and finish with **basil & parmesan**."
    ],
    batchTip: "The bolognese keeps 4 days and freezes for 3 months - spiralize fresh zucchini each time.",
    substitutionTip: "No spiralizer? A peeler makes wide zucchini ribbons that work just as well."
  },
  {
    id: "d12", name: "Korean Beef Bibimbap", cuisine: "Asian", mealType: "dinner",
    prepTime: 20, cookTime: 20, difficulty: "medium",
    phases: ["follicular", "ovulatory"], goal: ["gain"],
    dietTags: [], allergens: ["soy", "eggs"],
    macros: { calories: 530, protein: 32, carbs: 54, fat: 19 },
    micros: { iron: 5, vitaminC: 18, fibre: 7 },
    servings: 1,
    equipment: ["Frying pan", "Pot"],
    ingredients: [
      { name: "Thinly sliced beef", quantity: "150g" },
      { name: "Soy sauce & sesame oil", quantity: "1 tbsp each" },
      { name: "Garlic", quantity: "1 clove, grated" },
      { name: "Rice", quantity: "1/2 cup dry" },
      { name: "Spinach & carrot", quantity: "1.5 cups" },
      { name: "Egg", quantity: "1" },
      { name: "Gochujang", quantity: "1 tbsp" }
    ],
    steps: [
      "Marinate the **thinly sliced beef** in **soy sauce & sesame oil** with **garlic** for 10 min while the **rice** cooks.",
      "Sauté the **spinach & carrot** separately in a hot pan, keeping each vegetable in its own pile, then set aside.",
      "Sear the beef in the same **frying pan** 2-3 min until caramelised, then fry the **egg** sunny-side up.",
      "Bowl the rice, arrange the beef and vegetables on top, crown with the egg and a spoon of **gochujang** to stir through."
    ],
    batchTip: "Prep and refrigerate the sautéed vegetables ahead - assembly then takes under 10 min.",
    substitutionTip: "Swap beef for sliced mushrooms and extra egg for a lighter vegetarian bibimbap."
  },

  // ───────── Snacks (6) ─────────
  {
    id: "s01", name: "Dates + Almond Butter", cuisine: "Global", mealType: "snack",
    prepTime: 5, cookTime: 0, difficulty: "quick",
    servings: 1,
    equipment: [],
    phases: ["menstrual", "luteal"], goal: ["maintain", "gain"],
    dietTags: ["vegan", "gluten-free"], allergens: ["nuts"],
    macros: { calories: 210, protein: 5, carbs: 28, fat: 10 },
    micros: { magnesium: 40, iron: 1, fibre: 4 },
    ingredients: [
      { name: "Medjool dates", quantity: "3" },
      { name: "Almond butter", quantity: "1 tbsp" },
      { name: "Flaky sea salt", quantity: "1 pinch (optional)" }
    ],
    steps: [
      "Slit each **medjool date** down one side and lift out the pit.",
      "Spoon **almond butter** into the pocket and press gently closed.",
      "Finish with a pinch of **flaky sea salt** to sharpen the caramel sweetness."
    ],
    batchTip: "Stuff a whole box at once and keep in an airtight tin for grab-and-go all week.",
    substitutionTip: "Nut-free? Use sunflower seed butter or tahini instead of almond butter."
  },
  {
    id: "s02", name: "Greek Yoghurt, Berries & Flaxseed", cuisine: "Mediterranean", mealType: "snack",
    prepTime: 5, cookTime: 0, difficulty: "quick",
    servings: 1,
    equipment: [],
    phases: ["follicular", "ovulatory"], goal: ["lose", "maintain"],
    dietTags: ["vegetarian", "gluten-free"], allergens: ["dairy"],
    macros: { calories: 180, protein: 16, carbs: 18, fat: 5 },
    micros: { vitaminC: 14, fibre: 4, omega3: 0.6 },
    ingredients: [
      { name: "Greek yoghurt", quantity: "150 g" },
      { name: "Mixed berries", quantity: "1/2 cup" },
      { name: "Ground flaxseed", quantity: "1 tbsp" },
      { name: "Honey", quantity: "1 tsp (optional)" }
    ],
    steps: [
      "Spoon the **greek yoghurt** into a bowl and swirl smooth.",
      "Scatter over the **mixed berries**, crushing one or two to bleed colour through.",
      "Dust with **ground flaxseed** and drizzle with **honey** if you like it sweeter."
    ],
    batchTip: "Layer yoghurt, berries and flax in a jar the night before for an instant morning snack.",
    substitutionTip: "Dairy-free? Use thick coconut or soy yoghurt; chia seeds work in place of flax."
  },
  {
    id: "s03", name: "Carrot Sticks, Hummus & Seeds", cuisine: "Middle Eastern", mealType: "snack",
    prepTime: 5, cookTime: 0, difficulty: "quick",
    servings: 1,
    equipment: [],
    phases: ["ovulatory", "follicular"], goal: ["lose"],
    dietTags: ["vegan", "gluten-free"], allergens: [],
    macros: { calories: 160, protein: 6, carbs: 18, fat: 8 },
    micros: { fibre: 5, vitaminC: 8, vitaminB6: 0.2 },
    ingredients: [
      { name: "Carrots", quantity: "2, cut into sticks" },
      { name: "Hummus", quantity: "3 tbsp - tap in steps to make it" },
      { name: "Mixed seeds", quantity: "1 tbsp" },
      { name: "Lemon", quantity: "a squeeze" }
    ],
    steps: [
      "Cut the **carrots** into finger-length sticks so they scoop without snapping.",
      "Spoon [[hummus]] into a small bowl and swipe the back of a spoon through it to make a well.",
      "Pile **mixed seeds** into the well, add a squeeze of **lemon**, and dip."
    ],
    batchTip: "Cut a batch of carrot sticks and keep in a tub of cold water in the fridge - they stay crisp for days.",
    substitutionTip: "Swap carrots for cucumber, pepper or endive; use tzatziki instead of hummus for a lighter dip."
  },
  {
    id: "s04", name: "Banana, Dark Chocolate & Walnuts", cuisine: "Global", mealType: "snack",
    prepTime: 5, cookTime: 0, difficulty: "quick",
    servings: 1,
    equipment: [],
    phases: ["luteal", "menstrual"], goal: ["maintain", "gain"],
    dietTags: ["vegetarian"], allergens: ["nuts"],
    macros: { calories: 230, protein: 4, carbs: 32, fat: 11 },
    micros: { magnesium: 45, fibre: 4 },
    ingredients: [
      { name: "Banana", quantity: "1" },
      { name: "Dark chocolate", quantity: "1 square (10 g)" },
      { name: "Walnuts", quantity: "1 tbsp, chopped" }
    ],
    steps: [
      "Slice the **banana** on the diagonal and fan it across a plate.",
      "Chop the **dark chocolate** into shards and the **walnuts** into rough pieces.",
      "Scatter chocolate and walnuts over the banana so a little lands on every slice."
    ],
    batchTip: "Freeze banana coins, then dip in melted dark chocolate and roll in walnuts for a make-ahead treat.",
    substitutionTip: "Nut-free? Use pumpkin seeds; any ripe pear works in place of banana."
  },
  {
    id: "s05", name: "Roasted Chickpea Crunch", cuisine: "Mediterranean", mealType: "snack",
    prepTime: 10, cookTime: 25, difficulty: "quick",
    servings: 1,
    equipment: ["Baking tray"],
    phases: ["menstrual", "follicular"], goal: ["lose", "maintain"],
    dietTags: ["vegan", "gluten-free"], allergens: [],
    macros: { calories: 190, protein: 8, carbs: 24, fat: 6 },
    micros: { fibre: 7, iron: 2 },
    ingredients: [
      { name: "Chickpeas", quantity: "1 cup, drained" },
      { name: "Olive oil", quantity: "1 tsp" },
      { name: "Smoked paprika", quantity: "1/2 tsp" },
      { name: "Salt", quantity: "to taste" }
    ],
    steps: [
      "Pat the **chickpeas** thoroughly dry with a towel - the drier they are, the crispier they roast.",
      "Toss with **olive oil**, **smoked paprika** and **salt** on a baking tray.",
      "Roast at 200°C for 20-25 min, shaking halfway, until deep golden and crunchy.",
      "Cool for 5 min on the tray - they crisp up further as they sit."
    ],
    batchTip: "Double the tray and store cooled chickpeas in an open jar; a sealed one traps steam and softens them.",
    substitutionTip: "No paprika? Try curry powder, za'atar or a little cinnamon-sugar for a sweet version."
  },
  {
    id: "s06", name: "Protein Energy Balls", cuisine: "Global", mealType: "snack",
    prepTime: 15, cookTime: 0, difficulty: "quick",
    servings: 1,
    equipment: ["Mixing bowl"],
    phases: ["ovulatory", "luteal"], goal: ["gain", "maintain"],
    dietTags: ["vegetarian"], allergens: ["nuts"],
    macros: { calories: 260, protein: 26, carbs: 22, fat: 9 },
    micros: { magnesium: 50, fibre: 5, iron: 2 },
    ingredients: [
      { name: "Protein powder", quantity: "1/2 cup" },
      { name: "Rolled oats", quantity: "1/2 cup" },
      { name: "Peanut butter", quantity: "2 tbsp" },
      { name: "Honey", quantity: "1 tbsp" },
      { name: "Milk", quantity: "1-2 tbsp, if needed" }
    ],
    steps: [
      "In a bowl, stir together **protein powder** and **rolled oats**.",
      "Mix in **peanut butter** and **honey** until a stiff dough forms; add **milk** a splash at a time if it's too dry.",
      "Roll into 4-5 walnut-sized balls, pressing firmly so they hold.",
      "Chill for 30 min to set before eating."
    ],
    batchTip: "Make a triple batch and freeze; they thaw in minutes and keep 3 months.",
    substitutionTip: "Nut-free? Use sunflower seed butter; maple syrup swaps in for honey to keep it vegan."
  },

  // ───────── Migrated from Meals Planner seed (4) ─────────
  {
    id: "rose-oats", name: "Rose-Berry Overnight Oats", cuisine: "Global", mealType: "breakfast",
    image: "/images/meal-oats.webp",
    prepTime: 5, cookTime: 0, difficulty: "easy",
    servings: 1,
    equipment: ["Jar"],
    phases: ["follicular", "ovulatory"], goal: ["lose", "maintain"],
    dietTags: ["vegetarian"], allergens: ["dairy"],
    macros: { calories: 320, protein: 14, carbs: 50, fat: 8 },
    micros: { calcium: 200, fibre: 6 },
    ingredients: [
      { name: "Oats", quantity: "1/2 cup" },
      { name: "Greek yogurt", quantity: "1/2 cup" },
      { name: "Milk", quantity: "1/2 cup" },
      { name: "Strawberries", quantity: "1/2 cup" },
      { name: "Honey", quantity: "1 tsp" },
      { name: "Rose water", quantity: "1/4 tsp" }
    ],
    steps: [
      "Stir **oats**, **Greek yogurt** and **milk** together in a jar until the oats are fully submerged.",
      "Mix in **honey**, a drop of **rose water** and half the chopped **strawberries**.",
      "Seal and chill overnight to soften and thicken.",
      "Top with the remaining strawberries in the morning."
    ],
    cyclePhase: ["follicular", "ovulation", "any"],
    intention: ["light", "energy", "quick"],
    cost: "$",
    vibe: "Energizing",
    conservation: { fridgeDays: 3, freezerWeeks: 0, container: "Glass jar with lid" },
    batchTip: "Make 3 jars at once for the week; they keep 3 days chilled.",
    substitutionTip: "Swap strawberries for any berry or chopped apple; skip the rose water if you prefer.",
    packable: true, noReheat: true
  },
  { id: "rainbow-buddha", name: "Rainbow Salmon Buddha Bowl", cuisine: "Asian", mealType: "lunch", image: "/images/meal-buddha.webp", prepTime: 10, cookTime: 15, difficulty: "easy", servings: 1, equipment: ["Baking tray", "Small pot"], phases: ["ovulatory", "follicular"], goal: ["maintain", "gain"], dietTags: ["gluten-free"], allergens: [], macros: { calories: 480, protein: 32, carbs: 38, fat: 20 }, micros: { omega3: 1.8, iron: 2, vitaminC: 20 }, ingredients: [ { name: "Salmon fillet", quantity: "150 g" }, { name: "Quinoa", quantity: "1/2 cup dry" }, { name: "Avocado", quantity: "1/2" }, { name: "Cooked beetroot", quantity: "1/2 cup, sliced" }, { name: "Baby spinach", quantity: "1 cup" }, { name: "Olive oil", quantity: "1 tbsp" }, { name: "Lemon", quantity: "1/2" } ], steps: [ "Rinse the **quinoa** and simmer in 1 cup water for 12-15 min, then fluff with a fork.", "Rub the **salmon** with **olive oil**, **lemon** and salt, then bake at 200°C for 12 min until it flakes.", "Bowl up the quinoa, salmon, **beetroot**, **baby spinach** and sliced **avocado**, and dress with a [[vinaigrette]] of olive oil and lemon." ], batchTip: "Cook a big batch of quinoa for the week - it keeps 4 days chilled.", substitutionTip: "Swap salmon for roasted chickpeas to make it fully vegan." },
  {
    id: "cozy-lentil", name: "Cozy Lentil Sweet Potato Stew", cuisine: "Global", mealType: "dinner",
    image: "/images/meal-stew.webp",
    prepTime: 10, cookTime: 30, difficulty: "easy",
    phases: ["menstrual", "luteal"], goal: ["maintain", "lose"],
    dietTags: ["vegan", "vegetarian", "gluten-free"], allergens: [],
    macros: { calories: 380, protein: 14, carbs: 58, fat: 10 },
    micros: { iron: 5, fibre: 14, magnesium: 60 },
    servings: 4,
    equipment: ["Large pot"],
    ingredients: [
      { name: "Green or brown lentils", quantity: "1 cup, rinsed" },
      { name: "Sweet potato", quantity: "2, diced" },
      { name: "Onion", quantity: "1, diced" },
      { name: "Garlic", quantity: "2 cloves" },
      { name: "Carrots", quantity: "2, sliced" },
      { name: "Cumin", quantity: "1 tsp" },
      { name: "Turmeric", quantity: "1/2 tsp" },
      { name: "Olive oil", quantity: "1 tbsp" }
    ],
    steps: [
      "Soften the **onion** and **garlic** in **olive oil** with **cumin** and **turmeric** for 3 min until fragrant.",
      "Stir in the **carrots** and **sweet potato** and cook 2 min to coat in the spices.",
      "Add the **lentils** and 4 cups water, then simmer 25 min until the lentils and sweet potato are meltingly tender.",
      "Season well and mash a few pieces of sweet potato against the pot to thicken."
    ],
    cyclePhase: ["period", "luteal", "any"],
    intention: ["comfort", "plant", "budget", "cycle"],
    cost: "$",
    vibe: "Balanced",
    conservation: { fridgeDays: 5, freezerWeeks: 8, container: "Airtight container or freezer bag" },
    batchTip: "Doubles beautifully — freeze half in single portions.",
    substitutionTip: "Swap sweet potato for butternut squash."
  },
  {
    id: "kid-bento", name: "Strawberry Bento Lunchbox", cuisine: "Global", mealType: "lunchbox",
    image: "/images/meal-lunchbox.webp",
    prepTime: 10, cookTime: 0, difficulty: "easy",
    phases: ["menstrual", "follicular", "ovulatory", "luteal"], goal: ["maintain"],
    dietTags: ["vegetarian"], allergens: ["dairy"],
    macros: { calories: 280, protein: 10, carbs: 38, fat: 9 },
    micros: { calcium: 150, vitaminC: 30 },
    servings: 1,
    equipment: ["Small cutter or knife", "Bento box"],
    ingredients: [
      { name: "Bread", quantity: "2 slices" },
      { name: "Cheddar", quantity: "30 g" },
      { name: "Butter or cream cheese", quantity: "1 tsp" },
      { name: "Cucumber", quantity: "1/2" },
      { name: "Strawberries", quantity: "6" },
    ],
    steps: [
      "Thinly spread the **bread** with **butter or cream cheese**, add a slice of **cheddar** and close, then press a cutter or knife into mini shapes so they stay sealed for the box.",
      "Slice **cucumber** into rounds and cut the rest of the cheddar into small cubes.",
      "Hull and halve the **strawberries** just before packing so they don't weep, then arrange sandwiches, cucumber, cheese and berries in separate compartments.",
    ],
    cyclePhase: ["any"],
    intention: ["quick", "budget"],
    cost: "$",
    vibe: "Light",
    conservation: { fridgeDays: 1, freezerWeeks: 0, sameDay: true, container: "Bento box" },
    packable: true, noReheat: true,
    batchTip: "Build the sandwiches Sunday and freeze; berries and cucumber go in fresh each morning.",
    substitutionTip: "Swap cheddar for a smear of hummus to make it dairy-free.",
  },

  // ───────── Batch 2 — Breakfast (+6) ─────────
  {
    id: "b11", name: "Spinach Feta Breakfast Muffins", cuisine: "Mediterranean", mealType: "breakfast",
    prepTime: 15, cookTime: 20, difficulty: "easy",
    servings: 6,
    equipment: ["Muffin tin", "Mixing bowl"],
    phases: ["follicular", "ovulatory"], goal: ["maintain", "lose"],
    dietTags: ["vegetarian"], allergens: ["dairy", "eggs"],
    macros: { calories: 290, protein: 18, carbs: 20, fat: 16 },
    micros: { calcium: 150, vitaminC: 8, fibre: 3 },
    ingredients: [
      { name: "Eggs", quantity: "4" },
      { name: "Spinach", quantity: "1 cup" },
      { name: "Feta", quantity: "50g" },
      { name: "Flour", quantity: "1/2 cup" },
      { name: "Milk", quantity: "1/4 cup" },
      { name: "Baking powder", quantity: "1 tsp" },
      { name: "Spring onion", quantity: "2" },
      { name: "Olive oil", quantity: "1 tbsp" }
    ],
    steps: [
      "Heat oven to 180°C and oil or line a 6-cup **muffin tin**.",
      "Whisk **eggs** with **milk**, **flour**, **baking powder** and **olive oil** to a smooth batter.",
      "Wilt and chop **spinach**, squeeze out the water, then fold in with crumbled **feta** and sliced **spring onion**; season.",
      "Divide between the cups and bake 20 min until risen and set."
    ],
    batchTip: "Bake a batch and freeze; reheat from frozen in a 160°C oven for 10 min.",
    substitutionTip: "Gluten-free? Use a 1:1 GF flour blend; dairy-free feta also works."
  },
  {
    id: "b12", name: "Vegan Tofu Breakfast Burrito", cuisine: "Latin", mealType: "breakfast",
    prepTime: 10, cookTime: 10, difficulty: "easy",
    servings: 1,
    equipment: ["Non-stick pan"],
    phases: ["menstrual", "luteal"], goal: ["lose", "maintain"],
    dietTags: ["vegan", "gluten-free"], allergens: ["soy"],
    macros: { calories: 340, protein: 18, carbs: 36, fat: 14 },
    micros: { iron: 4, fibre: 7, vitaminC: 12 },
    ingredients: [
      { name: "Firm tofu", quantity: "150g" },
      { name: "Corn tortilla", quantity: "1 large" },
      { name: "Black beans", quantity: "1/2 cup" },
      { name: "Avocado", quantity: "1/4" },
      { name: "Turmeric", quantity: "1/2 tsp" },
      { name: "Cumin", quantity: "1/2 tsp" },
      { name: "Lime", quantity: "1/2" },
      { name: "Fresh coriander", quantity: "handful" },
      { name: "Salsa", quantity: "2 tbsp - tap in steps to make it" }
    ],
    steps: [
      "Press and crumble **firm tofu**, then fry with **turmeric**, **cumin** and salt for 4-5 min until golden.",
      "Warm the **black beans** and lightly crush them; heat the **corn tortilla** until soft and pliable.",
      "Slice the **avocado** and squeeze over **lime**.",
      "Layer beans, tofu, avocado and a spoon of [[salsa]] down the tortilla, scatter with **coriander** and roll tight."
    ],
    batchTip: "Scramble the tofu and beans ahead; keep 3 days chilled and wrap fresh to serve.",
    substitutionTip: "Use a large gluten-free wrap if corn tortillas tear, or serve in lettuce cups."
  },
  {
    id: "b13", name: "Overnight PB Banana Oats", cuisine: "Global", mealType: "breakfast",
    prepTime: 5, cookTime: 0, difficulty: "quick",
    servings: 1,
    equipment: ["Jar"],
    phases: ["luteal", "menstrual"], goal: ["gain", "maintain"],
    dietTags: ["vegan"], allergens: ["nuts"],
    macros: { calories: 380, protein: 13, carbs: 52, fat: 14 },
    micros: { magnesium: 65, fibre: 8 },
    ingredients: [
      { name: "Oats", quantity: "1/2 cup" },
      { name: "Plant milk", quantity: "3/4 cup" },
      { name: "Peanut butter", quantity: "1 tbsp" },
      { name: "Chia seeds", quantity: "1 tsp" },
      { name: "Cinnamon", quantity: "pinch" },
      { name: "Maple syrup", quantity: "1 tsp" },
      { name: "Banana", quantity: "1/2" }
    ],
    steps: [
      "Stir **oats**, **plant milk**, **peanut butter**, **chia seeds** and a pinch of **cinnamon** in a jar until the peanut butter loosens through.",
      "Sweeten with a little **maple syrup** if you like.",
      "Chill overnight to thicken.",
      "Top with sliced **banana** just before eating."
    ],
    batchTip: "Make several jars at once; they keep 4 days chilled.",
    substitutionTip: "Nut-free? Use sunflower seed butter or tahini in place of peanut butter."
  },
  {
    id: "b14", name: "Shakshuka Verde", cuisine: "Middle Eastern", mealType: "breakfast",
    prepTime: 10, cookTime: 18, difficulty: "easy",
    servings: 2,
    equipment: ["Frying pan with lid"],
    phases: ["follicular", "ovulatory"], goal: ["maintain", "lose"],
    dietTags: ["vegetarian", "gluten-free"], allergens: ["eggs", "dairy"],
    macros: { calories: 310, protein: 19, carbs: 18, fat: 18 },
    micros: { iron: 3, fibre: 6, vitaminC: 30 },
    ingredients: [
      { name: "Spinach", quantity: "2 cups" },
      { name: "Green chili", quantity: "1" },
      { name: "Onion", quantity: "1/2" },
      { name: "Garlic", quantity: "2 cloves" },
      { name: "Cumin", quantity: "1/2 tsp" },
      { name: "Eggs", quantity: "2" },
      { name: "Feta", quantity: "30g" },
      { name: "Olive oil", quantity: "1 tbsp" },
      { name: "Lemon", quantity: "1/2" }
    ],
    steps: [
      "Soften **onion**, **garlic** and sliced **green chili** in **olive oil** for 3-4 min.",
      "Add **cumin**, then the **spinach** in handfuls, wilting until you have a soft green base; season.",
      "Make two wells, crack in the **eggs**, cover and cook 5-6 min until the whites set.",
      "Crumble over **feta**, add a squeeze of **lemon** and serve."
    ],
    batchTip: "Make the green base ahead and chill 3 days; add fresh eggs when you reheat.",
    substitutionTip: "Dairy-free? Swap feta for a spoon of dairy-free yoghurt, or leave it out."
  },
  {
    id: "b15", name: "Coconut Quinoa Porridge", cuisine: "Asian", mealType: "breakfast",
    prepTime: 5, cookTime: 12, difficulty: "easy",
    phases: ["ovulatory", "follicular"], goal: ["lose", "maintain"],
    dietTags: ["vegan", "gluten-free"], allergens: [],
    macros: { calories: 330, protein: 9, carbs: 48, fat: 12 },
    micros: { magnesium: 60, fibre: 6, iron: 2 },
    servings: 1,
    equipment: ["Small pot"],
    ingredients: [
      { name: "Quinoa", quantity: "1/3 cup, rinsed" },
      { name: "Coconut milk", quantity: "1/2 cup" },
      { name: "Water", quantity: "1/2 cup" },
      { name: "Cinnamon", quantity: "1/2 tsp" },
      { name: "Mango", quantity: "1/2 cup, diced" },
      { name: "Maple syrup", quantity: "1 tsp" },
      { name: "Toasted coconut flakes", quantity: "1 tbsp (optional)" }
    ],
    steps: [
      "Rinse **quinoa** well to wash off its bitter coating, then simmer with the **water** in a small pot for 10 min until the water is absorbed.",
      "Stir in the **coconut milk** and **cinnamon** and cook 2 min more until creamy and the little tails uncurl.",
      "Spoon into a bowl, top with **mango**, a drizzle of **maple syrup** and **toasted coconut flakes**."
    ],
    batchTip: "Cook a big batch of quinoa ahead - it keeps 4 days chilled and reheats with a splash of coconut milk in 2 min.",
    substitutionTip: "Swap mango for pineapple or banana, or use light coconut milk to trim the fat."
  },
  {
    id: "b16", name: "Halal Beef Breakfast Hash", cuisine: "African", mealType: "breakfast",
    prepTime: 15, cookTime: 20, difficulty: "easy",
    phases: ["menstrual", "luteal"], goal: ["gain", "maintain"],
    dietTags: ["halal", "gluten-free"], allergens: [],
    macros: { calories: 430, protein: 28, carbs: 32, fat: 20 },
    micros: { iron: 5, vitaminC: 16, fibre: 5 },
    servings: 1,
    equipment: ["Large frying pan"],
    ingredients: [
      { name: "Lean ground beef", quantity: "150 g" },
      { name: "Sweet potato", quantity: "1 cup, diced small" },
      { name: "Bell pepper", quantity: "1/2, diced" },
      { name: "Onion", quantity: "1/2, diced" },
      { name: "Garlic", quantity: "1 clove, minced" },
      { name: "Paprika", quantity: "1 tsp" },
      { name: "Cumin", quantity: "1/2 tsp" },
      { name: "Olive oil", quantity: "1 tbsp" }
    ],
    steps: [
      "Brown the **ground beef** in a dry pan over high heat, breaking it up, until crisp at the edges - 4-5 min. Lift out and set aside.",
      "Add the **olive oil** and **sweet potato** to the same pan, cover and cook 8 min until nearly tender, stirring now and then.",
      "Stir in the **onion**, **bell pepper**, **garlic**, **paprika** and **cumin**; cook uncovered 5 min until soft and caramelised.",
      "Return the beef, toss to heat through, season with salt and serve straight from the pan."
    ],
    batchTip: "Dice the sweet potato and pepper the night before so it comes together in one pan on busy mornings.",
    substitutionTip: "Ground lamb or turkey work just as well; swap sweet potato for regular potato if that's what you have."
  },

  // ───────── Batch 2 — Lunch (+6) ─────────
  { id: "l13", name: "Vegan Buddha Bowl with Tempeh", cuisine: "Asian", mealType: "lunch", prepTime: 15, cookTime: 15, difficulty: "easy", servings: 2, equipment: ["Non-stick pan", "Steamer"], phases: ["ovulatory", "follicular"], goal: ["lose", "gain"], dietTags: ["vegan", "gluten-free"], allergens: ["soy"], macros: { calories: 460, protein: 26, carbs: 48, fat: 18 }, micros: { iron: 4, fibre: 11, vitaminC: 20 }, ingredients: [ { name: "Tempeh", quantity: "150 g, cubed" }, { name: "Brown rice", quantity: "1 cup, cooked" }, { name: "Broccoli", quantity: "1 cup, florets" }, { name: "Carrots", quantity: "1/2 cup, ribboned" }, { name: "Soy sauce", quantity: "1 tbsp" }, { name: "Sesame dressing", quantity: "2 tbsp - tap in steps to make it" }, { name: "Sesame seeds", quantity: "to garnish" } ], steps: [ "Cube the **tempeh** and pan-fry in a little oil with a splash of **soy sauce** until golden on all sides, 6-8 min.", "Steam the **broccoli** and **carrots** for 4 min so they stay bright and crisp.", "Divide the **brown rice** between bowls, add the tempeh and veg, drizzle with [[sesame dressing]] and scatter over **sesame seeds**." ], batchTip: "Fry a double batch of tempeh - it crisps up again in a hot pan for tomorrow's bowl.", substitutionTip: "Not keen on tempeh? Firm tofu or edamame gives the same plant protein." },
  { id: "l14", name: "Halal Chicken Shawarma Bowl", cuisine: "Middle Eastern", mealType: "lunch", prepTime: 15, cookTime: 15, difficulty: "easy", servings: 2, equipment: ["Grill pan"], phases: ["follicular", "ovulatory"], goal: ["gain", "maintain"], dietTags: ["halal", "gluten-free"], allergens: [], macros: { calories: 470, protein: 36, carbs: 38, fat: 18 }, micros: { iron: 3, vitaminC: 22, fibre: 6 }, ingredients: [ { name: "Chicken breast", quantity: "2 (~350 g)" }, { name: "Shawarma spice", quantity: "1 tbsp" }, { name: "Olive oil", quantity: "1 tbsp" }, { name: "Garlic", quantity: "2 cloves" }, { name: "Lemon", quantity: "1" }, { name: "Rice", quantity: "1 cup, cooked" }, { name: "Cucumber & tomato", quantity: "1 cup, diced" }, { name: "Tahini sauce", quantity: "3 tbsp - tap in steps to make it" } ], steps: [ "Rub the **chicken breast** with **shawarma spice**, **garlic**, **olive oil** and **lemon**, and marinate 15 min.", "Sear on a hot **grill pan** for 5-6 min per side until charred and cooked through, then rest and slice thinly.", "Serve over the **rice** with a **cucumber & tomato** salad and a generous drizzle of [[tahini sauce]]." ], batchTip: "Cook the spiced chicken ahead - it slices cold into wraps and salads all week.", substitutionTip: "No shawarma blend? Mix cumin, paprika, coriander, turmeric and a pinch of cinnamon." },
  { id: "l15", name: "Caprese Quinoa Salad", cuisine: "Mediterranean", mealType: "lunch", prepTime: 10, cookTime: 0, difficulty: "quick", servings: 2, equipment: ["Mixing bowl"], phases: ["ovulatory", "follicular"], goal: ["maintain", "lose"], dietTags: ["vegetarian", "gluten-free"], allergens: ["dairy"], macros: { calories: 380, protein: 16, carbs: 36, fat: 18 }, micros: { fibre: 6, vitaminC: 18, calcium: 120 }, ingredients: [ { name: "Quinoa", quantity: "1/2 cup dry" }, { name: "Cherry tomatoes", quantity: "1 cup, halved" }, { name: "Mini mozzarella", quantity: "60 g" }, { name: "Basil", quantity: "1/4 cup" }, { name: "Olive oil", quantity: "1 tbsp" }, { name: "Balsamic glaze", quantity: "1 tbsp" } ], steps: [ "Cook and cool the **quinoa**, then tip into a **mixing bowl** with the halved **cherry tomatoes**.", "Add the **mini mozzarella** and torn **basil**, and toss with **olive oil**, salt and pepper.", "Drizzle with **balsamic glaze** just before serving." ], batchTip: "Keeps 2 days chilled - hold back the basil and glaze until you serve.", substitutionTip: "Dairy-free? Swap mozzarella for diced avocado or marinated white beans." },
  {
    id: "l16", name: "Lentil & Sweet Potato Curry Wrap", cuisine: "Asian", mealType: "lunch",
    prepTime: 15, cookTime: 20, difficulty: "easy",
    phases: ["menstrual", "luteal"], goal: ["maintain", "lose"],
    dietTags: ["vegan"], allergens: [],
    servings: 2,
    equipment: ["Small pot", "Frying pan"],
    macros: { calories: 410, protein: 15, carbs: 60, fat: 12 },
    micros: { iron: 5, fibre: 13, magnesium: 60 },
    ingredients: [
      { name: "Red lentils", quantity: "1/2 cup, rinsed" },
      { name: "Sweet potato", quantity: "1 small, 1cm dice" },
      { name: "Onion", quantity: "1/2, finely chopped" },
      { name: "Garlic & ginger", quantity: "1 clove + thumb, grated" },
      { name: "Curry powder", quantity: "1 tsp" },
      { name: "Coconut milk", quantity: "1/4 cup" },
      { name: "Whole-wheat wraps", quantity: "2" },
      { name: "Baby spinach", quantity: "1 handful" },
      { name: "Oil, salt", quantity: "to cook" }
    ],
    steps: [
      "Soften **onion** in a little **oil** for 3 min, then stir in **garlic & ginger** and **curry powder** until fragrant, about 1 min.",
      "Add **red lentils**, **sweet potato**, **coconut milk** and 3/4 cup water. Simmer covered 15-18 min until the lentils collapse and the potato is tender; season with **salt** and mash slightly for a thick, scoopable filling.",
      "Warm the **wraps**, lay down **baby spinach**, spoon on the curry, then fold in the sides and roll tight."
    ],
    batchTip: "The curry filling keeps 4 days chilled and freezes well - fill wraps fresh so they don't go soggy.",
    substitutionTip: "No sweet potato? Butternut squash or carrot dice work just as well."
  },
  {
    id: "l17", name: "Tuna Niçoise Salad", cuisine: "Mediterranean", mealType: "lunch",
    prepTime: 15, cookTime: 10, difficulty: "easy",
    phases: ["luteal", "ovulatory"], goal: ["lose", "gain"],
    dietTags: ["pescatarian", "gluten-free"], allergens: ["eggs"],
    servings: 1,
    equipment: ["Small pot"],
    macros: { calories: 400, protein: 32, carbs: 22, fat: 20 },
    micros: { omega3: 1.2, vitaminC: 16, fibre: 5 },
    ingredients: [
      { name: "Canned tuna", quantity: "120g, drained" },
      { name: "Egg", quantity: "1" },
      { name: "Green beans", quantity: "1 cup, trimmed" },
      { name: "Baby potatoes", quantity: "4 small" },
      { name: "Cherry tomatoes", quantity: "1/2 cup, halved" },
      { name: "Black olives", quantity: "8" },
      { name: "Vinaigrette", quantity: "2 tbsp - tap in steps to make it" }
    ],
    steps: [
      "Boil the **baby potatoes** 12 min; add the **egg** for the last 8 min and the **green beans** for the last 3, so everything finishes together. Cool the egg under cold water and peel.",
      "Quarter the potatoes and egg. Arrange over a plate with the beans, **cherry tomatoes**, **black olives** and flakes of **tuna**.",
      "Spoon over [[vinaigrette]] and finish with cracked pepper."
    ],
    batchTip: "Boil potatoes, beans and egg the night before; assemble cold in 5 min at lunch.",
    substitutionTip: "Swap tuna for cold poached salmon or white beans to keep it vegetarian."
  },
  {
    id: "l18", name: "Black Bean Quesadilla", cuisine: "Latin", mealType: "lunch",
    prepTime: 10, cookTime: 10, difficulty: "quick",
    phases: ["follicular", "menstrual"], goal: ["maintain", "gain"],
    dietTags: ["vegetarian"], allergens: ["dairy"],
    servings: 1,
    equipment: ["Non-stick pan"],
    macros: { calories: 440, protein: 20, carbs: 46, fat: 18 },
    micros: { fibre: 10, iron: 3, calcium: 140 },
    ingredients: [
      { name: "Flour tortillas", quantity: "2" },
      { name: "Black beans", quantity: "1 cup, drained" },
      { name: "Cheddar", quantity: "50g, grated" },
      { name: "Bell pepper", quantity: "1/2, finely diced" },
      { name: "Cumin", quantity: "1/2 tsp" },
      { name: "Salsa", quantity: "2 tbsp - tap in steps to make it" }
    ],
    steps: [
      "Roughly mash **black beans** with **cumin** and a pinch of salt so they still have texture.",
      "Spread the beans over one **tortilla**, scatter with **bell pepper** and **cheddar**, then top with the second tortilla.",
      "Dry-fry in a **non-stick pan** over medium heat 2-3 min a side, pressing gently, until golden and the cheese melts. Cut into wedges and serve with [[salsa]]."
    ],
    batchTip: "Assemble and wrap uncooked; refrigerate up to a day, then pan-fry to order.",
    substitutionTip: "Dairy-free? Use a plant-based cheese or skip it and add extra mashed avocado to bind."
  },

  // ───────── Batch 2 — Dinner (+6) ─────────
  {
    id: "d13", name: "Vegan Mushroom Risotto", cuisine: "Mediterranean", mealType: "dinner",
    prepTime: 15, cookTime: 30, difficulty: "medium",
    phases: ["luteal", "menstrual"], goal: ["maintain", "lose"],
    dietTags: ["vegan", "gluten-free"], allergens: [],
    macros: { calories: 420, protein: 11, carbs: 64, fat: 12 },
    micros: { magnesium: 50, fibre: 5, vitaminB6: 0.3 },
    servings: 2,
    equipment: ["Wide pan", "Small pot"],
    ingredients: [
      { name: "Arborio rice", quantity: "1 cup" },
      { name: "Mushrooms", quantity: "2 cups, sliced" },
      { name: "Onion & garlic", quantity: "1/2 + 2 cloves" },
      { name: "White wine", quantity: "1/4 cup (optional)" },
      { name: "Vegetable broth", quantity: "3.5 cups, warm" },
      { name: "Nutritional yeast", quantity: "2 tbsp" },
      { name: "Olive oil", quantity: "1 tbsp" }
    ],
    steps: [
      "Sauté the **mushrooms** in **olive oil** until deeply golden, then set half aside for the top.",
      "Soften the **onion & garlic**, stir in the **arborio rice** and toast 1 min, then deglaze with the **white wine**.",
      "Add the warm **vegetable broth** a ladle at a time, stirring, until each is absorbed - about 18-20 min to creamy and al dente.",
      "Beat in **nutritional yeast** off the heat, then crown with the reserved mushrooms."
    ],
    batchTip: "Risotto is best fresh; leftovers make excellent pan-fried rice cakes the next day.",
    substitutionTip: "Skip the wine and add an extra splash of broth with a squeeze of lemon."
  },
  {
    id: "d14", name: "Halal Lamb Kofta with Couscous", cuisine: "Middle Eastern", mealType: "dinner",
    prepTime: 20, cookTime: 20, difficulty: "easy",
    phases: ["menstrual", "luteal"], goal: ["gain"],
    dietTags: ["halal"], allergens: ["dairy"],
    macros: { calories: 540, protein: 34, carbs: 40, fat: 24 },
    micros: { iron: 5, magnesium: 55, vitaminC: 14 },
    servings: 2,
    equipment: ["Grill pan", "Mixing bowl"],
    ingredients: [
      { name: "Ground lamb", quantity: "200g" },
      { name: "Onion", quantity: "1/4, grated" },
      { name: "Cumin & coriander", quantity: "1 tsp each" },
      { name: "Garlic", quantity: "1 clove, grated" },
      { name: "Couscous", quantity: "1/2 cup dry" },
      { name: "Tomato & cucumber", quantity: "1 cup, diced" },
      { name: "Greek yoghurt", quantity: "1/4 cup" },
      { name: "Mint", quantity: "2 tbsp, chopped" }
    ],
    steps: [
      "Mix **ground lamb** with **grated onion**, **garlic** and **cumin & coriander**, then shape around skewers into 4 koftas.",
      "Grill the koftas on a hot **grill pan** 4-5 min a side until charred and cooked through.",
      "Pour boiling water over the **couscous**, cover 5 min, then fluff; toss the **tomato & cucumber** into a quick salad.",
      "Stir **mint** through the **greek yoghurt** for a [[mint yoghurt]] and serve alongside the kofta and couscous."
    ],
    batchTip: "Shape the koftas ahead - they hold 2 days raw in the fridge or freeze for a month.",
    substitutionTip: "Dairy-free? A coconut yoghurt with mint keeps the cooling sauce without the dairy."
  },
  {
    id: "d15", name: "Baked Cod with Roasted Veg", cuisine: "Nordic", mealType: "dinner",
    prepTime: 10, cookTime: 25, difficulty: "easy",
    servings: 2,
    equipment: ["Baking tray"],
    phases: ["follicular", "ovulatory"], goal: ["lose", "maintain"],
    dietTags: ["pescatarian", "gluten-free"], allergens: [],
    macros: { calories: 380, protein: 34, carbs: 26, fat: 12 },
    micros: { omega3: 1.0, vitaminD: 250, vitaminC: 24 },
    ingredients: [
      { name: "Cod fillet", quantity: "2 x 180g" },
      { name: "Zucchini", quantity: "1, in half-moons" },
      { name: "Bell pepper", quantity: "1, in chunks" },
      { name: "Cherry tomatoes", quantity: "1 cup" },
      { name: "Olive oil", quantity: "2 tbsp" },
      { name: "Lemon", quantity: "1/2, plus wedges" },
      { name: "Garlic, dill & flaky salt", quantity: "2 cloves / to taste" }
    ],
    steps: [
      "Heat oven to 200°C. Toss **zucchini**, **bell pepper** and **cherry tomatoes** with **olive oil**, crushed **garlic** and salt on a tray; roast 15 min until edges catch.",
      "Push veg aside, nestle in the **cod fillet**, squeeze over **lemon** and season. Bake 10 min more until the fish flakes at a gentle press.",
      "Scatter with **dill** and serve with lemon wedges and the roasting juices spooned over."
    ],
    batchTip: "Roast a double tray of veg - the leftovers reheat into tomorrow's grain bowl.",
    substitutionTip: "No cod? Any firm white fish (haddock, pollock) or a thick salmon fillet works the same way."
  },
  {
    id: "d16", name: "Thai Green Curry with Tofu", cuisine: "Asian", mealType: "dinner",
    prepTime: 15, cookTime: 20, difficulty: "easy",
    servings: 2,
    equipment: ["Non-stick pan", "Small pot"],
    phases: ["ovulatory", "follicular"], goal: ["lose", "gain"],
    dietTags: ["vegan", "gluten-free"], allergens: ["soy"],
    macros: { calories: 450, protein: 18, carbs: 42, fat: 24 },
    micros: { iron: 3, fibre: 6, vitaminC: 18 },
    ingredients: [
      { name: "Firm tofu", quantity: "200g, pressed & cubed" },
      { name: "Green curry paste", quantity: "2 tbsp" },
      { name: "Coconut milk", quantity: "1 cup" },
      { name: "Mixed vegetables", quantity: "2 cups (green beans, pepper, broccoli)" },
      { name: "Jasmine rice", quantity: "1 cup uncooked" },
      { name: "Lime, soy sauce & Thai basil", quantity: "1 / 1 tbsp / a handful" },
      { name: "Oil", quantity: "1 tbsp" }
    ],
    steps: [
      "Cook the **jasmine rice**. Meanwhile pat the **tofu** very dry and pan-fry in **oil** over medium-high until golden on all sides; set aside.",
      "In the same pan fry the **green curry paste** 1 min until fragrant, then pour in the **coconut milk** and bring to a gentle simmer.",
      "Add the **mixed vegetables** and cook 6-8 min until just tender. Return the tofu, season with **soy sauce** and a squeeze of **lime**.",
      "Tear in **Thai basil** and serve over the rice."
    ],
    batchTip: "The curry base keeps 3 days chilled and tastes better on day two - add fresh tofu when reheating.",
    substitutionTip: "Soy-free? Swap tofu for chickpeas and use coconut aminos in place of soy sauce."
  },
  {
    id: "d17", name: "Turkey Meatballs in Tomato Sauce", cuisine: "Mediterranean", mealType: "dinner",
    prepTime: 15, cookTime: 25, difficulty: "easy",
    servings: 2,
    equipment: ["Mixing bowl", "Deep frying pan"],
    phases: ["luteal", "menstrual"], goal: ["lose", "maintain"],
    dietTags: ["gluten-free"], allergens: ["eggs", "dairy"],
    macros: { calories: 410, protein: 36, carbs: 26, fat: 16 },
    micros: { iron: 4, vitaminC: 20, fibre: 5 },
    ingredients: [
      { name: "Ground turkey", quantity: "250g" },
      { name: "Egg", quantity: "1" },
      { name: "Parmesan", quantity: "2 tbsp, grated" },
      { name: "Garlic & dried oregano", quantity: "2 cloves / 1 tsp" },
      { name: "Canned tomatoes", quantity: "1.5 cups (passata or crushed)" },
      { name: "Onion", quantity: "1/2, finely diced" },
      { name: "Fresh basil", quantity: "a handful" },
      { name: "Olive oil", quantity: "1 tbsp" }
    ],
    steps: [
      "Mix **ground turkey** with the **egg**, **parmesan**, half the **garlic**, **oregano** and salt. Roll into ~12 walnut-sized meatballs.",
      "Brown the meatballs in **olive oil** over medium heat, turning until coloured all over, about 5 min; lift out.",
      "Soften the **onion** and remaining garlic in the pan, pour in the **canned tomatoes** and simmer 5 min.",
      "Return the meatballs, cover and simmer 15 min until cooked through. Finish with torn **basil**."
    ],
    batchTip: "Meatballs freeze raw or cooked - simmer straight from frozen, adding 8-10 min.",
    substitutionTip: "Egg-free? Bind with 1 tbsp ground flax soaked in 3 tbsp water; dairy-free, skip the parmesan and season with extra salt."
  },
  {
    id: "d18", name: "Stuffed Sweet Potatoes with Black Beans", cuisine: "Latin", mealType: "dinner",
    prepTime: 10, cookTime: 35, difficulty: "easy",
    servings: 2,
    equipment: ["Baking tray", "Small pot"],
    phases: ["follicular", "ovulatory"], goal: ["lose", "maintain"],
    dietTags: ["vegan", "gluten-free"], allergens: [],
    macros: { calories: 390, protein: 13, carbs: 66, fat: 9 },
    micros: { fibre: 14, magnesium: 70, vitaminC: 22 },
    ingredients: [
      { name: "Sweet potatoes", quantity: "2 medium" },
      { name: "Black beans", quantity: "1 cup, drained" },
      { name: "Corn", quantity: "1/2 cup" },
      { name: "Cumin & smoked paprika", quantity: "1/2 tsp each" },
      { name: "Lime & cilantro", quantity: "1 / a handful" },
      { name: "Avocado", quantity: "1/2, sliced" }
    ],
    steps: [
      "Heat oven to 200°C. Prick the **sweet potatoes**, set on a tray and bake 30-35 min until a knife slides through easily.",
      "Warm the **black beans** and **corn** in a pot with **cumin**, **smoked paprika**, a splash of water and a squeeze of **lime** until hot.",
      "Split the potatoes down the middle and fluff the flesh. Pile in the beans and corn, top with **avocado**, cilantro and more lime.",
      "Finish with a spoonful of [[guacamole]] if you have a ripe avocado to spare."
    ],
    batchTip: "Bake the potatoes ahead - they keep 3 days and reheat in 10 min, or microwave to soften in a hurry.",
    substitutionTip: "Short on time? Microwave the potatoes 8-10 min instead of baking; pinto beans swap in for black."
  },

  // ───────── Batch 2 — Snacks (+5) ─────────
  {
    id: "s07", name: "Apple & Almond Butter Slices", cuisine: "Global", mealType: "snack",
    prepTime: 5, cookTime: 0, difficulty: "quick",
    servings: 1,
    equipment: [],
    phases: ["follicular", "ovulatory"], goal: ["lose", "maintain"],
    dietTags: ["vegan", "gluten-free"], allergens: ["nuts"],
    macros: { calories: 200, protein: 5, carbs: 26, fat: 9 },
    micros: { fibre: 5, magnesium: 30 },
    ingredients: [
      { name: "Apple", quantity: "1" },
      { name: "Almond butter", quantity: "1 tbsp" },
      { name: "Cinnamon", quantity: "1 pinch" }
    ],
    steps: [
      "Core the **apple** and cut into thin wedges.",
      "Spread each wedge with a little **almond butter** or use it as a dip.",
      "Dust with **cinnamon** for warmth."
    ],
    batchTip: "Slicing ahead? Toss wedges in a little lemon water to stop them browning.",
    substitutionTip: "Nut-free? Use sunflower seed butter; pear works just as well as apple."
  },
  {
    id: "s08", name: "Cottage Cheese & Pineapple", cuisine: "Global", mealType: "snack",
    prepTime: 5, cookTime: 0, difficulty: "quick",
    servings: 1,
    equipment: [],
    phases: ["ovulatory", "follicular"], goal: ["lose", "maintain"],
    dietTags: ["vegetarian", "gluten-free"], allergens: ["dairy"],
    macros: { calories: 170, protein: 18, carbs: 16, fat: 4 },
    micros: { calcium: 120, vitaminC: 20 },
    ingredients: [
      { name: "Cottage cheese", quantity: "150 g" },
      { name: "Pineapple", quantity: "1/2 cup, chunks" },
      { name: "Black pepper", quantity: "a crack (optional)" }
    ],
    steps: [
      "Spoon the **cottage cheese** into a bowl.",
      "Top with **pineapple** chunks, spooning a little of their juice over.",
      "Finish with a crack of **black pepper** to play off the sweetness."
    ],
    batchTip: "Portion cottage cheese into small tubs and add fruit fresh each day.",
    substitutionTip: "Dairy-free? Use plant-based cottage cheese; mango or peach swap in for pineapple."
  },
  {
    id: "s09", name: "Edamame with Sea Salt", cuisine: "Asian", mealType: "snack",
    prepTime: 5, cookTime: 5, difficulty: "quick",
    servings: 1,
    equipment: ["Small pot"],
    phases: ["menstrual", "luteal"], goal: ["lose", "maintain"],
    dietTags: ["vegan", "gluten-free"], allergens: ["soy"],
    macros: { calories: 150, protein: 13, carbs: 11, fat: 6 },
    micros: { iron: 2, magnesium: 50, fibre: 5 },
    ingredients: [
      { name: "Frozen edamame in pods", quantity: "1 cup" },
      { name: "Flaky sea salt", quantity: "to taste" }
    ],
    steps: [
      "Drop the **frozen edamame** into a pot of boiling salted water.",
      "Boil for 4-5 min until the pods are bright green and tender.",
      "Drain, tip into a bowl and toss while hot with **flaky sea salt**; squeeze the beans straight from the pods."
    ],
    batchTip: "Cook a big batch, cool, and keep in the fridge to eat cold as a protein-rich grab snack.",
    substitutionTip: "Add a shake of chilli flakes or a splash of soy for a spicier, saltier hit."
  },
  {
    id: "s10", name: "Trail Mix Cup", cuisine: "Global", mealType: "snack",
    prepTime: 5, cookTime: 0, difficulty: "quick",
    servings: 1,
    equipment: [],
    phases: ["luteal", "menstrual"], goal: ["gain", "maintain"],
    dietTags: ["vegan", "gluten-free"], allergens: ["nuts"],
    macros: { calories: 240, protein: 6, carbs: 22, fat: 15 },
    micros: { magnesium: 55, iron: 2, fibre: 4 },
    ingredients: [
      { name: "Mixed nuts", quantity: "2 tbsp" },
      { name: "Dried cranberries", quantity: "1 tbsp" },
      { name: "Dark chocolate chips", quantity: "1 tbsp" },
      { name: "Pumpkin seeds", quantity: "1 tbsp" }
    ],
    steps: [
      "Tip the **mixed nuts**, **dried cranberries**, **dark chocolate chips** and **pumpkin seeds** into a small cup.",
      "Toss to distribute, then eat by the handful."
    ],
    batchTip: "Scale up and portion into small jars so each serving stays controlled.",
    substitutionTip: "Nut-free? Swap nuts for extra seeds and toasted coconut flakes."
  },
  {
    id: "s11", name: "Cucumber Tzatziki Bites", cuisine: "Mediterranean", mealType: "snack",
    prepTime: 10, cookTime: 0, difficulty: "quick",
    servings: 1,
    equipment: [],
    phases: ["ovulatory", "follicular"], goal: ["lose"],
    dietTags: ["vegetarian", "gluten-free"], allergens: ["dairy"],
    macros: { calories: 120, protein: 6, carbs: 8, fat: 7 },
    micros: { calcium: 60, vitaminC: 6 },
    ingredients: [
      { name: "Cucumber", quantity: "1" },
      { name: "Tzatziki", quantity: "1/3 cup - tap in steps to make it" },
      { name: "Fresh dill", quantity: "to garnish" }
    ],
    steps: [
      "Slice the **cucumber** into thick rounds so each holds a topping.",
      "Spoon a little [[tzatziki]] onto every round.",
      "Finish with a frond of **fresh dill** and a grind of pepper."
    ],
    batchTip: "Make the tzatziki up to 2 days ahead; assemble the bites just before serving so they stay crisp.",
    substitutionTip: "Dairy-free? Use coconut yoghurt in the tzatziki; endive leaves work in place of cucumber."
  },

  // ───────── Batch 2 — Lunchbox (+3) ─────────
  {
    id: "lb01", name: "Veggie Wrap Pinwheels", cuisine: "Mediterranean", mealType: "lunchbox",
    prepTime: 10, cookTime: 0, difficulty: "easy",
    phases: ["menstrual", "follicular", "ovulatory", "luteal"], goal: ["maintain"],
    dietTags: ["vegetarian"], allergens: ["dairy"],
    macros: { calories: 260, protein: 9, carbs: 30, fat: 11 },
    micros: { fibre: 4, vitaminC: 14 },
    servings: 1,
    equipment: ["Box grater", "Sharp knife"],
    ingredients: [
      { name: "Large tortilla", quantity: "1" },
      { name: "Cream cheese", quantity: "2 tbsp, softened" },
      { name: "Baby spinach", quantity: "1/2 cup" },
      { name: "Carrot", quantity: "1 small" },
      { name: "Red bell pepper", quantity: "1/2" },
    ],
    steps: [
      "Grate the **carrot** and cut the **red bell pepper** into thin matchsticks; pat both dry so the pinwheels don't turn soggy.",
      "Spread the **cream cheese** right to the edges of the **tortilla**, then blanket with **baby spinach**, carrot and pepper, leaving a 2 cm border.",
      "Roll up tightly from one edge, wrap in the same paper you'll pack it in, and chill 10 min so it sets before slicing into 6 pinwheels.",
    ],
    conservation: { fridgeDays: 1, freezerWeeks: 0, sameDay: true, container: "Lunchbox container" },
    packable: true, noReheat: true,
    batchTip: "Roll the log the night before and keep whole; slice in the morning for the cleanest spirals.",
    substitutionTip: "Use dairy-free cream cheese or [[hummus]] as the spread for a vegan box.",
  },
  {
    id: "lb02", name: "Turkey & Cheese Roll-ups", cuisine: "Global", mealType: "lunchbox",
    prepTime: 8, cookTime: 0, difficulty: "quick",
    phases: ["menstrual", "follicular", "ovulatory", "luteal"], goal: ["maintain", "gain"],
    dietTags: ["gluten-free"], allergens: ["dairy"],
    macros: { calories: 220, protein: 20, carbs: 4, fat: 14 },
    micros: { calcium: 100, iron: 1 },
    servings: 1,
    equipment: ["Sharp knife"],
    ingredients: [
      { name: "Turkey breast slices", quantity: "100 g (about 4 slices)" },
      { name: "Cheddar", quantity: "30 g" },
      { name: "Cucumber", quantity: "1/2" },
      { name: "Wholegrain mustard", quantity: "1 tsp (optional)" },
    ],
    steps: [
      "Cut the **cheddar** into batons and the **cucumber** into sticks the same length.",
      "Lay out each **turkey breast slice**, brush with a little **wholegrain mustard**, set a cheese baton at one edge and roll up snugly.",
      "Pack the roll-ups seam-side down next to the cucumber sticks so they hold their shape.",
    ],
    conservation: { fridgeDays: 2, freezerWeeks: 0, sameDay: true, container: "Lunchbox container" },
    packable: true, noReheat: true,
    batchTip: "Roll a batch and store seam-down in an airtight box for up to 2 days.",
    substitutionTip: "Swap turkey for sliced chicken or ham; use a plant-based slice for dairy-free.",
  },
  {
    id: "lb03", name: "Fruit & Yogurt Parfait Cup", cuisine: "Global", mealType: "lunchbox",
    prepTime: 5, cookTime: 0, difficulty: "quick",
    phases: ["menstrual", "follicular", "ovulatory", "luteal"], goal: ["lose", "maintain"],
    dietTags: ["vegetarian", "gluten-free"], allergens: ["dairy"],
    macros: { calories: 210, protein: 12, carbs: 30, fat: 5 },
    micros: { calcium: 150, vitaminC: 16, fibre: 3 },
    servings: 1,
    equipment: ["Small lidded jar"],
    ingredients: [
      { name: "Greek yoghurt", quantity: "1/2 cup" },
      { name: "Honey or maple", quantity: "1 tsp" },
      { name: "Granola", quantity: "2 tbsp" },
      { name: "Mixed berries", quantity: "1/2 cup" },
    ],
    steps: [
      "Stir the **honey or maple** through the **Greek yoghurt**, then spoon half into a small jar.",
      "Add a layer of **mixed berries**, the rest of the yoghurt, and finish with the remaining berries.",
      "Keep the **granola** in a twist of paper on top or a separate pot and scatter it on just before eating so it stays crunchy.",
    ],
    conservation: { fridgeDays: 1, freezerWeeks: 0, sameDay: true, container: "Small jar" },
    packable: true, noReheat: true,
    batchTip: "Layer the yoghurt and fruit jars the night before; add granola only at eating time.",
    substitutionTip: "Use coconut or soy yoghurt for a dairy-free cup.",
  },

  // ───────── Batch 3 — Breakfast (+5) ─────────
  {
    id: "b17", name: "Smoked Mackerel Rye Toast", cuisine: "Nordic", mealType: "breakfast",
    prepTime: 8, cookTime: 0, difficulty: "quick",
    phases: ["menstrual", "luteal"], goal: ["maintain", "lose"],
    dietTags: ["pescatarian"], allergens: ["dairy"],
    macros: { calories: 350, protein: 24, carbs: 28, fat: 16 },
    micros: { iron: 3, omega3: 1.6, fibre: 5 },
    servings: 1,
    equipment: ["Toaster"],
    ingredients: [
      { name: "Rye bread", quantity: "2 slices" },
      { name: "Cream cheese", quantity: "1 tbsp" },
      { name: "Smoked mackerel", quantity: "80 g, skin removed" },
      { name: "Radish", quantity: "3, thinly sliced" },
      { name: "Lemon", quantity: "1/4, for squeezing" },
      { name: "Fresh dill", quantity: "1 tsp, chopped" },
      { name: "Black pepper", quantity: "to taste" }
    ],
    steps: [
      "Toast the **rye bread** until crisp, then spread each slice with **cream cheese**.",
      "Flake the **smoked mackerel** into large chunks, discarding any bones, and pile onto the toast.",
      "Top with **radish** slices, a squeeze of **lemon**, a scatter of **dill** and a grind of **black pepper**."
    ],
    batchTip: "Smoked mackerel keeps sealed in the fridge for days - a reliable protein to have on hand for fast breakfasts.",
    substitutionTip: "No mackerel? Hot-smoked salmon or canned sardines slot right in. Use dairy-free cream cheese to skip the dairy."
  },
  {
    id: "b18", name: "Chickpea Pancakes (Socca)", cuisine: "Mediterranean", mealType: "breakfast",
    prepTime: 10, cookTime: 12, difficulty: "easy",
    phases: ["follicular", "ovulatory"], goal: ["lose", "maintain"],
    dietTags: ["vegan", "gluten-free"], allergens: [],
    macros: { calories: 280, protein: 12, carbs: 34, fat: 10 },
    micros: { iron: 3, fibre: 6, vitaminB6: 0.3 },
    servings: 2,
    equipment: ["Mixing bowl", "Non-stick pan"],
    ingredients: [
      { name: "Chickpea flour", quantity: "1 cup" },
      { name: "Water", quantity: "1 cup" },
      { name: "Olive oil", quantity: "1 tbsp, plus more for the pan" },
      { name: "Salt", quantity: "1/2 tsp" },
      { name: "Rosemary", quantity: "1 tsp, chopped" },
      { name: "Cherry tomatoes", quantity: "1/2 cup, halved" }
    ],
    steps: [
      "Whisk **chickpea flour** with the **water**, **olive oil** and **salt** into a smooth batter, then rest it 10 min so the flour hydrates.",
      "Heat a little oil in a non-stick pan over medium-high, pour in a ladle of batter and swirl thin. Cook 3 min until the edges lift and the base is golden, then flip for 1 min more.",
      "Scatter over **rosemary** and **cherry tomatoes**, fold or serve flat. Repeat with the rest of the batter."
    ],
    batchTip: "The batter keeps 2 days in the fridge - whisk before using as the flour settles.",
    substitutionTip: "No rosemary? Thyme or a pinch of cumin both work; add a handful of spinach for extra greens."
  },
  {
    id: "b19", name: "Turkey Sausage Breakfast Bowl", cuisine: "Global", mealType: "breakfast",
    prepTime: 10, cookTime: 15, difficulty: "easy",
    phases: ["menstrual", "luteal"], goal: ["gain", "maintain"],
    dietTags: ["halal", "gluten-free"], allergens: ["eggs"],
    macros: { calories: 410, protein: 30, carbs: 26, fat: 20 },
    micros: { iron: 4, vitaminC: 18, fibre: 5 },
    servings: 1,
    equipment: ["Frying pan"],
    ingredients: [
      { name: "Turkey breakfast sausages", quantity: "2" },
      { name: "Sweet potato", quantity: "1 cup, diced small" },
      { name: "Spinach", quantity: "1 cup" },
      { name: "Egg", quantity: "1" },
      { name: "Olive oil", quantity: "1 tbsp" },
      { name: "Smoked paprika", quantity: "1/2 tsp" }
    ],
    steps: [
      "Fry the **turkey sausages** in a dry pan over medium heat, turning, until browned and cooked through - about 8 min. Set aside and slice.",
      "Add the **olive oil** and **sweet potato** to the pan, sprinkle with **smoked paprika**, cover and cook 8 min until tender and crisped.",
      "Push the hash aside, wilt the **spinach** for 1 min, then fry the **egg** in a clear spot until the white sets.",
      "Pile it all into a bowl, sliced sausage on top of the hash with the egg alongside."
    ],
    batchTip: "Roast a tray of diced sweet potato ahead - it crisps up in the pan in minutes through the week.",
    substitutionTip: "Swap the egg for a spoon of hummus to keep it egg-free, or use chicken sausages."
  },
  {
    id: "b20", name: "Ricotta Toast with Honey & Figs", cuisine: "Mediterranean", mealType: "breakfast",
    prepTime: 5, cookTime: 0, difficulty: "quick",
    phases: ["ovulatory", "follicular"], goal: ["maintain", "gain"],
    dietTags: ["vegetarian"], allergens: ["dairy", "nuts"],
    macros: { calories: 300, protein: 12, carbs: 38, fat: 11 },
    micros: { calcium: 140, fibre: 4 },
    servings: 1,
    equipment: ["Toaster"],
    ingredients: [
      { name: "Sourdough bread", quantity: "1 thick slice" },
      { name: "Ricotta", quantity: "1/3 cup" },
      { name: "Figs", quantity: "2, sliced" },
      { name: "Honey", quantity: "1 tsp" },
      { name: "Walnuts", quantity: "1 tbsp, crushed" },
      { name: "Lemon zest", quantity: "a pinch (optional)" }
    ],
    steps: [
      "Toast the **sourdough** until golden and crisp.",
      "Beat the **ricotta** with a fork until smooth and spread it thickly over the warm toast.",
      "Fan over the **figs**, drizzle with **honey**, scatter **walnuts** and finish with a little **lemon zest**."
    ],
    batchTip: "Whip a small tub of ricotta with a pinch of lemon zest at the start of the week for instant toasts.",
    substitutionTip: "Out of figs? Use sliced pear or fresh berries. Swap in gluten-free bread if needed."
  },
  {
    id: "b21", name: "Buckwheat Crepes with Berries", cuisine: "Global", mealType: "breakfast",
    prepTime: 10, cookTime: 10, difficulty: "easy",
    phases: ["luteal", "menstrual"], goal: ["lose", "maintain"],
    dietTags: ["vegan", "gluten-free"], allergens: [],
    macros: { calories: 290, protein: 8, carbs: 50, fat: 7 },
    micros: { magnesium: 50, fibre: 6, vitaminC: 14 },
    servings: 1,
    equipment: ["Mixing bowl", "Non-stick pan"],
    ingredients: [
      { name: "Buckwheat flour", quantity: "1/2 cup" },
      { name: "Plant milk", quantity: "3/4 cup" },
      { name: "Maple syrup", quantity: "1 tbsp, plus a little extra" },
      { name: "Salt", quantity: "1 pinch" },
      { name: "Oil", quantity: "for the pan" },
      { name: "Mixed berries", quantity: "1/2 cup" }
    ],
    steps: [
      "Whisk **buckwheat flour** with the **plant milk**, 1 tbsp **maple syrup** and a pinch of **salt** into a thin, pourable batter; rest 5 min.",
      "Wipe a non-stick pan with **oil** over medium heat. Pour in a thin ladle, swirl to coat, and cook 1-2 min until the edges lift, then flip for 30 sec.",
      "Fill each warm crepe with **mixed berries**, fold into quarters and finish with a last drizzle of maple syrup."
    ],
    batchTip: "Stack cooked crepes with baking paper between them - they keep 2 days chilled and reheat in a warm pan.",
    substitutionTip: "Any berry works, fresh or frozen (thaw first); swap maple for a mashed ripe banana in the batter."
  },

  // ───────── Batch 3 — Lunch (+6) ─────────
  {
    id: "l19", name: "Falafel Buddha Bowl", cuisine: "Middle Eastern", mealType: "lunch",
    prepTime: 15, cookTime: 15, difficulty: "medium",
    phases: ["follicular", "ovulatory"], goal: ["lose", "maintain"],
    dietTags: ["vegan", "gluten-free"], allergens: [],
    servings: 2,
    equipment: ["Food processor", "Baking tray"],
    macros: { calories: 460, protein: 16, carbs: 54, fat: 20 },
    micros: { iron: 4, fibre: 12, vitaminB6: 0.4 },
    ingredients: [
      { name: "Dried chickpeas", quantity: "150g, soaked overnight" },
      { name: "Onion & garlic", quantity: "1/2 onion + 2 cloves" },
      { name: "Parsley & coriander", quantity: "3/4 cup, packed" },
      { name: "Cumin & ground coriander", quantity: "1 tsp each" },
      { name: "Baking soda", quantity: "1/4 tsp" },
      { name: "Quinoa", quantity: "1 cup cooked" },
      { name: "Cucumber & cherry tomatoes", quantity: "1/2 cup each" },
      { name: "Tahini sauce", quantity: "3 tbsp - tap in steps to make it" },
      { name: "Olive oil, salt", quantity: "to cook" }
    ],
    steps: [
      "Drain the soaked **dried chickpeas** (don't cook them - raw soaked chickpeas are what hold falafel together). Pulse with **onion & garlic**, **parsley & coriander**, **cumin & ground coriander** and salt to a coarse crumb, not a paste.",
      "Mix in **baking soda**, shape into ~10 balls, brush with **olive oil** and bake at 220°C for 18-20 min, turning once, until deep golden.",
      "Spoon **quinoa** into bowls, add **cucumber & cherry tomatoes** and the warm falafel, then drizzle generously with [[tahini sauce]]."
    ],
    batchTip: "Baked falafel freeze well - reheat from frozen in a hot oven for 10 min.",
    substitutionTip: "No time to soak? Use canned chickpeas patted very dry (softer result), or buy quality frozen falafel."
  },
  {
    id: "l20", name: "Shrimp & Avocado Rice Bowl", cuisine: "Asian", mealType: "lunch",
    prepTime: 10, cookTime: 10, difficulty: "easy",
    phases: ["ovulatory", "follicular"], goal: ["lose", "maintain"],
    dietTags: ["pescatarian", "gluten-free"], allergens: ["shellfish"],
    servings: 1,
    equipment: ["Frying pan"],
    macros: { calories: 420, protein: 28, carbs: 44, fat: 14 },
    micros: { iron: 2, vitaminC: 16, fibre: 6 },
    ingredients: [
      { name: "Raw shrimp", quantity: "150g, peeled" },
      { name: "Garlic", quantity: "1 clove, grated" },
      { name: "Brown rice", quantity: "1 cup cooked" },
      { name: "Avocado", quantity: "1/2, sliced" },
      { name: "Edamame", quantity: "1/4 cup, shelled" },
      { name: "Soy-lime dressing", quantity: "1 tbsp - tap in steps to make it" },
      { name: "Sesame oil", quantity: "1 tsp" }
    ],
    steps: [
      "Pat the **raw shrimp** dry and sear in hot **sesame oil** with **garlic** for 1-2 min a side, until pink and just opaque - don't overcook.",
      "Warm the **brown rice** and pile into a bowl with the **edamame** and **avocado**.",
      "Top with the shrimp and spoon over [[soy-lime dressing]]."
    ],
    batchTip: "Cook rice and edamame ahead; sear shrimp fresh - they take just 3 min.",
    substitutionTip: "Shellfish-free? Swap shrimp for cubed firm tofu or seared salmon."
  },
  {
    id: "l21", name: "Beef Kofta Wrap", cuisine: "Middle Eastern", mealType: "lunch",
    prepTime: 15, cookTime: 12, difficulty: "easy",
    phases: ["menstrual", "luteal"], goal: ["gain", "maintain"],
    dietTags: ["halal"], allergens: ["dairy"],
    servings: 1,
    equipment: ["Frying pan"],
    macros: { calories: 480, protein: 32, carbs: 38, fat: 20 },
    micros: { iron: 5, vitaminC: 10, fibre: 4 },
    ingredients: [
      { name: "Ground beef", quantity: "150g" },
      { name: "Onion", quantity: "1/4, finely grated" },
      { name: "Cumin & paprika", quantity: "1 tsp each" },
      { name: "Garlic", quantity: "1 clove, minced" },
      { name: "Flatbread", quantity: "1" },
      { name: "Lettuce & tomato", quantity: "to fill" },
      { name: "Tzatziki", quantity: "2 tbsp - tap in steps to make it" }
    ],
    steps: [
      "Knead **ground beef** with the grated **onion**, **garlic**, **cumin & paprika** and a good pinch of salt, then mould around into 3-4 finger-shaped koftas.",
      "Pan-fry over medium-high heat 10-12 min, turning, until browned all over and cooked through.",
      "Warm the **flatbread**, spread with [[tzatziki]], add **lettuce & tomato** and the koftas, then roll tight."
    ],
    batchTip: "Shape koftas ahead and chill up to a day - they hold together better cooked cold from the fridge.",
    substitutionTip: "Use ground lamb, turkey or a plant mince; dairy-free tzatziki with coconut yoghurt works too."
  },
  {
    id: "l22", name: "Caprese Panini", cuisine: "Mediterranean", mealType: "lunch",
    prepTime: 8, cookTime: 6, difficulty: "quick",
    phases: ["follicular", "ovulatory"], goal: ["maintain"],
    dietTags: ["vegetarian"], allergens: ["dairy"],
    servings: 1,
    equipment: ["Panini press or frying pan"],
    macros: { calories: 410, protein: 18, carbs: 40, fat: 18 },
    micros: { calcium: 200, vitaminC: 12, fibre: 3 },
    ingredients: [
      { name: "Ciabatta roll", quantity: "1, halved" },
      { name: "Mozzarella", quantity: "60g, sliced" },
      { name: "Tomato", quantity: "1, sliced" },
      { name: "Fresh basil", quantity: "small handful" },
      { name: "Olive oil", quantity: "1 tsp" },
      { name: "Balsamic glaze", quantity: "1 tsp" }
    ],
    steps: [
      "Layer **mozzarella**, **tomato** and **fresh basil** inside the **ciabatta roll**; season with salt and pepper.",
      "Brush the outside with **olive oil** and press in a hot panini press (or a pan with a weight on top) 4-6 min until crisp and the cheese melts.",
      "Open, drizzle with **balsamic glaze**, close and slice on the diagonal."
    ],
    batchTip: "Best eaten hot, but you can pre-slice everything and press to order in minutes.",
    substitutionTip: "Dairy-free? Use a firm plant mozzarella and add a smear of pesto for richness."
  },
  {
    id: "l23", name: "Moroccan Couscous Salad", cuisine: "African", mealType: "lunch",
    prepTime: 15, cookTime: 5, difficulty: "easy",
    phases: ["luteal", "menstrual"], goal: ["lose", "maintain"],
    dietTags: ["vegan"], allergens: [],
    servings: 2,
    equipment: ["Bowl", "Kettle"],
    macros: { calories: 390, protein: 11, carbs: 60, fat: 11 },
    micros: { iron: 3, fibre: 8, vitaminC: 20 },
    ingredients: [
      { name: "Couscous", quantity: "3/4 cup dry" },
      { name: "Chickpeas", quantity: "1/2 cup, drained" },
      { name: "Dried apricots", quantity: "1/4 cup, chopped" },
      { name: "Fresh mint & parsley", quantity: "small handful each" },
      { name: "Lemon", quantity: "1/2, juiced" },
      { name: "Olive oil", quantity: "2 tbsp" },
      { name: "Ground cumin", quantity: "1/2 tsp" }
    ],
    steps: [
      "Cover **couscous** with an equal amount of just-boiled water, cap the bowl and leave 5 min, then fluff with a fork.",
      "Whisk **lemon**, **olive oil** and **ground cumin** with salt to a quick dressing.",
      "Fold in **chickpeas**, **dried apricots** and chopped **fresh mint & parsley**, pour over the dressing and toss."
    ],
    batchTip: "Keeps 3 days chilled and the flavour deepens - add the herbs just before serving to stay vivid.",
    substitutionTip: "Gluten-free? Swap couscous for cooked quinoa or millet."
  },
  {
    id: "l24", name: "Chicken Caesar Lettuce Wraps", cuisine: "Global", mealType: "lunch",
    prepTime: 12, cookTime: 10, difficulty: "easy",
    phases: ["follicular", "ovulatory"], goal: ["lose", "gain"],
    dietTags: ["gluten-free"], allergens: ["dairy", "eggs"],
    servings: 1,
    equipment: ["Frying pan"],
    macros: { calories: 380, protein: 34, carbs: 12, fat: 22 },
    micros: { calcium: 90, fibre: 3, vitaminC: 8 },
    ingredients: [
      { name: "Chicken breast", quantity: "150g" },
      { name: "Romaine lettuce", quantity: "4 large leaves" },
      { name: "Parmesan", quantity: "2 tbsp, shaved" },
      { name: "Olive oil", quantity: "1 tsp" },
      { name: "Caesar dressing", quantity: "2 tbsp - tap in steps to make it" }
    ],
    steps: [
      "Season the **chicken breast**, then pan-fry in **olive oil** over medium-high heat 4-5 min a side until golden and cooked through. Rest 2 min, then slice.",
      "Cup the **romaine lettuce** leaves and load with the sliced chicken.",
      "Spoon over [[caesar dressing]] and finish with shaved **parmesan** and black pepper."
    ],
    batchTip: "Cook the chicken ahead and chill - assemble cold wraps in 3 minutes.",
    substitutionTip: "No egg? Use a Greek-yoghurt Caesar; swap chicken for chickpeas to go vegetarian."
  },

  // ───────── Batch 3 — Dinner (+6) ─────────
  {
    id: "d19", name: "Stuffed Bell Peppers with Quinoa", cuisine: "Mediterranean", mealType: "dinner",
    prepTime: 15, cookTime: 35, difficulty: "medium",
    servings: 2,
    equipment: ["Small pot", "Baking dish"],
    phases: ["follicular", "ovulatory"], goal: ["lose", "maintain"],
    dietTags: ["vegan", "gluten-free"], allergens: [],
    macros: { calories: 380, protein: 13, carbs: 56, fat: 11 },
    micros: { iron: 3, fibre: 10, vitaminC: 60 },
    ingredients: [
      { name: "Bell peppers", quantity: "2 large" },
      { name: "Quinoa", quantity: "1/2 cup dry" },
      { name: "Black beans", quantity: "1/2 cup, drained" },
      { name: "Corn", quantity: "1/2 cup" },
      { name: "Canned tomatoes", quantity: "1/2 cup (passata)" },
      { name: "Onion & garlic", quantity: "1/2 / 1 clove" },
      { name: "Cumin & smoked paprika", quantity: "1/2 tsp each" },
      { name: "Olive oil", quantity: "1 tbsp" }
    ],
    steps: [
      "Heat oven to 200°C. Rinse the **quinoa** and simmer in 1 cup water 12-15 min until fluffy.",
      "Soften the **onion** and **garlic** in **olive oil**, stir in **cumin**, **smoked paprika**, **black beans**, **corn** and the cooked quinoa; season well.",
      "Halve the **bell peppers** and scoop out seeds. Pack with the filling and set in a baking dish.",
      "Spoon **canned tomatoes** over each, cover with foil and bake 25 min, then uncover 5 min to finish."
    ],
    batchTip: "Assemble and refrigerate up to a day ahead; add 5 min to the covered bake from cold.",
    substitutionTip: "Swap quinoa for cooked rice or bulgur (not gluten-free); any beans work in place of black."
  },
  {
    id: "d20", name: "Garlic Butter Shrimp Zoodles", cuisine: "Mediterranean", mealType: "dinner",
    prepTime: 10, cookTime: 12, difficulty: "easy",
    servings: 2,
    equipment: ["Large frying pan"],
    phases: ["luteal", "menstrual"], goal: ["lose"],
    dietTags: ["pescatarian", "gluten-free"], allergens: ["shellfish", "dairy"],
    macros: { calories: 340, protein: 30, carbs: 14, fat: 18 },
    micros: { iron: 2, vitaminC: 22, fibre: 4 },
    ingredients: [
      { name: "Shrimp", quantity: "180g, peeled" },
      { name: "Zucchini noodles", quantity: "2 cups (2 zucchini, spiralised)" },
      { name: "Garlic", quantity: "3 cloves, sliced" },
      { name: "Butter", quantity: "1 tbsp" },
      { name: "Olive oil", quantity: "1 tsp" },
      { name: "Lemon", quantity: "1/2" },
      { name: "Chilli flakes & parsley", quantity: "a pinch / a handful" }
    ],
    steps: [
      "Pat the **shrimp** dry and season. Melt the **butter** with **olive oil** over medium heat and soften the **garlic** 30 sec until just golden - don't let it brown.",
      "Add the shrimp and **chilli flakes**; cook 1-2 min a side until pink and opaque, then lift out.",
      "Toss the **zucchini noodles** in the garlic butter 1-2 min only, so they stay springy. Return the shrimp, squeeze over **lemon**.",
      "Scatter with **parsley** and serve straight away, before the zoodles weep."
    ],
    batchTip: "Best fresh, but spiralise the zucchini ahead and store dry on paper towel for up to 2 days.",
    substitutionTip: "Dairy-free? Use olive oil in place of butter; swap shrimp for chicken strips (cook 5-6 min)."
  },
  {
    id: "d21", name: "Chicken Tagine with Apricots", cuisine: "African", mealType: "dinner",
    prepTime: 15, cookTime: 45, difficulty: "medium",
    servings: 2,
    equipment: ["Tagine or deep pan with lid"],
    phases: ["menstrual", "luteal"], goal: ["gain", "maintain"],
    dietTags: ["halal", "gluten-free"], allergens: [],
    macros: { calories: 480, protein: 38, carbs: 36, fat: 18 },
    micros: { iron: 5, fibre: 6, vitaminC: 14 },
    ingredients: [
      { name: "Chicken thighs", quantity: "300g, bone-in or boneless" },
      { name: "Dried apricots", quantity: "1/3 cup" },
      { name: "Onion", quantity: "1, sliced" },
      { name: "Garlic", quantity: "2 cloves" },
      { name: "Cinnamon & ras el hanout", quantity: "1 tsp each" },
      { name: "Chicken broth", quantity: "1/2 cup" },
      { name: "Olive oil", quantity: "1 tbsp" },
      { name: "Flaked almonds", quantity: "2 tbsp" },
      { name: "Fresh coriander", quantity: "a handful" }
    ],
    steps: [
      "Heat **olive oil** and brown the **chicken thighs** 4-5 min a side until deep golden; set aside.",
      "Soften the **onion** and **garlic** in the pan, then stir in **cinnamon** and **ras el hanout** for 1 min until fragrant.",
      "Return the chicken with the **dried apricots** and **chicken broth**. Cover and simmer gently 35 min until the meat is meltingly tender and the sauce syrupy.",
      "Toast the **flaked almonds** in a dry pan until golden; scatter over with **coriander** to serve."
    ],
    batchTip: "Tagine deepens overnight - make ahead and reheat gently, adding a splash of broth.",
    substitutionTip: "Nut-free? Skip the almonds and top with toasted pumpkin seeds; prunes or dried figs swap for apricots."
  },
  {
    id: "d22", name: "Eggplant Parmesan", cuisine: "Mediterranean", mealType: "dinner",
    prepTime: 20, cookTime: 35, difficulty: "medium",
    servings: 2,
    equipment: ["Frying pan", "Baking dish"],
    phases: ["follicular", "ovulatory"], goal: ["maintain"],
    dietTags: ["vegetarian"], allergens: ["dairy", "eggs"],
    macros: { calories: 420, protein: 19, carbs: 32, fat: 24 },
    micros: { calcium: 250, fibre: 8, vitaminC: 16 },
    ingredients: [
      { name: "Eggplant", quantity: "1 large, in 1cm rounds" },
      { name: "Egg", quantity: "1, beaten" },
      { name: "Breadcrumbs", quantity: "1/2 cup" },
      { name: "Mozzarella", quantity: "80g, torn" },
      { name: "Parmesan", quantity: "3 tbsp, grated" },
      { name: "Canned tomatoes", quantity: "1 cup (passata)" },
      { name: "Garlic & basil", quantity: "1 clove / a handful" },
      { name: "Olive oil", quantity: "2 tbsp" }
    ],
    steps: [
      "Salt the **eggplant** rounds 10 min and pat dry to draw out bitterness. Dip in **egg**, coat in **breadcrumbs** mixed with half the **parmesan**.",
      "Fry in **olive oil** over medium heat until golden both sides, about 2 min a side; drain on paper.",
      "Warm the **canned tomatoes** with crushed **garlic** and a little salt to make a quick [[tomato sauce]].",
      "Heat oven to 190°C. Layer sauce, eggplant, **mozzarella** and remaining parmesan in a dish; repeat. Bake 25 min until bubbling and golden, finish with **basil**."
    ],
    batchTip: "Assemble a day ahead and bake to order - it also freezes well before baking.",
    substitutionTip: "Gluten-free? Use GF breadcrumbs or ground almonds; egg-free, brush eggplant with oil and skip the crumb."
  },
  {
    id: "d23", name: "Red Lentil Curry", cuisine: "Asian", mealType: "dinner",
    prepTime: 10, cookTime: 25, difficulty: "easy",
    servings: 2,
    equipment: ["Medium pot"],
    phases: ["luteal", "menstrual"], goal: ["lose", "maintain"],
    dietTags: ["vegan", "gluten-free"], allergens: [],
    macros: { calories: 390, protein: 17, carbs: 52, fat: 12 },
    micros: { iron: 6, fibre: 12, vitaminB6: 0.5 },
    ingredients: [
      { name: "Red lentils", quantity: "1 cup, rinsed" },
      { name: "Coconut milk", quantity: "1/2 cup" },
      { name: "Curry powder", quantity: "1 tbsp" },
      { name: "Onion, garlic & ginger", quantity: "1/2 / 2 cloves / 1 tbsp grated" },
      { name: "Canned tomatoes", quantity: "1/2 cup" },
      { name: "Spinach", quantity: "2 large handfuls" },
      { name: "Brown rice", quantity: "1/2 cup dry" },
      { name: "Oil & lime", quantity: "1 tbsp / 1/2" }
    ],
    steps: [
      "Cook the **brown rice**. Meanwhile soften the **onion**, **garlic** and **ginger** in **oil**, then toast the **curry powder** 1 min until aromatic.",
      "Add the **red lentils**, **canned tomatoes** and 1.5 cups water; simmer 18-20 min, stirring now and then, until the lentils collapse into a thick dhal.",
      "Stir in the **coconut milk** and wilt in the **spinach**. Brighten with a squeeze of **lime** and season.",
      "Serve over the rice."
    ],
    batchTip: "Dhal thickens as it sits and keeps 4 days - loosen with water when reheating.",
    substitutionTip: "No red lentils? Yellow split peas work but need ~10 min longer; kale swaps for spinach."
  },
  {
    id: "d24", name: "Honey Garlic Salmon with Asparagus", cuisine: "Nordic", mealType: "dinner",
    prepTime: 10, cookTime: 18, difficulty: "easy",
    servings: 2,
    equipment: ["Baking tray"],
    phases: ["ovulatory", "follicular"], goal: ["maintain", "gain"],
    dietTags: ["pescatarian", "gluten-free"], allergens: ["soy"],
    macros: { calories: 440, protein: 34, carbs: 22, fat: 22 },
    micros: { omega3: 1.9, iron: 2, vitaminC: 10 },
    ingredients: [
      { name: "Salmon fillet", quantity: "2 x 180g" },
      { name: "Asparagus", quantity: "1 bunch, trimmed" },
      { name: "Honey", quantity: "1 tbsp" },
      { name: "Garlic", quantity: "2 cloves, grated" },
      { name: "Soy sauce", quantity: "1 tbsp" },
      { name: "Lemon & sesame seeds", quantity: "1/2 / 1 tsp" }
    ],
    steps: [
      "Heat oven to 200°C. Whisk **honey**, **garlic** and **soy sauce** into a glaze and brush half over the **salmon fillet**.",
      "Toss the **asparagus** in a little oil and spread on a tray; set the salmon among the spears.",
      "Roast 12-15 min until the salmon flakes and the glaze caramelises at the edges.",
      "Spoon over the rest of the glaze, squeeze on **lemon** and scatter with **sesame seeds**."
    ],
    batchTip: "Double the glaze and keep in the fridge a week - it doubles as a stir-fry sauce.",
    substitutionTip: "Soy-free? Use coconut aminos or tamari; green beans stand in for asparagus."
  },

  // ───────── Batch 3 — Snacks (+5) ─────────
  {
    id: "s12", name: "Roasted Edamame & Pumpkin Seeds", cuisine: "Asian", mealType: "snack",
    prepTime: 5, cookTime: 15, difficulty: "easy",
    servings: 1,
    equipment: ["Baking tray"],
    phases: ["follicular", "ovulatory"], goal: ["lose", "maintain"],
    dietTags: ["vegan", "gluten-free"], allergens: ["soy"],
    macros: { calories: 180, protein: 11, carbs: 14, fat: 9 },
    micros: { iron: 2, magnesium: 50, fibre: 5 },
    ingredients: [
      { name: "Shelled edamame", quantity: "1/2 cup" },
      { name: "Pumpkin seeds", quantity: "2 tbsp" },
      { name: "Olive oil", quantity: "1 tsp" },
      { name: "Sea salt", quantity: "1 pinch" }
    ],
    steps: [
      "Pat the **shelled edamame** dry, then toss with **pumpkin seeds**, **olive oil** and **sea salt** on a tray.",
      "Roast at 180°C for 12-15 min, shaking once, until golden and popping.",
      "Cool for a few minutes so they crisp before eating."
    ],
    batchTip: "Store cooled in an airtight jar for up to 5 days of crunchy, protein-packed snacking.",
    substitutionTip: "Add soy and chilli before roasting, or swap pumpkin seeds for sunflower seeds."
  },
  {
    id: "s13", name: "Cheese & Whole Grain Crackers", cuisine: "Global", mealType: "snack",
    prepTime: 3, cookTime: 0, difficulty: "quick",
    servings: 1,
    equipment: [],
    phases: ["menstrual", "luteal"], goal: ["maintain", "gain"],
    dietTags: ["vegetarian"], allergens: ["dairy"],
    macros: { calories: 200, protein: 9, carbs: 16, fat: 11 },
    micros: { calcium: 150, fibre: 2 },
    ingredients: [
      { name: "Whole grain crackers", quantity: "6" },
      { name: "Cheddar", quantity: "40 g" },
      { name: "Grapes", quantity: "1/2 cup" }
    ],
    steps: [
      "Slice the **cheddar** into thin slabs that sit flat on a cracker.",
      "Lay each slice over a **whole grain cracker**.",
      "Serve with a small bunch of **grapes** for a sweet, juicy contrast."
    ],
    batchTip: "Pre-slice cheese and pack crackers separately so they don't soften before you eat.",
    substitutionTip: "Dairy-free? Use a plant-based cheese; apple slices work in place of grapes."
  },
  {
    id: "s14", name: "Berry Smoothie Cup", cuisine: "Global", mealType: "snack",
    prepTime: 5, cookTime: 0, difficulty: "quick",
    servings: 1,
    equipment: ["Blender"],
    phases: ["ovulatory", "follicular"], goal: ["lose", "maintain"],
    dietTags: ["vegan", "gluten-free"], allergens: [],
    macros: { calories: 160, protein: 4, carbs: 32, fat: 2 },
    micros: { vitaminC: 40, fibre: 5 },
    ingredients: [
      { name: "Mixed berries", quantity: "1 cup, frozen" },
      { name: "Plant milk", quantity: "1/2 cup" },
      { name: "Maple syrup", quantity: "1 tsp" }
    ],
    steps: [
      "Add the **mixed berries**, **plant milk** and **maple syrup** to a blender.",
      "Blend on high for 30-40 sec until thick and smooth; loosen with a splash more milk if needed.",
      "Pour into a cup and drink cold."
    ],
    batchTip: "Freeze pre-portioned berry bags so you can blend a fresh cup in seconds.",
    substitutionTip: "Add a scoop of protein powder or a spoon of yoghurt to make it more filling."
  },
  {
    id: "s15", name: "Spiced Roasted Chickpeas", cuisine: "Middle Eastern", mealType: "snack",
    prepTime: 5, cookTime: 25, difficulty: "easy",
    servings: 1,
    equipment: ["Baking tray"],
    phases: ["luteal", "menstrual"], goal: ["lose", "maintain"],
    dietTags: ["halal", "vegan", "gluten-free"], allergens: [],
    macros: { calories: 170, protein: 8, carbs: 24, fat: 5 },
    micros: { iron: 2, fibre: 6, vitaminB6: 0.3 },
    ingredients: [
      { name: "Chickpeas", quantity: "1 cup, drained" },
      { name: "Cumin", quantity: "1 tsp" },
      { name: "Paprika", quantity: "1/2 tsp" },
      { name: "Olive oil", quantity: "1 tsp" },
      { name: "Salt", quantity: "to taste" }
    ],
    steps: [
      "Pat the **chickpeas** very dry - this is the secret to crunch.",
      "Toss on a tray with **olive oil**, **cumin**, **paprika** and **salt** until evenly coated.",
      "Roast at 200°C for 20-25 min, shaking halfway, until crisp and deep golden.",
      "Cool on the tray for 5 min before eating."
    ],
    batchTip: "Keep cooled chickpeas in a loosely covered jar; sealing them airtight traps steam and softens the crunch.",
    substitutionTip: "Swap the spice mix for curry powder, harissa or za'atar to change it up."
  },
  {
    id: "s16", name: "Yoghurt & Honey Dip with Apple", cuisine: "Mediterranean", mealType: "snack",
    prepTime: 3, cookTime: 0, difficulty: "quick",
    servings: 1,
    equipment: [],
    phases: ["follicular", "ovulatory"], goal: ["maintain"],
    dietTags: ["vegetarian", "gluten-free"], allergens: ["dairy"],
    macros: { calories: 150, protein: 8, carbs: 22, fat: 3 },
    micros: { calcium: 120, fibre: 3 },
    ingredients: [
      { name: "Greek yoghurt", quantity: "1/2 cup" },
      { name: "Honey", quantity: "1 tsp" },
      { name: "Cinnamon", quantity: "1 pinch" },
      { name: "Apple", quantity: "1, sliced" }
    ],
    steps: [
      "Stir **honey** and **cinnamon** through the **Greek yoghurt** until streaky and glossy.",
      "Slice the **apple** into thin wedges and fan them beside the dip.",
      "Dust with a little extra cinnamon and dip away."
    ],
    batchTip: "Stir the yoghurt dip the night before; slice the apple fresh so it doesn't brown.",
    substitutionTip: "Dairy-free? Use thick coconut yoghurt and swap honey for maple syrup."
  },

  // ───────── Batch 3 — Lunchbox (+4) ─────────
  {
    id: "lb04", name: "Hummus & Veggie Sticks Box", cuisine: "Mediterranean", mealType: "lunchbox",
    prepTime: 8, cookTime: 0, difficulty: "quick",
    phases: ["menstrual", "follicular", "ovulatory", "luteal"], goal: ["maintain", "lose"],
    dietTags: ["vegan", "gluten-free"], allergens: [],
    macros: { calories: 220, protein: 7, carbs: 24, fat: 10 },
    micros: { fibre: 7, vitaminC: 20 },
    servings: 1,
    equipment: ["Sharp knife", "Small dip pot"],
    ingredients: [
      { name: "Hummus", quantity: "1/4 cup - tap in steps to make it" },
      { name: "Carrot", quantity: "1 large" },
      { name: "Cucumber", quantity: "1/2" },
      { name: "Red bell pepper", quantity: "1/2" },
      { name: "Wholegrain crackers", quantity: "4" },
    ],
    steps: [
      "Cut the **carrot**, **cucumber** and **red bell pepper** into even sticks so they pack upright and stay crisp.",
      "Spoon [[hummus]] into a small pot and set it in the centre of the box as the dip.",
      "Stand the veg sticks around the pot and tuck the **wholegrain crackers** in beside them.",
    ],
    conservation: { fridgeDays: 2, freezerWeeks: 0, sameDay: true, container: "Lunchbox container" },
    packable: true, noReheat: true,
    batchTip: "Cut a big tub of veg sticks and store in water in the fridge; portion boxes each morning.",
    substitutionTip: "Swap hummus for guacamole, or use gluten-free crackers to keep it coeliac-friendly.",
  },
  {
    id: "lb05", name: "Cheese & Crackers Lunchbox", cuisine: "Global", mealType: "lunchbox",
    prepTime: 5, cookTime: 0, difficulty: "quick",
    phases: ["menstrual", "follicular", "ovulatory", "luteal"], goal: ["maintain", "gain"],
    dietTags: ["vegetarian"], allergens: ["dairy"],
    macros: { calories: 280, protein: 12, carbs: 26, fat: 14 },
    micros: { calcium: 180, fibre: 3 },
    servings: 1,
    equipment: ["Sharp knife"],
    ingredients: [
      { name: "Cheddar", quantity: "40 g" },
      { name: "Wholegrain crackers", quantity: "6" },
      { name: "Grapes", quantity: "1/2 cup" },
      { name: "Dried apricots", quantity: "2" },
    ],
    steps: [
      "Cut the **cheddar** into neat cubes and halve the **grapes** if packing for a small child.",
      "Fan the **wholegrain crackers** into one compartment so they don't slide under the cheese and soften.",
      "Fill the remaining compartments with cheese cubes, grapes and **dried apricots**.",
    ],
    conservation: { fridgeDays: 2, freezerWeeks: 0, sameDay: true, container: "Lunchbox container" },
    packable: true, noReheat: true,
    batchTip: "Cube a block of cheese for the week and store airtight; assemble boxes in under a minute.",
    substitutionTip: "Use a plant-based cheese and add a few almonds for a dairy-free, protein-rich box.",
  },
  {
    id: "lb06", name: "Chicken & Rice Lunchbox", cuisine: "Asian", mealType: "lunchbox",
    prepTime: 10, cookTime: 0, difficulty: "easy",
    phases: ["menstrual", "follicular", "ovulatory", "luteal"], goal: ["gain", "maintain"],
    dietTags: ["halal", "gluten-free"], allergens: ["soy"],
    macros: { calories: 360, protein: 26, carbs: 40, fat: 9 },
    micros: { iron: 3, fibre: 4, vitaminC: 12 },
    servings: 1,
    equipment: ["Sharp knife", "Small sauce pot"],
    ingredients: [
      { name: "Cooked chicken breast", quantity: "100 g" },
      { name: "Cooked brown rice", quantity: "1 cup" },
      { name: "Edamame", quantity: "1/4 cup, shelled" },
      { name: "Spring onion", quantity: "1" },
      { name: "Soy-ginger sauce", quantity: "1 tbsp - tap in steps to make it" },
    ],
    steps: [
      "Dice the **cooked chicken breast** and thinly slice the **spring onion**.",
      "Spread the **cooked brown rice** as the base, then top with the chicken, **edamame** and spring onion.",
      "Pack [[soy-ginger sauce]] in a small pot and drizzle it over just before eating; best at room temperature or gently warmed.",
    ],
    conservation: { fridgeDays: 2, freezerWeeks: 0, sameDay: true, container: "Lunchbox container" },
    packable: true,
    batchTip: "Cook rice and chicken in bulk on Sunday; portion three boxes and keep sauce separate.",
    substitutionTip: "Use tamari for gluten-free, or swap chicken for tofu to make it vegan.",
  },
  {
    id: "lb07", name: "Mini Quiche & Fruit Box", cuisine: "Mediterranean", mealType: "lunchbox",
    prepTime: 10, cookTime: 0, difficulty: "easy",
    phases: ["menstrual", "follicular", "ovulatory", "luteal"], goal: ["maintain"],
    dietTags: ["vegetarian", "gluten-free"], allergens: ["eggs", "dairy"],
    macros: { calories: 240, protein: 11, carbs: 16, fat: 14 },
    micros: { calcium: 90, vitaminC: 18, fibre: 3 },
    servings: 1,
    equipment: ["Muffin tin", "Oven"],
    ingredients: [
      { name: "Eggs", quantity: "2" },
      { name: "Milk", quantity: "2 tbsp" },
      { name: "Grated cheese", quantity: "20 g" },
      { name: "Baby spinach", quantity: "1/4 cup, chopped" },
      { name: "Cherry tomatoes", quantity: "1/2 cup" },
      { name: "Mixed berries", quantity: "1/2 cup" },
    ],
    steps: [
      "Whisk the **eggs** with the **milk**, then stir in the **grated cheese** and chopped **baby spinach** and season.",
      "Pour into two oiled muffin holes and bake at 180°C for 15-18 min until set and just golden; cool fully before packing.",
      "Box the mini quiches beside the **cherry tomatoes** and **mixed berries**; eat at room temperature or gently reheated.",
    ],
    conservation: { fridgeDays: 2, freezerWeeks: 0, sameDay: true, container: "Lunchbox container" },
    packable: true,
    batchTip: "Bake a full tin of 12 crustless quiches and freeze; they thaw in the lunchbox by midday.",
    substitutionTip: "Use a plant-based milk and dairy-free cheese, or add diced ham for extra protein.",
  },

  // ───────── Batch 4 — Breakfast (+15) ─────────
  {
    id: "b22", name: "Mango Lassi Overnight Oats", cuisine: "Asian", mealType: "breakfast",
    prepTime: 5, cookTime: 0, difficulty: "quick",
    phases: ["follicular", "ovulatory"], goal: ["lose", "maintain"],
    dietTags: ["vegetarian", "gluten-free"], allergens: ["dairy"],
    macros: { calories: 310, protein: 14, carbs: 48, fat: 7 },
    micros: { vitaminC: 30, fibre: 5, calcium: 160 },
    servings: 1,
    equipment: ["Jar or bowl"],
    ingredients: [
      { name: "Rolled oats", quantity: "1/2 cup" },
      { name: "Greek yoghurt", quantity: "1/3 cup" },
      { name: "Milk", quantity: "1/3 cup" },
      { name: "Mango", quantity: "1/2 cup, diced" },
      { name: "Cardamom", quantity: "1 pinch, ground" },
      { name: "Honey", quantity: "1 tsp" }
    ],
    steps: [
      "In a jar, stir the **rolled oats** with the **milk**, half the **Greek yoghurt** and a pinch of **cardamom**.",
      "Mash half the **mango** into a rough puree and swirl it through, then seal and chill overnight.",
      "In the morning top with the remaining yoghurt, the rest of the mango and a drizzle of **honey**."
    ],
    batchTip: "Make 3 jars at once - they hold well for up to 3 days in the fridge.",
    substitutionTip: "Use dairy-free yoghurt and plant milk for a vegan version; frozen mango works and thaws overnight."
  },
  {
    id: "b23", name: "Spinach & Mushroom Omelette", cuisine: "Mediterranean", mealType: "breakfast",
    prepTime: 8, cookTime: 8, difficulty: "quick",
    phases: ["follicular", "ovulatory"], goal: ["lose", "maintain"],
    dietTags: ["vegetarian", "gluten-free"], allergens: ["eggs", "dairy"],
    macros: { calories: 290, protein: 22, carbs: 6, fat: 20 },
    micros: { calcium: 120, iron: 3, vitaminC: 8 },
    servings: 1,
    equipment: ["Non-stick pan", "Bowl"],
    ingredients: [
      { name: "Eggs", quantity: "3" },
      { name: "Mushrooms", quantity: "1/2 cup, sliced" },
      { name: "Baby spinach", quantity: "1 cup" },
      { name: "Feta", quantity: "25 g, crumbled" },
      { name: "Olive oil", quantity: "1 tsp" },
      { name: "Salt & pepper", quantity: "to taste" }
    ],
    steps: [
      "Whisk the **eggs** with a pinch of **salt & pepper** until just combined.",
      "Sauté the **mushrooms** in **olive oil** over medium-high heat until golden, 3 min, then add the **baby spinach** and toss until wilted. Tip onto a plate.",
      "Pour the eggs into the pan, swirl, and cook 1-2 min until the base sets but the top is still glossy.",
      "Spoon the mushroom-spinach back over one half, scatter with **feta**, fold and slide onto the plate."
    ],
    batchTip: "Cook the mushrooms and spinach the night before so the omelette is a 3-minute job.",
    substitutionTip: "No feta? Grated cheddar or a spoon of ricotta work; leave out for dairy-free."
  },
  {
    id: "b24", name: "Sweet Potato & Kale Frittata", cuisine: "Mediterranean", mealType: "breakfast",
    prepTime: 10, cookTime: 20, difficulty: "easy",
    phases: ["luteal", "menstrual"], goal: ["maintain", "gain"],
    dietTags: ["vegetarian", "gluten-free"], allergens: ["eggs", "dairy"],
    macros: { calories: 350, protein: 20, carbs: 28, fat: 18 },
    micros: { iron: 4, vitaminC: 30, fibre: 6 },
    servings: 2,
    equipment: ["Oven-safe pan", "Bowl"],
    ingredients: [
      { name: "Eggs", quantity: "4" },
      { name: "Sweet potato", quantity: "1 cup, diced small" },
      { name: "Kale", quantity: "1 cup, stems removed" },
      { name: "Onion", quantity: "1/2, sliced" },
      { name: "Parmesan", quantity: "2 tbsp, grated" },
      { name: "Olive oil", quantity: "1 tbsp" },
      { name: "Salt & pepper", quantity: "to taste" }
    ],
    steps: [
      "Heat the oven to 180°C. Sauté the **sweet potato** and **onion** in **olive oil** in an oven-safe pan for 8 min until the potato is tender.",
      "Add the **kale** and toss until just wilted, 2 min.",
      "Whisk the **eggs** with the **parmesan** and **salt & pepper**, pour into the pan and swirl to settle the veg evenly.",
      "Bake 12-15 min until the centre is just set and the top is golden. Cool 2 min, then slice into wedges."
    ],
    batchTip: "Bake ahead and chill - wedges are great cold in a lunchbox and keep 3 days.",
    substitutionTip: "Swap kale for spinach or chard, and parmesan for a hard vegetarian cheese or nutritional yeast."
  },
  {
    id: "b25", name: "Walnut & Date Porridge", cuisine: "Nordic", mealType: "breakfast",
    prepTime: 5, cookTime: 8, difficulty: "quick",
    phases: ["luteal", "menstrual"], goal: ["maintain", "gain"],
    dietTags: ["vegetarian"], allergens: ["nuts", "dairy"],
    macros: { calories: 400, protein: 12, carbs: 52, fat: 18 },
    micros: { magnesium: 80, omega3: 1.2, fibre: 7 },
    servings: 1,
    equipment: ["Small pot"],
    ingredients: [
      { name: "Rolled oats", quantity: "1/2 cup" },
      { name: "Milk", quantity: "1 cup" },
      { name: "Medjool dates", quantity: "3, pitted and chopped" },
      { name: "Cinnamon", quantity: "1/2 tsp" },
      { name: "Walnuts", quantity: "2 tbsp, crushed" },
      { name: "Salt", quantity: "1 pinch" }
    ],
    steps: [
      "Simmer the **rolled oats** in the **milk** with a pinch of **salt** over medium heat, stirring, for 5 min until thick and creamy.",
      "Stir in most of the **dates** and the **cinnamon** and cook 1 min more so the dates melt into the porridge.",
      "Top with the crushed **walnuts** and the reserved dates."
    ],
    batchTip: "Toast a jar of walnuts in advance for a deeper flavour and instant crunch all week.",
    substitutionTip: "Use any plant milk to make it dairy-free; pecans or almonds stand in for walnuts."
  },
  {
    id: "b26", name: "Matcha Chia Pudding", cuisine: "Asian", mealType: "breakfast",
    prepTime: 5, cookTime: 0, difficulty: "quick",
    phases: ["follicular", "ovulatory"], goal: ["lose", "maintain"],
    dietTags: ["vegan", "gluten-free"], allergens: [],
    macros: { calories: 260, protein: 8, carbs: 30, fat: 12 },
    micros: { calcium: 160, fibre: 10, omega3: 1.8 },
    servings: 1,
    equipment: ["Jar", "Small whisk"],
    ingredients: [
      { name: "Coconut milk", quantity: "3/4 cup" },
      { name: "Matcha powder", quantity: "1 tsp" },
      { name: "Maple syrup", quantity: "1 tsp" },
      { name: "Chia seeds", quantity: "3 tbsp" },
      { name: "Kiwi", quantity: "1, sliced" }
    ],
    steps: [
      "Whisk the **matcha powder** with a splash of the **coconut milk** into a smooth paste to stop it clumping, then whisk in the rest of the milk and the **maple syrup**.",
      "Stir in the **chia seeds**, wait 5 min, then stir again to break up any clumps. Seal and chill overnight until thick and set.",
      "Top with sliced **kiwi** before serving."
    ],
    batchTip: "Make 2-3 jars at once - the pudding holds its texture for up to 4 days.",
    substitutionTip: "Any plant milk works; swap kiwi for mango or berries and adjust maple to taste."
  },
  {
    id: "b27", name: "Turkish Menemen", cuisine: "Middle Eastern", mealType: "breakfast",
    prepTime: 8, cookTime: 12, difficulty: "quick",
    phases: ["menstrual", "follicular"], goal: ["maintain", "lose"],
    dietTags: ["vegetarian", "gluten-free", "halal"], allergens: ["eggs"],
    macros: { calories: 280, protein: 18, carbs: 14, fat: 16 },
    micros: { iron: 3, vitaminC: 35, fibre: 4 },
    servings: 1,
    equipment: ["Frying pan"],
    ingredients: [
      { name: "Eggs", quantity: "3" },
      { name: "Green pepper", quantity: "1, diced" },
      { name: "Tomatoes", quantity: "2, diced" },
      { name: "Olive oil", quantity: "1 tbsp" },
      { name: "Cumin", quantity: "1/2 tsp" },
      { name: "Chili flakes", quantity: "1 pinch (optional)" },
      { name: "Fresh parsley", quantity: "to taste" },
      { name: "Salt", quantity: "to taste" }
    ],
    steps: [
      "Soften the **green pepper** in **olive oil** over medium heat for 4 min until it loses its raw bite.",
      "Add the **tomatoes**, **cumin** and a pinch of **chili flakes** and simmer 5 min until jammy and most of the liquid cooks off.",
      "Crack in the **eggs** and stir gently through the sauce, cooking 2-3 min until softly set - keep them creamy, not dry.",
      "Season with **salt** and scatter with **parsley**; serve straight from the pan."
    ],
    batchTip: "Make the pepper-tomato base ahead and chill - reheat and add eggs fresh in minutes.",
    substitutionTip: "Add crumbled feta at the end for a richer version, or a spoon of tomato paste if your tomatoes are pale."
  },
  {
    id: "b28", name: "Sardine & Avocado Rye Toast", cuisine: "Nordic", mealType: "breakfast",
    prepTime: 8, cookTime: 0, difficulty: "quick",
    phases: ["menstrual", "luteal"], goal: ["maintain", "gain"],
    dietTags: ["pescatarian"], allergens: [],
    macros: { calories: 370, protein: 28, carbs: 24, fat: 18 },
    micros: { omega3: 2.2, calcium: 180, iron: 3 },
    servings: 1,
    equipment: ["Toaster"],
    ingredients: [
      { name: "Rye bread", quantity: "2 slices" },
      { name: "Avocado", quantity: "1/2, ripe" },
      { name: "Lemon juice", quantity: "1 tsp" },
      { name: "Canned sardines in olive oil", quantity: "1 tin (90 g), drained" },
      { name: "Chili flakes", quantity: "1 pinch" },
      { name: "Salt & pepper", quantity: "to taste" }
    ],
    steps: [
      "Toast the **rye bread** until crisp.",
      "Mash the **avocado** with the **lemon juice** and a pinch of **salt & pepper**, then spread thickly over the toast.",
      "Lay the **sardines** on top, breaking them slightly, and finish with a pinch of **chili flakes**."
    ],
    batchTip: "Keep a couple of tins of sardines in the cupboard - this comes together in under 5 minutes any morning.",
    substitutionTip: "Swap sardines for canned mackerel or smoked salmon; use gluten-free bread if needed."
  },
  {
    id: "b29", name: "Peanut Butter Protein Smoothie Bowl", cuisine: "Global", mealType: "breakfast",
    prepTime: 8, cookTime: 0, difficulty: "quick",
    phases: ["follicular", "ovulatory", "luteal"], goal: ["gain", "maintain"],
    dietTags: ["vegan"], allergens: ["nuts", "soy"],
    macros: { calories: 420, protein: 26, carbs: 42, fat: 18 },
    micros: { magnesium: 70, fibre: 8, iron: 3 },
    servings: 1,
    equipment: ["Blender"],
    ingredients: [
      { name: "Frozen banana", quantity: "1" },
      { name: "Plant-based protein powder", quantity: "1 scoop" },
      { name: "Peanut butter", quantity: "1 tbsp" },
      { name: "Plant milk", quantity: "1/2 cup" },
      { name: "Granola", quantity: "2 tbsp" },
      { name: "Blueberries", quantity: "1/4 cup" }
    ],
    steps: [
      "Blend the **frozen banana**, **protein powder**, **peanut butter** and just enough **plant milk** to move the blades - keep it thick and spoonable, not pourable.",
      "Scrape into a bowl and smooth the top.",
      "Finish with **granola**, **blueberries** and an extra swirl of peanut butter."
    ],
    batchTip: "Peel and freeze ripe bananas in chunks so you always have a smoothie-bowl base ready to go.",
    substitutionTip: "Use almond or sunflower butter if avoiding peanuts; any frozen berry works in place of blueberries."
  },
  {
    id: "b30", name: "Cinnamon Baked Pear Oats", cuisine: "Nordic", mealType: "breakfast",
    prepTime: 5, cookTime: 25, difficulty: "easy",
    phases: ["luteal", "follicular"], goal: ["maintain", "lose"],
    dietTags: ["vegan", "gluten-free"], allergens: [],
    servings: 2,
    equipment: ["Baking dish", "Oven"],
    macros: { calories: 330, protein: 8, carbs: 58, fat: 8 },
    micros: { fibre: 9, magnesium: 55, vitaminC: 6 },
    ingredients: [
      { name: "Rolled oats", quantity: "1 cup" },
      { name: "Plant milk", quantity: "2 cups" },
      { name: "Pear", quantity: "1, diced" },
      { name: "Cinnamon", quantity: "1 tsp" },
      { name: "Maple syrup", quantity: "1 tbsp" },
      { name: "Pumpkin seeds", quantity: "1 tbsp" },
    ],
    steps: [
      "Heat oven to 180°C. Stir **rolled oats**, **plant milk**, **cinnamon** and half the diced **pear** in a baking dish.",
      "Scatter the rest of the pear on top and bake 20-25 min until set and bubbling at the edges.",
      "Drizzle with **maple syrup** and scatter over **pumpkin seeds** while warm.",
    ],
    batchTip: "Bake in individual ramekins and refrigerate up to 3 days - reheat with a splash of milk.",
    substitutionTip: "Swap pear for apple, and pumpkin seeds for chopped walnuts if you like.",
  },
  {
    id: "b31", name: "Black Bean Breakfast Bowl", cuisine: "Latin", mealType: "breakfast",
    prepTime: 8, cookTime: 5, difficulty: "quick",
    phases: ["menstrual", "luteal"], goal: ["gain", "maintain"],
    dietTags: ["vegan", "gluten-free"], allergens: [],
    servings: 1,
    equipment: ["Small pan"],
    macros: { calories: 380, protein: 17, carbs: 52, fat: 12 },
    micros: { iron: 5, fibre: 14, magnesium: 60 },
    ingredients: [
      { name: "Black beans", quantity: "1 cup, drained" },
      { name: "Ground cumin", quantity: "1/2 tsp" },
      { name: "Salsa", quantity: "1/4 cup - tap in steps to make it" },
      { name: "Avocado", quantity: "1/2, sliced" },
      { name: "Corn tortilla", quantity: "1" },
      { name: "Lime", quantity: "1 wedge" },
    ],
    steps: [
      "Warm **black beans** in a small pan with **ground cumin** and a splash of water until glossy, 3-4 min. Lightly crush half with a fork.",
      "Char the **corn tortilla** directly over the flame or in a dry pan until blistered.",
      "Pile the beans on the tortilla, add [[salsa]] and sliced **avocado**, and finish with a squeeze of **lime**.",
    ],
    batchTip: "Cook a big pot of spiced beans and keep 4 days - breakfast is then 3 minutes.",
    substitutionTip: "No tortilla? Serve over rice, or on sourdough toast (no longer gluten-free).",
  },
  {
    id: "b32", name: "Almond Flour Blueberry Muffin", cuisine: "Global", mealType: "breakfast",
    prepTime: 10, cookTime: 22, difficulty: "easy",
    phases: ["follicular", "ovulatory"], goal: ["lose", "maintain"],
    dietTags: ["vegetarian", "gluten-free"], allergens: ["nuts", "eggs"],
    servings: 2,
    equipment: ["Muffin tin", "Mixing bowl", "Oven"],
    macros: { calories: 300, protein: 10, carbs: 26, fat: 18 },
    micros: { vitaminC: 4, fibre: 4, calcium: 80 },
    ingredients: [
      { name: "Almond flour", quantity: "1.5 cups" },
      { name: "Eggs", quantity: "2" },
      { name: "Blueberries", quantity: "1/2 cup" },
      { name: "Maple syrup", quantity: "3 tbsp" },
      { name: "Baking powder", quantity: "1 tsp" },
      { name: "Vanilla extract", quantity: "1 tsp" },
    ],
    steps: [
      "Heat oven to 175°C and line a muffin tin. Whisk **eggs**, **maple syrup** and **vanilla extract** until frothy.",
      "Stir in **almond flour** and **baking powder** to a thick batter, then gently fold in most of the **blueberries**.",
      "Spoon into 4 cups, dot with the reserved blueberries, and bake 20-22 min until golden and springy.",
    ],
    batchTip: "Keep 3 days at room temperature or freeze - a frozen muffin thaws by mid-morning.",
    substitutionTip: "For egg-free, use 2 flax eggs (denser but still lovely); already dairy-free.",
  },
  {
    id: "b33", name: "Coconut Berry Acai Bowl", cuisine: "Latin", mealType: "breakfast",
    prepTime: 8, cookTime: 0, difficulty: "quick",
    phases: ["follicular", "ovulatory"], goal: ["lose", "maintain"],
    dietTags: ["vegan", "gluten-free"], allergens: [],
    servings: 1,
    equipment: ["Blender"],
    macros: { calories: 310, protein: 6, carbs: 52, fat: 10 },
    micros: { vitaminC: 40, fibre: 8, omega3: 0.5 },
    ingredients: [
      { name: "Frozen acai or acai powder", quantity: "100g / 1 tbsp" },
      { name: "Frozen mixed berries", quantity: "1 cup" },
      { name: "Coconut milk", quantity: "1/2 cup" },
      { name: "Granola", quantity: "2 tbsp" },
      { name: "Fresh berries", quantity: "1/4 cup" },
    ],
    steps: [
      "Blend **frozen acai**, **frozen mixed berries** and just enough **coconut milk** to a thick, spoonable purée - stop and stir rather than adding more liquid.",
      "Spoon into a chilled bowl and smooth the top.",
      "Line up **granola** and **fresh berries** in stripes and serve at once, before it melts.",
    ],
    batchTip: "Portion acai and berries into freezer bags so it is grab-and-blend on busy mornings.",
    substitutionTip: "No coconut milk? Any plant milk works; a frozen banana makes it creamier.",
  },
  {
    id: "b34", name: "Pesto Scrambled Eggs on Toast", cuisine: "Mediterranean", mealType: "breakfast",
    prepTime: 5, cookTime: 5, difficulty: "quick",
    phases: ["follicular", "ovulatory"], goal: ["maintain", "gain"],
    dietTags: ["vegetarian"], allergens: ["eggs", "dairy", "nuts"],
    servings: 1,
    equipment: ["Non-stick pan", "Toaster"],
    macros: { calories: 340, protein: 20, carbs: 18, fat: 22 },
    micros: { calcium: 80, vitaminC: 10, iron: 2 },
    ingredients: [
      { name: "Eggs", quantity: "3" },
      { name: "Basil pesto", quantity: "1 tbsp - tap in steps to make it" },
      { name: "Cherry tomatoes", quantity: "1/2 cup, halved" },
      { name: "Sourdough bread", quantity: "1 slice" },
      { name: "Parmesan", quantity: "1 tbsp, grated" },
    ],
    steps: [
      "Whisk **eggs** with a pinch of salt and toast the **sourdough**.",
      "Soften **cherry tomatoes** in a non-stick pan for 1 min, then pour in the eggs and stir gently over low heat until just set - pull them off while still glossy.",
      "Fold [[pesto]] through the warm eggs, pile onto the toast and finish with grated **parmesan**.",
    ],
    batchTip: "Keep a jar of pesto in the fridge under a film of oil for a week of fast breakfasts.",
    substitutionTip: "Nut allergy? Use a nut-free pesto made with sunflower seeds in place of pine nuts.",
  },
  {
    id: "b35", name: "Turmeric Golden Oats", cuisine: "Asian", mealType: "breakfast",
    prepTime: 5, cookTime: 8, difficulty: "quick",
    phases: ["menstrual", "luteal", "follicular"], goal: ["lose", "maintain"],
    dietTags: ["vegan", "gluten-free"], allergens: [],
    servings: 1,
    equipment: ["Small pot"],
    macros: { calories: 280, protein: 7, carbs: 46, fat: 8 },
    micros: { magnesium: 45, fibre: 5, iron: 2 },
    ingredients: [
      { name: "Rolled oats", quantity: "1/2 cup" },
      { name: "Plant milk", quantity: "1 cup" },
      { name: "Turmeric", quantity: "1/2 tsp" },
      { name: "Black pepper", quantity: "1 pinch" },
      { name: "Honey or maple syrup", quantity: "1 tsp" },
      { name: "Banana", quantity: "1/2, sliced" },
    ],
    steps: [
      "Simmer **rolled oats** in **plant milk** with **turmeric** and a pinch of **black pepper** (it helps the turmeric absorb), stirring 6-8 min until creamy.",
      "Sweeten off the heat with **honey or maple syrup**.",
      "Top with sliced **banana** and a little extra black pepper.",
    ],
    batchTip: "Mix the dry oats, turmeric and pepper in a jar for an instant golden-oats base.",
    substitutionTip: "Add 1 tsp grated fresh ginger for extra warmth, or use quick oats to save 2 min.",
  },
  {
    id: "b36", name: "Quinoa Mango Breakfast Bowl", cuisine: "Global", mealType: "breakfast",
    prepTime: 5, cookTime: 0, difficulty: "quick",
    phases: ["ovulatory", "follicular"], goal: ["lose", "maintain"],
    dietTags: ["vegan", "gluten-free"], allergens: [],
    servings: 1,
    equipment: [],
    macros: { calories: 340, protein: 10, carbs: 56, fat: 8 },
    micros: { vitaminC: 35, fibre: 6, vitaminB6: 0.4 },
    ingredients: [
      { name: "Cooked quinoa", quantity: "1 cup, cooled" },
      { name: "Mango", quantity: "1/2 cup, diced" },
      { name: "Kiwi", quantity: "1, sliced" },
      { name: "Coconut flakes", quantity: "1 tbsp" },
      { name: "Lime juice", quantity: "1 tsp" },
      { name: "Honey", quantity: "1 tsp" },
    ],
    steps: [
      "Loosen the **cooked quinoa** with a fork and spoon into a bowl.",
      "Whisk **lime juice** with **honey** and toss it through the quinoa.",
      "Top with **mango** and **kiwi**, then scatter over toasted **coconut flakes**.",
    ],
    batchTip: "Cook quinoa in bulk and chill up to 4 days - it bowls straight from the fridge.",
    substitutionTip: "Vegan? Use maple syrup instead of honey; swap mango for peach in summer.",
  },

  // ───────── Batch 4 — Soups (+15) ─────────
  {
    id: "sop01", name: "Creamy Tomato Basil Soup", cuisine: "Mediterranean", mealType: "lunch",
    prepTime: 10, cookTime: 25, difficulty: "easy",
    phases: ["follicular", "ovulatory"], goal: ["lose", "maintain"],
    dietTags: ["vegetarian", "gluten-free"], allergens: ["dairy"],
    servings: 2,
    equipment: ["Pot", "Blender"],
    macros: { calories: 240, protein: 7, carbs: 28, fat: 12 },
    micros: { vitaminC: 22, fibre: 6, calcium: 80 },
    ingredients: [
      { name: "Canned tomatoes", quantity: "400g" },
      { name: "Onion", quantity: "1, chopped" },
      { name: "Garlic", quantity: "3 cloves" },
      { name: "Vegetable broth", quantity: "1 cup" },
      { name: "Olive oil", quantity: "1 tbsp" },
      { name: "Cream", quantity: "2 tbsp" },
      { name: "Fresh basil", quantity: "small bunch" },
      { name: "Salt & pepper", quantity: "to taste" }
    ],
    steps: [
      "Soften **onion** and **garlic** in **olive oil** over medium heat until sweet and translucent, about 5 min.",
      "Add **canned tomatoes** and **vegetable broth**, simmer 15 min to concentrate.",
      "Blend smooth, stir in **cream** and torn **fresh basil**, then season with **salt & pepper**."
    ],
    batchTip: "Freezes beautifully for a month - stir in the cream only after reheating.",
    substitutionTip: "Dairy-free? Use coconut cream or a spoon of cashew butter for the same silkiness."
  },
  {
    id: "sop02", name: "Roasted Butternut Squash Soup", cuisine: "Global", mealType: "lunch",
    prepTime: 15, cookTime: 35, difficulty: "easy",
    phases: ["luteal", "menstrual"], goal: ["lose", "maintain"],
    dietTags: ["vegan", "gluten-free"], allergens: [],
    servings: 3,
    equipment: ["Baking tray", "Blender"],
    macros: { calories: 220, protein: 5, carbs: 38, fat: 8 },
    micros: { vitaminC: 28, fibre: 7, magnesium: 40 },
    ingredients: [
      { name: "Butternut squash", quantity: "500g, cubed" },
      { name: "Onion", quantity: "1, quartered" },
      { name: "Garlic", quantity: "2 cloves, unpeeled" },
      { name: "Olive oil", quantity: "2 tbsp" },
      { name: "Vegetable broth", quantity: "2 cups" },
      { name: "Coconut milk", quantity: "1/4 cup" },
      { name: "Nutmeg", quantity: "1/4 tsp" },
      { name: "Salt & pepper", quantity: "to taste" }
    ],
    steps: [
      "Toss **butternut squash**, **onion** and **garlic** in **olive oil** and roast at 200°C for 25 min until caramelised at the edges.",
      "Squeeze the roasted **garlic** from its skins, then blend everything with **vegetable broth** until very smooth.",
      "Stir in **coconut milk** and **nutmeg**, season with **salt & pepper** and reheat gently."
    ],
    batchTip: "Roast a double tray of squash on the weekend; soup blends up in 5 min any weeknight.",
    substitutionTip: "Pumpkin or carrot roast the same way if squash is out of season."
  },
  {
    id: "sop03", name: "Classic Minestrone", cuisine: "Mediterranean", mealType: "lunch",
    prepTime: 15, cookTime: 30, difficulty: "easy",
    phases: ["follicular", "ovulatory", "menstrual"], goal: ["lose", "maintain"],
    dietTags: ["vegan"], allergens: [],
    servings: 4,
    equipment: ["Large pot"],
    macros: { calories: 280, protein: 12, carbs: 44, fat: 6 },
    micros: { iron: 4, fibre: 10, vitaminC: 24 },
    ingredients: [
      { name: "Cannellini beans", quantity: "1 cup, cooked" },
      { name: "Small pasta", quantity: "1/2 cup, ditalini or elbow" },
      { name: "Diced tomatoes", quantity: "1 cup" },
      { name: "Zucchini, carrot & celery", quantity: "1 each, diced" },
      { name: "Onion & garlic", quantity: "1 onion + 2 cloves" },
      { name: "Olive oil", quantity: "1 tbsp" },
      { name: "Vegetable broth", quantity: "4 cups" },
      { name: "Fresh basil", quantity: "to finish" }
    ],
    steps: [
      "Sweat **onion & garlic** with the **zucchini, carrot & celery** in **olive oil** for 5 min until glossy.",
      "Add **cannellini beans**, **diced tomatoes** and **vegetable broth**; simmer 15 min.",
      "Stir in **small pasta** and cook until al dente, then finish with torn **fresh basil** and a grind of pepper."
    ],
    batchTip: "Cook the soup base ahead; add pasta only when reheating so it doesn't turn mushy.",
    substitutionTip: "Gluten-free? Use a GF pasta or swap in cooked barley or extra beans."
  },
  {
    id: "sop04", name: "Thai Coconut Mushroom Soup", cuisine: "Asian", mealType: "lunch",
    prepTime: 10, cookTime: 20, difficulty: "easy",
    phases: ["luteal", "ovulatory"], goal: ["maintain"],
    dietTags: ["vegan", "gluten-free"], allergens: [],
    servings: 2,
    equipment: ["Pot"],
    macros: { calories: 250, protein: 8, carbs: 18, fat: 16 },
    micros: { iron: 2, fibre: 4, vitaminC: 12 },
    ingredients: [
      { name: "Coconut milk", quantity: "1 can (400ml)" },
      { name: "Vegetable broth", quantity: "1 cup" },
      { name: "Mushrooms", quantity: "2 cups, sliced" },
      { name: "Lemongrass", quantity: "1 stalk, bruised" },
      { name: "Ginger", quantity: "2 slices" },
      { name: "Firm tofu", quantity: "100g, cubed" },
      { name: "Lime", quantity: "1, juiced" },
      { name: "Soy sauce", quantity: "1 tbsp" }
    ],
    steps: [
      "Simmer **coconut milk** and **vegetable broth** with the **lemongrass** and **ginger** for 10 min to infuse.",
      "Add **mushrooms** and **firm tofu**, simmer 8 min until the mushrooms are silky.",
      "Off the heat, stir in **lime** and **soy sauce**; fish out the lemongrass and ginger before serving."
    ],
    batchTip: "Keeps 3 days chilled; brighten the reheated soup with a fresh squeeze of lime.",
    substitutionTip: "No lemongrass? A strip of lime zest and extra ginger stand in nicely."
  },
  {
    id: "sop05", name: "Tuscan White Bean & Kale Soup", cuisine: "Mediterranean", mealType: "lunch",
    prepTime: 10, cookTime: 25, difficulty: "easy",
    phases: ["menstrual", "follicular"], goal: ["lose", "maintain"],
    dietTags: ["vegan", "gluten-free"], allergens: [],
    servings: 3,
    equipment: ["Large pot"],
    macros: { calories: 310, protein: 15, carbs: 48, fat: 7 },
    micros: { iron: 5, fibre: 12, vitaminC: 14 },
    ingredients: [
      { name: "Cannellini beans", quantity: "1.5 cups, cooked" },
      { name: "Kale", quantity: "2 cups, roughly chopped" },
      { name: "Diced tomatoes", quantity: "1 cup" },
      { name: "Garlic", quantity: "3 cloves, minced" },
      { name: "Olive oil", quantity: "1 tbsp" },
      { name: "Vegetable broth", quantity: "3 cups" },
      { name: "Fresh rosemary", quantity: "1 sprig" },
      { name: "Salt & pepper", quantity: "to taste" }
    ],
    steps: [
      "Warm **olive oil** and sizzle the **garlic** with the **fresh rosemary** for 1-2 min until fragrant.",
      "Add **cannellini beans**, **diced tomatoes** and **vegetable broth**; simmer 15 min, mashing a few beans against the pot to thicken.",
      "Stir in **kale** until just wilted, discard the rosemary sprig and season with **salt & pepper**."
    ],
    batchTip: "Thickens as it sits - loosen with a splash of broth when reheating. Freezes 1 month.",
    substitutionTip: "Spinach or chard can replace kale; add them at the very end as they wilt faster."
  },
  {
    id: "sop06", name: "Moroccan Harira", cuisine: "African", mealType: "lunch",
    prepTime: 15, cookTime: 35, difficulty: "easy",
    phases: ["menstrual", "luteal"], goal: ["maintain"],
    dietTags: ["vegan", "gluten-free", "halal"], allergens: [],
    servings: 4,
    equipment: ["Large pot"],
    macros: { calories: 300, protein: 14, carbs: 46, fat: 7 },
    micros: { iron: 5, fibre: 11, vitaminC: 16 },
    ingredients: [
      { name: "Chickpeas", quantity: "1 cup, cooked" },
      { name: "Red lentils", quantity: "1/2 cup, rinsed" },
      { name: "Ripe tomatoes", quantity: "2, diced" },
      { name: "Onion & celery", quantity: "1 onion + 1 stalk, diced" },
      { name: "Cumin, cinnamon & coriander", quantity: "1 tsp each" },
      { name: "Turmeric", quantity: "1/2 tsp" },
      { name: "Olive oil", quantity: "1 tbsp" },
      { name: "Lemon", quantity: "1/2, juiced" },
      { name: "Parsley & cilantro", quantity: "1/4 cup each, chopped" }
    ],
    steps: [
      "Soften **onion & celery** in **olive oil** for 5 min, then toast the **cumin, cinnamon & coriander** and **turmeric** for 1 min until aromatic.",
      "Add **chickpeas**, **red lentils**, **ripe tomatoes** and 4 cups water; bring to a boil, then simmer 25 min until the lentils break down and thicken.",
      "Finish with **lemon** and the chopped **parsley & cilantro**, and season generously with salt and pepper."
    ],
    batchTip: "Harira thickens overnight and tastes even better day two - loosen with water when reheating.",
    substitutionTip: "Add a handful of vermicelli or cooked rice in the last 8 min to make it heartier."
  },
  {
    id: "sop07", name: "Spinach & Red Lentil Soup", cuisine: "Middle Eastern", mealType: "lunch",
    prepTime: 10, cookTime: 25, difficulty: "easy",
    servings: 4,
    equipment: ["Large pot"],
    phases: ["menstrual", "luteal"], goal: ["lose", "maintain"],
    dietTags: ["vegan", "gluten-free"], allergens: [],
    macros: { calories: 290, protein: 16, carbs: 42, fat: 6 },
    micros: { iron: 6, fibre: 12, vitaminC: 18 },
    ingredients: [
      { name: "Red lentils", quantity: "1 cup, rinsed" },
      { name: "Baby spinach", quantity: "2 cups" },
      { name: "Carrot", quantity: "1, diced" },
      { name: "Onion", quantity: "1, diced" },
      { name: "Garlic", quantity: "2 cloves, minced" },
      { name: "Cumin", quantity: "1 tsp" },
      { name: "Turmeric", quantity: "1/2 tsp" },
      { name: "Olive oil", quantity: "1 tbsp" },
      { name: "Vegetable broth", quantity: "3 cups" },
      { name: "Lemon juice", quantity: "1 tbsp" }
    ],
    steps: [
      "Warm **olive oil** in a large pot and soften **onion**, **carrot** and **garlic** over medium heat for 5 min, until glossy.",
      "Stir in **cumin** and **turmeric** for 30 sec, then add **red lentils** and **vegetable broth**; simmer 20 min until the lentils collapse and thicken.",
      "Fold in **baby spinach** until just wilted, brighten with **lemon juice**, season and serve."
    ],
    batchTip: "Keeps 4 days in the fridge and thickens as it sits - loosen with a splash of water when reheating.",
    substitutionTip: "No red lentils? Yellow split peas work, but simmer 15 min longer until soft."
  },
  {
    id: "sop08", name: "Miso Ramen Bowl", cuisine: "Asian", mealType: "dinner",
    prepTime: 15, cookTime: 20, difficulty: "easy",
    servings: 2,
    equipment: ["Medium pot", "Small pot"],
    phases: ["follicular", "luteal"], goal: ["maintain", "gain"],
    dietTags: ["vegetarian"], allergens: ["soy", "eggs"],
    macros: { calories: 420, protein: 22, carbs: 52, fat: 14 },
    micros: { iron: 3, magnesium: 45, fibre: 5 },
    ingredients: [
      { name: "Ramen noodles", quantity: "100g" },
      { name: "White miso paste", quantity: "2 tbsp" },
      { name: "Vegetable broth", quantity: "3 cups" },
      { name: "Eggs", quantity: "2" },
      { name: "Shiitake mushrooms", quantity: "1 cup, sliced" },
      { name: "Bok choy", quantity: "1 head, halved" },
      { name: "Garlic & ginger", quantity: "1 clove / 1 tsp grated" },
      { name: "Nori & sesame oil", quantity: "1 sheet / 1 tsp" }
    ],
    steps: [
      "Lower the **eggs** into boiling water for 6.5 min, then chill in cold water and peel - the yolks stay jammy.",
      "Simmer the **vegetable broth** with **garlic**, **ginger** and the **shiitake mushrooms** 5 min. Add the **bok choy** for the last 2 min.",
      "Off the heat, whisk in the **white miso paste** - never boil miso, or it turns bitter and loses its probiotics.",
      "Cook the **ramen noodles** separately, divide into bowls, ladle over the broth and veg. Top with halved eggs, **nori** strips and a drizzle of **sesame oil**."
    ],
    batchTip: "Keep broth and noodles apart in the fridge so the noodles never go soggy; reheat broth and combine to serve.",
    substitutionTip: "Vegan? Skip the egg and add pan-fried tofu; gluten-free, use rice ramen and check your miso."
  },
  {
    id: "sop09", name: "Pumpkin & Coconut Cream Soup", cuisine: "Asian", mealType: "lunch",
    prepTime: 10, cookTime: 30, difficulty: "easy",
    servings: 3,
    equipment: ["Baking tray", "Blender"],
    phases: ["luteal", "menstrual"], goal: ["lose", "maintain"],
    dietTags: ["vegan", "gluten-free"], allergens: [],
    macros: { calories: 230, protein: 4, carbs: 36, fat: 9 },
    micros: { vitaminC: 16, fibre: 7, magnesium: 40 },
    ingredients: [
      { name: "Pumpkin", quantity: "500g, cubed" },
      { name: "Coconut cream", quantity: "1/4 cup" },
      { name: "Fresh ginger", quantity: "1 tbsp, grated" },
      { name: "Garlic", quantity: "2 cloves, unpeeled" },
      { name: "Olive oil", quantity: "2 tbsp" },
      { name: "Vegetable broth", quantity: "2 cups" },
      { name: "Toasted pumpkin seeds", quantity: "1 tbsp" },
      { name: "Salt & pepper", quantity: "to taste" }
    ],
    steps: [
      "Toss **pumpkin** and unpeeled **garlic** with **olive oil** and roast at 200°C for 20-25 min until caramelised at the edges.",
      "Squeeze the soft garlic from its skins, then blend the pumpkin, garlic and **vegetable broth** until silky smooth.",
      "Stir in **coconut cream** and **ginger**, warm through, season with **salt & pepper** and scatter with **toasted pumpkin seeds**."
    ],
    batchTip: "Freezes beautifully for up to 3 months - add the coconut cream fresh after reheating for the silkiest texture.",
    substitutionTip: "Swap pumpkin for butternut squash or sweet potato, roasting for the same time."
  },
  {
    id: "sop10", name: "Chicken & Vegetable Soup", cuisine: "Global", mealType: "lunch",
    prepTime: 10, cookTime: 30, difficulty: "easy",
    servings: 2,
    equipment: ["Large pot"],
    phases: ["menstrual", "luteal", "follicular"], goal: ["maintain", "lose"],
    dietTags: ["halal", "gluten-free"], allergens: [],
    macros: { calories: 300, protein: 28, carbs: 22, fat: 8 },
    micros: { iron: 3, fibre: 6, vitaminC: 20 },
    ingredients: [
      { name: "Chicken breast", quantity: "150g" },
      { name: "Carrots", quantity: "1, sliced" },
      { name: "Celery", quantity: "2 stalks, sliced" },
      { name: "Onion", quantity: "1, diced" },
      { name: "Chicken broth", quantity: "3 cups" },
      { name: "Fresh thyme & parsley", quantity: "to taste" }
    ],
    steps: [
      "Bring **chicken broth** to a gentle simmer with **onion**, **carrots** and **celery**, then slip in the whole **chicken breast** and poach 18-20 min.",
      "Lift out the chicken, shred it with two forks and return it to the pot; simmer 2 min to heat through.",
      "Season well and finish with **fresh thyme & parsley**."
    ],
    batchTip: "Make a double batch of broth and veg, then add freshly poached chicken each day so it stays tender.",
    substitutionTip: "Use leftover roast chicken - stir it in at the end and simmer just 5 min."
  },
  {
    id: "sop11", name: "Black Bean Soup", cuisine: "Latin", mealType: "lunch",
    prepTime: 10, cookTime: 25, difficulty: "easy",
    servings: 3,
    equipment: ["Pot", "Blender"],
    phases: ["menstrual", "luteal"], goal: ["maintain", "lose"],
    dietTags: ["vegan", "gluten-free"], allergens: [],
    macros: { calories: 290, protein: 14, carbs: 46, fat: 5 },
    micros: { iron: 5, fibre: 15, magnesium: 55 },
    ingredients: [
      { name: "Black beans", quantity: "1.5 cups, cooked or canned" },
      { name: "Onion", quantity: "1, diced" },
      { name: "Garlic", quantity: "2 cloves, minced" },
      { name: "Cumin", quantity: "1 tsp" },
      { name: "Smoked paprika", quantity: "1 tsp" },
      { name: "Olive oil", quantity: "1 tbsp" },
      { name: "Vegetable broth", quantity: "2 cups" },
      { name: "Lime juice", quantity: "1 tbsp" },
      { name: "Fresh cilantro", quantity: "to garnish" }
    ],
    steps: [
      "Warm **olive oil** and soften **onion** and **garlic** with **cumin** and **smoked paprika** until fragrant, about 4 min.",
      "Add **black beans** and **vegetable broth** and simmer 15 min to let the flavours meld.",
      "Blend about half the pot until creamy, stir back together, then finish with **lime juice** and **fresh cilantro**."
    ],
    batchTip: "Deepens overnight and keeps 4 days - a spoonful of the whole beans held back adds nice texture on reheating.",
    substitutionTip: "No black beans? Pinto or kidney beans work just as well."
  },
  {
    id: "sop12", name: "Carrot Ginger Soup", cuisine: "Asian", mealType: "lunch",
    prepTime: 10, cookTime: 25, difficulty: "easy",
    servings: 3,
    equipment: ["Pot", "Blender"],
    phases: ["follicular", "ovulatory"], goal: ["lose", "maintain"],
    dietTags: ["vegan", "gluten-free"], allergens: [],
    macros: { calories: 200, protein: 4, carbs: 32, fat: 7 },
    micros: { vitaminC: 18, fibre: 6, vitaminB6: 0.4 },
    ingredients: [
      { name: "Carrots", quantity: "500g, sliced" },
      { name: "Fresh ginger", quantity: "2 tbsp, grated" },
      { name: "Onion", quantity: "1, diced" },
      { name: "Garlic", quantity: "1 clove" },
      { name: "Olive oil", quantity: "1 tbsp" },
      { name: "Coconut milk", quantity: "1/4 cup" },
      { name: "Vegetable broth", quantity: "2 cups" },
      { name: "Orange juice", quantity: "1/4 cup, freshly squeezed" },
      { name: "Salt & pepper", quantity: "to taste" }
    ],
    steps: [
      "Warm **olive oil** and soften **onion** and **garlic** for 3 min, then add **carrots**, **ginger** and **vegetable broth**.",
      "Simmer 18-20 min until the carrots are very soft.",
      "Blend until silky, stir in **coconut milk** and **orange juice**, and season with **salt & pepper**."
    ],
    batchTip: "Freezes well for 2 months; add the orange juice fresh after reheating to keep it bright.",
    substitutionTip: "No coconut milk? A splash of oat cream gives the same velvety finish."
  },
  {
    id: "sop13", name: "Gazpacho", cuisine: "Mediterranean", mealType: "lunch",
    prepTime: 15, cookTime: 0, difficulty: "quick",
    servings: 4,
    equipment: ["Blender"],
    phases: ["ovulatory", "follicular"], goal: ["lose"],
    dietTags: ["vegan", "gluten-free"], allergens: [],
    macros: { calories: 140, protein: 4, carbs: 22, fat: 5 },
    micros: { vitaminC: 40, fibre: 5, vitaminB6: 0.3 },
    ingredients: [
      { name: "Ripe tomatoes", quantity: "4 large" },
      { name: "Cucumber", quantity: "1" },
      { name: "Red pepper", quantity: "1" },
      { name: "Garlic", quantity: "1 clove" },
      { name: "Olive oil", quantity: "1 tbsp, plus extra to serve" },
      { name: "Red wine vinegar", quantity: "1 tbsp" }
    ],
    steps: [
      "Roughly chop **ripe tomatoes**, **cucumber** and **red pepper**, then blend with **garlic**, **olive oil** and **red wine vinegar** until very smooth.",
      "Season generously with salt and pepper and blend again for a few seconds.",
      "Chill at least 1 hour and serve cold with an extra drizzle of olive oil."
    ],
    batchTip: "Best made a day ahead so the flavours round out; keeps 3 days chilled.",
    substitutionTip: "Blend in a slice of stale bread for a richer, more traditional body (drop the gluten-free tag)."
  },
  {
    id: "sop14", name: "French Green Lentil Soup", cuisine: "Mediterranean", mealType: "dinner",
    prepTime: 10, cookTime: 35, difficulty: "easy",
    servings: 4,
    equipment: ["Large pot"],
    phases: ["menstrual", "luteal"], goal: ["lose", "maintain"],
    dietTags: ["vegan", "gluten-free"], allergens: [],
    macros: { calories: 310, protein: 17, carbs: 48, fat: 6 },
    micros: { iron: 7, fibre: 14, vitaminB6: 0.5 },
    ingredients: [
      { name: "Green lentils", quantity: "1 cup (Puy or French)" },
      { name: "Carrots", quantity: "1, diced" },
      { name: "Celery", quantity: "2 stalks, diced" },
      { name: "Onion", quantity: "1, diced" },
      { name: "Garlic", quantity: "2 cloves, minced" },
      { name: "Bay leaf & thyme", quantity: "1 / 2 sprigs" },
      { name: "Dijon mustard", quantity: "1 tsp" },
      { name: "Vegetable broth", quantity: "4 cups" },
      { name: "Olive oil", quantity: "1 tbsp" }
    ],
    steps: [
      "Sweat the **onion**, **garlic**, **carrots** and **celery** in **olive oil** 6 min until softened but not coloured.",
      "Add the **green lentils**, **vegetable broth**, **bay leaf** and **thyme**. Bring to a boil, then simmer 30 min until the lentils are tender but still hold their shape.",
      "Fish out the bay and thyme stems. Stir in the **Dijon mustard**, season generously and add a splash of water if you like it looser."
    ],
    batchTip: "Makes 4 bowls and keeps 5 days or freezes well - the flavour rounds out overnight.",
    substitutionTip: "Brown lentils work too but cook softer; a squeeze of lemon can replace the Dijon for brightness."
  },
  {
    id: "sop15", name: "Creamy Broccoli & Almond Soup", cuisine: "Nordic", mealType: "lunch",
    prepTime: 10, cookTime: 20, difficulty: "easy",
    servings: 3,
    equipment: ["Pot", "Blender"],
    phases: ["follicular", "ovulatory"], goal: ["lose", "maintain"],
    dietTags: ["vegan", "gluten-free"], allergens: ["nuts"],
    macros: { calories: 220, protein: 8, carbs: 20, fat: 12 },
    micros: { vitaminC: 70, fibre: 7, calcium: 80 },
    ingredients: [
      { name: "Broccoli", quantity: "400g, cut into florets" },
      { name: "Almond milk (unsweetened)", quantity: "1 cup" },
      { name: "Onion", quantity: "1, diced" },
      { name: "Garlic", quantity: "2 cloves, minced" },
      { name: "Olive oil", quantity: "1 tbsp" },
      { name: "Vegetable broth", quantity: "2 cups" },
      { name: "Nutritional yeast", quantity: "1 tbsp" },
      { name: "Toasted flaked almonds", quantity: "1 tbsp" },
      { name: "Nutmeg", quantity: "1 pinch" }
    ],
    steps: [
      "Warm **olive oil** and soften **onion** and **garlic** for 3 min, then add **broccoli** and **vegetable broth**.",
      "Simmer 12-15 min until the broccoli is very tender but still vivid green.",
      "Blend with **almond milk**, **nutritional yeast** and **nutmeg** until smooth; top with **toasted flaked almonds** to serve."
    ],
    batchTip: "Reheat gently and keep the lid off - blitzed broccoli soup dulls in colour if boiled hard.",
    substitutionTip: "Nut-free? Use oat milk and swap the almonds for toasted pumpkin seeds."
  },

  // ───────── Batch 4 — Salads (+15) ─────────
  {
    id: "sal01", name: "Kale Caesar with Crispy Chickpeas", cuisine: "Mediterranean", mealType: "lunch",
    prepTime: 15, cookTime: 25, difficulty: "easy",
    servings: 2,
    equipment: ["Baking tray", "Mixing bowl"],
    phases: ["follicular", "ovulatory"], goal: ["lose", "maintain"],
    dietTags: ["vegan", "gluten-free"], allergens: [],
    macros: { calories: 360, protein: 14, carbs: 34, fat: 18 },
    micros: { vitaminC: 60, fibre: 10, iron: 4 },
    ingredients: [
      { name: "Kale", quantity: "3 cups, stems removed" },
      { name: "Chickpeas", quantity: "1 cup, drained and dried" },
      { name: "Smoked paprika", quantity: "1/2 tsp" },
      { name: "Tahini", quantity: "2 tbsp" },
      { name: "Lemon juice", quantity: "2 tbsp" },
      { name: "Garlic", quantity: "1 clove" },
      { name: "Nutritional yeast", quantity: "1 tbsp" },
      { name: "Olive oil", quantity: "2 tbsp" },
      { name: "Salt & pepper", quantity: "to taste" }
    ],
    steps: [
      "Toss **chickpeas** with 1 tbsp **olive oil** and **smoked paprika** and roast at 200°C for 20-25 min until crisp and rattling.",
      "Meanwhile massage **kale** with the remaining olive oil and a pinch of salt for a minute, until darkened and tender.",
      "Whisk **tahini**, **lemon juice**, **garlic** and **nutritional yeast** with a splash of water into a [[vegan caesar dressing]]; toss through the kale, season with **salt & pepper** and crown with the crispy chickpeas."
    ],
    batchTip: "Roast a double tray of chickpeas and store airtight - they stay crisp 2 days for salads and snacking.",
    substitutionTip: "Swap kale for romaine for a softer, more classic Caesar."
  },
  {
    id: "sal02", name: "Watermelon Feta & Mint Salad", cuisine: "Mediterranean", mealType: "lunch",
    prepTime: 10, cookTime: 0, difficulty: "quick",
    servings: 2,
    equipment: [],
    phases: ["ovulatory", "follicular"], goal: ["lose"],
    dietTags: ["vegetarian", "gluten-free"], allergens: ["dairy"],
    macros: { calories: 190, protein: 6, carbs: 28, fat: 8 },
    micros: { vitaminC: 18, calcium: 100, fibre: 2 },
    ingredients: [
      { name: "Watermelon", quantity: "2 cups, cubed" },
      { name: "Feta", quantity: "50g" },
      { name: "Fresh mint", quantity: "1/4 cup" },
      { name: "Lime juice", quantity: "1 tbsp" },
      { name: "Black pepper", quantity: "1 pinch" }
    ],
    steps: [
      "Arrange **watermelon** across a serving platter.",
      "Crumble **feta** over the top and scatter with **fresh mint** leaves.",
      "Drizzle with **lime juice**, finish with **black pepper** and serve well chilled."
    ],
    batchTip: "Cube the watermelon and chill ahead, but dress and add feta only just before serving so it stays crisp.",
    substitutionTip: "Dairy-free? Swap feta for cubes of firm avocado or a plant-based feta."
  },
  {
    id: "sal03", name: "Japanese Sesame Cucumber Salad", cuisine: "Asian", mealType: "lunch",
    prepTime: 10, cookTime: 0, difficulty: "quick",
    servings: 2,
    equipment: [],
    phases: ["ovulatory", "follicular"], goal: ["lose"],
    dietTags: ["vegan", "gluten-free"], allergens: ["soy"],
    macros: { calories: 130, protein: 4, carbs: 14, fat: 7 },
    micros: { vitaminC: 8, fibre: 3, calcium: 50 },
    ingredients: [
      { name: "Cucumbers", quantity: "2 large" },
      { name: "Rice vinegar", quantity: "2 tbsp" },
      { name: "Sesame oil", quantity: "1 tsp" },
      { name: "Soy sauce", quantity: "1 tbsp" },
      { name: "Sesame seeds", quantity: "1 tbsp" },
      { name: "Spring onion", quantity: "2, thinly sliced" }
    ],
    steps: [
      "Thinly slice **cucumbers**, toss with a little salt and rest 10 min, then rinse and squeeze dry.",
      "Whisk **rice vinegar**, **sesame oil** and **soy sauce**, then toss with the cucumbers.",
      "Finish with **sesame seeds** and **spring onion**."
    ],
    batchTip: "Salting and squeezing keeps it crunchy - it will hold dressed in the fridge for a day.",
    substitutionTip: "Soy-free? Use coconut aminos or a splash of tamari-free miso whisked with water."
  },
  {
    id: "sal04", name: "Warm Lentil & Roasted Veg Salad", cuisine: "Mediterranean", mealType: "lunch",
    prepTime: 15, cookTime: 30, difficulty: "easy",
    servings: 2,
    equipment: ["Baking tray"],
    phases: ["menstrual", "luteal"], goal: ["maintain", "lose"],
    dietTags: ["vegan", "gluten-free"], allergens: [],
    macros: { calories: 380, protein: 16, carbs: 52, fat: 11 },
    micros: { iron: 5, fibre: 14, vitaminC: 30 },
    ingredients: [
      { name: "Cooked green lentils", quantity: "1 cup" },
      { name: "Zucchini", quantity: "1, sliced" },
      { name: "Red pepper", quantity: "1, chopped" },
      { name: "Red onion", quantity: "1/2, wedged" },
      { name: "Olive oil", quantity: "2 tbsp" },
      { name: "Balsamic vinegar", quantity: "1 tbsp" },
      { name: "Baby spinach", quantity: "1 cup" }
    ],
    steps: [
      "Toss **zucchini**, **red pepper** and **red onion** with **olive oil** and roast at 200°C for 25-30 min until caramelised.",
      "Warm the **green lentils** and fold through the roasted veg and **baby spinach** so it just wilts.",
      "Dress with **balsamic vinegar**, season and serve warm."
    ],
    batchTip: "Roast the veg and cook the lentils ahead; assemble warm or enjoy cold as a next-day lunch.",
    substitutionTip: "Swap lentils for chickpeas or a cooked grain like farro (drop the gluten-free tag)."
  },
  {
    id: "sal05", name: "Mango Avocado Black Bean Salad", cuisine: "Latin", mealType: "lunch",
    prepTime: 12, cookTime: 0, difficulty: "quick",
    servings: 2,
    equipment: [],
    phases: ["follicular", "ovulatory"], goal: ["lose", "maintain"],
    dietTags: ["vegan", "gluten-free"], allergens: [],
    macros: { calories: 360, protein: 11, carbs: 50, fat: 16 },
    micros: { vitaminC: 36, fibre: 14, vitaminB6: 0.5 },
    ingredients: [
      { name: "Black beans", quantity: "1 cup, drained" },
      { name: "Mango", quantity: "1, diced" },
      { name: "Avocado", quantity: "1, diced" },
      { name: "Red onion", quantity: "1/4, finely diced" },
      { name: "Fresh cilantro", quantity: "1/4 cup" },
      { name: "Lime juice", quantity: "2 tbsp" }
    ],
    steps: [
      "Combine **black beans**, **mango** and **avocado** in a bowl.",
      "Add **red onion** and **fresh cilantro**.",
      "Dress with **lime juice**, season and serve straight away while the avocado is bright."
    ],
    batchTip: "Prep beans, mango and onion ahead; fold in avocado and lime only just before eating.",
    substitutionTip: "No mango? Diced pineapple or peach brings the same sweet-tart lift."
  },
  {
    id: "sal06", name: "Grilled Halloumi & Spinach Salad", cuisine: "Mediterranean", mealType: "lunch",
    prepTime: 10, cookTime: 8, difficulty: "easy",
    servings: 1,
    equipment: ["Grill pan"],
    phases: ["follicular", "ovulatory"], goal: ["maintain", "gain"],
    dietTags: ["vegetarian", "gluten-free"], allergens: ["dairy"],
    macros: { calories: 430, protein: 26, carbs: 12, fat: 32 },
    micros: { calcium: 280, fibre: 5, vitaminC: 22 },
    ingredients: [
      { name: "Halloumi", quantity: "100g, sliced" },
      { name: "Baby spinach", quantity: "3 cups" },
      { name: "Cherry tomatoes", quantity: "1 cup, halved" },
      { name: "Cucumber", quantity: "1/2, sliced" },
      { name: "Kalamata olives", quantity: "1/4 cup" },
      { name: "Lemon dressing", quantity: "2 tbsp - tap in steps to make it" }
    ],
    steps: [
      "Pat **halloumi** dry and grill the slices in a dry hot pan 1-2 min a side until golden and squeaky.",
      "Arrange **baby spinach** with **cherry tomatoes**, **cucumber** and **kalamata olives**.",
      "Top with the warm halloumi and drizzle with [[lemon dressing]]."
    ],
    batchTip: "Halloumi is best hot off the pan; slice and store raw, then grill fresh when you assemble.",
    substitutionTip: "Dairy-free? Grill firm tofu or tempeh in the same way for a similar golden crust."
  },
  {
    id: "sal07", name: "Quinoa Cranberry Almond Salad", cuisine: "Global", mealType: "lunch",
    prepTime: 10, cookTime: 0, difficulty: "quick",
    servings: 2,
    equipment: [],
    phases: ["ovulatory", "follicular"], goal: ["lose", "maintain"],
    dietTags: ["vegan", "gluten-free"], allergens: ["nuts"],
    macros: { calories: 380, protein: 12, carbs: 50, fat: 16 },
    micros: { fibre: 8, vitaminC: 6, magnesium: 55 },
    ingredients: [
      { name: "Cooked quinoa (cooled)", quantity: "1 cup" },
      { name: "Dried cranberries", quantity: "2 tbsp" },
      { name: "Toasted almonds", quantity: "3 tbsp" },
      { name: "Baby spinach", quantity: "2 cups" },
      { name: "Apple", quantity: "1, diced" },
      { name: "Balsamic dressing", quantity: "2 tbsp - tap in steps to make it" }
    ],
    steps: [
      "Toss cooled **quinoa** with **baby spinach**, **apple**, **dried cranberries** and **toasted almonds**.",
      "Dress with [[balsamic dressing]] and fold gently.",
      "Serve right away or chill until ready to eat."
    ],
    batchTip: "Holds well dressed for a day - keep the almonds separate and add on serving so they stay crunchy.",
    substitutionTip: "Nut-free? Swap almonds for toasted sunflower or pumpkin seeds."
  },
  {
    id: "sal08", name: "Greek Orzo Salad", cuisine: "Mediterranean", mealType: "lunch",
    prepTime: 15, cookTime: 10, difficulty: "easy",
    servings: 2,
    equipment: ["Pot"],
    phases: ["follicular", "ovulatory"], goal: ["maintain"],
    dietTags: ["vegetarian"], allergens: ["dairy"],
    macros: { calories: 430, protein: 15, carbs: 52, fat: 18 },
    micros: { calcium: 140, vitaminC: 20, fibre: 5 },
    ingredients: [
      { name: "Orzo", quantity: "1 cup" },
      { name: "Feta", quantity: "60g" },
      { name: "Cherry tomatoes", quantity: "1 cup, halved" },
      { name: "Cucumber", quantity: "1, diced" },
      { name: "Kalamata olives", quantity: "1/4 cup" },
      { name: "Red onion", quantity: "1/4, finely diced" },
      { name: "Lemon herb dressing", quantity: "2 tbsp - tap in steps to make it" }
    ],
    steps: [
      "Cook **orzo** in salted water until just tender, then rinse under cold water and drain well.",
      "Toss with **cherry tomatoes**, **cucumber**, **kalamata olives** and **red onion**.",
      "Crumble over **feta** and dress with [[lemon herb dressing]]."
    ],
    batchTip: "Travels well and improves after an hour - dress and chill, then loosen with a little oil before serving.",
    substitutionTip: "Gluten-free? Use rice or a small gluten-free pasta and drop the wheat orzo."
  },
  {
    id: "sal09", name: "Roasted Beet & Orange Salad", cuisine: "Nordic", mealType: "lunch",
    prepTime: 10, cookTime: 0, difficulty: "quick",
    phases: ["menstrual", "follicular"], goal: ["lose", "maintain"],
    dietTags: ["vegan", "gluten-free"], allergens: [],
    servings: 2,
    equipment: ["Small dry pan"],
    macros: { calories: 240, protein: 6, carbs: 34, fat: 10 },
    micros: { iron: 3, vitaminC: 30, fibre: 7 },
    ingredients: [
      { name: "Cooked beetroot", quantity: "2 medium (vacuum-packed), sliced" },
      { name: "Orange", quantity: "2, segmented" },
      { name: "Arugula", quantity: "2 cups" },
      { name: "Sunflower seeds", quantity: "2 tbsp" },
      { name: "Olive oil", quantity: "1 tbsp" },
      { name: "Balsamic glaze", quantity: "1 tbsp - tap in steps to make it" },
    ],
    steps: [
      "Bed the **arugula** across a serving platter.",
      "Fan the **cooked beetroot** and **orange** segments over the leaves, squeezing any orange offcuts on top for extra juice.",
      "Toast the **sunflower seeds** in a dry pan over medium heat for 2-3 min until fragrant, then scatter over.",
      "Whisk the **olive oil** with a pinch of salt, drizzle over with the [[balsamic glaze]] and serve.",
    ],
    batchTip: "Slice the beets and segment the oranges a day ahead; keep chilled and dress just before serving so the leaves stay crisp.",
    substitutionTip: "Swap arugula for baby spinach, or add crumbled feta if you are not keeping it vegan.",
  },
  {
    id: "sal10", name: "Thai Green Papaya Salad", cuisine: "Asian", mealType: "lunch",
    prepTime: 15, cookTime: 0, difficulty: "easy",
    phases: ["ovulatory", "follicular"], goal: ["lose"],
    dietTags: ["vegan", "gluten-free"], allergens: [],
    servings: 2,
    equipment: ["Mortar and pestle (or large bowl)"],
    macros: { calories: 170, protein: 4, carbs: 30, fat: 5 },
    micros: { vitaminC: 70, fibre: 5, vitaminB6: 0.3 },
    ingredients: [
      { name: "Green papaya", quantity: "2 cups, shredded" },
      { name: "Cherry tomatoes", quantity: "1/2 cup, halved" },
      { name: "Green beans", quantity: "1/2 cup, cut into 2cm pieces" },
      { name: "Garlic", quantity: "1 clove" },
      { name: "Red chili", quantity: "1" },
      { name: "Lime juice", quantity: "2 tbsp" },
      { name: "Coconut sugar", quantity: "1 tsp" },
      { name: "Soy sauce", quantity: "1 tbsp (tamari for gluten-free)" },
    ],
    steps: [
      "Pound the **garlic** and **red chili** in a mortar to a rough paste.",
      "Add the **green beans** and **cherry tomatoes**, bruising lightly to release their juice.",
      "Stir in the **lime juice**, **coconut sugar** and **soy sauce** until the sugar dissolves.",
      "Add the **green papaya** and toss (or pound gently) to coat; taste for a hot-sour-salty-sweet balance and serve at once.",
    ],
    batchTip: "Shred the papaya ahead and hold it in cold water in the fridge for up to a day; drain well before dressing.",
    substitutionTip: "No green papaya? Use shredded carrot and cucumber, or firm green mango. Use tamari to keep it gluten-free.",
  },
  {
    id: "sal11", name: "Arugula, Pear & Walnut Salad", cuisine: "Mediterranean", mealType: "lunch",
    prepTime: 10, cookTime: 0, difficulty: "quick",
    phases: ["follicular", "ovulatory", "luteal"], goal: ["lose", "maintain"],
    dietTags: ["vegetarian", "gluten-free"], allergens: ["nuts", "dairy"],
    servings: 2,
    equipment: ["Small dry pan"],
    macros: { calories: 320, protein: 10, carbs: 24, fat: 22 },
    micros: { calcium: 120, fibre: 5, omega3: 0.8 },
    ingredients: [
      { name: "Arugula", quantity: "3 cups" },
      { name: "Pear", quantity: "1, thinly sliced" },
      { name: "Walnuts", quantity: "1/4 cup" },
      { name: "Gorgonzola or goat cheese", quantity: "30 g" },
      { name: "Honey balsamic dressing", quantity: "2 tbsp - tap in steps to make it" },
    ],
    steps: [
      "Toast the **walnuts** in a dry pan over medium heat for 3-4 min until fragrant, then roughly chop.",
      "Arrange the **arugula** and **pear** slices across a plate.",
      "Scatter over the walnuts and crumble on the **gorgonzola or goat cheese**.",
      "Drizzle with [[honey balsamic dressing]] and finish with a crack of black pepper.",
    ],
    batchTip: "Toast a jar of walnuts at once - they keep in an airtight tin for a week and are ready to scatter.",
    substitutionTip: "Swap pear for fig or crisp apple, and use toasted pecans if you prefer a softer nut.",
  },
  {
    id: "sal12", name: "Mediterranean Tuna & White Bean Salad", cuisine: "Mediterranean", mealType: "lunch",
    prepTime: 10, cookTime: 0, difficulty: "quick",
    phases: ["luteal", "menstrual"], goal: ["lose", "maintain"],
    dietTags: ["pescatarian", "gluten-free"], allergens: [],
    servings: 2,
    equipment: [],
    macros: { calories: 380, protein: 34, carbs: 28, fat: 14 },
    micros: { omega3: 1.2, iron: 4, fibre: 8 },
    ingredients: [
      { name: "Canned tuna in olive oil", quantity: "140 g, drained" },
      { name: "Cannellini beans", quantity: "1 cup, rinsed" },
      { name: "Red onion", quantity: "1/4, thinly sliced" },
      { name: "Cherry tomatoes", quantity: "1 cup, halved" },
      { name: "Fresh parsley", quantity: "1/4 cup, chopped" },
      { name: "Lemon", quantity: "1/2, juiced" },
      { name: "Olive oil", quantity: "2 tbsp" },
    ],
    steps: [
      "Soften the **red onion** in the juice of the **lemon** for 5 min to take off its raw bite.",
      "Flake the **canned tuna** into a bowl with the **cannellini beans**.",
      "Add the **cherry tomatoes**, **parsley** and the lemony onion.",
      "Drizzle with **olive oil**, season well and fold together gently to keep the beans intact.",
    ],
    batchTip: "Keeps in the fridge for 2 days and the flavour only deepens - a perfect make-ahead lunch.",
    substitutionTip: "Swap tuna for canned salmon or chickpeas, and cannellini for butter beans.",
  },
  {
    id: "sal13", name: "Southwest Chicken Salad", cuisine: "Latin", mealType: "lunch",
    prepTime: 12, cookTime: 10, difficulty: "easy",
    phases: ["follicular", "ovulatory"], goal: ["lose", "gain"],
    dietTags: ["gluten-free", "halal"], allergens: ["dairy"],
    servings: 2,
    equipment: ["Grill pan or skillet"],
    macros: { calories: 420, protein: 36, carbs: 24, fat: 18 },
    micros: { vitaminC: 22, fibre: 8, iron: 3 },
    ingredients: [
      { name: "Chicken breast", quantity: "1 (150 g)" },
      { name: "Cumin & smoked paprika", quantity: "1/2 tsp each" },
      { name: "Olive oil", quantity: "1 tsp" },
      { name: "Romaine lettuce", quantity: "3 cups, chopped" },
      { name: "Corn", quantity: "1/2 cup" },
      { name: "Black beans", quantity: "1/2 cup, rinsed" },
      { name: "Cheddar", quantity: "30 g, shredded" },
      { name: "Avocado", quantity: "1/2, sliced" },
      { name: "Chipotle lime dressing", quantity: "2 tbsp - tap in steps to make it" },
    ],
    steps: [
      "Rub the **chicken breast** with the **olive oil**, **cumin & smoked paprika** and a pinch of salt.",
      "Grill in a hot pan for 5-6 min per side until cooked through (74°C); rest 5 min, then slice.",
      "Build a bowl of **romaine**, **corn**, **black beans**, **cheddar** and **avocado**.",
      "Top with the sliced chicken and drizzle with [[chipotle lime dressing]].",
    ],
    batchTip: "Grill two chicken breasts at once - the second slices cold into tomorrow's salad or wrap.",
    substitutionTip: "No chipotle? Stir a little smoked paprika and hot sauce into the dressing instead.",
  },
  {
    id: "sal14", name: "Vietnamese Rice Noodle Salad", cuisine: "Asian", mealType: "lunch",
    prepTime: 20, cookTime: 5, difficulty: "easy",
    phases: ["follicular", "ovulatory"], goal: ["lose", "maintain"],
    dietTags: ["vegan", "gluten-free"], allergens: [],
    servings: 2,
    equipment: ["Small pot"],
    macros: { calories: 360, protein: 10, carbs: 58, fat: 10 },
    micros: { vitaminC: 24, fibre: 6, vitaminB6: 0.4 },
    ingredients: [
      { name: "Rice vermicelli noodles", quantity: "100 g" },
      { name: "Carrots", quantity: "1/2 cup, shredded" },
      { name: "Cucumber", quantity: "1, julienned" },
      { name: "Fresh mint & basil", quantity: "1/4 cup each" },
      { name: "Sesame seeds", quantity: "1 tbsp" },
      { name: "Lime soy dressing", quantity: "3 tbsp - tap in steps to make it" },
    ],
    steps: [
      "Soak or boil the **rice vermicelli noodles** per pack (about 4-5 min), then rinse under cold water and drain well.",
      "Toss the noodles with the **carrots**, **cucumber**, **mint** and **basil**.",
      "Dress with [[lime soy dressing]] and toss until everything is glossy.",
      "Scatter over the toasted **sesame seeds** and serve at room temperature.",
    ],
    batchTip: "Cook the noodles and prep the veg ahead; keep them separate and toss with dressing just before eating so the noodles stay springy.",
    substitutionTip: "Use tamari for gluten-free, and swap in glass or rice noodles if that is what you have.",
  },
  {
    id: "sal15", name: "Spinach Strawberry & Feta Salad", cuisine: "Mediterranean", mealType: "lunch",
    prepTime: 10, cookTime: 0, difficulty: "quick",
    phases: ["follicular", "ovulatory"], goal: ["lose", "maintain"],
    dietTags: ["vegetarian", "gluten-free"], allergens: ["dairy"],
    servings: 2,
    equipment: ["Small dry pan"],
    macros: { calories: 260, protein: 9, carbs: 24, fat: 14 },
    micros: { vitaminC: 56, calcium: 140, fibre: 5 },
    ingredients: [
      { name: "Baby spinach", quantity: "3 cups" },
      { name: "Strawberries", quantity: "1 cup, sliced" },
      { name: "Feta", quantity: "40 g" },
      { name: "Red onion", quantity: "1/4, thinly sliced" },
      { name: "Sunflower seeds", quantity: "2 tbsp" },
      { name: "Balsamic glaze", quantity: "2 tbsp - tap in steps to make it" },
    ],
    steps: [
      "Toast the **sunflower seeds** in a dry pan over medium heat for 2-3 min until golden.",
      "Arrange the **baby spinach** with the **strawberries** and **red onion**.",
      "Crumble the **feta** over the top and scatter with the toasted seeds.",
      "Drizzle with [[balsamic glaze]] just before serving.",
    ],
    batchTip: "Slice the strawberries and onion ahead, but dress and add the seeds only at the last minute to keep everything crisp.",
    substitutionTip: "Blueberries or sliced peach work in place of strawberries; use goat cheese instead of feta.",
  },

  // ───────── Batch 4 — Dinner (+15) ─────────
  {
    id: "d25", name: "One-Pan Lemon Herb Chicken & Roasted Veg", cuisine: "Mediterranean", mealType: "dinner",
    prepTime: 10, cookTime: 35, difficulty: "easy",
    servings: 2,
    equipment: ["Roasting tray"],
    phases: ["follicular", "ovulatory"], goal: ["maintain", "gain"],
    dietTags: ["gluten-free", "halal"], allergens: [],
    macros: { calories: 460, protein: 38, carbs: 22, fat: 22 },
    micros: { vitaminC: 40, iron: 3, fibre: 6 },
    ingredients: [
      { name: "Chicken thighs", quantity: "250g" },
      { name: "Cherry tomatoes", quantity: "1 cup" },
      { name: "Zucchini", quantity: "1, sliced" },
      { name: "Bell pepper", quantity: "1, in chunks" },
      { name: "Garlic", quantity: "4 cloves, smashed" },
      { name: "Lemon", quantity: "1" },
      { name: "Herbs de Provence & olive oil", quantity: "1 tbsp / 2 tbsp" }
    ],
    steps: [
      "Heat oven to 200°C. Toss **zucchini**, **bell pepper**, **cherry tomatoes** and **garlic** on a tray with **olive oil**, the juice of half the **lemon** and salt.",
      "Rub the **chicken thighs** with **herbs de Provence**, nestle skin-up among the veg and lay lemon slices around.",
      "Roast 30-35 min until the chicken is golden and cooked through (75°C) and the tomatoes are blistered.",
      "Rest 5 min, then spoon the pan juices over everything to serve."
    ],
    batchTip: "Roast extra veg and shred any leftover chicken into wraps or salads the next day.",
    substitutionTip: "Chicken breast works - reduce to 22-25 min so it stays juicy; add new potatoes for a heartier plate."
  },
  {
    id: "d26", name: "Shrimp Tacos with Mango Salsa", cuisine: "Latin", mealType: "dinner",
    prepTime: 15, cookTime: 8, difficulty: "easy",
    servings: 2,
    equipment: ["Frying pan"],
    phases: ["ovulatory", "follicular"], goal: ["lose", "maintain"],
    dietTags: ["gluten-free"], allergens: ["shellfish"],
    macros: { calories: 420, protein: 28, carbs: 44, fat: 14 },
    micros: { vitaminC: 36, iron: 2, fibre: 6 },
    ingredients: [
      { name: "Shrimp", quantity: "200g, peeled & deveined" },
      { name: "Corn tortillas", quantity: "6 small" },
      { name: "Mango", quantity: "1/2, diced" },
      { name: "Red onion", quantity: "1/4, finely diced" },
      { name: "Cilantro", quantity: "1/4 cup, chopped" },
      { name: "Shredded cabbage", quantity: "1 cup" },
      { name: "Lime", quantity: "1, juiced" },
      { name: "Cumin & chipotle sauce", quantity: "1/2 tsp / 1 tbsp" },
      { name: "Olive oil", quantity: "1 tbsp" }
    ],
    steps: [
      "Pat the **shrimp** dry, toss with **cumin**, salt and pepper. Sear in **olive oil** over high heat 2 min a side until pink and lightly charred.",
      "Make the [[mango salsa]]: combine **mango**, **red onion**, **cilantro** and half the **lime** juice.",
      "Dress the **shredded cabbage** with the remaining lime juice and a pinch of salt.",
      "Warm the **corn tortillas** in a dry pan, then load with cabbage, shrimp, mango salsa and a drizzle of **chipotle sauce**."
    ],
    batchTip: "Make the salsa and slaw a few hours ahead; cook the shrimp fresh so they stay tender.",
    substitutionTip: "Shellfish-free? Swap in strips of white fish or chicken; pineapple works in place of mango."
  },
  {
    id: "d27", name: "Cauliflower Tikka Masala", cuisine: "Asian", mealType: "dinner",
    prepTime: 15, cookTime: 30, difficulty: "easy",
    servings: 2,
    equipment: ["Wide pan", "Small pot"],
    phases: ["follicular", "ovulatory", "menstrual"], goal: ["lose", "maintain"],
    dietTags: ["vegan", "gluten-free"], allergens: [],
    macros: { calories: 380, protein: 12, carbs: 44, fat: 18 },
    micros: { iron: 3, fibre: 10, vitaminC: 70 },
    ingredients: [
      { name: "Cauliflower", quantity: "1 head, in florets" },
      { name: "Coconut milk", quantity: "1 cup" },
      { name: "Crushed tomatoes", quantity: "1 cup" },
      { name: "Tikka masala paste", quantity: "2 tbsp" },
      { name: "Onion, garlic & ginger", quantity: "1 / 2 cloves / 1 tbsp grated" },
      { name: "Coconut oil", quantity: "1 tbsp" },
      { name: "Brown rice", quantity: "1/2 cup dry" },
      { name: "Fresh cilantro", quantity: "to garnish" }
    ],
    steps: [
      "Cook the **brown rice**. Meanwhile soften the **onion** in **coconut oil** over medium heat 5 min, then add **garlic**, **ginger** and **tikka masala paste**; fry 2 min until fragrant.",
      "Stir in the **crushed tomatoes** and **coconut milk** and bring to a gentle simmer.",
      "Add the **cauliflower**, cover and simmer 18-20 min, stirring once, until the florets are tender and the sauce clings.",
      "Season, garnish with **cilantro** and serve over the rice."
    ],
    batchTip: "Even better next day and freezes for a month - the cauliflower drinks up the spice.",
    substitutionTip: "Add a can of drained chickpeas for extra protein; swap cauliflower for paneer if not vegan."
  },
  {
    id: "d28", name: "Salmon Teriyaki with Broccoli", cuisine: "Asian", mealType: "dinner",
    prepTime: 10, cookTime: 18, difficulty: "easy",
    servings: 1,
    equipment: ["Baking tray", "Small bowl"],
    phases: ["luteal", "menstrual"], goal: ["maintain", "gain"],
    dietTags: ["pescatarian", "gluten-free"], allergens: [],
    macros: { calories: 450, protein: 36, carbs: 30, fat: 20 },
    micros: { omega3: 2.0, vitaminD: 350, iron: 2 },
    ingredients: [
      { name: "Salmon fillet", quantity: "180g, skin-on" },
      { name: "Broccoli", quantity: "2 cups, florets" },
      { name: "Olive oil", quantity: "1 tbsp" },
      { name: "Brown rice", quantity: "1 cup, cooked" },
      { name: "Sesame seeds", quantity: "1 tbsp" },
      { name: "Spring onion", quantity: "2, sliced" },
      { name: "Teriyaki sauce", quantity: "2 tbsp - tap in steps to make it" },
    ],
    steps: [
      "Whisk up a quick [[teriyaki sauce]] and brush half over the **salmon**; leave to marinate 5 min.",
      "Toss **broccoli** florets in **olive oil** and spread on a lined **baking tray** with the salmon, skin-side down.",
      "Bake at 200°C for 12-15 min until the salmon flakes and the broccoli edges char, brushing on the rest of the glaze halfway.",
      "Serve over warm **brown rice** and scatter with **sesame seeds** and **spring onion**.",
    ],
    batchTip: "Cook a double batch of rice and keep it fridge-cold for up to 3 days - it reheats better than fresh.",
    substitutionTip: "Swap salmon for firm tofu, patted dry, for a vegan version (bake 20 min).",
  },
  {
    id: "d29", name: "Pesto Chicken with Roasted Tomatoes", cuisine: "Mediterranean", mealType: "dinner",
    prepTime: 10, cookTime: 25, difficulty: "easy",
    servings: 1,
    equipment: ["Baking tray"],
    phases: ["follicular", "ovulatory"], goal: ["maintain", "gain"],
    dietTags: ["gluten-free"], allergens: ["dairy", "nuts"],
    macros: { calories: 470, protein: 40, carbs: 14, fat: 28 },
    micros: { calcium: 100, vitaminC: 22, iron: 2 },
    ingredients: [
      { name: "Chicken breast", quantity: "180g" },
      { name: "Basil pesto", quantity: "2 tbsp - tap in steps to make it" },
      { name: "Cherry tomatoes", quantity: "1 cup" },
      { name: "Mozzarella", quantity: "40g, sliced" },
      { name: "Zucchini", quantity: "1, sliced into rounds" },
      { name: "Olive oil", quantity: "1 tbsp" },
      { name: "Salt & pepper", quantity: "to taste" },
    ],
    steps: [
      "Coat the **chicken breast** all over in [[pesto]] and set on a lined **baking tray**.",
      "Toss **zucchini** rounds and **cherry tomatoes** with **olive oil**, season with **salt & pepper** and scatter alongside.",
      "Bake at 190°C for 20 min, then lay **mozzarella** over the chicken for a final 3 min until melted and the tomatoes burst.",
      "Rest 3 min, then serve with the roasted zucchini and tomatoes spooned around.",
    ],
    batchTip: "Marinate the chicken in pesto the night before - the flavour deepens and it goes straight in the oven.",
    substitutionTip: "Use dairy-free pesto and skip the mozzarella to make it dairy-free.",
  },
  {
    id: "d30", name: "Lamb Chops with Tabbouleh", cuisine: "Middle Eastern", mealType: "dinner",
    prepTime: 15, cookTime: 15, difficulty: "easy",
    servings: 1,
    equipment: ["Griddle pan or grill", "Mixing bowl"],
    phases: ["menstrual", "luteal"], goal: ["gain"],
    dietTags: ["halal"], allergens: [],
    macros: { calories: 520, protein: 36, carbs: 34, fat: 26 },
    micros: { iron: 5, vitaminC: 24, fibre: 6 },
    ingredients: [
      { name: "Lamb chops", quantity: "2 (about 200g total)" },
      { name: "Garlic", quantity: "2 cloves, minced" },
      { name: "Fresh rosemary", quantity: "2 sprigs, leaves chopped" },
      { name: "Bulgur wheat", quantity: "1/2 cup, cooked" },
      { name: "Flat-leaf parsley", quantity: "1 cup, finely chopped" },
      { name: "Fresh mint", quantity: "1/4 cup, finely chopped" },
      { name: "Ripe tomato", quantity: "1, finely diced" },
      { name: "Cucumber", quantity: "1/2, finely diced" },
      { name: "Lemon juice", quantity: "2 tbsp, freshly squeezed" },
      { name: "Olive oil", quantity: "2 tbsp" },
      { name: "Salt & pepper", quantity: "to taste" },
    ],
    steps: [
      "Rub the **lamb chops** with **garlic**, **rosemary**, 1 tbsp of the **olive oil** and **salt & pepper**; marinate 10 min.",
      "Sear on a hot griddle 4-5 min per side until charred and cooked to your liking, then rest 3 min.",
      "Toss the **bulgur wheat** with **parsley**, **mint**, **tomato**, **cucumber**, **lemon juice** and the remaining olive oil; season well.",
      "Pile the tabbouleh onto a plate and lean the chops alongside.",
    ],
    batchTip: "The tabbouleh keeps 2 days chilled and tastes even better as the flavours mingle.",
    substitutionTip: "No bulgur? Use cooked quinoa or couscous - or cauliflower rice to keep it gluten-free.",
  },
  {
    id: "d31", name: "Dal Makhani", cuisine: "Asian", mealType: "dinner",
    prepTime: 10, cookTime: 40, difficulty: "easy",
    servings: 2,
    equipment: ["Large pot", "Frying pan"],
    phases: ["menstrual", "luteal"], goal: ["maintain"],
    dietTags: ["vegetarian", "gluten-free"], allergens: ["dairy"],
    macros: { calories: 440, protein: 18, carbs: 56, fat: 16 },
    micros: { iron: 7, fibre: 14, magnesium: 70 },
    ingredients: [
      { name: "Whole black lentils (urad dal)", quantity: "1 cup, soaked overnight" },
      { name: "Kidney beans", quantity: "1/4 cup, cooked" },
      { name: "Butter", quantity: "1 tbsp" },
      { name: "Tomato puree", quantity: "1/2 cup" },
      { name: "Cream", quantity: "2 tbsp" },
      { name: "Garam masala", quantity: "1 tsp" },
      { name: "Garlic", quantity: "3 cloves, minced" },
      { name: "Fresh ginger", quantity: "1 tbsp, grated" },
      { name: "Onion", quantity: "1, finely diced" },
      { name: "Cumin seeds", quantity: "1/2 tsp" },
    ],
    steps: [
      "Simmer the soaked **black lentils** and **kidney beans** in 3 cups fresh water until very tender, about 30 min.",
      "Melt **butter** in a pan with **cumin seeds**, then sauté **onion**, **garlic** and **ginger** until golden.",
      "Stir in **garam masala** and **tomato puree**, cook 5 min, then fold into the lentils and simmer 10 min, mashing lightly for a creamy body.",
      "Swirl through the **cream**, season and serve with naan or steamed rice.",
    ],
    batchTip: "Dal makhani deepens overnight - make it ahead and reheat gently with a splash of water.",
    substitutionTip: "Use coconut cream in place of dairy cream and oil for butter to make it vegan.",
  },
  {
    id: "d32", name: "Prawn & Coconut Curry", cuisine: "Asian", mealType: "dinner",
    prepTime: 10, cookTime: 20, difficulty: "easy",
    servings: 2,
    equipment: ["Wok or deep pan"],
    phases: ["ovulatory", "follicular"], goal: ["maintain", "gain"],
    dietTags: ["pescatarian", "gluten-free"], allergens: ["shellfish"],
    macros: { calories: 430, protein: 30, carbs: 32, fat: 22 },
    micros: { iron: 3, vitaminC: 16, omega3: 0.6 },
    ingredients: [
      { name: "Prawns", quantity: "200g, peeled and deveined" },
      { name: "Coconut milk", quantity: "1 cup" },
      { name: "Red or yellow curry paste", quantity: "2 tbsp" },
      { name: "Bell pepper", quantity: "1, sliced" },
      { name: "Onion", quantity: "1, diced" },
      { name: "Garlic", quantity: "2 cloves, minced" },
      { name: "Coconut oil", quantity: "1 tbsp" },
      { name: "Jasmine rice", quantity: "1 cup, cooked" },
      { name: "Lime", quantity: "1, to serve" },
      { name: "Fresh cilantro", quantity: "to garnish" },
    ],
    steps: [
      "Heat **coconut oil** in a wok and sauté **onion** and **garlic** 3 min, then fry the **curry paste** 1 min until fragrant.",
      "Pour in **coconut milk**, add the **bell pepper** and simmer 8-10 min until tender.",
      "Slip in the **prawns** and cook 3-4 min, just until pink and firm - don't overdo it.",
      "Serve over **jasmine rice** with **lime** wedges and a scatter of **cilantro**.",
    ],
    batchTip: "Make the sauce base ahead; add raw prawns only when reheating so they stay tender.",
    substitutionTip: "Swap prawns for chickpeas or firm tofu to make it vegan.",
  },
  {
    id: "d33", name: "Baked Feta Pasta", cuisine: "Mediterranean", mealType: "dinner",
    prepTime: 10, cookTime: 35, difficulty: "easy",
    servings: 2,
    equipment: ["Baking dish", "Pot"],
    phases: ["follicular", "ovulatory"], goal: ["maintain", "gain"],
    dietTags: ["vegetarian"], allergens: ["dairy"],
    macros: { calories: 510, protein: 20, carbs: 56, fat: 22 },
    micros: { calcium: 200, vitaminC: 24, fibre: 5 },
    ingredients: [
      { name: "Feta block", quantity: "200g" },
      { name: "Cherry tomatoes", quantity: "400g" },
      { name: "Penne or rigatoni", quantity: "100g" },
      { name: "Garlic", quantity: "4 cloves" },
      { name: "Olive oil", quantity: "3 tbsp" },
      { name: "Fresh basil & chili flakes", quantity: "to taste" },
    ],
    steps: [
      "Nestle the **feta** block in a **baking dish**, surround with **cherry tomatoes** and **garlic**, then drizzle everything with **olive oil**.",
      "Bake at 200°C for 30 min until the tomatoes blister and the feta turns soft and golden.",
      "Meanwhile cook the **penne** until al dente, saving a mugful of pasta water.",
      "Mash the feta and tomatoes into a glossy sauce, loosen with pasta water, fold through the pasta and finish with **basil & chili flakes**.",
    ],
    batchTip: "Leftovers reheat well with a splash of water - the sauce tightens as it cools.",
    substitutionTip: "Use gluten-free pasta to make it coeliac-friendly, or a firm vegan feta for dairy-free.",
  },
  {
    id: "d34", name: "Chimichurri Beef Rice Bowl", cuisine: "Latin", mealType: "dinner",
    prepTime: 15, cookTime: 15, difficulty: "easy",
    servings: 1,
    equipment: ["Griddle pan or grill"],
    phases: ["menstrual", "luteal"], goal: ["gain"],
    dietTags: ["halal", "gluten-free"], allergens: [],
    macros: { calories: 530, protein: 36, carbs: 44, fat: 22 },
    micros: { iron: 5, vitaminC: 14, fibre: 4 },
    ingredients: [
      { name: "Sirloin steak", quantity: "180g" },
      { name: "Chimichurri", quantity: "3 tbsp - tap in steps to make it" },
      { name: "Brown rice", quantity: "1 cup, cooked" },
      { name: "Roasted peppers", quantity: "1/2 cup, sliced" },
      { name: "Avocado", quantity: "1/4, sliced" },
      { name: "Salt & pepper", quantity: "to taste" },
    ],
    steps: [
      "Season the **sirloin steak** with **salt & pepper** and grill 3-4 min per side; rest 5 min, then slice thinly across the grain.",
      "Spoon warm **brown rice** into a bowl with the **roasted peppers** and sliced **avocado**.",
      "Lay the steak over the top and spoon [[chimichurri]] generously across.",
    ],
    batchTip: "Chimichurri keeps a week in the fridge and doubles as a marinade for the next batch of steak.",
    substitutionTip: "Swap sirloin for grilled portobello or halloumi for a vegetarian bowl.",
  },
  {
    id: "d35", name: "Spinach & Ricotta Stuffed Pasta Shells", cuisine: "Mediterranean", mealType: "dinner",
    prepTime: 20, cookTime: 30, difficulty: "medium",
    servings: 2,
    equipment: ["Baking dish", "Pot"],
    phases: ["follicular", "ovulatory"], goal: ["maintain"],
    dietTags: ["vegetarian"], allergens: ["dairy", "eggs"],
    macros: { calories: 460, protein: 22, carbs: 46, fat: 20 },
    micros: { calcium: 280, vitaminC: 12, fibre: 5 },
    ingredients: [
      { name: "Jumbo pasta shells", quantity: "8" },
      { name: "Ricotta", quantity: "150g" },
      { name: "Baby spinach", quantity: "1 cup" },
      { name: "Parmesan", quantity: "3 tbsp, grated" },
      { name: "Egg", quantity: "1" },
      { name: "Tomato sauce", quantity: "1 cup" },
      { name: "Mozzarella", quantity: "40g, grated" },
    ],
    steps: [
      "Boil the **jumbo pasta shells** until just pliable, about 8 min, then drain and cool.",
      "Wilt the **baby spinach**, squeeze it dry and mix with **ricotta**, **parmesan** and **egg**; season.",
      "Spoon the filling into the shells and set them over a layer of **tomato sauce** in a **baking dish**.",
      "Top with the remaining sauce and **mozzarella**, then bake at 190°C for 25 min until golden and bubbling.",
    ],
    batchTip: "Assemble fully and freeze unbaked; bake from frozen at 190°C for 40-45 min.",
    substitutionTip: "Use gluten-free shells, or swap ricotta for mashed silken tofu to cut dairy.",
  },
  {
    id: "d36", name: "Teriyaki Tempeh with Bok Choy", cuisine: "Asian", mealType: "dinner",
    prepTime: 10, cookTime: 18, difficulty: "easy",
    servings: 2,
    equipment: ["Non-stick pan", "Steamer"],
    phases: ["follicular", "ovulatory"], goal: ["lose", "maintain"],
    dietTags: ["vegan"], allergens: ["soy"],
    macros: { calories: 390, protein: 24, carbs: 38, fat: 16 },
    micros: { iron: 4, calcium: 150, fibre: 6 },
    ingredients: [
      { name: "Tempeh", quantity: "200g, sliced" },
      { name: "Teriyaki sauce", quantity: "3 tbsp - tap in steps to make it" },
      { name: "Bok choy", quantity: "2 heads, halved" },
      { name: "Brown rice", quantity: "1 cup, cooked" },
      { name: "Sesame oil", quantity: "1 tsp" },
      { name: "Sesame seeds", quantity: "1 tbsp" },
    ],
    steps: [
      "Pan-fry the **tempeh** slices in **sesame oil** until golden and crisp on both sides.",
      "Pour in [[teriyaki sauce]] and let it bubble and caramelise around the tempeh.",
      "Steam the **bok choy** just until tender-crisp, about 3 min.",
      "Serve the tempeh over **brown rice** with the bok choy and a scatter of **sesame seeds**.",
    ],
    batchTip: "Steam and glaze the tempeh ahead - it reheats well and firms up nicely.",
    substitutionTip: "Use tamari-based teriyaki to keep it gluten-free, or firm tofu in place of tempeh.",
  },
  {
    id: "d37", name: "Grilled Sea Bass with Lemon & Herbs", cuisine: "Mediterranean", mealType: "dinner",
    prepTime: 10, cookTime: 15, difficulty: "easy",
    servings: 2,
    equipment: ["Non-stick pan", "Baking tray"],
    phases: ["ovulatory", "follicular"], goal: ["lose", "maintain"],
    dietTags: ["pescatarian", "gluten-free"], allergens: [],
    macros: { calories: 360, protein: 38, carbs: 8, fat: 18 },
    micros: { omega3: 1.2, vitaminD: 280, fibre: 3 },
    ingredients: [
      { name: "Sea bass fillets", quantity: "2 (180g total)" },
      { name: "Lemon", quantity: "1" },
      { name: "Capers", quantity: "1 tbsp" },
      { name: "Fresh dill & parsley", quantity: "to taste" },
      { name: "Olive oil", quantity: "1 tbsp" },
      { name: "Cherry tomatoes", quantity: "1 cup" },
      { name: "Green beans", quantity: "1 cup, trimmed" },
    ],
    steps: [
      "Roast the **cherry tomatoes** on a **baking tray** with a little oil at 200°C for 12 min until blistered.",
      "Score the **sea bass** skin, season and rub with **dill & parsley** and **lemon** zest.",
      "Sear skin-side down in **olive oil** for 4 min until crisp, then flip and cook 2 min more; finish with **capers** and a squeeze of lemon.",
      "Steam the **green beans** and serve with the fish and roasted tomatoes.",
    ],
    batchTip: "Roast the tomatoes in bulk - they keep 3 days and lift any grain bowl or salad.",
    substitutionTip: "Any firm white fillet works - try sea bream, snapper or cod.",
  },
  {
    id: "d38", name: "One-Pot Chicken & Chickpea Stew", cuisine: "Middle Eastern", mealType: "dinner",
    prepTime: 10, cookTime: 35, difficulty: "easy",
    servings: 2,
    equipment: ["Heavy pot or Dutch oven"],
    phases: ["menstrual", "luteal", "follicular"], goal: ["maintain", "lose"],
    dietTags: ["halal", "gluten-free"], allergens: [],
    macros: { calories: 450, protein: 36, carbs: 38, fat: 16 },
    micros: { iron: 5, fibre: 10, vitaminC: 22 },
    ingredients: [
      { name: "Chicken thighs", quantity: "250g, bone-in or boneless" },
      { name: "Chickpeas", quantity: "1 cup, cooked" },
      { name: "Canned tomatoes", quantity: "1 cup, crushed" },
      { name: "Onion", quantity: "1, diced" },
      { name: "Garlic", quantity: "2 cloves, minced" },
      { name: "Ras el hanout", quantity: "1 tbsp" },
      { name: "Preserved lemon", quantity: "1 tbsp, rind finely sliced" },
      { name: "Olive oil", quantity: "1 tbsp" },
      { name: "Vegetable broth", quantity: "1 cup" },
      { name: "Fresh parsley or cilantro", quantity: "to garnish" },
    ],
    steps: [
      "Brown the **chicken thighs** in **olive oil** in a heavy pot, about 4 min per side, then set aside.",
      "Soften the **onion** and **garlic** in the same pot, then stir in **ras el hanout** for 1 min until fragrant.",
      "Return the chicken with **chickpeas**, **canned tomatoes**, **preserved lemon** and **vegetable broth**; cover and simmer 25 min.",
      "Scatter with **parsley or cilantro** and serve.",
    ],
    batchTip: "This stew tastes even better next day and freezes well for up to a month.",
    substitutionTip: "No preserved lemon? Use a strip of fresh lemon zest plus a pinch of salt.",
  },
  {
    id: "d39", name: "Black Bean & Corn Enchilada Casserole", cuisine: "Latin", mealType: "dinner",
    prepTime: 15, cookTime: 30, difficulty: "easy",
    servings: 2,
    equipment: ["Baking dish", "Mixing bowl"],
    phases: ["luteal", "menstrual"], goal: ["maintain"],
    dietTags: ["vegetarian", "gluten-free"], allergens: ["dairy"],
    macros: { calories: 460, protein: 18, carbs: 58, fat: 16 },
    micros: { fibre: 14, iron: 4, calcium: 140 },
    ingredients: [
      { name: "Black beans", quantity: "1.5 cups, cooked" },
      { name: "Corn", quantity: "1/2 cup" },
      { name: "Bell pepper", quantity: "1, diced" },
      { name: "Cumin", quantity: "1 tsp" },
      { name: "Corn tortillas", quantity: "4" },
      { name: "Cheddar or Monterey Jack", quantity: "60g, grated" },
      { name: "Enchilada sauce", quantity: "1 cup - tap in steps to make it" },
    ],
    steps: [
      "Mix the **black beans**, **corn**, diced **bell pepper** and **cumin** in a bowl.",
      "Spread a little sauce in a **baking dish**, then layer **corn tortillas**, the bean mix, [[enchilada sauce]] and **cheddar**; repeat.",
      "Finish with sauce and cheese, then bake at 190°C for 25 min until bubbling and golden.",
    ],
    batchTip: "Assemble ahead and refrigerate up to a day before baking - add 5 min to the cook time.",
    substitutionTip: "Use a dairy-free cheese to make it fully vegan.",
  },

  // ───────── Batch 4 — Snacks (+20) ─────────
  {
    id: "s17", name: "Dark Chocolate Bark with Seeds & Berries", cuisine: "Global", mealType: "snack",
    prepTime: 10, cookTime: 5, difficulty: "easy",
    servings: 2,
    equipment: ["Small heatproof bowl", "Baking tray"],
    phases: ["luteal", "menstrual"], goal: ["maintain", "gain"],
    dietTags: ["vegan", "gluten-free"], allergens: [],
    macros: { calories: 220, protein: 4, carbs: 20, fat: 14 },
    micros: { magnesium: 55, iron: 2, fibre: 4 },
    ingredients: [
      { name: "Dark chocolate (70%+)", quantity: "70 g" },
      { name: "Pumpkin seeds", quantity: "2 tbsp" },
      { name: "Sunflower seeds", quantity: "1 tbsp" },
      { name: "Dried cranberries", quantity: "1 tbsp" }
    ],
    steps: [
      "Melt the **dark chocolate** gently over a pan of just-simmering water, stirring until smooth.",
      "Pour onto a baking-paper-lined tray and spread to an even 3-4 mm slab.",
      "Scatter over **pumpkin seeds**, **sunflower seeds** and **dried cranberries**, pressing them in lightly.",
      "Chill 30 min until firm, then snap into shards."
    ],
    batchTip: "Keeps 2 weeks in an airtight tin in the fridge - layer with baking paper so shards don't fuse.",
    substitutionTip: "Swap cranberries for chopped dried cherries or goji berries for extra iron."
  },
  {
    id: "s18", name: "Baked Parmesan Kale Chips", cuisine: "Mediterranean", mealType: "snack",
    prepTime: 8, cookTime: 15, difficulty: "easy",
    servings: 1,
    equipment: ["Baking tray"],
    phases: ["follicular", "ovulatory"], goal: ["lose"],
    dietTags: ["vegetarian", "gluten-free"], allergens: ["dairy"],
    macros: { calories: 120, protein: 6, carbs: 8, fat: 7 },
    micros: { vitaminC: 80, calcium: 80, fibre: 4 },
    ingredients: [
      { name: "Kale", quantity: "2 cups, torn from the stems" },
      { name: "Olive oil", quantity: "1 tsp" },
      { name: "Garlic powder", quantity: "1 pinch" },
      { name: "Parmesan", quantity: "2 tbsp, grated" }
    ],
    steps: [
      "Wash and thoroughly dry the **kale**, tearing it off the tough stems into bite-size pieces (dry leaves are what crisp up).",
      "Toss with **olive oil**, **garlic powder** and **parmesan** until evenly coated.",
      "Spread in a single layer on a lined tray and bake at 180°C for 10-12 min until crisp and just browning - watch closely."
    ],
    batchTip: "Best eaten the day they're made; re-crisp any softened chips for 2 min in a warm oven.",
    substitutionTip: "Dairy-free? Use 1 tbsp nutritional yeast instead of parmesan for the same savoury hit."
  },
  {
    id: "s19", name: "Almond Banana Protein Shake", cuisine: "Global", mealType: "snack",
    prepTime: 5, cookTime: 0, difficulty: "quick",
    servings: 1,
    equipment: ["Blender"],
    phases: ["follicular", "ovulatory", "luteal"], goal: ["gain"],
    dietTags: ["vegetarian", "gluten-free"], allergens: ["nuts", "dairy"],
    macros: { calories: 320, protein: 26, carbs: 30, fat: 10 },
    micros: { calcium: 250, magnesium: 50, fibre: 3 },
    ingredients: [
      { name: "Milk", quantity: "1 cup" },
      { name: "Vanilla protein powder", quantity: "1 scoop" },
      { name: "Banana", quantity: "1" },
      { name: "Almond butter", quantity: "1 tbsp" },
      { name: "Ice cubes", quantity: "a handful" }
    ],
    steps: [
      "Add **milk**, **vanilla protein powder**, **banana**, **almond butter** and a handful of **ice cubes** to a blender.",
      "Blend on high for 30-40 sec until thick and creamy.",
      "Pour into a tall glass and drink straight away."
    ],
    batchTip: "Freeze the banana in chunks the night before for a thicker, colder shake.",
    substitutionTip: "Nut or dairy allergy? Use oat milk and sunflower seed butter."
  },
  {
    id: "s20", name: "Warm Spiced Baked Apple", cuisine: "Nordic", mealType: "snack",
    prepTime: 5, cookTime: 20, difficulty: "easy",
    servings: 1,
    equipment: ["Small baking dish"],
    phases: ["luteal", "follicular"], goal: ["maintain", "lose"],
    dietTags: ["vegan", "gluten-free"], allergens: [],
    macros: { calories: 140, protein: 1, carbs: 34, fat: 2 },
    micros: { fibre: 5, vitaminC: 6, magnesium: 10 },
    ingredients: [
      { name: "Apple", quantity: "1 large" },
      { name: "Raisins", quantity: "1 tbsp" },
      { name: "Cinnamon", quantity: "1 tsp" },
      { name: "Nutmeg", quantity: "1 pinch" },
      { name: "Maple syrup", quantity: "1 tsp" }
    ],
    steps: [
      "Core the **apple**, leaving the base intact, and sit it in a small baking dish.",
      "Pack the cavity with **raisins**, **cinnamon** and a little **nutmeg**.",
      "Drizzle over the **maple syrup**, add a splash of water to the dish and bake at 180°C for 20 min until tender and bubbling."
    ],
    batchTip: "Bake two or three at once; they reheat beautifully in the microwave for 40 sec.",
    substitutionTip: "No raisins? Chopped dried apricots or dates work just as well."
  },
  {
    id: "s21", name: "Guacamole with Corn Chips", cuisine: "Latin", mealType: "snack",
    prepTime: 10, cookTime: 0, difficulty: "quick",
    servings: 1,
    equipment: [],
    phases: ["follicular", "ovulatory"], goal: ["maintain"],
    dietTags: ["vegan", "gluten-free"], allergens: [],
    macros: { calories: 260, protein: 4, carbs: 28, fat: 16 },
    micros: { vitaminC: 14, fibre: 8, vitaminB6: 0.4 },
    ingredients: [
      { name: "Avocado", quantity: "1 ripe" },
      { name: "Lime juice", quantity: "1 tbsp" },
      { name: "Red onion", quantity: "1/4, finely diced" },
      { name: "Fresh cilantro", quantity: "2 tbsp, chopped" },
      { name: "Corn tortilla chips", quantity: "1 oz (28 g)" }
    ],
    steps: [
      "Mash the **avocado** with **lime juice** and a pinch of salt, keeping it a little chunky.",
      "Fold through the **red onion** and **fresh cilantro**.",
      "Pile into a bowl and serve with **corn tortilla chips** for scooping."
    ],
    batchTip: "Press cling film onto the surface to stop browning - it keeps a few hours in the fridge.",
    substitutionTip: "Cilantro tastes soapy to you? Use chopped chives or flat-leaf parsley."
  },
  {
    id: "s22", name: "Cashew & Medjool Date Bites", cuisine: "Global", mealType: "snack",
    prepTime: 15, cookTime: 0, difficulty: "easy",
    servings: 2,
    equipment: ["Food processor"],
    phases: ["luteal", "menstrual"], goal: ["maintain", "gain"],
    dietTags: ["vegan", "gluten-free"], allergens: ["nuts"],
    macros: { calories: 240, protein: 5, carbs: 30, fat: 12 },
    micros: { magnesium: 45, iron: 2, fibre: 4 },
    ingredients: [
      { name: "Raw cashews", quantity: "1/4 cup" },
      { name: "Medjool dates", quantity: "4, pitted" },
      { name: "Vanilla extract", quantity: "1/2 tsp" },
      { name: "Sea salt", quantity: "1 pinch" }
    ],
    steps: [
      "Pulse the **raw cashews** to a fine crumb in a food processor.",
      "Add the **Medjool dates**, **vanilla extract** and a pinch of **sea salt**; blend until a sticky dough clumps together.",
      "Roll into 6 walnut-size balls and chill 30 min to firm up."
    ],
    batchTip: "Double the batch and freeze - they thaw in minutes and keep a month.",
    substitutionTip: "Nut-free? Use sunflower seeds in place of the cashews."
  },
  {
    id: "s23", name: "Smoked Salmon Cucumber Bites", cuisine: "Nordic", mealType: "snack",
    prepTime: 8, cookTime: 0, difficulty: "quick",
    servings: 1,
    equipment: [],
    phases: ["menstrual", "luteal"], goal: ["maintain", "lose"],
    dietTags: ["pescatarian", "gluten-free"], allergens: ["dairy"],
    macros: { calories: 150, protein: 14, carbs: 4, fat: 8 },
    micros: { omega3: 1.4, calcium: 60, fibre: 1 },
    ingredients: [
      { name: "Cucumber", quantity: "1 large" },
      { name: "Cream cheese", quantity: "30 g" },
      { name: "Smoked salmon", quantity: "60 g" },
      { name: "Capers", quantity: "1 tbsp" },
      { name: "Fresh dill", quantity: "to taste" }
    ],
    steps: [
      "Slice the **cucumber** into thick 1.5 cm rounds and pat them dry.",
      "Spread each round with a little **cream cheese**.",
      "Top with a ruffle of **smoked salmon**, a few **capers** and a sprig of **fresh dill**."
    ],
    batchTip: "Assemble up to an hour ahead and keep chilled so the cucumber stays crisp.",
    substitutionTip: "Dairy-free? Use whipped cashew cheese or a smear of avocado instead."
  },
  {
    id: "s24", name: "Caprese Skewers", cuisine: "Mediterranean", mealType: "snack",
    prepTime: 8, cookTime: 0, difficulty: "quick",
    servings: 2,
    equipment: ["Cocktail skewers"],
    phases: ["follicular", "ovulatory"], goal: ["maintain"],
    dietTags: ["vegetarian", "gluten-free"], allergens: ["dairy"],
    macros: { calories: 180, protein: 10, carbs: 6, fat: 12 },
    micros: { calcium: 180, vitaminC: 8, fibre: 1 },
    ingredients: [
      { name: "Cherry tomatoes", quantity: "12" },
      { name: "Fresh basil leaves", quantity: "12" },
      { name: "Mini mozzarella balls", quantity: "12" },
      { name: "Balsamic glaze", quantity: "1 tbsp" },
      { name: "Olive oil", quantity: "1 tsp" }
    ],
    steps: [
      "Thread a **cherry tomato**, a folded **fresh basil leaf** and a **mini mozzarella ball** onto each cocktail skewer.",
      "Line them up on a serving plate.",
      "Drizzle with **balsamic glaze** and a thread of **olive oil**, then season with salt and pepper."
    ],
    batchTip: "Skewer ahead and chill; add the glaze just before serving so it stays glossy.",
    substitutionTip: "Dairy-free? Swap mozzarella for marinated tofu cubes or artichoke hearts."
  },
  {
    id: "s25", name: "Frozen Yoghurt Berry Bark", cuisine: "Global", mealType: "snack",
    prepTime: 10, cookTime: 0, difficulty: "easy",
    servings: 2,
    equipment: ["Baking tray"],
    phases: ["ovulatory", "follicular"], goal: ["lose", "maintain"],
    dietTags: ["vegetarian", "gluten-free"], allergens: ["dairy"],
    macros: { calories: 160, protein: 8, carbs: 22, fat: 4 },
    micros: { calcium: 180, vitaminC: 20, fibre: 3 },
    ingredients: [
      { name: "Greek yoghurt", quantity: "1 cup" },
      { name: "Honey", quantity: "1 tbsp" },
      { name: "Mixed berries", quantity: "1 cup" },
      { name: "Granola", quantity: "2 tbsp" }
    ],
    steps: [
      "Stir the **honey** through the **Greek yoghurt** and spread 1 cm thick on a baking-paper-lined tray.",
      "Scatter over the **mixed berries** and **granola**, pressing them lightly in.",
      "Freeze 3 hours until solid, then break into bark."
    ],
    batchTip: "Store shards in a freezer bag up to a month; eat within a couple of minutes of taking them out.",
    substitutionTip: "Dairy-free? Use coconut yoghurt - it freezes into an even creamier bark."
  },
  {
    id: "s26", name: "Homemade Granola Bars", cuisine: "Global", mealType: "snack",
    prepTime: 10, cookTime: 25, difficulty: "easy",
    servings: 8,
    equipment: ["Small pot", "Baking tin"],
    phases: ["luteal", "follicular"], goal: ["gain", "maintain"],
    dietTags: ["vegetarian"], allergens: ["nuts"],
    macros: { calories: 280, protein: 7, carbs: 36, fat: 12 },
    micros: { magnesium: 45, fibre: 4, iron: 2 },
    ingredients: [
      { name: "Rolled oats", quantity: "2 cups" },
      { name: "Mixed nuts & seeds", quantity: "1/2 cup" },
      { name: "Honey", quantity: "3 tbsp" },
      { name: "Almond butter", quantity: "2 tbsp" },
      { name: "Dried fruit", quantity: "1/4 cup" },
      { name: "Vanilla extract", quantity: "1 tsp" }
    ],
    steps: [
      "Warm the **honey** and **almond butter** in a small pot, stirring until loose and glossy.",
      "Off the heat, mix in the **rolled oats**, **mixed nuts & seeds**, **dried fruit** and **vanilla extract** until everything is coated.",
      "Press very firmly into a lined tin, bake at 165°C for 20 min, then cool completely before slicing into 8 bars."
    ],
    batchTip: "Wrap bars individually - they keep a week at room temp or a month in the freezer.",
    substitutionTip: "Nut-free? Use sunflower seed butter and pumpkin seeds in place of the nuts."
  },
  {
    id: "s27", name: "Avocado Deviled Eggs", cuisine: "Global", mealType: "snack",
    prepTime: 12, cookTime: 10, difficulty: "easy",
    servings: 2,
    equipment: ["Small pot"],
    phases: ["follicular", "ovulatory"], goal: ["maintain", "lose"],
    dietTags: ["vegetarian", "gluten-free"], allergens: ["eggs"],
    macros: { calories: 200, protein: 11, carbs: 4, fat: 16 },
    micros: { vitaminB6: 0.3, fibre: 3, iron: 1 },
    ingredients: [
      { name: "Eggs", quantity: "4" },
      { name: "Avocado", quantity: "1/2" },
      { name: "Lemon juice", quantity: "1 tsp" },
      { name: "Salt & pepper", quantity: "to taste" },
      { name: "Paprika", quantity: "1 pinch" }
    ],
    steps: [
      "Boil the **eggs** for 9-10 min, cool under cold water, then peel.",
      "Halve lengthways and pop the yolks into a bowl.",
      "Mash the yolks with the **avocado**, **lemon juice** and **salt & pepper** until smooth.",
      "Spoon or pipe the filling back into the whites and dust with **paprika**."
    ],
    batchTip: "Boil the eggs a day ahead; fill just before serving so the avocado stays green.",
    substitutionTip: "No avocado? Mash the yolks with Greek yoghurt or mayo instead."
  },
  {
    id: "s28", name: "Blueberry Protein Muffin", cuisine: "Global", mealType: "snack",
    prepTime: 10, cookTime: 22, difficulty: "easy",
    servings: 6,
    equipment: ["Mixing bowl", "Muffin tin"],
    phases: ["follicular", "ovulatory"], goal: ["gain", "maintain"],
    dietTags: ["vegetarian", "gluten-free"], allergens: ["nuts", "eggs", "dairy"],
    macros: { calories: 260, protein: 16, carbs: 24, fat: 10 },
    micros: { calcium: 80, vitaminC: 4, fibre: 4 },
    ingredients: [
      { name: "Almond flour", quantity: "1 cup" },
      { name: "Vanilla protein powder", quantity: "1/2 scoop" },
      { name: "Baking powder", quantity: "1 tsp" },
      { name: "Eggs", quantity: "2" },
      { name: "Greek yoghurt", quantity: "2 tbsp" },
      { name: "Maple syrup", quantity: "2 tbsp" },
      { name: "Blueberries", quantity: "1/2 cup" }
    ],
    steps: [
      "Whisk the **almond flour**, **vanilla protein powder** and **baking powder** in a bowl.",
      "Beat in the **eggs**, **Greek yoghurt** and **maple syrup** to a thick batter.",
      "Fold in the **blueberries**, divide between 6 lined muffin cups and bake at 175°C for 20-22 min until springy."
    ],
    batchTip: "Freeze the cooled muffins; reheat from frozen for 20 sec in the microwave.",
    substitutionTip: "No protein powder? Use an extra 1/4 cup almond flour and a pinch more baking powder."
  },
  {
    id: "s29", name: "Pumpkin Seed & Dark Chocolate Clusters", cuisine: "Global", mealType: "snack",
    prepTime: 10, cookTime: 5, difficulty: "easy",
    servings: 2,
    equipment: ["Small heatproof bowl"],
    phases: ["luteal", "menstrual"], goal: ["maintain"],
    dietTags: ["vegan", "gluten-free"], allergens: [],
    macros: { calories: 210, protein: 6, carbs: 16, fat: 14 },
    micros: { magnesium: 100, iron: 3, fibre: 3 },
    ingredients: [
      { name: "Dark chocolate (70%+)", quantity: "50 g" },
      { name: "Pumpkin seeds", quantity: "1/4 cup" },
      { name: "Rolled oats", quantity: "2 tbsp" },
      { name: "Honey", quantity: "1 tsp" }
    ],
    steps: [
      "Melt the **dark chocolate** gently over a pan of just-simmering water.",
      "Stir in the **pumpkin seeds**, **rolled oats** and **honey** until coated.",
      "Spoon small clusters onto baking paper and chill 20 min until set."
    ],
    batchTip: "Keep in the fridge up to 2 weeks in an airtight tub.",
    substitutionTip: "Swap pumpkin seeds for sunflower seeds or chopped almonds."
  },
  {
    id: "s30", name: "Tahini Dark Chocolate Dip with Fruit", cuisine: "Middle Eastern", mealType: "snack",
    prepTime: 5, cookTime: 0, difficulty: "quick",
    servings: 1,
    equipment: ["Small heatproof bowl"],
    phases: ["luteal", "ovulatory"], goal: ["maintain"],
    dietTags: ["vegan", "gluten-free"], allergens: [],
    macros: { calories: 230, protein: 7, carbs: 20, fat: 14 },
    micros: { iron: 3, magnesium: 40, fibre: 4 },
    ingredients: [
      { name: "Tahini", quantity: "2 tbsp" },
      { name: "Dark chocolate chips", quantity: "1 tbsp" },
      { name: "Maple syrup", quantity: "1 tsp" },
      { name: "Banana & apple", quantity: "1 each, sliced" }
    ],
    steps: [
      "Melt the **dark chocolate chips** gently, then stir into the **tahini** with the **maple syrup** until glossy and smooth.",
      "Loosen with a teaspoon of warm water if needed and spoon into a small bowl.",
      "Slice the **banana & apple** and dip."
    ],
    batchTip: "The dip thickens as it sits - warm briefly and add a splash of water to loosen.",
    substitutionTip: "Sesame allergy? Use smooth almond or cashew butter in place of tahini."
  },
  {
    id: "s31", name: "Warm Golden Milk", cuisine: "Asian", mealType: "snack",
    prepTime: 3, cookTime: 5, difficulty: "quick",
    phases: ["luteal", "menstrual", "follicular"], goal: ["maintain", "lose"],
    dietTags: ["vegan", "gluten-free"], allergens: [],
    macros: { calories: 90, protein: 2, carbs: 12, fat: 4 },
    micros: { calcium: 60, magnesium: 20, fibre: 1 },
    servings: 1,
    equipment: ["Small pot", "Whisk"],
    ingredients: [
      { name: "Plant milk", quantity: "1 cup" },
      { name: "Ground turmeric", quantity: "1 tsp" },
      { name: "Cinnamon", quantity: "1/2 tsp" },
      { name: "Ginger powder", quantity: "1/4 tsp" },
      { name: "Black pepper", quantity: "1 pinch" },
      { name: "Honey or maple", quantity: "1 tsp" }
    ],
    steps: [
      "Warm the **plant milk** in a small pot over medium heat until steaming but not boiling.",
      "Whisk in **ground turmeric**, **cinnamon**, **ginger powder** and a pinch of **black pepper** - the pepper helps your body absorb the turmeric.",
      "Simmer gently 3-4 min so the spices bloom, then take off the heat.",
      "Stir in **honey** to taste and whisk hard for 20 sec to froth before pouring."
    ],
    batchTip: "Mix a big jar of the dry spices (turmeric, cinnamon, ginger, pepper) so you can scoop 1.5 tsp per mug.",
    substitutionTip: "Use a splash of coconut milk for a richer, creamier cup, or leave out honey to keep it vegan and low-sugar."
  },
  {
    id: "s32", name: "Sweet Potato Cinnamon Rounds", cuisine: "Global", mealType: "snack",
    prepTime: 5, cookTime: 20, difficulty: "easy",
    phases: ["luteal", "menstrual"], goal: ["maintain", "lose"],
    dietTags: ["vegan", "gluten-free"], allergens: [],
    macros: { calories: 170, protein: 3, carbs: 36, fat: 2 },
    micros: { vitaminC: 14, fibre: 5, magnesium: 30 },
    servings: 1,
    equipment: ["Baking tray"],
    ingredients: [
      { name: "Sweet potato", quantity: "1 large" },
      { name: "Cinnamon", quantity: "1 tsp" },
      { name: "Olive oil", quantity: "1 tsp" },
      { name: "Honey or maple", quantity: "1 tsp" },
      { name: "Sea salt", quantity: "1 pinch" }
    ],
    steps: [
      "Heat oven to 200°C. Scrub the **sweet potato** and slice into 1 cm rounds - no need to peel.",
      "Toss the rounds with **olive oil**, **cinnamon** and a pinch of **salt** until evenly coated.",
      "Spread in a single layer on a **baking tray** and roast 15-18 min, flipping once, until tender and caramelised at the edges.",
      "Drizzle with **honey** while still warm."
    ],
    batchTip: "Roast a whole tray at once - they keep 3 days in the fridge and crisp back up in a hot oven for 5 min.",
    substitutionTip: "Swap sweet potato for butternut squash rounds, or add a pinch of cayenne for a sweet-heat version."
  },
  {
    id: "s33", name: "Nut Butter Rice Cakes", cuisine: "Global", mealType: "snack",
    prepTime: 3, cookTime: 0, difficulty: "quick",
    phases: ["follicular", "luteal"], goal: ["maintain"],
    dietTags: ["vegan", "gluten-free"], allergens: ["nuts"],
    macros: { calories: 200, protein: 6, carbs: 24, fat: 10 },
    micros: { magnesium: 30, fibre: 2, vitaminB6: 0.2 },
    servings: 1,
    equipment: [],
    ingredients: [
      { name: "Brown rice cakes", quantity: "2" },
      { name: "Almond butter", quantity: "1.5 tbsp" },
      { name: "Banana", quantity: "1/2, sliced" },
      { name: "Honey or maple", quantity: "1 drizzle" },
      { name: "Cinnamon", quantity: "1 pinch" }
    ],
    steps: [
      "Spread the **almond butter** evenly over both **brown rice cakes**, right to the edges.",
      "Fan the **banana** slices on top and press down lightly so they stick.",
      "Drizzle with **honey** and finish with a pinch of **cinnamon**."
    ],
    batchTip: "Spread the nut butter ahead, but add banana just before eating so the cakes stay crisp.",
    substitutionTip: "Nut-free? Use sunflower seed butter, or swap banana for sliced strawberries or a few blueberries."
  },
  {
    id: "s34", name: "Mango Lime Chia Fresca", cuisine: "Latin", mealType: "snack",
    prepTime: 5, cookTime: 0, difficulty: "quick",
    phases: ["ovulatory", "follicular"], goal: ["lose"],
    dietTags: ["vegan", "gluten-free"], allergens: [],
    macros: { calories: 120, protein: 2, carbs: 26, fat: 3 },
    micros: { vitaminC: 38, fibre: 5, omega3: 0.5 },
    servings: 1,
    equipment: ["Blender"],
    ingredients: [
      { name: "Ripe mango", quantity: "1 cup, cubed" },
      { name: "Chia seeds", quantity: "1 tbsp" },
      { name: "Lime", quantity: "1, juiced" },
      { name: "Sparkling water", quantity: "1/2 cup" },
      { name: "Fresh mint", quantity: "a few leaves" },
      { name: "Ice", quantity: "to serve" }
    ],
    steps: [
      "Blend the **ripe mango** with a splash of water until smooth.",
      "Stir in the **chia seeds** and **lime** juice, then rest 5-10 min until the chia swells and the mix thickens.",
      "Pour over **ice**, top up with **sparkling water** and stir.",
      "Bruise the **fresh mint** between your palms and drop in to finish."
    ],
    batchTip: "Make the mango-chia base the night before and keep chilled - just add sparkling water when you serve.",
    substitutionTip: "No fresh mango? Use 1 cup mango juice and skip the blender, or swap in frozen pineapple."
  },
  {
    id: "s35", name: "Roasted Rosemary Almonds", cuisine: "Mediterranean", mealType: "snack",
    prepTime: 5, cookTime: 12, difficulty: "easy",
    phases: ["follicular", "ovulatory", "luteal"], goal: ["maintain", "gain"],
    dietTags: ["vegan", "gluten-free"], allergens: ["nuts"],
    macros: { calories: 220, protein: 7, carbs: 8, fat: 18 },
    micros: { magnesium: 60, iron: 2, fibre: 4 },
    servings: 1,
    equipment: ["Baking tray"],
    ingredients: [
      { name: "Raw almonds", quantity: "1/4 cup" },
      { name: "Fresh rosemary", quantity: "1 tsp, chopped" },
      { name: "Garlic powder", quantity: "1/2 tsp" },
      { name: "Olive oil", quantity: "1 tsp" },
      { name: "Sea salt", quantity: "to taste" }
    ],
    steps: [
      "Heat oven to 170°C. Toss the **raw almonds** with **olive oil**, **fresh rosemary**, **garlic powder** and **sea salt**.",
      "Spread on a **baking tray** in one layer and roast 10-12 min, shaking halfway, until fragrant and a shade darker.",
      "Cool fully on the tray - they crisp up as they cool and the rosemary sets."
    ],
    batchTip: "Make a triple batch and store airtight up to 2 weeks - they are the perfect grab-and-go handful.",
    substitutionTip: "Swap almonds for walnuts or cashews, or use fresh thyme in place of rosemary."
  },
  {
    id: "s36", name: "Labneh & Za'atar Dip with Veggies", cuisine: "Middle Eastern", mealType: "snack",
    prepTime: 8, cookTime: 0, difficulty: "quick",
    phases: ["follicular", "ovulatory"], goal: ["lose", "maintain"],
    dietTags: ["vegetarian", "gluten-free"], allergens: ["dairy"],
    macros: { calories: 160, protein: 9, carbs: 8, fat: 10 },
    micros: { calcium: 160, iron: 1, fibre: 3 },
    servings: 1,
    equipment: [],
    ingredients: [
      { name: "Labneh (strained yoghurt)", quantity: "1/2 cup" },
      { name: "Za'atar spice blend", quantity: "1 tsp" },
      { name: "Olive oil", quantity: "1 tsp" },
      { name: "Lemon", quantity: "a squeeze" },
      { name: "Cucumber", quantity: "1 cup, in sticks" },
      { name: "Carrot", quantity: "1 cup, in sticks" }
    ],
    steps: [
      "Spread the **labneh** across a wide shallow bowl, swooshing the back of a spoon through it to make grooves.",
      "Drizzle the grooves with **olive oil** and a squeeze of **lemon**, then shower generously with **za'atar**.",
      "Serve with **cucumber** and **carrot** sticks for dipping."
    ],
    batchTip: "No labneh? Strain 1 cup thick yoghurt in a lined sieve overnight in the fridge and you have your own.",
    substitutionTip: "Dairy-free? Use a thick coconut or almond yoghurt, and swap the veg for pepper strips or endive leaves."
  },
];

export const RECIPES: Recipe[] = RAW_RECIPES.map(finalizeRecipe);
