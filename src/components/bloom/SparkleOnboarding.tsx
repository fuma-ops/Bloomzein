import { useEffect, useMemo, useRef, useState, Fragment } from "react";
import { createPortal } from "react-dom";
import { ArrowRight } from "lucide-react";

/* ============================================================
   SparkleOnboarding — shared "wow" onboarding for Bloomzein tools.
   A bright, clear, Barbie-luxe pink reveal with sparkle motion.
   3 acts: Welcome → spotlight tour over the REAL sections → finale.
   Strictly on-palette (blush→petal→rose→hotpink→magenta, no purple);
   sparkles are SVG 4-point stars, never colored emoji.

   Used by the Cycle Tracker and the Budget Planner. Each caller passes
   its own copy + steps; a step may carry `onEnter` (e.g. switch a tab)
   which runs just before that step's element is spotlighted.
============================================================ */

export type SparkleStep = {
  key: string;
  selector: string;
  title: string;
  desc: string;
  /** Runs right before this step is spotlighted (e.g. switch tab). */
  onEnter?: () => void;
};

export type SparkleContent = {
  eyebrow: string;
  /** Title lines (rendered stacked). */
  titleLines: string[];
  subtitle: string;
  ctaLabel: string;
  finaleLines: string[];
  finaleSubtitle: string;
};

// Pink-only sparkle (4-point star). Colour passed in; never an emoji.
function Sparkle({ size = 14, color = "#EC4899", style }: { size?: number; color?: string; style?: React.CSSProperties }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" style={style} aria-hidden>
      <path d="M12 0c.9 5.4 3.7 8.2 9.1 9.1-5.4.9-8.2 3.7-9.1 9.1-.9-5.4-3.7-8.2-9.1-9.1C8.3 8.2 11.1 5.4 12 0Z" fill={color} />
    </svg>
  );
}

function firstVisible(selector: string): Element | null {
  const els = Array.from(document.querySelectorAll(selector));
  for (const el of els) {
    const r = el.getBoundingClientRect();
    if (r.width > 4 && r.height > 4) return el;
  }
  return null;
}

function Lines({ lines }: { lines: string[] }) {
  return (
    <>
      {lines.map((l, i) => (
        <Fragment key={i}>{i > 0 && <br />}{l}</Fragment>
      ))}
    </>
  );
}

export function SparkleOnboarding({ steps, content, onDone }: {
  steps: SparkleStep[];
  content: SparkleContent;
  onDone: () => void;
}) {
  const [phase, setPhase] = useState<"welcome" | "steps" | "finishing">("welcome");
  const [stepIdx, setStepIdx] = useState(0);
  const [spotRect, setSpotRect] = useState<DOMRect | null>(null);
  const [timerPct, setTimerPct] = useState(0);
  const [fadeIn, setFadeIn] = useState(false);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const autoRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stepIdxRef = useRef(stepIdx);
  stepIdxRef.current = stepIdx;

  const clearTimers = () => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    if (autoRef.current) { clearTimeout(autoRef.current); autoRef.current = null; }
  };

  useEffect(() => {
    const t = setTimeout(() => setFadeIn(true), 60);
    return () => clearTimeout(t);
  }, []);

  // Deterministic sparkle field (no Math.random → stable render).
  const twinkles = useMemo(() => Array.from({ length: 26 }, (_, i) => ({
    x: 4 + ((i * 17 + 5) % 92),
    y: 3 + ((i * 31 + 9) % 92),
    size: 8 + (i % 5) * 4,
    dur: 1.8 + (i % 5) * 0.5,
    delay: (i * 0.27) % 3.2,
    color: i % 3 === 0 ? "#EC4899" : i % 3 === 1 ? "#F472B6" : "#FBCFE8",
  })), []);

  const floaters = useMemo(() => Array.from({ length: 12 }, (_, i) => ({
    x: 6 + ((i * 23 + 3) % 88),
    size: 10 + (i % 4) * 6,
    dur: 5 + (i % 4) * 1.4,
    delay: (i * 0.5) % 5,
    color: i % 2 === 0 ? "rgba(244,114,182,0.5)" : "rgba(251,207,232,0.7)",
  })), []);

  const finish = () => {
    clearTimers();
    setPhase("finishing");
    setTimeout(() => onDone(), 1500);
  };

  const advanceRef = useRef<() => void>(() => {});
  advanceRef.current = () => {
    clearTimers();
    if (stepIdxRef.current < steps.length - 1) setStepIdx(stepIdxRef.current + 1);
    else finish();
  };
  const advance = () => advanceRef.current();

  // Welcome: gentle auto-advance.
  useEffect(() => {
    if (phase !== "welcome") return;
    setTimerPct(0);
    const total = 6500, tick = 50;
    timerRef.current = setInterval(() => setTimerPct((p) => Math.min(100, p + 100 / (total / tick))), tick);
    autoRef.current = setTimeout(() => { clearTimers(); setPhase("steps"); }, total);
    return clearTimers;
  }, [phase]);

  // Steps: run onEnter → find the real element → scroll to it → spotlight + auto-timer.
  useEffect(() => {
    if (phase !== "steps") return;
    const s = steps[stepIdx];
    setSpotRect(null);
    setTimerPct(0);
    clearTimers();
    try { s.onEnter?.(); } catch { /* non-fatal */ }

    const findTimeout = setTimeout(() => {
      const el = firstVisible(s.selector);
      if (!el) { advanceRef.current(); return; } // section not present → skip gracefully
      el.scrollIntoView({ behavior: "smooth", block: "center", inline: "center" });
      setTimeout(() => {
        setSpotRect(el.getBoundingClientRect());
        const dur = 5200;
        timerRef.current = setInterval(() => setTimerPct((p) => Math.min(100, p + 100 / (dur / 50))), 50);
        autoRef.current = setTimeout(() => advanceRef.current(), dur);
      }, 440);
    }, 420);

    return () => { clearTimeout(findTimeout); clearTimers(); };
  }, [phase, stepIdx]); // eslint-disable-line react-hooks/exhaustive-deps

  // Keep the spotlight glued to its element while it's up (scroll/resize).
  useEffect(() => {
    if (phase !== "steps") return;
    const remeasure = () => {
      const el = firstVisible(steps[stepIdxRef.current].selector);
      if (el) setSpotRect(el.getBoundingClientRect());
    };
    window.addEventListener("resize", remeasure);
    window.addEventListener("scroll", remeasure, true);
    return () => {
      window.removeEventListener("resize", remeasure);
      window.removeEventListener("scroll", remeasure, true);
    };
  }, [phase]); // eslint-disable-line react-hooks/exhaustive-deps

  const currentStep = steps[stepIdx];

  const tooltipPos = useMemo(() => {
    if (!spotRect) return null;
    const vp = { w: window.innerWidth, h: window.innerHeight };
    const cardW = Math.min(vp.w * 0.9, 330);
    const cardH = 190;
    const left = Math.max(12, Math.min(spotRect.left + spotRect.width / 2 - cardW / 2, vp.w - cardW - 12));
    const belowTop = spotRect.bottom + 16;
    const aboveTop = spotRect.top - cardH - 16;
    let top: number;
    if (belowTop + cardH < vp.h - 12) top = belowTop;
    else if (aboveTop > 64) top = aboveTop;
    else top = vp.h / 2 - cardH / 2;
    return { top, left, width: cardW };
  }, [spotRect]);

  // Self-drawing bloom medallion for the welcome act.
  const R = 46, C = 2 * Math.PI * R;
  const petalPts = [ { x: 60, y: 14 }, { x: 106, y: 60 }, { x: 60, y: 106 }, { x: 14, y: 60 } ];
  const petalColors = ["#F472B6", "#EC4899", "#DB2777", "#FBCFE8"];

  return createPortal(
    <div data-cy-ob>
      {/* ─────────────── ACT 1 · WELCOME ─────────────── */}
      {phase === "welcome" && (
        <div className="fixed inset-0 z-[10000] flex flex-col items-center justify-center overflow-hidden select-none"
          style={{ background: "radial-gradient(ellipse at 50% -5%, #FFFFFF 0%, #FFE6F3 38%, #FFC7E6 70%, #FFA6D5 100%)" }}>

          <div className="absolute pointer-events-none" style={{
            width: 460, height: 460, top: "30%", left: "50%",
            transform: "translate(-50%,-50%)",
            background: "radial-gradient(circle, rgba(255,214,236,0.55) 0%, rgba(244,114,182,0.22) 48%, transparent 72%)",
            filter: "blur(34px)", animation: "cyOrb 4.2s ease-in-out infinite alternate",
          }} />

          {twinkles.map((t, i) => (
            <div key={`t${i}`} className="absolute pointer-events-none" style={{
              left: `${t.x}%`, top: `${t.y}%`,
              animation: `cyTwinkle ${t.dur}s ease-in-out ${t.delay}s infinite`,
            }}>
              <Sparkle size={t.size} color={t.color} />
            </div>
          ))}
          {floaters.map((f, i) => (
            <div key={`f${i}`} className="absolute rounded-full pointer-events-none" style={{
              left: `${f.x}%`, bottom: -20, width: f.size, height: f.size,
              background: f.color, filter: "blur(0.5px)",
              animation: `cyFloatUp ${f.dur}s ease-in ${f.delay}s infinite`,
            }} />
          ))}

          <div className={`relative z-10 flex flex-col items-center text-center px-8 max-w-sm transition-all duration-[900ms] ease-out ${fadeIn ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}>
            <div className="text-[9px] font-black tracking-[0.42em] uppercase mb-5" style={{ color: "#DB2777", opacity: 0.55 }}>{content.eyebrow}</div>

            <h1 className="font-script leading-none mb-2" style={{
              fontSize: "clamp(3rem,13vw,4.75rem)",
              backgroundImage: "linear-gradient(100deg,#DB2777 0%,#EC4899 30%,#F9A8D4 50%,#EC4899 70%,#DB2777 100%)",
              backgroundSize: "220% auto",
              WebkitBackgroundClip: "text", backgroundClip: "text",
              color: "transparent", WebkitTextFillColor: "transparent",
              filter: "drop-shadow(0 6px 20px rgba(236,72,153,0.35))",
              animation: "cyShimmer 3.4s linear infinite",
            }}>
              <Lines lines={content.titleLines} />
            </h1>

            <div className="relative my-4" style={{ width: 120, height: 120, animation: "cyWheelFloat 4s ease-in-out infinite alternate", filter: "drop-shadow(0 10px 24px rgba(236,72,153,0.32))" }}>
              <svg width="120" height="120" viewBox="0 0 120 120">
                <circle cx="60" cy="60" r="54" fill="#ffffff" opacity="0.92" />
                <circle cx="60" cy="60" r="54" fill="url(#cyPearl)" />
                <circle cx="60" cy="60" r={R} fill="none" stroke="#FCE7F3" strokeWidth="7" />
                <circle cx="60" cy="60" r={R} fill="none" stroke="url(#cyRing)" strokeWidth="7" strokeLinecap="round"
                  strokeDasharray={C} strokeDashoffset={C}
                  style={{ animation: "cyDraw 1.6s cubic-bezier(0.4,0,0.2,1) 0.3s forwards", transform: "rotate(-90deg)", transformOrigin: "60px 60px" }} />
                <defs>
                  <linearGradient id="cyRing" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#F472B6" /><stop offset="55%" stopColor="#EC4899" /><stop offset="100%" stopColor="#DB2777" />
                  </linearGradient>
                  <radialGradient id="cyPearl" cx="38%" cy="32%" r="75%">
                    <stop offset="0%" stopColor="#ffffff" /><stop offset="70%" stopColor="#FFF0F7" /><stop offset="100%" stopColor="#FCE7F3" />
                  </radialGradient>
                </defs>
                {petalPts.map((p, i) => (
                  <circle key={i} cx={p.x} cy={p.y} r="8" fill={petalColors[i]}
                    style={{ transformOrigin: `${p.x}px ${p.y}px`, animation: `cyPetalPop 0.5s cubic-bezier(0.34,1.56,0.64,1) ${1.1 + i * 0.18}s both` }} />
                ))}
              </svg>
              <div className="absolute inset-0 grid place-items-center">
                <span className="font-script" style={{ fontSize: 26, color: "#DB2777", animation: "cyPetalPop 0.5s cubic-bezier(0.34,1.56,0.64,1) 1.9s both" }}>✿</span>
              </div>
            </div>

            <p className="text-[13px] leading-relaxed max-w-[250px] mb-8" style={{ color: "#9D5C7E", animation: "cyFadeUp 0.7s ease-out 0.5s both" }}>
              {content.subtitle}
            </p>

            <button onClick={() => { clearTimers(); setPhase("steps"); }}
              className="flex items-center gap-2 px-8 py-3.5 rounded-full text-white font-bold text-[15px] active:scale-95 transition-transform"
              style={{
                background: "linear-gradient(135deg,#F472B6 0%,#EC4899 50%,#DB2777 100%)",
                boxShadow: "0 10px 30px rgba(236,72,153,0.5), inset 0 1px 0 rgba(255,255,255,0.5)",
                animation: "cyCTA 2.4s ease-in-out infinite",
              }}>
              {content.ctaLabel}
              <ArrowRight className="h-4 w-4 shrink-0" strokeWidth={2.5} />
            </button>

            <div className="mt-6 w-32">
              <div className="h-[3px] rounded-full overflow-hidden" style={{ background: "rgba(219,39,119,0.14)" }}>
                <div className="h-full rounded-full" style={{ width: `${timerPct}%`, background: "linear-gradient(90deg,#F472B6,#DB2777)", transition: "none" }} />
              </div>
              <p className="text-[10px] text-center mt-1.5" style={{ color: "#C48AAE" }}>starting the tour…</p>
            </div>

            <button onClick={finish} className="mt-3 text-[11px] transition-colors" style={{ color: "#C48AAE" }}>skip</button>
          </div>
        </div>
      )}

      {/* ─────────────── ACT 2 · SPOTLIGHT TOUR ─────────────── */}
      {phase === "steps" && (
        <>
          <div className="fixed inset-0 cursor-pointer" style={{ zIndex: 9998 }} onClick={advance} />

          {spotRect && (
            <>
              <div className="fixed pointer-events-none" style={{
                zIndex: 10001,
                top: spotRect.top - 10, left: spotRect.left - 10,
                width: spotRect.width + 20, height: spotRect.height + 20,
                borderRadius: 24, border: "2.5px solid rgba(236,72,153,0.95)",
                animation: "cySpot 2s ease-in-out infinite",
              }} />
              {[[0,0],[1,0],[0,1],[1,1]].map(([sx, sy], i) => (
                <div key={i} className="fixed pointer-events-none" style={{
                  zIndex: 10002,
                  top: spotRect.top - 10 + sy * (spotRect.height + 20) - 8,
                  left: spotRect.left - 10 + sx * (spotRect.width + 20) - 8,
                  animation: `cyTwinkle ${1.4 + i * 0.2}s ease-in-out ${i * 0.15}s infinite`,
                }}>
                  <Sparkle size={16} color="#EC4899" />
                </div>
              ))}
            </>
          )}

          {tooltipPos && (
            <div className="fixed" style={{ zIndex: 10003, top: tooltipPos.top, left: tooltipPos.left, width: tooltipPos.width }}>
              <div className="rounded-[1.6rem] p-5" style={{
                background: "rgba(255,255,255,0.98)",
                border: "1px solid rgba(236,72,153,0.18)",
                boxShadow: "0 20px 50px rgba(236,72,153,0.28), inset 0 1px 0 rgba(255,255,255,0.9)",
                animation: "cyCardIn 0.4s cubic-bezier(0.34,1.56,0.64,1) both",
              }}>
                <div className="flex items-center justify-between mb-3.5">
                  <span className="text-[10px] font-black tracking-[0.28em]" style={{ color: "#DB2777" }}>
                    {stepIdx + 1} / {steps.length}
                  </span>
                  <div className="flex gap-1.5 items-center">
                    {steps.map((_, i) => (
                      <span key={i} className="rounded-full" style={{
                        width: i === stepIdx ? 18 : 6, height: 6,
                        background: i <= stepIdx ? "linear-gradient(90deg,#F472B6,#DB2777)" : "#FCE7F3",
                        transition: "all 0.35s ease",
                      }} />
                    ))}
                  </div>
                </div>

                <div className="flex gap-3 items-start mb-4">
                  <span className="shrink-0 grid place-items-center rounded-2xl" style={{
                    width: 40, height: 40,
                    background: "linear-gradient(135deg,#F472B6,#DB2777)",
                    boxShadow: "0 6px 16px rgba(236,72,153,0.35)",
                  }}>
                    <Sparkle size={18} color="#fff" />
                  </span>
                  <div>
                    <h3 className="font-script leading-tight" style={{ fontSize: 22, color: "#DB2777" }}>{currentStep.title}</h3>
                    <p className="mt-0.5" style={{ fontSize: 12, lineHeight: 1.5, color: "#9D5C7E" }}>{currentStep.desc}</p>
                  </div>
                </div>

                <div className="h-[3px] rounded-full overflow-hidden mb-4" style={{ background: "#FCE7F3" }}>
                  <div className="h-full rounded-full" style={{ width: `${timerPct}%`, background: "linear-gradient(90deg,#F472B6,#DB2777)", transition: "none" }} />
                </div>

                <div className="flex items-center justify-between">
                  <button onClick={finish} className="text-[11px] px-1 py-1" style={{ color: "#C48AAE" }}>skip</button>
                  <button onClick={advance}
                    className="flex items-center gap-1.5 px-5 py-2.5 rounded-full text-white text-[13px] font-bold active:scale-95 transition-transform"
                    style={{ background: "linear-gradient(135deg,#EC4899,#DB2777)", boxShadow: "0 6px 18px rgba(236,72,153,0.4)" }}>
                    {stepIdx < steps.length - 1
                      ? (<><span>Next</span><ArrowRight className="h-3.5 w-3.5" /></>)
                      : (<><Sparkle size={15} color="#fff" /><span>Start</span></>)}
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* ─────────────── ACT 3 · FINALE ─────────────── */}
      {phase === "finishing" && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center overflow-hidden"
          style={{ background: "radial-gradient(ellipse at center, #FFFFFF 0%, #FFE6F3 45%, #FFC7E6 100%)", animation: "cyFadeOut 1.5s ease-in-out forwards" }}>
          {twinkles.map((t, i) => (
            <div key={`c${i}`} className="absolute pointer-events-none" style={{
              left: `${t.x}%`, top: `${t.y}%`,
              animation: `cyBurst ${1.1 + (i % 4) * 0.25}s ease-out ${(i % 6) * 0.06}s both`,
            }}>
              <Sparkle size={t.size + 2} color={t.color} />
            </div>
          ))}
          <div className="text-center px-8" style={{ animation: "cyFadeUp 0.6s ease-out both" }}>
            <div className="mx-auto mb-3 grid place-items-center rounded-full" style={{
              width: 74, height: 74,
              background: "linear-gradient(135deg,#F472B6,#DB2777)",
              boxShadow: "0 12px 34px rgba(236,72,153,0.5)",
              animation: "cyCTA 2s ease-in-out infinite",
            }}>
              <span className="font-script text-white" style={{ fontSize: 34 }}>✿</span>
            </div>
            <h2 className="font-script leading-none" style={{ fontSize: "clamp(2.5rem,11vw,3.75rem)", color: "#DB2777", filter: "drop-shadow(0 4px 16px rgba(236,72,153,0.3))" }}>
              <Lines lines={content.finaleLines} />
            </h2>
            <p className="mt-2 text-[13px]" style={{ color: "#9D5C7E" }}>{content.finaleSubtitle}</p>
          </div>
        </div>
      )}

      <style>{`
        @keyframes cyOrb { from { transform: translate(-50%,-50%) scale(1); opacity: 0.4; } to { transform: translate(-50%,-50%) scale(1.2); opacity: 0.7; } }
        @keyframes cyTwinkle { 0%,100% { transform: scale(0.5) rotate(0deg); opacity: 0.15; } 50% { transform: scale(1) rotate(45deg); opacity: 0.95; } }
        @keyframes cyFloatUp { 0% { transform: translateY(0) scale(1); opacity: 0; } 15% { opacity: 0.9; } 100% { transform: translateY(-110vh) scale(0.6); opacity: 0; } }
        @keyframes cyShimmer { to { background-position: 220% center; } }
        @keyframes cyDraw { to { stroke-dashoffset: 0; } }
        @keyframes cyPetalPop { from { transform: scale(0); opacity: 0; } to { transform: scale(1); opacity: 1; } }
        @keyframes cyWheelFloat { from { transform: translateY(0); } to { transform: translateY(-7px); } }
        @keyframes cyFadeUp { from { transform: translateY(14px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        @keyframes cyCTA { 0%,100% { transform: scale(1); box-shadow: 0 10px 30px rgba(236,72,153,0.5), inset 0 1px 0 rgba(255,255,255,0.5); } 50% { transform: scale(1.045); box-shadow: 0 14px 40px rgba(236,72,153,0.68), inset 0 1px 0 rgba(255,255,255,0.5); } }
        @keyframes cySpot {
          0%,100% { box-shadow: 0 0 0 9999px rgba(255,232,246,0.82), 0 0 26px 8px rgba(236,72,153,0.32); border-color: rgba(236,72,153,0.85); }
          50%     { box-shadow: 0 0 0 9999px rgba(255,232,246,0.82), 0 0 48px 16px rgba(236,72,153,0.5);  border-color: rgba(236,72,153,1); }
        }
        @keyframes cyCardIn { from { transform: scale(0.88) translateY(10px); opacity: 0; } to { transform: scale(1) translateY(0); opacity: 1; } }
        @keyframes cyFadeOut { 0% { opacity: 1; } 60% { opacity: 1; } 100% { opacity: 0; pointer-events: none; } }
        @keyframes cyBurst { from { transform: scale(0) rotate(0deg); opacity: 0; } 40% { opacity: 1; } to { transform: scale(1.15) rotate(60deg); opacity: 0; } }
        @media (prefers-reduced-motion: reduce) {
          [data-cy-ob] * { animation-duration: 0.001ms !important; animation-iteration-count: 1 !important; }
        }
      `}</style>
    </div>,
    document.body
  );
}
