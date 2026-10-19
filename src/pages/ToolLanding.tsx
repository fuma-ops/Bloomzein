// Public tool landing page (/tools/<slug>) — the pretty, crawlable page that
// ranks on Google and funnels visitors into the app. Content comes from
// src/lib/toolPages.ts (shared with the prerenderer).
import { useEffect } from "react";
import { ArrowRight, ArrowLeft, Sparkles, Check, ChevronRight } from "lucide-react";
import { BloomFlower } from "@/components/bloom/BloomFlower";
import { TOOL_PAGES, toolPageBySlug } from "@/lib/toolPages";

const SITE = "https://www.bloomzein.com";

function setMeta(name: string, content: string, prop = false) {
  const sel = prop ? `meta[property="${name}"]` : `meta[name="${name}"]`;
  let el = document.head.querySelector(sel) as HTMLMetaElement | null;
  if (!el) { el = document.createElement("meta"); el.setAttribute(prop ? "property" : "name", name); document.head.appendChild(el); }
  el.setAttribute("content", content);
}

export function ToolLandingPage({ slug }: { slug: string }) {
  const tool = toolPageBySlug(slug);

  useEffect(() => {
    if (!tool) return;
    const title = tool.metaTitle;
    const url = `${SITE}/tools/${tool.slug}`;
    const img = SITE + tool.image;
    const prevTitle = document.title;
    document.title = title;
    setMeta("description", tool.metaDescription);
    setMeta("og:title", title, true);
    setMeta("og:description", tool.metaDescription, true);
    setMeta("og:url", url, true);
    setMeta("og:image", img, true);
    setMeta("og:type", "website", true);
    setMeta("twitter:card", "summary_large_image");
    setMeta("twitter:title", title);
    setMeta("twitter:description", tool.metaDescription);
    setMeta("twitter:image", img);
    let canonical = document.head.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    const prevCanonical = canonical?.getAttribute("href") ?? null;
    if (!canonical) { canonical = document.createElement("link"); canonical.setAttribute("rel", "canonical"); document.head.appendChild(canonical); }
    canonical.setAttribute("href", url);
    return () => { document.title = prevTitle; if (prevCanonical) canonical?.setAttribute("href", prevCanonical); };
  }, [tool]);

  if (!tool) {
    return (
      <div className="min-h-screen bg-[#FFF0F6] text-rose">
        <div className="mx-auto max-w-2xl px-5 py-20 text-center">
          <h1 className="font-script text-4xl text-hotpink">Tool not found</h1>
          <a href="/" className="bloom-luxury-btn mt-5 inline-flex items-center gap-1.5 px-5 py-2.5 text-sm font-bold text-white"><ArrowLeft className="h-4 w-4" /> Back to Bloomzein</a>
        </div>
      </div>
    );
  }

  const related = tool.related.map(toolPageBySlug).filter(Boolean) as typeof TOOL_PAGES;

  return (
    <div className="min-h-screen bg-[#FFF0F6] text-rose">
      {/* top bar */}
      <header className="sticky top-0 z-20 border-b border-white/60 bg-[#FFF0F6]/85 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3 sm:px-6">
          <a href="/" className="inline-flex items-center gap-1.5">
            <BloomFlower size={24} petal="#EC4899" center="#FFFFFF" />
            <span className="font-script text-2xl text-hotpink">Bloomzein</span>
          </a>
          <a href="/onboarding" className="bloom-luxury-btn inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-bold text-white">
            Start Blooming <ArrowRight className="h-4 w-4" />
          </a>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 pb-16 sm:px-6">
        {/* breadcrumb */}
        <nav className="flex items-center gap-1.5 pt-5 text-xs font-semibold text-rose/60">
          <a href="/" className="hover:text-hotpink">Home</a> <ChevronRight className="h-3 w-3" />
          <a href="/#features" className="hover:text-hotpink">Tools</a> <ChevronRight className="h-3 w-3" />
          <span className="text-rose/80">{tool.name}</span>
        </nav>

        {/* hero */}
        <section className="mt-5 grid items-center gap-8 lg:grid-cols-2">
          <div>
            <h1 className="font-serif text-[2.2rem] font-bold leading-tight text-[#7a1247] sm:text-[2.8rem]">{tool.h1}</h1>
            <p className="mt-3 text-[15px] leading-relaxed text-rose/85 sm:text-[16px]">{tool.intro}</p>
            <div className="mt-6 flex flex-wrap gap-3">
              <a href="/onboarding" className="bloom-luxury-btn inline-flex items-center gap-2 rounded-full px-6 py-3 text-[15px] font-bold text-white">
                <Sparkles className="h-4 w-4" /> Start Blooming — free
              </a>
              <a href={tool.appHref} className="inline-flex items-center gap-1.5 rounded-full border border-hotpink/30 bg-white/70 px-5 py-3 text-[15px] font-bold text-hotpink transition hover:bg-white">
                Open {tool.name} <ArrowRight className="h-4 w-4" />
              </a>
            </div>
          </div>
          <div className="overflow-hidden rounded-[1.75rem] border border-white/70 shadow-[0_24px_60px_-28px_rgba(236,72,153,0.5)]">
            <img src={tool.image} alt={tool.h1} className="aspect-[4/3] w-full object-cover" width={1200} height={900} />
          </div>
        </section>

        {/* sections */}
        <section className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {tool.sections.map((s) => (
            <div key={s.h} className="rounded-[1.5rem] border border-petal/50 bg-white/75 p-5 shadow-sm">
              <span className="grid h-9 w-9 place-items-center rounded-full bg-hotpink/12"><Check className="h-4 w-4 text-hotpink" strokeWidth={2.4} /></span>
              <h2 className="mt-3 text-[17px] font-extrabold text-hotpink">{s.h}</h2>
              <p className="mt-1.5 text-[14px] leading-relaxed text-rose/80">{s.p}</p>
            </div>
          ))}
        </section>

        {/* FAQ */}
        <section className="mt-12">
          <h2 className="font-script text-3xl text-hotpink">Frequently asked questions</h2>
          <div className="mt-4 space-y-3">
            {tool.faqs.map((f) => (
              <div key={f.q} className="rounded-[1.25rem] border border-petal/50 bg-white/75 p-4">
                <h3 className="text-[15px] font-extrabold text-[#7a1247]">{f.q}</h3>
                <p className="mt-1 text-[14px] leading-relaxed text-rose/80">{f.a}</p>
              </div>
            ))}
          </div>
        </section>

        {/* related */}
        {related.length > 0 && (
          <section className="mt-12">
            <h2 className="font-script text-3xl text-hotpink">Explore more tools</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              {related.map((r) => (
                <a key={r.slug} href={`/tools/${r.slug}`} className="group flex items-center justify-between rounded-2xl border border-petal/50 bg-white/75 px-4 py-3 transition hover:bg-white">
                  <span className="text-[14px] font-bold text-hotpink">{r.name}</span>
                  <ArrowRight className="h-4 w-4 text-hotpink transition group-hover:translate-x-0.5" />
                </a>
              ))}
            </div>
          </section>
        )}

        {/* footer CTA */}
        <section className="mt-14 rounded-[1.75rem] bg-gradient-to-br from-hotpink to-[#db2777] p-8 text-center text-white shadow-lg">
          <h2 className="font-script text-3xl">Your softest era starts here ✿</h2>
          <p className="mx-auto mt-2 max-w-md text-[14px] text-white/90">Cycle, meals, movement, mind and life — one beautiful app, synced to your body.</p>
          <a href="/onboarding" className="mt-5 inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-[15px] font-bold text-hotpink transition hover:bg-white/90">
            <Sparkles className="h-4 w-4" /> Start Blooming — free
          </a>
        </section>

        <p className="mt-8 text-center text-xs text-rose/50">
          <a href="/" className="font-semibold hover:text-hotpink">Home</a> · <a href="/blog" className="font-semibold hover:text-hotpink">Read</a> · <a href="/privacy" className="font-semibold hover:text-hotpink">Privacy</a>
        </p>
      </main>
    </div>
  );
}
