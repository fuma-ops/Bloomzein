// =============================================================================
// RibbonBackground — a soft-pink "coquette" ribbon-bow wallpaper behind the app
// pages (Today, Calendar, Tools, Read, Me — everything under AppShell).
// A TEST look: repeating gentle bows at low opacity so content stays readable.
// To reset: remove <RibbonBackground /> from BloomBackground (and this file).
// =============================================================================
export function RibbonBackground() {
  return (
    <div className="pointer-events-none fixed inset-0 z-0" aria-hidden>
      <svg width="100%" height="100%" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="bz-ribbon-bow" width="230" height="200" patternUnits="userSpaceOnUse" patternTransform="rotate(-7)">
            {/* one soft bow per tile */}
            <g transform="translate(115,86)" opacity="0.42">
              {/* tails */}
              <path d="M-4,6 C -12,30 -26,42 -34,58" stroke="#F5A9CE" strokeWidth="11" fill="none" strokeLinecap="round" />
              <path d="M4,6 C 12,30 26,42 34,58" stroke="#F5A9CE" strokeWidth="11" fill="none" strokeLinecap="round" />
              {/* loops */}
              <path d="M0,0 C -34,-30 -62,-20 -60,2 C -62,26 -34,32 0,2 Z" fill="#F5A9CE" />
              <path d="M0,0 C 34,-30 62,-20 60,2 C 62,26 34,32 0,2 Z" fill="#F5A9CE" />
              {/* soft inner highlight on the loops */}
              <path d="M0,0 C -26,-20 -46,-14 -45,2 C -46,18 -26,22 0,2 Z" fill="#FBD0E4" opacity="0.7" />
              <path d="M0,0 C 26,-20 46,-14 45,2 C 46,18 26,22 0,2 Z" fill="#FBD0E4" opacity="0.7" />
              {/* knot */}
              <ellipse cx="0" cy="2" rx="9.5" ry="12" fill="#EE8EBF" />
            </g>
            {/* a tiny sparkle to break the grid */}
            <g transform="translate(210,175)" opacity="0.3" fill="#F5A9CE">
              <path d="M0,-7 C 1.4,-2 2,-1.4 7,0 C 2,1.4 1.4,2 0,7 C -1.4,2 -2,1.4 -7,0 C -2,-1.4 -1.4,-2 0,-7 Z" />
            </g>
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#bz-ribbon-bow)" />
      </svg>
    </div>
  );
}
