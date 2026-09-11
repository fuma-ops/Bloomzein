// Anonymous → account handoff for the value-first onboarding funnel.
//
// Anyone can complete onboarding WITHOUT an account: their tool setup writes to
// localStorage as usual, but the profile fields (name/age/weight) can't reach
// Supabase yet. We stash them here and apply them the moment they sign up on the
// plan-result CTA (see AuthGate); the mandatory subscribe wall then takes over.

export const PENDING_PROFILE_KEY = "bloom:pending-profile";

export type PendingProfile = {
  setup_done?: boolean;
  name?: string;
  age?: number;
  weight?: number;
  weight_unit?: "kg" | "lbs";
};

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
