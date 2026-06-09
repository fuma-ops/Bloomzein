import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import "./styles.css"
import App from "./App"
import { storePWAPrompt } from "./lib/pwa"

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
