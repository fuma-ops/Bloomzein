import { useEffect, useState } from "react";
import {
  Sparkles, Check, ArrowRight, Flower2, Target, UtensilsCrossed, Dumbbell,
  TrendingDown, Activity, Lock,
} from "lucide-react";
import { hasCycleSettings } from "@/components/bloom/cyclePhase";
import { hasMealPlan, hasMovementPlan } from "@/lib/crossToolData";
import { hasDietSetup, RECIPES, recipeImageSrc } from "@/components/bloom/recipes/data";
import { startGuide } from "@/lib/guidedSetup";

/* ============================================================================
   Build your Bloom world — the guided setup on Today, as ONE premium container:
   a glossy fuchsia header with a progress stepper, then each real tool as an
   elegant row separated by soft dividers (not a stack of cards). Every step
   lights up ✓ the moment it's set up for real; the last row — Bloom AI Sync —
   activates only once the four tools are configured.
============================================================================ */

const DOW = ["S", "M", "T", "W", "T", "F", "S"];

// Three real recipes from our library for the Meals preview.
const MEAL_PREVIEW = ["breakfast", "lunch", "dinner"]
  .map((t) => RECIPES.find((r) => r.mealType === t))
  .filter(Boolean) as (typeof RECIPES);

function readGoalLine(): { target: number; toGo: number } | null {
  try {
    const p = JSON.parse(localStorage.getItem("bloom:diet-profile") || "null");
    const current = Number(p?.weight);
    const target = Number(p?.targetWeight ?? p?.goalWeight);
    if (Number.isFinite(current) && Number.isFinite(target) && target > 0) {
      return { target, toGo: Math.round((current - target) * 10) / 10 };
    }
  } catch {}
  return null;
}

// A clean, gently-descending weight forecast — one soft line, no clutter.
function GoalGraph({ goalLine }: { goalLine: { target: number; toGo: number } | null }) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <span className="text-[10px] font-bold text-rose/60">{goalLine ? `Goal: ${goalLine.target} kg` : "Your weight forecast"}</span>
        {goalLine && <span className="inline-flex items-center gap-0.5 text-[10px] font-black text-hotpink"><TrendingDown className="h-2.5 w-2.5" strokeWidth={2.5} />{Math.abs(goalLine.toGo)} kg to go</span>}
      </div>
      <svg viewBox="0 0 120 24" className="h-6 w-full" preserveAspectRatio="none">
        <defs>
          <linearGradient id="bbw-goal-fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#F472B6" stopOpacity="0.28" /><stop offset="1" stopColor="#F472B6" stopOpacity="0" /></linearGradient>
          <linearGradient id="bbw-goal-line" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#F472B6" /><stop offset="1" stopColor="#DB2777" /></linearGradient>
        </defs>
        <path d="M3,4 L32,7 L62,11 L91,16 L117,20 L117,24 L3,24 Z" fill="url(#bbw-goal-fill)" />
        <polyline points="3,4 32,7 62,11 91,16 117,20" fill="none" stroke="url(#bbw-goal-line)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="117" cy="20" r="2.6" fill="#DB2777" stroke="#fff" strokeWidth="0.9" />
      </svg>
    </div>
  );
}

export function BuildBloomWorld({ moodDone, onLogMood }: { moodDone: boolean; onLogMood: () => void }) {
  const [, force] = useState(0);
  useEffect(() => {
    const onVis = () => { if (document.visibilityState === "visible") force((n) => n + 1); };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);
  void moodDone; void onLogMood; // mood lives in the hero + bloom checklist now

  const cycleDone = hasCycleSettings();
  const dietDone  = hasDietSetup();
  const mealsDone = hasMealPlan();
  const moveDone  = hasMovementPlan();
  const allCore   = cycleDone && dietDone && mealsDone && moveDone;
  const goalLine  = readGoalLine();

  type Step = {
    key: string; n: number; title: string; emoji: string; done: boolean;
    href?: string; blurb: string; unlocks: string[]; Icon: typeof Flower2;
    image: string; visual: React.ReactNode; sync?: boolean;
  };

  const STEPS: Step[] = [
    {
      n: 1, key: "cycle", title: "Set up your cycle", emoji: "🌸", done: cycleDone, href: "/app/tools/cycle", Icon: Flower2,
      image: "/images/setup-cycle.webp",
      blurb: "Track your cycle and understand your body better.",
      unlocks: ["Personalized energy", "Mood predictions", "Symptom tracking", "Daily insights"],
      visual: (
        <div className="flex items-center gap-1.5">
          {DOW.map((d, i) => (
            <div key={i} className="flex flex-col items-center gap-1">
              <span className="text-[9px] font-bold text-rose/45">{d}</span>
              <span className={["h-3.5 w-3.5 rounded-full", i === 3 ? "bg-hotpink ring-2 ring-hotpink/30" : i === 2 || i === 4 ? "bg-hotpink/40" : "bg-petal/60"].join(" ")} />
            </div>
          ))}
        </div>
      ),
    },
    {
      n: 2, key: "diet", title: "Set your goal", emoji: "🎯", done: dietDone, href: "/app/tools/diet", Icon: Target,
      image: "/images/setup-goal.webp",
      blurb: "Set your goal and let Bloomzein calculate your daily targets.",
      unlocks: ["Weight forecast", "Daily calorie target", "Macro balance", "Progress tracking"],
      visual: <GoalGraph goalLine={goalLine} />,
    },
    {
      n: 3, key: "meals", title: "Plan your meals", emoji: "🍽️", done: mealsDone, href: "/app/tools/meals", Icon: UtensilsCrossed,
      image: "/images/setup-meals.webp",
      blurb: "Get personalized recipes, grocery lists and daily meal plans.",
      unlocks: ["Personalized recipes", "Grocery lists", "Calories & macros", "Meal reminders"],
      visual: (
        <div className="flex items-center gap-2">
          {MEAL_PREVIEW.map((r) => (
            <div key={r.id} className="min-w-0 flex-1">
              <div className="h-11 w-full overflow-hidden rounded-lg bg-blush ring-1 ring-petal/50">
                <img src={recipeImageSrc(r)} alt="" className="h-full w-full object-cover" loading="lazy"
                  onError={(e) => { const el = e.currentTarget as HTMLImageElement; if (!el.src.endsWith("/images/meal-buddha.webp")) el.src = "/images/meal-buddha.webp"; }} />
              </div>
              <span className="mt-0.5 block truncate text-center text-[8px] font-bold uppercase tracking-wide text-rose/55">{r.name}</span>
            </div>
          ))}
        </div>
      ),
    },
    {
      n: 4, key: "move", title: "Plan your movement", emoji: "🧘‍♀️", done: moveDone, href: "/app/tools/workout", Icon: Dumbbell,
      image: "/images/setup-movement.webp",
      blurb: "Build a movement plan that matches your energy and goals.",
      unlocks: ["Workouts & yoga", "Recovery days", "Daily energy boost", "Wellness plan"],
      visual: (
        <div className="flex items-center gap-1.5">
          {DOW.map((d, i) => (
            <div key={i} className="flex flex-col items-center gap-1">
              <span className="text-[9px] font-bold text-rose/45">{d}</span>
              <span className={["grid h-5 w-5 place-items-center rounded-full", [1, 3, 5].includes(i) ? "bg-blush text-hotpink" : "bg-petal/40 text-rose/30"].join(" ")}>
                {i === 1 ? <Dumbbell className="h-3 w-3" strokeWidth={2} /> : i === 3 ? <Flower2 className="h-3 w-3" strokeWidth={2} /> : i === 5 ? <Activity className="h-3 w-3" strokeWidth={2} /> : <span className="h-1 w-1 rounded-full bg-current" />}
              </span>
            </div>
          ))}
        </div>
      ),
    },
    {
      n: 5, key: "ai", title: "Bloom AI Sync", emoji: "✨", done: allCore, Icon: Sparkles, sync: true,
      image: "/images/setup-ai.webp",
      blurb: "Everything works together into one connected, living routine — powered by Bloom AI.",
      unlocks: ["Cycle-synced plan", "Smart daily Today", "Personalized coaching", "One magical routine"],
      visual: null,
    },
  ];

  const doneCount = STEPS.filter((s) => s.done).length;
  if (doneCount === STEPS.length) return null;
  const nextIdx = STEPS.findIndex((s) => !s.done && !s.sync);

  return (
    <section className="mt-4 sm:mt-6 animate-card-pop-in" style={{ animationDelay: "30ms" }}>
      <div className="overflow-hidden rounded-[2rem] border border-white/70 bg-white/80 backdrop-blur-xl shadow-[0_24px_60px_rgba(219,39,119,0.14)]">
        {/* ── Header — glossy fuchsia + stepper ── */}
        <div className="relative overflow-hidden bg-gradient-to-br from-hotpink/15 via-blush/40 to-petal/30 px-5 sm:px-8 pt-6 pb-5">
          <div className="flex items-center gap-3">
            <span className="clay-blob animate-icon-breathe grid h-12 w-12 shrink-0 place-items-center rounded-2xl text-white shadow-md shadow-hotpink/30"><Sparkles className="h-6 w-6" strokeWidth={1.8} /></span>
            <div className="min-w-0 flex-1">
              <h2 className="font-script text-2xl sm:text-3xl text-hotpink leading-none">Build your Bloom world ✿</h2>
              <p className="mt-1 text-[12px] sm:text-[13px] text-rose/70 leading-snug">Let's set it up, step by step — watch Today come alive.</p>
            </div>
            <span className="shrink-0 text-[11px] font-black uppercase tracking-wider text-hotpink/80 hidden sm:block">{doneCount} of {STEPS.length}</span>
          </div>
          <div className="mt-4 flex items-center">
            {STEPS.map((s, i) => (
              <div key={s.key} className="flex flex-1 items-center last:flex-none">
                <span className={["grid h-7 w-7 shrink-0 place-items-center rounded-full text-[11px] font-black transition", s.done ? "bg-gradient-to-br from-hotpink to-magenta text-white shadow-sm shadow-hotpink/40" : "bg-white/90 text-rose/50 border border-petal/60"].join(" ")}>
                  {s.done ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : s.n}
                </span>
                {i < STEPS.length - 1 && <span className={["mx-1 h-[3px] flex-1 rounded-full", s.done ? "bg-hotpink/60" : "bg-white/70"].join(" ")} />}
              </div>
            ))}
          </div>
        </div>

        {/* ── Steps — elegant rows separated by soft dividers ── */}
        <div className="divide-y divide-petal/35 bg-white">
          {STEPS.map((s, i) => {
            const isNext = i === nextIdx;
            const locked = s.sync && !allCore;
            const NodeIcon = s.Icon;
            const ctaCls = (kind: "primary" | "ghost" | "locked") =>
              ["w-full lg:w-auto inline-flex items-center justify-center gap-1.5 rounded-full px-5 py-2.5 text-[13px] font-bold transition active:scale-95",
                kind === "primary" ? "bg-gradient-to-r from-hotpink to-magenta text-white shadow-md shadow-hotpink/25 hover:brightness-105 animate-selected-glow"
                : kind === "ghost" ? "bg-white text-hotpink border border-hotpink/40 hover:bg-blush/50"
                : "bg-petal/40 text-rose/50 cursor-not-allowed"].join(" ");

            const body = (
              <div className={["group flex flex-col gap-4 px-5 sm:px-8 py-5 transition lg:flex-row lg:items-center", isNext ? "bg-blush/25" : "hover:bg-blush/12"].join(" ")}>
                {/* image */}
                <div className="relative h-28 w-full shrink-0 overflow-hidden rounded-2xl bg-blush lg:h-[92px] lg:w-[92px]">
                  <img src={s.image} alt="" className="h-full w-full object-cover" loading="lazy"
                    onError={(e) => { const el = e.currentTarget as HTMLImageElement; if (!el.src.endsWith("/images/meal-buddha.webp")) el.src = "/images/meal-buddha.webp"; }} />
                  {locked && <div className="absolute inset-0 grid place-items-center bg-white/45 backdrop-blur-[1px]"><Lock className="h-6 w-6 text-hotpink/70" strokeWidth={2} /></div>}
                  <span className="absolute left-2.5 top-2.5 grid h-7 w-7 place-items-center rounded-full bg-gradient-to-br from-hotpink to-magenta text-[12px] font-black text-white shadow-md">{s.n}</span>
                </div>

                {/* content */}
                <div className="min-w-0 flex-1 text-left">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="inline-flex items-center gap-1.5 font-script text-xl sm:text-2xl text-hotpink leading-none">{s.title} <span className="text-base">{s.emoji}</span></h3>
                    {isNext && <span className="rounded-full bg-hotpink px-2 py-0.5 text-[8px] font-black uppercase tracking-wider text-white animate-cta-bounce">Start here ✿</span>}
                    {s.done && <span className="inline-flex items-center gap-1 rounded-full bg-hotpink/12 px-2 py-0.5 text-[8px] font-black uppercase tracking-wide text-hotpink"><Check className="h-2.5 w-2.5" strokeWidth={3.5} /> Done</span>}
                  </div>
                  <p className="mt-1 text-[12px] sm:text-[12.5px] text-[#831843] leading-snug">{s.blurb}</p>
                  {s.visual && <div className="mt-2.5 rounded-xl bg-blush/35 border border-petal/40 px-3 py-2 max-w-md">{s.visual}</div>}
                  {s.sync && (
                    <div className="mt-2.5 flex flex-wrap gap-x-3 gap-y-1">
                      {["Cycle", "Meals", "Movement", "Coach"].map((l) => (
                        <span key={l} className="inline-flex items-center gap-1 text-[10.5px] font-bold text-hotpink"><span className="h-1.5 w-1.5 rounded-full bg-hotpink" /> {l}</span>
                      ))}
                    </div>
                  )}
                </div>

                {/* unlocks */}
                <div className="lg:w-[190px] shrink-0">
                  <ul className="grid grid-cols-2 gap-x-2 gap-y-1 lg:grid-cols-1">
                    {s.unlocks.map((u) => (
                      <li key={u} className="flex items-center gap-1.5 text-[11px] font-semibold text-[#831843]">
                        <span className="grid h-3.5 w-3.5 shrink-0 place-items-center rounded-full bg-hotpink/15 text-hotpink"><Check className="h-2 w-2" strokeWidth={4} /></span>
                        <span className="truncate">{u}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* CTA */}
                <div className="lg:w-[172px] shrink-0">
                  {s.sync ? (
                    allCore
                      ? <span className={ctaCls("primary")}><Sparkles className="h-4 w-4" strokeWidth={2.2} /> Activate</span>
                      : <span className={ctaCls("locked")}><Lock className="h-3.5 w-3.5" strokeWidth={2.2} /> Locked</span>
                  ) : (
                    <span className={ctaCls(s.done ? "ghost" : "primary")}>{s.done ? "Review" : "Continue"} <ArrowRight className="h-4 w-4" strokeWidth={2.5} /></span>
                  )}
                </div>
                {!s.sync && <NodeIcon className="hidden" />}
              </div>
            );

            if (s.sync) {
              return allCore
                ? <a key={s.key} href="/app/today" className="block">{body}</a>
                : <div key={s.key}>{body}</div>;
            }
            return <a key={s.key} href={s.href} onClick={() => startGuide()} className="block" data-next-step={isNext ? "1" : undefined}>{body}</a>;
          })}
        </div>
      </div>
    </section>
  );
}
