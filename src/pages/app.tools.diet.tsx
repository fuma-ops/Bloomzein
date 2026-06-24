import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft, Search, X, Plus, Clock, Flame, Dumbbell, Sparkles,
  ChevronRight, Pencil, Check, Moon, UtensilsCrossed, BookOpen,
} from "lucide-react";
import { CuteDatePicker } from "@/components/bloom/CuteDatePicker";
import { readCyclePhase, readCycleSettings, type CyclePhase } from "@/components/bloom/cyclePhase";
import { WORKOUT_LOG_KEY, type HistoryEntry } from "@/pages/app.tools.workout";
import {
  RECIPES, PHASE_INFO, PHASE_MICROS, calculateDailyTargets, passesMyRules,
  type Recipe, type DietProfile, type DietPhase, type DietGoal, type MealType,
  type DietType, type Allergy, type CookingFrequency,
} from "@/components/bloom/diet/data";

/* ---------- localStorage ---------- */

const LS = {
  profile: "bloom:diet-profile",
  setup: "bloom:diet-setup-complete",
  tab: "bloom:diet-tab",
  todayMeals: "bloom:diet-today-meals",
  dismissedPW: "bloom:diet-dismissed-pw",
  meGoal: "bloom:me-goal", // shared, bidirectional with Me page
};

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
  allergies: [],
  cookingFrequency: "normal",
  weight: 65,
};

/* ---------- shared helpers ---------- */

function todayISO() { return new Date().toISOString().slice(0, 10); }

/** Maps the app-wide cycle phase to the Diet Tool's 4-phase model. */
function mapCyclePhase(p: CyclePhase | null): DietPhase {
  switch (p) {
    case "period": return "menstrual";
    case "follicular": return "follicular";
    case "fertile": return "ovulatory";
    case "ovulation": return "ovulatory";
    case "luteal": return "luteal";
    default: return "follicular";
  }
}

/** Cycle day computed from the user's saved Cycle Tracker settings. */
function getCycleDay(): number {
  const s = readCycleSettings();
  const ms = 1000 * 60 * 60 * 24;
  const diff = Math.floor((Date.now() - s.lastPeriodStart.getTime()) / ms);
  const day = ((diff % s.cycleLength) + s.cycleLength) % s.cycleLength;
  return day + 1;
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
const EMPTY_DAY: DayMeals = { breakfast: null, lunch: null, dinner: null, snack: null };

const MEAL_LABELS: Record<MealType, string> = {
  breakfast: "Breakfast", lunch: "Lunch", dinner: "Dinner", snack: "Snack",
};

const PHASE_RING: Record<DietPhase, string> = {
  menstrual: "text-hotpink",
  follicular: "text-amber-500",
  ovulatory: "text-rose-500",
  luteal: "text-violet-500",
};

/* ---------- UI atoms ---------- */

function Glass({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-[1.5rem] bg-white/85 backdrop-blur border border-petal/60 shadow-lg shadow-rose/10 ${className}`}>
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

  return (
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
    </div>
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

function SetupScreen({
  initial, onDone,
}: { initial: DietProfile & { weight: number }; onDone: (p: DietProfile & { weight: number }) => void }) {
  const [goal, setGoal] = useState<DietGoal>(initial.goal);
  const [dietType, setDietType] = useState<DietType>(initial.dietType);
  const [allergies, setAllergies] = useState<Allergy[]>(initial.allergies);
  const [cooking, setCooking] = useState<CookingFrequency>(initial.cookingFrequency);

  const toggleAllergy = (a: Allergy) => {
    setAllergies((prev) => (prev.includes(a) ? prev.filter((x) => x !== a) : [...prev, a]));
  };

  return (
    <div className="relative animate-fade-in max-w-full overflow-x-hidden">
      <BloomBubbles count={8} />
      <a href="/app/tools" className="mb-3 inline-flex items-center gap-1 text-sm text-rose hover:text-hotpink">
        <ArrowLeft className="h-4 w-4" /> All tools
      </a>
      <header className="mb-4">
        <h1 className="font-script text-3xl sm:text-5xl lg:text-6xl text-hotpink leading-none">Diet Tool</h1>
        <p className="mt-0.5 sm:mt-1 text-xs sm:text-sm text-rose/80">a quick setup, just for you ✿</p>
      </header>

      <Glass className="p-4 sm:p-6 space-y-6">
        <div>
          <h2 className="font-script text-xl text-hotpink mb-2">Your goal</h2>
          <div className="flex flex-wrap gap-2">
            {GOAL_OPTIONS.map((o) => (
              <SelectPill key={o.key} active={goal === o.key} onClick={() => setGoal(o.key)}>{o.label}</SelectPill>
            ))}
          </div>
        </div>

        <div>
          <h2 className="font-script text-xl text-hotpink mb-2">Diet type</h2>
          <div className="flex flex-wrap gap-2">
            {DIET_TYPE_OPTIONS.map((o) => (
              <SelectPill key={o.key} active={dietType === o.key} onClick={() => setDietType(o.key)}>{o.label}</SelectPill>
            ))}
          </div>
        </div>

        <div>
          <h2 className="font-script text-xl text-hotpink mb-2">Allergies</h2>
          <div className="flex flex-wrap gap-2">
            {ALLERGY_OPTIONS.map((o) => (
              <SelectPill key={o.key} active={allergies.includes(o.key)} onClick={() => toggleAllergy(o.key)}>{o.label}</SelectPill>
            ))}
            <SelectPill active={allergies.length === 0} onClick={() => setAllergies([])}>None</SelectPill>
          </div>
        </div>

        <div>
          <h2 className="font-script text-xl text-hotpink mb-2">Cooking frequency</h2>
          <div className="flex flex-wrap gap-2">
            {COOKING_OPTIONS.map((o) => (
              <SelectPill key={o.key} active={cooking === o.key} onClick={() => setCooking(o.key)}>{o.label}</SelectPill>
            ))}
          </div>
        </div>

        <PinkBtn
          className="w-full justify-center"
          onClick={() => onDone({ goal, dietType, allergies, cookingFrequency: cooking, weight: initial.weight })}
        >
          Save & start blooming <Sparkles className="h-4 w-4" />
        </PinkBtn>
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

function CycleNutritionTab({
  phase, profile, onEdit,
}: { phase: DietPhase; profile: DietProfile; onEdit: () => void }) {
  const phases: DietPhase[] = ["menstrual", "follicular", "ovulatory", "luteal"];
  return (
    <div className="space-y-5">
      <div className="flex gap-3 overflow-x-auto no-scrollbar snap-x pb-1 sm:grid sm:grid-cols-2 sm:overflow-visible">
        {phases.map((p) => <PhaseCard key={p} phase={p} active={p === phase} />)}
      </div>

      <div className="px-1">
        <div className="flex items-center justify-between">
          <h3 className="font-script text-xl text-hotpink">My Rules</h3>
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
      </div>
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
  type, meal, onAddRecipe, onRemove, candidates,
}: {
  type: MealType; meal: LoggedMeal | null;
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

  return (
    <div className="p-3 sm:p-4">
      <p className="text-xs font-bold uppercase tracking-wide text-rose/60">{MEAL_LABELS[type]}</p>
      {meal ? (
        <div className="mt-1.5 flex items-start justify-between gap-2">
          <div>
            <p className="text-sm font-bold text-magenta">{meal.name}</p>
            <p className="text-xs text-rose/70">{fmtMacroLine(meal.macros)}</p>
          </div>
          <button onClick={onRemove} className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-blush text-hotpink">
            <X className="h-3.5 w-3.5" />
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
    </div>
  );
}

function TodayTab({
  phase, cycleDay, profile, dayMeals, setDayMeals,
}: {
  phase: DietPhase; cycleDay: number; profile: DietProfile & { weight: number };
  dayMeals: DayMeals; setDayMeals: (d: DayMeals | ((p: DayMeals) => DayMeals)) => void;
}) {
  const [dismissedPW, setDismissedPW] = useLS<Record<string, boolean>>(LS.dismissedPW, {});
  const [pwIndex, setPwIndex] = useState(0);

  const workoutToday = useMemo(() => {
    const history = loadWorkoutHistory();
    return history.find((h) => h.date === todayISO()) ?? null;
  }, []);

  const targets = useMemo(() => calculateDailyTargets({
    goal: profile.goal, phase, weight: profile.weight, caloriesBurned: workoutToday?.calories ?? 0,
  }), [profile.goal, profile.weight, phase, workoutToday]);

  const proteinBoostTarget = workoutToday ? Math.round(profile.weight * 1.8) : targets.protein;

  const consumed = useMemo(() => {
    return (Object.values(dayMeals).filter(Boolean) as LoggedMeal[]).reduce(
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
    setDayMeals((d) => ({ ...d, [type]: { name: r.name, recipeId: r.id, macros: r.macros, micros: r.micros } }));
  };

  const candidatesFor = (type: MealType): Recipe[] => {
    return [...RECIPES]
      .filter((r) => r.mealType === type && r.phases.includes(phase) && passesMyRules(r, profile))
      .sort((a, b) => Math.abs(a.macros.protein * 4 - targets.protein) - Math.abs(b.macros.protein * 4 - targets.protein));
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
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm font-bold text-magenta">{new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}</p>
          <p className="text-xs text-rose/60">Day {cycleDay} of your cycle</p>
        </div>
        <span className="rounded-full bg-hotpink/10 px-3 py-1 text-xs font-bold uppercase tracking-wide text-hotpink">{PHASE_INFO[phase].label}</span>
      </div>

      {/* Macro rings */}
      <div className="py-2">
        <div className="grid grid-cols-4 gap-2 sm:gap-4">
          <RingProgress value={consumed.calories} target={targets.calories} label="Calories" sub="" colorClass={ringColor} />
          <RingProgress value={consumed.protein} target={targets.protein} label="Protein" sub="g" colorClass={ringColor} />
          <RingProgress value={consumed.carbs} target={targets.carbs} label="Carbs" sub="g" colorClass={ringColor} />
          <RingProgress value={consumed.fat} target={targets.fat} label="Fat" sub="g" colorClass={ringColor} />
        </div>
      </div>

      {/* Micro bars */}
      <div className="space-y-3">
        <h3 className="font-script text-lg text-hotpink">For your phase</h3>
        {micros.map((m) => (
          <MicroBar key={m.key as string} label={m.label} value={consumed[m.key as keyof typeof consumed] ?? 0} target={m.target} unit={m.unit} />
        ))}
      </div>

      {/* Post-workout card */}
      {showPostWorkout && pwRecipe && workoutToday && (
        <div className="py-2">
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
        </div>
      )}

      {/* Meal slots */}
      <div className="grid gap-3 sm:grid-cols-2">
        {(["breakfast", "lunch", "dinner", "snack"] as MealType[]).map((type) => (
          <MealSlot
            key={type} type={type} meal={dayMeals[type]}
            onAddRecipe={(r) => assignMeal(type, r)}
            onRemove={() => setDayMeals((d) => ({ ...d, [type]: null }))}
            candidates={candidatesFor(type)}
          />
        ))}
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
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-rose/50" />
        <input
          value={query} onChange={(e) => setQuery(e.target.value)}
          placeholder="Search recipes or ingredients..."
          className="w-full rounded-full border border-petal/60 bg-white py-2.5 pl-10 pr-4 text-sm text-rose focus:outline-none focus:ring-2 focus:ring-hotpink/30"
        />
      </div>

      <div className="space-y-2">
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

      {!!pwRecipes.length && !filtersActive && (
        <div>
          <p className="font-script text-lg text-hotpink mb-2">🏋️ Post-workout recipes — high protein · phase matched</p>
          <div className="flex gap-3 overflow-x-auto no-scrollbar pb-1">
            {pwRecipes.map((r) => (
              <div key={r.id} className="w-40 shrink-0"><RecipeCard recipe={r} onOpen={() => onOpenRecipe(r)} /></div>
            ))}
          </div>
        </div>
      )}

      {filtersActive ? (
        <div>
          <p className="font-script text-lg text-hotpink mb-2">{filtered.length} recipe{filtered.length === 1 ? "" : "s"}</p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {filtered.map((r) => <RecipeCard key={r.id} recipe={r} onOpen={() => onOpenRecipe(r)} />)}
          </div>
          {filtered.length === 0 && <p className="text-sm text-rose/60">No recipes match — try fewer filters.</p>}
        </div>
      ) : (
        <>
          <div>
            <p className="font-script text-lg text-hotpink mb-2">For your phase today</p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {forYourPhase.map((r) => <RecipeCard key={r.id} recipe={r} onOpen={() => onOpenRecipe(r)} />)}
            </div>
          </div>
          <div>
            <p className="font-script text-lg text-hotpink mb-2">Quick this week</p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {quickThisWeek.map((r) => <RecipeCard key={r.id} recipe={r} onOpen={() => onOpenRecipe(r)} />)}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

/* ---------- Page ---------- */

type TabKey = "cycle" | "today" | "recipes";
const TABS: { key: TabKey; label: string; icon: React.ElementType }[] = [
  { key: "cycle", label: "Cycle Nutrition", icon: Moon },
  { key: "today", label: "Today",           icon: UtensilsCrossed },
  { key: "recipes", label: "Recipes",       icon: BookOpen },
];
const TAB_HERO: Record<TabKey, { title: string; subtitle: string }> = {
  cycle:   { title: "Cycle Nutrition",  subtitle: "eat in sync with your cycle ✿" },
  today:   { title: "Today's Meals",    subtitle: "nourish your bloom, one bite at a time 🌸" },
  recipes: { title: "Recipes",          subtitle: "cook for your phase, glow all season 💫" },
};

export default function DietPage() {
  const [setupComplete, setSetupComplete] = useLS<boolean>(LS.setup, false);
  const [profile, setProfile] = useLS<DietProfile & { weight: number }>(LS.profile, DEFAULT_PROFILE);
  const [tab, setTab] = useLS<TabKey>(LS.tab, "cycle");
  const [editingSetup, setEditingSetup] = useState(false);
  const [openRecipe, setOpenRecipe] = useState<Recipe | null>(null);
  const [allMeals, setAllMeals] = useLS<Record<string, DayMeals>>(LS.todayMeals, {});
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
    setTab("cycle");
    try { localStorage.setItem(LS.meGoal, p.goal); } catch {}
  };

  const today = todayISO();
  const dayMeals = allMeals[today] ?? EMPTY_DAY;
  const setDayMeals = (d: DayMeals | ((p: DayMeals) => DayMeals)) => {
    setAllMeals((all) => {
      const cur = all[today] ?? EMPTY_DAY;
      const next = typeof d === "function" ? (d as (p: DayMeals) => DayMeals)(cur) : d;
      return { ...all, [today]: next };
    });
  };

  const addToPlan = (date: string, recipe: Recipe) => {
    setAllMeals((all) => {
      const cur = all[date] ?? EMPTY_DAY;
      return { ...all, [date]: { ...cur, [recipe.mealType]: { name: recipe.name, recipeId: recipe.id, macros: recipe.macros, micros: recipe.micros } } };
    });
  };

  if (!setupComplete || editingSetup) {
    return <SetupScreen initial={profile} onDone={handleSetupDone} />;
  }

  return (
    <div className="animate-fade-in max-w-full overflow-x-hidden">

      <a href="/app/tools" className="mb-3 inline-flex items-center gap-1 text-sm text-rose hover:text-hotpink">
        <ArrowLeft className="h-4 w-4" /> All tools
      </a>

      {/* HERO — image with gradient + tab pills at bottom */}
      <div className="relative w-full aspect-[8/3] rounded-3xl overflow-hidden border border-pink-200/60 shadow-xl shadow-pink-200/30 mb-4 animate-hero-border-signal">
        <img src="/images/meal-oats.jpg" alt="Diet Tool" className="absolute inset-0 h-full w-full object-cover object-center" />
        <div className="absolute inset-0 bg-gradient-to-r from-hotpink/70 via-hotpink/20 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/35 via-transparent to-transparent" />
        <div className="absolute inset-0 flex flex-col justify-between p-3 sm:p-5 lg:p-7">
          {/* Title block */}
          <div className="flex-1 flex flex-col justify-center max-w-[55%] sm:max-w-[45%] lg:max-w-[38%]">
            <h1 className="animate-fade-in font-script text-2xl sm:text-4xl lg:text-5xl xl:text-6xl text-white leading-none drop-shadow-md" style={{ animationDelay: "0ms" }}>
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
          <div ref={tabsRef} className="animate-fade-in overflow-x-auto no-scrollbar" style={{ animationDelay: "320ms" }}>
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
        {tab === "cycle" && <CycleNutritionTab phase={cyclePhase} profile={profile} onEdit={() => setEditingSetup(true)} />}
        {tab === "today" && (
          <TodayTab phase={cyclePhase} cycleDay={cycleDay} profile={profile} dayMeals={dayMeals} setDayMeals={setDayMeals} />
        )}
        {tab === "recipes" && <RecipesTab phase={cyclePhase} profile={profile} onOpenRecipe={setOpenRecipe} />}
      </div>

      {openRecipe && <RecipeModal recipe={openRecipe} onClose={() => setOpenRecipe(null)} onAddToPlan={addToPlan} />}
    </div>
  );
}
