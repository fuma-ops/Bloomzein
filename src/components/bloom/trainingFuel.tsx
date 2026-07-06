import { useMemo, useState } from "react";
import { Utensils, Sparkles, Plus, ShoppingBag, Check } from "lucide-react";
import {
  RECIPES,
  passesMyRules,
  readDietProfile,
  type Recipe,
  type DietGoal,
  type CyclePhase,
  type MealType,
} from "@/components/bloom/recipes/data";
import { addRecipeToMealPlan, addIngredientsToShopping } from "@/lib/crossToolData";

/* ============================================================
   Training ↔ Fuel — the shared thread that lets the Workout,
   Yoga and Meals tools speak to each other.

   Given what the user PLANNED (a strong lift, a gentle flow…),
   her cycle PHASE and her body GOAL (lose / maintain / gain), it
   picks matching recovery meals from the shared recipe database
   and writes a warm, human comment so she *feels* the app knows
   exactly where she is and what she needs.
============================================================ */

export type ActivityKind = "workout" | "yoga";
export type Intensity = "strong" | "moderate" | "gentle";

export interface FuelCtx {
  goal: DietGoal;          // lose | maintain | gain
  phase: CyclePhase;       // period | follicular | ovulation | luteal | any
  kind: ActivityKind;      // workout | yoga
  intensity: Intensity;    // how demanding the planned session is
  activityLabel: string;   // e.g. "Lower Body Sculpt" / "Strength flow"
}

/** Map the app-wide cycle phase (which has a distinct "fertile" window) onto
 *  the recipe database's phase set, so meal filtering & copy line up. */
export function normalizePhase(p: string | null | undefined): CyclePhase {
  switch (p) {
    case "period":
    case "follicular":
    case "ovulation":
    case "luteal":
      return p;
    case "fertile":
      return "ovulation";
    default:
      return "any";
  }
}

/* ---------- Intensity inference (each tool speaks its own language) ---------- */

export function workoutIntensity(intention?: string | null, focus?: string | null): Intensity {
  const s = `${intention ?? ""} ${focus ?? ""}`.toLowerCase();
  if (/recover|restore|mobility|stretch|rest|gentle|calm|breath/.test(s)) return "gentle";
  if (/strength|strengthen|tonify|sculpt|power|hiit|build|glute|leg|lower|full|core|back|arm/.test(s)) return "strong";
  return "moderate";
}

export function yogaIntensity(focus?: string | null): Intensity {
  const s = (focus ?? "").toLowerCase();
  if (/strength/.test(s)) return "moderate";
  if (/energy|morning|power/.test(s)) return "moderate";
  return "gentle"; // stress relief · sleep prep · cycle sync · emotional release
}

/* ---------- Meal picking ---------- */

const RECOVERY_TYPES: MealType[] = ["snack", "breakfast", "lunch", "dinner"];

function proteinDensity(r: Recipe) {
  return r.macros.protein / Math.max(1, r.macros.calories / 100);
}

function scoreFuel(r: Recipe, ctx: FuelCtx, owned?: Set<string>): number {
  let s = 0;
  const m = r.macros;
  if (ctx.goal === "gain") {
    // build: reward protein + carbs + a healthy calorie load
    s += (m.protein + m.carbs) / 20 + m.calories / 250;
  } else if (ctx.goal === "lose") {
    // stay lean: reward protein density, gently penalise heavy calories
    s += proteinDensity(r) * 1.6 - m.calories / 400;
  } else {
    // maintain: balanced protein, avoid extremes
    s += m.protein / 12 - Math.abs(m.calories - 450) / 350;
  }
  // stronger sessions lean harder on protein for repair
  if (ctx.intensity === "strong") s += m.protein / 25;
  // phase match is a small, felt bonus
  if (ctx.phase !== "any" && r.cyclePhase.includes(ctx.phase)) s += 0.4;
  // prefer what she already owns → fewer groceries
  if (owned && owned.size) {
    const have = r.ingredients.filter((i) => owned.has(i.item.toLowerCase())).length;
    s += (have / Math.max(1, r.ingredients.length)) * 0.8;
  }
  return s;
}

/** Up to `count` recovery meals matched to the planned session, phase & goal. */
export function pickFuelRecipes(ctx: FuelCtx, owned?: Set<string>, count = 2): Recipe[] {
  const profile = readDietProfile();
  let pool = RECIPES.filter((r) => passesMyRules(r, profile) && RECOVERY_TYPES.includes(r.mealType));

  // Prefer phase-appropriate recipes when we know the phase.
  if (ctx.phase !== "any") {
    const hits = pool.filter((r) => r.cyclePhase.includes(ctx.phase) || r.cyclePhase.includes("any"));
    if (hits.length >= count) pool = hits;
  }
  // Prefer recipes tagged for her body goal.
  const goalHits = pool.filter((r) => r.goal.includes(ctx.goal));
  if (goalHits.length >= count) pool = goalHits;

  // Strong / moderate sessions want real protein for recovery.
  const minProtein = ctx.intensity === "strong" ? 20 : ctx.intensity === "moderate" ? 12 : 0;
  if (minProtein > 0) {
    const hits = pool.filter((r) => r.macros.protein >= minProtein);
    if (hits.length >= count) pool = hits;
  }

  return [...pool].sort((a, b) => scoreFuel(b, ctx, owned) - scoreFuel(a, ctx, owned)).slice(0, count);
}

/* ---------- The comment — the part that makes her feel *seen* ---------- */

const GOAL_LABEL: Record<DietGoal, string> = { lose: "lean goal", maintain: "maintain goal", gain: "build goal" };
const PHASE_LABEL: Record<CyclePhase, string> = {
  period: "period", follicular: "follicular", ovulation: "ovulation", luteal: "luteal", any: "",
};

function leadLine(ctx: FuelCtx): string {
  if (ctx.kind === "yoga") {
    if (ctx.intensity === "gentle")
      return "After your flow, keep it light and nourishing — gentle fuel for a calm, unwound body.";
    return "After your yoga, a protein-forward, easy-to-digest plate helps you settle and recover.";
  }
  // workout
  if (ctx.intensity === "strong") {
    if (ctx.goal === "gain") return "Big session today — refuel to build: protein + complex carbs so you grow stronger.";
    if (ctx.goal === "lose") return "You trained hard — a protein-first plate rebuilds muscle while keeping you lean.";
    return "Strength work done — balanced protein + carbs so your body recovers beautifully.";
  }
  if (ctx.intensity === "moderate")
    return "Nice session — a protein-forward meal now helps you bounce back for tomorrow.";
  return "Light movement today — a gentle, balanced plate keeps your energy even.";
}

function phaseLine(phase: CyclePhase): string {
  switch (phase) {
    case "period":     return " You're on your period — lean into iron & magnesium; your body is asking for it.";
    case "follicular": return " Your follicular energy is rising — lean protein powers the climb.";
    case "ovulation":  return " Around ovulation you're at your peak — keep it fresh, bright and light.";
    case "luteal":     return " You're in your luteal phase — complex carbs & magnesium soften the cravings.";
    default:           return "";
  }
}

/** The warm cross-tool sentence shown above the meals. */
export function fuelComment(ctx: FuelCtx): string {
  return leadLine(ctx) + phaseLine(ctx.phase);
}

/** Short chips describing *why* these meals were chosen. */
export function fuelChips(ctx: FuelCtx): string[] {
  const chips: string[] = [];
  chips.push(ctx.kind === "yoga" ? "after your yoga" : "after your session");
  if (ctx.phase !== "any") chips.push(`${PHASE_LABEL[ctx.phase]} phase`);
  chips.push(GOAL_LABEL[ctx.goal]);
  return chips;
}

/** Meals-side awareness: reads how much training is planned and speaks to it,
 *  so the Meals Planner proves it knows the user's sport & yoga plans. */
export function trainingAwarenessComment(opts: {
  workoutDays: number;
  yogaDays: number;
  phase: CyclePhase;
  goal: DietGoal;
}): string | null {
  const { workoutDays: w, yogaDays: y, phase, goal } = opts;
  if (!w && !y) return null;
  const parts: string[] = [];
  if (w) parts.push(`${w} workout${w > 1 ? "s" : ""}`);
  if (y) parts.push(`${y} yoga session${y > 1 ? "s" : ""}`);
  const list = parts.join(" and ");
  const goalBit =
    goal === "gain"   ? "leaning protein- and carb-rich to help you build"
    : goal === "lose" ? "kept protein-forward and light to keep you lean"
    :                   "balanced to keep you recovered and steady";
  let s = `You've got ${list} planned this week — your meals are ${goalBit} on training days.`;
  const p = phaseLine(phase).trim();
  if (p) s += " " + p;
  return s;
}

/* ---------- Photo helper (mirrors the Meals week grid) ---------- */

const MEAL_FALLBACK: Record<string, string> = {
  breakfast: "/images/meal-oats.webp",
  lunch: "/images/meal-buddha.webp",
  dinner: "/images/meal-stew.webp",
  snack: "/images/meal-buddha.webp",
  lunchbox: "/images/meal-lunchbox.webp",
};
function recipePhoto(r: Recipe): string {
  if (r.image) return r.image;
  if (r.photo) return `/images/recipes/${r.photo}`;
  return MEAL_FALLBACK[r.mealType] ?? "/images/meal-buddha.webp";
}

/* ---------- Mini meal card — image + macro chips + actions (Diet-style) ---------- */

const PLAN_SLOTS = ["breakfast", "lunch", "dinner", "snack", "lunchbox"] as const;
function planSlotFor(r: Recipe): (typeof PLAN_SLOTS)[number] {
  return (PLAN_SLOTS as readonly string[]).includes(r.mealType) ? (r.mealType as (typeof PLAN_SLOTS)[number]) : "dinner";
}

function MiniMealCard({ r, day, onOpen }: { r: Recipe; day?: string; onOpen?: (id: string) => void }) {
  const fallback = MEAL_FALLBACK[r.mealType] ?? "/images/meal-buddha.webp";
  const [planned, setPlanned] = useState(false);
  const [listed, setListed] = useState(false);
  const macros = [
    { k: "kcal", v: r.macros.calories, cls: "text-hotpink" },
    { k: "P", v: `${r.macros.protein}g`, cls: "text-amber-600" },
    { k: "C", v: `${r.macros.carbs}g`, cls: "text-rose-500" },
    { k: "F", v: `${r.macros.fat}g`, cls: "text-violet-500" },
  ];

  const addToPlan = () => {
    // No day (e.g. a Meals-side card) → default to today's weekday label.
    const target = day ?? ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][new Date().getDay()];
    addRecipeToMealPlan(r.id, target, planSlotFor(r));
    setPlanned(true);
  };
  const addToShopping = () => {
    addIngredientsToShopping(r.ingredients.map((i) => i.item));
    setListed(true);
  };

  return (
    <div className="rounded-2xl overflow-hidden border border-petal/60 bg-white/85 shadow-sm transition-all">
      <button
        type="button"
        onClick={() => onOpen?.(r.id)}
        className="group block w-full text-left"
      >
        <div className="relative h-20 sm:h-24 overflow-hidden">
          <img
            src={recipePhoto(r)}
            alt={r.name}
            className="absolute inset-0 h-full w-full object-cover transition-transform group-hover:scale-105"
            onError={(e) => { (e.currentTarget as HTMLImageElement).src = fallback; }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-transparent" />
          <p className="absolute bottom-1.5 left-2 right-2 text-[10px] font-bold text-white leading-tight line-clamp-2 drop-shadow">
            {r.name}
          </p>
        </div>
      </button>
      <div className="grid grid-cols-4 gap-0.5 p-1.5">
        {macros.map((m) => (
          <div key={m.k} className="rounded-lg bg-blush/50 py-1 text-center">
            <p className={`text-[10px] font-black leading-none ${m.cls}`}>{m.v}</p>
            <p className="text-[7px] font-bold uppercase tracking-wide text-rose/50 mt-0.5">{m.k}</p>
          </div>
        ))}
      </div>
      {/* Actions — make the linkage actionable */}
      <div className="grid grid-cols-2 gap-1 px-1.5 pb-1.5">
        <button
          type="button"
          onClick={addToPlan}
          disabled={planned}
          className={`inline-flex items-center justify-center gap-1 rounded-lg px-1.5 py-1.5 text-[9px] font-bold transition active:scale-95 ${
            planned ? "bg-hotpink/15 text-hotpink" : "bg-hotpink text-white hover:brightness-105"
          }`}
        >
          {planned ? <><Check className="h-2.5 w-2.5" strokeWidth={3} /> Planned</> : <><Plus className="h-2.5 w-2.5" strokeWidth={3} /> My plan</>}
        </button>
        <button
          type="button"
          onClick={addToShopping}
          disabled={listed}
          className={`inline-flex items-center justify-center gap-1 rounded-lg border px-1.5 py-1.5 text-[9px] font-bold transition active:scale-95 ${
            listed ? "border-hotpink/30 bg-hotpink/10 text-hotpink" : "border-hotpink/50 text-hotpink hover:bg-hotpink/10"
          }`}
        >
          {listed ? <><Check className="h-2.5 w-2.5" strokeWidth={3} /> Added</> : <><ShoppingBag className="h-2.5 w-2.5" strokeWidth={2.4} /> To list</>}
        </button>
      </div>
    </div>
  );
}

/* ---------- FuelCard — the shared cross-tool nudge ---------- */

export function FuelCard({
  ctx,
  owned,
  count = 2,
  day,
  heading,
  embedded = false,
  className = "",
  onOpenRecipe,
}: {
  ctx: FuelCtx;
  owned?: Set<string>;
  count?: number;
  /** Weekday (Mon..Sun) the "+ My plan" button writes the meal into. */
  day?: string;
  /** Ties the fuel to a specific session, e.g. "After your Lower Body Sculpt". */
  heading?: string;
  /** When nested inside a day card, drop the standalone shell (border/bg). */
  embedded?: boolean;
  className?: string;
  onOpenRecipe?: (id: string) => void;
}) {
  const recipes = useMemo(() => pickFuelRecipes(ctx, owned, count), [ctx, owned, count]);
  if (!recipes.length) return null;

  const shell = embedded
    ? ""
    : "rounded-2xl border border-petal/70 bg-gradient-to-br from-blush/50 to-petal/25";

  return (
    <div className={`${shell} p-2.5 sm:p-3 animate-fade-in ${className}`}>
      {/* header — explicitly tied to THIS session & day */}
      <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
        <span className="animate-soft-zoom inline-flex items-center gap-1 rounded-full bg-hotpink text-white px-2 py-0.5 text-[9px] font-black uppercase tracking-wide shrink-0">
          <Utensils className="h-2.5 w-2.5" /> Eat after
        </span>
        {heading && <span className="text-[10.5px] font-bold text-hotpink leading-tight">{heading}</span>}
        {ctx.phase !== "any" && (
          <span className="rounded-full bg-white/80 border border-petal/60 px-2 py-0.5 text-[9px] font-bold text-rose/70">{PHASE_LABEL[ctx.phase]} phase</span>
        )}
        <span className="rounded-full bg-white/80 border border-petal/60 px-2 py-0.5 text-[9px] font-bold text-rose/70">{GOAL_LABEL[ctx.goal]}</span>
      </div>

      {/* the human comment */}
      <p className="flex items-start gap-1 text-[11px] leading-snug text-rose/85 mb-2">
        <Sparkles className="animate-icon-breathe h-3 w-3 shrink-0 mt-0.5 text-hotpink" strokeWidth={2} />
        <span>{fuelComment(ctx)}</span>
      </p>

      {/* the meals */}
      <div className="grid grid-cols-2 gap-2">
        {recipes.map((r) => (
          <MiniMealCard key={r.id} r={r} day={day} onOpen={onOpenRecipe} />
        ))}
      </div>
    </div>
  );
}
