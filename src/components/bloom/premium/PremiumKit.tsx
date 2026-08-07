import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Sparkles, X, Check, Lock, Crown, ChevronRight, Utensils, Flame, Dumbbell, Flower2, CreditCard, Loader2 } from "lucide-react";
import { isPremium, setPlan, usePremium, openPaywall, OPEN_PAYWALL, type PaywallFeature } from "@/lib/entitlements";
import { trackEvent } from "@/lib/analytics";
import { PADDLE_CONFIGURED, openCheckout, openCustomerPortal, fetchLocalizedPrices, refreshEntitlement, type LocalizedPrices } from "@/lib/paddle";
import { useAuth } from "@/contexts/AuthContext";

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
  const [prices, setPrices] = useState<LocalizedPrices>({ monthly: null, annual: null });
  const { user } = useAuth();

  // Localized prices from Paddle (auto-detected currency). Falls back to the
  // static copy below until they resolve, so the sheet is never blank.
  useEffect(() => {
    let alive = true;
    fetchLocalizedPrices()
      .then((p) => alive && setPrices(p))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  const startTrial = () => {
    const plan = annual ? "annual" : "monthly";
    trackEvent("begin_checkout", { plan, value: annual ? 59 : 9.99, currency: "USD" });

    // Real billing: open Paddle's overlay checkout with her user_id attached,
    // so the webhook can flip her to Bloom+ after payment.
    if (PADDLE_CONFIGURED) {
      void openCheckout(plan, { userId: user?.id, email: user?.email });
      return;
    }

    // Not configured yet (before the Paddle product is live): instant unlock so
    // the app stays fully testable. The webhook replaces this once billing is set up.
    setPlan("plus");
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
                <p className="font-black text-hotpink leading-none mt-0.5">{prices.monthly ?? "$9.99"}<span className="text-[10px] font-bold text-rose/50">/mo</span></p>
              </button>
              <button onClick={() => setAnnual(true)} className={["relative rounded-2xl border p-2.5 text-center transition active:scale-95", annual ? "border-hotpink bg-hotpink/5" : "border-petal/60 bg-white"].join(" ")}>
                <span className="absolute -top-2 right-2 rounded-full px-1.5 py-0.5 text-[8px] font-black uppercase tracking-wide text-white" style={{ background: GOLD }}>Save 51%</span>
                <p className="text-[10px] font-bold uppercase tracking-wide text-rose/50">Yearly</p>
                <p className="font-black text-hotpink leading-none mt-0.5">{prices.annual ?? "$59"}<span className="text-[10px] font-bold text-rose/50">/yr</span></p>
              </button>
            </div>

            <button onClick={startTrial} className="bloom-luxury-btn hover-scale animate-cta-bounce mt-4 inline-flex w-full items-center justify-center gap-1.5 rounded-full py-3 text-sm font-bold text-white">
              <Sparkles className="h-4 w-4" strokeWidth={2} /> Start 7-day free trial
            </button>
            <p className="mt-1.5 text-center text-[10px] text-rose/50">Then {annual ? `${prices.annual ?? "$59"}/year` : `${prices.monthly ?? "$9.99"}/month`} · <a href="/refund" target="_blank" rel="noopener noreferrer" className="underline decoration-rose/30 underline-offset-2 hover:text-hotpink">cancel anytime</a></p>
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

/* ─── Post-checkout return ────────────────────────────────────────────────
 * Paddle returns the buyer to the app (?checkout=success) after payment; the
 * old ?welcome=plus link still works too. The webhook flips her to Bloom+
 * server-side, but it can land a
 * moment later — so here we poll the entitlement for a few seconds, then show
 * a warm "welcome to Bloom+" celebration once it's active. Mount once (AppShell).
 */
export function PlusReturn() {
  const { user } = useAuth();
  const premium = usePremium();
  const [phase, setPhase] = useState<"idle" | "activating" | "done" | "slow">("idle");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("welcome") !== "plus" && params.get("checkout") !== "success") return;
    // clean the URL so a refresh doesn't re-trigger it
    params.delete("welcome"); params.delete("checkout");
    const clean = window.location.pathname + (params.toString() ? `?${params}` : "");
    window.history.replaceState({}, "", clean);

    if (isPremium()) { setPhase("done"); return; }
    setPhase("activating");
    let tries = 0;
    const tick = async () => {
      if (user?.id) await refreshEntitlement(user.id);
      if (isPremium()) { setPhase("done"); return; }
      if (++tries >= 12) { setPhase("slow"); return; }   // ~30s of polling
      timer = window.setTimeout(tick, 2500);
    };
    let timer = window.setTimeout(tick, 1500);
    return () => window.clearTimeout(timer);
  }, [user?.id]);

  // once premium arrives during the "activating"/"slow" wait, celebrate
  useEffect(() => { if (premium && (phase === "activating" || phase === "slow")) setPhase("done"); }, [premium, phase]);

  if (phase === "idle") return null;

  return createPortal(
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4" onClick={() => phase !== "activating" && setPhase("idle")}>
      <div className="absolute inset-0 bg-rose/30 backdrop-blur-sm animate-fade-in" />
      <div onClick={(e) => e.stopPropagation()} className="relative w-full max-w-sm overflow-hidden rounded-[2rem] bg-white p-7 text-center shadow-2xl shadow-hotpink/30 animate-scale-in">
        <span className="mx-auto mb-3 grid h-16 w-16 place-items-center rounded-2xl text-white animate-icon-breathe" style={{ background: `linear-gradient(135deg, ${GOLD}, #EC4899)` }}>
          {phase === "done" ? <Crown className="h-8 w-8" strokeWidth={1.8} /> : <Sparkles className="h-8 w-8 animate-spin" strokeWidth={1.8} />}
        </span>
        {phase === "done" ? (
          <>
            <h2 className="font-script text-3xl text-hotpink">Welcome to Bloom+ ✿</h2>
            <p className="mt-2 text-sm text-rose/80">Your payment went through and everything's unlocked. Enjoy your softest era 🌸</p>
            <button onClick={() => setPhase("idle")} className="bloom-luxury-btn hover-scale mt-5 inline-flex w-full items-center justify-center gap-1.5 rounded-full py-3 text-sm font-bold text-white">
              <Sparkles className="h-4 w-4" strokeWidth={2} /> Start blooming
            </button>
          </>
        ) : phase === "slow" ? (
          <>
            <h2 className="font-script text-2xl text-hotpink">Almost there…</h2>
            <p className="mt-2 text-sm text-rose/80">Your payment was received 💛 Bloom+ is activating — it can take a minute. Pull to refresh if it's not on yet.</p>
            <button onClick={() => setPhase("idle")} className="mt-5 inline-flex w-full items-center justify-center rounded-full border border-petal/60 py-3 text-sm font-semibold text-rose">Got it</button>
          </>
        ) : (
          <>
            <h2 className="font-script text-2xl text-hotpink">Activating Bloom+…</h2>
            <p className="mt-2 text-sm text-rose/80">Thank you 💛 We're unlocking everything for you now.</p>
          </>
        )}
      </div>
    </div>,
    document.body,
  );
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

/* ─── Manage subscription — opens the Paddle-hosted customer portal ───
   Shown only to Bloom+ members. Update card, view invoices, or cancel. */
export function ManageSubscription() {
  const premium = usePremium();
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState(false);
  if (!premium) return null;

  const open = async () => {
    setLoading(true);
    setErr(false);
    try {
      await openCustomerPortal();
    } catch {
      setErr(true);
      setLoading(false);
    }
  };

  return (
    <div className="rounded-3xl border p-4" style={{ borderColor: `${GOLD}44`, background: "linear-gradient(160deg,#FFF7FA,#FFFFFF)" }}>
      <button
        onClick={open}
        disabled={loading}
        className="group flex w-full items-center gap-3 text-left transition active:scale-[0.99] disabled:opacity-70"
      >
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl text-white" style={{ background: `linear-gradient(135deg, ${GOLD}, #EC4899)` }}>
          {loading ? <Loader2 className="h-5 w-5 animate-spin" strokeWidth={2} /> : <CreditCard className="h-5 w-5" strokeWidth={1.8} />}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-hotpink">Manage subscription</p>
          <p className="text-[11.5px] text-rose/70 leading-snug">Update your card, view invoices, or cancel — anytime.</p>
        </div>
        <ChevronRight className="h-5 w-5 shrink-0 text-hotpink transition group-hover:translate-x-0.5" />
      </button>
      {err && <p className="mt-2 text-[11px] text-rose/70">Couldn't open the billing portal just now — please try again.</p>}
    </div>
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
      {/* Cap the blurred teaser so a tall locked section (e.g. the health history)
          doesn't push the "why is this locked" CTA far below the fold — it stays a
          short preview with the unlock message centred in view. */}
      {children
        ? <div className="pointer-events-none select-none blur-[3px] opacity-60 max-h-[340px] overflow-hidden">{children}</div>
        : <div className={["w-full", minH || "min-h-[150px]"].join(" ")} style={{ background: "linear-gradient(160deg,#FFF1F6,#FCE7F3)" }} />}
      <button
        onClick={() => openPaywall(feature)}
        className="absolute inset-0 grid place-items-center bg-white/55 backdrop-blur-[2px] transition active:scale-[0.99]"
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
