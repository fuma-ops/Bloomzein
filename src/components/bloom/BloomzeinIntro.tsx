import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { AppIcon } from "./AppIcon";

/**
 * BloomzeinIntro — a slow (~7s) branded opener that plays full-screen before a
 * session (portal, so a screen-recording captures it), then dissolves into it.
 *
 * Calm & simple by design: the video sits faded behind a STRONG static pink wash;
 * our flower logo rises small from the centre — rotating gently — zooms out then
 * settles; then the session's title + duration appear slowly, held long enough to
 * read, before a soft dissolve into the flow. No glass flower, no clutter.
 */

export const INTRO_MODEL_KEY = "bloom:intro-model"; // back-compat

const WOMAN_VIDEO = "/videos/Woman_enjoying_cobra_pose_yoga_202608031603.mp4";
const PETALS_VIDEO = "/videos/animate_softly_1080p_202608031558.mp4";

export interface BloomzeinIntroProps {
  videoSrc?: string;      // faded background video (defaults to the petals/light clip)
  channel?: string;       // "Yoga" | "Workout"
  sessionTitle?: string;  // e.g. "Morning Energy Flow"
  sessionMeta?: string;   // e.g. "15 Minutes"
  pillars?: string[];     // e.g. ["Awaken", "Stretch", "Bloom"]
  audioUrl?: string;      // ElevenLabs sting (optional)
  durationMs?: number;
  onDone: () => void;
}

const CSS = `
.bz-root{position:fixed;inset:0;z-index:90;overflow:hidden;cursor:pointer;user-select:none;background:#7a1247;
  font-synthesis:none;-webkit-font-smoothing:antialiased;}
.bz-layer{position:absolute;inset:0;}
.bz-vid{width:100%;height:100%;object-fit:cover;}
@keyframes bzSpin{to{transform:rotate(360deg)}}
.bz-logo-spin{animation:bzSpin 22s linear infinite;filter:drop-shadow(0 12px 40px rgba(180,20,90,.55));}
.bz-wordmark{font-family:"Satisfy","Dancing Script","Caveat",cursive;color:#fff;line-height:.9;
  text-shadow:0 3px 30px rgba(160,10,70,.6);}
.bz-title{font-family:"Satisfy","Dancing Script",cursive;color:#fff;line-height:.92;
  text-shadow:0 4px 34px rgba(160,10,70,.65);}
`;

export function BloomzeinIntro({
  videoSrc = PETALS_VIDEO,
  channel,
  sessionTitle = "Morning Energy Flow",
  sessionMeta = "15 Minutes",
  pillars = ["Awaken", "Stretch", "Bloom"],
  audioUrl,
  durationMs = 7000,
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

      gsap.set(root, { opacity: 1 });
      tl = gsap.timeline({ defaults: { ease: "power3.out" }, onComplete: finish });

      // scene fades up
      tl.from(".bz-womanlayer, .bz-wash", { opacity: 0, duration: 1.0 }, 0);

      // LOGO — rises small from the centre, zooms OUT (grows), then settles IN
      tl.fromTo(".bz-logo", { scale: 0, opacity: 0 }, { scale: 1.18, opacity: 1, duration: 2.2, ease: "back.out(1.5)" }, 0.3)
        .to(".bz-logo", { scale: 1.0, duration: 1.0, ease: "power2.inOut" }, 2.5)
        .from(".bz-wordmark", { opacity: 0, y: 20, duration: 1.0 }, 2.3);

      // brand eases up, then the session title + duration appear SLOWLY
      const infoAt = secs - 3.4;
      tl.to(".bz-brand", { yPercent: -14, scale: 0.9, opacity: 0.0, duration: 1.0, ease: "power2.inOut" }, infoAt)
        .from(".bz-title-line", { opacity: 0, y: 24, duration: 1.0, stagger: 0.45, ease: "power2.out" }, infoAt + 0.5)
        .from(".bz-pillar", { opacity: 0, y: 12, duration: 0.7, stagger: 0.14 }, infoAt + 1.9)
        // hold for reading, then dissolve into the session
        .to(root, { opacity: 0, duration: 0.7, ease: "power2.inOut" }, secs - 0.7);
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

      {/* faded video background */}
      <div className="bz-layer bz-womanlayer">
        <video className="bz-vid" src={videoSrc} autoPlay loop muted playsInline
          style={{ filter: "saturate(1.05) brightness(.9)" }} />
      </div>
      {/* STRONG static pink wash — video reads faded underneath, everything coherent */}
      <div className="bz-layer bz-wash" style={{
        background: "linear-gradient(180deg, rgba(232,78,156,0.62), rgba(150,15,80,0.62))",
      }} />
      <div className="bz-layer" aria-hidden style={{ background: "radial-gradient(60% 42% at 50% 4%, rgba(255,255,255,.28), transparent 60%)" }} />

      {/* brand: our flower logo (small → rotate → zoom out → settle) + wordmark */}
      <div className="bz-layer bz-brand" style={{ display: "grid", placeItems: "center" }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "3vh" }}>
          <div className="bz-logo" style={{ display: "grid", placeItems: "center" }}>
            <div className="bz-logo-spin" style={{ display: "grid", placeItems: "center" }}>
              <AppIcon size={320} className="h-[26vmin] w-[26vmin]" />
            </div>
          </div>
          <div className="bz-wordmark" style={{ fontSize: "clamp(3rem,12vw,8rem)", textAlign: "center" }}>Bloomzein</div>
        </div>
      </div>

      {/* session title + duration (slow) */}
      <div className="bz-layer" style={{ display: "grid", placeItems: "center", pointerEvents: "none" }}>
        <div style={{ textAlign: "center", padding: "0 6vw" }}>
          {channel && (
            <div className="bz-title-line" style={{ color: "#fff", fontWeight: 700, letterSpacing: "0.3em", textTransform: "uppercase",
              fontSize: "clamp(.7rem,1.6vw,1rem)", opacity: 0.9, marginBottom: "1.6vh" }}>{channel}</div>
          )}
          <div className="bz-title bz-title-line" style={{ fontSize: "clamp(2.8rem,9.5vw,7rem)" }}>{sessionTitle}</div>
          {sessionMeta && (
            <div className="bz-title-line" style={{ display: "inline-block", marginTop: "2.6vh", padding: ".55em 1.6em", borderRadius: "9999px",
              background: "rgba(255,255,255,.2)", backdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,.4)",
              color: "#fff", fontWeight: 700, letterSpacing: "0.16em", textTransform: "uppercase", fontSize: "clamp(.95rem,2.6vw,1.5rem)" }}>{sessionMeta}</div>
          )}
          {pillars?.length > 0 && (
            <div style={{ marginTop: "3.4vh", display: "flex", gap: "2.4vw", justifyContent: "center", alignItems: "center" }}>
              {pillars.map((p, i) => (
                <span key={p} className="bz-pillar" style={{ display: "flex", alignItems: "center", gap: "2.4vw",
                  color: "#fff", fontWeight: 700, letterSpacing: "0.22em", textTransform: "uppercase", fontSize: "clamp(.62rem,1.5vw,.95rem)" }}>
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
