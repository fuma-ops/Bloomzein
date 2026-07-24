import React from "react";

/* ============================================================================
   BloomNavIcon — glossy, skeuomorphic rose-gold nav icons in the same premium
   idiom as CuteToolIcon (gradient fill · white stroke · gloss sheen · sparkle).
   Tuned to read cleanly at nav sizes (24–36px). One icon per app-shell tab.
   ========================================================================== */

type NavSlug = "today" | "calendar" | "tools" | "read" | "shop" | "me";

interface Props {
  slug: NavSlug;
  className?: string;
}

/** Shared gloss + sparkle defs, unique-id'd per slug so multiple SVGs coexist. */
function Defs({ id }: { id: string }) {
  return (
    <defs>
      <linearGradient id={`${id}-body`} x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="oklch(0.80 0.16 350)" />
        <stop offset="55%" stopColor="oklch(0.64 0.26 350)" />
        <stop offset="100%" stopColor="oklch(0.50 0.26 350)" />
      </linearGradient>
      <linearGradient id={`${id}-gold`} x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="oklch(0.96 0.08 90)" />
        <stop offset="100%" stopColor="oklch(0.76 0.16 65)" />
      </linearGradient>
      <linearGradient id={`${id}-paper`} x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#ffffff" />
        <stop offset="100%" stopColor="oklch(0.96 0.04 350)" />
      </linearGradient>
    </defs>
  );
}

export function BloomNavIcon({ slug, className = "h-8 w-8" }: Props) {
  const id = `nav-${slug}`;
  const common = { viewBox: "0 0 100 100", fill: "none", xmlns: "http://www.w3.org/2000/svg", className };

  switch (slug) {
    case "today":
      /* Glossy sunrise flower — a warm sun disc with soft rays + a bloom center. */
      return (
        <svg {...common}>
          <Defs id={id} />
          {/* rays */}
          <g stroke={`url(#${id}-gold)`} strokeWidth="5" strokeLinecap="round">
            <line x1="50" y1="10" x2="50" y2="20" />
            <line x1="82" y1="24" x2="75" y2="31" />
            <line x1="18" y1="24" x2="25" y2="31" />
            <line x1="90" y1="54" x2="80" y2="54" />
            <line x1="10" y1="54" x2="20" y2="54" />
          </g>
          {/* sun disc */}
          <circle cx="50" cy="54" r="26" fill={`url(#${id}-body)`} stroke="#ffffff" strokeWidth="2.5" />
          {/* bloom center */}
          <g>
            <circle cx="50" cy="54" r="7" fill={`url(#${id}-gold)`} stroke="#ffffff" strokeWidth="1.5" />
            {[0, 72, 144, 216, 288].map((a) => (
              <ellipse key={a} cx="50" cy="42" rx="4.5" ry="7" fill="oklch(0.92 0.09 350)" stroke="#ffffff" strokeWidth="1"
                transform={`rotate(${a} 50 54)`} opacity="0.95" />
            ))}
            <circle cx="50" cy="54" r="3.5" fill="#ffffff" />
          </g>
          {/* gloss + sparkle */}
          <path d="M 30,44 C 27,52 30,64 40,70" stroke="#ffffff" strokeWidth="4" strokeLinecap="round" opacity="0.7" />
          <path d="M 74,30 L 76,25 L 78,30 L 83,32 L 78,34 L 76,39 L 74,34 L 69,32 Z" fill="#ffffff" opacity="0.9" />
        </svg>
      );

    case "calendar":
      /* Glossy calendar with a bloom-dot on today. */
      return (
        <svg {...common}>
          <Defs id={id} />
          <rect x="34" y="14" width="6" height="16" rx="3" fill="oklch(0.85 0.12 350)" stroke="#ffffff" strokeWidth="1" />
          <rect x="60" y="14" width="6" height="16" rx="3" fill="oklch(0.85 0.12 350)" stroke="#ffffff" strokeWidth="1" />
          <rect x="16" y="22" width="68" height="62" rx="14" fill={`url(#${id}-body)`} stroke="#ffffff" strokeWidth="2.5" />
          <rect x="24" y="34" width="52" height="42" rx="8" fill="#ffffff" />
          <line x1="24" y1="48" x2="76" y2="48" stroke="oklch(0.85 0.12 350)" strokeWidth="2" opacity="0.55" />
          <line x1="24" y1="62" x2="76" y2="62" stroke="oklch(0.85 0.12 350)" strokeWidth="2" opacity="0.55" />
          <line x1="40" y1="34" x2="40" y2="76" stroke="oklch(0.85 0.12 350)" strokeWidth="2" opacity="0.4" />
          <line x1="60" y1="34" x2="60" y2="76" stroke="oklch(0.85 0.12 350)" strokeWidth="2" opacity="0.4" />
          <circle cx="50" cy="55" r="9" fill={`url(#${id}-body)`} stroke="#ffffff" strokeWidth="1.5" />
          <circle cx="50" cy="55" r="3" fill="#ffffff" opacity="0.9" />
          <path d="M 21,28 C 36,23 58,26 66,34" stroke="#ffffff" strokeWidth="4.5" strokeLinecap="round" opacity="0.7" />
          <path d="M 30,18 L 32,13 L 34,18 L 39,20 L 34,22 L 32,27 L 30,22 L 25,20 Z" fill="oklch(0.88 0.12 350)" />
        </svg>
      );

    case "tools":
      /* Glossy 2×2 app-tile grid with a sparkle — "your tools". */
      return (
        <svg {...common}>
          <Defs id={id} />
          {([[20, 22], [56, 22], [20, 58], [56, 58]] as const).map(([x, y], i) => (
            <g key={i}>
              <rect x={x} y={y + 2} width="24" height="24" rx="8" fill="oklch(0.40 0.20 350 / 0.14)" />
              <rect x={x} y={y} width="24" height="24" rx="8"
                fill={i === 0 ? `url(#${id}-gold)` : `url(#${id}-body)`} stroke="#ffffff" strokeWidth="2.5" />
              <path d={`M ${x + 4},${y + 5} C ${x + 10},${y + 2} ${x + 18},${y + 4} ${x + 20},${y + 9}`}
                stroke="#ffffff" strokeWidth="2" strokeLinecap="round" opacity="0.65" />
            </g>
          ))}
          <path d="M 50,44 L 52.5,37 L 55,44 L 62,46.5 L 55,49 L 52.5,56 L 50,49 L 43,46.5 Z" fill="#ffffff" />
        </svg>
      );

    case "read":
      /* Glossy open book with a gold bookmark ribbon. */
      return (
        <svg {...common}>
          <Defs id={id} />
          {/* pages */}
          <path d="M 50,28 C 40,22 26,22 18,26 L 18,74 C 26,70 40,70 50,76 C 60,70 74,70 82,74 L 82,26 C 74,22 60,22 50,28 Z"
            fill={`url(#${id}-paper)`} stroke="#ffffff" strokeWidth="2.5" />
          {/* spine + covers */}
          <path d="M 50,28 L 50,76" stroke="oklch(0.72 0.20 350)" strokeWidth="2.5" strokeLinecap="round" opacity="0.6" />
          <path d="M 18,74 C 26,70 40,70 50,76 L 50,82 C 40,76 26,76 18,80 Z" fill={`url(#${id}-body)`} stroke="#ffffff" strokeWidth="2" />
          <path d="M 82,74 C 74,70 60,70 50,76 L 50,82 C 60,76 74,76 82,80 Z" fill={`url(#${id}-body)`} stroke="#ffffff" strokeWidth="2" />
          {/* text lines */}
          <g stroke="oklch(0.72 0.20 350)" strokeWidth="2.5" strokeLinecap="round" opacity="0.5">
            <line x1="26" y1="38" x2="43" y2="35" />
            <line x1="26" y1="47" x2="43" y2="44" />
            <line x1="57" y1="35" x2="74" y2="38" />
            <line x1="57" y1="44" x2="74" y2="47" />
          </g>
          {/* bookmark */}
          <path d="M 64,24 L 64,44 L 69,39 L 74,44 L 74,24 Z" fill={`url(#${id}-gold)`} stroke="#ffffff" strokeWidth="1.5" />
          <path d="M 22,30 C 30,27 40,28 46,32" stroke="#ffffff" strokeWidth="3.5" strokeLinecap="round" opacity="0.75" />
        </svg>
      );

    case "shop":
      /* Glossy shopping bag with a bloom + gold handles. */
      return (
        <svg {...common}>
          <Defs id={id} />
          {/* handles */}
          <path d="M 38,34 C 38,20 62,20 62,34" stroke={`url(#${id}-gold)`} strokeWidth="5" strokeLinecap="round" fill="none" />
          {/* bag body */}
          <path d="M 26,32 L 74,32 L 80,80 C 80,84 76,86 72,86 L 28,86 C 24,86 20,84 20,80 Z"
            fill={`url(#${id}-body)`} stroke="#ffffff" strokeWidth="2.5" />
          {/* flower motif */}
          <g transform="translate(50 56)">
            {[0, 72, 144, 216, 288].map((a) => (
              <ellipse key={a} cx="0" cy="-8" rx="4" ry="6.5" fill="oklch(0.92 0.09 350)" stroke="#ffffff" strokeWidth="1"
                transform={`rotate(${a})`} />
            ))}
            <circle cx="0" cy="0" r="4" fill={`url(#${id}-gold)`} />
          </g>
          {/* gloss */}
          <path d="M 28,38 C 25,50 27,68 36,78" stroke="#ffffff" strokeWidth="4" strokeLinecap="round" opacity="0.7" />
          <circle cx="72" cy="44" r="2" fill="#ffffff" opacity="0.85" />
        </svg>
      );

    case "me":
      /* Glossy avatar bust with a heart — "you". */
      return (
        <svg {...common}>
          <Defs id={id} />
          {/* soft halo plate */}
          <circle cx="50" cy="50" r="40" fill="oklch(0.62 0.28 350 / 0.12)" stroke="#ffffff" strokeWidth="2" />
          {/* shoulders */}
          <path d="M 22,84 C 22,64 36,58 50,58 C 64,58 78,64 78,84 Z" fill={`url(#${id}-body)`} stroke="#ffffff" strokeWidth="2.5" />
          {/* head */}
          <circle cx="50" cy="40" r="15" fill={`url(#${id}-body)`} stroke="#ffffff" strokeWidth="2.5" />
          {/* face */}
          <path d="M 43,40 Q 46,44 49,40" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" />
          <circle cx="56" cy="40" r="1.6" fill="#ffffff" />
          <circle cx="58" cy="46" r="3" fill="oklch(0.92 0.09 350)" opacity="0.6" />
          {/* heart accent */}
          <path d="M 66,66 C 64,62 59,62 59,66.5 C 59,71 66,75 66,75 C 66,75 73,71 73,66.5 C 73,62 68,62 66,66 Z"
            fill={`url(#${id}-gold)`} stroke="#ffffff" strokeWidth="1.2" />
          {/* gloss + sparkle */}
          <path d="M 34,34 C 32,40 34,48 40,52" stroke="#ffffff" strokeWidth="3.5" strokeLinecap="round" opacity="0.7" />
          <path d="M 30,60 L 32,55 L 34,60 L 39,62 L 34,64 L 32,69 L 30,64 L 25,62 Z" fill="#ffffff" opacity="0.85" />
        </svg>
      );

    default:
      return null;
  }
}

export type { NavSlug };
