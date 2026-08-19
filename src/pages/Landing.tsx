import {
  ArrowRight, Download, Instagram, Youtube, Facebook, Mail, X, Sparkles, Heart,
  Flower2, Utensils, Dumbbell, HeartPulse, ChevronDown,
} from "lucide-react";
import { BloomLogo } from "@/components/bloom/BloomLogo";
import { AnimatedWords } from "@/components/bloom/AnimatedWords";
import { triggerPWAInstall, waitForPWAPrompt, isIOS } from "@/lib/pwa";
import { trackEvent } from "@/lib/analytics";
import { useEffect, useRef, useState, type ReactNode } from "react";

/* Brand glyphs lucide-react no longer ships. */
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

/** Reveal-on-scroll: fades + rises its children the first time they enter view. */
function Reveal({ children, delay = 0, className = "" }: { children: ReactNode; delay?: number; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setShown(true); io.disconnect(); } },
      { threshold: 0.18 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: shown ? 1 : 0,
        transform: shown ? "none" : "translateY(26px)",
        transition: `opacity 700ms ease, transform 700ms cubic-bezier(.18,.9,.34,1)`,
        transitionDelay: `${delay}ms`,
      }}
    >
      {children}
    </div>
  );
}

export default function Landing() {
  const [installing, setInstalling] = useState(false);
  const [iosHint, setIosHint] = useState(false);

  useEffect(() => {
    if (!iosHint) return;
    const t = setTimeout(() => setIosHint(false), 5000);
    return () => clearTimeout(t);
  }, [iosHint]);

  const handleDownload = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (isIOS()) { setIosHint(true); return; }
    setInstalling(true);
    const ready = await waitForPWAPrompt(6000);
    if (ready) await triggerPWAInstall();
    setInstalling(false);
  };

  const START = "/app/today";

  return (
    <div className="relative min-h-screen bg-[#fff5fa] text-[#831843]">
      {/* ══════════════════ HERO ══════════════════ */}
      <section className="relative flex min-h-[100svh] flex-col overflow-hidden">
        {/* Cinematic background video (placeholder — swap for the final hero clip) */}
        <video
          className="absolute inset-0 h-full w-full object-cover"
          autoPlay muted loop playsInline preload="auto"
          poster="/images/landing-hero.webp"
          aria-hidden
        >
          <source src="/videos/entry-1.mp4" type="video/mp4" />
        </video>
        {/* Soft rose veil — legible, premium, never hides the woman completely */}
        <div className="absolute inset-0" aria-hidden style={{
          background:
            "linear-gradient(180deg, rgba(74,20,45,0.28) 0%, rgba(157,23,77,0.10) 32%, rgba(236,72,153,0.14) 62%, rgba(60,10,35,0.62) 100%)",
        }} />
        <div className="absolute inset-0" aria-hidden style={{
          background: "radial-gradient(120% 80% at 50% 28%, transparent 40%, rgba(60,10,35,0.35))",
        }} />

        {/* Top bar */}
        <header className="relative z-20 mx-auto flex w-full max-w-6xl items-center justify-between px-5 py-4 sm:px-8">
          <div className="[&_span]:!text-white [&_span]:!bg-none">
            <BloomLogo />
          </div>
          <a
            href={START}
            onClick={() => trackEvent("get_started_click", { location: "header" })}
            className="hover-scale inline-flex items-center gap-1.5 rounded-full border border-white/60 bg-white/15 px-4 py-1.5 text-sm font-bold text-white backdrop-blur-md transition hover:bg-white hover:text-hotpink"
          >
            Start Blooming <ArrowRight className="h-3.5 w-3.5" />
          </a>
        </header>

        {/* Hero content */}
        <div className="relative z-10 mx-auto flex w-full max-w-4xl flex-1 flex-col items-center justify-center px-6 pb-16 text-center">
          <span className="mb-5 inline-flex items-center gap-1.5 rounded-full border border-white/40 bg-white/15 px-3.5 py-1 text-[11px] font-bold uppercase tracking-[0.2em] text-white backdrop-blur-md animate-fade-in">
            <Sparkles className="h-3 w-3" /> Cycle-synced wellness
          </span>

          <AnimatedWords
            text="Wellness that flows with your cycle."
            stagger={150}
            className="font-script text-[2.7rem] leading-[1.05] text-white drop-shadow-[0_2px_20px_rgba(74,20,45,0.55)] sm:text-6xl lg:text-7xl"
          />

          <p className="mt-5 max-w-xl text-base leading-relaxed text-white/90 drop-shadow-[0_1px_8px_rgba(74,20,45,0.6)] sm:text-lg animate-fade-in" style={{ animationDelay: "700ms" }}>
            Yoga, meals, movement and tracking — all synced to your phase,
            all in one calm, beautiful place made for your body.
          </p>

          <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row animate-fade-in" style={{ animationDelay: "900ms" }}>
            <a
              href={START}
              onClick={() => trackEvent("get_started_click", { location: "hero" })}
              className="bloom-luxury-btn animate-cta-glow hover-scale inline-flex items-center gap-2 rounded-full px-8 py-3.5 text-base font-bold text-white shadow-xl shadow-hotpink/30 transition active:scale-95"
            >
              Start Blooming <ArrowRight className="h-4 w-4" />
            </a>
            <button
              onClick={handleDownload}
              disabled={installing}
              className="hover-scale inline-flex items-center gap-2 rounded-full border border-white/60 bg-white/10 px-6 py-3.5 text-sm font-semibold text-white backdrop-blur-md transition hover:bg-white/20 disabled:opacity-70"
            >
              {installing ? "Preparing…" : "Get the app"} <Download className="h-4 w-4" />
            </button>
          </div>

          <p className="mt-5 text-xs font-medium tracking-wide text-white/75 animate-fade-in" style={{ animationDelay: "1100ms" }}>
            Free to start · No credit card · Made for your body 🌸
          </p>
        </div>

        {/* Scroll cue */}
        <div className="relative z-10 pb-6 text-center">
          <ChevronDown className="mx-auto h-6 w-6 animate-bounce text-white/70" />
        </div>
      </section>

      {/* ══════════════════ BEAT 1 — the promise ══════════════════ */}
      <section className="mx-auto grid max-w-6xl items-center gap-10 px-6 py-20 sm:px-8 lg:grid-cols-2 lg:py-28">
        <Reveal>
          <p className="mb-3 text-xs font-bold uppercase tracking-[0.22em] text-hotpink">Your body has a rhythm</p>
          <h2 className="font-script text-4xl leading-tight text-bloom-gradient sm:text-5xl">
            An app that finally moves with you — not against you.
          </h2>
          <p className="mt-5 max-w-md text-[15px] leading-relaxed text-[#9d174d]/80">
            Bloomzein knows where you are in your cycle and gently adapts everything —
            the yoga you flow through, the food that fuels you, the movement your body
            wants today. No more guessing. Just care that fits the moment.
          </p>
          <a
            href={START}
            onClick={() => trackEvent("get_started_click", { location: "promise" })}
            className="mt-7 inline-flex items-center gap-2 text-sm font-bold text-hotpink transition hover:gap-3"
          >
            See your first day <ArrowRight className="h-4 w-4" />
          </a>
        </Reveal>

        <Reveal delay={120} className="flex justify-center">
          {/* Phone mock — cinematic app preview (placeholder clip) */}
          <div className="relative w-[240px] shrink-0 sm:w-[280px]">
            <div className="animate-card-breathe overflow-hidden rounded-[2.5rem] border-[6px] border-white bg-white shadow-2xl shadow-hotpink/25">
              <div className="relative aspect-[9/19] w-full overflow-hidden bg-blush">
                <video className="absolute inset-0 h-full w-full object-cover" autoPlay muted loop playsInline preload="auto" poster="/images/landing-hero.webp" aria-hidden>
                  <source src="/videos/entry-2.mp4" type="video/mp4" />
                </video>
                <div className="absolute inset-0" style={{ background: "linear-gradient(180deg, transparent 55%, rgba(60,10,35,0.55))" }} />
                <div className="absolute inset-x-0 bottom-0 p-4 text-white">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-white/80">Today · Luteal phase</p>
                  <p className="font-script text-2xl leading-tight">Soften &amp; restore</p>
                </div>
              </div>
            </div>
            <span aria-hidden className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-hotpink/20 blur-2xl" />
            <span aria-hidden className="pointer-events-none absolute -bottom-8 -left-8 h-28 w-28 rounded-full bg-rose/25 blur-3xl" />
          </div>
        </Reveal>
      </section>

      {/* ══════════════════ BEAT 2 — what adapts ══════════════════ */}
      <section className="relative overflow-hidden px-6 py-20 sm:px-8 lg:py-24" style={{ background: "linear-gradient(180deg,#fff5fa 0%,#fde7f2 100%)" }}>
        <Reveal className="mx-auto max-w-2xl text-center">
          <p className="mb-3 text-xs font-bold uppercase tracking-[0.22em] text-hotpink">Everything, in sync</p>
          <h2 className="font-script text-4xl leading-tight text-bloom-gradient sm:text-5xl">
            One calm place for your whole self.
          </h2>
        </Reveal>

        <div className="mx-auto mt-12 grid max-w-4xl grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-4">
          {[
            { icon: Flower2, title: "Yoga", line: "Gentle flows matched to your phase & mood." },
            { icon: Utensils, title: "Meals", line: "Recipes that fuel exactly what your body needs." },
            { icon: Dumbbell, title: "Movement", line: "Workouts that rise and rest with your energy." },
            { icon: HeartPulse, title: "Cycle", line: "Tracking that turns your rhythm into guidance." },
          ].map(({ icon: Icon, title, line }, i) => (
            <Reveal key={title} delay={i * 90}>
              <div className="h-full rounded-3xl border border-white bg-white/70 p-5 text-center shadow-lg shadow-hotpink/10 backdrop-blur transition hover:-translate-y-1 hover:shadow-xl hover:shadow-hotpink/20">
                <span className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-petal to-hotpink text-white shadow-md shadow-hotpink/30">
                  <Icon className="h-6 w-6" />
                </span>
                <p className="font-script text-2xl text-hotpink">{title}</p>
                <p className="mt-1 text-[13px] leading-snug text-[#9d174d]/75">{line}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ══════════════════ BEAT 3 — trust + CTA ══════════════════ */}
      <section className="relative overflow-hidden px-6 py-24 text-center sm:px-8">
        <div className="absolute inset-0" aria-hidden style={{ background: "linear-gradient(160deg,#fbcfe8 0%,#f9a8d4 55%,#f472b6 100%)" }} />
        <span aria-hidden className="pointer-events-none absolute -left-16 top-8 h-64 w-64 rounded-full bg-white/25 blur-3xl" />
        <span aria-hidden className="pointer-events-none absolute -right-16 bottom-0 h-72 w-72 rounded-full bg-white/20 blur-3xl" />
        <Reveal className="relative z-10 mx-auto max-w-2xl">
          <div className="mb-4 flex items-center justify-center gap-1 text-white">
            {Array.from({ length: 5 }).map((_, i) => <Sparkles key={i} className="h-4 w-4 fill-white" />)}
          </div>
          <h2 className="font-script text-4xl leading-tight text-white drop-shadow-[0_2px_14px_rgba(131,24,67,0.4)] sm:text-6xl">
            Bloom with your cycle, not against it.
          </h2>
          <p className="mx-auto mt-4 max-w-md text-[15px] text-white/90">
            Join the women turning their rhythm into their superpower — one gentle,
            beautiful day at a time.
          </p>
          <a
            href={START}
            onClick={() => trackEvent("get_started_click", { location: "footer_cta" })}
            className="mt-8 inline-flex items-center gap-2 rounded-full bg-white px-9 py-4 text-base font-bold text-hotpink shadow-xl shadow-[#9d174d]/25 transition hover:scale-105 active:scale-95 animate-card-breathe"
          >
            Start Blooming — free <ArrowRight className="h-4 w-4" />
          </a>
          <p className="mt-4 text-xs font-medium text-white/80">No credit card · Cancel anytime 🌸</p>
        </Reveal>
      </section>

      {/* ══════════════════ SLIM FOOTER ══════════════════ */}
      <footer id="contact" className="bg-[#fff5fa] px-6 py-12 sm:px-8">
        <div className="mx-auto flex max-w-5xl flex-col items-center gap-6 text-center">
          <BloomLogo />
          <p className="max-w-sm text-sm leading-relaxed text-[#9d174d]/70">
            Cycle tracking, nutrition, fitness &amp; self-care — designed for your body, mind &amp; life.
          </p>

          {/* Socials */}
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
                <a key={label} href={href} aria-label={label}
                  {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                  className={`grid h-9 w-9 place-items-center rounded-full transition ${bg}`}>
                  {icon}
                </a>
              );
            })}
          </div>

          {/* Legal / links */}
          <nav className="flex flex-wrap justify-center gap-x-5 gap-y-2 text-xs font-semibold text-[#9d174d]/70">
            {[
              { label: "Pricing", href: "/pricing" },
              { label: "Privacy", href: "/privacy" },
              { label: "Terms", href: "/terms" },
              { label: "Refunds", href: "/refund" },
              { label: "Help", href: "/help" },
              { label: "FAQ", href: "/faq" },
            ].map(({ label, href }) => (
              <a key={label} href={href} className="hover:text-hotpink transition">{label}</a>
            ))}
          </nav>

          <div className="flex items-center gap-1.5 text-xs text-[#9d174d]/55">
            <span>© {new Date().getFullYear()} Bloomzein.</span>
            <span className="flex items-center gap-1">Made with love <Heart className="h-3 w-3 fill-hotpink text-hotpink" /></span>
          </div>
        </div>
      </footer>

      {iosHint && (
        <div className="fixed bottom-6 left-1/2 z-50 w-[calc(100%-2rem)] max-w-xs -translate-x-1/2 animate-fade-in">
          <div className="flex items-center gap-3 rounded-2xl bg-[#831843] px-4 py-3 shadow-xl">
            <Download className="h-4 w-4 shrink-0 text-white" />
            <p className="text-xs font-semibold leading-snug text-white">
              Sur iPhone : <span className="font-normal">Partager</span> → <span className="font-normal">Sur l'écran d'accueil</span>
            </p>
            <button onClick={() => setIosHint(false)} className="ml-auto shrink-0 text-white/70 hover:text-white" aria-label="Dismiss">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
