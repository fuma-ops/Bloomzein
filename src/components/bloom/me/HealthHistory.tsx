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
  TrendingUp,
  TrendingDown,
  Minus,
} from "lucide-react";
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
      className="flex items-center justify-between gap-2 rounded-2xl border border-hotpink/20 bg-white/85 px-3.5 py-2.5 shadow-[0_2px_12px_-6px_rgba(219,39,119,0.28)] animate-card-pop-in"
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
function Panel({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-[1.4rem] border border-hotpink/20 bg-white/85 backdrop-blur p-4 sm:p-5 shadow-[0_4px_18px_-8px_rgba(219,39,119,0.25)] ${className}`}
    >
      {children}
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

/* ---------- shared axis geometry + calm, unified palette ---------- */

// Compact charts: a shorter plot so nothing dominates the page.
const AX = { W: 340, H: 132, mL: 28, mR: 8, mT: 12, mB: 22 };
const GRID = "oklch(0.5 0.12 350 / 0.12)";
const AXIS = "oklch(0.5 0.12 350 / 0.28)";
const LABEL = "oklch(0.5 0.1 350 / 0.55)";

// ONE soft rose for every bar chart and ONE muted berry for every line — so the
// page reads as a calm, single system instead of many strong colours competing.
const BAR_TOP = "#d24d86"; // richer pink at the very top edge (soft, not poppy)
const BAR_C = "#e685b0"; // soft rose body of the bar
const LINE_C = "#c85d95"; // muted berry (lines + dots)
const SEL_C = "#a23c72"; // deeper berry for the selected point/bar

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
}: {
  points: ChartPoint[];
  unit: string;
  color: string;
  tapHint: string;
  interpretation: string;
  valueLabels?: boolean;
  perBarLabels?: boolean;
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
  const bw = (x1 - x0) / n;
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
        <text x="2" y={mT + 2} style={{ fontSize: 8, fill: LABEL, fontWeight: 700 }}>
          {unit}
        </text>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={x0} x2={x1} y1={yv(t)} y2={yv(t)} stroke={GRID} strokeWidth={1} />
            <text x={x0 - 4} y={yv(t) + 3} textAnchor="end" style={{ fontSize: 8, fill: LABEL }}>
              {fmtNum(Math.round(t))}
            </text>
          </g>
        ))}
        <line x1={x0} x2={x1} y1={y1} y2={y1} stroke={AXIS} strokeWidth={1} />
        {shown.map((p, i) => {
          const active = p.key === sel;
          const bx = x0 + i * bw;
          return (
            <g
              key={p.key}
              onClick={() => setSel(active ? null : p.key)}
              style={{ cursor: "pointer" }}
            >
              <rect x={bx} y={y0} width={bw} height={y1 - y0} fill="transparent" />
              <rect
                x={bx + gap / 2}
                y={yv(p.value)}
                width={Math.max(0.6, bw - gap)}
                height={Math.max(p.value > 0 ? 1.5 : 0, y1 - yv(p.value))}
                rx={1.5}
                fill={`url(#${gid})`}
                opacity={p.faded ? 0.45 : 1}
                stroke={active ? SEL_C : "none"}
                strokeWidth={active ? 1.5 : 0}
              />
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
        <text x="2" y={y0 - 3} style={{ fontSize: 8, fill: LABEL, fontWeight: 700 }}>
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
const weightPoints = (series: { date: string; kg: number }[]): ChartPoint[] =>
  series.map((w) => ({ key: w.date, label: shortDay(w.date), value: w.kg, readout: `${w.kg} kg` }));
const moodPoints = (series: MoodPoint[]): ChartPoint[] =>
  series.map((p) => ({
    key: p.date,
    label: shortDay(p.date),
    value: p.score,
    readout: `${titleCase(p.mood)} · ${p.score}/5`,
  }));
const symptomPoints = (daily: SymptomDay[]): ChartPoint[] =>
  daily.map((d) => ({
    key: d.date,
    label: shortDay(d.date),
    value: d.labels.length,
    readout: d.labels.join(", "),
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

// Distinct-but-soft line colours, one per metric (multi-line overlay).
const METRIC_COLOR: Record<string, string> = {
  mood: "#d1568f", // rose
  burn: "#4fa89d", // soft teal
  weight: "#7b83cf", // periwinkle
  symptoms: "#b06fc0", // soft orchid
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
  ].filter((m) => m.points.length > 0);
}

/* ---------- new-user empty state, with a faded example preview ---------- */

function makePreview() {
  const base = new Date();
  const iso = (n: number) => {
    const d = new Date(base);
    d.setDate(d.getDate() - n);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  };
  const N = 56;
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
  const mood: { date: string; value: number }[] = [];
  const burn: { date: string; value: number }[] = [];
  for (let n = N; n >= 0; n -= 2)
    mood.push({ date: iso(n), value: 3 + 1.4 * Math.sin(((N - n) / N) * 6.5) });
  for (let n = N; n >= 0; n -= 3)
    burn.push({ date: iso(n), value: 130 + 70 * Math.abs(Math.sin((N - n) / 6)) });
  const metrics: Metric[] = [
    { key: "mood", label: "Mood", unit: "/5", color: LINE_C, points: mood },
    { key: "burn", label: "Burn", unit: "kcal", color: LINE_C, points: burn },
  ];
  return { range, segments, metrics };
}

function EmptyPreview() {
  const p = useMemo(makePreview, []);
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
            ["Log mood & symptoms", "how you feel across your cycle"],
            ["Weigh in now and then", "your weight trend over time"],
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
        <p className="mt-3 text-[12px] text-rose/70 leading-snug">
          In a month or two it looks like this 👇 — your real story, in your colours.
        </p>
      </Panel>

      {/* Faded example — non-interactive, clearly labelled as a preview */}
      <div className="relative">
        <span className="absolute right-3 top-3 z-10 rounded-full bg-white/90 border border-petal/60 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-hotpink shadow-sm">
          Example preview
        </span>
        <Panel className="border-hotpink/20 bg-gradient-to-br from-blush/40 via-white/70 to-petal/25">
          <PanelHead Icon={Sparkles} title="Your cycle × your body" hint="example" />
          <div className="pointer-events-none opacity-60 select-none" aria-hidden>
            <CycleOverlayChart range={p.range} segments={p.segments} metrics={p.metrics} />
          </div>
          <p className="mt-2 text-center text-[12px] font-semibold text-hotpink">
            Start logging on{" "}
            <a href="/app/today" className="pointer-events-auto underline">
              Today
            </a>{" "}
            and watch this become yours ✿
          </p>
        </Panel>
      </div>
    </div>
  );
}

/* ---------- main ---------- */

export function HealthHistoryPanel({ userName }: { userName: string }) {
  const h = useMemo(() => computeHealthHistory(8), []);
  const metrics = useMemo(() => buildMetrics(h), [h]);
  const reg = REG_META[h.cycle.regularity];

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
      {/* Header + explanation + export actions */}
      <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="font-script text-3xl sm:text-4xl text-hotpink leading-none">
            Your history
          </h2>
          <p className="mt-1 text-[12.5px] text-rose/70 leading-snug">
            Everything you've really logged, from day one — tap any chart for the details, then
            download it all as a report for your doctor.
          </p>
          <p className="mt-1 inline-flex items-center gap-1.5 text-[11px] font-semibold text-rose/55">
            <CalendarDays className="h-3.5 w-3.5 text-hotpink" strokeWidth={2} />
            {h.trackingSince
              ? `Tracking since ${prettyDate(h.trackingSince)} · ${h.daysTracked} day${h.daysTracked === 1 ? "" : "s"}`
              : "No data logged yet"}
          </p>
        </div>
        <div className="flex shrink-0 gap-2">
          <button
            onClick={() => downloadHealthReport(h, userName)}
            className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-hotpink to-magenta px-4 py-2.5 text-[13px] font-bold text-white shadow-md shadow-hotpink/25 transition hover:brightness-105 active:scale-95 animate-selected-glow"
          >
            <Download className="h-4 w-4" strokeWidth={2.2} /> Download report
          </button>
          <button
            onClick={() => downloadHealthCSV(h)}
            className="inline-flex items-center gap-1.5 rounded-full border border-hotpink/40 bg-white px-3.5 py-2.5 text-[13px] font-bold text-hotpink transition hover:bg-blush/50 active:scale-95"
          >
            <FileText className="h-4 w-4" strokeWidth={2} /> CSV
          </button>
        </div>
      </div>

      {!hasAnything ? (
        <EmptyPreview />
      ) : (
        <div className="space-y-4">
          {/* Summary tiles */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
            <StatTile
              Icon={CalendarDays}
              value={String(h.daysTracked)}
              label="Days tracked"
              delay={0}
            />
            <StatTile
              Icon={Activity}
              value={String(h.movement.totalSessions)}
              label="Sessions done"
              delay={60}
            />
            <StatTile
              Icon={Flame}
              value={h.movement.totalKcal.toLocaleString()}
              label="Calories burned"
              delay={120}
            />
            <StatTile
              Icon={HeartPulse}
              value={String(h.cycle.cyclesMeasured)}
              label="Cycles measured"
              delay={180}
            />
          </div>

          {/* Cycle by cycle + Weight — paired side by side on desktop */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Panel>
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
                points={cyclePoints(h.cycle.cycles)}
                unit="days"
                color={BAR_C}
                valueLabels
                perBarLabels
                tapHint="Tap a cycle to see when it started, ended & how long it lasted."
                interpretation={h.patterns.cycle}
              />
            </Panel>

            <Panel>
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
              <LineChart
                points={weightPoints(h.weight.series)}
                unit="kg"
                color={LINE_C}
                tapHint="Tap a point to see that day's weight."
                interpretation={h.patterns.weight}
              />
            </Panel>
          </div>

          {/* Burn — workout + yoga, side by side on desktop */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Panel>
              <PanelHead Icon={Dumbbell} title="Workout burn" hint="per day" />
              <BarsChart
                points={burnPoints(h.movement.workoutDaily)}
                unit="kcal"
                color={BAR_C}
                tapHint="Tap a day to see calories burned & sessions."
                interpretation={h.patterns.workout}
              />
            </Panel>
            <Panel>
              <PanelHead Icon={Sparkles} title="Yoga burn" hint="per day" />
              <BarsChart
                points={burnPoints(h.movement.yogaDaily)}
                unit="kcal"
                color={BAR_C}
                tapHint="Tap a day to see calories burned & flows."
                interpretation={h.patterns.yoga}
              />
            </Panel>
          </div>

          {/* Mood + Symptoms */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Panel>
              <PanelHead
                Icon={Smile}
                title="Mood over time"
                hint={h.mood.avgScore != null ? `avg ${h.mood.avgScore}/5` : undefined}
              />
              <LineChart
                points={moodPoints(h.mood.series)}
                unit="score"
                color={LINE_C}
                yMin={1}
                yMax={5}
                tapHint="Tap a point to see that day's mood."
                interpretation={h.patterns.mood}
              />
            </Panel>
            <Panel>
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
                interpretation={h.patterns.symptoms}
              />
            </Panel>
          </div>

          {/* Nourishment */}
          <Panel>
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
