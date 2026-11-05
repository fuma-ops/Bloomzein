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
import { phaseForDay, writeCycleSettings, type CyclePhase } from "./cyclePhase";
import type { ToolLang } from "@/lib/toolPagesI18n";
import { PT, LOCALE } from "./publicToolI18n";

type Phase = Exclude<CyclePhase, "any">;

const PHASE_UI: Record<Phase, { tint: string; chip: string; Icon: typeof Droplet }> = {
  period:     { tint: "from-hotpink/15 to-rose/5",   chip: "bg-hotpink text-white",        Icon: Droplet },
  follicular: { tint: "from-pink-200/40 to-petal/10", chip: "bg-pink-100 text-hotpink",     Icon: Sprout },
  fertile:    { tint: "from-rose/15 to-petal/10",     chip: "bg-pink-100 text-hotpink",     Icon: Flower2 },
  ovulation:  { tint: "from-rose-200/50 to-petal/10", chip: "bg-rose-200 text-magenta",     Icon: Star },
  luteal:     { tint: "from-rose-100/50 to-petal/10", chip: "bg-rose-100 text-rose-500",    Icon: Moon },
};

const MS = 86_400_000;
const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
const fmtWith = (loc: string | undefined) => (d: Date) => d.toLocaleDateString(loc, { weekday: "short", day: "numeric", month: "long" });
const fmtShortWith = (loc: string | undefined) => (d: Date) => d.toLocaleDateString(loc, { day: "numeric", month: "short" });
const toInput = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

export function PublicCycleCalculator({ lang = "en" }: { lang?: ToolLang }) {
  const T = PT[lang], C = T.cycle;
  // English keeps the visitor's own locale (as before); FR/AR use their language.
  const loc = lang === "en" ? undefined : LOCALE[lang];
  const fmt = fmtWith(loc), fmtShort = fmtShortWith(loc);
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
        <h2 className={lang === "ar" ? "text-xl font-extrabold text-hotpink sm:text-2xl" : "font-script text-2xl text-hotpink sm:text-3xl"}>{C.title}</h2>
      </div>
      <p className="mt-1 text-[13px] text-rose/70">{C.lead}</p>

      {/* inputs */}
      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <label className="block">
          <span className="text-[11px] font-bold uppercase tracking-wide text-rose/55">{C.lastStart}</span>
          <input type="date" value={last} max={toInput(today)} onChange={(e) => { setLast(e.target.value); setSaved(false); }}
            className="mt-1 w-full rounded-2xl border border-petal/60 bg-white px-3 py-2.5 text-[14px] font-semibold text-[#831843] outline-none focus:border-hotpink" />
        </label>
        <label className="block">
          <span className="text-[11px] font-bold uppercase tracking-wide text-rose/55">{C.cycleLen}</span>
          <input type="number" min={20} max={45} value={cycleLength} onChange={(e) => { setCycleLength(+e.target.value); setSaved(false); }}
            className="mt-1 w-full rounded-2xl border border-petal/60 bg-white px-3 py-2.5 text-[14px] font-semibold text-[#831843] outline-none focus:border-hotpink" />
        </label>
        <label className="block">
          <span className="text-[11px] font-bold uppercase tracking-wide text-rose/55">{C.periodLen}</span>
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
                {T.phaseWord(T.phaseName[result.phase])}
              </span>
              <span className="text-[12px] font-bold text-rose/70">{C.dayOf(result.dayNumber)}</span>
            </div>
            <p className="mt-2 text-[13.5px] leading-relaxed text-[#7a1247]">{C.insight[result.phase]}</p>
          </div>

          {/* key dates */}
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            <Stat label={C.nextPeriod} value={fmt(result.nextPeriod)} sub={result.daysToPeriod === 0 ? C.today : C.inDays(result.daysToPeriod)} Icon={Droplet} />
            <Stat label={C.ovulation} value={fmt(result.ovulation)} sub={C.peak} Icon={Star} />
            <Stat label={C.fertile} value={`${fmtShort(result.fertileStart)} – ${fmtShort(result.fertileEnd)}`} sub={C.higher} Icon={Flower2} />
          </div>

          {/* upcoming periods */}
          <div className="mt-3 rounded-2xl border border-petal/50 bg-white/70 p-4">
            <p className="text-[11px] font-bold uppercase tracking-wide text-rose/55">{C.next3}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {result.upcoming.map((d, i) => (
                <span key={i} className="rounded-full bg-hotpink/8 px-3 py-1 text-[12.5px] font-bold text-hotpink">{fmt(d)}</span>
              ))}
            </div>
          </div>

          {/* save / convert */}
          <div className="mt-4 rounded-2xl bg-gradient-to-br from-hotpink to-[#db2777] p-5 text-center text-white">
            <p className={lang === "ar" ? "text-xl font-extrabold" : "font-script text-2xl"}>{C.saveTitle}</p>
            <p className="mx-auto mt-1 max-w-sm text-[13px] text-white/90">
              {C.saveText}
            </p>
            <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
              <a href="/onboarding" className="inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-[15px] font-bold text-hotpink transition hover:bg-white/90">
                <Sparkles className="h-4 w-4" /> {T.createFree}
              </a>
              <button onClick={save} className="inline-flex items-center gap-1.5 rounded-full border border-white/50 px-5 py-3 text-[14px] font-bold text-white transition hover:bg-white/10">
                {saved ? C.savedDevice : C.saveDevice} <ArrowRight className={["h-4 w-4", lang === "ar" ? "rotate-180" : ""].join(" ")} />
              </button>
            </div>
            {saved && <p className="mt-2 text-[11px] text-white/80">{C.savedNote}</p>}
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
