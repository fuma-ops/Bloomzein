import { DreamyFallingIcons } from "./DreamyFallingIcons";

export function BloomBackground() {
  return (
    <div className="pointer-events-none fixed inset-0 z-0 bloom-glow" aria-hidden>
      <DreamyFallingIcons count={8} />
    </div>
  );
}
