// =============================================================================
// RibbonBackground — the soft-pink satin ribbon-bow wallpaper behind every app
// page (Today, Calendar, Tools, Read, Me — all under AppShell). It's a fixed
// full-viewport image with a gentle translucent veil so the frosted cards and
// text stay perfectly readable on top.
// To reset: remove <RibbonBackground /> from BloomBackground (and this file).
// =============================================================================
export function RibbonBackground() {
  return (
    <div className="pointer-events-none fixed inset-0 z-0" aria-hidden>
      <img
        src="/images/page-bg-today-ribbon.webp"
        alt=""
        className="h-full w-full object-cover"
        referrerPolicy="no-referrer"
      />
      {/* Blend veil — like Today's hero: the ribbons stay vivid up top (behind the
          page header) and softly veil downward so content lower on the page stays
          readable. */}
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,240,247,0.14)_0%,rgba(255,238,246,0.30)_24%,rgba(255,236,245,0.56)_55%,rgba(255,238,246,0.7)_100%)]" />
    </div>
  );
}
