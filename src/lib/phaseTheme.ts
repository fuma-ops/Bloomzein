import { useEffect, useState } from "react";
import { isPremium } from "@/lib/entitlements";
import { phaseForDay, readCycleSettings, toContentPhase, hasCycleSettings } from "@/components/bloom/cyclePhase";

/**
 * Living phase theme (a Bloom+ delight) — the app's soft ambient pinks gently
 * shift HUE with the current cycle phase, so the whole app "blooms" with her.
 * Brand pinks (hotpink/magenta) and text stay fixed — this is a tint, not a
 * repaint. The actual colour work lives in styles.css (data-phase blocks); this
 * module only sets `data-phase` on <html>, reading the ONE canonical phase.
 *
 * Gated: only applies for Bloom+ users who have the setting on AND a real cycle.
 * Everyone else sees the classic Bloom pink.
 */

const KEY = "bloom:phase-theme";
export const PHASE_THEME_UPDATED = "bloom:phase-theme-updated";

/** Content phase → the CSS data-phase value (period → "menstrual"). */
const DATA_PHASE: Record<string, string> = {
  period: "menstrual", follicular: "follicular", ovulation: "ovulation", luteal: "luteal",
};

/** Default ON — the perk is opt-out, not opt-in. */
export function isPhaseThemeOn(): boolean {
  try { return localStorage.getItem(KEY) !== "off"; } catch { return true; }
}
export function setPhaseThemeOn(on: boolean): void {
  try { localStorage.setItem(KEY, on ? "on" : "off"); } catch {}
  try { window.dispatchEvent(new Event(PHASE_THEME_UPDATED)); } catch {}
  applyPhaseTheme();
}

/** Set (or clear) <html data-phase> from the canonical phase + entitlement. */
export function applyPhaseTheme(): void {
  try {
    const el = document.documentElement;
    if (isPremium() && isPhaseThemeOn() && hasCycleSettings()) {
      // Compute from settings directly (always current) rather than the cached
      // broadcast key, which can lag a phase behind.
      const c = toContentPhase(phaseForDay(new Date(), readCycleSettings()));
      const p = DATA_PHASE[c];
      if (p) el.dataset.phase = p; else delete el.dataset.phase;
    } else {
      delete el.dataset.phase;
    }
  } catch {}
}

/** Live setting value for the toggle UI. */
export function usePhaseThemeOn(): boolean {
  const [on, setOn] = useState(isPhaseThemeOn());
  useEffect(() => {
    const r = () => setOn(isPhaseThemeOn());
    window.addEventListener(PHASE_THEME_UPDATED, r);
    window.addEventListener("storage", r);
    return () => { window.removeEventListener(PHASE_THEME_UPDATED, r); window.removeEventListener("storage", r); };
  }, []);
  return on;
}
