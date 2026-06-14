import { useEffect, useRef, useState } from "react";
import { CuteToolIcon } from "./CuteToolIcon";

interface NodeDef {
  slug: string;
  label: string;
  x: number;
  y: number;
}

// Wide, horizontal layout — two rows of tools framing the Bloom Calendar in the middle,
// so the diagram reads left-to-right instead of stretching the page tall.
const TOOL_NODES: NodeDef[] = [
  { slug: "diary", label: "Dreamy Diary", x: 8, y: 9 },
  { slug: "cycle", label: "Cycle Tracker", x: 31, y: 9 },
  { slug: "meals", label: "Meal Planner", x: 69, y: 9 },
  { slug: "workout", label: "Workout", x: 92, y: 9 },
  { slug: "budget", label: "Budget Planner", x: 8, y: 41 },
  { slug: "diet", label: "Diet Tool", x: 31, y: 41 },
  { slug: "notes", label: "Reminders", x: 69, y: 41 },
  { slug: "yoga", label: "Yoga Flows", x: 92, y: 41 },
];

const CENTER: NodeDef = { slug: "calendar", label: "Bloom Calendar", x: 50, y: 25 };

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
  { id: "cycle-workout", a: "cycle", b: "workout", phrase: "High energy day ahead — your workout intensity just got a boost" },
  { id: "diet-meals", a: "diet", b: "meals", phrase: "Your diet plan and meal planner stay in sync — swaps update both" },
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

// Builds a gentle outward-bowing arc between two points instead of a straight line — gives the
// web a hand-drawn, blooming feel. Both ends are trimmed back by r1/r2 so the line stops just
// outside each icon's circle instead of running underneath it.
function archPath(x1: number, y1: number, x2: number, y2: number, bow: number, r1 = 0, r2 = 0) {
  const mx = (x1 + x2) / 2;
  const my = (y1 + y2) / 2;
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len;
  const ny = dx / len;
  const cx = mx + nx * bow;
  const cy = my + ny * bow;
  const trim = (px: number, py: number, r: number) => {
    const vx = cx - px;
    const vy = cy - py;
    const vlen = Math.hypot(vx, vy) || 1;
    return [px + (vx / vlen) * r, py + (vy / vlen) * r];
  };
  const [sx, sy] = trim(x1, y1, r1);
  const [ex, ey] = trim(x2, y2, r2);
  return { d: `M ${sx},${sy} Q ${cx},${cy} ${ex},${ey}`, cx, cy };
}

const TOOL_RADIUS = 5.5;
const CENTER_RADIUS = 8;

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

  // Only ever show a single phrase bubble — node-specific phrase wins, otherwise the first
  // direct link involving the active node. Rendered in its own reserved slot below the
  // diagram so it never overlaps or hides behind another node/bubble.
  const activePhrase = (() => {
    if (!active) return null;
    if (NODE_PHRASES[active]) return NODE_PHRASES[active];
    const link = DIRECT_LINKS.find((l) => l.a === active || l.b === active);
    return link?.phrase ?? null;
  })();

  return (
    <div ref={ref} className="mx-auto w-full max-w-3xl">
      <style>{`
        @keyframes bz-float-node {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-5%); }
        }
        @keyframes bz-pulse-ring {
          0% { transform: scale(0.85); opacity: 0.55; }
          70% { transform: scale(1.5); opacity: 0; }
          100% { transform: scale(1.5); opacity: 0; }
        }
        @keyframes bz-twinkle {
          0%, 100% { opacity: 0.25; transform: scale(0.7); }
          50% { opacity: 0.9; transform: scale(1.15); }
        }
        @keyframes bz-spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .bz-node-float { animation: bz-float-node 5.5s ease-in-out infinite; }
        .bz-ring { animation: bz-pulse-ring 3.6s ease-out infinite; }
        .bz-twinkle { animation: bz-twinkle 2.6s ease-in-out infinite; }
        .bz-orbit { animation: bz-spin-slow 26s linear infinite; transform-origin: 50% 50%; }
      `}</style>

      <div className="relative aspect-[2/1] w-full">
        <svg viewBox="0 0 100 50" preserveAspectRatio="xMidYMid meet" className="absolute inset-0 h-full w-full" aria-hidden>
          <defs>
            <radialGradient id="bzCenterGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="oklch(0.78 0.24 350 / 0.55)" />
              <stop offset="100%" stopColor="oklch(0.78 0.24 350 / 0)" />
            </radialGradient>
          </defs>

          {/* soft breathing aura behind the calendar */}
          <circle cx={CENTER.x} cy={CENTER.y} r={visible ? 16 : 4} fill="url(#bzCenterGlow)"
            style={{ transition: "r 1s cubic-bezier(0.34,1.56,0.64,1)", opacity: visible ? 1 : 0 }} />

          {/* slowly orbiting faint ring of dust around the whole web */}
          <g className="bz-orbit" style={{ opacity: visible ? 0.5 : 0, transformOrigin: `${CENTER.x}px ${CENTER.y}px` }}>
            {Array.from({ length: 5 }).map((_, i) => {
              const a = (i / 5) * Math.PI * 2;
              return (
                <circle key={`dust-${i}`} cx={CENTER.x + 23 * Math.cos(a)} cy={CENTER.y + 23 * Math.sin(a) * 0.5} r={0.45}
                  fill="oklch(0.85 0.18 350)" className="bz-twinkle" style={{ animationDelay: `${i * 0.5}s` }} />
              );
            })}
          </g>

          {/* spokes — gentle arcs from each tool to the calendar, stopping outside each icon, with a traveling spark when active */}
          {TOOL_NODES.map((n, i) => {
            const lineActive = active === n.slug;
            const { d } = archPath(n.x, n.y, CENTER.x, CENTER.y, n.y < CENTER.y ? -4 : 4, TOOL_RADIUS, CENTER_RADIUS);
            const pathId = `spoke-path-${n.slug}`;
            return (
              <g key={`spoke-${n.slug}`}>
                <path
                  id={pathId}
                  d={d}
                  fill="none"
                  pathLength={1}
                  stroke={lineActive ? "oklch(0.6 0.29 350)" : "oklch(0.85 0.12 350)"}
                  strokeWidth={lineActive ? 0.7 : 0.35}
                  strokeLinecap="round"
                  strokeDasharray={1}
                  strokeDashoffset={visible ? 0 : 1}
                  style={{
                    transition: `stroke-dashoffset 0.9s ease ${0.9 + i * 0.08}s, stroke 0.3s ease, stroke-width 0.3s ease, opacity 0.3s ease`,
                    opacity: dimmed ? (lineActive ? 1 : 0.18) : 0.7,
                  }}
                />
                {lineActive && (
                  <>
                    <circle r={1.1} fill="oklch(0.95 0.12 350)">
                      <animateMotion dur="1.6s" repeatCount="indefinite" rotate="auto">
                        <mpath href={`#${pathId}`} />
                      </animateMotion>
                    </circle>
                    <circle r={0.7} fill="#ffffff" opacity={0.85}>
                      <animateMotion dur="1.6s" begin="0.5s" repeatCount="indefinite" rotate="auto">
                        <mpath href={`#${pathId}`} />
                      </animateMotion>
                    </circle>
                  </>
                )}
              </g>
            );
          })}

          {/* direct tool-to-tool links — bow outward so they read as their own little bridges */}
          {DIRECT_LINKS.map((link, i) => {
            const a = NODE_MAP[link.a];
            const b = NODE_MAP[link.b];
            const lineActive = isDirectActive(link);
            const { d } = archPath(a.x, a.y, b.x, b.y, -7, TOOL_RADIUS, TOOL_RADIUS);
            const pathId = `direct-path-${link.id}`;
            return (
              <g key={link.id}>
                <path
                  id={pathId}
                  d={d}
                  fill="none"
                  pathLength={1}
                  stroke={lineActive ? "oklch(0.56 0.31 0)" : "oklch(0.8 0.16 350)"}
                  strokeWidth={lineActive ? 0.85 : 0.4}
                  strokeLinecap="round"
                  strokeDasharray={1}
                  strokeDashoffset={visible ? 0 : 1}
                  style={{
                    transition: `stroke-dashoffset 0.9s ease ${1.6 + i * 0.2}s, stroke 0.3s ease, stroke-width 0.3s ease, opacity 0.3s ease`,
                    opacity: dimmed ? (lineActive ? 1 : 0.12) : 0.45,
                  }}
                />
                {lineActive && (
                  <circle r={1} fill="oklch(0.95 0.1 10)">
                    <animateMotion dur="1.4s" repeatCount="indefinite" rotate="auto">
                      <mpath href={`#${pathId}`} />
                    </animateMotion>
                  </circle>
                )}
              </g>
            );
          })}
        </svg>

        {/* center — Bloom Calendar, pulsing like a quiet little heartbeat */}
        <div
          className="absolute z-10 flex flex-col items-center gap-1"
          style={{
            left: `${CENTER.x}%`,
            top: `${CENTER.y}%`,
            opacity: visible ? 1 : 0,
            transform: `translate(-50%, -50%) scale(${visible ? 1 : 0.5})`,
            transition: "opacity 0.6s ease, transform 0.6s cubic-bezier(0.34,1.56,0.64,1)",
          }}
        >
          <span className="relative grid h-14 w-14 place-items-center sm:h-20 sm:w-20">
            {visible && (
              <>
                <span className="bz-ring pointer-events-none absolute inset-0 rounded-[1.5rem] border-2 border-hotpink/50" aria-hidden />
                <span className="bz-ring pointer-events-none absolute inset-0 rounded-[1.5rem] border-2 border-hotpink/50" style={{ animationDelay: "1.2s" }} aria-hidden />
                <span className="bz-ring pointer-events-none absolute inset-0 rounded-[1.5rem] border-2 border-hotpink/50" style={{ animationDelay: "2.4s" }} aria-hidden />
              </>
            )}
            <span className="relative grid h-full w-full place-items-center rounded-[1.5rem] text-white shadow-xl shadow-hotpink/40 animate-bloom-pulse" style={BLOB_STYLE}>
              <span className="pointer-events-none absolute inset-0 -m-3 rounded-full bg-hotpink/30 blur-xl" aria-hidden />
              <CuteToolIcon slug="calendar" className="relative z-10 h-8 w-8 sm:h-11 sm:w-11" />
            </span>
          </span>
          <span className="whitespace-nowrap rounded-full border border-petal/60 bg-white/90 px-2 py-0.5 text-[10px] font-bold text-hotpink shadow sm:px-3 sm:py-1 sm:text-sm">
            {CENTER.label}
          </span>
        </div>

        {/* tool nodes — softly bobbing, blooming brighter when active */}
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
              transform: `translate(-50%, -50%) translateY(${visible ? 0 : 14}px)`,
              transition: `opacity 0.5s ease ${0.35 + i * 0.1}s, transform 0.5s cubic-bezier(0.34,1.56,0.64,1) ${visible ? `${0.35 + i * 0.1}s` : "0s"}`,
            }}
          >
            <span
              className={visible ? "bz-node-float" : ""}
              style={{ animationDelay: `${i * 0.3}s`, display: "inline-block" }}
            >
              <span
                className={[
                  "relative grid h-9 w-9 place-items-center rounded-2xl text-white shadow-lg transition-all duration-300 sm:h-14 sm:w-14",
                  active === n.slug ? "shadow-hotpink/60 ring-2 ring-white scale-[1.16]" : "shadow-hotpink/30 scale-100",
                ].join(" ")}
                style={{ ...BLOB_STYLE, opacity: dimmed ? (active === n.slug ? 1 : 0.4) : 1 }}
              >
                {active === n.slug && (
                  <span className="bz-ring pointer-events-none absolute inset-0 rounded-2xl border-2 border-hotpink/60" aria-hidden />
                )}
                <CuteToolIcon slug={n.slug} className="relative z-10 h-5 w-5 sm:h-8 sm:w-8" />
              </span>
            </span>
            <span
              className={[
                "max-w-[4.5rem] whitespace-nowrap rounded-full px-1.5 py-0.5 text-[8px] font-bold leading-tight shadow-sm transition-colors sm:max-w-none sm:text-xs sm:px-2 sm:py-0.5",
                active === n.slug ? "bg-hotpink text-white" : "bg-white/85 text-rose",
              ].join(" ")}
            >
              {n.label}
            </span>
          </button>
        ))}
      </div>

      {/* single reserved slot for the connection phrase — never overlaps a node, even on small screens */}
      <div className="mt-3 flex min-h-[3.25rem] items-center justify-center px-2 sm:mt-4 sm:min-h-[3.5rem]">
        {activePhrase && (
          <div className="w-full max-w-md rounded-2xl border border-petal/60 bg-white/95 px-3 py-2 text-center text-xs font-semibold leading-snug text-[#831843] shadow-xl shadow-hotpink/30 backdrop-blur animate-fade-in sm:text-[13px]">
            {activePhrase}
          </div>
        )}
      </div>
    </div>
  );
}
