import { useMemo, useState } from "react";
import { ArrowRight, ChevronLeft, ChevronRight, Sparkles } from "lucide-react";
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

const PHASE_CELL: Record<Phase, string> = {
  period: "bg-rose-400/75 text-white",
  follicular: "bg-amber-200/70 text-amber-900",
  fertile: "bg-emerald-300/70 text-emerald-900",
  ovulation: "bg-violet-300/75 text-violet-900",
  luteal: "bg-sky-200/70 text-sky-900",
};

const PHASE_DOT: Record<Phase, string> = {
  period: "bg-rose-400",
  follicular: "bg-amber-300",
  fertile: "bg-emerald-300",
  ovulation: "bg-violet-300",
  luteal: "bg-sky-300",
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
  budget: { title: "Budget Planner", text: "See exactly where your money goes, set sweet little savings goals, and stay on top of spending." },
  meals: { title: "Meal Planner", text: "Recipes and meal plans that adapt to your cycle, your cravings, and your goals." },
};

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
  const [periodDateInput, setPeriodDateInput] = useState("");
  const [cycleLengthInput, setCycleLengthInput] = useState("28");

  const viewDate = new Date(today.getFullYear(), today.getMonth() + monthOffset, 1);
  const cells = useMemo(() => buildMonthGrid(viewDate.getFullYear(), viewDate.getMonth()), [viewDate]);
  const monthLabel = viewDate.toLocaleDateString("en-US", { month: "long", year: "numeric" });

  const previewSettings = cycleSettings ?? DEFAULT_CYCLE_SETTINGS;
  const previewPhase = phaseForDay(today, previewSettings);

  const isToday = (d: Date) =>
    d.getFullYear() === today.getFullYear() && d.getMonth() === today.getMonth() && d.getDate() === today.getDate();

  const handleToggle = (slug: string) => setActiveTool((prev) => (prev === slug ? null : slug));

  const handleCycleApply = () => {
    if (!periodDateInput) return;
    const len = Math.max(20, Math.min(40, Number(cycleLengthInput) || 28));
    setCycleSettings({
      ...DEFAULT_CYCLE_SETTINGS,
      lastPeriodStart: new Date(periodDateInput),
      cycleLength: len,
    });
  };

  return (
    <div className="mx-auto w-full max-w-4xl">
      <div className="pearl-frame relative overflow-hidden rounded-[1.75rem] border-none p-3 sm:rounded-[2.5rem] sm:p-5" style={{ background: "oklch(1 0 0 / 0.16)", backdropFilter: "blur(6px)" }}>
        <div className="flex flex-col gap-3 sm:flex-row sm:gap-5">
          {/* Calendar card */}
          <div className="pearl-frame relative flex-1 rounded-2xl border-none bg-white/55 p-3 backdrop-blur-md sm:rounded-3xl sm:p-5">
            <div className="relative z-10 mb-3 flex items-center justify-between">
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

            <div className="relative z-10 grid grid-cols-7 gap-1 text-center text-[9px] font-bold text-magenta/60 sm:text-xs">
              {WEEKDAYS.map((d) => (
                <div key={d} className="py-1">{d}</div>
              ))}
              {cells.map((date, i) => {
                if (!date) return <div key={i} />;
                const phase = activeTool === "cycle" ? phaseForDay(date, previewSettings) : null;
                const colorClass = phase ? PHASE_CELL[phase] : "bg-white/40 text-magenta";
                return (
                  <div
                    key={i}
                    className={`flex aspect-square items-center justify-center rounded-lg text-[10px] font-bold transition-colors duration-500 sm:text-sm ${colorClass} ${isToday(date) ? "ring-2 ring-hotpink" : ""}`}
                  >
                    {date.getDate()}
                  </div>
                );
              })}
            </div>

            {activeTool === "cycle" && cycleSettings && (
              <div className="relative z-10 mt-3 flex flex-wrap items-center justify-center gap-2 sm:gap-3">
                {(Object.keys(PHASE_LABEL_SHORT) as Phase[]).map((p) => (
                  <span key={p} className="flex items-center gap-1 text-[9px] font-bold text-magenta/70 sm:text-[11px]">
                    <span className={`h-2 w-2 rounded-full ${PHASE_DOT[p]}`} aria-hidden />
                    {PHASE_LABEL_SHORT[p]}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="relative">
            <div className="flex shrink-0 flex-row gap-2 overflow-x-auto pb-1 sm:flex-col sm:gap-3 sm:overflow-visible sm:pb-0">
              {SIDEBAR_TOOLS.map((tool) => (
                <button
                  key={tool.slug}
                  type="button"
                  onClick={() => handleToggle(tool.slug)}
                  className={`group flex shrink-0 flex-col items-center gap-1 rounded-2xl px-2.5 py-2 transition-all duration-300 sm:px-3 ${activeTool === tool.slug ? "bg-white/60 shadow-md scale-105" : "bg-white/30 hover:bg-white/45"}`}
                >
                  <span className="relative grid h-9 w-9 place-items-center rounded-full text-white shadow-md sm:h-11 sm:w-11" style={{ background: "radial-gradient(circle at 30% 25%, oklch(0.82 0.22 350 / 0.95), oklch(0.7 0.26 350) 45%, oklch(0.58 0.28 0) 90%)" }}>
                    <CuteToolIcon slug={tool.slug} className="relative z-10 h-5 w-5 sm:h-6 sm:w-6" />
                  </span>
                  <span className="whitespace-nowrap text-[9px] font-bold text-rose sm:text-[11px]">{tool.label}</span>
                </button>
              ))}
            </div>
            {/* fade hint signalling the sidebar row scrolls horizontally on phones */}
            <div className="pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-petal/40 to-transparent sm:hidden" aria-hidden />
          </div>
        </div>

        {/* Reserved preview slot — swaps content per active tool without overlapping the calendar */}
        <div className="relative z-10 mt-3 min-h-[3rem] sm:mt-4">
          {!activeTool && (
            <p className="animate-fade-in flex items-center justify-center gap-1.5 rounded-2xl bg-white/40 px-3 py-2.5 text-center text-xs font-semibold text-magenta/70 backdrop-blur-md sm:text-sm">
              <Sparkles className="h-3.5 w-3.5 text-hotpink" aria-hidden />
              Tap a tool to see your Bloom Calendar light up
            </p>
          )}

          {activeTool === "cycle" && !cycleSettings && (
            <div className="animate-fade-in flex flex-col items-center gap-2 rounded-2xl bg-white/85 px-3 py-3 text-center shadow-lg backdrop-blur-md sm:flex-row sm:justify-center sm:gap-3">
              <p className="text-xs font-bold text-[#831843] sm:text-sm">When did your last period start?</p>
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={periodDateInput}
                  onChange={(e) => setPeriodDateInput(e.target.value)}
                  className="rounded-full border border-petal/60 bg-white px-2.5 py-1 text-xs font-semibold text-[#831843] outline-none"
                />
                <input
                  type="number"
                  min={20}
                  max={40}
                  value={cycleLengthInput}
                  onChange={(e) => setCycleLengthInput(e.target.value)}
                  className="w-14 rounded-full border border-petal/60 bg-white px-2.5 py-1 text-xs font-semibold text-[#831843] outline-none"
                  aria-label="Cycle length in days"
                />
                <button
                  type="button"
                  onClick={handleCycleApply}
                  disabled={!periodDateInput}
                  className="rounded-full bg-hotpink px-3 py-1 text-xs font-bold text-white shadow-md disabled:opacity-40"
                >
                  Apply
                </button>
              </div>
            </div>
          )}

          {activeTool === "cycle" && cycleSettings && (
            <div className="animate-fade-in flex flex-col items-center gap-2 rounded-2xl bg-white/85 px-3 py-2.5 text-center shadow-lg backdrop-blur-md sm:flex-row sm:justify-between sm:gap-3">
              <p className="text-xs font-bold text-[#831843] sm:text-sm">
                Your Bloom Calendar just colored itself — today is your <span className="text-hotpink">{PHASE_LABEL_SHORT[phaseForDay(today, cycleSettings)]}</span> phase.
              </p>
              <DiscoverButton href="/app/tools/cycle" />
            </div>
          )}

          {activeTool === "yoga" && (
            <YogaPreview phase={previewPhase} />
          )}

          {activeTool === "workout" && (
            <WorkoutPreview phase={previewPhase} />
          )}

          {activeTool && TEASERS[activeTool] && (
            <TeaserPreview slug={activeTool} href={SIDEBAR_TOOLS.find((t) => t.slug === activeTool)!.href} />
          )}
        </div>
      </div>
    </div>
  );
}

function DiscoverButton({ href }: { href: string }) {
  return (
    <a
      href={href}
      className="hover-scale inline-flex shrink-0 items-center justify-center gap-1.5 rounded-full bg-hotpink px-4 py-1.5 text-xs font-bold text-white shadow-md sm:text-sm"
    >
      Discover more
      <ArrowRight className="h-3.5 w-3.5" />
    </a>
  );
}

function YogaPreview({ phase }: { phase: Phase }) {
  const data = PHASE_YOGA[phase];
  return (
    <div className="animate-fade-in flex flex-col items-center gap-3 rounded-2xl bg-white/85 p-3 shadow-lg backdrop-blur-md sm:flex-row sm:gap-4">
      <div className="flex shrink-0 gap-2">
        {data.poses.map((slug) => (
          <img key={slug} src={`/images/${slug}.webp`} alt="" loading="lazy" className="h-16 w-16 rounded-xl object-cover shadow-sm sm:h-20 sm:w-20" />
        ))}
      </div>
      <div className="flex flex-1 flex-col items-center gap-1 text-center sm:items-start sm:text-left">
        <p className="text-xs font-bold text-hotpink sm:text-sm">{data.title}</p>
        <p className="text-[11px] font-medium text-magenta/70 sm:text-xs">{data.blurb}</p>
      </div>
      <DiscoverButton href="/app/tools/yoga" />
    </div>
  );
}

function WorkoutPreview({ phase }: { phase: Phase }) {
  const data = PHASE_WORKOUT[phase];
  return (
    <div className="animate-fade-in flex flex-col items-center gap-3 rounded-2xl bg-white/85 p-3 shadow-lg backdrop-blur-md sm:flex-row sm:gap-4">
      <img src={`/images/${data.zone}.png`} alt="" loading="lazy" className="h-16 w-28 shrink-0 rounded-xl object-cover shadow-sm sm:h-20 sm:w-32" />
      <div className="flex flex-1 flex-col items-center gap-1 text-center sm:items-start sm:text-left">
        <p className="text-xs font-bold text-hotpink sm:text-sm">{data.title}</p>
        <p className="text-[11px] font-medium text-magenta/70 sm:text-xs">{data.blurb}</p>
      </div>
      <DiscoverButton href="/app/tools/workout" />
    </div>
  );
}

function TeaserPreview({ slug, href }: { slug: string; href: string }) {
  const data = TEASERS[slug];
  return (
    <div className="animate-fade-in flex flex-col items-center gap-3 rounded-2xl bg-white/85 p-3 text-center shadow-lg backdrop-blur-md sm:flex-row sm:justify-between sm:text-left">
      <div>
        <p className="text-xs font-bold text-hotpink sm:text-sm">{data.title}</p>
        <p className="text-[11px] font-medium text-magenta/70 sm:text-xs">{data.text}</p>
      </div>
      <DiscoverButton href={href} />
    </div>
  );
}
