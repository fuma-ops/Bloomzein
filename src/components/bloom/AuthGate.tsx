import { useEffect } from "react"
import { useAuth } from "@/contexts/AuthContext"
import { AuthModal } from "./AuthModal"
import { AppIcon } from "./AppIcon"

const Loader = () => (
  <div className="grid min-h-[60vh] place-items-center">
    <div className="animate-pulse"><AppIcon size={48} /></div>
  </div>
)

export function AuthGate({ children }: { children: React.ReactNode }) {
  const { user, profile, loading, updateProfile } = useAuth()

  // The cinematic "Welcome to your Bloom" film has been removed — a new user
  // goes straight from the landing "Start" button into the real setup
  // (BloomOnboarding, gated in App.tsx), with no interstitial welcome. We still
  // mark setup_done here so the rest of the app's setup logic (which reads
  // profile.setup_done) stays consistent for anyone who lands with it unset.
  useEffect(() => {
    if (user && profile && !profile.setup_done) updateProfile({ setup_done: true })
  }, [user, profile, updateProfile])

  if (loading) return <Loader />

  if (!user) {
    return (
      <>
        <div className="pointer-events-none select-none blur-sm">{children}</div>
        <AuthModal />
      </>
    )
  }

  return <>{children}</>
}
