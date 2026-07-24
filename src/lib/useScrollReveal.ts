import { useEffect, useRef, useState, type RefObject } from "react";

const prefersReduced = () =>
  typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

/**
 * Returns a ref + whether that element has scrolled into view (once by default).
 * Use it to kick off React-driven entrance animations (count-ups, ring fills)
 * exactly when a section appears — not on page load.
 */
export function useInView<T extends HTMLElement>(opts?: { threshold?: number; rootMargin?: string; once?: boolean }) {
  const ref = useRef<T>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") { setInView(true); return; }
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setInView(true);
          if (opts?.once !== false) io.unobserve(e.target);
        } else if (opts?.once === false) {
          setInView(false);
        }
      },
      { threshold: opts?.threshold ?? 0.35, rootMargin: opts?.rootMargin ?? "0px 0px -8% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return [ref, inView] as const;
}

/**
 * Animates a number from 0 → target (easeOutCubic) once `active` is true. Great
 * for counters and ring percentages. Respects reduced-motion (jumps to target).
 */
export function useCountUp(target: number, active: boolean, durationMs = 1100) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (!active) return;
    if (prefersReduced()) { setVal(target); return; }
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs);
      const eased = 1 - Math.pow(1 - t, 3);
      setVal(target * eased);
      if (t < 1) raf = requestAnimationFrame(tick);
      else setVal(target);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, active, durationMs]);
  return val;
}

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
