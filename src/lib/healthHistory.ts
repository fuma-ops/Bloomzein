/**
 * Health history — the "everything you've really logged, from day one" layer.
 *
 * This is a PURE READER. It never tracks or invents data: every figure traces
 * back to a canonical store another tool already writes — confirmed period
 * starts (periodLog), completed workout & yoga sessions (their dated histories),
 * the symptom log, the mood log, the eaten-meal log and the weight history. It
 * only *composes* those real, user-confirmed events into lifetime insights and a
 * doctor-shareable report. Keep it that way: read stores, don't fork them.
 *
 * Design choice (honest data): we report what actually happened. Calories BURNED
 * come from real completed sessions (they store their kcal). We deliberately do
 * NOT reconstruct past calories EATEN — the meal plan is a weekday template, not
 * a dated ledger, so a past date's exact intake can't be proven; instead we
 * report meal-logging consistency (how many days she logged, how many meals),
 * which is real. Dates are LOCAL calendar days throughout (localDate.ts).
 */
import { localDateISO, todayISO } from "@/lib/localDate";
import {
  readPeriodStarts,
  avgCycleLength,
  recentCycleLengths,
  cycleRegularity,
} from "@/lib/periodLog";
import { readCycleSettings, hasCycleSettings } from "@/components/bloom/cyclePhase";
import { readSleepLog } from "@/lib/sleepLog";
import { moodValence } from "@/lib/meDashboard";
import { readMealPlan, portionFor, type PlanSlot } from "@/lib/crossToolData";
import { RECIPES } from "@/components/bloom/recipes/data";

function read<T>(key: string, fallback: T): T {
  try {
    const v = localStorage.getItem(key);
    return v ? (JSON.parse(v) as T) : fallback;
  } catch {
    return fallback;
  }
}

const MS_DAY = 86_400_000;
const toTime = (iso: string) => new Date(iso + "T00:00:00").getTime();

/* ---------- shapes ---------- */

export interface DatedKcal {
  date: string;
  calories: number;
  durationMin?: number;
}

export interface WeekBurn {
  weekStartISO: string; // Monday of the week (local)
  label: string; // "Jul 7"
  kcal: number;
  sessions: number;
}

export interface Counted {
  label: string;
  count: number;
}

export interface MoodPoint {
  date: string;
  mood: string;
  score: number; // 1..5 valence
}

export interface CycleInsight {
  starts: string[]; // confirmed real period-start dates (local ISO)
  count: number; // number of confirmed starts
  cyclesMeasured: number; // gaps between starts (= count - 1, clamped ≥ 0)
  avgLength: number | null; // learned average cycle length (days)
  recentLengths: number[]; // last few real cycle lengths
  regularity: "regular" | "irregular" | "learning";
  lastStart: string | null;
}

export interface WeightInsight {
  series: { date: string; kg: number }[];
  startKg: number | null;
  currentKg: number | null;
  changeKg: number | null; // current - start (signed)
  goal: "lose" | "maintain" | "gain";
  targetKg: number | null;
}

export interface MovementInsight {
  workouts: number; // completed workout sessions (lifetime)
  yoga: number; // completed yoga flows (lifetime)
  totalSessions: number;
  totalKcal: number; // real burned kcal, lifetime
  workoutKcal: number;
  yogaKcal: number;
  activeDays: number; // distinct days with any session
  weekly: WeekBurn[]; // last N weeks of burn
}

export interface NourishInsight {
  daysLogged: number; // distinct days ≥1 meal logged
  mealsLogged: number; // total meals ticked eaten
  daysFullLogged: number; // days with ≥3 meals
}

export interface NutritionDay {
  date: string;
  planned: number; // kcal her plan proposed for that weekday
  logged: number; // kcal of the meals she actually ticked eaten
}
export interface NutritionInsight {
  series: NutritionDay[]; // chronological, one point per logged day
  plannedSeries: { date: string; planned: number }[]; // planned kcal for EVERY day in range (the reference)
  avgPlanned: number | null;
  avgLogged: number | null;
  adherencePct: number | null; // logged ÷ planned, averaged (how close she ate to plan)
}

export interface SleepDay {
  date: string;
  quality: number; // 1..5
  hours?: number;
}
export interface SleepInsight {
  days: number;
  avgQuality: number | null; // 1..5
  avgHours: number | null;
  series: SleepDay[]; // chronological
}

/* ---------- per-day detail (drives the interactive charts) ---------- */

export interface DayBurn {
  date: string;
  kcal: number;
  sessions: number;
  items: { calories: number; name: string; durationMin: number }[];
}
export interface SymptomDay {
  date: string;
  labels: string[];
}
export interface Cycle {
  startISO: string;
  endISO: string; // last day before the next start (or today if ongoing)
  lengthDays: number; // days from this start to the next (or to today if ongoing)
  monthLabel: string; // "4 May" — the start day, for the x-axis
  ongoing: boolean;
}

/** One plain-language reading of the pattern in each chart. */
export interface Patterns {
  weight: string;
  workout: string;
  yoga: string;
  mood: string;
  symptoms: string;
  sleep: string;
  nutrition: string;
  cycle: string;
  combined: string;
}

/* ---------- phase timeline (drives the combined "by phase × time" chart) ---------- */

export type PhaseKey = "menstrual" | "follicular" | "ovulatory" | "luteal";
export const PHASE_LABEL: Record<PhaseKey, string> = {
  menstrual: "Menstrual",
  follicular: "Follicular",
  ovulatory: "Ovulatory",
  luteal: "Luteal",
};

export interface PhaseSegment {
  startISO: string;
  endISO: string;
  phase: PhaseKey;
}
export interface PhaseStat {
  phase: PhaseKey;
  label: string;
  moodAvg: number | null;
  moodDays: number;
  burnKcal: number;
  sessions: number;
  symptomDays: number;
  sleepAvg: number | null; // avg quality 1..5
  sleepDays: number;
}

export interface HealthHistory {
  trackingSince: string | null; // earliest real event, local ISO
  daysTracked: number; // whole days from trackingSince to today (inclusive)
  range: { startISO: string; endISO: string } | null; // tracking window for time-axis charts
  cycle: CycleInsight & { cycles: Cycle[] };
  movement: MovementInsight & { workoutDaily: DayBurn[]; yogaDaily: DayBurn[] };
  symptoms: { total: number; days: number; byLabel: Counted[]; daily: SymptomDay[] };
  mood: { days: number; series: MoodPoint[]; byMood: Counted[]; avgScore: number | null };
  weight: WeightInsight;
  nourish: NourishInsight;
  nutrition: NutritionInsight;
  sleep: SleepInsight;
  phaseSegments: PhaseSegment[]; // cycle-phase bands across the tracking window
  byPhase: PhaseStat[]; // how she does in each phase
  patterns: Patterns;
}

/* ---------- helpers ---------- */

/** Monday (local) of the week containing `d`, as ISO. */
function mondayISO(d: Date): string {
  const copy = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const back = (copy.getDay() + 6) % 7; // 0 = Monday
  copy.setDate(copy.getDate() - back);
  return localDateISO(copy);
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
function shortLabel(iso: string): string {
  const d = new Date(iso + "T00:00:00");
  return `${MONTHS[d.getMonth()]} ${d.getDate()}`;
}

/** Weekly burn buckets for the last `weeks` weeks (oldest → newest). */
function weeklyBurn(all: DatedKcal[], weeks: number): WeekBurn[] {
  const thisMonday = mondayISO(new Date());
  const buckets: WeekBurn[] = [];
  for (let i = weeks - 1; i >= 0; i--) {
    const start = localDateISO(new Date(toTime(thisMonday) - i * 7 * MS_DAY));
    buckets.push({ weekStartISO: start, label: shortLabel(start), kcal: 0, sessions: 0 });
  }
  const firstStart = toTime(buckets[0].weekStartISO);
  for (const e of all) {
    if (!e?.date) continue;
    const t = toTime(e.date);
    if (isNaN(t) || t < firstStart) continue;
    const idx = Math.floor((t - firstStart) / (7 * MS_DAY));
    if (idx >= 0 && idx < buckets.length) {
      buckets[idx].kcal += Math.max(0, Math.round(e.calories || 0));
      buckets[idx].sessions += 1;
    }
  }
  return buckets;
}

function earliest(...isoLists: string[][]): string | null {
  let min: string | null = null;
  for (const list of isoLists) {
    for (const iso of list) {
      if (iso && (min === null || iso < min)) min = iso;
    }
  }
  return min;
}

/** Day label like "4 May" from an ISO date. */
function dayLabel(iso: string): string {
  const d = new Date(iso + "T00:00:00");
  return `${d.getDate()} ${MONTHS[d.getMonth()]}`;
}

/** Group dated kcal entries into one bar per LOCAL day (chronological). */
function dailyBurn(
  hist: (DatedKcal & { sessionName?: string })[],
  fallbackName: string,
): DayBurn[] {
  const byDay = new Map<string, DayBurn>();
  for (const e of hist) {
    if (!e?.date) continue;
    const kcal = Math.max(0, Math.round(e.calories || 0));
    const cur = byDay.get(e.date) ?? { date: e.date, kcal: 0, sessions: 0, items: [] };
    cur.kcal += kcal;
    cur.sessions += 1;
    cur.items.push({
      calories: kcal,
      name: e.sessionName || fallbackName,
      durationMin: e.durationMin || 0,
    });
    byDay.set(e.date, cur);
  }
  return [...byDay.values()].sort((a, b) => (a.date < b.date ? -1 : 1));
}

/** Build one cycle per consecutive pair of confirmed starts (+ the ongoing one). */
function buildCycles(starts: string[]): Cycle[] {
  const out: Cycle[] = [];
  for (let i = 0; i < starts.length - 1; i++) {
    const len = Math.round((toTime(starts[i + 1]) - toTime(starts[i])) / MS_DAY);
    const endISO = localDateISO(new Date(toTime(starts[i + 1]) - MS_DAY));
    out.push({
      startISO: starts[i],
      endISO,
      lengthDays: len,
      monthLabel: dayLabel(starts[i]),
      ongoing: false,
    });
  }
  // The current, still-running cycle (last confirmed start → today).
  if (starts.length) {
    const last = starts[starts.length - 1];
    const len = Math.max(1, Math.round((toTime(todayISO()) - toTime(last)) / MS_DAY) + 1);
    out.push({
      startISO: last,
      endISO: todayISO(),
      lengthDays: len,
      monthLabel: dayLabel(last),
      ongoing: true,
    });
  }
  return out;
}

/** Which cycle phase a historic day fell in — anchored to the most recent REAL
 *  confirmed start (and that cycle's real length), mirroring phaseForDay's math.
 *  Returns null for days before her first confirmed start. */
function histPhase(
  dayMs: number,
  starts: string[],
  periodLen: number,
  fallbackLen: number,
): PhaseKey | null {
  let s0: number | null = null;
  let idx = -1;
  for (let i = 0; i < starts.length; i++) {
    const t = toTime(starts[i]);
    if (t <= dayMs) {
      s0 = t;
      idx = i;
    } else break;
  }
  if (s0 == null) return null;
  const next = idx + 1 < starts.length ? toTime(starts[idx + 1]) : null;
  const cycleLen = next ? Math.max(18, Math.round((next - s0) / MS_DAY)) : fallbackLen;
  const dayOfCycle = Math.floor((dayMs - s0) / MS_DAY);
  const ov = Math.max(10, cycleLen - 14);
  if (dayOfCycle < periodLen) return "menstrual";
  if (dayOfCycle >= ov - 2 && dayOfCycle <= ov + 1) return "ovulatory";
  if (dayOfCycle < ov) return "follicular";
  return "luteal";
}

/** Contiguous phase bands from `fromISO`..`toISO` (inclusive), local days. */
function buildPhaseSegments(fromISO: string, toISO: string, starts: string[]): PhaseSegment[] {
  if (!starts.length) return [];
  const s = readCycleSettings();
  const periodLen = s.periodLength || 5;
  const fallbackLen = avgCycleLength(starts) ?? s.cycleLength ?? 28;
  const segs: PhaseSegment[] = [];
  let curPhase: PhaseKey | null = null;
  let segStart = fromISO;
  const t1 = toTime(toISO);
  for (let t = toTime(fromISO); t <= t1; t += MS_DAY) {
    const iso = localDateISO(new Date(t));
    const p = histPhase(t, starts, periodLen, fallbackLen);
    if (p !== curPhase) {
      if (curPhase)
        segs.push({
          startISO: segStart,
          endISO: localDateISO(new Date(t - MS_DAY)),
          phase: curPhase,
        });
      curPhase = p;
      segStart = iso;
    }
  }
  if (curPhase) segs.push({ startISO: segStart, endISO: toISO, phase: curPhase });
  return segs;
}

/** Predicted period-start dates covering a window, anchored on her cycle setup —
 *  used to draw the phase bands when she hasn't confirmed real starts yet, so the
 *  "cycle × your body" overlay still appears (as a forecast). These bands
 *  self-correct to real ones the moment she confirms period starts. */
function syntheticStarts(fromISO: string, toISO: string): string[] {
  if (!hasCycleSettings()) return [];
  const s = readCycleSettings();
  const len = Math.max(18, s.cycleLength || 28);
  const lp = s.lastPeriodStart;
  let t = new Date(lp.getFullYear(), lp.getMonth(), lp.getDate()).getTime();
  const startBound = toTime(fromISO) - len * MS_DAY;
  const endBound = toTime(toISO);
  while (t > startBound) t -= len * MS_DAY;
  const out: string[] = [];
  for (; t <= endBound; t += len * MS_DAY) out.push(localDateISO(new Date(t)));
  return out;
}

/** How she does in each phase — avg mood, burn, sessions, symptom-days. */
function buildByPhase(
  starts: string[],
  moodSeries: MoodPoint[],
  workoutDaily: DayBurn[],
  yogaDaily: DayBurn[],
  symptomsDaily: SymptomDay[],
  sleepSeries: SleepDay[],
): PhaseStat[] {
  const s = readCycleSettings();
  const periodLen = s.periodLength || 5;
  const fallbackLen = avgCycleLength(starts) ?? s.cycleLength ?? 28;
  const phaseOf = (iso: string) => histPhase(toTime(iso), starts, periodLen, fallbackLen);
  const blank = () => ({
    moodSum: 0,
    moodDays: 0,
    burn: 0,
    sessions: 0,
    sxDays: 0,
    sleepSum: 0,
    sleepDays: 0,
  });
  const acc: Record<PhaseKey, ReturnType<typeof blank>> = {
    menstrual: blank(),
    follicular: blank(),
    ovulatory: blank(),
    luteal: blank(),
  };
  for (const m of moodSeries) {
    const p = phaseOf(m.date);
    if (p) {
      acc[p].moodSum += m.score;
      acc[p].moodDays++;
    }
  }
  for (const d of [...workoutDaily, ...yogaDaily]) {
    const p = phaseOf(d.date);
    if (p) {
      acc[p].burn += d.kcal;
      acc[p].sessions += d.sessions;
    }
  }
  for (const d of symptomsDaily) {
    const p = phaseOf(d.date);
    if (p) acc[p].sxDays++;
  }
  for (const d of sleepSeries) {
    const p = phaseOf(d.date);
    if (p) {
      acc[p].sleepSum += d.quality;
      acc[p].sleepDays++;
    }
  }
  const order: PhaseKey[] = ["menstrual", "follicular", "ovulatory", "luteal"];
  return order.map((phase) => {
    const a = acc[phase];
    return {
      phase,
      label: PHASE_LABEL[phase],
      moodAvg: a.moodDays ? Math.round((a.moodSum / a.moodDays) * 10) / 10 : null,
      moodDays: a.moodDays,
      burnKcal: a.burn,
      sessions: a.sessions,
      symptomDays: a.sxDays,
      sleepAvg: a.sleepDays ? Math.round((a.sleepSum / a.sleepDays) * 10) / 10 : null,
      sleepDays: a.sleepDays,
    };
  });
}

/** Planned-vs-logged calories, day by day. "Planned" is what her weekly plan
 *  proposes for that weekday (the same source the Diet energy ring uses);
 *  "logged" is the calories of the meals she actually ticked eaten that date.
 *  Reads THROUGH the shared meal plan + eaten log — forks neither. */
function buildNutrition(
  eaten: Record<string, string[]>,
  rangeStartISO: string | null,
  rangeEndISO: string | null,
): NutritionInsight {
  const plan = readMealPlan(); // weekday (Mon..Sun) → slot → recipeId
  const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const SLOTS: PlanSlot[] = ["breakfast", "lunch", "dinner", "snack", "lunchbox"];
  const kcalOf = (id: string | null | undefined) =>
    id ? (RECIPES.find((r) => r.id === id)?.macros.calories ?? 0) : 0;
  const weekdayOf = (iso: string) => WEEKDAYS[new Date(iso + "T00:00:00").getDay()];

  // Full planned kcal for a weekday (every slot the plan fills, plated portions).
  const plannedFor = (wd: string): number => {
    const day = plan[wd];
    if (!day) return 0;
    return SLOTS.reduce((s, slot) => s + kcalOf(day[slot]) * portionFor(wd, slot), 0);
  };

  // The PLANNED reference — what her plan proposes for EVERY day across the
  // tracking window (a repeating weekly template), so the chart can draw the plan
  // as a continuous line and overlay only the days she actually ate. Extends a
  // week into the future so "what's planned next" is visible too.
  const plannedSeries: { date: string; planned: number }[] = [];
  if (rangeStartISO && rangeEndISO) {
    const endMs = toTime(rangeEndISO) + 7 * MS_DAY;
    for (let t = toTime(rangeStartISO); t <= endMs; t += MS_DAY) {
      const iso = localDateISO(new Date(t));
      const planned = Math.round(plannedFor(weekdayOf(iso)));
      if (planned > 0) plannedSeries.push({ date: iso, planned });
    }
  }

  const series: NutritionDay[] = Object.entries(eaten)
    .filter(([, slots]) => Array.isArray(slots) && slots.length)
    .map(([date, slots]) => {
      const wd = weekdayOf(date);
      const day = plan[wd] ?? {};
      const planned = Math.round(plannedFor(wd));
      const logged = Math.round(
        (slots as string[]).reduce(
          (s, slot) =>
            SLOTS.includes(slot as PlanSlot)
              ? s +
                kcalOf((day as Record<string, string | null>)[slot]) *
                  portionFor(wd, slot as PlanSlot)
              : s,
          0,
        ),
      );
      return { date, planned, logged };
    })
    .filter((d) => d.planned > 0) // only meaningful once a plan exists
    .sort((a, b) => (a.date < b.date ? -1 : 1));

  if (!series.length) {
    return { series: [], plannedSeries, avgPlanned: null, avgLogged: null, adherencePct: null };
  }
  const avgPlanned = Math.round(series.reduce((s, d) => s + d.planned, 0) / series.length);
  const avgLogged = Math.round(series.reduce((s, d) => s + d.logged, 0) / series.length);
  const adherencePct = avgPlanned > 0 ? Math.round((avgLogged / avgPlanned) * 100) : null;
  return { series, plannedSeries, avgPlanned, avgLogged, adherencePct };
}

/* ---------- pattern interpretations (one honest sentence per chart) ---------- */

function pctChange(a: number, b: number): number {
  return a === 0 ? 0 : Math.round(((b - a) / Math.abs(a)) * 100);
}

function buildPatterns(h: {
  weight: WeightInsight;
  workoutDaily: DayBurn[];
  yogaDaily: DayBurn[];
  moodSeries: MoodPoint[];
  moodTop: string | null;
  moodAvg: number | null;
  symptomsDaily: SymptomDay[];
  symptomsTop: Counted | null;
  sleep: SleepInsight;
  nutrition: NutritionInsight;
  cycles: Cycle[];
  avgCycle: number | null;
  regularity: CycleInsight["regularity"];
  byPhase: PhaseStat[];
}): Patterns {
  // Weight
  let weight = "Log a few weigh-ins and your trend will read here.";
  if (h.weight.series.length >= 2 && h.weight.changeKg != null) {
    const dir = h.weight.changeKg < 0 ? "down" : h.weight.changeKg > 0 ? "up" : "steady";
    weight =
      dir === "steady"
        ? `Holding steady around ${h.weight.currentKg} kg across ${h.weight.series.length} weigh-ins.`
        : `${dir === "down" ? "Down" : "Up"} ${Math.abs(h.weight.changeKg)} kg since your first weigh-in — a ${dir === "down" ? "gentle downward" : "rising"} trend over ${h.weight.series.length} readings.`;
  }

  const burnLine = (days: DayBurn[], kind: string) => {
    if (!days.length) return `No ${kind} logged yet — finish a session and it charts here.`;
    const total = days.reduce((s, d) => s + d.kcal, 0);
    const sessions = days.reduce((s, d) => s + d.sessions, 0);
    const avg = Math.round(total / Math.max(1, sessions));
    const best = [...days].sort((a, b) => b.kcal - a.kcal)[0];
    return `${sessions} ${kind} on ${days.length} day${days.length === 1 ? "" : "s"} · ${total.toLocaleString()} kcal total · ~${avg} kcal each. Biggest burn: ${dayLabel(best.date)} (${best.kcal} kcal).`;
  };
  const workout = burnLine(h.workoutDaily, "workouts");
  const yoga = burnLine(h.yogaDaily, "yoga flows");

  // Mood
  let mood = "Log your mood and its ups and downs will show here.";
  if (h.moodSeries.length) {
    let trend = "";
    if (h.moodSeries.length >= 4) {
      const mid = Math.floor(h.moodSeries.length / 2);
      const first = h.moodSeries.slice(0, mid);
      const second = h.moodSeries.slice(mid);
      const avg = (arr: MoodPoint[]) => arr.reduce((s, p) => s + p.score, 0) / arr.length;
      const change = pctChange(avg(first), avg(second));
      if (change >= 8) trend = " — trending brighter lately";
      else if (change <= -8) trend = " — dipping a little lately";
      else trend = " — fairly steady";
    }
    mood = `Mostly ${h.moodTop ?? "mixed"} across ${h.moodSeries.length} logged days · average positivity ${h.moodAvg}/5${trend}.`;
  }

  // Symptoms
  let symptoms = "Tag how you feel and your symptom pattern builds here.";
  if (h.symptomsDaily.length) {
    symptoms = `Logged on ${h.symptomsDaily.length} day${h.symptomsDaily.length === 1 ? "" : "s"}${h.symptomsTop ? ` · most common: ${h.symptomsTop.label} (${h.symptomsTop.count}×)` : ""}.`;
  }

  // Sleep
  let sleep = "Log how you sleep each night and your rest pattern shows here.";
  if (h.sleep.days) {
    const worst = [...h.byPhase]
      .filter((p) => p.sleepAvg != null)
      .sort((a, b) => (a.sleepAvg ?? 5) - (b.sleepAvg ?? 5))[0];
    sleep = `Averaging ${h.sleep.avgQuality}/5${h.sleep.avgHours ? ` (~${h.sleep.avgHours}h)` : ""} across ${h.sleep.days} night${h.sleep.days === 1 ? "" : "s"}${worst ? ` · lightest in your ${worst.label.toLowerCase()} phase` : ""}.`;
  }

  // Nutrition (planned vs logged)
  let nutrition = "Plan your meals and tick what you eat — your plan-vs-plate shows here.";
  if (h.nutrition.series.length && h.nutrition.adherencePct != null) {
    const pct = h.nutrition.adherencePct;
    const feel =
      pct >= 95 && pct <= 108
        ? "right on plan"
        : pct < 95
          ? "a little under your plan"
          : "a touch over your plan";
    nutrition = `Across ${h.nutrition.series.length} logged day${h.nutrition.series.length === 1 ? "" : "s"} you ate ~${h.nutrition.avgLogged} kcal against a planned ~${h.nutrition.avgPlanned} kcal — ${feel} (${pct}%).`;
  }

  // Cycle
  let cycle = "Confirm two period starts and your cycle lengths will chart here.";
  const done = h.cycles.filter((c) => !c.ongoing);
  if (done.length >= 1) {
    const reg =
      h.regularity === "regular"
        ? "a regular rhythm (varies ≤ 3 days)"
        : h.regularity === "irregular"
          ? "an irregular rhythm (varies > 3 days)"
          : "still settling";
    cycle = `${done.length} completed cycle${done.length === 1 ? "" : "s"}${h.avgCycle ? ` · average ${h.avgCycle} days` : ""} · ${reg}.`;
  }

  // Combined (by phase × time) — name the phase where mood is brightest and where
  // she moves most, so the overlay chart reads as a takeaway, not just lines.
  let combined =
    "As you log across a full cycle, this shows how your body moves through each phase.";
  const moodRanked = h.byPhase
    .filter((p) => p.moodAvg != null)
    .sort((a, b) => (b.moodAvg ?? 0) - (a.moodAvg ?? 0));
  const burnRanked = h.byPhase
    .filter((p) => p.burnKcal > 0)
    .sort((a, b) => b.burnKcal - a.burnKcal);
  if (moodRanked.length || burnRanked.length) {
    const bits: string[] = [];
    if (moodRanked.length)
      bits.push(`your mood is brightest in your ${moodRanked[0].label.toLowerCase()} phase`);
    if (burnRanked.length)
      bits.push(`you move most in your ${burnRanked[0].label.toLowerCase()} phase`);
    combined = `Across your cycle, ${bits.join(" and ")} — the coloured bands show each phase over time.`;
  }

  return { weight, workout, yoga, mood, symptoms, sleep, nutrition, cycle, combined };
}

/* ---------- the composed history ---------- */

export function computeHealthHistory(weeks = 8): HealthHistory {
  // ── Real stores (dated event logs) ──
  const workoutHist = read<(DatedKcal & { sessionName?: string })[]>(
    "bloom:workout-history",
    [],
  ).filter((h) => h?.date);
  const yogaHist = read<DatedKcal[]>("bloom:yoga-history", []).filter((h) => h?.date);
  const symptomsLog = read<Record<string, string[]>>("bloom:symptoms-log-v2", {});
  const moodLog = read<Record<string, string>>("bloom:mood-log-v2", {});
  const eaten = read<Record<string, string[]>>("bloom:diet-eaten", {});
  const profile = read<{
    goal?: string;
    targetWeight?: number;
    weight?: number;
    weightHistory?: { date: string; kg: number }[];
  }>("bloom:diet-profile", {});
  const periodStarts = readPeriodStarts();

  // ── Cycle ──
  const cycle: CycleInsight = {
    starts: periodStarts,
    count: periodStarts.length,
    cyclesMeasured: Math.max(0, periodStarts.length - 1),
    avgLength: avgCycleLength(periodStarts),
    recentLengths: recentCycleLengths(6),
    regularity: cycleRegularity(),
    lastStart: periodStarts.length ? periodStarts[periodStarts.length - 1] : null,
  };

  // ── Movement / burned calories (real completed sessions) ──
  const sum = (list: DatedKcal[]) =>
    list.reduce((s, h) => s + Math.max(0, Math.round(h.calories || 0)), 0);
  const workoutKcal = sum(workoutHist);
  const yogaKcal = sum(yogaHist);
  const activeDays = new Set([...workoutHist, ...yogaHist].map((h) => h.date)).size;
  const movement: MovementInsight = {
    workouts: workoutHist.length,
    yoga: yogaHist.length,
    totalSessions: workoutHist.length + yogaHist.length,
    totalKcal: workoutKcal + yogaKcal,
    workoutKcal,
    yogaKcal,
    activeDays,
    weekly: weeklyBurn([...workoutHist, ...yogaHist], weeks),
  };

  // ── Symptoms (only what she logged) ──
  const symptomCounts = new Map<string, number>();
  let symptomTotal = 0;
  let symptomDays = 0;
  for (const labels of Object.values(symptomsLog)) {
    if (!Array.isArray(labels) || !labels.length) continue;
    symptomDays++;
    for (const l of labels) {
      symptomCounts.set(l, (symptomCounts.get(l) ?? 0) + 1);
      symptomTotal++;
    }
  }
  const symptomsByLabel: Counted[] = [...symptomCounts.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count);
  const symptomsDaily: SymptomDay[] = Object.entries(symptomsLog)
    .filter(([, labels]) => Array.isArray(labels) && labels.length)
    .map(([date, labels]) => ({ date, labels }))
    .sort((a, b) => (a.date < b.date ? -1 : 1));

  // ── Mood (only what she logged) ──
  const moodEntries = Object.entries(moodLog).filter(([, m]) => !!m);
  const moodSeries: MoodPoint[] = moodEntries
    .sort((a, b) => (a[0] < b[0] ? -1 : 1))
    .map(([date, mood]) => ({ date, mood, score: moodValence(mood) }));
  const moodCountMap = new Map<string, number>();
  for (const [, m] of moodEntries) moodCountMap.set(m, (moodCountMap.get(m) ?? 0) + 1);
  const moodByMood: Counted[] = [...moodCountMap.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count);
  const avgScore = moodSeries.length
    ? Math.round((moodSeries.reduce((s, p) => s + p.score, 0) / moodSeries.length) * 10) / 10
    : null;

  // ── Weight ──
  const wSeries = (profile.weightHistory ?? [])
    .filter((w) => w && w.date && typeof w.kg === "number")
    .sort((a, b) => (a.date < b.date ? -1 : 1));
  const startKg = wSeries.length
    ? wSeries[0].kg
    : typeof profile.weight === "number"
      ? profile.weight
      : null;
  const currentKg = wSeries.length ? wSeries[wSeries.length - 1].kg : startKg;
  const weight: WeightInsight = {
    series: wSeries,
    startKg,
    currentKg,
    changeKg:
      startKg != null && currentKg != null ? Math.round((currentKg - startKg) * 10) / 10 : null,
    goal:
      profile.goal === "lose" || profile.goal === "gain" || profile.goal === "maintain"
        ? profile.goal
        : "maintain",
    targetKg: typeof profile.targetWeight === "number" ? profile.targetWeight : null,
  };

  // ── Nourishment (real meal-logging consistency) ──
  const eatenEntries = Object.entries(eaten).filter(
    ([, slots]) => Array.isArray(slots) && slots.length,
  );
  const nourish: NourishInsight = {
    daysLogged: eatenEntries.length,
    mealsLogged: eatenEntries.reduce((s, [, slots]) => s + slots.length, 0),
    daysFullLogged: eatenEntries.filter(([, slots]) => slots.length >= 3).length,
  };

  // ── Sleep (only what she logged) ──
  const sleepLog = readSleepLog();
  const sleepSeries: SleepDay[] = Object.entries(sleepLog)
    .filter(([, e]) => e && typeof e.q === "number")
    .map(([date, e]) => ({
      date,
      quality: e.q,
      hours: typeof e.h === "number" ? e.h : undefined,
    }))
    .sort((a, b) => (a.date < b.date ? -1 : 1));
  const hoursOnly = sleepSeries.filter((d) => typeof d.hours === "number");
  const sleep: SleepInsight = {
    days: sleepSeries.length,
    avgQuality: sleepSeries.length
      ? Math.round((sleepSeries.reduce((s, d) => s + d.quality, 0) / sleepSeries.length) * 10) / 10
      : null,
    avgHours: hoursOnly.length
      ? Math.round(
          (hoursOnly.reduce((s, d) => s + (d.hours as number), 0) / hoursOnly.length) * 10,
        ) / 10
      : null,
    series: sleepSeries,
  };

  // ── Tracking-since (earliest real event across every store) ──
  const trackingSince = earliest(
    workoutHist.map((h) => h.date),
    yogaHist.map((h) => h.date),
    Object.keys(symptomsLog),
    Object.keys(moodLog),
    Object.keys(eaten),
    wSeries.map((w) => w.date),
    sleepSeries.map((d) => d.date),
    periodStarts,
  );
  const daysTracked = trackingSince
    ? Math.floor((toTime(todayISO()) - toTime(trackingSince)) / MS_DAY) + 1
    : 0;

  // ── Per-day detail for the interactive charts ──
  const workoutDaily = dailyBurn(workoutHist, "Workout");
  const yogaDaily = dailyBurn(yogaHist, "Yoga flow");
  const cycles = buildCycles(periodStarts);

  // ── Phase timeline + by-phase summary (drives the combined chart) ──
  // Phase BANDS are derived cycle-math, so when she hasn't confirmed real starts
  // yet we anchor them on her cycle setup (predicted) — this keeps the "cycle ×
  // your body" overlay present, and it snaps to her real starts once confirmed.
  // (Cycle COUNT stats stay honest — only the bands fall back.)
  const range = trackingSince ? { startISO: trackingSince, endISO: todayISO() } : null;
  const segStarts =
    periodStarts.length || !range ? periodStarts : syntheticStarts(range.startISO, range.endISO);
  const phaseSegments = range ? buildPhaseSegments(range.startISO, range.endISO, segStarts) : [];

  // ── Planned vs logged calories (real plan × real eaten ticks); the planned
  //    reference now spans the whole tracking window, not just logged days. ──
  const nutrition = buildNutrition(eaten, range?.startISO ?? null, range?.endISO ?? null);
  const byPhase = buildByPhase(
    segStarts,
    moodSeries,
    workoutDaily,
    yogaDaily,
    symptomsDaily,
    sleepSeries,
  );

  const patterns = buildPatterns({
    weight,
    workoutDaily,
    yogaDaily,
    moodSeries,
    moodTop: moodByMood.length ? titleCase(moodByMood[0].label) : null,
    moodAvg: avgScore,
    symptomsDaily,
    symptomsTop: symptomsByLabel[0] ?? null,
    sleep,
    nutrition,
    cycles,
    avgCycle: cycle.avgLength,
    regularity: cycle.regularity,
    byPhase,
  });

  return {
    trackingSince,
    daysTracked,
    range,
    cycle: { ...cycle, cycles },
    movement: { ...movement, workoutDaily, yogaDaily },
    symptoms: {
      total: symptomTotal,
      days: symptomDays,
      byLabel: symptomsByLabel,
      daily: symptomsDaily,
    },
    mood: { days: moodSeries.length, series: moodSeries, byMood: moodByMood, avgScore },
    weight,
    nourish,
    nutrition,
    sleep,
    phaseSegments,
    byPhase,
    patterns,
  };
}

/** Pretty date for headers/reports (e.g. "7 Jul 2026"). */
export function prettyDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso + "T00:00:00");
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

/** Title-case a mood key for display ("energetic" → "Energetic"). */
export function titleCase(s: string): string {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}
