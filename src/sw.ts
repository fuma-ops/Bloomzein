/// <reference lib="webworker" />
import { precacheAndRoute } from "workbox-precaching";

declare let self: ServiceWorkerGlobalScope;

// Empty manifest (globPatterns: []) — no asset caching, push-notifications only.
precacheAndRoute(self.__WB_MANIFEST);

// Skip waiting immediately so this SW takes over from any stale version.
self.skipWaiting();

// On activation: wipe every cache left by any previous SW version, claim
// all open clients, then hard-reload each window so fresh assets load.
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((names) => Promise.all(names.map((n) => caches.delete(n))))
      .then(() => self.clients.claim())
      .then(() => self.clients.matchAll({ type: "window" }))
      .then((clients) =>
        Promise.all(
          clients.map((c) =>
            (c as WindowClient).navigate(c.url).catch(() =>
              c.postMessage({ type: "SW_FORCE_RELOAD" })
            )
          )
        )
      )
  );
});

// No asset precaching — Vercel CDN serves everything fresh.
// This SW exists solely for push notifications.

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

  type AlarmNotificationOptions = NotificationOptions & {
    vibrate?: number[];
    actions?: { action: string; title: string }[];
    renotify?: boolean;
  };

  const options: AlarmNotificationOptions = {
    body: payload.body || "",
    icon: "/pwa-192x192.png",
    badge: "/brand-badge-96.png",
    data,
  };

  if (payload.alarm && data.kind === "medication") {
    options.icon = "/medication-icon-192.png";
    options.requireInteraction = true;
    options.silent = false;
    options.tag = `medication-${data.dedupePrefix ?? data.doseKey ?? "alarm"}`;
    options.renotify = true;
    options.vibrate = [
      400, 200, 400, 200, 400, 600,
      400, 200, 400, 200, 400, 600,
      400, 200, 400, 200, 400,
    ];
    options.actions = [
      { action: "taken", title: "Taken ✓" },
      { action: "snooze", title: "Snooze" },
    ];
  }

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event: NotificationEvent) => {
  const data = (event.notification.data || {}) as PushPayload["data"];

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
