import { useAuth } from "@/contexts/AuthContext"
import { AuthModal } from "./AuthModal"
import { OnboardingFlow } from "./onboarding/OnboardingFlow"
import { AppIcon } from "./AppIcon"

export function AuthGate({ children }: { children: React.ReactNode }) {
  const { user, profile, loading } = useAuth()

  if (loading) {
    return (
      <div className="grid min-h-[60vh] place-items-center">
        <div className="animate-pulse"><AppIcon size={48} /></div>
      </div>
    )
  }

  if (!user) {
    return (
      <>
        <div className="pointer-events-none select-none blur-sm">{children}</div>
        <AuthModal />
      </>
    )
  }

  if (!profile?.setup_done) {
    return <OnboardingFlow>{children}</OnboardingFlow>
  }

  return <>{children}</>
}
