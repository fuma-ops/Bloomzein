/**
 * WelcomeScreen — the cinematic 3-step onboarding sequence.
 *
 * Route: /welcome. Three full-bleed film screens, each with its own
 * background video and a shared progress indicator:
 *
 *   1. "Welcome to your Bloom."                     — entry-1.mp4
 *   2. "Everything in your life, beautifully connected." — entry-2.mp4
 *   3. "Your life doesn't need to be perfect."      — entry-3.mp4
 *
 * Motion vocabulary shared across all three:
 *   • Headlines rise in word-by-word (soft float-up), with a one-time sheen
 *     sweeping across the script line — gentle, never mechanical.
 *   • The sakura on the brand mark turns slowly.
 *   • Moving between screens is a soft sakura "bloom-wipe" cross-dissolve.
 *
 * Screen 1 has NO button — its film plays its FULL length and, when it ends
 * (or after its measured duration as a fallback), the sequence glides on.
 * Screens 2 and 3 keep a living CTA; the final one enters the app.
 *
 * Screen 2 presents the eight app pillars as a CONSTELLATION: the app's own
 * icons sit around her and soft light-threads draw inward to a glowing central
 * bloom — literally "everything beautifully connected".
 *
 * The centre of every film stays clear: that is where she is on camera.
 */

import { useEffect, useRef, useState } from "react";

const prefersReducedMotion = () =>
  typeof window !== "undefined" &&
  window.matchMedia &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/* ── icons: white hairline glyphs, the same family the app uses ────────────── */
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

/* ── word-by-word float-up headline; wrap the script line in a one-time sheen ── */
function Words({ text, className, base = 0, step = 0.085 }: { text: string; className?: string; base?: number; step?: number }) {
  const words = text.split(" ");
  return (
    <span className={className}>
      {words.flatMap((w, i) => {
        const el = (
          <span key={i} className="wz-word" style={{ animationDelay: `${base + i * step}s` }}>
            {w}
          </span>
        );
        // A fixed-width inline-block space between words — a plain trailing space
        // gets collapsed by the words' own inline-block boxes.
        return i < words.length - 1 ? [el, <span key={`s${i}`} className="wz-sp" />] : [el];
      })}
    </span>
  );
}

/* ── film background + readability scrim ──────────────────────────────────── */
function Film({
  src,
  scrim,
  loop = true,
  onEnded,
}: {
  src: string;
  scrim: string;
  loop?: boolean;
  onEnded?: () => void;
}) {
  const ref = useRef<HTMLVideoElement>(null);

  // Screen 1 advances on the film's own end. Back the native `ended` event with
  // a fallback keyed to the clip's REAL duration, so the film always plays in
  // full (never cut short) and we still glide on if `ended` never fires.
  useEffect(() => {
    const v = ref.current;
    if (!v || !onEnded) return;
    let fb: ReturnType<typeof setTimeout>;
    const arm = () => {
      if (isFinite(v.duration) && v.duration > 0) {
        clearTimeout(fb);
        fb = setTimeout(onEnded, v.duration * 1000 + 600);
      }
    };
    if (v.readyState >= 1) arm();
    v.addEventListener("loadedmetadata", arm);
    return () => {
      v.removeEventListener("loadedmetadata", arm);
      clearTimeout(fb);
    };
  }, [onEnded]);

  return (
    <div className="wz-bg" aria-hidden>
      <video ref={ref} className="wz-video" autoPlay muted loop={loop} playsInline preload="auto" onEnded={onEnded}>
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
  // No button: the title floats in, the subtitle follows, and the film plays in
  // full — when it ends (or after its length) we glide on. Tap also continues.
  const done = useRef(false);
  const go = () => {
    if (done.current) return;
    done.current = true;
    onNext();
  };

  return (
    <div className="wz-stage s1-stage" onClick={go} title="Continue">
      <Film src="/videos/entry-1.mp4" scrim="wz-scrim--left" loop={false} onEnded={go} />
      <div className="wz-content s1">
        <div className="wz-topbar">
          <BrandLockup />
          <Progress step={1} />
        </div>

        <div className="s1-body">
          <h1 className="s1-h">
            <Words text="Welcome to" className="s1-serif" base={0.2} step={0.09} />
            <span className="s1-script wz-sheen" style={{ ["--sheen-delay" as string]: "0.95s" }}>
              <Words text="your Bloom." base={0.5} step={0.1} />
              <em className="wz-heart">♡</em>
            </span>
          </h1>

          <div className="wz-divider wz-fade" style={{ animationDelay: "1.15s" }} aria-hidden>
            <span /> <Sakura className="wz-divider-flower" /> <span />
          </div>
          <p className="s1-sub wz-fade" style={{ animationDelay: "1.3s" }}>
            A little space for the woman
            <br />
            you're becoming.
          </p>
        </div>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   SCREEN 2 — "Everything in your life, beautifully connected."
   The eight app pillars as a constellation, linked by light-threads to a hub.
   ════════════════════════════════════════════════════════════════════════════ */
type Node = { icon: keyof typeof ico; a: string; b: string; x: number; y: number; side: "l" | "r" };
const HUB = { x: 50, y: 53 };
const NODES: Node[] = [
  { icon: "lotus", a: "Understand", b: "your rhythm", x: 25, y: 29, side: "l" },
  { icon: "meditate", a: "Move", b: "your body", x: 20, y: 45, side: "l" },
  { icon: "bowl", a: "Nourish", b: "yourself", x: 22, y: 61, side: "l" },
  { icon: "check", a: "Build better", b: "habits", x: 27, y: 76, side: "l" },
  { icon: "brain", a: "Clear", b: "your mind", x: 75, y: 29, side: "r" },
  { icon: "wallet", a: "Feel more", b: "in control", x: 80, y: 45, side: "r" },
  { icon: "calheart", a: "Remember", b: "what matters", x: 78, y: 61, side: "r" },
  { icon: "droplet", a: "Take care", b: "of yourself", x: 73, y: 76, side: "r" },
];

function FeatureIcon({ icon }: { icon: keyof typeof ico }) {
  return (
    <span className="wz-feat-ico">
      <svg viewBox="0 0 24 24" aria-hidden>
        {ico[icon]}
      </svg>
    </span>
  );
}

function ScreenConnected({ onNext }: { onNext: () => void }) {
  return (
    <div className="wz-stage">
      <Film src="/videos/entry-2.mp4" scrim="wz-scrim--soft" />

      {/* threads + hub sit above the film but below the text/CTA */}
      <svg className="wz-threads" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden>
        {NODES.map((n, i) => (
          <path
            key={n.a + n.b}
            pathLength={1}
            d={`M ${n.x} ${n.y} Q ${(n.x + HUB.x) / 2} ${(n.y + HUB.y) / 2 - 5} ${HUB.x} ${HUB.y}`}
            style={{ animationDelay: `${0.6 + i * 0.16}s` }}
          />
        ))}
      </svg>
      <div className="wz-hub" style={{ left: `${HUB.x}%`, top: `${HUB.y}%` }} aria-hidden>
        <Sakura className="wz-hub-flower" />
      </div>

      {/* desktop constellation */}
      <div className="wz-constellation" aria-hidden>
        {NODES.map((n, i) => (
          <div
            key={n.a + n.b}
            className={`wz-feat ${n.side === "l" ? "is-l" : "is-r"}`}
            style={{ left: `${n.x}%`, top: `${n.y}%`, animationDelay: `${0.65 + i * 0.16}s` }}
          >
            <FeatureIcon icon={n.icon} />
            <span className="wz-feat-lbl">
              {n.a}
              <br />
              {n.b}
            </span>
          </div>
        ))}
      </div>

      <div className="wz-content s2">
        <div className="wz-topbar wz-topbar--center">
          <Progress step={2} />
        </div>

        <header className="wz-head">
          <h1 className="wz-h">
            <Words text="Everything in your life," className="wz-h-serif" base={0.15} step={0.07} />
            <span className="wz-h-script wz-sheen" style={{ ["--sheen-delay" as string]: "0.85s" }}>
              <Words text="beautifully connected." base={0.5} step={0.075} />
              <em className="wz-heart">♡</em>
            </span>
          </h1>
          <p className="wz-sub wz-fade" style={{ animationDelay: "1s" }}>
            Your mood. Your movement. Your meals.
            <br />
            Your plans. Your little everyday moments.
          </p>
        </header>

        {/* mobile fallback: a tidy two-column list (constellation is desktop art) */}
        <div className="wz-feat-grid" aria-hidden>
          {NODES.map((n, i) => (
            <div key={n.a + n.b} className="wz-feat-row" style={{ animationDelay: `${0.4 + i * 0.09}s` }}>
              <FeatureIcon icon={n.icon} />
              <span className="wz-feat-lbl">
                {n.a} {n.b}
              </span>
            </div>
          ))}
        </div>

        <div className="wz-foot-row">
          <p className="wz-foot">
            One beautiful space. Everything that matters to you. <em className="wz-heart">♡</em>
          </p>
          <Cta label="Show me my Bloom" onClick={onNext} delay={1} />
        </div>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   SCREEN 3 — "Your life doesn't need to be perfect."
   Floating glass cards from the live Today set-up, kept OUT of the face zone
   (the upper-centre band stays clear; cards hug the edges & the lower body).
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
            <Words text="Your life doesn't need to be perfect." className="s3-serif" base={0.15} step={0.055} />
            <span className="s3-script wz-sheen" style={{ ["--sheen-delay" as string]: "0.9s" }}>
              <Words text="It just needs to feel like yours." base={0.5} step={0.06} />
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

        {/* ── floating life cards — arranged around a clear centre-top face zone ── */}
        <div className="s3-cards" aria-hidden>
          {/* Morning Yoga — beside her, below the face line */}
          <article className="s3-card s3-photo" style={{ left: "41%", top: "40%", animationDelay: ".15s" }}>
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

          {/* Nourishing Meal — lower-left of body */}
          <article className="s3-card s3-photo" style={{ left: "41%", top: "67%", animationDelay: ".45s" }}>
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

          {/* Journal — bottom centre, clear of the face */}
          <article className="s3-card" style={{ left: "58%", top: "76%", animationDelay: ".75s" }}>
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
          <article className="s3-card s3-right" style={{ right: "6.5%", top: "6%", animationDelay: ".3s" }}>
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
          <article className="s3-card s3-right" style={{ right: "5%", top: "27%", animationDelay: ".6s" }}>
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
          <article className="s3-card s3-right" style={{ right: "5.5%", top: "46%", animationDelay: ".9s" }}>
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
          <article className="s3-card s3-right" style={{ right: "5.5%", top: "65%", animationDelay: "1.05s" }}>
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
          <article className="s3-card s3-right" style={{ right: "6.5%", top: "83%", animationDelay: "1.2s" }}>
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
   Controller — sequences the three screens with a soft bloom-wipe transition.
   ════════════════════════════════════════════════════════════════════════════ */
export default function WelcomeScreen() {
  const [step, setStep] = useState(1);
  const [veiling, setVeiling] = useState(false);

  // Soft cross-dissolve: a sakura "bloom" veil blooms over the screen, the step
  // swaps underneath while it's opaque, then the veil clears.
  const swap = (fn: () => void) => {
    if (prefersReducedMotion()) {
      fn();
      return;
    }
    setVeiling(true);
    window.setTimeout(fn, 300);
    window.setTimeout(() => setVeiling(false), 760);
  };

  const goApp = () =>
    swap(() => {
      try {
        window.history.pushState({}, "", "/app/today");
        window.dispatchEvent(new PopStateEvent("popstate"));
      } catch {
        window.location.assign("/app/today");
      }
    });

  return (
    <div className="wz-root">
      <Styles />
      <div className="wz-seq" key={step}>
        {step === 1 && <ScreenIntro onNext={() => swap(() => setStep(2))} />}
        {step === 2 && <ScreenConnected onNext={() => swap(() => setStep(3))} />}
        {step === 3 && <ScreenLife onEnter={goApp} />}
      </div>

      <div className={`wz-veil${veiling ? " on" : ""}`} aria-hidden>
        <span className="wz-veil-bloom" />
        {Array.from({ length: 7 }).map((_, i) => (
          <span
            key={i}
            className="wz-petal"
            style={{ left: `${8 + i * 13}%`, animationDelay: `${i * 0.05}s`, ["--r" as string]: `${(i % 3) - 1}` }}
          />
        ))}
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
      animation:wz-seq-in .6s cubic-bezier(.16,.7,.2,1) both}
    @keyframes wz-seq-in{from{opacity:0;transform:scale(1.035)}to{opacity:1;transform:none}}

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
    .wz-scrim--left{background:
      linear-gradient(90deg,rgba(255,245,250,.9) 0%,rgba(255,245,250,.66) 26%,rgba(255,245,250,.16) 48%,rgba(255,245,250,0) 62%),
      linear-gradient(180deg,rgba(255,247,241,.42) 0%,rgba(255,240,246,0) 26%,rgba(255,240,246,0) 72%,rgba(255,244,237,.5) 100%)}
    .wz-scrim--vert{background:
      linear-gradient(180deg,rgba(255,247,241,.6) 0%,rgba(255,242,247,.18) 20%,rgba(255,240,246,0) 42%,
        rgba(255,240,246,0) 62%,rgba(255,244,237,.36) 86%,rgba(255,242,234,.64) 100%)}
    .wz-scrim--soft{background:
      linear-gradient(180deg,rgba(255,247,251,.74) 0%,rgba(255,244,250,.42) 15%,rgba(255,242,248,.12) 30%,
        rgba(255,240,246,0) 45%,rgba(255,240,246,0) 60%,rgba(255,244,238,.34) 84%,rgba(255,242,234,.64) 100%),
      linear-gradient(0deg,rgba(255,249,252,.16),rgba(255,249,252,.16))}

    /* ── shared content shell ── */
    .wz-content{position:relative;z-index:3;height:100%;display:flex;flex-direction:column;
      padding:clamp(16px,3vh,32px) clamp(16px,3vw,46px) clamp(14px,2.8vh,30px)}
    .wz-topbar{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;flex:0 0 auto}
    .wz-topbar--center{justify-content:center}

    /* ── brand lockup ── */
    .wz-brand{line-height:1}
    .wz-brand-mark{display:block;width:clamp(20px,1.9vw,30px);height:auto;fill:var(--hot);
      margin:0 0 2px 2px;filter:drop-shadow(0 2px 5px rgba(219,39,119,.3));
      transform-origin:50% 50%;animation:wz-spin 9s linear infinite}
    @keyframes wz-spin{to{transform:rotate(360deg)}}
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

    /* ── word float-up + one-time sheen sweep on the script line ── */
    .wz-word{display:inline-block;opacity:0;transform:translateY(12px);
      animation:wz-word .7s cubic-bezier(.16,.7,.2,1) forwards}
    @keyframes wz-word{to{opacity:1;transform:none}}
    .wz-sp{display:inline-block;width:.26em}
    .wz-sheen{position:relative;display:inline-block;overflow:hidden}
    .wz-sheen::after{content:"";position:absolute;inset:0;pointer-events:none;mix-blend-mode:overlay;
      background:linear-gradient(105deg,transparent 34%,rgba(255,255,255,.85) 50%,transparent 66%);
      transform:translateX(-120%);
      animation:wz-sheen 1.5s ease-in-out var(--sheen-delay,1s) 1 forwards}
    @keyframes wz-sheen{to{transform:translateX(120%)}}
    .wz-fade{animation:wz-in .7s cubic-bezier(.16,.7,.2,1) both}
    @keyframes wz-in{to{opacity:1;transform:none}}

    /* ── shared divider ── */
    .wz-divider{display:flex;align-items:center;gap:10px}
    .wz-divider span{height:1.5px;width:clamp(24px,3vw,52px);border-radius:2px;
      background:linear-gradient(90deg,rgba(249,168,212,0),var(--petal))}
    .wz-divider span:last-child{background:linear-gradient(90deg,var(--petal),rgba(249,168,212,0))}
    .wz-divider-flower{width:clamp(12px,1.1vw,16px);height:auto;fill:var(--pink)}
    .wz-heart{font-style:normal;color:var(--pink);font-size:.72em;vertical-align:.12em}

    /* ══════════ SCREEN 1 ══════════ */
    .s1-stage{cursor:pointer}
    .s1-body{flex:1;min-height:0;display:flex;flex-direction:column;align-items:flex-start;
      justify-content:center;max-width:min(52%,640px);gap:clamp(10px,2vh,22px);
      padding-left:clamp(0px,1vw,20px)}
    .s1-h{margin:0;display:flex;flex-direction:column;gap:clamp(2px,.8vh,10px)}
    .s1-serif{font-family:var(--serif);font-weight:700;color:var(--plum);
      font-size:clamp(30px,4.2vw,62px);line-height:1.02}
    .s1-script{font-family:var(--script);font-weight:700;color:var(--hot);
      font-size:clamp(42px,6vw,92px);line-height:.96}
    .s1-sub{margin:0;color:var(--ink);font-weight:600;
      font-size:clamp(14px,1.35vw,21px);line-height:1.5;opacity:0;transform:translateY(8px)}

    /* ══════════ SCREEN 2 ══════════ */
    .wz-content.s2{padding-top:clamp(12px,2.2vh,22px);pointer-events:none}
    .wz-content.s2 .wz-cta{pointer-events:auto}
    .wz-head{text-align:center;flex:0 0 auto;margin-top:clamp(4px,1vh,10px)}
    .wz-h{margin:0;display:flex;flex-direction:column;align-items:center;gap:2px}
    .wz-h-serif{font-family:var(--serif);font-weight:700;color:var(--plum);
      font-size:clamp(19px,2.35vw,34px);line-height:1.14}
    .wz-h-script{font-family:var(--script);font-weight:700;color:var(--hot);
      font-size:clamp(28px,3.5vw,50px);line-height:1.06;margin-top:-2px}
    .wz-sub{margin:clamp(6px,1.1vh,12px) auto 0;color:var(--muted);font-weight:600;
      font-size:clamp(11px,1.02vw,15px);line-height:1.55;opacity:0;transform:translateY(8px)}

    /* threads + hub */
    .wz-threads{position:absolute;inset:0;z-index:1;pointer-events:none;overflow:visible}
    .wz-threads path{fill:none;stroke:rgba(233,30,132,.3);stroke-width:1.3;stroke-linecap:round;
      vector-effect:non-scaling-stroke;filter:drop-shadow(0 0 3px rgba(233,30,132,.4));
      opacity:0;animation:wz-thread-in 1s ease forwards}
    @keyframes wz-thread-in{to{opacity:1}}
    .wz-hub{position:absolute;z-index:1;transform:translate(-50%,-50%);
      width:clamp(30px,3.2vw,52px);height:clamp(30px,3.2vw,52px);display:grid;place-items:center;
      border-radius:50%;background:radial-gradient(circle,rgba(255,255,255,.9),rgba(255,222,240,.5) 60%,transparent 72%);
      opacity:0;animation:wz-hub-in .8s .5s cubic-bezier(.2,1.2,.4,1) forwards}
    @keyframes wz-hub-in{to{opacity:1}}
    .wz-hub::before{content:"";position:absolute;inset:-40%;border-radius:50%;
      background:radial-gradient(circle,rgba(233,30,132,.28),transparent 66%);
      animation:wz-hub-pulse 3.2s ease-in-out infinite}
    @keyframes wz-hub-pulse{0%,100%{transform:scale(.86);opacity:.6}50%{transform:scale(1.12);opacity:1}}
    .wz-hub-flower{position:relative;width:64%;height:64%;fill:var(--hot);
      filter:drop-shadow(0 2px 6px rgba(219,39,119,.5))}

    /* constellation features (desktop) — icon anchored at (x,y), label to the side */
    .wz-constellation{position:absolute;inset:0;z-index:2;pointer-events:none;display:block}
    .wz-feat{position:absolute;transform:translate(-50%,-50%);
      opacity:0;animation:wz-feat-in .7s cubic-bezier(.2,1.15,.4,1) forwards}
    @keyframes wz-feat-in{from{opacity:0;transform:translate(-50%,-50%) scale(.6)}to{opacity:1;transform:translate(-50%,-50%) scale(1)}}
    .wz-feat-ico{display:grid;place-items:center;
      width:clamp(38px,3.4vw,58px);height:clamp(38px,3.4vw,58px);border-radius:50%;
      background:linear-gradient(160deg,#F871B0 0%,var(--pink) 46%,var(--deep) 100%);
      box-shadow:0 8px 18px -6px rgba(219,39,119,.7),0 0 0 5px rgba(255,255,255,.35),
        inset 0 1px 0 rgba(255,255,255,.55);
      animation:wz-badge-breathe 4.6s ease-in-out infinite}
    @keyframes wz-badge-breathe{0%,100%{transform:scale(1)}50%{transform:scale(1.06)}}
    .wz-feat-ico svg{width:54%;height:54%;fill:none;stroke:#fff;stroke-width:1.7;
      stroke-linecap:round;stroke-linejoin:round}
    .wz-feat-lbl{position:absolute;top:50%;transform:translateY(-50%);white-space:nowrap;
      font-weight:700;color:var(--ink);line-height:1.24;font-size:clamp(11px,1.03vw,16px);
      text-shadow:0 1px 10px rgba(255,244,250,.9),0 1px 2px rgba(255,255,255,.9)}
    .wz-feat.is-l .wz-feat-lbl{right:calc(100% + clamp(8px,.7vw,13px));text-align:right}
    .wz-feat.is-r .wz-feat-lbl{left:calc(100% + clamp(8px,.7vw,13px));text-align:left}

    /* mobile fallback list (hidden on desktop) */
    .wz-feat-grid{display:none}

    .wz-foot-row{flex:0 0 auto;display:flex;flex-direction:column;align-items:center;
      gap:clamp(8px,1.4vh,16px);margin-top:auto}
    .wz-foot{margin:0;text-align:center;font-family:var(--serif);font-weight:500;
      color:var(--ink);font-size:clamp(11px,1.05vw,16px);
      opacity:0;animation:wz-in .9s 1.9s cubic-bezier(.16,.7,.2,1) forwards;transform:translateY(6px)}

    /* ══════════ SCREEN 3 ══════════ */
    .wz-content.s3{padding-bottom:clamp(16px,3vh,30px)}
    .s3-body{position:relative;z-index:3;flex:1;min-height:0;display:flex;flex-direction:column;
      align-items:flex-start;justify-content:center;max-width:min(39%,470px);
      gap:clamp(8px,1.5vh,16px);padding-left:clamp(0px,1vw,18px)}
    .s3-h{margin:0;display:flex;flex-direction:column;gap:clamp(2px,.6vh,8px)}
    .s3-serif{font-family:var(--serif);font-weight:700;color:var(--plum);
      font-size:clamp(22px,2.9vw,44px);line-height:1.04}
    .s3-script{font-family:var(--script);font-weight:700;color:var(--hot);
      font-size:clamp(26px,3.5vw,54px);line-height:1}
    .s3-body-copy{margin:0;color:var(--ink);font-weight:600;
      font-size:clamp(12px,1.05vw,16.5px);line-height:1.55;max-width:26em;opacity:.94;
      animation:wz-in .9s .7s cubic-bezier(.16,.7,.2,1) both;transform:translateY(8px)}
    .s3-divider{animation:wz-in .9s .8s both}
    .s3-space{margin:0;color:var(--ink);font-weight:600;line-height:1.5;
      font-size:clamp(12px,1.08vw,17px);animation:wz-in .9s .9s cubic-bezier(.16,.7,.2,1) both;transform:translateY(8px)}
    .s3-space-strong{display:inline-flex;align-items:center;gap:6px;font-weight:800;color:var(--plum);font-size:1.06em}
    .s3-space-flower{width:1.05em;height:1.05em;fill:var(--pink)}
    .s3-space-script{font-style:normal;font-family:var(--script);color:var(--hot);font-size:1.35em;font-weight:700}

    .s3-cards{position:absolute;inset:0;z-index:2;pointer-events:none}
    .s3-card{position:absolute;width:clamp(104px,11vw,176px);
      padding:clamp(6px,.7vw,11px) clamp(8px,.85vw,13px);border-radius:clamp(11px,1vw,16px);
      background:rgba(255,255,255,.72);backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);
      border:1px solid rgba(255,255,255,.9);
      box-shadow:0 14px 34px -16px rgba(190,24,93,.5),inset 0 1px 0 rgba(255,255,255,.75);
      opacity:0;transform:translateY(14px) scale(.94);
      animation:wz-card-pop .8s cubic-bezier(.2,1.2,.35,1) forwards}
    @keyframes wz-card-pop{to{opacity:1;transform:none}}
    .s3-card-top{display:flex;align-items:center;gap:clamp(6px,.6vw,9px)}
    .s3-card-heads{display:flex;flex-direction:column;min-width:0;flex:1}
    .s3-card-heads b{font-weight:800;color:var(--ink);line-height:1.15;font-size:clamp(11px,.92vw,15px)}
    .s3-card-heads small{color:var(--muted);font-weight:600;font-size:clamp(9px,.72vw,11.5px)}
    .s3-badge{flex:0 0 auto;display:grid;place-items:center;
      width:clamp(22px,2vw,34px);height:clamp(22px,2vw,34px);border-radius:50%;
      background:linear-gradient(160deg,#F871B0 0%,var(--pink) 46%,var(--deep) 100%);
      box-shadow:0 5px 12px -5px rgba(219,39,119,.7),inset 0 1px 0 rgba(255,255,255,.5)}
    .s3-badge svg{width:56%;height:56%;fill:none;stroke:#fff;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}
    .s3-mini-heart{font-style:normal;color:var(--pink);font-size:clamp(11px,1vw,15px);align-self:flex-start}
    .s3-emoji{font-size:clamp(15px,1.5vw,22px);line-height:1}
    .s3-thumb{position:relative;margin-top:clamp(6px,.7vw,9px);border-radius:clamp(9px,.85vw,14px);
      overflow:hidden;aspect-ratio:16/10;background:#FBE3EF}
    .s3-thumb img{width:100%;height:100%;object-fit:cover;display:block}
    .s3-thumb-check{position:absolute;right:6px;bottom:6px;display:grid;place-items:center;
      width:clamp(18px,1.5vw,24px);height:clamp(18px,1.5vw,24px);border-radius:50%;
      background:linear-gradient(160deg,var(--pink),var(--deep));box-shadow:0 3px 8px -2px rgba(219,39,119,.7)}
    .s3-thumb-check svg{width:64%;height:64%}
    .s3-note{margin:clamp(4px,.5vw,7px) 0 0;color:var(--ink);font-weight:600;line-height:1.35;font-size:clamp(10px,.82vw,13px)}
    .s3-note-dim{color:var(--muted);font-weight:600;margin-top:2px}
    .s3-note-strong{font-weight:800;color:var(--plum);margin-top:clamp(4px,.5vw,7px)}
    .s3-water-n{color:var(--hot);font-weight:800;font-size:1.25em}
    .s3-bar{margin-top:clamp(5px,.55vw,8px);height:clamp(6px,.6vw,9px);border-radius:999px;
      background:rgba(236,72,153,.16);overflow:hidden}
    .s3-bar span{display:block;height:100%;border-radius:999px;background:linear-gradient(90deg,#F871B0,var(--deep))}
    .s3-week{display:flex;gap:clamp(3px,.35vw,5px);margin-top:clamp(5px,.55vw,8px)}
    .s3-week span{flex:1;aspect-ratio:1;display:grid;place-items:center;border-radius:50%;
      font-size:clamp(7px,.62vw,9.5px);font-weight:800;color:var(--muted);
      background:rgba(236,72,153,.12);border:1.5px dashed rgba(236,72,153,.28)}
    .s3-week span.on{color:#fff;background:linear-gradient(160deg,var(--pink),var(--deep));border:none}
    .s3-week span svg{width:64%;height:64%}
    .s3-plan-row{display:flex;align-items:center;gap:clamp(5px,.5vw,8px);margin:clamp(4px,.45vw,6px) 0 0;
      font-size:clamp(9px,.78vw,12.5px);font-weight:600;color:var(--ink)}
    .s3-plan-row i{flex:0 0 auto;width:clamp(5px,.5vw,7px);height:clamp(5px,.5vw,7px);border-radius:50%;background:var(--pink)}
    .s3-plan-row span{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
    .s3-plan-row small{color:var(--muted);font-weight:700;font-size:.86em;flex:0 0 auto}

    /* ── soft bloom-wipe transition veil ── */
    .wz-veil{position:absolute;inset:0;z-index:40;pointer-events:none;opacity:0;transition:opacity .3s ease}
    .wz-veil.on{opacity:1}
    .wz-veil-bloom{position:absolute;inset:0;transform:scale(.5);opacity:0;
      background:radial-gradient(circle at 50% 54%,rgba(255,244,250,.97) 0%,rgba(251,209,232,.82) 38%,
        rgba(246,201,223,.42) 68%,rgba(246,201,223,0) 100%)}
    .wz-veil.on .wz-veil-bloom{animation:wz-bloom .76s ease both}
    @keyframes wz-bloom{0%{transform:scale(.5);opacity:0}38%{opacity:1}100%{transform:scale(1.5);opacity:0}}
    .wz-petal{position:absolute;top:-6%;width:14px;height:14px;border-radius:60% 40% 60% 40%;
      background:radial-gradient(circle at 34% 30%,#fff,var(--petal) 70%);opacity:0}
    .wz-veil.on .wz-petal{animation:wz-petal-fall .8s ease-in both}
    @keyframes wz-petal-fall{0%{opacity:0;transform:translateY(0) rotate(0)}30%{opacity:.9}
      100%{opacity:0;transform:translateY(70dvh) rotate(calc(var(--r) * 120deg))}}

    /* ── mobile ── */
    @media (max-width:767px){
      .wz-scrim--left{background:
        linear-gradient(180deg,rgba(255,245,250,.5) 0%,rgba(255,245,250,.05) 24%,
          rgba(255,245,250,0) 48%,rgba(255,244,249,.72) 82%,rgba(255,243,248,.94) 100%)}
      .wz-content{padding:clamp(14px,3vh,26px) 20px clamp(20px,4vh,34px)}

      .s1-body{max-width:100%;align-items:center;justify-content:flex-end;text-align:center;
        padding-bottom:clamp(6px,2vh,18px)}
      .s1-serif{font-size:clamp(28px,9vw,40px)}
      .s1-script{font-size:clamp(40px,13vw,60px)}
      .s1-sub{font-size:15px}

      /* screen 2: hide the constellation + threads; show a tidy two-col list */
      .wz-threads,.wz-hub,.wz-constellation{display:none}
      .wz-content.s2{pointer-events:auto}
      .wz-feat-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px clamp(8px,3vw,16px);
        margin:clamp(14px,3vh,26px) 0 auto;padding-top:clamp(8px,2vh,18px)}
      .wz-feat-row{display:flex;align-items:center;gap:9px;
        background:rgba(255,255,255,.66);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);
        border:1px solid rgba(255,255,255,.85);border-radius:14px;padding:7px 10px 7px 7px;
        box-shadow:0 8px 20px -12px rgba(190,24,93,.42);
        opacity:0;transform:translateY(10px);animation:wz-word .7s cubic-bezier(.16,.7,.2,1) forwards}
      .wz-feat-row .wz-feat-ico{width:30px;height:30px;flex:0 0 auto;position:static;animation:none}
      .wz-feat-row .wz-feat-lbl{position:static;transform:none;white-space:normal;
        font-size:12px;line-height:1.2;text-shadow:none}

      /* screen 3 — floating cluster is desktop art; lead with promise + CTA */
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
    }

    @media (prefers-reduced-motion:reduce){
      .wz-seq,.wz-word,.wz-fade,.wz-cta,.s3-card,.s3-body-copy,.s3-divider,.s3-space,
      .wz-feat,.wz-feat-ico,.wz-hub,.wz-foot,.wz-feat-row{
        animation-duration:.01s !important;animation-delay:0s !important}
      .wz-cta{animation:wz-cta-in .01s forwards}
      .wz-brand-mark,.wz-hub::before{animation:none}
      .wz-sheen::after{display:none}
      .wz-threads path{opacity:1;animation:none}
      .s1-sub,.wz-sub,.s3-body-copy,.s3-space,.wz-foot{opacity:1 !important;transform:none !important}
    }
    `}</style>
  );
}
