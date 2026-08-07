/**
 * Lemon Squeezy billing — the client side of Bloom+.
 *
 * Two jobs:
 *  1. Build the hosted-checkout URL the paywall redirects to (with the buyer's
 *     user_id + email attached so the webhook can link the purchase back).
 *  2. `refreshEntitlement` — after login, read the user's real subscription from
 *     the (webhook-written) `subscriptions` table and reflect it into the plan,
 *     so premium follows the *server*, not a spoofable localStorage value.
 *
 * ── SET-UP ──────────────────────────────────────────────────────────────────
 * After you create the Bloom+ product in Lemon Squeezy, paste your store slug
 * and the two variant IDs below. They're public (they live in the checkout URL),
 * so it's safe to commit them.
 */
import { supabase } from "./supabase";
import { setPlan } from "./entitlements";

/** e.g. store URL is https://bloomzein.lemonsqueezy.com → slug is "bloomzein". */
export const LS_STORE = "YOUR_STORE_SLUG";

/** The variant id of each plan (Lemon Squeezy → Product → Variant → its id). */
export const LS_VARIANTS = {
  monthly: "YOUR_MONTHLY_VARIANT_ID",
  annual: "YOUR_ANNUAL_VARIANT_ID",
} as const;

/** True once you've filled the store + variant ids above. Until then the paywall
 *  keeps the instant-unlock dev behaviour so the app stays testable. */
export const LS_CONFIGURED =
  LS_STORE !== "YOUR_STORE_SLUG" &&
  !Object.values(LS_VARIANTS).some((v) => v.startsWith("YOUR_"));

/** Hosted-checkout URL for a plan, with the buyer linked via custom data. */
export function checkoutUrl(
  plan: "monthly" | "annual",
  opts: { userId?: string | null; email?: string | null } = {},
): string {
  const base = `https://${LS_STORE}.lemonsqueezy.com/checkout/buy/${LS_VARIANTS[plan]}`;
  const p = new URLSearchParams();
  if (opts.email) p.set("checkout[email]", opts.email);
  if (opts.userId) p.set("checkout[custom][user_id]", opts.userId);
  const qs = p.toString();
  return qs ? `${base}?${qs}` : base;
}

/**
 * Pull the server-side entitlement for the logged-in user and reflect it into
 * the plan flag the whole app reads.
 *  - active / on_trial subscription → "plus"
 *  - a row that's cancelled/expired  → "free"
 *  - NO row at all                    → leave the local value untouched, so the
 *    dev toggle (and logged-out users) keep working before billing goes live.
 */
export async function refreshEntitlement(userId: string): Promise<void> {
  try {
    const { data } = await supabase
      .from("subscriptions")
      .select("status")
      .eq("user_id", userId)
      .maybeSingle();
    if (!data) return; // no subscription row yet — don't override local state
    const active = data.status === "active" || data.status === "on_trial";
    setPlan(active ? "plus" : "free");
  } catch {
    /* offline / table missing — keep whatever we have locally */
  }
}
