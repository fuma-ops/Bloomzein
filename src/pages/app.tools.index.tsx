
import { useEffect, useMemo, useState, type MouseEvent } from "react";
import { Sparkles, Pin, ChevronRight } from "lucide-react";
import { TOOLS, type Tool } from "@/components/bloom/tools";
import { BloomFlower } from "@/components/bloom/BloomFlower";
import { AnimatedWords } from "@/components/bloom/AnimatedWords";
import { readTodayAffirmation } from "@/components/bloom/affirmations";
import { CuteToolIcon } from "@/components/bloom/CuteToolIcon";
import { isToolVisited } from "@/components/bloom/visitedTools";
import { CyclePhasePill } from "@/components/bloom/CyclePhasePill";

const LAST_KEY = "bloom:last-tool";
const PINS_KEY = "bloom:pinned-tools";

function linkPropsFor(t: Tool) {
  return t.slug === "budget"
    ? ({ href: "/budget" as const } as const)
    : ({ href: `/app/tools/${t.slug}` as const } as const);
}

export default function ToolsIndex() {
  const [pins, setPins] = useState<string[]>([]);
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
    const pinned = TOOLS.filter((t) => pins.includes(t.slug));
    const rest = TOOLS.filter((t) => !pins.includes(t.slug));
    // Surface tools the user hasn't explored yet, to nudge them toward what's left to discover
    const unexplored = rest.filter((t) => !isToolVisited(t.slug));
    const explored = rest.filter((t) => isToolVisited(t.slug));
    return [...pinned, ...unexplored, ...explored];
  }, [pins]);

  return (
    <div className="relative isolate animate-fade-in">
      {/* Base pink wash — the top reads as one soft surface behind the hero. */}
      <div aria-hidden className="pointer-events-none absolute left-1/2 -translate-x-1/2 w-screen -top-8 -z-20 h-[760px] bg-gradient-to-b from-[#FFD3E8] via-[#FFE4F1] to-transparent" />

      {/* Hero photo as ONE blended page BACKGROUND — same technique as Today &
          Calendar: a full-width image fading on the left (readable title) and the
          bottom (melting into the tools below), so there's no card seam/border. */}
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
        <img src="/images/tools-hero-bg.webp" alt="" className="animate-hero-breathe h-full w-full object-cover object-[68%_58%]" referrerPolicy="no-referrer" />
        {/* left fade → readable light pink behind the title */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#FFE4F1] via-[#FFE4F1]/50 to-transparent" />
      </div>

      {/* ── HERO — transparent; the photo lives in the blended background above. ── */}
      <section className="relative -mx-3 sm:-mx-6 md:-mx-8 -mt-3 sm:-mt-5 md:-mt-8 min-h-[140px] sm:min-h-[180px] animate-card-pop-in">
        <div className="relative z-[1] px-4 pt-5 pb-3 sm:px-8 sm:pt-7 sm:pb-4 max-w-[70%] sm:max-w-md">
          <h1 className="animate-fade-in font-script text-[3.25rem] sm:text-6xl lg:text-7xl text-hotpink leading-[0.9] flex items-center gap-2 drop-shadow-[0_2px_6px_oklch(1_0_0/0.55)]">
            Tools <Sparkles className="h-7 w-7 sm:h-9 sm:w-9" strokeWidth={1.8} />
          </h1>
          <p className="animate-fade-in mt-0 font-script text-lg sm:text-2xl text-rose/90 leading-tight" style={{ animationDelay: "150ms" }}>
            ✦ pick your bloom for today
          </p>
          <CyclePhasePill className="mt-1.5" />
        </div>
      </section>

      {/* TOOLS GRID — no search bar / heading; the grid sits just under the hero */}
      <section className="mt-3 sm:mt-4">
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
