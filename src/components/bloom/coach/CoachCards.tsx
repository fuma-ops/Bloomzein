/**
 * The "emotional coach" UI — a warm, phase-aware daily ritual.
 * All data comes from buildDayCoach() (lib/todayCoach.ts), so the full card
 * (Diet), the compact summary (Today), the Tomorrow preview and the locked-peek
 * phase strip always tell the same story.
 */
import { ArrowRight, Lock, Moon, Sun, Sunrise, Sunset, Sparkles, ChevronRight } from "lucide-react";
import type { DayCoach, EnergyRead, FeelGood, PhaseUnlock } from "@/lib/todayCoach";

/* ---------- energy meter (the cute daily read) ---------- */

const ENERGY_ICON: Record<EnergyRead, typeof Sun> = {
  low: Moon, rising: Sunrise, peak: Sun, winding: Sunset,
};

function EnergyMeter({ level, label, read }: { level: number; label: string; read: EnergyRead }) {
  const Icon = ENERGY_ICON[read];
  return (
    <div>
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] font-bold uppercase tracking-wide text-rose/60 inline-flex items-center gap-1.5">
          <Icon className="h-3.5 w-3.5 text-hotpink" strokeWidth={2} /> Your energy
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

/* ---------- feel-good "your moment" block ---------- */

export function FeelGoodCard({ fg, className = "" }: { fg: FeelGood; className?: string }) {
  return (
    <div className={["relative overflow-hidden rounded-[1.4rem] border border-hotpink/25 bg-gradient-to-br from-blush/70 via-white to-petal/30 p-4 animate-selected-glow", className].join(" ")}>
      <Sparkles className="pointer-events-none absolute -top-1 right-2 h-4 w-4 text-hotpink/50 animate-sparkle-drift" strokeWidth={1.8} />
      <p className="text-[10px] font-bold uppercase tracking-widest text-hotpink/70">A moment for you ✿</p>
      <div className="mt-1.5 flex items-start gap-2.5">
        <span className="text-2xl leading-none shrink-0">{fg.emoji}</span>
        <p className="text-[13px] leading-snug text-[#831843] font-medium">{fg.text}</p>
      </div>
      {fg.ctaLabel && fg.ctaHref && (
        <a
          href={fg.ctaHref}
          className="mt-2.5 inline-flex items-center gap-1 rounded-full bg-hotpink px-3 py-1 text-[11px] font-bold text-white transition hover:bg-magenta active:scale-95"
        >
          {fg.ctaLabel} <ArrowRight className="h-3 w-3" strokeWidth={2.5} />
        </a>
      )}
    </div>
  );
}

/* ---------- FULL coach card (Diet · Cycle Nutrition) ---------- */

export function CoachTodayCard({ coach, onSyncedPlan }: { coach: DayCoach; onSyncedPlan?: () => void }) {
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

      <div className="mt-3"><EnergyMeter level={coach.energy.level} label={coach.energy.label} read={coach.energy.read} /></div>

      {/* need line */}
      <p className="mt-3 rounded-2xl bg-blush/50 border border-petal/50 px-3.5 py-2.5 text-[13px] leading-snug text-[#831843]">
        {coach.need}
      </p>

      {/* eat / ease up */}
      <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
        <ChipRow label="Eat more" items={coach.eat.slice(0, 5)} tone="eat" />
        <ChipRow label="Ease up on" items={coach.avoid.slice(0, 4)} tone="avoid" />
      </div>
      <p className="mt-2 text-[11px] text-rose/70"><b className="text-hotpink">Snack idea ·</b> {coach.snack}</p>

      {/* feel-good */}
      <FeelGoodCard fg={coach.feelGood} className="mt-3" />

      {onSyncedPlan && (
        <button
          onClick={onSyncedPlan}
          className="mt-3 w-full inline-flex items-center justify-center gap-1.5 rounded-full bloom-luxury-btn text-white px-4 py-2 text-sm font-semibold"
        >
          ✿ See today's synced plan <ChevronRight className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

/* ---------- COMPACT coach (Today page summary) ---------- */

export function CoachTodayCompact({ coach }: { coach: DayCoach }) {
  const Icon = ENERGY_ICON[coach.energy.read];
  return (
    <a href="/app/tools/diet" className="group block rounded-[1.5rem] border border-hotpink/25 bg-white/90 backdrop-blur p-4 shadow-md shadow-hotpink/10 transition hover:-translate-y-0.5 hover:shadow-lg hover:shadow-hotpink/15 active:scale-[0.99] animate-card-pop-in">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[10px] font-bold uppercase tracking-widest text-hotpink/70 inline-flex items-center gap-1.5">
          <Icon className="h-3.5 w-3.5" strokeWidth={2} /> Your coach today
        </p>
        <span className="text-[11px] font-bold text-hotpink inline-flex items-center gap-0.5 opacity-70 group-hover:opacity-100 transition">
          Full plan <ChevronRight className="h-3.5 w-3.5" />
        </span>
      </div>
      <p className="mt-2 text-[13px] leading-snug text-[#831843] font-medium">{coach.need}</p>
      <div className="mt-2.5"><EnergyMeter level={coach.energy.level} label={coach.energy.label} read={coach.energy.read} /></div>
      {/* the feel-good peek */}
      <div className="mt-2.5 flex items-start gap-2 rounded-2xl bg-blush/40 border border-petal/40 px-3 py-2">
        <span className="text-lg leading-none shrink-0">{coach.feelGood.emoji}</span>
        <p className="text-[12px] leading-snug text-[#831843]">{coach.feelGood.text}</p>
      </div>
    </a>
  );
}

/* ---------- Tomorrow preview ---------- */

export function TomorrowCard({ coach }: { coach: DayCoach }) {
  const t = coach.tomorrow;
  return (
    <div className="rounded-[1.5rem] border border-petal/60 bg-gradient-to-br from-violet-50/60 via-white to-blush/40 p-4 animate-card-pop-in">
      <p className="text-[10px] font-bold uppercase tracking-widest text-magenta/70 inline-flex items-center gap-1.5">
        <Moon className="h-3.5 w-3.5" strokeWidth={2} /> Tomorrow with Bloomzein
      </p>
      <p className="mt-1.5 font-script text-xl text-hotpink leading-tight">
        {t.phaseLabel} · Day {t.cycleDay}
      </p>
      <p className="mt-0.5 text-[13px] leading-snug text-[#831843]">
        Here's how you'll live it: {t.liveIt}
      </p>
    </div>
  );
}

/* ---------- Locked-peek phase strip ---------- */

const UNLOCK_ICON: Record<string, typeof Sun> = {
  menstrual: Moon, follicular: Sunrise, ovulatory: Sun, luteal: Sunset,
};

export function PhaseUnlockStrip({ unlocks }: { unlocks: PhaseUnlock[] }) {
  return (
    <div className="flex gap-2.5 overflow-x-auto no-scrollbar snap-x pb-1">
      {unlocks.map((u) => {
        const Icon = UNLOCK_ICON[u.phase] ?? Sun;
        if (u.current) {
          return (
            <div key={u.phase} className="snap-start shrink-0 w-[62%] sm:w-[30%] rounded-[1.3rem] border-2 border-hotpink/50 bg-white p-3.5 shadow-lg shadow-hotpink/15 animate-selected-glow">
              <div className="flex items-center justify-between gap-1">
                <Icon className="h-4 w-4 text-hotpink" strokeWidth={2} />
                <span className="rounded-full bg-hotpink text-white text-[9px] font-bold uppercase px-2 py-0.5">Today</span>
              </div>
              <p className="mt-1.5 font-script text-xl text-hotpink leading-none">{u.label}</p>
              <p className="mt-1 text-[11px] font-semibold text-rose/65 leading-snug">{u.teaser}</p>
            </div>
          );
        }
        return (
          <div key={u.phase} className="relative snap-start shrink-0 w-[46%] sm:w-[24%] rounded-[1.3rem] border border-petal/50 bg-white/60 p-3.5 overflow-hidden">
            {/* blurred, teased content */}
            <div className="blur-[3px] select-none opacity-70">
              <Icon className="h-4 w-4 text-hotpink/60" strokeWidth={2} />
              <p className="mt-1.5 font-script text-lg text-hotpink/70 leading-none">{u.label}</p>
              <p className="mt-1 text-[10.5px] font-medium text-rose/55 leading-snug">{UNLOCK_TEASE_TEXT[u.phase]}</p>
            </div>
            {/* lock overlay */}
            <div className="absolute inset-0 grid place-items-center bg-white/30">
              <div className="text-center px-1">
                <span className="mx-auto grid h-7 w-7 place-items-center rounded-full bg-white/90 text-hotpink shadow-sm">
                  <Lock className="h-3.5 w-3.5" strokeWidth={2} />
                </span>
                <p className="mt-1 text-[10px] font-bold text-hotpink leading-tight">{u.teaser}</p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/** Small taglines shown (blurred) behind the lock — mirror lib's UNLOCK_TEASE. */
const UNLOCK_TEASE_TEXT: Record<string, string> = {
  menstrual: "rest & deep nourishment",
  follicular: "fresh energy & new starts",
  ovulatory: "your glow & social peak",
  luteal: "comfort & honest, creative calm",
};
