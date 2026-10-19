// Public "magic first, then sign up" reveal for the content tools whose value
// is phase-tailored samples (meal planner, workouts, yoga, journal). A visitor
// picks her phase and instantly sees a real, tailored sample — the phase-sync
// magic Bloomzein is built on — then a CTA to create a free account to get the
// full, auto-generated plan. Samples live here (client-only); crawlers still
// get the full SEO copy prerendered on the page.
import { useState } from "react";
import { Sparkles, Droplet, Sprout, Star, Moon } from "lucide-react";

type PhaseKey = "period" | "follicular" | "ovulation" | "luteal";
const PHASES: { key: PhaseKey; label: string; Icon: typeof Droplet }[] = [
  { key: "period", label: "Period", Icon: Droplet },
  { key: "follicular", label: "Follicular", Icon: Sprout },
  { key: "ovulation", label: "Ovulation", Icon: Star },
  { key: "luteal", label: "Luteal", Icon: Moon },
];

type Sample = { headline: string; items: string[] };

const SAMPLES: Record<string, { title: string; cta: string; byPhase: Record<PhaseKey, Sample> }> = {
  "meal-planner": {
    title: "See a day that matches your phase — free",
    cta: "Create your free account to get a full week that writes itself — phase-smart recipes, a shopping list, and targets that flex with your training.",
    byPhase: {
      period: { headline: "Warm, iron-rich comfort", items: ["Breakfast — Cacao & banana oats", "Lunch — Lentil & spinach soup", "Dinner — Ginger salmon, greens & rice"] },
      follicular: { headline: "Light, fresh, energising", items: ["Breakfast — Berry protein smoothie bowl", "Lunch — Chicken & quinoa rainbow salad", "Dinner — Stir-fried tofu & crisp veg"] },
      ovulation: { headline: "Bright & anti-inflammatory", items: ["Breakfast — Greek yoghurt, seeds & figs", "Lunch — Salmon poke bowl", "Dinner — Grilled chicken & roasted veg"] },
      luteal: { headline: "Steady, craving-smart", items: ["Breakfast — Sweet-potato & egg hash", "Lunch — Chickpea & avocado wrap", "Dinner — Turkey chilli with dark chocolate square"] },
    },
  },
  "workout-programs": {
    title: "See a session for your phase — free",
    cta: "Create your free account for full programs that rise when you're powerful and rest when you're not — matched to your cycle, week by week.",
    byPhase: {
      period: { headline: "Gentle mobility & walking", items: ["10-min mobility flow", "20-min easy walk", "Light stretching & breath"] },
      follicular: { headline: "Build strength", items: ["Goblet squats 3×10", "Push-ups 3×8", "Romanian deadlifts 3×10"] },
      ovulation: { headline: "Peak power / HIIT", items: ["Sprint intervals 8×20s", "Jump squats 4×12", "Kettlebell swings 4×15"] },
      luteal: { headline: "Steady & supportive", items: ["Moderate full-body circuit", "Incline walk 25 min", "Core & mobility finisher"] },
    },
  },
  "yoga": {
    title: "See a flow for your phase — free",
    cta: "Create your free account for guided, cycle-aware flows — from 5-minute resets to full classes that soften cramps or wake up your glow.",
    byPhase: {
      period: { headline: "Restorative & soothing", items: ["Child's pose — 2 min", "Reclined twist — 1 min each side", "Legs up the wall — 5 min"] },
      follicular: { headline: "Energising flow", items: ["Sun salutations ×5", "Warrior II flow", "Standing balance series"] },
      ovulation: { headline: "Strong & open", items: ["Dynamic vinyasa", "Side plank series", "Dancer's pose"] },
      luteal: { headline: "Grounding & calming", items: ["Gentle hip openers", "Forward folds", "Supported bridge — 3 min"] },
    },
  },
  "journal": {
    title: "A prompt that meets you where you are — free",
    cta: "Create your free account to journal daily, track your mood, and watch gentle patterns reveal themselves across your cycle.",
    byPhase: {
      period: { headline: "Rest & release", items: ["What can I let go of this week?", "How do I want to be cared for today?", "One small comfort I'll give myself."] },
      follicular: { headline: "Dream & plan", items: ["What am I excited to start?", "A goal I'd love to move forward.", "Where is my energy pulling me?"] },
      ovulation: { headline: "Connect & shine", items: ["Who do I want to reach out to?", "What makes me feel most myself?", "A bold idea I'll say out loud."] },
      luteal: { headline: "Reflect & soften", items: ["What's asking for my attention?", "Where can I lower the bar kindly?", "One thing I'm proud of this cycle."] },
    },
  },
};

export function PublicMagicReveal({ slug }: { slug: string }) {
  const data = SAMPLES[slug];
  const [phase, setPhase] = useState<PhaseKey>("follicular");
  if (!data) return null;
  const sample = data.byPhase[phase];

  return (
    <section className="rounded-[1.75rem] border border-petal/60 bg-white/80 p-5 shadow-[0_18px_50px_-30px_rgba(236,72,153,0.5)] sm:p-7">
      <h2 className="font-script text-2xl text-hotpink sm:text-3xl">{data.title}</h2>
      <p className="mt-1 text-[13px] text-rose/70">Tap your current phase — Bloomzein tailors everything to where you are.</p>

      <div className="mt-4 flex flex-wrap gap-2">
        {PHASES.map((p) => (
          <button key={p.key} onClick={() => setPhase(p.key)}
            className={["inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12.5px] font-bold transition active:scale-95", phase === p.key ? "bg-hotpink text-white" : "border border-petal/60 bg-white text-rose/70 hover:border-hotpink/40"].join(" ")}>
            <p.Icon className="h-3.5 w-3.5" strokeWidth={2.2} /> {p.label}
          </button>
        ))}
      </div>

      <div key={phase} className="mt-4 animate-fade-in rounded-[1.5rem] bg-gradient-to-br from-hotpink/10 to-petal/10 p-5">
        <p className="text-[12px] font-black uppercase tracking-wide text-hotpink">{sample.headline}</p>
        <ul className="mt-2 space-y-2">
          {sample.items.map((it) => (
            <li key={it} className="flex items-start gap-2 text-[13.5px] leading-snug text-[#7a1247]">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-hotpink" /> {it}
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-4 rounded-2xl bg-gradient-to-br from-hotpink to-[#db2777] p-5 text-center text-white">
        <p className="font-script text-2xl">This is just a taste ✿</p>
        <p className="mx-auto mt-1 max-w-md text-[13px] text-white/90">{data.cta}</p>
        <a href="/onboarding" className="mt-3 inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-[15px] font-bold text-hotpink transition hover:bg-white/90">
          <Sparkles className="h-4 w-4" /> Create my free account
        </a>
      </div>
    </section>
  );
}
