import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  Sparkles, Flower2, Heart, ArrowRight, Sun, Moon, Smile, Cloud,
  CloudRain, Battery, Droplet, X, Settings2, Play, RefreshCw, Dumbbell,
  BookHeart, Check, Plus, Minus, Zap, Wind, Frown, BatteryLow, Waves,
  Leaf, Cookie, Bone, CircleDot, Meh, Bell, BellOff, Pill, CalendarDays,
  ChevronDown, ChevronUp, AlarmClock, Star,
} from "lucide-react";
import { BloomBubbles } from "@/components/bloom/BloomBubbles";
import { useSmartPopoverPosition } from "@/lib/useSmartPopover";
import { useAuth } from "@/contexts/AuthContext";
import { phaseForDay, readCycleSettings, broadcastCyclePhase, hasCycleSettings, PHASE_LABEL, toDietPhase, type CyclePhase } from "@/components/bloom/cyclePhase";
import { energyBalance } from "@/lib/nutritionTargets";
import { TodayEnergyStrip } from "@/components/bloom/diet/DietDashboard";
import { PHASE_PLAN as SHARED_PHASE_PLAN, LAUNCH_YOGA_KEY, LAUNCH_WORKOUT_KEY, LAUNCH_MEAL_KEY, DIARY_PROMPT_KEY, writeLaunch } from "@/components/bloom/phasePlan";
import { readWorkoutStreak, readYogaStreak } from "@/lib/crossToolData";
import { RECIPES, PHASE_MICROS } from "@/components/bloom/recipes/data";
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
} as const;

export const TODAY_WATER_KEY = KEYS.water;

function readJSON<T>(key: string, fallback: T): T {
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; } catch { return fallback; }
}
function todayISO() { return new Date().toISOString().slice(0, 10); }
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
      out.push({ dedupeKey: doseKey, fireAt, body: `Encore ${left} verre${left > 1 ? "s" : ""} pour atteindre tes ${waterGoal} verres aujourd'hui 💧`, data });
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

// ── Symptoms ──────────────────────────────────────────────────────────────────
const SYMPTOMS = [
  { key: "cramps",    label: "Cramps",      Icon: Zap },
  { key: "bloated",   label: "Bloated",     Icon: Wind },
  { key: "headache",  label: "Headache",    Icon: Frown },
  { key: "fatigue",   label: "Fatigue",     Icon: BatteryLow },
  { key: "tender",    label: "Tender",      Icon: Heart },
  { key: "moody",     label: "Moody",       Icon: Waves },
  { key: "nausea",    label: "Nausea",      Icon: Leaf },
  { key: "cravings",  label: "Cravings",    Icon: Cookie },
  { key: "backpain",  label: "Back pain",   Icon: Bone },
  { key: "spotting",  label: "Spotting",    Icon: Droplet },
  { key: "lowenergy", label: "Low energy",  Icon: CircleDot },
  { key: "acne",      label: "Acne",        Icon: Meh },
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

const AFFIRMATIONS: Record<Exclude<CyclePhase, "any">, string[]> = {
  period:     ["Rest is a radical act of self-love.", "Your body is working hard. Let it.", "Softness is strength."],
  follicular: ["I choose myself, every single day.", "Fresh starts live inside of me.", "What I begin today, I will grow."],
  fertile:    ["I am magnetic. I draw what I need.", "My energy is a gift I share wisely.", "I bloom in my own time, beautifully."],
  ovulation:  ["I am radiant — the world feels it.", "My body is wise, and I trust its rhythm.", "Every phase of my cycle has its gift."],
  luteal:     ["I am allowed to rest without earning it.", "Being tender is a soft kind of strength.", "I move at my own gentle pace."],
};

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
  breakfast: "/images/meal-oats.jpg",
  lunch:     "/images/meal-buddha.jpg",
  dinner:    "/images/meal-stew.jpg",
  lunchbox:  "/images/meal-lunchbox.jpg",
  snack:     "/images/meal-lunchbox.jpg",
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
  const cycleSettings   = useMemo(readCycleSettings, []);
  const pillLabel       = cycleSettings.contraceptiveMethod.charAt(0).toUpperCase() + cycleSettings.contraceptiveMethod.slice(1);
  const displayName     = profile?.name?.split(" ")[0] || "Beautiful";

  // Core state
  const [mood,                setMood]                = useState<string | null>(null);
  const [symptoms,            setSymptoms]            = useState<string[]>([]);
  const [symptomsOpen,        setSymptomsOpen]        = useState(false);
  const [waterCount,          setWaterCount]          = useState(0);
  const [waterGoal,           setWaterGoal]           = useState(8);
  const [waterModalOpen,      setWaterModalOpen]      = useState(false);
  const [streak,              setStreak]              = useState(0);
  const [planDone,            setPlanDone]            = useState<string[]>([]);
  const [affirmIdx,           setAffirmIdx]           = useState(0);
  const [waterRemindersEnabled, setWaterRemindersEnabled] = useState(false);
  const [reminderBusy,        setReminderBusy]        = useState(false);
  const [showCycleSetupBanner, setShowCycleSetupBanner] = useState(false);
  const [pillTaken,           setPillTaken]           = useState(false);
  const [moodPickerOpen,      setMoodPickerOpen]      = useState(false);
  const [moodHintIdx,         setMoodHintIdx]         = useState(0);
  const [workoutStreak,       setWorkoutStreak]       = useState(0);
  const [yogaStreak,          setYogaStreak]          = useState(0);
  const [dueReminders,        setDueReminders]        = useState<DueReminder[]>([]);
  const [doneReminderIds,     setDoneReminderIds]     = useState<string[]>([]);
  const [todayMeals,          setTodayMeals]          = useState<Record<string, string | null>>({});

  const moodTileRef = useRef<HTMLButtonElement>(null);

  // Iron recipe for period/luteal nudge (used in plan section)
  const ironRecipe = useMemo(() =>
    RECIPES.filter((r) => r.phases.includes("menstrual") && r.micros.iron)
           .sort((a, b) => (b.micros.iron ?? 0) - (a.micros.iron ?? 0))[0]
  , []);

  useEffect(() => {
    const iso = todayISO();

    try { setMood(localStorage.getItem(KEYS.mood)); } catch {}
    setStreak(computeBloomStreak());

    try {
      const raw = readJSON<{ date: string; list: string[] }>(KEYS.symptoms, { date: "", list: [] });
      setSymptoms(raw.date === iso ? raw.list : []);
    } catch {}

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

    try {
      const raw = readJSON<{ date: string; taken: boolean }>(KEYS.pill, { date: "", taken: false });
      setPillTaken(raw.date === iso ? raw.taken : false);
    } catch {}

    setWorkoutStreak(readWorkoutStreak().count);
    setYogaStreak(readYogaStreak().count);
    setDueReminders(loadDueTodayReminders());

    try {
      const mealPlan = readJSON<Record<string, Record<string, string | null>>>("bloom:meals-plan", {});
      setTodayMeals(mealPlan[iso] ?? {});
    } catch {}

    setShowCycleSetupBanner(!hasCycleSettings());
    broadcastCyclePhase();
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
    setStreak(computeBloomStreak()); // logging today keeps the bloom streak alive
  };

  const toggleSymptom = (key: string) => {
    setSymptoms((prev) => {
      const next = prev.includes(key) ? prev.filter((s) => s !== key) : [...prev, key];
      try { localStorage.setItem(KEYS.symptoms, JSON.stringify({ date: todayISO(), list: next })); } catch {}
      return next;
    });
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
      try { localStorage.setItem(KEYS.pill, JSON.stringify({ date: todayISO(), taken: next })); } catch {}
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

  const planItems = useMemo(() => buildPlanItems(phase), [phase]);
  const moodHint  = MOODS[moodHintIdx];
  const MoodIcon  = mood ? (MOODS.find((m) => m.key === mood)?.Icon ?? Sparkles) : moodHint.Icon;
  const affirmPool = AFFIRMATIONS[phase];
  const affirmText = affirmPool[affirmIdx % affirmPool.length];

  const checklist = useMemo(() => {
    const yogaItem    = planItems.find((i) => i.id === "yoga" || i.id === "workout");
    const journalItem = planItems.find((i) => i.id === "journal" || i.id === "meditation");
    return [
      { key: "mood",    label: "Log your mood",  done: !!mood,                                                   href: "",                tool: "" },
      { key: "water",   label: "Hit water goal",  done: waterCount >= waterGoal,                                  href: "#hydration",      tool: "" },
      { key: "move",    label: yogaItem?.label ?? "Move",    done: yogaItem    ? planDone.includes(yogaItem.id)    : false, href: yogaItem?.tool    ?? "/app/tools/yoga",  tool: yogaItem?.tool    ?? "" },
      { key: "journal", label: "Write in diary",  done: journalItem ? planDone.includes(journalItem.id) : false, href: "/app/tools/diary", tool: "/app/tools/diary" },
    ];
  }, [mood, waterCount, waterGoal, planDone, planItems]);

  const bloomPercent  = Math.round((checklist.filter((c) => c.done).length / checklist.length) * 100);
  const bloomFull     = bloomPercent === 100;
  const bloomMessage  =
    bloomPercent === 0  ? "Your day awaits — start with one small bloom ✿" :
    bloomPercent < 50   ? "A lovely start — keep blooming, beautiful" :
                          "More than halfway — you're glowing today ✿";

  // visible due reminders (not marked done this session)
  const visibleReminders = dueReminders.filter((r) => !doneReminderIds.includes(r.id));
  const hasDueItems      = !pillTaken || visibleReminders.length > 0;

  // circumference for SVG ring (r=15.9)
  const CIRC = 2 * Math.PI * 15.9; // ≈ 99.9

  return (
    <div className="relative">
      <BloomBubbles count={10} />

      {/* ── 1. HERO ─────────────────────────────────────────────────────────── */}
      <section
        className="pearl-frame relative overflow-hidden -mx-3 sm:-mx-6 md:mx-0 -mt-3 sm:-mt-5 md:mt-0 rounded-b-[1.75rem] sm:rounded-b-[2.5rem] md:rounded-[2.5rem] rounded-t-none md:rounded-t-[2.5rem] animate-card-pop-in"
        style={{ animationDelay: "0ms" }}
      >
        <img src="/images/today-hero.png" alt="" className="animate-hero-breathe absolute inset-0 h-full w-full object-cover" referrerPolicy="no-referrer" />
        <div className="absolute inset-0 bg-gradient-to-r from-white/90 via-white/55 to-transparent" />
        <div className={`absolute inset-0 bg-gradient-to-r ${PHASE_GRADIENT[phase]}`} />

        <div className="relative z-[2] px-4 py-5 pb-14 sm:px-12 sm:py-12 sm:pb-14 w-[68%] sm:max-w-xl">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-white/85 backdrop-blur px-2.5 py-0.5 sm:px-3 sm:py-1 text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-hotpink border border-petal/60">
            <HelloIcon className="h-3 w-3" strokeWidth={2} /> {today}
          </div>
          <h1 className="mt-2 sm:mt-3 animate-text-pop font-script text-[2rem] sm:text-7xl text-hotpink leading-tight break-words drop-shadow-[0_2px_6px_oklch(1_0_0/0.5)]">
            {hello}, {displayName}
          </h1>

          <div className="mt-2 sm:mt-3 inline-flex items-center gap-1.5 rounded-full bg-hotpink/90 text-white text-[10px] sm:text-xs font-bold uppercase tracking-wider px-2.5 py-0.5 sm:px-3 sm:py-1">
            ✿ Day {cycleDay} · {PHASE_LABEL[phase]} · Energy {PHASE_ENERGY[phase]}
          </div>

          <p className="mt-2 sm:mt-4 text-xs sm:text-base text-rose/90 leading-snug max-w-xs">
            {PHASE_QUOTES[phase]}
          </p>

          <div className="mt-3 sm:mt-5 flex items-center gap-3">
            <button
              ref={moodTileRef}
              onClick={() => setMoodPickerOpen((v) => !v)}
              aria-label="How are you feeling?"
              aria-haspopup="dialog"
              aria-expanded={moodPickerOpen}
              className="relative clay-blob animate-cta-bounce grid h-14 w-14 sm:h-16 sm:w-16 shrink-0 place-items-center rounded-full text-white shadow-lg shadow-hotpink/40 active:scale-90 transition-transform"
            >
              <MoodIcon className="h-6 w-6 sm:h-7 sm:w-7" strokeWidth={1.8} />
              {!mood && (
                <span className="absolute -top-0.5 -right-0.5 grid h-5 w-5 place-items-center rounded-full bg-white text-hotpink shadow-sm">
                  <Sparkles className="h-2.5 w-2.5 animate-bloom-sparkle" />
                </span>
              )}
            </button>
            <div className="text-left">
              <p className="text-[10px] font-bold uppercase tracking-wider text-rose/60">
                {mood ? "Feeling" : "How are you?"}
              </p>
              <p
                key={mood ?? `hint-${moodHintIdx}`}
                className={["font-script text-lg leading-tight animate-fade-in", mood ? "text-hotpink" : "italic text-rose/40"].join(" ")}
              >
                {mood ? MOOD_LABEL[mood] : moodHint.label}
              </p>
            </div>
          </div>
        </div>

        {/* Streak badge — real consecutive active days, honest about a fresh start */}
        <div className="absolute bottom-3 right-3 sm:bottom-5 sm:right-5 z-[2] rounded-2xl bg-white/55 backdrop-blur px-2.5 py-1.5 sm:px-3.5 sm:py-2 text-center border border-petal/40 shadow-md">
          {streak > 0 ? (
            <>
              <p className="font-script text-xl sm:text-2xl text-hotpink leading-none">{streak}</p>
              <p className="text-[8px] sm:text-[10px] font-bold uppercase tracking-wider text-rose/70">{streak === 1 ? "day blooming" : "days blooming"}</p>
            </>
          ) : (
            <>
              <p className="font-script text-xl sm:text-2xl text-hotpink leading-none">✿</p>
              <p className="text-[8px] sm:text-[10px] font-bold uppercase tracking-wider text-rose/70">fresh start</p>
            </>
          )}
        </div>
      </section>

      {/* MoodPopover — portaled, triggered from hero circular button */}
      <MoodPopover
        open={moodPickerOpen}
        onClose={() => setMoodPickerOpen(false)}
        onPick={(key) => { pickMood(key); setMoodPickerOpen(false); }}
        triggerRef={moodTileRef}
      />

      {/* ── CYCLE SETUP NUDGE ─────────────────────────────────────────────────── */}
      {showCycleSetupBanner && (
        <section className="mt-4 sm:mt-6 animate-card-pop-in" style={{ animationDelay: "30ms" }}>
          <a href="/app/tools/cycle" className="bloom-pearl-card pearl-sheen rounded-3xl p-4 sm:p-5 flex items-center gap-3 sm:gap-4 transition hover:-translate-y-0.5">
            <span className="clay-blob pearl-sheen animate-icon-breathe grid h-11 w-11 sm:h-14 sm:w-14 shrink-0 place-items-center rounded-full text-white">
              <Sparkles className="h-5 w-5 sm:h-6 sm:w-6" strokeWidth={1.8} />
            </span>
            <div className="flex-1 min-w-0">
              <p className="font-script text-lg sm:text-2xl text-hotpink leading-tight">Personalize your Bloom ✿</p>
              <p className="text-[11px] sm:text-sm text-rose/70 leading-snug">Set up your cycle so Today, Calendar, Yoga & Diet sync to your real phase.</p>
            </div>
            <ArrowRight className="h-4 w-4 text-hotpink shrink-0" strokeWidth={2.5} />
          </a>
        </section>
      )}

      {/* ══ DESKTOP: 60% main content + 40% sticky smart panel (CLAUDE.md) ══ */}
      <div className="lg:grid lg:grid-cols-5 lg:gap-x-6 lg:items-start">

      {/* ── MAIN COLUMN (lg:col-span-3) ─────────────────────────────────────── */}
      <div className="lg:col-span-3">

      {/* ── 2. TODAY'S BLOOM PLAN (vertical rows) ───────────────────────────── */}
      <section className="mt-4 sm:mt-6 animate-card-pop-in" style={{ animationDelay: "50ms" }}>
        <SectionTitle hint={`${PHASE_LABEL[phase]} phase`}>Today's Plan ✿</SectionTitle>
        <p className="-mt-1 mb-2.5 text-[11px] sm:text-xs text-rose/65 leading-snug px-0.5">
          Tailored to your <span className="font-bold text-hotpink">{PHASE_LABEL[phase]}</span> phase ({PHASE_ENERGY[phase].toLowerCase()} energy) — a balanced day to eat, move, flow and reflect. Tap any item to start it.
        </p>
        <div className="bloom-pearl-card pearl-sheen rounded-3xl overflow-hidden divide-y divide-petal/20">
          {planItems.map((item, i) => {
            const done   = planDone.includes(item.id);
            const timing = planItemTiming(item.time);
            return (
              <a
                key={item.id}
                href={item.tool}
                onClick={() => {
                  if (item.launch) writeLaunch(item.launch.key, item.launch.val);
                  if (item.prompt) { try { localStorage.setItem(DIARY_PROMPT_KEY, item.prompt); } catch {} }
                }}
                className="flex items-center gap-3 sm:gap-4 px-3 py-3 sm:px-4 sm:py-4 transition hover:bg-blush/20 active:bg-blush/40 active:scale-[0.99]"
                style={{ animationDelay: `${i * 60}ms` }}
              >
                {/* Image */}
                <div className="relative shrink-0 h-[68px] w-[68px] sm:h-[80px] sm:w-[80px] overflow-hidden rounded-2xl">
                  <img src={item.image} alt="" className="h-full w-full object-cover" loading="lazy" />
                  {done && (
                    <div className="absolute inset-0 flex items-center justify-center bg-white/60 backdrop-blur-sm">
                      <Check className="h-5 w-5 text-hotpink" strokeWidth={3} />
                    </div>
                  )}
                </div>
                {/* Text */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <p className={["text-sm font-bold leading-snug", done ? "text-rose/40 line-through" : "text-[#831843]"].join(" ")}>
                      {item.label}
                    </p>
                    {timing === "now" && (
                      <span className="rounded-full bg-hotpink text-white px-2 py-0.5 text-[8px] font-bold uppercase tracking-wide animate-cta-bounce">
                        Now
                      </span>
                    )}
                  </div>
                  <p className={["mt-0.5 text-[10px] sm:text-[11px] leading-snug", item.prompt ? "italic text-hotpink/70" : "text-rose/55"].join(" ")}>{item.prompt ? `"${item.blurb}"` : item.blurb}</p>
                  <div className="mt-1 flex items-center gap-2">
                    {item.time && (
                      <span className="text-[9px] font-semibold text-rose/40">{item.time}</span>
                    )}
                    <span className="text-[9px] font-bold uppercase tracking-wider text-hotpink/55">
                      ✿ {PHASE_LABEL[phase]} phase
                    </span>
                  </div>
                </div>
                {/* Checkbox */}
                <button
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); togglePlanItem(item.id); }}
                  aria-label={done ? "Mark as not done" : "Mark as done"}
                  className={[
                    "shrink-0 grid h-7 w-7 place-items-center rounded-full border-2 transition active:scale-90",
                    done ? "bg-hotpink border-hotpink text-white" : "border-petal text-transparent hover:border-hotpink/60",
                  ].join(" ")}
                >
                  <Check className="h-3.5 w-3.5" strokeWidth={3} />
                </button>
              </a>
            );
          })}
        </div>
        <a href="/app/calendar" className="mt-2.5 flex items-center justify-center gap-1 text-xs font-semibold text-hotpink">
          Full calendar <ArrowRight className="h-3 w-3" strokeWidth={2} />
        </a>
      </section>

      {/* ── 2a. TODAY'S ENERGY (slim) — the daily balance, links into Diet ── */}
      <section className="mt-4 sm:mt-6 animate-card-pop-in" style={{ animationDelay: "70ms" }}>
        <TodayEnergyStrip e={energyBalance()} />
      </section>

      {/* ── 2b. TODAY'S MEALS ────────────────────────────────────────────────── */}
      {(() => {
        const MEAL_SLOTS = ["breakfast", "lunch", "dinner", "snack"] as const;
        const dietPhase  = toDietPhase(phase);
        const phaseMicros = dietPhase ? PHASE_MICROS[dietPhase] ?? [] : [];
        const primaryMicro = phaseMicros[0];
        const planned = MEAL_SLOTS.filter((s) => todayMeals[s]);

        return (
          <section className="mt-4 sm:mt-6 animate-card-pop-in" style={{ animationDelay: "75ms" }}>
            <SectionTitle hint="nutrition">Today's Meals ✿</SectionTitle>
            {planned.length === 0 ? (
              <a href="/app/tools/meals" className="bloom-pearl-card pearl-sheen rounded-3xl p-4 flex items-center gap-3 transition hover:-translate-y-0.5">
                <span className="clay-blob grid h-9 w-9 shrink-0 place-items-center rounded-full text-white animate-icon-breathe">
                  <Heart className="h-4 w-4" strokeWidth={1.8} />
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-[#831843]">Plan your meals ✿</p>
                  <p className="text-[10px] text-rose/60 leading-snug">Generate a full day — breakfast, lunch, dinner & snack — for your {PHASE_LABEL[phase]} phase</p>
                </div>
                <ArrowRight className="h-4 w-4 text-hotpink shrink-0" strokeWidth={2.5} />
              </a>
            ) : (
              <div className="bloom-pearl-card pearl-sheen rounded-3xl overflow-hidden divide-y divide-petal/20">
                {planned.map((slot) => {
                  const recipeId = todayMeals[slot];
                  const recipe   = recipeId ? RECIPES.find((r) => r.id === recipeId) : null;
                  if (!recipe) return null;
                  const timing   = planItemTiming(MEAL_SLOT_TIME[slot]);
                  const microVal = primaryMicro ? recipe.micros[primaryMicro.key] : undefined;
                  return (
                    <a
                      key={slot}
                      href="/app/tools/meals"
                      onClick={() => writeLaunch(LAUNCH_MEAL_KEY, recipe.id)}
                      className="flex items-center gap-3 sm:gap-4 px-3 py-3 sm:px-4 sm:py-4 transition hover:bg-blush/20 active:scale-[0.99]"
                    >
                      {/* Meal image with slot label */}
                      <div className="relative shrink-0 h-[68px] w-[68px] sm:h-[80px] sm:w-[80px] overflow-hidden rounded-2xl">
                        <img src={MEAL_PHOTO[slot]} alt="" className="h-full w-full object-cover" loading="lazy" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/45 to-transparent" />
                        <p className="absolute bottom-1 left-1.5 text-[8px] font-bold uppercase tracking-wide text-white drop-shadow">
                          {MEAL_SLOT_LABEL[slot]}
                        </p>
                      </div>
                      {/* Text + nutrition */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <p className="text-sm font-bold text-[#831843] leading-snug truncate">{recipe.name}</p>
                          {timing === "now" && (
                            <span className="shrink-0 rounded-full bg-hotpink text-white px-2 py-0.5 text-[8px] font-bold uppercase tracking-wide animate-cta-bounce">
                              Now
                            </span>
                          )}
                        </div>
                        {/* Nutrition pills */}
                        <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                          <span className="text-[9px] font-semibold text-rose/70 bg-blush/50 rounded-full px-2 py-0.5">
                            {recipe.macros.calories} kcal
                          </span>
                          <span className="text-[9px] font-semibold text-rose/70 bg-blush/50 rounded-full px-2 py-0.5">
                            {recipe.macros.protein}g protein
                          </span>
                          {microVal !== undefined && primaryMicro && (
                            <span className="text-[9px] font-semibold text-hotpink bg-petal/40 rounded-full px-2 py-0.5">
                              {microVal}{primaryMicro.unit} {primaryMicro.label}
                            </span>
                          )}
                        </div>
                        <p className="mt-0.5 text-[9px] font-bold uppercase tracking-wider text-hotpink/55">
                          ✿ {PHASE_LABEL[phase]} phase · {MEAL_SLOT_TIME[slot]}
                        </p>
                      </div>
                      <ArrowRight className="h-3.5 w-3.5 text-rose/30 shrink-0" strokeWidth={2} />
                    </a>
                  );
                })}
              </div>
            )}
            <a href="/app/tools/meals" className="mt-2.5 flex items-center justify-center gap-1 text-xs font-semibold text-hotpink">
              Manage meals <ArrowRight className="h-3 w-3" strokeWidth={2} />
            </a>
          </section>
        );
      })()}

      </div>{/* /MAIN COLUMN */}

      {/* ── SMART RIGHT PANEL (lg:col-span-2, sticky) ───────────────────────── */}
      <aside className="lg:col-span-2 lg:sticky lg:top-4 self-start">

      {/* ── 3. YOUR BLOOM TODAY (ring + checklist) ─────────────────────────────────────────────── */}
      <section id="bloom-today" className="mt-4 sm:mt-6 animate-card-pop-in" style={{ animationDelay: "60ms" }}>
        <div className={[
          "bloom-pearl-card pearl-sheen rounded-3xl p-4 sm:p-5",
          bloomFull ? "bg-gradient-to-br from-hotpink/10 via-white/0 to-petal/30" : "bg-gradient-to-br from-petal/20 via-white/0 to-blush/30",
        ].join(" ")}>
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
                  <a
                    key={c.key}
                    href={c.href || undefined}
                    className={["flex items-center gap-2 rounded-2xl px-3 py-1.5 transition active:scale-95",
                      c.done ? "bg-blush/50" : "bg-white/70 hover:bg-blush/40"].join(" ")}
                  >
                    <span className={["grid h-5 w-5 shrink-0 place-items-center rounded-full transition", c.done ? "bg-hotpink" : "bg-blush/60"].join(" ")}>
                      <Check className="h-3 w-3 text-white" strokeWidth={3} />
                    </span>
                    <span className={["text-xs font-semibold flex-1", c.done ? "text-rose/40 line-through" : "text-[#831843]"].join(" ")}>{c.label}</span>
                    {!c.done && <ArrowRight className="h-3 w-3 text-rose/30 shrink-0" />}
                  </a>
                );
                return el;
              })}
            </div>
          </div>
        </div>
      </section>

      {/* ── 3. DUE TODAY ─────────────────────────────────────────────────────── */}
      {hasDueItems && (
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

      {/* ── 5. SYMPTOMS (collapsed) ─────────────────────────────────────────── */}
      <section className="mt-4 sm:mt-6 animate-card-pop-in" style={{ animationDelay: "150ms" }}>
        <button
          onClick={() => setSymptomsOpen((v) => !v)}
          className="w-full bloom-pearl-card pearl-sheen rounded-3xl px-4 py-3 sm:px-5 sm:py-3.5 flex items-center gap-3 transition hover:bg-blush/30 active:scale-[0.99]"
        >
          <span className="clay-blob grid h-8 w-8 shrink-0 place-items-center rounded-full text-white">
            <Heart className="h-3.5 w-3.5" strokeWidth={1.8} />
          </span>
          <div className="flex-1 min-w-0 text-left">
            <p className="text-xs sm:text-sm font-bold text-[#831843]">How's your body today? ✿</p>
            <p className="text-[10px] sm:text-xs text-rose/60">
              {symptoms.length === 0 ? "No symptoms logged" : `${symptoms.length} symptom${symptoms.length > 1 ? "s" : ""} · ${symptoms.slice(0, 3).map((k) => SYMPTOMS.find((s) => s.key === k)?.label).filter(Boolean).join(", ")}`}
            </p>
          </div>
          {symptomsOpen ? <ChevronUp className="h-4 w-4 text-rose/40 shrink-0" /> : <ChevronDown className="h-4 w-4 text-rose/40 shrink-0" />}
        </button>

        {symptomsOpen && (
          <div className="bloom-pearl-card pearl-sheen rounded-3xl px-3 py-3 mt-1.5 animate-fade-in">
            <div className="flex flex-wrap gap-1.5">
              {SYMPTOMS.map((s) => {
                const active = symptoms.includes(s.key);
                return (
                  <button
                    key={s.key}
                    onClick={() => toggleSymptom(s.key)}
                    className={["shrink-0 inline-flex items-center gap-1 rounded-full pl-0.5 pr-2.5 py-1 text-[10px] sm:text-[11px] font-semibold border transition-all duration-200",
                      active
                        ? "bg-hotpink text-white border-hotpink shadow-sm shadow-hotpink/30 scale-105"
                        : "bg-white/80 border-petal/40 text-rose/70 hover:bg-blush/60",
                    ].join(" ")}
                  >
                    <span className="clay-blob grid h-5 w-5 place-items-center rounded-full text-white shrink-0">
                      <s.Icon className="h-2.5 w-2.5" strokeWidth={2} />
                    </span>
                    {s.label}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </section>

      {/* ── 6. HYDRATION ────────────────────────────────────────────────────── */}
      <section id="hydration" className="mt-4 sm:mt-6 animate-card-pop-in" style={{ animationDelay: "180ms" }}>
        <div className="bloom-pearl-card pearl-sheen rounded-3xl p-4 sm:p-5">
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
              💧 Ovulation raises your fluid needs — try 1-2 extra glasses today.
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

      {/* ── 7. BLOOM AFFIRMATION ────────────────────────────────────────────── */}
      <section className="mt-4 sm:mt-6 mb-4 animate-card-pop-in" style={{ animationDelay: "280ms" }}>
        <div className="pearl-frame relative overflow-hidden rounded-[1.5rem] sm:rounded-[2rem]">
          <img src="/images/tools-hero-affirmation.png" alt="" className="animate-hero-breathe absolute inset-0 h-full w-full object-cover object-left" />
          <div className="absolute inset-0 z-[2]" style={{ background: "radial-gradient(65% 90% at 50% 50%, oklch(1 0 0 / 0.92) 0%, oklch(1 0 0 / 0.6) 45%, transparent 80%)" }} />
          <div className="relative z-[2] flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-4 sm:px-8 sm:py-5">
            <div className="text-center sm:text-left">
              <span className="inline-flex items-center gap-1.5 text-[10px] sm:text-xs font-bold uppercase tracking-wider text-hotpink">
                <Heart className="h-3 w-3 sm:h-3.5 sm:w-3.5" strokeWidth={2} fill="currentColor" /> {PHASE_LABEL[phase]} Affirmation
              </span>
              <p className="mt-1 font-script text-lg sm:text-2xl text-[#831843] leading-snug">"{affirmText}"</p>
            </div>
            <button onClick={newAffirmation} className="bloom-luxury-btn inline-flex shrink-0 items-center gap-1.5 px-4 py-2 text-xs sm:text-sm font-semibold text-white">
              New <RefreshCw className="h-3.5 w-3.5" strokeWidth={2.5} />
            </button>
          </div>
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
function SectionTitle({ children, hint }: { children: React.ReactNode; hint?: string }) {
  return (
    <div className="mb-2.5 flex items-end justify-between gap-3">
      <h2 className="font-script text-3xl sm:text-4xl text-hotpink">{children}</h2>
      {hint && <span className="text-xs text-rose/60 pb-1">{hint}</span>}
    </div>
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
