import { useEffect, useRef, useState } from "react";
import { CuteToolIcon } from "./CuteToolIcon";

interface NodeDef {
  slug: string;
  label: string;
  x: number;
  y: number;
}

const TOOL_NODES: NodeDef[] = [
  { slug: "cycle", label: "Cycle Tracker", x: 50, y: 8 },
  { slug: "meals", label: "Meal Planner", x: 88, y: 28 },
  { slug: "yoga", label: "Yoga Flows", x: 88, y: 72 },
  { slug: "notes", label: "Reminders", x: 50, y: 92 },
  { slug: "budget", label: "Budget Planner", x: 12, y: 72 },
  { slug: "diary", label: "Dreamy Diary", x: 12, y: 28 },
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

// Builds a gentle outward-bowing arc between two points instead of a straight line —
// gives the web a hand-drawn, blooming feel rather than a technical flowchart look.
function archPath(x1: number, y1: number, x2: number, y2: number, bow: number) {
  const mx = (x1 + x2) / 2;
  const my = (y1 + y2) / 2;
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len;
  const ny = dx / len;
  const cx = mx + nx * bow;
  const cy = my + ny * bow;
  return { d: `M ${x1},${y1} Q ${cx},${cy} ${x2},${y2}`, cx, cy };
}

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

      <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full" aria-hidden>
        <defs>
          <radialGradient id="bzCenterGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="oklch(0.78 0.24 350 / 0.55)" />
            <stop offset="100%" stopColor="oklch(0.78 0.24 350 / 0)" />
          </radialGradient>
        </defs>

        {/* soft breathing aura behind the calendar */}
        <circle cx={CENTER.x} cy={CENTER.y} r={visible ? 26 : 6} fill="url(#bzCenterGlow)"
          style={{ transition: "r 1s cubic-bezier(0.34,1.56,0.64,1)", opacity: visible ? 1 : 0 }} />

        {/* slowly orbiting faint ring of dust around the whole web */}
        <g className="bz-orbit" style={{ opacity: visible ? 0.5 : 0 }}>
          {Array.from({ length: 5 }).map((_, i) => {
            const a = (i / 5) * Math.PI * 2;
            return (
              <circle key={`dust-${i}`} cx={50 + 46 * Math.cos(a)} cy={50 + 46 * Math.sin(a)} r={0.6}
                fill="oklch(0.85 0.18 350)" className="bz-twinkle" style={{ animationDelay: `${i * 0.5}s` }} />
            );
          })}
        </g>

        {/* spokes — gentle arcs from each tool to the calendar, with a traveling spark when active */}
        {TOOL_NODES.map((n, i) => {
          const lineActive = active === n.slug;
          const { d } = archPath(n.x, n.y, CENTER.x, CENTER.y, 6);
          const pathId = `spoke-path-${n.slug}`;
          return (
            <g key={`spoke-${n.slug}`}>
              <path
                id={pathId}
                d={d}
                fill="none"
                pathLength={1}
                stroke={lineActive ? "oklch(0.6 0.29 350)" : "oklch(0.85 0.12 350)"}
                strokeWidth={lineActive ? 0.9 : 0.45}
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
                  <circle r={1.4} fill="oklch(0.95 0.12 350)">
                    <animateMotion dur="1.6s" repeatCount="indefinite" rotate="auto">
                      <mpath href={`#${pathId}`} />
                    </animateMotion>
                  </circle>
                  <circle r={0.9} fill="#ffffff" opacity={0.85}>
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
          const { d } = archPath(a.x, a.y, b.x, b.y, -10);
          const pathId = `direct-path-${link.id}`;
          return (
            <g key={link.id}>
              <path
                id={pathId}
                d={d}
                fill="none"
                pathLength={1}
                stroke={lineActive ? "oklch(0.56 0.31 0)" : "oklch(0.8 0.16 350)"}
                strokeWidth={lineActive ? 1.05 : 0.5}
                strokeLinecap="round"
                strokeDasharray={1}
                strokeDashoffset={visible ? 0 : 1}
                style={{
                  transition: `stroke-dashoffset 0.9s ease ${1.6 + i * 0.2}s, stroke 0.3s ease, stroke-width 0.3s ease, opacity 0.3s ease`,
                  opacity: dimmed ? (lineActive ? 1 : 0.12) : 0.45,
                }}
              />
              {lineActive && (
                <circle r={1.2} fill="oklch(0.95 0.1 10)">
                  <animateMotion dur="1.4s" repeatCount="indefinite" rotate="auto">
                    <mpath href={`#${pathId}`} />
                  </animateMotion>
                </circle>
              )}
            </g>
          );
        })}
      </svg>

      {/* connection phrase bubbles */}
      {DIRECT_LINKS.map((link) => {
        if (!isDirectActive(link)) return null;
        const a = NODE_MAP[link.a];
        const b = NODE_MAP[link.b];
        const { cx, cy } = archPath(a.x, a.y, b.x, b.y, -10);
        return (
          <div
            key={`phrase-${link.id}`}
            className="absolute z-20 w-44 -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-petal/60 bg-white/95 px-3 py-2 text-center text-xs font-semibold leading-snug text-[#831843] shadow-xl shadow-hotpink/30 backdrop-blur animate-fade-in pointer-events-none sm:text-[13px]"
            style={{ left: `${cx}%`, top: `${cy}%` }}
          >
            {link.phrase}
          </div>
        );
      })}

      {centerPhrase && (
        <div
          className="absolute z-20 w-48 -translate-x-1/2 -translate-y-[125%] rounded-2xl border border-petal/60 bg-white/95 px-3 py-2 text-center text-xs font-semibold leading-snug text-[#831843] shadow-xl shadow-hotpink/30 backdrop-blur animate-fade-in pointer-events-none sm:text-[13px]"
          style={{ left: `${CENTER.x}%`, top: `${CENTER.y}%` }}
        >
          {centerPhrase}
        </div>
      )}

      {/* center — Bloom Calendar, pulsing like a quiet little heartbeat */}
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
        <span className="relative grid h-16 w-16 place-items-center sm:h-20 sm:w-20">
          {visible && (
            <>
              <span className="bz-ring pointer-events-none absolute inset-0 rounded-[1.5rem] border-2 border-hotpink/50" aria-hidden />
              <span className="bz-ring pointer-events-none absolute inset-0 rounded-[1.5rem] border-2 border-hotpink/50" style={{ animationDelay: "1.2s" }} aria-hidden />
              <span className="bz-ring pointer-events-none absolute inset-0 rounded-[1.5rem] border-2 border-hotpink/50" style={{ animationDelay: "2.4s" }} aria-hidden />
            </>
          )}
          <span className="relative grid h-full w-full place-items-center rounded-[1.5rem] text-white shadow-xl shadow-hotpink/40 animate-bloom-pulse" style={BLOB_STYLE}>
            <span className="pointer-events-none absolute inset-0 -m-3 rounded-full bg-hotpink/30 blur-xl" aria-hidden />
            <CuteToolIcon slug="calendar" className="relative z-10 h-9 w-9 sm:h-11 sm:w-11" />
          </span>
        </span>
        <span className="whitespace-nowrap rounded-full border border-petal/60 bg-white/90 px-3 py-1 text-xs font-bold text-hotpink shadow sm:text-sm">
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
            transition: `opacity 0.5s ease ${0.35 + i * 0.12}s, transform 0.5s cubic-bezier(0.34,1.56,0.64,1) ${visible ? `${0.35 + i * 0.12}s` : "0s"}`,
          }}
        >
          <span
            className={visible ? "bz-node-float" : ""}
            style={{ animationDelay: `${i * 0.35}s`, display: "inline-block" }}
          >
            <span
              className={[
                "relative grid h-12 w-12 place-items-center rounded-2xl text-white shadow-lg transition-all duration-300 sm:h-14 sm:w-14",
                active === n.slug ? "shadow-hotpink/60 ring-2 ring-white scale-[1.16]" : "shadow-hotpink/30 scale-100",
              ].join(" ")}
              style={{ ...BLOB_STYLE, opacity: dimmed ? (active === n.slug ? 1 : 0.4) : 1 }}
            >
              {active === n.slug && (
                <span className="bz-ring pointer-events-none absolute inset-0 rounded-2xl border-2 border-hotpink/60" aria-hidden />
              )}
              <CuteToolIcon slug={n.slug} className="relative z-10 h-7 w-7 sm:h-8 sm:w-8" />
            </span>
          </span>
          <span
            className={[
              "whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-bold shadow-sm transition-colors sm:text-xs",
              active === n.slug ? "bg-hotpink text-white" : "bg-white/85 text-rose",
            ].join(" ")}
          >
            {n.label}
          </span>
        </button>
      ))}
    </div>
  );
}
