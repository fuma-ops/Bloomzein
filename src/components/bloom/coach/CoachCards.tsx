/**
 * The "emotional coach" UI — a warm, phase-aware daily ritual.
 * All data comes from buildDayCoach() (lib/todayCoach.ts), so the full card
 * (Diet), the compact summary (Today), the Tomorrow preview and the phase-reads
 * carousel always tell the same story.
 *
 * Icons are intentionally consistent & pink — no per-phase icon swapping.
 */
import { useState } from "react";
import { ArrowRight, Moon, Sparkles, ChevronRight, Flower2, Clock, Check, CalendarHeart } from "lucide-react";
import {
  isFeelGoodDone, toggleFeelGoodDone, feelGoodStreak,
  type DayCoach, type FeelGood, type CoachTreat,
} from "@/lib/todayCoach";
import type { Article } from "@/lib/readsData";

/* ---------- energy meter (the cute daily read) ---------- */

function EnergyMeter({ level, label }: { level: number; label: string }) {
  return (
    <div>
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] font-bold uppercase tracking-wide text-rose/60 inline-flex items-center gap-1.5">
          <Sparkles className="h-3.5 w-3.5 text-hotpink" strokeWidth={2} /> Phase energy
        </p>
        <p className="text-xs font-bold text-hotpink">{label}</p>
      </div>
      <div className="mt-1.5 h-2.5 w-full rounded-full bg-blush/70 overflow-hidden">
        <div
          className="h-full rounded-full bg-gradient-to-r from-petal via-hotpink to-magenta transition-[width] duration-700 ease-out"
          style={{ width: `${Math.max(6, Math.min(100, level))}%` }}
        />
      </div>
    </div>
  );
}

/* ---------- eat / ease-up chips ---------- */

function ChipRow({ label, items, tone }: { label: string; items: string[]; tone: "eat" | "avoid" }) {
  return (
    <div>
      <p className="text-[11px] font-bold uppercase tracking-wide text-rose/55">{label}</p>
      <div className="mt-1 flex flex-wrap gap-1">
        {items.map((f) => (
          <span
            key={f}
            className={tone === "eat"
              ? "rounded-full bg-blush px-2 py-0.5 text-[11px] font-semibold text-magenta border border-petal/50"
              : "rounded-full bg-white px-2 py-0.5 text-[11px] font-semibold text-rose/65 border border-petal/60"}
          >
            {f}
          </span>
        ))}
      </div>
    </div>
  );
}

/* ---------- soft section signal (a gentle little title) ---------- */

function Signal({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-1.5 text-[12px] font-bold uppercase tracking-widest text-hotpink/75 inline-flex items-center gap-1.5">
      <Flower2 className="h-3.5 w-3.5" strokeWidth={2} /> {children}
    </p>
  );
}

/* ---------- a little treat from Meals — opens the recipe in a popup ---------- */

const TREAT_KIND_LABEL: Record<CoachTreat["kind"], string> = { snack: "Snack", juice: "Juice", dessert: "Sweet treat" };

function TreatCard({ treat, fallback, phaseLabel, onOpenRecipe }: {
  treat: CoachTreat | null; fallback: string; phaseLabel: string; onOpenRecipe?: (recipeId: string) => void;
}) {
  if (!treat) {
    return <p className="text-[11px] text-rose/70"><b className="text-hotpink">Idea ·</b> {fallback}</p>;
  }
  const inner = (
    <>
      <div className="relative shrink-0 h-14 w-14 overflow-hidden rounded-xl ring-1 ring-petal/60 bg-blush">
        <img
          src={treat.image} alt="" className="h-full w-full object-cover" loading="lazy"
          onError={(e) => { const el = e.currentTarget as HTMLImageElement; if (!el.src.endsWith("/images/read-recipes.webp")) el.src = "/images/read-recipes.webp"; }}
        />
      </div>
      <div className="min-w-0 flex-1 text-left">
        <p className="text-[10px] font-bold uppercase tracking-wider text-hotpink/70">{TREAT_KIND_LABEL[treat.kind]} for your {phaseLabel} phase</p>
        <p className="text-sm font-bold text-[#831843] leading-snug truncate">{treat.name}</p>
        <p className="text-[11px] text-rose/60">{treat.calories} kcal · {treat.protein}g protein</p>
      </div>
      <ChevronRight className="h-4 w-4 shrink-0 text-hotpink opacity-70 group-hover:opacity-100 transition" />
    </>
  );
  const cls = "group w-full flex items-center gap-3 rounded-2xl bg-blush/40 border border-petal/50 p-2 transition hover:bg-blush/60 active:scale-[0.99]";
  // Prefer an in-page recipe popup (no navigation); fall back to Meals.
  return onOpenRecipe
    ? <button type="button" onClick={() => onOpenRecipe(treat.recipeId)} className={cls}>{inner}</button>
    : <a href="/app/tools/meals" className={cls}>{inner}</a>;
}

/* ---------- feel-good "your moment" — big image + a daily streak ---------- */

export function FeelGoodCard({ fg, className = "" }: { fg: FeelGood; className?: string }) {
  const [done, setDone] = useState(() => isFeelGoodDone());
  const [streak, setStreak] = useState(() => feelGoodStreak());
  const toggle = () => { const n = toggleFeelGoodDone(); setDone(n); setStreak(feelGoodStreak()); };

  return (
    <div className={["relative overflow-hidden rounded-[1.5rem] border border-hotpink/25 bg-gradient-to-br from-blush/70 via-white to-petal/30 animate-selected-glow", className].join(" ")}>
      {/* big attention-grabbing image */}
      <div className="relative h-32 sm:h-36 w-full overflow-hidden">
        <img src={fg.image} alt="" className="h-full w-full object-cover" loading="lazy" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-black/5 to-transparent" />
        <p className="absolute top-2.5 left-3 inline-flex items-center gap-1 rounded-full bg-white/90 backdrop-blur px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-hotpink">
          <Sparkles className="h-3 w-3" strokeWidth={2} /> A moment for you
        </p>
        {streak > 0 && (
          <span className="absolute top-2.5 right-3 inline-flex items-center gap-1 rounded-full bg-hotpink text-white px-2.5 py-1 text-[10px] font-bold shadow">
            <Flower2 className="h-3 w-3" strokeWidth={2} /> {streak}-day streak
          </span>
        )}
        <span className="absolute bottom-2 left-3 text-3xl leading-none drop-shadow-lg">{fg.emoji}</span>
      </div>

      <div className="p-3.5">
        <p className="text-[13.5px] leading-snug text-[#831843] font-medium">{fg.text}</p>
        <div className="mt-3 flex items-center gap-2">
          {fg.ctaLabel && fg.ctaHref && (
            <a
              href={fg.ctaHref}
              className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-hotpink to-magenta px-4 py-2 text-[12px] font-bold text-white shadow-md shadow-hotpink/25 transition hover:brightness-105 active:scale-95"
            >
              {fg.ctaLabel} <ArrowRight className="h-3.5 w-3.5" strokeWidth={2.5} />
            </a>
          )}
          <button
            onClick={toggle}
            className={[
              "inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-[12px] font-bold transition active:scale-95",
              done
                ? "bg-hotpink text-white shadow-md shadow-hotpink/25"
                : "bg-white text-hotpink border border-hotpink/40 hover:bg-blush/50",
            ].join(" ")}
          >
            {done ? <><Check className="h-3.5 w-3.5" strokeWidth={3} /> Loved it ✿</> : <><Flower2 className="h-3.5 w-3.5" strokeWidth={2.2} /> I did it ✿</>}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ---------- FULL coach card (Diet · Cycle Nutrition) ---------- */

export function CoachTodayCard({ coach, onOpenRecipe }: { coach: DayCoach; onOpenRecipe?: (recipeId: string) => void }) {
  return (
    <div className="rounded-[1.6rem] border border-hotpink/30 bg-white/90 backdrop-blur p-4 sm:p-5 shadow-lg shadow-hotpink/10 animate-card-pop-in">
      {/* header */}
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="font-script text-2xl text-hotpink leading-none">{coach.phaseLabel} phase</p>
          <p className="mt-0.5 text-[11px] font-semibold text-rose/60">Day {coach.cycleDay} of your cycle</p>
        </div>
        <span className="shrink-0 rounded-full bg-hotpink text-white text-[10px] font-bold uppercase tracking-wide px-2.5 py-1">Today</span>
      </div>

      <div className="mt-3"><EnergyMeter level={coach.energy.level} label={coach.energy.label} /></div>

      {/* need line */}
      <p className="mt-3 rounded-2xl bg-blush/50 border border-petal/50 px-3.5 py-2.5 text-[13px] leading-snug text-[#831843]">
        {coach.need}
      </p>

      {/* eat / ease up */}
      <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
        <ChipRow label="Eat more" items={coach.eat.slice(0, 5)} tone="eat" />
        <ChipRow label="Ease up on" items={coach.avoid.slice(0, 4)} tone="avoid" />
      </div>

      {/* a treat (snack / juice / dessert), from Meals, opens in a popup */}
      <div className="mt-4">
        <Signal>For your soft self</Signal>
        <TreatCard treat={coach.treat} fallback={coach.snack} phaseLabel={coach.phaseLabel} onOpenRecipe={onOpenRecipe} />
      </div>

      {/* feel-good */}
      <div className="mt-4">
        <Signal>Make yourself comfortable</Signal>
        <FeelGoodCard fg={coach.feelGood} />
      </div>

      {/* → the real Today's Plan on the Today page */}
      <div className="mt-4 flex justify-center">
        <a
          href="/app/today#todays-plan"
          className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-hotpink to-magenta px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-hotpink/25 transition hover:brightness-105 active:scale-95"
        >
          <CalendarHeart className="h-4 w-4" strokeWidth={2} /> See today's plan <ArrowRight className="h-4 w-4" strokeWidth={2.5} />
        </a>
      </div>
    </div>
  );
}

/* ---------- COMPACT coach (Today page summary) — image-rich ---------- */

export function CoachTodayCompact({ coach }: { coach: DayCoach }) {
  return (
    <a href="/app/tools/diet?tab=cycle" className="group block rounded-[1.5rem] border border-hotpink/25 bg-white/90 backdrop-blur p-4 shadow-md shadow-hotpink/10 transition hover:-translate-y-0.5 hover:shadow-lg hover:shadow-hotpink/15 active:scale-[0.99] animate-card-pop-in">
      <div className="flex items-center justify-between gap-2">
        <p className="inline-flex items-center gap-1.5 font-script text-2xl text-hotpink leading-none">
          <Sparkles className="h-4 w-4" strokeWidth={2} /> Your coach today
        </p>
        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-hotpink animate-soft-glow">
          Full plan <ChevronRight className="h-3 w-3" />
        </span>
      </div>
      <p className="mt-2 text-[13px] leading-snug text-[#831843] font-medium">{coach.need}</p>
      <div className="mt-2.5"><EnergyMeter level={coach.energy.level} label={coach.energy.label} /></div>
      {/* the feel-good peek — with the proposed read/meal photo */}
      <div className="mt-2.5 flex items-center gap-3 rounded-2xl bg-blush/40 border border-petal/40 p-2">
        <div className="relative shrink-0 h-16 w-16 overflow-hidden rounded-xl ring-1 ring-petal/60">
          <img src={coach.feelGood.image} alt="" className="h-full w-full object-cover" loading="lazy" />
          <span className="absolute bottom-0.5 left-0.5 text-lg leading-none drop-shadow">{coach.feelGood.emoji}</span>
        </div>
        <p className="text-[12px] leading-snug text-[#831843] line-clamp-3">{coach.feelGood.text}</p>
      </div>
    </a>
  );
}

/* ---------- Tomorrow preview — richer, curious ---------- */

export function TomorrowCard({ coach }: { coach: DayCoach }) {
  const t = coach.tomorrow;
  return (
    <div className="rounded-[1.5rem] border border-petal/60 bg-gradient-to-br from-violet-50/60 via-white to-blush/40 p-4 animate-card-pop-in">
      <p className="inline-flex items-center gap-1.5 font-script text-2xl text-hotpink leading-none">
        <Moon className="h-4 w-4 text-hotpink" strokeWidth={2} /> Tomorrow with Bloomzein
      </p>
      <div className="mt-1.5 flex items-baseline justify-between gap-2">
        <p className="font-script text-xl text-hotpink leading-tight">{t.phaseLabel} · Day {t.cycleDay}</p>
        <span className="text-[11px] font-bold text-hotpink inline-flex items-center gap-1"><Sparkles className="h-3 w-3" strokeWidth={2} /> {t.energyLabel}</span>
      </div>
      <p className="mt-0.5 text-[13px] leading-snug text-[#831843]">
        Here's how you'll live it: {t.liveIt}
      </p>
      {t.eatPeek.length > 0 && (
        <div className="mt-2 flex flex-wrap items-center gap-1">
          <span className="text-[10px] font-bold uppercase tracking-wide text-rose/50">On the menu ·</span>
          {t.eatPeek.map((f) => (
            <span key={f} className="rounded-full bg-white/80 border border-petal/50 px-2 py-0.5 text-[10.5px] font-semibold text-magenta">{f}</span>
          ))}
        </div>
      )}
      {t.comingUp && (
        <p className="mt-2.5 rounded-xl bg-hotpink/8 border border-hotpink/15 px-3 py-1.5 text-[11.5px] font-semibold text-hotpink inline-flex items-center gap-1.5">
          <Sparkles className="h-3.5 w-3.5" strokeWidth={2} /> Coming up: your {t.comingUp.phaseLabel} phase in {t.comingUp.inDays} day{t.comingUp.inDays === 1 ? "" : "s"} ✨
        </p>
      )}
    </div>
  );
}

/* ---------- Phase reads — swipeable photo carousel (Diet) ---------- */

export function PhaseReads({ reads }: { reads: Article[] }) {
  if (!reads.length) return null;
  return (
    <div className="relative -mx-1 px-1">
      <div className="flex gap-3 pb-1 overflow-x-auto no-scrollbar snap-x">
        {reads.map((a, i) => (
          <a
            key={a.id}
            href={`/app/read?a=${a.id}`}
            style={{ animationDelay: `${i * 0.06}s` }}
            className="group relative snap-start shrink-0 w-[76%] sm:w-[17rem] overflow-hidden rounded-3xl border border-petal/60 shadow-[0_12px_30px_-14px_oklch(0.7_0.22_350/0.45)] transition hover:-translate-y-1 active:scale-[0.98] animate-card-pop-in"
          >
            <div className="relative h-48 sm:h-52">
              <img src={a.image} alt="" className="block h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" loading="lazy" />
              <div className="absolute inset-0 bg-gradient-to-t from-magenta/85 via-magenta/20 to-transparent" />
              <span className="absolute top-3 left-3 inline-block rounded-full bg-white/85 backdrop-blur px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-hotpink border border-petal/60">{a.topic}</span>
              <div className="absolute inset-x-0 bottom-0 p-3.5">
                <h4 className="font-script text-2xl text-white leading-none" style={{ textShadow: "0 2px 8px rgba(0,0,0,0.35)" }}>{a.title}</h4>
                <p className="mt-1 text-[11.5px] text-white/95 leading-snug line-clamp-2" style={{ textShadow: "0 1px 5px rgba(0,0,0,0.4)" }}>{a.excerpt}</p>
                <div className="mt-1.5 flex items-center gap-3 text-white/95">
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold"><Clock className="h-3 w-3" strokeWidth={2} /> {a.minutes} min</span>
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold"><Flower2 className="h-3 w-3" strokeWidth={2} /> {a.blooms}</span>
                </div>
              </div>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}
