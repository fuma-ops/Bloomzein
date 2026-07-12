import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Sparkles, X, Check, Lock, Crown, ChevronRight, Utensils, Flame, Dumbbell, Flower2 } from "lucide-react";
import { isPremium, setPlan, usePremium, openPaywall, OPEN_PAYWALL, type PaywallFeature } from "@/lib/entitlements";

/* Rose-gold is the single "premium" note, distinct from the app's hotpink. */
const GOLD = "#B76E79";

/* Feature-themed headline — what she'd unlock the moment she reached for it. */
const HEADLINES: Record<PaywallFeature, string> = {
  meals:   "Let me cook your whole week — 7 days of meals, tuned to your cycle & goal.",
  diet:    "Unlock your real numbers — a precise daily target, macros & your goal timeline.",
  workout: "Full phase-synced programs, built around your body.",
  yoga:    "Every flow & program, gently synced to your cycle.",
  coach:   "Your deeper coach — daily guidance and a peek at tomorrow.",
  cycle:   "Your long-term trends & insights, read from your whole history.",
  budget:  "Goals, insights and your whole money picture.",
  me:      "Your full glow dashboard — consistency, mood & progress over time.",
  general: "Bloom your whole week ✿",
};

const BENEFITS = [
  { Icon: Utensils, text: "Your whole week of meals, auto-planned & shoppable" },
  { Icon: Flame,    text: "Real energy engine — target, macros, eat-back & goal timeline" },
  { Icon: Dumbbell, text: "Full workout & yoga programs, matched to your phase" },
  { Icon: Sparkles, text: "Everything synced to your cycle & goal — one living plan" },
];

/* ─────────────────────────── The paywall sheet ─────────────────────────── */
export function PaywallSheet({ feature = "general", onClose }: { feature?: PaywallFeature; onClose: () => void }) {
  const [annual, setAnnual] = useState(true);
  const [done, setDone] = useState(false);

  const startTrial = () => {
    setPlan("plus"); // testing: unlocks instantly. (Billing webhook writes this later.)
    setDone(true);
    setTimeout(onClose, 1400);
  };

  return createPortal(
    <div className="fixed inset-0 z-[140] flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-rose/30 backdrop-blur-sm animate-fade-in" />
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-sm overflow-hidden rounded-[2rem] bg-white shadow-2xl shadow-hotpink/30 animate-scale-in"
      >
        {/* soft premium header wash */}
        <div className="relative px-6 pt-6 pb-5 text-center" style={{ background: `linear-gradient(160deg, #FFF1F6, #FCE7F3)` }}>
          <button onClick={onClose} aria-label="Close" className="absolute right-3 top-3 grid h-7 w-7 place-items-center rounded-full bg-white/70 text-rose/60 transition hover:text-hotpink active:scale-90">
            <X className="h-4 w-4" />
          </button>
          <span className="mx-auto mb-2 grid h-14 w-14 place-items-center rounded-2xl text-white animate-icon-breathe" style={{ background: `linear-gradient(135deg, ${GOLD}, #EC4899)` }}>
            <Crown className="h-7 w-7" strokeWidth={1.8} />
          </span>
          <p className="text-[10px] font-black uppercase tracking-[0.2em]" style={{ color: GOLD }}>Bloom+ Premium</p>
          <h2 className="mt-1 font-script text-3xl leading-tight text-hotpink">Bloom your whole week</h2>
          <p className="mt-1.5 text-[12.5px] leading-snug text-rose/75">{HEADLINES[feature]}</p>
        </div>

        {done ? (
          <div className="px-6 py-8 text-center animate-fade-in">
            <span className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-full bg-emerald-500 text-white animate-icon-breathe"><Check className="h-6 w-6" strokeWidth={3} /></span>
            <p className="font-script text-2xl text-hotpink">You're Bloom+ ✿</p>
            <p className="mt-1 text-[12px] text-rose/70">Everything's unlocked — enjoy your full bloom.</p>
          </div>
        ) : (
          <div className="px-6 pb-6 pt-4">
            <ul className="space-y-2.5">
              {BENEFITS.map(({ Icon, text }) => (
                <li key={text} className="flex items-start gap-2.5 text-[12.5px] leading-snug text-[#831843]">
                  <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-hotpink/10 text-hotpink"><Icon className="h-3 w-3" strokeWidth={2.4} /></span>
                  {text}
                </li>
              ))}
            </ul>

            {/* price toggle */}
            <div className="mt-4 grid grid-cols-2 gap-2">
              <button onClick={() => setAnnual(false)} className={["rounded-2xl border p-2.5 text-center transition active:scale-95", !annual ? "border-hotpink bg-hotpink/5" : "border-petal/60 bg-white"].join(" ")}>
                <p className="text-[10px] font-bold uppercase tracking-wide text-rose/50">Monthly</p>
                <p className="font-black text-hotpink leading-none mt-0.5">$9.99<span className="text-[10px] font-bold text-rose/50">/mo</span></p>
              </button>
              <button onClick={() => setAnnual(true)} className={["relative rounded-2xl border p-2.5 text-center transition active:scale-95", annual ? "border-hotpink bg-hotpink/5" : "border-petal/60 bg-white"].join(" ")}>
                <span className="absolute -top-2 right-2 rounded-full px-1.5 py-0.5 text-[8px] font-black uppercase tracking-wide text-white" style={{ background: GOLD }}>Save 51%</span>
                <p className="text-[10px] font-bold uppercase tracking-wide text-rose/50">Yearly</p>
                <p className="font-black text-hotpink leading-none mt-0.5">$59<span className="text-[10px] font-bold text-rose/50">/yr</span></p>
              </button>
            </div>

            <button onClick={startTrial} className="bloom-luxury-btn hover-scale animate-cta-bounce mt-4 inline-flex w-full items-center justify-center gap-1.5 rounded-full py-3 text-sm font-bold text-white">
              <Sparkles className="h-4 w-4" strokeWidth={2} /> Start 7-day free trial
            </button>
            <p className="mt-1.5 text-center text-[10px] text-rose/50">Then {annual ? "$59/year · founder price $39 for early bloomers" : "$9.99/month"} · cancel anytime</p>
            <button onClick={onClose} className="mt-1.5 w-full text-center text-[11px] font-semibold text-rose/45 transition hover:text-hotpink">Maybe later</button>
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}

/* ─── Global host — mount once (AppShell). Any openPaywall() shows the sheet ─ */
export function PaywallHost() {
  const [feature, setFeature] = useState<PaywallFeature | null>(null);
  useEffect(() => {
    const onOpen = (e: Event) => setFeature(((e as CustomEvent).detail as PaywallFeature) || "general");
    window.addEventListener(OPEN_PAYWALL, onOpen);
    return () => window.removeEventListener(OPEN_PAYWALL, onOpen);
  }, []);
  if (!feature) return null;
  return <PaywallSheet feature={feature} onClose={() => setFeature(null)} />;
}

/* ─── A small "Bloom+" chip to mark a locked/premium feature (curiosity) ─── */
export function PremiumBadge({ className = "" }: { className?: string }) {
  return (
    <span
      className={["inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[8px] font-black uppercase tracking-wide text-white", className].join(" ")}
      style={{ background: `linear-gradient(135deg, ${GOLD}, #EC4899)` }}
    >
      <Sparkles className="h-2.5 w-2.5" strokeWidth={2.6} /> Bloom+
    </span>
  );
}

/* A tiny lock chip — put on a gated button so free users see it's premium. */
export function LockChip() {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-white/25 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wide text-white">
      <Lock className="h-2.5 w-2.5" strokeWidth={2.6} /> Bloom+
    </span>
  );
}

/* ─── A soft, glowing upsell card to place on Today / Me (curiosity hook) ── */
export function DiscoverBloomPlus({ feature = "general" }: { feature?: PaywallFeature }) {
  const premium = usePremium();
  if (premium) {
    return (
      <div className="flex items-center gap-3 rounded-3xl border p-4" style={{ borderColor: `${GOLD}55`, background: "linear-gradient(160deg,#FFF7FA,#FFFFFF)" }}>
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl text-white" style={{ background: `linear-gradient(135deg, ${GOLD}, #EC4899)` }}><Crown className="h-5 w-5" strokeWidth={1.8} /></span>
        <div className="min-w-0">
          <p className="text-sm font-bold text-hotpink">You're Bloom+ ✿</p>
          <p className="text-[11.5px] text-rose/70 leading-snug">Every tool is fully unlocked — bloom on.</p>
        </div>
      </div>
    );
  }
  return (
    <button
      onClick={() => openPaywall(feature)}
      className="group w-full text-left flex items-center gap-3 rounded-3xl border p-4 transition hover:-translate-y-0.5 active:scale-[0.99] animate-selected-glow"
      style={{ borderColor: `${GOLD}66`, background: "linear-gradient(160deg,#FFF1F6,#FCE7F3)" }}
    >
      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl text-white animate-icon-breathe" style={{ background: `linear-gradient(135deg, ${GOLD}, #EC4899)` }}>
        <Crown className="h-5 w-5" strokeWidth={1.8} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-1.5 text-sm font-bold text-hotpink">Discover Bloom+ <PremiumBadge /></p>
        <p className="text-[11.5px] text-rose/75 leading-snug">Let me plan your whole week — meals, movement &amp; energy, all synced to your cycle.</p>
      </div>
      <ChevronRight className="h-5 w-5 shrink-0 text-hotpink" />
    </button>
  );
}

/* ─── Dev/testing switch: flip Free ↔ Bloom+ to feel both experiences ─── */
export function PlanToggle() {
  const premium = usePremium();
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-dashed border-hotpink/40 bg-white/60 p-3">
      <Flower2 className="h-4 w-4 shrink-0 text-hotpink" />
      <div className="min-w-0 flex-1">
        <p className="text-[12px] font-bold text-[#831843]">Testing as: {premium ? "Bloom+ ✨" : "Free"}</p>
        <p className="text-[10.5px] text-rose/60 leading-snug">Flip to feel the free vs premium experience.</p>
      </div>
      <button
        onClick={() => setPlan(premium ? "free" : "plus")}
        aria-label="Toggle plan"
        className={["relative h-6 w-11 shrink-0 rounded-full transition-colors", premium ? "bg-hotpink" : "bg-rose/25"].join(" ")}
      >
        <span className="absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all" style={{ left: premium ? "1.375rem" : "0.125rem" }} />
      </button>
    </div>
  );
}

/* ─── PlusLock — teaser-lock a whole surface for free users (Pattern B) ───
   Premium users get the real children; free users see them blurred behind a
   soft rose-gold lock cluster that opens the paywall. Reuses the phase
   locked-peek aesthetic. Use for "see-but-can't-touch" premium sections. */
export function PlusLock({
  feature = "general", title, blurb, children, className = "", minH = "",
}: {
  feature?: PaywallFeature;
  title: string;
  blurb?: string;
  children?: React.ReactNode;
  className?: string;
  /** Min height when there are no children to give the lock room (e.g. "min-h-[168px]"). */
  minH?: string;
}) {
  const premium = usePremium();
  if (premium) return <>{children}</>;
  return (
    <div className={["relative overflow-hidden rounded-[1.5rem]", minH, className].join(" ")}>
      {children
        ? <div className="pointer-events-none select-none blur-[3px] opacity-60">{children}</div>
        : <div className={["w-full", minH || "min-h-[150px]"].join(" ")} style={{ background: "linear-gradient(160deg,#FFF1F6,#FCE7F3)" }} />}
      <button
        onClick={() => openPaywall(feature)}
        className="absolute inset-0 grid place-items-center bg-white/45 backdrop-blur-[1px] transition active:scale-[0.99]"
      >
        <div className="text-center px-5">
          <span className="mx-auto grid h-11 w-11 place-items-center rounded-2xl text-white shadow-md animate-icon-breathe" style={{ background: `linear-gradient(135deg, ${GOLD}, #EC4899)` }}>
            <Lock className="h-5 w-5" strokeWidth={2} />
          </span>
          <div className="mt-2 flex justify-center"><PremiumBadge /></div>
          <p className="mt-1.5 font-script text-2xl text-hotpink leading-none">{title}</p>
          {blurb && <p className="mt-1 text-[12px] text-rose/75 leading-snug max-w-[15rem] mx-auto">{blurb}</p>}
          <span className="mt-2.5 inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-[12px] font-bold text-white shadow" style={{ background: `linear-gradient(135deg, ${GOLD}, #EC4899)` }}>
            <Sparkles className="h-3.5 w-3.5" strokeWidth={2.2} /> Unlock with Bloom+ ✿
          </span>
        </div>
      </button>
    </div>
  );
}
