import {
  ArrowRight, Download, Heart, Instagram, Music2, Sparkles, Star, Menu, X, Lock, Flower2,
  Moon, Droplet, Wallet, Calendar as CalendarIcon,
  Target, Quote, Utensils, Footprints, StickyNote, ClipboardList, NotebookPen, type LucideIcon,
} from "lucide-react";
import { BloomLogo } from "@/components/bloom/BloomLogo";
import { KawaiiBackground } from "@/components/bloom/KawaiiBackground";
import { DreamyFallingIcons } from "@/components/bloom/DreamyFallingIcons";
import { triggerPWAInstall, waitForPWAPrompt, isIOS } from "@/lib/pwa";
import { useEffect, useState, type CSSProperties, type ReactNode } from "react";

export default function Landing() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [installing, setInstalling] = useState(false);
  const [iosHint, setIosHint] = useState(false);

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
              className="bloom-luxury-btn animate-cta-glow hover-scale inline-flex items-center gap-2 rounded-full px-5 py-2 text-sm font-semibold text-white transition disabled:opacity-70"
            >
              {installing ? "Préparation…" : "Download App"} <Download className="h-3.5 w-3.5" />
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
        <section className="section-pink-shadow relative -mx-4 -mt-4 min-h-0 overflow-hidden rounded-b-[2rem] sm:-mx-6 sm:-mt-6 sm:rounded-b-[3rem]">
          {/* hero photo — fills the entire banner, text sits on top of it */}
          <img
            src="/images/landing-hero.webp"
            alt="A radiant girl glowing in a dreamy pink bloom of light and petals"
            fetchPriority="high"
            decoding="async"
            className="absolute inset-0 h-full w-full object-cover object-[center_18%] animate-card-breathe sm:object-[65%_12%]"
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
        <section id="universes" className="section-pink-shadow relative -mx-4 mt-4 overflow-hidden rounded-[2rem] sm:-mx-6 sm:mt-6 sm:rounded-[3rem]" style={{ background: "oklch(0.98 0.015 350)" }}>
          {/* shared background photo for the whole section, faded so the cards stay readable */}
          <img
            src="/images/landing-universes-bg.webp"
            alt=""
            aria-hidden
            decoding="async"
            onLoad={(e) => e.currentTarget.classList.remove("opacity-0")}
            className="absolute inset-0 h-full w-full object-cover object-top opacity-0 transition-opacity duration-700 animate-card-breathe"
          />
          {/* radial fade — keeps the photo mostly visible while letting the edges melt into the page background */}
          <div className="absolute inset-0" style={{ background: "radial-gradient(75% 75% at 50% 50%, oklch(0.98 0.02 350 / 0.25) 0%, oklch(0.98 0.015 350 / 0.4) 60%, oklch(0.98 0.015 350) 100%)" }} />

          <div className="relative z-10 px-6 py-8 sm:px-10 sm:py-14 lg:py-16">
            {/* 3 columns on every screen — phone & tablet included, per spec */}
            <div className="grid grid-cols-3 gap-2.5 sm:gap-5 lg:gap-7">
              {UNIVERSES.map((u, i) => {
                return (
                  <article
                    key={u.key}
                    className="pearl-frame animate-card-pop-in relative flex flex-col items-start overflow-hidden rounded-2xl border-none p-2.5 text-left sm:rounded-[1.75rem] sm:p-5 lg:p-6"
                    style={{
                      animationDelay: `${i * 120}ms`,
                      background: "oklch(1 0 0 / 0.16)",
                      backdropFilter: "blur(6px)",
                      "--card-glow": u.glowColor,
                      boxShadow:
                        "inset 0 1px 0 oklch(1 0 0 / 0.75), inset 1px 0 0 oklch(1 0 0 / 0.25), inset -1px 0 0 oklch(1 0 0 / 0.12), inset 0 -1px 6px oklch(0.45 0.2 340 / 0.18), 0 -10px 26px -10px oklch(1 0 0 / 0.7), 0 10px 28px -12px var(--card-glow, oklch(0.65 0.22 350 / 0.5))",
                    } as CSSProperties}
                  >
                    <h3 className="relative z-10 font-script text-2xl leading-none sm:text-4xl lg:text-5xl" style={{ color: u.titleAccent }}>{u.title}</h3>
                    <ul className="relative z-10 mt-2 inline-flex flex-col items-start gap-1 sm:mt-4 sm:gap-2.5">
                      {u.items.map((it, ii) => {
                        const Icon = it.icon;
                        return (
                          <li key={it.label} className="flex items-center gap-1 sm:gap-2">
                            <span className="animate-icon-wiggle grid h-5 w-5 shrink-0 place-items-center rounded-full shadow-sm sm:h-7 sm:w-7" style={{ background: u.itemBg, animationDelay: `${ii * 220}ms` }}>
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
                      className="hover-scale animate-cta-bounce relative z-10 mt-2 inline-flex w-full items-center justify-center gap-1 rounded-full bg-white/40 px-3 py-1.5 text-[10px] font-bold backdrop-blur-sm sm:mt-3 sm:gap-1.5 sm:px-4 sm:py-2 sm:text-xs"
                      style={{ color: u.titleColor, animationDelay: `${i * 200}ms` }}
                    >
                      Discover
                      <ArrowRight className="animate-arrow-nudge h-3 w-3 sm:h-4 sm:w-4" />
                    </a>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        {/* ──────────────── EVERYTHING IN ONE PLACE — CALENDAR ──────────────── */}
        <section id="features" className="section-pink-shadow mt-16 scroll-mt-24 sm:mt-24">
          <SectionHeading kicker="one soft home for everything" title="Everything blooms in one place." />
          <div
            className="bloom-pearl-card animate-card-pop-in mx-auto mt-8 max-w-4xl rounded-[2rem] p-4 sm:p-7"
            style={{ background: "linear-gradient(135deg, oklch(0.94 0.06 350 / 0.55) 0%, oklch(0.88 0.1 340 / 0.35) 100%)" }}
          >
            <div className="grid gap-5 lg:grid-cols-[1.6fr_1fr]">
              <img
                src="/images/landing-calendar.webp"
                alt="Bloom & Zein calendar for May 2025 showing cycle, yoga, workout, journal, reminder, budget and goal events"
                width={1100}
                height={1100}
                decoding="async"
                onLoad={(e) => e.currentTarget.classList.remove("opacity-0")}
                className="animate-card-pop-in animate-card-breathe w-full self-center rounded-2xl object-contain shadow-lg opacity-0 transition-opacity duration-700"
              />
              <div className="flex flex-col items-center text-center lg:items-start lg:text-left">
                <p className="font-script text-2xl text-hotpink sm:text-3xl">all your worlds, one calendar</p>
                <p className="mt-1.5 text-sm font-medium text-magenta/80">
                  Your cycle, workouts, journaling, money and little reminders all land on the same gentle calendar — so your whole life finally rhymes.
                </p>
                <a
                  href="/app/calendar"
                  className="bloom-luxury-btn hover-scale mt-4 inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-5 py-2.5 text-sm font-semibold text-white transition sm:gap-2 sm:px-6 sm:py-3 sm:text-base"
                >
                  Open Calendar <ArrowRight className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* ──────────────── PERSONALIZED BY YOUR CYCLE ──────────────── */}
        <section className="section-pink-shadow mt-16 scroll-mt-24 sm:mt-24">
          <SectionHeading kicker="it grows with you" title="Personalized by your cycle." />
          <div
            className="bloom-pearl-card animate-card-pop-in relative mx-auto mt-8 max-w-4xl overflow-hidden rounded-[2rem] p-4 sm:p-7"
            style={{ background: "linear-gradient(135deg, oklch(0.94 0.06 350 / 0.55) 0%, oklch(0.88 0.1 340 / 0.35) 100%)" }}
          >
            <div className="pointer-events-none absolute inset-0 -z-0 animate-bloom-pulse rounded-[2rem] bg-[radial-gradient(60%_60%_at_50%_45%,oklch(0.75_0.22_350/0.35)_0%,transparent_70%)]" aria-hidden />
            <img
              src="/images/landing-cycle-personalized.webp"
              alt="Bloom & Zein cycle phases — Period, Follicular, Ovulation, Luteal — with workouts, yoga, meals and articles that adapt to you"
              width={1683}
              height={935}
              decoding="async"
              onLoad={(e) => e.currentTarget.classList.remove("opacity-0")}
              className="animate-card-pop-in relative z-10 w-full rounded-2xl object-contain shadow-xl shadow-hotpink/30 opacity-0 transition-opacity duration-700"
            />
            <p className="relative z-10 mt-4 text-center text-sm font-medium text-magenta/80 sm:text-base">
              Your tools, meals and movement gently shift with every phase — so you're always supported, never fighting your body.
            </p>
            <div className="relative z-10 mt-4 flex justify-center">
              <a
                href="/app/tools/cycle"
                className="bloom-luxury-btn hover-scale inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-5 py-2.5 text-sm font-semibold text-white transition sm:gap-2 sm:px-6 sm:py-3 sm:text-base"
              >
                Track My Cycle <ArrowRight className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              </a>
            </div>
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
                className="animate-card-pop-in animate-cta-glow hover-scale group ring-1 ring-white/40 relative flex aspect-[4/5] flex-col items-center justify-end overflow-hidden rounded-2xl p-3 text-center text-white transition sm:aspect-[16/11] sm:rounded-[1.75rem] sm:p-6"
                style={{ animationDelay: `${i * 120}ms`, background: "linear-gradient(135deg, oklch(0.92 0.08 350), oklch(0.85 0.12 340))" }}
              >
                <img src={s.image} alt="" aria-hidden decoding="async" onLoad={(e) => e.currentTarget.classList.remove("opacity-0")} className="absolute inset-0 h-full w-full object-cover opacity-0 transition-[opacity,transform] duration-700 animate-card-breathe group-hover:scale-105" />
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent" aria-hidden />
                <p className="relative z-10 font-script text-3xl leading-none sm:text-6xl" style={{ textShadow: "0 2px 10px oklch(0 0 0 / 0.5)" }}>{s.days}</p>
                <p className="relative z-10 text-[10px] font-bold uppercase tracking-[0.2em] text-white/85 sm:text-sm" style={{ textShadow: "0 1px 6px oklch(0 0 0 / 0.5)" }}>days</p>
                <p className="relative z-10 mt-1.5 text-[10px] font-medium leading-snug text-white/90 sm:text-sm" style={{ textShadow: "0 1px 6px oklch(0 0 0 / 0.5)" }}>{s.text}</p>
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
        <section className="relative mt-16 overflow-hidden rounded-[2.5rem] p-5 shadow-2xl shadow-hotpink/30 sm:mt-24 sm:p-10"
          style={{ background: "linear-gradient(135deg, oklch(0.72 0.26 350), oklch(0.58 0.3 0), oklch(0.7 0.25 20))" }}>
          <Sparkles className="absolute left-8 top-6 h-5 w-5 animate-sparkle-drift text-white" aria-hidden />
          <Heart className="absolute right-10 top-8 h-5 w-5 animate-bloom-float fill-white text-white" aria-hidden />
          <div className="grid items-center gap-6 lg:grid-cols-2">
            {/* glass heart — framed so its art background reads as intentional */}
            <div className="order-2 flex items-center justify-center gap-4 lg:order-1">
              <div className="pearl-frame relative w-40 overflow-hidden rounded-[1.75rem] animate-card-breathe sm:w-52 lg:w-60">
                <img src="/images/landing-glass-heart.webp" alt="A glowing crystal heart cradling a soft pink bloom" decoding="async" onLoad={(e) => e.currentTarget.classList.remove("opacity-0")} className="h-full w-full object-cover opacity-0 transition-opacity duration-700" referrerPolicy="no-referrer" />
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
  titleColor: string; titleAccent: string; itemBg: string; glowColor: string;
  items: UniverseItem[];
}

const UNIVERSES: Universe[] = [
  {
    key: "body", title: "Body", href: "/app/tools/cycle",
    titleColor: "#db2777", titleAccent: "#e60076", itemBg: "oklch(1 0 0 / 0.6)", glowColor: "oklch(0.68 0.24 350 / 0.55)",
    items: [
      { icon: Droplet, label: "Cycle Tracking" },
      { icon: Utensils, label: "Meals & Recipes" },
      { icon: Flower2, label: "Yoga & Workouts" },
      { icon: Footprints, label: "Movement" },
    ],
  },
  {
    key: "mind", title: "Mind", href: "/app/tools/diary",
    titleColor: "#7c3aed", titleAccent: "#7c0cf2", itemBg: "oklch(1 0 0 / 0.6)", glowColor: "oklch(0.6 0.22 300 / 0.55)",
    items: [
      { icon: NotebookPen, label: "Journal" },
      { icon: StickyNote, label: "Notes" },
      { icon: Moon, label: "Reflection" },
      { icon: Heart, label: "Affirmations" },
    ],
  },
  {
    key: "life", title: "Life", href: "/app/calendar",
    titleColor: "#e11d48", titleAccent: "#ff0a47", itemBg: "oklch(1 0 0 / 0.6)", glowColor: "oklch(0.66 0.22 20 / 0.55)",
    items: [
      { icon: CalendarIcon, label: "Calendar" },
      { icon: Wallet, label: "Budget" },
      { icon: ClipboardList, label: "Planning" },
      { icon: Target, label: "Goals" },
    ],
  },
];


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
