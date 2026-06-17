import { useEffect, useMemo, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Droplet,
  Droplets,
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
  Sun,
  Dumbbell,
  Settings,
  type LucideIcon,
} from "lucide-react";
import { PeriodSetup, type CycleSettings } from "./PeriodSetup";
import { BloomBubbles } from "./BloomBubbles";
import { KawaiiBackground } from "./KawaiiBackground";
import { AnimatedWords } from "./AnimatedWords";
import {
  type CyclePhase,
  phaseForDay,
  PHASE_LABEL,
  DEFAULT_CYCLE_SETTINGS,
  readCycleSettings,
  writeCycleSettings,
  broadcastCyclePhase,
} from "./cyclePhase";

/** @deprecated use DEFAULT_CYCLE_SETTINGS / readCycleSettings from "./cyclePhase" — kept for existing imports */
export const DEFAULT_SETTINGS: CycleSettings = DEFAULT_CYCLE_SETTINGS;

/** @deprecated use CyclePhase from "./cyclePhase" — kept for existing imports */
export type Phase = Exclude<CyclePhase, "any"> | null;

export { phaseForDay };

export const PHASE_META: Record<Exclude<Phase, null>, { label: string; color: string; ring: string; Icon: LucideIcon }> = {
  period:     { label: "PERIOD",     color: "bg-hotpink text-white",           ring: "ring-hotpink/40",  Icon: Droplet },
  follicular: { label: "FOLLICULAR", color: "bg-amber-100 text-amber-700",     ring: "ring-amber-200",   Icon: Sprout },
  fertile:    { label: "FERTILE",    color: "bg-pink-100 text-hotpink",        ring: "ring-pink-200",    Icon: Flower2 },
  ovulation:  { label: "OVULATION",  color: "bg-rose-200 text-magenta",        ring: "ring-rose-400",    Icon: Star },
  luteal:     { label: "LUTEAL",     color: "bg-violet-100 text-violet-500",   ring: "ring-violet-200",  Icon: Moon },
};

const PHASE_INSIGHT: Record<Exclude<Phase, null>, string> = {
  period:     "Your body is resting and renewing. Be extra gentle with yourself — cosy comfort and light movement help today.",
  follicular: "Your energy is naturally rising. A great day to focus on growth and new opportunities.",
  fertile:    "You're glowing with energy — a lovely day for connection, creativity and confidence.",
  ovulation:  "You're at your peak. Channel this radiant energy into your boldest ideas today.",
  luteal:     "Energy is winding down. Prioritise rest, warm food and gentle self-care.",
};

const PHASE_SUBTITLE: Record<Exclude<Phase, null>, string> = {
  period:     "Take it easy, your body is doing amazing things.",
  follicular: "Energy rising — bloom into your day with intention.",
  fertile:    "You're glowing! Embrace your magnetic energy today.",
  ovulation:  "Your peak day — own it with confidence and joy.",
  luteal:     "Wind down gently — rest is your superpower right now.",
};

const PHASE_TODAY_INSIGHTS: Record<Exclude<Phase, null>, { label: string; value: string; Icon: LucideIcon; color: string; bg: string }[]> = {
  period: [
    { label: "Energy",    value: "Low",            Icon: Zap,      color: "text-rose-400",    bg: "bg-rose-50"    },
    { label: "Hydration", value: "Stay Focused",   Icon: Droplets, color: "text-sky-400",     bg: "bg-sky-50"     },
    { label: "Movement",  value: "Gentle Yoga",    Icon: Leaf,     color: "text-green-500",   bg: "bg-green-50"   },
    { label: "Nutrition", value: "Iron-rich foods",Icon: Sprout,   color: "text-amber-500",   bg: "bg-amber-50"   },
  ],
  follicular: [
    { label: "Energy",    value: "Rising",         Icon: Zap,      color: "text-amber-500",   bg: "bg-amber-50"   },
    { label: "Hydration", value: "Stay Active",    Icon: Droplets, color: "text-sky-400",     bg: "bg-sky-50"     },
    { label: "Movement",  value: "Strength",       Icon: Dumbbell, color: "text-orange-500",  bg: "bg-orange-50"  },
    { label: "Nutrition", value: "Protein-rich",   Icon: Sprout,   color: "text-green-500",   bg: "bg-green-50"   },
  ],
  fertile: [
    { label: "Energy",    value: "High",           Icon: Zap,      color: "text-pink-500",    bg: "bg-pink-50"    },
    { label: "Hydration", value: "Active day",     Icon: Droplets, color: "text-sky-400",     bg: "bg-sky-50"     },
    { label: "Movement",  value: "Power Flow",     Icon: Flame,    color: "text-rose-500",    bg: "bg-rose-50"    },
    { label: "Nutrition", value: "Fresh & Light",  Icon: Leaf,     color: "text-green-500",   bg: "bg-green-50"   },
  ],
  ovulation: [
    { label: "Energy",    value: "Peak",           Icon: Zap,      color: "text-violet-500",  bg: "bg-violet-50"  },
    { label: "Hydration", value: "Intense",        Icon: Droplets, color: "text-sky-400",     bg: "bg-sky-50"     },
    { label: "Movement",  value: "HIIT",           Icon: Flame,    color: "text-red-500",     bg: "bg-red-50"     },
    { label: "Nutrition", value: "Energizing",     Icon: Sprout,   color: "text-fuchsia-500", bg: "bg-fuchsia-50" },
  ],
  luteal: [
    { label: "Energy",    value: "Winding",        Icon: Zap,      color: "text-violet-400",  bg: "bg-violet-50"  },
    { label: "Hydration", value: "Wind Down",      Icon: Droplets, color: "text-sky-400",     bg: "bg-sky-50"     },
    { label: "Movement",  value: "Gentle Tone",    Icon: Leaf,     color: "text-purple-500",  bg: "bg-purple-50"  },
    { label: "Nutrition", value: "Comforting",     Icon: Sprout,   color: "text-amber-500",   bg: "bg-amber-50"   },
  ],
};

const PHASE_AFFIRMATIONS: Record<Exclude<Phase, null>, string> = {
  period:     "Rest is productive. Your body thanks you for slowing down.",
  follicular: "New energy, new beginnings. Let yourself bloom into the day.",
  fertile:    "You are magnetic and beautiful exactly as you are.",
  ovulation:  "You are at your peak — let your radiant light shine today.",
  luteal:     "Honor your need for rest. Setting boundaries is self-love.",
};

const PHASE_RECOMMEND: Record<Exclude<Phase, null>, {
  yoga:    { title: string; img: string };
  workout: { title: string; img: string };
  meal:    { title: string; img: string };
  read:    { title: string; img: string };
  shop:    { title: string; img: string };
}> = {
  period:     { yoga: { title: "Soft yoga for cramps",       img: "/images/pose-childs-pose.webp"  }, workout: { title: "Light mobility & core",   img: "/images/zone-core.png"       }, meal: { title: "Iron-rich warm stew",    img: "/images/meal-stew.jpg"     }, read: { title: "Rest is productive",    img: "/images/read-cycle.png"    }, shop: { title: "Cozy Heat Wrap",     img: "/images/shop-cat-cycle.jpg"    } },
  follicular: { yoga: { title: "Energising morning flow",    img: "/images/pose-warrior-1.webp"    }, workout: { title: "Full-body strength",      img: "/images/zone-full-body.png"  }, meal: { title: "Protein buddha bowl",   img: "/images/meal-buddha.jpg"   }, read: { title: "Cycle syncing 101",  img: "/images/read-cycle.png"    }, shop: { title: "Soft Glow Leggings",  img: "/images/shop-cat-active.jpg"  } },
  fertile:    { yoga: { title: "Power & balance flow",       img: "/images/pose-tree.webp"          }, workout: { title: "Glutes & legs burn",      img: "/images/zone-glutes.png"     }, meal: { title: "Fresh cute lunchbox",  img: "/images/meal-lunchbox.jpg" }, read: { title: "Your magnetic era",  img: "/images/read-selfcare.png" }, shop: { title: "Pillow Lip Gloss",    img: "/images/shop-cat-beauty.jpg"  } },
  ovulation:  { yoga: { title: "Dynamic energy flow",        img: "/images/pose-warrior-2.webp"    }, workout: { title: "High-intensity session",  img: "/images/zone-arms.png"       }, meal: { title: "Cozy energising oats", img: "/images/meal-oats.jpg"    }, read: { title: "Glow & confidence", img: "/images/read-mindset.png"  }, shop: { title: "Rose Petal Serum",    img: "/images/shop-cat-beauty.jpg"  } },
  luteal:     { yoga: { title: "Calming wind-down flow",     img: "/images/pose-cat-cow.webp"      }, workout: { title: "Gentle toning",           img: "/images/zone-back.png"       }, meal: { title: "Comforting warm stew", img: "/images/meal-stew.jpg"    }, read: { title: "Luteal phase glow-up",img: "/images/read-cycle.png"   }, shop: { title: "Silk Sleep Mask",     img: "/images/shop-cat-selfcare.jpg"} },
};

const CALENDAR_DAY_STYLE: Record<Exclude<Phase, null>, { cell: string; Icon: LucideIcon; iconClass: string }> = {
  period:     { cell: "bg-[#FFDDE8]/75 text-rose-500",    Icon: Droplet,  iconClass: "text-rose-400/70"   },
  follicular: { cell: "bg-amber-50/70 text-amber-600",    Icon: Sprout,   iconClass: "text-amber-400/70"  },
  fertile:    { cell: "bg-pink-50/75 text-pink-500",      Icon: Flower2,  iconClass: "text-pink-400/70"   },
  ovulation:  { cell: "bg-violet-50/65 text-violet-500",  Icon: Sparkles, iconClass: "text-violet-400/70" },
  luteal:     { cell: "bg-purple-50/65 text-purple-500",  Icon: Moon,     iconClass: "text-purple-400/70" },
};

const MOODS = [
  { key: "calm",      label: "Calm",      Icon: Leaf      },
  { key: "happy",     label: "Happy",     Icon: Smile     },
  { key: "energetic", label: "Energetic", Icon: Zap       },
  { key: "sensitive", label: "Sensitive", Icon: HeartCrack},
  { key: "sad",       label: "Sad",       Icon: CloudRain },
  { key: "tired",     label: "Tired",     Icon: Moon      },
  { key: "cramps",    label: "Cramps",    Icon: Flame     },
  { key: "bloated",   label: "Bloated",   Icon: Cloud     },
] as const;

const SYMPTOM_OPTIONS = ["Cramps", "Bloating", "Tender Breasts", "Fatigue", "Headache", "Mood Swings", "Nausea", "Back Pain"];

const MOOD_LOG_KEY     = "bloom:mood-log-v2";
const SYMPTOMS_LOG_KEY = "bloom:symptoms-log-v2";

const MOOD_BG_COLOR: Record<string, string> = {
  calm:      "bg-sky-300",
  happy:     "bg-pink-300",
  energetic: "bg-amber-300",
  sensitive: "bg-fuchsia-200",
  sad:       "bg-blue-200",
  tired:     "bg-slate-300",
  cramps:    "bg-rose-400",
  bloated:   "bg-orange-300",
};

function dateKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

const WEEKDAYS = ["SU","MO","TU","WE","TH","FR","SA"];
const MONTHS   = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const MS_DAY   = 1000 * 60 * 60 * 24;

function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function readJSON<T>(key: string, fallback: T): T {
  try { const r = localStorage.getItem(key); return r ? (JSON.parse(r) as T) : fallback; }
  catch { return fallback; }
}

function fmtDate(d: Date) {
  return d.toLocaleDateString("en", { month: "short", day: "numeric" });
}

export function CycleTracker() {
  const today = new Date(2026, 5, 14);
  const [settings, setSettings] = useState<CycleSettings>(() => readCycleSettings());
  const [setupOpen, setSetupOpen] = useState(false);

  useEffect(() => { broadcastCyclePhase(); }, []);

  const [cursor,        setCursor]        = useState(new Date(2026, 5, 1));
  const [selected,      setSelected]      = useState<Date>(today);
  const [pillTaken,     setPillTaken]     = useState(true);
  const todayKey                          = dateKey(today);
  const [moodLog,             setMoodLog]           = useState<Record<string, string>>(() => readJSON(MOOD_LOG_KEY, {}));
  const [symptomsLog,         setSymptomsLog]       = useState<Record<string, string[]>>(() => readJSON(SYMPTOMS_LOG_KEY, {}));
  const [showMoodPickerCard,  setShowMoodPickerCard] = useState(false);
  const [slideDir,            setSlideDir]          = useState<"l"|"r">("r");

  // Derived today values
  const mood     = moodLog[todayKey] ?? "happy";
  const symptoms = symptomsLog[todayKey] ?? [];

  const days = useMemo(() => {
    const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
    const totalDays = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate();
    const cells: (Date | null)[] = [];
    for (let i = 0; i < first.getDay(); i++) cells.push(null);
    for (let d = 1; d <= totalDays; d++) cells.push(new Date(cursor.getFullYear(), cursor.getMonth(), d));
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  }, [cursor]);

  function shift(dir: -1 | 1) {
    setSlideDir(dir === 1 ? "r" : "l");
    setCursor((c) => new Date(c.getFullYear(), c.getMonth() + dir, 1));
  }

  const { cycleDay, ovulationDayOfCycle, currentPhase, currentCycleStart } = useMemo(() => {
    const diff = Math.floor((today.getTime() - settings.lastPeriodStart.getTime()) / MS_DAY);
    const cyclesPassed = Math.floor(diff / settings.cycleLength);
    const cd   = (diff % settings.cycleLength) + 1;
    const ovDay = settings.cycleLength - 14;
    return {
      cycleDay: cd,
      ovulationDayOfCycle: ovDay,
      currentPhase: phaseForDay(today, settings),
      currentCycleStart: new Date(settings.lastPeriodStart.getTime() + cyclesPassed * settings.cycleLength * MS_DAY),
    };
  }, [settings]);

  const nextPeriodDate = useMemo(() => {
    const diff = Math.floor((today.getTime() - settings.lastPeriodStart.getTime()) / MS_DAY);
    const cyclesPassed = Math.floor(diff / settings.cycleLength) + 1;
    return new Date(settings.lastPeriodStart.getTime() + cyclesPassed * settings.cycleLength * MS_DAY);
  }, [settings]);

  const daysToPeriod   = useMemo(() => Math.ceil((nextPeriodDate.getTime() - today.getTime()) / MS_DAY), [nextPeriodDate]);
  const ovulationDate  = useMemo(() => new Date(currentCycleStart.getTime() + (ovulationDayOfCycle - 1) * MS_DAY), [currentCycleStart, ovulationDayOfCycle]);
  const fertileStart   = useMemo(() => new Date(currentCycleStart.getTime() + (ovulationDayOfCycle - 5) * MS_DAY), [currentCycleStart, ovulationDayOfCycle]);
  const fertileEnd     = useMemo(() => new Date(currentCycleStart.getTime() + ovulationDayOfCycle        * MS_DAY), [currentCycleStart, ovulationDayOfCycle]);

  const isSelectedToday  = sameDay(selected, today);
  const selectedPhase    = useMemo(() => isSelectedToday ? currentPhase : phaseForDay(selected, settings), [selected, settings, isSelectedToday, currentPhase]);
  const selectedRecommend= PHASE_RECOMMEND[selectedPhase];

  const pillLabel     = settings.contraceptiveMethod.charAt(0).toUpperCase() + settings.contraceptiveMethod.slice(1);
  const MoodIconToday = MOODS.find((m) => m.key === mood)?.Icon ?? Smile;
  const moodLabelToday= MOODS.find((m) => m.key === mood)?.label ?? "Happy";

  // Phase timeline: 4 steps, with filled progress up to active step
  const journeySteps = [
    { key: "period"     as const, label: "Period",     Icon: Droplet,  active: cycleDay <= settings.periodLength },
    { key: "follicular" as const, label: "Follicular", Icon: Sprout,   active: cycleDay > settings.periodLength && cycleDay < ovulationDayOfCycle - 1 },
    { key: "ovulation"  as const, label: "Ovulation",  Icon: Sun,      active: cycleDay >= ovulationDayOfCycle - 1 && cycleDay <= ovulationDayOfCycle + 1 },
    { key: "luteal"     as const, label: "Luteal",     Icon: Moon,     active: cycleDay > ovulationDayOfCycle + 1 },
  ];
  const activeIdx    = journeySteps.findIndex((s) => s.active);
  const progressPct  = activeIdx >= 0 ? (activeIdx / (journeySteps.length - 1)) * 100 : 0;

  const toggleSymptom = (s: string) => {
    setSymptomsLog((prev) => {
      const current = prev[todayKey] ?? [];
      const updated = current.includes(s) ? current.filter((x) => x !== s) : [...current, s];
      const next = { ...prev, [todayKey]: updated };
      try { localStorage.setItem(SYMPTOMS_LOG_KEY, JSON.stringify(next)); } catch {}
      return next;
    });
  };

  const phaseTagColors: Record<Exclude<Phase, null>, string> = {
    period:     "bg-[#FFF0F6] text-hotpink border-pink-200",
    follicular: "bg-amber-50 text-amber-600 border-amber-200",
    fertile:    "bg-pink-50 text-pink-600 border-pink-200",
    ovulation:  "bg-violet-50 text-violet-600 border-violet-200",
    luteal:     "bg-purple-50 text-purple-600 border-purple-200",
  };

  return (
    <div className="relative animate-fade-in">
      <KawaiiBackground count={16} />
      <BloomBubbles count={18} />

      <div className="lg:grid lg:grid-cols-5 lg:items-start lg:gap-6">

        {/* ══════════════ LEFT COLUMN (60%) ══════════════ */}
        <div className="lg:col-span-3 space-y-2">

          {/* ── ULTRA-COMPACT HERO ── */}
          <div
            className="relative overflow-hidden rounded-[2rem] animate-scale-in shadow-md"
            style={{ minHeight: "96px" }}
          >
            <img
              src="/images/cycle-insight-hero.webp"
              alt="" aria-hidden loading="eager" decoding="async"
              className="absolute inset-0 h-full w-full object-cover object-top animate-photo-breathe"
            />
            {/* left shield — keeps Day N text readable */}
            <div className="absolute inset-0 bg-gradient-to-r from-white/75 via-white/40 to-white/10" />
            {/* right shield — keeps countdown text readable */}
            <div className="absolute inset-0 bg-gradient-to-l from-white/80 via-white/30 to-transparent" />
            <div className="relative z-10 px-4 py-2.5">
              <div className="flex items-center justify-between gap-3">
                {/* left: day + phase — staggered entrance */}
                <div>
                  <h2
                    className="font-script text-4xl text-hotpink leading-none animate-scale-in"
                    style={{ animationDelay: "0ms" }}
                  >
                    Day {cycleDay}
                  </h2>
                  {(() => { const PhaseIcon = PHASE_META[currentPhase].Icon; return (
                  <span
                    className={["mt-1 inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[10px] font-bold animate-fade-in", phaseTagColors[currentPhase]].join(" ")}
                    style={{ animationDelay: "120ms" }}
                  >
                    <PhaseIcon className="h-2.5 w-2.5" />
                    {PHASE_LABEL[currentPhase]} Phase
                  </span>
                  ); })()}
                  <p
                    className="mt-0.5 text-[10px] font-semibold text-rose/65 max-w-[180px] leading-snug animate-fade-in"
                    style={{ animationDelay: "200ms" }}
                  >
                    {PHASE_SUBTITLE[currentPhase]}
                  </p>
                </div>
                {/* right: next period countdown — no button */}
                <div className="shrink-0 text-right animate-fade-in" style={{ animationDelay: "80ms" }}>
                  <p className="text-[8px] font-bold text-rose/45 uppercase tracking-wider">Next period</p>
                  <p className="font-script text-2xl text-hotpink leading-none animate-scale-in" style={{ animationDelay: "40ms" }}>{daysToPeriod}d</p>
                  <p className="text-[8px] text-rose/50 font-semibold">{fmtDate(nextPeriodDate)}</p>
                </div>
              </div>
            </div>
          </div>

          {/* ── PHASE TIMELINE LINE ── */}
          <div
            className="rounded-[1.5rem] bloom-pink-wave border border-pink-200/50 px-3 py-3 shadow-sm animate-fade-in"
            style={{ animationDelay: "60ms" }}
          >
            <div className="relative flex items-start justify-between">
              {/* animated background track — cute degraded pink */}
              <div
                className="absolute left-3 right-3 top-3 h-[2px] rounded-full animate-card-breathe"
                style={{ background: "linear-gradient(90deg,#FCE7F3,#FBCFE8,#FFC2D6,#FBCFE8,#FCE7F3)" }}
              />
              {/* animated progress fill */}
              <div
                className="absolute left-3 top-3 h-[2px] rounded-full transition-all duration-700 animate-bloom-pulse"
                style={{
                  width: `calc(${progressPct}% * (100% - 1.5rem) / 100)`,
                  background: "linear-gradient(90deg,#BE185D,#EC4899,#F9A8D4,#EC4899)",
                }}
              />
              {journeySteps.map((step, i) => {
                const isPast    = i < activeIdx;
                const isCurrent = step.active;
                const StepIcon  = step.Icon;
                return (
                  <div key={step.key} className="relative z-10 flex flex-1 flex-col items-center gap-1">
                    <span
                      className={[
                        "grid h-7 w-7 shrink-0 place-items-center rounded-full shadow-md transition-all duration-300",
                        isCurrent
                          ? "bg-hotpink text-white ring-4 ring-white/60 animate-selected-glow"
                          : isPast
                          ? "bg-pink-400/80 text-white shadow-sm"
                          : "bg-white/80 text-rose/40 border border-pink-200",
                      ].join(" ")}
                    >
                      <StepIcon className="h-3.5 w-3.5" />
                    </span>
                    <span
                      className={[
                        "text-[8px] font-bold tracking-wide leading-none text-center",
                        isCurrent ? "text-[#BE185D] drop-shadow-sm" : isPast ? "text-pink-600/80" : "text-rose/50",
                      ].join(" ")}
                    >
                      {step.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── CYCLE PREDICTIONS + MOOD + DAILY PILL ── */}
          <div className="relative animate-fade-in" style={{ animationDelay: "100ms" }}>
            <div className="grid grid-cols-5 gap-1">
              {[
                { label: "Period",    Icon: CalendarDays, BgIcon: Flower2,  value: fmtDate(nextPeriodDate), sub: `in ${daysToPeriod}d`,        color: "text-hotpink",   bg: "from-[#FFF0F6] to-[#FCE7F3]", border: "border-pink-100",  bgColor: "text-hotpink"   },
                { label: "Fertile",   Icon: Heart,        BgIcon: Flower2,  value: fmtDate(fertileStart),   sub: `–${fmtDate(fertileEnd)}`,    color: "text-pink-500",  bg: "from-pink-50 to-rose-50",      border: "border-pink-100",  bgColor: "text-pink-400"  },
                { label: "Ovulation", Icon: Sun,          BgIcon: Sparkles, value: fmtDate(ovulationDate),  sub: `day ${ovulationDayOfCycle}`,  color: "text-amber-500", bg: "from-amber-50 to-yellow-50",   border: "border-amber-100", bgColor: "text-amber-400" },
              ].map((p, i) => (
                <div
                  key={p.label}
                  className={["relative overflow-hidden rounded-xl bg-gradient-to-br border p-2 shadow-sm flex flex-col gap-1 animate-fade-in", p.bg, p.border].join(" ")}
                  style={{ animationDelay: `${350 + i * 55}ms` }}
                >
                  <span
                    className={["pointer-events-none absolute -right-2 -bottom-2 opacity-[0.09] animate-bloom-float", p.bgColor].join(" ")}
                    style={{ animationDelay: `${i * 700}ms` }}
                  >
                    <p.BgIcon className="h-10 w-10" />
                  </span>
                  <span className={["grid h-5 w-5 place-items-center rounded-lg bg-white/80 shadow-sm", p.color].join(" ")}>
                    <p.Icon className="h-3 w-3" />
                  </span>
                  <div>
                    <p className="text-[6px] font-bold uppercase tracking-wider text-rose/50 mb-0.5">{p.label}</p>
                    <p className={["font-script text-xs leading-tight", p.color].join(" ")}>{p.value}</p>
                    <p className="text-[7px] text-rose/50 font-semibold">{p.sub}</p>
                  </div>
                </div>
              ))}

              {/* Mood card — 4th, opens inline picker */}
              <button
                onClick={() => setShowMoodPickerCard((v) => !v)}
                aria-pressed={showMoodPickerCard}
                className={[
                  "relative overflow-hidden rounded-xl bg-gradient-to-br border p-2 shadow-sm flex flex-col gap-1 text-left animate-fade-in animate-tap-hint hover-scale transition-all duration-200 active:scale-95",
                  showMoodPickerCard
                    ? "from-[#FFF0F6] to-[#FCE7F3] border-pink-200 ring-1 ring-hotpink/30 shadow-md"
                    : "from-[#FFF0F6] to-[#FCE7F3] border-pink-100",
                ].join(" ")}
                style={{ animationDelay: "465ms" }}
              >
                {/* pulsing tap-hint dot */}
                <span className="pointer-events-none absolute top-1 right-1 h-1.5 w-1.5 rounded-full bg-hotpink/55 animate-bloom-pulse" />
                <span
                  className="pointer-events-none absolute -right-2 -bottom-2 opacity-[0.09] animate-bloom-float text-hotpink"
                  style={{ animationDelay: "2100ms" }}
                >
                  <MoodIconToday className="h-10 w-10" />
                </span>
                <span className="grid h-5 w-5 place-items-center rounded-lg bg-white/80 shadow-sm text-hotpink">
                  <MoodIconToday className="h-3 w-3" />
                </span>
                <div>
                  <p className="text-[6px] font-bold uppercase tracking-wider text-rose/50 mb-0.5">Mood</p>
                  <p className="font-script text-xs leading-tight text-hotpink">{moodLabelToday}</p>
                  <p className="text-[7px] text-rose/50 font-semibold animate-cta-bounce inline-block">tap ♥</p>
                </div>
              </button>

              {/* Daily Pill — 5th */}
              <button
                onClick={() => setPillTaken((v) => !v)}
                aria-pressed={pillTaken}
                className={[
                  "relative overflow-hidden rounded-xl bg-gradient-to-br border p-2 shadow-sm flex flex-col gap-1 text-left animate-fade-in animate-tap-hint hover-scale transition-all duration-200 active:scale-95",
                  pillTaken ? "from-[#FFF0F6] to-[#FCE7F3] border-pink-100" : "from-white/80 to-pink-50/50 border-pink-50",
                ].join(" ")}
                style={{ animationDelay: "520ms" }}
              >
                {/* pulsing tap-hint dot */}
                <span className={["pointer-events-none absolute top-1 right-1 h-1.5 w-1.5 rounded-full animate-bloom-pulse", pillTaken ? "bg-green-400/60" : "bg-hotpink/55"].join(" ")} />
                <span
                  className="pointer-events-none absolute -right-2 -bottom-2 opacity-[0.09] animate-bloom-float text-hotpink"
                  style={{ animationDelay: "2800ms" }}
                >
                  <Pill className="h-10 w-10" />
                </span>
                <span className={["grid h-5 w-5 place-items-center rounded-lg shadow-sm", pillTaken ? "bg-hotpink text-white" : "bg-white/80 text-rose/40"].join(" ")}>
                  <Pill className="h-3 w-3" />
                </span>
                <div>
                  <p className="text-[6px] font-bold uppercase tracking-wider text-rose/50 mb-0.5">Pill</p>
                  <p className={["font-script text-xs leading-tight", pillTaken ? "text-hotpink" : "text-rose/40"].join(" ")}>
                    {pillTaken ? "Taken ✓" : "Log it"}
                  </p>
                  <p className="text-[7px] text-rose/50 font-semibold animate-cta-bounce inline-block">{pillTaken ? "done ✓" : "tap ♥"}</p>
                </div>
              </button>
            </div>

            {/* Mood picker popup */}
            {showMoodPickerCard && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowMoodPickerCard(false)} />
                <div className="absolute top-full left-0 right-0 z-20 mt-1 animate-scale-in">
                  <div className="rounded-2xl bg-white/98 border border-pink-100 shadow-xl p-2.5 backdrop-blur-md">
                    <p className="text-[7px] font-bold uppercase tracking-wider text-rose/50 text-center mb-1.5">How are you feeling? ♡</p>
                    <div className="grid grid-cols-4 gap-1">
                      {MOODS.map((m, i) => {
                        const MoodIcon = m.Icon;
                        const isActive = mood === m.key;
                        return (
                          <button
                            key={m.key}
                            onClick={() => {
                              const next = { ...moodLog, [todayKey]: m.key };
                              setMoodLog(next);
                              setShowMoodPickerCard(false);
                              try { localStorage.setItem(MOOD_LOG_KEY, JSON.stringify(next)); } catch {}
                            }}
                            className={[
                              "flex flex-col items-center gap-0.5 rounded-xl py-1.5 px-1 text-center transition-all duration-150 active:scale-90 hover-scale animate-fade-in",
                              isActive ? "bg-hotpink text-white shadow-sm animate-selected-glow" : "bg-pink-50 text-rose/70 hover:bg-pink-100",
                            ].join(" ")}
                            style={{ animationDelay: `${i * 40}ms` }}
                          >
                            <MoodIcon className="h-3.5 w-3.5" />
                            <span className="text-[7px] font-semibold leading-none mt-0.5">{m.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* ── CALENDAR + MOOD & SYMPTOMS SIDEBARS ── */}
          <div
            className="relative overflow-hidden rounded-[1.5rem] bg-white/92 backdrop-blur-md border border-pink-100/80 p-2 shadow-sm animate-fade-in"
            style={{ animationDelay: "140ms" }}
          >
            {/* month nav */}
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-0.5">
                <button onClick={() => shift(-1)} className="hover-scale grid h-5 w-5 place-items-center rounded-full bg-pink-50 text-rose shadow-sm transition active:scale-90">
                  <ChevronLeft className="h-3 w-3" />
                </button>
                <h3 className="font-script text-base text-hotpink px-1">
                  {MONTHS[cursor.getMonth()]} {cursor.getFullYear()}
                </h3>
                <button onClick={() => shift(1)} className="hover-scale grid h-5 w-5 place-items-center rounded-full bg-pink-50 text-rose shadow-sm transition active:scale-90">
                  <ChevronRight className="h-3 w-3" />
                </button>
              </div>
              <button
                onClick={() => setSetupOpen(true)}
                title="Cycle settings"
                className="hover-scale grid h-6 w-6 place-items-center rounded-full bg-pink-50 text-rose/60 hover:bg-pink-100 hover:text-hotpink transition active:scale-90 shadow-sm"
              >
                <Settings className="h-3 w-3" />
              </button>
            </div>

            {/* 2-column: calendar grid | symptoms */}
            <div className="grid grid-cols-[1fr_48px] gap-1 items-stretch">

              {/* ── Calendar center ── */}
              <div>
                <div className="grid grid-cols-7 text-center text-[7px] font-bold tracking-widest text-rose/50 mb-0.5">
                  {WEEKDAYS.map((d) => <div key={d}>{d[0]}</div>)}
                </div>
                <div
                  key={`${cursor.getFullYear()}-${cursor.getMonth()}-${slideDir}`}
                  className="grid grid-cols-7 gap-[1px] animate-fade-in"
                >
                  {days.map((d, i) => {
                    if (!d) return <div key={i} />;
                    const phase          = phaseForDay(d, settings);
                    const dayStyle       = CALENDAR_DAY_STYLE[phase];
                    const CellIcon       = dayStyle.Icon;
                    const isSelected     = sameDay(d, selected);
                    const isToday        = sameDay(d, today);
                    const dk             = dateKey(d);
                    const loggedMood     = moodLog[dk];
                    const loggedSymptoms = symptomsLog[dk] ?? [];
                    return (
                      <button
                        key={i}
                        onClick={() => setSelected(d)}
                        title={`${d.getDate()} · ${PHASE_LABEL[phase]}`}
                        className={[
                          "relative aspect-square rounded-xl flex flex-col items-center justify-center gap-0 transition-all duration-200 hover:scale-105 active:scale-90",
                          dayStyle.cell,
                          isSelected && !isToday ? "ring-1 ring-hotpink/40 scale-105" : "",
                          isToday ? "animate-selected-glow ring-1 ring-hotpink/55" : "",
                        ].join(" ")}
                      >
                        <span className="text-[7px] font-bold leading-none">{d.getDate()}</span>
                        <CellIcon className={`h-2 w-2 mt-px opacity-65 ${dayStyle.iconClass}`} />
                        {loggedMood && (
                          <span
                            className={[
                              "absolute top-0.5 right-0.5 h-1.5 w-1.5 rounded-full",
                              MOOD_BG_COLOR[loggedMood] ?? "bg-pink-300",
                              loggedSymptoms.length > 0 ? "ring-1 ring-white/70" : "",
                            ].join(" ")}
                          />
                        )}
                      </button>
                    );
                  })}
                </div>
                <div className="mt-1 flex flex-wrap justify-center gap-x-1.5 gap-y-0 text-[5px] font-bold text-rose/60">
                  <span className="inline-flex items-center gap-0.5"><span className="h-1 w-1 rounded-sm bg-gradient-to-br from-[#FFC2D6] to-[#FF9EBB]" /> Period</span>
                  <span className="inline-flex items-center gap-0.5"><span className="h-1 w-1 rounded-sm bg-amber-100" /> Follic.</span>
                  <span className="inline-flex items-center gap-0.5"><span className="h-1 w-1 rounded-sm bg-pink-100" /> Fertile</span>
                  <span className="inline-flex items-center gap-0.5"><span className="h-1 w-1 rounded-sm bg-violet-100" /> Ovul.</span>
                  <span className="inline-flex items-center gap-0.5"><span className="h-1 w-1 rounded-sm bg-violet-50 ring-1 ring-violet-200" /> Luteal</span>
                </div>
              </div>

              {/* ── Symptoms sidebar — fills full calendar height ── */}
              <div className="flex flex-col h-full">
                <p className="shrink-0 text-[6px] font-bold text-rose/50 text-center uppercase tracking-wider mb-0.5">Sympt.</p>
                {SYMPTOM_OPTIONS.map((s, i) => {
                  const active = symptoms.includes(s);
                  return (
                    <button
                      key={s}
                      onClick={() => toggleSymptom(s)}
                      title={s}
                      className={[
                        "flex-1 animate-fade-in hover-scale rounded-lg mb-0.5 px-0.5 text-[6px] font-semibold leading-tight text-center transition-all duration-200 active:scale-90",
                        active
                          ? "bg-hotpink text-white shadow-sm"
                          : "bg-pink-50/80 text-rose/60 hover:bg-pink-100",
                      ].join(" ")}
                      style={{ animationDelay: `${500 + i * 45}ms` }}
                    >
                      {s.split(" ")[0]}
                    </button>
                  );
                })}
              </div>

            </div>
          </div>

          {/* ── MOOD & SYMPTOMS MONTHLY GRAPH ── */}
          <div
            className="rounded-[1.5rem] bg-white/92 backdrop-blur-md border border-pink-100/80 p-3 shadow-sm animate-fade-in"
            style={{ animationDelay: "580ms" }}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-2">
              <div>
                <p className="text-[7px] font-bold uppercase tracking-widest text-rose/45">Monthly Wellness</p>
                <p className="font-script text-base leading-tight text-hotpink">{MONTHS[cursor.getMonth()]} Overview</p>
              </div>
              <div className="flex flex-col gap-0.5 items-end">
                <span className="inline-flex items-center gap-0.5 text-[5.5px] font-bold uppercase tracking-wider text-rose/50">
                  <span className="h-2 w-3 rounded-sm bg-rose-200/80" /> Symptoms
                </span>
                <span className="inline-flex items-center gap-0.5 text-[5.5px] font-bold uppercase tracking-wider text-rose/50">
                  <span className="h-2 w-2 rounded-full bg-pink-300" /> Mood
                </span>
              </div>
            </div>

            {/* Bar chart */}
            {(() => {
              const daysInMonth = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate();
              const maxH = 48;
              const maxSymptoms = SYMPTOM_OPTIONS.length;
              return (
                <>
                  <div className="flex items-end gap-[1.5px]" style={{ height: `${maxH + 6}px` }}>
                    {Array.from({ length: daysInMonth }, (_, i) => {
                      const d    = new Date(cursor.getFullYear(), cursor.getMonth(), i + 1);
                      const dk   = dateKey(d);
                      const m    = moodLog[dk];
                      const s    = symptomsLog[dk] ?? [];
                      const isTodayCell = sameDay(d, today);
                      const barH = s.length > 0 ? Math.max((s.length / maxSymptoms) * maxH, 5) : 0;
                      const dotColor = m ? (MOOD_BG_COLOR[m] ?? "bg-pink-300") : isTodayCell ? "bg-pink-200" : "bg-pink-50";
                      const dotSize  = m || isTodayCell ? 5 : 3;
                      return (
                        <div key={i} className="flex-1 flex flex-col items-center justify-end gap-[1px]">
                          {barH > 0 && (
                            <div
                              className="w-full rounded-t-sm bg-rose-200/75 transition-all duration-500"
                              style={{ height: `${barH}px` }}
                            />
                          )}
                          <div
                            className={["rounded-full transition-all duration-300 shrink-0", dotColor, isTodayCell ? "ring-1 ring-hotpink/60 animate-bloom-pulse" : ""].join(" ")}
                            style={{ width: `${dotSize}px`, height: `${dotSize}px` }}
                          />
                        </div>
                      );
                    })}
                  </div>

                  {/* X-axis day labels */}
                  <div className="flex gap-[1.5px] mt-0.5">
                    {Array.from({ length: daysInMonth }, (_, i) => (
                      <div key={i} className="flex-1 text-center text-[3.5px] text-rose/35 font-bold leading-none">
                        {i === 0 || (i + 1) % 7 === 0 ? i + 1 : ""}
                      </div>
                    ))}
                  </div>
                </>
              );
            })()}

            {/* Mood colour legend */}
            <div className="mt-2 flex flex-wrap gap-x-1.5 gap-y-0.5">
              {MOODS.map((m) => (
                <span key={m.key} className="inline-flex items-center gap-0.5 text-[5.5px] font-semibold text-rose/50 uppercase tracking-wide">
                  <span className={["h-1.5 w-1.5 rounded-full shrink-0", MOOD_BG_COLOR[m.key] ?? "bg-pink-200"].join(" ")} />
                  {m.label}
                </span>
              ))}
            </div>

            <p className="mt-1.5 text-[6px] text-rose/35 text-center italic">
              Log mood &amp; symptoms daily — your patterns appear here ♡
            </p>
          </div>

          {/* ── AFFIRMATION CARD ── */}
          <div
            className="relative overflow-hidden rounded-[2rem] animate-fade-in shadow-sm"
            style={{ animationDelay: "820ms", minHeight: "100px" }}
          >
            <img
              src="/images/cycle-journal-hero.webp"
              alt="" aria-hidden loading="lazy" decoding="async"
              className="absolute inset-0 -z-10 h-full w-full object-cover animate-photo-breathe"
            />
            <div className="absolute inset-0 -z-10 bg-gradient-to-r from-white/96 via-white/80 to-white/20" />
            <div className="relative z-10 px-4 py-2.5 max-w-[280px]">
              <p className="text-[8px] font-bold tracking-widest text-rose/55 uppercase flex items-center gap-1 mb-1">
                <BookOpen className="h-2 w-2 text-hotpink" /> Daily Affirmation
              </p>
              <p className="font-script text-base text-hotpink leading-snug">
                "{PHASE_AFFIRMATIONS[currentPhase]}"
              </p>
              <a
                href="/app/tools/diary"
                className="bloom-luxury-btn hover-scale animate-cta-bounce mt-2 inline-flex items-center gap-1 px-3 py-1.5 text-[10px] font-bold text-white"
              >
                <PenLine className="h-3 w-3" />
                Write Entry
              </a>
            </div>
          </div>

        </div>{/* /lg:col-span-3 */}

        {/* ══════════════ RIGHT PANEL (40%) — desktop sticky ══════════════ */}
        <aside
          className="bloom-pearl-card animate-scale-in relative mt-5 overflow-hidden rounded-[2rem] p-4 sm:p-6 lg:sticky lg:top-4 lg:col-span-2 lg:mt-0"
          style={{ animationDelay: "100ms" }}
        >
          <div className="pointer-events-none absolute inset-0 -z-0 animate-bloom-pulse rounded-[2rem] bg-[radial-gradient(60%_60%_at_50%_45%,oklch(0.75_0.22_350/0.25)_0%,transparent_70%)]" aria-hidden />
          <div key={selected.toDateString()} className="relative z-10 animate-fade-in">
            {/* Suggested activities */}
            <p className="text-[9px] font-bold tracking-widest text-rose/60 sm:text-[10px]">SUGGESTED FOR THIS PHASE</p>
            <div className="mt-2 space-y-2">
              {[
                { tag: "Yoga",    t: selectedRecommend.yoga.title,    img: selectedRecommend.yoga.img,    href: "/app/tools/yoga"    },
                { tag: "Workout", t: selectedRecommend.workout.title,  img: selectedRecommend.workout.img,  href: "/app/tools/workout" },
                { tag: "Meal",    t: selectedRecommend.meal.title,    img: selectedRecommend.meal.img,    href: "/app/tools/meals"   },
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

      {/* Floating CTA — mobile/tablet only */}
      <a
        href="/app/tools/yoga"
        className="bloom-luxury-btn hover-scale animate-selected-glow fixed bottom-24 right-4 z-30 inline-flex items-center gap-1.5 rounded-full px-4 py-2.5 text-xs font-bold text-white shadow-lg shadow-hotpink/30 active:scale-95 lg:hidden"
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
