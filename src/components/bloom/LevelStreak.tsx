import { Flame } from "lucide-react";
import { readMovementLevel } from "@/lib/crossToolData";

/* ============================================================
   LevelStreak — a slim, cute motivation strip.

   One narrow row: the user's overall movement LEVEL (earned from
   every workout + yoga session she's actually completed), a soft
   progress bar to the next level, and her current STREAK. Fully
   logical — nothing is decorative or faked.
============================================================ */

export function LevelStreak({ streak, className = "" }: { streak: number; className?: string }) {
  const lvl = readMovementLevel();

  return (
    <div className={`flex items-center gap-2.5 rounded-2xl border border-petal/60 bg-white/85 px-3 py-2 shadow-sm shadow-rose/5 ${className}`}>
      {/* Level medallion */}
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-gradient-to-br from-hotpink to-rose text-[17px] shadow-sm shadow-hotpink/30">
        {lvl.icon}
      </span>

      {/* Level name + progress to next */}
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline justify-between gap-2">
          <p className="text-[12px] font-bold text-rose leading-none truncate">
            Lvl {lvl.level} · <span className="text-hotpink">{lvl.name}</span>
          </p>
          <p className="shrink-0 text-[9px] font-semibold text-rose/55">
            {lvl.isMax ? "max bloom ✿" : `${lvl.toNext} to next`}
          </p>
        </div>
        <div className="mt-1 h-1.5 rounded-full bg-blush overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-hotpink to-rose transition-all duration-500"
            style={{ width: `${lvl.pct}%` }}
          />
        </div>
      </div>

      {/* Streak */}
      <span
        className="shrink-0 inline-flex items-center gap-1 rounded-full bg-blush/70 px-2 py-1 text-[11px] font-bold text-hotpink"
        title={`${streak}-day streak`}
      >
        <Flame className="h-3.5 w-3.5" fill={streak > 0 ? "currentColor" : "none"} strokeWidth={2} />
        {streak}
      </span>
    </div>
  );
}
