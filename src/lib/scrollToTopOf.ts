/** Scrolls so the given element's top edge sits exactly at the top of the visible content area (below any fixed app bar). */
export function scrollToTopOf(el: HTMLElement | null) {
  if (!el) return;
  const main = el.closest("main");
  const offset = main ? parseFloat(getComputedStyle(main).paddingTop) || 0 : 0;
  const top = el.getBoundingClientRect().top - offset;
  // 1px tolerance avoids re-triggering (and undoing) the scroll on React's double-invoked dev effects
  if (top > 1) window.scrollTo({ top });
}
