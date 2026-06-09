// Bloomzein palette at pastel strength — used as element fill colors
const C = [
  "oklch(0.93 0.06 350)", // petal — near-white light pink
  "oklch(0.86 0.13 350)", // soft pink
  "oklch(0.78 0.20 350)", // mid pink
  "oklch(0.68 0.27 350)", // hotpink
  "oklch(0.82 0.14 330)", // mauve
  "#ffffff",
];

// Static hand-laid element table — no Math.random() = no layout shift
// k: d=daisy  h=heart  o=dot  r=rainbow
// t=top%  l=left%  sz=size(px)  rot=deg  op=opacity  dur=s  del=s(neg for offset)
const ELS = [
  // ─── DAISIES ──────────────────────────────────────────────────────────────
  { k:"d", t:2,  l:1,  sz:40, rot:12,  op:0.22, dur:22, del:-3,  c:C[0] },
  { k:"d", t:5,  l:91, sz:30, rot:-8,  op:0.19, dur:26, del:-8,  c:C[2] },
  { k:"d", t:13, l:49, sz:22, rot:25,  op:0.15, dur:20, del:-14, c:C[5] },
  { k:"d", t:21, l:5,  sz:44, rot:-15, op:0.20, dur:24, del:-5,  c:C[1] },
  { k:"d", t:27, l:87, sz:32, rot:40,  op:0.18, dur:21, del:-11, c:C[0] },
  { k:"d", t:35, l:28, sz:26, rot:-30, op:0.17, dur:28, del:-2,  c:C[3] },
  { k:"d", t:43, l:75, sz:38, rot:18,  op:0.22, dur:20, del:-17, c:C[5] },
  { k:"d", t:51, l:3,  sz:28, rot:-5,  op:0.19, dur:25, del:-9,  c:C[1] },
  { k:"d", t:59, l:93, sz:34, rot:55,  op:0.16, dur:23, del:-6,  c:C[2] },
  { k:"d", t:67, l:54, sz:24, rot:-20, op:0.20, dur:27, del:-13, c:C[0] },
  { k:"d", t:75, l:10, sz:46, rot:30,  op:0.18, dur:22, del:-4,  c:C[4] },
  { k:"d", t:83, l:81, sz:30, rot:-45, op:0.21, dur:24, del:-10, c:C[1] },
  { k:"d", t:90, l:39, sz:36, rot:10,  op:0.17, dur:20, del:-7,  c:C[5] },
  { k:"d", t:97, l:65, sz:28, rot:-22, op:0.19, dur:23, del:-15, c:C[0] },

  // ─── HEARTS ───────────────────────────────────────────────────────────────
  { k:"h", t:2,  l:22, sz:14, rot:8,   op:0.28, dur:16, del:-2,  c:C[3] },
  { k:"h", t:7,  l:68, sz:10, rot:-12, op:0.25, dur:18, del:-7,  c:C[1] },
  { k:"h", t:16, l:37, sz:17, rot:5,   op:0.30, dur:14, del:-4,  c:C[2] },
  { k:"h", t:24, l:79, sz:12, rot:-8,  op:0.26, dur:17, del:-12, c:C[0] },
  { k:"h", t:32, l:17, sz:18, rot:15,  op:0.23, dur:15, del:-3,  c:C[3] },
  { k:"h", t:39, l:60, sz:11, rot:-5,  op:0.28, dur:19, del:-9,  c:C[4] },
  { k:"h", t:47, l:90, sz:15, rot:20,  op:0.25, dur:16, del:-6,  c:C[1] },
  { k:"h", t:54, l:34, sz:13, rot:-18, op:0.30, dur:18, del:-14, c:C[2] },
  { k:"h", t:62, l:72, sz:17, rot:7,   op:0.24, dur:15, del:-1,  c:C[3] },
  { k:"h", t:69, l:21, sz:10, rot:-10, op:0.27, dur:17, del:-11, c:C[0] },
  { k:"h", t:77, l:50, sz:16, rot:25,  op:0.23, dur:20, del:-8,  c:C[1] },
  { k:"h", t:85, l:7,  sz:13, rot:-3,  op:0.29, dur:14, del:-5,  c:C[3] },
  { k:"h", t:93, l:76, sz:15, rot:12,  op:0.26, dur:16, del:-13, c:C[2] },
  { k:"h", t:10, l:84, sz:9,  rot:-22, op:0.21, dur:19, del:0,   c:C[5] },
  { k:"h", t:45, l:15, sz:12, rot:18,  op:0.24, dur:17, del:-16, c:C[4] },

  // ─── DOTS ─────────────────────────────────────────────────────────────────
  { k:"o", t:4,  l:56, sz:7,  rot:0, op:0.32, dur:12, del:-3,  c:C[2] },
  { k:"o", t:9,  l:14, sz:5,  rot:0, op:0.36, dur:14, del:-8,  c:C[1] },
  { k:"o", t:18, l:71, sz:8,  rot:0, op:0.30, dur:11, del:-1,  c:C[3] },
  { k:"o", t:26, l:42, sz:6,  rot:0, op:0.34, dur:13, del:-6,  c:C[0] },
  { k:"o", t:33, l:95, sz:5,  rot:0, op:0.27, dur:15, del:-4,  c:C[4] },
  { k:"o", t:41, l:23, sz:9,  rot:0, op:0.31, dur:12, del:-10, c:C[2] },
  { k:"o", t:48, l:63, sz:6,  rot:0, op:0.29, dur:14, del:-2,  c:C[1] },
  { k:"o", t:56, l:7,  sz:7,  rot:0, op:0.35, dur:11, del:-7,  c:C[3] },
  { k:"o", t:63, l:47, sz:5,  rot:0, op:0.28, dur:13, del:-5,  c:C[0] },
  { k:"o", t:70, l:84, sz:8,  rot:0, op:0.33, dur:12, del:-9,  c:C[2] },
  { k:"o", t:78, l:30, sz:6,  rot:0, op:0.30, dur:15, del:-3,  c:C[4] },
  { k:"o", t:86, l:61, sz:7,  rot:0, op:0.36, dur:11, del:-11, c:C[1] },
  { k:"o", t:94, l:19, sz:5,  rot:0, op:0.29, dur:14, del:0,   c:C[3] },
  { k:"o", t:15, l:32, sz:9,  rot:0, op:0.32, dur:12, del:-6,  c:C[0] },
  { k:"o", t:30, l:57, sz:6,  rot:0, op:0.30, dur:13, del:-4,  c:C[2] },
  { k:"o", t:73, l:44, sz:8,  rot:0, op:0.33, dur:11, del:-8,  c:C[1] },

  // ─── RAINBOWS (peek in from corners / edges) ──────────────────────────────
  { k:"r", t:-1, l:-3,  sz:140, rot:0,   op:0.13, dur:32, del:-5,  c:"" },
  { k:"r", t:-2, l:71,  sz:120, rot:0,   op:0.12, dur:36, del:-12, c:"" },
  { k:"r", t:83, l:-4,  sz:130, rot:180, op:0.13, dur:30, del:-8,  c:"" },
  { k:"r", t:76, l:75,  sz:110, rot:180, op:0.11, dur:34, del:-20, c:"" },
] as const;

function Daisy({ size, color }: { size: number; color: string }) {
  return (
    <svg viewBox="0 0 40 40" width={size} height={size} fill="none">
      {([0, 60, 120, 180, 240, 300] as const).map((a) => (
        <ellipse key={a} cx="20" cy="11" rx="4.5" ry="9.5"
          fill={color} transform={`rotate(${a} 20 20)`} />
      ))}
      <circle cx="20" cy="20" r="6" fill="#fff" />
      <circle cx="20" cy="20" r="3.5" fill={color} opacity="0.5" />
    </svg>
  );
}

function HeartShape({ size, color }: { size: number; color: string }) {
  return (
    <svg viewBox="0 0 20 18" width={size} height={Math.round(size * 0.9)}>
      <path d="M10 16C10 16 1 10 1 5.5A4.5 4.5 0 0 1 10 4 4.5 4.5 0 0 1 19 5.5C19 10 10 16 10 16Z" fill={color} />
    </svg>
  );
}

function Dot({ size, color }: { size: number; color: string }) {
  return (
    <svg viewBox="0 0 10 10" width={size} height={size}>
      <circle cx="5" cy="5" r="4.5" fill={color} />
    </svg>
  );
}

function Rainbow({ size, flipped }: { size: number; flipped: boolean }) {
  return (
    <svg viewBox="0 0 130 75" width={size} height={Math.round(size * 0.58)} fill="none"
      style={{ transform: flipped ? "scaleY(-1)" : undefined }}>
      <path d="M 5,70 A 60,60 0 0 1 125,70" stroke="oklch(0.96 0.04 350)" strokeWidth="10" strokeLinecap="round" />
      <path d="M 14,70 A 51,51 0 0 1 116,70" stroke="oklch(0.89 0.10 350)" strokeWidth="9"  strokeLinecap="round" />
      <path d="M 23,70 A 42,42 0 0 1 107,70" stroke="oklch(0.81 0.17 350)" strokeWidth="8"  strokeLinecap="round" />
      <path d="M 32,70 A 33,33 0 0 1 98,70"  stroke="oklch(0.73 0.23 350)" strokeWidth="7"  strokeLinecap="round" />
      <path d="M 41,70 A 24,24 0 0 1 89,70"  stroke="oklch(0.65 0.28 350)" strokeWidth="6"  strokeLinecap="round" />
    </svg>
  );
}

interface Props {
  className?: string;
}

export function KawaiiBackground({ className = "" }: Props) {
  return (
    <div
      aria-hidden
      className={`pointer-events-none absolute inset-0 -z-10 overflow-hidden bloom-kawaii-bg ${className}`}
    >
      <style>{`
        @keyframes bz-sticker-float {
          0%, 100% { transform: translateY(0)    rotate(var(--bz-r)); }
          50%       { transform: translateY(-7px) rotate(var(--bz-r)); }
        }
        @keyframes bz-sticker-pulse {
          0%, 100% { transform: scale(1)    rotate(var(--bz-r)); }
          50%       { transform: scale(1.07) rotate(var(--bz-r)); }
        }
        .bz-float { animation: bz-sticker-float var(--bz-d) ease-in-out var(--bz-del) infinite; }
        .bz-pulse { animation: bz-sticker-pulse var(--bz-d) ease-in-out var(--bz-del) infinite; }
      `}</style>

      {ELS.map((el, i) => (
        <span
          key={i}
          className={el.k === "o" || el.k === "r" ? "bz-pulse" : "bz-float"}
          style={{
            position: "absolute",
            top: `${el.t}%`,
            left: `${el.l}%`,
            opacity: el.op,
            "--bz-r":   `${el.rot}deg`,
            "--bz-d":   `${el.dur}s`,
            "--bz-del": `${el.del}s`,
          } as React.CSSProperties}
        >
          {el.k === "d" && <Daisy      size={el.sz} color={el.c} />}
          {el.k === "h" && <HeartShape size={el.sz} color={el.c} />}
          {el.k === "o" && <Dot        size={el.sz} color={el.c} />}
          {el.k === "r" && <Rainbow    size={el.sz} flipped={el.rot === 180} />}
        </span>
      ))}
    </div>
  );
}
