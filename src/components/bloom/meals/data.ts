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

export type MealType = "breakfast" | "lunch" | "dinner" | "snack" | "lunchbox";
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

export interface Ingredient {
  item: string;        // canonical pantry key (lowercase)
  qty: string;         // display quantity ("1 cup")
  category: PantryCategoryKey;
}

export interface Recipe {
  id: string;
  name: string;
  image?: string;
  mealType: MealType;
  intention: Intention[];
  cyclePhase: CyclePhase[];
  prepMin: number;
  cookMin: number;
  difficulty: "easy" | "medium" | "hard";
  diet: ("vegetarian" | "vegan" | "gluten-free" | "dairy-free" | "nut-free")[];
  cost: "$" | "$$" | "$$$";
  vibe: Vibe;
  ingredients: Ingredient[];
  steps: string[];
  conservation: { fridgeDays: number; freezerWeeks: number; sameDay?: boolean; container?: string };
  batchTip?: string;
  substitutionTip?: string;
  packable?: boolean;        // for kids lunchbox
  noReheat?: boolean;
  allergens?: string[];      // ex: "nuts", "dairy"
}

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

/* ---------------- Recipes (sample seed — append more here, no code changes) ---------------- */

export const RECIPES: Recipe[] = [
  {
    id: "rose-oats",
    name: "Rose-Berry Overnight Oats",
    image: "https://images.pexels.com/photos/4226893/pexels-photo-4226893.jpeg?auto=compress&cs=tinysrgb&w=400",
    mealType: "breakfast",
    intention: ["light", "energy", "quick"],
    cyclePhase: ["follicular", "ovulation", "any"],
    prepMin: 5, cookMin: 0, difficulty: "easy",
    diet: ["vegetarian", "nut-free"],
    cost: "$",
    vibe: "Energizing",
    ingredients: [
      { item: "oats", qty: "1/2 cup", category: "grains" },
      { item: "greek yogurt", qty: "1/2 cup", category: "dairy" },
      { item: "milk", qty: "1/2 cup", category: "dairy" },
      { item: "strawberries", qty: "1/2 cup", category: "fruits" },
      { item: "honey", qty: "1 tsp", category: "condiments" },
    ],
    steps: [
      "Mix oats, yogurt and milk in a jar.",
      "Stir in honey and half the strawberries.",
      "Chill overnight. Top with remaining berries in the morning.",
    ],
    conservation: { fridgeDays: 3, freezerWeeks: 0, container: "Glass jar with lid" },
    batchTip: "Make 3 jars at once for the week.",
    substitutionTip: "Swap strawberries for any berry or chopped apple.",
    packable: true, noReheat: true,
  },
  {
    id: "rainbow-buddha",
    name: "Rainbow Salmon Buddha Bowl",
    image: "https://images.pexels.com/photos/4226893/pexels-photo-4226893.jpeg?auto=compress&cs=tinysrgb&w=400",
    mealType: "lunch",
    intention: ["protein", "energy", "cycle"],
    cyclePhase: ["ovulation", "follicular", "any"],
    prepMin: 10, cookMin: 15, difficulty: "easy",
    diet: ["gluten-free", "dairy-free", "nut-free"],
    cost: "$$",
    vibe: "Protein-rich",
    ingredients: [
      { item: "salmon", qty: "1 fillet", category: "proteins" },
      { item: "quinoa", qty: "1/2 cup", category: "grains" },
      { item: "avocado", qty: "1/2", category: "vegetables" },
      { item: "beets", qty: "1/2 cup", category: "vegetables" },
      { item: "spinach", qty: "1 cup", category: "vegetables" },
      { item: "olive oil", qty: "1 tbsp", category: "condiments" },
      { item: "lemons", qty: "1/2", category: "fruits" },
    ],
    steps: [
      "Cook quinoa per package instructions.",
      "Bake salmon 12 min at 200°C with olive oil and lemon.",
      "Assemble bowl: quinoa, salmon, beets, spinach, avocado. Drizzle olive oil.",
    ],
    conservation: { fridgeDays: 2, freezerWeeks: 0, container: "Airtight glass container" },
    batchTip: "Cook a big batch of quinoa for the week.",
    substitutionTip: "Swap salmon for chickpeas (vegan).",
  },
  {
    id: "cozy-lentil",
    name: "Cozy Lentil Sweet Potato Stew",
    image: "https://images.pexels.com/photos/4226893/pexels-photo-4226893.jpeg?auto=compress&cs=tinysrgb&w=400",
    mealType: "dinner",
    intention: ["comfort", "plant", "budget", "cycle"],
    cyclePhase: ["period", "luteal", "any"],
    prepMin: 10, cookMin: 30, difficulty: "easy",
    diet: ["vegan", "vegetarian", "gluten-free", "dairy-free", "nut-free"],
    cost: "$",
    vibe: "Balanced",
    ingredients: [
      { item: "lentils", qty: "1 cup", category: "proteins" },
      { item: "sweet potato", qty: "2", category: "vegetables" },
      { item: "onion", qty: "1", category: "vegetables" },
      { item: "garlic", qty: "2 cloves", category: "vegetables" },
      { item: "carrots", qty: "2", category: "vegetables" },
      { item: "cumin", qty: "1 tsp", category: "condiments" },
      { item: "turmeric", qty: "1/2 tsp", category: "condiments" },
      { item: "olive oil", qty: "1 tbsp", category: "condiments" },
    ],
    steps: [
      "Sauté onion, garlic and spices in olive oil 3 min.",
      "Add chopped carrots and sweet potato, stir 2 min.",
      "Add lentils + 4 cups water. Simmer 25 min until tender.",
    ],
    conservation: { fridgeDays: 5, freezerWeeks: 8, container: "Airtight container or freezer bag" },
    batchTip: "Doubles beautifully — freeze half in single portions.",
    substitutionTip: "Swap sweet potato for butternut squash.",
  },
  {
    id: "kid-bento",
    name: "Strawberry Bento Lunchbox",
    image: "https://images.pexels.com/photos/4226893/pexels-photo-4226893.jpeg?auto=compress&cs=tinysrgb&w=400",
    mealType: "lunchbox",
    intention: ["quick", "budget"],
    cyclePhase: ["any"],
    prepMin: 10, cookMin: 0, difficulty: "easy",
    diet: ["vegetarian", "nut-free"],
    cost: "$",
    vibe: "Balanced",
    ingredients: [
      { item: "bread", qty: "2 slices", category: "grains" },
      { item: "cheddar", qty: "30g cubes", category: "dairy" },
      { item: "cucumber", qty: "1/2", category: "vegetables" },
      { item: "strawberries", qty: "6", category: "fruits" },
    ],
    steps: [
      "Cut bread into mini sandwich rolls with cheese.",
      "Slice cucumber into rounds.",
      "Pack strawberries + cheese cubes in compartments.",
    ],
    conservation: { fridgeDays: 1, freezerWeeks: 0, sameDay: true, container: "Bento box" },
    packable: true, noReheat: true,
    batchTip: "Prep 5 boxes on Sunday evening for Mon–Fri.",
    substitutionTip: "Swap cheddar for hummus (dairy-free).",
  },
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