import { useEffect, useMemo, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Droplet,
  Sprout,
  Flower2,
  Moon,
  Pill,
  Plus,
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
} from "lucide-react";
import { PeriodSetup, type CycleSettings } from "./PeriodSetup";
import { BloomBubbles } from "./BloomBubbles";
import { KawaiiBackground } from "./KawaiiBackground";
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

// Quick phase-aware suggestion for the "15-Minute Flow" card.
const PHASE_FLOW: Record<Exclude<Phase, null>, { title: string; blurb: string }> = {
  period: { title: "15-Minute Gentle Flow", blurb: "Soft, grounding stretches to ease cramps and restore energy." },
  follicular: { title: "15-Minute Energy Flow", blurb: "Build strength and momentum as your energy starts to rise." },
  fertile: { title: "15-Minute Power Flow", blurb: "Channel your peak energy into balance and core work." },
  ovulation: { title: "15-Minute Dynamic Flow", blurb: "You're at your strongest — push a little further today." },
  luteal: { title: "15-Minute Wind-Down Flow", blurb: "Slow things down and soothe tension as your body prepares to rest." },
};

// Phase-aware "For You" picks, paired with real photos from the app.
const PHASE_RECOMMEND: Record<Exclude<Phase, null>, {
  yoga: { title: string; img: string };
  workout: { title: string; img: string };
  meal: { title: string; img: string };
}> = {
  period: {
    yoga: { title: "Soft yoga for cramps", img: "/images/pose-childs-pose.webp" },
    workout: { title: "Light mobility & core", img: "/images/zone-core.png" },
    meal: { title: "Iron-rich warm stew", img: "/images/meal-stew.jpg" },
  },
  follicular: {
    yoga: { title: "Energising morning flow", img: "/images/pose-warrior-1.webp" },
    workout: { title: "Full-body strength", img: "/images/zone-full-body.png" },
    meal: { title: "Protein buddha bowl", img: "/images/meal-buddha.jpg" },
  },
  fertile: {
    yoga: { title: "Power & balance flow", img: "/images/pose-tree.webp" },
    workout: { title: "Glutes & legs burn", img: "/images/zone-glutes.png" },
    meal: { title: "Fresh cute lunchbox", img: "/images/meal-lunchbox.jpg" },
  },
  ovulation: {
    yoga: { title: "Dynamic energy flow", img: "/images/pose-warrior-2.webp" },
    workout: { title: "High-intensity session", img: "/images/zone-arms.png" },
    meal: { title: "Cozy energising oats", img: "/images/meal-oats.jpg" },
  },
  luteal: {
    yoga: { title: "Calming wind-down flow", img: "/images/pose-cat-cow.webp" },
    workout: { title: "Gentle toning", img: "/images/zone-back.png" },
    meal: { title: "Comforting warm stew", img: "/images/meal-stew.jpg" },
  },
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

const WEEKDAYS = ["SU", "MO", "TU", "WE", "TH", "FR", "SA"];
const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
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
  const [slideDir, setSlideDir] = useState<"l" | "r">("r");

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
  const { cycleDay, ovulationDayOfCycle, currentPhase, journeyPercent } = useMemo(() => {
    const ms = 1000 * 60 * 60 * 24;
    const diff = Math.floor((today.getTime() - settings.lastPeriodStart.getTime()) / ms);
    const cd = (((diff % settings.cycleLength) + settings.cycleLength) % settings.cycleLength) + 1;
    const ovDay = settings.cycleLength - 14;
    const phase = phaseForDay(today, settings);
    const pct = Math.min(100, Math.max(0, ((cd - 1) / Math.max(1, settings.cycleLength - 1)) * 100));
    return { cycleDay: cd, ovulationDayOfCycle: ovDay, currentPhase: phase, journeyPercent: pct };
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
  const flow = PHASE_FLOW[currentPhase];
  const recommend = PHASE_RECOMMEND[currentPhase];

  return (
    <div className="relative">
      {/* dreamy kawaii 3D pink gradient background */}
      <KawaiiBackground count={16} />
      <BloomBubbles count={18} />

      {/* ============= Header ============= */}
      {/* ============= Hero: Cycle title + Log & Settings + Today's Insight ============= */}
      <div className="pearl-frame animate-scale-in relative flex min-h-[9rem] flex-col overflow-hidden rounded-2xl sm:min-h-[12rem] sm:rounded-[2rem]">
        <img
          src="/images/cycle-insight-hero.webp"
          alt=""
          aria-hidden
          loading="lazy"
          decoding="async"
          className="absolute inset-0 -z-10 h-full w-full animate-photo-breathe object-cover"
        />
        <div className="absolute inset-0 -z-10 bg-gradient-to-t from-white/95 via-white/65 to-white/20" />
        <div className="relative z-10 flex items-center justify-between gap-2 p-3 sm:p-5">
          <h2 className="font-script text-3xl text-hotpink sm:text-5xl">Cycle 🌸</h2>
        </div>
        <div className="relative z-10 px-3 pb-3 sm:max-w-md sm:px-5 sm:pb-5">
          <p className="inline-flex items-center gap-1 text-[8px] font-bold tracking-widest text-rose sm:gap-1.5 sm:text-[10px]">
            <Sparkles className="h-2.5 w-2.5 animate-bloom-sparkle text-hotpink sm:h-3 sm:w-3" /> TODAY'S INSIGHT
          </p>
          <h3 className="mt-1 font-script text-base leading-tight text-hotpink sm:text-3xl">
            Day {cycleDay} · {PHASE_LABEL[currentPhase]} Phase
          </h3>
          <p className="mt-1 text-[11px] font-medium leading-snug text-magenta/80 sm:mt-1.5 sm:text-sm">
            {PHASE_INSIGHT[currentPhase]}
          </p>
        </div>
      </div>

      {/* ============= Calendar — same compact, glassy pearl effect as "Everything blooms in one place" ============= */}
      <div className="pearl-frame animate-scale-in relative mt-5 overflow-hidden rounded-[1.75rem] p-3 sm:rounded-[2.5rem] sm:p-5" style={{ animationDelay: "60ms", background: "oklch(1 0 0 / 0.16)", backdropFilter: "blur(6px)" }}>
        <div className="pearl-frame relative overflow-hidden rounded-2xl border-none bg-white/55 p-3 backdrop-blur-md sm:rounded-3xl sm:p-5">
          {/* Month nav + Log & Settings */}
          <div className="mb-2 flex items-center justify-between gap-2 sm:mb-3">
            <h3 className="font-script text-lg text-hotpink sm:text-2xl">
              {MONTHS[cursor.getMonth()]} {cursor.getFullYear()}
            </h3>
            <div className="flex items-center gap-1.5">
              <button onClick={() => shift(-1)} className="hover-scale grid h-6 w-6 place-items-center rounded-full bg-white/60 text-rose shadow-sm backdrop-blur-md sm:h-7 sm:w-7">
                <ChevronLeft className="h-3 w-3 sm:h-4 sm:w-4" />
              </button>
              <button onClick={() => shift(1)} className="hover-scale grid h-6 w-6 place-items-center rounded-full bg-white/60 text-rose shadow-sm backdrop-blur-md sm:h-7 sm:w-7">
                <ChevronRight className="h-3 w-3 sm:h-4 sm:w-4" />
              </button>
              <button
                onClick={() => setSetupOpen(true)}
                className="bloom-luxury-btn hover-scale group relative inline-flex shrink-0 items-center gap-1 px-2.5 py-1.5 text-[10px] font-bold text-white sm:gap-1.5 sm:px-4 sm:py-2 sm:text-xs"
              >
                <Sparkles className="h-3 w-3 animate-bloom-sparkle sm:h-3.5 sm:w-3.5" />
                <Plus className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                <span>Log &amp; Settings</span>
              </button>
            </div>
          </div>

          {/* Weekday header */}
          <div className="mb-1 grid grid-cols-7 text-center text-[8px] font-bold tracking-widest text-rose/70 sm:text-[10px]">
            {WEEKDAYS.map((d) => <div key={d}>{d}</div>)}
          </div>

          {/* Calendar grid — simplified: only Period, Ovulation & Today (animated slide on month change via key) */}
          <div
            key={`${cursor.getFullYear()}-${cursor.getMonth()}-${slideDir}`}
            className="grid grid-cols-7 gap-1 animate-fade-in"
          >
            {days.map((d, i) => {
              if (!d) return <div key={i} />;
              const phase = phaseForDay(d, settings);
              const isPeriod = phase === "period";
              const isOvulation = phase === "ovulation";
              const isSelected = sameDay(d, selected);
              const isToday = sameDay(d, today);

              return (
                <button
                  key={i}
                  onClick={() => setSelected(d)}
                  className={[
                    "relative aspect-square rounded-full flex items-center justify-center text-[10px] font-bold transition-all duration-200 sm:text-xs",
                    "hover:scale-110 active:scale-95",
                    isPeriod
                      ? "bg-gradient-to-br from-[#FFC2D6] to-[#FF9EBB] text-white shadow-sm"
                      : isOvulation
                        ? "bg-gradient-to-br from-violet-100 to-fuchsia-100 text-violet-500 ring-2 ring-violet-200"
                        : "text-rose hover:bg-blush",
                    isSelected ? "scale-110 shadow-md animate-bloom-bounce" : "",
                    isToday ? "ring-2 ring-hotpink/60 ring-offset-1 shadow-[0_0_10px_2px_rgba(236,72,153,0.35)]" : "",
                  ].join(" ")}
                >
                  {d.getDate()}
                </button>
              );
            })}
          </div>

          {/* Legend — only what matters */}
          <div className="mt-3 flex items-center justify-center gap-3 text-[9px] font-bold text-rose/80 sm:mt-4 sm:gap-4 sm:text-[10px]">
            <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-gradient-to-br from-[#FFC2D6] to-[#FF9EBB] sm:h-3 sm:w-3" /> Period</span>
            <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-gradient-to-br from-violet-100 to-fuchsia-100 ring-2 ring-violet-200 sm:h-3 sm:w-3" /> Ovulation</span>
            <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full ring-2 ring-hotpink/60 shadow-[0_0_6px_1px_rgba(236,72,153,0.4)] sm:h-3 sm:w-3" /> Today</span>
          </div>
        </div>
      </div>

      {/* ============= Your Cycle Journey ============= */}
      <div className="bloom-pearl-card animate-scale-in relative mt-5 overflow-hidden rounded-[2rem] p-4 sm:p-6" style={{ animationDelay: "100ms" }}>
        <div className="pointer-events-none absolute inset-0 -z-0 animate-bloom-pulse rounded-[2rem] bg-[radial-gradient(60%_60%_at_50%_45%,oklch(0.75_0.22_350/0.35)_0%,transparent_70%)]" aria-hidden />
        <h3 className="relative z-10 mb-5 font-script text-xl text-hotpink sm:text-2xl">Your Cycle Journey</h3>
        <div className="relative z-10 px-1 pt-5 sm:px-2">
          {/* connecting line */}
          <div className="absolute left-3 right-3 top-[calc(1.25rem+1rem)] h-1 rounded-full bg-petal sm:left-5 sm:right-5" />
          {/* floating "Day X" pill */}
          <div
            className="absolute top-0 flex -translate-x-1/2 flex-col items-center"
            style={{ left: `${journeyPercent}%` }}
          >
            <span className="animate-bloom-bounce whitespace-nowrap rounded-full bg-hotpink px-2.5 py-0.5 text-[10px] font-bold text-white shadow-md shadow-hotpink/30">
              Day {cycleDay}
            </span>
            <span className="mt-0.5 h-1.5 w-0.5 rounded-full bg-hotpink/50" />
          </div>

          <div className="relative flex justify-between">
            {journeySteps.map((step) => {
              const Icon = PHASE_META[step.key].Icon;
              return (
                <div key={step.key} className="flex flex-1 flex-col items-center gap-1 text-center">
                  <span
                    className={[
                      "grid h-8 w-8 shrink-0 place-items-center rounded-full ring-[3px] transition-all duration-300 sm:h-10 sm:w-10",
                      step.active
                        ? "animate-bloom-pulse bg-hotpink text-white ring-hotpink/30"
                        : "bg-white text-rose ring-petal/60",
                    ].join(" ")}
                  >
                    <Icon className="animate-icon-wiggle h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  </span>
                  <span className={`text-[8px] font-bold tracking-wider sm:text-[10px] ${step.active ? "text-hotpink" : "text-rose/70"}`}>
                    {step.label}
                  </span>
                  <span className="hidden text-[8px] text-rose/50 sm:block sm:text-[9px]">{step.range}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ============= 15-Minute Flow + Pills & Contraceptive + Space Stats ============= */}
      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-5">
        {/* 15-Minute Flow */}
        <div className="bloom-pearl-card animate-scale-in col-span-2 flex flex-col items-center gap-2 rounded-2xl p-3 text-center sm:col-span-1 sm:gap-4 sm:rounded-[2rem] sm:p-6" style={{ animationDelay: "140ms" }}>
          <span
            className="animate-icon-wiggle grid h-10 w-10 shrink-0 place-items-center rounded-full text-white shadow-md sm:h-20 sm:w-20 lg:h-24 lg:w-24"
            style={{ background: "radial-gradient(circle at 30% 25%, oklch(0.82 0.22 350 / 0.95), oklch(0.7 0.26 350) 45%, oklch(0.58 0.28 0) 90%)" }}
          >
            <Flower2 className="h-5 w-5 sm:h-10 sm:w-10 lg:h-12 lg:w-12" />
          </span>
          <div>
            <p className="font-script text-sm leading-tight text-hotpink sm:text-2xl lg:text-3xl">{flow.title}</p>
            <p className="mt-0.5 hidden text-xs font-medium text-magenta/70 sm:block sm:text-sm">{flow.blurb}</p>
          </div>
          <a
            href="/app/tools/yoga"
            className="bloom-luxury-btn hover-scale animate-cta-bounce inline-flex w-full max-w-xs items-center justify-center gap-1.5 px-2 py-1.5 text-[11px] font-bold text-white sm:px-5 sm:py-2.5 sm:text-sm"
          >
            Start Now
          </a>
        </div>

        {/* Daily pill / contraceptive */}
        <div className="bloom-pearl-card animate-scale-in rounded-2xl p-3 sm:rounded-[2rem] sm:p-6" style={{ animationDelay: "220ms" }}>
          <div className="flex items-center gap-2 sm:gap-3">
            <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-full transition-all duration-300 sm:h-11 sm:w-11 ${pillTaken ? "bg-hotpink text-white scale-100" : "bg-blush text-hotpink"}`}>
              <Pill className="h-4 w-4 sm:h-5 sm:w-5" />
            </span>
            <div>
              <p className="font-script text-base leading-none text-hotpink sm:text-2xl">Daily {pillLabel}</p>
              <p className="mt-0.5 hidden text-xs text-rose sm:block">
                {settings.contraceptiveReminder ? `Reminder · ${settings.reminderHour}` : "Reminder off"}
              </p>
            </div>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-1.5 sm:mt-4 sm:justify-between sm:gap-0">
            <span
              key={String(pillTaken)}
              className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-semibold transition-all sm:gap-1.5 sm:px-3 sm:py-1 sm:text-xs ${
                pillTaken ? "bg-green-100 text-green-600 animate-scale-in" : "bg-blush text-rose"
              }`}
            >
              <Heart className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
              {pillTaken ? "Taken today" : "Not taken yet"}
            </span>
            <button
              onClick={() => setPillTaken((v) => !v)}
              className="hover-scale inline-flex items-center gap-1 rounded-full bg-blush px-2 py-0.5 text-[9px] font-semibold text-hotpink transition hover:bg-petal sm:px-3 sm:py-1.5 sm:text-xs"
            >
              <Undo2 className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
              {pillTaken ? "Undo" : "Mark Taken"}
            </button>
          </div>
        </div>

        {/* Space Stats */}
        <div className="bloom-pearl-card animate-scale-in rounded-2xl p-3 sm:rounded-[2rem] sm:p-6" style={{ animationDelay: "260ms" }}>
          <p className="mb-2 font-script text-base text-hotpink sm:mb-3 sm:text-2xl">Space Stats ✿</p>
          <div className="grid grid-cols-2 gap-1.5 sm:gap-3">
            <div className="flex items-center gap-1.5 rounded-xl bg-blush/60 p-1.5 sm:gap-2.5 sm:rounded-2xl sm:p-3">
              <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-hotpink/10 text-hotpink sm:h-9 sm:w-9">
                <CalendarDays className="h-3 w-3 sm:h-4 sm:w-4" />
              </span>
              <div>
                <p className="hidden text-[10px] font-bold tracking-wider text-rose sm:block">CYCLE DAY</p>
                <p className="font-script text-xs leading-none text-hotpink sm:text-xl">{cycleDay}/{settings.cycleLength}</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 rounded-xl bg-blush/60 p-1.5 sm:gap-2.5 sm:rounded-2xl sm:p-3">
              <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-hotpink/10 text-hotpink animate-bloom-pulse sm:h-9 sm:w-9">
                <Droplet className="h-3 w-3 fill-hotpink/30 sm:h-4 sm:w-4" />
              </span>
              <div>
                <p className="hidden text-[10px] font-bold tracking-wider text-rose sm:block">NEXT PERIOD</p>
                <p className="font-script text-xs leading-none text-hotpink sm:text-xl">{daysToPeriod}d</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 rounded-xl bg-blush/60 p-1.5 sm:gap-2.5 sm:rounded-2xl sm:p-3">
              <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-magenta/10 text-magenta sm:h-9 sm:w-9">
                <Flower2 className="h-3 w-3 sm:h-4 sm:w-4" />
              </span>
              <div>
                <p className="hidden text-[10px] font-bold tracking-wider text-rose sm:block">PHASE</p>
                <p className="font-script text-xs leading-none text-hotpink sm:text-xl">{PHASE_LABEL[currentPhase]}</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 rounded-xl bg-blush/60 p-1.5 sm:gap-2.5 sm:rounded-2xl sm:p-3">
              <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-hotpink/10 text-hotpink sm:h-9 sm:w-9">
                <MoodIconToday className="h-3 w-3 sm:h-4 sm:w-4" />
              </span>
              <div>
                <p className="hidden text-[10px] font-bold tracking-wider text-rose sm:block">MOOD</p>
                <p className="font-script text-xs leading-none text-hotpink sm:text-xl">{moodLabelToday}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ============= Mood — compact, wraps to two lines ============= */}
      <div className="bloom-pearl-card animate-scale-in mt-5 rounded-2xl p-3 sm:rounded-[2rem] sm:p-5" style={{ animationDelay: "300ms" }}>
        <div className="mb-2 flex items-center justify-between gap-2">
          {!hasPickedMood && <p className="font-script text-lg text-hotpink sm:text-2xl">How's your mood today?</p>}
          <p className="hidden text-[9px] font-bold tracking-widest text-rose/60 sm:block">
            {today.toLocaleDateString("en", { weekday: "long", month: "long", day: "numeric" }).toUpperCase()}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
          {MOODS.map((m) => {
            const active = mood === m.key;
            const MoodIcon = m.Icon;
            return (
              <button
                key={m.key}
                onClick={() => { setMood(m.key); setHasPickedMood(true); }}
                className={[
                  "inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1.5 text-[11px] font-semibold transition-all duration-200 active:scale-95 sm:px-3.5 sm:text-xs",
                  active ? "bg-hotpink text-white animate-bloom-bounce" : "bg-blush/60 text-rose hover:bg-petal/70",
                ].join(" ")}
              >
                <MoodIcon className="h-3.5 w-3.5" />
                {m.label}
              </button>
            );
          })}
        </div>
      </div>

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

      {/* For You */}
      <div className="mt-8">
        <h3 className="font-script text-4xl text-hotpink mb-3">For You ✿</h3>
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
          {[
            { tag: "YOGA", t: recommend.yoga.title, img: recommend.yoga.img, href: "/app/tools/yoga" },
            { tag: "WORKOUT", t: recommend.workout.title, img: recommend.workout.img, href: "/app/tools/workout" },
            { tag: "MEALS", t: recommend.meal.title, img: recommend.meal.img, href: "/app/tools/meals" },
          ].map((p, i) => (
            <a
              key={p.t}
              href={p.href}
              className="pearl-frame animate-fade-in group relative flex aspect-[4/5] flex-col justify-end overflow-hidden rounded-2xl shadow-lg shadow-rose/10 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-hotpink/20 sm:aspect-square lg:aspect-[4/5]"
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
              <div className="absolute inset-0 -z-10 bg-gradient-to-t from-black/65 via-black/15 to-transparent" />
              <div className="relative z-10 p-2.5 sm:p-4">
                <span className="inline-flex items-center gap-1 rounded-full bg-white/90 px-2 py-0.5 text-[8px] font-bold tracking-wider text-hotpink sm:text-[10px]">
                  <Sparkles className="h-2.5 w-2.5" /> {p.tag}
                </span>
                <p className="mt-1 font-script text-sm leading-tight text-white sm:mt-1.5 sm:text-xl">{p.t}</p>
              </div>
            </a>
          ))}
        </div>
      </div>

      <PeriodSetup
        open={setupOpen}
        onClose={() => setSetupOpen(false)}
        initial={settings}
        onSave={(s) => { setSettings(s); writeCycleSettings(s); }}
      />
    </div>
  );
}
