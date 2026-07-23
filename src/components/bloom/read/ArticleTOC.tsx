import { useEffect, useState } from "react";
import type { ArticleSection } from "./ArticleBody";

/**
 * "On this page" table of contents with scroll-spy. Highlights the section
 * currently in view and smooth-scrolls on click. Desktop-only companion panel
 * for the article reader (hidden on mobile, where the article is single-column).
 */
export function ArticleTOC({ sections, className = "" }: { sections: ArticleSection[]; className?: string }) {
  const [active, setActive] = useState<string>(sections[0]?.id ?? "");

  useEffect(() => {
    if (!sections.length) return;
    const els = sections
      .map((s) => document.getElementById(s.id))
      .filter((el): el is HTMLElement => !!el);
    if (!els.length) return;

    const obs = new IntersectionObserver(
      (entries) => {
        // pick the top-most heading that is currently intersecting
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActive(visible[0].target.id);
      },
      { rootMargin: "-88px 0px -65% 0px", threshold: 0 },
    );
    els.forEach((el) => obs.observe(el));
    return () => obs.disconnect();
  }, [sections]);

  if (sections.length < 2) return null;

  const go = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
    setActive(id);
  };

  return (
    <nav className={["rounded-[1.5rem] border border-petal/60 bg-white/80 backdrop-blur p-4 sm:p-5 shadow-[0_10px_30px_-18px_oklch(0.6_0.22_350/0.3)]", className].join(" ")}>
      <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.18em] text-hotpink/80">On this page</p>
      <ul className="space-y-1">
        {sections.map((s) => {
          const on = active === s.id;
          return (
            <li key={s.id}>
              <button
                onClick={() => go(s.id)}
                className={[
                  "group flex w-full items-start gap-2.5 rounded-xl px-2 py-1.5 text-left transition",
                  on ? "bg-blush/60" : "hover:bg-blush/40",
                ].join(" ")}
              >
                <span
                  className={[
                    "mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full transition",
                    on ? "bg-hotpink scale-125" : "bg-petal group-hover:bg-hotpink/50",
                  ].join(" ")}
                />
                <span
                  className={[
                    "text-[13px] leading-snug transition",
                    on ? "font-semibold text-hotpink" : "text-rose/70 group-hover:text-rose",
                  ].join(" ")}
                >
                  {s.label}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export default ArticleTOC;
