/**
 * Your history — the Me-page panel that turns every REAL logged event into
 * lifetime insights + a doctor-shareable report. All data comes from
 * computeHealthHistory (which only reads canonical stores), so nothing here can
 * disagree with the rest of the app. Responsive per the Bloomzein directive:
 * mobile stacks single-column with two-up stat tiles; desktop uses multi-column
 * with the cycle-regularity insight leading.
 */
import { useMemo } from "react";
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
  type HealthHistory,
} from "@/lib/healthHistory";
import { downloadHealthReport, downloadHealthCSV } from "@/lib/healthReport";

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

/** Horizontal magnitude bars — one series, direct-labelled (no legend needed). */
function BarList({ rows, unit }: { rows: { label: string; count: number }[]; unit: string }) {
  const max = Math.max(1, ...rows.map((r) => r.count));
  return (
    <ul className="space-y-2">
      {rows.map((r) => (
        <li key={r.label} className="flex items-center gap-2.5">
          <span className="w-20 shrink-0 truncate text-[12px] font-semibold text-[#831843]">
            {r.label}
          </span>
          <div className="h-2.5 flex-1 rounded-full bg-blush/70 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-petal via-hotpink to-magenta transition-[width] duration-700"
              style={{ width: `${(r.count / max) * 100}%` }}
            />
          </div>
          <span className="w-14 shrink-0 text-right text-[11px] font-bold text-rose/70">
            {r.count} {unit}
          </span>
        </li>
      ))}
    </ul>
  );
}

/** Weekly burn — mini bar chart (one series, values labelled). */
function WeeklyBurn({ weekly }: { weekly: HealthHistory["movement"]["weekly"] }) {
  const max = Math.max(1, ...weekly.map((w) => w.kcal));
  return (
    <div className="flex items-end gap-1.5 h-28">
      {weekly.map((w) => (
        <div key={w.weekStartISO} className="flex flex-1 flex-col items-center gap-1 min-w-0">
          <span className="text-[9px] font-bold text-rose/60">{w.kcal > 0 ? w.kcal : ""}</span>
          <div className="w-full flex items-end" style={{ height: "72px" }}>
            <div
              className="w-full rounded-t-md bg-gradient-to-t from-hotpink to-magenta transition-[height] duration-700"
              style={{ height: `${Math.max(w.kcal > 0 ? 6 : 0, (w.kcal / max) * 100)}%` }}
              title={`${w.label}: ${w.kcal} kcal · ${w.sessions} sessions`}
            />
          </div>
          <span className="text-[8.5px] text-rose/45 truncate w-full text-center">{w.label}</span>
        </div>
      ))}
    </div>
  );
}

/** Weight trend sparkline (single series). */
function WeightSpark({ series }: { series: { date: string; kg: number }[] }) {
  if (series.length < 2) return null;
  const w = 240,
    h = 60,
    pad = 6;
  const xs = series.map((_, i) => pad + (i / (series.length - 1)) * (w - pad * 2));
  const kgs = series.map((s) => s.kg);
  const min = Math.min(...kgs),
    max = Math.max(...kgs);
  const span = max - min || 1;
  const y = (kg: number) => pad + (1 - (kg - min) / span) * (h - pad * 2);
  const d = series
    .map((s, i) => `${i === 0 ? "M" : "L"} ${xs[i].toFixed(1)} ${y(s.kg).toFixed(1)}`)
    .join(" ");
  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      className="w-full h-auto"
      preserveAspectRatio="none"
      role="img"
      aria-label="Weight trend"
    >
      <path
        d={d}
        fill="none"
        stroke="oklch(0.62 0.24 0)"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx={xs[xs.length - 1]} cy={y(kgs[kgs.length - 1])} r={3} fill="oklch(0.5 0.26 0)" />
    </svg>
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

/* ---------- main ---------- */

export function HealthHistoryPanel({ userName }: { userName: string }) {
  const h = useMemo(() => computeHealthHistory(8), []);
  const reg = REG_META[h.cycle.regularity];

  const hasAnything =
    h.trackingSince !== null ||
    h.movement.totalSessions > 0 ||
    h.cycle.count > 0 ||
    h.mood.days > 0 ||
    h.symptoms.days > 0;

  const changeIcon =
    h.weight.changeKg == null || h.weight.changeKg === 0
      ? Minus
      : h.weight.changeKg < 0
        ? TrendingDown
        : TrendingUp;
  const ChangeIcon = changeIcon;

  return (
    <section className="animate-card-pop-in" style={{ animationDelay: "40ms" }}>
      {/* Header + explanation + export actions */}
      <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="font-script text-3xl sm:text-4xl text-hotpink leading-none">
            Your history
          </h2>
          <p className="mt-1 text-[12.5px] text-rose/70 leading-snug">
            Everything you've really logged, from day one — kept for you, ready to share with your
            doctor.
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

          {/* Cycle regularity — the doctor headline */}
          <Panel>
            <PanelHead
              Icon={HeartPulse}
              title="Cycle rhythm"
              hint={h.cycle.count ? `${h.cycle.count} confirmed starts` : undefined}
            />
            <div className="flex flex-wrap items-center gap-2">
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
            <p className="mt-2 text-[12.5px] leading-snug text-[#831843]">{reg.text}</p>
            {h.cycle.recentLengths.length > 0 && (
              <div className="mt-3">
                <p className="text-[10px] font-bold uppercase tracking-wide text-rose/50">
                  Recent cycle lengths (days)
                </p>
                <div className="mt-1.5 flex flex-wrap items-end gap-1.5">
                  {h.cycle.recentLengths.map((d, i) => (
                    <span key={i} className="inline-flex flex-col items-center gap-1">
                      <span className="grid h-7 min-w-[2rem] place-items-center rounded-lg bg-blush/70 px-2 text-[12px] font-black text-magenta">
                        {d}
                      </span>
                    </span>
                  ))}
                </div>
              </div>
            )}
            {h.cycle.lastStart && (
              <p className="mt-3 text-[11.5px] text-rose/60">
                Most recent confirmed start ·{" "}
                <b className="text-hotpink">{prettyDate(h.cycle.lastStart)}</b>
              </p>
            )}
          </Panel>

          {/* Movement + burned calories */}
          <Panel>
            <PanelHead Icon={Flame} title="Movement & burn" hint="last 8 weeks" />
            <div className="grid grid-cols-3 gap-2 mb-3">
              <div className="rounded-xl bg-blush/40 p-2.5 text-center">
                <p className="text-lg font-black text-magenta leading-none">
                  {h.movement.workouts}
                </p>
                <p className="mt-0.5 inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-rose/55">
                  <Dumbbell className="h-3 w-3" strokeWidth={2} /> Workouts
                </p>
              </div>
              <div className="rounded-xl bg-blush/40 p-2.5 text-center">
                <p className="text-lg font-black text-magenta leading-none">{h.movement.yoga}</p>
                <p className="mt-0.5 inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-rose/55">
                  <Sparkles className="h-3 w-3" strokeWidth={2} /> Yoga
                </p>
              </div>
              <div className="rounded-xl bg-blush/40 p-2.5 text-center">
                <p className="text-lg font-black text-magenta leading-none">
                  {h.movement.activeDays}
                </p>
                <p className="mt-0.5 inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-rose/55">
                  <CalendarDays className="h-3 w-3" strokeWidth={2} /> Active days
                </p>
              </div>
            </div>
            <WeeklyBurn weekly={h.movement.weekly} />
            <p className="mt-2 text-[11px] text-rose/55 text-center">
              Real calories burned in completed workouts &amp; yoga flows.
            </p>
          </Panel>

          {/* Symptoms + Mood side by side on desktop */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Panel>
              <PanelHead
                Icon={Activity}
                title="Symptoms"
                hint={h.symptoms.days ? `${h.symptoms.days} days` : undefined}
              />
              {h.symptoms.byLabel.length ? (
                <BarList rows={h.symptoms.byLabel} unit="d" />
              ) : (
                <p className="text-[12.5px] text-rose/55">
                  Nothing logged yet — tag how you feel on Today and it charts here.
                </p>
              )}
            </Panel>
            <Panel>
              <PanelHead
                Icon={Smile}
                title="Mood"
                hint={h.mood.avgScore != null ? `avg ${h.mood.avgScore}/5` : undefined}
              />
              {h.mood.byMood.length ? (
                <BarList
                  rows={h.mood.byMood.map((m) => ({ label: titleCase(m.label), count: m.count }))}
                  unit="d"
                />
              ) : (
                <p className="text-[12.5px] text-rose/55">
                  No mood logged yet — your mood over time will show here.
                </p>
              )}
            </Panel>
          </div>

          {/* Weight + Nourishment */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Panel>
              <PanelHead Icon={Scale} title="Weight" hint={titleCase(h.weight.goal)} />
              {h.weight.currentKg != null ? (
                <>
                  <div className="flex items-baseline gap-2">
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
                  <p className="mt-0.5 text-[11px] text-rose/55">
                    {h.weight.startKg != null ? `from ${h.weight.startKg} kg` : ""}
                    {h.weight.targetKg != null ? ` · target ${h.weight.targetKg} kg` : ""}
                  </p>
                  <div className="mt-2">
                    <WeightSpark series={h.weight.series} />
                  </div>
                </>
              ) : (
                <p className="text-[12.5px] text-rose/55">
                  Log your weight in Diet and the trend appears here.
                </p>
              )}
            </Panel>
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
          </div>

          {/* Honest-data footnote */}
          <p className="flex items-start gap-1.5 rounded-2xl bg-blush/40 border border-petal/50 px-3.5 py-2.5 text-[11.5px] leading-snug text-rose/70">
            <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-hotpink" strokeWidth={2} />
            <span>
              Every number here is something you confirmed or logged yourself — a personal wellness
              summary, not a medical record. The downloadable report is yours to keep or share.
            </span>
          </p>
        </div>
      )}
    </section>
  );
}
