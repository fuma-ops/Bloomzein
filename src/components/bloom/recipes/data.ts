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

export interface DietProfile {
  goal: DietGoal;
  dietType: DietType;
  allergies: Allergy[];
  cookingFrequency: CookingFrequency;
}

export const DIET_PROFILE_KEY = "bloom:diet-profile";

export const DEFAULT_DIET_PROFILE: DietProfile & { weight: number } = {
  goal: "maintain",
  dietType: "omnivore",
  allergies: [],
  cookingFrequency: "normal",
  weight: 65,
};

export function readDietProfile(): DietProfile & { weight: number } {
  try {
    const raw = localStorage.getItem(DIET_PROFILE_KEY);
    if (!raw) return DEFAULT_DIET_PROFILE;
    return { ...DEFAULT_DIET_PROFILE, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_DIET_PROFILE;
  }
}

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
  return true;
}

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
  macros: { calories: number; protein: number; carbs: number; fat: number };
  micros: Partial<Record<"iron" | "magnesium" | "omega3" | "vitaminC" | "fibre" | "vitaminB6" | "calcium" | "vitaminD", number>>;
  ingredients: RecipeIngredient[];
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
    phases: ["follicular", "ovulatory"], goal: ["lose", "maintain"],
    dietTags: ["vegetarian", "gluten-free"], allergens: ["dairy"],
    photo: "breakfast-mediterranean-greek-yogurt-power-bowl.jpg",
    macros: { calories: 320, protein: 28, carbs: 32, fat: 9 },
    micros: { vitaminB6: 0.4, fibre: 4, vitaminC: 10 },
    ingredients: [
      { name: "Greek yoghurt", quantity: "200g" },
      { name: "Mixed berries", quantity: "1/2 cup" },
      { name: "Granola", quantity: "1/4 cup" },
      { name: "Honey", quantity: "1 tsp" },
    ],
    steps: ["Spoon yoghurt into a bowl.", "Top with berries and granola.", "Drizzle with honey and serve."],
  },
  {
    id: "b02", name: "Avocado Egg Toast", cuisine: "Mediterranean", mealType: "breakfast",
    prepTime: 10, cookTime: 5, difficulty: "quick",
    phases: ["follicular", "ovulatory", "menstrual"], goal: ["maintain", "gain"],
    dietTags: ["vegetarian"], allergens: ["eggs"],
    photo: "breakfast-mediterranean-avocado-egg-toast.jpg",
    macros: { calories: 360, protein: 16, carbs: 28, fat: 20 },
    micros: { fibre: 7, vitaminC: 12 },
    ingredients: [
      { name: "Sourdough bread", quantity: "2 slices" },
      { name: "Avocado", quantity: "1" },
      { name: "Egg", quantity: "2" },
      { name: "Chili flakes", quantity: "pinch" },
    ],
    steps: ["Toast the bread.", "Mash avocado and spread on toast.", "Fry or poach eggs and place on top, season."],
  },
  {
    id: "b03", name: "Salmon & Quinoa Breakfast Bowl", cuisine: "Nordic", mealType: "breakfast",
    prepTime: 10, cookTime: 15, difficulty: "easy",
    phases: ["luteal", "menstrual"], goal: ["gain", "maintain"],
    dietTags: ["pescatarian", "gluten-free"], allergens: [],
    photo: "breakfast-nordic-salmon-quinoa-breakfast-bowl.jpg",
    macros: { calories: 410, protein: 30, carbs: 34, fat: 16 },
    micros: { omega3: 1.8, iron: 2, magnesium: 60 },
    ingredients: [
      { name: "Cooked quinoa", quantity: "1 cup" },
      { name: "Smoked salmon", quantity: "100g" },
      { name: "Soft-boiled egg", quantity: "1" },
      { name: "Spinach", quantity: "1 handful" },
    ],
    steps: ["Warm the quinoa and place in a bowl.", "Layer salmon, egg and spinach on top.", "Season with lemon and dill."],
  },
  {
    id: "b04", name: "Spiced Chickpea Shakshuka", cuisine: "Middle Eastern", mealType: "breakfast",
    prepTime: 10, cookTime: 20, difficulty: "easy",
    phases: ["menstrual", "follicular"], goal: ["maintain", "gain", "lose"],
    dietTags: ["vegetarian", "gluten-free"], allergens: ["eggs"],
    photo: "breakfast-middle-eastern-spiced-chickpea-shakshuka.jpg",
    macros: { calories: 380, protein: 26, carbs: 36, fat: 14 },
    micros: { iron: 4, fibre: 9, vitaminC: 22 },
    ingredients: [
      { name: "Chickpeas", quantity: "1 cup" },
      { name: "Crushed tomatoes", quantity: "1 cup" },
      { name: "Eggs", quantity: "2" },
      { name: "Cumin & paprika", quantity: "1 tsp each" },
    ],
    steps: ["Simmer tomatoes with chickpeas and spices.", "Make wells and crack eggs into the sauce.", "Cover and cook until eggs are just set."],
  },
  {
    id: "b05", name: "Tropical Green Smoothie", cuisine: "Latin", mealType: "breakfast",
    prepTime: 8, cookTime: 0, difficulty: "quick",
    phases: ["ovulatory", "follicular"], goal: ["lose", "maintain"],
    dietTags: ["vegan", "gluten-free"], allergens: [],
    photo: "breakfast-latin-tropical-green-smoothie.jpg",
    macros: { calories: 240, protein: 8, carbs: 46, fat: 5 },
    micros: { vitaminC: 48, fibre: 6, vitaminB6: 0.3 },
    ingredients: [
      { name: "Mango", quantity: "1 cup" },
      { name: "Spinach", quantity: "1 cup" },
      { name: "Banana", quantity: "1/2" },
      { name: "Coconut water", quantity: "1 cup" },
    ],
    steps: ["Add all ingredients to a blender.", "Blend until smooth.", "Pour and enjoy immediately."],
  },
  {
    id: "b06", name: "Banana Oat Pancakes with Walnuts", cuisine: "Nordic", mealType: "breakfast",
    prepTime: 10, cookTime: 10, difficulty: "easy",
    phases: ["luteal", "menstrual"], goal: ["maintain", "gain"],
    dietTags: ["vegetarian"], allergens: ["nuts"],
    photo: "breakfast-nordic-banana-oat-pancakes-walnuts.jpg",
    macros: { calories: 420, protein: 14, carbs: 58, fat: 15 },
    micros: { magnesium: 70, fibre: 6 },
    ingredients: [
      { name: "Oats", quantity: "1 cup" },
      { name: "Banana", quantity: "1" },
      { name: "Eggs", quantity: "2" },
      { name: "Walnuts", quantity: "2 tbsp" },
    ],
    steps: ["Blend oats, banana and eggs into a batter.", "Cook small pancakes on a non-stick pan.", "Top with crushed walnuts."],
  },
  {
    id: "b07", name: "Moroccan Spiced Egg Wrap", cuisine: "African", mealType: "breakfast",
    prepTime: 10, cookTime: 8, difficulty: "quick",
    phases: ["menstrual", "follicular"], goal: ["lose", "maintain"],
    dietTags: ["halal"], allergens: ["eggs"],
    photo: "breakfast-african-moroccan-spiced-egg-wrap.jpg",
    macros: { calories: 330, protein: 20, carbs: 30, fat: 13 },
    micros: { iron: 3, vitaminC: 14 },
    ingredients: [
      { name: "Whole-wheat wrap", quantity: "1" },
      { name: "Eggs", quantity: "2" },
      { name: "Ras el hanout", quantity: "1 tsp" },
      { name: "Tomato & onion", quantity: "1/2 cup" },
    ],
    steps: ["Scramble eggs with spices, tomato and onion.", "Warm the wrap.", "Fill, roll and serve."],
  },
  {
    id: "b08", name: "Asian Tofu Scramble", cuisine: "Asian", mealType: "breakfast",
    prepTime: 8, cookTime: 8, difficulty: "quick",
    phases: ["follicular", "ovulatory"], goal: ["lose", "gain"],
    dietTags: ["vegan", "gluten-free"], allergens: ["soy"],
    photo: "breakfast-asian-tofu-scramble.jpg",
    macros: { calories: 300, protein: 22, carbs: 18, fat: 16 },
    micros: { iron: 3, magnesium: 50 },
    ingredients: [
      { name: "Firm tofu", quantity: "200g" },
      { name: "Turmeric", quantity: "1/2 tsp" },
      { name: "Spring onion", quantity: "2" },
      { name: "Soy sauce", quantity: "1 tbsp" },
    ],
    steps: ["Crumble tofu into a hot pan.", "Add turmeric and soy sauce, stir-fry.", "Finish with spring onion."],
  },
  {
    id: "b09", name: "Berry Chia Pudding", cuisine: "Mediterranean", mealType: "breakfast",
    prepTime: 5, cookTime: 0, difficulty: "quick",
    phases: ["luteal", "ovulatory"], goal: ["lose", "maintain"],
    dietTags: ["vegan", "gluten-free"], allergens: [],
    photo: "breakfast-mediterranean-berry-chia-pudding.jpg",
    macros: { calories: 280, protein: 9, carbs: 34, fat: 12 },
    micros: { omega3: 2.2, fibre: 11, calcium: 180 },
    ingredients: [
      { name: "Chia seeds", quantity: "3 tbsp" },
      { name: "Almond milk", quantity: "1 cup" },
      { name: "Mixed berries", quantity: "1/2 cup" },
      { name: "Maple syrup", quantity: "1 tsp" },
    ],
    steps: ["Mix chia seeds with almond milk and maple syrup.", "Refrigerate overnight.", "Top with berries before serving."],
  },
  {
    id: "b10", name: "Smoked Salmon Bagel", cuisine: "Nordic", mealType: "breakfast",
    prepTime: 8, cookTime: 0, difficulty: "quick",
    phases: ["menstrual", "luteal"], goal: ["gain", "maintain"],
    dietTags: ["pescatarian"], allergens: ["dairy"],
    photo: "breakfast-nordic-smoked-salmon-bagel.jpg",
    macros: { calories: 390, protein: 26, carbs: 38, fat: 14 },
    micros: { omega3: 1.5, calcium: 90 },
    ingredients: [
      { name: "Bagel", quantity: "1" },
      { name: "Cream cheese", quantity: "30g" },
      { name: "Smoked salmon", quantity: "80g" },
      { name: "Capers & dill", quantity: "to taste" },
    ],
    steps: ["Slice and toast the bagel.", "Spread cream cheese on both halves.", "Layer salmon, capers and dill."],
  },

  // ───────── Lunch (12) ─────────
  {
    id: "l01", name: "Mediterranean Chickpea Salad", cuisine: "Mediterranean", mealType: "lunch",
    prepTime: 15, cookTime: 0, difficulty: "quick",
    phases: ["ovulatory", "follicular"], goal: ["lose", "maintain"],
    dietTags: ["vegan", "gluten-free"], allergens: [],
    photo: "lunch-mediterranean-chickpea-salad.jpg",
    macros: { calories: 340, protein: 14, carbs: 42, fat: 14 },
    micros: { fibre: 12, vitaminC: 30, vitaminB6: 0.4 },
    ingredients: [
      { name: "Chickpeas", quantity: "1.5 cups" },
      { name: "Cucumber & tomato", quantity: "1 cup" },
      { name: "Feta", quantity: "30g" },
      { name: "Olive oil & lemon", quantity: "1 tbsp" },
    ],
    steps: ["Combine chickpeas, cucumber and tomato.", "Crumble feta over the top.", "Dress with olive oil and lemon."],
  },
  {
    id: "l02", name: "Asian Salmon Quinoa Bowl", cuisine: "Asian", mealType: "lunch",
    prepTime: 20, cookTime: 15, difficulty: "easy",
    phases: ["luteal", "menstrual"], goal: ["gain"],
    dietTags: ["pescatarian", "gluten-free"], allergens: [],
    photo: "lunch-asian-salmon-quinoa-bowl.jpg",
    macros: { calories: 480, protein: 32, carbs: 44, fat: 18 },
    micros: { omega3: 2.0, iron: 3, magnesium: 65 },
    ingredients: [
      { name: "Salmon fillet", quantity: "150g" },
      { name: "Cooked quinoa", quantity: "1 cup" },
      { name: "Edamame", quantity: "1/2 cup" },
      { name: "Sesame ginger dressing", quantity: "2 tbsp" },
    ],
    steps: ["Pan-sear the salmon.", "Arrange quinoa, edamame and salmon in a bowl.", "Drizzle with sesame ginger dressing."],
  },
  {
    id: "l03", name: "Moroccan Lentil Soup", cuisine: "African", mealType: "lunch",
    prepTime: 15, cookTime: 30, difficulty: "easy",
    phases: ["menstrual", "luteal"], goal: ["maintain", "lose"],
    dietTags: ["vegan", "gluten-free", "halal"], allergens: [],
    photo: "lunch-african-moroccan-lentil-soup.jpg",
    macros: { calories: 320, protein: 17, carbs: 48, fat: 6 },
    micros: { iron: 5, fibre: 14, vitaminB6: 0.5 },
    ingredients: [
      { name: "Red lentils", quantity: "1 cup" },
      { name: "Carrots & celery", quantity: "1 cup" },
      { name: "Cumin & cinnamon", quantity: "1 tsp" },
      { name: "Vegetable broth", quantity: "4 cups" },
    ],
    steps: ["Sauté carrots and celery.", "Add lentils, spices and broth.", "Simmer 25 minutes until lentils are soft."],
  },
  {
    id: "l04", name: "Thai Peanut Chicken Salad", cuisine: "Asian", mealType: "lunch",
    prepTime: 15, cookTime: 10, difficulty: "easy",
    phases: ["ovulatory", "follicular"], goal: ["lose", "gain"],
    dietTags: ["gluten-free"], allergens: ["nuts"],
    photo: "lunch-asian-thai-peanut-chicken-salad.jpg",
    macros: { calories: 410, protein: 30, carbs: 28, fat: 18 },
    micros: { vitaminC: 24, fibre: 7, vitaminB6: 0.6 },
    ingredients: [
      { name: "Grilled chicken breast", quantity: "150g" },
      { name: "Shredded cabbage & carrot", quantity: "2 cups" },
      { name: "Peanut dressing", quantity: "2 tbsp" },
      { name: "Crushed peanuts", quantity: "1 tbsp" },
    ],
    steps: ["Slice the grilled chicken.", "Toss cabbage and carrot with peanut dressing.", "Top with chicken and crushed peanuts."],
  },
  {
    id: "l05", name: "Falafel Wrap with Tahini", cuisine: "Middle Eastern", mealType: "lunch",
    prepTime: 15, cookTime: 15, difficulty: "easy",
    phases: ["follicular", "ovulatory"], goal: ["maintain"],
    dietTags: ["vegan"], allergens: [],
    photo: "lunch-middle-eastern-falafel-wrap-tahini.jpg",
    macros: { calories: 430, protein: 16, carbs: 50, fat: 18 },
    micros: { fibre: 10, iron: 3, vitaminB6: 0.3 },
    ingredients: [
      { name: "Falafel", quantity: "5 pieces" },
      { name: "Pita bread", quantity: "1" },
      { name: "Tahini sauce", quantity: "2 tbsp" },
      { name: "Pickled vegetables", quantity: "1/2 cup" },
    ],
    steps: ["Warm the falafel.", "Fill pita with falafel and pickled vegetables.", "Drizzle with tahini sauce."],
  },
  {
    id: "l06", name: "Sweet Potato Black Bean Bowl", cuisine: "Latin", mealType: "lunch",
    prepTime: 15, cookTime: 25, difficulty: "easy",
    phases: ["luteal", "menstrual"], goal: ["gain", "maintain"],
    dietTags: ["vegan", "gluten-free"], allergens: [],
    photo: "lunch-latin-sweet-potato-black-bean-bowl.jpg",
    macros: { calories: 420, protein: 14, carbs: 64, fat: 12 },
    micros: { fibre: 15, magnesium: 70, iron: 3 },
    ingredients: [
      { name: "Roasted sweet potato", quantity: "1 cup" },
      { name: "Black beans", quantity: "1 cup" },
      { name: "Avocado", quantity: "1/2" },
      { name: "Lime & cilantro", quantity: "to taste" },
    ],
    steps: ["Roast sweet potato cubes until tender.", "Warm black beans with lime juice.", "Combine in a bowl and top with avocado and cilantro."],
  },
  {
    id: "l07", name: "Greek Chicken Souvlaki Plate", cuisine: "Mediterranean", mealType: "lunch",
    prepTime: 15, cookTime: 20, difficulty: "easy",
    phases: ["follicular", "ovulatory"], goal: ["gain"],
    dietTags: ["gluten-free"], allergens: [],
    photo: "lunch-mediterranean-greek-chicken-souvlaki-plate.jpg",
    macros: { calories: 460, protein: 35, carbs: 30, fat: 18 },
    micros: { vitaminB6: 0.7, fibre: 5 },
    ingredients: [
      { name: "Chicken thigh", quantity: "180g" },
      { name: "Greek yoghurt marinade", quantity: "2 tbsp" },
      { name: "Rice", quantity: "1 cup cooked" },
      { name: "Tzatziki & salad", quantity: "1/2 cup" },
    ],
    steps: ["Marinate chicken in yoghurt and herbs.", "Grill or pan-fry until cooked through.", "Serve with rice, salad and tzatziki."],
  },
  {
    id: "l08", name: "Nordic Salmon Rye Sandwich", cuisine: "Nordic", mealType: "lunch",
    prepTime: 10, cookTime: 0, difficulty: "quick",
    phases: ["menstrual", "luteal"], goal: ["maintain"],
    dietTags: ["pescatarian"], allergens: ["dairy"],
    photo: "lunch-nordic-salmon-rye-sandwich.jpg",
    macros: { calories: 360, protein: 28, carbs: 32, fat: 13 },
    micros: { omega3: 1.6, calcium: 80 },
    ingredients: [
      { name: "Rye bread", quantity: "2 slices" },
      { name: "Smoked salmon", quantity: "100g" },
      { name: "Cream cheese", quantity: "20g" },
      { name: "Cucumber & dill", quantity: "to taste" },
    ],
    steps: ["Spread cream cheese on rye bread.", "Layer salmon and cucumber.", "Garnish with fresh dill."],
  },
  {
    id: "l09", name: "Quinoa Tabbouleh with Grilled Halloumi", cuisine: "Middle Eastern", mealType: "lunch",
    prepTime: 15, cookTime: 10, difficulty: "easy",
    phases: ["ovulatory", "follicular"], goal: ["maintain", "lose"],
    dietTags: ["vegetarian", "gluten-free"], allergens: ["dairy"],
    photo: "lunch-middle-eastern-quinoa-tabbouleh-grilled-halloumi.jpg",
    macros: { calories: 450, protein: 27, carbs: 38, fat: 20 },
    micros: { fibre: 8, vitaminC: 26, vitaminB6: 0.4 },
    ingredients: [
      { name: "Cooked quinoa", quantity: "1 cup" },
      { name: "Parsley & mint", quantity: "1 cup" },
      { name: "Halloumi", quantity: "80g" },
      { name: "Lemon & olive oil", quantity: "1 tbsp" },
    ],
    steps: ["Toss quinoa with chopped herbs, lemon and oil.", "Grill halloumi slices until golden.", "Serve halloumi on top of the tabbouleh."],
  },
  {
    id: "l10", name: "Spicy Tuna Poke Bowl", cuisine: "Asian", mealType: "lunch",
    prepTime: 20, cookTime: 0, difficulty: "easy",
    phases: ["luteal", "ovulatory"], goal: ["lose", "gain"],
    dietTags: ["pescatarian", "gluten-free"], allergens: ["soy"],
    photo: "lunch-asian-spicy-tuna-poke-bowl.jpg",
    macros: { calories: 470, protein: 34, carbs: 46, fat: 16 },
    micros: { omega3: 1.4, iron: 2, vitaminC: 18 },
    ingredients: [
      { name: "Sushi-grade tuna", quantity: "150g" },
      { name: "Sushi rice", quantity: "1 cup cooked" },
      { name: "Edamame & cucumber", quantity: "1 cup" },
      { name: "Spicy soy dressing", quantity: "2 tbsp" },
    ],
    steps: ["Cube the tuna and toss with dressing.", "Arrange rice, tuna, edamame and cucumber in a bowl.", "Garnish with sesame seeds."],
  },
  {
    id: "l11", name: "African Peanut Stew with Greens", cuisine: "African", mealType: "lunch",
    prepTime: 15, cookTime: 25, difficulty: "easy",
    phases: ["menstrual", "luteal"], goal: ["maintain"],
    dietTags: ["vegan", "gluten-free"], allergens: ["nuts"],
    photo: "lunch-african-peanut-stew-greens.jpg",
    macros: { calories: 400, protein: 15, carbs: 42, fat: 20 },
    micros: { iron: 4, magnesium: 75, fibre: 9 },
    ingredients: [
      { name: "Peanut butter", quantity: "3 tbsp" },
      { name: "Sweet potato", quantity: "1 cup" },
      { name: "Collard greens", quantity: "2 cups" },
      { name: "Tomato & ginger", quantity: "1 cup" },
    ],
    steps: ["Simmer sweet potato in tomato and ginger broth.", "Stir in peanut butter until smooth.", "Add greens and cook until wilted."],
  },
  {
    id: "l12", name: "Turkey & Avocado Power Wrap", cuisine: "Latin", mealType: "lunch",
    prepTime: 10, cookTime: 5, difficulty: "quick",
    phases: ["follicular", "ovulatory"], goal: ["gain", "lose"],
    dietTags: [], allergens: [],
    photo: "lunch-latin-turkey-avocado-power-wrap.jpg",
    macros: { calories: 420, protein: 33, carbs: 34, fat: 16 },
    micros: { vitaminB6: 0.6, fibre: 8 },
    ingredients: [
      { name: "Turkey breast", quantity: "150g" },
      { name: "Whole-wheat tortilla", quantity: "1" },
      { name: "Avocado", quantity: "1/2" },
      { name: "Lettuce & salsa", quantity: "1/2 cup" },
    ],
    steps: ["Pan-fry the turkey breast until cooked, then slice.", "Spread avocado on the tortilla.", "Fill with turkey, lettuce and salsa, then roll."],
  },

  // ───────── Dinner (12) ─────────
  {
    id: "d01", name: "Herb-Crusted Salmon with Greens", cuisine: "Nordic", mealType: "dinner",
    prepTime: 15, cookTime: 20, difficulty: "easy",
    phases: ["luteal", "menstrual"], goal: ["gain", "maintain"],
    dietTags: ["pescatarian", "gluten-free"], allergens: [],
    photo: "dinner-nordic-herb-crusted-salmon-greens.jpg",
    macros: { calories: 520, protein: 36, carbs: 22, fat: 28 },
    micros: { omega3: 2.4, vitaminD: 400, magnesium: 55 },
    ingredients: [
      { name: "Salmon fillet", quantity: "180g" },
      { name: "Herb breadcrumb crust", quantity: "1/4 cup" },
      { name: "Asparagus", quantity: "1 cup" },
      { name: "Lemon", quantity: "1/2" },
    ],
    steps: ["Press herb crust onto the salmon.", "Bake salmon and asparagus until salmon is cooked through.", "Finish with a squeeze of lemon."],
  },
  {
    id: "d02", name: "Moroccan Chicken Tagine", cuisine: "African", mealType: "dinner",
    prepTime: 20, cookTime: 40, difficulty: "elaborate",
    phases: ["menstrual", "luteal"], goal: ["maintain"],
    dietTags: ["gluten-free", "halal"], allergens: [],
    photo: "dinner-african-moroccan-chicken-tagine.jpg",
    macros: { calories: 480, protein: 31, carbs: 38, fat: 20 },
    micros: { iron: 4, magnesium: 60, vitaminC: 20 },
    ingredients: [
      { name: "Chicken thighs", quantity: "300g" },
      { name: "Apricots & olives", quantity: "1/2 cup" },
      { name: "Ras el hanout", quantity: "1 tbsp" },
      { name: "Couscous", quantity: "1 cup cooked" },
    ],
    steps: ["Brown chicken with spices.", "Add apricots, olives and a little broth, cover and simmer.", "Serve over couscous."],
  },
  {
    id: "d03", name: "Miso Glazed Tofu Stir-fry", cuisine: "Asian", mealType: "dinner",
    prepTime: 15, cookTime: 15, difficulty: "easy",
    phases: ["follicular", "ovulatory"], goal: ["lose", "gain"],
    dietTags: ["vegan"], allergens: ["soy"],
    photo: "dinner-asian-miso-glazed-tofu-stir-fry.jpg",
    macros: { calories: 410, protein: 22, carbs: 40, fat: 17 },
    micros: { iron: 3, magnesium: 55, fibre: 6 },
    ingredients: [
      { name: "Firm tofu", quantity: "250g" },
      { name: "Miso glaze", quantity: "2 tbsp" },
      { name: "Broccoli & peppers", quantity: "2 cups" },
      { name: "Brown rice", quantity: "1 cup cooked" },
    ],
    steps: ["Pan-fry tofu until golden, then coat in miso glaze.", "Stir-fry broccoli and peppers.", "Serve everything over brown rice."],
  },
  {
    id: "d04", name: "Mediterranean Stuffed Peppers", cuisine: "Mediterranean", mealType: "dinner",
    prepTime: 20, cookTime: 35, difficulty: "elaborate",
    phases: ["follicular", "ovulatory"], goal: ["maintain"],
    dietTags: ["vegetarian", "gluten-free"], allergens: [],
    photo: "dinner-mediterranean-stuffed-peppers.jpg",
    macros: { calories: 380, protein: 16, carbs: 46, fat: 14 },
    micros: { fibre: 10, vitaminC: 60, vitaminB6: 0.4 },
    ingredients: [
      { name: "Bell peppers", quantity: "4" },
      { name: "Cooked rice", quantity: "1.5 cups" },
      { name: "Feta & herbs", quantity: "1/2 cup" },
      { name: "Tomato sauce", quantity: "1 cup" },
    ],
    steps: ["Mix rice with feta and herbs.", "Stuff peppers and top with tomato sauce.", "Bake until peppers are tender."],
  },
  {
    id: "d05", name: "Black Bean & Sweet Potato Enchiladas", cuisine: "Latin", mealType: "dinner",
    prepTime: 20, cookTime: 30, difficulty: "elaborate",
    phases: ["luteal", "menstrual"], goal: ["maintain", "gain"],
    dietTags: ["vegetarian", "gluten-free"], allergens: [],
    photo: "dinner-latin-black-bean-sweet-potato-enchiladas.jpg",
    macros: { calories: 460, protein: 18, carbs: 62, fat: 16 },
    micros: { fibre: 14, magnesium: 65, iron: 3 },
    ingredients: [
      { name: "Corn tortillas", quantity: "4" },
      { name: "Black beans", quantity: "1.5 cups" },
      { name: "Roasted sweet potato", quantity: "1 cup" },
      { name: "Enchilada sauce & cheese", quantity: "1 cup" },
    ],
    steps: ["Fill tortillas with beans and sweet potato, roll up.", "Cover with enchilada sauce and cheese.", "Bake until bubbling."],
  },
  {
    id: "d06", name: "Lemon Garlic Shrimp Linguine", cuisine: "Mediterranean", mealType: "dinner",
    prepTime: 15, cookTime: 15, difficulty: "easy",
    phases: ["ovulatory", "follicular"], goal: ["gain"],
    dietTags: [], allergens: ["shellfish"],
    photo: "dinner-mediterranean-lemon-garlic-shrimp-linguine.jpg",
    macros: { calories: 500, protein: 29, carbs: 56, fat: 16 },
    micros: { omega3: 0.8, vitaminC: 14 },
    ingredients: [
      { name: "Shrimp", quantity: "200g" },
      { name: "Linguine", quantity: "100g" },
      { name: "Garlic & lemon", quantity: "to taste" },
      { name: "Parsley & olive oil", quantity: "2 tbsp" },
    ],
    steps: ["Cook linguine until al dente.", "Sauté shrimp with garlic and lemon.", "Toss pasta with shrimp, parsley and olive oil."],
  },
  {
    id: "d07", name: "Spiced Lentil Dal with Brown Rice", cuisine: "Middle Eastern", mealType: "dinner",
    prepTime: 10, cookTime: 30, difficulty: "easy",
    phases: ["menstrual", "luteal"], goal: ["lose", "maintain"],
    dietTags: ["vegan", "gluten-free"], allergens: [],
    photo: "dinner-middle-eastern-spiced-lentil-dal-brown-rice.jpg",
    macros: { calories: 420, protein: 26, carbs: 58, fat: 9 },
    micros: { iron: 6, fibre: 16, magnesium: 70 },
    ingredients: [
      { name: "Red lentils", quantity: "1.5 cups" },
      { name: "Coconut milk", quantity: "1/2 cup" },
      { name: "Turmeric & cumin", quantity: "1 tsp each" },
      { name: "Brown rice", quantity: "1 cup cooked" },
    ],
    steps: ["Simmer lentils with spices until soft.", "Stir in coconut milk.", "Serve over brown rice."],
  },
  {
    id: "d08", name: "Grilled Chicken Buddha Bowl", cuisine: "Asian", mealType: "dinner",
    prepTime: 15, cookTime: 20, difficulty: "easy",
    phases: ["ovulatory", "follicular"], goal: ["gain", "lose"],
    dietTags: ["gluten-free"], allergens: [],
    photo: "dinner-asian-grilled-chicken-buddha-bowl.jpg",
    macros: { calories: 490, protein: 38, carbs: 42, fat: 17 },
    micros: { fibre: 9, vitaminB6: 0.8, vitaminC: 22 },
    ingredients: [
      { name: "Chicken breast", quantity: "180g" },
      { name: "Quinoa", quantity: "1 cup cooked" },
      { name: "Roasted vegetables", quantity: "1.5 cups" },
      { name: "Tahini dressing", quantity: "2 tbsp" },
    ],
    steps: ["Grill the chicken breast and slice.", "Arrange quinoa, roasted vegetables and chicken in a bowl.", "Drizzle with tahini dressing."],
  },
  {
    id: "d09", name: "Nordic Beet & Walnut Salad with Goat Cheese", cuisine: "Nordic", mealType: "dinner",
    prepTime: 15, cookTime: 0, difficulty: "quick",
    phases: ["ovulatory", "follicular"], goal: ["lose", "maintain"],
    dietTags: ["vegetarian", "gluten-free"], allergens: ["nuts", "dairy"],
    photo: "dinner-nordic-beet-walnut-salad-goat-cheese.jpg",
    macros: { calories: 410, protein: 25, carbs: 26, fat: 24 },
    micros: { fibre: 8, vitaminC: 16, magnesium: 50 },
    ingredients: [
      { name: "Roasted beets", quantity: "1.5 cups" },
      { name: "Mixed greens", quantity: "2 cups" },
      { name: "Goat cheese", quantity: "50g" },
      { name: "Walnuts", quantity: "1/4 cup" },
    ],
    steps: ["Toss greens with roasted beets.", "Crumble goat cheese over the top.", "Sprinkle with walnuts and a light vinaigrette."],
  },
  {
    id: "d10", name: "African Peanut Chicken Curry", cuisine: "African", mealType: "dinner",
    prepTime: 15, cookTime: 30, difficulty: "easy",
    phases: ["menstrual", "luteal"], goal: ["gain"],
    dietTags: ["gluten-free"], allergens: ["nuts"],
    photo: "dinner-african-peanut-chicken-curry.jpg",
    macros: { calories: 540, protein: 34, carbs: 38, fat: 26 },
    micros: { iron: 4, magnesium: 70, omega3: 0.4 },
    ingredients: [
      { name: "Chicken thighs", quantity: "250g" },
      { name: "Peanut butter", quantity: "3 tbsp" },
      { name: "Tomato & ginger", quantity: "1 cup" },
      { name: "Rice", quantity: "1 cup cooked" },
    ],
    steps: ["Brown chicken pieces.", "Add tomato, ginger and peanut butter, simmer until thick.", "Serve over rice."],
  },
  {
    id: "d11", name: "Zucchini Noodle Bolognese", cuisine: "Mediterranean", mealType: "dinner",
    prepTime: 15, cookTime: 30, difficulty: "easy",
    phases: ["luteal", "menstrual"], goal: ["lose", "maintain"],
    dietTags: ["gluten-free"], allergens: [],
    photo: "dinner-mediterranean-zucchini-noodle-bolognese.jpg",
    macros: { calories: 410, protein: 28, carbs: 24, fat: 20 },
    micros: { iron: 4, vitaminC: 28, fibre: 6 },
    ingredients: [
      { name: "Lean turkey mince", quantity: "200g" },
      { name: "Tomato sauce", quantity: "1.5 cups" },
      { name: "Zucchini noodles", quantity: "2 cups" },
      { name: "Basil & parmesan", quantity: "to taste" },
    ],
    steps: ["Brown turkey mince and add tomato sauce, simmer.", "Sauté zucchini noodles briefly.", "Top noodles with bolognese, basil and parmesan."],
  },
  {
    id: "d12", name: "Korean Beef Bibimbap", cuisine: "Asian", mealType: "dinner",
    prepTime: 20, cookTime: 20, difficulty: "elaborate",
    phases: ["follicular", "ovulatory"], goal: ["gain"],
    dietTags: [], allergens: ["soy", "eggs"],
    photo: "dinner-asian-korean-beef-bibimbap.jpg",
    macros: { calories: 530, protein: 32, carbs: 54, fat: 19 },
    micros: { iron: 5, vitaminC: 18, fibre: 7 },
    ingredients: [
      { name: "Thinly sliced beef", quantity: "150g" },
      { name: "Rice", quantity: "1 cup cooked" },
      { name: "Sautéed vegetables", quantity: "1.5 cups" },
      { name: "Fried egg & gochujang", quantity: "1" },
    ],
    steps: ["Marinate and quickly fry the beef.", "Arrange rice, vegetables and beef in a bowl.", "Top with a fried egg and gochujang."],
  },

  // ───────── Snacks (6) ─────────
  {
    id: "s01", name: "Dates + Almond Butter", cuisine: "Global", mealType: "snack",
    prepTime: 5, cookTime: 0, difficulty: "quick",
    phases: ["menstrual", "luteal"], goal: ["maintain", "gain"],
    dietTags: ["vegan", "gluten-free"], allergens: ["nuts"],
    photo: "snack-global-dates-almond-butter.jpg",
    macros: { calories: 210, protein: 5, carbs: 28, fat: 10 },
    micros: { magnesium: 40, iron: 1, fibre: 4 },
    ingredients: [
      { name: "Dates", quantity: "3" },
      { name: "Almond butter", quantity: "1 tbsp" },
    ],
    steps: ["Slice dates open.", "Fill with almond butter and serve."],
  },
  {
    id: "s02", name: "Greek Yoghurt, Berries & Flaxseed", cuisine: "Mediterranean", mealType: "snack",
    prepTime: 5, cookTime: 0, difficulty: "quick",
    phases: ["follicular", "ovulatory"], goal: ["lose", "maintain"],
    dietTags: ["vegetarian", "gluten-free"], allergens: ["dairy"],
    photo: "snack-mediterranean-greek-yoghurt-berries-flaxseed.jpg",
    macros: { calories: 180, protein: 16, carbs: 18, fat: 5 },
    micros: { vitaminC: 14, fibre: 4, omega3: 0.6 },
    ingredients: [
      { name: "Greek yoghurt", quantity: "150g" },
      { name: "Berries", quantity: "1/2 cup" },
      { name: "Flaxseeds", quantity: "1 tbsp" },
    ],
    steps: ["Spoon yoghurt into a bowl.", "Top with berries and flaxseeds."],
  },
  {
    id: "s03", name: "Carrot Sticks, Hummus & Seeds", cuisine: "Middle Eastern", mealType: "snack",
    prepTime: 5, cookTime: 0, difficulty: "quick",
    phases: ["ovulatory", "follicular"], goal: ["lose"],
    dietTags: ["vegan", "gluten-free"], allergens: [],
    photo: "snack-middle-eastern-carrot-sticks-hummus-seeds.jpg",
    macros: { calories: 160, protein: 6, carbs: 18, fat: 8 },
    micros: { fibre: 5, vitaminC: 8, vitaminB6: 0.2 },
    ingredients: [
      { name: "Carrots", quantity: "1 cup, sticks" },
      { name: "Hummus", quantity: "3 tbsp" },
      { name: "Mixed seeds", quantity: "1 tbsp" },
    ],
    steps: ["Cut carrots into sticks.", "Serve with hummus and a sprinkle of seeds."],
  },
  {
    id: "s04", name: "Banana, Dark Chocolate & Walnuts", cuisine: "Global", mealType: "snack",
    prepTime: 5, cookTime: 0, difficulty: "quick",
    phases: ["luteal", "menstrual"], goal: ["maintain", "gain"],
    dietTags: ["vegetarian"], allergens: ["nuts"],
    photo: "snack-global-banana-dark-chocolate-walnuts.jpg",
    macros: { calories: 230, protein: 4, carbs: 32, fat: 11 },
    micros: { magnesium: 45, fibre: 4 },
    ingredients: [
      { name: "Banana", quantity: "1" },
      { name: "Dark chocolate", quantity: "1 square" },
      { name: "Walnuts", quantity: "1 tbsp" },
    ],
    steps: ["Slice the banana.", "Top with chopped dark chocolate and walnuts."],
  },
  {
    id: "s05", name: "Roasted Chickpea Crunch", cuisine: "Mediterranean", mealType: "snack",
    prepTime: 10, cookTime: 25, difficulty: "quick",
    phases: ["menstrual", "follicular"], goal: ["lose", "maintain"],
    dietTags: ["vegan", "gluten-free"], allergens: [],
    photo: "snack-mediterranean-roasted-chickpea-crunch.jpg",
    macros: { calories: 190, protein: 8, carbs: 24, fat: 6 },
    micros: { fibre: 7, iron: 2 },
    ingredients: [
      { name: "Chickpeas", quantity: "1 cup" },
      { name: "Olive oil", quantity: "1 tsp" },
      { name: "Paprika & salt", quantity: "to taste" },
    ],
    steps: ["Toss chickpeas with oil and spices.", "Roast until crisp, about 25 minutes."],
  },
  {
    id: "s06", name: "Protein Energy Balls", cuisine: "Global", mealType: "snack",
    prepTime: 15, cookTime: 0, difficulty: "quick",
    phases: ["ovulatory", "luteal"], goal: ["gain", "maintain"],
    dietTags: ["vegetarian"], allergens: ["nuts"],
    photo: "snack-global-protein-energy-balls.jpg",
    macros: { calories: 260, protein: 26, carbs: 22, fat: 9 },
    micros: { magnesium: 50, fibre: 5, iron: 2 },
    ingredients: [
      { name: "Protein powder", quantity: "1/2 cup" },
      { name: "Oats", quantity: "1/2 cup" },
      { name: "Peanut butter", quantity: "2 tbsp" },
      { name: "Honey", quantity: "1 tbsp" },
    ],
    steps: ["Mix all ingredients into a dough.", "Roll into small balls.", "Chill for 30 minutes before eating."],
  },

  // ───────── Migrated from Meals Planner seed (4) ─────────
  {
    id: "rose-oats", name: "Rose-Berry Overnight Oats", cuisine: "Global", mealType: "breakfast",
    image: "/images/meal-oats.jpg",
    prepTime: 5, cookTime: 0, difficulty: "easy",
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
    ],
    steps: [
      "Mix oats, yogurt and milk in a jar.",
      "Stir in honey and half the strawberries.",
      "Chill overnight. Top with remaining berries in the morning.",
    ],
    cyclePhase: ["follicular", "ovulation", "any"],
    intention: ["light", "energy", "quick"],
    cost: "$",
    vibe: "Energizing",
    conservation: { fridgeDays: 3, freezerWeeks: 0, container: "Glass jar with lid" },
    batchTip: "Make 3 jars at once for the week.",
    substitutionTip: "Swap strawberries for any berry or chopped apple.",
    packable: true, noReheat: true,
  },
  {
    id: "rainbow-buddha", name: "Rainbow Salmon Buddha Bowl", cuisine: "Asian", mealType: "lunch",
    image: "/images/meal-buddha.jpg",
    prepTime: 10, cookTime: 15, difficulty: "easy",
    phases: ["ovulatory", "follicular"], goal: ["maintain", "gain"],
    dietTags: ["gluten-free"], allergens: [],
    macros: { calories: 480, protein: 32, carbs: 38, fat: 20 },
    micros: { omega3: 1.8, iron: 2, vitaminC: 20 },
    ingredients: [
      { name: "Salmon", quantity: "1 fillet" },
      { name: "Quinoa", quantity: "1/2 cup" },
      { name: "Avocado", quantity: "1/2" },
      { name: "Beets", quantity: "1/2 cup" },
      { name: "Spinach", quantity: "1 cup" },
      { name: "Olive oil", quantity: "1 tbsp" },
      { name: "Lemon", quantity: "1/2" },
    ],
    steps: [
      "Cook quinoa per package instructions.",
      "Bake salmon 12 min at 200°C with olive oil and lemon.",
      "Assemble bowl: quinoa, salmon, beets, spinach, avocado. Drizzle olive oil.",
    ],
    cyclePhase: ["ovulation", "follicular", "any"],
    intention: ["protein", "energy", "cycle"],
    cost: "$$",
    vibe: "Protein-rich",
    conservation: { fridgeDays: 2, freezerWeeks: 0, container: "Airtight glass container" },
    batchTip: "Cook a big batch of quinoa for the week.",
    substitutionTip: "Swap salmon for chickpeas (vegan).",
  },
  {
    id: "cozy-lentil", name: "Cozy Lentil Sweet Potato Stew", cuisine: "Global", mealType: "dinner",
    image: "/images/meal-stew.jpg",
    prepTime: 10, cookTime: 30, difficulty: "easy",
    phases: ["menstrual", "luteal"], goal: ["maintain", "lose"],
    dietTags: ["vegan", "vegetarian", "gluten-free"], allergens: [],
    macros: { calories: 380, protein: 14, carbs: 58, fat: 10 },
    micros: { iron: 5, fibre: 14, magnesium: 60 },
    ingredients: [
      { name: "Lentils", quantity: "1 cup" },
      { name: "Sweet potato", quantity: "2" },
      { name: "Onion", quantity: "1" },
      { name: "Garlic", quantity: "2 cloves" },
      { name: "Carrots", quantity: "2" },
      { name: "Cumin", quantity: "1 tsp" },
      { name: "Turmeric", quantity: "1/2 tsp" },
      { name: "Olive oil", quantity: "1 tbsp" },
    ],
    steps: [
      "Sauté onion, garlic and spices in olive oil 3 min.",
      "Add chopped carrots and sweet potato, stir 2 min.",
      "Add lentils + 4 cups water. Simmer 25 min until tender.",
    ],
    cyclePhase: ["period", "luteal", "any"],
    intention: ["comfort", "plant", "budget", "cycle"],
    cost: "$",
    vibe: "Balanced",
    conservation: { fridgeDays: 5, freezerWeeks: 8, container: "Airtight container or freezer bag" },
    batchTip: "Doubles beautifully — freeze half in single portions.",
    substitutionTip: "Swap sweet potato for butternut squash.",
  },
  {
    id: "kid-bento", name: "Strawberry Bento Lunchbox", cuisine: "Global", mealType: "lunchbox",
    image: "/images/meal-lunchbox.jpg",
    prepTime: 10, cookTime: 0, difficulty: "easy",
    phases: ["menstrual", "follicular", "ovulatory", "luteal"], goal: ["maintain"],
    dietTags: ["vegetarian"], allergens: ["dairy"],
    macros: { calories: 280, protein: 10, carbs: 38, fat: 9 },
    micros: { calcium: 150, vitaminC: 30 },
    ingredients: [
      { name: "Bread", quantity: "2 slices" },
      { name: "Cheddar", quantity: "30g cubes" },
      { name: "Cucumber", quantity: "1/2" },
      { name: "Strawberries", quantity: "6" },
    ],
    steps: [
      "Cut bread into mini sandwich rolls with cheese.",
      "Slice cucumber into rounds.",
      "Pack strawberries + cheese cubes in compartments.",
    ],
    cyclePhase: ["any"],
    intention: ["quick", "budget"],
    cost: "$",
    vibe: "Light",
    conservation: { fridgeDays: 1, freezerWeeks: 0, sameDay: true, container: "Bento box" },
    packable: true, noReheat: true,
    batchTip: "Prep 5 boxes on Sunday evening for Mon–Fri.",
    substitutionTip: "Swap cheddar for hummus (dairy-free).",
  },

  // ───────── Batch 2 — Breakfast (+6) ─────────
  {
    id: "b11", name: "Spinach Feta Breakfast Muffins", cuisine: "Mediterranean", mealType: "breakfast",
    prepTime: 15, cookTime: 20, difficulty: "easy",
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
    ],
    steps: ["Whisk eggs with milk and flour.", "Fold in spinach and feta.", "Bake in a muffin tin 20 min at 180°C."],
  },
  {
    id: "b12", name: "Vegan Tofu Breakfast Burrito", cuisine: "Latin", mealType: "breakfast",
    prepTime: 10, cookTime: 10, difficulty: "easy",
    phases: ["menstrual", "luteal"], goal: ["lose", "maintain"],
    dietTags: ["vegan", "gluten-free"], allergens: ["soy"],
    macros: { calories: 340, protein: 18, carbs: 36, fat: 14 },
    micros: { iron: 4, fibre: 7, vitaminC: 12 },
    ingredients: [
      { name: "Firm tofu", quantity: "150g" },
      { name: "Corn tortilla", quantity: "1" },
      { name: "Black beans", quantity: "1/2 cup" },
      { name: "Salsa", quantity: "2 tbsp" },
      { name: "Avocado", quantity: "1/4" },
      { name: "Turmeric", quantity: "1/2 tsp" },
    ],
    steps: ["Crumble and scramble tofu with turmeric.", "Warm the black beans.", "Assemble burrito with avocado and salsa."],
  },
  {
    id: "b13", name: "Overnight PB Banana Oats", cuisine: "Global", mealType: "breakfast",
    prepTime: 5, cookTime: 0, difficulty: "quick",
    phases: ["luteal", "menstrual"], goal: ["gain", "maintain"],
    dietTags: ["vegan"], allergens: ["nuts"],
    macros: { calories: 380, protein: 13, carbs: 52, fat: 14 },
    micros: { magnesium: 65, fibre: 8 },
    ingredients: [
      { name: "Oats", quantity: "1/2 cup" },
      { name: "Plant milk", quantity: "3/4 cup" },
      { name: "Peanut butter", quantity: "1 tbsp" },
      { name: "Banana", quantity: "1/2" },
      { name: "Chia seeds", quantity: "1 tsp" },
    ],
    steps: ["Combine oats, milk, peanut butter and chia seeds in a jar.", "Chill overnight.", "Top with sliced banana before eating."],
  },
  {
    id: "b14", name: "Shakshuka Verde", cuisine: "Middle Eastern", mealType: "breakfast",
    prepTime: 10, cookTime: 18, difficulty: "easy",
    phases: ["follicular", "ovulatory"], goal: ["maintain", "lose"],
    dietTags: ["vegetarian", "gluten-free"], allergens: ["eggs", "dairy"],
    macros: { calories: 310, protein: 19, carbs: 18, fat: 18 },
    micros: { iron: 3, fibre: 6, vitaminC: 30 },
    ingredients: [
      { name: "Spinach", quantity: "2 cups" },
      { name: "Green chili", quantity: "1" },
      { name: "Eggs", quantity: "2" },
      { name: "Feta", quantity: "30g" },
      { name: "Garlic", quantity: "2 cloves" },
    ],
    steps: ["Wilt spinach with garlic and chili.", "Crack eggs into wells and cover until set.", "Crumble feta on top before serving."],
  },
  {
    id: "b15", name: "Coconut Quinoa Porridge", cuisine: "Asian", mealType: "breakfast",
    prepTime: 5, cookTime: 12, difficulty: "easy",
    phases: ["ovulatory", "follicular"], goal: ["lose", "maintain"],
    dietTags: ["vegan", "gluten-free"], allergens: [],
    macros: { calories: 330, protein: 9, carbs: 48, fat: 12 },
    micros: { magnesium: 60, fibre: 6, iron: 2 },
    ingredients: [
      { name: "Cooked quinoa", quantity: "1 cup" },
      { name: "Coconut milk", quantity: "1/2 cup" },
      { name: "Mango", quantity: "1/2 cup" },
      { name: "Cinnamon", quantity: "1/2 tsp" },
      { name: "Maple syrup", quantity: "1 tsp" },
    ],
    steps: ["Warm quinoa with coconut milk and cinnamon.", "Top with diced mango and maple syrup."],
  },
  {
    id: "b16", name: "Halal Beef Breakfast Hash", cuisine: "African", mealType: "breakfast",
    prepTime: 15, cookTime: 20, difficulty: "easy",
    phases: ["menstrual", "luteal"], goal: ["gain", "maintain"],
    dietTags: ["halal", "gluten-free"], allergens: [],
    macros: { calories: 430, protein: 28, carbs: 32, fat: 20 },
    micros: { iron: 5, vitaminC: 16, fibre: 5 },
    ingredients: [
      { name: "Lean ground beef", quantity: "150g" },
      { name: "Sweet potato", quantity: "1 cup, diced" },
      { name: "Bell pepper", quantity: "1/2" },
      { name: "Onion", quantity: "1/2" },
      { name: "Paprika", quantity: "1 tsp" },
    ],
    steps: ["Pan-fry beef until browned.", "Add diced sweet potato, pepper, onion and paprika.", "Cook until tender, about 15 minutes."],
  },

  // ───────── Batch 2 — Lunch (+6) ─────────
  {
    id: "l13", name: "Vegan Buddha Bowl with Tempeh", cuisine: "Asian", mealType: "lunch",
    prepTime: 15, cookTime: 15, difficulty: "easy",
    phases: ["ovulatory", "follicular"], goal: ["lose", "gain"],
    dietTags: ["vegan", "gluten-free"], allergens: ["soy"],
    macros: { calories: 460, protein: 26, carbs: 48, fat: 18 },
    micros: { iron: 4, fibre: 11, vitaminC: 20 },
    ingredients: [
      { name: "Tempeh", quantity: "150g" },
      { name: "Brown rice", quantity: "1 cup cooked" },
      { name: "Broccoli", quantity: "1 cup" },
      { name: "Carrots", quantity: "1/2 cup" },
      { name: "Sesame dressing", quantity: "2 tbsp" },
    ],
    steps: ["Pan-fry tempeh until golden.", "Steam broccoli and carrots.", "Assemble bowl with rice and drizzle with dressing."],
  },
  {
    id: "l14", name: "Halal Chicken Shawarma Bowl", cuisine: "Middle Eastern", mealType: "lunch",
    prepTime: 15, cookTime: 15, difficulty: "easy",
    phases: ["follicular", "ovulatory"], goal: ["gain", "maintain"],
    dietTags: ["halal", "gluten-free"], allergens: [],
    macros: { calories: 470, protein: 36, carbs: 38, fat: 18 },
    micros: { iron: 3, vitaminC: 22, fibre: 6 },
    ingredients: [
      { name: "Chicken breast", quantity: "180g" },
      { name: "Shawarma spice", quantity: "1 tbsp" },
      { name: "Rice", quantity: "1 cup cooked" },
      { name: "Cucumber salad", quantity: "1 cup" },
      { name: "Tahini sauce", quantity: "2 tbsp" },
    ],
    steps: ["Marinate chicken in shawarma spice and grill.", "Slice the chicken.", "Serve over rice with cucumber salad and tahini."],
  },
  {
    id: "l15", name: "Caprese Quinoa Salad", cuisine: "Mediterranean", mealType: "lunch",
    prepTime: 10, cookTime: 0, difficulty: "quick",
    phases: ["ovulatory", "follicular"], goal: ["maintain", "lose"],
    dietTags: ["vegetarian", "gluten-free"], allergens: ["dairy"],
    macros: { calories: 380, protein: 16, carbs: 36, fat: 18 },
    micros: { fibre: 6, vitaminC: 18, calcium: 120 },
    ingredients: [
      { name: "Cooked quinoa", quantity: "1 cup" },
      { name: "Cherry tomatoes", quantity: "1 cup" },
      { name: "Mozzarella", quantity: "60g" },
      { name: "Basil", quantity: "1/4 cup" },
      { name: "Balsamic glaze", quantity: "1 tbsp" },
    ],
    steps: ["Toss quinoa with tomatoes and torn basil.", "Add mozzarella.", "Drizzle with balsamic glaze."],
  },
  {
    id: "l16", name: "Lentil & Sweet Potato Curry Wrap", cuisine: "Asian", mealType: "lunch",
    prepTime: 15, cookTime: 20, difficulty: "easy",
    phases: ["menstrual", "luteal"], goal: ["maintain", "lose"],
    dietTags: ["vegan"], allergens: [],
    macros: { calories: 410, protein: 15, carbs: 60, fat: 12 },
    micros: { iron: 5, fibre: 13, magnesium: 60 },
    ingredients: [
      { name: "Red lentils", quantity: "1/2 cup" },
      { name: "Sweet potato", quantity: "1 cup" },
      { name: "Curry powder", quantity: "1 tsp" },
      { name: "Coconut milk", quantity: "1/4 cup" },
      { name: "Whole-wheat wrap", quantity: "1" },
    ],
    steps: ["Simmer lentils and sweet potato with curry powder and coconut milk until soft.", "Fill the wrap and roll."],
  },
  {
    id: "l17", name: "Tuna Niçoise Salad", cuisine: "Mediterranean", mealType: "lunch",
    prepTime: 15, cookTime: 10, difficulty: "easy",
    phases: ["luteal", "ovulatory"], goal: ["lose", "gain"],
    dietTags: ["pescatarian", "gluten-free"], allergens: ["eggs"],
    macros: { calories: 400, protein: 32, carbs: 22, fat: 20 },
    micros: { omega3: 1.2, vitaminC: 16, fibre: 5 },
    ingredients: [
      { name: "Canned tuna", quantity: "120g" },
      { name: "Hard-boiled egg", quantity: "1" },
      { name: "Green beans", quantity: "1 cup" },
      { name: "Cherry tomatoes", quantity: "1/2 cup" },
      { name: "Olives & vinaigrette", quantity: "2 tbsp" },
    ],
    steps: ["Boil green beans until crisp-tender.", "Arrange tuna, egg, beans, tomatoes and olives on a plate.", "Drizzle with vinaigrette."],
  },
  {
    id: "l18", name: "Black Bean Quesadilla", cuisine: "Latin", mealType: "lunch",
    prepTime: 10, cookTime: 10, difficulty: "quick",
    phases: ["follicular", "menstrual"], goal: ["maintain", "gain"],
    dietTags: ["vegetarian"], allergens: ["dairy"],
    macros: { calories: 440, protein: 20, carbs: 46, fat: 18 },
    micros: { fibre: 10, iron: 3, calcium: 140 },
    ingredients: [
      { name: "Flour tortillas", quantity: "2" },
      { name: "Black beans", quantity: "1 cup" },
      { name: "Cheddar", quantity: "50g" },
      { name: "Bell pepper", quantity: "1/2" },
      { name: "Salsa", quantity: "2 tbsp" },
    ],
    steps: ["Mash black beans and spread on a tortilla with cheese and pepper.", "Top with the second tortilla and pan-fry until golden on both sides.", "Serve with salsa."],
  },

  // ───────── Batch 2 — Dinner (+6) ─────────
  {
    id: "d13", name: "Vegan Mushroom Risotto", cuisine: "Mediterranean", mealType: "dinner",
    prepTime: 15, cookTime: 30, difficulty: "elaborate",
    phases: ["luteal", "menstrual"], goal: ["maintain", "lose"],
    dietTags: ["vegan", "gluten-free"], allergens: [],
    macros: { calories: 420, protein: 11, carbs: 64, fat: 12 },
    micros: { magnesium: 50, fibre: 5, vitaminB6: 0.3 },
    ingredients: [
      { name: "Arborio rice", quantity: "1 cup" },
      { name: "Mushrooms", quantity: "2 cups" },
      { name: "Vegetable broth", quantity: "3 cups" },
      { name: "Onion", quantity: "1/2" },
      { name: "Nutritional yeast", quantity: "2 tbsp" },
    ],
    steps: ["Sauté onion and mushrooms.", "Add rice and toast briefly.", "Gradually add warm broth, stirring until creamy, then finish with nutritional yeast."],
  },
  {
    id: "d14", name: "Halal Lamb Kofta with Couscous", cuisine: "Middle Eastern", mealType: "dinner",
    prepTime: 20, cookTime: 20, difficulty: "easy",
    phases: ["menstrual", "luteal"], goal: ["gain"],
    dietTags: ["halal"], allergens: ["dairy"],
    macros: { calories: 540, protein: 34, carbs: 40, fat: 24 },
    micros: { iron: 5, magnesium: 55, vitaminC: 14 },
    ingredients: [
      { name: "Ground lamb", quantity: "200g" },
      { name: "Cumin & coriander", quantity: "1 tsp each" },
      { name: "Couscous", quantity: "1 cup cooked" },
      { name: "Tomato salad", quantity: "1 cup" },
      { name: "Mint yoghurt", quantity: "2 tbsp" },
    ],
    steps: ["Mix lamb with spices and shape into koftas.", "Grill until cooked through.", "Serve over couscous with tomato salad and mint yoghurt."],
  },
  {
    id: "d15", name: "Baked Cod with Roasted Veg", cuisine: "Nordic", mealType: "dinner",
    prepTime: 10, cookTime: 25, difficulty: "easy",
    phases: ["follicular", "ovulatory"], goal: ["lose", "maintain"],
    dietTags: ["pescatarian", "gluten-free"], allergens: [],
    macros: { calories: 380, protein: 34, carbs: 26, fat: 12 },
    micros: { omega3: 1.0, vitaminD: 250, vitaminC: 24 },
    ingredients: [
      { name: "Cod fillet", quantity: "180g" },
      { name: "Zucchini", quantity: "1" },
      { name: "Bell pepper", quantity: "1" },
      { name: "Cherry tomatoes", quantity: "1 cup" },
      { name: "Olive oil", quantity: "1 tbsp" },
    ],
    steps: ["Toss vegetables with olive oil and roast 15 min at 200°C.", "Add the cod fillet and bake another 10 min until flaky."],
  },
  {
    id: "d16", name: "Thai Green Curry with Tofu", cuisine: "Asian", mealType: "dinner",
    prepTime: 15, cookTime: 20, difficulty: "easy",
    phases: ["ovulatory", "follicular"], goal: ["lose", "gain"],
    dietTags: ["vegan", "gluten-free"], allergens: ["soy"],
    macros: { calories: 450, protein: 18, carbs: 42, fat: 24 },
    micros: { iron: 3, fibre: 6, vitaminC: 18 },
    ingredients: [
      { name: "Firm tofu", quantity: "200g" },
      { name: "Green curry paste", quantity: "2 tbsp" },
      { name: "Coconut milk", quantity: "1 cup" },
      { name: "Mixed vegetables", quantity: "2 cups" },
      { name: "Jasmine rice", quantity: "1 cup cooked" },
    ],
    steps: ["Pan-fry tofu until golden.", "Simmer curry paste with coconut milk and vegetables.", "Add tofu and serve over rice."],
  },
  {
    id: "d17", name: "Turkey Meatballs in Tomato Sauce", cuisine: "Mediterranean", mealType: "dinner",
    prepTime: 15, cookTime: 25, difficulty: "easy",
    phases: ["luteal", "menstrual"], goal: ["lose", "maintain"],
    dietTags: ["gluten-free"], allergens: ["eggs", "dairy"],
    macros: { calories: 410, protein: 36, carbs: 26, fat: 16 },
    micros: { iron: 4, vitaminC: 20, fibre: 5 },
    ingredients: [
      { name: "Ground turkey", quantity: "250g" },
      { name: "Egg", quantity: "1" },
      { name: "Tomato sauce", quantity: "1.5 cups" },
      { name: "Parmesan", quantity: "2 tbsp" },
      { name: "Basil", quantity: "to taste" },
    ],
    steps: ["Mix turkey with egg and shape into meatballs.", "Simmer in tomato sauce for 20 minutes.", "Finish with parmesan and basil."],
  },
  {
    id: "d18", name: "Stuffed Sweet Potatoes with Black Beans", cuisine: "Latin", mealType: "dinner",
    prepTime: 10, cookTime: 35, difficulty: "easy",
    phases: ["follicular", "ovulatory"], goal: ["lose", "maintain"],
    dietTags: ["vegan", "gluten-free"], allergens: [],
    macros: { calories: 390, protein: 13, carbs: 66, fat: 9 },
    micros: { fibre: 14, magnesium: 70, vitaminC: 22 },
    ingredients: [
      { name: "Sweet potatoes", quantity: "2" },
      { name: "Black beans", quantity: "1 cup" },
      { name: "Corn", quantity: "1/2 cup" },
      { name: "Lime & cilantro", quantity: "to taste" },
      { name: "Avocado", quantity: "1/2" },
    ],
    steps: ["Bake sweet potatoes until tender, about 30 minutes.", "Warm black beans with corn and lime.", "Split potatoes and fill with beans, corn and avocado."],
  },

  // ───────── Batch 2 — Snacks (+5) ─────────
  {
    id: "s07", name: "Apple & Almond Butter Slices", cuisine: "Global", mealType: "snack",
    prepTime: 5, cookTime: 0, difficulty: "quick",
    phases: ["follicular", "ovulatory"], goal: ["lose", "maintain"],
    dietTags: ["vegan", "gluten-free"], allergens: ["nuts"],
    macros: { calories: 200, protein: 5, carbs: 26, fat: 9 },
    micros: { fibre: 5, magnesium: 30 },
    ingredients: [
      { name: "Apple", quantity: "1" },
      { name: "Almond butter", quantity: "1 tbsp" },
    ],
    steps: ["Slice apple into wedges.", "Serve with almond butter for dipping."],
  },
  {
    id: "s08", name: "Cottage Cheese & Pineapple", cuisine: "Global", mealType: "snack",
    prepTime: 5, cookTime: 0, difficulty: "quick",
    phases: ["ovulatory", "follicular"], goal: ["lose", "maintain"],
    dietTags: ["vegetarian", "gluten-free"], allergens: ["dairy"],
    macros: { calories: 170, protein: 18, carbs: 16, fat: 4 },
    micros: { calcium: 120, vitaminC: 20 },
    ingredients: [
      { name: "Cottage cheese", quantity: "150g" },
      { name: "Pineapple chunks", quantity: "1/2 cup" },
    ],
    steps: ["Spoon cottage cheese into a bowl.", "Top with pineapple chunks."],
  },
  {
    id: "s09", name: "Edamame with Sea Salt", cuisine: "Asian", mealType: "snack",
    prepTime: 5, cookTime: 5, difficulty: "quick",
    phases: ["menstrual", "luteal"], goal: ["lose", "maintain"],
    dietTags: ["vegan", "gluten-free"], allergens: ["soy"],
    macros: { calories: 150, protein: 13, carbs: 11, fat: 6 },
    micros: { iron: 2, magnesium: 50, fibre: 5 },
    ingredients: [
      { name: "Frozen edamame", quantity: "1 cup" },
      { name: "Sea salt", quantity: "to taste" },
    ],
    steps: ["Steam or boil edamame for 5 minutes.", "Sprinkle with sea salt and serve in the pods."],
  },
  {
    id: "s10", name: "Trail Mix Cup", cuisine: "Global", mealType: "snack",
    prepTime: 5, cookTime: 0, difficulty: "quick",
    phases: ["luteal", "menstrual"], goal: ["gain", "maintain"],
    dietTags: ["vegan", "gluten-free"], allergens: ["nuts"],
    macros: { calories: 240, protein: 6, carbs: 22, fat: 15 },
    micros: { magnesium: 55, iron: 2, fibre: 4 },
    ingredients: [
      { name: "Mixed nuts", quantity: "2 tbsp" },
      { name: "Dried cranberries", quantity: "1 tbsp" },
      { name: "Dark chocolate chips", quantity: "1 tbsp" },
      { name: "Pumpkin seeds", quantity: "1 tbsp" },
    ],
    steps: ["Combine all ingredients in a small cup or bag."],
  },
  {
    id: "s11", name: "Cucumber Tzatziki Bites", cuisine: "Mediterranean", mealType: "snack",
    prepTime: 10, cookTime: 0, difficulty: "quick",
    phases: ["ovulatory", "follicular"], goal: ["lose"],
    dietTags: ["vegetarian", "gluten-free"], allergens: ["dairy"],
    macros: { calories: 120, protein: 6, carbs: 8, fat: 7 },
    micros: { calcium: 60, vitaminC: 6 },
    ingredients: [
      { name: "Cucumber", quantity: "1" },
      { name: "Greek yoghurt", quantity: "1/3 cup" },
      { name: "Garlic & dill", quantity: "to taste" },
    ],
    steps: ["Slice cucumber into rounds.", "Mix yoghurt with garlic and dill.", "Top each round with a spoonful of tzatziki."],
  },

  // ───────── Batch 2 — Lunchbox (+3) ─────────
  {
    id: "lb01", name: "Veggie Wrap Pinwheels", cuisine: "Mediterranean", mealType: "lunchbox",
    prepTime: 10, cookTime: 0, difficulty: "easy",
    phases: ["menstrual", "follicular", "ovulatory", "luteal"], goal: ["maintain"],
    dietTags: ["vegetarian"], allergens: ["dairy"],
    macros: { calories: 260, protein: 9, carbs: 30, fat: 11 },
    micros: { fibre: 4, vitaminC: 14 },
    ingredients: [
      { name: "Tortilla", quantity: "1" },
      { name: "Cream cheese", quantity: "2 tbsp" },
      { name: "Spinach", quantity: "1/2 cup" },
      { name: "Shredded carrot", quantity: "1/4 cup" },
      { name: "Bell pepper strips", quantity: "1/4 cup" },
    ],
    steps: ["Spread cream cheese on the tortilla.", "Layer spinach, carrot and pepper.", "Roll tightly and slice into pinwheels."],
    conservation: { fridgeDays: 1, freezerWeeks: 0, sameDay: true, container: "Lunchbox container" },
    packable: true,
  },
  {
    id: "lb02", name: "Turkey & Cheese Roll-ups", cuisine: "Global", mealType: "lunchbox",
    prepTime: 8, cookTime: 0, difficulty: "easy",
    phases: ["menstrual", "follicular", "ovulatory", "luteal"], goal: ["maintain", "gain"],
    dietTags: ["gluten-free"], allergens: ["dairy"],
    macros: { calories: 220, protein: 20, carbs: 4, fat: 14 },
    micros: { calcium: 100, iron: 1 },
    ingredients: [
      { name: "Turkey breast slices", quantity: "100g" },
      { name: "Cheddar", quantity: "30g" },
      { name: "Cucumber sticks", quantity: "1/2 cup" },
    ],
    steps: ["Roll turkey slices around cheese sticks.", "Pack with cucumber sticks."],
    conservation: { fridgeDays: 2, freezerWeeks: 0, sameDay: true, container: "Lunchbox container" },
    packable: true, noReheat: true,
  },
  {
    id: "lb03", name: "Fruit & Yogurt Parfait Cup", cuisine: "Global", mealType: "lunchbox",
    prepTime: 5, cookTime: 0, difficulty: "easy",
    phases: ["menstrual", "follicular", "ovulatory", "luteal"], goal: ["lose", "maintain"],
    dietTags: ["vegetarian", "gluten-free"], allergens: ["dairy"],
    macros: { calories: 210, protein: 12, carbs: 30, fat: 5 },
    micros: { calcium: 150, vitaminC: 16, fibre: 3 },
    ingredients: [
      { name: "Greek yoghurt", quantity: "1/2 cup" },
      { name: "Granola", quantity: "2 tbsp" },
      { name: "Mixed berries", quantity: "1/2 cup" },
    ],
    steps: ["Layer yoghurt, granola and berries in a small jar.", "Chill until ready to pack."],
    conservation: { fridgeDays: 1, freezerWeeks: 0, sameDay: true, container: "Small jar" },
    packable: true, noReheat: true,
  },

  // ───────── Batch 3 — Breakfast (+5) ─────────
  {
    id: "b17", name: "Smoked Mackerel Rye Toast", cuisine: "Nordic", mealType: "breakfast",
    prepTime: 8, cookTime: 0, difficulty: "quick",
    phases: ["menstrual", "luteal"], goal: ["maintain", "lose"],
    dietTags: ["pescatarian"], allergens: ["dairy"],
    macros: { calories: 350, protein: 24, carbs: 28, fat: 16 },
    micros: { iron: 3, omega3: 1.6, fibre: 5 },
    ingredients: [
      { name: "Rye bread", quantity: "2 slices" },
      { name: "Smoked mackerel", quantity: "80g" },
      { name: "Cream cheese", quantity: "1 tbsp" },
      { name: "Radish", quantity: "3, sliced" },
      { name: "Dill", quantity: "1 tsp" },
    ],
    steps: ["Toast the rye bread.", "Spread with cream cheese.", "Top with flaked mackerel, radish and dill."],
  },
  {
    id: "b18", name: "Chickpea Pancakes (Socca)", cuisine: "Mediterranean", mealType: "breakfast",
    prepTime: 10, cookTime: 12, difficulty: "easy",
    phases: ["follicular", "ovulatory"], goal: ["lose", "maintain"],
    dietTags: ["vegan", "gluten-free"], allergens: [],
    macros: { calories: 280, protein: 12, carbs: 34, fat: 10 },
    micros: { iron: 3, fibre: 6, vitaminB6: 0.3 },
    ingredients: [
      { name: "Chickpea flour", quantity: "1 cup" },
      { name: "Water", quantity: "1 cup" },
      { name: "Olive oil", quantity: "1 tbsp" },
      { name: "Rosemary", quantity: "1 tsp" },
      { name: "Cherry tomatoes", quantity: "1/2 cup" },
    ],
    steps: ["Whisk chickpea flour with water and oil into a batter.", "Cook in a pan until set and golden.", "Top with rosemary and halved tomatoes."],
  },
  {
    id: "b19", name: "Turkey Sausage Breakfast Bowl", cuisine: "Global", mealType: "breakfast",
    prepTime: 10, cookTime: 15, difficulty: "easy",
    phases: ["menstrual", "luteal"], goal: ["gain", "maintain"],
    dietTags: ["halal", "gluten-free"], allergens: [],
    macros: { calories: 410, protein: 30, carbs: 26, fat: 20 },
    micros: { iron: 4, vitaminC: 18, fibre: 5 },
    ingredients: [
      { name: "Turkey breakfast sausages", quantity: "2" },
      { name: "Sweet potato hash", quantity: "1 cup" },
      { name: "Spinach", quantity: "1 cup" },
      { name: "Egg", quantity: "1" },
    ],
    steps: ["Pan-fry turkey sausages until cooked through.", "Crisp sweet potato hash in the same pan.", "Wilt spinach and top with a fried egg."],
  },
  {
    id: "b20", name: "Ricotta Toast with Honey & Figs", cuisine: "Mediterranean", mealType: "breakfast",
    prepTime: 5, cookTime: 0, difficulty: "quick",
    phases: ["ovulatory", "follicular"], goal: ["maintain", "gain"],
    dietTags: ["vegetarian"], allergens: ["dairy"],
    macros: { calories: 300, protein: 12, carbs: 38, fat: 11 },
    micros: { calcium: 140, fibre: 4 },
    ingredients: [
      { name: "Sourdough bread", quantity: "1 slice" },
      { name: "Ricotta", quantity: "1/3 cup" },
      { name: "Figs", quantity: "2, sliced" },
      { name: "Honey", quantity: "1 tsp" },
      { name: "Walnuts", quantity: "1 tbsp, crushed" },
    ],
    steps: ["Toast the sourdough.", "Spread with ricotta.", "Top with sliced figs, honey and crushed walnuts."],
  },
  {
    id: "b21", name: "Buckwheat Crepes with Berries", cuisine: "Global", mealType: "breakfast",
    prepTime: 10, cookTime: 10, difficulty: "easy",
    phases: ["luteal", "menstrual"], goal: ["lose", "maintain"],
    dietTags: ["vegan", "gluten-free"], allergens: [],
    macros: { calories: 290, protein: 8, carbs: 50, fat: 7 },
    micros: { magnesium: 50, fibre: 6, vitaminC: 14 },
    ingredients: [
      { name: "Buckwheat flour", quantity: "1/2 cup" },
      { name: "Plant milk", quantity: "3/4 cup" },
      { name: "Mixed berries", quantity: "1/2 cup" },
      { name: "Maple syrup", quantity: "1 tbsp" },
    ],
    steps: ["Whisk buckwheat flour with plant milk into a thin batter.", "Cook thin crepes in a non-stick pan.", "Fill with berries and drizzle with maple syrup."],
  },

  // ───────── Batch 3 — Lunch (+6) ─────────
  {
    id: "l19", name: "Falafel Buddha Bowl", cuisine: "Middle Eastern", mealType: "lunch",
    prepTime: 15, cookTime: 15, difficulty: "easy",
    phases: ["follicular", "ovulatory"], goal: ["lose", "maintain"],
    dietTags: ["vegan", "gluten-free"], allergens: [],
    macros: { calories: 460, protein: 16, carbs: 54, fat: 20 },
    micros: { iron: 4, fibre: 12, vitaminB6: 0.4 },
    ingredients: [
      { name: "Falafel", quantity: "5 pieces" },
      { name: "Quinoa", quantity: "1 cup cooked" },
      { name: "Cucumber", quantity: "1/2 cup" },
      { name: "Cherry tomatoes", quantity: "1/2 cup" },
      { name: "Tahini dressing", quantity: "2 tbsp" },
    ],
    steps: ["Bake or warm falafel.", "Arrange over quinoa with cucumber and tomatoes.", "Drizzle with tahini dressing."],
  },
  {
    id: "l20", name: "Shrimp & Avocado Rice Bowl", cuisine: "Asian", mealType: "lunch",
    prepTime: 10, cookTime: 10, difficulty: "easy",
    phases: ["ovulatory", "follicular"], goal: ["lose", "maintain"],
    dietTags: ["pescatarian", "gluten-free"], allergens: ["shellfish"],
    macros: { calories: 420, protein: 28, carbs: 44, fat: 14 },
    micros: { iron: 2, vitaminC: 16, fibre: 6 },
    ingredients: [
      { name: "Shrimp", quantity: "150g" },
      { name: "Brown rice", quantity: "1 cup cooked" },
      { name: "Avocado", quantity: "1/2" },
      { name: "Edamame", quantity: "1/4 cup" },
      { name: "Soy-lime dressing", quantity: "1 tbsp" },
    ],
    steps: ["Pan-sear shrimp until pink.", "Assemble over rice with avocado and edamame.", "Drizzle with soy-lime dressing."],
  },
  {
    id: "l21", name: "Beef Kofta Wrap", cuisine: "Middle Eastern", mealType: "lunch",
    prepTime: 15, cookTime: 12, difficulty: "easy",
    phases: ["menstrual", "luteal"], goal: ["gain", "maintain"],
    dietTags: ["halal"], allergens: ["dairy"],
    macros: { calories: 480, protein: 32, carbs: 38, fat: 20 },
    micros: { iron: 5, vitaminC: 10, fibre: 4 },
    ingredients: [
      { name: "Ground beef", quantity: "150g" },
      { name: "Flatbread", quantity: "1" },
      { name: "Cumin", quantity: "1 tsp" },
      { name: "Yoghurt sauce", quantity: "2 tbsp" },
      { name: "Lettuce", quantity: "1/2 cup" },
    ],
    steps: ["Mix beef with cumin and shape into koftas.", "Grill or pan-fry until cooked through.", "Wrap in flatbread with lettuce and yoghurt sauce."],
  },
  {
    id: "l22", name: "Caprese Panini", cuisine: "Mediterranean", mealType: "lunch",
    prepTime: 8, cookTime: 6, difficulty: "quick",
    phases: ["follicular", "ovulatory"], goal: ["maintain"],
    dietTags: ["vegetarian"], allergens: ["dairy"],
    macros: { calories: 410, protein: 18, carbs: 40, fat: 18 },
    micros: { calcium: 200, vitaminC: 12, fibre: 3 },
    ingredients: [
      { name: "Ciabatta", quantity: "1 roll" },
      { name: "Mozzarella", quantity: "60g" },
      { name: "Tomato", quantity: "1, sliced" },
      { name: "Basil", quantity: "small handful" },
      { name: "Balsamic glaze", quantity: "1 tsp" },
    ],
    steps: ["Layer mozzarella, tomato and basil in the ciabatta.", "Grill in a panini press until toasted.", "Drizzle with balsamic glaze before serving."],
  },
  {
    id: "l23", name: "Moroccan Couscous Salad", cuisine: "African", mealType: "lunch",
    prepTime: 15, cookTime: 5, difficulty: "easy",
    phases: ["luteal", "menstrual"], goal: ["lose", "maintain"],
    dietTags: ["vegan"], allergens: [],
    macros: { calories: 390, protein: 11, carbs: 60, fat: 11 },
    micros: { iron: 3, fibre: 8, vitaminC: 20 },
    ingredients: [
      { name: "Couscous", quantity: "1 cup cooked" },
      { name: "Chickpeas", quantity: "1/2 cup" },
      { name: "Dried apricots", quantity: "1/4 cup, chopped" },
      { name: "Mint", quantity: "small handful" },
      { name: "Lemon dressing", quantity: "2 tbsp" },
    ],
    steps: ["Fluff couscous and toss with chickpeas and apricots.", "Add chopped mint.", "Dress with lemon dressing before serving."],
  },
  {
    id: "l24", name: "Chicken Caesar Lettuce Wraps", cuisine: "Global", mealType: "lunch",
    prepTime: 12, cookTime: 10, difficulty: "easy",
    phases: ["follicular", "ovulatory"], goal: ["lose", "gain"],
    dietTags: ["gluten-free"], allergens: ["dairy", "eggs"],
    macros: { calories: 380, protein: 34, carbs: 12, fat: 22 },
    micros: { calcium: 90, fibre: 3, vitaminC: 8 },
    ingredients: [
      { name: "Chicken breast", quantity: "150g" },
      { name: "Romaine lettuce leaves", quantity: "4 large" },
      { name: "Parmesan", quantity: "2 tbsp" },
      { name: "Caesar dressing", quantity: "2 tbsp" },
    ],
    steps: ["Grill and slice the chicken breast.", "Fill lettuce leaves with chicken and parmesan.", "Drizzle with Caesar dressing and wrap."],
  },

  // ───────── Batch 3 — Dinner (+6) ─────────
  {
    id: "d19", name: "Stuffed Bell Peppers with Quinoa", cuisine: "Mediterranean", mealType: "dinner",
    prepTime: 15, cookTime: 35, difficulty: "medium",
    phases: ["follicular", "ovulatory"], goal: ["lose", "maintain"],
    dietTags: ["vegan", "gluten-free"], allergens: [],
    macros: { calories: 380, protein: 13, carbs: 56, fat: 11 },
    micros: { iron: 3, fibre: 10, vitaminC: 60 },
    ingredients: [
      { name: "Bell peppers", quantity: "2 large" },
      { name: "Quinoa", quantity: "1 cup cooked" },
      { name: "Black beans", quantity: "1/2 cup" },
      { name: "Corn", quantity: "1/2 cup" },
      { name: "Tomato sauce", quantity: "1/2 cup" },
    ],
    steps: ["Halve peppers and remove seeds.", "Mix quinoa, black beans and corn, fill peppers.", "Top with tomato sauce and bake 30 minutes at 200°C."],
  },
  {
    id: "d20", name: "Garlic Butter Shrimp Zoodles", cuisine: "Mediterranean", mealType: "dinner",
    prepTime: 10, cookTime: 12, difficulty: "easy",
    phases: ["luteal", "menstrual"], goal: ["lose"],
    dietTags: ["pescatarian", "gluten-free"], allergens: ["shellfish", "dairy"],
    macros: { calories: 340, protein: 30, carbs: 14, fat: 18 },
    micros: { iron: 2, vitaminC: 22, fibre: 4 },
    ingredients: [
      { name: "Shrimp", quantity: "180g" },
      { name: "Zucchini noodles", quantity: "2 cups" },
      { name: "Garlic", quantity: "3 cloves" },
      { name: "Butter", quantity: "1 tbsp" },
      { name: "Lemon", quantity: "1/2" },
    ],
    steps: ["Sauté garlic in butter.", "Add shrimp and cook until pink.", "Toss in zucchini noodles and finish with lemon juice."],
  },
  {
    id: "d21", name: "Chicken Tagine with Apricots", cuisine: "African", mealType: "dinner",
    prepTime: 15, cookTime: 45, difficulty: "medium",
    phases: ["menstrual", "luteal"], goal: ["gain", "maintain"],
    dietTags: ["halal", "gluten-free"], allergens: [],
    macros: { calories: 480, protein: 38, carbs: 36, fat: 18 },
    micros: { iron: 5, fibre: 6, vitaminC: 14 },
    ingredients: [
      { name: "Chicken thighs", quantity: "300g" },
      { name: "Dried apricots", quantity: "1/3 cup" },
      { name: "Onion", quantity: "1" },
      { name: "Cinnamon", quantity: "1 tsp" },
      { name: "Ras el hanout", quantity: "1 tsp" },
      { name: "Chicken broth", quantity: "1/2 cup" },
      { name: "Olive oil", quantity: "1 tbsp" },
      { name: "Almonds", quantity: "2 tbsp" },
    ],
    steps: ["Heat olive oil in a tagine or deep pan. Brown chicken thighs with onion 4–5 min each side.", "Add apricots, cinnamon, ras el hanout and broth; cover and simmer 35 minutes over low heat.", "Top with toasted almonds before serving."],
  },
  {
    id: "d22", name: "Eggplant Parmesan", cuisine: "Mediterranean", mealType: "dinner",
    prepTime: 20, cookTime: 35, difficulty: "medium",
    phases: ["follicular", "ovulatory"], goal: ["maintain"],
    dietTags: ["vegetarian"], allergens: ["dairy", "eggs"],
    macros: { calories: 420, protein: 19, carbs: 32, fat: 24 },
    micros: { calcium: 250, fibre: 8, vitaminC: 16 },
    ingredients: [
      { name: "Eggplant", quantity: "1 large" },
      { name: "Mozzarella", quantity: "80g" },
      { name: "Parmesan", quantity: "2 tbsp" },
      { name: "Tomato sauce", quantity: "1 cup" },
      { name: "Egg", quantity: "1" },
    ],
    steps: ["Slice and lightly fry eggplant.", "Layer with tomato sauce, mozzarella and parmesan in a dish.", "Bake 25 minutes at 190°C until golden."],
  },
  {
    id: "d23", name: "Red Lentil Curry", cuisine: "Asian", mealType: "dinner",
    prepTime: 10, cookTime: 25, difficulty: "easy",
    phases: ["luteal", "menstrual"], goal: ["lose", "maintain"],
    dietTags: ["vegan", "gluten-free"], allergens: [],
    macros: { calories: 390, protein: 17, carbs: 52, fat: 12 },
    micros: { iron: 6, fibre: 12, vitaminB6: 0.5 },
    ingredients: [
      { name: "Red lentils", quantity: "1 cup" },
      { name: "Coconut milk", quantity: "1/2 cup" },
      { name: "Curry powder", quantity: "1 tbsp" },
      { name: "Spinach", quantity: "1 cup" },
      { name: "Brown rice", quantity: "1 cup cooked" },
    ],
    steps: ["Simmer lentils with coconut milk and curry powder until soft.", "Stir in spinach until wilted.", "Serve over brown rice."],
  },
  {
    id: "d24", name: "Honey Garlic Salmon with Asparagus", cuisine: "Nordic", mealType: "dinner",
    prepTime: 10, cookTime: 18, difficulty: "easy",
    phases: ["ovulatory", "follicular"], goal: ["maintain", "gain"],
    dietTags: ["pescatarian", "gluten-free"], allergens: [],
    macros: { calories: 440, protein: 34, carbs: 22, fat: 22 },
    micros: { omega3: 1.9, iron: 2, vitaminC: 10 },
    ingredients: [
      { name: "Salmon fillet", quantity: "180g" },
      { name: "Asparagus", quantity: "1 cup" },
      { name: "Honey", quantity: "1 tbsp" },
      { name: "Garlic", quantity: "2 cloves" },
      { name: "Soy sauce", quantity: "1 tbsp" },
    ],
    steps: ["Mix honey, garlic and soy sauce, brush over salmon.", "Roast salmon and asparagus together 15 minutes at 200°C.", "Spoon remaining glaze over before serving."],
  },

  // ───────── Batch 3 — Snacks (+5) ─────────
  {
    id: "s12", name: "Roasted Edamame & Pumpkin Seeds", cuisine: "Asian", mealType: "snack",
    prepTime: 5, cookTime: 15, difficulty: "easy",
    phases: ["follicular", "ovulatory"], goal: ["lose", "maintain"],
    dietTags: ["vegan", "gluten-free"], allergens: ["soy"],
    macros: { calories: 180, protein: 11, carbs: 14, fat: 9 },
    micros: { iron: 2, magnesium: 50, fibre: 5 },
    ingredients: [
      { name: "Edamame", quantity: "1/2 cup" },
      { name: "Pumpkin seeds", quantity: "2 tbsp" },
      { name: "Sea salt", quantity: "1 pinch" },
    ],
    steps: ["Roast edamame and pumpkin seeds with sea salt at 180°C for 12 minutes.", "Cool slightly before eating."],
  },
  {
    id: "s13", name: "Cheese & Whole Grain Crackers", cuisine: "Global", mealType: "snack",
    prepTime: 3, cookTime: 0, difficulty: "quick",
    phases: ["menstrual", "luteal"], goal: ["maintain", "gain"],
    dietTags: ["vegetarian"], allergens: ["dairy"],
    macros: { calories: 200, protein: 9, carbs: 16, fat: 11 },
    micros: { calcium: 150, fibre: 2 },
    ingredients: [
      { name: "Whole grain crackers", quantity: "6" },
      { name: "Cheddar", quantity: "40g" },
      { name: "Grapes", quantity: "1/2 cup" },
    ],
    steps: ["Slice cheddar and serve with crackers and grapes."],
  },
  {
    id: "s14", name: "Berry Smoothie Cup", cuisine: "Global", mealType: "snack",
    prepTime: 5, cookTime: 0, difficulty: "quick",
    phases: ["ovulatory", "follicular"], goal: ["lose", "maintain"],
    dietTags: ["vegan", "gluten-free"], allergens: [],
    macros: { calories: 160, protein: 4, carbs: 32, fat: 2 },
    micros: { vitaminC: 40, fibre: 5 },
    ingredients: [
      { name: "Mixed berries", quantity: "1 cup" },
      { name: "Plant milk", quantity: "1/2 cup" },
      { name: "Maple syrup", quantity: "1 tsp" },
    ],
    steps: ["Blend berries, plant milk and maple syrup until smooth."],
  },
  {
    id: "s15", name: "Spiced Roasted Chickpeas", cuisine: "Middle Eastern", mealType: "snack",
    prepTime: 5, cookTime: 25, difficulty: "easy",
    phases: ["luteal", "menstrual"], goal: ["lose", "maintain"],
    dietTags: ["halal", "vegan", "gluten-free"], allergens: [],
    macros: { calories: 170, protein: 8, carbs: 24, fat: 5 },
    micros: { iron: 2, fibre: 6, vitaminB6: 0.3 },
    ingredients: [
      { name: "Chickpeas", quantity: "1 cup, drained" },
      { name: "Cumin", quantity: "1 tsp" },
      { name: "Paprika", quantity: "1/2 tsp" },
      { name: "Olive oil", quantity: "1 tsp" },
    ],
    steps: ["Toss chickpeas with oil and spices.", "Roast at 200°C for 20-25 minutes until crisp."],
  },
  {
    id: "s16", name: "Yoghurt & Honey Dip with Apple", cuisine: "Mediterranean", mealType: "snack",
    prepTime: 3, cookTime: 0, difficulty: "quick",
    phases: ["follicular", "ovulatory"], goal: ["maintain"],
    dietTags: ["vegetarian", "gluten-free"], allergens: ["dairy"],
    macros: { calories: 150, protein: 8, carbs: 22, fat: 3 },
    micros: { calcium: 120, fibre: 3 },
    ingredients: [
      { name: "Greek yoghurt", quantity: "1/2 cup" },
      { name: "Honey", quantity: "1 tsp" },
      { name: "Apple", quantity: "1, sliced" },
      { name: "Cinnamon", quantity: "1 pinch" },
    ],
    steps: ["Stir honey and cinnamon into yoghurt.", "Serve with apple slices for dipping."],
  },

  // ───────── Batch 3 — Lunchbox (+4) ─────────
  {
    id: "lb04", name: "Hummus & Veggie Sticks Box", cuisine: "Mediterranean", mealType: "lunchbox",
    prepTime: 8, cookTime: 0, difficulty: "easy",
    phases: ["menstrual", "follicular", "ovulatory", "luteal"], goal: ["maintain", "lose"],
    dietTags: ["vegan", "gluten-free"], allergens: [],
    macros: { calories: 220, protein: 7, carbs: 24, fat: 10 },
    micros: { fibre: 7, vitaminC: 20 },
    ingredients: [
      { name: "Hummus", quantity: "1/4 cup" },
      { name: "Carrot sticks", quantity: "1/2 cup" },
      { name: "Cucumber sticks", quantity: "1/2 cup" },
      { name: "Whole grain crackers", quantity: "4" },
    ],
    steps: ["Portion hummus into a small container.", "Pack alongside carrot and cucumber sticks and crackers."],
    conservation: { fridgeDays: 2, freezerWeeks: 0, sameDay: true, container: "Lunchbox container" },
    packable: true, noReheat: true,
  },
  {
    id: "lb05", name: "Cheese & Crackers Lunchbox", cuisine: "Global", mealType: "lunchbox",
    prepTime: 5, cookTime: 0, difficulty: "easy",
    phases: ["menstrual", "follicular", "ovulatory", "luteal"], goal: ["maintain", "gain"],
    dietTags: ["vegetarian"], allergens: ["dairy"],
    macros: { calories: 280, protein: 12, carbs: 26, fat: 14 },
    micros: { calcium: 180, fibre: 3 },
    ingredients: [
      { name: "Cheddar cubes", quantity: "40g" },
      { name: "Whole grain crackers", quantity: "6" },
      { name: "Grapes", quantity: "1/2 cup" },
      { name: "Dried apricots", quantity: "2" },
    ],
    steps: ["Pack cheese cubes, crackers, grapes and apricots into separate lunchbox compartments."],
    conservation: { fridgeDays: 2, freezerWeeks: 0, sameDay: true, container: "Lunchbox container" },
    packable: true, noReheat: true,
  },
  {
    id: "lb06", name: "Chicken & Rice Lunchbox", cuisine: "Asian", mealType: "lunchbox",
    prepTime: 10, cookTime: 0, difficulty: "easy",
    phases: ["menstrual", "follicular", "ovulatory", "luteal"], goal: ["gain", "maintain"],
    dietTags: ["halal", "gluten-free"], allergens: ["soy"],
    macros: { calories: 360, protein: 26, carbs: 40, fat: 9 },
    micros: { iron: 3, fibre: 4, vitaminC: 12 },
    ingredients: [
      { name: "Cooked chicken breast", quantity: "100g, diced" },
      { name: "Brown rice", quantity: "1 cup cooked" },
      { name: "Edamame", quantity: "1/4 cup" },
      { name: "Soy-ginger sauce", quantity: "1 tbsp" },
    ],
    steps: ["Combine diced chicken, rice and edamame in a lunchbox.", "Pack sauce separately to drizzle before eating.", "Best served at room temperature or gently warmed."],
    conservation: { fridgeDays: 2, freezerWeeks: 0, sameDay: true, container: "Lunchbox container" },
    packable: true,
  },
  {
    id: "lb07", name: "Mini Quiche & Fruit Box", cuisine: "Mediterranean", mealType: "lunchbox",
    prepTime: 10, cookTime: 0, difficulty: "easy",
    phases: ["menstrual", "follicular", "ovulatory", "luteal"], goal: ["maintain"],
    dietTags: ["vegetarian", "gluten-free"], allergens: ["eggs", "dairy"],
    macros: { calories: 240, protein: 11, carbs: 16, fat: 14 },
    micros: { calcium: 90, vitaminC: 18, fibre: 3 },
    ingredients: [
      { name: "Mini quiches", quantity: "2 (pre-baked)" },
      { name: "Cherry tomatoes", quantity: "1/2 cup" },
      { name: "Mixed berries", quantity: "1/2 cup" },
    ],
    steps: ["Pack pre-baked mini quiches with cherry tomatoes and berries.", "Serve at room temperature or gently reheated."],
    conservation: { fridgeDays: 2, freezerWeeks: 0, sameDay: true, container: "Lunchbox container" },
    packable: true,
  },

  // ───────── Batch 4 — Breakfast (+15) ─────────
  {
    id: "b22", name: "Mango Lassi Overnight Oats", cuisine: "Asian", mealType: "breakfast",
    prepTime: 5, cookTime: 0, difficulty: "quick",
    phases: ["follicular", "ovulatory"], goal: ["lose", "maintain"],
    dietTags: ["vegetarian", "gluten-free"], allergens: ["dairy"],
    macros: { calories: 310, protein: 14, carbs: 48, fat: 7 },
    micros: { vitaminC: 30, fibre: 5, calcium: 160 },
    ingredients: [
      { name: "Oats", quantity: "1/2 cup" },
      { name: "Greek yoghurt", quantity: "1/3 cup" },
      { name: "Mango chunks", quantity: "1/2 cup" },
      { name: "Cardamom", quantity: "1 pinch" },
      { name: "Honey", quantity: "1 tsp" },
    ],
    steps: ["Mix oats, yoghurt and mango in a jar.", "Chill overnight.", "Top with cardamom and honey before eating."],
  },
  {
    id: "b23", name: "Spinach & Mushroom Omelette", cuisine: "Mediterranean", mealType: "breakfast",
    prepTime: 8, cookTime: 8, difficulty: "quick",
    phases: ["follicular", "ovulatory"], goal: ["lose", "maintain"],
    dietTags: ["vegetarian", "gluten-free"], allergens: ["eggs", "dairy"],
    macros: { calories: 290, protein: 22, carbs: 6, fat: 20 },
    micros: { calcium: 120, iron: 3, vitaminC: 8 },
    ingredients: [
      { name: "Eggs", quantity: "3" },
      { name: "Baby spinach", quantity: "1 cup" },
      { name: "Mushrooms", quantity: "1/2 cup, sliced" },
      { name: "Feta", quantity: "25g" },
      { name: "Olive oil", quantity: "1 tsp" },
    ],
    steps: ["Whisk eggs with salt and pepper.", "Sauté spinach and mushrooms in oil.", "Pour eggs over, cook until just set, fold with feta."],
  },
  {
    id: "b24", name: "Sweet Potato & Kale Frittata", cuisine: "Mediterranean", mealType: "breakfast",
    prepTime: 10, cookTime: 20, difficulty: "easy",
    phases: ["luteal", "menstrual"], goal: ["maintain", "gain"],
    dietTags: ["vegetarian", "gluten-free"], allergens: ["eggs", "dairy"],
    macros: { calories: 350, protein: 20, carbs: 28, fat: 18 },
    micros: { iron: 4, vitaminC: 30, fibre: 6 },
    ingredients: [
      { name: "Eggs", quantity: "4" },
      { name: "Sweet potato", quantity: "1 cup, diced small" },
      { name: "Kale", quantity: "1 cup" },
      { name: "Parmesan", quantity: "2 tbsp" },
      { name: "Olive oil", quantity: "1 tbsp" },
    ],
    steps: ["Sauté sweet potato in an oven-safe pan until tender.", "Add kale and wilt.", "Pour in whisked eggs and parmesan, bake 15 min at 180°C."],
  },
  {
    id: "b25", name: "Walnut & Date Porridge", cuisine: "Nordic", mealType: "breakfast",
    prepTime: 5, cookTime: 8, difficulty: "quick",
    phases: ["luteal", "menstrual"], goal: ["maintain", "gain"],
    dietTags: ["vegetarian"], allergens: ["nuts", "dairy"],
    macros: { calories: 400, protein: 12, carbs: 52, fat: 18 },
    micros: { magnesium: 80, omega3: 1.2, fibre: 7 },
    ingredients: [
      { name: "Rolled oats", quantity: "1/2 cup" },
      { name: "Milk", quantity: "1 cup" },
      { name: "Medjool dates", quantity: "3, chopped" },
      { name: "Walnuts", quantity: "2 tbsp, crushed" },
      { name: "Cinnamon", quantity: "1/2 tsp" },
    ],
    steps: ["Simmer oats in milk until creamy.", "Stir in chopped dates and cinnamon.", "Top with crushed walnuts."],
  },
  {
    id: "b26", name: "Matcha Chia Pudding", cuisine: "Asian", mealType: "breakfast",
    prepTime: 5, cookTime: 0, difficulty: "quick",
    phases: ["follicular", "ovulatory"], goal: ["lose", "maintain"],
    dietTags: ["vegan", "gluten-free"], allergens: [],
    macros: { calories: 260, protein: 8, carbs: 30, fat: 12 },
    micros: { calcium: 160, fibre: 10, omega3: 1.8 },
    ingredients: [
      { name: "Chia seeds", quantity: "3 tbsp" },
      { name: "Coconut milk", quantity: "3/4 cup" },
      { name: "Matcha powder", quantity: "1 tsp" },
      { name: "Maple syrup", quantity: "1 tsp" },
      { name: "Kiwi", quantity: "1, sliced" },
    ],
    steps: ["Whisk matcha with coconut milk and maple syrup.", "Stir in chia seeds, chill overnight.", "Top with sliced kiwi before serving."],
  },
  {
    id: "b27", name: "Turkish Menemen", cuisine: "Middle Eastern", mealType: "breakfast",
    prepTime: 8, cookTime: 12, difficulty: "quick",
    phases: ["menstrual", "follicular"], goal: ["maintain", "lose"],
    dietTags: ["vegetarian", "gluten-free", "halal"], allergens: ["eggs"],
    macros: { calories: 280, protein: 18, carbs: 14, fat: 16 },
    micros: { iron: 3, vitaminC: 35, fibre: 4 },
    ingredients: [
      { name: "Eggs", quantity: "3" },
      { name: "Tomatoes", quantity: "2, diced" },
      { name: "Green pepper", quantity: "1, diced" },
      { name: "Olive oil", quantity: "1 tbsp" },
      { name: "Cumin", quantity: "1/2 tsp" },
      { name: "Fresh parsley", quantity: "to taste" },
    ],
    steps: ["Sauté pepper in oil until soft.", "Add tomatoes and simmer 5 min.", "Add eggs and scramble gently until just set, scatter parsley."],
  },
  {
    id: "b28", name: "Sardine & Avocado Rye Toast", cuisine: "Nordic", mealType: "breakfast",
    prepTime: 8, cookTime: 0, difficulty: "quick",
    phases: ["menstrual", "luteal"], goal: ["maintain", "gain"],
    dietTags: ["pescatarian"], allergens: [],
    macros: { calories: 370, protein: 28, carbs: 24, fat: 18 },
    micros: { omega3: 2.2, calcium: 180, iron: 3 },
    ingredients: [
      { name: "Rye bread", quantity: "2 slices" },
      { name: "Canned sardines in olive oil", quantity: "1 tin (90g)" },
      { name: "Avocado", quantity: "1/2" },
      { name: "Lemon juice", quantity: "1 tsp" },
      { name: "Chili flakes", quantity: "1 pinch" },
    ],
    steps: ["Toast rye bread.", "Mash avocado and spread over toast.", "Top with sardines, drizzle lemon and scatter chili flakes."],
  },
  {
    id: "b29", name: "Peanut Butter Protein Smoothie Bowl", cuisine: "Global", mealType: "breakfast",
    prepTime: 8, cookTime: 0, difficulty: "quick",
    phases: ["follicular", "ovulatory", "luteal"], goal: ["gain", "maintain"],
    dietTags: ["vegan"], allergens: ["nuts", "soy"],
    macros: { calories: 420, protein: 26, carbs: 42, fat: 18 },
    micros: { magnesium: 70, fibre: 8, iron: 3 },
    ingredients: [
      { name: "Frozen banana", quantity: "1" },
      { name: "Plant-based protein powder", quantity: "1 scoop" },
      { name: "Peanut butter", quantity: "1 tbsp" },
      { name: "Plant milk", quantity: "1/2 cup" },
      { name: "Granola", quantity: "2 tbsp" },
      { name: "Blueberries", quantity: "1/4 cup" },
    ],
    steps: ["Blend banana, protein powder, peanut butter and milk to a thick consistency.", "Pour into a bowl.", "Top with granola and blueberries."],
  },
  {
    id: "b30", name: "Cinnamon Baked Pear Oats", cuisine: "Nordic", mealType: "breakfast",
    prepTime: 5, cookTime: 25, difficulty: "easy",
    phases: ["luteal", "follicular"], goal: ["maintain", "lose"],
    dietTags: ["vegan", "gluten-free"], allergens: [],
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
    steps: ["Combine oats, milk, pear and cinnamon in a baking dish.", "Bake 20 min at 180°C.", "Drizzle with maple syrup and top with pumpkin seeds."],
  },
  {
    id: "b31", name: "Black Bean Breakfast Bowl", cuisine: "Latin", mealType: "breakfast",
    prepTime: 8, cookTime: 5, difficulty: "quick",
    phases: ["menstrual", "luteal"], goal: ["gain", "maintain"],
    dietTags: ["vegan", "gluten-free"], allergens: [],
    macros: { calories: 380, protein: 17, carbs: 52, fat: 12 },
    micros: { iron: 5, fibre: 14, magnesium: 60 },
    ingredients: [
      { name: "Black beans", quantity: "1 cup" },
      { name: "Salsa", quantity: "1/4 cup" },
      { name: "Avocado", quantity: "1/2" },
      { name: "Corn tortilla", quantity: "1" },
      { name: "Lime", quantity: "1 wedge" },
    ],
    steps: ["Warm black beans with salsa.", "Heat the corn tortilla.", "Top tortilla with beans and sliced avocado, squeeze lime over."],
  },
  {
    id: "b32", name: "Almond Flour Blueberry Muffin", cuisine: "Global", mealType: "breakfast",
    prepTime: 10, cookTime: 22, difficulty: "easy",
    phases: ["follicular", "ovulatory"], goal: ["lose", "maintain"],
    dietTags: ["vegetarian", "gluten-free"], allergens: ["nuts", "eggs"],
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
    steps: ["Mix almond flour, baking powder, eggs, maple syrup and vanilla.", "Fold in blueberries.", "Bake in muffin tin 20 min at 175°C."],
  },
  {
    id: "b33", name: "Coconut Berry Acai Bowl", cuisine: "Latin", mealType: "breakfast",
    prepTime: 8, cookTime: 0, difficulty: "quick",
    phases: ["follicular", "ovulatory"], goal: ["lose", "maintain"],
    dietTags: ["vegan", "gluten-free"], allergens: [],
    macros: { calories: 310, protein: 6, carbs: 52, fat: 10 },
    micros: { vitaminC: 40, fibre: 8, omega3: 0.5 },
    ingredients: [
      { name: "Frozen acai or acai powder", quantity: "100g / 1 tbsp" },
      { name: "Frozen mixed berries", quantity: "1 cup" },
      { name: "Coconut milk", quantity: "1/2 cup" },
      { name: "Granola", quantity: "2 tbsp" },
      { name: "Fresh berries", quantity: "1/4 cup" },
    ],
    steps: ["Blend acai, frozen berries and coconut milk to a thick, smooth consistency.", "Pour into a bowl.", "Top with granola and fresh berries."],
  },
  {
    id: "b34", name: "Pesto Scrambled Eggs on Toast", cuisine: "Mediterranean", mealType: "breakfast",
    prepTime: 5, cookTime: 5, difficulty: "quick",
    phases: ["follicular", "ovulatory"], goal: ["maintain", "gain"],
    dietTags: ["vegetarian"], allergens: ["eggs", "dairy", "nuts"],
    macros: { calories: 340, protein: 20, carbs: 18, fat: 22 },
    micros: { calcium: 80, vitaminC: 10, iron: 2 },
    ingredients: [
      { name: "Eggs", quantity: "3" },
      { name: "Basil pesto", quantity: "1 tbsp" },
      { name: "Cherry tomatoes", quantity: "1/2 cup, halved" },
      { name: "Sourdough bread", quantity: "1 slice" },
      { name: "Parmesan", quantity: "1 tbsp, grated" },
    ],
    steps: ["Whisk eggs with pesto.", "Scramble gently over low heat.", "Toast sourdough, top with eggs and halved cherry tomatoes, finish with parmesan."],
  },
  {
    id: "b35", name: "Turmeric Golden Oats", cuisine: "Asian", mealType: "breakfast",
    prepTime: 5, cookTime: 8, difficulty: "quick",
    phases: ["menstrual", "luteal", "follicular"], goal: ["lose", "maintain"],
    dietTags: ["vegan", "gluten-free"], allergens: [],
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
    steps: ["Cook oats in plant milk with turmeric and black pepper.", "Sweeten with honey.", "Top with sliced banana."],
  },
  {
    id: "b36", name: "Quinoa Mango Breakfast Bowl", cuisine: "Global", mealType: "breakfast",
    prepTime: 5, cookTime: 0, difficulty: "quick",
    phases: ["ovulatory", "follicular"], goal: ["lose", "maintain"],
    dietTags: ["vegan", "gluten-free"], allergens: [],
    macros: { calories: 340, protein: 10, carbs: 56, fat: 8 },
    micros: { vitaminC: 35, fibre: 6, vitaminB6: 0.4 },
    ingredients: [
      { name: "Cooked quinoa (cooled)", quantity: "1 cup" },
      { name: "Mango", quantity: "1/2 cup, diced" },
      { name: "Kiwi", quantity: "1, sliced" },
      { name: "Coconut flakes", quantity: "1 tbsp" },
      { name: "Lime juice", quantity: "1 tsp" },
      { name: "Honey", quantity: "1 tsp" },
    ],
    steps: ["Place quinoa in a bowl.", "Top with mango and kiwi.", "Scatter coconut flakes, drizzle lime juice and honey."],
  },

  // ───────── Batch 4 — Soups (+15) ─────────
  {
    id: "sop01", name: "Creamy Tomato Basil Soup", cuisine: "Mediterranean", mealType: "lunch",
    prepTime: 10, cookTime: 25, difficulty: "easy",
    phases: ["follicular", "ovulatory"], goal: ["lose", "maintain"],
    dietTags: ["vegetarian", "gluten-free"], allergens: ["dairy"],
    macros: { calories: 240, protein: 7, carbs: 28, fat: 12 },
    micros: { vitaminC: 22, fibre: 6, calcium: 80 },
    ingredients: [
      { name: "Canned tomatoes", quantity: "400g" },
      { name: "Onion", quantity: "1" },
      { name: "Garlic", quantity: "3 cloves" },
      { name: "Vegetable broth", quantity: "1 cup" },
      { name: "Olive oil", quantity: "1 tbsp" },
      { name: "Cream", quantity: "2 tbsp" },
      { name: "Fresh basil", quantity: "small bunch" },
      { name: "Salt & pepper", quantity: "to taste" },
    ],
    steps: ["Heat olive oil in a pot, sauté onion and garlic over medium heat until soft, about 5 min.", "Add tomatoes and broth, simmer 15 min.", "Blend smooth, stir in cream and fresh basil; season to taste."],
  },
  {
    id: "sop02", name: "Roasted Butternut Squash Soup", cuisine: "Global", mealType: "lunch",
    prepTime: 15, cookTime: 35, difficulty: "easy",
    phases: ["luteal", "menstrual"], goal: ["lose", "maintain"],
    dietTags: ["vegan", "gluten-free"], allergens: [],
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
      { name: "Salt & pepper", quantity: "to taste" },
    ],
    steps: ["Toss squash, onion and garlic in olive oil, roast at 200°C for 25 min until caramelised.", "Squeeze roasted garlic from skins, blend everything with broth until very smooth.", "Stir in coconut milk and nutmeg, season well and reheat gently."],
  },
  {
    id: "sop03", name: "Classic Minestrone", cuisine: "Mediterranean", mealType: "lunch",
    prepTime: 15, cookTime: 30, difficulty: "easy",
    phases: ["follicular", "ovulatory", "menstrual"], goal: ["lose", "maintain"],
    dietTags: ["vegan"], allergens: [],
    macros: { calories: 280, protein: 12, carbs: 44, fat: 6 },
    micros: { iron: 4, fibre: 10, vitaminC: 24 },
    ingredients: [
      { name: "Cannellini beans", quantity: "1 cup, cooked" },
      { name: "Small pasta (ditalini or elbow)", quantity: "1/2 cup" },
      { name: "Diced tomatoes", quantity: "1 cup" },
      { name: "Zucchini", quantity: "1, diced" },
      { name: "Carrots", quantity: "1, diced" },
      { name: "Celery", quantity: "1 stalk, diced" },
      { name: "Onion", quantity: "1, diced" },
      { name: "Garlic", quantity: "2 cloves" },
      { name: "Olive oil", quantity: "1 tbsp" },
      { name: "Vegetable broth", quantity: "4 cups" },
      { name: "Fresh basil", quantity: "to taste" },
    ],
    steps: ["Heat olive oil, sauté onion, garlic, carrots, celery and zucchini 5 min.", "Add beans, tomatoes and broth, simmer 15 min.", "Add pasta and cook until al dente, finish with fresh basil."],
  },
  {
    id: "sop04", name: "Thai Coconut Mushroom Soup", cuisine: "Asian", mealType: "lunch",
    prepTime: 10, cookTime: 20, difficulty: "easy",
    phases: ["luteal", "ovulatory"], goal: ["maintain"],
    dietTags: ["vegan", "gluten-free"], allergens: [],
    macros: { calories: 250, protein: 8, carbs: 18, fat: 16 },
    micros: { iron: 2, fibre: 4, vitaminC: 12 },
    ingredients: [
      { name: "Coconut milk", quantity: "1 can (400ml)" },
      { name: "Mushrooms", quantity: "2 cups, sliced" },
      { name: "Lemongrass stalk", quantity: "1" },
      { name: "Ginger", quantity: "2 slices" },
      { name: "Lime juice", quantity: "2 tbsp" },
      { name: "Firm tofu", quantity: "100g" },
    ],
    steps: ["Simmer coconut milk with lemongrass and ginger 10 min.", "Add mushrooms and tofu, cook 8 min.", "Finish with lime juice, remove lemongrass before serving."],
  },
  {
    id: "sop05", name: "Tuscan White Bean & Kale Soup", cuisine: "Mediterranean", mealType: "lunch",
    prepTime: 10, cookTime: 25, difficulty: "easy",
    phases: ["menstrual", "follicular"], goal: ["lose", "maintain"],
    dietTags: ["vegan", "gluten-free"], allergens: [],
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
      { name: "Salt & pepper", quantity: "to taste" },
    ],
    steps: ["Heat olive oil in a large pot, sauté garlic over medium heat 1–2 min until fragrant.", "Add beans, tomatoes, broth and rosemary; simmer 15 min.", "Stir in kale until wilted, discard rosemary sprig, season and serve."],
  },
  {
    id: "sop06", name: "Moroccan Harira", cuisine: "African", mealType: "lunch",
    prepTime: 15, cookTime: 35, difficulty: "easy",
    phases: ["menstrual", "luteal"], goal: ["maintain"],
    dietTags: ["vegan", "gluten-free", "halal"], allergens: [],
    macros: { calories: 300, protein: 14, carbs: 46, fat: 7 },
    micros: { iron: 5, fibre: 11, vitaminC: 16 },
    ingredients: [
      { name: "Chickpeas", quantity: "1 cup, cooked" },
      { name: "Red lentils", quantity: "1/2 cup" },
      { name: "Ripe tomatoes", quantity: "2, diced" },
      { name: "Onion", quantity: "1, finely diced" },
      { name: "Cumin", quantity: "1 tsp" },
      { name: "Cinnamon", quantity: "1 tsp" },
      { name: "Ground coriander", quantity: "1 tsp" },
      { name: "Turmeric", quantity: "1/2 tsp" },
      { name: "Olive oil", quantity: "1 tbsp" },
      { name: "Celery stalk", quantity: "1, diced" },
      { name: "Lemon juice", quantity: "2 tbsp" },
      { name: "Fresh parsley", quantity: "1/4 cup, chopped" },
      { name: "Fresh cilantro", quantity: "1/4 cup, chopped" },
    ],
    steps: ["Heat olive oil in a large pot, sauté onion and celery until soft, about 5 min. Add spices and stir 1 min.", "Add chickpeas, lentils, tomatoes and 4 cups water; bring to a boil then simmer 25 min.", "Finish with lemon juice and fresh parsley and cilantro; season generously with salt and pepper."],
  },
  {
    id: "sop07", name: "Spinach & Red Lentil Soup", cuisine: "Middle Eastern", mealType: "lunch",
    prepTime: 10, cookTime: 25, difficulty: "easy",
    phases: ["menstrual", "luteal"], goal: ["lose", "maintain"],
    dietTags: ["vegan", "gluten-free"], allergens: [],
    macros: { calories: 290, protein: 16, carbs: 42, fat: 6 },
    micros: { iron: 6, fibre: 12, vitaminC: 18 },
    ingredients: [
      { name: "Red lentils", quantity: "1 cup" },
      { name: "Baby spinach", quantity: "2 cups" },
      { name: "Carrot", quantity: "1, diced" },
      { name: "Onion", quantity: "1, diced" },
      { name: "Garlic", quantity: "2 cloves, minced" },
      { name: "Cumin", quantity: "1 tsp" },
      { name: "Turmeric", quantity: "1/2 tsp" },
      { name: "Olive oil", quantity: "1 tbsp" },
      { name: "Vegetable broth", quantity: "3 cups" },
      { name: "Lemon juice", quantity: "1 tbsp" },
    ],
    steps: ["Heat olive oil in a pot, sauté onion, garlic and carrot over medium heat until soft, about 5 min.", "Add lentils, broth, cumin and turmeric; simmer 20 min until lentils are very tender.", "Stir in spinach until wilted, squeeze in lemon juice, season and serve."],
  },
  {
    id: "sop08", name: "Miso Ramen Bowl", cuisine: "Asian", mealType: "dinner",
    prepTime: 15, cookTime: 20, difficulty: "easy",
    phases: ["follicular", "luteal"], goal: ["maintain", "gain"],
    dietTags: ["vegetarian"], allergens: ["soy", "eggs"],
    macros: { calories: 420, protein: 22, carbs: 52, fat: 14 },
    micros: { iron: 3, magnesium: 45, fibre: 5 },
    ingredients: [
      { name: "Ramen noodles", quantity: "100g" },
      { name: "White miso paste", quantity: "2 tbsp" },
      { name: "Vegetable broth", quantity: "3 cups" },
      { name: "Soft-boiled egg", quantity: "1" },
      { name: "Shiitake mushrooms", quantity: "1 cup" },
      { name: "Bok choy", quantity: "1 head" },
      { name: "Nori sheet", quantity: "1, cut into strips" },
      { name: "Sesame oil", quantity: "1 tsp" },
    ],
    steps: ["Warm broth over medium heat and whisk in miso paste (do not boil).", "Cook noodles separately according to package; drain.", "Arrange noodles in bowls, ladle broth over, top with mushrooms, bok choy, halved egg, nori strips and a drizzle of sesame oil."],
  },
  {
    id: "sop09", name: "Pumpkin & Coconut Cream Soup", cuisine: "Asian", mealType: "lunch",
    prepTime: 10, cookTime: 30, difficulty: "easy",
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
      { name: "Salt & pepper", quantity: "to taste" },
    ],
    steps: ["Toss pumpkin cubes and garlic with olive oil; roast at 200°C for 20–25 min until golden.", "Squeeze roasted garlic from skins; blend pumpkin, garlic and broth until silky smooth.", "Stir in coconut cream and ginger, warm through, season and top with toasted pumpkin seeds."],
  },
  {
    id: "sop10", name: "Chicken & Vegetable Soup", cuisine: "Global", mealType: "lunch",
    prepTime: 10, cookTime: 30, difficulty: "easy",
    phases: ["menstrual", "luteal", "follicular"], goal: ["maintain", "lose"],
    dietTags: ["halal", "gluten-free"], allergens: [],
    macros: { calories: 300, protein: 28, carbs: 22, fat: 8 },
    micros: { iron: 3, fibre: 6, vitaminC: 20 },
    ingredients: [
      { name: "Chicken breast", quantity: "150g" },
      { name: "Carrots", quantity: "1, sliced" },
      { name: "Celery", quantity: "2 stalks, sliced" },
      { name: "Onion", quantity: "1" },
      { name: "Chicken broth", quantity: "3 cups" },
      { name: "Fresh thyme & parsley", quantity: "to taste" },
    ],
    steps: ["Simmer chicken with vegetables in broth 20 min.", "Remove chicken, shred finely and return to pot.", "Finish with fresh thyme and parsley."],
  },
  {
    id: "sop11", name: "Black Bean Soup", cuisine: "Latin", mealType: "lunch",
    prepTime: 10, cookTime: 25, difficulty: "easy",
    phases: ["menstrual", "luteal"], goal: ["maintain", "lose"],
    dietTags: ["vegan", "gluten-free"], allergens: [],
    macros: { calories: 290, protein: 14, carbs: 46, fat: 5 },
    micros: { iron: 5, fibre: 15, magnesium: 55 },
    ingredients: [
      { name: "Black beans", quantity: "1.5 cups, cooked" },
      { name: "Onion", quantity: "1, diced" },
      { name: "Garlic", quantity: "2 cloves, minced" },
      { name: "Cumin", quantity: "1 tsp" },
      { name: "Smoked paprika", quantity: "1 tsp" },
      { name: "Olive oil", quantity: "1 tbsp" },
      { name: "Vegetable broth", quantity: "2 cups" },
      { name: "Lime juice", quantity: "1 tbsp" },
      { name: "Fresh cilantro", quantity: "to garnish" },
    ],
    steps: ["Heat olive oil in a pot, sauté onion and garlic with cumin and smoked paprika until fragrant, about 4 min.", "Add beans and broth, simmer 15 min.", "Partially blend for a creamy texture, finish with lime juice and cilantro."],
  },
  {
    id: "sop12", name: "Carrot Ginger Soup", cuisine: "Asian", mealType: "lunch",
    prepTime: 10, cookTime: 25, difficulty: "easy",
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
      { name: "Salt & pepper", quantity: "to taste" },
    ],
    steps: ["Heat olive oil, sauté onion and garlic 3 min, add carrots, ginger and broth.", "Simmer 18–20 min until carrots are very soft.", "Blend until silky smooth, stir in coconut milk and orange juice, season to taste."],
  },
  {
    id: "sop13", name: "Gazpacho", cuisine: "Mediterranean", mealType: "lunch",
    prepTime: 15, cookTime: 0, difficulty: "quick",
    phases: ["ovulatory", "follicular"], goal: ["lose"],
    dietTags: ["vegan", "gluten-free"], allergens: [],
    macros: { calories: 140, protein: 4, carbs: 22, fat: 5 },
    micros: { vitaminC: 40, fibre: 5, vitaminB6: 0.3 },
    ingredients: [
      { name: "Ripe tomatoes", quantity: "4 large" },
      { name: "Cucumber", quantity: "1" },
      { name: "Red pepper", quantity: "1" },
      { name: "Garlic", quantity: "1 clove" },
      { name: "Olive oil", quantity: "1 tbsp" },
      { name: "Red wine vinegar", quantity: "1 tbsp" },
    ],
    steps: ["Blend all vegetables with oil and vinegar until very smooth.", "Season generously with salt and pepper.", "Chill at least 1 hour before serving cold."],
  },
  {
    id: "sop14", name: "French Green Lentil Soup", cuisine: "Mediterranean", mealType: "dinner",
    prepTime: 10, cookTime: 35, difficulty: "easy",
    phases: ["menstrual", "luteal"], goal: ["lose", "maintain"],
    dietTags: ["vegan", "gluten-free"], allergens: [],
    macros: { calories: 310, protein: 17, carbs: 48, fat: 6 },
    micros: { iron: 7, fibre: 14, vitaminB6: 0.5 },
    ingredients: [
      { name: "Green lentils (Puy or French)", quantity: "1 cup" },
      { name: "Carrots", quantity: "1, diced" },
      { name: "Celery", quantity: "2 stalks, diced" },
      { name: "Onion", quantity: "1, diced" },
      { name: "Garlic", quantity: "2 cloves, minced" },
      { name: "Olive oil", quantity: "1 tbsp" },
      { name: "Bay leaf", quantity: "1" },
      { name: "Fresh thyme", quantity: "2 sprigs" },
      { name: "Dijon mustard", quantity: "1 tsp" },
      { name: "Vegetable broth", quantity: "4 cups" },
      { name: "Salt & pepper", quantity: "to taste" },
    ],
    steps: ["Heat olive oil in a large pot, sauté onion, garlic, carrot and celery until softened, about 6 min.", "Add lentils, broth, bay leaf and thyme; bring to a boil then simmer 30 min until lentils are tender.", "Remove bay leaf and thyme; stir in Dijon mustard, adjust seasoning and serve."],
  },
  {
    id: "sop15", name: "Creamy Broccoli & Almond Soup", cuisine: "Nordic", mealType: "lunch",
    prepTime: 10, cookTime: 20, difficulty: "easy",
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
      { name: "Nutmeg", quantity: "1 pinch" },
    ],
    steps: ["Heat olive oil in a pot, sauté onion and garlic 3 min, add broccoli and broth.", "Simmer 12–15 min until broccoli is very tender.", "Blend until smooth with almond milk, nutritional yeast and nutmeg; top with toasted almonds to serve."],
  },

  // ───────── Batch 4 — Salads (+15) ─────────
  {
    id: "sal01", name: "Kale Caesar with Crispy Chickpeas", cuisine: "Mediterranean", mealType: "lunch",
    prepTime: 15, cookTime: 25, difficulty: "easy",
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
      { name: "Salt & pepper", quantity: "to taste" },
    ],
    steps: ["Toss chickpeas with 1 tbsp olive oil and smoked paprika; roast at 200°C for 20–25 min until crispy.", "Massage kale with 1 tbsp olive oil and a pinch of salt to soften.", "Whisk tahini, lemon juice, garlic and nutritional yeast into a dressing; toss with kale and top with crispy chickpeas."],
  },
  {
    id: "sal02", name: "Watermelon Feta & Mint Salad", cuisine: "Mediterranean", mealType: "lunch",
    prepTime: 10, cookTime: 0, difficulty: "quick",
    phases: ["ovulatory", "follicular"], goal: ["lose"],
    dietTags: ["vegetarian", "gluten-free"], allergens: ["dairy"],
    macros: { calories: 190, protein: 6, carbs: 28, fat: 8 },
    micros: { vitaminC: 18, calcium: 100, fibre: 2 },
    ingredients: [
      { name: "Watermelon", quantity: "2 cups, cubed" },
      { name: "Feta", quantity: "50g" },
      { name: "Fresh mint", quantity: "1/4 cup" },
      { name: "Lime juice", quantity: "1 tbsp" },
      { name: "Black pepper", quantity: "1 pinch" },
    ],
    steps: ["Arrange watermelon on a platter.", "Crumble feta over the top.", "Scatter mint leaves, drizzle lime juice and season with black pepper."],
  },
  {
    id: "sal03", name: "Japanese Sesame Cucumber Salad", cuisine: "Asian", mealType: "lunch",
    prepTime: 10, cookTime: 0, difficulty: "quick",
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
      { name: "Spring onion", quantity: "2, thinly sliced" },
    ],
    steps: ["Thinly slice cucumbers, salt and let sit 10 min, rinse and squeeze dry.", "Toss with rice vinegar, sesame oil and soy sauce.", "Top with sesame seeds and spring onion."],
  },
  {
    id: "sal04", name: "Warm Lentil & Roasted Veg Salad", cuisine: "Mediterranean", mealType: "lunch",
    prepTime: 15, cookTime: 30, difficulty: "easy",
    phases: ["menstrual", "luteal"], goal: ["maintain", "lose"],
    dietTags: ["vegan", "gluten-free"], allergens: [],
    macros: { calories: 380, protein: 16, carbs: 52, fat: 11 },
    micros: { iron: 5, fibre: 14, vitaminC: 30 },
    ingredients: [
      { name: "Cooked green lentils", quantity: "1 cup" },
      { name: "Zucchini", quantity: "1, sliced" },
      { name: "Red pepper", quantity: "1" },
      { name: "Red onion", quantity: "1/2" },
      { name: "Olive oil", quantity: "2 tbsp" },
      { name: "Balsamic vinegar", quantity: "1 tbsp" },
      { name: "Baby spinach", quantity: "1 cup" },
    ],
    steps: ["Roast zucchini, pepper and red onion with oil until caramelised.", "Toss warm lentils with roasted vegetables and spinach.", "Dress with balsamic vinegar and season."],
  },
  {
    id: "sal05", name: "Mango Avocado Black Bean Salad", cuisine: "Latin", mealType: "lunch",
    prepTime: 12, cookTime: 0, difficulty: "quick",
    phases: ["follicular", "ovulatory"], goal: ["lose", "maintain"],
    dietTags: ["vegan", "gluten-free"], allergens: [],
    macros: { calories: 360, protein: 11, carbs: 50, fat: 16 },
    micros: { vitaminC: 36, fibre: 14, vitaminB6: 0.5 },
    ingredients: [
      { name: "Black beans", quantity: "1 cup" },
      { name: "Mango", quantity: "1, diced" },
      { name: "Avocado", quantity: "1" },
      { name: "Red onion", quantity: "1/4, diced" },
      { name: "Fresh cilantro", quantity: "1/4 cup" },
      { name: "Lime juice", quantity: "2 tbsp" },
    ],
    steps: ["Combine black beans, diced mango and avocado.", "Add red onion and cilantro.", "Dress with lime juice, season and serve immediately."],
  },
  {
    id: "sal06", name: "Grilled Halloumi & Spinach Salad", cuisine: "Mediterranean", mealType: "lunch",
    prepTime: 10, cookTime: 8, difficulty: "easy",
    phases: ["follicular", "ovulatory"], goal: ["maintain", "gain"],
    dietTags: ["vegetarian", "gluten-free"], allergens: ["dairy"],
    macros: { calories: 430, protein: 26, carbs: 12, fat: 32 },
    micros: { calcium: 280, fibre: 5, vitaminC: 22 },
    ingredients: [
      { name: "Halloumi", quantity: "100g" },
      { name: "Baby spinach", quantity: "3 cups" },
      { name: "Cherry tomatoes", quantity: "1 cup" },
      { name: "Cucumber", quantity: "1/2" },
      { name: "Kalamata olives", quantity: "1/4 cup" },
      { name: "Lemon dressing", quantity: "2 tbsp" },
    ],
    steps: ["Grill halloumi slices until golden on both sides.", "Arrange spinach with tomatoes, cucumber and olives.", "Top with halloumi and drizzle with lemon dressing."],
  },
  {
    id: "sal07", name: "Quinoa Cranberry Almond Salad", cuisine: "Global", mealType: "lunch",
    prepTime: 10, cookTime: 0, difficulty: "quick",
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
      { name: "Balsamic dressing", quantity: "2 tbsp" },
    ],
    steps: ["Toss quinoa with spinach, apple, cranberries and almonds.", "Dress with balsamic dressing.", "Serve immediately or chill until ready."],
  },
  {
    id: "sal08", name: "Greek Orzo Salad", cuisine: "Mediterranean", mealType: "lunch",
    prepTime: 15, cookTime: 10, difficulty: "easy",
    phases: ["follicular", "ovulatory"], goal: ["maintain"],
    dietTags: ["vegetarian"], allergens: ["dairy"],
    macros: { calories: 430, protein: 15, carbs: 52, fat: 18 },
    micros: { calcium: 140, vitaminC: 20, fibre: 5 },
    ingredients: [
      { name: "Orzo", quantity: "1 cup, cooked & cooled" },
      { name: "Feta", quantity: "60g" },
      { name: "Cherry tomatoes", quantity: "1 cup, halved" },
      { name: "Cucumber", quantity: "1, diced" },
      { name: "Kalamata olives", quantity: "1/4 cup" },
      { name: "Red onion", quantity: "1/4" },
      { name: "Lemon herb dressing", quantity: "2 tbsp" },
    ],
    steps: ["Cook and cool orzo.", "Toss with tomatoes, cucumber, olives and red onion.", "Crumble feta over top, drizzle with lemon herb dressing."],
  },
  {
    id: "sal09", name: "Roasted Beet & Orange Salad", cuisine: "Nordic", mealType: "lunch",
    prepTime: 10, cookTime: 0, difficulty: "quick",
    phases: ["menstrual", "follicular"], goal: ["lose", "maintain"],
    dietTags: ["vegan", "gluten-free"], allergens: [],
    macros: { calories: 240, protein: 6, carbs: 34, fat: 10 },
    micros: { iron: 3, vitaminC: 30, fibre: 7 },
    ingredients: [
      { name: "Cooked beets", quantity: "2 cups, sliced" },
      { name: "Orange", quantity: "2, segmented" },
      { name: "Arugula", quantity: "2 cups" },
      { name: "Toasted sunflower seeds", quantity: "2 tbsp" },
      { name: "Balsamic glaze", quantity: "1 tbsp" },
      { name: "Olive oil", quantity: "1 tbsp" },
    ],
    steps: ["Arrange arugula on a platter.", "Top with beet slices and orange segments.", "Scatter sunflower seeds, drizzle with olive oil and balsamic glaze."],
  },
  {
    id: "sal10", name: "Thai Green Papaya Salad", cuisine: "Asian", mealType: "lunch",
    prepTime: 15, cookTime: 0, difficulty: "easy",
    phases: ["ovulatory", "follicular"], goal: ["lose"],
    dietTags: ["vegan", "gluten-free"], allergens: [],
    macros: { calories: 170, protein: 4, carbs: 30, fat: 5 },
    micros: { vitaminC: 70, fibre: 5, vitaminB6: 0.3 },
    ingredients: [
      { name: "Green papaya", quantity: "2 cups, shredded" },
      { name: "Cherry tomatoes", quantity: "1/2 cup" },
      { name: "Green beans", quantity: "1/2 cup, blanched" },
      { name: "Lime juice", quantity: "2 tbsp" },
      { name: "Coconut sugar", quantity: "1 tsp" },
      { name: "Red chili", quantity: "1, sliced" },
      { name: "Soy sauce", quantity: "1 tbsp" },
    ],
    steps: ["Combine shredded papaya, tomatoes and green beans.", "Whisk lime juice, coconut sugar, chili and soy sauce.", "Toss together and serve fresh."],
  },
  {
    id: "sal11", name: "Arugula, Pear & Walnut Salad", cuisine: "Mediterranean", mealType: "lunch",
    prepTime: 10, cookTime: 0, difficulty: "quick",
    phases: ["follicular", "ovulatory", "luteal"], goal: ["lose", "maintain"],
    dietTags: ["vegetarian", "gluten-free"], allergens: ["nuts", "dairy"],
    macros: { calories: 320, protein: 10, carbs: 24, fat: 22 },
    micros: { calcium: 120, fibre: 5, omega3: 0.8 },
    ingredients: [
      { name: "Arugula", quantity: "3 cups" },
      { name: "Pear", quantity: "1, thinly sliced" },
      { name: "Walnuts", quantity: "1/4 cup, toasted" },
      { name: "Gorgonzola or goat cheese", quantity: "30g" },
      { name: "Honey balsamic dressing", quantity: "2 tbsp" },
    ],
    steps: ["Arrange arugula and pear slices on a plate.", "Scatter toasted walnuts and crumbled cheese.", "Drizzle with honey balsamic dressing and serve."],
  },
  {
    id: "sal12", name: "Mediterranean Tuna & White Bean Salad", cuisine: "Mediterranean", mealType: "lunch",
    prepTime: 10, cookTime: 0, difficulty: "quick",
    phases: ["luteal", "menstrual"], goal: ["lose", "maintain"],
    dietTags: ["pescatarian", "gluten-free"], allergens: [],
    macros: { calories: 380, protein: 34, carbs: 28, fat: 14 },
    micros: { omega3: 1.2, iron: 4, fibre: 8 },
    ingredients: [
      { name: "Canned tuna in olive oil", quantity: "140g" },
      { name: "Cannellini beans", quantity: "1 cup" },
      { name: "Red onion", quantity: "1/4, thinly sliced" },
      { name: "Cherry tomatoes", quantity: "1 cup" },
      { name: "Fresh parsley", quantity: "1/4 cup" },
      { name: "Lemon & olive oil dressing", quantity: "2 tbsp" },
    ],
    steps: ["Flake tuna into cannellini beans.", "Add red onion, tomatoes and parsley.", "Dress with lemon and olive oil, season and serve."],
  },
  {
    id: "sal13", name: "Southwest Chicken Salad", cuisine: "Latin", mealType: "lunch",
    prepTime: 12, cookTime: 10, difficulty: "easy",
    phases: ["follicular", "ovulatory"], goal: ["lose", "gain"],
    dietTags: ["gluten-free", "halal"], allergens: ["dairy"],
    macros: { calories: 420, protein: 36, carbs: 24, fat: 18 },
    micros: { vitaminC: 22, fibre: 8, iron: 3 },
    ingredients: [
      { name: "Grilled chicken breast", quantity: "150g, sliced" },
      { name: "Romaine lettuce", quantity: "3 cups" },
      { name: "Corn", quantity: "1/2 cup" },
      { name: "Black beans", quantity: "1/2 cup" },
      { name: "Cheddar", quantity: "30g, shredded" },
      { name: "Avocado", quantity: "1/2" },
      { name: "Chipotle lime dressing", quantity: "2 tbsp" },
    ],
    steps: ["Grill chicken and slice thinly.", "Assemble lettuce, corn, beans, cheese and avocado in a bowl.", "Top with chicken and drizzle chipotle lime dressing."],
  },
  {
    id: "sal14", name: "Vietnamese Rice Noodle Salad", cuisine: "Asian", mealType: "lunch",
    prepTime: 20, cookTime: 5, difficulty: "easy",
    phases: ["follicular", "ovulatory"], goal: ["lose", "maintain"],
    dietTags: ["vegan", "gluten-free"], allergens: [],
    macros: { calories: 360, protein: 10, carbs: 58, fat: 10 },
    micros: { vitaminC: 24, fibre: 6, vitaminB6: 0.4 },
    ingredients: [
      { name: "Rice noodles", quantity: "100g" },
      { name: "Shredded carrots", quantity: "1/2 cup" },
      { name: "Cucumber", quantity: "1, julienned" },
      { name: "Fresh mint & basil", quantity: "1/4 cup each" },
      { name: "Sesame seeds", quantity: "1 tbsp" },
      { name: "Lime & soy dressing", quantity: "2 tbsp" },
    ],
    steps: ["Cook rice noodles, drain and cool.", "Toss with carrots, cucumber and fresh herbs.", "Dress with lime-soy dressing, top with sesame seeds."],
  },
  {
    id: "sal15", name: "Spinach Strawberry & Feta Salad", cuisine: "Mediterranean", mealType: "lunch",
    prepTime: 10, cookTime: 0, difficulty: "quick",
    phases: ["follicular", "ovulatory"], goal: ["lose", "maintain"],
    dietTags: ["vegetarian", "gluten-free"], allergens: ["dairy"],
    macros: { calories: 260, protein: 9, carbs: 24, fat: 14 },
    micros: { vitaminC: 56, calcium: 140, fibre: 5 },
    ingredients: [
      { name: "Baby spinach", quantity: "3 cups" },
      { name: "Strawberries", quantity: "1 cup, sliced" },
      { name: "Feta", quantity: "40g" },
      { name: "Red onion", quantity: "1/4, thinly sliced" },
      { name: "Toasted sunflower seeds", quantity: "2 tbsp" },
      { name: "Balsamic glaze", quantity: "2 tbsp" },
    ],
    steps: ["Arrange spinach with strawberries and red onion.", "Crumble feta over the top.", "Scatter sunflower seeds and drizzle with balsamic glaze."],
  },

  // ───────── Batch 4 — Dinner (+15) ─────────
  {
    id: "d25", name: "One-Pan Lemon Herb Chicken & Roasted Veg", cuisine: "Mediterranean", mealType: "dinner",
    prepTime: 10, cookTime: 35, difficulty: "easy",
    phases: ["follicular", "ovulatory"], goal: ["maintain", "gain"],
    dietTags: ["gluten-free", "halal"], allergens: [],
    macros: { calories: 460, protein: 38, carbs: 22, fat: 22 },
    micros: { vitaminC: 40, iron: 3, fibre: 6 },
    ingredients: [
      { name: "Chicken thighs", quantity: "250g" },
      { name: "Cherry tomatoes", quantity: "1 cup" },
      { name: "Zucchini", quantity: "1, sliced" },
      { name: "Bell pepper", quantity: "1" },
      { name: "Garlic", quantity: "4 cloves" },
      { name: "Lemon", quantity: "1" },
      { name: "Herbs de Provence & olive oil", quantity: "1 tbsp / 2 tbsp" },
    ],
    steps: ["Toss vegetables with garlic, lemon juice and olive oil.", "Arrange chicken on top, season with herbs de Provence.", "Roast all together 30 min at 200°C."],
  },
  {
    id: "d26", name: "Shrimp Tacos with Mango Salsa", cuisine: "Latin", mealType: "dinner",
    prepTime: 15, cookTime: 8, difficulty: "easy",
    phases: ["ovulatory", "follicular"], goal: ["lose", "maintain"],
    dietTags: ["gluten-free"], allergens: ["shellfish"],
    macros: { calories: 420, protein: 28, carbs: 44, fat: 14 },
    micros: { vitaminC: 36, iron: 2, fibre: 6 },
    ingredients: [
      { name: "Shrimp", quantity: "200g, peeled and deveined" },
      { name: "Corn tortillas", quantity: "3" },
      { name: "Mango", quantity: "1/2, diced" },
      { name: "Red onion", quantity: "1/4 cup, finely diced" },
      { name: "Fresh cilantro", quantity: "1/4 cup, chopped" },
      { name: "Shredded cabbage", quantity: "1 cup" },
      { name: "Lime", quantity: "1, juiced" },
      { name: "Chipotle sauce", quantity: "1 tbsp" },
      { name: "Olive oil", quantity: "1 tbsp" },
      { name: "Cumin", quantity: "1/2 tsp" },
      { name: "Salt & pepper", quantity: "to taste" },
    ],
    steps: ["Season shrimp with cumin, salt and pepper; heat olive oil in a pan and pan-fry 2–3 min each side until pink and slightly charred.", "Make mango salsa: combine diced mango, red onion, cilantro and half the lime juice.", "Warm tortillas, dress cabbage with remaining lime juice; fill tortillas with cabbage, shrimp, mango salsa and a drizzle of chipotle sauce."],
  },
  {
    id: "d27", name: "Cauliflower Tikka Masala", cuisine: "Asian", mealType: "dinner",
    prepTime: 15, cookTime: 30, difficulty: "easy",
    phases: ["follicular", "ovulatory", "menstrual"], goal: ["lose", "maintain"],
    dietTags: ["vegan", "gluten-free"], allergens: [],
    macros: { calories: 380, protein: 12, carbs: 44, fat: 18 },
    micros: { iron: 3, fibre: 10, vitaminC: 70 },
    ingredients: [
      { name: "Cauliflower", quantity: "1 head, cut into florets" },
      { name: "Coconut milk", quantity: "1 cup" },
      { name: "Crushed tomatoes", quantity: "1 cup" },
      { name: "Tikka masala paste", quantity: "2 tbsp" },
      { name: "Onion", quantity: "1, finely diced" },
      { name: "Garlic", quantity: "2 cloves, minced" },
      { name: "Fresh ginger", quantity: "1 tbsp, grated" },
      { name: "Coconut oil", quantity: "1 tbsp" },
      { name: "Brown rice", quantity: "1 cup, cooked" },
      { name: "Fresh cilantro", quantity: "to garnish" },
    ],
    steps: ["Heat coconut oil in a wide pan, sauté onion until golden, about 5 min. Add garlic, ginger and tikka masala paste; cook 2 min until fragrant.", "Add cauliflower, crushed tomatoes and coconut milk; cover and simmer 20 min until cauliflower is tender.", "Serve over brown rice, garnished with fresh cilantro."],
  },
  {
    id: "d28", name: "Salmon Teriyaki with Broccoli", cuisine: "Asian", mealType: "dinner",
    prepTime: 10, cookTime: 18, difficulty: "easy",
    phases: ["luteal", "menstrual"], goal: ["maintain", "gain"],
    dietTags: ["pescatarian", "gluten-free"], allergens: [],
    macros: { calories: 450, protein: 36, carbs: 30, fat: 20 },
    micros: { omega3: 2.0, vitaminD: 350, iron: 2 },
    ingredients: [
      { name: "Salmon fillet", quantity: "180g, skin-on" },
      { name: "Teriyaki sauce", quantity: "2 tbsp" },
      { name: "Broccoli", quantity: "2 cups, florets" },
      { name: "Olive oil", quantity: "1 tbsp" },
      { name: "Brown rice", quantity: "1 cup, cooked" },
      { name: "Sesame seeds", quantity: "1 tbsp" },
      { name: "Spring onion", quantity: "2, sliced, to garnish" },
    ],
    steps: ["Brush salmon with teriyaki sauce and leave to marinate 5 min.", "Bake salmon at 200°C for 12–15 min; toss broccoli florets in olive oil and roast on the same tray the last 12 min.", "Serve over brown rice, scatter sesame seeds and spring onion."],
  },
  {
    id: "d29", name: "Pesto Chicken with Roasted Tomatoes", cuisine: "Mediterranean", mealType: "dinner",
    prepTime: 10, cookTime: 25, difficulty: "easy",
    phases: ["follicular", "ovulatory"], goal: ["maintain", "gain"],
    dietTags: ["gluten-free"], allergens: ["dairy", "nuts"],
    macros: { calories: 470, protein: 40, carbs: 14, fat: 28 },
    micros: { calcium: 100, vitaminC: 22, iron: 2 },
    ingredients: [
      { name: "Chicken breast", quantity: "180g" },
      { name: "Basil pesto", quantity: "2 tbsp" },
      { name: "Cherry tomatoes", quantity: "1 cup" },
      { name: "Mozzarella", quantity: "40g, sliced" },
      { name: "Zucchini", quantity: "1, sliced into rounds" },
      { name: "Olive oil", quantity: "1 tbsp" },
      { name: "Salt & pepper", quantity: "to taste" },
    ],
    steps: ["Coat chicken in pesto, place on a baking tray; toss zucchini and cherry tomatoes with olive oil, season and arrange alongside.", "Bake at 190°C for 20 min; place mozzarella slices over chicken for the last 3 min until melted.", "Serve chicken topped with mozzarella alongside roasted zucchini and burst tomatoes."],
  },
  {
    id: "d30", name: "Lamb Chops with Tabbouleh", cuisine: "Middle Eastern", mealType: "dinner",
    prepTime: 15, cookTime: 15, difficulty: "easy",
    phases: ["menstrual", "luteal"], goal: ["gain"],
    dietTags: ["halal"], allergens: [],
    macros: { calories: 520, protein: 36, carbs: 34, fat: 26 },
    micros: { iron: 5, vitaminC: 24, fibre: 6 },
    ingredients: [
      { name: "Lamb chops", quantity: "2 (about 200g total)" },
      { name: "Garlic", quantity: "2 cloves, minced" },
      { name: "Fresh rosemary", quantity: "2 sprigs" },
      { name: "Bulgur wheat", quantity: "1/2 cup, cooked" },
      { name: "Flat-leaf parsley", quantity: "1 cup, finely chopped" },
      { name: "Fresh mint", quantity: "1/4 cup, finely chopped" },
      { name: "Ripe tomato", quantity: "1, finely diced" },
      { name: "Cucumber", quantity: "1/2, finely diced" },
      { name: "Lemon juice", quantity: "2 tbsp, freshly squeezed" },
      { name: "Olive oil", quantity: "2 tbsp" },
      { name: "Salt & pepper", quantity: "to taste" },
    ],
    steps: ["Rub lamb chops with garlic, rosemary, 1 tbsp olive oil and seasoning; leave to marinate 10 min.", "Grill or pan-sear chops 4–5 min each side until nicely charred and cooked to your liking.", "Make tabbouleh: combine bulgur, parsley, mint, tomato, cucumber, lemon juice and remaining olive oil; season well. Serve lamb alongside."],
  },
  {
    id: "d31", name: "Dal Makhani", cuisine: "Asian", mealType: "dinner",
    prepTime: 10, cookTime: 40, difficulty: "easy",
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
    steps: ["Simmer soaked lentils and kidney beans in 3 cups fresh water until very tender, about 30 min.", "In a separate pan, melt butter with cumin seeds; sauté onion, garlic and ginger until golden, add garam masala and tomato puree, cook 5 min. Stir into lentils and simmer 10 min.", "Finish with cream, adjust salt and serve with naan or steamed rice."],
  },
  {
    id: "d32", name: "Prawn & Coconut Curry", cuisine: "Asian", mealType: "dinner",
    prepTime: 10, cookTime: 20, difficulty: "easy",
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
    steps: ["Heat coconut oil in a wok or deep pan, sauté onion and garlic 3 min, add curry paste and stir 1 min.", "Pour in coconut milk and add bell pepper; simmer 8–10 min until pepper is tender.", "Add prawns and cook 3–4 min until pink and cooked through; serve over jasmine rice with lime wedges and cilantro."],
  },
  {
    id: "d33", name: "Baked Feta Pasta", cuisine: "Mediterranean", mealType: "dinner",
    prepTime: 10, cookTime: 35, difficulty: "easy",
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
    steps: ["Place feta in a baking dish surrounded by tomatoes and garlic, drizzle with oil.", "Bake 30 min at 200°C until tomatoes burst.", "Cook pasta, mash feta with tomatoes, toss together with basil."],
  },
  {
    id: "d34", name: "Chimichurri Beef Rice Bowl", cuisine: "Latin", mealType: "dinner",
    prepTime: 15, cookTime: 15, difficulty: "easy",
    phases: ["menstrual", "luteal"], goal: ["gain"],
    dietTags: ["halal", "gluten-free"], allergens: [],
    macros: { calories: 530, protein: 36, carbs: 44, fat: 22 },
    micros: { iron: 5, vitaminC: 14, fibre: 4 },
    ingredients: [
      { name: "Sirloin steak", quantity: "180g" },
      { name: "Chimichurri sauce (parsley, garlic, oil, vinegar)", quantity: "3 tbsp" },
      { name: "Brown rice", quantity: "1 cup, cooked" },
      { name: "Roasted peppers", quantity: "1/2 cup" },
      { name: "Avocado", quantity: "1/4" },
    ],
    steps: ["Grill steak to desired doneness, rest 5 min then slice thinly.", "Serve over brown rice with roasted peppers and avocado.", "Spoon chimichurri generously over the steak."],
  },
  {
    id: "d35", name: "Spinach & Ricotta Stuffed Pasta Shells", cuisine: "Mediterranean", mealType: "dinner",
    prepTime: 20, cookTime: 30, difficulty: "medium",
    phases: ["follicular", "ovulatory"], goal: ["maintain"],
    dietTags: ["vegetarian"], allergens: ["dairy", "eggs"],
    macros: { calories: 460, protein: 22, carbs: 46, fat: 20 },
    micros: { calcium: 280, vitaminC: 12, fibre: 5 },
    ingredients: [
      { name: "Jumbo pasta shells", quantity: "8" },
      { name: "Ricotta", quantity: "150g" },
      { name: "Baby spinach", quantity: "1 cup" },
      { name: "Parmesan", quantity: "3 tbsp" },
      { name: "Egg", quantity: "1" },
      { name: "Tomato sauce", quantity: "1 cup" },
      { name: "Mozzarella", quantity: "40g" },
    ],
    steps: ["Mix ricotta, wilted spinach, parmesan and egg.", "Stuff shells and arrange in a baking dish.", "Cover with tomato sauce and mozzarella, bake 25 min at 190°C."],
  },
  {
    id: "d36", name: "Teriyaki Tempeh with Bok Choy", cuisine: "Asian", mealType: "dinner",
    prepTime: 10, cookTime: 18, difficulty: "easy",
    phases: ["follicular", "ovulatory"], goal: ["lose", "maintain"],
    dietTags: ["vegan"], allergens: ["soy"],
    macros: { calories: 390, protein: 24, carbs: 38, fat: 16 },
    micros: { iron: 4, calcium: 150, fibre: 6 },
    ingredients: [
      { name: "Tempeh", quantity: "200g, sliced" },
      { name: "Teriyaki sauce", quantity: "3 tbsp" },
      { name: "Bok choy", quantity: "2 heads" },
      { name: "Brown rice", quantity: "1 cup, cooked" },
      { name: "Sesame seeds & sesame oil", quantity: "1 tbsp / 1 tsp" },
    ],
    steps: ["Pan-fry tempeh in sesame oil until golden.", "Coat with teriyaki sauce and caramelise briefly.", "Steam bok choy, serve tempeh over rice with bok choy and sesame seeds."],
  },
  {
    id: "d37", name: "Grilled Sea Bass with Lemon & Herbs", cuisine: "Mediterranean", mealType: "dinner",
    prepTime: 10, cookTime: 15, difficulty: "easy",
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
      { name: "Roasted cherry tomatoes & green beans", quantity: "1 cup each" },
    ],
    steps: ["Score sea bass skin, season with herbs and lemon zest.", "Sear skin-side down in oil 4 min, flip and cook 2 min.", "Serve with roasted cherry tomatoes and steamed green beans."],
  },
  {
    id: "d38", name: "One-Pot Chicken & Chickpea Stew", cuisine: "Middle Eastern", mealType: "dinner",
    prepTime: 10, cookTime: 35, difficulty: "easy",
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
    steps: ["Heat olive oil in a heavy pot over medium-high heat; brown chicken thighs on both sides, about 4 min per side. Remove and set aside.", "Add onion and garlic to the same pot, cook 3 min; add ras el hanout and stir 1 min. Return chicken.", "Add chickpeas, tomatoes, preserved lemon and broth; cover and simmer 25 min. Garnish with fresh herbs before serving."],
  },
  {
    id: "d39", name: "Black Bean & Corn Enchilada Casserole", cuisine: "Latin", mealType: "dinner",
    prepTime: 15, cookTime: 30, difficulty: "easy",
    phases: ["luteal", "menstrual"], goal: ["maintain"],
    dietTags: ["vegetarian", "gluten-free"], allergens: ["dairy"],
    macros: { calories: 460, protein: 18, carbs: 58, fat: 16 },
    micros: { fibre: 14, iron: 4, calcium: 140 },
    ingredients: [
      { name: "Black beans", quantity: "1.5 cups" },
      { name: "Corn", quantity: "1/2 cup" },
      { name: "Enchilada sauce", quantity: "1 cup" },
      { name: "Corn tortillas", quantity: "4" },
      { name: "Cheddar or Monterey Jack", quantity: "60g" },
      { name: "Bell pepper", quantity: "1" },
      { name: "Cumin", quantity: "1 tsp" },
    ],
    steps: ["Mix black beans, corn, pepper and cumin.", "Layer tortillas, bean mixture, enchilada sauce and cheese in a baking dish, repeat.", "Bake 25 min at 190°C until bubbling and golden."],
  },

  // ───────── Batch 4 — Snacks (+20) ─────────
  {
    id: "s17", name: "Dark Chocolate Bark with Seeds & Berries", cuisine: "Global", mealType: "snack",
    prepTime: 10, cookTime: 5, difficulty: "easy",
    phases: ["luteal", "menstrual"], goal: ["maintain", "gain"],
    dietTags: ["vegan", "gluten-free"], allergens: [],
    macros: { calories: 220, protein: 4, carbs: 20, fat: 14 },
    micros: { magnesium: 55, iron: 2, fibre: 4 },
    ingredients: [
      { name: "Dark chocolate (70%+)", quantity: "70g" },
      { name: "Pumpkin seeds", quantity: "2 tbsp" },
      { name: "Dried cranberries", quantity: "1 tbsp" },
      { name: "Sunflower seeds", quantity: "1 tbsp" },
    ],
    steps: ["Melt dark chocolate and pour onto baking paper.", "Scatter seeds and cranberries over the surface.", "Refrigerate until set (30 min), break into pieces."],
  },
  {
    id: "s18", name: "Baked Parmesan Kale Chips", cuisine: "Mediterranean", mealType: "snack",
    prepTime: 8, cookTime: 15, difficulty: "easy",
    phases: ["follicular", "ovulatory"], goal: ["lose"],
    dietTags: ["vegetarian", "gluten-free"], allergens: ["dairy"],
    macros: { calories: 120, protein: 6, carbs: 8, fat: 7 },
    micros: { vitaminC: 80, calcium: 80, fibre: 4 },
    ingredients: [
      { name: "Kale", quantity: "2 cups, torn into pieces" },
      { name: "Parmesan", quantity: "2 tbsp, grated" },
      { name: "Olive oil", quantity: "1 tsp" },
      { name: "Garlic powder", quantity: "1 pinch" },
    ],
    steps: ["Toss kale with oil, garlic powder and parmesan.", "Spread in a single layer on a baking tray.", "Bake 12 min at 180°C until crispy — watch carefully."],
  },
  {
    id: "s19", name: "Almond Banana Protein Shake", cuisine: "Global", mealType: "snack",
    prepTime: 5, cookTime: 0, difficulty: "quick",
    phases: ["follicular", "ovulatory", "luteal"], goal: ["gain"],
    dietTags: ["vegetarian", "gluten-free"], allergens: ["nuts", "dairy"],
    macros: { calories: 320, protein: 26, carbs: 30, fat: 10 },
    micros: { calcium: 250, magnesium: 50, fibre: 3 },
    ingredients: [
      { name: "Milk", quantity: "1 cup" },
      { name: "Vanilla protein powder", quantity: "1 scoop" },
      { name: "Banana", quantity: "1" },
      { name: "Almond butter", quantity: "1 tbsp" },
      { name: "Ice cubes", quantity: "a handful" },
    ],
    steps: ["Add all ingredients to a blender.", "Blend until smooth and creamy.", "Serve immediately."],
  },
  {
    id: "s20", name: "Warm Spiced Baked Apple", cuisine: "Nordic", mealType: "snack",
    prepTime: 5, cookTime: 20, difficulty: "easy",
    phases: ["luteal", "follicular"], goal: ["maintain", "lose"],
    dietTags: ["vegan", "gluten-free"], allergens: [],
    macros: { calories: 140, protein: 1, carbs: 34, fat: 2 },
    micros: { fibre: 5, vitaminC: 6, magnesium: 10 },
    ingredients: [
      { name: "Apple", quantity: "1 large" },
      { name: "Cinnamon", quantity: "1 tsp" },
      { name: "Nutmeg", quantity: "1 pinch" },
      { name: "Honey", quantity: "1 tsp" },
      { name: "Raisins", quantity: "1 tbsp" },
    ],
    steps: ["Core the apple and place in a small baking dish.", "Fill the cavity with raisins, cinnamon and nutmeg.", "Drizzle honey over top, bake 20 min at 180°C until tender."],
  },
  {
    id: "s21", name: "Guacamole with Corn Chips", cuisine: "Latin", mealType: "snack",
    prepTime: 10, cookTime: 0, difficulty: "quick",
    phases: ["follicular", "ovulatory"], goal: ["maintain"],
    dietTags: ["vegan", "gluten-free"], allergens: [],
    macros: { calories: 260, protein: 4, carbs: 28, fat: 16 },
    micros: { vitaminC: 14, fibre: 8, vitaminB6: 0.4 },
    ingredients: [
      { name: "Avocado", quantity: "1 ripe" },
      { name: "Lime juice", quantity: "1 tbsp" },
      { name: "Fresh cilantro", quantity: "2 tbsp" },
      { name: "Red onion", quantity: "1/4, diced" },
      { name: "Corn tortilla chips", quantity: "1 oz (28g)" },
    ],
    steps: ["Mash avocado with lime juice.", "Stir in cilantro and red onion, season with salt.", "Serve with corn chips."],
  },
  {
    id: "s22", name: "Cashew & Medjool Date Bites", cuisine: "Global", mealType: "snack",
    prepTime: 15, cookTime: 0, difficulty: "easy",
    phases: ["luteal", "menstrual"], goal: ["maintain", "gain"],
    dietTags: ["vegan", "gluten-free"], allergens: ["nuts"],
    macros: { calories: 240, protein: 5, carbs: 30, fat: 12 },
    micros: { magnesium: 45, iron: 2, fibre: 4 },
    ingredients: [
      { name: "Medjool dates", quantity: "4, pitted" },
      { name: "Raw cashews", quantity: "1/4 cup" },
      { name: "Vanilla extract", quantity: "1/2 tsp" },
      { name: "Sea salt", quantity: "1 pinch" },
    ],
    steps: ["Pulse cashews to a fine crumb in a food processor.", "Add dates, vanilla and salt, blend until a sticky dough forms.", "Roll into balls and refrigerate 30 min."],
  },
  {
    id: "s23", name: "Smoked Salmon Cucumber Bites", cuisine: "Nordic", mealType: "snack",
    prepTime: 8, cookTime: 0, difficulty: "quick",
    phases: ["menstrual", "luteal"], goal: ["maintain", "lose"],
    dietTags: ["pescatarian", "gluten-free"], allergens: ["dairy"],
    macros: { calories: 150, protein: 14, carbs: 4, fat: 8 },
    micros: { omega3: 1.4, calcium: 60, fibre: 1 },
    ingredients: [
      { name: "Cucumber", quantity: "1 large" },
      { name: "Cream cheese", quantity: "30g" },
      { name: "Smoked salmon", quantity: "60g" },
      { name: "Fresh dill", quantity: "to taste" },
      { name: "Capers", quantity: "1 tbsp" },
    ],
    steps: ["Slice cucumber into thick rounds.", "Top each round with a small amount of cream cheese.", "Add a piece of smoked salmon, a caper and a dill sprig."],
  },
  {
    id: "s24", name: "Caprese Skewers", cuisine: "Mediterranean", mealType: "snack",
    prepTime: 8, cookTime: 0, difficulty: "quick",
    phases: ["follicular", "ovulatory"], goal: ["maintain"],
    dietTags: ["vegetarian", "gluten-free"], allergens: ["dairy"],
    macros: { calories: 180, protein: 10, carbs: 6, fat: 12 },
    micros: { calcium: 180, vitaminC: 8, fibre: 1 },
    ingredients: [
      { name: "Cherry tomatoes", quantity: "12" },
      { name: "Mini mozzarella balls", quantity: "12" },
      { name: "Fresh basil leaves", quantity: "12" },
      { name: "Balsamic glaze", quantity: "1 tbsp" },
      { name: "Olive oil", quantity: "1 tsp" },
    ],
    steps: ["Thread a tomato, basil leaf and mozzarella ball onto each skewer.", "Arrange on a plate.", "Drizzle with balsamic glaze and a little olive oil."],
  },
  {
    id: "s25", name: "Frozen Yoghurt Berry Bark", cuisine: "Global", mealType: "snack",
    prepTime: 10, cookTime: 0, difficulty: "easy",
    phases: ["ovulatory", "follicular"], goal: ["lose", "maintain"],
    dietTags: ["vegetarian", "gluten-free"], allergens: ["dairy"],
    macros: { calories: 160, protein: 8, carbs: 22, fat: 4 },
    micros: { calcium: 180, vitaminC: 20, fibre: 3 },
    ingredients: [
      { name: "Greek yoghurt", quantity: "1 cup" },
      { name: "Honey", quantity: "1 tbsp" },
      { name: "Mixed berries", quantity: "1 cup" },
      { name: "Granola", quantity: "2 tbsp" },
    ],
    steps: ["Mix yoghurt with honey, spread on a lined baking sheet.", "Top with berries and granola.", "Freeze 3 hours until solid, then break into bark pieces."],
  },
  {
    id: "s26", name: "Homemade Granola Bars", cuisine: "Global", mealType: "snack",
    prepTime: 10, cookTime: 25, difficulty: "easy",
    phases: ["luteal", "follicular"], goal: ["gain", "maintain"],
    dietTags: ["vegetarian"], allergens: ["nuts"],
    macros: { calories: 280, protein: 7, carbs: 36, fat: 12 },
    micros: { magnesium: 45, fibre: 4, iron: 2 },
    ingredients: [
      { name: "Rolled oats", quantity: "2 cups" },
      { name: "Mixed nuts & seeds", quantity: "1/2 cup" },
      { name: "Honey", quantity: "3 tbsp" },
      { name: "Almond butter", quantity: "2 tbsp" },
      { name: "Vanilla extract", quantity: "1 tsp" },
      { name: "Dried fruit", quantity: "1/4 cup" },
    ],
    steps: ["Warm honey and almond butter together until smooth.", "Mix with oats, nuts and dried fruit.", "Press firmly into a lined tin, bake 20 min at 165°C, cool then slice into bars."],
  },
  {
    id: "s27", name: "Avocado Deviled Eggs", cuisine: "Global", mealType: "snack",
    prepTime: 12, cookTime: 10, difficulty: "easy",
    phases: ["follicular", "ovulatory"], goal: ["maintain", "lose"],
    dietTags: ["vegetarian", "gluten-free"], allergens: ["eggs"],
    macros: { calories: 200, protein: 11, carbs: 4, fat: 16 },
    micros: { vitaminB6: 0.3, fibre: 3, iron: 1 },
    ingredients: [
      { name: "Eggs", quantity: "4" },
      { name: "Avocado", quantity: "1/2" },
      { name: "Lemon juice", quantity: "1 tsp" },
      { name: "Paprika", quantity: "1 pinch" },
      { name: "Salt & pepper", quantity: "to taste" },
    ],
    steps: ["Hard-boil eggs, halve and carefully remove yolks.", "Mash yolks with avocado, lemon juice and seasoning until smooth.", "Pipe or spoon filling back into whites, dust with paprika."],
  },
  {
    id: "s28", name: "Blueberry Protein Muffin", cuisine: "Global", mealType: "snack",
    prepTime: 10, cookTime: 22, difficulty: "easy",
    phases: ["follicular", "ovulatory"], goal: ["gain", "maintain"],
    dietTags: ["vegetarian", "gluten-free"], allergens: ["nuts", "eggs", "dairy"],
    macros: { calories: 260, protein: 16, carbs: 24, fat: 10 },
    micros: { calcium: 80, vitaminC: 4, fibre: 4 },
    ingredients: [
      { name: "Almond flour", quantity: "1 cup" },
      { name: "Vanilla protein powder", quantity: "1/2 scoop" },
      { name: "Eggs", quantity: "2" },
      { name: "Blueberries", quantity: "1/2 cup" },
      { name: "Maple syrup", quantity: "2 tbsp" },
      { name: "Greek yoghurt", quantity: "2 tbsp" },
      { name: "Baking powder", quantity: "1 tsp" },
    ],
    steps: ["Mix almond flour, protein powder and baking powder.", "Whisk in eggs, yoghurt and maple syrup.", "Fold in blueberries, bake in muffin tin 20 min at 175°C."],
  },
  {
    id: "s29", name: "Pumpkin Seed & Dark Chocolate Clusters", cuisine: "Global", mealType: "snack",
    prepTime: 10, cookTime: 5, difficulty: "easy",
    phases: ["luteal", "menstrual"], goal: ["maintain"],
    dietTags: ["vegan", "gluten-free"], allergens: [],
    macros: { calories: 210, protein: 6, carbs: 16, fat: 14 },
    micros: { magnesium: 100, iron: 3, fibre: 3 },
    ingredients: [
      { name: "Pumpkin seeds", quantity: "1/4 cup" },
      { name: "Dark chocolate (70%+)", quantity: "50g, melted" },
      { name: "Rolled oats", quantity: "2 tbsp" },
      { name: "Honey", quantity: "1 tsp" },
    ],
    steps: ["Mix pumpkin seeds, oats and honey into the melted chocolate.", "Drop small clusters onto baking paper.", "Refrigerate until set (about 20 min)."],
  },
  {
    id: "s30", name: "Tahini Dark Chocolate Dip with Fruit", cuisine: "Middle Eastern", mealType: "snack",
    prepTime: 5, cookTime: 0, difficulty: "quick",
    phases: ["luteal", "ovulatory"], goal: ["maintain"],
    dietTags: ["vegan", "gluten-free"], allergens: [],
    macros: { calories: 230, protein: 7, carbs: 20, fat: 14 },
    micros: { iron: 3, magnesium: 40, fibre: 4 },
    ingredients: [
      { name: "Tahini", quantity: "2 tbsp" },
      { name: "Dark chocolate chips", quantity: "1 tbsp, melted" },
      { name: "Maple syrup", quantity: "1 tsp" },
      { name: "Banana & apple", quantity: "1 each, sliced" },
    ],
    steps: ["Stir tahini with melted dark chocolate and maple syrup until smooth.", "Serve in a small bowl.", "Dip banana and apple slices."],
  },
  {
    id: "s31", name: "Warm Golden Milk", cuisine: "Asian", mealType: "snack",
    prepTime: 3, cookTime: 5, difficulty: "quick",
    phases: ["luteal", "menstrual", "follicular"], goal: ["maintain", "lose"],
    dietTags: ["vegan", "gluten-free"], allergens: [],
    macros: { calories: 90, protein: 2, carbs: 12, fat: 4 },
    micros: { calcium: 60, magnesium: 20, fibre: 1 },
    ingredients: [
      { name: "Plant milk", quantity: "1 cup" },
      { name: "Turmeric", quantity: "1 tsp" },
      { name: "Cinnamon", quantity: "1/2 tsp" },
      { name: "Ginger powder", quantity: "1/4 tsp" },
      { name: "Black pepper", quantity: "1 pinch" },
      { name: "Honey", quantity: "1 tsp" },
    ],
    steps: ["Warm plant milk in a saucepan over medium heat.", "Whisk in turmeric, cinnamon, ginger and black pepper.", "Sweeten with honey and froth if desired."],
  },
  {
    id: "s32", name: "Sweet Potato Cinnamon Rounds", cuisine: "Global", mealType: "snack",
    prepTime: 5, cookTime: 20, difficulty: "easy",
    phases: ["luteal", "menstrual"], goal: ["maintain", "lose"],
    dietTags: ["vegan", "gluten-free"], allergens: [],
    macros: { calories: 170, protein: 3, carbs: 36, fat: 2 },
    micros: { vitaminC: 14, fibre: 5, magnesium: 30 },
    ingredients: [
      { name: "Sweet potato", quantity: "1 large" },
      { name: "Cinnamon", quantity: "1 tsp" },
      { name: "Olive oil", quantity: "1 tsp" },
      { name: "Honey", quantity: "1 tsp" },
    ],
    steps: ["Slice sweet potato into rounds, toss with oil and cinnamon.", "Bake 15-18 min at 200°C until tender and lightly caramelised.", "Drizzle with honey to serve."],
  },
  {
    id: "s33", name: "Nut Butter Rice Cakes", cuisine: "Global", mealType: "snack",
    prepTime: 3, cookTime: 0, difficulty: "quick",
    phases: ["follicular", "luteal"], goal: ["maintain"],
    dietTags: ["vegan", "gluten-free"], allergens: ["nuts"],
    macros: { calories: 200, protein: 6, carbs: 24, fat: 10 },
    micros: { magnesium: 30, fibre: 2, vitaminB6: 0.2 },
    ingredients: [
      { name: "Brown rice cakes", quantity: "2" },
      { name: "Almond butter", quantity: "1.5 tbsp" },
      { name: "Banana", quantity: "1/2, sliced" },
      { name: "Honey", quantity: "1 drizzle" },
    ],
    steps: ["Spread almond butter evenly on both rice cakes.", "Top with banana slices.", "Drizzle with honey and serve."],
  },
  {
    id: "s34", name: "Mango Lime Chia Fresca", cuisine: "Latin", mealType: "snack",
    prepTime: 5, cookTime: 0, difficulty: "quick",
    phases: ["ovulatory", "follicular"], goal: ["lose"],
    dietTags: ["vegan", "gluten-free"], allergens: [],
    macros: { calories: 120, protein: 2, carbs: 26, fat: 3 },
    micros: { vitaminC: 38, fibre: 5, omega3: 0.5 },
    ingredients: [
      { name: "Fresh mango or mango juice", quantity: "1 cup" },
      { name: "Chia seeds", quantity: "1 tbsp" },
      { name: "Lime juice", quantity: "1 tbsp" },
      { name: "Sparkling water", quantity: "1/2 cup" },
      { name: "Fresh mint", quantity: "a few leaves" },
    ],
    steps: ["Blend or juice the mango.", "Stir in chia seeds and lime juice, let sit 5 min.", "Pour over ice, top with sparkling water and mint."],
  },
  {
    id: "s35", name: "Roasted Rosemary Almonds", cuisine: "Mediterranean", mealType: "snack",
    prepTime: 5, cookTime: 12, difficulty: "easy",
    phases: ["follicular", "ovulatory", "luteal"], goal: ["maintain", "gain"],
    dietTags: ["vegan", "gluten-free"], allergens: ["nuts"],
    macros: { calories: 220, protein: 7, carbs: 8, fat: 18 },
    micros: { magnesium: 60, iron: 2, fibre: 4 },
    ingredients: [
      { name: "Almonds", quantity: "1/4 cup (raw)" },
      { name: "Fresh rosemary", quantity: "1 tsp, chopped" },
      { name: "Garlic powder", quantity: "1/2 tsp" },
      { name: "Olive oil", quantity: "1 tsp" },
      { name: "Sea salt", quantity: "to taste" },
    ],
    steps: ["Toss almonds with oil, rosemary, garlic powder and salt.", "Roast on a baking sheet 10-12 min at 170°C, shaking halfway.", "Cool before eating — they crisp up as they cool."],
  },
  {
    id: "s36", name: "Labneh & Za'atar Dip with Veggies", cuisine: "Middle Eastern", mealType: "snack",
    prepTime: 8, cookTime: 0, difficulty: "quick",
    phases: ["follicular", "ovulatory"], goal: ["lose", "maintain"],
    dietTags: ["vegetarian", "gluten-free"], allergens: ["dairy"],
    macros: { calories: 160, protein: 9, carbs: 8, fat: 10 },
    micros: { calcium: 160, iron: 1, fibre: 3 },
    ingredients: [
      { name: "Labneh (strained yoghurt)", quantity: "1/2 cup" },
      { name: "Za'atar spice blend", quantity: "1 tsp" },
      { name: "Olive oil", quantity: "1 tsp" },
      { name: "Cucumber sticks", quantity: "1 cup" },
      { name: "Carrot sticks", quantity: "1 cup" },
    ],
    steps: ["Spread labneh in a wide bowl.", "Drizzle with olive oil and sprinkle za'atar generously over the top.", "Serve with cucumber and carrot sticks for dipping."],
  },
];

export const RECIPES: Recipe[] = RAW_RECIPES.map(finalizeRecipe);
