/**
 * Diet dashboard — the daily "command center" cards. Every number is gathered
 * live from the other tools (cycle phase, workout & yoga burn, logged meals,
 * body & goal) through the shared nutritionTargets engine, so Diet, Today and
 * Meals always agree.
 */
import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  Flame, Utensils, TrendingDown, TrendingUp, Target, Dumbbell,
  Sparkles, ChevronRight, Activity, Trophy, Pencil, Check, X,
  Lightbulb, Leaf, Heart,
} from "lucide-react";
import {
  energyBalance, goalProjection, weekSnapshot, coachRecommendation,
  computeTargets, movementFoodLine,
  type EnergyBalance,
} from "@/lib/nutritionTargets";
import { RECIPES, recipeImageSrc, type Recipe } from "@/components/bloom/recipes/data";

const go = (href: string) => () => { window.location.href = href; };

// Adequate snack ideas for the calories she has left — real snack recipes that
// fit inside her remaining budget (largest-that-still-fits first, so they feel
// satisfying without going over), falling back to the lightest if few fit.
function snackIdeasFor(remaining: number, n = 4) {
  const budget = Math.max(0, remaining);
  const snacks = RECIPES.filter((r) => r.mealType === "snack");
  const fits = snacks
    .filter((r) => r.macros.calories <= budget)
    .sort((a, b) => b.macros.calories - a.macros.calories);
  if (fits.length >= n) return fits.slice(0, n);
  const over = snacks
    .filter((r) => r.macros.calories > budget)
    .sort((a, b) => a.macros.calories - b.macros.calories);
  return [...fits, ...over].slice(0, n);
}

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
export function EnergyTodayCard({ e, mealsPlanned, mealsFromDiet, movementPlanned, movementFromDiet, onPlanMeals, onPlanMovement, onUnplanMeals, onUnplanMovement, onViewTodayPlan }: {
  e: EnergyBalance;
  mealsPlanned: boolean;
  mealsFromDiet?: boolean;
  movementPlanned: boolean;
  movementFromDiet?: boolean;
  onPlanMeals: () => void;
  onPlanMovement: () => void;
  onUnplanMeals?: () => void;
  onUnplanMovement?: () => void;
  onViewTodayPlan: () => void;
}) {
  const eatenPct = e.allowance > 0 ? (e.eaten / e.allowance) * 100 : 0;
  const moveLine = movementFoodLine(computeTargets(true));
  const coach = coachRecommendation();
  const goalWord = coach.goal === "lose" ? "lean" : coach.goal === "gain" ? "build" : "maintain";
  const proj = goalProjection();
  const hasEta = !!proj && proj.etaWeeks != null; // only tease the timeline if a goal weight is set

  // Transient "✓ Planned!" flash after an implicit plan is built (same line).
  const [flash, setFlash] = useState<null | "meals" | "movement">(null);
  useEffect(() => { if (!flash) return; const t = setTimeout(() => setFlash(null), 2600); return () => clearTimeout(t); }, [flash]);
  // Confirm before syncing/overwriting a plan the user already has (meals or
  // movement). Null = closed.
  const [confirmSync, setConfirmSync] = useState<null | "meals" | "movement">(null);
  const doSync = () => {
    if (confirmSync === "meals") { onPlanMeals(); setFlash("meals"); }
    else if (confirmSync === "movement") { onPlanMovement(); setFlash("movement"); }
    setConfirmSync(null);
  };
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
    <div id="diet-energy" className="rounded-3xl bg-white/80 border border-petal/60 shadow-sm p-4 sm:p-5 animate-fade-in">
      <div className="mb-3 flex items-start justify-between gap-2">
        <div>
          <p className="font-script text-2xl text-hotpink leading-none">Today's fuel</p>
          <p className="text-[10px] font-bold uppercase tracking-widest text-rose/45 mt-1">
            your food energy · {coach.goal === "lose" ? "lean" : coach.goal === "gain" ? "build" : "maintain"} goal
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
        <SetupCta done={mealsPlanned} flashed={flash === "meals"} Icon={Utensils}
          todo="Plan my meals for my goal"
          doneLabel={mealsFromDiet ? "Meals planned" : "Week is planned"}
          onClick={planMeals}
          onUndo={mealsFromDiet ? onUnplanMeals : undefined}
          onSync={mealsFromDiet ? undefined : () => setConfirmSync("meals")}
          views={[{ label: "Week", onClick: go("/app/tools/meals") }, { label: "Today", onClick: onViewTodayPlan }]} />
        <SetupCta done={movementPlanned} flashed={flash === "movement"} Icon={Dumbbell} todo="Plan my movement for my goal"
          doneLabel={movementFromDiet ? "Movement planned" : "Movement is planned"}
          onClick={planMovement}
          onUndo={movementFromDiet ? onUnplanMovement : undefined}
          onSync={movementFromDiet ? undefined : () => setConfirmSync("movement")}
          views={[{ label: "Workout", onClick: go("/app/tools/workout") }, { label: "Yoga", onClick: go("/app/tools/yoga") }]} />
      </div>
      {/* Once she's eating, the daily verdict */}
      {e.logged && (
        <p className={`mt-2.5 flex items-center gap-1.5 text-[11.5px] font-semibold ${verdictCls}`}>
          <Sparkles className="h-3.5 w-3.5 shrink-0 text-hotpink" strokeWidth={2} /> {verdictText}
        </p>
      )}

      {/* Confirm before syncing — the user already has their own plan (Meals
          Planner week, or Workout/Yoga plans they built), so Diet NEVER adjusts
          it silently. Portaled so a transformed ancestor can't trap the fixed
          overlay. */}
      {confirmSync && createPortal(
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-3 sm:p-4" onClick={() => setConfirmSync(null)}>
          <div className="absolute inset-0 bg-rose/25 backdrop-blur-sm animate-fade-in" />
          <div className="relative w-full max-w-sm rounded-3xl bg-white p-5 shadow-2xl animate-scale-in" onClick={(ev) => ev.stopPropagation()}>
            <span className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-full bg-hotpink/10 text-hotpink"><Sparkles className="h-6 w-6" /></span>
            <p className="text-center font-script text-2xl text-hotpink">{confirmSync === "movement" ? "Adjust your movement?" : "Sync your week?"}</p>
            <p className="mt-1.5 text-center text-[12.5px] text-rose/70 leading-snug">
              {confirmSync === "movement" ? (
                <>You already have <b className="text-hotpink">workout &amp; yoga</b> plans. Adjust them to your <b className="text-hotpink">{goalWord}</b> goal? If you'd rather keep them as they are, they'll stay yours — just not goal-synced.</>
              ) : (
                <>You already have a week planned in your <b className="text-hotpink">Meals Planner</b>. Rebuild it tuned to your <b className="text-hotpink">{goalWord}</b> goal? This replaces your current week.</>
              )}
            </p>
            <div className="mt-4 grid gap-2">
              <button onClick={doSync} className="w-full inline-flex items-center justify-center gap-1.5 rounded-2xl bg-gradient-to-r from-hotpink to-[#DB2777] text-white px-4 py-2.5 text-sm font-bold shadow-lg shadow-hotpink/30 active:scale-95 transition">
                <Sparkles className="h-4 w-4" /> {confirmSync === "movement" ? "Adjust to my goal" : "Sync to my goal"}
              </button>
              <button onClick={() => setConfirmSync(null)} className="w-full rounded-2xl border border-petal/60 bg-white px-4 py-2.5 text-sm font-bold text-rose/70 hover:bg-blush active:scale-95 transition">
                Keep my plan
              </button>
            </div>
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
}

/** A guided setup step, app-style. Not done → soft to-do row you can tap to
 *  build the plan. Done → soft green check + a small 'View' CTA to the plan. */
function SetupCta({ done, flashed, Icon, todo, doneLabel, onClick, onUndo, onSync, views }: {
  done: boolean; flashed?: boolean; Icon: typeof Utensils; todo: string; doneLabel: string; onClick: () => void;
  onUndo?: () => void;
  onSync?: () => void;
  views: { label: string; onClick: () => void }[];
}) {
  if (done) {
    return (
      <div className="w-full overflow-hidden rounded-2xl bg-white border border-petal/50 shadow-sm shadow-hotpink/5">
        <div className="flex items-center gap-2.5 px-3 pt-2.5">
          {/* Tool icon in a soft-pink circle; hover it to un-plan (X). When the plan
              is the user's own (managed in the Meals Planner) it's protected. */}
          <button
            onClick={onUndo} disabled={!onUndo} title={onUndo ? "Un-plan" : "Managed in your Meals Planner — safe from here"} aria-label={onUndo ? "Un-plan" : "Managed in your Meals Planner"}
            className="group relative grid h-8 w-8 shrink-0 place-items-center rounded-full bg-gradient-to-br from-hotpink to-[#DB2777] text-white shadow-sm shadow-hotpink/30 enabled:hover:from-rose-400 enabled:hover:to-rose-500 transition enabled:active:scale-90 disabled:cursor-default"
          >
            <Icon className="h-4 w-4 group-enabled:group-hover:hidden" strokeWidth={2} />
            <X className="h-4 w-4 hidden group-enabled:group-hover:block" strokeWidth={3} />
          </button>
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-bold text-[#831843] leading-tight truncate">{doneLabel}</p>
            <p className="text-[9.5px] text-rose/50 leading-tight">Tuned to your goal ✿</p>
          </div>
          <span className={["shrink-0 inline-flex items-center gap-0.5 rounded-full border px-2 py-0.5 text-[9px] font-black uppercase tracking-wide", flashed ? "bg-emerald-500 text-white border-emerald-500 animate-fade-in" : "bg-emerald-50 text-emerald-600 border-emerald-200"].join(" ")}>
            {flashed ? "🎉 Planned" : <><Check className="h-2.5 w-2.5" strokeWidth={3} /> Generated</>}
          </span>
        </div>
        {/* Action chips — a soft footer strip, aligned under the label */}
        <div className="mt-2 flex flex-wrap items-center gap-1.5 bg-blush/30 px-3 py-2 pl-[42px]">
          {onSync && (
            <button onClick={onSync} title="Sync this plan to your goal" className="inline-flex items-center gap-0.5 rounded-full bg-white text-hotpink border border-hotpink/40 px-2.5 py-1 text-[11px] font-bold active:scale-95 transition animate-soft-glow"><Sparkles className="h-3 w-3" /> Sync to goal</button>
          )}
          {views.map((v) => (
            <button key={v.label} onClick={v.onClick} className="inline-flex items-center gap-0.5 rounded-full bg-white text-hotpink border border-petal/60 px-2.5 py-1 text-[11px] font-bold active:scale-95 transition hover:border-hotpink/50">{v.label} <ChevronRight className="h-3 w-3" /></button>
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
  const [activeSnack, setActiveSnack] = useState<Recipe | null>(null);
  const remaining = Math.max(0, e.remaining);
  // How "on track" she is — the ring & meal bar fill by planned intake against
  // what she can eat today (goal + what she'll burn).
  const eatenPct  = e.allowance > 0 ? Math.min(100, Math.round((e.eaten / e.allowance) * 100)) : 0;
  // The three honest numbers, each a bar scaled against her goal.
  const scale = Math.max(1, e.goal, e.eaten, e.burned);
  const rows = [
    { key: "goal",     Icon: Target,   label: "Goal",            sub: "Daily calories needed",     value: e.goal,   tint: "bg-blush text-hotpink",        bar: "from-[#F472B6] to-[#DB2777]" },
    { key: "movement", Icon: Activity, label: "Planned movement", sub: "Calories to burn",          value: e.burned, tint: "bg-violet-100 text-violet-500", bar: "from-violet-300 to-violet-400" },
    { key: "meals",    Icon: Leaf,     label: "Planned meals",    sub: "Calories in your meal plan", value: e.eaten,  tint: "bg-blush text-hotpink",        bar: "from-[#F472B6] to-[#DB2777]" },
  ];
  // A gentle verdict for the tip.
  const tip = eatenPct >= 95 ? "Nice! You're almost perfectly on track today."
    : eatenPct >= 70 ? "Lovely balance — a light snack still fits beautifully."
    : remaining > 0 ? "Plenty of room left — fuel up with something nourishing."
    : "You're right on target — beautifully done today.";
  const snacks = remaining > 0 ? snackIdeasFor(remaining, 4) : [];

  return (
    <div className="relative overflow-hidden rounded-[1.75rem] border border-petal/60 bg-white shadow-[0_12px_34px_rgba(219,39,119,0.10)] animate-fade-in">
      {/* soft blush wash */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-blush/40 via-white to-petal/25" />

      <div className="relative p-4 sm:p-5">
        {/* ── HEADER ─────────────────────────────────────────────── */}
        <div className="flex items-start gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-hotpink to-magenta text-white shadow-sm shadow-hotpink/30"><Flame className="h-5 w-5" strokeWidth={2} /></span>
          <div className="min-w-0 flex-1">
            <p className="inline-flex items-center gap-1.5 font-script text-[1.7rem] sm:text-3xl text-hotpink leading-none">Today's Fuel <Sparkles className="h-4 w-4" strokeWidth={2} /></p>
            <p className="mt-1 text-[12px] sm:text-[13px] text-rose/70 leading-snug max-w-md">
              According to your goal, movement and meal plan, you still have room for a <span className="font-bold text-hotpink">little something good.</span>
            </p>
          </div>
          {/* kcal-left pill */}
          <div className="hidden sm:flex shrink-0 items-center gap-2 rounded-2xl bg-white/85 border border-petal/60 px-3.5 py-2 shadow-sm">
            <Flame className="h-5 w-5 text-hotpink" strokeWidth={2} />
            <div className="leading-tight">
              <p className="font-black text-hotpink text-lg tabular-nums leading-none">{remaining.toLocaleString()} <span className="text-[12px] font-bold text-rose/70">kcal left</span></p>
              <p className="text-[10px] font-semibold text-rose/55 inline-flex items-center gap-1">to enjoy today <Heart className="h-2.5 w-2.5 fill-hotpink text-hotpink" /></p>
            </div>
          </div>
        </div>

        {/* ── BODY: stats (left) + ring & tip (right) ────────────── */}
        <div className="mt-4 grid gap-4 lg:grid-cols-5">
          {/* stat rows */}
          <div className="lg:col-span-3 space-y-2.5">
            {rows.map((r) => (
              <div key={r.key} className="flex items-center gap-3 rounded-2xl bg-white/70 border border-petal/40 px-3 py-2.5">
                <span className={["grid h-10 w-10 shrink-0 place-items-center rounded-full", r.tint].join(" ")}><r.Icon className="h-5 w-5" strokeWidth={2} /></span>
                <div className="w-[92px] shrink-0">
                  <p className="text-[11px] font-black uppercase tracking-wide text-[#831843] leading-tight">{r.label}</p>
                  <p className="text-[9.5px] font-semibold text-rose/50 leading-tight">{r.sub}</p>
                </div>
                <span className="relative h-2.5 flex-1 rounded-full bg-petal/25 overflow-hidden">
                  <span className={["absolute inset-y-0 left-0 rounded-full bg-gradient-to-r transition-all duration-700", r.bar].join(" ")} style={{ width: `${Math.max(2, Math.round((r.value / scale) * 100))}%` }} />
                </span>
                <span className="w-14 shrink-0 text-right leading-none">
                  <span className="block font-black text-hotpink tabular-nums text-[15px]">{Math.round(r.value).toLocaleString()}</span>
                  <span className="block text-[9px] font-bold uppercase tracking-wide text-rose/45">kcal</span>
                </span>
              </div>
            ))}
          </div>

          {/* ring + tip */}
          <div className="lg:col-span-2 flex flex-col items-center gap-2.5">
            <div className="relative">
              <Ring pct={eatenPct} size={132} stroke={10}>
                <div>
                  <p className="text-[9px] font-bold uppercase tracking-widest text-rose/50">You have</p>
                  <p className="font-black text-hotpink leading-none text-4xl tabular-nums">{remaining.toLocaleString()}</p>
                  <p className="text-[10px] font-bold text-rose/60 inline-flex items-center gap-1 justify-center">kcal left <Heart className="h-2.5 w-2.5 fill-hotpink text-hotpink" /></p>
                </div>
              </Ring>
            </div>
            <div className="w-full rounded-2xl bg-blush/40 border border-petal/50 px-3 py-2 flex items-start gap-2">
              <Lightbulb className="h-4 w-4 shrink-0 text-hotpink mt-0.5" strokeWidth={2} />
              <p className="text-[11px] leading-snug text-[#831843]"><span className="font-bold text-hotpink">Tip:</span> {tip}</p>
            </div>
          </div>
        </div>

        {/* ── SMART IDEA — adequate snacks that lead to real recipes ── */}
        {snacks.length > 0 && (
          <div className="mt-4 rounded-2xl bg-white/70 border border-petal/50 p-3 sm:p-3.5">
            <div className="flex flex-col sm:flex-row sm:items-start gap-3">
              <div className="sm:w-40 shrink-0">
                <p className="inline-flex items-center gap-1.5 font-script text-xl text-hotpink leading-none"><Sparkles className="h-4 w-4" strokeWidth={2} /> Smart idea</p>
                <p className="mt-1 text-[11px] text-rose/65 leading-snug">You still have <span className="font-bold text-hotpink tabular-nums">{remaining.toLocaleString()} kcal</span> available. Here are some light &amp; delicious options:</p>
              </div>
              {/* snack cards — tapping one pops the recipe open, right here on Today */}
              <div className="min-w-0 flex-1 grid grid-cols-2 sm:grid-cols-4 gap-2">
                {snacks.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => setActiveSnack(s)}
                    title={`View ${s.name}`}
                    className="group text-left rounded-xl bg-white border border-petal/50 overflow-hidden shadow-sm transition hover:-translate-y-0.5 hover:shadow-md active:scale-[0.98]"
                  >
                    <div className="relative h-16 w-full overflow-hidden bg-blush">
                      <img
                        src={recipeImageSrc(s)} alt="" className="h-full w-full object-cover transition duration-500 group-hover:scale-105" loading="lazy"
                        onError={(ev) => { const el = ev.currentTarget as HTMLImageElement; if (!el.src.endsWith("/images/read-recipes.webp")) el.src = "/images/read-recipes.webp"; }}
                      />
                    </div>
                    <div className="p-1.5">
                      <p className="text-[10.5px] font-bold text-[#831843] leading-tight line-clamp-2 min-h-[26px]">{s.name}</p>
                      <span className="mt-1 inline-block rounded-full bg-blush px-1.5 py-0.5 text-[9px] font-bold text-hotpink tabular-nums">{s.macros.calories} kcal</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Soft, cute link to the full recipes library in Diet */}
            <div className="mt-3 flex justify-center">
              <button
                onClick={go("/app/tools/diet?tab=recipes")}
                className="inline-flex items-center gap-1.5 rounded-full bg-blush/60 border border-petal/60 px-4 py-1.5 text-[11.5px] font-semibold text-hotpink transition hover:bg-blush active:scale-95"
              >
                <Sparkles className="h-3.5 w-3.5" strokeWidth={2} /> Discover more snack ideas <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* ── FOOTER ─────────────────────────────────────────────── */}
        <div className="mt-3 flex items-center justify-between gap-2 border-t border-petal/40 pt-2.5">
          <p className="inline-flex items-center gap-1.5 text-[11px] text-rose/60 leading-snug"><Leaf className="h-3.5 w-3.5 text-hotpink/60" strokeWidth={2} /> Every choice you make today is a step towards your best self.</p>
          <button onClick={go("/app/tools/diet")} className="shrink-0 inline-flex items-center gap-1 text-[12px] font-bold text-hotpink animate-soft-glow">Open Diet <ChevronRight className="h-3.5 w-3.5" /></button>
        </div>
      </div>

      {/* Recipe pops open right here — she never leaves Today */}
      {activeSnack && <SnackRecipePopup recipe={activeSnack} onClose={() => setActiveSnack(null)} />}
    </div>
  );
}

// A soft, self-contained recipe popup — opens over Today (via a portal) so a
// tapped snack shows its recipe without ever navigating away.
function SnackRecipePopup({ recipe, onClose }: { recipe: Recipe; onClose: () => void }) {
  const m = recipe.macros;
  return createPortal(
    <div className="fixed inset-0 z-[9000] flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm p-0 sm:p-4 animate-fade-in" onClick={onClose}>
      <div onClick={(ev) => ev.stopPropagation()} className="w-full sm:max-w-md max-h-[92vh] overflow-y-auto rounded-t-[2rem] sm:rounded-[2rem] bg-white shadow-2xl">
        <div className="relative">
          <img
            src={recipeImageSrc(recipe)} alt={recipe.name} className="w-full aspect-[16/10] object-cover bg-blush"
            onError={(ev) => { const el = ev.currentTarget as HTMLImageElement; if (!el.src.endsWith("/images/read-recipes.webp")) el.src = "/images/read-recipes.webp"; }}
          />
          <button onClick={onClose} aria-label="Close" className="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full bg-white/90 text-hotpink shadow-md transition hover:bg-white active:scale-90">
            <X className="h-4 w-4" />
          </button>
          <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-white/90 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-hotpink shadow-sm">
            <Sparkles className="h-3 w-3" strokeWidth={2} /> Snack idea
          </span>
        </div>

        <div className="p-4 sm:p-5">
          <h2 className="font-script text-2xl text-hotpink leading-tight">{recipe.name}</h2>
          <p className="text-[12px] text-rose/60">{recipe.cuisine} · {recipe.prepTime + (recipe.cookTime || 0)} min</p>

          {/* macro chips */}
          <div className="mt-3 grid grid-cols-4 gap-1.5 text-center">
            {[
              { k: "kcal", v: m.calories, cls: "text-hotpink" },
              { k: "protein", v: `${m.protein}g`, cls: "text-emerald-600" },
              { k: "carbs", v: `${m.carbs}g`, cls: "text-rose-400" },
              { k: "fat", v: `${m.fat}g`, cls: "text-violet-500" },
            ].map((x) => (
              <div key={x.k} className="rounded-xl bg-blush/50 py-1.5">
                <p className={["text-sm font-black tabular-nums leading-none", x.cls].join(" ")}>{x.v}</p>
                <p className="text-[8px] font-bold uppercase tracking-wide text-rose/45 mt-0.5">{x.k}</p>
              </div>
            ))}
          </div>

          {/* ingredients */}
          {recipe.ingredients?.length > 0 && (
            <div className="mt-4">
              <p className="text-[11px] font-bold uppercase tracking-wide text-hotpink/70 mb-1.5">Ingredients</p>
              <ul className="space-y-1">
                {recipe.ingredients.map((ing, i) => (
                  <li key={i} className="flex items-baseline gap-2 text-[12.5px] text-[#831843]">
                    <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-hotpink" />
                    <span className="flex-1">{ing.name}</span>
                    <span className="text-rose/55 tabular-nums">{ing.quantity}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* steps */}
          {recipe.steps?.length > 0 && (
            <div className="mt-4">
              <p className="text-[11px] font-bold uppercase tracking-wide text-hotpink/70 mb-1.5">Make it</p>
              <ol className="space-y-1.5">
                {recipe.steps.map((step, i) => (
                  <li key={i} className="flex gap-2 text-[12.5px] text-[#831843] leading-snug">
                    <span className="grid h-4 w-4 shrink-0 place-items-center rounded-full bg-hotpink text-[9px] font-black text-white mt-0.5">{i + 1}</span>
                    <span dangerouslySetInnerHTML={{ __html: step.replace(/\*\*(.+?)\*\*/g, '<b class="text-hotpink">$1</b>') }} />
                  </li>
                ))}
              </ol>
            </div>
          )}

          <button onClick={go("/app/tools/diet?tab=recipes")} className="mt-5 w-full inline-flex items-center justify-center gap-1.5 rounded-full bg-blush/60 border border-petal/60 px-4 py-2 text-[12px] font-semibold text-hotpink transition hover:bg-blush active:scale-95">
            <Sparkles className="h-3.5 w-3.5" strokeWidth={2} /> Discover more snack ideas <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
