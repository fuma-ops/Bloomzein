import { useEffect, useMemo, useState } from "react";
import {
  ChevronLeft, ChevronRight, X, Sparkles, Clock,
  LayoutGrid, Rows3,
} from "lucide-react";
import { PageHeader } from "@/components/bloom/PageHeader";
import { BloomBubbles } from "@/components/bloom/BloomBubbles";
import {
  DEFAULT_SETTINGS, phaseForDay, PHASE_META, type Phase,
} from "@/components/bloom/CycleTracker";
import {
  STORAGE_KEYS as REMINDER_STORAGE_KEYS, type Reminder,
} from "./app.tools.notes";
import {
  SCHEDULE_KEY as YOGA_SCHEDULE_KEY, REMINDER_KEY as YOGA_REMINDER_KEY,
} from "./app.tools.yoga";
import {
  DIARY_STORAGE_KEY, moodMeta, type DiaryEntry,
} from "./app.tools.diary";

function pad2(n: number) { return String(n).padStart(2, "0"); }
function fmtLocalDate(d: Date) { return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`; }
function parseLocalDate(s?: string): Date | null {
  if (!s) return null;
  const [y, m, d] = s.split("-").map((n) => parseInt(n, 10));
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}
function addDays(d: Date, n: number) {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}
function startOfDay(d: Date) { return new Date(d.getFullYear(), d.getMonth(), d.getDate()); }
function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}
/** Monday-first week start, matching the Yoga organizer's day labels. */
function startOfWeek(d: Date) {
  const day = d.getDay(); // 0=Sun..6=Sat
  const diff = (day === 0 ? -6 : 1) - day;
  return addDays(startOfDay(d), diff);
}
/** Yoga's organizer grid uses Mon-first 3-letter labels — translate from JS's Sun-first getDay(). */
function mondayFirstLabel(date: Date) {
  return ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][date.getDay()];
}
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

interface PlanningItem {
  id: string;
  time?: string;
  emoji: string;
  label: string;
  sourceLabel: string;
  sourceHref: string;
}

function remindersForDate(reminders: Reminder[], date: Date): PlanningItem[] {
  const items: PlanningItem[] = [];
  const weekday = date.getDay();
  const dateStr = fmtLocalDate(date);
  for (const rem of reminders) {
    if (rem.kind === "event") {
      const start = parseLocalDate(rem.date);
      const end = parseLocalDate(rem.endDate) ?? start;
      if (start && end && date >= start && date <= end) {
        items.push({
          id: `${rem.id}:${dateStr}`, time: rem.time, emoji: "📅",
          label: rem.title, sourceLabel: "Edit in Reminders →", sourceHref: "/app/tools/notes",
        });
      }
    } else if (rem.kind === "birthday") {
      const anchor = parseLocalDate(rem.date);
      if (anchor && anchor.getMonth() === date.getMonth() && anchor.getDate() === date.getDate()) {
        items.push({
          id: `${rem.id}:${dateStr}`, time: rem.time, emoji: "🎂",
          label: `${rem.title}'s birthday`, sourceLabel: "Edit in Reminders →", sourceHref: "/app/tools/notes",
        });
      }
    } else if (rem.kind === "medication") {
      const recurs = rem.weekdays.length === 0 || rem.weekdays.includes(weekday);
      if (recurs) {
        const slots = rem.times.length ? rem.times : ["09:00"];
        for (const slot of slots) {
          items.push({
            id: `${rem.id}:${dateStr}:${slot}`, time: slot, emoji: "💊",
            label: rem.title, sourceLabel: "Edit in Reminders →", sourceHref: "/app/tools/notes",
          });
        }
      }
    }
  }
  return items;
}

function yogaForDate(schedule: Record<string, string | null>, reminder: string, date: Date): PlanningItem[] {
  const focus = schedule[mondayFirstLabel(date)];
  if (!focus) return [];
  return [{
    id: `yoga:${fmtLocalDate(date)}`, time: reminder, emoji: "🧘",
    label: `${focus} flow`, sourceLabel: "Edit in Yoga Flows →", sourceHref: "/app/tools/yoga",
  }];
}

function moodForDate(entries: DiaryEntry[], date: Date) {
  const dateStr = fmtLocalDate(date);
  const matches = entries.filter((e) => e.date === dateStr);
  if (!matches.length) return null;
  matches.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return moodMeta(matches[0].mood);
}

function suggestionFor(phase: Phase, items: PlanningItem[]): string {
  const hasMed = items.some((i) => i.emoji === "💊");
  const hasYoga = items.some((i) => i.emoji === "🧘");
  if (phase === "period") return hasYoga ? "Low-energy day — maybe swap today's flow for something gentle and restorative 🌷" : "Low-energy day — a warm drink, a soft blanket, and rest are more than enough 🌷";
  if (phase === "ovulation" || phase === "fertile") return hasYoga ? "Energy's peaking ✨ — perfect day to really feel that flow in your body" : "Energy's peaking ✨ — a great day to tackle that thing you've been putting off";
  if (phase === "luteal") return hasMed ? "Cravings and moods may run stronger today — and don't forget your dose 💊" : "Cravings and moods may run stronger today — a grounding routine can help 🌙";
  if (phase === "follicular") return "Fresh energy rising 🌱 — a lovely day to start something new";
  if (hasMed) return "Just a gentle nudge — don't forget your dose today 💊";
  return "An open, calm day — make it sweet ✿";
}

const STORAGE = {
  reminders: REMINDER_STORAGE_KEYS.reminders,
  yogaSchedule: YOGA_SCHEDULE_KEY,
  yogaReminder: YOGA_REMINDER_KEY,
  diary: DIARY_STORAGE_KEY,
};

function loadJSON<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export default function CalendarPage() {
  const [view, setView] = useState<"week" | "month">("week");
  const [cursor, setCursor] = useState(() => new Date());
  const [selected, setSelected] = useState<Date | null>(null);

  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [yogaSchedule, setYogaSchedule] = useState<Record<string, string | null>>({});
  const [yogaReminder, setYogaReminder] = useState("07:30");
  const [diaryEntries, setDiaryEntries] = useState<DiaryEntry[]>([]);

  useEffect(() => {
    setReminders(loadJSON<Reminder[]>(STORAGE.reminders, []));
    setYogaSchedule(loadJSON<Record<string, string | null>>(STORAGE.yogaSchedule, {}));
    try {
      const r = localStorage.getItem(STORAGE.yogaReminder);
      if (r) setYogaReminder(r);
    } catch {}
    const rawDiary = loadJSON<DiaryEntry[]>(STORAGE.diary, []);
    setDiaryEntries(rawDiary);
  }, []);

  const planningFor = (date: Date): PlanningItem[] => {
    const items = [...remindersForDate(reminders, date), ...yogaForDate(yogaSchedule, yogaReminder, date)];
    items.sort((a, b) => (a.time ?? "99:99").localeCompare(b.time ?? "99:99"));
    return items;
  };

  const weekDays = useMemo(() => {
    const start = startOfWeek(cursor);
    return Array.from({ length: 7 }, (_, i) => addDays(start, i));
  }, [cursor]);

  const monthCells = useMemo(() => {
    const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
    const startWeekday = (first.getDay() + 6) % 7; // Monday-first
    const totalDays = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate();
    const cells: (Date | null)[] = [];
    for (let i = 0; i < startWeekday; i++) cells.push(null);
    for (let d = 1; d <= totalDays; d++) cells.push(new Date(cursor.getFullYear(), cursor.getMonth(), d));
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  }, [cursor]);

  const today = startOfDay(new Date());

  return (
    <div className="relative animate-fade-in">
      <BloomBubbles count={14} />
      <PageHeader title="Bloom Calendar" emoji="🗓️">
        <div className="flex items-center gap-2">
          <div className="inline-flex rounded-full bg-white/80 border border-petal/60 p-1 shadow-sm">
            <button
              onClick={() => setView("week")}
              aria-label="Week view"
              className={["grid h-8 w-8 place-items-center rounded-full transition",
                view === "week" ? "bg-hotpink text-white shadow shadow-hotpink/30" : "text-rose hover:bg-blush/60"].join(" ")}
            >
              <Rows3 className="h-4 w-4" />
            </button>
            <button
              onClick={() => setView("month")}
              aria-label="Month view"
              className={["grid h-8 w-8 place-items-center rounded-full transition",
                view === "month" ? "bg-hotpink text-white shadow shadow-hotpink/30" : "text-rose hover:bg-blush/60"].join(" ")}
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
          </div>
        </div>
      </PageHeader>

      <p className="-mt-3 mb-5 text-xs text-rose/70 max-w-md">
        A soft mirror of your tools — cycle, plans &amp; moods in one glance. To change anything, open the source tool ✿
      </p>

      {view === "week" ? (
        <WeekView
          days={weekDays}
          today={today}
          planningFor={planningFor}
          moodFor={(d) => moodForDate(diaryEntries, d)}
          onPrev={() => setCursor((c) => addDays(c, -7))}
          onNext={() => setCursor((c) => addDays(c, 7))}
          onSelect={setSelected}
        />
      ) : (
        <MonthView
          cursor={cursor}
          cells={monthCells}
          today={today}
          planningFor={planningFor}
          onPrev={() => setCursor((c) => new Date(c.getFullYear(), c.getMonth() - 1, 1))}
          onNext={() => setCursor((c) => new Date(c.getFullYear(), c.getMonth() + 1, 1))}
          onSelect={setSelected}
        />
      )}

      {selected && (
        <DayDrawer
          date={selected}
          items={planningFor(selected)}
          mood={moodForDate(diaryEntries, selected)}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}

function PhaseChip({ phase }: { phase: Phase }) {
  if (!phase) return null;
  const meta = PHASE_META[phase];
  return (
    <span className={["inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide", meta.color].join(" ")}>
      <meta.Icon className="h-3 w-3" /> {meta.label}
    </span>
  );
}

function ItemChip({ item }: { item: PlanningItem }) {
  return (
    <div className="flex items-center gap-1.5 rounded-full bg-blush/50 border border-petal/50 px-2 py-1 text-[10px] font-semibold text-rose">
      <span>{item.emoji}</span>
      {item.time && <span className="text-rose/60">{item.time}</span>}
      <span className="truncate max-w-[8rem]">{item.label}</span>
    </div>
  );
}

function WeekView({
  days, today, planningFor, moodFor, onPrev, onNext, onSelect,
}: {
  days: Date[];
  today: Date;
  planningFor: (d: Date) => PlanningItem[];
  moodFor: (d: Date) => ReturnType<typeof moodMeta> | null;
  onPrev: () => void;
  onNext: () => void;
  onSelect: (d: Date) => void;
}) {
  const first = days[0], last = days[6];
  const sameMonth = first.getMonth() === last.getMonth();
  const rangeLabel = sameMonth
    ? `${MONTHS[first.getMonth()]} ${first.getDate()}–${last.getDate()}`
    : `${MONTHS[first.getMonth()].slice(0, 3)} ${first.getDate()} – ${MONTHS[last.getMonth()].slice(0, 3)} ${last.getDate()}`;

  return (
    <section className="rounded-3xl bg-white/85 backdrop-blur border border-petal/60 p-4 sm:p-6">
      <div className="flex items-center justify-between mb-4">
        <button onClick={onPrev} aria-label="Previous week" className="grid h-8 w-8 place-items-center rounded-full bg-blush/60 text-rose hover:bg-blush transition">
          <ChevronLeft className="h-4 w-4" />
        </button>
        <p className="text-sm font-bold text-hotpink">{rangeLabel}</p>
        <button onClick={onNext} aria-label="Next week" className="grid h-8 w-8 place-items-center rounded-full bg-blush/60 text-rose hover:bg-blush transition">
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      <div className="space-y-2.5">
        {days.map((day) => {
          const phase = phaseForDay(day, DEFAULT_SETTINGS);
          const items = planningFor(day);
          const mood = moodFor(day);
          const isToday = sameDay(day, today);
          return (
            <button
              key={fmtLocalDate(day)}
              onClick={() => onSelect(day)}
              className={["w-full text-left rounded-2xl border p-3 transition hover:shadow-md hover:shadow-hotpink/10",
                isToday ? "bg-blush/50 border-hotpink/40 ring-1 ring-hotpink/30" : "bg-white/70 border-petal/50"].join(" ")}
            >
              <div className="flex items-center gap-2 flex-wrap">
                <span className={["grid h-9 w-9 shrink-0 place-items-center rounded-xl text-sm font-bold",
                  isToday ? "bg-hotpink text-white" : "bg-blush/70 text-rose"].join(" ")}>
                  {day.getDate()}
                </span>
                <span className="text-xs font-bold uppercase tracking-wide text-rose/70">
                  {day.toLocaleDateString(undefined, { weekday: "short" })}
                </span>
                <PhaseChip phase={phase} />
                {mood && (
                  <span className="ml-auto inline-flex items-center gap-1 text-rose/70" title={mood.label}>
                    <mood.Icon className="h-3.5 w-3.5" />
                  </span>
                )}
              </div>
              {items.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5 pl-11">
                  {items.map((item) => <ItemChip key={item.id} item={item} />)}
                </div>
              )}
            </button>
          );
        })}
      </div>
    </section>
  );
}

function MonthView({
  cursor, cells, today, planningFor, onPrev, onNext, onSelect,
}: {
  cursor: Date;
  cells: (Date | null)[];
  today: Date;
  planningFor: (d: Date) => PlanningItem[];
  onPrev: () => void;
  onNext: () => void;
  onSelect: (d: Date) => void;
}) {
  const dayLabels = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];
  return (
    <section className="rounded-3xl bg-white/85 backdrop-blur border border-petal/60 p-4 sm:p-6">
      <div className="flex items-center justify-between mb-4">
        <button onClick={onPrev} aria-label="Previous month" className="grid h-8 w-8 place-items-center rounded-full bg-blush/60 text-rose hover:bg-blush transition">
          <ChevronLeft className="h-4 w-4" />
        </button>
        <p className="text-sm font-bold text-hotpink">{MONTHS[cursor.getMonth()]} {cursor.getFullYear()}</p>
        <button onClick={onNext} aria-label="Next month" className="grid h-8 w-8 place-items-center rounded-full bg-blush/60 text-rose hover:bg-blush transition">
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1.5 text-center mb-1.5">
        {dayLabels.map((d) => <p key={d} className="text-[10px] font-bold uppercase tracking-wider text-rose/50">{d}</p>)}
      </div>
      <div className="grid grid-cols-7 gap-1.5">
        {cells.map((day, i) => {
          if (!day) return <div key={`empty-${i}`} />;
          const phase = phaseForDay(day, DEFAULT_SETTINGS);
          const meta = phase ? PHASE_META[phase] : null;
          const items = planningFor(day);
          const isToday = sameDay(day, today);
          return (
            <button
              key={fmtLocalDate(day)}
              onClick={() => onSelect(day)}
              className={["aspect-square rounded-xl border flex flex-col items-center justify-center gap-1 transition hover:shadow-md hover:shadow-hotpink/10",
                meta ? meta.color.replace("text-", "border-") : "bg-white/60 border-petal/40",
                meta?.color ?? "text-rose",
                isToday ? "ring-2 ring-hotpink/50" : ""].join(" ")}
            >
              <span className="text-xs font-bold">{day.getDate()}</span>
              {items.length > 0 && (
                <span className="flex gap-0.5">
                  {items.slice(0, 3).map((item) => <span key={item.id} className="text-[8px] leading-none">{item.emoji}</span>)}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {(Object.entries(PHASE_META) as [Exclude<Phase, null>, typeof PHASE_META[Exclude<Phase, null>]][]).map(([key, meta]) => (
          <span key={key} className={["inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide", meta.color].join(" ")}>
            <meta.Icon className="h-3 w-3" /> {meta.label}
          </span>
        ))}
      </div>
    </section>
  );
}

function DayDrawer({
  date, items, mood, onClose,
}: {
  date: Date;
  items: PlanningItem[];
  mood: ReturnType<typeof moodMeta> | null;
  onClose: () => void;
}) {
  const phase = phaseForDay(date, DEFAULT_SETTINGS);
  const meta = phase ? PHASE_META[phase] : null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-rose/30 backdrop-blur-sm animate-fade-in" onClick={onClose}>
      <div
        className="relative w-full sm:max-w-lg max-h-[88vh] overflow-y-auto rounded-t-[2rem] sm:rounded-[2rem] bg-white/95 backdrop-blur-xl p-6 shadow-2xl shadow-hotpink/30 animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        <button onClick={onClose} aria-label="Close" className="absolute right-4 top-4 grid h-8 w-8 place-items-center rounded-full bg-blush/60 text-rose hover:bg-blush transition">
          <X className="h-4 w-4" />
        </button>

        <p className="text-[10px] font-bold uppercase tracking-wider text-rose/60">
          {date.toLocaleDateString(undefined, { weekday: "long" })}
        </p>
        <h2 className="font-script text-3xl text-hotpink leading-tight">
          {MONTHS[date.getMonth()]} {date.getDate()}
        </h2>

        {meta && (
          <div className={["mt-3 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wide", meta.color].join(" ")}>
            <meta.Icon className="h-3.5 w-3.5" /> {meta.label}
          </div>
        )}

        <div className="mt-4 rounded-2xl bg-blush/40 border border-petal/50 p-3.5 flex items-start gap-2.5">
          <Sparkles className="h-4 w-4 text-hotpink shrink-0 mt-0.5" />
          <p className="text-xs text-[#831843] leading-snug">{suggestionFor(phase, items)}</p>
        </div>

        <div className="mt-5">
          <p className="text-[10px] font-bold uppercase tracking-wider text-rose/60 mb-2">Today's plans</p>
          {items.length === 0 ? (
            <p className="text-xs text-rose/60">Nothing scheduled — a clean, open day ✿</p>
          ) : (
            <div className="space-y-2">
              {items.map((item) => (
                <a
                  key={item.id}
                  href={item.sourceHref}
                  className="flex items-center gap-3 rounded-2xl bg-white/80 border border-petal/50 p-3 hover:border-hotpink/40 hover:shadow-md hover:shadow-hotpink/10 transition group"
                >
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-blush/60 text-base">{item.emoji}</span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-[#831843] truncate">{item.label}</p>
                    {item.time && (
                      <p className="text-[11px] text-rose/60 inline-flex items-center gap-1"><Clock className="h-3 w-3" /> {item.time}</p>
                    )}
                  </div>
                  <span className="text-[11px] font-semibold text-hotpink opacity-70 group-hover:opacity-100 transition shrink-0">
                    {item.sourceLabel}
                  </span>
                </a>
              ))}
            </div>
          )}
        </div>

        {mood && (
          <div className="mt-5">
            <p className="text-[10px] font-bold uppercase tracking-wider text-rose/60 mb-2">Mood that day</p>
            <a
              href="/app/tools/diary"
              className="flex items-center gap-3 rounded-2xl bg-white/80 border border-petal/50 p-3 hover:border-hotpink/40 transition group"
            >
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-blush/60 text-rose">
                <mood.Icon className="h-4.5 w-4.5" />
              </span>
              <p className="text-sm font-semibold text-[#831843] flex-1">{mood.label}</p>
              <span className="text-[11px] font-semibold text-hotpink opacity-70 group-hover:opacity-100 transition">Open Diary →</span>
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
