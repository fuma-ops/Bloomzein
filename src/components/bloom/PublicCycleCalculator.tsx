// Public, fully-functional cycle calculator for the /tools/cycle-tracker SEO
// landing page. A visitor who googles "calculate my cycle online" lands here
// and gets a REAL working calculator — no sign-up wall — then a warm CTA to
// create a free account to save it and unlock the full phase-synced plan.
//
// It uses the SAME phase math as the in-app tracker (phaseForDay from
// cyclePhase.ts) so the result is identical to what she'll see inside the app —
// one source of truth, no private copy of the calculation (see CLAUDE.md §9).
import { useMemo, useState } from "react";
import { ArrowRight, Sparkles, Droplet, Sprout, Flower2, Star, Moon, CalendarHeart } from "lucide-react";
import type { CycleSettings } from "./PeriodSetup";
import { phaseForDay, PHASE_LABEL, writeCycleSettings, type CyclePhase } from "./cyclePhase";

type Phase = Exclude<CyclePhase, "any">;

const PHASE_UI: Record<Phase, { tint: string; chip: string; Icon: typeof Droplet; insight: string }> = {
  period:     { tint: "from-hotpink/15 to-rose/5",   chip: "bg-hotpink text-white",        Icon: Droplet, insight: "Your body is resting and renewing. Be extra gentle today — cosy comfort, warm food and light movement." },
  follicular: { tint: "from-pink-200/40 to-petal/10", chip: "bg-pink-100 text-hotpink",     Icon: Sprout,  insight: "Energy is rising. A great window for fresh starts, focus and building momentum." },
  fertile:    { tint: "from-rose/15 to-petal/10",     chip: "bg-pink-100 text-hotpink",     Icon: Flower2, insight: "You're glowing — a lovely time for connection, creativity and confidence." },
  ovulation:  { tint: "from-rose-200/50 to-petal/10", chip: "bg-rose-200 text-magenta",     Icon: Star,    insight: "You're at your peak. Channel this radiant energy into your boldest ideas." },
  luteal:     { tint: "from-rose-100/50 to-petal/10", chip: "bg-rose-100 text-rose-500",    Icon: Moon,    insight: "Energy is winding down. Prioritise rest, warm food and gentle self-care." },
};

const MS = 86_400_000;
const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
const fmt = (d: Date) => d.toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "long" });
const fmtShort = (d: Date) => d.toLocaleDateString(undefined, { day: "numeric", month: "short" });
const toInput = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

export function PublicCycleCalculator() {
  const today = useMemo(() => { const n = new Date(); return new Date(n.getFullYear(), n.getMonth(), n.getDate()); }, []);
  const [last, setLast] = useState(() => toInput(addDays(new Date(), -7)));
  const [cycleLength, setCycleLength] = useState(28);
  const [periodLength, setPeriodLength] = useState(5);
  const [saved, setSaved] = useState(false);

  const result = useMemo(() => {
    const [y, m, d] = last.split("-").map(Number);
    if (!y || !m || !d) return null;
    const lastPeriodStart = new Date(y, m - 1, d);
    const cl = Math.min(45, Math.max(20, cycleLength || 28));
    const pl = Math.min(10, Math.max(1, periodLength || 5));
    const s: CycleSettings = {
      lastPeriodStart, cycleLength: cl, periodLength: pl,
      trackerMode: "protection", contraceptiveReminder: false, contraceptiveMethod: "pill",
      reminderHour: "21:00", deviceNotifications: false,
    };

    // Where is TODAY in the cycle? (same math as the app)
    const diff = Math.floor((today.getTime() - lastPeriodStart.getTime()) / MS);
    const dayIndex = ((diff % cl) + cl) % cl;          // 0-based day of cycle
    const cycleStart = addDays(today, -dayIndex);       // most recent period start on/before today
    const phase = phaseForDay(today, s);

    const ovIndex = cl - 14;
    let ovulation = addDays(cycleStart, ovIndex);
    if (ovulation < today) ovulation = addDays(ovulation, cl);
    const fertileStart = addDays(ovulation, -4);
    const fertileEnd = addDays(ovulation, 2);

    let nextPeriod = addDays(cycleStart, cl);
    if (nextPeriod <= today) nextPeriod = addDays(nextPeriod, cl);
    const daysToPeriod = Math.round((nextPeriod.getTime() - today.getTime()) / MS);

    const upcoming = Array.from({ length: 3 }, (_, i) => addDays(nextPeriod, i * cl));

    return { s, phase, dayNumber: dayIndex + 1, ovulation, fertileStart, fertileEnd, nextPeriod, daysToPeriod, upcoming };
  }, [last, cycleLength, periodLength, today]);

  const save = () => {
    if (!result) return;
    try { writeCycleSettings(result.s); setSaved(true); } catch {}
  };

  return (
    <section className="rounded-[1.75rem] border border-petal/60 bg-white/80 p-5 shadow-[0_18px_50px_-30px_rgba(236,72,153,0.5)] sm:p-7">
      <div className="flex items-center gap-2">
        <span className="grid h-9 w-9 place-items-center rounded-full bg-hotpink/12 text-hotpink"><CalendarHeart className="h-5 w-5" strokeWidth={2} /></span>
        <h2 className="font-script text-2xl text-hotpink sm:text-3xl">Calculate your cycle — free</h2>
      </div>
      <p className="mt-1 text-[13px] text-rose/70">Enter your last period and get your phase today, your fertile window, ovulation day and next period — instantly.</p>

      {/* inputs */}
      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <label className="block">
          <span className="text-[11px] font-bold uppercase tracking-wide text-rose/55">First day of last period</span>
          <input type="date" value={last} max={toInput(today)} onChange={(e) => { setLast(e.target.value); setSaved(false); }}
            className="mt-1 w-full rounded-2xl border border-petal/60 bg-white px-3 py-2.5 text-[14px] font-semibold text-[#831843] outline-none focus:border-hotpink" />
        </label>
        <label className="block">
          <span className="text-[11px] font-bold uppercase tracking-wide text-rose/55">Cycle length (days)</span>
          <input type="number" min={20} max={45} value={cycleLength} onChange={(e) => { setCycleLength(+e.target.value); setSaved(false); }}
            className="mt-1 w-full rounded-2xl border border-petal/60 bg-white px-3 py-2.5 text-[14px] font-semibold text-[#831843] outline-none focus:border-hotpink" />
        </label>
        <label className="block">
          <span className="text-[11px] font-bold uppercase tracking-wide text-rose/55">Period length (days)</span>
          <input type="number" min={1} max={10} value={periodLength} onChange={(e) => { setPeriodLength(+e.target.value); setSaved(false); }}
            className="mt-1 w-full rounded-2xl border border-petal/60 bg-white px-3 py-2.5 text-[14px] font-semibold text-[#831843] outline-none focus:border-hotpink" />
        </label>
      </div>

      {result && (
        <div className="mt-5 animate-fade-in">
          {/* phase today */}
          <div className={`rounded-[1.5rem] bg-gradient-to-br ${PHASE_UI[result.phase].tint} p-5`}>
            <div className="flex items-center gap-2">
              <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-black uppercase tracking-wide ${PHASE_UI[result.phase].chip}`}>
                {(() => { const I = PHASE_UI[result.phase].Icon; return <I className="h-3.5 w-3.5" strokeWidth={2.4} />; })()}
                {PHASE_LABEL[result.phase]} phase
              </span>
              <span className="text-[12px] font-bold text-rose/70">Day {result.dayNumber} of your cycle</span>
            </div>
            <p className="mt-2 text-[13.5px] leading-relaxed text-[#7a1247]">{PHASE_UI[result.phase].insight}</p>
          </div>

          {/* key dates */}
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            <Stat label="Next period" value={fmt(result.nextPeriod)} sub={result.daysToPeriod === 0 ? "today" : `in ${result.daysToPeriod} days`} Icon={Droplet} />
            <Stat label="Ovulation (est.)" value={fmt(result.ovulation)} sub="peak fertility" Icon={Star} />
            <Stat label="Fertile window" value={`${fmtShort(result.fertileStart)} – ${fmtShort(result.fertileEnd)}`} sub="higher chance" Icon={Flower2} />
          </div>

          {/* upcoming periods */}
          <div className="mt-3 rounded-2xl border border-petal/50 bg-white/70 p-4">
            <p className="text-[11px] font-bold uppercase tracking-wide text-rose/55">Your next 3 periods</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {result.upcoming.map((d, i) => (
                <span key={i} className="rounded-full bg-hotpink/8 px-3 py-1 text-[12.5px] font-bold text-hotpink">{fmt(d)}</span>
              ))}
            </div>
          </div>

          {/* save / convert */}
          <div className="mt-4 rounded-2xl bg-gradient-to-br from-hotpink to-[#db2777] p-5 text-center text-white">
            <p className="font-script text-2xl">Save your cycle & unlock everything ✿</p>
            <p className="mx-auto mt-1 max-w-sm text-[13px] text-white/90">
              Create your free account to save this, get daily phase insights, and sync your meals, workouts and yoga to your cycle — automatically.
            </p>
            <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
              <a href="/onboarding" className="inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-[15px] font-bold text-hotpink transition hover:bg-white/90">
                <Sparkles className="h-4 w-4" /> Create my free account
              </a>
              <button onClick={save} className="inline-flex items-center gap-1.5 rounded-full border border-white/50 px-5 py-3 text-[14px] font-bold text-white transition hover:bg-white/10">
                {saved ? "Saved on this device ✓" : "Save on this device"} <ArrowRight className="h-4 w-4" />
              </button>
            </div>
            {saved && <p className="mt-2 text-[11px] text-white/80">Saved here — it'll sync automatically when you create your account.</p>}
          </div>
        </div>
      )}
    </section>
  );
}

function Stat({ label, value, sub, Icon }: { label: string; value: string; sub: string; Icon: typeof Droplet }) {
  return (
    <div className="rounded-2xl border border-petal/50 bg-white/75 p-4">
      <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-rose/55"><Icon className="h-3.5 w-3.5 text-hotpink" strokeWidth={2.2} /> {label}</span>
      <p className="mt-1 text-[15px] font-extrabold leading-tight text-[#831843]">{value}</p>
      <p className="text-[11.5px] font-semibold text-rose/60">{sub}</p>
    </div>
  );
}
