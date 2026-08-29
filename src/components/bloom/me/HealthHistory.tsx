/**
 * Your history — the Me-page panel that turns every REAL logged event into
 * lifetime insights, interactive charts + a doctor-shareable report. All data
 * comes from computeHealthHistory (which only reads canonical stores), so
 * nothing here can disagree with the rest of the app.
 *
 * Charts are simple and interactive: tap any bar / point to reveal that day's
 * details (kept out of the way until asked for), and each chart carries a
 * one-line reading of its pattern. The printed report renders the same charts
 * statically and lists every point in a table (see healthReport.ts), so the
 * tap-to-reveal detail is never lost on paper.
 *
 * Responsive per the Bloomzein directive: mobile stacks single-column with
 * two-up stat tiles; desktop uses multi-column.
 */
import { useId, useMemo, useState } from "react";
import {
  Download,
  FileText,
  Flame,
  Dumbbell,
  HeartPulse,
  CalendarDays,
  Scale,
  Smile,
  Sparkles,
  Info,
  Activity,
  Moon,
  UtensilsCrossed,
  TrendingUp,
  TrendingDown,
  Minus,
  ChevronDown,
} from "lucide-react";
import {
  predictedCycleBars,
  predictedWeightSeries,
  predictedMoodSeries,
  predictedCycleLength,
  futureISO,
  type DatedValue,
} from "@/lib/mePredictions";
import { goalProjection } from "@/lib/nutritionTargets";
import { readWorkoutPlanDays, readYogaPlanDays } from "@/lib/crossToolData";
import {
  computeHealthHistory,
  prettyDate,
  titleCase,
  PHASE_LABEL,
  type DayBurn,
  type Cycle,
  type MoodPoint,
  type SymptomDay,
  type PhaseKey,
  type PhaseSegment,
  type PhaseStat,
  type HealthHistory,
} from "@/lib/healthHistory";
import { downloadHealthReport, downloadHealthCSV } from "@/lib/healthReport";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const shortDay = (iso: string) => {
  const d = new Date(iso + "T00:00:00");
  return `${d.getDate()} ${MONTHS[d.getMonth()]}`;
};
const MAX_POINTS = 40; // keep charts legible; the report table carries the full history

// Soft, themed background photo per chart (heavily faded behind a white veil in
// Panel). Lightweight webp so eight of them barely cost anything on load.
const CHART_BG = {
  cycle: "/images/chart-bg-cycle.webp",
  weight: "/images/chart-bg-weight.webp",
  workout: "/images/chart-bg-workout.webp",
  yoga: "/images/chart-bg-yoga.webp",
  mood: "/images/chart-bg-mood.webp",
  symptoms: "/images/chart-bg-symptoms.webp",
  sleep: "/images/chart-bg-sleep.webp",
  nourish: "/images/chart-bg-nourish.webp",
} as const;

/* ---------- atoms ---------- */

function StatTile({
  Icon,
  value,
  label,
  delay = 0,
}: {
  Icon: typeof Flame;
  value: string;
  label: string;
  delay?: number;
}) {
  return (
    <div
      className="flex items-center justify-between gap-2 rounded-2xl border border-white/60 bg-white/45 backdrop-blur-md px-3.5 py-2.5 shadow-[0_4px_16px_-8px_rgba(219,39,119,0.3)] animate-card-pop-in"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="min-w-0">
        <p className="text-xl sm:text-2xl font-black text-magenta leading-none">{value}</p>
        <p className="mt-1 text-[10.5px] font-bold uppercase tracking-wide text-rose/55 leading-tight">
          {label}
        </p>
      </div>
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-blush to-petal/70">
        <Icon className="h-4 w-4 text-hotpink" strokeWidth={2} />
      </span>
    </div>
  );
}

// A slightly richer pink edge (border + soft pink glow) so cards read defined,
// not washed-out pale — without a loud/poppy fill.
// `bg` tucks a soft, themed photo into the BOTTOM-RIGHT CORNER only — a small
// decorative peek that fades into the white card toward the centre, so each chart
// feels its subject (a scale for Weight, blossoms for Cycle) without the busy,
// all-over pink wash. The card stays clean white; the plot reads perfectly.
function Panel({
  children,
  className = "",
  bg,
}: {
  children: React.ReactNode;
  className?: string;
  bg?: string;
}) {
  return (
    <div
      className={`relative overflow-hidden rounded-[1.4rem] border border-hotpink/20 bg-white/90 backdrop-blur p-4 sm:p-5 shadow-[0_4px_18px_-8px_rgba(219,39,119,0.25)] ${className}`}
    >
      {bg && (
        <img
          src={bg}
          alt=""
          aria-hidden
          loading="lazy"
          className="pointer-events-none absolute bottom-0 right-0 h-[62%] w-[46%] object-cover opacity-45"
          style={{
            // Fade the corner peek out toward the top-left so it dissolves into
            // the white card — only the very corner shows the design.
            WebkitMaskImage:
              "radial-gradient(130% 130% at 100% 100%, #000 0%, rgba(0,0,0,0.55) 38%, transparent 72%)",
            maskImage:
              "radial-gradient(130% 130% at 100% 100%, #000 0%, rgba(0,0,0,0.55) 38%, transparent 72%)",
          }}
        />
      )}
      <div className="relative">{children}</div>
    </div>
  );
}

function PanelHead({ Icon, title, hint }: { Icon: typeof Flame; title: string; hint?: string }) {
  return (
    <div className="mb-3 flex items-center justify-between gap-2">
      <p className="inline-flex items-center gap-1.5 font-script text-2xl text-hotpink leading-none">
        <Icon className="h-4 w-4" strokeWidth={2} /> {title}
      </p>
      {hint && <span className="shrink-0 text-[11px] font-semibold text-rose/50">{hint}</span>}
    </div>
  );
}

/* ---------- interactive chart point ---------- */

export interface ChartPoint {
  key: string;
  label: string; // x context (e.g. "4 May")
  value: number;
  readout: string; // shown when tapped
  faded?: boolean; // e.g. an ongoing cycle
  predicted?: boolean; // a forecast bar — drawn hollow & dashed, not a logged fact
}

/** The tap-to-reveal readout + the always-on pattern line. */
function ChartFooter({
  sel,
  hint,
  interpretation,
}: {
  sel: ChartPoint | null;
  hint: string;
  interpretation: string;
}) {
  return (
    <>
      <div className="mt-2.5 min-h-[2.1rem] rounded-xl border border-petal/50 bg-blush/40 px-3 py-2 text-[12px] leading-snug">
        {sel ? (
          <span className="text-[#831843]">
            <b className="text-hotpink">{sel.label}</b> · {sel.readout}
          </span>
        ) : (
          <span className="text-rose/50">{hint}</span>
        )}
      </div>
      <p className="mt-2 flex items-start gap-1.5 text-[11.5px] italic leading-snug text-rose/70">
        <Sparkles className="mt-0.5 h-3 w-3 shrink-0 text-hotpink" strokeWidth={2} />
        <span>{interpretation}</span>
      </p>
    </>
  );
}

/** A small "How this prediction works" toggle — every forecast on this page
 *  carries one, so a dashed reference line is never a black box. Collapsed by
 *  default so it never crowds the chart. */
function PredictionNote({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="mt-2">
      <button
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-hotpink/70 transition hover:text-hotpink"
      >
        How this prediction works
        <ChevronDown className={`h-3 w-3 transition-transform ${open ? "rotate-180" : ""}`} strokeWidth={2.4} />
      </button>
      {open && (
        <p
          className="mt-1.5 text-[11px] leading-relaxed text-rose/70 animate-fade-in"
          style={{ borderLeft: "2px solid rgba(236,72,153,0.35)", paddingLeft: "9px" }}
        >
          {children}
        </p>
      )}
    </div>
  );
}

/* ---------- shared axis geometry + calm, unified palette ---------- */

// Compact charts: a shorter plot so nothing dominates the page.
const AX = { W: 340, H: 132, mL: 28, mR: 8, mT: 12, mB: 22 };
const GRID = "oklch(0.5 0.12 350 / 0.12)";
const AXIS = "oklch(0.5 0.12 350 / 0.28)";
const LABEL = "oklch(0.5 0.1 350 / 0.55)";

// ONE soft rose for every bar chart and ONE muted berry for every line — so the
// page reads as a calm, single system instead of many strong colours competing.
// The SAME cheerful pink as the app's buttons (hotpink #EC4899 → #DB2777),
// not a muted berry — so the charts feel bright and on-brand.
const BAR_TOP = "#DB2777"; // deeper top edge (matches the button gradient's dark stop)
const BAR_C = "#EC4899"; // brand hotpink — the bar body
const LINE_C = "#EC4899"; // brand hotpink (lines + dots)
const SEL_C = "#BE185D"; // a clean deeper pink for the selected point/bar
// ONE dashed rose for EVERY forecast/reference line (weight on-plan path, mood by
// phase, planned calories) — so a dashed rose line always means "predicted", and
// the solid hotpink always means "what you really logged". One system, no
// off-brand purples or teals sneaking into the prediction language.
const PRED_C = "#E7A6C6"; // soft rose — the forecast, sits quietly under the real line

function niceMax(v: number): number {
  if (v <= 0) return 1;
  const pow = Math.pow(10, Math.floor(Math.log10(v)));
  const f = v / pow;
  return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10) * pow;
}
const fmtNum = (v: number) => (Number.isInteger(v) ? String(v) : v.toFixed(1));
/** Which point indices get an x-axis date label (first, middle, last). */
function xLabelIdx(n: number): number[] {
  if (n <= 1) return [0];
  return [...new Set([0, Math.floor((n - 1) / 2), n - 1])];
}

/** Clickable bar chart with real x/y axes, gridlines & a unit label.
 *  `valueLabels` prints each bar's value on top; `perBarLabels` labels every bar
 *  (used by the compact cycle chart, one bar per cycle). */
function BarsChart({
  points,
  unit,
  color,
  tapHint,
  interpretation,
  valueLabels = false,
  perBarLabels = false,
  ghostShape,
}: {
  points: ChartPoint[];
  unit: string;
  color: string;
  tapHint: string;
  interpretation: string;
  valueLabels?: boolean;
  perBarLabels?: boolean;
  ghostShape?: number[]; // empty-state preview: normalized 0..1 heights, Emma-like
}) {
  const shown = points.slice(-MAX_POINTS);
  const [sel, setSel] = useState<string | null>(null);
  const gid = "g" + useId().replace(/[^a-zA-Z0-9]/g, "");
  const { W, H, mL, mR, mT, mB } = AX;
  const x0 = mL,
    x1 = W - mR,
    y0 = mT + (valueLabels ? 6 : 0),
    y1 = H - mB;
  const max = niceMax(Math.max(1, ...shown.map((p) => p.value)));
  const yv = (v: number) => y1 - (v / max) * (y1 - y0);
  const n = shown.length || 1;
  // Cap the slot width so a handful of days don't stretch into huge ugly slabs
  // across the whole axis — bars stay compact and evenly sized whether there are
  // 3 days or 30, sitting left-aligned from the y-axis.
  const MAX_SLOT = 40;
  const bw = Math.min(MAX_SLOT, (x1 - x0) / n);
  const usedW = bw * n;
  const gap = n > 40 ? 0.5 : Math.min(3, bw * 0.28);
  const ticks = [0, max / 2, max];
  const labelIdx = perBarLabels ? shown.map((_, i) => i) : xLabelIdx(shown.length);
  const selPoint = shown.find((p) => p.key === sel) ?? null;
  return (
    <div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full h-auto"
        role="img"
        aria-label="Bar chart with axes"
      >
        <defs>
          {/* premium gradient: a richer pink edge at the top, melting to a pale base */}
          <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={BAR_TOP} />
            <stop offset="22%" stopColor={color} />
            <stop offset="100%" stopColor={color} stopOpacity="0.3" />
          </linearGradient>
        </defs>
        <text x={x1} y={mT + 2} textAnchor="end" style={{ fontSize: 8, fill: LABEL, fontWeight: 700 }}>
          {unit}
        </text>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={x0} x2={x0 + usedW} y1={yv(t)} y2={yv(t)} stroke={GRID} strokeWidth={1} />
            <text x={x0 - 4} y={yv(t) + 3} textAnchor="end" style={{ fontSize: 8, fill: LABEL }}>
              {fmtNum(Math.round(t))}
            </text>
          </g>
        ))}
        <line x1={x0} x2={x0 + usedW} y1={y1} y2={y1} stroke={AXIS} strokeWidth={1} />
        {/* Nothing logged yet → a soft, cute "ghost" preview: faint bars in a
            lively rhythm + a dashed trend line, so she sees the pattern that will
            bloom here and wants to come back and fill it in. Purely decorative. */}
        {shown.every((p) => !p.value) && (() => {
          const hs = ghostShape ?? [0.34, 0.6, 0.44, 0.82, 0.5, 0.92, 0.46];
          const gN = hs.length;
          const gw = Math.min(MAX_SLOT, (x1 - x0) / gN);
          const cx = (i: number) => x0 + i * gw + gw / 2;
          const cy = (f: number) => y1 - f * (y1 - y0);
          const line = hs.map((f, i) => `${i === 0 ? "M" : "L"} ${cx(i).toFixed(1)} ${cy(f).toFixed(1)}`).join(" ");
          return (
            <g aria-hidden>
              {hs.map((f, i) => (
                <rect key={i} x={x0 + i * gw + 1.5} y={cy(f)} width={Math.max(0.6, gw - 3)} height={y1 - cy(f)} rx={2} fill={color} fillOpacity={0.09} />
              ))}
              <path d={line} fill="none" stroke={color} strokeOpacity={0.3} strokeWidth={1.3} strokeDasharray="3 3" strokeLinecap="round" strokeLinejoin="round" />
              {hs.map((f, i) => <circle key={i} cx={cx(i)} cy={cy(f)} r={1.5} fill={color} fillOpacity={0.38} />)}
              <text x={(x0 + x1) / 2} y={cy(0.5) + 3} textAnchor="middle" style={{ fontSize: 8, fill: color, fillOpacity: 0.6, fontWeight: 700 }}>
                your rhythm blooms here ✿
              </text>
            </g>
          );
        })()}
        {shown.map((p, i) => {
          const active = p.key === sel;
          const bx = x0 + i * bw;
          const bodyW = Math.max(0.6, bw - gap);
          return (
            <g
              key={p.key}
              onClick={() => setSel(active ? null : p.key)}
              style={{ cursor: "pointer" }}
            >
              <rect x={bx} y={y0} width={bw} height={y1 - y0} fill="transparent" />
              {p.predicted ? (
                // A forecast bar — hollow with a dashed brand outline, so it reads
                // clearly as "predicted", not a logged fact.
                <rect
                  x={bx + gap / 2}
                  y={yv(p.value)}
                  width={bodyW}
                  height={Math.max(p.value > 0 ? 1.5 : 0, y1 - yv(p.value))}
                  rx={1.5}
                  fill={color}
                  fillOpacity={0.12}
                  stroke={active ? SEL_C : color}
                  strokeWidth={1.2}
                  strokeDasharray="2.5 2"
                />
              ) : (
                <rect
                  x={bx + gap / 2}
                  y={yv(p.value)}
                  width={bodyW}
                  height={Math.max(p.value > 0 ? 1.5 : 0, y1 - yv(p.value))}
                  rx={1.5}
                  fill={`url(#${gid})`}
                  opacity={p.faded ? 0.45 : 1}
                  stroke={active ? SEL_C : "none"}
                  strokeWidth={active ? 1.5 : 0}
                />
              )}
              {valueLabels && (
                <text
                  x={bx + bw / 2}
                  y={yv(p.value) - 3}
                  textAnchor="middle"
                  style={{ fontSize: 8.5, fill: SEL_C, fontWeight: 800 }}
                >
                  {fmtNum(p.value)}
                </text>
              )}
            </g>
          );
        })}
        {labelIdx.map(
          (i) =>
            shown[i] && (
              <text
                key={i}
                x={x0 + i * bw + bw / 2}
                y={y1 + 12}
                textAnchor="middle"
                style={{ fontSize: 8, fill: LABEL, fontWeight: 600 }}
              >
                {shown[i].label}
              </text>
            ),
        )}
      </svg>
      <ChartFooter sel={selPoint} hint={tapHint} interpretation={interpretation} />
    </div>
  );
}

/** Clickable line chart with real x/y axes, gridlines & a unit label. */
function LineChart({
  points,
  unit,
  color,
  yMin,
  yMax,
  tapHint,
  interpretation,
}: {
  points: ChartPoint[];
  unit: string;
  color: string;
  yMin?: number;
  yMax?: number;
  tapHint: string;
  interpretation: string;
}) {
  const shown = points.slice(-MAX_POINTS);
  const [sel, setSel] = useState<string | null>(null);
  const selPoint = shown.find((p) => p.key === sel) ?? null;
  const gid = "l" + useId().replace(/[^a-zA-Z0-9]/g, "");
  const { W, H, mL, mR, mT, mB } = AX;
  const x0 = mL,
    x1 = W - mR,
    y0 = mT,
    y1 = H - mB;
  if (shown.length < 2) {
    return (
      <div>
        <div className="grid h-28 place-items-center rounded-xl bg-blush/30 text-[12px] text-rose/50">
          Not enough points yet
        </div>
        <ChartFooter sel={selPoint} hint={tapHint} interpretation={interpretation} />
      </div>
    );
  }
  const vals = shown.map((p) => p.value);
  let lo = yMin ?? Math.min(...vals);
  let hi = yMax ?? Math.max(...vals);
  if (yMin == null && yMax == null) {
    const pad = (hi - lo || 1) * 0.15;
    lo -= pad;
    hi += pad;
  }
  const span = hi - lo || 1;
  const x = (i: number) => x0 + (i / (shown.length - 1)) * (x1 - x0);
  const y = (v: number) => y0 + (1 - (v - lo) / span) * (y1 - y0);
  const d = shown
    .map((p, i) => `${i === 0 ? "M" : "L"} ${x(i).toFixed(1)} ${y(p.value).toFixed(1)}`)
    .join(" ");
  const area = `${d} L ${x(shown.length - 1).toFixed(1)} ${y1} L ${x(0).toFixed(1)} ${y1} Z`;
  const ticks = [lo, (lo + hi) / 2, hi];
  return (
    <div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full h-auto"
        role="img"
        aria-label="Line chart with axes"
      >
        <defs>
          <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.28" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        <text x={x1} y={y0 - 1} textAnchor="end" style={{ fontSize: 8, fill: LABEL, fontWeight: 700 }}>
          {unit}
        </text>
        {ticks.map((t, i) => (
          <g key={i}>
            <line x1={x0} x2={x1} y1={y(t)} y2={y(t)} stroke={GRID} strokeWidth={1} />
            <text x={x0 - 4} y={y(t) + 3} textAnchor="end" style={{ fontSize: 8, fill: LABEL }}>
              {fmtNum(Math.round(t * 10) / 10)}
            </text>
          </g>
        ))}
        <line x1={x0} x2={x1} y1={y1} y2={y1} stroke={AXIS} strokeWidth={1} />
        <path d={area} fill={`url(#${gid})`} stroke="none" />
        <path
          d={d}
          fill="none"
          stroke={color}
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {shown.map((p, i) => {
          const active = p.key === sel;
          return (
            <g
              key={p.key}
              onClick={() => setSel(active ? null : p.key)}
              style={{ cursor: "pointer" }}
            >
              <circle cx={x(i)} cy={y(p.value)} r={10} fill="transparent" />
              <circle
                cx={x(i)}
                cy={y(p.value)}
                r={active ? 4.5 : 2.6}
                fill={active ? SEL_C : color}
                stroke="#fff"
                strokeWidth={active ? 1.8 : 1}
              />
            </g>
          );
        })}
        {xLabelIdx(shown.length).map(
          (i) =>
            shown[i] && (
              <text
                key={i}
                x={x(i)}
                y={y1 + 12}
                textAnchor={i === 0 ? "start" : i === shown.length - 1 ? "end" : "middle"}
                style={{ fontSize: 8, fill: LABEL, fontWeight: 600 }}
              >
                {shown[i].label}
              </text>
            ),
        )}
      </svg>
      <ChartFooter sel={selPoint} hint={tapHint} interpretation={interpretation} />
    </div>
  );
}

/** A forecast line chart: a dashed PREDICTED reference (the plan / what your
 *  phase suggests) laid under the solid LOGGED line (what really happened), on a
 *  shared time axis so the forecast can reach into next week and the truth can
 *  correct it. Tappable dots on the logged line; a "how this works" note below. */
interface ForecastActual {
  key: string;
  date: string;
  value: number;
  readout: string;
}
function ForecastLineChart({
  actual,
  predicted,
  unit,
  actualLabel,
  predictedLabel,
  predictedColor,
  yMin,
  yMax,
  tapHint,
  interpretation,
  note,
  actualDots = false,
  ghostShape,
}: {
  actual: ForecastActual[];
  predicted: DatedValue[];
  unit: string;
  actualLabel: string;
  predictedLabel: string;
  predictedColor: string;
  yMin?: number;
  yMax?: number;
  tapHint: string;
  interpretation: string;
  note: React.ReactNode;
  actualDots?: boolean; // render the logged series as scatter dots (no plunging line)
  ghostShape?: number[]; // empty-state preview: normalized 0..1 points, Emma-like
}) {
  const shownActual = actual.slice(-MAX_POINTS);
  const [sel, setSel] = useState<string | null>(null);
  const gid = "f" + useId().replace(/[^a-zA-Z0-9]/g, "");
  const { W, H, mL, mR, mT, mB } = AX;
  const x0 = mL,
    x1 = W - mR,
    y0 = mT,
    y1 = H - mB;

  // Keep the two series on the SAME window: the reference is clipped to start
  // where the (capped) logged data starts, so it never spills wider than the real
  // line and squishes it — while still reaching a little into the future.
  const clipFromT = shownActual.length
    ? toTime(shownActual[0].date)
    : predicted.length
      ? toTime(predicted[0].date)
      : 0;
  const shownPred = predicted.filter((p) => toTime(p.date) >= clipFromT - DAY);

  const hasA = shownActual.length > 0;
  const hasP = shownPred.length >= 2;
  if (!hasA && !hasP) {
    // Nothing logged yet → a soft, cute "ghost" preview: a faint rising trend line
    // (dashed, with gentle dots) so she sees the pattern that will bloom here and
    // wants to come back and fill it in. Purely decorative.
    const hs = ghostShape ?? [0.4, 0.55, 0.47, 0.68, 0.58, 0.8, 0.72];
    const gN = hs.length;
    const gcol = predictedColor || "#EC4899";
    const gx = (i: number) => x0 + (i / (gN - 1)) * (x1 - x0);
    const gy = (f: number) => y1 - f * (y1 - y0);
    const gline = hs.map((f, i) => `${i === 0 ? "M" : "L"} ${gx(i).toFixed(1)} ${gy(f).toFixed(1)}`).join(" ");
    return (
      <div>
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img" aria-label="Preview">
          <line x1={x0} x2={x1} y1={y1} y2={y1} stroke={AXIS} strokeWidth={1} />
          <g aria-hidden>
            <path d={`${gline} L ${gx(gN - 1).toFixed(1)} ${y1.toFixed(1)} L ${gx(0).toFixed(1)} ${y1.toFixed(1)} Z`} fill={gcol} fillOpacity={0.06} />
            <path d={gline} fill="none" stroke={gcol} strokeOpacity={0.3} strokeWidth={1.5} strokeDasharray="3 3" strokeLinecap="round" strokeLinejoin="round" />
            {hs.map((f, i) => <circle key={i} cx={gx(i)} cy={gy(f)} r={1.5} fill={gcol} fillOpacity={0.38} />)}
            <text x={(x0 + x1) / 2} y={gy(0.5) + 3} textAnchor="middle" style={{ fontSize: 8, fill: gcol, fillOpacity: 0.6, fontWeight: 700 }}>
              your rhythm blooms here ✿
            </text>
          </g>
        </svg>
        <ChartFooter sel={null} hint={tapHint} interpretation={interpretation} />
        <PredictionNote>{note}</PredictionNote>
      </div>
    );
  }

  // Shared time axis across BOTH series so the forecast can extend the range.
  const allT = [...shownActual.map((p) => toTime(p.date)), ...shownPred.map((p) => toTime(p.date))];
  const tMin = Math.min(...allT);
  const tMax = Math.max(...allT);
  const tSpan = tMax - tMin || DAY;
  const xAt = (iso: string) => x0 + ((toTime(iso) - tMin) / tSpan) * (x1 - x0);

  const allV = [...shownActual.map((p) => p.value), ...shownPred.map((p) => p.value)];
  let lo = yMin ?? Math.min(...allV);
  let hi = yMax ?? Math.max(...allV);
  if (yMin == null && yMax == null) {
    const pad = (hi - lo || 1) * 0.15;
    lo -= pad;
    hi += pad;
  }
  const span = hi - lo || 1;
  const yAt = (v: number) => y0 + (1 - (v - lo) / span) * (y1 - y0);
  const ticks = [lo, (lo + hi) / 2, hi];

  const linePath = (pts: { date: string; value: number }[]) =>
    pts
      .map((p, i) => `${i === 0 ? "M" : "L"} ${xAt(p.date).toFixed(1)} ${yAt(p.value).toFixed(1)}`)
      .join(" ");
  const actualPath = linePath(shownActual);
  const predPath = linePath(shownPred);
  const actualArea =
    hasA && !actualDots
      ? `${actualPath} L ${xAt(shownActual[shownActual.length - 1].date).toFixed(1)} ${y1} L ${xAt(shownActual[0].date).toFixed(1)} ${y1} Z`
      : "";

  // date labels: first / middle / last across the shared axis
  const labelISOs = [...new Set([tMin, (tMin + tMax) / 2, tMax])].map((t) => localFromT(t));
  const selDay = shownActual.find((p) => p.key === sel) ?? null;

  return (
    <div>
      <div className="mb-2 flex flex-wrap gap-x-3 gap-y-1">
        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose/70">
          <span className="h-0 w-3 border-t-2 border-dashed" style={{ borderColor: predictedColor }} />
          {predictedLabel}
        </span>
        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose/70">
          <span className="h-2.5 w-2.5 rounded-full" style={{ background: LINE_C }} />
          {actualLabel}
        </span>
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img" aria-label="Forecast vs logged">
        <defs>
          <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={LINE_C} stopOpacity="0.22" />
            <stop offset="100%" stopColor={LINE_C} stopOpacity="0" />
          </linearGradient>
        </defs>
        <text x={x1} y={y0 - 1} textAnchor="end" style={{ fontSize: 8, fill: LABEL, fontWeight: 700 }}>
          {unit}
        </text>
        {ticks.map((t, i) => (
          <g key={i}>
            <line x1={x0} x2={x1} y1={yAt(t)} y2={yAt(t)} stroke={GRID} strokeWidth={1} />
            <text x={x0 - 4} y={yAt(t) + 3} textAnchor="end" style={{ fontSize: 8, fill: LABEL }}>
              {fmtNum(Math.round(t * 10) / 10)}
            </text>
          </g>
        ))}
        <line x1={x0} x2={x1} y1={y1} y2={y1} stroke={AXIS} strokeWidth={1} />

        {/* predicted reference — dashed, no dots */}
        {hasP && (
          <path
            d={predPath}
            fill="none"
            stroke={predictedColor}
            strokeWidth={2}
            strokeDasharray="4 3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}

        {/* logged — soft fill + solid line (skipped in dots mode) + tappable dots */}
        {hasA && actualArea && <path d={actualArea} fill={`url(#${gid})`} stroke="none" />}
        {hasA && !actualDots && shownActual.length >= 2 && (
          <path
            d={actualPath}
            fill="none"
            stroke={LINE_C}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}
        {hasA &&
          shownActual.map((p) => {
            const active = p.key === sel;
            return (
              <g key={p.key} onClick={() => setSel(active ? null : p.key)} style={{ cursor: "pointer" }}>
                <circle cx={xAt(p.date)} cy={yAt(p.value)} r={10} fill="transparent" />
                <circle
                  cx={xAt(p.date)}
                  cy={yAt(p.value)}
                  r={active ? 4.5 : actualDots ? 3 : 2.6}
                  fill={active ? SEL_C : LINE_C}
                  stroke="#fff"
                  strokeWidth={active ? 1.8 : 1}
                />
              </g>
            );
          })}

        {labelISOs.map((iso, i) => (
          <text
            key={iso}
            x={xAt(iso)}
            y={y1 + 12}
            textAnchor={i === 0 ? "start" : i === labelISOs.length - 1 ? "end" : "middle"}
            style={{ fontSize: 8, fill: LABEL, fontWeight: 600 }}
          >
            {shortDay(iso)}
          </text>
        ))}
      </svg>

      <div className="mt-2.5 min-h-[2.1rem] rounded-xl border border-petal/50 bg-blush/40 px-3 py-2 text-[12px] leading-snug">
        {selDay ? (
          <span className="text-[#831843]">
            <b className="text-hotpink">{shortDay(selDay.date)}</b> · {selDay.readout}
          </span>
        ) : (
          <span className="text-rose/50">{tapHint}</span>
        )}
      </div>
      <p className="mt-2 flex items-start gap-1.5 text-[11.5px] italic leading-snug text-rose/70">
        <Sparkles className="mt-0.5 h-3 w-3 shrink-0 text-hotpink" strokeWidth={2} />
        <span>{interpretation}</span>
      </p>
      <PredictionNote>{note}</PredictionNote>
    </div>
  );
}

const REG_META = {
  regular: {
    cls: "bg-emerald-100 text-emerald-700",
    text: "Your recent cycles vary by 3 days or less — a regular rhythm.",
  },
  irregular: {
    cls: "bg-amber-100 text-amber-700",
    text: "Your recent cycles vary by more than 3 days — worth keeping an eye on.",
  },
  learning: {
    cls: "bg-blush text-hotpink",
    text: "Log at least two period starts and your rhythm shows here.",
  },
} as const;

/* ---------- point builders ---------- */

// A realistic FUTURE burn forecast from her planned days: for each of the next
// ~2 weeks whose weekday she's scheduled, add a light "predicted" bar (avg of her
// real sessions, or a sensible default). Rendered hollow/dashed, so past = solid
// logged, future = light prediction — and it adjusts as she logs real sessions.
const WK_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const avgBurn = (days: DayBurn[]): number => {
  const vals = days.map((d) => d.kcal).filter((v) => v > 0);
  return vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : 0;
};
const burnForecast = (plannedWeekdays: string[], kcal: number, label: string): ChartPoint[] => {
  if (!plannedWeekdays.length || kcal <= 0) return [];
  const planned = new Set(plannedWeekdays);
  const base = new Date(); base.setHours(0, 0, 0, 0);
  const out: ChartPoint[] = [];
  for (let n = 1; n <= 14 && out.length < 6; n++) {
    const d = new Date(base.getTime() + n * DAY);
    if (!planned.has(WK_LABELS[d.getDay()])) continue;
    const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    out.push({ key: iso, label: shortDay(iso), value: kcal, readout: `~${kcal} kcal · ${label} (planned)`, predicted: true });
  }
  return out;
};
const burnPoints = (days: DayBurn[]): ChartPoint[] =>
  days.map((d) => ({
    key: d.date,
    label: shortDay(d.date),
    value: d.kcal,
    readout: `${d.kcal} kcal · ${d.sessions} session${d.sessions === 1 ? "" : "s"}${
      d.items[0]?.name
        ? ` · ${d.items
            .map((i) => i.name)
            .slice(0, 2)
            .join(", ")}`
        : ""
    }`,
  }));
const symptomPoints = (daily: SymptomDay[]): ChartPoint[] =>
  daily.map((d) => ({
    key: d.date,
    label: shortDay(d.date),
    value: d.labels.length,
    readout: d.labels.join(", "),
  }));
const SLEEP_WORDS = ["", "Rough", "Poor", "OK", "Good", "Great"];
const sleepPoints = (series: HealthHistory["sleep"]["series"]): ChartPoint[] =>
  series.map((d) => ({
    key: d.date,
    label: shortDay(d.date),
    value: d.quality,
    readout: `${SLEEP_WORDS[d.quality] ?? d.quality} · ${d.quality}/5${d.hours != null ? ` · ${d.hours}h` : ""}`,
  }));
const monthOf = (iso: string) => MONTHS[new Date(iso + "T00:00:00").getMonth()];
const cyclePoints = (cycles: Cycle[]): ChartPoint[] =>
  cycles.map((c) => ({
    key: c.startISO,
    label: c.ongoing ? "now" : monthOf(c.startISO),
    value: c.lengthDays,
    faded: c.ongoing,
    readout: `${prettyDate(c.startISO)} → ${prettyDate(c.endISO)} · ${c.lengthDays} days${c.ongoing ? " (ongoing)" : ""}`,
  }));

/* ---------- combined "cycle × your body" chart ---------- */

// Muted, harmonious phase tints — pale enough to sit quietly behind the line,
// distinguishable by hue within one soft warm→cool family.
const PHASE_FILL: Record<PhaseKey, string> = {
  menstrual: "#e79aad", // dusty rose
  follicular: "#f0cbb6", // soft peach
  ovulatory: "#e6dca6", // soft sand-gold
  luteal: "#d6c5e6", // soft lilac
};

interface Metric {
  key: string;
  label: string;
  unit: string;
  color: string;
  points: { date: string; value: number }[];
}

// Vibrant, well-separated line colours — a "Candy Pop" set anchored on the
// app's strong brand pink, so the combined chart reads bright and on-brand
// (each hue stays distinct over the pastel phase bands).
const METRIC_COLOR: Record<string, string> = {
  mood: "#EC4899", // strong brand pink
  burn: "#12B5A6", // candy mint-teal
  weight: "#A855F7", // candy purple
  symptoms: "#F5A614", // warm candy amber
  sleep: "#1FA2E0", // candy sky-blue
};

const toTime = (iso: string) => new Date(iso + "T00:00:00").getTime();
const DAY = 86_400_000;

function CycleOverlayChart({
  range,
  segments,
  metrics,
}: {
  range: { startISO: string; endISO: string };
  segments: PhaseSegment[];
  metrics: Metric[];
}) {
  const gid = "o" + useId().replace(/[^a-zA-Z0-9]/g, "");
  const [visible, setVisible] = useState<Set<string>>(() => new Set(metrics.map((m) => m.key)));
  const [sel, setSel] = useState<{ key: string; date: string } | null>(null);
  const toggle = (k: string) =>
    setVisible((prev) => {
      const next = new Set(prev);
      if (next.has(k)) next.delete(k);
      else next.add(k);
      return next;
    });

  // Geometry — the plot is drawn WIDE (px per day) and scrolls horizontally, so
  // every cycle has room to show its four phases clearly.
  const H = 176,
    mLeft = 30,
    mR = 12,
    mT = 12,
    mB = 26;
  const t0 = toTime(range.startISO);
  const t1 = Math.max(t0 + DAY, toTime(range.endISO));
  const days = Math.round((t1 - t0) / DAY) + 1;
  const plotW = Math.max(300, Math.round(days * 8.5));
  const W = mLeft + plotW + mR;
  const x0 = mLeft,
    x1 = W - mR,
    y0 = mT,
    y1 = H - mB;
  const dayW = ((x1 - x0) / (t1 - t0)) * DAY;
  const xAt = (iso: string) => x0 + ((toTime(iso) - t0) / (t1 - t0)) * (x1 - x0);

  const norm = new Map<string, { lo: number; hi: number }>();
  for (const m of metrics) {
    const vs = m.points.map((p) => p.value);
    const lo = vs.length ? Math.min(...vs) : 0;
    let hi = vs.length ? Math.max(...vs) : 1;
    if (hi === lo) hi = lo + 1;
    norm.set(m.key, { lo, hi });
  }
  const yAt = (mk: string, v: number) => {
    const n = norm.get(mk) ?? { lo: 0, hi: 1 };
    return y0 + (1 - (v - n.lo) / (n.hi - n.lo)) * (y1 - y0);
  };

  const phaseAt = (iso: string): PhaseKey | null => {
    const t = toTime(iso);
    return segments.find((s) => t >= toTime(s.startISO) && t <= toTime(s.endISO))?.phase ?? null;
  };

  // Each new cycle begins at a menstrual-phase start — mark them with dividers.
  const cycleStarts = segments.filter((s) => s.phase === "menstrual").map((s) => s.startISO);

  // month labels along the axis
  const months: { x: number; label: string }[] = [];
  const cur = new Date(t0);
  cur.setDate(1);
  while (cur.getTime() <= t1) {
    const mid = new Date(cur.getFullYear(), cur.getMonth(), 15).getTime();
    months.push({
      x: xAt(localFromT(Math.max(t0, Math.min(t1, mid)))),
      label: MONTHS[cur.getMonth()],
    });
    cur.setMonth(cur.getMonth() + 1);
  }

  const selMetric = sel ? metrics.find((m) => m.key === sel.key) : null;
  const selPt = selMetric?.points.find((p) => p.date === sel!.date) ?? null;
  const selPhase = selPt ? phaseAt(selPt.date) : null;

  return (
    <div>
      {/* metric legend — tap to show/hide each line */}
      <div className="mb-2 flex flex-wrap gap-1.5">
        {metrics.map((m) => {
          const on = visible.has(m.key);
          const c = METRIC_COLOR[m.key] ?? LINE_C;
          return (
            <button
              key={m.key}
              onClick={() => toggle(m.key)}
              className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-bold transition active:scale-95 ${on ? "border-transparent text-white shadow-sm" : "border-petal/60 bg-white/60 text-rose/70 hover:bg-blush/60"}`}
              style={on ? { background: c } : undefined}
            >
              <span className="h-2 w-2 rounded-full" style={{ background: on ? "#fff" : c }} />
              {m.label}
            </button>
          );
        })}
      </div>

      {/* horizontally scrollable plot */}
      <div className="overflow-x-auto pb-1">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          width={W}
          height={H}
          style={{ maxWidth: "none" }}
          role="img"
          aria-label="Metrics over time, coloured by cycle phase"
        >
          <defs>
            {metrics.map((m) => {
              const c = METRIC_COLOR[m.key] ?? LINE_C;
              return (
                <linearGradient key={m.key} id={`${gid}${m.key}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={c} stopOpacity="0.22" />
                  <stop offset="100%" stopColor={c} stopOpacity="0" />
                </linearGradient>
              );
            })}
          </defs>

          {/* phase bands + a thin divider at each phase boundary */}
          {segments.map((s, i) => {
            const bx = xAt(s.startISO);
            return (
              <g key={i}>
                <rect
                  x={bx}
                  y={y0}
                  width={Math.max(0.5, xAt(s.endISO) - bx + dayW)}
                  height={y1 - y0}
                  fill={PHASE_FILL[s.phase]}
                  opacity={0.34}
                />
                <line
                  x1={bx}
                  x2={bx}
                  y1={y0}
                  y2={y1}
                  stroke="oklch(1 0 0 / 0.6)"
                  strokeWidth={0.75}
                />
              </g>
            );
          })}

          {/* dotted CYCLE dividers (each new period start = a new cycle) + label */}
          {cycleStarts.map((cs, i) => {
            const cx = xAt(cs);
            return (
              <g key={cs}>
                <line
                  x1={cx}
                  x2={cx}
                  y1={y0 - 1}
                  y2={y1}
                  stroke="#8b5aa0"
                  strokeOpacity={0.5}
                  strokeWidth={1}
                  strokeDasharray="2 2.5"
                />
                <text
                  x={cx + 3}
                  y={y0 + 6}
                  style={{ fontSize: 7.5, fill: "#8b5aa0", fontWeight: 800 }}
                >
                  Cycle {i + 1}
                </text>
              </g>
            );
          })}

          {/* y High/Low + baseline */}
          <text x="2" y={y0 + 4} style={{ fontSize: 8, fill: LABEL, fontWeight: 700 }}>
            High
          </text>
          <text x="2" y={y1} style={{ fontSize: 8, fill: LABEL, fontWeight: 700 }}>
            Low
          </text>
          <line x1={x0} x2={x1} y1={y1} y2={y1} stroke={AXIS} strokeWidth={1} />

          {/* one soft area + line + dots per visible metric */}
          {metrics
            .filter((m) => visible.has(m.key) && m.points.length)
            .map((m) => {
              const c = METRIC_COLOR[m.key] ?? LINE_C;
              const pts = m.points;
              const line = pts
                .map(
                  (p, i) =>
                    `${i === 0 ? "M" : "L"} ${xAt(p.date).toFixed(1)} ${yAt(m.key, p.value).toFixed(1)}`,
                )
                .join(" ");
              const area =
                pts.length >= 2
                  ? `${line} L ${xAt(pts[pts.length - 1].date).toFixed(1)} ${y1} L ${xAt(pts[0].date).toFixed(1)} ${y1} Z`
                  : "";
              const fillOpacity = visible.size === 1 ? 1 : 0.5;
              return (
                <g key={m.key}>
                  {area && <path d={area} fill={`url(#${gid}${m.key})`} opacity={fillOpacity} />}
                  {pts.length >= 2 && (
                    <path
                      d={line}
                      fill="none"
                      stroke={c}
                      strokeWidth={2}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  )}
                  {pts.map((p) => {
                    const active = sel?.key === m.key && sel?.date === p.date;
                    return (
                      <g
                        key={p.date}
                        onClick={() => setSel(active ? null : { key: m.key, date: p.date })}
                        style={{ cursor: "pointer" }}
                      >
                        <circle
                          cx={xAt(p.date)}
                          cy={yAt(m.key, p.value)}
                          r={7}
                          fill="transparent"
                        />
                        <circle
                          cx={xAt(p.date)}
                          cy={yAt(m.key, p.value)}
                          r={active ? 4 : 1.8}
                          fill={active ? SEL_C : c}
                          stroke="#fff"
                          strokeWidth={active ? 1.6 : 0.6}
                        />
                      </g>
                    );
                  })}
                </g>
              );
            })}

          {months.map((mo, i) => (
            <text
              key={i}
              x={mo.x}
              y={y1 + 12}
              textAnchor="middle"
              style={{ fontSize: 8.5, fill: LABEL, fontWeight: 700 }}
            >
              {mo.label}
            </text>
          ))}
        </svg>
      </div>

      {days > 45 && (
        <p className="mt-1 text-center text-[10px] text-rose/45">
          ← scroll to move through the months →
        </p>
      )}

      {/* phase legend */}
      <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
        {(Object.keys(PHASE_FILL) as PhaseKey[]).map((p) => (
          <span
            key={p}
            className="inline-flex items-center gap-1 text-[10px] font-semibold text-rose/60"
          >
            <span
              className="h-2.5 w-2.5 rounded-[3px]"
              style={{ background: PHASE_FILL[p], opacity: 0.6 }}
            />
            {PHASE_LABEL[p]}
          </span>
        ))}
      </div>

      <div className="mt-2 min-h-[2.1rem] rounded-xl border border-petal/50 bg-blush/40 px-3 py-2 text-[12px] leading-snug">
        {selPt && selMetric ? (
          <span className="text-[#831843]">
            <b className="text-hotpink">{prettyDate(selPt.date)}</b>
            {selPhase ? <> · {PHASE_LABEL[selPhase]} phase</> : null} · {selMetric.label}{" "}
            {fmtNum(selPt.value)}
            {selMetric.unit && selMetric.unit !== "count" ? ` ${selMetric.unit}` : ""}
          </span>
        ) : (
          <span className="text-rose/50">
            Tap a point on any line to see its value &amp; which phase you were in. Use the chips to
            show or hide each line.
          </span>
        )}
      </div>
    </div>
  );
}

function localFromT(t: number): string {
  const d = new Date(t);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Four phase cards — the aggregate "how you do in each phase". */
function ByPhaseCards({ byPhase }: { byPhase: PhaseStat[] }) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
      {byPhase.map((p) => (
        <div
          key={p.phase}
          className="rounded-2xl border border-petal/50 bg-white/70 p-3"
          style={{ borderTop: `3px solid ${PHASE_FILL[p.phase]}` }}
        >
          <p className="text-[12px] font-black text-magenta leading-none">{p.label}</p>
          <ul className="mt-2 space-y-1 text-[11px] text-rose/70">
            <li className="flex justify-between gap-1">
              <span>Mood</span>
              <b className="text-[#831843]">{p.moodAvg != null ? `${p.moodAvg}/5` : "—"}</b>
            </li>
            <li className="flex justify-between gap-1">
              <span>Burn</span>
              <b className="text-[#831843]">
                {p.burnKcal ? `${p.burnKcal.toLocaleString()}` : "—"}
              </b>
            </li>
            <li className="flex justify-between gap-1">
              <span>Sleep</span>
              <b className="text-[#831843]">{p.sleepAvg != null ? `${p.sleepAvg}/5` : "—"}</b>
            </li>
            <li className="flex justify-between gap-1">
              <span>Sessions</span>
              <b className="text-[#831843]">{p.sessions || "—"}</b>
            </li>
            <li className="flex justify-between gap-1">
              <span>Symptom days</span>
              <b className="text-[#831843]">{p.symptomDays || "—"}</b>
            </li>
          </ul>
        </div>
      ))}
    </div>
  );
}

function buildMetrics(h: HealthHistory): Metric[] {
  const burnByDay = new Map<string, number>();
  for (const d of [...h.movement.workoutDaily, ...h.movement.yogaDaily]) {
    burnByDay.set(d.date, (burnByDay.get(d.date) ?? 0) + d.kcal);
  }
  const burn = [...burnByDay.entries()]
    .map(([date, value]) => ({ date, value }))
    .sort((a, b) => (a.date < b.date ? -1 : 1));
  return [
    {
      key: "mood",
      label: "Mood",
      unit: "/5",
      color: "#db2777",
      points: h.mood.series.map((m) => ({ date: m.date, value: m.score })),
    },
    { key: "burn", label: "Burn", unit: "kcal", color: "#0891b2", points: burn },
    {
      key: "weight",
      label: "Weight",
      unit: "kg",
      color: "#4338ca",
      points: h.weight.series.map((w) => ({ date: w.date, value: w.kg })),
    },
    {
      key: "symptoms",
      label: "Symptoms",
      unit: "count",
      color: "#9333ea",
      points: h.symptoms.daily.map((s) => ({ date: s.date, value: s.labels.length })),
    },
    {
      key: "sleep",
      label: "Sleep",
      unit: "/5",
      color: METRIC_COLOR.sleep,
      points: h.sleep.series.map((d) => ({ date: d.date, value: d.quality })),
    },
  ].filter((m) => m.points.length > 0);
}

/* ---------- planned vs logged calories (dual line) ---------- */

// Two soft, distinguishable lines on one kcal axis: what her plan proposed vs
// what she actually ticked eaten. Planned reads as a calm reference (dashed,
// faint fill); logged is the solid, tappable line on top — so the gap between
// "plan" and "plate" is legible at a glance.
const PLAN_C = "#e0a3c0"; // soft rose — the plan (reference)
const LOG_C = "#c85d95"; // berry — what she logged (matches the app's line colour)

function PlannedVsLoggedChart({
  series,
  tapHint,
  interpretation,
}: {
  series: HealthHistory["nutrition"]["series"];
  tapHint: string;
  interpretation: string;
}) {
  const shown = series.slice(-MAX_POINTS);
  const [sel, setSel] = useState<string | null>(null);
  const gid = "n" + useId().replace(/[^a-zA-Z0-9]/g, "");
  const { W, H, mL, mR, mT, mB } = AX;
  const x0 = mL,
    x1 = W - mR,
    y0 = mT,
    y1 = H - mB;

  if (shown.length < 2) {
    return (
      <div>
        <div className="grid h-28 place-items-center rounded-xl bg-blush/30 text-[12px] text-rose/50">
          Plan your meals & tick a few off to see this
        </div>
        <ChartFooter sel={null} hint={tapHint} interpretation={interpretation} />
      </div>
    );
  }

  const max = niceMax(Math.max(1, ...shown.map((d) => Math.max(d.planned, d.logged))));
  const x = (i: number) => x0 + (i / (shown.length - 1)) * (x1 - x0);
  const y = (v: number) => y1 - (v / max) * (y1 - y0);
  const path = (key: "planned" | "logged") =>
    shown
      .map((d, i) => `${i === 0 ? "M" : "L"} ${x(i).toFixed(1)} ${y(d[key]).toFixed(1)}`)
      .join(" ");
  const loggedArea = `${path("logged")} L ${x(shown.length - 1).toFixed(1)} ${y1} L ${x(0).toFixed(1)} ${y1} Z`;
  const ticks = [0, max / 2, max];
  const selDay = shown.find((d) => d.date === sel) ?? null;

  return (
    <div>
      {/* legend */}
      <div className="mb-2 flex flex-wrap gap-x-3 gap-y-1">
        {[
          ["Planned", PLAN_C],
          ["Logged", LOG_C],
        ].map(([label, c]) => (
          <span
            key={label}
            className="inline-flex items-center gap-1 text-[11px] font-bold text-rose/70"
          >
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: c }} />
            {label}
          </span>
        ))}
      </div>

      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full h-auto"
        role="img"
        aria-label="Planned vs logged calories"
      >
        <defs>
          <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={LOG_C} stopOpacity="0.24" />
            <stop offset="100%" stopColor={LOG_C} stopOpacity="0" />
          </linearGradient>
        </defs>
        <text x={x1} y={y0 - 1} textAnchor="end" style={{ fontSize: 8, fill: LABEL, fontWeight: 700 }}>
          kcal
        </text>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={x0} x2={x1} y1={y(t)} y2={y(t)} stroke={GRID} strokeWidth={1} />
            <text x={x0 - 4} y={y(t) + 3} textAnchor="end" style={{ fontSize: 8, fill: LABEL }}>
              {Math.round(t)}
            </text>
          </g>
        ))}
        <line x1={x0} x2={x1} y1={y1} y2={y1} stroke={AXIS} strokeWidth={1} />

        {/* logged fill + line */}
        <path d={loggedArea} fill={`url(#${gid})`} stroke="none" />
        {/* planned reference — dashed, no dots */}
        <path
          d={path("planned")}
          fill="none"
          stroke={PLAN_C}
          strokeWidth={2}
          strokeDasharray="4 3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d={path("logged")}
          fill="none"
          stroke={LOG_C}
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {shown.map((d, i) => {
          const active = d.date === sel;
          return (
            <g
              key={d.date}
              onClick={() => setSel(active ? null : d.date)}
              style={{ cursor: "pointer" }}
            >
              <circle cx={x(i)} cy={y(d.logged)} r={10} fill="transparent" />
              <circle
                cx={x(i)}
                cy={y(d.logged)}
                r={active ? 4.5 : 2.6}
                fill={active ? SEL_C : LOG_C}
                stroke="#fff"
                strokeWidth={active ? 1.8 : 1}
              />
            </g>
          );
        })}
        {xLabelIdx(shown.length).map(
          (i) =>
            shown[i] && (
              <text
                key={i}
                x={x(i)}
                y={y1 + 12}
                textAnchor={i === 0 ? "start" : i === shown.length - 1 ? "end" : "middle"}
                style={{ fontSize: 8, fill: LABEL, fontWeight: 600 }}
              >
                {shortDay(shown[i].date)}
              </text>
            ),
        )}
      </svg>

      <div className="mt-2.5 min-h-[2.1rem] rounded-xl border border-petal/50 bg-blush/40 px-3 py-2 text-[12px] leading-snug">
        {selDay ? (
          <span className="text-[#831843]">
            <b className="text-hotpink">{shortDay(selDay.date)}</b> · ate{" "}
            {selDay.logged.toLocaleString()} of {selDay.planned.toLocaleString()} planned kcal
            {selDay.planned > 0 ? ` · ${Math.round((selDay.logged / selDay.planned) * 100)}%` : ""}
          </span>
        ) : (
          <span className="text-rose/50">{tapHint}</span>
        )}
      </div>
      <p className="mt-2 flex items-start gap-1.5 text-[11.5px] italic leading-snug text-rose/70">
        <Sparkles className="mt-0.5 h-3 w-3 shrink-0 text-hotpink" strokeWidth={2} />
        <span>{interpretation}</span>
      </p>
    </div>
  );
}

/* ---------- new-user empty state, with a faded example preview ---------- */

function makePreview() {
  const base = new Date();
  const iso = (n: number) => {
    const d = new Date(base);
    d.setDate(d.getDate() - n);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  };
  const lbl = (n: number) => shortDay(iso(n));
  const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
  const N = 56;

  // Combined phase overlay (range + bands + a few metric lines)
  const range = { startISO: iso(N), endISO: iso(0) };
  const pat: [PhaseKey, number][] = [
    ["menstrual", 5],
    ["follicular", 8],
    ["ovulatory", 3],
    ["luteal", 12],
  ];
  const segments: PhaseSegment[] = [];
  let day = N;
  while (day > 0) {
    for (const [phase, len] of pat) {
      segments.push({ startISO: iso(day), endISO: iso(Math.max(0, day - len + 1)), phase });
      day -= len;
      if (day <= 0) break;
    }
  }
  const moodLine: { date: string; value: number }[] = [];
  const burnLine: { date: string; value: number }[] = [];
  const sleepLine: { date: string; value: number }[] = [];
  for (let n = N; n >= 0; n -= 2)
    moodLine.push({ date: iso(n), value: 3 + 1.4 * Math.sin(((N - n) / N) * 6.5) });
  for (let n = N; n >= 0; n -= 3)
    burnLine.push({ date: iso(n), value: 130 + 70 * Math.abs(Math.sin((N - n) / 6)) });
  for (let n = N; n >= 0; n -= 2)
    sleepLine.push({ date: iso(n), value: 3.2 + 1.3 * Math.sin(((N - n) / N) * 6.5 + 1) });
  const metrics: Metric[] = [
    { key: "mood", label: "Mood", unit: "/5", color: METRIC_COLOR.mood, points: moodLine },
    { key: "burn", label: "Burn", unit: "kcal", color: METRIC_COLOR.burn, points: burnLine },
    { key: "sleep", label: "Sleep", unit: "/5", color: METRIC_COLOR.sleep, points: sleepLine },
  ];

  // Per-chart example points
  const cycles: ChartPoint[] = [
    { key: "c1", label: "Apr", value: 28, readout: "28 days" },
    { key: "c2", label: "May", value: 29, readout: "29 days" },
    { key: "c3", label: "Jun", value: 27, readout: "27 days" },
    { key: "c4", label: "now", value: 12, faded: true, readout: "12 days (ongoing)" },
  ];
  const weight: ChartPoint[] = [];
  const workout: ChartPoint[] = [];
  const yoga: ChartPoint[] = [];
  const mood: ChartPoint[] = [];
  const symptoms: ChartPoint[] = [];
  const sleep: ChartPoint[] = [];
  const nutrition: { date: string; planned: number; logged: number }[] = [];
  for (let n = N; n >= 0; n -= 4) {
    const kg = +(66 - ((N - n) / N) * 4).toFixed(1);
    weight.push({ key: `w${n}`, label: lbl(n), value: kg, readout: `${kg} kg` });
  }
  for (let n = N; n >= 0; n -= 3) {
    const k = Math.round(200 + 90 * Math.abs(Math.sin((N - n) / 5)));
    workout.push({ key: `wo${n}`, label: lbl(n), value: k, readout: `${k} kcal · 1 session` });
    const p = 1720;
    const g = Math.round(p * (0.72 + 0.28 * Math.abs(Math.sin((N - n) / 4))));
    nutrition.push({ date: iso(n), planned: p, logged: g });
    const sx = Math.sin((N - n) / 5) > 0.55 ? 2 : Math.sin((N - n) / 5) > 0.1 ? 1 : 0;
    symptoms.push({ key: `s${n}`, label: lbl(n), value: sx, readout: sx ? "Cramps" : "—" });
  }
  for (let n = N; n >= 0; n -= 4) {
    const k = Math.round(70 + 30 * Math.abs(Math.sin((N - n) / 4)));
    yoga.push({ key: `y${n}`, label: lbl(n), value: k, readout: `${k} kcal · 1 flow` });
  }
  for (let n = N; n >= 0; n -= 2) {
    const m = clamp(Math.round(3 + 1.5 * Math.sin(((N - n) / N) * 6.5)), 1, 5);
    mood.push({ key: `m${n}`, label: lbl(n), value: m, readout: `${m}/5` });
    const sl = clamp(Math.round(3.2 + 1.5 * Math.sin(((N - n) / N) * 6.5 + 1)), 1, 5);
    sleep.push({ key: `sl${n}`, label: lbl(n), value: sl, readout: `${sl}/5` });
  }

  return { range, segments, metrics, cycles, weight, workout, yoga, mood, symptoms, sleep, nutrition };
}

function EmptyPreview() {
  const p = useMemo(makePreview, []);
  const faded = "pointer-events-none select-none";
  return (
    <div className="space-y-4">
      <Panel>
        <p className="font-script text-2xl text-hotpink">Your history starts today ✿</p>
        <p className="mt-1 text-[13px] text-rose/75 leading-snug">
          Right now this is empty — but it fills itself in from the things you already do. Here's
          how it grows:
        </p>
        <ul className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2 text-[12.5px] text-[#831843]">
          {[
            ["Confirm your period days", "your cycle rhythm & regularity"],
            ["Finish workouts & yoga flows", "your calories burned, day by day"],
            ["Log mood, sleep & symptoms", "how you feel across your cycle"],
            ["Weigh in & tick your meals", "weight trend + planned-vs-eaten"],
          ].map(([a, b]) => (
            <li
              key={a}
              className="flex items-start gap-2 rounded-xl bg-blush/40 border border-petal/50 px-3 py-2"
            >
              <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-hotpink" strokeWidth={2} />
              <span>
                <b>{a}</b> → {b}
              </span>
            </li>
          ))}
        </ul>
        {/* Reassurance: the charts don't wait a month — they start from week one */}
        <p className="mt-3 flex items-start gap-1.5 rounded-xl bg-hotpink/10 border border-hotpink/25 px-3 py-2 text-[12px] leading-snug text-[#831843]">
          <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-hotpink" strokeWidth={2.2} />
          <span>
            <b>Most of these start drawing in your very first week</b> — log a little each day and
            you'll watch them fill in fast. Here's a preview of every chart your report will hold 👇
          </span>
        </p>
      </Panel>

      {/* Faded example of the FULL report — every chart, clearly a preview */}
      <div className="relative">
        <span className="absolute right-3 top-3 z-10 rounded-full bg-white/90 border border-petal/60 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-hotpink shadow-sm">
          Example preview
        </span>
        <div className={`space-y-4 opacity-[0.72] ${faded}`} aria-hidden>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Panel bg={CHART_BG.cycle}>
              <PanelHead Icon={HeartPulse} title="Cycle by cycle" hint="example" />
              <BarsChart points={p.cycles} unit="days" color={BAR_C} valueLabels perBarLabels tapHint="" interpretation="Each cycle's length, side by side." />
            </Panel>
            <Panel bg={CHART_BG.weight}>
              <PanelHead Icon={Scale} title="Weight by day" hint="example" />
              <LineChart points={p.weight} unit="kg" color={LINE_C} tapHint="" interpretation="Your weight trend over time." />
            </Panel>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Panel bg={CHART_BG.workout}>
              <PanelHead Icon={Dumbbell} title="Workout burn" hint="example" />
              <BarsChart points={p.workout} unit="kcal" color={BAR_C} tapHint="" interpretation="Calories burned per workout." />
            </Panel>
            <Panel bg={CHART_BG.yoga}>
              <PanelHead Icon={Sparkles} title="Yoga burn" hint="example" />
              <BarsChart points={p.yoga} unit="kcal" color={BAR_C} tapHint="" interpretation="Calories burned per flow." />
            </Panel>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Panel bg={CHART_BG.mood}>
              <PanelHead Icon={Smile} title="Mood over time" hint="example" />
              <LineChart points={p.mood} unit="score" color={LINE_C} yMin={1} yMax={5} tapHint="" interpretation="How your mood moves day to day." />
            </Panel>
            <Panel bg={CHART_BG.symptoms}>
              <PanelHead Icon={Activity} title="Symptoms by day" hint="example" />
              <BarsChart points={p.symptoms} unit="count" color={BAR_C} tapHint="" interpretation="Which symptoms show, and when." />
            </Panel>
          </div>
          <Panel bg={CHART_BG.nourish}>
            <PanelHead Icon={FileText} title="Nourishment" hint="example" />
            <div className="grid grid-cols-3 gap-2">
              {[
                ["24", "Days logged"],
                ["61", "Meals"],
                ["18", "Full days"],
              ].map(([v, l]) => (
                <div key={l} className="rounded-xl bg-blush/40 p-2.5 text-center">
                  <p className="text-lg font-black text-magenta leading-none">{v}</p>
                  <p className="mt-0.5 text-[10px] font-bold uppercase tracking-wide text-rose/55">{l}</p>
                </div>
              ))}
            </div>
          </Panel>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Panel bg={CHART_BG.nourish}>
              <PanelHead Icon={UtensilsCrossed} title="Planned vs eaten" hint="example" />
              <PlannedVsLoggedChart series={p.nutrition} tapHint="" interpretation="What you planned vs what you ate." />
            </Panel>
            <Panel bg={CHART_BG.sleep}>
              <PanelHead Icon={Moon} title="Sleep over time" hint="example" />
              <LineChart points={p.sleep} unit="score" color={LINE_C} yMin={1} yMax={5} tapHint="" interpretation="How rested you feel each night." />
            </Panel>
          </div>
          <Panel className="border-hotpink/25 bg-gradient-to-br from-blush/40 via-white/70 to-petal/25">
            <PanelHead Icon={Sparkles} title="Your cycle × your body" hint="example" />
            <CycleOverlayChart range={p.range} segments={p.segments} metrics={p.metrics} />
          </Panel>
        </div>
        <p className="mt-3 text-center text-[12px] font-semibold text-hotpink">
          Start logging on{" "}
          <a href="/app/today" className="underline">
            Today
          </a>{" "}
          and watch these become yours ✿
        </p>
      </div>
    </div>
  );
}

/* ---------- main ---------- */

export function HealthHistoryPanel({ userName }: { userName: string }) {
  const h = useMemo(() => computeHealthHistory(8), []);
  const metrics = useMemo(() => buildMetrics(h), [h]);
  const reg = REG_META[h.cycle.regularity];

  // ── Forecast layers (dashed reference lines the real logs correct) ──
  const proj = useMemo(() => goalProjection(), []);
  const cyclePred = useMemo(() => predictedCycleBars(3), []);
  const cyclePredLen = useMemo(() => predictedCycleLength(), []);
  const weightPred = useMemo(() => {
    const s = h.weight.series;
    return predictedWeightSeries(s.length ? s[s.length - 1] : null);
  }, [h]);
  const moodPred = useMemo<DatedValue[]>(
    () => (h.range ? predictedMoodSeries(h.range.startISO, futureISO(7), 1) : []),
    [h],
  );

  // Cycle bars = her real cycles + a few faded predicted ones, so it's never empty.
  const cycleAllPoints: ChartPoint[] = [
    ...cyclePoints(h.cycle.cycles),
    ...cyclePred.map((c) => ({
      key: c.key,
      label: c.label,
      value: c.value,
      predicted: true,
      readout: `~${c.value} days predicted`,
    })),
  ];

  // Weight: solid weigh-ins + a dashed path toward her goal.
  const weightActual: ForecastActual[] = h.weight.series.map((w) => ({
    key: w.date,
    date: w.date,
    value: w.kg,
    readout: `${w.kg} kg`,
  }));

  // Mood: solid logged moods + a dashed phase-shaped forecast.
  const moodActual: ForecastActual[] = h.mood.series.map((m) => ({
    key: m.date,
    date: m.date,
    value: m.score,
    readout: `${titleCase(m.mood)} · ${m.score}/5`,
  }));

  // Planned-vs-eaten: dashed plan across the month + solid eaten line.
  const nutriPlanned: DatedValue[] = h.nutrition.plannedSeries.map((d) => ({
    date: d.date,
    value: d.planned,
  }));
  const nutriActual: ForecastActual[] = h.nutrition.series.map((d) => ({
    key: d.date,
    date: d.date,
    value: d.logged,
    readout: `ate ${d.logged.toLocaleString()} of ${d.planned.toLocaleString()} planned kcal${
      d.planned > 0 ? ` · ${Math.round((d.logged / d.planned) * 100)}%` : ""
    }`,
  }));

  const hasAnything =
    h.trackingSince !== null ||
    h.movement.totalSessions > 0 ||
    h.cycle.count > 0 ||
    h.mood.days > 0 ||
    h.symptoms.days > 0;

  const ChangeIcon =
    h.weight.changeKg == null || h.weight.changeKg === 0
      ? Minus
      : h.weight.changeKg < 0
        ? TrendingDown
        : TrendingUp;

  return (
    <section className="animate-card-pop-in" style={{ animationDelay: "40ms" }}>
      {/* Report header — on its OWN white section so the title, intro and the four
          summary cards stay perfectly readable over the hero photo behind them.
          The export actions are compact and sit beside the title. */}
      <div className="rounded-[1.4rem] border border-white/55 bg-white/55 backdrop-blur-xl p-4 sm:p-5 shadow-[0_8px_30px_-10px_rgba(219,39,119,0.30)]">
        {/* Title + compact export actions on ONE line */}
        <div className="flex items-center justify-between gap-2">
          <h2 className="min-w-0 font-script text-3xl sm:text-4xl text-hotpink leading-none">
            Your history
          </h2>
          <div className="flex shrink-0 items-center gap-1.5">
            <button
              onClick={() => downloadHealthReport(h, userName)}
              className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-hotpink to-magenta px-2.5 py-1.5 text-[11px] font-bold text-white shadow-md shadow-hotpink/25 transition hover:brightness-105 active:scale-95 animate-selected-glow"
            >
              <Download className="h-3.5 w-3.5" strokeWidth={2.2} /> Report
            </button>
            <button
              onClick={() => downloadHealthCSV(h)}
              className="inline-flex items-center gap-1 rounded-full border border-hotpink/40 bg-white px-2.5 py-1.5 text-[11px] font-bold text-hotpink transition hover:bg-blush/50 active:scale-95"
            >
              <FileText className="h-3.5 w-3.5" strokeWidth={2} /> CSV
            </button>
          </div>
        </div>
        <p className="mt-1.5 text-[12.5px] text-rose/70 leading-snug">
          Everything you've really logged, from day one — tap any chart for the details, then
          download it all as a report for your doctor.
        </p>
        <p className="mt-1 inline-flex items-center gap-1.5 text-[11px] font-semibold text-rose/55">
          <CalendarDays className="h-3.5 w-3.5 text-hotpink" strokeWidth={2} />
          {h.trackingSince
            ? `Tracking since ${prettyDate(h.trackingSince)} · ${h.daysTracked} day${h.daysTracked === 1 ? "" : "s"}`
            : "No data logged yet"}
        </p>

        {/* Summary tiles — inside the same white section as the header text */}
        {hasAnything && (
          <div className="mt-4 grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
            <StatTile Icon={CalendarDays} value={String(h.daysTracked)} label="Days tracked" delay={0} />
            <StatTile Icon={Activity} value={String(h.movement.totalSessions)} label="Sessions done" delay={60} />
            <StatTile Icon={Flame} value={h.movement.totalKcal.toLocaleString()} label="Calories burned" delay={120} />
            <StatTile Icon={HeartPulse} value={String(h.cycle.cyclesMeasured)} label="Cycles measured" delay={180} />
          </div>
        )}
      </div>

      {!hasAnything ? (
        <div className="mt-4">
          <EmptyPreview />
        </div>
      ) : (
        <div className="mt-4 space-y-4">

          {/* Cycle by cycle + Weight — paired side by side on desktop */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Panel bg={CHART_BG.cycle}>
              <PanelHead
                Icon={HeartPulse}
                title="Cycle by cycle"
                hint={h.cycle.count ? `${h.cycle.count} confirmed starts` : undefined}
              />
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <span
                  className={`inline-block rounded-full px-3 py-1 text-[12px] font-black uppercase tracking-wide ${reg.cls}`}
                >
                  {h.cycle.regularity}
                </span>
                {h.cycle.avgLength != null && (
                  <span className="text-[12.5px] font-bold text-rose/70">
                    avg {h.cycle.avgLength} days
                  </span>
                )}
              </div>
              <BarsChart
                points={cycleAllPoints}
                unit="days"
                color={BAR_C}
                valueLabels
                perBarLabels
                tapHint="Tap a cycle to see its dates & length. Dashed bars are predicted."
                interpretation={h.patterns.cycle}
              />
              <PredictionNote>
                The dashed bars are your next cycles, predicted from your average length
                (~{cyclePredLen} days) and your most recent confirmed start. Each time you confirm a
                new period start, that average — and this forecast — re-tunes to you, so it grows
                more accurate the more you log.
              </PredictionNote>
            </Panel>

            <Panel bg={CHART_BG.weight}>
              <PanelHead Icon={Scale} title="Weight by day" hint={titleCase(h.weight.goal)} />
              {h.weight.currentKg != null && (
                <div className="mb-2 flex items-baseline gap-2">
                  <span className="text-2xl font-black text-magenta">
                    {h.weight.currentKg}
                    <span className="text-sm font-bold text-rose/60"> kg</span>
                  </span>
                  {h.weight.changeKg != null && (
                    <span
                      className={`inline-flex items-center gap-0.5 text-[12px] font-bold ${h.weight.changeKg < 0 ? "text-emerald-600" : h.weight.changeKg > 0 ? "text-hotpink" : "text-rose/50"}`}
                    >
                      <ChangeIcon className="h-3.5 w-3.5" strokeWidth={2.4} />
                      {h.weight.changeKg > 0 ? "+" : ""}
                      {h.weight.changeKg} kg
                    </span>
                  )}
                </div>
              )}
              <ForecastLineChart
                actual={weightActual}
                predicted={weightPred ?? []}
                unit="kg"
                actualLabel="Weighed in"
                predictedLabel="On-plan path"
                predictedColor={PRED_C}
                tapHint="Tap a point to see that day's weight. Dashed = your on-plan path."
                ghostShape={[0.82, 0.76, 0.72, 0.64, 0.6, 0.52, 0.45]}
                interpretation={h.patterns.weight}
                note={
                  proj && weightPred ? (
                    <>
                      The dashed line is where your weight should track if you stick to your plan —
                      about {Math.abs(proj.weeklyRateKg)} kg/week toward your {proj.target} kg goal,
                      worked out from your calorie plan
                      {proj.etaWeeks ? ` (~${proj.etaWeeks} weeks to go)` : ""}. It re-draws from your
                      latest weigh-in, so every time you log, the path corrects to reality.
                    </>
                  ) : (
                    <>
                      Set a goal weight and pace in your Diet plan and a dashed target path will
                      appear here — showing where you'd track week by week if you stay on plan.
                    </>
                  )
                }
              />
            </Panel>
          </div>

          {/* Burn — workout + yoga, side by side on desktop */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Panel bg={CHART_BG.workout}>
              <PanelHead Icon={Dumbbell} title="Workout burn" hint="per day" />
              <BarsChart
                points={[...burnPoints(h.movement.workoutDaily), ...burnForecast(readWorkoutPlanDays(), avgBurn(h.movement.workoutDaily) || 210, "workout")]}
                unit="kcal"
                color={BAR_C}
                tapHint="Tap a day to see calories burned & sessions."
                ghostShape={[0.75, 0.15, 0.85, 0.25, 0.9, 0.2, 0.6]}
                interpretation={h.patterns.workout}
              />
            </Panel>
            <Panel bg={CHART_BG.yoga}>
              <PanelHead Icon={Sparkles} title="Yoga burn" hint="per day" />
              <BarsChart
                points={[...burnPoints(h.movement.yogaDaily), ...burnForecast(readYogaPlanDays(), avgBurn(h.movement.yogaDaily) || 130, "yoga flow")]}
                unit="kcal"
                color={BAR_C}
                tapHint="Tap a day to see calories burned & flows."
                ghostShape={[0.5, 0.68, 0.4, 0.72, 0.55, 0.68, 0.48]}
                interpretation={h.patterns.yoga}
              />
            </Panel>
          </div>

          {/* Mood + Symptoms — how you feel, paired side by side on desktop */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Panel bg={CHART_BG.mood}>
              <PanelHead
                Icon={Smile}
                title="Mood over time"
                hint={h.mood.avgScore != null ? `avg ${h.mood.avgScore}/5` : undefined}
              />
              <ForecastLineChart
                actual={moodActual}
                predicted={moodPred}
                unit="score"
                actualLabel="Logged"
                predictedLabel="By phase"
                predictedColor={PRED_C}
                yMin={1}
                yMax={5}
                tapHint="Tap a point to see that day's mood. Dashed = expected by phase."
                ghostShape={[0.5, 0.68, 0.55, 0.72, 0.62, 0.85, 0.8]}
                interpretation={h.patterns.mood}
                note={
                  <>
                    The dashed line is how each day tends to feel across your cycle — brighter around
                    ovulation, softer in the days before your period. It starts from the typical
                    hormonal curve and, once you've logged a few moods in each phase, shifts toward{" "}
                    <b>your</b> real pattern.
                  </>
                }
              />
            </Panel>
            <Panel bg={CHART_BG.symptoms}>
              <PanelHead
                Icon={Activity}
                title="Symptoms by day"
                hint={h.symptoms.days ? `${h.symptoms.days} days` : undefined}
              />
              <BarsChart
                points={symptomPoints(h.symptoms.daily)}
                unit="count"
                color={BAR_C}
                tapHint="Tap a day to see which symptoms you logged."
                ghostShape={[0.35, 0.55, 0.2, 0.6, 0.3, 0.15, 0.45]}
                interpretation={h.patterns.symptoms}
              />
            </Panel>
          </div>

          {/* Nourishment */}
          <Panel bg={CHART_BG.nourish}>
            <PanelHead Icon={FileText} title="Nourishment" hint="meals logged" />
            <div className="grid grid-cols-3 gap-2">
              <div className="rounded-xl bg-blush/40 p-2.5 text-center">
                <p className="text-lg font-black text-magenta leading-none">
                  {h.nourish.daysLogged}
                </p>
                <p className="mt-0.5 text-[10px] font-bold uppercase tracking-wide text-rose/55">
                  Days logged
                </p>
              </div>
              <div className="rounded-xl bg-blush/40 p-2.5 text-center">
                <p className="text-lg font-black text-magenta leading-none">
                  {h.nourish.mealsLogged}
                </p>
                <p className="mt-0.5 text-[10px] font-bold uppercase tracking-wide text-rose/55">
                  Meals
                </p>
              </div>
              <div className="rounded-xl bg-blush/40 p-2.5 text-center">
                <p className="text-lg font-black text-magenta leading-none">
                  {h.nourish.daysFullLogged}
                </p>
                <p className="mt-0.5 text-[10px] font-bold uppercase tracking-wide text-rose/55">
                  Full days
                </p>
              </div>
            </div>
            <p className="mt-3 text-[11px] text-rose/55 leading-snug">
              We track how consistently you log meals — real, not reconstructed.
            </p>
          </Panel>

          {/* Planned-vs-eaten calories + Sleep — fuel & rest, paired right under
              Nourishment on desktop; on phone Sleep stacks UNDER the calories chart */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Panel bg={CHART_BG.nourish}>
              <PanelHead
                Icon={UtensilsCrossed}
                title="Planned vs eaten"
                hint={
                  h.nutrition.adherencePct != null
                    ? `${h.nutrition.adherencePct}% on plan`
                    : "calories"
                }
              />
              <ForecastLineChart
                actual={nutriActual}
                predicted={nutriPlanned}
                unit="kcal"
                actualLabel="Eaten"
                predictedLabel="Planned"
                predictedColor={PRED_C}
                actualDots
                yMin={0}
                tapHint="Tap a day to see what you ate vs what you planned."
                interpretation={h.patterns.nutrition}
                note={
                  <>
                    The dashed line is what your meal plan proposes for every day this month — your
                    weekly template, repeated. The solid line is only the days you actually ticked
                    meals eaten, so the gap between plan and plate is the real, honest story.
                  </>
                }
              />
            </Panel>
            <Panel bg={CHART_BG.sleep}>
              <PanelHead
                Icon={Moon}
                title="Sleep over time"
                hint={h.sleep.avgQuality != null ? `avg ${h.sleep.avgQuality}/5` : undefined}
              />
              <LineChart
                points={sleepPoints(h.sleep.series)}
                unit="score"
                color={LINE_C}
                yMin={1}
                yMax={5}
                tapHint="Tap a point to see that night's sleep."
                interpretation={h.patterns.sleep}
              />
            </Panel>
          </div>

          {/* THE BIG ONE — everything, coloured by cycle phase, over time (last) */}
          {h.range && h.phaseSegments.length > 0 && metrics.length > 0 && (
            <Panel className="border-hotpink/25 bg-gradient-to-br from-blush/40 via-white/70 to-petal/25">
              <PanelHead
                Icon={Sparkles}
                title="Your cycle × your body"
                hint="by phase & over time"
              />
              <p className="mb-2 text-[12px] leading-snug text-rose/70">
                The whole picture: every metric over time, with the background coloured by your
                cycle phase — so you can see how each phase shapes how you feel and move. Tap the
                chips to show or hide a line, and scroll sideways to travel through the months.
              </p>
              <CycleOverlayChart range={h.range} segments={h.phaseSegments} metrics={metrics} />
              <p className="mt-3 mb-2 text-[11px] font-bold uppercase tracking-wide text-rose/50">
                How you do in each phase
              </p>
              <ByPhaseCards byPhase={h.byPhase} />
              <p className="mt-2 flex items-start gap-1.5 text-[11.5px] italic leading-snug text-rose/70">
                <Sparkles className="mt-0.5 h-3 w-3 shrink-0 text-hotpink" strokeWidth={2} />
                <span>{h.patterns.combined}</span>
              </p>
              <PredictionNote>
                The coloured phase bands are worked out from your cycle — your confirmed period
                starts when you have them, or your cycle setup as a forecast until then. Your logged
                metrics are laid over the real timeline, so you can see how each phase tends to shape
                how you feel and move — and it sharpens every time you confirm a start.
              </PredictionNote>
            </Panel>
          )}

          {/* Honest-data footnote */}
          <p className="flex items-start gap-1.5 rounded-2xl bg-blush/40 border border-petal/50 px-3.5 py-2.5 text-[11.5px] leading-snug text-rose/70">
            <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-hotpink" strokeWidth={2} />
            <span>
              Every number here is something you confirmed or logged yourself — a personal wellness
              summary, not a medical record. Charts are interactive here; in the downloadable report
              each one comes with a table of all its points, so nothing is lost on paper.
            </span>
          </p>
        </div>
      )}
    </section>
  );
}
