// =============================================================================
// TrialPreviewHost — the new-user 10-minute Bloom+ preview.
// Every brand-new user lands in the app with EVERYTHING unlocked for 10 minutes
// (isPremium() reports true via the preview window). When it ends we fire
// PLAN_UPDATED so the app re-evaluates the paywall gate and the mandatory
// subscribe wall takes over — there's no free app access after the preview.
// Mounted once in AppShell.
// =============================================================================
import { useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { isOnboarded } from "@/lib/guidedSetup";
import { notify } from "@/lib/notify";
import {
  readPlan, isOwnerEmail,
  previewStarted, previewEndsAt, startTrialPreview,
  PLAN_UPDATED,
} from "@/lib/entitlements";

export function TrialPreviewHost() {
  const { user } = useAuth();

  useEffect(() => {
    // Only for a signed-in, onboarded, free (non-owner) user.
    if (!user || isOwnerEmail(user.email) || readPlan() === "plus" || !isOnboarded()) return;

    // Start the one-shot 10-minute preview the first time she reaches the app.
    if (!previewStarted()) {
      if (startTrialPreview(10)) {
        notify({
          title: "Bloom+ unlocked for 10 minutes ✨",
          body: "Explore everything — every tool, no limits. Enjoy 🌸",
          tone: "bloom", duration: 6500,
        });
      }
    }

    // When the window closes, nudge the app to re-check entitlements so the
    // mandatory subscribe wall appears (isPremium() drops to false at expiry).
    const ms = previewEndsAt() - Date.now();
    const fire = () => { try { window.dispatchEvent(new Event(PLAN_UPDATED)); } catch { /* ignore */ } };
    if (ms <= 0) { fire(); return; }
    const t = window.setTimeout(fire, ms);
    return () => window.clearTimeout(t);
  }, [user]);

  return null;
}
