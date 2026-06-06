import { useEffect, useState } from "react"
import { Download, X } from "lucide-react"

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>
}

export function InstallPrompt() {
  const [prompt, setPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [dismissed, setDismissed] = useState(false)
  const [installed, setInstalled] = useState(false)

  useEffect(() => {
    const isStandalone = window.matchMedia("(display-mode: standalone)").matches
    if (isStandalone) { setInstalled(true); return }

    const handler = (e: Event) => {
      e.preventDefault()
      setPrompt(e as BeforeInstallPromptEvent)
    }
    window.addEventListener("beforeinstallprompt", handler)
    window.addEventListener("appinstalled", () => setInstalled(true))
    return () => window.removeEventListener("beforeinstallprompt", handler)
  }, [])

  const handleInstall = async () => {
    if (!prompt) return
    await prompt.prompt()
    const { outcome } = await prompt.userChoice
    if (outcome === "accepted") setInstalled(true)
    setPrompt(null)
  }

  if (installed || dismissed || !prompt) return null

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-2rem)] max-w-sm animate-fade-in">
      <div className="relative flex items-center gap-3 rounded-2xl bg-white/95 backdrop-blur border border-petal/60 shadow-2xl shadow-hotpink/20 p-4">
        <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-hotpink text-white shadow-md shadow-hotpink/30">
          <Download className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-rose">Installe l'appli ✿</p>
          <p className="text-xs text-rose/70 leading-snug">Accède à Bloom & Zein directement depuis ton écran d'accueil.</p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={handleInstall}
            className="rounded-full bg-hotpink px-3.5 py-1.5 text-xs font-bold text-white shadow-md shadow-hotpink/30 hover:bg-magenta transition"
          >
            Installer
          </button>
          <button
            onClick={() => setDismissed(true)}
            className="grid h-7 w-7 place-items-center rounded-full text-rose/60 hover:text-hotpink hover:bg-blush transition"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
