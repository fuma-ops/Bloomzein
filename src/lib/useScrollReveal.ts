import { useEffect, type RefObject } from "react";

/**
 * Scroll-reveal: fade + slide each `[data-reveal]` element up as it enters the
 * viewport (once), instead of everything animating on page load. Add
 * `data-reveal` to any section; add `data-reveal-stagger` too and its direct
 * children cascade in. Pair with the `[data-reveal]` CSS in styles.css.
 *
 * Watches for elements added later (conditional sections) via a MutationObserver,
 * respects reduced-motion by revealing immediately, and degrades gracefully when
 * IntersectionObserver is unavailable.
 */
export function useScrollReveal<T extends HTMLElement>(ref: RefObject<T | null>, deps: unknown[] = []) {
  useEffect(() => {
    const root = ref.current;
    if (!root) return;

    const revealNow = (el: Element) => el.setAttribute("data-reveal-in", "");

    const reduced = typeof window !== "undefined"
      && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

    if (reduced || typeof IntersectionObserver === "undefined") {
      root.querySelectorAll("[data-reveal]").forEach(revealNow);
      return;
    }

    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            revealNow(e.target);
            io.unobserve(e.target);
          }
        }
      },
      { rootMargin: "0px 0px -10% 0px", threshold: 0.12 },
    );

    const observeAll = () =>
      root.querySelectorAll("[data-reveal]:not([data-reveal-in]), [data-reveal-stagger]:not([data-reveal-in])").forEach((el) => io.observe(el));

    observeAll();
    // Catch sections mounted after first paint (e.g. once cycle data loads).
    const mo = new MutationObserver(observeAll);
    mo.observe(root, { childList: true, subtree: true });

    return () => {
      io.disconnect();
      mo.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
