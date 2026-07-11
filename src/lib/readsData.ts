/**
 * Read library — the single source of the article catalogue, shared by the Read
 * page (browse/search/saved) and the Diet · Cycle-Nutrition phase carousel.
 * Kept in lib (not a page) so components on either side import it without a cycle.
 */
import type { DietPhase } from "@/components/bloom/diet/data";

export const TOPICS = ["All", "Cycle & Body", "Self-care", "Money", "Movement", "Mindset", "Recipes"] as const;
export type Topic = typeof TOPICS[number];

export interface Article {
  id: string;
  title: string;
  excerpt: string;
  topic: Exclude<Topic, "All">;
  minutes: number;
  blooms: string;
  image: string;
  body: string;
  /** Phase this read is tuned to (drives the "For your phase" carousel). */
  phase?: DietPhase;
}

export const IMG = {
  featured: "/images/read-featured.webp",
  "Cycle & Body": "/images/read-cycle.webp",
  "Self-care": "/images/read-selfcare.webp",
  "Money": "/images/read-money.webp",
  "Movement": "/images/read-movement.webp",
  "Mindset": "/images/read-mindset.webp",
  "Recipes": "/images/read-recipes.webp",
} as const;

export const ARTICLES: Article[] = [
  { id: "a1", title: "Cycle syncing 101", topic: "Cycle & Body", minutes: 6, blooms: "2.3k", image: IMG["Cycle & Body"],
    excerpt: "Match your routine to your phase and feel like yourself again.",
    body: "Your cycle is a four-season superpower. In follicular days, lean into new beginnings — pitch ideas, try new workouts. Ovulation is your social peak. Luteal asks for slower, nourishing rituals. Menstrual is rest — and rest is productive too." },
  { id: "a2", title: "Soft girl morning ritual", topic: "Self-care", minutes: 4, blooms: "1.9k", image: IMG["Self-care"],
    excerpt: "Ten gentle minutes that change the entire tone of your day.",
    body: "Open the curtains slowly. Warm water with lemon. A two-song stretch. Mist your face. Write one sentence in your journal — just one. The point isn't productivity; it's softness." },
  { id: "a3", title: "Pink budgeting that actually works", topic: "Money", minutes: 8, blooms: "1.6k", image: IMG["Money"],
    excerpt: "A kinder framework for the girlie who hates spreadsheets.",
    body: "Forget restriction. Try the 50/30/20 with a twist: 50% needs, 20% future-you, 30% joy. Name your joy categories — flowers, lattes, books — so spending feels intentional, not guilty." },
  { id: "a4", title: "Moon salutation flow", topic: "Movement", minutes: 5, blooms: "2.1k", image: IMG["Movement"],
    excerpt: "A slow flow for evenings when sun salutations feel like too much.",
    body: "Start in mountain pose. Sweep arms overhead, fold, step into a low lunge. Move like honey — there's nowhere to be. Finish in child's pose with three long breaths." },
  { id: "a5", title: "Reframing 'I should'", topic: "Mindset", minutes: 5, blooms: "1.4k", image: IMG["Mindset"],
    excerpt: "How to soften your inner voice without losing your edge.",
    body: "Every time you catch a should, swap it for 'I get to' or 'I'm choosing'. Watch what happens. The task is the same; the relationship to it transforms." },
  { id: "a6", title: "Strawberry oat bowl", topic: "Recipes", minutes: 3, blooms: "2.6k", image: IMG["Recipes"],
    excerpt: "A pink breakfast that feels like a hug in a bowl.",
    body: "Blend frozen strawberries with banana and oat milk until creamy. Top with toasted oats, coconut, and a swirl of almond butter. Eat with your favorite spoon." },
  { id: "a7", title: "Luteal phase glow-up", topic: "Cycle & Body", minutes: 7, blooms: "1.8k", image: IMG["Cycle & Body"], phase: "luteal",
    excerpt: "Why the week before your period can be your most creative.",
    body: "Luteal is finishing energy. It's when you tidy projects, journal honestly, and crave warmth. Honor the inward pull — schedule deep work and decline what doesn't matter." },
  { id: "a8", title: "The 7-minute skincare edit", topic: "Self-care", minutes: 4, blooms: "2.0k", image: IMG["Self-care"],
    excerpt: "Three steps, two products, one glowing you.",
    body: "Cleanse with cool water. Pat — never rub. A pea of moisturizer on damp skin locks in everything. SPF every morning. That's it. The rest is marketing." },
  { id: "a9", title: "Hip-opening sequence", topic: "Movement", minutes: 6, blooms: "1.5k", image: IMG["Movement"],
    excerpt: "Release a week of sitting in one delicious flow.",
    body: "Pigeon, then half-frog, then a deep malasana squat. Hold each for 8 slow breaths. Your hips store your stress — let them spill it out." },
  { id: "a10", title: "Rose latte at home", topic: "Recipes", minutes: 3, blooms: "1.2k", image: IMG["Recipes"],
    excerpt: "Café vibes for the cost of one rose petal.",
    body: "Warm oat milk with a teaspoon of rose syrup and a shot of espresso. Top with foam and a dusting of cardamom. Drink slowly by the window." },

  /* ── Phase-tuned reads — power the "For your phase" carousel ── */
  // Menstrual
  { id: "m1", title: "Your rest-day face-care ritual", topic: "Self-care", minutes: 4, blooms: "1.1k", image: IMG["Self-care"], phase: "menstrual",
    excerpt: "Puffy, tender skin? Keep it soft and simple this week.",
    body: "Menstrual skin loves gentleness. Cleanse with lukewarm water, press a cool jade roller along your jaw, and layer a rich moisturizer on damp skin. Skip actives — this is a comfort week, not a project. Warm compress, deep breath, early night." },
  { id: "m2", title: "Comfort foods that love your period", topic: "Cycle & Body", minutes: 5, blooms: "1.4k", image: IMG["Cycle & Body"], phase: "menstrual",
    excerpt: "Iron, magnesium and warmth — what your body is asking for.",
    body: "Lean into iron (lentils, spinach, beets) with a squeeze of vitamin-C citrus to absorb it. Magnesium — dark chocolate, pumpkin seeds — eases cramps. Keep meals warm and cooked; save raw and cold for later phases. Ginger tea is your friend." },
  // Follicular
  { id: "f1", title: "Fresh-start glow face routine", topic: "Self-care", minutes: 4, blooms: "1.7k", image: IMG["Self-care"], phase: "follicular",
    excerpt: "Rising estrogen = your skin's comeback week.",
    body: "Follicular skin is resilient — a great time for a gentle exfoliation and a vitamin-C serum to catch that natural glow. Cleanse, treat, moisturize, SPF. Add a two-minute facial massage and your favorite song. New-you energy, radiant skin." },
  { id: "f2", title: "Fuel the momentum", topic: "Cycle & Body", minutes: 5, blooms: "1.3k", image: IMG["Cycle & Body"], phase: "follicular",
    excerpt: "Light, bright food for your rising-energy days.",
    body: "Estrogen is climbing and so is your appetite for novelty. Try fermented foods (yoghurt, kefir), fresh greens, eggs and citrus. It's the perfect week to try a new recipe you've been eyeing — your body is primed for change." },
  // Ovulatory
  { id: "o1", title: "Your glow-week face edit", topic: "Self-care", minutes: 4, blooms: "2.2k", image: IMG["Self-care"], phase: "ovulatory",
    excerpt: "You're at peak radiance — let your skin show it.",
    body: "Ovulation is your natural highlight reel. Keep it dewy: hydrating mist, lightweight moisturizer, a touch of cream blush on the cheekbones. Less is more this week — your skin is doing the work. Take the photo; you'll want to remember this glow." },
  { id: "o2", title: "The radiant ovulation plate", topic: "Recipes", minutes: 4, blooms: "1.5k", image: IMG["Recipes"], phase: "ovulatory",
    excerpt: "Crunchy, colorful, antioxidant-rich — eat to perform.",
    body: "Peak energy loves fiber and antioxidants: raw crunchy veg, cruciferous greens, quinoa and bright fruit. A vibrant plate now supports the way you feel — social, strong and glowing. Add a fresh-pressed juice and savor it slowly." },
  // Luteal
  { id: "l1", title: "Luteal wind-down ritual", topic: "Self-care", minutes: 5, blooms: "1.9k", image: IMG["Self-care"], phase: "luteal",
    excerpt: "Soothe skin and nerves as your energy turns inward.",
    body: "Luteal skin can be reactive — simplify and calm. A warm cleanse, a barrier-loving moisturizer, and a few drops of facial oil to seal it. Pair it with warm juice, a comfort playlist and no screens. Cozy over busy: this is your soft landing." },
  { id: "l2", title: "Satisfy cravings, kindly", topic: "Cycle & Body", minutes: 6, blooms: "2.0k", image: IMG["Cycle & Body"], phase: "luteal",
    excerpt: "Cravings are real — here's how to meet them well.",
    body: "Serotonin dips before your period, so cravings for carbs and chocolate are biology, not weakness. Reach for complex carbs (sweet potato, oats), dark chocolate and walnuts. A healthy dessert made with love beats restriction every time." },
];

/** Article lookup by id (for /app/read?a=<id> deep links). */
export function articleById(id: string | null | undefined): Article | undefined {
  return id ? ARTICLES.find((a) => a.id === id) : undefined;
}

/** The reads tuned to a given phase. */
export function readsForPhase(phase: DietPhase): Article[] {
  return ARTICLES.filter((a) => a.phase === phase);
}
