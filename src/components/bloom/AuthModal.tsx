import { useState } from "react"
import { X } from "lucide-react"
import { AppIcon } from "./AppIcon"
import { useAuth } from "@/contexts/AuthContext"

export function AuthModal({ onClose }: { onClose?: () => void }) {
  const { signInWithGoogle, signInWithEmail, signUpWithEmail } = useAuth()
  const [mode, setMode] = useState<"signin" | "signup">("signin")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [agreed, setAgreed] = useState(false)

  // Explicit consent is required to create an account (we process health data).
  const consentNeeded = mode === "signup" && !agreed

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (consentNeeded) { setError("Please agree to the Privacy Policy and Terms to continue."); return }
    setError(null)
    setLoading(true)
    const { error } = mode === "signin"
      ? await signInWithEmail(email, password)
      : await signUpWithEmail(email, password)
    setLoading(false)
    if (error) setError(error)
  }

  const handleGoogle = () => {
    if (consentNeeded) { setError("Please agree to the Privacy Policy and Terms to continue."); return }
    signInWithGoogle()
  }

  return (
    <div className="fixed inset-0 z-[100] grid place-items-center bg-[#831843]/40 backdrop-blur-sm p-4 animate-fade-in">
      <div className="relative w-full max-w-sm rounded-[2rem] bg-white shadow-2xl shadow-[#EC4899]/30 border border-[#EC4899]/15 p-6">
        {onClose && (
          <button
            onClick={onClose}
            className="absolute right-4 top-4 grid h-8 w-8 place-items-center rounded-full text-[#9D5C7E] hover:text-[#EC4899] hover:bg-[#FBCFE8] transition"
          >
            <X className="h-4 w-4" />
          </button>
        )}

        <div className="flex flex-col items-center text-center">
          <AppIcon size={56} />
          <h2 className="mt-3 font-script text-3xl text-[#831843]">
            {mode === "signin" ? "Welcome back ✿" : "Join Bloom & Zein ✿"}
          </h2>
          <p className="mt-1 text-sm text-[#9D5C7E] leading-snug">
            {mode === "signin"
              ? "Sign in to pick up right where you left off."
              : "Create your free account to unlock every feature."}
          </p>
        </div>

        <button
          onClick={handleGoogle}
          className="mt-5 w-full inline-flex items-center justify-center gap-2.5 rounded-full bg-white border border-[#EC4899]/25 px-4 py-3 text-sm font-bold text-[#831843] shadow-sm hover:bg-[#FFF0F6] transition"
        >
          <svg className="h-5 w-5" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          Continue with Google
        </button>

        <div className="my-4 flex items-center gap-3">
          <div className="h-px flex-1 bg-[#EC4899]/15" />
          <span className="text-xs font-semibold text-[#9D5C7E]">or with your email</span>
          <div className="h-px flex-1 bg-[#EC4899]/15" />
        </div>

        <form onSubmit={handleEmailSubmit} className="flex flex-col gap-2.5">
          <input
            type="email"
            required
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="rounded-2xl border border-[#EC4899]/20 bg-[#FFF0F6]/60 px-4 py-2.5 text-sm text-[#831843] placeholder:text-[#9D5C7E]/70 outline-none focus:border-[#EC4899] transition"
          />
          <input
            type="password"
            required
            minLength={6}
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="rounded-2xl border border-[#EC4899]/20 bg-[#FFF0F6]/60 px-4 py-2.5 text-sm text-[#831843] placeholder:text-[#9D5C7E]/70 outline-none focus:border-[#EC4899] transition"
          />

          {mode === "signup" && (
            <label className="mt-0.5 flex items-start gap-2 text-left text-[11.5px] leading-snug text-[#9D5C7E]">
              <input
                type="checkbox"
                checked={agreed}
                onChange={(e) => { setAgreed(e.target.checked); if (e.target.checked) setError(null) }}
                className="mt-0.5 h-4 w-4 shrink-0 accent-[#EC4899]"
              />
              <span>
                I’m 16 or older and agree to the{" "}
                <a href="/privacy" target="_blank" rel="noopener noreferrer" className="font-bold text-[#EC4899] hover:text-[#DB2777] underline">Privacy Policy</a>{" "}and{" "}
                <a href="/terms" target="_blank" rel="noopener noreferrer" className="font-bold text-[#EC4899] hover:text-[#DB2777] underline">Terms</a>, including processing of my health data.
              </span>
            </label>
          )}

          {error && <p className="text-xs font-semibold text-[#DB2777]">{error}</p>}
          <button
            type="submit"
            disabled={loading || consentNeeded}
            className="mt-1 rounded-full bg-[#EC4899] px-4 py-2.5 text-sm font-bold text-white shadow-md shadow-[#EC4899]/30 hover:bg-[#DB2777] transition disabled:opacity-60"
          >
            {loading ? "One moment…" : mode === "signin" ? "Sign in" : "Create my account"}
          </button>
        </form>

        <p className="mt-4 text-center text-xs text-[#9D5C7E]">
          {mode === "signin" ? "Don’t have an account yet?" : "Already have an account?"}{" "}
          <button
            onClick={() => { setMode(mode === "signin" ? "signup" : "signin"); setError(null) }}
            className="font-bold text-[#EC4899] hover:text-[#DB2777] transition"
          >
            {mode === "signin" ? "Sign up" : "Sign in"}
          </button>
        </p>
        {mode === "signin" && (
          <p className="mt-3 text-center text-[11px] text-[#9D5C7E]/80">
            By continuing you agree to our{" "}
            <a href="/privacy" target="_blank" rel="noopener noreferrer" className="font-semibold text-[#EC4899] hover:text-[#DB2777] underline">Privacy Policy</a>{" "}&amp;{" "}
            <a href="/terms" target="_blank" rel="noopener noreferrer" className="font-semibold text-[#EC4899] hover:text-[#DB2777] underline">Terms</a>.
          </p>
        )}
      </div>
    </div>
  )
}
