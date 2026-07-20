
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { isGuided } from "@/lib/guidedSetup";
import { useGuided, GuidedFinishBar, GuidedFocusHero } from "@/components/bloom/GuidedFocus";
import { isPremium, openPaywall, usePremium } from "@/lib/entitlements";
import { LockChip } from "@/components/bloom/premium/PremiumKit";
import { SpotlightCoach } from "@/components/bloom/SpotlightCoach";
import { NotifCard } from "@/components/bloom/NotifCard";
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
  ShoppingBag,
  Calendar,
  Apple,
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
  Target,
  Leaf,
  Sunrise,
  Sun,
} from "lucide-react";
import { CuteDatePicker } from "@/components/bloom/CuteDatePicker";
import { PickerField } from "@/components/bloom/PickerField";
import {
  RECIPES,
  PANTRY,
  INTENTIONS,
  PHASE_INFO,
  DAYS,
  SEASONAL,
  passesMyRules,
  readDietProfile,
  hasDietSetup,
  updateDietProfile,
  scaleQuantity,
  recipeImageSrc,
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



import { readTodaySymptoms, readWorkoutPlanDays, readYogaPlanDays, readShoppingExtras, resetToolState, readMonthPlan, currentMealWeekIndex, MEAL_WEEKS, MEALS_MONTH_KEY, type MonthPlan } from "@/lib/crossToolData";
import { flushCloudSync } from "@/lib/cloudSync";
import { trainingAwarenessComment, normalizePhase } from "@/components/bloom/trainingFuel";
import { readCyclePhase, hasCycleSettings, readCycleSettings, phaseForDay, toDietPhase, PHASE_LABEL } from "@/components/bloom/cyclePhase";
import { readLaunch, LAUNCH_MEAL_KEY } from "@/components/bloom/phasePlan";
import { CyclePhasePill } from "@/components/bloom/CyclePhasePill";
import { todayISO } from "@/lib/localDate";
import { computeTargets, movementFoodLine, sumMacros, calorieVerdict, slotBudget, portionForRecipe, type TargetBreakdown } from "@/lib/nutritionTargets";
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
  favorites: "bloom:meals-favorites",  // string[]
  ratings: "bloom:meals-ratings",      // {id: "love"|"ok"|"never"}
  shopChecked: "bloom:meals-shop-checked",
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

type TabKey = "week" | "pantry" | "shop" | "favs";
const TABS: { key: TabKey; label: string; icon: any }[] = [
  { key: "week", label: "This Week", icon: Calendar },
  { key: "pantry", label: "My Pantry", icon: Apple },
  { key: "shop", label: "Shopping List", icon: ShoppingBag },
  { key: "favs", label: "Favorites", icon: Heart },
];

const TAB_HERO: Record<TabKey, { title: string; subtitle: string }> = {
  week:     { title: "Meal Planner",    subtitle: "cook with love, glow all week ✿" },
  pantry:   { title: "My Pantry",       subtitle: "know what you have, waste less 🌿" },
  shop:     { title: "Shopping List",   subtitle: "grab only what you need ✓" },
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

/** Meals tabs reserved for Bloom+ (only "This Week" browsing is free). */
const PREMIUM_MEALS_TABS = new Set<TabKey>(["pantry", "shop", "favs"]);

export default function MealsPage() {
  const [tab, setTab] = useState<TabKey>("week");
  const premiumPlan = usePremium();
  // Guided-setup focus mode: narrow hero + this week + one "Finish on Today" action.
  const guided = useGuided();
  const cyclePhaseNow = readCyclePhase();
  const guidedPhaseLabel = cyclePhaseNow && cyclePhaseNow !== "any" ? PHASE_LABEL[cyclePhaseNow] : undefined;
  // While guided, keep her on This Week — never the premium organiser tabs.
  useEffect(() => { if (guided && tab !== "week") setTab("week"); }, [guided, tab]);
  // Free users browse & plan This Week manually; the organiser tabs are Bloom+.
  const goToTab = (key: TabKey) => {
    if (!premiumPlan && PREMIUM_MEALS_TABS.has(key)) { openPaywall("meals"); return; }
    setTab(key);
  };
  // Banner shown when the week was just set up from the Diet tool.
  const [fromDiet, setFromDiet] = useState<string | null>(() => { try { return localStorage.getItem("bloom:meals-from-diet"); } catch { return null; } });
  const dismissFromDiet = () => { try { localStorage.removeItem("bloom:meals-from-diet"); } catch {} setFromDiet(null); };
  const [pantry, setPantry] = useLS<Record<string, string[]>>(LS.pantry, {});
  const [extra, setExtra] = useLS<Record<string, string>>(LS.extra, {});
  const [intention, setIntention] = useLS<Intention>(LS.intention, "light");
  // ── The 4-week month. `selOffset` (0..3) is how many weeks ahead she's
  //    looking; the stored cycle-week index rotates with the real calendar so a
  //    month of distinct weeks repeats. `plan` = the week she's viewing. ──
  const initialMonth = useMemo(() => readMonthPlan(), []);
  const [month, setMonth] = useLS<MonthPlan>(MEALS_MONTH_KEY, initialMonth);
  const [selOffset, setSelOffset] = useState(0);
  const curWeekIdx = currentMealWeekIndex();
  const selWeek = (curWeekIdx + selOffset) % MEAL_WEEKS;
  const plan = month.plans[selWeek] ?? {};
  const weekPortions = month.portions[selWeek] ?? {};
  // Writers — always target the week she's viewing, updating plan &/or portions
  // together so the one month store never forks.
  const setPlan = (v: Record<string, Record<MealType, string | null>>) =>
    setMonth((m) => { const plans = m.plans.slice(); plans[selWeek] = v; return { ...m, plans }; });
  const setWeekPortions = (portions: Record<string, Partial<Record<MealType, number>>>) =>
    setMonth((m) => { const p = m.portions.slice(); p[selWeek] = portions as any; return { ...m, portions: p }; });
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
  const [favorites, setFavorites] = useLS<string[]>(LS.favorites, []);
  const [ratings, setRatings] = useLS<Record<string, "love" | "ok" | "never">>(LS.ratings, {});
  const [shopChecked, setShopChecked] = useLS<string[]>(LS.shopChecked, []);
  const [step, setStep] = useLS<number>(LS.step, 0); // 0=welcome,1=pantry,2=vibe,3=ready
  // "Continue without pantry" — user opted to plan from the whole library.
  const [pantrySkip, setPantrySkip] = useLS<boolean>("bloom:meals-pantry-skip", false);
  const [phase, setPhase] = useLS<CyclePhase>(LS.phase as any, "any");
  const [openRecipe, setOpenRecipe] = useState<{ id: string; portion: number } | null>(null);
  // Open a recipe, optionally at a planned portion so ingredients & macros show
  // scaled to what the plan actually serves.
  const openRecipeAt = (id: string, portion = 1) => setOpenRecipe({ id, portion });
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
    if (recipeId) setOpenRecipe({ id: recipeId, portion: 1 });

    return () => window.removeEventListener("storage", refresh);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const owned = useMemo(() => pantrySet(pantry), [pantry]);
  // "Empty" = the whole month has no meals yet (drives setup vs. plan view).
  const planEmpty = month.plans.every((w) => Object.keys(w).length === 0);
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

  // Build a whole MONTH — 4 distinct weeks. Each week avoids the recipes used by
  // the previous weeks (falling back to the full pool if variety runs low) so a
  // month genuinely feels different week to week, then repeats.
  const buildMonth = (useIntention: Intention, usePhase: CyclePhase): MonthPlan => {
    const target = computeTargets(true).calories;
    const plans: MonthPlan["plans"] = [];
    const portions: MonthPlan["portions"] = [];
    const usedSoFar = new Set<string>();
    for (let i = 0; i < MEAL_WEEKS; i++) {
      const fresh = myRulesPool.filter((r) => !usedSoFar.has(r.id));
      const pool = fresh.length >= 28 ? fresh : myRulesPool; // don't starve a slot
      const { plan: p, portions: pt } = buildWeek(pool, useIntention, usePhase, owned, ratings, proteinBoostDays, target);
      plans.push(p);
      portions.push(pt);
      Object.values(p).forEach((d) => Object.values(d).forEach((id) => { if (id) usedSoFar.add(id as string); }));
    }
    return { plans, portions };
  };

  const generateWeek = () => {
    setMonth(buildMonth(intention, phase));
    setSelOffset(0);
    markMealsTuned();
    ownThisPlan(); // built here → the user's own month (Diet won't overwrite it)
    setStep(3);
    setTab("week");
  };
  // One-tap "make it match my phase": switch the vibe to Cycle-sync, lock the
  // real phase and build the whole month — passing values explicitly.
  const generatePhasePlan = () => {
    const real = readCyclePhase();
    const ph = (real && real !== "any" ? real : phase) as CyclePhase;
    setIntention("cycle");
    setPhase(ph);
    setMonth(buildMonth("cycle", ph));
    setSelOffset(0);
    markMealsTuned();
    ownThisPlan();
    setStep(3);
    setTab("week");
  };

  // Re-roll ONLY the week she's viewing, avoiding recipes used in the other
  // three weeks so the month stays varied.
  const regenerateWeek = () => {
    const target = computeTargets(true).calories;
    const usedElsewhere = new Set<string>();
    month.plans.forEach((wk, i) => { if (i !== selWeek) Object.values(wk).forEach((d) => Object.values(d).forEach((id) => { if (id) usedElsewhere.add(id as string); })); });
    const fresh = myRulesPool.filter((r) => !usedElsewhere.has(r.id));
    const pool = fresh.length >= 28 ? fresh : myRulesPool;
    const { plan: p, portions } = buildWeek(pool, intention, phase, owned, ratings, proteinBoostDays, target);
    setPlan(p);
    setWeekPortions(portions);
    markMealsTuned();
    ownThisPlan();
  };

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
      const f = portionForRecipe(r.macros.calories || 0, type, target);
      const wk = { ...weekPortions };
      const d = { ...(wk[day] ?? {}) };
      if (!f || f === 1) delete (d as any)[type]; else (d as any)[type] = f;
      wk[day] = d;
      setWeekPortions(wk);
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
    // Replace this day's portions in the viewed week (whole day at once).
    setWeekPortions({ ...weekPortions, [day]: dayPortions });
    clearMealsTuned();
    ownThisPlan();
  };

  const toggleFav = (id: string) => {
    setFavorites((f) => (f.includes(id) ? f.filter((x) => x !== id) : [...f, id]));
  };

  return (
    <>
    <div className="relative animate-fade-in">
      {/* Guided-setup focus: narrow hero + one Finish-on-Today action, no tabs. */}
      {guided && (
        <>
          <GuidedFocusHero label="Meals" phaseLabel={guidedPhaseLabel} image="/images/meals-hero-new.webp" />
          <GuidedFinishBar toolLabel="Meals" phaseLabel={guidedPhaseLabel} hint="Your week of meals is set — the rest fills in on Today." className="mb-3" />
        </>
      )}
      {/* HERO — compact, matches Budget Planner height */}
      {!guided && (
      <div className="relative isolate min-h-[128px] sm:min-h-[168px] mb-3 animate-card-pop-in">
        {/* base pink wash */}
        <div aria-hidden className="pointer-events-none absolute left-1/2 -translate-x-1/2 w-screen -top-8 -z-20 h-[500px] bg-gradient-to-b from-[#FFD3E8] via-[#FFE4F1] to-transparent" />
        {/* photo — dissolves toward the bottom into the page */}
        <div
          aria-hidden
          className="pointer-events-none absolute left-1/2 -translate-x-1/2 w-screen -top-8 -z-10 h-[300px] overflow-hidden"
          style={{ WebkitMaskImage: "linear-gradient(to bottom, #000 0%, #000 28%, transparent 82%)", maskImage: "linear-gradient(to bottom, #000 0%, #000 28%, transparent 82%)" }}
        >
          <img src="/images/meals-hero-new.webp" alt="" className="animate-hero-breathe h-full w-full object-cover object-[60%_28%]" referrerPolicy="no-referrer" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#FFE4F1] via-[#FFE4F1]/55 to-transparent" />
        </div>

        {/* content */}
        <div className="relative z-[1] flex flex-col gap-3 sm:gap-4 pt-1 pb-1">
          {/* Title block — left-anchored */}
          <div className="flex items-start justify-between gap-2">
            <div className="max-w-[62%]">
              <h1 className="animate-fade-in font-script text-3xl sm:text-5xl lg:text-6xl text-hotpink leading-none drop-shadow-[0_2px_6px_oklch(1_0_0/0.55)]" style={{ animationDelay: '0ms' }}>{TAB_HERO[tab].title}</h1>
              <p className="animate-fade-in mt-0.5 font-script text-lg sm:text-2xl text-rose/90 leading-tight" style={{ animationDelay: '200ms' }}>{TAB_HERO[tab].subtitle}</p>
              <CyclePhasePill className="mt-1.5" />
            </div>
            {/* Reset + Guide chips — light glass */}
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
                className="inline-flex items-center gap-1 rounded-full bg-white/70 backdrop-blur border border-petal/60 px-2.5 py-1.5 text-[11px] sm:text-xs text-hotpink font-semibold transition hover:bg-white active:scale-95 shadow-sm shadow-hotpink/10"
              >
                <RotateCcw className="h-3 w-3" /> Reset
              </button>
              <button
                onClick={() => setShowGuide(true)}
                className="inline-flex items-center gap-1 rounded-full bg-white/70 backdrop-blur border border-petal/60 px-3 py-1.5 text-[11px] sm:text-xs text-hotpink font-semibold transition hover:bg-white active:scale-95 shadow-sm shadow-hotpink/10"
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
                    onClick={() => goToTab(t.key)}
                    className={[
                      "shrink-0 inline-flex items-center gap-1 rounded-full px-3 py-1 text-[10px] sm:text-xs font-semibold transition whitespace-nowrap",
                      active
                        ? "bg-hotpink text-white shadow shadow-hotpink/40"
                        : "bg-white/70 backdrop-blur border border-petal/60 text-rose hover:bg-white",
                    ].join(" ")}
                  >
                    <t.icon className="h-3 w-3 shrink-0" strokeWidth={1.8} />
                    {t.label}
                    {!premiumPlan && PREMIUM_MEALS_TABS.has(t.key) && <LockChip />}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
      )}

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
            weekPortions={weekPortions}
            selOffset={selOffset} setSelOffset={setSelOffset}
            onGenerate={generateWeek}
            onRegenWeek={regenerateWeek}
            onGeneratePhase={generatePhasePlan}
            onOpen={openRecipeAt}
            onSwap={swapMeal}
            onRegen={regenDay}
            owned={owned}
            proteinBoostDays={proteinBoostDays}
            mealsTuned={mealsTuned} dietSetup={dietSetup}
            pantrySkip={pantrySkip} onSkipPantry={() => setPantrySkip(true)}
            fromDiet={fromDiet} onDismissFromDiet={dismissFromDiet}
            favorites={favorites} toggleFav={toggleFav}
            goPantry={() => { setStep(1); setTab("pantry"); }}
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

        {tab === "favs" && (
          <FavsTab
            favorites={favorites} ratings={ratings} setRatings={setRatings}
            onOpen={openRecipeAt} toggleFav={toggleFav}
          />
        )}

        {/* Clever shortcuts — only once a week is actually planned */}
        {!planEmpty && <CleverRow onOpen={openRecipeAt} owned={owned} />}
      </div>

      <style>{`.no-scrollbar::-webkit-scrollbar{display:none}.no-scrollbar{-ms-overflow-style:none;scrollbar-width:none}`}</style>
    </div>

    {/* RecipeSheet rendered OUTSIDE the animated div so position:fixed works correctly.
        CSS transform on an ancestor breaks fixed positioning — moving it here fixes it. */}
    {openRecipe && (
      <RecipeSheet
        id={openRecipe.id} portion={openRecipe.portion} onClose={() => setOpenRecipe(null)}
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
  // Collapsed by default — just the summary; tap to reveal the detail. X to close.
  const [expanded, setExpanded] = useState(false);
  const [closed, setClosed] = useState(() => { try { return localStorage.getItem("bloom:meals-target-card-closed") === "1"; } catch { return false; } });
  if (closed) return null;
  return (
    <Glass className="relative p-3 sm:p-3.5 animate-fade-in" data-tour="meals-target">
      {/* Close the whole card */}
      <button
        onClick={() => { try { localStorage.setItem("bloom:meals-target-card-closed", "1"); } catch {} setClosed(true); }}
        aria-label="Close" title="Hide daily target"
        className="absolute right-2.5 top-2.5 z-10 grid h-7 w-7 place-items-center rounded-full bg-blush/70 text-rose/60 transition hover:bg-petal hover:text-hotpink active:scale-90"
      >
        <X className="h-4 w-4" />
      </button>

      {/* Summary — compact single row: target kcal + macros inline. Tap to expand. */}
      <div onClick={() => setExpanded((v) => !v)} className="cursor-pointer">
        <div className="flex items-center gap-3 pr-8">
          <div className="shrink-0">
            <p className="text-[9px] font-bold uppercase tracking-widest text-rose/50 leading-none mb-0.5">Daily target · {goalLabel}</p>
            <p className="text-2xl font-black leading-none text-hotpink tabular-nums">{t.calories.toLocaleString()}<span className="text-[11px] font-bold text-rose/50"> kcal</span></p>
          </div>
          <div className="flex-1 grid grid-cols-3 gap-1.5">
            {macros.map((m) => (
              <div key={m.k} className={`rounded-lg ${m.bg} border ${m.br} py-1 text-center`}>
                <p className={`text-[13px] font-black leading-none ${m.cls} tabular-nums`}>{m.v}<span className="text-[9px] font-bold">g</span></p>
                <p className="text-[7.5px] font-bold uppercase tracking-wide text-rose/45 mt-0.5">{m.k}</p>
              </div>
            ))}
          </div>
          <ChevronDown className={["h-4 w-4 shrink-0 text-hotpink/60 transition-transform", expanded ? "rotate-180" : ""].join(" ")} />
        </div>
      </div>

      {/* Detail — revealed on tap */}
      {expanded && (
        <div className="mt-2 space-y-1.5 animate-fade-in">
          {/* Movement → food: the training plan's real effect on the target */}
          {movementFoodLine(t) && (
            <p className="flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200/70 px-2.5 py-1 text-[10.5px] font-bold text-emerald-700 w-fit">
              <Dumbbell className="h-3 w-3 shrink-0" /> {movementFoodLine(t)}
            </p>
          )}
          {/* Eat-back: calories actually burned today are added to the target */}
          {t.eatBack > 0 && (
            <p className="flex items-center gap-1.5 rounded-full bg-amber-50 border border-amber-200/70 px-2.5 py-1 text-[10.5px] font-black text-amber-700 w-fit">
              <Flame className="h-3 w-3 shrink-0" /> +{t.eatBack} kcal burned today — added to your target
            </p>
          )}
          {/* Guided instruction — helps her understand the number */}
          <div className="flex items-start gap-1.5 rounded-xl bg-hotpink/5 border border-hotpink/15 px-2.5 py-1.5 text-[10.5px] leading-snug text-rose/70">
            <span className="font-bold text-hotpink uppercase tracking-wide text-[9px] mt-0.5 shrink-0">How to use</span>
            <span>This is your goal for the day. Each day below shows a little bar of how close its meals land — aim for <b className="text-emerald-600">on target</b>. Add your height &amp; age in <b className="text-hotpink">Diet</b> to make it exact.</span>
          </div>
        </div>
      )}
    </Glass>
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
  const premium = usePremium();
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
    <Glass className="p-3.5 sm:p-4 animate-scale-in">
      <p className="font-script text-2xl text-hotpink leading-none">Let's set up your week ✿</p>
      <p className="mt-0.5 text-[12px] text-rose/60 leading-snug">A few quick picks — then I cook your whole week for you.</p>

      {/* Cycle phase — when synced we say nothing (keeps setup compact); only
          nudge to set up the Cycle Tracker if her phase isn't known yet. */}
      {!phaseKnown && (
        <div className="mt-2.5 mb-3 flex items-start gap-2 rounded-2xl bg-blush/60 px-3 py-2">
          <Moon className="h-4 w-4 shrink-0 mt-0.5 text-hotpink" />
          <p className="text-[12px] text-rose/80 leading-snug">Meals adapt to your cycle. <a href="/app/tools/cycle" className="font-bold text-hotpink underline">Set up your Cycle Tracker</a> to sync your phase automatically.</p>
        </div>
      )}

      <div className={["space-y-3", phaseKnown ? "mt-3.5" : ""].join(" ")}>
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
          {/* Two CTAs share one row — stays on a single line on a phone */}
          <div className="flex items-stretch gap-2">
            <button
              onClick={goPantry}
              className={["flex-1 inline-flex items-center justify-center gap-1.5 rounded-full px-3 py-2 text-[12px] font-bold transition active:scale-95", owned.size > 0 ? "border border-petal/60 bg-white/80 text-hotpink hover:bg-blush" : "bg-hotpink text-white shadow-lg shadow-hotpink/30"].join(" ")}
            >
              <Apple className="h-4 w-4 shrink-0" /> {owned.size > 0 ? "Edit pantry" : "Set up pantry"}
            </button>
            {!pantryDone && (
              <button onClick={onSkipPantry} className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-full border border-petal/60 bg-white/70 px-3 py-2 text-[12px] font-semibold text-rose/70 hover:bg-blush transition active:scale-95">
                Skip for now
              </button>
            )}
          </div>
        </StepRow>
      </div>

      {/* Plan — primary, always available (sensible defaults if a step is skipped) */}
      <button
        onClick={onPlan} disabled={generating}
        data-tour="meals-plan"
        className="mt-3.5 w-full inline-flex items-center justify-center gap-1.5 rounded-2xl bg-gradient-to-r from-hotpink to-[#DB2777] text-white px-4 py-3 text-[14px] font-bold shadow-lg shadow-hotpink/30 animate-cta-bounce disabled:opacity-50 transition active:scale-95"
      >
        <Sparkles className="h-4 w-4" /> {generating ? "Building your week…" : "Plan my week"} {premium ? <ChevronRight className="h-4 w-4" /> : <LockChip />}
      </button>
      {/* Persistent reminder of what the plan follows */}
      <p className="mt-1.5 text-center text-[11px] text-rose/55 leading-snug">
        {dietSetup ? "Your week follows your Diet goal & this week's vibe ✿" : "Your week follows this week's vibe ✿"}
      </p>
    </Glass>
  );
}

function WeekTab({
  intention, setIntention, phase, setPhase, plan, planEmpty, weekPortions, selOffset, setSelOffset, onGenerate, onRegenWeek, onGeneratePhase,
  onOpen, onSwap, onRegen, owned, goPantry, proteinBoostDays, mealsTuned, dietSetup,
  pantrySkip, onSkipPantry, fromDiet, onDismissFromDiet, favorites, toggleFav,
}: any) {
  const goalWord = (g: string) => (g === "lose" ? "lean" : g === "gain" ? "build" : "maintain");
  const isCurrentWeek = selOffset === 0;
  // Which single day is open in the detailed view (photo-rich, one day at a time).
  const [selDay, setSelDay] = useState<string>(() => todayDayName());
  // Calendar date numbers for the VIEWED week (this Monday + 7·offset), so the
  // chips read like a real week — this week, next week, and so on.
  const weekDates = useMemo(() => {
    const now = new Date();
    const dow = (now.getDay() + 6) % 7; // 0 = Mon
    const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - dow + 7 * selOffset);
    return DAYS.map((_: string, i: number) => { const dt = new Date(monday); dt.setDate(monday.getDate() + i); return dt.getDate(); });
  }, [selOffset]);
  const WEEK_LABELS = ["This week", "Next week", "In 2 weeks", "In 3 weeks"];
  const hasPantry = owned.size > 0;
  const [generating, setGenerating] = useState(false);
  const [editingVibe, setEditingVibe] = useState(false);
  const [weekDone, setWeekDone] = useState(false);
  // "Want a daily calorie target?" notice — dismissible, remembered.
  const [targetDismissed, setTargetDismissed] = useState(() => { try { return localStorage.getItem("bloom:meals-target-dismissed") === "1"; } catch { return false; } });
  const dismissTargetNotif = () => { try { localStorage.setItem("bloom:meals-target-dismissed", "1"); } catch {} setTargetDismissed(true); };
  // "Why this week" phase-nutrition note — closable for the session (returns on
  // reload / when the phase changes, so she still gets each phase's guidance).
  const [whyOpen, setWhyOpen] = useState(true);
  const planRef = useRef<HTMLDivElement>(null);
  const dietNoteRef = useRef<HTMLDivElement>(null);

  // Arriving from the Diet tool: scroll straight to the synced week + its note.
  useEffect(() => {
    if (fromDiet) {
      const t = setTimeout(() => dietNoteRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }), 250);
      return () => clearTimeout(t);
    }
  }, [fromDiet]);

  // Guided setup: land her straight on "Let's set up your week" so she knows
  // exactly what to do — no hunting.
  useEffect(() => {
    if (isGuided() && planEmpty) {
      const t = setTimeout(() => {
        try { document.getElementById("meals-setup")?.scrollIntoView({ behavior: "smooth", block: "start" }); } catch {}
      }, 400);
      return () => clearTimeout(t);
    }
  }, [planEmpty]);

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
    // Bloom+ gate: auto-planning the whole week (and regenerating) is premium.
    if (!isPremium()) { openPaywall("meals"); return; }
    const wasEmpty = planEmpty;
    setGenerating(true);
    onGenerate();
    setTimeout(() => {
      setGenerating(false);
      // Guided-setup chain: after her FIRST week is planned, if she came here from
      // the Today setup guide, celebrate briefly then hand back to Today's next step.
      if (wasEmpty && isGuided()) { setWeekDone(true); return; }
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
  // Header ♻ — re-roll just the week she's viewing (keeps the rest of the month).
  const handleRegenWeek = () => {
    if (!isPremium()) { openPaywall("meals"); return; }
    setGenerating(true);
    onRegenWeek();
    setTimeout(() => setGenerating(false), 400);
  };

  const intentionLabel = INTENTIONS.find((i) => i.key === intention)?.label ?? "";
  // Which eating plan she's on (e.g. "Balanced") — shown as an awareness label.
  const dietRegime = useMemo(() => {
    const rg = (readDietProfile() as { regime?: string }).regime;
    return rg ? rg.charAt(0).toUpperCase() + rg.slice(1) : "";
  }, [plan]);

  return (
    <>
      {/* ①  YOUR DAILY TARGET — once Diet is set up, show her real target. If she
             hasn't set a goal, gently offer to — but ONLY once her week exists, so
             a fresh setup goes straight to "Let's set up your week" without clutter. */}
      {dietSetup ? (
        <DailyTargetCard t={targets} />
      ) : (!planEmpty && !targetDismissed) ? (
        <NotifCard
          icon={<Sparkles className="h-5 w-5" />}
          title="Want a daily calorie target?"
          body="Set a goal in Diet and I'll tune every week to it — for now, meals just follow your chosen vibe ✿"
          action={
            <button onClick={() => { window.location.href = "/app/tools/diet"; }} className="shrink-0 inline-flex items-center gap-1 rounded-full bg-hotpink/10 px-3 py-1 text-xs font-bold text-hotpink transition hover:bg-hotpink/15 active:scale-95">Set goal <ChevronRight className="h-3.5 w-3.5" /></button>
          }
          onDismiss={dismissTargetNotif}
        />
      ) : null}

      {/* ②③  THE PLAN — setup steps while empty; once a week exists everything
             (the tuned-plan notice with Edit/Regenerate, any post-setup notes and
             the 7 days) lives together in ONE titled "meal week plan" section. */}
      {planEmpty ? (
        <div id="meals-setup" className={isGuided() ? "animate-section-attention" : ""}>
          <SetupSteps
            phase={phase} intention={intention} setIntention={setIntention}
            owned={owned} goPantry={goPantry} onPlan={handleGenerate} generating={generating}
            dietSetup={dietSetup} pantrySkip={pantrySkip} onSkipPantry={onSkipPantry}
          />
        </div>
      ) : (
        <section className="rounded-3xl bg-white/95 backdrop-blur-md border border-petal/60 shadow-sm shadow-hotpink/10 p-3.5 sm:p-4 space-y-3">
          {/* Compact header — title + the awareness labels (goal · diet · phase)
              so she always knows what's set up, and the Edit + Regenerate controls
              tucked to the right so they barely take any space. */}
          <div className="flex items-start justify-between gap-2 px-0.5">
            <div className="min-w-0">
              <p className="font-script text-2xl text-hotpink leading-none">Your meal week plan ✿</p>
              <div className="mt-1.5 flex flex-wrap items-center gap-1">
                {/* Goal label */}
                {dietSetup && mealsTuned && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-hotpink/10 border border-hotpink/20 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-hotpink">
                    <Target className="h-2.5 w-2.5" strokeWidth={2.5} /> {goalWord(mealsTuned)} goal
                  </span>
                )}
                {/* Which meal plan / diet regime */}
                {dietSetup && dietRegime && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-blush/70 border border-petal/60 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-rose/70">
                    <Leaf className="h-2.5 w-2.5" strokeWidth={2.5} /> {dietRegime} diet
                  </span>
                )}
                {/* Vibe (when not diet-tuned) */}
                {!(dietSetup && mealsTuned) && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-hotpink/10 border border-hotpink/20 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-hotpink">
                    <Sparkles className="h-2.5 w-2.5" strokeWidth={2.5} /> {intentionLabel} vibe
                  </span>
                )}
                {/* Phase-synced label */}
                {phase !== "any" && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200/70 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-emerald-600">
                    <Check className="h-2.5 w-2.5" strokeWidth={3} /> Synced · {phase} phase
                  </span>
                )}
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-1.5">
              <button onClick={() => setEditingVibe((v) => !v)} title="Edit plan" aria-label="Edit plan" className="grid h-8 w-8 place-items-center rounded-full border border-petal/60 bg-white/80 text-hotpink hover:bg-blush transition active:scale-95">
                <Pencil className="h-3.5 w-3.5" />
              </button>
              <button onClick={handleRegenWeek} disabled={generating} title={`Regenerate ${WEEK_LABELS[selOffset].toLowerCase()}`} aria-label="Regenerate this week" className="grid h-8 w-8 place-items-center rounded-full bg-gradient-to-r from-hotpink to-[#DB2777] text-white shadow shadow-hotpink/30 disabled:opacity-50 transition active:scale-95">
                <RefreshCw className={["h-4 w-4", generating ? "animate-spin" : ""].join(" ")} />
              </button>
            </div>
          </div>

          {/* Phase-nutrition guidance + editor — revealed inline, not a permanent block */}
          <div className="empty:hidden space-y-2">
            {/* Phase-nutrition guidance — dismissible with an X. */}
            {phaseSynced && whyOpen && (() => {
              const comment = trainingAwarenessComment({
                workoutDays: readWorkoutPlanDays().length,
                yogaDays: readYogaPlanDays().length,
                phase: normalizePhase(realPhase),
                goal: readDietProfile().goal,
              });
              const dp = toDietPhase(phase);
              const info = dp ? PHASE_INFO[dp] : null;
              if (!comment && !info) return null;
              return (
                <div className="relative rounded-2xl border border-petal/50 bg-blush/30 p-3 pr-8 space-y-2 animate-fade-in">
                  <button onClick={() => setWhyOpen(false)} aria-label="Dismiss" className="absolute right-1.5 top-1.5 grid h-6 w-6 place-items-center rounded-full text-rose/40 transition hover:bg-blush hover:text-hotpink active:scale-90"><X className="h-4 w-4" /></button>
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

            {/* Expanded editor — vibe + phase override; cooking time & allergies live in Diet */}
            {editingVibe && (
              <div className="rounded-2xl border border-petal/50 bg-blush/30 p-3 space-y-2.5 animate-fade-in">
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
          </div>

          {/* Post-setup notice (arriving from a Diet sync) — notif style, X to close */}
          {fromDiet && (
            <div ref={dietNoteRef}>
              <NotifCard
                icon={<Sparkles className="h-5 w-5" strokeWidth={2.2} />}
                title={<>Your synced plan · <span className="capitalize">{fromDiet}</span> diet</>}
                body={<>We set up this week's meals to match your <b className="text-hotpink">{fromDiet}</b> diet ✿</>}
                onDismiss={onDismissFromDiet}
              />
            </div>
          )}

          {/* Week switcher — this week, next week, and up to 3 weeks ahead (a
              4-week month that then repeats). Prev/next arrows + a label. */}
          <div className="flex items-center justify-between gap-2">
            <button onClick={() => setSelOffset((o: number) => Math.max(0, o - 1))} disabled={selOffset === 0} aria-label="Previous week" className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-petal/60 bg-white/80 text-hotpink disabled:opacity-30 active:scale-90 transition"><ChevronRight className="h-4 w-4 rotate-180" /></button>
            <div className="flex-1 text-center">
              <p className="font-script text-lg text-hotpink leading-none">{WEEK_LABELS[selOffset]}</p>
              <div className="mt-1 flex items-center justify-center gap-1">
                {WEEK_LABELS.map((_: string, i: number) => (
                  <span key={i} className={["h-1.5 rounded-full transition-all", i === selOffset ? "w-4 bg-hotpink" : "w-1.5 bg-petal/60"].join(" ")} />
                ))}
              </div>
            </div>
            <button onClick={() => setSelOffset((o: number) => Math.min(MEAL_WEEKS - 1, o + 1))} disabled={selOffset >= MEAL_WEEKS - 1} aria-label="Next week" className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-petal/60 bg-white/80 text-hotpink disabled:opacity-30 active:scale-90 transition"><ChevronRight className="h-4 w-4" /></button>
          </div>

          {/* Day selector — the viewed week as tappable date chips (photo 2) */}
          <div id="meals-week-plan" ref={planRef} className="flex gap-1.5 overflow-x-auto no-scrollbar -mx-0.5 px-0.5 pb-0.5">
            {DAYS.map((d: string, di: number) => {
              const isToday = isCurrentWeek && d === todayDayName();
              const isSel = d === selDay;
              return (
                <button
                  key={d} onClick={() => setSelDay(d)}
                  className={[
                    "flex-1 min-w-[42px] shrink-0 rounded-2xl px-1 py-2 text-center border transition active:scale-95",
                    isSel
                      ? "bg-gradient-to-b from-hotpink to-[#DB2777] text-white border-hotpink shadow-md shadow-hotpink/30"
                      : "bg-white/70 text-rose/70 border-petal/50 hover:bg-blush",
                  ].join(" ")}
                >
                  <span className={["block text-[10px] font-bold uppercase tracking-wide", isSel ? "text-white/90" : "text-rose/50"].join(" ")}>{d}</span>
                  <span className="block text-lg font-black leading-none tabular-nums">{weekDates[di]}</span>
                  <span className={["mx-auto mt-1 block h-1 w-1 rounded-full", isToday ? (isSel ? "bg-white" : "bg-hotpink") : "bg-transparent"].join(" ")} />
                </button>
              );
            })}
          </div>

          {/* The selected day — one photo-rich card per meal, plus a compact
              nutrition summary. */}
          <DayPlanDetail
            day={selDay} plan={plan} portions={weekPortions} targets={targets} phase={phase}
            proteinBoostDays={proteinBoostDays} yogaDaySet={yogaDaySet}
            favorites={favorites} toggleFav={toggleFav}
            onOpen={onOpen} onSwap={onSwap} onRegen={onRegen}
            isToday={isCurrentWeek && selDay === todayDayName()}
          />
        </section>
      )}

      {weekDone && (
        <SpotlightCoach
          targetId="meals-week-plan"
          step={2} total={5}
          title="This is your week ✿"
          message="Your whole week of meals, planned. Tap any day to swap a meal."
          primaryLabel="Continue on Today →"
          onPrimary={() => { window.location.href = "/app/today"; }}
          secondaryLabel="See my week first"
          onClose={() => setWeekDone(false)}
        />
      )}
    </>
  );
}

/* ---------- One selected day, rendered as photo-rich meal cards ---------- */

const SLOT_ORDER: MealType[] = ["breakfast", "lunch", "snack", "dinner"];
const SLOT_META: Record<string, { label: string; time: string; Icon: typeof Sunrise; tint: string }> = {
  breakfast: { label: "Morning", time: "08:00", Icon: Sunrise,  tint: "text-amber-500" },
  lunch:     { label: "Lunch",   time: "13:00", Icon: Sun,      tint: "text-orange-500" },
  snack:     { label: "Snack",   time: "16:30", Icon: Sparkles, tint: "text-hotpink" },
  dinner:    { label: "Dinner",  time: "19:00", Icon: Moon,     tint: "text-violet-500" },
};
const SLOT_TIP: Record<string, string> = {
  breakfast: "Start your day with water and a nourishing breakfast.",
  lunch:     "Sip a glass of water 15 minutes before eating.",
  snack:     "A little something to keep your energy steady this afternoon.",
  dinner:    "Your body recovers tonight — this meal supports repair & keeps you satisfied.",
};
const cap = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

/** Small coloured tag chip. */
function MealTag({ label, tone }: { label: string; tone: "protein" | "energy" | "phase" | "diet" | "recovery" }) {
  const cls = {
    protein:  "bg-violet-50 text-violet-600 border-violet-200/70",
    energy:   "bg-amber-50 text-amber-600 border-amber-200/70",
    phase:    "bg-hotpink/10 text-hotpink border-hotpink/20",
    diet:     "bg-blush/70 text-rose/70 border-petal/60",
    recovery: "bg-emerald-50 text-emerald-600 border-emerald-200/70",
  }[tone];
  return <span className={["rounded-full border px-2 py-0.5 text-[10px] font-bold leading-none", cls].join(" ")}>{label}</span>;
}

function DayPlanDetail({ day, plan, portions, targets, phase, proteinBoostDays, yogaDaySet, favorites, toggleFav, onOpen, onSwap, onRegen, isToday }: {
  day: string; plan: any; portions: Record<string, Partial<Record<MealType, number>>>; targets: TargetBreakdown; phase: CyclePhase;
  proteinBoostDays?: Set<string>; yogaDaySet: Set<string>;
  favorites: string[]; toggleFav: (id: string) => void;
  onOpen: (id: string, portion?: number) => void; onSwap: (day: string, slot: MealType) => void; onRegen: (day: string) => void;
  isToday: boolean;
}) {
  const isRecoveryDay = yogaDaySet.has(day) && !proteinBoostDays?.has(day);
  // The synced cycle phase, in the recipes' 4-phase vocabulary (null when "any").
  const curPhase = toDietPhase(phase);
  // Portion factor for a slot, from the VIEWED week's portions map (default 1).
  const portionOf = (d: string, s: MealType): number => { const f = portions?.[d]?.[s]; return f && f > 0 ? f : 1; };
  // Day totals for the compact summary.
  const dayRecipes = SLOT_ORDER
    .map((s) => {
      const id = plan[day]?.[s];
      const r = id ? RECIPES.find((x) => x.id === id) : null;
      if (!r) return null;
      const f = portionOf(day, s);
      return { macros: { calories: r.macros.calories * f, protein: r.macros.protein * f, carbs: r.macros.carbs * f, fat: r.macros.fat * f } };
    })
    .filter(Boolean) as { macros: { calories: number; protein: number; carbs: number; fat: number } }[];
  const totals = sumMacros(dayRecipes);
  const kcal = Math.round(totals.calories);
  const protein = Math.round(totals.protein);
  const proteinTarget = targets.protein;
  const kcalPct = Math.min(100, Math.round((kcal / Math.max(1, targets.calories)) * 100));
  const protPct = Math.min(100, Math.round((protein / Math.max(1, proteinTarget)) * 100));
  const verdict = calorieVerdict(kcal, targets.calories);
  const verdictLabel = verdict === "on" ? "Right on target!" : verdict === "under" ? "A little room left" : "A touch over";
  const verdictCls = verdict === "on" ? "text-emerald-600" : verdict === "under" ? "text-violet-600" : "text-red-500";

  return (
    <div className="space-y-2 animate-fade-in">
      {/* Day header row — label + recovery/today markers + redo day */}
      <div className="flex items-center justify-between px-0.5">
        <p className="font-script text-xl text-hotpink flex items-center gap-1.5">
          {day}
          {isToday && <span className="rounded-full bg-hotpink text-white text-[8px] font-bold uppercase tracking-wide px-1.5 py-0.5">Today</span>}
          {isRecoveryDay && <span className="rounded-full bg-emerald-50 border border-emerald-200/70 text-emerald-600 text-[8px] font-bold uppercase tracking-wide px-1.5 py-0.5">Recovery</span>}
        </p>
        <button onClick={() => onRegen(day)} className="text-[11px] inline-flex items-center gap-1 text-rose/60 hover:text-hotpink transition-colors">
          <RefreshCw className="h-3 w-3" /> redo day
        </button>
      </div>

      {SLOT_ORDER.map((slot) => {
        const meta = SLOT_META[slot];
        const id = plan[day]?.[slot];
        const r = id ? RECIPES.find((x) => x.id === id) : null;
        const portion = portionOf(day, slot);
        const proteinBoosted = !!proteinBoostDays?.has(day) && slot === "dinner";
        const fallback = MEAL_PHOTO_FALLBACK[slot] ?? "/images/meal-buddha.webp";

        // Empty slot — a soft tappable to fill it.
        if (!r) {
          return (
            <button key={slot} onClick={() => onSwap(day, slot)} className="w-full flex items-center gap-2 rounded-2xl border border-dashed border-petal/60 bg-white/60 p-2 text-left active:scale-[0.99] transition hover:bg-blush/40">
              <span className="w-7 shrink-0 flex flex-col items-center">
                <meta.Icon className={["h-3.5 w-3.5", meta.tint].join(" ")} strokeWidth={2} />
                <span className="mt-0.5 text-[8px] font-bold uppercase tracking-tight text-rose/50 leading-none text-center">{meta.label}</span>
              </span>
              <span className="grid h-24 w-28 shrink-0 place-items-center rounded-xl bg-blush/50 text-hotpink"><Plus className="h-5 w-5" /></span>
              <span className="flex-1 text-[12px] font-bold text-hotpink">Add a {meta.label.toLowerCase()} meal</span>
              <ChevronRight className="h-4 w-4 text-hotpink/60" />
            </button>
          );
        }

        const kc = Math.round(r.macros.calories * portion);
        const pr = Math.round(r.macros.protein * portion);
        const isFav = favorites.includes(r.id);
        // Up to two tags: a quality descriptor + the recipe's phase.
        const tags: { label: string; tone: "protein" | "energy" | "phase" | "diet" | "recovery" }[] = [];
        if (proteinBoosted || pr >= 30) tags.push({ label: "Rich in protein", tone: "protein" });
        else if (kc >= 480) tags.push({ label: "High energy", tone: "energy" });
        else if (r.dietTags?.[0]) tags.push({ label: cap(r.dietTags[0]), tone: "diet" });
        if (isRecoveryDay && slot === "dinner") tags.push({ label: "Recovery", tone: "recovery" });
        else {
          const phases: string[] = r.phases || [];
          // Prefer the synced phase when this recipe supports it, so the tag never
          // contradicts the "synced · <phase>" label up top.
          const ph = (curPhase && phases.includes(curPhase)) ? curPhase : phases.find((p) => p && p !== "any");
          if (ph) tags.push({ label: `${cap(ph)} phase`, tone: "phase" });
        }

        return (
          <div key={slot} className="overflow-hidden rounded-2xl bg-white border border-petal/50 shadow-sm animate-scale-in">
            <div className="flex items-stretch gap-2 p-2">
              {/* icon / label / time rail — kept narrow so the photo gets the room */}
              <div className="w-7 shrink-0 flex flex-col items-center pt-0.5">
                <meta.Icon className={["h-3.5 w-3.5", meta.tint].join(" ")} strokeWidth={2} />
                <span className="mt-0.5 text-[8px] font-bold uppercase tracking-tight text-rose/60 text-center leading-none">{meta.label}</span>
                <span className="mt-0.5 text-[8px] font-semibold text-rose/40 tabular-nums leading-none">{meta.time}</span>
              </div>

              {/* photo (with swap) — larger, given more of the card width */}
              <button onClick={() => onOpen(r.id, portion)} className="relative h-24 w-28 shrink-0 overflow-hidden rounded-xl active:scale-95 transition">
                <img src={recipeImageSrc(r)} alt={r.name} className="absolute inset-0 h-full w-full object-cover" loading="lazy" onError={(e) => { (e.currentTarget as HTMLImageElement).src = fallback; }} />
                <span onClick={(e) => { e.stopPropagation(); onSwap(day, slot); }} title="Swap meal" role="button" className="absolute top-1 right-1 grid h-5 w-5 place-items-center rounded-full bg-black/35 text-white backdrop-blur-sm hover:bg-black/55 transition"><Shuffle className="h-2.5 w-2.5" /></span>
              </button>

              {/* details */}
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-bold text-[#831843] leading-tight line-clamp-2">{r.name}</p>
                <div className="mt-1 flex items-center gap-2.5 text-[10.5px] font-semibold">
                  <span className="inline-flex items-center gap-0.5 whitespace-nowrap text-hotpink"><Flame className="h-3 w-3 shrink-0" /> {kc} kcal</span>
                  <span className="inline-flex items-center gap-0.5 whitespace-nowrap text-emerald-600"><Leaf className="h-3 w-3 shrink-0" /> {pr}g protein</span>
                </div>
                <div className="mt-1.5 flex flex-wrap gap-1">
                  {tags.map((t) => <MealTag key={t.label} label={t.label} tone={t.tone} />)}
                </div>
              </div>

              {/* favourite + open */}
              <div className="flex flex-col items-center justify-between py-0.5">
                <button onClick={() => toggleFav(r.id)} aria-label={isFav ? "Unfavourite" : "Favourite"} className="grid h-8 w-8 place-items-center rounded-full bg-blush/50 text-hotpink active:scale-90 transition hover:bg-blush">
                  <Heart className={["h-4 w-4", isFav ? "fill-hotpink" : ""].join(" ")} strokeWidth={2} />
                </button>
                <button onClick={() => onOpen(r.id, portion)} aria-label="Open recipe" className="grid h-8 w-8 place-items-center rounded-full bg-gradient-to-br from-hotpink to-[#DB2777] text-white shadow shadow-hotpink/30 active:scale-90 transition">
                  <ChevronRight className="h-4 w-4" strokeWidth={2.5} />
                </button>
              </div>
            </div>

            {/* tip strip */}
            <div className="flex items-center gap-1.5 border-t border-petal/40 bg-blush/25 px-3 py-1.5">
              <span className={["shrink-0", meta.tint].join(" ")}><meta.Icon className="h-3 w-3" strokeWidth={2} /></span>
              <p className="text-[10.5px] leading-snug text-rose/70"><b className="text-rose/85">{meta.label} tip:</b> {SLOT_TIP[slot]}</p>
            </div>
          </div>
        );
      })}

      {/* Compact day nutrition summary */}
      <div className="rounded-2xl bg-gradient-to-br from-blush/50 to-petal/25 border border-petal/50 p-3">
        <div className="flex items-center justify-between mb-2">
          <p className="flex items-center gap-1.5 font-script text-lg text-hotpink leading-none"><Target className="h-4 w-4" /> {day}'s nutrition</p>
          <span className={["inline-flex items-center gap-1 rounded-full bg-white/80 px-2.5 py-1 text-[10.5px] font-black", verdictCls].join(" ")}>
            <Heart className={["h-3 w-3", verdict === "on" ? "fill-emerald-500 text-emerald-500" : ""].join(" ")} /> {verdictLabel}
          </span>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <div className="flex items-baseline justify-between text-[11px] font-bold mb-1">
              <span className="inline-flex items-center gap-1 text-hotpink"><Flame className="h-3 w-3" /> Calories</span>
              <span className="tabular-nums text-rose/70">{kcal.toLocaleString()}<span className="text-rose/40">/{targets.calories.toLocaleString()}</span></span>
            </div>
            <div className="h-2 rounded-full bg-white/70 overflow-hidden"><div className="h-full rounded-full bg-gradient-to-r from-hotpink to-[#DB2777] transition-all" style={{ width: `${kcalPct}%` }} /></div>
          </div>
          <div>
            <div className="flex items-baseline justify-between text-[11px] font-bold mb-1">
              <span className="inline-flex items-center gap-1 text-emerald-600"><Leaf className="h-3 w-3" /> Protein</span>
              <span className="tabular-nums text-rose/70">{protein}<span className="text-rose/40">/{proteinTarget}g</span></span>
            </div>
            <div className="h-2 rounded-full bg-white/70 overflow-hidden"><div className="h-full rounded-full bg-emerald-400 transition-all" style={{ width: `${protPct}%` }} /></div>
          </div>
        </div>
      </div>
    </div>
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
                    {/* Custom items the user typed in "I also have…" — stored in the same
                        pantry array so they flow into meal-matching & the shopping list.
                        Tap to remove. */}
                    {checked
                      .filter((item: string) => !cat.items.includes(item))
                      .map((item: string) => (
                        <button
                          key={`custom-${item}`} onClick={() => togglePantry(cat.key, item)}
                          className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs border bg-hotpink text-white border-hotpink transition"
                        >
                          <Check className="h-3 w-3" /> {item} <X className="h-3 w-3 opacity-70" />
                        </button>
                      ))}
                  </div>
                  <input
                    value={extra[cat.key] || ""}
                    onChange={(e) => setExtra({ ...extra, [cat.key]: e.target.value })}
                    onKeyDown={(e) => {
                      if (e.key !== "Enter") return;
                      e.preventDefault();
                      const val = (extra[cat.key] || "").trim();
                      if (!val) return;
                      // Add to the real pantry (deduped, case-insensitive) so it counts.
                      const dup = checked.some((x: string) => x.toLowerCase() === val.toLowerCase());
                      if (!dup) togglePantry(cat.key, val);
                      setExtra({ ...extra, [cat.key]: "" });
                    }}
                    placeholder="I also have… (type & press Enter)"
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
  return recipeImageSrc(r);
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
              {/* Name over a slim bottom fade — food stays visible */}
              <div className="absolute inset-x-0 bottom-0 px-1.5 pb-1.5 pt-6 text-center bg-gradient-to-t from-black/85 via-black/40 to-transparent">
                <p className="text-[9px] font-bold text-white leading-tight line-clamp-2" style={{ textShadow: '0 1px 3px rgba(0,0,0,0.9)' }}>{r.name}</p>
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

function RecipeSheet({ id, portion = 1, onClose, favorites, toggleFav, ratings, setRatings }: any) {
  const r = RECIPES.find((x) => x.id === id);
  if (!r) return null;
  const fav = favorites.includes(r.id);
  // Portion baked in: show macros & ingredient amounts for what the plan serves.
  // `f` is how many single-servings this portion equals; the ingredient list is
  // written for the recipe's full `servings`, so scale it by `f / servings` to
  // land on ONE portion (matching the macro card) — not the whole batch × f.
  const f = portion && portion > 0 ? portion : 1;
  const scaled = f !== 1;
  const ingF = scaled ? f / (r.servings || 1) : 1;
  const mac = {
    calories: Math.round(r.macros.calories * f),
    protein: Math.round(r.macros.protein * f),
    carbs: Math.round(r.macros.carbs * f),
    fat: Math.round(r.macros.fat * f),
  };
  const fallback  = MEAL_PHOTO_FALLBACK[r.mealType] ?? '/images/meal-buddha.webp';
  const photoSrc  = recipeImg(r) ?? fallback;

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

          {/* Macros row — scaled to the planned portion */}
          <div className="grid grid-cols-4 gap-2 text-center">
            {[
              { label: 'Cal', value: mac.calories },
              { label: 'Protein', value: `${mac.protein}g` },
              { label: 'Carbs', value: `${mac.carbs}g` },
              { label: 'Fat', value: `${mac.fat}g` },
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

          {/* Ingredients — amounts scaled to the planned portion */}
          <div>
            <p className="text-xs uppercase font-bold text-hotpink tracking-wider mb-1.5">
              Ingredients{scaled ? " · portioned for your goal ✿" : ` · makes ${r.servings} serving${r.servings === 1 ? "" : "s"}`}
            </p>
            <ul className="space-y-1">
              {r.ingredients.map((i) => (
                <li key={i.item} className="flex gap-2 text-sm text-rose">
                  <span className="text-hotpink mt-0.5">•</span>
                  <span><b className="font-medium">{scaleQuantity(i.qty, ingF)}</b> {i.item}</span>
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