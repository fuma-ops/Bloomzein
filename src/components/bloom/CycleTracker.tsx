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
const PILL_LOG_KEY     = "bloom:pill-log-v2";

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

const MOOD_TEXT_COLOR: Record<string, string> = {
  calm:      "text-sky-400",
  happy:     "text-pink-500",
  energetic: "text-amber-500",
  sensitive: "text-fuchsia-400",
  sad:       "text-blue-400",
  tired:     "text-slate-400",
  cramps:    "text-rose-500",
  bloated:   "text-orange-400",
};

// Wellbeing score for the mood line (1 = lowest, 8 = highest)
const MOOD_SCORE: Record<string, number> = {
  happy: 8, energetic: 7, calm: 6, sensitive: 4,
  bloated: 3, cramps: 2, tired: 2, sad: 1,
};

const PHASE_SVG_COLOR: Record<Exclude<Phase, null>, string> = {
  period:     "rgba(252,162,183,0.18)",
  follicular: "rgba(253,230,138,0.15)",
  fertile:    "rgba(251,207,232,0.18)",
  ovulation:  "rgba(196,181,253,0.18)",
  luteal:     "rgba(216,180,254,0.15)",
};
const PHASE_SVG_LABEL: Record<Exclude<Phase, null>, string> = {
  period: "Period", follicular: "Follic.", fertile: "Fertile",
  ovulation: "Ovul.", luteal: "Luteal",
};
const PHASE_SVG_LABEL_COLOR: Record<Exclude<Phase, null>, string> = {
  period: "#BE185D", follicular: "#D97706", fertile: "#EC4899",
  ovulation: "#7C3AED", luteal: "#9333EA",
};
const PHASE_MOOD_EST: Record<Exclude<Phase, null>, number> = {
  period: 2, follicular: 6, fertile: 7, ovulation: 8, luteal: 4,
};
const PHASE_SYMPT_EST: Record<Exclude<Phase, null>, number> = {
  period: 6, follicular: 1, fertile: 1, ovulation: 1, luteal: 3,
};

/** Builds a smooth cubic-bezier SVG path through the given [x,y] points */
function smoothLinePath(pts: [number, number][]): string {
  if (pts.length === 0) return "";
  if (pts.length === 1) return `M ${pts[0][0]} ${pts[0][1]}`;
  let d = `M ${pts[0][0]} ${pts[0][1]}`;
  for (let i = 1; i < pts.length; i++) {
    const [px, py] = pts[i - 1];
    const [cx, cy] = pts[i];
    const cpx = (px + cx) / 2;
    d += ` C ${cpx} ${py} ${cpx} ${cy} ${cx} ${cy}`;
  }
  return d;
}

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
  const todayKey                          = dateKey(today);
  const [moodLog,             setMoodLog]           = useState<Record<string, string>>(() => readJSON(MOOD_LOG_KEY, {}));
  const [symptomsLog,         setSymptomsLog]       = useState<Record<string, string[]>>(() => readJSON(SYMPTOMS_LOG_KEY, {}));
  const [pillLog,             setPillLog]           = useState<Record<string, boolean>>(() => readJSON(PILL_LOG_KEY, {}));
  const [showMoodPickerCard,  setShowMoodPickerCard] = useState(false);
  const [slideDir,            setSlideDir]          = useState<"l"|"r">("r");

  // Derived today values
  const mood       = moodLog[todayKey] ?? "happy";
  const symptoms   = symptomsLog[todayKey] ?? [];
  const pillTaken  = pillLog[todayKey] ?? false;

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

  const wellnessGraph = useMemo(() => {
    const cycleLen = settings.cycleLength;
    const VW = 300, PX = 4, PY_TOP = 20, chartH = 76, PY_BOT = 16;
    const VH = PY_TOP + chartH + PY_BOT;
    const chartW = VW - PX * 2;
    const maxSym = SYMPTOM_OPTIONS.length;
    const bands: { phase: Exclude<Phase, null>; x1: number; x2: number }[] = [];
    let prev: Exclude<Phase, null> | null = null, bs = 0;
    for (let i = 0; i <= cycleLen; i++) {
      const ph = i < cycleLen ? (phaseForDay(new Date(currentCycleStart.getTime() + i * MS_DAY), settings) as Exclude<Phase, null>) : null;
      if (ph !== prev) {
        if (prev !== null) bands.push({ phase: prev, x1: PX + (bs / cycleLen) * chartW, x2: PX + (i / cycleLen) * chartW });
        prev = ph; bs = i;
      }
    }
    const moodPts: [number, number][] = [];
    const symptPts: [number, number][] = [];
    const moodEstPts: [number, number][] = [];
    const symptEstPts: [number, number][] = [];
    for (let i = 0; i < cycleLen; i++) {
      const dk = dateKey(new Date(currentCycleStart.getTime() + i * MS_DAY));
      const m = moodLog[dk], s = symptomsLog[dk] ?? [];
      const ph = phaseForDay(new Date(currentCycleStart.getTime() + i * MS_DAY), settings) as Exclude<Phase, null>;
      const x = PX + (cycleLen > 1 ? i / (cycleLen - 1) : 0) * chartW;
      if (m) moodPts.push([x, PY_TOP + (1 - (MOOD_SCORE[m] ?? 4) / 8) * chartH]);
      if (s.length) symptPts.push([x, PY_TOP + (1 - s.length / maxSym) * chartH]);
      moodEstPts.push([x, PY_TOP + (1 - (PHASE_MOOD_EST[ph] ?? 5) / 8) * chartH]);
      symptEstPts.push([x, PY_TOP + (1 - (PHASE_SYMPT_EST[ph] ?? 2) / maxSym) * chartH]);
    }
    const moodLine     = smoothLinePath(moodPts);
    const symptLine    = smoothLinePath(symptPts);
    const moodEstLine  = smoothLinePath(moodEstPts);
    const symptEstLine = smoothLinePath(symptEstPts);
    const moodArea  = moodPts.length >= 2
      ? `${moodLine} L ${moodPts[moodPts.length-1][0]} ${PY_TOP + chartH} L ${moodPts[0][0]} ${PY_TOP + chartH} Z` : "";
    const symptArea = symptPts.length >= 2
      ? `${symptLine} L ${symptPts[symptPts.length-1][0]} ${PY_TOP + chartH} L ${symptPts[0][0]} ${PY_TOP + chartH} Z` : "";
    const todayX = PX + ((Math.min(cycleDay, cycleLen) - 1) / Math.max(cycleLen - 1, 1)) * chartW;
    return { bands, moodPts, symptPts, moodLine, symptLine, moodArea, symptArea, moodEstLine, symptEstLine, todayX, VW, VH, PX, PY_TOP, chartH, chartW, cycleLen };
  }, [settings, currentCycleStart, cycleDay, moodLog, symptomsLog]);

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

  function renderWellnessGraph(gradSuffix: string) {
    const { bands, moodPts, symptPts, moodLine, symptLine, moodArea, symptArea, moodEstLine, symptEstLine, todayX, VW, VH, PX, PY_TOP, chartH, cycleLen } = wellnessGraph;
    const hasData = moodPts.length + symptPts.length > 0;
    return (
      <>
        <div className="flex items-center justify-between mb-2">
          <div>
            <p className="text-[7px] font-bold uppercase tracking-widest text-rose/45 lg:text-[8px]">Cycle Wellness</p>
            <p className="font-script text-base leading-tight text-hotpink lg:text-lg">This Cycle</p>
          </div>
          <div className="flex items-center gap-1.5 flex-wrap justify-end">
            <span className="inline-flex items-center gap-1 rounded-full bg-pink-50 border border-pink-100 px-2 py-0.5 text-[7px] font-bold text-hotpink lg:text-[8px]">
              <svg width="10" height="4"><line x1="0" y1="2" x2="10" y2="2" stroke="#EC4899" strokeWidth="1.5" strokeLinecap="round"/></svg>
              Mood
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 border border-rose-100 px-2 py-0.5 text-[7px] font-bold text-rose-400 lg:text-[8px]">
              <svg width="10" height="4"><line x1="0" y1="2" x2="10" y2="2" stroke="#FDA4AF" strokeWidth="1.5" strokeLinecap="round"/></svg>
              Sympt.
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-pink-50/50 border border-pink-100/60 px-2 py-0.5 text-[7px] font-bold text-rose/40 lg:text-[8px]">
              <svg width="10" height="4"><line x1="0" y1="2" x2="10" y2="2" stroke="#EC4899" strokeWidth="1" strokeLinecap="round" strokeDasharray="3 2" strokeOpacity="0.5"/></svg>
              Est.
            </span>
          </div>
        </div>
        <svg
          viewBox={`0 0 ${VW} ${VH}`}
          className="w-full"
          style={{ width: "100%", height: "auto", display: "block" }}
          aria-hidden
        >
          <defs>
            <linearGradient id={`bloom-mood-${gradSuffix}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"   stopColor="#EC4899" stopOpacity="0.18" />
              <stop offset="100%" stopColor="#EC4899" stopOpacity="0.01" />
            </linearGradient>
            <linearGradient id={`bloom-sym-${gradSuffix}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"   stopColor="#FDA4AF" stopOpacity="0.22" />
              <stop offset="100%" stopColor="#FDA4AF" stopOpacity="0.01" />
            </linearGradient>
          </defs>
          {bands.map((b, bi) => (
            <rect key={bi} x={b.x1} y={PY_TOP} width={b.x2 - b.x1} height={chartH}
              fill={PHASE_SVG_COLOR[b.phase]} rx="2" />
          ))}
          {bands.map((b, bi) => (
            <text key={bi} x={(b.x1 + b.x2) / 2} y={PY_TOP + 9}
              textAnchor="middle" fontSize="6" fontWeight="700"
              fill={PHASE_SVG_LABEL_COLOR[b.phase]} fillOpacity="0.75">
              {PHASE_SVG_LABEL[b.phase]}
            </text>
          ))}
          {[0.25, 0.5, 0.75].map((f) => (
            <line key={f} x1={PX} y1={PY_TOP + f * chartH} x2={VW - PX} y2={PY_TOP + f * chartH}
              stroke="#FDE8F3" strokeWidth="0.5" />
          ))}
          <line x1={todayX} y1={PY_TOP} x2={todayX} y2={PY_TOP + chartH}
            stroke="#EC4899" strokeWidth="1" strokeDasharray="2.5 2" strokeOpacity="0.6" />
          {/* Estimation lines — dashed, faint reference curve based on phase averages */}
          {symptEstLine && <path d={symptEstLine} fill="none" stroke="#FDA4AF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="4 3" strokeOpacity="0.28" />}
          {moodEstLine  && <path d={moodEstLine}  fill="none" stroke="#EC4899" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="4 3" strokeOpacity="0.28" />}
          {/* Real data */}
          {symptArea && <path d={symptArea} fill={`url(#bloom-sym-${gradSuffix})`} />}
          {symptLine  && <path d={symptLine} fill="none" stroke="#FDA4AF" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />}
          {moodArea && <path d={moodArea} fill={`url(#bloom-mood-${gradSuffix})`} />}
          {moodLine  && <path d={moodLine} fill="none" stroke="#EC4899" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />}
          {moodPts.map(([x, y], i) => (
            <circle key={i} cx={x} cy={y} r="2.5" fill="#EC4899" fillOpacity="0.9" />
          ))}
          {symptPts.map(([x, y], i) => (
            <circle key={i} cx={x} cy={y} r="2" fill="#FDA4AF" fillOpacity="0.9" />
          ))}
          <text x={PX} y={VH - 2} textAnchor="start" fontSize="6.5" fill="#C084A0" fillOpacity="0.7" fontWeight="600">Day 1</text>
          <text x={todayX} y={VH - 2} textAnchor="middle" fontSize="6.5" fill="#EC4899" fillOpacity="0.9" fontWeight="700">▾{cycleDay}</text>
          <text x={VW - PX} y={VH - 2} textAnchor="end" fontSize="6.5" fill="#C084A0" fillOpacity="0.7" fontWeight="600">Day {cycleLen}</text>
        </svg>
        {!hasData && (
          <p className="mt-0.5 text-[6.5px] text-rose/40 text-center italic lg:text-[7.5px]">
            Dashed lines show phase estimates — log daily to see your real curve ♡
          </p>
        )}
      </>
    );
  }

  return (
    <div className="relative animate-fade-in">
      <KawaiiBackground count={16} />
      <BloomBubbles count={18} />

      <div className="lg:grid lg:grid-cols-5 lg:items-start lg:gap-6">

        {/* ══════════════ LEFT COLUMN (60%) ══════════════ */}
        <div className="lg:col-span-3 space-y-2">

          {/* ── HERO + PHASE TIMELINE (merged) ── */}
          <div
            className="relative overflow-hidden rounded-[2rem] animate-scale-in shadow-md"
          >
            <img
              src="/images/cycle-insight-hero.webp"
              alt="" aria-hidden loading="eager" decoding="async"
              className="absolute inset-0 h-full w-full object-cover object-top animate-photo-breathe"
            />
            {/* left shield — keeps Day N text readable */}
            <div className="absolute inset-0 bg-gradient-to-r from-white/80 via-white/50 to-white/15" />
            {/* right shield — keeps countdown text readable */}
            <div className="absolute inset-0 bg-gradient-to-l from-white/85 via-white/35 to-transparent" />
            <div className="relative z-10 px-4 pt-2.5 pb-3">
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

              {/* Phase journey steps — part of the hero */}
              <div className="mt-3 border-t border-white/30 pt-2.5 animate-fade-in" style={{ animationDelay: "60ms" }}>
                <div className="relative flex items-start justify-between">
                  <div
                    className="absolute left-0 right-0 top-3 h-[2px] rounded-full animate-card-breathe"
                    style={{ background: "linear-gradient(90deg,#FCE7F3,#FBCFE8,#FFC2D6,#FBCFE8,#FCE7F3)" }}
                  />
                  <div
                    className="absolute left-0 top-3 h-[2px] rounded-full transition-all duration-700 animate-bloom-pulse"
                    style={{
                      width: `calc(${progressPct}% * 100% / 100)`,
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
                              : "bg-white/70 text-rose/40 border border-pink-200",
                          ].join(" ")}
                        >
                          <StepIcon className="h-3.5 w-3.5" />
                        </span>
                        <span
                          className={[
                            "text-[9px] font-bold tracking-wide leading-none text-center",
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
            </div>
          </div>

          {/* ── CYCLE PREDICTIONS + MOOD + DAILY PILL ── */}
          <div className="relative animate-fade-in" style={{ animationDelay: "100ms" }}>
            <div className="grid grid-cols-5 gap-1.5">
              {[
                { label: "Period",    Icon: CalendarDays, BgIcon: Flower2,  value: fmtDate(nextPeriodDate), sub: `in ${daysToPeriod}d`,        color: "text-hotpink",   bg: "from-[#FFF0F6] to-[#FCE7F3]", border: "border-pink-100",  bgColor: "text-hotpink"   },
                { label: "Fertile",   Icon: Heart,        BgIcon: Flower2,  value: fmtDate(fertileStart),   sub: `–${fmtDate(fertileEnd)}`,    color: "text-pink-500",  bg: "from-pink-50 to-rose-50",      border: "border-pink-100",  bgColor: "text-pink-400"  },
                { label: "Ovulation", Icon: Sun,          BgIcon: Sparkles, value: fmtDate(ovulationDate),  sub: `day ${ovulationDayOfCycle}`,  color: "text-amber-500", bg: "from-amber-50 to-yellow-50",   border: "border-amber-100", bgColor: "text-amber-400" },
              ].map((p, i) => (
                <div
                  key={p.label}
                  className={["relative overflow-hidden rounded-xl bg-gradient-to-br border p-2.5 shadow-sm flex flex-col gap-1.5 animate-fade-in", p.bg, p.border].join(" ")}
                  style={{ animationDelay: `${350 + i * 55}ms` }}
                >
                  <span className={["pointer-events-none absolute -right-2 -bottom-2 opacity-[0.09] animate-bloom-float", p.bgColor].join(" ")} style={{ animationDelay: `${i * 700}ms` }}>
                    <p.BgIcon className="h-10 w-10" />
                  </span>
                  <span className={["grid h-6 w-6 place-items-center rounded-lg bg-white/80 shadow-sm", p.color].join(" ")}>
                    <p.Icon className="h-3.5 w-3.5" />
                  </span>
                  <div>
                    <p className="text-[9px] font-bold uppercase tracking-wider text-rose/50 mb-0.5">{p.label}</p>
                    <p className={["font-script text-sm leading-tight", p.color].join(" ")}>{p.value}</p>
                    <p className="text-[10px] text-rose/50 font-semibold">{p.sub}</p>
                  </div>
                </div>
              ))}

              {/* Mood card — 4th, opens inline picker */}
              <button
                onClick={() => setShowMoodPickerCard((v) => !v)}
                aria-pressed={showMoodPickerCard}
                className={[
                  "relative overflow-hidden rounded-xl bg-gradient-to-br border p-2.5 shadow-sm flex flex-col gap-1.5 text-left animate-fade-in animate-tap-hint hover-scale transition-all duration-200 active:scale-95",
                  showMoodPickerCard
                    ? "from-[#FFF0F6] to-[#FCE7F3] border-pink-200 ring-1 ring-hotpink/30 shadow-md"
                    : "from-[#FFF0F6] to-[#FCE7F3] border-pink-100",
                ].join(" ")}
                style={{ animationDelay: "465ms" }}
              >
                <span className="pointer-events-none absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-hotpink/55 animate-bloom-pulse" />
                <span className="pointer-events-none absolute -right-2 -bottom-2 opacity-[0.09] animate-bloom-float text-hotpink" style={{ animationDelay: "2100ms" }}>
                  <MoodIconToday className="h-10 w-10" />
                </span>
                <span className="grid h-6 w-6 place-items-center rounded-lg bg-white/80 shadow-sm text-hotpink">
                  <MoodIconToday className="h-3.5 w-3.5" />
                </span>
                <div>
                  <p className="text-[9px] font-bold uppercase tracking-wider text-rose/50 mb-0.5">Mood</p>
                  <p className="font-script text-sm leading-tight text-hotpink">{moodLabelToday}</p>
                  <p className="text-[10px] text-rose/50 font-semibold animate-cta-bounce inline-block">tap ♥</p>
                </div>
              </button>

              {/* Daily Pill — 5th */}
              <button
                onClick={() => {
                  const next = { ...pillLog, [todayKey]: !pillTaken };
                  setPillLog(next);
                  try { localStorage.setItem(PILL_LOG_KEY, JSON.stringify(next)); } catch {}
                }}
                aria-pressed={pillTaken}
                className={[
                  "relative overflow-hidden rounded-xl bg-gradient-to-br border p-2.5 shadow-sm flex flex-col gap-1.5 text-left animate-fade-in animate-tap-hint hover-scale transition-all duration-200 active:scale-95",
                  pillTaken ? "from-[#FFF0F6] to-[#FCE7F3] border-pink-100" : "from-white/80 to-pink-50/50 border-pink-50",
                ].join(" ")}
                style={{ animationDelay: "520ms" }}
              >
                <span className={["pointer-events-none absolute top-1.5 right-1.5 h-2 w-2 rounded-full animate-bloom-pulse", pillTaken ? "bg-green-400/60" : "bg-hotpink/55"].join(" ")} />
                <span className="pointer-events-none absolute -right-2 -bottom-2 opacity-[0.09] animate-bloom-float text-hotpink" style={{ animationDelay: "2800ms" }}>
                  <Pill className="h-10 w-10" />
                </span>
                <span className={["grid h-6 w-6 place-items-center rounded-lg shadow-sm", pillTaken ? "bg-hotpink text-white" : "bg-white/80 text-rose/40"].join(" ")}>
                  <Pill className="h-3.5 w-3.5" />
                </span>
                <div>
                  <p className="text-[9px] font-bold uppercase tracking-wider text-rose/50 mb-0.5">Pill</p>
                  <p className={["font-script text-sm leading-tight", pillTaken ? "text-hotpink" : "text-rose/40"].join(" ")}>{pillTaken ? "Taken ✓" : "Log it"}</p>
                  <p className="text-[10px] text-rose/50 font-semibold animate-cta-bounce inline-block">{pillTaken ? "done ✓" : "tap ♥"}</p>
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
                <div className="grid grid-cols-7 text-center text-[8px] font-bold tracking-widest text-rose/50 mb-0.5">
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
                    const pillTakenDay   = pillLog[dk] ?? false;
                    const MoodCellIcon   = loggedMood ? MOODS.find(m => m.key === loggedMood)?.Icon : undefined;
                    const hasExtra       = loggedMood || pillTakenDay || loggedSymptoms.length > 0;
                    return (
                      <button
                        key={i}
                        onClick={() => setSelected(d)}
                        title={`${d.getDate()} · ${PHASE_LABEL[phase]}`}
                        className={[
                          "relative aspect-square rounded-xl flex flex-col items-center justify-center gap-[1px] transition-all duration-200 hover:scale-105 active:scale-90",
                          dayStyle.cell,
                          isSelected && !isToday ? "ring-1 ring-hotpink/40 scale-105" : "",
                          isToday ? "animate-selected-glow ring-1 ring-hotpink/55" : "",
                        ].join(" ")}
                      >
                        <span className="text-[8px] font-bold leading-none">{d.getDate()}</span>
                        <CellIcon className={`h-2.5 w-2.5 opacity-70 ${dayStyle.iconClass}`} />
                        {hasExtra && (
                          <div className="flex items-center gap-px">
                            {MoodCellIcon && (
                              <MoodCellIcon className={`h-[7px] w-[7px] ${MOOD_TEXT_COLOR[loggedMood!] ?? "text-pink-400"}`} />
                            )}
                            {pillTakenDay && <Pill className="h-[7px] w-[7px] text-violet-400" />}
                            {loggedSymptoms.length > 0 && (
                              <span className="h-[5px] w-[5px] rounded-full bg-rose-400/75 shrink-0" />
                            )}
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
                <div className="mt-1 flex flex-wrap justify-center gap-x-1.5 gap-y-0 text-[7px] font-bold text-rose/60">
                  <span className="inline-flex items-center gap-0.5"><span className="h-1 w-1 rounded-sm bg-gradient-to-br from-[#FFC2D6] to-[#FF9EBB]" /> Period</span>
                  <span className="inline-flex items-center gap-0.5"><span className="h-1 w-1 rounded-sm bg-amber-100" /> Follic.</span>
                  <span className="inline-flex items-center gap-0.5"><span className="h-1 w-1 rounded-sm bg-pink-100" /> Fertile</span>
                  <span className="inline-flex items-center gap-0.5"><span className="h-1 w-1 rounded-sm bg-violet-100" /> Ovul.</span>
                  <span className="inline-flex items-center gap-0.5"><span className="h-1 w-1 rounded-sm bg-violet-50 ring-1 ring-violet-200" /> Luteal</span>
                </div>
              </div>

              {/* ── Symptoms sidebar — fills full calendar height ── */}
              <div className="flex flex-col h-full">
                <p className="shrink-0 text-[8px] font-bold text-rose/50 text-center uppercase tracking-wider mb-0.5">Sympt.</p>
                {SYMPTOM_OPTIONS.map((s, i) => {
                  const active = symptoms.includes(s);
                  return (
                    <button
                      key={s}
                      onClick={() => toggleSymptom(s)}
                      title={s}
                      className={[
                        "flex-1 animate-fade-in hover-scale rounded-lg mb-0.5 px-0.5 text-[8px] font-semibold leading-tight text-center transition-all duration-200 active:scale-90",
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

          {/* ── WELLNESS GRAPH (mobile/tablet — desktop shows in right panel) ── */}
          <div
            className="lg:hidden rounded-[1.5rem] bg-white/92 backdrop-blur-md border border-pink-100/80 p-3 shadow-sm animate-fade-in"
            style={{ animationDelay: "580ms" }}
          >
            {renderWellnessGraph("mob")}
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
          <div className="relative z-10 hidden lg:block mb-4 pb-4 border-b border-pink-100/50">
            {renderWellnessGraph("desk")}
          </div>
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
