/**
 * A soft, illustrative "hormones across your cycle" chart — estrogen and
 * progesterone rising and falling through the four phases. Purely decorative /
 * educational; hand-tuned curves, not clinical data.
 */
const L = 20, R = 300, T = 20, B = 128; // chart area (viewBox 0 0 320 168)
const px = (n: number) => L + n * (R - L);
const py = (v: number) => B - v * (B - T);

// Catmull-Rom → smooth SVG path
function smooth(points: [number, number][]): string {
  const p = points.map(([x, v]) => [px(x), py(v)] as [number, number]);
  let d = `M ${p[0][0]} ${p[0][1]}`;
  for (let i = 0; i < p.length - 1; i++) {
    const p0 = p[i - 1] ?? p[i];
    const p1 = p[i];
    const p2 = p[i + 1];
    const p3 = p[i + 2] ?? p2;
    const c1x = p1[0] + (p2[0] - p0[0]) / 6;
    const c1y = p1[1] + (p2[1] - p0[1]) / 6;
    const c2x = p2[0] - (p3[0] - p1[0]) / 6;
    const c2y = p2[1] - (p3[1] - p1[1]) / 6;
    d += ` C ${c1x} ${c1y}, ${c2x} ${c2y}, ${p2[0]} ${p2[1]}`;
  }
  return d;
}

const ESTROGEN: [number, number][] = [
  [0, 0.18], [0.15, 0.28], [0.3, 0.55], [0.42, 0.82], [0.5, 0.98],
  [0.56, 0.52], [0.68, 0.42], [0.78, 0.58], [0.9, 0.34], [1, 0.18],
];
const PROGESTERONE: [number, number][] = [
  [0, 0.1], [0.3, 0.1], [0.5, 0.14], [0.58, 0.3], [0.7, 0.72],
  [0.78, 0.86], [0.88, 0.55], [1, 0.14],
];

const PHASES = [
  { label: "Menstrual", from: 0, to: 0.15 },
  { label: "Follicular", from: 0.15, to: 0.46 },
  { label: "Ovulatory", from: 0.46, to: 0.56 },
  { label: "Luteal", from: 0.56, to: 1 },
];

export function HormoneChart() {
  const eLine = smooth(ESTROGEN);
  const pLine = smooth(PROGESTERONE);
  const area = (line: string) => `${line} L ${R} ${B} L ${L} ${B} Z`;

  return (
    <figure className="my-7 rounded-[1.6rem] border border-petal/60 bg-white/85 backdrop-blur p-4 sm:p-5 shadow-[0_14px_34px_-20px_oklch(0.6_0.22_350/0.4)]">
      <figcaption className="mb-2 flex flex-wrap items-center gap-x-4 gap-y-1">
        <span className="font-script text-xl text-hotpink leading-none">Your hormones across the month</span>
        <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-hotpink">
          <span className="h-2 w-2 rounded-full bg-hotpink" /> Estrogen
        </span>
        <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-magenta">
          <span className="h-2 w-2 rounded-full bg-magenta" /> Progesterone
        </span>
      </figcaption>

      <svg viewBox="0 0 320 168" className="w-full h-auto" role="img" aria-label="Estrogen and progesterone rising and falling across the four cycle phases">
        <defs>
          <linearGradient id="estroFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="oklch(0.62 0.24 0)" stopOpacity="0.22" />
            <stop offset="1" stopColor="oklch(0.62 0.24 0)" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="progFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="oklch(0.5 0.26 0)" stopOpacity="0.18" />
            <stop offset="1" stopColor="oklch(0.5 0.26 0)" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* alternating phase bands */}
        {PHASES.map((ph, i) => (
          <rect key={ph.label} x={px(ph.from)} y={T} width={px(ph.to) - px(ph.from)} height={B - T}
            fill={i % 2 ? "oklch(0.92 0.06 350 / 0.28)" : "oklch(0.965 0.025 350 / 0.4)"} />
        ))}
        {/* baseline */}
        <line x1={L} y1={B} x2={R} y2={B} stroke="oklch(0.92 0.06 350)" strokeWidth="1" />

        {/* areas + curves */}
        <path d={area(pLine)} fill="url(#progFill)" />
        <path d={area(eLine)} fill="url(#estroFill)" />
        <path d={pLine} fill="none" stroke="oklch(0.5 0.26 0)" strokeWidth="2.5" strokeLinecap="round" />
        <path d={eLine} fill="none" stroke="oklch(0.62 0.24 0)" strokeWidth="2.5" strokeLinecap="round" />

        {/* ovulation sparkle at the estrogen peak */}
        <text x={px(0.5)} y={py(0.98) - 6} textAnchor="middle" fontSize="12">✿</text>

        {/* phase labels */}
        {PHASES.map((ph) => (
          <text key={ph.label} x={px((ph.from + ph.to) / 2)} y={B + 26} textAnchor="middle"
            fontSize="9.5" fontWeight="700" fill="oklch(0.62 0.24 0)" letterSpacing="0.3">
            {ph.label}
          </text>
        ))}
      </svg>
      <p className="mt-1 text-center text-[11px] text-rose/60">A gentle illustration — every body's rhythm is a little different.</p>
    </figure>
  );
}

export default HormoneChart;
