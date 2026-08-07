// Supabase Edge Function — Lemon Squeezy subscription webhook.
//
// Lemon Squeezy calls this on every subscription event. We verify the request
// is genuinely from Lemon Squeezy (HMAC signature), read the buyer's user_id
// from the checkout custom data, and upsert their Bloom+ status into
// `public.subscriptions`. That table is the single source of truth for premium.
//
// Required Function secret (Supabase → Edge Functions → Secrets):
//   LEMONSQUEEZY_WEBHOOK_SECRET = the signing secret you set on the LS webhook
// (SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are injected automatically.)
//
// Deploy:  supabase functions deploy lemonsqueezy-webhook --no-verify-jwt
//   (--no-verify-jwt because Lemon Squeezy calls it with its own signature,
//    not a Supabase user JWT.)

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// LS subscription statuses that mean "Bloom+ is on".
const ACTIVE = new Set(["active", "on_trial"]);

/** Constant-time-ish hex HMAC-SHA256 verification of the raw request body. */
async function verify(raw: string, signature: string, secret: string): Promise<boolean> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const mac = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(raw));
  const expected = [...new Uint8Array(mac)].map((b) => b.toString(16).padStart(2, "0")).join("");
  if (expected.length !== signature.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ signature.charCodeAt(i);
  return diff === 0;
}

Deno.serve(async (req) => {
  try {
    const secret = Deno.env.get("LEMONSQUEEZY_WEBHOOK_SECRET");
    if (!secret) return new Response("missing LEMONSQUEEZY_WEBHOOK_SECRET", { status: 500 });

    const raw = await req.text();
    const signature = req.headers.get("X-Signature") ?? "";
    if (!signature || !(await verify(raw, signature, secret))) {
      return new Response("invalid signature", { status: 401 });
    }

    const body = JSON.parse(raw);
    const eventName: string = body?.meta?.event_name ?? "";
    const userId: string | undefined = body?.meta?.custom_data?.user_id;
    const attr = body?.data?.attributes ?? {};

    // We only care about subscription lifecycle events with a linked user.
    if (!userId || !eventName.startsWith("subscription")) {
      return new Response("ignored", { status: 200 });
    }

    const status: string = attr.status ?? "none"; // on_trial | active | past_due | cancelled | expired | paused
    const row = {
      user_id: userId,
      status,
      ls_subscription_id: body?.data?.id?.toString() ?? null,
      variant_id: attr.variant_id?.toString() ?? null,
      renews_at: attr.renews_at ?? null,
      ends_at: attr.ends_at ?? null,
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
