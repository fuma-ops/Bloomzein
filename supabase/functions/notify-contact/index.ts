// Supabase Edge Function — emails new contact-form messages to your own inbox.
//
// Flow: a Database Webhook fires when a row is inserted into
// `public.contact_messages`, calls this function, and this function sends
// the message to your Gmail using YOUR OWN Gmail account (via an App
// Password) — no third-party email service.
//
// Required Function secrets (set in Supabase → Edge Functions → Secrets):
//   GMAIL_USER          = bloomzeinapp@gmail.com
//   GMAIL_APP_PASSWORD  = the 16-char Google App Password (see setup notes)
//
// Deploy:  supabase functions deploy notify-contact --no-verify-jwt

import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

Deno.serve(async (req) => {
  try {
    const body = await req.json().catch(() => ({}));
    // Database Webhook sends { type, table, record, ... }
    const rec = body.record ?? body;
    const name = (rec?.name ?? "Someone").toString().slice(0, 200);
    const email = (rec?.email ?? "no email given").toString().slice(0, 200);
    const message = (rec?.message ?? "").toString().slice(0, 4000);

    const user = Deno.env.get("GMAIL_USER");
    const pass = Deno.env.get("GMAIL_APP_PASSWORD");
    if (!user || !pass) return new Response("missing GMAIL_USER / GMAIL_APP_PASSWORD", { status: 500 });

    const client = new SMTPClient({
      connection: { hostname: "smtp.gmail.com", port: 465, tls: true, auth: { username: user, password: pass } },
    });

    await client.send({
      from: `Bloomzein <${user}>`,
      to: user,               // send it to yourself
      replyTo: email,         // hit "reply" to answer the sender directly
      subject: `✿ New Bloomzein message from ${name}`,
      content: `From: ${name} <${email}>\n\n${message}`,
    });
    await client.close();

    return new Response("ok", { status: 200 });
  } catch (e) {
    return new Response(`error: ${e}`, { status: 500 });
  }
});
