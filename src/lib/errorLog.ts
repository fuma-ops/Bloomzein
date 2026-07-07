import { supabase } from "./supabase";

/* ------------------------------------------------------------------ *
 * Lightweight, privacy-safe crash logging.
 *
 * Every uncaught error (React render crash, async throw, rejected
 * promise) is written to the `error_logs` table in your own Supabase
 * project — no third-party service. We record ONLY technical context
 * (message, stack, route, browser) — never health data or form input.
 *
 * View crashes in Supabase → Table Editor → error_logs.
 * ------------------------------------------------------------------ */

let lastSig = "";
let lastTime = 0;

export async function logError(err: unknown, source: string, extra?: { componentStack?: string }) {
  try {
    const message = err instanceof Error ? err.message : String(err ?? "Unknown error");
    const stack = (err instanceof Error ? err.stack : "") || extra?.componentStack || "";

    // De-dupe: ignore the same error firing repeatedly within 5s (prevents floods/loops).
    const sig = `${source}|${message}`;
    const now = Date.now();
    if (sig === lastSig && now - lastTime < 5000) return;
    lastSig = sig;
    lastTime = now;

    // getSession reads from local storage (no network) — safe & fast.
    let userId: string | null = null;
    try {
      const { data } = await supabase.auth.getSession();
      userId = data.session?.user?.id ?? null;
    } catch { /* ignore */ }

    await supabase.from("error_logs").insert({
      message: message.slice(0, 1000),
      stack: stack.slice(0, 4000),
      route: typeof location !== "undefined" ? location.pathname : "",
      source,
      user_id: userId,
      user_agent: typeof navigator !== "undefined" ? navigator.userAgent.slice(0, 300) : "",
    });
  } catch {
    // Never let crash-logging itself throw — that would cause an error loop.
  }
}

/** Catch errors React's ErrorBoundary can't see (async code, events, promises). */
export function initErrorLogging() {
  if (typeof window === "undefined") return;
  window.addEventListener("error", (e) => { void logError(e.error ?? e.message, "window.onerror"); });
  window.addEventListener("unhandledrejection", (e) => { void logError(e.reason, "unhandledrejection"); });
}
