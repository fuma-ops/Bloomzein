import { useState } from "react"
import { AppIcon } from "./AppIcon"
import { useAuth } from "@/contexts/AuthContext"

export function ProfileSetup() {
  const { updateProfile } = useAuth()
  const [name, setName] = useState("")
  const [age, setAge] = useState("")
  const [weight, setWeight] = useState("")
  const [unit, setUnit] = useState<"kg" | "lbs">("kg")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) { setError("Ton prénom est nécessaire ✿"); return }
    setError(null)
    setLoading(true)
    const { error } = await updateProfile({
      name: name.trim(),
      age: age ? Number(age) : null,
      weight: weight ? Number(weight) : null,
      weight_unit: unit,
      setup_done: true,
    })
    setLoading(false)
    if (error) setError(error)
  }

  return (
    <div className="fixed inset-0 z-[100] grid place-items-center bg-[#831843]/40 backdrop-blur-sm p-4 animate-fade-in">
      <div className="w-full max-w-sm rounded-[2rem] bg-white shadow-2xl shadow-[#EC4899]/30 border border-[#EC4899]/15 p-6">
        <div className="flex flex-col items-center text-center">
          <AppIcon size={56} />
          <h2 className="mt-3 font-script text-3xl text-[#831843]">Dis-nous en plus sur toi ✿</h2>
          <p className="mt-1 text-sm text-[#9D5C7E] leading-snug">
            Ça nous aide à personnaliser ton expérience. L'âge et le poids sont facultatifs.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 flex flex-col gap-2.5">
          <label className="text-xs font-semibold text-[#831843]">
            Prénom
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ton prénom"
              className="mt-1 w-full rounded-2xl border border-[#EC4899]/20 bg-[#FFF0F6]/60 px-4 py-2.5 text-sm font-normal text-[#831843] placeholder:text-[#9D5C7E]/70 outline-none focus:border-[#EC4899] transition"
            />
          </label>

          <label className="text-xs font-semibold text-[#831843]">
            Âge <span className="font-normal text-[#9D5C7E]">(facultatif)</span>
            <input
              type="number"
              min={1}
              max={120}
              value={age}
              onChange={(e) => setAge(e.target.value)}
              placeholder="Ex : 24"
              className="mt-1 w-full rounded-2xl border border-[#EC4899]/20 bg-[#FFF0F6]/60 px-4 py-2.5 text-sm font-normal text-[#831843] placeholder:text-[#9D5C7E]/70 outline-none focus:border-[#EC4899] transition"
            />
          </label>

          <label className="text-xs font-semibold text-[#831843]">
            Poids <span className="font-normal text-[#9D5C7E]">(facultatif)</span>
            <div className="mt-1 flex gap-2">
              <input
                type="number"
                min={1}
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                placeholder="Ex : 60"
                className="flex-1 rounded-2xl border border-[#EC4899]/20 bg-[#FFF0F6]/60 px-4 py-2.5 text-sm font-normal text-[#831843] placeholder:text-[#9D5C7E]/70 outline-none focus:border-[#EC4899] transition"
              />
              <div className="flex rounded-2xl border border-[#EC4899]/20 overflow-hidden">
                {(["kg", "lbs"] as const).map((u) => (
                  <button
                    type="button"
                    key={u}
                    onClick={() => setUnit(u)}
                    className={`px-3 text-xs font-bold transition ${unit === u ? "bg-[#EC4899] text-white" : "bg-[#FFF0F6]/60 text-[#9D5C7E]"}`}
                  >
                    {u}
                  </button>
                ))}
              </div>
            </div>
          </label>

          {error && <p className="text-xs font-semibold text-[#DB2777]">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="mt-2 rounded-full bg-[#EC4899] px-4 py-2.5 text-sm font-bold text-white shadow-md shadow-[#EC4899]/30 hover:bg-[#DB2777] transition disabled:opacity-60"
          >
            {loading ? "Un instant…" : "C'est parti ✿"}
          </button>
        </form>
      </div>
    </div>
  )
}
