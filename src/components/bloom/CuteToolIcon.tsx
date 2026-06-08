import React from "react";

interface Props {
  slug: string;
  className?: string;
}

export function CuteToolIcon({ slug, className = "h-8 w-8" }: Props) {
  switch (slug) {
    case "notes":
      /* Super glossy, high-contrast pink writing pad / notebook with a glossy pencil & heart clip */
      return (
        <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
          <defs>
            <linearGradient id="notesBgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="oklch(0.72 0.28 350)" />
              <stop offset="60%" stopColor="oklch(0.60 0.28 350)" />
              <stop offset="100%" stopColor="oklch(0.48 0.24 350)" />
            </linearGradient>
            <linearGradient id="pencilGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="oklch(0.92 0.08 70)" />
              <stop offset="100%" stopColor="oklch(0.62 0.24 350)" />
            </linearGradient>
            <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="oklch(0.95 0.08 90)" />
              <stop offset="100%" stopColor="oklch(0.75 0.15 70)" />
            </linearGradient>
          </defs>
          {/* Shadow layer for 3D look */}
          <rect x="18" y="22" width="60" height="64" rx="14" fill="oklch(0.40 0.20 350 / 0.15)" />
          {/* Main clipboard body */}
          <rect x="18" y="20" width="60" height="64" rx="14" fill="url(#notesBgGrad)" stroke="#ffffff" strokeWidth="2.5" />
          {/* White paper page insert with glossy round corners */}
          <rect x="25" y="32" width="46" height="44" rx="8" fill="#ffffff" />
          {/* Heart binder clip in golden gold */}
          <path d="M 40,16 C 40,12 45,8 50,14 C 55,8 60,12 60,16 C 60,22 50,26 50,26 C 50,26 40,22 40,16 Z" fill="url(#goldGrad)" stroke="oklch(0.55 0.15 70)" strokeWidth="1" />
          {/* Ring fasteners holding pages */}
          <rect x="34" y="24" width="6" height="12" rx="3" fill="oklch(0.85 0.12 350)" />
          <rect x="60" y="24" width="6" height="12" rx="3" fill="oklch(0.85 0.12 350)" />
          {/* Diary hand-drawn lines & a glossy heart stamp on paper */}
          <line x1="32" y1="42" x2="64" y2="42" stroke="oklch(0.72 0.22 350)" strokeWidth="3" strokeLinecap="round" opacity="0.4" />
          <line x1="32" y1="52" x2="64" y2="52" stroke="oklch(0.72 0.22 350)" strokeWidth="3" strokeLinecap="round" opacity="0.4" />
          <line x1="32" y1="62" x2="52" y2="62" stroke="oklch(0.72 0.22 350)" strokeWidth="3" strokeLinecap="round" opacity="0.4" />
          <path d="M 58,62 C 58,60 60,59 62,61 C 64,59 66,60 66,62 C 66,64 62,67 62,67 C 62,67 58,64 58,62 Z" fill="oklch(0.62 0.26 350)" />
          {/* Diagonal pencil drawing across bottom corner */}
          <g transform="rotate(-30 75 75)">
            <rect x="68" y="44" width="8" height="42" rx="2" fill="url(#pencilGrad)" stroke="white" strokeWidth="1" />
            <rect x="68" y="40" width="8" height="4" fill="oklch(0.85 0.11 350)" />
            <path d="M 68,86 L 72,94 L 76,86 Z" fill="oklch(0.30 0.10 0)" />
          </g>
          {/* High-gloss overlay gloss sheen reflection */}
          <path d="M 23,25 C 40,21 58,24 64,32" stroke="#ffffff" strokeWidth="4.5" strokeLinecap="round" opacity="0.75" />
          {/* Sparkles */}
          <circle cx="28" cy="76" r="2" fill="#ffffff" opacity="0.9" />
        </svg>
      );

    case "budget":
      /* Super cute glossy pink skeuomorphic Piggy Bank overflowing with gold coins */
      return (
        <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
          <defs>
            <linearGradient id="piggyGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="oklch(0.75 0.25 350)" />
              <stop offset="60%" stopColor="oklch(0.62 0.28 350)" />
              <stop offset="100%" stopColor="oklch(0.48 0.26 350)" />
            </linearGradient>
            <linearGradient id="goldCoinGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="oklch(0.96 0.08 90)" />
              <stop offset="50%" stopColor="oklch(0.88 0.15 70)" />
              <stop offset="100%" stopColor="oklch(0.72 0.18 55)" />
            </linearGradient>
          </defs>
          {/* Floating gold coin sparkles above pig */}
          <g opacity="0.95">
            <ellipse cx="50" cy="18" rx="8" ry="5" fill="url(#goldCoinGrad)" stroke="#ffffff" strokeWidth="1.5" />
            <line x1="50" y1="15" x2="50" y2="21" stroke="#ffffff" strokeWidth="1" />
            <ellipse cx="28" cy="28" rx="7" ry="4" fill="url(#goldCoinGrad)" stroke="#ffffff" strokeWidth="1.2" />
            <ellipse cx="72" cy="26" rx="7" ry="4" fill="url(#goldCoinGrad)" stroke="#ffffff" strokeWidth="1.2" />
          </g>
          {/* Piggy little curly tail */}
          <path d="M 16,56 Q 8,56 12,48 T 14,44" stroke="oklch(0.62 0.28 350)" strokeWidth="3" strokeLinecap="round" />
          {/* Cute piggy feet */}
          <rect x="30" y="70" width="10" height="15" rx="5" fill="oklch(0.50 0.26 350)" />
          <rect x="56" y="70" width="10" height="15" rx="5" fill="oklch(0.50 0.26 350)" />
          {/* Main plump piggy body */}
          <ellipse cx="48" cy="54" rx="30" ry="24" fill="url(#piggyGrad)" stroke="#ffffff" strokeWidth="2.5" />
          {/* Cute piggy ears */}
          <path d="M 32,32 Q 22,14 36,18 Z" fill="oklch(0.70 0.26 350)" stroke="#ffffff" strokeWidth="1.5" />
          <path d="M 52,30 Q 60,12 50,18 Z" fill="oklch(0.70 0.26 350)" stroke="#ffffff" strokeWidth="1.5" />
          {/* Piggy Snout */}
          <rect x="70" y="48" width="12" height="16" rx="6" fill="oklch(0.80 0.18 350)" stroke="#ffffff" strokeWidth="1.5" />
          <circle cx="74" cy="56" r="1.5" fill="oklch(0.40 0.20 350)" />
          <circle cx="78" cy="56" r="1.5" fill="oklch(0.40 0.20 350)" />
          {/* Coin slot in back */}
          <rect x="42" y="32" width="16" height="4" rx="2" fill="oklch(0.30 0.10 0)" />
          {/* Cute sleepy happy eye */}
          <path d="M 54,46 Q 59,51 64,46" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" />
          {/* Blush spot */}
          <circle cx="62" cy="54" r="3.5" fill="oklch(0.92 0.08 350)" opacity="0.6" />
          {/* High gloss skeuomorphic glaze highlight */}
          <path d="M 28,45 C 24,52 28,62 38,65" stroke="#ffffff" strokeWidth="4.5" strokeLinecap="round" opacity="0.75" />
          <circle cx="36" cy="38" r="3" fill="#ffffff" opacity="0.85" />
        </svg>
      );

    case "meals":
      /* Vibrant pink, delicious skeuomorphic steaming soup bowl with glossy cherry-like star garnish */
      return (
        <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
          <defs>
            <linearGradient id="bowlGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="oklch(0.74 0.24 350)" />
              <stop offset="60%" stopColor="oklch(0.62 0.28 350)" />
              <stop offset="100%" stopColor="oklch(0.45 0.26 350)" />
            </linearGradient>
            <linearGradient id="soupGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="oklch(0.90 0.10 350)" />
              <stop offset="100%" stopColor="oklch(0.80 0.16 350)" />
            </linearGradient>
          </defs>
          {/* Heat rising steam curves */}
          <g stroke="oklch(0.72 0.22 350)" strokeWidth="3" strokeLinecap="round" opacity="0.75">
            <path d="M 36,24 Q 32,16 38,8 T 34,0" />
            <path d="M 50,24 Q 46,14 54,8 T 48,0" />
            <path d="M 64,24 Q 60,16 66,8 T 62,0" />
          </g>
          {/* Chopsticks crossing in back */}
          <g stroke="oklch(0.85 0.10 70)" strokeWidth="4" strokeLinecap="round">
            <line x1="84" y1="12" x2="22" y2="48" />
            <line x1="88" y1="18" x2="28" y2="52" />
          </g>
          {/* Main thick soup bowl base */}
          <path d="M 14,40 C 14,40 14,76 50,86 C 86,76 86,40 86,40 Z" fill="url(#bowlGrad)" stroke="#ffffff" strokeWidth="2.5" />
          {/* Solid rim stand (bowl base) */}
          <path d="M 38,82 C 38,82 42,88 50,88 C 58,88 62,82 62,82" stroke="#ffffff" strokeWidth="3" strokeLinecap="round" />
          {/* Juicy glossy pink soup surface */}
          <ellipse cx="50" cy="40" rx="34" ry="10" fill="url(#soupGrad)" stroke="#ffffff" strokeWidth="2" />
          {/* Floating delicious cupcake / cherry garnish design inside */}
          <g transform="translate(42, 32)">
            {/* Glossy Strawberry item */}
            <path d="M 8,2 C 4,2 2,8 8,14 C 14,14 12,2 8,2 Z" fill="oklch(0.55 0.28 0)" stroke="#ffffff" strokeWidth="1" />
            <circle cx="6" cy="6" r="0.6" fill="white" />
            <circle cx="10" cy="8" r="0.6" fill="white" />
            <circle cx="8" cy="11" r="0.6" fill="white" strokeWidth="1" />
          </g>
          {/* Glossy bowl skeuomorphic edge reflection and lights */}
          <path d="M 22,50 C 20,62 30,76 50,80" stroke="#ffffff" strokeWidth="5.5" strokeLinecap="round" opacity="0.8" />
          <ellipse cx="50" cy="43" rx="20" ry="1.5" fill="#ffffff" opacity="0.25" />
        </svg>
      );

    case "yoga":
      /* Super visible glossy pink meditating fairy silhouette inside glowing gold-haloed lotus petals */
      return (
        <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
          <defs>
            <linearGradient id="glowingLotus" x1="0%" y1="100%" x2="0%" y2="0%">
              <stop offset="0%" stopColor="oklch(0.50 0.28 0)" />
              <stop offset="50%" stopColor="oklch(0.62 0.28 350)" />
              <stop offset="100%" stopColor="oklch(0.78 0.22 350)" />
            </linearGradient>
            <linearGradient id="yoginiGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="100%" stopColor="oklch(0.95 0.05 350)" />
            </linearGradient>
          </defs>
          {/* Deep glowing background magic aura */}
          <circle cx="50" cy="50" r="42" fill="oklch(0.62 0.28 350 / 0.16)" stroke="oklch(0.85 0.12 350 / 0.3)" strokeWidth="2" strokeDasharray="6 4" className="animate-[spin_40s_linear_infinite]" />
          {/* Floating pink sparkles / stars */}
          <path d="M 24,24 L 26,18 L 28,24 L 34,26 L 28,28 L 26,34 L 24,28 L 18,26 Z" fill="oklch(0.88 0.12 350)" />
          <path d="M 76,22 L 77.5,17 L 79,22 L 84,23.5 L 79,25 L 77.5,30 L 76,25 L 71,23.5 Z" fill="oklch(0.88 0.12 350)" />
          {/* Vibrant background lotus petals */}
          <path d="M 50,86 C 20,86 10,54 10,54 C 10,54 32,46 50,74 C 68,46 90,54 90,54 C 90,54 80,86 50,86 Z" fill="url(#glowingLotus)" stroke="#ffffff" strokeWidth="2" />
          {/* Upright gorgeous front petals */}
          <path d="M 50,34 C 40,50 44,80 50,84 C 56,80 60,50 50,34 Z" fill="oklch(0.88 0.15 350)" stroke="#ffffff" strokeWidth="1.5" />
          <path d="M 32,56 C 24,68 34,82 50,84 C 36,80 34,68 32,56 Z" fill="oklch(0.68 0.25 350)" />
          <path d="M 68,56 C 76,68 66,82 50,84 C 64,80 66,68 68,56 Z" fill="oklch(0.68 0.25 350)" />
          {/* High-gloss white meditating goddess figure */}
          <g transform="translate(0, -2)">
            {/* Head */}
            <circle cx="50" cy="40" r="6" fill="url(#yoginiGrad)" stroke="oklch(0.60 0.28 350)" strokeWidth="1" />
            {/* Raised beautiful arms forming circle */}
            <path d="M 50,34 C 44,24 38,24 36,36 C 36,44 42,48 50,56 C 58,48 64,44 64,36 C 62,24 56,24 50,34 Z" stroke="url(#yoginiGrad)" strokeWidth="4.5" strokeLinecap="round" fill="none" />
            {/* Yoga body torso */}
            <path d="M 50,46 Q 44,55 42,65 Q 50,68 58,65 Q 56,55 50,46 Z" fill="url(#yoginiGrad)" />
            {/* Crossed legs in meditation pose */}
            <path d="M 32,68 C 32,60 40,65 50,66 C 60,65 68,60 68,68 C 68,74 58,74 50,74 C 42,74 32,74 32,68 Z" fill="url(#yoginiGrad)" stroke="oklch(0.60 0.28 350)" strokeWidth="1" />
            {/* Golden bindu point/glow star between hands */}
            <circle cx="50" cy="22" r="3" fill="#ffffff" className="animate-bloom-pulse" />
          </g>
        </svg>
      );

    case "steps":
      /* Sparkling, energetic platform sneaker with magical golden/pink wings and fast trace lines */
      return (
        <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
          <defs>
            <linearGradient id="cloudGrad" x1="0%" y1="100%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="oklch(0.96 0.04 350)" />
              <stop offset="100%" stopColor="oklch(0.85 0.10 350)" />
            </linearGradient>
            <linearGradient id="shoeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="oklch(0.78 0.22 350)" />
              <stop offset="60%" stopColor="oklch(0.62 0.28 350)" />
              <stop offset="100%" stopColor="oklch(0.48 0.26 350)" />
            </linearGradient>
          </defs>
          {/* Dynamic stepping trail sparkles */}
          <path d="M 8,46 L 16,48 L 12,54 Z" fill="oklch(0.70 0.25 350)" opacity="0.6" />
          <path d="M 12,32 L 18,36 L 14,42 Z" fill="oklch(0.70 0.25 350)" opacity="0.8" />
          {/* Fluffy supportive platform clouds underneath */}
          <path d="M 18,76 C 10,76 6,68 14,60 C 14,50 26,46 34,54 C 40,38 60,38 66,46 C 74,42 84,50 82,60 C 88,68 82,76 74,76 Z" fill="url(#cloudGrad)" stroke="#ffffff" strokeWidth="1.5" />
          {/* Magical detailed wings wrapped from shoe ankle */}
          <g transform="translate(12, 18)" stroke="#ffffff" strokeWidth="1.5">
            <path d="M 22,28 C 10,24 6,12 18,8 C 28,4 32,20 32,28" fill="oklch(0.85 0.14 350)" />
            <path d="M 26,32 C 16,30 14,20 22,18 C 30,16 32,26 32,32" fill="oklch(0.72 0.22 350)" />
          </g>
          {/* Skeuomorphic hot pink tennis shoe */}
          <path d="M 26,52 C 26,52 30,30 46,30 C 56,30 60,38 72,38 C 82,38 86,48 86,62 C 86,66 78,68 46,68 C 30,68 26,62 26,52 Z" fill="url(#shoeGrad)" stroke="#ffffff" strokeWidth="2.5" />
          {/* Laces & details */}
          <line x1="44" y1="36" x2="52" y2="44" stroke="#ffffff" strokeWidth="3" strokeLinecap="round" />
          <line x1="48" y1="32" x2="56" y2="40" stroke="#ffffff" strokeWidth="3" strokeLinecap="round" />
          {/* Crisp, solid white high-platform sole */}
          <path d="M 28,60 C 28,60 36,66 56,66 C 76,66 84,62 84,60 L 84,65 C 84,68 76,71 56,71 C 36,71 28,68 28,65 Z" fill="#ffffff" />
          {/* High gloss specular pink body glare */}
          <path d="M 32,48 C 28,54 32,62 42,64" stroke="#ffffff" strokeWidth="4.5" strokeLinecap="round" opacity="0.8" />
          <circle cx="74" cy="46" r="2.5" fill="#ffffff" />
        </svg>
      );

    case "diary":
      /* Super luxury pink leather diary book bound with a prominent gold heart padlock lock */
      return (
        <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
          <defs>
            <linearGradient id="diaryCoverGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="oklch(0.75 0.25 350)" />
              <stop offset="50%" stopColor="oklch(0.62 0.28 350)" />
              <stop offset="100%" stopColor="oklch(0.48 0.26 350)" />
            </linearGradient>
            <linearGradient id="goldLockGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="oklch(0.96 0.08 90)" />
              <stop offset="100%" stopColor="oklch(0.76 0.16 65)" />
            </linearGradient>
          </defs>
          {/* White binder rings pages poking out */}
          <rect x="26" y="22" width="54" height="60" rx="6" fill="#ffffff" />
          <rect x="25" y="24" width="54" height="58" rx="6" fill="#ffffff" stroke="oklch(0.85 0.12 350)" strokeWidth="1" />
          {/* Luxury thick pink leather cover */}
          <path d="M 20,20 L 74,20 C 76,20 78,22 78,24 L 78,80 C 78,82 76,84 74,84 L 20,84 C 18,84 18,82 18,80 L 18,24 C 18,22 18,20 20,20 Z" fill="url(#diaryCoverGrad)" stroke="#ffffff" strokeWidth="2.5" />
          {/* Gold cover edge corners */}
          <path d="M 20,20 L 28,20 L 20,28 Z" fill="url(#goldLockGrad)" />
          <path d="M 20,84 L 28,84 L 20,76 Z" fill="url(#goldLockGrad)" />
          {/* Thick spine stitches */}
          <line x1="24" y1="26" x2="24" y2="78" stroke="oklch(0.40 0.20 350)" strokeWidth="3.5" strokeDasharray="1 5" strokeLinecap="round" />
          {/* Gold padded lock latch */}
          <path d="M 64,44 L 78,44 Q 84,44 84,52 L 84,56 Q 84,64 78,64 L 64,64 Z" fill="oklch(0.85 0.15 350)" stroke="#ffffff" strokeWidth="1.5" />
          {/* Bold shiny heart lock */}
          <path d="M 74,48 C 71.5,43 65,43 65,48.5 C 65,54 74,59 74,59 C 74,59 83,54 83,48.5 C 83,43 76.5,43 74,48 Z" fill="url(#goldLockGrad)" stroke="oklch(0.50 0.20 60)" strokeWidth="1.5" />
          {/* Shiny glaze reflection across leather */}
          <path d="M 26,26 C 42,21 62,25 70,33" stroke="#ffffff" strokeWidth="4.5" strokeLinecap="round" opacity="0.8" />
          {/* Sparkles */}
          <path d="M 36,36 L 40,32 L 36,28 L 32,32 Z" fill="#ffffff" />
          <circle cx="50" cy="70" r="2" fill="#ffffff" />
        </svg>
      );

    case "cycle":
      /* Extremely clear calendar moon wrapped in gorgeous pink crown flowers with glossy highlights */
      return (
        <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
          <defs>
            <linearGradient id="moonVibrantGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="oklch(0.97 0.05 350)" />
              <stop offset="40%" stopColor="oklch(0.72 0.25 350)" />
              <stop offset="100%" stopColor="oklch(0.55 0.28 350)" />
            </linearGradient>
            <linearGradient id="flowerRoseGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="oklch(0.85 0.18 350)" />
              <stop offset="100%" stopColor="oklch(0.50 0.28 0)" />
            </linearGradient>
          </defs>
          {/* Glowing large pink calendar background plate */}
          <circle cx="50" cy="50" r="42" fill="oklch(0.62 0.28 350 / 0.14)" stroke="#ffffff" strokeWidth="2.5" />
          {/* Sleeping, gorgeous crescent moon with glossy face */}
          <path d="M 66,20 C 40,20 28,40 28,62 C 28,80 44,84 66,76 C 50,76 40,64 40,50 C 40,34 50,22 66,20 Z" fill="url(#moonVibrantGrad)" stroke="#ffffff" strokeWidth="1.5" />
          {/* Dormant sleeping eye */}
          <path d="M 44,48 Q 48,53 52,48" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" />
          <path d="M 48,46 L 46,42" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round" />
          <path d="M 52,46 L 54,42" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round" />
          {/* Blushing cheeks */}
          <circle cx="54" cy="54" r="3" fill="oklch(0.62 0.28 350)" />
          {/* Delicate blooming crown roses on moon base */}
          <g transform="translate(18, 56) scale(0.6)">
            {/* Flower 1 */}
            <circle cx="20" cy="20" r="16" fill="url(#flowerRoseGrad)" stroke="#ffffff" strokeWidth="2" />
            <circle cx="20" cy="20" r="6" fill="oklch(0.95 0.05 90)" />
            {/* Glossy petal highlights */}
            <path d="M 12,12 C 16,8 24,8 28,12" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" opacity="0.75" />
          </g>
          <g transform="translate(48, 64) scale(0.5)">
            {/* Flower 2 */}
            <circle cx="20" cy="20" r="15" fill="url(#flowerRoseGrad)" stroke="#ffffff" strokeWidth="2" />
            <circle cx="20" cy="20" r="5" fill="oklch(0.95 0.05 90)" />
          </g>
          {/* Multi-layered gloss highlights */}
          <path d="M 33,42 C 32,54 36,66 44,72" stroke="#ffffff" strokeWidth="4.5" strokeLinecap="round" opacity="0.8" />
          {/* Constellation star sparkles */}
          <g fill="#ffffff">
            <circle cx="48" cy="28" r="2.5" />
            <circle cx="68" cy="44" r="1.5" />
            <circle cx="34" cy="34" r="2" />
          </g>
        </svg>
      );

    case "blog":
      /* Extremely cute opened envelope releasing high contrast hearts and a sparkly letter page */
      return (
        <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
          <defs>
            <linearGradient id="vibrantEnv" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="oklch(0.80 0.16 350)" />
              <stop offset="100%" stopColor="oklch(0.55 0.28 350)" />
            </linearGradient>
            <linearGradient id="blogPaperGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="100%" stopColor="oklch(0.96 0.04 350)" />
            </linearGradient>
          </defs>
          {/* Glossy red/pink bubble hearts rising in sky */}
          <g opacity="0.95">
            <path d="M 30,22 C 28,18 24,18 24,21 C 24,24 30,28 30,28 C 30,28 36,24 36,21 C 36,18 32,18 30,22 Z" fill="oklch(0.55 0.28 0)" stroke="#ffffff" strokeWidth="1" transform="scale(0.8) translate(6, -2)" />
            <path d="M 50,15 C 48,11 44,11 44,14 C 44,17 50,21 50,21 C 50,21 56,17 56,14 C 56,11 52,11 50,15 Z" fill="oklch(0.65 0.26 350)" stroke="#ffffff" strokeWidth="1.2" />
            <path d="M 70,22 C 68,18 64,18 64,21 C 64,24 70,28 70,28 C 70,28 76,24 76,21 C 76,18 72,18 70,22 Z" fill="oklch(0.55 0.28 0)" stroke="#ffffff" strokeWidth="1" transform="scale(0.8) translate(18, -2)" />
          </g>
          {/* Sparkly blog article white sheet popping out */}
          <rect x="25" y="26" width="50" height="44" rx="6" fill="url(#blogPaperGrad)" stroke="oklch(0.80 0.14 350)" strokeWidth="1.5" />
          {/* Detailed writing/lines of blogs */}
          <line x1="32" y1="36" x2="68" y2="36" stroke="oklch(0.62 0.24 350)" strokeWidth="3" strokeLinecap="round" opacity="0.6" />
          <line x1="32" y1="44" x2="60" y2="44" stroke="oklch(0.62 0.24 350)" strokeWidth="3" strokeLinecap="round" opacity="0.6" />
          <line x1="32" y1="52" x2="68" y2="52" stroke="oklch(0.62 0.24 350)" strokeWidth="3" strokeLinecap="round" opacity="0.6" />
          {/* Main front envelope pocket block */}
          <path d="M 16,48 L 16,80 C 16,84 20,86 24,86 L 76,86 C 80,86 84,80 84,80 L 84,48" fill="url(#vibrantEnv)" stroke="#ffffff" strokeWidth="2.5" />
          {/* Fold overlap lines with white contrast glaze */}
          <path d="M 16,48 L 50,68 L 84,48" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" fill="none" />
          <path d="M 16,85 L 50,65 L 84,85" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" opacity="0.65" fill="none" />
          {/* Shiny highlight glaze */}
          <path d="M 19,53 C 18,63 24,78 44,80" stroke="#ffffff" strokeWidth="4.5" strokeLinecap="round" opacity="0.8" />
        </svg>
      );

    case "calendar":
      return (
        <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
          <defs>
            <linearGradient id="calendarCoverGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="oklch(0.78 0.22 350)" />
              <stop offset="55%" stopColor="oklch(0.62 0.28 350)" />
              <stop offset="100%" stopColor="oklch(0.48 0.26 350)" />
            </linearGradient>
            <linearGradient id="calendarMarkGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="oklch(0.95 0.07 350)" />
              <stop offset="100%" stopColor="oklch(0.62 0.28 350)" />
            </linearGradient>
          </defs>
          <rect x="34" y="14" width="6" height="16" rx="3" fill="oklch(0.85 0.12 350)" stroke="#ffffff" strokeWidth="1" />
          <rect x="60" y="14" width="6" height="16" rx="3" fill="oklch(0.85 0.12 350)" stroke="#ffffff" strokeWidth="1" />
          <rect x="16" y="22" width="68" height="62" rx="14" fill="url(#calendarCoverGrad)" stroke="#ffffff" strokeWidth="2.5" />
          <rect x="24" y="34" width="52" height="42" rx="8" fill="#ffffff" />
          <line x1="24" y1="48" x2="76" y2="48" stroke="oklch(0.85 0.12 350)" strokeWidth="2" opacity="0.55" />
          <line x1="24" y1="62" x2="76" y2="62" stroke="oklch(0.85 0.12 350)" strokeWidth="2" opacity="0.55" />
          <line x1="40" y1="34" x2="40" y2="76" stroke="oklch(0.85 0.12 350)" strokeWidth="2" opacity="0.4" />
          <line x1="60" y1="34" x2="60" y2="76" stroke="oklch(0.85 0.12 350)" strokeWidth="2" opacity="0.4" />
          <circle cx="50" cy="55" r="9" fill="url(#calendarMarkGrad)" stroke="#ffffff" strokeWidth="1.5" />
          <circle cx="50" cy="55" r="3" fill="#ffffff" opacity="0.9" />
          <path d="M 21,28 C 36,23 58,26 66,34" stroke="#ffffff" strokeWidth="4.5" strokeLinecap="round" opacity="0.7" />
          <path d="M 30,18 L 32,13 L 34,18 L 39,20 L 34,22 L 32,27 L 30,22 L 25,20 Z" fill="oklch(0.88 0.12 350)" />
          <circle cx="72" cy="80" r="2" fill="#ffffff" opacity="0.85" />
        </svg>
      );

    default:
      return null;
  }
}
