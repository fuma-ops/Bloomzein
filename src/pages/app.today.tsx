import { useEffect, useMemo, useState } from "react";
import {
  Sparkles, Flower2, Pill, Wallet, Heart, PencilLine,
  ArrowRight, Clock, Flame, Sun, Moon, Smile, Cloud,
  CloudRain, Battery, Briefcase, CalendarDays, Dumbbell,
} from "lucide-react";
import { BloomBubbles } from "@/components/bloom/BloomBubbles";
import { useToolSnapshots } from "@/lib/toolSnapshots";
import { useAuth } from "@/contexts/AuthContext";

// ── Storage keys ────────────────────────────────────────────────────────────
const KEYS = {
  mood:         "bloom:today-mood",
  symptoms:     "bloom:today-symptoms",
  water:        "bloom:today-water",
  reminders:    "bloom:reminders",
  notes:        "bloom:notes",
  yogaSchedule: "bloom:yoga-schedule",
  cyclePhase:   "bloom:cycle-phase",
  streak:       "bloom:streak-days",
} as const;

export const TODAY_WATER_KEY = KEYS.water;

function readJSON<T>(key: string, fallback: T): T {
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; } catch { return fallback; }
}
function todayISO() { return new Date().toISOString().slice(0, 10); }

// ── Mood data ────────────────────────────────────────────────────────────────
const MOODS = [
  { key: "calm",      label: "Calm",      Icon: Cloud },
  { key: "happy",     label: "Happy",     Icon: Smile },
  { key: "energetic", label: "Energetic", Icon: Sparkles },
  { key: "sensitive", label: "Sensitive", Icon: Heart },
  { key: "sad",       label: "Sad",       Icon: CloudRain },
  { key: "tired",     label: "Tired",     Icon: Battery },
] as const;

// ── Symptoms data ────────────────────────────────────────────────────────────
const SYMPTOMS = [
  { key: "cramps",    label: "Cramps",      emoji: "😣" },
  { key: "bloated",   label: "Bloated",     emoji: "🫧" },
  { key: "headache",  label: "Headache",    emoji: "🤕" },
  { key: "fatigue",   label: "Fatigue",     emoji: "😪" },
  { key: "tender",    label: "Tender",      emoji: "💗" },
  { key: "moody",     label: "Moody",       emoji: "🌊" },
  { key: "nausea",    label: "Nausea",      emoji: "🌿" },
  { key: "cravings",  label: "Cravings",    emoji: "🍫" },
  { key: "backpain",  label: "Back pain",   emoji: "🦴" },
  { key: "spotting",  label: "Spotting",    emoji: "🩸" },
  { key: "lowenergy", label: "Low energy",  emoji: "🔋" },
  { key: "acne",      label: "Acne",        emoji: "😔" },
] as const;

// ── Cycle-phase quotes ───────────────────────────────────────────────────────
const PHASE_QUOTES: Record<string, string> = {
  period:     "Rest is productive. Your body is doing powerful work today.",
  follicular: "Fresh energy is waking up in you. What will you create?",
  fertile:    "You're in your magnetic era. Bright and open.",
  ovulation:  "You are radiant — the world feels it.",
  luteal:     "Your sensitivity is wisdom, not weakness. Be gentle.",
};

function greeting() {
  const h = new Date().getHours();
  if (h < 5)  return { text: "Good night",      Icon: Moon };
  if (h < 12) return { text: "Good morning",    Icon: Sun };
  if (h < 18) return { text: "Good afternoon",  Icon: Sun };
  return       { text: "Good evening",          Icon: Moon };
}

function fmtDate() {
  return new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
}

// ── Main component ───────────────────────────────────────────────────────────
export default function TodayPage() {
  const { profile } = useAuth();
  const { text: hello, Icon: HelloIcon } = useMemo(greeting, []);
  const today = useMemo(fmtDate, []);

  const displayName = profile?.name?.split(" ")[0] || "Beautiful";

  const [mood, setMood] = useState<string | null>(null);
  const [justPicked, setJustPicked] = useState<string | null>(null);
  const [symptoms, setSymptoms] = useState<string[]>([]);
  const [waterCount, setWaterCount] = useState(0);
  const [reminders, setReminders] = useState<any[]>([]);
  const [pinnedNotes, setPinnedNotes] = useState<any[]>([]);
  const [cyclePhase, setCyclePhase] = useState<string>("bloom");
  const [yogaToday, setYogaToday] = useState<string | null>(null);
  const [streak, setStreak] = useState(7);

  const snapshots = useToolSnapshots();

  useEffect(() => {
    const iso = todayISO();

    try { setMood(localStorage.getItem(KEYS.mood)); } catch {}
    try { setStreak(Number(localStorage.getItem(KEYS.streak)) || 7); } catch {}

    // Symptoms (reset daily)
    try {
      const raw = readJSON<{ date: string; list: string[] }>(KEYS.symptoms, { date: "", list: [] });
      setSymptoms(raw.date === iso ? raw.list : []);
    } catch {}

    // Water (reset daily)
    try {
      const raw = readJSON<{ date: string; count: number }>(KEYS.water, { date: "", count: 0 });
      setWaterCount(raw.date === iso ? raw.count : 0);
    } catch {}

    // Reminders
    try {
      const rems = readJSON<any[]>(KEYS.reminders, []);
      setReminders(rems);
    } catch {}

    // Pinned notes
    try {
      const notes = readJSON<any[]>(KEYS.notes, []);
      setPinnedNotes(notes.filter((n: any) => n.pinned));
    } catch {}

    // Cycle phase
    try {
      const phase = localStorage.getItem(KEYS.cyclePhase);
      if (phase) setCyclePhase(phase);
    } catch {}

    // Yoga schedule for today
    try {
      const schedule = readJSON<Record<string, string | null>>(KEYS.yogaSchedule, {});
      const dayKey = new Date().getDay().toString();
      setYogaToday(schedule[dayKey] ?? null);
    } catch {}
  }, []);

  const pickMood = (key: string) => {
    setMood(key);
    setJustPicked(key);
    try { localStorage.setItem(KEYS.mood, key); } catch {}
    setTimeout(() => setJustPicked(null), 600);
  };

  const toggleSymptom = (key: string) => {
    setSymptoms((prev) => {
      const next = prev.includes(key) ? prev.filter((s) => s !== key) : [...prev, key];
      try { localStorage.setItem(KEYS.symptoms, JSON.stringify({ date: todayISO(), list: next })); } catch {}
      return next;
    });
  };

  const tapWater = (idx: number) => {
    setWaterCount((prev) => {
      const next = idx < prev ? idx : idx + 1;
      try { localStorage.setItem(KEYS.water, JSON.stringify({ date: todayISO(), count: next })); } catch {}
      return next;
    });
  };

  // Today's agenda: active reminders + yoga
  const iso = useMemo(todayISO, []);
  const todayReminders = useMemo(() =>
    reminders.filter((r) => !r.done && r.date <= iso)
      .sort((a, b) => (a.time || "").localeCompare(b.time || ""))
      .slice(0, 6),
    [reminders, iso]
  );

  const quote = PHASE_QUOTES[cyclePhase] || "You are blooming at your own pace.";
  const cycleDay = 14; // TODO: derive from actual cycle data

  return (
    <div className="relative">
      <BloomBubbles count={10} />

      {/* ── HERO ─────────────────────────────────────────────────────────── */}
      <section
        className="relative overflow-hidden -mx-3 sm:-mx-6 md:mx-0 -mt-3 sm:-mt-5 md:mt-0 rounded-b-[1.75rem] sm:rounded-b-[2.5rem] md:rounded-[2.5rem] rounded-t-none md:rounded-t-[2.5rem] border-b border-petal/60 md:border shadow-[0_20px_50px_-20px_oklch(0.6_0.27_350/0.45)] stagger"
        style={{ animationDelay: "0ms" }}
      >
        <img src="/images/today-hero.png" alt="" className="absolute inset-0 h-full w-full object-cover" referrerPolicy="no-referrer" />
        <div className="absolute inset-0 bg-gradient-to-r from-white/85 via-white/40 to-transparent" />
        <div className="relative px-4 py-5 sm:px-12 sm:py-14 max-w-xl">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-white/85 backdrop-blur px-2.5 py-0.5 sm:px-3 sm:py-1 text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-hotpink border border-petal/60">
            <HelloIcon className="h-3 w-3" strokeWidth={2} /> {today}
          </div>
          <h1 className="mt-2 sm:mt-3 font-script text-3xl sm:text-6xl text-hotpink leading-none drop-shadow-[0_2px_6px_oklch(1_0_0/0.5)]">
            {hello}, {displayName}
          </h1>
          <p className="mt-2 sm:mt-4 text-xs sm:text-base text-rose italic leading-snug max-w-xs">
            "{quote}"
          </p>
          <div className="mt-2 sm:mt-4 inline-flex items-center gap-1.5 rounded-full bg-hotpink/10 text-hotpink text-[11px] sm:text-xs font-semibold px-2.5 py-0.5 sm:px-3 sm:py-1 border border-hotpink/20">
            <Flame className="h-3.5 w-3.5" strokeWidth={1.8} /> {streak} days blooming
          </div>
        </div>
      </section>

      {/* ── MOOD CHECK-IN ─────────────────────────────────────────────────── */}
      <section className="mt-5 sm:mt-7 stagger" style={{ animationDelay: "80ms" }}>
        <SectionTitle>How are you feeling?</SectionTitle>
        <div className="rounded-3xl bg-white/85 backdrop-blur p-3.5 sm:p-4 border border-petal/50 shadow-[0_10px_24px_-14px_oklch(0.7_0.18_350/0.3)]">
          <div className="grid grid-cols-6 gap-1.5 sm:gap-2">
            {MOODS.map((m, i) => {
              const active = mood === m.key;
              const bouncing = justPicked === m.key;
              return (
                <button
                  key={m.key}
                  onClick={() => pickMood(m.key)}
                  className={[
                    "group flex flex-col items-center gap-1 rounded-2xl py-2 px-1 transition border",
                    active ? "bg-hotpink/10 border-hotpink/30" : "bg-transparent border-transparent hover:bg-blush/60",
                    bouncing ? "animate-bloom-bounce" : "",
                  ].join(" ")}
                  style={!mood && !active ? { animationDelay: `${i * 0.25}s` } : {}}
                >
                  <span
                    className={[
                      "grid h-9 w-9 place-items-center rounded-full transition",
                      active
                        ? "bg-gradient-to-br from-hotpink to-magenta text-white shadow-md shadow-hotpink/40"
                        : `bg-blush text-hotpink ${!mood ? "mood-invite" : ""} group-hover:bg-petal/70`,
                    ].join(" ")}
                    style={!mood ? { animationDelay: `${i * 0.3}s` } : {}}
                  >
                    <m.Icon className="h-4 w-4" strokeWidth={1.6} />
                  </span>
                  <span className={["text-[10px] font-semibold", active ? "text-hotpink" : "text-rose"].join(" ")}>{m.label}</span>
                </button>
              );
            })}
          </div>
          {mood && (
            <p className="mt-2.5 text-center text-xs text-rose/70 animate-fade-in">
              Logged — be gentle with yourself today ✿
            </p>
          )}
        </div>

        {/* Symptoms row — always visible under mood */}
        <div className="mt-2.5">
          <p className="mb-1.5 text-[11px] font-semibold text-rose/70 px-1">Any symptoms today?</p>
          <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
            {SYMPTOMS.map((s) => {
              const active = symptoms.includes(s.key);
              return (
                <button
                  key={s.key}
                  onClick={() => toggleSymptom(s.key)}
                  className={[
                    "shrink-0 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold border transition-all duration-200",
                    active
                      ? "bg-hotpink/15 border-hotpink/40 text-hotpink scale-105"
                      : "bg-white/70 border-petal/40 text-rose/70 hover:bg-blush/60",
                  ].join(" ")}
                >
                  <span>{s.emoji}</span> {s.label}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── WATER TRACKER ─────────────────────────────────────────────────── */}
      <section className="mt-4 sm:mt-5 stagger" style={{ animationDelay: "140ms" }}>
        <div className="rounded-3xl bg-white/85 backdrop-blur px-4 py-3.5 sm:p-4 border border-sky-100/80 shadow-[0_8px_20px_-12px_oklch(0.72_0.14_220/0.30)] flex items-center justify-between gap-4">
          <div>
            <p className="font-script text-2xl text-sky-500 leading-none">Stay hydrated 💧</p>
            <p className="text-xs text-sky-400/80 mt-0.5">Tap each glass to fill it</p>
          </div>
          <div className="flex items-end gap-3">
            {[0, 1, 2].map((i) => (
              <WaterGlass key={i} filled={waterCount > i} onTap={() => tapWater(i)} index={i} />
            ))}
          </div>
          <div className="text-right">
            <p className="font-script text-3xl text-sky-500 leading-none">{waterCount}/3</p>
            <p className="text-[10px] text-sky-400/70">glasses</p>
          </div>
        </div>
      </section>

      {/* ── TODAY'S SCHEDULE ──────────────────────────────────────────────── */}
      <section className="mt-5 sm:mt-7 stagger" style={{ animationDelay: "180ms" }}>
        <SectionTitle hint="from your calendar">What's on today</SectionTitle>
        <div className="flex flex-col gap-2">
          {/* Medication reminders */}
          {todayReminders.filter((r) => r.kind === "medication").map((r) => (
            <AgendaPill key={r.id} Icon={Pill} color="emerald" time={r.time} title={r.title} badge="Medication" />
          ))}
          {/* Event reminders */}
          {todayReminders.filter((r) => r.kind !== "medication" && r.kind !== "birthday").map((r) => {
            const meta = EVENT_META[r.category as keyof typeof EVENT_META] ?? EVENT_META.other;
            return <AgendaPill key={r.id} Icon={meta.Icon} color={meta.color} time={r.time} title={r.title} badge={meta.label} />;
          })}
          {/* Yoga */}
          {yogaToday && (
            <AgendaPill Icon={Flower2} color="hotpink" time="" title={yogaToday} badge="Yoga" />
          )}
          {/* Empty state */}
          {todayReminders.length === 0 && !yogaToday && (
            <div className="rounded-2xl border border-petal/30 bg-white/60 backdrop-blur px-4 py-3 text-center">
              <p className="text-xs text-rose/60">Nothing scheduled — a free day to bloom ✿</p>
              <a href="/app/tools/notes" className="mt-1 inline-flex items-center gap-1 text-[11px] font-semibold text-hotpink">
                Add a reminder <ArrowRight className="h-3 w-3" strokeWidth={2} />
              </a>
            </div>
          )}
        </div>
      </section>

      {/* ── AT A GLANCE ───────────────────────────────────────────────────── */}
      <section className="mt-5 sm:mt-7 stagger" style={{ animationDelay: "240ms" }}>
        <SectionTitle hint="today">At a glance</SectionTitle>
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          <GlanceCard Icon={Flower2} label="Cycle" value={`Day ${cycleDay}`} note="Bloom phase — you're radiant" tone="from-hotpink to-magenta" />
          {snapshots.map((s) => (
            <GlanceCard key={s.slug} Icon={s.Icon} label={s.label} value={s.value} note={s.note} tone="from-hotpink to-magenta" />
          ))}
        </div>
      </section>

      {/* ── QUICK ACTIONS ─────────────────────────────────────────────────── */}
      <section className="mt-5 sm:mt-7 stagger" style={{ animationDelay: "300ms" }}>
        <SectionTitle>Quick actions</SectionTitle>
        <div className="grid grid-cols-4 gap-2 sm:gap-3">
          <QuickAction href="/app/today"        Icon={Smile}       label="Log mood" />
          <QuickAction href="/budget"           Icon={Wallet}      label="Add expense" />
          <QuickAction href="/app/tools/notes"  Icon={PencilLine}  label="Reminders" />
          <QuickAction href="/app/tools/yoga"   Icon={Flower2}     label="Start yoga" />
        </div>
      </section>

      {/* ── SWEET REMINDERS & PINNED NOTES ────────────────────────────────── */}
      {(pinnedNotes.length > 0) && (
        <section className="mt-5 sm:mt-7 stagger animate-fade-in" style={{ animationDelay: "340ms" }}>
          <SectionTitle hint="notes">Pinned intentions</SectionTitle>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {pinnedNotes.slice(0, 2).map((note: any) => {
              const cls = NOTE_SHADE[note.color as keyof typeof NOTE_SHADE] ?? NOTE_SHADE.sakura;
              return (
                <div key={note.id} className={`p-3 rounded-2xl border shadow-sm ${cls}`}>
                  <h4 className="text-xs font-bold truncate">{note.title}</h4>
                  <p className="text-[11px] truncate mt-0.5 opacity-90">{note.text}</p>
                </div>
              );
            })}
            {pinnedNotes.length > 2 && (
              <p className="text-[10px] text-rose/60 text-right col-span-full">+ {pinnedNotes.length - 2} more intentions</p>
            )}
          </div>
        </section>
      )}

      {/* ── TODAY'S RITUAL ────────────────────────────────────────────────── */}
      <section className="mt-5 sm:mt-7 stagger" style={{ animationDelay: "380ms" }}>
        <SectionTitle>Today's ritual</SectionTitle>
        <div className="rounded-3xl border border-petal/50 bg-gradient-to-br from-white/90 to-blush/80 backdrop-blur p-5 sm:p-6 shadow-[0_10px_24px_-14px_oklch(0.7_0.18_350/0.3)] flex items-start gap-4">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-hotpink to-magenta text-white shadow-md shadow-hotpink/30">
            <Heart className="h-5 w-5" strokeWidth={1.6} />
          </span>
          <div className="flex-1">
            <h3 className="font-script text-2xl text-hotpink leading-none">Soften into your day</h3>
            <p className="mt-1.5 text-sm text-rose/85">
              Try a gentle 10-minute stretch, sip something warm, and step outside for a slow walk in the light.
            </p>
          </div>
        </div>
      </section>

      {/* ── TODAY'S READ ──────────────────────────────────────────────────── */}
      <section className="mt-5 sm:mt-7 stagger" style={{ animationDelay: "440ms" }}>
        <SectionTitle hint="picked for you">Today's read</SectionTitle>
        <a
          href="/app/read"
          className="group flex flex-col sm:flex-row items-stretch overflow-hidden rounded-3xl border border-petal/60 bg-white/85 backdrop-blur shadow-[0_10px_24px_-14px_oklch(0.7_0.18_350/0.3)] transition hover:-translate-y-0.5"
        >
          <div className="relative sm:w-56 h-40 sm:h-auto overflow-hidden">
            <img src="/images/read-selfcare.png" alt="" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" loading="lazy" referrerPolicy="no-referrer" />
          </div>
          <div className="p-5 flex-1 flex flex-col">
            <span className="inline-flex w-fit items-center rounded-full bg-blush text-hotpink text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 border border-petal/60">Self-care</span>
            <h3 className="mt-3 font-script text-3xl text-hotpink leading-none">Soft girl morning ritual</h3>
            <p className="mt-1.5 text-sm text-rose/80">Ten gentle minutes that change the entire tone of your day.</p>
            <div className="mt-auto pt-3 flex items-center justify-between">
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose/70">
                <Clock className="h-3 w-3" strokeWidth={1.8} /> 4 min
              </span>
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-hotpink">
                Read <ArrowRight className="h-3 w-3" strokeWidth={2} />
              </span>
            </div>
          </div>
        </a>
      </section>

      {/* ── STREAK ────────────────────────────────────────────────────────── */}
      <section className="mt-5 sm:mt-7 mb-4 stagger" style={{ animationDelay: "500ms" }}>
        <div className="rounded-3xl bg-gradient-to-r from-hotpink/10 via-petal/40 to-hotpink/10 border border-hotpink/15 p-5 text-center">
          <p className="font-script text-3xl text-hotpink leading-none">{streak} days blooming ✿</p>
          <p className="mt-1 text-xs text-rose/70">Slow and steady — that's how flowers grow.</p>
        </div>
      </section>

      <style>{`
        @keyframes today-stagger {
          from { opacity: 0; transform: translateY(14px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .stagger {
          opacity: 0;
          animation: today-stagger 0.6s cubic-bezier(0.2, 0.8, 0.2, 1) forwards;
        }
        @keyframes mood-breathe {
          0%,100% { transform: scale(1); }
          50%      { transform: scale(1.12); }
        }
        .mood-invite {
          animation: mood-breathe 2.8s ease-in-out infinite;
        }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
}

// ── Water glass SVG ─────────────────────────────────────────────────────────
function WaterGlass({ filled, onTap, index }: { filled: boolean; onTap: () => void; index: number }) {
  const id = `wg-clip-${index}`;
  return (
    <button
      onClick={onTap}
      className="flex flex-col items-center gap-1 active:scale-90 transition-transform duration-100"
      aria-label={filled ? "Glass filled" : "Tap to drink"}
    >
      <svg width="38" height="56" viewBox="0 0 38 56" fill="none">
        <defs>
          <clipPath id={id}>
            <path d="M7 3 L5 52 L33 52 L31 3 Z" />
          </clipPath>
        </defs>
        {/* Water fill — translateY slides it into the glass */}
        <rect
          x="0" y="0" width="38" height="56"
          clipPath={`url(#${id})`}
          fill="oklch(0.72 0.14 220 / 0.55)"
          style={{
            transform: filled ? "translateY(8px)" : "translateY(58px)",
            transition: "transform 0.55s cubic-bezier(0.34, 1.5, 0.64, 1)",
          }}
        />
        {/* Glass outline */}
        <path d="M7 3 L5 52 L33 52 L31 3 Z"
          stroke={filled ? "oklch(0.60 0.16 220)" : "oklch(0.76 0.20 350 / 0.45)"}
          strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"
          style={{ transition: "stroke 0.3s" }}
        />
        {/* Rim line */}
        <line x1="6" y1="3" x2="32" y2="3"
          stroke={filled ? "oklch(0.60 0.16 220)" : "oklch(0.76 0.20 350 / 0.45)"}
          strokeWidth="2.2" strokeLinecap="round"
          style={{ transition: "stroke 0.3s" }}
        />
        {/* Shine when filled */}
        {filled && (
          <line x1="12" y1="16" x2="12" y2="42" stroke="white" strokeWidth="1.8" strokeLinecap="round" opacity="0.45" />
        )}
      </svg>
      <span className="text-[10px] font-bold" style={{ color: filled ? "oklch(0.52 0.15 220)" : "oklch(0.72 0.18 350 / 0.55)" }}>
        {filled ? "✓" : "·"}
      </span>
    </button>
  );
}

// ── Agenda pill ─────────────────────────────────────────────────────────────
const AGENDA_COLORS = {
  emerald:  "bg-emerald-50  border-emerald-100 text-emerald-700",
  indigo:   "bg-indigo-50   border-indigo-100  text-indigo-700",
  sky:      "bg-sky-50      border-sky-100     text-sky-700",
  amber:    "bg-amber-50    border-amber-100   text-amber-700",
  purple:   "bg-purple-50   border-purple-100  text-purple-700",
  hotpink:  "bg-pink-50     border-pink-100    text-pink-700",
  rose:     "bg-rose-50     border-rose-100    text-rose-700",
  other:    "bg-white/80    border-petal/40    text-rose",
} as const;

const EVENT_META = {
  appointment: { Icon: CalendarDays, color: "sky",    label: "Appointment" },
  meeting:     { Icon: Briefcase,    color: "indigo",  label: "Meeting" },
  vacation:    { Icon: CalendarDays, color: "amber",   label: "Vacation" },
  social:      { Icon: Sparkles,     color: "purple",  label: "Social" },
  chore:       { Icon: CalendarDays, color: "amber",   label: "Chore" },
  gym:         { Icon: Dumbbell,     color: "rose",    label: "Gym" },
  other:       { Icon: CalendarDays, color: "other",   label: "Event" },
} as const;

function AgendaPill({ Icon, color, time, title, badge }: {
  Icon: typeof Heart; color: string; time: string; title: string; badge: string
}) {
  const cls = AGENDA_COLORS[color as keyof typeof AGENDA_COLORS] ?? AGENDA_COLORS.other;
  return (
    <div className={`flex items-center gap-3 rounded-2xl border px-3.5 py-2.5 ${cls}`}>
      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-white/70">
        <Icon className="h-4 w-4" strokeWidth={1.6} />
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-bold truncate">{title}</p>
        <p className="text-[10px] opacity-70">{badge}{time ? ` · ${time}` : ""}</p>
      </div>
    </div>
  );
}

// ── Note shade map ───────────────────────────────────────────────────────────
const NOTE_SHADE = {
  sakura:   "bg-[#FFF0F6]/80 text-[#831843] border-pink-200",
  lavender: "bg-[#F3E8FF]/80 text-[#5B21B6] border-purple-200",
  mint:     "bg-[#ECFDF5]/80 text-[#065F46] border-emerald-200",
  lemon:    "bg-[#FEFCE8]/80 text-[#854D0E] border-yellow-200",
  peach:    "bg-[#FFF5F5]/80 text-[#9C4221] border-orange-200",
} as const;

// ── Shared atoms ─────────────────────────────────────────────────────────────
function SectionTitle({ children, hint }: { children: React.ReactNode; hint?: string }) {
  return (
    <div className="mb-2.5 flex items-end justify-between gap-3">
      <h2 className="font-script text-3xl sm:text-4xl text-hotpink">{children}</h2>
      {hint && <span className="text-xs text-rose/60 pb-1">{hint}</span>}
    </div>
  );
}

function GlanceCard({ Icon, label, value, note, tone }: { Icon: typeof Heart; label: string; value: string; note: string; tone: string }) {
  return (
    <div className="rounded-3xl bg-white/85 backdrop-blur p-4 sm:p-5 border border-petal/50 shadow-[0_8px_24px_-14px_oklch(0.7_0.18_350/0.3)] transition hover:-translate-y-0.5">
      <div className="flex items-center gap-2 text-rose/80">
        <span className={`grid h-8 w-8 place-items-center rounded-full bg-gradient-to-br ${tone} text-white shadow-md shadow-hotpink/30`}>
          <Icon className="h-4 w-4" strokeWidth={1.6} />
        </span>
        <span className="text-[10px] font-bold uppercase tracking-wider">{label}</span>
      </div>
      <div className="mt-2 font-script text-3xl text-hotpink leading-none">{value}</div>
      <p className="mt-1 text-xs text-rose/75 leading-snug">{note}</p>
    </div>
  );
}

function QuickAction({ href, Icon, label }: { href: string; Icon: typeof Heart; label: string }) {
  return (
    <a
      href={href}
      className="group flex flex-col items-center justify-center gap-1.5 sm:gap-2 rounded-2xl sm:rounded-3xl bg-white/85 backdrop-blur p-2.5 sm:p-5 border border-petal/50 shadow-[0_8px_24px_-14px_oklch(0.7_0.18_350/0.3)] transition hover:-translate-y-1 hover:shadow-[0_14px_30px_-12px_oklch(0.7_0.22_350/0.45)]"
    >
      <span className="grid h-9 w-9 sm:h-12 sm:w-12 place-items-center rounded-xl sm:rounded-2xl bg-gradient-to-br from-hotpink to-magenta text-white shadow-md shadow-hotpink/30 transition group-hover:scale-105">
        <Icon className="h-4 w-4 sm:h-5 sm:w-5" strokeWidth={1.6} />
      </span>
      <span className="text-[10px] sm:text-xs font-semibold text-rose text-center leading-tight">{label}</span>
      <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-hotpink opacity-0 group-hover:opacity-100 transition">
        Open <ArrowRight className="h-2.5 w-2.5" strokeWidth={2} />
      </span>
    </a>
  );
}
