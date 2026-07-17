import { useEffect, useMemo, useState } from "react";
import { Dumbbell, Flower2, BookHeart, Flame, Droplets, Salad, Wallet, Scale, TrendingDown, TrendingUp, Minus, Sparkles } from "lucide-react";
import { computeMeDashboard, type MeDashboard, type CalendarDay, type MoodPoint, type GoalSummary } from "@/lib/meDashboard";
import { Eyebrow } from "./PredictionCharts";
import { phaseForDay, readCycleSettings, PHASE_LABEL, type CyclePhase } from "@/components/bloom/cyclePhase";
import { weekSnapshot, weeklyEnergy, neededForPhase, type EnergyDay } from "@/lib/nutritionTargets";

type Phase = Exclude<CyclePhase, "any">;
/** Soft phase tints for graph bands — same language as the mood graph. */
const PHASE_BAND: Record<Phase, string> = {
  period: "rgba(236,72,153,0.14)", follicular: "rgba(251,113,133,0.08)",
  fertile: "rgba(244,114,182,0.12)", ovulation: "rgba(219,39,119,0.15)", luteal: "rgba(190,24,93,0.11)",
};
const PHASE_DOT: Record<Phase, string> = {
  period: "#EC4899", follicular: "#F9A8D4", fertile: "#F472B6", ovulation: "#DB2777", luteal: "#BE185D",
};

/** Clean WHITE dashboard card on the pink canvas — the pro-dashboard surface. */
const CARD = "rounded-2xl bg-white border border-[#F6D9E7] p-4 shadow-[0_6px_18px_rgba(219,39,119,0.06)]";
/** Light inset tile used inside a white card (stats), so it isn't card-on-card. */
const INSET = "rounded-xl bg-[#FFF7FB] border border-[#F6D9E7] p-3";

/* One consistency dashboard for the Me page. Every number comes from a real
   store (see meDashboard.ts). Visuals are single-hue pink (magnitude) with a
   couple of status accents — no categorical rainbow — so it reads as one system
   and looks lovely once the account has a few weeks of history. */

/** Mood valence (1 heavy … 5 bright) → a pink-palette swatch, so the chart
 *  stays on-brand instead of using multicolour emoji. */
const MOOD_TONE = ["#FBCFE8", "#F9A8D4", "#F472B6", "#EC4899", "#DB2777"];
const moodTone = (score: number) => MOOD_TONE[Math.max(0, Math.min(4, Math.round(score) - 1))];

// Sequential single-hue ramp for the heatmap: light petal → deep magenta.
const HEAT = [
  "color-mix(in oklab, var(--petal) 45%, white)",
  "color-mix(in oklab, var(--hotpink) 22%, white)",
  "color-mix(in oklab, var(--hotpink) 42%, white)",
  "color-mix(in oklab, var(--hotpink) 64%, white)",
  "color-mix(in oklab, var(--hotpink) 84%, white)",
  "var(--magenta)",
];

function BloomRing({ pct }: { pct: number }) {
  const r = 52, c = 2 * Math.PI * r;
  const offset = c * (1 - Math.min(100, Math.max(0, pct)) / 100);
  return (
    <div className="relative grid place-items-center shrink-0">
      <svg viewBox="0 0 128 128" className="h-32 w-32 sm:h-36 sm:w-36 -rotate-90 animate-icon-breathe">
        <defs>
          <linearGradient id="bloomring" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="var(--hotpink)" />
            <stop offset="100%" stopColor="var(--magenta)" />
          </linearGradient>
        </defs>
        <circle cx="64" cy="64" r={r} fill="none" stroke="var(--petal)" strokeOpacity="0.5" strokeWidth="12" />
        <circle
          cx="64" cy="64" r={r} fill="none" stroke="url(#bloomring)" strokeWidth="12" strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 900ms cubic-bezier(0.22,1,0.36,1)" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-script text-4xl sm:text-5xl leading-none text-hotpink">{pct}<span className="text-lg align-top">%</span></span>
        <span className="mt-1 text-[9px] font-bold uppercase tracking-wider text-rose/55">bloomed</span>
      </div>
    </div>
  );
}

function PillarBar({ label, pct, delay, edge }: { label: string; pct: number; delay: number; edge?: boolean }) {
  return (
    <div className="animate-card-pop-in" style={{ animationDelay: `${delay}ms` }}>
      <div className="flex items-center justify-between text-[11px] font-bold text-rose/80">
        <span className="inline-flex items-center gap-1.5">
          {label}
          {edge && <span className="rounded-full px-1.5 py-[1px] text-[8px] font-black uppercase tracking-wide text-white" style={{ background: "linear-gradient(135deg,#B76E79,#EC4899)" }}>grow</span>}
        </span>
        <span className="text-hotpink">{pct}%</span>
      </div>
      <div className="mt-1 h-2 rounded-full bg-blush border border-petal/50 overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: edge ? "linear-gradient(90deg,#F9A8D4,#EC4899)" : "linear-gradient(90deg,var(--hotpink),var(--magenta))", transition: "width 900ms cubic-bezier(0.22,1,0.36,1)" }} />
      </div>
    </div>
  );
}

function StatTile({ Icon, value, label, sub, spark, delay }: {
  Icon: typeof Dumbbell; value: React.ReactNode; label: string; sub?: string;
  spark?: { date: string; value: number }[]; delay: number;
}) {
  const max = spark && spark.length ? Math.max(1, ...spark.map((s) => s.value)) : 1;
  return (
    <div className="rounded-xl bg-[#FFF7FB] border border-[#F6D9E7] p-3 animate-card-pop-in" style={{ animationDelay: `${delay}ms` }}>
      <div className="flex items-center gap-2">
        <span className="grid h-7 w-7 place-items-center rounded-full bg-blush text-hotpink shrink-0"><Icon className="h-3.5 w-3.5" strokeWidth={1.8} /></span>
        <span className="text-[10px] font-bold uppercase tracking-wider text-rose/60 leading-tight">{label}</span>
      </div>
      <div className="mt-1.5 flex items-end justify-between gap-2">
        <span className="font-script text-3xl sm:text-4xl leading-none text-hotpink">{value}</span>
        {spark && (
          <svg viewBox={`0 0 ${spark.length * 6} 20`} className="h-5 w-16 shrink-0" preserveAspectRatio="none" aria-hidden>
            {spark.map((s, i) => {
              const h = s.value ? Math.max(2, (s.value / max) * 18) : 1.5;
              return <rect key={s.date} x={i * 6} y={20 - h} width="4" height={h} rx="1.5" fill={s.value ? "var(--hotpink)" : "var(--petal)"} opacity={s.value ? 0.9 : 0.6} />;
            })}
          </svg>
        )}
      </div>
      {sub && <p className="mt-0.5 text-[10px] text-rose/55">{sub}</p>}
    </div>
  );
}

/** Which cycle phase she makes the most progress in (or null if not enough
 *  data / no progress) — computed from weight change between logs by phase. */
function phaseGoalInsight(series: { date: string; kg: number }[], dir: GoalSummary["goal"]): string | null {
  if (dir === "maintain" || series.length < 4) return null;
  const s = readCycleSettings();
  const acc: Partial<Record<Phase, { d: number; n: number }>> = {};
  for (let i = 1; i < series.length; i++) {
    const ph = phaseForDay(new Date(series[i].date + "T00:00:00"), s) as Phase;
    const a = (acc[ph] ||= { d: 0, n: 0 });
    a.d += series[i].kg - series[i - 1].kg; a.n += 1;
  }
  const rows = (Object.entries(acc) as [Phase, { d: number; n: number }][]).map(([ph, v]) => [ph, v.d / v.n] as const);
  if (!rows.length) return null;
  rows.sort((a, b) => (dir === "gain" ? b[1] - a[1] : a[1] - b[1]));
  const [best, avg] = rows[0];
  if (dir === "lose" && avg >= 0) return null;
  if (dir === "gain" && avg <= 0) return null;
  return `You make the most progress in your ${PHASE_LABEL[best].toLowerCase()} phase ✿`;
}

/** Weight graph with a dot at EVERY logged day, cycle-phase bands behind the
 *  line (so she sees which phases move the needle) and a dashed target line. */
function WeightGraph({ series, target }: { series: { date: string; kg: number }[]; target: number | null }) {
  const [sel, setSel] = useState(-1); // -1 → default to today (last)
  if (series.length < 2) return null;
  const s = readCycleSettings();
  const MS = 86400000;
  const W = 300, H = 84, padX = 6, padY = 16;
  const at = (iso: string) => new Date(iso + "T00:00:00").getTime();
  const t0 = at(series[0].date), tN = at(series[series.length - 1].date);
  const span = Math.max(1, tN - t0);
  const xAt = (ms: number) => padX + ((ms - t0) / span) * (W - padX * 2);

  const kgs = series.map((p) => p.kg);
  const lo0 = Math.min(...kgs), hi0 = Math.max(...kgs);
  const pad = Math.max(0.3, (hi0 - lo0) * 0.35);
  const lo = lo0 - pad, hi = hi0 + pad, range = hi - lo || 1;
  const yAt = (kg: number) => padY + (1 - (kg - lo) / range) * (H - padY * 2);
  const showTarget = target != null && target >= lo && target <= hi;

  const bands: { ph: Phase; x1: number; x2: number }[] = [];
  let prev: Phase | null = null, bs = t0;
  for (let d = t0; d <= tN + MS; d += MS) {
    const ph = d <= tN ? (phaseForDay(new Date(d), s) as Phase) : null;
    if (ph !== prev) { if (prev !== null) bands.push({ ph: prev, x1: xAt(bs), x2: xAt(Math.min(d, tN)) }); prev = ph; bs = d; }
  }

  const pts = series.map((p) => [xAt(at(p.date)), yAt(p.kg)] as const);
  const line = pts.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const lastIdx = series.length - 1;
  const selIdx = sel < 0 ? lastIdx : Math.min(sel, lastIdx);
  const selP = series[selIdx];
  const [selX] = pts[selIdx];
  const delta = selIdx > 0 ? +(selP.kg - series[selIdx - 1].kg).toFixed(1) : 0;

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-[84px] touch-none" preserveAspectRatio="none">
        {bands.map((b, i) => <rect key={i} x={b.x1} y={0} width={Math.max(0, b.x2 - b.x1)} height={H} fill={PHASE_BAND[b.ph]} />)}
        {showTarget && <line x1={padX} x2={W - padX} y1={yAt(target!)} y2={yAt(target!)} stroke="#DB2777" strokeWidth="1" strokeDasharray="4 3" opacity="0.55" vectorEffect="non-scaling-stroke" />}
        <line x1={selX} y1={padY - 8} x2={selX} y2={H} stroke="var(--hotpink)" strokeWidth="1" strokeDasharray="3 3" opacity="0.4" vectorEffect="non-scaling-stroke" />
        <path d={line} fill="none" stroke="var(--hotpink)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
        {pts.map(([x, y], i) => {
          const ph = phaseForDay(new Date(at(series[i].date)), s) as Phase;
          const isToday = i === lastIdx, on = i === selIdx;
          return (
            <g key={i} onClick={() => setSel(i)} style={{ cursor: "pointer" }}>
              <circle cx={x} cy={y} r="9" fill="transparent" vectorEffect="non-scaling-stroke" />
              <circle cx={x} cy={y} r={isToday ? 4.2 : on ? 3.6 : 2.8} fill={isToday || on ? PHASE_DOT[ph] : "#fff"} stroke={PHASE_DOT[ph]} strokeWidth={isToday ? 2.4 : 2} vectorEffect="non-scaling-stroke" />
              {isToday && <circle cx={x} cy={y} r="7" fill="none" stroke="var(--hotpink)" strokeWidth="1" opacity="0.5" vectorEffect="non-scaling-stroke" />}
            </g>
          );
        })}
        <text x={Math.min(W - 12, pts[lastIdx][0])} y={pts[lastIdx][1] - 9} textAnchor="middle" fontSize="7.5" fontWeight="800" fill="#DB2777" style={{ letterSpacing: "0.06em" }}>NOW</text>
      </svg>
      <div className="mt-1.5 flex items-center justify-between text-[10.5px]">
        <span className="text-rose/45">{fmtMD(series[0].date)}</span>
        <span className="inline-flex items-center gap-1.5 font-bold text-hotpink">
          {selIdx === lastIdx ? "Today" : fmtMD(selP.date)} · {selP.kg}kg
          {delta !== 0 && <span className={delta < 0 ? "text-emerald-500" : "text-magenta"}>{delta < 0 ? "▼" : "▲"} {Math.abs(delta)}kg</span>}
        </span>
        <span className="text-rose/45">today</span>
      </div>
      <p className="mt-0.5 text-center text-[9px] text-rose/40">tap any dot to see that weigh-in ✿</p>
    </div>
  );
}

/** This week's energy: needed (dashed) vs planned-to-eat (line + phase dots) vs
 *  planned training burn (bars). The mood-style graph she asked for. */
function EnergyGraph({ days }: { days: EnergyDay[] }) {
  const W = 300, cTop = 8, cBot = 74, bTop = 84, bBot = 106, H = 118, padX = 8;
  const xAt = (i: number) => padX + (i / 6) * (W - padX * 2);
  const planned = days.filter((d) => d.planned > 0);
  const vals = [...days.map((d) => d.needed), ...planned.map((d) => d.planned)];
  const lo = Math.min(...vals) * 0.96, hi = Math.max(...vals) * 1.04, range = hi - lo || 1;
  const yCal = (v: number) => cTop + (1 - (v - lo) / range) * (cBot - cTop);
  const bMax = Math.max(1, ...days.map((d) => d.burned));
  const neededPath = days.map((d, i) => `${i ? "L" : "M"}${xAt(i).toFixed(1)},${yCal(d.needed).toFixed(1)}`).join(" ");
  const plannedPts = planned.map((d) => [xAt(days.indexOf(d)), yCal(d.planned)] as const);
  const plannedPath = plannedPts.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const todayI = days.findIndex((d) => d.isToday);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-[118px]" preserveAspectRatio="none">
      {todayI >= 0 && <line x1={xAt(todayI)} y1={cTop - 4} x2={xAt(todayI)} y2={bBot} stroke="var(--hotpink)" strokeWidth="1" strokeDasharray="3 3" opacity="0.35" vectorEffect="non-scaling-stroke" />}
      {/* burned training bars */}
      {days.map((d, i) => d.burned > 0 ? <rect key={i} x={xAt(i) - 5} y={bBot - (d.burned / bMax) * (bBot - bTop)} width="10" height={(d.burned / bMax) * (bBot - bTop)} rx="2" fill="#B76E79" opacity="0.8" /> : null)}
      {/* needed (dashed) */}
      <path d={neededPath} fill="none" stroke="#9D5C7E" strokeWidth="1.6" strokeDasharray="4 3" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
      {/* planned line + phase-coloured dots */}
      <path d={plannedPath} fill="none" stroke="var(--hotpink)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
      {planned.map((d) => { const [x, y] = [xAt(days.indexOf(d)), yCal(d.planned)]; return <circle key={d.label} cx={x} cy={y} r="3" fill="#fff" stroke={PHASE_DOT[d.phase]} strokeWidth="2" vectorEffect="non-scaling-stroke"><title>{`${d.label} · planned ${d.planned} kcal`}</title></circle>; })}
      {/* weekday labels */}
      {days.map((d, i) => <text key={i} x={xAt(i)} y={116} textAnchor="middle" fontSize="7.5" fontWeight="700" fill={d.isToday ? "#DB2777" : "#B08099"}>{d.label}</text>)}
    </svg>
  );
}

const GOAL_META = {
  lose: { Icon: TrendingDown, label: "Losing weight" },
  maintain: { Icon: Minus, label: "Maintaining" },
  gain: { Icon: TrendingUp, label: "Building" },
} as const;

function GoalCard({ goal }: { goal: GoalSummary }) {
  const meta = GOAL_META[goal.goal];
  const caption = (() => {
    if (goal.goal === "maintain") return "steady ✿";
    if (goal.toGo != null && Math.abs(goal.toGo) < 0.1) return "goal reached ✿";
    if (goal.toGo != null) return `${Math.abs(goal.toGo).toFixed(1)} kg to go${goal.etaWeeks ? ` · ~${goal.etaWeeks}w` : ""}`;
    return "set a target in Diet";
  })();
  // A warm, honest nudge — how far, how long, how much done.
  const motivation = (() => {
    if (goal.goal === "maintain") return "Holding steady — beautifully done ✿";
    if (goal.toGo != null && Math.abs(goal.toGo) < 0.1) return "You reached your goal — so proud of you ✿";
    if (goal.toGo == null) return "Set a goal weight in Diet and I'll map your path ✿";
    const kg = Math.abs(goal.toGo).toFixed(1);
    const eta = goal.etaWeeks ? ` — about ${goal.etaWeeks} week${goal.etaWeeks > 1 ? "s" : ""} at this pace` : "";
    if (goal.pct >= 75) return `Only ${kg}kg to go${eta}. You're so close — keep blooming ✿`;
    if (goal.pct >= 40) return `${kg}kg to go${eta}. You're ${goal.pct}% there — momentum is yours ✿`;
    return `${kg}kg to your goal${eta}. Every day counts — you've got this ✿`;
  })();
  return (
    <div className="rounded-2xl bg-white border border-[#F6D9E7] p-4 shadow-[0_6px_18px_rgba(219,39,119,0.06)]">
      <div className="flex items-center justify-between">
        <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-rose/60">
          <Scale className="h-3.5 w-3.5 text-hotpink" strokeWidth={1.8} /> Your goal
        </span>
        <span className="inline-flex items-center gap-1 rounded-full bg-blush px-2 py-0.5 text-[10px] font-bold text-hotpink border border-petal/60">
          <meta.Icon className="h-3 w-3" strokeWidth={2} /> {meta.label}
        </span>
      </div>
      {goal.has && goal.current != null ? (
        <>
          <div className="mt-2 flex items-end gap-2">
            <span className="leading-none">
              <span className="font-script text-4xl text-hotpink">{goal.current}<span className="text-lg">kg</span></span>
              <span className="ml-1 text-[9px] font-bold uppercase tracking-wide text-rose/45">now</span>
            </span>
            {goal.target != null && <span className="mb-1 text-sm text-rose/60">→ {goal.target}kg goal</span>}
            <span className="mb-1 ml-auto text-xs font-semibold text-hotpink">{caption}</span>
          </div>
          {goal.series.length >= 2 && (
            <div className="mt-2">
              <WeightGraph series={goal.series} target={goal.target} />
              <div className="mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[8.5px] font-bold uppercase tracking-wide text-rose/50">
                <span className="text-rose/45">Dot = a weigh-in ·</span>
                {(["period", "follicular", "fertile", "ovulation", "luteal"] as Phase[]).map((p) => (
                  <span key={p} className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full" style={{ background: PHASE_DOT[p] }} />{PHASE_LABEL[p]}</span>
                ))}
              </div>
            </div>
          )}
          {(() => { const line = phaseGoalInsight(goal.series, goal.goal); return line ? <p className="mt-2 text-[11.5px] font-semibold text-hotpink">✦ {line}</p> : null; })()}
          {goal.goal !== "maintain" && goal.target != null && (
            <div className="mt-2.5">
              <div className="h-2 rounded-full bg-blush border border-petal/50 overflow-hidden">
                <div className="h-full rounded-full bg-gradient-to-r from-hotpink to-magenta" style={{ width: `${goal.pct}%`, transition: "width 900ms cubic-bezier(0.22,1,0.36,1)" }} />
              </div>
              <p className="mt-1.5 text-center text-[11.5px] font-semibold text-hotpink">{motivation}</p>
            </div>
          )}
          {goal.goal === "maintain" && <p className="mt-2 text-center text-[11.5px] font-semibold text-hotpink">{motivation}</p>}
        </>
      ) : (
        <p className="mt-2 text-xs text-rose/55 animate-pulse">Set your goal & log your weight in Diet to track progress ✿</p>
      )}
    </div>
  );
}

const fmtMD = (iso: string) => new Date(iso + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" });

function MoodChart({ mood }: { mood: MoodPoint[] }) {
  const [sel, setSel] = useState(-1); // -1 → default to latest
  if (mood.length < 2) {
    return (
      <div className="grid h-28 place-items-center rounded-2xl bg-blush/50 border border-petal/40">
        <p className="text-xs text-rose/55 animate-pulse">Log your mood a few days and your curve blooms here ✿</p>
      </div>
    );
  }
  const W = 300, H = 96, padY = 12;
  const stepX = W / Math.max(1, mood.length - 1);
  const y = (s: number) => padY + (1 - (s - 1) / 4) * (H - padY * 2);
  const pts = mood.map((m, i) => [i * stepX, y(m.score)] as const);
  const line = pts.map(([x, yy], i) => `${i ? "L" : "M"}${x.toFixed(1)},${yy.toFixed(1)}`).join(" ");
  const area = `${line} L${W},${H} L0,${H} Z`;
  const selIdx = sel < 0 ? mood.length - 1 : Math.min(sel, mood.length - 1);
  const selPt = mood[selIdx];
  const [selX] = pts[selIdx];

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-24 touch-none" preserveAspectRatio="none">
        <defs>
          <linearGradient id="moodfill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--hotpink)" stopOpacity="0.24" />
            <stop offset="100%" stopColor="var(--hotpink)" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={area} fill="url(#moodfill)" />
        {/* guide line for the selected day */}
        <line x1={selX} y1={padY - 4} x2={selX} y2={H} stroke="var(--hotpink)" strokeWidth="1" strokeDasharray="3 3" opacity="0.4" vectorEffect="non-scaling-stroke" />
        <path d={line} fill="none" stroke="var(--hotpink)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
        {pts.map(([x, yy], i) => {
          const on = i === selIdx;
          return (
            <g key={mood[i].date} onClick={() => setSel(i)} style={{ cursor: "pointer" }}>
              {/* fat transparent hit area for easy tapping */}
              <circle cx={x} cy={yy} r="9" fill="transparent" vectorEffect="non-scaling-stroke" />
              <circle cx={x} cy={yy} r={on ? 4 : 2.8} fill={on ? moodTone(mood[i].score) : "#fff"} stroke={moodTone(mood[i].score)} strokeWidth={on ? 2 : 1.6} vectorEffect="non-scaling-stroke">
                <title>{`${fmtMD(mood[i].date)} · ${mood[i].mood}`}</title>
              </circle>
            </g>
          );
        })}
      </svg>
      <div className="mt-1.5 flex items-center justify-between text-[10px] text-rose/55">
        <span>{fmtMD(mood[0].date)}</span>
        <span className="inline-flex items-center gap-1.5 font-semibold text-hotpink">
          <span className="h-2.5 w-2.5 rounded-[3px]" style={{ background: moodTone(selPt.score) }} />
          {selIdx === mood.length - 1 ? "Today" : fmtMD(selPt.date)} · {selPt.mood}
        </span>
        <span>today</span>
      </div>
      <p className="mt-1 text-center text-[9px] text-rose/40">tap a dot to see that day ✿</p>
    </div>
  );
}

const WEEKDAY = ["M", "T", "W", "T", "F", "S", "S"];
const ritualsOf = (d: CalendarDay) =>
  [d.workout && "workout", d.yoga && "yoga", d.journal && "journal", d.mood && "mood", d.hydrated && "hydration"].filter(Boolean).join(" · ");

function Heatmap({ calendar }: { calendar: CalendarDay[] }) {
  const [sel, setSel] = useState<CalendarDay | null>(null);
  // Chunk into weeks of 7 (calendar is week-aligned Mon→Sun, oldest first).
  const weeks: CalendarDay[][] = [];
  for (let i = 0; i < calendar.length; i += 7) weeks.push(calendar.slice(i, i + 7));
  return (
    <div>
      <p className="mb-2.5 text-[10.5px] leading-snug text-rose/60">Each square is a day — the darker it is, the more of your 5 daily rituals (move · yoga · journal · mood · water) you kept.</p>
      <div className="mx-auto flex w-fit gap-1.5">
        {/* weekday labels, aligned to the rows */}
        <div className="flex flex-col gap-[3px]">
          {WEEKDAY.map((w, i) => <span key={i} className="flex h-4 items-center text-[8px] font-bold text-rose/40 sm:h-[18px]">{w}</span>)}
        </div>
        {weeks.map((w, wi) => (
          <div key={wi} className="flex flex-col gap-[3px]">
            {w.map((d) => {
              const on = sel?.date === d.date;
              return (
                <button
                  key={d.date}
                  onClick={() => setSel(on ? null : d)}
                  aria-label={`${fmtMD(d.date)}, ${d.score} of 5 rituals`}
                  className="h-4 w-4 rounded-[4px] border transition active:scale-90 sm:h-[18px] sm:w-[18px]"
                  style={{ background: HEAT[d.score], borderColor: on ? "#BE185D" : "rgba(255,255,255,0.6)", boxShadow: on ? "0 0 0 2px rgba(190,24,93,0.35)" : "none" }}
                />
              );
            })}
          </div>
        ))}
      </div>
      {/* tap read-out */}
      <div className="mt-2.5 min-h-[16px] text-center text-[11px] leading-snug">
        {sel ? (
          <span className="font-semibold text-hotpink">{fmtMD(sel.date)} · {sel.score}/5{sel.score ? ` · ${ritualsOf(sel)}` : " · a rest day ✿"}</span>
        ) : (
          <span className="text-rose/45">Tap any day to see what you kept ✿</span>
        )}
      </div>
      {/* legend */}
      <div className="mt-2 flex items-center justify-center gap-1.5 text-[10px] text-rose/55">
        <span>0</span>
        {HEAT.map((c, i) => <span key={i} className="h-3 w-3 rounded-[3px] border border-white/60" style={{ background: c }} />)}
        <span>5 rituals / day</span>
      </div>
    </div>
  );
}

function GoalBar({ Icon, label, pct, caption, over }: { Icon: typeof Droplets; label: string; pct: number; caption: string; over?: boolean }) {
  return (
    <div>
      <div className="flex items-center justify-between text-[11px] font-bold text-rose/80">
        <span className="inline-flex items-center gap-1.5"><Icon className="h-3.5 w-3.5 text-hotpink" strokeWidth={1.8} />{label}</span>
        <span className={over ? "text-magenta" : "text-hotpink"}>{caption}</span>
      </div>
      <div className="mt-1 h-2.5 rounded-full bg-blush border border-petal/50 overflow-hidden">
        <div
          className="h-full rounded-full"
          style={{
            width: `${Math.min(100, pct)}%`,
            background: over ? "var(--magenta)" : "linear-gradient(90deg, var(--hotpink), var(--magenta))",
            transition: "width 900ms cubic-bezier(0.22,1,0.36,1)",
          }}
        />
      </div>
    </div>
  );
}

export function ConsistencyDashboard() {
  const [data, setData] = useState<MeDashboard | null>(null);
  useEffect(() => {
    const refresh = () => setData(computeMeDashboard());
    refresh();
    window.addEventListener("storage", refresh);
    return () => window.removeEventListener("storage", refresh);
  }, []);

  // One honest sentence that ties the numbers together — strongest habit + the
  // one to nudge — so the dashboard reads as coaching, not a scoreboard.
  const narrative = useMemo(() => {
    if (!data) return "";
    const sorted = [...data.pillars].sort((a, b) => b.pct - a.pct);
    const top = sorted[0], low = sorted[sorted.length - 1];
    if (top.pct === 0) return "Your bloom fills in as you log — movement, meals, water & mood ✿";
    if (top.pct === low.pct) return `You're glowing across the board this month${data.workoutsTotal ? ` — ${data.workoutsTotal} workouts and counting` : ""} ✿`;
    return `You're strongest at ${top.label.toLowerCase()} (${top.pct}%)${data.workoutsTotal ? `, with ${data.workoutsTotal} workouts logged` : ""}. ${low.label} is your growth edge — a little more lifts your whole bloom ✿`;
  }, [data]);

  if (!data) return null;
  const b = data.budget;
  const week = weekSnapshot();
  const energy = weeklyEnergy();
  const hasPlan = energy.some((d) => d.planned > 0);
  const lutealBump = neededForPhase("luteal") - neededForPhase("follicular");
  const lowestKey = [...data.pillars].sort((a, b) => a.pct - b.pct)[0]?.key;
  const streakSub = (cur: number, best: number) => (best > cur ? `best: ${best} days` : cur === 1 ? "day" : "days in a row");

  return (
    <section className="mt-5 sm:mt-8 animate-card-pop-in" style={{ animationDelay: "40ms" }}>
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <h2 className="font-script text-3xl sm:text-4xl text-hotpink leading-none">Your bloom</h2>
          <p className="mt-1 text-[12px] text-rose/70">How consistent you've been — measured, never guessed.</p>
        </div>
        <span className="mt-1 text-[11px] text-rose/60 shrink-0">last {data.windowDays} days</span>
      </div>

      {/* Pro dashboard: white cards on the pink canvas, 2 columns on desktop */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5">
        {/* Consistency score + pillars + narrative — hero, full width */}
        <div className={CARD + " lg:col-span-2 relative overflow-hidden"}>
          <img src="/images/me/consistency-bloom.webp" alt="" aria-hidden className="pointer-events-none absolute -bottom-4 -right-3 w-40 opacity-80 select-none" />
          <Eyebrow>Your consistency this month</Eyebrow>
          <div className="mt-3 flex flex-col sm:flex-row items-center gap-4 sm:gap-8">
            <BloomRing pct={data.bloomScore} />
            <div className="flex-1 w-full min-w-0 grid grid-cols-2 gap-x-8 gap-y-3">
              {data.pillars.map((p, i) => <PillarBar key={p.key} label={p.label} pct={p.pct} edge={p.key === lowestKey && p.pct < 100} delay={80 + i * 60} />)}
            </div>
          </div>
          <p className="mt-4 flex items-start gap-1.5 border-t border-petal/40 pt-3 text-[11.5px] leading-snug text-rose/70">
            <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-hotpink" strokeWidth={2} />
            <span>{narrative}</span>
          </p>
        </div>

        {/* Goal — half (GoalCard is its own white card) */}
        <GoalCard goal={data.goal} />

        {/* Movement — half */}
        <div className={CARD}>
          <div className="flex items-center justify-between">
            <Eyebrow>Your movement</Eyebrow>
            <span className="text-[12px] font-bold text-hotpink">
              {week.sessionsDone}{week.plannedTraining > 0 ? ` / ${week.plannedTraining}` : ""} session{week.sessionsDone === 1 ? "" : "s"} this week
            </span>
          </div>
          {week.plannedTraining > 0 && (
            <div className="mt-2 h-2 rounded-full bg-blush border border-petal/50 overflow-hidden">
              <div className="h-full rounded-full bg-gradient-to-r from-hotpink to-magenta" style={{ width: `${Math.min(100, Math.round((week.sessionsDone / week.plannedTraining) * 100))}%`, transition: "width 900ms cubic-bezier(0.22,1,0.36,1)" }} />
            </div>
          )}
          <div className="mt-3 grid grid-cols-3 gap-2">
            <StatTile Icon={Dumbbell} value={data.workoutsTotal} label="Workouts" sub={`${week.workoutsDone} this week`} delay={100} />
            <StatTile Icon={Flower2} value={data.yogaTotal} label="Yoga" sub={`${week.yogaDone} this week`} delay={160} />
            <StatTile Icon={Flame} value={data.moveStreak} label="Move streak" sub={streakSub(data.moveStreak, data.moveBestStreak)} delay={220} />
          </div>
        </div>

        {/* Energy — full width (wide graph) */}
        <div className={CARD + " lg:col-span-2 relative overflow-hidden"}>
          <img src="/images/me/energy-botanical.webp" alt="" aria-hidden className="pointer-events-none absolute -top-2 right-1 h-28 opacity-70 select-none" />
          <Eyebrow>Your energy this week · needed vs planned vs burned</Eyebrow>
          {hasPlan ? (
            <div className="mt-2">
              <EnergyGraph days={energy} />
              <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[8.5px] font-extrabold uppercase tracking-wide">
                <span style={{ color: "#9D5C7E" }}>▬ ▬ Needed</span>
                <span className="text-hotpink">▬ Planned to eat</span>
                <span style={{ color: "#B76E79" }}>▮ Training burn</span>
                <span className="text-rose/45">· dot = cycle phase</span>
              </div>
              {lutealBump > 0 && <p className="mt-2 text-[11.5px] font-semibold text-hotpink">✦ Your body needs about +{lutealBump} kcal on your luteal days — let your plan rise with it ✿</p>}
            </div>
          ) : (
            <div className="mt-2 grid h-24 place-items-center text-center">
              <p className="text-[12px] text-rose/60 animate-pulse">Plan your meals in the Meals tool and your week's energy — needed vs planned vs burned — blooms here ✿</p>
            </div>
          )}
        </div>

        {/* Mood — half (journal streak in the header) */}
        <div className={CARD}>
          <div className="flex items-center justify-between gap-2">
            <Eyebrow>Mood, day one → today</Eyebrow>
            <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-hotpink">
              <BookHeart className="h-3.5 w-3.5" strokeWidth={1.9} /> Journal {data.journalStreak}{data.journalStreak === 1 ? "d" : "d"}{data.journalBestStreak > data.journalStreak ? ` · best ${data.journalBestStreak}` : ""}
            </span>
          </div>
          <div className="mt-2"><MoodChart mood={data.mood} /></div>
        </div>

        {/* Calendar — half */}
        <div className={CARD}>
          <Eyebrow>Every ritual, every day</Eyebrow>
          <div className="mt-2"><Heatmap calendar={data.calendar} /></div>
        </div>

        {/* Promises — full width, 3-up */}
        <div className={CARD + " lg:col-span-2"}>
          <Eyebrow>Promises to yourself</Eyebrow>
          <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-x-6 gap-y-3">
            <GoalBar Icon={Droplets} label="Hydration" pct={data.hydrateRate} caption={`${data.hydrateRate}% of days`} />
            <GoalBar Icon={Salad} label="Eating well" pct={data.nourishRate} caption={`${data.nourishRate}% of days`} />
            {b.has && (
              <GoalBar
                Icon={Wallet} label="Budget" pct={b.plan > 0 ? b.pct : 100}
                over={b.plan > 0 && b.spent > b.plan}
                caption={b.plan > 0 ? `${b.currency}${Math.round(b.spent)} / ${b.currency}${Math.round(b.plan)}` : `${b.currency}${Math.round(b.spent)} spent`}
              />
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
