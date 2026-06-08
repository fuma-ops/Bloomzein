import { supabase } from "@/lib/supabase";

/**
 * Generic Web Push helpers shared by every tool that needs "notify me even when
 * the app is closed" (Reminders, Yoga, Cycle Tracker, …). One subscription flow,
 * one `scheduled_notifications` table, one Edge Function + cron job dispatch it all.
 */

const VAPID_PUBLIC_KEY = "BG_2op5NfGicMFxSv_8J3rN9FScKJQ4OENQIDXG7JdQT54e9d7VE0EaQC3RUz8l13BKY66IEp-Tv_u8U2BTc2hQ";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const output = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) output[i] = rawData.charCodeAt(i);
  return output;
}

export function isPushSupported() {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

/** Requests permission (if needed), subscribes via the service worker's PushManager, and saves the subscription so the backend can reach this device. */
export async function subscribeToPush(): Promise<{ error: string | null }> {
  if (!isPushSupported()) return { error: "Push notifications aren't supported on this device/browser." };

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  let permission = Notification.permission;
  if (permission === "default") permission = await Notification.requestPermission();
  if (permission !== "granted") return { error: "Notification permission was not granted." };

  const registration = await navigator.serviceWorker.ready;

  let subscription = await registration.pushManager.getSubscription();
  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    });
  }

  const json = subscription.toJSON();
  const endpoint = json.endpoint;
  const p256dh = json.keys?.p256dh;
  const auth = json.keys?.auth;
  if (!endpoint || !p256dh || !auth) return { error: "Could not read push subscription keys." };

  const { error } = await supabase
    .from("push_subscriptions")
    .upsert({ user_id: user.id, endpoint, p256dh, auth_key: auth }, { onConflict: "endpoint" });
  if (error) return { error: error.message };

  return { error: null };
}

/** Removes this device's subscription, both from the browser and from the backend. */
export async function unsubscribeFromPush(): Promise<void> {
  if (!isPushSupported()) return;
  const registration = await navigator.serviceWorker.getRegistration();
  const subscription = await registration?.pushManager.getSubscription();
  if (!subscription) return;
  await supabase.from("push_subscriptions").delete().eq("endpoint", subscription.endpoint);
  await subscription.unsubscribe();
}

export async function getPushSubscriptionStatus(): Promise<"subscribed" | "unsubscribed" | "unsupported"> {
  if (!isPushSupported()) return "unsupported";
  const registration = await navigator.serviceWorker.getRegistration();
  const subscription = await registration?.pushManager.getSubscription();
  return subscription ? "subscribed" : "unsubscribed";
}

export type ScheduledNotificationInput = {
  /** Stable id for this notification within the tool — e.g. `${reminderId}:${occurrenceDate}`. Used to replace stale entries on resync without duplicating. */
  dedupeKey: string;
  /** When the push should fire, as an ISO timestamp (UTC). */
  fireAt: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
};

/**
 * Cancels not-yet-sent scheduled notifications whose dedupe key starts with the
 * given prefix — e.g. used to silence an "alarm chain" (a dose's original push
 * plus its scheduled follow-up nudges) the moment the user confirms in-app.
 */
export async function cancelScheduledNotifications(tool: string, dedupeKeyPrefix: string): Promise<{ error: string | null }> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  const { error } = await supabase
    .from("scheduled_notifications")
    .delete()
    .eq("user_id", user.id)
    .eq("tool", tool)
    .is("sent_at", null)
    .like("dedupe_key", `${dedupeKeyPrefix}%`);
  if (error) return { error: error.message };

  return { error: null };
}

/**
 * Replaces a tool's set of pending (not-yet-sent) scheduled notifications with
 * the given list. Call this whenever the tool's reminder data changes — it
 * reconciles by deleting the tool's stale unsent rows and inserting the fresh
 * ones, so each tool just describes "what should fire and when" without
 * worrying about diffing against what's already stored.
 */
export async function syncScheduledNotifications(
  tool: string,
  items: ScheduledNotificationInput[]
): Promise<{ error: string | null }> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  const { error: deleteError } = await supabase
    .from("scheduled_notifications")
    .delete()
    .eq("user_id", user.id)
    .eq("tool", tool)
    .is("sent_at", null);
  if (deleteError) return { error: deleteError.message };

  if (items.length === 0) return { error: null };

  const rows = items.map((item) => ({
    user_id: user.id,
    tool,
    dedupe_key: item.dedupeKey,
    fire_at: item.fireAt,
    title: item.title,
    body: item.body,
    data: item.data ?? {},
  }));

  const { error: insertError } = await supabase.from("scheduled_notifications").insert(rows);
  if (insertError) return { error: insertError.message };

  return { error: null };
}
