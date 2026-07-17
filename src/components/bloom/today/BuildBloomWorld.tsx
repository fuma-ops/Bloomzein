import { Sparkles, Check, ArrowRight, Flower2, Target, UtensilsCrossed, Dumbbell, Smile } from "lucide-react";
import { hasCycleSettings } from "@/components/bloom/cyclePhase";
import { hasMealPlan, hasMovementPlan } from "@/lib/crossToolData";
import { hasDietSetup } from "@/components/bloom/recipes/data";
import { startGuide } from "@/lib/guidedSetup";

/* ============================================================================
   Build your Bloom world — the guided setup, shown on Today until every tool
   is set up. Each step is a rich card that mirrors the real tool and lists what
   it *actually* unlocks, lighting up ✓ the moment it's set up for real.

   The left slot of each card is an IMAGE placeholder (soft gradient + the step
   icon) — drop a per-step `image` in below when the artwork is ready and it
   renders in place of the placeholder, no other change needed.
============================================================================ */

type Step = {
  key: string; n: number; title: string; emoji: string; done: boolean;
  href?: string; onClick?: () => void; blurb: string; unlocks: string[];
  Icon: typeof Flower2; image?: string;
};

export function BuildBloomWorld({ moodDone, onLogMood }: { moodDone: boolean; onLogMood: () => void }) {
  const steps: Step[] = [
    { key: "cycle", n: 1, title: "Set up your cycle", emoji: "🌸", done: hasCycleSettings(), href: "/app/tools/cycle",
      blurb: "Unlocks your real phase everywhere.", Icon: Flower2,
      unlocks: ["Personalized energy", "Mood predictions", "Symptom tracking", "Daily insights"] },
    { key: "meals", n: 2, title: "Plan your meals", emoji: "🍽️", done: hasMealPlan(), href: "/app/tools/meals",
      blurb: "Fills Today's Plan & your energy.", Icon: UtensilsCrossed,
      unlocks: ["Personalized recipes", "Grocery lists", "Calories & macros", "Meal reminders"] },
    { key: "diet", n: 3, title: "Set your goal", emoji: "🎯", done: hasDietSetup(), href: "/app/tools/diet",
      blurb: "Tunes your energy & meals to you.", Icon: Target,
      unlocks: ["Weight forecast", "Daily calorie target", "Macro balance", "Progress tracking"] },
    { key: "move", n: 4, title: "Plan your movement", emoji: "🧘‍♀️", done: hasMovementPlan(), href: "/app/tools/workout",
      blurb: "Yoga & workouts matched to you.", Icon: Dumbbell,
      unlocks: ["Workouts & yoga", "Recovery days", "Daily energy boost", "Wellness plan"] },
    { key: "mood", n: 5, title: "Log today's mood", emoji: "💗", done: moodDone, onClick: onLogMood,
      blurb: "One gentle tap sets the tone for your day.", Icon: Smile,
      unlocks: ["Daily mood log", "Cycle-mood insights", "Gentle nudges"] },
  ];

  const doneCount = steps.filter((s) => s.done).length;
  if (doneCount === steps.length) return null;
  const nextIdx = steps.findIndex((s) => !s.done);

  const ctaCls = (done: boolean) =>
    ["w-full inline-flex items-center justify-center gap-1.5 rounded-full px-4 py-2 text-[12.5px] font-bold transition active:scale-95",
      done ? "bg-white text-hotpink border border-hotpink/40 hover:bg-blush/50"
           : "bg-gradient-to-r from-hotpink to-magenta text-white shadow-md shadow-hotpink/25 hover:brightness-105 animate-selected-glow"].join(" ");

  return (
    <section className="mt-4 sm:mt-6 animate-card-pop-in" style={{ animationDelay: "30ms" }}>
      <div className="overflow-hidden rounded-[1.75rem] border border-petal/55 bg-white shadow-[0_12px_34px_rgba(219,39,119,0.10)]">
        {/* header */}
        <div className="flex items-center gap-3 border-b border-petal/40 bg-blush/25 p-4 sm:p-5">
          <span className="clay-blob animate-icon-breathe grid h-11 w-11 shrink-0 place-items-center rounded-full text-white"><Sparkles className="h-5 w-5" strokeWidth={1.8} /></span>
          <div className="min-w-0 flex-1">
            <p className="font-script text-xl sm:text-2xl text-hotpink leading-tight">Build your Bloom world ✿</p>
            <p className="text-[11px] sm:text-sm text-rose/70 leading-snug">Watch Today come alive as you set each one up.</p>
          </div>
          <span className="shrink-0 font-script text-2xl sm:text-3xl text-hotpink leading-none">{doneCount}/{steps.length}</span>
        </div>

        {/* step cards */}
        <div className="space-y-3 p-3 sm:p-4">
          {steps.map((s, i) => {
            const isNext = i === nextIdx;
            const NodeIcon = s.Icon;
            const inner = (
              <div className="flex flex-col sm:flex-row">
                {/* IMAGE placeholder — swap in per-step artwork later */}
                <div className="relative h-24 sm:h-auto sm:w-[150px] shrink-0 grid place-items-center overflow-hidden bg-gradient-to-br from-blush via-petal/40 to-blush">
                  {s.image
                    ? <img src={s.image} alt="" className="absolute inset-0 h-full w-full object-cover" loading="lazy" />
                    : <NodeIcon className="h-9 w-9 text-hotpink/45" strokeWidth={1.5} />}
                  <span className="absolute left-2.5 top-2.5 grid h-7 w-7 place-items-center rounded-full bg-gradient-to-br from-hotpink to-magenta text-[12px] font-black text-white shadow-md">{s.n}</span>
                  {s.done && (
                    <span className="absolute right-2.5 top-2.5 inline-flex items-center gap-1 rounded-full bg-white/90 px-2 py-0.5 text-[9px] font-black uppercase tracking-wide text-hotpink shadow-sm">
                      <Check className="h-3 w-3" strokeWidth={3} /> Done
                    </span>
                  )}
                </div>

                {/* content */}
                <div className="min-w-0 flex-1 bg-white p-3.5 text-left">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="inline-flex items-center gap-1.5 font-script text-xl text-hotpink leading-none">{s.title} <span className="text-base">{s.emoji}</span></h3>
                    {isNext && <span className="rounded-full bg-hotpink px-2 py-0.5 text-[8px] font-black uppercase tracking-wider text-white animate-cta-bounce">Start here ✿</span>}
                  </div>
                  <p className="mt-1 text-[12px] leading-snug text-[#831843]">{s.blurb}</p>
                  <ul className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
                    {s.unlocks.map((u) => (
                      <li key={u} className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose/70">
                        <span className="grid h-3.5 w-3.5 shrink-0 place-items-center rounded-full bg-hotpink/15 text-hotpink"><Check className="h-2 w-2" strokeWidth={4} /></span>{u}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* CTA */}
                <div className="flex shrink-0 items-center border-t border-petal/40 bg-blush/15 p-3.5 sm:w-[160px] sm:border-l sm:border-t-0">
                  <span className={ctaCls(s.done)}>{s.done ? "Review" : "Continue"} <ArrowRight className="h-4 w-4" strokeWidth={2.5} /></span>
                </div>
              </div>
            );
            const wrap = ["block overflow-hidden rounded-2xl border transition hover:-translate-y-0.5 active:scale-[0.995]",
              isNext ? "border-hotpink/60 ring-2 ring-hotpink/40 animate-selected-glow" : "border-petal/50"].join(" ");
            return s.href
              ? <a key={s.key} href={s.href} onClick={() => startGuide()} className={wrap} data-next-step={isNext ? "1" : undefined}>{inner}</a>
              : <button key={s.key} onClick={s.onClick} className={`w-full text-left ${wrap}`} data-next-step={isNext ? "1" : undefined}>{inner}</button>;
          })}
        </div>
      </div>
    </section>
  );
}
