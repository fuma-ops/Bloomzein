import { useEffect, useState } from "react"
import { Download, X } from "lucide-react"
import { triggerPWAInstall, hasPWAPrompt, isIOS, isStandalone } from "@/lib/pwa"

export function InstallPrompt() {
  const [visible, setVisible] = useState(false)
  const [dismissed, setDismissed] = useState(false)
  const [installed, setInstalled] = useState(false)
  const [hasPrompt, setHasPrompt] = useState(hasPWAPrompt())

  useEffect(() => {
    if (isStandalone()) { setInstalled(true); return }

    // Prompt may already be stored (captured in main.tsx), or fire later
    const handler = () => setHasPrompt(true)
    window.addEventListener("beforeinstallprompt", handler)
    window.addEventListener("appinstalled", () => setInstalled(true))

    const timer = setTimeout(() => setVisible(true), 10_000)

    return () => {
      window.removeEventListener("beforeinstallprompt", handler)
      clearTimeout(timer)
    }
  }, [])

  const handleInstall = async () => {
    const result = await triggerPWAInstall()
    if (result === "accepted") setInstalled(true)
  }

  if (installed || dismissed || !visible) return null

  const ios = isIOS()

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-2rem)] max-w-sm animate-fade-in">
      <div className="relative flex items-start gap-3 rounded-2xl bg-white/95 backdrop-blur border border-[#EC4899]/20 shadow-2xl shadow-[#EC4899]/20 p-4">
        <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[#EC4899] text-white shadow-md shadow-[#EC4899]/30">
          <Download className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-[#831843]">Installe l'appli ✿</p>
          {ios ? (
            <p className="text-xs text-[#9D5C7E] leading-snug mt-0.5">
              Appuie sur <span className="font-semibold">Partager</span> puis{" "}
              <span className="font-semibold">Sur l'écran d'accueil</span>
            </p>
          ) : (
            <>
              <p className="text-xs text-[#9D5C7E] leading-snug mt-0.5">
                Accède à Bloom & Zein directement depuis ton écran d'accueil.
              </p>
              {hasPrompt && (
                <button
                  onClick={handleInstall}
                  className="mt-2 rounded-full bg-[#EC4899] px-3.5 py-1.5 text-xs font-bold text-white shadow-md shadow-[#EC4899]/30 hover:bg-[#DB2777] transition"
                >
                  Installer
                </button>
              )}
            </>
          )}
        </div>
        <button
          onClick={() => setDismissed(true)}
          className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-[#9D5C7E] hover:text-[#EC4899] hover:bg-[#FBCFE8] transition"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
