import { Dumbbell, Apple, UtensilsCrossed, Flower, CalendarHeart, BookHeart, Notebook, Wallet, Heart, Salad, Activity, CircleDot } from "lucide-react";
import { phaseForDay, DEFAULT_CYCLE_SETTINGS, type CyclePhase } from "../cyclePhase";
import type { CycleSettings } from "../PeriodSetup";
import { PHASE_META } from "../CycleTracker";
import { TOOLS } from "../tools";

export const ONBOARDING_KEY = "bloomzein_onboarding";

export type OnboardingPhase = "menstrual" | "follicular" | "ovulatory" | "luteal";

/** Maps the app's 5-value cycle phase onto the onboarding doc's simpler 4-phase model. */
export function appPhaseToOnboarding(p: CyclePhase): OnboardingPhase {
  switch (p) {
    case "period": return "menstrual";
    case "follicular": return "follicular";
    case "fertile":
    case "ovulation": return "ovulatory";
    case "luteal": return "luteal";
    default: return "follicular";
  }
}

/** Reuses the Cycle Tracker's phase pill styling for the onboarding's phase preview/badges. */
export function onboardingPhaseMeta(phase: OnboardingPhase) {
  const appKey: Exclude<CyclePhase, "any"> = phase === "menstrual" ? "period" : phase === "ovulatory" ? "ovulation" : phase;
  return PHASE_META[appKey];
}

export const PHASE_COPY: Record<OnboardingPhase, { label: string; description: string }> = {
  menstrual: { label: "Menstrual phase", description: "Your body is renewing. Rest and nourish." },
  follicular: { label: "Follicular phase", description: "Energy is rising. A great time to start." },
  ovulatory: { label: "Ovulatory phase", description: "Your peak energy. You're at your best." },
  luteal: { label: "Luteal phase", description: "Natural slowdown. Listen to your body." },
};

/** 1-indexed day position within the cycle for a given date. */
export function dayInCycle(lastPeriodStart: Date, cycleLength: number, date = new Date()): number {
  const ms = 1000 * 60 * 60 * 24;
  const diff = Math.floor((date.getTime() - lastPeriodStart.getTime()) / ms);
  return (((diff % cycleLength) + cycleLength) % cycleLength) + 1;
}

export interface PhasePreview {
  phase: OnboardingPhase;
  appPhase: Exclude<CyclePhase, "any">;
  day: number;
}

/** Live phase preview shown on Screen 2 as soon as a last-period date is entered. */
export function calcPhasePreview(lastPeriod: string, cycleLength: number, periodDuration: number): PhasePreview {
  const settings: CycleSettings = {
    ...DEFAULT_CYCLE_SETTINGS,
    lastPeriodStart: new Date(lastPeriod),
    cycleLength,
    periodLength: periodDuration,
  };
  const appPhase = phaseForDay(new Date(), settings);
  return { phase: appPhaseToOnboarding(appPhase), appPhase, day: dayInCycle(settings.lastPeriodStart, cycleLength) };
}

export type GoalKey = "yoga" | "diet" | "workout" | "all";

export const GOALS: { key: GoalKey; title: string; subtitle: string; icon: typeof Heart; toolSlug: string; image: string; cta: string }[] = [
  { key: "yoga", title: "Feel better in my body", subtitle: "Yoga and wellness sessions adapted to your phase", icon: Heart, toolSlug: "yoga", image: "/images/landing-card-life.webp", cta: "Discover" },
  { key: "diet", title: "Eat better", subtitle: "Nutrition and meals planned around your cycle", icon: Salad, toolSlug: "diet", image: "/images/landing-card-body.webp", cta: "Get my plan" },
  { key: "workout", title: "Move more", subtitle: "Workout programs matched to your energy level", icon: Activity, toolSlug: "workout", image: "/images/landing-card-mind.webp", cta: "Get my plan" },
  { key: "all", title: "Sync everything", subtitle: "See how all your tools connect around your cycle", icon: CircleDot, toolSlug: "diary", image: "/images/landing-glass-heart.webp", cta: "Discover" },
];

/** Onboarding's 8 orbit/home tools, mapped onto the app's actual TOOLS slugs. */
export const ONBOARDING_TOOLS: { key: string; slug: string; icon: typeof Dumbbell }[] = [
  { key: "workout", slug: "workout", icon: Dumbbell },
  { key: "diet", slug: "diet", icon: Apple },
  { key: "meals", slug: "meals", icon: UtensilsCrossed },
  { key: "yoga", slug: "yoga", icon: Flower },
  { key: "calendar", slug: "cycle", icon: CalendarHeart },
  { key: "diaries", slug: "diary", icon: BookHeart },
  { key: "reminders", slug: "notes", icon: Notebook },
  { key: "budget", slug: "budget", icon: Wallet },
];

export function toolLabel(slug: string): string {
  return TOOLS.find((t) => t.slug === slug)?.label ?? slug;
}

export function toolHref(slug: string): string {
  return slug === "budget" ? "/budget" : `/app/tools/${slug}`;
}

export const TEASERS: Record<string, Record<OnboardingPhase, string>> = {
  workout: {
    menstrual: "A gentle recovery session is waiting for you today",
    follicular: "3 energy sessions are ready for your week",
    ovulatory: "Your peak — an intense session is waiting",
    luteal: "Mobility and recovery focus this week",
  },
  diet: {
    menstrual: "Iron and magnesium — exactly what you need right now",
    follicular: "Protein and antioxidants to fuel your rising energy",
    ovulatory: "Raw foods and fibre — perfect for your phase",
    luteal: "Complex carbs and omega-3 for comfort and balance",
  },
  meals: {
    menstrual: "7 nourishing and gentle meals already planned for you",
    follicular: "7 light protein-rich meals ready for the week",
    ovulatory: "Fresh and colourful recipes are waiting for you",
    luteal: "Comforting meals adapted to your phase this week",
  },
  yoga: {
    menstrual: "A restorative 20-min flow for today",
    follicular: "An energising flow to match your momentum",
    ovulatory: "A dynamic session at your peak fitness level",
    luteal: "Deep stretching and release — 25 minutes",
  },
  calendar: {
    menstrual: "Your cycle is mapped — plan your week around it",
    follicular: "Your sessions are ready to schedule this week",
    ovulatory: "Your most productive week — organise it well",
    luteal: "Visualise your week and adjust your rhythm",
  },
  diaries: {
    menstrual: "Note how you feel today — just 30 seconds",
    follicular: "How are you feeling in this new energy?",
    ovulatory: "Capture this moment of vitality in your journal",
    luteal: "Listen to what your body is telling you today",
  },
  reminders: {
    menstrual: "Set your evening iron and magnesium reminder",
    follicular: "Session reminders to keep your momentum going",
    ovulatory: "Stay in your flow with well-timed reminders",
    luteal: "An evening herbal tea reminder — just for you",
  },
  budget: {
    menstrual: "Estimate your grocery budget for this week",
    follicular: "Your meal plan is ready — calculate your budget",
    ovulatory: "Optimise your weekly grocery run",
    luteal: "Comfort food within budget — absolutely possible",
  },
};

export interface OnboardingCycleData {
  lastPeriod: string | null;
  cycleLength: number;
  periodDuration: number;
}

export interface OnboardingState {
  complete: boolean;
  cycleData: OnboardingCycleData;
  goal: GoalKey | null;
  phase: OnboardingPhase | null;
}

export function readOnboardingState(): OnboardingState | null {
  try {
    const raw = localStorage.getItem(ONBOARDING_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function writeOnboardingState(state: OnboardingState): void {
  try {
    localStorage.setItem(ONBOARDING_KEY, JSON.stringify(state));
  } catch {}
}

// ── Post-goal-selection "seduction layer" content ──────────────────────
// Splits "Name · 20 min · Tag" style strings into their pieces for rendering.
export function splitPipe(s: string): string[] {
  return s.split(" · ").map((p) => p.trim());
}

// CHOICE 1 — Yoga experience
export const YOGA_CONTENT: Record<OnboardingPhase, { headline: string; session: string; week: string[] }> = {
  menstrual: {
    headline: "Rest is powerful. Your body is doing deep work.",
    session: "Restorative Yin Flow · 20 min · Recover",
    week: ["Today: Yin Flow", "Day+2: Gentle Stretch", "Day+4: Hip Release"],
  },
  follicular: {
    headline: "Energy is rising. This is your fresh start.",
    session: "Morning Energy Flow · 25 min · Energise",
    week: ["Today: Energy Flow", "Day+2: Core Awakening", "Day+4: Sun Flow"],
  },
  ovulatory: {
    headline: "You're at your most radiant. Move like you mean it.",
    session: "Full Body Power Flow · 30 min · Ignite",
    week: ["Today: Power Flow", "Day+2: Strength Flow", "Day+4: Balance Flow"],
  },
  luteal: {
    headline: "Your body is asking to slow down. Listen to it.",
    session: "Deep Mobility Flow · 25 min · Restore",
    week: ["Today: Mobility Flow", "Day+2: Breathwork", "Day+4: Yin Restore"],
  },
};

// CHOICE 2 — Diet experience
export const DIET_CONTENT: Record<OnboardingPhase, { insight: string; breakfast: string; lunch: string; dinner: string }> = {
  menstrual: {
    insight: "Iron, magnesium, and warmth — your body needs to be nourished gently.",
    breakfast: "Warm oat bowl with dates and almond butter · 10 min · High iron",
    lunch: "Lentil soup with spinach and ginger · 20 min · Anti-inflammatory",
    dinner: "Salmon with roasted sweet potato · 25 min · Omega-3 rich",
  },
  follicular: {
    insight: "Protein and antioxidants fuel your rising energy.",
    breakfast: "Greek yoghurt with berries and flaxseeds · 5 min · Probiotic",
    lunch: "Quinoa tabbouleh with avocado · 15 min · High protein",
    dinner: "Grilled chicken with broccoli and lemon · 20 min · Antioxidant",
  },
  ovulatory: {
    insight: "Fibre, raw foods, and cruciferous vegetables support your peak phase.",
    breakfast: "Green smoothie bowl with seeds · 10 min · High fibre",
    lunch: "Rainbow salad with chickpeas and tahini · 10 min · Plant protein",
    dinner: "Baked salmon with raw slaw and quinoa · 25 min · Omega-3",
  },
  luteal: {
    insight: "Complex carbs, dark chocolate, and comfort — all allowed.",
    breakfast: "Banana oat pancakes with dark chocolate · 15 min · Mood support",
    lunch: "Sweet potato and black bean bowl · 20 min · Complex carbs",
    dinner: "Walnut pasta with sage and parmesan · 25 min · Omega-3 comfort",
  },
};

const PROTEIN_MULTIPLIER: Record<OnboardingPhase, number> = {
  menstrual: 1.0,
  follicular: 1.2,
  ovulatory: 1.3,
  luteal: 1.1,
};

/** Today's protein target in grams, from her weight (Me page, default 60kg) × phase multiplier. */
export function proteinTarget(phase: OnboardingPhase, weight?: number | null, unit?: "kg" | "lbs" | null): number {
  let kg = weight ?? 60;
  if (unit === "lbs" && weight) kg = weight * 0.4536;
  return Math.round(kg * PROTEIN_MULTIPLIER[phase]);
}

// CHOICE 3 — Movement experience
export const MOVEMENT_CONTENT: Record<OnboardingPhase, { workout: string; zones: string; yoga: string; meal: string }> = {
  menstrual: {
    workout: "Gentle Recovery · 20 min · Rest day movement",
    zones: "Lower back and hips glowing on map",
    yoga: "Hip Release Flow · 20 min · Restorative",
    meal: "Warm lentil bowl · 15 min · 22g protein · Iron rich",
  },
  follicular: {
    workout: "Glutes Tonify · 25 min · Building momentum",
    zones: "Glutes and core glowing",
    yoga: "Morning Energise Flow · 25 min · Vinyasa",
    meal: "Egg and avocado toast · 10 min · 28g protein",
  },
  ovulatory: {
    workout: "Glutes Strengthen · 30 min · Peak intensity",
    zones: "Full lower body glowing",
    yoga: "Power Flow · 30 min · Dynamic",
    meal: "Grilled chicken bowl · 15 min · 35g protein",
  },
  luteal: {
    workout: "Core Mobility · 25 min · Moderate",
    zones: "Abs and back softly glowing",
    yoga: "Deep Stretch · 25 min · Yin",
    meal: "Salmon and sweet potato · 20 min · 30g protein · Omega-3",
  },
};

// CHOICE 4 — Sync everything experience
export const GRATITUDE_PROMPTS: Record<OnboardingPhase, string> = {
  menstrual: "What gave you comfort today?",
  follicular: "What are you excited about right now?",
  ovulatory: "Who or what made you feel alive today?",
  luteal: "What did you do gently for yourself today?",
};

export const WEEKLY_SUMMARY: Record<OnboardingPhase, string> = {
  menstrual: "2 gentle sessions · 7 nourishing meals · 3 yin flows",
  follicular: "3 building sessions · 7 protein meals · 3 energy flows",
  ovulatory: "4 intense sessions · 7 peak meals · 2 power flows",
  luteal: "2 moderate sessions · 7 comfort meals · 3 deep stretches",
};

// ── Phase-matched imagery for the reveal cards — "images talk" ─────────
export const YOGA_IMAGES: Record<OnboardingPhase, { hero: string; week: string[] }> = {
  menstrual: {
    hero: "/images/pose-childs-pose.webp",
    week: ["/images/pose-childs-pose.webp", "/images/pose-cat-cow.webp", "/images/pose-pigeon.webp"],
  },
  follicular: {
    hero: "/images/pose-warrior-1.webp",
    week: ["/images/pose-warrior-1.webp", "/images/pose-boat.webp", "/images/pose-mountain.webp"],
  },
  ovulatory: {
    hero: "/images/pose-warrior-2.webp",
    week: ["/images/pose-warrior-2.webp", "/images/pose-plank.webp", "/images/pose-tree.webp"],
  },
  luteal: {
    hero: "/images/pose-pigeon.webp",
    week: ["/images/pose-pigeon.webp", "/images/pose-easy-seat.webp", "/images/pose-legs-up-wall.webp"],
  },
};

export const DIET_IMAGES: Record<OnboardingPhase, { breakfast: string; lunch: string; dinner: string }> = {
  menstrual: { breakfast: "/images/meal-oats.webp", lunch: "/images/meal-stew.webp", dinner: "/images/meal-buddha.webp" },
  follicular: { breakfast: "/images/meal-lunchbox.webp", lunch: "/images/meal-buddha.webp", dinner: "/images/meal-stew.webp" },
  ovulatory: { breakfast: "/images/meal-oats.webp", lunch: "/images/meal-buddha.webp", dinner: "/images/meal-stew.webp" },
  luteal: { breakfast: "/images/meal-oats.webp", lunch: "/images/meal-lunchbox.webp", dinner: "/images/meal-stew.webp" },
};

export const MOVEMENT_IMAGES: Record<OnboardingPhase, { workout: string; yoga: string; meal: string }> = {
  menstrual: { workout: "/images/zone-back.webp", yoga: "/images/pose-pigeon.webp", meal: "/images/meal-stew.webp" },
  follicular: { workout: "/images/zone-glutes.webp", yoga: "/images/pose-warrior-1.webp", meal: "/images/meal-lunchbox.webp" },
  ovulatory: { workout: "/images/zone-legs.webp", yoga: "/images/pose-warrior-2.webp", meal: "/images/meal-buddha.webp" },
  luteal: { workout: "/images/zone-core.webp", yoga: "/images/pose-seated-twist.webp", meal: "/images/meal-stew.webp" },
};

export const SYNC_IMAGES: Record<OnboardingPhase, { anchor: string; yoga: string; workout: string; meal: string; weekly: string }> = {
  menstrual: {
    anchor: "/images/cycle-insight-hero.webp",
    yoga: "/images/pose-childs-pose.webp",
    workout: "/images/zone-back.webp",
    meal: "/images/meal-stew.webp",
    weekly: "/images/cycle-journal-hero.webp",
  },
  follicular: {
    anchor: "/images/cycle-insight-hero.webp",
    yoga: "/images/pose-warrior-1.webp",
    workout: "/images/zone-glutes.webp",
    meal: "/images/meal-lunchbox.webp",
    weekly: "/images/cycle-journal-hero.webp",
  },
  ovulatory: {
    anchor: "/images/cycle-insight-hero.webp",
    yoga: "/images/pose-warrior-2.webp",
    workout: "/images/zone-legs.webp",
    meal: "/images/meal-buddha.webp",
    weekly: "/images/cycle-journal-hero.webp",
  },
  luteal: {
    anchor: "/images/cycle-insight-hero.webp",
    yoga: "/images/pose-seated-twist.webp",
    workout: "/images/zone-core.webp",
    meal: "/images/meal-stew.webp",
    weekly: "/images/cycle-journal-hero.webp",
  },
};

/** Silently saves a first gratitude line into the Bloom Diary, seeding it for her. */
export function saveOnboardingGratitude(text: string): void {
  const trimmed = text.trim();
  if (!trimmed) return;
  try {
    const raw = localStorage.getItem("bloom:diary");
    const entries = raw ? JSON.parse(raw) : [];
    entries.unshift({
      id: `onboarding-${Date.now()}`,
      date: new Date().toISOString().slice(0, 10),
      mood: "calm",
      title: "",
      html: `<p>${trimmed.replace(/</g, "&lt;")}</p>`,
      theme: "sakura",
      font: "quicksand",
      createdAt: new Date().toISOString(),
    });
    localStorage.setItem("bloom:diary", JSON.stringify(entries));
    window.dispatchEvent(new Event("bloom:diary-updated"));
  } catch {}
}
