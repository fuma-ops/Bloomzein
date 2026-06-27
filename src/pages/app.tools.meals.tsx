
import { useEffect, useMemo, useRef, useState } from "react";
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
} from "lucide-react";
import { BloomBubbles } from "@/components/bloom/BloomBubbles";
import { CuteDatePicker } from "@/components/bloom/CuteDatePicker";
import {
  RECIPES,
  PANTRY,
  INTENTIONS,
  DAYS,
  KID_DAYS,
  STORAGE_TABLE,
  SEASONAL,
  passesMyRules,
  readDietProfile,
  type Recipe,
  type Intention,
  type CyclePhase,
  type PantryCategoryKey,
  type MealType,
} from "@/components/bloom/meals/data";


import { readTodaySymptoms } from "@/lib/crossToolData";
import { readCyclePhase } from "@/components/bloom/cyclePhase";
import { readLaunch, LAUNCH_MEAL_KEY } from "@/components/bloom/phasePlan";

/* ---------- Meal photo fallbacks (by slot type) ---------- */
const MEAL_PHOTO_FALLBACK: Record<string, string> = {
  breakfast: '/images/meal-oats.jpg',
  lunch:     '/images/meal-buddha.jpg',
  dinner:    '/images/meal-stew.jpg',
  lunchbox:  '/images/meal-lunchbox.jpg',
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
): Recipe | null {
  let candidates = pool.filter((r) => r.mealType === type && ratings[r.id] !== "never");
  if (intention === "cycle") {
    candidates = candidates.filter((r) => r.cyclePhase.includes(phase) || r.cyclePhase.includes("any"));
  } else if (intention === "quick") {
    candidates = candidates.filter((r) => r.prepMin + r.cookMin <= 20);
  } else {
    const filtered = candidates.filter((r) => r.intention.includes(intention));
    if (filtered.length) candidates = filtered;
  }
  if (!candidates.length) candidates = pool.filter((r) => r.mealType === type);
  if (!candidates.length) return null;

  const ranked = [...candidates].sort((a, b) => {
    const aLove = ratings[a.id] === "love" ? 0.2 : 0;
    const bLove = ratings[b.id] === "love" ? 0.2 : 0;
    const fresh = (id: string) => (used.has(id) ? -0.5 : 0);
    return (scoreRecipe(b, owned) + bLove + fresh(b.id)) -
           (scoreRecipe(a, owned) + aLove + fresh(a.id));
  });
  return ranked[0];
}

function buildWeek(
  pool: Recipe[],
  intention: Intention,
  phase: CyclePhase,
  owned: Set<string>,
  ratings: Record<string, "love" | "ok" | "never">,
  proteinBoostDay?: string,
) {
  const used = new Set<string>();
  const plan: Record<string, Record<MealType, string | null>> = {};
  DAYS.forEach((d) => {
    plan[d] = { breakfast: null, lunch: null, dinner: null, snack: null, lunchbox: null };
    (["breakfast", "lunch", "dinner"] as MealType[]).forEach((type) => {
      const slotIntention: Intention = d === proteinBoostDay && type === "dinner" ? "protein" : intention;
      const r = pickForSlot(pool, type, slotIntention, phase, owned, used, ratings);
      if (r) { plan[d][type] = r.id; used.add(r.id); }
    });
  });
  return plan;
}

// Workout → Meals: after a strength/tonify session today, bias tonight's
// dinner toward a high-protein recipe for recovery.
const WORKOUT_LOG_KEY = "bloom:workout-history";

function didStrengthWorkoutToday(): boolean {
  try {
    const history: { date: string; intention: string }[] = JSON.parse(localStorage.getItem(WORKOUT_LOG_KEY) || "[]");
    const todayISO = new Date().toISOString().slice(0, 10);
    return history.some((h) => h.date === todayISO && (h.intention === "strengthen" || h.intention === "tonify"));
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

function Glass({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-[1.5rem] bg-white/85 backdrop-blur border border-petal/60 shadow-lg shadow-rose/10 ${className}`}>
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

/* ---------- Page ---------- */

export default function MealsPage() {
  const [tab, setTab] = useState<TabKey>("week");
  const [pantry, setPantry] = useLS<Record<string, string[]>>(LS.pantry, {});
  const [extra, setExtra] = useLS<Record<string, string>>(LS.extra, {});
  const [intention, setIntention] = useLS<Intention>(LS.intention, "light");
  const [plan, setPlan] = useLS<Record<string, Record<MealType, string | null>>>(LS.plan, {});
  const [kidPlan, setKidPlan] = useLS<Record<string, string | null>>(LS.kidPlan, {});
  const [favorites, setFavorites] = useLS<string[]>(LS.favorites, []);
  const [ratings, setRatings] = useLS<Record<string, "love" | "ok" | "never">>(LS.ratings, {});
  const [shopChecked, setShopChecked] = useLS<string[]>(LS.shopChecked, []);
  const [freezer, setFreezer] = useLS<{ name: string; date: string }[]>(LS.freezer, []);
  const [step, setStep] = useLS<number>(LS.step, 0); // 0=welcome,1=pantry,2=vibe,3=ready
  const [phase, setPhase] = useLS<CyclePhase>(LS.phase as any, "any");
  const [openRecipe, setOpenRecipe] = useState<string | null>(null);
  const [todaySymptoms, setTodaySymptoms] = useState<string[]>([]);

  useEffect(() => {
    setTodaySymptoms(readTodaySymptoms());
    const refresh = () => setTodaySymptoms(readTodaySymptoms());
    window.addEventListener("storage", refresh);

    // FIRST-USE ONLY: if the user has never chosen a phase, pre-select their
    // real cycle phase so meals start phase-appropriate. Once they've made a
    // choice (including "any"), it's theirs — we never override it again.
    try {
      if (localStorage.getItem(LS.phase) == null) {
        const real = readCyclePhase();
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
  }, []);

  const proteinBoostDay = useMemo(
    () => (didStrengthWorkoutToday() ? todayDayName() : null),
    [],
  );

  const generateWeek = () => {
    const p = buildWeek(myRulesPool, intention, phase, owned, ratings, proteinBoostDay ?? undefined);
    setPlan(p);
    setStep(3);
    setTab("week");
  };
  const generateKids = () => setKidPlan(buildKidWeek(myRulesPool, owned));

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
    const slotIntention: Intention = day === proteinBoostDay && type === "dinner" ? "protein" : intention;
    const r = pickForSlot(myRulesPool, type, slotIntention, phase, owned, used, ratings);
    if (r) setPlan({ ...plan, [day]: { ...plan[day], [type]: r.id } });
  };

  const regenDay = (day: string) => {
    const used = new Set<string>();
    const slots: MealType[] = ["breakfast", "lunch", "dinner"];
    const dayPlan: Record<MealType, string | null> = { breakfast: null, lunch: null, dinner: null, snack: null, lunchbox: null };
    slots.forEach((type) => {
      const slotIntention: Intention = day === proteinBoostDay && type === "dinner" ? "protein" : intention;
      const r = pickForSlot(myRulesPool, type, slotIntention, phase, owned, used, ratings);
      if (r) { dayPlan[type] = r.id; used.add(r.id); }
    });
    setPlan({ ...plan, [day]: dayPlan });
  };

  const toggleFav = (id: string) => {
    setFavorites((f) => (f.includes(id) ? f.filter((x) => x !== id) : [...f, id]));
  };

  return (
    <>
    <div className="relative animate-fade-in max-w-full overflow-x-hidden">
      <BloomBubbles count={10} />

      {/* HERO */}
      <div className="relative w-full aspect-[8/3] rounded-3xl overflow-hidden border border-pink-200/60 shadow-xl shadow-pink-200/30 mb-3 animate-hero-border-signal">
        <img src="/images/meals-hero-new.png" alt="Meal Planner" className="absolute inset-0 h-full w-full object-cover object-center" />
        <div className="absolute inset-0 bg-gradient-to-r from-hotpink/70 via-hotpink/20 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent" />
        <div className="absolute inset-0 flex flex-col justify-between p-3 sm:p-5 lg:p-7">
          {/* Title block — vertically centered in the available space, left-anchored */}
          <div className="flex-1 flex flex-col justify-center max-w-[55%] sm:max-w-[45%] lg:max-w-[38%]">
            <h1 className="animate-fade-in font-script text-2xl sm:text-4xl lg:text-5xl xl:text-6xl text-white leading-none drop-shadow-md" style={{ animationDelay: '0ms' }}>{TAB_HERO[tab].title}</h1>
            {phase !== "any" && tab === "week" && (
              <p className="animate-fade-in mt-1.5 text-[10px] sm:text-xs font-semibold uppercase tracking-[.12em] text-white/75 drop-shadow leading-none" style={{ animationDelay: '120ms' }}>
                {phase} phase
              </p>
            )}
            <p className="animate-fade-in mt-2 text-xs sm:text-sm lg:text-base italic text-white/90 drop-shadow leading-snug" style={{ animationDelay: '200ms' }}>{TAB_HERO[tab].subtitle}</p>
          </div>
          {/* Pill tabs at bottom of hero — auto-scroll hint on load */}
          <div ref={tabsRef} className="animate-fade-in overflow-x-auto no-scrollbar" style={{ animationDelay: '320ms' }}>
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

      {/* Guided welcome (only on first visit) */}
      {step === 0 && (
        <GuidedWelcome onStart={() => { setStep(1); setTab("pantry"); }} />
      )}

      <div className="mt-4 space-y-4">
        {tab === "week" && (
          <WeekTab
            intention={intention} setIntention={setIntention}
            phase={phase} setPhase={setPhase}
            plan={plan} planEmpty={planEmpty}
            onGenerate={generateWeek}
            onOpen={setOpenRecipe}
            onSwap={swapMeal}
            onRegen={regenDay}
            owned={owned}
            proteinBoostDay={proteinBoostDay}
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

/* ---------- Guided Welcome ---------- */

function GuidedWelcome({ onStart }: { onStart: () => void }) {
  return (
    <Glass className="overflow-hidden">
      <div className="grid sm:grid-cols-[1fr_320px] items-stretch min-h-[280px] sm:min-h-[340px]">
        <div className="p-5 sm:p-8 flex flex-col justify-between min-h-[280px] sm:min-h-[340px]">
          <div>
            <p className="text-xs uppercase tracking-wider text-rose/70 font-semibold">welcome</p>
            <h2 className="font-script text-3xl sm:text-4xl text-hotpink leading-tight mt-1">
              Cook your softest week ever
            </h2>
            <p className="mt-3 text-sm text-rose/80 leading-relaxed">
              Three little steps and you're sorted: tell me what's in your kitchen, pick your vibe,
              and I'll plan all 7 days from what you already have.
            </p>
          </div>
          <ol className="space-y-2.5 text-sm text-rose">
            <li className="flex items-center gap-2">
              <span className="grid h-6 w-6 place-items-center rounded-full bg-hotpink text-white text-[11px] font-bold shrink-0">1</span>
              Build your pantry
            </li>
            <li className="flex items-center gap-2">
              <span className="grid h-6 w-6 place-items-center rounded-full bg-hotpink text-white text-[11px] font-bold shrink-0">2</span>
              Pick this week's vibe
            </li>
            <li className="flex items-center gap-2">
              <span className="grid h-6 w-6 place-items-center rounded-full bg-hotpink text-white text-[11px] font-bold shrink-0">3</span>
              Get your week ✨
            </li>
          </ol>
          <div>
            <PinkBtn onClick={onStart} className="animate-cta-bounce">
              Start here <ChevronRight className="h-4 w-4" />
            </PinkBtn>
          </div>
        </div>
        <div
          className="hidden sm:block bg-cover bg-center min-h-[280px] sm:min-h-[340px]"
          style={{ backgroundImage: "url(/images/meals-hero.jpg)" }}
          aria-hidden
        />
      </div>
    </Glass>
  );
}

/* ---------- This Week ---------- */

function WeekTab({
  intention, setIntention, phase, setPhase, plan, planEmpty, onGenerate,
  onOpen, onSwap, onRegen, owned, goPantry, goPrep, proteinBoostDay,
}: any) {
  const hasPantry = owned.size > 0;
  const [generating, setGenerating] = useState(false);
  const planRef = useRef<HTMLDivElement>(null);

  const handleGenerate = () => {
    setGenerating(true);
    onGenerate();
    setTimeout(() => {
      setGenerating(false);
      planRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 400);
  };

  return (
    <>
      {/* Intention picker */}
      <Glass className="p-4 sm:p-5">
        <div className="flex items-center justify-between gap-2 mb-2">
          <p className="font-script text-2xl text-hotpink">This week's vibe</p>
          <PhasePill phase={phase} setPhase={setPhase} />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 sm:gap-2">
          {INTENTIONS.map((i) => {
            const active = intention === i.key;
            const recommended = i.key === "cycle" && phase !== "any";
            return (
              <button
                key={i.key} onClick={() => setIntention(i.key)}
                className={[
                  "relative text-left rounded-xl sm:rounded-2xl border p-2 sm:p-3 transition active:scale-[0.98]",
                  active
                    ? "bg-hotpink text-white border-hotpink shadow shadow-hotpink/30"
                    : "bg-white/80 border-petal/60 text-rose hover:bg-blush",
                ].join(" ")}
              >
                <div className="text-xs sm:text-sm font-semibold leading-tight">{i.label}</div>
                <div className={`text-[10px] sm:text-[11px] mt-0.5 leading-tight ${active ? "text-white/80" : "text-rose/60"}`}>{i.blurb}</div>
                {recommended && !active && (
                  <span
                    className="absolute top-1 right-1 text-[8px] sm:text-[9px] font-bold uppercase rounded-full px-1 sm:px-1.5 py-0.5"
                    style={{
                      background: 'linear-gradient(135deg,#EC4899,#DB2777)',
                      color: 'white',
                      animation: 'ctaBreathe 2.2s ease-in-out infinite',
                      boxShadow: '0 0 8px rgba(236,72,153,.55)',
                    }}
                  >For you</span>
                )}
              </button>
            );
          })}
        </div>
        {/* Action buttons — always 3 equal columns */}
        <div className="mt-4 grid grid-cols-3 gap-2">
          {/* Regenerate */}
          <button
            onClick={handleGenerate}
            disabled={planEmpty || generating}
            className="flex flex-col items-center justify-center gap-1.5 rounded-xl border py-3 px-2 font-semibold text-[11px] active:scale-[.97] transition-all disabled:opacity-35"
            style={{
              borderColor: 'rgba(236,72,153,.35)',
              color: '#EC4899',
              background: 'rgba(236,72,153,.06)',
            }}
          >
            <RefreshCw className="h-4 w-4 animate-spin" style={{ animationDuration: '3s' }} />
            Regenerate
          </button>

          {/* Build pantry — pink + bouncing Apple */}
          <button
            onClick={goPantry}
            className="flex flex-col items-center justify-center gap-1.5 rounded-xl border-2 py-3 px-2 font-semibold text-[11px] active:scale-[.97] transition-all"
            style={{
              borderColor: '#EC4899',
              color: '#EC4899',
              background: 'rgba(236,72,153,.08)',
              boxShadow: '0 2px 10px rgba(236,72,153,.18)',
            }}
          >
            <Apple className="h-4 w-4 animate-bounce" style={{ animationDuration: '1.2s' }} />
            Build pantry
          </button>

          {/* Plan my week — pink gradient primary */}
          <button
            onClick={handleGenerate}
            disabled={generating}
            className="relative overflow-hidden flex flex-col items-center justify-center gap-1.5 rounded-xl py-3 px-2 font-semibold text-[11px] text-white active:scale-[.97] transition-all"
            style={{
              background: generating
                ? 'linear-gradient(135deg,#DB2777,#9D174D)'
                : 'linear-gradient(135deg,#EC4899 0%,#DB2777 55%,#BE185D 100%)',
              boxShadow: '0 4px 14px rgba(236,72,153,.35)',
              animation: generating ? 'none' : 'ctaBreathe 3s ease-in-out infinite',
            }}
          >
            <span aria-hidden className="absolute inset-0 pointer-events-none"
              style={{
                background: 'linear-gradient(100deg,transparent 20%,rgba(255,255,255,.15) 50%,transparent 80%)',
                backgroundSize: '200% 100%',
                animation: 'bloom-shimmer 2.4s linear infinite',
              }}
            />
            {generating
              ? <RefreshCw className="h-4 w-4 animate-spin relative z-10" />
              : <Sparkles className="h-4 w-4 relative z-10 opacity-90" />}
            <span className="relative z-10">{generating ? 'Building…' : 'Plan my week'}</span>
          </button>
        </div>
      </Glass>

      {planEmpty ? (
        <EmptyState
          icon={Calendar}
          title="Your week is waiting"
          blurb="Pick a vibe above and tap Plan my week. I'll build it from what you already own."
          cta="Plan my week" onCta={handleGenerate}
        />
      ) : (
        <div ref={planRef} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {DAYS.map((d, di) => (
            <Glass key={d} className="p-3 animate-scale-in" style={{ animationDelay: `${di * 60}ms` }}>
              <div className="flex items-center justify-between mb-2.5">
                <p className="font-script text-xl text-hotpink">{d}</p>
                <button onClick={() => onRegen(d)} className="text-[11px] inline-flex items-center gap-1 text-rose/60 hover:text-hotpink transition-colors">
                  <RefreshCw className="h-3 w-3" /> redo day
                </button>
              </div>
              <div className="grid grid-cols-3 gap-1.5">
                {(["breakfast","lunch","dinner"] as MealType[]).map((slot) => {
                  const id = plan[d]?.[slot];
                  const r = id ? RECIPES.find((x) => x.id === id) : null;
                  const proteinBoosted = d === proteinBoostDay && slot === "dinner";
                  const fallback = MEAL_PHOTO_FALLBACK[slot] ?? '/images/meal-buddha.jpg';
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

                      {/* Meal type badge */}
                      <div className="absolute top-1.5 left-1.5">
                        <span className="text-[8px] font-bold uppercase tracking-wide text-white/90 bg-black/35 rounded-full px-1.5 py-0.5">
                          {slot === 'breakfast' ? 'morn' : slot === 'dinner' ? 'eve' : slot}
                        </span>
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
            </Glass>
          ))}
        </div>
      )}

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
          const photo = MEAL_PHOTO_FALLBACK['lunchbox'] ?? '/images/meal-lunchbox.jpg';
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
  }, [plan, owned]);

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
        const fallback = MEAL_PHOTO_FALLBACK[r.mealType] ?? '/images/meal-buddha.jpg';
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
  const fallback  = MEAL_PHOTO_FALLBACK[r.mealType] ?? '/images/meal-buddha.jpg';
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
              {r.vibe} · {r.prepMin + r.cookMin} min · {r.difficulty} · {r.cost}
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

          {/* Ingredients */}
          <div>
            <p className="text-xs uppercase font-bold text-hotpink tracking-wider mb-1.5">Ingredients</p>
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
                  <span className="leading-snug">{s}</span>
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