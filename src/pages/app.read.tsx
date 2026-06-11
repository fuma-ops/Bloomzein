import { useMemo, useState } from "react";
import { Search, Heart, Clock, ArrowLeft, BookOpen, Sparkles, ArrowRight, Flower2 } from "lucide-react";
import { BloomBubbles } from "@/components/bloom/BloomBubbles";

/* ---------- data ---------- */
const TOPICS = ["All", "Cycle & Body", "Self-care", "Money", "Movement", "Mindset", "Recipes"] as const;
type Topic = typeof TOPICS[number];

interface Article {
  id: string;
  title: string;
  excerpt: string;
  topic: Exclude<Topic, "All">;
  minutes: number;
  blooms: string;
  image: string;
  body: string;
}

const TOPIC_LABELS: Record<Topic, string> = {
  All: "All",
  "Cycle & Body": "Cycle & Body",
  "Self-care": "Self-care",
  Money: "Money",
  Movement: "Movement",
  Mindset: "Mind",
  Recipes: "Recipes",
};

const IMG = {
  featured: "/images/read-featured.png",
  "Cycle & Body": "/images/read-cycle.png",
  "Self-care": "/images/read-selfcare.png",
  "Money": "/images/read-money.png",
  "Movement": "/images/read-movement.png",
  "Mindset": "/images/read-mindset.png",
  "Recipes": "/images/read-recipes.png",
} as const;

const ARTICLES: Article[] = [
  { id: "a1", title: "Cycle syncing 101", topic: "Cycle & Body", minutes: 6, blooms: "2.3k", image: IMG["Cycle & Body"],
    excerpt: "Match your routine to your phase and feel like yourself again.",
    body: "Your cycle is a four-season superpower. In follicular days, lean into new beginnings — pitch ideas, try new workouts. Ovulation is your social peak. Luteal asks for slower, nourishing rituals. Menstrual is rest — and rest is productive too." },
  { id: "a2", title: "Soft girl morning ritual", topic: "Self-care", minutes: 4, blooms: "1.9k", image: IMG["Self-care"],
    excerpt: "Ten gentle minutes that change the entire tone of your day.",
    body: "Open the curtains slowly. Warm water with lemon. A two-song stretch. Mist your face. Write one sentence in your journal — just one. The point isn't productivity; it's softness." },
  { id: "a3", title: "Pink budgeting that actually works", topic: "Money", minutes: 8, blooms: "1.6k", image: IMG["Money"],
    excerpt: "A kinder framework for the girlie who hates spreadsheets.",
    body: "Forget restriction. Try the 50/30/20 with a twist: 50% needs, 20% future-you, 30% joy. Name your joy categories — flowers, lattes, books — so spending feels intentional, not guilty." },
  { id: "a4", title: "Moon salutation flow", topic: "Movement", minutes: 5, blooms: "2.1k", image: IMG["Movement"],
    excerpt: "A slow flow for evenings when sun salutations feel like too much.",
    body: "Start in mountain pose. Sweep arms overhead, fold, step into a low lunge. Move like honey — there's nowhere to be. Finish in child's pose with three long breaths." },
  { id: "a5", title: "Reframing 'I should'", topic: "Mindset", minutes: 5, blooms: "1.4k", image: IMG["Mindset"],
    excerpt: "How to soften your inner voice without losing your edge.",
    body: "Every time you catch a should, swap it for 'I get to' or 'I'm choosing'. Watch what happens. The task is the same; the relationship to it transforms." },
  { id: "a6", title: "Strawberry oat bowl", topic: "Recipes", minutes: 3, blooms: "2.6k", image: IMG["Recipes"],
    excerpt: "A pink breakfast that feels like a hug in a bowl.",
    body: "Blend frozen strawberries with banana and oat milk until creamy. Top with toasted oats, coconut, and a swirl of almond butter. Eat with your favorite spoon." },
  { id: "a7", title: "Luteal phase glow-up", topic: "Cycle & Body", minutes: 7, blooms: "1.8k", image: IMG["Cycle & Body"],
    excerpt: "Why the week before your period can be your most creative.",
    body: "Luteal is finishing energy. It's when you tidy projects, journal honestly, and crave warmth. Honor the inward pull — schedule deep work and decline what doesn't matter." },
  { id: "a8", title: "The 7-minute skincare edit", topic: "Self-care", minutes: 4, blooms: "2.0k", image: IMG["Self-care"],
    excerpt: "Three steps, two products, one glowing you.",
    body: "Cleanse with cool water. Pat — never rub. A pea of moisturizer on damp skin locks in everything. SPF every morning. That's it. The rest is marketing." },
  { id: "a9", title: "Hip-opening sequence", topic: "Movement", minutes: 6, blooms: "1.5k", image: IMG["Movement"],
    excerpt: "Release a week of sitting in one delicious flow.",
    body: "Pigeon, then half-frog, then a deep malasana squat. Hold each for 8 slow breaths. Your hips store your stress — let them spill it out." },
  { id: "a10", title: "Rose latte at home", topic: "Recipes", minutes: 3, blooms: "1.2k", image: IMG["Recipes"],
    excerpt: "Café vibes for the cost of one rose petal.",
    body: "Warm oat milk with a teaspoon of rose syrup and a shot of espresso. Top with foam and a dusting of cardamom. Drink slowly by the window." },
];

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

const AVATAR_GRADIENTS = [
  "from-hotpink to-magenta",
  "from-petal to-blush",
  "from-magenta to-rose",
];

function AvatarStack() {
  return (
    <span className="inline-flex items-center -space-x-2">
      {AVATAR_GRADIENTS.map((g, i) => (
        <span key={i} className={`h-5 w-5 rounded-full bg-gradient-to-br ${g} border-2 border-white/90 shadow-sm`} />
      ))}
    </span>
  );
}

function HeartBtn({ saved, onClick }: { saved: boolean; onClick: (e: React.MouseEvent) => void }) {
  return (
    <button
      onClick={(e) => { e.stopPropagation(); onClick(e); }}
      aria-label={saved ? "Unsave" : "Save"}
      className={[
        "grid h-8 w-8 place-items-center rounded-full transition border backdrop-blur",
        saved
          ? "bg-hotpink text-white border-transparent shadow-md shadow-hotpink/40"
          : "bg-white/85 text-hotpink border-petal/60 hover:bg-white",
      ].join(" ")}
    >
      <Heart className="h-4 w-4" strokeWidth={1.8} fill={saved ? "currentColor" : "none"} />
    </button>
  );
}

/* ---------- page ---------- */
export default function ReadPage() {
  const [query, setQuery] = useState("");
  const [topic, setTopic] = useState<Topic>("All");
  const [saved, setSaved] = useState<Record<string, boolean>>({});
  const [openId, setOpenId] = useState<string | null>(null);

  const toggleSave = (id: string) => setSaved((s) => ({ ...s, [id]: !s[id] }));

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return ARTICLES.filter((a) => {
      const matchTopic = topic === "All" || a.topic === topic;
      const matchQ = !q || a.title.toLowerCase().includes(q) || a.topic.toLowerCase().includes(q) || a.excerpt.toLowerCase().includes(q);
      return matchTopic && matchQ;
    });
  }, [query, topic]);

  const featured = ARTICLES[0];
  const recommended = RECOMMENDED_IDS.map((id) => ARTICLES.find((a) => a.id === id)!).filter(Boolean);
  const savedArticles = ARTICLES.filter((a) => saved[a.id]);
  const open = openId ? ARTICLES.find((a) => a.id === openId) : null;

  if (open) {
    return (
      <article className="relative animate-fade-in">
        <BloomBubbles count={8} />
        <button
          onClick={() => setOpenId(null)}
          className="inline-flex items-center gap-1.5 rounded-full bg-white/85 backdrop-blur px-3 py-1.5 text-xs font-semibold text-hotpink border border-petal/60 hover:bg-white transition"
        >
          <ArrowLeft className="h-3.5 w-3.5" strokeWidth={1.8} /> Back to Read
        </button>
        <div className="mt-4 overflow-hidden rounded-[2.5rem] border border-petal/60 shadow-[0_20px_50px_-20px_oklch(0.6_0.27_350/0.4)]">
          <img src={open.image} alt="" className="block h-64 sm:h-80 w-full object-cover" referrerPolicy="no-referrer" />
        </div>
        <header className="mt-6 flex flex-wrap items-center gap-3">
          <TopicBadge topic={open.topic} />
          <ReadTime minutes={open.minutes} />
          <div className="ml-auto"><HeartBtn saved={!!saved[open.id]} onClick={() => toggleSave(open.id)} /></div>
        </header>
        <h1 className="mt-3 font-script text-5xl sm:text-6xl text-hotpink leading-none">{open.title}</h1>
        <p className="mt-2 text-base text-rose/80 italic">{open.excerpt}</p>
        <div className="mt-6 rounded-3xl bg-white/85 backdrop-blur p-6 sm:p-8 border border-petal/50 shadow-[0_10px_30px_-15px_oklch(0.6_0.22_350/0.3)]">
          <p className="text-[15px] leading-7 text-rose">{open.body}</p>
        </div>
      </article>
    );
  }

  return (
    <div className="relative animate-fade-in">
      <BloomBubbles count={10} />

      {/* HEADER */}
      <header className="sticky top-0 z-30 -mx-3 px-3 pt-2 pb-2 sm:static sm:mx-0 sm:px-0 sm:pt-0 sm:pb-0 bg-blush/70 sm:bg-transparent backdrop-blur-md sm:backdrop-blur-none">
        <h1 className="font-script text-3xl sm:text-5xl lg:text-6xl text-hotpink leading-none">Read</h1>
        <p className="mt-0.5 sm:mt-1 text-xs sm:text-sm text-rose/80">soft reads for your softest era ✿</p>
        <div className="mt-2 sm:mt-4 relative max-w-xl">
          <Search className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-rose/60" strokeWidth={1.8} />
          <input
            id="search-reads"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="What would you like to bloom into today?"
            className="w-full rounded-full bg-white/90 backdrop-blur pl-11 pr-4 py-2 sm:py-3 text-sm text-rose placeholder:text-rose/50 border border-petal/60 outline-none transition focus:ring-4 focus:ring-hotpink/20 focus:border-hotpink"
          />
        </div>
      </header>

      {/* TOPIC CHIPS */}
      <nav className="relative mt-3 sm:mt-6 -mx-3 px-3 sm:mx-0 sm:px-0">
        <div className="flex gap-2 overflow-x-auto no-scrollbar animate-bloom-scroll-hint">
          {TOPICS.map((t) => {
            const active = topic === t;
            return (
              <button
                key={t}
                onClick={() => setTopic(t)}
                className={[
                  "shrink-0 rounded-full px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-semibold whitespace-nowrap transition border active:scale-95",
                  active
                    ? "bloom-shine bg-gradient-to-br from-hotpink to-magenta text-white border-transparent shadow-[0_6px_18px_-6px_oklch(0.65_0.27_350/0.6)]"
                    : "bg-blush text-rose border-petal/50 hover:bg-petal/60 hover:-translate-y-0.5 hover:shadow-md",
                ].join(" ")}
              >
                {TOPIC_LABELS[t]}
              </button>
            );
          })}
        </div>
        {/* edge fades hint there's more to scroll */}
        <div className="pointer-events-none absolute inset-y-0 left-0 w-6 bg-gradient-to-r from-blush sm:from-background to-transparent sm:hidden" />
        <div className="pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-blush sm:from-background to-transparent" />
      </nav>

      {/* FEATURED */}
      <section className="mt-4 sm:mt-8">
        <button
          onClick={() => setOpenId(featured.id)}
          className="group block w-full text-left relative overflow-hidden rounded-[1.75rem] sm:rounded-[2.5rem] border border-petal/60 shadow-[0_20px_50px_-20px_oklch(0.6_0.27_350/0.4)] transition hover:-translate-y-0.5"
        >
          <img src={IMG.featured} alt="" className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" referrerPolicy="no-referrer" />
          <div className="absolute inset-0 bg-gradient-to-t from-magenta/70 via-hotpink/20 to-transparent" />
          <div className="relative px-4 py-5 sm:px-10 sm:py-14 min-h-[170px] sm:min-h-[360px] flex flex-col justify-end">
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
              <span className="inline-flex items-center gap-1 rounded-full bg-white/95 px-2 py-0.5 sm:px-2.5 sm:py-1 text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-hotpink">
                <Sparkles className="h-3 w-3" strokeWidth={2} /> Today's pick
              </span>
              <TopicBadge topic={featured.topic} />
            </div>
            <h2 className="mt-2 sm:mt-3 font-script text-2xl sm:text-6xl text-white leading-none drop-shadow-[0_2px_6px_oklch(0.4_0.2_350/0.6)]">
              {featured.title}
            </h2>
            <p className="mt-1.5 sm:mt-2 max-w-xl text-xs sm:text-base text-white/95 drop-shadow line-clamp-2">{featured.excerpt}</p>
            <div className="mt-2 sm:mt-3 flex items-center gap-3 text-white/95">
              <span className="inline-flex items-center gap-1 text-[11px] sm:text-xs font-semibold"><Clock className="h-3.5 w-3.5" strokeWidth={1.8} /> {featured.minutes} min read</span>
              <AvatarStack />
              <BloomCount count={`${featured.blooms} blooms`} light />
            </div>
          </div>
        </button>
      </section>

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
            {filtered.map((a) => (
              <ArticleCard key={a.id} article={a} saved={!!saved[a.id]} onSave={() => toggleSave(a.id)} onOpen={() => setOpenId(a.id)} />
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
          <button className="bloom-luxury-btn shrink-0 inline-flex items-center gap-1 px-3 sm:px-4 py-1.5 sm:py-2 text-xs font-semibold text-white">
            See more <ArrowRight className="h-3 w-3" strokeWidth={2} />
          </button>
        </div>
        <div className="relative -mx-3 px-3 sm:mx-0 sm:px-0">
          <div className="flex gap-3 sm:gap-4 pb-2 overflow-x-auto no-scrollbar animate-bloom-scroll-hint">
            {recommended.map((a) => (
              <button
                key={a.id}
                onClick={() => setOpenId(a.id)}
                className="group relative self-start shrink-0 w-44 sm:w-64 text-left overflow-hidden rounded-2xl sm:rounded-3xl border border-petal/60 bg-white/85 backdrop-blur shadow-[0_8px_24px_-12px_oklch(0.7_0.18_350/0.3)] transition hover:-translate-y-1 hover:shadow-[0_18px_36px_-14px_oklch(0.7_0.22_350/0.45)] active:scale-95"
              >
                <div className="relative h-24 sm:h-36 overflow-hidden">
                  <img src={a.image} alt="" className="block h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" loading="lazy" referrerPolicy="no-referrer" />
                  <div className="absolute top-2 left-2"><TopicBadge topic={a.topic} /></div>
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
            {savedArticles.map((a) => (
              <ArticleCard key={a.id} article={a} saved onSave={() => toggleSave(a.id)} onOpen={() => setOpenId(a.id)} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function ArticleCard({ article, saved, onSave, onOpen }: { article: Article; saved: boolean; onSave: () => void; onOpen: () => void }) {
  return (
    <div
      onClick={onOpen}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onOpen(); }}
      className="group relative text-left overflow-hidden rounded-2xl sm:rounded-3xl border border-petal/60 bg-white/85 backdrop-blur shadow-[0_8px_24px_-12px_oklch(0.7_0.18_350/0.3)] transition hover:-translate-y-1 hover:shadow-[0_18px_36px_-14px_oklch(0.7_0.22_350/0.45)] cursor-pointer"
    >
      <div className="relative h-28 sm:h-44 overflow-hidden">
        <img src={article.image} alt="" className="block h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" loading="lazy" referrerPolicy="no-referrer" />
        <div className="absolute top-2 left-2 sm:top-3 sm:left-3"><TopicBadge topic={article.topic} /></div>
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
