// =============================================================================
// TrialPreviewHost — the new-user 10-minute Bloom+ preview.
// A brand-new free user lands in the app with EVERYTHING unlocked for 10 minutes
// (isPremium() reports true via the preview window). When it ends, a warm modal
// invites her to start a free trial, subscribe, or stay free — the last re-locks
// premium through the normal paywall system. Mounted once in AppShell.
// =============================================================================
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Sparkles, Crown, X, Check } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { isOnboarded } from "@/lib/guidedSetup";
import { notify } from "@/lib/notify";
import { openCheckout } from "@/lib/paddle";
import {
  readPlan, isOwnerEmail, openPaywall,
  previewStarted, previewResolved, previewEndsAt, startTrialPreview, resolvePreview,
  PLAN_UPDATED,
} from "@/lib/entitlements";

export function TrialPreviewHost() {
  const { user } = useAuth();
  const [ended, setEnded] = useState(false);

  useEffect(() => {
    // Only for a signed-in, onboarded, free (non-owner) user who hasn't resolved.
    if (!user || isOwnerEmail(user.email) || readPlan() === "plus" || !isOnboarded() || previewResolved()) return;

    // Start the one-shot preview the first time she reaches the app.
    if (!previewStarted()) {
      if (startTrialPreview(10)) {
        notify({
          title: "Bloom+ unlocked for 10 minutes ✨",
          body: "Explore everything — every tool, no limits. Enjoy 🌸",
          tone: "bloom", duration: 6500,
        });
      }
    }

    // Schedule the end-of-preview moment (or show it now if we came back after it).
    const ms = previewEndsAt() - Date.now();
    if (ms <= 0) { setEnded(true); return; }
    const t = window.setTimeout(() => {
      try { window.dispatchEvent(new Event(PLAN_UPDATED)); } catch { /* ignore */ }
      setEnded(true);
    }, ms);
    return () => window.clearTimeout(t);
  }, [user]);

  if (!ended) return null;

  const email = user?.email ?? null;
  const userId = user?.id ?? null;

  const startTrial = () => {
    resolvePreview();
    setEnded(false);
    openCheckout("annual", { userId, email }).catch(() => { /* she can retry from the paywall */ });
  };
  const seePlans = () => { resolvePreview(); setEnded(false); openPaywall("general"); };
  const stayFree = () => {
    resolvePreview();
    setEnded(false);
    notify({ title: "You're on the free plan 🌸", body: "Premium tools are ready whenever you are.", tone: "info", duration: 4200 });
  };

  const perks = [
    "Your whole week of meals, auto-planned",
    "Full workout & yoga programs",
    "Energy engine — targets, macros & timeline",
    "Long-term mood & progress insights",
  ];

  return createPortal(
    <div className="fixed inset-0 z-[190] grid place-items-center p-4" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-rose/30 backdrop-blur-sm animate-fade-in" />
      <div className="relative w-full max-w-sm overflow-hidden rounded-[2rem] bg-white p-6 text-center shadow-2xl shadow-hotpink/30 animate-scale-in">
        <button onClick={stayFree} aria-label="Close" className="absolute right-3.5 top-3.5 grid h-8 w-8 place-items-center rounded-full text-rose/40 transition hover:bg-rose/10 hover:text-rose/70">
          <X className="h-4 w-4" />
        </button>

        <span className="mx-auto mb-3 grid h-16 w-16 place-items-center rounded-2xl text-white animate-icon-breathe" style={{ background: "linear-gradient(135deg,#B76E79,#EC4899)" }}>
          <Crown className="h-8 w-8" strokeWidth={1.8} />
        </span>
        <p className="text-[11px] font-black uppercase tracking-[0.2em]" style={{ color: "#B76E79" }}>Your Bloom+ preview</p>
        <h2 className="mt-0.5 font-script text-[2.1rem] leading-none text-hotpink">That was Bloom+ ✨</h2>
        <p className="mx-auto mt-2 max-w-[19rem] text-[13.5px] font-semibold leading-snug text-rose/75">
          You just had everything unlocked for 10 minutes. Keep your whole world open:
        </p>

        <div className="mt-3.5 rounded-[1.3rem] bg-blush/40 p-3.5 text-left">
          <ul className="space-y-1.5">
            {perks.map((p) => (
              <li key={p} className="flex items-start gap-2">
                <span className="mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full bg-hotpink"><Check className="h-2.5 w-2.5 text-white" strokeWidth={4} /></span>
                <span className="text-[12.5px] font-semibold leading-snug text-rose/85">{p}</span>
              </li>
            ))}
          </ul>
        </div>

        <button onClick={startTrial} className="bloom-luxury-btn animate-cta-bounce mt-4 flex w-full items-center justify-center gap-2 py-3.5 text-[16px] font-bold text-white">
          <Sparkles className="h-5 w-5" /> Start my 3-day free trial
        </button>
        <button onClick={seePlans} className="mt-2 w-full rounded-2xl border border-hotpink/30 bg-white/60 py-2.5 text-[14px] font-bold text-hotpink transition active:scale-[0.99]">
          See plans &amp; subscribe
        </button>
        <button onClick={stayFree} className="mt-2 w-full py-1.5 text-[13px] font-bold text-rose/55 transition hover:text-rose/80">
          Continue with the free version
        </button>
        <p className="mt-1.5 flex items-center justify-center gap-1.5 text-[11px] font-semibold text-rose/55">
          <Check className="h-3.5 w-3.5 text-emerald-500" strokeWidth={3} /> 3-day free trial · cancel anytime
        </p>
      </div>
    </div>,
    document.body,
  );
}
