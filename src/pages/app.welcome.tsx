import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import {
  ArrowRight,
  Bell,
  CheckCircle2,
  Dumbbell,
  Feather,
  Moon,
  UtensilsCrossed,
  Wallet,
  Droplet,
  NotebookPen,
  CalendarHeart,
  Smile,
  Flower2,
} from "lucide-react";
import { trackEvent } from "../lib/analytics";

/**
 * WelcomeIntro — the Bloomzein entry world.
 *
 * Not a feature carousel: four cinematic beats that sell the *feeling* of the
 * life she wants, with the recurring Bloomzein lifestyle character living in
 * the background footage. Every card names what she gets to feel or do, never
 * a raw feature name.
 *
 *   0 · Brand reveal   — logo blooms, auto-advances (~2.2s)
 *   1 · Emotional hook — "Welcome to your Bloom."
 *   2 · Discovery      — benefits float *around* her, sequentially
 *   3 · Aspiration     — her day, together; then into the app
 *
 * The footage stays bright: a warm cream/blush veil lifts the top and bottom
 * so dark-pink type reads cleanly while she stays clear through the middle.
 * On desktop the whole thing sits in a centred phone stage so 9:16 footage is
 * never blown up past its own resolution.
 *
 * Swapping the films is a drop-in: replace /public/videos/intro-*.mp4 (+ the
 * matching .webp poster) and nothing here needs to change.
 */

const NEXT_PAGE = "/app/today";
const BRAND_MS = 2900;

function markSeen() {
  try {
    localStorage.setItem("bloom:intro-seen", "1");
  } catch {
    /* private mode — the intro simply shows again */
  }
}

function usePrefersReducedMotion() {
  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    const m = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduce(m.matches);
    const on = () => setReduce(m.matches);
    m.addEventListener?.("change", on);
    return () => m.removeEventListener?.("change", on);
  }, []);
  return reduce;
}

/** Petals drifting up, each swaying on its own rhythm. */
function Petals({ count = 12 }: { count?: number }) {
  return (
    <div className="wi-petals" aria-hidden>
      {Array.from({ length: count }).map((_, i) => (
        <span
          key={i}
          className="wi-petal"
          style={{
            left: `${(i * 8.3 + 3) % 100}%`,
            animationDuration: `${16 + (i % 5) * 3.5}s`,
            animationDelay: `${(i % 7) * -3.1}s`,
          }}
        >
          <i
            style={{
              animationDuration: `${4.5 + (i % 4) * 1.3}s`,
              transform: `scale(${0.55 + (i % 4) * 0.16})`,
              opacity: 0.3 + (i % 3) * 0.16,
            }}
          />
        </span>
      ))}
    </div>
  );
}

/** A few gold motes catching the light. */
function Motes({ count = 7 }: { count?: number }) {
  return (
    <div className="wi-motes" aria-hidden>
      {Array.from({ length: count }).map((_, i) => (
        <span
          key={i}
          style={{
            left: `${(i * 14.7 + 8) % 100}%`,
            top: `${(i * 23.3 + 12) % 90}%`,
            animationDelay: `${(i % 5) * -1.7}s`,
            animationDuration: `${3.6 + (i % 3) * 1.4}s`,
          }}
        />
      ))}
    </div>
  );
}

/** Reveal: fade + rise + un-blur. One motion vocabulary for the whole intro. */
function R({
  d = 0,
  className = "",
  children,
}: {
  d?: number;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={`wi-rv ${className}`} style={{ animationDelay: `${d}s` }}>
      {children}
    </div>
  );
}

function Cta({
  label,
  onClick,
  href,
  d,
}: {
  label: string;
  onClick?: () => void;
  href?: string;
  d: number;
}) {
  const inner = (
    <>
      {label} <ArrowRight className="h-[18px] w-[18px]" strokeWidth={2.2} />
    </>
  );
  return (
    <R d={d} className="wi-cta-wrap">
      {href ? (
        <a className="wi-cta" href={href} onClick={onClick}>
          {inner}
        </a>
      ) : (
        <button className="wi-cta" onClick={onClick}>
          {inner}
        </button>
      )}
    </R>
  );
}

/* ══════════════════ 0 · BRAND REVEAL ══════════════════ */
function SceneBrand() {
  return (
    <div className="wi-brandscene">
      <div className="wi-bloom-mark" aria-hidden>
        {[0, 1, 2, 3, 4, 5].map((n) => (
          <span key={n} style={{ animationDelay: `${0.1 + n * 0.07}s` }} />
        ))}
        <i />
      </div>
      <R d={0.62}>
        <div className="wi-brandmark">Bloomzein</div>
      </R>
      <R d={1.05}>
        <div className="wi-rule" />
        <div className="wi-brandtag">stay soft, bloom on.</div>
      </R>
    </div>
  );
}

/* ══════════════════ 1 · EMOTIONAL HOOK ══════════════════ */
function SceneHook({ onNext }: { onNext: () => void }) {
  return (
    <>
      <R d={0.15} className="wi-topbrand">
        <div className="wi-topbrand-name">Bloomzein</div>
        <div className="wi-topbrand-tag">stay soft, bloom on.</div>
      </R>

      <div className="wi-grow" />

      <div className="wi-lower">
        <R d={0.55}>
          <h1 className="wi-h1">Welcome to your Bloom.</h1>
        </R>
        <R d={0.95}>
          <div className="wi-rule wi-rule-l" />
          <p className="wi-sub">A little space for the woman you&rsquo;re becoming.</p>
        </R>
        <Cta label="Begin my journey" onClick={onNext} d={1.5} />
      </div>
    </>
  );
}

/* ══════════════════ 2 · DISCOVERY ══════════════════ */
type Around = { side: "l" | "r"; icon: ReactNode; label: string };

const DISCOVERY: Around[] = [
  { side: "l", icon: <Moon />, label: "Understand your rhythm" },
  { side: "r", icon: <Dumbbell />, label: "Move your body" },
  { side: "l", icon: <UtensilsCrossed />, label: "Nourish yourself" },
  { side: "r", icon: <CheckCircle2 />, label: "Build better habits" },
  { side: "l", icon: <Feather />, label: "Clear your mind" },
  { side: "r", icon: <Wallet />, label: "Feel more in control" },
  { side: "l", icon: <Bell />, label: "Remember what matters" },
];

function SceneDiscovery({ onNext }: { onNext: () => void }) {
  return (
    <>
      <div className="wi-head">
        <R d={0.1}>
          <h2 className="wi-h2">
            Everything in your life,
            <span className="wi-h2-script">beautifully connected.</span>
          </h2>
        </R>
        <R d={0.45}>
          <p className="wi-sub wi-sub-c">
            Your mood. Your movement. Your meals. Your plans. Your little everyday moments.
          </p>
        </R>
      </div>

      <div className="wi-around">
        {DISCOVERY.map((it, k) => (
          <div
            key={it.label}
            className={`wi-a-card wi-${it.side}`}
            style={{ gridRow: k + 1, animationDelay: `${0.95 + k * 0.16}s` }}
          >
            <span className="wi-a-ic">{it.icon}</span>
            <span className="wi-a-lb">{it.label}</span>
          </div>
        ))}
      </div>

      <div className="wi-grow" />

      <div className="wi-foot">
        <R d={2.25}>
          <p className="wi-closing">One beautiful space. Everything that matters to you.</p>
        </R>
      </div>
      <Cta label="Show me my Bloom" onClick={onNext} d={2.5} />
    </>
  );
}

/* ══════════════════ 3 · ASPIRATION ══════════════════ */
const DAY: Around[] = [
  { side: "l", icon: <Flower2 />, label: "Morning Yoga" },
  { side: "r", icon: <UtensilsCrossed />, label: "Nourishing Meal" },
  { side: "l", icon: <Smile />, label: "Mood" },
  { side: "r", icon: <Droplet />, label: "Water" },
  { side: "l", icon: <CheckCircle2 />, label: "Habits" },
  { side: "r", icon: <NotebookPen />, label: "Journal" },
  { side: "l", icon: <Bell />, label: "Reminders" },
  { side: "r", icon: <CalendarHeart />, label: "Planning" },
];

function SceneAspiration() {
  return (
    <>
      <div className="wi-head">
        <R d={0.1}>
          <h2 className="wi-h2">
            Your life doesn&rsquo;t need to be perfect.
            <span className="wi-h2-script">It just needs to feel like yours.</span>
          </h2>
        </R>
        <R d={0.45}>
          <p className="wi-sub wi-sub-c">
            Bloomzein brings your days together so you can move with intention, make time for
            yourself, and enjoy the little things again.
          </p>
        </R>
      </div>

      <div className="wi-around wi-around-tight">
        {DAY.map((it, k) => (
          <div
            key={it.label}
            className={`wi-a-card wi-a-chip wi-${it.side}`}
            style={{ gridRow: Math.floor(k / 2) + 1, animationDelay: `${0.95 + k * 0.13}s` }}
          >
            <span className="wi-a-ic">{it.icon}</span>
            <span className="wi-a-lb">{it.label}</span>
          </div>
        ))}
      </div>

      <div className="wi-grow" />

      <div className="wi-foot">
        <R d={2.15}>
          <div className="wi-rule wi-rule-c" />
          <p className="wi-final">This is your space.</p>
          <p className="wi-final-script">Your pace. Your rhythm. Your Bloom.</p>
        </R>
      </div>
      <Cta
        label="Start my Bloomzein journey"
        href={NEXT_PAGE}
        d={2.45}
        onClick={() => {
          markSeen();
          trackEvent("intro_complete", {});
        }}
      />
    </>
  );
}

/* ══════════════════ shell ══════════════════ */
const SCENES = [
  { key: "brand", video: null, poster: null },
  { key: "hook", video: "/videos/intro-welcome.mp4", poster: "/videos/intro-welcome.webp" },
  {
    key: "discovery",
    video: "/videos/intro-connected.mp4",
    poster: "/videos/intro-connected.webp",
  },
  { key: "aspiration", video: "/videos/intro-journey.mp4", poster: "/videos/intro-journey.webp" },
];

export default function WelcomeIntro() {
  const [i, setI] = useState(0);
  const touchX = useRef<number | null>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const reduce = usePrefersReducedMotion();

  const go = useCallback(
    (n: number) => setI((p) => (n === p ? p : Math.max(0, Math.min(SCENES.length - 1, n)))),
    [],
  );
  const next = useCallback(() => {
    setI((p) => {
      if (p >= SCENES.length - 1) return p;
      trackEvent("intro_next", { to: p + 1 });
      return p + 1;
    });
  }, []);

  useEffect(() => {
    trackEvent("intro_view", {});
  }, []);

  // Brand reveal breathes for a beat, then opens the world.
  useEffect(() => {
    if (i !== 0) return;
    const t = window.setTimeout(() => setI(1), reduce ? 900 : BRAND_MS);
    return () => window.clearTimeout(t);
  }, [i, reduce]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === "Enter") next();
      if (e.key === "ArrowLeft") go(i - 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [i, next, go]);

  // Soft parallax — the world leans a little as she moves.
  useEffect(() => {
    if (reduce) return;
    const el = stageRef.current;
    if (!el) return;
    const on = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - 0.5;
      const y = (e.clientY - r.top) / r.height - 0.5;
      el.style.setProperty("--px", String(x));
      el.style.setProperty("--py", String(y));
    };
    el.addEventListener("pointermove", on);
    return () => el.removeEventListener("pointermove", on);
  }, [reduce]);

  const s = SCENES[i];

  return (
    <div className="wi-root">
      <IntroStyles />
      <div className="wi-ambient" aria-hidden />

      <div
        className="wi-stage"
        ref={stageRef}
        onTouchStart={(e) => {
          touchX.current = e.touches[0].clientX;
        }}
        onTouchEnd={(e) => {
          if (touchX.current === null) return;
          const dx = e.changedTouches[0].clientX - touchX.current;
          if (Math.abs(dx) > 50 && i > 0) {
            if (dx < 0) next();
            else go(i - 1);
          }
          touchX.current = null;
        }}
      >
        {/* the world behind her */}
        <div className="wi-bg" key={s.key}>
          {s.video ? (
            <video
              className="wi-video"
              autoPlay
              muted
              loop
              playsInline
              preload="auto"
              poster={s.poster ?? undefined}
              disablePictureInPicture
            >
              <source src={s.video} type="video/mp4" />
            </video>
          ) : (
            <div className="wi-brandbg" />
          )}
          <div className="wi-veil" />
          <div className="wi-warm" />
          <div className="wi-cornermask" aria-hidden />
          <Petals />
          <Motes />
        </div>

        {/* light bloom on every scene change */}
        <div className="wi-flash" key={`f-${s.key}`} aria-hidden />

        {i > 0 && (
          <div className="wi-top">
            <div className="wi-dots">
              {[1, 2, 3].map((k) => (
                <i key={k} className={k <= i ? "on" : ""} />
              ))}
            </div>
            <a
              className="wi-skip"
              href={NEXT_PAGE}
              onClick={() => {
                markSeen();
                trackEvent("intro_skip", { at: i });
              }}
            >
              Skip
            </a>
          </div>
        )}

        <div className="wi-content" key={`c-${s.key}`}>
          {i === 0 && <SceneBrand />}
          {i === 1 && <SceneHook onNext={next} />}
          {i === 2 && <SceneDiscovery onNext={next} />}
          {i === 3 && <SceneAspiration />}
        </div>
      </div>
    </div>
  );
}

/* Scoped styles — every selector prefixed `wi-`. */
function IntroStyles() {
  return (
    <style>{`
    .wi-root{
      --pink:#EC4899; --deep:#DB2777; --hot:#E60076;
      --blush:#FCE7F3; --cream:#FFF7EF; --cream-d:#F7E4D3;
      --gold:#C9A06A; --gold-l:#E8CBA0;
      --ink:#7A1440; --ink-2:#9D5C7E;
      --glass:rgba(255,255,255,.70); --glass-line:rgba(255,255,255,.92);
      --shadow:0 14px 34px -18px rgba(150,30,80,.42);
      position:fixed;inset:0;z-index:60;overflow:hidden;
      display:grid;place-items:center;height:100dvh;
      font-family:var(--font-sans,"Quicksand",system-ui,sans-serif);
      background:
        radial-gradient(80% 60% at 50% 0%, #FFF6EE 0%, #FDEAF2 45%, #F6D4E4 100%);
    }
    /* desktop: soft blurred world behind a centred phone stage */
    .wi-ambient{position:absolute;inset:-10%;pointer-events:none;
      background:
        radial-gradient(40% 40% at 22% 26%, rgba(244,114,182,.30), transparent 62%),
        radial-gradient(44% 44% at 78% 70%, rgba(201,160,106,.22), transparent 62%);
      filter:blur(40px);animation:wi-breathe-bg 16s ease-in-out infinite}
    @keyframes wi-breathe-bg{0%,100%{transform:scale(1)}50%{transform:scale(1.08)}}

    /* Mobile: immersive full-bleed portrait (she stays centred in frame).
       ≥768px: the stage takes the film's own 16:9 shape, so the footage is
       shown WHOLE — never cropped — and the letterbox becomes the ambient world. */
    .wi-stage{position:relative;overflow:hidden;width:100%;height:100dvh;
      display:flex;flex-direction:column;isolation:isolate}
    @media (min-width:768px){
      .wi-stage{
        width:min(100vw, calc(100dvh * 16 / 9));
        height:auto;aspect-ratio:16/9;max-height:100dvh;
        box-shadow:0 40px 120px -50px rgba(150,30,80,.5)}
    }
    @media (min-width:1200px){
      .wi-stage{width:min(96vw, calc(94dvh * 16 / 9));border-radius:30px;
        box-shadow:0 50px 120px -46px rgba(150,30,80,.55),inset 0 0 0 1px rgba(255,255,255,.5)}
    }

    /* ── the world ── */
    .wi-bg{position:absolute;inset:0;z-index:0;overflow:hidden}
    .wi-video{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:50% 50%;
      transform:translate(calc(var(--px,0) * -10px), calc(var(--py,0) * -10px)) scale(1.06);
      filter:saturate(1.14) contrast(1.045);
      transition:transform .5s cubic-bezier(.2,.7,.2,1);
      animation:wi-kb 26s ease-in-out infinite alternate}
    @keyframes wi-kb{to{scale:1.09}}
    .wi-brandbg{position:absolute;inset:0;background:
      radial-gradient(70% 50% at 50% 34%, #FFFDFB 0%, #FFF2F7 42%, #FBD9E8 78%, #F3C3DC 100%)}

    /* bright veil: lifts top & bottom for type, keeps her clear through the middle */
    .wi-veil{position:absolute;inset:0;pointer-events:none;background:
      linear-gradient(180deg,
        rgba(255,246,238,.62) 0%,
        rgba(255,242,246,.24) 15%,
        rgba(255,240,246,0) 34%,
        rgba(255,240,246,0) 62%,
        rgba(255,244,237,.34) 82%,
        rgba(255,242,234,.66) 100%)}
    .wi-warm{position:absolute;inset:0;pointer-events:none;
      background:radial-gradient(125% 85% at 50% 45%, transparent 66%, rgba(201,160,106,.09))}
    /* softens the corner watermark baked into the source footage — reads as light */
    .wi-cornermask{position:absolute;left:-5%;bottom:-8%;width:40%;height:30%;pointer-events:none;
      background:radial-gradient(58% 66% at 32% 68%, rgba(255,247,240,.98), rgba(255,240,246,.72) 46%, rgba(255,240,246,0) 76%);
      filter:blur(7px)}

    /* petals + gold motes */
    .wi-petals,.wi-motes{position:absolute;inset:0;pointer-events:none;overflow:hidden}
    .wi-petal{position:absolute;top:112%;animation:wi-rise linear infinite}
    .wi-petal i{display:block;width:13px;height:17px;border-radius:50% 50% 52% 48%/62% 60% 40% 38%;
      background:linear-gradient(160deg,rgba(255,255,255,.96),rgba(251,207,232,.85) 60%,rgba(244,164,201,.7));
      box-shadow:0 1px 4px rgba(190,24,93,.12);animation:wi-sway ease-in-out infinite alternate}
    @keyframes wi-rise{to{transform:translateY(-125dvh)}}
    @keyframes wi-sway{from{transform:translateX(-11px) rotate(-16deg)}to{transform:translateX(11px) rotate(16deg)}}
    .wi-motes span{position:absolute;width:4px;height:4px;border-radius:50%;
      background:radial-gradient(circle,#F2DCBB,rgba(201,160,106,0));animation:wi-tw ease-in-out infinite}
    @keyframes wi-tw{0%,100%{opacity:.15;transform:scale(.7)}50%{opacity:.8;transform:scale(1.25)}}

    /* light bloom between scenes */
    .wi-flash{position:absolute;inset:0;z-index:4;pointer-events:none;background:
      radial-gradient(60% 50% at 50% 45%, #fff, rgba(255,255,255,0) 70%);
      opacity:0;animation:wi-flash .85s ease-out forwards}
    @keyframes wi-flash{0%{opacity:.62}100%{opacity:0}}

    /* ── chrome ── */
    .wi-top{position:relative;z-index:3;display:flex;align-items:center;justify-content:space-between;
      padding:max(16px,env(safe-area-inset-top)) 20px 0}
    .wi-dots{display:flex;gap:5px}
    .wi-dots i{width:16px;height:3px;border-radius:99px;background:rgba(190,24,93,.22);transition:.5s ease}
    .wi-dots i.on{width:26px;background:linear-gradient(90deg,var(--pink),var(--deep))}
    .wi-skip{font-size:11.5px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;
      color:var(--ink-2);text-decoration:none;opacity:.75}
    .wi-skip:hover{opacity:1;color:var(--deep)}

    .wi-content{position:relative;z-index:3;flex:1;min-height:0;display:flex;flex-direction:column;
      padding:16px 22px max(20px,env(safe-area-inset-bottom));overflow-y:auto;scrollbar-width:none;
      transform:translate(calc(var(--px,0) * 5px), calc(var(--py,0) * 5px));
      transition:transform .5s cubic-bezier(.2,.7,.2,1)}
    .wi-content::-webkit-scrollbar{display:none}
    .wi-grow{flex:1;min-height:8px}
    /* a breath of window-light behind the type, so it reads without washing the film */
    .wi-head,.wi-foot{position:relative}
    .wi-head::before,.wi-foot::before{content:"";position:absolute;z-index:-1;pointer-events:none;
      inset:-18px -10% -14px;filter:blur(12px);
      background:radial-gradient(62% 100% at 50% 50%, rgba(255,251,247,.94), rgba(255,247,242,.58) 52%, rgba(255,247,242,0) 78%)}

    /* ── motion vocabulary ── */
    .wi-rv{opacity:0;transform:translateY(14px);filter:blur(5px);
      animation:wi-rv 1.05s cubic-bezier(.16,.7,.2,1) forwards}
    @keyframes wi-rv{to{opacity:1;transform:none;filter:blur(0)}}

    /* ── type ── */
    .wi-h1{margin:0;font-family:var(--font-script,"Caveat",cursive);font-weight:700;
      font-size:clamp(38px,10.5vw,46px);line-height:.96;color:var(--deep);text-wrap:balance;
      text-shadow:0 2px 10px rgba(255,255,255,.95),0 0 30px rgba(255,255,255,.75)}
    .wi-h2{margin:0;text-align:center;font-weight:700;font-size:clamp(17px,4.6vw,19px);line-height:1.28;
      color:var(--ink);text-wrap:balance;text-shadow:0 2px 10px rgba(255,255,255,.95),0 0 26px rgba(255,255,255,.8)}
    .wi-h2-script{display:block;margin-top:2px;font-family:var(--font-script,"Caveat",cursive);
      font-weight:700;font-size:clamp(30px,8vw,35px);line-height:1;color:var(--hot)}
    .wi-sub{margin:8px 0 0;font-size:13.5px;font-weight:600;line-height:1.5;color:var(--ink-2);
      max-width:30ch;text-shadow:0 1px 8px rgba(255,255,255,.95),0 0 18px rgba(255,255,255,.85)}
    .wi-sub-c{margin-inline:auto;text-align:center;max-width:34ch;font-size:12.5px}
    .wi-rule{width:46px;height:1px;margin:12px 0 10px;
      background:linear-gradient(90deg,var(--gold),rgba(201,160,106,0))}
    .wi-rule-l{margin-bottom:8px}
    .wi-rule-c{margin:0 auto 10px;background:linear-gradient(90deg,rgba(201,160,106,0),var(--gold),rgba(201,160,106,0))}
    .wi-closing{margin:0;text-align:center;font-family:var(--font-script,"Caveat",cursive);
      font-size:23px;line-height:1.1;color:var(--deep);text-shadow:0 2px 12px rgba(255,255,255,.9)}
    .wi-final{margin:0;text-align:center;font-weight:700;font-size:14px;color:var(--ink);
      text-shadow:0 2px 12px rgba(255,255,255,.9)}
    .wi-final-script{margin:1px 0 0;text-align:center;font-family:var(--font-script,"Caveat",cursive);
      font-size:26px;line-height:1.08;color:var(--hot);text-shadow:0 2px 12px rgba(255,255,255,.9)}

    /* ── screen 1 ── */
    .wi-topbrand{padding-top:4px}
    .wi-topbrand-name{font-family:var(--font-script,"Caveat",cursive);font-size:31px;line-height:.9;
      color:var(--deep);text-shadow:0 2px 14px rgba(255,255,255,.9)}
    .wi-topbrand-tag{font-family:"Satisfy","Caveat",cursive;font-size:14px;color:var(--ink-2);
      margin-top:1px;text-shadow:0 1px 10px rgba(255,255,255,.9)}
    .wi-lower{padding-bottom:2px}

    /* ── cards around her ── */
    .wi-around{display:grid;grid-template-columns:1fr 17% 1fr;gap:9px 8px;margin-top:14px;align-content:start}
    .wi-around-tight{gap:8px}
    .wi-l{grid-column:1;justify-self:start}
    .wi-r{grid-column:3;justify-self:end}
    .wi-a-card{display:flex;align-items:center;gap:9px;padding:9px 11px;border-radius:16px;width:fit-content;max-width:100%;
      background:var(--glass);backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);
      border:1px solid var(--glass-line);box-shadow:var(--shadow);
      opacity:0;transform:translateY(12px) scale(.97);filter:blur(4px);
      animation:wi-card 1.1s cubic-bezier(.16,.7,.2,1) forwards}
    @keyframes wi-card{to{opacity:1;transform:none;filter:blur(0)}}
    .wi-a-ic{flex:0 0 auto;display:grid;place-items:center;width:26px;height:26px;border-radius:9px;
      color:var(--deep);background:linear-gradient(160deg,rgba(255,255,255,.9),rgba(252,231,243,.9));
      box-shadow:inset 0 0 0 1px rgba(201,160,106,.22)}
    .wi-a-ic svg{width:14px;height:14px;stroke-width:1.7}
    .wi-a-lb{font-size:11.5px;font-weight:700;line-height:1.22;color:var(--ink);letter-spacing:.005em}
    .wi-a-chip .wi-a-lb{font-size:11px}
    .wi-a-chip{padding:8px 10px}

    /* gentle float, so nothing sits dead still */
    @media (prefers-reduced-motion:no-preference){
      .wi-a-card .wi-a-ic{animation:wi-float 7s ease-in-out infinite}
      .wi-r .wi-a-ic{animation-delay:-3.5s}
    }
    @keyframes wi-float{0%,100%{transform:translateY(-1.5px)}50%{transform:translateY(1.5px)}}

    /* ── CTA: glossy, breathing ── */
    .wi-cta-wrap{margin-top:14px}
    .wi-cta{position:relative;overflow:hidden;display:flex;align-items:center;justify-content:center;gap:9px;
      width:100%;padding:15px 20px;border:none;cursor:pointer;border-radius:999px;text-decoration:none;
      font-family:inherit;font-weight:700;font-size:15px;letter-spacing:.01em;color:#fff;
      background:linear-gradient(180deg,#F576AE 0%,var(--pink) 45%,var(--deep) 100%);
      box-shadow:0 16px 32px -14px rgba(219,39,119,.75),inset 0 1px 0 rgba(255,255,255,.45);
      animation:wi-breathe 4s ease-in-out infinite;transition:transform .18s ease,box-shadow .18s ease}
    .wi-cta::after{content:"";position:absolute;top:0;left:-65%;width:42%;height:100%;pointer-events:none;
      background:linear-gradient(100deg,transparent,rgba(255,255,255,.42),transparent);
      transform:skewX(-18deg);animation:wi-shine 5.2s ease-in-out infinite}
    @keyframes wi-shine{0%,68%{left:-65%}100%{left:130%}}
    @keyframes wi-breathe{0%,100%{transform:scale(1);box-shadow:0 16px 32px -14px rgba(219,39,119,.7),inset 0 1px 0 rgba(255,255,255,.45)}
      50%{transform:scale(1.014);box-shadow:0 20px 40px -14px rgba(219,39,119,.85),inset 0 1px 0 rgba(255,255,255,.5)}}
    .wi-cta:active{transform:scale(.975);box-shadow:0 10px 22px -12px rgba(219,39,119,.7)}
    .wi-cta:focus-visible{outline:2px solid #fff;outline-offset:3px}

    /* ── brand reveal ── */
    .wi-brandscene{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px}
    .wi-bloom-mark{position:relative;width:78px;height:78px;margin-bottom:16px}
    .wi-bloom-mark span:nth-child(1){--r:0deg}
    .wi-bloom-mark span:nth-child(2){--r:60deg}
    .wi-bloom-mark span:nth-child(3){--r:120deg}
    .wi-bloom-mark span:nth-child(4){--r:180deg}
    .wi-bloom-mark span:nth-child(5){--r:240deg}
    .wi-bloom-mark span:nth-child(6){--r:300deg}
    .wi-bloom-mark span{position:absolute;left:50%;top:50%;width:21px;height:34px;margin:-32px 0 0 -10.5px;
      border-radius:50% 50% 50% 50%/62% 62% 38% 38%;transform-origin:50% 94%;
      background:linear-gradient(180deg,#FBA3CB,var(--pink));opacity:0;
      animation:wi-petal-open 1.15s cubic-bezier(.16,.7,.2,1) forwards}
    @keyframes wi-petal-open{
      from{opacity:0;transform:rotate(var(--r,0deg)) scale(.32)}
      to{opacity:.95;transform:rotate(var(--r,0deg)) scale(1)}}
    .wi-bloom-mark i{position:absolute;left:50%;top:50%;width:19px;height:19px;margin:-9.5px;border-radius:50%;
      background:radial-gradient(circle at 38% 34%,#fff,#F2DCBB 45%,var(--gold));
      box-shadow:0 0 22px rgba(201,160,106,.6);transform:scale(0);
      animation:wi-core .9s .35s cubic-bezier(.16,.7,.2,1) forwards}
    @keyframes wi-core{to{transform:scale(1)}}
    .wi-brandmark{font-family:var(--font-script,"Caveat",cursive);font-size:54px;line-height:.9;color:var(--deep);
      text-shadow:0 3px 22px rgba(255,255,255,.9)}
    .wi-brandtag{font-family:"Satisfy","Caveat",cursive;font-size:17px;color:var(--ink-2);text-align:center}
    .wi-brandscene .wi-rule{margin:10px auto 8px;
      background:linear-gradient(90deg,rgba(201,160,106,0),var(--gold),rgba(201,160,106,0))}

    /* ── landscape composition (big screens, uncropped 16:9) ── */
    @media (min-width:768px){
      .wi-content{padding:20px clamp(24px,4vw,56px) clamp(18px,3.2vh,30px)}
      .wi-h1{font-size:clamp(46px,4.6vw,64px)}
      .wi-h2{font-size:clamp(19px,1.7vw,23px)}
      .wi-h2-script{font-size:clamp(34px,3.2vw,44px)}
      .wi-sub{font-size:clamp(14px,1.15vw,16px);max-width:34ch}
      .wi-sub-c{font-size:clamp(13px,1.05vw,15px);max-width:46ch}
      /* she owns the middle; the benefits gather on either side of her */
      .wi-around{grid-template-columns:1fr minmax(26%,38%) 1fr;gap:10px clamp(14px,2.6vw,40px);
        margin-top:clamp(10px,2vh,22px)}
      .wi-a-card{padding:11px 14px;border-radius:18px}
      .wi-a-lb,.wi-a-chip .wi-a-lb{font-size:clamp(12px,1vw,13.5px)}
      .wi-a-card{max-width:290px}
      .wi-a-ic{width:30px;height:30px}
      .wi-a-ic svg{width:16px;height:16px}
      .wi-closing{font-size:clamp(24px,2.2vw,30px)}
      .wi-final{font-size:clamp(14px,1.15vw,16px)}
      .wi-final-script{font-size:clamp(26px,2.3vw,32px)}
      .wi-cta-wrap{max-width:380px;margin-inline:auto}
      /* screen 1 reads as an editorial cover: type anchored bottom-left */
      .wi-lower{max-width:min(48%,540px)}
      .wi-lower .wi-cta-wrap{margin-inline:0;max-width:330px}
      .wi-topbrand-name{font-size:38px}
      .wi-topbrand-tag{font-size:16px}
      .wi-brandmark{font-size:clamp(64px,6vw,86px)}
      .wi-brandtag{font-size:20px}
      .wi-bloom-mark{width:96px;height:96px}
    }

    /* short screens */
    @media (max-height:730px){
      .wi-content{padding-top:10px}
      .wi-h1{font-size:34px}
      .wi-h2{font-size:16px}
      .wi-h2-script{font-size:27px}
      .wi-sub{font-size:12.5px;margin-top:6px}
      .wi-around{margin-top:10px;gap:7px}
      .wi-a-card{padding:7px 9px;border-radius:14px}
      .wi-closing{font-size:20px}
      .wi-final-script{font-size:23px}
      .wi-cta{padding:13px 18px;font-size:14.5px}
      .wi-cta-wrap{margin-top:10px}
    }

    @media (prefers-reduced-motion:reduce){
      .wi-video,.wi-ambient,.wi-petal,.wi-petal i,.wi-motes span,.wi-cta,.wi-cta::after{animation:none!important}
      .wi-rv,.wi-a-card{animation-duration:.01s}
      .wi-flash{display:none}
    }
    `}</style>
  );
}
