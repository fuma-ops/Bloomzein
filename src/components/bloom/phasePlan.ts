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
    yoga:    { title: "Restorative Flow", blurb: "Ease cramps with gentle supported poses", image: "/images/pose-childs-pose.webp", time: "18:00", launch: { intention: "stress", durationMin: 20 } },
    workout: { title: "Gentle mobility",  blurb: "Light, easy movement — no pressure",      image: "/images/zone-core.png",         time: "16:00", launch: { zone: "core", intention: "recover" } },
    meal:    { title: "Iron-rich bowl",   blurb: "Replenish iron and comfort your body",    image: "/images/meal-stew.jpg",         time: "12:30" },
    journal: { time: "21:00", prompt: "What is my body asking me for today?" },
  },
  follicular: {
    yoga:    { title: "Energizing Flow",   blurb: "Build heat as your energy rises",        image: "/images/pose-warrior-2.webp",      time: "08:00", launch: { intention: "morning", durationMin: 20 } },
    workout: { title: "Strength training", blurb: "Channel rising strength into progress",  image: "/images/workout-hero-session.png", time: "17:30", launch: { zone: "full-body", intention: "strengthen" } },
    meal:    { title: "Fresh, light lunch",blurb: "Fuel your comeback energy naturally",    image: "/images/meal-buddha.jpg",          time: "13:00" },
    journal: { time: "21:00", prompt: "What new thing do I want to begin this cycle?" },
  },
  fertile: {
    yoga:    { title: "Balance & Strength Flow", blurb: "Channel magnetic energy into balance", image: "/images/pose-tree.webp",              time: "08:00", launch: { intention: "strength", durationMin: 20 } },
    workout: { title: "Cardio burst",            blurb: "You're at peak power — push it",       image: "/images/workout-hero-bestshape.webp", time: "17:30", launch: { zone: "full-body", intention: "tonify" } },
    meal:    { title: "Antioxidant bowl",        blurb: "Support your body at peak phase",      image: "/images/meal-lunchbox.jpg",           time: "13:00" },
    journal: { time: "21:00", prompt: "Where do I feel most magnetic and alive right now?" },
  },
  ovulation: {
    yoga:    { title: "Power Flow",             blurb: "Open and strong — your best flow",   image: "/images/pose-triangle.webp",       time: "08:00", launch: { intention: "strength", durationMin: 20 } },
    workout: { title: "High-intensity session", blurb: "Make the most of your peak energy",  image: "/images/workout-hero-program.png", time: "17:30", launch: { zone: "full-body", intention: "strengthen" } },
    meal:    { title: "Protein-rich lunch",     blurb: "Fuel and replenish at your peak",    image: "/images/meal-buddha.jpg",          time: "13:00" },
    journal: { time: "21:00", prompt: "What am I genuinely proud of about myself today?" },
  },
  luteal: {
    yoga:    { title: "Calming Flow", blurb: "Grounding poses for mind and body",        image: "/images/pose-legs-up-wall.webp", time: "18:00", launch: { intention: "sleep", durationMin: 20 } },
    workout: { title: "Light toning", blurb: "Soft, steady toning — honour the fatigue",  image: "/images/zone-back.png",          time: "16:30", launch: { zone: "back", intention: "tonify" } },
    meal:    { title: "Magnesium-rich meal", blurb: "Ease mood dips and cravings gently", image: "/images/meal-oats.jpg",          time: "12:30" },
    journal: { time: "21:00", prompt: "What boundary do I need to honour today?" },
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
