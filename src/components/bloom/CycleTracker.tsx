import { useEffect, useMemo, useRef, useState } from "react";
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
  Play,
  type LucideIcon,
} from "lucide-react";
import { PeriodSetup, type CycleSettings } from "./PeriodSetup";
import { AnimatedWords } from "./AnimatedWords";
import { PHASE_PLAN as SHARED_PHASE_PLAN, LAUNCH_YOGA_KEY, LAUNCH_WORKOUT_KEY, writeLaunch } from "./phasePlan";
import {
  type CyclePhase,
  phaseForDay,
  PHASE_LABEL,
  DEFAULT_CYCLE_SETTINGS,
  readCycleSettings,
  writeCycleSettings,
  broadcastCyclePhase,
  hasCycleSettings,
  CYCLE_SETTINGS_KEY,
  CYCLE_PHASE_KEY,
} from "./cyclePhase";

/** @deprecated use DEFAULT_CYCLE_SETTINGS / readCycleSettings from "./cyclePhase" — kept for existing imports */
export const DEFAULT_SETTINGS: CycleSettings = DEFAULT_CYCLE_SETTINGS;

/** @deprecated use CyclePhase from "./cyclePhase" — kept for existing imports */
export type Phase = Exclude<CyclePhase, "any"> | null;

export { phaseForDay };

export const PHASE_META: Record<Exclude<Phase, null>, { label: string; color: string; ring: string; Icon: LucideIcon }> = {
  period:     { label: "PERIOD",     color: "bg-hotpink text-white",           ring: "ring-hotpink/40",  Icon: Droplet },
  follicular: { label: "FOLLICULAR", color: "bg-pink-100 text-hotpink",     ring: "ring-pink-200",   Icon: Sprout },
  fertile:    { label: "FERTILE",    color: "bg-pink-100 text-hotpink",        ring: "ring-pink-200",    Icon: Flower2 },
  ovulation:  { label: "OVULATION",  color: "bg-rose-200 text-magenta",        ring: "ring-rose-400",    Icon: Star },
  luteal:     { label: "LUTEAL",     color: "bg-rose-100 text-rose-500",   ring: "ring-rose-200",  Icon: Moon },
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
    { label: "Hydration", value: "Stay Focused",   Icon: Droplets, color: "text-rose-400",     bg: "bg-rose-50"     },
    { label: "Movement",  value: "Gentle Yoga",    Icon: Leaf,     color: "text-hotpink",   bg: "bg-pink-50"   },
    { label: "Nutrition", value: "Iron-rich foods",Icon: Sprout,   color: "text-magenta",   bg: "bg-pink-50"   },
  ],
  follicular: [
    { label: "Energy",    value: "Rising",         Icon: Zap,      color: "text-magenta",   bg: "bg-pink-50"   },
    { label: "Hydration", value: "Stay Active",    Icon: Droplets, color: "text-rose-400",     bg: "bg-rose-50"     },
    { label: "Movement",  value: "Strength",       Icon: Dumbbell, color: "text-magenta",  bg: "bg-pink-50"  },
    { label: "Nutrition", value: "Protein-rich",   Icon: Sprout,   color: "text-hotpink",   bg: "bg-pink-50"   },
  ],
  fertile: [
    { label: "Energy",    value: "High",           Icon: Zap,      color: "text-pink-500",    bg: "bg-pink-50"    },
    { label: "Hydration", value: "Active day",     Icon: Droplets, color: "text-rose-400",     bg: "bg-rose-50"     },
    { label: "Movement",  value: "Power Flow",     Icon: Flame,    color: "text-rose-500",    bg: "bg-rose-50"    },
    { label: "Nutrition", value: "Fresh & Light",  Icon: Leaf,     color: "text-hotpink",   bg: "bg-pink-50"   },
  ],
  ovulation: [
    { label: "Energy",    value: "Peak",           Icon: Zap,      color: "text-rose-500",  bg: "bg-rose-50"  },
    { label: "Hydration", value: "Intense",        Icon: Droplets, color: "text-rose-400",     bg: "bg-rose-50"     },
    { label: "Movement",  value: "HIIT",           Icon: Flame,    color: "text-rose-500",     bg: "bg-rose-50"     },
    { label: "Nutrition", value: "Energizing",     Icon: Sprout,   color: "text-hotpink", bg: "bg-pink-50" },
  ],
  luteal: [
    { label: "Energy",    value: "Winding",        Icon: Zap,      color: "text-rose-400",  bg: "bg-rose-50"  },
    { label: "Hydration", value: "Wind Down",      Icon: Droplets, color: "text-rose-400",     bg: "bg-rose-50"     },
    { label: "Movement",  value: "Gentle Tone",    Icon: Leaf,     color: "text-magenta",  bg: "bg-pink-50"  },
    { label: "Nutrition", value: "Comforting",     Icon: Sprout,   color: "text-magenta",   bg: "bg-pink-50"   },
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

const SYMPTOM_OPTIONS = ["Cramps", "Bloating", "Tender", "Fatigue", "Headache", "Nausea", "Backache"];

const MOOD_LOG_KEY     = "bloom:mood-log-v2";
const SYMPTOMS_LOG_KEY = "bloom:symptoms-log-v2";
const PILL_LOG_KEY     = "bloom:pill-log-v2";

const MOOD_BG_COLOR: Record<string, string> = {
  calm:      "bg-rose-300",
  happy:     "bg-pink-300",
  energetic: "bg-pink-300",
  sensitive: "bg-petal",
  sad:       "bg-rose-200",
  tired:     "bg-pink-200",
  cramps:    "bg-rose-400",
  bloated:   "bg-pink-300",
};

const MOOD_TEXT_COLOR: Record<string, string> = {
  calm:      "text-rose-400",
  happy:     "text-pink-500",
  energetic: "text-magenta",
  sensitive: "text-hotpink",
  sad:       "text-rose-400",
  tired:     "text-rose-300",
  cramps:    "text-rose-500",
  bloated:   "text-magenta",
};

// Wellbeing score for the mood line (1 = lowest, 8 = highest)
const MOOD_SCORE: Record<string, number> = {
  happy: 8, energetic: 7, calm: 6, sensitive: 4,
  bloated: 3, cramps: 2, tired: 2, sad: 1,
};

const PHASE_SVG_COLOR: Record<Exclude<Phase, null>, string> = {
  period:     "rgba(252,162,183,0.18)",
  follicular: "rgba(251,207,232,0.16)",
  fertile:    "rgba(251,207,232,0.18)",
  ovulation:  "rgba(244,114,182,0.18)",
  luteal:     "rgba(251,207,232,0.18)",
};
const PHASE_SVG_LABEL: Record<Exclude<Phase, null>, string> = {
  period: "Period", follicular: "Follic.", fertile: "Fertile",
  ovulation: "Ovul.", luteal: "Luteal",
};
const PHASE_SVG_LABEL_COLOR: Record<Exclude<Phase, null>, string> = {
  period: "#BE185D", follicular: "#DB2777", fertile: "#EC4899",
  ovulation: "#DB2777", luteal: "#BE185D",
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

// Design system helpers
const PHASE_HEX: Record<Exclude<Phase, null>, string> = {
  period:     '#EC4899',
  follicular: '#FB7185',
  fertile:    '#F472B6',
  ovulation:  '#DB2777',
  luteal:     '#BE185D',
};

const PHASE_ICON_PATH: Record<Exclude<Phase, null>, string> = {
  period:     'M12 3.5c3 3.5 5 6.2 5 8.5a5 5 0 0 1-10 0c0-2.3 2-5 5-8.5z',
  follicular: 'M5 13c0-6 5-9 11-9 0 6-5 9-11 9zM5 13c2 .4 4 1.8 5.5 4',
  fertile:    'M12 20S4 14.5 4 9a3.6 3.6 0 0 1 8-2 3.6 3.6 0 0 1 8 2c0 5.5-8 11-8 11Z',
  ovulation:  'M12 3c.4 3.7 1.3 4.6 5 5-3.7.4-4.6 1.3-5 5-.4-3.7-1.3-4.6-5-5 3.7-.4 4.6-1.3 5-5Z',
  luteal:     'M21 12.8A8.3 8.3 0 1 1 11.2 3 6.5 6.5 0 0 0 21 12.8z',
};

function hexRgba(hex: string, a: number): string {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n>>16)&255},${(n>>8)&255},${n&255},${a})`;
}

const JOURNEY_STEPS = [
  { key: 'period'     as const, label: 'Period',     path: PHASE_ICON_PATH.period     },
  { key: 'follicular' as const, label: 'Follicular', path: PHASE_ICON_PATH.follicular },
  { key: 'ovulation'  as const, label: 'Ovul.',      path: PHASE_ICON_PATH.ovulation  },
  { key: 'luteal'     as const, label: 'Luteal',     path: PHASE_ICON_PATH.luteal     },
];

const PHASE_TO_STEP: Record<Exclude<Phase, null>, number> = {
  period: 0, follicular: 1, fertile: 2, ovulation: 2, luteal: 3,
};

export function CycleTracker() {
  const today = useMemo(() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; }, []);
  const [settings, setSettings] = useState<CycleSettings>(() => readCycleSettings());
  const [setupOpen,      setSetupOpen]      = useState(false);
  const [isSetup,        setIsSetup]        = useState(() => hasCycleSettings());
  const [showResetMenu,  setShowResetMenu]  = useState(false);

  function resetAllData() {
    try {
      localStorage.removeItem(CYCLE_SETTINGS_KEY);
      localStorage.removeItem(CYCLE_PHASE_KEY);
      localStorage.removeItem(MOOD_LOG_KEY);
      localStorage.removeItem(SYMPTOMS_LOG_KEY);
      localStorage.removeItem(PILL_LOG_KEY);
    } catch {}
    setIsSetup(false);
    setSettings(DEFAULT_CYCLE_SETTINGS);
    setMoodLog({});
    setSymptomsLog({});
    setPillLog({});
    setShowResetMenu(false);
  }


  useEffect(() => { broadcastCyclePhase(); }, []);

  const containerRef = useRef<HTMLDivElement>(null);
  const graphRef     = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const root = containerRef.current;
    if (!root) return;
    const targets = root.querySelectorAll<HTMLElement>(".reveal-on-scroll, .zoom-reveal");
    if (!targets.length) return;
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            (entry.target as HTMLElement).style.transitionDelay = entry.target.getAttribute("data-reveal-delay") ?? "0ms";
            entry.target.classList.add("revealed");
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.08, rootMargin: "0px 0px -24px 0px" },
    );
    targets.forEach((t) => io.observe(t));
    return () => io.disconnect();
  }, []);

  const [cursor,        setCursor]        = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));
  const [selected,      setSelected]      = useState<Date>(() => today);
  const todayKey                          = dateKey(today);
  const [moodLog,             setMoodLog]           = useState<Record<string, string>>(() => readJSON(MOOD_LOG_KEY, {}));
  const [symptomsLog,         setSymptomsLog]       = useState<Record<string, string[]>>(() => readJSON(SYMPTOMS_LOG_KEY, {}));
  const [pillLog,             setPillLog]           = useState<Record<string, boolean>>(() => readJSON(PILL_LOG_KEY, {}));
  const [showMoodPickerCard,  setShowMoodPickerCard] = useState(false);
  const [slideDir,            setSlideDir]          = useState<"l"|"r">("r");

  // Derived today values
  const moodChecked     = todayKey in moodLog;
  const mood            = moodLog[todayKey] ?? "happy";
  const symptoms        = symptomsLog[todayKey] ?? [];
  const symptomsChecked = symptoms.length > 0;
  const pillTaken       = pillLog[todayKey] ?? false;

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

  const daysToPeriod   = useMemo(() => Math.ceil((nextPeriodDate.getTime() - today.getTime()) / MS_DAY), [nextPeriodDate, today]);
  // ovulationDayOfCycle is 0-indexed (e.g. 14 for a 28-day cycle = cycle day 15)
  // Add the 0-indexed offset directly to currentCycleStart to match phaseForDay logic
  const ovulationDate  = useMemo(() => new Date(currentCycleStart.getTime() + ovulationDayOfCycle       * MS_DAY), [currentCycleStart, ovulationDayOfCycle]);
  const fertileStart   = useMemo(() => new Date(currentCycleStart.getTime() + (ovulationDayOfCycle - 4) * MS_DAY), [currentCycleStart, ovulationDayOfCycle]);
  const fertileEnd     = useMemo(() => new Date(currentCycleStart.getTime() + (ovulationDayOfCycle + 2) * MS_DAY), [currentCycleStart, ovulationDayOfCycle]);

  const isSelectedToday  = sameDay(selected, today);
  const selectedPhase    = useMemo(() => isSelectedToday ? currentPhase : phaseForDay(selected, settings), [selected, settings, isSelectedToday, currentPhase]);

  const pillLabel     = settings.contraceptiveMethod.charAt(0).toUpperCase() + settings.contraceptiveMethod.slice(1);
  const MoodIconToday = MOODS.find((m) => m.key === mood)?.Icon ?? Smile;
  const moodLabelToday= MOODS.find((m) => m.key === mood)?.label ?? "Happy";

  // Phase timeline: 4 steps aligned exactly with phaseForDay ranges
  // ovulationDayOfCycle is 0-indexed; cycleDay is 1-indexed (cycleDay = 0-indexed day + 1)
  // phaseForDay boundaries (0-indexed): period 0..pLen-1, follicular pLen..ovDay-5, fertile ovDay-4..ovDay+2, luteal ovDay+3+
  const journeySteps = [
    { key: "period"     as const, label: "Period",     Icon: Droplet,  active: cycleDay <= settings.periodLength },
    { key: "follicular" as const, label: "Follicular", Icon: Sprout,   active: cycleDay > settings.periodLength && cycleDay <= ovulationDayOfCycle - 4 },
    { key: "ovulation"  as const, label: "Ovulation",  Icon: Sun,      active: cycleDay > ovulationDayOfCycle - 4 && cycleDay <= ovulationDayOfCycle + 3 },
    { key: "luteal"     as const, label: "Luteal",     Icon: Moon,     active: cycleDay > ovulationDayOfCycle + 3 },
  ];
  const activeIdx    = journeySteps.findIndex((s) => s.active);
  const progressPct  = activeIdx >= 0 ? (activeIdx / (journeySteps.length - 1)) * 100 : 0;

  const activeStepIdx = PHASE_TO_STEP[currentPhase];

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
    const isAdding = !symptoms.includes(s);
    setSymptomsLog((prev) => {
      const current = prev[todayKey] ?? [];
      const updated = current.includes(s) ? current.filter((x) => x !== s) : [...current, s];
      const next = { ...prev, [todayKey]: updated };
      try { localStorage.setItem(SYMPTOMS_LOG_KEY, JSON.stringify(next)); } catch {}
      return next;
    });
    if (isAdding && symptoms.length === 0) {
      setTimeout(() => graphRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }), 350);
    }
  };

  function renderWellnessGraph(_gradSuffix: string) {
    const VW = 360, PX = 20, PY_TOP = 14, chartH = 98, VH = PY_TOP + chartH + 26;
    const chartW = VW - PX * 2;
    const cycleLen = settings.cycleLength;

    const BAND_FILL: Record<string, string> = {
      period:     'rgba(236,72,153,.10)',
      follicular: 'rgba(251,113,133,.08)',
      fertile:    'rgba(244,114,182,.12)',
      ovulation:  'rgba(219,39,119,.15)',
      luteal:     'rgba(190,24,93,.10)',
    };

    // Phase bands
    const bands: { phase: Exclude<Phase, null>; x1: number; x2: number }[] = [];
    let prev: Exclude<Phase, null> | null = null, bs = 0;
    for (let i = 0; i <= cycleLen; i++) {
      const ph = i < cycleLen
        ? (phaseForDay(new Date(currentCycleStart.getTime() + i * MS_DAY), settings) as Exclude<Phase, null>)
        : null;
      if (ph !== prev) {
        if (prev !== null) bands.push({ phase: prev, x1: PX + (bs / cycleLen) * chartW, x2: PX + (i / cycleLen) * chartW });
        prev = ph; bs = i;
      }
    }

    const todayIdx = Math.min(cycleDay - 1, cycleLen - 1);
    const xAt = (i: number) => PX + (cycleLen > 1 ? i / (cycleLen - 1) : 0) * chartW;

    type HPt = { x: number; y: number; real: boolean };
    type Run = { pts: [number, number][]; real: boolean };

    function buildRuns(pts: HPt[]): Run[] {
      const result: Run[] = [];
      pts.forEach((pt, i) => {
        const isNew = result.length === 0 || result[result.length - 1].real !== pt.real;
        if (isNew) {
          const run: Run = { pts: [], real: pt.real };
          if (i > 0) run.pts.push([pts[i - 1].x, pts[i - 1].y]);
          result.push(run);
        }
        result[result.length - 1].pts.push([pt.x, pt.y]);
      });
      return result;
    }

    // ── MOOD hybrid line (Day 0 → today) ──
    // High mood score → TOP of chart (low Y). Score 1–8, axis 0–8.
    const moodHybrid: HPt[] = [];
    for (let i = 0; i <= todayIdx; i++) {
      const dk = dateKey(new Date(currentCycleStart.getTime() + i * MS_DAY));
      const m  = moodLog[dk];
      const ph = phaseForDay(new Date(currentCycleStart.getTime() + i * MS_DAY), settings) as Exclude<Phase, null>;
      const x  = xAt(i);
      const y  = m
        ? PY_TOP + (1 - (MOOD_SCORE[m] ?? 4) / 8) * chartH
        : PY_TOP + (1 - PHASE_MOOD_EST[ph] / 8) * chartH;
      moodHybrid.push({ x, y, real: !!m });
    }
    const moodRuns = buildRuns(moodHybrid);

    // ── SYMPTOM hybrid line (Day 0 → today) ──
    // More symptoms → BOTTOM of chart (high Y). Count 0–7.
    const maxSympt = SYMPTOM_OPTIONS.length;
    const symptHybrid: HPt[] = [];
    for (let i = 0; i <= todayIdx; i++) {
      const dk   = dateKey(new Date(currentCycleStart.getTime() + i * MS_DAY));
      const syms = symptomsLog[dk] ?? [];
      const ph   = phaseForDay(new Date(currentCycleStart.getTime() + i * MS_DAY), settings) as Exclude<Phase, null>;
      const x    = xAt(i);
      const frac = syms.length > 0
        ? syms.length / maxSympt
        : PHASE_SYMPT_EST[ph] / maxSympt;
      symptHybrid.push({ x, y: PY_TOP + frac * chartH, real: syms.length > 0 });
    }
    const symptRuns = buildRuns(symptHybrid);

    // ── FUTURE estimate lines (today → end) ──
    const futureMoodPts: [number, number][]  = [];
    const futureSymptPts: [number, number][] = [];
    for (let i = todayIdx; i < cycleLen; i++) {
      const ph = phaseForDay(new Date(currentCycleStart.getTime() + i * MS_DAY), settings) as Exclude<Phase, null>;
      futureMoodPts.push([xAt(i),  PY_TOP + (1 - PHASE_MOOD_EST[ph] / 8) * chartH]);
      futureSymptPts.push([xAt(i), PY_TOP + (PHASE_SYMPT_EST[ph] / maxSympt) * chartH]);
    }
    const futureMoodLine  = smoothLinePath(futureMoodPts);
    const futureSymptLine = smoothLinePath(futureSymptPts);

    // Today dot follows real mood if logged, else estimate
    const todayMoodHpt = moodHybrid[moodHybrid.length - 1];
    const todayDotX = todayMoodHpt?.x ?? xAt(todayIdx);
    const todayDotY = todayMoodHpt?.y ?? PY_TOP + chartH / 2;

    return (
      <>
        <p className="font-script leading-none mb-1" style={{ fontSize: '22px', color: '#DB2777' }}>This cycle</p>
        {/* 2×2 legend */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '3px 12px', marginBottom: '5px' }}>
          {[
            { color: '#EC4899', dash: false, label: 'Mood logged' },
            { color: '#DB2777', dash: true,  label: 'Mood estimate' },
            { color: '#FB7185', dash: false, label: 'Symptoms logged' },
            { color: '#FECDD3', dash: true,  label: 'Symptom estimate' },
          ].map((item) => (
            <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <svg width="16" height="4" style={{ overflow: 'visible', flexShrink: 0 }}>
                <line x1="0" y1="2" x2="16" y2="2" stroke={item.color} strokeWidth={item.dash ? '2' : '3'}
                  strokeDasharray={item.dash ? '3 3' : undefined} strokeLinecap="round" />
              </svg>
              <span style={{ fontSize: '8.5px', fontWeight: 700, color: '#9D5C7E', lineHeight: 1 }}>{item.label}</span>
            </div>
          ))}
        </div>
        <svg viewBox={`0 0 ${VW} ${VH}`} width="100%" style={{ display: 'block', overflow: 'visible' }} aria-hidden>
          {/* Phase bands */}
          {bands.map((b, bi) => (
            <rect key={bi} x={b.x1} y={PY_TOP} width={b.x2 - b.x1} height={chartH} rx="6" fill={BAND_FILL[b.phase]} />
          ))}
          {/* Future dashed estimate lines */}
          {futureSymptLine && <path d={futureSymptLine} fill="none" stroke="#FECDD3" strokeWidth="2"
            strokeLinecap="round" strokeLinejoin="round" strokeDasharray="2 5" opacity=".7" />}
          {futureMoodLine && <path d={futureMoodLine} fill="none" stroke="#DB2777" strokeWidth="2"
            strokeLinecap="round" strokeLinejoin="round" strokeDasharray="2 6" opacity=".5" />}
          {/* Symptom hybrid past runs — rose tones */}
          {symptRuns.map((run, ri) => {
            const d = smoothLinePath(run.pts);
            return d ? (
              <path key={`sr${ri}`} d={d} fill="none"
                stroke={run.real ? '#FB7185' : '#FECDD3'}
                strokeWidth={run.real ? '3' : '2'}
                strokeDasharray={run.real ? undefined : '3 5'}
                strokeLinecap="round" strokeLinejoin="round"
                opacity={run.real ? 0.9 : 0.65}
              />
            ) : null;
          })}
          {/* Mood hybrid past runs — pink/lavender tones (on top) */}
          {moodRuns.map((run, ri) => {
            const d = smoothLinePath(run.pts);
            return d ? (
              <path key={`mr${ri}`} d={d} fill="none"
                stroke={run.real ? '#EC4899' : '#DB2777'}
                strokeWidth={run.real ? '3.5' : '2.5'}
                strokeDasharray={run.real ? undefined : '3 5'}
                strokeLinecap="round" strokeLinejoin="round"
                opacity={run.real ? 1 : 0.65}
              />
            ) : null;
          })}
          {/* Today circle on mood line */}
          <circle cx={todayDotX} cy={todayDotY} r="5" fill="#fff" stroke="#EC4899" strokeWidth="3" />
          {/* Labels */}
          <text x={PX} y={VH - 4} textAnchor="start" fontSize="9.5" fontWeight="600" fill="#9D5C7E">Day 1</text>
          <text x={todayDotX} y={VH - 4} textAnchor="middle" fontSize="10" fontWeight="700" fill="#DB2777">today</text>
          <text x={VW - PX} y={VH - 4} textAnchor="end" fontSize="9.5" fontWeight="600" fill="#9D5C7E">Day {cycleLen}</text>
        </svg>
        <p style={{ margin: '4px 0 0', fontSize: '10px', fontWeight: 500, color: '#9D5C7E', lineHeight: 1.45 }}>
          Both curves build as you log — solid lines are real, dashed are estimates.
        </p>
      </>
    );
  }

  // ── Suggestions rows for both mobile card and desktop panel ──
  function renderSuggestions() {
    // Same source of truth as the Today page so recommendations always match.
    const sp = SHARED_PHASE_PLAN[selectedPhase];
    const items = [
      { tag: "Yoga",    title: sp.yoga.title,    img: sp.yoga.image,    href: "/app/tools/yoga",    gradFrom: "#F472B6", gradTo: "#EC4899", launch: { key: LAUNCH_YOGA_KEY, val: sp.yoga.launch } },
      { tag: "Workout", title: sp.workout.title, img: sp.workout.image, href: "/app/tools/workout", gradFrom: "#FB7185", gradTo: "#DB2777", launch: { key: LAUNCH_WORKOUT_KEY, val: sp.workout.launch } },
      { tag: "Meal",    title: sp.meal.title,    img: sp.meal.image,    href: "/app/tools/diet",    gradFrom: "#F9A8D4", gradTo: "#BE185D", launch: null as null | { key: string; val: unknown } },
    ];
    return (
      <div className="flex flex-col gap-[9px] mt-3">
        {items.map((item, idx) => (
          <a
            key={item.tag}
            href={item.href}
            onClick={() => { if (item.launch) writeLaunch(item.launch.key, item.launch.val); }}
            className="reveal-on-scroll hover-scale flex items-center gap-[13px] rounded-[15px] cursor-pointer no-underline transition-all duration-200 active:scale-95"
            data-reveal-delay={`${idx * 130}ms`}
            style={{ padding: '10px', background: 'rgba(255,245,249,0.8)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.45)' }}
          >
            {/* Phase image — big, no icon overlay, just a soft brand tint */}
            <div
              className="relative flex-none rounded-[14px] overflow-hidden"
              style={{
                width: 68, height: 68,
                boxShadow: `0 0 18px ${item.gradFrom}55, 0 4px 12px rgba(0,0,0,.12)`,
                animation: `ctaBreathe ${3 + idx * 0.4}s ease-in-out infinite`,
              }}
            >
              <img src={item.img} alt="" loading="lazy" decoding="async" className="h-full w-full object-cover" />
              {/* Light brand tint — no icon */}
              <div
                className="absolute inset-0"
                style={{ background: `linear-gradient(135deg,${item.gradFrom}28,transparent 65%)` }}
              />
            </div>
            <div className="flex-1 min-w-0">
              <p style={{ fontSize: '9px', fontWeight: 700, letterSpacing: '.05em', color: '#9D5C7E', textTransform: 'uppercase' }}>{item.tag}</p>
              <p style={{ fontWeight: 700, fontSize: '14px', color: '#831843', marginTop: '2px', lineHeight: 1.3 }}>{item.title}</p>
            </div>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#DB2777" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 6l6 6-6 6"/>
            </svg>
          </a>
        ))}
      </div>
    );
  }

  const cardStyle = {
    background: 'rgba(255,255,255,0.72)',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    borderRadius: '22px',
    padding: '16px',
    boxShadow: '0 8px 24px rgba(236,72,153,0.12), 0 1px 3px rgba(0,0,0,0.05)',
    border: '1px solid rgba(255,255,255,0.55)',
  };

  return (
    <div ref={containerRef} className="relative animate-fade-in" style={{ color: '#831843' }}>
      {/* Decorative background blobs — give glass cards something to blur through */}
      <div aria-hidden style={{ position: 'absolute', top: -80, right: -60, width: 340, height: 340, borderRadius: '50%', background: 'radial-gradient(circle,rgba(236,72,153,.18) 0%,transparent 70%)', pointerEvents: 'none', zIndex: 0 }} />
      <div aria-hidden style={{ position: 'absolute', top: '38%', left: -90, width: 300, height: 300, borderRadius: '50%', background: 'radial-gradient(circle,rgba(244,114,182,.14) 0%,transparent 70%)', pointerEvents: 'none', zIndex: 0 }} />
      <div aria-hidden style={{ position: 'absolute', bottom: '12%', right: -50, width: 260, height: 260, borderRadius: '50%', background: 'radial-gradient(circle,rgba(251,207,232,.28) 0%,transparent 70%)', pointerEvents: 'none', zIndex: 0 }} />

      <div className="relative z-10 lg:grid lg:grid-cols-5 lg:items-start lg:gap-6">

        {/* ══════════════ LEFT COLUMN (60%) ══════════════ */}
        <div className="lg:col-span-3 space-y-3.5 pb-32 lg:pb-0">

          {/* ── PHASE HERO CARD ── */}
          <div
            className="relative overflow-hidden rounded-[22px]"
            style={{ background: 'linear-gradient(125deg,#EC4899,#DB2777 65%,#9D174D)', padding: '18px 18px 16px' }}
          >
            {/* Background photo — full-width, masked to fade left→right seamlessly */}
            <img
              src="/images/cycle-insight-hero.webp"
              alt="" aria-hidden loading="eager" decoding="async"
              className="absolute inset-0 h-full w-full object-cover object-top pointer-events-none"
              style={{
                opacity: 0.45,
                maskImage: 'linear-gradient(to right, transparent 0%, rgba(0,0,0,0.05) 28%, rgba(0,0,0,0.55) 52%, black 72%)',
                WebkitMaskImage: 'linear-gradient(to right, transparent 0%, rgba(0,0,0,0.05) 28%, rgba(0,0,0,0.55) 52%, black 72%)',
              }}
            />
            {/* Decorative blurred circle top-right */}
            <div
              aria-hidden
              style={{
                position: 'absolute', right: -20, top: -20,
                width: 120, height: 120, borderRadius: '50%',
                background: 'rgba(255,255,255,.13)', filter: 'blur(14px)',
              }}
            />
            {/* "Cycle Tracker" title inside the hero */}
            <h1 className="font-script animate-scale-in" style={{ fontSize: '34px', lineHeight: 1, color: 'white', marginBottom: '10px' }}>
              Cycle Tracker
            </h1>

            {/* Phase chip */}
            <div
              className="inline-flex items-center gap-[7px] rounded-full px-3 py-1.5"
              style={{ background: 'rgba(255,255,255,.22)', border: '1px solid rgba(255,255,255,.4)' }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" style={{ color: 'white' }}>
                <path d={PHASE_ICON_PATH[currentPhase]} />
              </svg>
              <span style={{ color: 'white', fontSize: '10px', fontWeight: 800, letterSpacing: '.08em' }}>
                {PHASE_LABEL[currentPhase].toUpperCase()} PHASE
              </span>
            </div>

            {/* Day heading */}
            <h2 className="font-script" style={{ fontSize: '38px', lineHeight: 1, marginTop: '11px', color: 'white' }}>
              Day {cycleDay}
            </h2>

            {/* Phase subtitle */}
            <p style={{ fontSize: '13px', fontWeight: 500, marginTop: '6px', color: 'rgba(255,255,255,.92)' }}>
              {PHASE_SUBTITLE[currentPhase]}
            </p>

            {/* Journey stepper — two-row layout so labels sit exactly under their nodes */}
            <div className="w-full mt-4" style={{ paddingBottom: '4px' }}>
              {/* Row 1: nodes + connectors flat */}
              <div className="flex items-center w-full">
                {JOURNEY_STEPS.flatMap((step, i) => {
                  const isPast   = i < activeStepIdx;
                  const isActive = i === activeStepIdx;
                  const isFuture = i > activeStepIdx;
                  const sz = isActive ? 32 : 26;
                  const elems = [
                    <div
                      key={`n${i}`}
                      className="grid place-items-center rounded-full"
                      style={{
                        width: sz, height: sz, flexShrink: 0,
                        background: isFuture ? 'rgba(255,255,255,.18)' : 'white',
                        border: isFuture ? '2px solid rgba(255,255,255,.6)' : 'none',
                        boxShadow: isActive ? '0 0 0 3px rgba(255,255,255,.35)' : isPast ? '0 2px 6px rgba(0,0,0,.2)' : 'none',
                        animation: isActive ? 'phaseNodeGlow 2.8s ease-in-out infinite' : 'none',
                        transition: 'all .3s ease',
                      }}
                    >
                      <svg width={isActive ? 16 : 13} height={isActive ? 16 : 13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
                        style={{ color: isFuture ? 'rgba(255,255,255,.5)' : '#EC4899' }}>
                        <path d={step.path} />
                      </svg>
                    </div>,
                  ];
                  if (i < JOURNEY_STEPS.length - 1) {
                    elems.push(
                      <div key={`c${i}`} style={{
                        flex: 1, height: 3, borderRadius: 2,
                        background: isPast ? 'white' : isActive ? 'rgba(255,255,255,.7)' : 'rgba(255,255,255,.25)',
                        boxShadow: isPast ? '0 0 4px rgba(255,255,255,.5)' : 'none',
                      }} />
                    );
                  }
                  return elems;
                })}
              </div>
              {/* Row 2: labels — same node widths + flex-1 spacers → perfect centering under each node */}
              <div className="flex w-full" style={{ marginTop: '6px' }}>
                {JOURNEY_STEPS.flatMap((step, i) => {
                  const isActive = i === activeStepIdx;
                  const isFuture = i > activeStepIdx;
                  const sz = isActive ? 32 : 26;
                  const elems = [
                    <div key={`l${i}`} style={{ width: sz, flexShrink: 0, display: 'flex', justifyContent: 'center' }}>
                      <span style={{
                        fontSize: '9px', fontWeight: isActive ? 800 : 600,
                        color: isFuture ? 'rgba(255,255,255,.5)' : isActive ? 'white' : 'rgba(255,255,255,.9)',
                        lineHeight: 1.2, whiteSpace: 'nowrap',
                        textShadow: isActive ? '0 1px 4px rgba(0,0,0,.2)' : 'none',
                      }}>
                        {step.label}
                      </span>
                    </div>,
                  ];
                  if (i < JOURNEY_STEPS.length - 1) {
                    elems.push(<div key={`s${i}`} style={{ flex: 1 }} />);
                  }
                  return elems;
                })}
              </div>
            </div>
          </div>

          {/* ── STAT CARDS (2×2 on phone, 4-up on tablet+) ── */}
          <div className={["transition-all duration-700", !isSetup ? "grayscale opacity-40 pointer-events-none select-none" : ""].join(" ")}>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-[9px] md:gap-3 mt-3.5">
              {/* Next Period */}
              <div style={{ background: 'rgba(255,255,255,0.72)', backdropFilter: 'blur(18px)', WebkitBackdropFilter: 'blur(18px)', borderRadius: '18px', padding: '10px 12px', boxShadow: '0 6px 18px rgba(236,72,153,.10)', border: '1px solid rgba(255,255,255,0.5)' }}>
                <p style={{ fontSize: '8.5px', fontWeight: 700, letterSpacing: '.06em', color: '#9D5C7E', textTransform: 'uppercase' }}>Next Period</p>
                <p className="font-script" style={{ fontSize: '21px', lineHeight: 1, marginTop: '3px', color: '#EC4899' }}>{fmtDate(nextPeriodDate)}</p>
                <p style={{ fontSize: '10px', fontWeight: 600, color: '#9D5C7E' }}>in {daysToPeriod} days</p>
              </div>
              {/* Fertile */}
              <div style={{ background: 'rgba(255,255,255,0.72)', backdropFilter: 'blur(18px)', WebkitBackdropFilter: 'blur(18px)', borderRadius: '18px', padding: '10px 12px', boxShadow: '0 6px 18px rgba(236,72,153,.10)', border: '1px solid rgba(255,255,255,0.5)' }}>
                <p style={{ fontSize: '8.5px', fontWeight: 700, letterSpacing: '.06em', color: '#9D5C7E', textTransform: 'uppercase' }}>Fertile</p>
                <p className="font-script" style={{ fontSize: '21px', lineHeight: 1, marginTop: '3px', color: '#F472B6' }}>{fmtDate(fertileStart)}</p>
                <p style={{ fontSize: '10px', fontWeight: 600, color: '#9D5C7E' }}>→ {fmtDate(fertileEnd)}</p>
              </div>
              {/* Ovulation */}
              <div style={{ background: 'rgba(255,255,255,0.72)', backdropFilter: 'blur(18px)', WebkitBackdropFilter: 'blur(18px)', borderRadius: '18px', padding: '10px 12px', boxShadow: '0 6px 18px rgba(236,72,153,.10)', border: '1px solid rgba(255,255,255,0.5)' }}>
                <p style={{ fontSize: '8.5px', fontWeight: 700, letterSpacing: '.06em', color: '#9D5C7E', textTransform: 'uppercase' }}>Ovulation</p>
                <p className="font-script" style={{ fontSize: '21px', lineHeight: 1, marginTop: '3px', color: '#DB2777' }}>{fmtDate(ovulationDate)}</p>
                <p style={{ fontSize: '10px', fontWeight: 600, color: '#9D5C7E' }}>day {ovulationDayOfCycle + 1}</p>
              </div>
              {/* Daily Pill */}
              <div style={{ background: 'rgba(255,255,255,0.72)', backdropFilter: 'blur(18px)', WebkitBackdropFilter: 'blur(18px)', borderRadius: '18px', padding: '10px 12px', boxShadow: '0 6px 18px rgba(236,72,153,.10)', border: '1px solid rgba(255,255,255,0.5)' }}>
                <p style={{ fontSize: '8.5px', fontWeight: 700, letterSpacing: '.06em', color: '#9D5C7E', textTransform: 'uppercase' }}>Daily {pillLabel}</p>
                <p className="font-script" style={{ fontSize: '21px', lineHeight: 1, marginTop: '3px', color: '#BE185D' }}>
                  {pillTaken ? "Taken ✓" : "Log it"}
                </p>
                <div className="flex items-center gap-2 mt-[5px]">
                  <button
                    onClick={() => {
                      const next = { ...pillLog, [todayKey]: !pillTaken };
                      setPillLog(next);
                      try { localStorage.setItem(PILL_LOG_KEY, JSON.stringify(next)); } catch {}
                    }}
                    style={{
                      background: pillTaken ? '#FCE7F3' : '#BE185D',
                      color: pillTaken ? '#DB2777' : 'white',
                      fontSize: '9.5px',
                      padding: '3px 8px',
                      borderRadius: '999px',
                      border: 'none',
                      cursor: 'pointer',
                      fontWeight: 700,
                      fontFamily: 'inherit',
                    }}
                  >
                    {pillTaken ? "Undo" : "Mark taken"}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* ── TODAY FOR YOUR PHASE ── */}
          <div className={["transition-all duration-700", !isSetup ? "grayscale opacity-40 pointer-events-none select-none" : ""].join(" ")} style={cardStyle}>
            <div className="flex items-center gap-2 mb-1">
              <span className="grid place-items-center rounded-full" style={{ width: 24, height: 24, background: 'linear-gradient(135deg,#EC4899,#DB2777)' }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="white"><path d={PHASE_ICON_PATH[currentPhase]} /></svg>
              </span>
              <h3 className="font-script" style={{ fontSize: '20px', color: '#DB2777' }}>Today, in your {PHASE_LABEL[currentPhase].toLowerCase()} phase</h3>
            </div>
            <p style={{ fontSize: '11.5px', lineHeight: 1.5, color: '#9D5C7E', marginBottom: '11px' }}>{PHASE_INSIGHT[currentPhase]}</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-[9px] md:gap-2.5">
              {PHASE_TODAY_INSIGHTS[currentPhase].map((it) => (
                <div key={it.label} className={["rounded-2xl p-2.5 flex flex-col gap-1", it.bg].join(" ")} style={{ border: '1px solid rgba(236,72,153,.08)' }}>
                  <span className={["grid h-7 w-7 place-items-center rounded-full bg-white/70", it.color].join(" ")}>
                    <it.Icon className="h-3.5 w-3.5" strokeWidth={1.8} />
                  </span>
                  <p style={{ fontSize: '8px', fontWeight: 700, letterSpacing: '.05em', color: '#9D5C7E', textTransform: 'uppercase' }}>{it.label}</p>
                  <p className={["text-[12px] font-bold leading-tight", it.color].join(" ")}>{it.value}</p>
                </div>
              ))}
            </div>
          </div>

          {/* ── CALENDAR CARD ── */}
          <div style={{ ...cardStyle, position: 'relative' }}>
            {/* Setup overlay */}
            {!isSetup && (
              <div className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-3 rounded-[22px] animate-fade-in" style={{ background: 'rgba(255,255,255,.92)' }}>
                <div className="grid h-12 w-12 place-items-center rounded-full animate-selected-glow" style={{ background: '#FCE7F3' }}>
                  <CalendarDays className="h-6 w-6" style={{ color: '#EC4899' }} />
                </div>
                <div className="text-center">
                  <p className="font-script text-2xl leading-none" style={{ color: '#EC4899' }}>Set me up ♥</p>
                  <p className="mt-1 text-[10px] max-w-[170px] leading-snug" style={{ color: '#9D5C7E' }}>
                    Tell us when your last period was and we'll colour your whole cycle
                  </p>
                </div>
                <button
                  onClick={() => setSetupOpen(true)}
                  className="animate-cta-bounce px-5 py-2 text-[11px] font-bold text-white rounded-full"
                  style={{ background: 'linear-gradient(135deg,#EC4899,#DB2777)', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}
                >
                  Get started ♥
                </button>
              </div>
            )}

            {/* Month nav + Settings */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-1">
                <button
                  onClick={() => shift(-1)}
                  className="grid place-items-center rounded-full"
                  style={{ width: 28, height: 28, background: '#FCE7F3', border: 'none', cursor: 'pointer', color: '#DB2777' }}
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <h3 className="font-script px-2" style={{ fontSize: '20px', color: '#DB2777' }}>
                  {MONTHS[cursor.getMonth()]} {cursor.getFullYear()}
                </h3>
                <button
                  onClick={() => shift(1)}
                  className="grid place-items-center rounded-full"
                  style={{ width: 28, height: 28, background: '#FCE7F3', border: 'none', cursor: 'pointer', color: '#DB2777' }}
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
              {/* Settings button — moved here from header */}
              <div className="relative">
                <button
                  onClick={() => isSetup ? setShowResetMenu(v => !v) : setSetupOpen(true)}
                  className="inline-flex items-center gap-1 rounded-full font-bold animate-card-breathe"
                  style={{ padding: '5px 11px', background: '#FCE7F3', border: 'none', cursor: 'pointer', color: '#DB2777', fontSize: '10px', fontFamily: 'inherit', boxShadow: '0 2px 8px rgba(236,72,153,.18)' }}
                >
                  <Settings className="h-3 w-3" /> Settings
                </button>
                {showResetMenu && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setShowResetMenu(false)} />
                    <div className="absolute right-0 bottom-full mb-1 z-20 w-36 animate-scale-in rounded-xl bg-white border shadow-xl overflow-hidden" style={{ borderColor: 'rgba(236,72,153,.12)' }}>
                      <button
                        onClick={() => { setShowResetMenu(false); setSetupOpen(true); }}
                        className="w-full text-left px-3 py-2 text-[10px] font-semibold hover:bg-pink-50 transition"
                        style={{ color: '#9D5C7E' }}
                      >
                        Edit settings
                      </button>
                      <button
                        onClick={resetAllData}
                        className="w-full text-left px-3 py-2 text-[10px] font-semibold hover:bg-rose-50 transition border-t"
                        style={{ color: '#EC4899', borderColor: 'rgba(236,72,153,.08)' }}
                      >
                        Reset all data
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Weekday labels */}
            <div className="grid grid-cols-7 text-center mb-1.5">
              {["S","M","T","W","T","F","S"].map((d, i) => (
                <div key={i} style={{ fontSize: '9.5px', fontWeight: 700, letterSpacing: '.06em', color: '#9D5C7E', textAlign: 'center' }}>{d}</div>
              ))}
            </div>

            {/* Day grid */}
            <div
              key={`${cursor.getFullYear()}-${cursor.getMonth()}-${slideDir}`}
              className="grid grid-cols-7 animate-fade-in"
              style={{ gap: '5px' }}
            >
              {days.map((d, i) => {
                if (!d) return <div key={i} />;
                const phase          = phaseForDay(d, settings);
                const isSelected     = sameDay(d, selected);
                const isToday        = sameDay(d, today);
                const isFutureDay    = d > today;
                const dk             = dateKey(d);
                const loggedMood     = moodLog[dk];
                const loggedSymptoms = symptomsLog[dk] ?? [];
                const pillTakenDay   = pillLog[dk] ?? false;
                const isOvulation    = sameDay(d, ovulationDate);
                const phaseHex       = PHASE_HEX[phase];

                const cellBg = isFutureDay
                  ? hexRgba(phaseHex, 0.06)
                  : hexRgba(phaseHex, 0.16);
                const cellBorder = isFutureDay
                  ? `1px dashed ${hexRgba(phaseHex, 0.4)}`
                  : 'none';

                return (
                  <button
                    key={i}
                    onClick={() => setSelected(d)}
                    title={`${d.getDate()} · ${PHASE_LABEL[phase]}`}
                    className={["relative aspect-square border-none cursor-pointer rounded-xl flex flex-col items-center justify-center gap-[2px] transition-all duration-200 hover:scale-105 active:scale-90", isToday ? "animate-selected-glow" : ""].join(" ")}
                    style={{ background: cellBg, border: cellBorder }}
                  >
                    {/* PEAK badge for ovulation day */}
                    {isOvulation && (
                      <span style={{
                        position: 'absolute', top: -9, left: '50%', transform: 'translateX(-50%)',
                        background: '#DB2777', color: '#fff', fontSize: '8px', fontWeight: 800,
                        padding: '2px 6px', borderRadius: '999px', whiteSpace: 'nowrap', zIndex: 2,
                      }}>PEAK</span>
                    )}
                    {/* Selection glow ring */}
                    {isSelected && (
                      <span
                        className="absolute inset-0 rounded-xl pointer-events-none"
                        style={{ border: '2px solid #EC4899', borderRadius: '12px', animation: 'calSelGlow 2.6s ease-in-out infinite' }}
                      />
                    )}
                    {/* Date number */}
                    <span style={{ fontWeight: 700, fontSize: '12px', color: '#831843', lineHeight: 1 }}>{d.getDate()}</span>
                    {/* Phase icon */}
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
                      style={{ color: isFutureDay ? hexRgba(phaseHex, 0.45) : phaseHex }}>
                      <path d={PHASE_ICON_PATH[phase]} />
                    </svg>
                    {/* Logged data dots */}
                    {(loggedMood || pillTakenDay || loggedSymptoms.length > 0) && (
                      <div className="flex items-center gap-[2px]">
                        {loggedMood && <span className="rounded-full" style={{ width: 4, height: 4, background: '#EC4899' }} />}
                        {pillTakenDay && <span className="rounded-full" style={{ width: 4, height: 4, background: '#DB2777' }} />}
                        {loggedSymptoms.length > 0 && <span className="rounded-full" style={{ width: 4, height: 4, background: '#FB7185' }} />}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Legend */}
            <div
              className="flex flex-wrap justify-center mt-[13px] pt-[11px]"
              style={{ gap: '9px', borderTop: '1px solid rgba(236,72,153,.1)' }}
            >
              {(Object.entries(PHASE_HEX) as [Exclude<Phase, null>, string][]).map(([phase, hex]) => (
                <div key={phase} className="inline-flex items-center" style={{ gap: '5px', fontSize: '10px', fontWeight: 700, color: '#9D5C7E' }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={hex} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d={PHASE_ICON_PATH[phase]} />
                  </svg>
                  {PHASE_LABEL[phase]}
                </div>
              ))}
            </div>
          </div>

          {/* ── WELLNESS GRAPH — right after calendar on mobile/tablet ── */}
          <div
            ref={graphRef}
            className={["lg:hidden rounded-[22px] p-4 reveal-on-scroll transition-all duration-700", !isSetup ? "grayscale opacity-40 pointer-events-none select-none" : ""].join(" ")}
            style={{ background: 'rgba(255,255,255,0.72)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.55)', boxShadow: '0 8px 24px rgba(236,72,153,.12)' }}
          >
            {renderWellnessGraph("mob")}
          </div>

          {/* ── MOOD CARD (mobile/tablet, lg:hidden in desktop right panel) ── */}
          <div style={{ ...cardStyle }} className="lg:hidden">
            <h3 className="font-script" style={{ fontSize: '23px', color: '#DB2777' }}>How are you feeling?</h3>
            <div className="grid grid-cols-4 gap-[7px] mt-3">
              {MOODS.map((m) => {
                const isActive = moodLog[todayKey] === m.key;
                return (
                  <button
                    key={m.key}
                    onClick={() => {
                      const next = { ...moodLog, [todayKey]: m.key };
                      setMoodLog(next);
                      try { localStorage.setItem(MOOD_LOG_KEY, JSON.stringify(next)); } catch {}
                    }}
                    style={{
                      border: 'none',
                      cursor: 'pointer',
                      fontFamily: 'inherit',
                      fontWeight: 700,
                      fontSize: '10.5px',
                      padding: '9px 3px',
                      borderRadius: '13px',
                      transition: 'transform .15s cubic-bezier(.34,1.56,.64,1)',
                      background: isActive ? 'linear-gradient(135deg,#EC4899,#DB2777)' : '#FCE7F3',
                      color: isActive ? '#fff' : '#9D5C7E',
                      boxShadow: isActive ? '0 6px 16px rgba(236,72,153,.35)' : 'none',
                    }}
                  >
                    {m.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── SYMPTOMS CARD ── */}
          <div style={{ ...cardStyle }}>
            <h3 className="font-script" style={{ fontSize: '21px', color: '#DB2777' }}>Log symptoms</h3>
            <div className="flex flex-wrap mt-[11px]" style={{ gap: '7px' }}>
              {SYMPTOM_OPTIONS.map((s) => {
                const active = symptoms.includes(s);
                return (
                  <button
                    key={s}
                    onClick={() => toggleSymptom(s)}
                    style={{
                      border: active ? 'none' : '1px solid rgba(236,72,153,.18)',
                      cursor: 'pointer',
                      fontFamily: 'inherit',
                      fontWeight: 700,
                      fontSize: '11.5px',
                      padding: '8px 13px',
                      borderRadius: '999px',
                      transition: 'transform .15s cubic-bezier(.34,1.56,.64,1)',
                      background: active ? '#EC4899' : '#FFF0F6',
                      color: active ? '#fff' : '#9D5C7E',
                      boxShadow: active ? '0 6px 14px rgba(236,72,153,.3)' : 'none',
                    }}
                  >
                    {s}
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── SUGGESTIONS CARD (mobile/tablet) ── */}
          <div style={{ ...cardStyle }} className="reveal-on-scroll lg:hidden">
            <h3 className="font-script reveal-on-scroll" data-reveal-delay="60ms" style={{ fontSize: '21px', color: '#DB2777' }}>For this phase</h3>
            {renderSuggestions()}
          </div>

          {/* ── AFFIRMATION CARD ── */}
          <div className="relative rounded-[22px] overflow-hidden" style={{ minHeight: '120px' }}>
            <img
              src="/images/cycle-journal-hero.webp"
              alt="" aria-hidden loading="lazy" decoding="async"
              className="absolute inset-0 h-full w-full object-cover object-center animate-photo-breathe"
            />
            {/* Pink gradient overlay — keeps text readable */}
            <div className="absolute inset-0" style={{ background: 'linear-gradient(to right, rgba(252,231,243,.95) 0%, rgba(251,207,232,.88) 55%, rgba(251,207,232,.35) 100%)' }} />
            <div className="absolute inset-0 bg-gradient-to-bl from-pink-400/25 via-transparent to-transparent" />
            <div className="relative z-10 p-4 max-w-[260px]">
              <p style={{ fontSize: '9.5px', fontWeight: 700, letterSpacing: '.07em', color: '#DB2777', textTransform: 'uppercase' }}>
                DAILY AFFIRMATION
              </p>
              <p className="font-script font-bold" style={{ fontSize: '21px', lineHeight: 1.2, marginTop: '8px', color: '#9D174D' }}>
                {PHASE_AFFIRMATIONS[currentPhase]}
              </p>
              <a
                href="/app/tools/diary"
                className="inline-flex items-center gap-1.5 animate-cta-bounce"
                style={{ background: '#DB2777', color: '#fff', borderRadius: '999px', padding: '9px 16px', fontWeight: 700, fontSize: '12px', marginTop: '12px', textDecoration: 'none' }}
              >
                <PenLine className="h-3.5 w-3.5" /> Write Entry
              </a>
            </div>
          </div>

        </div>{/* /lg:col-span-3 */}

        {/* ══════════════ RIGHT PANEL (40%) — desktop sticky ══════════════ */}
        <aside
          className={["reveal-on-scroll hidden lg:block lg:col-span-2 lg:sticky lg:top-4 transition-all duration-700", !isSetup ? "grayscale opacity-40 pointer-events-none select-none" : ""].join(" ")}
          style={{
            background: 'rgba(255,255,255,0.72)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            borderRadius: '26px',
            padding: '20px',
            border: '1px solid rgba(255,255,255,0.55)',
            boxShadow: '0 8px 24px rgba(236,72,153,.12)',
          }}
        >
          {/* Mood picker */}
          <div className="mb-5">
            <h3 className="font-script mb-3" style={{ fontSize: '21px', color: '#DB2777' }}>How are you feeling?</h3>
            <div className="grid grid-cols-4 gap-[7px]">
              {MOODS.map((m) => {
                const isActive = moodLog[todayKey] === m.key;
                return (
                  <button
                    key={m.key}
                    onClick={() => {
                      const next = { ...moodLog, [todayKey]: m.key };
                      setMoodLog(next);
                      try { localStorage.setItem(MOOD_LOG_KEY, JSON.stringify(next)); } catch {}
                    }}
                    style={{
                      border: 'none',
                      cursor: 'pointer',
                      fontFamily: 'inherit',
                      fontWeight: 700,
                      fontSize: '10.5px',
                      padding: '9px 3px',
                      borderRadius: '13px',
                      transition: 'transform .15s cubic-bezier(.34,1.56,.64,1)',
                      background: isActive ? 'linear-gradient(135deg,#EC4899,#DB2777)' : '#FCE7F3',
                      color: isActive ? '#fff' : '#9D5C7E',
                      boxShadow: isActive ? '0 6px 16px rgba(236,72,153,.35)' : 'none',
                    }}
                  >
                    {m.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Wellness graph */}
          <div className="mb-5 pb-5" style={{ borderBottom: '1px solid rgba(236,72,153,.1)' }}>
            {renderWellnessGraph("desk")}
          </div>

          {/* Suggestions */}
          <div className="mb-5">
            <h3 className="font-script reveal-on-scroll" data-reveal-delay="0ms" style={{ fontSize: '21px', color: '#DB2777' }}>For this phase</h3>
            {renderSuggestions()}
            <a
              href="/app/tools/yoga"
              className="zoom-reveal inline-flex w-full items-center justify-center gap-2 rounded-full font-bold text-white mt-4"
              style={{
                padding: '12px 20px',
                fontSize: '14px',
                background: 'linear-gradient(135deg,#EC4899,#DB2777)',
                textDecoration: 'none',
                animation: 'ctaBreathe 3.2s ease-in-out infinite',
              }}
              data-reveal-delay="360ms"
            >
              <Play className="h-4 w-4 fill-white" /> Start 15-Min Flow
            </a>
          </div>

          {/* Affirmation */}
          <div className="relative rounded-[22px] overflow-hidden" style={{ minHeight: '100px' }}>
            <img src="/images/cycle-journal-hero.webp" alt="" aria-hidden loading="lazy" decoding="async" className="absolute inset-0 h-full w-full object-cover object-center" />
            <div className="absolute inset-0" style={{ background: 'linear-gradient(to right, rgba(252,231,243,.95) 0%, rgba(251,207,232,.85) 60%, rgba(251,207,232,.3) 100%)' }} />
            <div className="relative z-10 p-4">
              <p style={{ fontSize: '9.5px', fontWeight: 700, letterSpacing: '.07em', color: '#DB2777', textTransform: 'uppercase' }}>DAILY AFFIRMATION</p>
              <p className="font-script font-bold" style={{ fontSize: '20px', lineHeight: 1.2, marginTop: '6px', color: '#9D174D' }}>
                {PHASE_AFFIRMATIONS[currentPhase]}
              </p>
            </div>
          </div>
        </aside>

      </div>{/* /lg:grid */}

      {/* Sticky CTA — mobile/tablet only */}
      <a
        href="/app/tools/yoga"
        className="lg:hidden fixed left-4 right-4 z-30 flex items-center justify-center gap-2 rounded-full py-3.5 font-bold text-white"
        style={{
          bottom: '74px',
          fontSize: '14.5px',
          background: 'linear-gradient(135deg,#EC4899,#DB2777)',
          animation: 'ctaBreathe 3.2s ease-in-out infinite',
          textDecoration: 'none',
        }}
      >
        <Play className="h-4 w-4 fill-white" /> Start 15-Min Flow
      </a>

      <PeriodSetup
        open={setupOpen}
        onClose={() => setSetupOpen(false)}
        initial={settings}
        onSave={(s) => { setSettings(s); writeCycleSettings(s); setIsSetup(true); }}
      />
    </div>
  );
}
