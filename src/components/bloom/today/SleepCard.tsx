/**
 * Last night's sleep — a small daily-ritual card for Today, sitting beside the
 * hydration card in the right panel. One quick quality tap (1..5) plus an
 * optional hours stepper, written to the canonical sleep log so the Me · history
 * charts and the doctor report reflect exactly what she logged. Phase-aware tip,
 * like hydration, so it feels part of the same warm daily flow.
 */
import { useEffect, useState } from "react";
import { Moon, Minus, Plus, Sparkles, type LucideIcon } from "lucide-react";
import { todayISO } from "@/lib/localDate";
import {
  readSleepForDay,
  setSleepQuality,
  setSleepHours,
  SLEEP_OPTIONS,
  SLEEP_EVENT,
  type SleepEntry,
} from "@/lib/sleepLog";
import { toContentPhase, type CyclePhase } from "@/components/bloom/cyclePhase";

const PHASE_TIP: Record<string, string> = {
  period: "Rest deeply — your body is working hard. Warmth and an early night help.",
  follicular: "Good sleep now turns your rising energy into real momentum.",
  ovulation: "You may feel wired at your peak — wind down early to protect your glow.",
  luteal: "Sleep often dips before your period — magnesium and a calm routine help.",
  any: "A steady sleep rhythm keeps your hormones and mood balanced.",
};

const INSIGHT: Record<number, string> = {
  1: "A rough night — be extra gentle with yourself today. 🤍",
  2: "Not your best sleep — a slower morning will help.",
  3: "An okay night — a calm evening tonight can lift it.",
  4: "Good rest — your body and mood will thank you.",
  5: "Wonderful sleep — you recover and glow on nights like this. ✨",
};

// Quality shown as ONE pink glyph (never a multi-colour emoji) so every sleep
// picker stays on-brand: a moon that brightens as the night gets more restful,
// blooming into a sparkle for a great night. Shared with the Today quick-picker.
const SLEEP_GLYPH: Record<number, { Icon: LucideIcon; op: number }> = {
  1: { Icon: Moon, op: 0.4 },
  2: { Icon: Moon, op: 0.58 },
  3: { Icon: Moon, op: 0.76 },
  4: { Icon: Moon, op: 0.92 },
  5: { Icon: Sparkles, op: 1 },
};

export function SleepGlyph({ q, className = "" }: { q: number; className?: string }) {
  const g = SLEEP_GLYPH[q] ?? SLEEP_GLYPH[3];
  const Icon = g.Icon;
  return <Icon className={className} style={{ opacity: g.op }} strokeWidth={2} />;
}

export function SleepCard({ phase }: { phase?: CyclePhase | null }) {
  const [entry, setEntry] = useState<SleepEntry | null>(() => readSleepForDay());
  const [hoursOpen, setHoursOpen] = useState(() => (readSleepForDay()?.h ?? null) != null);

  useEffect(() => {
    const refresh = () => setEntry(readSleepForDay());
    window.addEventListener(SLEEP_EVENT, refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener(SLEEP_EVENT, refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);

  const iso = todayISO();
  const q = entry?.q ?? null;
  const hours = entry?.h ?? null;
  const tip = PHASE_TIP[toContentPhase(phase ?? undefined)] ?? PHASE_TIP.any;

  const bumpHours = (delta: number) => {
    const base = hours ?? 7.5;
    const next = Math.min(12, Math.max(3, Math.round((base + delta) * 2) / 2));
    setSleepHours(iso, next);
  };

  return (
    <section
      className="mt-4 sm:mt-6 animate-card-pop-in rounded-3xl border border-hotpink/20 bg-white/85 backdrop-blur p-4 sm:p-5 shadow-[0_4px_18px_-8px_rgba(219,39,119,0.25)]"
      style={{ animationDelay: "220ms" }}
    >
      <div className="flex items-center gap-2">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-blush to-petal/70">
          <Moon className="h-4 w-4 text-hotpink" strokeWidth={1.9} />
        </span>
        <div>
          <h2 className="font-script text-2xl text-hotpink leading-none">Last night's sleep</h2>
          <p className="text-[11px] text-rose/60">How rested do you feel today?</p>
        </div>
      </div>

      {/* quality taps */}
      <div className="mt-3 grid grid-cols-5 gap-1.5">
        {SLEEP_OPTIONS.map((o) => {
          const on = q === o.q;
          return (
            <button
              key={o.q}
              onClick={() => setSleepQuality(iso, o.q)}
              aria-pressed={on}
              className={[
                "flex flex-col items-center gap-1 rounded-2xl border px-1 py-2 transition active:scale-95",
                on
                  ? "border-hotpink bg-hotpink/10 shadow-sm"
                  : "border-petal/50 bg-white/60 hover:bg-blush/50",
              ].join(" ")}
            >
              <SleepGlyph q={o.q} className="h-5 w-5 text-hotpink" />
              <span
                className={`text-[9.5px] font-bold leading-none ${on ? "text-hotpink" : "text-rose/55"}`}
              >
                {o.label}
              </span>
            </button>
          );
        })}
      </div>

      {/* optional hours */}
      <div className="mt-3">
        {hoursOpen || hours != null ? (
          <div className="flex items-center justify-between rounded-2xl border border-petal/50 bg-white/60 px-3 py-2">
            <span className="text-[12px] font-bold text-rose/70">Hours slept</span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => bumpHours(-0.5)}
                className="grid h-7 w-7 place-items-center rounded-full bg-blush text-hotpink active:scale-90"
                aria-label="Fewer hours"
              >
                <Minus className="h-3.5 w-3.5" strokeWidth={2.5} />
              </button>
              <span className="min-w-[3rem] text-center text-[15px] font-black text-magenta tabular-nums">
                {(hours ?? 7.5).toFixed(1)}h
              </span>
              <button
                onClick={() => bumpHours(0.5)}
                className="grid h-7 w-7 place-items-center rounded-full bg-blush text-hotpink active:scale-90"
                aria-label="More hours"
              >
                <Plus className="h-3.5 w-3.5" strokeWidth={2.5} />
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => {
              setHoursOpen(true);
              if (hours == null) setSleepHours(iso, 7.5);
            }}
            className="inline-flex items-center gap-1 text-[12px] font-bold text-hotpink hover:underline"
          >
            <Plus className="h-3.5 w-3.5" strokeWidth={2.5} /> Add hours slept
          </button>
        )}
      </div>

      {/* insight / phase tip */}
      <p className="mt-3 flex items-start gap-1.5 rounded-2xl bg-blush/40 border border-petal/50 px-3 py-2 text-[12px] leading-snug text-[#831843]">
        <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-hotpink" strokeWidth={2} />
        <span>{q != null ? INSIGHT[q] : tip}</span>
      </p>
    </section>
  );
}
