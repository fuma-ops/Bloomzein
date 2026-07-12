import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import {
  Droplet, Flower2, Zap, Moon, Cookie, HeartPulse, Sparkles,
  ChevronDown, CalendarHeart, Gauge,
} from "lucide-react";
import { computePredictions, type SmartPredictions as SP, type FertilityLevel } from "@/lib/predictions";
import { PERIOD_EVENT } from "@/lib/periodLog";

/* "Bloomzein predicts your life" — the flagship premium panel on the Me page.
   Every card reads from the prediction engine (predictions.ts), which traces
   back to her real cycle + logs, and every card can tell her WHY (the warm
   explanation), so nothing is a black box. Single-hue pink, rose-gold premium. */

const GOLD = "#B76E79";
const cardCls =
  "bloom-pearl-card pearl-sheen rounded-2xl p-4 animate-card-pop-in";

const fmt = (d: Date) => d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
function relDay(daysAway: number, late: boolean): string {
  if (late) return `${Math.abs(daysAway)} day${Math.abs(daysAway) === 1 ? "" : "s"} late`;
  if (daysAway === 0) return "today";
  if (daysAway === 1) return "tomorrow";
  return `in ${daysAway} days`;
}

/** Collapsible "why I know this" — keeps cards clean, the reasoning one tap away. */
function Why({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="mt-2.5">
      <button
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center gap-1 text-[10.5px] font-bold uppercase tracking-wide text-rose/55 transition hover:text-hotpink"
      >
        Why I know this
        <ChevronDown className={`h-3 w-3 transition-transform ${open ? "rotate-180" : ""}`} strokeWidth={2.4} />
      </button>
      {open && (
        <p className="mt-1.5 text-[11.5px] leading-relaxed text-rose/70 animate-fade-in" style={{ borderLeft: "2px solid rgba(183,110,121,0.35)", paddingLeft: "9px" }}>
          {children}
        </p>
      )}
    </div>
  );
}

function ConfidenceChip({ pct }: { pct: number }) {
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-black text-white shrink-0"
      style={{ background: `linear-gradient(135deg, ${GOLD}, #EC4899)` }}
      title="How sure I am — this climbs as you confirm more cycles"
    >
      <Gauge className="h-2.5 w-2.5" strokeWidth={2.6} /> {pct}%
    </span>
  );
}

function PredictionCard({
  Icon, label, headline, detail, confidence, explain, delay,
}: {
  Icon: typeof Droplet; label: string; headline: ReactNode; detail?: ReactNode;
  confidence?: number; explain: ReactNode; delay: number;
}) {
  return (
    <div className={cardCls} style={{ animationDelay: `${delay}ms` }}>
      <div className="flex items-center gap-2">
        <span className="grid h-7 w-7 place-items-center rounded-full bg-blush text-hotpink shrink-0">
          <Icon className="h-3.5 w-3.5" strokeWidth={1.9} />
        </span>
        <span className="text-[10px] font-bold uppercase tracking-wider text-rose/60 leading-tight flex-1">{label}</span>
        {confidence != null && <ConfidenceChip pct={confidence} />}
      </div>
      <p className="mt-2 font-script text-2xl leading-none text-hotpink">{headline}</p>
      {detail && <p className="mt-1 text-[12px] font-semibold text-rose/75">{detail}</p>}
      <Why>{explain}</Why>
    </div>
  );
}

const FERT_STEPS: { key: FertilityLevel; label: string }[] = [
  { key: "low", label: "Low" }, { key: "medium", label: "Medium" },
  { key: "high", label: "High" }, { key: "peak", label: "Peak" },
];
function FertilityMeter({ f, delay }: { f: SP["fertility"]; delay: number }) {
  const activeIdx = FERT_STEPS.findIndex((s) => s.key === f.level);
  return (
    <div className={cardCls} style={{ animationDelay: `${delay}ms` }}>
      <div className="flex items-center gap-2 mb-3">
        <span className="grid h-7 w-7 place-items-center rounded-full bg-blush text-hotpink shrink-0">
          <Flower2 className="h-3.5 w-3.5" strokeWidth={1.9} />
        </span>
        <span className="text-[10px] font-bold uppercase tracking-wider text-rose/60 flex-1">Fertility right now</span>
        <span className="font-script text-xl leading-none text-hotpink capitalize">{f.level}</span>
      </div>
      <div className="flex gap-1.5">
        {FERT_STEPS.map((step, i) => {
          const on = i <= activeIdx;
          const isCurrent = i === activeIdx;
          return (
            <div key={step.key} className="flex-1 text-center">
              <div
                className="h-2.5 rounded-full transition-all duration-700"
                style={{
                  background: on ? "linear-gradient(90deg, var(--hotpink), var(--magenta))" : "var(--blush)",
                  border: "1px solid rgba(236,72,153,0.18)",
                  boxShadow: isCurrent ? "0 0 0 3px rgba(219,39,119,0.18)" : "none",
                }}
              />
              <span className={`mt-1 block text-[9px] font-bold uppercase tracking-wide ${isCurrent ? "text-hotpink" : "text-rose/45"}`}>
                {step.label}
              </span>
            </div>
          );
        })}
      </div>
      {f.peak && (
        <p className="mt-2.5 text-[12px] font-semibold text-rose/75">
          Next peak (ovulation): <span className="text-hotpink">{fmt(f.peak)}</span>
        </p>
      )}
      <Why>{f.explain}</Why>
    </div>
  );
}

export function SmartPredictions() {
  const [data, setData] = useState<SP | null>(null);
  useEffect(() => {
    const refresh = () => setData(computePredictions());
    refresh();
    window.addEventListener(PERIOD_EVENT, refresh);
    window.addEventListener("bloom:cycle-updated", refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener(PERIOD_EVENT, refresh);
      window.removeEventListener("bloom:cycle-updated", refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);

  const headerNote = useMemo(() => {
    if (!data) return "";
    if (!data.hasCycle) return "set up your cycle to unlock";
    return data.loggedCycles < 2 ? "learning your rhythm" : `tuned to ${data.loggedCycles} of your cycles`;
  }, [data]);

  if (!data) return null;

  if (!data.hasCycle) {
    return (
      <div className="grid place-items-center rounded-2xl bg-blush/50 border border-petal/40 p-6 text-center">
        <CalendarHeart className="h-7 w-7 text-hotpink mb-2" strokeWidth={1.6} />
        <p className="font-script text-xl text-hotpink">Predictions bloom from your cycle</p>
        <p className="mt-1 text-[12px] text-rose/70 max-w-xs">Set up your Cycle Tracker and I'll start predicting your week — energy, mood, cravings & more ✿</p>
        <a href="/app/tools/cycle" className="mt-3 inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-[12px] font-bold text-white active:scale-95" style={{ background: "linear-gradient(135deg,#EC4899,#DB2777)" }}>
          <Sparkles className="h-3.5 w-3.5" strokeWidth={2.2} /> Set up my cycle
        </a>
      </div>
    );
  }

  const p = data.period;
  return (
    <section>
      <div className="mb-3 flex items-end justify-between gap-3">
        <div>
          <h2 className="font-script text-3xl sm:text-4xl text-hotpink leading-none">Smart predictions</h2>
          <p className="mt-1 text-[12px] text-rose/70">Bloomzein doesn't just track — it predicts your week from your body's rhythm.</p>
        </div>
        <span className="text-[11px] text-rose/60 shrink-0 text-right">{headerNote}</span>
      </div>

      {/* Period — the hero prediction */}
      <div className="bloom-pearl-card pearl-sheen rounded-3xl p-4 sm:p-5 animate-card-pop-in">
        <div className="flex items-center gap-2">
          <span className="grid h-8 w-8 place-items-center rounded-full text-white shrink-0" style={{ background: "linear-gradient(135deg,#EC4899,#BE185D)" }}>
            <Droplet className="h-4 w-4" strokeWidth={1.9} />
          </span>
          <span className="text-[11px] font-bold uppercase tracking-wider text-rose/60 flex-1">Next period</span>
          <ConfidenceChip pct={p.confidence} />
        </div>
        <div className="mt-2 flex items-end gap-2 flex-wrap">
          <span className="font-script text-4xl leading-none text-hotpink">{fmt(p.date)}</span>
          <span className={`mb-1 text-[13px] font-bold ${p.late ? "text-magenta" : "text-rose/70"}`}>
            {relDay(p.daysAway, p.late)}{!p.late && p.windowDays ? ` · ±${p.windowDays}d` : ""}
          </span>
        </div>
        <Why>{p.explain}</Why>
      </div>

      {/* Fertility meter */}
      <div className="mt-3"><FertilityMeter f={data.fertility} delay={40} /></div>

      {/* The predictive grid */}
      <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
        <PredictionCard
          Icon={Moon} label="PMS window" delay={80}
          headline={`${data.pms.daysBeforePeriod} days before`}
          detail={<>likely from <span className="text-hotpink">{fmt(data.pms.date)}</span></>}
          confidence={data.pms.confidence}
          explain={data.pms.explain}
        />
        <PredictionCard
          Icon={Zap} label="Energy tomorrow" delay={120}
          headline={data.energy.headline}
          detail={<>Perfect for: {data.energy.goodFor.join(" · ")}</>}
          confidence={data.energy.confidence}
          explain={data.energy.explain}
        />
        <PredictionCard
          Icon={HeartPulse} label="Recovery day" delay={160}
          headline={data.recovery.weekday ?? "You're in your stride"}
          detail={data.recovery.weekday ? "Your body will likely want more rest" : "No rest-day flag this week"}
          explain={data.recovery.explain}
        />
        <PredictionCard
          Icon={Cookie} label="Cravings" delay={200}
          headline={data.cravings.craving}
          detail={data.cravings.when ? <>Likely <span className="text-hotpink">{data.cravings.when}</span></> : "Steady for now"}
          explain={data.cravings.explain}
        />
        <div className="sm:col-span-2">
          <PredictionCard
            Icon={Sparkles} label="Mood" delay={240}
            headline={data.mood.direction === "dip" ? `Mood may dip ${data.mood.weekday ? "· " + data.mood.weekday : ""}` : "Mood looks steady ✿"}
            detail={data.mood.direction === "dip" ? <>Consider: {data.mood.suggestions.join(" · ")}</> : "No notable dip predicted this week"}
            confidence={data.mood.confidence}
            explain={data.mood.explain}
          />
        </div>
      </div>
    </section>
  );
}
