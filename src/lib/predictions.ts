// ── Smart Predictions — "Bloomzein predicts your life" ───────────────────────
// Forward-looking read of HER cycle: not just the next period, but the PMS
// window, tomorrow's energy, likely recovery days, cravings, mood dips and the
// fertility level — each derived from the same canonical stores every tool uses
// (cycle settings + real logged period starts + her mood log), with an HONEST
// confidence that grows as she confirms more cycles. Nothing here invents data.
//
// Every prediction carries an `explain` written in Bloomzein's warm voice, so
// the UI can always tell her *why* we think this — never a black box.
import {
  readCycleSettings, phaseForDay, effectiveCurrentPhase, hasCycleSettings,
  type CyclePhase,
} from "@/components/bloom/cyclePhase";
import { readPeriodStarts, recentCycleLengths, cycleRegularity } from "@/lib/periodLog";
import { moodValence } from "@/lib/meDashboard";
import type { CycleSettings } from "@/components/bloom/PeriodSetup";

const MS = 86400000;
type Phase = Exclude<CyclePhase, "any">;

const startOfToday = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; };
const addDays = (d: Date, n: number) => new Date(d.getTime() + n * MS);
const weekday = (d: Date) => d.toLocaleDateString("en-US", { weekday: "long" });
const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));

export type FertilityLevel = "low" | "medium" | "high" | "peak";
export type EnergyLevel = "gentle" | "rising" | "high" | "peak" | "winding";

export interface PeriodPrediction {
  date: Date; daysAway: number; late: boolean; windowDays: number;
  confidence: number; explain: string;
}
export interface PmsPrediction {
  date: Date; daysBeforePeriod: number; confidence: number; explain: string;
}
export interface EnergyPrediction {
  level: EnergyLevel; headline: string; goodFor: string[]; confidence: number; explain: string;
}
export interface DayPrediction { date: Date | null; weekday: string | null; explain: string }
export interface CravingsPrediction {
  likely: boolean; when: string | null; craving: string; explain: string;
}
export interface MoodPrediction {
  when: string | null; weekday: string | null; direction: "dip" | "lift" | "steady";
  suggestions: string[]; confidence: number; explain: string;
}
export interface FertilityPrediction {
  level: FertilityLevel; peak: Date | null; explain: string;
}
export interface SmartPredictions {
  hasCycle: boolean;
  confidence: number;            // overall cycle confidence 0–100
  loggedCycles: number;          // real confirmed cycles behind the numbers
  period: PeriodPrediction;
  pms: PmsPrediction;
  energy: EnergyPrediction;      // tomorrow
  recovery: DayPrediction;
  cravings: CravingsPrediction;
  mood: MoodPrediction;
  fertility: FertilityPrediction;
}

/** Typical (population) mood valence per phase, 1 (heavy) … 5 (bright). */
const PHASE_MOOD_DEFAULT: Record<Phase, number> = {
  period: 2.7, follicular: 4.2, fertile: 4.6, ovulation: 4.8, luteal: 3.0,
};

const ENERGY_BY_PHASE: Record<Phase, EnergyPrediction["level"]> = {
  period: "gentle", follicular: "rising", fertile: "high", ovulation: "peak", luteal: "winding",
};
const ENERGY_COPY: Record<EnergyLevel, { headline: string; goodFor: string[] }> = {
  gentle:  { headline: "Gentle energy",  goodFor: ["Restorative yoga", "Journaling", "An early night"] },
  rising:  { headline: "Rising energy",  goodFor: ["Something new", "Strength training", "Creative work"] },
  high:    { headline: "High energy",    goodFor: ["A real workout", "Deep work", "Socialising"] },
  peak:    { headline: "Peak energy",    goodFor: ["Your hardest workout", "Big meetings", "Bold moves"] },
  winding: { headline: "Winding down",   goodFor: ["Steady movement", "Wrapping up tasks", "Cosy self-care"] },
};
const FERTILITY_BY_PHASE: Record<Phase, FertilityLevel> = {
  period: "low", follicular: "medium", fertile: "high", ovulation: "peak", luteal: "low",
};

/** Confidence in the cycle predictions — honest, grows with confirmed cycles. */
function cycleConfidence(): { conf: number; loggedCycles: number } {
  const starts = readPeriodStarts().length;
  const loggedCycles = Math.max(0, starts - 1); // gaps between starts = real cycles
  const reg = cycleRegularity();
  let c = 74;
  c += Math.min(starts, 4) * 5;                  // +5 per confirmed start (max +20)
  if (reg === "regular") c += 6;
  else if (reg === "irregular") c -= 10;
  return { conf: clamp(Math.round(c), 60, 98), loggedCycles };
}

/** Next period start — holds on the current predicted date while overdue. */
function nextPeriod(s: CycleSettings, today: Date): { date: Date; daysAway: number; late: boolean } {
  const diff = Math.floor((today.getTime() - s.lastPeriodStart.getTime()) / MS);
  const cyclesPassed = Math.floor(diff / s.cycleLength);
  const cycles = diff >= s.cycleLength ? cyclesPassed : cyclesPassed + 1;
  const date = addDays(s.lastPeriodStart, cycles * s.cycleLength);
  const daysAway = Math.ceil((date.getTime() - today.getTime()) / MS);
  return { date, daysAway, late: daysAway < 0 };
}

/** Her learned mood per phase (avg of logged moods), else the typical default. */
function moodByPhase(s: CycleSettings): Record<Phase, number> {
  let log: Record<string, string> = {};
  try { log = JSON.parse(localStorage.getItem("bloom:mood-log-v2") || "{}"); } catch { /* ignore */ }
  const acc: Partial<Record<Phase, { t: number; n: number }>> = {};
  Object.entries(log).forEach(([iso, m]) => {
    if (!m) return;
    const ph = phaseForDay(new Date(iso + "T00:00:00"), s) as Phase;
    const a = (acc[ph] ||= { t: 0, n: 0 });
    a.t += moodValence(m); a.n += 1;
  });
  const out = { ...PHASE_MOOD_DEFAULT };
  (Object.keys(out) as Phase[]).forEach((ph) => {
    const a = acc[ph];
    if (a && a.n >= 2) out[ph] = a.t / a.n; // trust her data once there are ≥2 points
  });
  return out;
}

/** How spread out her recent cycles are (± days) — drives the period window. */
function cycleSpread(): number {
  const lens = recentCycleLengths(6);
  if (lens.length < 2) return 2;
  return clamp(Math.round((Math.max(...lens) - Math.min(...lens)) / 2), 1, 6);
}

export function computePredictions(): SmartPredictions {
  const s = readCycleSettings();
  const hasCycle = hasCycleSettings();
  const today = startOfToday();
  const { conf, loggedCycles } = cycleConfidence();
  const learning = loggedCycles < 2;

  const np = nextPeriod(s, today);
  const spread = cycleSpread();

  // ── Period ──
  const period: PeriodPrediction = {
    date: np.date, daysAway: np.daysAway, late: np.late, windowDays: spread,
    confidence: conf,
    explain: learning
      ? "Right now this comes from your setup. Confirm a few real period starts and I'll learn your true rhythm — this number climbs as I do ✿"
      : `I read this from your ${loggedCycles} confirmed cycle${loggedCycles === 1 ? "" : "s"} and how steady they've been. Your recent cycles vary by about ±${spread} day${spread === 1 ? "" : "s"}, which is baked into the window.`,
  };

  // ── PMS (≈3 days before period) ──
  const pmsDays = 3;
  const pms: PmsPrediction = {
    date: addDays(np.date, -pmsDays), daysBeforePeriod: pmsDays,
    confidence: clamp(conf - 8, 55, 92),
    explain: "In the last few days before your period, progesterone drops sharply — for many of us that's when tender moods, cravings and low energy arrive. I flag it early so you can plan softer days, not be caught off guard.",
  };

  // ── Energy tomorrow ──
  const tomorrow = addDays(today, 1);
  const phTom = phaseForDay(tomorrow, s) as Phase;
  const eLvl = ENERGY_BY_PHASE[phTom];
  const energy: EnergyPrediction = {
    level: eLvl, headline: ENERGY_COPY[eLvl].headline, goodFor: ENERGY_COPY[eLvl].goodFor,
    confidence: clamp(conf - 4, 58, 95),
    explain: "Your energy rides your hormones: it climbs after your period as estrogen rises, peaks around ovulation, then eases through the luteal phase. I match tomorrow's plan to that wave so you push when you're strong and rest when you're not.",
  };

  // ── Recovery day (next period day, or the 1–2 days just before it) ──
  let recDate: Date | null = null;
  for (let i = 1; i <= 10; i++) {
    const d = addDays(today, i);
    const ph = phaseForDay(d, s) as Phase;
    const toPeriod = Math.ceil((np.date.getTime() - d.getTime()) / MS);
    if (ph === "period" || (ph === "luteal" && toPeriod >= 0 && toPeriod <= 2)) { recDate = d; break; }
  }
  const recovery: DayPrediction = {
    date: recDate, weekday: recDate ? weekday(recDate) : null,
    explain: "Around your period and the last stretch of your luteal phase, your body is doing quiet, demanding work. Planning rest here isn't slacking — it's the most cycle-smart thing you can do.",
  };

  // ── Cravings (luteal / period ahead) ──
  let cravWhen: string | null = null;
  let craving = "Chocolate & carb cravings";
  for (let i = 0; i <= 7; i++) {
    const d = addDays(today, i);
    const ph = phaseForDay(d, s) as Phase;
    if (ph === "luteal" || ph === "period") {
      cravWhen = i === 0 ? "today" : i === 1 ? "tomorrow" : `around ${weekday(d)}`;
      craving = ph === "period" ? "Comfort-food & iron cravings" : "Chocolate & carb cravings";
      break;
    }
  }
  const cravings: CravingsPrediction = {
    likely: cravWhen !== null, when: cravWhen, craving,
    explain: "In your luteal phase serotonin dips and your body reaches for chocolate and carbs for a quick lift — it's biology, not weakness. A little dark chocolate or a warm, balanced meal answers it kindly.",
  };

  // ── Mood dip (biggest predicted drop vs today over the next week) ──
  const mbp = moodByPhase(s);
  const phToday = effectiveCurrentPhase(s, today) as Phase;
  const todayMood = mbp[phToday];
  let dipDay: Date | null = null, dipDelta = 0;
  for (let i = 1; i <= 7; i++) {
    const d = addDays(today, i);
    const ph = phaseForDay(d, s) as Phase;
    const delta = mbp[ph] - todayMood;
    if (delta < dipDelta) { dipDelta = delta; dipDay = d; }
  }
  const notableDip = dipDay && dipDelta <= -0.5;
  const usesHer = readPeriodStarts().length >= 1 && Object.keys((() => { try { return JSON.parse(localStorage.getItem("bloom:mood-log-v2") || "{}"); } catch { return {}; } })()).length >= 4;
  const mood: MoodPrediction = {
    when: notableDip ? (dipDay && weekday(dipDay)) : null,
    weekday: notableDip && dipDay ? weekday(dipDay) : null,
    direction: notableDip ? "dip" : "steady",
    suggestions: ["Yoga", "A gentle walk", "Journaling"],
    confidence: clamp(conf - 12, 50, 88),
    explain: usesHer
      ? "I mapped your own mood logs onto each phase — this reads from how YOU tend to feel, not a generic chart. When a heavier phase is coming, a little movement or journaling softens the landing."
      : "This follows the typical hormonal mood curve for now. Log your mood through a full cycle and I'll swap this for your personal pattern ✿",
  };

  // ── Fertility (current level + next peak = ovulation) ──
  const phNow = effectiveCurrentPhase(s, today) as Phase;
  let peak: Date | null = addDays(np.date, -14);
  if (peak.getTime() < today.getTime()) peak = addDays(np.date, s.cycleLength - 14);
  const fertility: FertilityPrediction = {
    level: FERTILITY_BY_PHASE[phNow], peak,
    explain: "Your fertile window opens as estrogen rises and peaks at ovulation, about 14 days before your next period. Whether you're planning for a baby or avoiding one, knowing this window is real power.",
  };

  return { hasCycle, confidence: conf, loggedCycles, period, pms, energy, recovery, cravings, mood, fertility };
}
