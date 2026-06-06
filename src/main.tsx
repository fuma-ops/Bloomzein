import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import "./styles.css"
import App from "./App"
import { storePWAPrompt } from "./lib/pwa"

// Capture the install prompt as early as possible — before React renders
window.addEventListener("beforeinstallprompt", storePWAPrompt)

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
)
