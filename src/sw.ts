/// <reference lib="webworker" />
import { clientsClaim } from "workbox-core";
import { cleanupOutdatedCaches, precacheAndRoute } from "workbox-precaching";

declare let self: ServiceWorkerGlobalScope;

self.skipWaiting();
clientsClaim();

cleanupOutdatedCaches();
precacheAndRoute(self.__WB_MANIFEST);

interface PushPayload {
  title?: string;
  body?: string;
  alarm?: boolean;
  data?: {
    url?: string;
    kind?: string;
    confirmToken?: string;
    dedupePrefix?: string;
    doseKey?: string;
    reminderId?: string;
    userId?: string;
    [key: string]: unknown;
  };
}

const CONFIRM_DOSE_URL = "https://yyplvnshfcizxocjrlsu.supabase.co/functions/v1/confirm-medication-dose";

self.addEventListener("push", (event: PushEvent) => {
  let payload: PushPayload = {};
  try {
    payload = event.data?.json() ?? {};
  } catch {
    payload = { title: "Bloom & Zein", body: event.data?.text() ?? "" };
  }

  const title = payload.title || "Bloom & Zein";
  const data = payload.data || {};

  // `vibrate` and `actions` are part of the ServiceWorker Notification spec but
  // missing from lib.dom's `NotificationOptions` typings — extend locally.
  type AlarmNotificationOptions = NotificationOptions & {
    vibrate?: number[];
    actions?: { action: string; title: string }[];
  };

  const options: AlarmNotificationOptions = {
    body: payload.body || "",
    icon: "/pwa-192x192.png",
    badge: "/pwa-192x192.png",
    data,
  };

  // Medication doses behave like an alarm: action buttons right on the
  // notification (so she can confirm without opening the app), insistent
  // vibration, and it stays on screen until she interacts with it.
  if (payload.alarm && data.kind === "medication") {
    options.requireInteraction = true;
    options.vibrate = [300, 150, 300, 150, 300, 150, 600];
    options.actions = [
      { action: "taken", title: "Taken ✓" },
      { action: "snooze", title: "Snooze" },
    ];
  }

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event: NotificationEvent) => {
  const data = (event.notification.data || {}) as PushPayload["data"];

  // "Taken ✓" tapped right on the notification — confirm directly with the
  // backend (cancels the rest of the alarm chain) without opening the app.
  if (event.action === "taken" && data?.confirmToken && data?.dedupePrefix && data?.userId && data?.reminderId && data?.doseKey) {
    event.notification.close();
    event.waitUntil(
      fetch(CONFIRM_DOSE_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: data.confirmToken,
          dedupePrefix: data.dedupePrefix,
          userId: data.userId,
          reminderId: data.reminderId,
          doseKey: data.doseKey,
        }),
      }).catch((err) => console.error("Failed to confirm medication dose:", err))
    );
    return;
  }

  // "Snooze" — just dismiss; the next alarm-chain nudge is already scheduled.
  if (event.action === "snooze") {
    event.notification.close();
    return;
  }

  event.notification.close();
  const url = data?.url || "/";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if ("focus" in client && client.url.includes(url)) return (client as WindowClient).focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow(url);
    })
  );
});

