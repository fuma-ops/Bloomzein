import { Palette, Lock, Sparkles } from "lucide-react";
import { usePremium, openPaywall } from "@/lib/entitlements";
import { usePhaseThemeOn, setPhaseThemeOn } from "@/lib/phaseTheme";
import { PremiumBadge } from "./PremiumKit";

const GOLD = "#B76E79";

/** "Living phase theme" control — a Bloom+ delight. Premium users get a real
 *  on/off switch; free users see a locked teaser that opens the paywall. */
export function PhaseThemeControl() {
  const premium = usePremium();
  const on = usePhaseThemeOn();

  return (
    <div className="flex items-center gap-3 rounded-2xl border p-3.5" style={{ borderColor: `${GOLD}55`, background: "linear-gradient(160deg,#FFF7FA,#FFFFFF)" }}>
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl text-white" style={{ background: `linear-gradient(135deg, ${GOLD}, #EC4899)` }}>
        <Palette className="h-5 w-5" strokeWidth={1.9} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-1.5 text-sm font-bold text-hotpink">Living phase theme <PremiumBadge /></p>
        <p className="text-[11.5px] text-rose/75 leading-snug">Your whole app gently blooms with your cycle phase.</p>
      </div>

      {premium ? (
        <button
          onClick={() => setPhaseThemeOn(!on)}
          aria-label="Toggle phase theme"
          className={["relative h-6 w-11 shrink-0 rounded-full transition-colors", on ? "bg-hotpink" : "bg-rose/25"].join(" ")}
        >
          <span className="absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all" style={{ left: on ? "1.375rem" : "0.125rem" }} />
        </button>
      ) : (
        <button
          onClick={() => openPaywall("general")}
          className="shrink-0 inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-[11px] font-bold text-white shadow active:scale-95"
          style={{ background: `linear-gradient(135deg, ${GOLD}, #EC4899)` }}
        >
          <Lock className="h-3 w-3" strokeWidth={2.4} /> Unlock
        </button>
      )}
    </div>
  );
}
