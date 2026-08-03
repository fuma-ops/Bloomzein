import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Flower2, Heart, Flower, type LucideIcon } from "lucide-react";

/**
 * BloomzeinIntro — a slow (~8.5s) branded opener that plays full-screen before a
 * session (portal, so a screen-recording captures it), then dissolves into it.
 *
 * The woman clip drifts faded behind a strong pink wash + soft sakura sparkle;
 * our flower mark (no square) rises small from the centre, rotating, zooms out
 * then settles; the wordmark writes in; then the session title + duration hold
 * for ~3s (long enough to read) before a soft dissolve into the flow.
 */

export const INTRO_MODEL_KEY = "bloom:intro-model"; // back-compat

const WOMAN_VIDEO = "/videos/Woman_enjoying_cobra_pose_yoga_202608031603.mp4";
const PETALS_VIDEO = "/videos/animate_softly_1080p_202608031558.mp4";

export interface BloomzeinIntroProps {
  videoSrc?: string;      // the woman clip (faded background)
  petalsSrc?: string;     // sakura-petals / light clip (soft sparkle over her)
  channel?: string;       // "Yoga" | "Workout"
  sessionTitle?: string;  // e.g. "Morning Energy Flow"
  sessionMeta?: string;   // e.g. "15 Minutes"
  pillars?: string[];     // e.g. ["Awaken", "Stretch", "Bloom"]
  audioUrl?: string;      // ElevenLabs sting (optional)
  durationMs?: number;
  onDone: () => void;
}

/** The three little pillar glyphs, in order (lotus · heart · bloom). */
const PILLAR_ICONS: LucideIcon[] = [Flower2, Heart, Flower];

const CSS = `
.bz-root{position:fixed;inset:0;z-index:90;overflow:hidden;cursor:pointer;user-select:none;background:#7a1247;
  font-synthesis:none;-webkit-font-smoothing:antialiased;}
.bz-layer{position:absolute;inset:0;}
.bz-vid{width:100%;height:100%;object-fit:cover;}
@keyframes bzSpin{to{transform:rotate(360deg)}}
.bz-logo-spin{animation:bzSpin 26s linear infinite;filter:drop-shadow(0 10px 34px rgba(120,8,60,.6));}
.bz-script{font-family:"Pacifico","Satisfy","Dancing Script",cursive;color:#fff;line-height:1;
  text-shadow:0 3px 26px rgba(120,8,60,.6),0 1px 0 rgba(255,255,255,.25);}
`;

/** Our flower — the logo mark WITHOUT the rounded square. White sakura petals. */
function FlowerMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 512 512" className={className} aria-hidden>
      <defs>
        <radialGradient id="bzPetal" cx="50%" cy="34%" r="70%">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="0.75" stopColor="#ffffff" />
          <stop offset="1" stopColor="#FFE0F0" />
        </radialGradient>
      </defs>
      <g fill="url(#bzPetal)">
        {[0, 60, 120, 180, 240, 300].map((r) => (
          <ellipse key={r} cx="256" cy="150" rx="52" ry="104" transform={`rotate(${r} 256 256)`} />
        ))}
      </g>
      <circle cx="256" cy="256" r="50" fill="#FBC2E0" />
      <circle cx="256" cy="256" r="24" fill="#F6C77A" />
    </svg>
  );
}

export function BloomzeinIntro({
  videoSrc = WOMAN_VIDEO,
  petalsSrc = PETALS_VIDEO,
  channel,
  sessionTitle = "Morning Energy Flow",
  sessionMeta = "15 Minutes",
  pillars = ["Awaken", "Stretch", "Bloom"],
  audioUrl,
  durationMs = 8500,
  onDone,
}: BloomzeinIntroProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const doneRef = useRef(false);

  const finish = () => {
    if (doneRef.current) return; doneRef.current = true;
    try { audioRef.current?.pause(); } catch {}
    onDone();
  };

  useEffect(() => {
    if (audioUrl) { try { const a = new Audio(audioUrl); a.volume = 0.95; audioRef.current = a; a.play().catch(() => {}); } catch {} }
    const root = rootRef.current;
    if (!root) return;

    let tl: any; let killed = false;
    const safety = window.setTimeout(finish, durationMs + 900);

    (async () => {
      const mod = await import("gsap");
      if (killed) return;
      const gsap = (mod as any).gsap || (mod as any).default;
      const secs = durationMs / 1000;
      const HOLD = 3.0;                 // seconds the session title stays put
      const dissolveAt = secs - 0.6;
      const titleDone = dissolveAt - HOLD;  // title fully shown ~3s before the end

      gsap.set(root, { opacity: 1 });
      tl = gsap.timeline({ defaults: { ease: "power3.out" }, onComplete: finish });

      tl.from(".bz-womanlayer, .bz-petalslayer, .bz-wash", { opacity: 0, duration: 1.0 }, 0);

      // LOGO — rises small from centre, zooms OUT (grows), then settles IN
      tl.fromTo(".bz-logo", { scale: 0, opacity: 0 }, { scale: 1.18, opacity: 1, duration: 2.1, ease: "back.out(1.5)" }, 0.3)
        .to(".bz-logo", { scale: 1.0, duration: 1.0, ease: "power2.inOut" }, 2.4)
        .from(".bz-wordmark", { opacity: 0, y: 22, duration: 1.0 }, 2.3);

      // brand eases away, then the session title + duration appear and HOLD
      const infoStart = titleDone - 1.6;
      tl.to(".bz-brand", { yPercent: -12, scale: 0.9, opacity: 0, duration: 0.9, ease: "power2.inOut" }, infoStart)
        .from(".bz-title-line", { opacity: 0, y: 26, duration: 0.9, stagger: 0.4, ease: "power2.out" }, infoStart + 0.4)
        .from(".bz-pillar", { opacity: 0, y: 14, duration: 0.6, stagger: 0.14 }, titleDone - 0.4)
        .to(root, { opacity: 0, duration: 0.6, ease: "power2.inOut" }, dissolveAt);
    })();

    return () => {
      killed = true;
      window.clearTimeout(safety);
      try { tl?.kill(); } catch {}
      try { audioRef.current?.pause(); } catch {}
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return createPortal(
    <div ref={rootRef} className="bz-root" onClick={finish}>
      <style>{CSS}</style>

      {/* the woman, faded behind */}
      <div className="bz-layer bz-womanlayer">
        <video className="bz-vid" src={videoSrc} autoPlay loop muted playsInline
          style={{ filter: "saturate(1.05) brightness(1)" }} />
      </div>
      {/* soft sakura sparkle + light over her */}
      <div className="bz-layer bz-petalslayer" style={{ mixBlendMode: "screen", opacity: 0.5 }}>
        <video className="bz-vid" src={petalsSrc} autoPlay loop muted playsInline />
      </div>
      {/* strong pink wash — she reads faded underneath, everything coherent + pink */}
      <div className="bz-layer bz-wash" style={{ background: "linear-gradient(180deg, rgba(236,72,153,0.42), rgba(200,24,110,0.5))" }} />
      <div className="bz-layer" aria-hidden style={{ background: "radial-gradient(58% 40% at 50% 4%, rgba(255,255,255,.3), transparent 60%)" }} />

      {/* brand: our flower mark (no square) + wordmark */}
      <div className="bz-layer bz-brand" style={{ display: "grid", placeItems: "center" }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "3.5vh" }}>
          <div className="bz-logo" style={{ display: "grid", placeItems: "center" }}>
            <div className="bz-logo-spin" style={{ display: "grid", placeItems: "center" }}>
              <FlowerMark className="h-[24vmin] w-[24vmin]" />
            </div>
          </div>
          <div className="bz-wordmark bz-script" style={{ fontSize: "clamp(3rem,12vw,8rem)", textAlign: "center" }}>Bloomzein</div>
        </div>
      </div>

      {/* session title + duration + pillars (hold ~3s) */}
      <div className="bz-layer" style={{ display: "grid", placeItems: "center", pointerEvents: "none" }}>
        <div style={{ textAlign: "center", padding: "0 6vw" }}>
          {channel && (
            <div className="bz-title-line" style={{ color: "#fff", fontWeight: 700, letterSpacing: "0.3em", textTransform: "uppercase",
              fontSize: "clamp(.7rem,1.6vw,1rem)", opacity: 0.9, marginBottom: "1.6vh" }}>{channel}</div>
          )}
          <div className="bz-script bz-title-line" style={{ fontSize: "clamp(2.8rem,9.5vw,7rem)" }}>{sessionTitle}</div>
          {sessionMeta && (
            <div className="bz-title-line" style={{ display: "inline-block", marginTop: "2.6vh", padding: ".55em 1.6em", borderRadius: "9999px",
              background: "rgba(255,255,255,.2)", backdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,.45)",
              color: "#fff", fontWeight: 700, letterSpacing: "0.16em", textTransform: "uppercase", fontSize: "clamp(.95rem,2.6vw,1.5rem)" }}>{sessionMeta}</div>
          )}
          {pillars?.length > 0 && (
            <div style={{ marginTop: "3.6vh", display: "flex", gap: "6vw", justifyContent: "center", alignItems: "flex-start" }}>
              {pillars.map((p, i) => {
                const Icon = PILLAR_ICONS[i % PILLAR_ICONS.length];
                return (
                  <div key={p} className="bz-pillar" style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "1vh", color: "#fff" }}>
                    <Icon style={{ width: "clamp(20px,3.4vw,34px)", height: "clamp(20px,3.4vw,34px)" }} strokeWidth={1.8} />
                    <span style={{ fontWeight: 700, letterSpacing: "0.22em", textTransform: "uppercase", fontSize: "clamp(.6rem,1.4vw,.9rem)" }}>{p}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <div style={{ position: "absolute", inset: "auto 0 3vh 0", textAlign: "center", color: "rgba(255,255,255,.6)", fontSize: 12, fontWeight: 600, letterSpacing: ".08em" }}>tap to skip</div>
    </div>,
    document.body,
  );
}
