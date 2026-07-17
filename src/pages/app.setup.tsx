import { useEffect, useState } from "react";
import {
  Sparkles, Check, ArrowRight, Flower2, Target, UtensilsCrossed, Activity,
  Droplet, Moon, CalendarDays, Heart, Dumbbell, Smile, TrendingDown,
} from "lucide-react";
import { hasCycleSettings } from "@/components/bloom/cyclePhase";
import { hasMealPlan, hasMovementPlan } from "@/lib/crossToolData";
import { hasDietSetup } from "@/components/bloom/recipes/data";
import { startGuide } from "@/lib/guidedSetup";

/* ============================================================================
   Setup — "Build your Bloom world" onboarding. Five steps that mirror the real
   tools (Cycle, Diet goal, Meals, Movement) and the Bloom AI that ties them
   together. Every step shows what it *actually* unlocks, and lights up ✓ the
   moment she's set it up for real, so the page always reflects her real world.
============================================================================ */

function greeting(): string {
  const h = new Date().getHours();
  if (h < 5) return "Good night";
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

// Read her weight + goal from the Diet profile (if she's set them) so the Goal
// card can show a real "X kg to go" instead of a placeholder.
function readGoalLine(): { current: number; target: number; toGo: number } | null {
  try {
    const p = JSON.parse(localStorage.getItem("bloom:diet-profile") || "null");
    const current = Number(p?.weight);
    const target = Number(p?.targetWeight ?? p?.goalWeight);
    if (Number.isFinite(current) && Number.isFinite(target) && target > 0) {
      return { current, target, toGo: Math.round((current - target) * 10) / 10 };
    }
  } catch {}
  return null;
}

const DOW = ["S", "M", "T", "W", "T", "F", "S"];

export default function SetupPage() {
  // Re-read on mount + when she returns to the tab, so ✓ states stay honest.
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const r = () => setTick((t) => t + 1);
    const onVis = () => { if (document.visibilityState === "visible") r(); };
    window.addEventListener("storage", r);
    document.addEventListener("visibilitychange", onVis);
    return () => { window.removeEventListener("storage", r); document.removeEventListener("visibilitychange", onVis); };
  }, []);

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _ = tick;
  const cycleDone = hasCycleSettings();
  const goalDone  = hasDietSetup();
  const mealsDone = hasMealPlan();
  const moveDone  = hasMovementPlan();
  const coreDone  = [cycleDone, goalDone, mealsDone, moveDone].filter(Boolean).length;
  const allCore   = coreDone === 4;
  const completed = coreDone + (allCore ? 1 : 0);
  const goalLine  = readGoalLine();

  const go = (href: string) => () => { startGuide(); window.location.href = href; };

  const STEPS = [
    {
      n: 1, key: "cycle", title: "Your Cycle", emoji: "🌸", done: cycleDone,
      image: "/images/landing-cycle-personalized.webp",
      blurb: "Track your cycle and understand your body better.",
      unlocks: ["Personalized energy", "Mood predictions", "Symptom tracking", "Daily insights"],
      href: "/app/tools/cycle",
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
      n: 2, key: "goal", title: "Your Goal", emoji: "🎯", done: goalDone,
      image: "/images/landing-card-body.webp",
      blurb: "Set your goal and let Bloomzein calculate your daily targets.",
      unlocks: ["Weight forecast", "Daily calorie target", "Macronutrient balance", "Progress tracking"],
      href: "/app/tools/diet",
      visual: (
        <div className="flex items-center justify-between gap-2">
          <svg viewBox="0 0 100 34" className="h-9 w-[62%]" preserveAspectRatio="none">
            <polyline points="2,6 26,12 50,16 74,24 98,28" fill="none" stroke="url(#setup-goal-grad)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx="98" cy="28" r="3" fill="#DB2777" />
            <defs><linearGradient id="setup-goal-grad" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#F472B6" /><stop offset="1" stopColor="#DB2777" /></linearGradient></defs>
          </svg>
          <div className="text-right">
            {goalLine ? (
              <>
                <p className="text-[11px] font-bold text-[#831843] leading-none">Goal: {goalLine.target} kg</p>
                <p className="mt-0.5 inline-flex items-center gap-1 text-[11px] font-black text-hotpink leading-none"><TrendingDown className="h-3 w-3" strokeWidth={2.5} />{Math.abs(goalLine.toGo)} kg to go</p>
              </>
            ) : (
              <p className="text-[11px] font-bold text-hotpink leading-tight">Your daily<br />targets ✿</p>
            )}
          </div>
        </div>
      ),
    },
    {
      n: 3, key: "meals", title: "Your Meals", emoji: "🍽️", done: mealsDone,
      image: "/images/meal-oats.webp",
      blurb: "Get personalized recipes, grocery lists and daily meal plans.",
      unlocks: ["Personalized recipes", "Grocery lists", "Calories & macros", "Meal reminders"],
      href: "/app/tools/meals",
      visual: (
        <div className="flex items-center gap-2">
          {[{ img: "/images/meal-oats.webp", l: "Breakfast" }, { img: "/images/meal-buddha.webp", l: "Lunch" }, { img: "/images/meal-stew.webp", l: "Dinner" }].map((m) => (
            <div key={m.l} className="flex-1">
              <div className="h-10 w-full overflow-hidden rounded-lg bg-blush"><img src={m.img} alt="" className="h-full w-full object-cover" loading="lazy" /></div>
              <p className="mt-1 text-center text-[8.5px] font-bold uppercase tracking-wide text-rose/50">{m.l}</p>
            </div>
          ))}
        </div>
      ),
    },
    {
      n: 4, key: "move", title: "Your Movement", emoji: "🧘‍♀️", done: moveDone,
      image: "/images/yoga-hero.webp",
      blurb: "Build a movement plan that matches your energy and goals.",
      unlocks: ["Workouts & yoga", "Recovery days", "Daily energy boost", "Wellness plan"],
      href: "/app/tools/workout",
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
  ];

  const SYNC_ICONS = [
    { Icon: Flower2, l: "Cycle" }, { Icon: UtensilsCrossed, l: "Meals" }, { Icon: Dumbbell, l: "Movement" }, { Icon: Smile, l: "Mood" },
    { Icon: Droplet, l: "Water" }, { Icon: Moon, l: "Sleep" }, { Icon: CalendarDays, l: "Calendar" }, { Icon: Heart, l: "Coach" },
  ];

  const CARD = "rounded-[1.75rem] border border-petal/55 bg-white shadow-[0_10px_30px_rgba(219,39,119,0.08)] overflow-hidden";

  return (
    <div className="relative mx-auto max-w-3xl">
      {/* ── HERO ── */}
      <section className="relative overflow-hidden rounded-[1.9rem] border border-petal/55 bg-gradient-to-br from-blush/55 via-white to-petal/35 shadow-[0_16px_40px_rgba(219,39,119,0.12)] animate-card-pop-in">
        <img src="/images/coach-bloom-hero.webp" alt="" loading="lazy"
          className="pointer-events-none absolute inset-0 h-full w-full object-cover object-top"
          onError={(e) => { const el = e.currentTarget as HTMLImageElement; if (!el.src.endsWith("/images/hero-girl.webp")) el.src = "/images/hero-girl.webp"; }} />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-white/95 via-white/85 sm:via-white/75 to-white/30 sm:to-transparent" />
        <div className="relative p-5 sm:p-7 max-w-full sm:max-w-[66%]">
          <p className="font-script text-2xl sm:text-3xl text-hotpink leading-none drop-shadow-[0_1px_3px_rgba(255,255,255,0.9)]">{greeting()},</p>
          <h1 className="mt-1 text-xl sm:text-3xl font-black text-[#831843] leading-tight drop-shadow-[0_1px_2px_rgba(255,255,255,0.85)]">
            Welcome to <span className="text-hotpink">Bloomzein</span> <span className="text-lg">🌸</span>
          </h1>
          <p className="mt-1.5 text-[13px] sm:text-sm text-rose/75 leading-snug drop-shadow-[0_1px_2px_rgba(255,255,255,0.8)]">Let's build your Bloom world, step by step.</p>

          {/* progress */}
          <p className="mt-4 text-[11px] font-black uppercase tracking-wider text-hotpink">{completed} of 5 steps completed</p>
          <div className="mt-2 flex items-center">
            {[1, 2, 3, 4, 5].map((n, i) => {
              const stepDone = n <= 4 ? STEPS[n - 1].done : allCore;
              return (
                <div key={n} className="flex items-center">
                  <span className={["grid h-7 w-7 shrink-0 place-items-center rounded-full text-[11px] font-black transition", stepDone ? "bg-gradient-to-br from-hotpink to-magenta text-white shadow-sm shadow-hotpink/40" : "bg-white/85 text-rose/50 border border-petal/60"].join(" ")}>
                    {stepDone ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : n}
                  </span>
                  {i < 4 && <span className={["h-[3px] w-6 sm:w-8", stepDone ? "bg-hotpink/60" : "bg-petal/50"].join(" ")} />}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── STEP CARDS ── */}
      <div className="mt-4 space-y-4">
        {STEPS.map((s, i) => (
          <section key={s.key} className={`${CARD} animate-card-pop-in`} style={{ animationDelay: `${(i + 1) * 60}ms` }}>
            <div className="flex flex-col lg:flex-row">
              {/* image */}
              <div className="relative lg:w-[230px] shrink-0">
                <div className="relative h-36 lg:h-full w-full overflow-hidden bg-blush">
                  <img src={s.image} alt="" className="h-full w-full object-cover" loading="lazy"
                    onError={(e) => { const el = e.currentTarget as HTMLImageElement; if (!el.src.endsWith("/images/meal-buddha.webp")) el.src = "/images/meal-buddha.webp"; }} />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/15 to-transparent lg:bg-gradient-to-r lg:from-transparent lg:to-white/10" />
                </div>
                <span className="absolute left-3 top-3 grid h-8 w-8 place-items-center rounded-full bg-gradient-to-br from-hotpink to-magenta text-white text-[13px] font-black shadow-md">{s.n}</span>
                {s.done && (
                  <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-white/90 px-2 py-1 text-[9px] font-black uppercase tracking-wide text-hotpink shadow-sm">
                    <Check className="h-3 w-3" strokeWidth={3} /> Done
                  </span>
                )}
              </div>

              {/* content */}
              <div className="flex-1 min-w-0 p-4 sm:p-5">
                <h2 className="inline-flex items-center gap-1.5 font-script text-2xl sm:text-[1.7rem] text-hotpink leading-none">{s.title} <span className="text-lg">{s.emoji}</span></h2>
                <p className="mt-1.5 text-[12.5px] sm:text-[13px] text-[#831843] leading-snug">{s.blurb}</p>
                <div className="mt-3 rounded-xl bg-blush/40 border border-petal/50 px-3 py-2">{s.visual}</div>
              </div>

              {/* unlocks + CTA */}
              <div className="lg:w-[220px] shrink-0 border-t lg:border-t-0 lg:border-l border-petal/40 p-4 sm:p-5 bg-blush/20">
                <p className="text-[10px] font-black uppercase tracking-wider text-hotpink/70">What you'll unlock</p>
                <ul className="mt-2 space-y-1.5">
                  {s.unlocks.map((u) => (
                    <li key={u} className="flex items-center gap-1.5 text-[12px] font-semibold text-[#831843]">
                      <span className="grid h-4 w-4 shrink-0 place-items-center rounded-full bg-hotpink/15 text-hotpink"><Check className="h-2.5 w-2.5" strokeWidth={3.5} /></span>
                      {u}
                    </li>
                  ))}
                </ul>
                <button onClick={go(s.href)}
                  className={["mt-3.5 w-full inline-flex items-center justify-center gap-1.5 rounded-full px-4 py-2.5 text-[13px] font-bold transition active:scale-95",
                    s.done ? "bg-white text-hotpink border border-hotpink/40 hover:bg-blush/50" : "bg-gradient-to-r from-hotpink to-magenta text-white shadow-md shadow-hotpink/25 hover:brightness-105 animate-selected-glow"].join(" ")}>
                  {s.done ? <>Review <ArrowRight className="h-4 w-4" strokeWidth={2.5} /></> : <>Continue <ArrowRight className="h-4 w-4" strokeWidth={2.5} /></>}
                </button>
              </div>
            </div>
          </section>
        ))}

        {/* ── STEP 5 — BLOOM AI SYNC ── */}
        <section className={`${CARD} animate-card-pop-in`} style={{ animationDelay: "300ms" }}>
          <div className="relative">
            <img src="/images/landing-orb-flower.webp" alt="" className="pointer-events-none absolute right-0 top-0 h-full w-1/2 object-cover opacity-40" loading="lazy" />
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-white via-white/85 to-transparent" />
            <div className="relative p-5 sm:p-6">
              <div className="flex items-center gap-2.5">
                <span className="grid h-8 w-8 place-items-center rounded-full bg-gradient-to-br from-hotpink to-magenta text-white text-[13px] font-black shadow-md">5</span>
                <h2 className="inline-flex items-center gap-1.5 font-script text-2xl sm:text-[1.8rem] text-hotpink leading-none">Bloom AI Sync <Sparkles className="h-4 w-4" strokeWidth={2} /></h2>
              </div>
              <p className="mt-2 text-[13px] text-[#831843] leading-snug max-w-md">Everything works together to make your journey magical.</p>
              <p className="mt-0.5 text-[11.5px] font-semibold text-hotpink/80 max-w-md">A fully personalized experience powered by Bloom AI.</p>

              {/* icon grid */}
              <div className="mt-4 grid grid-cols-4 gap-2 max-w-md">
                {SYNC_ICONS.map(({ Icon, l }) => (
                  <div key={l} className="flex flex-col items-center gap-1 rounded-xl bg-white/70 border border-petal/50 py-2">
                    <span className="grid h-8 w-8 place-items-center rounded-full bg-blush text-hotpink"><Icon className="h-4 w-4" strokeWidth={1.9} /></span>
                    <span className="text-[8.5px] font-bold uppercase tracking-wide text-rose/55">{l}</span>
                  </div>
                ))}
              </div>

              <button
                onClick={() => { window.location.href = "/app/today"; }}
                disabled={!allCore}
                className={["mt-5 w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-full px-7 py-3 text-sm font-bold transition active:scale-95",
                  allCore ? "bg-gradient-to-r from-hotpink to-magenta text-white shadow-lg shadow-hotpink/30 hover:brightness-105 animate-cta-bounce" : "bg-petal/40 text-rose/50 cursor-not-allowed"].join(" ")}>
                <Sparkles className="h-4 w-4" strokeWidth={2.2} /> {allCore ? "Activate My Bloom World" : `Finish ${4 - coreDone} more step${4 - coreDone === 1 ? "" : "s"} to activate`}
              </button>
            </div>
          </div>
        </section>
      </div>

      <p className="mt-5 mb-2 text-center font-script text-xl text-hotpink/80">Set up your world &amp; watch Today bloom ✿</p>
    </div>
  );
}
