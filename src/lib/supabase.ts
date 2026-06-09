import { createClient } from "@supabase/supabase-js"

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "https://yyplvnshfcizxocjrlsu.supabase.co"
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl5cGx2bnNoZmNpenhvY2pybHN1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA3NTY3MzgsImV4cCI6MjA5NjMzMjczOH0.k7gbiUmEhheX3zzfqFbavtZaKhHZJDofe31PDP8VT1Y"

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export type Profile = {
  id: string
  name: string | null
  age: number | null
  weight: number | null
  weight_unit: "kg" | "lbs"
  setup_done: boolean
  created_at: string
  updated_at: string
}
