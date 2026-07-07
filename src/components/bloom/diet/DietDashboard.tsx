/**
 * Diet dashboard — the daily "command center" cards. Every number is gathered
 * live from the other tools (cycle phase, workout & yoga burn, logged meals,
 * body & goal) through the shared nutritionTargets engine, so Diet, Today and
 * Meals always agree.
 */
import { useState, useEffect } from "react";
import {
  Flame, Utensils, TrendingDown, TrendingUp, Target, Dumbbell,
  Sparkles, ChevronRight, Activity, Trophy, Pencil, Check, X,
} from "lucide-react";
import {
  energyBalance, goalProjection, weekSnapshot, coachRecommendation,
  computeTargets, movementFoodLine,
  type EnergyBalance,
} from "@/lib/nutritionTargets";

const go = (href: string) => () => { window.location.href = href; };

/* ---------- tiny progress ring ---------- */
function Ring({ pct, size = 116, stroke = 11, children }: { pct: number; size?: number; stroke?: number; children?: React.ReactNode }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const off = c * (1 - Math.max(0, Math.min(1, pct / 100)));
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(244,180,214,0.45)" strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="url(#ring-grad)" strokeWidth={stroke} strokeLinecap="round" strokeDasharray={c} strokeDashoffset={off} className="transition-all duration-700" />
        <defs><linearGradient id="ring-grad" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#EC4899" /><stop offset="1" stopColor="#DB2777" /></linearGradient></defs>
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">{children}</div>
    </div>
  );
}

function MacroBar({ label, eaten, target, cls }: { label: string; eaten: number; target: number; cls: string }) {
  const pct = target > 0 ? Math.min(100, Math.round((eaten / target) * 100)) : 0;
  return (
    <div>
      <div className="flex items-center justify-between text-[10px] font-bold mb-0.5">
        <span className="uppercase tracking-wide text-rose/50">{label}</span>
        <span className="tabular-nums text-rose/70">{eaten}<span className="text-rose/35">/{target}g</span></span>
      </div>
      <div className="h-1.5 rounded-full bg-petal/40 overflow-hidden"><div className={`h-full rounded-full ${cls} transition-all`} style={{ width: `${pct}%` }} /></div>
    </div>
  );
}

/* ============================ 1 · TODAY'S ENERGY ============================ */
export function EnergyTodayCard({ e, mealsPlanned, movementPlanned, onPlanMeals, onPlanMovement, onUnplanMeals, onUnplanMovement, onViewTodayPlan }: {
  e: EnergyBalance;
  mealsPlanned: boolean;
  movementPlanned: boolean;
  onPlanMeals: () => void;
  onPlanMovement: () => void;
  onUnplanMeals?: () => void;
  onUnplanMovement?: () => void;
  onViewTodayPlan: () => void;
}) {
  const eatenPct = e.allowance > 0 ? (e.eaten / e.allowance) * 100 : 0;
  const moveLine = movementFoodLine(computeTargets(true));
  const coach = coachRecommendation();
  const proj = goalProjection();
  const hasEta = !!proj && proj.etaWeeks != null; // only tease the timeline if a goal weight is set

  // Transient "✓ Planned!" flash after an implicit plan is built (same line).
  const [flash, setFlash] = useState<null | "meals" | "movement">(null);
  useEffect(() => { if (!flash) return; const t = setTimeout(() => setFlash(null), 2600); return () => clearTimeout(t); }, [flash]);
  const planMeals = () => { onPlanMeals(); setFlash("meals"); };
  const planMovement = () => { onPlanMovement(); setFlash("movement"); };

  // "Recalculated ✓" flash — the calorie target changed since she last saw it
  // (she edited a workout/yoga plan, so the activity factor shifted).
  const [recalcFlash, setRecalcFlash] = useState(false);
  useEffect(() => {
    try {
      const cur = String(e.goal);
      const prev = localStorage.getItem("bloom:diet-last-goal");
      localStorage.setItem("bloom:diet-last-goal", cur);
      if (prev != null && prev !== cur) {
        setRecalcFlash(true);
        const t = setTimeout(() => setRecalcFlash(false), 4000);
        return () => clearTimeout(t);
      }
    } catch {}
  }, [e.goal]);
  const verdictText =
    e.verdict === "over" ? "Your plan runs a little over target — swap a lighter dinner"
    : e.verdict === "close" ? "Your plan hits your target beautifully ✿"
    : "Your plan is on target ✿";
  const verdictCls = e.verdict === "over" ? "text-rose-500" : "text-emerald-600";

  return (
    <div className="rounded-3xl bg-white/80 border border-petal/60 shadow-sm p-4 sm:p-5 animate-fade-in">
      <div className="mb-3 flex items-start justify-between gap-2">
        <div>
          <p className="font-script text-2xl text-hotpink leading-none">Today's energy</p>
          <p className="text-[10px] font-bold uppercase tracking-widest text-rose/45 mt-1">
            personalised to your {coach.goal === "lose" ? "lean" : coach.goal === "gain" ? "build" : "maintain"} goal
          </p>
        </div>
        {recalcFlash && (
          <span className="shrink-0 inline-flex items-center gap-1 rounded-full bg-emerald-500 text-white px-2.5 py-1 text-[10px] font-black animate-fade-in">
            <Check className="h-3 w-3" strokeWidth={3} /> Recalculated
          </span>
        )}
      </div>
      <div className="flex items-center gap-4">
        <Ring pct={eatenPct}>
          <div>
            <p className="text-2xl sm:text-[26px] font-black leading-none text-hotpink tabular-nums">{Math.max(0, e.remaining).toLocaleString()}</p>
            <p className="text-[8px] font-bold uppercase tracking-widest text-rose/45 mt-0.5">kcal left</p>
          </div>
        </Ring>
        <div className="flex-1 min-w-0 space-y-2">
          <div className="grid grid-cols-3 gap-1.5 text-center">
            <div className="rounded-xl bg-blush/60 py-1.5"><p className="text-sm font-black text-rose tabular-nums leading-none">{e.goal.toLocaleString()}</p><p className="text-[8px] font-bold uppercase tracking-wide text-rose/45 mt-0.5">Goal</p></div>
            <div className="rounded-xl bg-emerald-50 py-1.5"><p className="text-sm font-black text-emerald-600 tabular-nums leading-none">+{e.burned}</p><p className="text-[8px] font-bold uppercase tracking-wide text-rose/45 mt-0.5">Burned</p></div>
            <div className="rounded-xl bg-amber-50 py-1.5"><p className="text-sm font-black text-amber-600 tabular-nums leading-none">{e.eaten.toLocaleString()}</p><p className="text-[8px] font-bold uppercase tracking-wide text-rose/45 mt-0.5">Planned</p></div>
          </div>
          <MacroBar label="Protein" eaten={e.protein.eaten} target={e.protein.target} cls="bg-amber-400" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2 mt-2.5">
        <MacroBar label="Carbs" eaten={e.carbs.eaten} target={e.carbs.target} cls="bg-rose-400" />
        <MacroBar label="Fat" eaten={e.fat.eaten} target={e.fat.target} cls="bg-violet-400" />
      </div>
      {/* Only once meals are planned: the friendly 'kcal left' line */}
      {mealsPlanned && (
        <p className="mt-2 flex items-center gap-1.5 text-[11px] leading-snug text-rose/70">
          <Sparkles className="h-3.5 w-3.5 shrink-0 text-hotpink" strokeWidth={2} />
          <span><b className="text-hotpink">{Math.max(0, e.remaining).toLocaleString()} kcal</b> left from today's planned meals.</span>
        </p>
      )}
      {/* Coach in one line — the calorie target. Movement guidance lives in the
          'Plan my movement' CTA, so we don't state a workout/yoga count here. */}
      <p className="mt-2.5 flex items-start gap-1.5 text-[11.5px] leading-snug text-rose/80">
        <Sparkles className="h-3.5 w-3.5 shrink-0 mt-0.5 text-hotpink" strokeWidth={2} />
        <span>{hasEta && <b className="text-hotpink">{coach.headline}. </b>}Aim for ~{coach.targetCalories.toLocaleString()} kcal a day.</span>
      </p>
      {/* Movement → food: shows the yoga/workout plan's effect on the target */}
      {moveLine && (
        <p className="mt-1.5 flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200/70 px-2.5 py-1 text-[10.5px] font-bold text-emerald-700 w-fit">
          <Dumbbell className="h-3 w-3 shrink-0" /> {moveLine}
        </p>
      )}
      {/* Two guided setup steps — soft app rows; check off once each plan exists */}
      <div className="mt-3 grid gap-2">
        <SetupCta done={mealsPlanned} flashed={flash === "meals"} Icon={Utensils} todo="Plan my meals for my goal" doneLabel="Meals planned" onClick={planMeals} onUndo={onUnplanMeals}
          views={[{ label: "Week", onClick: go("/app/tools/meals") }, { label: "Today", onClick: onViewTodayPlan }]} />
        <SetupCta done={movementPlanned} flashed={flash === "movement"} Icon={Dumbbell} todo="Plan my movement for my goal" doneLabel="Movement planned" onClick={planMovement} onUndo={onUnplanMovement}
          views={[{ label: "Workout", onClick: go("/app/tools/workout") }, { label: "Yoga", onClick: go("/app/tools/yoga") }]} />
      </div>
      {/* Once she's eating, the daily verdict */}
      {e.logged && (
        <p className={`mt-2.5 flex items-center gap-1.5 text-[11.5px] font-semibold ${verdictCls}`}>
          <Sparkles className="h-3.5 w-3.5 shrink-0 text-hotpink" strokeWidth={2} /> {verdictText}
        </p>
      )}
    </div>
  );
}

/** A guided setup step, app-style. Not done → soft to-do row you can tap to
 *  build the plan. Done → soft green check + a small 'View' CTA to the plan. */
function SetupCta({ done, flashed, Icon, todo, doneLabel, onClick, onUndo, views }: {
  done: boolean; flashed?: boolean; Icon: typeof Utensils; todo: string; doneLabel: string; onClick: () => void;
  onUndo?: () => void;
  views: { label: string; onClick: () => void }[];
}) {
  if (done) {
    return (
      <div className="w-full flex items-center gap-2 rounded-2xl bg-white border border-petal/50 px-3 py-2.5">
        {/* Tap the tick to un-plan — it toggles off, back to the to-do state */}
        <button
          onClick={onUndo} disabled={!onUndo} title="Un-plan" aria-label="Un-plan"
          className="group relative grid h-6 w-6 shrink-0 place-items-center rounded-full bg-emerald-100 text-emerald-600 enabled:hover:bg-rose-100 enabled:hover:text-rose-500 transition enabled:active:scale-90 disabled:cursor-default"
        >
          <Check className="h-3.5 w-3.5 group-enabled:group-hover:hidden" strokeWidth={3} />
          <X className="h-3.5 w-3.5 hidden group-enabled:group-hover:block" strokeWidth={3} />
        </button>
        <span className="flex-1 min-w-0 text-[12.5px] font-bold text-rose/70 truncate">{doneLabel}</span>
        {flashed && <span className="shrink-0 inline-flex items-center gap-1 rounded-full bg-emerald-500 text-white px-2 py-0.5 text-[10px] font-black animate-fade-in">🎉 Planned!</span>}
        <div className="shrink-0 flex items-center gap-1">
          {views.map((v) => (
            <button key={v.label} onClick={v.onClick} className="inline-flex items-center gap-0.5 rounded-full bg-hotpink/10 text-hotpink px-2.5 py-1 text-[11px] font-bold active:scale-95 transition">{v.label} <ChevronRight className="h-3 w-3" /></button>
          ))}
        </div>
      </div>
    );
  }
  return (
    <button onClick={onClick} className="w-full inline-flex items-center gap-2.5 rounded-2xl bg-blush/50 border border-petal/60 px-3 py-2.5 active:scale-[0.99] transition hover:bg-blush">
      <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full border-2 border-hotpink/30" />
      <Icon className="h-4 w-4 shrink-0 text-hotpink" />
      <span className="flex-1 text-left text-[12.5px] font-bold text-hotpink">{todo}</span>
      <ChevronRight className="h-4 w-4 shrink-0 text-hotpink/60" />
    </button>
  );
}

/* ============================ 2 · GOAL PATH ============================ */
export function GoalPathCard({ onEdit }: { onEdit?: () => void }) {
  const p = goalProjection();
  if (!p) {
    return (
      <button onClick={onEdit ?? go("/app/tools/diet#diet-weight")} className="w-full text-left rounded-3xl bg-white/80 border border-petal/60 shadow-sm p-4 animate-fade-in active:scale-[0.99] transition">
        <p className="flex items-center gap-1.5 font-script text-xl text-hotpink"><Target className="h-4 w-4" /> Your goal path</p>
        <p className="mt-1 text-[12px] text-rose/70">Set a <b className="text-hotpink">goal weight</b> to see your timeline and how your plan gets you there.</p>
      </button>
    );
  }
  const losing = p.direction === "lose";
  return (
    <div className="relative rounded-3xl bg-white/80 border border-petal/60 shadow-sm p-4 sm:p-5 animate-fade-in">
      {onEdit && (
        <button onClick={onEdit} title="Edit weight & height" className="absolute top-2.5 right-2.5 grid h-7 w-7 place-items-center rounded-full bg-blush/70 text-hotpink border border-petal/50 active:scale-90 transition"><Pencil className="h-3.5 w-3.5" /></button>
      )}
      <div className="flex items-center justify-between mb-2 pr-8">
        <p className="flex items-center gap-1.5 font-script text-2xl text-hotpink"><Target className="h-5 w-5" /> Your goal path</p>
        <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wide border ${losing ? "bg-emerald-50 text-emerald-600 border-emerald-200" : "bg-rose-50 text-rose-500 border-rose-200"}`}>
          {losing ? <TrendingDown className="h-3 w-3" /> : <TrendingUp className="h-3 w-3" />} {Math.abs(p.toGo)}kg to {losing ? "lose" : "gain"}
        </span>
      </div>
      <div className="flex items-end gap-3 mb-2">
        <div><p className="text-3xl font-black text-hotpink leading-none tabular-nums">{p.current}<span className="text-base"> kg</span></p><p className="text-[9px] font-bold uppercase tracking-widest text-rose/45 mt-1">now</p></div>
        <ChevronRight className="h-5 w-5 text-rose/30 mb-1.5" />
        <div><p className="text-2xl font-black text-rose/70 leading-none tabular-nums">{p.target}<span className="text-sm"> kg</span></p><p className="text-[9px] font-bold uppercase tracking-widest text-rose/45 mt-1">goal</p></div>
        <div className="flex-1" />
        {p.etaWeeks != null && p.etaWeeks > 0 && (
          <div className="text-right"><p className="text-2xl font-black text-hotpink leading-none tabular-nums">~{p.etaWeeks}</p><p className="text-[9px] font-bold uppercase tracking-widest text-rose/45 mt-1">week{p.etaWeeks > 1 ? "s" : ""}</p></div>
        )}
      </div>
      <div className="h-2 rounded-full bg-petal/40 overflow-hidden"><div className="h-full rounded-full bg-gradient-to-r from-hotpink to-[#DB2777] transition-all" style={{ width: `${p.pct}%` }} /></div>
      <p className="mt-2 flex items-start gap-1.5 text-[11px] leading-snug text-rose/70">
        <Sparkles className="h-3.5 w-3.5 shrink-0 mt-0.5 text-hotpink" strokeWidth={2} />
        <span>{p.pct}% there.{p.etaWeeks != null && p.etaWeeks > 0 ? ` At your current plan (~${Math.abs(p.weeklyRateKg)}kg/week) you'll reach ${p.target}kg in about ${p.etaWeeks} week${p.etaWeeks > 1 ? "s" : ""}.` : " Keep logging your weight weekly to track the trend."}</span>
      </p>
    </div>
  );
}

/* ============================ 3 · THIS WEEK ============================ */
export function WeekBalanceCard() {
  const w = weekSnapshot();
  const done = w.sessionsDone;
  const planned = Math.max(w.plannedTraining, 1);
  const pct = Math.min(100, Math.round((done / planned) * 100));
  return (
    <div className="rounded-3xl bg-white/80 border border-petal/60 shadow-sm p-4 animate-fade-in">
      <div className="flex items-center justify-between mb-2">
        <p className="flex items-center gap-1.5 font-script text-2xl text-hotpink"><Activity className="h-5 w-5" /> This week</p>
        <span className="inline-flex items-center gap-1 rounded-full bg-hotpink/10 text-hotpink text-[10px] font-black uppercase tracking-wide px-2.5 py-1 border border-hotpink/20"><Trophy className="h-3 w-3" /> {done}/{w.plannedTraining || done} done</span>
      </div>
      <div className="grid grid-cols-2 gap-2 mb-2">
        <div className="flex items-center gap-2 rounded-xl bg-blush/50 border border-petal/50 px-3 py-2">
          <Dumbbell className="h-4 w-4 text-hotpink shrink-0" />
          <div><p className="text-lg font-black text-rose leading-none tabular-nums">{w.workoutsDone}</p><p className="text-[9px] font-bold uppercase tracking-wide text-rose/45">workouts</p></div>
        </div>
        <div className="flex items-center gap-2 rounded-xl bg-blush/50 border border-petal/50 px-3 py-2">
          <Sparkles className="h-4 w-4 text-hotpink shrink-0" />
          <div><p className="text-lg font-black text-rose leading-none tabular-nums">{w.yogaDone}</p><p className="text-[9px] font-bold uppercase tracking-wide text-rose/45">yoga flows</p></div>
        </div>
      </div>
      <div className="h-1.5 rounded-full bg-petal/40 overflow-hidden"><div className="h-full rounded-full bg-emerald-400 transition-all" style={{ width: `${pct}%` }} /></div>
      <p className="mt-2 text-[11px] leading-snug text-rose/70">{done === 0 ? "No sessions logged yet this week — start one to build momentum ✿" : done >= w.plannedTraining && w.plannedTraining > 0 ? "You've hit your movement goal this week — beautiful work ✿" : `${w.plannedTraining ? `${Math.max(0, w.plannedTraining - done)} more to hit your weekly plan.` : "Keep it going ✿"}`}</p>
    </div>
  );
}

/* ============================ 4 · COACH ============================ */
export function CoachCard({ onSetupWorkouts, onPlanMeals }: { onSetupWorkouts?: () => void; onPlanMeals?: () => void }) {
  const c = coachRecommendation();
  return (
    <div className="rounded-3xl border-2 border-hotpink/25 bg-gradient-to-br from-blush/60 to-petal/25 shadow-sm p-4 sm:p-5 animate-fade-in">
      <p className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-hotpink mb-1"><Sparkles className="h-3.5 w-3.5" strokeWidth={2.2} /> Your coach</p>
      <p className="font-script text-2xl text-hotpink leading-tight mb-2">{c.headline}</p>
      <ol className="space-y-1.5 mb-3">
        {c.steps.map((s, i) => (
          <li key={i} className="flex items-start gap-2 text-[12px] leading-snug text-rose/80">
            <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-hotpink text-white text-[10px] font-black">{i + 1}</span>
            <span>{s}</span>
          </li>
        ))}
      </ol>
      <div className="grid grid-cols-2 gap-2">
        <button onClick={onSetupWorkouts ?? go("/app/tools/workout")} className="inline-flex items-center justify-center gap-1.5 rounded-full bg-hotpink text-white px-3 py-2 text-[11px] font-bold active:scale-95 transition"><Dumbbell className="h-3.5 w-3.5" /> Set my workouts</button>
        <button onClick={onPlanMeals ?? go("/app/tools/meals")} className="inline-flex items-center justify-center gap-1.5 rounded-full bg-white/90 border border-hotpink/40 text-hotpink px-3 py-2 text-[11px] font-bold active:scale-95 transition"><Utensils className="h-3.5 w-3.5" /> Plan my meals</button>
      </div>
    </div>
  );
}

/* ==================== SLIM · for the Today page ==================== */
export function TodayEnergyStrip({ e }: { e: EnergyBalance }) {
  const eatenPct = e.allowance > 0 ? Math.min(100, Math.round((e.eaten / e.allowance) * 100)) : 0;
  return (
    <button onClick={go("/app/tools/diet")} className="w-full text-left rounded-2xl bg-white/80 border border-petal/60 shadow-sm p-3 active:scale-[0.99] transition animate-fade-in">
      <div className="flex items-center justify-between mb-1.5">
        <p className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wide text-hotpink"><Flame className="h-3.5 w-3.5" /> Energy today</p>
        <span className="text-[11px] font-bold text-rose/60 tabular-nums">{Math.max(0, e.remaining).toLocaleString()} kcal left</span>
      </div>
      <div className="h-2 rounded-full bg-petal/40 overflow-hidden"><div className="h-full rounded-full bg-gradient-to-r from-hotpink to-[#DB2777] transition-all" style={{ width: `${eatenPct}%` }} /></div>
      <div className="mt-1.5 flex items-center justify-between text-[10px] font-bold text-rose/50">
        <span className="tabular-nums">Goal {e.goal.toLocaleString()} · burned +{e.burned}</span>
        <span className="inline-flex items-center gap-1 text-hotpink">Open Diet <ChevronRight className="h-3 w-3" /></span>
      </div>
    </button>
  );
}
