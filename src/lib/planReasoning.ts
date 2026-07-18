/**
 * planReasoning — the ONE engine behind "why Bloomzein chose this for you today".
 *
 * Every card in Today's Plan (a meal, a yoga flow, a workout, a journaling prompt)
 * opens a reasoning sheet that explains, from REAL signals, why it's in her plan:
 * her cycle phase, the day's movement, her energy needs, and her diet goal.
 *
 * The text is data-driven AND varied: the narrative names THIS recipe and quotes
 * ITS actual protein / iron / omega-3; the tips, facts and "why we didn't choose"
 * lines are drawn from per-phase pools and rotated deterministically per item, so
 * two meals in the same phase never read the same — it feels chosen for her, not
 * stamped out. Explore recommendations pull live (phase-matched, rotated, with
 * thumbnails) from the growing Reads / Flows / Meditations libraries.
 */
import { PHASE_LABEL, toDietPhase, type CyclePhase } from "@/components/bloom/cyclePhase";
import { RECIPES, readDietProfile, type Recipe, type DietGoal } from "@/components/bloom/recipes/data";
import { PHASE_PLAN } from "@/components/bloom/phasePlan";
import { ARTICLES } from "@/lib/readsData";
import { FLOWS, MEDITATIONS, type ExploreItem } from "@/lib/exploreContent";

type Phase = Exclude<CyclePhase, "any">;
export type PlanItemType = "meal" | "yoga" | "workout" | "journal";

export interface ReasonCard { key: "cycle" | "movement" | "energy" | "goal"; title: string; supports: string; bullets: string[]; }
export interface MicroStar { label: string; stars: number; }
export interface ExploreLink { label: string; sub: string; href: string; kind: "read" | "yoga" | "meditation" | "workout"; image?: string; }

export interface PlanReason {
  type: PlanItemType;
  typeLabel: string;
  tags: string[];
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

/* ── Deterministic variety: stable per item, different across items ── */
function hash(s: string): number { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0; return h; }
function pick<T>(pool: T[], seed: string): T { return pool[hash(seed) % pool.length]; }

/* ── Micronutrient → star rating (per serving vs a sensible daily target) ── */
const MICRO_TARGET: Record<string, number> = { iron: 18, magnesium: 320, omega3: 1.6, vitaminC: 75, fibre: 28, vitaminB6: 1.3, calcium: 1000, vitaminD: 15 };
const MICRO_LABEL: Record<string, string> = { iron: "Iron", magnesium: "Magnesium", omega3: "Omega-3", vitaminC: "Vitamin C", fibre: "Fibre", vitaminB6: "Vitamin B6", calcium: "Calcium", vitaminD: "Vitamin D" };
const MICRO_ADJ: Record<string, string> = { iron: "iron-rich", magnesium: "magnesium-rich", omega3: "omega-3-rich", vitaminC: "vitamin-C-bright", fibre: "fibre-rich", vitaminB6: "B6-rich", calcium: "calcium-rich", vitaminD: "vitamin-D-boosted" };
function microStars(value: number, key: string): number {
  const target = MICRO_TARGET[key] ?? 100;
  return Math.max(0.5, Math.min(5, Math.round(((value / target) / 0.35) * 5 * 2) / 2));
}

const GOAL_LABEL: Record<DietGoal, string> = { lose: "Lose Weight", maintain: "Maintain Weight", gain: "Build Strength" };

/* ── Phase content — pools the engine rotates through for variety ── */
interface PhaseContent {
  energy: string[];
  cycleBullets: string[];
  bodyLine: string[];
  didYouKnow: string[];
  tip: string[];
  avoided: string[];
  yogaWhy: string[];
}
const PHASE_CONTENT: Record<Phase, PhaseContent> = {
  period: {
    energy: ["Fatigue", "Cravings", "Blood-sugar crashes"],
    cycleBullets: ["Iron-rich", "Anti-inflammatory", "Gentle digestion"],
    bodyLine: [
      "replenish the iron you lose and keep your energy steady",
      "ease cramps and keep you comfortably full",
      "comfort your body and soften the fatigue this week brings",
    ],
    didYouKnow: [
      "Pairing iron with vitamin C boosts absorption — a squeeze of citrus helps you rebuild what your period drains.",
      "Warm, cooked meals are gentler on digestion during menstruation than cold or raw ones.",
      "Magnesium (dark chocolate, seeds) is a natural cramp-soother — a little goes a long way this week.",
    ],
    tip: [
      "Pair this with a warm cup of ginger or chamomile tea to ease cramps and help you relax.",
      "Add a handful of pumpkin seeds on the side for extra magnesium against cramps.",
      "Keep it warm and cosy today — heat is your friend during your period.",
    ],
    avoided: [
      "We skipped heavy, high-sugar options — quick spikes worsen fatigue and mood swings during your period.",
      "We avoided cold, raw-heavy dishes today — they can feel harsh on menstrual digestion.",
    ],
    yogaWhy: ["Gentle on the body", "Eases cramps", "Calms the nervous system"],
  },
  follicular: {
    energy: ["Low motivation", "Brain fog", "Sluggish starts"],
    cycleBullets: ["Light & fresh", "Estrogen-supportive", "Fibre for balance"],
    bodyLine: [
      "fuel your rising energy as you come back to life",
      "match your fresh, motivated follicular energy",
      "support focus and momentum for the week ahead",
    ],
    didYouKnow: [
      "Rising estrogen this week helps your body use carbs and build muscle more efficiently — great fuel for movement.",
      "Fibre-rich foods support healthy estrogen balance as it climbs through your follicular phase.",
      "Your insulin sensitivity is higher now — a good week for wholegrains and fresh produce.",
    ],
    tip: [
      "This pairs beautifully with a brisk walk or a strength session — your energy is climbing.",
      "Add some leafy greens on the side to ride the fresh-start feeling of this phase.",
      "Great morning fuel for a productive, focused day.",
    ],
    avoided: [
      "We kept it light and fresh rather than heavy — your body wants energising food as estrogen rises.",
      "We skipped the sluggish, greasy options that would dull this bright phase.",
    ],
    yogaWhy: ["Builds gentle heat", "Channels rising energy", "Improves mobility"],
  },
  fertile: {
    energy: ["Restlessness", "Over-doing it", "Afternoon dips"],
    cycleBullets: ["Antioxidant-rich", "Anti-inflammatory", "Hydrating"],
    bodyLine: [
      "support you at your most magnetic, energetic phase",
      "keep you clear and radiant through your fertile window",
      "fuel a strong, social, active day",
    ],
    didYouKnow: [
      "Antioxidants and fibre this week support healthy estrogen clearance — helping you feel clear and radiant.",
      "Hydration matters more now — cervical fluid and higher energy both raise your water needs.",
      "Colourful produce this week gives you the antioxidants your body loves at its peak.",
    ],
    tip: [
      "You're near your peak — this fuels a stronger flow or an active, social day beautifully.",
      "Add a big glass of water or herbal tea — hydration keeps the radiance going.",
      "Pair it with movement you enjoy; your body can do more this week.",
    ],
    avoided: [
      "We skipped inflammatory, greasy picks — they dull the energy of your fertile window.",
      "We avoided heavy, sluggish food that would weigh down this bright phase.",
    ],
    yogaWhy: ["Opens and strengthens", "Matches peak energy", "Builds balance"],
  },
  ovulation: {
    energy: ["Burnout risk", "Restlessness", "Peaks & crashes"],
    cycleBullets: ["Protein-rich", "Antioxidant-rich", "Anti-inflammatory"],
    bodyLine: [
      "fuel and replenish you at the peak of your energy",
      "help you make the most of your strongest week",
      "keep your energy high without the crash",
    ],
    didYouKnow: [
      "You're at your energy peak — protein and antioxidants now help you make the most of it and recover well.",
      "Ovulation is your strongest week for higher-intensity training — fuel it with enough protein.",
      "Antioxidant-rich foods help counter the oxidative stress of your most active phase.",
    ],
    tip: [
      "Great fuel for a higher-intensity session — your body can handle more this week.",
      "Add a protein source if you're training hard today — you'll recover better.",
      "Enjoy it before an active, social day; your energy is at its highest.",
    ],
    avoided: [
      "We avoided low-protein, sugary picks — they'd leave you crashing when you could feel strongest.",
      "We skipped inflammatory options that would blunt your peak-week energy.",
    ],
    yogaWhy: ["Strong and open", "Uses peak energy", "Builds power"],
  },
  luteal: {
    energy: ["Mood dips", "Cravings", "Bloating"],
    cycleBullets: ["Magnesium-rich", "Complex carbs", "Serotonin-supportive"],
    bodyLine: [
      "steady your mood and ease cravings, kindly",
      "comfort your body as energy winds down",
      "keep blood sugar steady against luteal cravings",
    ],
    didYouKnow: [
      "Magnesium and complex carbs in the luteal phase lift serotonin — easing PMS mood dips and cravings.",
      "Your body burns slightly more energy now, so gentle, satisfying meals help you avoid the crash-and-crave cycle.",
      "Complex carbs (oats, sweet potato) steady blood sugar and mood better than quick sugars this week.",
    ],
    tip: [
      "Pair this with a little dark chocolate or pumpkin seeds — extra magnesium to soften cravings.",
      "Keep it warm and satisfying; comfort helps the luteal wind-down.",
      "A square of dark chocolate after works with this, not against it, right now.",
    ],
    avoided: [
      "We steered clear of salty, high-sugar options — they worsen luteal bloating and mood swings.",
      "We skipped the quick-sugar picks that spike and crash your mood this week.",
    ],
    yogaWhy: ["Grounding & calming", "Softens tension", "Honours lower energy"],
  },
};

/* ── Smart, image-backed Explore recommendations (phase-matched + rotated) ── */
function pickFrom(lib: ExploreItem[], dphase: ReturnType<typeof toDietPhase>, seed: string): ExploreItem {
  const matched = dphase ? lib.filter((f) => !f.phases || f.phases.includes(dphase)) : lib;
  const pool = matched.length ? matched : lib;
  return pick(pool, seed);
}
function exploreFor(phase: Phase, type: PlanItemType, seed: string): ExploreLink[] {
  const dphase = toDietPhase(phase);
  const topicPref = type === "meal" ? ["Recipes", "Cycle & Body"]
    : type === "yoga" || type === "workout" ? ["Movement", "Cycle & Body"]
    : ["Mindset", "Self-care"];
  const readPool = [
    ...ARTICLES.filter((a) => a.phase === dphase),
    ...ARTICLES.filter((a) => !a.phase && topicPref.includes(a.topic as string)),
  ];
  const reads = readPool.length ? readPool : ARTICLES;
  const read = pick(reads, seed + "r");
  const flow = pickFrom(FLOWS, dphase, seed + "f");
  const med = pickFrom(MEDITATIONS, dphase, seed + "m");
  return [
    { label: "Read", sub: read.title, href: "/app/read", kind: "read", image: read.image },
    { label: "Flow", sub: `${flow.title} · ${flow.sub}`, href: flow.href, kind: "yoga", image: flow.image },
    { label: "Meditation", sub: `${med.title} · ${med.sub}`, href: med.href, kind: "meditation", image: med.image },
  ];
}

/** Resolve the recipe behind a meal plan item (its launch payload carries the id). */
export function recipeForItem(item: { id: string; label: string; launch?: { key: string; val: unknown } }): Recipe | null {
  const id = typeof item.launch?.val === "string" ? item.launch.val : null;
  if (id) { const r = RECIPES.find((x) => x.id === id); if (r) return r; }
  return RECIPES.find((x) => x.name === item.label) ?? null;
}

const SLOT_LABEL: Record<string, string> = { breakfast: "Breakfast", lunch: "Lunch", snack: "Snack", dinner: "Dinner" };

export function reasonForItem(
  item: { id: string; label: string; time: string; blurb: string; prompt?: string; launch?: { key: string; val: unknown } },
  phase: Phase,
  ctx: ReasonContext = {},
): PlanReason {
  const pc = PHASE_CONTENT[phase];
  const phaseLabel = PHASE_LABEL[phase];
  const goal = ctx.goal ?? readDietProfile().goal;
  const seed = item.id + phase; // stable per item, distinct across items
  const movement = ctx.yoga?.planned ? ctx.yoga.title : ctx.workout?.planned ? ctx.workout.title : null;
  const type: PlanItemType =
    item.id.startsWith("meal-") ? "meal" : item.id === "yoga" ? "yoga" : item.id === "workout" ? "workout" : "journal";

  // ── MEAL ──────────────────────────────────────────────────────────────────
  if (type === "meal") {
    const r = recipeForItem(item);
    const slot = item.id.replace("meal-", "");
    const typeLabel = SLOT_LABEL[slot] ?? "Meal";
    if (!r) {
      return {
        type, typeLabel, tags: [`${phaseLabel} phase`],
        narrative: `Your body is in the ${phaseLabel.toLowerCase()} phase today. Add a ${typeLabel.toLowerCase()} and Bloomzein will match it to ${pick(pc.bodyLine, seed)}.`,
        cards: [{ key: "cycle", title: "Cycle", supports: `${phaseLabel} phase`, bullets: pc.cycleBullets }],
        didYouKnow: pick(pc.didYouKnow, seed + "d"), bloomTip: pick(pc.tip, seed + "t"), avoided: pick(pc.avoided, seed + "a"),
        explore: exploreFor(phase, type, seed),
      };
    }
    // Real macro/micro-driven, recipe-specific reasoning.
    const owned = Object.entries(r.micros).filter(([, v]) => (v ?? 0) > 0)
      .sort((a, b) => microStars(b[1] as number, b[0]) - microStars(a[1] as number, a[0]));
    const microStarsList: MicroStar[] = owned.slice(0, 4).map(([k, v]) => ({ label: MICRO_LABEL[k] ?? k, stars: microStars(v as number, k) }));
    const microKeys = new Set(owned.map(([k]) => k));
    const cycleBullets = pc.cycleBullets.filter((b) => {
      if (/iron/i.test(b)) return microKeys.has("iron");
      if (/magnesium/i.test(b)) return microKeys.has("magnesium");
      if (/fibre/i.test(b)) return microKeys.has("fibre");
      return true;
    });
    const goalBullet = goal === "lose" ? "Lean protein & fibre keep you full on fewer calories."
      : goal === "gain" ? "Protein-forward to help you build & recover."
      : "Balanced macros to fuel your day and hold your weight steady.";
    const cards: ReasonCard[] = [
      { key: "cycle", title: "Cycle", supports: `${phaseLabel} phase`, bullets: cycleBullets.length ? cycleBullets : pc.cycleBullets },
      { key: "movement", title: "Movement", supports: movement ?? "Your day", bullets: [movement ? `Fuels your ${movement}` : "Steady energy for today", `${r.macros.protein}g protein to recover`] },
      { key: "energy", title: "Energy", supports: "Helps reduce", bullets: pc.energy },
      { key: "goal", title: "Goal", supports: GOAL_LABEL[goal], bullets: [goalBullet] },
    ];
    // Recipe-specific narrative: names the dish + its two standout micros.
    const adjs = owned.slice(0, 2).map(([k]) => MICRO_ADJ[k]).filter(Boolean);
    const microPhrase = adjs.length ? `${adjs.join(" & ")}, ` : "";
    const tagPhrase = r.dietTags[0] ? ` It's ${String(r.dietTags[0]).toLowerCase()}` : "";
    return {
      type, typeLabel, kcal: r.macros.calories,
      tags: [`${r.macros.protein}g protein`, r.dietTags[0] ?? "Balanced", r.vibe ? String(r.vibe) : "Satisfying"].filter(Boolean),
      narrative: `Your ${r.name} is a ${phaseLabel.toLowerCase()}-phase pick — ${microPhrase}with ${r.macros.protein}g protein and healthy fats to ${pick(pc.bodyLine, seed)}.${tagPhrase} and made to fit your day.`,
      cards,
      nutrition: { calories: r.macros.calories, protein: r.macros.protein, carbs: r.macros.carbs, fat: r.macros.fat, fibre: r.micros.fibre ?? 0 },
      micros: microStarsList,
      didYouKnow: pick(pc.didYouKnow, seed + "d"), bloomTip: pick(pc.tip, seed + "t"), avoided: pick(pc.avoided, seed + "a"),
      explore: exploreFor(phase, type, seed),
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
      narrative: `${plan.title} is matched to your ${phaseLabel.toLowerCase()}-phase energy today — ${plan.blurb.toLowerCase()}. ${pick(["It meets you where you are, not where a generic plan assumes you'll be.", "Chosen to work with your body this week, not against it.", "Your movement follows your cycle, so it feels right, not forced."], seed + "n")}`,
      cards,
      didYouKnow: pick(pc.didYouKnow, seed + "d"), bloomTip: pick(pc.tip, seed + "t"),
      avoided: `We didn't schedule a high-intensity session that would fight your ${phaseLabel.toLowerCase()}-phase energy.`,
      explore: exploreFor(phase, type, seed),
    };
  }

  // ── JOURNALING ──────────────────────────────────────────────────────────────
  const prompt = item.prompt || PHASE_PLAN[phase].journal.prompt;
  return {
    type: "journal", typeLabel: "Journaling",
    tags: [`${phaseLabel} phase`, "2 min", "Reflection"],
    narrative: `You're in the ${phaseLabel.toLowerCase()} phase today — a good moment to check in with yourself. ${pick(["Today's prompt is chosen to meet how this phase tends to feel.", "This prompt follows the emotional tone of your phase, so it lands honestly.", "Bloomzein picked a prompt that fits where your cycle has you right now."], seed + "n")}`,
    cards: [
      { key: "cycle", title: "Cycle", supports: `${phaseLabel} phase`, bullets: pc.yogaWhy },
      { key: "energy", title: "Emotionally", supports: "Gently processes", bullets: pc.energy },
      { key: "goal", title: "Ritual", supports: "Your wind-down", bullets: ["A soft daily habit that builds self-awareness."] },
    ],
    didYouKnow: pick([
      "Naming a feeling — even in one line — measurably lowers its intensity.",
      "A short daily reflection compounds: over a cycle it becomes a map of your patterns.",
      "Journaling before bed helps quiet a busy mind for deeper sleep.",
    ], seed + "d"),
    bloomTip: `Tonight's prompt: “${prompt}”`,
    avoided: "",
    explore: exploreFor(phase, type, seed),
  };
}
