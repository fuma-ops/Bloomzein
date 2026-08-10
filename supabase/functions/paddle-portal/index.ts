// Supabase Edge Function — Paddle customer portal session.
//
// Mints a Paddle-hosted customer portal session for the SIGNED-IN user, so she
// can update her payment method, view invoices, or cancel Bloom+. The portal is
// per Paddle customer; we resolve her customer id SERVER-SIDE from her verified
// Supabase session — the client never supplies a customer id.
//
// Required Function secrets (Supabase → Edge Functions → Secrets):
//   PADDLE_API_KEY = a Paddle SERVER API key from the SAME environment as below
//                    (live account key when PADDLE_ENV=production). SECRET.
//   PADDLE_ENV     = "sandbox" (default) | "production" — picks the API host.
// (SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are injected automatically.)
//
// Deploy:  supabase functions deploy paddle-portal --no-verify-jwt
//   (we authenticate the caller ourselves via auth.getUser on their token.)
//
// This function is called from the BROWSER, so it must answer the CORS preflight
// and send CORS headers on every response — otherwise the browser blocks it.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const PADDLE_API =
  Deno.env.get("PADDLE_ENV") === "production"
    ? "https://api.paddle.com"
    : "https://sandbox-api.paddle.com";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(obj: unknown, status: number): Response {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { ...CORS, "content-type": "application/json" },
  });
}

Deno.serve(async (req) => {
  // CORS preflight — the browser sends this before the real POST.
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  try {
    if (req.method !== "POST") return json({ error: "method not allowed" }, 405);

    // Trim so a stray space/newline pasted into the secret can't malform the
    // Authorization header Paddle sees.
    const apiKey = Deno.env.get("PADDLE_API_KEY")?.trim();
    if (!apiKey) return json({ error: "missing PADDLE_API_KEY" }, 500);

    // Authenticate the caller from their Supabase access token.
    const jwt = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
    if (!jwt) return json({ error: "unauthorized" }, 401);

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const { data: userData, error: userErr } = await admin.auth.getUser(jwt);
    if (userErr || !userData?.user) return json({ error: "unauthorized" }, 401);

    // Resolve her Paddle customer id server-side (never trust the client).
    const { data: sub } = await admin
      .from("subscriptions")
      .select("paddle_customer_id, paddle_subscription_id")
      .eq("user_id", userData.user.id)
      .maybeSingle();

    const customerId = sub?.paddle_customer_id;
    if (!customerId) return json({ error: "no subscription on file" }, 404);

    // Mint the portal session, deep-linked to her subscription when we have it.
    const payload: Record<string, unknown> = {};
    if (sub?.paddle_subscription_id) payload.subscription_ids = [sub.paddle_subscription_id];

    const res = await fetch(`${PADDLE_API}/customers/${customerId}/portal-sessions`, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    const out = await res.json();
    if (!res.ok) return json({ error: out?.error?.detail ?? "paddle error" }, 502);

    const url = out?.data?.urls?.general?.overview ?? null;
    if (!url) return json({ error: "no portal url returned" }, 502);
    return json({ url }, 200);
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
