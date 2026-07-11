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
import { PHASE_INFO, RECIPES, recipeImageSrc, type DietPhase } from "@/components/bloom/recipes/data";
import { todayISO, localDateISO } from "@/lib/localDate";

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
  /** A photo of the proposed read/meal, to grab attention. */
  image: string;
  ctaLabel?: string;
  ctaHref?: string;
}

// Shared imagery (all exist in /public/images) so every moment shows a photo.
const IMG_SELFCARE = "/images/read-selfcare.webp";
const IMG_RECIPES = "/images/read-recipes.webp";
const IMG_MIND = "/images/read-mindset.webp";
const IMG_MOVE = "/images/read-movement.webp";
const IMG_MONEY = "/images/read-money.webp";

const FEEL_GOOD: Record<DietPhase, FeelGood[]> = {
  menstrual: [
    { emoji: "🍫", text: "Your body's working hard today. Let a square of dark chocolate melt on your tongue and just… be.", image: IMG_RECIPES },
    { emoji: "🫖", text: "Brew a warm ginger-lemon tea, light a candle, and give yourself ten slow minutes.", image: IMG_SELFCARE },
    { emoji: "🎧", text: "Put on your softest song of the moment and let yourself feel it. This is your moment.", image: IMG_MIND },
    { emoji: "🛁", text: "Warm bath, cozy socks, an early night. Rest is productive too.", image: IMG_SELFCARE },
    { emoji: "📖", text: "Curl up with our rest-day face-care ritual — nothing to do, just soak it in.", image: IMG_SELFCARE, ctaLabel: "Read now", ctaHref: "/app/read?a=m1" },
    { emoji: "✍️", text: "Write one honest sentence in your diary. Just one.", image: IMG_MIND, ctaLabel: "Open Diary", ctaHref: "/app/tools/diary" },
  ],
  follicular: [
    { emoji: "🥜", text: "Energy's rising — try today's healthy dessert: choco-peanut bars, made for your phase. Enjoy every bite.", image: IMG_RECIPES, ctaLabel: "See in Meals", ctaHref: "/app/tools/meals" },
    { emoji: "✨", text: "New-you energy. Fancy a fresh look? Take a moment, note what you truly want — no rush, no waste.", image: IMG_MIND },
    { emoji: "🎶", text: "Make a delicious juice, press play on a new playlist, and plan something that excites you.", image: IMG_RECIPES },
    { emoji: "💆‍♀️", text: "Glow prep: read our fresh-start face-care routine and treat your skin tonight.", image: IMG_SELFCARE, ctaLabel: "Read now", ctaHref: "/app/read?a=f1" },
    { emoji: "🌱", text: "You feel springy today — say yes to one small new thing.", image: IMG_MOVE },
    { emoji: "📝", text: "Dream a little: jot down one want and a tiny, mindful plan to get there.", image: IMG_MIND, ctaLabel: "Open Diary", ctaHref: "/app/tools/diary" },
  ],
  ovulatory: [
    { emoji: "💃", text: "You're glowing this week. Get ready, feel beautiful, take the photo.", image: IMG_SELFCARE },
    { emoji: "☀️", text: "Peak-you energy — reach out to a friend and plan the fun thing.", image: IMG_MIND },
    { emoji: "🥗", text: "Fresh & radiant food today — crunchy raw veg and a bright juice. Savour it.", image: IMG_RECIPES, ctaLabel: "See in Meals", ctaHref: "/app/tools/meals" },
    { emoji: "💄", text: "Glow moment: our glow-week face-care edit + your favourite song. You've earned it.", image: IMG_SELFCARE, ctaLabel: "Read now", ctaHref: "/app/read?a=o1" },
    { emoji: "🌸", text: "Feeling confident? Note that new look you want — take your time, spend with intention.", image: IMG_MIND },
    { emoji: "📔", text: "Capture how good you feel today in a line — future-you will love reading it.", image: IMG_MIND, ctaLabel: "Open Diary", ctaHref: "/app/tools/diary" },
  ],
  luteal: [
    { emoji: "🍫", text: "Cravings are real, and that's ok. Make a healthy dessert that loves your phase — dark-chocolate walnut bites.", image: IMG_RECIPES, ctaLabel: "See in Meals", ctaHref: "/app/tools/meals" },
    { emoji: "🛁", text: "Wind-down night: warm juice, our luteal face-care ritual, and your comfort playlist.", image: IMG_SELFCARE, ctaLabel: "Read now", ctaHref: "/app/read?a=l1" },
    { emoji: "🧘‍♀️", text: "Big feelings this week. Be gentle — ten quiet minutes, just for you.", image: IMG_SELFCARE },
    { emoji: "✍️", text: "Journal it out — luteal is honest, creative energy. Let it spill onto the page.", image: IMG_MIND, ctaLabel: "Open Diary", ctaHref: "/app/tools/diary" },
    { emoji: "🕯️", text: "Cozy over busy. Say no to one thing, yes to your comfort.", image: IMG_SELFCARE },
    { emoji: "💭", text: "Tempted to buy something? Pause. Note it down and sleep on it — kind to you, kind to your budget.", image: IMG_MONEY },
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

/* ---------- feel-good "did it" sticker + streak (the daily joy loop) ---------- */

const FEELGOOD_KEY = "bloom:feelgood-log";

function readFeelGoodSet(): Set<string> {
  try {
    const raw = localStorage.getItem(FEELGOOD_KEY);
    const arr = raw ? (JSON.parse(raw) as string[]) : [];
    return new Set(Array.isArray(arr) ? arr : []);
  } catch { return new Set(); }
}

/** Has she given herself today's moment? */
export function isFeelGoodDone(iso = todayISO()): boolean {
  return readFeelGoodSet().has(iso);
}

/** Toggle today's feel-good as done; returns the new done state. */
export function toggleFeelGoodDone(iso = todayISO()): boolean {
  const set = readFeelGoodSet();
  const now = !set.has(iso);
  if (now) set.add(iso); else set.delete(iso);
  try { localStorage.setItem(FEELGOOD_KEY, JSON.stringify([...set])); } catch {}
  return now;
}

/** Consecutive days she's taken her moment, counting today or (if not yet
 *  done today) yesterday backward — so the streak survives an unfinished today. */
export function feelGoodStreak(): number {
  const set = readFeelGoodSet();
  if (!set.size) return 0;
  const start = new Date();
  start.setHours(12, 0, 0, 0);
  // If today isn't done yet, anchor on yesterday so a live streak still shows.
  if (!set.has(todayISO())) start.setDate(start.getDate() - 1);
  let streak = 0;
  const cur = new Date(start);
  while (set.has(localDateISO(cur))) {
    streak++;
    cur.setDate(cur.getDate() - 1);
  }
  return streak;
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

/* ---------- snack proposed from our Meals (with a real photo) ---------- */

/** The phase's snack, drawn from the recipe library so we can show its photo. */
const SNACK_RECIPE_ID: Record<DietPhase, string> = {
  menstrual: "s01",   // Dates + Almond Butter
  follicular: "s02",  // Greek Yoghurt, Berries & Flaxseed
  ovulatory: "s03",   // Carrot Sticks, Hummus & Seeds
  luteal: "s04",      // Banana, Dark Chocolate & Walnuts
};

export interface CoachSnack {
  id: string; name: string; image: string; calories: number; protein: number;
}

function snackFor(phase: DietPhase): CoachSnack | null {
  const r = RECIPES.find((x) => x.id === SNACK_RECIPE_ID[phase])
    ?? RECIPES.find((x) => x.mealType === "snack" && x.phases.includes(phase));
  if (!r) return null;
  return { id: r.id, name: r.name, image: recipeImageSrc(r), calories: r.macros.calories, protein: r.macros.protein };
}

/** The next phase transition ahead — a little curiosity for the Tomorrow card. */
function comingUpFrom(date: Date, s: CycleSettings, current: DietPhase): { phaseLabel: string; inDays: number } | null {
  for (let i = 1; i <= s.cycleLength; i++) {
    const p = toDietPhase(phaseForDay(addDays(date, i), s));
    if (p && p !== current) return { phaseLabel: dietPhaseLabel(p), inDays: i };
  }
  return null;
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
  snack: string;               // fallback text
  snackRecipe: CoachSnack | null; // proposed snack from Meals, with photo
  feelGood: FeelGood;
  tomorrow: {
    phase: DietPhase;
    phaseLabel: string;
    cycleDay: number;
    liveIt: string;
    energyLabel: string;
    eatPeek: string[];         // a couple of foods to look forward to
    comingUp: { phaseLabel: string; inDays: number } | null;
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
  const tInfo = PHASE_INFO[tPhase];

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
    snackRecipe: snackFor(phase),
    feelGood: feelGoodFor(phase, iso),
    tomorrow: {
      phase: tPhase,
      phaseLabel: dietPhaseLabel(tPhase),
      cycleDay: cycleDayForDate(tomorrowDate, s),
      liveIt: LIVE_IT[tPhase],
      energyLabel: ENERGY_BY_PHASE[tPhase].label,
      eatPeek: tInfo.eat.slice(0, 3),
      comingUp: comingUpFrom(date, s, phase),
    },
  };
}
