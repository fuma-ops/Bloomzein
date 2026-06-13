import { useState } from "react"
import { AppIcon } from "./AppIcon"
import { useAuth } from "@/contexts/AuthContext"
import { DEFAULT_CYCLE_SETTINGS, writeCycleSettings } from "./cyclePhase"

function todayISO() {
  return new Date().toISOString().slice(0, 10)
}

export function ProfileSetup() {
  const { updateProfile } = useAuth()
  const [step, setStep] = useState<1 | 2>(1)

  const [name, setName] = useState("")
  const [age, setAge] = useState("")
  const [weight, setWeight] = useState("")
  const [unit, setUnit] = useState<"kg" | "lbs">("kg")

  const [lastPeriodStart, setLastPeriodStart] = useState(todayISO())
  const [cycleLength, setCycleLength] = useState(28)
  const [periodLength, setPeriodLength] = useState(5)

  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleStep1 = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) { setError("Ton prénom est nécessaire ✿"); return }
    setError(null)
    setStep(2)
  }

  const finish = async (withCycle: boolean) => {
    setError(null)
    setLoading(true)
    if (withCycle) {
      writeCycleSettings({
        ...DEFAULT_CYCLE_SETTINGS,
        lastPeriodStart: new Date(lastPeriodStart),
        cycleLength,
        periodLength,
      })
    }
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

  if (step === 2) {
    return (
      <div className="fixed inset-0 z-[100] grid place-items-center bg-[#831843]/40 backdrop-blur-sm p-4 animate-fade-in">
        <div className="w-full max-w-sm rounded-[2rem] bg-white shadow-2xl shadow-[#EC4899]/30 border border-[#EC4899]/15 p-6">
          <div className="flex flex-col items-center text-center">
            <AppIcon size={56} />
            <h2 className="mt-3 font-script text-3xl text-[#831843]">Ton cycle, en douceur ✿</h2>
            <p className="mt-1 text-sm text-[#9D5C7E] leading-snug">
              Ça nous aide à personnaliser ta page du jour, ton calendrier et tes conseils nutrition. Tu peux changer ça plus tard.
            </p>
          </div>

          <form onSubmit={(e) => { e.preventDefault(); finish(true) }} className="mt-5 flex flex-col gap-3">
            <label className="text-xs font-semibold text-[#831843]">
              Date de début de tes dernières règles
              <input
                type="date"
                required
                value={lastPeriodStart}
                onChange={(e) => setLastPeriodStart(e.target.value)}
                max={todayISO()}
                className="mt-1 w-full rounded-2xl border border-[#EC4899]/20 bg-[#FFF0F6]/60 px-4 py-2.5 text-sm font-normal text-[#831843] outline-none focus:border-[#EC4899] transition"
              />
            </label>

            <label className="text-xs font-semibold text-[#831843]">
              Durée moyenne du cycle : <span className="text-[#EC4899]">{cycleLength} jours</span>
              <input
                type="range"
                min={21}
                max={35}
                value={cycleLength}
                onChange={(e) => setCycleLength(Number(e.target.value))}
                className="mt-1 w-full accent-[#EC4899]"
              />
            </label>

            <label className="text-xs font-semibold text-[#831843]">
              Durée des règles : <span className="text-[#EC4899]">{periodLength} jours</span>
              <input
                type="range"
                min={2}
                max={10}
                value={periodLength}
                onChange={(e) => setPeriodLength(Number(e.target.value))}
                className="mt-1 w-full accent-[#EC4899]"
              />
            </label>

            {error && <p className="text-xs font-semibold text-[#DB2777]">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="mt-2 rounded-full bg-[#EC4899] px-4 py-2.5 text-sm font-bold text-white shadow-md shadow-[#EC4899]/30 hover:bg-[#DB2777] transition disabled:opacity-60"
            >
              {loading ? "Un instant…" : "C'est parti ✿"}
            </button>
            <button
              type="button"
              disabled={loading}
              onClick={() => finish(false)}
              className="text-xs font-semibold text-[#9D5C7E] hover:text-[#EC4899] transition disabled:opacity-60"
            >
              Plus tard, configurer ailleurs
            </button>
          </form>
        </div>
      </div>
    )
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

        <form onSubmit={handleStep1} className="mt-5 flex flex-col gap-2.5">
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
            className="mt-2 rounded-full bg-[#EC4899] px-4 py-2.5 text-sm font-bold text-white shadow-md shadow-[#EC4899]/30 hover:bg-[#DB2777] transition"
          >
            Continuer ✿
          </button>
        </form>
      </div>
    </div>
  )
}
