import { createContext, useContext, useEffect, useState } from "react"
import type { Session, User } from "@supabase/supabase-js"
import { supabase, type Profile } from "@/lib/supabase"
import { initCloudSync, startCloudSync, stopCloudSync } from "@/lib/cloudSync"

type AuthContextValue = {
  user: User | null
  session: Session | null
  profile: Profile | null
  loading: boolean
  signInWithGoogle: () => Promise<void>
  signInWithEmail: (email: string, password: string) => Promise<{ error: string | null }>
  signUpWithEmail: (email: string, password: string) => Promise<{ error: string | null }>
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
  updateProfile: (patch: Partial<Profile>) => Promise<{ error: string | null }>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  const loadProfile = async (userId: string) => {
    const { data } = await supabase.from("profiles").select("*").eq("id", userId).single()
    setProfile(data ?? null)
  }

  useEffect(() => {
    // Install the localStorage interceptor early so writes are tracked even
    // before the session resolves.
    initCloudSync()
    let syncedUserId: string | null = null

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      if (session?.user) {
        loadProfile(session.user.id)
        syncedUserId = session.user.id
        void startCloudSync(session.user.id)
      }
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      setUser(session?.user ?? null)
      if (session?.user) {
        loadProfile(session.user.id)
        // Only (re)start sync when the actual user changes, not on token refresh.
        if (syncedUserId !== session.user.id) {
          syncedUserId = session.user.id
          void startCloudSync(session.user.id)
        }
      } else {
        setProfile(null)
        if (syncedUserId) {
          syncedUserId = null
          void stopCloudSync()
        }
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const signInWithGoogle = async () => {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin + window.location.pathname },
    })
  }

  const signInWithEmail = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return { error: error?.message ?? null }
  }

  const signUpWithEmail = async (email: string, password: string) => {
    const { error } = await supabase.auth.signUp({ email, password })
    return { error: error?.message ?? null }
  }

  const signOut = async () => {
    await supabase.auth.signOut()
  }

  const refreshProfile = async () => {
    if (user) await loadProfile(user.id)
  }

  const updateProfile = async (patch: Partial<Profile>) => {
    if (!user) return { error: "Not signed in" }
    const { error } = await supabase.from("profiles").update(patch).eq("id", user.id)
    if (!error) await loadProfile(user.id)
    return { error: error?.message ?? null }
  }

  return (
    <AuthContext.Provider
      value={{ user, session, profile, loading, signInWithGoogle, signInWithEmail, signUpWithEmail, signOut, refreshProfile, updateProfile }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error("useAuth must be used within AuthProvider")
  return ctx
}
