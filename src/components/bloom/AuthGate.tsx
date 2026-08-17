import { lazy, Suspense } from "react"
import { useAuth } from "@/contexts/AuthContext"
import { AuthModal } from "./AuthModal"
import { AppIcon } from "./AppIcon"

// The cinematic "Welcome to your Bloom" screens, shown once after sign-in.
const WelcomeScreen = lazy(() => import("@/pages/app.welcome-screen"))

const Loader = () => (
  <div className="grid min-h-[60vh] place-items-center">
    <div className="animate-pulse"><AppIcon size={48} /></div>
  </div>
)

export function AuthGate({ children }: { children: React.ReactNode }) {
  const { user, profile, loading, updateProfile } = useAuth()

  if (loading) return <Loader />

  if (!user) {
    return (
      <>
        <div className="pointer-events-none select-none blur-sm">{children}</div>
        <AuthModal />
      </>
    )
  }

  // First time in after sign-in: play the cinematic welcome, then mark setup
  // done and drop the user on Today. There is NO separate cycle-collection
  // onboarding — the only setup lives on the Today page (guided setup).
  if (!profile?.setup_done) {
    return (
      <Suspense fallback={<Loader />}>
        <WelcomeScreen onDone={() => { updateProfile({ setup_done: true }) }} />
      </Suspense>
    )
  }

  return <>{children}</>
}
