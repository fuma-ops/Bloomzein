import { useCallback, useEffect, useState } from "react";

/**
 * WelcomeScreens — the three-screen Bloomzein entry.
 *
 *   1 · Welcome     "Welcome to your Bloom."
 *   2 · Connected   "Everything in your life, beautifully connected."
 *   3 · Your space  "Your pace. Your rhythm. Your Bloom."
 *
 * This file owns ONLY the foreground composition — logo lockup, headlines,
 * benefit cards, progress dots and CTA pills. The background is a placeholder
 * (drifting bubbles) marked with a VIDEO SLOT comment; the films drop in
 * without touching any of the composition.
 *
 * Full spec: docs/welcome-screen-design.md
 * Route: /welcome (preview only — nothing links to it yet).
 */

const NEXT_PAGE = "/app/today";

/* ── hairline glyphs, drawn to match the mockup badges ───────────────────── */
const ico = {
  lotus: (
    <>
      <path d="M12 20.5c-2.2-2.1-3.4-4.6-3.4-7 0-2.5 1.3-4.9 3.4-6.9 2.1 2 3.4 4.4 3.4 6.9 0 2.4-1.2 4.9-3.4 7Z" />
      <path d="M12 20.5c-3.9 0-7-2.3-7-5.2 1.6-.5 3.1-.4 4.4.2" />
      <path d="M12 20.5c3.9 0 7-2.3 7-5.2-1.6-.5-3.1-.4-4.4.2" />
    </>
  ),
  meditate: (
    <>
      <circle cx="12" cy="5.4" r="2.1" />
      <path d="M12 8.4c-1.7 0-2.9 1.4-3.2 3l-.5 2.8M12 8.4c1.7 0 2.9 1.4 3.2 3l.5 2.8" />
      <path d="M8.3 12.6H6.1M15.7 12.6h2.2" />
      <path d="M6.6 18.3c1.5-1.2 3.4-1.8 5.4-1.8s3.9.6 5.4 1.8c-1.3 1.3-3.2 2-5.4 2s-4.1-.7-5.4-2Z" />
    </>
  ),
  bowl: (
    <>
      <path d="M4.2 12.2h15.6c0 4.1-3.5 7-7.8 7s-7.8-2.9-7.8-7Z" />
      <path d="M9 9.8c0-1.2.9-2.2 2-2.2M13.4 9.9c.2-1 1-1.8 2-1.9" />
      <circle cx="12" cy="6.1" r="1" />
    </>
  ),
  check: (
    <>
      <circle cx="12" cy="12" r="8.2" />
      <path d="M8.2 12.3l2.7 2.7 5-5.6" />
    </>
  ),
  brain: (
    <>
      <path d="M11.3 5.2a2.7 2.7 0 0 0-4.6 1.6 2.4 2.4 0 0 0-1 4.1 2.8 2.8 0 0 0 2.2 4.4 2.5 2.5 0 0 0 3.4.9Z" />
      <path d="M12.7 5.2a2.7 2.7 0 0 1 4.6 1.6 2.4 2.4 0 0 1 1 4.1 2.8 2.8 0 0 1-2.2 4.4 2.5 2.5 0 0 1-3.4.9Z" />
      <path d="M9.5 8.2c.8.2 1.4.9 1.5 1.8M14.5 8.2c-.8.2-1.4.9-1.5 1.8" />
    </>
  ),
  wallet: (
    <>
      <path d="M4.5 8.4A2 2 0 0 1 6.5 6.4h10.2a1 1 0 0 1 1 1v1" />
      <path d="M4.5 8.4v8.2a2 2 0 0 0 2 2h10.2a1 1 0 0 0 1-1v-1.3" />
      <path d="M19.5 11.1h-3.4a2.2 2.2 0 0 0 0 4.4h3.4a1 1 0 0 0 1-1v-2.4a1 1 0 0 0-1-1Z" />
    </>
  ),
  calheart: (
    <>
      <path d="M4.8 7.4h14.4v11.4H4.8z" />
      <path d="M4.8 11h14.4M9 5v3.4M15 5v3.4" />
      <path d="M12 16.8s-2.1-1.3-2.1-2.7a1.2 1.2 0 0 1 2.1-.8 1.2 1.2 0 0 1 2.1.8c0 1.4-2.1 2.7-2.1 2.7Z" />
    </>
  ),
  droplet: <path d="M12 3.6c3.4 4.7 5.8 7.1 5.8 10a5.8 5.8 0 0 1-11.6 0c0-2.9 2.4-5.3 5.8-10Z" />,
  smile: (
    <>
      <circle cx="12" cy="12" r="8.2" />
      <path d="M8.9 14.2c.8.9 1.9 1.4 3.1 1.4s2.3-.5 3.1-1.4" />
      <path d="M9.4 9.9h.01M14.6 9.9h.01" />
    </>
  ),
  journal: (
    <>
      <path d="M6.2 4.6h11.6v14.8H6.2z" />
      <path d="M9.1 4.6v14.8" />
      <path d="M11.6 9.2h3.6M11.6 12.3h3.6" />
    </>
  ),
  bell: (
    <>
      <path d="M6.6 10.6a5.4 5.4 0 0 1 10.8 0c0 4.3 1.7 5.3 1.7 5.3H4.9s1.7-1 1.7-5.3Z" />
      <path d="M10.2 18.6a1.9 1.9 0 0 0 3.6 0" />
    </>
  ),
};

type Item = { icon: keyof typeof ico; a: string; b: string };

const CONNECTED_L: Item[] = [
  { icon: "lotus", a: "Understand", b: "your rhythm" },
  { icon: "meditate", a: "Move", b: "your body" },
  { icon: "bowl", a: "Nourish", b: "yourself" },
  { icon: "check", a: "Build better", b: "habits" },
];
const CONNECTED_R: Item[] = [
  { icon: "brain", a: "Clear", b: "your mind" },
  { icon: "wallet", a: "Feel more", b: "in control" },
  { icon: "calheart", a: "Remember", b: "what matters" },
  { icon: "droplet", a: "Take care", b: "of yourself" },
];

const DAY_L: Item[] = [
  { icon: "meditate", a: "Morning", b: "Yoga" },
  { icon: "bowl", a: "Nourishing", b: "Meal" },
  { icon: "smile", a: "Mood", b: "today" },
  { icon: "droplet", a: "Water", b: "6 / 8 cups" },
];
const DAY_R: Item[] = [
  { icon: "check", a: "Habits", b: "kept" },
  { icon: "journal", a: "Journal", b: "a thought" },
  { icon: "bell", a: "Reminders", b: "that matter" },
  { icon: "calheart", a: "Planning", b: "your week" },
];

function Card({ item, delay }: { item: Item; delay: number }) {
  return (
    <div className="wz-card" style={{ animationDelay: `${delay}s` }}>
      <span className="wz-badge">
        <svg viewBox="0 0 24 24" aria-hidden>
          {ico[item.icon]}
        </svg>
      </span>
      <span className="wz-label">
        {item.a}
        <br />
        {item.b}
        <i className="wz-underline" />
      </span>
    </div>
  );
}

/** Thin rule with a flower at its centre — the mockup's divider. */
function Divider({ delay = 0 }: { delay?: number }) {
  return (
    <div className="wz-div wz-rv" style={{ animationDelay: `${delay}s` }}>
      <i />
      <svg viewBox="0 0 24 24" aria-hidden>
        {[0, 72, 144, 216, 288].map((r) => (
          <ellipse key={r} cx="12" cy="7.6" rx="2.5" ry="4.3" transform={`rotate(${r} 12 12)`} />
        ))}
        <circle className="wz-flower-core" cx="12" cy="12" r="1.9" />
      </svg>
      <i />
    </div>
  );
}

function Cta({
  label,
  onClick,
  href,
  delay,
}: {
  label: string;
  onClick?: () => void;
  href?: string;
  delay: number;
}) {
  const body = (
    <>
      {label}
      <svg viewBox="0 0 24 24" aria-hidden>
        <path d="M4 12h13.5M12.5 6.5 18.5 12l-6 5.5" />
      </svg>
    </>
  );
  return (
    <div className="wz-cta-wrap wz-rv" style={{ animationDelay: `${delay}s` }}>
      {href ? (
        <a className="wz-cta" href={href} onClick={onClick}>
          {body}
        </a>
      ) : (
        <button className="wz-cta" onClick={onClick}>
          {body}
        </button>
      )}
    </div>
  );
}

function Dots({ step, align }: { step: number; align: "right" | "center" }) {
  return (
    <div className={`wz-dots wz-dots-${align}`} aria-hidden>
      {[0, 1, 2].map((i) => (
        <span key={i} className={i === step ? "on" : ""}>
          {i < 2 && <i />}
        </span>
      ))}
    </div>
  );
}

/** Replace this whole component with the <video> when the film is ready. */
function BackgroundPlaceholder() {
  return (
    <div className="wz-bg" aria-hidden>
      {/* ── VIDEO SLOT ──────────────────────────────────────────────────
          Swap the bubbles below for:
            <video className="wz-video" autoPlay muted loop playsInline
                   poster="/videos/welcome-1.webp">
              <source src="/videos/welcome-1.mp4" type="video/mp4" />
            </video>
          Keep .wz-scrim — it is what keeps the type readable over footage.
          Screen 1 keeps its LEFT half clear for type; screens 2 and 3 keep
          the middle column clear. That is where she stands.                */}
      <div className="wz-bubbles">
        {Array.from({ length: 16 }).map((_, i) => (
          <span
            key={i}
            style={{
              left: `${(i * 6.4 + 2) % 100}%`,
              width: `${14 + (i % 5) * 13}px`,
              height: `${14 + (i % 5) * 13}px`,
              animationDuration: `${18 + (i % 6) * 4}s`,
              animationDelay: `${(i % 8) * -3.4}s`,
              opacity: 0.18 + (i % 4) * 0.1,
            }}
          />
        ))}
      </div>
      <div className="wz-scrim" />
    </div>
  );
}

/* ══════════════════ 1 · WELCOME ══════════════════ */
function ScreenWelcome({ onNext }: { onNext: () => void }) {
  return (
    <div className="wz-s1">
      <div className="wz-lock wz-rv" style={{ animationDelay: "0.1s" }}>
        <svg className="wz-mark" viewBox="0 0 24 24" aria-hidden>
          {[0, 72, 144, 216, 288].map((r) => (
            <ellipse key={r} cx="12" cy="7.2" rx="2.9" ry="4.8" transform={`rotate(${r} 12 12)`} />
          ))}
          <circle className="wz-flower-core" cx="12" cy="12" r="2.1" />
        </svg>
        <span className="wz-wordmark">Bloomzein</span>
        <span className="wz-tag">stay soft, bloom on. ✿</span>
      </div>

      <h1 className="wz-h1">
        <span className="wz-h1-serif wz-rv" style={{ animationDelay: "0.45s" }}>
          Welcome to
        </span>
        <span className="wz-h1-script wz-rv" style={{ animationDelay: "0.7s" }}>
          your Bloom.<em className="wz-heart">♡</em>
        </span>
      </h1>

      <Divider delay={1} />

      <p className="wz-s1-sub wz-rv" style={{ animationDelay: "1.15s" }}>
        A little space for the woman
        <br />
        you&rsquo;re becoming.
      </p>

      <Cta label="Begin my journey" onClick={onNext} delay={1.45} />
    </div>
  );
}

/* ══════════════════ 2 · CONNECTED ══════════════════ */
function ScreenConnected({ onNext }: { onNext: () => void }) {
  return (
    <>
      <header className="wz-head">
        <h2 className="wz-h2">
          <span className="wz-h2-serif wz-rv" style={{ animationDelay: "0.1s" }}>
            Everything in your life,
          </span>
          <span className="wz-h2-script wz-rv" style={{ animationDelay: "0.3s" }}>
            beautifully connected.<em className="wz-heart">♡</em>
          </span>
        </h2>
        <p className="wz-sub wz-rv" style={{ animationDelay: "0.5s" }}>
          Your mood. Your movement. Your meals.
          <br />
          Your plans. Your little everyday moments.
        </p>
        <Divider delay={0.65} />
      </header>

      <div className="wz-cols">
        <div className="wz-col wz-col-l">
          {CONNECTED_L.map((c, i) => (
            <Card key={c.a + c.b} item={c} delay={0.9 + i * 0.15} />
          ))}
        </div>
        <div className="wz-center" aria-hidden />
        <div className="wz-col wz-col-r">
          {CONNECTED_R.map((c, i) => (
            <Card key={c.a + c.b} item={c} delay={0.97 + i * 0.15} />
          ))}
        </div>
      </div>

      <footer className="wz-foot">
        <p className="wz-closing wz-rv" style={{ animationDelay: "1.6s" }}>
          One beautiful space. Everything that matters to you. <em className="wz-heart">♡</em>
        </p>
        <Cta label="Show me my Bloom" onClick={onNext} delay={1.8} />
      </footer>
    </>
  );
}

/* ══════════════════ 3 · YOUR SPACE ══════════════════ */
function ScreenYourSpace() {
  return (
    <>
      <header className="wz-head">
        <h2 className="wz-h2">
          <span className="wz-h2-serif wz-rv" style={{ animationDelay: "0.1s" }}>
            Your life doesn&rsquo;t need to be perfect.
          </span>
          <span className="wz-h2-script wz-rv" style={{ animationDelay: "0.3s" }}>
            It just needs to feel like yours.<em className="wz-heart">♡</em>
          </span>
        </h2>
        <p className="wz-sub wz-rv" style={{ animationDelay: "0.5s" }}>
          Move with intention, make time for yourself,
          <br />
          and enjoy the little things again.
        </p>
        <Divider delay={0.65} />
      </header>

      <div className="wz-cols">
        <div className="wz-col wz-col-l">
          {DAY_L.map((c, i) => (
            <Card key={c.a + c.b} item={c} delay={0.9 + i * 0.15} />
          ))}
        </div>
        <div className="wz-center" aria-hidden />
        <div className="wz-col wz-col-r">
          {DAY_R.map((c, i) => (
            <Card key={c.a + c.b} item={c} delay={0.97 + i * 0.15} />
          ))}
        </div>
      </div>

      <footer className="wz-foot">
        <p className="wz-closing wz-rv" style={{ animationDelay: "1.6s" }}>
          This is your space.{" "}
          <span className="wz-closing-script">Your pace. Your rhythm. Your Bloom.</span>
        </p>
        <Cta label="Start my Bloomzein journey" href={NEXT_PAGE} delay={1.8} />
      </footer>
    </>
  );
}

export default function WelcomeScreens() {
  const [step, setStep] = useState(0);
  const next = useCallback(() => setStep((s) => Math.min(2, s + 1)), []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") setStep((s) => Math.min(2, s + 1));
      if (e.key === "ArrowLeft") setStep((s) => Math.max(0, s - 1));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="wz-root">
      <Styles />
      <div className="wz-stage">
        <BackgroundPlaceholder />
        <Dots step={step} align={step === 0 ? "right" : "center"} />
        <div className="wz-content" key={step}>
          {step === 0 && <ScreenWelcome onNext={next} />}
          {step === 1 && <ScreenConnected onNext={next} />}
          {step === 2 && <ScreenYourSpace />}
        </div>
      </div>
    </div>
  );
}

function Styles() {
  return (
    <style>{`
    .wz-root{
      --pink:#EC4899; --deep:#DB2777; --hot:#E6007E;
      --plum:#6B1238; --ink:#7A1440; --muted:#A2657F;
      --petal:#F9A8D4; --gold:#D8B98A;
      --card:rgba(255,255,255,.82); --card-line:rgba(255,255,255,.95);
      --serif:"Playfair Display",Georgia,serif;
      --script:"Dancing Script","Caveat",cursive;
      --sans:"Quicksand",system-ui,sans-serif;
      position:fixed;inset:0;z-index:60;overflow:hidden;display:grid;place-items:center;
      font-family:var(--sans);
      background:radial-gradient(85% 65% at 50% 0%,#FFF6EE 0%,#FDE9F1 46%,#F8D3E4 100%)}

    /* Stage keeps the film's 16:9 shape on big screens so nothing is ever cropped */
    .wz-stage{position:relative;overflow:hidden;width:100%;height:100dvh;isolation:isolate}
    @media (min-width:768px){
      .wz-stage{width:min(100vw,calc(100dvh * 16 / 9));height:auto;aspect-ratio:16/9;max-height:100dvh}
    }
    @media (min-width:1200px){
      .wz-stage{width:min(95vw,calc(93dvh * 16 / 9));border-radius:26px;
        box-shadow:0 46px 110px -46px rgba(150,30,80,.5)}
    }

    /* ── background placeholder (swap for <video>) ── */
    .wz-bg{position:absolute;inset:0;overflow:hidden;
      background:radial-gradient(60% 48% at 50% 26%,#FFFDFC 0%,#FFF1F7 44%,#FBDCEA 76%,#F6C9DF 100%)}
    .wz-video{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
    .wz-scrim{position:absolute;inset:0;pointer-events:none;background:
      linear-gradient(180deg,rgba(255,247,241,.55) 0%,rgba(255,242,247,.16) 20%,
        rgba(255,240,246,0) 42%,rgba(255,240,246,0) 64%,rgba(255,244,237,.34) 88%,rgba(255,242,234,.6) 100%)}
    .wz-bubbles span{position:absolute;top:110%;border-radius:50%;
      background:radial-gradient(circle at 34% 30%,rgba(255,255,255,.95),rgba(249,168,212,.55) 62%,rgba(236,72,153,.16));
      box-shadow:0 2px 10px rgba(190,24,93,.10);animation:wz-rise linear infinite}
    @keyframes wz-rise{
      0%{transform:translate3d(0,0,0) scale(.9)}
      50%{transform:translate3d(18px,-58dvh,0) scale(1.04)}
      100%{transform:translate3d(-10px,-118dvh,0) scale(.94)}}

    /* ── progress dots ── */
    .wz-dots{position:absolute;z-index:3;display:flex;align-items:center;
      top:clamp(14px,3.4vh,34px)}
    .wz-dots-right{right:clamp(16px,3vw,46px)}
    .wz-dots-center{left:50%;transform:translateX(-50%)}
    .wz-dots span{position:relative;width:clamp(8px,.72vw,12px);height:clamp(8px,.72vw,12px);
      border-radius:50%;background:rgba(255,255,255,.9);
      box-shadow:0 1px 4px rgba(190,24,93,.22),inset 0 0 0 1px rgba(236,72,153,.16)}
    .wz-dots span.on{background:linear-gradient(160deg,#F871B0,var(--deep));
      box-shadow:0 2px 8px rgba(219,39,119,.55)}
    .wz-dots span i{position:absolute;left:100%;top:50%;width:clamp(16px,1.5vw,26px);height:1.5px;
      transform:translateY(-50%);background:rgba(236,72,153,.3)}

    /* ── shared motion ── */
    .wz-rv{opacity:0;transform:translateY(12px);filter:blur(4px);
      animation:wz-in .95s cubic-bezier(.16,.7,.2,1) forwards}
    @keyframes wz-in{to{opacity:1;transform:none;filter:blur(0)}}

    .wz-content{position:relative;z-index:2;height:100%;display:flex;flex-direction:column;
      padding:clamp(16px,3.2vh,34px) clamp(14px,3vw,44px) clamp(14px,2.8vh,30px)}

    .wz-heart{font-style:normal;color:var(--pink);font-size:.62em;vertical-align:.24em;margin-left:.12em}

    /* ── flower divider ── */
    .wz-div{display:flex;align-items:center;justify-content:center;gap:clamp(6px,.7vw,11px);
      margin:clamp(8px,1.5vh,17px) 0}
    .wz-div i{display:block;width:clamp(28px,3.4vw,58px);height:1px;background:var(--petal);opacity:.85}
    .wz-div svg{width:clamp(11px,1vw,15px);height:auto;fill:var(--pink)}
    .wz-flower-core{fill:#FFF0F6}

    /* ── CTA ── */
    .wz-cta-wrap{display:flex}
    .wz-cta{position:relative;overflow:hidden;display:inline-flex;align-items:center;justify-content:center;
      gap:clamp(10px,1.2vw,20px);text-decoration:none;cursor:pointer;font-family:inherit;
      padding:clamp(12px,1.55vh,20px) clamp(24px,2.6vw,44px);border-radius:999px;
      font-weight:700;font-size:clamp(13px,1.15vw,18px);color:#fff;letter-spacing:.01em;
      background:linear-gradient(180deg,#F76BAE 0%,var(--pink) 48%,var(--deep) 100%);
      border:1.5px solid rgba(255,255,255,.85);
      box-shadow:0 0 0 1.5px rgba(216,185,138,.55),0 16px 30px -14px rgba(219,39,119,.8),
        inset 0 1px 0 rgba(255,255,255,.5);
      animation:wz-breathe 4s ease-in-out infinite;transition:transform .18s ease}
    .wz-cta svg{width:clamp(17px,1.35vw,22px);height:auto;fill:none;stroke:#fff;stroke-width:1.9;
      stroke-linecap:round;stroke-linejoin:round}
    .wz-cta::after{content:"";position:absolute;top:0;left:-65%;width:40%;height:100%;pointer-events:none;
      background:linear-gradient(100deg,transparent,rgba(255,255,255,.4),transparent);
      transform:skewX(-18deg);animation:wz-shine 5.4s ease-in-out infinite}
    @keyframes wz-shine{0%,70%{left:-65%}100%{left:130%}}
    @keyframes wz-breathe{0%,100%{transform:scale(1)}50%{transform:scale(1.015)}}
    .wz-cta:active{transform:scale(.975)}
    .wz-cta:focus-visible{outline:2px solid #fff;outline-offset:3px}

    /* ══ SCREEN 1 — type owns the left, she owns the right ══ */
    .wz-s1{flex:1;min-height:0;display:flex;flex-direction:column;justify-content:center;
      align-items:center;text-align:center;width:min(48%,620px)}
    .wz-lock{display:flex;flex-direction:column;align-items:center;margin-bottom:clamp(10px,2.4vh,26px)}
    .wz-mark{width:clamp(22px,2vw,34px);height:auto;fill:var(--hot);margin-bottom:2px}
    .wz-wordmark{font-family:var(--script);font-weight:700;color:var(--hot);
      font-size:clamp(28px,3.1vw,46px);line-height:.95}
    .wz-tag{font-family:var(--sans);font-weight:600;color:var(--muted);
      font-size:clamp(10px,.85vw,14px);margin-top:1px}
    .wz-h1{margin:0;display:flex;flex-direction:column;align-items:center}
    .wz-h1-serif{font-family:var(--serif);font-weight:700;color:var(--plum);
      font-size:clamp(26px,3.3vw,50px);line-height:1.08}
    .wz-h1-script{font-family:var(--script);font-weight:700;color:var(--hot);
      font-size:clamp(44px,6vw,92px);line-height:.94;margin-top:-.06em}
    .wz-s1-sub{margin:0 0 clamp(14px,3vh,32px);color:var(--plum);font-weight:600;
      font-size:clamp(12px,1.15vw,18px);line-height:1.5}

    /* ══ SCREENS 2 & 3 — cards | her | cards ══ */
    /* clears the centred progress dots */
    .wz-head{text-align:center;flex:0 0 auto;padding-top:clamp(18px,2.8vh,30px)}
    .wz-h2{margin:0;display:flex;flex-direction:column;align-items:center;gap:1px}
    .wz-h2-serif{font-family:var(--serif);font-weight:700;color:var(--plum);
      font-size:clamp(17px,2.2vw,32px);line-height:1.14}
    .wz-h2-script{font-family:var(--script);font-weight:700;color:var(--hot);
      font-size:clamp(26px,3.3vw,48px);line-height:1.04}
    .wz-sub{margin:clamp(4px,.8vh,10px) auto 0;color:var(--muted);font-weight:600;
      font-size:clamp(11px,1.02vw,15px);line-height:1.5}
    .wz-head .wz-div{margin-bottom:0}

    .wz-cols{flex:1;min-height:0;display:grid;align-content:start;
      padding-top:clamp(6px,2vh,26px);
      grid-template-columns:minmax(0,1fr) 24% minmax(0,1fr);
      gap:0 clamp(8px,1.6vw,26px)}
    .wz-col{display:flex;flex-direction:column;justify-content:center;gap:clamp(9px,2.7vh,30px)}
    .wz-col-l{align-items:flex-end}
    .wz-col-r{align-items:flex-start}
    /* arranged, not stacked */
    .wz-col-l .wz-card:nth-child(1){margin-right:clamp(10px,1.9vw,32px)}
    .wz-col-l .wz-card:nth-child(3){margin-right:clamp(12px,2.2vw,38px)}
    .wz-col-r .wz-card:nth-child(2){margin-left:clamp(10px,1.9vw,32px)}
    .wz-col-r .wz-card:nth-child(4){margin-left:clamp(8px,1.5vw,26px)}

    .wz-card{display:flex;align-items:center;gap:clamp(7px,.75vw,12px);
      padding:clamp(6px,.75vh,11px) clamp(12px,1.3vw,22px) clamp(6px,.75vh,11px) clamp(6px,.6vw,10px);
      border-radius:clamp(13px,1.15vw,19px);background:var(--card);
      backdrop-filter:blur(13px);-webkit-backdrop-filter:blur(13px);
      border:1px solid var(--card-line);
      box-shadow:0 10px 26px -12px rgba(190,24,93,.42),inset 0 1px 0 rgba(255,255,255,.7);
      opacity:0;transform:translateY(10px) scale(.985);
      animation:wz-in .9s cubic-bezier(.16,.7,.2,1) forwards}
    .wz-badge{flex:0 0 auto;display:grid;place-items:center;
      width:clamp(30px,2.9vw,48px);height:clamp(30px,2.9vw,48px);border-radius:50%;
      background:linear-gradient(160deg,#F871B0 0%,var(--pink) 46%,var(--deep) 100%);
      box-shadow:0 6px 14px -5px rgba(219,39,119,.72),inset 0 1px 0 rgba(255,255,255,.55)}
    .wz-badge svg{width:56%;height:56%;fill:none;stroke:#fff;stroke-width:1.7;
      stroke-linecap:round;stroke-linejoin:round}
    .wz-label{font-weight:700;color:var(--ink);line-height:1.26;
      font-size:clamp(10.5px,1.03vw,15.5px)}
    .wz-underline{display:block;width:clamp(14px,1.4vw,22px);height:2px;border-radius:2px;
      background:var(--petal);margin-top:clamp(3px,.45vh,6px);opacity:.95}

    .wz-foot{flex:0 0 auto;display:flex;flex-direction:column;align-items:center;
      gap:clamp(8px,1.5vh,16px)}
    .wz-closing{margin:0;text-align:center;font-family:var(--serif);font-weight:500;
      color:var(--ink);font-size:clamp(11px,1.05vw,16px)}
    .wz-closing-script{font-family:var(--script);font-weight:700;color:var(--hot);
      font-size:clamp(17px,1.6vw,26px);margin-left:.2em}

    /* ── mobile ── */
    @media (max-width:767px){
      .wz-s1{width:100%}
      .wz-cols{grid-template-columns:minmax(0,1fr) 13% minmax(0,1fr);gap:0 6px}
      .wz-card{gap:7px;padding:6px 9px 6px 6px}
      .wz-col-l .wz-card,.wz-col-r .wz-card{margin:0}
      .wz-label{font-size:10.5px}
      .wz-badge{width:29px;height:29px}
      .wz-cta{width:100%;justify-content:center}
      .wz-cta-wrap{width:100%}
      .wz-closing-script{display:block;margin:2px 0 0}
    }
    @media (max-height:520px){
      .wz-sub{display:none}
      .wz-col{gap:6px}
    }

    @media (prefers-reduced-motion:reduce){
      .wz-bubbles span,.wz-cta,.wz-cta::after{animation:none}
      .wz-rv,.wz-card{animation-duration:.01s}
    }
    `}</style>
  );
}
