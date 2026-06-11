
import { useEffect, useMemo, useState, type MouseEvent } from "react";
import { Sparkles, Search, Pin, ChevronRight, SlidersHorizontal, ArrowRight, Heart } from "lucide-react";
import { TOOLS, type Tool } from "@/components/bloom/tools";
import { BloomBubbles } from "@/components/bloom/BloomBubbles";
import { CuteToolIcon } from "@/components/bloom/CuteToolIcon";

const LAST_KEY = "bloom:last-tool";
const PINS_KEY = "bloom:pinned-tools";

function linkPropsFor(t: Tool) {
  return t.slug === "budget"
    ? ({ href: "/budget" as const } as const)
    : ({ href: `/app/tools/${t.slug}` as const } as const);
}

export default function ToolsIndex() {
  const [pins, setPins] = useState<string[]>([]);
  const [query, setQuery] = useState("");

  useEffect(() => {
    try {
      const raw = localStorage.getItem(PINS_KEY);
      if (raw) setPins(JSON.parse(raw));
    } catch {}
  }, []);

  const remember = (slug: string) => {
    try { localStorage.setItem(LAST_KEY, slug); } catch {}
  };

  const togglePin = (slug: string) => {
    setPins((prev) => {
      const next = prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug];
      try { localStorage.setItem(PINS_KEY, JSON.stringify(next)); } catch {}
      return next;
    });
  };

  const ordered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = q
      ? TOOLS.filter((t) => t.label.toLowerCase().includes(q) || t.blurb.toLowerCase().includes(q))
      : TOOLS;
    const pinned = filtered.filter((t) => pins.includes(t.slug));
    const rest = filtered.filter((t) => !pins.includes(t.slug));
    return [...pinned, ...rest];
  }, [pins, query]);

  return (
    <div className="relative animate-fade-in">
      <BloomBubbles count={10} />

      {/* HEADER */}
      <header className="mb-5 sm:mb-7">
        <h1 className="font-script text-3xl sm:text-5xl lg:text-6xl text-hotpink leading-none flex items-center gap-2">
          Tools <Sparkles className="h-5 w-5 sm:h-7 sm:w-7" strokeWidth={1.8} />
        </h1>
        <p className="mt-0.5 sm:mt-1 text-xs sm:text-sm text-rose/80">✦ pick your bloom for today 🌸</p>

        <div className="mt-3 sm:mt-4 relative max-w-md">
          <Search className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-rose/60" strokeWidth={1.8} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="What would help you bloom today?"
            className="w-full rounded-full bg-white/90 backdrop-blur pl-11 pr-11 py-2 sm:py-3 text-sm text-rose placeholder:text-rose/50 border border-petal/60 outline-none transition focus:ring-4 focus:ring-hotpink/20 focus:border-hotpink"
          />
          <Sparkles className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-hotpink/70" strokeWidth={1.8} />
        </div>
      </header>

      {/* HERO — Continue your bloom journey */}
      <section className="mt-4 sm:mt-6">
        <div className="pearl-frame relative overflow-hidden rounded-[1.75rem] sm:rounded-[2.5rem]">
          <img src="/images/tools-hero-journey.png" alt="" className="absolute inset-0 h-full w-full object-cover object-left" />
          <div className="absolute inset-0 z-[2] bg-gradient-to-l from-white/90 via-white/55 to-transparent" />
          <div className="relative z-[2] ml-auto px-4 py-3 sm:px-8 sm:py-5 max-w-sm text-right">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/85 backdrop-blur px-2.5 py-0.5 sm:px-3 sm:py-1 text-[9px] sm:text-[11px] font-bold uppercase tracking-wider text-hotpink border border-petal/60">
              Continue your bloom journey <Sparkles className="h-3 w-3" strokeWidth={2} />
            </span>
            <h2 className="mt-1.5 sm:mt-2 font-bold text-lg sm:text-2xl text-[#831843] leading-tight">Workout Programs</h2>
            <p className="mt-0.5 text-[11px] sm:text-sm text-rose/80">Day 12 · 3 workouts completed</p>

            <div className="mt-2 sm:mt-3 ml-auto">
              <div className="h-2 sm:h-2.5 w-full max-w-[180px] sm:max-w-[220px] ml-auto rounded-full bg-white/70 border border-petal/60 overflow-hidden">
                <div className="h-full rounded-full bg-hotpink" style={{ width: "78%" }} />
              </div>
              <p className="mt-1 text-[10px] sm:text-xs font-bold text-hotpink">78% complete</p>
            </div>

            <a
              href="/app/tools/workout"
              className="bloom-luxury-btn mt-2 sm:mt-3 inline-flex items-center gap-1.5 px-4 sm:px-5 py-2 sm:py-2.5 text-xs sm:text-sm font-semibold text-white"
            >
              Continue <ArrowRight className="h-3.5 w-3.5 sm:h-4 sm:w-4" strokeWidth={2.5} />
            </a>
          </div>
        </div>
      </section>

      {/* TOOLS GRID */}
      <section className="mt-2">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-script text-2xl sm:text-3xl text-hotpink leading-none">Your Bloom Tools 🌸</h2>
          <span className="inline-flex items-center gap-1 text-xs sm:text-sm font-semibold text-hotpink/80">
            Customize <SlidersHorizontal className="h-3.5 w-3.5" strokeWidth={2} />
          </span>
        </div>

        {ordered.length === 0 ? (
          <div className="bloom-pearl-card rounded-3xl p-8 text-center">
            <p className="text-sm text-rose">No tools match "{query}".</p>
            <button
              onClick={() => setQuery("")}
              className="bloom-luxury-btn mt-3 inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white"
            >
              Clear search
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            {ordered.map((t) => (
              <ToolCard
                key={t.slug}
                tool={t}
                pinned={pins.includes(t.slug)}
                onGo={() => remember(t.slug)}
                onTogglePin={() => togglePin(t.slug)}
              />
            ))}
          </div>
        )}
      </section>

      {/* HERO — Daily Bloom Affirmation */}
      <section className="mt-4 sm:mt-6">
        <div className="pearl-frame relative overflow-hidden rounded-[1.75rem] sm:rounded-[2.5rem]">
          <img src="/images/tools-hero-affirmation.png" alt="" className="absolute inset-0 h-full w-full object-cover object-left" />
          <div className="absolute inset-0 z-[2] bg-gradient-to-l from-white/90 via-white/55 to-transparent" />
          <div className="relative z-[2] ml-auto px-4 py-3 sm:px-8 sm:py-5 max-w-sm text-right">
            <span className="clay-blob ml-auto inline-grid h-8 w-8 sm:h-10 sm:w-10 place-items-center rounded-2xl text-white">
              <Heart className="h-3.5 w-3.5 sm:h-4 sm:w-4" strokeWidth={2} fill="currentColor" />
            </span>
            <p className="mt-1.5 sm:mt-2 text-[10px] sm:text-xs font-bold uppercase tracking-wider text-hotpink">Daily Bloom Affirmation</p>
            <p className="mt-0.5 sm:mt-1 font-script text-xl sm:text-3xl text-[#831843] leading-snug">I choose myself, every single day. 💗</p>

            <a
              href="/app/today"
              className="bloom-luxury-btn mt-2 sm:mt-3 inline-flex items-center gap-1.5 px-4 sm:px-5 py-2 sm:py-2.5 text-xs sm:text-sm font-semibold text-white"
            >
              Read more <ChevronRight className="h-3.5 w-3.5 sm:h-4 sm:w-4" strokeWidth={2.5} />
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}

function ToolCard({ tool, onGo, pinned, onTogglePin }: { tool: Tool; onGo: () => void; pinned: boolean; onTogglePin: () => void }) {
  const handleClick = (_e: MouseEvent) => {
    onGo();
  };

  return (
    <a
      {...linkPropsFor(tool)}
      onClick={handleClick}
      className="bloom-pearl-card group relative block rounded-3xl p-4 sm:p-5 transition hover:-translate-y-0.5"
    >
      <div className="flex items-start justify-between">
        <span className="clay-blob grid h-12 w-12 sm:h-14 sm:w-14 place-items-center rounded-2xl text-white shrink-0">
          <CuteToolIcon slug={tool.slug} className="h-7 w-7 sm:h-8 sm:w-8 drop-shadow-[0_2px_3px_oklch(0.4_0.22_350/0.3)]" />
        </span>
        <div className="flex items-center gap-1">
          <button
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); onTogglePin(); }}
            aria-label={pinned ? "Unpin tool" : "Pin tool"}
            title={pinned ? "Unpin" : "Pin to top"}
            className={[
              "inline-flex h-6 w-6 sm:h-7 sm:w-7 items-center justify-center rounded-full transition",
              pinned ? "text-hotpink opacity-100" : "text-rose/30 opacity-0 group-hover:opacity-100 hover:text-hotpink",
            ].join(" ")}
          >
            <Pin className="h-3.5 w-3.5" strokeWidth={2} fill={pinned ? "currentColor" : "none"} />
          </button>
          <ChevronRight className="h-4 w-4 sm:h-5 sm:w-5 text-rose/30" strokeWidth={2} />
        </div>
      </div>

      <h3 className="mt-3 sm:mt-4 font-bold text-sm sm:text-base text-[#831843] leading-snug">{tool.label}</h3>
      <p className="mt-0.5 sm:mt-1 text-[11px] sm:text-sm text-rose/70 leading-snug line-clamp-2">{tool.blurb}</p>

      {pinned && (
        <span className="mt-3 inline-flex items-center gap-1 rounded-full bg-hotpink/10 text-hotpink text-[9px] sm:text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 border border-hotpink/20">
          <Pin className="h-2.5 w-2.5" strokeWidth={2} fill="currentColor" /> Pinned
        </span>
      )}
    </a>
  );
}
