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
 * Sandbox is wired below. The token + price ids are PUBLIC (they ship in the
 * browser), so committing them is safe — like the Lemon Squeezy ids were. To
 * point at another environment, set these in .env / Vercel (see .env.example);
 * each falls back to the committed sandbox value when its var is unset:
 *   VITE_PADDLE_ENV            "sandbox" | "production"
 *   VITE_PADDLE_TOKEN          Developer Tools → Authentication → client-side token
 *   VITE_PADDLE_PRICE_MONTHLY  Catalog → your monthly price (pri_…)
 *   VITE_PADDLE_PRICE_ANNUAL   Catalog → your annual price (pri_…)
 * The SERVER API key (…_apikey_…) and the webhook secret (pdl_ntfset_…) are
 * SECRET — never put them here or in any VITE_ var; they live only in the
 * webhook's Supabase env.
 */
import { supabase } from "./supabase";
import { setPlan } from "./entitlements";

/** "sandbox" while testing, "production" once your Paddle account is live. */
export const PADDLE_ENV: "sandbox" | "production" =
  import.meta.env.VITE_PADDLE_ENV === "production" ? "production" : "sandbox";

/** Client-side token (public) — Paddle → Developer Tools → Authentication. */
export const PADDLE_TOKEN: string =
  import.meta.env.VITE_PADDLE_TOKEN || "test_3c951d19edeb44f501ceaf9b084";

/** The `pri_…` price ids for each Bloom+ plan (Paddle → Catalog → Prices). */
export const PADDLE_PRICES: { monthly: string; annual: string } = {
  monthly: import.meta.env.VITE_PADDLE_PRICE_MONTHLY || "pri_01kze6nptp9cb2vw8fvap8dys5",
  annual: import.meta.env.VITE_PADDLE_PRICE_ANNUAL || "pri_01kze6m3cktcdbmz1196j2e7ce",
};

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

/** Minimal shape of what we read back from Paddle.PricePreview. */
type PricePreviewLineItem = { price?: { id?: string }; formattedTotals?: { total?: string } };
type PricePreviewResult = { data?: { details?: { lineItems?: PricePreviewLineItem[] } } };

declare global {
  interface Window {
    Paddle?: {
      Environment: { set: (env: "sandbox" | "production") => void };
      Initialize: (opts: { token: string; eventCallback?: (e: unknown) => void }) => void;
      Checkout: { open: (opts: Record<string, unknown>) => void };
      PricePreview: (opts: Record<string, unknown>) => Promise<PricePreviewResult>;
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
      variant: "one-page",
      theme: "light",
      successUrl: `${window.location.origin}/app?checkout=success`,
    },
  });
}

/**
 * Open the Paddle-hosted customer portal for the signed-in user (update card,
 * view invoices, cancel). The `paddle-portal` Edge Function resolves her Paddle
 * customer id from her verified session server-side and mints the session — the
 * client never handles the API key or a customer id. Redirects on success.
 */
export async function openCustomerPortal(): Promise<void> {
  const { data, error } = await supabase.functions.invoke<{ url?: string; error?: string }>(
    "paddle-portal",
    { method: "POST" },
  );
  if (error || !data?.url) {
    throw new Error(data?.error || error?.message || "Billing portal unavailable");
  }
  window.location.href = data.url;
}

/** Plan → the price string Paddle formats for the visitor's own currency. */
export type LocalizedPrices = { monthly: string | null; annual: string | null };

/**
 * Localized, tax-inclusive prices straight from Paddle. Location is auto-detected
 * from the visitor's IP — we never pass a country code ourselves. We only ever
 * DISPLAY `formattedTotals` verbatim: no price math or reformatting on the
 * frontend. Returns nulls when billing isn't configured yet (or on error), so
 * the paywall can fall back to its static copy.
 */
export async function fetchLocalizedPrices(): Promise<LocalizedPrices> {
  const out: LocalizedPrices = { monthly: null, annual: null };
  if (!PADDLE_CONFIGURED) return out;
  await initPaddle();
  const res = await window.Paddle!.PricePreview({
    items: [
      { priceId: PADDLE_PRICES.monthly, quantity: 1 },
      { priceId: PADDLE_PRICES.annual, quantity: 1 },
    ],
  });
  for (const li of res?.data?.details?.lineItems ?? []) {
    const plan = planForPriceId(li?.price?.id);
    if (plan) out[plan] = li?.formattedTotals?.total ?? null;
  }
  return out;
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
    if (!data) {
      // No subscription on file. In PRODUCTION premium is strictly server-driven,
      // so no subscription = free (this also clears any stale locally-set "plus").
      // In sandbox/dev we leave local state untouched so the dev plan toggle works.
      if (PADDLE_ENV === "production") setPlan("free");
      return;
    }
    // Paddle: "active" | "trialing" mean Bloom+ is on. (We also accept the old
    // Lemon Squeezy "on_trial" so any pre-migration rows still resolve.)
    const active =
      data.status === "active" || data.status === "trialing" || data.status === "on_trial";
    setPlan(active ? "plus" : "free");
  } catch {
    /* offline / table missing — keep whatever we have locally */
  }
}
