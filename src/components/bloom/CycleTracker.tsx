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
  Dumbbell,
  BookOpen,
  CheckCircle2,
  Circle,
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

function bloomMessage(percent: number) {
  if (percent >= 90) return "You're fully blooming";
  if (percent >= 60) return "You're blooming";
  if (percent >= 30) return "Budding nicely";
  return "Just getting started";
}

export function CycleTracker() {
  const today = new Date(2026, 5, 4); // demo "today"
  const [settings, setSettings] = useState<CycleSettings>(() => readCycleSettings());
  const [setupOpen, setSetupOpen] = useState(false);

  // Broadcast the current phase on mount so other tools (Today, Calendar, Yoga,
  // Meals, Workout, Diet...) stay in sync even before the user re-saves settings.
  useEffect(() => {
    broadcastCyclePhase();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [cursor, setCursor] = useState(new Date(2026, 5, 1));
  const [selected, setSelected] = useState<Date>(today);
  const [pillTaken, setPillTaken] = useState(true);
  const [mood, setMood] = useState<string>("happy");
  const [slideDir, setSlideDir] = useState<"l" | "r">("r");
  const [checklist, setChecklist] = useState({ workout: true, water: true, journal: false });

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

  // Today's tiny "bloom checklist" — toggling these gently animates the progress ring.
  const checklistItems = [
    { key: "workout" as const, label: "Workout completed", Icon: Dumbbell, checked: checklist.workout },
    { key: "water" as const, label: "Water goal met", Icon: Droplet, checked: checklist.water },
    { key: "journal" as const, label: "Journal entry written", Icon: BookOpen, checked: checklist.journal },
    { key: "pill" as const, label: `${pillLabel} taken`, Icon: Pill, checked: pillTaken },
  ];
  const doneCount = checklistItems.filter((i) => i.checked).length;
  const percent = Math.round((doneCount / checklistItems.length) * 100);
  function toggleChecklist(key: "workout" | "water" | "journal" | "pill") {
    if (key === "pill") setPillTaken((v) => !v);
    else setChecklist((c) => ({ ...c, [key]: !c[key] }));
  }

  const MoodIconToday = MOODS.find((m) => m.key === mood)?.Icon ?? Smile;
  const moodLabelToday = MOODS.find((m) => m.key === mood)?.label ?? "Happy";
  const flow = PHASE_FLOW[currentPhase];

  return (
    <div className="relative">
      {/* dreamy kawaii 3D pink gradient background */}
      <KawaiiBackground count={16} />
      <BloomBubbles count={18} />

      {/* ============= Header ============= */}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-script text-5xl text-hotpink">Cycle 🌸</h2>
        <button
          onClick={() => setSetupOpen(true)}
          className="bloom-luxury-btn hover-scale group relative inline-flex items-center gap-1.5 px-5 py-2.5 text-sm font-bold text-white"
        >
          <Sparkles className="h-4 w-4 animate-bloom-sparkle" />
          <Plus className="h-4 w-4" />
          <span>Log &amp; Settings</span>
        </button>
      </div>

      {/* ============= Hero row: Today's Insight + Bloom progress ============= */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        {/* Today's Insight */}
        <div className="pearl-frame animate-scale-in relative flex min-h-[16rem] flex-1 flex-col justify-end overflow-hidden rounded-[2rem] lg:col-span-2 lg:min-h-[20rem]">
          <img
            src="/images/cycle-insight-hero.webp"
            alt=""
            aria-hidden
            loading="lazy"
            decoding="async"
            className="absolute inset-0 -z-10 h-full w-full animate-photo-breathe object-cover"
          />
          <div className="absolute inset-0 -z-10 bg-gradient-to-t from-white/95 via-white/65 to-transparent sm:bg-gradient-to-r sm:from-white/95 sm:via-white/70 sm:to-white/10" />
          <div className="relative z-10 p-5 sm:max-w-md sm:p-8">
            <p className="inline-flex items-center gap-1.5 text-[10px] font-bold tracking-widest text-rose">
              <Sparkles className="h-3 w-3 animate-bloom-sparkle text-hotpink" /> TODAY'S INSIGHT
            </p>
            <h3 className="mt-1 font-script text-3xl text-hotpink sm:text-4xl lg:text-5xl">
              Day {cycleDay} · {PHASE_LABEL[currentPhase]} Phase
            </h3>
            <p className="mt-2 text-sm font-medium text-magenta/80 sm:text-base">
              {PHASE_INSIGHT[currentPhase]}
            </p>
          </div>
        </div>

        {/* Bloom progress + checklist */}
        <div className="pearl-frame bloom-pearl-card animate-scale-in flex flex-col items-center gap-4 rounded-[2rem] p-5 sm:p-6" style={{ animationDelay: "60ms" }}>
          <div
            className="animate-bloom-pulse relative grid h-28 w-28 shrink-0 place-items-center rounded-full shadow-md sm:h-32 sm:w-32"
            style={{ background: `conic-gradient(var(--hotpink) 0% ${percent}%, var(--petal) ${percent}% 100%)` }}
          >
            <div className="grid h-[5.25rem] w-[5.25rem] place-items-center rounded-full bg-white/95 text-center shadow-inner sm:h-[6rem] sm:w-[6rem]">
              <span className="font-script text-3xl text-hotpink sm:text-4xl">{percent}%</span>
            </div>
          </div>
          <p className="text-center font-script text-2xl text-hotpink">{bloomMessage(percent)}</p>

          <div className="mt-1 flex w-full flex-col gap-2">
            {checklistItems.map((item) => (
              <button
                key={item.key}
                onClick={() => toggleChecklist(item.key)}
                className={[
                  "flex w-full items-center gap-2.5 rounded-2xl px-3 py-2 text-left text-xs font-semibold transition-all duration-200 active:scale-95",
                  item.checked ? "bg-hotpink/10 text-hotpink" : "bg-blush/60 text-rose hover:bg-petal/60",
                ].join(" ")}
              >
                {item.checked ? (
                  <CheckCircle2 className="animate-scale-in h-4 w-4 shrink-0 text-hotpink" />
                ) : (
                  <Circle className="h-4 w-4 shrink-0 text-rose/40" />
                )}
                <item.Icon className="h-3.5 w-3.5 shrink-0 opacity-70" />
                <span className="flex-1">{item.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ============= Your Cycle Journey ============= */}
      <div className="bloom-pearl-card animate-scale-in mt-5 rounded-[2rem] p-5 sm:p-7" style={{ animationDelay: "100ms" }}>
        <h3 className="mb-8 font-script text-3xl text-hotpink sm:text-4xl">Your Cycle Journey</h3>
        <div className="relative px-2 pt-7">
          {/* connecting line */}
          <div className="absolute left-4 right-4 top-[calc(1.75rem+1.25rem)] h-1 rounded-full bg-petal sm:left-6 sm:right-6" />
          {/* floating "Day X" pill */}
          <div
            className="absolute top-0 flex -translate-x-1/2 flex-col items-center"
            style={{ left: `${journeyPercent}%` }}
          >
            <span className="animate-bloom-bounce whitespace-nowrap rounded-full bg-hotpink px-3 py-1 text-[11px] font-bold text-white shadow-md shadow-hotpink/30">
              Day {cycleDay}
            </span>
            <span className="mt-0.5 h-2 w-0.5 rounded-full bg-hotpink/50" />
          </div>

          <div className="relative flex justify-between">
            {journeySteps.map((step) => {
              const Icon = PHASE_META[step.key].Icon;
              return (
                <div key={step.key} className="flex flex-1 flex-col items-center gap-1.5 text-center">
                  <span
                    className={[
                      "grid h-10 w-10 shrink-0 place-items-center rounded-full ring-4 transition-all duration-300 sm:h-12 sm:w-12",
                      step.active
                        ? "animate-bloom-pulse bg-hotpink text-white ring-hotpink/30"
                        : "bg-white text-rose ring-petal/60",
                    ].join(" ")}
                  >
                    <Icon className="animate-icon-wiggle h-4 w-4 sm:h-5 sm:w-5" />
                  </span>
                  <span className={`text-[9px] font-bold tracking-wider sm:text-[10px] ${step.active ? "text-hotpink" : "text-rose/70"}`}>
                    {step.label}
                  </span>
                  <span className="text-[8px] text-rose/50 sm:text-[9px]">{step.range}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ============= Flow card + Calendar ============= */}
      <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-3">
        {/* 15-Minute Flow */}
        <div className="bloom-pearl-card animate-scale-in flex flex-col items-center gap-4 rounded-[2rem] p-5 text-center sm:p-6 lg:col-span-1" style={{ animationDelay: "140ms" }}>
          <span
            className="animate-icon-wiggle grid h-20 w-20 shrink-0 place-items-center rounded-full text-white shadow-md sm:h-24 sm:w-24"
            style={{ background: "radial-gradient(circle at 30% 25%, oklch(0.82 0.22 350 / 0.95), oklch(0.7 0.26 350) 45%, oklch(0.58 0.28 0) 90%)" }}
          >
            <Flower2 className="h-10 w-10 sm:h-12 sm:w-12" />
          </span>
          <div>
            <p className="font-script text-2xl text-hotpink sm:text-3xl">{flow.title}</p>
            <p className="mt-1 text-xs font-medium text-magenta/70 sm:text-sm">{flow.blurb}</p>
          </div>
          <a
            href="/app/tools/yoga"
            className="bloom-luxury-btn hover-scale animate-cta-bounce inline-flex w-full max-w-xs items-center justify-center gap-1.5 px-5 py-2.5 text-sm font-bold text-white"
          >
            Start Now
          </a>
        </div>

        {/* Calendar card — same glassy pearl effect as "Everything blooms in one place" */}
        <div className="pearl-frame bloom-pearl-card animate-scale-in relative overflow-hidden rounded-[2rem] p-5 sm:p-7 lg:col-span-2" style={{ animationDelay: "180ms" }}>
          {/* Month nav */}
          <div className="mb-4 flex items-center justify-center gap-4">
            <button onClick={() => shift(-1)} className="hover-scale grid h-9 w-9 place-items-center rounded-full bg-blush text-hotpink transition hover:bg-petal">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <div className="min-w-[140px] text-center font-script text-3xl text-hotpink">
              {MONTHS[cursor.getMonth()]} {cursor.getFullYear()}
            </div>
            <button onClick={() => shift(1)} className="hover-scale grid h-9 w-9 place-items-center rounded-full bg-blush text-hotpink transition hover:bg-petal">
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          {/* Weekday header */}
          <div className="mb-2 grid grid-cols-7 text-center text-[11px] font-bold tracking-widest text-rose/70">
            {WEEKDAYS.map((d) => <div key={d}>{d}</div>)}
          </div>

          {/* Calendar grid (animated slide on month change via key) */}
          <div
            key={`${cursor.getFullYear()}-${cursor.getMonth()}-${slideDir}`}
            className="grid grid-cols-7 gap-1.5 sm:gap-2 animate-fade-in"
          >
            {days.map((d, i) => {
              if (!d) return <div key={i} />;
              const phase = phaseForDay(d, settings);
              const isFuture = d.getTime() > today.getTime();
              const isSelected = sameDay(d, selected);
              const isToday = sameDay(d, today);
              const emphasizeFertile = settings.trackerMode === "conception" && (phase === "fertile" || phase === "ovulation");
              const meta = phase ? PHASE_META[phase] : null;
              const Icon = meta?.Icon;
              const isPeak = phase === "ovulation";

              return (
                <button
                  key={i}
                  onClick={() => setSelected(d)}
                  className={[
                    "relative aspect-square rounded-2xl flex flex-col items-center justify-center text-xs font-semibold transition-all duration-200",
                    "hover:scale-110 active:scale-95",
                    isSelected ? "scale-110 ring-2 ring-hotpink shadow-md animate-bloom-bounce" : "",
                    isFuture && phase === "period"
                      ? "border-2 border-dashed border-hotpink/70 bg-pink-50 text-hotpink"
                      : isFuture
                        ? "border border-dashed border-rose/40 text-rose bg-white/60"
                        : meta?.color ?? "bg-white text-rose",
                    isPeak ? "animate-bloom-peak" : "",
                    emphasizeFertile ? "ring-2 ring-magenta/60" : "",
                    isToday ? "shadow-[0_0_0_2px_oklch(1_0_0/0.9),0_2px_8px_-1px_oklch(0.62_0.24_0/0.45)]" : "",
                  ].join(" ")}
                >
                  <span className="leading-none">{d.getDate()}</span>
                  {Icon && <Icon className={`h-3 w-3 mt-0.5 ${isFuture ? "opacity-50" : "opacity-95"}`} />}
                  {isPeak && (
                    <span className="absolute -top-2 inline-flex items-center gap-0.5 rounded-full bg-magenta px-1.5 py-0.5 text-[8px] font-bold text-white shadow">
                      <Sparkles className="h-2 w-2" /> PEAK
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Legend */}
          <div className="mt-5 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-[10px] font-bold tracking-wider text-rose/80">
            {(Object.entries(PHASE_META) as [Exclude<Phase, null>, typeof PHASE_META[Exclude<Phase, null>]][]).map(([k, v]) => (
              <span key={k} className="inline-flex items-center gap-1.5">
                <span className={`h-3 w-3 rounded-full ${v.color}`} />
                {v.label}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* ============= Pills & Contraceptive + Space Stats ============= */}
      <div className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-2">
        {/* Daily pill / contraceptive */}
        <div className="bloom-pearl-card animate-scale-in rounded-[2rem] p-5 sm:p-6" style={{ animationDelay: "220ms" }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className={`grid h-11 w-11 place-items-center rounded-full transition-all duration-300 ${pillTaken ? "bg-hotpink text-white scale-100" : "bg-blush text-hotpink"}`}>
                <Pill className="h-5 w-5" />
              </span>
              <div>
                <p className="font-script text-2xl text-hotpink leading-none">Daily {pillLabel}</p>
                <p className="text-xs text-rose mt-0.5">
                  {settings.contraceptiveReminder ? `Reminder · ${settings.reminderHour}` : "Reminder off"}
                </p>
              </div>
            </div>
          </div>
          <div className="mt-4 flex items-center justify-between">
            <span
              key={String(pillTaken)}
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold transition-all ${
                pillTaken ? "bg-green-100 text-green-600 animate-scale-in" : "bg-blush text-rose"
              }`}
            >
              <Heart className="h-3 w-3" />
              {pillTaken ? "Taken today" : "Not taken yet"}
            </span>
            <button
              onClick={() => setPillTaken((v) => !v)}
              className="hover-scale inline-flex items-center gap-1 rounded-full bg-blush px-3 py-1.5 text-xs font-semibold text-hotpink transition hover:bg-petal"
            >
              <Undo2 className="h-3 w-3" />
              {pillTaken ? "Undo Take" : "Mark Taken"}
            </button>
          </div>
        </div>

        {/* Space Stats */}
        <div className="bloom-pearl-card animate-scale-in rounded-[2rem] p-5 sm:p-6" style={{ animationDelay: "260ms" }}>
          <p className="mb-3 font-script text-2xl text-hotpink">Space Stats ✿</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex items-center gap-2.5 rounded-2xl bg-blush/60 p-3">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-hotpink/10 text-hotpink">
                <CalendarDays className="h-4 w-4" />
              </span>
              <div>
                <p className="text-[10px] font-bold tracking-wider text-rose">CYCLE DAY</p>
                <p className="font-script text-xl text-hotpink leading-none">{cycleDay} / {settings.cycleLength}</p>
              </div>
            </div>
            <div className="flex items-center gap-2.5 rounded-2xl bg-blush/60 p-3">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-hotpink/10 text-hotpink animate-bloom-pulse">
                <Droplet className="h-4 w-4 fill-hotpink/30" />
              </span>
              <div>
                <p className="text-[10px] font-bold tracking-wider text-rose">NEXT PERIOD</p>
                <p className="font-script text-xl text-hotpink leading-none">{daysToPeriod}d</p>
              </div>
            </div>
            <div className="flex items-center gap-2.5 rounded-2xl bg-blush/60 p-3">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-magenta/10 text-magenta">
                <Flower2 className="h-4 w-4" />
              </span>
              <div>
                <p className="text-[10px] font-bold tracking-wider text-rose">PHASE</p>
                <p className="font-script text-xl text-hotpink leading-none">{PHASE_LABEL[currentPhase]}</p>
              </div>
            </div>
            <div className="flex items-center gap-2.5 rounded-2xl bg-blush/60 p-3">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-hotpink/10 text-hotpink">
                <MoodIconToday className="h-4 w-4" />
              </span>
              <div>
                <p className="text-[10px] font-bold tracking-wider text-rose">MOOD</p>
                <p className="font-script text-xl text-hotpink leading-none">{moodLabelToday}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ============= Mood ============= */}
      <div className="bloom-pearl-card animate-scale-in mt-5 rounded-[2rem] p-5 sm:p-7" style={{ animationDelay: "300ms" }}>
        <p className="text-[10px] font-bold tracking-widest text-rose">
          {today.toLocaleDateString("en", { weekday: "long", month: "long", day: "numeric" }).toUpperCase()}
        </p>
        <p className="font-script text-3xl text-hotpink mt-1">how is your mood today?</p>
        <div className="mt-3 grid grid-cols-4 gap-2 sm:grid-cols-8">
          {MOODS.map((m) => {
            const active = mood === m.key;
            const MoodIcon = m.Icon;
            return (
              <button
                key={m.key}
                onClick={() => setMood(m.key)}
                className={[
                  "group flex flex-col items-center gap-1 rounded-2xl p-2 transition-all duration-200 active:scale-95",
                  active ? "bg-hotpink/10 ring-2 ring-hotpink animate-bloom-bounce" : "bg-blush/60 hover:bg-petal/70 hover:scale-105",
                ].join(" ")}
              >
                <span
                  className={[
                    "grid h-9 w-9 place-items-center rounded-full transition-transform",
                    active ? "bg-hotpink text-white scale-110" : "bg-white text-hotpink ring-1 ring-petal group-hover:scale-110",
                  ].join(" ")}
                >
                  <MoodIcon className="h-4 w-4" />
                </span>
                <span className={`text-[10px] font-semibold ${active ? "text-hotpink" : "text-rose"}`}>{m.label}</span>
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
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[
            { t: "Soft yoga for cramps", d: "10-min gentle flow to ease your body.", Icon: Flower2 },
            { t: "Iron-rich snacks",     d: "Cute recipes for your period week.",   Icon: Leaf },
            { t: "Why you feel extra today", d: "A gentle hormone explainer.",      Icon: Sparkles },
          ].map((p, i) => (
            <div
              key={p.t}
              className="rounded-[1.75rem] bg-white/85 p-5 shadow-xl shadow-rose/10 backdrop-blur transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl hover:shadow-hotpink/20 animate-fade-in"
              style={{ animationDelay: `${i * 80}ms` }}
            >
              <div className="mb-3 flex items-center gap-2">
                <span className="grid h-10 w-10 place-items-center rounded-2xl bg-hotpink/10 text-hotpink">
                  <p.Icon className="h-5 w-5" />
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-blush px-2.5 py-0.5 text-[10px] font-bold tracking-wider text-hotpink">
                  <Sparkles className="h-3 w-3" /> FOR YOU
                </span>
              </div>
              <p className="font-script text-2xl text-hotpink">{p.t}</p>
              <p className="text-sm text-rose mt-1">{p.d}</p>
            </div>
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
