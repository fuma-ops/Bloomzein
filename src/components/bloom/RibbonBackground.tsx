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
      {/* soft blend veil — keeps content readable while the ribbons show through */}
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,240,247,0.55)_0%,rgba(255,236,245,0.62)_45%,rgba(255,238,246,0.72)_100%)]" />
    </div>
  );
}
