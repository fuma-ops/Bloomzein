import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import {
  Droplet, Moon, Cookie, HeartPulse, Sparkles, ChevronDown, CalendarHeart, Zap,
} from "lucide-react";
import {
  computePredictions, computeForecast,
  type SmartPredictions as SP, type ForecastDay,
} from "@/lib/predictions";
import { PERIOD_EVENT } from "@/lib/periodLog";
import { effectiveCurrentPhase, readCycleSettings, PHASE_LABEL } from "@/components/bloom/cyclePhase";
import { CycleWheel, ForecastStrip, HormoneMoodCurve, FertilityGauge, ConfidenceGauge } from "./PredictionCharts";

/* "Bloomzein predicts your life" — a real dashboard, not a list of sentences:
   a cycle wheel, a week-ahead forecast, a hormone×mood curve and gauges, each
   with a warm "Why I know this" so nothing is a black box. */

const cardCls = "bloom-pearl-card pearl-sheen rounded-2xl p-4 animate-card-pop-in";
const fmt = (d: Date) => d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
function relDay(daysAway: number, late: boolean): string {
  if (late) return `${Math.abs(daysAway)} day${Math.abs(daysAway) === 1 ? "" : "s"} late`;
  if (daysAway === 0) return "today";
  if (daysAway === 1) return "tomorrow";
  return `in ${daysAway} days`;
}

function Why({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="mt-2.5">
      <button onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center gap-1 text-[10.5px] font-bold uppercase tracking-wide text-rose/55 transition hover:text-hotpink">
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
        <span className="text-[9px] font-bold uppercase tracking-wide text-rose/55 leading-tight">{label}</span>
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
    if (!data) return { dayLabel: "", phaseLabel: "", todayDay: 0, cycleLength: 28 };
    const s = readCycleSettings();
    const diff = Math.floor((Date.now() - s.lastPeriodStart.getTime()) / 86400000);
    const todayDay = Math.min(Math.max(0, diff), s.cycleLength);
    return {
      dayLabel: `Day ${diff + 1}`,
      phaseLabel: PHASE_LABEL[effectiveCurrentPhase(s)],
      todayDay, cycleLength: s.cycleLength,
    };
  }, [data]);

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
          <p className="mt-1 text-[12px] text-rose/70">Your whole week, forecast from your body's rhythm.</p>
        </div>
        <span className="text-[11px] text-rose/60 shrink-0 text-right">{headerNote}</span>
      </div>

      {/* HERO — cycle wheel + the numbers beside it */}
      <div className="bloom-pearl-card pearl-sheen rounded-3xl p-4 sm:p-5 animate-card-pop-in">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
          <CycleWheel dayLabel={cycle.dayLabel} phaseLabel={cycle.phaseLabel} />
          <div>
            <div className="flex items-center gap-2">
              <span className="grid h-7 w-7 place-items-center rounded-full text-white shrink-0" style={{ background: "linear-gradient(135deg,#EC4899,#BE185D)" }}>
                <Droplet className="h-3.5 w-3.5" strokeWidth={1.9} />
              </span>
              <span className="text-[10px] font-bold uppercase tracking-wider text-rose/60">Next period</span>
            </div>
            <div className="mt-1.5 flex items-end gap-2 flex-wrap">
              <span className="font-script text-4xl leading-none text-hotpink">{fmt(p.date)}</span>
              <span className={`mb-1 text-[12.5px] font-bold ${p.late ? "text-magenta" : "text-rose/70"}`}>
                {relDay(p.daysAway, p.late)}{!p.late && p.windowDays ? ` · ±${p.windowDays}d` : ""}
              </span>
            </div>
            <div className="mt-3">
              <ConfidenceGauge pct={p.confidence} sub={<>My confidence — it climbs as you confirm more real periods.</>} />
            </div>
          </div>
        </div>
        <Why>{p.explain}</Why>
      </div>

      {/* WEEK-AHEAD forecast strip */}
      <div className={"mt-3 " + cardCls}>
        <div className="flex items-center gap-2 mb-2.5">
          <span className="grid h-7 w-7 place-items-center rounded-full bg-blush text-hotpink shrink-0"><Zap className="h-3.5 w-3.5" strokeWidth={1.9} /></span>
          <span className="text-[11px] font-bold uppercase tracking-wider text-rose/60 flex-1">Your week ahead</span>
          <span className="text-[10px] font-semibold text-hotpink">Tomorrow: {data.energy.headline.toLowerCase()}</span>
        </div>
        <ForecastStrip days={forecast} />
        <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[9px] font-bold uppercase tracking-wide text-rose/55">
          <span>🩸 Period</span><span>💗 Fertile</span><span>🌸 Ovulation</span><span>🌙 PMS</span><span>💤 Rest</span>
          <span className="text-rose/45">| bar = energy</span>
        </div>
        <Why>{data.energy.explain}</Why>
      </div>

      {/* FERTILITY gauge + HORMONE×MOOD curve */}
      <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className={cardCls}>
          <span className="text-[10px] font-bold uppercase tracking-wider text-rose/60">Fertility right now</span>
          <div className="mt-1"><FertilityGauge level={data.fertility.level} /></div>
          {data.fertility.peak && <p className="text-center text-[11.5px] font-semibold text-rose/75">Next peak: <span className="text-hotpink">{fmt(data.fertility.peak)}</span></p>}
          <Why>{data.fertility.explain}</Why>
        </div>
        <div className={cardCls}>
          <span className="text-[10px] font-bold uppercase tracking-wider text-rose/60">Your mood vs your hormones</span>
          <div className="mt-2"><HormoneMoodCurve cycleLength={cycle.cycleLength} todayDay={cycle.todayDay} /></div>
          <Why>{data.mood.explain}</Why>
        </div>
      </div>

      {/* QUICK-READ predictions row */}
      <div className={"mt-3 " + cardCls}>
        <span className="text-[10px] font-bold uppercase tracking-wider text-rose/60">This week, watch for</span>
        <div className="mt-2 grid grid-cols-2 lg:grid-cols-4 gap-2">
          <MiniStat Icon={Moon} label="PMS window" value={<>from {fmt(data.pms.date)}</>} />
          <MiniStat Icon={HeartPulse} label="Recovery" value={data.recovery.weekday ?? "In your stride"} />
          <MiniStat Icon={Cookie} label="Cravings" value={data.cravings.when ? data.cravings.when : "steady"} />
          <MiniStat Icon={Sparkles} label="Mood dip" value={data.mood.direction === "dip" ? (data.mood.weekday ?? "possible") : "steady ✿"} accent={data.mood.direction === "dip"} />
        </div>
        <Why>
          PMS & recovery come from the days just before your predicted period; cravings from your luteal serotonin dip; the mood-dip from your own logs mapped to each phase. Tap any instrument above for the full reasoning.
        </Why>
      </div>
    </section>
  );
}
