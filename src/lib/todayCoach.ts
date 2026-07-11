/**
 * Today Coach — the single source of truth for the "emotional coach" layer that
 * powers the Diet · Cycle-Nutrition card, the compact Today summary, the
 * "Tomorrow" preview and the locked-peek phase strip.
 *
 * It composes ONLY canonical data (cycle phase + settings via cyclePhase.ts,
 * per-phase nutrition from PHASE_INFO, energy from nutritionTargets) — it never
 * forks a private copy. Everything a screen needs to feel like a warm daily
 * ritual is assembled here, so Diet / Today / Read can never disagree.
 */

import {
  readCycleSettings, hasCycleSettings, phaseForDay, toDietPhase, PHASE_LABEL,
  type CyclePhase,
} from "@/components/bloom/cyclePhase";
import type { CycleSettings } from "@/components/bloom/PeriodSetup";
import { PHASE_INFO, type DietPhase } from "@/components/bloom/recipes/data";
import { todayISO } from "@/lib/localDate";

/* ---------- phase energy read (drives the cute meter) ---------- */

export type EnergyRead = "low" | "rising" | "peak" | "winding";

const ENERGY_BY_PHASE: Record<DietPhase, { read: EnergyRead; level: number; label: string }> = {
  menstrual:  { read: "low",     level: 28, label: "gentle & low" },
  follicular: { read: "rising",  level: 66, label: "rising ✦" },
  ovulatory:  { read: "peak",    level: 96, label: "at its peak ☀️" },
  luteal:     { read: "winding", level: 48, label: "winding down" },
};

/** One warm coach sentence — "what you need today", never guilt-based. */
const NEED_LINE: Record<DietPhase, string> = {
  menstrual:  "Rest is productive too. Keep warm, move slowly, and be tender with yourself today. 🤍",
  follicular: "Your energy is climbing — say yes to something new and fuel the momentum. 🌱",
  ovulatory:  "You're at your brightest. Shine, connect, and enjoy how good you feel. ☀️",
  luteal:     "Cravings and big feelings are normal now. Comfort yourself — kindly. 🍫",
};

/* ---------- the feel-good bank (her "chihaja fun") ----------
   A different little moment of joy each day, matched to her phase. Some deep-link
   into other tools (Read, Meals, Diary) so the whole app breathes together.
   NOTE: no links to Shop (hidden at launch) — "want to buy" prompts become a
   mindful, budget-kind nudge instead. */

export interface FeelGood {
  emoji: string;
  text: string;
  ctaLabel?: string;
  ctaHref?: string;
}

const FEEL_GOOD: Record<DietPhase, FeelGood[]> = {
  menstrual: [
    { emoji: "🍫", text: "Your body's working hard today. Let a square of dark chocolate melt on your tongue and just… be." },
    { emoji: "🫖", text: "Brew a warm ginger-lemon tea, light a candle, and give yourself ten slow minutes." },
    { emoji: "🎧", text: "Put on your softest song of the moment and let yourself feel it. This is your moment." },
    { emoji: "🛁", text: "Warm bath, cozy socks, an early night. Rest is productive too." },
    { emoji: "📖", text: "Curl up with our latest self-care read — nothing to do, just soak it in.", ctaLabel: "Read now", ctaHref: "/app/read" },
    { emoji: "✍️", text: "Write one honest sentence in your diary. Just one.", ctaLabel: "Open Diary", ctaHref: "/app/tools/diary" },
  ],
  follicular: [
    { emoji: "🥜", text: "Energy's rising — try today's healthy dessert: choco-peanut bars, made for your phase. Enjoy every bite.", ctaLabel: "See in Meals", ctaHref: "/app/tools/meals" },
    { emoji: "✨", text: "New-you energy. Fancy a fresh look? Take a moment, note what you truly want — no rush, no waste." },
    { emoji: "🎶", text: "Make a delicious juice, press play on a new playlist, and plan something that excites you." },
    { emoji: "💆‍♀️", text: "Glow prep: read our latest face-care routine and treat your skin tonight.", ctaLabel: "Read now", ctaHref: "/app/read" },
    { emoji: "🌱", text: "You feel springy today — say yes to one small new thing." },
    { emoji: "📝", text: "Dream a little: jot down one want and a tiny, mindful plan to get there.", ctaLabel: "Open Diary", ctaHref: "/app/tools/diary" },
  ],
  ovulatory: [
    { emoji: "💃", text: "You're glowing this week. Get ready, feel beautiful, take the photo." },
    { emoji: "☀️", text: "Peak-you energy — reach out to a friend and plan the fun thing." },
    { emoji: "🥗", text: "Fresh & radiant food today — crunchy raw veg and a bright juice. Savour it.", ctaLabel: "See in Meals", ctaHref: "/app/tools/meals" },
    { emoji: "💄", text: "Glow moment: our latest face-care routine + your favourite song. You've earned it.", ctaLabel: "Read now", ctaHref: "/app/read" },
    { emoji: "🌸", text: "Feeling confident? Note that new look you want — take your time, spend with intention." },
    { emoji: "📔", text: "Capture how good you feel today in a line — future-you will love reading it.", ctaLabel: "Open Diary", ctaHref: "/app/tools/diary" },
  ],
  luteal: [
    { emoji: "🍫", text: "Cravings are real, and that's ok. Make a healthy dessert that loves your phase — dark-chocolate walnut bites.", ctaLabel: "See in Meals", ctaHref: "/app/tools/meals" },
    { emoji: "🛁", text: "Wind-down night: warm juice, a face-care routine, and your comfort playlist.", ctaLabel: "Read now", ctaHref: "/app/read" },
    { emoji: "🧘‍♀️", text: "Big feelings this week. Be gentle — ten quiet minutes, just for you." },
    { emoji: "✍️", text: "Journal it out — luteal is honest, creative energy. Let it spill onto the page.", ctaLabel: "Open Diary", ctaHref: "/app/tools/diary" },
    { emoji: "🕯️", text: "Cozy over busy. Say no to one thing, yes to your comfort." },
    { emoji: "💭", text: "Tempted to buy something? Pause. Note it down and sleep on it — kind to you, kind to your budget." },
  ],
};

/** Stable per-day hash so the feel-good moment is the same all day, new tomorrow. */
function dayHash(iso: string): number {
  let h = 0;
  for (let i = 0; i < iso.length; i++) h = (h * 31 + iso.charCodeAt(i)) >>> 0;
  return h;
}

/** The one feel-good moment for a given day + phase (deterministic). */
export function feelGoodFor(phase: DietPhase, iso = todayISO()): FeelGood {
  const bank = FEEL_GOOD[phase];
  return bank[dayHash(iso) % bank.length];
}

/* ---------- "how you'll live it" (tomorrow preview + hero framing) ---------- */

const LIVE_IT: Record<DietPhase, string> = {
  menstrual:  "a slow, cozy day — warmth, rest and gentle, nourishing food.",
  follicular: "rising energy — a fresh start and room to try something new.",
  ovulatory:  "your brightest day — feel beautiful, connect and shine.",
  luteal:     "a softer, inward day — comfort, calm and a little kindness.",
};

/* ---------- date helpers ---------- */

const MS = 86_400_000;
function addDays(d: Date, n: number): Date {
  const r = new Date(d); r.setHours(12, 0, 0, 0); r.setDate(r.getDate() + n); return r;
}
/** 1-indexed day-of-cycle for a date (matches phaseForDay's math). */
export function cycleDayForDate(date: Date, s: CycleSettings): number {
  const diff = Math.floor((date.getTime() - s.lastPeriodStart.getTime()) / MS);
  return (((diff % s.cycleLength) + s.cycleLength) % s.cycleLength) + 1;
}

/* ---------- locked-peek: when each other phase next unlocks ---------- */

export interface PhaseUnlock {
  phase: DietPhase;
  label: string;          // "Ovulatory"
  daysUntil: number;      // 0 = today (current), else days ahead
  current: boolean;
  teaser: string;         // "Ovulation unlocks in 4 days ✨"
}

const PHASE_ORDER: DietPhase[] = ["menstrual", "follicular", "ovulatory", "luteal"];

const UNLOCK_TEASE: Record<DietPhase, string> = {
  menstrual:  "rest & deep nourishment",
  follicular: "fresh energy & new starts",
  ovulatory:  "your glow & social peak",
  luteal:     "comfort & honest, creative calm",
};

/** For each phase, the number of days until it next begins (0 for the current). */
export function phaseUnlocks(today = new Date(), s = readCycleSettings()): PhaseUnlock[] {
  const current = toDietPhase(phaseForDay(today, s)) ?? "follicular";
  const daysUntil: Partial<Record<DietPhase, number>> = { [current]: 0 };
  for (let i = 1; i <= s.cycleLength && Object.keys(daysUntil).length < 4; i++) {
    const p = toDietPhase(phaseForDay(addDays(today, i), s));
    if (p && daysUntil[p] === undefined) daysUntil[p] = i;
  }
  // Present in a pleasing order: current first, then soonest-unlocking.
  return PHASE_ORDER
    .map<PhaseUnlock>((phase) => {
      const d = daysUntil[phase] ?? s.cycleLength;
      return {
        phase,
        label: dietPhaseLabel(phase),
        daysUntil: d,
        current: d === 0,
        teaser: d === 0
          ? "your phase today"
          : `unlocks in ${d} day${d === 1 ? "" : "s"} ✨`,
      };
    })
    .sort((a, b) => a.daysUntil - b.daysUntil);
}

/** Recipe-DB phase key → pretty label (PHASE_INFO already carries this). */
export function dietPhaseLabel(p: DietPhase): string {
  return PHASE_INFO[p].label;
}

/* ---------- the assembled coach ---------- */

export interface DayCoach {
  ready: boolean;              // user has saved her cycle
  phase: DietPhase;
  cyclePhase: CyclePhase;      // 5-phase (for the pretty label)
  phaseLabel: string;
  cycleDay: number;
  energy: { read: EnergyRead; level: number; label: string };
  need: string;                // one coach sentence
  eat: string[];
  avoid: string[];
  keyNutrients: string[];
  snack: string;
  feelGood: FeelGood;
  tomorrow: {
    phase: DietPhase;
    phaseLabel: string;
    cycleDay: number;
    liveIt: string;
  };
}

/** Build the full coach for today (or a given date, for previews/tests). */
export function buildDayCoach(date = new Date(), iso = todayISO()): DayCoach {
  const ready = hasCycleSettings();
  const s = readCycleSettings();
  const cyclePhase = phaseForDay(date, s);
  const phase = toDietPhase(cyclePhase) ?? "follicular";
  const info = PHASE_INFO[phase];

  const tomorrowDate = addDays(date, 1);
  const tPhase = toDietPhase(phaseForDay(tomorrowDate, s)) ?? "follicular";

  return {
    ready,
    phase,
    cyclePhase,
    phaseLabel: PHASE_LABEL[cyclePhase],
    cycleDay: cycleDayForDate(date, s),
    energy: ENERGY_BY_PHASE[phase],
    need: NEED_LINE[phase],
    eat: info.eat,
    avoid: info.avoid,
    keyNutrients: info.keyNutrients,
    snack: info.snack,
    feelGood: feelGoodFor(phase, iso),
    tomorrow: {
      phase: tPhase,
      phaseLabel: dietPhaseLabel(tPhase),
      cycleDay: cycleDayForDate(tomorrowDate, s),
      liveIt: LIVE_IT[tPhase],
    },
  };
}
