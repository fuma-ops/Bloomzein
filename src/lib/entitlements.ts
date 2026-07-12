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

export function readPlan(): Plan {
  try { return localStorage.getItem(KEY) === "plus" ? "plus" : "free"; } catch { return "free"; }
}
export function isPremium(): boolean { return readPlan() === "plus"; }

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
