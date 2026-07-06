import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  ArrowLeft, Search, X, Plus, Clock, Flame, Dumbbell, Sparkles,
  ChevronRight, Pencil, Check, Moon, UtensilsCrossed, BookOpen,
  Leaf, Activity, Sunrise, Sun, Apple, SlidersHorizontal,
  Scale, TrendingUp, TrendingDown, Minus, RotateCcw,
} from "lucide-react";
import { BloomBubbles } from "@/components/bloom/BloomBubbles";
import { CuteDatePicker } from "@/components/bloom/CuteDatePicker";
import { readCyclePhase, readCycleSettings, hasCycleSettings, toDietPhase, type CyclePhase } from "@/components/bloom/cyclePhase";
import { WORKOUT_LOG_KEY, type HistoryEntry } from "@/pages/app.tools.workout";
import { addRecipeToMealPlan, resetToolState, readTodayPlannedDay, readMealPlan, setMealPlanSlot, todayWeekday, readEatenToday, toggleEatenToday, readYogaPlanDays, type PlanSlot } from "@/lib/crossToolData";
import { flushCloudSync } from "@/lib/cloudSync";
import { SparkleOnboarding, type SparkleContent, type SparkleStep } from "@/components/bloom/SparkleOnboarding";
import { computeTargets, energyBalance, goalProjection } from "@/lib/nutritionTargets";
import { EnergyTodayCard, GoalPathCard, WeekBalanceCard, CoachCard } from "@/components/bloom/diet/DietDashboard";
import {
  RECIPES, PHASE_INFO, PHASE_MICROS, passesMyRules,
  DIET_REGIMES, dietRegimeInfo, regimeToDietType,
  type Recipe, type DietProfile, type DietPhase, type DietGoal, type MealType,
  type DietType, type Allergy, type CookingFrequency, type DietRegime,
} from "@/components/bloom/diet/data";

/* ---------- localStorage ---------- */

const LS = {
  profile: "bloom:diet-profile",
  setup: "bloom:diet-setup-complete",
  tab: "bloom:diet-tab",
  todayMeals: "bloom:diet-today-meals",
  dismissedPW: "bloom:diet-dismissed-pw",
  onboarded: "bloom:diet-onboarded",
  meGoal: "bloom:me-goal", // shared, bidirectional with Me page
};

/* ---------- Guided tour (reuses the shared SparkleOnboarding) ---------- */
const DIET_TOUR_CONTENT: SparkleContent = {
  eyebrow: "✦ your diet ✦",
  titleLines: ["Meet your", "plan"],
  subtitle: "A soft little tour of your plan, your cycle & your weight.",
  ctaLabel: "Show me around",
  finaleLines: ["You're all set,", "gorgeous"],
  finaleSubtitle: "Eat in sync, bloom all month. ✿",
};
const DIET_TOUR_STEPS: SparkleStep[] = [
  { key: "plan",   selector: "#diet-plan",   title: "Your eating plan",   desc: "Pick a real diet — every recipe is filtered to match it." },
  { key: "weight", selector: "#diet-weight", title: "Track your weight",  desc: "Log your weight, set a goal, and watch the trend." },
  { key: "tabs",   selector: "#diet-tabs",   title: "Cycle, log & browse", desc: "Cycle Nutrition syncs food to your phase · Today logs meals · Recipes browses your library." },
];

function useLS<T>(key: string, initial: T): [T, (v: T | ((p: T) => T)) => void] {
  const [v, setV] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(key);
      return raw ? (JSON.parse(raw) as T) : initial;
    } catch {
      return initial;
    }
  });
  useEffect(() => {
    try { localStorage.setItem(key, JSON.stringify(v)); } catch {}
  }, [key, v]);
  return [v, setV];
}

const DEFAULT_PROFILE: DietProfile & { weight: number } = {
  goal: "maintain",
  dietType: "omnivore",
  regime: "balanced",
  allergies: [],
  cookingFrequency: "normal",
  weight: 65,
  weightHistory: [],
};

/* ---------- shared helpers ---------- */

function todayISO() { return new Date().toISOString().slice(0, 10); }

/** Maps the app-wide cycle phase to the Diet Tool's 4-phase model.
 *  Delegates to the canonical mapping (single source); "any" → follicular. */
function mapCyclePhase(p: CyclePhase | null): DietPhase {
  return (toDietPhase(p) ?? "follicular") as DietPhase;
}

/** Cycle day computed from the user's saved Cycle Tracker settings. */
function getCycleDay(): number {
  const s = readCycleSettings();
  const ms = 1000 * 60 * 60 * 24;
  const diff = Math.floor((Date.now() - s.lastPeriodStart.getTime()) / ms);
  const day = ((diff % s.cycleLength) + s.cycleLength) % s.cycleLength;
  return Number.isFinite(day) ? day + 1 : 1;
}

function loadWorkoutHistory(): HistoryEntry[] {
  try {
    const raw = localStorage.getItem(WORKOUT_LOG_KEY);
    return raw ? (JSON.parse(raw) as HistoryEntry[]) : [];
  } catch {
    return [];
  }
}

function fmtMacroLine(m: { calories: number; protein: number; carbs: number; fat: number }) {
  return `${m.calories} kcal · ${m.protein}g protein · ${m.carbs}g carbs · ${m.fat}g fat`;
}

interface LoggedMeal {
  name: string;
  recipeId?: string;
  macros: { calories: number; protein: number; carbs: number; fat: number };
  micros?: Recipe["micros"];
}
type DayMeals = Record<MealType, LoggedMeal | null>;
const EMPTY_DAY: DayMeals = { breakfast: null, lunch: null, dinner: null, snack: null, lunchbox: null };

const MEAL_LABELS: Record<MealType, string> = {
  breakfast: "Breakfast", lunch: "Lunch", dinner: "Dinner", snack: "Snack", lunchbox: "Lunchbox",
};
const MEAL_ICONS: Record<MealType, React.ElementType> = {
  breakfast: Sunrise, lunch: Sun, dinner: Moon, snack: Apple, lunchbox: Apple,
};

const PHASE_RING: Record<DietPhase, string> = {
  menstrual: "text-hotpink",
  follicular: "text-amber-500",
  ovulatory: "text-rose-500",
  luteal: "text-violet-500",
};

/* ---------- UI atoms ---------- */

function Glass({ children, className = "", id }: { children: React.ReactNode; className?: string; id?: string }) {
  return (
    <div id={id} className={`rounded-[1.5rem] bg-white/85 backdrop-blur border border-petal/60 shadow-lg shadow-rose/10 ${className}`}>
      {children}
    </div>
  );
}

function PinkBtn({
  children, onClick, variant = "solid", className = "", disabled = false,
}: {
  children: React.ReactNode; onClick?: () => void;
  variant?: "solid" | "ghost" | "outline"; className?: string; disabled?: boolean;
}) {
  const base = "inline-flex items-center justify-center gap-1.5 px-4 py-2 text-sm font-semibold transition disabled:opacity-50";
  const cls = variant === "solid"
    ? "bloom-luxury-btn text-white"
    : variant === "outline"
      ? "rounded-full border border-hotpink/60 text-hotpink hover:bg-hotpink/10 active:scale-95"
      : "rounded-full text-hotpink hover:bg-hotpink/10 active:scale-95";
  return <button onClick={onClick} disabled={disabled} className={`${base} ${cls} ${className}`}>{children}</button>;
}

function SelectPill({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={[
        "shrink-0 snap-start inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs sm:text-sm font-semibold transition border whitespace-nowrap",
        active ? "bg-hotpink text-white border-hotpink shadow shadow-hotpink/30" : "bg-white/80 text-rose border-petal/60 hover:bg-blush",
      ].join(" ")}
    >
      {children}
    </button>
  );
}

function RingProgress({
  value, target, label, sub, colorClass, size = 76,
}: { value: number; target: number; label: string; sub: string; colorClass: string; size?: number }) {
  const r = (size - 10) / 2;
  const c = 2 * Math.PI * r;
  const pct = target > 0 ? Math.min(1, value / target) : 0;
  return (
    <div className="flex flex-col items-center gap-1.5">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} stroke="oklch(0.95 0.02 350)" strokeWidth="8" fill="none" />
        <circle
          cx={size / 2} cy={size / 2} r={r}
          stroke="currentColor" strokeWidth="8" fill="none" strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c * (1 - pct)}
          className={colorClass}
          style={{ transition: "stroke-dashoffset 0.6s ease" }}
        />
      </svg>
      <div className="-mt-[4.6rem] sm:-mt-[4.6rem] flex flex-col items-center" style={{ marginTop: `-${size - 14}px` }}>
        <span className="text-sm sm:text-base font-bold text-magenta">{value}</span>
        <span className="text-[9px] text-rose/60">/ {target}{sub}</span>
      </div>
      <span className="mt-9 text-[10px] sm:text-xs font-bold uppercase tracking-wide text-rose/80">{label}</span>
    </div>
  );
}

function MicroBar({ label, value, target, unit }: { label: string; value: number; target: number; unit: string }) {
  const pct = target > 0 ? Math.min(100, Math.round((value / target) * 100)) : 0;
  return (
    <div>
      <div className="flex items-center justify-between text-xs font-semibold text-rose/80">
        <span>{label}</span>
        <span>{value.toFixed(1)}{unit} / {target}{unit}</span>
      </div>
      <div className="mt-1 h-2 w-full rounded-full bg-blush overflow-hidden">
        <div className="h-full rounded-full bg-hotpink transition-all" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function RecipePlaceholder({ name, className = "" }: { name: string; className?: string }) {
  return (
    <div
      className={`flex aspect-[4/3] w-full items-center justify-center rounded-xl border-[1.5px] border-dashed border-petal text-center bg-blush ${className}`}
    >
      <span className="px-2 text-[10px] font-medium text-rose/60">{name}</span>
    </div>
  );
}

function PhasePillTag({ phase }: { phase: DietPhase }) {
  return (
    <span className="rounded-full bg-blush px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-hotpink">
      {PHASE_INFO[phase].label}
    </span>
  );
}

/* ---------- Recipe card + modal ---------- */

function RecipeCard({ recipe, onOpen }: { recipe: Recipe; onOpen: () => void }) {
  return (
    <button onClick={onOpen} className="text-left">
      <Glass className="overflow-hidden p-2.5 transition hover:shadow-xl hover:shadow-hotpink/15 active:scale-[0.98]">
        <RecipePlaceholder name={recipe.name} />
        <div className="mt-2">
          <p className="text-sm font-bold text-magenta leading-snug">{recipe.name}</p>
          <div className="mt-1 flex flex-wrap items-center gap-1">
            <PhasePillTag phase={recipe.phases[0]} />
            {recipe.dietTags[0] && (
              <span className="rounded-full bg-white border border-petal/60 px-2 py-0.5 text-[10px] font-semibold text-rose/80">
                {recipe.dietTags[0]}
              </span>
            )}
          </div>
          <div className="mt-1.5 flex items-center gap-1 text-[11px] text-rose/70">
            <Clock className="h-3 w-3" /> {recipe.prepTime + recipe.cookTime} min
          </div>
          <p className="mt-0.5 text-[11px] font-semibold text-rose/80">
            {recipe.macros.calories} kcal · {recipe.macros.protein}g P · {recipe.macros.carbs}g C · {recipe.macros.fat}g F
          </p>
        </div>
      </Glass>
    </button>
  );
}

function RecipeModal({
  recipe, onClose, onAddToPlan,
}: { recipe: Recipe; onClose: () => void; onAddToPlan: (date: string, recipe: Recipe) => void }) {
  const [date, setDate] = useState(todayISO());
  const [added, setAdded] = useState(false);

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm p-0 sm:p-4 animate-fade-in" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="w-full sm:max-w-lg max-h-[92vh] overflow-y-auto rounded-t-[2rem] sm:rounded-[2rem] bg-white shadow-2xl">
        <div className="relative p-4 sm:p-6">
          <button onClick={onClose} className="absolute right-4 top-4 z-10 grid h-9 w-9 place-items-center rounded-full bg-blush text-hotpink">
            <X className="h-4 w-4" />
          </button>
          <RecipePlaceholder name={recipe.name} className="aspect-[16/10]" />
          <h2 className="mt-3 font-script text-2xl text-hotpink leading-tight">{recipe.name}</h2>
          <p className="text-sm text-rose/70">{recipe.cuisine} cuisine</p>

          <div className="mt-2 flex flex-wrap gap-1.5">
            {recipe.phases.map((p) => <PhasePillTag key={p} phase={p} />)}
            {recipe.dietTags.map((t) => (
              <span key={t} className="rounded-full bg-white border border-petal/60 px-2 py-0.5 text-[10px] font-semibold text-rose/80">{t}</span>
            ))}
            {recipe.allergens.length === 0 && (
              <span className="rounded-full bg-green-50 border border-green-200 px-2 py-0.5 text-[10px] font-semibold text-green-700">allergen-free</span>
            )}
          </div>

          {/* Nutrition rings */}
          <div className="mt-4 grid grid-cols-4 gap-2">
            <RingProgress value={recipe.macros.calories} target={recipe.macros.calories} label="kcal" sub="" colorClass="text-hotpink" size={64} />
            <RingProgress value={recipe.macros.protein} target={recipe.macros.protein} label="protein" sub="g" colorClass="text-amber-500" size={64} />
            <RingProgress value={recipe.macros.carbs} target={recipe.macros.carbs} label="carbs" sub="g" colorClass="text-rose-500" size={64} />
            <RingProgress value={recipe.macros.fat} target={recipe.macros.fat} label="fat" sub="g" colorClass="text-violet-500" size={64} />
          </div>

          {/* Micro bars */}
          {Object.keys(recipe.micros).length > 0 && (
            <div className="mt-4 space-y-2">
              {Object.entries(recipe.micros).map(([k, v]) => (
                <MicroBar key={k} label={k} value={v as number} target={Math.max(v as number, 1)} unit="" />
              ))}
            </div>
          )}

          {/* Ingredients */}
          <h3 className="mt-4 font-script text-lg text-hotpink">Ingredients</h3>
          <ul className="mt-1 space-y-1 text-sm text-rose/90">
            {recipe.ingredients.map((ing) => (
              <li key={ing.name} className="flex items-center justify-between gap-2 border-b border-petal/40 py-1">
                <span>{ing.name}</span>
                <span className="text-rose/60">{ing.quantity}</span>
              </li>
            ))}
          </ul>

          {/* Steps */}
          <h3 className="mt-4 font-script text-lg text-hotpink">Steps</h3>
          <ol className="mt-1 space-y-1.5 text-sm text-rose/90 list-decimal list-inside">
            {recipe.steps.map((s, i) => <li key={i}>{s}</li>)}
          </ol>

          {/* Add to plan */}
          <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:items-center">
            <CuteDatePicker value={date} onChange={setDate} className="flex-1" />
            <PinkBtn
              onClick={() => { onAddToPlan(date, recipe); setAdded(true); }}
              className="w-full sm:w-auto"
            >
              {added ? <><Check className="h-4 w-4" /> Added</> : <>Add to meal plan <ChevronRight className="h-4 w-4" /></>}
            </PinkBtn>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

/* ---------- Setup screen ---------- */

const GOAL_OPTIONS: { key: DietGoal; label: string }[] = [
  { key: "lose", label: "Lose weight" },
  { key: "maintain", label: "Maintain" },
  { key: "gain", label: "Gain & tone" },
];
const DIET_TYPE_OPTIONS: { key: DietType; label: string }[] = [
  { key: "omnivore", label: "Omnivore" },
  { key: "vegetarian", label: "Vegetarian" },
  { key: "vegan", label: "Vegan" },
  { key: "gluten-free", label: "Gluten-free" },
  { key: "halal", label: "Halal" },
];
const ALLERGY_OPTIONS: { key: Allergy; label: string }[] = [
  { key: "dairy", label: "Dairy" },
  { key: "nuts", label: "Nuts" },
  { key: "eggs", label: "Eggs" },
  { key: "soy", label: "Soy" },
  { key: "shellfish", label: "Shellfish" },
];
const COOKING_OPTIONS: { key: CookingFrequency; label: string }[] = [
  { key: "quick", label: "Quick — under 15 min" },
  { key: "normal", label: "Normal — under 30 min" },
  { key: "love", label: "Love cooking" },
];

/** App-style popup to edit body & goal (weight · height · goal weight),
 *  opened from the Goal-path card. Portaled so it's never clipped. */
function BodyGoalEditModal({ profile, onClose, onSave }: {
  profile: DietProfile & { weight: number };
  onClose: () => void;
  onSave: (v: { weight?: number; heightCm?: number; targetWeight?: number }) => void;
}) {
  const [weight, setWeight] = useState(profile.weight ? String(profile.weight) : "");
  const [height, setHeight] = useState(profile.heightCm != null ? String(profile.heightCm) : "");
  const [target, setTarget] = useState(profile.targetWeight != null ? String(profile.targetWeight) : "");
  return createPortal(
    <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center p-3 sm:p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-rose/25 backdrop-blur-sm animate-fade-in" />
      <div className="relative w-full max-w-sm rounded-3xl bg-white border border-petal/60 shadow-2xl shadow-rose/20 p-5 animate-scale-in" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-1">
          <h3 className="font-script text-2xl text-hotpink">Edit your body &amp; goal</h3>
          <button onClick={onClose} aria-label="Close" className="rounded-full bg-blush/70 p-1.5 text-rose active:scale-90 transition"><X className="h-4 w-4" /></button>
        </div>
        <p className="text-[11px] text-rose/60 leading-snug mb-4">These keep your calorie target &amp; timeline accurate.</p>
        <div className="space-y-2.5">
          <SetupNumber label="Weight" unit="kg" value={weight} onChange={setWeight} placeholder="65" autoFocus />
          <SetupNumber label="Height" unit="cm" value={height} onChange={setHeight} placeholder="165" />
          <SetupNumber label="Goal weight" unit="kg" value={target} onChange={setTarget} placeholder="60" />
        </div>
        <div className="mt-5 flex items-center gap-2">
          <button onClick={onClose} className="rounded-full bg-white border border-petal/60 px-4 py-2.5 text-sm font-semibold text-rose active:scale-95 transition">Cancel</button>
          <PinkBtn
            className="flex-1 justify-center"
            onClick={() => onSave({
              weight: parseFloat(weight) > 0 ? parseFloat(weight) : undefined,
              heightCm: parseFloat(height) > 0 ? parseFloat(height) : undefined,
              targetWeight: parseFloat(target) > 0 ? parseFloat(target) : undefined,
            })}
          >
            Save <Check className="h-4 w-4" />
          </PinkBtn>
        </div>
      </div>
    </div>,
    document.body,
  );
}

/** Small numeric field for the setup wizard. */
function SetupNumber({ label, unit, value, onChange, placeholder, autoFocus }: {
  label: string; unit: string; value: string; onChange: (v: string) => void; placeholder?: string; autoFocus?: boolean;
}) {
  return (
    <label className="flex-1 flex items-center rounded-2xl bg-white border border-petal/60 overflow-hidden focus-within:border-hotpink transition">
      <span className="pl-3.5 pr-2 text-[11px] font-bold uppercase tracking-wide text-rose/50">{label}</span>
      <input
        value={value}
        autoFocus={autoFocus}
        onChange={(e) => onChange(e.target.value.replace(/[^\d.]/g, ""))}
        inputMode="decimal"
        placeholder={placeholder}
        className="flex-1 min-w-0 text-center text-lg font-bold text-rose outline-none py-2.5"
      />
      <span className="pr-3.5 text-[12px] font-bold text-rose/50">{unit}</span>
    </label>
  );
}

/**
 * First-run wizard — reveals ONE step at a time so a brand-new user is never
 * shown every feature at once. Order: body basics → goal → eating plan →
 * preferences. Each step has a single clear ask + a guiding line.
 */
function SetupScreen({
  initial, onDone,
}: { initial: DietProfile & { weight: number }; onDone: (p: DietProfile & { weight: number }) => void }) {
  const [step, setStep] = useState(0);

  // Step 1 — body
  const [weight, setWeight] = useState(initial.weight ? String(initial.weight) : "");
  const [height, setHeight] = useState(initial.heightCm != null ? String(initial.heightCm) : "");
  const [age, setAge] = useState(initial.age != null ? String(initial.age) : "");
  // Step 2 — goal
  const [goal, setGoal] = useState<DietGoal>(initial.goal);
  const [targetWeight, setTargetWeight] = useState(initial.targetWeight != null ? String(initial.targetWeight) : "");
  // Step 3 — plan
  const [regime, setRegime] = useState<DietRegime>(initial.regime ?? "balanced");
  // Step 4 — preferences
  const [allergies, setAllergies] = useState<Allergy[]>(initial.allergies);
  const [cooking, setCooking] = useState<CookingFrequency>(initial.cookingFrequency);
  const toggleAllergy = (a: Allergy) => setAllergies((prev) => (prev.includes(a) ? prev.filter((x) => x !== a) : [...prev, a]));

  const STEPS = [
    { key: "body", title: "About your body", hint: "This powers your exact calorie target — nothing is shared." },
    { key: "goal", title: "Your goal", hint: "We'll tailor your calories, protein & timeline to this." },
    { key: "plan", title: "Your eating plan", hint: "Sets which recipes you'll be offered all month." },
    { key: "prefs", title: "A few preferences", hint: "So every suggestion is safe and doable for you." },
  ] as const;
  const isLast = step === STEPS.length - 1;
  const wKg = parseFloat(weight);
  const canNext = step === 0 ? wKg > 0 : true; // body weight is the one hard requirement

  const finish = () => {
    const kg = wKg > 0 ? wKg : 65;
    const hist = (initial.weightHistory ?? []).filter((e) => e.date !== todayISO());
    hist.push({ date: todayISO(), kg });
    hist.sort((a, b) => (a.date < b.date ? -1 : 1));
    onDone({
      goal, regime, dietType: regimeToDietType(regime), allergies, cookingFrequency: cooking,
      weight: kg, weightHistory: hist,
      heightCm: parseFloat(height) > 0 ? parseFloat(height) : undefined,
      age: parseInt(age, 10) > 0 ? parseInt(age, 10) : undefined,
      targetWeight: parseFloat(targetWeight) > 0 ? parseFloat(targetWeight) : undefined,
    });
  };

  return (
    <div className="relative animate-fade-in max-w-full overflow-x-hidden">
      <BloomBubbles count={8} />
      <a href="/app/tools" className="mb-3 inline-flex items-center gap-1 text-sm text-rose hover:text-hotpink">
        <ArrowLeft className="h-4 w-4" /> All tools
      </a>
      <header className="mb-3">
        <h1 className="font-script text-3xl sm:text-5xl text-hotpink leading-none">Let's set up your Diet</h1>
        <p className="mt-1 text-xs sm:text-sm text-rose/80">One little step at a time — takes under a minute ✿</p>
      </header>

      {/* progress dots */}
      <div className="flex items-center gap-1.5 mb-3">
        {STEPS.map((s, i) => (
          <div key={s.key} className={["h-1.5 flex-1 rounded-full transition-all", i < step ? "bg-hotpink" : i === step ? "bg-hotpink/60" : "bg-petal/50"].join(" ")} />
        ))}
      </div>

      <Glass className="p-4 sm:p-6">
        <p className="text-[10px] font-bold uppercase tracking-widest text-rose/45 mb-1">Step {step + 1} of {STEPS.length}</p>
        <h2 className="font-script text-2xl text-hotpink mb-1">{STEPS[step].title}</h2>
        <p className="text-[12px] text-rose/70 leading-snug mb-4 flex items-start gap-1.5"><Sparkles className="h-3.5 w-3.5 shrink-0 mt-0.5 text-hotpink" strokeWidth={2} />{STEPS[step].hint}</p>

        {step === 0 && (
          <div className="space-y-2.5">
            <SetupNumber label="Weight" unit="kg" value={weight} onChange={setWeight} placeholder="65" autoFocus />
            <div className="flex gap-2.5">
              <SetupNumber label="Height" unit="cm" value={height} onChange={setHeight} placeholder="165" />
              <SetupNumber label="Age" unit="yr" value={age} onChange={setAge} placeholder="30" />
            </div>
            <p className="text-[11px] text-rose/50 leading-snug">Weight is required. Height &amp; age make your calorie target exact (we'll use gentle defaults otherwise).</p>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
              {GOAL_OPTIONS.map((o) => (
                <SelectPill key={o.key} active={goal === o.key} onClick={() => setGoal(o.key)}>{o.label}</SelectPill>
              ))}
            </div>
            {goal !== "maintain" && (
              <div className="pt-1">
                <p className="text-[11px] font-bold uppercase tracking-wide text-rose/50 mb-1.5">Goal weight (optional)</p>
                <SetupNumber label="Target" unit="kg" value={targetWeight} onChange={setTargetWeight} placeholder={goal === "lose" ? "60" : "70"} />
                <p className="mt-1.5 text-[11px] text-rose/50">Set this to unlock your realistic timeline on the goal-path card.</p>
              </div>
            )}
          </div>
        )}

        {step === 2 && (
          <div>
            <div className="flex flex-wrap gap-2">
              {DIET_REGIMES.map((o) => (
                <SelectPill key={o.key} active={regime === o.key} onClick={() => setRegime(o.key)}>{o.label}</SelectPill>
              ))}
            </div>
            <p className="mt-2.5 text-[12px] text-rose/70 leading-snug">{dietRegimeInfo(regime).blurb}</p>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wide text-rose/50 mb-1.5">Allergies</p>
              <div className="flex flex-wrap gap-2">
                {ALLERGY_OPTIONS.map((o) => (
                  <SelectPill key={o.key} active={allergies.includes(o.key)} onClick={() => toggleAllergy(o.key)}>{o.label}</SelectPill>
                ))}
                <SelectPill active={allergies.length === 0} onClick={() => setAllergies([])}>None</SelectPill>
              </div>
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wide text-rose/50 mb-1.5">Cooking time</p>
              <div className="flex flex-wrap gap-2">
                {COOKING_OPTIONS.map((o) => (
                  <SelectPill key={o.key} active={cooking === o.key} onClick={() => setCooking(o.key)}>{o.label}</SelectPill>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* nav */}
        <div className="mt-5 flex items-center gap-2">
          {step > 0 && (
            <button onClick={() => setStep((s) => s - 1)} className="inline-flex items-center gap-1 rounded-full bg-white/90 border border-petal/60 px-4 py-2.5 text-sm font-semibold text-rose active:scale-95 transition">
              <ArrowLeft className="h-4 w-4" /> Back
            </button>
          )}
          <PinkBtn
            className="flex-1 justify-center disabled:opacity-40"
            onClick={() => (isLast ? finish() : setStep((s) => s + 1))}
            disabled={!canNext}
          >
            {isLast ? <>Save &amp; start blooming <Sparkles className="h-4 w-4" /></> : <>Continue <ChevronRight className="h-4 w-4" /></>}
          </PinkBtn>
        </div>
      </Glass>
    </div>
  );
}

/* ---------- Tab 1: Cycle Nutrition ---------- */

function PhaseCard({ phase, active }: { phase: DietPhase; active: boolean }) {
  const info = PHASE_INFO[phase];
  return (
    <div
      className={[
        "shrink-0 w-[78%] sm:w-auto snap-start rounded-[1.5rem] border p-4 transition",
        active
          ? "bg-white shadow-xl shadow-hotpink/20 border-hotpink/40 opacity-100 scale-100"
          : "bg-white/70 border-petal/40 opacity-50 scale-[0.98]",
      ].join(" ")}
    >
      <div className="flex items-center justify-between">
        <h3 className="font-script text-2xl text-hotpink">{info.label}</h3>
        {active && <span className="rounded-full bg-hotpink px-2 py-0.5 text-[10px] font-bold uppercase text-white">Today</span>}
      </div>
      <p className="mt-1 text-xs italic text-rose/80">"{info.tone}"</p>

      <div className="mt-3">
        <p className="text-[11px] font-bold uppercase tracking-wide text-rose/60">Eat</p>
        <div className="mt-1 flex flex-wrap gap-1">
          {info.eat.map((e) => <span key={e} className="rounded-full bg-blush px-2 py-0.5 text-[11px] font-semibold text-magenta">{e}</span>)}
        </div>
      </div>

      <div className="mt-3">
        <p className="text-[11px] font-bold uppercase tracking-wide text-rose/60">Avoid</p>
        <div className="mt-1 flex flex-wrap gap-1">
          {info.avoid.map((e) => <span key={e} className="rounded-full bg-white border border-petal/60 px-2 py-0.5 text-[11px] font-semibold text-rose/70">{e}</span>)}
        </div>
      </div>

      <div className="mt-3">
        <p className="text-[11px] font-bold uppercase tracking-wide text-rose/60">Key nutrients</p>
        <div className="mt-1 flex flex-wrap gap-1">
          {info.keyNutrients.map((e) => <span key={e} className="rounded-full bg-hotpink/10 px-2 py-0.5 text-[11px] font-semibold text-hotpink">{e}</span>)}
        </div>
      </div>

      <p className="mt-3 text-xs text-rose/80"><b>Snack idea:</b> {info.snack}</p>
    </div>
  );
}

/* ---------- Profile / home dashboard ---------- */

/** Numbered section header for the guided My Diet flow. */
function StepHeader({ step, title, sub }: { step: number; title: string; sub: string }) {
  return (
    <div className="flex items-center gap-2 mb-2 mt-1">
      <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-hotpink text-white text-[11px] font-black">{step}</span>
      <div className="min-w-0">
        <p className="font-script text-lg text-hotpink leading-none truncate">{title}</p>
        <p className="text-[10.5px] text-rose/55 leading-tight">{sub}</p>
      </div>
    </div>
  );
}

/** Weight over time: real logged points + a dashed projection that follows the
 *  user's ACTUAL planned pace (from her calorie deficit/surplus), drawn on a
 *  proper time axis so the trend — and a realistic timeline — is easy to read. */
function WeightChart({ history, target, projection }: {
  history: { date: string; kg: number }[];
  target?: number;
  /** Real projected pace from the nutrition plan (kg/week) + ETA in weeks. */
  projection?: { weeklyRateKg: number; etaWeeks: number | null } | null;
}) {
  if (history.length < 1) return <p className="text-[11px] text-rose/50 italic">Log your weight to see your graph & estimate ✿</p>;
  const w = 320, h = 152;
  const padL = 30, padR = 12, padT = 12, padB = 26; // room for kg (left) + dates (bottom)
  const startMs = new Date(history[0].date + "T00:00:00").getTime();
  const dayOf = (d: string) => (new Date(d + "T00:00:00").getTime() - startMs) / 864e5;
  const dateAtDay = (day: number) => new Date(startMs + day * 864e5);
  const fmtDate = (d: Date) => d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  const lastReal = history[history.length - 1];
  const lastDay = dayOf(lastReal.date);
  const loseDir = target != null && target < lastReal.kg; // goal is below current

  // ── Real projection: extend from the last logged weight along the pace the
  //    plan actually produces (kg/week ÷ 7 per day), capped for readability.
  //    It reaches the goal at the honest ETA — never a fake 2-week straight line.
  const ratePerDay = projection ? projection.weeklyRateKg / 7 : 0;
  const movesToGoal = target != null && Math.abs(ratePerDay) > 0.0005 &&
    ((target < lastReal.kg && ratePerDay < 0) || (target > lastReal.kg && ratePerDay > 0));
  const CAP_DAYS = 84; // don't draw more than ~12 weeks ahead
  let projDays = 0, projEndKg = lastReal.kg, reachesGoal = false;
  if (movesToGoal) {
    const etaDays = projection!.etaWeeks ? projection!.etaWeeks * 7 : CAP_DAYS;
    projDays = Math.min(Math.max(7, etaDays), CAP_DAYS);
    projEndKg = lastReal.kg + ratePerDay * projDays;
    if ((ratePerDay < 0 && projEndKg <= target!) || (ratePerDay > 0 && projEndKg >= target!)) {
      projEndKg = target!; reachesGoal = true; projDays = Math.min(etaDays, CAP_DAYS);
    }
  }
  const hasProj = movesToGoal && projDays > 0;
  const maxDay = Math.max(lastDay + (hasProj ? projDays : 3), 4);
  const kgs = [...history.map((r) => r.kg), ...(target != null ? [target] : []), ...(hasProj ? [projEndKg] : [])];
  const minK = Math.min(...kgs) - 0.6, maxK = Math.max(...kgs) + 0.6;
  const X = (day: number) => padL + (day / (maxDay || 1)) * (w - padL - padR);
  const Y = (kg: number) => padT + (1 - (kg - minK) / ((maxK - minK) || 1)) * (h - padT - padB);
  const realD = history.map((r, i) => `${i ? "L" : "M"} ${X(dayOf(r.date)).toFixed(1)} ${Y(r.kg).toFixed(1)}`).join(" ");

  // Y gridlines / labels (3 rows: max, mid, min)
  const yTicks = [maxK, (maxK + minK) / 2, minK];
  // X ticks: start, midpoint, end (dated). Show 3 so it stays readable.
  const xTicks = [0, maxDay / 2, maxDay];

  return (
    <div>
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full" style={{ height: 152 }}>
        {/* Y grid + kg labels */}
        {yTicks.map((kg, i) => (
          <g key={`y${i}`}>
            <line x1={padL} y1={Y(kg)} x2={w - padR} y2={Y(kg)} stroke="#FBE4EF" strokeWidth="1" />
            <text x={padL - 5} y={Y(kg) + 3} fontSize="8.5" fill="#C4849F" textAnchor="end">{kg.toFixed(1)}</text>
          </g>
        ))}
        {/* Axis lines */}
        <line x1={padL} y1={padT} x2={padL} y2={h - padB} stroke="#F4C6DD" strokeWidth="1" />
        <line x1={padL} y1={h - padB} x2={w - padR} y2={h - padB} stroke="#F4C6DD" strokeWidth="1" />
        {/* X date labels + ticks */}
        {xTicks.map((day, i) => (
          <g key={`x${i}`}>
            <line x1={X(day)} y1={h - padB} x2={X(day)} y2={h - padB + 3} stroke="#F4C6DD" strokeWidth="1" />
            <text x={X(day)} y={h - padB + 14} fontSize="8.5" fill="#C4849F" textAnchor={i === 0 ? "start" : i === xTicks.length - 1 ? "end" : "middle"}>{fmtDate(dateAtDay(day))}</text>
          </g>
        ))}
        {/* kg unit tag */}
        <text x={padL - 5} y={padT - 3} fontSize="8" fill="#C4849F" textAnchor="end" fontWeight="700">kg</text>

        {/* Soft band showing the journey from where she is now → her goal */}
        {target != null && (
          <rect
            x={padL} y={Math.min(Y(lastReal.kg), Y(target))}
            width={w - padR - padL} height={Math.abs(Y(target) - Y(lastReal.kg))}
            fill={loseDir ? "#ECFDF5" : "#FFF1F2"} opacity={0.7}
          />
        )}
        {target != null && (
          <>
            <line x1={padL} y1={Y(target)} x2={w - padR} y2={Y(target)} stroke="#DB2777" strokeWidth="1.4" strokeDasharray="4 3" />
            <text x={w - padR} y={Y(target) + (Y(target) > Y(lastReal.kg) ? 12 : -5)} fontSize="9" fontWeight="800" fill="#DB2777" textAnchor="end">🎯 goal {target}kg</text>
          </>
        )}
        {hasProj && (
          <path d={`M ${X(lastDay)} ${Y(lastReal.kg)} L ${X(lastDay + projDays)} ${Y(projEndKg)}`} fill="none" stroke="#DB2777" strokeWidth="1.8" strokeDasharray="5 4" strokeLinecap="round" opacity={0.7} />
        )}
        <path d={realD} fill="none" stroke="#EC4899" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        {history.map((r, i) => <circle key={i} cx={X(dayOf(r.date))} cy={Y(r.kg)} r="2.6" fill="#EC4899" />)}
        {/* "You are here" — the latest weight, labelled so it's never confused with the goal */}
        <circle cx={X(lastDay)} cy={Y(lastReal.kg)} r="4.5" fill="#EC4899" stroke="#fff" strokeWidth="1.5" />
        <text x={X(lastDay) + 7} y={Y(lastReal.kg) + (Y(lastReal.kg) < Y(target) ? -5 : 12)} fontSize="9.5" fontWeight="800" fill="#EC4899" textAnchor="start">{lastReal.kg}kg now</text>
      </svg>
      <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[9px] font-bold text-rose/60">
        <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-[#EC4899]" /> You now · {lastReal.kg}kg</span>
        {hasProj && <span className="inline-flex items-center gap-1"><span className="h-0.5 w-3 rounded bg-[#DB2777]" style={{ backgroundImage: "repeating-linear-gradient(90deg,#DB2777 0 3px,transparent 3px 6px)" }} /> Projected (~{Math.abs(projection!.weeklyRateKg)}kg/wk)</span>}
        {target != null && <span className="inline-flex items-center gap-1">🎯 Goal · {target}kg {target < lastReal.kg ? "(below)" : target > lastReal.kg ? "(above)" : ""}</span>}
      </div>
    </div>
  );
}

/** Step 1 — the phase-nutrition cards as a carousel, today's phase highlighted. */
function PhaseCarousel({ phase, cycleDay, onSyncedPlan }: { phase: DietPhase; cycleDay: number; onSyncedPlan: () => void }) {
  const order: DietPhase[] = ["menstrual", "follicular", "ovulatory", "luteal"];
  const cards = [phase, ...order.filter((p) => p !== phase)]; // current first
  return (
    <div className="flex gap-3 overflow-x-auto no-scrollbar snap-x pb-1">
      {cards.map((ph) => {
        const info = PHASE_INFO[ph];
        const active = ph === phase;
        return (
          <div key={ph} className={["snap-center shrink-0 w-[86%] sm:w-[47%] rounded-[1.5rem] p-4 border transition", active ? "bg-white ring-2 ring-hotpink shadow-lg shadow-hotpink/20 animate-selected-glow" : "bg-white/70 border-petal/50 opacity-80"].join(" ")}>
            <div className="flex items-center justify-between gap-2">
              <p className="font-script text-xl text-hotpink leading-none">{info.label}{active ? " · today" : ""}</p>
              {active && <span className="rounded-full bg-hotpink text-white text-[9px] font-bold px-2 py-0.5">Day {cycleDay}</span>}
            </div>
            <p className="mt-1 text-[11.5px] italic text-rose/70 leading-snug">{info.tone}.</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {info.eat.slice(0, 5).map((f) => (
                <span key={f} className="rounded-full bg-blush text-hotpink text-[10px] font-bold px-2 py-0.5 border border-petal/60">{f}</span>
              ))}
            </div>
            <p className="mt-2 text-[10px] font-bold uppercase tracking-wide text-rose/45">Key · {info.keyNutrients.slice(0, 3).join(" · ")}</p>
            {active ? (
              <PinkBtn onClick={onSyncedPlan} className="w-full justify-center mt-3">✿ Synced plan → Today <ChevronRight className="h-4 w-4" /></PinkBtn>
            ) : (
              <p className="mt-3 text-[10.5px] text-rose/45 text-center">comes around on your {info.label.toLowerCase()} days</p>
            )}
          </div>
        );
      })}
    </div>
  );
}

function ProfileTab({ phase, cycleDay, profile, mealsVersion, setProfile, onEdit, goTo, onReplayTour, cycleReady, onSyncedPlan, onDietToday, onDietWeek }: {
  phase: DietPhase; cycleDay: number;
  profile: DietProfile & { weight: number };
  mealsVersion: number;
  setProfile: (v: (DietProfile & { weight: number }) | ((p: DietProfile & { weight: number }) => DietProfile & { weight: number })) => void;
  onEdit: () => void;
  goTo: (t: TabKey) => void;
  onReplayTour: () => void;
  cycleReady: boolean;
  onSyncedPlan: () => void;
  onDietToday: () => void;
  onDietWeek: () => void;
}) {
  const regime = dietRegimeInfo(profile.regime ?? "balanced");
  const matchCount = useMemo(() => RECIPES.filter((r) => passesMyRules(r, profile)).length, [profile]);

  // Refresh when a workout/yoga is logged so burned calories flow in live.
  const [trainTick, setTrainTick] = useState(0);
  useEffect(() => {
    const bump = () => setTrainTick((t) => t + 1);
    window.addEventListener("bloom:workout-updated", bump);
    window.addEventListener("bloom:yoga-updated", bump);
    window.addEventListener("storage", bump);
    return () => {
      window.removeEventListener("bloom:workout-updated", bump);
      window.removeEventListener("bloom:yoga-updated", bump);
      window.removeEventListener("storage", bump);
    };
  }, []);
  // Live daily energy balance — recomputes when meals change, a session is
  // logged, or the profile changes.
  const energy = useMemo(() => energyBalance(), [mealsVersion, trainTick, profile]);
  // Real weight projection (pace from the calorie plan) for the chart.
  const weightProjection = useMemo(() => goalProjection(), [profile]);

  // Coach CTA → land the user on a *generated* workout week, not an empty tool.
  const onSetupWorkouts = () => {
    try { localStorage.setItem("bloom:workout-autoplan", "1"); } catch {}
    window.location.href = "/app/tools/workout";
  };

  const history = profile.weightHistory ?? [];
  const [weightInput, setWeightInput] = useState(String(profile.weight ?? 65));
  // App-style edit popup (opened from the Goal-path card) for body & goal.
  const [bodyEditOpen, setBodyEditOpen] = useState(false);
  const logWeight = () => {
    const kg = parseFloat(weightInput);
    if (!kg || kg <= 0) return;
    const today = todayISO();
    setProfile((p) => {
      const h = (p.weightHistory ?? []).filter((e) => e.date !== today);
      h.push({ date: today, kg });
      h.sort((a, b) => (a.date < b.date ? -1 : 1));
      return { ...p, weight: kg, weightHistory: h };
    });
  };
  const first = history[0]?.kg ?? profile.weight;
  const latest = history.length ? history[history.length - 1].kg : profile.weight;
  const delta = +(latest - first).toFixed(1);

  const target = profile.targetWeight;

  // How on-plan the whole week's meals are (from the ONE shared plan).
  const adherence = useMemo(() => {
    const plan = readMealPlan();
    let logged = 0, onPlan = 0;
    for (const day of Object.values(plan)) {
      for (const id of Object.values(day)) {
        if (!id) continue;
        logged++;
        const rec = RECIPES.find((r) => r.id === id);
        if (rec && passesMyRules(rec, profile)) onPlan++;
      }
    }
    return { logged, onPlan, pct: logged ? Math.round((onPlan / logged) * 100) : 0 };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mealsVersion, profile]);

  const mealsToday = Object.values(readTodayPlannedDay()).some(Boolean);
  const weighedThisWeek = history.some((e) => Date.now() - new Date(e.date + "T00:00:00").getTime() < 7 * 864e5);
  const next = !cycleReady
    ? { Icon: Moon, text: "Sync your cycle to unlock your plan", cta: "Set up" as string | null, act: () => { try { localStorage.setItem("bloom:diet-await-cycle", "1"); } catch {} window.location.href = "/app/tools/cycle"; } }
    : !mealsToday
    ? { Icon: UtensilsCrossed, text: "See your cycle-synced plan", cta: "Cycle Nutrition" as string | null, act: () => goTo("cycle") }
    : !weighedThisWeek
    ? { Icon: Scale, text: "Time for your weekly weigh-in", cta: "Log weight" as string | null, act: () => document.getElementById("diet-weight")?.scrollIntoView({ behavior: "smooth", block: "center" }) }
    : { Icon: Sparkles, text: "You're on a roll — all on track", cta: null as string | null, act: () => {} };

  return (
    <div className="space-y-4">
      {/* Next-step banner — the guiding thread */}
      <button onClick={next.act} className="w-full flex items-center gap-3 rounded-2xl bg-gradient-to-r from-hotpink to-[#DB2777] text-white p-3.5 shadow-lg shadow-hotpink/30 active:scale-[0.99] transition text-left">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white/25"><next.Icon className="h-5 w-5" /></span>
        <span className="flex-1 min-w-0">
          <span className="block text-[10px] font-bold uppercase tracking-widest text-white/70">Next step</span>
          <span className="block text-sm font-bold leading-tight">{next.text}</span>
        </span>
        {next.cta && <span className="shrink-0 inline-flex items-center gap-1 rounded-full bg-white/25 px-3 py-1 text-xs font-bold">{next.cta} <ChevronRight className="h-3.5 w-3.5" /></span>}
      </button>

      {/* ── Daily command center — gathers every tool (phase · workout · yoga ·
             body · goal) into the numbers she checks each day ── */}
      <EnergyTodayCard e={energy} />
      <div className="grid gap-3 sm:grid-cols-2">
        <GoalPathCard onEdit={() => setBodyEditOpen(true)} />
        <WeekBalanceCard />
      </div>
      <CoachCard onSetupWorkouts={onSetupWorkouts} onPlanMeals={onDietWeek} />
      {bodyEditOpen && (
        <BodyGoalEditModal
          profile={profile}
          onClose={() => setBodyEditOpen(false)}
          onSave={({ weight, heightCm, targetWeight }) => {
            setProfile((p) => {
              const next = { ...p, heightCm, targetWeight };
              if (weight && weight > 0 && weight !== p.weight) {
                next.weight = weight;
                const hist = (p.weightHistory ?? []).filter((e) => e.date !== todayISO());
                hist.push({ date: todayISO(), kg: weight });
                hist.sort((a, b) => (a.date < b.date ? -1 : 1));
                next.weightHistory = hist;
              }
              return next;
            });
            setBodyEditOpen(false);
          }}
        />
      )}

      {/* ── Manage & track — the detail behind the numbers above ── */}
      <div className="flex items-center gap-2 pt-1">
        <div className="h-px flex-1 bg-petal/50" />
        <span className="text-[10px] font-bold uppercase tracking-widest text-rose/40">Manage &amp; track</span>
        <div className="h-px flex-1 bg-petal/50" />
      </div>

      {/* Weight & progress — the detail behind your goal path */}
      <div id="diet-weight">
        <Glass className="p-4 sm:p-5">
          <div className="flex items-center justify-between gap-2 mb-1">
            <div className="flex items-center gap-2 min-w-0">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-hotpink/10 text-hotpink"><Scale className="h-5 w-5" /></span>
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-widest text-rose/50">Weight &amp; progress</p>
                <p className="font-script text-2xl text-hotpink leading-none">{latest} kg</p>
              </div>
            </div>
            {history.length > 1 && (
              <span className={["inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold shrink-0", delta < 0 ? "bg-emerald-50 text-emerald-600" : delta > 0 ? "bg-rose-50 text-rose-600" : "bg-blush text-rose/70"].join(" ")}>
                {delta < 0 ? <TrendingDown className="h-3 w-3" /> : delta > 0 ? <TrendingUp className="h-3 w-3" /> : <Minus className="h-3 w-3" />}
                {delta > 0 ? "+" : ""}{delta} kg
              </span>
            )}
          </div>
          <p className="mb-2 text-[11px] text-rose/55 leading-snug">Log it weekly — the dashed line projects the pace your calorie plan actually produces. Set your goal weight from the <b className="text-hotpink">✎ on your goal path</b> above.</p>
          <WeightChart history={history} target={target} projection={weightProjection} />
          <div className="mt-3 flex items-center gap-2">
            <div className="flex-1 flex items-center rounded-full bg-white border border-petal/60 overflow-hidden">
              <button onClick={() => setWeightInput((w) => (Math.max(0, (parseFloat(w) || 0) - 0.1)).toFixed(1))} className="px-3.5 py-2 text-hotpink font-bold">−</button>
              <input value={weightInput} onChange={(e) => setWeightInput(e.target.value.replace(/[^\d.]/g, ""))} inputMode="decimal" className="flex-1 min-w-0 text-center text-sm font-bold text-rose outline-none" />
              <span className="pr-1 text-[11px] font-bold text-rose/50">kg</span>
              <button onClick={() => setWeightInput((w) => ((parseFloat(w) || 0) + 0.1).toFixed(1))} className="px-3.5 py-2 text-hotpink font-bold">+</button>
            </div>
            <PinkBtn onClick={logWeight}><Check className="h-4 w-4" /> Log today</PinkBtn>
          </div>
        </Glass>
      </div>

      {/* Your eating plan — the detail behind your nutrition */}
      <div id="diet-plan">
        <Glass className="p-4 sm:p-5">
          <div className="flex items-center justify-between gap-2 mb-2">
            <div className="flex items-center gap-2 min-w-0">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-hotpink text-white"><Leaf className="h-5 w-5" /></span>
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-widest text-rose/50">Your eating plan</p>
                <p className="font-script text-xl text-hotpink leading-none truncate">{regime.label}</p>
              </div>
            </div>
            <span className="rounded-full bg-blush text-hotpink text-[11px] font-bold px-2.5 py-1 border border-petal/60 shrink-0">{matchCount} recipes</span>
          </div>
          <p className="text-[12px] text-rose/70 leading-snug">{regime.blurb}</p>
          {adherence.logged > 0 && (
            <div className="mt-2.5">
              <div className="flex items-center justify-between text-[11px] font-bold text-rose/70 mb-1">
                <span>On-plan meals · this week</span>
                <span className="text-hotpink">{adherence.onPlan}/{adherence.logged} · {adherence.pct}%</span>
              </div>
              <div className="h-2 rounded-full bg-blush overflow-hidden"><div className="h-full rounded-full bg-hotpink transition-all" style={{ width: `${adherence.pct}%` }} /></div>
            </div>
          )}
          <div className="mt-3 flex gap-1.5 overflow-x-auto no-scrollbar snap-x pb-1">
            {DIET_REGIMES.map((r) => (
              <SelectPill key={r.key} active={(profile.regime ?? "balanced") === r.key} onClick={() => setProfile((p) => ({ ...p, regime: r.key, dietType: regimeToDietType(r.key) }))}>{r.label}</SelectPill>
            ))}
          </div>
          <p className="mt-3 text-[11px] text-rose/55 leading-snug flex items-start gap-1"><Sparkles className="h-3 w-3 mt-0.5 shrink-0 text-hotpink" /> Your diet is applied to your whole week in the Meals Planner.</p>
          <PinkBtn onClick={onDietToday} className="w-full justify-center mt-2.5">My plan for today <ChevronRight className="h-4 w-4" /></PinkBtn>
          <button onClick={onDietWeek} className="w-full mt-2 inline-flex items-center justify-center gap-1 rounded-full border border-hotpink/50 text-hotpink text-sm font-semibold py-2 hover:bg-hotpink/10 active:scale-95 transition">See my week in Meals Planner <ChevronRight className="h-4 w-4" /></button>
        </Glass>
      </div>

      <div className="flex items-center justify-center gap-4 pt-1">
        <button onClick={onEdit} className="text-xs font-semibold text-rose/60 hover:text-hotpink">Edit my diet setup ✿</button>
        <span className="text-rose/30">·</span>
        <button onClick={onReplayTour} className="text-xs font-semibold text-rose/60 hover:text-hotpink">Replay tour</button>
      </div>
    </div>
  );
}

function CycleNutritionTab({
  phase, cycleDay, profile, onEdit, cycleReady, onSyncedPlan, mealsToday,
}: {
  phase: DietPhase; cycleDay: number; profile: DietProfile; onEdit: () => void;
  cycleReady: boolean; onSyncedPlan: () => void; mealsToday: boolean;
}) {
  const phases: DietPhase[] = ["menstrual", "follicular", "ovulatory", "luteal"];
  const info = PHASE_INFO[phase];

  // Guiding next-step banner — never leave the user unsure what to do here.
  const next = !cycleReady
    ? { Icon: Moon, text: "Sync your cycle to unlock this plan", cta: "Set up" as string | null, act: () => { try { localStorage.setItem("bloom:diet-await-cycle", "1"); } catch {} window.location.href = "/app/tools/cycle"; } }
    : !mealsToday
    ? { Icon: UtensilsCrossed, text: `Fill today with your ${info.label.toLowerCase()}-phase plan`, cta: "Synced plan" as string | null, act: onSyncedPlan }
    : { Icon: Sparkles, text: "Today's meals are synced to your phase ✿", cta: null as string | null, act: () => {} };

  return (
    <div className="space-y-5">
      {/* Guiding thread — same idea as the Budget planner's smart banner */}
      <button onClick={next.act} className="w-full flex items-center gap-3 rounded-2xl bg-gradient-to-r from-hotpink to-[#DB2777] text-white p-3.5 shadow-lg shadow-hotpink/30 active:scale-[0.99] transition text-left">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white/25"><next.Icon className="h-5 w-5" /></span>
        <span className="flex-1 min-w-0">
          <span className="block text-[10px] font-bold uppercase tracking-widest text-white/70">Next step</span>
          <span className="block text-sm font-bold leading-tight">{next.text}</span>
        </span>
        {next.cta && <span className="shrink-0 inline-flex items-center gap-1 rounded-full bg-white/25 px-3 py-1 text-xs font-bold">{next.cta} <ChevronRight className="h-3.5 w-3.5" /></span>}
      </button>

      {/* Cycle-synced plan (moved here from My Diet) */}
      <div id="diet-cycle">
        <StepHeader step={1} title="Your cycle-synced plan" sub="eat in tune with today's phase" />
        {!cycleReady ? (
          <Glass className="p-5 text-center">
            <span className="mx-auto mb-2 grid h-11 w-11 place-items-center rounded-full bg-hotpink/10 text-hotpink"><Moon className="h-6 w-6" /></span>
            <p className="font-script text-xl text-hotpink">Sync your cycle first</p>
            <p className="mt-1 text-[12px] text-rose/70 max-w-xs mx-auto">Set up the Cycle Tracker so your food plan matches your phase automatically.</p>
            <div className="mt-3">
              <PinkBtn onClick={() => { try { localStorage.setItem("bloom:diet-await-cycle", "1"); } catch {} window.location.href = "/app/tools/cycle"; }}>Set up Cycle Tracker <ChevronRight className="h-4 w-4" /></PinkBtn>
            </div>
          </Glass>
        ) : (
          <PhaseCarousel phase={phase} cycleDay={cycleDay} onSyncedPlan={onSyncedPlan} />
        )}
      </div>

      <div>
        <StepHeader step={2} title="Your cycle phases" sub="what nourishes you all month" />
        <div className="flex gap-3 overflow-x-auto no-scrollbar snap-x pb-1 sm:grid sm:grid-cols-2 sm:overflow-visible">
          {phases.map((p) => <PhaseCard key={p} phase={p} active={p === phase} />)}
        </div>
      </div>

      <Glass className="p-4 sm:p-5">
        <div className="flex items-center justify-between">
          <h3 className="font-script text-xl text-hotpink flex items-center gap-1.5">
            <SlidersHorizontal className="h-4 w-4 text-hotpink" strokeWidth={1.8} /> My Rules
          </h3>
          <button onClick={onEdit} className="inline-flex items-center gap-1 text-xs font-semibold text-hotpink hover:underline">
            <Pencil className="h-3 w-3" /> Edit
          </button>
        </div>
        <div className="mt-2 flex flex-wrap gap-1.5">
          <span className="rounded-full bg-hotpink text-white px-2.5 py-1 text-xs font-bold capitalize">{profile.dietType}</span>
          {profile.allergies.length === 0 ? (
            <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-600">No allergies</span>
          ) : profile.allergies.map((a) => (
            <span key={a} className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-600 capitalize">{a}-free</span>
          ))}
          <span className="rounded-full bg-blush px-2.5 py-1 text-xs font-semibold text-magenta">
            {COOKING_OPTIONS.find((c) => c.key === profile.cookingFrequency)?.label}
          </span>
        </div>
        <p className="mt-2 text-xs text-rose/60">These preferences filter your recipe library silently.</p>
      </Glass>
    </div>
  );
}

/* ---------- Tab 2: Today ---------- */

const ZONE_MESSAGE: Record<string, string> = {
  glutes: "Muscle rebuild needs protein + complex carbs",
  legs: "Muscle rebuild needs protein + complex carbs",
  core: "Core recovery — lean protein + healthy fat",
  arms: "Upper body repair — protein + antioxidants",
  back: "Upper body repair — protein + antioxidants",
  "full-body": "Full recovery mode — complete macro balance",
};

function mealTypeForHour(hour: number): MealType {
  return hour < 11 ? "breakfast" : hour < 15 ? "lunch" : "dinner";
}

function bestPostWorkoutRecipe(phase: DietPhase, profile: DietProfile, mealType: MealType): Recipe | undefined {
  const pool = RECIPES.filter((r) =>
    r.macros.protein >= 25 &&
    r.phases.includes(phase) &&
    r.mealType === mealType &&
    passesMyRules(r, profile),
  ).sort((a, b) => b.macros.protein - a.macros.protein);
  if (pool.length) return pool[0];
  // soften constraints to avoid an empty state
  const fallback = RECIPES.filter((r) => r.mealType === mealType && passesMyRules(r, profile))
    .sort((a, b) => b.macros.protein - a.macros.protein);
  return fallback[0] ?? RECIPES.filter((r) => passesMyRules(r, profile))[0];
}

function MealSlot({
  type, meal, eaten, onToggleEaten, onAddRecipe, onRemove, candidates,
}: {
  type: MealType; meal: LoggedMeal | null;
  eaten: boolean; onToggleEaten: () => void;
  onAddRecipe: (r: Recipe) => void; onRemove: () => void;
  candidates: Recipe[];
}) {
  const [searching, setSearching] = useState(false);
  const [query, setQuery] = useState("");

  const results = useMemo(() => {
    if (!query.trim()) return candidates.slice(0, 5);
    const q = query.toLowerCase();
    return RECIPES.filter((r) =>
      r.mealType === type &&
      (r.name.toLowerCase().includes(q) || r.ingredients.some((i) => i.name.toLowerCase().includes(q))),
    ).slice(0, 6);
  }, [query, candidates, type]);

  const MealIcon = MEAL_ICONS[type];
  return (
    <Glass className="p-3 sm:p-4">
      <p className="font-script text-lg text-hotpink leading-none mb-2 flex items-center gap-1.5">
        <MealIcon className="h-4 w-4 text-hotpink" strokeWidth={1.8} />
        {MEAL_LABELS[type]}
      </p>
      {meal ? (
        <div className="mt-1.5">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-sm font-bold text-magenta">{meal.name}</p>
              <p className="text-xs text-rose/70">{fmtMacroLine(meal.macros)}</p>
            </div>
            <button onClick={onRemove} className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-blush text-hotpink">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
          {/* Tick when eaten → feeds today's macros & energy card */}
          <button
            onClick={onToggleEaten}
            className={["mt-2 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-bold transition active:scale-95", eaten ? "bg-emerald-500 text-white" : "bg-white border border-petal/60 text-rose/70"].join(" ")}
          >
            <Check className="h-3.5 w-3.5" strokeWidth={3} /> {eaten ? "Eaten ✓" : "I ate this"}
          </button>
        </div>
      ) : searching ? (
        <div className="mt-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-rose/50" />
            <input
              autoFocus value={query} onChange={(e) => setQuery(e.target.value)}
              placeholder="Search recipe or food..."
              className="w-full rounded-full border border-petal/60 bg-white py-1.5 pl-8 pr-3 text-xs text-rose focus:outline-none focus:ring-2 focus:ring-hotpink/30"
            />
          </div>
          <div className="mt-2 space-y-1 max-h-40 overflow-y-auto">
            {results.map((r) => (
              <button
                key={r.id} onClick={() => { onAddRecipe(r); setSearching(false); setQuery(""); }}
                className="flex w-full items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-left text-xs hover:bg-blush"
              >
                <span className="font-semibold text-magenta">{r.name}</span>
                <span className="shrink-0 text-rose/60">{r.macros.calories} kcal</span>
              </button>
            ))}
            {results.length === 0 && <p className="px-2 py-1 text-xs text-rose/50">No matches found.</p>}
          </div>
          <button onClick={() => setSearching(false)} className="mt-1 text-xs text-rose/60 hover:underline">Cancel</button>
        </div>
      ) : (
        <div className="mt-2 flex flex-wrap gap-2">
          <PinkBtn variant="outline" className="text-xs px-3 py-1.5" onClick={() => candidates[0] && onAddRecipe(candidates[0])}>
            <Plus className="h-3.5 w-3.5" /> From my plan
          </PinkBtn>
          <PinkBtn variant="ghost" className="text-xs px-3 py-1.5" onClick={() => setSearching(true)}>
            <Plus className="h-3.5 w-3.5" /> Add manually
          </PinkBtn>
        </div>
      )}
    </Glass>
  );
}

function TodayTab({
  phase, cycleDay, profile, dayMeals, eatenSlots, onSetSlot, onToggleEaten,
}: {
  phase: DietPhase; cycleDay: number; profile: DietProfile & { weight: number };
  dayMeals: DayMeals; eatenSlots: PlanSlot[];
  onSetSlot: (slot: MealType, recipe: Recipe | null) => void;
  onToggleEaten: (slot: MealType) => void;
}) {
  const eaten = new Set(eatenSlots);
  const [dismissedPW, setDismissedPW] = useLS<Record<string, boolean>>(LS.dismissedPW, {});
  const [pwIndex, setPwIndex] = useState(0);

  const workoutToday = useMemo(() => {
    const history = loadWorkoutHistory();
    return history.find((h) => h.date === todayISO()) ?? null;
  }, []);
  // Yoga planned today (and no strength) → a gentle recovery-food nudge.
  const yogaToday = useMemo(() => readYogaPlanDays().includes(todayWeekday()), []);

  // One calorie brain: the same BMR engine as the dashboard & Meals target.
  const targets = useMemo(() => computeTargets(false), [profile.goal, profile.weight, profile.heightCm, profile.age, phase, workoutToday]);

  const proteinBoostTarget = workoutToday ? Math.round(profile.weight * 1.8) : targets.protein;

  // Consumed = only meals ticked as eaten, matching the energy card.
  const consumed = useMemo(() => {
    const eatenMeals = (["breakfast", "lunch", "dinner", "snack", "lunchbox"] as MealType[])
      .filter((s) => eaten.has(s as PlanSlot))
      .map((s) => dayMeals[s])
      .filter(Boolean) as LoggedMeal[];
    return eatenMeals.reduce(
      (acc, m) => ({
        calories: acc.calories + m.macros.calories,
        protein: acc.protein + m.macros.protein,
        carbs: acc.carbs + m.macros.carbs,
        fat: acc.fat + m.macros.fat,
        iron: acc.iron + (m.micros?.iron ?? 0),
        magnesium: acc.magnesium + (m.micros?.magnesium ?? 0),
        omega3: acc.omega3 + (m.micros?.omega3 ?? 0),
        fibre: acc.fibre + (m.micros?.fibre ?? 0),
        vitaminB6: acc.vitaminB6 + (m.micros?.vitaminB6 ?? 0),
        vitaminC: acc.vitaminC + (m.micros?.vitaminC ?? 0),
      }),
      { calories: 0, protein: 0, carbs: 0, fat: 0, iron: 0, magnesium: 0, omega3: 0, fibre: 0, vitaminB6: 0, vitaminC: 0 },
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dayMeals, eatenSlots]);

  const ringColor = PHASE_RING[phase];
  const micros = PHASE_MICROS[phase];

  const assignMeal = (type: MealType, r: Recipe) => {
    onSetSlot(type, r);
  };

  const candidatesFor = (type: MealType): Recipe[] => {
    const sorted = [...RECIPES]
      .filter((r) => r.mealType === type && r.phases.includes(phase) && passesMyRules(r, profile))
      .sort((a, b) => Math.abs(a.macros.protein * 4 - targets.protein) - Math.abs(b.macros.protein * 4 - targets.protein));
    // Rotate the macro-relevant shortlist by the day of the month so the top
    // suggestion isn't the identical recipe every single day.
    const top = sorted.slice(0, 8);
    const rest = sorted.slice(8);
    const shuffled = top.length > 1
      ? (() => { const off = new Date().getDate() % top.length; return [...top.slice(off), ...top.slice(0, off), ...rest]; })()
      : sorted;
    // SINGLE SOURCE OF TRUTH: whatever the weekly Meals plan proposes for this
    // slot today wins the top spot, so "From my plan" adds the exact same meal
    // shown in the Meals Planner & Today — never a divergent pick.
    const plannedId = readTodayPlannedDay()[type as "breakfast" | "lunch" | "dinner" | "snack" | "lunchbox"];
    const planned = plannedId ? RECIPES.find((r) => r.id === plannedId) : undefined;
    if (planned) return [planned, ...shuffled.filter((r) => r.id !== planned.id)];
    return shuffled;
  };

  const mealType = mealTypeForHour(new Date().getHours());
  const pwPool = useMemo(() => {
    if (!workoutToday) return [];
    return RECIPES.filter((r) => r.macros.protein >= 25 && r.mealType === mealType && passesMyRules(r, profile))
      .sort((a, b) => b.macros.protein - a.macros.protein);
  }, [workoutToday, mealType, profile]);
  const pwRecipe = pwPool[pwIndex] ?? bestPostWorkoutRecipe(phase, profile, mealType);
  const showPostWorkout = !!workoutToday && !dismissedPW[todayISO()] && !!pwRecipe;

  return (
    <div className="space-y-5">
      {/* Header row */}
      <Glass className="p-4 flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm font-bold text-magenta">{new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}</p>
          <p className="text-xs text-rose/60">Day {cycleDay} of your cycle</p>
        </div>
        <span className="rounded-full bg-hotpink/10 px-3 py-1 text-xs font-bold uppercase tracking-wide text-hotpink">{PHASE_INFO[phase].label}</span>
      </Glass>

      {/* Macro rings */}
      <Glass className="p-4 sm:p-5">
        <h3 className="font-script text-xl text-hotpink mb-3 flex items-center gap-1.5">
          <Activity className="h-4 w-4 text-hotpink" strokeWidth={1.8} /> Today's Macros
        </h3>
        <div className="grid grid-cols-4 gap-2 sm:gap-4">
          <RingProgress value={consumed.calories} target={targets.calories} label="Calories" sub="" colorClass={ringColor} />
          <RingProgress value={consumed.protein} target={targets.protein} label="Protein" sub="g" colorClass={ringColor} />
          <RingProgress value={consumed.carbs} target={targets.carbs} label="Carbs" sub="g" colorClass={ringColor} />
          <RingProgress value={consumed.fat} target={targets.fat} label="Fat" sub="g" colorClass={ringColor} />
        </div>
      </Glass>

      {/* Micro bars */}
      <Glass className="p-4 sm:p-5 space-y-3">
        <h3 className="font-script text-xl text-hotpink flex items-center gap-1.5">
          <Leaf className="h-4 w-4 text-hotpink" strokeWidth={1.8} /> Phase Nutrients
        </h3>
        {micros.map((m) => (
          <MicroBar key={m.key as string} label={m.label} value={consumed[m.key as keyof typeof consumed] ?? 0} target={m.target} unit={m.unit} />
        ))}
      </Glass>

      {/* Post-workout card */}
      {showPostWorkout && pwRecipe && workoutToday && (
        <Glass className="p-4 sm:p-5 border-hotpink/30">
          <p className="text-sm font-bold text-magenta flex items-center gap-1.5">
            <Dumbbell className="h-4 w-4 text-hotpink" /> {workoutToday.sessionName} completed
          </p>
          <p className="mt-1 text-xs text-rose/80">
            {ZONE_MESSAGE[workoutToday.intention === "recover" ? "" : workoutToday.zone] ??
              (workoutToday.intention === "recover" ? "Gentle nourishment — anti-inflammatory focus" : "Full recovery mode — complete macro balance")}
          </p>
          <p className="mt-1 text-xs font-semibold text-hotpink">Your protein target is now {proteinBoostTarget}g today</p>

          <div className="mt-3 flex gap-3">
            <RecipePlaceholder name={pwRecipe.name} className="w-24 shrink-0" />
            <div>
              <p className="text-sm font-bold text-magenta">{pwRecipe.name}</p>
              <p className="text-xs text-rose/70">{fmtMacroLine(pwRecipe.macros)}</p>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            <PinkBtn className="text-xs px-3 py-1.5" onClick={() => assignMeal(mealType, pwRecipe)}>Add to today</PinkBtn>
            <PinkBtn variant="outline" className="text-xs px-3 py-1.5" onClick={() => setPwIndex((i) => (i + 1) % Math.max(1, pwPool.length))}>See alternatives</PinkBtn>
            <PinkBtn variant="ghost" className="text-xs px-3 py-1.5" onClick={() => setDismissedPW((d) => ({ ...d, [todayISO()]: true }))}>Dismiss</PinkBtn>
          </div>
        </Glass>
      )}

      {/* Yoga-day recovery nudge — gentle, hydrating, anti-inflammatory (not protein) */}
      {yogaToday && !workoutToday && (
        <Glass className="p-4 border-violet-200/70">
          <p className="text-sm font-bold text-violet-700 flex items-center gap-1.5">🧘 Yoga day — recovery fuel</p>
          <p className="mt-1 text-xs text-rose/80 leading-snug">
            Keep it light &amp; hydrating today. Lean into anti-inflammatory foods —
            berries, leafy greens, omega-3s, ginger &amp; turmeric — and an extra glass
            of water. No need to load protein for a gentle flow.
          </p>
        </Glass>
      )}

      {/* Meal slots — one per section */}
      <div>
        <h3 className="font-script text-2xl text-hotpink mb-3 flex items-center gap-2">
          <UtensilsCrossed className="h-5 w-5 text-hotpink" strokeWidth={1.6} /> Your Meals Today
        </h3>
        <div className="space-y-3">
          {(["breakfast", "lunch", "dinner", "snack"] as MealType[]).map((type) => (
            <MealSlot
              key={type} type={type} meal={dayMeals[type]}
              eaten={eaten.has(type as PlanSlot)}
              onToggleEaten={() => onToggleEaten(type)}
              onAddRecipe={(r) => assignMeal(type, r)}
              onRemove={() => onSetSlot(type, null)}
              candidates={candidatesFor(type)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

/* ---------- Tab 3: Recipes ---------- */

const PHASE_FILTERS: DietPhase[] = ["menstrual", "follicular", "ovulatory", "luteal"];
const MEAL_FILTERS: MealType[] = ["breakfast", "lunch", "dinner", "snack"];
const TIME_FILTERS = [
  { key: "15", label: "Under 15 min", max: 15 },
  { key: "30", label: "Under 30 min", max: 30 },
  { key: "60", label: "Under 60 min", max: 60 },
];
const GOAL_FILTERS = [
  { key: "protein", label: "High protein" },
  { key: "iron", label: "High iron" },
  { key: "omega3", label: "High omega-3" },
  { key: "lowcarb", label: "Low carb" },
];

function RecipesTab({
  phase, profile, onOpenRecipe,
}: { phase: DietPhase; profile: DietProfile; onOpenRecipe: (r: Recipe) => void }) {
  const [query, setQuery] = useState("");
  const [phaseFilters, setPhaseFilters] = useState<DietPhase[]>([]);
  const [mealFilters, setMealFilters] = useState<MealType[]>([]);
  const [timeFilter, setTimeFilter] = useState<string | null>(null);
  const [goalFilters, setGoalFilters] = useState<string[]>([]);

  const toggle = <T,>(arr: T[], v: T, set: (a: T[]) => void) => set(arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);

  const myRulesRecipes = useMemo(() => RECIPES.filter((r) => passesMyRules(r, profile)), [profile]);
  const regime = dietRegimeInfo(profile.regime ?? "balanced");

  const filtersActive = !!query.trim() || phaseFilters.length || mealFilters.length || timeFilter || goalFilters.length;

  const filtered = useMemo(() => {
    let list = myRulesRecipes;
    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter((r) => r.name.toLowerCase().includes(q) || r.ingredients.some((i) => i.name.toLowerCase().includes(q)));
    }
    if (phaseFilters.length) list = list.filter((r) => r.phases.some((p) => phaseFilters.includes(p)));
    if (mealFilters.length) list = list.filter((r) => mealFilters.includes(r.mealType));
    if (timeFilter) {
      const max = TIME_FILTERS.find((t) => t.key === timeFilter)!.max;
      list = list.filter((r) => r.prepTime + r.cookTime <= max);
    }
    if (goalFilters.length) {
      list = list.filter((r) => goalFilters.every((g) => {
        if (g === "protein") return r.macros.protein >= 25;
        if (g === "iron") return (r.micros.iron ?? 0) >= 3;
        if (g === "omega3") return (r.micros.omega3 ?? 0) >= 1;
        if (g === "lowcarb") return r.macros.carbs <= 30;
        return true;
      }));
    }
    return list;
  }, [myRulesRecipes, query, phaseFilters, mealFilters, timeFilter, goalFilters]);

  const forYourPhase = useMemo(() => {
    return myRulesRecipes
      .filter((r) => r.phases.includes(phase))
      .sort((a, b) => b.macros.protein - a.macros.protein)
      .slice(0, 4);
  }, [myRulesRecipes, phase]);

  const quickThisWeek = useMemo(() => myRulesRecipes.filter((r) => r.prepTime <= 15).slice(0, 4), [myRulesRecipes]);

  const workoutToday = useMemo(() => {
    const history = loadWorkoutHistory();
    return history.find((h) => h.date === todayISO()) ?? null;
  }, []);
  const pwRecipes = useMemo(() => {
    if (!workoutToday) return [];
    return myRulesRecipes.filter((r) => r.macros.protein >= 25 && r.phases.includes(phase)).slice(0, 4);
  }, [workoutToday, myRulesRecipes, phase]);

  return (
    <div className="space-y-4">
      {/* Active plan header — makes the filtering explicit */}
      <div className="flex items-center gap-2.5 rounded-2xl bg-hotpink/10 border border-petal/60 px-3.5 py-2.5">
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-hotpink text-white"><Leaf className="h-4 w-4" /></span>
        <p className="text-[12px] text-rose/80 leading-snug">
          <b className="text-hotpink">{regime.label}</b> plan · <b className="text-hotpink">{myRulesRecipes.length}</b> recipes matched to you{profile.allergies.length ? " (allergy-safe)" : ""}.
        </p>
      </div>

      {/* Search + filters */}
      <Glass className="p-4 space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-rose/50" />
          <input
            value={query} onChange={(e) => setQuery(e.target.value)}
            placeholder="Search recipes or ingredients..."
            className="w-full rounded-full border border-petal/60 bg-white py-2.5 pl-10 pr-4 text-sm text-rose focus:outline-none focus:ring-2 focus:ring-hotpink/30"
          />
        </div>
        <div className="space-y-1.5">
          <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-1">
            {PHASE_FILTERS.map((p) => (
              <SelectPill key={p} active={phaseFilters.includes(p)} onClick={() => toggle(phaseFilters, p, setPhaseFilters)}>{PHASE_INFO[p].label}</SelectPill>
            ))}
          </div>
          <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-1">
            {MEAL_FILTERS.map((m) => (
              <SelectPill key={m} active={mealFilters.includes(m)} onClick={() => toggle(mealFilters, m, setMealFilters)}>{MEAL_LABELS[m]}</SelectPill>
            ))}
          </div>
          <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-1">
            {TIME_FILTERS.map((t) => (
              <SelectPill key={t.key} active={timeFilter === t.key} onClick={() => setTimeFilter((cur) => (cur === t.key ? null : t.key))}>{t.label}</SelectPill>
            ))}
          </div>
          <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-1">
            {GOAL_FILTERS.map((g) => (
              <SelectPill key={g.key} active={goalFilters.includes(g.key)} onClick={() => toggle(goalFilters, g.key, setGoalFilters)}>{g.label}</SelectPill>
            ))}
          </div>
        </div>
      </Glass>

      {!!pwRecipes.length && !filtersActive && (
        <Glass className="p-4">
          <p className="font-script text-lg text-hotpink mb-2 inline-flex items-center gap-1.5"><Dumbbell className="h-4 w-4" strokeWidth={1.8} /> Post-workout recipes — high protein · phase matched</p>
          <div className="flex gap-3 overflow-x-auto no-scrollbar pb-1">
            {pwRecipes.map((r) => (
              <div key={r.id} className="w-40 shrink-0"><RecipeCard recipe={r} onOpen={() => onOpenRecipe(r)} /></div>
            ))}
          </div>
        </Glass>
      )}

      {filtersActive ? (
        <Glass className="p-4">
          <p className="font-script text-lg text-hotpink mb-2">{filtered.length} recipe{filtered.length === 1 ? "" : "s"}</p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {filtered.map((r) => <RecipeCard key={r.id} recipe={r} onOpen={() => onOpenRecipe(r)} />)}
          </div>
          {filtered.length === 0 && <p className="text-sm text-rose/60">No recipes match — try fewer filters.</p>}
        </Glass>
      ) : (
        <>
          <Glass className="p-4">
            <p className="font-script text-lg text-hotpink mb-2">For your phase today</p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {forYourPhase.map((r) => <RecipeCard key={r.id} recipe={r} onOpen={() => onOpenRecipe(r)} />)}
            </div>
          </Glass>
          <Glass className="p-4">
            <p className="font-script text-lg text-hotpink mb-2">Quick this week</p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {quickThisWeek.map((r) => <RecipeCard key={r.id} recipe={r} onOpen={() => onOpenRecipe(r)} />)}
            </div>
          </Glass>
        </>
      )}
    </div>
  );
}

/* ---------- Page ---------- */

type TabKey = "profile" | "cycle" | "today" | "recipes";
const TABS: { key: TabKey; label: string; icon: React.ElementType }[] = [
  { key: "profile", label: "My Diet",        icon: Activity },
  { key: "cycle",   label: "Cycle Nutrition", icon: Moon },
  { key: "today", label: "Today",           icon: UtensilsCrossed },
  { key: "recipes", label: "Recipes",       icon: BookOpen },
];
const TAB_HERO: Record<TabKey, { title: string; subtitle: string }> = {
  profile: { title: "My Diet",          subtitle: "your plan, your weight & your movement — all in one ✿" },
  cycle:   { title: "Cycle Nutrition",  subtitle: "eat in tune with today's phase 🌙" },
  today:   { title: "Today's Meals",    subtitle: "nourish your bloom, one bite at a time 🌸" },
  recipes: { title: "Recipes",          subtitle: "cook for your phase, glow all season 💫" },
};

export default function DietPage() {
  const [setupComplete, setSetupComplete] = useLS<boolean>(LS.setup, false);
  const [profile, setProfile] = useLS<DietProfile & { weight: number }>(LS.profile, DEFAULT_PROFILE);
  const [tab, setTab] = useLS<TabKey>(LS.tab, "profile");
  const [editingSetup, setEditingSetup] = useState(false);
  const [openRecipe, setOpenRecipe] = useState<Recipe | null>(null);
  // Today's meals ARE the one shared weekly plan (bloom:meals-plan). We mirror
  // it in state and re-read after every write so edits here == the Planner.
  const [todayPlan, setTodayPlan] = useState(() => readTodayPlannedDay());
  const [eatenSlots, setEatenSlots] = useState<PlanSlot[]>(() => readEatenToday());
  const [mealsVersion, setMealsVersion] = useState(0);
  const refreshMeals = () => { setTodayPlan(readTodayPlannedDay()); setMealsVersion((v) => v + 1); };
  const [onboarded, setOnboarded] = useLS<boolean>(LS.onboarded, false);
  const [replayTour, setReplayTour] = useState(false);
  const tabsRef = useRef<HTMLDivElement>(null);

  const cyclePhase = useMemo(() => mapCyclePhase(readCyclePhase()), []);
  const cycleDay = useMemo(() => getCycleDay(), []);

  // bidirectional goal sync with the Me page
  useEffect(() => {
    try {
      const meGoal = localStorage.getItem(LS.meGoal);
      if (meGoal && meGoal !== profile.goal && (meGoal === "lose" || meGoal === "maintain" || meGoal === "gain")) {
        setProfile((p) => ({ ...p, goal: meGoal as DietGoal }));
      }
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSetupDone = (p: DietProfile & { weight: number }) => {
    setProfile(p);
    setSetupComplete(true);
    setEditingSetup(false);
    setTab("profile");
    try { localStorage.setItem(LS.meGoal, p.goal); } catch {}
  };

  // Today's meals, derived from the shared plan (recipeId → full meal).
  const dayMeals: DayMeals = useMemo(() => {
    const d: DayMeals = { ...EMPTY_DAY };
    (["breakfast", "lunch", "dinner", "snack", "lunchbox"] as MealType[]).forEach((slot) => {
      const id = todayPlan[slot as PlanSlot];
      const r = id ? RECIPES.find((x) => x.id === id) : undefined;
      d[slot] = r ? { name: r.name, recipeId: r.id, macros: r.macros, micros: r.micros } : null;
    });
    return d;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [todayPlan]);
  const mealsToday = Object.values(dayMeals).some(Boolean);

  // Set/clear a slot → writes the ONE plan for today's weekday.
  const onSetSlot = (slot: MealType, recipe: Recipe | null) => {
    setMealPlanSlot(todayWeekday(), slot as PlanSlot, recipe?.id ?? null);
    refreshMeals();
  };
  const onToggleEaten = (slot: MealType) => { setEatenSlots(toggleEatenToday(slot as PlanSlot)); setMealsVersion((v) => v + 1); };

  // Recipe modal "add to plan" → writes the plan for that date's weekday.
  const addToPlan = (date: string, recipe: Recipe) => {
    const wd = new Date(date + "T00:00:00").toLocaleDateString("en-US", { weekday: "short" });
    setMealPlanSlot(wd, recipe.mealType as PlanSlot, recipe.id);
    if (wd === todayWeekday()) refreshMeals();
  };

  const cycleReady = hasCycleSettings();

  // Fill today's empty slots into the ONE plan (phase-synced picks), keeping any
  // meal the Meals Planner already set — so Diet & Planner stay identical.
  const fillToday = (pred: (r: Recipe) => boolean) => {
    const slots: MealType[] = ["breakfast", "lunch", "dinner", "snack"];
    const day = todayWeekday();
    const planned = readTodayPlannedDay();
    slots.forEach((slot, i) => {
      if (planned[slot as PlanSlot]) return; // keep what the plan already has
      const primary = RECIPES.filter((x) => x.mealType === slot && pred(x));
      const pool = primary.length ? primary : RECIPES.filter((x) => x.mealType === slot && passesMyRules(x, profile));
      const r = pool.length ? pool[(i * 3) % pool.length] : undefined;
      if (r) setMealPlanSlot(day, slot as PlanSlot, r.id);
    });
    refreshMeals();
    setTab("today");
  };
  const onSyncedPlan = () => fillToday((r) => r.phases.includes(cyclePhase) && passesMyRules(r, profile));
  const onDietToday = () => fillToday((r) => passesMyRules(r, profile));
  const onDietWeek = () => {
    const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    const slots = ["breakfast", "lunch", "dinner"] as const;
    days.forEach((d, di) => slots.forEach((slot, si) => {
      const cands = RECIPES.filter((r) => r.mealType === slot && passesMyRules(r, profile));
      if (cands.length) addRecipeToMealPlan(cands[(di * 3 + si) % cands.length].id, d, slot);
    }));
    try { localStorage.setItem("bloom:meals-from-diet", dietRegimeInfo(profile.regime ?? "balanced").label); } catch {}
    window.location.href = "/app/tools/meals";
  };

  // Reset → wipe every diet key and reload into the first-run wizard (preview).
  const onReset = async () => {
    resetToolState("diet");
    try { await flushCloudSync(); } catch {}
    window.location.reload();
  };

  if (!setupComplete || editingSetup) {
    return <SetupScreen initial={profile} onDone={handleSetupDone} />;
  }

  const showTour = tab === "profile" && (!onboarded || replayTour);

  return (
    <div className="relative animate-fade-in max-w-full overflow-x-hidden">
      {showTour && (
        <SparkleOnboarding
          steps={DIET_TOUR_STEPS}
          content={DIET_TOUR_CONTENT}
          onDone={() => { setOnboarded(true); setReplayTour(false); }}
        />
      )}
      <BloomBubbles count={10} />

      <a href="/app/tools" className="mb-3 inline-flex items-center gap-1 text-sm text-rose hover:text-hotpink">
        <ArrowLeft className="h-4 w-4" /> All tools
      </a>

      {/* HERO — compact fixed height (stays small on desktop, like the Budget hero) */}
      <div className="relative w-full min-h-[150px] sm:min-h-[166px] lg:min-h-[178px] rounded-3xl overflow-hidden border border-pink-200/60 shadow-xl shadow-pink-200/30 mb-4 animate-hero-border-signal">
        <img src="/images/meal-oats.jpg" alt="Diet Tool" className="absolute inset-0 h-full w-full object-cover object-center" />
        <div className="absolute inset-0 bg-gradient-to-r from-hotpink/70 via-hotpink/20 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/35 via-transparent to-transparent" />
        {/* Reset — preview the brand-new-user experience */}
        <button
          onClick={onReset}
          title="Reset (preview first-time setup)"
          className="absolute top-2.5 right-2.5 z-10 inline-flex items-center gap-1 rounded-full bg-white/85 backdrop-blur px-2.5 py-1 text-[10px] font-bold text-hotpink border border-white/60 shadow-sm active:scale-95 transition"
        >
          <RotateCcw className="h-3 w-3" /> Reset
        </button>
        <div className="absolute inset-0 flex flex-col justify-between p-3 sm:p-5 lg:p-7">
          {/* Title block */}
          <div className="flex-1 flex flex-col justify-center max-w-[55%] sm:max-w-[45%] lg:max-w-[38%]">
            <h1 className="animate-fade-in font-script text-2xl sm:text-3xl lg:text-4xl text-white leading-none drop-shadow-md" style={{ animationDelay: "0ms" }}>
              {TAB_HERO[tab].title}
            </h1>
            <p className="animate-fade-in mt-1 text-[10px] sm:text-xs font-semibold uppercase tracking-widest text-white/75 drop-shadow" style={{ animationDelay: "120ms" }}>
              {PHASE_INFO[cyclePhase].label} phase
            </p>
            <p className="animate-fade-in mt-2 text-xs sm:text-sm italic text-white/90 drop-shadow leading-snug" style={{ animationDelay: "200ms" }}>
              {TAB_HERO[tab].subtitle}
            </p>
          </div>
          {/* Tab pills at bottom of hero */}
          <div id="diet-tabs" ref={tabsRef} className="animate-fade-in overflow-x-auto no-scrollbar" style={{ animationDelay: "320ms" }}>
            <div className="flex gap-1.5 w-max">
              {TABS.map((t) => {
                const active = tab === t.key;
                return (
                  <button
                    key={t.key}
                    onClick={() => setTab(t.key)}
                    className={[
                      "shrink-0 inline-flex items-center gap-1 rounded-full px-3 py-1 text-[10px] sm:text-xs font-semibold transition whitespace-nowrap",
                      active
                        ? "bg-hotpink text-white shadow shadow-hotpink/40"
                        : "bg-white/20 backdrop-blur-md border border-white/40 text-white hover:bg-white/30",
                    ].join(" ")}
                  >
                    <t.icon className="h-3 w-3 shrink-0" strokeWidth={1.8} />
                    {t.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {tab === "profile" && (
          <ProfileTab
            phase={cyclePhase} cycleDay={cycleDay} profile={profile} mealsVersion={mealsVersion}
            setProfile={setProfile} onEdit={() => setEditingSetup(true)} goTo={setTab}
            onReplayTour={() => setReplayTour(true)} cycleReady={cycleReady}
            onSyncedPlan={onSyncedPlan} onDietToday={onDietToday} onDietWeek={onDietWeek}
          />
        )}
        {tab === "cycle" && (
          <CycleNutritionTab
            phase={cyclePhase} cycleDay={cycleDay} profile={profile}
            onEdit={() => setEditingSetup(true)} cycleReady={cycleReady}
            onSyncedPlan={onSyncedPlan}
            mealsToday={mealsToday}
          />
        )}
        {tab === "today" && (
          <TodayTab phase={cyclePhase} cycleDay={cycleDay} profile={profile} dayMeals={dayMeals} eatenSlots={eatenSlots} onSetSlot={onSetSlot} onToggleEaten={onToggleEaten} />
        )}
        {tab === "recipes" && <RecipesTab phase={cyclePhase} profile={profile} onOpenRecipe={setOpenRecipe} />}
      </div>

      {openRecipe && <RecipeModal recipe={openRecipe} onClose={() => setOpenRecipe(null)} onAddToPlan={addToPlan} />}
    </div>
  );
}
