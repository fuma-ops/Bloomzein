/**
 * Cycle Nutrition — the "Nutrition Cycle" editorial page (Diet · Cycle tab).
 *
 * A rich, informative, phase-aware nutrition guide. It reads the LIVE phase from
 * the coach (buildDayCoach → cyclePhase) and the per-phase editorial content from
 * lib/cycleNutrition.ts, so every number/food shown agrees with the rest of the
 * app. A phase selector lets her explore any phase in place (no navigation) — the
 * whole page cross-fades to that phase's story; "Today" snaps back to her phase.
 *
 * Responsive per the Bloomzein directive: mobile stacks single-column (stat cards
 * two-up); desktop splits the hero and lower grids into a main column + a sticky
 * "At a Glance" right panel that reacts to the selected phase.
 */
import { useMemo, useState } from "react";
import {
  ArrowRight,
  Sparkles,
  Flower2,
  Zap,
  Smile,
  Target,
  Heart,
  Dumbbell,
  Activity,
  Footprints,
  Wind,
  Sun,
  Droplet,
  Leaf,
  Moon,
  Coffee,
  Wine,
  Flame,
  Candy,
  Snowflake,
  Fish,
  Wheat,
  Milk,
  Cherry,
  Egg,
  Beef,
  Salad,
  HeartPulse,
  Utensils,
  CalendarHeart,
  Check,
  LineChart,
} from "lucide-react";
import type { DayCoach } from "@/lib/todayCoach";
import {
  CYCLE_NUTRITION,
  CYCLE_PHASE_ORDER,
  PHASE_DAY_RANGE,
  cycleNutritionFor,
  CYCLE_CURVES,
  CYCLE_CURVE_DAYS,
  CYCLE_BANDS,
  curveValueAtDay,
  type NutrientNeed,
  type Tip,
} from "@/lib/cycleNutrition";
import {
  RECIPES,
  recipeImageSrc,
  type DietPhase,
  type Recipe,
} from "@/components/bloom/recipes/data";
import { AnimatedWords } from "@/components/bloom/AnimatedWords";

/* ---------- icon resolvers ---------- */

const NUTRIENT_ICON: Record<NutrientNeed["icon"], typeof Zap> = {
  protein: Beef,
  iron: Droplet,
  omega3: Fish,
  magnesium: Leaf,
  fibre: Wheat,
  calcium: Milk,
  antioxidants: Cherry,
  bvitamins: Egg,
};
const TIP_ICON: Record<string, typeof Zap> = {
  candy: Candy,
  wine: Wine,
  flame: Flame,
  coffee: Coffee,
  snowflake: Snowflake,
  dumbbell: Dumbbell,
  activity: Activity,
  flower: Flower2,
  footprints: Footprints,
  wind: Wind,
  sun: Sun,
  droplet: Droplet,
  leaf: Leaf,
  moon: Moon,
};

/* ---------- Bloom Plate donut (visual macro emphasis, not a kcal formula) ---------- */

const PLATE_SEGMENTS: {
  key: "carbs" | "protein" | "complexCarbs" | "fats";
  label: string;
  color: string;
}[] = [
  { key: "carbs", label: "Optimal Carbohydrates", color: "oklch(0.7 0.19 350)" },
  { key: "protein", label: "Protein Sources", color: "oklch(0.62 0.24 0)" },
  { key: "complexCarbs", label: "Complex Carbohydrates", color: "oklch(0.55 0.26 0)" },
  { key: "fats", label: "Healthy Fats", color: "oklch(0.82 0.12 340)" },
];

function BloomPlate({
  plate,
}: {
  plate: { carbs: number; protein: number; complexCarbs: number; fats: number; note: string };
}) {
  const size = 132,
    stroke = 20,
    r = (size - stroke) / 2,
    c = 2 * Math.PI * r;
  let acc = 0;
  return (
    <div className="flex items-center gap-4">
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="-rotate-90 shrink-0"
      >
        {PLATE_SEGMENTS.map((seg) => {
          const val = plate[seg.key];
          const dash = (val / 100) * c;
          const el = (
            <circle
              key={seg.key}
              cx={size / 2}
              cy={size / 2}
              r={r}
              stroke={seg.color}
              strokeWidth={stroke}
              fill="none"
              strokeDasharray={`${dash} ${c - dash}`}
              strokeDashoffset={-acc}
              style={{ transition: "stroke-dasharray 0.7s ease, stroke-dashoffset 0.7s ease" }}
            />
          );
          acc += dash;
          return el;
        })}
      </svg>
      <ul className="flex-1 space-y-1.5">
        {PLATE_SEGMENTS.map((seg) => (
          <li key={seg.key} className="flex items-center gap-2 text-[12px]">
            <span
              className="grid h-6 w-9 shrink-0 place-items-center rounded-full text-[11px] font-black text-white"
              style={{ background: seg.color }}
            >
              {plate[seg.key]}%
            </span>
            <span className="font-semibold text-rose/80 leading-tight">{seg.label}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ---------- vital meter ---------- */

function Meter({
  Icon,
  label,
  value,
  accent,
}: {
  Icon: typeof Zap;
  label: string;
  value: number;
  accent: string;
}) {
  return (
    <div className="min-w-0">
      <div className="flex items-center justify-between gap-1">
        <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-rose/60">
          <Icon className="h-3 w-3" strokeWidth={2} style={{ color: accent }} /> {label}
        </span>
        <span className="text-[11px] font-black" style={{ color: accent }}>
          {value}%
        </span>
      </div>
      <div className="mt-1 h-1.5 w-full rounded-full bg-blush/70 overflow-hidden">
        <div
          className="h-full rounded-full transition-[width] duration-700 ease-out"
          style={{ width: `${value}%`, background: accent }}
        />
      </div>
    </div>
  );
}

/* ---------- soft section header (word-by-word alive) ---------- */

function SectionTitle({
  Icon,
  title,
  sub,
  delay = 0,
}: {
  Icon: typeof Zap;
  title: string;
  sub?: string;
  delay?: number;
}) {
  return (
    <div className="mb-3">
      <h3 className="inline-flex items-center gap-2 font-script text-2xl sm:text-3xl text-hotpink leading-none">
        <Icon className="h-5 w-5 text-hotpink" strokeWidth={1.8} />
        <AnimatedWords text={title} stagger={90} initialDelay={delay} />
      </h3>
      {sub && <p className="mt-1 text-[12.5px] text-rose/70 leading-snug">{sub}</p>}
    </div>
  );
}

function Card({
  children,
  className = "",
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  return (
    <div
      className={`rounded-[1.4rem] border border-petal/60 bg-white/85 backdrop-blur shadow-lg shadow-rose/10 animate-card-pop-in ${className}`}
      style={{ animationDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}

/* ---------- pick a phase-appropriate hero recipe (canonical RECIPES) ---------- */

function heroRecipeFor(phase: DietPhase): Recipe | undefined {
  const inPhase = RECIPES.filter(
    (r) => r.phases.includes(phase) && (r.mealType === "dinner" || r.mealType === "lunch"),
  );
  const pool = inPhase.length
    ? inPhase
    : RECIPES.filter((r) => r.mealType === "dinner" || r.mealType === "lunch");
  return [...pool].sort((a, b) => b.macros.protein - a.macros.protein)[0];
}

/* ---------- Cycle rhythm chart — hormones × energy × mood over the month ---------- */

// Smooth (Catmull-Rom → cubic bezier) path through points, for organic curves.
function smoothPath(pts: [number, number][]): string {
  if (pts.length < 2) return pts.length ? `M ${pts[0][0]} ${pts[0][1]}` : "";
  let d = `M ${pts[0][0]} ${pts[0][1]}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] ?? p2;
    const c1x = p1[0] + (p2[0] - p0[0]) / 6;
    const c1y = p1[1] + (p2[1] - p0[1]) / 6;
    const c2x = p2[0] - (p3[0] - p1[0]) / 6;
    const c2y = p2[1] - (p3[1] - p1[1]) / 6;
    d += ` C ${c1x} ${c1y} ${c2x} ${c2y} ${p2[0]} ${p2[1]}`;
  }
  return d;
}

const READOUT_TAG = (v: number) =>
  v >= 80 ? "Peak" : v >= 55 ? "High" : v >= 35 ? "Rising" : "Low";

function CycleRhythmChart({
  selected,
  onSelect,
}: {
  selected: DietPhase;
  onSelect: (p: DietPhase) => void;
}) {
  // viewBox geometry — scales fluidly to any width via preserveAspectRatio.
  const W = 720,
    H = 340,
    padL = 46,
    padR = 18,
    padT = 40,
    padB = 34;
  const x0 = padL,
    x1 = W - padR,
    yTop = padT,
    yBot = H - padB;
  const LAST = CYCLE_CURVE_DAYS[CYCLE_CURVE_DAYS.length - 1];
  const xForDay = (d: number) => x0 + ((d - 1) / (LAST - 1)) * (x1 - x0);
  const yForVal = (v: number) => yBot - (v / 100) * (yBot - yTop);

  const band = CYCLE_BANDS.find((b) => b.phase === selected) ?? CYCLE_BANDS[1];
  const guideX = xForDay(band.midDay);

  const gridLines = [
    { v: 100, label: "Peak" },
    { v: 50, label: "Mid" },
    { v: 0, label: "Low" },
  ];
  const dayTicks = [1, 7, 14, 21, 28];

  return (
    <Card className="p-3 sm:p-4">
      {/* legend — identity by dot + label (never colour alone) */}
      <div className="mb-2 flex flex-wrap items-center gap-x-3.5 gap-y-1.5">
        {CYCLE_CURVES.map((c) => (
          <span
            key={c.key}
            className="inline-flex items-center gap-1.5 text-[11.5px] font-bold text-rose/75"
          >
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: c.color }} />
            {c.label}
          </span>
        ))}
      </div>

      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full h-auto"
        role="img"
        aria-label="Line chart of estrogen, progesterone, energy and mood across a 28-day cycle"
      >
        {/* phase bands — tappable to switch phase */}
        {CYCLE_BANDS.map((b) => {
          const active = b.phase === selected;
          const bx = xForDay(b.startDay);
          const bw = xForDay(b.endDay) - bx;
          return (
            <g key={b.phase} onClick={() => onSelect(b.phase)} style={{ cursor: "pointer" }}>
              <rect
                x={bx}
                y={yTop}
                width={bw}
                height={yBot - yTop}
                rx={8}
                fill={active ? "oklch(0.62 0.24 0 / 0.1)" : "oklch(0.92 0.05 340 / 0.28)"}
                stroke={active ? "oklch(0.62 0.24 0 / 0.5)" : "transparent"}
                strokeWidth={active ? 1.5 : 0}
              />
              <text
                x={bx + bw / 2}
                y={yTop - 14}
                textAnchor="middle"
                className="font-bold uppercase"
                style={{
                  fontSize: 11,
                  letterSpacing: 0.5,
                  fill: active ? "oklch(0.5 0.26 0)" : "oklch(0.5 0.18 0 / 0.55)",
                }}
              >
                {CYCLE_NUTRITION[b.phase].label}
              </text>
              <text
                x={bx + bw / 2}
                y={yTop - 2}
                textAnchor="middle"
                style={{ fontSize: 9, fill: "oklch(0.5 0.18 0 / 0.45)" }}
              >
                {PHASE_DAY_RANGE[b.phase].replace("Days ", "")}
              </text>
            </g>
          );
        })}

        {/* horizontal gridlines + y labels */}
        {gridLines.map((g) => (
          <g key={g.v}>
            <line
              x1={x0}
              x2={x1}
              y1={yForVal(g.v)}
              y2={yForVal(g.v)}
              stroke="oklch(0.5 0.18 0 / 0.12)"
              strokeWidth={1}
              strokeDasharray={g.v === 0 ? "0" : "3 4"}
            />
            <text
              x={x0 - 8}
              y={yForVal(g.v) + 3}
              textAnchor="end"
              style={{ fontSize: 9.5, fontWeight: 700, fill: "oklch(0.5 0.18 0 / 0.5)" }}
            >
              {g.label}
            </text>
          </g>
        ))}

        {/* selected-phase guide line */}
        <line
          x1={guideX}
          x2={guideX}
          y1={yTop}
          y2={yBot}
          stroke="oklch(0.62 0.24 0 / 0.45)"
          strokeWidth={1.5}
          strokeDasharray="4 4"
        />

        {/* the four curves */}
        {CYCLE_CURVES.map((c, ci) => {
          const pts = CYCLE_CURVE_DAYS.map(
            (d, i) => [xForDay(d), yForVal(c.values[i])] as [number, number],
          );
          const gy = yForVal(curveValueAtDay(c, band.midDay));
          return (
            <g key={c.key}>
              <path
                d={smoothPath(pts)}
                fill="none"
                stroke={c.color}
                strokeWidth={2.4}
                strokeLinecap="round"
                strokeLinejoin="round"
                pathLength={1}
                strokeDasharray={1}
                className="animate-draw-line"
                style={{ animationDelay: `${ci * 160}ms` }}
              />
              {/* marker where the guide meets this curve */}
              <circle cx={guideX} cy={gy} r={5} fill="white" stroke={c.color} strokeWidth={2.4} />
            </g>
          );
        })}

        {/* day axis */}
        {dayTicks.map((d) => (
          <text
            key={d}
            x={xForDay(d)}
            y={yBot + 20}
            textAnchor="middle"
            style={{ fontSize: 9.5, fontWeight: 600, fill: "oklch(0.5 0.18 0 / 0.5)" }}
          >
            {d === 1 ? "Day 1" : d}
          </text>
        ))}
      </svg>

      {/* selected-phase readout — the four levels, explained in numbers */}
      <div className="mt-2 grid grid-cols-2 sm:grid-cols-4 gap-2">
        {CYCLE_CURVES.map((c) => {
          const v = curveValueAtDay(c, band.midDay);
          return (
            <div
              key={c.key}
              className="rounded-xl border border-petal/50 bg-white/70 px-2.5 py-2"
              style={{ borderLeft: `3px solid ${c.color}` }}
            >
              <p className="inline-flex items-center gap-1.5 text-[10.5px] font-bold text-rose/70">
                <span className="h-2 w-2 rounded-full" style={{ background: c.color }} />
                {c.label}
              </p>
              <p className="mt-0.5 flex items-baseline gap-1">
                <span className="text-[16px] font-black text-magenta">{v}</span>
                <span className="text-[10px] font-bold" style={{ color: c.color }}>
                  {READOUT_TAG(v)}
                </span>
              </p>
            </div>
          );
        })}
      </div>

      <p className="mt-3 rounded-2xl bg-blush/50 border border-petal/50 px-3.5 py-2.5 text-[12.5px] leading-snug text-[#831843]">
        <b className="text-hotpink">{CYCLE_NUTRITION[selected].label} ·</b>{" "}
        {CYCLE_NUTRITION[selected].chartNote}
      </p>
    </Card>
  );
}

/* ---------- main view ---------- */

export function CycleNutritionView({
  coach,
  onOpenRecipe,
}: {
  coach: DayCoach;
  onOpenRecipe: (recipeId: string) => void;
}) {
  const todayPhase = coach.phase;
  const [selected, setSelected] = useState<DietPhase>(todayPhase);
  const isToday = selected === todayPhase;

  const content = cycleNutritionFor(selected);
  const accent = content.accent;
  const cycleDay = isToday ? coach.cycleDay : null;
  const hero = useMemo(() => heroRecipeFor(selected), [selected]);

  const meters: { Icon: typeof Zap; label: string; key: keyof typeof content.meters }[] = [
    { Icon: Zap, label: "Energy", key: "energy" },
    { Icon: Smile, label: "Mood", key: "mood" },
    { Icon: Target, label: "Focus", key: "focus" },
    { Icon: Heart, label: "Recovery", key: "recovery" },
  ];

  return (
    <div className="space-y-6">
      {/* ══ Big phase section — the four phases live INSIDE the hero as one
          elegant segmented bar. Tapping a phase smoothly switches the WHOLE
          page (hero + every section below) to that phase. ══ */}
      <section className="overflow-hidden rounded-[1.85rem] border border-petal/60 bg-gradient-to-br from-blush/50 via-white/70 to-petal/30 p-2.5 sm:p-3.5 shadow-xl shadow-rose/10 animate-card-pop-in">
        {/* elegant segmented phase bar (part of the hero section) */}
        <div className="rounded-[1.5rem] border border-petal/50 bg-white/65 backdrop-blur p-1.5">
          <div className="flex items-center justify-between px-2 pb-1.5 pt-1">
            <p className="font-script text-2xl text-hotpink leading-none">Your Cycle</p>
            {!isToday && (
              <button
                onClick={() => setSelected(todayPhase)}
                className="inline-flex items-center gap-1 rounded-full bg-hotpink/10 px-2.5 py-1 text-[10.5px] font-bold text-hotpink transition hover:bg-hotpink/20 active:scale-95 animate-selected-glow"
              >
                <CalendarHeart className="h-3 w-3" strokeWidth={2.2} /> Back to today
              </button>
            )}
          </div>
          <div className="grid grid-cols-4 gap-1 sm:gap-1.5">
            {CYCLE_PHASE_ORDER.map((p) => {
              const active = p === selected;
              const isNow = p === todayPhase;
              return (
                <button
                  key={p}
                  onClick={() => setSelected(p)}
                  className={[
                    "group relative overflow-hidden rounded-2xl px-1.5 py-2 text-center transition-all duration-300 active:scale-95 sm:px-2.5 sm:py-2.5",
                    active
                      ? "scale-[1.03] bg-gradient-to-br from-hotpink to-magenta text-white shadow-md shadow-hotpink/30"
                      : "text-rose hover:-translate-y-0.5 hover:bg-blush/70",
                  ].join(" ")}
                >
                  <span className="flex items-center justify-center gap-1 text-[11.5px] font-black leading-none sm:text-[13px]">
                    {CYCLE_NUTRITION[p].label}
                    {isNow && (
                      <span
                        className={`inline-block h-1.5 w-1.5 rounded-full ${active ? "bg-white" : "bg-hotpink"} animate-pulse`}
                      />
                    )}
                  </span>
                  <span
                    className={`mt-0.5 block text-[9px] font-semibold sm:text-[10px] ${active ? "text-white/85" : "text-rose/55"}`}
                  >
                    {PHASE_DAY_RANGE[p]}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* ── HERO · Your Body Today + At a Glance (right panel on desktop) ── */}
        <div
          key={selected}
          className="animate-phase-swap mt-2.5 grid grid-cols-1 gap-3 sm:mt-3 sm:gap-4 lg:grid-cols-5"
        >
          {/* Main — body today */}
          <Card className="lg:col-span-3 relative overflow-hidden p-0">
            <div className="relative h-44 sm:h-52 w-full overflow-hidden">
              <img
                src={content.heroImage}
                alt=""
                className="h-full w-full object-cover object-[75%_28%]"
                loading="lazy"
                onError={(e) => {
                  const el = e.currentTarget as HTMLImageElement;
                  if (!el.src.endsWith("/images/hero-girl.webp")) el.src = "/images/hero-girl.webp";
                }}
              />
              {/* light top-left scrim only — keeps the photo vibrant while the
                  title stays legible; a thin bottom fade blends into the card */}
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/60 via-white/10 to-transparent" />
              <div className="pointer-events-none absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-white/85 to-transparent" />
              <div className="absolute top-3 left-4 right-4">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/85 backdrop-blur px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-hotpink shadow-sm">
                  <Sparkles className="h-3 w-3" strokeWidth={2} /> Your Body Today
                </span>
                <h2 className="mt-1.5 font-script text-3xl sm:text-4xl text-hotpink leading-none drop-shadow-[0_1px_5px_rgba(255,255,255,0.95)]">
                  <AnimatedWords text={`${content.label} Phase`} stagger={110} />
                </h2>
                <p className="text-[12px] font-bold text-rose/80 drop-shadow-[0_1px_3px_rgba(255,255,255,0.95)]">
                  {cycleDay ? `Day ${cycleDay} of your cycle` : content.dayRange}
                </p>
              </div>
            </div>
            <div className="p-4 sm:p-5">
              <p className="text-[13.5px] leading-relaxed text-[#831843]">{content.bodyToday}</p>
              {/* vital meters — two-up on mobile for density */}
              <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3">
                {meters.map((m) => (
                  <Meter
                    key={m.key}
                    Icon={m.Icon}
                    label={m.label}
                    value={content.meters[m.key]}
                    accent={accent}
                  />
                ))}
              </div>
            </div>
          </Card>

          {/* Right panel — At a Glance (sticky on desktop, reacts to phase) */}
          <Card className="lg:col-span-2 lg:sticky lg:top-4 p-4 sm:p-5 self-start" delay={80}>
            <p className="inline-flex items-center gap-1.5 font-script text-2xl text-hotpink leading-none">
              <Flower2 className="h-4 w-4" strokeWidth={2} /> At a Glance
            </p>
            <p className="mt-0.5 text-[11px] font-semibold text-rose/55">
              what your {content.label.toLowerCase()} phase gives you
            </p>
            <ul className="mt-3 space-y-2">
              {content.glance.map((g, i) => (
                <li
                  key={g}
                  className="flex items-center gap-2.5 animate-fade-in"
                  style={{ animationDelay: `${120 + i * 60}ms` }}
                >
                  <span
                    className="grid h-6 w-6 shrink-0 place-items-center rounded-full"
                    style={{ background: "color-mix(in oklab, var(--blush), white 20%)" }}
                  >
                    <Sparkles className="h-3.5 w-3.5" strokeWidth={2} style={{ color: accent }} />
                  </span>
                  <span className="text-[13px] font-semibold text-[#831843]">{g}</span>
                </li>
              ))}
            </ul>
            <p className="mt-4 rounded-2xl bg-blush/50 border border-petal/50 px-3.5 py-2.5 text-[12.5px] leading-snug text-[#831843]">
              {content.tagline}
            </p>
          </Card>
        </div>
      </section>

      {/* Everything below the hero switches with the phase too — one smooth,
          cute swap for the whole page (keyed on the selected phase). */}
      <div key={selected} className="animate-phase-swap space-y-6">
        {/* ── Cycle rhythm chart · hormones × energy × mood over the month ── */}
        <section>
          <SectionTitle
            Icon={LineChart}
            title="Hormones × Energy × Mood"
            sub="how they rise and fall together across your whole cycle · tap a phase band to explore"
          />
          <CycleRhythmChart selected={selected} onSelect={setSelected} />
        </section>

        {/* ── What Your Body Needs Today · nutrient cards ── */}
        <section key={`n-${selected}`}>
          <SectionTitle
            Icon={Salad}
            title="What Your Body Needs Today"
            sub="the nutrients that work with your hormones right now"
          />
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {content.nutrients.map((n, i) => {
              const Icon = NUTRIENT_ICON[n.icon];
              return (
                <Card key={n.name} className="p-3.5 hover-scale hover:shadow-md" delay={i * 70}>
                  <span
                    className="grid h-10 w-10 place-items-center rounded-2xl"
                    style={{ background: "color-mix(in oklab, var(--blush), white 15%)" }}
                  >
                    <Icon className="h-5 w-5" strokeWidth={1.9} style={{ color: accent }} />
                  </span>
                  <p className="mt-2 text-[15px] font-black text-magenta leading-tight">{n.name}</p>
                  <p className="mt-1 text-[11.5px] leading-snug text-rose/70">{n.why}</p>
                </Card>
              );
            })}
          </div>
        </section>

        {/* ── Where to Find These Nutrients + Hormones × Nutrition ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <section>
            <SectionTitle Icon={Utensils} title="Where to Find These Nutrients" />
            <Card className="divide-y divide-petal/50 overflow-hidden">
              {content.nutrients.map((n, i) => {
                const Icon = NUTRIENT_ICON[n.icon];
                return (
                  <div
                    key={n.name}
                    className="flex items-center gap-3 p-3.5 animate-fade-in"
                    style={{ animationDelay: `${i * 70}ms` }}
                  >
                    <span
                      className="grid h-9 w-9 shrink-0 place-items-center rounded-xl"
                      style={{ background: "color-mix(in oklab, var(--blush), white 15%)" }}
                    >
                      <Icon className="h-4.5 w-4.5" strokeWidth={1.9} style={{ color: accent }} />
                    </span>
                    <div className="min-w-0">
                      <p className="text-[13px] font-black text-magenta leading-none">{n.name}</p>
                      <div className="mt-1.5 flex flex-wrap gap-1">
                        {n.sources.map((f) => (
                          <span
                            key={f}
                            className="rounded-full bg-blush/70 border border-petal/50 px-2 py-0.5 text-[10.5px] font-semibold text-magenta"
                          >
                            {f}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })}
            </Card>
          </section>

          <section>
            <SectionTitle Icon={HeartPulse} title="Hormones × Nutrition = Benefits" />
            <div className="space-y-3">
              <Card className="p-4">
                <p
                  className="inline-flex items-center gap-1.5 text-[12px] font-black uppercase tracking-wide"
                  style={{ color: accent }}
                >
                  <Sparkles className="h-3.5 w-3.5" strokeWidth={2} /> {content.hormoneTitle}
                </p>
                <p className="mt-1.5 text-[12.5px] leading-snug text-[#831843]">
                  {content.hormoneNote}
                </p>
              </Card>
              <Card className="p-4" delay={70}>
                <p className="text-[12px] font-black uppercase tracking-wide text-hotpink">
                  Nutrition Focus
                </p>
                <ul className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                  {content.nutritionFocus.map((f) => (
                    <li
                      key={f}
                      className="flex items-center gap-1.5 text-[12px] font-semibold text-rose/80"
                    >
                      <span className="h-1.5 w-1.5 rounded-full" style={{ background: accent }} />{" "}
                      {f}
                    </li>
                  ))}
                </ul>
              </Card>
              <Card className="p-4" delay={140}>
                <p className="text-[12px] font-black uppercase tracking-wide text-hotpink">
                  Expected Benefits
                </p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {content.benefits.map((b) => (
                    <span
                      key={b}
                      className="inline-flex items-center gap-1 rounded-full bg-blush/60 border border-petal/50 px-2.5 py-1 text-[11.5px] font-bold text-magenta"
                    >
                      <Check className="h-3 w-3" strokeWidth={3} style={{ color: accent }} /> {b}
                    </span>
                  ))}
                </div>
              </Card>
            </div>
          </section>
        </div>

        {/* ── Today's Bloom Plate + Bloom Coach Suggests ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <section>
            <SectionTitle Icon={Salad} title="Today's Bloom Plate" sub={content.plate.note} />
            <Card className="p-4 sm:p-5">
              <BloomPlate plate={content.plate} />
            </Card>
          </section>

          <section>
            <SectionTitle
              Icon={Sparkles}
              title="Bloom Coach Suggests"
              sub="a phase-perfect meal to nourish you"
            />
            {hero ? (
              <Card className="overflow-hidden p-3 hover:shadow-xl hover:shadow-hotpink/15 transition">
                <div className="flex gap-3">
                  <img
                    src={recipeImageSrc(hero)}
                    alt={hero.name}
                    loading="lazy"
                    className="h-24 w-24 shrink-0 rounded-2xl object-cover border border-petal/60 bg-blush"
                    onError={(e) => {
                      const el = e.currentTarget as HTMLImageElement;
                      if (!el.src.endsWith("/images/meal-buddha.webp"))
                        el.src = "/images/meal-buddha.webp";
                    }}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-hotpink/70">
                      Nourish to flourish
                    </p>
                    <p className="mt-0.5 text-[15px] font-black text-magenta leading-tight line-clamp-2">
                      {hero.name}
                    </p>
                    <p className="mt-1 text-[11.5px] leading-snug text-rose/70">
                      {hero.macros.calories} kcal · {hero.macros.protein}g protein — built to fuel
                      your {content.label.toLowerCase()} phase.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => onOpenRecipe(hero.id)}
                  className="mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded-full bg-gradient-to-r from-hotpink to-magenta px-4 py-2.5 text-[13px] font-bold text-white shadow-md shadow-hotpink/25 transition hover:brightness-105 active:scale-95 animate-selected-glow"
                >
                  View Full Recipe <ArrowRight className="h-4 w-4" strokeWidth={2.5} />
                </button>
              </Card>
            ) : (
              <Card className="p-5 text-center text-[13px] text-rose/60">
                A phase-perfect meal is on its way ✿
              </Card>
            )}
          </section>
        </div>

        {/* ── Foods to Limit Today ── */}
        <section key={`l-${selected}`}>
          <SectionTitle
            Icon={Flame}
            title="Foods to Limit Today"
            sub="ease up on these to feel your best this phase"
          />
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {content.limit.map((t, i) => {
              const Icon = TIP_ICON[t.icon] ?? Flame;
              return (
                <Card key={t.title} className="p-3.5 hover-scale" delay={i * 70}>
                  <span className="grid h-9 w-9 place-items-center rounded-xl bg-rose/10">
                    <Icon className="h-4.5 w-4.5 text-rose/70" strokeWidth={1.9} />
                  </span>
                  <p className="mt-2 text-[13.5px] font-black text-magenta leading-tight">
                    {t.title}
                  </p>
                  <p className="mt-1 text-[11px] leading-snug text-rose/60">{t.note}</p>
                </Card>
              );
            })}
          </div>
        </section>

        {/* ── Did You Know · Pair With Movement · Lifestyle Tips ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Did you know */}
          <Card className="relative overflow-hidden p-4 sm:p-5 bg-gradient-to-br from-blush/70 via-white to-petal/30">
            <p className="inline-flex items-center gap-1.5 font-script text-2xl text-hotpink leading-none">
              <Sparkles className="h-4 w-4" strokeWidth={2} /> Did You Know?
            </p>
            <p className="mt-2.5 text-[13px] leading-relaxed text-[#831843]">
              {content.didYouKnow}
            </p>
          </Card>

          {/* Pair with movement */}
          <Card className="p-4 sm:p-5" delay={70}>
            <p className="inline-flex items-center gap-1.5 font-script text-2xl text-hotpink leading-none">
              <Activity className="h-4 w-4" strokeWidth={2} /> Pair With Movement
            </p>
            <p className="mt-0.5 text-[11px] font-semibold text-rose/55">
              move in a way that matches your energy
            </p>
            <ul className="mt-3 space-y-2.5">
              {content.movement.map((m) => {
                const Icon = TIP_ICON[m.icon] ?? Flower2;
                return (
                  <li key={m.title} className="flex items-center gap-2.5">
                    <span
                      className="grid h-8 w-8 shrink-0 place-items-center rounded-xl"
                      style={{ background: "color-mix(in oklab, var(--blush), white 15%)" }}
                    >
                      <Icon className="h-4 w-4" strokeWidth={1.9} style={{ color: accent }} />
                    </span>
                    <div className="min-w-0">
                      <p className="text-[13px] font-black text-magenta leading-none">{m.title}</p>
                      <p className="mt-0.5 text-[11px] text-rose/60 leading-snug">{m.note}</p>
                    </div>
                  </li>
                );
              })}
            </ul>
          </Card>

          {/* Lifestyle tips */}
          <Card className="p-4 sm:p-5" delay={140}>
            <p className="inline-flex items-center gap-1.5 font-script text-2xl text-hotpink leading-none">
              <Flower2 className="h-4 w-4" strokeWidth={2} /> Bloom Lifestyle Tips
            </p>
            <ul className="mt-3 space-y-2.5">
              {content.lifestyle.map((t) => {
                const Icon = TIP_ICON[t.icon] ?? Sun;
                return (
                  <li key={t.title} className="flex items-start gap-2.5">
                    <span
                      className="grid h-8 w-8 shrink-0 place-items-center rounded-xl"
                      style={{ background: "color-mix(in oklab, var(--blush), white 15%)" }}
                    >
                      <Icon className="h-4 w-4" strokeWidth={1.9} style={{ color: accent }} />
                    </span>
                    <div className="min-w-0">
                      <p className="text-[13px] font-black text-magenta leading-tight">{t.title}</p>
                      <p className="mt-0.5 text-[11px] text-rose/60 leading-snug">{t.note}</p>
                    </div>
                  </li>
                );
              })}
            </ul>
          </Card>
        </div>

        {/* ── Closing quote ── */}
        <div className="relative overflow-hidden rounded-[1.5rem] border border-hotpink/25 bg-gradient-to-br from-blush/70 via-white to-petal/40 p-6 text-center animate-card-breathe">
          <p className="font-script text-xl sm:text-2xl text-hotpink leading-snug">
            “When you nourish your body according to your cycle, you don't just feel better — you
            bloom effortlessly.”
          </p>
        </div>
      </div>
    </div>
  );
}
