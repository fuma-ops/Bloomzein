import { useMemo, useState } from "react";
import { ArrowRight, ChevronLeft, ChevronRight, Sparkles, Droplet, Sprout, Flower2, Star, Moon, type LucideIcon } from "lucide-react";
import { CuteToolIcon } from "./CuteToolIcon";
import { DEFAULT_CYCLE_SETTINGS, phaseForDay, type CyclePhase } from "./cyclePhase";
import type { CycleSettings } from "./PeriodSetup";

type Phase = Exclude<CyclePhase, "any">;

interface SidebarTool {
  slug: string;
  label: string;
  href: string;
}

const SIDEBAR_TOOLS: SidebarTool[] = [
  { slug: "cycle", label: "Cycle", href: "/app/tools/cycle" },
  { slug: "yoga", label: "Yoga", href: "/app/tools/yoga" },
  { slug: "workout", label: "Workout", href: "/app/tools/workout" },
  { slug: "diary", label: "Journal", href: "/app/tools/diary" },
  { slug: "notes", label: "Reminders", href: "/app/tools/notes" },
  { slug: "budget", label: "Budget", href: "/app/tools/budget" },
  { slug: "meals", label: "Meals", href: "/app/tools/meals" },
];

// Same pink/rose/magenta palette + icons as the real Cycle tracker (CycleTracker.tsx PHASE_META) — no extra hues, softened for the calendar grid.
const PHASE_CELL: Record<Phase, string> = {
  period: "bg-hotpink/55 text-[#831843]",
  follicular: "bg-petal/60 text-rose",
  fertile: "bg-pink-100 text-hotpink",
  ovulation: "bg-rose-200/70 text-magenta",
  luteal: "bg-blush text-magenta/70",
};

const PHASE_DOT: Record<Phase, string> = {
  period: "bg-hotpink",
  follicular: "bg-rose-300",
  fertile: "bg-pink-300",
  ovulation: "bg-rose-500",
  luteal: "bg-pink-200",
};

const PHASE_ICON: Record<Phase, LucideIcon> = {
  period: Droplet,
  follicular: Sprout,
  fertile: Flower2,
  ovulation: Star,
  luteal: Moon,
};

const PHASE_LABEL_SHORT: Record<Phase, string> = {
  period: "Period",
  follicular: "Follicular",
  fertile: "Fertile",
  ovulation: "Ovulation",
  luteal: "Luteal",
};

const PHASE_YOGA: Record<Phase, { title: string; poses: [string, string]; blurb: string }> = {
  period: { title: "Gentle Restorative Flow", poses: ["pose-childs-pose", "pose-legs-up-wall"], blurb: "Soft, grounding poses to ease cramps and restore energy." },
  follicular: { title: "Energising Morning Flow", poses: ["pose-mountain", "pose-warrior-1"], blurb: "Build strength and momentum as your energy starts to rise." },
  fertile: { title: "Power & Balance Flow", poses: ["pose-tree", "pose-half-moon"], blurb: "Channel your peak energy into balance and core work." },
  ovulation: { title: "Dynamic Flow", poses: ["pose-warrior-2", "pose-triangle"], blurb: "You're at your strongest — push a little further today." },
  luteal: { title: "Calming Wind-Down Flow", poses: ["pose-cat-cow", "pose-seated-forward-fold"], blurb: "Slow things down and soothe tension as your body prepares to rest." },
};

const PHASE_WORKOUT: Record<Phase, { title: string; zone: string; blurb: string }> = {
  period: { title: "Light Mobility & Core", zone: "zone-core", blurb: "Easy movement to relieve bloating and tension." },
  follicular: { title: "Full-Body Strength", zone: "zone-full-body", blurb: "Your energy is climbing — a great time to build strength." },
  fertile: { title: "Glutes & Legs Burn", zone: "zone-glutes", blurb: "Peak energy days are perfect for a strong leg day." },
  ovulation: { title: "High-Intensity Session", zone: "zone-arms", blurb: "Push your hardest — your body is primed for it." },
  luteal: { title: "Gentle Toning", zone: "zone-back", blurb: "Lower-impact toning to match your slowing energy." },
};

const TEASERS: Record<string, { title: string; text: string }> = {
  diary: { title: "Dreamy Diary", text: "A cosy place to write down your day, your feelings, and the little wins worth remembering." },
  notes: { title: "Reminders", text: "Never miss a date night, appointment, or anniversary — Bloomzein keeps gentle nudges on track." },
};

const MEAL_PREVIEWS: { src: string; label: string }[] = [
  { src: "/images/meal-buddha.jpg", label: "Buddha Bowl" },
  { src: "/images/meal-lunchbox.jpg", label: "Cute Lunchbox" },
  { src: "/images/meal-oats.jpg", label: "Cozy Oats" },
  { src: "/images/meal-stew.jpg", label: "Warm Stew" },
];

const BUDGET_SEGMENTS = [
  { label: "Self-care", value: 34, color: "var(--hotpink)" },
  { label: "Food", value: 26, color: "var(--rose)" },
  { label: "Wellness", value: 22, color: "var(--petal)" },
  { label: "Savings", value: 18, color: "var(--blush)" },
];

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function buildMonthGrid(year: number, month: number): (Date | null)[] {
  const first = new Date(year, month, 1);
  const startOffset = (first.getDay() + 6) % 7; // Monday = 0
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (Date | null)[] = [];
  for (let i = 0; i < startOffset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

export function ToolboxPreview() {
  const today = useMemo(() => new Date(), []);
  const [monthOffset, setMonthOffset] = useState(0);
  const [activeTool, setActiveTool] = useState<string | null>(null);
  const [cycleSettings, setCycleSettings] = useState<CycleSettings | null>(null);
  const [periodDate, setPeriodDate] = useState<Date | null>(null);
  const [cycleLengthInput, setCycleLengthInput] = useState("28");
  const [pickerOpen, setPickerOpen] = useState(false);

  const viewDate = new Date(today.getFullYear(), today.getMonth() + monthOffset, 1);
  const cells = useMemo(() => buildMonthGrid(viewDate.getFullYear(), viewDate.getMonth()), [viewDate]);
  const monthLabel = viewDate.toLocaleDateString("en-US", { month: "long", year: "numeric" });

  const previewSettings = cycleSettings ?? DEFAULT_CYCLE_SETTINGS;
  const previewPhase = phaseForDay(today, previewSettings);

  const isToday = (d: Date) =>
    d.getFullYear() === today.getFullYear() && d.getMonth() === today.getMonth() && d.getDate() === today.getDate();

  const handleToggle = (slug: string) => {
    setActiveTool((prev) => (prev === slug ? null : slug));
    setPickerOpen(false);
  };

  const handleCycleApply = () => {
    if (!periodDate) return;
    const len = Math.max(20, Math.min(40, Number(cycleLengthInput) || 28));
    setCycleSettings({
      ...DEFAULT_CYCLE_SETTINGS,
      lastPeriodStart: periodDate,
      cycleLength: len,
    });
  };

  // The calendar stays put for "cycle" (its whole purpose is to light it up).
  // Picking any other tool swaps the calendar out for that tool's preview.
  const showCalendar = activeTool === null || activeTool === "cycle";

  return (
    <div className="mx-auto w-full max-w-4xl">
      <div className="pearl-frame relative overflow-hidden rounded-[1.75rem] border-none p-3 sm:rounded-[2.5rem] sm:p-5" style={{ background: "oklch(1 0 0 / 0.16)", backdropFilter: "blur(6px)" }}>
        {/* Sidebar above the content on phones (wrapping, centered), to its right on larger screens */}
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:gap-5">
          {/* Main content — either the calendar, or the active tool's feature preview */}
          <div className="pearl-frame relative flex min-h-[19rem] flex-1 flex-col overflow-hidden rounded-2xl border-none bg-white/55 p-3 backdrop-blur-md sm:min-h-[21rem] sm:rounded-3xl sm:p-5">
            {showCalendar ? (
              <div className="animate-fade-in relative z-10 flex flex-1 flex-col">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="font-script text-xl text-hotpink sm:text-2xl">{monthLabel}</h3>
                  <div className="flex items-center gap-1.5">
                    <button type="button" aria-label="Previous month" onClick={() => setMonthOffset((m) => m - 1)} className="grid h-7 w-7 place-items-center rounded-full bg-white/60 text-rose shadow-sm backdrop-blur-md">
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    <button type="button" aria-label="Next month" onClick={() => setMonthOffset((m) => m + 1)} className="grid h-7 w-7 place-items-center rounded-full bg-white/60 text-rose shadow-sm backdrop-blur-md">
                      <ChevronRight className="h-4 w-4" />
                    </button>
                    {monthOffset !== 0 && (
                      <button type="button" onClick={() => setMonthOffset(0)} className="rounded-full bg-white/60 px-2.5 py-1 text-[10px] font-bold text-rose shadow-sm backdrop-blur-md sm:text-xs">
                        Today
                      </button>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-7 gap-1 text-center text-[9px] font-bold text-magenta/60 sm:text-xs">
                  {WEEKDAYS.map((d) => (
                    <div key={d} className="py-1">{d}</div>
                  ))}
                  {cells.map((date, i) => {
                    if (!date) return <div key={i} />;
                    const phase = activeTool === "cycle" ? phaseForDay(date, previewSettings) : null;
                    const colorClass = phase ? PHASE_CELL[phase] : "bg-white/40 text-magenta";
                    const PhaseIcon = phase ? PHASE_ICON[phase] : null;
                    return (
                      <div
                        key={i}
                        className={`relative flex aspect-square flex-col items-center justify-center gap-0.5 rounded-lg text-[10px] font-bold transition-all duration-500 sm:text-sm ${colorClass} ${isToday(date) ? "shadow-[0_0_0_2px_oklch(1_0_0/0.9),0_2px_8px_-1px_oklch(0.62_0.24_0/0.45)]" : ""}`}
                      >
                        {PhaseIcon && <PhaseIcon className="absolute right-0.5 top-0.5 h-2 w-2 opacity-60 sm:h-2.5 sm:w-2.5" aria-hidden />}
                        {date.getDate()}
                      </div>
                    );
                  })}
                </div>

                {activeTool === "cycle" && cycleSettings && (
                  <div className="mt-3 flex flex-wrap items-center justify-center gap-2 sm:gap-3">
                    {(Object.keys(PHASE_LABEL_SHORT) as Phase[]).map((p) => {
                      const Icon = PHASE_ICON[p];
                      return (
                        <span key={p} className="flex items-center gap-1 text-[9px] font-bold text-magenta/70 sm:text-[11px]">
                          <span className={`grid h-4 w-4 place-items-center rounded-full ${PHASE_DOT[p]}`} aria-hidden>
                            <Icon className="h-2.5 w-2.5 text-white" />
                          </span>
                          {PHASE_LABEL_SHORT[p]}
                        </span>
                      );
                    })}
                  </div>
                )}

                <div className="mt-3 flex-1">
                  {!activeTool && (
                    <p className="flex items-center justify-center gap-1.5 rounded-2xl bg-white/40 px-3 py-2.5 text-center text-xs font-semibold text-magenta/70 backdrop-blur-md sm:text-sm">
                      <Sparkles className="h-3.5 w-3.5 text-hotpink" aria-hidden />
                      Tap a tool to see your Bloom Calendar light up
                    </p>
                  )}

                  {activeTool === "cycle" && cycleSettings && (
                    <div className="flex flex-col items-center gap-2 rounded-2xl bg-white/85 px-3 py-2.5 text-center shadow-lg backdrop-blur-md sm:flex-row sm:justify-between sm:gap-3">
                      <p className="text-xs font-bold text-[#831843] sm:text-sm">
                        Your Bloom Calendar just colored itself — today is your <span className="text-hotpink">{PHASE_LABEL_SHORT[phaseForDay(today, cycleSettings)]}</span> phase.
                      </p>
                      <DiscoverButton href="/app/tools/cycle" />
                    </div>
                  )}
                </div>
              </div>
            ) : activeTool === "yoga" ? (
              <YogaPreview phase={previewPhase} />
            ) : activeTool === "workout" ? (
              <WorkoutPreview phase={previewPhase} />
            ) : activeTool === "meals" ? (
              <MealsPreview />
            ) : activeTool === "budget" ? (
              <BudgetPreview />
            ) : (
              <TeaserPreview slug={activeTool!} href={SIDEBAR_TOOLS.find((t) => t.slug === activeTool)!.href} />
            )}
          </div>

          {/* Sidebar */}
          <div className="flex shrink-0 flex-row flex-wrap justify-center gap-2 sm:flex-col sm:flex-nowrap sm:justify-center sm:gap-3">
            {SIDEBAR_TOOLS.map((tool, i) => (
              <div key={tool.slug} className="relative">
                <button
                  type="button"
                  onClick={() => handleToggle(tool.slug)}
                  className={`group flex shrink-0 flex-col items-center gap-1 rounded-2xl px-2.5 py-2 transition-all duration-300 sm:px-3 ${activeTool === tool.slug ? "bg-white/60 shadow-md scale-105" : "bg-white/30 hover:bg-white/45"}`}
                >
                  <span
                    className="animate-icon-wiggle relative grid h-9 w-9 place-items-center rounded-full text-white shadow-md sm:h-11 sm:w-11"
                    style={{ background: "radial-gradient(circle at 30% 25%, oklch(0.82 0.22 350 / 0.95), oklch(0.7 0.26 350) 45%, oklch(0.58 0.28 0) 90%)", animationDelay: `${i * 220}ms` }}
                  >
                    <CuteToolIcon slug={tool.slug} className="relative z-10 h-5 w-5 sm:h-6 sm:w-6" />
                  </span>
                  <span className="whitespace-nowrap text-[9px] font-bold text-rose sm:text-[11px]">{tool.label}</span>
                </button>

                {/* Date-setup guide pops up directly under the Cycle icon */}
                {tool.slug === "cycle" && activeTool === "cycle" && !cycleSettings && (
                  <div className="pearl-frame animate-bloom-bounce absolute left-0 top-full z-30 mt-2 w-60 rounded-2xl border-none bg-white/90 sm:left-auto sm:right-0 p-3 text-center shadow-xl backdrop-blur-md">
                    <p className="flex items-center justify-center gap-1 text-[11px] font-bold text-[#831843] sm:text-xs">
                      <Sparkles className="animate-icon-wiggle h-3.5 w-3.5 text-hotpink" aria-hidden />
                      When did your last period start?
                    </p>
                    <div className="relative mt-2 flex items-center justify-center gap-2">
                      <button
                        type="button"
                        onClick={() => setPickerOpen((o) => !o)}
                        className="rounded-full border border-petal/60 bg-white px-3 py-1 text-xs font-semibold text-[#831843] shadow-sm"
                      >
                        {periodDate ? periodDate.toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" }) : "Pick a date"}
                      </button>
                      <input
                        type="number"
                        min={20}
                        max={40}
                        value={cycleLengthInput}
                        onChange={(e) => setCycleLengthInput(e.target.value)}
                        className="w-12 rounded-full border border-petal/60 bg-white px-2 py-1 text-xs font-semibold text-[#831843] outline-none"
                        aria-label="Cycle length in days"
                      />
                      {pickerOpen && (
                        <DatePickerPopover
                          value={periodDate}
                          onSelect={(d) => setPeriodDate(d)}
                          onClose={() => setPickerOpen(false)}
                        />
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={handleCycleApply}
                      disabled={!periodDate}
                      className="mt-2 rounded-full bg-hotpink px-4 py-1 text-xs font-bold text-white shadow-md disabled:opacity-40"
                    >
                      Apply
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function DatePickerPopover({ value, onSelect, onClose }: { value: Date | null; onSelect: (d: Date) => void; onClose: () => void }) {
  const base = value ?? new Date();
  const [viewYear, setViewYear] = useState(base.getFullYear());
  const [viewMonth, setViewMonth] = useState(base.getMonth());
  const cells = useMemo(() => buildMonthGrid(viewYear, viewMonth), [viewYear, viewMonth]);
  const monthLabel = new Date(viewYear, viewMonth, 1).toLocaleDateString("en-US", { month: "long", year: "numeric" });

  const shift = (delta: number) => {
    const d = new Date(viewYear, viewMonth + delta, 1);
    setViewYear(d.getFullYear());
    setViewMonth(d.getMonth());
  };

  return (
    <div className="pearl-frame animate-bloom-bounce absolute left-0 top-full z-40 mt-2 w-60 rounded-2xl border-none bg-white/95 sm:left-auto sm:right-0 p-3 shadow-xl backdrop-blur-md">
      <div className="mb-2 flex items-center justify-between">
        <button type="button" aria-label="Previous month" onClick={() => shift(-1)} className="grid h-6 w-6 place-items-center rounded-full bg-blush text-hotpink">
          <ChevronLeft className="h-3.5 w-3.5" />
        </button>
        <p className="text-xs font-bold text-hotpink">{monthLabel}</p>
        <button type="button" aria-label="Next month" onClick={() => shift(1)} className="grid h-6 w-6 place-items-center rounded-full bg-blush text-hotpink">
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-[9px] font-bold text-magenta/60">
        {WEEKDAYS.map((d) => (
          <div key={d} className="py-0.5">{d[0]}</div>
        ))}
        {cells.map((date, i) => {
          if (!date) return <div key={i} />;
          const selected = value ? date.toDateString() === value.toDateString() : false;
          return (
            <button
              key={i}
              type="button"
              onClick={() => {
                onSelect(date);
                onClose();
              }}
              className={`aspect-square rounded-full text-[10px] font-bold transition-all duration-200 hover:scale-110 ${selected ? "animate-bloom-pulse bg-hotpink text-white" : "bg-petal/40 text-magenta hover:bg-petal"}`}
            >
              {date.getDate()}
            </button>
          );
        })}
      </div>
      <p className="mt-2 flex items-center justify-center gap-1 text-[10px] font-semibold text-magenta/60">
        <Sparkles className="animate-icon-wiggle h-3 w-3 text-hotpink" aria-hidden />
        Tap the day your last period began
      </p>
    </div>
  );
}

function DiscoverButton({ href, className = "" }: { href: string; className?: string }) {
  return (
    <a
      href={href}
      className={`hover-scale animate-cta-bounce inline-flex shrink-0 items-center justify-center gap-1.5 rounded-full bg-hotpink px-4 py-1.5 text-xs font-bold text-white shadow-md sm:text-sm ${className}`}
    >
      Discover more
      <ArrowRight className="animate-arrow-nudge h-3.5 w-3.5" />
    </a>
  );
}

function YogaPreview({ phase }: { phase: Phase }) {
  const data = PHASE_YOGA[phase];
  return (
    <div className="animate-fade-in flex flex-1 flex-col items-center justify-center gap-3 text-center sm:flex-row sm:gap-6 sm:text-left">
      <div className="flex shrink-0 gap-3">
        {data.poses.map((slug) => (
          <img key={slug} src={`/images/${slug}.webp`} alt="" loading="lazy" className="h-24 w-24 rounded-2xl object-cover shadow-md sm:h-32 sm:w-32" />
        ))}
      </div>
      <div className="flex flex-col items-center gap-2 sm:items-start">
        <p className="text-sm font-bold text-hotpink sm:text-lg">{data.title}</p>
        <p className="max-w-xs text-xs font-medium text-magenta/70 sm:text-sm">{data.blurb}</p>
        <DiscoverButton href="/app/tools/yoga" />
      </div>
    </div>
  );
}

function WorkoutPreview({ phase }: { phase: Phase }) {
  const data = PHASE_WORKOUT[phase];
  return (
    <div className="animate-fade-in flex flex-1 flex-col items-center justify-center gap-3 text-center sm:flex-row sm:gap-6 sm:text-left">
      <img src={`/images/${data.zone}.png`} alt="" loading="lazy" className="h-28 w-44 shrink-0 rounded-2xl object-cover shadow-md sm:h-36 sm:w-56" />
      <div className="flex flex-col items-center gap-2 sm:items-start">
        <p className="text-sm font-bold text-hotpink sm:text-lg">{data.title}</p>
        <p className="max-w-xs text-xs font-medium text-magenta/70 sm:text-sm">{data.blurb}</p>
        <DiscoverButton href="/app/tools/workout" />
      </div>
    </div>
  );
}

function MealsPreview() {
  return (
    <div className="animate-fade-in flex flex-1 flex-col items-center justify-center gap-3 text-center">
      <div className="grid grid-cols-4 gap-2 sm:gap-3">
        {MEAL_PREVIEWS.map((meal) => (
          <div key={meal.src} className="flex flex-col items-center gap-1">
            <img src={meal.src} alt="" loading="lazy" className="h-14 w-14 rounded-2xl object-cover shadow-md sm:h-20 sm:w-20" />
            <span className="text-[9px] font-bold text-magenta/70 sm:text-[11px]">{meal.label}</span>
          </div>
        ))}
      </div>
      <p className="text-sm font-bold text-hotpink sm:text-lg">Meal Planner</p>
      <p className="max-w-sm text-xs font-medium text-magenta/70 sm:text-sm">Recipes and meal plans that adapt to your cycle, your cravings, and your goals.</p>
      <DiscoverButton href="/app/tools/meals" />
    </div>
  );
}

function BudgetPreview() {
  const gradient = (() => {
    let acc = 0;
    const stops = BUDGET_SEGMENTS.map((seg) => {
      const start = acc;
      acc += seg.value;
      return `${seg.color} ${start}% ${acc}%`;
    });
    return `conic-gradient(${stops.join(", ")})`;
  })();

  return (
    <div className="animate-fade-in flex flex-1 flex-col items-center justify-center gap-3 text-center sm:flex-row sm:gap-6 sm:text-left">
      <div className="flex shrink-0 items-center gap-3">
        <div className="animate-bloom-pulse relative grid h-24 w-24 place-items-center rounded-full shadow-md sm:h-28 sm:w-28" style={{ background: gradient }}>
          <div className="grid h-12 w-12 place-items-center rounded-full bg-white/90 text-[10px] font-bold text-hotpink shadow-inner sm:h-14 sm:w-14 sm:text-xs">
            Budget
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          {BUDGET_SEGMENTS.map((seg) => (
            <span key={seg.label} className="flex items-center gap-1.5 text-[9px] font-bold text-magenta/70 sm:text-[11px]">
              <span className="h-2 w-2 rounded-full" style={{ background: seg.color }} aria-hidden />
              {seg.label}
            </span>
          ))}
        </div>
      </div>
      <div className="flex flex-col items-center gap-2 sm:items-start">
        <p className="text-sm font-bold text-hotpink sm:text-lg">Budget Planner</p>
        <p className="max-w-xs text-xs font-medium text-magenta/70 sm:text-sm">See exactly where your money goes with a cute, colorful dashboard — your spending, beautifully organized.</p>
        <DiscoverButton href="/app/tools/budget" />
      </div>
    </div>
  );
}

function TeaserPreview({ slug, href }: { slug: string; href: string }) {
  const data = TEASERS[slug];
  return (
    <div className="animate-fade-in flex flex-1 flex-col items-center justify-center gap-4 text-center">
      <span className="animate-icon-wiggle grid h-24 w-24 place-items-center rounded-full text-white shadow-md sm:h-28 sm:w-28" style={{ background: "radial-gradient(circle at 30% 25%, oklch(0.82 0.22 350 / 0.95), oklch(0.7 0.26 350) 45%, oklch(0.58 0.28 0) 90%)" }}>
        <CuteToolIcon slug={slug} className="h-14 w-14 sm:h-16 sm:w-16" />
      </span>
      <div className="flex flex-col items-center gap-1.5">
        <p className="text-sm font-bold text-hotpink sm:text-lg">{data.title}</p>
        <p className="max-w-sm text-xs font-medium text-magenta/70 sm:text-sm">{data.text}</p>
      </div>
      <DiscoverButton href={href} className="w-full max-w-xs justify-center sm:max-w-sm" />
    </div>
  );
}
