/**
 * Paddle billing — the client side of Bloom+.
 *
 * Paddle Billing is a Merchant of Record: it collects payment, handles tax/VAT
 * and invoicing, and calls our webhook on every subscription change. This file
 * has two jobs (mirrors the old lemonsqueezy.ts so the rest of the app is
 * untouched — premium still follows the server, never a spoofable local value):
 *
 *  1. Open Paddle's overlay checkout for a plan, with the buyer's user_id +
 *     email attached (customData) so the webhook can link the purchase back.
 *  2. `refreshEntitlement` — after login, read the user's real subscription from
 *     the (webhook-written) `subscriptions` table and reflect it into the plan.
 *
 * ── SET-UP ──────────────────────────────────────────────────────────────────
 * In your Paddle dashboard (https://vendors.paddle.com — use Sandbox first):
 *   1. Catalog → create the "Bloom+" product with a MONTHLY and a YEARLY price
 *      (set the 7-day free trial on each price). Copy the two `pri_…` ids below.
 *   2. Developer Tools → Authentication → copy your **client-side token**
 *      (starts `test_…` in sandbox, `live_…` in production) into PADDLE_TOKEN.
 *   3. Set PADDLE_ENV to "sandbox" while testing, "production" when you go live.
 * These three values are public (they ship in the checkout), so it's safe to
 * commit them — exactly like the Lemon Squeezy variant ids were.
 */
import { supabase } from "./supabase";
import { setPlan } from "./entitlements";

/** "sandbox" while testing, "production" once your Paddle account is live. */
export const PADDLE_ENV: "sandbox" | "production" = "sandbox";

/** Client-side token from Paddle → Developer Tools → Authentication. */
export const PADDLE_TOKEN = "YOUR_PADDLE_CLIENT_TOKEN";

/** The `pri_…` price ids for each Bloom+ plan (Paddle → Catalog → Prices). */
export const PADDLE_PRICES = {
  monthly: "YOUR_PRICE_ID_MONTHLY",
  annual: "YOUR_PRICE_ID_ANNUAL",
} as const;

/** Which plan a webhook `price_id` corresponds to (or null if unknown). */
export function planForPriceId(id: string | null | undefined): "monthly" | "annual" | null {
  const s = String(id ?? "");
  if (s === PADDLE_PRICES.monthly) return "monthly";
  if (s === PADDLE_PRICES.annual) return "annual";
  return null;
}

/** True once you've filled the token + price ids above. Until then the paywall
 *  keeps the instant-unlock dev behaviour so the app stays testable. */
export const PADDLE_CONFIGURED =
  !PADDLE_TOKEN.startsWith("YOUR_") &&
  !Object.values(PADDLE_PRICES).some((v) => v.startsWith("YOUR_"));

/* ── Paddle.js loader ─────────────────────────────────────────────────────── */

declare global {
  interface Window {
    Paddle?: {
      Environment: { set: (env: "sandbox" | "production") => void };
      Initialize: (opts: { token: string; eventCallback?: (e: unknown) => void }) => void;
      Checkout: { open: (opts: Record<string, unknown>) => void };
    };
  }
}

const PADDLE_JS = "https://cdn.paddle.com/paddle/v2/paddle.js";
let paddleReady: Promise<void> | null = null;

/** Load + initialise Paddle.js once (idempotent). Safe to call on every click. */
export function initPaddle(): Promise<void> {
  if (paddleReady) return paddleReady;
  paddleReady = new Promise<void>((resolve, reject) => {
    if (typeof window === "undefined") return reject(new Error("no window"));
    const boot = () => {
      try {
        if (!window.Paddle) return reject(new Error("Paddle.js failed to load"));
        if (PADDLE_ENV === "sandbox") window.Paddle.Environment.set("sandbox");
        window.Paddle.Initialize({ token: PADDLE_TOKEN });
        resolve();
      } catch (e) {
        reject(e as Error);
      }
    };
    if (window.Paddle) return boot();
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${PADDLE_JS}"]`);
    if (existing) {
      existing.addEventListener("load", boot, { once: true });
      existing.addEventListener("error", () => reject(new Error("Paddle.js failed to load")), {
        once: true,
      });
      return;
    }
    const s = document.createElement("script");
    s.src = PADDLE_JS;
    s.async = true;
    s.onload = boot;
    s.onerror = () => reject(new Error("Paddle.js failed to load"));
    document.head.appendChild(s);
  });
  return paddleReady;
}

/**
 * Open Paddle's overlay checkout for a plan, linking the buyer so the webhook
 * can flip her to Bloom+ after payment. Resolves once the overlay is open;
 * entitlement is granted server-side via the webhook, not here.
 */
export async function openCheckout(
  plan: "monthly" | "annual",
  opts: { userId?: string | null; email?: string | null } = {},
): Promise<void> {
  await initPaddle();
  window.Paddle!.Checkout.open({
    items: [{ priceId: PADDLE_PRICES[plan], quantity: 1 }],
    ...(opts.email ? { customer: { email: opts.email } } : {}),
    ...(opts.userId ? { customData: { user_id: opts.userId } } : {}),
    settings: {
      displayMode: "overlay",
      theme: "light",
      successUrl: `${window.location.origin}/app?checkout=success`,
    },
  });
}

/**
 * Pull the server-side entitlement for the logged-in user and reflect it into
 * the plan flag the whole app reads.
 *  - active / trialing subscription → "plus"
 *  - a row that's past_due/paused/cancelled/expired → "free"
 *  - NO row at all → leave the local value untouched, so the dev toggle (and
 *    logged-out users) keep working before billing goes live.
 */
export async function refreshEntitlement(userId: string): Promise<void> {
  try {
    const { data } = await supabase
      .from("subscriptions")
      .select("status")
      .eq("user_id", userId)
      .maybeSingle();
    if (!data) return; // no subscription row yet — don't override local state
    // Paddle: "active" | "trialing" mean Bloom+ is on. (We also accept the old
    // Lemon Squeezy "on_trial" so any pre-migration rows still resolve.)
    const active =
      data.status === "active" || data.status === "trialing" || data.status === "on_trial";
    setPlan(active ? "plus" : "free");
  } catch {
    /* offline / table missing — keep whatever we have locally */
  }
}
