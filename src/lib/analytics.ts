// Google Analytics (GA4) — client-side route tracking.
//
// The base gtag loader and the FIRST page_view live in index.html (they fire on
// the initial full page load, when the URL is already correct). Bloomzein is a
// SPA: after that first paint the custom router in App.tsx swaps pages via
// history.pushState WITHOUT a reload, so GA would otherwise only ever record the
// landing page. This module forwards each subsequent route change as a
// page_view, and exposes trackEvent() for custom conversions (sign_up, etc.).
//
// Everything is a no-op if gtag isn't present (ad-blockers, local dev without
// the tag) — analytics must never break the app.

type GtagFn = (...args: unknown[]) => void;

declare global {
  interface Window {
    gtag?: GtagFn;
    dataLayer?: unknown[];
  }
}

/** Fire a GA4 page_view for a client-side (SPA) navigation. */
export function trackPageView(path: string): void {
  if (typeof window === "undefined" || typeof window.gtag !== "function") return;
  window.gtag("event", "page_view", {
    page_path: path,
    page_location: window.location.origin + path,
    page_title: document.title,
  });
}

/** Fire a custom GA4 event, e.g. trackEvent("get_started_click"). */
export function trackEvent(name: string, params: Record<string, unknown> = {}): void {
  if (typeof window === "undefined" || typeof window.gtag !== "function") return;
  window.gtag("event", name, params);
}

// Route → friendly tool name. Lets GA4 rank tools by name ("cycle", "meals"…)
// via a single tool_open event, instead of forcing us to read raw URL paths.
const TOOL_BY_PATH: Record<string, string> = {
  "/app/tools/cycle": "cycle",
  "/app/tools/meals": "meals",
  "/app/tools/diet": "diet",
  "/app/tools/yoga": "yoga",
  "/app/tools/workout": "workout",
  "/app/tools/notes": "notes",
  "/app/tools/diary": "diary",
  "/app/tools/budget": "budget",
  "/budget": "budget",
  "/app/calendar": "calendar",
};

/** If `path` is a known tool page, report which tool the user opened. */
export function trackToolOpen(path: string): void {
  const tool = TOOL_BY_PATH[path];
  if (tool) trackEvent("tool_open", { tool_name: tool });
}
