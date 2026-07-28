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
      className="rounded-2xl border border-petal/60 bg-white/85 p-3 sm:p-3.5 shadow-sm animate-card-pop-in"
      style={{ animationDelay: `${delay}ms` }}
    >
      <span className="grid h-8 w-8 place-items-center rounded-xl bg-blush/70">
        <Icon className="h-4 w-4 text-hotpink" strokeWidth={2} />
      </span>
      <p className="mt-2 text-xl sm:text-2xl font-black text-magenta leading-none">{value}</p>
      <p className="mt-1 text-[10.5px] font-bold uppercase tracking-wide text-rose/55 leading-tight">
        {label}
      </p>
    </div>
  );
}

function Panel({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-[1.4rem] border border-petal/60 bg-white/85 backdrop-blur p-4 sm:p-5 shadow-sm ${className}`}
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

/* ---------- shared axis geometry ---------- */

const AX = { W: 340, H: 178, mL: 30, mR: 8, mT: 12, mB: 26 };
const GRID = "oklch(0.5 0.18 0 / 0.13)";
const AXIS = "oklch(0.5 0.18 0 / 0.35)";
const LABEL = "oklch(0.5 0.18 0 / 0.6)";

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

/** Clickable bar chart with real x/y axes, gridlines & a unit label. */
function BarsChart({
  points,
  unit,
  color,
  tapHint,
  interpretation,
}: {
  points: ChartPoint[];
  unit: string;
  color: string;
  tapHint: string;
  interpretation: string;
}) {
  const shown = points.slice(-MAX_POINTS);
  const [sel, setSel] = useState<string | null>(null);
  const gid = "g" + useId().replace(/[^a-zA-Z0-9]/g, "");
  const { W, H, mL, mR, mT, mB } = AX;
  const x0 = mL,
    x1 = W - mR,
    y0 = mT,
    y1 = H - mB;
  const max = niceMax(Math.max(1, ...shown.map((p) => p.value)));
  const yv = (v: number) => y1 - (v / max) * (y1 - y0);
  const n = shown.length || 1;
  const bw = (x1 - x0) / n;
  const gap = n > 40 ? 0.5 : Math.min(3, bw * 0.28);
  const ticks = [0, max / 2, max];
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
          <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} />
            <stop offset="100%" stopColor={color} stopOpacity="0.55" />
          </linearGradient>
        </defs>
        <text x="2" y={y0 - 3} style={{ fontSize: 8, fill: LABEL, fontWeight: 700 }}>
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
                opacity={p.faded ? 0.4 : 1}
                stroke={active ? "oklch(0.4 0.24 0)" : "none"}
                strokeWidth={active ? 1.5 : 0}
              />
            </g>
          );
        })}
        {xLabelIdx(shown.length).map(
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
  const ticks = [lo, (lo + hi) / 2, hi];
  return (
    <div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full h-auto"
        role="img"
        aria-label="Line chart with axes"
      >
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
                fill={active ? "oklch(0.4 0.24 0)" : color}
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
const cyclePoints = (cycles: Cycle[]): ChartPoint[] =>
  cycles.map((c) => ({
    key: c.startISO,
    label: c.monthLabel,
    value: c.lengthDays,
    faded: c.ongoing,
    readout: `${prettyDate(c.startISO)} → ${prettyDate(c.endISO)} · ${c.lengthDays} days${c.ongoing ? " (ongoing)" : ""}`,
  }));

/* ---------- combined "cycle × your body" chart ---------- */

// Soft, distinct phase band colours (rose / pale-pink / gold / violet).
const PHASE_FILL: Record<PhaseKey, string> = {
  menstrual: "#fb7185",
  follicular: "#fbcfe8",
  ovulatory: "#f59e0b",
  luteal: "#c084fc",
};

interface Metric {
  key: string;
  label: string;
  unit: string;
  color: string;
  points: { date: string; value: number }[];
}

const toTime = (iso: string) => new Date(iso + "T00:00:00").getTime();

function CycleOverlayChart({
  range,
  segments,
  metrics,
}: {
  range: { startISO: string; endISO: string };
  segments: PhaseSegment[];
  metrics: Metric[];
}) {
  const [metricKey, setMetricKey] = useState(metrics[0]?.key ?? "");
  const [sel, setSel] = useState<string | null>(null);
  const metric = metrics.find((m) => m.key === metricKey) ?? metrics[0];

  const { W, H, mR, mT, mB } = AX;
  const mLeft = 26;
  const x0 = mLeft,
    x1 = W - mR,
    y0 = mT,
    y1 = H - mB;
  const t0 = toTime(range.startISO);
  const t1 = Math.max(t0 + 86400000, toTime(range.endISO));
  const dayW = ((x1 - x0) / (t1 - t0)) * 86400000;
  const xAt = (iso: string) => x0 + ((toTime(iso) - t0) / (t1 - t0)) * (x1 - x0);

  const pts = metric?.points ?? [];
  const vals = pts.map((p) => p.value);
  const lo = vals.length ? Math.min(...vals) : 0;
  const hi = vals.length ? Math.max(...vals) : 1;
  const span = hi - lo || 1;
  const yAt = (v: number) => y0 + (1 - (v - lo) / span) * (y1 - y0);
  const line = pts
    .map((p, i) => `${i === 0 ? "M" : "L"} ${xAt(p.date).toFixed(1)} ${yAt(p.value).toFixed(1)}`)
    .join(" ");

  const phaseAt = (iso: string): PhaseKey | null => {
    const t = toTime(iso);
    const seg = segments.find((s) => t >= toTime(s.startISO) && t <= toTime(s.endISO));
    return seg ? seg.phase : null;
  };
  const selPt = pts.find((p) => p.date === sel) ?? null;
  const selPhase = selPt ? phaseAt(selPt.date) : null;

  // ~4 evenly spaced month/date ticks on the time axis
  const tickN = Math.min(4, Math.max(2, pts.length));
  const xTicks = Array.from({ length: tickN }, (_, i) => {
    const t = t0 + (i / (tickN - 1)) * (t1 - t0);
    return { x: x0 + (i / (tickN - 1)) * (x1 - x0), label: shortDay(localFromT(t)) };
  });

  return (
    <div>
      {/* metric selector */}
      <div className="mb-2 flex flex-wrap gap-1.5">
        {metrics.map((m) => {
          const on = m.key === metricKey;
          return (
            <button
              key={m.key}
              onClick={() => {
                setMetricKey(m.key);
                setSel(null);
              }}
              className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-bold transition active:scale-95 ${on ? "border-transparent text-white shadow-sm" : "border-petal/60 bg-white/70 text-rose hover:bg-blush/60"}`}
              style={on ? { background: m.color } : undefined}
            >
              <span
                className="h-2 w-2 rounded-full"
                style={{ background: on ? "#fff" : m.color }}
              />{" "}
              {m.label}
            </button>
          );
        })}
      </div>

      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full h-auto"
        role="img"
        aria-label="Metric over time, coloured by cycle phase"
      >
        {/* phase bands */}
        {segments.map((s, i) => (
          <rect
            key={i}
            x={xAt(s.startISO)}
            y={y0}
            width={Math.max(0.5, xAt(s.endISO) - xAt(s.startISO) + dayW)}
            height={y1 - y0}
            fill={PHASE_FILL[s.phase]}
            opacity={0.16}
          />
        ))}
        {/* y High/Low + baseline */}
        <text x="2" y={y0 + 4} style={{ fontSize: 8, fill: LABEL, fontWeight: 700 }}>
          High
        </text>
        <text x="2" y={y1} style={{ fontSize: 8, fill: LABEL, fontWeight: 700 }}>
          Low
        </text>
        <line x1={x0} x2={x1} y1={y1} y2={y1} stroke={AXIS} strokeWidth={1} />
        {/* line + dots */}
        {pts.length >= 2 && (
          <path
            d={line}
            fill="none"
            stroke={metric.color}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}
        {pts.map((p) => {
          const active = p.date === sel;
          return (
            <g
              key={p.date}
              onClick={() => setSel(active ? null : p.date)}
              style={{ cursor: "pointer" }}
            >
              <circle cx={xAt(p.date)} cy={yAt(p.value)} r={9} fill="transparent" />
              <circle
                cx={xAt(p.date)}
                cy={yAt(p.value)}
                r={active ? 4.5 : 2.4}
                fill={active ? "oklch(0.4 0.24 0)" : metric.color}
                stroke="#fff"
                strokeWidth={active ? 1.8 : 0.8}
              />
            </g>
          );
        })}
        {xTicks.map((t, i) => (
          <text
            key={i}
            x={t.x}
            y={y1 + 12}
            textAnchor={i === 0 ? "start" : i === xTicks.length - 1 ? "end" : "middle"}
            style={{ fontSize: 8, fill: LABEL, fontWeight: 600 }}
          >
            {t.label}
          </text>
        ))}
      </svg>

      {/* phase legend */}
      <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
        {(Object.keys(PHASE_FILL) as PhaseKey[]).map((p) => (
          <span
            key={p}
            className="inline-flex items-center gap-1 text-[10px] font-semibold text-rose/60"
          >
            <span
              className="h-2.5 w-2.5 rounded-[3px]"
              style={{ background: PHASE_FILL[p], opacity: 0.5 }}
            />{" "}
            {PHASE_LABEL[p]}
          </span>
        ))}
      </div>

      <div className="mt-2 min-h-[2.1rem] rounded-xl border border-petal/50 bg-blush/40 px-3 py-2 text-[12px] leading-snug">
        {selPt ? (
          <span className="text-[#831843]">
            <b className="text-hotpink">{prettyDate(selPt.date)}</b>
            {selPhase ? <> · {PHASE_LABEL[selPhase]} phase</> : null} · {metric.label}{" "}
            {fmtNum(selPt.value)}
            {metric.unit && metric.unit !== "count" ? ` ${metric.unit}` : ""}
          </span>
        ) : (
          <span className="text-rose/50">
            Pick a metric, then tap a point to see its value &amp; which phase you were in.
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
        <Panel className="text-center">
          <p className="font-script text-2xl text-hotpink">Your history starts today ✿</p>
          <p className="mt-1 text-sm text-rose/70 max-w-md mx-auto">
            As you confirm your period days, finish workouts &amp; flows, and log mood, symptoms and
            weight, it all gathers here — real, only what you logged — and becomes a report you can
            download anytime.
          </p>
        </Panel>
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

          {/* THE BIG ONE — everything, coloured by cycle phase, over time */}
          {h.range && h.phaseSegments.length > 0 && metrics.length > 0 && (
            <Panel>
              <PanelHead
                Icon={Sparkles}
                title="Your cycle × your body"
                hint="by phase & over time"
              />
              <p className="mb-2 text-[12px] leading-snug text-rose/70">
                Pick a metric to see it plotted over time, with the background coloured by your
                cycle phase — so you can see how each phase shapes how you feel and move.
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

          {/* Cycle regularity verdict + the by-cycle histogram */}
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
              color="#be185d"
              tapHint="Tap a cycle to see when it started, ended & how long it lasted."
              interpretation={h.patterns.cycle}
            />
          </Panel>

          {/* Weight — line */}
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
              color="#db2777"
              tapHint="Tap a point to see that day's weight."
              interpretation={h.patterns.weight}
            />
          </Panel>

          {/* Burn — workout + yoga, side by side on desktop */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Panel>
              <PanelHead Icon={Dumbbell} title="Workout burn" hint="per day" />
              <BarsChart
                points={burnPoints(h.movement.workoutDaily)}
                unit="kcal"
                color="#db2777"
                tapHint="Tap a day to see calories burned & sessions."
                interpretation={h.patterns.workout}
              />
            </Panel>
            <Panel>
              <PanelHead Icon={Sparkles} title="Yoga burn" hint="per day" />
              <BarsChart
                points={burnPoints(h.movement.yogaDaily)}
                unit="kcal"
                color="#ec4899"
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
                color="#db2777"
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
                color="#a21caf"
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
