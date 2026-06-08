import { ArrowRight, Download, Heart, Instagram, Music2, Sparkles, Star, Quote, Menu, X, Lock, ChevronLeft, ChevronRight } from "lucide-react";
import { BloomLogo } from "@/components/bloom/BloomLogo";
import { SparkleRing } from "@/components/bloom/SparkleRing";
import { KawaiiBackground } from "@/components/bloom/KawaiiBackground";
import { DreamyFallingIcons } from "@/components/bloom/DreamyFallingIcons";
import { CuteToolIcon } from "@/components/bloom/CuteToolIcon";
import { ConnectionsDiagram } from "@/components/bloom/ConnectionsDiagram";
import { triggerPWAInstall, waitForPWAPrompt, isIOS } from "@/lib/pwa";
import { useEffect, useRef, useState } from "react";

export default function Landing() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [installing, setInstalling] = useState(false);
  const [iosHint, setIosHint] = useState(false);
  const [scrollY, setScrollY] = useState(0);
  const [kitActive, setKitActive] = useState(0);
  const [kitPaused, setKitPaused] = useState(false);

  // gentle auto-advance, right to left, like a soft carousel breeze — pauses while you're browsing it
  useEffect(() => {
    if (kitPaused) return;
    const t = setInterval(() => {
      setKitActive((prev) => (prev + 1) % UNIVERSES.length);
    }, 4200);
    return () => clearInterval(t);
  }, [kitPaused]);

  const kitGoTo = (index: number) => {
    setKitActive(((index % UNIVERSES.length) + UNIVERSES.length) % UNIVERSES.length);
    setKitPaused(true);
  };
  const kitNext = () => kitGoTo(kitActive + 1);
  const kitPrev = () => kitGoTo(kitActive - 1);

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
      {/* gentle living background: kawaii shapes and glossy orbs */}
      <KawaiiBackground count={20} />
      <DreamyFallingIcons count={14} />
      {/* floating soft blobs */}
      <div className="pointer-events-none absolute -left-32 top-40 -z-0 h-80 w-80 rounded-full bg-hotpink/20 blur-3xl animate-bloom-pulse" aria-hidden />
      <div className="pointer-events-none absolute -right-32 top-[60%] -z-0 h-96 w-96 rounded-full bg-rose/30 blur-3xl animate-bloom-pulse" style={{ animationDelay: "1.5s" }} aria-hidden />

      {/* Navbar — exactly 3 links, kept soft & uncluttered */}
      <header className="sticky top-0 z-40 border-b border-petal/60 bg-white/70 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
          <BloomLogo />
          <nav className="hidden items-center gap-8 text-sm font-medium text-rose md:flex">
            <a href="#kit" className="hover:text-hotpink font-semibold">Our Kit</a>
            <a href="#how-it-works" className="hover:text-hotpink font-semibold">How it works</a>
            <a
              href="/app/today"
              className="bloom-cta relative overflow-hidden hover-scale inline-flex items-center gap-2 rounded-full px-5 py-2 text-sm font-semibold text-white transition"
            >
              <span className="relative z-10 inline-flex items-center gap-1.5">Start Blooming <ArrowRight className="h-3.5 w-3.5" /></span>
              <span className="bloom-cta-shine" aria-hidden />
            </a>
          </nav>
          <div className="flex items-center gap-2 md:hidden">
            {/* Mobile hamburger button */}
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
              <div className="mt-8 flex flex-col gap-5">
                <a
                  href="#kit"
                  onClick={() => setMobileMenuOpen(false)}
                  className="px-4 py-3 text-[#831843] font-semibold text-lg hover:bg-blush rounded-2xl transition hover:text-hotpink"
                >
                  ✿ Our Kit
                </a>
                <a
                  href="#how-it-works"
                  onClick={() => setMobileMenuOpen(false)}
                  className="px-4 py-3 text-[#831843] font-semibold text-lg hover:bg-blush rounded-2xl transition hover:text-hotpink"
                >
                  ✿ How it works
                </a>
              </div>
            </div>
            <div className="flex flex-col gap-4 border-t border-petal/30 pt-6">
              <a
                href="/app/today"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full py-3 sm:py-3.5 bg-hotpink text-white rounded-full font-bold shadow-md shadow-hotpink/30 hover:bg-magenta transition text-center"
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

      <main className="relative z-10 mx-auto max-w-7xl px-4 pb-16 pt-4 sm:px-6 sm:pt-6">
        {/* Hero — compact, centered, lifted on mobile */}
        <section className="relative overflow-hidden rounded-[2rem] sm:rounded-[3rem] p-5 sm:p-10 md:p-14 shadow-[0_30px_80px_-30px_oklch(0.6_0.25_0/0.45)]"
          style={{ background: "linear-gradient(135deg, oklch(0.94 0.08 350) 0%, oklch(0.88 0.14 350) 50%, oklch(0.92 0.1 10) 100%)" }}>
          <div className="pointer-events-none absolute -right-10 -top-10 hidden h-64 w-64 opacity-60 md:block" aria-hidden>
            <Sunburst />
          </div>
          <Sparkles className="absolute left-4 top-5 h-4 w-4 sm:h-6 sm:w-6 animate-bloom-sparkle text-hotpink" aria-hidden />
          <Sparkles className="absolute right-6 top-8 h-4 w-4 animate-bloom-sparkle text-magenta" style={{ animationDelay: "0.6s" }} aria-hidden />
          <Star className="absolute right-8 bottom-8 h-4 w-4 animate-bloom-sparkle fill-hotpink text-hotpink" style={{ animationDelay: "1.2s" }} aria-hidden />
          <Heart className="absolute bottom-6 left-5 h-4 w-4 animate-bloom-float fill-hotpink text-hotpink" aria-hidden />
          {/* extra gentle twinkles near hero with light parallax */}
          <Sparkles className="absolute left-[20%] top-[18%] h-3 w-3 animate-bloom-sparkle text-white/90" style={{ animationDelay: "0.3s", transform: `translateY(${scrollY * -0.06}px)` }} aria-hidden />
          <Sparkles className="absolute right-[18%] top-[28%] h-3 w-3 animate-bloom-sparkle text-white/80" style={{ animationDelay: "1.4s", transform: `translateY(${scrollY * -0.04}px)` }} aria-hidden />
          <Sparkles className="absolute left-[12%] bottom-[28%] h-3 w-3 animate-bloom-sparkle text-white/80" style={{ animationDelay: "2.1s", transform: `translateY(${scrollY * -0.05}px)` }} aria-hidden />

          {/* Mobile/tablet: stacked & centered. Desktop: 2-col */}
          <div className="flex flex-col items-center gap-8 text-center lg:grid lg:grid-cols-2 lg:items-center lg:gap-14 lg:text-left">
            <div className="relative mx-auto h-[200px] w-[200px] sm:h-[280px] sm:w-[280px] md:h-[360px] md:w-[360px] lg:h-[460px] lg:w-[460px] lg:mt-0">
              {/* glowing aura behind the hero photo */}
              <div className="absolute inset-0 -m-6 rounded-[45%_55%_60%_40%/55%_45%_50%_50%] bg-hotpink/40 blur-2xl animate-bloom-pulse" aria-hidden />
              <div className="absolute inset-0 -m-10 rounded-full bg-gradient-to-br from-hotpink/30 via-magenta/20 to-transparent blur-3xl animate-bloom-pulse" style={{ animationDelay: "1s" }} aria-hidden />
              <div className="hidden lg:block"><SparkleRing radius={200} /></div>
              <div className="animate-bloom-float h-full w-full">
                <img
                  src="/images/hero-girl.png"
                  alt="A joyful girl with vibrant pink hair smiling"
                  width={520}
                  height={520}
                  className="relative h-full w-full object-cover shadow-[0_25px_60px_-15px_oklch(0.55_0.28_0/0.55)] mx-auto lg:h-[420px] lg:w-[420px] lg:mt-5"
                  style={{ borderRadius: "55% 45% 50% 50% / 60% 55% 45% 40%" }}
                  referrerPolicy="no-referrer"
                />
              </div>
            </div>

            <div className="flex flex-col items-center lg:items-start">
              <h1 className="relative font-script text-5xl sm:text-7xl md:text-8xl lg:text-[117px] leading-none text-bloom-gradient drop-shadow-[0_4px_20px_oklch(0.7_0.25_0/0.25)] bloom-title-shimmer">
                Bloom & Zein
                <Sparkles className="absolute -right-4 -top-2 h-4 w-4 sm:h-5 sm:w-5 animate-bloom-sparkle text-hotpink" aria-hidden />
                <Sparkles className="absolute -left-3 top-2 h-3 w-3 animate-bloom-sparkle text-magenta" style={{ animationDelay: "0.8s" }} aria-hidden />
              </h1>
              <p className="mt-2 font-script text-xl sm:text-2xl md:text-3xl text-magenta">your softest era starts here ✿</p>
              <div className="mt-5 flex flex-row flex-wrap items-center justify-center gap-2 sm:gap-3 lg:justify-start">
                <a
                  href="/app/today"
                  className="bloom-cta relative overflow-hidden hover-scale inline-flex flex-1 items-center justify-center gap-1.5 rounded-full px-4 py-2.5 text-xs font-semibold text-white transition sm:flex-none sm:gap-2 sm:px-6 sm:py-3 sm:text-base"
                >
                  <span className="relative z-10 inline-flex items-center gap-1.5 sm:gap-2 whitespace-nowrap">Start Blooming <ArrowRight className="h-3.5 w-3.5 sm:h-4 sm:w-4" /></span>
                  <span className="bloom-cta-shine" aria-hidden />
                </a>
                <button
                  onClick={handleDownload}
                  disabled={installing}
                  className="hover-scale inline-flex flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-full border-2 border-white bg-white/90 px-4 py-2.5 text-xs font-semibold text-hotpink transition hover:bg-white disabled:opacity-70 sm:flex-none sm:gap-2 sm:px-6 sm:py-3 sm:text-base"
                >
                  {installing ? (
                    <span className="h-3.5 w-3.5 rounded-full border-2 border-hotpink border-t-transparent animate-spin sm:h-4 sm:w-4" />
                  ) : (
                    <Download className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  )}
                  {installing ? "Préparation…" : "Download App"}
                </button>
              </div>
            </div>
          </div>
        </section>

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

          @keyframes bloom-slow-rise {
            0%   { transform: translateY(0) translateX(0); opacity: 0; }
            10%  { opacity: var(--o, 0.5); }
            90%  { opacity: var(--o, 0.5); }
            100% { transform: translateY(-110vh) translateX(var(--drift, 10px)); opacity: 0; }
          }
          .bloom-slow-bubble { animation: bloom-slow-rise linear infinite; }

          @keyframes bloom-bokeh {
            0%, 100% { opacity: 0; transform: scale(0.7); }
            50%      { opacity: var(--o, 0.7); transform: scale(1); }
          }
          .bloom-bokeh { animation: bloom-bokeh ease-in-out infinite; }

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

          @keyframes bloom-flower-bob {
            0%, 100% { transform: translateY(0) rotate(-3deg); }
            50% { transform: translateY(-5px) rotate(3deg); }
          }
          @keyframes bloom-flower-pop {
            0% { opacity: 0; transform: scale(0.6) translateY(12px); }
            70% { opacity: 1; transform: scale(1.06) translateY(-2px); }
            100% { opacity: 1; transform: scale(1) translateY(0); }
          }
          .bloom-flower-item { opacity: 0; animation: bloom-flower-pop 0.7s cubic-bezier(0.34, 1.56, 0.64, 1) forwards; }
          .bloom-flower > svg.flower-bg { animation: bloom-flower-bob 5s ease-in-out infinite; }
          .bloom-flower-item:hover .flower-bg { filter: drop-shadow(0 8px 18px oklch(0.65 0.28 350 / 0.55)); }

          @keyframes bloom-tap-nudge {
            0%, 100% { transform: translateX(0); }
            50% { transform: translateX(3px); }
          }
          .bloom-tap-arrow { animation: bloom-tap-nudge 1.6s ease-in-out infinite; }
          .bloom-tap-card:hover .bloom-tap-arrow { animation-play-state: paused; transform: translateX(2px); }

          .bloom-no-scrollbar { scrollbar-width: none; -ms-overflow-style: none; }
          .bloom-no-scrollbar::-webkit-scrollbar { display: none; }

          .bz-carousel-stage { perspective: 1400px; }
          .bz-carousel-3d { transform-style: preserve-3d; }
          .bz-carousel-card { transform-style: preserve-3d; backface-visibility: hidden; }
        `}</style>

        {/* Your Bloom & Zein Kit — 3 universes, swipeable like a cute little carousel */}
        <section id="kit" className="mt-8 scroll-mt-24 sm:mt-14 lg:mt-20">
          <div className="text-center">
            <p className="font-script text-xl sm:text-2xl text-hotpink">your bloom & zein kit</p>
            <h2 className="font-script text-3xl sm:text-5xl lg:text-6xl text-bloom-gradient">three little universes, one soft you</h2>
            <p className="mt-1 text-[11px] sm:text-sm font-semibold text-magenta/60">✿ drifting softly through your worlds ✿</p>
          </div>

          <div
            className="bz-carousel-stage relative mx-auto mt-6 h-[27rem] max-w-md sm:mt-8 sm:h-[26rem] sm:max-w-xl lg:h-[24rem] lg:max-w-3xl"
            onMouseEnter={() => setKitPaused(true)}
            onMouseLeave={() => setKitPaused(false)}
          >
            {/* prev/next arrows — gently glide the 3D stack */}
            <button
              type="button"
              onClick={kitPrev}
              aria-label="Previous universe"
              className="absolute left-0 top-1/2 z-30 -translate-y-1/2 hover-scale rounded-full bg-white/90 p-2 text-hotpink shadow-lg shadow-hotpink/20 backdrop-blur sm:p-2.5"
            >
              <ChevronLeft className="h-4 w-4 sm:h-5 sm:w-5" />
            </button>
            <button
              type="button"
              onClick={kitNext}
              aria-label="Next universe"
              className="absolute right-0 top-1/2 z-30 -translate-y-1/2 hover-scale rounded-full bg-white/90 p-2 text-hotpink shadow-lg shadow-hotpink/20 backdrop-blur sm:p-2.5"
            >
              <ChevronRight className="h-4 w-4 sm:h-5 sm:w-5" />
            </button>

            <div className="bz-carousel-3d absolute inset-0">
              {UNIVERSES.map((u, ui) => {
                const n = UNIVERSES.length;
                const rel = (((ui - kitActive) % n) + n) % n;
                const offset = rel === 0 ? 0 : rel === 1 ? 1 : -1;
                const isActive = offset === 0;
                let transform = "";
                if (offset === 0) transform = "translate3d(0,0,0) rotateY(0deg) scale(1)";
                else if (offset === 1) transform = "translate3d(54%,0,-180px) rotateY(-34deg) scale(0.8)";
                else transform = "translate3d(-54%,0,-180px) rotateY(34deg) scale(0.8)";

                return (
                  <button
                    key={u.title}
                    type="button"
                    onClick={() => (isActive ? undefined : kitGoTo(ui))}
                    aria-label={`Show the ${u.title} universe`}
                    className="bz-carousel-card group absolute inset-0 mx-auto w-full max-w-[19rem] cursor-pointer overflow-hidden rounded-[2rem] p-5 text-left shadow-2xl backdrop-blur transition-[transform,opacity,filter] duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] sm:max-w-sm sm:p-6"
                    style={{
                      background: u.bgGradient,
                      boxShadow: `0 25px 60px -28px ${u.shadow}, 0 0 0 1px oklch(1 0 0 / 0.5) inset`,
                      transform,
                      zIndex: isActive ? 30 : 10,
                      opacity: isActive ? 1 : 0.55,
                      filter: isActive ? "blur(0px)" : "blur(1px) saturate(0.85)",
                      pointerEvents: "auto",
                    }}
                  >
                    <div className="absolute -right-10 -top-10 h-28 w-28 rounded-full blur-2xl transition" style={{ background: u.glow, opacity: isActive ? 0.8 : 0.3 }} aria-hidden />
                    <div className="flex items-center gap-2.5">
                      <span className="grid h-11 w-11 place-items-center rounded-2xl text-xl text-white shadow-md" style={{ background: u.iconBg }}>
                        {u.emoji}
                      </span>
                      <div>
                        <p className="font-script text-3xl" style={{ color: u.titleColor }}>{u.title}</p>
                        <p className="text-[11px] sm:text-xs font-semibold" style={{ color: u.textColor }}>{u.subtitle}</p>
                      </div>
                    </div>

                    <div className="mt-4 flex flex-col gap-2.5">
                      {u.tools.map((t, ti) => (
                        <a
                          key={t.slug}
                          href={`/app/tools/${t.slug}`}
                          onClick={(e) => { if (!isActive) e.preventDefault(); }}
                          tabIndex={isActive ? 0 : -1}
                          className="bloom-tap-card group/card flex items-center gap-3 rounded-2xl bg-white/70 p-2.5 transition duration-300 hover:bg-white/95 hover:-translate-y-1 hover:shadow-lg hover:shadow-hotpink/20 active:scale-[0.97]"
                          style={{ animationDelay: `${ui * 120 + ti * 90}ms` }}
                        >
                          <span className="bloom-flower relative grid h-11 w-11 shrink-0 place-items-center text-white transition-transform duration-300 group-hover/card:scale-110 group-hover/card:rotate-3">
                            <span className="pointer-events-none absolute inset-0 -m-1.5 rounded-full blur-lg opacity-60 transition-opacity duration-300 group-hover/card:opacity-100" style={{ background: u.glow }} aria-hidden />
                            <CuteToolIcon slug={t.slug} className="relative z-10 h-9 w-9 drop-shadow-[0_5px_12px_oklch(0.4_0.22_350/0.25)] animate-bloom-pulse" />
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-bold" style={{ color: u.titleColor }}>{t.label}</p>
                            <p className="mt-0.5 text-[11px] leading-snug" style={{ color: u.textColor }}>{t.blurb}</p>
                          </div>
                          <span
                            className="bloom-tap-arrow grid h-6 w-6 shrink-0 place-items-center rounded-full text-white opacity-50 transition-opacity duration-300 group-hover/card:opacity-100"
                            style={{ background: u.iconBg }}
                            aria-hidden
                          >
                            <ArrowRight className="h-3 w-3" />
                          </span>
                        </a>
                      ))}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* cute little dot trail — shows which universe is gently drifting into focus */}
          <div className="mt-3 flex items-center justify-center gap-2">
            {UNIVERSES.map((u, i) => (
              <button
                key={u.title}
                type="button"
                onClick={() => kitGoTo(i)}
                aria-label={`Go to ${u.title}`}
                className="h-2 rounded-full transition-all duration-300"
                style={{
                  width: kitActive === i ? "1.5rem" : "0.5rem",
                  background: kitActive === i ? "linear-gradient(135deg, oklch(0.72 0.27 350), oklch(0.58 0.3 0))" : "oklch(0.85 0.1 350)",
                }}
              />
            ))}
          </div>
        </section>

        {/* How it Connects — circular web diagram, replaces all flowchart-y explanations */}
        <section id="how-it-works" className="mt-20 scroll-mt-24 animate-fade-in rounded-[2.5rem] bg-white/80 p-5 shadow-[0_25px_60px_-25px_oklch(0.55_0.28_0/0.35),0_0_0_1px_oklch(1_0_0/0.6)_inset] backdrop-blur sm:p-8 md:p-12">
          <div className="text-center">
            <h2 className="mx-auto max-w-md font-script text-3xl sm:text-5xl md:text-6xl text-bloom-gradient leading-tight">
              Every tool knows what the others know ✿
            </h2>
            <p className="mx-auto mt-1.5 max-w-sm text-[11px] sm:text-sm font-medium text-magenta/70">
              Tap a tool and watch your Bloom Calendar light up.
            </p>
          </div>

          <div className="mt-6 sm:mt-10">
            <ConnectionsDiagram />
          </div>

          <div className="mx-auto mt-10 max-w-xl text-center">
            <p className="font-script text-3xl sm:text-4xl text-bloom-gradient">One app. One you. Everything connected.</p>
            <a
              href="/app/today"
              className="mt-5 inline-flex hover-scale items-center gap-2 rounded-full px-6 py-3 font-semibold text-white shadow-lg shadow-hotpink/40"
              style={{ background: "linear-gradient(135deg, oklch(0.7 0.25 350), oklch(0.6 0.28 0))" }}
            >
              See it in action <ArrowRight className="h-4 w-4" />
            </a>
          </div>
        </section>

        {/* Social proof — real, warm voices, never cold stats */}
        <section className="mt-20">
          <div className="text-center">
            <p className="font-script text-2xl text-hotpink">our pink girls say</p>
            <h2 className="font-script text-6xl text-bloom-gradient">love letters 💌</h2>
          </div>
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {QUOTES.map((q) => (
              <div key={q.name} className="rounded-[2rem] bg-white/85 p-6 shadow-xl shadow-rose/10 backdrop-blur">
                <Quote className="h-6 w-6 text-hotpink" />
                <p className="mt-3 text-sm font-medium text-magenta/90">{q.text}</p>
                <div className="mt-4 flex items-center gap-3">
                  <span className="grid h-10 w-10 place-items-center rounded-full bg-hotpink font-script text-xl text-white">{q.name[0]}</span>
                  <div>
                    <p className="text-sm font-bold text-magenta">{q.name}</p>
                    <div className="flex gap-0.5 text-hotpink">{Array.from({length: 5}).map((_, i) => <Star key={i} className="h-3 w-3 fill-hotpink" />)}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Final CTA */}
        <section className="relative mt-20 overflow-hidden rounded-[3rem] p-8 sm:p-12 text-center shadow-2xl shadow-hotpink/30"
          style={{ background: "linear-gradient(135deg, oklch(0.72 0.26 350), oklch(0.58 0.3 0), oklch(0.7 0.25 20))" }}>
          <Sparkles className="absolute left-10 top-8 h-6 w-6 animate-bloom-sparkle text-white" aria-hidden />
          <Heart className="absolute right-10 top-10 h-6 w-6 animate-bloom-float fill-white text-white" aria-hidden />
          <Star className="absolute bottom-8 left-1/4 h-5 w-5 animate-bloom-sparkle fill-white text-white" style={{ animationDelay: "0.8s" }} aria-hidden />
          <p className="font-script text-3xl text-white/90">your softest era is one tap away</p>
          <h2 className="mt-2 font-script text-6xl text-white drop-shadow">Start your softest era</h2>
          <p className="mx-auto mt-4 max-w-md text-white/90">
            Everything connected, nothing complicated — just one gentle little app that grows with you.
          </p>
          <div className="mt-7 flex justify-center">
            <a
              href="/app/today"
              className="hover-scale inline-flex items-center gap-2 rounded-full bg-white px-7 py-3.5 text-base font-bold text-hotpink shadow-lg"
            >
              Start your softest era <ArrowRight className="h-4 w-4" />
            </a>
          </div>
          <p className="mx-auto mt-6 flex max-w-md items-center justify-center gap-2 text-xs sm:text-sm font-medium text-white/85">
            <Lock className="h-3.5 w-3.5 shrink-0" />
            Your softest secrets stay yours — stored safely on your device, never sold, never shared.
          </p>
        </section>

        {/* Striped accent */}
        <div className="mt-10 h-3 rounded-full bloom-stripes opacity-70" aria-hidden />
      </main>

      <footer className="relative z-10 border-t border-petal/60 bg-white/70 py-8 text-center backdrop-blur">
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

      {/* iOS install toast — only on iPhone/iPad */}
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

interface UniverseTool {
  slug: string;
  label: string;
  blurb: string;
}

interface Universe {
  title: string;
  subtitle: string;
  emoji: string;
  bgGradient: string;
  iconBg: string;
  glow: string;
  shadow: string;
  titleColor: string;
  textColor: string;
  tools: UniverseTool[];
}

const UNIVERSES: Universe[] = [
  {
    title: "Body",
    subtitle: "for your cycle, your meals, your movement",
    emoji: "🌿",
    bgGradient: "linear-gradient(160deg, oklch(0.96 0.05 350) 0%, oklch(0.92 0.09 350) 100%)",
    iconBg: "linear-gradient(135deg, oklch(0.74 0.25 350), oklch(0.6 0.28 350))",
    glow: "oklch(0.78 0.22 350 / 0.45)",
    shadow: "oklch(0.62 0.27 350 / 0.35)",
    titleColor: "#831843",
    textColor: "#9D5C7E",
    tools: [
      { slug: "cycle", label: "Cycle Tracker", blurb: "You'll see your Yoga and Meals adjust to exactly how you feel today" },
      { slug: "meals", label: "Meal Planner", blurb: "You get gentle meal ideas that match your energy and your phase" },
      { slug: "yoga", label: "Yoga Flows", blurb: "Your flow softens on your low-energy days — no need to ask" },
    ],
  },
  {
    title: "Mind",
    subtitle: "for your moods, your thoughts, your softness",
    emoji: "🧠",
    bgGradient: "linear-gradient(160deg, oklch(0.96 0.05 320) 0%, oklch(0.92 0.08 320) 100%)",
    iconBg: "linear-gradient(135deg, oklch(0.72 0.2 320), oklch(0.58 0.25 320))",
    glow: "oklch(0.78 0.18 320 / 0.45)",
    shadow: "oklch(0.62 0.24 320 / 0.32)",
    titleColor: "#702459",
    textColor: "#9D5C7E",
    tools: [
      { slug: "diary", label: "Dreamy Diary", blurb: "You'll start noticing your own patterns — and so does the rest of your kit" },
    ],
  },
  {
    title: "Life",
    subtitle: "for your money, your moments, your memory",
    emoji: "💗",
    bgGradient: "linear-gradient(160deg, oklch(0.96 0.05 20) 0%, oklch(0.92 0.08 20) 100%)",
    iconBg: "linear-gradient(135deg, oklch(0.74 0.2 20), oklch(0.6 0.25 10))",
    glow: "oklch(0.8 0.16 20 / 0.45)",
    shadow: "oklch(0.64 0.22 15 / 0.32)",
    titleColor: "#831843",
    textColor: "#9D5C7E",
    tools: [
      { slug: "budget", label: "Budget Planner", blurb: "You'll notice when your spending follows your mood — gently, never judgy" },
      { slug: "notes", label: "Reminders", blurb: "Your little moments find their place on your calendar, all on their own" },
    ],
  },
];

const QUOTES = [
  { name: "Mia", text: "I stopped using 6 different apps the day I found Bloomzein — everything I need just lives here now ✿" },
  { name: "Luna", text: "It's the first app that actually gets that my mood, my cycle and my budget are all the same story." },
  { name: "Sofia", text: "I open it for my cycle and somehow my whole week just makes sense. It feels like it actually knows me 💕" },
];

function Sunburst() {
  return (
    <svg viewBox="0 0 200 200" className="h-full w-full">
      <g fill="oklch(0.82 0.13 350 / 0.7)">
        {Array.from({ length: 12 }).map((_, i) => (
          <polygon
            key={i}
            points="100,100 95,0 105,0"
            transform={`rotate(${i * 18} 100 100)`}
          />
        ))}
      </g>
      <circle cx="100" cy="100" r="14" fill="oklch(0.7 0.22 0)" />
      <path d="M100 92 l8 10 -8 10 -8 -10z" fill="oklch(0.92 0.06 350)" />
    </svg>
  );
}
