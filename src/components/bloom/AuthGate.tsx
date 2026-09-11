import { useEffect } from "react"
import { useAuth } from "@/contexts/AuthContext"
import { AuthModal } from "./AuthModal"
import { AppIcon } from "./AppIcon"
import { openCheckout } from "@/lib/paddle"
import { readPendingProfile, clearPendingProfile, readPendingTrial, clearPendingTrial } from "@/lib/pendingOnboarding"

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

  // Value-first funnel handoff: a guest who completed onboarding before signing
  // up has their answers stashed locally. The moment they have an account, apply
  // their profile (name/age/weight) and, if they picked the trial, open checkout.
  useEffect(() => {
    if (!user || !profile) return
    const pending = readPendingProfile()
    if (pending) {
      clearPendingProfile()
      updateProfile(pending).catch(() => { /* offline — Today still works from local setup */ })
    }
    const trial = readPendingTrial()
    if (trial) {
      clearPendingTrial()
      openCheckout(trial.billing, { userId: user.id, email: user.email }).catch(() => { /* she can start it from the app */ })
    }
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
