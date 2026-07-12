import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { Moon, Cookie, HeartPulse, Sparkles, ChevronDown, CalendarHeart } from "lucide-react";
import {
  computePredictions, computeForecast,
  type SmartPredictions as SP, type ForecastDay,
} from "@/lib/predictions";
import { PERIOD_EVENT } from "@/lib/periodLog";
import { effectiveCurrentPhase, readCycleSettings, PHASE_LABEL, type CyclePhase } from "@/components/bloom/cyclePhase";
import { CycleWheel, ForecastStrip, HormoneMoodCurve, FertilityGauge, ConfidenceRing, Eyebrow } from "./PredictionCharts";

/* "Bloomzein predicts your life" — a real dashboard, not a list of sentences.
   Read top→bottom as a story: where you are now → your week → your next period
   → your body's patterns → heads-up. Every instrument keeps a warm
   "Why I know this" so nothing is a black box. */

const cardCls = "bloom-pearl-card pearl-sheen rounded-[26px] p-[18px] animate-card-pop-in";
const fmt = (d: Date) => d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
function relDay(daysAway: number, late: boolean): string {
  if (late) return `${Math.abs(daysAway)} day${Math.abs(daysAway) === 1 ? "" : "s"} late`;
  if (daysAway === 0) return "today";
  if (daysAway === 1) return "tomorrow";
  return `in ${daysAway} days`;
}
const PHASE_NOTE: Record<Exclude<CyclePhase, "any">, string> = {
  period: "resting & renewing", follicular: "energy rising ✦", fertile: "glowing & magnetic",
  ovulation: "peak energy ✦", luteal: "winding down",
};

function Why({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="mt-3">
      <button onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-rose/50 transition hover:text-hotpink">
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

function MiniStat({ Icon, label, value, accent }: { Icon: typeof Moon; label: string; value: ReactNode; accent?: boolean }) {
  return (
    <div className="rounded-2xl p-2.5" style={{ background: "rgba(255,255,255,0.6)", border: "1px solid rgba(236,72,153,0.12)" }}>
      <div className="flex items-center gap-1.5">
        <span className="grid h-5 w-5 place-items-center rounded-full bg-blush text-hotpink shrink-0"><Icon className="h-3 w-3" strokeWidth={2} /></span>
        <span className="text-[8.5px] font-extrabold uppercase tracking-wide text-rose/55 leading-tight">{label}</span>
      </div>
      <p className={`mt-1 text-[12.5px] font-bold leading-tight ${accent ? "text-magenta" : "text-hotpink"}`}>{value}</p>
    </div>
  );
}

export function SmartPredictions() {
  const [data, setData] = useState<SP | null>(null);
  const [forecast, setForecast] = useState<ForecastDay[]>([]);
  useEffect(() => {
    const refresh = () => { setData(computePredictions()); setForecast(computeForecast(7)); };
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

  const cycle = useMemo(() => {
    if (!data) return { dayLabel: "", phaseLabel: "", note: "", todayDay: 0, cycleLength: 28 };
    const s = readCycleSettings();
    const diff = Math.floor((Date.now() - s.lastPeriodStart.getTime()) / 86400000);
    const ph = effectiveCurrentPhase(s);
    return {
      dayLabel: `Day ${diff + 1}`,
      phaseLabel: PHASE_LABEL[ph],
      note: PHASE_NOTE[ph],
      todayDay: Math.min(Math.max(0, diff), s.cycleLength),
      cycleLength: s.cycleLength,
    };
  }, [data]);

  const headerNote = useMemo(() => {
    if (!data) return "";
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
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <h2 className="font-script text-3xl sm:text-4xl text-hotpink leading-none">Smart predictions</h2>
          <p className="mt-1 text-[12px] text-rose/70">Bloomzein reads your rhythm and tells you what's coming ✿</p>
        </div>
        <span className="mt-1 rounded-full px-2 py-0.5 text-[9px] font-black uppercase tracking-wide text-white shrink-0" style={{ background: "linear-gradient(135deg,#B76E79,#EC4899)" }}>{headerNote}</span>
      </div>

      {/* 1 · WHERE YOU ARE TODAY */}
      <div className={cardCls}>
        <Eyebrow>Where you are today</Eyebrow>
        <div className="mt-2"><CycleWheel dayLabel={cycle.dayLabel} phaseLabel={cycle.phaseLabel} note={cycle.note} /></div>
      </div>

      {/* 2 · YOUR WEEK AHEAD */}
      <div className={"mt-3.5 " + cardCls}>
        <div className="mb-3 flex items-center justify-between gap-2">
          <Eyebrow>Your week ahead</Eyebrow>
          <span className="text-[10px] font-bold text-hotpink">Tomorrow: {data.energy.headline.toLowerCase()}</span>
        </div>
        <ForecastStrip days={forecast} />
        <div className="mt-2.5 flex flex-wrap gap-x-2.5 gap-y-1 text-[8.5px] font-extrabold uppercase tracking-wide text-rose/55">
          <span>🩸 Period</span><span>💗 Fertile</span><span>🌸 Ovulation</span><span>🌙 PMS</span><span>💤 Rest</span><span className="text-rose/40">bar = energy</span>
        </div>
        <Why>{data.energy.explain}</Why>
      </div>

      {/* 3 · YOUR NEXT PERIOD */}
      <div className={"mt-3.5 " + cardCls}>
        <Eyebrow>Your next period</Eyebrow>
        <div className="mt-2 flex items-center gap-4">
          <div className="flex-1">
            <span className="font-script text-4xl leading-none text-hotpink">{fmt(p.date)}</span>
            <p className={`mt-0.5 text-[12.5px] font-bold ${p.late ? "text-magenta" : "text-rose/70"}`}>
              {relDay(p.daysAway, p.late)}{!p.late && p.windowDays ? ` · typical ±${p.windowDays} days` : ""}
            </p>
          </div>
          <ConfidenceRing pct={p.confidence} />
        </div>
        <Why>{p.explain}</Why>
      </div>

      {/* 4 · FERTILITY + MOOD/HORMONES */}
      <div className="mt-3.5 grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        <div className={cardCls.replace("animate-card-pop-in", "")}>
          <Eyebrow>Fertility today</Eyebrow>
          <div className="mt-1"><FertilityGauge level={data.fertility.level} /></div>
          {data.fertility.peak && <p className="text-center text-[11.5px] font-semibold text-rose/75">Next peak: <span className="text-hotpink">{fmt(data.fertility.peak)}</span></p>}
          <Why>{data.fertility.explain}</Why>
        </div>
        <div className={cardCls.replace("animate-card-pop-in", "")}>
          <Eyebrow>Mood &amp; hormones</Eyebrow>
          <div className="mt-2"><HormoneMoodCurve cycleLength={cycle.cycleLength} todayDay={cycle.todayDay} /></div>
          <Why>{data.mood.explain}</Why>
        </div>
      </div>

      {/* 5 · HEADS UP THIS WEEK */}
      <div className={"mt-3.5 " + cardCls}>
        <Eyebrow>Heads up this week</Eyebrow>
        <div className="mt-2.5 grid grid-cols-2 lg:grid-cols-4 gap-2">
          <MiniStat Icon={Moon} label="PMS window" value={<>from {fmt(data.pms.date)}</>} />
          <MiniStat Icon={HeartPulse} label="Rest day" value={data.recovery.weekday ?? "In your stride"} />
          <MiniStat Icon={Cookie} label="Cravings" value={data.cravings.when ? data.cravings.when : "steady"} />
          <MiniStat Icon={Sparkles} label="Mood dip" value={data.mood.direction === "dip" ? (data.mood.weekday ?? "possible") : "steady ✿"} accent={data.mood.direction === "dip"} />
        </div>
        <Why>
          Your PMS window &amp; rest day come from the days just before your predicted period; cravings from your luteal serotonin dip; the mood-dip from your own logs mapped to each phase. Tap any instrument above for the full story.
        </Why>
      </div>
    </section>
  );
}
