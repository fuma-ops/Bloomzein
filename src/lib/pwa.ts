interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>
}

let _deferred: BeforeInstallPromptEvent | null = null
let _waitResolvers: Array<() => void> = []

export function storePWAPrompt(e: Event) {
  _deferred = e as BeforeInstallPromptEvent
  _waitResolvers.forEach((r) => r())
  _waitResolvers = []
}

/** Wait up to `ms` for the browser to make the install prompt available */
export function waitForPWAPrompt(ms = 6000): Promise<boolean> {
  if (_deferred) return Promise.resolve(true)
  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      _waitResolvers = _waitResolvers.filter((r) => r !== resolver)
      resolve(false)
    }, ms)
    const resolver = () => { clearTimeout(timer); resolve(true) }
    _waitResolvers.push(resolver)
  })
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
