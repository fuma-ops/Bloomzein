import { useMemo, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Droplet,
  Sprout,
  Flower2,
  Moon,
  Pill,
  Plus,
  Undo2,
  Sparkles,
  Heart,
  Star,
  Leaf,
  Smile,
  Zap,
  HeartCrack,
  CloudRain,
  Flame,
  Cloud,
} from "lucide-react";
import { PeriodSetup, type CycleSettings } from "./PeriodSetup";
import { BloomBubbles } from "./BloomBubbles";
import { KawaiiBackground } from "./KawaiiBackground";

/* ---------- Default cycle settings (easy to edit) ---------- */
export const DEFAULT_SETTINGS: CycleSettings = {
  lastPeriodStart: new Date(2026, 5, 1), // Jun 1, 2026
  periodLength: 5,
  cycleLength: 28,
  trackerMode: "protection",
  contraceptiveReminder: true,
  contraceptiveMethod: "pill",
  reminderHour: "21:00",
  deviceNotifications: true,
};

export type Phase = "period" | "follicular" | "fertile" | "ovulation" | "luteal" | null;

export function phaseForDay(date: Date, s: CycleSettings): Phase {
  const ms = 1000 * 60 * 60 * 24;
  const diff = Math.floor((date.getTime() - s.lastPeriodStart.getTime()) / ms);
  const day = ((diff % s.cycleLength) + s.cycleLength) % s.cycleLength;
  const ovulationDay = s.cycleLength - 14; // luteal phase ~14 days
  if (day < s.periodLength) return "period";
  if (day === ovulationDay) return "ovulation";
  if (day >= ovulationDay - 4 && day <= ovulationDay + 2) return "fertile";
  if (day < ovulationDay) return "follicular";
  return "luteal";
}

export const PHASE_META: Record<Exclude<Phase, null>, { label: string; color: string; ring: string; Icon: any }> = {
  period:     { label: "PERIOD",     color: "bg-hotpink text-white",                ring: "ring-hotpink/40",  Icon: Droplet },
  follicular: { label: "FOLLICULAR", color: "bg-amber-100 text-amber-700",          ring: "ring-amber-200",   Icon: Sprout },
  fertile:    { label: "FERTILE",    color: "bg-pink-100 text-hotpink",             ring: "ring-pink-200",    Icon: Flower2 },
  ovulation:  { label: "OVULATION",  color: "bg-rose-200 text-magenta",             ring: "ring-rose-400",    Icon: Star },
  luteal:     { label: "LUTEAL",     color: "bg-violet-100 text-violet-500",        ring: "ring-violet-200",  Icon: Moon },
};

const MOODS = [
  { key: "calm",      label: "Calm",      Icon: Leaf },
  { key: "happy",     label: "Happy",     Icon: Smile },
  { key: "energetic", label: "Energetic", Icon: Zap },
  { key: "sensitive", label: "Sensitive", Icon: HeartCrack },
  { key: "sad",       label: "Sad",       Icon: CloudRain },
  { key: "tired",     label: "Tired",     Icon: Moon },
  { key: "cramps",    label: "Cramps",    Icon: Flame },
  { key: "bloated",   label: "Bloated",   Icon: Cloud },
] as const;

const WEEKDAYS = ["SU", "MO", "TU", "WE", "TH", "FR", "SA"];
const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export function CycleTracker() {
  const today = new Date(2026, 5, 4); // demo "today"
  const [settings, setSettings] = useState<CycleSettings>(DEFAULT_SETTINGS);
  const [setupOpen, setSetupOpen] = useState(false);
  const [cursor, setCursor] = useState(new Date(2026, 5, 1));
  const [selected, setSelected] = useState<Date>(today);
  const [pillTaken, setPillTaken] = useState(true);
  const [mood, setMood] = useState<string>("happy");
  const [slideDir, setSlideDir] = useState<"l" | "r">("r");

  const days = useMemo(() => {
    const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
    const startWeekday = first.getDay();
    const totalDays = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate();
    const cells: (Date | null)[] = [];
    for (let i = 0; i < startWeekday; i++) cells.push(null);
    for (let d = 1; d <= totalDays; d++) cells.push(new Date(cursor.getFullYear(), cursor.getMonth(), d));
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  }, [cursor]);

  function shift(dir: -1 | 1) {
    setSlideDir(dir === 1 ? "r" : "l");
    setCursor((c) => new Date(c.getFullYear(), c.getMonth() + dir, 1));
  }

  // Compute next period & ovulation dates from today
  const { nextPeriod, daysToPeriod, ovulationDate, fertileStart, fertileEnd } = useMemo(() => {
    const ms = 1000 * 60 * 60 * 24;
    const diff = Math.floor((today.getTime() - settings.lastPeriodStart.getTime()) / ms);
    const cyclesPassed = Math.floor(diff / settings.cycleLength) + 1;
    const np = new Date(settings.lastPeriodStart.getTime() + cyclesPassed * settings.cycleLength * ms);
    const dtp = Math.ceil((np.getTime() - today.getTime()) / ms);
    const ovDayOffset = settings.cycleLength - 14;
    // Find current/next cycle ovulation date
    const currentCycleStart = new Date(settings.lastPeriodStart.getTime() + Math.floor(diff / settings.cycleLength) * settings.cycleLength * ms);
    let ov = new Date(currentCycleStart.getTime() + ovDayOffset * ms);
    if (ov.getTime() < today.getTime()) ov = new Date(np.getTime() + ovDayOffset * ms);
    const fs = new Date(ov.getTime() - 4 * ms);
    const fe = new Date(ov.getTime() + 2 * ms);
    return { nextPeriod: np, daysToPeriod: dtp, ovulationDate: ov, fertileStart: fs, fertileEnd: fe };
  }, [settings]);

  const pillLabel = settings.contraceptiveMethod.charAt(0).toUpperCase() + settings.contraceptiveMethod.slice(1);

  return (
    <div className="relative">
      {/* dreamy kawaii 3D pink gradient background */}
      <KawaiiBackground count={16} />
      <BloomBubbles count={18} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* ============= Calendar card ============= */}
        <div className="lg:col-span-2 rounded-[2rem] bg-white/85 p-5 sm:p-7 shadow-xl shadow-rose/10 backdrop-blur animate-scale-in">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-script text-5xl text-hotpink">Cycle ✿</h2>
            <button
              onClick={() => setSetupOpen(true)}
              className="group relative inline-flex items-center gap-1.5 overflow-hidden rounded-full bloom-button-gradient px-5 py-2.5 text-sm font-bold text-white transition hover:scale-[1.06] active:scale-95"
            >
              <Sparkles className="h-4 w-4 animate-bloom-sparkle" />
              <Plus className="h-4 w-4" />
              <span>Log &amp; Settings</span>
              {/* shimmer sweep */}
              <span className="pointer-events-none absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-transparent via-white/60 to-transparent animate-bloom-shimmer" />
            </button>
          </div>

          {/* Month nav */}
          <div className="mb-4 flex items-center justify-center gap-4">
            <button onClick={() => shift(-1)} className="grid h-9 w-9 place-items-center rounded-full bg-blush text-hotpink transition hover:bg-petal">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <div className="min-w-[140px] text-center font-script text-3xl text-hotpink">
              {MONTHS[cursor.getMonth()]} {cursor.getFullYear()}
            </div>
            <button onClick={() => shift(1)} className="grid h-9 w-9 place-items-center rounded-full bg-blush text-hotpink transition hover:bg-petal">
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          {/* Weekday header */}
          <div className="mb-2 grid grid-cols-7 text-center text-[11px] font-bold tracking-widest text-rose/70">
            {WEEKDAYS.map((d) => <div key={d}>{d}</div>)}
          </div>

          {/* Calendar grid (animated slide on month change via key) */}
          <div
            key={`${cursor.getFullYear()}-${cursor.getMonth()}-${slideDir}`}
            className="grid grid-cols-7 gap-1.5 sm:gap-2 animate-fade-in"
          >
            {days.map((d, i) => {
              if (!d) return <div key={i} />;
              const phase = phaseForDay(d, settings);
              const isFuture = d.getTime() > today.getTime();
              const isSelected = sameDay(d, selected);
              const isToday = sameDay(d, today);
              const emphasizeFertile = settings.trackerMode === "conception" && (phase === "fertile" || phase === "ovulation");
              const meta = phase ? PHASE_META[phase] : null;
              const Icon = meta?.Icon;
              const isPeak = phase === "ovulation";

              return (
                <button
                  key={i}
                  onClick={() => setSelected(d)}
                  className={[
                    "relative aspect-square rounded-2xl flex flex-col items-center justify-center text-xs font-semibold transition-all duration-200",
                    "hover:scale-110 active:scale-95",
                    isSelected ? "scale-110 ring-2 ring-hotpink shadow-md animate-bloom-bounce" : "",
                    isFuture && phase === "period"
                      ? "border-2 border-dashed border-hotpink/70 bg-pink-50 text-hotpink"
                      : isFuture
                        ? "border border-dashed border-rose/40 text-rose bg-white/60"
                        : meta?.color ?? "bg-white text-rose",
                    isPeak ? "animate-bloom-peak" : "",
                    emphasizeFertile ? "ring-2 ring-magenta/60" : "",
                    isToday ? "outline outline-2 outline-offset-2 outline-hotpink/60" : "",
                  ].join(" ")}
                >
                  <span className="leading-none">{d.getDate()}</span>
                  {Icon && <Icon className={`h-3 w-3 mt-0.5 ${isFuture ? "opacity-50" : "opacity-95"}`} />}
                  {isPeak && (
                    <span className="absolute -top-2 inline-flex items-center gap-0.5 rounded-full bg-magenta px-1.5 py-0.5 text-[8px] font-bold text-white shadow">
                      <Sparkles className="h-2 w-2" /> PEAK
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Legend */}
          <div className="mt-5 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-[10px] font-bold tracking-wider text-rose/80">
            {(Object.entries(PHASE_META) as [Exclude<Phase, null>, typeof PHASE_META[Exclude<Phase, null>]][]).map(([k, v]) => (
              <span key={k} className="inline-flex items-center gap-1.5">
                <span className={`h-3 w-3 rounded-full ${v.color}`} />
                {v.label}
              </span>
            ))}
          </div>
        </div>

        {/* ============= Right column ============= */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-1">
          {/* Next period */}
          <div className="rounded-[2rem] bg-white/85 p-5 shadow-xl shadow-rose/10 backdrop-blur animate-scale-in" style={{ animationDelay: "60ms" }}>
            <div className="flex items-center gap-2">
              <span className="grid h-8 w-8 place-items-center rounded-full bg-hotpink/10 text-hotpink animate-bloom-pulse">
                <Droplet className="h-4 w-4 fill-hotpink/30" />
              </span>
              <p className="text-[10px] font-bold tracking-widest text-rose">NEXT PERIOD</p>
            </div>
            <p className="mt-1 font-script text-4xl text-hotpink">
              {nextPeriod.toLocaleDateString("en", { weekday: "short" })}
            </p>
            <p className="text-sm text-rose">In {daysToPeriod} days · {MONTHS[nextPeriod.getMonth()]} {nextPeriod.getDate()}</p>
          </div>

          {/* Ovulation */}
          <div className="rounded-[2rem] bg-white/85 p-5 shadow-xl shadow-rose/10 backdrop-blur animate-scale-in" style={{ animationDelay: "120ms" }}>
            <div className="flex items-center gap-2">
              <span className="grid h-8 w-8 place-items-center rounded-full bg-magenta/10 text-magenta">
                <Flower2 className="h-4 w-4" />
              </span>
              <p className="text-[10px] font-bold tracking-widest text-rose">OVULATION</p>
              <Sparkles className="h-3 w-3 text-magenta animate-bloom-sparkle" />
            </div>
            <p className="mt-1 font-script text-4xl text-hotpink">{ovulationDate.toLocaleDateString("en", { weekday: "short" })}</p>
            <p className="text-sm text-rose">
              Fertile window · {MONTHS[fertileStart.getMonth()].slice(0,3)} {fertileStart.getDate()}–{fertileEnd.getDate()}
            </p>
          </div>

          {/* Daily pill */}
          <div className="rounded-[2rem] bg-white/85 p-5 shadow-xl shadow-rose/10 backdrop-blur animate-scale-in sm:col-span-2 lg:col-span-1" style={{ animationDelay: "180ms" }}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className={`grid h-11 w-11 place-items-center rounded-full transition-all duration-300 ${pillTaken ? "bg-hotpink text-white scale-100" : "bg-blush text-hotpink"}`}>
                  <Pill className="h-5 w-5" />
                </span>
                <div>
                  <p className="font-script text-2xl text-hotpink leading-none">Daily {pillLabel}</p>
                  <p className="text-xs text-rose mt-0.5">
                    {settings.contraceptiveReminder ? `Reminder · ${settings.reminderHour}` : "Reminder off"}
                  </p>
                </div>
              </div>
            </div>
            <div className="mt-4 flex items-center justify-between">
              <span
                key={String(pillTaken)}
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold transition-all ${
                  pillTaken ? "bg-green-100 text-green-600 animate-scale-in" : "bg-blush text-rose"
                }`}
              >
                <Heart className="h-3 w-3" />
                {pillTaken ? "Taken today" : "Not taken yet"}
              </span>
              <button
                onClick={() => setPillTaken((v) => !v)}
                className="inline-flex items-center gap-1 rounded-full bg-blush px-3 py-1.5 text-xs font-semibold text-hotpink transition hover:scale-105 hover:bg-petal"
              >
                <Undo2 className="h-3 w-3" />
                {pillTaken ? "Undo Take" : "Mark Taken"}
              </button>
            </div>
          </div>

          {/* Mood */}
          <div className="rounded-[2rem] bg-white/85 p-5 shadow-xl shadow-rose/10 backdrop-blur animate-scale-in sm:col-span-2 lg:col-span-1" style={{ animationDelay: "240ms" }}>
            <p className="text-[10px] font-bold tracking-widest text-rose">
              {today.toLocaleDateString("en", { weekday: "long", month: "long", day: "numeric" }).toUpperCase()}
            </p>
            <p className="font-script text-3xl text-hotpink mt-1">how is your mood today?</p>
            <div className="mt-3 grid grid-cols-4 gap-2">
              {MOODS.map((m) => {
                const active = mood === m.key;
                const MoodIcon = m.Icon;
                return (
                  <button
                    key={m.key}
                    onClick={() => setMood(m.key)}
                    className={[
                      "group flex flex-col items-center gap-1 rounded-2xl p-2 transition-all duration-200 active:scale-95",
                      active ? "bg-hotpink/10 ring-2 ring-hotpink animate-bloom-bounce" : "bg-blush/60 hover:bg-petal/70 hover:scale-105",
                    ].join(" ")}
                  >
                    <span
                      className={[
                        "grid h-9 w-9 place-items-center rounded-full transition-transform",
                        active ? "bg-hotpink text-white scale-110" : "bg-white text-hotpink ring-1 ring-petal group-hover:scale-110",
                      ].join(" ")}
                    >
                      <MoodIcon className="h-4 w-4" />
                    </span>
                    <span className={`text-[10px] font-semibold ${active ? "text-hotpink" : "text-rose"}`}>{m.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* For You */}
      <div className="mt-8">
        <h3 className="font-script text-4xl text-hotpink mb-3">For You ✿</h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[
            { t: "Soft yoga for cramps", d: "10-min gentle flow to ease your body.", Icon: Flower2 },
            { t: "Iron-rich snacks",     d: "Cute recipes for your period week.",   Icon: Leaf },
            { t: "Why you feel extra today", d: "A gentle hormone explainer.",      Icon: Sparkles },
          ].map((p, i) => (
            <div
              key={p.t}
              className="rounded-[1.75rem] bg-white/85 p-5 shadow-xl shadow-rose/10 backdrop-blur transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl hover:shadow-hotpink/20 animate-fade-in"
              style={{ animationDelay: `${i * 80}ms` }}
            >
              <div className="mb-3 flex items-center gap-2">
                <span className="grid h-10 w-10 place-items-center rounded-2xl bg-hotpink/10 text-hotpink">
                  <p.Icon className="h-5 w-5" />
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-blush px-2.5 py-0.5 text-[10px] font-bold tracking-wider text-hotpink">
                  <Sparkles className="h-3 w-3" /> FOR YOU
                </span>
              </div>
              <p className="font-script text-2xl text-hotpink">{p.t}</p>
              <p className="text-sm text-rose mt-1">{p.d}</p>
            </div>
          ))}
        </div>
      </div>

      <PeriodSetup
        open={setupOpen}
        onClose={() => setSetupOpen(false)}
        initial={settings}
        onSave={(s) => setSettings(s)}
      />
    </div>
  );
}