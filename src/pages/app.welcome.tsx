import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
  type CSSProperties,
} from "react";
import {
  ArrowRight,
  ChevronLeft,
  X,
  Sparkles,
  Droplet,
  Flame,
  Target,
  UtensilsCrossed,
  Dumbbell,
  Wallet,
  BookHeart,
  Bell,
  CheckCircle2,
  Flower2,
  Heart,
  CalendarHeart,
} from "lucide-react";
import { trackEvent } from "../lib/analytics";

/**
 * WelcomeIntro — the dreamy "Barbie-world" entry experience shown after a
 * visitor taps **Start Blooming** on the landing page, right before she lands
 * on Today. Three full-screen scenes, each with a soft cherry-blossom video
 * behind her, revealed one gentle beat at a time so the eye is always guided
 * (never a wall of content). Fully responsive: the video is full-bleed on any
 * device while the copy sits in a centred, readable column.
 *
 * Videos + posters live in /public/videos/intro-*.{mp4,webp}. The final CTA
 * routes to /app/today (which then applies the usual AuthGate).
 */

const NEXT_PAGE = "/app/today";

/** Count a number up when it mounts (soft ease-out). */
function CountUp({
  to,
  dur = 1100,
  decimals = 0,
  format,
}: {
  to: number;
  dur?: number;
  decimals?: number;
  format?: (n: number) => string;
}) {
  const [v, setV] = useState(0);
  const reduce = usePrefersReducedMotion();
  useEffect(() => {
    if (reduce) {
      setV(to);
      return;
    }
    let raf = 0;
    let start: number | null = null;
    const step = (t: number) => {
      if (start === null) start = t;
      const p = Math.min(1, (t - start) / dur);
      const e = 1 - Math.pow(1 - p, 3);
      setV(to * e);
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [to, dur, reduce]);
  const shown = decimals ? v.toFixed(decimals) : Math.round(v).toLocaleString();
  return <>{format ? format(v) : shown}</>;
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

/** A few soft petals drifting up over the scene. */
function Petals() {
  const petals = Array.from({ length: 10 });
  return (
    <div className="wi-petals" aria-hidden>
      {petals.map((_, i) => (
        <span
          key={i}
          className="wi-petal"
          style={{
            left: `${(i * 9.7 + 4) % 100}%`,
            animationDuration: `${9 + (i % 5) * 2.2}s`,
            animationDelay: `${(i % 6) * -2.5}s`,
            transform: `scale(${0.6 + (i % 4) * 0.18})`,
            opacity: 0.35 + (i % 3) * 0.15,
          }}
        />
      ))}
    </div>
  );
}

/** Reveal wrapper — fades + rises in, staggered by `d` seconds. */
function R({
  d = 0,
  pop = false,
  className = "",
  children,
  style,
}: {
  d?: number;
  pop?: boolean;
  className?: string;
  children: ReactNode;
  style?: CSSProperties;
}) {
  return (
    <div
      className={`${pop ? "wi-rvp" : "wi-rv"} ${className}`}
      style={{ animationDelay: `${d}s`, ...style }}
    >
      {children}
    </div>
  );
}

interface SceneProps {
  onNext: () => void;
}

/* ─────────────────────────── SCREEN 1 ─────────────────────────── */
function SceneWelcome({ onNext }: SceneProps) {
  const words = "Your space to grow, glow and bloom every day.".split(" ");
  return (
    <>
      <R d={0.1}>
        <div className="leading-none">
          <span className="font-script text-4xl text-white drop-shadow-[0_3px_14px_rgba(190,24,93,0.45)]">
            Bloomzein <span className="text-3xl">✿</span>
          </span>
          <div className="wi-hand text-white/95 text-lg -mt-1 drop-shadow-[0_2px_8px_rgba(190,24,93,0.4)]">
            stay soft, bloom on.
          </div>
        </div>
      </R>

      <div className="mt-4">
        <R d={0.5}>
          <div className="wi-s1-welcome text-white text-3xl font-bold leading-none drop-shadow-[0_3px_16px_rgba(190,24,93,0.5)]">
            Welcome to
          </div>
          <div className="wi-s1-script font-script text-white text-5xl leading-[0.9] mt-1 drop-shadow-[0_3px_16px_rgba(190,24,93,0.5)]">
            Bloomzein ♡
          </div>
        </R>
        <p className="wi-s1-tag mt-2 max-w-[76%] text-white text-base font-semibold leading-snug drop-shadow-[0_2px_10px_rgba(190,24,93,0.45)]">
          {words.map((w, i) => (
            <span
              key={i}
              className="wi-word inline-block"
              style={{ animationDelay: `${1.1 + i * 0.12}s`, marginRight: "0.28em" }}
            >
              {w}
            </span>
          ))}
        </p>
      </div>

      <div className="flex-1 wi-spacer" />

      <R d={2.4}>
        <div className="wi-note">
          <span className="wi-note-ic">
            <Sparkles className="h-5 w-5" />
          </span>
          <p>All the tools you need to take care of yourself and live your best life. ♡</p>
        </div>
      </R>
      <R d={2.8}>
        <button onClick={onNext} className="wi-cta">
          Discover Bloomzein <ArrowRight className="h-5 w-5" />
        </button>
      </R>
    </>
  );
}

/* ─────────────────────────── SCREEN 2 ─────────────────────────── */
function Card({
  d,
  icon,
  label,
  children,
  wide,
}: {
  d: number;
  icon: ReactNode;
  label: string;
  children?: ReactNode;
  wide?: boolean;
}) {
  return (
    <R d={d} pop className={wide ? "col-span-2" : ""}>
      <div className="wi-card">
        <div className="wi-card-lbl">
          {icon}
          {label}
        </div>
        {children}
      </div>
    </R>
  );
}

function SceneConnected({ onNext }: SceneProps) {
  return (
    <>
      <R d={0.1}>
        <h2 className="text-center text-[#DB2777] font-bold text-2xl leading-tight drop-shadow-[0_2px_10px_rgba(255,255,255,0.5)]">
          Everything you need,
          <span className="block font-script text-[#E60076] text-4xl">
            beautifully connected. ♡
          </span>
        </h2>
      </R>
      <R d={0.4}>
        <p className="text-center text-[#831843] font-semibold text-sm mt-1">
          One app for your body, mind and life.
        </p>
      </R>

      <div className="grid grid-cols-2 gap-2 mt-3">
        <Card d={0.6} icon={<CalendarHeart className="h-4 w-4" />} label="Cycle & Mood">
          <p className="wi-mut">Day 14 · feeling radiant</p>
        </Card>
        <Card d={0.72} icon={<Flower2 className="h-4 w-4" />} label="Workouts & Yoga">
          <p className="wi-mut">Morning flow · 15 min</p>
        </Card>
        <Card d={0.84} icon={<Flame className="h-4 w-4" />} label="Nutrition">
          <p className="wi-big">
            <CountUp to={1540} /> <small>kcal left</small>
          </p>
        </Card>
        <Card d={0.96} icon={<Target className="h-4 w-4" />} label="Target Weight">
          <p className="wi-big">
            <CountUp to={52} decimals={1} /> <small>kg · goal 50</small>
          </p>
          <svg className="wi-spark" viewBox="0 0 90 22" preserveAspectRatio="none">
            <path d="M2 6 L20 9 L38 8 L56 13 L74 16 L88 19" />
          </svg>
        </Card>
        <Card d={1.08} icon={<UtensilsCrossed className="h-4 w-4" />} label="Meals Plan">
          <p className="wi-mut">Buddha bowl · for your phase</p>
        </Card>
        <Card d={1.2} icon={<Wallet className="h-4 w-4" />} label="Budget Planner">
          <p className="wi-mut">On track this month</p>
        </Card>
        <Card d={1.32} icon={<BookHeart className="h-4 w-4" />} label="Journaling">
          <p className="wi-mut">Grateful for my journey</p>
        </Card>
        <Card d={1.44} icon={<Bell className="h-4 w-4" />} label="Reminders">
          <p className="wi-mut">Anniversary in 3 days</p>
        </Card>
        <Card d={1.56} icon={<CheckCircle2 className="h-4 w-4" />} label="Habits">
          <div className="wi-habits">
            {[1, 1, 1, 0, 0].map((on, i) => (
              <b key={i} className={on ? "on" : ""}>
                {on ? <CheckCircle2 className="h-3 w-3" /> : null}
              </b>
            ))}
          </div>
        </Card>
        <Card d={1.68} icon={<Droplet className="h-4 w-4" />} label="Water Tracker">
          <div className="wi-water">
            {[1, 1, 1, 1, 1, 1, 0, 0].map((f, i) => (
              <i
                key={i}
                className={f ? "f" : ""}
                style={{ animationDelay: `${1.9 + i * 0.06}s` }}
              />
            ))}
          </div>
          <p className="wi-mut mt-1">6 / 8 cups</p>
        </Card>
      </div>

      <R d={1.9}>
        <p className="text-center font-script text-[#DB2777] text-2xl mt-2">
          All in one place. Just for you.
        </p>
      </R>
      <div className="flex-1 wi-spacer" />
      <R d={2.1}>
        <button onClick={onNext} className="wi-cta">
          Show me more <ArrowRight className="h-5 w-5" />
        </button>
      </R>
    </>
  );
}

/* ─────────────────────────── SCREEN 3 ─────────────────────────── */
function SceneJourney() {
  return (
    <>
      <R d={0.1}>
        <h2 className="text-center text-[#DB2777] font-bold text-[22px] leading-tight drop-shadow-[0_2px_8px_rgba(255,255,255,0.5)]">
          Your journey. Your rhythm.{" "}
          <span className="font-script text-[#E60076] text-[30px]">Your Bloom.</span>
        </h2>
      </R>
      <R d={0.35}>
        <p className="text-center text-[#831843] font-semibold text-[13px] leading-snug mt-1">
          Bloomzein adapts to you — beautiful habits for a happier, balanced life.
        </p>
      </R>

      <R d={0.6} pop>
        <div className="wi-hello">
          <span className="wi-ava" />
          <span className="text-[#831843] font-bold text-[15px] leading-tight">
            Good morning,
            <br />
            <span className="font-script text-[#DB2777] text-xl">beautiful ✿</span>
          </span>
          <span className="wi-streak">
            <b>7</b> streak
          </span>
        </div>
      </R>

      <R d={0.78} pop>
        <div className="wi-glance">
          <div className="wi-glance-t">Today at a glance</div>
          <div className="flex items-center gap-2 mt-1">
            <span className="wi-phasepill">Ovulation phase</span>
            <span className="text-[#831843] font-bold text-[15px]">Day 14</span>
          </div>
          <p className="text-[#9D5C7E] font-semibold text-xs mt-1">
            High-energy day — make it count ♡
          </p>
        </div>
      </R>

      <div className="flex flex-col gap-2 mt-2">
        <R d={0.94} pop>
          <div className="wi-prow">
            <span className="wi-pic">
              <Flower2 className="h-4 w-4" />
            </span>
            <span>
              <span className="wi-prow-x">Morning Yoga</span>
              <br />
              <span className="wi-prow-y">15 min · gentle flow</span>
            </span>
          </div>
        </R>
        <R d={1.06} pop>
          <div className="wi-prow">
            <span className="wi-pic">
              <UtensilsCrossed className="h-4 w-4" />
            </span>
            <span>
              <span className="wi-prow-x">Cycle Nutrition</span>
              <br />
              <span className="wi-prow-y">Eat for your phase</span>
            </span>
          </div>
        </R>
      </div>

      <div className="grid grid-cols-2 gap-2 mt-2">
        <R d={1.2} pop>
          <div className="wi-mini">
            <div>
              <div className="wi-mini-k">Water</div>
              <div className="wi-mini-v">
                <CountUp to={6} dur={900} /> / 8
              </div>
            </div>
          </div>
        </R>
        <R d={1.3} pop>
          <div className="wi-mini">
            <div>
              <div className="wi-mini-k">Steps</div>
              <div className="wi-mini-v">
                <CountUp to={8245} dur={1300} />
              </div>
            </div>
          </div>
        </R>
      </div>

      <R d={1.5}>
        <div className="wi-nav5">
          {[
            { i: <Flower2 className="h-4 w-4" />, l: "Mind" },
            { i: <Dumbbell className="h-4 w-4" />, l: "Body" },
            { i: <UtensilsCrossed className="h-4 w-4" />, l: "Nourish" },
            { i: <CalendarHeart className="h-4 w-4" />, l: "Life" },
            { i: <Heart className="h-4 w-4" />, l: "Love" },
          ].map((n) => (
            <div key={n.l}>
              <span>{n.i}</span>
              {n.l}
            </div>
          ))}
        </div>
      </R>

      <div className="flex-1 wi-spacer" />

      <R d={1.7} pop>
        <div className="wi-note">
          <span className="wi-note-ic">
            <Sparkles className="h-5 w-5" />
          </span>
          <p>You are in control. We're here to support your bloom, every step. ♡</p>
        </div>
      </R>
      <R d={1.95}>
        <a
          href={NEXT_PAGE}
          onClick={() => {
            markSeen();
            trackEvent("intro_complete", {});
          }}
          className="wi-cta"
        >
          Start my Bloomzein journey <ArrowRight className="h-5 w-5" />
        </a>
      </R>
    </>
  );
}

function markSeen() {
  try {
    localStorage.setItem("bloom:intro-seen", "1");
  } catch {
    /* ignore */
  }
}

const SCREENS = [
  {
    key: "welcome",
    video: "/videos/intro-welcome.mp4",
    poster: "/videos/intro-welcome.webp",
    pos: "50% 50%",
  },
  {
    key: "connected",
    video: "/videos/intro-connected.mp4",
    poster: "/videos/intro-connected.webp",
    pos: "50% 40%",
  },
  {
    key: "journey",
    video: "/videos/intro-journey.mp4",
    poster: "/videos/intro-journey.webp",
    pos: "60% 45%",
  },
];

export default function WelcomeIntro() {
  const [i, setI] = useState(0);
  const touchX = useRef<number | null>(null);
  const go = useCallback(
    (n: number) => setI((p) => Math.max(0, Math.min(SCREENS.length - 1, n))),
    [],
  );
  const next = useCallback(() => {
    if (i < SCREENS.length - 1) {
      go(i + 1);
      trackEvent("intro_next", { to: i + 1 });
    }
  }, [i, go]);

  useEffect(() => {
    trackEvent("intro_view", {});
  }, []);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") next();
      if (e.key === "ArrowLeft") go(i - 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [i, next, go]);

  const s = SCREENS[i];

  return (
    <div
      className="wi-root"
      onTouchStart={(e) => {
        touchX.current = e.touches[0].clientX;
      }}
      onTouchEnd={(e) => {
        if (touchX.current === null) return;
        const dx = e.changedTouches[0].clientX - touchX.current;
        if (Math.abs(dx) > 45) {
          if (dx < 0) next();
          else go(i - 1);
        }
        touchX.current = null;
      }}
    >
      <IntroStyles />

      {/* background video (re-mounts per scene → auto restarts + entrance fade) */}
      <div className="wi-bg" key={s.key}>
        <video
          className="wi-video wi-fade"
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          poster={s.poster}
          style={{ objectPosition: s.pos }}
          disablePictureInPicture
        >
          <source src={s.video} type="video/mp4" />
        </video>
        <div className="wi-scrim" />
        <div className="wi-gloss" />
        <div className="wi-vignette" />
        <Petals />
      </div>

      {/* top bar: back + progress + skip */}
      <div className="wi-top">
        {i > 0 ? (
          <button className="wi-icobtn" onClick={() => go(i - 1)} aria-label="Back">
            <ChevronLeft className="h-5 w-5" />
          </button>
        ) : (
          <span className="w-9" />
        )}
        <div className="wi-dots">
          {SCREENS.map((_, k) => (
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
          Skip <X className="h-3.5 w-3.5" />
        </a>
      </div>

      {/* content column (re-keyed so reveals replay on each scene) */}
      <div className="wi-content" key={`c-${s.key}`}>
        {i === 0 && <SceneWelcome onNext={next} />}
        {i === 1 && <SceneConnected onNext={next} />}
        {i === 2 && <SceneJourney />}
      </div>
    </div>
  );
}

/* Scoped styles — prefixed `wi-` so nothing collides with the app shell. */
function IntroStyles() {
  return (
    <style>{`
    .wi-hand{font-family:"Satisfy","Caveat",cursive}
    .wi-root{position:fixed;inset:0;z-index:60;overflow:hidden;background:#F7BBD6;
      display:flex;flex-direction:column;height:100dvh;font-family:var(--font-sans,"Quicksand",sans-serif)}
    .wi-bg{position:absolute;inset:0}
    .wi-video{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
    .wi-scrim{position:absolute;inset:0;background:
      linear-gradient(180deg,rgba(255,255,255,.28),transparent 20%,transparent 55%,rgba(131,24,67,.42))}
    .wi-gloss{position:absolute;inset:0;pointer-events:none;background:
      radial-gradient(60% 40% at 80% 8%,rgba(255,255,255,.5),transparent 60%)}
    .wi-vignette{position:absolute;inset:0;pointer-events:none;
      background:radial-gradient(120% 90% at 50% 40%,transparent 55%,rgba(131,24,67,.3))}

    .wi-top{position:relative;z-index:3;display:flex;align-items:center;justify-content:space-between;
      padding:max(14px,env(safe-area-inset-top)) 16px 4px}
    .wi-icobtn{display:grid;place-items:center;width:36px;height:36px;border-radius:999px;border:none;cursor:pointer;
      color:#fff;background:rgba(255,255,255,.22);backdrop-filter:blur(6px)}
    .wi-dots{display:flex;gap:6px}
    .wi-dots i{width:22px;height:5px;border-radius:99px;background:rgba(255,255,255,.5);transition:.4s}
    .wi-dots i.on{width:30px;background:#fff}
    .wi-skip{display:inline-flex;align-items:center;gap:4px;color:#fff;font-weight:700;font-size:12px;
      background:rgba(255,255,255,.22);backdrop-filter:blur(6px);padding:7px 12px;border-radius:999px;text-decoration:none}

    .wi-content{position:relative;z-index:3;flex:1;min-height:0;display:flex;flex-direction:column;
      width:100%;max-width:460px;margin:0 auto;padding:18px 22px max(22px,env(safe-area-inset-bottom));
      overflow-y:auto;overscroll-behavior:contain;scrollbar-width:none}
    .wi-content::-webkit-scrollbar{display:none}

    /* reveals */
    .wi-rv{opacity:0;transform:translateY(16px);filter:blur(4px);animation:wi-rv .8s cubic-bezier(.2,.75,.2,1) forwards}
    @keyframes wi-rv{to{opacity:1;transform:none;filter:blur(0)}}
    .wi-rvp{opacity:0;transform:scale(.86);animation:wi-rvp .8s cubic-bezier(.2,.9,.25,1.12) forwards}
    @keyframes wi-rvp{to{opacity:1;transform:none}}
    .wi-word{opacity:0;transform:translateY(10px);animation:wi-word .55s cubic-bezier(.2,.7,.2,1) forwards}
    @keyframes wi-word{to{opacity:1;transform:none}}
    .wi-fade{animation:wi-vfade 1s ease forwards}
    @keyframes wi-vfade{from{opacity:.2}to{opacity:1}}

    /* glass note + CTA */
    .wi-note{display:flex;align-items:center;gap:12px;padding:14px 16px;border-radius:22px;color:#831843;
      background:rgba(255,255,255,.62);backdrop-filter:blur(12px);border:1px solid rgba(255,255,255,.75);
      box-shadow:0 12px 30px -14px rgba(190,24,93,.5)}
    .wi-note p{margin:0;font-weight:600;font-size:13.5px;line-height:1.3}
    .wi-note-ic{flex:0 0 auto;width:42px;height:42px;border-radius:50%;display:grid;place-items:center;color:#fff;
      background:linear-gradient(180deg,#F472B6,#DB2777);box-shadow:0 8px 18px -6px rgba(219,39,119,.7)}
    .wi-cta{margin-top:12px;display:flex;align-items:center;justify-content:center;gap:10px;width:100%;
      padding:16px;border-radius:999px;border:none;cursor:pointer;color:#fff;font-weight:700;font-size:16.5px;
      text-decoration:none;background:linear-gradient(180deg,#F472B6,#DB2777);
      box-shadow:0 16px 36px -10px rgba(219,39,119,.75);animation:wi-pulse 2s ease-in-out infinite}
    .wi-cta:active{transform:scale(.97)}
    @keyframes wi-pulse{0%,100%{transform:scale(1);box-shadow:0 16px 36px -12px rgba(219,39,119,.6)}
      50%{transform:scale(1.03);box-shadow:0 20px 46px -8px rgba(219,39,119,.85)}}

    /* cards (screen 2) */
    .wi-card{padding:11px 12px;border-radius:18px;background:rgba(255,255,255,.62);backdrop-filter:blur(10px);
      border:1px solid rgba(255,255,255,.75);box-shadow:0 10px 24px -14px rgba(190,24,93,.5);height:100%}
    .wi-card-lbl{display:flex;align-items:center;gap:7px;font-weight:700;font-size:12px;color:#DB2777}
    .wi-big{font-weight:700;font-size:20px;color:#831843;font-variant-numeric:tabular-nums;margin-top:4px}
    .wi-big small{font-size:11px;font-weight:600;color:#9D5C7E}
    .wi-mut{font-size:10.5px;color:#9D5C7E;font-weight:600;margin-top:5px}
    .wi-habits{display:flex;gap:6px;margin-top:6px}
    .wi-habits b{width:20px;height:20px;border-radius:7px;background:rgba(236,72,153,.16);display:grid;place-items:center;color:#fff}
    .wi-habits b.on{background:linear-gradient(180deg,#F472B6,#DB2777)}
    .wi-water{display:flex;align-items:flex-end;gap:3px;margin-top:6px;height:22px}
    .wi-water i{flex:1;border-radius:4px;background:rgba(236,72,153,.18);height:100%;position:relative;overflow:hidden}
    .wi-water i.f::after{content:"";position:absolute;inset:0;transform:scaleY(0);transform-origin:bottom;
      background:linear-gradient(180deg,#7ED0F0,#4FB3E0);animation:wi-fill .7s ease forwards}
    @keyframes wi-fill{to{transform:scaleY(1)}}
    .wi-spark{margin-top:4px;height:22px;width:100%;display:block}
    .wi-spark path{fill:none;stroke:#DB2777;stroke-width:2.4;stroke-linecap:round;
      stroke-dasharray:120;stroke-dashoffset:120;animation:wi-draw 1.2s .3s ease forwards}
    @keyframes wi-draw{to{stroke-dashoffset:0}}

    /* dashboard (screen 3) */
    .wi-hello{display:flex;align-items:center;gap:10px;padding:11px 13px;border-radius:18px;margin-top:10px;
      background:rgba(255,255,255,.62);backdrop-filter:blur(10px);border:1px solid rgba(255,255,255,.75);
      box-shadow:0 10px 24px -14px rgba(190,24,93,.5)}
    .wi-ava{width:40px;height:40px;border-radius:50%;flex:0 0 auto;
      background:radial-gradient(circle at 40% 35%,#fff,#F472B6 60%,#DB2777);box-shadow:0 4px 12px -4px rgba(219,39,119,.6)}
    .wi-streak{margin-left:auto;display:flex;align-items:center;gap:5px;font-weight:700;font-size:12px;color:#DB2777;
      padding:5px 9px;border-radius:99px;background:rgba(255,255,255,.6)}
    .wi-streak b{width:20px;height:20px;border-radius:50%;color:#fff;display:grid;place-items:center;font-size:11px;
      background:linear-gradient(180deg,#FFC98F,#FF8AB0)}
    .wi-glance{padding:12px 14px;border-radius:18px;margin-top:10px;background:rgba(255,255,255,.62);
      backdrop-filter:blur(10px);border:1px solid rgba(255,255,255,.75);box-shadow:0 10px 24px -14px rgba(190,24,93,.5)}
    .wi-glance-t{font-weight:700;font-size:11px;letter-spacing:.04em;color:#9D5C7E;text-transform:uppercase}
    .wi-phasepill{font-weight:700;font-size:13px;color:#fff;padding:5px 11px;border-radius:99px;
      background:linear-gradient(180deg,#F472B6,#DB2777)}
    .wi-prow{display:flex;align-items:center;gap:10px;padding:9px 12px;border-radius:15px;
      background:rgba(255,255,255,.55);border:1px solid rgba(255,255,255,.75)}
    .wi-pic{width:30px;height:30px;border-radius:10px;flex:0 0 auto;display:grid;place-items:center;color:#fff;
      background:linear-gradient(180deg,#FBCFE8,#F472B6)}
    .wi-prow-x{font-weight:700;font-size:13px;color:#831843}
    .wi-prow-y{font-size:11px;color:#9D5C7E;font-weight:600}
    .wi-mini{padding:10px 12px;border-radius:15px;background:rgba(255,255,255,.55);border:1px solid rgba(255,255,255,.75)}
    .wi-mini-k{font-size:10.5px;color:#9D5C7E;font-weight:700}
    .wi-mini-v{font-weight:700;font-size:15px;color:#831843;font-variant-numeric:tabular-nums}
    .wi-nav5{display:flex;justify-content:space-between;gap:2px;padding:9px 6px;border-radius:18px;margin-top:10px;
      background:rgba(255,255,255,.62);backdrop-filter:blur(10px);border:1px solid rgba(255,255,255,.75)}
    .wi-nav5 div{flex:1;display:flex;flex-direction:column;align-items:center;gap:3px;font-size:9.5px;font-weight:700;color:#DB2777}
    .wi-nav5 span{width:30px;height:30px;border-radius:50%;display:grid;place-items:center;color:#DB2777;
      background:linear-gradient(180deg,rgba(255,255,255,.7),rgba(251,207,232,.7))}

    /* petals */
    .wi-petals{position:absolute;inset:0;pointer-events:none;overflow:hidden}
    .wi-petal{position:absolute;top:110%;width:12px;height:16px;border-radius:50% 50% 50% 50%/60% 60% 40% 40%;
      background:linear-gradient(180deg,rgba(255,255,255,.9),rgba(251,207,232,.85));
      animation:wi-drift linear infinite}
    @keyframes wi-drift{
      0%{transform:translateY(0) rotate(0);opacity:0}
      10%{opacity:1}
      90%{opacity:1}
      100%{transform:translateY(-120vh) translateX(30px) rotate(240deg);opacity:0}}

    /* desktop / tablet: keep the readable column, let video fill */
    @media (min-width:640px){
      .wi-content{padding-top:26px;padding-bottom:30px}
    }
    @media (min-width:1024px){
      .wi-content{max-width:520px}
    }
    /* short screens: tighten screen 1 so the CTA stays in view without scrolling */
    @media (max-height:720px){
      .wi-content{padding-top:12px}
      .wi-spacer{flex:0 0 10px}
      .wi-s1-welcome{font-size:1.6rem}
      .wi-s1-script{font-size:2.5rem}
      .wi-s1-tag{font-size:.9rem}
      .wi-note{padding:11px 14px}
      .wi-note p{font-size:12.5px}
      .wi-cta{padding:13px;font-size:15px;margin-top:10px}
    }
    @media (prefers-reduced-motion:reduce){
      .wi-rv,.wi-rvp,.wi-word,.wi-fade{animation-duration:.001s}
      .wi-petal{display:none}
      .wi-cta{animation:none}
    }
    `}</style>
  );
}
