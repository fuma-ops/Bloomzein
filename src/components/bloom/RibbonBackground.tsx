// =============================================================================
// RibbonBackground — the soft-pink satin ribbon-bow hero band behind every app
// page. Rendered INSIDE <main> (AppShell) as an absolute, top-anchored band that
// scrolls with the page like the old Today hero, so it's never occluded by the
// content's stacking context. Full-width ribbon scene up top, alpha-fading down
// into the page, with a soft left wash so titles stay readable.
// To reset: remove <RibbonBackground /> from AppShell (and this file).
// =============================================================================
export function RibbonBackground() {
  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 z-0 overflow-hidden" aria-hidden>
      <img
        src="/images/page-bg-today-ribbon.webp"
        alt=""
        referrerPolicy="no-referrer"
        className="animate-hero-breathe block h-auto w-full"
        style={{
          WebkitMaskImage: "linear-gradient(to bottom, #000 0%, #000 52%, transparent 100%)",
          maskImage: "linear-gradient(to bottom, #000 0%, #000 52%, transparent 100%)",
        }}
      />
      {/* left wash — soft spotlight behind the page title, fading to transparent so
          the ribbons stay vivid on the right (same as the Today hero). */}
      <div className="absolute inset-0 bg-[radial-gradient(120%_115%_at_0%_38%,rgba(255,232,244,0.9)_0%,rgba(255,232,244,0.42)_27%,transparent_52%)]" />
    </div>
  );
}
