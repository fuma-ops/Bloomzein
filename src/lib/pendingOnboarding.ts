// Anonymous → account handoff for the value-first onboarding funnel.
//
// Anyone can complete onboarding WITHOUT an account: their tool setup writes to
// localStorage as usual, but the profile fields (name/age/weight) can't reach
// Supabase yet. We stash them here, plus any "start the trial" intent, and apply
// both the moment they sign up on the plan-result CTA (see AuthGate).

export const PENDING_PROFILE_KEY = "bloom:pending-profile";
export const PENDING_TRIAL_KEY = "bloom:pending-trial";

export type PendingProfile = {
  setup_done?: boolean;
  name?: string;
  age?: number;
  weight?: number;
  weight_unit?: "kg" | "lbs";
};

export type PendingTrial = { billing: "monthly" | "annual" };

export function readPendingProfile(): PendingProfile | null {
  try {
    const raw = localStorage.getItem(PENDING_PROFILE_KEY);
    return raw ? (JSON.parse(raw) as PendingProfile) : null;
  } catch {
    return null;
  }
}

export function clearPendingProfile(): void {
  try { localStorage.removeItem(PENDING_PROFILE_KEY); } catch { /* ignore */ }
}

export function setPendingTrial(billing: "monthly" | "annual"): void {
  try { localStorage.setItem(PENDING_TRIAL_KEY, JSON.stringify({ billing })); } catch { /* ignore */ }
}

export function readPendingTrial(): PendingTrial | null {
  try {
    const raw = localStorage.getItem(PENDING_TRIAL_KEY);
    return raw ? (JSON.parse(raw) as PendingTrial) : null;
  } catch {
    return null;
  }
}

export function clearPendingTrial(): void {
  try { localStorage.removeItem(PENDING_TRIAL_KEY); } catch { /* ignore */ }
}
