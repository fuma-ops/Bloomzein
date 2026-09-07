import { useMemo, useState, type ReactNode } from "react";
import {
  ChevronLeft, ArrowRight, Heart, Dumbbell, Salad, Fish, Beef, Sprout, Utensils,
  Footprints, BarChart3, Star, Scale, Ruler, Cake, Minus, Plus, Check, Bell, Clock,
  Smartphone, Tablet, Laptop, Pill, Sparkles, CalendarHeart, ChevronRight, Circle,
  Moon, CalendarDays,
} from "lucide-react";
import { BloomFlower } from "../BloomFlower";
import { useAuth } from "@/contexts/AuthContext";
import {
  writeCycleSettings, DEFAULT_CYCLE_SETTINGS, readCyclePhase,
} from "../cyclePhase";
import type { ContraceptiveMethod } from "../PeriodSetup";
import {
  updateDietProfile, DIET_SETUP_KEY, RECIPES, type DietGoal, type DietRegime, type DietType,
} from "../recipes/data";
import { computeTargets } from "@/lib/nutritionTargets";
import type { WorkoutProfile, Level, Goal as WorkoutGoal } from "../workout/data";
import { WORKOUT_PROFILE_KEY, WORKOUT_PROGRAM_KEY, YOGA_SCHEDULE_KEY, YOGA_FOCUS } from "@/lib/crossToolData";
import { setOnboarded, endGuide } from "@/lib/guidedSetup";

/* ══════════════════════════════════════════════════════════════════════════
   Bloomzein onboarding — the full "Let's make Bloomzein yours" post-signup flow.
   Collects exactly the questions the Today setup needs, reorganised into soft
   pink screens, then sets up EVERY tool (cycle · diet · meals · movement) from
   her answers — so there's no separate Today setup — and shows her the freshly
   built plans before dropping her on Today. Design mirrors the welcome pages
   (Playfair serif + script headlines, luxe pink CTA, "stay soft, bloom on.").
   ══════════════════════════════════════════════════════════════════════════ */

const SERIF = '"Playfair Display", Georgia, serif';

// ── answer model ────────────────────────────────────────────────────────────
type FoodStyle = "balanced" | "mediterranean" | "high-protein" | "plant-based" | "flexible";
interface Answers {
  lastPeriod: Date;
  cycleLength: number;
  periodLength: number;
  weight: number;   // kg
  height: number;   // cm
  age: number;
  goal: DietGoal;                 // lose · maintain · gain
  foodStyle: FoodStyle;
  level: Level | "custom";
  contraceptive: ContraceptiveMethod;
  reminderTime: string;           // "HH:MM"
  notifications: boolean;
}

const DEFAULT_ANSWERS: Answers = {
  lastPeriod: new Date(),
  cycleLength: 28,
  periodLength: 5,
  weight: 65,
  height: 165,
  age: 30,
  goal: "lose",
  foodStyle: "balanced",
  level: "beginner" as Level,
  contraceptive: "pill",
  reminderTime: "20:00",
  notifications: true,
};

// food style → real diet fields
const FOOD_MAP: Record<FoodStyle, { dietType: DietType; regime: DietRegime }> = {
  balanced:       { dietType: "omnivore",   regime: "balanced" },
  mediterranean:  { dietType: "omnivore",   regime: "mediterranean" },
  "high-protein": { dietType: "omnivore",   regime: "high-protein" },
  "plant-based":  { dietType: "vegan",      regime: "vegan" },
  flexible:       { dietType: "omnivore",   regime: "balanced" },
};
const GOAL_TO_WORKOUT: Record<DietGoal, WorkoutGoal> = { lose: "tonify", maintain: "energy", gain: "strengthen" };

// a soft default yoga week so Movement opens already planned
const YOGA_SEED: Record<string, string | null> = {
  Mon: "Cycle sync", Tue: null, Wed: "Stress relief", Thu: null,
  Fri: "Full-body flow", Sat: null, Sun: "Sleep prep",
};

// ── option data for the pick screens ────────────────────────────────────────
const GOALS: { key: DietGoal; title: string; desc: string; Icon: typeof Heart }[] = [
  { key: "lose",     title: "Lose weight",  desc: "Feel lighter, stronger and more confident in your body.", Icon: Sparkles },
  { key: "maintain", title: "Maintain",     desc: "Keep your balance and feel good in your body.",           Icon: Heart },
  { key: "gain",     title: "Gain & tone",  desc: "Build a stronger, healthier and more toned you.",         Icon: Dumbbell },
];
const FOODS: { key: FoodStyle; title: string; desc: string; Icon: typeof Heart }[] = [
  { key: "balanced",      title: "Balanced",      desc: "A mix of everything. Simple, nutritious and sustainable.", Icon: Salad },
  { key: "mediterranean", title: "Mediterranean", desc: "Fresh, colorful and inspired by Mediterranean cuisine.",   Icon: Fish },
  { key: "high-protein",  title: "High-Protein",  desc: "Focus on protein to help you feel full and build lean muscle.", Icon: Beef },
  { key: "plant-based",   title: "Plant-Based",   desc: "Mostly plant-based meals with no meat or fish.",           Icon: Sprout },
  { key: "flexible",      title: "Flexible",      desc: "I like variety and don't follow a specific style.",        Icon: Utensils },
];
const LEVELS: { key: Level | "custom"; title: string; desc: string; Icon: typeof Heart }[] = [
  { key: "Beginner" as Level,     title: "Beginner",     desc: "I'm new to exercise or getting back into it.",  Icon: Footprints },
  { key: "Intermediate" as Level, title: "Intermediate", desc: "I exercise sometimes and want to be more consistent.", Icon: Dumbbell },
  { key: "Advanced" as Level,     title: "Advanced",     desc: "I exercise regularly and want to level up.",    Icon: BarChart3 },
  { key: "custom",                title: "Custom",       desc: "I prefer to set my own plan later.",            Icon: Star },
];

// screens with a progress dot (welcome + results have no dot)
const QUESTION_STEPS = ["cycle", "about", "goal", "food", "fitness", "prefs"] as const;

// ══ shared chrome ═══════════════════════════════════════════════════════════
function Shell({
  step, total, onBack, footer, children,
}: { step: number | null; total: number; onBack?: () => void; footer: string; children: ReactNode }) {
  return (
    <div className="fixed inset-0 z-[95] overflow-y-auto"
      style={{ background: "radial-gradient(120% 90% at 50% 0%, #FFF0F7 0%, #FFE0EF 42%, #FCC7E1 100%)" }}>
      {/* soft floating heart / petal motifs */}
      <div aria-hidden className="pointer-events-none fixed inset-0 overflow-hidden">
        {[["8%", "18%", 26, 0.10], ["86%", "30%", 34, 0.09], ["12%", "72%", 30, 0.08], ["90%", "82%", 22, 0.10]].map(([l, t, s, o], i) => (
          <Heart key={i} className="absolute" fill="#EC4899"
            style={{ left: l as string, top: t as string, width: s as number, height: s as number, opacity: o as number, transform: `rotate(${i * 24 - 20}deg)` }} />
        ))}
      </div>

      <div className="relative mx-auto flex min-h-full w-full max-w-md flex-col px-5 pb-8"
        style={{ paddingTop: "max(1rem, env(safe-area-inset-top))" }}>
        {/* top bar */}
        <div className="flex items-center justify-between py-2">
          {onBack
            ? <button onClick={onBack} className="inline-flex items-center gap-1 text-hotpink font-bold active:scale-95 transition"><ChevronLeft className="h-5 w-5" /> Back</button>
            : <span className="w-14" />}
          <div className="text-center leading-none">
            <div className="inline-flex items-center gap-1.5">
              <span className="font-script text-2xl text-hotpink leading-none">Bloomzein</span>
              <BloomFlower size={18} petal="#EC4899" center="#FFFFFF" />
            </div>
            <p className="mt-0.5 text-[11px] font-bold text-hotpink/80">stay soft, bloom on.</p>
          </div>
          {step !== null
            ? <span className="w-14 text-right text-[13px] font-bold text-hotpink/60 tabular-nums">{step + 1}/{total}</span>
            : <span className="w-14" />}
        </div>

        {/* progress dots */}
        {step !== null && (
          <div className="mt-1 mb-4 flex items-center gap-1.5">
            {Array.from({ length: total }).map((_, i) => (
              <div key={i} className="flex flex-1 items-center gap-1.5">
                <span className={["grid h-3.5 w-3.5 shrink-0 place-items-center rounded-full transition-all",
                  i <= step ? "bg-hotpink shadow-[0_2px_8px_rgba(236,72,153,0.5)]" : "bg-white/70 ring-1 ring-hotpink/25"].join(" ")}>
                  {i < step && <Check className="h-2 w-2 text-white" strokeWidth={4} />}
                </span>
                {i < total - 1 && <span className={["h-[3px] flex-1 rounded-full", i < step ? "bg-hotpink" : "bg-white/60"].join(" ")} />}
              </div>
            ))}
          </div>
        )}

        <div className="flex-1">{children}</div>

        {/* footer */}
        <div className="mt-6 flex items-end justify-between">
          <p className="font-script text-lg text-hotpink/80 leading-tight max-w-[9rem]">{footer} ♡</p>
          <div className="inline-flex items-center gap-1.5">
            <BloomFlower size={18} petal="#EC4899" center="#FFFFFF" />
            <span className="text-[11px] font-bold text-hotpink/80">stay soft, bloom on.</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function Eyebrow({ children }: { children: ReactNode }) {
  return <p className="text-[13px] font-extrabold uppercase tracking-[0.22em] text-hotpink/70">{children}</p>;
}
function Title({ serif, script }: { serif: string; script: string }) {
  return (
    <h1 className="mt-1.5 leading-[0.95]">
      <span className="block text-[2.5rem] font-bold text-[#7a1247]" style={{ fontFamily: SERIF }}>{serif}</span>
      <span className="mt-0.5 inline-flex items-end gap-2 font-script text-[2.7rem] text-hotpink leading-[0.9]">
        {script} <Heart className="mb-1 h-7 w-7 text-hotpink" strokeWidth={2.4} />
      </span>
    </h1>
  );
}
function Sub({ children }: { children: ReactNode }) {
  return <p className="mt-2.5 text-[15px] leading-snug text-rose/70">{children}</p>;
}

// tap card for goal / food / fitness
function OptionCard({ Icon, title, desc, selected, onClick }: {
  Icon: typeof Heart; title: string; desc: string; selected: boolean; onClick: () => void;
}) {
  return (
    <button onClick={onClick}
      className={["group flex w-full items-center gap-3.5 rounded-[1.4rem] border p-3.5 text-left transition active:scale-[0.99]",
        selected ? "border-hotpink bg-white ring-2 ring-hotpink/30 shadow-[0_10px_30px_rgba(236,72,153,0.18)]"
                 : "border-white/70 bg-white/70 hover:bg-white/90"].join(" ")}>
      <span className={["grid h-14 w-14 shrink-0 place-items-center rounded-full", selected ? "bg-hotpink/15" : "bg-hotpink/10"].join(" ")}>
        <Icon className="h-7 w-7 text-hotpink" strokeWidth={1.9} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[17px] font-extrabold text-hotpink leading-tight">{title}</span>
        <span className="mt-0.5 block text-[13px] leading-snug text-rose/75">{desc}</span>
      </span>
      <span className={["grid h-6 w-6 shrink-0 place-items-center rounded-full border-2", selected ? "border-hotpink" : "border-hotpink/40"].join(" ")}>
        {selected && <span className="h-3 w-3 rounded-full bg-hotpink" />}
      </span>
    </button>
  );
}

// ± stepper row (weight / height / age / cycle length …)
function Stepper({ Icon, label, desc, value, unit, min, max, step = 1, onChange }: {
  Icon: typeof Heart; label: string; desc: string; value: number; unit: string; min: number; max: number; step?: number; onChange: (v: number) => void;
}) {
  return (
    <div className="rounded-[1.4rem] border border-white/70 bg-white/70 p-3.5">
      <div className="flex items-start gap-3">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-hotpink/10"><Icon className="h-5 w-5 text-hotpink" strokeWidth={1.9} /></span>
        <div className="flex-1">
          <p className="text-[15px] font-extrabold text-hotpink leading-tight">{label}</p>
          <p className="mt-0.5 text-[12px] leading-snug text-rose/70">{desc}</p>
        </div>
      </div>
      <div className="mt-3 flex items-center justify-between rounded-full bg-white/80 p-1.5 ring-1 ring-hotpink/15">
        <button onClick={() => onChange(Math.max(min, value - step))} className="grid h-9 w-9 place-items-center rounded-full bg-hotpink/10 text-hotpink active:scale-90 transition"><Minus className="h-4 w-4" strokeWidth={3} /></button>
        <span className="text-[19px] font-extrabold text-rose tabular-nums">{value} {unit}</span>
        <button onClick={() => onChange(Math.min(max, value + step))} className="grid h-9 w-9 place-items-center rounded-full bg-hotpink text-white active:scale-90 transition"><Plus className="h-4 w-4" strokeWidth={3} /></button>
      </div>
    </div>
  );
}

function ContinueBtn({ onClick, label = "Continue" }: { onClick: () => void; label?: string }) {
  return (
    <button onClick={onClick} className="bloom-luxury-btn animate-cta-bounce mt-6 flex w-full items-center justify-center gap-2 py-3.5 text-[17px] font-bold text-white">
      {label} <ArrowRight className="h-5 w-5" />
    </button>
  );
}

// tiny inline month calendar for "last period"
function MiniCalendar({ value, onPick }: { value: Date; onPick: (d: Date) => void }) {
  const [view, setView] = useState(new Date(value.getFullYear(), value.getMonth(), 1));
  const y = view.getFullYear(), m = view.getMonth();
  const first = new Date(y, m, 1).getDay(); // 0=Sun
  const days = new Date(y, m + 1, 0).getDate();
  const cells: (number | null)[] = [...Array(first).fill(null), ...Array.from({ length: days }, (_, i) => i + 1)];
  const label = view.toLocaleString("en-US", { month: "long", year: "numeric" });
  const isToday = (d: number) => { const t = new Date(); return t.getFullYear() === y && t.getMonth() === m && t.getDate() === d; };
  const sel = (d: number) => value.getFullYear() === y && value.getMonth() === m && value.getDate() === d;
  return (
    <div className="rounded-2xl bg-white/85 p-3 ring-1 ring-hotpink/15">
      <div className="flex items-center justify-between px-1">
        <button onClick={() => setView(new Date(y, m - 1, 1))} className="grid h-8 w-8 place-items-center rounded-full text-hotpink active:scale-90"><ChevronLeft className="h-5 w-5" /></button>
        <span className="text-[15px] font-extrabold text-rose">{label}</span>
        <button onClick={() => setView(new Date(y, m + 1, 1))} className="grid h-8 w-8 place-items-center rounded-full text-hotpink active:scale-90"><ChevronRight className="h-5 w-5" /></button>
      </div>
      <div className="mt-2 grid grid-cols-7 gap-0.5 text-center text-[10px] font-bold uppercase text-hotpink/50">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => <span key={d}>{d.slice(0, 3)}</span>)}
      </div>
      <div className="mt-1 grid grid-cols-7 gap-0.5">
        {cells.map((d, i) => d === null ? <span key={i} /> : (
          <button key={i} onClick={() => onPick(new Date(y, m, d))}
            className={["mx-auto grid h-9 w-9 place-items-center rounded-full text-[14px] font-semibold transition",
              sel(d) ? "bg-hotpink text-white shadow-[0_3px_10px_rgba(236,72,153,0.5)]"
                     : isToday(d) ? "text-hotpink ring-1 ring-hotpink/40" : "text-rose/80 hover:bg-hotpink/10"].join(" ")}>
            {d}
          </button>
        ))}
      </div>
    </div>
  );
}

// slide-in confirmation used on the result pages
function Notif({ text }: { text: string }) {
  return (
    <div className="mb-4 flex items-center gap-2 rounded-2xl bg-white/90 px-4 py-3 shadow-[0_10px_26px_rgba(236,72,153,0.22)] ring-1 ring-hotpink/20 animate-scale-in">
      <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-hotpink text-white"><Check className="h-4 w-4" strokeWidth={3} /></span>
      <p className="text-[13px] font-semibold text-rose/85 leading-snug">{text}</p>
    </div>
  );
}

// ══ main component ══════════════════════════════════════════════════════════
export function BloomOnboarding({ onDone, preview = false }: { onDone: () => void; preview?: boolean }) {
  const { updateProfile } = useAuth();
  const [a, setA] = useState<Answers>(DEFAULT_ANSWERS);
  // stage: 'welcome' | question index (0..5) | 'r-<tool>' | 'done'
  const [stage, setStage] = useState<string>("welcome");
  const [summary, setSummary] = useState<{ kcal: number; meals: number; sample: string[]; workoutDays: number; yogaDays: number }>({ kcal: 0, meals: 0, sample: [], workoutDays: 0, yogaDays: 0 });
  const patch = (p: Partial<Answers>) => setA((x) => ({ ...x, ...p }));
  // macro split for the nutrition result card (hook must stay above early returns)
  const macro = useMemo(() => ({
    p: Math.round((summary.kcal * 0.3) / 4), c: Math.round((summary.kcal * 0.4) / 4), f: Math.round((summary.kcal * 0.3) / 9),
  }), [summary.kcal]);

  const qIndex = QUESTION_STEPS.indexOf(stage as typeof QUESTION_STEPS[number]);
  const total = QUESTION_STEPS.length;

  // ── save EVERYTHING from her answers (this is the whole point) ─────────────
  async function applySetup() {
    // Preview mode (owner design review at /onboarding): show the exact flow &
    // realistic result numbers WITHOUT writing anything to storage.
    if (preview) {
      const bmr = 10 * a.weight + 6.25 * a.height - 5 * a.age - 161; // Mifflin-St Jeor (female)
      const adj = a.goal === "lose" ? -0.15 : a.goal === "gain" ? 0.1 : 0;
      setSummary({
        kcal: Math.round(bmr * 1.375 * (1 + adj)),
        meals: 28, sample: RECIPES.slice(0, 3).map((r) => r.name),
        workoutDays: 3, yogaDays: Object.values(YOGA_SEED).filter(Boolean).length,
      });
      return;
    }
    // 1 · cycle → hasCycleSettings()
    writeCycleSettings({
      ...DEFAULT_CYCLE_SETTINGS,
      lastPeriodStart: a.lastPeriod, cycleLength: a.cycleLength, periodLength: a.periodLength,
      contraceptiveMethod: a.contraceptive, contraceptiveReminder: true,
      reminderHour: a.reminderTime, deviceNotifications: a.notifications, trackerMode: "protection",
    });
    // 2 · account profile
    try { await updateProfile({ setup_done: true, age: a.age, weight: a.weight, weight_unit: "kg" }); } catch { /* offline ok */ }
    // 3 · diet profile + setup flag → hasDietSetup()
    const food = FOOD_MAP[a.foodStyle];
    updateDietProfile({ goal: a.goal, weight: a.weight, heightCm: a.height, age: a.age, dietType: food.dietType, regime: food.regime });
    try { localStorage.setItem(DIET_SETUP_KEY, JSON.stringify(true)); } catch { /* ignore */ }
    // 4 · workout profile + generated weekly plan → hasMovementPlan()
    const level: Level = a.level === "custom" ? ("Beginner" as Level) : a.level;
    const wprofile: WorkoutProfile = { level, goal: GOAL_TO_WORKOUT[a.goal], equipment: "none", daysPerWeek: 3 };
    try { localStorage.setItem(WORKOUT_PROFILE_KEY, JSON.stringify(wprofile)); } catch { /* ignore */ }
    const phase = readCyclePhase() ?? "follicular";
    let workoutDays = 3;
    try {
      const { generateWeeklyPlan } = await import("@/pages/app.tools.workout");
      const wplan = generateWeeklyPlan(wprofile, phase as never);
      localStorage.setItem(WORKOUT_PROGRAM_KEY, JSON.stringify(wplan));
      workoutDays = Object.values(wplan).filter(Boolean).length;
    } catch { /* ignore */ }
    // 5 · a gentle default yoga week
    try { localStorage.setItem(YOGA_SCHEDULE_KEY, JSON.stringify(YOGA_SEED)); } catch { /* ignore */ }
    const yogaDays = Object.values(YOGA_SEED).filter(Boolean).length;
    // 6 · meal month straight from the diet profile → hasMealPlan()
    let meals = 0, sample: string[] = [];
    try {
      const { seedMealMonthFromProfile } = await import("@/pages/app.tools.meals");
      const r = seedMealMonthFromProfile(); meals = r.meals; sample = r.sample;
    } catch { /* ignore */ }
    // 7 · nutrition target for the preview
    let kcal = 0;
    try { kcal = Math.round(computeTargets(true).calories); } catch { /* ignore */ }
    // 8 · flags: onboarding done, no guided Today setup needed
    setOnboarded(); endGuide();
    try { window.dispatchEvent(new Event("storage")); } catch { /* ignore */ }
    setSummary({ kcal, meals, sample, workoutDays, yogaDays });
  }

  const go = (s: string) => { setStage(s); try { window.scrollTo(0, 0); } catch { /* ignore */ } };

  // ── WELCOME (custom full-bleed hero, its own layout) ──────────────────────
  if (stage === "welcome") {
    const tools = [
      { Icon: Moon, l: "Cycle" }, { Icon: Dumbbell, l: "Workout" }, { Icon: Salad, l: "Meals" },
      { Icon: Heart, l: "Mind" }, { Icon: CalendarDays, l: "Life" },
    ];
    const checks = [
      "Personalized to your cycle", "Practical and easy to follow",
      "Tailored to your goals", "Made for real life",
      "All in one place", "You can always adjust later",
    ];
    return (
      <div className="fixed inset-0 z-[95] overflow-y-auto"
        style={{ background: "radial-gradient(120% 70% at 50% 100%, #FCC7E1 0%, #FFDCEE 45%, #FFF0F7 100%)" }}>
        {/* hero image (from Today) softly blended top-right */}
        <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-[52vh] min-h-[360px] overflow-hidden">
          <img src="/images/page-bg-today-morning.webp" alt="" className="absolute inset-0 h-full w-full object-cover object-[68%_20%]" />
          {/* scrim: readable on the left, dissolves into the pink page at the bottom */}
          <div className="absolute inset-0" style={{ background: "linear-gradient(105deg, rgba(255,236,246,0.92) 0%, rgba(255,224,239,0.62) 38%, rgba(255,214,235,0.12) 62%, transparent 82%)" }} />
          <div className="absolute inset-x-0 bottom-0 h-40" style={{ background: "linear-gradient(180deg, transparent, #FFE7F2 78%, #FFECF5 100%)" }} />
        </div>

        <div className="relative mx-auto w-full max-w-md px-5 pb-8" style={{ paddingTop: "max(1.25rem, env(safe-area-inset-top))" }}>
          {/* wordmark (left) */}
          <div className="inline-flex items-center gap-1.5">
            <span className="font-script text-[2rem] leading-none text-hotpink">Bloomzein</span>
            <BloomFlower size={22} petal="#EC4899" center="#FFFFFF" />
          </div>
          <p className="mt-0.5 text-[13px] font-bold text-hotpink/85">stay soft, bloom on.</p>

          {/* headline */}
          <h1 className="mt-6 leading-[0.9]">
            <span className="block text-[3rem] font-bold text-[#7a1247]" style={{ fontFamily: SERIF }}>Let's make</span>
            <span className="inline-flex items-end gap-2 text-[3rem] font-bold text-[#7a1247]" style={{ fontFamily: SERIF }}>
              this yours. <Heart className="mb-2 h-8 w-8 text-hotpink" strokeWidth={2.4} />
            </span>
          </h1>
          <p className="mt-3 max-w-[19rem] text-[16px] leading-snug text-[#a3316f]">
            A few little questions and Bloomzein will build <b className="font-extrabold text-[#7a1247]">your personalized world</b> — around your body, your goals and your everyday life.
          </p>

          {/* tool circles */}
          <div className="mt-8 flex justify-between gap-1">
            {tools.map((t) => (
              <div key={t.l} className="flex flex-col items-center gap-1.5">
                <span className="grid h-14 w-14 place-items-center rounded-full bg-white/85 shadow-[0_8px_20px_rgba(236,72,153,0.18)] ring-1 ring-white/70">
                  <t.Icon className="h-6 w-6 text-hotpink" strokeWidth={1.9} />
                </span>
                <span className="font-script text-[15px] text-hotpink">{t.l}</span>
              </div>
            ))}
          </div>

          {/* checklist card */}
          <div className="mt-6 rounded-[1.6rem] bg-white/70 p-4 shadow-[0_12px_34px_rgba(236,72,153,0.14)] ring-1 ring-white/70">
            <p className="inline-flex items-center gap-1.5 font-script text-[1.4rem] text-hotpink leading-none">A life that feels like you <Heart className="h-5 w-5 text-hotpink" strokeWidth={2.4} /></p>
            <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2.5">
              {checks.map((c) => (
                <div key={c} className="flex items-start gap-1.5">
                  <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-hotpink/15"><Check className="h-3 w-3 text-hotpink" strokeWidth={4} /></span>
                  <span className="text-[13px] font-semibold leading-snug text-rose/85">{c}</span>
                </div>
              ))}
            </div>
          </div>

          {/* CTA */}
          <button onClick={() => go("cycle")} className="bloom-luxury-btn animate-cta-bounce mt-6 flex w-full items-center justify-center gap-2.5 py-4 text-[19px] font-bold text-white">
            <Sparkles className="h-5 w-5" /> Let's bloom <ArrowRight className="h-5 w-5" />
          </button>
          <p className="mt-2.5 text-center text-[12px] font-semibold text-hotpink/70">Takes about 2 minutes • You can change everything later</p>
        </div>
      </div>
    );
  }

  // ── CYCLE ───────────────────────────────────────────────────────────────
  if (stage === "cycle") {
    return (
      <Shell step={qIndex} total={total} onBack={() => go("welcome")} footer="Small steps a brighter you">
        <Eyebrow>Your cycle</Eyebrow>
        <Title serif="Let's get to know" script="your cycle" />
        <Sub>A few details to understand your cycle and create a plan that fits you.</Sub>
        <div className="mt-4 space-y-3">
          <div className="rounded-[1.4rem] border border-white/70 bg-white/70 p-3.5">
            <p className="text-[15px] font-extrabold text-hotpink leading-tight">When did your last period start?</p>
            <p className="mb-2.5 mt-0.5 text-[12px] text-rose/70">Tap the date on the calendar.</p>
            <MiniCalendar value={a.lastPeriod} onPick={(d) => patch({ lastPeriod: d })} />
          </div>
          <Stepper Icon={CalendarHeart} label="How long is your cycle?" desc="From the first day of your period to the day before the next." value={a.cycleLength} unit="days" min={21} max={40} onChange={(v) => patch({ cycleLength: v })} />
          <Stepper Icon={Heart} label="How long does your period last?" desc="The number of days you typically have bleeding." value={a.periodLength} unit="days" min={2} max={10} onChange={(v) => patch({ periodLength: v })} />
        </div>
        <ContinueBtn onClick={() => go("about")} />
      </Shell>
    );
  }

  // ── ABOUT YOU ─────────────────────────────────────────────────────────────
  if (stage === "about") {
    return (
      <Shell step={qIndex} total={total} onBack={() => go("cycle")} footer="Same girl brighter days ahead">
        <Eyebrow>About you</Eyebrow>
        <Title serif="Tell us a little" script="about you" />
        <Sub>These details help us create a plan that fits your body and your goals.</Sub>
        <div className="mt-4 space-y-3">
          <Stepper Icon={Scale} label="What's your weight?" desc="This helps us personalize your nutrition and workout plan." value={a.weight} unit="kg" min={35} max={200} onChange={(v) => patch({ weight: v })} />
          <Stepper Icon={Ruler} label="What's your height?" desc="This helps us calculate your energy needs accurately." value={a.height} unit="cm" min={130} max={210} onChange={(v) => patch({ height: v })} />
          <Stepper Icon={Cake} label="What's your age?" desc="Your age helps us personalize your experience even better." value={a.age} unit="years" min={13} max={90} onChange={(v) => patch({ age: v })} />
        </div>
        <ContinueBtn onClick={() => go("goal")} />
      </Shell>
    );
  }

  // ── GOAL ──────────────────────────────────────────────────────────────────
  if (stage === "goal") {
    return (
      <Shell step={qIndex} total={total} onBack={() => go("about")} footer="Same girl brighter days ahead">
        <Eyebrow>Your goal</Eyebrow>
        <Title serif="What are you" script="blooming toward?" />
        <Sub>Choose your main goal so we can create a personalized nutrition and workout plan for you.</Sub>
        <div className="mt-4 space-y-2.5">
          {GOALS.map((g) => <OptionCard key={g.key} {...g} selected={a.goal === g.key} onClick={() => patch({ goal: g.key })} />)}
        </div>
        <ContinueBtn onClick={() => go("food")} />
      </Shell>
    );
  }

  // ── FOOD STYLE ────────────────────────────────────────────────────────────
  if (stage === "food") {
    return (
      <Shell step={qIndex} total={total} onBack={() => go("goal")} footer="Small choices Big changes">
        <Eyebrow>Your food style</Eyebrow>
        <Title serif="How do you" script="like to eat?" />
        <Sub>Choose the style that fits you best. You can always change this later.</Sub>
        <div className="mt-4 space-y-2.5">
          {FOODS.map((f) => <OptionCard key={f.key} {...f} selected={a.foodStyle === f.key} onClick={() => patch({ foodStyle: f.key })} />)}
        </div>
        <ContinueBtn onClick={() => go("fitness")} />
      </Shell>
    );
  }

  // ── FITNESS LEVEL ─────────────────────────────────────────────────────────
  if (stage === "fitness") {
    return (
      <Shell step={qIndex} total={total} onBack={() => go("food")} footer="Small steps Big results">
        <Eyebrow>Your fitness</Eyebrow>
        <Title serif="What's your" script="fitness level?" />
        <Sub>This helps us create a workout plan that fits you and your goals.</Sub>
        <div className="mt-4 space-y-2.5">
          {LEVELS.map((l) => <OptionCard key={String(l.key)} {...l} selected={a.level === l.key} onClick={() => patch({ level: l.key })} />)}
        </div>
        <ContinueBtn onClick={() => go("prefs")} />
      </Shell>
    );
  }

  // ── PREFERENCES ───────────────────────────────────────────────────────────
  if (stage === "prefs") {
    const methods: { key: ContraceptiveMethod; label: string; Icon: typeof Heart }[] = [
      { key: "pill", label: "Pill", Icon: Pill }, { key: "patch", label: "Patch", Icon: Circle }, { key: "ring", label: "Ring", Icon: Circle },
    ];
    const times = ["07:00", "08:00", "12:00", "18:00", "20:00", "21:00"];
    return (
      <Shell step={qIndex} total={total} onBack={() => go("fitness")} footer="Small choices Big changes">
        <Eyebrow>Your cycle</Eyebrow>
        <Title serif="A few" script="preferences" />
        <Sub>Help us personalize your experience with a few more details.</Sub>
        <div className="mt-4 space-y-3">
          <div className="rounded-[1.4rem] border border-white/70 bg-white/70 p-3.5">
            <p className="text-[15px] font-extrabold text-hotpink leading-tight">Do you use a contraceptive method?</p>
            <p className="mb-2.5 mt-0.5 text-[12px] text-rose/70">This helps us give you more accurate insights.</p>
            <div className="grid grid-cols-3 gap-2">
              {methods.map((m) => (
                <button key={m.key} onClick={() => patch({ contraceptive: m.key })}
                  className={["flex flex-col items-center gap-1.5 rounded-2xl border py-3 transition active:scale-95",
                    a.contraceptive === m.key ? "border-hotpink bg-hotpink/10 ring-1 ring-hotpink/30" : "border-white/70 bg-white/60"].join(" ")}>
                  <m.Icon className="h-5 w-5 text-hotpink" strokeWidth={2} />
                  <span className="text-[13px] font-bold text-rose/85">{m.label}</span>
                </button>
              ))}
            </div>
          </div>
          <div className="rounded-[1.4rem] border border-white/70 bg-white/70 p-3.5">
            <div className="flex items-start gap-3">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-hotpink/10"><Bell className="h-5 w-5 text-hotpink" strokeWidth={2} /></span>
              <div className="flex-1"><p className="text-[15px] font-extrabold text-hotpink leading-tight">When would you like your daily reminder?</p><p className="mt-0.5 text-[12px] text-rose/70">We'll remind you about your cycle, self-care and more.</p></div>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {times.map((t) => (
                <button key={t} onClick={() => patch({ reminderTime: t })}
                  className={["inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-[13px] font-bold transition active:scale-95",
                    a.reminderTime === t ? "border-hotpink bg-hotpink text-white" : "border-hotpink/30 bg-white/70 text-rose/80"].join(" ")}>
                  <Clock className="h-3.5 w-3.5" /> {t}
                </button>
              ))}
            </div>
          </div>
          <div className="rounded-[1.4rem] border border-white/70 bg-white/70 p-3.5">
            <p className="text-[15px] font-extrabold text-hotpink leading-tight">Would you like Bloomzein to send notifications?</p>
            <p className="mb-2.5 mt-0.5 text-[12px] text-rose/70">Get reminders and personalized tips on your devices.</p>
            <button onClick={() => patch({ notifications: !a.notifications })} className="flex w-full items-center justify-between rounded-xl bg-white/80 px-3 py-2.5 ring-1 ring-hotpink/15">
              <span className="text-[13px] font-bold text-rose/85">Yes, send me notifications</span>
              <span className={["relative h-6 w-11 rounded-full transition-colors", a.notifications ? "bg-hotpink" : "bg-rose/25"].join(" ")}>
                <span className="absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all" style={{ left: a.notifications ? "1.375rem" : "0.125rem" }} />
              </span>
            </button>
            <div className="mt-2.5 grid grid-cols-3 gap-2">
              {[{ Icon: Smartphone, l: "Phone" }, { Icon: Tablet, l: "Tablet" }, { Icon: Laptop, l: "Laptop" }].map((d) => (
                <div key={d.l} className={["flex flex-col items-center gap-1 rounded-2xl py-2.5 transition", a.notifications ? "bg-hotpink/10" : "bg-white/50 opacity-60"].join(" ")}>
                  <d.Icon className="h-5 w-5 text-hotpink" strokeWidth={2} /><span className="text-[11px] font-bold text-rose/80">{d.l}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
        <ContinueBtn onClick={async () => { go("building"); await applySetup(); go("r-diet"); }} label="Build my world" />
      </Shell>
    );
  }

  // ── BUILDING (brief) ───────────────────────────────────────────────────────
  if (stage === "building") {
    return (
      <Shell step={null} total={total} footer="Building your world">
        <div className="grid min-h-[60vh] place-items-center text-center">
          <div>
            <span className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-white/70 animate-card-breathe">
              <BloomFlower size={56} petal="#EC4899" center="#FFFFFF" className="animate-[spin_9s_linear_infinite]" />
            </span>
            <p className="mt-4 font-script text-3xl text-hotpink">Building your world…</p>
            <p className="mt-1 text-[14px] text-rose/70">Syncing your cycle, meals & movement ✿</p>
          </div>
        </div>
      </Shell>
    );
  }

  // ── RESULTS ─────────────────────────────────────────────────────────────
  if (stage === "r-diet") {
    return (
      <Shell step={null} total={total} footer="Fuel your happier you">
        <Notif text={`Nutrition set up ✓ — ${summary.kcal.toLocaleString()} kcal/day, tuned to your goal in the Diet tool.`} />
        <Eyebrow>Your nutrition plan</Eyebrow>
        <Title serif="Your daily" script="fuel is ready" />
        <div className="mt-4 rounded-[1.6rem] bg-white/80 p-5 text-center ring-1 ring-hotpink/15">
          <p className="text-[13px] font-bold uppercase tracking-wide text-hotpink/70">Daily target</p>
          <p className="mt-1 text-[3rem] font-extrabold leading-none text-hotpink" style={{ fontFamily: SERIF }}>{summary.kcal.toLocaleString()}</p>
          <p className="text-[13px] font-semibold text-rose/70">calories / day</p>
          <div className="mt-4 grid grid-cols-3 gap-2">
            {[["Protein", macro.p, "g"], ["Carbs", macro.c, "g"], ["Fat", macro.f, "g"]].map(([l, v, u]) => (
              <div key={l as string} className="rounded-2xl bg-hotpink/10 py-2.5"><p className="text-[18px] font-extrabold text-hotpink">{v}{u}</p><p className="text-[11px] font-bold text-rose/70">{l}</p></div>
            ))}
          </div>
        </div>
        <ContinueBtn onClick={() => go("r-meals")} label="See my meals" />
      </Shell>
    );
  }

  if (stage === "r-meals") {
    return (
      <Shell step={null} total={total} footer="Good food brighter mood">
        <Notif text={`Meals planned ✓ — ${summary.meals} cycle-synced meals waiting in your Meals planner.`} />
        <Eyebrow>Your meals for the week</Eyebrow>
        <Title serif="Your week is" script="deliciously set" />
        <div className="mt-4 rounded-[1.6rem] bg-white/80 p-5 ring-1 ring-hotpink/15">
          <p className="text-center text-[15px] font-semibold text-rose/80"><span className="font-extrabold text-hotpink">{summary.meals}</span> meals planned across the month, matched to your phase & goal.</p>
          {summary.sample.length > 0 && (
            <div className="mt-3 space-y-2">
              {summary.sample.map((n) => (
                <div key={n} className="flex items-center gap-2 rounded-xl bg-hotpink/8 px-3 py-2"><Utensils className="h-4 w-4 text-hotpink" /><span className="text-[13px] font-semibold text-rose/85">{n}</span></div>
              ))}
            </div>
          )}
        </div>
        <ContinueBtn onClick={() => go("r-yoga")} label="See my yoga" />
      </Shell>
    );
  }

  if (stage === "r-yoga") {
    return (
      <Shell step={null} total={total} footer="Breathe soften bloom">
        <Notif text={`Yoga plan ready ✓ — ${summary.yogaDays} phase-matched sessions this week in the Yoga tool.`} />
        <Eyebrow>Your yoga plan</Eyebrow>
        <Title serif="Your practice" script="is planned" />
        <div className="mt-4 rounded-[1.6rem] bg-white/80 p-5 ring-1 ring-hotpink/15">
          <div className="space-y-2">
            {Object.entries(YOGA_SEED).filter(([, v]) => v).map(([d, focus]) => (
              <div key={d} className="flex items-center gap-3 rounded-xl bg-hotpink/8 px-3 py-2">
                <img src={YOGA_FOCUS[focus as string]?.image} alt="" className="h-9 w-9 rounded-lg object-cover" />
                <div><p className="text-[13px] font-extrabold text-hotpink leading-tight">{focus}</p><p className="text-[11px] font-bold text-rose/60">{d}</p></div>
              </div>
            ))}
          </div>
        </div>
        <ContinueBtn onClick={() => go("r-workout")} label="See my workouts" />
      </Shell>
    );
  }

  if (stage === "r-workout") {
    return (
      <Shell step={null} total={total} footer="Strong girls brighter days">
        <Notif text={`Workout plan ready ✓ — ${summary.workoutDays} sessions this week, matched to your level, in the Workout tool.`} />
        <Eyebrow>Your workout plan</Eyebrow>
        <Title serif="Your movement" script="is mapped out" />
        <div className="mt-4 rounded-[1.6rem] bg-white/80 p-5 text-center ring-1 ring-hotpink/15">
          <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-hotpink/10"><Dumbbell className="h-8 w-8 text-hotpink" /></span>
          <p className="mt-3 text-[15px] font-semibold text-rose/80"><span className="font-extrabold text-hotpink">{summary.workoutDays} workouts</span> planned this week, tuned to your fitness level and energy across your cycle.</p>
        </div>
        <ContinueBtn onClick={() => go("done")} label="Finish setup" />
      </Shell>
    );
  }

  // ── CONGRATS ─────────────────────────────────────────────────────────────
  return (
    <Shell step={null} total={total} footer="A better you every day">
      <div className="grid min-h-[64vh] place-items-center text-center">
        <div>
          <span className="mx-auto grid h-24 w-24 place-items-center rounded-full bg-white/70 shadow-[0_12px_36px_rgba(236,72,153,0.28)]">
            <BloomFlower size={64} petal="#EC4899" center="#FFFFFF" className="animate-[spin_12s_linear_infinite]" />
          </span>
          <p className="mt-5 text-[13px] font-extrabold uppercase tracking-[0.22em] text-hotpink/70">You're all set</p>
          <h1 className="mt-1 leading-[0.95]">
            <span className="block text-[2.3rem] font-bold text-[#7a1247]" style={{ fontFamily: SERIF }}>Your world is</span>
            <span className="font-script text-[2.8rem] text-hotpink">ready, gorgeous ♡</span>
          </h1>
          <p className="mt-3 text-[15px] leading-snug text-rose/75">Your cycle, nutrition, meals and movement are all set up and in sync. Everything lives on your Today page.</p>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            {["🌸 Cycle", "🍽️ Meals", "🧘 Yoga", "🏋️ Workout", "🎯 Nutrition"].map((t) => (
              <span key={t} className="rounded-full bg-white/70 px-3 py-1.5 text-[13px] font-bold text-hotpink ring-1 ring-hotpink/20">{t} ✓</span>
            ))}
          </div>
          <button onClick={() => { if (!preview) setOnboarded(); onDone(); }} className="bloom-luxury-btn animate-cta-bounce mt-6 flex w-full items-center justify-center gap-2 py-3.5 text-[17px] font-bold text-white">
            Discover Bloomzein <ArrowRight className="h-5 w-5" />
          </button>
        </div>
      </div>
    </Shell>
  );
}

export default BloomOnboarding;
