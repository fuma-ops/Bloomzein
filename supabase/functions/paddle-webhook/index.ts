// Supabase Edge Function — Paddle Billing subscription webhook.
//
// Paddle calls this on every subscription event. We verify the request is
// genuinely from Paddle (Paddle-Signature HMAC), read the buyer's user_id from
// the checkout custom data, and upsert their Bloom+ status into
// `public.subscriptions`. That table is the single source of truth for premium.
//
// Required Function secret (Supabase → Edge Functions → Secrets):
//   PADDLE_WEBHOOK_SECRET = the signing secret of the notification destination
//   (Paddle → Developer Tools → Notifications → your destination → secret key,
//    starts `pdl_ntfset_…`).
// (SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are injected automatically.)
//
// Deploy:  supabase functions deploy paddle-webhook --no-verify-jwt
//   (--no-verify-jwt because Paddle calls it with its own signature, not a
//    Supabase user JWT.)

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Paddle subscription statuses that mean "Bloom+ is on".
const ACTIVE = new Set(["active", "trialing"]);

/**
 * Verify Paddle's `Paddle-Signature: ts=…;h1=…` header.
 * The signed payload is `${ts}:${rawBody}`, HMAC-SHA256 with the secret, hex.
 */
async function verify(raw: string, header: string, secret: string): Promise<boolean> {
  const parts = Object.fromEntries(
    header.split(";").map((kv) => {
      const i = kv.indexOf("=");
      return [kv.slice(0, i).trim(), kv.slice(i + 1).trim()];
    }),
  );
  const ts = parts["ts"];
  const h1 = parts["h1"];
  if (!ts || !h1) return false;

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const mac = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${ts}:${raw}`));
  const expected = [...new Uint8Array(mac)].map((b) => b.toString(16).padStart(2, "0")).join("");
  if (expected.length !== h1.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ h1.charCodeAt(i);
  return diff === 0;
}

Deno.serve(async (req) => {
  try {
    const secret = Deno.env.get("PADDLE_WEBHOOK_SECRET");
    if (!secret) return new Response("missing PADDLE_WEBHOOK_SECRET", { status: 500 });

    const raw = await req.text();
    const signature = req.headers.get("Paddle-Signature") ?? "";
    if (!signature || !(await verify(raw, signature, secret))) {
      return new Response("invalid signature", { status: 401 });
    }

    const body = JSON.parse(raw);
    const eventType: string = body?.event_type ?? "";
    const data = body?.data ?? {};
    const userId: string | undefined = data?.custom_data?.user_id;

    // We only care about subscription lifecycle events with a linked user.
    if (!userId || !eventType.startsWith("subscription.")) {
      return new Response("ignored", { status: 200 });
    }

    const status: string = data?.status ?? "none"; // active | trialing | past_due | paused | canceled
    const priceId: string | null = data?.items?.[0]?.price?.id ?? null;
    // When she cancels, Paddle keeps the sub "active" until the period ends and
    // records the effective date under scheduled_change; otherwise access runs
    // to the end of the current billing period.
    const endsAt: string | null =
      data?.scheduled_change?.effective_at ?? data?.current_billing_period?.ends_at ?? null;

    const row = {
      user_id: userId,
      status,
      paddle_subscription_id: data?.id?.toString() ?? null,
      price_id: priceId,
      renews_at: data?.current_billing_period?.ends_at ?? null,
      ends_at: endsAt,
      updated_at: new Date().toISOString(),
    };

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const { error } = await supabase.from("subscriptions").upsert(row, { onConflict: "user_id" });
    if (error) return new Response(`db error: ${error.message}`, { status: 500 });

    return new Response(JSON.stringify({ ok: true, userId, status, active: ACTIVE.has(status) }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  } catch (e) {
    return new Response(`error: ${e}`, { status: 500 });
  }
});
