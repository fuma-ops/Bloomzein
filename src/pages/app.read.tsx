import { useEffect, useMemo, useRef, useState } from "react";
import { Search, Heart, Clock, ArrowLeft, BookOpen, ArrowRight, Flower2,
  Sparkles, Salad, CookingPot, Gem, PersonStanding, Feather, Brain, Moon, Leaf,
  HeartHandshake, NotebookPen, Compass, Star } from "lucide-react";
import { BloomBubbles } from "@/components/bloom/BloomBubbles";
import { CyclePhasePill } from "@/components/bloom/CyclePhasePill";
import { FILTERS, ARTICLES, IMG, articleById, type Filter, type Article } from "@/lib/readsData";
import { loadArticleBody } from "@/content/reads/registry";
import { ArticleBody, parseArticle, type ParsedArticle } from "@/components/bloom/read/ArticleBody";
import { ArticleTOC } from "@/components/bloom/read/ArticleTOC";
import { BloomFlower } from "@/components/bloom/read/BloomFlower";

/* ---------- data ---------- */
/* Compact labels for the filter row (full category names elsewhere). */
const FILTER_LABELS: Partial<Record<Filter, string>> = {
  "Cycle & Hormones": "Cycle",
  "Mental Wellness": "Mind",
  "Soft Living": "Soft Living",
  "Herbal Wellness": "Herbal",
  "Bloomzein Originals": "Originals",
};
const filterLabel = (f: Filter) => FILTER_LABELS[f] ?? f;

/* A tiny icon per category so the filter row reads faster and feels richer. */
const FILTER_ICONS: Record<Filter, typeof Sparkles> = {
  All: Sparkles,
  "Cycle & Hormones": Flower2,
  Nutrition: Salad,
  Recipes: CookingPot,
  Beauty: Gem,
  Yoga: PersonStanding,
  "Soft Living": Feather,
  "Mental Wellness": Brain,
  Sleep: Moon,
  "Herbal Wellness": Leaf,
  Relationships: HeartHandshake,
  Journaling: NotebookPen,
  Lifestyle: Compass,
  "Bloomzein Originals": Star,
};

const RECOMMENDED_IDS = ["a2", "a6", "a3", "a9", "a5"];

/* ---------- atoms ---------- */
function TopicBadge({ topic }: { topic: string }) {
  return (
    <span className="inline-block rounded-full bg-white/85 backdrop-blur px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-hotpink border border-petal/60">
      {topic}
    </span>
  );
}

function ReadTime({ minutes, light }: { minutes: number; light?: boolean }) {
  return (
    <span className={["inline-flex items-center gap-1 text-[11px] font-semibold", light ? "text-white/95" : "text-rose/70"].join(" ")}>
      <Clock className="h-3 w-3" strokeWidth={1.8} /> {minutes} min
    </span>
  );
}

function BloomCount({ count, light }: { count: string; light?: boolean }) {
  return (
    <span className={["inline-flex items-center gap-1 text-[11px] font-semibold", light ? "text-white/95" : "text-rose/70"].join(" ")}>
      <Flower2 className="h-3 w-3" strokeWidth={1.8} /> {count}
    </span>
  );
}

function HeartBtn({ saved, onClick }: { saved: boolean; onClick: (e: React.MouseEvent) => void }) {
  const [popped, setPopped] = useState(false);
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onClick(e);
        setPopped(true);
        setTimeout(() => setPopped(false), 400);
      }}
      aria-label={saved ? "Unsave" : "Save"}
      className={[
        "grid h-8 w-8 place-items-center rounded-full transition border backdrop-blur",
        popped && "animate-heart-pop",
        saved
          ? "bg-hotpink text-white border-transparent shadow-md shadow-hotpink/40"
          : "bg-white/85 text-hotpink border-petal/60 hover:bg-white",
      ].filter(Boolean).join(" ")}
    >
      <Heart className="h-4 w-4" strokeWidth={1.8} fill={saved ? "currentColor" : "none"} />
    </button>
  );
}

/* ---------- page ---------- */
export default function ReadPage() {
  const [query, setQuery] = useState("");
  const [topic, setTopic] = useState<Filter>("All");
  const [saved, setSaved] = useState<Record<string, boolean>>({});
  const [openId, setOpenId] = useState<string | null>(null);
  const heroRef = useRef<HTMLElement>(null);

  // Deep-link: /app/read?a=<id> opens that article (used by the coach's
  // "A moment for you" and the Diet phase-reads carousel).
  useEffect(() => {
    try {
      const id = new URLSearchParams(window.location.search).get("a");
      if (id && articleById(id)) setOpenId(id);
    } catch {}
  }, []);

  const toggleSave = (id: string) => setSaved((s) => ({ ...s, [id]: !s[id] }));

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return ARTICLES.filter((a) => {
      const matchTopic = topic === "All" || a.category === topic;
      const matchQ = !q || a.title.toLowerCase().includes(q) || a.category.toLowerCase().includes(q) || a.excerpt.toLowerCase().includes(q);
      return matchTopic && matchQ;
    });
  }, [query, topic]);

  const recommended = RECOMMENDED_IDS.map((id) => ARTICLES.find((a) => a.id === id)!).filter(Boolean);
  const savedArticles = ARTICLES.filter((a) => saved[a.id]);
  const open = openId ? ARTICLES.find((a) => a.id === openId) : null;

  if (open) {
    return <ArticleReader article={open} saved={!!saved[open.id]} onSave={() => toggleSave(open.id)} onBack={() => setOpenId(null)} />;
  }

  return (
    <div className="relative isolate animate-fade-in">
      {/* Base pink wash — the top reads as one soft surface behind the hero. */}
      <div aria-hidden className="pointer-events-none absolute left-1/2 -translate-x-1/2 w-screen -top-8 -z-20 h-[760px] bg-gradient-to-b from-[#FFD3E8] via-[#FFE4F1] to-transparent" />

      {/* Hero photo as ONE blended page BACKGROUND — same technique as Today &
          Tools, but with LIGHTER fades so the photo stays clearly visible: a soft
          left wash keeps the title readable, a soft bottom wash melts into the
          search + filters below — no card seam/border. */}
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 -translate-x-1/2 w-screen -top-8 -z-10 h-[640px] overflow-hidden"
        style={{
          // Alpha-dissolve the photo toward the bottom (not an opaque colour band)
          // so it melts into the real page background with no hard seam — same tall,
          // soft blend as the Today page.
          WebkitMaskImage: "linear-gradient(to bottom, #000 0%, #000 45%, transparent 100%)",
          maskImage: "linear-gradient(to bottom, #000 0%, #000 45%, transparent 100%)",
        }}
      >
        <img src={IMG.featured} alt="" className="animate-hero-breathe h-full w-full object-cover object-[55%_32%]" referrerPolicy="no-referrer" />
        {/* left fade → keep it gentle so the photo reads through behind the title */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#FFE4F1]/90 via-[#FFE4F1]/25 to-transparent" />
      </div>

      <BloomBubbles count={10} />

      {/* HERO — transparent; the photo lives in the blended background above. */}
      <section ref={heroRef} className="relative -mx-3 sm:-mx-6 lg:-mx-8 -mt-3 sm:-mt-5 lg:-mt-6 min-h-[150px] sm:min-h-[200px] animate-card-pop-in" style={{ animationDelay: "0ms" }}>
        <div className="relative z-[1] px-4 pt-5 pb-3 sm:px-8 sm:pt-7 sm:pb-4 max-w-[72%] sm:max-w-md">
          <h1 className="animate-fade-in font-script text-3xl sm:text-5xl lg:text-6xl text-hotpink leading-none drop-shadow-[0_2px_6px_oklch(1_0_0/0.55)]">Read</h1>
          <p className="animate-fade-in mt-0 font-script text-lg sm:text-2xl text-rose/90 leading-tight" style={{ animationDelay: "150ms" }}>soft reads for your softest era ✿</p>
          <CyclePhasePill className="mt-1.5" />
        </div>
      </section>

      {/* SEARCH + FILTERS — one frosted control bar floating over the hero edge.
          Search on top; categories on a single scrollable line ("All" pinned
          left, active chip glows, a soft fade hints there's more to swipe). */}
      <div className="relative z-[2] mt-14 sm:mt-4 mx-auto max-w-3xl rounded-[1.75rem] border border-white/60 bg-white/50 backdrop-blur-xl p-2.5 sm:p-3.5 shadow-[0_22px_55px_-26px_oklch(0.55_0.2_350/0.55)] animate-card-pop-in">
        <div className="relative">
          <Search className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-hotpink" strokeWidth={2.2} />
          <input
            id="search-reads"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="What would you like to bloom into today?"
            className="w-full rounded-full bg-white/85 backdrop-blur pl-11 pr-4 py-2.5 sm:py-3 text-sm text-rose placeholder:text-rose/50 border border-petal/50 outline-none transition focus:ring-4 focus:ring-hotpink/20 focus:border-hotpink"
          />
        </div>

        <div className="relative mt-2.5">
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-0.5">
            {FILTERS.map((t) => {
              const active = topic === t;
              const Icon = FILTER_ICONS[t];
              const pinned = t === "All";
              return (
                <button
                  key={t}
                  onClick={() => setTopic(t)}
                  className={[
                    "shrink-0 inline-flex items-center gap-1.5 rounded-full pl-2.5 pr-3 py-1.5 text-xs sm:text-[13px] font-semibold whitespace-nowrap border transition active:scale-95",
                    pinned ? "sticky left-0 z-[1]" : "",
                    active
                      ? "bg-hotpink text-white border-hotpink shadow-md shadow-hotpink/30 animate-selected-glow"
                      : "bg-white/85 text-rose border-petal/60 hover:bg-blush/70",
                  ].join(" ")}
                >
                  <Icon className="h-3.5 w-3.5 shrink-0" strokeWidth={2} />
                  {filterLabel(t)}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* GRID */}
      <section className="mt-5 sm:mt-6">
        {filtered.length === 0 ? (
          <EmptyCard
            text={query ? `No items matching "${query}".` : "No reads in this topic yet."}
            cta="See all reads"
            onClick={() => { setQuery(""); setTopic("All"); }}
          />
        ) : (
          <div key={topic + query} className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-3 animate-fade-in">
            {filtered.map((a, i) => (
              <ArticleCard key={a.id} article={a} index={i} saved={!!saved[a.id]} onSave={() => toggleSave(a.id)} onOpen={() => setOpenId(a.id)} />
            ))}
          </div>
        )}
      </section>

      {/* FOR YOU */}
      <section className="mt-8 sm:mt-12">
        <div className="mb-3 flex items-end justify-between gap-3">
          <div>
            <h2 className="font-script text-2xl sm:text-4xl text-hotpink">Recommended for you ✿</h2>
            <p className="text-xs text-rose/70">Based on your cycle phase & recent reads</p>
          </div>
          <button className="animate-cta-glow bloom-luxury-btn shrink-0 inline-flex items-center gap-1 px-3 sm:px-4 py-1.5 sm:py-2 text-xs font-semibold text-white">
            See more <ArrowRight className="h-3 w-3" strokeWidth={2} />
          </button>
        </div>
        <div className="relative -mx-3 px-3 sm:mx-0 sm:px-0">
          <div className="flex gap-3 sm:gap-4 pb-2 overflow-x-auto no-scrollbar animate-bloom-scroll-hint">
            {recommended.map((a, i) => (
              <button
                key={a.id}
                onClick={() => setOpenId(a.id)}
                style={{ animationDelay: `${i * 0.06}s` }}
                className="group relative self-start shrink-0 w-44 sm:w-64 text-left overflow-hidden rounded-2xl sm:rounded-3xl border border-petal/60 bg-white/85 backdrop-blur shadow-[0_8px_24px_-12px_oklch(0.7_0.18_350/0.3)] transition hover:-translate-y-1 hover:shadow-[0_18px_36px_-14px_oklch(0.7_0.22_350/0.45)] active:scale-95 animate-card-pop-in"
              >
                <div className="relative h-24 sm:h-36 overflow-hidden">
                  <img src={a.image} alt="" className="block h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" loading="lazy" referrerPolicy="no-referrer" />
                  <div className="absolute top-2 left-2"><TopicBadge topic={a.category} /></div>
                </div>
                <div className="p-3 sm:p-4">
                  <h3 className="text-xs sm:text-sm font-bold text-rose leading-tight line-clamp-2">{a.title}</h3>
                  <div className="mt-2 flex items-center gap-2">
                    <ReadTime minutes={a.minutes} />
                    <BloomCount count={a.blooms} />
                  </div>
                </div>
              </button>
            ))}
          </div>
          {/* edge fades hint there's more to scroll */}
          <div className="pointer-events-none absolute inset-y-0 left-0 w-6 bg-gradient-to-r from-blush sm:from-background to-transparent sm:hidden" />
          <div className="pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-l from-blush sm:from-background to-transparent" />
        </div>
      </section>

      {/* SAVED */}
      <section className="mt-8 sm:mt-12 mb-4">
        <div className="mb-3 flex items-end justify-between">
          <h2 className="font-script text-2xl sm:text-4xl text-hotpink">Saved reads</h2>
          {savedArticles.length > 0 && <span className="text-xs text-rose/70">{savedArticles.length} saved</span>}
        </div>
        {savedArticles.length === 0 ? (
          <div className="bloom-pearl-card rounded-3xl p-8 text-center">
            <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-blush text-hotpink">
              <Heart className="h-5 w-5" strokeWidth={1.6} />
            </span>
            <p className="mt-3 text-sm text-rose">Tap the heart on any article to save it here.</p>
            <button
              onClick={() => { setTopic("All"); setQuery(""); document.scrollingElement?.scrollTo({ top: 0, behavior: "smooth" }); }}
              className="bloom-luxury-btn mt-3 inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white"
            >
              <BookOpen className="h-3.5 w-3.5" strokeWidth={1.8} /> Browse articles
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-3 animate-fade-in">
            {savedArticles.map((a, i) => (
              <ArticleCard key={a.id} article={a} index={i} saved onSave={() => toggleSave(a.id)} onOpen={() => setOpenId(a.id)} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

/* ---------- article reader (magazine layout: left-title hero + TOC + drop-cap body) ---------- */
function ArticleReader({ article, saved, onSave, onBack }: { article: Article; saved: boolean; onSave: () => void; onBack: () => void }) {
  const [parsed, setParsed] = useState<ParsedArticle | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setParsed(null);
    document.scrollingElement?.scrollTo({ top: 0 });
    loadArticleBody(article).then((body) => {
      if (!alive) return;
      // Legacy short reads return a bare paragraph — wrap it so every article
      // renders through one path with a headline.
      const md = !body
        ? `# ${article.title}\n\n*${article.excerpt}*\n\nThis story is coming soon.`
        : body.trimStart().startsWith("# ")
        ? body
        : `# ${article.title}\n\n*${article.excerpt}*\n\n${body}`;
      setParsed(parseArticle(md));
      setLoading(false);
    });
    return () => { alive = false; };
  }, [article]);

  const headline = parsed?.headline || article.title;
  const heroFade = "linear-gradient(to bottom, #000 0%, #000 42%, transparent 100%)";

  return (
    // break out of the page padding so the hero can reach the very top & edges,
    // then re-add the padding inside so the content keeps its normal alignment.
    <article className="relative animate-fade-in -mx-3 sm:-mx-6 lg:-mx-8 -mt-3 sm:-mt-5 lg:-mt-6 px-3 sm:px-6 lg:px-8 pt-3 sm:pt-5 lg:pt-6">
      {/* HERO IMAGE as a blended page background — reaches the top, and melts
          into the pink page background as it passes behind the content below. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[26rem] sm:h-[30rem] lg:h-[34rem] overflow-hidden"
        style={{ WebkitMaskImage: heroFade, maskImage: heroFade }}
      >
        <img
          src={article.image}
          alt=""
          className="animate-hero-breathe h-full w-full object-cover object-center"
          referrerPolicy="no-referrer"
        />
        {/* left ~40% pink wash — blends the photo so white title text reads cleanly */}
        <div
          aria-hidden
          className="absolute inset-0"
          style={{ background: "linear-gradient(to right, rgba(226,46,134,0.97) 0%, rgba(226,46,134,0.9) 26%, rgba(226,46,134,0.5) 41%, rgba(226,46,134,0) 58%)" }}
        />
        {/* gentle base tint so the photo settles into the page pink */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[#FFE4F1]/70" />
      </div>

      <BloomBubbles count={8} />

      {/* top bar over the hero: back (left) + heart (right) */}
      <div className="relative z-[1] flex items-center gap-2">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-1.5 rounded-full bg-white/80 backdrop-blur px-3 py-1.5 text-xs font-semibold text-hotpink border border-white/70 shadow-sm hover:bg-white transition active:scale-95"
        >
          <ArrowLeft className="h-3.5 w-3.5" strokeWidth={1.8} /> Back to Read
        </button>
        <div className="ml-auto"><HeartBtn saved={saved} onClick={onSave} /></div>
      </div>

      {/* HERO TITLE — white, sitting on the pink-washed left of the image;
          category · time · views sit UNDER the title. */}
      <header className="relative z-[1] flex min-h-[11rem] sm:min-h-[13rem] lg:min-h-[15rem] flex-col justify-center pb-3 max-w-[15rem] sm:max-w-[22rem] lg:max-w-[25rem]">
        <h1
          className="font-script text-[2.7rem] sm:text-5xl lg:text-[3.5rem] text-white leading-[0.98]"
          style={{ textShadow: "0 2px 16px rgba(140,18,74,0.55), 0 1px 2px rgba(140,18,74,0.45)" }}
        >
          {headline}
        </h1>
        <div className="mt-3.5 flex flex-wrap items-center gap-2.5" style={{ filter: "drop-shadow(0 1px 5px rgba(140,18,74,0.4))" }}>
          <TopicBadge topic={article.category} />
          <ReadTime minutes={article.minutes} light />
          <BloomCount count={article.blooms} light />
        </div>
      </header>

      {/* On small screens the TOC sits on top, above the article. */}
      {parsed ? <ArticleTOC sections={parsed.sections} collapsible className="relative z-[1] lg:hidden mt-3 mb-4" /> : null}

      {/* BODY — sticky "On this page" (desktop) + white article card */}
      <div className="relative z-[1] mt-2 lg:mt-4 lg:grid lg:grid-cols-[15rem_minmax(0,1fr)] lg:gap-8 lg:items-start">
        <aside className="hidden lg:block lg:sticky lg:top-4">
          {parsed ? <ArticleTOC sections={parsed.sections} /> : null}
        </aside>

        <div className="min-w-0">
          <div className="relative overflow-hidden rounded-[1.75rem] border border-petal/50 bg-white/92 backdrop-blur p-5 sm:p-8 lg:p-9 shadow-[0_18px_50px_-28px_oklch(0.6_0.22_350/0.4)]">
            {/* Soft, faded logo-flowers breathing in the article's white space. */}
            <BloomFlower className="pointer-events-none absolute -right-8 top-24 w-32 sm:w-40 text-hotpink opacity-[0.08] animate-icon-breathe" />
            <BloomFlower className="pointer-events-none absolute -left-10 top-[42%] w-36 sm:w-52 text-magenta opacity-[0.07] animate-icon-breathe" style={{ animationDelay: "1.1s" }} />
            <BloomFlower className="pointer-events-none absolute -right-10 top-[70%] w-32 sm:w-44 text-hotpink opacity-[0.08] animate-icon-breathe" style={{ animationDelay: "2.2s" }} />
            <BloomFlower className="pointer-events-none absolute left-[46%] bottom-6 w-24 sm:w-32 text-petal opacity-[0.12] animate-icon-breathe" style={{ animationDelay: "0.6s" }} />

            <div className="relative z-[1]">
              {loading || !parsed ? (
                <div className="animate-pulse space-y-4 py-2">
                  <div className="h-4 w-2/3 rounded-full bg-petal/30" />
                  <div className="mt-8 space-y-3">
                    {Array.from({ length: 7 }).map((_, i) => (
                      <div key={i} className="h-3.5 rounded-full bg-petal/25" style={{ width: `${92 - (i % 3) * 12}%` }} />
                    ))}
                  </div>
                </div>
              ) : (
                <ArticleBody parsed={parsed} />
              )}
            </div>
          </div>

          <div className="mt-8 mb-2 flex justify-center lg:justify-start">
            <button
              onClick={onBack}
              className="inline-flex items-center gap-1.5 rounded-full bg-white/85 backdrop-blur px-4 py-2 text-xs font-semibold text-hotpink border border-petal/60 hover:bg-white transition active:scale-95"
            >
              <ArrowLeft className="h-3.5 w-3.5" strokeWidth={1.8} /> Back to Read
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}

function ArticleCard({ article, saved, onSave, onOpen, index = 0 }: { article: Article; saved: boolean; onSave: () => void; onOpen: () => void; index?: number }) {
  return (
    <div
      onClick={onOpen}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onOpen(); }}
      style={{ animationDelay: `${index * 0.06}s` }}
      className="group relative text-left overflow-hidden rounded-2xl sm:rounded-3xl border border-petal/60 bg-white/85 backdrop-blur shadow-[0_8px_24px_-12px_oklch(0.7_0.18_350/0.3)] transition hover:-translate-y-1 hover:shadow-[0_18px_36px_-14px_oklch(0.7_0.22_350/0.45)] cursor-pointer animate-card-pop-in"
    >
      <div className="relative h-28 sm:h-44 overflow-hidden">
        <img src={article.image} alt="" className="block h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" loading="lazy" referrerPolicy="no-referrer" />
        <div className="absolute top-2 left-2 sm:top-3 sm:left-3"><TopicBadge topic={article.category} /></div>
        <div className="absolute top-2 right-2 sm:top-3 sm:right-3"><HeartBtn saved={saved} onClick={onSave} /></div>
      </div>
      <div className="p-3 sm:p-5">
        <h3 className="text-sm sm:text-base font-bold text-rose leading-snug line-clamp-2">{article.title}</h3>
        <p className="mt-1 sm:mt-1.5 text-xs sm:text-sm text-rose/75 line-clamp-2 hidden sm:block">{article.excerpt}</p>
        <div className="mt-2 sm:mt-3 flex items-center justify-between">
          <span className="flex items-center gap-2">
            <ReadTime minutes={article.minutes} />
            <BloomCount count={article.blooms} />
          </span>
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-hotpink opacity-0 group-hover:opacity-100 transition">
            Read <ArrowRight className="h-3 w-3" strokeWidth={2} />
          </span>
        </div>
      </div>
    </div>
  );
}

function EmptyCard({ text, cta, onClick }: { text: string; cta: string; onClick: () => void }) {
  return (
    <div className="rounded-3xl bg-white/85 backdrop-blur p-10 border border-petal/50 text-center">
      <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-blush text-hotpink">
        <BookOpen className="h-5 w-5" strokeWidth={1.6} />
      </span>
      <p className="mt-3 text-sm text-rose">{text}</p>
      <button
        onClick={onClick}
        className="bloom-luxury-btn mt-3 inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white"
      >
        {cta} <ArrowRight className="h-3 w-3" strokeWidth={2} />
      </button>
    </div>
  );
}
