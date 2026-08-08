/**
 * Build-safe SEO content data — guides + FAQ.
 *
 * Extracted out of pages/Content.tsx (which imports React + assets) so that the
 * build-time prerenderer (prerender.ts, run from vite.config.ts) can import this
 * catalogue with NO React/asset dependencies and emit fully-formed static HTML
 * for /guides, /guides/<slug> and /faq. The live app imports the SAME data, so
 * the prerendered HTML and the hydrated SPA can never disagree.
 *
 * IMPORTANT: keep this module free of React/asset imports.
 */

export type Guide = {
  slug: string;
  title: string;
  metaTitle: string;
  description: string;
  readMins: number;
  intro: string;
  sections: { h: string; p: string[] }[];
};

export const GUIDES: Guide[] = [
  {
    slug: "cycle-syncing",
    title: "Cycle Syncing 101: living in sync with your menstrual cycle",
    metaTitle: "Cycle Syncing 101: How to Live in Sync With Your Cycle | Bloomzein",
    description: "A beginner's guide to cycle syncing — what the four menstrual phases mean and how to align your food, movement and energy with each one.",
    readMins: 6,
    intro: "Cycle syncing means adapting your food, movement, work and rest to the natural hormonal shifts of your menstrual cycle. Instead of expecting the same energy every day, you work with your body across four phases — and often feel steadier, stronger and less at war with yourself.",
    sections: [
      { h: "The four phases at a glance", p: [
        "Your cycle has four phases: menstrual, follicular, ovulatory and luteal. Each has a different hormonal profile, which affects your energy, mood, appetite and strength.",
        "Knowing roughly where you are lets you plan kindly — pushing when you're capable, resting when you need it, and eating for what your body is doing.",
      ] },
      { h: "Menstrual phase — rest & replenish", p: [
        "As your period begins, hormones are low and energy often dips. This is a time to slow down, keep warm, and replenish iron and magnesium with foods like leafy greens, lentils and dark chocolate.",
        "Gentle movement — walking, restorative yoga, mobility — usually feels better than intense training.",
      ] },
      { h: "Follicular phase — rise & build", p: [
        "After your period, estrogen climbs and so does your energy and motivation. It's a great window to start new things, train harder, and eat fresh, protein-rich, vibrant foods.",
      ] },
      { h: "Ovulatory phase — peak & connect", p: [
        "Around ovulation you're often at your most energetic and social. Channel it into your strongest workouts and lighter, fibre-rich meals with plenty of vegetables.",
      ] },
      { h: "Luteal phase — soften & steady", p: [
        "In the second half, progesterone rises and cravings are real. Complex carbs, magnesium and steady, comforting meals help smooth mood dips. Ease off high-intensity training toward the end and prioritise sleep.",
      ] },
      { h: "How Bloomzein does this for you", p: [
        "Set your cycle once and Bloomzein estimates your phase every day, then tunes your meal plan, workouts and daily insight to match — so you don't have to track it all in your head.",
      ] },
    ],
  },
  {
    slug: "eating-for-your-cycle",
    title: "Eating for your cycle: a phase-by-phase nutrition guide",
    metaTitle: "Eating for Your Cycle: Phase-by-Phase Nutrition Guide | Bloomzein",
    description: "What to eat in each phase of your menstrual cycle — iron for your period, protein as you rise, fibre at ovulation and complex carbs in your luteal phase.",
    readMins: 7,
    intro: "Your nutritional needs shift across your cycle. Eating with those shifts — rather than against them — can support your energy, mood and cravings. Here's a simple phase-by-phase approach.",
    sections: [
      { h: "Menstrual: iron, magnesium & warmth", p: [
        "You lose iron during your period, so lean into iron-rich foods (spinach, lentils, red meat if you eat it) with vitamin C to help absorption. Magnesium — from dark chocolate, nuts and seeds — can ease cramps and mood.",
        "Warm, cooked meals tend to feel more comforting than cold, raw ones.",
      ] },
      { h: "Follicular: fresh & protein-forward", p: [
        "Rising estrogen loves light, fresh foods and quality protein. Think eggs, fish, fermented foods, sprouts and colourful vegetables to fuel your climbing energy.",
      ] },
      { h: "Ovulatory: fibre & antioxidants", p: [
        "Support this peak with fibre-rich vegetables, whole grains and antioxidant-packed fruits. Lighter meals suit your higher energy.",
      ] },
      { h: "Luteal: complex carbs & steady blood sugar", p: [
        "Cravings peak here. Instead of fighting them, choose complex carbs (sweet potato, oats, quinoa), magnesium and healthy fats to keep blood sugar steady and mood even.",
      ] },
      { h: "Let the app plan it", p: [
        "In the Meal Planner, pick your diet and phase and Bloomzein builds a week of recipes that fit both — no spreadsheets required.",
      ] },
    ],
  },
  {
    slug: "cycle-synced-workouts",
    title: "Cycle-synced workouts: training with your hormones",
    metaTitle: "Cycle-Synced Workouts: Train With Your Hormones | Bloomzein",
    description: "How to match your workouts to your menstrual cycle — gentle movement on your period, strength as you rise, peak effort at ovulation, and easing off in your luteal phase.",
    readMins: 6,
    intro: "Training the same way all month ignores the fact that your strength, recovery and energy genuinely change across your cycle. Syncing your workouts can mean better results and fewer burnout weeks.",
    sections: [
      { h: "Menstrual: move gently", p: [
        "Low hormones mean lower energy for many. Walking, stretching, mobility and restorative yoga keep you moving without draining you.",
      ] },
      { h: "Follicular: build strength", p: [
        "Rising estrogen supports strength and stamina. This is a great time to progress your lifts, try new classes and push a little harder.",
      ] },
      { h: "Ovulatory: peak performance", p: [
        "You're often strongest and most powerful here — a window for your hardest sessions, HIIT or personal bests. Warm up well, as this is also when some are more injury-prone.",
      ] },
      { h: "Luteal: ease off & recover", p: [
        "As progesterone rises, prioritise steady-state cardio, lighter toning and recovery. Honour the fatigue toward the end and protect your sleep.",
      ] },
      { h: "Your plan, auto-adjusted", p: [
        "Bloomzein's Workout and Yoga tools suggest movement that fits your phase and energy, so you always know a sensible next session.",
      ] },
    ],
  },
];

export const FAQS: { q: string; a: string }[] = [
  { q: "Is Bloomzein free?", a: "Yes — you can create an account and use cycle tracking, meal planning, workouts, yoga, budgeting and journaling for free." },
  { q: "Is my health data private?", a: "Yes. Your cycle, weight, mood and other data are stored securely, protected so only your account can access them, and never sold. We don't run third-party advertising or analytics trackers." },
  { q: "Can I use Bloomzein for birth control?", a: "No. Cycle predictions are estimates to help you understand your body and are not a contraceptive method. Do not rely on the app to prevent or plan pregnancy — talk to a healthcare professional." },
  { q: "How does cycle syncing work?", a: "You enter your last period date and cycle length. Bloomzein estimates your four phases — menstrual, follicular, ovulatory and luteal — and tunes your meals, workouts and daily insights to what your body tends to need in each phase." },
  { q: "Does the meal planner really match my diet and my cycle?", a: "Yes. Your chosen diet (Balanced, Mediterranean, High-Protein, Vegan and more) filters which recipes can appear, and your selected cycle phase nudges the plan toward phase-supportive meals on top of that." },
  { q: "Does Bloomzein work offline?", a: "Yes. It's a Progressive Web App, so your data is cached on your device and the core experience works offline. Changes sync to the cloud the next time you're online and signed in." },
  { q: "Can I install it like an app?", a: "Yes. On your phone, open the site and choose “Add to Home Screen” (iPhone: the Share button; Android: the install prompt). It then opens full-screen like a native app." },
  { q: "Which devices are supported?", a: "Any modern browser on iOS, Android, or desktop. Sign in and your data follows you across all your devices." },
  { q: "How do I delete my account or data?", a: "Email us and we'll remove your data from our systems. You can also clear your logs from within the app." },
  { q: "Is Bloomzein medical advice?", a: "No. It's a wellness and self-tracking tool for general information. Always consult a qualified healthcare professional for medical decisions." },
];
