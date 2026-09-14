// =============================================================================
// Meditation & Breathwork — a calm, guided breathing tool.
// A live breathing coach: an animated lotus ring that expands on the inhale,
// holds, and releases on the exhale, with a per-phase countdown. Patterns
// (4-7-8, Box, Calm, Energize), an optional session timer, soft cue sounds,
// and a benefits card. Preferences persist in localStorage.
// =============================================================================
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowLeft, Play, Pause, RotateCcw, Music2, Timer as TimerIcon, Heart,
  SlidersHorizontal, X, Check, Sparkles, Wind,
} from "lucide-react";

type PhaseKey = "inhale" | "hold" | "exhale" | "hold2";
type Phase = { key: PhaseKey; label: string; secs: number };
type Pattern = { id: string; name: string; tagline: string; phases: Phase[] };

const PATTERNS: Pattern[] = [
  { id: "478", name: "4-7-8 Breathing", tagline: "Deep calm & better sleep", phases: [
    { key: "inhale", label: "Inhale", secs: 4 }, { key: "hold", label: "Hold", secs: 7 }, { key: "exhale", label: "Exhale", secs: 8 },
  ] },
  { id: "box", name: "Box Breathing", tagline: "Focus & reset", phases: [
    { key: "inhale", label: "Inhale", secs: 4 }, { key: "hold", label: "Hold", secs: 4 }, { key: "exhale", label: "Exhale", secs: 4 }, { key: "hold2", label: "Hold", secs: 4 },
  ] },
  { id: "calm", name: "Calm Breath", tagline: "Ease anxiety gently", phases: [
    { key: "inhale", label: "Inhale", secs: 4 }, { key: "exhale", label: "Exhale", secs: 6 },
  ] },
  { id: "energize", name: "Morning Lift", tagline: "Wake up softly", phases: [
    { key: "inhale", label: "Inhale", secs: 6 }, { key: "exhale", label: "Exhale", secs: 2 },
  ] },
];
const DURATIONS = [2, 5, 10]; // minutes

const PATTERN_KEY = "bloom:breathwork-pattern";
const DUR_KEY = "bloom:breathwork-minutes";
const SOUND_KEY = "bloom:breathwork-sound";

const QUOTES = [
  "Breathe. Be here. You are enough.",
  "Inhale calm, exhale everything you can't control.",
  "Your softest reset is just one breath away.",
  "Slow breath, soft heart, clear mind.",
];

/** Soft cue tone via WebAudio — no audio assets needed. */
function useCue(enabled: boolean) {
  const ctxRef = useRef<AudioContext | null>(null);
  return useCallback((freq: number) => {
    if (!enabled) return;
    try {
      type WithWebkit = typeof window & { webkitAudioContext?: typeof AudioContext };
      const AC = window.AudioContext || (window as WithWebkit).webkitAudioContext;
      if (!AC) return;
      const ctx = ctxRef.current ?? (ctxRef.current = new AC());
      if (ctx.state === "suspended") void ctx.resume();
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = "sine";
      o.frequency.value = freq;
      g.gain.setValueAtTime(0.0001, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.12, ctx.currentTime + 0.04);
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.9);
      o.connect(g); g.connect(ctx.destination);
      o.start(); o.stop(ctx.currentTime + 0.95);
    } catch { /* ignore */ }
  }, [enabled]);
}

const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

export default function BreathworkPage() {
  const [patternId, setPatternId] = useState<string>(() => { try { return localStorage.getItem(PATTERN_KEY) || "478"; } catch { return "478"; } });
  const [minutes, setMinutes] = useState<number>(() => { try { return Number(localStorage.getItem(DUR_KEY)) || 5; } catch { return 5; } });
  const [sound, setSound] = useState<boolean>(() => { try { return localStorage.getItem(SOUND_KEY) === "1"; } catch { return false; } });
  const [sheet, setSheet] = useState<null | "timer" | "benefits" | "settings">(null);
  const [quote] = useState(() => QUOTES[Math.floor(Math.random() * QUOTES.length)]);

  const pattern = PATTERNS.find((p) => p.id === patternId) ?? PATTERNS[0];
  const phases = pattern.phases;
  const cue = useCue(sound);

  const [running, setRunning] = useState(false);
  const [phaseIdx, setPhaseIdx] = useState(0);
  const [phaseElapsed, setPhaseElapsed] = useState(0); // seconds within phase
  const [total, setTotal] = useState(0);               // seconds elapsed in session
  const [cycles, setCycles] = useState(0);
  const [done, setDone] = useState(false);

  const raf = useRef<number | null>(null);
  const lastTs = useRef<number | null>(null);
  // refs mirror state for the animation loop (avoids stale closures)
  const st = useRef({ phaseIdx: 0, phaseElapsed: 0, total: 0, cycles: 0 });
  st.current.phaseIdx = phaseIdx; st.current.phaseElapsed = phaseElapsed; st.current.total = total; st.current.cycles = cycles;

  useEffect(() => { try { localStorage.setItem(PATTERN_KEY, patternId); } catch { /* ignore */ } }, [patternId]);
  useEffect(() => { try { localStorage.setItem(DUR_KEY, String(minutes)); } catch { /* ignore */ } }, [minutes]);
  useEffect(() => { try { localStorage.setItem(SOUND_KEY, sound ? "1" : "0"); } catch { /* ignore */ } }, [sound]);

  const reset = useCallback(() => {
    setRunning(false); setPhaseIdx(0); setPhaseElapsed(0); setTotal(0); setCycles(0); setDone(false);
    lastTs.current = null;
  }, []);

  // Restart cleanly whenever the pattern changes.
  useEffect(() => { reset(); }, [patternId, reset]);

  useEffect(() => {
    if (!running) { lastTs.current = null; if (raf.current) cancelAnimationFrame(raf.current); return; }
    const goalSecs = minutes * 60;
    const tick = (ts: number) => {
      if (lastTs.current == null) lastTs.current = ts;
      const dt = Math.min(0.1, (ts - lastTs.current) / 1000); // clamp big gaps (tab switch)
      lastTs.current = ts;
      const s = st.current;
      let pe = s.phaseElapsed + dt;
      let pi = s.phaseIdx;
      let cy = s.cycles;
      const tot = s.total + dt;
      if (pe >= phases[pi].secs) {
        pe = 0;
        pi = (pi + 1) % phases.length;
        if (pi === 0) cy += 1;
        cue(phases[pi].key.startsWith("inhale") ? 528 : phases[pi].key.startsWith("exhale") ? 396 : 440);
      }
      setPhaseElapsed(pe); setPhaseIdx(pi); setCycles(cy); setTotal(tot);
      if (tot >= goalSecs) { setRunning(false); setDone(true); return; }
      raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => { if (raf.current) cancelAnimationFrame(raf.current); };
  }, [running, phases, minutes, cue]);

  const toggle = () => {
    if (done) { reset(); setTimeout(() => setRunning(true), 50); return; }
    if (!running) cue(528);
    setRunning((r) => !r);
  };

  const phase = phases[phaseIdx];
  const prog = Math.min(1, phaseElapsed / phase.secs);
  const countdown = Math.max(1, Math.ceil(phase.secs - phaseElapsed));
  // fullness: 0 = fully exhaled, 1 = fully inhaled — drives the lotus scale
  const fullness =
    phase.key === "inhale" ? prog :
    phase.key === "exhale" ? 1 - prog :
    phase.key === "hold" ? 1 : 0;
  const scale = 0.68 + 0.42 * fullness;

  // ring geometry
  const R = 116, C = 2 * Math.PI * R;

  return (
    <div className="relative isolate animate-fade-in pb-10">
      <a href="/app/tools" className="mb-3 inline-flex items-center gap-1 text-sm font-semibold text-[#831843] transition hover:text-hotpink">
        <ArrowLeft className="h-4 w-4" /> All tools
      </a>

      {/* header */}
      <header className="text-center">
        <h1 className="font-serif text-[2rem] font-bold leading-tight text-[#7a1247] sm:text-[2.5rem]">Meditation &amp; Breathwork</h1>
        <p className="mt-0.5 font-script text-2xl text-hotpink sm:text-3xl">{pattern.name}</p>
        <span className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-white/70 bg-white/60 px-3.5 py-1.5 text-[12.5px] font-bold text-rose/80 shadow-sm backdrop-blur">
          A calmer mind <Heart className="h-3.5 w-3.5 fill-hotpink text-hotpink" /> A happier you
        </span>
      </header>

      {/* breathing ring */}
      <div className="mx-auto mt-6 grid place-items-center">
        <button
          onClick={toggle}
          aria-label={running ? "Pause" : "Start"}
          className="relative grid h-[280px] w-[280px] place-items-center rounded-full outline-none sm:h-[320px] sm:w-[320px]"
        >
          {/* soft glow */}
          <span className="absolute inset-2 rounded-full" style={{ background: "radial-gradient(circle at 50% 45%, rgba(255,214,235,0.9), rgba(255,240,247,0.5) 60%, transparent 72%)" }} />
          {/* progress ring */}
          <svg viewBox="0 0 260 260" className="absolute inset-0 h-full w-full -rotate-90">
            <circle cx="130" cy="130" r={R} fill="none" stroke="oklch(0.9 0.06 350)" strokeWidth="14" />
            <circle
              cx="130" cy="130" r={R} fill="none" stroke="url(#bwGrad)" strokeWidth="14" strokeLinecap="round"
              strokeDasharray={C} strokeDashoffset={C * (1 - (running || done ? prog : 0))}
              style={{ transition: "stroke-dashoffset 120ms linear" }}
            />
            <defs>
              <linearGradient id="bwGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#F9A8D4" />
                <stop offset="100%" stopColor="#EC4899" />
              </linearGradient>
            </defs>
          </svg>

          {/* inner disc */}
          <span className="absolute inset-[26px] rounded-full bg-white/80 shadow-[inset_0_2px_20px_rgba(236,72,153,0.15)] backdrop-blur-sm sm:inset-[30px]" />

          {/* content */}
          <span className="relative flex flex-col items-center">
            <Lotus className="h-16 w-16 sm:h-[70px] sm:w-[70px]" style={{ transform: `scale(${running || done ? scale : 1})`, transition: "transform 160ms linear" }} />
            {done ? (
              <>
                <span className="mt-2 font-script text-[2rem] leading-none text-hotpink">Beautiful ✿</span>
                <span className="mt-1 text-[13px] font-semibold text-rose/70">{cycles} calm breaths</span>
              </>
            ) : running ? (
              <>
                <span className="mt-2 text-[3.2rem] font-extrabold leading-none text-[#7a1247] tabular-nums">{String(countdown).padStart(2, "0")}</span>
                <span className="mt-0.5 font-script text-2xl text-hotpink">{phase.label}…</span>
              </>
            ) : (
              <>
                <span className="mt-2 inline-flex items-center gap-1.5 text-[1.6rem] font-extrabold text-[#7a1247]"><Play className="h-6 w-6 fill-hotpink text-hotpink" /> Begin</span>
                <span className="mt-0.5 text-[12.5px] font-semibold text-rose/65">{pattern.tagline}</span>
              </>
            )}
          </span>
        </button>
      </div>

      {/* phase cards */}
      <div className="mx-auto mt-6 grid max-w-md gap-2.5" style={{ gridTemplateColumns: `repeat(${phases.length}, minmax(0,1fr))` }}>
        {phases.map((p, i) => {
          const active = (running || done) && i === phaseIdx && !done;
          return (
            <div key={i} className={[
              "relative rounded-3xl px-2 py-3 text-center transition",
              active ? "bg-gradient-to-b from-hotpink to-[#db2777] text-white shadow-[0_12px_28px_-10px_rgba(236,72,153,0.7)]"
                     : "bg-white/70 text-rose ring-1 ring-white/70",
            ].join(" ")}>
              <span className="mx-auto grid h-9 w-9 place-items-center">
                {active
                  ? <button onClick={toggle} aria-label={running ? "Pause" : "Resume"} className="grid h-9 w-9 place-items-center rounded-full bg-white/25 text-white active:scale-90">{running ? <Pause className="h-5 w-5 fill-white" /> : <Play className="h-5 w-5 fill-white" />}</button>
                  : <Wind className={`h-5 w-5 ${p.key === "hold" || p.key === "hold2" ? "text-hotpink/70" : "text-hotpink"}`} strokeWidth={2} />}
              </span>
              <p className={`mt-1 text-[14px] font-extrabold leading-none ${active ? "text-white" : "text-hotpink"}`}>{p.label}</p>
              <p className={`mt-1 text-[11.5px] font-semibold ${active ? "text-white/85" : "text-rose/60"}`}>{p.secs} sec</p>
            </div>
          );
        })}
      </div>

      {/* controls row */}
      <div className="mx-auto mt-5 grid max-w-md grid-cols-4 gap-2">
        <ControlIcon Icon={Music2} label="Sounds" active={sound} onClick={() => setSound((s) => !s)} />
        <ControlIcon Icon={TimerIcon} label="Timer" onClick={() => setSheet("timer")} />
        <ControlIcon Icon={Heart} label="Benefits" onClick={() => setSheet("benefits")} />
        <ControlIcon Icon={SlidersHorizontal} label="Settings" onClick={() => setSheet("settings")} />
      </div>

      {/* session line + reset */}
      <div className="mx-auto mt-4 flex max-w-md items-center justify-center gap-3 text-[12.5px] font-semibold text-rose/70">
        <span className="tabular-nums">{fmt(total)} / {minutes}:00</span>
        <span className="text-rose/30">·</span>
        <span>{cycles} breath{cycles === 1 ? "" : "s"}</span>
        {(running || total > 0 || done) && (
          <button onClick={reset} className="inline-flex items-center gap-1 text-hotpink transition hover:opacity-80">
            <RotateCcw className="h-3.5 w-3.5" /> Reset
          </button>
        )}
      </div>

      {/* quote */}
      <div className="mx-auto mt-6 flex max-w-md items-center justify-center gap-2.5 rounded-2xl border border-white/70 bg-white/55 px-4 py-3 text-center shadow-sm backdrop-blur">
        <Lotus className="h-6 w-6 shrink-0" />
        <p className="font-script text-lg text-hotpink">“{quote}”</p>
      </div>

      {sheet && <Sheet onClose={() => setSheet(null)}>
        {sheet === "timer" && (
          <SheetBody title="Session length" subtitle="How long would you like to breathe?">
            <div className="grid grid-cols-3 gap-2.5">
              {DURATIONS.map((m) => (
                <button key={m} onClick={() => { setMinutes(m); reset(); setSheet(null); }} className={pick(minutes === m)}>
                  <span className="text-[1.5rem] font-extrabold leading-none text-hotpink">{m}</span>
                  <span className="text-[11px] font-bold text-rose/60">minutes</span>
                </button>
              ))}
            </div>
          </SheetBody>
        )}
        {sheet === "settings" && (
          <SheetBody title="Breathing pattern" subtitle="Pick the rhythm that feels right today.">
            <div className="space-y-2">
              {PATTERNS.map((p) => (
                <button key={p.id} onClick={() => { setPatternId(p.id); setSheet(null); }} className={[
                  "flex w-full items-center justify-between rounded-2xl border px-3.5 py-3 text-left transition active:scale-[0.99]",
                  p.id === patternId ? "border-hotpink bg-hotpink/10 ring-1 ring-hotpink/30" : "border-white/70 bg-white/70",
                ].join(" ")}>
                  <span>
                    <span className="block text-[14.5px] font-extrabold text-hotpink">{p.name}</span>
                    <span className="block text-[12px] font-semibold text-rose/65">{p.tagline} · {p.phases.map((x) => x.secs).join("-")}</span>
                  </span>
                  {p.id === patternId && <Check className="h-5 w-5 text-hotpink" strokeWidth={3} />}
                </button>
              ))}
            </div>
            <button onClick={() => { setSound((s) => !s); }} className="mt-3 flex w-full items-center justify-between rounded-2xl border border-white/70 bg-white/70 px-3.5 py-3">
              <span className="inline-flex items-center gap-2 text-[14px] font-bold text-rose"><Music2 className="h-4 w-4 text-hotpink" /> Gentle cue sounds</span>
              <span className={`relative h-6 w-11 rounded-full transition ${sound ? "bg-hotpink" : "bg-rose/25"}`}><span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${sound ? "left-[22px]" : "left-0.5"}`} /></span>
            </button>
          </SheetBody>
        )}
        {sheet === "benefits" && (
          <SheetBody title={`Why ${pattern.name}?`} subtitle="A few minutes is all it takes.">
            <ul className="space-y-2.5">
              {[
                "Calms your nervous system — lower stress & racing thoughts",
                "Slows your heart rate and softens tension",
                "Helps you fall asleep faster and rest deeper",
                "Eases anxiety and brings you back to the present",
                "A soothing ritual for cramps and low-energy days",
              ].map((t) => (
                <li key={t} className="flex items-start gap-2.5 text-[13.5px] font-semibold leading-snug text-rose/85">
                  <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-hotpink/12"><Sparkles className="h-3 w-3 text-hotpink" /></span>{t}
                </li>
              ))}
            </ul>
          </SheetBody>
        )}
      </Sheet>}
    </div>
  );
}

function ControlIcon({ Icon, label, active, onClick }: { Icon: typeof Heart; label: string; active?: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} className="flex flex-col items-center gap-1.5 active:scale-95">
      <span className={[
        "grid h-14 w-14 place-items-center rounded-full shadow-sm ring-1 transition",
        active ? "bg-hotpink text-white ring-hotpink" : "bg-white/80 text-hotpink ring-white/70 hover:bg-white",
      ].join(" ")}>
        <Icon className="h-6 w-6" strokeWidth={2} />
      </span>
      <span className="text-[12px] font-bold text-rose/75">{label}</span>
    </button>
  );
}

function pick(active: boolean) {
  return [
    "flex flex-col items-center gap-1 rounded-2xl border py-3.5 transition active:scale-95",
    active ? "border-hotpink bg-hotpink/10 ring-1 ring-hotpink/30" : "border-white/70 bg-white/70",
  ].join(" ");
}

function Sheet({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[120] flex items-end justify-center sm:items-center sm:p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-[#7a1247]/40 backdrop-blur-sm animate-fade-in" />
      <div onClick={(e) => e.stopPropagation()} className="relative w-full max-w-md rounded-t-[1.75rem] bg-white p-5 shadow-2xl animate-scale-in sm:rounded-[1.75rem]" style={{ paddingBottom: "max(1.25rem, env(safe-area-inset-bottom))" }}>
        <button onClick={onClose} aria-label="Close" className="absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-full bg-rose/8 text-rose/60 transition hover:text-hotpink active:scale-90"><X className="h-4 w-4" /></button>
        {children}
      </div>
    </div>
  );
}
function SheetBody({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="font-script text-[1.7rem] leading-none text-hotpink">{title}</h2>
      <p className="mt-1 text-[12.5px] font-semibold text-rose/65">{subtitle}</p>
      <div className="mt-4">{children}</div>
    </div>
  );
}

/** A small glossy lotus. */
function Lotus({ className = "", style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg viewBox="0 0 100 100" fill="none" className={className} style={style} aria-hidden>
      <defs>
        <linearGradient id="lp1" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#FBCFE8" /><stop offset="100%" stopColor="#EC4899" /></linearGradient>
        <linearGradient id="lp2" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#FDF2F8" /><stop offset="100%" stopColor="#F472B6" /></linearGradient>
      </defs>
      <path d="M50 80 C 24 74 12 56 16 40 C 30 44 44 58 50 80 Z" fill="url(#lp1)" stroke="#fff" strokeWidth="2" />
      <path d="M50 80 C 76 74 88 56 84 40 C 70 44 56 58 50 80 Z" fill="url(#lp1)" stroke="#fff" strokeWidth="2" />
      <path d="M50 82 C 33 74 26 54 34 36 C 44 44 50 60 50 82 Z" fill="url(#lp2)" stroke="#fff" strokeWidth="2" />
      <path d="M50 82 C 67 74 74 54 66 36 C 56 44 50 60 50 82 Z" fill="url(#lp2)" stroke="#fff" strokeWidth="2" />
      <path d="M50 84 C 40 66 40 40 50 22 C 60 40 60 66 50 84 Z" fill="url(#lp2)" stroke="#fff" strokeWidth="2.5" />
    </svg>
  );
}
