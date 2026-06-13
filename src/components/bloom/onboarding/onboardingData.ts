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

export const GOALS: { key: GoalKey; title: string; subtitle: string; icon: typeof Heart; toolSlug: string }[] = [
  { key: "yoga", title: "Feel better in my body", subtitle: "Yoga and wellness sessions adapted to your phase", icon: Heart, toolSlug: "yoga" },
  { key: "diet", title: "Eat better", subtitle: "Nutrition and meals planned around your cycle", icon: Salad, toolSlug: "diet" },
  { key: "workout", title: "Move more", subtitle: "Workout programs matched to your energy level", icon: Activity, toolSlug: "workout" },
  { key: "all", title: "Sync everything", subtitle: "See how all your tools connect around your cycle", icon: CircleDot, toolSlug: "cycle" },
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
