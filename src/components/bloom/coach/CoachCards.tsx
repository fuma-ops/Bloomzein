/**
 * The "emotional coach" UI — a warm, phase-aware daily ritual.
 * All data comes from buildDayCoach() (lib/todayCoach.ts), so the full card
 * (Diet), the compact summary (Today), the Tomorrow preview and the phase-reads
 * carousel always tell the same story.
 *
 * Icons are intentionally consistent & pink — no per-phase icon swapping.
 */
import { useState } from "react";
import { ArrowRight, Moon, Sparkles, ChevronRight, Flower2, Clock, Check, CalendarHeart, Leaf, Heart, TrendingUp } from "lucide-react";
import {
  isFeelGoodDone, toggleFeelGoodDone, feelGoodStreak,
  type DayCoach, type FeelGood, type CoachTreat,
} from "@/lib/todayCoach";
import type { Article } from "@/lib/readsData";
import { tr, trx, RTL } from "@/i18n";

/* ---------- energy meter (the cute daily read) ---------- */

function EnergyMeter({ level, label }: { level: number; label: string }) {
  return (
    <div>
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] font-bold uppercase tracking-wide text-rose/60 inline-flex items-center gap-1.5">
          <Sparkles className="h-3.5 w-3.5 text-hotpink" strokeWidth={2} />{" "}{tr("Phase energy")}</p>
        <p className="text-xs font-bold text-hotpink">{trx(label)}</p>
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
      <p className="text-[11px] font-bold uppercase tracking-wide text-rose/55">{trx(label)}</p>
      <div className="mt-1 flex flex-wrap gap-1">
        {items.map((f) => (
          <span
            key={f}
            className={tone === "eat"
              ? "rounded-full bg-blush px-2 py-0.5 text-[11px] font-semibold text-magenta border border-petal/50"
              : "rounded-full bg-white px-2 py-0.5 text-[11px] font-semibold text-rose/65 border border-petal/60"}
          >
            {trx(f)}
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
    return <p className="text-[11px] text-rose/70"><b className="text-hotpink">{tr("Idea ·")}</b> {trx(fallback)}</p>;
  }
  const inner = (
    <>
      <div className="relative shrink-0 h-14 w-14 overflow-hidden rounded-xl ring-1 ring-petal/60 bg-blush">
        <img
          src={treat.image} alt="" className="h-full w-full object-cover" loading="lazy"
          onError={(e) => { const el = e.currentTarget as HTMLImageElement; if (!el.src.endsWith("/images/read-recipes.webp")) el.src = "/images/read-recipes.webp"; }}
        />
      </div>
      <div className="min-w-0 flex-1 text-start">
        <p className="text-[10px] font-bold uppercase tracking-wider text-hotpink/70">{trx(TREAT_KIND_LABEL[treat.kind])}{" "}{tr("for your")}{" "}{tr("{0} phase", { 0: phaseLabel })}</p>
        <p className="text-sm font-bold text-[#831843] leading-snug truncate">{trx(treat.name)}</p>
        <p className="text-[11px] text-rose/60">{trx(treat.calories)}{" "}{tr("kcal ·")}{" "}{trx(treat.protein)}{tr("g protein")}</p>
      </div>
      <ChevronRight className="rtl:-scale-x-100 h-4 w-4 shrink-0 text-hotpink opacity-70 group-hover:opacity-100 transition" />
    </>
  );
  const cls = "group w-full flex items-center gap-3 rounded-2xl bg-blush/40 border border-petal/50 p-2 transition hover:bg-blush/60 active:scale-[0.99]";
  // Prefer an in-page recipe popup (no navigation); fall back to Meals.
  return onOpenRecipe
    ? <button type="button" onClick={() => onOpenRecipe(treat.recipeId)} className={cls}>{trx(inner)}</button>
    : <a href="/app/tools/meals" className={cls}>{trx(inner)}</a>;
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
        <p className="absolute top-2.5 start-3 inline-flex items-center gap-1 rounded-full bg-white/90 backdrop-blur px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-hotpink">
          <Sparkles className="h-3 w-3" strokeWidth={2} />{" "}{tr("A moment for you")}</p>
        {streak > 0 && (
          <span className="absolute top-2.5 end-3 inline-flex items-center gap-1 rounded-full bg-hotpink text-white px-2.5 py-1 text-[10px] font-bold shadow">
            <Flower2 className="h-3 w-3" strokeWidth={2} /> {trx(streak)}{tr("-day streak")}</span>
        )}
        <span className="absolute bottom-2 start-3 text-3xl leading-none drop-shadow-lg">{trx(fg.emoji)}</span>
      </div>

      <div className="p-3.5">
        <p className="text-[13.5px] leading-snug text-[#831843] font-medium">{trx(fg.text)}</p>
        <div className="mt-3 flex items-center gap-2">
          {fg.ctaLabel && fg.ctaHref && (
            <a
              href={fg.ctaHref}
              className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-hotpink to-magenta px-4 py-2 text-[12px] font-bold text-white shadow-md shadow-hotpink/25 transition hover:brightness-105 active:scale-95"
            >
              {trx(fg.ctaLabel)} <ArrowRight className="rtl:-scale-x-100 h-3.5 w-3.5" strokeWidth={2.5} />
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
            {done ? <><Check className="h-3.5 w-3.5" strokeWidth={3} />{" "}{tr("Loved it ✿")}</> : <><Flower2 className="h-3.5 w-3.5" strokeWidth={2.2} />{" "}{tr("I did it ✿")}</>}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ---------- FULL coach card (Diet · Cycle Nutrition) ---------- */

export function CoachTodayCard({ coach, onOpenRecipe }: { coach: DayCoach; onOpenRecipe?: (recipeId: string) => void }) {
  const cardCls = "rounded-[1.6rem] border border-hotpink/30 bg-white/90 backdrop-blur p-4 sm:p-5 shadow-lg shadow-hotpink/10 animate-card-pop-in";
  return (
    <div className="space-y-4">
      {/* ── Section 1 · your phase ── */}
      <div className={cardCls}>
        <div className="flex items-center justify-between gap-2">
          <div>
            <p className="font-script text-2xl text-hotpink leading-none">{tr("{0} phase", { 0: coach.phaseLabel })}</p>
            <p className="mt-0.5 text-[11px] font-semibold text-rose/60">{tr("Day")}{" "}{trx(coach.cycleDay)}{" "}{tr("of your cycle")}</p>
          </div>
          <span className="shrink-0 rounded-full bg-hotpink text-white text-[10px] font-bold uppercase tracking-wide px-2.5 py-1">{tr("Today")}</span>
        </div>

        <div className="mt-3"><EnergyMeter level={coach.energy.level} label={coach.energy.label} /></div>

        <p className="mt-3 rounded-2xl bg-blush/50 border border-petal/50 px-3.5 py-2.5 text-[13px] leading-snug text-[#831843]">
          {trx(coach.need)}
        </p>

        <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <ChipRow label={tr("Eat more")} items={coach.eat.slice(0, 5)} tone="eat" />
          <ChipRow label={tr("Ease up on")} items={coach.avoid.slice(0, 4)} tone="avoid" />
        </div>
      </div>

      {/* ── Section 2 · for your soft self (a treat) ── */}
      <div className={cardCls}>
        <Signal>{tr("For your soft self")}</Signal>
        <TreatCard treat={coach.treat} fallback={coach.snack} phaseLabel={coach.phaseLabel} onOpenRecipe={onOpenRecipe} />
      </div>

      {/* → the real Today's Plan on the Today page */}
      <div className="flex justify-center">
        <a
          href="/app/today#todays-plan"
          className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-hotpink to-magenta px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-hotpink/25 transition hover:brightness-105 active:scale-95"
        >
          <CalendarHeart className="h-4 w-4" strokeWidth={2} />{" "}{tr("See today's plan")}{" "}<ArrowRight className="rtl:-scale-x-100 h-4 w-4" strokeWidth={2.5} />
        </a>
      </div>
    </div>
  );
}

/* ---------- COMPACT coach (Today page summary) — image-rich ---------- */

// The five daily "guide" lanes — each opens a real tool, so the pretty card is
// also a working shortcut into her actual plan.
const BLOOM_GUIDE: { key: string; Icon: typeof Heart; title: string; sub: string; href: string; image: string }[] = [
  { key: "nutrition", Icon: Leaf,    title: tr("Nutrition"), sub: tr("Eat for energy & glow"),     href: "/app/tools/diet",    image: "/images/meal-oats.webp" },
  { key: "movement",  Icon: Flower2, title: tr("Movement"),  sub: tr("Flow to boost your mood"),    href: "/app/tools/workout", image: "/images/yoga-hero.webp" },
  { key: "selfcare",  Icon: Sparkles,title: tr("Self-care"), sub: tr("Treat yourself with love"),   href: "/app/read",          image: "/images/diary-bg-floral.webp" },
  { key: "mindset",   Icon: Heart,   title: tr("Mindset"),   sub: tr("A tiny thought changes all"), href: "/app/tools/diary",   image: "/images/cycle-journal-hero.webp" },
  { key: "lifestyle", Icon: Flower2, title: tr("Lifestyle"), sub: tr("Small moments, a soft life"), href: "/app/read",          image: "/images/dreamy-book.webp" },
];

export function CoachTodayCompact({ coach }: { coach: DayCoach }) {
  return (
    <section className="relative overflow-hidden rounded-[1.75rem] border border-petal/60 bg-gradient-to-br from-blush/55 via-white to-petal/35 shadow-[0_16px_40px_rgba(219,39,119,0.12)] animate-card-pop-in">
      {/* ── Header — a dedicated hero section with the lifestyle photo as its
             full BACKGROUND, behind a left-weighted scrim so the copy stays
             perfectly legible while the photo shows through on the right. ── */}
      <div className="relative m-3 sm:m-4 overflow-hidden rounded-[1.4rem] border border-petal/50 shadow-sm">
        <img
          src={RTL ? "/images/today-hero.webp" : "/images/coach-bloom-hero.webp"} alt="" loading="lazy"
          className="bz-flip-rtl pointer-events-none absolute inset-0 h-full w-full object-cover object-top"
          onError={(e) => { const el = e.currentTarget as HTMLImageElement; if (!el.src.endsWith("/images/hero-girl.webp")) el.src = "/images/hero-girl.webp"; }}
        />
        {/* readability scrim — strong on the left (text), clearing on the right (photo) */}
        <div className="bz-flip-rtl pointer-events-none absolute inset-0 bg-gradient-to-r from-white/95 via-white/88 sm:via-white/78 to-white/30 sm:to-transparent" />

        <div className="relative p-4 sm:p-5 max-w-full sm:max-w-[64%]">
          <div className="flex items-center gap-2.5">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-hotpink to-magenta text-white shadow-md shadow-hotpink/30"><Flower2 className="h-5 w-5" strokeWidth={1.9} /></span>
            <h2 className="inline-flex items-center gap-1.5 font-script text-[1.8rem] sm:text-4xl text-hotpink leading-none drop-shadow-[0_1px_3px_rgba(255,255,255,0.9)]">{tr("Bloom Inspiration")}{" "}<Sparkles className="h-4 w-4" strokeWidth={2} /></h2>
          </div>
          <p className="mt-2.5 text-[15px] sm:text-lg font-black text-[#831843] leading-tight drop-shadow-[0_1px_2px_rgba(255,255,255,0.85)]">{tr("Your day, beautifully guided")}{" "}<span className="text-hotpink">🩷</span></p>
          <p className="mt-1 text-[12px] sm:text-[13px] text-rose/75 leading-snug drop-shadow-[0_1px_2px_rgba(255,255,255,0.8)]">{tr("Personalized ideas & gentle reminders to help you feel your best today.")}</p>

          {/* Phase + energy — real, from her cycle */}
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/90 border border-petal/60 px-3 py-1.5 shadow-sm">
              <Flower2 className="h-3.5 w-3.5 text-hotpink" strokeWidth={2} />
              <span className="text-[11px] font-bold text-[#831843]">{tr("You're in")}{" "}<span className="text-hotpink">{trx(coach.phaseLabel)}</span>{Number.isFinite(coach.cycleDay) ? <>{" "}{tr("· Day")}{" "}{trx(coach.cycleDay)}</> : null}</span>
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/90 border border-petal/60 px-3 py-1.5 shadow-sm">
              <span className="text-[10px] font-bold uppercase tracking-wide text-rose/55">{tr("Energy")}</span>
              <span className="text-[11px] font-black text-hotpink">{trx(coach.energy.label)}</span>
              <TrendingUp className="h-3.5 w-3.5 text-hotpink" strokeWidth={2.4} />
            </span>
          </div>

          {/* Coach's one warm line for today (real content) */}
          <p className="mt-3 text-[12.5px] leading-snug text-[#831843] drop-shadow-[0_1px_2px_rgba(255,255,255,0.8)]">{trx(coach.need)}</p>

          <a href="/app/tools/diet?tab=cycle" className="mt-3.5 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-hotpink to-magenta px-5 py-2.5 text-[13px] font-bold text-white shadow-md shadow-hotpink/30 transition hover:brightness-105 active:scale-95 animate-selected-glow">{tr("See today's guide")}{" "}<ArrowRight className="rtl:-scale-x-100 h-4 w-4" strokeWidth={2.5} />
          </a>
        </div>
      </div>

      {/* ── Five guide lanes ── */}
      <div className="px-4 sm:px-5 pb-2">
        <div className="flex gap-2.5 overflow-x-auto pb-2 -mx-1 px-1 snap-x snap-mandatory [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {BLOOM_GUIDE.map((g) => (
            <a key={g.key} href={g.href} className="group/card relative w-[150px] sm:w-[168px] shrink-0 snap-start overflow-hidden rounded-2xl bg-white/85 border border-petal/50 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md active:scale-[0.98]">
              <div className="relative h-20 w-full overflow-hidden bg-blush">
                <img src={g.image} alt="" className="h-full w-full object-cover transition duration-500 group-hover/card:scale-105" loading="lazy"
                  onError={(e) => { const el = e.currentTarget as HTMLImageElement; if (!el.src.endsWith("/images/read-recipes.webp")) el.src = "/images/read-recipes.webp"; }} />
                <span className="absolute start-2 top-2 grid h-7 w-7 place-items-center rounded-full bg-white/90 text-hotpink shadow-sm"><g.Icon className="h-4 w-4" strokeWidth={2} /></span>
              </div>
              <div className="p-2.5">
                <div className="flex items-center justify-between gap-1">
                  <p className="text-[13px] font-black text-[#831843] leading-tight">{trx(g.title)}</p>
                  <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-gradient-to-br from-hotpink to-magenta text-white shadow-sm transition group-hover/card:scale-110"><ArrowRight className="rtl:-scale-x-100 h-3.5 w-3.5" strokeWidth={2.5} /></span>
                </div>
                <p className="mt-0.5 text-[10.5px] text-rose/60 leading-snug">{trx(g.sub)}</p>
              </div>
            </a>
          ))}
        </div>
      </div>

      {/* ── Footer ── */}
      <a href="/app/tools" className="flex items-center justify-between gap-2 border-t border-petal/50 bg-white/45 px-4 py-2.5 sm:px-5 transition hover:bg-white/70">
        <p className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-rose/70"><Sparkles className="h-3.5 w-3.5 text-hotpink" strokeWidth={2} />{" "}{tr("New ideas every day,")}{" "}<span className="font-black text-hotpink">{tr("just for you")}</span> <Heart className="h-3 w-3 text-hotpink" fill="currentColor" /></p>
        <span className="shrink-0 inline-flex items-center gap-1 text-[12px] font-bold text-hotpink">{tr("View all")}{" "}<ArrowRight className="rtl:-scale-x-100 h-3.5 w-3.5" strokeWidth={2.5} /></span>
      </a>
    </section>
  );
}

/* ---------- Tomorrow preview — richer, curious ---------- */

export function TomorrowCard({ coach }: { coach: DayCoach }) {
  const t = coach.tomorrow;
  return (
    <div className="rounded-[1.5rem] border border-petal/60 bg-gradient-to-br from-violet-50/60 via-white to-blush/40 p-4 animate-card-pop-in">
      <p className="inline-flex items-center gap-1.5 font-script text-2xl text-hotpink leading-none">
        <Moon className="h-4 w-4 text-hotpink" strokeWidth={2} />{" "}{tr("Tomorrow with Bloomzein")}</p>
      <div className="mt-1.5 flex items-baseline justify-between gap-2">
        <p className="font-script text-xl text-hotpink leading-tight">{trx(t.phaseLabel)}{" "}{tr("· Day")}{" "}{trx(t.cycleDay)}</p>
        <span className="text-[11px] font-bold text-hotpink inline-flex items-center gap-1"><Sparkles className="h-3 w-3" strokeWidth={2} /> {trx(t.energyLabel)}</span>
      </div>
      <p className="mt-0.5 text-[13px] leading-snug text-[#831843]">{tr("Here's how you'll live it:")}{" "}{trx(t.liveIt)}
      </p>
      {t.eatPeek.length > 0 && (
        <div className="mt-2 flex flex-wrap items-center gap-1">
          <span className="text-[10px] font-bold uppercase tracking-wide text-rose/50">{tr("On the menu ·")}</span>
          {t.eatPeek.map((f) => (
            <span key={f} className="rounded-full bg-white/80 border border-petal/50 px-2 py-0.5 text-[10.5px] font-semibold text-magenta">{trx(f)}</span>
          ))}
        </div>
      )}
      {t.comingUp && (
        <p className="mt-2.5 rounded-xl bg-hotpink/8 border border-hotpink/15 px-3 py-1.5 text-[11.5px] font-semibold text-hotpink inline-flex items-center gap-1.5">
          <Sparkles className="h-3.5 w-3.5" strokeWidth={2} />{" "}{tr("Coming up: your")}{" "}{trx(t.comingUp.phaseLabel)}{" "}{tr("phase in")}{" "}{trx(t.comingUp.inDays)}{" "}{tr("day")}{t.comingUp.inDays === 1 ? "" : "s"} ✨
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
              <span className="absolute top-3 start-3 inline-block rounded-full bg-white/85 backdrop-blur px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-hotpink border border-petal/60">{trx(a.category)}</span>
              <div className="absolute inset-x-0 bottom-0 p-3.5">
                <h4 className="font-script text-2xl text-white leading-none" style={{ textShadow: "0 2px 8px rgba(0,0,0,0.35)" }}>{trx(a.title)}</h4>
                <p className="mt-1 text-[11.5px] text-white/95 leading-snug line-clamp-2" style={{ textShadow: "0 1px 5px rgba(0,0,0,0.4)" }}>{trx(a.excerpt)}</p>
                <div className="mt-1.5 flex items-center gap-3 text-white/95">
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold"><Clock className="h-3 w-3" strokeWidth={2} /> {trx(a.minutes)}{" "}{tr("min")}</span>
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold"><Flower2 className="h-3 w-3" strokeWidth={2} /> {trx(a.blooms)}</span>
                </div>
              </div>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}
