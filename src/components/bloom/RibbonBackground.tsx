// =============================================================================
// RibbonBackground — the soft-pink satin ribbon-bow hero band behind every app
// page. Rendered INSIDE <main> (AppShell) as an absolute, top-anchored band that
// scrolls with the page like the old page heroes. Uses a BOUNDED height +
// object-cover (not h-auto) so it never blows up on large/near-square screens
// (e.g. a Galaxy Z Fold unfolded). Alpha-fades down into the page, with a soft
// left wash so titles stay readable.
// To reset: remove <RibbonBackground /> from AppShell (and this file).
// =============================================================================
export function RibbonBackground() {
  return (
    <div
      className="pointer-events-none absolute inset-x-0 top-0 z-0 h-[280px] overflow-hidden sm:h-[380px] lg:h-[520px]"
      aria-hidden
      style={{
        // fade the whole band to transparent toward the bottom (same as the old heroes)
        WebkitMaskImage: "linear-gradient(to bottom, #000 0%, #000 46%, transparent 100%)",
        maskImage: "linear-gradient(to bottom, #000 0%, #000 46%, transparent 100%)",
      }}
    >
      <img
        src="/images/page-bg-today-ribbon.webp"
        alt=""
        referrerPolicy="no-referrer"
        className="animate-hero-breathe h-full w-full object-cover object-[60%_20%]"
      />
      {/* left wash — a soft spotlight behind the page title, fading to transparent so
          the ribbons stay vivid on the right (same as the old hero). */}
      <div className="absolute inset-0 bg-[radial-gradient(120%_115%_at_0%_38%,rgba(255,232,244,0.9)_0%,rgba(255,232,244,0.42)_27%,transparent_52%)]" />
    </div>
  );
}
