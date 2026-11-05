// Public, functional breathing exercise for the /tools/meditation-breathwork
// SEO landing page. A real guided 4-7-8 breath that runs in the browser — the
// "magic" a visitor can feel immediately — then a CTA to create a free account
// for the full Meditation & Breathwork tool (sounds, timer, phase-aware cues).
import { useEffect, useState } from "react";
import { Sparkles, Play, Pause } from "lucide-react";
import type { ToolLang } from "@/lib/toolPagesI18n";
import { PT } from "./publicToolI18n";

// 4-7-8: inhale, hold, exhale (labels come from the language strings).
const STEPS = [{ secs: 4 }, { secs: 7 }, { secs: 8 }];

export function PublicBreathingOrb({ lang = "en" }: { lang?: ToolLang }) {
  const T = PT[lang], B = T.breath;
  const [running, setRunning] = useState(false);
  const [stepIdx, setStepIdx] = useState(0);
  const [left, setLeft] = useState(STEPS[0].secs);
  const [cycles, setCycles] = useState(0);
  // One-second tick while running (functional update → no stale closure).
  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setLeft((l) => l - 1), 1000);
    return () => clearInterval(id);
  }, [running]);

  // When a step's countdown reaches zero, advance to the next breath step.
  useEffect(() => {
    if (!running || left > 0) return;
    const next = (stepIdx + 1) % STEPS.length;
    if (next === 0) setCycles((c) => c + 1);
    setStepIdx(next);
    setLeft(STEPS[next].secs);
  }, [left, running, stepIdx]);

  const toggle = () => {
    if (running) { setRunning(false); return; }
    setStepIdx(0); setLeft(STEPS[0].secs); setRunning(true);
  };

  const step = STEPS[stepIdx];
  // scale the orb to the phase: inhale grows, hold stays big, exhale shrinks
  const scale = stepIdx === 2 ? 0.6 : 1;
  const dur = step.secs;

  return (
    <section className="rounded-[1.75rem] border border-petal/60 bg-white/80 p-5 text-center shadow-[0_18px_50px_-30px_rgba(236,72,153,0.5)] sm:p-7">
      <h2 className={lang === "ar" ? "text-xl font-extrabold text-hotpink sm:text-2xl" : "font-script text-2xl text-hotpink sm:text-3xl"}>{B.title}</h2>
      <p className="mt-1 text-[13px] text-rose/70">{B.lead}</p>

      <div className="relative mx-auto mt-6 grid h-56 w-56 place-items-center">
        <span className="absolute inset-0 rounded-full bg-hotpink/10" />
        <span
          className="absolute rounded-full bg-gradient-to-br from-hotpink/40 to-rose/30"
          style={{
            height: "100%", width: "100%",
            transform: `scale(${running ? scale : 0.8})`,
            transition: running ? `transform ${dur}s ease-in-out` : "transform 0.4s ease",
          }}
        />
        <div className="relative z-[1]">
          <p className="font-script text-2xl text-hotpink">{running ? B.steps[stepIdx] : B.ready}</p>
          <p className="font-black text-5xl leading-none text-[#831843]">{running ? Math.max(left, 1) : "·"}</p>
        </div>
      </div>

      <div className="mt-6 flex items-center justify-center gap-3">
        <button onClick={toggle} className="bloom-luxury-btn inline-flex items-center gap-2 rounded-full px-6 py-3 text-[15px] font-bold text-white">
          {running ? <><Pause className="h-4 w-4" /> {B.pause}</> : <><Play className="h-4 w-4" /> {B.start}</>}
        </button>
        {cycles > 0 && <span className="text-[13px] font-bold text-rose/60">{B.done(cycles)}</span>}
      </div>

      <div className="mt-5 rounded-2xl bg-gradient-to-br from-hotpink to-[#db2777] p-5 text-white">
        <p className={lang === "ar" ? "text-xl font-extrabold" : "font-script text-2xl"}>{B.ctaTitle}</p>
        <p className="mx-auto mt-1 max-w-sm text-[13px] text-white/90">{B.ctaText}</p>
        <a href="/onboarding" className="mt-3 inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-[15px] font-bold text-hotpink transition hover:bg-white/90">
          <Sparkles className="h-4 w-4" /> {T.createFree}
        </a>
      </div>
    </section>
  );
}
