import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Flower, Sparkle } from "lucide-react";

/**
 * BloomzeinIntro — a short (~4-5s) branded opener that plays full-screen at the
 * very start of a session. It renders through a portal on top of everything so
 * a screen-recording captures it cleanly, then calls `onDone` to reveal the
 * session underneath. Three interchangeable "models" (looks) so we can compare
 * and keep one. Tap anywhere to skip.
 *
 * Audio: pass `audioUrl` (the ElevenLabs sting) and it plays in sync. Until we
 * have the files it's silent — the visuals stand alone. The chosen model is
 * remembered per app in `bloom:intro-model`.
 */

export type IntroModel = 1 | 2 | 3;
export const INTRO_MODEL_KEY = "bloom:intro-model";

/** On-brand collage cut-outs (existing library imagery). */
const COLLAGE = [
  "/images/pose-warrior-2.webp",
  "/images/pose-goddess.webp",
  "/images/pose-cobra.webp",
  "/images/pose-butterfly.webp",
  "/images/pose-mountain.webp",
  "/images/pose-tree.webp",
];

const KEYFRAMES = `
@keyframes bzIntroOut{to{opacity:0;transform:scale(1.06);filter:blur(8px)}}
@keyframes bzLogoPop{0%{opacity:0;transform:scale(.35) rotate(-10deg)}55%{opacity:1;transform:scale(1.14) rotate(4deg)}74%{transform:scale(.96)}100%{opacity:1;transform:scale(1) rotate(0)}}
@keyframes bzGleam{0%{transform:translateX(-150%) skewX(-18deg)}100%{transform:translateX(170%) skewX(-18deg)}}
@keyframes bzUp{0%{opacity:0;transform:translateY(24px) scale(.9)}100%{opacity:1;transform:translateY(0) scale(1)}}
@keyframes bzCardIn{0%{opacity:0;transform:translateY(46px) scale(.78) rotate(var(--r,0deg))}100%{opacity:var(--o,.9);transform:translateY(0) scale(1) rotate(var(--r,0deg))}}
@keyframes bzRing{0%{opacity:.55;transform:scale(.35)}100%{opacity:0;transform:scale(2.7)}}
@keyframes bzTwinkle{0%,100%{opacity:.15;transform:scale(.5) rotate(0)}50%{opacity:1;transform:scale(1.15) rotate(25deg)}}
@keyframes bzDrift{0%{transform:translate(0,0) rotate(var(--r,0deg))}100%{transform:translate(var(--dx,0px),var(--dy,-14px)) rotate(var(--r,0deg))}}
@keyframes bzPetal{0%{opacity:0;transform:scale(0) rotate(0)}60%{opacity:1}100%{opacity:1;transform:scale(1) rotate(var(--pr,0deg))}}
`;

function Sparkles({ n = 10, color = "#fff" }: { n?: number; color?: string }) {
  const seed = [[8,14],[18,72],[26,40],[12,86],[32,22],[70,16],[84,66],[76,44],[90,80],[64,88],[46,10],[54,92]];
  return (
    <>
      {seed.slice(0, n).map(([t, l], i) => (
        <Sparkle key={i} className="absolute" strokeWidth={1.5}
          style={{ top: `${t}%`, left: `${l}%`, width: 10 + (i % 3) * 6, height: 10 + (i % 3) * 6, color,
            filter: "drop-shadow(0 0 6px rgba(255,255,255,.8))",
            animation: `bzTwinkle ${1.6 + (i % 4) * 0.4}s ease-in-out ${i * 0.18}s infinite` }} />
      ))}
    </>
  );
}

export function BloomzeinIntro({
  model = 1, channel, audioUrl, onDone, durationMs,
}: { model?: IntroModel; channel?: string; audioUrl?: string; onDone: () => void; durationMs?: number }) {
  const dur = durationMs ?? (model === 2 ? 5200 : model === 3 ? 4200 : 5000);
  const [closing, setClosing] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const doneRef = useRef(false);
  const finish = () => {
    if (doneRef.current) return; doneRef.current = true;
    try { audioRef.current?.pause(); } catch {}
    onDone();
  };
  useEffect(() => {
    if (audioUrl) { try { const a = new Audio(audioUrl); a.volume = 0.95; audioRef.current = a; a.play().catch(() => {}); } catch {} }
    const t1 = window.setTimeout(() => setClosing(true), Math.max(0, dur - 700));
    const t2 = window.setTimeout(finish, dur);
    return () => { window.clearTimeout(t1); window.clearTimeout(t2); try { audioRef.current?.pause(); } catch {} };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const bg =
    model === 2
      ? "radial-gradient(120% 100% at 50% 30%, #FFF1F6 0%, #FFE3EE 45%, #FBD0E4 100%)"
      : model === 3
      ? "radial-gradient(120% 120% at 50% 40%, #FF9CC9 0%, #FF6FB0 45%, #E84E9C 100%)"
      : "radial-gradient(120% 120% at 50% 35%, #FFD9EC 0%, #FDA9D3 45%, #F56DB0 100%)";

  const logo = (size: number, glow = true) => (
    <div className="grid place-items-center rounded-[28%] bg-gradient-to-br from-white to-[#FFE3F1] shadow-2xl"
      style={{ height: size, width: size, boxShadow: glow ? "0 10px 50px rgba(236,72,153,.55), inset 0 0 0 3px rgba(255,255,255,.7)" : undefined }}>
      <Flower className="text-hotpink" strokeWidth={2} style={{ height: size * 0.56, width: size * 0.56 }} />
    </div>
  );

  const Title = ({ size, dark }: { size: string; dark?: boolean }) => (
    <div className="relative inline-block overflow-hidden">
      <h1 className="font-script leading-none tracking-tight" style={{ fontSize: size }}>
        {"Bloomzein".split("").map((c, i) => (
          <span key={i} className="inline-block"
            style={{
              color: dark ? "#B21E6F" : "#fff",
              textShadow: dark ? "0 2px 18px rgba(236,72,153,.35)" : "0 4px 26px rgba(236,72,153,.6)",
              animation: `bzUp .55s cubic-bezier(.2,.8,.2,1) ${1.0 + i * 0.06}s both`,
            }}>{c}</span>
        ))}
      </h1>
      {/* gleam sweep across the wordmark */}
      <span aria-hidden className="pointer-events-none absolute inset-y-0 -left-1/3 w-1/3"
        style={{ background: "linear-gradient(100deg, transparent, rgba(255,255,255,.85), transparent)", animation: "bzGleam 1.3s ease-in-out 1.7s both" }} />
    </div>
  );

  const channelChip = channel && (
    <div className="inline-flex items-center gap-1.5 rounded-full bg-white/25 backdrop-blur-md border border-white/40 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.25em] text-white"
      style={{ animation: "bzUp .5s ease .35s both" }}>
      <Flower className="h-3 w-3" /> {channel}
    </div>
  );

  let inner: React.ReactNode;

  if (model === 2) {
    // ── Model 2 · "Soft Bloom" — calm, airy, spa; petals bloom open, serif-soft.
    inner = (
      <div className="relative h-full w-full grid place-items-center px-6 text-center">
        <Sparkles n={6} color="#EC4899" />
        {/* petals blooming behind the logo */}
        <div className="absolute" style={{ animation: "bzUp .8s ease .1s both" }}>
          {Array.from({ length: 8 }).map((_, i) => (
            <span key={i} className="absolute left-1/2 top-1/2 h-24 w-9 -translate-x-1/2 -translate-y-1/2 rounded-full"
              style={{ background: "linear-gradient(180deg, rgba(255,255,255,.9), rgba(249,168,212,.55))",
                transformOrigin: "50% 100%",
                ["--pr" as any]: `${i * 45}deg`,
                transform: `rotate(${i * 45}deg) translateY(-40px)`,
                animation: `bzPetal .9s cubic-bezier(.2,.8,.2,1) ${0.15 + i * 0.07}s both`,
                filter: "blur(.3px)" }} />
          ))}
        </div>
        <div className="relative flex flex-col items-center gap-5">
          <div style={{ animation: "bzLogoPop 1.1s cubic-bezier(.2,.9,.25,1.2) .2s both" }}>{logo(96, false)}</div>
          <Title size="clamp(2.6rem,11vw,5.5rem)" dark />
          <p className="text-[#9D3B72] text-sm sm:text-base tracking-[0.28em] uppercase font-semibold"
            style={{ animation: "bzUp .7s ease 1.9s both" }}>bloom your softest era</p>
          {channelChip && <div className="mt-1"><div className="inline-flex items-center gap-1.5 rounded-full bg-white/60 border border-hotpink/20 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.25em] text-hotpink" style={{ animation: "bzUp .5s ease 2.2s both" }}><Flower className="h-3 w-3" /> {channel}</div></div>}
        </div>
      </div>
    );
  } else if (model === 3) {
    // ── Model 3 · "Glam Pop" — punchy, saturated, collage snaps in with bounce.
    inner = (
      <div className="relative h-full w-full grid place-items-center overflow-hidden">
        <Sparkles n={12} />
        {/* pulsing rings behind */}
        {[0, 0.5, 1].map((d, i) => (
          <span key={i} className="absolute left-1/2 top-1/2 h-40 w-40 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white/50"
            style={{ animation: `bzRing 1.7s ease-out ${d}s infinite` }} />
        ))}
        {/* collage cards snapping in around center */}
        {[
          { src: COLLAGE[0], s: "top-[8%] left-[6%] w-28 sm:w-40", r: -9, d: 0.15 },
          { src: COLLAGE[1], s: "top-[10%] right-[6%] w-28 sm:w-40", r: 8, d: 0.28 },
          { src: COLLAGE[2], s: "bottom-[9%] left-[9%] w-28 sm:w-40", r: 7, d: 0.4 },
          { src: COLLAGE[3], s: "bottom-[8%] right-[8%] w-28 sm:w-40", r: -8, d: 0.52 },
        ].map((c, i) => (
          <div key={i} className={["absolute rounded-2xl overflow-hidden ring-4 ring-white shadow-2xl", c.s].join(" ")}
            style={{ ["--r" as any]: `${c.r}deg`, ["--o" as any]: 1, animation: `bzCardIn .5s cubic-bezier(.2,1.3,.4,1) ${c.d}s both` }}>
            <img src={c.src} alt="" className="w-full aspect-[3/4] object-cover" />
          </div>
        ))}
        <div className="relative z-10 flex flex-col items-center gap-4 px-4">
          {channelChip}
          <div style={{ animation: "bzLogoPop 1s cubic-bezier(.2,.9,.25,1.2) .5s both" }}>{logo(104)}</div>
          <Title size="clamp(2.8rem,13vw,6.5rem)" />
          <p className="text-white text-sm sm:text-lg font-bold tracking-[0.3em] uppercase drop-shadow"
            style={{ animation: "bzUp .6s ease 1.9s both" }}>bloom your softest era</p>
        </div>
      </div>
    );
  } else {
    // ── Model 1 · "Sparkle Dream" — glam floral collage + wordmark + sparkle.
    inner = (
      <div className="relative h-full w-full grid place-items-center overflow-hidden">
        <Sparkles n={11} />
        {/* soft drifting floral collage */}
        {[
          { src: COLLAGE[4], s: "top-[6%] left-[8%] w-24 sm:w-36", r: -8, o: 0.85, d: 0.1, dx: "8px", dy: "-16px" },
          { src: COLLAGE[1], s: "top-[12%] right-[7%] w-24 sm:w-36", r: 9, o: 0.85, d: 0.25, dx: "-8px", dy: "-12px" },
          { src: COLLAGE[0], s: "bottom-[10%] left-[6%] w-24 sm:w-36", r: 7, o: 0.85, d: 0.4, dx: "10px", dy: "12px" },
          { src: COLLAGE[3], s: "bottom-[8%] right-[9%] w-24 sm:w-36", r: -9, o: 0.85, d: 0.55, dx: "-10px", dy: "10px" },
          { src: COLLAGE[5], s: "top-[42%] left-[2%] w-20 sm:w-28", r: 5, o: 0.7, d: 0.7, dx: "12px", dy: "0px" },
        ].map((c, i) => (
          <div key={i} className={["absolute rounded-2xl overflow-hidden ring-2 ring-white/70 shadow-xl", c.s].join(" ")}
            style={{ ["--r" as any]: `${c.r}deg`, ["--o" as any]: c.o, animation: `bzCardIn .7s cubic-bezier(.2,.8,.2,1) ${c.d}s both` }}>
            <div style={{ ["--dx" as any]: c.dx, ["--dy" as any]: c.dy, ["--r" as any]: `${c.r}deg`, animation: `bzDrift 6s ease-in-out ${c.d}s infinite alternate` }}>
              <img src={c.src} alt="" className="w-full aspect-[3/4] object-cover" />
            </div>
          </div>
        ))}
        {/* centre lockup */}
        <div className="relative z-10 flex flex-col items-center gap-4 px-4 text-center">
          {channelChip}
          <div style={{ animation: "bzLogoPop 1.1s cubic-bezier(.2,.9,.25,1.2) .3s both" }}>{logo(112)}</div>
          <Title size="clamp(2.8rem,12vw,6.5rem)" />
          <p className="text-white/95 text-sm sm:text-lg font-semibold tracking-[0.3em] uppercase"
            style={{ textShadow: "0 2px 16px rgba(236,72,153,.5)", animation: "bzUp .7s ease 1.9s both" }}>
            bloom your softest era
          </p>
        </div>
      </div>
    );
  }

  return createPortal(
    <div onClick={finish}
      className="fixed inset-0 z-[110] overflow-hidden cursor-pointer select-none"
      style={{ background: bg, animation: closing ? "bzIntroOut .7s ease-in forwards" : undefined }}>
      <style>{KEYFRAMES}</style>
      {/* glossy top sheen */}
      <div aria-hidden className="pointer-events-none absolute inset-0" style={{ background: "radial-gradient(80% 50% at 50% 0%, rgba(255,255,255,.35), transparent 60%)" }} />
      {inner}
      <div className="absolute inset-x-0 bottom-5 text-center text-[11px] font-semibold tracking-wide text-white/70"
        style={{ animation: "bzUp .6s ease 2.6s both" }}>tap to skip</div>
    </div>,
    document.body,
  );
}
