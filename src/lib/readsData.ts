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
  "Money",
  "Clean Girl",
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
  /** "review" shows the editorial review panel (comment + validate) on the
   * article until it's approved; absent/"published" is a clean live read. */
  status?: "review";
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
  Money: "/images/read-money.webp",
  "Clean Girl": "/images/read-selfcare.webp",
  Lifestyle: "/images/read-selfcare.webp",
  "Bloomzein Originals": "/images/read-featured.webp",
};

export const IMG = { featured: "/images/read-featured.webp", ...CAT_IMG } as const;

/* ── Written articles (the editorial library) ──
 * Long-form; bodies load lazily from src/content/reads/*. Phase-tagged pieces
 * also power the four-phase "For your phase" carousels on Today and Diet. */
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
  { id: "CY006", title: "Your Period Is Trying to Tell You Something", category: "Cycle & Hormones", minutes: 5, blooms: "1.1k", image: CAT_IMG["Cycle & Hormones"], phase: "menstrual",
    excerpt: "Your period is a monthly report card for your whole body — once you learn to read it, it tells you more than any app." },
  { id: "CY007", title: "The Week Your Body Was Built to Shine", category: "Cycle & Hormones", minutes: 5, blooms: "2.4k", image: CAT_IMG["Cycle & Hormones"], phase: "ovulatory",
    excerpt: "For a few days each month, your biology quietly turns everything up — energy, confidence, glow. Here's the science behind your brightest week." },
  { id: "CY008", title: "Why Everything Suddenly Feels Harder", category: "Cycle & Hormones", minutes: 4, blooms: "1.9k", image: CAT_IMG["Cycle & Hormones"], phase: "luteal",
    excerpt: "The week before your period, ordinary tasks start to feel uphill. It's not you losing your edge — it's a hormone shift with a purpose." },
  { id: "CY009", title: "What Your Cravings Are Really Trying to Tell You", category: "Cycle & Hormones", minutes: 4, blooms: "2.2k", image: CAT_IMG["Cycle & Hormones"], phase: "luteal",
    excerpt: "That pull toward chocolate and carbs before your period isn't weakness or a lack of willpower. It's biology — and it makes surprising sense." },
  { id: "CY010", title: "Is Your Period Actually Normal?", category: "Cycle & Hormones", minutes: 5, blooms: "1.3k", image: CAT_IMG["Cycle & Hormones"],
    excerpt: "Almost every woman quietly wonders it — and almost no one asks out loud. Here's the real range of normal, and the signs worth a doctor's ear." },
  { id: "NU001", title: "The Breakfast Mistake That Steals Your Energy", category: "Nutrition", minutes: 4, blooms: "1.4k", image: CAT_IMG["Nutrition"],
    excerpt: "You ate something 'healthy' this morning — so why the crash by 11am? The answer is hiding in your very first meal." },
  { id: "NU002", title: "Are You Actually Hungry — or Just Tired?", category: "Nutrition", minutes: 4, blooms: "1.6k", image: CAT_IMG["Nutrition"],
    excerpt: "That afternoon urge to snack might not be hunger at all. Three feelings wear the same disguise — and learning to tell them apart changes everything." },
  { id: "NU003", title: "Why Iron Matters More Than You Think", category: "Nutrition", minutes: 4, blooms: "1.5k", image: CAT_IMG["Nutrition"], phase: "menstrual",
    excerpt: "If you're tired no matter how much you sleep, one quiet mineral could be the reason — and your monthly cycle makes women uniquely likely to run low." },
  { id: "NU004", title: "What Your Body Wants Before Your Period", category: "Nutrition", minutes: 4, blooms: "1.8k", image: CAT_IMG["Nutrition"], phase: "luteal",
    excerpt: "The week before your period, your appetite and needs quietly change. Eat for the phase you're actually in, and everything feels a little softer." },
  { id: "NU005", title: "Eat With Your Cycle, Not Against It", category: "Nutrition", minutes: 4, blooms: "2.3k", image: CAT_IMG["Nutrition"],
    excerpt: "You eat the same way every day — but you're not the same every day. What if your plate could follow the four seasons quietly turning inside you?" },
  { id: "BE001", title: "Stop Washing Your Face Like This", category: "Beauty", minutes: 4, blooms: "2.1k", image: CAT_IMG["Beauty"],
    excerpt: "The way most of us clean our skin is quietly undoing it. A few small changes at the sink can transform everything that comes after." },
  { id: "BE002", title: "The Truth About Glass Skin", category: "Beauty", minutes: 4, blooms: "2.6k", image: CAT_IMG["Beauty"],
    excerpt: "That poreless, lit-from-within glow everyone's chasing — here's what actually creates it, and what's just very good marketing." },
  { id: "BE003", title: "Why Your Skin Suddenly Starts Glowing", category: "Beauty", minutes: 4, blooms: "1.9k", image: CAT_IMG["Beauty"], phase: "follicular",
    excerpt: "Some weeks your skin just behaves — clearer, plumper, easier. It isn't random, and it isn't luck. Your cycle is quietly running your complexion." },
  { id: "BE004", title: "What Your Hair Is Trying to Tell You", category: "Beauty", minutes: 4, blooms: "1.7k", image: CAT_IMG["Beauty"],
    excerpt: "More shedding than usual? A change in texture? Your hair is one of the body's most honest messengers — if you know how to listen." },
  { id: "BE006", title: "The Skincare Step Most Women Skip", category: "Beauty", minutes: 4, blooms: "2.4k", image: CAT_IMG["Beauty"],
    excerpt: "It's the single most powerful thing you can do for your skin — and it's the one step most of us leave out. No serum comes close." },
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
  { id: "MW001", title: "Why Am I So Tired All the Time?", category: "Mental Wellness", minutes: 5, blooms: "3.0k", image: CAT_IMG["Mental Wellness"],
    excerpt: "You rest, you sleep, you do everything right — and the tiredness still follows you around. When it won't lift, it's rarely about sleep at all." },
  { id: "MW002", title: "How to Stop Overthinking Everything", category: "Mental Wellness", minutes: 6, blooms: "2.8k", image: CAT_IMG["Mental Wellness"], status: "review",
    excerpt: "The 2 a.m. replays, the imagined conversations, the decisions you make and un-make. Overthinking isn't a flaw in you — it's a loop, and loops can be broken." },
  { id: "MW003", title: "Why Do I Feel Anxious for No Reason?", category: "Mental Wellness", minutes: 6, blooms: "2.7k", image: CAT_IMG["Mental Wellness"],
    excerpt: "That tight chest, that sense of dread with nothing behind it — anxiety that arrives with no clear cause. It's real, it's common, and it almost always has a reason you just can't see yet." },
  { id: "MW004", title: "The Signs You're Burnt Out (and Don't Realize It)", category: "Mental Wellness", minutes: 6, blooms: "2.5k", image: CAT_IMG["Mental Wellness"],
    excerpt: "Burnout doesn't always look like collapse. Often it looks like coping — still functioning, still showing up, while quietly running on empty. Here's how to catch it before it catches you." },
  { id: "MW005", title: "Why You Feel More Anxious Before Your Period", category: "Mental Wellness", minutes: 6, blooms: "2.6k", image: CAT_IMG["Mental Wellness"], phase: "luteal",
    excerpt: "Same week, every month — the dread, the tears, the racing mind, the sense that you're falling apart. You're not. It's your hormones, and there's a pattern you can learn to see." },
  { id: "SP003", title: "Sleep Hygiene", category: "Sleep", minutes: 5, blooms: "1.2k", image: CAT_IMG["Sleep"],
    excerpt: "Beautiful days begin with peaceful nights." },
  { id: "SP006", title: "Night Meditation", category: "Sleep", minutes: 5, blooms: "2.2k", image: CAT_IMG["Sleep"],
    excerpt: "The most peaceful nights begin the moment you stop carrying the weight of the day." },
  { id: "SP010", title: "Why You Keep Waking Up at 3 A.M.", category: "Sleep", minutes: 6, blooms: "3.1k", image: CAT_IMG["Sleep"],
    excerpt: "Same time, almost every night — eyes open, mind racing, the clock glowing 3-something. It isn't random, and it isn't insomnia. Your body is doing something very specific." },
  { id: "SP011", title: "You Sleep 8 Hours — So Why Are You Still Exhausted?", category: "Sleep", minutes: 8, blooms: "2.8k", image: CAT_IMG["Sleep"],
    excerpt: "You did everything right. In bed on time, a full night's sleep, no midnight scrolling — and you still woke up feeling like you barely slept. The number was never the point." },
  { id: "SP012", title: "The Last Thing You Do Before Bed Is Wrecking Your Sleep", category: "Sleep", minutes: 4, blooms: "2.5k", image: CAT_IMG["Sleep"],
    excerpt: "It feels harmless — even relaxing. The little ritual you end almost every day with. But those final minutes before sleep hold more power over your night than the whole hour before them." },
  { id: "SP013", title: "Why You Sleep Worse the Week Before Your Period", category: "Sleep", minutes: 4, blooms: "2.4k", image: CAT_IMG["Sleep"], phase: "luteal",
    excerpt: "Restless nights, 3 a.m. wake-ups, sleep that suddenly stops working — right on schedule, every month. You're not imagining it. Your hormones are quietly rewriting your nights." },
  { id: "SP014", title: "What Your Body Secretly Does While You Sleep", category: "Sleep", minutes: 4, blooms: "2.2k", image: CAT_IMG["Sleep"],
    excerpt: "You think you switch off. You don't. The hours you're unconscious are the busiest, most extraordinary of your day — your body running repairs it can't do while you're awake." },
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
  { id: "CG001", title: "The Clean Girl Morning Routine Everyone Is Copying", category: "Clean Girl", minutes: 5, blooms: "4.2k", image: CAT_IMG["Clean Girl"], status: "review",
    excerpt: "That dewy, effortless, put-together look isn't genetics and it isn't money. It's a 15-minute morning anyone can copy — here it is, step by step." },
  { id: "CG002", title: "15 Habits Every Clean Girl Does Every Day", category: "Clean Girl", minutes: 5, blooms: "3.6k", image: CAT_IMG["Clean Girl"], status: "review",
    excerpt: "The clean-girl look isn't one big secret — it's fifteen tiny habits, repeated daily, that quietly add up to that put-together glow. Here are all fifteen." },
  { id: "CG003", title: "How to Smell Like a Clean Girl", category: "Clean Girl", minutes: 5, blooms: "3.9k", image: CAT_IMG["Clean Girl"],
    excerpt: "Not heavy perfume — that soft, just-showered, clean-skin scent that seems to follow her around. Here's exactly how to smell fresh and expensive all day." },
  { id: "CG004", title: "Why Her Sleek Bun Looks Expensive (and Yours Doesn't)", category: "Clean Girl", minutes: 6, blooms: "3.3k", image: CAT_IMG["Clean Girl"], status: "review",
    excerpt: "Same tutorial, same gel — and your sleek bun still looks flat while hers looks like glass. The secret isn't the style. It's everything that happens before you touch your hair." },
  { id: "CG005", title: "The Jewelry Every Clean Girl Owns", category: "Clean Girl", minutes: 5, blooms: "3.1k", image: CAT_IMG["Clean Girl"], status: "review",
    excerpt: "A few quiet gold pieces, rarely taken off, that read expensive because they're restrained — the hoops, the chain, the watch, the ring, and the one signature piece that's entirely you." },
  { id: "LS001", title: "The Secret Behind a Genuinely Happy Life", category: "Lifestyle", minutes: 6, blooms: "3.4k", image: CAT_IMG["Lifestyle"], status: "review",
    excerpt: "We keep waiting to be happy — after the promotion, the move, the better life. But the happiest people have a quiet secret: it was never about a better life at all." },
  { id: "LS002", title: "Slow Living by Bloomzein", category: "Lifestyle", minutes: 6, blooms: "2.9k", image: CAT_IMG["Lifestyle"], status: "review",
    excerpt: "The world runs on hurry, and it's quietly wearing you thin. Here are Bloomzein's slow-living principles — and a dare: live just one day by them and meet the calmer you." },
];

/** The full catalogue: long-form editorial reads first, then the phase seeds. */
export const ARTICLES: Article[] = [...IMPORTED_ARTICLES];

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

/**
 * "Keep reading" picks for the end of an article: same phase first, then same
 * category, then anything — de-duplicated, current article excluded.
 */
export function relatedArticles(article: Article, count = 3): Article[] {
  const pool = ARTICLES.filter((a) => a.id !== article.id);
  const score = (a: Article) =>
    (article.phase && a.phase === article.phase ? 2 : 0) +
    (a.category === article.category ? 1 : 0);
  return [...pool].sort((a, b) => score(b) - score(a)).slice(0, count);
}
