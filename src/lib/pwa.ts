interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>
}

let _deferred: BeforeInstallPromptEvent | null = null

export function storePWAPrompt(e: Event) {
  _deferred = e as BeforeInstallPromptEvent
}

export async function triggerPWAInstall(): Promise<"accepted" | "dismissed" | "unavailable"> {
  if (!_deferred) return "unavailable"
  await _deferred.prompt()
  const { outcome } = await _deferred.userChoice
  _deferred = null
  return outcome
}

export function hasPWAPrompt() {
  return _deferred !== null
}

export function isIOS() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent)
}

export function isStandalone() {
  return window.matchMedia("(display-mode: standalone)").matches
}
