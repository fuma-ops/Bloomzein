/**
 * planReasoning — the ONE engine behind "why Bloomzein chose this for you today".
 *
 * Every card in Today's Plan (a meal, a yoga flow, a workout, a journaling prompt)
 * opens a reasoning sheet that explains, from REAL signals, why it's in her plan:
 * her cycle phase, the day's movement, her energy needs, and her diet goal. The
 * text is assembled from data-driven templates (this recipe's actual iron/protein,
 * her goal, the day's flow) — never generic filler, and never a private copy of
 * shared data (phase, recipes, PHASE_PLAN all come from their canonical stores).
 */
import { PHASE_LABEL, toDietPhase, type CyclePhase } from "@/components/bloom/cyclePhase";
import { RECIPES, readDietProfile, type Recipe, type DietGoal } from "@/components/bloom/recipes/data";
import { PHASE_PLAN } from "@/components/bloom/phasePlan";
import { ARTICLES } from "@/lib/readsData";

type Phase = Exclude<CyclePhase, "any">;
export type PlanItemType = "meal" | "yoga" | "workout" | "journal";

export interface ReasonCard {
  key: "cycle" | "movement" | "energy" | "goal";
  title: string;
  supports: string;      // the bold phrase under the title
  bullets: string[];
}
export interface MicroStar { label: string; stars: number; } // 0..5 in 0.5 steps
export interface ExploreLink { label: string; sub: string; href: string; kind: "read" | "yoga" | "meditation" | "workout"; }

export interface PlanReason {
  type: PlanItemType;
  typeLabel: string;                 // "Breakfast" · "Yoga flow" · "Workout" · "Journaling"
  tags: string[];                    // ["26g protein","Balanced","Satisfying"] / ["15 min","Gentle"]
  kcal?: number;
  narrative: string;
  cards: ReasonCard[];
  nutrition?: { calories: number; protein: number; carbs: number; fat: number; fibre: number };
  micros?: MicroStar[];
  didYouKnow: string;
  bloomTip: string;
  avoided: string;
  explore: ExploreLink[];
}

export interface ReasonContext {
  yoga?: { planned: boolean; title: string };
  workout?: { planned: boolean; title: string };
  goal?: DietGoal;
}

/* ── Micronutrient → star rating (per serving vs a sensible daily target) ── */
const MICRO_TARGET: Record<string, number> = {
  iron: 18, magnesium: 320, omega3: 1.6, vitaminC: 75, fibre: 28, vitaminB6: 1.3, calcium: 1000, vitaminD: 15,
};
const MICRO_LABEL: Record<string, string> = {
  iron: "Iron", magnesium: "Magnesium", omega3: "Omega-3", vitaminC: "Vitamin C",
  fibre: "Fibre", vitaminB6: "Vitamin B6", calcium: "Calcium", vitaminD: "Vitamin D",
};
/** A serving giving ~35% of the daily target reads as a full 5★. */
function microStars(value: number, key: string): number {
  const target = MICRO_TARGET[key] ?? 100;
  const frac = value / target;
  const raw = (frac / 0.35) * 5;
  return Math.max(0.5, Math.min(5, Math.round(raw * 2) / 2));
}

const GOAL_LABEL: Record<DietGoal, string> = { lose: "Lose Weight", maintain: "Maintain Weight", gain: "Build Strength" };

/* ── Phase content (data-driven templates the engine fills with real numbers) ── */
interface PhaseContent {
  energy: string[];         // what this phase drains → the item helps
  cycleBullets: string[];   // supportive qualities for this phase
  bodyLine: string;         // "…to support your energy, reduce cramps…"
  didYouKnow: string;
  tip: string;
  avoided: string;
  yogaWhy: string[];        // cycle bullets for a movement/yoga item
}
const PHASE_CONTENT: Record<Phase, PhaseContent> = {
  period: {
    energy: ["Fatigue", "Cravings", "Blood-sugar crashes"],
    cycleBullets: ["Iron-rich", "Anti-inflammatory", "Gentle digestion"],
    bodyLine: "support your energy, ease cramps and keep you comfortably full",
    didYouKnow: "Iron and vitamin C together help replace what your body loses during your period — pairing them boosts absorption.",
    tip: "Pair this with a warm cup of chamomile or ginger tea to soothe cramps and support relaxation.",
    avoided: "We avoided heavy, high-sugar options today — quick sugar spikes can worsen fatigue and mood swings during your period.",
    yogaWhy: ["Gentle on the body", "Eases cramps", "Calms the nervous system"],
  },
  follicular: {
    energy: ["Low motivation", "Brain fog", "Sluggish starts"],
    cycleBullets: ["Light & fresh", "Estrogen-supportive", "Fibre for balance"],
    bodyLine: "fuel your rising energy and focus as you come back to life",
    didYouKnow: "Rising estrogen this week makes your body handle carbs and build muscle more efficiently — a great time to fuel movement.",
    tip: "This pairs beautifully with a brisk walk or a strength session — your energy is on the way up.",
    avoided: "We kept it light rather than heavy and rich — your body wants fresh, energising food as estrogen rises.",
    yogaWhy: ["Builds gentle heat", "Channels rising energy", "Improves mobility"],
  },
  fertile: {
    energy: ["Restlessness", "Over-doing it", "Afternoon dips"],
    cycleBullets: ["Antioxidant-rich", "Anti-inflammatory", "Hydrating"],
    bodyLine: "support you at your most magnetic, energetic phase",
    didYouKnow: "Antioxidants and fibre this week support healthy estrogen clearance — helping you feel clear and radiant.",
    tip: "You're near your peak — this fuels a stronger flow or a social, active day beautifully.",
    avoided: "We skipped inflammatory, greasy options — they can dull the radiance and energy of your fertile window.",
    yogaWhy: ["Opens and strengthens", "Matches peak energy", "Builds balance"],
  },
  ovulation: {
    energy: ["Burnout risk", "Restlessness", "Peaks & crashes"],
    cycleBullets: ["Protein-rich", "Antioxidant-rich", "Anti-inflammatory"],
    bodyLine: "fuel and replenish you at the peak of your energy",
    didYouKnow: "You're at your energy peak — protein and antioxidants now help you make the most of it and recover well.",
    tip: "Great fuel for a higher-intensity session — your body can handle more this week.",
    avoided: "We avoided low-protein, sugary picks — they'd leave you crashing at a time you could feel your strongest.",
    yogaWhy: ["Strong and open", "Uses peak energy", "Builds power"],
  },
  luteal: {
    energy: ["Mood dips", "Cravings", "Bloating"],
    cycleBullets: ["Magnesium-rich", "Complex carbs", "Serotonin-supportive"],
    bodyLine: "steady your mood, ease cravings and comfort your body",
    didYouKnow: "Magnesium and complex carbs in the luteal phase help lift serotonin — easing PMS mood dips and cravings, kindly.",
    tip: "Pair this with a little dark chocolate or pumpkin seeds — extra magnesium to soften cravings.",
    avoided: "We steered clear of salty, high-sugar options — they tend to worsen luteal bloating and mood swings.",
    yogaWhy: ["Grounding & calming", "Softens tension", "Honours lower energy"],
  },
};

/* ── Explore-more links, phase-aware ── */
function exploreFor(phase: Phase): ExploreLink[] {
  const dphase = toDietPhase(phase);
  const article = ARTICLES.find((a) => a.phase === dphase) || ARTICLES.find((a) => a.topic === "Cycle & Body");
  const yoga = PHASE_PLAN[phase].yoga;
  return [
    { label: "Read", sub: article?.title ?? "For your phase", href: "/app/read", kind: "read" },
    { label: "Yoga", sub: `${yoga.title} · ${yoga.launch.durationMin} min`, href: "/app/tools/yoga", kind: "yoga" },
    { label: "Meditation", sub: "Morning Calm · 5 min", href: "/app/tools/yoga", kind: "meditation" },
  ];
}

/** Resolve the recipe behind a meal plan item (its launch payload carries the id). */
export function recipeForItem(item: { id: string; label: string; launch?: { key: string; val: unknown } }): Recipe | null {
  const id = typeof item.launch?.val === "string" ? item.launch.val : null;
  if (id) { const r = RECIPES.find((x) => x.id === id); if (r) return r; }
  return RECIPES.find((x) => x.name === item.label) ?? null;
}

const SLOT_LABEL: Record<string, string> = { breakfast: "Breakfast", lunch: "Lunch", snack: "Snack", dinner: "Dinner" };

/** THE reasoning for one plan item — everything the sheet renders. */
export function reasonForItem(
  item: { id: string; label: string; time: string; blurb: string; prompt?: string; launch?: { key: string; val: unknown } },
  phase: Phase,
  ctx: ReasonContext = {},
): PlanReason {
  const pc = PHASE_CONTENT[phase];
  const phaseLabel = PHASE_LABEL[phase];
  const goal = ctx.goal ?? readDietProfile().goal;
  const explore = exploreFor(phase);
  const movement = ctx.yoga?.planned ? ctx.yoga.title : ctx.workout?.planned ? ctx.workout.title : null;

  const type: PlanItemType =
    item.id.startsWith("meal-") ? "meal" : item.id === "yoga" ? "yoga" : item.id === "workout" ? "workout" : "journal";

  // ── MEAL ──────────────────────────────────────────────────────────────────
  if (type === "meal") {
    const r = recipeForItem(item);
    const slot = item.id.replace("meal-", "");
    const typeLabel = SLOT_LABEL[slot] ?? "Meal";
    if (!r) {
      // Unplanned slot — a lighter "why plan this" reason.
      return {
        type, typeLabel, tags: [phaseLabel + " phase"], narrative:
          `Your body is in the ${phaseLabel.toLowerCase()} phase today. Add a ${typeLabel.toLowerCase()} and Bloomzein will match it to ${pc.bodyLine}.`,
        cards: [{ key: "cycle", title: "Cycle", supports: `${phaseLabel} phase`, bullets: pc.cycleBullets }],
        didYouKnow: pc.didYouKnow, bloomTip: pc.tip, avoided: pc.avoided, explore,
      };
    }
    // Real macro/micro-driven reasoning.
    const owned = Object.entries(r.micros).filter(([, v]) => (v ?? 0) > 0);
    const microStarsList: MicroStar[] = owned
      .sort((a, b) => microStars(b[1] as number, b[0]) - microStars(a[1] as number, a[0]))
      .slice(0, 4)
      .map(([k, v]) => ({ label: MICRO_LABEL[k] ?? k, stars: microStars(v as number, k) }));
    // Cycle bullets: keep only those the recipe actually earns.
    const microKeys = new Set(owned.map(([k]) => k));
    const cycleBullets = pc.cycleBullets.filter((b) => {
      if (/iron/i.test(b)) return microKeys.has("iron");
      if (/magnesium/i.test(b)) return microKeys.has("magnesium");
      if (/fibre/i.test(b)) return microKeys.has("fibre");
      return true; // qualitative bullets (anti-inflammatory, gentle…) always apply
    });
    const goalBullet =
      goal === "lose" ? "Lean protein & fibre keep you full on fewer calories."
      : goal === "gain" ? "Protein-forward to help you build & recover."
      : "Balanced macros to fuel your day and hold your weight steady.";
    const cards: ReasonCard[] = [
      { key: "cycle", title: "Cycle", supports: `${phaseLabel} phase`, bullets: cycleBullets.length ? cycleBullets : pc.cycleBullets },
      { key: "movement", title: "Movement", supports: movement ?? "Your day", bullets: [movement ? `Fuels your ${movement}` : "Steady energy for today", `${r.macros.protein}g protein to recover`] },
      { key: "energy", title: "Energy", supports: "Helps reduce", bullets: pc.energy },
      { key: "goal", title: "Goal", supports: GOAL_LABEL[goal], bullets: [goalBullet] },
    ];
    const topMicro = microStarsList[0]?.label?.toLowerCase();
    return {
      type, typeLabel, kcal: r.macros.calories,
      tags: [`${r.macros.protein}g protein`, r.dietTags[0] ?? "Balanced", r.vibe ? String(r.vibe) : "Satisfying"].filter(Boolean),
      narrative:
        `Your body is in the ${phaseLabel.toLowerCase()} phase today. This ${typeLabel.toLowerCase()} combines ${topMicro ? topMicro + "-rich ingredients, " : ""}${r.macros.protein}g of protein and healthy fats to ${pc.bodyLine}.`,
      cards,
      nutrition: { calories: r.macros.calories, protein: r.macros.protein, carbs: r.macros.carbs, fat: r.macros.fat, fibre: r.micros.fibre ?? 0 },
      micros: microStarsList,
      didYouKnow: pc.didYouKnow, bloomTip: pc.tip, avoided: pc.avoided, explore,
    };
  }

  // ── MOVEMENT (yoga / workout) ───────────────────────────────────────────────
  if (type === "yoga" || type === "workout") {
    const plan = type === "yoga" ? PHASE_PLAN[phase].yoga : PHASE_PLAN[phase].workout;
    const typeLabel = type === "yoga" ? "Yoga flow" : "Workout";
    const durMin = type === "yoga" ? PHASE_PLAN[phase].yoga.launch.durationMin : undefined;
    const intensity = phase === "ovulation" || phase === "fertile" ? "Higher energy" : phase === "period" || phase === "luteal" ? "Gentle" : "Steady";
    const cards: ReasonCard[] = [
      { key: "cycle", title: "Cycle", supports: `${phaseLabel} phase`, bullets: pc.yogaWhy },
      { key: "movement", title: "Intensity", supports: intensity, bullets: [plan.blurb] },
      { key: "energy", title: "Energy", supports: "Helps with", bullets: pc.energy },
      { key: "goal", title: "Balance", supports: "Your week", bullets: [type === "yoga" ? "Balances your training with recovery." : "Builds strength matched to your phase."] },
    ];
    return {
      type, typeLabel,
      tags: [durMin ? `${durMin} min` : "Session", intensity, plan.title],
      narrative: `Your body is in the ${phaseLabel.toLowerCase()} phase today. ${plan.title} is matched to your energy right now — ${plan.blurb.toLowerCase()}.`,
      cards,
      didYouKnow: pc.didYouKnow, bloomTip: pc.tip,
      avoided: `We didn't schedule a high-intensity session that would fight your ${phaseLabel.toLowerCase()}-phase energy.`,
      explore,
    };
  }

  // ── JOURNALING ──────────────────────────────────────────────────────────────
  const prompt = item.prompt || PHASE_PLAN[phase].journal.prompt;
  return {
    type: "journal", typeLabel: "Journaling",
    tags: [`${phaseLabel} phase`, "2 min", "Reflection"],
    narrative: `Your body is in the ${phaseLabel.toLowerCase()} phase today — a good moment to check in with yourself. Today's prompt is chosen to meet how this phase tends to feel.`,
    cards: [
      { key: "cycle", title: "Cycle", supports: `${phaseLabel} phase`, bullets: pc.yogaWhy },
      { key: "energy", title: "Emotionally", supports: "Gently processes", bullets: pc.energy },
      { key: "goal", title: "Ritual", supports: "Your wind-down", bullets: ["A soft daily habit that builds self-awareness."] },
    ],
    didYouKnow: "Naming a feeling — even in one line — measurably lowers its intensity. A short daily reflection compounds over a cycle.",
    bloomTip: `Tonight's prompt: “${prompt}”`,
    avoided: "",
    explore,
  };
}
