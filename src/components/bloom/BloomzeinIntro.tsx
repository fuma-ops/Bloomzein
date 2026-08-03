import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";

/**
 * BloomzeinIntro — a ~5s cinematic, luxury-editorial opener that plays full-screen
 * at the start of a session (portal, so a screen-recording captures it), then
 * calls `onDone` to reveal the session underneath.
 *
 * Layers, back → front:
 *   1. the woman yoga clip, drifting softly (`videoSrc`);
 *   2. the sakura-petals / light-rays clip blended over it (`petalsSrc`, screen);
 *   3. a translucent rose wash so the two read as one coherent, premium scene;
 *   4. the glassmorphism sakura that blooms open + the handwritten wordmark that
 *      writes itself with the tagline;
 *   5. the session title + duration card, which then dissolves into the flow.
 *
 * The petals come from the video, so there are no CSS petals. Motion is a GSAP
 * timeline; pointer parallax adds depth. Palette lives in CSS variables.
 */

export const INTRO_MODEL_KEY = "bloom:intro-model"; // back-compat

// The brand's own footage (committed to /public/videos).
const WOMAN_VIDEO = "/videos/Woman_enjoying_cobra_pose_yoga_202608031603.mp4";
const PETALS_VIDEO = "/videos/animate_softly_1080p_202608031558.mp4";

export interface BloomzeinIntroProps {
  videoSrc?: string;      // the woman yoga clip (background)
  petalsSrc?: string;     // the sakura-petals / light clip (foreground, blended)
  channel?: string;       // "Yoga" | "Workout"
  sessionTitle?: string;  // e.g. "Morning Energy Flow"
  sessionMeta?: string;   // e.g. "15 Minutes"
  pillars?: string[];     // e.g. ["Awaken", "Stretch", "Bloom"]
  tagline?: string;       // e.g. "stay soft, bloom on"
  audioUrl?: string;      // ElevenLabs sting (optional)
  durationMs?: number;
  onDone: () => void;
}

const CSS = `
.bz-root{--bz-hot:#EC4899;--bz-deep:#B21E6F;--bz-rose:#F56DB0;--bz-gold:#F6C77A;
  position:fixed;inset:0;z-index:90;overflow:hidden;cursor:pointer;user-select:none;background:#2a0a1c;
  font-synthesis:none;-webkit-font-smoothing:antialiased;}
.bz-layer{position:absolute;inset:0;will-change:transform,opacity;}
.bz-vid{width:100%;height:100%;object-fit:cover;}
@keyframes bzCoreGlow{0%,100%{opacity:.7;transform:scale(1)}50%{opacity:1;transform:scale(1.08)}}
.bz-glass-petal{position:absolute;left:50%;top:50%;border-radius:64% 64% 58% 58%/ 78% 78% 42% 42%;
  background:linear-gradient(160deg,rgba(255,255,255,.55),rgba(255,120,180,.42) 55%,rgba(210,40,110,.5));
  border:1.5px solid rgba(246,199,122,.9);
  box-shadow:inset 0 8px 20px rgba(255,255,255,.55),inset 0 -10px 22px rgba(160,20,80,.4),0 8px 26px rgba(180,20,90,.35);
  backdrop-filter:blur(3px);}
.bz-glass-petal::after{content:"";position:absolute;top:8%;left:22%;width:34%;height:38%;border-radius:9999px;
  background:linear-gradient(180deg,rgba(255,255,255,.85),transparent);filter:blur(1px);}
.bz-pen{position:absolute;top:-2%;width:14px;height:14px;border-radius:9999px;background:#fff;
  box-shadow:0 0 16px 6px rgba(255,220,240,.95),0 0 34px 12px rgba(236,72,153,.6);}
.bz-wordmark{font-family:"Satisfy","Dancing Script","Caveat",cursive;color:#fff;line-height:.9;
  text-shadow:0 3px 30px rgba(236,72,153,.55),0 1px 0 rgba(255,255,255,.4);}
.bz-title{font-family:"Satisfy","Dancing Script",cursive;color:#fff;line-height:.92;
  text-shadow:0 4px 34px rgba(236,72,153,.6);}
`;

const GLASS = Array.from({ length: 8 }).map((_, i) => ({ rot: i * 45, i }));

export function BloomzeinIntro({
  videoSrc = WOMAN_VIDEO,
  petalsSrc = PETALS_VIDEO,
  channel,
  sessionTitle = "Morning Energy Flow",
  sessionMeta = "15 Minutes",
  pillars = ["Awaken", "Stretch", "Bloom"],
  tagline = "stay soft, bloom on",
  audioUrl,
  durationMs = 5200,
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
    let onMove: ((e: PointerEvent) => void) | null = null;
    const safety = window.setTimeout(finish, durationMs + 900);

    (async () => {
      const mod = await import("gsap");
      if (killed) return;
      const gsap = (mod as any).gsap || (mod as any).default;
      const D = durationMs / 5200;

      gsap.set(root, { opacity: 1 });
      tl = gsap.timeline({ defaults: { ease: "power3.out" }, onComplete: finish });

      // Scene 1 · 0.0–0.8 — the scene fades up, petals-clip breathes in
      tl.from(".bz-womanlayer", { opacity: 0, scale: 1.14, duration: 1.0 * D }, 0)
        .from(".bz-petalslayer", { opacity: 0, duration: 1.0 * D }, 0)
        .from(".bz-wash", { opacity: 0, duration: 0.9 * D }, 0)
        .from(".bz-glow", { opacity: 0, scale: 1.25, duration: 0.8 * D }, 0);

      // Scene 2 · 0.8–1.8 — the glass sakura blooms open
      tl.from(".bz-core", { scale: 0, opacity: 0, duration: 0.5 * D, ease: "back.out(1.9)" }, 0.85 * D)
        .from(".bz-glass-petal", { scale: 0, opacity: 0, transformOrigin: "50% 92%", duration: 0.72 * D, stagger: 0.055, ease: "back.out(1.6)" }, 0.92 * D)
        .from(".bz-flowerglow", { opacity: 0, scale: 0.4, duration: 0.7 * D }, 1.0 * D)
        .fromTo(".bz-flower-sheen", { xPercent: -160 }, { xPercent: 160, duration: 0.9 * D, ease: "power2.inOut" }, 1.25 * D);

      // Scene 3 · 1.8–2.8 — the flower floats up to make room for the wordmark
      tl.to(".bz-flowerwrap", { yPercent: -26, scale: 0.7, duration: 1.0 * D, ease: "power2.inOut" }, 2.55 * D);

      // Scene 4 · 2.8–3.8 — the wordmark writes itself; tagline fades in
      tl.set(".bz-wordwrap", { opacity: 1 }, 2.85 * D)
        .fromTo(".bz-wordmark", { clipPath: "inset(0 100% 0 0)" }, { clipPath: "inset(0 0% 0 0)", duration: 0.95 * D, ease: "power1.inOut" }, 2.9 * D)
        .fromTo(".bz-pen", { left: "-2%", opacity: 1 }, { left: "102%", duration: 0.95 * D, ease: "power1.inOut" }, 2.9 * D)
        .to(".bz-pen", { opacity: 0, duration: 0.2 * D }, 3.85 * D)
        .from(".bz-tagline", { opacity: 0, y: 14, duration: 0.5 * D }, 3.5 * D);

      // Scene 5 · 3.8–5.2 — the session title + duration, then dissolve into the flow
      tl.to(".bz-brand", { opacity: 0, y: -22, duration: 0.55 * D, ease: "power2.in" }, 3.95 * D)
        .from(".bz-titlecard", { opacity: 0, scale: 0.92, y: 26, duration: 0.7 * D, ease: "power3.out" }, 4.15 * D)
        .from(".bz-title-line", { opacity: 0, y: 16, duration: 0.5 * D, stagger: 0.12 }, 4.25 * D)
        .from(".bz-pillar", { opacity: 0, y: 10, duration: 0.4 * D, stagger: 0.1 }, 4.55 * D)
        .to(root, { opacity: 0, duration: 0.55 * D, ease: "power2.inOut" }, (durationMs / 1000) - 0.55);

      // Pointer parallax — layered depth following the cursor
      const mk = (sel: string, d: number) => ({ x: gsap.quickTo(sel, "xPercent", { duration: d, ease: "power3" }), y: gsap.quickTo(sel, "yPercent", { duration: d, ease: "power3" }) });
      const p2 = mk(".bz-p2", 1.1), p3 = mk(".bz-p3", 1.3);
      onMove = (e: PointerEvent) => {
        const dx = e.clientX / window.innerWidth - 0.5, dy = e.clientY / window.innerHeight - 0.5;
        p2.x(dx * 3); p2.y(dy * 3); p3.x(dx * 6); p3.y(dy * 6);
      };
      window.addEventListener("pointermove", onMove);
    })();

    return () => {
      killed = true;
      window.clearTimeout(safety);
      try { tl?.kill(); } catch {}
      if (onMove) window.removeEventListener("pointermove", onMove);
      try { audioRef.current?.pause(); } catch {}
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return createPortal(
    <div ref={rootRef} className="bz-root" onClick={finish}>
      <style>{CSS}</style>

      {/* 1 · the woman, drifting softly behind */}
      <div className="bz-layer bz-womanlayer">
        <video className="bz-vid" src={videoSrc} autoPlay loop muted playsInline
          style={{ filter: "saturate(1.05) brightness(.92)" }} />
      </div>
      {/* 2 · sakura petals + light rays, blended over her (screen) */}
      <div className="bz-layer bz-petalslayer bz-p2" style={{ mixBlendMode: "screen", opacity: 0.72 }}>
        <video className="bz-vid" src={petalsSrc} autoPlay loop muted playsInline />
      </div>
      {/* 3 · translucent rose wash — unifies the two clips + keeps text legible */}
      <div className="bz-layer bz-wash" style={{ background: "linear-gradient(180deg, rgba(214,30,110,.34), rgba(120,10,55,.5)), radial-gradient(120% 85% at 50% 12%, rgba(255,190,225,.28), transparent 55%)" }} />
      {/* soft top bloom light */}
      <div className="bz-layer bz-glow" style={{ background: "radial-gradient(58% 42% at 50% 2%, rgba(255,255,255,.42), rgba(255,190,225,.16) 45%, transparent 70%)" }} />

      {/* 4 · hero glass sakura + brand lockup */}
      <div className="bz-layer bz-p3" style={{ display: "grid", placeItems: "center" }}>
        <div className="bz-flowerwrap" style={{ position: "relative", display: "grid", placeItems: "center" }}>
          <div className="bz-flowerglow" style={{ position: "absolute", width: "46vmin", height: "46vmin", borderRadius: "9999px",
            background: "radial-gradient(circle, rgba(255,220,240,.85), rgba(255,120,190,.35) 45%, transparent 70%)",
            animation: "bzCoreGlow 3.2s ease-in-out infinite" }} />
          <div style={{ position: "relative", width: "34vmin", height: "34vmin" }}>
            {GLASS.map(({ rot, i }) => (
              <div key={i} className="bz-glass-petal"
                style={{ width: "9vmin", height: "16vmin", transform: `translate(-50%,-92%) rotate(${rot}deg)`, transformOrigin: "50% 92%" }} />
            ))}
            <div className="bz-flower-sheen" style={{ position: "absolute", inset: "-10%", pointerEvents: "none",
              background: "linear-gradient(105deg, transparent 40%, rgba(255,255,255,.55) 50%, transparent 60%)" }} />
            <div className="bz-core" style={{ position: "absolute", left: "50%", top: "50%", width: "11vmin", height: "11vmin",
              transform: "translate(-50%,-50%)", borderRadius: "9999px",
              background: "radial-gradient(circle at 50% 42%, #fff 0%, #FFE3F1 55%, #F9A8D4 100%)",
              boxShadow: "0 6px 24px rgba(180,20,90,.4), inset 0 -6px 14px rgba(236,72,153,.35)" }}>
              {Array.from({ length: 5 }).map((_, i) => (
                <span key={i} style={{ position: "absolute", left: "50%", top: "50%", width: "3.4vmin", height: "4.4vmin",
                  background: "linear-gradient(180deg,#fff,#FBC2E0)", borderRadius: "50% 50% 50% 50% / 62% 62% 38% 38%",
                  transform: `translate(-50%,-86%) rotate(${i * 72}deg)`, transformOrigin: "50% 86%",
                  boxShadow: "inset 0 -3px 6px rgba(236,72,153,.4)" }} />
              ))}
              <span style={{ position: "absolute", left: "50%", top: "50%", width: "2.4vmin", height: "2.4vmin", transform: "translate(-50%,-50%)",
                borderRadius: "9999px", background: "radial-gradient(circle,#F6C77A,#EC9F4A)" }} />
            </div>
          </div>

          <div className="bz-brand" style={{ position: "absolute", top: "calc(50% + 20vmin)", left: "50%", transform: "translateX(-50%)", textAlign: "center", width: "90vw" }}>
            <div className="bz-wordwrap" style={{ position: "relative", display: "inline-block", opacity: 0 }}>
              <div className="bz-wordmark" style={{ fontSize: "clamp(3rem,11vw,8rem)" }}>Bloomzein</div>
              <span className="bz-pen" />
            </div>
            <div className="bz-tagline" style={{ marginTop: "1.4vh", color: "#fff", fontWeight: 600,
              letterSpacing: "0.34em", textTransform: "uppercase", fontSize: "clamp(.7rem,1.8vw,1.05rem)",
              textShadow: "0 2px 16px rgba(236,72,153,.5)" }}>— {tagline} ✿</div>
          </div>
        </div>
      </div>

      {/* 5 · session title + duration card */}
      <div className="bz-titlecard bz-layer" style={{ display: "grid", placeItems: "center", pointerEvents: "none" }}>
        <div style={{ textAlign: "center", padding: "0 6vw" }}>
          {channel && (
            <div className="bz-title-line" style={{ color: "#fff", fontWeight: 700, letterSpacing: "0.3em", textTransform: "uppercase",
              fontSize: "clamp(.7rem,1.6vw,1rem)", opacity: 0.85, marginBottom: "1.2vh" }}>{channel}</div>
          )}
          <div className="bz-title bz-title-line" style={{ fontSize: "clamp(2.6rem,9vw,6.5rem)" }}>{sessionTitle}</div>
          {sessionMeta && (
            <div className="bz-title-line" style={{ display: "inline-block", marginTop: "2.2vh", padding: ".5em 1.4em", borderRadius: "9999px",
              background: "rgba(255,255,255,.16)", backdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,.35)",
              color: "#fff", fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", fontSize: "clamp(.85rem,2.4vw,1.4rem)" }}>{sessionMeta}</div>
          )}
          {pillars?.length > 0 && (
            <div style={{ marginTop: "3vh", display: "flex", gap: "2.2vw", justifyContent: "center", alignItems: "center" }}>
              {pillars.map((p, i) => (
                <span key={p} className="bz-pillar" style={{ display: "flex", alignItems: "center", gap: "2.2vw",
                  color: "#fff", fontWeight: 700, letterSpacing: "0.22em", textTransform: "uppercase", fontSize: "clamp(.6rem,1.5vw,.9rem)" }}>
                  {p}{i < pillars.length - 1 && <span style={{ opacity: 0.5 }}>·</span>}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      <div style={{ position: "absolute", inset: "auto 0 3vh 0", textAlign: "center", color: "rgba(255,255,255,.6)", fontSize: 12, fontWeight: 600, letterSpacing: ".08em" }}>tap to skip</div>
    </div>,
    document.body,
  );
}
