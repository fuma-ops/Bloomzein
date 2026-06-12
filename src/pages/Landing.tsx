import {
  ArrowRight, Download, Heart, Instagram, Music2, Sparkles, Star, Menu, X, Lock, Flower2,
  Moon, Sun, Droplet, Smile, PenLine, BookOpen, Dumbbell, Salad, Wallet, Calendar as CalendarIcon,
  Target, TrendingUp, Quote, Utensils, Footprints, StickyNote, ClipboardList, NotebookPen, type LucideIcon,
} from "lucide-react";
import { BloomLogo } from "@/components/bloom/BloomLogo";
import { KawaiiBackground } from "@/components/bloom/KawaiiBackground";
import { DreamyFallingIcons } from "@/components/bloom/DreamyFallingIcons";
import { triggerPWAInstall, waitForPWAPrompt, isIOS } from "@/lib/pwa";
import { useEffect, useState, type ReactNode } from "react";

export default function Landing() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [installing, setInstalling] = useState(false);
  const [iosHint, setIosHint] = useState(false);
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    const onScroll = () => setScrollY(window.scrollY);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
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
          <BloomLogo />
          <nav className="hidden items-center gap-7 text-sm font-semibold text-rose md:flex">
            <a href="/" className="hover:text-hotpink transition">Home</a>
            <a href="#universes" className="hover:text-hotpink transition">Features</a>
            <a href="#features" className="hover:text-hotpink transition">About</a>
            <a href="/app/read" className="hover:text-hotpink transition">Blog</a>
            <a href="#contact" className="hover:text-hotpink transition">Contact</a>
            <button
              onClick={handleDownload}
              disabled={installing}
              className="bloom-cta relative overflow-hidden hover-scale inline-flex items-center gap-2 rounded-full px-5 py-2 text-sm font-semibold text-white transition disabled:opacity-70"
            >
              <span className="relative z-10 inline-flex items-center gap-1.5">
                {installing ? "Préparation…" : "Download App"} <Download className="h-3.5 w-3.5" />
              </span>
              <span className="bloom-cta-shine" aria-hidden />
            </button>
          </nav>
          <div className="flex items-center gap-2 md:hidden">
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
        <section className="relative -mx-4 -mt-4 aspect-[4/3] overflow-hidden rounded-b-[2rem] sm:-mx-6 sm:-mt-6 sm:aspect-[16/10] sm:rounded-b-[3rem] lg:aspect-auto lg:h-[420px] xl:h-[460px]">
          {/* hero photo — fills the entire banner, text sits on top of it */}
          <img
            src="/images/landing-hero.png"
            alt="A radiant girl glowing in a dreamy pink bloom of light and petals"
            className="absolute inset-0 h-full w-full object-cover object-[center_22%] animate-card-breathe sm:object-[68%_center]"
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

          {/* decorative glass orbs */}
          <img
            src="/images/landing-orb-flower.png"
            alt=""
            aria-hidden
            className="pointer-events-none absolute -left-8 bottom-0 h-28 w-28 object-contain opacity-90 animate-bloom-float sm:h-40 sm:w-40 lg:-left-10 lg:h-52 lg:w-52"
            style={{ transform: `translateY(${scrollY * -0.04}px)` }}
          />
          <img
            src="/images/landing-orb-life.png"
            alt=""
            aria-hidden
            className="pointer-events-none absolute -right-10 top-[55%] h-24 w-24 object-contain opacity-90 animate-bloom-float sm:h-36 sm:w-36 lg:h-52 lg:w-52"
            style={{ animationDelay: "1.2s", transform: `translateY(${scrollY * -0.03}px)` }}
          />

          <Sparkles className="pointer-events-none absolute left-[8%] top-[34%] h-4 w-4 animate-sparkle-drift text-white/90" aria-hidden />
          <Sparkles className="pointer-events-none absolute right-[14%] top-[40%] h-3 w-3 animate-sparkle-drift text-white/80" style={{ animationDelay: "1.6s" }} aria-hidden />
          <Star className="pointer-events-none absolute left-[10%] bottom-[24%] h-3.5 w-3.5 animate-sparkle-drift fill-white/80 text-white/80" style={{ animationDelay: "2.4s" }} aria-hidden />

          <div className="relative z-10 mx-auto grid h-full max-w-7xl items-start gap-1 px-6 pb-10 pt-7 sm:gap-6 sm:px-10 sm:pt-12 lg:gap-10 lg:pt-14 2xl:max-w-[96rem]">
            <div className="text-left sm:max-w-md lg:max-w-xl" style={{ textShadow: "0 1px 16px oklch(0.97 0.025 350 / 0.9), 0 1px 3px oklch(0.97 0.025 350 / 0.9)" }}>
              <h1 className="font-script text-5xl leading-tight text-hotpink sm:text-6xl lg:text-7xl">
                Bloom<br className="sm:hidden" /> &amp; Zein
              </h1>
              <p className="mt-1 font-script text-lg leading-tight text-hotpink sm:mt-2 sm:text-xl lg:text-2xl">
                Your softest era<br className="sm:hidden" /> starts here.
              </p>
              <p className="mt-3 max-w-[16rem] text-xs font-medium text-magenta sm:mt-4 sm:max-w-sm sm:text-sm lg:text-base">
                The all-in-one app for your body, mind and life. Designed for you, guided by your cycle.
              </p>
              <div className="mt-4 flex flex-row items-center gap-2 sm:mt-6 sm:gap-3">
                <a
                  href="/app/today"
                  className="bloom-luxury-btn hover-scale inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-full px-3.5 py-2 text-[11px] font-semibold text-white transition sm:gap-2 sm:px-6 sm:py-3 sm:text-base"
                >
                  Start Blooming <ArrowRight className="h-3 w-3 sm:h-4 sm:w-4" />
                </a>
                <button
                  onClick={handleDownload}
                  disabled={installing}
                  className="bloom-luxury-btn-white hover-scale inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-full px-3.5 py-2 text-[11px] font-semibold text-hotpink transition disabled:opacity-70 sm:gap-2 sm:px-6 sm:py-3 sm:text-base"
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
          .bloom-cta {
            background: linear-gradient(135deg, oklch(0.72 0.27 350), oklch(0.55 0.3 0) 60%, oklch(0.68 0.27 330));
            box-shadow:
              0 10px 25px -8px oklch(0.55 0.3 0 / 0.55),
              0 0 22px oklch(0.75 0.27 350 / 0.55),
              inset 0 1px 0 oklch(1 0 0 / 0.4);
            animation: bloom-cta-pulse 3s ease-in-out infinite;
          }
          @keyframes bloom-cta-pulse {
            0%, 100% { box-shadow: 0 10px 25px -8px oklch(0.55 0.3 0 / 0.55), 0 0 22px oklch(0.75 0.27 350 / 0.5), inset 0 1px 0 oklch(1 0 0 / 0.4); }
            50%      { box-shadow: 0 14px 30px -8px oklch(0.55 0.3 0 / 0.65), 0 0 36px oklch(0.78 0.27 350 / 0.8), inset 0 1px 0 oklch(1 0 0 / 0.5); }
          }
          .bloom-cta-shine {
            position: absolute; top: 0; bottom: 0; left: -40%; width: 35%;
            background: linear-gradient(110deg, transparent, oklch(1 0 0 / 0.55), transparent);
            transform: skewX(-20deg);
            animation: bloom-cta-shine-kf 4.5s ease-in-out infinite;
          }
          @keyframes bloom-cta-shine-kf {
            0%   { left: -40%; }
            55%  { left: 130%; }
            100% { left: 130%; }
          }
          /* Same glossy 3D capsule as .bloom-luxury-btn, but a soft translucent white body */
          .bloom-luxury-btn-white {
            position: relative;
            isolation: isolate;
            overflow: hidden;
            border-radius: 26px;
            border: none;
            background: linear-gradient(180deg, oklch(1 0 0 / 0.92) 0%, oklch(0.98 0 0 / 0.8) 100%);
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
        <section id="universes" className="mt-16 scroll-mt-24 sm:mt-24">
          <div className="text-center">
            <h2 className="mx-auto inline-flex max-w-2xl items-center gap-2 whitespace-nowrap font-script text-3xl leading-tight text-bloom-gradient sm:text-5xl lg:text-6xl">
              Three Universes. One You. <Sparkles className="h-5 w-5 text-hotpink sm:h-7 sm:w-7" aria-hidden />
            </h2>
            <p className="mt-1.5 text-xs font-semibold text-magenta/70 sm:text-sm">Everything you need, beautifully organized.</p>
          </div>
          {/* 3 columns on every screen — phone & tablet included, per spec */}
          <div className="mt-8 grid grid-cols-3 gap-2.5 sm:gap-5 lg:gap-7">
            {UNIVERSES.map((u, i) => {
              const Badge = u.badgeIcon;
              return (
                <article
                  key={u.key}
                  className="animate-card-pop-in relative flex flex-col overflow-hidden rounded-2xl p-2.5 shadow-lg sm:rounded-[1.75rem] sm:p-5 lg:p-6"
                  style={{ animationDelay: `${i * 120}ms`, background: u.cardBg }}
                >
                  <Badge className="absolute right-2.5 top-2.5 h-4 w-4 sm:right-4 sm:top-4 sm:h-6 sm:w-6" style={{ color: u.badgeColor }} aria-hidden />
                  <h3 className="font-script text-xl leading-none sm:text-3xl lg:text-4xl" style={{ color: u.titleColor }}>{u.title}</h3>
                  <ul className="mt-2 flex flex-col gap-1 sm:mt-4 sm:gap-2.5">
                    {u.items.map((it) => {
                      const Icon = it.icon;
                      return (
                        <li key={it.label} className="flex items-center gap-1 sm:gap-2">
                          <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full shadow-sm sm:h-7 sm:w-7" style={{ background: u.itemBg }}>
                            <Icon className="h-2.5 w-2.5 sm:h-3.5 sm:w-3.5" style={{ color: u.titleColor }} />
                          </span>
                          <span className="text-[9px] font-bold leading-tight sm:text-sm" style={{ color: u.titleColor }}>{it.label}</span>
                        </li>
                      );
                    })}
                  </ul>
                  {/* decorative card art — placeholder, drop the generated image into /public/images/ (hidden until it exists) */}
                  <img
                    src={u.cardImage}
                    alt=""
                    aria-hidden
                    onError={(e) => { e.currentTarget.style.display = "none"; }}
                    className="pointer-events-none absolute -bottom-3 -right-3 h-16 w-16 object-contain opacity-90 animate-bloom-float sm:-bottom-4 sm:-right-4 sm:h-32 sm:w-32 lg:h-36 lg:w-36"
                  />
                  <a
                    href={u.href}
                    aria-label={`Explore ${u.title}`}
                    className="hover-scale relative z-10 mt-auto grid h-7 w-7 place-items-center self-end justify-self-end rounded-full bg-white text-hotpink shadow-md sm:h-10 sm:w-10"
                  >
                    <ArrowRight className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  </a>
                </article>
              );
            })}
          </div>
        </section>

        {/* ──────────────── EVERYTHING IN ONE PLACE — CALENDAR ──────────────── */}
        <section id="features" className="mt-16 scroll-mt-24 sm:mt-24">
          <SectionHeading kicker="one soft home for everything" title="Everything blooms in one place." />
          <div className="bloom-pearl-card animate-card-pop-in mx-auto mt-8 max-w-4xl rounded-[2rem] p-4 sm:p-7">
            <div className="grid gap-5 lg:grid-cols-[1.6fr_1fr]">
              <CalendarMock />
              <div className="flex flex-col justify-center">
                <p className="font-script text-2xl text-hotpink sm:text-3xl">all your worlds, one calendar</p>
                <p className="mt-1.5 text-sm font-medium text-magenta/80">
                  Your cycle, workouts, journaling, money and little reminders all land on the same gentle calendar — so your whole life finally rhymes.
                </p>
                <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-2">
                  {CALENDAR_LEGEND.map((l) => (
                    <span key={l.label} className="flex items-center gap-1.5 rounded-full bg-white/70 px-2.5 py-1 text-[11px] font-semibold text-magenta shadow-sm sm:text-xs">
                      <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: l.color }} />
                      {l.label}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ──────────────── PERSONALIZED BY YOUR CYCLE ──────────────── */}
        <section className="mt-16 scroll-mt-24 sm:mt-24">
          <SectionHeading kicker="it grows with you" title="Personalized by your cycle." />
          {/* 4-phase timeline — stays a single row on every screen */}
          <div className="relative mx-auto mt-8 max-w-4xl">
            <div className="pointer-events-none absolute left-[12%] right-[12%] top-6 h-1 rounded-full sm:top-8" style={{ background: "linear-gradient(90deg, oklch(0.72 0.27 10), oklch(0.78 0.18 60), oklch(0.72 0.27 350), oklch(0.62 0.28 330))" }} aria-hidden />
            <div className="grid grid-cols-4 gap-1.5 sm:gap-4">
              {CYCLE_PHASES.map((p, i) => {
                const Icon = p.icon;
                return (
                  <div key={p.label} className="animate-card-pop-in flex flex-col items-center text-center" style={{ animationDelay: `${i * 110}ms` }}>
                    <span className="grid h-12 w-12 place-items-center rounded-full text-white shadow-lg ring-4 ring-white sm:h-16 sm:w-16" style={{ background: p.color }}>
                      <Icon className="h-5 w-5 sm:h-7 sm:w-7" />
                    </span>
                    <p className="mt-1.5 text-[10px] font-bold leading-tight text-magenta sm:text-sm">{p.label}</p>
                    <p className="text-[8px] leading-tight text-magenta/60 sm:text-xs">{p.sub}</p>
                  </div>
                );
              })}
            </div>
          </div>
          {/* adapts-to-you cards: 2 cols on phone, 4 on desktop */}
          <div className="mx-auto mt-8 grid max-w-4xl grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            {ADAPTS.map((a, i) => {
              const Icon = a.icon;
              return (
                <article key={a.title} className="bloom-pearl-card animate-card-pop-in flex flex-col items-center rounded-2xl p-3 text-center sm:p-4" style={{ animationDelay: `${i * 90}ms` }}>
                  <span className="grid h-11 w-11 place-items-center rounded-2xl text-white shadow-md sm:h-12 sm:w-12" style={{ background: a.accent }}>
                    <Icon className="h-5 w-5 sm:h-6 sm:w-6" />
                  </span>
                  <p className="mt-2 text-sm font-bold text-magenta">{a.title}</p>
                  <p className="mt-0.5 text-[11px] leading-snug text-magenta/70 sm:text-xs">{a.blurb}</p>
                </article>
              );
            })}
          </div>
        </section>

        {/* ──────────────── DAILY SOFT GIRL DASHBOARD ──────────────── */}
        <section className="mt-16 scroll-mt-24 sm:mt-24">
          <SectionHeading kicker="every little day" title="Your daily soft girl dashboard." />
          {/* 3 columns × 2 rows on every screen */}
          <div className="mx-auto mt-8 grid max-w-4xl grid-cols-3 gap-2.5 sm:gap-4">
            {DASHBOARD.map((d, i) => {
              const Icon = d.icon;
              return (
                <article
                  key={d.title}
                  className="bloom-pearl-card animate-card-pop-in relative flex flex-col items-center justify-center overflow-hidden rounded-2xl p-2.5 text-center sm:rounded-[1.5rem] sm:p-5"
                  style={{ animationDelay: `${i * 90}ms` }}
                >
                  <span className="pointer-events-none absolute -right-5 -top-5 h-16 w-16 rounded-full opacity-50 blur-2xl" style={{ background: d.accent }} aria-hidden />
                  <span className="grid h-10 w-10 place-items-center rounded-2xl text-white shadow-md sm:h-12 sm:w-12" style={{ background: d.accent }}>
                    <Icon className="h-5 w-5 sm:h-6 sm:w-6" />
                  </span>
                  <p className="mt-1.5 text-[10px] font-bold leading-tight text-magenta sm:text-sm">{d.title}</p>
                  <p className="font-script text-base leading-none text-hotpink sm:text-2xl">{d.value}</p>
                </article>
              );
            })}
          </div>
        </section>

        {/* ──────────────── REAL TRANSFORMATION — STATS ──────────────── */}
        <section id="stories" className="mt-16 scroll-mt-24 sm:mt-24">
          <SectionHeading kicker="real blooming" title="Real blooming. Real transformation." />
          <div className="mx-auto mt-8 grid max-w-4xl grid-cols-3 gap-2.5 sm:gap-5">
            {STATS.map((s, i) => (
              <article
                key={s.days}
                className="animate-card-pop-in relative flex flex-col items-center overflow-hidden rounded-2xl p-3 text-center text-white shadow-xl sm:rounded-[1.75rem] sm:p-6"
                style={{ animationDelay: `${i * 120}ms`, background: s.bg }}
              >
                <img src="/images/landing-stat-flower.png" alt="" aria-hidden className="pointer-events-none absolute -right-3 -top-3 h-16 w-16 object-contain opacity-90 animate-bloom-float sm:h-24 sm:w-24" style={{ transform: `rotate(${i * 18}deg)` }} />
                <p className="font-script text-3xl leading-none drop-shadow sm:text-6xl">{s.days}</p>
                <p className="text-[10px] font-bold uppercase tracking-wide sm:text-sm">days</p>
                <p className="mt-1.5 text-[10px] font-medium leading-snug text-white/90 sm:text-sm">{s.text}</p>
              </article>
            ))}
          </div>
        </section>

        {/* ──────────────── STORIES / SOCIAL PROOF ──────────────── */}
        <section className="mt-16 sm:mt-24">
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
        <section className="relative mt-16 overflow-hidden rounded-[2.5rem] p-5 shadow-2xl shadow-hotpink/30 sm:mt-24 sm:p-10"
          style={{ background: "linear-gradient(135deg, oklch(0.72 0.26 350), oklch(0.58 0.3 0), oklch(0.7 0.25 20))" }}>
          <Sparkles className="absolute left-8 top-6 h-5 w-5 animate-sparkle-drift text-white" aria-hidden />
          <Heart className="absolute right-10 top-8 h-5 w-5 animate-bloom-float fill-white text-white" aria-hidden />
          <div className="grid items-center gap-6 lg:grid-cols-2">
            {/* glass heart — framed so its art background reads as intentional */}
            <div className="order-2 flex items-center justify-center gap-4 lg:order-1">
              <div className="pearl-frame relative w-40 overflow-hidden rounded-[1.75rem] animate-card-breathe sm:w-52 lg:w-60">
                <img src="/images/landing-glass-heart.png" alt="A glowing crystal heart cradling a soft pink bloom" className="h-full w-full object-cover" referrerPolicy="no-referrer" />
              </div>
              <PhoneMock />
            </div>
            <div className="order-1 text-center lg:order-2 lg:text-left">
              <p className="font-script text-2xl text-white/90 sm:text-3xl">your softest era is one tap away</p>
              <h2 className="mt-1 font-script text-4xl text-white drop-shadow sm:text-6xl">Ready to bloom at your own pace?</h2>
              <p className="mx-auto mt-3 max-w-md text-sm text-white/90 lg:mx-0">
                Everything connected, nothing complicated — just one gentle little app that grows with you, exactly as fast as you bloom.
              </p>
              <div className="mt-6 flex flex-wrap justify-center gap-3 lg:justify-start">
                <a href="/app/today" className="bloom-luxury-btn inline-flex items-center gap-2 px-7 py-3.5 text-base font-bold text-white">
                  Start Blooming <ArrowRight className="h-4 w-4" />
                </a>
                <button
                  onClick={handleDownload}
                  disabled={installing}
                  className="hover-scale inline-flex items-center gap-2 rounded-full border-2 border-white bg-white/90 px-7 py-3.5 text-base font-bold text-hotpink transition hover:bg-white disabled:opacity-70"
                >
                  <Download className="h-4 w-4" /> Download App
                </button>
              </div>
              <p className="mx-auto mt-5 flex max-w-md items-center justify-center gap-2 text-xs font-medium text-white/85 lg:mx-0 lg:justify-start">
                <Lock className="h-3.5 w-3.5 shrink-0" />
                Your softest secrets stay yours — stored safely on your device, never sold, never shared.
              </p>
            </div>
          </div>
        </section>

        <div className="mt-10 h-3 rounded-full bloom-stripes opacity-70" aria-hidden />
      </main>

      <footer id="contact" className="relative z-10 border-t border-petal/60 bg-white/70 py-8 text-center backdrop-blur">
        <p className="font-script text-2xl text-bloom-gradient">stay soft, bloom on 🌸</p>
        <div className="mt-3 flex items-center justify-center gap-2">
          <a href="#" aria-label="Instagram" className="grid h-9 w-9 place-items-center rounded-full bg-blush text-hotpink hover:bg-petal">
            <Instagram className="h-4 w-4" />
          </a>
          <a href="#" aria-label="TikTok" className="grid h-9 w-9 place-items-center rounded-full bg-hotpink text-white hover:bg-magenta">
            <Music2 className="h-4 w-4" />
          </a>
        </div>
        <p className="mt-3 text-xs font-medium text-magenta/70">© {new Date().getFullYear()} Bloom & Zein — all in pink</p>
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
function CalendarMock() {
  // May 2025 starts on a Thursday (Sun=0 … Sat=6 → 4 leading blanks)
  const lead = 4;
  const days = Array.from({ length: 31 }, (_, i) => i + 1);
  const events: Record<number, string[]> = {
    3: ["#f43f5e"], 5: ["#a855f7"], 8: ["#22c55e"], 12: ["#f43f5e", "#ec4899"],
    15: ["#f59e0b"], 18: ["#a855f7"], 22: ["#22c55e"], 25: ["#ec4899"], 28: ["#f43f5e"], 30: ["#f59e0b"],
  };
  return (
    <div className="rounded-2xl bg-white/80 p-3 shadow-inner sm:p-4">
      <div className="flex items-center justify-between px-1">
        <p className="font-script text-xl text-hotpink sm:text-2xl">May 2025</p>
        <Flower2 className="h-5 w-5 text-hotpink/60" aria-hidden />
      </div>
      <div className="mt-2 grid grid-cols-7 gap-0.5 text-center sm:gap-1">
        {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
          <span key={i} className="text-[9px] font-bold text-magenta/50 sm:text-xs">{d}</span>
        ))}
        {Array.from({ length: lead }).map((_, i) => <span key={`b${i}`} />)}
        {days.map((d) => (
          <span key={d} className="relative grid aspect-square place-items-center rounded-md text-[9px] font-semibold text-magenta sm:rounded-lg sm:text-xs">
            <span className="relative z-10">{d}</span>
            {events[d] && (
              <span className="absolute bottom-0.5 flex gap-0.5">
                {events[d].map((c, ci) => <span key={ci} className="h-1 w-1 rounded-full sm:h-1.5 sm:w-1.5" style={{ background: c }} />)}
              </span>
            )}
          </span>
        ))}
      </div>
    </div>
  );
}

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
  badgeIcon: LucideIcon; badgeColor: string;
  cardBg: string; titleColor: string; itemBg: string;
  cardImage: string;
  items: UniverseItem[];
}

const UNIVERSES: Universe[] = [
  {
    key: "body", title: "Body", href: "/app/tools/cycle",
    badgeIcon: Flower2, badgeColor: "#ec4899",
    cardBg: "linear-gradient(160deg, oklch(0.96 0.035 350) 0%, oklch(0.9 0.08 350) 100%)",
    titleColor: "#db2777", itemBg: "oklch(1 0 0 / 0.6)",
    cardImage: "/images/landing-card-body.png",
    items: [
      { icon: Droplet, label: "Cycle Tracking" },
      { icon: Utensils, label: "Meals & Recipes" },
      { icon: Flower2, label: "Yoga & Workouts" },
      { icon: Footprints, label: "Movement" },
    ],
  },
  {
    key: "mind", title: "Mind", href: "/app/tools/diary",
    badgeIcon: Moon, badgeColor: "#9333ea",
    cardBg: "linear-gradient(160deg, oklch(0.95 0.03 300) 0%, oklch(0.87 0.09 300) 100%)",
    titleColor: "#7c3aed", itemBg: "oklch(1 0 0 / 0.6)",
    cardImage: "/images/landing-card-mind.png",
    items: [
      { icon: NotebookPen, label: "Journal" },
      { icon: StickyNote, label: "Notes" },
      { icon: Moon, label: "Reflection" },
      { icon: Heart, label: "Affirmations" },
    ],
  },
  {
    key: "life", title: "Life", href: "/app/calendar",
    badgeIcon: Star, badgeColor: "#f43f5e",
    cardBg: "linear-gradient(160deg, oklch(0.96 0.03 20) 0%, oklch(0.89 0.08 15) 100%)",
    titleColor: "#e11d48", itemBg: "oklch(1 0 0 / 0.6)",
    cardImage: "/images/landing-card-life.png",
    items: [
      { icon: CalendarIcon, label: "Calendar" },
      { icon: Wallet, label: "Budget" },
      { icon: ClipboardList, label: "Planning" },
      { icon: Target, label: "Goals" },
    ],
  },
];

const CALENDAR_LEGEND = [
  { label: "Cycle", color: "#f43f5e" },
  { label: "Yoga", color: "#ec4899" },
  { label: "Workout", color: "#a855f7" },
  { label: "Journal", color: "#22c55e" },
  { label: "Reminders", color: "#f59e0b" },
  { label: "Budget", color: "#0ea5e9" },
];

const CYCLE_PHASES = [
  { label: "Period", sub: "rest & restore", icon: Droplet, color: "linear-gradient(135deg, #fb7185, #e11d48)" },
  { label: "Follicular", sub: "rising energy", icon: Flower2, color: "linear-gradient(135deg, #fbbf24, #f59e0b)" },
  { label: "Ovulation", sub: "peak & glow", icon: Sun, color: "linear-gradient(135deg, #f472b6, #ec4899)" },
  { label: "Luteal", sub: "soften & slow", icon: Moon, color: "linear-gradient(135deg, #c084fc, #9333ea)" },
];

const ADAPTS = [
  { title: "Workouts", blurb: "lighter on low days", icon: Dumbbell, accent: "linear-gradient(135deg, #fb7185, #f43f5e)" },
  { title: "Yoga", blurb: "flows for your phase", icon: Flower2, accent: "linear-gradient(135deg, #f472b6, #ec4899)" },
  { title: "Meals", blurb: "match your energy", icon: Salad, accent: "linear-gradient(135deg, #34d399, #10b981)" },
  { title: "Articles", blurb: "made for today", icon: BookOpen, accent: "linear-gradient(135deg, #c084fc, #9333ea)" },
];

const DASHBOARD = [
  { title: "Mood", value: "😊", icon: Smile, accent: "linear-gradient(135deg, #fbbf24, #f59e0b)" },
  { title: "Hydration", value: "6/8", icon: Droplet, accent: "linear-gradient(135deg, #38bdf8, #0ea5e9)" },
  { title: "Affirmation", value: "♡", icon: Heart, accent: "linear-gradient(135deg, #fb7185, #f43f5e)" },
  { title: "Reading", value: "12m", icon: BookOpen, accent: "linear-gradient(135deg, #c084fc, #9333ea)" },
  { title: "Diary", value: "✎", icon: PenLine, accent: "linear-gradient(135deg, #34d399, #10b981)" },
  { title: "Progress", value: "78%", icon: TrendingUp, accent: "linear-gradient(135deg, #f472b6, #ec4899)" },
];

const STATS = [
  { days: "7", text: "softer mornings & a calmer first week", bg: "linear-gradient(145deg, oklch(0.72 0.27 350), oklch(0.6 0.3 0))" },
  { days: "30", text: "your cycle, mood & money start to rhyme", bg: "linear-gradient(145deg, oklch(0.68 0.28 330), oklch(0.58 0.31 350))" },
  { days: "90", text: "a whole new soft era, fully bloomed", bg: "linear-gradient(145deg, oklch(0.72 0.27 10), oklch(0.6 0.3 350))" },
];

const QUOTES = [
  { name: "Mia", text: "I stopped using 6 different apps the day I found Bloomzein — everything I need just lives here now ✿" },
  { name: "Luna", text: "It's the first app that actually gets that my mood, my cycle and my budget are all the same story." },
  { name: "Sofia", text: "I open it for my cycle and somehow my whole week just makes sense. It feels like it actually knows me 💕" },
];
