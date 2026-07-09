
import { useEffect, useMemo, useState, type MouseEvent } from "react";
import { Sparkles, Search, Pin, ChevronRight } from "lucide-react";
import { TOOLS, type Tool } from "@/components/bloom/tools";
import { BloomFlower } from "@/components/bloom/BloomFlower";
import { AnimatedWords } from "@/components/bloom/AnimatedWords";
import { readTodayAffirmation } from "@/components/bloom/affirmations";
import { CuteToolIcon } from "@/components/bloom/CuteToolIcon";
import { isToolVisited } from "@/components/bloom/visitedTools";

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
  const [affirmation, setAffirmation] = useState("");

  // Echo the exact affirmation the Today page is showing (shared source).
  useEffect(() => { try { setAffirmation(readTodayAffirmation()); } catch {} }, []);

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
    // Surface tools the user hasn't explored yet, to nudge them toward what's left to discover
    const unexplored = rest.filter((t) => !isToolVisited(t.slug));
    const explored = rest.filter((t) => isToolVisited(t.slug));
    return [...pinned, ...unexplored, ...explored];
  }, [pins, query]);

  return (
    <div className="relative animate-fade-in">

      {/* HERO — title left on a soft pink gradient. The app-wide drifting
          flowers provide the page's dynamic background. */}
      <section>
        <div className="animate-card-breathe pearl-frame relative overflow-hidden rounded-[1.75rem] sm:rounded-[2.5rem]" style={{ background: 'linear-gradient(135deg,#FFF1F8 0%,#FFE1EF 60%,#FFD2E8 100%)' }}>
          {/* Floating sparkles */}
          <Sparkles className="animate-sparkle-drift pointer-events-none absolute top-4 right-10 sm:top-8 sm:right-16 h-4 w-4 sm:h-5 sm:w-5 text-hotpink/45 z-[3]" strokeWidth={1.8} style={{ animationDelay: "0s" }} />
          <Sparkles className="animate-sparkle-drift pointer-events-none absolute bottom-6 right-20 sm:bottom-10 sm:right-32 h-2.5 w-2.5 sm:h-4 sm:w-4 text-hotpink/35 z-[3]" strokeWidth={1.8} style={{ animationDelay: "1.8s" }} />
          {/* Title + subtitle stacked on the left */}
          <div className="relative z-[4] px-5 py-4 sm:px-7 sm:py-5 flex flex-col items-start gap-1 sm:gap-1.5 max-w-[62%]">
            <h1
              className="font-script text-3xl sm:text-5xl lg:text-6xl text-hotpink leading-none flex items-center gap-2"
              style={{ textShadow: '0 0 20px rgba(255,255,255,1), 0 2px 8px rgba(255,255,255,0.85)' }}
            >
              Tools <Sparkles className="h-5 w-5 sm:h-7 sm:w-7" strokeWidth={1.8} />
            </h1>
            <p
              className="text-xs sm:text-sm text-rose/90"
              style={{ textShadow: '0 1px 6px rgba(255,255,255,0.95)' }}
            >
              ✦ pick your bloom for today
            </p>
          </div>
        </div>
      </section>

      {/* SEARCH BAR — below hero */}
      <div className="mt-4 relative max-w-md">
        <Search className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-rose/60" strokeWidth={1.8} />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="What would help you bloom today?"
          className="w-full rounded-full bg-white/90 backdrop-blur pl-11 pr-11 py-2 sm:py-3 text-sm text-rose placeholder:text-rose/50 border border-petal/60 outline-none transition focus:ring-4 focus:ring-hotpink/20 focus:border-hotpink"
        />
        <Sparkles className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-hotpink/70" strokeWidth={1.8} />
      </div>

      {/* TOOLS GRID */}
      <section className="mt-2">
        <div className="mb-3">
          <h2 className="font-script text-2xl sm:text-3xl text-hotpink leading-none">Your Bloom Tools</h2>
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
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {ordered.map((t, i) => (
              <ToolCard
                key={t.slug}
                tool={t}
                index={i}
                pinned={pins.includes(t.slug)}
                onGo={() => remember(t.slug)}
                onTogglePin={() => togglePin(t.slug)}
              />
            ))}
          </div>
        )}
      </section>

      {/* DAILY AFFIRMATION — same soft flower-flanked, self-writing line as Today */}
      {affirmation && (
        <section className="mt-6 sm:mt-8 mb-2 flex items-center justify-center gap-2.5 sm:gap-3.5 px-6 animate-fade-in">
          <BloomFlower size={22} petal="#EC4899" className="shrink-0 opacity-80 animate-icon-breathe" />
          <AnimatedWords
            key={affirmation}
            text={affirmation}
            stagger={95}
            className="font-script text-xl sm:text-2xl text-hotpink text-center leading-snug text-balance"
          />
          <BloomFlower size={22} petal="#EC4899" className="shrink-0 opacity-80 animate-icon-breathe" />
        </section>
      )}
    </div>
  );
}

function ToolCard({ tool, onGo, pinned, onTogglePin, index }: { tool: Tool; onGo: () => void; pinned: boolean; onTogglePin: () => void; index: number }) {
  const handleClick = (_e: MouseEvent) => {
    onGo();
  };

  const explored = isToolVisited(tool.slug);

  return (
    <a
      {...linkPropsFor(tool)}
      onClick={handleClick}
      style={{ animationDelay: `${index * 0.06}s, ${(index % 6) * 1.4}s` }}
      className={`bloom-pearl-card pearl-sheen group relative block overflow-hidden rounded-3xl p-4 sm:p-5 transition hover:-translate-y-0.5 animate-card-vibrate ${
        explored ? "" : "opacity-70"
      }`}
    >
      <div
        className="pointer-events-none absolute -right-6 -bottom-6 h-28 w-28 sm:h-32 sm:w-32 -z-10 rounded-full"
        style={{ background: "radial-gradient(circle, oklch(0.75 0.18 350 / 0.18), transparent 70%)" }}
      />

      <div className="flex items-start justify-between">
        <span
          className={`animate-icon-breathe grid h-12 w-12 sm:h-14 sm:w-14 place-items-center rounded-2xl text-white shrink-0 clay-blob ${
            explored ? "" : "grayscale opacity-60"
          }`}
        >
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
          <ChevronRight
            className="h-4 w-4 sm:h-5 sm:w-5 animate-chevron-glow"
            strokeWidth={2}
          />
        </div>
      </div>

      <h3 className="mt-3 sm:mt-4 font-bold text-sm sm:text-base text-[#831843] leading-snug">{tool.label}</h3>
      <p className="mt-0.5 sm:mt-1 text-[11px] sm:text-sm text-rose/70 leading-snug line-clamp-2">{tool.blurb}</p>

      {pinned ? (
        <span className="mt-3 inline-flex items-center gap-1 rounded-full bg-hotpink/10 text-hotpink text-[9px] sm:text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 border border-hotpink/20">
          <Pin className="h-2.5 w-2.5" strokeWidth={2} fill="currentColor" /> Pinned
        </span>
      ) : !explored ? (
        <span className="mt-3 inline-flex items-center gap-1 rounded-full bg-rose/10 text-rose/60 text-[9px] sm:text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 border border-rose/15">
          Not explored yet
        </span>
      ) : null}
    </a>
  );
}
