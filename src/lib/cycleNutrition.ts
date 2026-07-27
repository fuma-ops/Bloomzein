/**
 * Cycle-Nutrition page content — the rich, per-phase editorial layer that powers
 * the Diet · Cycle Nutrition redesign ("Nutrition Cycle"). It's a *presentation*
 * layer: warm copy, illustrative meters and food-education content tuned to each
 * phase. It never computes shared numbers — the live phase comes from
 * cyclePhase.ts / buildDayCoach, and the eat / avoid / key-nutrient lists are
 * read straight from the canonical PHASE_INFO so this page can never disagree
 * with the coach card. New content here is page-specific storytelling only.
 */

import { PHASE_INFO, type DietPhase } from "@/components/bloom/recipes/data";

/* ---------- phase order + pretty day labels (mirrors phaseForDay math) ---------- */

/** Display order for the phase selector (matches a natural cycle timeline). */
export const CYCLE_PHASE_ORDER: DietPhase[] = ["menstrual", "follicular", "ovulatory", "luteal"];

/** Human day range per phase (based on a typical 28-day cycle). */
export const PHASE_DAY_RANGE: Record<DietPhase, string> = {
  menstrual: "Days 1–5",
  follicular: "Days 6–13",
  ovulatory: "Days 14–16",
  luteal: "Days 17–28",
};

/* ---------- the four "vital" meters (illustrative, phase-typical) ---------- */

export interface PhaseMeters {
  energy: number;
  mood: number;
  focus: number;
  recovery: number;
}

/* ---------- a nutrient the body leans on this phase ---------- */

export interface NutrientNeed {
  /** icon key resolved to a lucide icon in the view */
  icon:
    | "protein"
    | "iron"
    | "omega3"
    | "magnesium"
    | "fibre"
    | "calcium"
    | "antioxidants"
    | "bvitamins";
  name: string;
  why: string;
  /** where to find it — a short food list for the "sources" table */
  sources: string[];
}

/* ---------- a labelled tip (movement / lifestyle / limit) ---------- */

export interface Tip {
  icon: string; // lucide key, resolved in the view
  title: string;
  note: string;
}

/* ---------- the full per-phase editorial payload ---------- */

export interface CycleNutritionContent {
  phase: DietPhase;
  label: string;
  dayRange: string;
  /** hero background photo (all exist in /public/images) */
  heroImage: string;
  /** accent hex used for meters / dots on this phase (brand-pink family) */
  accent: string;
  /** the emotional one-liner under the title */
  tagline: string;
  /** "Your Body Today" paragraph */
  bodyToday: string;
  meters: PhaseMeters;
  /** "At a Glance" benefit bullets */
  glance: string[];
  /** hormone headline + note for the "Hormones × Nutrition" panel */
  hormoneTitle: string;
  hormoneNote: string;
  /** what to emphasise on the plate (education, not a calorie formula) */
  nutritionFocus: string[];
  /** expected benefits of eating with the phase */
  benefits: string[];
  /** the four hero nutrients + where to find them */
  nutrients: NutrientNeed[];
  /** Bloom Plate macro emphasis (ratios sum to 100 — a visual guide, not kcal) */
  plate: { carbs: number; protein: number; complexCarbs: number; fats: number; note: string };
  /** foods to ease up on, with the "why" */
  limit: Tip[];
  /** a little science moment */
  didYouKnow: string;
  /** movement that matches the phase's energy */
  movement: Tip[];
  /** gentle lifestyle nudges */
  lifestyle: Tip[];
}

/* ---------- shared lifestyle nudges (light per-phase tuning) ---------- */

const LIFESTYLE_BASE: Tip[] = [
  { icon: "sun", title: "Get morning sunlight", note: "Supports mood and energy" },
  { icon: "droplet", title: "Drink 2–2.5L of water", note: "Boosts metabolism and glow" },
  { icon: "leaf", title: "Eat colorful, whole foods", note: "Fuel your body and hormones" },
  { icon: "moon", title: "Sleep before 11 PM", note: "Supports hormone balance" },
];

export const CYCLE_NUTRITION: Record<DietPhase, CycleNutritionContent> = {
  menstrual: {
    phase: "menstrual",
    label: PHASE_INFO.menstrual.label,
    dayRange: PHASE_DAY_RANGE.menstrual,
    heroImage: "/images/read-cycle.webp",
    accent: "oklch(0.58 0.23 0)",
    tagline: "Rest is productive too — nourish deeply and be tender with yourself.",
    bodyToday:
      "Estrogen and progesterone are at their lowest, so energy dips and your body is working hard to renew. This is a week to slow down, keep warm, and replenish the iron you lose — gentle, mineral-rich food helps you feel steadier and less depleted.",
    meters: { energy: 32, mood: 55, focus: 45, recovery: 70 },
    glance: [
      "Replenish lost iron",
      "Ease cramps naturally",
      "Warm, comforting food",
      "Steadier mood",
      "Gentle, restorative movement",
      "Deeper rest",
    ],
    hormoneTitle: "Hormones at rest",
    hormoneNote:
      "Low estrogen and progesterone mean lower energy — iron and magnesium replenish what your period takes and soften cramps.",
    nutritionFocus: [
      "Iron-rich foods",
      "Warming meals",
      "Magnesium sources",
      "Anti-inflammatory fats",
    ],
    benefits: ["Fewer cramps", "Steadier energy", "Balanced mood", "Better rest"],
    nutrients: [
      {
        icon: "iron",
        name: "Iron",
        why: "Replaces iron lost with your period and fights fatigue.",
        sources: ["Spinach", "Lentils", "Red meat", "Pumpkin seeds", "Beets"],
      },
      {
        icon: "magnesium",
        name: "Magnesium",
        why: "Relaxes muscles, eases cramps and calms the nervous system.",
        sources: ["Dark chocolate", "Almonds", "Spinach", "Bananas", "Avocado"],
      },
      {
        icon: "omega3",
        name: "Omega-3",
        why: "Lowers inflammation and helps soften period pain.",
        sources: ["Salmon", "Sardines", "Chia seeds", "Walnuts", "Flaxseeds"],
      },
      {
        icon: "antioxidants",
        name: "Vitamin C",
        why: "Boosts iron absorption and supports gentle repair.",
        sources: ["Citrus", "Bell pepper", "Kiwi", "Strawberries", "Broccoli"],
      },
    ],
    plate: {
      carbs: 35,
      protein: 25,
      complexCarbs: 30,
      fats: 10,
      note: "Warm, iron-forward and easy to digest.",
    },
    limit: [
      {
        icon: "candy",
        title: "Caffeine",
        note: "Can worsen cramps and tension — swap for ginger tea",
      },
      { icon: "wine", title: "Alcohol", note: "Dehydrates and dips your mood further" },
      { icon: "flame", title: "Salty snacks", note: "Add to bloating and water retention" },
      {
        icon: "snowflake",
        title: "Cold, raw meals",
        note: "Warm food is gentler on a tender belly",
      },
    ],
    didYouKnow:
      "A woman can lose up to 40 mg of iron during her period — pairing iron-rich foods with vitamin C nearly doubles how much your body absorbs.",
    movement: [
      { icon: "flower", title: "Gentle Yoga", note: "Restorative flow eases cramps" },
      { icon: "footprints", title: "Slow Walks", note: "Boosts circulation, low effort" },
      { icon: "wind", title: "Stretching", note: "Releases tension in the lower back" },
    ],
    lifestyle: LIFESTYLE_BASE,
  },
  follicular: {
    phase: "follicular",
    label: PHASE_INFO.follicular.label,
    dayRange: PHASE_DAY_RANGE.follicular,
    heroImage: "/images/cycle-insight-hero.webp",
    accent: "oklch(0.64 0.22 350)",
    tagline: "Your energy is climbing — say yes to something new and fuel the momentum.",
    bodyToday:
      "Estrogen is rising, helping you feel more energetic, confident and mentally clear. This is your time to grow — take action and build healthy habits. Light, fresh food and lean protein keep insulin steady so your new-found momentum lasts all day.",
    meters: { energy: 80, mood: 70, focus: 80, recovery: 60 },
    glance: [
      "More motivation",
      "Sharper focus",
      "Better endurance",
      "More confidence",
      "Better recovery",
      "More creativity",
    ],
    hormoneTitle: "Estrogen Rising",
    hormoneNote:
      "Rising estrogen improves insulin sensitivity and supports energy and motivation — lean on complex carbs and lean protein to ride the wave.",
    nutritionFocus: [
      "Complex carbohydrates",
      "Lean protein",
      "Healthy fats",
      "Micronutrient-rich foods",
    ],
    benefits: ["Stable energy", "Better workouts", "Faster recovery", "Balanced mood"],
    nutrients: [
      {
        icon: "protein",
        name: "Protein",
        why: "Builds and repairs muscles, supports hormones and enzymes.",
        sources: ["Eggs", "Chicken", "Greek yogurt", "Lentils", "Tofu"],
      },
      {
        icon: "iron",
        name: "Iron",
        why: "Supports oxygen transport and helps reduce fatigue.",
        sources: ["Spinach", "Red meat", "Lentils", "Pumpkin seeds", "Quinoa"],
      },
      {
        icon: "omega3",
        name: "Omega-3",
        why: "Supports brain function and hormone balance.",
        sources: ["Salmon", "Sardines", "Chia seeds", "Walnuts", "Flaxseeds"],
      },
      {
        icon: "magnesium",
        name: "Magnesium",
        why: "Helps muscles relax, supports energy and reduces stress.",
        sources: ["Avocado", "Almonds", "Dark chocolate", "Bananas", "Spinach"],
      },
    ],
    plate: {
      carbs: 40,
      protein: 30,
      complexCarbs: 20,
      fats: 10,
      note: "A balanced plate to support your rising phase.",
    },
    limit: [
      { icon: "candy", title: "Processed Sugar", note: "May cause energy crashes and mood swings" },
      {
        icon: "flame",
        title: "Fried & Heavy Foods",
        note: "Can be harder to digest and slow you down",
      },
      { icon: "wine", title: "Alcohol", note: "May affect sleep quality and hydration" },
      {
        icon: "coffee",
        title: "Excess Caffeine",
        note: "Can increase stress and affect energy later",
      },
    ],
    didYouKnow:
      "Rising estrogen can improve insulin sensitivity, which is one reason you may handle carbohydrates better during the follicular phase.",
    movement: [
      { icon: "dumbbell", title: "Strength Training", note: "Build and tone" },
      { icon: "activity", title: "Cardio Workouts", note: "Boost stamina" },
      { icon: "flower", title: "Yoga Flow or Pilates", note: "Enhance flexibility" },
    ],
    lifestyle: LIFESTYLE_BASE,
  },
  ovulatory: {
    phase: "ovulatory",
    label: PHASE_INFO.ovulatory.label,
    dayRange: PHASE_DAY_RANGE.ovulatory,
    heroImage: "/images/hero-girl.webp",
    accent: "oklch(0.62 0.24 12)",
    tagline: "You're at your brightest — shine, connect and enjoy how good you feel.",
    bodyToday:
      "Estrogen peaks and testosterone gives a short, powerful boost — you feel social, magnetic and strong. Your metabolism runs a little hotter, so fibre and antioxidant-rich veg help your body clear excess estrogen and keep your glow steady.",
    meters: { energy: 95, mood: 88, focus: 82, recovery: 55 },
    glance: [
      "Peak energy",
      "Radiant skin",
      "Strongest workouts",
      "Social confidence",
      "Sharp communication",
      "Natural glow",
    ],
    hormoneTitle: "Estrogen at its Peak",
    hormoneNote:
      "Estrogen peaks with a testosterone boost — fibre and cruciferous veg help your liver metabolise the extra estrogen so you feel bright, not bloated.",
    nutritionFocus: [
      "Fibre-rich vegetables",
      "Antioxidants",
      "Light lean protein",
      "Hydrating foods",
    ],
    benefits: ["Radiant skin", "Peak performance", "Balanced hormones", "Bright mood"],
    nutrients: [
      {
        icon: "fibre",
        name: "Fibre",
        why: "Helps your body clear excess estrogen and supports digestion.",
        sources: ["Broccoli", "Cauliflower", "Berries", "Chickpeas", "Flaxseeds"],
      },
      {
        icon: "antioxidants",
        name: "Antioxidants",
        why: "Protect your skin's glow and fight oxidative stress.",
        sources: ["Berries", "Leafy greens", "Citrus", "Bell pepper", "Tomatoes"],
      },
      {
        icon: "bvitamins",
        name: "Folate & B6",
        why: "Support energy and healthy hormone metabolism.",
        sources: ["Leafy greens", "Avocado", "Eggs", "Chickpeas", "Bananas"],
      },
      {
        icon: "magnesium",
        name: "Magnesium",
        why: "Supports recovery and keeps energy steady at your peak.",
        sources: ["Almonds", "Dark chocolate", "Spinach", "Quinoa", "Pumpkin seeds"],
      },
    ],
    plate: {
      carbs: 30,
      protein: 30,
      complexCarbs: 25,
      fats: 15,
      note: "Fresh, fibrous and antioxidant-rich to match your glow.",
    },
    limit: [
      { icon: "candy", title: "Processed Soy", note: "May interfere with estrogen at its peak" },
      { icon: "wine", title: "Excess Alcohol", note: "Adds to the liver's estrogen-clearing load" },
      { icon: "flame", title: "Fried Foods", note: "Can dull skin and slow digestion" },
      { icon: "coffee", title: "Excess Caffeine", note: "Can tip peak energy into jitters" },
    ],
    didYouKnow:
      "During ovulation your body temperature rises about 0.3–0.5°C and a short testosterone surge makes this the strongest window of your whole cycle.",
    movement: [
      { icon: "dumbbell", title: "High-Intensity", note: "Your strongest lifting window" },
      { icon: "activity", title: "HIIT & Sprints", note: "Peak power and stamina" },
      { icon: "flower", title: "Dance or Group Class", note: "Channel your social spark" },
    ],
    lifestyle: LIFESTYLE_BASE,
  },
  luteal: {
    phase: "luteal",
    label: PHASE_INFO.luteal.label,
    dayRange: PHASE_DAY_RANGE.luteal,
    heroImage: "/images/landing-cycle-personalized.webp",
    accent: "oklch(0.55 0.2 320)",
    tagline: "Cravings and big feelings are normal now — comfort yourself, kindly.",
    bodyToday:
      "Progesterone rises and your metabolism speeds up, so appetite and cravings grow — that's biology, not a lack of willpower. Complex carbs and magnesium steady your blood sugar and calm PMS, while warm, comforting food keeps you satisfied.",
    meters: { energy: 50, mood: 48, focus: 55, recovery: 65 },
    glance: [
      "Calmer cravings",
      "Steadier blood sugar",
      "Softer PMS",
      "Better sleep",
      "Comfort without the crash",
      "Gentler mood",
    ],
    hormoneTitle: "Progesterone Rising",
    hormoneNote:
      "Progesterone climbs and metabolism speeds up, raising appetite — complex carbs and magnesium keep blood sugar steady and ease PMS.",
    nutritionFocus: [
      "Complex carbohydrates",
      "Magnesium-rich foods",
      "Comforting warm meals",
      "Omega-3 fats",
    ],
    benefits: ["Fewer cravings", "Calmer mood", "Better sleep", "Less bloating"],
    nutrients: [
      {
        icon: "magnesium",
        name: "Magnesium",
        why: "Eases PMS, cramps and irritability and supports sleep.",
        sources: ["Dark chocolate", "Walnuts", "Spinach", "Bananas", "Almonds"],
      },
      {
        icon: "protein",
        name: "Complex Carbs",
        why: "Steady blood sugar to calm cravings and stabilise mood.",
        sources: ["Sweet potato", "Oats", "Quinoa", "Brown rice", "Squash"],
      },
      {
        icon: "omega3",
        name: "Omega-3",
        why: "Reduces inflammation and softens mood swings.",
        sources: ["Salmon", "Walnuts", "Chia seeds", "Flaxseeds", "Sardines"],
      },
      {
        icon: "calcium",
        name: "Calcium",
        why: "Shown to reduce PMS symptoms and support mood.",
        sources: ["Yogurt", "Leafy greens", "Almonds", "Tofu", "Sardines"],
      },
    ],
    plate: {
      carbs: 45,
      protein: 25,
      complexCarbs: 20,
      fats: 10,
      note: "Warm, satisfying complex carbs to soothe cravings.",
    },
    limit: [
      { icon: "candy", title: "Refined Carbs", note: "Spike then crash blood sugar and cravings" },
      { icon: "coffee", title: "Caffeine", note: "Can heighten anxiety and disturb sleep" },
      { icon: "wine", title: "Alcohol", note: "Worsens PMS and mood swings" },
      { icon: "flame", title: "Excess Salt", note: "Adds to bloating and water retention" },
    ],
    didYouKnow:
      "Your body burns roughly 100–300 extra calories a day in the luteal phase — so those hunger signals are real, not a lack of willpower.",
    movement: [
      { icon: "flower", title: "Yoga & Pilates", note: "Calms the nervous system" },
      { icon: "footprints", title: "Walking & Hiking", note: "Steady, mood-lifting movement" },
      { icon: "dumbbell", title: "Light Strength", note: "Gentle tone without over-taxing" },
    ],
    lifestyle: LIFESTYLE_BASE,
  },
};

/** The content for a phase (safe fallback to follicular). */
export function cycleNutritionFor(phase: DietPhase): CycleNutritionContent {
  return CYCLE_NUTRITION[phase] ?? CYCLE_NUTRITION.follicular;
}
