import {
  ArrowRight, ChevronLeft, ChevronRight, Download, Heart, Instagram, Music2, Sparkles, Star, Menu, X, Lock, Flower2,
  Droplet, Wallet, Calendar as CalendarIcon, Youtube, Mail, Facebook,
  Target, Quote, Utensils, Footprints, ClipboardList, NotebookPen, Apple, Dumbbell, BookOpen, BookHeart, ShoppingBag, QrCode, type LucideIcon,
} from "lucide-react";
import { BloomLogo } from "@/components/bloom/BloomLogo";
import { KawaiiBackground } from "@/components/bloom/KawaiiBackground";
import { DreamyFallingIcons } from "@/components/bloom/DreamyFallingIcons";
import { ConnectionsDiagram } from "@/components/bloom/ConnectionsDiagram";
import { ToolboxPreview } from "@/components/bloom/ToolboxPreview";
import { triggerPWAInstall, waitForPWAPrompt, isIOS } from "@/lib/pwa";
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";

export default function Landing() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [installing, setInstalling] = useState(false);
  const [iosHint, setIosHint] = useState(false);
  const [activeUniverse, setActiveUniverse] = useState(0);
  const universeTouchX = useRef<number | null>(null);
  const universeCarouselRef = useRef<HTMLDivElement>(null);
  const [carouselHintPlayed, setCarouselHintPlayed] = useState(false);

  // Nudge the universes carousel sideways the moment it scrolls into view, hinting it's swipeable
  useEffect(() => {
    const el = universeCarouselRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setCarouselHintPlayed(true);
          observer.disconnect();
        }
      },
      { threshold: 0.5 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Auto-hide iOS hint after 5s
  useEffect(() => {
    if (!iosHint) return;
    const t = setTimeout(() => setIosHint(false), 5000);
    return () => clearTimeout(t);
  }, [iosHint]);

  const handleDownload = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (isIOS()) {
      setIosHint(true);
      return;
    }
    setInstalling(true);
    const ready = await waitForPWAPrompt(6000);
    if (ready) {
      await triggerPWAInstall();
    }
    setInstalling(false);
  };

  return (
    <div className="relative min-h-screen overflow-hidden bloom-breathe bg-gradient-to-br from-[#e0c3fc]/40 via-[#8ec5fc]/30 to-[#ffc3a0]/30">
      {/* gentle living background */}
      <KawaiiBackground />
      <DreamyFallingIcons count={12} />
      <div className="pointer-events-none absolute -left-32 top-40 -z-0 h-80 w-80 rounded-full bg-hotpink/20 blur-3xl animate-bloom-pulse" aria-hidden />
      <div className="pointer-events-none absolute -right-32 top-[60%] -z-0 h-96 w-96 rounded-full bg-rose/30 blur-3xl animate-bloom-pulse" style={{ animationDelay: "1.5s" }} aria-hidden />
      <div className="pointer-events-none absolute left-[3%] top-[14%] hidden -z-0 h-72 w-72 rounded-full bg-magenta/15 blur-3xl animate-bloom-pulse xl:block" style={{ animationDelay: "2.2s" }} aria-hidden />
      <div className="pointer-events-none absolute right-[4%] top-[46%] hidden -z-0 h-80 w-80 rounded-full bg-hotpink/15 blur-3xl animate-bloom-pulse xl:block" style={{ animationDelay: "0.7s" }} aria-hidden />

      {/* Navbar */}
      <header className="sticky top-0 z-40 border-b border-petal/60 bg-white/70 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 2xl:max-w-[96rem]">
          {/* Logo — Bloomzein only */}
          <a href="/" className="flex items-center gap-2 shrink-0">
            <BloomLogo />
            <span className="font-script text-xl text-hotpink hidden sm:block">Bloomzein</span>
          </a>
          <nav className="hidden items-center gap-5 text-sm font-semibold text-rose md:flex">
            <a href="/" className="hover:text-hotpink transition">Home</a>
            <a href="#universes" className="hover:text-hotpink transition">Features</a>
            <a href="#features" className="hover:text-hotpink transition">About</a>
            <a href="#contact" className="hover:text-hotpink transition">Contact</a>
            {/* Start Blooming CTA */}
            <a href="/app/today" className="hover-scale inline-flex items-center gap-2 rounded-full border-2 border-hotpink px-4 py-1.5 text-sm font-bold text-hotpink transition hover:bg-hotpink hover:text-white">
              Start Blooming <ArrowRight className="h-3.5 w-3.5" />
            </a>
            {/* Download App with QR popover */}
            <div className="relative group">
              <button
                onClick={handleDownload}
                disabled={installing}
                className="bloom-luxury-btn animate-cta-glow hover-scale inline-flex items-center gap-2 rounded-full px-5 py-2 text-sm font-semibold text-white transition disabled:opacity-70"
              >
                {installing ? "Préparation…" : "Download App"} <Download className="h-3.5 w-3.5" />
              </button>
              {/* QR popover on hover */}
              <div className="pointer-events-none absolute right-0 top-full mt-2 w-44 opacity-0 transition-all duration-200 group-hover:pointer-events-auto group-hover:opacity-100 group-hover:translate-y-0 translate-y-1">
                <div className="rounded-2xl border border-petal/60 bg-white/95 p-3 shadow-xl shadow-hotpink/15 text-center backdrop-blur">
                  <div className="mx-auto mb-2 grid h-28 w-28 place-items-center rounded-xl bg-blush">
                    <QrCode className="h-20 w-20 text-hotpink" strokeWidth={1.2} />
                  </div>
                  <p className="text-[10px] font-bold text-hotpink leading-snug">Scan to download<br/>Bloomzein 🌸</p>
                </div>
              </div>
            </div>
          </nav>
          <div className="flex items-center gap-2 md:hidden">
            <a href="/app/today" className="inline-flex items-center gap-1.5 rounded-full bg-hotpink px-3 py-1.5 text-xs font-bold text-white">
              Start <ArrowRight className="h-3 w-3" />
            </a>
            <button
              id="landing-menu-toggle"
              onClick={() => setMobileMenuOpen(true)}
              className="grid h-9 w-9 place-items-center rounded-full bg-blush text-hotpink hover:bg-petal"
              aria-label="Open navigation menu"
            >
              <Menu className="h-5 w-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 bg-rose/30 backdrop-blur-md flex justify-end animate-fade-in" id="mobile-landing-drawer">
          <button
            onClick={() => setMobileMenuOpen(false)}
            className="absolute inset-0 cursor-default focus:outline-none"
            aria-label="Close menu background"
          />
          <nav className="relative w-80 h-full bg-white/95 shadow-2xl p-6 flex flex-col justify-between border-l border-petal/60 animate-bloom-bounce">
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-petal/30">
                <BloomLogo />
                <button
                  id="landing-menu-close"
                  onClick={() => setMobileMenuOpen(false)}
                  className="grid h-9 w-9 place-items-center rounded-full bg-blush text-hotpink hover:bg-petal focus:outline-none"
                  aria-label="Close navigation menu"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="mt-8 flex flex-col gap-3">
                {[
                  { href: "/", label: "Home" },
                  { href: "#universes", label: "Features" },
                  { href: "#features", label: "About" },
                  { href: "/app/read", label: "Blog" },
                  { href: "#contact", label: "Contact" },
                ].map((l) => (
                  <a
                    key={l.href}
                    href={l.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className="px-4 py-3 text-[#831843] font-semibold text-lg hover:bg-blush rounded-2xl transition hover:text-hotpink"
                  >
                    ✿ {l.label}
                  </a>
                ))}
              </div>
            </div>
            <div className="flex flex-col gap-4 border-t border-petal/30 pt-6">
              <a
                href="/app/today"
                onClick={() => setMobileMenuOpen(false)}
                className="bloom-luxury-btn w-full py-3 sm:py-3.5 font-bold text-white text-center"
              >
                Start Blooming
              </a>
              <div className="flex items-center justify-center gap-2">
                <a href="#" aria-label="Instagram" className="grid h-9 w-9 place-items-center rounded-full bg-blush text-hotpink hover:bg-petal">
                  <Instagram className="h-4 w-4" />
                </a>
                <a href="#" aria-label="TikTok" className="grid h-9 w-9 place-items-center rounded-full bg-hotpink text-white hover:bg-magenta">
                  <Music2 className="h-4 w-4" />
                </a>
              </div>
              <p className="text-center font-script text-base text-rose/80">stay soft, bloom on ✿</p>
            </div>
          </nav>
        </div>
      )}

      <main className="relative z-10 mx-auto max-w-7xl px-4 pb-16 pt-4 sm:px-6 sm:pt-6 2xl:max-w-[96rem]">

        {/* ───────────────────────── HERO ───────────────────────── */}
        {/* full-bleed banner — escapes the page's side padding to span edge-to-edge like the reference */}
        <section className="section-pink-shadow relative -mx-4 -mt-4 min-h-0 overflow-hidden rounded-b-[2rem] sm:-mx-6 sm:-mt-6 sm:rounded-b-[3rem]">
          {/* hero photo — fills the entire banner, text sits on top of it */}
          <img
            src="/images/landing-hero.webp"
            alt="A radiant girl glowing in a dreamy pink bloom of light and petals"
            fetchPriority="high"
            decoding="async"
            className="absolute inset-0 h-full w-full object-cover object-[center_22%] sm:object-[65%_30%]"
            referrerPolicy="no-referrer"
          />
          {/* gradient so the text stays readable on the left, while the right side stays clear and glowy */}
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(to right, oklch(0.97 0.025 350) 0%, oklch(0.97 0.025 350 / 0.88) 40%, oklch(0.97 0.025 350 / 0.3) 58%, transparent 75%)",
            }}
          />

          <div className="relative z-10 mx-auto grid h-full max-w-7xl items-start gap-1 px-6 pb-[23px] pt-7 sm:gap-6 sm:px-10 sm:pb-[23px] sm:pt-12 lg:gap-10 lg:pt-14 2xl:max-w-[96rem]">
            <div className="text-left sm:max-w-md lg:max-w-xl" style={{ textShadow: "0 1px 16px oklch(0.97 0.025 350 / 0.9), 0 1px 3px oklch(0.97 0.025 350 / 0.9)" }}>
              <h1 className="font-script text-5xl leading-tight text-hotpink sm:text-6xl lg:text-7xl">
                Bloom<br className="sm:hidden" /> &amp; Zein
              </h1>
              <p className="mt-1 font-script text-lg leading-tight text-hotpink sm:mt-2 sm:text-xl lg:text-2xl">
                Your softest era<br className="sm:hidden" /> starts here.
              </p>
              <p className="mt-3 max-w-[16rem] text-[11px] font-normal text-magenta sm:mt-4 sm:max-w-sm sm:text-sm lg:text-base">
                The all-in-one app for your body, mind<br />
                and life. Designed for you, guided by<br />
                your cycle.
              </p>
              <div className="mt-4 flex flex-row items-center gap-2 sm:mt-8 sm:gap-3 lg:mt-10">
                <a
                  href="/app/today"
                  className="bloom-luxury-btn hover-scale animate-float-soft inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-full px-3.5 py-2 text-[11px] font-semibold text-white transition sm:gap-2 sm:px-6 sm:py-3 sm:text-base"
                >
                  Start Blooming <ArrowRight className="h-3 w-3 sm:h-4 sm:w-4" />
                </a>
                <button
                  onClick={handleDownload}
                  disabled={installing}
                  className="bloom-luxury-btn-white hover-scale animate-float-soft inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-full px-3.5 py-2 text-[11px] font-semibold text-hotpink transition disabled:opacity-70 sm:gap-2 sm:px-6 sm:py-3 sm:text-base"
                  style={{ animationDelay: "0.3s" }}
                >
                  {installing ? (
                    <span className="h-3 w-3 rounded-full border-2 border-hotpink border-t-transparent animate-spin sm:h-4 sm:w-4" />
                  ) : (
                    <Download className="h-3 w-3 sm:h-4 sm:w-4" />
                  )}
                  {installing ? "Préparation…" : "Download App"}
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Inline keyframes reused from the old hero (background breathe, CTA, title shimmer) */}
        <style>{`
          @keyframes bloom-breathe-bg {
            0%, 100% { background-position: 0% 50%, 100% 50%, 50% 100%, 0 0; }
            50%      { background-position: 30% 60%, 70% 40%, 40% 70%, 0 0; }
          }
          .bloom-breathe {
            background:
              radial-gradient(50rem 40rem at 10% 0%, oklch(0.92 0.12 350 / 0.55), transparent 60%),
              radial-gradient(45rem 35rem at 95% 25%, oklch(0.88 0.18 10 / 0.45), transparent 60%),
              radial-gradient(50rem 40rem at 50% 100%, oklch(0.9 0.14 330 / 0.5), transparent 60%),
              linear-gradient(180deg, oklch(0.98 0.02 350), oklch(0.95 0.05 350));
            background-size: 200% 200%;
            animation: bloom-breathe-bg 22s ease-in-out infinite;
          }
          @keyframes bloom-title-shimmer-kf {
            0%   { background-position: -150% 0; }
            60%  { background-position: 250% 0; }
            100% { background-position: 250% 0; }
          }
          .bloom-title-shimmer::after {
            content: "";
            position: absolute; inset: 0;
            background-image: linear-gradient(110deg, transparent 35%, oklch(1 0 0 / 0.55) 50%, transparent 65%);
            background-size: 200% 100%;
            -webkit-background-clip: text; background-clip: text;
            color: transparent; pointer-events: none;
            animation: bloom-title-shimmer-kf 5.5s ease-in-out infinite;
            mix-blend-mode: screen;
          }
          /* Same glossy 3D capsule as .bloom-luxury-btn, but a soft translucent white body */
          .bloom-luxury-btn-white {
            position: relative;
            isolation: isolate;
            overflow: hidden;
            border-radius: 26px;
            border: none;
            background: linear-gradient(180deg, oklch(1 0 0 / 0.7) 0%, oklch(0.98 0 0 / 0.55) 100%);
            backdrop-filter: blur(6px);
            -webkit-backdrop-filter: blur(6px);
            transform: translateY(-2px);
            box-shadow:
              0 2px 5px -1px oklch(0.32 0.18 340 / 0.2),
              0 13px 22px -13px oklch(0.6 0.22 345 / 0.25),
              inset 0 0 0 1px oklch(1 0 0 / 0.6),
              inset 0 1px 0 oklch(1 0 0 / 0.9),
              inset 0 -5px 9px oklch(0.85 0.1 345 / 0.25);
            transition: transform 0.25s cubic-bezier(0.22, 0.9, 0.32, 1.1), box-shadow 0.3s ease, filter 0.2s ease;
          }
          .bloom-luxury-btn-white::before {
            content: "";
            position: absolute;
            inset: 0;
            z-index: -1;
            background: radial-gradient(120% 75% at 50% -20%, oklch(1 0 0 / 0.6), transparent 62%);
          }
          .bloom-luxury-btn-white:hover {
            transform: translateY(-3px);
            filter: brightness(1.02);
          }
          .bloom-luxury-btn-white:active {
            transform: translateY(0px) scale(0.99);
            filter: brightness(0.985);
          }
        `}</style>

        {/* ──────────────── THREE UNIVERSES. ONE YOU. ──────────────── */}
        <div className="mt-6 text-center sm:mt-10">
          <h2 className="mx-auto inline-flex max-w-2xl items-center gap-2 whitespace-nowrap font-script text-3xl leading-tight text-bloom-gradient sm:text-5xl lg:text-6xl">
            Three Universes. One You. <Sparkles className="h-5 w-5 text-hotpink sm:h-7 sm:w-7" aria-hidden />
          </h2>
          <p className="mt-1.5 text-xs font-semibold text-magenta/70 sm:text-sm">
            Everything you need, beautifully organized.
            <br />
            All in one App
          </p>
        </div>
        <section id="universes" className="bloom-rainbow-bg section-pink-shadow relative -mx-4 mt-1 overflow-hidden rounded-[2rem] sm:-mx-6 sm:mt-6 sm:rounded-[3rem]">
          <div className="relative z-10 px-6 pt-[2mm] pb-8 sm:px-10 sm:py-14 lg:py-16">
            {/* Phone: 3D coverflow carousel — active card centered, neighbors peek on each side, cards keep their natural size */}
            <div
              ref={universeCarouselRef}
              className={`relative h-[330px] touch-pan-y fold:hidden ${carouselHintPlayed ? "animate-carousel-hint" : ""}`}
              style={{ perspective: "1200px" }}
              onTouchStart={(e) => { universeTouchX.current = e.touches[0].clientX; }}
              onTouchEnd={(e) => {
                if (universeTouchX.current === null) return;
                const delta = e.changedTouches[0].clientX - universeTouchX.current;
                if (Math.abs(delta) > 40) {
                  setActiveUniverse((p) =>
                    delta < 0 ? (p + 1) % UNIVERSES.length : (p - 1 + UNIVERSES.length) % UNIVERSES.length
                  );
                }
                universeTouchX.current = null;
              }}
            >
              {UNIVERSES.map((u, i) => {
                let pos = i - activeUniverse;
                if (pos > 1) pos -= UNIVERSES.length;
                if (pos < -1) pos += UNIVERSES.length;
                if (Math.abs(pos) > 1) return null;
                const isCenter = pos === 0;
                return (
                  <div
                    key={u.key}
                    role={isCenter ? undefined : "button"}
                    aria-label={isCenter ? undefined : `Show ${u.title}`}
                    onClick={() => !isCenter && setActiveUniverse(i)}
                    className={`absolute left-1/2 top-1/2 w-[78%] transition-all duration-500 ease-out ${isCenter ? "" : "cursor-pointer"}`}
                    style={{
                      transform: `translate(-50%, -50%) translateX(${pos * 92}%) scale(${isCenter ? 1 : 0.84}) rotateY(${pos * -28}deg)`,
                      zIndex: isCenter ? 20 : 10,
                      opacity: isCenter ? 1 : 0.55,
                      transformStyle: "preserve-3d",
                    }}
                  >
                    <UniverseCard u={u} i={i} className="w-full" />
                  </div>
                );
              })}
              <button
                type="button"
                aria-label="Previous universe"
                onClick={() => setActiveUniverse((p) => (p - 1 + UNIVERSES.length) % UNIVERSES.length)}
                className="absolute left-0 top-1/2 z-30 grid h-9 w-9 -translate-x-1 -translate-y-1/2 place-items-center rounded-full bg-white/50 text-rose shadow-md backdrop-blur-md"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                type="button"
                aria-label="Next universe"
                onClick={() => setActiveUniverse((p) => (p + 1) % UNIVERSES.length)}
                className="absolute right-0 top-1/2 z-30 grid h-9 w-9 -translate-y-1/2 translate-x-1 place-items-center rounded-full bg-white/50 text-rose shadow-md backdrop-blur-md"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
              <div className="absolute -bottom-1 left-1/2 z-30 flex -translate-x-1/2 gap-1.5">
                {UNIVERSES.map((u, i) => (
                  <button
                    key={u.key}
                    type="button"
                    aria-label={`Go to ${u.title}`}
                    onClick={() => setActiveUniverse(i)}
                    className={`h-1.5 rounded-full transition-all ${i === activeUniverse ? "w-5 bg-hotpink" : "w-1.5 bg-hotpink/30"}`}
                  />
                ))}
              </div>
            </div>

            {/* Tablet & up: 3-column grid */}
            <div className="hidden fold:grid fold:grid-cols-3 fold:gap-5 lg:gap-7">
              {UNIVERSES.map((u, i) => (
                <UniverseCard key={u.key} u={u} i={i} popIn />
              ))}
            </div>
          </div>
        </section>

        {/* How it Connects — circular web diagram showing how every tool talks to the others */}
        <section className="bloom-connections-bg relative mt-4 overflow-hidden rounded-[2rem] p-5 sm:mt-6 sm:rounded-[3rem] sm:p-8 md:p-12">
          <div className="text-center">
            <p className="font-script text-2xl text-hotpink">how it all connects</p>
            <h2 className="mx-auto max-w-2xl font-script text-4xl leading-tight text-bloom-gradient sm:text-6xl">
              Every tool knows what the others know
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-sm font-medium text-magenta/80 sm:text-base">
              Tap a tool and watch your Bloom Calendar light up.
            </p>
          </div>
          <div className="mt-6 sm:mt-10">
            <ConnectionsDiagram />
          </div>
        </section>

        {/* ──────────────── EVERYTHING IN ONE PLACE — CALENDAR + TOOLBOX ──────────────── */}
        <section
          id="features"
          className="section-pink-shadow relative mt-16 scroll-mt-24 overflow-hidden rounded-[2rem] p-5 sm:mt-24 sm:rounded-[3rem] sm:p-8 md:p-12"
        >
          <img
            src="/images/toolbox-bg.webp"
            alt=""
            aria-hidden
            loading="lazy"
            decoding="async"
            className="absolute inset-0 -z-10 h-full w-full animate-photo-breathe object-cover"
          />
          <SectionHeading kicker="one soft home for everything" title="Everything blooms in one place." />
          <p className="mx-auto mt-3 max-w-xl text-center text-sm font-medium text-magenta/80 sm:text-base">
            Your cycle, workouts, journaling, money and little reminders all land on the same gentle calendar — tap a tool to see it bloom.
          </p>
          <div className="mt-6 sm:mt-10">
            <ToolboxPreview />
          </div>
        </section>

        {/* ──────────────── REAL TRANSFORMATION — STATS ──────────────── */}
        <section id="stories" className="section-pink-shadow mt-16 scroll-mt-24 sm:mt-24">
          <SectionHeading kicker="real blooming" title="Real blooming. Real transformation." />
          <div className="mx-auto mt-8 grid max-w-4xl grid-cols-3 gap-2.5 sm:gap-5">
            {STATS.map((s, i) => (
              <a
                key={s.days}
                href="/app/tools"
                aria-label={`${s.days} days — ${s.text}`}
                className="animate-card-pop-in hover-scale group ring-1 ring-white/40 relative flex aspect-[4/5] flex-col items-center justify-end overflow-hidden rounded-2xl p-3 text-center text-white transition sm:aspect-[16/11] sm:rounded-[1.75rem] sm:p-6"
                style={{ animationDelay: `${i * 120}ms`, background: "linear-gradient(135deg, oklch(0.92 0.08 350), oklch(0.85 0.12 340))" }}
              >
                <img src={s.image} alt="" aria-hidden width={700} height={700} decoding="async" className="animate-card-bg-breathe absolute inset-0 h-full w-full object-cover" style={{ animationDelay: `${i * 0.6}s` }} />
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/55 via-black/0 to-transparent" aria-hidden />
                <p className="animate-float-soft relative z-10 font-script text-3xl leading-none sm:text-6xl" style={{ textShadow: "0 0 12px oklch(0.75 0.28 350 / 0.95), 0 0 28px oklch(0.65 0.28 0 / 0.7)" }}>{s.days}</p>
                <p className="animate-float-soft relative z-10 text-[10px] font-bold uppercase tracking-[0.2em] text-white/85 sm:text-sm" style={{ textShadow: "0 0 8px oklch(0.75 0.28 350 / 0.95), 0 0 18px oklch(0.65 0.28 0 / 0.7)", animationDelay: "0.3s" }}>days</p>
                <p className="animate-float-soft relative z-10 mt-1.5 text-[10px] font-medium leading-snug text-white/90 sm:text-sm" style={{ textShadow: "0 0 8px oklch(0.75 0.28 350 / 0.95), 0 0 18px oklch(0.65 0.28 0 / 0.7)", animationDelay: "0.6s" }}>{s.text}</p>
              </a>
            ))}
          </div>
        </section>

        {/* ──────────────── STORIES / SOCIAL PROOF ──────────────── */}
        <section className="section-pink-shadow mt-16 sm:mt-24">
          <div className="mt-8 grid gap-4 sm:gap-6 md:grid-cols-3">
            {QUOTES.map((q, i) => (
              <div key={q.name} className="bloom-pearl-card animate-card-pop-in rounded-[1.75rem] p-5 sm:p-6" style={{ animationDelay: `${i * 110}ms` }}>
                <Quote className="h-6 w-6 text-hotpink" />
                <p className="mt-3 text-sm font-medium text-magenta/90">{q.text}</p>
                <div className="mt-4 flex items-center gap-3">
                  <span className="grid h-10 w-10 place-items-center rounded-full bg-hotpink font-script text-xl text-white">{q.name[0]}</span>
                  <div>
                    <p className="text-sm font-bold text-magenta">{q.name}</p>
                    <div className="flex gap-0.5 text-hotpink">{Array.from({ length: 5 }).map((_, j) => <Star key={j} className="h-3 w-3 fill-hotpink" />)}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ──────────────── FINAL CTA — GLASS HEART + PHONE ──────────────── */}
        <div className="mt-10 h-3 rounded-full bloom-stripes opacity-70" aria-hidden />
      </main>

      <footer id="contact" className="relative z-10 overflow-hidden">
        {/* Pink gradient background */}
        <div className="absolute inset-0 pointer-events-none" style={{ background: 'linear-gradient(160deg,#fdf2f8 0%,#fce7f3 40%,#fbcfe8 72%,#f9a8d4 100%)' }} />
        {/* Soft decorative blobs */}
        <span aria-hidden className="pointer-events-none absolute -top-16 -right-16 h-56 w-56 rounded-full" style={{ background: 'radial-gradient(circle,rgba(236,72,153,.12) 0%,transparent 70%)' }} />
        <span aria-hidden className="pointer-events-none absolute bottom-0 -left-12 h-44 w-44 rounded-full" style={{ background: 'radial-gradient(circle,rgba(219,39,119,.10) 0%,transparent 70%)' }} />

        <div className="relative z-10 mx-auto max-w-6xl px-5 pt-12 pb-5 sm:px-8">
          {/* Main columns */}
          <div className="grid grid-cols-2 gap-8 sm:grid-cols-3 lg:grid-cols-[2fr_1fr_1fr_1fr_1.6fr]">

            {/* Brand */}
            <div className="col-span-2 sm:col-span-3 lg:col-span-1">
              <div className="flex items-center gap-2 mb-3">
                <BloomLogo className="h-8 w-8" />
                <span className="font-script text-2xl text-hotpink">Bloomzein</span>
              </div>
              <p className="text-sm leading-relaxed text-[#9d174d]/75 max-w-[15rem]">
                Your all-in-one app for cycle tracking, nutrition, fitness, and self-care. Designed for your body, mind &amp; life.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                {[
                  { href: "#", label: "Instagram", icon: <Instagram className="h-4 w-4" />, bg: "bg-blush text-hotpink hover:bg-petal" },
                  { href: "#", label: "TikTok",    icon: <Music2 className="h-4 w-4" />,    bg: "bg-hotpink text-white hover:bg-[#be185d]" },
                  { href: "#", label: "Facebook",  icon: <Facebook className="h-4 w-4" />,  bg: "bg-rose-100 text-hotpink hover:bg-rose-200" },
                  { href: "#", label: "Pinterest", icon: <Heart className="h-4 w-4" />,     bg: "bg-pink-200 text-[#be185d] hover:bg-pink-300" },
                  { href: "#", label: "YouTube",   icon: <Youtube className="h-4 w-4" />,   bg: "bg-rose-200 text-rose-600 hover:bg-rose-300" },
                  { href: "#", label: "Email",     icon: <Mail className="h-4 w-4" />,      bg: "bg-petal text-hotpink hover:bg-blush" },
                ].map(({ href, label, icon, bg }) => (
                  <a key={label} href={href} aria-label={label} className={`grid h-9 w-9 place-items-center rounded-full transition ${bg}`}>
                    {icon}
                  </a>
                ))}
              </div>
            </div>

            {/* Features */}
            <div>
              <p className="mb-3 text-sm font-bold text-hotpink">Features</p>
              <ul className="space-y-2 text-sm text-[#9d174d]/70">
                {["Cycle Tracking","Meals & Recipes","Yoga","Workout","Dreamy Diary","Notes & Reminders","Diet","Budget"].map(f => (
                  <li key={f}><a href="#" className="hover:text-hotpink transition">{f}</a></li>
                ))}
              </ul>
            </div>

            {/* Resources */}
            <div>
              <p className="mb-3 text-sm font-bold text-hotpink">Resources</p>
              <ul className="space-y-2 text-sm text-[#9d174d]/70">
                {["Help Center","Guides","FAQs"].map(r => (
                  <li key={r}><a href="#" className="hover:text-hotpink transition">{r}</a></li>
                ))}
              </ul>
            </div>

            {/* Company */}
            <div>
              <p className="mb-3 text-sm font-bold text-hotpink">Company</p>
              <ul className="space-y-2 text-sm text-[#9d174d]/70">
                {[
                  { label: "About Us", href: "#" },
                  { label: "Our Mission", href: "#" },
                  { label: "Privacy Policy", href: "/privacy" },
                  { label: "Terms of Service", href: "/terms" },
                ].map(({ label, href }) => (
                  <li key={label}><a href={href} className="hover:text-hotpink transition">{label}</a></li>
                ))}
              </ul>
            </div>

            {/* Support + newsletter */}
            <div className="col-span-2 sm:col-span-1">
              <p className="mb-3 text-sm font-bold text-hotpink">Support</p>
              <ul className="mb-4 space-y-2 text-sm text-[#9d174d]/70">
                <li><a href="#" className="hover:text-hotpink transition">Contact Us</a></li>
                <li><a href="mailto:support@bloomzein.com" className="hover:text-hotpink transition">support@bloomzein.com</a></li>
              </ul>
              <div className="rounded-2xl border border-pink-300/50 bg-white/55 p-3 backdrop-blur">
                <p className="font-bold text-hotpink text-sm">Stay in Bloom 🌸</p>
                <p className="mt-1 mb-3 text-[11px] text-[#9d174d]/65 leading-snug">Get tips, updates &amp; exclusive offers straight to your inbox.</p>
                <div className="flex gap-1.5">
                  <input type="email" placeholder="Enter your email"
                    className="min-w-0 flex-1 rounded-full border border-pink-200/60 bg-white/80 px-3 py-1.5 text-xs text-[#831843] outline-none focus:border-hotpink placeholder:text-[#9d174d]/40"
                  />
                  <button className="flex-shrink-0 grid h-8 w-8 place-items-center rounded-full bg-hotpink text-white hover:bg-[#be185d] transition">
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Divider */}
          <div className="mt-10 border-t border-pink-300/40 pt-4 flex flex-col items-center gap-1.5 sm:flex-row sm:justify-between text-xs text-[#9d174d]/55">
            <p>© {new Date().getFullYear()} Bloom &amp; Zein. All Rights Reserved.</p>
            <p className="flex items-center gap-1">🌸 Made with love for you <Heart className="h-3 w-3 fill-hotpink text-hotpink" /></p>
          </div>
        </div>
      </footer>

      {iosHint && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-2rem)] max-w-xs animate-fade-in">
          <div className="flex items-center gap-3 rounded-2xl bg-[#831843] px-4 py-3 shadow-xl">
            <Download className="h-4 w-4 shrink-0 text-white" />
            <p className="text-xs font-semibold text-white leading-snug">
              Sur iPhone : <span className="font-normal">Partager</span> → <span className="font-normal">Sur l'écran d'accueil</span>
            </p>
            <button onClick={() => setIosHint(false)} className="ml-auto shrink-0 text-white/70 hover:text-white">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ────────────────────────── small presentational pieces ────────────────────────── */

function SectionHeading({ kicker, title }: { kicker: string; title: string }) {
  return (
    <div className="text-center">
      <p className="font-script text-xl text-hotpink sm:text-2xl">{kicker}</p>
      <h2 className="mx-auto max-w-2xl font-script text-3xl leading-tight text-bloom-gradient sm:text-5xl lg:text-6xl">{title}</h2>
    </div>
  );
}

/** A soft, on-brand May calendar mockup with colored event dots. */
/** A tiny CSS phone frame showing the app's bloom splash. */
function PhoneMock() {
  return (
    <div className="relative h-56 w-28 shrink-0 rounded-[1.75rem] border-[5px] border-white/90 bg-white shadow-2xl sm:h-72 sm:w-36" aria-hidden>
      <span className="absolute left-1/2 top-1.5 z-10 h-1 w-8 -translate-x-1/2 rounded-full bg-magenta/20" />
      <div className="flex h-full w-full flex-col items-center justify-center gap-2 overflow-hidden rounded-[1.4rem]"
        style={{ background: "linear-gradient(160deg, oklch(0.92 0.1 350), oklch(0.82 0.16 350) 60%, oklch(0.78 0.18 10))" }}>
        <Sparkles className="absolute left-3 top-6 h-3 w-3 animate-sparkle-drift text-white/80" />
        <Heart className="absolute right-3 top-10 h-3 w-3 animate-bloom-float fill-white/70 text-white/70" />
        <Flower2 className="absolute bottom-6 left-4 h-3 w-3 animate-bloom-float text-white/70" />
        <span className="grid h-12 w-12 place-items-center rounded-2xl bg-white/30 backdrop-blur sm:h-14 sm:w-14">
          <Flower2 className="h-7 w-7 text-white" />
        </span>
        <p className="font-script text-lg leading-none text-white drop-shadow sm:text-xl">Bloom</p>
        <p className="text-[8px] font-semibold text-white/90">your softest era</p>
      </div>
    </div>
  );
}

/* ────────────────────────── data ────────────────────────── */

interface UniverseItem { icon: LucideIcon; label: string; }
interface Universe {
  key: string; title: string; href: string;
  titleColor: string; titleAccent: string; glowColor: string; image: string;
  items: UniverseItem[];
}

const UNIVERSES: Universe[] = [
  {
    key: "body", title: "Body", href: "/app/tools/cycle",
    titleColor: "#db2777", titleAccent: "#e60076", glowColor: "oklch(0.68 0.24 350 / 0.55)",
    image: "/images/landing-card-body.webp",
    items: [
      { icon: Droplet, label: "Cycle Tracking" },
      { icon: Utensils, label: "Meals & Recipes" },
      { icon: Footprints, label: "Movement" },
      { icon: Dumbbell, label: "Workout" },
      { icon: Apple, label: "Diet" },
    ],
  },
  {
    key: "mind", title: "Mind", href: "/app/tools/diary",
    titleColor: "#c084fc", titleAccent: "#a855f7", glowColor: "oklch(0.72 0.18 295 / 0.45)",
    image: "/images/landing-card-life.webp",
    items: [
      { icon: Flower2, label: "Yoga" },
      { icon: NotebookPen, label: "Journal" },
      { icon: BookHeart, label: "Gratitude Journal" },
      { icon: Heart, label: "Affirmations" },
      { icon: BookOpen, label: "Reads" },
    ],
  },
  {
    key: "life", title: "Life", href: "/app/calendar",
    titleColor: "#ec4899", titleAccent: "#db2777", glowColor: "oklch(0.68 0.24 350 / 0.5)",
    image: "/images/landing-card-mind.webp",
    items: [
      { icon: CalendarIcon, label: "Calendar" },
      { icon: Wallet, label: "Budget" },
      { icon: ShoppingBag, label: "Shopping" },
      { icon: ClipboardList, label: "Planning" },
      { icon: Target, label: "Goals" },
    ],
  },
];

/* Card used both in the desktop 3-column grid and the mobile 3D carousel */
function UniverseCard({ u, i, className = "", popIn = false }: { u: Universe; i: number; className?: string; popIn?: boolean }) {
  return (
    <article
      className={`pearl-frame relative flex flex-col items-start overflow-hidden rounded-2xl border-none p-2.5 text-left sm:rounded-[1.75rem] sm:p-5 lg:p-6 ${popIn ? "animate-card-pop-in" : ""} ${className}`}
      style={{
        ...(popIn ? { animationDelay: `${i * 120}ms` } : {}),
        background: "oklch(1 0 0 / 0.16)",
        backdropFilter: "blur(6px)",
        "--card-glow": u.glowColor,
        boxShadow:
          "inset 0 1px 0 oklch(1 0 0 / 0.75), inset 1px 0 0 oklch(1 0 0 / 0.25), inset -1px 0 0 oklch(1 0 0 / 0.12), inset 0 -1px 6px oklch(0.45 0.2 340 / 0.18), 0 -10px 26px -10px oklch(1 0 0 / 0.7), 0 10px 28px -12px var(--card-glow, oklch(0.65 0.22 350 / 0.5))",
      } as CSSProperties}
    >
      {/* per-card photo, shown at full strength */}
      <img
        src={u.image}
        alt=""
        aria-hidden
        loading="lazy"
        decoding="async"
        className="absolute inset-0 h-full w-full animate-photo-breathe object-cover"
        style={{ animationDelay: `${i * 0.6}s` }}
      />
      <h3 className="relative z-10 w-full animate-bloom-float text-center font-script text-2xl leading-none drop-shadow-[0_2px_6px_oklch(1_0_0_/_0.8)] sm:text-4xl lg:text-5xl" style={{ color: u.titleAccent, animationDelay: `${i * 300}ms` }}>{u.title}</h3>
      <ul className="relative z-10 mt-2 flex flex-col items-start gap-1 sm:mt-4 sm:gap-2.5">
        {u.items.map((it, ii) => {
          const Icon = it.icon;
          return (
            <li key={it.label} className="flex items-center gap-1 rounded-full bg-white/30 px-2 py-1 backdrop-blur-md shadow-sm sm:gap-2 sm:px-3 sm:py-1.5">
              <span className="animate-icon-wiggle grid h-5 w-5 shrink-0 place-items-center rounded-full bg-white/40 shadow-sm backdrop-blur-md sm:h-7 sm:w-7" style={{ animationDelay: `${ii * 220}ms` }}>
                <Icon className="h-2.5 w-2.5 sm:h-3.5 sm:w-3.5" style={{ color: u.titleColor }} />
              </span>
              <span className="text-[9px] font-bold leading-tight sm:text-sm" style={{ color: u.titleColor }}>{it.label}</span>
            </li>
          );
        })}
      </ul>
      <a
        href={u.href}
        aria-label={`Explore ${u.title}`}
        className="hover-scale animate-cta-bounce relative z-10 mt-2 inline-flex w-full items-center justify-center gap-1 rounded-full bg-white/30 px-3 py-1.5 text-[10px] font-bold backdrop-blur-md sm:mt-3 sm:gap-1.5 sm:px-4 sm:py-2 sm:text-xs"
        style={{ color: u.titleColor, animationDelay: `${i * 200}ms` }}
      >
        Discover
        <ArrowRight className="animate-arrow-nudge h-3 w-3 sm:h-4 sm:w-4" />
      </a>
    </article>
  );
}

const STATS = [
  { days: "7", text: "softer mornings & a calmer first week", image: "/images/landing-stat-bg-1.webp" },
  { days: "30", text: "your cycle, mood & money start to rhyme", image: "/images/landing-stat-bg-2.webp" },
  { days: "90", text: "a whole new soft era, fully bloomed", image: "/images/landing-stat-bg-3.webp" },
];

const QUOTES = [
  { name: "Mia", text: "I stopped using 6 different apps the day I found Bloomzein — everything I need just lives here now ✿" },
  { name: "Luna", text: "It's the first app that actually gets that my mood, my cycle and my budget are all the same story." },
  { name: "Sofia", text: "I open it for my cycle and somehow my whole week just makes sense. It feels like it actually knows me 💕" },
];
