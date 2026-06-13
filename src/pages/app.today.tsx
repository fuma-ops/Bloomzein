import { useEffect, useMemo, useState } from "react";
import {
  Sparkles, Flower2, Heart, ArrowRight, Flame, Sun, Moon, Smile, Cloud,
  CloudRain, Battery, Droplet, X, Settings2, Play, RefreshCw, Dumbbell,
  BookHeart, Check, Plus, Minus, Zap, Wind, Frown, BatteryLow, Waves,
  Leaf, Cookie, Bone, CircleDot, Meh, Bell, BellOff,
} from "lucide-react";
import { BloomBubbles } from "@/components/bloom/BloomBubbles";
import { useAuth } from "@/contexts/AuthContext";
import { phaseForDay, readCycleSettings, broadcastCyclePhase, hasCycleSettings, PHASE_LABEL, type CyclePhase } from "@/components/bloom/cyclePhase";
import { RECIPES } from "@/components/bloom/recipes/data";
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
// Only nudge during waking hours — never at night.
const WATER_WAKE_START_HOUR = 8;
const WATER_WAKE_END_HOUR = 21;
const WATER_SYNC_DAYS = 5;

type WaterFire = { dedupeKey: string; fireAt: Date; body: string; data?: Record<string, unknown> };

/**
 * Spreads the remaining glasses for today (and a full goal's worth for the next
 * few days) evenly across the waking window, so reminders pace themselves to
 * your actual goal instead of firing all at once or after bedtime.
 */
function upcomingWaterFires(waterCount: number, waterGoal: number, from: Date, userId: string | null): WaterFire[] {
  const out: WaterFire[] = [];
  for (let d = 0; d < WATER_SYNC_DAYS; d++) {
    const day = new Date(from.getFullYear(), from.getMonth(), from.getDate() + d);
    const dayStr = localDateStr(day);
    const windowStart = new Date(day.getFullYear(), day.getMonth(), day.getDate(), WATER_WAKE_START_HOUR, 0, 0, 0);
    const windowEnd = new Date(day.getFullYear(), day.getMonth(), day.getDate(), WATER_WAKE_END_HOUR, 0, 0, 0);
    const remaining = d === 0 ? Math.max(0, waterGoal - waterCount) : waterGoal;
    if (remaining <= 0) continue;

    const start = d === 0 ? new Date(Math.max(from.getTime() + 15 * 60000, windowStart.getTime())) : windowStart;
    if (start >= windowEnd) continue;

    const step = (windowEnd.getTime() - start.getTime()) / (remaining + 1);
    for (let i = 0; i < remaining; i++) {
      const fireAt = new Date(start.getTime() + step * (i + 1));
      const doseKey = `water:${dayStr}:${i}`;
      const left = remaining - i;
      const data = userId
        ? {
            url: "/app/today",
            kind: "water" as const,
            reminderId: "water",
            doseKey,
            dedupePrefix: doseKey,
            confirmToken: doseConfirmToken(userId, "water", doseKey),
          }
        : undefined;
      out.push({
        dedupeKey: doseKey,
        fireAt,
        body: `Encore ${left} verre${left > 1 ? "s" : ""} pour atteindre tes ${waterGoal} verres aujourd'hui 💧`,
        data,
      });
    }
  }
  return out;
}

// ── Mood data ────────────────────────────────────────────────────────────────
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

// ── Symptoms data ────────────────────────────────────────────────────────────
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

// ── Cycle-phase content ─────────────────────────────────────────────────────
const PHASE_QUOTES: Record<Exclude<CyclePhase, "any">, string> = {
  period:     "Rest is productive. Your body is doing powerful work today.",
  follicular: "Fresh energy is waking up in you. What will you create?",
  fertile:    "You're in your magnetic era. Bright and open.",
  ovulation:  "You are radiant — the world feels it.",
  luteal:     "Your sensitivity is wisdom, not weakness. Be gentle.",
};

const PHASE_ENERGY: Record<Exclude<CyclePhase, "any">, string> = {
  period: "Low", follicular: "Rising", fertile: "High", ovulation: "High", luteal: "Mellow",
};

type PlanItem = { id: string; label: string; time: string; Icon: typeof Heart; tool: string };

const PHASE_PLAN: Record<Exclude<CyclePhase, "any">, { yoga: string; pose: string; recBlurb: string } & { items: PlanItem[] }> = {
  period: {
    yoga: "Restorative Flow", pose: "/images/pose-childs-pose.webp",
    recBlurb: "Slow, supported stretches to soften cramps and ease tension.",
    items: [
      { id: "yoga",    label: "Restorative Flow",      time: "18:00", Icon: Flower2,   tool: "/app/tools/yoga" },
      { id: "meal",    label: "Iron-rich comfort bowl", time: "19:30", Icon: Heart,     tool: "/app/tools/diet" },
      { id: "journal", label: "Journal: how I feel",    time: "21:00", Icon: BookHeart, tool: "/app/tools/diary" },
      { id: "water",   label: "Hit your water goal",    time: "",      Icon: Droplet,   tool: "/app/today" },
    ],
  },
  follicular: {
    yoga: "Energizing Flow", pose: "/images/pose-warrior-2.webp",
    recBlurb: "Build heat and strength while your energy is on the rise.",
    items: [
      { id: "yoga",    label: "Energizing Flow",       time: "08:00", Icon: Flower2,   tool: "/app/tools/yoga" },
      { id: "workout", label: "Strength training",     time: "17:30", Icon: Dumbbell,  tool: "/app/tools/workout" },
      { id: "meal",    label: "Fresh, light lunch",     time: "13:00", Icon: Heart,     tool: "/app/tools/diet" },
      { id: "water",   label: "Hit your water goal",    time: "",      Icon: Droplet,   tool: "/app/today" },
    ],
  },
  fertile: {
    yoga: "Balance & Strength Flow", pose: "/images/pose-tree.webp",
    recBlurb: "Channel your magnetic energy into balance and focus.",
    items: [
      { id: "yoga",    label: "Balance & Strength Flow", time: "08:00", Icon: Flower2,  tool: "/app/tools/yoga" },
      { id: "workout", label: "Cardio burst",            time: "17:30", Icon: Dumbbell, tool: "/app/tools/workout" },
      { id: "journal", label: "Journal: today's spark",  time: "21:00", Icon: BookHeart, tool: "/app/tools/diary" },
      { id: "water",   label: "Hit your water goal",     time: "",      Icon: Droplet,   tool: "/app/today" },
    ],
  },
  ovulation: {
    yoga: "Power Flow", pose: "/images/pose-triangle.webp",
    recBlurb: "Make the most of peak energy with a powerful, open flow.",
    items: [
      { id: "yoga",    label: "Power Flow",            time: "08:00", Icon: Flower2,   tool: "/app/tools/yoga" },
      { id: "workout", label: "High-intensity session", time: "17:30", Icon: Dumbbell, tool: "/app/tools/workout" },
      { id: "meal",    label: "Protein-rich dinner",    time: "19:30", Icon: Heart,     tool: "/app/tools/diet" },
      { id: "water",   label: "Hit your water goal",    time: "",      Icon: Droplet,   tool: "/app/today" },
    ],
  },
  luteal: {
    yoga: "Calming Flow", pose: "/images/pose-legs-up-wall.webp",
    recBlurb: "Wind down with grounding poses that ease tension and mood dips.",
    items: [
      { id: "yoga",    label: "Calming Flow",          time: "18:00", Icon: Flower2,   tool: "/app/tools/yoga" },
      { id: "meditation", label: "5-min meditation",   time: "20:30", Icon: Sparkles,  tool: "/app/tools/yoga" },
      { id: "journal", label: "Journal: gratitude",     time: "21:00", Icon: BookHeart, tool: "/app/tools/diary" },
      { id: "water",   label: "Hit your water goal",    time: "",      Icon: Droplet,   tool: "/app/today" },
    ],
  },
};

const AFFIRMATIONS = [
  "I choose myself, every single day.",
  "My body is wise, and I trust its rhythm.",
  "Soft is strong. I move at my own pace.",
  "I am allowed to rest without earning it.",
  "Every phase of my cycle has its gift.",
  "I bloom in my own time, beautifully.",
];

function greeting() {
  const h = new Date().getHours();
  if (h < 5)  return { text: "Good night",      Icon: Moon };
  if (h < 12) return { text: "Good morning",    Icon: Sun };
  if (h < 18) return { text: "Good afternoon",  Icon: Sun };
  return       { text: "Good evening",          Icon: Moon };
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

// ── Main component ───────────────────────────────────────────────────────────
export default function TodayPage() {
  const { profile } = useAuth();
  const { text: hello, Icon: HelloIcon } = useMemo(greeting, []);
  const today = useMemo(fmtDate, []);
  const phase = useMemo(() => phaseForDay(new Date(), readCycleSettings()), []);
  const cycleDay = useMemo(cycleDayNumber, []);

  const displayName = profile?.name?.split(" ")[0] || "Beautiful";

  const [mood, setMood] = useState<string | null>(null);
  const [justPicked, setJustPicked] = useState<string | null>(null);
  const [symptoms, setSymptoms] = useState<string[]>([]);
  const [waterCount, setWaterCount] = useState(0);
  const [waterGoal, setWaterGoal] = useState(8);
  const [waterModalOpen, setWaterModalOpen] = useState(false);
  const [streak, setStreak] = useState(7);
  const [planDone, setPlanDone] = useState<string[]>([]);
  const [affirmIdx, setAffirmIdx] = useState(0);
  const [waterRemindersEnabled, setWaterRemindersEnabled] = useState(false);
  const [reminderBusy, setReminderBusy] = useState(false);
  const [showCycleSetupBanner, setShowCycleSetupBanner] = useState(false);

  useEffect(() => {
    const iso = todayISO();

    try { setMood(localStorage.getItem(KEYS.mood)); } catch {}
    try { setStreak(Number(localStorage.getItem(KEYS.streak)) || 7); } catch {}

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

    // Re-broadcast today's cycle phase so Yoga/Meals/Workout/Diet stay in sync
    // even if the user hasn't opened Cycle Tracker since their last visit.
    setShowCycleSetupBanner(!hasCycleSettings());
    broadcastCyclePhase();
  }, []);

  // Pull in "J'ai bu ✓" confirmations tapped directly on a closed-app push
  // notification, adding each one to today's count exactly once.
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

  // Keep the backend's hydration reminder schedule in sync with the goal/progress —
  // spreads the remaining glasses across the rest of today's waking hours, plus a
  // full goal's worth for the next few days. No-ops silently when signed out or off.
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

  const toggleWaterReminders = async () => {
    if (reminderBusy) return;
    setReminderBusy(true);
    try {
      if (waterRemindersEnabled) {
        setWaterRemindersEnabled(false);
        try { localStorage.setItem(KEYS.waterReminders, "false"); } catch {}
        await cancelScheduledNotifications("hydration", "water:");
      } else {
        if (!isPushSupported()) {
          alert("Les notifications ne sont pas disponibles sur cet appareil/navigateur.");
          return;
        }
        const { error } = await subscribeToPush();
        if (error) {
          alert(error);
          return;
        }
        setWaterRemindersEnabled(true);
        try { localStorage.setItem(KEYS.waterReminders, "true"); } catch {}
      }
    } finally {
      setReminderBusy(false);
    }
  };

  const pickMood = (key: string) => {
    setMood(key);
    setJustPicked(key);
    try { localStorage.setItem(KEYS.mood, key); } catch {}
    setTimeout(() => setJustPicked(null), 600);
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

  const newAffirmation = () => {
    setAffirmIdx((prev) => {
      const next = (prev + 1) % AFFIRMATIONS.length;
      try { localStorage.setItem(KEYS.affirmIdx, String(next)); } catch {}
      return next;
    });
  };

  const quote = PHASE_QUOTES[phase];
  const plan = PHASE_PLAN[phase];

  // Cycle → Reminders: surface an iron-rich recipe during period/luteal
  // (when iron needs peak per PHASE_MICROS) to nudge a visit to Diet.
  const ironRecipe = useMemo(() => {
    return RECIPES
      .filter((r) => r.phases.includes("menstrual") && r.micros.iron)
      .sort((a, b) => (b.micros.iron ?? 0) - (a.micros.iron ?? 0))[0];
  }, []);

  // "Your Bloom" progress — mood logged, water goal met, workout/yoga done, journal done
  const checklist = useMemo(() => {
    const yogaItem = plan.items.find((i) => i.id === "yoga" || i.id === "workout");
    const journalItem = plan.items.find((i) => i.id === "journal" || i.id === "meditation");
    return [
      { key: "mood",    label: "Mood logged", done: !!mood },
      { key: "water",   label: "Water goal",  done: waterCount >= waterGoal },
      { key: "move",    label: yogaItem?.label ?? "Movement", done: yogaItem ? planDone.includes(yogaItem.id) : false },
      { key: "journal", label: journalItem?.label ?? "Journal", done: journalItem ? planDone.includes(journalItem.id) : false },
    ];
  }, [mood, waterCount, waterGoal, planDone, plan]);

  const bloomPercent = Math.round((checklist.filter((c) => c.done).length / checklist.length) * 100);
  const bloomLevel = Math.max(1, Math.floor(streak / 7) + 1);

  return (
    <div className="relative">
      <BloomBubbles count={10} />

      {/* ── HERO ─────────────────────────────────────────────────────────── */}
      <section
        className="pearl-frame relative overflow-hidden -mx-3 sm:-mx-6 md:mx-0 -mt-3 sm:-mt-5 md:mt-0 rounded-b-[1.75rem] sm:rounded-b-[2.5rem] md:rounded-[2.5rem] rounded-t-none md:rounded-t-[2.5rem] animate-card-pop-in"
        style={{ animationDelay: "0ms" }}
      >
        <img src="/images/today-hero.png" alt="" className="animate-hero-breathe absolute inset-0 h-full w-full object-cover" referrerPolicy="no-referrer" />
        <div className="absolute inset-0 bg-gradient-to-r from-white/85 via-white/35 to-transparent" />

        <div className="relative z-[2] px-4 py-5 pb-16 sm:px-12 sm:py-14 sm:pb-16 max-w-xl">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-white/85 backdrop-blur px-2.5 py-0.5 sm:px-3 sm:py-1 text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-hotpink border border-petal/60">
            <HelloIcon className="h-3 w-3" strokeWidth={2} /> {today}
          </div>
          <h1 className="mt-2 sm:mt-3 font-script text-3xl sm:text-6xl text-hotpink leading-none drop-shadow-[0_2px_6px_oklch(1_0_0/0.5)]">
            {hello}, {displayName}
          </h1>

          <div className="mt-2 sm:mt-3 inline-flex items-center gap-1.5 rounded-full bg-hotpink/90 text-white text-[10px] sm:text-xs font-bold uppercase tracking-wider px-2.5 py-0.5 sm:px-3 sm:py-1">
            ✿ Day {cycleDay} · {PHASE_LABEL[phase]} phase
          </div>
          <p className="mt-1.5 sm:mt-2 text-[11px] sm:text-sm font-semibold text-rose/85">
            Energy: {PHASE_ENERGY[phase]} {mood && <>· Mood: {MOOD_LABEL[mood]}</>}
          </p>

          <p className="mt-2 sm:mt-4 text-xs sm:text-base text-rose italic leading-snug max-w-xs">
            "{quote}"
          </p>

          <a
            href="#bloom-plan"
            className="bloom-luxury-btn mt-3 sm:mt-5 inline-flex items-center gap-1.5 px-4 sm:px-6 py-2 sm:py-3 text-xs sm:text-sm font-semibold text-white"
          >
            Continue Blooming <ArrowRight className="h-3.5 w-3.5" strokeWidth={2.5} />
          </a>
        </div>

        <div className="absolute bottom-3 right-3 sm:bottom-6 sm:right-6 z-[2] rounded-2xl bg-white/55 backdrop-blur px-2.5 py-1.5 sm:px-3.5 sm:py-2 text-center border border-petal/40 shadow-md">
          <p className="font-script text-xl sm:text-2xl text-hotpink leading-none">{streak}</p>
          <p className="text-[8px] sm:text-[10px] font-bold uppercase tracking-wider text-rose/70">days blooming</p>
        </div>
      </section>

      {/* ── NEW USER: CYCLE SETUP NUDGE ─────────────────────────────────────── */}
      {showCycleSetupBanner && (
        <section className="mt-4 sm:mt-6 animate-card-pop-in" style={{ animationDelay: "30ms" }}>
          <a
            href="/app/tools/cycle"
            className="bloom-pearl-card pearl-sheen rounded-3xl p-4 sm:p-5 flex items-center gap-3 sm:gap-4 transition hover:-translate-y-0.5"
          >
            <span className="clay-blob pearl-sheen animate-icon-breathe grid h-11 w-11 sm:h-14 sm:w-14 shrink-0 place-items-center rounded-full text-white">
              <Sparkles className="h-5 w-5 sm:h-6 sm:w-6" strokeWidth={1.8} />
            </span>
            <div className="flex-1 min-w-0">
              <p className="font-script text-lg sm:text-2xl text-hotpink leading-tight">Personalize your Bloom ✿</p>
              <p className="text-[11px] sm:text-sm text-rose/70 leading-snug">Set up your cycle dates so Today, Calendar, Yoga & Diet sync to your real phase.</p>
            </div>
            <ArrowRight className="h-4 w-4 text-hotpink shrink-0" strokeWidth={2.5} />
          </a>
        </section>
      )}

      {/* ── YOUR BLOOM ───────────────────────────────────────────────────── */}
      <section className="mt-4 sm:mt-6 animate-card-pop-in" style={{ animationDelay: "60ms" }}>
        <div className="bloom-pearl-card pearl-sheen rounded-3xl p-4 sm:p-5 flex items-center gap-3 sm:gap-5 bg-gradient-to-br from-petal/30 via-white/0 to-blush/40">
          <div className="relative shrink-0 h-16 w-16 sm:h-24 sm:w-24 rounded-full overflow-hidden ring-2 ring-white/80 shadow-md">
            <img src="/images/landing-orb-flower.png" alt="" className="animate-hero-breathe h-full w-full object-cover" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-baseline justify-between gap-2">
              <p className="font-script text-xl sm:text-2xl text-hotpink leading-none">Your Bloom ✿</p>
              <p className="font-script text-xl sm:text-2xl text-hotpink leading-none shrink-0">{bloomPercent}%</p>
            </div>
            <p className="mt-1 text-[11px] sm:text-sm text-rose/70">Level {bloomLevel}</p>
            <div className="mt-1.5 h-2 sm:h-2.5 rounded-full bg-blush overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-hotpink to-magenta transition-all duration-700"
                style={{ width: `${bloomPercent}%` }}
              />
            </div>
            <p className="mt-1.5 text-[10px] sm:text-xs text-rose/60">Keep showing up for yourself. You're doing amazing!</p>
          </div>
          <div className="hidden sm:flex flex-col gap-1.5 shrink-0">
            {checklist.map((c) => (
              <span key={c.key} className="inline-flex items-center gap-1.5 text-[11px] font-semibold">
                <span className={[
                  "grid h-4 w-4 place-items-center rounded-full",
                  c.done ? "bg-hotpink text-white" : "bg-blush text-transparent",
                ].join(" ")}>
                  <Check className="h-2.5 w-2.5" strokeWidth={3} />
                </span>
                <span className={c.done ? "text-hotpink" : "text-rose/50"}>{c.label}</span>
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ── CYCLE-AWARE TIP ──────────────────────────────────────────────── */}
      {(phase === "period" || phase === "luteal") && ironRecipe && (
        <section className="mt-4 sm:mt-6 animate-card-pop-in" style={{ animationDelay: "90ms" }}>
          <a
            href="/app/tools/diet"
            className="bloom-pearl-card pearl-sheen rounded-3xl p-4 sm:p-5 flex items-center gap-3 sm:gap-4 transition hover:-translate-y-0.5"
          >
            <span className="clay-blob pearl-sheen animate-icon-breathe grid h-11 w-11 sm:h-12 sm:w-12 shrink-0 place-items-center rounded-full text-white">
              <Heart className="h-5 w-5" strokeWidth={1.8} />
            </span>
            <div className="flex-1 min-w-0">
              <p className="font-script text-lg sm:text-xl text-hotpink leading-tight">Iron boost today ✿</p>
              <p className="text-[11px] sm:text-sm text-rose/70 leading-snug">
                Your iron needs rise during this phase — try "{ironRecipe.name}" from Diet.
              </p>
            </div>
            <ArrowRight className="h-4 w-4 text-hotpink shrink-0" strokeWidth={2.5} />
          </a>
        </section>
      )}

      {(phase === "fertile" || phase === "ovulation") && (
        <section className="mt-4 sm:mt-6 animate-card-pop-in" style={{ animationDelay: "90ms" }}>
          <a
            href="#hydration"
            className="bloom-pearl-card pearl-sheen rounded-3xl p-4 sm:p-5 flex items-center gap-3 sm:gap-4 transition hover:-translate-y-0.5"
          >
            <span className="clay-blob pearl-sheen animate-icon-breathe grid h-11 w-11 sm:h-12 sm:w-12 shrink-0 place-items-center rounded-full text-white">
              <Droplet className="h-5 w-5" strokeWidth={1.8} />
            </span>
            <div className="flex-1 min-w-0">
              <p className="font-script text-lg sm:text-xl text-hotpink leading-tight">Hydration boost ✿</p>
              <p className="text-[11px] sm:text-sm text-rose/70 leading-snug">
                Ovulation can raise your fluid needs — try for 1-2 extra glasses today.
              </p>
            </div>
            <ArrowRight className="h-4 w-4 text-hotpink shrink-0" strokeWidth={2.5} />
          </a>
        </section>
      )}

      {/* ── MOOD CHECK-IN ─────────────────────────────────────────────────── */}
      <section className="mt-4 sm:mt-6 animate-card-pop-in" style={{ animationDelay: "120ms" }}>
        <SectionTitle>How are you feeling?</SectionTitle>
        <div className="bloom-pearl-card pearl-sheen rounded-3xl p-2.5 sm:p-3">
          <div className="grid grid-cols-6 gap-1 sm:gap-1.5">
            {MOODS.map((m, i) => {
              const active = mood === m.key;
              const bouncing = justPicked === m.key;
              return (
                <button
                  key={m.key}
                  onClick={() => pickMood(m.key)}
                  className={[
                    "group flex flex-col items-center gap-0.5 rounded-2xl py-1.5 px-0.5 transition border",
                    active ? "bg-hotpink/10 border-hotpink/30" : "bg-transparent border-transparent hover:bg-blush/60",
                    bouncing ? "animate-bloom-bounce" : "",
                  ].join(" ")}
                  style={!mood && !active ? { animationDelay: `${i * 0.25}s` } : {}}
                >
                  <span
                    className={[
                      "clay-blob grid h-7 w-7 sm:h-8 sm:w-8 place-items-center rounded-full text-white transition",
                      active ? "animate-icon-breathe" : "opacity-90 group-hover:opacity-100",
                    ].join(" ")}
                    style={!mood ? { animationDelay: `${i * 0.3}s` } : {}}
                  >
                    <m.Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4" strokeWidth={1.8} />
                  </span>
                  <span className={["text-[9px] sm:text-[10px] font-semibold", active ? "text-hotpink" : "text-rose"].join(" ")}>{m.label}</span>
                </button>
              );
            })}
          </div>
          {mood && (
            <p className="mt-2 text-center font-script text-sm sm:text-base text-rose/80 animate-fade-in">
              "Love that energy! This is a great day for movement and planning."
            </p>
          )}
        </div>
      </section>

      {/* ── SYMPTOMS ─────────────────────────────────────────────────────── */}
      <section className="mt-4 sm:mt-6 animate-card-pop-in" style={{ animationDelay: "150ms" }}>
        <SectionTitle>Any symptoms today?</SectionTitle>
        <div className="bloom-pearl-card pearl-sheen rounded-3xl p-2.5 sm:p-3">
          <div className="flex flex-wrap gap-1">
            {SYMPTOMS.map((s) => {
              const active = symptoms.includes(s.key);
              return (
                <button
                  key={s.key}
                  onClick={() => toggleSymptom(s.key)}
                  className={[
                    "shrink-0 inline-flex items-center gap-1 rounded-full pl-0.5 pr-2 py-0.5 text-[10px] sm:text-[11px] font-semibold border transition-all duration-200",
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
      </section>

      {/* ── HYDRATION + BLOOM PLAN ───────────────────────────────────────── */}
      <section className="mt-4 sm:mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
        {/* Daily hydration */}
        <div id="hydration" className="bloom-pearl-card pearl-sheen rounded-3xl p-4 sm:p-5 animate-card-pop-in" style={{ animationDelay: "180ms" }}>
          <div className="flex items-center justify-between">
            <p className="font-script text-xl sm:text-2xl text-hotpink leading-none">Daily Hydration ✿</p>
            <div className="flex items-center gap-1.5">
              <button
                onClick={toggleWaterReminders}
                disabled={reminderBusy}
                aria-label={waterRemindersEnabled ? "Disable hydration reminders" : "Enable hydration reminders"}
                title={waterRemindersEnabled ? "Reminders on — tap to turn off" : "Get gentle water reminders"}
                className={[
                  "clay-blob grid h-7 w-7 place-items-center rounded-full text-white transition disabled:opacity-60",
                  waterRemindersEnabled ? "animate-icon-breathe" : "opacity-70",
                ].join(" ")}
              >
                {waterRemindersEnabled ? <Bell className="h-3.5 w-3.5" strokeWidth={2} /> : <BellOff className="h-3.5 w-3.5" strokeWidth={2} />}
              </button>
              <button
                onClick={() => setWaterModalOpen(true)}
                aria-label="Set hydration goal"
                className="clay-blob grid h-7 w-7 place-items-center rounded-full text-white"
              >
                <Settings2 className="h-3.5 w-3.5" strokeWidth={2} />
              </button>
            </div>
          </div>
          {waterRemindersEnabled && (
            <p className="mt-1.5 text-[10px] text-rose/60 animate-fade-in">
              Reminders on — gentle pink nudges, only between {WATER_WAKE_START_HOUR}am and {WATER_WAKE_END_HOUR > 12 ? WATER_WAKE_END_HOUR - 12 : WATER_WAKE_END_HOUR}pm ✿
            </p>
          )}
          <div className="mt-3 flex items-end justify-between gap-2">
            <div className="flex flex-wrap items-end gap-1.5 sm:gap-2">
              {Array.from({ length: waterGoal }).map((_, i) => (
                <button key={i} onClick={() => tapWater(i)} aria-label={i < waterCount ? "Glass filled" : "Tap to drink"}>
                  <span
                    className={[
                      "clay-blob grid h-7 w-7 sm:h-8 sm:w-8 place-items-center rounded-full transition-transform active:scale-90",
                      i < waterCount ? "text-white animate-icon-breathe" : "text-white/70 opacity-50",
                    ].join(" ")}
                  >
                    <Droplet className="h-3.5 w-3.5 sm:h-4 sm:w-4" fill="currentColor" strokeWidth={1.5} />
                  </span>
                </button>
              ))}
            </div>
          </div>
          <p className="mt-2.5 text-right font-script text-2xl sm:text-3xl text-hotpink leading-none">{waterCount}/{waterGoal}</p>
          <p className="text-right text-[10px] text-rose/60">glasses · keep going, beautiful ✿</p>
        </div>

        {/* Today's bloom plan */}
        <div id="bloom-plan" className="bloom-pearl-card pearl-sheen rounded-3xl p-4 sm:p-5 animate-card-pop-in" style={{ animationDelay: "240ms" }}>
          <p className="font-script text-xl sm:text-2xl text-hotpink leading-none">Today's Bloom Plan ✿</p>
          <div className="mt-3 flex flex-col gap-2">
            {plan.items.map((item) => {
              const done = planDone.includes(item.id);
              return (
                <a
                  key={item.id}
                  href={item.tool}
                  className="group flex items-center gap-2.5 rounded-2xl bg-white/70 hover:bg-blush/60 px-2.5 py-2 transition"
                >
                  <button
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); togglePlanItem(item.id); }}
                    aria-label={done ? "Mark as not done" : "Mark as done"}
                    className={[
                      "grid h-6 w-6 shrink-0 place-items-center rounded-full transition",
                      done ? "bg-hotpink text-white" : "bg-blush text-transparent border border-petal/60",
                    ].join(" ")}
                  >
                    <Check className="h-3.5 w-3.5" strokeWidth={3} />
                  </button>
                  <span className="clay-blob grid h-7 w-7 shrink-0 place-items-center rounded-full text-white">
                    <item.Icon className="h-3.5 w-3.5" strokeWidth={1.8} />
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className={["text-xs sm:text-sm font-bold truncate", done ? "text-rose/40 line-through" : "text-[#831843]"].join(" ")}>{item.label}</p>
                    {item.time && <p className="text-[10px] text-rose/50">{item.time}</p>}
                  </div>
                </a>
              );
            })}
          </div>
          <a href="/app/calendar" className="mt-3 flex items-center justify-center gap-1 text-xs font-semibold text-hotpink">
            View full plan <ArrowRight className="h-3 w-3" strokeWidth={2} />
          </a>
        </div>
      </section>

      {/* ── RECOMMENDED FOR YOU TODAY ────────────────────────────────────── */}
      <section className="mt-4 sm:mt-6 animate-card-pop-in" style={{ animationDelay: "300ms" }}>
        <SectionTitle hint="for your phase">Recommended for you today</SectionTitle>
        <a
          href="/app/tools/yoga"
          className="group flex items-stretch overflow-hidden rounded-3xl bloom-pearl-card pearl-sheen transition hover:-translate-y-0.5"
        >
          <div className="relative w-28 sm:w-44 shrink-0 overflow-hidden">
            <img src={plan.pose} alt="" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" loading="lazy" />
          </div>
          <div className="p-3.5 sm:p-5 flex-1 flex flex-col">
            <span className="inline-flex w-fit items-center rounded-full bg-blush text-hotpink text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 border border-petal/60">
              {PHASE_LABEL[phase]} phase
            </span>
            <h3 className="mt-2 font-script text-2xl sm:text-3xl text-hotpink leading-none">{plan.yoga}</h3>
            <p className="mt-1.5 text-[11px] sm:text-sm text-rose/80 leading-snug">{plan.recBlurb}</p>
            <div className="mt-auto pt-2 sm:pt-3 flex items-center justify-end">
              <span className="clay-blob inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold text-white">
                <Play className="h-3 w-3" fill="currentColor" strokeWidth={0} /> Start flow
              </span>
            </div>
          </div>
        </a>
      </section>

      {/* ── BLOOM AFFIRMATION ─────────────────────────────────────────────── */}
      <section className="mt-4 sm:mt-6 mb-4 animate-card-pop-in" style={{ animationDelay: "360ms" }}>
        <div className="pearl-frame relative overflow-hidden rounded-[1.5rem] sm:rounded-[2rem]">
          <img src="/images/tools-hero-affirmation.png" alt="" className="animate-hero-breathe absolute inset-0 h-full w-full object-cover object-left" />
          <div
            className="absolute inset-0 z-[2]"
            style={{ background: "radial-gradient(65% 90% at 50% 50%, oklch(1 0 0 / 0.92) 0%, oklch(1 0 0 / 0.6) 45%, transparent 80%)" }}
          />
          <div className="relative z-[2] flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-4 sm:px-8 sm:py-5">
            <div className="text-center sm:text-left">
              <span className="inline-flex items-center gap-1.5 text-[10px] sm:text-xs font-bold uppercase tracking-wider text-hotpink">
                <Heart className="h-3 w-3 sm:h-3.5 sm:w-3.5" strokeWidth={2} fill="currentColor" /> Bloom Affirmation
              </span>
              <p className="mt-1 font-script text-lg sm:text-2xl text-[#831843] leading-snug">"{AFFIRMATIONS[affirmIdx]}"</p>
            </div>
            <button
              onClick={newAffirmation}
              className="bloom-luxury-btn inline-flex shrink-0 items-center gap-1.5 px-4 py-2 text-xs sm:text-sm font-semibold text-white"
            >
              New Affirmation <RefreshCw className="h-3.5 w-3.5" strokeWidth={2.5} />
            </button>
          </div>
        </div>
      </section>

      {/* ── WATER GOAL MODAL ─────────────────────────────────────────────── */}
      {waterModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-fade-in" onClick={() => setWaterModalOpen(false)}>
          <div className="bloom-pearl-card pearl-sheen relative w-full max-w-xs rounded-3xl p-5 sm:p-6" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setWaterModalOpen(false)} aria-label="Close" className="absolute top-3 right-3 grid h-7 w-7 place-items-center rounded-full bg-blush text-rose/70">
              <X className="h-4 w-4" strokeWidth={2} />
            </button>
            <p className="font-script text-2xl text-hotpink leading-none text-center">Daily Hydration Goal ✿</p>
            <p className="mt-1.5 text-center text-xs text-rose/60">How many glasses of water do you want to drink each day?</p>
            <div className="mt-4 flex items-center justify-center gap-4">
              <button
                onClick={() => saveWaterGoal(waterGoal - 1)}
                className="clay-blob grid h-10 w-10 place-items-center rounded-full text-white"
                aria-label="Decrease goal"
              >
                <Minus className="h-4 w-4" strokeWidth={2.5} />
              </button>
              <span className="font-script text-4xl text-hotpink leading-none w-14 text-center">{waterGoal}</span>
              <button
                onClick={() => saveWaterGoal(waterGoal + 1)}
                className="clay-blob grid h-10 w-10 place-items-center rounded-full text-white"
                aria-label="Increase goal"
              >
                <Plus className="h-4 w-4" strokeWidth={2.5} />
              </button>
            </div>
            <button
              onClick={() => setWaterModalOpen(false)}
              className="bloom-luxury-btn mt-5 w-full inline-flex items-center justify-center gap-1.5 px-4 py-2.5 text-sm font-semibold text-white"
            >
              Save goal
            </button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes mood-breathe {
          0%,100% { transform: scale(1); }
          50%      { transform: scale(1.12); }
        }
        .mood-invite {
          animation: mood-breathe 2.8s ease-in-out infinite;
        }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
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
