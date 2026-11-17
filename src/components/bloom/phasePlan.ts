// =============================================================================
// BLOOM & ZEIN — SHARED PHASE PLAN (single source of truth)
// -----------------------------------------------------------------------------
// One canonical per-phase day plan — yoga flow, workout, meal and a journaling
// prompt — used by BOTH the Today page and the Cycle Tracker so they always
// show the same recommendations. Mirrors the cyclePhase.ts pattern.
//
// Each activity also carries a "launch" payload so a tap can deep-link straight
// into the specific flow / session (not just the tool's home): the source
// writes the launch key to localStorage, the target tool reads it on mount.
// =============================================================================
import { tr } from "@/i18n";

import type { CyclePhase } from "./cyclePhase";

export const LAUNCH_YOGA_KEY    = "bloom:launch-yoga";
export const LAUNCH_WORKOUT_KEY = "bloom:launch-workout";
export const LAUNCH_MEAL_KEY    = "bloom:launch-meal";   // value = recipe id to open
export const DIARY_PROMPT_KEY   = "bloom:diary-prompt";

export type YogaLaunch    = { intention: string; durationMin: number };
export type WorkoutLaunch = { zone: string; intention: string };

export interface Activity { title: string; blurb: string; image: string; time: string; }

export interface PhasePlan {
  yoga:    Activity & { launch: YogaLaunch };
  workout: Activity & { launch: WorkoutLaunch };
  meal:    Activity;
  journal: { time: string; prompt: string };
}

export const PHASE_PLAN: Record<Exclude<CyclePhase, "any">, PhasePlan> = {
  period: {
    yoga:    { title: tr("Restorative Flow"), blurb: tr("Ease cramps with gentle supported poses"), image: "/images/pose-childs-pose.webp", time: "18:00", launch: { intention: "stress", durationMin: 20 } },
    workout: { title: tr("Gentle mobility"),  blurb: tr("Light, easy movement — no pressure"),      image: "/images/workout-morning-mobility-routine.webp", time: "16:00", launch: { zone: "core", intention: "recover" } },
    meal:    { title: tr("Iron-rich bowl"),   blurb: tr("Replenish iron and comfort your body"),    image: "/images/meal-stew.webp",         time: "12:30" },
    journal: { time: "21:00", prompt: tr("What is my body asking me for today?") },
  },
  follicular: {
    yoga:    { title: tr("Energizing Flow"),   blurb: tr("Build heat as your energy rises"),        image: "/images/pose-warrior-2.webp",      time: "08:00", launch: { intention: "morning", durationMin: 20 } },
    workout: { title: tr("Strength training"), blurb: tr("Channel rising strength into progress"),  image: "/images/workout-hero-session.webp", time: "17:30", launch: { zone: "full-body", intention: "strengthen" } },
    meal:    { title: tr("Fresh, light lunch"),blurb: tr("Fuel your comeback energy naturally"),    image: "/images/meal-buddha.webp",          time: "13:00" },
    journal: { time: "21:00", prompt: tr("What new thing do I want to begin this cycle?") },
  },
  fertile: {
    yoga:    { title: tr("Balance & Strength Flow"), blurb: tr("Channel magnetic energy into balance"), image: "/images/pose-tree.webp",              time: "08:00", launch: { intention: "strength", durationMin: 20 } },
    workout: { title: tr("Cardio burst"),            blurb: tr("You're at peak power — push it"),       image: "/images/workout-hero-bestshape.webp", time: "17:30", launch: { zone: "full-body", intention: "tonify" } },
    meal:    { title: tr("Antioxidant bowl"),        blurb: tr("Support your body at peak phase"),      image: "/images/meal-lunchbox.webp",           time: "13:00" },
    journal: { time: "21:00", prompt: tr("Where do I feel most magnetic and alive right now?") },
  },
  ovulation: {
    yoga:    { title: tr("Power Flow"),             blurb: tr("Open and strong — your best flow"),   image: "/images/pose-triangle.webp",       time: "08:00", launch: { intention: "strength", durationMin: 20 } },
    workout: { title: tr("High-intensity session"), blurb: tr("Make the most of your peak energy"),  image: "/images/workout-hero-program.webp", time: "17:30", launch: { zone: "full-body", intention: "strengthen" } },
    meal:    { title: tr("Protein-rich lunch"),     blurb: tr("Fuel and replenish at your peak"),    image: "/images/meal-buddha.webp",          time: "13:00" },
    journal: { time: "21:00", prompt: tr("What am I genuinely proud of about myself today?") },
  },
  luteal: {
    yoga:    { title: tr("Calming Flow"), blurb: tr("Grounding poses for mind and body"),        image: "/images/pose-legs-up-wall.webp", time: "18:00", launch: { intention: "sleep", durationMin: 20 } },
    workout: { title: tr("Light toning"), blurb: tr("Soft, steady toning — honour the fatigue"),  image: "/images/workout-hero-discover.webp", time: "16:30", launch: { zone: "back", intention: "tonify" } },
    meal:    { title: tr("Magnesium-rich meal"), blurb: tr("Ease mood dips and cravings gently"), image: "/images/meal-oats.webp",          time: "12:30" },
    journal: { time: "21:00", prompt: tr("What boundary do I need to honour today?") },
  },
};

/** Write a launch payload for a target tool to pick up on its next mount. */
export function writeLaunch(key: string, val: unknown) {
  try { localStorage.setItem(key, JSON.stringify(val)); } catch {}
}

/** Read & consume (clear) a launch payload. Returns null if none. */
export function readLaunch<T>(key: string): T | null {
  try {
    const v = localStorage.getItem(key);
    if (v) { localStorage.removeItem(key); return JSON.parse(v) as T; }
  } catch {}
  return null;
}
