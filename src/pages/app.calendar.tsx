import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import {
  ChevronLeft, ChevronRight, ChevronDown, X, Sparkles, Lightbulb,
  Droplet, Sprout, Star, Moon, Circle,
  Dumbbell, PersonStanding, BookOpen, CalendarClock, Bell, Soup, Heart, Droplets, Cake, Plane,
  ArrowRight,
  type LucideIcon,
} from "lucide-react";
import {
  PHASE_META, type Phase,
} from "@/components/bloom/CycleTracker";
import { phaseForDay, readCycleSettings, PHASE_LABEL } from "@/components/bloom/cyclePhase";
import { CyclePhasePill } from "@/components/bloom/CyclePhasePill";
import type { CycleSettings } from "@/components/bloom/PeriodSetup";
import {
  STORAGE_KEYS as REMINDER_STORAGE_KEYS, type Reminder,
} from "./app.tools.notes";
import {
  SCHEDULE_KEY as YOGA_SCHEDULE_KEY, REMINDER_KEY as YOGA_REMINDER_KEY,
} from "./app.tools.yoga";
import {
  DIARY_STORAGE_KEY, moodMeta, type DiaryEntry,
} from "./app.tools.diary";
import {
  WORKOUT_LOG_KEY, type HistoryEntry,
} from "./app.tools.workout";
import { MEALS_PLAN_KEY } from "./app.tools.meals";
import { RECIPES, recipeImageSrc } from "@/components/bloom/recipes/data";
import { readWorkoutPlanDays, readMealPlan } from "@/lib/crossToolData";
import { TODAY_WATER_KEY } from "./app.today";

function pad2(n: number) { return String(n).padStart(2, "0"); }
function fmtLocalDate(d: Date) { return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`; }
function parseLocalDate(s?: string): Date | null {
  if (!s) return null;
  const [y, m, d] = s.split("-").map((n) => parseInt(n, 10));
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}
function addDays(d: Date, n: number) {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}
function startOfDay(d: Date) { return new Date(d.getFullYear(), d.getMonth(), d.getDate()); }
function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}
/** Monday-first week start, matching the Yoga organizer's day labels. */
function startOfWeek(d: Date) {
  const day = d.getDay(); // 0=Sun..6=Sat
  const diff = (day === 0 ? -6 : 1) - day;
  return addDays(startOfDay(d), diff);
}
/** Yoga's organizer grid uses Mon-first 3-letter labels — translate from JS's Sun-first getDay(). */
function mondayFirstLabel(date: Date) {
  return ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][date.getDay()];
}
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

/** 1-indexed day-of-cycle for a given date, matching phaseForDay's math. */
function cycleDayForDate(date: Date, s: CycleSettings) {
  const ms = 1000 * 60 * 60 * 24;
  const diff = Math.floor((date.getTime() - s.lastPeriodStart.getTime()) / ms);
  const day = ((diff % s.cycleLength) + s.cycleLength) % s.cycleLength;
  return day + 1;
}

interface PlanningItem {
  id: string;
  time?: string;
  emoji: string;
  label: string;
  category: string;
  sourceLabel: string;
  sourceHref: string;
}

/** Calendar Key categories — order here drives the legend order too. */
const CATEGORY_META: Record<string, { label: string; Icon: LucideIcon; chip: string; cell?: string }> = {
  period:      { label: "Period",           Icon: Droplet,        chip: "bg-rose-100 text-rose-600",       cell: "bg-rose-50 border-rose-200" },
  fertile:     { label: "Fertile Window",   Icon: Sprout,         chip: "bg-amber-100 text-amber-600",     cell: "bg-amber-50 border-amber-200" },
  ovulation:   { label: "Ovulation",        Icon: Star,           chip: "bg-fuchsia-100 text-fuchsia-600", cell: "bg-fuchsia-50 border-fuchsia-200" },
  luteal:      { label: "Luteal Phase",     Icon: Moon,           chip: "bg-violet-100 text-violet-600",   cell: "bg-violet-50 border-violet-200" },
  follicular:  { label: "Follicular Phase", Icon: Circle,         chip: "bg-sky-100 text-sky-600",         cell: "bg-sky-50 border-sky-200" },
  workout:     { label: "Workout",          Icon: Dumbbell,       chip: "bg-orange-100 text-orange-600" },
  yoga:        { label: "Yoga",             Icon: PersonStanding, chip: "bg-teal-100 text-teal-600" },
  journal:     { label: "Journal",          Icon: BookOpen,       chip: "bg-indigo-100 text-indigo-600" },
  appointment: { label: "Appointment",      Icon: CalendarClock,  chip: "bg-sky-100 text-sky-700" },
  reminder:    { label: "Reminder",         Icon: Bell,           chip: "bg-yellow-100 text-yellow-700" },
  mealplan:    { label: "Meal Plan",        Icon: Soup,           chip: "bg-lime-100 text-lime-700" },
  selfcare:    { label: "Self Care",        Icon: Heart,          chip: "bg-pink-100 text-pink-600" },
  water:       { label: "Water Goal",       Icon: Droplets,       chip: "bg-cyan-100 text-cyan-600" },
  birthday:    { label: "Birthday",         Icon: Cake,           chip: "bg-fuchsia-100 text-fuchsia-600" },
  vacation:    { label: "Vacation",         Icon: Plane,          chip: "bg-blue-100 text-blue-600",       cell: "bg-blue-50 border-blue-200" },
};

/** Maps a Reminders "event" sub-category onto a Calendar Key category. */
function eventCategoryToCal(cat: string): string {
  if (cat === "vacation") return "vacation";
  if (cat === "social") return "selfcare";
  return "appointment";
}

/** A filter chip may cover several item categories (e.g. "reminder" covers
 *  medication reminders, appointments and birthdays — all from the Reminders
 *  tool). This maps a chip key to the categories it should match. */
const FILTER_GROUPS: Record<string, string[]> = {
  reminder: ["reminder", "appointment", "birthday"],
};
function filterMatch(category: string, filter: string): boolean {
  return (FILTER_GROUPS[filter] ?? [filter]).includes(category);
}

function phaseItemsForDate(date: Date): PlanningItem[] {
  const phase = phaseForDay(date, readCycleSettings());
  const dateStr = fmtLocalDate(date);
  if (phase === "period") {
    return [{ id: `phase:${dateStr}`, emoji: "🩸", label: "Period", category: "period", sourceLabel: "Open Cycle Tracker →", sourceHref: "/app/tools/cycle" }];
  }
  if (phase === "ovulation") {
    return [{ id: `phase:${dateStr}`, emoji: "⭐", label: "Ovulation", category: "ovulation", sourceLabel: "Open Cycle Tracker →", sourceHref: "/app/tools/cycle" }];
  }
  return [];
}

function remindersForDate(reminders: Reminder[], date: Date): PlanningItem[] {
  const items: PlanningItem[] = [];
  const weekday = date.getDay();
  const dateStr = fmtLocalDate(date);
  for (const rem of reminders) {
    if (rem.kind === "event") {
      const start = parseLocalDate(rem.date);
      const end = parseLocalDate(rem.endDate) ?? start;
      if (start && end && date >= start && date <= end) {
        const category = eventCategoryToCal(rem.category);
        const emoji = category === "vacation" ? "✈️" : category === "selfcare" ? "💖" : "📅";
        items.push({
          id: `${rem.id}:${dateStr}`, time: rem.time, emoji, category,
          label: rem.title, sourceLabel: "Edit in Reminders →", sourceHref: "/app/tools/notes",
        });
      }
    } else if (rem.kind === "birthday") {
      const anchor = parseLocalDate(rem.date);
      if (anchor && anchor.getMonth() === date.getMonth() && anchor.getDate() === date.getDate()) {
        items.push({
          id: `${rem.id}:${dateStr}`, time: rem.time, emoji: "🎂", category: "birthday",
          label: `${rem.title}'s birthday`, sourceLabel: "Edit in Reminders →", sourceHref: "/app/tools/notes",
        });
      }
    } else if (rem.kind === "medication") {
      const recurs = rem.weekdays.length === 0 || rem.weekdays.includes(weekday);
      if (recurs) {
        const slots = rem.times.length ? rem.times : ["09:00"];
        for (const slot of slots) {
          items.push({
            id: `${rem.id}:${dateStr}:${slot}`, time: slot, emoji: "💊", category: "reminder",
            label: rem.title, sourceLabel: "Edit in Reminders →", sourceHref: "/app/tools/notes",
          });
        }
      }
    }
  }
  return items;
}

function yogaForDate(schedule: Record<string, string | null>, reminder: string, date: Date): PlanningItem[] {
  const focus = schedule[mondayFirstLabel(date)];
  if (!focus) return [];
  return [{
    id: `yoga:${fmtLocalDate(date)}`, time: reminder, emoji: "🧘", category: "yoga",
    label: `${focus} flow`, sourceLabel: "Edit in Yoga Flows →", sourceHref: "/app/tools/yoga",
  }];
}

function workoutForDate(history: HistoryEntry[], date: Date): PlanningItem[] {
  const dateStr = fmtLocalDate(date);
  return history
    .filter((h) => h.date === dateStr)
    .map((h) => ({
      id: `workout:${dateStr}:${h.sessionName}`, emoji: "🏋️", category: "workout",
      label: h.sessionName || "Workout", sourceLabel: "Open Workout →", sourceHref: "/app/tools/workout",
    }));
}

/** A workout the user has *planned* for this weekday (from the Workout program),
 *  shown on the calendar like the yoga schedule. Skipped when a workout is
 *  already logged that day so it isn't duplicated. */
function plannedWorkoutForDate(planDays: string[], history: HistoryEntry[], date: Date): PlanningItem[] {
  const dateStr = fmtLocalDate(date);
  if (history.some((h) => h.date === dateStr)) return [];
  if (!planDays.includes(mondayFirstLabel(date))) return [];
  return [{
    id: `workout-plan:${dateStr}`, time: "17:30", emoji: "🏋️", category: "workout",
    label: "Workout", sourceLabel: "Open Workout →", sourceHref: "/app/tools/workout",
  }];
}

function mealForDate(plan: Record<string, Record<string, string | null>>, date: Date): PlanningItem[] {
  const dayPlan = plan[mondayFirstLabel(date)];
  if (!dayPlan) return [];
  const hasAny = Object.values(dayPlan).some(Boolean);
  if (!hasAny) return [];
  return [{
    id: `meal:${fmtLocalDate(date)}`, emoji: "🥣", category: "mealplan",
    label: "Meal plan", sourceLabel: "Open Meal Plan →", sourceHref: "/app/tools/meals",
  }];
}

function journalForDate(entries: DiaryEntry[], date: Date): PlanningItem[] {
  const dateStr = fmtLocalDate(date);
  if (!entries.some((e) => e.date === dateStr)) return [];
  return [{
    id: `journal:${dateStr}`, emoji: "📔", category: "journal",
    label: "Journal entry", sourceLabel: "Open Diary →", sourceHref: "/app/tools/diary",
  }];
}

function waterTodayItem(today: Date, date: Date, water: { date: string; count: number }): PlanningItem[] {
  if (!sameDay(date, today) || water.count <= 0) return [];
  return [{
    id: `water:${fmtLocalDate(date)}`, emoji: "💧", category: "water",
    label: `Water: ${water.count}/3`, sourceLabel: "Open Today →", sourceHref: "/app/today",
  }];
}

function moodForDate(entries: DiaryEntry[], date: Date) {
  const dateStr = fmtLocalDate(date);
  const matches = entries.filter((e) => e.date === dateStr);
  if (!matches.length) return null;
  // Legacy diary entries can miss createdAt — coerce so the sort never throws.
  matches.sort((a, b) => String(b.createdAt ?? "").localeCompare(String(a.createdAt ?? "")));
  return moodMeta(matches[0].mood);
}

function suggestionFor(phase: Phase, items: PlanningItem[]): string {
  const hasMed = items.some((i) => i.category === "reminder");
  const hasYoga = items.some((i) => i.category === "yoga");
  if (phase === "period") return hasYoga ? "Low-energy day — maybe swap today's flow for something gentle and restorative 🌷" : "Low-energy day — a warm drink, a soft blanket, and rest are more than enough 🌷";
  if (phase === "ovulation" || phase === "fertile") return hasYoga ? "Energy's peaking ✨ — perfect day to really feel that flow in your body" : "Energy's peaking ✨ — a great day to tackle that thing you've been putting off";
  if (phase === "luteal") return hasMed ? "Cravings and moods may run stronger today — and don't forget your dose 💊" : "Cravings and moods may run stronger today — a grounding routine can help 🌙";
  if (phase === "follicular") return "Fresh energy rising 🌱 — a lovely day to start something new";
  if (hasMed) return "Just a gentle nudge — don't forget your dose today 💊";
  return "An open, calm day — make it sweet ✿";
}

const STORAGE = {
  reminders: REMINDER_STORAGE_KEYS.reminders,
  yogaSchedule: YOGA_SCHEDULE_KEY,
  yogaReminder: YOGA_REMINDER_KEY,
  diary: DIARY_STORAGE_KEY,
  workout: WORKOUT_LOG_KEY,
  mealsPlan: MEALS_PLAN_KEY,
  water: TODAY_WATER_KEY,
};

function loadJSON<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

/** Aurora bloom glow — a few big, soft, blurred pink orbs that slowly drift and
 *  breathe behind the content. Dreamy and elegant; never competes with text.
 *  Drop it as the first child of a `relative overflow-hidden` container. */
function AuroraGlow() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      <div
        className="animate-bloom-aurora absolute -top-16 -left-10 h-56 w-56 rounded-full blur-3xl"
        style={{ background: "radial-gradient(circle, rgba(255,255,255,0.22), transparent 70%)" }}
      />
      <div
        className="animate-bloom-aurora absolute top-1/4 right-[-4rem] h-72 w-72 rounded-full blur-3xl"
        style={{ background: "radial-gradient(circle, rgba(255,190,224,0.4), transparent 70%)", animationDelay: "-6s", animationDuration: "26s" }}
      />
      <div
        className="animate-bloom-aurora absolute bottom-[-5rem] left-1/3 h-64 w-64 rounded-full blur-3xl"
        style={{ background: "radial-gradient(circle, rgba(255,255,255,0.28), transparent 70%)", animationDelay: "-12s", animationDuration: "30s" }}
      />
    </div>
  );
}

export default function CalendarPage() {
  const [view, setView] = useState<"month" | "week" | "today">("month");
  const [cursor, setCursor] = useState(() => new Date());
  const [selected, setSelected] = useState<Date | null>(null);
  const [hiddenCats, setHiddenCats] = useState<Set<string>>(new Set());
  const [activeFilter, setActiveFilter] = useState<string | null>(null);

  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [yogaSchedule, setYogaSchedule] = useState<Record<string, string | null>>({});
  const [yogaReminder, setYogaReminder] = useState("07:30");
  const [diaryEntries, setDiaryEntries] = useState<DiaryEntry[]>([]);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [workoutPlanDays, setWorkoutPlanDays] = useState<string[]>([]);
  const [mealsPlan, setMealsPlan] = useState<Record<string, Record<string, string | null>>>({});
  const [water, setWater] = useState<{ date: string; count: number }>({ date: "", count: 0 });

  useEffect(() => {
    setReminders(loadJSON<Reminder[]>(STORAGE.reminders, []));
    setYogaSchedule(loadJSON<Record<string, string | null>>(STORAGE.yogaSchedule, {}));
    try {
      const r = localStorage.getItem(STORAGE.yogaReminder);
      if (r) setYogaReminder(r);
    } catch {}
    setDiaryEntries(loadJSON<DiaryEntry[]>(STORAGE.diary, []));
    setHistory(loadJSON<HistoryEntry[]>(STORAGE.workout, []));
    setWorkoutPlanDays(readWorkoutPlanDays());
    setMealsPlan(readMealPlan()); // current week of the 4-week month
    setWater(loadJSON<{ date: string; count: number }>(STORAGE.water, { date: "", count: 0 }));
  }, []);

  const today = startOfDay(new Date());

  const planningFor = useCallback((date: Date): PlanningItem[] => {
    const items = [
      ...phaseItemsForDate(date),
      ...remindersForDate(reminders, date),
      ...yogaForDate(yogaSchedule, yogaReminder, date),
      ...workoutForDate(history, date),
      ...plannedWorkoutForDate(workoutPlanDays, history, date),
      ...mealForDate(mealsPlan, date),
      ...journalForDate(diaryEntries, date),
      ...waterTodayItem(today, date, water),
    ];
    items.sort((a, b) => (a.time ?? "99:99").localeCompare(b.time ?? "99:99"));
    return items;
  }, [reminders, yogaSchedule, yogaReminder, history, workoutPlanDays, mealsPlan, diaryEntries, water, today]);

  const weekDays = useMemo(() => {
    const start = startOfWeek(cursor);
    return Array.from({ length: 7 }, (_, i) => addDays(start, i));
  }, [cursor]);

  const monthCells = useMemo(() => {
    const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
    const startWeekday = (first.getDay() + 6) % 7; // Monday-first
    const totalDays = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate();
    const cells: { date: Date; inMonth: boolean }[] = [];
    for (let i = startWeekday; i > 0; i--) cells.push({ date: addDays(first, -i), inMonth: false });
    for (let d = 1; d <= totalDays; d++) cells.push({ date: new Date(cursor.getFullYear(), cursor.getMonth(), d), inMonth: true });
    while (cells.length % 7 !== 0) cells.push({ date: addDays(cells[cells.length - 1].date, 1), inMonth: false });
    return cells;
  }, [cursor]);

  const monthStats = useMemo(() => {
    const year = cursor.getFullYear(), month = cursor.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    let workouts = 0, yogaCount = 0, journalCount = 0, reminderCount = 0;
    for (let d = 1; d <= daysInMonth; d++) {
      const items = planningFor(new Date(year, month, d));
      if (items.some((i) => i.category === "workout")) workouts++;
      if (items.some((i) => i.category === "yoga")) yogaCount++;
      if (items.some((i) => i.category === "journal")) journalCount++;
      reminderCount += items.filter((i) => filterMatch(i.category, "reminder")).length;
    }
    let vacation: { start: Date; end: Date } | null = null;
    for (const rem of reminders) {
      if (rem.kind === "event" && rem.category === "vacation") {
        const start = parseLocalDate(rem.date);
        const end = parseLocalDate(rem.endDate) ?? start;
        if (start && end && start.getFullYear() === year && start.getMonth() === month) {
          vacation = { start, end };
        }
      }
    }
    const phase = phaseForDay(today, readCycleSettings());
    const cycleDay = cycleDayForDate(today, readCycleSettings());
    return { workouts, yogaCount, journalCount, reminderCount, vacation, phase, cycleDay };
  }, [cursor, planningFor, reminders, today]);

  const goToday = () => setCursor(new Date());
  const goPrev = () => {
    if (view === "week") setCursor((c) => addDays(c, -7));
    else setCursor((c) => new Date(c.getFullYear(), c.getMonth() - 1, 1));
  };
  const goNext = () => {
    if (view === "week") setCursor((c) => addDays(c, 7));
    else setCursor((c) => new Date(c.getFullYear(), c.getMonth() + 1, 1));
  };
  const toggleCat = (key: string) => setHiddenCats((prev) => {
    const next = new Set(prev);
    if (next.has(key)) next.delete(key); else next.add(key);
    return next;
  });
  const toggleFilter = (key: string) => setActiveFilter((prev) => (prev === key ? null : key));

  const rangeLabel = useMemo(() => {
    if (view === "week") {
      const first = weekDays[0], last = weekDays[6];
      const sameMonth = first.getMonth() === last.getMonth();
      return sameMonth
        ? `${MONTHS[first.getMonth()]} ${first.getDate()}–${last.getDate()}`
        : `${MONTHS[first.getMonth()].slice(0, 3)} ${first.getDate()} – ${MONTHS[last.getMonth()].slice(0, 3)} ${last.getDate()}`;
    }
    return `${MONTHS[cursor.getMonth()]} ${cursor.getFullYear()}`;
  }, [view, cursor, weekDays]);

  return (
    <div className="relative isolate animate-fade-in">
      {/* Base pink wash — the top reads as one soft surface behind the hero. */}
      <div aria-hidden className="pointer-events-none absolute left-1/2 -translate-x-1/2 w-screen -top-8 -z-20 h-[760px] bg-gradient-to-b from-[#FFD3E8] via-[#FFE4F1] to-transparent" />

      {/* Hero photo as ONE blended page BACKGROUND — same technique as the Today
          page: a full-width image that fades on the left (so the title stays
          readable) and the bottom (melting into the calendar below), so there's
          no card seam. `isolate` on the root keeps this -z layer in place. */}
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 -translate-x-1/2 w-screen -top-8 -z-10 h-[640px] overflow-hidden"
        style={{
          // Alpha-dissolve the photo toward the bottom (not an opaque colour band)
          // so it melts into the real page background with no hard seam — same tall,
          // soft blend as the Today page.
          WebkitMaskImage: "linear-gradient(to bottom, #000 0%, #000 45%, transparent 100%)",
          maskImage: "linear-gradient(to bottom, #000 0%, #000 45%, transparent 100%)",
        }}
      >
        <img src="/images/calendar-hero.webp" alt="" className="animate-hero-breathe h-full w-full object-cover object-[82%_28%]" referrerPolicy="no-referrer" />
        {/* left fade → readable light pink behind the title */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#FFE4F1] via-[#FFE4F1]/55 to-transparent" />
      </div>

      {/* ── HERO — transparent; the photo lives in the blended background above. ── */}
      <section className="relative -mx-3 sm:-mx-6 md:-mx-8 -mt-3 sm:-mt-5 md:-mt-8 min-h-[140px] sm:min-h-[180px] mb-3 animate-card-pop-in" style={{ animationDelay: "0ms" }}>
        <div className="relative z-[1] px-4 pt-5 pb-3 sm:px-8 sm:pt-7 sm:pb-4">
          {/* Title + subtitle + phase pill (left) · Today / prev / next (right) */}
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 w-[64%] sm:max-w-md">
              <h1 className="animate-fade-in font-script text-3xl sm:text-5xl lg:text-6xl text-hotpink leading-none whitespace-nowrap drop-shadow-[0_2px_6px_oklch(1_0_0/0.55)]">
                Bloom Calendar
              </h1>
              <p className="animate-fade-in mt-0.5 text-xs sm:text-sm font-semibold text-rose/80 leading-snug whitespace-nowrap" style={{ animationDelay: "150ms" }}>
                Your life, beautifully planned.
              </p>
              <CyclePhasePill className="mt-1.5" />
            </div>
            <div className="animate-fade-in shrink-0 flex items-center gap-1" style={{ animationDelay: "220ms" }}>
              <button onClick={goToday} className="rounded-full bg-white/70 backdrop-blur border border-petal/60 px-2.5 py-1 text-[11px] font-bold text-hotpink shadow-sm transition hover:bg-white active:scale-95">
                Today
              </button>
              <button onClick={goPrev} aria-label="Previous" className="grid h-7 w-7 place-items-center rounded-full bg-white/70 backdrop-blur border border-petal/60 text-hotpink shadow-sm transition hover:bg-white active:scale-95">
                <ChevronLeft className="h-3.5 w-3.5" />
              </button>
              <button onClick={goNext} aria-label="Next" className="grid h-7 w-7 place-items-center rounded-full bg-white/70 backdrop-blur border border-petal/60 text-hotpink shadow-sm transition hover:bg-white active:scale-95">
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
      </section>

      <div className="flex items-center justify-between mb-3 px-1">
        <p className="text-sm font-bold text-hotpink inline-flex items-center gap-1">
          {rangeLabel} <ChevronDown className="h-3.5 w-3.5 opacity-50" />
        </p>
        <div className="inline-flex rounded-full bg-white/80 border border-petal/60 p-1 shadow-sm">
          {(["month", "week", "today"] as const).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={["px-3 py-1 rounded-full text-[11px] font-bold capitalize transition",
                view === v ? "bg-hotpink text-white shadow shadow-hotpink/30" : "text-rose hover:bg-blush/60"].join(" ")}
            >
              {v}
            </button>
          ))}
        </div>
      </div>

      {/* Quick filters — just above the calendar */}
      <FilterBar stats={monthStats} activeFilter={activeFilter} onToggle={toggleFilter} />

      {view === "week" && (
        <WeekView
          days={weekDays}
          today={today}
          planningFor={planningFor}
          hiddenCats={hiddenCats}
          activeFilter={activeFilter}
          moodFor={(d) => moodForDate(diaryEntries, d)}
          onSelect={setSelected}
        />
      )}
      {view === "month" && (
        <MonthGrid
          cells={monthCells}
          today={today}
          planningFor={planningFor}
          hiddenCats={hiddenCats}
          activeFilter={activeFilter}
          onSelect={setSelected}
        />
      )}
      {view === "today" && (
        <TodayView
          today={today}
          mealsPlan={mealsPlan}
          reminders={reminders}
          yogaSchedule={yogaSchedule}
          yogaReminder={yogaReminder}
          history={history}
          workoutPlanDays={workoutPlanDays}
        />
      )}

      <CalendarKey hiddenCats={hiddenCats} onToggle={toggleCat} />

      <div className="mt-4 rounded-2xl bg-blush/40 border border-petal/50 p-3.5 flex items-start gap-2.5">
        <Lightbulb className="h-4 w-4 text-hotpink shrink-0 mt-0.5" />
        <p className="text-xs text-[#831843] leading-snug">
          All your plans, sessions, reminders and cycle phases in one beautiful view 🌸
        </p>
      </div>

      {selected && (
        <DayDrawer
          date={selected}
          items={planningFor(selected)}
          mood={moodForDate(diaryEntries, selected)}
          onClose={() => setSelected(null)}
          mealsPlan={mealsPlan}
          reminders={reminders}
          yogaSchedule={yogaSchedule}
          yogaReminder={yogaReminder}
          history={history}
          workoutPlanDays={workoutPlanDays}
        />
      )}
    </div>
  );
}

function FilterBar({ stats, activeFilter, onToggle }: {
  stats: {
    workouts: number; yogaCount: number; journalCount: number; reminderCount: number;
    vacation: { start: Date; end: Date } | null; phase: Phase; cycleDay: number;
  };
  activeFilter: string | null;
  onToggle: (key: string) => void;
}) {
  const fmtRange = (start: Date, end: Date) => {
    const sameMonth = start.getMonth() === end.getMonth();
    return sameMonth
      ? `${MONTHS[start.getMonth()].slice(0, 3)} ${start.getDate()} – ${end.getDate()}`
      : `${MONTHS[start.getMonth()].slice(0, 3)} ${start.getDate()} – ${MONTHS[end.getMonth()].slice(0, 3)} ${end.getDate()}`;
  };

  const items: { key: string; Icon: LucideIcon; label: string }[] = [];
  // Phase is shown in the hero pill now, so the filter row is activities only.
  items.push({ key: "workout", Icon: Dumbbell, label: `${stats.workouts} Workout${stats.workouts === 1 ? "" : "s"}` });
  items.push({ key: "yoga", Icon: PersonStanding, label: `${stats.yogaCount} Yoga Session${stats.yogaCount === 1 ? "" : "s"}` });
  items.push({ key: "journal", Icon: BookOpen, label: `${stats.journalCount} Journal Entr${stats.journalCount === 1 ? "y" : "ies"}` });
  items.push({ key: "reminder", Icon: Bell, label: `${stats.reminderCount} Reminder${stats.reminderCount === 1 ? "" : "s"}` });
  if (stats.vacation) items.push({ key: "vacation", Icon: Plane, label: `Vacation · ${fmtRange(stats.vacation.start, stats.vacation.end)}` });

  return (
    <div className="overflow-x-auto scrollbar-hide pb-0.5 mb-2.5 -mx-1 px-1">
      <div className="flex items-center gap-1.5 w-max sm:w-auto md:flex-wrap animate-scroll-hint">
        {items.map((it, i) => {
          const active = activeFilter === it.key;
          return (
            <button
              key={it.key}
              onClick={() => onToggle(it.key)}
              className={["inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold whitespace-nowrap shrink-0 transition animate-card-pop-in",
                active ? "bg-hotpink text-white border-hotpink shadow-sm shadow-hotpink/30" : "bg-white/85 border-petal/60 text-[#831843] hover:bg-blush/60"].join(" ")}
              style={{ animationDelay: `${i * 0.05}s` }}
            >
              <it.Icon className={["h-3 w-3 shrink-0", active ? "text-white" : "text-hotpink"].join(" ")} />
              {it.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function ItemChip({ item }: { item: PlanningItem }) {
  const meta = CATEGORY_META[item.category];
  return (
    <div className="flex items-center gap-1.5 rounded-full bg-blush/50 border border-petal/50 px-2 py-1 text-[10px] font-semibold text-rose">
      {meta ? <meta.Icon className="h-3 w-3" /> : <span>{item.emoji}</span>}
      {item.time && <span className="text-rose/60">{item.time}</span>}
      <span className="truncate max-w-[8rem]">{item.label}</span>
    </div>
  );
}

function WeekView({
  days, today, planningFor, hiddenCats, activeFilter, moodFor, onSelect,
}: {
  days: Date[];
  today: Date;
  planningFor: (d: Date) => PlanningItem[];
  hiddenCats: Set<string>;
  activeFilter: string | null;
  moodFor: (d: Date) => ReturnType<typeof moodMeta> | null;
  onSelect: (d: Date) => void;
}) {
  return (
    <section className="relative overflow-hidden rounded-3xl backdrop-blur border border-petal/60 p-4 sm:p-6" style={{ background: "linear-gradient(135deg, #F9A8D4 0%, #F472B6 50%, #EC4899 100%)" }}>
      <AuroraGlow />
      <div className="relative z-[1] space-y-2.5">
        {activeFilter && !days.some((d) => planningFor(d).filter((it) => !hiddenCats.has(it.category)).some((it) => filterMatch(it.category, activeFilter))) && (
          <p className="text-center text-sm text-white py-6" style={{ textShadow: "0 1px 3px rgba(190,24,93,0.55)" }}>Nothing with this in view — try another week or filter ✿</p>
        )}
        {days.map((day, i) => {
          const phase = phaseForDay(day, readCycleSettings());
          const allItems = planningFor(day).filter((it) => !hiddenCats.has(it.category));
          const matches = !activeFilter || allItems.some((it) => filterMatch(it.category, activeFilter));
          if (activeFilter && !matches) return null; // show only days that have this item
          const items = activeFilter ? allItems.filter((it) => filterMatch(it.category, activeFilter)) : allItems;
          const mood = moodFor(day);
          const isToday = sameDay(day, today);
          return (
            <button
              key={fmtLocalDate(day)}
              onClick={() => onSelect(day)}
              className={["w-full text-left rounded-2xl border p-3 transition hover:shadow-md hover:shadow-hotpink/10 animate-card-pop-in",
                isToday ? "bg-blush/70 border-hotpink/40 ring-1 ring-hotpink/30" : "bg-white/90 border-petal/50",
                activeFilter ? "ring-2 ring-hotpink/50" : ""].join(" ")}
              style={{ animationDelay: `${i * 0.05}s` }}
            >
              <div className="flex items-center gap-2 flex-wrap">
                <span className={["grid h-9 w-9 shrink-0 place-items-center rounded-xl text-sm font-bold",
                  isToday ? "bg-hotpink text-white" : "bg-blush/70 text-rose"].join(" ")}>
                  {day.getDate()}
                </span>
                <span className="text-xs font-bold uppercase tracking-wide text-rose/70">
                  {day.toLocaleDateString(undefined, { weekday: "short" })}
                </span>
                <PhaseChip phase={phase} />
                {mood && (
                  <span className="ml-auto inline-flex items-center gap-1 text-rose/70" title={mood.label}>
                    <mood.Icon className="h-3.5 w-3.5" />
                  </span>
                )}
              </div>
              {items.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5 pl-11">
                  {items.map((item) => <ItemChip key={item.id} item={item} />)}
                </div>
              )}
            </button>
          );
        })}
      </div>
    </section>
  );
}

function MonthGrid({
  cells, today, planningFor, hiddenCats, activeFilter, onSelect,
}: {
  cells: { date: Date; inMonth: boolean }[];
  today: Date;
  planningFor: (d: Date) => PlanningItem[];
  hiddenCats: Set<string>;
  activeFilter: string | null;
  onSelect: (d: Date) => void;
}) {
  const dayLabels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  return (
    <section className="relative overflow-hidden rounded-3xl backdrop-blur border border-petal/60 p-3 sm:p-6" style={{ background: "linear-gradient(135deg, #F9A8D4 0%, #F472B6 50%, #EC4899 100%)" }}>
      <AuroraGlow />
      <div className="relative z-[1] grid grid-cols-7 gap-1 sm:gap-1.5 text-center mb-1.5">
        {dayLabels.map((d) => <p key={d} className="text-[9px] sm:text-[10px] lg:text-xs font-bold uppercase tracking-wider text-white" style={{ textShadow: "0 1px 3px rgba(190,24,93,0.55)" }}>{d}</p>)}
      </div>
      <div className="relative z-[1] grid grid-cols-7 gap-1 sm:gap-1.5">
        {cells.map((cell, i) => {
          const phase = phaseForDay(cell.date, readCycleSettings());
          const allItems = planningFor(cell.date).filter((it) => !hiddenCats.has(it.category));
          const isToday = sameDay(cell.date, today);
          const isVacation = allItems.some((it) => it.category === "vacation");
          const cellTone = isVacation ? CATEGORY_META.vacation.cell : CATEGORY_META[phase]?.cell;
          const matches = !activeFilter || allItems.some((it) => filterMatch(it.category, activeFilter));
          const items = activeFilter ? allItems.filter((it) => filterMatch(it.category, activeFilter)) : allItems;

          return (
            <button
              key={fmtLocalDate(cell.date)}
              onClick={() => onSelect(cell.date)}
              className={["min-h-[60px] sm:min-h-[78px] lg:min-h-[110px] rounded-[8px] sm:rounded-[10px] border flex flex-col items-stretch p-1 lg:p-2 gap-0.5 lg:gap-1 text-left transition hover:shadow-md hover:shadow-hotpink/10 overflow-hidden animate-card-pop-in",
                cellTone ?? "bg-white/90 border-petal/40",
                cell.inMonth ? "" : "opacity-40",
                activeFilter ? (matches ? "ring-2 ring-hotpink/60 shadow-md shadow-hotpink/20" : "opacity-15 grayscale") : ""].join(" ")}
              style={{ animationDelay: `${i * 0.015}s` }}
            >
              <span className={["text-[10px] sm:text-xs lg:text-sm font-bold leading-none shrink-0",
                isToday ? "grid h-4 w-4 sm:h-5 sm:w-5 lg:h-6 lg:w-6 place-items-center rounded-full bg-hotpink text-white" : "text-[#831843]"].join(" ")}>
                {cell.date.getDate()}
              </span>
              {items.length > 0 && (
                <div className="flex flex-col gap-px lg:gap-0.5 mt-0.5 overflow-hidden">
                  {items.slice(0, 3).map((item) => {
                    const meta = CATEGORY_META[item.category];
                    if (!meta) return null;
                    return (
                      <div key={item.id} title={item.label} className="flex items-center gap-0.5 lg:gap-1 overflow-hidden">
                        <span className={["grid h-2.5 w-2.5 sm:h-3 sm:w-3 lg:h-4 lg:w-4 place-items-center rounded-full shrink-0", meta.chip].join(" ")}>
                          <meta.Icon className="h-1.5 w-1.5 sm:h-2 sm:w-2 lg:h-2.5 lg:w-2.5" />
                        </span>
                        <span className="text-[6px] sm:text-[7px] lg:text-[10px] leading-tight truncate text-[#831843]">{item.label}</span>
                      </div>
                    );
                  })}
                  {items.length > 3 && <span className="text-[6px] sm:text-[7px] lg:text-[10px] font-bold text-rose/50 leading-none">+{items.length - 3} more</span>}
                </div>
              )}
            </button>
          );
        })}
      </div>
    </section>
  );
}

/** Today view — a detailed, image-rich look at everything planned for today:
 *  yoga, each planned meal (with macros), workout session details, reminders,
 *  and the day's planned calories. */
/** Matches the Today-page plan card: clean rounded image, title + meta, a
 *  time · phase chip row, and a soft-glowing pink arrow CTA (kept alive). */
function TodayCard({ href, image, title, meta, time, phaseLabel, delay = 0 }: {
  href: string; image: string; title: string; meta: string; time?: string; phaseLabel: string; delay?: number;
}) {
  return (
    <a href={href} style={{ animationDelay: `${delay}s` }} className="group flex items-center gap-3 sm:gap-4 rounded-3xl bg-white/90 backdrop-blur border border-petal/50 p-2.5 sm:p-3 transition hover:-translate-y-0.5 hover:shadow-md hover:shadow-hotpink/15 active:scale-[0.99] animate-card-pop-in">
      <div className="relative shrink-0 h-[68px] w-[68px] sm:h-[78px] sm:w-[78px] overflow-hidden rounded-2xl ring-1 ring-petal/60">
        <img src={image} alt="" className="h-full w-full object-cover" loading="lazy" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm sm:text-base font-bold text-[#831843] leading-snug truncate">{title}</p>
        <p className="mt-0.5 text-[11px] sm:text-xs text-rose/60 leading-snug">{meta}</p>
        <div className="mt-1 flex items-center gap-2">
          {time && <span className="text-[9px] font-semibold text-rose/40">{time}</span>}
          <span className="text-[9px] font-bold uppercase tracking-wider text-hotpink/55">✿ {phaseLabel} phase</span>
        </div>
      </div>
      <span className="shrink-0 grid h-9 w-9 place-items-center rounded-full bg-hotpink/10 text-hotpink animate-selected-glow transition group-hover:bg-hotpink group-hover:text-white group-active:scale-90">
        <ArrowRight className="h-4 w-4" strokeWidth={2.5} />
      </span>
    </a>
  );
}

/** The image-rich plan for ANY date — the exact same cards the Today view uses:
 *  each planned meal (photo + macros), the day's yoga flow, workouts (logged or
 *  planned) and reminders. Shared so the Today tab and the day pop-up never drift
 *  apart — curiosity about "what's my July 13 plan?" gets the full, pretty view. */
function DayPlanCards({ date, mealsPlan, reminders, yogaSchedule, yogaReminder, history, workoutPlanDays, startDelay = 0 }: {
  date: Date;
  mealsPlan: Record<string, Record<string, string | null>>;
  reminders: Reminder[];
  yogaSchedule: Record<string, string | null>;
  yogaReminder: string;
  history: HistoryEntry[];
  workoutPlanDays: string[];
  startDelay?: number;
}) {
  const dayName = mondayFirstLabel(date);
  const dayPlan = mealsPlan[dayName] || {};
  const SLOT_LABEL: Record<string, string> = { breakfast: "Breakfast", lunch: "Lunch", snack: "Snack", dinner: "Dinner" };
  const SLOT_TIME: Record<string, string> = { breakfast: "08:00", lunch: "13:00", snack: "16:00", dinner: "19:30" };
  const meals = (["breakfast", "lunch", "snack", "dinner"] as const)
    .map((slot) => { const rid = dayPlan[slot]; const r = rid ? RECIPES.find((x) => x.id === rid) : null; return r ? { slot, r } : null; })
    .filter((m): m is { slot: "breakfast" | "lunch" | "snack" | "dinner"; r: (typeof RECIPES)[number] } => !!m);
  const yogaFocus = yogaSchedule[dayName];
  const workouts = history.filter((h) => h.date === fmtLocalDate(date));
  // Show a planned workout (from the program) when nothing was logged that day.
  const plannedWorkout = !workouts.length && workoutPlanDays.includes(dayName);
  const dayReminders = remindersForDate(reminders, date);
  const phaseLabel = PHASE_LABEL[phaseForDay(date, readCycleSettings())];
  const empty = !meals.length && !yogaFocus && !workouts.length && !plannedWorkout && !dayReminders.length;
  let cardIdx = 0;
  const nextDelay = () => startDelay + cardIdx++ * 0.06;

  if (empty) {
    return (
      <div className="rounded-3xl bg-white/85 border border-petal/60 p-8 text-center text-sm text-rose/60">
        Nothing planned this day yet — open your tools to fill it ✿
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {yogaFocus && (
        <TodayCard href="/app/tools/yoga" image="/images/read-movement.webp" phaseLabel={phaseLabel} delay={nextDelay()}
          title={`${yogaFocus} flow`} time={yogaReminder} meta="Yoga · gentle movement" />
      )}

      {meals.map(({ slot, r }) => (
        <TodayCard key={slot} href="/app/tools/meals" image={recipeImageSrc(r)} phaseLabel={phaseLabel} delay={nextDelay()}
          title={r.name} time={SLOT_TIME[slot]}
          meta={`${SLOT_LABEL[slot]} · ${r.macros.calories} kcal · ${r.macros.protein}g protein`} />
      ))}

      {workouts.map((w, i) => (
        <TodayCard key={`w${i}`} href="/app/tools/workout" image="/images/workout-hero-session.webp" phaseLabel={phaseLabel} delay={nextDelay()}
          title={w.sessionName || "Workout"}
          meta={`Workout · ${w.durationMin} min · ${w.zone} focus · ${w.calories} kcal`} />
      ))}

      {plannedWorkout && (
        <TodayCard href="/app/tools/workout" image="/images/workout-hero-session.webp" phaseLabel={phaseLabel} delay={nextDelay()}
          title="Workout planned" time="17:30" meta="Workout · tap to start today's session" />
      )}

      {dayReminders.length > 0 && (
        <div className="rounded-3xl bg-white/85 backdrop-blur border border-petal/60 p-4 sm:p-5 animate-card-pop-in" style={{ animationDelay: `${nextDelay()}s` }}>
          <p className="text-xs font-bold uppercase tracking-wider text-hotpink mb-2 flex items-center gap-1.5"><Bell className="h-3.5 w-3.5" /> Reminders</p>
          <div className="space-y-2">
            {dayReminders.map((it) => (
              <a key={it.id} href={it.sourceHref} className="flex items-center gap-2.5 rounded-2xl bg-blush/40 border border-petal/50 p-2.5 hover:bg-blush/60 transition">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-hotpink/10 text-hotpink">
                  {(() => { const Ico = CATEGORY_META[it.category]?.Icon ?? Bell; return <Ico className="h-4 w-4" strokeWidth={2} />; })()}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-[#831843] truncate">{it.label}</p>
                  {it.time && <p className="text-[11px] text-rose/60">{it.time}</p>}
                </div>
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function TodayView({ today, mealsPlan, reminders, yogaSchedule, yogaReminder, history, workoutPlanDays }: {
  today: Date;
  mealsPlan: Record<string, Record<string, string | null>>;
  reminders: Reminder[];
  yogaSchedule: Record<string, string | null>;
  yogaReminder: string;
  history: HistoryEntry[];
  workoutPlanDays: string[];
}) {
  const dayName = mondayFirstLabel(today);
  const dayPlan = mealsPlan[dayName] || {};
  const plannedCalories = (["breakfast", "lunch", "snack", "dinner"] as const)
    .reduce((s, slot) => { const rid = dayPlan[slot]; const r = rid ? RECIPES.find((x) => x.id === rid) : null; return s + (r?.macros.calories ?? 0); }, 0);

  return (
    <div className="space-y-3.5">
      {/* Date header — standalone, NOT on the lined background */}
      <div className="rounded-3xl bg-white/85 backdrop-blur border border-petal/60 p-4 sm:p-5 flex items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-rose/50">{today.toLocaleDateString(undefined, { weekday: "long" })}</p>
          <h3 className="font-script text-3xl text-hotpink leading-none">{MONTHS[today.getMonth()]} {today.getDate()}</h3>
        </div>
        {plannedCalories > 0 && (
          <div className="text-center rounded-2xl bg-blush/50 border border-petal/50 px-3.5 py-1.5">
            <p className="font-script text-2xl text-hotpink leading-none">{plannedCalories}</p>
            <p className="text-[9px] font-bold uppercase tracking-wider text-rose/60">kcal planned</p>
          </div>
        )}
      </div>

      {/* Plans + reminders — the big section, on the soft moving-lines backdrop */}
      <section className="relative overflow-hidden rounded-3xl backdrop-blur border border-petal/60 p-3 sm:p-4" style={{ background: "linear-gradient(135deg, #F9A8D4 0%, #F472B6 50%, #EC4899 100%)" }}>
        <AuroraGlow />
        <div className="relative z-[1]">
          <DayPlanCards
            date={today} mealsPlan={mealsPlan} reminders={reminders}
            yogaSchedule={yogaSchedule} yogaReminder={yogaReminder}
            history={history} workoutPlanDays={workoutPlanDays}
          />
        </div>
      </section>
    </div>
  );
}

function CalendarKey({ hiddenCats, onToggle }: { hiddenCats: Set<string>; onToggle: (key: string) => void }) {
  return (
    <section className="mt-4 rounded-3xl bg-white/85 backdrop-blur border border-petal/60 p-4 sm:p-6">
      <p className="text-sm font-bold text-hotpink">Calendar Key</p>
      <p className="text-[11px] text-rose/60 mb-3">Tap an item to show/hide</p>
      <div className="flex flex-wrap gap-2">
        {Object.entries(CATEGORY_META).map(([key, meta], i) => {
          const hidden = hiddenCats.has(key);
          return (
            <button
              key={key}
              onClick={() => onToggle(key)}
              className={["inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-semibold transition animate-card-pop-in",
                hidden ? "opacity-40 border-petal/40 bg-white/50 text-rose/50" : ["border-transparent", meta.chip].join(" ")].join(" ")}
              style={{ animationDelay: `${i * 0.04}s` }}
            >
              <meta.Icon className="h-3 w-3" /> {meta.label}
            </button>
          );
        })}
      </div>
    </section>
  );
}

function PhaseChip({ phase }: { phase: Phase }) {
  if (!phase) return null;
  const meta = PHASE_META[phase];
  return (
    <span className={["inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide", meta.color].join(" ")}>
      <meta.Icon className="h-3 w-3" /> {meta.label}
    </span>
  );
}

function DayDrawer({
  date, items, mood, onClose, mealsPlan, reminders, yogaSchedule, yogaReminder, history, workoutPlanDays,
}: {
  date: Date;
  items: PlanningItem[];
  mood: ReturnType<typeof moodMeta> | null;
  onClose: () => void;
  mealsPlan: Record<string, Record<string, string | null>>;
  reminders: Reminder[];
  yogaSchedule: Record<string, string | null>;
  yogaReminder: string;
  history: HistoryEntry[];
  workoutPlanDays: string[];
}) {
  const phase = phaseForDay(date, readCycleSettings());
  const meta = phase ? PHASE_META[phase] : null;
  // Same planned-calories pill the Today view shows.
  const dayPlan = mealsPlan[mondayFirstLabel(date)] || {};
  const plannedCalories = (["breakfast", "lunch", "snack", "dinner"] as const)
    .reduce((s, slot) => { const rid = dayPlan[slot]; const r = rid ? RECIPES.find((x) => x.id === rid) : null; return s + (r?.macros.calories ?? 0); }, 0);

  // Portal to <body> so `fixed` centers on the real screen, not inside the
  // calendar column (a transformed/blurred parent would otherwise offset it).
  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-rose/30 backdrop-blur-sm animate-fade-in" onClick={onClose}>
      <div
        className="relative w-full max-w-lg max-h-[85vh] overflow-y-auto rounded-[2rem] bg-white/95 backdrop-blur-xl p-6 shadow-2xl shadow-hotpink/30 animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        <button onClick={onClose} aria-label="Close" className="absolute right-4 top-4 grid h-8 w-8 place-items-center rounded-full bg-blush/60 text-rose hover:bg-blush transition">
          <X className="h-4 w-4" />
        </button>

        <div className="flex items-start justify-between gap-3 pr-8">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-rose/60">
              {date.toLocaleDateString(undefined, { weekday: "long" })}
            </p>
            <h2 className="font-script text-3xl text-hotpink leading-tight">
              {MONTHS[date.getMonth()]} {date.getDate()}
            </h2>
          </div>
          {plannedCalories > 0 && (
            <div className="text-center shrink-0 rounded-2xl bg-blush/50 border border-petal/50 px-3.5 py-1.5">
              <p className="font-script text-2xl text-hotpink leading-none">{plannedCalories}</p>
              <p className="text-[9px] font-bold uppercase tracking-wider text-rose/60">kcal planned</p>
            </div>
          )}
        </div>

        {meta && (
          <div className={["mt-3 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wide", meta.color].join(" ")}>
            <meta.Icon className="h-3.5 w-3.5" /> {meta.label}
          </div>
        )}

        <div className="mt-4 rounded-2xl bg-blush/40 border border-petal/50 p-3.5 flex items-start gap-2.5">
          <Sparkles className="h-4 w-4 text-hotpink shrink-0 mt-0.5" />
          <p className="text-xs text-[#831843] leading-snug">{suggestionFor(phase, items)}</p>
        </div>

        <div className="mt-5">
          <p className="text-[10px] font-bold uppercase tracking-wider text-rose/60 mb-2">Plans this day</p>
          <DayPlanCards
            date={date} mealsPlan={mealsPlan} reminders={reminders}
            yogaSchedule={yogaSchedule} yogaReminder={yogaReminder}
            history={history} workoutPlanDays={workoutPlanDays}
          />
        </div>

        {mood && (
          <div className="mt-5">
            <p className="text-[10px] font-bold uppercase tracking-wider text-rose/60 mb-2">Mood that day</p>
            <a
              href="/app/tools/diary"
              className="flex items-center gap-3 rounded-2xl bg-white/80 border border-petal/50 p-3 hover:border-hotpink/40 transition group"
            >
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-blush/60 text-rose">
                <mood.Icon className="h-4.5 w-4.5" />
              </span>
              <p className="text-sm font-semibold text-[#831843] flex-1">{mood.label}</p>
              <span className="text-[11px] font-semibold text-hotpink opacity-70 group-hover:opacity-100 transition">Open Diary →</span>
            </a>
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
