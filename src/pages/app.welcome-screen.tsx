/**
 * WelcomeScreen — the cinematic 3-step onboarding sequence.
 *
 * Route: /welcome. Three full-bleed film screens, each with its own
 * background video, a living pink CTA, and a shared progress indicator:
 *
 *   1. "Welcome to your Bloom."                     — entry-1.mp4
 *   2. "Everything in your life, beautifully connected." — entry-2.mp4
 *   3. "Your life doesn't need to be perfect."      — entry-3.mp4
 *
 * The CTA on each step advances the sequence; the final CTA enters the app.
 * All three share one design system (tokens in <Styles/>) so the look is
 * identical across screens. See docs/welcome-screen-design.md for screen 2's
 * measured spec — the other two are built to the same vocabulary.
 *
 * The centre of every film stays clear: that is where she is on camera. The
 * foreground (headline, cards, CTA) is composed around her.
 */

import { useState } from "react";

/* ── icons: white/ink hairline glyphs, drawn to match the mockup badges ───── */
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
  book: (
    <>
      <path d="M12 6.4C10.5 5.3 8.6 4.9 6 5.1a1 1 0 0 0-.9 1v10.3a1 1 0 0 0 1.1 1c2.3-.2 4.1.2 5.8 1.5" />
      <path d="M12 6.4c1.5-1.1 3.4-1.5 6-1.3a1 1 0 0 1 .9 1v10.3a1 1 0 0 1-1.1 1c-2.3-.2-4.1.2-5.8 1.5" />
      <path d="M12 6.4v12.5" />
    </>
  ),
  bell: (
    <>
      <path d="M7 10a5 5 0 0 1 10 0c0 4 1.4 5.4 2 6H5c.6-.6 2-2 2-6Z" />
      <path d="M10.4 19.4a1.8 1.8 0 0 0 3.2 0" />
    </>
  ),
  cal: (
    <>
      <rect x="4.6" y="6.2" width="14.8" height="13" rx="2" />
      <path d="M4.6 10.2h14.8M9 4.4v3.2M15 4.4v3.2" />
      <path d="M8 13.6h.01M12 13.6h.01M16 13.6h.01M8 16.4h.01M12 16.4h.01" />
    </>
  ),
  smile: (
    <>
      <circle cx="12" cy="12" r="8.2" />
      <path d="M9 14.4c.9.9 1.9 1.3 3 1.3s2.1-.4 3-1.3" />
      <path d="M9.2 10.2h.01M14.8 10.2h.01" />
    </>
  ),
};

/* ── shared brand lockup: sakura mark + wordmark + tagline ─────────────────── */
function Sakura({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden>
      {[0, 72, 144, 216, 288].map((r) => (
        <ellipse key={r} cx="12" cy="7.6" rx="2.5" ry="4.3" transform={`rotate(${r} 12 12)`} />
      ))}
      <circle className="wz-flower-core" cx="12" cy="12" r="1.9" />
    </svg>
  );
}

function BrandLockup() {
  return (
    <div className="wz-brand">
      <Sakura className="wz-brand-mark" />
      <div className="wz-wordmark">Bloomzein</div>
      <div className="wz-tagline">
        stay soft, bloom on. <Sakura className="wz-tag-flower" />
      </div>
    </div>
  );
}

/* ── progress dots ─────────────────────────────────────────────────────────── */
function Progress({ step, total = 3 }: { step: number; total?: number }) {
  return (
    <div className="wz-dots" role="progressbar" aria-valuenow={step} aria-valuemin={1} aria-valuemax={total}>
      {Array.from({ length: total }).map((_, i) => (
        <span key={i} className="wz-dots-seg">
          {i > 0 && <b className={i < step ? "wz-line on" : "wz-line"} />}
          <i className={i + 1 === step ? "wz-dot on" : i + 1 < step ? "wz-dot done" : "wz-dot"} />
        </span>
      ))}
    </div>
  );
}

/* ── living CTA ────────────────────────────────────────────────────────────── */
function Cta({ label, onClick, delay = 0 }: { label: string; onClick: () => void; delay?: number }) {
  return (
    <button className="wz-cta" onClick={onClick} style={{ animationDelay: `${delay}s` }}>
      <span className="wz-cta-label">{label}</span>
      <svg className="wz-cta-arrow" viewBox="0 0 24 24" aria-hidden>
        <path d="M5 12h13M13 6l6 6-6 6" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  );
}

/* ── word-by-word headline (typography is alive) ──────────────────────────── */
function Words({ text, className, base = 0, step = 0.085 }: { text: string; className?: string; base?: number; step?: number }) {
  return (
    <span className={className}>
      {text.split(" ").map((w, i) => (
        <span key={i} className="wz-word" style={{ animationDelay: `${base + i * step}s` }}>
          {w}
          {i < text.split(" ").length - 1 ? " " : ""}
        </span>
      ))}
    </span>
  );
}

/* ── film background + readability scrim ──────────────────────────────────── */
function Film({ src, scrim }: { src: string; scrim: string }) {
  return (
    <div className="wz-bg" aria-hidden>
      <video className="wz-video" autoPlay muted loop playsInline preload="auto">
        <source src={src} type="video/mp4" />
      </video>
      <div className={`wz-scrim ${scrim}`} />
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   SCREEN 1 — "Welcome to your Bloom."
   ════════════════════════════════════════════════════════════════════════════ */
function ScreenIntro({ onNext }: { onNext: () => void }) {
  return (
    <div className="wz-stage">
      <Film src="/videos/entry-1.mp4" scrim="wz-scrim--left" />
      <div className="wz-content s1">
        <div className="wz-topbar">
          <BrandLockup />
          <Progress step={1} />
        </div>

        <div className="s1-body">
          <h1 className="s1-h">
            <Words text="Welcome to" className="s1-serif" base={0.15} />
            <span className="s1-script">
              <Words text="your Bloom." base={0.42} step={0.1} />
              <em className="wz-heart">♡</em>
            </span>
          </h1>

          <div className="wz-divider" aria-hidden>
            <span /> <Sakura className="wz-divider-flower" /> <span />
          </div>

          <p className="s1-sub">
            A little space for the woman
            <br />
            you're becoming.
          </p>

          <Cta label="Begin my journey" onClick={onNext} delay={1} />
        </div>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   SCREEN 2 — "Everything in your life, beautifully connected."
   (foreground composition per docs/welcome-screen-design.md)
   ════════════════════════════════════════════════════════════════════════════ */
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

function ScreenConnected({ onNext }: { onNext: () => void }) {
  return (
    <div className="wz-stage">
      <Film src="/videos/entry-2.mp4" scrim="wz-scrim--vert" />
      <div className="wz-content s2">
        <div className="wz-topbar wz-topbar--center">
          <Progress step={2} />
        </div>

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
          <Sakura className="wz-flower" />
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

        <div className="wz-foot-row">
          <p className="wz-foot">
            One beautiful space. Everything that matters to you. <em className="wz-heart">♡</em>
          </p>
          <Cta label="Show me my Bloom" onClick={onNext} delay={1.1} />
        </div>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   SCREEN 3 — "Your life doesn't need to be perfect."
   Floating glass cards drawn from the live Today set-up (real yoga + meal art).
   ════════════════════════════════════════════════════════════════════════════ */
function MiniBadge({ icon }: { icon: keyof typeof ico }) {
  return (
    <span className="s3-badge">
      <svg viewBox="0 0 24 24" aria-hidden>
        {ico[icon]}
      </svg>
    </span>
  );
}

function ScreenLife({ onEnter }: { onEnter: () => void }) {
  return (
    <div className="wz-stage">
      <Film src="/videos/entry-3.mp4" scrim="wz-scrim--left" />
      <div className="wz-content s3">
        <div className="wz-topbar">
          <BrandLockup />
          <Progress step={3} />
        </div>

        {/* ── left: the promise + CTA ── */}
        <div className="s3-body">
          <h1 className="s3-h">
            <Words text="Your life doesn't need to be perfect." className="s3-serif" base={0.15} />
            <span className="s3-script">
              <Words text="It just needs to feel like yours." base={0.5} step={0.07} />
              <em className="wz-heart">♡</em>
            </span>
          </h1>

          <p className="s3-body-copy">
            Bloomzein brings your days together so you can move with intention, make time for
            yourself, and enjoy the little things again.
          </p>

          <div className="wz-divider s3-divider" aria-hidden>
            <span /> <Sakura className="wz-divider-flower" /> <span />
          </div>

          <p className="s3-space">
            <span className="s3-space-strong">
              <Sakura className="s3-space-flower" /> This is your space.
            </span>
            <br />
            Your pace. Your rhythm. <em className="s3-space-script">Your Bloom.</em>{" "}
            <em className="wz-heart">♡</em>
          </p>

          <Cta label="Start my Bloomzein journey" onClick={onEnter} delay={1.2} />
        </div>

        {/* ── right: floating life cards ── */}
        <div className="s3-cards" aria-hidden>
          {/* Morning Yoga — real pose art from the Today plan */}
          <article className="s3-card s3-photo" style={{ left: "35%", top: "6%", animationDelay: ".35s" }}>
            <div className="s3-card-top">
              <MiniBadge icon="meditate" />
              <div className="s3-card-heads">
                <b>Morning Yoga</b>
                <small>20 min • Flow</small>
              </div>
            </div>
            <div className="s3-thumb">
              <img src="/images/pose-warrior-2.webp" alt="" loading="lazy" />
              <span className="s3-thumb-check">
                <svg viewBox="0 0 24 24" aria-hidden>
                  <path d="M6 12.5l3.6 3.6L18 7.5" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
            </div>
          </article>

          {/* Nourishing Meal — real recipe art from the Today plan */}
          <article className="s3-card s3-photo" style={{ left: "31%", top: "35%", animationDelay: ".5s" }}>
            <div className="s3-card-top">
              <MiniBadge icon="bowl" />
              <div className="s3-card-heads">
                <b>Nourishing Meal</b>
              </div>
              <em className="s3-mini-heart">♡</em>
            </div>
            <div className="s3-thumb">
              <img src="/images/meal-buddha.webp" alt="" loading="lazy" />
            </div>
          </article>

          {/* Journal */}
          <article className="s3-card" style={{ left: "30%", top: "63%", animationDelay: ".65s" }}>
            <div className="s3-card-top">
              <MiniBadge icon="book" />
              <div className="s3-card-heads">
                <b>Journal</b>
              </div>
              <em className="s3-mini-heart">♡</em>
            </div>
            <p className="s3-note">Daily reflection</p>
            <p className="s3-note s3-note-dim">A few lines for me, every day.</p>
          </article>

          {/* Mood */}
          <article className="s3-card s3-right" style={{ right: "7%", top: "6%", animationDelay: ".42s" }}>
            <div className="s3-card-top">
              <MiniBadge icon="smile" />
              <div className="s3-card-heads">
                <b>Mood</b>
              </div>
              <span className="s3-emoji">😊</span>
            </div>
            <p className="s3-note s3-note-strong">Happy</p>
            <p className="s3-note s3-note-dim">Today I feel grateful and calm.</p>
          </article>

          {/* Water */}
          <article className="s3-card s3-right" style={{ right: "5%", top: "26%", animationDelay: ".56s" }}>
            <div className="s3-card-top">
              <MiniBadge icon="droplet" />
              <div className="s3-card-heads">
                <b>Water</b>
              </div>
            </div>
            <p className="s3-note"><b className="s3-water-n">6</b> / 8 cups</p>
            <div className="s3-bar">
              <span style={{ width: "75%" }} />
            </div>
          </article>

          {/* Habits */}
          <article className="s3-card s3-right" style={{ right: "6%", top: "44%", animationDelay: ".7s" }}>
            <div className="s3-card-top">
              <MiniBadge icon="check" />
              <div className="s3-card-heads">
                <b>Habits</b>
              </div>
            </div>
            <p className="s3-note s3-note-dim">7-day streak</p>
            <div className="s3-week">
              {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => (
                <span key={i} className={i < 5 ? "on" : ""}>
                  {i < 5 ? (
                    <svg viewBox="0 0 24 24" aria-hidden>
                      <path d="M6 12.5l3.6 3.6L18 7.5" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  ) : (
                    d
                  )}
                </span>
              ))}
            </div>
          </article>

          {/* Reminders */}
          <article className="s3-card s3-right" style={{ right: "6%", top: "62%", animationDelay: ".82s" }}>
            <div className="s3-card-top">
              <MiniBadge icon="bell" />
              <div className="s3-card-heads">
                <b>Reminders</b>
              </div>
            </div>
            <p className="s3-note s3-note-strong">🎂 Mom's birthday</p>
            <p className="s3-note s3-note-dim">Tomorrow • All day</p>
          </article>

          {/* Plan your day */}
          <article className="s3-card s3-right" style={{ right: "7%", top: "79%", animationDelay: ".94s" }}>
            <div className="s3-card-top">
              <MiniBadge icon="cal" />
              <div className="s3-card-heads">
                <b>Plan your day</b>
              </div>
            </div>
            {[
              ["Team meeting", "10:00 AM"],
              ["Lunch with Sarah", "1:00 PM"],
              ["Date night", "7:00 PM"],
            ].map(([t, time]) => (
              <p key={t} className="s3-plan-row">
                <i />
                <span>{t}</span>
                <small>{time}</small>
              </p>
            ))}
          </article>
        </div>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   Controller — sequences the three screens.
   ════════════════════════════════════════════════════════════════════════════ */
export default function WelcomeScreen() {
  const [step, setStep] = useState(1);

  const goApp = () => {
    try {
      window.history.pushState({}, "", "/app/today");
      window.dispatchEvent(new PopStateEvent("popstate"));
    } catch {
      window.location.assign("/app/today");
    }
  };

  return (
    <div className="wz-root">
      <Styles />
      <div className="wz-seq" key={step}>
        {step === 1 && <ScreenIntro onNext={() => setStep(2)} />}
        {step === 2 && <ScreenConnected onNext={() => setStep(3)} />}
        {step === 3 && <ScreenLife onEnter={goApp} />}
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

    .wz-seq{width:100%;height:100%;display:grid;place-items:center;
      animation:wz-seq-in .5s cubic-bezier(.16,.7,.2,1) both}
    @keyframes wz-seq-in{from{opacity:0;transform:translateX(14px)}to{opacity:1;transform:none}}

    /* Stage keeps the film's 16:9 shape on big screens so nothing is ever cropped */
    .wz-stage{position:relative;overflow:hidden;width:100%;height:100dvh;isolation:isolate}
    @media (min-width:768px){
      .wz-stage{width:min(100vw,calc(100dvh * 16 / 9));height:auto;aspect-ratio:16/9;max-height:100dvh}
    }
    @media (min-width:1200px){
      .wz-stage{width:min(95vw,calc(93dvh * 16 / 9));border-radius:26px;
        box-shadow:0 46px 110px -46px rgba(150,30,80,.5)}
    }

    /* ── film background + scrims ── */
    .wz-bg{position:absolute;inset:0;overflow:hidden;
      background:radial-gradient(60% 48% at 50% 26%,#FFFDFC 0%,#FFF1F7 44%,#FBDCEA 76%,#F6C9DF 100%)}
    .wz-video{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:center}
    .wz-scrim{position:absolute;inset:0;pointer-events:none}
    /* left-weighted: lifts the copy that sits on the left third */
    .wz-scrim--left{background:
      linear-gradient(90deg,rgba(255,245,250,.9) 0%,rgba(255,245,250,.66) 26%,rgba(255,245,250,.16) 48%,rgba(255,245,250,0) 62%),
      linear-gradient(180deg,rgba(255,247,241,.42) 0%,rgba(255,240,246,0) 26%,rgba(255,240,246,0) 72%,rgba(255,244,237,.5) 100%)}
    /* vertical: clear through the middle (she stands there) */
    .wz-scrim--vert{background:
      linear-gradient(180deg,rgba(255,247,241,.6) 0%,rgba(255,242,247,.18) 20%,rgba(255,240,246,0) 42%,
        rgba(255,240,246,0) 62%,rgba(255,244,237,.36) 86%,rgba(255,242,234,.64) 100%)}

    /* ── shared content shell ── */
    .wz-content{position:relative;z-index:2;height:100%;display:flex;flex-direction:column;
      padding:clamp(16px,3vh,32px) clamp(16px,3vw,46px) clamp(14px,2.8vh,30px)}

    .wz-topbar{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;flex:0 0 auto}
    .wz-topbar--center{justify-content:center}

    /* ── brand lockup ── */
    .wz-brand{line-height:1}
    .wz-brand-mark{display:block;width:clamp(20px,1.9vw,30px);height:auto;fill:var(--hot);
      margin:0 0 2px 2px;filter:drop-shadow(0 2px 5px rgba(219,39,119,.3))}
    .wz-flower-core{fill:#FFF0F6}
    .wz-wordmark{font-family:var(--script);font-weight:700;color:var(--hot);
      font-size:clamp(24px,2.5vw,40px);line-height:.9}
    .wz-tagline{display:flex;align-items:center;gap:5px;font-weight:700;color:var(--ink);
      font-size:clamp(9px,.82vw,12.5px);letter-spacing:.01em;margin-top:2px;opacity:.92}
    .wz-tag-flower{width:1em;height:1em;fill:var(--pink)}

    /* ── progress dots ── */
    .wz-dots{display:inline-flex;align-items:center}
    .wz-dots-seg{display:inline-flex;align-items:center}
    .wz-dot{width:clamp(7px,.7vw,9px);height:clamp(7px,.7vw,9px);border-radius:50%;
      background:rgba(219,39,119,.28);transition:.3s}
    .wz-dot.done{background:var(--pink)}
    .wz-dot.on{background:var(--hot);box-shadow:0 0 0 clamp(3px,.35vw,4px) rgba(230,0,126,.16)}
    .wz-line{width:clamp(16px,1.8vw,26px);height:2px;border-radius:2px;margin:0 clamp(4px,.5vw,7px);
      background:rgba(219,39,119,.22)}
    .wz-line.on{background:var(--pink)}

    /* ── living CTA ── */
    .wz-cta{position:relative;display:inline-flex;align-items:center;gap:clamp(9px,1vw,15px);
      border:none;cursor:pointer;font-family:var(--sans);font-weight:700;color:#fff;
      padding:clamp(12px,1.7vh,19px) clamp(22px,2.3vw,42px);border-radius:999px;
      font-size:clamp(15px,1.18vw,21px);letter-spacing:.01em;
      background:linear-gradient(180deg,#FF57AC 0%,#EC0F86 52%,#D30D78 100%);
      box-shadow:0 0 0 2px rgba(255,255,255,.55),0 0 0 4px rgba(233,30,132,.22),
        0 20px 42px -16px rgba(219,39,119,.85),inset 0 1px 0 rgba(255,255,255,.5);
      opacity:0;transform:translateY(10px) scale(.97);
      animation:wz-cta-in .8s cubic-bezier(.16,.7,.2,1) forwards,wz-cta-glow 3s ease-in-out 1s infinite}
    @keyframes wz-cta-in{to{opacity:1;transform:none}}
    @keyframes wz-cta-glow{
      0%,100%{box-shadow:0 0 0 2px rgba(255,255,255,.55),0 0 0 4px rgba(233,30,132,.2),
        0 18px 40px -16px rgba(219,39,119,.8),inset 0 1px 0 rgba(255,255,255,.5)}
      50%{box-shadow:0 0 0 2px rgba(255,255,255,.7),0 0 0 7px rgba(233,30,132,.14),
        0 26px 60px -14px rgba(233,30,132,.95),inset 0 1px 0 rgba(255,255,255,.6)}}
    .wz-cta:hover{transform:translateY(-1px) scale(1.02)}
    .wz-cta:active{transform:scale(.96)}
    .wz-cta-arrow{width:1.15em;height:1.15em;color:#fff;flex:0 0 auto}

    /* ── word-by-word headline ── */
    .wz-word{display:inline-block;opacity:0;transform:translateY(9px);
      animation:wz-word .62s cubic-bezier(.16,.7,.2,1) forwards}
    @keyframes wz-word{to{opacity:1;transform:none}}

    /* ── shared divider (flower between two hairlines) ── */
    .wz-divider{display:flex;align-items:center;gap:10px}
    .wz-divider span{height:1.5px;width:clamp(24px,3vw,52px);border-radius:2px;
      background:linear-gradient(90deg,rgba(249,168,212,0),var(--petal))}
    .wz-divider span:last-child{background:linear-gradient(90deg,var(--petal),rgba(249,168,212,0))}
    .wz-divider-flower{width:clamp(12px,1.1vw,16px);height:auto;fill:var(--pink)}

    .wz-heart{font-style:normal;color:var(--pink);font-size:.72em;vertical-align:.12em}

    /* ══════════ SCREEN 1 ══════════ */
    .s1-body{flex:1;min-height:0;display:flex;flex-direction:column;align-items:flex-start;
      justify-content:center;max-width:min(52%,640px);gap:clamp(10px,2vh,22px);
      padding-left:clamp(0px,1vw,20px)}
    .s1-h{margin:0;display:flex;flex-direction:column;gap:clamp(2px,.8vh,10px)}
    .s1-serif{font-family:var(--serif);font-weight:700;color:var(--plum);
      font-size:clamp(30px,4.2vw,62px);line-height:1.02}
    .s1-script{font-family:var(--script);font-weight:700;color:var(--hot);
      font-size:clamp(42px,6vw,92px);line-height:.96}
    .s1-sub{margin:0;color:var(--ink);font-weight:600;
      font-size:clamp(14px,1.35vw,21px);line-height:1.5}

    /* ══════════ SCREEN 2 ══════════ */
    .wz-content.s2{padding-top:clamp(12px,2.2vh,22px)}
    .wz-head{text-align:center;flex:0 0 auto;margin-top:clamp(4px,1vh,10px)}
    .wz-h{margin:0;display:flex;flex-direction:column;align-items:center;gap:2px}
    .wz-h-serif{font-family:var(--serif);font-weight:700;color:var(--plum);
      font-size:clamp(19px,2.35vw,34px);line-height:1.14}
    .wz-h-script{font-family:var(--script);font-weight:700;color:var(--hot);
      font-size:clamp(28px,3.5vw,50px);line-height:1.06;margin-top:-2px}
    .wz-sub{margin:clamp(6px,1.1vh,12px) auto 0;color:var(--muted);font-weight:600;
      font-size:clamp(11px,1.02vw,15px);line-height:1.55}
    .wz-flower{display:block;width:clamp(13px,1.15vw,17px);height:auto;margin:clamp(5px,.9vh,10px) auto 0;
      fill:var(--petal);opacity:.95}

    .wz-cols{flex:1;min-height:0;display:grid;align-content:start;
      padding-top:clamp(6px,2vh,26px);
      grid-template-columns:minmax(0,1fr) 24% minmax(0,1fr);
      gap:0 clamp(8px,1.6vw,26px);margin-top:clamp(4px,1vh,12px)}
    .wz-col{display:flex;flex-direction:column;justify-content:center;gap:clamp(9px,2.5vh,28px)}
    .wz-col-l{align-items:flex-end}
    .wz-col-r{align-items:flex-start}
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

    .wz-foot-row{flex:0 0 auto;display:flex;flex-direction:column;align-items:center;
      gap:clamp(8px,1.4vh,16px)}
    .wz-foot{margin:0;text-align:center;font-family:var(--serif);font-weight:500;
      color:var(--ink);font-size:clamp(11px,1.05vw,16px);
      opacity:0;animation:wz-in .9s .95s cubic-bezier(.16,.7,.2,1) forwards}

    /* ══════════ SCREEN 3 ══════════ */
    .wz-content.s3{padding-bottom:clamp(16px,3vh,30px)}
    .s3-body{position:relative;z-index:3;flex:1;min-height:0;display:flex;flex-direction:column;
      align-items:flex-start;justify-content:center;max-width:min(42%,520px);
      gap:clamp(8px,1.5vh,16px);padding-left:clamp(0px,1vw,18px)}
    .s3-h{margin:0;display:flex;flex-direction:column;gap:clamp(2px,.6vh,8px)}
    .s3-serif{font-family:var(--serif);font-weight:700;color:var(--plum);
      font-size:clamp(22px,2.9vw,44px);line-height:1.04}
    .s3-script{font-family:var(--script);font-weight:700;color:var(--hot);
      font-size:clamp(26px,3.5vw,54px);line-height:1}
    .s3-body-copy{margin:0;color:var(--ink);font-weight:600;
      font-size:clamp(12px,1.05vw,16.5px);line-height:1.55;max-width:26em;opacity:.94;
      animation:wz-in .9s .7s cubic-bezier(.16,.7,.2,1) both}
    .s3-divider{animation:wz-in .9s .8s both}
    .s3-space{margin:0;color:var(--ink);font-weight:600;line-height:1.5;
      font-size:clamp(12px,1.08vw,17px);animation:wz-in .9s .9s cubic-bezier(.16,.7,.2,1) both}
    .s3-space-strong{display:inline-flex;align-items:center;gap:6px;font-weight:800;color:var(--plum);
      font-size:1.06em}
    .s3-space-flower{width:1.05em;height:1.05em;fill:var(--pink)}
    .s3-space-script{font-style:normal;font-family:var(--script);color:var(--hot);
      font-size:1.35em;font-weight:700}

    /* floating cards layer */
    .s3-cards{position:absolute;inset:0;z-index:2;pointer-events:none}
    .s3-card{position:absolute;width:clamp(120px,13vw,208px);
      padding:clamp(7px,.8vw,13px) clamp(9px,1vw,15px);border-radius:clamp(12px,1.1vw,18px);
      background:rgba(255,255,255,.72);backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);
      border:1px solid rgba(255,255,255,.9);
      box-shadow:0 14px 34px -16px rgba(190,24,93,.5),inset 0 1px 0 rgba(255,255,255,.75);
      opacity:0;transform:translateY(12px) scale(.96);
      animation:wz-in .9s cubic-bezier(.16,.7,.2,1) forwards}
    .s3-card-top{display:flex;align-items:center;gap:clamp(6px,.6vw,9px)}
    .s3-card-heads{display:flex;flex-direction:column;min-width:0;flex:1}
    .s3-card-heads b{font-weight:800;color:var(--ink);line-height:1.15;
      font-size:clamp(11px,.92vw,15px)}
    .s3-card-heads small{color:var(--muted);font-weight:600;font-size:clamp(9px,.72vw,11.5px)}
    .s3-badge{flex:0 0 auto;display:grid;place-items:center;
      width:clamp(22px,2vw,34px);height:clamp(22px,2vw,34px);border-radius:50%;
      background:linear-gradient(160deg,#F871B0 0%,var(--pink) 46%,var(--deep) 100%);
      box-shadow:0 5px 12px -5px rgba(219,39,119,.7),inset 0 1px 0 rgba(255,255,255,.5)}
    .s3-badge svg{width:56%;height:56%;fill:none;stroke:#fff;stroke-width:1.8;
      stroke-linecap:round;stroke-linejoin:round}
    .s3-mini-heart{font-style:normal;color:var(--pink);font-size:clamp(11px,1vw,15px);align-self:flex-start}
    .s3-emoji{font-size:clamp(15px,1.5vw,22px);line-height:1}

    .s3-thumb{position:relative;margin-top:clamp(6px,.7vw,9px);border-radius:clamp(9px,.85vw,14px);
      overflow:hidden;aspect-ratio:16/10;background:#FBE3EF}
    .s3-thumb img{width:100%;height:100%;object-fit:cover;display:block}
    .s3-thumb-check{position:absolute;right:6px;bottom:6px;display:grid;place-items:center;
      width:clamp(18px,1.5vw,24px);height:clamp(18px,1.5vw,24px);border-radius:50%;
      background:linear-gradient(160deg,var(--pink),var(--deep));
      box-shadow:0 3px 8px -2px rgba(219,39,119,.7)}
    .s3-thumb-check svg{width:64%;height:64%}

    .s3-note{margin:clamp(4px,.5vw,7px) 0 0;color:var(--ink);font-weight:600;line-height:1.35;
      font-size:clamp(10px,.82vw,13px)}
    .s3-note-dim{color:var(--muted);font-weight:600;margin-top:2px}
    .s3-note-strong{font-weight:800;color:var(--plum);margin-top:clamp(4px,.5vw,7px)}
    .s3-water-n{color:var(--hot);font-weight:800;font-size:1.25em}
    .s3-bar{margin-top:clamp(5px,.55vw,8px);height:clamp(6px,.6vw,9px);border-radius:999px;
      background:rgba(236,72,153,.16);overflow:hidden}
    .s3-bar span{display:block;height:100%;border-radius:999px;
      background:linear-gradient(90deg,#F871B0,var(--deep))}
    .s3-week{display:flex;gap:clamp(3px,.35vw,5px);margin-top:clamp(5px,.55vw,8px)}
    .s3-week span{flex:1;aspect-ratio:1;display:grid;place-items:center;border-radius:50%;
      font-size:clamp(7px,.62vw,9.5px);font-weight:800;color:var(--muted);
      background:rgba(236,72,153,.12);border:1.5px dashed rgba(236,72,153,.28)}
    .s3-week span.on{color:#fff;background:linear-gradient(160deg,var(--pink),var(--deep));
      border:none}
    .s3-week span svg{width:64%;height:64%}
    .s3-plan-row{display:flex;align-items:center;gap:clamp(5px,.5vw,8px);margin:clamp(4px,.45vw,6px) 0 0;
      font-size:clamp(9px,.78vw,12.5px);font-weight:600;color:var(--ink)}
    .s3-plan-row i{flex:0 0 auto;width:clamp(5px,.5vw,7px);height:clamp(5px,.5vw,7px);border-radius:50%;
      background:var(--pink)}
    .s3-plan-row span{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
    .s3-plan-row small{color:var(--muted);font-weight:700;font-size:.86em;flex:0 0 auto}

    /* ── tablet: keep cards but tighten ── */
    @media (max-width:1100px){
      .s3-card{width:clamp(108px,17vw,168px)}
    }

    /* ── mobile: cinematic — anchor copy over a strong bottom scrim ── */
    @media (max-width:767px){
      .wz-scrim--left{background:
        linear-gradient(180deg,rgba(255,245,250,.5) 0%,rgba(255,245,250,.05) 24%,
          rgba(255,245,250,0) 48%,rgba(255,244,249,.72) 82%,rgba(255,243,248,.94) 100%)}
      .wz-content{padding:clamp(14px,3vh,26px) 20px clamp(20px,4vh,34px)}

      /* screen 1 */
      .s1-body{max-width:100%;align-items:center;justify-content:flex-end;text-align:center;
        padding-bottom:clamp(6px,2vh,18px)}
      .s1-serif{font-size:clamp(28px,9vw,40px)}
      .s1-script{font-size:clamp(40px,13vw,60px)}
      .s1-sub{font-size:15px}

      /* screen 2 */
      .wz-cols{grid-template-columns:minmax(0,1fr) 13% minmax(0,1fr);gap:0 6px}
      .wz-card{gap:7px;padding:6px 9px 6px 6px}
      .wz-col-l .wz-card,.wz-col-r .wz-card{margin:0}
      .wz-label{font-size:10.5px}
      .wz-badge{width:29px;height:29px}

      /* screen 3 — the floating cluster is desktop art; on phones we lead with
         the promise + CTA over the film, and show a compact proof strip */
      .s3-cards{display:none}
      .s3-body{max-width:100%;align-items:center;text-align:center;justify-content:flex-end;
        padding-bottom:clamp(4px,1.5vh,14px)}
      .s3-serif{font-size:clamp(22px,7vw,32px)}
      .s3-script{font-size:clamp(26px,9vw,40px)}
      .s3-body-copy{max-width:34ch}
      .s3-divider,.s3-space{align-self:center}
      .s3-space{text-align:center}
    }
    @media (max-height:520px) and (min-width:768px){
      .wz-sub{display:none}
      .wz-col{gap:6px}
    }

    @media (prefers-reduced-motion:reduce){
      .wz-seq,.wz-word,.wz-card,.wz-foot,.wz-cta,.s3-card,.s3-body-copy,.s3-divider,.s3-space{
        animation-duration:.01s !important;animation-delay:0s !important}
      .wz-cta{animation:wz-cta-in .01s forwards}
    }
    `}</style>
  );
}
