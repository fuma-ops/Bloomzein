
import { useEffect, useMemo, useState } from "react";
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
) {
  const used = new Set<string>();
  const plan: Record<string, Record<MealType, string | null>> = {};
  DAYS.forEach((d) => {
    plan[d] = { breakfast: null, lunch: null, dinner: null, snack: null, lunchbox: null };
    (["breakfast", "lunch", "dinner"] as MealType[]).forEach((type) => {
      const r = pickForSlot(pool, type, intention, phase, owned, used, ratings);
      if (r) { plan[d][type] = r.id; used.add(r.id); }
    });
  });
  return plan;
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

  const owned = useMemo(() => pantrySet(pantry), [pantry]);
  const planEmpty = Object.keys(plan).length === 0;

  // Diet tool's "My Rules" (allergies + diet type) silently filter the pool
  // every recipe is picked from, so the weekly plan never recommends a recipe
  // the user has ruled out in the Diet tool.
  const myRulesPool = useMemo(() => {
    const profile = readDietProfile();
    return RECIPES.filter((r) => passesMyRules(r, profile));
  }, []);

  const generateWeek = () => {
    const p = buildWeek(myRulesPool, intention, phase, owned, ratings);
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
    const r = pickForSlot(myRulesPool, type, intention, phase, owned, used, ratings);
    if (r) setPlan({ ...plan, [day]: { ...plan[day], [type]: r.id } });
  };

  const regenDay = (day: string) => {
    const used = new Set<string>();
    const slots: MealType[] = ["breakfast", "lunch", "dinner"];
    const dayPlan: Record<MealType, string | null> = { breakfast: null, lunch: null, dinner: null, snack: null, lunchbox: null };
    slots.forEach((type) => {
      const r = pickForSlot(myRulesPool, type, intention, phase, owned, used, ratings);
      if (r) { dayPlan[type] = r.id; used.add(r.id); }
    });
    setPlan({ ...plan, [day]: dayPlan });
  };

  const toggleFav = (id: string) => {
    setFavorites((f) => (f.includes(id) ? f.filter((x) => x !== id) : [...f, id]));
  };

  return (
    <div className="relative animate-fade-in max-w-full overflow-x-hidden">
      <BloomBubbles count={10} />

      <a href="/app/tools" className="mb-3 inline-flex items-center gap-1 text-sm text-rose hover:text-hotpink">
        <ArrowLeft className="h-4 w-4" /> All tools
      </a>

      {/* HEADER */}
      <header className="mb-3 sm:mb-4 sticky top-0 z-30 -mx-3 px-3 pt-2 pb-2 sm:static sm:mx-0 sm:px-0 sm:pt-0 sm:pb-0 bg-blush/70 sm:bg-transparent backdrop-blur-md sm:backdrop-blur-none">
        <div className="flex items-end justify-between gap-3 flex-wrap">
          <div>
            <h1 className="font-script text-3xl sm:text-5xl lg:text-6xl text-hotpink leading-none">Meal Planner</h1>
            <p className="mt-0.5 sm:mt-1 text-xs sm:text-sm text-rose/80">cook with love, glow all week ✿</p>
          </div>
          <div className="text-xs text-rose/70 hidden sm:block">phase: <b className="text-hotpink">{phase}</b></div>
        </div>

        {/* Pill tabs — horizontally scrollable, last pill always reachable */}
        <nav
          className="mt-3 -mx-3 px-3 pr-6 flex gap-2 overflow-x-auto no-scrollbar scroll-smooth snap-x"
          style={{ scrollPaddingRight: "1.5rem", scrollPaddingLeft: "0.75rem" }}
        >
          {TABS.map((t) => {
            const active = tab === t.key;
            return (
              <button
                key={t.key}
                onClick={(e) => {
                  setTab(t.key);
                  (e.currentTarget as HTMLElement).scrollIntoView({
                    behavior: "smooth", inline: "nearest", block: "nearest",
                  });
                }}
                className={[
                  "shrink-0 snap-start inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs sm:text-sm font-semibold transition border whitespace-nowrap",
                  active
                    ? "bg-hotpink text-white border-hotpink shadow shadow-hotpink/30"
                    : "bg-white/80 text-rose border-petal/60 hover:bg-blush",
                ].join(" ")}
              >
                <t.icon className="h-4 w-4 shrink-0" strokeWidth={1.8} />
                {t.label}
              </button>
            );
          })}
          {/* trailing spacer so the last pill is fully reachable */}
          <span className="shrink-0 w-2" aria-hidden />
        </nav>
      </header>

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
            goPantry={() => { setStep(1); setTab("pantry"); }}
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

      {openRecipe && (
        <RecipeSheet
          id={openRecipe} onClose={() => setOpenRecipe(null)}
          favorites={favorites} toggleFav={toggleFav}
          ratings={ratings} setRatings={setRatings}
        />
      )}

      <style>{`.no-scrollbar::-webkit-scrollbar{display:none}.no-scrollbar{-ms-overflow-style:none;scrollbar-width:none}`}</style>
    </div>
  );
}

/* ---------- Guided Welcome ---------- */

function GuidedWelcome({ onStart }: { onStart: () => void }) {
  return (
    <Glass className="overflow-hidden">
      <div className="grid sm:grid-cols-[1fr_320px] items-stretch">
        <div className="p-5 sm:p-7">
          <p className="text-xs uppercase tracking-wider text-rose/70 font-semibold">welcome</p>
          <h2 className="font-script text-3xl sm:text-4xl text-hotpink leading-tight mt-1">
            Cook your softest week ever
          </h2>
          <p className="mt-2 text-sm text-rose/80">
            Three little steps and you're sorted: tell me what's in your kitchen, pick your vibe,
            and I'll plan all 7 days from what you already have.
          </p>
          <ol className="mt-3 space-y-1.5 text-sm text-rose">
            <li><b className="text-hotpink">1.</b> Build your pantry</li>
            <li><b className="text-hotpink">2.</b> Pick this week's vibe</li>
            <li><b className="text-hotpink">3.</b> Get your week ✨</li>
          </ol>
          <div className="mt-4">
            <PinkBtn onClick={onStart}>
              Start here <ChevronRight className="h-4 w-4" />
            </PinkBtn>
          </div>
        </div>
        <div
          className="hidden sm:block bg-cover bg-center min-h-[180px]"
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
  onOpen, onSwap, onRegen, owned, goPantry,
}: any) {
  const hasPantry = owned.size > 0;
  return (
    <>
      {/* Intention picker */}
      <Glass className="p-4 sm:p-5">
        <div className="flex items-center justify-between gap-2 mb-2">
          <p className="font-script text-2xl text-hotpink">This week's vibe</p>
          <PhasePill phase={phase} setPhase={setPhase} />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {INTENTIONS.map((i) => {
            const active = intention === i.key;
            const recommended = i.key === "cycle" && phase !== "any";
            return (
              <button
                key={i.key} onClick={() => setIntention(i.key)}
                className={[
                  "relative text-left rounded-2xl border p-3 transition active:scale-[0.98]",
                  active
                    ? "bg-hotpink text-white border-hotpink shadow shadow-hotpink/30"
                    : "bg-white/80 border-petal/60 text-rose hover:bg-blush",
                ].join(" ")}
              >
                <div className="text-sm font-semibold">{i.label}</div>
                <div className={`text-[11px] mt-0.5 ${active ? "text-white/80" : "text-rose/60"}`}>{i.blurb}</div>
                {recommended && !active && (
                  <span className="absolute top-1.5 right-1.5 text-[9px] font-bold uppercase rounded-full bg-hotpink/10 text-hotpink px-1.5 py-0.5">For you</span>
                )}
              </button>
            );
          })}
        </div>
        <div className="mt-3 flex flex-wrap gap-2 items-center">
          <PinkBtn onClick={onGenerate}>
            <Sparkles className="h-4 w-4" /> Plan my week
          </PinkBtn>
          {!hasPantry && (
            <PinkBtn variant="outline" onClick={goPantry}>
              Build pantry first
            </PinkBtn>
          )}
          {!planEmpty && (
            <PinkBtn variant="ghost" onClick={onGenerate}>
              <RefreshCw className="h-4 w-4" /> Regenerate week
            </PinkBtn>
          )}
        </div>
      </Glass>

      {planEmpty ? (
        <EmptyState
          icon={Calendar}
          title="Your week is waiting"
          blurb="Pick a vibe above and tap Plan my week. I'll build it from what you already own."
          cta="Plan my week" onCta={onGenerate}
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {DAYS.map((d) => (
            <Glass key={d} className="p-3">
              <div className="flex items-center justify-between mb-2">
                <p className="font-script text-xl text-hotpink">{d}</p>
                <button onClick={() => onRegen(d)} className="text-[11px] inline-flex items-center gap-1 text-rose hover:text-hotpink">
                  <RefreshCw className="h-3 w-3" /> redo
                </button>
              </div>
              <div className="space-y-1.5">
                {(["breakfast","lunch","dinner"] as MealType[]).map((slot) => {
                  const id = plan[d]?.[slot];
                  const r = id ? RECIPES.find((x) => x.id === id) : null;
                  return (
                    <div key={slot} className="flex items-center gap-2 rounded-xl bg-blush/60 px-2 py-1.5">
                      <span className="text-[10px] uppercase font-bold text-hotpink w-14 shrink-0">{slot}</span>
                      {r ? (
                        <button onClick={() => onOpen(r.id)} className="flex-1 text-left text-sm text-rose truncate font-medium hover:text-hotpink">
                          {r.name}
                        </button>
                      ) : (
                        <span className="flex-1 text-xs text-rose/50">—</span>
                      )}
                      <button onClick={() => onSwap(d, slot)} title="Swap" className="text-rose hover:text-hotpink">
                        <Shuffle className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </Glass>
          ))}
        </div>
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
      <div className="flex items-center justify-between mb-2">
        <p className="font-script text-2xl text-hotpink">Kids — this week</p>
        <PinkBtn variant="ghost" onClick={onGenerate}><RefreshCw className="h-4 w-4" /> Refresh</PinkBtn>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
        {KID_DAYS.map((d) => {
          const id = kidPlan[d];
          const r = id ? RECIPES.find((x) => x.id === id) : null;
          return (
            <button
              key={d} onClick={() => r && onOpen(r.id)}
              className="text-left rounded-2xl bg-white/85 border border-petal/60 p-2 hover:border-hotpink transition"
            >
              {r?.image && (
                <div className="aspect-square w-full overflow-hidden rounded-xl bg-blush mb-2">
                  <img src={r.image} alt={r.name} loading="lazy" className="h-full w-full object-cover" referrerPolicy="no-referrer" />
                </div>
              )}
              <p className="text-[11px] uppercase font-bold text-hotpink">{d}</p>
              <p className="text-sm font-semibold text-rose leading-tight">{r?.name ?? "—"}</p>
            </button>
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
    return <EmptyState icon={Sparkles} title="Prep needs a plan"
      blurb="Once your week is planned, I'll show you the smart order to batch-cook everything."
      cta="Go to This Week" onCta={goWeek} />;
  }
  const recipes = Object.values(plan as Record<string, Record<MealType, string | null>>)
    .flatMap((d) => Object.values(d).filter(Boolean) as string[])
    .map((id) => RECIPES.find((r) => r.id === id)!)
    .filter(Boolean);
  const oven = recipes.filter((r) => r.cookMin >= 15);
  const stove = recipes.filter((r) => r.cookMin > 0 && r.cookMin < 15);
  const cold = recipes.filter((r) => r.cookMin === 0);
  return (
    <Glass className="p-4 sm:p-5">
      <p className="font-script text-2xl text-hotpink">Sunday prep — in 2 hours your week is ready</p>
      <ol className="mt-3 space-y-3">
        <PrepStep n={1} title="Oven first (longest cook)" items={oven.map((r) => r.name)} />
        <PrepStep n={2} title="Stovetop while oven runs" items={stove.map((r) => r.name)} />
        <PrepStep n={3} title="Cold prep & assembly" items={cold.map((r) => r.name)} />
        <PrepStep n={4} title="Pack & label" items={["Portion into containers", "Label with date", "Fridge or freezer per recipe"]} />
      </ol>
    </Glass>
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

function FavsTab({ favorites, ratings, setRatings, onOpen, toggleFav }: any) {
  const list = RECIPES.filter((r) => favorites.includes(r.id));
  if (!list.length) {
    return <EmptyState icon={Heart} title="No favorites yet"
      blurb="Open any recipe and tap the heart. Loved meals get boosted in future weeks."
      cta="Browse this week" onCta={() => {}} />;
  }
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {list.map((r) => (
        <Glass key={r.id} className="p-3">
          <button onClick={() => onOpen(r.id)} className="w-full text-left">
            {r.image && <div className="aspect-[4/3] rounded-xl overflow-hidden bg-blush mb-2"><img src={r.image} loading="lazy" alt={r.name} className="h-full w-full object-cover" referrerPolicy="no-referrer" /></div>}
            <p className="font-semibold text-rose">{r.name}</p>
          </button>
          <div className="mt-2 flex items-center gap-1">
            {(["love","ok","never"] as const).map((v) => (
              <button key={v} onClick={() => setRatings({ ...ratings, [r.id]: v })}
                className={`text-[11px] rounded-full px-2 py-0.5 border ${ratings[r.id] === v ? "bg-hotpink text-white border-hotpink" : "border-petal/60 text-rose"}`}>
                {v}
              </button>
            ))}
            <button onClick={() => toggleFav(r.id)} className="ml-auto text-hotpink"><Heart className="h-4 w-4 fill-hotpink" /></button>
          </div>
        </Glass>
      ))}
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
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm p-0 sm:p-4 animate-fade-in" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()}
        className="w-full sm:max-w-lg max-h-[92vh] overflow-y-auto rounded-t-[2rem] sm:rounded-[2rem] bg-white shadow-2xl">
        {r.image && <div className="h-40 sm:h-56 bg-cover bg-center" style={{ backgroundImage: `url(${r.image})` }} />}
        <div className="p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="font-script text-3xl text-hotpink leading-none">{r.name}</h3>
              <p className="mt-1 text-xs text-rose/70">
                {r.vibe} · {r.prepMin + r.cookMin} min · {r.difficulty} · {r.cost}
              </p>
            </div>
            <button onClick={onClose} className="grid h-9 w-9 place-items-center rounded-full bg-blush text-hotpink"><X className="h-4 w-4" /></button>
          </div>

          <p className="mt-4 text-xs uppercase font-bold text-hotpink">Ingredients</p>
          <ul className="mt-1 space-y-0.5 text-sm text-rose">
            {r.ingredients.map((i) => <li key={i.item}>• {i.qty} — {i.item}</li>)}
          </ul>

          <p className="mt-4 text-xs uppercase font-bold text-hotpink">Steps</p>
          <ol className="mt-1 space-y-1 text-sm text-rose list-decimal list-inside">
            {r.steps.map((s, i) => <li key={i}>{s}</li>)}
          </ol>

          <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
            <div className="rounded-xl bg-blush/70 p-2"><b className="text-hotpink">Keeps:</b> {r.conservation.fridgeDays}d fridge{r.conservation.freezerWeeks ? ` · ${r.conservation.freezerWeeks}w freezer` : ""}</div>
            <div className="rounded-xl bg-blush/70 p-2"><b className="text-hotpink">Container:</b> {r.conservation.container || "Airtight"}</div>
            {r.batchTip && <div className="rounded-xl bg-blush/70 p-2 col-span-2"><b className="text-hotpink">Batch:</b> {r.batchTip}</div>}
            {r.substitutionTip && <div className="rounded-xl bg-blush/70 p-2 col-span-2"><b className="text-hotpink">Swap:</b> {r.substitutionTip}</div>}
          </div>

          <div className="mt-4 flex items-center gap-2">
            <PinkBtn onClick={() => toggleFav(r.id)} variant={fav ? "solid" : "outline"}>
              <Heart className={`h-4 w-4 ${fav ? "fill-white" : ""}`} /> {fav ? "Loved" : "Save"}
            </PinkBtn>
            <div className="flex items-center gap-1 ml-auto">
              {(["love","ok","never"] as const).map((v) => (
                <button key={v} onClick={() => setRatings({ ...ratings, [r.id]: v })}
                  className={`text-[11px] rounded-full px-2 py-1 border ${ratings[r.id] === v ? "bg-hotpink text-white border-hotpink" : "border-petal/60 text-rose"}`}>
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