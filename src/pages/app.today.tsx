import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  Sparkles, Flower2, Heart, ArrowRight, Sun, Moon, Smile, Cloud,
  CloudRain, Battery, Droplet, X, Settings2, Play, RefreshCw, Dumbbell,
  BookHeart, Check, Plus, Minus, Bell, BellOff, Pill, CalendarDays,
  ChevronDown, AlarmClock, Star, Activity, UtensilsCrossed, Apple,
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
import { CoachTodayCompact, TomorrowCard } from "@/components/bloom/coach/CoachCards";
import { PlusLock, DiscoverBloomPlus } from "@/components/bloom/premium/PremiumKit";
import { PHASE_PLAN as SHARED_PHASE_PLAN, LAUNCH_YOGA_KEY, LAUNCH_WORKOUT_KEY, LAUNCH_MEAL_KEY, DIARY_PROMPT_KEY, writeLaunch } from "@/components/bloom/phasePlan";
import { readWorkoutStreak, readYogaStreak, readTodayPlannedDay, readYogaPlanDays, readWorkoutPlanDays, hasMealPlan, hasMovementPlan, SYMPTOM_OPTIONS, readSymptomsForDay, toggleSymptomForDay, isPillTaken, setPillTaken as savePillTaken } from "@/lib/crossToolData";
import { hasDietSetup } from "@/components/bloom/recipes/data";
import { startGuide, endGuide, isGuided } from "@/lib/guidedSetup";
import { SpotlightCoach } from "@/components/bloom/SpotlightCoach";
import { BloomDayCelebration } from "@/components/bloom/BloomDayCelebration";
import { RECIPES, PHASE_MICROS, recipeImageSrc } from "@/components/bloom/recipes/data";
import { ARTICLES } from "@/lib/readsData";
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
  const [streak,              setStreak]              = useState(0);
  const [planDone,            setPlanDone]            = useState<string[]>([]);
  const [affirmIdx,           setAffirmIdx]           = useState(0);
  const [waterRemindersEnabled, setWaterRemindersEnabled] = useState(false);
  const [reminderBusy,        setReminderBusy]        = useState(false);
  const [pillTaken,           setPillTaken]           = useState(false);
  const [moodPickerOpen,      setMoodPickerOpen]      = useState(false);
  const [activePlan,          setActivePlan]          = useState<PlanItem | null>(null);
  // When she taps an unfinished bloom-checklist step, we scroll to + squeeze the
  // matching item in Today's Plan (this DOM id) instead of leaving for the tool.
  const [highlightId,         setHighlightId]         = useState<string | null>(null);
  const [affirmDismissed,     setAffirmDismissed]     = useState(false);
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

    broadcastCyclePhase();
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

  const checklist = useMemo(() => {
    const mealsDone = mealItems.filter((m) => planDone.includes(m.id)).length;
    const moveDone  = moveItems.filter((m) => planDone.includes(m.id)).length;
    const rows: { key: string; label: string; done: boolean; href: string; tool: string }[] = [
      { key: "mood",  label: "Log your mood",  done: !!mood,                  href: "",           tool: "" },
      { key: "water", label: "Hit water goal", done: waterCount >= waterGoal, href: "#hydration", tool: "" },
    ];
    if (mealItems.length)
      rows.push({ key: "meals", label: `Eat your meals (${mealsDone}/${mealItems.length})`, done: mealsDone === mealItems.length, href: "/app/tools/meals", tool: "/app/tools/meals" });
    if (moveItems.length)
      rows.push({ key: "move", label: moveItems.length > 1 ? `Move your body (${moveDone}/${moveItems.length})` : (moveItems[0].label ?? "Move"), done: moveDone === moveItems.length, href: moveItems[0].tool, tool: moveItems[0].tool });
    if (journalItem)
      rows.push({ key: "journal", label: "Write in diary", done: planDone.includes(journalItem.id), href: "/app/tools/diary", tool: "/app/tools/diary" });
    return rows;
  }, [mood, waterCount, waterGoal, planDone, mealItems, moveItems, journalItem]);

  // Tapping a bloom-checklist step keeps her on Today and points at the exact
  // thing to complete: scroll the matching plan item (or the hydration card) into
  // view and squeeze it — "this is your next step" — rather than jumping away.
  const focusPlanStep = (key: string) => {
    let domId: string | null = null;
    if (key === "water") domId = "hydration";
    else if (key === "meals") { const m = mealItems.find((x) => !planDone.includes(x.id)) ?? mealItems[0]; domId = m ? `plan-${m.id}` : null; }
    else if (key === "move")  { const m = moveItems.find((x) => !planDone.includes(x.id)) ?? moveItems[0]; domId = m ? `plan-${m.id}` : null; }
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
  const bloomUnits    = [!!mood, waterCount >= waterGoal, ...planItems.map((i) => planDone.includes(i.id))];
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

  return (
    <div className="relative">
      <BloomBubbles count={10} />

      {/* ── 1. HERO ─────────────────────────────────────────────────────────── */}
      <section
        className="pearl-frame relative overflow-hidden -mx-3 sm:-mx-6 md:mx-0 -mt-3 sm:-mt-5 md:mt-0 rounded-b-[1.75rem] sm:rounded-b-[2.5rem] md:rounded-[2.5rem] rounded-t-none md:rounded-t-[2.5rem] animate-card-pop-in"
        style={{ animationDelay: "0ms" }}
      >
        <img src="/images/today-hero.webp" alt="" className="animate-hero-breathe absolute inset-0 h-full w-full object-cover object-top" referrerPolicy="no-referrer" />
        <div className="absolute inset-0 bg-gradient-to-r from-white/90 via-white/55 to-transparent" />
        <div className={`absolute inset-0 bg-gradient-to-r ${PHASE_GRADIENT[phase]}`} />

        <div className="relative z-[2] flex flex-col items-start px-4 py-3 pb-7 sm:px-8 sm:py-4 sm:pb-8 w-[68%] sm:max-w-md">
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

              <p className="mt-1.5 sm:mt-2.5 text-[11px] sm:text-sm text-rose/90 leading-snug max-w-xs">
                {PHASE_QUOTES[phase]}
              </p>
            </>
          ) : (
            <>
              <a href="/app/tools/cycle" className="mt-1.5 sm:mt-2 inline-flex items-center gap-1.5 whitespace-nowrap rounded-full bg-hotpink/90 text-white text-[10px] sm:text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 sm:px-3 sm:py-1 transition hover:bg-hotpink active:scale-95">
                <Sparkles className="h-3 w-3" strokeWidth={2.2} /> Set up your cycle
              </a>

              <p className="mt-1.5 sm:mt-2.5 text-[11px] sm:text-sm text-rose/90 leading-snug max-w-xs">
                Welcome to your Bloom ✿ Let's set up your world — start below.
              </p>
            </>
          )}

        </div>

        {/* Streak badge — bottom-right, on the symptom-icon line; honest about a fresh start */}
        <div className="absolute bottom-3 right-3 sm:bottom-4 sm:right-4 z-[2] rounded-2xl bg-white/60 backdrop-blur px-2.5 py-1 sm:px-3 sm:py-1.5 text-center border border-petal/40 shadow-md">
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
      </section>

      {/* ── QUICK STATS — Mood · Symptom · Energy · Water, four elegant cards ── */}
      <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <button ref={moodTileRef} onClick={() => setMoodPickerOpen((v) => !v)} aria-haspopup="dialog" aria-expanded={moodPickerOpen}
          className="group flex items-center gap-2.5 rounded-2xl bg-white/90 border border-petal/60 p-2.5 text-left shadow-sm shadow-hotpink/5 transition hover:-translate-y-0.5 active:scale-[0.98]">
          <span className="clay-blob grid h-10 w-10 shrink-0 place-items-center rounded-full text-white"><MoodIcon className="h-5 w-5" strokeWidth={1.8} /></span>
          <span className="min-w-0 flex-1">
            <span className="block text-[9px] font-bold uppercase tracking-wider text-rose/55 leading-none">Mood</span>
            <span className="mt-0.5 block font-script text-lg leading-none text-hotpink truncate">{mood ? MOOD_LABEL[mood] : "Tap in"}</span>
          </span>
          <ArrowRight className="h-3.5 w-3.5 shrink-0 text-rose/25 transition group-hover:text-hotpink" strokeWidth={2.5} />
        </button>

        <button ref={symptomTileRef} onClick={() => setSymptomPickerOpen((v) => !v)} aria-haspopup="dialog" aria-expanded={symptomPickerOpen}
          className="group flex items-center gap-2.5 rounded-2xl bg-white/90 border border-petal/60 p-2.5 text-left shadow-sm shadow-hotpink/5 transition hover:-translate-y-0.5 active:scale-[0.98]">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-blush text-hotpink"><Activity className="h-5 w-5" strokeWidth={1.9} /></span>
          <span className="min-w-0 flex-1">
            <span className="block text-[9px] font-bold uppercase tracking-wider text-rose/55 leading-none">Symptom</span>
            <span className="mt-0.5 block font-script text-lg leading-none text-hotpink truncate">{symptomsToday.length ? `${symptomsToday.length} noted` : "Check in"}</span>
          </span>
          <ArrowRight className="h-3.5 w-3.5 shrink-0 text-rose/25 transition group-hover:text-hotpink" strokeWidth={2.5} />
        </button>

        <a href="/app/calendar" className="group flex items-center gap-2.5 rounded-2xl bg-white/90 border border-petal/60 p-2.5 text-left shadow-sm shadow-hotpink/5 transition hover:-translate-y-0.5 active:scale-[0.98]">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-blush text-hotpink"><Battery className="h-5 w-5" strokeWidth={1.9} /></span>
          <span className="min-w-0 flex-1">
            <span className="block text-[9px] font-bold uppercase tracking-wider text-rose/55 leading-none">Energy</span>
            <span className="mt-0.5 block font-script text-lg leading-none text-hotpink truncate">{cycleReady ? PHASE_ENERGY[phase].charAt(0).toUpperCase() + PHASE_ENERGY[phase].slice(1) : "Set cycle"}</span>
          </span>
          <ArrowRight className="h-3.5 w-3.5 shrink-0 text-rose/25 transition group-hover:text-hotpink" strokeWidth={2.5} />
        </a>

        <button onClick={() => setWaterModalOpen(true)}
          className="group flex items-center gap-2.5 rounded-2xl bg-white/90 border border-petal/60 p-2.5 text-left shadow-sm shadow-hotpink/5 transition hover:-translate-y-0.5 active:scale-[0.98]">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-blush text-hotpink"><Droplet className="h-5 w-5" strokeWidth={1.9} /></span>
          <span className="min-w-0 flex-1">
            <span className="block text-[9px] font-bold uppercase tracking-wider text-rose/55 leading-none">Water</span>
            <span className="mt-0.5 block font-script text-lg leading-none text-hotpink truncate">{waterCount}/{waterGoal}</span>
          </span>
          <ArrowRight className="h-3.5 w-3.5 shrink-0 text-rose/25 transition group-hover:text-hotpink" strokeWidth={2.5} />
        </button>
      </div>

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

      {/* ── BUILD YOUR WORLD — a guided checklist that lights up as she sets up
             each tool; disappears once everything is configured. ── */}
      {(() => {
        const steps = [
          { key: "cycle", label: "Set up your cycle",   desc: "Unlocks your real phase everywhere", done: cycleReady,      href: "/app/tools/cycle",   onClick: undefined as (() => void) | undefined },
          { key: "meals", label: "Plan your meals",     desc: "Fills Today's Plan & your energy",    done: mealPlanned,     href: "/app/tools/meals",   onClick: undefined as (() => void) | undefined },
          { key: "diet",  label: "Set your goal in Diet", desc: "Tunes your energy & meals to you",  done: dietSetup,       href: "/app/tools/diet",    onClick: undefined as (() => void) | undefined },
          { key: "move",  label: "Plan your movement",  desc: "Yoga & workouts matched to you",      done: movementPlanned, href: "/app/tools/workout", onClick: undefined as (() => void) | undefined },
          { key: "mood",  label: "Log today's mood",    desc: "One tap on the flower above",         done: !!mood,          href: "",                   onClick: () => setMoodPickerOpen(true) },
        ];
        const doneCount = steps.filter((s) => s.done).length;
        if (doneCount === steps.length) return null;
        const nextIdx = steps.findIndex((s) => !s.done);
        return (
          <section className="mt-4 sm:mt-6 animate-card-pop-in" style={{ animationDelay: "30ms" }}>
            <div className="bloom-pearl-card pearl-sheen rounded-3xl p-4 sm:p-5">
              <div className="flex items-center gap-3 mb-3">
                <span className="clay-blob pearl-sheen animate-icon-breathe grid h-11 w-11 shrink-0 place-items-center rounded-full text-white">
                  <Sparkles className="h-5 w-5" strokeWidth={1.8} />
                </span>
                <div className="flex-1 min-w-0">
                  <p className="font-script text-lg sm:text-2xl text-hotpink leading-tight">Build your Bloom world ✿</p>
                  <p className="text-[11px] sm:text-sm text-rose/70 leading-snug">Watch Today come alive as you set each one up.</p>
                </div>
                <span className="shrink-0 font-script text-2xl sm:text-3xl text-hotpink leading-none">{doneCount}/{steps.length}</span>
              </div>
              <div className="space-y-2">
                {steps.map((s, i) => {
                  const isNext = i === nextIdx;
                  const inner = (
                    <>
                      <span className={["grid h-6 w-6 shrink-0 place-items-center rounded-full transition", s.done ? "bg-hotpink text-white" : isNext ? "bg-hotpink text-white animate-icon-breathe" : "bg-blush/60"].join(" ")}>
                        {s.done ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : <span className={["rounded-full", isNext ? "h-2 w-2 bg-white" : "h-2 w-2 bg-hotpink/40"].join(" ")} />}
                      </span>
                      <span className="flex-1 min-w-0 text-left">
                        <span className={["flex items-center gap-1.5 text-sm font-bold leading-tight", s.done ? "text-rose/40 line-through" : "text-[#831843]"].join(" ")}>
                          {s.label}
                          {isNext && <span className="rounded-full bg-hotpink px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wider text-white animate-cta-bounce">Start here ✿</span>}
                        </span>
                        {!s.done && <span className="block text-[10px] text-rose/55 leading-tight">{s.desc}</span>}
                      </span>
                      {!s.done && <ArrowRight className={["h-4 w-4 shrink-0", isNext ? "text-hotpink" : "text-rose/30"].join(" ")} strokeWidth={2.5} />}
                    </>
                  );
                  const cls = ["flex items-center gap-3 rounded-2xl px-3 py-2 transition active:scale-[0.99]",
                    s.done ? "bg-blush/30" : isNext ? "bg-white ring-2 ring-hotpink/70 animate-selected-glow" : "bg-white/70 hover:bg-blush/40"].join(" ");
                  const marker = isNext ? { "data-next-step": "1" } : {};
                  // Tapping a step marks that she's in the guided setup flow, so the
                  // tool she lands on knows to hand her back to Today afterwards.
                  const markGuide = () => startGuide();
                  return s.href
                    ? <a key={s.key} href={s.href} onClick={markGuide} className={cls} {...marker}>{inner}</a>
                    : <button key={s.key} onClick={s.onClick} className={`w-full ${cls}`} {...marker}>{inner}</button>;
                })}
              </div>
            </div>
          </section>
        );
      })()}

      {/* ══ DESKTOP: 60% main content + 40% sticky smart panel (CLAUDE.md) ══ */}
      <div className="lg:grid lg:grid-cols-5 lg:gap-x-6 lg:items-start">

      {/* ── MAIN COLUMN (lg:col-span-3) ─────────────────────────────────────── */}
      <div className="lg:col-span-3">

      {/* ── AFFIRMATION — a soft handwritten quote for the day, dismissible.
             Flanked by two logo flowers; the words softly self-write on open. ── */}
      {!affirmDismissed && !isFresh && (
        /* Soft one-/two-line quote flanked by two flowers; a small X to close
           (top-right) and a centred tiny love-count below. */
        <div className="relative mt-4 sm:mt-6 rounded-2xl border border-white/60 bg-white/40 backdrop-blur-md shadow-sm shadow-hotpink/10 px-4 pt-6 pb-3 animate-fade-in">
          <p className="absolute left-3 top-2 inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-widest text-hotpink/60">
            <BloomFlower className="h-2.5 w-2.5" /> Today's affirmation
          </p>
          <button onClick={() => setAffirmDismissed(true)} aria-label="Dismiss affirmation" className="absolute right-2 top-2 grid h-5 w-5 place-items-center rounded-full text-rose/40 transition hover:bg-blush hover:text-hotpink active:scale-90">
            <X className="h-3.5 w-3.5" />
          </button>

          <div className="flex items-center justify-center gap-2 sm:gap-3 px-5">
            <BloomFlower className="h-4 w-4 sm:h-5 sm:w-5 shrink-0 text-hotpink/80 animate-icon-breathe" />
            <AnimatedWords
              key={affirmText}
              text={affirmText}
              stagger={95}
              className="font-script text-lg sm:text-2xl text-hotpink text-center leading-snug text-balance"
            />
            <BloomFlower className="h-4 w-4 sm:h-5 sm:w-5 shrink-0 text-hotpink/80 animate-icon-breathe" />
          </div>

          {/* Centred tiny love-count */}
          <div className="mt-2 flex justify-center">
            <button
              onClick={toggleAffirmLike}
              aria-pressed={affirmLiked}
              aria-label={affirmLiked ? "Unlove this affirmation" : "Love this affirmation"}
              className="inline-flex items-center gap-1 text-[10px] font-bold tabular-nums text-hotpink/70 transition hover:text-hotpink active:scale-90"
            >
              <Heart className={["h-3.5 w-3.5", affirmLiked ? "fill-hotpink text-hotpink animate-icon-breathe" : ""].join(" ")} strokeWidth={2} />
              {affirmLikeCount.toLocaleString()}
            </button>
          </div>
        </div>
      )}

      {/* ── FRESH REVEAL — the enchanting "here's the magic that blooms after setup"
             section a just-reset user sees where her plan will live. ── */}
      {isFresh && <FreshReveal phase={phase} />}

      {/* ── 2. TODAY'S BLOOM PLAN — the real plan once she's planned meals/movement;
             a "how it all syncs" setup menu once her cycle's set but nothing's
             planned; nothing at all for a brand-new user (the checklist guides her). ── */}
      {!hasPlanContent && cycleReady && (
        <section className="mt-4 sm:mt-6 animate-card-pop-in" style={{ animationDelay: "50ms" }}>
          <SectionTitle>Today's Plan ✿</SectionTitle>
          <p className="-mt-1 mb-2.5 text-[11px] sm:text-xs text-rose/65 leading-snug px-0.5">
            Nothing planned yet — set up a tool and Today fills itself. Everything syncs to your <span className="font-bold text-hotpink">goal</span> &amp; <span className="font-bold text-hotpink">phase</span> ✿
          </p>
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
        {/* Card header — title, phase blurb & nudge, all contained (not floating) */}
        <div className="px-4 pt-4 pb-3 sm:px-5 sm:pt-4">
          <h2 className="font-script text-2xl sm:text-3xl text-hotpink leading-none">Today's Plan ✿</h2>
          <p className="mt-1.5 text-[11px] sm:text-xs text-rose/65 leading-snug">
            {cycleReady ? (
              <>Tailored to your <span className="font-bold text-hotpink">{PHASE_LABEL[phase]}</span> phase ({PHASE_ENERGY[phase].toLowerCase()} energy) — a balanced day to eat, move, flow and reflect. Tap any item to start it.</>
            ) : (
              <>A balanced day to eat, move, flow and reflect. Tap any item to start it — set up your cycle to tailor it to your phase.</>
            )}
          </p>
          <div className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-blush/50 px-2.5 py-1 text-[10px] font-semibold leading-snug text-hotpink/80">
            <Sparkles className="h-3 w-3 shrink-0" strokeWidth={2} /> Tick each item as you go — every one grows your daily Bloom ✿
          </div>
        </div>
        <div className="divide-y divide-petal/20 border-t border-petal/30">
          {planItems.map((item, i) => {
            const done   = planDone.includes(item.id);
            const timing = planItemTiming(item.time);
            return (
              <div
                key={item.id}
                id={`plan-${item.id}`}
                className={["relative flex items-center gap-3 sm:gap-4 px-3 py-3 sm:px-4 sm:py-4 transition hover:bg-blush/15",
                  highlightId === `plan-${item.id}` ? "animate-attention-squeeze" : ""].join(" ")}
                style={{ animationDelay: `${i * 60}ms` }}
              >
                {/* Tapping the image / text opens a centred detail popup */}
                <button
                  onClick={() => setActivePlan(item)}
                  className="flex flex-1 min-w-0 items-center gap-3 sm:gap-4 text-left transition active:scale-[0.99]"
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
                    <div className="mt-1 flex items-center gap-2">
                      {item.time && (
                        <span className="text-[10px] font-semibold text-rose/45">{item.time}</span>
                      )}
                      {cycleReady && (
                        <span className="text-[10px] font-bold uppercase tracking-wider text-hotpink/60">
                          ✿ {PHASE_LABEL[phase]} phase
                        </span>
                      )}
                    </div>
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
             Free forever (the daily habit); the full plan lives in Diet. ── */}
      {cycleReady && (
        <section className="mt-4 sm:mt-6 space-y-3 sm:space-y-4 animate-card-pop-in" style={{ animationDelay: "80ms" }}>
          <CoachTodayCompact coach={coach} />
          <TomorrowCard coach={coach} />
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
        <div className={[
          "bloom-pearl-card pearl-sheen rounded-3xl p-4 sm:p-5",
          bloomFull ? "bg-gradient-to-br from-hotpink/10 via-white/0 to-petal/30" : "bg-gradient-to-br from-petal/20 via-white/0 to-blush/30",
        ].join(" ")}>
          <div className="mb-3 flex items-center gap-2">
            <span className="clay-blob grid h-7 w-7 shrink-0 place-items-center rounded-full text-white"><Flower2 className="h-4 w-4" strokeWidth={1.8} /></span>
            <div className="min-w-0">
              <h2 className="font-script text-xl sm:text-2xl text-hotpink leading-none">Your bloom today</h2>
              <p className="text-[9.5px] font-bold uppercase tracking-wider text-rose/50 leading-none mt-0.5">Daily progress ring</p>
            </div>
          </div>
          <div className="flex items-center gap-4 sm:gap-6">
            {/* Animated bloom ring */}
            <div className="relative shrink-0">
              <svg viewBox="0 0 36 36" className="w-[72px] h-[72px] sm:w-24 sm:h-24 -rotate-90" style={{ transition: "all 0.6s ease" }}>
                <defs>
                  <linearGradient id="bloom-ring-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#F472B6" />
                    <stop offset="100%" stopColor="#DB2777" />
                  </linearGradient>
                </defs>
                <circle cx="18" cy="18" r="15.9" fill="none" stroke="#FCE7F3" strokeWidth="2.8" />
                <circle
                  cx="18" cy="18" r="15.9" fill="none"
                  stroke={bloomFull ? "url(#bloom-ring-grad)" : "url(#bloom-ring-grad)"}
                  strokeWidth="2.8"
                  strokeDasharray={`${CIRC}`}
                  strokeDashoffset={CIRC * (1 - bloomPercent / 100)}
                  strokeLinecap="round"
                  style={{ transition: "stroke-dashoffset 1.2s cubic-bezier(0.22,1,0.36,1)" }}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                {bloomFull
                  ? <Star className="h-5 w-5 sm:h-6 sm:w-6 text-hotpink animate-icon-breathe" strokeWidth={1.5} fill="currentColor" />
                  : <>
                      <p className="font-script text-lg sm:text-2xl text-hotpink leading-none">{bloomPercent}%</p>
                      <p className="text-[7px] sm:text-[9px] font-bold uppercase tracking-wide text-rose/60">Bloomed</p>
                    </>
                }
              </div>
            </div>

            {/* Checklist */}
            <div className="flex-1 min-w-0 flex flex-col gap-1.5">
              {bloomFull ? (
                <p className="text-xs font-bold text-hotpink animate-fade-in mb-1">✿ Fully Bloomed! You're amazing today</p>
              ) : (
                <p key={bloomPercent} className="text-[11px] font-semibold text-rose/60 leading-snug animate-fade-in mb-0.5">{bloomMessage}</p>
              )}
              {checklist.map((c) => {
                const el = c.key === "mood" ? (
                  <button
                    key={c.key}
                    onClick={() => setMoodPickerOpen((v) => !v)}
                    ref={c.key === "mood" ? undefined : undefined}
                    className={["flex w-full items-center gap-2 rounded-2xl px-3 py-1.5 transition text-left active:scale-95",
                      c.done ? "bg-blush/50" : "bg-white/70 hover:bg-blush/40"].join(" ")}
                  >
                    <span className={["grid h-5 w-5 shrink-0 place-items-center rounded-full transition", c.done ? "bg-hotpink" : "bg-blush/60"].join(" ")}>
                      <Check className="h-3 w-3 text-white" strokeWidth={3} />
                    </span>
                    <span className={["text-xs font-semibold flex-1", c.done ? "text-rose/40 line-through" : "text-[#831843]"].join(" ")}>{c.label}</span>
                    {!c.done && <Sparkles className="h-3 w-3 text-hotpink/50 shrink-0" />}
                  </button>
                ) : (
                  <button
                    key={c.key}
                    onClick={() => focusPlanStep(c.key)}
                    className={["flex w-full items-center gap-2 rounded-2xl px-3 py-1.5 transition text-left active:scale-95",
                      c.done ? "bg-blush/50" : "bg-white/70 hover:bg-blush/40"].join(" ")}
                  >
                    <span className={["grid h-5 w-5 shrink-0 place-items-center rounded-full transition", c.done ? "bg-hotpink" : "bg-blush/60"].join(" ")}>
                      <Check className="h-3 w-3 text-white" strokeWidth={3} />
                    </span>
                    <span className={["text-xs font-semibold flex-1", c.done ? "text-rose/40 line-through" : "text-[#831843]"].join(" ")}>{c.label}</span>
                    {!c.done && <ArrowRight className="h-3 w-3 text-rose/30 shrink-0" />}
                  </button>
                );
                return el;
              })}
            </div>
          </div>
        </div>
      </section>
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


      {/* ── 6. HYDRATION ────────────────────────────────────────────────────── */}
      <section id="hydration" className="mt-4 sm:mt-6 animate-card-pop-in" style={{ animationDelay: "180ms" }}>
        <div className={["bloom-pearl-card pearl-sheen rounded-3xl p-4 sm:p-5 transition", highlightId === "hydration" ? "animate-attention-squeeze" : ""].join(" ")}>
          <div className="flex items-center justify-between mb-3">
            <p className="font-script text-xl sm:text-2xl text-hotpink leading-none">Daily Hydration ✿</p>
            <div className="flex items-center gap-1.5">
              <button
                onClick={toggleWaterReminders}
                disabled={reminderBusy}
                aria-label={waterRemindersEnabled ? "Disable reminders" : "Enable reminders"}
                title={waterRemindersEnabled ? "Reminders on — tap to turn off" : "Get gentle water reminders"}
                className={["clay-blob grid h-7 w-7 place-items-center rounded-full text-white transition disabled:opacity-60",
                  waterRemindersEnabled ? "animate-icon-breathe" : "opacity-70"].join(" ")}
              >
                {waterRemindersEnabled ? <Bell className="h-3.5 w-3.5" strokeWidth={2} /> : <BellOff className="h-3.5 w-3.5" strokeWidth={2} />}
              </button>
              <button onClick={() => setWaterModalOpen(true)} className="clay-blob grid h-7 w-7 place-items-center rounded-full text-white">
                <Settings2 className="h-3.5 w-3.5" strokeWidth={2} />
              </button>
            </div>
          </div>

          {waterRemindersEnabled && (
            <p className="mb-2 text-[10px] text-rose/60 animate-fade-in">
              Reminders on — between {WATER_WAKE_START_HOUR}am and {WATER_WAKE_END_HOUR > 12 ? WATER_WAKE_END_HOUR - 12 : WATER_WAKE_END_HOUR}pm ✿
            </p>
          )}

          {/* Phase-aware hydration tip */}
          {(phase === "fertile" || phase === "ovulation") && waterCount < waterGoal && (
            <p className="mb-2 text-[10px] sm:text-xs font-semibold text-rose/70 animate-fade-in">
              Ovulation raises your fluid needs — try 1-2 extra glasses today.
            </p>
          )}

          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            {Array.from({ length: waterGoal }).map((_, i) => (
              <button key={i} onClick={() => tapWater(i)} aria-label={i < waterCount ? "Glass filled" : "Tap to drink"}>
                <span className={["clay-blob grid h-8 w-8 sm:h-9 sm:w-9 place-items-center rounded-full transition-transform active:scale-90",
                  i < waterCount ? "text-white animate-icon-breathe" : "text-white/60 opacity-50"].join(" ")}>
                  <Droplet className="h-4 w-4" fill="currentColor" strokeWidth={1.5} />
                </span>
              </button>
            ))}
          </div>
          <p className="mt-2.5 text-right font-script text-2xl sm:text-3xl text-hotpink leading-none">{waterCount}/{waterGoal}</p>
          <p className="text-right text-[10px] text-rose/60">glasses · keep going, beautiful ✿</p>
        </div>
      </section>

      </aside>{/* /SMART RIGHT PANEL */}
      </div>{/* /2-column grid */}

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
  useEffect(() => {
    if (!item) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [item, onClose]);

  if (!item) return null;
  const timing = planItemTiming(item.time);

  return createPortal(
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-rose/30 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-sm overflow-hidden rounded-[2rem] bg-white/95 backdrop-blur-xl shadow-2xl shadow-hotpink/30 animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Hero image */}
        <div className="relative h-44 w-full overflow-hidden">
          <img
            src={item.image} alt="" className="h-full w-full object-cover"
            onError={(e) => { if (item.fallback && e.currentTarget.src !== item.fallback) { e.currentTarget.onerror = null; e.currentTarget.src = item.fallback; } }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/10 to-transparent" />
          <button
            onClick={onClose}
            aria-label="Close"
            className="absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-full bg-white/85 text-rose hover:bg-white transition active:scale-90"
          >
            <X className="h-4 w-4" strokeWidth={2.5} />
          </button>
          <div className="absolute bottom-3 left-4 right-4">
            <div className="flex items-center gap-1.5 flex-wrap">
              {item.time && (
                <span className="rounded-full bg-white/90 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-hotpink">{item.time}</span>
              )}
              {timing === "now" && (
                <span className="rounded-full bg-hotpink px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white animate-cta-bounce">Now</span>
              )}
              {cycleReady && (
                <span className="rounded-full bg-white/90 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-hotpink/80">✿ {PHASE_LABEL[phase]}</span>
              )}
            </div>
            <h3 className="mt-1.5 font-script text-2xl text-white leading-tight drop-shadow-[0_2px_6px_rgba(0,0,0,0.5)]">{item.label}</h3>
          </div>
        </div>

        {/* Body */}
        <div className="p-5">
          <p className={["text-sm leading-relaxed", item.prompt ? "italic text-hotpink/80" : "text-rose/70"].join(" ")}>
            {item.prompt ? `“${item.blurb}”` : item.blurb}
          </p>

          <div className="mt-5 flex items-center gap-2.5">
            {/* Primary CTA — open the tool (carries the deep-link launch) */}
            <a
              href={item.tool}
              onClick={() => {
                if (item.launch) writeLaunch(item.launch.key, item.launch.val);
                if (item.prompt) { try { localStorage.setItem(DIARY_PROMPT_KEY, item.prompt); } catch {} }
              }}
              className="bloom-luxury-btn flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-3 text-sm font-semibold text-white animate-selected-glow"
            >
              Open <ArrowRight className="h-4 w-4" strokeWidth={2.5} />
            </a>
            {/* Gentle mark-done toggle */}
            <button
              onClick={onToggleDone}
              aria-pressed={done}
              aria-label={done ? "Mark as not done" : "Mark as done"}
              className={[
                "shrink-0 grid h-12 w-12 place-items-center rounded-2xl border-2 transition active:scale-90",
                done ? "bg-hotpink border-hotpink text-white" : "border-petal text-hotpink/40 hover:border-hotpink/60",
              ].join(" ")}
            >
              <Check className="h-5 w-5" strokeWidth={3} />
            </button>
          </div>
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
