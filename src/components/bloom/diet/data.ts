/* ---------- Types ---------- */

export type DietPhase = "menstrual" | "follicular" | "ovulatory" | "luteal";
export type DietGoal = "lose" | "maintain" | "gain";
export type MealType = "breakfast" | "lunch" | "dinner" | "snack";
export type DietType = "omnivore" | "vegetarian" | "vegan" | "gluten-free" | "halal";
export type Allergy = "dairy" | "nuts" | "eggs" | "soy" | "shellfish";
export type CookingFrequency = "quick" | "normal" | "love";

export interface DietProfile {
  goal: DietGoal;
  dietType: DietType;
  allergies: Allergy[];
  cookingFrequency: CookingFrequency;
}

export interface Recipe {
  id: string;
  name: string;
  cuisine: string;
  mealType: MealType;
  prepTime: number;
  cookTime: number;
  difficulty: "quick" | "easy" | "elaborate";
  phases: DietPhase[];
  goal: DietGoal[];
  dietTags: string[];
  allergens: Allergy[];
  photo: string;
  macros: { calories: number; protein: number; carbs: number; fat: number };
  micros: Partial<Record<"iron" | "magnesium" | "omega3" | "vitaminC" | "fibre" | "vitaminB6" | "calcium" | "vitaminD", number>>;
  ingredients: { name: string; quantity: string }[];
  steps: string[];
}

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

/* ---------- Recipes ---------- */

export const RECIPES: Recipe[] = [
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
];
