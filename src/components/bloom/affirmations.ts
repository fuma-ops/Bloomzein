import { phaseForDay, readCycleSettings, type CyclePhase } from "./cyclePhase";

/**
 * Phase-tuned daily affirmations — ONE source of truth shared by the Today page
 * (which owns the rotation index) and any other surface that wants to echo the
 * same line (e.g. the Tools page). Never fork this list.
 */
export const AFFIRMATIONS: Record<Exclude<CyclePhase, "any">, string[]> = {
  period:     ["Rest is a radical act of self-love.", "Your body is working hard. Let it.", "Softness is strength."],
  follicular: ["I choose myself, every single day.", "Fresh starts live inside of me.", "What I begin today, I will grow."],
  fertile:    ["I am magnetic. I draw what I need.", "My energy is a gift I share wisely.", "I bloom in my own time, beautifully."],
  ovulation:  ["I am radiant — the world feels it.", "My body is wise, and I trust its rhythm.", "Every phase of my cycle has its gift."],
  luteal:     ["I am allowed to rest without earning it.", "Being tender is a soft kind of strength.", "I move at my own gentle pace."],
};

/** localStorage key holding the Today page's current affirmation index. */
export const AFFIRM_IDX_KEY = "bloom:today-affirm-idx";

/** The exact affirmation the Today page is showing right now (same phase + index). */
export function readTodayAffirmation(): string {
  const phase = phaseForDay(new Date(), readCycleSettings());
  const pool = AFFIRMATIONS[phase];
  let idx = 0;
  try { idx = Number(localStorage.getItem(AFFIRM_IDX_KEY)) || 0; } catch {}
  return pool[((idx % pool.length) + pool.length) % pool.length];
}
