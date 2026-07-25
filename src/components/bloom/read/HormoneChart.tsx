/**
 * A soft, illustrative "hormones across your cycle" chart — estrogen and
 * progesterone rising and falling through the four phases, each phase shown as
 * its own gently-coloured band with a matching key. Hand-tuned curves for
 * understanding, not clinical data.
 */
const L = 20, R = 300, T = 22, B = 126; // chart area (viewBox 0 0 320 152)
const px = (n: number) => L + n * (R - L);
const py = (v: number) => B - v * (B - T);

function smooth(points: [number, number][]): string {
  const p = points.map(([x, v]) => [px(x), py(v)] as [number, number]);
  let d = `M ${p[0][0]} ${p[0][1]}`;
  for (let i = 0; i < p.length - 1; i++) {
    const p0 = p[i - 1] ?? p[i], p1 = p[i], p2 = p[i + 1], p3 = p[i + 2] ?? p2;
    const c1x = p1[0] + (p2[0] - p0[0]) / 6, c1y = p1[1] + (p2[1] - p0[1]) / 6;
    const c2x = p2[0] - (p3[0] - p1[0]) / 6, c2y = p2[1] - (p3[1] - p1[1]) / 6;
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

// Phase bands, each with its own soft colour (matched to the app's phase hues).
const PHASES = [
  { label: "Menstrual", from: 0, to: 0.15, band: "oklch(0.85 0.10 356 / 0.55)", dot: "oklch(0.66 0.20 356)" },
  { label: "Follicular", from: 0.15, to: 0.46, band: "oklch(0.90 0.08 344 / 0.5)", dot: "oklch(0.70 0.17 344)" },
  { label: "Ovulatory", from: 0.46, to: 0.56, band: "oklch(0.88 0.09 40 / 0.6)", dot: "oklch(0.74 0.14 45)" },
  { label: "Luteal", from: 0.56, to: 1, band: "oklch(0.86 0.08 312 / 0.5)", dot: "oklch(0.62 0.16 312)" },
];

const ESTRO = "oklch(0.62 0.24 0)";      // hotpink
const PROG = "oklch(0.52 0.20 300)";      // violet — clearly distinct from estrogen

export function HormoneChart() {
  const eLine = smooth(ESTROGEN);
  const pLine = smooth(PROGESTERONE);
  const area = (line: string) => `${line} L ${R} ${B} L ${L} ${B} Z`;

  return (
    <figure className="my-7 rounded-[1.6rem] border border-petal/60 bg-white/90 backdrop-blur p-4 sm:p-5 shadow-[0_14px_34px_-20px_oklch(0.6_0.22_350/0.4)]">
      <figcaption className="mb-1 font-script text-xl text-hotpink leading-none">Your hormones across the month</figcaption>

      {/* which line is which */}
      <div className="mb-2 flex flex-wrap items-center gap-x-4 gap-y-1">
        <span className="inline-flex items-center gap-1.5 text-[11px] font-bold" style={{ color: ESTRO }}>
          <span className="h-2.5 w-4 rounded-full" style={{ background: ESTRO }} /> Estrogen
        </span>
        <span className="inline-flex items-center gap-1.5 text-[11px] font-bold" style={{ color: PROG }}>
          <span className="h-2.5 w-4 rounded-full" style={{ background: PROG }} /> Progesterone
        </span>
      </div>

      <svg viewBox="0 0 320 152" className="w-full h-auto" role="img" aria-label="Estrogen and progesterone rising and falling across the four cycle phases">
        <defs>
          <linearGradient id="estroFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={ESTRO} stopOpacity="0.20" />
            <stop offset="1" stopColor={ESTRO} stopOpacity="0" />
          </linearGradient>
          <linearGradient id="progFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={PROG} stopOpacity="0.16" />
            <stop offset="1" stopColor={PROG} stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* coloured phase bands + dividers */}
        {PHASES.map((ph) => (
          <rect key={ph.label} x={px(ph.from)} y={T} width={px(ph.to) - px(ph.from)} height={B - T} fill={ph.band} />
        ))}
        {PHASES.slice(1).map((ph) => (
          <line key={"d" + ph.label} x1={px(ph.from)} y1={T} x2={px(ph.from)} y2={B} stroke="white" strokeWidth="1.25" strokeOpacity="0.8" />
        ))}
        <line x1={L} y1={B} x2={R} y2={B} stroke="oklch(0.85 0.06 350)" strokeWidth="1" />

        {/* areas + curves */}
        <path d={area(pLine)} fill="url(#progFill)" />
        <path d={area(eLine)} fill="url(#estroFill)" />
        <path d={pLine} fill="none" stroke={PROG} strokeWidth="2.75" strokeLinecap="round" />
        <path d={eLine} fill="none" stroke={ESTRO} strokeWidth="2.75" strokeLinecap="round" />

        {/* ovulation marker */}
        <text x={px(0.5)} y={py(0.98) - 5} textAnchor="middle" fontSize="12">✿</text>
      </svg>

      {/* phase key */}
      <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1.5 sm:grid-cols-4">
        {PHASES.map((ph) => (
          <span key={ph.label} className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-rose">
            <span className="h-3 w-3 shrink-0 rounded-[5px]" style={{ background: ph.band, boxShadow: `inset 0 0 0 1.5px ${ph.dot}` }} />
            {ph.label}
          </span>
        ))}
      </div>
      <p className="mt-2 text-center text-[11px] text-rose/60">Estrogen peaks around ovulation; progesterone rises after it, through the luteal week.</p>
    </figure>
  );
}

export default HormoneChart;
