import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import "./styles.css"
import "./bloom-motion.css"
import App from "./App"
import { storePWAPrompt } from "./lib/pwa"
import { initErrorLogging } from "./lib/errorLog"

// Report uncaught async/promise errors to our Supabase crash log.
initErrorLogging()

// ── One-shot cache purge ───────────────────────────────────────────────────
// Bump PURGE_KEY whenever a deploy keeps showing stale UI to force every
// browser to unregister the old SW, wipe all caches, and reload fresh.
const PURGE_KEY = "cache-purge-v9";
try {
  if (!localStorage.getItem(PURGE_KEY)) {
    localStorage.setItem(PURGE_KEY, "1");
    (async () => {
      try {
        const regs = await navigator.serviceWorker?.getRegistrations() ?? [];
        await Promise.all(regs.map((r) => r.unregister()));
        const keys = await caches.keys();
        await Promise.all(keys.map((k) => caches.delete(k)));
      } catch {}
      window.location.reload();
    })();
  }
} catch {}
// ──────────────────────────────────────────────────────────────────────────

// Capture the install prompt as early as possible — before React renders
window.addEventListener("beforeinstallprompt", storePWAPrompt)

// When a new SW activates and can't use navigate(), it posts this message
// as a fallback to guarantee a hard reload so fresh assets are loaded.
navigator.serviceWorker?.addEventListener("message", (event) => {
  if (event.data?.type === "SW_FORCE_RELOAD") window.location.reload();
})

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
)
