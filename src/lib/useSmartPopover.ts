import { useEffect, useState, type RefObject } from "react";

/**
 * Computes a fixed-position placement for a floating popover anchored to a
 * trigger element, flipping above/below and sliding left/right so it always
 * stays fully inside the viewport — regardless of where the trigger sits in
 * the page (narrow column, near an edge, close to the bottom of a card…).
 */
export function useSmartPopoverPosition(
  triggerRef: RefObject<HTMLElement | null>,
  open: boolean,
  size: { width: number; height: number }
) {
  const [style, setStyle] = useState<React.CSSProperties>({ visibility: "hidden" });

  useEffect(() => {
    if (!open || !triggerRef.current) return;
    const margin = 8;

    const update = () => {
      const trigger = triggerRef.current;
      if (!trigger) return;
      const rect = trigger.getBoundingClientRect();
      const vw = window.innerWidth;
      const vh = window.innerHeight;

      let top: number;
      if (rect.bottom + margin + size.height <= vh) {
        top = rect.bottom + margin;
      } else if (rect.top - margin - size.height >= 0) {
        top = rect.top - margin - size.height;
      } else {
        top = Math.max(margin, vh - size.height - margin);
      }

      // Prefer aligning the popover's left edge with the trigger's left edge
      // (it then opens "into" the open space to the right); fall back to
      // right-aligning when that would push it past the viewport edge.
      let left = rect.left;
      if (left + size.width > vw - margin) left = rect.right - size.width;
      left = Math.min(Math.max(left, margin), Math.max(margin, vw - size.width - margin));

      setStyle({ position: "fixed", top, left, width: size.width, zIndex: 100 });
    };

    update();
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
    };
  }, [open, triggerRef, size.width, size.height]);

  return style;
}
