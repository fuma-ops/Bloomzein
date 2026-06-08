import { useEffect, useRef, useState } from "react";
import { CuteToolIcon } from "./CuteToolIcon";

interface NodeDef {
  slug: string;
  label: string;
  x: number;
  y: number;
}

const TOOL_NODES: NodeDef[] = [
  { slug: "cycle", label: "Cycle Tracker", x: 50, y: 9 },
  { slug: "meals", label: "Meal Planner", x: 86, y: 29 },
  { slug: "yoga", label: "Yoga Flows", x: 86, y: 71 },
  { slug: "notes", label: "Reminders", x: 50, y: 91 },
  { slug: "budget", label: "Budget Planner", x: 14, y: 71 },
  { slug: "diary", label: "Dreamy Diary", x: 14, y: 29 },
];

const CENTER: NodeDef = { slug: "calendar", label: "Bloom Calendar", x: 50, y: 50 };

const NODE_MAP: Record<string, NodeDef> = { [CENTER.slug]: CENTER };
for (const n of TOOL_NODES) NODE_MAP[n.slug] = n;

interface DirectLink {
  id: string;
  a: string;
  b: string;
  phrase: string;
}

const DIRECT_LINKS: DirectLink[] = [
  { id: "cycle-meals", a: "cycle", b: "meals", phrase: "You're in your luteal phase — here are meals that reduce bloating" },
  { id: "cycle-yoga", a: "cycle", b: "yoga", phrase: "Low energy day predicted — your gentle flow is ready" },
  { id: "diary-budget", a: "diary", b: "budget", phrase: "You tend to overspend when you're anxious — we noticed a pattern" },
];

const NODE_PHRASES: Record<string, string> = {
  cycle: "Your next period starts Friday — your week is already adjusted",
  notes: "Your anniversary is in 3 days — it's already in your week view",
};

const BLOB_STYLE: React.CSSProperties = {
  background:
    "radial-gradient(circle at 30% 25%, oklch(0.82 0.22 350 / 0.95), oklch(0.7 0.26 350) 45%, oklch(0.58 0.28 0) 90%)",
  boxShadow:
    "inset 4px 6px 12px oklch(1 0 0 / 0.45), inset -6px -8px 14px oklch(0.45 0.26 0 / 0.5), 0 14px 28px -10px oklch(0.62 0.27 0 / 0.55), 0 4px 10px oklch(0.62 0.27 0 / 0.3)",
};

export function ConnectionsDiagram() {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [active, setActive] = useState<string | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          io.disconnect();
        }
      },
      { threshold: 0.25 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const isDirectActive = (link: DirectLink) => active === link.a || active === link.b;
  const dimmed = active !== null;
  const handleToggle = (slug: string) => setActive((prev) => (prev === slug ? null : slug));

  const centerPhrase = active ? NODE_PHRASES[active] : null;

  return (
    <div ref={ref} className="relative mx-auto aspect-square w-full max-w-[30rem] sm:max-w-[34rem]">
      <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full" aria-hidden>
        {TOOL_NODES.map((n, i) => {
          const lineActive = active === n.slug;
          return (
            <line
              key={`spoke-${n.slug}`}
              x1={n.x}
              y1={n.y}
              x2={CENTER.x}
              y2={CENTER.y}
              pathLength={1}
              stroke={lineActive ? "oklch(0.62 0.28 350)" : "oklch(0.85 0.12 350)"}
              strokeWidth={lineActive ? 0.8 : 0.5}
              strokeLinecap="round"
              strokeDasharray={1}
              strokeDashoffset={visible ? 0 : 1}
              style={{
                transition: `stroke-dashoffset 0.7s ease ${0.9 + i * 0.06}s, stroke 0.3s ease, stroke-width 0.3s ease, opacity 0.3s ease`,
                opacity: dimmed ? (lineActive ? 1 : 0.25) : 0.8,
              }}
            />
          );
        })}
        {DIRECT_LINKS.map((link, i) => {
          const a = NODE_MAP[link.a];
          const b = NODE_MAP[link.b];
          const lineActive = isDirectActive(link);
          return (
            <line
              key={link.id}
              x1={a.x}
              y1={a.y}
              x2={b.x}
              y2={b.y}
              pathLength={1}
              stroke={lineActive ? "oklch(0.58 0.3 0)" : "oklch(0.8 0.16 350)"}
              strokeWidth={lineActive ? 1 : 0.55}
              strokeLinecap="round"
              strokeDasharray={1}
              strokeDashoffset={visible ? 0 : 1}
              style={{
                transition: `stroke-dashoffset 0.7s ease ${1.5 + i * 0.18}s, stroke 0.3s ease, stroke-width 0.3s ease, opacity 0.3s ease`,
                opacity: dimmed ? (lineActive ? 1 : 0.2) : 0.55,
              }}
            />
          );
        })}
      </svg>

      {DIRECT_LINKS.map((link) => {
        if (!isDirectActive(link)) return null;
        const a = NODE_MAP[link.a];
        const b = NODE_MAP[link.b];
        const midX = (a.x + b.x) / 2;
        const midY = (a.y + b.y) / 2;
        return (
          <div
            key={`phrase-${link.id}`}
            className="absolute z-20 w-40 -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-petal/60 bg-white/95 px-3 py-2 text-center text-[10px] font-semibold leading-snug text-[#831843] shadow-xl shadow-hotpink/30 backdrop-blur animate-fade-in pointer-events-none sm:text-[11px]"
            style={{ left: `${midX}%`, top: `${midY}%` }}
          >
            {link.phrase}
          </div>
        );
      })}

      {centerPhrase && (
        <div
          className="absolute z-20 w-44 -translate-x-1/2 -translate-y-[120%] rounded-2xl border border-petal/60 bg-white/95 px-3 py-2 text-center text-[10px] font-semibold leading-snug text-[#831843] shadow-xl shadow-hotpink/30 backdrop-blur animate-fade-in pointer-events-none sm:text-[11px]"
          style={{ left: `${CENTER.x}%`, top: `${CENTER.y}%` }}
        >
          {centerPhrase}
        </div>
      )}

      <div
        className="absolute z-10 flex flex-col items-center gap-1.5"
        style={{
          left: `${CENTER.x}%`,
          top: `${CENTER.y}%`,
          opacity: visible ? 1 : 0,
          transform: `translate(-50%, -50%) scale(${visible ? 1 : 0.5})`,
          transition: "opacity 0.6s ease, transform 0.6s cubic-bezier(0.34,1.56,0.64,1)",
        }}
      >
        <span
          className="relative grid h-16 w-16 place-items-center rounded-[1.5rem] text-white shadow-xl shadow-hotpink/40 animate-bloom-pulse sm:h-20 sm:w-20"
          style={BLOB_STYLE}
        >
          <span className="pointer-events-none absolute inset-0 -m-3 rounded-full bg-hotpink/30 blur-xl" aria-hidden />
          <CuteToolIcon slug="calendar" className="relative z-10 h-9 w-9 sm:h-11 sm:w-11" />
        </span>
        <span className="whitespace-nowrap rounded-full border border-petal/60 bg-white/90 px-2.5 py-0.5 text-[10px] font-bold text-hotpink shadow sm:text-xs">
          {CENTER.label}
        </span>
      </div>

      {TOOL_NODES.map((n, i) => (
        <button
          key={n.slug}
          type="button"
          onClick={() => handleToggle(n.slug)}
          onMouseEnter={() => setActive(n.slug)}
          onMouseLeave={() => setActive((prev) => (prev === n.slug ? null : prev))}
          className="absolute z-10 flex flex-col items-center gap-1 focus:outline-none"
          style={{
            left: `${n.x}%`,
            top: `${n.y}%`,
            opacity: visible ? 1 : 0,
            transform: `translate(-50%, -50%) translateY(${visible ? 0 : 14}px) scale(${active === n.slug ? 1.08 : 1})`,
            transition: `opacity 0.5s ease ${0.35 + i * 0.12}s, transform 0.4s cubic-bezier(0.34,1.56,0.64,1) ${visible ? `${0.35 + i * 0.12}s` : "0s"}`,
          }}
        >
          <span
            className={[
              "grid h-12 w-12 place-items-center rounded-2xl text-white shadow-lg transition-shadow sm:h-14 sm:w-14",
              active === n.slug ? "shadow-hotpink/60 ring-2 ring-white" : "shadow-hotpink/30",
            ].join(" ")}
            style={{ ...BLOB_STYLE, opacity: dimmed ? (active === n.slug ? 1 : 0.45) : 1 }}
          >
            <CuteToolIcon slug={n.slug} className="h-7 w-7 sm:h-8 sm:w-8" />
          </span>
          <span className="whitespace-nowrap rounded-full bg-white/85 px-2 py-0.5 text-[9px] font-bold text-rose shadow-sm sm:text-[10px]">
            {n.label}
          </span>
        </button>
      ))}
    </div>
  );
}
