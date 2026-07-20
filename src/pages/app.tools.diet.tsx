import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  ArrowLeft, Search, X, Plus, Clock, Flame, Dumbbell, Sparkles,
  ChevronRight, Pencil, Check, Moon, UtensilsCrossed, BookOpen,
  Leaf, Activity, Sunrise, Sun, Apple, SlidersHorizontal,
  Scale, TrendingUp, TrendingDown, Minus, RotateCcw, Info, BarChart3,
} from "lucide-react";
import { BloomBubbles } from "@/components/bloom/BloomBubbles";
import { CyclePhasePill } from "@/components/bloom/CyclePhasePill";
import { CuteDatePicker } from "@/components/bloom/CuteDatePicker";
import { readCyclePhase, readCycleSettings, hasCycleSettings, toDietPhase, type CyclePhase } from "@/components/bloom/cyclePhase";
import { WORKOUT_LOG_KEY, type HistoryEntry } from "@/pages/app.tools.workout";
import { addRecipeToMealPlan, resetToolState, readTodayPlannedDay, readMealPlan, setMealPlanSlot, todayWeekday, readEatenToday, toggleEatenToday, readYogaPlanDays, readWorkoutPlanDays, clearMealPlan, clearMovementPlan, setMealPortion, portionFor, hasMealPlan, type PlanSlot } from "@/lib/crossToolData";
import { isGuided } from "@/lib/guidedSetup";
import { SpotlightCoach } from "@/components/bloom/SpotlightCoach";
import { flushCloudSync } from "@/lib/cloudSync";
import { todayISO } from "@/lib/localDate";
import { SparkleOnboarding, type SparkleContent, type SparkleStep } from "@/components/bloom/SparkleOnboarding";
import { StepText } from "@/components/bloom/recipes/StepText";
import { computeTargets, energyBalance, goalProjection, portionForRecipe, slotBudget } from "@/lib/nutritionTargets";
import { EnergyTodayCard, GoalPathCard, WeekBalanceCard } from "@/components/bloom/diet/DietDashboard";
import { buildDayCoach } from "@/lib/todayCoach";
import { readsForPhase } from "@/lib/readsData";
import { CoachTodayCard, TomorrowCard, PhaseReads } from "@/components/bloom/coach/CoachCards";
import { usePremium } from "@/lib/entitlements";
import { PlusLock } from "@/components/bloom/premium/PremiumKit";
import {
  RECIPES, PHASE_INFO, PHASE_MICROS, passesMyRules, scaleQuantity, recipeImageSrc,
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
        <img
          src={recipeImageSrc(recipe)}
          alt={recipe.name}
          loading="lazy"
          className="w-full aspect-[4/3] object-cover rounded-xl bg-blush"
          onError={(e) => {
            const el = e.currentTarget as HTMLImageElement;
            const fb = MEAL_SLOT_FALLBACK[recipe.mealType] ?? "/images/meal-buddha.webp";
            if (!el.src.endsWith(fb)) el.src = fb;
          }}
        />
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
  recipe, portion = 1, onClose, onAddToPlan,
}: { recipe: Recipe; portion?: number; onClose: () => void; onAddToPlan: (date: string, recipe: Recipe) => void }) {
  const [date, setDate] = useState(todayISO());
  const [added, setAdded] = useState(false);
  // Portion baked in — show macros & ingredient amounts as the plan serves them.
  // `f` is how many single-servings this portion equals; the ingredient list is
  // written for the recipe's full `servings`, so scale it by `f / servings` to
  // land on ONE portion (matching the macro card) — not the whole batch × f.
  const f = portion && portion > 0 ? portion : 1;
  const scaled = f !== 1;
  const ingF = scaled ? f / (recipe.servings || 1) : 1;
  const mac = {
    calories: Math.round(recipe.macros.calories * f),
    protein: Math.round(recipe.macros.protein * f),
    carbs: Math.round(recipe.macros.carbs * f),
    fat: Math.round(recipe.macros.fat * f),
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm p-0 sm:p-4 animate-fade-in" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="w-full sm:max-w-lg max-h-[92vh] overflow-y-auto rounded-t-[2rem] sm:rounded-[2rem] bg-white shadow-2xl">
        <div className="relative p-4 sm:p-6">
          <button onClick={onClose} className="absolute right-4 top-4 z-10 grid h-9 w-9 place-items-center rounded-full bg-blush text-hotpink">
            <X className="h-4 w-4" />
          </button>
          <img
            src={recipeImageSrc(recipe)}
            alt={recipe.name}
            className="w-full aspect-[16/10] object-cover rounded-2xl bg-blush"
            onError={(e) => {
              const el = e.currentTarget as HTMLImageElement;
              const fb = MEAL_SLOT_FALLBACK[recipe.mealType] ?? "/images/meal-buddha.webp";
              if (el.src.endsWith(fb)) { el.style.display = "none"; } else { el.src = fb; }
            }}
          />
          <h2 className="mt-3 font-script text-2xl text-hotpink leading-tight">{recipe.name}</h2>
          <p className="text-sm text-rose/70">{recipe.cuisine} cuisine</p>

          {/* Prep / cook / yield meta */}
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px] font-semibold text-rose/70">
            <span className="inline-flex items-center gap-1"><Clock className="h-3.5 w-3.5 text-hotpink" /> Prep {recipe.prepTime} min</span>
            <span className="inline-flex items-center gap-1"><Flame className="h-3.5 w-3.5 text-hotpink" /> Cook {recipe.cookTime} min</span>
            <span className="inline-flex items-center gap-1"><UtensilsCrossed className="h-3.5 w-3.5 text-hotpink" /> Serves {recipe.servings}</span>
            <span className="capitalize inline-flex items-center gap-1"><Sparkles className="h-3.5 w-3.5 text-hotpink" /> {recipe.difficulty}</span>
          </div>

          <div className="mt-2 flex flex-wrap gap-1.5">
            {recipe.phases.map((p) => <PhasePillTag key={p} phase={p} />)}
            {recipe.dietTags.map((t) => (
              <span key={t} className="rounded-full bg-white border border-petal/60 px-2 py-0.5 text-[10px] font-semibold text-rose/80">{t}</span>
            ))}
            {recipe.allergens.length === 0 && (
              <span className="rounded-full bg-green-50 border border-green-200 px-2 py-0.5 text-[10px] font-semibold text-green-700">allergen-free</span>
            )}
          </div>

          {/* Nutrition rings — scaled to the planned portion */}
          <div className="mt-4 grid grid-cols-4 gap-2">
            <RingProgress value={mac.calories} target={mac.calories} label="kcal" sub="" colorClass="text-hotpink" size={64} />
            <RingProgress value={mac.protein} target={mac.protein} label="protein" sub="g" colorClass="text-amber-500" size={64} />
            <RingProgress value={mac.carbs} target={mac.carbs} label="carbs" sub="g" colorClass="text-rose-500" size={64} />
            <RingProgress value={mac.fat} target={mac.fat} label="fat" sub="g" colorClass="text-violet-500" size={64} />
          </div>

          {/* Micro bars */}
          {Object.keys(recipe.micros).length > 0 && (
            <div className="mt-4 space-y-2">
              {Object.entries(recipe.micros).map(([k, v]) => (
                <MicroBar key={k} label={k} value={v as number} target={Math.max(v as number, 1)} unit="" />
              ))}
            </div>
          )}

          {/* Equipment */}
          {recipe.equipment && recipe.equipment.length > 0 && (
            <>
              <h3 className="mt-4 font-script text-lg text-hotpink">You'll need</h3>
              <div className="mt-1 flex flex-wrap gap-1.5">
                {recipe.equipment.map((e) => (
                  <span key={e} className="rounded-full bg-blush/70 border border-petal/50 px-2.5 py-0.5 text-[11px] font-semibold text-magenta">{e}</span>
                ))}
              </div>
            </>
          )}

          {/* Ingredients — amounts scaled to the planned portion */}
          <h3 className="mt-4 font-script text-lg text-hotpink">Ingredients <span className="text-xs font-sans font-semibold text-rose/50">· {scaled ? "portioned for your goal ✿" : `makes ${recipe.servings} serving${recipe.servings === 1 ? "" : "s"}`}</span></h3>
          <ul className="mt-1 space-y-1 text-sm text-rose/90">
            {recipe.ingredients.map((ing) => (
              <li key={ing.name} className="flex items-start justify-between gap-3 border-b border-petal/40 py-1">
                <span className="font-medium">{ing.name}</span>
                <span className="text-rose/60 text-right shrink-0 max-w-[55%]">{scaleQuantity(ing.quantity, ingF)}</span>
              </li>
            ))}
          </ul>

          {/* Steps */}
          <h3 className="mt-4 font-script text-lg text-hotpink">Method</h3>
          <ol className="mt-2 space-y-3">
            {recipe.steps.map((s, i) => (
              <li key={i} className="flex gap-3 text-sm text-rose/90 leading-relaxed">
                <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-hotpink text-white text-xs font-bold">{i + 1}</span>
                <span className="flex-1 pt-0.5"><StepText text={s} /></span>
              </li>
            ))}
          </ol>

          {/* Tips */}
          {(recipe.substitutionTip || recipe.batchTip) && (
            <div className="mt-4 space-y-2">
              {recipe.substitutionTip && (
                <div className="rounded-2xl bg-blush/50 border border-petal/50 p-3 flex items-start gap-2">
                  <Sparkles className="h-4 w-4 shrink-0 mt-0.5 text-hotpink" />
                  <p className="text-[12.5px] text-rose/80 leading-snug"><b className="text-hotpink">Swap:</b> {recipe.substitutionTip}</p>
                </div>
              )}
              {recipe.batchTip && (
                <div className="rounded-2xl bg-blush/50 border border-petal/50 p-3 flex items-start gap-2">
                  <Leaf className="h-4 w-4 shrink-0 mt-0.5 text-hotpink" />
                  <p className="text-[12.5px] text-rose/80 leading-snug"><b className="text-hotpink">Make ahead:</b> {recipe.batchTip}</p>
                </div>
              )}
            </div>
          )}

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
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-3 sm:p-4" onClick={onClose}>
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

/** Quick eating-plan editor — diet, allergies & cooking time. Opened from the
 *  "Edit plan" button on Today's fuel. Every change re-filters the recipe pool. */
function EatingPlanEditModal({ profile, setProfile, onClose }: {
  profile: DietProfile & { weight: number };
  setProfile: (v: (DietProfile & { weight: number }) | ((p: DietProfile & { weight: number }) => DietProfile & { weight: number })) => void;
  onClose: () => void;
}) {
  const regime = dietRegimeInfo(profile.regime ?? "balanced");
  const matchCount = useMemo(() => RECIPES.filter((r) => passesMyRules(r, profile)).length, [profile]);
  return createPortal(
    <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-rose/25 backdrop-blur-sm animate-fade-in" />
      <div className="relative w-full sm:max-w-md max-h-[88vh] overflow-y-auto rounded-t-[2rem] sm:rounded-[2rem] bg-white shadow-2xl shadow-rose/20 p-5 animate-scale-in" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-1">
          <h3 className="font-script text-2xl text-hotpink">Your eating plan</h3>
          <button onClick={onClose} aria-label="Close" className="rounded-full bg-blush/70 p-1.5 text-rose active:scale-90 transition"><X className="h-4 w-4" /></button>
        </div>
        <p className="text-[11px] text-rose/60 leading-snug mb-4">Your diet, allergies &amp; cooking time — every recipe re-filters to match. <b className="text-hotpink">{matchCount} recipes</b> fit right now.</p>
        <div className="space-y-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wide text-rose/50 mb-1.5">Diet</p>
            <div className="flex gap-1.5 overflow-x-auto no-scrollbar snap-x pb-1">
              {DIET_REGIMES.map((r) => (
                <SelectPill key={r.key} active={(profile.regime ?? "balanced") === r.key} onClick={() => setProfile((p) => ({ ...p, regime: r.key, dietType: regimeToDietType(r.key) }))}>{r.label}</SelectPill>
              ))}
            </div>
            <p className="mt-1.5 text-[11.5px] text-rose/70 leading-snug">{regime.blurb}</p>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wide text-rose/50 mb-1.5">Allergies</p>
            <div className="flex flex-wrap gap-1.5">
              {ALLERGY_OPTIONS.map((o) => (
                <SelectPill key={o.key} active={profile.allergies.includes(o.key)} onClick={() => setProfile((p) => ({ ...p, allergies: p.allergies.includes(o.key) ? p.allergies.filter((x) => x !== o.key) : [...p.allergies, o.key] }))}>{o.label}</SelectPill>
              ))}
              <SelectPill active={profile.allergies.length === 0} onClick={() => setProfile((p) => ({ ...p, allergies: [] }))}>None</SelectPill>
            </div>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wide text-rose/50 mb-1.5">Cooking time</p>
            <div className="flex flex-wrap gap-1.5">
              {COOKING_OPTIONS.map((o) => (
                <SelectPill key={o.key} active={profile.cookingFrequency === o.key} onClick={() => setProfile((p) => ({ ...p, cookingFrequency: o.key }))}>{o.label}</SelectPill>
              ))}
            </div>
          </div>
        </div>
        <PinkBtn className="mt-5 w-full justify-center" onClick={onClose}>Done <Check className="h-4 w-4" /></PinkBtn>
      </div>
    </div>,
    document.body,
  );
}

/** Small numeric field for the setup wizard. `error` flags a required-but-empty
 *  field: it turns the border rose-red and squeezes to draw the eye. */
function SetupNumber({ label, unit, value, onChange, placeholder, autoFocus, error }: {
  label: string; unit: string; value: string; onChange: (v: string) => void; placeholder?: string; autoFocus?: boolean; error?: boolean;
}) {
  return (
    <label className={[
      "flex-1 flex items-center rounded-2xl bg-white overflow-hidden border transition",
      error ? "border-rose-400 ring-2 ring-rose-300/60 animate-attention-squeeze" : "border-petal/60 focus-within:border-hotpink",
    ].join(" ")}>
      <span className={["pl-3.5 pr-2 text-[11px] font-bold uppercase tracking-wide", error ? "text-rose-500" : "text-rose/50"].join(" ")}>{label}</span>
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
  // Step 1 is now obligatory: weight, height & age are all required for a precise
  // calorie target. Tapping Continue with any missing squeezes the empty fields.
  const [bodyErr, setBodyErr] = useState<{ weight: boolean; height: boolean; age: boolean }>({ weight: false, height: false, age: false });
  const [squeeze, setSqueeze] = useState(0); // bump to re-trigger the squeeze animation

  const STEPS = [
    { key: "body", title: "About your body", hint: "This powers your exact calorie target — nothing is shared." },
    { key: "goal", title: "Your goal", hint: "We'll tailor your calories, protein & timeline to this." },
    { key: "plan", title: "Your eating plan", hint: "Sets which recipes you'll be offered all month." },
    { key: "prefs", title: "A few preferences", hint: "So every suggestion is safe and doable for you." },
  ] as const;
  const isLast = step === STEPS.length - 1;
  const wKg = parseFloat(weight);
  const bodyComplete = wKg > 0 && parseFloat(height) > 0 && parseInt(age, 10) > 0;

  // Continue: on step 1, all three body fields are required. Missing → squeeze the
  // empty ones + show the notice, and don't advance.
  const handleNext = () => {
    if (step === 0 && !bodyComplete) {
      setBodyErr({ weight: !(wKg > 0), height: !(parseFloat(height) > 0), age: !(parseInt(age, 10) > 0) });
      setSqueeze((s) => s + 1);
      return;
    }
    setBodyErr({ weight: false, height: false, age: false });
    if (isLast) finish(); else setStep((s) => s + 1);
  };

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
      {/* HERO banner — matches the first-page-after-reset heroes across the app */}
      <div className="relative w-full min-h-[140px] sm:min-h-[164px] rounded-3xl overflow-hidden border border-pink-200/60 shadow-xl shadow-pink-200/30 mb-4 animate-card-pop-in">
        <img src="/images/meals-hero-new.webp" alt="" className="absolute inset-0 h-full w-full object-cover object-center" referrerPolicy="no-referrer" />
        <div className="absolute inset-0 bg-gradient-to-r from-hotpink/75 via-hotpink/25 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/35 via-transparent to-transparent" />
        <div className="relative flex flex-col justify-center min-h-[140px] sm:min-h-[164px] p-4 sm:p-6">
          <div className="max-w-[70%] sm:max-w-[60%]">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/85 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest text-hotpink border border-white/60">
              <Sparkles className="h-3 w-3" strokeWidth={2.2} /> Diet
            </span>
            <h1 className="mt-1.5 animate-fade-in font-script text-3xl sm:text-5xl text-white leading-none" style={{ animationDelay: "0ms", textShadow: "0 2px 8px rgba(0,0,0,0.28)" }}>
              Let's set up your Diet
            </h1>
            <p className="animate-fade-in mt-1 text-xs sm:text-sm font-medium text-white/95 leading-snug" style={{ animationDelay: "200ms", textShadow: "0 1px 6px rgba(0,0,0,0.35)" }}>
              One little step at a time — takes under a minute ✿
            </p>
          </div>
        </div>
      </div>

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
            <SetupNumber key={`w-${squeeze}`} label="Weight" unit="kg" value={weight} onChange={setWeight} placeholder="65" autoFocus error={bodyErr.weight && !(wKg > 0)} />
            <div className="flex gap-2.5">
              <SetupNumber key={`h-${squeeze}`} label="Height" unit="cm" value={height} onChange={setHeight} placeholder="165" error={bodyErr.height && !(parseFloat(height) > 0)} />
              <SetupNumber key={`a-${squeeze}`} label="Age" unit="yr" value={age} onChange={setAge} placeholder="30" error={bodyErr.age && !(parseInt(age, 10) > 0)} />
            </div>
            {/* Important-info notice — these details drive the precision of everything */}
            <div className="flex items-start gap-2 rounded-2xl border border-hotpink/30 bg-blush/50 px-3 py-2.5">
              <Info className="h-4 w-4 shrink-0 mt-0.5 text-hotpink" strokeWidth={2} />
              <p className="text-[11.5px] text-rose/80 leading-snug">
                <b className="text-hotpink">Important — please fill all three.</b> Your weight, height &amp; age power the precision of your calorie target, energy balance &amp; weight projections. The more accurate, the better your plan fits you.
              </p>
            </div>
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
            className="flex-1 justify-center"
            onClick={handleNext}
          >
            {isLast ? <>Save &amp; start blooming <Sparkles className="h-4 w-4" /></> : <>Continue <ChevronRight className="h-4 w-4" /></>}
          </PinkBtn>
        </div>
      </Glass>
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
        <defs>
          <linearGradient id="weight-area" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#F472B6" stopOpacity="0.32" />
            <stop offset="1" stopColor="#FCE7F3" stopOpacity="0.04" />
          </linearGradient>
        </defs>
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

        {/* Soft pink area under the weight line (real → projection) */}
        {(() => {
          const baseY = h - padB;
          const endX = hasProj ? X(lastDay + projDays) : X(lastDay);
          const endY = hasProj ? Y(projEndKg) : Y(lastReal.kg);
          const area = `M ${X(dayOf(history[0].date)).toFixed(1)} ${baseY} ` +
            history.map((r) => `L ${X(dayOf(r.date)).toFixed(1)} ${Y(r.kg).toFixed(1)}`).join(" ") +
            (hasProj ? ` L ${endX.toFixed(1)} ${endY.toFixed(1)}` : "") +
            ` L ${endX.toFixed(1)} ${baseY} Z`;
          return <path d={area} fill="url(#weight-area)" stroke="none" />;
        })()}
        {/* Goal line — soft pink dotted */}
        {target != null && (
          <>
            <line x1={padL} y1={Y(target)} x2={w - padR} y2={Y(target)} stroke="#F472B6" strokeWidth="1.4" strokeDasharray="4 3" opacity={0.9} />
            <text x={w - padR} y={Y(target) + (Y(target) > Y(lastReal.kg) ? 12 : -5)} fontSize="9" fontWeight="800" fill="#DB2777" textAnchor="end">🎯 goal {target}kg</text>
          </>
        )}
        {/* Projected pace — dashed pink line to a hollow endpoint */}
        {hasProj && (
          <path d={`M ${X(lastDay)} ${Y(lastReal.kg)} L ${X(lastDay + projDays)} ${Y(projEndKg)}`} fill="none" stroke="#EC4899" strokeWidth="2" strokeDasharray="5 4" strokeLinecap="round" opacity={0.85} />
        )}
        <path d={realD} fill="none" stroke="#EC4899" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        {history.map((r, i) => <circle key={i} cx={X(dayOf(r.date))} cy={Y(r.kg)} r="2.6" fill="#EC4899" />)}
        {hasProj && (
          <circle cx={X(lastDay + projDays)} cy={Y(projEndKg)} r="4" fill="#fff" stroke="#DB2777" strokeWidth="1.6" strokeDasharray="2 2" />
        )}
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

function ProfileTab({ phase, cycleDay, profile, mealsVersion, setProfile, onEdit, goTo, onReplayTour, cycleReady, onSyncedPlan, onDietToday, onDietWeek, onPlanMeals, onPlanMovement, onUnplanMeals, onUnplanMovement, onSyncCycle }: {
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
  onPlanMeals: () => void;
  onPlanMovement: () => void;
  onUnplanMeals: () => void;
  onUnplanMovement: () => void;
  onSyncCycle: () => void;
}) {
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
  // Eating-plan quick-edit popup, opened from the "Edit plan" button on Today's fuel.
  const [eatPlanOpen, setEatPlanOpen] = useState(false);
  // Confirmation feedback after logging — so she clearly sees it saved.
  const [logged, setLogged] = useState<number | null>(null);
  useEffect(() => { if (logged == null) return; const t = setTimeout(() => setLogged(null), 2800); return () => clearTimeout(t); }, [logged]);
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
    setLogged(kg); // trigger the "✓ Saved" confirmation
  };
  const first = history[0]?.kg ?? profile.weight;
  const latest = history.length ? history[history.length - 1].kg : profile.weight;
  // Has she already logged TODAY? Drives the button's resting state — a soft
  // "Weight logged" once done, flipping back to the "Log today" CTA tomorrow.
  const todayLogged = history.some((e) => e.date === todayISO());
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

  // What the user has already set up — drives the checked/unchecked CTAs.
  const mealsPlanned = useMemo(
    () => Object.values(readMealPlan()).some((day) => Object.values(day).some(Boolean)),
    [mealsVersion],
  );
  const movementPlanned = readWorkoutPlanDays().length > 0 || readYogaPlanDays().length > 0;
  // Did Diet create/sync this meal plan? If not, it's the user's own Meals
  // Planner week — protected from Diet's un-plan, offered a "Sync" instead.
  // Recomputed each render (mealsVersion / trainTick drive re-renders).
  const mealsFromDiet = mealsPlanned && (() => { try { return !!localStorage.getItem("bloom:meals-from-diet"); } catch { return false; } })();
  // Same ownership rule for movement: only a goal-tuned plan Diet set up (goal
  // marker still present) can be un-planned from here; a plan the user built in
  // the Workout/Yoga tool is protected.
  const movementFromDiet = movementPlanned && (() => { try { return !!(localStorage.getItem("bloom:yoga-plan-goal") || localStorage.getItem("bloom:workout-plan-goal")); } catch { return false; } })();
  // Step 2 state — has she synced the goal plan to her cycle phase?
  const mealsSynced = useMemo(() => { try { return localStorage.getItem("bloom:meals-phase-synced") === "1"; } catch { return false; } }, [mealsVersion]);
  const movementSynced = useMemo(() => { try { return localStorage.getItem("bloom:movement-phase-synced") === "1"; } catch { return false; } }, [mealsVersion]);
  const phaseLabel = ({ menstrual: "period", follicular: "follicular", ovulatory: "ovulation", luteal: "luteal" } as Record<DietPhase, string>)[phase];

  return (
    <div className="space-y-4">
      {/* ── Daily command center — the real energy engine (target / eaten / burned,
             macros, goal timeline). Bloom+; free sees a teaser. ── */}
      <PlusLock feature="diet" title="Your energy engine" blurb="Your real daily target, macros, eat-back & goal timeline." minH="min-h-[240px]">
        <div className="space-y-4">
          <EnergyTodayCard
            e={energy}
            mealsPlanned={mealsPlanned}
            mealsFromDiet={mealsFromDiet}
            movementPlanned={movementPlanned}
            movementFromDiet={movementFromDiet}
            mealsSynced={mealsSynced}
            movementSynced={movementSynced}
            phaseLabel={phaseLabel}
            cycleReady={cycleReady}
            onPlanMeals={onPlanMeals}
            onPlanMovement={onPlanMovement}
            onUnplanMeals={onUnplanMeals}
            onUnplanMovement={onUnplanMovement}
            onSyncCycle={onSyncCycle}
            onViewTodayPlan={() => goTo("today")}
            onEditPlan={() => setEatPlanOpen(true)}
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <div id="diet-goalpath"><GoalPathCard onEdit={() => setBodyEditOpen(true)} /></div>
            <WeekBalanceCard />
          </div>
        </div>
      </PlusLock>
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
          <div className="flex items-start justify-between gap-2 mb-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-hotpink/10 text-hotpink"><BookOpen className="h-5 w-5" /></span>
              <div className="min-w-0">
                <p className="font-script text-2xl text-hotpink leading-none">Weight &amp; Progress</p>
                <p className="text-[11.5px] text-rose/65 leading-snug mt-1">Track your journey, see your progress</p>
              </div>
            </div>
            <div className="flex shrink-0 flex-col items-end gap-1.5">
              <button onClick={() => document.getElementById("diet-goalpath")?.scrollIntoView({ behavior: "smooth", block: "start" })} className="inline-flex items-center gap-1 rounded-full bg-white border border-hotpink/30 text-hotpink px-3 py-1.5 text-[11px] font-bold active:scale-95 transition"><BarChart3 className="h-3.5 w-3.5" /> View Insights</button>
              {history.length > 1 && (
                <span className={["inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10.5px] font-bold", delta < 0 ? "bg-emerald-50 text-emerald-600" : delta > 0 ? "bg-rose-50 text-rose-600" : "bg-blush text-rose/70"].join(" ")}>
                  {delta < 0 ? <TrendingDown className="h-3 w-3" /> : delta > 0 ? <TrendingUp className="h-3 w-3" /> : <Minus className="h-3 w-3" />}
                  {delta > 0 ? "+" : ""}{delta} kg
                </span>
              )}
            </div>
          </div>
          <p className="mb-2 text-[11px] text-rose/55 leading-snug">Log it daily — the dashed line projects the pace your calorie plan actually produces. Set your goal weight from <b className="text-hotpink">your goal path</b> above.</p>
          <WeightChart history={history} target={target} projection={weightProjection} />
          <div className="mt-3 flex items-center gap-2">
            <div className="flex-1 flex items-center rounded-full bg-white border border-petal/60 overflow-hidden">
              <button onClick={() => setWeightInput((w) => (Math.max(0, (parseFloat(w) || 0) - 0.1)).toFixed(1))} className="px-3.5 py-2 text-hotpink font-bold">−</button>
              <input value={weightInput} onChange={(e) => setWeightInput(e.target.value.replace(/[^\d.]/g, ""))} inputMode="decimal" className="flex-1 min-w-0 text-center text-sm font-bold text-rose outline-none" />
              <span className="pr-1 text-[11px] font-bold text-rose/50">kg</span>
              <button onClick={() => setWeightInput((w) => ((parseFloat(w) || 0) + 0.1).toFixed(1))} className="px-3.5 py-2 text-hotpink font-bold">+</button>
            </div>
            {/* Three states: a fresh "Saved!" flash, a soft resting "Weight
                logged" once today is done (tap to update), or the active "Log
                today" CTA when today isn't logged yet (returns tomorrow). */}
            <button
              onClick={logWeight}
              title={todayLogged ? "Update today's weight" : "Log today's weight"}
              className={[
                "inline-flex items-center justify-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-full transition active:scale-95",
                logged != null
                  ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/30 animate-selected-glow"
                  : todayLogged
                    ? "bg-emerald-50 text-emerald-600 border border-emerald-200"
                    : "bloom-luxury-btn text-white",
              ].join(" ")}
            >
              {logged != null ? (
                <><span className="grid h-4 w-4 place-items-center rounded-full bg-white/25"><Check className="h-3 w-3" strokeWidth={3.5} /></span> Saved!</>
              ) : todayLogged ? (
                <><span className="grid h-4 w-4 place-items-center rounded-full bg-emerald-500 text-white"><Check className="h-3 w-3" strokeWidth={3.5} /></span> Weight logged</>
              ) : (
                <><Check className="h-4 w-4" /> Log today</>
              )}
            </button>
          </div>
          {/* Confirmation line — a fresh "Saved" flash, or a calm "already logged" note */}
          {logged != null ? (
            <p className="mt-2 flex items-center gap-1.5 text-[11.5px] font-bold text-emerald-600 animate-fade-in">
              <Sparkles className="h-3.5 w-3.5 shrink-0" strokeWidth={2} /> Saved <b className="tabular-nums">{logged} kg</b> for today — your graph &amp; trend just updated ✿
            </p>
          ) : todayLogged ? (
            <p className="mt-2 flex items-center gap-1.5 text-[11px] text-rose/55 leading-snug">
              <Check className="h-3.5 w-3.5 shrink-0 text-emerald-500" strokeWidth={3} /> Today's weight is logged. Change the number above to update it.
            </p>
          ) : null}
          {/* Motivational footer — matches the reference design */}
          <div className="relative mt-3 overflow-hidden rounded-2xl border border-petal/50 bg-gradient-to-r from-blush/60 to-petal/30 p-3 pr-14">
            <div className="flex items-start gap-2">
              <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-white/80 text-hotpink shadow-sm"><Sparkles className="h-3.5 w-3.5" strokeWidth={2} /></span>
              <div>
                <p className="text-[12.5px] font-bold text-hotpink leading-tight">Stay consistent and trust the process.</p>
                <p className="text-[11px] text-rose/70 leading-tight">Small steps = Big change <span className="text-hotpink">♥</span></p>
              </div>
            </div>
            <img src="/images/landing-orb-flower.webp" alt="" aria-hidden className="pointer-events-none absolute -bottom-3 -right-3 h-16 w-16 object-contain opacity-90" />
          </div>
        </Glass>
      </div>

      {eatPlanOpen && (
        <EatingPlanEditModal profile={profile} setProfile={setProfile} onClose={() => setEatPlanOpen(false)} />
      )}

      <div className="flex items-center justify-center gap-4 pt-1">
        <button onClick={onEdit} className="text-xs font-semibold text-rose/60 hover:text-hotpink">Edit my diet setup ✿</button>
        <span className="text-rose/30">·</span>
        <button onClick={onReplayTour} className="text-xs font-semibold text-rose/60 hover:text-hotpink">Replay tour</button>
      </div>
    </div>
  );
}

/** A soft, un-numbered section header for the coach flow. */
function CoachHeader({ title, sub }: { title: string; sub: string }) {
  return (
    <div className="mb-2.5 mt-1">
      <h2 className="font-script text-[1.7rem] sm:text-3xl text-hotpink leading-none">{title}</h2>
      <p className="mt-0.5 text-[12px] text-rose/55 leading-tight">{sub}</p>
    </div>
  );
}

/** Free phase-nutrition card — the education layer (eat / ease-up) everyone gets. */
function FreePhaseNutrition({ coach }: { coach: ReturnType<typeof buildDayCoach> }) {
  return (
    <div className="rounded-[1.6rem] border border-petal/60 bg-white/90 backdrop-blur p-4 sm:p-5 animate-card-pop-in">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="font-script text-2xl text-hotpink leading-none">{coach.phaseLabel} phase</p>
          <p className="mt-0.5 text-[11px] font-semibold text-rose/60">Day {coach.cycleDay} of your cycle</p>
        </div>
        <span className="shrink-0 rounded-full bg-hotpink/10 text-hotpink text-[10px] font-bold uppercase tracking-wide px-2.5 py-1">Today</span>
      </div>
      <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wide text-rose/55">Eat more</p>
          <div className="mt-1 flex flex-wrap gap-1">
            {coach.eat.slice(0, 5).map((f) => <span key={f} className="rounded-full bg-blush px-2 py-0.5 text-[11px] font-semibold text-magenta border border-petal/50">{f}</span>)}
          </div>
        </div>
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wide text-rose/55">Ease up on</p>
          <div className="mt-1 flex flex-wrap gap-1">
            {coach.avoid.slice(0, 4).map((f) => <span key={f} className="rounded-full bg-white px-2 py-0.5 text-[11px] font-semibold text-rose/65 border border-petal/60">{f}</span>)}
          </div>
        </div>
      </div>
    </div>
  );
}

function CycleNutritionTab({ cycleReady, onOpenRecipe }: { cycleReady: boolean; onOpenRecipe: (recipeId: string) => void }) {
  // One source of truth for the whole emotional-coach layer.
  const coach = useMemo(() => buildDayCoach(), []);
  const phaseReads = useMemo(() => readsForPhase(coach.phase), [coach.phase]);
  const premium = usePremium();

  return (
    <div className="space-y-6">
      {/* Your coach today: energy · what you need · eat/avoid · treat · your moment.
          Free gets the eat/ease-up education + a locked coach teaser; Bloom+ the
          full coach card. */}
      <div id="diet-cycle">
        <CoachHeader title="Your coach today" sub="how you feel, what you need, one little joy" />
        {cycleReady ? (
          premium ? (
            <CoachTodayCard coach={coach} onOpenRecipe={onOpenRecipe} />
          ) : (
            <div className="space-y-3">
              <FreePhaseNutrition coach={coach} />
              <PlusLock feature="coach" title="Your daily coach" blurb="Your energy read, a little treat & your moment — all synced to today." minH="min-h-[190px]" />
            </div>
          )
        ) : (
          <a href="/app/tools/cycle" className="block rounded-[1.5rem] border border-hotpink/30 bg-white/85 p-5 text-center animate-card-pop-in">
            <p className="font-script text-2xl text-hotpink">Set up your cycle ✿</p>
            <p className="mt-1 text-sm text-rose/70">Then your coach greets you every day — your energy, your foods, your moment.</p>
          </a>
        )}
      </div>

      {/* Tomorrow with Bloomzein — the single "what's ahead" hook, made curious */}
      {cycleReady && <TomorrowCard coach={coach} />}

      {/* Reads tuned to your phase (one clear title, carousel below) */}
      {cycleReady && phaseReads.length > 0 && (
        <div>
          <CoachHeader title={`Reads for your ${coach.phaseLabel} phase`} sub={`chosen for how you feel today · Day ${coach.cycleDay}`} />
          <PhaseReads reads={phaseReads} />
        </div>
      )}
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

const MEAL_SLOT_FALLBACK: Record<string, string> = {
  breakfast: "/images/meal-oats.webp", lunch: "/images/meal-buddha.webp",
  dinner: "/images/meal-stew.webp", snack: "/images/meal-buddha.webp", lunchbox: "/images/meal-lunchbox.webp",
};
function mealSlotPhoto(type: string, r?: Recipe): string {
  if (r) return recipeImageSrc(r);
  return MEAL_SLOT_FALLBACK[type] ?? "/images/meal-buddha.webp";
}

function MealSlot({
  type, meal, onAddRecipe, onRemove, onOpen, candidates,
}: {
  type: MealType; meal: LoggedMeal | null;
  onAddRecipe: (r: Recipe) => void; onRemove: () => void;
  onOpen: (r: Recipe, portion?: number) => void;
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
      {meal ? (() => {
        const r = meal.recipeId ? RECIPES.find((x) => x.id === meal.recipeId) : undefined;
        return (
          <div className="mt-1.5 flex items-center gap-3">
            {/* Tap the meal → open the full recipe, at its planned portion */}
            <button onClick={() => r && onOpen(r, portionFor(todayWeekday(), type as PlanSlot))} className="flex flex-1 items-center gap-3 text-left active:scale-[0.99] transition">
              <img
                src={mealSlotPhoto(type, r)}
                alt={meal.name}
                className="h-14 w-14 shrink-0 rounded-xl object-cover border border-petal/60"
                onError={(e) => { (e.currentTarget as HTMLImageElement).src = MEAL_SLOT_FALLBACK[type] ?? "/images/meal-buddha.webp"; }}
              />
              <div className="min-w-0">
                <p className="text-sm font-bold text-magenta leading-snug line-clamp-2">{meal.name}</p>
                <p className="text-[11px] text-rose/70 mt-0.5">{fmtMacroLine(meal.macros)}</p>
                <p className="text-[10px] font-bold text-hotpink/70 mt-0.5">Tap for recipe →</p>
              </div>
            </button>
            <button onClick={onRemove} className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-blush text-hotpink">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        );
      })() : searching ? (
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
  phase, cycleDay, profile, dayMeals, onSetSlot, onOpenRecipe,
}: {
  phase: DietPhase; cycleDay: number; profile: DietProfile & { weight: number };
  dayMeals: DayMeals;
  onSetSlot: (slot: MealType, recipe: Recipe | null) => void;
  onOpenRecipe: (r: Recipe, portion?: number) => void;
}) {
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

  // Macros = today's PLANNED meals — planning your day fills the rings,
  // matching the energy card (no separate "ate it" gating).
  const consumed = useMemo(() => {
    const meals = Object.values(dayMeals).filter(Boolean) as LoggedMeal[];
    return meals.reduce(
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
  }, [dayMeals]);

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
      {/* Macro rings — real targets are Bloom+; free sees a teaser. */}
      <PlusLock feature="diet" title="Your macro targets" blurb="Calories, protein, carbs & fat — tracked against your real daily goal." minH="min-h-[190px]">
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
      </PlusLock>

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
              onAddRecipe={(r) => assignMeal(type, r)}
              onRemove={() => onSetSlot(type, null)}
              onOpen={onOpenRecipe}
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
}: { phase: DietPhase; profile: DietProfile; onOpenRecipe: (r: Recipe, portion?: number) => void }) {
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
  // Deep-link: /app/tools/diet?tab=cycle opens straight on that tab (e.g. from
  // the Today page's "Full plan" link → Cycle Nutrition).
  useEffect(() => {
    try {
      const t = new URLSearchParams(window.location.search).get("tab");
      if (t === "profile" || t === "cycle" || t === "today" || t === "recipes") setTab(t);
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [editingSetup, setEditingSetup] = useState(false);
  const [openRecipe, setOpenRecipe] = useState<{ recipe: Recipe; portion: number } | null>(null);
  // Open a recipe, optionally at its planned portion so macros & ingredient
  // amounts show what the plan actually serves.
  const openRecipeAt = (r: Recipe, portion = 1) => setOpenRecipe({ recipe: r, portion });
  // Today's meals ARE the one shared weekly plan (bloom:meals-plan). We mirror
  // it in state and re-read after every write so edits here == the Planner.
  const [todayPlan, setTodayPlan] = useState(() => readTodayPlannedDay());
  const [eatenSlots, setEatenSlots] = useState<PlanSlot[]>(() => readEatenToday());
  const [mealsVersion, setMealsVersion] = useState(0);
  const refreshMeals = () => { setTodayPlan(readTodayPlannedDay()); setMealsVersion((v) => v + 1); };
  const [onboarded, setOnboarded] = useLS<boolean>(LS.onboarded, false);
  const [replayTour, setReplayTour] = useState(false);
  const tabsRef = useRef<HTMLDivElement>(null);
  // Guided setup: after she sets her goal, celebrate with her kcal target and
  // offer to sync her already-planned meals to it, then hand back to Today.
  const [guidedGoalKcal, setGuidedGoalKcal] = useState<number | null>(null);
  const [guidedSynced, setGuidedSynced] = useState(false);

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
    // Guided flow → celebrate her goal + energy target, then continue on Today.
    if (isGuided()) {
      // Persist the new profile synchronously so computeTargets reads it now.
      try { localStorage.setItem(LS.profile, JSON.stringify(p)); } catch {}
      let kcal: number | null = null;
      try { kcal = computeTargets(false).calories; } catch {}
      setGuidedSynced(false);
      setGuidedGoalKcal(kcal ?? 0);
    }
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

  // Plan IMPLICITLY from the Diet CTAs — build the plan in the background (no
  // navigation) so the CTA flips to checked; only its 'View' link navigates.
  const planMealsImplicit = () => {
    const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    const slots = ["breakfast", "lunch", "dinner", "snack"] as const;
    const target = computeTargets(true).calories;
    days.forEach((d, di) => slots.forEach((slot, si) => {
      const cands = RECIPES.filter((r) => r.mealType === slot && passesMyRules(r, profile));
      if (!cands.length) return;
      // Calorie-aware: among candidates, prefer the one closest to this slot's
      // budget (so a build goal lands on denser dishes), varied by day index.
      const budget = slotBudget(target, slot);
      const byFit = [...cands].sort((a, b) => Math.abs(a.macros.calories - budget) - Math.abs(b.macros.calories - budget));
      const pick = byFit[(di + si) % Math.min(byFit.length, 4)] ?? byFit[0];
      addRecipeToMealPlan(pick.id, d, slot);
      setMealPortion(d, slot as PlanSlot, portionForRecipe(pick.macros.calories || 0, slot, target));
    }));
    try {
      localStorage.setItem("bloom:meals-from-diet", dietRegimeInfo(profile.regime ?? "balanced").label);
      localStorage.setItem("bloom:meals-plan-goal", profile.goal); // goal-tuned marker
      localStorage.removeItem("bloom:meals-phase-synced"); // a fresh goal plan isn't phase-synced yet
    } catch {}
    refreshMeals();
  };
  const planMovementImplicit = () => {
    const phase = readCyclePhase() ?? "any";
    // Yoga: 2 phase-appropriate weekend sessions (never clash with workout days)
    // so "movement" always covers BOTH a workout and a yoga plan.
    const yogaFocus = phase === "period" ? "Cycle sync"
      : phase === "follicular" ? "Morning energy"
      : phase === "ovulation" || phase === "fertile" ? "Strength"
      : phase === "luteal" ? "Stress relief" : "Stress relief";
    const yogaSchedule: Record<string, string | null> = {
      Mon: null, Tue: null, Wed: null, Thu: null, Fri: null, Sat: yogaFocus, Sun: yogaFocus,
    };
    try {
      localStorage.setItem("bloom:yoga-schedule", JSON.stringify(yogaSchedule));
      // Mark BOTH plans as goal-tuned (from Diet) so each tool shows the badge
      // and never calls it a plain 'freestyle' week. Only mark the workout when
      // there's no existing plan (autoplan will freshly generate it).
      localStorage.setItem("bloom:yoga-plan-goal", profile.goal);
      if (!localStorage.getItem("bloom:workout-program") && !localStorage.getItem("bloom:workout-active-program")) {
        localStorage.setItem("bloom:workout-plan-goal", profile.goal);
      }
      // Workout: arm autoplan so that WHEN she opens the Workout tool (via its
      // own CTA) it auto-generates a goal-fit week from her chosen setup.
      localStorage.setItem("bloom:workout-autoplan", "1");
      localStorage.removeItem("bloom:movement-phase-synced"); // fresh goal plan; step 2 re-syncs

      window.dispatchEvent(new Event("storage"));
    } catch {}
    // Stay on My Diet — planning is implicit (the CTA flips to "Movement
    // planned" + shows View links). Opening a tool is only ever the user
    // tapping the Workout or Yoga CTA, never an automatic redirect.
  };

  // Step 2 of the setup magic: re-tune the already-planned week to her PHASE —
  // prefer phase-appropriate recipes (keeping the goal's calorie-awareness) and
  // re-run the phase-matched movement. Sets the "synced" markers step 2 reads.
  const syncWeekToPhase = () => {
    const cyclePhase = mapCyclePhase(readCyclePhase());
    const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    const slots = ["breakfast", "lunch", "dinner", "snack"] as const;
    const target = computeTargets(true).calories;
    days.forEach((d, di) => slots.forEach((slot, si) => {
      const phaseCands = RECIPES.filter((r) => r.mealType === slot && r.phases.includes(cyclePhase) && passesMyRules(r, profile));
      const cands = phaseCands.length ? phaseCands : RECIPES.filter((r) => r.mealType === slot && passesMyRules(r, profile));
      if (!cands.length) return;
      const budget = slotBudget(target, slot);
      const byFit = [...cands].sort((a, b) => Math.abs(a.macros.calories - budget) - Math.abs(b.macros.calories - budget));
      const pick = byFit[(di + si) % Math.min(byFit.length, 4)] ?? byFit[0];
      addRecipeToMealPlan(pick.id, d, slot);
      setMealPortion(d, slot as PlanSlot, portionForRecipe(pick.macros.calories || 0, slot, target));
    }));
    planMovementImplicit();
    try {
      localStorage.setItem("bloom:meals-from-diet", dietRegimeInfo(profile.regime ?? "balanced").label);
      localStorage.setItem("bloom:meals-plan-goal", profile.goal);
      localStorage.setItem("bloom:meals-phase-synced", "1");
      localStorage.setItem("bloom:movement-phase-synced", "1");
    } catch {}
    refreshMeals();
  };

  // Toggle the setup CTAs back OFF — un-plan meals / movement so the user can
  // start fresh without opening a tool. Un-planning also clears the phase-sync.
  const unplanMealsImplicit = () => { clearMealPlan(); try { localStorage.removeItem("bloom:meals-phase-synced"); } catch {} refreshMeals(); };
  const unplanMovementImplicit = () => { clearMovementPlan(); try { localStorage.removeItem("bloom:movement-phase-synced"); } catch {} };

  // Reset the DIET tool only. Diet must never wipe plans the user built in the
  // Meals / Workout / Yoga tools — those are theirs. So we clear Diet's own keys
  // and un-plan ONLY what Diet itself created (meal plan with the from-diet
  // marker, movement with the goal marker). User-owned plans survive the reset.
  const onReset = async () => {
    resetToolState("diet");
    try {
      if (localStorage.getItem("bloom:meals-from-diet")) clearMealPlan();
      localStorage.removeItem("bloom:diet-eaten");
    } catch {}
    clearMovementPlan(); // marker-gated: only clears the goal-tuned yoga/workout
    try { await flushCloudSync(); } catch {}
    window.location.reload();
  };

  if (!setupComplete || editingSetup) {
    return <SetupScreen initial={profile} onDone={handleSetupDone} />;
  }

  const showTour = tab === "profile" && (!onboarded || replayTour);

  return (
    <div className="relative animate-fade-in max-w-full overflow-x-hidden">
      {showTour && !isGuided() && (
        <SparkleOnboarding
          steps={DIET_TOUR_STEPS}
          content={DIET_TOUR_CONTENT}
          onDone={() => { setOnboarded(true); setReplayTour(false); }}
        />
      )}

      {guidedGoalKcal !== null && (
        <SpotlightCoach
          targetId="diet-energy"
          step={3} total={5}
          title="Your goal is set ✿"
          message={`Your daily energy: about ${guidedGoalKcal.toLocaleString()} kcal — everything tunes to it now.`}
          extra={
            <div className="mt-3 space-y-3">
              {hasMealPlan() && (
                <div>
                  {/* Clarify exactly what this button does before she taps it */}
                  <p className="text-[11.5px] font-semibold leading-snug text-rose/75">
                    Do you want to sync your goal to the meals you've <b className="text-hotpink">already planned</b>?
                  </p>
                  <button
                    onClick={() => { if (!guidedSynced) { planMealsImplicit(); setGuidedSynced(true); } }}
                    className={["mt-1.5 inline-flex w-full items-center justify-center gap-1.5 rounded-full py-2.5 text-[13px] font-bold transition active:scale-95",
                      guidedSynced ? "bg-emerald-100 text-emerald-700" : "bg-white text-hotpink ring-2 ring-hotpink/60 animate-selected-glow"].join(" ")}
                  >
                    {guidedSynced
                      ? <><Check className="h-4 w-4" strokeWidth={3} /> Meals synced to your goal</>
                      : <><Sparkles className="h-4 w-4" strokeWidth={2} /> Sync my meals to this goal</>}
                  </button>
                </div>
              )}
              {/* Clarify the primary CTA below (SpotlightCoach renders it next) */}
              <p className="text-[11.5px] font-semibold leading-snug text-rose/75">
                Or simply carry on and set up the rest of your day on Today ↓
              </p>
            </div>
          }
          primaryLabel="Continue to set up Today"
          onPrimary={() => { window.location.href = "/app/today"; }}
          secondaryLabel="Stay in Diet"
          onClose={() => setGuidedGoalKcal(null)}
        />
      )}

      <BloomBubbles count={10} />

      {/* HERO — full-bleed blended photo background, same technique as Today/Tools */}
      <div className="relative isolate min-h-[150px] sm:min-h-[176px] -mt-3 sm:-mt-5 lg:-mt-6 mb-4 animate-card-pop-in">
        {/* base pink wash */}
        <div aria-hidden className="pointer-events-none absolute left-1/2 -translate-x-1/2 w-screen -top-8 -z-20 h-[540px] bg-gradient-to-b from-[#FFD3E8] via-[#FFE4F1] to-transparent" />
        {/* photo — dissolves toward the bottom into the page */}
        <div
          aria-hidden
          className="pointer-events-none absolute left-1/2 -translate-x-1/2 w-screen -top-8 -z-10 h-[440px] overflow-hidden"
          style={{ WebkitMaskImage: "linear-gradient(to bottom, #000 0%, #000 45%, transparent 100%)", maskImage: "linear-gradient(to bottom, #000 0%, #000 45%, transparent 100%)" }}
        >
          <img src="/images/meal-oats.webp" alt="" className="animate-hero-breathe h-full w-full object-cover object-[72%_38%]" referrerPolicy="no-referrer" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#FFE4F1] via-[#FFE4F1]/55 to-transparent" />
        </div>

        {/* Reset — preview the brand-new-user experience */}
        <button
          onClick={onReset}
          title="Reset (preview first-time setup)"
          className="absolute top-1 right-1 z-[2] inline-flex items-center gap-1 rounded-full bg-white/85 backdrop-blur px-2.5 py-1 text-[10px] font-bold text-hotpink border border-petal/60 shadow-sm active:scale-95 transition"
        >
          <RotateCcw className="h-3 w-3" /> Reset
        </button>

        {/* content */}
        <div className="relative z-[1] flex flex-col gap-3 sm:gap-4 pt-1 pb-1">
          <div>
            <div className="max-w-[68%] sm:max-w-[58%] lg:max-w-[52%]">
              <h1 className="animate-fade-in font-script text-3xl sm:text-5xl lg:text-6xl text-hotpink leading-none drop-shadow-[0_2px_6px_oklch(1_0_0/0.55)]" style={{ animationDelay: "0ms" }}>
                {TAB_HERO[tab].title}
              </h1>
              <p className="animate-fade-in mt-0.5 font-script text-lg sm:text-2xl text-rose/90 leading-tight" style={{ animationDelay: "200ms" }}>
                {TAB_HERO[tab].subtitle}
              </p>
            </div>
            <CyclePhasePill className="mt-1.5" />
          </div>
          {/* Tab pills — light glass over the soft hero */}
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
                        : "bg-white/70 backdrop-blur border border-petal/60 text-rose hover:bg-white",
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
            onPlanMeals={planMealsImplicit} onPlanMovement={planMovementImplicit}
            onUnplanMeals={unplanMealsImplicit} onUnplanMovement={unplanMovementImplicit}
            onSyncCycle={syncWeekToPhase}
          />
        )}
        {tab === "cycle" && (
          <CycleNutritionTab cycleReady={cycleReady} onOpenRecipe={(id) => { const r = RECIPES.find((x) => x.id === id); if (r) openRecipeAt(r); }} />
        )}
        {tab === "today" && (
          <TodayTab phase={cyclePhase} cycleDay={cycleDay} profile={profile} dayMeals={dayMeals} onSetSlot={onSetSlot} onOpenRecipe={openRecipeAt} />
        )}
        {tab === "recipes" && <RecipesTab phase={cyclePhase} profile={profile} onOpenRecipe={openRecipeAt} />}
      </div>

      {openRecipe && <RecipeModal recipe={openRecipe.recipe} portion={openRecipe.portion} onClose={() => setOpenRecipe(null)} onAddToPlan={addToPlan} />}
    </div>
  );
}
