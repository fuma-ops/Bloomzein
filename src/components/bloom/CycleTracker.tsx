import { useEffect, useMemo, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Droplet,
  Sprout,
  Flower2,
  Moon,
  Pill,
  Undo2,
  Sparkles,
  Heart,
  Star,
  Leaf,
  Smile,
  Zap,
  HeartCrack,
  CloudRain,
  Flame,
  Cloud,
  BookOpen,
  CalendarDays,
  PenLine,
  Pencil,
  X,
} from "lucide-react";
import { PeriodSetup, type CycleSettings } from "./PeriodSetup";
import { BloomBubbles } from "./BloomBubbles";
import { KawaiiBackground } from "./KawaiiBackground";
import { AnimatedWords } from "./AnimatedWords";
import { type CyclePhase, phaseForDay, PHASE_LABEL, DEFAULT_CYCLE_SETTINGS, readCycleSettings, writeCycleSettings, broadcastCyclePhase } from "./cyclePhase";

/** @deprecated use DEFAULT_CYCLE_SETTINGS / readCycleSettings from "./cyclePhase" — kept for existing imports */
export const DEFAULT_SETTINGS: CycleSettings = DEFAULT_CYCLE_SETTINGS;

/** @deprecated use CyclePhase from "./cyclePhase" — kept for existing imports */
export type Phase = Exclude<CyclePhase, "any"> | null;

export { phaseForDay };

export const PHASE_META: Record<Exclude<Phase, null>, { label: string; color: string; ring: string; Icon: any }> = {
  period:     { label: "PERIOD",     color: "bg-hotpink text-white",                ring: "ring-hotpink/40",  Icon: Droplet },
  follicular: { label: "FOLLICULAR", color: "bg-amber-100 text-amber-700",          ring: "ring-amber-200",   Icon: Sprout },
  fertile:    { label: "FERTILE",    color: "bg-pink-100 text-hotpink",             ring: "ring-pink-200",    Icon: Flower2 },
  ovulation:  { label: "OVULATION",  color: "bg-rose-200 text-magenta",             ring: "ring-rose-400",    Icon: Star },
  luteal:     { label: "LUTEAL",     color: "bg-violet-100 text-violet-500",        ring: "ring-violet-200",  Icon: Moon },
};

// Gentle phase-aware blurb for the "Today's Insight" hero card.
const PHASE_INSIGHT: Record<Exclude<Phase, null>, string> = {
  period: "Your body is resting and renewing. Be extra gentle with yourself — cosy comfort and light movement help today.",
  follicular: "Your energy is naturally rising. A great day to focus on growth and new opportunities.",
  fertile: "You're glowing with energy — a lovely day for connection, creativity and confidence.",
  ovulation: "You're at your peak. Channel this radiant energy into your boldest ideas today.",
  luteal: "Energy is winding down. Prioritise rest, warm food and gentle self-care.",
};

// Phase-aware "For You" picks, paired with real photos from the app —
// covering yoga, workout, meals plus a suitable Read/blog and Shop find.
const PHASE_RECOMMEND: Record<Exclude<Phase, null>, {
  yoga: { title: string; img: string };
  workout: { title: string; img: string };
  meal: { title: string; img: string };
  read: { title: string; img: string };
  shop: { title: string; img: string };
}> = {
  period: {
    yoga: { title: "Soft yoga for cramps", img: "/images/pose-childs-pose.webp" },
    workout: { title: "Light mobility & core", img: "/images/zone-core.png" },
    meal: { title: "Iron-rich warm stew", img: "/images/meal-stew.jpg" },
    read: { title: "Rest is productive", img: "/images/read-cycle.png" },
    shop: { title: "Cozy Heat Wrap", img: "/images/shop-cat-cycle.jpg" },
  },
  follicular: {
    yoga: { title: "Energising morning flow", img: "/images/pose-warrior-1.webp" },
    workout: { title: "Full-body strength", img: "/images/zone-full-body.png" },
    meal: { title: "Protein buddha bowl", img: "/images/meal-buddha.jpg" },
    read: { title: "Cycle syncing 101", img: "/images/read-cycle.png" },
    shop: { title: "Soft Glow Leggings", img: "/images/shop-cat-active.jpg" },
  },
  fertile: {
    yoga: { title: "Power & balance flow", img: "/images/pose-tree.webp" },
    workout: { title: "Glutes & legs burn", img: "/images/zone-glutes.png" },
    meal: { title: "Fresh cute lunchbox", img: "/images/meal-lunchbox.jpg" },
    read: { title: "Your magnetic era", img: "/images/read-selfcare.png" },
    shop: { title: "Pillow Lip Gloss", img: "/images/shop-cat-beauty.jpg" },
  },
  ovulation: {
    yoga: { title: "Dynamic energy flow", img: "/images/pose-warrior-2.webp" },
    workout: { title: "High-intensity session", img: "/images/zone-arms.png" },
    meal: { title: "Cozy energising oats", img: "/images/meal-oats.jpg" },
    read: { title: "Glow & confidence", img: "/images/read-mindset.png" },
    shop: { title: "Rose Petal Serum", img: "/images/shop-cat-beauty.jpg" },
  },
  luteal: {
    yoga: { title: "Calming wind-down flow", img: "/images/pose-cat-cow.webp" },
    workout: { title: "Gentle toning", img: "/images/zone-back.png" },
    meal: { title: "Comforting warm stew", img: "/images/meal-stew.jpg" },
    read: { title: "Luteal phase glow-up", img: "/images/read-cycle.png" },
    shop: { title: "Silk Sleep Mask", img: "/images/shop-cat-selfcare.jpg" },
  },
};

// How each phase paints a calendar day — a soft tint + a tiny corner icon so
// the month at a glance tells you exactly what's happening, not just periods.
const CALENDAR_DAY_STYLE: Record<Exclude<Phase, null>, { cell: string; badge: string; Icon: any; iconClass: string }> = {
  period:     { cell: "bg-gradient-to-br from-[#FFC2D6] to-[#FF9EBB] text-white shadow-sm",                 badge: "bg-white", Icon: Droplet, iconClass: "fill-red-500 text-red-500" },
  follicular: { cell: "bg-amber-50 text-amber-700 ring-1 ring-amber-200/70",                                badge: "bg-white", Icon: Sprout,  iconClass: "fill-amber-300 text-amber-500" },
  fertile:    { cell: "bg-gradient-to-br from-pink-50 to-rose-100 text-hotpink ring-1 ring-pink-200",       badge: "bg-white", Icon: Flower2, iconClass: "fill-pink-300 text-hotpink" },
  ovulation:  { cell: "bg-gradient-to-br from-violet-100 to-fuchsia-100 text-violet-500 ring-2 ring-violet-200", badge: "bg-white", Icon: Sparkles, iconClass: "fill-violet-400 text-violet-400" },
  luteal:     { cell: "bg-violet-50 text-violet-500 ring-1 ring-violet-200/70",                             badge: "bg-white", Icon: Moon,    iconClass: "fill-violet-300 text-violet-400" },
};

const MOODS = [
  { key: "calm",      label: "Calm",      Icon: Leaf },
  { key: "happy",     label: "Happy",     Icon: Smile },
  { key: "energetic", label: "Energetic", Icon: Zap },
  { key: "sensitive", label: "Sensitive", Icon: HeartCrack },
  { key: "sad",       label: "Sad",       Icon: CloudRain },
  { key: "tired",     label: "Tired",     Icon: Moon },
  { key: "cramps",    label: "Cramps",    Icon: Flame },
  { key: "bloated",   label: "Bloated",   Icon: Cloud },
] as const;

// Shared with Today page, so picking a mood here updates it there too.
const MOOD_KEY = "bloom:today-mood";
// Per-day "X" dismissal for the mood check-in card.
const MOOD_DISMISSED_KEY = "bloom:cycle-mood-dismissed";

const WEEKDAYS = ["SU", "MO", "TU", "WE", "TH", "FR", "SA"];
const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function readJSON<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function CycleTracker() {
  const today = new Date(2026, 5, 14); // demo "today"
  const [settings, setSettings] = useState<CycleSettings>(() => readCycleSettings());
  const [setupOpen, setSetupOpen] = useState(false);

  // Broadcast the current phase on mount so other tools (Today, Calendar, Yoga,
  // Meals, Workout, Diet...) stay in sync even before the user re-saves settings.
  useEffect(() => {
    broadcastCyclePhase();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [cursor, setCursor] = useState(new Date(2026, 5, 1)); // June 2026 — month containing "today"
  const [selected, setSelected] = useState<Date>(today);
  const [pillTaken, setPillTaken] = useState(true);
  const [mood, setMood] = useState<string>("happy");
  const [hasPickedMood, setHasPickedMood] = useState(false);
  const [moodDismissed, setMoodDismissed] = useState(false);
  const [showMoodPicker, setShowMoodPicker] = useState(false);
  const [slideDir, setSlideDir] = useState<"l" | "r">("r");

  // Load any mood already picked on the Today page, and respect today's "X" dismissal.
  useEffect(() => {
    try {
      const saved = localStorage.getItem(MOOD_KEY);
      if (saved) {
        setMood(saved);
        setHasPickedMood(true);
      }
      const dismissed = readJSON<{ date: string; dismissed: boolean }>(MOOD_DISMISSED_KEY, { date: "", dismissed: false });
      const iso = new Date().toISOString().slice(0, 10);
      if (dismissed.date === iso && dismissed.dismissed) setMoodDismissed(true);
    } catch {}
  }, []);

  const days = useMemo(() => {
    const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
    const startWeekday = first.getDay();
    const totalDays = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate();
    const cells: (Date | null)[] = [];
    for (let i = 0; i < startWeekday; i++) cells.push(null);
    for (let d = 1; d <= totalDays; d++) cells.push(new Date(cursor.getFullYear(), cursor.getMonth(), d));
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  }, [cursor]);

  function shift(dir: -1 | 1) {
    setSlideDir(dir === 1 ? "r" : "l");
    setCursor((c) => new Date(c.getFullYear(), c.getMonth() + dir, 1));
  }

  // Days until the next period starts, from today
  const daysToPeriod = useMemo(() => {
    const ms = 1000 * 60 * 60 * 24;
    const diff = Math.floor((today.getTime() - settings.lastPeriodStart.getTime()) / ms);
    const cyclesPassed = Math.floor(diff / settings.cycleLength) + 1;
    const np = new Date(settings.lastPeriodStart.getTime() + cyclesPassed * settings.cycleLength * ms);
    return Math.ceil((np.getTime() - today.getTime()) / ms);
  }, [settings]);

  const pillLabel = settings.contraceptiveMethod.charAt(0).toUpperCase() + settings.contraceptiveMethod.slice(1);

  // Where today sits in the cycle (1-indexed) + the broad "journey" stage for it.
  const { cycleDay, ovulationDayOfCycle, currentPhase } = useMemo(() => {
    const ms = 1000 * 60 * 60 * 24;
    const diff = Math.floor((today.getTime() - settings.lastPeriodStart.getTime()) / ms);
    const cd = (((diff % settings.cycleLength) + settings.cycleLength) % settings.cycleLength) + 1;
    const ovDay = settings.cycleLength - 14;
    const phase = phaseForDay(today, settings);
    return { cycleDay: cd, ovulationDayOfCycle: ovDay, currentPhase: phase };
  }, [settings]);

  const journeySteps = [
    {
      key: "period" as const,
      label: PHASE_META.period.label,
      range: `Days 1–${settings.periodLength}`,
      active: cycleDay <= settings.periodLength,
    },
    {
      key: "follicular" as const,
      label: PHASE_META.follicular.label,
      range: `Days ${settings.periodLength + 1}–${ovulationDayOfCycle - 1}`,
      active: cycleDay > settings.periodLength && cycleDay < ovulationDayOfCycle,
    },
    {
      key: "ovulation" as const,
      label: PHASE_META.ovulation.label,
      range: `Day ${ovulationDayOfCycle}`,
      active: cycleDay === ovulationDayOfCycle,
    },
    {
      key: "luteal" as const,
      label: PHASE_META.luteal.label,
      range: `Days ${ovulationDayOfCycle + 1}–${settings.cycleLength}`,
      active: cycleDay > ovulationDayOfCycle,
    },
  ];

  const MoodIconToday = MOODS.find((m) => m.key === mood)?.Icon ?? Smile;
  const moodLabelToday = MOODS.find((m) => m.key === mood)?.label ?? "Happy";
  const recommend = PHASE_RECOMMEND[currentPhase];

  // The right panel always reacts to whichever day is selected on the calendar.
  const isSelectedToday = sameDay(selected, today);
  const selectedPhase = useMemo(() => (isSelectedToday ? currentPhase : phaseForDay(selected, settings)), [selected, settings, isSelectedToday, currentPhase]);
  const selectedInsight = PHASE_INSIGHT[selectedPhase];
  const selectedRecommend = PHASE_RECOMMEND[selectedPhase];
  const selectedLabel = isSelectedToday
    ? "TODAY"
    : selected.toLocaleDateString("en", { weekday: "long", month: "long", day: "numeric" }).toUpperCase();

  return (
    <div className="relative">
      {/* dreamy kawaii 3D pink gradient background */}
      <KawaiiBackground count={16} />
      <BloomBubbles count={18} />

      {/* ============= Calendar (≤60% on desktop) + reactive right panel (40%) ============= */}
      <div className="md:grid md:grid-cols-5 md:items-start md:gap-6">
      <div className="md:col-span-3">

      {/* ============= Header ============= */}
      {/* ============= Hero: Cycle title + Log & Settings + Today's Insight ============= */}
      <div className="pearl-frame animate-scale-in relative flex min-h-[15rem] flex-col overflow-hidden rounded-2xl sm:min-h-[18rem] sm:rounded-[2rem]">
        <img
          src="/images/cycle-insight-hero.webp"
          alt=""
          aria-hidden
          loading="lazy"
          decoding="async"
          className="absolute inset-0 -z-10 h-full w-full animate-photo-breathe object-cover object-[center_15%] sm:object-[center_20%]"
        />
        <div className="absolute inset-0 -z-10 bg-gradient-to-t from-white/85 via-white/55 to-white/15" />
        <div className="relative z-10 flex items-center justify-between gap-2 p-3 sm:p-5">
          <h2 className="font-script text-3xl text-hotpink sm:text-5xl">
            Cycle <Flower2 className="animate-flower-bloom animate-flower-glow ml-1 inline h-7 w-7 fill-hotpink/30 text-hotpink sm:h-11 sm:w-11" />
          </h2>
        </div>
        <div className="relative z-10 px-3 pb-3 sm:max-w-md sm:px-5 sm:pb-4">
          <p className="inline-flex items-center gap-1 text-[8px] font-bold tracking-widest text-rose sm:gap-1.5 sm:text-[10px]">
            <Sparkles className="h-2.5 w-2.5 animate-bloom-sparkle text-hotpink sm:h-3 sm:w-3" /> WHERE YOU ARE TODAY
          </p>
          <h3 className="mt-1 font-script text-2xl leading-tight text-hotpink sm:text-4xl">
            <AnimatedWords text={`Day ${cycleDay} · ${PHASE_LABEL[currentPhase]} Phase`} className="animate-text-glow" />
          </h3>
        </div>

        {/* ============= Your Cycle Journey — sits directly on the hero, no card ============= */}
        <div className="relative z-10 mt-auto px-3 pt-6 pb-3 sm:px-5 sm:pt-8 sm:pb-5">
          <p className="absolute left-3 top-0 font-script text-sm text-hotpink sm:left-5 sm:text-lg">Your Cycle Journey</p>

          <div className="relative flex justify-between">
            {/* connecting line — centered on the phase icons */}
            <div className="absolute left-5 right-5 top-3.5 h-1 -translate-y-1/2 rounded-full bg-white/60 sm:left-7 sm:right-7 sm:top-5" />
            {journeySteps.map((step) => {
              const Icon = PHASE_META[step.key].Icon;
              return (
                <div key={step.key} className="flex flex-1 flex-col items-center gap-1 text-center">
                  <span
                    className={[
                      "grid h-7 w-7 shrink-0 place-items-center rounded-full ring-[3px] shadow-sm transition-all duration-300 sm:h-10 sm:w-10",
                      step.active
                        ? "animate-bloom-pulse bg-hotpink text-white ring-hotpink/30"
                        : "bg-white text-rose ring-petal/60",
                    ].join(" ")}
                  >
                    <Icon className="animate-icon-wiggle h-3 w-3 sm:h-4 sm:w-4" />
                  </span>
                  <span className={`text-[7px] font-bold tracking-wider sm:text-[10px] ${step.active ? "text-hotpink" : "text-rose/70"}`}>
                    {step.label}
                  </span>
                  <span className="hidden text-[8px] text-rose/50 sm:block sm:text-[9px]">{step.range}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ============= Mood check-in — compact, gentle entrance, dismissible ============= */}
      {!hasPickedMood && !moodDismissed && (
        <div className="bloom-pearl-card animate-question-pop relative mt-3 rounded-2xl p-2.5 sm:rounded-3xl sm:p-3.5">
          <button
            onClick={() => {
              setMoodDismissed(true);
              try { localStorage.setItem(MOOD_DISMISSED_KEY, JSON.stringify({ date: new Date().toISOString().slice(0, 10), dismissed: true })); } catch {}
            }}
            aria-label="Dismiss"
            className="hover-scale absolute top-2 right-2 grid h-5 w-5 place-items-center rounded-full bg-blush text-rose/60 transition active:scale-90 sm:h-6 sm:w-6"
          >
            <X className="h-3 w-3" />
          </button>
          <p className="pr-6 font-script text-sm text-hotpink sm:text-lg">How's your mood today?</p>
          <div className="mt-1.5 flex flex-wrap items-center gap-1 sm:gap-1.5">
            {MOODS.map((m) => {
              const MoodIcon = m.Icon;
              return (
                <button
                  key={m.key}
                  onClick={() => {
                    setMood(m.key);
                    setHasPickedMood(true);
                    try { localStorage.setItem(MOOD_KEY, m.key); } catch {}
                  }}
                  className="hover-scale inline-flex shrink-0 items-center gap-1 rounded-full bg-blush/60 px-2 py-1 text-[10px] font-semibold text-rose transition-all duration-200 active:scale-95 hover:bg-petal/70 sm:px-2.5 sm:text-xs"
                >
                  <MoodIcon className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                  {m.label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ============= Calendar — same compact, glassy pearl effect as "Everything blooms in one place" ============= */}
      <div className="pearl-frame animate-scale-in relative mt-5 overflow-hidden rounded-[1.5rem] p-2 sm:rounded-[2.5rem] sm:p-5" style={{ animationDelay: "60ms", background: "oklch(1 0 0 / 0.16)", backdropFilter: "blur(6px)" }}>
        <div className="pearl-frame relative overflow-hidden rounded-2xl border-none bg-white/55 p-2 backdrop-blur-md sm:rounded-3xl sm:p-5">
          {/* Month nav + Log & Settings */}
          <div className="mb-1.5 flex items-center justify-between gap-2 sm:mb-3">
            <h3 className="font-script text-sm text-hotpink sm:text-2xl">
              {MONTHS[cursor.getMonth()]} {cursor.getFullYear()}
            </h3>
            <div className="flex items-center gap-1">
              <button onClick={() => shift(-1)} className="hover-scale grid h-5 w-5 place-items-center rounded-full bg-white/60 text-rose shadow-sm backdrop-blur-md transition-transform duration-150 active:scale-90 sm:h-7 sm:w-7">
                <ChevronLeft className="h-2.5 w-2.5 sm:h-4 sm:w-4" />
              </button>
              <button onClick={() => shift(1)} className="hover-scale grid h-5 w-5 place-items-center rounded-full bg-white/60 text-rose shadow-sm backdrop-blur-md transition-transform duration-150 active:scale-90 sm:h-7 sm:w-7">
                <ChevronRight className="h-2.5 w-2.5 sm:h-4 sm:w-4" />
              </button>
              <button
                onClick={() => setSetupOpen(true)}
                className="bloom-luxury-btn hover-scale animate-card-breathe group relative inline-flex shrink-0 items-center gap-1 px-2 py-1 text-[9px] font-bold text-white sm:gap-1.5 sm:px-4 sm:py-2 sm:text-xs"
              >
                <Sparkles className="h-2.5 w-2.5 animate-bloom-sparkle sm:h-3.5 sm:w-3.5" />
                <span>Settings</span>
              </button>
            </div>
          </div>

          {/* Weekday header */}
          <div className="mb-0.5 grid grid-cols-7 text-center text-[7px] font-bold tracking-widest text-rose/70 sm:mb-1 sm:text-[10px]">
            {WEEKDAYS.map((d) => <div key={d}>{d}</div>)}
          </div>

          {/* Calendar grid — simplified: only Period, Ovulation & Today (animated slide on month change via key) */}
          <div
            key={`${cursor.getFullYear()}-${cursor.getMonth()}-${slideDir}`}
            className="grid grid-cols-7 gap-0.5 animate-fade-in sm:gap-1"
          >
            {days.map((d, i) => {
              if (!d) return <div key={i} />;
              const phase = phaseForDay(d, settings);
              const style = CALENDAR_DAY_STYLE[phase];
              const BadgeIcon = style.Icon;
              const isSelected = sameDay(d, selected);
              const isToday = sameDay(d, today);

              return (
                <button
                  key={i}
                  onClick={() => setSelected(d)}
                  title={`${d.getDate()} · ${PHASE_LABEL[phase]}`}
                  className={[
                    "relative aspect-square rounded-full flex items-center justify-center text-[8px] font-bold transition-all duration-200 sm:text-xs",
                    "hover:scale-105 active:scale-95",
                    style.cell,
                    isSelected && !isToday ? "ring-2 ring-hotpink/50" : "",
                    isToday ? "animate-selected-glow ring-2 ring-hotpink/60" : "",
                  ].join(" ")}
                >
                  {d.getDate()}
                  <span className={`absolute -bottom-0.5 -right-0.5 grid h-2.5 w-2.5 place-items-center rounded-full shadow-sm sm:h-4 sm:w-4 ${style.badge}`}>
                    <BadgeIcon className={`h-1.5 w-1.5 sm:h-2.5 sm:w-2.5 ${style.iconClass}`} />
                  </span>
                </button>
              );
            })}
          </div>

          {/* Legend — every phase, so the month reads at a glance */}
          <div className="mt-2 flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-[7px] font-bold text-rose/80 sm:mt-4 sm:gap-x-4 sm:text-[10px]">
            <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-gradient-to-br from-[#FFC2D6] to-[#FF9EBB] sm:h-3 sm:w-3" /> Period</span>
            <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-amber-100 ring-1 ring-amber-200 sm:h-3 sm:w-3" /> Follicular</span>
            <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-gradient-to-br from-pink-100 to-rose-200 ring-1 ring-pink-200 sm:h-3 sm:w-3" /> Fertile</span>
            <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-gradient-to-br from-violet-100 to-fuchsia-100 ring-2 ring-violet-200 sm:h-3 sm:w-3" /> Ovulation</span>
            <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-violet-100 ring-1 ring-violet-200 sm:h-3 sm:w-3" /> Luteal</span>
            <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full ring-2 ring-hotpink/60 shadow-[0_0_6px_1px_rgba(236,72,153,0.4)] sm:h-3 sm:w-3" /> Today</span>
          </div>
        </div>
      </div>

      </div>{/* /lg:col-span-3 main column */}

      {/* ============= Right panel — reacts to the selected calendar day ============= */}
      <aside className="bloom-pearl-card animate-scale-in relative mt-5 overflow-hidden rounded-[2rem] p-4 sm:p-6 md:sticky md:top-4 md:col-span-2 md:mt-0" style={{ animationDelay: "120ms" }}>
        <div className="pointer-events-none absolute inset-0 -z-0 animate-bloom-pulse rounded-[2rem] bg-[radial-gradient(60%_60%_at_50%_45%,oklch(0.75_0.22_350/0.25)_0%,transparent_70%)]" aria-hidden />
        <div key={selected.toDateString()} className="relative z-10 animate-fade-in">
          <p className="inline-flex items-center gap-1 text-[9px] font-bold tracking-widest text-rose/70 sm:text-[10px]">
            <Sparkles className="h-2.5 w-2.5 text-hotpink" /> {selectedLabel}
          </p>
          <h3 className="mt-1 font-script text-xl text-hotpink sm:text-2xl">
            <AnimatedWords text={`${PHASE_LABEL[selectedPhase]} Phase`} />
          </h3>
          <p className="mt-1.5 text-xs font-semibold leading-snug text-magenta sm:text-sm">
            <AnimatedWords text={selectedInsight} delay={80} />
          </p>

          {/* Space Stats — important data, glowing icons */}
          <p className="mt-4 text-[9px] font-bold tracking-widest text-rose/60 sm:text-[10px]">SPACE STATS ✿</p>
          <div className="mt-2 grid grid-cols-2 gap-1.5 sm:gap-2">
            {[
              { label: "CYCLE DAY", value: `${cycleDay}/${settings.cycleLength}`, Icon: CalendarDays },
              { label: "NEXT PERIOD", value: `${daysToPeriod}d`, Icon: Droplet },
              { label: "PHASE", value: PHASE_LABEL[currentPhase], Icon: Flower2 },
            ].map((s) => (
              <div key={s.label} className="flex items-center gap-1.5 rounded-2xl bg-white/60 p-1.5 shadow-sm backdrop-blur-md sm:gap-2.5 sm:p-2">
                <span className="animate-soft-glow grid h-6 w-6 shrink-0 place-items-center rounded-full bg-hotpink/10 text-hotpink sm:h-8 sm:w-8">
                  <s.Icon className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                </span>
                <div className="min-w-0">
                  <p className="text-[8px] font-bold tracking-wider text-rose/60 sm:text-[9px]">{s.label}</p>
                  <p className="truncate font-script text-sm leading-none text-hotpink sm:text-base">{s.value}</p>
                </div>
              </div>
            ))}
            {/* Mood — tap to change, small pencil badge hints it's editable */}
            <button
              onClick={() => setShowMoodPicker((v) => !v)}
              aria-expanded={showMoodPicker}
              className="hover-scale relative flex items-center gap-1.5 rounded-2xl bg-white/60 p-1.5 text-left shadow-sm backdrop-blur-md transition active:scale-95 sm:gap-2.5 sm:p-2"
            >
              <span className="animate-soft-glow grid h-6 w-6 shrink-0 place-items-center rounded-full bg-hotpink/10 text-hotpink sm:h-8 sm:w-8">
                <MoodIconToday className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
              </span>
              <div className="min-w-0">
                <p className="text-[8px] font-bold tracking-wider text-rose/60 sm:text-[9px]">MOOD</p>
                <p className="truncate font-script text-sm leading-none text-hotpink sm:text-base">{moodLabelToday}</p>
              </div>
              <span className="absolute -top-1.5 -right-1.5 grid h-4 w-4 place-items-center rounded-full bg-hotpink text-white shadow-sm">
                <Pencil className="h-2 w-2" />
              </span>
            </button>
            {/* Mood picker — appears under the grid when the Mood card is tapped */}
            {showMoodPicker && (
              <div className="col-span-2 animate-scale-in flex flex-wrap items-center gap-1 rounded-2xl bg-white/60 p-1.5 shadow-sm backdrop-blur-md sm:gap-1.5 sm:p-2">
                {MOODS.map((m) => {
                  const MoodIcon = m.Icon;
                  return (
                    <button
                      key={m.key}
                      onClick={() => {
                        setMood(m.key);
                        setHasPickedMood(true);
                        setShowMoodPicker(false);
                        try { localStorage.setItem(MOOD_KEY, m.key); } catch {}
                      }}
                      className={[
                        "hover-scale inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-1 text-[10px] font-semibold transition-all duration-200 active:scale-95",
                        mood === m.key ? "bg-hotpink text-white" : "bg-blush/60 text-rose hover:bg-petal/70",
                      ].join(" ")}
                    >
                      <MoodIcon className="h-3 w-3" />
                      {m.label}
                    </button>
                  );
                })}
              </div>
            )}
            {/* Daily pill — tap to toggle taken */}
            <button
              onClick={() => setPillTaken((v) => !v)}
              aria-pressed={pillTaken}
              className="col-span-2 flex items-center gap-1.5 rounded-2xl bg-white/60 p-1.5 text-left shadow-sm backdrop-blur-md transition active:scale-95 sm:gap-2.5 sm:p-2"
            >
              <span className={`animate-soft-glow grid h-6 w-6 shrink-0 place-items-center rounded-full transition-all sm:h-8 sm:w-8 ${pillTaken ? "bg-hotpink text-white" : "bg-hotpink/10 text-hotpink"}`}>
                <Pill className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
              </span>
              <div className="min-w-0">
                <p className="text-[8px] font-bold tracking-wider text-rose/60 sm:text-[9px]">DAILY {pillLabel.toUpperCase()}</p>
                <p className={`inline-flex items-center gap-1 font-script text-sm leading-none sm:text-base ${pillTaken ? "text-hotpink" : "text-rose/60"}`}>
                  {pillTaken ? <><Heart className="h-2.5 w-2.5 sm:h-3 sm:w-3" /> Taken today</> : <><Undo2 className="h-2.5 w-2.5 sm:h-3 sm:w-3" /> Tap to log</>}
                </p>
              </div>
            </button>
          </div>

          <p className="mt-4 text-[9px] font-bold tracking-widest text-rose/60 sm:text-[10px]">SUGGESTED FOR THIS PHASE</p>
          <div className="mt-2 space-y-2">
            {[
              { tag: "Yoga", t: selectedRecommend.yoga.title, img: selectedRecommend.yoga.img, href: "/app/tools/yoga" },
              { tag: "Workout", t: selectedRecommend.workout.title, img: selectedRecommend.workout.img, href: "/app/tools/workout" },
              { tag: "Meal", t: selectedRecommend.meal.title, img: selectedRecommend.meal.img, href: "/app/tools/meals" },
            ].map((p) => (
              <a
                key={p.tag}
                href={p.href}
                className="hover-scale group flex items-center gap-2.5 rounded-2xl bg-white/60 p-1.5 pr-3 shadow-sm backdrop-blur-md transition-all duration-200 active:scale-95 hover:shadow-md"
              >
                <img src={p.img} alt="" aria-hidden loading="lazy" decoding="async" className="h-10 w-10 shrink-0 rounded-xl object-cover sm:h-12 sm:w-12" />
                <div className="min-w-0">
                  <p className="text-[9px] font-bold uppercase tracking-wider text-rose/60 sm:text-[10px]">{p.tag}</p>
                  <p className="truncate font-script text-sm text-hotpink sm:text-base">{p.t}</p>
                </div>
              </a>
            ))}
          </div>

          <a
            href="/app/tools/yoga"
            className="bloom-luxury-btn hover-scale animate-selected-glow mt-4 inline-flex w-full items-center justify-center gap-1.5 px-4 py-2.5 text-xs font-bold text-white active:scale-95 sm:text-sm"
          >
            <Flower2 className="h-4 w-4" />
            Start 15-Min Flow
          </a>
        </div>
      </aside>
      </div>{/* /lg:grid */}

      {/* ============= Today's Journal Prompt ============= */}
      <div className="pearl-frame animate-scale-in relative mt-5 flex min-h-[14rem] flex-col items-start justify-center overflow-hidden rounded-[2rem] sm:min-h-[16rem]" style={{ animationDelay: "340ms" }}>
        <img
          src="/images/cycle-journal-hero.webp"
          alt=""
          aria-hidden
          loading="lazy"
          decoding="async"
          className="absolute inset-0 -z-10 h-full w-full animate-photo-breathe object-cover"
        />
        <div className="absolute inset-0 -z-10 bg-gradient-to-t from-white/95 via-white/65 to-transparent sm:bg-gradient-to-r sm:from-white/95 sm:via-white/70 sm:to-white/10" />
        <div className="relative z-10 max-w-md p-5 sm:p-8">
          <p className="inline-flex items-center gap-1.5 text-[10px] font-bold tracking-widest text-rose">
            <BookOpen className="h-3 w-3 text-hotpink" /> TODAY'S JOURNAL PROMPT
          </p>
          <p className="mt-1 font-script text-2xl text-hotpink sm:text-3xl lg:text-4xl">
            "What is one small step I can take today towards my biggest goal?"
          </p>
          <a
            href="/app/tools/diary"
            className="bloom-luxury-btn hover-scale animate-cta-bounce mt-4 inline-flex w-full max-w-xs items-center justify-center gap-1.5 px-5 py-2.5 text-sm font-bold text-white sm:w-auto"
          >
            <PenLine className="h-4 w-4" />
            Write Entry
          </a>
        </div>
      </div>

      {/* For You — compact grid */}
      <div className="mt-8">
        <h3 className="font-script text-3xl text-hotpink mb-1 sm:text-4xl">For You ✿</h3>
        <p className="mb-3 text-xs font-semibold text-magenta/70 sm:text-sm">
          Handpicked for your {PHASE_LABEL[currentPhase].toLowerCase()} phase — move, eat, read & treat yourself.
        </p>
        <div className="grid grid-cols-3 gap-2 sm:gap-3 lg:grid-cols-5">
          {[
            { tag: "YOGA", t: recommend.yoga.title, img: recommend.yoga.img, href: "/app/tools/yoga" },
            { tag: "WORKOUT", t: recommend.workout.title, img: recommend.workout.img, href: "/app/tools/workout" },
            { tag: "MEALS", t: recommend.meal.title, img: recommend.meal.img, href: "/app/tools/meals" },
            { tag: "READ", t: recommend.read.title, img: recommend.read.img, href: "/app/read" },
            { tag: "SHOP", t: recommend.shop.title, img: recommend.shop.img, href: "/app/shop" },
          ].map((p, i) => (
            <a
              key={p.t}
              href={p.href}
              className="pearl-frame animate-fade-in group relative flex aspect-square flex-col justify-end overflow-hidden rounded-xl shadow-md shadow-rose/10 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-hotpink/20 sm:rounded-2xl"
              style={{ animationDelay: `${i * 80}ms` }}
            >
              <img
                src={p.img}
                alt=""
                aria-hidden
                loading="lazy"
                decoding="async"
                className="absolute inset-0 -z-10 h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
              />
              <div className="absolute inset-0 -z-10 bg-gradient-to-t from-black/70 via-black/15 to-transparent" />
              <div className="relative z-10 p-1.5 sm:p-2.5">
                <span className="inline-flex items-center gap-0.5 rounded-full bg-white/90 px-1.5 py-0.5 text-[7px] font-bold tracking-wider text-hotpink sm:text-[9px]">
                  <Sparkles className="h-2 w-2" /> {p.tag}
                </span>
                <p className="mt-0.5 font-script text-[11px] leading-tight text-white sm:mt-1 sm:text-sm">{p.t}</p>
              </div>
            </a>
          ))}
        </div>
      </div>

      {/* Floating primary CTA — always visible without scrolling on mobile/tablet (desktop has it in the right panel) */}
      <a
        href="/app/tools/yoga"
        className="bloom-luxury-btn hover-scale animate-selected-glow fixed bottom-24 right-4 z-30 inline-flex items-center gap-1.5 rounded-full px-4 py-2.5 text-xs font-bold text-white shadow-lg shadow-hotpink/30 active:scale-95 md:hidden"
      >
        <Flower2 className="h-4 w-4" />
        Start Flow
      </a>

      <PeriodSetup
        open={setupOpen}
        onClose={() => setSetupOpen(false)}
        initial={settings}
        onSave={(s) => { setSettings(s); writeCycleSettings(s); }}
      />
    </div>
  );
}
