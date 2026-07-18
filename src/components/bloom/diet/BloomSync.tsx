/**
 * BloomSync — the "your plan is fully optimized" dashboard for the Diet page.
 *
 * Makes the two-step magic visible: (1) Plan my week builds meals + movement by
 * your GOAL, (2) Sync to my cycle tunes them to your PHASE. A live connection ring
 * (Goal → Meals → Cycle → Movement) and an Optimization Score visibly complete as
 * each step lands, so the user actually sees — and understands — what Bloomzein did.
 *
 * Presentational only: all real data & handlers come from the Diet page.
 */
import { useState } from "react";
import {
  Target, UtensilsCrossed, Droplet, Dumbbell, Activity, Sparkles, Check, ArrowRight,
  Heart, Leaf, Apple, Sunrise, Info, RefreshCw, ChevronRight, Flower2, type LucideIcon,
} from "lucide-react";
import type { DietPhase, DietGoal } from "@/components/bloom/recipes/data";

const GOAL_LABEL: Record<DietGoal, string> = { lose: "Lose Weight", maintain: "Maintain Weight", gain: "Build Strength" };
const PHASE_LABEL: Record<DietPhase, string> = { menstrual: "Menstrual", follicular: "Follicular", ovulatory: "Ovulatory", luteal: "Luteal" };
const PHASE_ENERGY: Record<DietPhase, string> = { menstrual: "Low energy", follicular: "Energy rising", ovulatory: "Peak energy", luteal: "Winding down" };

const PHASE_WHY: Record<DietPhase, string> = {
  menstrual: "You're in your low-energy phase. Bloomzein leaned into iron-rich, warming meals and gentle movement to comfort your body and steady your energy.",
  follicular: "You're in your high-energy phase! Bloomzein increased complex carbs and scheduled strength training to help you build lean muscle and boost your metabolism.",
  ovulatory: "You're at your energy peak. Bloomzein fuelled you with protein and antioxidants and matched higher-intensity movement to make the most of it.",
  luteal: "Your energy is winding down. Bloomzein added magnesium and complex carbs and softened your movement to ease cravings and steady your mood.",
};
const PHASE_CHIPS: Record<DietPhase, { Icon: LucideIcon; label: string; sub: string }[]> = {
  menstrual: [
    { Icon: Heart, label: "Comfort", sub: "warming meals" },
    { Icon: Droplet, label: "Iron restored", sub: "replenished" },
    { Icon: Sparkles, label: "Gentle days", sub: "honoured" },
    { Icon: Activity, label: "Soft movement", sub: "no strain" },
  ],
  follicular: [
    { Icon: Sunrise, label: "More energy", sub: "naturally" },
    { Icon: Dumbbell, label: "Better performance", sub: "in workouts" },
    { Icon: Heart, label: "Stable mood", sub: "& focus" },
    { Icon: Activity, label: "Stronger body", sub: "lean muscle" },
  ],
  ovulatory: [
    { Icon: Sunrise, label: "Peak energy", sub: "channelled" },
    { Icon: Dumbbell, label: "Top performance", sub: "in workouts" },
    { Icon: Sparkles, label: "Radiant", sub: "& focused" },
    { Icon: Activity, label: "Strongest week", sub: "fuelled" },
  ],
  luteal: [
    { Icon: Heart, label: "Steady mood", sub: "cravings eased" },
    { Icon: Leaf, label: "Calm energy", sub: "supported" },
    { Icon: Apple, label: "Balanced", sub: "blood sugar" },
    { Icon: Activity, label: "Gentle body", sub: "honoured" },
  ],
};
const PHASE_INTEL: Record<DietPhase, { Icon: LucideIcon; text: string; sub: string }[]> = {
  menstrual: [
    { Icon: Droplet, text: "Iron-rich lunch", sub: "to support your cycle" },
    { Icon: Heart, text: "Warming, gentle meals", sub: "comfort & digestion" },
    { Icon: Droplet, text: "Higher water goal", sub: "replenish what you lose" },
  ],
  follicular: [
    { Icon: Dumbbell, text: "+12g protein", sub: "muscle & satiety" },
    { Icon: Sunrise, text: "Higher-energy breakfast", sub: "fuel your workouts" },
    { Icon: Leaf, text: "Fresh, fibre-rich lunch", sub: "ride rising energy" },
  ],
  ovulatory: [
    { Icon: Dumbbell, text: "Protein-forward day", sub: "peak-week fuel" },
    { Icon: Sparkles, text: "Antioxidant-rich meals", sub: "support your peak" },
    { Icon: Droplet, text: "Higher water goal", sub: "hydration for energy" },
  ],
  luteal: [
    { Icon: Leaf, text: "Magnesium-rich dinner", sub: "ease cravings & mood" },
    { Icon: Apple, text: "Complex carbs", sub: "steady blood sugar" },
    { Icon: Heart, text: "Comfort-focused meals", sub: "honour lower energy" },
  ],
};

export interface BloomSyncProps {
  goal: DietGoal;
  phase: DietPhase;
  cycleDay: number;
  cycleReady: boolean;
  mealsPlanned: boolean;
  movementPlanned: boolean;
  mealsSynced: boolean;
  movementSynced: boolean;
  targetKcal: number;
  proteinG: number;
  planDays: number;
  recipeCount: number;
  yogaSessions: number;
  workoutSessions: number;
  onPlanWeek: () => void;
  onSyncCycle: () => void;
  onViewMeals: () => void;
  onViewMovement: () => void;
  onRegenerate: () => void;
}

/* ── Connection-ring node ── */
function RingNode({ Icon, label, active, style }: { Icon: LucideIcon; label: string; active: boolean; style: React.CSSProperties }) {
  return (
    <div className="absolute flex flex-col items-center" style={style}>
      <span className={["grid h-9 w-9 place-items-center rounded-full border-2 transition-all duration-500", active ? "bg-white text-hotpink border-white shadow-lg shadow-hotpink/30" : "bg-white/25 text-white/70 border-white/40"].join(" ")}>
        <Icon className="h-4 w-4" strokeWidth={2} />
      </span>
      <span className="mt-0.5 text-[8px] font-bold uppercase tracking-wider text-white/90">{label}</span>
    </div>
  );
}

function ScoreBar({ Icon, label, pct }: { Icon: LucideIcon; label: string; pct: number }) {
  return (
    <div className="flex items-center gap-2">
      <Icon className="h-3.5 w-3.5 shrink-0 text-hotpink" strokeWidth={2} />
      <span className="w-24 shrink-0 text-[10.5px] font-semibold text-rose/70">{label}</span>
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-blush/70">
        <div className="h-full rounded-full bg-gradient-to-r from-hotpink to-[#DB2777] transition-all duration-700" style={{ width: `${pct}%` }} />
      </div>
      <span className="w-9 shrink-0 text-right text-[10px] font-bold text-hotpink tabular-nums">{pct}%</span>
    </div>
  );
}

export function BloomSyncDashboard(p: BloomSyncProps) {
  const [howOpen, setHowOpen] = useState(false);
  const fullyPlanned = p.mealsPlanned && p.movementPlanned;
  const fullySynced = p.mealsSynced && p.movementSynced;
  const optimized = fullyPlanned && fullySynced;

  const sGoal = p.mealsPlanned ? 100 : 0;
  const sCycle = p.mealsSynced ? 100 : p.mealsPlanned ? 60 : 0;
  const sMove = p.movementSynced ? 100 : p.movementPlanned ? 60 : 0;
  const sNutrition = p.mealsPlanned ? 100 : 0;
  const overall = Math.round((sGoal + sCycle + sMove + sNutrition) / 4);

  const totalMin = p.yogaSessions * 20 + p.workoutSessions * 35;
  const intel = PHASE_INTEL[p.phase];
  const chips = PHASE_CHIPS[p.phase];

  return (
    <div className="space-y-4">
      {/* ── HERO: Bloom Sync connection ring ── */}
      <div className="relative overflow-hidden rounded-3xl p-4 sm:p-5 text-white shadow-xl shadow-hotpink/25 animate-card-pop-in"
        style={{ background: "linear-gradient(135deg,#F9A8D4 0%,#EC4899 45%,#BE185D 100%)" }}>
        <Flower2 className="pointer-events-none absolute -right-6 -bottom-8 h-40 w-40 text-white/10" />
        <div className="relative flex items-center gap-3">
          {/* left copy */}
          <div className="min-w-0 flex-1">
            <p className="text-[12px] font-medium text-white/85 leading-tight">Your plan is</p>
            <h2 className="font-serif text-2xl font-black leading-none">{optimized ? "fully optimized" : fullyPlanned ? "planned for you" : "ready to bloom"}</h2>
            <p className="font-script text-xl text-white/95 leading-tight">for you, today ✿</p>
            <p className="mt-1.5 text-[11px] text-white/85 leading-snug max-w-[190px]">
              {optimized
                ? "Meals, workouts & yoga — all matched to your goal, cycle and movement."
                : fullyPlanned
                ? "Planned to your goal. Now sync it to your cycle for the perfect fit."
                : "Plan your week and Bloomzein tunes everything to your goal & body."}
            </p>
          </div>
          {/* connection ring */}
          <div className="relative h-32 w-32 shrink-0">
            <svg viewBox="0 0 128 128" className="absolute inset-0 h-full w-full">
              <circle cx="64" cy="64" r="44" fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth="1.5" strokeDasharray="3 4" />
            </svg>
            <span className="absolute left-1/2 top-1/2 grid h-12 w-12 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-white/95 text-2xl shadow-lg animate-icon-breathe">🌸</span>
            <RingNode Icon={Target} label="Goal" active style={{ left: "50%", top: "-2px", transform: "translateX(-50%)" }} />
            <RingNode Icon={UtensilsCrossed} label="Meals" active={p.mealsPlanned} style={{ right: "-6px", top: "50%", transform: "translateY(-50%)" }} />
            <RingNode Icon={Droplet} label="Cycle" active={p.mealsSynced || p.movementSynced} style={{ left: "50%", bottom: "-2px", transform: "translateX(-50%)" }} />
            <RingNode Icon={Dumbbell} label="Move" active={p.movementPlanned} style={{ left: "-6px", top: "50%", transform: "translateY(-50%)" }} />
          </div>
        </div>

        {/* status chips */}
        <div className="relative mt-3 flex flex-wrap items-center gap-1.5">
          <span className="inline-flex items-center gap-1 rounded-full bg-white/20 px-2.5 py-1 text-[10px] font-bold backdrop-blur"><Target className="h-3 w-3" /> {GOAL_LABEL[p.goal]}</span>
          {p.cycleReady && <span className="inline-flex items-center gap-1 rounded-full bg-white/20 px-2.5 py-1 text-[10px] font-bold backdrop-blur"><Droplet className="h-3 w-3" /> {PHASE_LABEL[p.phase]} Phase</span>}
          <span className="inline-flex items-center gap-1 rounded-full bg-white/20 px-2.5 py-1 text-[10px] font-bold backdrop-blur"><Dumbbell className="h-3 w-3" /> Strength + Yoga</span>
        </div>

        {/* the ONE live status badge */}
        <div className="relative mt-3 flex items-center gap-2">
          <span className={["inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-bold", optimized ? "bg-white text-hotpink animate-selected-glow" : "bg-white/25 text-white"].join(" ")}>
            <Check className="h-3.5 w-3.5" strokeWidth={3} /> {optimized ? "Fully Optimized for Today ✨" : fullyPlanned ? "Planned — sync to finish" : "Not planned yet"}
          </span>
          <button onClick={() => setHowOpen((v) => !v)} className="inline-flex items-center gap-1 rounded-full bg-white/20 px-2.5 py-1.5 text-[11px] font-bold backdrop-blur active:scale-95 transition">
            How it works <ChevronRight className={["h-3 w-3 transition-transform", howOpen ? "rotate-90" : ""].join(" ")} />
          </button>
        </div>
        {howOpen && (
          <div className="relative mt-2 rounded-2xl bg-white/15 p-2.5 text-[10.5px] leading-snug text-white/90 backdrop-blur animate-fade-in">
            <b>1.</b> Plan your week → Bloomzein builds meals + movement for your <b>{GOAL_LABEL[p.goal].toLowerCase()}</b> goal.
            <br /><b>2.</b> Sync to your cycle → it re-tunes everything to your <b>{PHASE_LABEL[p.phase].toLowerCase()}</b> phase for the best results.
          </div>
        )}
      </div>

      {/* ── The 2-step magic buttons ── */}
      {!optimized && (
        <div className="grid gap-2 sm:grid-cols-2">
          <button onClick={p.onPlanWeek} disabled={fullyPlanned}
            className={["inline-flex items-center justify-center gap-1.5 rounded-2xl px-4 py-3 text-sm font-bold transition active:scale-95", fullyPlanned ? "bg-emerald-50 text-emerald-600" : "bloom-luxury-btn text-white animate-selected-glow"].join(" ")}>
            {fullyPlanned ? <><Check className="h-4 w-4" strokeWidth={3} /> Week planned to your goal</> : <><Sparkles className="h-4 w-4" /> Plan my week</>}
          </button>
          <button onClick={p.onSyncCycle} disabled={!fullyPlanned || fullySynced}
            className={["inline-flex items-center justify-center gap-1.5 rounded-2xl px-4 py-3 text-sm font-bold transition active:scale-95",
              fullySynced ? "bg-emerald-50 text-emerald-600" : !fullyPlanned ? "bg-blush/50 text-rose/40" : "bg-white text-hotpink ring-2 ring-hotpink/60 animate-selected-glow"].join(" ")}>
            {fullySynced ? <><Check className="h-4 w-4" strokeWidth={3} /> Synced to your cycle</> : <><Droplet className="h-4 w-4" /> Sync to my cycle ✿</>}
          </button>
        </div>
      )}

      {/* ── Weekly plan cards ── */}
      <div className="grid gap-3 sm:grid-cols-2">
        {/* Meals */}
        <div className="rounded-3xl bg-white/80 border border-petal/50 p-4 shadow-sm">
          <div className="mb-2 flex items-center justify-between">
            <p className="flex items-center gap-1.5 text-[13px] font-bold text-[#9D174D]"><span className="grid h-6 w-6 place-items-center rounded-full bg-hotpink text-white"><UtensilsCrossed className="h-3.5 w-3.5" /></span> Weekly Meal Plan</p>
            <span className={["inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[9px] font-bold", p.mealsPlanned ? "bg-emerald-50 text-emerald-600" : "bg-blush/60 text-rose/50"].join(" ")}>{p.mealsPlanned ? <><Check className="h-2.5 w-2.5" strokeWidth={3} /> Generated</> : "Not yet"}</span>
          </div>
          <div className="space-y-1.5">
            <Stat Icon={Sparkles} big={`${p.planDays} Days`} sub="planned" />
            <Stat Icon={Apple} big={`${p.recipeCount} Recipes`} sub="variety & balance" />
            <Stat Icon={Droplet} big={`~${p.targetKcal.toLocaleString()} kcal`} sub="per day, to your goal" />
            <Stat Icon={Dumbbell} big={`${p.proteinG}g protein`} sub="optimized for you" />
          </div>
          <button onClick={p.onViewMeals} disabled={!p.mealsPlanned} className="mt-2.5 inline-flex w-full items-center justify-center gap-1 rounded-full bloom-luxury-btn px-4 py-2 text-[12px] font-bold text-white disabled:opacity-40 active:scale-95 transition">
            View my meals all week <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
        {/* Movement */}
        <div className="rounded-3xl bg-white/80 border border-petal/50 p-4 shadow-sm">
          <div className="mb-2 flex items-center justify-between">
            <p className="flex items-center gap-1.5 text-[13px] font-bold text-[#9D174D]"><span className="grid h-6 w-6 place-items-center rounded-full bg-hotpink text-white"><Activity className="h-3.5 w-3.5" /></span> Weekly Movement</p>
            <span className={["inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[9px] font-bold", p.movementPlanned ? "bg-emerald-50 text-emerald-600" : "bg-blush/60 text-rose/50"].join(" ")}>{p.movementPlanned ? <><Check className="h-2.5 w-2.5" strokeWidth={3} /> Generated</> : "Not yet"}</span>
          </div>
          <div className="space-y-1.5">
            <Stat Icon={Dumbbell} big={`${p.workoutSessions} Strength`} sub="sessions" />
            <Stat Icon={Flower2} big={`${p.yogaSessions} Yoga`} sub="sessions" />
            <Stat Icon={Heart} big="Recovery" sub="gentle days" />
            <Stat Icon={Activity} big={`~${totalMin} min`} sub="total this week" />
          </div>
          <button onClick={p.onViewMovement} disabled={!p.movementPlanned} className="mt-2.5 inline-flex w-full items-center justify-center gap-1 rounded-full bloom-luxury-btn px-4 py-2 text-[12px] font-bold text-white disabled:opacity-40 active:scale-95 transition">
            View my movement all week <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* ── Why today's plan is perfect ── */}
      {p.cycleReady && (
        <div className="rounded-3xl bg-white/80 border border-petal/50 p-4 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="grid h-16 w-16 shrink-0 place-items-center rounded-full border-2 border-hotpink/30 text-center">
              <div><p className="text-[13px] font-black leading-none text-hotpink">Day {p.cycleDay}</p><p className="text-[7px] font-bold uppercase tracking-wide text-rose/50 leading-tight mt-0.5">{PHASE_ENERGY[p.phase]}</p></div>
            </div>
            <div className="min-w-0">
              <p className="flex items-center gap-1 text-[13px] font-bold text-[#9D174D]"><BloomDot /> Why today's plan is perfect for you</p>
              <p className="mt-1 text-[11px] text-rose/75 leading-snug">{PHASE_WHY[p.phase]}</p>
            </div>
          </div>
          <div className="mt-2.5 grid grid-cols-2 gap-1.5 sm:grid-cols-4">
            {chips.map((c) => (
              <div key={c.label} className="flex items-center gap-1.5 rounded-2xl bg-blush/40 px-2 py-1.5">
                <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-white text-hotpink"><c.Icon className="h-3 w-3" strokeWidth={2} /></span>
                <div className="min-w-0"><p className="text-[9.5px] font-bold text-hotpink leading-tight">{c.label}</p><p className="text-[8px] text-rose/55 leading-tight">{c.sub}</p></div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Bloom Intelligence + Optimization Score ── */}
      <div className="grid gap-3 lg:grid-cols-2">
        {/* Intelligence */}
        <div className="rounded-3xl bg-white/80 border border-petal/50 p-4 shadow-sm">
          <p className="flex items-center gap-1.5 text-[13px] font-bold text-[#9D174D]"><Sparkles className="h-4 w-4 text-hotpink" /> Bloom Intelligence</p>
          <p className="mt-0.5 text-[10px] text-rose/55">Today Bloomzein adjusted your plan:</p>
          <ul className="mt-2 space-y-2">
            {intel.map((it) => (
              <li key={it.text} className="flex items-start gap-2">
                <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-blush/60 text-hotpink"><it.Icon className="h-3 w-3" strokeWidth={2} /></span>
                <div><p className="text-[11px] font-bold text-[#831843] leading-tight">{it.text}</p><p className="text-[9.5px] text-rose/55 leading-tight">{it.sub}</p></div>
              </li>
            ))}
          </ul>
        </div>
        {/* Optimization score */}
        <div className="rounded-3xl bg-white/80 border border-petal/50 p-4 shadow-sm">
          <p className="mb-2 flex items-center gap-1 text-[13px] font-bold text-[#9D174D]"><Info className="h-3.5 w-3.5 text-hotpink" /> Bloom Optimization Score</p>
          <div className="flex items-center gap-3">
            <div className="min-w-0 flex-1 space-y-1.5">
              <ScoreBar Icon={Target} label="Goal Alignment" pct={sGoal} />
              <ScoreBar Icon={Droplet} label="Cycle Sync" pct={sCycle} />
              <ScoreBar Icon={Dumbbell} label="Movement Match" pct={sMove} />
              <ScoreBar Icon={Apple} label="Nutrition Balance" pct={sNutrition} />
            </div>
            <div className="relative grid h-20 w-20 shrink-0 place-items-center">
              <svg viewBox="0 0 80 80" className="absolute inset-0 -rotate-90">
                <circle cx="40" cy="40" r="34" fill="none" stroke="#FCE7F3" strokeWidth="6" />
                <circle cx="40" cy="40" r="34" fill="none" stroke="url(#opt-grad)" strokeWidth="6" strokeLinecap="round" strokeDasharray={2 * Math.PI * 34} strokeDashoffset={2 * Math.PI * 34 * (1 - overall / 100)} className="transition-all duration-700" />
                <defs><linearGradient id="opt-grad" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#EC4899" /><stop offset="1" stopColor="#DB2777" /></linearGradient></defs>
              </svg>
              <div className="text-center"><p className="text-[17px] font-black leading-none text-hotpink">{overall}%</p><p className="text-[7px] font-bold uppercase tracking-wide text-rose/50">Optimized</p></div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Regenerate ── */}
      {fullyPlanned && (
        <button onClick={p.onRegenerate} className="inline-flex w-full items-center justify-center gap-1.5 rounded-full bloom-luxury-btn px-4 py-3 text-sm font-bold text-white active:scale-95 transition">
          <RefreshCw className="h-4 w-4" /> Regenerate my plan ✨
        </button>
      )}
    </div>
  );
}

function Stat({ Icon, big, sub }: { Icon: LucideIcon; big: string; sub: string }) {
  return (
    <div className="flex items-center gap-2 rounded-2xl bg-blush/40 px-2.5 py-1.5">
      <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-white text-hotpink"><Icon className="h-3 w-3" strokeWidth={2} /></span>
      <div className="min-w-0"><p className="text-[11px] font-bold text-[#831843] leading-tight">{big}</p><p className="text-[9px] text-rose/55 leading-tight">{sub}</p></div>
    </div>
  );
}
function BloomDot() { return <span className="inline-block h-3 w-3 rounded-full bg-hotpink/20 ring-2 ring-hotpink/40" />; }
