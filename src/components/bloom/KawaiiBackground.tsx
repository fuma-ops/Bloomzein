// ─── SVG primitives ────────────────────────────────────────────────────────

/** Large 5-petal outline flower — stroke only, no fill */
function BigFlower({ size, color, sw = 2.5 }: { size: number; color: string; sw?: number }) {
  return (
    <svg viewBox="0 0 200 200" width={size} height={size} fill="none">
      {[0, 72, 144, 216, 288].map((a) => (
        <ellipse key={a} cx="100" cy="30" rx="26" ry="60"
          stroke={color} strokeWidth={sw}
          transform={`rotate(${a} 100 100)`} />
      ))}
      <circle cx="100" cy="100" r="26" stroke={color} strokeWidth={sw} />
      <circle cx="100" cy="100" r="10" stroke={color} strokeWidth={sw * 0.7} />
    </svg>
  );
}

/** Full-width rainbow arc — 5 concentric pink arcs */
function WideArc() {
  // viewBox width matches a wide desktop; the SVG stretches to 100% of its container
  return (
    <svg viewBox="0 0 1440 380" width="100%" style={{ display: "block" }} fill="none"
      preserveAspectRatio="xMidYMax meet">
      <path d="M -30,360 A 750,750 0 0 1 1470,360" stroke="oklch(0.96 0.04 350)" strokeWidth="18" strokeLinecap="round" />
      <path d="M 25,360 A 705,705 0 0 1 1415,360" stroke="oklch(0.90 0.09 350)" strokeWidth="16" strokeLinecap="round" />
      <path d="M 80,360 A 660,660 0 0 1 1360,360" stroke="oklch(0.82 0.16 350)" strokeWidth="14" strokeLinecap="round" />
      <path d="M 135,360 A 615,615 0 0 1 1305,360" stroke="oklch(0.74 0.22 350)" strokeWidth="12" strokeLinecap="round" />
      <path d="M 190,360 A 570,570 0 0 1 1250,360" stroke="oklch(0.66 0.27 350)" strokeWidth="10" strokeLinecap="round" />
    </svg>
  );
}

/** Small filled daisy */
function SmallDaisy({ size, color }: { size: number; color: string }) {
  return (
    <svg viewBox="0 0 40 40" width={size} height={size} fill="none">
      {[0, 60, 120, 180, 240, 300].map((a) => (
        <ellipse key={a} cx="20" cy="11" rx="4.5" ry="9.5"
          fill={color} transform={`rotate(${a} 20 20)`} />
      ))}
      <circle cx="20" cy="20" r="6" fill="#fff" />
      <circle cx="20" cy="20" r="3.5" fill={color} opacity="0.5" />
    </svg>
  );
}

/** Small heart */
function HeartShape({ size, color }: { size: number; color: string }) {
  return (
    <svg viewBox="0 0 20 18" width={size} height={Math.round(size * 0.9)}>
      <path d="M10 16C10 16 1 10 1 5.5A4.5 4.5 0 0 1 10 4 4.5 4.5 0 0 1 19 5.5C19 10 10 16 10 16Z" fill={color} />
    </svg>
  );
}

/** Dot */
function Dot({ size, color }: { size: number; color: string }) {
  return (
    <svg viewBox="0 0 10 10" width={size} height={size}>
      <circle cx="5" cy="5" r="4.5" fill={color} />
    </svg>
  );
}

// ─── Scatter data (small background elements) ──────────────────────────────
const SC = [
  "oklch(0.93 0.06 350)",
  "oklch(0.86 0.13 350)",
  "oklch(0.78 0.20 350)",
  "oklch(0.68 0.27 350)",
  "oklch(0.82 0.14 330)",
  "#ffffff",
];

const SCATTER = [
  // small daisies
  { k:"d", t:8,  l:22, sz:22, rot:20,  op:0.42, dur:22, del:-3,  c:SC[0] },
  { k:"d", t:19, l:70, sz:18, rot:-10, op:0.38, dur:26, del:-8,  c:SC[5] },
  { k:"d", t:30, l:45, sz:24, rot:35,  op:0.40, dur:20, del:-14, c:SC[1] },
  { k:"d", t:42, l:60, sz:20, rot:-25, op:0.42, dur:24, del:-5,  c:SC[2] },
  { k:"d", t:55, l:32, sz:26, rot:15,  op:0.38, dur:22, del:-11, c:SC[0] },
  { k:"d", t:66, l:78, sz:22, rot:-40, op:0.40, dur:28, del:-2,  c:SC[5] },
  { k:"d", t:78, l:18, sz:20, rot:30,  op:0.42, dur:21, del:-17, c:SC[1] },
  { k:"d", t:88, l:55, sz:24, rot:-12, op:0.38, dur:25, del:-9,  c:SC[3] },
  { k:"d", t:96, l:40, sz:18, rot:22,  op:0.40, dur:23, del:-6,  c:SC[0] },
  // hearts
  { k:"h", t:5,  l:40, sz:14, rot:8,   op:0.55, dur:16, del:-2,  c:SC[3] },
  { k:"h", t:14, l:58, sz:10, rot:-12, op:0.50, dur:18, del:-7,  c:SC[1] },
  { k:"h", t:25, l:28, sz:16, rot:5,   op:0.58, dur:14, del:-4,  c:SC[2] },
  { k:"h", t:37, l:74, sz:12, rot:-8,  op:0.52, dur:17, del:-12, c:SC[0] },
  { k:"h", t:48, l:50, sz:18, rot:15,  op:0.48, dur:15, del:-3,  c:SC[3] },
  { k:"h", t:60, l:22, sz:11, rot:-5,  op:0.55, dur:19, del:-9,  c:SC[4] },
  { k:"h", t:72, l:65, sz:15, rot:20,  op:0.50, dur:16, del:-6,  c:SC[1] },
  { k:"h", t:81, l:38, sz:13, rot:-18, op:0.58, dur:18, del:-14, c:SC[2] },
  { k:"h", t:92, l:80, sz:17, rot:7,   op:0.48, dur:15, del:-1,  c:SC[3] },
  { k:"h", t:10, l:72, sz:9,  rot:-22, op:0.45, dur:19, del:0,   c:SC[5] },
  // dots
  { k:"o", t:4,  l:34, sz:7, rot:0, op:0.60, dur:12, del:-3,  c:SC[2] },
  { k:"o", t:16, l:62, sz:5, rot:0, op:0.65, dur:14, del:-8,  c:SC[1] },
  { k:"o", t:28, l:48, sz:8, rot:0, op:0.58, dur:11, del:-1,  c:SC[3] },
  { k:"o", t:40, l:20, sz:6, rot:0, op:0.62, dur:13, del:-6,  c:SC[0] },
  { k:"o", t:52, l:76, sz:5, rot:0, op:0.55, dur:15, del:-4,  c:SC[4] },
  { k:"o", t:64, l:42, sz:9, rot:0, op:0.60, dur:12, del:-10, c:SC[2] },
  { k:"o", t:74, l:30, sz:6, rot:0, op:0.58, dur:14, del:-2,  c:SC[1] },
  { k:"o", t:85, l:68, sz:7, rot:0, op:0.62, dur:11, del:-7,  c:SC[3] },
  { k:"o", t:95, l:55, sz:5, rot:0, op:0.55, dur:13, del:-5,  c:SC[0] },
] as const;

// ─── Component ──────────────────────────────────────────────────────────────

interface Props { className?: string }

export function KawaiiBackground({ className = "" }: Props) {
  return (
    <div
      aria-hidden
      className={`pointer-events-none absolute inset-0 -z-10 overflow-hidden bloom-kawaii-bg ${className}`}
    >
      <style>{`
        @keyframes bz-float {
          0%,100% { transform: translateY(0)    rotate(var(--bz-r)); }
          50%      { transform: translateY(-8px) rotate(var(--bz-r)); }
        }
        @keyframes bz-pulse {
          0%,100% { transform: scale(1)    rotate(var(--bz-r)); }
          50%      { transform: scale(1.06) rotate(var(--bz-r)); }
        }
        .bz-f { animation: bz-float var(--bz-d) ease-in-out var(--bz-del) infinite; }
        .bz-p { animation: bz-pulse var(--bz-d) ease-in-out var(--bz-del) infinite; }
      `}</style>

      {/* ── BIG OUTLINE FLOWERS — left edge ─────────────────────────────── */}
      <span className="bz-f" style={{
        position:"absolute", top:"2%", left:"-13%", opacity:0.60,
        "--bz-r":"-10deg","--bz-d":"28s","--bz-del":"-5s",
      } as React.CSSProperties}>
        <BigFlower size={420} color="oklch(0.76 0.20 350)" sw={2.5} />
      </span>
      <span className="bz-f" style={{
        position:"absolute", top:"55%", left:"-10%", opacity:0.50,
        "--bz-r":"12deg","--bz-d":"32s","--bz-del":"-18s",
      } as React.CSSProperties}>
        <BigFlower size={380} color="oklch(0.72 0.23 350)" sw={2.5} />
      </span>

      {/* ── BIG OUTLINE FLOWERS — right edge ────────────────────────────── */}
      <span className="bz-f" style={{
        position:"absolute", top:"10%", left:"83%", opacity:0.55,
        "--bz-r":"18deg","--bz-d":"30s","--bz-del":"-11s",
      } as React.CSSProperties}>
        <BigFlower size={400} color="oklch(0.78 0.18 350)" sw={2.5} />
      </span>
      <span className="bz-f" style={{
        position:"absolute", top:"68%", left:"86%", opacity:0.50,
        "--bz-r":"-22deg","--bz-d":"26s","--bz-del":"-22s",
      } as React.CSSProperties}>
        <BigFlower size={360} color="oklch(0.74 0.21 350)" sw={2.5} />
      </span>

      {/* ── WIDE RAINBOW ARCS ───────────────────────────────────────────── */}
      <span className="bz-p" style={{
        position:"absolute", top:"30%", left:0, width:"100%", opacity:0.45,
        "--bz-r":"0deg","--bz-d":"38s","--bz-del":"-8s",
      } as React.CSSProperties}>
        <WideArc />
      </span>
      <span className="bz-p" style={{
        position:"absolute", top:"68%", left:0, width:"100%", opacity:0.40,
        "--bz-r":"0deg","--bz-d":"44s","--bz-del":"-24s",
      } as React.CSSProperties}>
        <WideArc />
      </span>

      {/* ── SMALL SCATTER ───────────────────────────────────────────────── */}
      {SCATTER.map((el, i) => (
        <span key={i}
          className={el.k === "o" ? "bz-p" : "bz-f"}
          style={{
            position:"absolute",
            top:`${el.t}%`, left:`${el.l}%`,
            opacity: el.op,
            "--bz-r":   `${el.rot}deg`,
            "--bz-d":   `${el.dur}s`,
            "--bz-del": `${el.del}s`,
          } as React.CSSProperties}
        >
          {el.k === "d" && <SmallDaisy  size={el.sz} color={el.c} />}
          {el.k === "h" && <HeartShape  size={el.sz} color={el.c} />}
          {el.k === "o" && <Dot         size={el.sz} color={el.c} />}
        </span>
      ))}
    </div>
  );
}
