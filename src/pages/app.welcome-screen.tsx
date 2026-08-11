/**
 * WelcomeScreen — the "Everything in your life, beautifully connected" screen.
 *
 * This file owns ONLY the foreground composition: the headline lockup, the
 * eight benefit cards that sit either side of centre, and the closing line.
 * It is a faithful build of the approved mockup — see
 * docs/welcome-screen-design.md for the full spec (type scale, card anatomy,
 * colours, offsets) so it can be picked up in any later session.
 *
 * The background is a placeholder: soft drifting bubbles, isolated in
 * <BackgroundPlaceholder/> and marked with a VIDEO SLOT comment so the film
 * can be dropped in later without touching the composition.
 *
 * Route: /welcome (preview only — nothing links to it yet).
 */

/* ── icons: white hairline glyphs, drawn to match the mockup badges ───────── */
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
};

type Card = { icon: keyof typeof ico; a: string; b: string };

const LEFT: Card[] = [
  { icon: "lotus", a: "Understand", b: "your rhythm" },
  { icon: "meditate", a: "Move", b: "your body" },
  { icon: "bowl", a: "Nourish", b: "yourself" },
  { icon: "check", a: "Build better", b: "habits" },
];

const RIGHT: Card[] = [
  { icon: "brain", a: "Clear", b: "your mind" },
  { icon: "wallet", a: "Feel more", b: "in control" },
  { icon: "calheart", a: "Remember", b: "what matters" },
  { icon: "droplet", a: "Take care", b: "of yourself" },
];

function BenefitCard({ card, delay }: { card: Card; delay: number }) {
  return (
    <div className="wz-card" style={{ animationDelay: `${delay}s` }}>
      <span className="wz-badge">
        <svg viewBox="0 0 24 24" aria-hidden>
          {ico[card.icon]}
        </svg>
      </span>
      <span className="wz-label">
        {card.a}
        <br />
        {card.b}
        <i className="wz-underline" />
      </span>
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
                   poster="/videos/welcome.webp">
              <source src="/videos/welcome.mp4" type="video/mp4" />
            </video>
          Keep .wz-scrim — it is what keeps the type readable over footage.
          The middle grid column stays clear: that is where she sits.        */}
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

export default function WelcomeScreen() {
  return (
    <div className="wz-root">
      <Styles />
      <div className="wz-stage">
        <BackgroundPlaceholder />

        <div className="wz-content">
          <header className="wz-head">
            <h1 className="wz-h">
              <span className="wz-h-serif">Everything in your life,</span>
              <span className="wz-h-script">
                beautifully connected. <em className="wz-heart">♡</em>
              </span>
            </h1>
            <p className="wz-sub">
              Your mood. Your movement. Your meals.
              <br />
              Your plans. Your little everyday moments.
            </p>
            <svg className="wz-flower" viewBox="0 0 24 24" aria-hidden>
              {[0, 72, 144, 216, 288].map((r) => (
                <ellipse
                  key={r}
                  cx="12"
                  cy="7.6"
                  rx="2.5"
                  ry="4.3"
                  transform={`rotate(${r} 12 12)`}
                />
              ))}
              <circle className="wz-flower-core" cx="12" cy="12" r="1.9" />
            </svg>
          </header>

          <div className="wz-cols">
            <div className="wz-col wz-col-l">
              {LEFT.map((c, i) => (
                <BenefitCard key={c.a + c.b} card={c} delay={0.35 + i * 0.14} />
              ))}
            </div>
            <div className="wz-center" aria-hidden />
            <div className="wz-col wz-col-r">
              {RIGHT.map((c, i) => (
                <BenefitCard key={c.a + c.b} card={c} delay={0.42 + i * 0.14} />
              ))}
            </div>
          </div>

          <p className="wz-foot">
            One beautiful space. Everything that matters to you. <em className="wz-heart">♡</em>
          </p>
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
      --petal:#F9A8D4;
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

    /* ── composition ── */
    .wz-content{position:relative;z-index:2;height:100%;display:flex;flex-direction:column;
      padding:clamp(16px,3.2vh,34px) clamp(14px,3vw,44px) clamp(14px,2.8vh,30px)}

    .wz-head{text-align:center;flex:0 0 auto}
    .wz-h{margin:0;display:flex;flex-direction:column;align-items:center;gap:2px}
    .wz-h-serif{font-family:var(--serif);font-weight:700;color:var(--plum);
      font-size:clamp(19px,2.35vw,34px);line-height:1.14}
    .wz-h-script{font-family:var(--script);font-weight:700;color:var(--hot);
      font-size:clamp(28px,3.5vw,50px);line-height:1.06;margin-top:-2px}
    .wz-heart{font-style:normal;color:var(--pink);font-size:.72em;vertical-align:.12em}
    .wz-sub{margin:clamp(6px,1.1vh,12px) auto 0;color:var(--muted);font-weight:600;
      font-size:clamp(11px,1.02vw,15px);line-height:1.55}
    .wz-flower{display:block;width:clamp(13px,1.15vw,17px);height:auto;margin:clamp(5px,.9vh,10px) auto 0;
      fill:var(--petal);opacity:.95}
    .wz-flower .wz-flower-core{fill:#FFF0F6}

    /* three tracks: cards | her | cards */
    .wz-cols{flex:1;min-height:0;display:grid;align-content:start;
      padding-top:clamp(6px,2.4vh,30px);
      grid-template-columns:minmax(0,1fr) 24% minmax(0,1fr);
      gap:0 clamp(8px,1.6vw,26px);margin-top:clamp(4px,1vh,12px)}
    .wz-col{display:flex;flex-direction:column;justify-content:center;gap:clamp(9px,2.7vh,30px)}
    .wz-col-l{align-items:flex-end}
    .wz-col-r{align-items:flex-start}
    /* the gentle stagger of the mockup — cards are arranged, not stacked */
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
    @keyframes wz-in{to{opacity:1;transform:none}}

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

    .wz-foot{flex:0 0 auto;margin:0;text-align:center;font-family:var(--serif);font-weight:500;
      color:var(--ink);font-size:clamp(11px,1.05vw,16px);
      opacity:0;animation:wz-in .9s 1.05s cubic-bezier(.16,.7,.2,1) forwards}

    /* ── mobile: she still needs a clear middle, so the channel narrows ── */
    @media (max-width:767px){
      .wz-cols{grid-template-columns:minmax(0,1fr) 13% minmax(0,1fr);gap:0 6px}
      .wz-card{gap:7px;padding:6px 9px 6px 6px}
      .wz-col-l .wz-card,.wz-col-r .wz-card{margin:0}
      .wz-label{font-size:10.5px}
      .wz-badge{width:29px;height:29px}
    }
    @media (max-height:520px){
      .wz-sub{display:none}
      .wz-col{gap:6px}
    }

    @media (prefers-reduced-motion:reduce){
      .wz-bubbles span{animation:none}
      .wz-card,.wz-foot{animation-duration:.01s}
    }
    `}</style>
  );
}
