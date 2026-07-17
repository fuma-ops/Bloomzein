import { useEffect, useState } from "react";
import {
  Sparkles, Check, ArrowRight, Flower2, Target, UtensilsCrossed, Dumbbell,
  Smile, TrendingDown, Activity, Sun, Moon, Coffee,
} from "lucide-react";
import { hasCycleSettings } from "@/components/bloom/cyclePhase";
import { hasMealPlan, hasMovementPlan } from "@/lib/crossToolData";
import { hasDietSetup } from "@/components/bloom/recipes/data";
import { startGuide } from "@/lib/guidedSetup";

/* ============================================================================
   Build your Bloom world — the guided setup on Today, in the full step-card
   design: a progress stepper, then a rich card per real tool (image slot ·
   what it does + a live mini-visual · what it unlocks + a CTA). Each step lights
   up ✓ the moment it's set up for real.

   The left slot is an IMAGE placeholder (soft gradient + the step icon) — drop a
   per-step `image` in the STEPS array when the artwork is ready and it renders
   in place of the placeholder, no other change needed.
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

export function BuildBloomWorld({ moodDone, onLogMood }: { moodDone: boolean; onLogMood: () => void }) {
  // Re-read on tab focus so ✓ states stay honest after setting a tool up.
  const [, force] = useState(0);
  useEffect(() => {
    const onVis = () => { if (document.visibilityState === "visible") force((n) => n + 1); };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  const cycleDone = hasCycleSettings();
  const mealsDone = hasMealPlan();
  const dietDone  = hasDietSetup();
  const moveDone  = hasMovementPlan();
  const goalLine  = readGoalLine();

  type Step = {
    key: string; n: number; title: string; emoji: string; done: boolean;
    href?: string; onClick?: () => void; blurb: string; unlocks: string[];
    Icon: typeof Flower2; image?: string; visual: React.ReactNode;
  };

  const STEPS: Step[] = [
    {
      n: 1, key: "cycle", title: "Set up your cycle", emoji: "🌸", done: cycleDone, href: "/app/tools/cycle", Icon: Flower2,
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
      n: 2, key: "meals", title: "Plan your meals", emoji: "🍽️", done: mealsDone, href: "/app/tools/meals", Icon: UtensilsCrossed,
      blurb: "Get personalized recipes, grocery lists and daily meal plans.",
      unlocks: ["Personalized recipes", "Grocery lists", "Calories & macros", "Meal reminders"],
      visual: (
        <div className="flex items-center gap-2">
          {[{ Icon: Coffee, l: "Breakfast" }, { Icon: Sun, l: "Lunch" }, { Icon: Moon, l: "Dinner" }].map((m) => (
            <div key={m.l} className="flex-1 rounded-lg bg-white/70 border border-petal/50 py-1.5 flex flex-col items-center gap-0.5">
              <m.Icon className="h-4 w-4 text-hotpink" strokeWidth={2} />
              <span className="text-[8px] font-bold uppercase tracking-wide text-rose/50">{m.l}</span>
            </div>
          ))}
        </div>
      ),
    },
    {
      n: 3, key: "diet", title: "Set your goal", emoji: "🎯", done: dietDone, href: "/app/tools/diet", Icon: Target,
      blurb: "Set your goal and let Bloomzein calculate your daily targets.",
      unlocks: ["Weight forecast", "Daily calorie target", "Macro balance", "Progress tracking"],
      visual: (
        <div className="flex items-center justify-between gap-2">
          <svg viewBox="0 0 100 30" className="h-8 w-[60%]" preserveAspectRatio="none">
            <polyline points="2,6 26,12 50,16 74,22 98,26" fill="none" stroke="url(#bbw-goal)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx="98" cy="26" r="3" fill="#DB2777" />
            <defs><linearGradient id="bbw-goal" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#F472B6" /><stop offset="1" stopColor="#DB2777" /></linearGradient></defs>
          </svg>
          {goalLine
            ? <p className="text-right text-[11px] font-black text-hotpink leading-none inline-flex items-center gap-1"><TrendingDown className="h-3 w-3" strokeWidth={2.5} />{Math.abs(goalLine.toGo)} kg to go</p>
            : <p className="text-right text-[11px] font-bold text-hotpink leading-tight">Your daily<br />targets ✿</p>}
        </div>
      ),
    },
    {
      n: 4, key: "move", title: "Plan your movement", emoji: "🧘‍♀️", done: moveDone, href: "/app/tools/workout", Icon: Dumbbell,
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
      n: 5, key: "mood", title: "Log today's mood", emoji: "💗", done: moodDone, onClick: onLogMood, Icon: Smile,
      blurb: "One gentle tap sets the tone — and teaches Bloom how you feel.",
      unlocks: ["Daily mood log", "Cycle-mood insights", "Gentle daily nudges"],
      visual: (
        <div className="flex items-center gap-2">
          {["😌", "😊", "⚡", "💗", "🌙"].map((e, i) => (
            <span key={i} className={["grid h-7 w-7 place-items-center rounded-full text-sm", i === 1 ? "bg-hotpink/15 ring-2 ring-hotpink/30" : "bg-white/70 border border-petal/50"].join(" ")}>{e}</span>
          ))}
        </div>
      ),
    },
  ];

  const doneCount = STEPS.filter((s) => s.done).length;
  if (doneCount === STEPS.length) return null;
  const nextIdx = STEPS.findIndex((s) => !s.done);

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
          const NodeIcon = s.Icon;
          const wrap = ["block overflow-hidden rounded-[1.5rem] border bg-white shadow-[0_8px_24px_rgba(219,39,119,0.07)] transition hover:-translate-y-0.5",
            isNext ? "border-hotpink/60 ring-2 ring-hotpink/40 animate-selected-glow" : "border-petal/55"].join(" ");
          const cta = ["mt-3.5 w-full inline-flex items-center justify-center gap-1.5 rounded-full px-4 py-2.5 text-[13px] font-bold transition active:scale-95",
            s.done ? "bg-white text-hotpink border border-hotpink/40 hover:bg-blush/50"
                   : "bg-gradient-to-r from-hotpink to-magenta text-white shadow-md shadow-hotpink/25 hover:brightness-105 animate-selected-glow"].join(" ");
          const body = (
            <div className="flex flex-col lg:flex-row">
              {/* IMAGE placeholder — swap in per-step artwork later */}
              <div className="relative lg:w-[210px] shrink-0">
                <div className="relative h-32 lg:h-full w-full overflow-hidden grid place-items-center bg-gradient-to-br from-blush via-petal/40 to-blush">
                  {s.image
                    ? <img src={s.image} alt="" className="absolute inset-0 h-full w-full object-cover" loading="lazy" />
                    : <NodeIcon className="h-10 w-10 text-hotpink/45" strokeWidth={1.4} />}
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
                <span className={cta}>{s.done ? <>Review <ArrowRight className="h-4 w-4" strokeWidth={2.5} /></> : <>Continue <ArrowRight className="h-4 w-4" strokeWidth={2.5} /></>}</span>
              </div>
            </div>
          );
          return s.href
            ? <a key={s.key} href={s.href} onClick={() => startGuide()} className={wrap} data-next-step={isNext ? "1" : undefined}>{body}</a>
            : <button key={s.key} onClick={s.onClick} className={`w-full text-left ${wrap}`} data-next-step={isNext ? "1" : undefined}>{body}</button>;
        })}
      </div>
    </section>
  );
}
