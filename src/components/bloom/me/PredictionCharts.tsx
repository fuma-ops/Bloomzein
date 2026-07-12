import type { ReactNode } from "react";
import { computeWheel, moodScatter, type ForecastDay, type FertilityLevel } from "@/lib/predictions";
import type { CyclePhase } from "@/components/bloom/cyclePhase";

/* Real dashboard instruments for Smart Predictions — a cycle wheel, a weather
   forecast strip, a hormone×mood curve, and gauges. Single-hue pink for
   magnitude with a few status accents, so it reads as one system. */

type Phase = Exclude<CyclePhase, "any">;

const PHASE_ARC: Record<Phase, string> = {
  period: "#EC4899", follicular: "#F9A8D4", fertile: "#F472B6", ovulation: "#DB2777", luteal: "#BE185D",
};
const PHASE_SHORT: Record<Phase, string> = {
  period: "Period", follicular: "Follicular", fertile: "Fertile", ovulation: "Ovulation", luteal: "Luteal",
};

const polar = (cx: number, cy: number, r: number, deg: number): [number, number] => {
  const a = (deg - 90) * (Math.PI / 180);
  return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
};
/** A stroked ring segment from startDeg → endDeg, clockwise. */
function arcPath(cx: number, cy: number, r: number, startDeg: number, endDeg: number): string {
  const [x1, y1] = polar(cx, cy, r, startDeg);
  const [x2, y2] = polar(cx, cy, r, endDeg);
  const large = endDeg - startDeg <= 180 ? 0 : 1;
  return `M ${x1.toFixed(2)} ${y1.toFixed(2)} A ${r} ${r} 0 ${large} 1 ${x2.toFixed(2)} ${y2.toFixed(2)}`;
}

/* ── Cycle Wheel ─────────────────────────────────────────────────────────── */
export function CycleWheel({ dayLabel, phaseLabel }: { dayLabel: string; phaseLabel: string }) {
  const w = computeWheel();
  const S = 220, cx = S / 2, cy = S / 2, r = 88, sw = 20;
  const deg = (day: number) => (day / w.cycleLength) * 360;
  const gap = 1.4; // deg gap between arcs

  const [tx, ty] = polar(cx, cy, r, deg(w.todayDay));
  const [ovx, ovy] = polar(cx, cy, r, deg(w.ovulationDay));

  return (
    <div className="grid place-items-center">
      <svg viewBox={`0 0 ${S} ${S}`} className="w-full max-w-[260px]" role="img" aria-label="Your cycle wheel">
        {/* track */}
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--blush)" strokeWidth={sw} />
        {/* phase arcs */}
        {w.arcs.map((arc, i) => {
          const start = deg(arc.startDay) + gap;
          const end = deg(arc.endDay) - gap;
          if (end <= start) return null;
          return (
            <path key={i} d={arcPath(cx, cy, r, start, end)} fill="none"
              stroke={PHASE_ARC[arc.phase]} strokeWidth={sw} strokeLinecap="round" opacity={0.9} />
          );
        })}
        {/* fertile window — a soft glowing outer band */}
        <path d={arcPath(cx, cy, r + sw / 2 + 4, deg(w.fertileStart), deg(w.fertileEnd))}
          fill="none" stroke="#F472B6" strokeWidth={3} strokeLinecap="round" opacity={0.7} />
        {/* ovulation peak marker */}
        <circle cx={ovx} cy={ovy} r={4.5} fill="#fff" stroke="#DB2777" strokeWidth={2.5} />
        {/* today needle */}
        <line x1={cx} y1={cy} x2={tx} y2={ty} stroke="#9D174D" strokeWidth={2} opacity={0.35} />
        <circle cx={tx} cy={ty} r={7} fill="#fff" stroke="#DB2777" strokeWidth={3} />
        <circle cx={tx} cy={ty} r={2.5} fill="#DB2777" />
        {/* center label */}
        <text x={cx} y={cy - 6} textAnchor="middle" className="font-script" fontSize="30" fill="#DB2777">{dayLabel}</text>
        <text x={cx} y={cy + 14} textAnchor="middle" fontSize="10.5" fontWeight="700" fill="#9D5C7E" style={{ textTransform: "uppercase", letterSpacing: "0.08em" }}>{phaseLabel}</text>
      </svg>
      {/* legend */}
      <div className="mt-1 flex flex-wrap justify-center gap-x-3 gap-y-1">
        {(["period", "follicular", "fertile", "ovulation", "luteal"] as Phase[]).map((p) => (
          <span key={p} className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wide text-rose/60">
            <span className="h-2 w-2 rounded-full" style={{ background: PHASE_ARC[p] }} />{PHASE_SHORT[p]}
          </span>
        ))}
      </div>
    </div>
  );
}

/* ── 7-day Forecast strip ────────────────────────────────────────────────── */
export function ForecastStrip({ days }: { days: ForecastDay[] }) {
  const maxE = 5;
  return (
    <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
      {days.map((d, i) => {
        const h = Math.max(0.15, d.energyScore / maxE);
        return (
          <div key={i} className={`flex-1 min-w-[42px] rounded-2xl p-2 text-center ${d.isToday ? "ring-2 ring-hotpink/40" : ""}`}
            style={{ background: d.isToday ? "rgba(252,231,243,0.9)" : "rgba(255,255,255,0.6)", border: "1px solid rgba(236,72,153,0.12)" }}>
            <p className="text-[9.5px] font-bold uppercase tracking-wide" style={{ color: d.isToday ? "#DB2777" : "#9D5C7E" }}>{d.label}</p>
            {/* phase dot */}
            <span className="mx-auto my-1 block h-1.5 w-1.5 rounded-full" style={{ background: PHASE_ARC[d.phase] }} />
            {/* energy bar */}
            <div className="mx-auto flex h-12 w-3 items-end overflow-hidden rounded-full" style={{ background: "rgba(236,72,153,0.10)" }}>
              <div className="w-full rounded-full transition-all duration-700"
                style={{ height: `${h * 100}%`, background: "linear-gradient(180deg,#EC4899,#BE185D)" }} />
            </div>
            {/* status glyph */}
            <p className="mt-1 h-4 text-[11px] leading-none">
              {d.isOvulation ? "🌸" : d.isFertile ? "💗" : d.isPeriod ? "🩸" : d.isPMS ? "🌙" : d.isRecovery ? "💤" : ""}
            </p>
          </div>
        );
      })}
    </div>
  );
}

/* ── Hormone curve with her mood overlaid ────────────────────────────────── */
function estrogen(d: number, len: number, ov: number) {
  const primary = Math.exp(-Math.pow(d - (ov - 1), 2) / (2 * Math.pow(len * 0.085, 2)));
  const luteal = 0.4 * Math.exp(-Math.pow(d - (ov + 7), 2) / (2 * Math.pow(len * 0.12, 2)));
  return Math.min(1, primary + luteal);
}
function progesterone(d: number, len: number, ov: number) {
  if (d < ov) return 0.04;
  return Math.min(1, 0.04 + Math.exp(-Math.pow(d - (ov + 6), 2) / (2 * Math.pow(len * 0.11, 2))));
}
export function HormoneMoodCurve({ cycleLength, todayDay }: { cycleLength: number; todayDay: number }) {
  const VW = 300, VH = 96, PX = 6, PT = 8, CH = 62;
  const cw = VW - PX * 2, ov = cycleLength - 14;
  const xAt = (d: number) => PX + (d / (cycleLength - 1)) * cw;
  const yAt = (v: number) => PT + (1 - v) * CH;
  const path = (fn: (d: number) => number) => {
    let p = "";
    for (let d = 0; d < cycleLength; d++) p += `${d === 0 ? "M" : "L"} ${xAt(d).toFixed(1)} ${yAt(fn(d)).toFixed(1)} `;
    return p.trim();
  };
  const est = path((d) => estrogen(d, cycleLength, ov));
  const prog = path((d) => progesterone(d, cycleLength, ov));
  const scatter = moodScatter();
  const tX = xAt(Math.min(cycleLength - 1, todayDay));
  return (
    <div>
      <svg viewBox={`0 0 ${VW} ${VH}`} width="100%" style={{ display: "block" }}>
        <line x1={tX} y1={PT - 2} x2={tX} y2={PT + CH} stroke="rgba(157,23,77,0.3)" strokeWidth="1.5" strokeDasharray="3 3" />
        <path d={est} fill="none" stroke="#EC4899" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
        <path d={prog} fill="none" stroke="#9D174D" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
        {/* her mood dots (valence 1..5 → 0..1) */}
        {scatter.map((m, i) => (
          <circle key={i} cx={xAt(Math.min(cycleLength - 1, m.day))} cy={yAt((m.score - 1) / 4)} r="2.4"
            fill="#fff" stroke="#DB2777" strokeWidth="1.4" opacity={0.85} />
        ))}
        <line x1={PX} y1={PT + CH} x2={VW - PX} y2={PT + CH} stroke="rgba(236,72,153,0.15)" strokeWidth="1" />
      </svg>
      <div className="mt-1 flex items-center gap-3 text-[9px] font-bold">
        <span className="inline-flex items-center gap-1" style={{ color: "#EC4899" }}><span className="h-0.5 w-3 rounded-full" style={{ background: "#EC4899" }} />Estrogen</span>
        <span className="inline-flex items-center gap-1" style={{ color: "#9D174D" }}><span className="h-0.5 w-3 rounded-full" style={{ background: "#9D174D" }} />Progesterone</span>
        <span className="inline-flex items-center gap-1 text-rose/60"><span className="h-2 w-2 rounded-full border border-hotpink bg-white" />Your mood</span>
      </div>
    </div>
  );
}

/* ── Fertility gauge (top semicircle needle) ─────────────────────────────── */
const FERT_ORDER: FertilityLevel[] = ["low", "medium", "high", "peak"];
export function FertilityGauge({ level }: { level: FertilityLevel }) {
  const idx = FERT_ORDER.indexOf(level);
  const S = 168, H = 104, cx = S / 2, cy = 90, r = 68;
  // Top semicircle: our polar has 0°=up, so a top arc spans −90° (left) → +90° (right).
  const seg = 180 / 4;
  const angleAt = (i: number) => -90 + seg * i;         // segment boundary, top semicircle
  const needleDeg = angleAt(idx) + seg / 2;             // centre of the active segment
  const [nx, ny] = polar(cx, cy, r - 14, needleDeg);
  const COLORS = ["#F9A8D4", "#F472B6", "#EC4899", "#DB2777"];
  return (
    <div className="grid place-items-center">
      <svg viewBox={`0 0 ${S} ${H}`} className="w-full max-w-[210px]">
        {FERT_ORDER.map((_, i) => {
          const [x0, y0] = polar(cx, cy, r, angleAt(i));
          const [x1, y1] = polar(cx, cy, r, angleAt(i + 1));
          // sweep-flag 1 = clockwise, which arcs left→right over the TOP
          return <path key={i} d={`M ${x0.toFixed(1)} ${y0.toFixed(1)} A ${r} ${r} 0 0 1 ${x1.toFixed(1)} ${y1.toFixed(1)}`}
            fill="none" stroke={i <= idx ? COLORS[i] : "var(--blush)"} strokeWidth="13" strokeLinecap="round" />;
        })}
        {/* needle */}
        <line x1={cx} y1={cy} x2={nx} y2={ny} stroke="#9D174D" strokeWidth="3" strokeLinecap="round" />
        <circle cx={cx} cy={cy} r="4.5" fill="#9D174D" />
        <text x={cx} y={cy - 22} textAnchor="middle" className="font-script" fontSize="22" fill="#DB2777" style={{ textTransform: "capitalize" }}>{level}</text>
      </svg>
      <div className="-mt-1.5 flex w-full max-w-[210px] justify-between px-2 text-[8.5px] font-bold uppercase tracking-wide text-rose/50">
        <span>Low</span><span>Med</span><span>High</span><span>Peak</span>
      </div>
    </div>
  );
}

/* ── Confidence radial gauge ─────────────────────────────────────────────── */
export function ConfidenceGauge({ pct, sub }: { pct: number; sub?: ReactNode }) {
  const r = 26, c = 2 * Math.PI * r, off = c * (1 - pct / 100);
  return (
    <div className="flex items-center gap-3">
      <div className="relative grid place-items-center shrink-0">
        <svg viewBox="0 0 64 64" className="h-16 w-16 -rotate-90">
          <circle cx="32" cy="32" r={r} fill="none" stroke="var(--blush)" strokeWidth="7" />
          <circle cx="32" cy="32" r={r} fill="none" stroke="url(#confgrad)" strokeWidth="7" strokeLinecap="round"
            strokeDasharray={c} strokeDashoffset={off} style={{ transition: "stroke-dashoffset 900ms cubic-bezier(0.22,1,0.36,1)" }} />
          <defs><linearGradient id="confgrad" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#B76E79" /><stop offset="100%" stopColor="#EC4899" /></linearGradient></defs>
        </svg>
        <span className="absolute font-script text-lg text-hotpink">{pct}<span className="text-[10px]">%</span></span>
      </div>
      {sub && <p className="text-[11px] leading-snug text-rose/70">{sub}</p>}
    </div>
  );
}
