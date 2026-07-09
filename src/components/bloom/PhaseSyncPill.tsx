import { Check, RefreshCw, Flower2 } from "lucide-react";

/* A soft hero pill that always names the user's cycle phase (the app's core
   feature — every tool hero should surface it) and shows whether this tool's
   plan is synced to that phase. Tapping when out of sync runs `onSync`; when the
   cycle isn't set up yet it invites the user to set it. Presentational only —
   each tool computes `phase` / `synced` / `onSync` from its own stores. */
export function PhaseSyncPill({
  emoji, label, synced, known, onSync,
}: {
  emoji: string;
  label: string;
  synced: boolean;
  known: boolean;       // is the cycle phase actually set up?
  onSync: () => void;   // sync this tool's plan to the phase (or open cycle setup)
}) {
  const base =
    "inline-flex items-center gap-1.5 rounded-full backdrop-blur-md px-2.5 py-1 text-[11px] sm:text-xs font-bold transition active:scale-95 shadow-sm";

  if (!known) {
    return (
      <button onClick={onSync} className={`${base} bg-white/25 border border-white/50 text-white hover:bg-white/35 animate-selected-glow`}>
        <Flower2 className="h-3.5 w-3.5" strokeWidth={2} /> Set your cycle
      </button>
    );
  }

  if (synced) {
    return (
      <span className={`${base} bg-white/30 border border-white/60 text-white`}>
        <span className="text-sm leading-none">{emoji}</span>
        {label} phase
        <span className="ml-0.5 inline-flex items-center gap-0.5 rounded-full bg-white/85 text-hotpink px-1.5 py-[1px] text-[9px] uppercase tracking-wide">
          <Check className="h-2.5 w-2.5" strokeWidth={3} /> in sync
        </span>
      </span>
    );
  }

  return (
    <button onClick={onSync} className={`${base} bg-white/25 border border-white/50 text-white hover:bg-white/35 animate-selected-glow`}>
      <span className="text-sm leading-none">{emoji}</span>
      {label} phase
      <span className="ml-0.5 inline-flex items-center gap-1 rounded-full bg-white/85 text-hotpink px-1.5 py-[1px] text-[9px] uppercase tracking-wide">
        <RefreshCw className="h-2.5 w-2.5" strokeWidth={2.5} /> tap to sync
      </span>
    </button>
  );
}
