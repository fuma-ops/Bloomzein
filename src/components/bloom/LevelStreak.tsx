import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Flame } from "lucide-react";
import { readMovementLevel, readSeenLevel, writeSeenLevel } from "@/lib/crossToolData";
import { BloomFlower } from "@/components/bloom/BloomFlower";

/* ============================================================
   LevelStreak — a slim, cute motivation strip + a level-up 🎉.

   One narrow row: the user's overall movement LEVEL (earned from
   every workout + yoga session she's actually completed), a soft
   progress bar to the next level, and her current STREAK. When her
   level goes up since the last time we recorded it, a portaled
   celebration blooms. Fully logical — nothing decorative or faked.
============================================================ */

// Pink 4-point star, matching the app's sparkle language.
function Star({ size = 14, color = "#EC4899", style }: { size?: number; color?: string; style?: React.CSSProperties }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" style={style} aria-hidden>
      <path d="M12 0c.9 5.4 3.7 8.2 9.1 9.1-5.4.9-8.2 3.7-9.1 9.1-.9-5.4-3.7-8.2-9.1-9.1C8.3 8.2 11.1 5.4 12 0Z" fill={color} />
    </svg>
  );
}

export function LevelStreak({ streak, className = "" }: { streak: number; className?: string }) {
  const lvl = readMovementLevel();
  const [celebrate, setCelebrate] = useState<null | { level: number; name: string; icon: string }>(null);

  // Detect a level-up on mount (she returns to the plan after finishing a
  // session, so this remounts and picks up the jump).
  useEffect(() => {
    const seen = readSeenLevel();
    if (seen == null) { writeSeenLevel(lvl.level); return; } // first time → record silently
    if (lvl.level > seen) {
      setCelebrate({ level: lvl.level, name: lvl.name, icon: lvl.icon });
      writeSeenLevel(lvl.level);
    } else if (lvl.level < seen) {
      writeSeenLevel(lvl.level); // keep in sync
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      <div className={`flex items-center gap-2.5 rounded-2xl border border-petal/60 bg-white/85 px-3 py-2 shadow-sm shadow-rose/5 ${className}`}>
        {/* Level medallion — the brand flower */}
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-gradient-to-br from-hotpink to-rose shadow-sm shadow-hotpink/30">
          <BloomFlower size={20} />
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

      {celebrate && <LevelUpCelebration info={celebrate} onClose={() => setCelebrate(null)} />}
    </>
  );
}

/* ---------- Level-up celebration ---------- */

function LevelUpCelebration({ info, onClose }: {
  info: { level: number; name: string; icon: string };
  onClose: () => void;
}) {
  // Auto-dismiss after a few seconds; tap anywhere also closes.
  useEffect(() => {
    const t = setTimeout(onClose, 4600);
    return () => clearTimeout(t);
  }, [onClose]);

  // Deterministic sparkle burst (no Math.random → stable, calm).
  const stars = useMemo(() => Array.from({ length: 22 }, (_, i) => ({
    x: 6 + ((i * 37 + 11) % 88),
    y: 8 + ((i * 53 + 7) % 82),
    size: 10 + (i % 5) * 4,
    delay: (i % 8) * 0.06,
    color: i % 3 === 0 ? "#EC4899" : i % 3 === 1 ? "#F472B6" : "#FBCFE8",
  })), []);

  return createPortal(
    <div
      className="fixed inset-0 z-[9500] flex items-center justify-center overflow-hidden select-none"
      onClick={onClose}
      style={{ background: "radial-gradient(ellipse at center, rgba(255,232,246,0.92) 0%, rgba(255,199,230,0.9) 55%, rgba(255,167,213,0.88) 100%)", animation: "luFade 0.3s ease-out" }}
    >
      {stars.map((s, i) => (
        <div key={i} className="absolute pointer-events-none" style={{ left: `${s.x}%`, top: `${s.y}%`, animation: `luBurst ${1.1 + (i % 5) * 0.18}s ease-out ${s.delay}s both` }}>
          <Star size={s.size} color={s.color} />
        </div>
      ))}

      <div
        className="relative z-10 mx-6 w-full max-w-[19rem] rounded-[2rem] text-center px-7 pt-7 pb-6"
        onClick={(e) => e.stopPropagation()}
        style={{ background: "rgba(255,255,255,0.96)", backdropFilter: "blur(12px)", border: "1px solid rgba(236,72,153,0.15)", boxShadow: "0 24px 70px rgba(236,72,153,0.4), inset 0 1px 0 rgba(255,255,255,0.9)", animation: "luPop 0.5s cubic-bezier(0.34,1.56,0.64,1) both" }}
      >
        <div
          className="mx-auto mb-3 grid place-items-center rounded-full"
          style={{ width: 92, height: 92, background: "linear-gradient(135deg,#F472B6,#DB2777)", boxShadow: "0 14px 40px rgba(236,72,153,0.5), inset 0 1px 0 rgba(255,255,255,0.4)", animation: "luFloat 2s ease-in-out infinite alternate" }}
        >
          <BloomFlower size={52} />
        </div>
        <p className="text-[10px] font-black tracking-[0.42em] uppercase" style={{ color: "#DB2777", opacity: 0.7 }}>Level up</p>
        <h2 className="font-script leading-none mt-1" style={{ fontSize: "clamp(2rem,8vw,2.75rem)", color: "#DB2777", filter: "drop-shadow(0 3px 10px rgba(236,72,153,0.25))" }}>
          Lvl {info.level} · {info.name}
        </h2>
        <p className="mt-2 text-[13px]" style={{ color: "#9D5C7E" }}>
          You&apos;ve bloomed into <b style={{ color: "#DB2777" }}>{info.name}</b> ✿
        </p>
        <button
          onClick={onClose}
          className="mt-5 inline-flex items-center gap-2 rounded-full px-7 py-2.5 text-sm font-bold text-white active:scale-95 transition-transform"
          style={{ background: "linear-gradient(135deg,#F472B6 0%,#EC4899 50%,#DB2777 100%)", boxShadow: "0 10px 30px rgba(236,72,153,0.5), inset 0 1px 0 rgba(255,255,255,0.5)" }}
        >
          <Star size={15} color="#fff" /> Keep blooming
        </button>
      </div>

      <style>{`
        @keyframes luFade { from { opacity: 0; } to { opacity: 1; } }
        @keyframes luPop { from { transform: scale(0.8) translateY(12px); opacity: 0; } to { transform: scale(1) translateY(0); opacity: 1; } }
        @keyframes luFloat { from { transform: translateY(0); } to { transform: translateY(-8px); } }
        @keyframes luBurst { from { transform: scale(0) rotate(0deg); opacity: 0; } 40% { opacity: 1; } to { transform: scale(1.15) rotate(50deg); opacity: 0; } }
        @media (prefers-reduced-motion: reduce) { [style*="luBurst"], [style*="luFloat"] { animation: none !important; } }
      `}</style>
    </div>,
    document.body
  );
}
