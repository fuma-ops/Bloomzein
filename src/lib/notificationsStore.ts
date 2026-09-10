// =============================================================================
// BLOOMZEIN — notifications store (history for the in-app notification centre)
// -----------------------------------------------------------------------------
// Transient toasts come and go; this keeps a small persisted history so the
// "Notifications" centre on Today can list everything (profile ready, water,
// meals, reminders…). notify() writes here automatically (unless transient),
// and the Today centre reads it. Per-device (localStorage), capped.
// =============================================================================
import type { NotifyOptions, NotifyTone } from "./notify";

export interface StoredNotif {
  id: string;
  ts: number;
  read: boolean;
  title: string;
  body?: string;
  tone?: NotifyTone;
  icon?: string;
}

const KEY = "bloom:notifications";
const CAP = 40;
export const NOTIFS_UPDATED = "bloom:notifs-updated";

export function readNotifications(): StoredNotif[] {
  try {
    const raw = localStorage.getItem(KEY);
    const list = raw ? (JSON.parse(raw) as StoredNotif[]) : [];
    return Array.isArray(list) ? list : [];
  } catch { return []; }
}

function write(list: StoredNotif[]): void {
  try { localStorage.setItem(KEY, JSON.stringify(list.slice(0, CAP))); } catch { /* ignore */ }
  try { window.dispatchEvent(new Event(NOTIFS_UPDATED)); } catch { /* ignore */ }
}

/** Record a notification in the centre's history (newest first). */
export function addNotification(opts: NotifyOptions): void {
  const item: StoredNotif = {
    id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
    ts: Date.now(),
    read: false,
    title: opts.title,
    body: opts.body,
    tone: opts.tone,
    icon: opts.icon,
  };
  write([item, ...readNotifications()]);
}

export function markAllRead(): void {
  write(readNotifications().map((n) => (n.read ? n : { ...n, read: true })));
}
export function removeNotification(id: string): void {
  write(readNotifications().filter((n) => n.id !== id));
}
export function clearNotifications(): void { write([]); }
export function unreadCount(): number { return readNotifications().reduce((n, x) => n + (x.read ? 0 : 1), 0); }
