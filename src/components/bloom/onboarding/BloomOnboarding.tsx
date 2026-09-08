import { useMemo, useState, type ReactNode } from "react";
import {
  ChevronLeft, ArrowRight, Heart, Dumbbell, Salad, Fish, Beef, Sprout, Utensils,
  Footprints, BarChart3, Star, Scale, Ruler, Cake, Minus, Plus, Check, Bell, Clock,
  Smartphone, Tablet, Laptop, Pill, Sparkles, CalendarHeart, ChevronRight, Circle,
  Moon, CalendarDays, Cloud, Smile, CloudRain, Battery, Droplets, Lock, Flower2, Flame,
} from "lucide-react";
import { BloomFlower } from "../BloomFlower";
import { useAuth } from "@/contexts/AuthContext";
import {
  writeCycleSettings, DEFAULT_CYCLE_SETTINGS, readCyclePhase,
} from "../cyclePhase";
import type { ContraceptiveMethod } from "../PeriodSetup";
import {
  updateDietProfile, DIET_SETUP_KEY, RECIPES, recipeImageSrc, type DietGoal, type DietRegime, type DietType,
} from "../recipes/data";
import { computeTargets } from "@/lib/nutritionTargets";
import type { WorkoutProfile, Level, Goal as WorkoutGoal } from "../workout/data";
import {
  WORKOUT_PROFILE_KEY, WORKOUT_PROGRAM_KEY, YOGA_SCHEDULE_KEY, YOGA_FOCUS,
  TODAY_WATER_KEY, writeTodayMood, toggleSymptomForDay, SYMPTOM_OPTIONS,
} from "@/lib/crossToolData";
import { setSleepQuality, setSleepHours } from "@/lib/sleepLog";
import { todayISO } from "@/lib/localDate";
import { openCheckout } from "@/lib/paddle";
import { setOnboarded, endGuide } from "@/lib/guidedSetup";

/* ══════════════════════════════════════════════════════════════════════════
   Bloomzein onboarding — the full "Let's make Bloomzein yours" post-signup flow.
   Collects every question the Today setup needs + a first daily check-in, sets
   up EVERY tool from her answers, teases the personalized plan, then presents
   Bloom+ — before dropping her on a Today that's already logged & planned.
   Design mirrors the welcome pages (Playfair serif + script, luxe pink CTA).
   ══════════════════════════════════════════════════════════════════════════ */

const SERIF = '"Playfair Display", Georgia, serif';

// ── answer model ────────────────────────────────────────────────────────────
type FoodStyle = "balanced" | "mediterranean" | "high-protein" | "plant-based" | "flexible";
interface Answers {
  lastPeriod: Date; cycleLength: number; periodLength: number;
  weight: number; height: number; age: number;
  goal: DietGoal; foodStyle: FoodStyle; level: Level | "custom";
  contraceptive: ContraceptiveMethod; reminderTime: string; notifications: boolean;
  mood: string; symptoms: string[]; sleepQ: number; sleepH: number; water: number;
}
const DEFAULT_ANSWERS: Answers = {
  lastPeriod: new Date(), cycleLength: 28, periodLength: 5,
  weight: 65, height: 165, age: 30,
  goal: "lose", foodStyle: "balanced", level: "Beginner" as Level,
  contraceptive: "pill", reminderTime: "20:00", notifications: true,
  mood: "happy", symptoms: [], sleepQ: 4, sleepH: 7, water: 4,
};

const FOOD_MAP: Record<FoodStyle, { dietType: DietType; regime: DietRegime }> = {
  balanced: { dietType: "omnivore", regime: "balanced" },
  mediterranean: { dietType: "omnivore", regime: "mediterranean" },
  "high-protein": { dietType: "omnivore", regime: "high-protein" },
  "plant-based": { dietType: "vegan", regime: "vegan" },
  flexible: { dietType: "omnivore", regime: "balanced" },
};
const GOAL_TO_WORKOUT: Record<DietGoal, WorkoutGoal> = { lose: "tonify", maintain: "energy", gain: "strengthen" };
const PROGRAM_NAME: Record<DietGoal, string> = { lose: "Lean & Tone · 6 weeks", maintain: "Full-Body Flow · 4 weeks", gain: "8-Week Glute Builder" };
const YOGA_SEED: Record<string, string | null> = {
  Mon: "Cycle sync", Tue: null, Wed: "Stress relief", Thu: null, Fri: "Full-body flow", Sat: null, Sun: "Sleep prep",
};

// ── option data ─────────────────────────────────────────────────────────────
const GOALS: { key: DietGoal; title: string; desc: string; Icon: typeof Heart }[] = [
  { key: "lose", title: "Lose weight", desc: "Feel lighter, stronger and more confident in your body.", Icon: Sparkles },
  { key: "maintain", title: "Maintain", desc: "Keep your balance and feel good in your body.", Icon: Heart },
  { key: "gain", title: "Gain & tone", desc: "Build a stronger, healthier and more toned you.", Icon: Dumbbell },
];
const FOODS: { key: FoodStyle; title: string; desc: string; Icon: typeof Heart }[] = [
  { key: "balanced", title: "Balanced", desc: "A mix of everything. Simple, nutritious and sustainable.", Icon: Salad },
  { key: "mediterranean", title: "Mediterranean", desc: "Fresh, colorful and inspired by Mediterranean cuisine.", Icon: Fish },
  { key: "high-protein", title: "High-Protein", desc: "Focus on protein to help you feel full and build lean muscle.", Icon: Beef },
  { key: "plant-based", title: "Plant-Based", desc: "Mostly plant-based meals with no meat or fish.", Icon: Sprout },
  { key: "flexible", title: "Flexible", desc: "I like variety and don't follow a specific style.", Icon: Utensils },
];
const LEVELS: { key: Level | "custom"; title: string; desc: string; Icon: typeof Heart }[] = [
  { key: "Beginner" as Level, title: "Beginner", desc: "I'm new to exercise or getting back into it.", Icon: Footprints },
  { key: "Intermediate" as Level, title: "Intermediate", desc: "I exercise sometimes and want to be more consistent.", Icon: Dumbbell },
  { key: "Advanced" as Level, title: "Advanced", desc: "I exercise regularly and want to level up.", Icon: BarChart3 },
  { key: "custom", title: "Custom", desc: "I prefer to set my own plan later.", Icon: Star },
];
const MOODS: { key: string; label: string; Icon: typeof Heart }[] = [
  { key: "calm", label: "Calm", Icon: Cloud }, { key: "happy", label: "Happy", Icon: Smile },
  { key: "energetic", label: "Energetic", Icon: Sparkles }, { key: "sensitive", label: "Sensitive", Icon: Heart },
  { key: "sad", label: "Sad", Icon: CloudRain }, { key: "tired", label: "Tired", Icon: Battery },
];

const QUESTION_STEPS = ["cycle", "about", "goal", "food", "fitness", "prefs", "checkin"] as const;

// ══ shared chrome ══════════════════════════════════════════════════════════
// Motifs behind everything (fixed, full-bleed on every breakpoint).
function Motifs() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 overflow-hidden">
      {[["8%", "18%", 26, 0.10], ["86%", "30%", 34, 0.09], ["12%", "72%", 30, 0.08], ["90%", "82%", 22, 0.10]].map(([l, t, s, o], i) => (
        <Heart key={i} className="absolute" fill="#EC4899"
          style={{ left: l as string, top: t as string, width: s as number, height: s as number, opacity: o as number, transform: `rotate(${i * 24 - 20}deg)` }} />
      ))}
    </div>
  );
}
// Desktop-only left hero panel — turns the onboarding into a large, screen-
// filling two-panel frame on laptop (like the welcome), while phone/tablet keep
// the single-column layout untouched (everything here is `lg:`-only).
function HeroPanel({ tagline }: { tagline: string }) {
  return (
    <div className="hidden lg:relative lg:flex lg:flex-1 lg:min-h-[34rem] lg:flex-col lg:justify-end lg:overflow-hidden lg:p-9 xl:p-12">
      <img src="/images/page-bg-today-morning.webp" alt="" className="absolute inset-0 h-full w-full object-cover object-[62%_18%]" />
      <div className="absolute inset-0" style={{ background: "linear-gradient(180deg, rgba(255,236,246,0.15) 0%, rgba(160,20,90,0.15) 45%, rgba(140,15,80,0.5) 100%)" }} />
      <div className="relative">
        <div className="inline-flex items-center gap-2"><span className="font-script text-[2.4rem] xl:text-[3rem] leading-none text-white drop-shadow-[0_2px_10px_rgba(120,8,60,0.5)]">Bloomzein</span><BloomFlower size={28} petal="#FFFFFF" center="#EC4899" /></div>
        <p className="mt-1 text-[14px] xl:text-[16px] font-bold text-white/90 drop-shadow">stay soft, bloom on.</p>
        <p className="mt-5 font-script text-[1.9rem] xl:text-[2.5rem] leading-tight text-white drop-shadow-[0_2px_12px_rgba(120,8,60,0.55)]">{tagline} ♡</p>
      </div>
    </div>
  );
}
// The screen frame: single scrolling column on phone/tablet; a big centered
// two-panel card (hero + content) on laptop.
function Frame({ children }: { children: ReactNode }) {
  return (
    <div className="fixed inset-0 z-[95] overflow-y-auto flex justify-center lg:items-start"
      style={{ background: "radial-gradient(120% 90% at 50% 0%, #FFF0F7 0%, #FFE0EF 42%, #FCC7E1 100%)" }}>
      <Motifs />
      {/* laptop: a big two-panel card whose HEIGHT follows the content (no inner
          scrollbar), grows with the screen, and puts the photo on the right. */}
      <div className="relative flex min-h-full w-full max-w-md flex-col lg:min-h-0 lg:my-[4vh] lg:h-auto lg:w-[92vw] lg:max-w-[82rem] xl:max-w-[94rem] 2xl:max-w-[108rem] lg:flex-row-reverse lg:overflow-hidden lg:rounded-[2.5rem] lg:bg-white/45 lg:shadow-[0_30px_90px_rgba(236,72,153,0.22)] lg:ring-1 lg:ring-white/60 lg:backdrop-blur-sm">
        {children}
      </div>
    </div>
  );
}

function Shell({ step, total, onBack, footer, children }: {
  step: number | null; total: number; onBack?: () => void; footer: string; children: ReactNode;
}) {
  return (
    <Frame>
      <HeroPanel tagline="A few little steps to a life that feels like you" />
      <div className="relative flex flex-1 flex-col px-5 pb-8 lg:flex-none lg:w-[38rem] xl:w-[42rem] lg:px-10 lg:py-9"
        style={{ paddingTop: "max(1rem, env(safe-area-inset-top))" }}>
        <div className="flex items-center justify-between py-2">
          {onBack ? <button onClick={onBack} className="inline-flex items-center gap-1 text-hotpink font-bold active:scale-95 transition"><ChevronLeft className="h-5 w-5" /> Back</button> : <span className="w-14" />}
          <div className="text-center leading-none">
            <div className="inline-flex items-center gap-1.5"><span className="font-script text-2xl text-hotpink leading-none">Bloomzein</span><BloomFlower size={18} petal="#EC4899" center="#FFFFFF" /></div>
            <p className="mt-0.5 text-[11px] font-bold text-hotpink/80">stay soft, bloom on.</p>
          </div>
          {step !== null ? <span className="w-14 text-right text-[13px] font-bold text-hotpink/60 tabular-nums">{step + 1}/{total}</span> : <span className="w-14" />}
        </div>
        {step !== null && (
          <div className="mt-1 mb-4 flex items-center gap-1.5">
            {Array.from({ length: total }).map((_, i) => (
              <div key={i} className="flex flex-1 items-center gap-1.5">
                <span className={["grid h-3.5 w-3.5 shrink-0 place-items-center rounded-full transition-all", i <= step ? "bg-hotpink shadow-[0_2px_8px_rgba(236,72,153,0.5)]" : "bg-white/70 ring-1 ring-hotpink/25"].join(" ")}>
                  {i < step && <Check className="h-2 w-2 text-white" strokeWidth={4} />}
                </span>
                {i < total - 1 && <span className={["h-[3px] flex-1 rounded-full", i < step ? "bg-hotpink" : "bg-white/60"].join(" ")} />}
              </div>
            ))}
          </div>
        )}
        <div className="flex-1">{children}</div>
        <div className="mt-6 flex items-end justify-between">
          <p className="font-script text-lg text-hotpink/80 leading-tight max-w-[9rem]">{footer} ♡</p>
          <div className="inline-flex items-center gap-1.5 lg:hidden"><BloomFlower size={18} petal="#EC4899" center="#FFFFFF" /><span className="text-[11px] font-bold text-hotpink/80">stay soft, bloom on.</span></div>
        </div>
      </div>
    </Frame>
  );
}

function Eyebrow({ children }: { children: ReactNode }) {
  return <p className="text-[13px] font-extrabold uppercase tracking-[0.22em] text-hotpink/70">{children}</p>;
}
function Title({ serif, script }: { serif: string; script: string }) {
  return (
    <h1 className="mt-1 leading-[0.95]">
      <span className="block text-[2.15rem] font-bold text-[#7a1247]" style={{ fontFamily: SERIF }}>{serif}</span>
      <span className="inline-flex items-end gap-1.5 font-script text-[2.3rem] text-hotpink leading-[0.9]">{script} <Heart className="mb-1 h-6 w-6 text-hotpink" strokeWidth={2.4} /></span>
    </h1>
  );
}
function Sub({ children }: { children: ReactNode }) { return <p className="mt-1.5 text-[14px] leading-snug text-rose/70">{children}</p>; }

function OptionCard({ Icon, title, desc, selected, onClick }: { Icon: typeof Heart; title: string; desc: string; selected: boolean; onClick: () => void; }) {
  return (
    <button onClick={onClick} className={["group flex w-full items-center gap-3 rounded-[1.25rem] border p-2.5 text-left transition active:scale-[0.99]", selected ? "border-hotpink bg-white ring-2 ring-hotpink/30 shadow-[0_8px_24px_rgba(236,72,153,0.16)]" : "border-white/70 bg-white/70 hover:bg-white/90"].join(" ")}>
      <span className={["grid h-11 w-11 shrink-0 place-items-center rounded-full", selected ? "bg-hotpink/15" : "bg-hotpink/10"].join(" ")}><Icon className="h-6 w-6 text-hotpink" strokeWidth={1.9} /></span>
      <span className="min-w-0 flex-1"><span className="block text-[16px] font-extrabold text-hotpink leading-tight">{title}</span><span className="mt-0.5 block text-[12.5px] leading-snug text-rose/75">{desc}</span></span>
      <span className={["grid h-5 w-5 shrink-0 place-items-center rounded-full border-2", selected ? "border-hotpink" : "border-hotpink/40"].join(" ")}>{selected && <span className="h-2.5 w-2.5 rounded-full bg-hotpink" />}</span>
    </button>
  );
}
function Stepper({ Icon, label, desc, value, unit, min, max, step = 1, onChange }: { Icon: typeof Heart; label: string; desc: string; value: number; unit: string; min: number; max: number; step?: number; onChange: (v: number) => void; }) {
  return (
    <div className="rounded-[1.25rem] border border-white/70 bg-white/70 p-3">
      <div className="flex items-start gap-2.5"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-hotpink/10"><Icon className="h-5 w-5 text-hotpink" strokeWidth={1.9} /></span><div className="flex-1"><p className="text-[14px] font-extrabold text-hotpink leading-tight">{label}</p><p className="mt-0.5 text-[11.5px] leading-snug text-rose/70">{desc}</p></div></div>
      <div className="mt-2.5 flex items-center justify-between rounded-full bg-white/80 p-1 ring-1 ring-hotpink/15">
        <button onClick={() => onChange(Math.max(min, value - step))} className="grid h-8 w-8 place-items-center rounded-full bg-hotpink/10 text-hotpink active:scale-90 transition"><Minus className="h-4 w-4" strokeWidth={3} /></button>
        <span className="text-[17px] font-extrabold text-rose tabular-nums">{value} {unit}</span>
        <button onClick={() => onChange(Math.min(max, value + step))} className="grid h-8 w-8 place-items-center rounded-full bg-hotpink text-white active:scale-90 transition"><Plus className="h-4 w-4" strokeWidth={3} /></button>
      </div>
    </div>
  );
}
function ContinueBtn({ onClick, label = "Continue" }: { onClick: () => void; label?: string }) {
  return <button onClick={onClick} className="bloom-luxury-btn animate-cta-bounce mt-4 flex w-full items-center justify-center gap-2 py-3 text-[16px] font-bold text-white">{label} <ArrowRight className="h-5 w-5" /></button>;
}
function MiniCalendar({ value, onPick }: { value: Date; onPick: (d: Date) => void }) {
  const [view, setView] = useState(new Date(value.getFullYear(), value.getMonth(), 1));
  const y = view.getFullYear(), m = view.getMonth();
  const first = new Date(y, m, 1).getDay();
  const days = new Date(y, m + 1, 0).getDate();
  const cells: (number | null)[] = [...Array(first).fill(null), ...Array.from({ length: days }, (_, i) => i + 1)];
  const label = view.toLocaleString("en-US", { month: "long", year: "numeric" });
  const isToday = (d: number) => { const t = new Date(); return t.getFullYear() === y && t.getMonth() === m && t.getDate() === d; };
  const sel = (d: number) => value.getFullYear() === y && value.getMonth() === m && value.getDate() === d;
  return (
    <div className="rounded-2xl bg-white/85 p-3 ring-1 ring-hotpink/15">
      <div className="flex items-center justify-between px-1"><button onClick={() => setView(new Date(y, m - 1, 1))} className="grid h-8 w-8 place-items-center rounded-full text-hotpink active:scale-90"><ChevronLeft className="h-5 w-5" /></button><span className="text-[15px] font-extrabold text-rose">{label}</span><button onClick={() => setView(new Date(y, m + 1, 1))} className="grid h-8 w-8 place-items-center rounded-full text-hotpink active:scale-90"><ChevronRight className="h-5 w-5" /></button></div>
      <div className="mt-2 grid grid-cols-7 gap-0.5 text-center text-[10px] font-bold uppercase text-hotpink/50">{["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => <span key={d}>{d.slice(0, 3)}</span>)}</div>
      <div className="mt-1 grid grid-cols-7 gap-0.5">{cells.map((d, i) => d === null ? <span key={i} /> : (
        <button key={i} onClick={() => onPick(new Date(y, m, d))} className={["mx-auto grid h-9 w-9 place-items-center rounded-full text-[14px] font-semibold transition", sel(d) ? "bg-hotpink text-white shadow-[0_3px_10px_rgba(236,72,153,0.5)]" : isToday(d) ? "text-hotpink ring-1 ring-hotpink/40" : "text-rose/80 hover:bg-hotpink/10"].join(" ")}>{d}</button>
      ))}</div>
    </div>
  );
}

// ══ main component ══════════════════════════════════════════════════════════
export function BloomOnboarding({ onDone, preview = false }: { onDone: () => void; preview?: boolean }) {
  const { user, updateProfile } = useAuth();
  const [a, setA] = useState<Answers>(DEFAULT_ANSWERS);
  const [stage, setStage] = useState<string>("welcome");
  const [billing, setBilling] = useState<"monthly" | "annual">("annual");
  const [summary, setSummary] = useState<{ kcal: number; meals: number; sample: string[] }>({ kcal: 0, meals: 0, sample: [] });
  const patch = (p: Partial<Answers>) => setA((x) => ({ ...x, ...p }));
  const qIndex = QUESTION_STEPS.indexOf(stage as typeof QUESTION_STEPS[number]);
  const total = QUESTION_STEPS.length;
  const go = (s: string) => { setStage(s); try { window.scrollTo(0, 0); } catch { /* ignore */ } };

  // real recipe thumbnails for the sneak-peek meal card
  const mealThumbs = useMemo(() => {
    const pick = (t: string) => RECIPES.find((r) => r.mealType === t);
    return [
      { label: "Breakfast", r: pick("breakfast") }, { label: "Lunch", r: pick("lunch") }, { label: "Dinner", r: pick("dinner") },
    ].filter((x) => x.r);
  }, []);

  // ── save EVERYTHING (this is the whole point) ──────────────────────────────
  async function applySetup() {
    if (preview) {
      const bmr = 10 * a.weight + 6.25 * a.height - 5 * a.age - 161;
      const adj = a.goal === "lose" ? -0.15 : a.goal === "gain" ? 0.1 : 0;
      setSummary({ kcal: Math.round(bmr * 1.375 * (1 + adj)), meals: 28, sample: RECIPES.slice(0, 3).map((r) => r.name) });
      return;
    }
    writeCycleSettings({ ...DEFAULT_CYCLE_SETTINGS, lastPeriodStart: a.lastPeriod, cycleLength: a.cycleLength, periodLength: a.periodLength, contraceptiveMethod: a.contraceptive, contraceptiveReminder: true, reminderHour: a.reminderTime, deviceNotifications: a.notifications, trackerMode: "protection" });
    try { await updateProfile({ setup_done: true, age: a.age, weight: a.weight, weight_unit: "kg" }); } catch { /* offline ok */ }
    const food = FOOD_MAP[a.foodStyle];
    updateDietProfile({ goal: a.goal, weight: a.weight, heightCm: a.height, age: a.age, dietType: food.dietType, regime: food.regime });
    try { localStorage.setItem(DIET_SETUP_KEY, JSON.stringify(true)); } catch { /* ignore */ }
    const level: Level = a.level === "custom" ? ("Beginner" as Level) : a.level;
    const wprofile: WorkoutProfile = { level, goal: GOAL_TO_WORKOUT[a.goal], equipment: "none", daysPerWeek: 3 };
    try { localStorage.setItem(WORKOUT_PROFILE_KEY, JSON.stringify(wprofile)); } catch { /* ignore */ }
    const phase = readCyclePhase() ?? "follicular";
    try { const { generateWeeklyPlan } = await import("@/pages/app.tools.workout"); localStorage.setItem(WORKOUT_PROGRAM_KEY, JSON.stringify(generateWeeklyPlan(wprofile, phase as never))); } catch { /* ignore */ }
    try { localStorage.setItem(YOGA_SCHEDULE_KEY, JSON.stringify(YOGA_SEED)); } catch { /* ignore */ }
    let meals = 0, sample: string[] = [];
    try { const { seedMealMonthFromProfile } = await import("@/pages/app.tools.meals"); const r = seedMealMonthFromProfile(); meals = r.meals; sample = r.sample; } catch { /* ignore */ }
    // first daily check-in → Today opens already logged
    const iso = todayISO();
    try { writeTodayMood(a.mood); } catch { /* ignore */ }
    try { a.symptoms.forEach((s) => toggleSymptomForDay(iso, s)); } catch { /* ignore */ }
    try { setSleepQuality(iso, a.sleepQ); if (a.sleepH) setSleepHours(iso, a.sleepH); } catch { /* ignore */ }
    try { localStorage.setItem(TODAY_WATER_KEY, JSON.stringify({ date: iso, count: a.water })); } catch { /* ignore */ }
    let kcal = 0; try { kcal = Math.round(computeTargets(true).calories); } catch { /* ignore */ }
    setOnboarded(); endGuide();
    try { window.dispatchEvent(new Event("storage")); } catch { /* ignore */ }
    setSummary({ kcal, meals, sample });
  }

  // ── WELCOME (custom hero) ──────────────────────────────────────────────────
  if (stage === "welcome") {
    const tools = [{ Icon: Moon, l: "Cycle" }, { Icon: Dumbbell, l: "Workout" }, { Icon: Salad, l: "Meals" }, { Icon: Heart, l: "Mind" }, { Icon: CalendarDays, l: "Life" }];
    const checks = ["Personalized to your cycle", "Practical and easy to follow", "Tailored to your goals", "Made for real life", "All in one place", "You can always adjust later"];
    return (
      <Frame>
        <HeroPanel tagline="A life that feels like you" />
        <div className="relative flex flex-1 flex-col lg:flex-none lg:w-[38rem] xl:w-[42rem]">
          {/* mobile/tablet hero band — replaced by the left HeroPanel on laptop */}
          <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-[52vh] min-h-[360px] overflow-hidden lg:hidden">
            <img src="/images/page-bg-today-morning.webp" alt="" className="absolute inset-0 h-full w-full object-cover object-[68%_20%]" />
            <div className="absolute inset-0" style={{ background: "linear-gradient(105deg, rgba(255,236,246,0.92) 0%, rgba(255,224,239,0.62) 38%, rgba(255,214,235,0.12) 62%, transparent 82%)" }} />
            <div className="absolute inset-x-0 bottom-0 h-40" style={{ background: "linear-gradient(180deg, transparent, #FFE7F2 78%, #FFECF5 100%)" }} />
          </div>
          <div className="relative px-5 pb-8 lg:px-9 lg:py-8" style={{ paddingTop: "max(1.25rem, env(safe-area-inset-top))" }}>
            <div className="inline-flex items-center gap-1.5 lg:hidden"><span className="font-script text-[2rem] leading-none text-hotpink">Bloomzein</span><BloomFlower size={22} petal="#EC4899" center="#FFFFFF" /></div>
            <p className="mt-0.5 text-[13px] font-bold text-hotpink/85 lg:hidden">stay soft, bloom on.</p>
            <h1 className="mt-6 leading-[0.9] lg:mt-0"><span className="block text-[3rem] font-bold text-[#7a1247]" style={{ fontFamily: SERIF }}>Let's make</span><span className="inline-flex items-end gap-2 text-[3rem] font-bold text-[#7a1247]" style={{ fontFamily: SERIF }}>this yours. <Heart className="mb-2 h-8 w-8 text-hotpink" strokeWidth={2.4} /></span></h1>
            <p className="mt-3 max-w-[19rem] text-[16px] leading-snug text-[#a3316f] lg:max-w-none">A few little questions and Bloomzein will build <b className="font-extrabold text-[#7a1247]">your personalized world</b> — around your body, your goals and your everyday life.</p>
            <div className="mt-8 flex justify-between gap-1 lg:mt-6">{tools.map((t) => (<div key={t.l} className="flex flex-col items-center gap-1.5"><span className="grid h-14 w-14 place-items-center rounded-full bg-white/85 shadow-[0_8px_20px_rgba(236,72,153,0.18)] ring-1 ring-white/70"><t.Icon className="h-6 w-6 text-hotpink" strokeWidth={1.9} /></span><span className="font-script text-[15px] text-hotpink">{t.l}</span></div>))}</div>
            <div className="mt-6 rounded-[1.6rem] bg-white/70 p-4 shadow-[0_12px_34px_rgba(236,72,153,0.14)] ring-1 ring-white/70">
              <p className="inline-flex items-center gap-1.5 font-script text-[1.4rem] text-hotpink leading-none">A life that feels like you <Heart className="h-5 w-5 text-hotpink" strokeWidth={2.4} /></p>
              <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2.5">{checks.map((c) => (<div key={c} className="flex items-start gap-1.5"><span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-hotpink/15"><Check className="h-3 w-3 text-hotpink" strokeWidth={4} /></span><span className="text-[13px] font-semibold leading-snug text-rose/85">{c}</span></div>))}</div>
            </div>
            <button onClick={() => go("cycle")} className="bloom-luxury-btn animate-cta-bounce mt-6 flex w-full items-center justify-center gap-2.5 py-4 text-[19px] font-bold text-white"><Sparkles className="h-5 w-5" /> Let's bloom <ArrowRight className="h-5 w-5" /></button>
            <p className="mt-2.5 text-center text-[12px] font-semibold text-hotpink/70">Takes about 2 minutes • You can change everything later</p>
          </div>
        </div>
      </Frame>
    );
  }

  if (stage === "cycle") return (
    <Shell step={qIndex} total={total} onBack={() => go("welcome")} footer="Small steps a brighter you">
      <Eyebrow>Your cycle</Eyebrow><Title serif="Let's get to know" script="your cycle" />
      <Sub>A few details to understand your cycle and create a plan that fits you.</Sub>
      <div className="mt-3 space-y-2.5">
        <div className="rounded-[1.4rem] border border-white/70 bg-white/70 p-3.5"><p className="text-[15px] font-extrabold text-hotpink leading-tight">When did your last period start?</p><p className="mb-2.5 mt-0.5 text-[12px] text-rose/70">Tap the date on the calendar.</p><MiniCalendar value={a.lastPeriod} onPick={(d) => patch({ lastPeriod: d })} /></div>
        <Stepper Icon={CalendarHeart} label="How long is your cycle?" desc="From the first day of your period to the day before the next." value={a.cycleLength} unit="days" min={21} max={40} onChange={(v) => patch({ cycleLength: v })} />
        <Stepper Icon={Heart} label="How long does your period last?" desc="The number of days you typically have bleeding." value={a.periodLength} unit="days" min={2} max={10} onChange={(v) => patch({ periodLength: v })} />
      </div><ContinueBtn onClick={() => go("about")} />
    </Shell>
  );

  if (stage === "about") return (
    <Shell step={qIndex} total={total} onBack={() => go("cycle")} footer="Same girl brighter days ahead">
      <Eyebrow>About you</Eyebrow><Title serif="Tell us a little" script="about you" />
      <Sub>These details help us create a plan that fits your body and your goals.</Sub>
      <div className="mt-3 space-y-2.5">
        <Stepper Icon={Scale} label="What's your weight?" desc="This helps us personalize your nutrition and workout plan." value={a.weight} unit="kg" min={35} max={200} onChange={(v) => patch({ weight: v })} />
        <Stepper Icon={Ruler} label="What's your height?" desc="This helps us calculate your energy needs accurately." value={a.height} unit="cm" min={130} max={210} onChange={(v) => patch({ height: v })} />
        <Stepper Icon={Cake} label="What's your age?" desc="Your age helps us personalize your experience even better." value={a.age} unit="years" min={13} max={90} onChange={(v) => patch({ age: v })} />
      </div><ContinueBtn onClick={() => go("goal")} />
    </Shell>
  );

  if (stage === "goal") return (
    <Shell step={qIndex} total={total} onBack={() => go("about")} footer="Same girl brighter days ahead">
      <Eyebrow>Your goal</Eyebrow><Title serif="What are you" script="blooming toward?" />
      <Sub>Choose your main goal so we can create a personalized nutrition and workout plan for you.</Sub>
      <div className="mt-3 space-y-2">{GOALS.map((g) => <OptionCard key={g.key} {...g} selected={a.goal === g.key} onClick={() => patch({ goal: g.key })} />)}</div>
      <ContinueBtn onClick={() => go("food")} />
    </Shell>
  );

  if (stage === "food") return (
    <Shell step={qIndex} total={total} onBack={() => go("goal")} footer="Small choices Big changes">
      <Eyebrow>Your food style</Eyebrow><Title serif="How do you" script="like to eat?" />
      <Sub>Choose the style that fits you best. You can always change this later.</Sub>
      <div className="mt-3 space-y-2">{FOODS.map((f) => <OptionCard key={f.key} {...f} selected={a.foodStyle === f.key} onClick={() => patch({ foodStyle: f.key })} />)}</div>
      <ContinueBtn onClick={() => go("fitness")} />
    </Shell>
  );

  if (stage === "fitness") return (
    <Shell step={qIndex} total={total} onBack={() => go("food")} footer="Small steps Big results">
      <Eyebrow>Your fitness</Eyebrow><Title serif="What's your" script="fitness level?" />
      <Sub>This helps us create a workout plan that fits you and your goals.</Sub>
      <div className="mt-3 space-y-2">{LEVELS.map((l) => <OptionCard key={String(l.key)} {...l} selected={a.level === l.key} onClick={() => patch({ level: l.key })} />)}</div>
      <ContinueBtn onClick={() => go("prefs")} />
    </Shell>
  );

  if (stage === "prefs") {
    const methods: { key: ContraceptiveMethod; label: string; Icon: typeof Heart }[] = [{ key: "pill", label: "Pill", Icon: Pill }, { key: "patch", label: "Patch", Icon: Circle }, { key: "ring", label: "Ring", Icon: Circle }];
    const times = ["07:00", "08:00", "12:00", "18:00", "20:00", "21:00"];
    return (
      <Shell step={qIndex} total={total} onBack={() => go("fitness")} footer="Small choices Big changes">
        <Eyebrow>Your cycle</Eyebrow><Title serif="A few" script="preferences" />
        <Sub>Help us personalize your experience with a few more details.</Sub>
        <div className="mt-3 space-y-2.5">
          <div className="rounded-[1.4rem] border border-white/70 bg-white/70 p-3.5"><p className="text-[15px] font-extrabold text-hotpink leading-tight">Do you use a contraceptive method?</p><p className="mb-2.5 mt-0.5 text-[12px] text-rose/70">This helps us give you more accurate insights.</p>
            <div className="grid grid-cols-3 gap-2">{methods.map((m) => (<button key={m.key} onClick={() => patch({ contraceptive: m.key })} className={["flex flex-col items-center gap-1.5 rounded-2xl border py-3 transition active:scale-95", a.contraceptive === m.key ? "border-hotpink bg-hotpink/10 ring-1 ring-hotpink/30" : "border-white/70 bg-white/60"].join(" ")}><m.Icon className="h-5 w-5 text-hotpink" strokeWidth={2} /><span className="text-[13px] font-bold text-rose/85">{m.label}</span></button>))}</div>
          </div>
          <div className="rounded-[1.4rem] border border-white/70 bg-white/70 p-3.5"><div className="flex items-start gap-3"><span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-hotpink/10"><Bell className="h-5 w-5 text-hotpink" strokeWidth={2} /></span><div className="flex-1"><p className="text-[15px] font-extrabold text-hotpink leading-tight">When would you like your daily reminder?</p><p className="mt-0.5 text-[12px] text-rose/70">We'll remind you about your cycle, self-care and more.</p></div></div>
            <div className="mt-3 flex flex-wrap gap-2">{times.map((t) => (<button key={t} onClick={() => patch({ reminderTime: t })} className={["inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-[13px] font-bold transition active:scale-95", a.reminderTime === t ? "border-hotpink bg-hotpink text-white" : "border-hotpink/30 bg-white/70 text-rose/80"].join(" ")}><Clock className="h-3.5 w-3.5" /> {t}</button>))}</div>
          </div>
          <div className="rounded-[1.4rem] border border-white/70 bg-white/70 p-3.5"><p className="text-[15px] font-extrabold text-hotpink leading-tight">Would you like Bloomzein to send notifications?</p><p className="mb-2.5 mt-0.5 text-[12px] text-rose/70">Get reminders and personalized tips on your devices.</p>
            <button onClick={() => patch({ notifications: !a.notifications })} className="flex w-full items-center justify-between rounded-xl bg-white/80 px-3 py-2.5 ring-1 ring-hotpink/15"><span className="text-[13px] font-bold text-rose/85">Yes, send me notifications</span><span className={["relative h-6 w-11 rounded-full transition-colors", a.notifications ? "bg-hotpink" : "bg-rose/25"].join(" ")}><span className="absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all" style={{ left: a.notifications ? "1.375rem" : "0.125rem" }} /></span></button>
            <div className="mt-2.5 grid grid-cols-3 gap-2">{[{ Icon: Smartphone, l: "Phone" }, { Icon: Tablet, l: "Tablet" }, { Icon: Laptop, l: "Laptop" }].map((d) => (<div key={d.l} className={["flex flex-col items-center gap-1 rounded-2xl py-2.5 transition", a.notifications ? "bg-hotpink/10" : "bg-white/50 opacity-60"].join(" ")}><d.Icon className="h-5 w-5 text-hotpink" strokeWidth={2} /><span className="text-[11px] font-bold text-rose/80">{d.l}</span></div>))}</div>
          </div>
        </div>
        <ContinueBtn onClick={() => go("checkin")} />
      </Shell>
    );
  }

  // ── CHECK-IN (mood · symptoms · sleep · water → Today opens logged) ─────────
  if (stage === "checkin") {
    const toggleSym = (s: string) => patch({ symptoms: a.symptoms.includes(s) ? a.symptoms.filter((x) => x !== s) : [...a.symptoms, s] });
    return (
      <Shell step={qIndex} total={total} onBack={() => go("prefs")} footer="Check in, beautifully">
        <Eyebrow>Today's check-in</Eyebrow><Title serif="How are you" script="feeling today?" />
        <Sub>One last little check-in — your Today will open already tuned to how you feel.</Sub>
        <div className="mt-3 space-y-2.5">
          <div className="rounded-[1.4rem] border border-white/70 bg-white/70 p-3.5"><p className="text-[14px] font-extrabold text-hotpink">Your mood</p>
            <div className="mt-2.5 grid grid-cols-3 gap-2">{MOODS.map((m) => (<button key={m.key} onClick={() => patch({ mood: m.key })} className={["flex flex-col items-center gap-1 rounded-2xl py-2.5 transition active:scale-95", a.mood === m.key ? "bg-hotpink/12 ring-1 ring-hotpink/35" : "bg-white/60"].join(" ")}><m.Icon className="h-5 w-5 text-hotpink" strokeWidth={2} /><span className="text-[12px] font-bold text-rose/85">{m.label}</span></button>))}</div>
          </div>
          <div className="rounded-[1.4rem] border border-white/70 bg-white/70 p-3.5"><p className="text-[14px] font-extrabold text-hotpink">Any symptoms? <span className="font-semibold text-rose/60">(optional)</span></p>
            <div className="mt-2.5 flex flex-wrap gap-2">{SYMPTOM_OPTIONS.map((s) => (<button key={s} onClick={() => toggleSym(s)} className={["rounded-full border px-3 py-1.5 text-[13px] font-bold transition active:scale-95", a.symptoms.includes(s) ? "border-hotpink bg-hotpink text-white" : "border-hotpink/30 bg-white/70 text-rose/80"].join(" ")}>{s}</button>))}</div>
          </div>
          <div className="rounded-[1.4rem] border border-white/70 bg-white/70 p-3.5"><div className="flex items-center gap-2"><Moon className="h-5 w-5 text-hotpink" /><p className="text-[14px] font-extrabold text-hotpink">How did you sleep?</p></div>
            <div className="mt-2.5 flex items-center justify-between">{[1, 2, 3, 4, 5].map((n) => (<button key={n} onClick={() => patch({ sleepQ: n })} className={["grid h-10 w-10 place-items-center rounded-full transition active:scale-90", n <= a.sleepQ ? "bg-hotpink text-white" : "bg-white/70 text-hotpink/40 ring-1 ring-hotpink/20"].join(" ")}><Star className="h-5 w-5" fill={n <= a.sleepQ ? "currentColor" : "none"} /></button>))}</div>
            <div className="mt-3"><Stepper Icon={Clock} label="Hours slept" desc="Roughly how many hours last night." value={a.sleepH} unit="h" min={3} max={12} onChange={(v) => patch({ sleepH: v })} /></div>
          </div>
          <div className="rounded-[1.4rem] border border-white/70 bg-white/70 p-3.5"><div className="flex items-center gap-2"><Droplets className="h-5 w-5 text-hotpink" /><p className="text-[14px] font-extrabold text-hotpink">Water so far today</p></div>
            <div className="mt-2.5 flex items-center justify-between rounded-full bg-white/80 p-1.5 ring-1 ring-hotpink/15"><button onClick={() => patch({ water: Math.max(0, a.water - 1) })} className="grid h-9 w-9 place-items-center rounded-full bg-hotpink/10 text-hotpink active:scale-90"><Minus className="h-4 w-4" strokeWidth={3} /></button><span className="text-[17px] font-extrabold text-rose">{a.water} glasses</span><button onClick={() => patch({ water: Math.min(12, a.water + 1) })} className="grid h-9 w-9 place-items-center rounded-full bg-hotpink text-white active:scale-90"><Plus className="h-4 w-4" strokeWidth={3} /></button></div>
          </div>
        </div>
        <ContinueBtn onClick={async () => { go("building"); await applySetup(); go("previews"); }} label="Build my world" />
      </Shell>
    );
  }

  if (stage === "building") return (
    <Shell step={null} total={total} footer="Building your world">
      <div className="grid min-h-[60vh] place-items-center text-center"><div><span className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-white/70 animate-card-breathe"><BloomFlower size={56} petal="#EC4899" center="#FFFFFF" className="animate-[spin_9s_linear_infinite]" /></span><p className="mt-4 font-script text-3xl text-hotpink">Building your world…</p><p className="mt-1 text-[14px] text-rose/70">Syncing your cycle, meals & movement ✿</p></div></div>
    </Shell>
  );

  // ── SNEAK PEEK previews ────────────────────────────────────────────────────
  if (stage === "previews") {
    const wThumbs = [{ img: "/images/workout-hip-thrust.webp", tag: "3 sets" }, { img: "/images/workout-glute-bridge.webp", tag: "15 reps" }, { img: "/images/workout-squat.webp", tag: "12 reps" }];
    const yThumbs = [{ img: YOGA_FOCUS["Sleep prep"].image, tag: "10 min" }, { img: YOGA_FOCUS["Stress relief"].image, tag: "15 min" }, { img: YOGA_FOCUS["Cycle sync"].image, tag: "20 min" }];
    const Card = ({ Icon, title, blurb, plan, thumbs }: { Icon: typeof Heart; title: string; blurb: string; plan: string; thumbs: { img: string; tag: string; label?: string }[] }) => (
      <div className="rounded-[1.6rem] bg-white/75 p-3.5 shadow-[0_10px_28px_rgba(236,72,153,0.12)] ring-1 ring-white/70">
        <div className="flex items-start gap-3"><span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-hotpink/12"><Icon className="h-6 w-6 text-hotpink" strokeWidth={1.9} /></span><div className="min-w-0 flex-1"><p className="text-[19px] font-extrabold text-hotpink leading-tight">{title}</p><p className="mt-0.5 text-[12.5px] leading-snug text-rose/75">{blurb}</p></div></div>
        <div className="mt-2.5 inline-flex items-center gap-1.5 rounded-full bg-hotpink/10 px-3 py-1"><Sparkles className="h-3.5 w-3.5 text-hotpink" /><span className="text-[12px] font-extrabold text-hotpink">{plan}</span></div>
        <div className="mt-3 grid grid-cols-3 gap-2">{thumbs.map((t, i) => (<div key={i} className="relative aspect-square overflow-hidden rounded-xl ring-1 ring-white/70"><img src={t.img} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover" /><span className="absolute inset-x-1 bottom-1 rounded-md bg-white/90 py-0.5 text-center text-[10px] font-extrabold text-hotpink">{t.label ?? t.tag}</span></div>))}</div>
      </div>
    );
    const phaseLabel = (readCyclePhase() ?? "follicular");
    return (
      <Shell step={null} total={total} onBack={() => go("checkin")} footer="Small steps Big results">
        <Eyebrow>A sneak peek</Eyebrow><Title serif="Here's what's inside" script="your personalized plan" />
        <Sub>A preview of the workouts, yoga flows and meal ideas you'll unlock. Everything is tailored to you!</Sub>
        <div className="mt-3 space-y-2.5">
          <Card Icon={Dumbbell} title="Workouts" blurb="Effective at-home workouts, tailored to your level and goals." plan={PROGRAM_NAME[a.goal]} thumbs={wThumbs} />
          <Card Icon={Flower2} title="Yoga" blurb="Calming and energizing flows for every phase of your cycle." plan="Period Cramps · PMS Relief · Energy" thumbs={yThumbs} />
          <div className="rounded-[1.6rem] bg-white/75 p-3.5 shadow-[0_10px_28px_rgba(236,72,153,0.12)] ring-1 ring-white/70">
            <div className="flex items-start gap-3"><span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-hotpink/12"><Salad className="h-6 w-6 text-hotpink" strokeWidth={1.9} /></span><div className="min-w-0 flex-1"><p className="text-[19px] font-extrabold text-hotpink leading-tight">Meals</p><p className="mt-0.5 text-[12.5px] leading-snug text-rose/75">A full week of nutritious recipes to fuel your body and reach your goals.</p></div></div>
            <div className="mt-2.5 inline-flex items-center gap-1.5 rounded-full bg-hotpink/10 px-3 py-1"><Sparkles className="h-3.5 w-3.5 text-hotpink" /><span className="text-[12px] font-extrabold text-hotpink">{summary.meals || 28} meals · synced to your {phaseLabel} phase</span></div>
            <div className="mt-3 grid grid-cols-3 gap-2">{mealThumbs.map((m) => (<div key={m.label} className="relative aspect-square overflow-hidden rounded-xl ring-1 ring-white/70"><img src={recipeImageSrc(m.r!)} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover" /><span className="absolute inset-x-1 bottom-1 rounded-md bg-white/90 py-0.5 text-center text-[10px] font-extrabold text-hotpink">{m.label}</span></div>))}</div>
            {summary.sample.length > 0 && <p className="mt-2.5 text-[12px] leading-snug text-rose/70">Like <b className="text-hotpink">{summary.sample.slice(0, 3).join(" · ")}</b> — portioned to your {summary.kcal ? `${summary.kcal.toLocaleString()} kcal` : "daily"} target.</p>}
          </div>
        </div>
        <ContinueBtn onClick={() => go("pricing")} label="Looks good! Continue" />
        <p className="mt-2.5 flex items-center justify-center gap-1.5 text-[12px] font-semibold text-hotpink/70"><Lock className="h-3.5 w-3.5" /> You'll choose your plan on the next step</p>
      </Shell>
    );
  }

  // ── PRICING (Bloom+) ───────────────────────────────────────────────────────
  if (stage === "pricing") {
    const features = [
      { Icon: Flower2, t: "Cycle tracking that syncs every tool to your phase" },
      { Icon: Utensils, t: "Your whole week of meals, auto-planned & shoppable" },
      { Icon: Dumbbell, t: "Full workout & yoga programs matched to your cycle" },
      { Icon: Flame, t: "Energy engine — daily target, macros & goal timeline" },
      { Icon: CalendarDays, t: "A big calendar & life organizer for your month" },
      { Icon: Sparkles, t: "Long-term mood, health & progress insights" },
    ];
    const finish = () => { if (!preview) setOnboarded(); onDone(); };
    const startTrial = () => {
      if (preview) { onDone(); return; }
      setOnboarded();
      openCheckout(billing, { userId: user?.id, email: user?.email }).catch(() => { /* overlay failed — she stays, can Continue free */ });
    };
    const Plan = ({ id, name, price, per, badge }: { id: "monthly" | "annual"; name: string; price: string; per: string; badge?: string }) => (
      <button onClick={() => setBilling(id)} className={["relative rounded-[1.3rem] p-3 text-center transition active:scale-[0.98]", billing === id ? "bg-white ring-2 ring-hotpink shadow-[0_10px_28px_rgba(236,72,153,0.2)]" : "bg-white/75 ring-1 ring-hotpink/15"].join(" ")}>
        {badge && <span className="absolute -top-2 left-1/2 -translate-x-1/2 rounded-full bg-hotpink px-2 py-0.5 text-[10px] font-black text-white">{badge}</span>}
        <p className="text-[12px] font-extrabold text-rose/70">{name}</p>
        <p className="mt-0.5 text-[1.7rem] font-extrabold leading-none text-hotpink">{price}</p>
        <p className="text-[11px] font-semibold text-rose/60">{per}</p>
      </button>
    );
    return (
      <Frame>
        <HeroPanel tagline="Your whole world, unlocked" />
        <div className="relative flex flex-1 flex-col px-5 pb-6 lg:flex-none lg:w-[38rem] xl:w-[42rem] lg:px-10 lg:py-9" style={{ paddingTop: "max(1rem, env(safe-area-inset-top))" }}>
          <button onClick={() => go("previews")} className="inline-flex items-center gap-1 text-hotpink font-bold active:scale-95"><ChevronLeft className="h-5 w-5" /> Back</button>
          <div className="mt-2 text-center">
            <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl text-white shadow-md" style={{ background: "linear-gradient(135deg,#B76E79,#EC4899)" }}><Sparkles className="h-6 w-6" /></span>
            <p className="mt-2 text-[11px] font-black uppercase tracking-[0.22em]" style={{ color: "#B76E79" }}>Bloom+ Premium</p>
            <h1 className="mt-0.5 leading-[0.95]"><span className="block text-[1.9rem] font-bold text-[#7a1247]" style={{ fontFamily: SERIF }}>Your whole world,</span><span className="font-script text-[2.1rem] text-hotpink">unlocked ♡</span></h1>
            <p className="mx-auto mt-1.5 max-w-[20rem] text-[13px] leading-snug text-rose/75">Everything you just set up — cycle, meals, movement, energy & more. Start with a <b className="text-hotpink">3-day free trial</b>, cancel anytime.</p>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2.5">
            <Plan id="monthly" name="Monthly" price="$9.99" per="per month" />
            <Plan id="annual" name="Yearly" price="$59" per="per year" badge="SAVE 51%" />
          </div>
          <div className="mt-3 rounded-[1.4rem] bg-white/70 p-3.5 ring-1 ring-white/70"><div className="space-y-2">{features.map((f) => (<div key={f.t} className="flex items-start gap-2.5"><span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-hotpink/12"><f.Icon className="h-3 w-3 text-hotpink" strokeWidth={2.2} /></span><span className="text-[12.5px] font-semibold leading-snug text-rose/85">{f.t}</span></div>))}</div></div>
          <button onClick={startTrial} className="bloom-luxury-btn animate-cta-bounce mt-4 flex w-full items-center justify-center gap-2.5 py-3.5 text-[17px] font-bold text-white"><Sparkles className="h-5 w-5" /> Start 3-day free trial</button>
          <button onClick={finish} className="mt-2 w-full rounded-2xl border border-hotpink/30 bg-white/60 py-2.5 text-[14px] font-bold text-hotpink active:scale-[0.99] transition">Continue with the free version</button>
          <p className="mt-2 flex items-center justify-center gap-1.5 text-center text-[11px] font-semibold text-rose/60"><Check className="h-3.5 w-3.5 text-emerald-500" strokeWidth={3} /> 3-day free trial · cancel anytime · no hidden fees</p>
        </div>
      </Frame>
    );
  }

  return null;
}

export default BloomOnboarding;
