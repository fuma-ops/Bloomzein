/**
 * BloomPlanSetup — the photo-rich "Bloom Plan" setup section for the Diet page.
 *
 * BEFORE setup: two big photo cards (Plan my meals · Plan my movements) she taps
 * to create each plan for her goal, then a Step-3 "Sync with my cycle" row that
 * unlocks once both exist — plus a "why sync" reason strip.
 * AFTER setup (both planned + synced): three "Ready / Active" cards (Meal Plan ·
 * Movement Plan · Cycle Synced) with real numbers, a "Bloom adjusts for you"
 * strip, and a Regenerate action.
 *
 * Presentational — all real data & handlers come from the Diet page.
 */
import {
  Utensils, Dumbbell, Droplet, Heart, Sparkles, Check, ChevronRight, Lock,
  RefreshCw, Zap, Activity, Leaf, Flame, Moon, Apple, type LucideIcon,
} from "lucide-react";
import type { DietGoal } from "@/components/bloom/recipes/data";

const MEAL_PHOTO = "/images/recipes/lunch-asian-rainbow-salmon-buddha-bowl.webp";
const MOVE_PHOTO = "/images/setup-movement.webp";
const CYCLE_PHOTO = "/images/landing-orb-flower.webp";

export interface BloomPlanSetupProps {
  goal: DietGoal;
  phaseLabel?: string;
  cycleReady?: boolean;
  mealsPlanned: boolean;
  movementPlanned: boolean;
  mealsSynced?: boolean;
  movementSynced?: boolean;
  kcal: number;
  protein: number;
  strength: number;
  yoga: number;
  onPlanMeals: () => void;
  onPlanMovement: () => void;
  onSyncCycle: () => void;
  onUnplanMeals?: () => void;
  onUnplanMovement?: () => void;
  onRegenerate: () => void;
  onViewMeals: () => void;
  onViewMovement: () => void;
}

const WHY_SYNC: { Icon: LucideIcon; label: string }[] = [
  { Icon: Zap, label: "Better energy" },
  { Icon: Heart, label: "Balanced hormones" },
  { Icon: Droplet, label: "Improved results" },
  { Icon: Sparkles, label: "Personalized for you" },
  { Icon: Leaf, label: "Sustainable habits" },
];
const ADJUSTS: { Icon: LucideIcon; label: string }[] = [
  { Icon: Flame, label: "Calories adjusted" },
  { Icon: Dumbbell, label: "Workout intensity" },
  { Icon: Moon, label: "Recovery days" },
  { Icon: Apple, label: "Nutrients optimized" },
  { Icon: Heart, label: "Cravings supported" },
  { Icon: Zap, label: "Energy balanced" },
];

export function BloomPlanSetup(p: BloomPlanSetupProps) {
  const synced = !!p.mealsSynced && !!p.movementSynced;
  const bothPlanned = p.mealsPlanned && p.movementPlanned;
  const phase = p.cycleReady && p.phaseLabel ? p.phaseLabel : "cycle";
  const proteinNote = p.goal === "gain" ? "Protein-forward" : p.goal === "lose" ? "High protein • Lean" : "High protein • Balanced";

  // ── AFTER — perfectly bloomed ──────────────────────────────────────────────
  if (synced) {
    return (
      <div className="rounded-3xl bg-white/80 border border-petal/50 shadow-sm p-3.5 animate-fade-in">
        <div className="mb-2.5 flex items-center justify-between">
          <p className="font-script text-xl text-hotpink leading-none">Your personalized plan ✿</p>
          <button onClick={p.onViewMeals} className="inline-flex items-center gap-0.5 text-[10.5px] font-bold text-hotpink">View full plan <ChevronRight className="h-3 w-3" /></button>
        </div>
        <div className="flex items-stretch gap-1">
          <ReadyCard photo={MEAL_PHOTO} Icon={Utensils} tint="from-hotpink to-[#DB2777]" title="Meal Plan" status="Ready"
            lines={[`${p.kcal.toLocaleString()} kcal/day`, proteinNote]} cta="View meals" ctaCls="bg-gradient-to-r from-hotpink to-[#DB2777]" onCta={p.onViewMeals} />
          <Plus />
          <ReadyCard photo={MOVE_PHOTO} Icon={Dumbbell} tint="from-purple-400 to-fuchsia-500" title="Movement" status="Ready"
            lines={[`${p.strength} Str · ${p.yoga} Yoga`, "Recovery days"]} cta="View plan" ctaCls="bg-gradient-to-r from-purple-400 to-fuchsia-500" onCta={p.onViewMovement} />
          <Plus />
          <ReadyCard photo={CYCLE_PHOTO} Icon={Droplet} tint="from-amber-400 to-orange-500" title="Cycle Synced" status="Active"
            lines={[`Adjusted to your`, `${phase} phase`]} cta="Adjustments" ctaCls="bg-gradient-to-r from-amber-400 to-orange-500" onCta={p.onViewMeals} imgContain />
        </div>

        {/* Bloom adjusts for you */}
        <div className="mt-3">
          <p className="flex items-center gap-1.5 text-[12px] font-bold text-[#9D174D]"><Sparkles className="h-3.5 w-3.5 text-hotpink" strokeWidth={2} /> Bloom adjusts for you</p>
          <p className="text-[9.5px] text-rose/55 leading-snug">Auto-tuned to your cycle phase so you feel your best all month.</p>
          <div className="mt-2 grid grid-cols-3 gap-1.5">
            {ADJUSTS.map((a) => (
              <div key={a.label} className="flex flex-col items-center rounded-xl bg-blush/40 px-1 py-1.5 text-center">
                <span className="grid h-6 w-6 place-items-center rounded-full bg-white text-hotpink"><a.Icon className="h-3 w-3" strokeWidth={2} /></span>
                <span className="mt-0.5 text-[8px] font-semibold text-rose/70 leading-tight">{a.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Everything connected + regenerate */}
        <div className="mt-3 flex items-center gap-2 rounded-2xl bg-gradient-to-r from-blush/50 to-petal/30 p-2.5">
          <div className="flex-1 min-w-0">
            <p className="flex items-center gap-1 text-[11px] font-bold text-hotpink leading-tight"><Heart className="h-3 w-3 fill-hotpink" /> Everything is connected for you</p>
            <p className="text-[9px] text-rose/60 leading-tight">Meals + Movement + Cycle = your best results ✿</p>
          </div>
          <button onClick={p.onRegenerate} className="shrink-0 inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-hotpink to-[#DB2777] text-white px-3 py-2 text-[11px] font-bold shadow-md shadow-hotpink/30 active:scale-95 transition"><RefreshCw className="h-3.5 w-3.5" /> Regenerate</button>
        </div>
      </div>
    );
  }

  // ── BEFORE — build your bloom plan ─────────────────────────────────────────
  return (
    <div className="rounded-3xl bg-gradient-to-br from-blush/40 to-petal/20 border border-petal/50 shadow-sm p-3.5 animate-fade-in">
      <p className="text-center text-[12.5px] font-bold text-[#9D174D] flex items-center justify-center gap-1.5"><Sparkles className="h-3.5 w-3.5 text-hotpink" strokeWidth={2} /> Create your personalized plans</p>

      <div className="mt-2.5 grid grid-cols-2 gap-2">
        <StepCard n={1} photo={MEAL_PHOTO} Icon={Utensils} tint="from-hotpink to-[#DB2777]"
          title="Plan my meals" desc="A weekly meal plan with the right calories, macros & nutrient-rich recipes."
          done={p.mealsPlanned}
          cta="Create my meal plan" ctaCls="bg-gradient-to-r from-hotpink to-[#DB2777]"
          onCreate={p.onPlanMeals} onView={p.onViewMeals} onUndo={p.onUnplanMeals} />
        <StepCard n={2} photo={MOVE_PHOTO} Icon={Dumbbell} tint="from-purple-400 to-fuchsia-500"
          title="Plan my movements" desc="A workout & yoga plan that fits your energy, fitness level and goal."
          done={p.movementPlanned}
          cta="Create my movement plan" ctaCls="bg-gradient-to-r from-purple-400 to-fuchsia-500"
          onCreate={p.onPlanMovement} onView={p.onViewMovement} onUndo={p.onUnplanMovement} />
      </div>

      {/* Step 3 — sync */}
      <div className={["mt-2 flex items-center gap-2.5 rounded-2xl border p-2.5", bothPlanned ? "bg-white border-hotpink/40" : "bg-white/70 border-petal/50"].join(" ")}>
        <span className={["grid h-8 w-8 shrink-0 place-items-center rounded-full", bothPlanned ? "bg-gradient-to-br from-hotpink to-[#DB2777] text-white animate-icon-breathe" : "bg-blush/70 text-rose/40"].join(" ")}>
          {bothPlanned ? <Droplet className="h-4 w-4" strokeWidth={2} /> : <Lock className="h-3.5 w-3.5" strokeWidth={2.2} />}
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-[11.5px] font-bold text-[#831843] leading-tight">Step 3 · Sync with my cycle</p>
          <p className="text-[9.5px] text-rose/55 leading-tight">{bothPlanned ? `Tune your plans to your ${phase} phase for the perfect fit.` : "Create both plans first, then sync for phase-based adjustments."}</p>
        </div>
        {bothPlanned ? (
          <button onClick={p.onSyncCycle} className="shrink-0 inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-hotpink to-[#DB2777] text-white px-3 py-1.5 text-[11px] font-bold shadow-md shadow-hotpink/30 active:scale-95 transition animate-selected-glow"><Sparkles className="h-3 w-3" /> Sync now</button>
        ) : (
          <span className="shrink-0 rounded-full bg-blush/70 text-rose/45 px-2.5 py-1 text-[10px] font-bold">Locked</span>
        )}
      </div>

      {/* Why sync */}
      <div className="mt-3">
        <p className="flex items-center gap-1 text-[10.5px] font-bold text-hotpink"><Sparkles className="h-3 w-3" strokeWidth={2} /> Why sync with your cycle?</p>
        <div className="mt-1.5 grid grid-cols-5 gap-1">
          {WHY_SYNC.map((w) => (
            <div key={w.label} className="flex flex-col items-center text-center">
              <span className="grid h-6 w-6 place-items-center rounded-full bg-white text-hotpink shadow-sm"><w.Icon className="h-3 w-3" strokeWidth={2} /></span>
              <span className="mt-0.5 text-[7.5px] font-semibold text-rose/65 leading-tight">{w.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Plus() { return <span className="grid shrink-0 place-items-center self-center text-hotpink/50"><span className="text-lg font-black">+</span></span>; }

function StepCard({ n, photo, Icon, tint, title, desc, done, cta, ctaCls, onCreate, onView, onUndo }: {
  n: number; photo: string; Icon: LucideIcon; tint: string; title: string; desc: string;
  done: boolean; cta: string; ctaCls: string;
  onCreate: () => void; onView: () => void; onUndo?: () => void;
}) {
  return (
    <div className="relative overflow-hidden rounded-2xl bg-white border border-petal/50 p-2.5 flex flex-col">
      <span className="absolute right-2 top-2 z-10 rounded-full bg-hotpink text-white text-[8px] font-black px-1.5 py-0.5 uppercase tracking-wide">Step {n}</span>
      <div className="relative h-16 -mx-2.5 -mt-2.5 mb-1.5 overflow-hidden">
        <img src={photo} alt="" className="absolute inset-0 h-full w-full object-cover" loading="lazy" referrerPolicy="no-referrer" />
        <div className="absolute inset-0 bg-gradient-to-t from-white via-white/30 to-transparent" />
        <span className={["absolute left-2 bottom-1 grid h-9 w-9 place-items-center rounded-full bg-gradient-to-br text-white shadow-md", tint].join(" ")}><Icon className="h-4 w-4" strokeWidth={2} /></span>
      </div>
      <p className="text-[12.5px] font-bold text-[#831843] leading-tight">{title}</p>
      <p className="text-[8.5px] font-bold text-hotpink uppercase tracking-wide">According to my goal</p>
      <p className="mt-1 text-[9px] text-rose/60 leading-tight flex-1">{desc}</p>
      {done ? (
        <>
          <button onClick={onView} className={["mt-2 inline-flex items-center justify-center gap-1 rounded-full text-white px-2.5 py-1.5 text-[10.5px] font-bold active:scale-95 transition", ctaCls].join(" ")}>View plan <ChevronRight className="h-3 w-3" /></button>
          <button onClick={onUndo} disabled={!onUndo} className="mt-1 inline-flex items-center justify-center gap-1 text-[9px] font-bold text-emerald-600 disabled:text-emerald-600/70">
            <span className="grid h-3 w-3 place-items-center rounded-full bg-emerald-500 text-white"><Check className="h-2 w-2" strokeWidth={4} /></span> Created ✿
          </button>
        </>
      ) : (
        <>
          <button onClick={onCreate} className={["mt-2 inline-flex items-center justify-center gap-1 rounded-full text-white px-2.5 py-1.5 text-[10.5px] font-bold active:scale-95 transition animate-selected-glow", ctaCls].join(" ")}>{cta} <ChevronRight className="h-3 w-3" /></button>
          <p className="mt-1 flex items-center gap-1 text-[9px] text-rose/45"><span className="h-2.5 w-2.5 rounded-full border-2 border-hotpink/40" /> Not started yet</p>
        </>
      )}
    </div>
  );
}

function ReadyCard({ photo, Icon, tint, title, status, lines, cta, ctaCls, onCta, imgContain }: {
  photo: string; Icon: LucideIcon; tint: string; title: string; status: string; lines: string[];
  cta: string; ctaCls: string; onCta: () => void; imgContain?: boolean;
}) {
  return (
    <div className="relative flex-1 min-w-0 rounded-2xl bg-white border border-petal/50 p-1.5 flex flex-col items-center text-center">
      {/* pink "done" badge — ringed so the rounded corner never clips it */}
      <span className="absolute -right-1 -top-1 z-10 grid h-5 w-5 place-items-center rounded-full bg-gradient-to-br from-hotpink to-[#DB2777] text-white ring-2 ring-white shadow-sm"><Check className="h-2.5 w-2.5" strokeWidth={3.5} /></span>
      <span className={["grid h-8 w-8 place-items-center rounded-full bg-gradient-to-br text-white shadow-md", tint].join(" ")}><Icon className="h-3.5 w-3.5" strokeWidth={2} /></span>
      <p className="mt-1 text-[10.5px] font-bold text-[#831843] leading-none">{title}</p>
      <p className="text-[8px] font-bold text-emerald-600">{status}</p>
      <div className="my-1 h-11 w-full overflow-hidden rounded-xl bg-blush/40">
        <img src={photo} alt="" className={["h-full w-full", imgContain ? "object-contain" : "object-cover"].join(" ")} loading="lazy" referrerPolicy="no-referrer" />
      </div>
      {/* lines fill the remaining height so every card's CTA lands on one line */}
      <div className="w-full flex-1 flex flex-col justify-start">
        {lines.map((l, i) => <p key={i} className={["leading-tight", i === 0 ? "text-[9px] font-bold text-hotpink" : "text-[8px] text-rose/60"].join(" ")}>{l}</p>)}
      </div>
      <button onClick={onCta} className={["mt-1.5 w-full inline-flex items-center justify-center rounded-full text-white px-1 py-1.5 text-[9px] font-bold active:scale-95 transition", ctaCls].join(" ")}>{cta}</button>
    </div>
  );
}
