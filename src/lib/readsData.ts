/**
 * Read library — the single source of the article catalogue, shared by the Read
 * page (browse/search/saved) and the Diet · Cycle-Nutrition phase carousel.
 * Kept in lib (not a page) so components on either side import it without a cycle.
 *
 * This file holds only the light *catalogue* (title, excerpt, category, minutes,
 * phase…). The long-form article bodies live in `src/content/reads/*` and load
 * lazily per category via `loadArticleBody` — so the 180+ article library never
 * ships in the main bundle.
 */
import type { DietPhase } from "@/components/bloom/diet/data";

/** The 13 editorial categories (the Bloomzein taxonomy). Order = filter order. */
export const CATEGORIES = [
  "Cycle & Hormones",
  "Nutrition",
  "Recipes",
  "Beauty",
  "Yoga",
  "Soft Living",
  "Mental Wellness",
  "Sleep",
  "Herbal Wellness",
  "Relationships",
  "Journaling",
  "Lifestyle",
  "Bloomzein Originals",
] as const;
export type Category = typeof CATEGORIES[number];

/** Filter row on the Read page — categories prefixed with an "All" pill. */
export const FILTERS = ["All", ...CATEGORIES] as const;
export type Filter = typeof FILTERS[number];

/* Back-compat aliases (older imports used the "Topic" vocabulary). */
export const TOPICS = FILTERS;
export type Topic = Category;

export interface Article {
  id: string;
  title: string;
  excerpt: string;
  category: Category;
  minutes: number;
  blooms: string;
  image: string;
  /** Phase this read is tuned to (drives the "For your phase" carousel). */
  phase?: DietPhase;
  /** Surface this as a hero/featured pick within its category. */
  featured?: boolean;
  /**
   * Short legacy reads keep their single-paragraph body inline; long-form
   * editorial articles omit this and load their markdown body lazily instead.
   */
  body?: string;
}

/* ── Category hero imagery ──
 * Custom per-article heroes are generated later and dropped in as
 * `/images/read-<id>.webp`; until then every article falls back to its
 * category image so the grid is never blank. */
export const CAT_IMG: Record<Category, string> = {
  "Cycle & Hormones": "/images/read-cycle.webp",
  Nutrition: "/images/read-recipes.webp",
  Recipes: "/images/read-recipes.webp",
  Beauty: "/images/read-selfcare.webp",
  Yoga: "/images/read-movement.webp",
  "Soft Living": "/images/read-selfcare.webp",
  "Mental Wellness": "/images/read-mindset.webp",
  Sleep: "/images/read-mindset.webp",
  "Herbal Wellness": "/images/read-selfcare.webp",
  Relationships: "/images/read-selfcare.webp",
  Journaling: "/images/read-mindset.webp",
  Lifestyle: "/images/read-money.webp",
  "Bloomzein Originals": "/images/read-featured.webp",
};

export const IMG = { featured: "/images/read-featured.webp", ...CAT_IMG } as const;

/* ── Phase-seed reads ──
 * Short, single-paragraph reads that power the four-phase "For your phase"
 * carousels on Today and Diet. They predate the long-form library; new
 * phase-tagged articles enrich the same carousels as batches land. */
const PHASE_SEED_ARTICLES: Article[] = [
  { id: "a1", title: "Cycle syncing 101", category: "Cycle & Hormones", minutes: 6, blooms: "2.3k", image: CAT_IMG["Cycle & Hormones"],
    excerpt: "Match your routine to your phase and feel like yourself again.",
    body: "Your cycle is a four-season superpower. In follicular days, lean into new beginnings — pitch ideas, try new workouts. Ovulation is your social peak. Luteal asks for slower, nourishing rituals. Menstrual is rest — and rest is productive too." },
  { id: "a2", title: "Soft girl morning ritual", category: "Soft Living", minutes: 4, blooms: "1.9k", image: CAT_IMG["Soft Living"],
    excerpt: "Ten gentle minutes that change the entire tone of your day.",
    body: "Open the curtains slowly. Warm water with lemon. A two-song stretch. Mist your face. Write one sentence in your journal — just one. The point isn't productivity; it's softness." },
  { id: "a3", title: "Pink budgeting that actually works", category: "Lifestyle", minutes: 8, blooms: "1.6k", image: CAT_IMG["Lifestyle"],
    excerpt: "A kinder framework for the girlie who hates spreadsheets.",
    body: "Forget restriction. Try the 50/30/20 with a twist: 50% needs, 20% future-you, 30% joy. Name your joy categories — flowers, lattes, books — so spending feels intentional, not guilty." },
  { id: "a4", title: "Moon salutation flow", category: "Yoga", minutes: 5, blooms: "2.1k", image: CAT_IMG["Yoga"],
    excerpt: "A slow flow for evenings when sun salutations feel like too much.",
    body: "Start in mountain pose. Sweep arms overhead, fold, step into a low lunge. Move like honey — there's nowhere to be. Finish in child's pose with three long breaths." },
  { id: "a5", title: "Reframing 'I should'", category: "Mental Wellness", minutes: 5, blooms: "1.4k", image: CAT_IMG["Mental Wellness"],
    excerpt: "How to soften your inner voice without losing your edge.",
    body: "Every time you catch a should, swap it for 'I get to' or 'I'm choosing'. Watch what happens. The task is the same; the relationship to it transforms." },
  { id: "a6", title: "Strawberry oat bowl", category: "Recipes", minutes: 3, blooms: "2.6k", image: CAT_IMG["Recipes"],
    excerpt: "A pink breakfast that feels like a hug in a bowl.",
    body: "Blend frozen strawberries with banana and oat milk until creamy. Top with toasted oats, coconut, and a swirl of almond butter. Eat with your favorite spoon." },
  { id: "a7", title: "Luteal phase glow-up", category: "Cycle & Hormones", minutes: 7, blooms: "1.8k", image: CAT_IMG["Cycle & Hormones"], phase: "luteal",
    excerpt: "Why the week before your period can be your most creative.",
    body: "Luteal is finishing energy. It's when you tidy projects, journal honestly, and crave warmth. Honor the inward pull — schedule deep work and decline what doesn't matter." },
  { id: "a8", title: "The 7-minute skincare edit", category: "Beauty", minutes: 4, blooms: "2.0k", image: CAT_IMG["Beauty"],
    excerpt: "Three steps, two products, one glowing you.",
    body: "Cleanse with cool water. Pat — never rub. A pea of moisturizer on damp skin locks in everything. SPF every morning. That's it. The rest is marketing." },
  { id: "a9", title: "Hip-opening sequence", category: "Yoga", minutes: 6, blooms: "1.5k", image: CAT_IMG["Yoga"],
    excerpt: "Release a week of sitting in one delicious flow.",
    body: "Pigeon, then half-frog, then a deep malasana squat. Hold each for 8 slow breaths. Your hips store your stress — let them spill it out." },
  { id: "a10", title: "Rose latte at home", category: "Recipes", minutes: 3, blooms: "1.2k", image: CAT_IMG["Recipes"],
    excerpt: "Café vibes for the cost of one rose petal.",
    body: "Warm oat milk with a teaspoon of rose syrup and a shot of espresso. Top with foam and a dusting of cardamom. Drink slowly by the window." },

  // Menstrual
  { id: "m1", title: "Your rest-day face-care ritual", category: "Beauty", minutes: 4, blooms: "1.1k", image: CAT_IMG["Beauty"], phase: "menstrual",
    excerpt: "Puffy, tender skin? Keep it soft and simple this week.",
    body: "Menstrual skin loves gentleness. Cleanse with lukewarm water, press a cool jade roller along your jaw, and layer a rich moisturizer on damp skin. Skip actives — this is a comfort week, not a project. Warm compress, deep breath, early night." },
  { id: "m2", title: "Comfort foods that love your period", category: "Nutrition", minutes: 5, blooms: "1.4k", image: CAT_IMG["Nutrition"], phase: "menstrual",
    excerpt: "Iron, magnesium and warmth — what your body is asking for.",
    body: "Lean into iron (lentils, spinach, beets) with a squeeze of vitamin-C citrus to absorb it. Magnesium — dark chocolate, pumpkin seeds — eases cramps. Keep meals warm and cooked; save raw and cold for later phases. Ginger tea is your friend." },
  // Follicular
  { id: "f1", title: "Fresh-start glow face routine", category: "Beauty", minutes: 4, blooms: "1.7k", image: CAT_IMG["Beauty"], phase: "follicular",
    excerpt: "Rising estrogen = your skin's comeback week.",
    body: "Follicular skin is resilient — a great time for a gentle exfoliation and a vitamin-C serum to catch that natural glow. Cleanse, treat, moisturize, SPF. Add a two-minute facial massage and your favorite song. New-you energy, radiant skin." },
  { id: "f2", title: "Fuel the momentum", category: "Nutrition", minutes: 5, blooms: "1.3k", image: CAT_IMG["Nutrition"], phase: "follicular",
    excerpt: "Light, bright food for your rising-energy days.",
    body: "Estrogen is climbing and so is your appetite for novelty. Try fermented foods (yoghurt, kefir), fresh greens, eggs and citrus. It's the perfect week to try a new recipe you've been eyeing — your body is primed for change." },
  // Ovulatory
  { id: "o1", title: "Your glow-week face edit", category: "Beauty", minutes: 4, blooms: "2.2k", image: CAT_IMG["Beauty"], phase: "ovulatory",
    excerpt: "You're at peak radiance — let your skin show it.",
    body: "Ovulation is your natural highlight reel. Keep it dewy: hydrating mist, lightweight moisturizer, a touch of cream blush on the cheekbones. Less is more this week — your skin is doing the work. Take the photo; you'll want to remember this glow." },
  { id: "o2", title: "The radiant ovulation plate", category: "Recipes", minutes: 4, blooms: "1.5k", image: CAT_IMG["Recipes"], phase: "ovulatory",
    excerpt: "Crunchy, colorful, antioxidant-rich — eat to perform.",
    body: "Peak energy loves fiber and antioxidants: raw crunchy veg, cruciferous greens, quinoa and bright fruit. A vibrant plate now supports the way you feel — social, strong and glowing. Add a fresh-pressed juice and savor it slowly." },
  // Luteal
  { id: "l1", title: "Luteal wind-down ritual", category: "Soft Living", minutes: 5, blooms: "1.9k", image: CAT_IMG["Soft Living"], phase: "luteal",
    excerpt: "Soothe skin and nerves as your energy turns inward.",
    body: "Luteal skin can be reactive — simplify and calm. A warm cleanse, a barrier-loving moisturizer, and a few drops of facial oil to seal it. Pair it with warm juice, a comfort playlist and no screens. Cozy over busy: this is your soft landing." },
  { id: "l2", title: "Satisfy cravings, kindly", category: "Nutrition", minutes: 6, blooms: "2.0k", image: CAT_IMG["Nutrition"], phase: "luteal",
    excerpt: "Cravings are real — here's how to meet them well.",
    body: "Serotonin dips before your period, so cravings for carbs and chocolate are biology, not weakness. Reach for complex carbs (sweet potato, oats), dark chocolate and walnuts. A healthy dessert made with love beats restriction every time." },
];

/* ── Imported written articles (from the editorial sheet) ──
 * Long-form; bodies load lazily from src/content/reads/*. */
const IMPORTED_ARTICLES: Article[] = [
  { id: "CY001", title: "What Is the Menstrual Cycle?", category: "Cycle & Hormones", minutes: 7, blooms: "2.0k", image: CAT_IMG["Cycle & Hormones"],
    excerpt: "Most of us were taught that the menstrual cycle is the week we bleed. In truth, it's a quiet, month-long performance happening…" },
  { id: "CY002", title: "Understanding Your Hormones", category: "Cycle & Hormones", minutes: 7, blooms: "1.3k", image: CAT_IMG["Cycle & Hormones"],
    excerpt: "They shape your mood, your skin, your energy and your cravings — yet most of us have never been properly introduced." },
  { id: "CY003", title: "The Four Phases of Your Cycle", category: "Cycle & Hormones", minutes: 7, blooms: "1.8k", image: CAT_IMG["Cycle & Hormones"],
    excerpt: "Your cycle isn't one long stretch of the same self, interrupted by a period. It moves through four distinct phases, each with its own gift." },
  { id: "CY004", title: "How Your Cycle Changes Your Energy", category: "Cycle & Hormones", minutes: 7, blooms: "1.4k", image: CAT_IMG["Cycle & Hormones"],
    excerpt: "Some weeks you could move mountains; others, making dinner feels like a lot. That isn't a discipline problem." },
  { id: "CY005", title: "Why Tracking Your Cycle Matters", category: "Cycle & Hormones", minutes: 7, blooms: "1.0k", image: CAT_IMG["Cycle & Hormones"],
    excerpt: "Tracking your cycle isn't about fertility charts or complicated apps. It's about learning to read the monthly report your body…" },
  { id: "BE005", title: "What Really Happens to Your Skin While You Sleep?", category: "Beauty", minutes: 6, blooms: "1.7k", image: CAT_IMG["Beauty"],
    excerpt: "The nighttime skincare secrets that transform your routine from simply applying products into supporting your skin's natural…" },
  { id: "BE010", title: "Seasonal Skincare", category: "Beauty", minutes: 5, blooms: "2.1k", image: CAT_IMG["Beauty"],
    excerpt: "Your skin changes with the seasons—your skincare should too." },
  { id: "BO007", title: "Your Soft Life Guide", category: "Bloomzein Originals", minutes: 5, blooms: "2.1k", image: CAT_IMG["Bloomzein Originals"],
    excerpt: "Softness isn't about doing less—it's about living better." },
  { id: "BO013", title: "How to Build a Life You Don't Need to Escape From", category: "Bloomzein Originals", minutes: 7, blooms: "2.1k", image: CAT_IMG["Bloomzein Originals"],
    excerpt: "The most beautiful life isn't the one you dream about on vacation—it's the one you're happy to wake up to every morning." },
  { id: "BO015", title: "Creating Your Personal Sanctuary", category: "Bloomzein Originals", minutes: 6, blooms: "1.5k", image: CAT_IMG["Bloomzein Originals"],
    excerpt: "Your home should be the place where your heart exhales." },
  { id: "SL005", title: "The Art of Rest", category: "Bloomzein Originals", minutes: 6, blooms: "2.7k", image: CAT_IMG["Bloomzein Originals"],
    excerpt: "Rest is not the pause between living. It is part of living beautifully." },
  { id: "CY032", title: "A Sharp Pain During Ovulation? Here's What Your Body May Be Trying to Tell You", category: "Cycle & Hormones", minutes: 5, blooms: "2.7k", image: CAT_IMG["Cycle & Hormones"], phase: "ovulatory",
    excerpt: "That sudden twinge in the middle of your cycle isn't always random. It may actually be one of the clearest signs that your body…" },
  { id: "HW001", title: "Why Has Chamomile Been a Women's Wellness Secret for Thousands of Years?", category: "Herbal Wellness", minutes: 5, blooms: "2.2k", image: CAT_IMG["Herbal Wellness"],
    excerpt: "This delicate flower may look simple, but hidden inside its tiny white petals are natural compounds that have supported women's…" },
  { id: "JR001", title: "Beginner Journal Prompts", category: "Journaling", minutes: 5, blooms: "1.5k", image: CAT_IMG["Journaling"],
    excerpt: "You don't need the perfect words—you only need the courage to write the first one." },
  { id: "SP003", title: "Sleep Hygiene", category: "Sleep", minutes: 5, blooms: "1.2k", image: CAT_IMG["Sleep"],
    excerpt: "Beautiful days begin with peaceful nights." },
  { id: "SP006", title: "Night Meditation", category: "Sleep", minutes: 5, blooms: "2.2k", image: CAT_IMG["Sleep"],
    excerpt: "The most peaceful nights begin the moment you stop carrying the weight of the day." },
  { id: "SL018", title: "Enjoying Silence", category: "Soft Living", minutes: 5, blooms: "0.9k", image: CAT_IMG["Soft Living"],
    excerpt: "Sometimes the most meaningful conversations are the ones you have with yourself." },
  { id: "SL019", title: "Soft Productivity", category: "Soft Living", minutes: 5, blooms: "1.6k", image: CAT_IMG["Soft Living"],
    excerpt: "Doing less isn't the goal. Feeling better while doing what matters is." },
  { id: "SL020", title: "A Beautiful Morning Starts the Night Before", category: "Soft Living", minutes: 4, blooms: "1.5k", image: CAT_IMG["Soft Living"],
    excerpt: "The gentlest mornings are quietly created the evening before." },
  { id: "YG001", title: "Morning Yoga", category: "Yoga", minutes: 5, blooms: "1.2k", image: CAT_IMG["Yoga"],
    excerpt: "Wake your body with kindness, and your day will follow the same rhythm." },
  { id: "YG005", title: "Sitting All Day? What 5 Minutes of Stretching Can Do for Your Body at Work", category: "Yoga", minutes: 6, blooms: "1.0k", image: CAT_IMG["Yoga"],
    excerpt: "Your desk isn't the problem—staying in the same position for hours is. Here's how a few intentional stretches can completely…" },
];

/** The full catalogue: long-form editorial reads first, then the phase seeds. */
export const ARTICLES: Article[] = [...IMPORTED_ARTICLES, ...PHASE_SEED_ARTICLES];

/** Article lookup by id (for /app/read?a=<id> deep links). */
export function articleById(id: string | null | undefined): Article | undefined {
  return id ? ARTICLES.find((a) => a.id === id) : undefined;
}

/** The reads tuned to a given phase. */
export function readsForPhase(phase: DietPhase): Article[] {
  return ARTICLES.filter((a) => a.phase === phase);
}

/** Articles in a category, in catalogue order. */
export function articlesByCategory(category: Category): Article[] {
  return ARTICLES.filter((a) => a.category === category);
}
