import { useEffect, useState } from "react";

/**
 * Bloom+ entitlements — the ONE source of truth for whether the user is on the
 * free plan or premium (Bloom+). Every tool reads premium status THROUGH here,
 * never its own copy (mirrors the cyclePhase / crossToolData pattern).
 *
 * For now the plan lives in localStorage so free-vs-premium behaviour is fully
 * testable (flip it with the dev switch on the Me page). When real billing is
 * wired later — Stripe on web, or RevenueCat across web + iOS + Android — only
 * `readPlan` changes to read the server entitlement; every gate stays the same.
 */
export type Plan = "free" | "plus";

const KEY = "bloom:plan";
export const PLAN_UPDATED = "bloom:plan-updated";
export const OPEN_PAYWALL = "bloom:open-paywall";

/**
 * Accounts that always have Bloom+ regardless of billing — the owner/founder
 * (and any teammate we add here). Checked by `refreshEntitlement` on every
 * sign-in, so premium follows the ACCOUNT across every device, in sandbox and
 * production alike. Emails are compared case-insensitively.
 */
export const OWNER_EMAILS = ["khfuma@gmail.com"];
export function isOwnerEmail(email: string | null | undefined): boolean {
  const e = String(email ?? "").trim().toLowerCase();
  return !!e && OWNER_EMAILS.some((o) => o.toLowerCase() === e);
}

export function readPlan(): Plan {
  try { return localStorage.getItem(KEY) === "plus" ? "plus" : "free"; } catch { return "free"; }
}

/* ── New-user 10-minute Bloom+ preview ──────────────────────────────────────
 * A brand-new free user gets the whole app unlocked for 10 minutes, then a warm
 * modal invites her to start a trial / subscribe / stay free (which re-locks the
 * premium features via the normal paywall). We DON'T touch the stored plan — we
 * just make isPremium() report true while the preview window is open, so real
 * billing (refreshEntitlement) never fights it. The window is one-shot: the key
 * persists even once expired, so it never restarts. */
const PREVIEW_KEY = "bloom:trial-preview-until";        // ms epoch the window ends
const PREVIEW_RESOLVED_KEY = "bloom:trial-preview-done"; // "1" once she's chosen
export const PREVIEW_UPDATED = "bloom:trial-preview-updated";

/** ms epoch the preview ends (0 if never started). */
export function previewEndsAt(): number {
  try { return Number(localStorage.getItem(PREVIEW_KEY) || 0) || 0; } catch { return 0; }
}
/** True while the 10-minute preview window is currently open. */
export function previewActive(): boolean { return previewEndsAt() > Date.now(); }
/** True once the preview has ever been started (even if now expired). */
export function previewStarted(): boolean { return previewEndsAt() > 0; }
/** True once she has resolved the end-of-preview choice. */
export function previewResolved(): boolean {
  try { return localStorage.getItem(PREVIEW_RESOLVED_KEY) === "1"; } catch { return false; }
}
/** Start the one-shot preview. Returns false if it already ran once. */
export function startTrialPreview(minutes = 10): boolean {
  try {
    if (localStorage.getItem(PREVIEW_KEY)) return false;
    localStorage.setItem(PREVIEW_KEY, String(Date.now() + minutes * 60_000));
  } catch { return false; }
  try { window.dispatchEvent(new Event(PLAN_UPDATED)); } catch {}
  try { window.dispatchEvent(new Event(PREVIEW_UPDATED)); } catch {}
  return true;
}
/** Mark the end-of-preview choice as made, and re-lock (fires PLAN_UPDATED). */
export function resolvePreview(): void {
  try { localStorage.setItem(PREVIEW_RESOLVED_KEY, "1"); } catch {}
  try { window.dispatchEvent(new Event(PLAN_UPDATED)); } catch {}
  try { window.dispatchEvent(new Event(PREVIEW_UPDATED)); } catch {}
}

export function isPremium(): boolean { return readPlan() === "plus" || previewActive(); }

/** Flip the plan (dev/testing today; the billing webhook writes this later). */
export function setPlan(plan: Plan): void {
  try { localStorage.setItem(KEY, plan); } catch {}
  try { window.dispatchEvent(new Event(PLAN_UPDATED)); } catch {}
}

/** Live premium status for components — re-renders when the plan flips. */
export function usePremium(): boolean {
  const [p, setP] = useState(isPremium());
  useEffect(() => {
    const r = () => setP(isPremium());
    window.addEventListener(PLAN_UPDATED, r);
    window.addEventListener("storage", r);
    return () => { window.removeEventListener(PLAN_UPDATED, r); window.removeEventListener("storage", r); };
  }, []);
  return p;
}

/** Which Bloom+ moment triggered the paywall — themes its headline. */
export type PaywallFeature = "meals" | "diet" | "workout" | "yoga" | "coach" | "cycle" | "budget" | "me" | "general";

/** Open the app-wide paywall, themed to the feature she reached for. */
export function openPaywall(feature: PaywallFeature = "general"): void {
  try { window.dispatchEvent(new CustomEvent(OPEN_PAYWALL, { detail: feature })); } catch {}
}

/** Run a premium action, or open the paywall if she's on the free plan. */
export function withPremium(feature: PaywallFeature, action: () => void): void {
  if (isPremium()) action();
  else openPaywall(feature);
}
