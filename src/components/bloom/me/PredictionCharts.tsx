import type { ReactNode } from "react";
import { computeWheel, moodScatter, type ForecastDay, type FertilityLevel } from "@/lib/predictions";
import type { CyclePhase } from "@/components/bloom/cyclePhase";

/* Real dashboard instruments for Smart Predictions — a glowing cycle wheel, a
   weather-style forecast strip, a hormone×mood curve and gauges. Single-hue
   pink for magnitude with a few status accents, so it reads as one system.
   All SVG is JSX (real SVG nodes) — never innerHTML strings. */

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
function arcPath(cx: number, cy: number, r: number, startDeg: number, endDeg: number): string {
  const [x1, y1] = polar(cx, cy, r, startDeg);
  const [x2, y2] = polar(cx, cy, r, endDeg);
  const large = Math.abs(endDeg - startDeg) <= 180 ? 0 : 1;
  return `M ${x1.toFixed(2)} ${y1.toFixed(2)} A ${r} ${r} 0 ${large} 1 ${x2.toFixed(2)} ${y2.toFixed(2)}`;
}

/* ── Cycle Wheel ─────────────────────────────────────────────────────────── */
export function CycleWheel({ dayLabel, phaseLabel, note }: { dayLabel: string; phaseLabel: string; note?: string }) {
  const w = computeWheel();
  const S = 232, cx = S / 2, cy = S / 2, r = 90, sw = 22, gap = 1.6;
  const deg = (day: number) => (day / w.cycleLength) * 360;
  const [tx, ty] = polar(cx, cy, r, deg(w.todayDay));
  const [ovx, ovy] = polar(cx, cy, r, deg(w.ovulationDay));

  return (
    <div className="grid place-items-center">
      <svg viewBox={`0 0 ${S} ${S}`} className="w-full max-w-[260px]" role="img" aria-label="Your cycle wheel">
        <defs>
          <radialGradient id="wheelglow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.95" />
            <stop offset="100%" stopColor="#FCE7F3" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="wheelscrim" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.86" />
            <stop offset="62%" stopColor="#ffffff" stopOpacity="0.62" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0.15" />
          </radialGradient>
          <clipPath id="wheelclip"><circle cx={cx} cy={cy} r={r - sw / 2 + 1} /></clipPath>
        </defs>
        <circle cx={cx} cy={cy} r={r - sw} fill="url(#wheelglow)" />
        {/* soft blossom photo filling the centre */}
        <image href="/images/me/wheel-blossom.webp" x={cx - (r - sw / 2)} y={cy - (r - sw / 2)} width={(r - sw / 2) * 2} height={(r - sw / 2) * 2} clipPath="url(#wheelclip)" preserveAspectRatio="xMidYMid slice" />
        <circle cx={cx} cy={cy} r={r - sw / 2} fill="url(#wheelscrim)" />
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="#FBE3EE" strokeWidth={sw} />
        {w.arcs.map((arc, i) => {
          const a0 = deg(arc.startDay) + gap, a1 = deg(arc.endDay) - gap;
          if (a1 <= a0) return null;
          return <path key={i} d={arcPath(cx, cy, r, a0, a1)} fill="none" stroke={PHASE_ARC[arc.phase]} strokeWidth={sw} strokeLinecap="round" />;
        })}
        {/* fertile outer band */}
        <path d={arcPath(cx, cy, r + sw / 2 + 5, deg(w.fertileStart), deg(w.fertileEnd))}
          fill="none" stroke="#F472B6" strokeWidth={3.5} strokeLinecap="round" opacity={0.75} />
        {/* ovulation peak marker */}
        <circle cx={ovx} cy={ovy} r={5} fill="#fff" stroke="#DB2777" strokeWidth={2.5} />
        {/* today needle */}
        <line x1={cx} y1={cy} x2={tx} y2={ty} stroke="#DB2777" strokeWidth={2} opacity={0.3} />
        <circle cx={tx} cy={ty} r={9} fill="#fff" stroke="#DB2777" strokeWidth={3.5} />
        <circle cx={tx} cy={ty} r={3.5} fill="#DB2777" />
        {/* center */}
        <text x={cx} y={cy - 4} textAnchor="middle" className="font-script" fontSize="34" fill="#DB2777">{dayLabel}</text>
        <text x={cx} y={cy + 16} textAnchor="middle" fontSize="11" fontWeight="800" fill="#9D5C7E" style={{ letterSpacing: "0.1em" }}>{phaseLabel.toUpperCase()}</text>
        {note && <text x={cx} y={cy + 30} textAnchor="middle" fontSize="9" fill="#B76E79">{note}</text>}
      </svg>
      <div className="mt-1.5 flex flex-wrap justify-center gap-x-3 gap-y-1">
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
  return (
    <div className="flex gap-1.5">
      {days.map((d, i) => {
        const h = Math.max(0.12, d.energyScore / 5);
        const glyph = d.isOvulation ? "🌸" : d.isFertile ? "💗" : d.isPeriod ? "🩸" : d.isPMS ? "🌙" : d.isRecovery ? "💤" : "";
        return (
          <div key={i} className="flex-1 min-w-0 rounded-[18px] px-0.5 py-2.5 text-center"
            style={{
              background: d.isToday ? "linear-gradient(180deg,#FDECF4,#FBDCEB)" : "rgba(255,255,255,0.55)",
              border: "1px solid rgba(236,72,153,0.10)",
              boxShadow: d.isToday ? "0 4px 12px rgba(219,39,119,0.18)" : "none",
            }}>
            <p className="text-[9.5px] font-extrabold uppercase tracking-wide" style={{ color: d.isToday ? "#DB2777" : "#B08099" }}>{d.label}</p>
            <span className="mx-auto my-1.5 block h-1.5 w-1.5 rounded-full" style={{ background: PHASE_ARC[d.phase] }} />
            <div className="mx-auto flex h-11 w-2.5 items-end overflow-hidden rounded-full" style={{ background: "rgba(236,72,153,0.09)" }}>
              <div className="w-full rounded-full transition-all duration-700" style={{ height: `${h * 100}%`, background: "linear-gradient(180deg,#F472B6,#BE185D)" }} />
            </div>
            <p className="mt-1.5 h-4 text-[11px] leading-none">{glyph}</p>
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
  const VW = 300, VH = 108, PX = 6, PT = 10, CH = 66;
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
        <line x1={tX} y1={PT - 2} x2={tX} y2={PT + CH} stroke="rgba(157,23,77,0.35)" strokeWidth="1.5" strokeDasharray="3 3" />
        <path d={est} fill="none" stroke="#EC4899" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
        <path d={prog} fill="none" stroke="#9D174D" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
        {scatter.map((m, i) => (
          <circle key={i} cx={xAt(Math.min(cycleLength - 1, m.day))} cy={yAt((m.score - 1) / 4)} r="2.6"
            fill="#fff" stroke="#DB2777" strokeWidth="1.5" opacity={0.85} />
        ))}
        <line x1={PX} y1={PT + CH} x2={VW - PX} y2={PT + CH} stroke="rgba(236,72,153,0.15)" strokeWidth="1" />
      </svg>
      <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[8.5px] font-extrabold">
        <span style={{ color: "#EC4899" }}>▬ Estrogen</span>
        <span style={{ color: "#9D174D" }}>▬ Progesterone</span>
        <span className="text-rose/60">○ Your mood</span>
      </div>
    </div>
  );
}

/* ── Fertility gauge (top semicircle needle, label below) ────────────────── */
const FERT_ORDER: FertilityLevel[] = ["low", "medium", "high", "peak"];
export function FertilityGauge({ level }: { level: FertilityLevel }) {
  const idx = FERT_ORDER.indexOf(level);
  const S = 170, H = 122, cx = S / 2, cy = 92, r = 66;
  const seg = 180 / 4;
  const angleAt = (i: number) => -90 + seg * i;
  const needleDeg = angleAt(idx) + seg / 2;
  const [nx, ny] = polar(cx, cy, r - 16, needleDeg);
  const COLORS = ["#F9A8D4", "#F472B6", "#EC4899", "#DB2777"];
  return (
    <div className="grid place-items-center">
      <svg viewBox={`0 0 ${S} ${H}`} className="w-full max-w-[200px]">
        {FERT_ORDER.map((_, i) => {
          const [x0, y0] = polar(cx, cy, r, angleAt(i));
          const [x1, y1] = polar(cx, cy, r, angleAt(i + 1));
          return <path key={i} d={`M ${x0.toFixed(1)} ${y0.toFixed(1)} A ${r} ${r} 0 0 1 ${x1.toFixed(1)} ${y1.toFixed(1)}`}
            fill="none" stroke={i <= idx ? COLORS[i] : "#FBE3EE"} strokeWidth="14" strokeLinecap="round" />;
        })}
        <line x1={cx} y1={cy} x2={nx} y2={ny} stroke="#9D174D" strokeWidth="3.5" strokeLinecap="round" />
        <circle cx={cx} cy={cy} r="5" fill="#9D174D" />
        {/* label sits BELOW the needle pivot so it never overlaps the arc */}
        <text x={cx} y={cy + 24} textAnchor="middle" className="font-script" fontSize="22" fill="#DB2777" style={{ textTransform: "capitalize" }}>{level}</text>
      </svg>
      <div className="-mt-1 flex w-full max-w-[200px] justify-between px-2 text-[8px] font-extrabold uppercase tracking-wide text-rose/50">
        <span>Low</span><span>Med</span><span>High</span><span>Peak</span>
      </div>
    </div>
  );
}

/* ── Confidence ring ("95% sure") ────────────────────────────────────────── */
export function ConfidenceRing({ pct, size = 72 }: { pct: number; size?: number }) {
  const r = 28, c = 2 * Math.PI * r, off = c * (1 - pct / 100);
  return (
    <svg viewBox="0 0 72 72" width={size} height={size} className="shrink-0">
      <defs><linearGradient id="confgrad" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#B76E79" /><stop offset="100%" stopColor="#DB2777" /></linearGradient></defs>
      <circle cx="36" cy="36" r={r} fill="none" stroke="#FBE3EE" strokeWidth="8" />
      <circle cx="36" cy="36" r={r} fill="none" stroke="url(#confgrad)" strokeWidth="8" strokeLinecap="round"
        strokeDasharray={c} strokeDashoffset={off} transform="rotate(-90 36 36)"
        style={{ transition: "stroke-dashoffset 900ms cubic-bezier(0.22,1,0.36,1)" }} />
      <text x="36" y="35" textAnchor="middle" className="font-script" fontSize="19" fill="#DB2777">{pct}%</text>
      <text x="36" y="47" textAnchor="middle" fontSize="7.5" fontWeight="800" fill="#B76E79" style={{ letterSpacing: "0.08em" }}>SURE</text>
    </svg>
  );
}

/* eyebrow section label with a gold accent rule */
export function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-center gap-1.5 text-[9.5px] font-extrabold uppercase tracking-[0.12em]" style={{ color: "#B76E79" }}>
      <span className="h-0.5 w-3.5 rounded-full" style={{ background: "linear-gradient(90deg,#B76E79,#EC4899)" }} />
      {children}
    </div>
  );
}
