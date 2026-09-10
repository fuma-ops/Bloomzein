// =============================================================================
// BLOOMZEIN — in-app notifications (single source of truth)
// -----------------------------------------------------------------------------
// The ONE way to raise a beautiful in-app toast from anywhere — no React context
// needed. Call notify({...}) from any module or component; the NotificationHost
// (mounted once in AppShell) listens and renders the pink, on-brand toast stack.
//
//   notify({ title: "Your plan is ready", body: "Everything's set up ✨" });
//   notify({ title: "Time to hydrate", tone: "water" });
// =============================================================================

/** Visual tone — picks the accent gradient + a default icon. */
export type NotifyTone = "bloom" | "success" | "water" | "reminder" | "info";

export interface NotifyOptions {
  title: string;
  body?: string;
  /** Accent + default icon. Defaults to "bloom" (pink flower). */
  tone?: NotifyTone;
  /** Emoji to override the tone's default icon (e.g. "🌸", "🎉"). */
  icon?: string;
  /** ms before auto-dismiss. Default 4200. Pass 0 to keep it until tapped. */
  duration?: number;
}

export const NOTIFY_EVENT = "bloom:notify";

/** Raise an in-app notification. Safe to call anywhere (no-op without a DOM). */
export function notify(opts: NotifyOptions): void {
  if (typeof window === "undefined" || !opts?.title) return;
  try {
    window.dispatchEvent(new CustomEvent<NotifyOptions>(NOTIFY_EVENT, { detail: opts }));
  } catch {
    /* ignore */
  }
}
