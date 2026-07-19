import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  Sparkles, Flower2, Heart, ArrowRight, Sun, Moon, Smile, Cloud,
  CloudRain, Battery, Droplet, X, Settings2, Play, RefreshCw, Dumbbell,
  BookHeart, Check, Plus, Minus, Bell, BellOff, Pill, CalendarDays,
  ChevronDown, AlarmClock, Star, Activity, UtensilsCrossed, Apple,
  BookOpen, ChevronRight, Zap, Target, Lightbulb, Flame, Wheat, Leaf, Headphones, Repeat,
} from "lucide-react";
import { BloomBubbles } from "@/components/bloom/BloomBubbles";
import { AnimatedWords } from "@/components/bloom/AnimatedWords";
import { useSmartPopoverPosition } from "@/lib/useSmartPopover";
import { useAuth } from "@/contexts/AuthContext";
import { phaseForDay, readCycleSettings, broadcastCyclePhase, hasCycleSettings, PHASE_LABEL, toDietPhase, type CyclePhase } from "@/components/bloom/cyclePhase";
import { energyBalance } from "@/lib/nutritionTargets";
import { todayISO } from "@/lib/localDate";
import { stampWater } from "@/lib/dailyLog";
import { TodayEnergyStrip } from "@/components/bloom/diet/DietDashboard";
import { buildDayCoach } from "@/lib/todayCoach";
import { CoachTodayCompact } from "@/components/bloom/coach/CoachCards";
import { BuildBloomWorld } from "@/components/bloom/today/BuildBloomWorld";
import { PersonalizedBloomPreview } from "@/components/bloom/today/PersonalizedBloomPreview";
import { HydrationDashboard } from "@/components/bloom/today/HydrationDashboard";
import { PlusLock, DiscoverBloomPlus } from "@/components/bloom/premium/PremiumKit";
import { PHASE_PLAN as SHARED_PHASE_PLAN, LAUNCH_YOGA_KEY, LAUNCH_WORKOUT_KEY, LAUNCH_MEAL_KEY, DIARY_PROMPT_KEY, writeLaunch } from "@/components/bloom/phasePlan";
import { readWorkoutStreak, readYogaStreak, readTodayPlannedDay, readYogaPlanDays, readWorkoutPlanDays, hasMealPlan, hasMovementPlan, SYMPTOM_OPTIONS, readSymptomsForDay, toggleSymptomForDay, isPillTaken, setPillTaken as savePillTaken, readEatenToday, didWorkoutToday, didYogaToday, hasDiaryEntryToday } from "@/lib/crossToolData";
import { hasDietSetup } from "@/components/bloom/recipes/data";
import { startGuide, endGuide, isGuided } from "@/lib/guidedSetup";
import { SpotlightCoach } from "@/components/bloom/SpotlightCoach";
import { BloomDayCelebration } from "@/components/bloom/BloomDayCelebration";
import { RECIPES, PHASE_MICROS, recipeImageSrc } from "@/components/bloom/recipes/data";
import { ARTICLES } from "@/lib/readsData";
import { reasonForItem } from "@/lib/planReasoning";
import { AFFIRMATIONS } from "@/components/bloom/affirmations";
import {
  getCurrentUserId,
  doseConfirmToken,
  isPushSupported,
  subscribeToPush,
  syncScheduledNotifications,
  cancelScheduledNotifications,
  fetchWaterAcks,
} from "@/lib/push";

// ── Storage keys ────────────────────────────────────────────────────────────
const KEYS = {
  mood:           "bloom:today-mood",
  symptoms:       "bloom:today-symptoms",
  water:          "bloom:today-water",
  waterGoal:      "bloom:today-water-goal",
  waterReminders: "bloom:today-water-reminders",
  waterAcksSeen:  "bloom:today-water-acks-seen",
  plan:           "bloom:today-plan",
  affirmIdx:      "bloom:today-affirm-idx",
  streak:         "bloom:streak-days",
  pill:           "bloom:today-pill",
  reminders:      "bloom:reminders",
  bloomCelebrated:"bloom:today-bloom-celebrated",
} as const;

export const TODAY_WATER_KEY = KEYS.water;

function readJSON<T>(key: string, fallback: T): T {
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; } catch { return fallback; }
}
function localDateStr(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// ── Hydration reminders ──────────────────────────────────────────────────────
const WATER_WAKE_START_HOUR = 8;
const WATER_WAKE_END_HOUR   = 21;
const WATER_SYNC_DAYS       = 5;

type WaterFire = { dedupeKey: string; fireAt: Date; body: string; data?: Record<string, unknown> };

function upcomingWaterFires(waterCount: number, waterGoal: number, from: Date, userId: string | null): WaterFire[] {
  const out: WaterFire[] = [];
  for (let d = 0; d < WATER_SYNC_DAYS; d++) {
    const day = new Date(from.getFullYear(), from.getMonth(), from.getDate() + d);
    const dayStr = localDateStr(day);
    const windowStart = new Date(day.getFullYear(), day.getMonth(), day.getDate(), WATER_WAKE_START_HOUR, 0, 0, 0);
    const windowEnd   = new Date(day.getFullYear(), day.getMonth(), day.getDate(), WATER_WAKE_END_HOUR,   0, 0, 0);
    const remaining   = d === 0 ? Math.max(0, waterGoal - waterCount) : waterGoal;
    if (remaining <= 0) continue;
    const start = d === 0 ? new Date(Math.max(from.getTime() + 15 * 60000, windowStart.getTime())) : windowStart;
    if (start >= windowEnd) continue;
    const step = (windowEnd.getTime() - start.getTime()) / (remaining + 1);
    for (let i = 0; i < remaining; i++) {
      const fireAt  = new Date(start.getTime() + step * (i + 1));
      const doseKey = `water:${dayStr}:${i}`;
      const left    = remaining - i;
      const data = userId
        ? { url: "/app/today", kind: "water" as const, reminderId: "water", doseKey, dedupePrefix: doseKey, confirmToken: doseConfirmToken(userId, "water", doseKey) }
        : undefined;
      out.push({ dedupeKey: doseKey, fireAt, body: `${left} more glass${left > 1 ? "es" : ""} to reach your ${waterGoal} glasses today 💧`, data });
    }
  }
  return out;
}

// ── Mood ─────────────────────────────────────────────────────────────────────
const MOODS = [
  { key: "calm",      label: "Calm",      Icon: Cloud },
  { key: "happy",     label: "Happy",     Icon: Smile },
  { key: "energetic", label: "Energetic", Icon: Sparkles },
  { key: "sensitive", label: "Sensitive", Icon: Heart },
  { key: "sad",       label: "Sad",       Icon: CloudRain },
  { key: "tired",     label: "Tired",     Icon: Battery },
] as const;

const MOOD_LABEL: Record<string, string> = {
  calm: "Calm", happy: "Happy", energetic: "Energetic", sensitive: "Sensitive", sad: "Sad", tired: "Tired",
};

// When nothing is planned yet, Today's Plan becomes a little "how it all syncs"
// menu instead of empty placeholders — so she understands what each tool does
// and how they connect (goal → every tool, phase, programs).
const PLAN_SETUP = [
  { title: "Set your goal in Diet",  desc: "Pick a goal once and every tool balances your energy around it.",          href: "/app/tools/diet",    Icon: Apple },
  { title: "Plan your meals",        desc: "Set a goal and we plan your week — synced to your phase, workouts & yoga.", href: "/app/tools/meals",   Icon: UtensilsCrossed },
  { title: "Plan your workouts",     desc: "Phase-matched, freestyle or a program — and fuel it from your meals.",      href: "/app/tools/workout", Icon: Dumbbell },
  { title: "Flow with yoga",         desc: "Sync to your phase, freestyle, or follow a soft program.",                  href: "/app/tools/yoga",    Icon: Flower2 },
] as const;


// ── Bloom streak ─────────────────────────────────────────────────────────────
function ymdLocal(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
/**
 * Real "days blooming" streak: consecutive days (ending today, with a one-day
 * grace) on which she logged *anything* — a mood, a journal entry, a workout or
 * yoga. Honest, not a decorative hardcoded number.
 */
function computeBloomStreak(): number {
  try {
    const active = new Set<string>();
    const addArrDates = (key: string) => {
      try {
        const a = JSON.parse(localStorage.getItem(key) || "[]");
        if (Array.isArray(a)) a.forEach((e: { date?: string }) => { if (e?.date) active.add(e.date); });
      } catch {}
    };
    try {
      const mood = JSON.parse(localStorage.getItem("bloom:mood-log-v2") || "{}");
      if (mood && typeof mood === "object") Object.keys(mood).forEach((d) => active.add(d));
    } catch {}
    addArrDates("bloom:diary");
    addArrDates("bloom:workout-history");
    try {
      const yoga = JSON.parse(localStorage.getItem("bloom:yoga-streak") || "{}");
      if (yoga?.lastISO) active.add(yoga.lastISO);
    } catch {}
    const today = new Date();
    if (localStorage.getItem("bloom:today-mood")) active.add(ymdLocal(today));

    const cursor = new Date(today);
    // Grace: if nothing logged yet today, start counting from yesterday so the
    // streak doesn't visually reset first thing in the morning.
    if (!active.has(ymdLocal(cursor))) cursor.setDate(cursor.getDate() - 1);
    let streak = 0;
    while (active.has(ymdLocal(cursor))) { streak++; cursor.setDate(cursor.getDate() - 1); }
    return streak;
  } catch {
    return 0;
  }
}

// ── Phase content ────────────────────────────────────────────────────────────
const PHASE_QUOTES: Record<Exclude<CyclePhase, "any">, string> = {
  period:     "Curl up and go slow, lovely — your body's doing something beautiful.",
  follicular: "Something fresh is blooming in you. Follow the little spark.",
  fertile:    "You're glowing today — soft, open and oh-so magnetic.",
  ovulation:  "Peak sparkle, gorgeous. Let yourself shine bright.",
  luteal:     "Be extra gentle with yourself today, sweet thing.",
};

const PHASE_ENERGY: Record<Exclude<CyclePhase, "any">, string> = {
  period: "Low", follicular: "Rising", fertile: "High", ovulation: "High", luteal: "Mellow",
};

// A soft, phase-flavoured word for the plan title ("Your soft day"), so the
// heading feels personal to where she is in her cycle.
const PHASE_DAYWORD: Record<Exclude<CyclePhase, "any">, string> = {
  period: "gentle", follicular: "fresh", fertile: "radiant", ovulation: "bright", luteal: "soft",
};

// Phase-tinted gradient for the hero
const PHASE_GRADIENT: Record<Exclude<CyclePhase, "any">, string> = {
  period:     "from-rose-200/50 via-petal/20 to-transparent",
  follicular: "from-pink-100/60 via-blush/20 to-transparent",
  fertile:    "from-petal/60 via-blush/20 to-transparent",
  ovulation:  "from-hotpink/40 via-petal/20 to-transparent",
  luteal:     "from-petal/60 via-blush/20 to-transparent",
};

type PlanItem = {
  id: string; label: string; time: string; Icon: typeof Heart; tool: string;
  image: string; blurb: string; prompt?: string;
  /** Shown if `image` fails to load (e.g. a recipe photo not yet uploaded). */
  fallback?: string;
  launch?: { key: string; val: unknown };
};

// Timeline node icon per plan concept — resolves the little icon that sits on
// the left rail for each item. Every item carries its own `Icon`, but this map
// also RESERVES the evening-ritual concepts we'll populate later — skincare and
// a wind-down read before sleep — so when those items are added they light up
// the rail with the right icon automatically (matched by id prefix).
const PLAN_NODE_ICON: Record<string, typeof Heart> = {
  meal: Heart, breakfast: Heart, lunch: UtensilsCrossed, snack: Apple, dinner: UtensilsCrossed,
  workout: Dumbbell, yoga: Flower2, journal: BookHeart, meditation: Flower2,
  skincare: Sparkles, skin: Sparkles,   // reserved — evening skincare ritual (added later)
  read: BookOpen, reads: BookOpen, bedtime: Moon, sleep: Moon, // reserved — before-sleep read (added later)
};
function planNodeIcon(item: PlanItem): typeof Heart {
  const parts = item.id.split("-");            // e.g. "meal-lunch" → ["meal","lunch"]
  const last = parts[parts.length - 1];
  return PLAN_NODE_ICON[last] ?? PLAN_NODE_ICON[parts[0]] ?? item.Icon;
}

// Build today's plan items from the SHARED phase plan (same source the Cycle
// Tracker uses), ordered by time. Yoga/workout carry a deep-link launch so a
// tap opens that exact flow/session; the journal carries its prompt.
function buildPlanItems(phase: Exclude<CyclePhase, "any">): PlanItem[] {
  const p = SHARED_PHASE_PLAN[phase];
  const items: PlanItem[] = [
    { id: "meal",    label: p.meal.title,    time: p.meal.time,    Icon: Heart,     tool: "/app/tools/meals",   image: p.meal.image,    blurb: p.meal.blurb },
    { id: "workout", label: p.workout.title, time: p.workout.time, Icon: Dumbbell,  tool: "/app/tools/workout", image: p.workout.image, blurb: p.workout.blurb, launch: { key: LAUNCH_WORKOUT_KEY, val: p.workout.launch } },
    { id: "yoga",    label: p.yoga.title,    time: p.yoga.time,    Icon: Flower2,   tool: "/app/tools/yoga",    image: p.yoga.image,    blurb: p.yoga.blurb,    launch: { key: LAUNCH_YOGA_KEY, val: p.yoga.launch } },
    { id: "journal", label: "Journal prompt", time: p.journal.time, Icon: BookHeart, tool: "/app/tools/diary",  image: "/images/cycle-journal-hero.webp", blurb: p.journal.prompt, prompt: p.journal.prompt },
  ];
  return items.sort((a, b) => a.time.localeCompare(b.time));
}

function greeting() {
  const h = new Date().getHours();
  if (h < 5)  return { text: "Good night",     Icon: Moon };
  if (h < 12) return { text: "Good morning",   Icon: Sun };
  if (h < 18) return { text: "Good afternoon", Icon: Sun };
  return       { text: "Good evening",         Icon: Moon };
}

function fmtDate() {
  return new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
}

function cycleDayNumber() {
  const s = readCycleSettings();
  const ms = 1000 * 60 * 60 * 24;
  const diff = Math.floor((new Date().getTime() - s.lastPeriodStart.getTime()) / ms);
  return ((diff % s.cycleLength) + s.cycleLength) % s.cycleLength + 1;
}

function daysToPeriodNumber() {
  const s = readCycleSettings();
  const now = new Date();
  const ms = 1000 * 60 * 60 * 24;
  const diff = Math.floor((now.getTime() - s.lastPeriodStart.getTime()) / ms);
  const cyclesPassed = Math.floor(diff / s.cycleLength) + 1;
  const next = new Date(s.lastPeriodStart.getTime() + cyclesPassed * s.cycleLength * ms);
  return Math.max(0, Math.ceil((next.getTime() - now.getTime()) / ms));
}

/** Returns "now" | "upcoming" | "past" or null when no time given. */
function planItemTiming(time: string): "now" | "upcoming" | "past" | null {
  if (!time) return null;
  const [h, m] = time.split(":").map(Number);
  const now = new Date();
  const itemMin = h * 60 + m;
  const nowMin  = now.getHours() * 60 + now.getMinutes();
  if (nowMin > itemMin + 60)  return "past";
  if (nowMin >= itemMin - 15) return "now";
  return "upcoming";
}

// ── Meal display helpers ─────────────────────────────────────────────────────
const MEAL_PHOTO: Record<string, string> = {
  breakfast: "/images/meal-oats.webp",
  lunch:     "/images/meal-buddha.webp",
  dinner:    "/images/meal-stew.webp",
  lunchbox:  "/images/meal-lunchbox.webp",
  snack:     "/images/meal-lunchbox.webp",
};
const MEAL_SLOT_LABEL: Record<string, string> = {
  breakfast: "Breakfast", lunch: "Lunch", dinner: "Dinner", lunchbox: "Lunchbox", snack: "Snack",
};
const MEAL_SLOT_TIME: Record<string, string> = {
  breakfast: "08:00", lunch: "13:00", dinner: "19:30", lunchbox: "12:00", snack: "16:00",
};

// ── Minimal Reminder type (mirrors app.tools.notes) ─────────────────────────
interface DueReminder {
  id: string;
  kind: "medication" | "birthday" | "event";
  title: string;
  date: string;
  time?: string;
  times: string[];
  weekdays: number[];
  done: boolean;
}

function loadDueTodayReminders(): DueReminder[] {
  try {
    const iso     = todayISO();
    const weekday = new Date().getDay();
    const all     = readJSON<DueReminder[]>("bloom:reminders", []);
    return all.filter((r) => {
      if (r.done) return false;
      if (r.kind === "medication") return r.weekdays.length === 0 || r.weekdays.includes(weekday);
      return r.date === iso;
    });
  } catch { return []; }
}

// ── Main component ───────────────────────────────────────────────────────────
export default function TodayPage() {
  const { profile } = useAuth();
  const { text: hello, Icon: HelloIcon } = useMemo(greeting, []);
  const today           = useMemo(fmtDate, []);
  const phase           = useMemo(() => phaseForDay(new Date(), readCycleSettings()), []);
  const cycleDay        = useMemo(cycleDayNumber, []);
  const daysToPeriod    = useMemo(daysToPeriodNumber, []);
  // "Has this part of her world been set up?" — drives the honest empty states
  // and the setup checklist, so a fresh user never sees defaults dressed as data.
  const cycleReady      = useMemo(hasCycleSettings, []);
  const coach           = useMemo(() => buildDayCoach(), []);
  const mealPlanned     = useMemo(hasMealPlan, []);

  // Deep-link from the Diet coach's "See today's plan" → scroll to the plan.
  useEffect(() => {
    if (typeof window === "undefined" || window.location.hash !== "#todays-plan") return;
    const id = setTimeout(() => {
      try { document.getElementById("todays-plan")?.scrollIntoView({ behavior: "smooth", block: "start" }); } catch {}
    }, 400);
    return () => clearTimeout(id);
  }, []);
  const dietSetup       = useMemo(hasDietSetup, []);
  const movementPlanned = useMemo(hasMovementPlan, []);
  const [finaleOpen,    setFinaleOpen]    = useState(false);
  const [dayCelebrate,  setDayCelebrate]  = useState(false);
  // Today's Plan only appears once she's begun building her world — a brand-new
  // (or freshly reset) user sees the setup checklist instead of a placeholder plan.
  // Real plan only once she's actually planned meals or movement. If she's set
  // up her cycle but planned nothing yet, Today's Plan turns into a "how it syncs"
  // setup menu instead of empty placeholders. A brand-new user (no cycle) sees
  // neither — the "Build your Bloom world" checklist guides her first.
  const hasPlanContent  = mealPlanned || movementPlanned;
  // A truly fresh / just-reset user — nothing built yet. In this state Today sheds
  // every data-driven card (affirmation, bloom ring, due-today) and shows a single
  // enchanting "here's the magic that blooms after setup" reveal instead.
  const isFresh         = !cycleReady && !mealPlanned && !dietSetup && !movementPlanned;
  const allSetup        = cycleReady && mealPlanned && dietSetup && movementPlanned;
  const cycleSettings   = useMemo(readCycleSettings, []);
  const pillLabel       = cycleSettings.contraceptiveMethod.charAt(0).toUpperCase() + cycleSettings.contraceptiveMethod.slice(1);
  const displayName     = profile?.name?.split(" ")[0] || "Beautiful";

  // Core state
  const [mood,                setMood]                = useState<string | null>(null);
  const [symptomsToday,       setSymptomsToday]       = useState<string[]>([]);
  const [symptomPickerOpen,   setSymptomPickerOpen]   = useState(false);
  const [waterCount,          setWaterCount]          = useState(0);
  const [waterGoal,           setWaterGoal]           = useState(8);
  const [waterModalOpen,      setWaterModalOpen]      = useState(false);
  const [waterLastAt,         setWaterLastAt]         = useState<number | null>(null);
  const [streak,              setStreak]              = useState(0);
  const [planDone,            setPlanDone]            = useState<string[]>([]);
  const [affirmIdx,           setAffirmIdx]           = useState(0);
  const [waterRemindersEnabled, setWaterRemindersEnabled] = useState(false);
  const [reminderBusy,        setReminderBusy]        = useState(false);
  const [pillTaken,           setPillTaken]           = useState(false);
  // Real completion detected from each tool — so a plan step auto-ticks the
  // moment she finishes it elsewhere (writes her diary, completes a session,
  // logs a meal), even without ticking it here.
  const [eatenSlots,          setEatenSlots]          = useState<string[]>([]);
  const [autoDone,            setAutoDone]            = useState({ workout: false, yoga: false, diary: false });
  const [moodPickerOpen,      setMoodPickerOpen]      = useState(false);
  const [activePlan,          setActivePlan]          = useState<PlanItem | null>(null);
  // When she taps an unfinished bloom-checklist step, we scroll to + squeeze the
  // matching item in Today's Plan (this DOM id) instead of leaving for the tool.
  const [highlightId,         setHighlightId]         = useState<string | null>(null);
  const [affirmDismissed,     setAffirmDismissed]     = useState(false);
  // The daily affirmation is loud only on her FIRST-EVER Today. From the second
  // visit on it stays out of the way and only drifts in — gently — once she
  // starts scrolling, tucked under the "Today's Plan" title.
  const [affirmReveal,        setAffirmReveal]        = useState(false);
  // Which affirmations she's "loved" (persisted). Each affirmation carries a
  // playful base like-count (starts ~1k) so it feels shared & cherished.
  const [affirmLikes,         setAffirmLikes]         = useState<string[]>(() => { try { return JSON.parse(localStorage.getItem("bloom:affirm-likes") || "[]"); } catch { return []; } });
  const [moodHintIdx,         setMoodHintIdx]         = useState(0);
  const [workoutStreak,       setWorkoutStreak]       = useState(0);
  const [yogaStreak,          setYogaStreak]          = useState(0);
  const [dueReminders,        setDueReminders]        = useState<DueReminder[]>([]);
  const [doneReminderIds,     setDoneReminderIds]     = useState<string[]>([]);
  const [todayMeals,          setTodayMeals]          = useState<Record<string, string | null>>({});

  const moodTileRef = useRef<HTMLButtonElement>(null);
  const symptomTileRef = useRef<HTMLButtonElement>(null);

  // Iron recipe for period/luteal nudge (used in plan section)
  const ironRecipe = useMemo(() =>
    RECIPES.filter((r) => r.phases.includes("menstrual") && r.micros.iron)
           .sort((a, b) => (b.micros.iron ?? 0) - (a.micros.iron ?? 0))[0]
  , []);

  useEffect(() => {
    const iso = todayISO();

    // Read today's mood from the shared log first (synced across the app),
    // falling back to the local key.
    try {
      const log = JSON.parse(localStorage.getItem("bloom:mood-log-v2") || "{}");
      setMood(log[ymdLocal(new Date())] ?? localStorage.getItem(KEYS.mood));
    } catch { try { setMood(localStorage.getItem(KEYS.mood)); } catch {} }

    try { setSymptomsToday(readSymptomsForDay(todayISO())); } catch {}
    setStreak(computeBloomStreak());


    try {
      const raw = readJSON<{ date: string; count: number }>(KEYS.water, { date: "", count: 0 });
      setWaterCount(raw.date === iso ? raw.count : 0);
    } catch {}

    try { setWaterGoal(Number(localStorage.getItem(KEYS.waterGoal)) || 8); } catch {}

    try {
      const raw = readJSON<{ date: string; done: string[] }>(KEYS.plan, { date: "", done: [] });
      setPlanDone(raw.date === iso ? raw.done : []);
    } catch {}

    try { const t = Number(localStorage.getItem("bloom:water-last-at")); setWaterLastAt(Number.isFinite(t) && t > 0 ? t : null); } catch {}
    try { setAffirmIdx(Number(localStorage.getItem(KEYS.affirmIdx)) || 0); } catch {}
    try { setWaterRemindersEnabled(localStorage.getItem(KEYS.waterReminders) === "true"); } catch {}

    // Pill state comes from the ONE shared log (also written by My Cycle), so the
    // two pages always agree on whether today's pill is taken.
    try { setPillTaken(isPillTaken(iso)); } catch {}

    setWorkoutStreak(readWorkoutStreak().count);
    setYogaStreak(readYogaStreak().count);
    setDueReminders(loadDueTodayReminders());

    // Today's meals come from the ONE weekly plan (keyed by weekday), so Today,
    // the Meals Planner and the Diet tool always show the same meals.
    try {
      setTodayMeals(readTodayPlannedDay());
    } catch {}

    // Real completion detected from each tool (meals eaten, sessions done, diary).
    try {
      setEatenSlots(readEatenToday());
      setAutoDone({ workout: didWorkoutToday(), yoga: didYogaToday(), diary: hasDiaryEntryToday() });
    } catch {}

    broadcastCyclePhase();
  }, []);

  // Keep the auto-detected completion fresh when she finishes something in
  // another tool (or returns to this tab) — so a done step ticks itself here.
  useEffect(() => {
    const refresh = () => {
      try {
        setEatenSlots(readEatenToday());
        setAutoDone({ workout: didWorkoutToday(), yoga: didYogaToday(), diary: hasDiaryEntryToday() });
      } catch {}
    };
    const onVis = () => { if (document.visibilityState === "visible") refresh(); };
    window.addEventListener("storage", refresh);
    window.addEventListener("bloom:diary-updated", refresh);
    window.addEventListener("bloom:workout-updated", refresh);
    document.addEventListener("visibilitychange", onVis);
    return () => {
      window.removeEventListener("storage", refresh);
      window.removeEventListener("bloom:diary-updated", refresh);
      window.removeEventListener("bloom:workout-updated", refresh);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);

  // Affirmation reveal — count how many times she's opened Today. On the very
  // first visit the affirmation shows straight away; from the second on it waits
  // and only slips in softly once she starts scrolling.
  useEffect(() => {
    let visits = 0;
    try { visits = Number(localStorage.getItem("bloom:today-visits")) || 0; } catch {}
    const next = visits + 1;
    try { localStorage.setItem("bloom:today-visits", String(next)); } catch {}
    if (next <= 1) { setAffirmReveal(true); return; }
    const onScroll = () => {
      if (window.scrollY > 56) { setAffirmReveal(true); window.removeEventListener("scroll", onScroll); }
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Stay in sync with My Cycle: if the pill is toggled there, reflect it here.
  useEffect(() => {
    const resync = () => { try { setPillTaken(isPillTaken(todayISO())); } catch {} };
    window.addEventListener("bloom:pill-updated", resync);
    window.addEventListener("storage", resync);
    return () => { window.removeEventListener("bloom:pill-updated", resync); window.removeEventListener("storage", resync); };
  }, []);

  // Mood hint cycling when mood not yet set
  useEffect(() => {
    if (mood) return;
    const id = setInterval(() => setMoodHintIdx((i) => (i + 1) % MOODS.length), 2200);
    return () => clearInterval(id);
  }, [mood]);

  // Water ack pull
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const acks = await fetchWaterAcks();
      if (cancelled || acks.size === 0) return;
      const iso = todayISO();
      let seen: string[] = [];
      try { seen = readJSON<string[]>(KEYS.waterAcksSeen, []); } catch {}
      const todaysAcks = [...acks].filter((k) => k.startsWith(`water:${iso}:`) && !seen.includes(k));
      if (todaysAcks.length === 0) return;
      setWaterCount((prev) => {
        const next = prev + todaysAcks.length;
        try { localStorage.setItem(KEYS.water, JSON.stringify({ date: iso, count: next })); } catch {}
        return next;
      });
      try { localStorage.setItem(KEYS.waterAcksSeen, JSON.stringify([...seen, ...todaysAcks])); } catch {}
    })();
    return () => { cancelled = true; };
  }, []);

  // Keep the per-day hydration history current for the Me consistency dashboard.
  useEffect(() => { stampWater(waterCount, waterGoal); }, [waterCount, waterGoal]);

  // Water reminders sync
  useEffect(() => {
    if (!waterRemindersEnabled) return;
    let cancelled = false;
    (async () => {
      const userId = await getCurrentUserId();
      if (cancelled || !userId) return;
      const items = upcomingWaterFires(waterCount, waterGoal, new Date(), userId).map((fire) => ({
        dedupeKey: fire.dedupeKey,
        fireAt: fire.fireAt.toISOString(),
        title: "Bloomzein — Hydratation 💧",
        body: fire.body,
        data: fire.data ?? { url: "/app/today" },
      }));
      syncScheduledNotifications("hydration", items);
    })();
    return () => { cancelled = true; };
  }, [waterRemindersEnabled, waterCount, waterGoal]);

  // ── Actions ─────────────────────────────────────────────────────────────────

  const toggleWaterReminders = async () => {
    if (reminderBusy) return;
    setReminderBusy(true);
    try {
      if (waterRemindersEnabled) {
        setWaterRemindersEnabled(false);
        try { localStorage.setItem(KEYS.waterReminders, "false"); } catch {}
        await cancelScheduledNotifications("hydration", "water:");
      } else {
        if (!isPushSupported()) { alert("Les notifications ne sont pas disponibles sur cet appareil/navigateur."); return; }
        const { error } = await subscribeToPush();
        if (error) { alert(error); return; }
        setWaterRemindersEnabled(true);
        try { localStorage.setItem(KEYS.waterReminders, "true"); } catch {}
      }
    } finally { setReminderBusy(false); }
  };

  const pickMood = (key: string) => {
    setMood(key);
    try { localStorage.setItem(KEYS.mood, key); } catch {}
    // Sync to the ONE shared mood log so the Diary, the Me page and the bloom
    // streak everywhere read the same value.
    try {
      const log = JSON.parse(localStorage.getItem("bloom:mood-log-v2") || "{}");
      log[ymdLocal(new Date())] = key;
      localStorage.setItem("bloom:mood-log-v2", JSON.stringify(log));
    } catch {}
    setStreak(computeBloomStreak()); // logging today keeps the bloom streak alive
  };

  // Body check-in — writes to the ONE symptom log the Cycle Tracker graph reads,
  // keyed by today's LOCAL date, so the two always agree.
  const toggleSymptomToday = (label: string) => {
    setSymptomsToday(toggleSymptomForDay(todayISO(), label));
  };


  const tapWater = (idx: number) => {
    setWaterCount((prev) => {
      const next = idx < prev ? idx : idx + 1;
      try { localStorage.setItem(KEYS.water, JSON.stringify({ date: todayISO(), count: next })); } catch {}
      // Stamp the moment she adds a glass (only when going up), so the dashboard
      // can show "last glass — X ago".
      if (next > prev) { try { localStorage.setItem("bloom:water-last-at", String(Date.now())); setWaterLastAt(Date.now()); } catch {} }
      return next;
    });
  };

  const saveWaterGoal = (goal: number) => {
    const g = Math.max(1, Math.min(20, goal));
    setWaterGoal(g);
    try { localStorage.setItem(KEYS.waterGoal, String(g)); } catch {}
  };

  const togglePlanItem = (id: string) => {
    setPlanDone((prev) => {
      const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
      try { localStorage.setItem(KEYS.plan, JSON.stringify({ date: todayISO(), done: next })); } catch {}
      return next;
    });
  };

  const togglePill = () => {
    setPillTaken((prev) => {
      const next = !prev;
      savePillTaken(todayISO(), next); // ONE shared log — keeps My Cycle in sync
      return next;
    });
  };

  const newAffirmation = () => {
    setAffirmIdx((prev) => {
      const pool = AFFIRMATIONS[phase];
      const next = (prev + 1) % pool.length;
      try { localStorage.setItem(KEYS.affirmIdx, String(next)); } catch {}
      return next;
    });
  };

  const markReminderDone = (id: string) => {
    setDoneReminderIds((prev) => [...prev, id]);
    try {
      const all = readJSON<DueReminder[]>("bloom:reminders", []);
      const updated = all.map((r) => r.id === id ? { ...r, done: true } : r);
      localStorage.setItem("bloom:reminders", JSON.stringify(updated));
    } catch {}
  };

  // ── Derived ──────────────────────────────────────────────────────────────────

  // Today's Plan in the marketing order: yoga (if planned) · breakfast · lunch ·
  // snack · workout (if planned) · dinner · journal. Meals come from the one
  // shared weekly plan; yoga/workout appear only on days they're scheduled.
  const planItems = useMemo<PlanItem[]>(() => {
    const p = SHARED_PHASE_PLAN[phase];
    const dow = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"][(new Date().getDay() + 6) % 7];
    const yogaPlanned = readYogaPlanDays().includes(dow);
    const workoutPlanned = readWorkoutPlanDays().includes(dow);
    const mealItem = (slot: "breakfast" | "lunch" | "snack" | "dinner"): PlanItem => {
      const rid = todayMeals[slot];
      const r = rid ? RECIPES.find((x) => x.id === rid) : null;
      if (r) return {
        id: `meal-${slot}`, label: r.name, time: MEAL_SLOT_TIME[slot], Icon: Heart,
        tool: "/app/tools/meals", image: recipeImageSrc(r), fallback: MEAL_PHOTO[slot],
        blurb: `${MEAL_SLOT_LABEL[slot]} · ${r.macros.calories} kcal · ${r.macros.protein}g protein`,
        launch: { key: LAUNCH_MEAL_KEY, val: r.id },
      };
      return {
        id: `meal-${slot}`, label: `Plan your ${MEAL_SLOT_LABEL[slot].toLowerCase()}`, time: MEAL_SLOT_TIME[slot], Icon: Heart,
        tool: "/app/tools/meals", image: MEAL_PHOTO[slot],
        blurb: cycleReady
          ? `Tap to add a ${MEAL_SLOT_LABEL[slot].toLowerCase()} for your ${PHASE_LABEL[phase]} phase ✿`
          : `Tap to add a ${MEAL_SLOT_LABEL[slot].toLowerCase()} ✿`,
      };
    };
    const items: PlanItem[] = [];
    if (yogaPlanned) items.push({ id: "yoga", label: p.yoga.title, time: p.yoga.time, Icon: Flower2, tool: "/app/tools/yoga", image: p.yoga.image, blurb: p.yoga.blurb, launch: { key: LAUNCH_YOGA_KEY, val: p.yoga.launch } });
    items.push(mealItem("breakfast"));
    items.push(mealItem("lunch"));
    items.push(mealItem("snack"));
    if (workoutPlanned) items.push({ id: "workout", label: p.workout.title, time: p.workout.time, Icon: Dumbbell, tool: "/app/tools/workout", image: p.workout.image, blurb: p.workout.blurb, launch: { key: LAUNCH_WORKOUT_KEY, val: p.workout.launch } });
    items.push(mealItem("dinner"));
    items.push({ id: "journal", label: "Journal prompt", time: p.journal.time, Icon: BookHeart, tool: "/app/tools/diary", image: "/images/cycle-journal-hero.webp", blurb: p.journal.prompt, prompt: p.journal.prompt });
    return items;
  }, [phase, todayMeals, cycleReady]);
  const moodHint  = MOODS[moodHintIdx];
  const MoodIcon  = mood ? (MOODS.find((m) => m.key === mood)?.Icon ?? Sparkles) : moodHint.Icon;
  const affirmPool = AFFIRMATIONS[phase];
  const affirmText = affirmPool[affirmIdx % affirmPool.length];
  // Playful "loved by the community" count — deterministic base per affirmation
  // (~1k), +1 once she loves it herself.
  const affirmLiked = affirmLikes.includes(affirmText);
  const affirmLikeCount = 1000 + ((affirmText.length * 137 + affirmIdx * 53) % 900) + (affirmLiked ? 1 : 0);
  const toggleAffirmLike = () => {
    setAffirmLikes((prev) => {
      const next = prev.includes(affirmText) ? prev.filter((x) => x !== affirmText) : [...prev, affirmText];
      try { localStorage.setItem("bloom:affirm-likes", JSON.stringify(next)); } catch {}
      return next;
    });
  };

  // Every item in Today's Plan (each meal, workout, yoga, journal) counts toward
  // the bloom ring, alongside the two standalone daily goals (mood + water), so
  // the ring is ALWAYS in sync with what the plan shows as done (planDone).
  const mealItems    = useMemo(() => planItems.filter((i) => i.id.startsWith("meal-")), [planItems]);
  const moveItems    = useMemo(() => planItems.filter((i) => i.id === "yoga" || i.id === "workout"), [planItems]);
  const journalItem  = useMemo(() => planItems.find((i) => i.id === "journal" || i.id === "meditation"), [planItems]);

  // A plan item counts as done if she ticked it here OR genuinely completed it
  // in its own tool (a logged meal, a finished session, a written diary entry).
  const isItemDone = (item: PlanItem): boolean => {
    if (planDone.includes(item.id)) return true;
    if (item.id.startsWith("meal-")) return eatenSlots.includes(item.id.slice(5));
    if (item.id === "workout") return autoDone.workout;
    if (item.id === "yoga") return autoDone.yoga;
    if (item.id === "journal" || item.id === "meditation") return autoDone.diary;
    return false;
  };

  const checklist = useMemo(() => {
    const mealsDone = mealItems.filter(isItemDone).length;
    const moveDone  = moveItems.filter(isItemDone).length;
    const rows: { key: string; label: string; sub: string; done: boolean; Icon: typeof Heart; href: string; tool: string }[] = [
      { key: "mood",  label: "Log your mood",  sub: mood ? "Logged today ✓" : "Not logged yet", done: !!mood,                  Icon: Smile,   href: "",           tool: "" },
      { key: "water", label: "Hit water goal", sub: `${waterCount} / ${waterGoal} L`,           done: waterCount >= waterGoal, Icon: Droplet, href: "#hydration", tool: "" },
    ];
    if (mealItems.length)
      rows.push({ key: "meals", label: `Eat your meals (${mealsDone}/${mealItems.length})`, sub: `${mealsDone} of ${mealItems.length} completed`, done: mealsDone === mealItems.length, Icon: UtensilsCrossed, href: "/app/tools/meals", tool: "/app/tools/meals" });
    if (moveItems.length) {
      const md = moveDone === moveItems.length;
      rows.push({ key: "move", label: moveItems.length > 1 ? `Move your body (${moveDone}/${moveItems.length})` : (moveItems[0].label ?? "Move"), sub: md ? "Completed ✓" : moveItems.length > 1 ? `${moveDone} of ${moveItems.length} completed` : "Not started", done: md, Icon: moveItems[0].Icon, href: moveItems[0].tool, tool: moveItems[0].tool });
    }
    if (journalItem) {
      const jd = isItemDone(journalItem);
      rows.push({ key: "journal", label: "Write in diary", sub: jd ? "Completed ✓" : "Not started", done: jd, Icon: BookHeart, href: "/app/tools/diary", tool: "/app/tools/diary" });
    }
    return rows;
  }, [mood, waterCount, waterGoal, planDone, eatenSlots, autoDone, mealItems, moveItems, journalItem]);

  // Tapping a bloom-checklist step keeps her on Today and points at the exact
  // thing to complete: scroll the matching plan item (or the hydration card) into
  // view and squeeze it — "this is your next step" — rather than jumping away.
  const focusPlanStep = (key: string) => {
    let domId: string | null = null;
    if (key === "water") domId = "hydration";
    else if (key === "meals") { const m = mealItems.find((x) => !isItemDone(x)) ?? mealItems[0]; domId = m ? `plan-${m.id}` : null; }
    else if (key === "move")  { const m = moveItems.find((x) => !isItemDone(x)) ?? moveItems[0]; domId = m ? `plan-${m.id}` : null; }
    else if (key === "journal") domId = journalItem ? `plan-${journalItem.id}` : null;
    if (!domId) return;
    try {
      const el = document.getElementById(domId);
      if (!el) return;
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      setHighlightId(domId);
      window.setTimeout(() => setHighlightId((cur) => (cur === domId ? null : cur)), 1500);
    } catch {}
  };

  // Ring progress is granular: mood + water + one unit per plan item, so ticking
  // any single meal or the workout moves the ring immediately.
  const bloomUnits    = [!!mood, waterCount >= waterGoal, ...planItems.map((i) => isItemDone(i))];
  const bloomPercent  = Math.round((bloomUnits.filter(Boolean).length / bloomUnits.length) * 100);
  const bloomFull     = bloomPercent === 100;
  const bloomMessage  =
    bloomPercent === 0  ? "Your day awaits — start with one small bloom ✿" :
    bloomPercent < 50   ? "A lovely start — keep blooming, beautiful" :
                          "More than halfway — you're glowing today ✿";

  // Day fully bloomed → one joyful Barbie-pink confetti burst, once per day (so a
  // reload after completing doesn't replay it; unticking + re-ticking won't spam).
  useEffect(() => {
    if (!bloomFull) return;
    const iso = todayISO();
    let last = "";
    try { last = localStorage.getItem(KEYS.bloomCelebrated) || ""; } catch {}
    if (last === iso) return;
    try { localStorage.setItem(KEYS.bloomCelebrated, iso); } catch {}
    setDayCelebrate(true);
  }, [bloomFull]);

  // visible due reminders (not marked done this session)
  const visibleReminders = dueReminders.filter((r) => !doneReminderIds.includes(r.id));
  const hasDueItems      = !pillTaken || visibleReminders.length > 0;

  // circumference for SVG ring (r=15.9)
  const CIRC = 2 * Math.PI * 15.9; // ≈ 99.9

  // FINALE — when her whole world is built (cycle + meals + diet + movement +
  // today's mood) AND she's still on the guided flow, play the closing moment:
  // a "your Today plan is ready" celebration, then a soft pink outline sweeps
  // over Today's Plan. endGuide() first so it can only ever fire once.
  useEffect(() => {
    const allDone = cycleReady && mealPlanned && dietSetup && movementPlanned && !!mood;
    if (isGuided() && allDone) {
      endGuide();
      setFinaleOpen(true);
    }
  }, [cycleReady, mealPlanned, dietSetup, movementPlanned, mood]);

  // Compact daily affirmation — tucked under the "Today's Plan" title. Shows
  // immediately on the first-ever Today, then only on scroll (affirmReveal),
  // always dismissible with the X. One soft line, self-writing, with a love tap.
  const affirmationCard = (!affirmDismissed && !isFresh && affirmReveal) ? (
    <div className="relative mt-2.5 rounded-2xl border border-petal/50 bg-blush/25 pl-3 pr-8 py-2 animate-fade-in">
      <button
        onClick={() => setAffirmDismissed(true)}
        aria-label="Dismiss affirmation"
        className="absolute right-1.5 top-1.5 grid h-5 w-5 place-items-center rounded-full text-rose/40 transition hover:bg-white hover:text-hotpink active:scale-90"
      >
        <X className="h-3.5 w-3.5" />
      </button>
      <div className="flex items-center gap-2">
        <BloomFlower className="h-4 w-4 shrink-0 text-hotpink/80 animate-icon-breathe" />
        <AnimatedWords
          key={affirmText}
          text={affirmText}
          stagger={70}
          className="font-script text-base sm:text-lg text-hotpink leading-snug"
        />
      </div>
      <div className="mt-1 flex items-center gap-2 pl-6">
        <span className="text-[8px] font-bold uppercase tracking-widest text-hotpink/50">Today's affirmation</span>
        <button
          onClick={toggleAffirmLike}
          aria-pressed={affirmLiked}
          aria-label={affirmLiked ? "Unlove this affirmation" : "Love this affirmation"}
          className="inline-flex items-center gap-1 text-[10px] font-bold tabular-nums text-hotpink/70 transition hover:text-hotpink active:scale-90"
        >
          <Heart className={["h-3 w-3", affirmLiked ? "fill-hotpink text-hotpink animate-icon-breathe" : ""].join(" ")} strokeWidth={2} />
          {affirmLikeCount.toLocaleString()}
        </button>
      </div>
    </div>
  ) : null;

  return (
    <div className="relative isolate">
      {/* Base pink→fuchsia wash — the top of Today reads as one immersive surface. */}
      <div aria-hidden className="pointer-events-none absolute inset-x-0 -top-8 -z-20 h-[760px] bg-gradient-to-b from-[#FFD3E8] via-[#FFE4F1] to-transparent" />

      {/* Hero photo as ONE blended page BACKGROUND — a single FULL-WIDTH image so
          there's no left/right panel seam: she sits on the right, and the same
          pink (#FFE4F1) fades the left (behind the greeting) and the bottom (into
          "Build your Bloom world"). One continuous surface, no edges. `isolate`
          on the root keeps this -z layer from vanishing behind the app shell. */}
      <div aria-hidden className="pointer-events-none absolute inset-x-0 -top-8 -z-10 -mx-3 sm:-mx-6 md:-mx-8 h-[640px] overflow-hidden">
        <img src="/images/today-hero.webp" alt="" className="animate-hero-breathe h-full w-full object-cover object-[76%_15%]" referrerPolicy="no-referrer" />
        {/* left fade → readable pink behind the greeting (same tone as the wash) */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#FFE4F1] via-[#FFE4F1]/55 to-transparent" />
        {/* bottom fade → melts into the content below */}
        <div className="absolute inset-x-0 bottom-0 h-64 bg-gradient-to-b from-transparent via-[#FFE4F1]/80 to-[#FFE4F1]" />
      </div>

      <BloomBubbles count={10} />

      {/* ── 1. HERO — transparent; the photo lives in the page background above. ── */}
      <section
        className="relative -mx-3 sm:-mx-6 md:-mx-8 -mt-3 sm:-mt-5 md:-mt-8 min-h-[200px] sm:min-h-[250px] animate-card-pop-in"
        style={{ animationDelay: "0ms" }}
      >
        <div className="relative z-[1] flex flex-col items-start px-4 pt-4 pb-2 sm:px-8 sm:pt-6 sm:pb-2 w-[68%] sm:max-w-md">
          <h1 className="animate-text-pop font-script text-[1.75rem] sm:text-4xl text-hotpink leading-tight break-words text-left drop-shadow-[0_2px_6px_oklch(1_0_0/0.5)]">
            {hello}, {displayName}
          </h1>
          <div className="mt-1.5 sm:mt-2 inline-flex items-center gap-1.5 rounded-full bg-white/85 backdrop-blur px-2.5 py-0.5 text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-hotpink border border-petal/60">
            <HelloIcon className="h-3 w-3" strokeWidth={2} /> {today}
          </div>

          {cycleReady ? (
            <>
              <div className="mt-1.5 sm:mt-2 inline-flex items-center gap-1.5 whitespace-nowrap rounded-full bg-hotpink/90 text-white text-[10px] sm:text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 sm:px-3 sm:py-1">
                ✿ Day {cycleDay} · {PHASE_LABEL[phase]} · Energy {PHASE_ENERGY[phase]}
              </div>

              <p className="mt-1.5 sm:mt-2.5 text-[11px] sm:text-sm text-rose/90 leading-snug max-w-[150px] sm:max-w-[240px]">
                {PHASE_QUOTES[phase]}
              </p>
            </>
          ) : (
            <>
              <a href="/app/tools/cycle" className="mt-1.5 sm:mt-2 inline-flex items-center gap-1.5 whitespace-nowrap rounded-full bg-hotpink/90 text-white text-[10px] sm:text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 sm:px-3 sm:py-1 transition hover:bg-hotpink active:scale-95">
                <Sparkles className="h-3 w-3" strokeWidth={2.2} /> Set up your cycle
              </a>

              <p className="mt-1.5 sm:mt-2.5 text-[11px] sm:text-sm text-rose/90 leading-snug max-w-[150px] sm:max-w-[240px]">
                Welcome to your Bloom ✿ Let's set up your world — start below.
              </p>
            </>
          )}

        </div>

        {/* Streak badge — top-right so it clears the glass cards below */}
        <div className="absolute top-3 right-3 sm:top-4 sm:right-4 z-[2] rounded-2xl bg-white/60 backdrop-blur px-2.5 py-1 sm:px-3 sm:py-1.5 text-center border border-white/50 shadow-md">
          {streak > 0 ? (
            <>
              <p className="font-script text-lg sm:text-xl text-hotpink leading-none">{streak}</p>
              <p className="text-[8px] sm:text-[10px] font-bold uppercase tracking-wider text-rose/70">{streak === 1 ? "day blooming" : "days blooming"}</p>
            </>
          ) : (
            <>
              <p className="font-script text-lg sm:text-xl text-hotpink leading-none">✿</p>
              <p className="text-[8px] sm:text-[10px] font-bold uppercase tracking-wider text-rose/70">fresh start</p>
            </>
          )}
        </div>

        {/* QUICK STATS moved below — now sits just above "Build your Bloom world". */}
      </section>

      {/* MoodPopover — portaled, triggered from hero circular button */}
      <MoodPopover
        open={moodPickerOpen}
        onClose={() => setMoodPickerOpen(false)}
        onPick={(key) => { pickMood(key); setMoodPickerOpen(false); }}
        triggerRef={moodTileRef}
      />

      {/* SymptomPopover — multi-select body check-in, mirrors the mood popover */}
      <SymptomPopover
        open={symptomPickerOpen}
        onClose={() => setSymptomPickerOpen(false)}
        selected={symptomsToday}
        onToggle={toggleSymptomToday}
        triggerRef={symptomTileRef}
      />

      {/* FINALE — the closing "your world is built" moment: a Barbie spotlight on
          Today's Plan for ~2s, matching every tool's setup step. */}
      {finaleOpen && (
        <SpotlightCoach
          targetId="todays-plan"
          title="Your Bloom day is ready ✿"
          message="Everything you set up — your cycle, meals, movement and mood — flows into this one plan. This is your Bloom."
          autoDismissMs={2000}
          onClose={() => setFinaleOpen(false)}
        />
      )}

      {/* DAY COMPLETE — a joyful confetti burst the moment every petal is ticked */}
      {dayCelebrate && <BloomDayCelebration onDone={() => setDayCelebrate(false)} />}

      {/* PlanDetailModal — centred on every device, opened by tapping a plan item */}
      <PlanDetailModal
        item={activePlan}
        phase={phase}
        cycleReady={cycleReady}
        done={activePlan ? planDone.includes(activePlan.id) : false}
        onToggleDone={() => { if (activePlan) togglePlanItem(activePlan.id); }}
        onClose={() => setActivePlan(null)}
      />

      {/* ── QUICK STATS — Mood · Symptom · Energy · Water — frosted-glass bars,
             sitting just above "Build your Bloom world" (clear of the hero photo). ── */}
      <div className="relative z-[1] mt-2 sm:mt-3">
        <div className="grid grid-cols-4 gap-1.5 sm:flex sm:flex-wrap sm:justify-start sm:gap-2.5">
          <button ref={moodTileRef} onClick={() => setMoodPickerOpen((v) => !v)} aria-haspopup="dialog" aria-expanded={moodPickerOpen}
            className="group flex flex-col items-center gap-1 text-center sm:flex-row sm:gap-2.5 sm:text-left rounded-2xl bg-white/70 backdrop-blur-md border border-white/60 px-1 py-2 sm:px-3.5 sm:py-2 sm:w-auto shadow-lg shadow-hotpink/10 transition hover:-translate-y-0.5 hover:bg-white/85 active:scale-[0.98]">
            <span className="clay-blob animate-icon-breathe grid h-8 w-8 sm:h-9 sm:w-9 shrink-0 place-items-center rounded-full text-white"><MoodIcon className="h-5 w-5" strokeWidth={1.8} /></span>
            <span className="min-w-0 w-full sm:w-auto">
              <span className="block text-[8px] sm:text-[9px] font-bold uppercase tracking-wider text-rose/60 leading-none">Mood</span>
              <span className="mt-0.5 block font-script text-[14px] sm:text-lg leading-none text-hotpink truncate">{mood ? MOOD_LABEL[mood] : "Tap in"}</span>
            </span>
          </button>

          <button ref={symptomTileRef} onClick={() => setSymptomPickerOpen((v) => !v)} aria-haspopup="dialog" aria-expanded={symptomPickerOpen}
            className="group flex flex-col items-center gap-1 text-center sm:flex-row sm:gap-2.5 sm:text-left rounded-2xl bg-white/70 backdrop-blur-md border border-white/60 px-1 py-2 sm:px-3.5 sm:py-2 sm:w-auto shadow-lg shadow-hotpink/10 transition hover:-translate-y-0.5 hover:bg-white/85 active:scale-[0.98]">
            <span className="animate-icon-breathe grid h-8 w-8 sm:h-9 sm:w-9 shrink-0 place-items-center rounded-full bg-blush text-hotpink"><Activity className="h-5 w-5" strokeWidth={1.9} /></span>
            <span className="min-w-0 w-full sm:w-auto">
              <span className="block text-[8px] sm:text-[9px] font-bold uppercase tracking-wider text-rose/60 leading-none">Symptom</span>
              <span className="mt-0.5 block font-script text-[14px] sm:text-lg leading-none text-hotpink truncate">{symptomsToday.length ? `${symptomsToday.length} noted` : "Check in"}</span>
            </span>
          </button>

          <a href="/app/calendar" className="group flex flex-col items-center gap-1 text-center sm:flex-row sm:gap-2.5 sm:text-left rounded-2xl bg-white/70 backdrop-blur-md border border-white/60 px-1 py-2 sm:px-3.5 sm:py-2 sm:w-auto shadow-lg shadow-hotpink/10 transition hover:-translate-y-0.5 hover:bg-white/85 active:scale-[0.98]">
            <span className="animate-icon-breathe grid h-8 w-8 sm:h-9 sm:w-9 shrink-0 place-items-center rounded-full bg-blush text-hotpink"><Battery className="h-5 w-5" strokeWidth={1.9} /></span>
            <span className="min-w-0 w-full sm:w-auto">
              <span className="block text-[8px] sm:text-[9px] font-bold uppercase tracking-wider text-rose/60 leading-none">Energy</span>
              <span className="mt-0.5 block font-script text-[14px] sm:text-lg leading-none text-hotpink truncate">{cycleReady ? PHASE_ENERGY[phase].charAt(0).toUpperCase() + PHASE_ENERGY[phase].slice(1) : "Set cycle"}</span>
            </span>
          </a>

          <button onClick={() => setWaterModalOpen(true)}
            className="group flex flex-col items-center gap-1 text-center sm:flex-row sm:gap-2.5 sm:text-left rounded-2xl bg-white/70 backdrop-blur-md border border-white/60 px-1 py-2 sm:px-3.5 sm:py-2 sm:w-auto shadow-lg shadow-hotpink/10 transition hover:-translate-y-0.5 hover:bg-white/85 active:scale-[0.98]">
            <span className="animate-icon-breathe grid h-8 w-8 sm:h-9 sm:w-9 shrink-0 place-items-center rounded-full bg-blush text-hotpink"><Droplet className="h-5 w-5" strokeWidth={1.9} /></span>
            <span className="min-w-0 w-full sm:w-auto">
              <span className="block text-[8px] sm:text-[9px] font-bold uppercase tracking-wider text-rose/60 leading-none">Water</span>
              <span className="mt-0.5 block font-script text-[14px] sm:text-lg leading-none text-hotpink truncate">{waterCount}/{waterGoal}</span>
            </span>
          </button>
        </div>
      </div>

      {/* ── BUILD YOUR WORLD — rich guided setup cards; disappears once every
             tool is configured. (self-hides when all steps are done) ── */}
      <BuildBloomWorld moodDone={!!mood} onLogMood={() => setMoodPickerOpen(true)} />

      {/* Until her world is fully set up, show a blurred, locked peek of the real
          Today she'll unlock (instead of half-empty coach/reads sections). */}
      {!allSetup && <PersonalizedBloomPreview />}

      {/* ══ DESKTOP: 60% main content + 40% sticky smart panel (CLAUDE.md) ══ */}
      <div className="lg:grid lg:grid-cols-5 lg:gap-x-6 lg:items-start">

      {/* ── MAIN COLUMN (lg:col-span-3) ─────────────────────────────────────── */}
      <div className="lg:col-span-3">

      {/* ── AFFIRMATION — moved: it now lives tucked under the "Today's Plan"
             title (see the compact affirmationCard below), where it appears
             straight away on the first-ever visit and softly on scroll after. ── */}

      {/* ── FRESH REVEAL retired — the blurred "personalized Bloom world" preview
             (rendered above, for any not-yet-set-up user) now stands in for the
             brand-new-user plan/reads/coach peek. ── */}

      {/* ── 2. TODAY'S BLOOM PLAN — the real plan once she's planned meals/movement;
             a "how it all syncs" setup menu once her cycle's set but nothing's
             planned; nothing at all for a brand-new user (the checklist guides her). ── */}
      {!hasPlanContent && cycleReady && (
        <section className="mt-4 sm:mt-6 animate-card-pop-in" style={{ animationDelay: "50ms" }}>
          <SectionTitle>Today's Plan ✿</SectionTitle>
          <p className="-mt-1 mb-2.5 text-[11px] sm:text-xs text-rose/65 leading-snug px-0.5">
            Nothing planned yet — set up a tool and Today fills itself. Everything syncs to your <span className="font-bold text-hotpink">goal</span> &amp; <span className="font-bold text-hotpink">phase</span> ✿
          </p>
          {affirmationCard && <div className="mb-2.5">{affirmationCard}</div>}
          <div className="bloom-pearl-card pearl-sheen rounded-3xl overflow-hidden divide-y divide-petal/20">
            {PLAN_SETUP.map((t, i) => (
              <a key={t.href} href={t.href} className="flex items-center gap-3 px-3 py-3 sm:px-4 sm:py-3.5 transition hover:bg-blush/20 active:scale-[0.99]" style={{ animationDelay: `${i * 60}ms` }}>
                <span className="clay-blob pearl-sheen grid h-11 w-11 shrink-0 place-items-center rounded-2xl text-white">
                  <t.Icon className="h-5 w-5" strokeWidth={1.8} />
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-[#831843] leading-tight">{t.title}</p>
                  <p className="mt-0.5 text-[11px] text-rose/60 leading-snug">{t.desc}</p>
                </div>
                <span className="shrink-0 grid h-9 w-9 place-items-center rounded-full bg-hotpink/10 text-hotpink animate-selected-glow">
                  <ArrowRight className="h-4 w-4" strokeWidth={2.5} />
                </span>
              </a>
            ))}
          </div>
        </section>
      )}

      {hasPlanContent && (
      <section id="todays-plan" className="mt-4 sm:mt-6 animate-card-pop-in" style={{ animationDelay: "50ms" }}>
        <div className="rounded-[2rem] overflow-hidden bg-white border border-petal/50 shadow-[0_10px_30px_rgba(219,39,119,0.08)]">
        {/* Card header — a big personal title, phase blurb, the day's affirmation
            (tucked under the title) & a gentle nudge, all contained. */}
        <div className="px-4 pt-4 pb-3 sm:px-5 sm:pt-5">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-hotpink/55">Today's Plan ✿</p>
          <h2 className="mt-0.5 font-script text-[2rem] sm:text-[2.6rem] text-hotpink leading-[1.05] drop-shadow-[0_1px_4px_rgba(219,39,119,0.12)]">
            Your {cycleReady ? PHASE_DAYWORD[phase] : "bloom"} day
          </h2>
          <p className="mt-1.5 text-[11px] sm:text-xs text-rose/65 leading-snug">
            {cycleReady ? (
              <>Tailored to your <span className="font-bold text-hotpink">{PHASE_LABEL[phase]}</span> phase ({PHASE_ENERGY[phase].toLowerCase()} energy) — a balanced day to eat, move, flow and reflect. Tap any item to start it.</>
            ) : (
              <>A balanced day to eat, move, flow and reflect. Tap any item to start it — set up your cycle to tailor it to your phase.</>
            )}
          </p>

          {/* Daily affirmation — appears here, softly, under the title */}
          {affirmationCard}

          <div className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-blush/50 px-2.5 py-1 text-[10px] font-semibold leading-snug text-hotpink/80">
            <Sparkles className="h-3 w-3 shrink-0" strokeWidth={2} /> Tick each item as you go — every one grows your daily Bloom ✿
          </div>
        </div>
        <div className="divide-y divide-petal/20 border-t border-petal/30">
          {planItems.map((item, i) => {
            const done   = isItemDone(item);
            const timing = planItemTiming(item.time);
            const NodeIcon = planNodeIcon(item);
            const isFirst  = i === 0;
            const isLast   = i === planItems.length - 1;
            return (
              <div
                key={item.id}
                id={`plan-${item.id}`}
                className={["relative flex items-stretch gap-2.5 sm:gap-3.5 px-3 py-3 sm:px-4 sm:py-4 transition hover:bg-blush/15",
                  highlightId === `plan-${item.id}` ? "animate-attention-squeeze" : ""].join(" ")}
                style={{ animationDelay: `${i * 60}ms` }}
              >
                {/* LEFT TIMELINE RAIL — a soft connected schedule: time + a node
                    icon on a continuous line (like a day's itinerary). */}
                <div className="relative flex w-9 sm:w-11 shrink-0 flex-col items-center justify-center">
                  <span aria-hidden className={["absolute left-1/2 -translate-x-1/2 w-[2px] bg-gradient-to-b from-petal/40 via-petal/70 to-petal/40",
                    isFirst ? "top-[18px]" : "top-0", isLast ? "bottom-[18px]" : "bottom-0"].join(" ")} />
                  {item.time && <span className="relative z-[1] mb-1 text-[9px] sm:text-[9.5px] font-bold tabular-nums text-rose/50">{item.time}</span>}
                  <span className={["relative z-[1] grid h-8 w-8 sm:h-9 sm:w-9 place-items-center rounded-full border-2 transition",
                    done ? "border-hotpink bg-hotpink text-white"
                    : timing === "now" ? "border-hotpink bg-white text-hotpink animate-selected-glow"
                    : "border-petal bg-white text-hotpink/80"].join(" ")}>
                    {done ? <Check className="h-4 w-4" strokeWidth={3} /> : <NodeIcon className="h-4 w-4" strokeWidth={2} />}
                  </span>
                </div>

                {/* Tapping the image / text opens a centred detail popup */}
                <button
                  onClick={() => setActivePlan(item)}
                  className="flex flex-1 min-w-0 items-center gap-3 sm:gap-3.5 text-left transition active:scale-[0.99]"
                >
                  {/* Image — a strong-pink ring marks it done/selected (never hides it) */}
                  <div className={["relative shrink-0 h-[108px] w-[108px] sm:h-[132px] sm:w-[132px] overflow-hidden rounded-2xl transition",
                    done ? "ring-2 ring-hotpink shadow-md shadow-hotpink/30" : ""].join(" ")}>
                    <img
                      src={item.image} alt="" className="h-full w-full object-cover" loading="lazy"
                      onError={(e) => { if (item.fallback && e.currentTarget.src !== item.fallback) { e.currentTarget.onerror = null; e.currentTarget.src = item.fallback; } }}
                    />
                  </div>
                  {/* Text */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {done && (
                        <span className="grid h-4 w-4 shrink-0 place-items-center rounded-full bg-hotpink/15 text-hotpink">
                          <Check className="h-2.5 w-2.5" strokeWidth={3.5} />
                        </span>
                      )}
                      <p className="text-[15px] sm:text-base font-bold leading-snug text-[#831843]">
                        {item.label}
                      </p>
                      {timing === "now" && (
                        <span className="rounded-full bg-hotpink text-white px-2 py-0.5 text-[8px] font-bold uppercase tracking-wide animate-cta-bounce">
                          Now
                        </span>
                      )}
                    </div>
                    <p className={["mt-0.5 text-[11.5px] sm:text-[12.5px] leading-snug", item.prompt ? "italic text-hotpink/70" : "text-rose/60"].join(" ")}>{item.prompt ? `"${item.blurb}"` : item.blurb}</p>
                    {cycleReady && (
                      <div className="mt-1 flex items-center gap-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-hotpink/60">
                          ✿ {PHASE_LABEL[phase]} phase
                        </span>
                      </div>
                    )}
                  </div>
                </button>
                {/* Soft, always-alive CTA — a rapid deep-link straight into the tool */}
                <a
                  href={item.tool}
                  onClick={() => {
                    if (item.launch) writeLaunch(item.launch.key, item.launch.val);
                    if (item.prompt) { try { localStorage.setItem(DIARY_PROMPT_KEY, item.prompt); } catch {} }
                  }}
                  aria-label={`Open ${item.label}`}
                  title="Open tool"
                  className="shrink-0 grid h-9 w-9 place-items-center rounded-full bg-hotpink/10 text-hotpink animate-selected-glow hover:bg-hotpink hover:text-white transition active:scale-90"
                >
                  <ArrowRight className="h-4 w-4" strokeWidth={2.5} />
                </a>
              </div>
            );
          })}
        </div>
        <a href="/app/calendar" className="flex items-center justify-center gap-1 border-t border-petal/30 px-4 py-2.5 text-[11px] font-bold text-hotpink animate-soft-glow">
          Full calendar <ArrowRight className="h-3 w-3" strokeWidth={2} />
        </a>
        </div>
      </section>
      )}

      {/* ── 2a. TODAY'S ENERGY (slim) — the daily balance, links into Diet.
             Hidden until she's set up her cycle or planned meals, so a brand-new
             user never sees a default calorie target dressed up as real data. ── */}
      {(cycleReady || mealPlanned) && (
        <section className="mt-4 sm:mt-6 animate-card-pop-in" style={{ animationDelay: "70ms" }}>
          {/* Bloom+ : the real energy engine (target / eaten / burned numbers). */}
          <PlusLock feature="diet" title="Your energy numbers" blurb="Your real daily target, what you've eaten & burned — the full picture." minH="min-h-[190px]">
            <TodayEnergyStrip e={energyBalance()} />
          </PlusLock>
        </section>
      )}

      {/* ── 2b. YOUR COACH TODAY + TOMORROW — the emotional daily ritual: how you
             feel, what you need, one little joy, and a soft peek at tomorrow.
             Only once her world is set up (before that, the locked preview
             above stands in for it). ── */}
      {cycleReady && allSetup && (
        <section className="mt-4 sm:mt-6 space-y-3 sm:space-y-4 animate-card-pop-in" style={{ animationDelay: "80ms" }}>
          <DiscoverBloomPlus feature="general" />
        </section>
      )}


      </div>{/* /MAIN COLUMN */}

      {/* ── SMART RIGHT PANEL (lg:col-span-2, sticky) ───────────────────────── */}
      <aside className="lg:col-span-2 lg:sticky lg:top-4 self-start">

      {/* ── 3. YOUR BLOOM TODAY (ring + checklist) — hidden on a fresh reset; the
             FreshReveal + Build-your-world checklist carry the first-run story. ── */}
      {!isFresh && (
      <section id="bloom-today" className="mt-4 sm:mt-6 animate-card-pop-in" style={{ animationDelay: "60ms" }}>
        <div className="relative overflow-hidden rounded-[1.75rem] border border-petal/60 bg-gradient-to-br from-blush/55 via-white to-petal/35 shadow-[0_14px_36px_rgba(219,39,119,0.12)]">
          <div className="p-4 sm:p-5">
            {/* Header */}
            <div className="flex items-center gap-2.5">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-hotpink to-magenta text-white shadow-md shadow-hotpink/30"><BloomFlower className="h-[22px] w-[22px] text-white" /></span>
              <div className="min-w-0">
                <h2 className="inline-flex items-center gap-1.5 font-script text-2xl sm:text-3xl text-hotpink leading-none">Your bloom today <Sparkles className="h-4 w-4" strokeWidth={2} /></h2>
                <p className="mt-0.5 text-[10px] font-black uppercase tracking-[0.18em] text-hotpink/60">Daily progress</p>
              </div>
            </div>

            {/* Encouraging message */}
            <p className="mt-2.5 text-[13px] font-semibold text-[#831843] leading-snug">
              {bloomFull ? "Fully bloomed — you're amazing today ✿" : bloomMessage} <span className="text-hotpink">🩷</span>
            </p>

            {/* Ring + tip on top; checklist full-width below (roomy labels) */}
            <div className="mt-3.5">
              <div className="flex items-center gap-3">
                {/* Bloom ring — strong pink */}
                <div className="relative shrink-0">
                  <svg viewBox="0 0 36 36" className="w-[112px] h-[112px] -rotate-90">
                    <defs>
                      <linearGradient id="bloom-ring-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#F472B6" />
                        <stop offset="100%" stopColor="#DB2777" />
                      </linearGradient>
                    </defs>
                    <circle cx="18" cy="18" r="15.9" fill="none" stroke="#FBD3E6" strokeWidth="3.4" />
                    <circle
                      cx="18" cy="18" r="15.9" fill="none"
                      stroke="url(#bloom-ring-grad)" strokeWidth="3.4"
                      strokeDasharray={`${CIRC}`} strokeDashoffset={CIRC * (1 - bloomPercent / 100)}
                      strokeLinecap="round"
                      style={{ transition: "stroke-dashoffset 1.2s cubic-bezier(0.22,1,0.36,1)" }}
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    {bloomFull
                      ? <Star className="h-8 w-8 text-hotpink animate-icon-breathe" strokeWidth={1.5} fill="currentColor" />
                      : <>
                          <p className="font-script text-[2rem] text-hotpink leading-none">{bloomPercent}%</p>
                          <p className="mt-0.5 text-[8.5px] font-black uppercase tracking-[0.15em] text-hotpink/70">Bloomed</p>
                        </>
                    }
                  </div>
                </div>
                {/* Tip */}
                <div className="w-full rounded-2xl bg-white/70 border border-petal/50 px-3 py-2 flex items-start gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 shrink-0 text-hotpink mt-0.5" strokeWidth={2} />
                  <p className="text-[11px] font-medium text-[#831843] leading-snug">{bloomFull ? "You did it — soak it in ✨" : "Small steps today, big changes tomorrow."}</p>
                </div>
              </div>

              {/* Checklist — full-width cards on a soft dotted rail */}
              <div className="relative mt-3 min-w-0 space-y-2 before:absolute before:left-[7px] before:top-3 before:bottom-3 before:w-[2px] before:bg-[repeating-linear-gradient(to_bottom,rgba(236,72,153,0.35)_0_3px,transparent_3px_7px)]">
                {checklist.map((c) => (
                  <button
                    key={c.key}
                    onClick={() => c.key === "mood" ? setMoodPickerOpen((v) => !v) : focusPlanStep(c.key)}
                    className="group relative flex w-full items-center gap-2.5 rounded-2xl bg-white/85 border border-petal/50 pl-5 pr-2.5 py-2 text-left shadow-sm shadow-hotpink/5 transition hover:-translate-y-0.5 hover:shadow-md active:scale-[0.98]"
                  >
                    {/* rail dot */}
                    <span className={["absolute -left-[1px] top-1/2 -translate-y-1/2 h-2.5 w-2.5 rounded-full ring-2 ring-white transition", c.done ? "bg-hotpink" : "bg-petal"].join(" ")} />
                    <span className={["grid h-9 w-9 shrink-0 place-items-center rounded-full transition", c.done ? "bg-gradient-to-br from-hotpink to-magenta text-white" : "bg-blush text-hotpink"].join(" ")}>
                      <c.Icon className="h-[18px] w-[18px]" strokeWidth={1.9} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className={["block text-[13px] font-bold leading-tight truncate", c.done ? "text-[#831843]" : "text-[#831843]"].join(" ")}>{c.label}</span>
                      <span className={["block text-[10.5px] font-semibold leading-tight", c.done ? "text-hotpink" : "text-rose/55"].join(" ")}>{c.sub}</span>
                    </span>
                    {c.done
                      ? <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-hotpink text-white"><Check className="h-3.5 w-3.5" strokeWidth={3} /></span>
                      : <ChevronRight className="h-4 w-4 shrink-0 text-hotpink/50 transition group-hover:text-hotpink" strokeWidth={2.5} />}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Footer bar */}
          <div className="flex items-center justify-between gap-3 border-t border-petal/50 bg-white/45 px-4 py-2.5 sm:px-5">
            <div className="flex items-center gap-2 min-w-0">
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-blush text-hotpink"><BloomFlower className="h-4 w-4 text-hotpink" /></span>
              <div className="min-w-0">
                <p className="text-[12px] font-black text-hotpink leading-tight">You're doing great!</p>
                <p className="text-[10px] text-rose/60 leading-tight truncate">Every little action brings you closer to your best self.</p>
              </div>
            </div>
            <button
              onClick={() => { try { document.getElementById("todays-plan")?.scrollIntoView({ behavior: "smooth", block: "start" }); } catch {} }}
              className="shrink-0 inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-hotpink to-magenta px-3.5 py-1.5 text-[11.5px] font-bold text-white shadow-sm shadow-hotpink/25 transition hover:brightness-105 active:scale-95"
            >
              See my plan <ChevronRight className="h-3.5 w-3.5" strokeWidth={2.5} />
            </button>
          </div>
        </div>
      </section>
      )}

      {/* ── DAILY HYDRATION — sits right under "Your bloom today" in the right
             panel on laptop (and in the single-column flow on mobile). ── */}
      {!isFresh && (
        <HydrationDashboard
          phase={phase}
          cycleReady={cycleReady}
          count={waterCount}
          goal={waterGoal}
          onTapGlass={tapWater}
          onDrinkGlass={() => tapWater(waterCount)}
          remindersEnabled={waterRemindersEnabled}
          reminderBusy={reminderBusy}
          onToggleReminders={toggleWaterReminders}
          onOpenSettings={() => setWaterModalOpen(true)}
          lastGlassAt={waterLastAt}
          bloomPercent={bloomPercent}
          highlight={highlightId === "hydration"}
        />
      )}

      {/* ── 3. DUE TODAY ─────────────────────────────────────────────────────── */}
      {hasDueItems && !isFresh && (
        <section className="mt-4 sm:mt-6 animate-card-pop-in" style={{ animationDelay: "90ms" }}>
          <SectionTitle hint="don't forget">Due Today</SectionTitle>
          <div className="bloom-pearl-card pearl-sheen rounded-3xl p-3 sm:p-4 flex flex-col gap-2">
            {/* Daily pill */}
            <button
              onClick={togglePill}
              aria-pressed={pillTaken}
              className={["flex items-center gap-3 rounded-2xl px-3 py-2.5 transition active:scale-95",
                pillTaken ? "bg-blush/50 opacity-70" : "bg-white/70 hover:bg-blush/40"].join(" ")}
            >
              <span className={["clay-blob grid h-8 w-8 shrink-0 place-items-center rounded-full text-white transition", pillTaken ? "" : "animate-icon-breathe"].join(" ")}>
                <Pill className="h-3.5 w-3.5" strokeWidth={1.8} />
              </span>
              <div className="flex-1 min-w-0 text-left">
                <p className="text-xs font-bold text-[#831843]">Daily {pillLabel}</p>
                <p className="text-[10px] text-rose/60">{pillTaken ? "Taken ✓" : "Tap to confirm you took it"}</p>
              </div>
              <span className={["grid h-5 w-5 shrink-0 place-items-center rounded-full transition", pillTaken ? "bg-hotpink" : "bg-blush/60"].join(" ")}>
                <Check className="h-3 w-3 text-white" strokeWidth={3} />
              </span>
            </button>

            {/* Reminders due today */}
            {visibleReminders.map((rem) => (
              <button
                key={rem.id}
                onClick={() => markReminderDone(rem.id)}
                className="flex items-center gap-3 rounded-2xl bg-white/70 hover:bg-blush/40 px-3 py-2.5 transition active:scale-95 text-left"
              >
                <span className="clay-blob grid h-8 w-8 shrink-0 place-items-center rounded-full text-white animate-icon-breathe">
                  <AlarmClock className="h-3.5 w-3.5" strokeWidth={1.8} />
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-[#831843] truncate">{rem.title}</p>
                  <p className="text-[10px] text-rose/60">
                    {rem.kind === "medication" && rem.times.length > 0 ? rem.times.join(" · ") : rem.time ?? rem.kind}
                  </p>
                </div>
                <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-blush/60">
                  <Check className="h-3 w-3 text-white" strokeWidth={3} />
                </span>
              </button>
            ))}
          </div>
        </section>
      )}


      </aside>{/* /SMART RIGHT PANEL */}
      </div>{/* /2-column grid */}

      {/* ── BLOOM INSPIRATION — the "Today's Bloom" guide isn't launched yet, so it
             lives here at the very end as a blurred "coming soon" teaser. ── */}
      {!isFresh && (
        <section id="bloom-inspiration" className="relative mt-4 sm:mt-6 overflow-hidden rounded-[1.75rem] animate-card-pop-in">
          <span className="absolute right-4 top-4 z-20 inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-hotpink to-[#DB2777] px-3 py-1 text-[10px] font-black uppercase tracking-wider text-white shadow-md">
            <Sparkles className="h-3 w-3" strokeWidth={2.5} /> Coming soon
          </span>
          <div className="pointer-events-none select-none blur-[3px] opacity-80" aria-hidden>
            <CoachTodayCompact coach={coach} />
          </div>
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-1.5 px-6 text-center">
            <span className="grid h-12 w-12 place-items-center rounded-2xl bg-white/85 text-hotpink shadow-lg shadow-hotpink/20"><Sparkles className="h-6 w-6" strokeWidth={2} /></span>
            <p className="font-script text-2xl text-hotpink leading-none">Bloom Inspiration</p>
            <p className="text-[12.5px] font-bold text-[#831843]">Coming soon ✿</p>
            <p className="max-w-[260px] text-[11px] text-rose/60 leading-snug">Daily inspiration &amp; gentle guidance to keep you blooming — we're putting the finishing touches on it.</p>
          </div>
        </section>
      )}

      {/* ── WATER GOAL MODAL ────────────────────────────────────────────────── */}
      {waterModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-fade-in" onClick={() => setWaterModalOpen(false)}>
          <div className="bloom-pearl-card pearl-sheen relative w-full max-w-xs rounded-3xl p-5 sm:p-6" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setWaterModalOpen(false)} aria-label="Close" className="absolute top-3 right-3 grid h-7 w-7 place-items-center rounded-full bg-blush text-rose/70">
              <X className="h-4 w-4" strokeWidth={2} />
            </button>
            <p className="font-script text-2xl text-hotpink leading-none text-center">Daily Water Goal ✿</p>
            <p className="mt-1.5 text-center text-xs text-rose/60">How many glasses per day?</p>
            <div className="mt-4 flex items-center justify-center gap-4">
              <button onClick={() => saveWaterGoal(waterGoal - 1)} className="clay-blob grid h-10 w-10 place-items-center rounded-full text-white" aria-label="Decrease">
                <Minus className="h-4 w-4" strokeWidth={2.5} />
              </button>
              <span className="font-script text-4xl text-hotpink leading-none w-14 text-center">{waterGoal}</span>
              <button onClick={() => saveWaterGoal(waterGoal + 1)} className="clay-blob grid h-10 w-10 place-items-center rounded-full text-white" aria-label="Increase">
                <Plus className="h-4 w-4" strokeWidth={2.5} />
              </button>
            </div>
            <button onClick={() => setWaterModalOpen(false)} className="bloom-luxury-btn mt-5 w-full inline-flex items-center justify-center gap-1.5 px-4 py-2.5 text-sm font-semibold text-white">
              Save goal
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Shared atoms ─────────────────────────────────────────────────────────────
/* ── FreshReveal — the first-run / just-reset centrepiece. Where a set-up user's
      plan lives, a fresh user sees one enchanting reveal: what magic unlocks after
      setup, plus real phase-tuned tasters (a yoga flow she can start now, a snack,
      phase reads with square covers, and a lead into her cycle-nutrition coach). ── */
function FreshReveal({ phase }: { phase: CyclePhase }) {
  const p = (phase === "any" ? "follicular" : phase) as Exclude<CyclePhase, "any">;
  const plan = SHARED_PHASE_PLAN[p];
  const dphase = useMemo(() => toDietPhase(phase), [phase]);
  const snack = useMemo(() => {
    const tuned = RECIPES.filter((r) => r.mealType === "snack" && r.phases.includes(dphase));
    const any   = RECIPES.filter((r) => r.mealType === "snack");
    return tuned[0] || any[0];
  }, [dphase]);
  const reads = useMemo(() => {
    const tuned = ARTICLES.filter((a) => a.phase === dphase);
    const base  = ARTICLES.filter((a) => !a.phase);
    return [...tuned, ...base].slice(0, 3);
  }, [dphase]);

  const launchYoga = () => {
    try { writeLaunch(LAUNCH_YOGA_KEY, plan.yoga.launch); } catch {}
    window.location.href = "/app/tools/yoga";
  };

  return (
    <section className="mt-4 sm:mt-6 space-y-4">
      {/* Attention hero — what magic unlocks after setup */}
      <div
        className="relative overflow-hidden rounded-3xl p-5 sm:p-6 animate-card-pop-in"
        style={{ background: "linear-gradient(135deg,#FDF2F8,#FCE7F3 55%,#FBCFE8)", animationDelay: "40ms" }}
      >
        <BloomFlower className="pointer-events-none absolute -right-7 -top-7 h-32 w-32 text-hotpink/10 animate-icon-breathe" />
        <p className="inline-flex items-center gap-1.5 rounded-full bg-white/85 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest text-hotpink border border-petal/60">
          <Sparkles className="h-3 w-3" strokeWidth={2.2} /> A peek at your bloom
        </p>
        <h2 className="mt-2 font-script text-2xl sm:text-3xl text-hotpink leading-tight">
          Set up your world &amp; watch Today bloom ✿
        </h2>
        <p className="mt-1.5 text-[12.5px] sm:text-sm text-rose/75 leading-snug max-w-md">
          Every tool you set up pours into this space — a whole day made just for you,
          matched to your phase, your energy &amp; your goals. Here's a little taste ↓
        </p>
      </div>

      {/* Phase yoga flow — a real flow she can start right now */}
      <button
        onClick={launchYoga}
        className="group relative block w-full overflow-hidden rounded-3xl text-left animate-card-pop-in hover-scale active:scale-[0.99] transition"
        style={{ animationDelay: "90ms" }}
      >
        <img src={plan.yoga.image} alt="" className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" referrerPolicy="no-referrer" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/25 to-transparent" />
        <div className="relative z-[1] flex items-center gap-3 p-4 sm:p-5 min-h-[132px]">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-white/90 text-hotpink shadow-lg animate-icon-breathe">
            <Play className="h-5 w-5 fill-hotpink" />
          </span>
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-widest text-white/80">Yoga · {PHASE_LABEL[phase]} phase</p>
            <p className="font-script text-2xl text-white leading-tight drop-shadow">{plan.yoga.title}</p>
            <p className="text-[12px] text-white/85 leading-snug max-w-xs">{plan.yoga.blurb}</p>
          </div>
        </div>
      </button>

      {/* Phase snack — beautifully plated */}
      {snack && (
        <a
          href="/app/tools/meals"
          className="group flex items-stretch overflow-hidden rounded-3xl bloom-pearl-card pearl-sheen animate-card-pop-in hover-scale active:scale-[0.99] transition"
          style={{ animationDelay: "140ms" }}
        >
          <div className="relative w-32 sm:w-40 shrink-0 overflow-hidden">
            <img src={recipeImageSrc(snack)} alt={snack.name} className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" loading="lazy" referrerPolicy="no-referrer" />
          </div>
          <div className="flex-1 min-w-0 p-4">
            <p className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-hotpink/70"><Apple className="h-3 w-3" /> Snack · {PHASE_LABEL[phase]} phase</p>
            <p className="mt-1 font-script text-xl text-hotpink leading-tight">{snack.name}</p>
            <p className="text-[12px] text-rose/70 leading-snug">{snack.macros.calories} kcal · {snack.macros.protein}g protein · {snack.cuisine}</p>
            <span className="mt-2 inline-flex items-center gap-1 text-[11px] font-bold text-hotpink">See it in Meals <ArrowRight className="h-3 w-3" /></span>
          </div>
        </a>
      )}

      {/* Read — phase-tuned blogs with SQUARE covers */}
      <div className="animate-card-pop-in" style={{ animationDelay: "190ms" }}>
        <div className="mb-2 flex items-center justify-between">
          <p className="font-script text-2xl text-hotpink">Read for your phase ✿</p>
          <a href="/app/read" className="text-[11px] font-bold text-hotpink inline-flex items-center gap-1">All reads <ArrowRight className="h-3 w-3" /></a>
        </div>
        <div className="grid grid-cols-3 gap-2.5">
          {reads.map((a, i) => (
            <a key={a.id} href="/app/read" className="group block animate-card-pop-in" style={{ animationDelay: `${220 + i * 60}ms` }}>
              <div className="relative aspect-square overflow-hidden rounded-2xl bloom-pearl-card">
                <img src={a.image} alt="" className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" loading="lazy" referrerPolicy="no-referrer" />
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/65 to-transparent p-2">
                  <p className="text-[11px] font-bold text-white leading-tight line-clamp-2">{a.title}</p>
                </div>
              </div>
              <p className="mt-1 text-[10px] text-rose/60 font-semibold">{a.minutes} min read</p>
            </a>
          ))}
        </div>
      </div>

      {/* Coach — a beautiful lead into cycle nutrition */}
      <a
        href="/app/tools/diet"
        className="group relative block overflow-hidden rounded-3xl p-5 text-white animate-card-pop-in hover-scale active:scale-[0.99] transition"
        style={{ background: "linear-gradient(125deg,#EC4899,#DB2777 60%,#9D174D)", animationDelay: "300ms" }}
      >
        <BloomFlower className="pointer-events-none absolute -right-4 -bottom-7 h-28 w-28 text-white/10 animate-icon-breathe" />
        <p className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-white/80"><Heart className="h-3 w-3 fill-white/80" /> Your coach today</p>
        <p className="mt-1 font-script text-2xl leading-tight">Cycle nutrition, made personal</p>
        <p className="mt-1 text-[12.5px] text-white/85 leading-snug max-w-sm">
          Set your goal and I'll coach your meals, energy &amp; cravings through every phase — gently, and just for you.
        </p>
        <span className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1.5 text-[12px] font-bold">Meet your coach <ArrowRight className="h-3.5 w-3.5" /></span>
      </a>
    </section>
  );
}

function SectionTitle({ children, hint }: { children: React.ReactNode; hint?: string }) {
  return (
    <div className="mb-2.5 flex items-end justify-between gap-3">
      <h2 className="font-script text-3xl sm:text-4xl text-hotpink">{children}</h2>
      {hint && <span className="text-xs text-rose/60 pb-1">{hint}</span>}
    </div>
  );
}

/** The Bloomzein logo flower (6 petals + soft centre), tinted via currentColor. */
function BloomFlower({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 512 512" className={className} aria-hidden="true">
      <g fill="currentColor">
        {[0, 60, 120, 180, 240, 300].map((deg) => (
          <ellipse key={deg} cx="256" cy="161" rx="46" ry="92" transform={`rotate(${deg} 256 256)`} />
        ))}
      </g>
      <circle cx="256" cy="256" r="42" fill="#FFD9EC" />
    </svg>
  );
}

/**
 * PlanDetailModal — a soft, centred popup with the full detail of a plan item.
 * Portaled to <body> so it is perfectly centred on every device size, matching
 * the Calendar day popup. Carries the item's primary "open tool" CTA plus a
 * gentle "mark done" toggle so the row itself stays tap-to-preview.
 */
function PlanDetailModal({
  item, phase, cycleReady, done, onToggleDone, onClose,
}: {
  item: PlanItem | null;
  phase: Exclude<CyclePhase, "any">;
  cycleReady: boolean;
  done: boolean;
  onToggleDone: () => void;
  onClose: () => void;
}) {
  const [saved, setSaved] = useState(false);
  useEffect(() => {
    if (!item) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [item, onClose]);
  useEffect(() => { if (item) { try { setSaved(JSON.parse(localStorage.getItem("bloom:saved-items") || "[]").includes(item.id)); } catch {} } }, [item]);

  if (!item) return null;
  const timing = planItemTiming(item.time);
  const dow = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"][(new Date().getDay() + 6) % 7];
  const reason = reasonForItem(item, phase, {
    yoga: { planned: readYogaPlanDays().includes(dow), title: SHARED_PHASE_PLAN[phase].yoga.title },
    workout: { planned: readWorkoutPlanDays().includes(dow), title: SHARED_PHASE_PLAN[phase].workout.title },
  });
  const CARD_ICON = { cycle: Droplet, movement: Activity, energy: Zap, goal: Target } as const;
  const phaseLabel = PHASE_LABEL[phase];
  const whyNoun = reason.type === "meal" ? "meal" : reason.type === "journal" ? "reflection" : reason.typeLabel.toLowerCase();
  const primaryLabel = reason.type === "meal" ? "View recipe" : reason.type === "journal" ? "Open journal" : "Start session";
  const doneLabel = reason.type === "meal" ? (done ? "Eaten ✓" : "I ate this")
    : reason.type === "journal" ? (done ? "Journaled ✓" : "I journaled")
    : (done ? "Done ✓" : "I did this");
  const openTool = () => {
    if (item.launch) writeLaunch(item.launch.key, item.launch.val);
    if (item.prompt) { try { localStorage.setItem(DIARY_PROMPT_KEY, item.prompt); } catch {} }
  };
  const toggleSaved = () => setSaved((s) => {
    const n = !s;
    try { const cur = JSON.parse(localStorage.getItem("bloom:saved-items") || "[]"); const next = n ? [...new Set([...cur, item.id])] : cur.filter((x: string) => x !== item.id); localStorage.setItem("bloom:saved-items", JSON.stringify(next)); } catch {}
    return n;
  });
  // Highlight the phase phrase inside the narrative (e.g. "period phase").
  const phaseRe = new RegExp(`(${phaseLabel}[- ]phase)`, "i");
  const hl = (text: string) => text.split(new RegExp(`(${phaseLabel}[- ]phase)`, "i")).map((p, i) =>
    p && phaseRe.test(p) ? <b key={i} className="font-semibold text-hotpink">{p}</b> : <span key={i}>{p}</span>);
  const cardPrefix = (k: string) => k === "cycle" ? "Supports today's" : k === "goal" ? "Supports your goal:" : k === "movement" && reason.type === "meal" ? "Pairs with" : "";
  const NUT = reason.nutrition ? [
    { l: "kcal", v: `${reason.nutrition.calories}`, Icon: Flame, color: "#EC4899" },
    { l: "Protein", v: `${reason.nutrition.protein}g`, Icon: Dumbbell, color: "#A855F7" },
    { l: "Carbs", v: `${reason.nutrition.carbs}g`, Icon: Wheat, color: "#F59E0B" },
    { l: "Fats", v: `${reason.nutrition.fat}g`, Icon: Droplet, color: "#EAB308" },
    { l: "Fiber", v: reason.nutrition.fibre > 0 ? `${reason.nutrition.fibre}g` : "—", Icon: Leaf, color: "#22C55E" },
  ] : [];
  const cardCols = reason.cards.length >= 4 ? "grid-cols-4" : "grid-cols-3";

  return createPortal(
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center p-3 sm:p-4 bg-rose/30 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-sm max-h-[92vh] flex flex-col overflow-hidden rounded-[2rem] bg-[#FFF5F9] shadow-2xl shadow-hotpink/30 animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        <button onClick={onClose} aria-label="Close" className="absolute right-3 top-3 z-10 grid h-8 w-8 place-items-center rounded-full bg-white text-rose shadow-md hover:bg-blush transition active:scale-90">
          <X className="h-4 w-4" strokeWidth={2.5} />
        </button>

        {/* HEADER — image left, title + tags + AI badge right */}
        <div className="shrink-0 flex gap-3 p-4 pb-2">
          <div className="relative w-28 shrink-0 self-start">
            <img
              src={item.image} alt="" className="aspect-square w-full rounded-2xl object-cover"
              onError={(e) => { if (item.fallback && e.currentTarget.src !== item.fallback) { e.currentTarget.onerror = null; e.currentTarget.src = item.fallback; } }}
            />
            <button onClick={toggleSaved} aria-label="Save" className="absolute left-1.5 top-1.5 grid h-7 w-7 place-items-center rounded-full bg-white/90 text-hotpink shadow active:scale-90">
              <Heart className={["h-3.5 w-3.5", saved ? "fill-hotpink" : ""].join(" ")} strokeWidth={2} />
            </button>
          </div>
          <div className="min-w-0 flex-1 pr-6">
            <h3 className="font-serif text-[19px] font-bold text-[#9D174D] leading-tight">
              {item.label} <BloomFlower className="inline h-3.5 w-3.5 text-hotpink" />
            </h3>
            <div className="mt-1 flex items-center gap-2">
              <span className="rounded-md bg-blush px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-hotpink">{reason.typeLabel}</span>
              {reason.kcal != null && <span className="text-[11px] font-bold text-hotpink">{reason.kcal} kcal</span>}
            </div>
            {reason.tags.length > 0 && <p className="mt-1 text-[10.5px] text-rose/70">{reason.tags.join("  ·  ")}</p>}
            <div className="mt-2 flex items-start gap-1.5 rounded-xl bg-blush/60 px-2.5 py-1.5">
              <Sparkles className="mt-0.5 h-3 w-3 shrink-0 text-hotpink" strokeWidth={2} />
              <div className="min-w-0">
                <p className="text-[10px] font-bold text-hotpink leading-tight">AI selected for you today</p>
                <p className="text-[9px] text-rose/60 leading-tight">Based on your cycle, movement and goals.</p>
              </div>
            </div>
          </div>
        </div>

        {/* SCROLL BODY */}
        <div className="flex-1 overflow-y-auto px-3 pb-3 space-y-2.5">
          {/* Why + 4 cards (one white card) */}
          <div className="rounded-2xl bg-white p-3">
            <p className="flex items-start gap-1.5 text-[13px] font-bold text-[#9D174D] leading-tight">
              <BloomFlower className="mt-0.5 h-3.5 w-3.5 shrink-0 text-hotpink" /> Why Bloomzein chose this {whyNoun} for you today
            </p>
            <p className="mt-1 text-[11.5px] text-rose/80 leading-relaxed">{hl(reason.narrative)}</p>

            <div className={["mt-2.5 grid gap-1.5", cardCols].join(" ")}>
              {reason.cards.map((c) => {
                const Ic = CARD_ICON[c.key];
                const prefix = cardPrefix(c.key);
                return (
                  <div key={c.key} className="flex flex-col items-center rounded-xl bg-blush/40 p-1.5 text-center">
                    <span className="grid h-6 w-6 place-items-center rounded-full bg-white text-hotpink"><Ic className="h-3 w-3" strokeWidth={2} /></span>
                    <p className="mt-1 text-[9.5px] font-bold text-hotpink leading-none">{c.title}</p>
                    <p className="mt-0.5 text-[7.5px] leading-tight">
                      {prefix ? <><span className="text-rose/50">{prefix} </span><b className="text-rose/80">{c.supports}</b></> : <span className="text-rose/60">{c.supports}</span>}
                    </p>
                    <ul className="mt-1 w-full space-y-0.5 text-left">
                      {c.bullets.map((b, i) => (
                        <li key={i} className="flex items-start gap-0.5 text-[7.5px] text-rose/70 leading-tight">
                          <Check className="mt-[1px] h-2 w-2 shrink-0 text-hotpink" strokeWidth={3} />{b}
                        </li>
                      ))}
                    </ul>
                    <span className="mt-1.5 grid h-4 w-4 place-items-center rounded-full bg-hotpink text-white shadow-sm shadow-hotpink/40"><Check className="h-2.5 w-2.5" strokeWidth={3} /></span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Nutrition breakdown (meals) */}
          {reason.nutrition && (
            <div className="rounded-2xl bg-white p-3">
              <div className="mb-2 flex items-center justify-between">
                <p className="flex items-center gap-1 text-[12px] font-bold text-[#9D174D]"><BloomFlower className="h-3 w-3 text-hotpink" /> Nutrition breakdown</p>
                <a href="/app/tools/diet" className="inline-flex items-center gap-0.5 text-[10px] font-bold text-hotpink">More details <ChevronRight className="h-3 w-3" /></a>
              </div>
              <div className="grid grid-cols-5 gap-1.5 text-center">
                {NUT.map((n) => (
                  <div key={n.l} className="flex flex-col items-center rounded-xl bg-blush/40 py-1.5">
                    <n.Icon className="h-3.5 w-3.5" style={{ color: n.color }} strokeWidth={2} />
                    <p className="mt-0.5 text-[11px] font-bold text-[#9D174D] leading-none">{n.v}</p>
                    <p className="text-[7.5px] text-rose/50">{n.l}</p>
                  </div>
                ))}
              </div>
              {reason.micros && reason.micros.length > 0 && (
                <div className="mt-2.5 grid grid-cols-4 gap-1 text-center">
                  {reason.micros.map((m) => (
                    <div key={m.label}>
                      <p className="mb-0.5 text-[8.5px] text-rose/70">{m.label}</p>
                      <span className="flex justify-center">
                        {[0, 1, 2, 3, 4].map((i) => (
                          <Star key={i} className={["h-2 w-2", i < Math.round(m.stars) ? "fill-hotpink text-hotpink" : "text-petal"].join(" ")} strokeWidth={1.5} />
                        ))}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Did you know — decorative right */}
          <div className="relative overflow-hidden rounded-2xl bg-blush/50 p-3 pr-14">
            <p className="flex items-center gap-1.5 text-[11px] font-bold text-hotpink"><span className="grid h-5 w-5 place-items-center rounded-full bg-white"><Lightbulb className="h-3 w-3" strokeWidth={2} /></span> Did you know?</p>
            <p className="mt-1 text-[10.5px] text-rose/70 leading-snug">{reason.didYouKnow}</p>
            <span aria-hidden className="pointer-events-none absolute -bottom-1 right-1 text-4xl opacity-80">🌸</span>
          </div>

          {/* Bloom tip — decorative right */}
          <div className="relative overflow-hidden rounded-2xl bg-blush/50 p-3 pr-14">
            <p className="flex items-center gap-1.5 text-[11px] font-bold text-hotpink"><span className="grid h-5 w-5 place-items-center rounded-full bg-white"><Sparkles className="h-3 w-3" strokeWidth={2} /></span> Bloom tip for today</p>
            <p className="mt-1 text-[10.5px] text-rose/70 leading-snug">{reason.bloomTip}</p>
            <span aria-hidden className="pointer-events-none absolute -bottom-1 right-1 text-4xl opacity-80">{reason.type === "meal" ? "🍵" : "🌙"}</span>
          </div>

          {/* Why Bloom didn't choose — decorative right */}
          {reason.avoided && (
            <div className="relative overflow-hidden rounded-2xl bg-white p-3 pr-14">
              <p className="flex items-center gap-1.5 text-[11px] font-bold text-rose/70"><span className="grid h-5 w-5 place-items-center rounded-full bg-blush/70"><X className="h-3 w-3" strokeWidth={2.5} /></span> Why Bloom didn't choose…</p>
              <p className="mt-1 text-[10.5px] text-rose/60 leading-snug">{reason.avoided}</p>
              <span aria-hidden className="pointer-events-none absolute -bottom-1 right-1 text-4xl opacity-70">🧁</span>
            </div>
          )}

          {/* Explore more */}
          <div>
            <p className="mb-1.5 flex items-center gap-1 text-[11px] font-bold text-hotpink"><BloomFlower className="h-3 w-3" /> Explore more</p>
            <div className="grid grid-cols-3 gap-1.5">
              {reason.explore.map((e) => {
                const EIc = e.kind === "read" ? BookOpen : e.kind === "meditation" ? Headphones : Flower2;
                return (
                  <a key={e.label} href={e.href} className="group flex flex-col overflow-hidden rounded-xl bg-white transition hover-scale">
                    {e.image && (
                      <div className="relative h-12 w-full overflow-hidden">
                        <img src={e.image} alt="" className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" loading="lazy" referrerPolicy="no-referrer" />
                      </div>
                    )}
                    <div className="p-2">
                      <div className="flex items-center justify-between">
                        <span className="grid h-5 w-5 place-items-center rounded-lg bg-blush/60 text-hotpink"><EIc className="h-3 w-3" strokeWidth={2} /></span>
                        <ArrowRight className="h-3 w-3 text-hotpink/50" />
                      </div>
                      <p className="mt-1 text-[10px] font-bold text-hotpink leading-tight">{e.label}</p>
                      <p className="text-[8px] text-rose/55 leading-tight line-clamp-2">{e.sub}</p>
                    </div>
                  </a>
                );
              })}
            </div>
          </div>
        </div>

        {/* FOOTER */}
        <div className="shrink-0 flex items-center gap-1.5 border-t border-petal/40 bg-white px-2.5 py-2.5">
          {reason.type === "meal" ? (
            <>
              <a href={item.tool} onClick={openTool} className="flex flex-col items-center gap-0.5 rounded-xl px-2 py-1 text-hotpink active:scale-95"><Repeat className="h-4 w-4" strokeWidth={2} /><span className="text-[8px] font-bold">Swap</span></a>
              <a href={item.tool} onClick={openTool} className="flex flex-col items-center gap-0.5 rounded-xl px-2 py-1 text-hotpink active:scale-95"><BookOpen className="h-4 w-4" strokeWidth={2} /><span className="text-[8px] font-bold">Recipe</span></a>
              <button onClick={onToggleDone} aria-pressed={done} className={["flex-1 inline-flex items-center justify-center gap-1 rounded-full px-3 py-2.5 text-[12px] font-bold active:scale-95 transition", done ? "bg-emerald-500 text-white" : "bloom-luxury-btn text-white animate-selected-glow"].join(" ")}>
                {done && <Check className="h-3.5 w-3.5" strokeWidth={3} />}{doneLabel}
              </button>
              <button onClick={toggleSaved} className="flex flex-col items-center gap-0.5 rounded-xl px-2 py-1 text-hotpink active:scale-95"><Heart className={["h-4 w-4", saved ? "fill-hotpink" : ""].join(" ")} strokeWidth={2} /><span className="text-[8px] font-bold">Save</span></button>
            </>
          ) : (
            <>
              <a href={item.tool} onClick={openTool} className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-full border border-petal/60 bg-white px-4 py-2.5 text-[13px] font-bold text-hotpink active:scale-95 transition">
                {primaryLabel} <ArrowRight className="h-3.5 w-3.5" strokeWidth={2.5} />
              </a>
              <button onClick={onToggleDone} aria-pressed={done} className={["flex-1 inline-flex items-center justify-center gap-1.5 rounded-full px-4 py-2.5 text-[13px] font-bold active:scale-95 transition", done ? "bg-emerald-500 text-white" : "bloom-luxury-btn text-white animate-selected-glow"].join(" ")}>
                {done && <Check className="h-4 w-4" strokeWidth={3} />}{doneLabel}
              </button>
            </>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}

const MOOD_POPOVER_SIZE = { width: 220, height: 196 };

function MoodPopover({
  open, onClose, onPick, triggerRef,
}: {
  open: boolean;
  onClose: () => void;
  onPick: (key: string) => void;
  triggerRef: React.RefObject<HTMLElement | null>;
}) {
  const style = useSmartPopoverPosition(triggerRef, open, MOOD_POPOVER_SIZE);

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      const target = e.target as HTMLElement;
      if (triggerRef.current?.contains(target as Node)) return;
      if (target.closest?.("[data-mood-popover]")) return;
      onClose();
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open, onClose, triggerRef]);

  if (!open) return null;

  return createPortal(
    <div
      data-mood-popover
      style={style}
      className="rounded-3xl bg-white/95 backdrop-blur-xl p-3 shadow-2xl shadow-hotpink/20 ring-1 ring-petal animate-scale-in"
    >
      <p className="mb-2 text-center text-[10px] font-bold tracking-widest text-rose">HOW ARE YOU FEELING? ✿</p>
      <div className="grid grid-cols-3 gap-1.5">
        {MOODS.map((m, i) => (
          <button
            key={m.key}
            onClick={() => onPick(m.key)}
            className="group flex flex-col items-center gap-1 rounded-2xl border border-transparent bg-transparent py-1.5 px-0.5 transition hover:bg-blush/60 hover:border-hotpink/20 active:scale-95"
            style={{ animationDelay: `${i * 0.05}s` }}
          >
            <span className="clay-blob animate-icon-breathe grid h-8 w-8 place-items-center rounded-full text-white">
              <m.Icon className="h-4 w-4" strokeWidth={1.8} />
            </span>
            <span className="text-[10px] font-semibold text-rose">{m.label}</span>
          </button>
        ))}
      </div>
    </div>,
    document.body
  );
}

const SYMPTOM_POPOVER_SIZE = { width: 248, height: 236 };

function SymptomPopover({
  open, onClose, selected, onToggle, triggerRef,
}: {
  open: boolean;
  onClose: () => void;
  selected: string[];
  onToggle: (label: string) => void;
  triggerRef: React.RefObject<HTMLElement | null>;
}) {
  const style = useSmartPopoverPosition(triggerRef, open, SYMPTOM_POPOVER_SIZE);

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      const target = e.target as HTMLElement;
      if (triggerRef.current?.contains(target as Node)) return;
      if (target.closest?.("[data-symptom-popover]")) return;
      onClose();
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open, onClose, triggerRef]);

  if (!open) return null;

  return createPortal(
    <div
      data-symptom-popover
      style={style}
      className="rounded-3xl bg-white/95 backdrop-blur-xl p-3 shadow-2xl shadow-hotpink/20 ring-1 ring-petal animate-scale-in"
    >
      <p className="mb-2 text-center text-[10px] font-bold tracking-widest text-rose">HOW'S YOUR BODY? ✿</p>
      <div className="flex flex-wrap justify-center gap-1.5" style={{ maxWidth: 224 }}>
        {SYMPTOM_OPTIONS.map((s) => {
          const active = selected.includes(s);
          return (
            <button
              key={s}
              onClick={() => onToggle(s)}
              className={["rounded-full px-2.5 py-1 text-[11px] font-bold border transition active:scale-95",
                active
                  ? "bg-hotpink text-white border-hotpink shadow-sm shadow-hotpink/30"
                  : "bg-blush/50 text-rose border-petal/50 hover:bg-blush/70"].join(" ")}
            >
              {s}
            </button>
          );
        })}
      </div>
      <button
        onClick={onClose}
        className="mt-2.5 w-full rounded-full bg-hotpink py-1.5 text-[11px] font-bold text-white active:scale-95 transition"
      >
        Done ✿
      </button>
    </div>,
    document.body
  );
}
