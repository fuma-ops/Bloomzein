// =============================================================================
// Public, SEO-first landing pages for each Bloomzein tool.
// These live at /tools/<slug> (public, crawlable) — distinct from the in-app
// /app/tools/<slug> (login-gated, blocked in robots.txt). They're prerendered
// to static HTML (see prerenderContent + vite.config) with keyword-rich titles,
// meta, headings, FAQ + SoftwareApplication structured data and internal links,
// so people searching for each feature can find Bloomzein on Google.
//
// IMPORTANT: keep this free of React/asset imports — vite.config imports it at
// build time (like the blog/sitemap generators).
// =============================================================================

export type ToolFaq = { q: string; a: string };
export type ToolSection = { h: string; p: string };
export type ToolPage = {
  slug: string;
  /** In-app route this page sends visitors to (via Start Blooming). */
  appHref: string;
  /** Short name (nav/breadcrumb). */
  name: string;
  /** <title> — keep ≤ ~60 chars, primary keyword first. */
  metaTitle: string;
  /** meta description — ≤ ~160 chars. */
  metaDescription: string;
  /** H1. */
  h1: string;
  /** Lead paragraph (keyword-rich, natural). */
  intro: string;
  image: string;
  sections: ToolSection[];
  faqs: ToolFaq[];
  /** Related tool slugs for internal linking. */
  related: string[];
};

export const TOOL_PAGES: ToolPage[] = [
  {
    slug: "cycle-tracker",
    appHref: "/app/tools/cycle",
    name: "Cycle Tracker",
    metaTitle: "Cycle & Period Tracker App for Women — Bloomzein",
    metaDescription:
      "Track your menstrual cycle and period, know your current phase, and get daily guidance for energy, mood and symptoms — free in the Bloomzein app.",
    h1: "Cycle & Period Tracker",
    intro:
      "Bloomzein's cycle tracker lets you log your period in seconds and understand your whole month — not just the days you bleed. See your current phase (menstrual, follicular, ovulatory, luteal), what to expect, and gentle daily guidance for your energy, cravings and mood.",
    image: "/images/flagship-cycle.webp",
    sections: [
      { h: "Know your phase every day", p: "See exactly where you are in your cycle and what it means for your body — so your energy, workouts and meals finally make sense instead of feeling random." },
      { h: "Log periods & symptoms in seconds", p: "Record your period, flow, symptoms and mood with a tap. Bloomzein learns your rhythm and predicts your next period and fertile window." },
      { h: "Every tool syncs to your cycle", p: "Your cycle powers the whole app — meals, workouts, yoga and self-care all adapt to your phase automatically. One source of truth for your body." },
    ],
    faqs: [
      { q: "Is the cycle tracker free?", a: "Yes. You can track your cycle, period and symptoms for free in the Bloomzein app. Premium (Bloom+) adds full plans, reports and an ad-free experience." },
      { q: "Does it predict my next period?", a: "Yes — Bloomzein learns your cycle length and predicts your next period and fertile window, and updates as you log." },
      { q: "What are the four cycle phases?", a: "Menstrual, follicular, ovulatory and luteal. Each phase affects your energy, mood, cravings and workouts — Bloomzein guides you through all four." },
    ],
    related: ["meditation-breathwork", "workout-programs", "meal-planner"],
  },
  {
    slug: "meal-planner",
    appHref: "/app/tools/meals",
    name: "Meal Planner",
    metaTitle: "Cycle Meal Planner & Recipes for Women — Bloomzein",
    metaDescription:
      "A weekly meal planner that writes itself with phase-smart recipes and auto shopping lists, synced to your cycle and goals. Try Bloomzein free.",
    h1: "Cycle-Synced Meal Planner",
    intro:
      "Stop wondering what to eat. Bloomzein's meal planner builds a delicious, balanced week for you — with phase-smart recipes, calorie and macro targets, and a shopping list that writes itself, all synced to your cycle and your goals.",
    image: "/images/flagship-meals.webp",
    sections: [
      { h: "A whole week, auto-planned", p: "Get a full week of breakfasts, lunches, dinners and snacks tailored to your body — nourishing, gorgeous and effortless." },
      { h: "Phase-smart recipes", p: "Eat what your body is actually asking for: iron-rich on your period, protein as you rise, light and hydrating in your luteal phase." },
      { h: "Shopping list in one tap", p: "Your plan turns into a tidy shopping list automatically, so groceries take minutes, not hours." },
    ],
    faqs: [
      { q: "Does the meal plan match my cycle?", a: "Yes — recipes adapt to your current phase and your goal (lose, maintain or gain), so your nutrition flexes with your body." },
      { q: "Can I see calories and macros?", a: "Yes. Bloomzein shows calorie and macro targets that adjust to your profile, cycle and training, powered by one shared nutrition engine." },
      { q: "Is it free?", a: "You can explore meals for free. The full auto-planned week and shopping list are part of Bloom+ premium." },
    ],
    related: ["diet-nutrition", "cycle-tracker", "workout-programs"],
  },
  {
    slug: "diet-nutrition",
    appHref: "/app/tools/diet",
    name: "Diet & Nutrition",
    metaTitle: "Calorie & Macro Tracker for Women — Bloomzein",
    metaDescription:
      "Calorie and macro targets that flex with your cycle, training and goals — plus an energy balance and goal timeline. Nutrition made simple in Bloomzein.",
    h1: "Diet & Nutrition Tracker",
    intro:
      "Finally understand your numbers. Bloomzein's diet tool gives you calorie and macro targets that flex with your cycle, your training and your goals — with a clear energy balance and a realistic goal timeline.",
    image: "/images/grid-diet.webp",
    sections: [
      { h: "Targets that fit your body", p: "One smart engine sets your calories and macros from your profile, phase and activity — no guesswork, no generic numbers." },
      { h: "Energy balance you can see", p: "See what you eat vs. what you burn each day, and how it moves you toward your goal." },
      { h: "A realistic goal timeline", p: "Know when you'll reach your goal at a healthy, sustainable pace — and adjust anytime." },
    ],
    faqs: [
      { q: "How are my calories calculated?", a: "Bloomzein uses one BMR engine based on your age, weight, height, goal and activity, then adapts it to your cycle phase and training." },
      { q: "Does it work with the meal planner?", a: "Yes — your diet targets and the meal planner share the same numbers, so every tool agrees on your nutrition." },
    ],
    related: ["meal-planner", "cycle-tracker", "workout-programs"],
  },
  {
    slug: "workout-programs",
    appHref: "/app/tools/workout",
    name: "Workout Programs",
    metaTitle: "Cycle-Synced Workouts for Women — Bloomzein",
    metaDescription:
      "Strength, HIIT and mobility workouts that rise and rest with your cycle. Home-friendly programs matched to your energy. Try Bloomzein free.",
    h1: "Cycle-Synced Workout Programs",
    intro:
      "Move with your energy, not against it. Bloomzein's workouts — strength, HIIT and mobility — rise when you're powerful and ease off when you need rest, perfectly matched to your cycle phase. Home-friendly, guided and beautiful.",
    image: "/images/flagship-workout.webp",
    sections: [
      { h: "Train with your phase", p: "Push in your high-energy phases, recover in your low ones. Workouts that respect your body get better results with less burnout." },
      { h: "From 5 minutes to full sessions", p: "Quick resets or complete programs — pick what fits your day, with clear guided movements." },
      { h: "Fuel & recovery built in", p: "Training days nudge your nutrition so you recover well, all connected to your meal plan." },
    ],
    faqs: [
      { q: "Do I need equipment or a gym?", a: "No — most workouts are home-friendly and need little or no equipment." },
      { q: "How are workouts matched to my cycle?", a: "Bloomzein reads your current phase and suggests the right intensity — strength as you rise, gentler movement on your period." },
    ],
    related: ["yoga", "cycle-tracker", "diet-nutrition"],
  },
  {
    slug: "yoga",
    appHref: "/app/tools/yoga",
    name: "Yoga Flows",
    metaTitle: "Cycle-Syncing Yoga for Women — Bloomzein",
    metaDescription:
      "Cycle-aware yoga flows — from 5-minute resets to full classes that soften cramps and wake up your glow. Gentle, guided yoga in Bloomzein.",
    h1: "Cycle-Syncing Yoga Flows",
    intro:
      "Yoga that meets you where you are. Bloomzein's cycle-aware flows go from 5-minute resets to full classes — soothing cramps on your period, energizing you as you rise, and helping you unwind in your luteal phase.",
    image: "/images/flagship-yoga.webp",
    sections: [
      { h: "Flows for every phase & mood", p: "Gentle, restorative or energizing — the right flow for how your body feels today." },
      { h: "Ease cramps & tension", p: "Phase-matched sequences to soften period cramps, release tension and help you rest." },
      { h: "Short or full sessions", p: "No time? A 5-minute flow still counts. Got more? Flow into a full class." },
    ],
    faqs: [
      { q: "Is the yoga suitable for beginners?", a: "Yes — flows are guided and adaptable, from total beginner to more experienced." },
      { q: "Can yoga help with period cramps?", a: "Gentle, phase-matched yoga can help ease cramps and tension for many people. Bloomzein suggests the right flow for your phase." },
    ],
    related: ["meditation-breathwork", "workout-programs", "cycle-tracker"],
  },
  {
    slug: "meditation-breathwork",
    appHref: "/app/tools/breathwork",
    name: "Meditation & Breathwork",
    metaTitle: "Breathing Exercises & Meditation App — Bloomzein",
    metaDescription:
      "Calm your mind with guided breathing — 4-7-8, box breathing and more — plus soft meditation. A free breathwork tool for stress, sleep and anxiety.",
    h1: "Meditation & Breathwork",
    intro:
      "Find your calm in minutes. Bloomzein's breathwork tool guides you through soothing breathing exercises — 4-7-8, box breathing, calm and energizing patterns — with a beautiful animated lotus, a session timer and gentle cues for stress, sleep and anxiety.",
    image: "/images/read-mindset.webp",
    sections: [
      { h: "Guided breathing patterns", p: "Follow the lotus: inhale, hold, exhale. Choose 4-7-8 for sleep, box breathing for focus, or a calming pattern to ease anxiety." },
      { h: "A soft daily reset", p: "A 2, 5 or 10-minute session to slow down, lower stress and come back to the present — anytime you need it." },
      { h: "Made for your cycle", p: "A soothing ritual for low-energy days, cramps and busy minds — part of your whole wellness world." },
    ],
    faqs: [
      { q: "What is 4-7-8 breathing?", a: "A calming technique: inhale for 4 seconds, hold for 7, exhale for 8. It helps slow your heart rate and relax before sleep. Bloomzein guides you through it." },
      { q: "Is the breathwork tool free?", a: "Yes — guided breathing is available for free in Bloomzein. Premium adds more and removes ads." },
      { q: "Can breathing exercises help with anxiety and sleep?", a: "Slow, guided breathing can calm the nervous system and help many people relax and fall asleep more easily." },
    ],
    related: ["yoga", "journal", "cycle-tracker"],
  },
  {
    slug: "journal",
    appHref: "/app/tools/diary",
    name: "Dreamy Diary",
    metaTitle: "Mood Journal & Wellness Diary for Women — Bloomzein",
    metaDescription:
      "A soft space to journal your mood and feelings, and watch gentle patterns reveal themselves across your cycle. Free wellness diary in Bloomzein.",
    h1: "Mood Journal & Wellness Diary",
    intro:
      "A soft place for every feeling. Bloomzein's diary lets you journal freely and track your mood, then gently reveals patterns across your cycle — so you understand yourself a little more each month.",
    image: "/images/grid-diary.webp",
    sections: [
      { h: "Journal your way", p: "Write as much or as little as you like. No pressure, no judgement — just a calm, pretty space that's yours." },
      { h: "See your mood patterns", p: "Track how you feel and watch gentle patterns emerge across your phases, so low days feel less surprising." },
      { h: "Tied to your cycle", p: "Your mood connects to your phase, giving you kind context for how you're feeling." },
    ],
    faqs: [
      { q: "Is my journal private?", a: "Yes — your entries are tied to your account. You can delete individual entries or your whole account anytime." },
      { q: "Does it track mood over time?", a: "Yes — Bloomzein shows your mood across your cycle so you can spot patterns gently." },
    ],
    related: ["meditation-breathwork", "cycle-tracker", "yoga"],
  },
  {
    slug: "budget-planner",
    appHref: "/budget",
    name: "Budget Planner",
    metaTitle: "Self-Care Budget Planner for Women — Bloomzein",
    metaDescription:
      "A calm, cute budget planner that keeps your self-care sustainable. Plan your soft-girl spending without the money stress. Free in Bloomzein.",
    h1: "Self-Care Budget Planner",
    intro:
      "Glow without the money stress. Bloomzein's budget planner is a calm, cute way to plan your spending and keep your self-care sustainable — so looking after yourself never breaks the bank.",
    image: "/images/budget-hero.webp",
    sections: [
      { h: "Plan your soft-girl spending", p: "Set simple budgets for the things that matter — wellness, beauty, food — and see where your money goes." },
      { h: "Stay sustainable", p: "Keep self-care affordable month after month, without guilt or overwhelm." },
    ],
    faqs: [
      { q: "Is the budget planner free?", a: "Yes — you can plan your budget for free in Bloomzein. Premium removes ads and unlocks reports." },
    ],
    related: ["cycle-tracker", "journal", "meal-planner"],
  },
];

export function toolPageBySlug(slug: string): ToolPage | undefined {
  return TOOL_PAGES.find((t) => t.slug === slug);
}
export function toolPagePaths(): string[] {
  return TOOL_PAGES.map((t) => `/tools/${t.slug}`);
}
