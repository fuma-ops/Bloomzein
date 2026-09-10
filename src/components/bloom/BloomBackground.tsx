import { DreamyFallingIcons } from "./DreamyFallingIcons";
import { RibbonBackground } from "./RibbonBackground";

export function BloomBackground() {
  return (
    <div className="pointer-events-none fixed inset-0 z-0 bloom-glow" aria-hidden>
      {/* TEST: soft ribbon-bow wallpaper. To reset, remove this line + RibbonBackground.tsx. */}
      <RibbonBackground />
      <DreamyFallingIcons count={8} />
    </div>
  );
}
