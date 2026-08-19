import {
  ArrowRight, Download, Instagram, Youtube, Facebook, Mail, X, Heart, Sparkles,
  Flower2, Dumbbell, Utensils, Salad, CalendarHeart, BookHeart, NotebookPen,
  Wallet, MessageCircleHeart, BookOpen, Sun, HeartPulse, ChevronDown,
  type LucideIcon,
} from "lucide-react";
import { BloomLogo } from "@/components/bloom/BloomLogo";
import { triggerPWAInstall, waitForPWAPrompt, isIOS } from "@/lib/pwa";
import { trackEvent } from "@/lib/analytics";
import { useEffect, useRef, useState, type ReactNode } from "react";

const START = "/app/today";

/* Brand glyphs lucide no longer ships. */
function TikTokIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M16.6 5.82a4.28 4.28 0 0 1-1.05-2.82h-3.2v12.86a2.58 2.58 0 0 1-2.58 2.5 2.58 2.58 0 0 1-2.58-2.58 2.58 2.58 0 0 1 3.4-2.44V7.66a5.86 5.86 0 0 0-.82-.06A5.79 5.79 0 0 0 4 13.39 5.79 5.79 0 0 0 9.79 19.2a5.79 5.79 0 0 0 5.79-5.81V8.4a7.44 7.44 0 0 0 4.42 1.43V6.63a4.28 4.28 0 0 1-3.4-.81z" />
    </svg>
  );
}
function PinterestIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M12 2C6.48 2 2 6.48 2 12c0 4.24 2.64 7.86 6.36 9.31-.09-.79-.17-2 .04-2.86.18-.78 1.17-4.97 1.17-4.97s-.3-.6-.3-1.48c0-1.39.81-2.43 1.81-2.43.85 0 1.27.64 1.27 1.41 0 .86-.55 2.14-.83 3.33-.24.99.5 1.8 1.48 1.8 1.77 0 3.13-1.87 3.13-4.57 0-2.39-1.72-4.06-4.17-4.06-2.84 0-4.51 2.13-4.51 4.33 0 .86.33 1.78.74 2.28.08.1.09.19.07.29-.08.32-.25 1-.28 1.14-.04.18-.15.22-.34.13-1.25-.58-2.03-2.4-2.03-3.87 0-3.15 2.29-6.04 6.6-6.04 3.46 0 6.15 2.47 6.15 5.77 0 3.44-2.17 6.21-5.18 6.21-1.01 0-1.97-.53-2.29-1.15l-.62 2.37c-.23.86-.83 1.94-1.24 2.6.94.29 1.92.44 2.95.44 5.52 0 10-4.48 10-10S17.52 2 12 2z" />
    </svg>
  );
}

/** Word-by-word float-up (mirrors the welcome screen). */
function Words({ text, className = "", delay = 0, stagger = 90 }: { text: string; className?: string; delay?: number; stagger?: number }) {
  return (
    <span className={className}>
      {text.split(" ").map((w, i) => (
        <span key={i} className="bzl-word" style={{ animationDelay: `${delay + i * stagger}ms` }}>
          {w}{i < text.split(" ").length - 1 ? " " : ""}
        </span>
      ))}
    </span>
  );
}

/** Reveal on scroll — fade + rise the first time it enters view. */
function Reveal({ children, delay = 0, className = "" }: { children: ReactNode; delay?: number; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setShown(true); io.disconnect(); } }, { threshold: 0.15 });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <div ref={ref} className={className} style={{
      opacity: shown ? 1 : 0,
      transform: shown ? "none" : "translateY(30px)",
      transition: "opacity .8s ease, transform .8s cubic-bezier(.16,.84,.34,1)",
      transitionDelay: `${delay}ms`,
    }}>{children}</div>
  );
}

/* ───────── flagship features (big alternating rows) ───────── */
type Feat = { icon: LucideIcon; kicker: string; title: string; body: string; img: string; href: string };
const FLAGSHIP: Feat[] = [
  { icon: HeartPulse, kicker: "Cycle sync", title: "Know your body like never before.", body: "Track your cycle once and watch every tool adapt to your phase — automatically. Your energy, cravings and mood, finally decoded.", img: "/images/cycle-insight-hero.webp", href: "/app/tools/cycle" },
  { icon: Flower2, kicker: "Yoga studio", title: "Flows that meet you where you are.", body: "Cycle-aware yoga, guided and beautiful — from 5-minute resets to full classes that soften cramps or wake up your glow.", img: "/images/pose-childs-pose.webp", href: "/app/tools/yoga" },
  { icon: Dumbbell, kicker: "Workouts", title: "Move with your energy, not against it.", body: "Strength, HIIT and mobility that rise when you're powerful and rest when you're not — perfectly matched to your phase.", img: "/images/pose-boat.webp", href: "/app/tools/workout" },
  { icon: Utensils, kicker: "Meals & recipes", title: "Eat exactly what your body's asking for.", body: "Phase-smart recipes and a weekly meal plan that writes itself — nourishing, gorgeous, and effortless.", img: "/images/meals-hero-new.webp", href: "/app/tools/meals" },
];

/* ───────── the rest (illustrated grid) ───────── */
const GRID: Feat[] = [
  { icon: Sun, kicker: "Today", title: "Your day, already planned.", body: "One calm home screen that pulls it all together each morning.", img: "/images/page-bg-today-morning.webp", href: START },
  { icon: CalendarHeart, kicker: "Calendar", title: "Your whole month, at a glance.", body: "Every phase, symptom and plan on one gorgeous calendar.", img: "/images/calendar-hero.webp", href: "/app/calendar" },
  { icon: Salad, kicker: "Diet & nutrition", title: "Your numbers, finally making sense.", body: "Calorie & macro targets that flex with your training and phase.", img: "/images/goal-path-bloom.webp", href: "/app/tools/diet" },
  { icon: BookHeart, kicker: "Dreamy diary", title: "A soft place for every feeling.", body: "Journal your mood and let gentle patterns reveal themselves.", img: "/images/diary-hero.webp", href: "/app/tools/diary" },
  { icon: NotebookPen, kicker: "Notes & reminders", title: "Never drop a thing.", body: "Gentle nudges for water, meds, movement and me-time.", img: "/images/notes-hero.webp", href: "/app/tools/notes" },
  { icon: Wallet, kicker: "Budget", title: "Glow without the money stress.", body: "A calm, cute budget that keeps your self-care sustainable.", img: "/images/budget-hero.webp", href: "/budget" },
  { icon: MessageCircleHeart, kicker: "Bloom coach", title: "A wise friend in your pocket.", body: "Personalized guidance that connects every tool for you.", img: "/images/coach-bloom-hero.webp", href: "/app/today" },
  { icon: BookOpen, kicker: "Read", title: "Wellness wisdom, beautifully written.", body: "A magazine of cycle, beauty, sleep & mind reads.", img: "/images/read-CY001.webp", href: "/app/read" },
];

export default function Landing() {
  const [installing, setInstalling] = useState(false);
  const [iosHint, setIosHint] = useState(false);
  const [showBar, setShowBar] = useState(false);

  useEffect(() => {
    if (!iosHint) return;
    const t = setTimeout(() => setIosHint(false), 5000);
    return () => clearTimeout(t);
  }, [iosHint]);

  // Floating mobile CTA appears once the hero scrolls away.
  useEffect(() => {
    const onScroll = () => setShowBar(window.scrollY > window.innerHeight * 0.85);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const handleDownload = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (isIOS()) { setIosHint(true); return; }
    setInstalling(true);
    const ready = await waitForPWAPrompt(6000);
    if (ready) await triggerPWAInstall();
    setInstalling(false);
  };

  return (
    <div className="bzl">
      <style>{`
        .bzl{
          --hot:#E6007E; --pink:#EC4899; --deep:#DB2777; --plum:#6B1238;
          --ink:#7A1440; --muted:#A2657F; --petal:#F9A8D4;
          --serif:"Playfair Display",Georgia,serif;
          --script:"Dancing Script","Caveat",cursive;
          --sans:"Quicksand",system-ui,sans-serif;
          font-family:var(--sans); color:var(--ink);
          background:radial-gradient(120% 60% at 50% 0%,#FFFDFC 0%,#FFF1F7 40%,#FDE7F2 72%,#FBD3E6 100%);
          min-height:100vh; overflow-x:hidden;
        }
        .bzl-serif{font-family:var(--serif);font-weight:700;color:var(--plum)}
        .bzl-script{font-family:var(--script);font-weight:700;color:var(--hot);line-height:.96}
        .bzl-kicker{font-weight:800;letter-spacing:.18em;text-transform:uppercase;color:var(--hot)}
        .bzl-word{display:inline-block;opacity:0;transform:translateY(14px);
          animation:bzl-word .7s cubic-bezier(.16,.7,.2,1) forwards}
        @keyframes bzl-word{to{opacity:1;transform:none}}
        .bzl-fade{opacity:0;animation:bzl-fade .8s ease forwards}
        @keyframes bzl-fade{to{opacity:1}}
        /* living CTA — copied from the welcome screen */
        .bzl-cta{position:relative;display:inline-flex;align-items:center;gap:12px;border:none;cursor:pointer;
          font-family:var(--sans);font-weight:800;color:#fff;border-radius:999px;
          background:linear-gradient(180deg,#FF57AC 0%,#EC0F86 52%,#D30D78 100%);
          box-shadow:0 0 0 2px rgba(255,255,255,.55),0 0 0 4px rgba(233,30,132,.22),
            0 20px 42px -16px rgba(219,39,119,.85),inset 0 1px 0 rgba(255,255,255,.5);
          animation:bzl-glow 3s ease-in-out infinite;transition:transform .2s}
        @keyframes bzl-glow{
          0%,100%{box-shadow:0 0 0 2px rgba(255,255,255,.55),0 0 0 4px rgba(233,30,132,.2),0 18px 40px -16px rgba(219,39,119,.8),inset 0 1px 0 rgba(255,255,255,.5)}
          50%{box-shadow:0 0 0 2px rgba(255,255,255,.7),0 0 0 7px rgba(233,30,132,.14),0 26px 60px -14px rgba(233,30,132,.95),inset 0 1px 0 rgba(255,255,255,.6)}}
        .bzl-cta:hover{transform:translateY(-1px) scale(1.02)} .bzl-cta:active{transform:scale(.96)}
        .bzl-sheen{position:relative;display:inline-block;overflow:hidden;padding:.06em .12em .28em;margin:-.06em -.12em -.28em}
        .bzl-sheen::after{content:"";position:absolute;inset:0;pointer-events:none;mix-blend-mode:overlay;
          background:linear-gradient(105deg,transparent 34%,rgba(255,255,255,.85) 50%,transparent 66%);
          transform:translateX(-120%);animation:bzl-sweep 1.6s ease-in-out 1.1s 1 forwards}
        @keyframes bzl-sweep{to{transform:translateX(120%)}}
        .bzl-float{animation:bzl-float 6s ease-in-out infinite}
        @keyframes bzl-float{0%,100%{transform:translateY(0)}50%{transform:translateY(-10px)}}
      `}</style>

      {/* ═════════════ HERO ═════════════ */}
      <section className="relative flex min-h-[100svh] flex-col overflow-hidden">
        <video className="absolute inset-0 h-full w-full object-cover" autoPlay muted loop playsInline preload="auto" poster="/images/landing-hero.webp" aria-hidden>
          <source src="/videos/entry-1.mp4" type="video/mp4" />
        </video>
        {/* welcome-style scrim: soft on the left/bottom so text is legible + the woman shows through */}
        <div className="absolute inset-0" aria-hidden style={{ background:
          "linear-gradient(90deg,rgba(255,245,250,.92) 0%,rgba(255,245,250,.7) 26%,rgba(255,245,250,.2) 50%,rgba(255,245,250,0) 66%),linear-gradient(180deg,rgba(255,247,241,.4) 0%,rgba(255,240,246,0) 30%,rgba(255,240,246,0) 66%,rgba(107,18,56,.5) 100%)" }} />

        <header className="relative z-20 mx-auto flex w-full max-w-6xl items-center justify-between px-5 py-4 sm:px-8">
          <BloomLogo />
          <a href={START} onClick={() => trackEvent("get_started_click", { location: "header" })}
            className="hover-scale inline-flex items-center gap-1.5 rounded-full border-2 px-4 py-1.5 text-sm font-bold transition"
            style={{ borderColor: "var(--hot)", color: "var(--hot)" }}>
            Start Blooming <ArrowRight className="h-3.5 w-3.5" />
          </a>
        </header>

        <div className="relative z-10 mx-auto flex w-full max-w-6xl flex-1 flex-col justify-center px-6 pb-20 sm:px-8">
          <div className="max-w-[38rem]">
            <p className="bzl-kicker mb-3 text-[11px] sm:text-xs bzl-fade" style={{ animationDelay: "200ms" }}>
              Your cycle-synced companion 🌸
            </p>
            <h1 className="m-0 flex flex-col gap-1">
              <Words text="One app for your body, mind & cycle." className="bzl-serif text-2xl leading-tight sm:text-4xl lg:text-[2.7rem]" stagger={70} />
              <span className="bzl-sheen">
                <Words text="Welcome to your Bloom." className="bzl-script text-5xl sm:text-7xl lg:text-8xl" delay={520} stagger={110} />
              </span>
            </h1>
            <p className="bzl-fade mt-5 max-w-lg text-[15px] font-semibold leading-relaxed sm:text-lg" style={{ color: "var(--ink)", animationDelay: "1300ms" }}>
              Yoga, workouts, meals, cycle tracking, journaling & more — all synced to your
              phase, all in one breathtakingly simple place.
            </p>
            <div className="bzl-fade mt-8 flex flex-col items-start gap-3 sm:flex-row sm:items-center" style={{ animationDelay: "1500ms" }}>
              <a href={START} onClick={() => trackEvent("get_started_click", { location: "hero" })}
                className="bzl-cta px-8 py-3.5 text-base">
                Start Blooming — free <ArrowRight className="h-4 w-4" />
              </a>
              <button onClick={handleDownload} disabled={installing}
                className="hover-scale inline-flex items-center gap-2 rounded-full border-2 bg-white/60 px-6 py-3.5 text-sm font-bold backdrop-blur transition disabled:opacity-70"
                style={{ borderColor: "var(--petal)", color: "var(--hot)" }}>
                {installing ? "Preparing…" : "Get the app"} <Download className="h-4 w-4" />
              </button>
            </div>
            <p className="bzl-fade mt-4 text-xs font-semibold" style={{ color: "var(--muted)", animationDelay: "1700ms" }}>
              No credit card · Made for your body · Loved by women like you
            </p>
          </div>
        </div>
        <div className="relative z-10 pb-6 text-center">
          <ChevronDown className="mx-auto h-6 w-6 animate-bounce" style={{ color: "var(--deep)" }} />
        </div>
      </section>

      {/* ═════════════ INTRO LINE ═════════════ */}
      <section className="mx-auto max-w-3xl px-6 py-16 text-center sm:py-24">
        <Reveal>
          <p className="bzl-kicker mb-3 text-xs">Everything, connected</p>
          <h2 className="bzl-script text-4xl sm:text-6xl">Ten tools. One you.</h2>
          <p className="mx-auto mt-4 max-w-xl text-[15px] font-semibold sm:text-lg" style={{ color: "var(--ink)" }}>
            No more juggling six apps that don't talk to each other. Bloomzein reads your
            cycle once and quietly tunes <em>everything</em> — so your whole day just fits.
          </p>
        </Reveal>
      </section>

      {/* ═════════════ FLAGSHIP ROWS ═════════════ */}
      <section className="mx-auto max-w-6xl space-y-16 px-6 pb-8 sm:space-y-24 sm:px-8">
        {FLAGSHIP.map((f, i) => {
          const Icon = f.icon;
          const flip = i % 2 === 1;
          return (
            <Reveal key={f.kicker} className="grid items-center gap-8 lg:grid-cols-2 lg:gap-14">
              {/* image — never full width on desktop; capped to its column */}
              <div className={`relative ${flip ? "lg:order-2" : ""}`}>
                <div className="bzl-float overflow-hidden rounded-[2rem] border-[5px] border-white shadow-2xl" style={{ boxShadow: "0 30px 70px -30px rgba(150,30,80,.5)" }}>
                  <img src={f.img} alt={f.kicker} loading="lazy" className="aspect-[4/3] w-full object-cover" />
                </div>
                <span aria-hidden className="pointer-events-none absolute -right-5 -top-5 h-24 w-24 rounded-full" style={{ background: "radial-gradient(circle,rgba(236,72,153,.28),transparent 70%)" }} />
              </div>
              <div className={flip ? "lg:order-1" : ""}>
                <span className="mb-3 inline-flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-[11px] font-extrabold uppercase tracking-widest shadow-sm" style={{ color: "var(--hot)" }}>
                  <Icon className="h-4 w-4" /> {f.kicker}
                </span>
                <h3 className="bzl-serif text-2xl leading-snug sm:text-3xl lg:text-4xl">{f.title}</h3>
                <p className="mt-3 max-w-md text-[15px] font-medium leading-relaxed sm:text-base" style={{ color: "var(--ink)" }}>{f.body}</p>
                <a href={f.href} onClick={() => trackEvent("feature_click", { feature: f.kicker })}
                  className="mt-5 inline-flex items-center gap-2 text-sm font-bold transition hover:gap-3" style={{ color: "var(--hot)" }}>
                  Explore <ArrowRight className="h-4 w-4" />
                </a>
              </div>
            </Reveal>
          );
        })}
      </section>

      {/* ═════════════ GRID — the rest ═════════════ */}
      <section className="relative mt-16 px-6 py-16 sm:px-8 sm:py-24" style={{ background: "linear-gradient(180deg,transparent,#FDE7F2 22%,#FBD3E6 100%)" }}>
        <Reveal className="mx-auto max-w-2xl text-center">
          <p className="bzl-kicker mb-3 text-xs">And so much more</p>
          <h2 className="bzl-script text-4xl sm:text-6xl">Your whole life, in bloom.</h2>
        </Reveal>
        <div className="mx-auto mt-12 grid max-w-6xl grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-4">
          {GRID.map((f, i) => {
            const Icon = f.icon;
            return (
              <Reveal key={f.kicker} delay={(i % 4) * 80}>
                <a href={f.href} onClick={() => trackEvent("feature_click", { feature: f.kicker })}
                  className="group block h-full overflow-hidden rounded-3xl border border-white bg-white/70 shadow-lg backdrop-blur transition hover:-translate-y-1.5 hover:shadow-2xl"
                  style={{ boxShadow: "0 16px 40px -24px rgba(150,30,80,.4)" }}>
                  <div className="relative aspect-[5/4] overflow-hidden">
                    <img src={f.img} alt={f.kicker} loading="lazy" className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
                    <span className="absolute left-3 top-3 grid h-9 w-9 place-items-center rounded-full text-white shadow-md" style={{ background: "linear-gradient(180deg,#FF57AC,#D30D78)" }}>
                      <Icon className="h-4 w-4" />
                    </span>
                  </div>
                  <div className="p-4">
                    <p className="bzl-script text-2xl" style={{ color: "var(--hot)" }}>{f.kicker}</p>
                    <p className="mt-0.5 text-[12.5px] font-medium leading-snug" style={{ color: "var(--ink)" }}>{f.body}</p>
                  </div>
                </a>
              </Reveal>
            );
          })}
        </div>
      </section>

      {/* ═════════════ TRUST + CTA ═════════════ */}
      <section className="relative overflow-hidden px-6 py-24 text-center sm:px-8">
        <div className="absolute inset-0" aria-hidden style={{ background: "linear-gradient(160deg,#FF7FBE 0%,#EC0F86 55%,#C60C6E 100%)" }} />
        <span aria-hidden className="pointer-events-none absolute -left-16 top-8 h-64 w-64 rounded-full bg-white/25 blur-3xl" />
        <span aria-hidden className="pointer-events-none absolute -right-16 bottom-0 h-72 w-72 rounded-full bg-white/20 blur-3xl" />
        <Reveal className="relative z-10 mx-auto max-w-2xl">
          <div className="mb-4 flex items-center justify-center gap-1 text-white">
            {Array.from({ length: 5 }).map((_, i) => <Sparkles key={i} className="h-4 w-4 fill-white" />)}
          </div>
          <h2 className="bzl-script text-4xl text-white sm:text-6xl" style={{ color: "#fff" }}>Bloom with your cycle, not against it.</h2>
          <p className="mx-auto mt-4 max-w-md text-[15px] font-medium text-white/90">
            Join the women turning their rhythm into their superpower — one gentle, beautiful day at a time.
          </p>
          <a href={START} onClick={() => trackEvent("get_started_click", { location: "footer_cta" })}
            className="mt-8 inline-flex items-center gap-2 rounded-full bg-white px-9 py-4 text-base font-extrabold shadow-xl transition hover:scale-105 active:scale-95"
            style={{ color: "var(--hot)" }}>
            Start Blooming — free <ArrowRight className="h-4 w-4" />
          </a>
          <p className="mt-4 text-xs font-semibold text-white/80">No credit card · Cancel anytime 🌸</p>
        </Reveal>
      </section>

      {/* ═════════════ FOOTER ═════════════ */}
      <footer id="contact" className="px-6 py-12 sm:px-8" style={{ background: "#FFF5FA" }}>
        <div className="mx-auto flex max-w-5xl flex-col items-center gap-6 text-center">
          <BloomLogo />
          <p className="max-w-sm text-sm font-medium leading-relaxed" style={{ color: "var(--muted)" }}>
            Cycle tracking, nutrition, fitness &amp; self-care — designed for your body, mind &amp; life.
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            {[
              { href: "https://www.instagram.com/bloomzein/", label: "Instagram", icon: <Instagram className="h-4 w-4" />, bg: "bg-blush text-hotpink hover:bg-petal" },
              { href: "https://www.tiktok.com/@bloomzeinapp", label: "TikTok", icon: <TikTokIcon className="h-4 w-4" />, bg: "bg-hotpink text-white hover:bg-[#be185d]" },
              { href: "https://www.facebook.com/profile.php?id=61590421363110", label: "Facebook", icon: <Facebook className="h-4 w-4" />, bg: "bg-rose-100 text-hotpink hover:bg-rose-200" },
              { href: "https://pin.it/5EPJUAQPX", label: "Pinterest", icon: <PinterestIcon className="h-4 w-4" />, bg: "bg-pink-200 text-[#be185d] hover:bg-pink-300" },
              { href: "https://www.youtube.com/channel/UCbFxMiYx2rmJ_BZUjlMDN9w", label: "YouTube", icon: <Youtube className="h-4 w-4" />, bg: "bg-rose-200 text-rose-600 hover:bg-rose-300" },
              { href: "/help", label: "Contact", icon: <Mail className="h-4 w-4" />, bg: "bg-petal text-hotpink hover:bg-blush" },
            ].map(({ href, label, icon, bg }) => {
              const external = href.startsWith("http");
              return (
                <a key={label} href={href} aria-label={label} {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                  className={`grid h-9 w-9 place-items-center rounded-full transition ${bg}`}>{icon}</a>
              );
            })}
          </div>
          <nav className="flex flex-wrap justify-center gap-x-5 gap-y-2 text-xs font-bold" style={{ color: "var(--muted)" }}>
            {[
              { label: "Pricing", href: "/pricing" }, { label: "Privacy", href: "/privacy" },
              { label: "Terms", href: "/terms" }, { label: "Refunds", href: "/refund" },
              { label: "Help", href: "/help" }, { label: "FAQ", href: "/faq" },
            ].map(({ label, href }) => (
              <a key={label} href={href} className="transition hover:text-hotpink">{label}</a>
            ))}
          </nav>
          <div className="flex items-center gap-1.5 text-xs" style={{ color: "var(--muted)" }}>
            <span>© {new Date().getFullYear()} Bloomzein.</span>
            <span className="flex items-center gap-1">Made with love <Heart className="h-3 w-3 fill-hotpink text-hotpink" /></span>
          </div>
        </div>
      </footer>

      {/* Floating mobile CTA — the primary action is always one tap away */}
      <div className={`fixed inset-x-0 bottom-0 z-40 p-3 sm:hidden transition-all duration-300 ${showBar ? "translate-y-0 opacity-100" : "translate-y-full opacity-0"}`}
        style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}>
        <a href={START} onClick={() => trackEvent("get_started_click", { location: "mobile_bar" })}
          className="bzl-cta w-full justify-center px-6 py-3.5 text-base">
          Start Blooming — free <ArrowRight className="h-4 w-4" />
        </a>
      </div>

      {iosHint && (
        <div className="fixed bottom-24 left-1/2 z-50 w-[calc(100%-2rem)] max-w-xs -translate-x-1/2 animate-fade-in sm:bottom-6">
          <div className="flex items-center gap-3 rounded-2xl px-4 py-3 shadow-xl" style={{ background: "var(--plum)" }}>
            <Download className="h-4 w-4 shrink-0 text-white" />
            <p className="text-xs font-semibold leading-snug text-white">
              Sur iPhone : <span className="font-normal">Partager</span> → <span className="font-normal">Sur l'écran d'accueil</span>
            </p>
            <button onClick={() => setIosHint(false)} className="ml-auto shrink-0 text-white/70 hover:text-white" aria-label="Dismiss"><X className="h-4 w-4" /></button>
          </div>
        </div>
      )}
    </div>
  );
}
