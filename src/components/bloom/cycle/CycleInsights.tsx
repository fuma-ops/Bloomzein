import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { Sparkles, Lock, Download, Droplet, TrendingUp, Brain, HeartPulse } from "lucide-react";
import { usePremium, openPaywall } from "@/lib/entitlements";
import { readSymptomsLog } from "@/lib/crossToolData";
import { readCycleSettings, phaseForDay } from "@/components/bloom/cyclePhase";
import { recentCycleLengths, cycleRegularity, avgCycleLength, readPeriodStarts, PERIOD_EVENT } from "@/lib/periodLog";

/**
 * Bloom+ "Cycle insights" — real, personal findings read from HER own logs
 * (mood & symptoms mapped to her cycle phase, her learned rhythm), not the
 * setup numbers echoed back. Styled to live inside the Cycle Tracker.
 */
const CARD: React.CSSProperties = {
  background: "rgba(255,255,255,0.72)",
  backdropFilter: "blur(20px)",
  WebkitBackdropFilter: "blur(20px)",
  borderRadius: "22px",
  padding: "16px",
  boxShadow: "0 8px 24px rgba(236,72,153,0.12), 0 1px 3px rgba(0,0,0,0.05)",
  border: "1px solid rgba(255,255,255,0.55)",
};
const EST = "#EC4899";
const PROG = "#9D174D";
const PHASE_LABEL: Record<string, string> = { menstrual: "Menstrual", follicular: "Follicular", fertile: "Fertile", ovulation: "Ovulation", luteal: "Luteal" };
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

type Props = { cycleLength: number; periodLength: number; cycleDay: number; nextPeriodDate: Date; msDay: number };

function estrogen(d: number, len: number, ov: number) {
  const primary = Math.exp(-Math.pow(d - (ov - 1), 2) / (2 * Math.pow(len * 0.085, 2)));
  const luteal = 0.4 * Math.exp(-Math.pow(d - (ov + 7), 2) / (2 * Math.pow(len * 0.12, 2)));
  return Math.min(1, primary + luteal);
}
function progesterone(d: number, len: number, ov: number) {
  if (d < ov) return 0.04;
  return Math.min(1, 0.04 + Math.exp(-Math.pow(d - (ov + 6), 2) / (2 * Math.pow(len * 0.11, 2))));
}
const fmt = (d: Date) => d.toLocaleDateString("en-US", { month: "short", day: "numeric" });

/** Build the real findings from her logs (mood & symptoms mapped to phase). */
function findings() {
  const s = readCycleSettings();
  let moodLog: Record<string, string> = {};
  try { moodLog = JSON.parse(localStorage.getItem("bloom:mood-log-v2") || "{}"); } catch {}
  const symLog = readSymptomsLog();

  const moodByPhase: Record<string, Record<string, number>> = {};
  const symByPhase: Record<string, number> = {};
  const symName: Record<string, Record<string, number>> = {};

  Object.entries(moodLog).forEach(([iso, mood]) => {
    if (!mood) return;
    const ph = phaseForDay(new Date(iso + "T00:00:00"), s);
    (moodByPhase[ph] ||= {})[mood] = ((moodByPhase[ph] || {})[mood] || 0) + 1;
  });
  Object.entries(symLog).forEach(([iso, arr]) => {
    if (!arr || !arr.length) return;
    const ph = phaseForDay(new Date(iso + "T00:00:00"), s);
    symByPhase[ph] = (symByPhase[ph] || 0) + arr.length;
    arr.forEach((sy) => ((symName[ph] ||= {})[sy] = ((symName[ph] || {})[sy] || 0) + 1));
  });

  const out: { Icon: typeof Brain; text: ReactNode }[] = [];

  let bestMood: { ph: string; mood: string; n: number } | null = null;
  Object.entries(moodByPhase).forEach(([ph, m]) => {
    const [mood, n] = Object.entries(m).sort((a, b) => b[1] - a[1])[0];
    if (n >= 2 && (!bestMood || n > bestMood.n)) bestMood = { ph, mood, n };
  });
  if (bestMood) {
    const bm: { ph: string; mood: string; n: number } = bestMood;
    out.push({ Icon: Brain, text: <>In your <b style={{ color: "#BE185D" }}>{PHASE_LABEL[bm.ph]}</b> phase you most often feel <b style={{ color: "#BE185D" }}>{cap(bm.mood)}</b>.</> });
  }

  const tough = Object.entries(symByPhase).sort((a, b) => b[1] - a[1])[0];
  if (tough && tough[1] >= 2) {
    const top = Object.entries(symName[tough[0]] || {}).sort((a, b) => b[1] - a[1])[0];
    out.push({ Icon: HeartPulse, text: <>Your toughest phase is <b style={{ color: "#BE185D" }}>{PHASE_LABEL[tough[0]]}</b>{top ? <> — most often <b style={{ color: "#BE185D" }}>{cap(top[0])}</b></> : null}.</> });
  }

  const lens = recentCycleLengths(4);
  const reg = cycleRegularity();
  if (lens.length >= 2) {
    out.push({ Icon: TrendingUp, text: <>Your recent cycles: <b style={{ color: "#BE185D" }}>{lens.join(" · ")}d</b> — {reg === "regular" ? "regular ✓" : "a little irregular"}.</> });
  }

  return { out, startsN: readPeriodStarts().length };
}

export function CycleInsights({ cycleLength, periodLength, cycleDay, nextPeriodDate, msDay }: Props) {
  const premium = usePremium();
  const [exported, setExported] = useState(false);
  const [, force] = useState(0);
  useEffect(() => {
    const r = () => force((n) => n + 1);
    window.addEventListener(PERIOD_EVENT, r);
    window.addEventListener("storage", r);
    return () => { window.removeEventListener(PERIOD_EVENT, r); window.removeEventListener("storage", r); };
  }, []);

  const learnedLen = avgCycleLength() ?? cycleLength;
  const ov = learnedLen - 14;
  const { out, startsN } = findings();
  const enough = out.length > 0;

  const VW = 300, VH = 84, PX = 6, PT = 10, CH = 54;
  const cw = VW - PX * 2;
  const xAt = (d: number) => PX + ((d - 1) / (learnedLen - 1)) * cw;
  const yAt = (v: number) => PT + (1 - v) * CH;
  const path = (fn: (d: number) => number) => { let p = ""; for (let d = 1; d <= learnedLen; d++) p += `${d === 1 ? "M" : "L"} ${xAt(d).toFixed(1)} ${yAt(fn(d)).toFixed(1)} `; return p.trim(); };
  const estPath = path((d) => estrogen(d, learnedLen, ov));
  const progPath = path((d) => progesterone(d, learnedLen, ov));
  const todayX = xAt(Math.min(learnedLen, Math.max(1, cycleDay)));
  const nexts = [0, 1, 2].map((i) => new Date(nextPeriodDate.getTime() + i * learnedLen * msDay));

  const exportData = () => {
    try {
      const payload = {
        exportedAt: new Date().toISOString(),
        cycle: { learnedCycleLength: learnedLen, periodLength, currentDay: cycleDay, nextPeriod: nextPeriodDate.toISOString() },
        periodStarts: readPeriodStarts(),
        symptomLog: readSymptomsLog(),
        moodLog: JSON.parse(localStorage.getItem("bloom:mood-log-v2") || "{}"),
        pillLog: JSON.parse(localStorage.getItem("bloom:pill-log-v2") || "{}"),
      };
      const url = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" }));
      const a = document.createElement("a"); a.href = url; a.download = "bloomzein-cycle-history.json";
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setExported(true); setTimeout(() => setExported(false), 2200);
    } catch {}
  };

  const Curve = ({ dim = false }: { dim?: boolean }) => (
    <svg viewBox={`0 0 ${VW} ${VH}`} width="100%" style={{ display: "block", opacity: dim ? 0.5 : 1, filter: dim ? "blur(2px)" : "none" }}>
      <line x1={todayX} y1={PT - 3} x2={todayX} y2={PT + CH} stroke="rgba(157,23,77,0.3)" strokeWidth="1.5" strokeDasharray="3 3" />
      <path d={estPath} fill="none" stroke={EST} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      <path d={progPath} fill="none" stroke={PROG} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      <line x1={PX} y1={PT + CH} x2={VW - PX} y2={PT + CH} stroke="rgba(236,72,153,0.15)" strokeWidth="1" />
    </svg>
  );

  return (
    <div style={CARD}>
      <div className="flex items-center justify-between gap-2 mb-1">
        <p className="font-script leading-none" style={{ fontSize: "22px", color: "#DB2777" }}>Cycle insights</p>
        <span className="inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[8px] font-black uppercase tracking-wide text-white" style={{ background: "linear-gradient(135deg,#B76E79,#EC4899)" }}>
          <Sparkles className="h-2.5 w-2.5" strokeWidth={2.6} /> Bloom+
        </span>
      </div>
      <p className="text-[11px] leading-snug mb-3" style={{ color: "#9D5C7E" }}>Patterns in your own logs — what your body tends to do, phase by phase.</p>

      {premium ? (
        <div className="space-y-3 animate-fade-in">
          {enough ? (
            <div className="space-y-2">
              {out.map((f, i) => (
                <div key={i} className="flex items-start gap-2.5 rounded-2xl px-3 py-2.5" style={{ background: "rgba(252,231,243,0.5)" }}>
                  <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full text-white" style={{ background: "linear-gradient(135deg,#EC4899,#DB2777)" }}><f.Icon className="h-3.5 w-3.5" strokeWidth={2} /></span>
                  <p className="text-[12.5px] leading-snug" style={{ color: "#7A3B5B" }}>{f.text}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl px-3 py-3 text-center" style={{ background: "rgba(252,231,243,0.5)" }}>
              <p className="text-[12px] font-semibold" style={{ color: "#BE185D" }}>Your patterns are still forming ✿</p>
              <p className="text-[11px] mt-0.5" style={{ color: "#9D5C7E" }}>Log your mood, symptoms &amp; periods for a couple of weeks — personal findings appear right here.</p>
            </div>
          )}

          <div>
            <p className="text-[10px] font-bold uppercase tracking-wide mb-1.5" style={{ color: "#9D5C7E" }}>Next periods {startsN > 1 ? "· tuned to your logs" : ""}</p>
            <div className="flex flex-wrap gap-1.5">
              {nexts.map((d, i) => (
                <span key={i} className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold" style={{ background: i === 0 ? "#DB2777" : "rgba(252,231,243,0.8)", color: i === 0 ? "#fff" : "#BE185D" }}>
                  <Droplet className="h-3 w-3" /> {fmt(d)}
                </span>
              ))}
            </div>
          </div>

          <div className="rounded-2xl p-2.5" style={{ background: "rgba(255,255,255,0.55)", border: "1px solid rgba(236,72,153,0.12)" }}>
            <div className="flex items-center justify-between mb-1">
              <p className="text-[10px] font-bold uppercase tracking-wide" style={{ color: "#9D5C7E" }}>Estimated hormones</p>
              <div className="flex items-center gap-2.5 text-[9px] font-bold">
                <span style={{ color: EST }}>Estrogen</span><span style={{ color: PROG }}>Progesterone</span>
              </div>
            </div>
            <Curve />
          </div>

          <button onClick={exportData} className="w-full inline-flex items-center justify-center gap-1.5 rounded-full py-2.5 text-[13px] font-bold text-white active:scale-95 transition" style={{ background: "linear-gradient(135deg,#EC4899,#DB2777)", boxShadow: "0 6px 16px rgba(219,39,119,0.35)" }}>
            <Download className="h-4 w-4" /> {exported ? "Exported ✓" : "Export my cycle history"}
          </button>
        </div>
      ) : (
        <button onClick={() => openPaywall("cycle")} className="w-full text-left group">
          <div className="relative rounded-2xl overflow-hidden p-2.5" style={{ background: "rgba(255,255,255,0.5)", border: "1px solid rgba(236,72,153,0.12)" }}>
            <Curve dim />
            <div className="absolute inset-0 grid place-items-center" style={{ background: "linear-gradient(180deg, rgba(252,231,243,0.35), rgba(252,231,243,0.7))" }}>
              <div className="text-center px-4">
                <span className="mx-auto mb-1.5 grid h-9 w-9 place-items-center rounded-full text-white animate-icon-breathe" style={{ background: "linear-gradient(135deg,#B76E79,#EC4899)" }}><Lock className="h-4 w-4" /></span>
                <p className="font-script leading-none" style={{ fontSize: "18px", color: "#DB2777" }}>See your patterns</p>
                <p className="text-[10.5px] font-semibold mt-0.5" style={{ color: "#9D5C7E" }}>What your body does phase-by-phase — with Bloom+</p>
              </div>
            </div>
          </div>
          <span className="mt-2.5 inline-flex w-full items-center justify-center gap-1.5 rounded-full py-2.5 text-[13px] font-bold text-white group-active:scale-95 transition" style={{ background: "linear-gradient(135deg,#B76E79,#EC4899)", boxShadow: "0 6px 16px rgba(183,110,121,0.35)" }}>
            <Sparkles className="h-4 w-4" strokeWidth={2} /> See my Cycle insights
          </span>
        </button>
      )}
    </div>
  );
}
