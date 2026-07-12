import { useState } from "react";
import { Sparkles, Lock, Download, Droplet, HeartPulse, TrendingUp } from "lucide-react";
import { usePremium, openPaywall } from "@/lib/entitlements";
import { readSymptomsLog } from "@/lib/crossToolData";

/**
 * Bloom+ "Cycle insights" — the premium depth layer on top of the free tracker:
 * an estimated hormone curve, cycle averages & regularity, the next few period
 * predictions, symptom patterns from her logs, and a real data export.
 *
 * Styled to sit inside the Cycle Tracker (soft translucent card, font-script
 * hotpink titles, the same pink chart language as "This cycle").
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

const EST = "#EC4899";   // estrogen — hotpink
const PROG = "#9D174D";  // progesterone — deep plum-pink

type Props = {
  cycleLength: number;
  periodLength: number;
  cycleDay: number;
  nextPeriodDate: Date;
  msDay: number;
};

/* estimated hormone levels (0–1) across the cycle day — educational, not medical */
function estrogen(d: number, len: number, ov: number) {
  const w1 = len * 0.085;
  const primary = Math.exp(-Math.pow(d - (ov - 1), 2) / (2 * w1 * w1));
  const luteal = 0.4 * Math.exp(-Math.pow(d - (ov + 7), 2) / (2 * Math.pow(len * 0.12, 2)));
  return Math.min(1, primary + luteal);
}
function progesterone(d: number, len: number, ov: number) {
  if (d < ov) return 0.04;
  const p = Math.exp(-Math.pow(d - (ov + 6), 2) / (2 * Math.pow(len * 0.11, 2)));
  return Math.min(1, 0.04 + p);
}

function fmt(d: Date) {
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function CycleInsights({ cycleLength, periodLength, cycleDay, nextPeriodDate, msDay }: Props) {
  const premium = usePremium();
  const [exported, setExported] = useState(false);

  const ov = cycleLength - 14;
  const daysToPeriod = Math.max(0, Math.ceil((nextPeriodDate.getTime() - Date.now()) / msDay));

  // Hormone curve geometry
  const VW = 300, VH = 92, PX = 6, PT = 12, CH = 60;
  const cw = VW - PX * 2;
  const xAt = (d: number) => PX + ((d - 1) / (cycleLength - 1)) * cw;
  const yAt = (v: number) => PT + (1 - v) * CH;
  const line = (fn: (d: number) => number) => {
    let p = "";
    for (let d = 1; d <= cycleLength; d++) p += `${d === 1 ? "M" : "L"} ${xAt(d).toFixed(1)} ${yAt(fn(d)).toFixed(1)} `;
    return p.trim();
  };
  const estPath = line((d) => estrogen(d, cycleLength, ov));
  const progPath = line((d) => progesterone(d, cycleLength, ov));
  const todayX = xAt(Math.min(cycleLength, Math.max(1, cycleDay)));

  // Next 3 predicted periods
  const nexts = [0, 1, 2].map((i) => new Date(nextPeriodDate.getTime() + i * cycleLength * msDay));

  // Symptom patterns from her real logs
  const symLog = readSymptomsLog();
  const counts: Record<string, number> = {};
  Object.values(symLog).forEach((arr) => (arr || []).forEach((s) => (counts[s] = (counts[s] || 0) + 1)));
  const topSym = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 3);

  const exportData = () => {
    try {
      const payload = {
        exportedAt: new Date().toISOString(),
        cycle: { cycleLength, periodLength, currentDay: cycleDay, nextPeriod: nextPeriodDate.toISOString() },
        symptomLog: symLog,
        moodLog: JSON.parse(localStorage.getItem("bloom:mood-log-v2") || "{}"),
        pillLog: JSON.parse(localStorage.getItem("bloom:pill-log-v2") || "{}"),
      };
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = "bloomzein-cycle-history.json";
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setExported(true);
      setTimeout(() => setExported(false), 2200);
    } catch {}
  };

  const HormoneChart = ({ dim = false }: { dim?: boolean }) => (
    <svg viewBox={`0 0 ${VW} ${VH}`} width="100%" style={{ display: "block", opacity: dim ? 0.5 : 1, filter: dim ? "blur(2px)" : "none" }} aria-hidden={dim}>
      {/* today marker */}
      <line x1={todayX} y1={PT - 4} x2={todayX} y2={PT + CH} stroke="rgba(157,23,77,0.35)" strokeWidth="1.5" strokeDasharray="3 3" />
      <path d={estPath} fill="none" stroke={EST} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
      <path d={progPath} fill="none" stroke={PROG} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={todayX} cy={yAt(estrogen(cycleDay, cycleLength, ov))} r="3.4" fill={EST} />
      {/* baseline */}
      <line x1={PX} y1={PT + CH} x2={VW - PX} y2={PT + CH} stroke="rgba(236,72,153,0.15)" strokeWidth="1" />
      <text x={todayX} y={VH - 2} fontSize="8" fill="#9D5C7E" textAnchor="middle" fontWeight="700">TODAY · DAY {cycleDay}</text>
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
      <p className="text-[11px] leading-snug mb-3" style={{ color: "#9D5C7E" }}>Your hormones, trends &amp; predictions — read from your own logging.</p>

      {premium ? (
        <div className="space-y-3 animate-fade-in">
          {/* Averages */}
          <div className="grid grid-cols-3 gap-2">
            {[
              { Icon: TrendingUp, k: `${cycleLength}d`, l: "Avg cycle" },
              { Icon: Droplet, k: `${periodLength}d`, l: "Avg period" },
              { Icon: HeartPulse, k: daysToPeriod === 0 ? "Now" : `${daysToPeriod}d`, l: "Next period" },
            ].map((s) => (
              <div key={s.l} className="text-center rounded-2xl py-2.5" style={{ background: "rgba(252,231,243,0.6)" }}>
                <p className="font-black tabular-nums leading-none" style={{ fontSize: "18px", color: "#BE185D" }}>{s.k}</p>
                <p className="text-[8.5px] font-bold uppercase tracking-wide mt-1" style={{ color: "#9D5C7E" }}>{s.l}</p>
              </div>
            ))}
          </div>

          {/* Hormone curve */}
          <div className="rounded-2xl p-2.5" style={{ background: "rgba(255,255,255,0.55)", border: "1px solid rgba(236,72,153,0.12)" }}>
            <div className="flex items-center justify-between mb-1">
              <p className="text-[10px] font-bold uppercase tracking-wide" style={{ color: "#9D5C7E" }}>Estimated hormone curve</p>
              <div className="flex items-center gap-2.5 text-[9px] font-bold">
                <span className="inline-flex items-center gap-1" style={{ color: EST }}><i style={{ width: 8, height: 2.5, background: EST, display: "inline-block", borderRadius: 2 }} /> Estrogen</span>
                <span className="inline-flex items-center gap-1" style={{ color: PROG }}><i style={{ width: 8, height: 2.5, background: PROG, display: "inline-block", borderRadius: 2 }} /> Progesterone</span>
              </div>
            </div>
            <HormoneChart />
          </div>

          {/* Predictions */}
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wide mb-1.5" style={{ color: "#9D5C7E" }}>Next periods</p>
            <div className="flex flex-wrap gap-1.5">
              {nexts.map((d, i) => (
                <span key={i} className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold" style={{ background: i === 0 ? "#DB2777" : "rgba(252,231,243,0.8)", color: i === 0 ? "#fff" : "#BE185D" }}>
                  <Droplet className="h-3 w-3" /> {fmt(d)}
                </span>
              ))}
            </div>
          </div>

          {/* Symptom patterns */}
          {topSym.length > 0 && (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wide mb-1.5" style={{ color: "#9D5C7E" }}>Your most-logged symptoms</p>
              <div className="flex flex-wrap gap-1.5">
                {topSym.map(([s, n]) => (
                  <span key={s} className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold" style={{ background: "rgba(255,255,255,0.7)", border: "1px solid rgba(236,72,153,0.2)", color: "#BE185D" }}>
                    {s} <span className="tabular-nums" style={{ color: "#9D5C7E" }}>×{n}</span>
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Export */}
          <button
            onClick={exportData}
            className="w-full inline-flex items-center justify-center gap-1.5 rounded-full py-2.5 text-[13px] font-bold text-white active:scale-95 transition"
            style={{ background: "linear-gradient(135deg,#EC4899,#DB2777)", boxShadow: "0 6px 16px rgba(219,39,119,0.35)" }}
          >
            <Download className="h-4 w-4" /> {exported ? "Exported ✓" : "Export my cycle history"}
          </button>
        </div>
      ) : (
        /* Locked teaser — she sees a blurred taste + a soft upgrade CTA */
        <button onClick={() => openPaywall("cycle")} className="w-full text-left group">
          <div className="relative rounded-2xl overflow-hidden p-2.5" style={{ background: "rgba(255,255,255,0.5)", border: "1px solid rgba(236,72,153,0.12)" }}>
            <HormoneChart dim />
            <div className="absolute inset-0 grid place-items-center" style={{ background: "linear-gradient(180deg, rgba(252,231,243,0.35), rgba(252,231,243,0.7))" }}>
              <div className="text-center px-4">
                <span className="mx-auto mb-1.5 grid h-9 w-9 place-items-center rounded-full text-white animate-icon-breathe" style={{ background: "linear-gradient(135deg,#B76E79,#EC4899)" }}>
                  <Lock className="h-4 w-4" />
                </span>
                <p className="font-script leading-none" style={{ fontSize: "18px", color: "#DB2777" }}>Unlock your hormone curve</p>
                <p className="text-[10.5px] font-semibold mt-0.5" style={{ color: "#9D5C7E" }}>Trends, predictions &amp; export — with Bloom+</p>
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
