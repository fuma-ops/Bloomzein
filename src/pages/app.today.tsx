import { useEffect, useMemo, useState } from "react";
import {
  Sparkles, Flower2, Pill, Wallet, Footprints, Heart,
  PencilLine, ArrowRight, Clock, Flame, Sun, Moon, Smile,
  Cloud, CloudRain, Battery, Droplet, Activity,
} from "lucide-react";
import { BloomBubbles } from "@/components/bloom/BloomBubbles";

const NAME = "Sofia";
const STORAGE = { mood: "bloom:today-mood", streak: "bloom:streak-days" };

const MOODS = [
  { key: "calm",      label: "Calm",       Icon: Cloud },
  { key: "happy",     label: "Happy",      Icon: Smile },
  { key: "energetic", label: "Energetic",  Icon: Sparkles },
  { key: "sensitive", label: "Sensitive",  Icon: Heart },
  { key: "sad",       label: "Sad",        Icon: CloudRain },
  { key: "tired",     label: "Tired",      Icon: Battery },
  { key: "cramps",    label: "Cramps",     Icon: Activity },
  { key: "bloated",   label: "Bloated",    Icon: Droplet },
] as const;

function useCountUp(target: number, duration = 900) {
  const [v, setV] = useState(0);
  useEffect(() => {
    let raf = 0;
    const t0 = performance.now();
    const tick = (t: number) => {
      const p = Math.min((t - t0) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setV(target * eased);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return v;
}

function greeting(): { text: string; Icon: typeof Sun } {
  const h = new Date().getHours();
  if (h < 5) return { text: "Good night", Icon: Moon };
  if (h < 12) return { text: "Good morning", Icon: Sun };
  if (h < 18) return { text: "Good afternoon", Icon: Sun };
  return { text: "Good evening", Icon: Moon };
}

function fmtDate(d = new Date()) {
  return d.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });
}

export default function TodayPage() {
  const { text: hello, Icon: HelloIcon } = useMemo(greeting, []);
  const today = useMemo(() => fmtDate(), []);
  const [mood, setMood] = useState<string | null>(null);
  const [justPicked, setJustPicked] = useState<string | null>(null);

  const [reminders, setReminders] = useState<any[]>([]);
  const [pinnedNotes, setPinnedNotes] = useState<any[]>([]);

  useEffect(() => {
    try { setMood(localStorage.getItem(STORAGE.mood)); } catch {}

    try {
      const rawR = localStorage.getItem("bloom:reminders");
      if (rawR) setReminders(JSON.parse(rawR));
    } catch {}

    try {
      const rawN = localStorage.getItem("bloom:notes");
      if (rawN) {
        const parsed = JSON.parse(rawN);
        setPinnedNotes(parsed.filter((n: any) => n.pinned));
      }
    } catch {}
  }, []);

  const todayISO = useMemo(() => new Date().toISOString().slice(0, 10), []);

  const activeReminders = useMemo(() => {
    return reminders.filter((r) => !r.done && r.date <= todayISO);
  }, [reminders, todayISO]);

  const activeRemindersCount = activeReminders.length;
  const nextReminder = useMemo(() => {
    return [...activeReminders].sort((a, b) => {
      const dateDiff = a.date.localeCompare(b.date);
      if (dateDiff !== 0) return dateDiff;
      return a.time.localeCompare(b.time);
    })[0];
  }, [activeReminders]);

  const pickMood = (key: string) => {
    setMood(key);
    setJustPicked(key);
    try { localStorage.setItem(STORAGE.mood, key); } catch {}
    setTimeout(() => setJustPicked(null), 500);
  };

  // Sample data
  const steps = 6420;
  const stepsGoal = 8000;
  const spentToday = 24;
  const leftThisMonth = 840;
  const cycleDay = 14;
  const streak = 7;

  return (
    <div className="relative">
      <BloomBubbles count={10} />

      {/* GREETING HEADER */}
      <section
        className="relative overflow-hidden -mx-3 sm:-mx-6 md:mx-0 -mt-3 sm:-mt-5 md:mt-0 rounded-b-[1.75rem] sm:rounded-b-[2.5rem] md:rounded-[2.5rem] rounded-t-none md:rounded-t-[2.5rem] border-b border-petal/60 md:border md:border-t shadow-[0_20px_50px_-20px_oklch(0.6_0.27_350/0.45)] stagger"
        style={{ animationDelay: "0ms" }}
      >
        <img src="/images/today-hero.png" alt="" className="absolute inset-0 h-full w-full object-cover" referrerPolicy="no-referrer" />
        <div className="absolute inset-0 bg-gradient-to-r from-white/85 via-white/40 to-transparent" />
        <div className="relative px-4 py-5 sm:px-12 sm:py-14 max-w-xl">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-white/85 backdrop-blur px-2.5 py-0.5 sm:px-3 sm:py-1 text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-hotpink border border-petal/60">
            <HelloIcon className="h-3 w-3" strokeWidth={2} /> {today}
          </div>
          <h1 className="mt-2 sm:mt-3 font-script text-3xl sm:text-6xl text-hotpink leading-none drop-shadow-[0_2px_6px_oklch(1_0_0/0.5)]">
            {hello}, {NAME}
          </h1>
          <p className="mt-2 sm:mt-4 text-xs sm:text-lg text-rose italic leading-snug">
            "You are blooming at your own pace."
          </p>
          <div className="mt-2 sm:mt-4 inline-flex items-center gap-1.5 rounded-full bg-hotpink/10 text-hotpink text-[11px] sm:text-xs font-semibold px-2.5 py-0.5 sm:px-3 sm:py-1 border border-hotpink/20">
            <Flame className="h-3.5 w-3.5" strokeWidth={1.8} /> {streak} days blooming
          </div>
        </div>
      </section>

      {/* MOOD */}
      <section className="mt-5 sm:mt-8 stagger" style={{ animationDelay: "80ms" }}>
        <SectionTitle>How are you feeling today?</SectionTitle>
        <div className="rounded-3xl bg-white/85 backdrop-blur p-4 sm:p-5 border border-petal/50 shadow-[0_10px_24px_-14px_oklch(0.7_0.18_350/0.3)]">
          <div className="grid grid-cols-4 gap-2 sm:grid-cols-8 sm:gap-3">
            {MOODS.map((m) => {
              const active = mood === m.key;
              const bouncing = justPicked === m.key;
              return (
                <button
                  key={m.key}
                  id={`mood-${m.key}`}
                  onClick={() => pickMood(m.key)}
                  className={[
                    "group flex flex-col items-center gap-1.5 rounded-2xl p-2 sm:p-3 transition border",
                    active
                      ? "bg-hotpink/10 border-hotpink/30"
                      : "bg-transparent border-transparent hover:bg-blush/60",
                    bouncing ? "animate-bloom-bounce" : "",
                  ].join(" ")}
                >
                  <span
                    className={[
                      "grid h-11 w-11 sm:h-12 sm:w-12 place-items-center rounded-full transition",
                      active
                        ? "bg-gradient-to-br from-hotpink to-magenta text-white shadow-md shadow-hotpink/40"
                        : "bg-blush text-hotpink group-hover:bg-petal/70",
                    ].join(" ")}
                  >
                    <m.Icon className="h-5 w-5" strokeWidth={1.6} />
                  </span>
                  <span className={["text-[11px] font-semibold", active ? "text-hotpink" : "text-rose"].join(" ")}>{m.label}</span>
                </button>
              );
            })}
          </div>
          {mood && (
            <p className="mt-3 text-center text-xs text-rose/70 animate-fade-in">
              Logged — be gentle with yourself today ✿
            </p>
          )}
        </div>
      </section>

      {/* AT A GLANCE */}
      <section className="mt-6 sm:mt-8 stagger" style={{ animationDelay: "160ms" }}>
        <SectionTitle hint="today">Today at a glance</SectionTitle>
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          <GlanceCard Icon={Flower2} label="Cycle" value={`Day ${cycleDay}`} note="Bloom phase — you're radiant" tone="from-hotpink to-magenta" />
          <GlanceCard
            Icon={Pill}
            label="Reminders"
            value={activeRemindersCount > 0 ? `${activeRemindersCount} due` : "All clear"}
            note={nextReminder ? `${nextReminder.title} — at ${nextReminder.time}` : "No nudges today 🌸"}
            tone="from-hotpink to-magenta"
          />
          <BudgetGlance spent={spentToday} left={leftThisMonth} />
          <StepsGlance steps={steps} goal={stepsGoal} />
        </div>
      </section>

      {/* QUICK ACTIONS */}
      <section className="mt-6 sm:mt-8 stagger" style={{ animationDelay: "240ms" }}>
        <SectionTitle>Quick actions</SectionTitle>
        <div className="grid grid-cols-4 gap-2 sm:gap-3">
          <QuickAction href="/app/today" Icon={Smile} label="Log mood" />
          <QuickAction href="/budget" Icon={Wallet} label="Add expense" />
          <QuickAction href="/app/tools/notes" Icon={PencilLine} label="Notes & Reminders" />
          <QuickAction href="/app/tools/yoga" Icon={Flower2} label="Start yoga" />
        </div>
      </section>

      {/* SWEET REMINDERS & PINNED NOTES SECTION */}
      {(activeReminders.length > 0 || pinnedNotes.length > 0) ? (
        <section className="mt-6 sm:mt-8 stagger animate-fade-in" style={{ animationDelay: "280ms" }}>
          <SectionTitle hint="notes & reminders">Sweet reminders & pins</SectionTitle>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Reminders check list today */}
            {activeReminders.length > 0 && (
              <div className="rounded-3xl border border-pink-200/50 bg-white/90 backdrop-blur p-5 shadow-[0_8px_24px_-14px_rgba(236,72,153,0.25)] flex flex-col gap-3">
                <div className="flex items-center gap-2 text-hotpink mb-1">
                  <Pill className="h-4.5 w-4.5" />
                  <span className="font-script text-2xl leading-none">Today's Nudges</span>
                </div>
                <div className="space-y-2">
                  {activeReminders.slice(0, 4).map((rem) => (
                    <div key={rem.id} className="flex items-center gap-2.5 bg-white/50 p-2.5 rounded-2xl border border-pink-100 shadow-sm text-left">
                      <span className="text-[10px] text-hotpink bg-blush px-2 py-0.5 rounded-full font-bold">{rem.time}</span>
                      <span className="text-xs text-[#831843] font-semibold truncate flex-1">{rem.title}</span>
                    </div>
                  ))}
                  {activeReminders.length > 4 && (
                    <p className="text-[10px] text-[#9D5C7E]/70 text-right">+ {activeReminders.length - 4} more nudges</p>
                  )}
                </div>
              </div>
            )}

            {/* Pinned sticky notes list */}
            {pinnedNotes.length > 0 && (
              <div className="rounded-3xl border border-pink-200/50 bg-white/90 backdrop-blur p-5 shadow-[0_8px_24px_-14px_rgba(236,72,153,0.25)] flex flex-col gap-3">
                <div className="flex items-center gap-2 text-hotpink mb-1">
                  <Sparkles className="h-4.5 w-4.5 animate-pulse" />
                  <span className="font-script text-2xl leading-none">Pinned Intentions</span>
                </div>
                <div className="grid grid-cols-1 gap-2">
                  {pinnedNotes.slice(0, 2).map((note: any) => {
                    const getShadeStyles = (color: string) => {
                      switch (color) {
                        case "sakura": return "bg-[#FFF0F6]/80 text-[#831843] border-pink-200";
                        case "lavender": return "bg-[#F3E8FF]/80 text-[#5B21B6] border-purple-200";
                        case "mint": return "bg-[#ECFDF5]/80 text-[#065F46] border-emerald-200";
                        case "lemon": return "bg-[#FEFCE8]/80 text-[#854D0E] border-yellow-200";
                        case "peach": return "bg-[#FFF5F5]/80 text-[#9C4221] border-orange-200";
                        default: return "bg-[#FFF0F6]/80 text-[#831843] border-pink-200";
                      }
                    };
                    const cls = getShadeStyles(note.color);
                    return (
                      <div key={note.id} className={`p-2.5 rounded-2xl border shadow-sm text-left ${cls}`}>
                        <h4 className="text-xs font-bold truncate">{note.title}</h4>
                        <p className="text-[11px] truncate mt-0.5 opacity-90">{note.text}</p>
                      </div>
                    );
                  })}
                  {pinnedNotes.length > 2 && (
                    <p className="text-[10px] text-[#9D5C7E]/70 text-right">+ {pinnedNotes.length - 2} more intentions</p>
                  )}
                </div>
              </div>
            )}
          </div>
        </section>
      ) : null}

      {/* RITUAL */}
      <section className="mt-6 sm:mt-8 stagger" style={{ animationDelay: "320ms" }}>
        <SectionTitle>Today's ritual</SectionTitle>
        <div className="rounded-3xl border border-petal/50 bg-gradient-to-br from-white/90 to-blush/80 backdrop-blur p-5 sm:p-6 shadow-[0_10px_24px_-14px_oklch(0.7_0.18_350/0.3)] flex items-start gap-4">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-hotpink to-magenta text-white shadow-md shadow-hotpink/30">
            <Heart className="h-5 w-5" strokeWidth={1.6} />
          </span>
          <div className="flex-1">
            <h3 className="font-script text-2xl text-hotpink leading-none">Soften into your day</h3>
            <p className="mt-1.5 text-sm text-rose/85">
              You're in your bloom phase — try a gentle 10-minute stretch, sip something warm, and step outside for a slow walk in the light.
            </p>
          </div>
        </div>
      </section>

      {/* FOR YOU READ */}
      <section className="mt-6 sm:mt-8 stagger" style={{ animationDelay: "400ms" }}>
        <SectionTitle hint="picked for you">Today's read</SectionTitle>
        <a
          href="/app/read"
          className="group flex flex-col sm:flex-row items-stretch overflow-hidden rounded-3xl border border-petal/60 bg-white/85 backdrop-blur shadow-[0_10px_24px_-14px_oklch(0.7_0.18_350/0.3)] transition hover:-translate-y-0.5"
        >
          <div className="relative sm:w-64 h-44 sm:h-auto overflow-hidden">
            <img src="/images/read-selfcare.png" alt="" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" loading="lazy" referrerPolicy="no-referrer" />
          </div>
          <div className="p-5 sm:p-6 flex-1 flex flex-col">
            <span className="inline-flex w-fit items-center rounded-full bg-blush text-hotpink text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 border border-petal/60">
              Self-care
            </span>
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

      {/* STREAK */}
      <section className="mt-6 sm:mt-8 mb-4 stagger" style={{ animationDelay: "480ms" }}>
        <div className="rounded-3xl bg-gradient-to-r from-hotpink/10 via-petal/40 to-hotpink/10 border border-hotpink/15 p-5 text-center">
          <p className="font-script text-3xl text-hotpink leading-none">{streak} days blooming ✿</p>
          <p className="mt-1 text-xs text-rose/70">Slow and steady — that's how flowers grow.</p>
        </div>
      </section>

      <style>{`
        @keyframes today-stagger {
          from { opacity: 0; transform: translateY(14px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .stagger {
          opacity: 0;
          animation: today-stagger 0.6s cubic-bezier(0.2, 0.8, 0.2, 1) forwards;
        }
      `}</style>
    </div>
  );
}

/* ---------- atoms ---------- */
function SectionTitle({ children, hint }: { children: React.ReactNode; hint?: string }) {
  return (
    <div className="mb-3 flex items-end justify-between gap-3">
      <h2 className="font-script text-3xl sm:text-4xl text-hotpink">{children}</h2>
      {hint && <span className="text-xs text-rose/70">{hint}</span>}
    </div>
  );
}

function GlanceCard({
  Icon, label, value, note, tone,
}: { Icon: typeof Heart; label: string; value: string; note: string; tone: string }) {
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

function BudgetGlance({ spent, left }: { spent: number; left: number }) {
  const s = Math.round(useCountUp(spent));
  const l = Math.round(useCountUp(left));
  return (
    <div className="rounded-3xl bg-white/85 backdrop-blur p-4 sm:p-5 border border-petal/50 shadow-[0_8px_24px_-14px_oklch(0.7_0.18_350/0.3)] transition hover:-translate-y-0.5">
      <div className="flex items-center gap-2 text-rose/80">
        <span className="grid h-8 w-8 place-items-center rounded-full bg-gradient-to-br from-hotpink to-magenta text-white shadow-md shadow-hotpink/30">
          <Wallet className="h-4 w-4" strokeWidth={1.6} />
        </span>
        <span className="text-[10px] font-bold uppercase tracking-wider">Budget</span>
      </div>
      <div className="mt-2 font-script text-3xl text-hotpink leading-none">${s} <span className="text-base font-sans text-rose/70">today</span></div>
      <p className="mt-1 text-xs text-rose/75">${l} left this month</p>
    </div>
  );
}

function StepsGlance({ steps, goal }: { steps: number; goal: number }) {
  const v = Math.round(useCountUp(steps));
  const pct = Math.min(100, Math.round((steps / goal) * 100));
  return (
    <div className="rounded-3xl bg-white/85 backdrop-blur p-4 sm:p-5 border border-petal/50 shadow-[0_8px_24px_-14px_oklch(0.7_0.18_350/0.3)] transition hover:-translate-y-0.5">
      <div className="flex items-center gap-2 text-rose/80">
        <span className="grid h-8 w-8 place-items-center rounded-full bg-gradient-to-br from-hotpink to-magenta text-white shadow-md shadow-hotpink/30">
          <Footprints className="h-4 w-4" strokeWidth={1.6} />
        </span>
        <span className="text-[10px] font-bold uppercase tracking-wider">Steps</span>
      </div>
      <div className="mt-2 font-script text-3xl text-hotpink leading-none">{v.toLocaleString()}</div>
      <div className="mt-1.5 h-1.5 rounded-full bg-blush overflow-hidden">
        <div className="h-full rounded-full bg-gradient-to-r from-hotpink to-magenta transition-all duration-700" style={{ width: `${pct}%` }} />
      </div>
      <p className="mt-1 text-xs text-rose/75">Try a 15-min slow yoga flow tonight</p>
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
