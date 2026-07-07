
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  ArrowLeft,
  Sparkles,
  ChevronRight,
  Check,
  Share2,
  Copy,
  Heart,
  RefreshCw,
  Shuffle,
  Clock,
  Snowflake,
  ShoppingBag,
  Calendar,
  Apple,
  Baby,
  X,
  Plus,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  Dumbbell,
  Flame,
  SlidersHorizontal,
  Moon,
  Pencil,
} from "lucide-react";
import { CuteDatePicker } from "@/components/bloom/CuteDatePicker";
import { PickerField } from "@/components/bloom/PickerField";
import {
  RECIPES,
  PANTRY,
  INTENTIONS,
  PHASE_INFO,
  DAYS,
  KID_DAYS,
  STORAGE_TABLE,
  SEASONAL,
  passesMyRules,
  readDietProfile,
  hasDietSetup,
  updateDietProfile,
  COOKING_OPTIONS,
  ALLERGY_OPTIONS,
  type Allergy,
  type CookingFrequency,
  type Recipe,
  type Intention,
  type CyclePhase,
  type PantryCategoryKey,
  type MealType,
} from "@/components/bloom/meals/data";
import { StepText } from "@/components/bloom/recipes/StepText";



import { readTodaySymptoms, readWorkoutPlanDays, readYogaPlanDays, readShoppingExtras, resetToolState, writeMealPortions, setMealPortion, portionFor } from "@/lib/crossToolData";
import { flushCloudSync } from "@/lib/cloudSync";
import { trainingAwarenessComment, normalizePhase } from "@/components/bloom/trainingFuel";
import { readCyclePhase, hasCycleSettings, readCycleSettings, phaseForDay, toDietPhase } from "@/components/bloom/cyclePhase";
import { readLaunch, LAUNCH_MEAL_KEY } from "@/components/bloom/phasePlan";
import { todayISO } from "@/lib/localDate";
import { computeTargets, targetRationale, movementFoodLine, sumMacros, calorieVerdict, slotBudget, portionForRecipe, type TargetBreakdown } from "@/lib/nutritionTargets";
import { SparkleOnboarding, type SparkleStep, type SparkleContent } from "@/components/bloom/SparkleOnboarding";

/* ---------- Meal photo fallbacks (by slot type) ---------- */
const MEAL_PHOTO_FALLBACK: Record<string, string> = {
  breakfast: '/images/meal-oats.webp',
  lunch:     '/images/meal-buddha.webp',
  dinner:    '/images/meal-stew.webp',
  snack:     '/images/meal-lunchbox.webp',
  lunchbox:  '/images/meal-lunchbox.webp',
};

/* ---------- localStorage keys ---------- */
const LS = {
  pantry: "bloom:meals-pantry",        // {category: string[] items checked}
  extra: "bloom:meals-pantry-extra",   // {category: string}
  intention: "bloom:meals-intention",
  plan: "bloom:meals-plan",            // {day: {breakfast,lunch,dinner,snack}}
  kidPlan: "bloom:meals-kidplan",      // {day: recipeId}
  favorites: "bloom:meals-favorites",  // string[]
  ratings: "bloom:meals-ratings",      // {id: "love"|"ok"|"never"}
  shopChecked: "bloom:meals-shop-checked",
  freezer: "bloom:meals-freezer",      // [{name,date,days}]
  step: "bloom:meals-step",            // onboarding step
  phase: "bloom:cycle-phase",          // shared
};

export const MEALS_PLAN_KEY = LS.plan;

function useLS<T>(key: string, initial: T): [T, (v: T | ((p: T) => T)) => void] {
  const [v, setV] = useState<T>(initial);
  useEffect(() => {
    try {
      const raw = localStorage.getItem(key);
      if (raw) setV(JSON.parse(raw));
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const set = (val: T | ((p: T) => T)) => {
    setV((prev) => {
      const next = typeof val === "function" ? (val as (p: T) => T)(prev) : val;
      try { localStorage.setItem(key, JSON.stringify(next)); } catch {}
      return next;
    });
  };
  return [v, set];
}

/* ---------- Engine ---------- */

function pantrySet(pantry: Record<string, string[]>): Set<string> {
  const s = new Set<string>();
  Object.values(pantry || {}).forEach((arr) => arr.forEach((i) => s.add(i.toLowerCase())));
  return s;
}

function scoreRecipe(r: Recipe, owned: Set<string>): number {
  const total = r.ingredients.length;
  const have = r.ingredients.filter((i) => owned.has(i.item.toLowerCase())).length;
  return have / Math.max(1, total);
}

function pickForSlot(
  pool: Recipe[],
  type: MealType,
  intention: Intention,
  phase: CyclePhase,
  owned: Set<string>,
  used: Set<string>,
  ratings: Record<string, "love" | "ok" | "never">,
  budget?: number,
): Recipe | null {
  const base = pool.filter((r) => r.mealType === type && ratings[r.id] !== "never");
  let candidates = base;

  // Only HARD-narrow the pool when doing so still leaves enough recipes for a
  // full week of DISTINCT meals (≥ 7). Otherwise keep the whole pool — narrowing
  // to 1–3 recipes is exactly what made the same dish repeat every morning.
  if (intention === "cycle") {
    const m = base.filter((r) => r.cyclePhase.includes(phase) || r.cyclePhase.includes("any"));
    if (m.length >= 7) candidates = m;
  } else if (intention === "quick") {
    const m = base.filter((r) => r.prepMin + r.cookMin <= 20);
    if (m.length >= 7) candidates = m;
  }
  if (!candidates.length) candidates = pool.filter((r) => r.mealType === type);
  if (!candidates.length) return null;

  // Named vibes (light / protein / energy …) are a SOFT preference: they BOOST
  // matching recipes but never collapse the pool to a single dish. Combined with
  // pantry match, a love bonus and a little randomness — computed once per recipe.
  //  · vibe boost is 0.6 so the chosen mood actually beats pantry-only picks;
  //  · phase boost (0.35) STACKS on ANY vibe, so "High protein · Luteal" is both
  //    protein-forward AND phase-aware (phase used to be ignored unless vibe=cycle);
  //  · "budget" has no recipe tag — it scores the real cost field instead.
  const softIntention = intention !== "cycle" && intention !== "quick";
  const phaseAware = phase !== "any";
  // Calorie-aware: prefer recipes sized near this slot's calorie budget so the
  // day actually reaches the goal (a build day needs denser dishes than a lean
  // day). Recipes within a scalable window of the budget score highest.
  const calFit = (cals: number) => {
    if (!budget || budget <= 0 || !cals) return 0;
    const off = Math.abs(cals - budget) / budget;      // 0 = bang on budget
    return (1 - Math.min(1, off)) * 0.7;               // up to +0.7 — matters, but vibe still counts
  };
  const scored = candidates.map((r) => ({
    r,
    s: scoreRecipe(r, owned)
      + (ratings[r.id] === "love" ? 0.3 : 0)
      + (softIntention && intention !== "budget" && r.intention.includes(intention) ? 0.6 : 0)
      + (intention === "budget" && r.cost === "$" ? 0.6 : 0)
      + (phaseAware && (r.cyclePhase.includes(phase) || r.cyclePhase.includes("any")) ? 0.35 : 0)
      + calFit(r.macros.calories || 0)
      + Math.random() * 0.3,
  }));
  scored.sort((a, b) => b.s - a.s);
  const order = scored.map((x) => x.r);

  // Crucial: never repeat a recipe already used this week while fresh ones exist.
  const fresh = order.filter((r) => !used.has(r.id));
  return (fresh.length ? fresh : order)[0];
}

function buildWeek(
  pool: Recipe[],
  intention: Intention,
  phase: CyclePhase,
  owned: Set<string>,
  ratings: Record<string, "love" | "ok" | "never">,
  proteinBoostDays?: Set<string>,
  dailyTarget?: number,
): { plan: Record<string, Record<MealType, string | null>>; portions: Record<string, Partial<Record<MealType, number>>> } {
  const used = new Set<string>();
  const plan: Record<string, Record<MealType, string | null>> = {};
  const portions: Record<string, Partial<Record<MealType, number>>> = {};
  DAYS.forEach((d) => {
    plan[d] = { breakfast: null, lunch: null, dinner: null, snack: null, lunchbox: null };
    (["breakfast", "lunch", "dinner", "snack"] as MealType[]).forEach((type) => {
      const slotIntention: Intention = proteinBoostDays?.has(d) && type === "dinner" ? "protein" : intention;
      const budget = dailyTarget ? slotBudget(dailyTarget, type) : undefined;
      const r = pickForSlot(pool, type, slotIntention, phase, owned, used, ratings, budget);
      if (r) {
        plan[d][type] = r.id;
        used.add(r.id);
        // Portion the serving so the day actually reaches the calorie target.
        if (dailyTarget) {
          const f = portionForRecipe(r.macros.calories || 0, type, dailyTarget);
          if (f !== 1) (portions[d] ??= {})[type] = f;
        }
      }
    });
  });
  return { plan, portions };
}

// Workout → Meals: after a strength/tonify session today, bias tonight's
// dinner toward a high-protein recipe for recovery.
const WORKOUT_LOG_KEY = "bloom:workout-history";

function didStrengthWorkoutToday(): boolean {
  try {
    const history: { date: string; intention: string }[] = JSON.parse(localStorage.getItem(WORKOUT_LOG_KEY) || "[]");
    const today = todayISO();
    return history.some((h) => h.date === today && (h.intention === "strengthen" || h.intention === "tonify"));
  } catch { return false; }
}

function todayDayName(): string {
  return DAYS[(new Date().getDay() + 6) % 7];
}

function buildKidWeek(recipes: Recipe[], owned: Set<string>) {
  const used = new Set<string>();
  const plan: Record<string, string | null> = {};
  const pool = recipes.filter((r) => r.mealType === "lunchbox" && r.packable);
  KID_DAYS.forEach((d) => {
    const ranked = [...pool].sort(
      (a, b) => scoreRecipe(b, owned) + (used.has(b.id) ? -0.6 : 0) -
                (scoreRecipe(a, owned) + (used.has(a.id) ? -0.6 : 0)),
    );
    plan[d] = ranked[0]?.id ?? null;
    if (ranked[0]) used.add(ranked[0].id);
  });
  return plan;
}

/* ---------- UI atoms ---------- */

function Glass({ children, className = "", style }: { children: React.ReactNode; className?: string; style?: React.CSSProperties }) {
  return (
    <div className={`rounded-[1.5rem] bg-white/85 backdrop-blur border border-petal/60 shadow-lg shadow-rose/10 ${className}`} style={style}>
      {children}
    </div>
  );
}

function PinkBtn({
  children, onClick, variant = "solid", className = "", as = "button", ...rest
}: {
  children: React.ReactNode; onClick?: () => void;
  variant?: "solid" | "ghost" | "outline"; className?: string;
  as?: "button" | "div"; [k: string]: any;
}) {
  const base = "inline-flex items-center justify-center gap-1.5 px-4 py-2 text-sm font-semibold transition";
  const cls = variant === "solid"
    ? "bloom-luxury-btn text-white"
    : variant === "outline"
      ? "rounded-full border border-hotpink/60 text-hotpink hover:bg-hotpink/10 active:scale-95"
      : "rounded-full text-hotpink hover:bg-hotpink/10 active:scale-95";
  const Tag: any = as;
  return <Tag onClick={onClick} className={`${base} ${cls} ${className}`} {...rest}>{children}</Tag>;
}

function EmptyState({
  title, blurb, cta, onCta, icon: Icon,
}: { title: string; blurb: string; cta: string; onCta: () => void; icon: any }) {
  return (
    <Glass className="p-6 text-center">
      <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-blush text-hotpink mb-2">
        <Icon className="h-6 w-6" strokeWidth={1.6} />
      </div>
      <h3 className="font-script text-2xl text-hotpink">{title}</h3>
      <p className="mt-1 text-sm text-rose/80">{blurb}</p>
      <div className="mt-4"><PinkBtn onClick={onCta}>{cta} <ChevronRight className="h-4 w-4" /></PinkBtn></div>
    </Glass>
  );
}

/* ---------- Tabs ---------- */

type TabKey = "week" | "kids" | "pantry" | "shop" | "prep" | "conserve" | "favs";
const TABS: { key: TabKey; label: string; icon: any }[] = [
  { key: "week", label: "This Week", icon: Calendar },
  { key: "kids", label: "Kids Lunch Box", icon: Baby },
  { key: "pantry", label: "My Pantry", icon: Apple },
  { key: "shop", label: "Shopping List", icon: ShoppingBag },
  { key: "prep", label: "Sunday Prep", icon: Sparkles },
  { key: "conserve", label: "Conservation", icon: Snowflake },
  { key: "favs", label: "Favorites", icon: Heart },
];

const TAB_HERO: Record<TabKey, { title: string; subtitle: string }> = {
  week:     { title: "Meal Planner",    subtitle: "cook with love, glow all week ✿" },
  kids:     { title: "Kids Lunch Box",  subtitle: "pack joy in every bite 🐣" },
  pantry:   { title: "My Pantry",       subtitle: "know what you have, waste less 🌿" },
  shop:     { title: "Shopping List",   subtitle: "grab only what you need ✓" },
  prep:     { title: "Sunday Prep",     subtitle: "cook once, eat all week 🍳" },
  conserve: { title: "Conservation",    subtitle: "keep it fresh, nothing wasted ❄️" },
  favs:     { title: "My Favourites",   subtitle: "your most-loved recipes ♥" },
};

/* ---------- Onboarding — shared bright "Barbie-luxe" sparkle tour (same as Cycle Tracker) ---------- */
const MEALS_GUIDE_CONTENT: SparkleContent = {
  eyebrow: "✦ your meals ✦",
  titleLines: ["Let's plan", "your week"],
  subtitle: "A soft little tour of your pantry, your vibe & your whole week of meals.",
  ctaLabel: "Show me my week",
  finaleLines: ["You're all set,", "gorgeous"],
  finaleSubtitle: "Your softest week is ready. ✿",
};

/* ---------- Page ---------- */

export default function MealsPage() {
  const [tab, setTab] = useState<TabKey>("week");
  // Banner shown when the week was just set up from the Diet tool.
  const [fromDiet, setFromDiet] = useState<string | null>(() => { try { return localStorage.getItem("bloom:meals-from-diet"); } catch { return null; } });
  const dismissFromDiet = () => { try { localStorage.removeItem("bloom:meals-from-diet"); } catch {} setFromDiet(null); };
  const [pantry, setPantry] = useLS<Record<string, string[]>>(LS.pantry, {});
  const [extra, setExtra] = useLS<Record<string, string>>(LS.extra, {});
  const [intention, setIntention] = useLS<Intention>(LS.intention, "light");
  const [plan, setPlan] = useLS<Record<string, Record<MealType, string | null>>>(LS.plan, {});
  // "Goal-tuned" marker — set when the week is auto-generated to her diet goal,
  // cleared the moment she swaps/redoes a meal (then it's her own plan).
  const [mealsTuned, setMealsTuned] = useState<string | null>(() => { try { return localStorage.getItem("bloom:meals-plan-goal"); } catch { return null; } });
  // A plan is only "tuned to a goal" if the user actually set a goal in Diet.
  // Otherwise it just follows the selected week vibe — no goal, no target.
  const markMealsTuned = () => {
    if (!hasDietSetup()) { clearMealsTuned(); return; }
    const g = readDietProfile().goal;
    try { localStorage.setItem("bloom:meals-plan-goal", g); } catch {}
    setMealsTuned(g);
  };
  const clearMealsTuned = () => { try { localStorage.removeItem("bloom:meals-plan-goal"); } catch {} setMealsTuned(null); };
  // Anything built or edited in the Meals Planner is the user's OWN week — drop
  // the "from Diet" marker so Diet treats it as protected (offers Sync, never
  // silently overwrites or clears it).
  const ownThisPlan = () => { try { localStorage.removeItem("bloom:meals-from-diet"); } catch {} };
  // Whether the Diet tool has been set up — gates the daily calorie target and
  // the "tuned to your goal" badge. Re-read on focus/storage so a reset (or a
  // fresh setup) reflects immediately.
  const [dietSetup, setDietSetup] = useState(hasDietSetup);
  // Bumped when the shared Diet profile changes (e.g. allergies/cooking set in
  // the setup guide) so the recipe pool re-filters without a reload.
  const [profileTick, setProfileTick] = useState(0);
  useEffect(() => {
    const refresh = () => { setDietSetup(hasDietSetup()); setProfileTick((t) => t + 1); };
    window.addEventListener("storage", refresh);
    window.addEventListener("focus", refresh);
    return () => { window.removeEventListener("storage", refresh); window.removeEventListener("focus", refresh); };
  }, []);
  const [kidPlan, setKidPlan] = useLS<Record<string, string | null>>(LS.kidPlan, {});
  const [favorites, setFavorites] = useLS<string[]>(LS.favorites, []);
  const [ratings, setRatings] = useLS<Record<string, "love" | "ok" | "never">>(LS.ratings, {});
  const [shopChecked, setShopChecked] = useLS<string[]>(LS.shopChecked, []);
  const [freezer, setFreezer] = useLS<{ name: string; date: string }[]>(LS.freezer, []);
  const [step, setStep] = useLS<number>(LS.step, 0); // 0=welcome,1=pantry,2=vibe,3=ready
  // "Continue without pantry" — user opted to plan from the whole library.
  const [pantrySkip, setPantrySkip] = useLS<boolean>("bloom:meals-pantry-skip", false);
  const [phase, setPhase] = useLS<CyclePhase>(LS.phase as any, "any");
  const [openRecipe, setOpenRecipe] = useState<string | null>(null);
  const [todaySymptoms, setTodaySymptoms] = useState<string[]>([]);
  const [onboarded, setOnboarded] = useLS<boolean>("bloom:meals-onboarded", false);
  const [showGuide, setShowGuide] = useState(false);
  // useLS hydrates from localStorage in an effect (async), so wait one tick
  // before auto-showing the tour — otherwise returning users flash the welcome.
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => { setHydrated(true); }, []);

  useEffect(() => {
    setTodaySymptoms(readTodaySymptoms());
    const refresh = () => setTodaySymptoms(readTodaySymptoms());
    window.addEventListener("storage", refresh);

    // Default the phase from the Cycle Tracker: whenever meals opens on "any",
    // pre-select the user's real current phase so meals start phase-appropriate.
    try {
      if (phase === "any") {
        let real = readCyclePhase();
        if ((!real || real === "any") && hasCycleSettings()) real = phaseForDay(new Date(), readCycleSettings());
        if (real && real !== "any") setPhase(real as CyclePhase);
      }
    } catch {}
    // Deep-link from Today / Cycle: open the tapped recipe straight away.
    const recipeId = readLaunch<string>(LAUNCH_MEAL_KEY);
    if (recipeId) setOpenRecipe(recipeId);

    return () => window.removeEventListener("storage", refresh);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const owned = useMemo(() => pantrySet(pantry), [pantry]);
  const planEmpty = Object.keys(plan).length === 0;
  const hasSetup = owned.size > 0 || !planEmpty;

  // The inline "Let's set up your week" step guide (shown on the empty Week
  // tab) is now the first-run experience, so the spotlight tour is opt-in only
  // via the hero "Guide" button — it no longer auto-pops over the steps guide.
  const guideVisible = showGuide;
  void hydrated; void onboarded; void hasSetup;

  // Scroll-hint on hero tabs: peek right then snap back so user sees there are more tabs
  const tabsRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = tabsRef.current;
    if (!el) return;
    const t1 = setTimeout(() => { el.scrollTo({ left: 80, behavior: 'smooth' }); }, 900);
    const t2 = setTimeout(() => { el.scrollTo({ left: 0, behavior: 'smooth' }); }, 1700);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  // Diet tool's "My Rules" (allergies + diet type) silently filter the pool
  // every recipe is picked from, so the weekly plan never recommends a recipe
  // the user has ruled out in the Diet tool.
  const myRulesPool = useMemo(() => {
    const profile = readDietProfile();
    return RECIPES.filter((r) => passesMyRules(r, profile));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profileTick]);

  // Premium training↔meals loop: every planned WORKOUT day (plus today if she
  // already trained strength) gets a protein-forward dinner for recovery —
  // not just "today". These are the days her body is rebuilding.
  const proteinBoostDays = useMemo(() => {
    const days = new Set<string>(readWorkoutPlanDays());
    if (didStrengthWorkoutToday()) days.add(todayDayName());
    return days;
  }, []);

  const generateWeek = () => {
    const target = computeTargets(true).calories;
    const { plan: p, portions } = buildWeek(myRulesPool, intention, phase, owned, ratings, proteinBoostDays, target);
    setPlan(p);
    writeMealPortions(portions);
    markMealsTuned();
    ownThisPlan(); // built here → the user's own week (Diet won't overwrite it)
    setStep(3);
    setTab("week");
  };
  // One-tap "make it match my phase": switch the vibe to Cycle-sync, lock the
  // real phase and build — passing values explicitly to avoid stale state.
  const generatePhasePlan = () => {
    const real = readCyclePhase();
    const ph = (real && real !== "any" ? real : phase) as CyclePhase;
    setIntention("cycle");
    setPhase(ph);
    const target = computeTargets(true).calories;
    const { plan: p, portions } = buildWeek(myRulesPool, "cycle", ph, owned, ratings, proteinBoostDays, target);
    setPlan(p);
    writeMealPortions(portions);
    markMealsTuned();
    ownThisPlan();
    setStep(3);
    setTab("week");
  };
  const generateKids = () => setKidPlan(buildKidWeek(myRulesPool, owned));

  // Auto-heal plans saved before the variety fix. We read localStorage DIRECTLY
  // here because useLS hydrates its state asynchronously — at mount the `plan`
  // state is still empty, so checking it would always skip the heal.
  useEffect(() => {
    const readLS = <T,>(k: string, fb: T): T => {
      try { const r = localStorage.getItem(k); return r ? (JSON.parse(r) as T) : fb; } catch { return fb; }
    };
    const saved = readLS<Record<string, Record<MealType, string | null>>>(LS.plan, {});
    const days = Object.keys(saved);
    if (days.length < 3) return;
    const repetitive = (["breakfast", "lunch", "dinner", "snack"] as MealType[]).some((slot) => {
      const counts: Record<string, number> = {};
      days.forEach((d) => { const id = saved[d]?.[slot]; if (id) counts[id] = (counts[id] || 0) + 1; });
      return Object.values(counts).some((c) => c >= 3);
    });
    // Also heal plans that simply have no snack yet (saved before snacks existed).
    const missingSnack = days.some((d) => !saved[d]?.snack);
    if (repetitive || missingSnack) {
      const savedIntention = readLS<Intention>(LS.intention, "light");
      const savedPhase = readLS<CyclePhase>(LS.phase, "any");
      const savedOwned = pantrySet(readLS<Record<string, string[]>>(LS.pantry, {}));
      const savedRatings = readLS<Record<string, "love" | "ok" | "never">>(LS.ratings, {});
      const target = computeTargets(true).calories;
      const { plan: healed, portions } = buildWeek(myRulesPool, savedIntention, savedPhase, savedOwned, savedRatings, proteinBoostDays, target);
      setPlan(healed);
      writeMealPortions(portions);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const togglePantry = (cat: PantryCategoryKey, item: string) => {
    setPantry((p) => {
      const cur = p[cat] || [];
      const next = cur.includes(item) ? cur.filter((x) => x !== item) : [...cur, item];
      return { ...p, [cat]: next };
    });
  };

  const swapMeal = (day: string, type: MealType) => {
    const used = new Set<string>(
      Object.values(plan).flatMap((d) => Object.values(d).filter(Boolean) as string[]),
    );
    const cur = plan[day]?.[type];
    if (cur) used.delete(cur);
    used.add(cur || "");
    const target = computeTargets(true).calories;
    const slotIntention: Intention = proteinBoostDays.has(day) && type === "dinner" ? "protein" : intention;
    const r = pickForSlot(myRulesPool, type, slotIntention, phase, owned, used, ratings, slotBudget(target, type));
    if (r) {
      setPlan({ ...plan, [day]: { ...plan[day], [type]: r.id } });
      setMealPortion(day, type as any, portionForRecipe(r.macros.calories || 0, type, target));
    }
    clearMealsTuned(); // a manual swap makes it her own plan
    ownThisPlan();
  };

  const regenDay = (day: string) => {
    // Seed "used" with every recipe already in the week (other days) so a
    // re-rolled day doesn't duplicate what's elsewhere in the plan.
    const used = new Set<string>();
    Object.entries(plan).forEach(([d, meals]) => {
      if (d === day || !meals) return;
      Object.values(meals).forEach((id) => { if (id) used.add(id as string); });
    });
    const target = computeTargets(true).calories;
    const slots: MealType[] = ["breakfast", "lunch", "dinner", "snack"];
    const dayPlan: Record<MealType, string | null> = { breakfast: null, lunch: null, dinner: null, snack: null, lunchbox: null };
    const dayPortions: Partial<Record<MealType, number>> = {};
    slots.forEach((type) => {
      const slotIntention: Intention = proteinBoostDays.has(day) && type === "dinner" ? "protein" : intention;
      const r = pickForSlot(myRulesPool, type, slotIntention, phase, owned, used, ratings, slotBudget(target, type));
      if (r) {
        dayPlan[type] = r.id;
        used.add(r.id);
        const f = portionForRecipe(r.macros.calories || 0, type, target);
        if (f !== 1) dayPortions[type] = f;
      }
    });
    setPlan({ ...plan, [day]: dayPlan });
    // Replace this day's portions (set the whole day at once).
    slots.forEach((type) => setMealPortion(day, type as any, dayPortions[type] ?? 1));
    clearMealsTuned();
    ownThisPlan();
  };

  const toggleFav = (id: string) => {
    setFavorites((f) => (f.includes(id) ? f.filter((x) => x !== id) : [...f, id]));
  };

  return (
    <>
    <div className="relative animate-fade-in max-w-full overflow-x-hidden">
      {/* HERO — compact, matches Budget Planner height */}
      <div className="relative w-full rounded-3xl overflow-hidden border border-pink-200/60 shadow-xl shadow-pink-200/30 mb-3 animate-hero-border-signal">
        <img src="/images/meals-hero-new.webp" alt="Meal Planner" className="absolute inset-0 h-full w-full object-cover object-[50%_20%]" />
        <div className="absolute inset-0 bg-gradient-to-r from-hotpink/70 via-hotpink/20 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent" />
        <div className="relative flex flex-col justify-between gap-2 p-3 sm:p-4 min-h-[128px] sm:min-h-[150px] lg:min-h-[188px]">
          {/* Title block — left-anchored */}
          <div className="flex items-start justify-between gap-2">
            <div className="max-w-[62%]">
              <h1 className="animate-fade-in font-script text-2xl sm:text-3xl text-white leading-none drop-shadow-md" style={{ animationDelay: '0ms' }}>{TAB_HERO[tab].title}</h1>
              {phase !== "any" && tab === "week" && (
                <p className="animate-fade-in mt-1 text-[10px] sm:text-xs font-semibold uppercase tracking-[.12em] text-white/75 drop-shadow leading-none" style={{ animationDelay: '120ms' }}>
                  {phase} phase
                </p>
              )}
              <p className="animate-fade-in mt-1 text-[11px] sm:text-xs italic text-white/90 drop-shadow leading-snug" style={{ animationDelay: '200ms' }}>{TAB_HERO[tab].subtitle}</p>
            </div>
            {/* Reset + Guide chips */}
            <div className="animate-fade-in shrink-0 flex items-center gap-1.5" style={{ animationDelay: '260ms' }}>
              <button
                onClick={async () => {
                  if (window.confirm("Reset the Meal Planner to a fresh start? This clears your pantry, plan, favourites and progress here so you can see the first-time experience.")) {
                    resetToolState("meals");
                    await flushCloudSync();
                    window.location.reload();
                  }
                }}
                aria-label="Reset tool"
                title="Reset — preview the first-time experience"
                className="inline-flex items-center gap-1 rounded-full bg-white/20 backdrop-blur-md border border-white/40 px-2.5 py-1.5 text-[11px] sm:text-xs text-white/90 font-semibold transition hover:bg-white/30 active:scale-95"
              >
                <RotateCcw className="h-3 w-3" /> Reset
              </button>
              <button
                onClick={() => setShowGuide(true)}
                className="inline-flex items-center gap-1 rounded-full bg-white/25 backdrop-blur-md border border-white/50 px-3 py-1.5 text-[11px] sm:text-xs text-white font-semibold transition hover:bg-white/35 active:scale-95"
              >
                <Sparkles className="h-3 w-3" />
                Guide
              </button>
            </div>
          </div>
          {/* Pill tabs at bottom of hero — auto-scroll hint on load */}
          <div ref={tabsRef} className="animate-fade-in overflow-x-auto no-scrollbar" style={{ animationDelay: '320ms' }}>
            <div className="flex gap-1.5 w-max">
              {TABS.map((t) => {
                const active = tab === t.key;
                return (
                  <button
                    key={t.key}
                    data-tour={`meals-tab-${t.key}`}
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

      {/* Symptom-aware nudge — shown when user has logged cramps/bloating/nausea in Today */}
      {todaySymptoms.some((s) => ["cramps", "bloated", "nausea", "backpain"].includes(s)) && (
        <div className="mt-3 rounded-3xl bg-gradient-to-r from-rose/10 to-petal/20 border border-petal/60 px-4 py-3 flex items-center gap-3 animate-fade-in">
          <span className="clay-blob grid h-9 w-9 shrink-0 place-items-center rounded-full text-white">
            <Heart className="h-4 w-4" strokeWidth={1.8} />
          </span>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-hotpink leading-tight">Soothing meals for today ✿</p>
            <p className="text-[11px] text-rose/70 leading-snug">
              Based on your symptoms, look for anti-inflammatory recipes — ginger, turmeric, leafy greens and magnesium-rich foods can ease cramps and bloating.
            </p>
          </div>
        </div>
      )}

      {/* Spotlight onboarding tour (first visit + manual "Guide" button) */}
      {guideVisible && (
        <MealsGuide
          setTab={setTab}
          onDone={() => { setOnboarded(true); setShowGuide(false); }}
        />
      )}

      <div className="mt-4 space-y-4">
        {tab === "week" && (
          <WeekTab
            intention={intention} setIntention={setIntention}
            phase={phase} setPhase={setPhase}
            plan={plan} planEmpty={planEmpty}
            onGenerate={generateWeek}
            onGeneratePhase={generatePhasePlan}
            onOpen={setOpenRecipe}
            onSwap={swapMeal}
            onRegen={regenDay}
            owned={owned}
            proteinBoostDays={proteinBoostDays}
            mealsTuned={mealsTuned} dietSetup={dietSetup}
            pantrySkip={pantrySkip} onSkipPantry={() => setPantrySkip(true)}
            fromDiet={fromDiet} onDismissFromDiet={dismissFromDiet}
            goPantry={() => { setStep(1); setTab("pantry"); }}
            goPrep={() => setTab("prep")}
          />
        )}

        {tab === "kids" && (
          <KidsTab
            kidPlan={kidPlan} onGenerate={generateKids} onOpen={setOpenRecipe}
          />
        )}

        {tab === "pantry" && (
          <PantryTab
            pantry={pantry} togglePantry={togglePantry}
            extra={extra} setExtra={setExtra}
            onDone={() => { setStep(2); setTab("week"); }}
            stepHint={step <= 1}
          />
        )}

        {tab === "shop" && (
          <ShopTab
            plan={plan} owned={owned}
            checked={shopChecked} setChecked={setShopChecked}
            planEmpty={planEmpty}
            goWeek={() => setTab("week")}
          />
        )}

        {tab === "prep" && <SundayPrepTab plan={plan} planEmpty={planEmpty} goWeek={() => setTab("week")} />}

        {tab === "conserve" && (
          <ConservationTab freezer={freezer} setFreezer={setFreezer} />
        )}

        {tab === "favs" && (
          <FavsTab
            favorites={favorites} ratings={ratings} setRatings={setRatings}
            onOpen={setOpenRecipe} toggleFav={toggleFav}
          />
        )}

        {/* Clever shortcuts */}
        <CleverRow onOpen={setOpenRecipe} owned={owned} />
      </div>

      <style>{`.no-scrollbar::-webkit-scrollbar{display:none}.no-scrollbar{-ms-overflow-style:none;scrollbar-width:none}`}</style>
    </div>

    {/* RecipeSheet rendered OUTSIDE the animated div so position:fixed works correctly.
        CSS transform on an ancestor breaks fixed positioning — moving it here fixes it. */}
    {openRecipe && (
      <RecipeSheet
        id={openRecipe} onClose={() => setOpenRecipe(null)}
        favorites={favorites} toggleFav={toggleFav}
        ratings={ratings} setRatings={setRatings}
      />
    )}
    </>
  );
}

/* ---------- Onboarding — bright "Barbie-luxe" sparkle tour (shared with Cycle Tracker) ---------- */

function MealsGuide({ onDone, setTab }: { onDone: () => void; setTab: (t: TabKey) => void }) {
  const steps: SparkleStep[] = [
    {
      key: "pantry",
      selector: "[data-tour='meals-tab-pantry']",
      onEnter: () => setTab("pantry"),
      title: "Build your pantry",
      desc: "Tap everything you already have — your whole week is planned from what's in your kitchen.",
    },
    {
      key: "vibe",
      selector: "[data-tour='meals-vibe']",
      onEnter: () => setTab("week"),
      title: "Pick this week's vibe",
      desc: "Light, protein-rich, comfort, or synced to your cycle — choose how you want to feel.",
    },
    {
      key: "plan",
      selector: "[data-tour='meals-plan']",
      onEnter: () => setTab("week"),
      title: "Plan my week",
      desc: "One tap builds all 7 days — breakfast, lunch and dinner — from what you own first.",
    },
    {
      key: "shop",
      selector: "[data-tour='meals-tab-shop']",
      onEnter: () => setTab("shop"),
      title: "Auto shopping list",
      desc: "Everything you're missing, grouped by store aisle and ready to share on WhatsApp.",
    },
  ];
  return <SparkleOnboarding steps={steps} content={MEALS_GUIDE_CONTENT} onDone={onDone} />;
}

/* ---------- This Week ---------- */

/** Premium daily nutrition target — the number that makes the app feel real. */
function DailyTargetCard({ t }: { t: TargetBreakdown }) {
  const goalLabel = t.goal === "lose" ? "Lean" : t.goal === "gain" ? "Build" : "Maintain";
  const macros = [
    { k: "Protein", v: t.protein, cls: "text-amber-600", bg: "bg-amber-50", br: "border-amber-200/70" },
    { k: "Carbs", v: t.carbs, cls: "text-rose-500", bg: "bg-rose-50", br: "border-rose-200/70" },
    { k: "Fat", v: t.fat, cls: "text-violet-500", bg: "bg-violet-50", br: "border-violet-200/70" },
  ];
  return (
    <Glass className="p-4 sm:p-5 animate-fade-in" data-tour="meals-target">
      <div className="flex items-center justify-between mb-2.5">
        <p className="font-script text-2xl text-hotpink">Your daily target</p>
        <span className="rounded-full bg-hotpink/10 text-hotpink text-[10px] font-black uppercase tracking-wide px-2.5 py-1 border border-hotpink/20">{goalLabel} goal</span>
      </div>
      <div className="flex items-end gap-4">
        <div className="shrink-0">
          <p className="text-4xl sm:text-5xl font-black leading-none text-hotpink tabular-nums">{t.calories.toLocaleString()}</p>
          <p className="text-[10px] font-bold uppercase tracking-widest text-rose/50 mt-1">kcal / day</p>
        </div>
        <div className="flex-1 grid grid-cols-3 gap-1.5">
          {macros.map((m) => (
            <div key={m.k} className={`rounded-xl ${m.bg} border ${m.br} py-2 text-center`}>
              <p className={`text-lg font-black leading-none ${m.cls} tabular-nums`}>{m.v}<span className="text-[10px] font-bold">g</span></p>
              <p className="text-[8px] font-bold uppercase tracking-wide text-rose/45 mt-0.5">{m.k}</p>
            </div>
          ))}
        </div>
      </div>
      <p className="mt-2.5 flex items-start gap-1.5 text-[11px] leading-snug text-rose/70">
        <Sparkles className="h-3.5 w-3.5 shrink-0 mt-0.5 text-hotpink" strokeWidth={2} />
        <span>Tuned from your body &amp; {targetRationale(t)}.</span>
      </p>
      {/* Movement → food: the training plan's real effect on the target */}
      {movementFoodLine(t) && (
        <p className="mt-1.5 flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200/70 px-2.5 py-1 text-[10.5px] font-bold text-emerald-700 w-fit">
          <Dumbbell className="h-3 w-3 shrink-0" /> {movementFoodLine(t)}
        </p>
      )}
      {/* Eat-back: calories actually burned today are added to the target */}
      {t.eatBack > 0 && (
        <p className="mt-1.5 flex items-center gap-1.5 rounded-full bg-amber-50 border border-amber-200/70 px-2.5 py-1 text-[10.5px] font-black text-amber-700 w-fit">
          <Flame className="h-3 w-3 shrink-0" /> +{t.eatBack} kcal burned today — added to your target
        </p>
      )}
      {/* Guided instruction — helps her understand the number from day one */}
      <div className="mt-2 flex items-start gap-1.5 rounded-xl bg-hotpink/5 border border-hotpink/15 px-2.5 py-1.5 text-[10.5px] leading-snug text-rose/70">
        <span className="font-bold text-hotpink uppercase tracking-wide text-[9px] mt-0.5 shrink-0">How to use</span>
        <span>This is your goal for the day. Each day below shows a little bar of how close its meals land — aim for <b className="text-emerald-600">on target</b>. Add your height &amp; age in <b className="text-hotpink">Diet</b> to make it exact.</span>
      </div>
    </Glass>
  );
}

/** A day's actual calories/protein vs the daily target — the closed loop.
 *  Scales each meal by its planned portion so the day lands on the goal. */
function DayTotals({ plan, day, target }: { plan: any; day: string; target: TargetBreakdown }) {
  const dayPlan = plan?.[day];
  const recipes = dayPlan
    ? (["breakfast", "lunch", "dinner", "snack"] as MealType[])
        .map((s) => {
          const r = dayPlan[s] ? RECIPES.find((x) => x.id === dayPlan[s]) : null;
          if (!r) return null;
          const f = portionFor(day, s as any);
          return { macros: { calories: r.macros.calories * f, protein: r.macros.protein * f, carbs: r.macros.carbs * f, fat: r.macros.fat * f } };
        })
        .filter(Boolean) as { macros: { calories: number; protein: number; carbs: number; fat: number } }[]
    : [];
  if (!recipes.length) return null;
  const totals = sumMacros(recipes);
  totals.calories = Math.round(totals.calories);
  totals.protein = Math.round(totals.protein);
  const verdict = calorieVerdict(totals.calories, target.calories);
  const pct = Math.min(100, Math.round((totals.calories / Math.max(1, target.calories)) * 100));
  const barCls = verdict === "on" ? "bg-emerald-400" : verdict === "under" ? "bg-amber-400" : "bg-rose-400";
  const label = verdict === "on" ? "on target" : verdict === "under" ? "under" : "over";
  const labelCls = verdict === "on" ? "text-emerald-600" : verdict === "under" ? "text-amber-600" : "text-rose-500";
  return (
    <div className="mt-2.5 pt-2.5 border-t border-petal/50">
      <div className="flex items-center justify-between text-[10px] font-bold mb-1">
        <span className="text-rose/60 tabular-nums">≈{totals.calories.toLocaleString()} <span className="text-rose/35">/ {target.calories.toLocaleString()} kcal</span></span>
        <span className={`uppercase tracking-wide ${labelCls}`}>{label} · {totals.protein}g P</span>
      </div>
      <div className="h-1.5 rounded-full bg-petal/40 overflow-hidden">
        <div className={`h-full rounded-full transition-all ${barCls}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

/* One numbered row of the fresh-start setup guide. */
function StepRow({ n, done, title, desc, children }: { n: number; done: boolean; title: string; desc: string; children: ReactNode }) {
  return (
    <div className="flex gap-3 animate-fade-in" style={{ animationDelay: `${n * 70}ms` }}>
      <span className={["mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full text-[13px] font-bold", done ? "bg-emerald-100 text-emerald-600" : "bg-hotpink text-white"].join(" ")}>
        {done ? <Check className="h-4 w-4" strokeWidth={3} /> : n}
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-hotpink leading-tight">{title}</p>
        <p className="text-[11.5px] text-rose/60 leading-snug">{desc}</p>
        <div className="mt-2">{children}</div>
      </div>
    </div>
  );
}

/* A small selectable pill (cooking time / allergies). */
function ChoicePill({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={["rounded-full px-3 py-1.5 text-[12px] font-semibold transition active:scale-95", active ? "bg-hotpink text-white shadow shadow-hotpink/30" : "border border-petal/60 bg-white/80 text-rose/70 hover:bg-blush"].join(" ")}
    >
      {children}
    </button>
  );
}

/* Fresh-start / post-reset experience: an inline, step-by-step setup guide —
   NOT the spotlight tour. The cycle phase is auto-synced from the Cycle Tracker
   (never a manual step); the user just sets vibe, cooking time & allergies, and
   pantry is optional (skippable). Cooking time & allergies write to the shared
   Diet profile so there is one source of truth. */
function SetupSteps({ phase, intention, setIntention, owned, goPantry, onPlan, generating, dietSetup, pantrySkip, onSkipPantry }: any) {
  const initial = readDietProfile();
  const [cooking, setCooking] = useState<CookingFrequency>(initial.cookingFrequency);
  const [allergies, setAllergies] = useState<Allergy[]>(initial.allergies);
  const [touched, setTouched] = useState({ vibe: false, cooking: false, allergy: false });

  const phaseKnown = phase !== "any";
  const pantryDone = owned.size > 0 || pantrySkip;

  const chooseCooking = (k: CookingFrequency) => { setCooking(k); updateDietProfile({ cookingFrequency: k }); setTouched((t) => ({ ...t, cooking: true })); };
  const toggleAllergy = (a: Allergy) => {
    setAllergies((prev) => { const next = prev.includes(a) ? prev.filter((x) => x !== a) : [...prev, a]; updateDietProfile({ allergies: next }); return next; });
    setTouched((t) => ({ ...t, allergy: true }));
  };
  const chooseNoAllergy = () => { setAllergies([]); updateDietProfile({ allergies: [] }); setTouched((t) => ({ ...t, allergy: true })); };

  return (
    <Glass className="p-4 sm:p-5 animate-scale-in">
      <p className="font-script text-2xl text-hotpink leading-none">Let's set up your week ✿</p>
      <p className="mt-1 text-[12px] text-rose/60 leading-snug">A few quick picks — then I cook your whole week for you.</p>

      {/* Cycle phase — automatic, from the Cycle Tracker (not a step) */}
      <div className="mt-3 mb-4 flex items-start gap-2 rounded-2xl bg-blush/60 px-3 py-2.5">
        {phaseKnown ? (
          <>
            <Check className="h-4 w-4 shrink-0 mt-0.5 text-emerald-500" strokeWidth={2.8} />
            <p className="text-[12px] text-rose/80 leading-snug">Synced to your <b className="text-hotpink capitalize">{phase}</b> phase — automatically, from your Cycle Tracker ✿</p>
          </>
        ) : (
          <>
            <Moon className="h-4 w-4 shrink-0 mt-0.5 text-hotpink" />
            <p className="text-[12px] text-rose/80 leading-snug">Meals adapt to your cycle. <a href="/app/tools/cycle" className="font-bold text-hotpink underline">Set up your Cycle Tracker</a> to sync your phase automatically.</p>
          </>
        )}
      </div>

      <div className="space-y-4">
        {/* 1 — Vibe */}
        <StepRow n={1} done={touched.vibe} title="Choose this week's vibe" desc="The mood for this week — light, protein-rich, comfort or fully cycle-synced.">
          <div data-tour="meals-vibe">
            <PickerField
              value={intention} title="This week's vibe"
              options={INTENTIONS.map((i) => ({ value: i.key, label: i.label }))}
              onChange={(v: any) => { setIntention(v as Intention); setTouched((t) => ({ ...t, vibe: true })); }}
              className="min-w-[9rem] !text-[13px] !py-1.5 !rounded-full"
            />
          </div>
        </StepRow>

        {/* 2 — Cooking time (shared Diet profile) */}
        <StepRow n={2} done={touched.cooking} title="Cooking time" desc="How long do you want to spend in the kitchen?">
          <div className="flex flex-wrap gap-1.5">
            {COOKING_OPTIONS.map((o) => (
              <ChoicePill key={o.key} active={touched.cooking && cooking === o.key} onClick={() => chooseCooking(o.key)}>{o.label}</ChoicePill>
            ))}
          </div>
        </StepRow>

        {/* 3 — Allergies (shared Diet profile) */}
        <StepRow n={3} done={touched.allergy} title="Allergies" desc="Anything I should keep out of your plan?">
          <div className="flex flex-wrap gap-1.5">
            <ChoicePill active={touched.allergy && allergies.length === 0} onClick={chooseNoAllergy}>None</ChoicePill>
            {ALLERGY_OPTIONS.map((o) => (
              <ChoicePill key={o.key} active={allergies.includes(o.key)} onClick={() => toggleAllergy(o.key)}>{o.label}</ChoicePill>
            ))}
          </div>
        </StepRow>

        {/* 4 — Pantry (optional, skippable) */}
        <StepRow n={4} done={pantryDone} title="Pantry — optional" desc={pantrySkip ? "Skipped — I'll plan from my whole recipe library." : "Plan from what you own, or skip and I'll use everything."}>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={goPantry}
              className={["inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-[12.5px] font-bold transition active:scale-95", owned.size > 0 ? "border border-petal/60 bg-white/80 text-hotpink hover:bg-blush" : "bg-hotpink text-white shadow-lg shadow-hotpink/30"].join(" ")}
            >
              <Apple className="h-4 w-4" /> {owned.size > 0 ? "Edit pantry" : "Set up pantry"} <ChevronRight className="h-3.5 w-3.5" />
            </button>
            {!pantryDone && (
              <button onClick={onSkipPantry} className="inline-flex items-center gap-1.5 rounded-full border border-petal/60 bg-white/70 px-3.5 py-2 text-[12.5px] font-semibold text-rose/70 hover:bg-blush transition active:scale-95">
                Continue without pantry
              </button>
            )}
          </div>
        </StepRow>
      </div>

      {/* Plan — primary, always available (sensible defaults if a step is skipped) */}
      <button
        onClick={onPlan} disabled={generating}
        data-tour="meals-plan"
        className="mt-4 w-full inline-flex items-center justify-center gap-1.5 rounded-2xl bg-gradient-to-r from-hotpink to-[#DB2777] text-white px-4 py-3 text-[14px] font-bold shadow-lg shadow-hotpink/30 animate-cta-bounce disabled:opacity-50 transition active:scale-95"
      >
        <Sparkles className="h-4 w-4" /> {generating ? "Building your week…" : "Plan my week"} <ChevronRight className="h-4 w-4" />
      </button>
      {/* Persistent reminder of what the plan follows */}
      <p className="mt-2 text-center text-[11px] text-rose/55 leading-snug">
        {dietSetup ? "Your week follows your Diet goal & this week's vibe ✿" : "Your week follows this week's vibe ✿"}
      </p>
    </Glass>
  );
}

function WeekTab({
  intention, setIntention, phase, setPhase, plan, planEmpty, onGenerate, onGeneratePhase,
  onOpen, onSwap, onRegen, owned, goPantry, goPrep, proteinBoostDays, mealsTuned, dietSetup,
  pantrySkip, onSkipPantry, fromDiet, onDismissFromDiet,
}: any) {
  const goalWord = (g: string) => (g === "lose" ? "lean" : g === "gain" ? "build" : "maintain");
  const hasPantry = owned.size > 0;
  const [generating, setGenerating] = useState(false);
  const [editingVibe, setEditingVibe] = useState(false);
  const planRef = useRef<HTMLDivElement>(null);
  const dietNoteRef = useRef<HTMLDivElement>(null);

  // Arriving from the Diet tool: scroll straight to the synced week + its note.
  useEffect(() => {
    if (fromDiet) {
      const t = setTimeout(() => dietNoteRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }), 250);
      return () => clearTimeout(t);
    }
  }, [fromDiet]);

  // Premium: a real, personalised daily nutrition target (body + goal +
  // training load + cycle phase). Recompute when the plan changes OR a
  // workout/yoga is logged, so the eat-back flows in live.
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
  const targets: TargetBreakdown = useMemo(() => computeTargets(true), [plan, trainTick]);
  // Yoga-only days (yoga planned, no workout) get a gentle recovery-food cue.
  const yogaDaySet = useMemo(() => new Set(readYogaPlanDays()), []);

  // The user's real cycle phase (for the attention-grabbing banner).
  const realPhase = useMemo(() => readCyclePhase(), []);
  const phaseSynced = intention === "cycle" && phase !== "any";

  const handleGenerate = () => {
    setGenerating(true);
    onGenerate();
    setTimeout(() => {
      setGenerating(false);
      planRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 400);
  };
  const handleGeneratePhase = () => {
    setGenerating(true);
    onGeneratePhase();
    setTimeout(() => {
      setGenerating(false);
      planRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 400);
  };

  const intentionLabel = INTENTIONS.find((i) => i.key === intention)?.label ?? "";

  return (
    <>
      {/* ①  YOUR DAILY TARGET — only once Diet is set up (a real goal + body).
             Without it there is no personalised target to show, so instead we
             gently offer to set a goal and get adequate meals. */}
      {dietSetup ? (
        <DailyTargetCard t={targets} />
      ) : (
        <button
          onClick={() => { window.location.href = "/app/tools/diet"; }}
          className="w-full flex items-center gap-3 rounded-2xl border border-dashed border-hotpink/40 bg-white/70 p-3.5 text-left transition hover:bg-blush hover-scale active:scale-[0.99] animate-fade-in"
        >
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-hotpink/10 text-hotpink"><Sparkles className="h-5 w-5" /></span>
          <span className="flex-1 min-w-0">
            <span className="block text-sm font-bold text-hotpink leading-tight">Want a daily calorie target?</span>
            <span className="block text-[11.5px] text-rose/65 leading-snug">Set a goal in Diet and I'll tune every week to it — for now, meals just follow your chosen vibe ✿</span>
          </span>
          <span className="shrink-0 inline-flex items-center gap-1 rounded-full bg-hotpink/10 px-3 py-1 text-xs font-bold text-hotpink">Set goal <ChevronRight className="h-3.5 w-3.5" /></span>
        </button>
      )}

      {/* ②  Slim plan bar — once a week exists, "This week's vibe" collapses to
             a one-line notification of what the plan follows, with a small Edit
             to reopen the vibe controls + a Regenerate. */}
      {!planEmpty && (
      <Glass className="p-3">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 shrink-0 text-hotpink" />
          <p className="flex-1 min-w-0 text-[12px] text-rose/80 leading-snug">
            {dietSetup && mealsTuned
              ? <>Plan tuned to your <b className="text-hotpink">{goalWord(mealsTuned)}</b> goal</>
              : <>Plan tuned to your <b className="text-hotpink capitalize">{intentionLabel}</b> vibe</>}
            {phase !== "any" && <span className="text-rose/50"> · <span className="capitalize">{phase}</span> phase</span>}
          </p>
          <button onClick={() => setEditingVibe((v) => !v)} className="shrink-0 inline-flex items-center gap-1 rounded-full border border-petal/60 bg-white/80 px-2.5 py-1.5 text-[11px] font-bold text-hotpink hover:bg-blush transition active:scale-95">
            <Pencil className="h-3 w-3" /> Edit
          </button>
          <button onClick={handleGenerate} disabled={generating} title="Regenerate the week" aria-label="Regenerate" className="shrink-0 grid h-8 w-8 place-items-center rounded-full bg-gradient-to-r from-hotpink to-[#DB2777] text-white shadow shadow-hotpink/30 disabled:opacity-50 transition active:scale-95">
            <RefreshCw className={["h-4 w-4", generating ? "animate-spin" : ""].join(" ")} />
          </button>
        </div>

        {/* Expanded editor — vibe + phase override; cooking time & allergies live in Diet */}
        {editingVibe && (
          <div className="mt-3 pt-3 border-t border-petal/50 space-y-2.5 animate-fade-in">
            <div data-tour="meals-vibe" className="flex flex-wrap items-center gap-2">
              <PickerField
                value={intention} title="This week's vibe"
                options={INTENTIONS.map((i) => ({ value: i.key, label: i.label }))}
                onChange={(v) => setIntention(v as Intention)} className="min-w-[8.5rem] !text-[13px] !py-1.5 !rounded-full"
              />
              <PickerField
                value={phase} title="Cycle phase"
                options={[{ value: "any", label: "Any phase" }, { value: "period", label: "Period" }, { value: "follicular", label: "Follicular" }, { value: "fertile", label: "Fertile" }, { value: "ovulation", label: "Ovulation" }, { value: "luteal", label: "Luteal" }]}
                onChange={(v) => setPhase(v as CyclePhase)} className="min-w-[7.5rem] !text-[13px] !py-1.5 !rounded-full"
              />
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              <button onClick={goPantry} className="inline-flex items-center gap-1 text-[11px] font-semibold text-hotpink hover:underline"><Apple className="h-3 w-3" /> Pantry</button>
              <a href="/app/tools/diet" className="inline-flex items-center gap-1 text-[11px] font-semibold text-hotpink hover:underline"><SlidersHorizontal className="h-3 w-3" /> Cooking time &amp; allergies</a>
              <div className="flex-1" />
              <button onClick={() => { handleGenerate(); setEditingVibe(false); }} className="inline-flex items-center gap-1 rounded-full bg-hotpink text-white px-3 py-1.5 text-[11px] font-bold active:scale-95"><RefreshCw className="h-3 w-3" /> Apply</button>
            </div>
          </div>
        )}
      </Glass>
      )}

      {/* Diet-synced note — small, only when arriving from the Diet tool */}
      {fromDiet && (
        <div ref={dietNoteRef} className="rounded-2xl border-2 border-emerald-300/70 p-3 animate-fade-in">
          <div className="flex items-start gap-2">
            <Sparkles className="h-3.5 w-3.5 shrink-0 mt-0.5 text-emerald-600" strokeWidth={2.2} />
            <div className="flex-1">
              <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">Your synced plan · {fromDiet} diet</p>
              <p className="mt-0.5 text-[11.5px] text-rose/80 leading-snug">We set up this week's meals to match your <b className="text-hotpink">{fromDiet}</b> diet ✿</p>
            </div>
            <button onClick={onDismissFromDiet} aria-label="Dismiss" className="text-rose/40 hover:text-hotpink"><X className="h-4 w-4" /></button>
          </div>
        </div>
      )}

      {/* ③  THE PLAN — right here, no longer pushed down */}
      {planEmpty ? (
        <SetupSteps
          phase={phase} intention={intention} setIntention={setIntention}
          owned={owned} goPantry={goPantry} onPlan={handleGenerate} generating={generating}
          dietSetup={dietSetup} pantrySkip={pantrySkip} onSkipPantry={onSkipPantry}
        />
      ) : (
        <div ref={planRef} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {DAYS.map((d, di) => {
            const isToday = d === todayDayName();
            return (
            <Glass key={d} className={["p-3 animate-scale-in", isToday ? "ring-2 ring-hotpink/50" : ""].join(" ")} style={{ animationDelay: `${di * 60}ms` }}>
              <div className="flex items-center justify-between mb-2.5">
                <p className="font-script text-xl text-hotpink flex items-center gap-1.5">
                  {d}
                  {isToday && <span className="rounded-full bg-hotpink text-white text-[8px] font-bold uppercase tracking-wide px-1.5 py-0.5">Today</span>}
                  {yogaDaySet.has(d) && !proteinBoostDays?.has(d) && (
                    <span className="rounded-full bg-violet-50 border border-violet-200 text-violet-600 text-[8px] font-bold uppercase tracking-wide px-1.5 py-0.5" title="Yoga day — keep it light, hydrating & anti-inflammatory">🧘 recovery</span>
                  )}
                </p>
                <button onClick={() => onRegen(d)} className="text-[11px] inline-flex items-center gap-1 text-rose/60 hover:text-hotpink transition-colors">
                  <RefreshCw className="h-3 w-3" /> redo day
                </button>
              </div>
              <div className="grid grid-cols-4 gap-1.5">
                {(["breakfast","lunch","dinner","snack"] as MealType[]).map((slot) => {
                  const id = plan[d]?.[slot];
                  const r = id ? RECIPES.find((x) => x.id === id) : null;
                  const portion = portionFor(d, slot as any);
                  const proteinBoosted = !!proteinBoostDays?.has(d) && slot === "dinner";
                  const fallback = MEAL_PHOTO_FALLBACK[slot] ?? '/images/meal-buddha.webp';
                  const photoSrc = r?.photo ? `/images/recipes/${r.photo}` : fallback;
                  return (
                    <div
                      key={slot}
                      className="relative rounded-xl overflow-hidden cursor-pointer active:scale-95 transition-transform"
                      style={{ aspectRatio: '3/4' }}
                      onClick={() => r && requestAnimationFrame(() => onOpen(r.id))}
                    >
                      {/* Photo */}
                      <img
                        src={photoSrc}
                        alt={r?.name ?? slot}
                        className="absolute inset-0 w-full h-full object-cover"
                        onError={(e) => { (e.currentTarget as HTMLImageElement).src = fallback; }}
                      />
                      {/* Subtle top-only gradient so badges stay readable */}
                      <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-transparent" />

                      {/* Meal type badge + portion (servings needed to hit target) */}
                      <div className="absolute top-1.5 left-1.5 flex flex-col items-start gap-0.5">
                        <span className="text-[8px] font-bold uppercase tracking-wide text-white/90 bg-black/35 rounded-full px-1.5 py-0.5">
                          {slot === 'breakfast' ? 'morn' : slot === 'dinner' ? 'eve' : slot}
                        </span>
                        {r && portion !== 1 && (
                          <span className="text-[7px] font-black text-white bg-emerald-500/90 rounded-full px-1 py-0.5" title={`${portion} servings to match your calorie target`}>×{portion}</span>
                        )}
                      </div>

                      {/* Protein badge */}
                      {proteinBoosted && (
                        <div className="absolute top-1.5 right-1.5">
                          <span className="text-[7px] font-bold uppercase text-white bg-hotpink rounded-full px-1 py-0.5">✿ PRO</span>
                        </div>
                      )}

                      {/* Pink glass bottom strip — full width */}
                      <div
                        className="absolute bottom-0 left-0 right-0 px-2 py-2.5 text-center"
                        style={{ background: 'rgba(219,39,119,0.62)', borderTop: '1px solid rgba(255,255,255,0.18)' }}
                      >
                        {r ? (
                          <p className="text-[9px] font-bold text-white leading-snug line-clamp-2">{r.name}</p>
                        ) : (
                          <p className="text-[9px] text-white/50 italic">—</p>
                        )}
                      </div>

                      {/* Swap button — stops propagation so tap doesn't also open recipe */}
                      <button
                        onClick={(e) => { e.stopPropagation(); onSwap(d, slot); }}
                        title="Swap meal"
                        className="absolute top-1.5 right-1.5 w-5 h-5 flex items-center justify-center rounded-full bg-white/20 backdrop-blur-sm text-white hover:bg-white/40 transition-colors"
                        style={{ display: proteinBoosted ? 'none' : undefined }}
                      >
                        <Shuffle className="h-2.5 w-2.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
              <DayTotals plan={plan} day={d} target={targets} />
            </Glass>
            );
          })}
        </div>
      )}

      {/* Phase-nutrition context — moved BELOW the plan so it never pushes it
          down. Supplementary "here's what this phase wants" note. */}
      {phaseSynced && (() => {
        const comment = trainingAwarenessComment({
          workoutDays: readWorkoutPlanDays().length,
          yogaDays: readYogaPlanDays().length,
          phase: normalizePhase(realPhase),
          goal: readDietProfile().goal,
        });
        const dp = toDietPhase(phase);
        const info = dp ? PHASE_INFO[dp] : null;
        return (
          <div className="rounded-2xl border-2 border-emerald-300/70 p-3.5 space-y-2 animate-fade-in">
            <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-emerald-600">
              <Sparkles className="h-3.5 w-3.5" strokeWidth={2.2} /> Why this week{info ? ` · ${info.label} phase` : ""}
            </p>
            {comment && <p className="text-[11.5px] text-rose/80 leading-snug">{comment}</p>}
            {info && (
              <>
                <p className="text-[11.5px] text-rose/75 leading-snug"><b className="text-rose/85">Lean into</b> {info.eat.slice(0, 5).join(", ")}; <b className="text-rose/85">go easy on</b> {info.avoid.slice(0, 3).join(", ")}.</p>
                <div className="flex flex-wrap gap-1.5">
                  {info.keyNutrients.map((n) => <span key={n} className="rounded-full bg-emerald-50 text-emerald-600 text-[10px] font-bold px-2 py-0.5 border border-emerald-200/70">{n}</span>)}
                </div>
              </>
            )}
          </div>
        );
      })()}

      {/* Sunday Prep CTA — only when a plan exists */}
      {!planEmpty && (
        <button
          onClick={goPrep}
          className="w-full flex items-center justify-between px-5 py-4 rounded-2xl active:scale-[.98] transition-transform"
          style={{
            background: 'linear-gradient(135deg,rgba(251,207,232,.9) 0%,rgba(244,114,182,.35) 100%)',
            border: '1px solid rgba(236,72,153,.30)',
            boxShadow: '0 4px 20px rgba(236,72,153,.28)',
            animation: 'ctaBreathe 2.8s ease-in-out infinite',
          }}
        >
          <div className="flex items-center gap-3">
            <span className="text-2xl">🍳</span>
            <div className="text-left">
              <p className="font-bold text-hotpink text-sm leading-tight">Batch-cook your week</p>
              <p className="text-xs text-rose/70 mt-0.5">Sunday Prep · ready in ~2 hours</p>
            </div>
          </div>
          <ChevronRight className="h-5 w-5 text-hotpink flex-shrink-0" />
        </button>
      )}
    </>
  );
}

function PhasePill({ phase, setPhase }: any) {
  const phases: CyclePhase[] = ["any", "period", "follicular", "ovulation", "luteal"];
  return (
    <select
      value={phase} onChange={(e) => setPhase(e.target.value as CyclePhase)}
      className="text-xs rounded-full bg-white/90 border border-petal/60 px-2 py-1 text-rose"
    >
      {phases.map((p) => <option key={p} value={p}>{p}</option>)}
    </select>
  );
}

/* ---------- Kids ---------- */

function KidsTab({ kidPlan, onGenerate, onOpen }: any) {
  const empty = Object.keys(kidPlan).length === 0;
  if (empty) {
    return (
      <EmptyState
        icon={Baby}
        title="Pack the cutest lunchbox"
        blurb="A balanced, packable Mon–Fri plan — no microwave needed, built from your pantry."
        cta="Build the week" onCta={onGenerate}
      />
    );
  }
  return (
    <Glass className="p-4 sm:p-5">
      <div className="flex items-center justify-between mb-3">
        <p className="font-script text-2xl text-hotpink">Kids — this week</p>
        <PinkBtn variant="ghost" onClick={onGenerate}><RefreshCw className="h-4 w-4" /> Refresh</PinkBtn>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
        {KID_DAYS.map((d, di) => {
          const id = kidPlan[d];
          const r = id ? RECIPES.find((x) => x.id === id) : null;
          const photo = MEAL_PHOTO_FALLBACK['lunchbox'] ?? '/images/meal-lunchbox.webp';
          return (
            <div
              key={d}
              className="relative rounded-2xl overflow-hidden cursor-pointer active:scale-95 transition-transform animate-scale-in"
              style={{ aspectRatio: '3/4', animationDelay: `${di * 60}ms` }}
              onClick={() => r && requestAnimationFrame(() => onOpen(r.id))}
            >
              {/* Photo */}
              <img src={photo} alt={r?.name ?? d} className="absolute inset-0 w-full h-full object-cover" />
              {/* Subtle top gradient for badge readability */}
              <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-transparent" />
              {/* Day badge */}
              <div className="absolute top-1.5 left-1.5">
                <span className="text-[9px] font-bold uppercase tracking-wide text-white/90 bg-black/35 rounded-full px-1.5 py-0.5">{d}</span>
              </div>
              {/* Swap */}
              <button
                onClick={(e) => { e.stopPropagation(); onGenerate(); }}
                title="Swap"
                className="absolute top-1.5 right-1.5 w-5 h-5 flex items-center justify-center rounded-full bg-white/20 text-white hover:bg-white/40 transition-colors"
              >
                <Shuffle className="h-2.5 w-2.5" />
              </button>
              {/* Pink glass bottom strip — full width */}
              <div
                className="absolute bottom-0 left-0 right-0 px-2 py-2.5 text-center"
                style={{ background: 'rgba(219,39,119,0.62)', borderTop: '1px solid rgba(255,255,255,0.18)' }}
              >
                <p className="text-[9px] font-bold text-white leading-snug line-clamp-2">{r?.name ?? '—'}</p>
              </div>
            </div>
          );
        })}
      </div>
    </Glass>
  );
}

/* ---------- Pantry ---------- */

function PantryTab({ pantry, togglePantry, extra, setExtra, onDone, stepHint }: any) {
  const [open, setOpen] = useState<string | null>("proteins");
  return (
    <>
      {stepHint && (
        <Glass className="p-4">
          <p className="font-script text-2xl text-hotpink">Step 1 — Build your pantry</p>
          <p className="text-sm text-rose/80 mt-1">Tap everything you have at home. We remember it, so you'll only do quick updates next week.</p>
        </Glass>
      )}
      <div className="grid gap-2 sm:grid-cols-2">
        {PANTRY.map((cat) => {
          const checked = pantry[cat.key] || [];
          const isOpen = open === cat.key;
          return (
            <Glass key={cat.key} className="p-3">
              <button onClick={() => setOpen(isOpen ? null : cat.key)} className="w-full flex items-center justify-between gap-2">
                <span className="flex items-center gap-2">
                  <span className="grid h-8 w-8 place-items-center rounded-full bg-blush text-hotpink">
                    <cat.icon className="h-4 w-4" strokeWidth={1.8} />
                  </span>
                  <span className="text-sm font-semibold text-rose">{cat.label}</span>
                  {cat.isHome && <span className="text-[10px] uppercase font-bold text-hotpink/70">home</span>}
                </span>
                <span className="text-xs text-rose/70 flex items-center gap-1">
                  {checked.length}/{cat.items.length}
                  {isOpen ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                </span>
              </button>
              {isOpen && (
                <div className="mt-2">
                  <div className="flex flex-wrap gap-1.5">
                    {cat.items.map((item) => {
                      const on = checked.includes(item);
                      return (
                        <button
                          key={item} onClick={() => togglePantry(cat.key, item)}
                          className={[
                            "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs border transition",
                            on ? "bg-hotpink text-white border-hotpink" : "bg-white/80 text-rose border-petal/60 hover:bg-blush",
                          ].join(" ")}
                        >
                          {on && <Check className="h-3 w-3" />} {item}
                        </button>
                      );
                    })}
                  </div>
                  <input
                    value={extra[cat.key] || ""}
                    onChange={(e) => setExtra({ ...extra, [cat.key]: e.target.value })}
                    placeholder="I also have…"
                    className="mt-2 w-full rounded-full bg-white/90 px-3 py-1.5 text-xs text-rose border border-petal/60 placeholder:text-rose/40 outline-none focus:ring-2 focus:ring-hotpink/30"
                  />
                </div>
              )}
            </Glass>
          );
        })}
      </div>
      {stepHint && (
        <div className="flex justify-end"><PinkBtn onClick={onDone}>Done — next step <ChevronRight className="h-4 w-4" /></PinkBtn></div>
      )}
    </>
  );
}

/* ---------- Shopping ---------- */

function ShopTab({ plan, owned, checked, setChecked, planEmpty, goWeek }: any) {
  // Ingredients pushed here from the cross-tool Recovery Fuel cards.
  const extras = useMemo(() => readShoppingExtras(), []);
  const items = useMemo(() => {
    const map = new Map<string, { item: string; qty: string; section: string; missing: boolean }>();
    Object.values(plan as Record<string, Record<MealType, string | null>>).forEach((day) => {
      Object.values(day).forEach((id) => {
        if (!id) return;
        const r = RECIPES.find((x) => x.id === id);
        r?.ingredients.forEach((ing) => {
          const section = PANTRY.find((c) => c.key === ing.category)?.storeSection || "Pantry";
          const has = owned.has(ing.item.toLowerCase());
          if (!has && !map.has(ing.item)) {
            map.set(ing.item, { item: ing.item, qty: ing.qty, section, missing: true });
          }
        });
      });
    });
    // Recovery add-ons — ingredients sent from Workout/Yoga fuel cards.
    extras.forEach((it: string) => {
      if (!owned.has(it.toLowerCase()) && !map.has(it)) {
        map.set(it, { item: it, qty: "", section: "Recovery add-ons", missing: true });
      }
    });
    // staples checklist (home needs + key categories)
    PANTRY.forEach((cat) => {
      cat.items.forEach((it) => {
        const key = `staple:${it}`;
        if (!map.has(key) && !owned.has(it.toLowerCase())) {
          map.set(key, { item: it, qty: "", section: cat.storeSection, missing: false });
        }
      });
    });
    return Array.from(map.values());
  }, [plan, owned, extras]);

  const grouped = useMemo(() => {
    const g: Record<string, typeof items> = {};
    items.forEach((i) => { (g[i.section] ||= []).push(i); });
    return g;
  }, [items]);

  const toggle = (item: string) => {
    setChecked((c: string[]) => (c.includes(item) ? c.filter((x) => x !== item) : [...c, item]));
  };

  const shareText = useMemo(() => {
    const lines = ["🌸 Bloom shopping list", ""];
    Object.entries(grouped).forEach(([section, list]) => {
      const active = list.filter((i) => i.missing || checked.includes(i.item));
      if (!active.length) return;
      lines.push(`— ${section} —`);
      active.forEach((i) => lines.push(`• ${i.item}${i.qty ? ` (${i.qty})` : ""}`));
      lines.push("");
    });
    return lines.join("\n");
  }, [grouped, checked]);

  const onShare = () => {
    if (navigator.share) navigator.share({ text: shareText }).catch(() => {});
    else window.open(`https://wa.me/?text=${encodeURIComponent(shareText)}`, "_blank");
  };
  const onCopy = () => navigator.clipboard?.writeText(shareText);

  if (planEmpty) {
    return (
      <EmptyState icon={ShoppingBag} title="Nothing to shop yet"
        blurb="Plan your week first — I'll auto-build a clean grocery list grouped by store section."
        cta="Go to This Week" onCta={goWeek} />
    );
  }

  return (
    <Glass className="p-4 sm:p-5">
      <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
        <p className="font-script text-2xl text-hotpink">Shopping list</p>
        <div className="flex gap-2">
          <PinkBtn variant="outline" onClick={onCopy}><Copy className="h-4 w-4" /> Copy</PinkBtn>
          <PinkBtn onClick={onShare}><Share2 className="h-4 w-4" /> Share</PinkBtn>
        </div>
      </div>
      <div className="space-y-3">
        {Object.entries(grouped).map(([section, list]) => (
          <div key={section}>
            <p className="text-xs uppercase font-bold text-hotpink mb-1">{section}</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
              {list.map((i) => {
                const on = checked.includes(i.item);
                return (
                  <label key={i.item + i.section} className={`flex items-center gap-2 rounded-xl px-2 py-1.5 text-sm cursor-pointer ${on ? "bg-blush line-through text-rose/50" : "hover:bg-blush/50 text-rose"}`}>
                    <input type="checkbox" checked={on} onChange={() => toggle(i.item)} className="accent-hotpink h-4 w-4" />
                    <span className="flex-1">{i.item} {i.qty && <span className="text-xs text-rose/60">({i.qty})</span>}</span>
                    {i.missing && <span className="text-[10px] uppercase font-bold text-hotpink">recipe</span>}
                  </label>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </Glass>
  );
}

/* ---------- Sunday Prep ---------- */

function SundayPrepTab({ plan, planEmpty, goWeek }: any) {
  if (planEmpty) {
    return <EmptyState icon={Sparkles} title="Cook once, eat all week"
      blurb="Sunday Prep gives you a step-by-step order to batch-cook your entire week in ~2 hours. Plan your week first and I'll build your prep guide automatically."
      cta="Plan my week" onCta={goWeek} />;
  }
  const recipes = Object.values(plan as Record<string, Record<MealType, string | null>>)
    .flatMap((d) => Object.values(d).filter(Boolean) as string[])
    .map((id) => RECIPES.find((r) => r.id === id)!)
    .filter(Boolean);
  const oven = recipes.filter((r) => r.cookMin >= 15);
  const stove = recipes.filter((r) => r.cookMin > 0 && r.cookMin < 15);
  const cold = recipes.filter((r) => r.cookMin === 0);
  return (
    <div className="space-y-3">
      {/* Explainer */}
      <Glass className="p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <span className="text-3xl" aria-hidden>🍳</span>
          <div>
            <p className="font-script text-2xl text-hotpink leading-tight">Cook once, eat all week</p>
            <p className="mt-1 text-sm text-rose/80 leading-snug">
              Sunday Prep is your batch-cooking guide. Instead of cooking every day, you spend ~2 hours on Sunday
              preparing everything at once — then your fridge is stocked for the whole week.
            </p>
            <p className="mt-2 text-xs text-rose/60">
              The recipes from your week plan are sorted in the most efficient order:
              start the oven first (slowest), then use the stovetop while it heats, finish with quick cold prep.
            </p>
          </div>
        </div>
      </Glass>

      {/* Steps */}
      <Glass className="p-4 sm:p-5">
        <p className="font-script text-xl text-hotpink mb-3">Your prep order this week</p>
        <ol className="space-y-3">
          <PrepStep n={1} title="Start the oven — longest cook" items={oven.map((r) => r.name)} />
          <PrepStep n={2} title="Stovetop while oven runs" items={stove.map((r) => r.name)} />
          <PrepStep n={3} title="Cold prep & assembly" items={cold.map((r) => r.name)} />
          <PrepStep n={4} title="Pack & label" items={["Portion into containers", "Label with day + meal", "Fridge (≤3 days) or freezer the rest"]} />
        </ol>
      </Glass>
    </div>
  );
}
function PrepStep({ n, title, items }: { n: number; title: string; items: string[] }) {
  return (
    <li className="rounded-2xl bg-blush/60 p-3">
      <div className="flex items-center gap-2">
        <span className="grid h-7 w-7 place-items-center rounded-full bg-hotpink text-white text-xs font-bold">{n}</span>
        <p className="font-semibold text-rose">{title}</p>
      </div>
      <ul className="mt-1.5 ml-9 space-y-1 text-sm text-rose/90 list-disc">
        {items.length ? items.map((i, idx) => <li key={idx}>{i}</li>) : <li className="list-none text-rose/50 -ml-4">nothing in this slot</li>}
      </ul>
    </li>
  );
}

/* ---------- Conservation ---------- */

function ConservationTab({ freezer, setFreezer }: any) {
  const [name, setName] = useState("");
  const [date, setDate] = useState("");
  const [fname, setFname] = useState("");
  const [fdate, setFdate] = useState("");
  const today = new Date();

  const check = (n: string, d: string) => {
    const days = (today.getTime() - new Date(d).getTime()) / 86400000;
    const t = STORAGE_TABLE.find((s) => n.toLowerCase().includes(s.keyword)) || { fridgeDays: 3 };
    return { days: Math.floor(days), safe: days <= t.fridgeDays, limit: t.fridgeDays };
  };

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <Glass className="p-4">
        <p className="font-script text-2xl text-hotpink">Still good?</p>
        <p className="text-xs text-rose/70 mt-0.5">Enter a dish + when you cooked it.</p>
        <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-stretch">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. lentil stew"
            className="w-full min-w-0 flex-1 rounded-full bg-white/90 px-3 py-2 text-sm text-rose border border-petal/60 outline-none focus:ring-2 focus:ring-hotpink/30 placeholder:text-rose/40" />
          <div className="w-full sm:w-40 shrink-0">
            <CuteDatePicker value={date} onChange={setDate} placeholder="When cooked" />
          </div>
        </div>
        {name && date && (() => {
          const r = check(name, date);
          return (
            <div className={`mt-3 rounded-2xl p-3 ${r.safe ? "bg-blush" : "bg-hotpink/15"}`}>
              <p className={`font-semibold ${r.safe ? "text-hotpink" : "text-magenta"}`}>
                {r.safe ? "Safe to eat ✿" : "Better to toss it"}
              </p>
              <p className="text-xs text-rose/80 mt-0.5">
                {r.days} day(s) old · limit ~{r.limit} day(s). When in doubt, throw it out.
              </p>
            </div>
          );
        })()}
      </Glass>

      <Glass className="p-4">
        <p className="font-script text-2xl text-hotpink">Freezer vault</p>
        <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-stretch">
          <input value={fname} onChange={(e) => setFname(e.target.value)} placeholder="dish name"
            className="w-full min-w-0 flex-1 rounded-full bg-white/90 px-3 py-2 text-sm text-rose border border-petal/60 outline-none focus:ring-2 focus:ring-hotpink/30 placeholder:text-rose/40" />
          <div className="flex gap-2 sm:shrink-0">
            <div className="flex-1 sm:w-36">
              <CuteDatePicker value={fdate} onChange={setFdate} placeholder="Frozen on" />
            </div>
            <PinkBtn onClick={() => { if (fname && fdate) { setFreezer([...freezer, { name: fname, date: fdate }]); setFname(""); setFdate(""); } }}>
              <Plus className="h-4 w-4" />
            </PinkBtn>
          </div>
        </div>
        <ul className="mt-3 space-y-1.5">
          {freezer.length === 0 && <li className="text-xs text-rose/60">No frozen dishes yet.</li>}
          {freezer.map((f: any, i: number) => (
            <li key={i} className="flex items-center justify-between gap-2 rounded-xl bg-blush/60 px-3 py-1.5 text-sm text-rose min-w-0">
              <span className="truncate min-w-0">❄ {f.name} <span className="text-xs text-rose/60">— {f.date}</span></span>
              <button onClick={() => setFreezer(freezer.filter((_: any, j: number) => j !== i))} className="text-rose/60 hover:text-hotpink shrink-0">
                <X className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ul>
      </Glass>
    </div>
  );
}

/* ---------- Favorites ---------- */

const MEAL_EMOJI: Record<string, string> = {
  breakfast: "🌅", lunch: "🥗", dinner: "🍽️", snack: "🍓", lunchbox: "🎀",
};
const CUISINE_GRADIENT: Record<string, string> = {
  Mediterranean: "from-amber-50 to-orange-100",
  Nordic: "from-sky-50 to-blue-100",
  Asian: "from-green-50 to-emerald-100",
  "Middle Eastern": "from-yellow-50 to-amber-100",
  African: "from-orange-50 to-red-100",
  Latin: "from-rose-50 to-pink-100",
};
function recipeImg(r: Recipe): string | null {
  if (r.image) return r.image;
  if (r.photo) return `/images/${r.photo}`;
  return null;
}

function FavsTab({ favorites, ratings, setRatings, onOpen, toggleFav }: any) {
  const list = RECIPES.filter((r) => favorites.includes(r.id));
  if (!list.length) {
    return <EmptyState icon={Heart} title="No favorites yet"
      blurb="Open any recipe and tap the heart. Loved meals get boosted in future weeks."
      cta="Browse this week" onCta={() => {}} />;
  }
  return (
    <div className="grid grid-cols-3 gap-2">
      {list.map((r) => {
        const fallback = MEAL_PHOTO_FALLBACK[r.mealType] ?? '/images/meal-buddha.webp';
        const photoSrc = recipeImg(r) ?? fallback;
        return (
          <div key={r.id} className="flex flex-col gap-1">
            {/* Photo tile */}
            <div
              className="relative rounded-xl overflow-hidden cursor-pointer active:scale-95 transition-transform"
              style={{ aspectRatio: '1/1' }}
              onClick={() => requestAnimationFrame(() => onOpen(r.id))}
            >
              <img
                src={photoSrc} alt={r.name}
                className="absolute inset-0 h-full w-full object-cover"
                onError={(e) => { e.currentTarget.src = fallback; }}
              />
              <div className="absolute inset-0 bg-gradient-to-b from-black/25 via-transparent to-transparent" />
              {/* Heart — remove from favs */}
              <button
                onClick={(e) => { e.stopPropagation(); toggleFav(r.id); }}
                className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-black/35 flex items-center justify-center"
              >
                <Heart className="h-2.5 w-2.5 text-white fill-white" />
              </button>
              {/* Pink glass name strip */}
              <div
                className="absolute bottom-0 left-0 right-0 px-2 py-2 text-center"
                style={{ background: 'rgba(219,39,119,0.62)', borderTop: '1px solid rgba(255,255,255,0.18)' }}
              >
                <p className="text-[9px] font-bold text-white leading-snug line-clamp-2">{r.name}</p>
              </div>
            </div>
            {/* Rating pills */}
            <div className="flex gap-0.5 justify-center">
              {(["love","ok","never"] as const).map((v) => (
                <button key={v} onClick={() => setRatings({ ...ratings, [r.id]: v })}
                  className={`text-[8px] rounded-full px-1.5 py-0.5 border leading-none ${ratings[r.id] === v ? "bg-hotpink text-white border-hotpink" : "border-petal/60 text-rose/70"}`}>
                  {v}
                </button>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ---------- Clever shortcuts ---------- */

function CleverRow({ onOpen, owned }: { onOpen: (id: string) => void; owned: Set<string> }) {
  const surprise = () => {
    const r = RECIPES[Math.floor(Math.random() * RECIPES.length)];
    onOpen(r.id);
  };
  const quick = () => {
    const r = RECIPES.filter((x) => x.prepMin + x.cookMin <= 20)
      .sort((a, b) => scoreRecipe(b, owned) - scoreRecipe(a, owned))[0];
    if (r) onOpen(r.id);
  };
  const month = new Date().getMonth();
  const season = SEASONAL[month] || [];
  return (
    <Glass className="p-4">
      <p className="font-script text-xl text-hotpink">Clever shortcuts</p>
      <div className="mt-2 flex flex-wrap gap-2">
        <PinkBtn variant="outline" onClick={quick}><Clock className="h-4 w-4" /> I have 10 minutes</PinkBtn>
        <PinkBtn variant="outline" onClick={surprise}><Sparkles className="h-4 w-4" /> Surprise me</PinkBtn>
        <span className="inline-flex items-center gap-1 text-xs text-rose/80 px-3 py-2 rounded-full bg-blush">
          In season: <b className="text-hotpink">{season.join(", ")}</b>
        </span>
      </div>
    </Glass>
  );
}

/* ---------- Recipe Sheet ---------- */

function RecipeSheet({ id, onClose, favorites, toggleFav, ratings, setRatings }: any) {
  const r = RECIPES.find((x) => x.id === id);
  if (!r) return null;
  const fav = favorites.includes(r.id);
  const fallback  = MEAL_PHOTO_FALLBACK[r.mealType] ?? '/images/meal-buddha.webp';
  const photoSrc  = fallback;

  // Guard: ignore backdrop clicks for the first 80ms after mount so the
  // opening tap doesn't immediately close the modal via event propagation.
  const [canClose, setCanClose] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setCanClose(true), 200);
    return () => clearTimeout(t);
  }, []);

  return (
    /* Backdrop — z-[200] to sit above the bottom nav (z-50) */
    <div
      className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.55)' }}
      onClick={() => canClose && onClose()}
    >
      {/* Sheet — no animation class, render immediately fully visible */}
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full sm:max-w-md max-h-[85vh] overflow-y-auto rounded-t-[2rem] sm:rounded-[2rem] shadow-2xl"
        style={{ background: '#ffffff' }}
      >
        {/* Hero photo */}
        <div className="relative h-52 sm:h-64 overflow-hidden rounded-t-[2rem] sm:rounded-t-[2rem]">
          <img
            src={photoSrc}
            alt={r.name}
            className="w-full h-full object-cover"
            onError={(e) => { (e.currentTarget as HTMLImageElement).src = fallback; }}
          />
          {/* gradient so text is readable */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20" />

          {/* ✕ close — top right */}
          <button
            onClick={onClose}
            className="absolute top-3 right-3 w-9 h-9 flex items-center justify-center rounded-full bg-black/40 backdrop-blur-md text-white hover:bg-black/60 transition-colors"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>

          {/* Recipe name overlaid on photo */}
          <div className="absolute bottom-0 left-0 right-0 p-4">
            <h3 className="font-script text-3xl text-white leading-tight drop-shadow">{r.name}</h3>
            <p className="mt-0.5 text-xs text-white/80">
              {r.vibe} · {r.prepMin + r.cookMin} min · serves {r.servings} · {r.difficulty} · {r.cost}
            </p>
          </div>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4">

          {/* Macros row */}
          <div className="grid grid-cols-4 gap-2 text-center">
            {[
              { label: 'Cal', value: r.macros.calories },
              { label: 'Protein', value: `${r.macros.protein}g` },
              { label: 'Carbs', value: `${r.macros.carbs}g` },
              { label: 'Fat', value: `${r.macros.fat}g` },
            ].map(({ label, value }) => (
              <div key={label} className="rounded-xl bg-blush/60 py-2 px-1">
                <p className="text-[10px] text-rose/60 uppercase font-semibold">{label}</p>
                <p className="text-sm font-bold text-hotpink">{value}</p>
              </div>
            ))}
          </div>

          {/* Equipment */}
          {r.equipment && r.equipment.length > 0 && (
            <div>
              <p className="text-xs uppercase font-bold text-hotpink tracking-wider mb-1.5">You'll need</p>
              <div className="flex flex-wrap gap-1.5">
                {r.equipment.map((e: string) => (
                  <span key={e} className="rounded-full bg-blush/70 border border-petal/50 px-2.5 py-0.5 text-[11px] font-semibold text-magenta">{e}</span>
                ))}
              </div>
            </div>
          )}

          {/* Ingredients */}
          <div>
            <p className="text-xs uppercase font-bold text-hotpink tracking-wider mb-1.5">Ingredients · makes {r.servings} serving{r.servings === 1 ? "" : "s"}</p>
            <ul className="space-y-1">
              {r.ingredients.map((i) => (
                <li key={i.item} className="flex gap-2 text-sm text-rose">
                  <span className="text-hotpink mt-0.5">•</span>
                  <span><b className="font-medium">{i.qty}</b> {i.item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Steps */}
          <div>
            <p className="text-xs uppercase font-bold text-hotpink tracking-wider mb-1.5">Steps</p>
            <ol className="space-y-2">
              {r.steps.map((s, i) => (
                <li key={i} className="flex gap-2.5 text-sm text-rose">
                  <span className="w-5 h-5 flex-shrink-0 rounded-full bg-hotpink text-white text-[10px] font-bold flex items-center justify-center mt-0.5">{i + 1}</span>
                  <span className="leading-snug"><StepText text={s} /></span>
                </li>
              ))}
            </ol>
          </div>

          {/* Storage */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="rounded-xl bg-blush/60 p-2.5">
              <p className="font-bold text-hotpink mb-0.5">Keeps</p>
              <p className="text-rose">{r.conservation.fridgeDays}d fridge{r.conservation.freezerWeeks ? ` · ${r.conservation.freezerWeeks}w freezer` : ''}</p>
            </div>
            <div className="rounded-xl bg-blush/60 p-2.5">
              <p className="font-bold text-hotpink mb-0.5">Container</p>
              <p className="text-rose">{r.conservation.container || 'Airtight'}</p>
            </div>
            {r.batchTip && (
              <div className="rounded-xl bg-blush/60 p-2.5 col-span-2">
                <p className="font-bold text-hotpink mb-0.5">Batch tip</p>
                <p className="text-rose">{r.batchTip}</p>
              </div>
            )}
            {r.substitutionTip && (
              <div className="rounded-xl bg-blush/60 p-2.5 col-span-2">
                <p className="font-bold text-hotpink mb-0.5">Easy swap</p>
                <p className="text-rose">{r.substitutionTip}</p>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 pt-1 pb-2">
            <PinkBtn onClick={() => toggleFav(r.id)} variant={fav ? "solid" : "outline"}>
              <Heart className={`h-4 w-4 ${fav ? 'fill-white' : ''}`} /> {fav ? 'Loved ✨' : 'Save'}
            </PinkBtn>
            <div className="flex items-center gap-1 ml-auto">
              {(['love', 'ok', 'never'] as const).map((v) => (
                <button
                  key={v}
                  onClick={() => setRatings({ ...ratings, [r.id]: v })}
                  className={`text-[11px] rounded-full px-2.5 py-1 border transition-colors ${ratings[r.id] === v ? 'bg-hotpink text-white border-hotpink' : 'border-petal/60 text-rose hover:border-hotpink/40'}`}
                >
                  {v}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}