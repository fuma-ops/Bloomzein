import { useEffect, useState } from "react";
import {
  Sparkles, Check, ArrowRight, Flower2, Target, UtensilsCrossed, Dumbbell,
  TrendingDown, Activity, Moon, Droplet, Smile, CalendarDays, Heart, Lock,
} from "lucide-react";
import { hasCycleSettings } from "@/components/bloom/cyclePhase";
import { hasMealPlan, hasMovementPlan } from "@/lib/crossToolData";
import { hasDietSetup } from "@/components/bloom/recipes/data";
import { startGuide } from "@/lib/guidedSetup";

/* ============================================================================
   Build your Bloom world — the guided setup on Today, in the full step-card
   design: a progress stepper, five rich cards (branded image · what it does + a
   live mini-visual · what it unlocks + a CTA), then the "Magic Bloom" result —
   the connected ecosystem where every tool talks to the others through Bloom AI.
   Every accent stays on the pink brand palette (hotpink / magenta / rose).
============================================================================ */

const DOW = ["S", "M", "T", "W", "T", "F", "S"];

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

// A realistic, gently-descending weight-forecast curve (not random) — steady
// loss with small plateaus, easing toward the goal line.
function GoalGraph() {
  const pts = "4,7 20,10 36,11 52,15 68,17 84,21 100,24 116,26";
  const dots = [[4, 7], [36, 11], [68, 17], [100, 24], [116, 26]];
  return (
    <svg viewBox="0 0 120 34" className="h-9 w-full" preserveAspectRatio="none">
      <defs>
        <linearGradient id="bbw-goal-fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#F472B6" stopOpacity="0.35" /><stop offset="1" stopColor="#F472B6" stopOpacity="0" /></linearGradient>
        <linearGradient id="bbw-goal-line" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#F472B6" /><stop offset="1" stopColor="#DB2777" /></linearGradient>
      </defs>
      <line x1="0" y1="28" x2="120" y2="28" stroke="#DB2777" strokeWidth="0.7" strokeDasharray="3 3" opacity="0.45" />
      <path d={`M${pts.split(" ").join(" L")} L116,34 L4,34 Z`} fill="url(#bbw-goal-fill)" />
      <polyline points={pts} fill="none" stroke="url(#bbw-goal-line)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      {dots.map(([x, y], i) => <circle key={i} cx={x} cy={y} r={i === dots.length - 1 ? 2.6 : 1.8} fill="#DB2777" stroke="#fff" strokeWidth="0.8" />)}
    </svg>
  );
}

const SYNC_ICONS = [
  { Icon: Flower2, l: "Cycle" }, { Icon: UtensilsCrossed, l: "Meals" }, { Icon: Dumbbell, l: "Movement" }, { Icon: Smile, l: "Mood" },
  { Icon: Droplet, l: "Water" }, { Icon: Moon, l: "Sleep" }, { Icon: CalendarDays, l: "Calendar" }, { Icon: Heart, l: "Coach" },
];

// Radial hub — the tools that talk to each other around Bloom AI.
const HUB_NODES: { Icon: typeof Flower2; l: string; x: number; y: number }[] = [
  { Icon: Flower2, l: "Cycle", x: 50, y: 12.7 },
  { Icon: Target, l: "Goal", x: 82.3, y: 31.3 },
  { Icon: UtensilsCrossed, l: "Meals", x: 82.3, y: 68.7 },
  { Icon: Dumbbell, l: "Move", x: 50, y: 87.3 },
  { Icon: Droplet, l: "Water", x: 17.7, y: 68.7 },
  { Icon: Heart, l: "Coach", x: 17.7, y: 31.3 },
];

export function BuildBloomWorld({ moodDone, onLogMood }: { moodDone: boolean; onLogMood: () => void }) {
  // Re-read on tab focus so ✓ states stay honest after setting a tool up.
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
      visual: (
        <div className="flex items-center gap-2.5">
          <div className="flex-1 min-w-0"><GoalGraph /></div>
          {goalLine
            ? <p className="shrink-0 text-right text-[11px] font-black text-hotpink leading-none inline-flex items-center gap-1"><TrendingDown className="h-3 w-3" strokeWidth={2.5} />{Math.abs(goalLine.toGo)} kg to go</p>
            : <p className="shrink-0 text-right text-[10px] font-bold text-hotpink leading-tight">Your daily<br />targets ✿</p>}
        </div>
      ),
    },
    {
      n: 3, key: "meals", title: "Plan your meals", emoji: "🍽️", done: mealsDone, href: "/app/tools/meals", Icon: UtensilsCrossed,
      image: "/images/setup-meals.webp",
      blurb: "Get personalized recipes, grocery lists and daily meal plans.",
      unlocks: ["Personalized recipes", "Grocery lists", "Calories & macros", "Meal reminders"],
      visual: (
        <div className="flex items-center gap-2">
          {[{ img: "/images/meal-oats.webp", l: "Breakfast" }, { img: "/images/meal-buddha.webp", l: "Lunch" }, { img: "/images/meal-stew.webp", l: "Dinner" }].map((m) => (
            <div key={m.l} className="flex-1">
              <div className="h-11 w-full overflow-hidden rounded-lg bg-blush ring-1 ring-petal/50">
                <img src={m.img} alt="" className="h-full w-full object-cover" loading="lazy"
                  onError={(e) => { const el = e.currentTarget as HTMLImageElement; if (!el.src.endsWith("/images/meal-buddha.webp")) el.src = "/images/meal-buddha.webp"; }} />
              </div>
              <span className="mt-0.5 block text-center text-[8px] font-bold uppercase tracking-wide text-rose/55">{m.l}</span>
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
      blurb: "Everything works together to make your journey magical — powered by Bloom AI.",
      unlocks: ["Cycle-synced plan", "Smart daily Today", "Personalized coaching", "One magical routine"],
      visual: (
        <div className="grid grid-cols-4 gap-1.5">
          {SYNC_ICONS.map(({ Icon, l }) => (
            <div key={l} className="flex flex-col items-center gap-0.5">
              <span className="grid h-6 w-6 place-items-center rounded-full bg-white/70 border border-petal/50 text-hotpink"><Icon className="h-3 w-3" strokeWidth={2} /></span>
              <span className="text-[7px] font-bold uppercase tracking-wide text-rose/45">{l}</span>
            </div>
          ))}
        </div>
      ),
    },
  ];

  const doneCount = STEPS.filter((s) => s.done).length;
  if (doneCount === STEPS.length) return null;
  const nextIdx = STEPS.findIndex((s) => !s.done && !s.sync);

  return (
    <section className="mt-4 sm:mt-6 animate-card-pop-in" style={{ animationDelay: "30ms" }}>
      {/* ── Header with progress stepper ── */}
      <div className="rounded-[1.75rem] border border-petal/55 bg-gradient-to-br from-blush/45 via-white to-petal/30 shadow-[0_10px_30px_rgba(219,39,119,0.08)] p-4 sm:p-5">
        <div className="flex items-center gap-3">
          <span className="clay-blob animate-icon-breathe grid h-11 w-11 shrink-0 place-items-center rounded-full text-white"><Sparkles className="h-5 w-5" strokeWidth={1.8} /></span>
          <div className="min-w-0 flex-1">
            <p className="font-script text-xl sm:text-2xl text-hotpink leading-tight">Build your Bloom world ✿</p>
            <p className="text-[11px] sm:text-sm text-rose/70 leading-snug">Let's set it up, step by step — watch Today come alive.</p>
          </div>
        </div>
        <p className="mt-3 text-[11px] font-black uppercase tracking-wider text-hotpink">{doneCount} of {STEPS.length} steps completed</p>
        <div className="mt-2 flex items-center">
          {STEPS.map((s, i) => (
            <div key={s.key} className="flex items-center">
              <span className={["grid h-7 w-7 shrink-0 place-items-center rounded-full text-[11px] font-black transition", s.done ? "bg-gradient-to-br from-hotpink to-magenta text-white shadow-sm shadow-hotpink/40" : "bg-white/85 text-rose/50 border border-petal/60"].join(" ")}>
                {s.done ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : s.n}
              </span>
              {i < STEPS.length - 1 && <span className={["h-[3px] w-5 sm:w-8", s.done ? "bg-hotpink/60" : "bg-petal/50"].join(" ")} />}
            </div>
          ))}
        </div>
      </div>

      {/* ── Step cards ── */}
      <div className="mt-3 space-y-3">
        {STEPS.map((s, i) => {
          const isNext = i === nextIdx;
          const locked = s.sync && !allCore;
          const wrap = ["block overflow-hidden rounded-[1.5rem] border bg-white shadow-[0_8px_24px_rgba(219,39,119,0.07)] transition hover:-translate-y-0.5",
            isNext ? "border-hotpink/60 ring-2 ring-hotpink/40 animate-selected-glow" : s.sync && allCore ? "border-hotpink/50" : "border-petal/55"].join(" ");
          const ctaCls = (kind: "primary" | "ghost" | "locked") =>
            ["mt-3.5 w-full inline-flex items-center justify-center gap-1.5 rounded-full px-4 py-2.5 text-[13px] font-bold transition active:scale-95",
              kind === "primary" ? "bg-gradient-to-r from-hotpink to-magenta text-white shadow-md shadow-hotpink/25 hover:brightness-105 animate-selected-glow"
              : kind === "ghost" ? "bg-white text-hotpink border border-hotpink/40 hover:bg-blush/50"
              : "bg-petal/40 text-rose/50 cursor-not-allowed"].join(" ");

          const body = (
            <div className="flex flex-col lg:flex-row">
              {/* branded image */}
              <div className="relative lg:w-[210px] shrink-0">
                <div className="relative h-32 lg:h-full w-full overflow-hidden bg-blush">
                  <img src={s.image} alt="" className="h-full w-full object-cover" loading="lazy"
                    onError={(e) => { const el = e.currentTarget as HTMLImageElement; if (!el.src.endsWith("/images/meal-buddha.webp")) el.src = "/images/meal-buddha.webp"; }} />
                  {locked && <div className="absolute inset-0 grid place-items-center bg-white/45 backdrop-blur-[1px]"><Lock className="h-6 w-6 text-hotpink/70" strokeWidth={2} /></div>}
                </div>
                <span className="absolute left-3 top-3 grid h-8 w-8 place-items-center rounded-full bg-gradient-to-br from-hotpink to-magenta text-[13px] font-black text-white shadow-md">{s.n}</span>
                {s.done && (
                  <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-white/90 px-2 py-1 text-[9px] font-black uppercase tracking-wide text-hotpink shadow-sm">
                    <Check className="h-3 w-3" strokeWidth={3} /> Done
                  </span>
                )}
              </div>

              {/* content + mini-visual */}
              <div className="flex-1 min-w-0 p-4 sm:p-5 text-left">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="inline-flex items-center gap-1.5 font-script text-2xl sm:text-[1.7rem] text-hotpink leading-none">{s.title} <span className="text-lg">{s.emoji}</span></h3>
                  {isNext && <span className="rounded-full bg-hotpink px-2 py-0.5 text-[8px] font-black uppercase tracking-wider text-white animate-cta-bounce">Start here ✿</span>}
                </div>
                <p className="mt-1.5 text-[12.5px] sm:text-[13px] text-[#831843] leading-snug">{s.blurb}</p>
                <div className="mt-3 rounded-xl bg-blush/40 border border-petal/50 px-3 py-2">{s.visual}</div>
              </div>

              {/* what you'll unlock + CTA */}
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
                {s.sync ? (
                  allCore
                    ? <a href="/app/today" className={ctaCls("primary")}><Sparkles className="h-4 w-4" strokeWidth={2.2} /> Activate My Bloom World</a>
                    : <span className={ctaCls("locked")}><Lock className="h-3.5 w-3.5" strokeWidth={2.2} /> Finish the steps above</span>
                ) : (
                  <span className={ctaCls(s.done ? "ghost" : "primary")}>{s.done ? "Review" : "Continue"} <ArrowRight className="h-4 w-4" strokeWidth={2.5} /></span>
                )}
              </div>
            </div>
          );

          if (s.sync) return <div key={s.key} className={wrap}>{body}</div>;
          return <a key={s.key} href={s.href} onClick={() => startGuide()} className={wrap} data-next-step={isNext ? "1" : undefined}>{body}</a>;
        })}
      </div>

      {/* ── MAGIC BLOOM — the result: how every tool talks through Bloom AI ── */}
      <div className="mt-3 relative overflow-hidden rounded-[1.75rem] border border-hotpink/30 bg-gradient-to-br from-blush/55 via-white to-petal/40 shadow-[0_14px_36px_rgba(219,39,119,0.12)] p-4 sm:p-6">
        <div className="text-center">
          <h3 className="inline-flex items-center gap-1.5 font-script text-2xl sm:text-3xl text-hotpink leading-none">Magic Bloom <Sparkles className="h-5 w-5" strokeWidth={2} /></h3>
          <p className="mt-1.5 text-[12.5px] sm:text-[13px] text-[#831843] leading-snug max-w-md mx-auto">This is the magic: your tools don't work alone — they talk to each other through <span className="font-bold text-hotpink">Bloom AI</span>, into one connected, living routine.</p>
        </div>

        {/* radial hub */}
        <div className="relative mx-auto mt-3 h-[290px] w-[290px] max-w-full">
          <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden>
            {HUB_NODES.map((n, i) => (
              <line key={i} x1="50" y1="50" x2={n.x} y2={n.y} stroke="#EC4899" strokeWidth="0.5" strokeDasharray="2 2" opacity="0.5" />
            ))}
          </svg>
          {/* nodes */}
          {HUB_NODES.map((n) => (
            <div key={n.l} className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-0.5" style={{ left: `${n.x}%`, top: `${n.y}%` }}>
              <span className="grid h-11 w-11 place-items-center rounded-full bg-white border border-petal/60 text-hotpink shadow-sm"><n.Icon className="h-5 w-5" strokeWidth={1.9} /></span>
              <span className="text-[8.5px] font-bold uppercase tracking-wide text-rose/55">{n.l}</span>
            </div>
          ))}
          {/* centre — Bloom AI */}
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center">
            <span className="relative grid h-[86px] w-[86px] place-items-center rounded-full overflow-hidden shadow-lg shadow-hotpink/30 ring-2 ring-white animate-selected-glow">
              <img src="/images/setup-ai.webp" alt="" className="absolute inset-0 h-full w-full object-cover" loading="lazy" />
              <span className="absolute inset-0 bg-hotpink/25" />
              <Sparkles className="relative h-6 w-6 text-white drop-shadow" strokeWidth={2.2} />
            </span>
            <span className="mt-1 rounded-full bg-white/90 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wide text-hotpink shadow-sm">Bloom AI</span>
          </div>
        </div>

        {/* how they talk */}
        <div className="mt-3 grid gap-2 sm:grid-cols-3">
          {[
            { Icon: Flower2, t: "Your cycle leads", d: "Your phase tunes your meals, energy targets & movement." },
            { Icon: Dumbbell, t: "Movement feeds back", d: "Workouts raise your food targets and shape recovery days." },
            { Icon: Heart, t: "Coach ties it together", d: "Bloom AI reads it all to guide your Today, gently." },
          ].map((c) => (
            <div key={c.t} className="rounded-2xl bg-white/70 border border-petal/50 p-3">
              <span className="grid h-8 w-8 place-items-center rounded-full bg-blush text-hotpink"><c.Icon className="h-4 w-4" strokeWidth={2} /></span>
              <p className="mt-1.5 text-[12px] font-black text-hotpink leading-tight">{c.t}</p>
              <p className="mt-0.5 text-[11px] text-[#831843] leading-snug">{c.d}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
