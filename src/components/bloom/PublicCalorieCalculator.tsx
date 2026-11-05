// Public, functional calorie & macro calculator for the /tools/diet-nutrition
// SEO landing page. Real maths — it reuses estimateTargets (the app's ONE BMR
// engine, Mifflin-St Jeor) so a visitor gets exactly what she'd see inside the
// app. Magic first, then a warm CTA to create a free account to continue.
import { useMemo, useState } from "react";
import { Sparkles, Flame, Drumstick, Wheat, Droplet } from "lucide-react";
import { estimateTargets } from "@/lib/nutritionTargets";
import type { DietGoal } from "@/components/bloom/recipes/data";
import type { ToolLang } from "@/lib/toolPagesI18n";
import { PT } from "./publicToolI18n";

// Activity factors (labels come from the language strings).
const ACTIVITY: number[] = [1.2, 1.375, 1.55, 1.725];

const GOALS: DietGoal[] = ["lose", "maintain", "gain"];

export function PublicCalorieCalculator({ lang = "en" }: { lang?: ToolLang }) {
  const T = PT[lang], K = T.cal;
  const [weight, setWeight] = useState(65);
  const [height, setHeight] = useState(165);
  const [age, setAge] = useState(30);
  const [activity, setActivity] = useState(1.375);
  const [goal, setGoal] = useState<DietGoal>("maintain");

  const t = useMemo(
    () => estimateTargets({ weightKg: weight, heightCm: height, age, goal, activity }),
    [weight, height, age, goal, activity],
  );

  return (
    <section className="rounded-[1.75rem] border border-petal/60 bg-white/80 p-5 shadow-[0_18px_50px_-30px_rgba(236,72,153,0.5)] sm:p-7">
      <div className="flex items-center gap-2">
        <span className="grid h-9 w-9 place-items-center rounded-full bg-hotpink/12 text-hotpink"><Flame className="h-5 w-5" strokeWidth={2} /></span>
        <h2 className={lang === "ar" ? "text-xl font-extrabold text-hotpink sm:text-2xl" : "font-script text-2xl text-hotpink sm:text-3xl"}>{K.title}</h2>
      </div>
      <p className="mt-1 text-[13px] text-rose/70">{K.lead}</p>

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <Num label={K.weight} value={weight} min={35} max={200} onChange={setWeight} />
        <Num label={K.height} value={height} min={130} max={210} onChange={setHeight} />
        <Num label={K.age} value={age} min={14} max={90} onChange={setAge} />
      </div>

      <div className="mt-4">
        <span className="text-[11px] font-bold uppercase tracking-wide text-rose/55">{K.activity}</span>
        <div className="mt-1.5 flex flex-wrap gap-2">
          {ACTIVITY.map((f, i) => (
            <button key={f} onClick={() => setActivity(f)}
              className={["rounded-full px-3 py-1.5 text-[12.5px] font-bold transition active:scale-95", activity === f ? "bg-hotpink text-white" : "border border-petal/60 bg-white text-rose/70 hover:border-hotpink/40"].join(" ")}>
              {K.act[i]}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4">
        <span className="text-[11px] font-bold uppercase tracking-wide text-rose/55">{K.goal}</span>
        <div className="mt-1.5 grid grid-cols-3 gap-2">
          {GOALS.map((g, i) => (
            <button key={g} onClick={() => setGoal(g)}
              className={["rounded-2xl border px-3 py-2 text-[13px] font-bold transition active:scale-95", goal === g ? "border-hotpink bg-hotpink/5 text-hotpink" : "border-petal/60 bg-white text-rose/70"].join(" ")}>
              {K.goals[i]}
            </button>
          ))}
        </div>
      </div>

      {/* result */}
      <div className="mt-5 animate-fade-in rounded-[1.5rem] bg-gradient-to-br from-hotpink/12 to-petal/10 p-5 text-center">
        <p className="text-[11px] font-bold uppercase tracking-wide text-rose/55">{K.daily}</p>
        <p className="font-script text-5xl leading-none text-hotpink">{t.calories}<span className="text-xl"> kcal</span></p>
        <p className="mt-1 text-[12px] text-rose/60">{K.bmr(t.bmr, t.tdee)}</p>
        <div className="mt-4 grid grid-cols-3 gap-3">
          <Macro Icon={Drumstick} label={K.protein} value={`${t.protein}g`} />
          <Macro Icon={Wheat} label={K.carbs} value={`${t.carbs}g`} />
          <Macro Icon={Droplet} label={K.fat} value={`${t.fat}g`} />
        </div>
      </div>

      {/* convert */}
      <div className="mt-4 rounded-2xl bg-gradient-to-br from-hotpink to-[#db2777] p-5 text-center text-white">
        <p className={lang === "ar" ? "text-xl font-extrabold" : "font-script text-2xl"}>{K.ctaTitle}</p>
        <p className="mx-auto mt-1 max-w-sm text-[13px] text-white/90">{K.ctaText}</p>
        <a href="/onboarding" className="mt-3 inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-[15px] font-bold text-hotpink transition hover:bg-white/90">
          <Sparkles className="h-4 w-4" /> {T.createFree}
        </a>
      </div>
    </section>
  );
}

function Num({ label, value, min, max, onChange }: { label: string; value: number; min: number; max: number; onChange: (n: number) => void }) {
  return (
    <label className="block">
      <span className="text-[11px] font-bold uppercase tracking-wide text-rose/55">{label}</span>
      <input type="number" min={min} max={max} value={value} onChange={(e) => onChange(Math.min(max, Math.max(min, +e.target.value)))}
        className="mt-1 w-full rounded-2xl border border-petal/60 bg-white px-3 py-2.5 text-[14px] font-semibold text-[#831843] outline-none focus:border-hotpink" />
    </label>
  );
}

function Macro({ Icon, label, value }: { Icon: typeof Flame; label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-petal/50 bg-white/75 p-3">
      <Icon className="mx-auto h-4 w-4 text-hotpink" strokeWidth={2.2} />
      <p className="mt-1 text-[15px] font-extrabold text-[#831843]">{value}</p>
      <p className="text-[10px] font-bold uppercase tracking-wide text-rose/55">{label}</p>
    </div>
  );
}
