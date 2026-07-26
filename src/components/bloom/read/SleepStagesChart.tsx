/**
 * A soft, illustrative "one night of sleep" hypnogram — the way a healthy night
 * moves through Awake · REM · Light · Deep in repeating ~90-minute cycles, with
 * deep sleep front-loaded early and dreaming (REM) growing toward morning.
 * Hand-tuned for understanding, not clinical data.
 */
const L = 52, R = 328, T = 16, B = 120; // plot area (viewBox 0 0 340 148)
const px = (t: number) => L + t * (R - L);

// Stage lanes, top (Awake) to bottom (Deep). Each gets its own soft hue + key.
const STAGES = [
  { key: "Awake", level: 3, line: "oklch(0.74 0.15 30)",  band: "oklch(0.90 0.07 30 / 0.45)" },
  { key: "REM",   level: 2, line: "oklch(0.62 0.18 300)", band: "oklch(0.88 0.08 300 / 0.5)" },
  { key: "Light", level: 1, line: "oklch(0.72 0.13 344)", band: "oklch(0.90 0.07 344 / 0.5)" },
  { key: "Deep",  level: 0, line: "oklch(0.50 0.13 268)", band: "oklch(0.84 0.08 268 / 0.55)" },
];
const laneH = (B - T) / STAGES.length;
const yc = (level: number) => B - (level + 0.5) * laneH;

// [timeFraction, level] through the night — 4 cycles, deep early, REM late.
const NIGHT: [number, number][] = [
  [0, 3], [0.02, 1], [0.06, 0], [0.15, 1], [0.18, 2], [0.2, 1],
  [0.25, 0], [0.33, 1], [0.37, 2], [0.4, 1], [0.45, 0], [0.5, 1],
  [0.54, 2], [0.58, 1], [0.63, 0], [0.67, 1], [0.7, 2], [0.74, 1],
  [0.77, 3], [0.79, 1], [0.83, 2], [0.9, 1], [0.93, 2], [0.97, 3], [1, 3],
];

function stepPath(pts: [number, number][]): string {
  let d = `M ${px(pts[0][0])} ${yc(pts[0][1])}`;
  for (let i = 1; i < pts.length; i++) {
    d += ` H ${px(pts[i][0])} V ${yc(pts[i][1])}`;
  }
  return d;
}

const INK = "oklch(0.55 0.22 350)"; // hotpink line

export function SleepStagesChart() {
  return (
    <figure className="my-7 rounded-[1.6rem] border border-petal/60 bg-white/90 backdrop-blur p-4 sm:p-5 shadow-[0_14px_34px_-20px_oklch(0.6_0.22_350/0.4)]">
      <figcaption className="mb-2 font-script text-xl text-hotpink leading-none">One night, four cycles</figcaption>

      <svg viewBox="0 0 340 148" className="w-full h-auto" role="img" aria-label="A night of sleep moving through awake, REM, light and deep stages in repeating cycles">
        {/* stage lanes + labels */}
        {STAGES.map((s) => (
          <g key={s.key}>
            <rect x={L} y={B - (s.level + 1) * laneH} width={R - L} height={laneH} fill={s.band} />
            <text x={L - 6} y={yc(s.level) + 3.5} textAnchor="end" fontSize="9.5" fontWeight="700" fill={s.line}>{s.key}</text>
          </g>
        ))}
        {/* lane dividers */}
        {STAGES.slice(1).map((s) => (
          <line key={"d" + s.key} x1={L} y1={B - (s.level + 1) * laneH} x2={R} y2={B - (s.level + 1) * laneH} stroke="white" strokeWidth="1" strokeOpacity="0.75" />
        ))}

        {/* the night */}
        <path d={stepPath(NIGHT)} fill="none" stroke={INK} strokeWidth="2.25" strokeLinejoin="round" strokeLinecap="round" />

        {/* bedtime → morning axis */}
        <text x={L} y={B + 16} textAnchor="start" fontSize="9" fill="oklch(0.6 0.14 350 / 0.7)">Asleep</text>
        <text x={R} y={B + 16} textAnchor="end" fontSize="9" fill="oklch(0.6 0.14 350 / 0.7)">Morning ✿</text>
      </svg>

      <p className="mt-3 text-center text-[11px] leading-5 text-rose/60">
        A full night is 4–5 cycles of about 90 minutes. Deep, repairing sleep loads early; dreaming (REM) grows toward morning. Wake mid-cycle and you feel groggy — wake at the top of one and you feel clear.
      </p>
    </figure>
  );
}

export default SleepStagesChart;
