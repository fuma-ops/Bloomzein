/**
 * A soft, illustrative "a month of nightly sleep check-ins" tracker — one bar
 * per day, coloured by how the night felt, revealing the quiet monthly rhythm:
 * sleep often dips in the luteal week before a period. This is what the Cycle
 * Tracker surfaces when sleep is logged beside mood and symptoms.
 * Hand-tuned for understanding, not clinical data.
 */
const L = 22, R = 330, T = 14, B = 116; // plot area (viewBox 0 0 344 150)

// 28 nightly ratings (1 restless … 5 deeply rested), one cycle's worth.
const DAYS = [
  2, 2, 3, 3,            // menstrual — tender, improving
  4, 4, 5, 4, 5, 5, 4, 5, // follicular — easy, rested
  5, 4, 4, 4,            // ovulatory — steady
  4, 3, 3, 2,            // early luteal — slipping
  2, 2, 1, 2, 2, 1, 2, 3, // late luteal — the restless week
];
const LUTEAL_FROM = 21; // day 22 (index 21) → restless week begins

// colour by quality tier
const good = "oklch(0.78 0.13 155)"; // rested — soft green
const okay = "oklch(0.83 0.13 75)";  // in-between — warm amber
const poor = "oklch(0.72 0.17 18)";  // restless — soft coral
const tier = (q: number) => (q >= 4 ? good : q === 3 ? okay : poor);

const barW = (R - L) / DAYS.length;
const py = (q: number) => B - (q / 5) * (B - T);

export function SleepQualityChart() {
  const lutealX = L + LUTEAL_FROM * barW;
  return (
    <figure className="my-7 rounded-[1.6rem] border border-petal/60 bg-white/90 backdrop-blur p-4 sm:p-5 shadow-[0_14px_34px_-20px_oklch(0.6_0.22_350/0.4)]">
      <figcaption className="mb-1 font-script text-xl text-hotpink leading-none">A month of your sleep</figcaption>
      <p className="mb-2 text-[11px] text-rose/60">One tap each morning: how did you sleep?</p>

      <svg viewBox="0 0 344 150" className="w-full h-auto" role="img" aria-label="Daily sleep quality across one cycle, dipping in the week before the period">
        {/* restless-week band */}
        <rect x={lutealX} y={T} width={R - lutealX} height={B - T} fill="oklch(0.86 0.08 312 / 0.35)" rx="4" />
        <text x={(lutealX + R) / 2} y={T + 10} textAnchor="middle" fontSize="8.5" fontWeight="700" fill="oklch(0.55 0.16 312)">restless week</text>

        {/* bars */}
        {DAYS.map((q, i) => {
          const x = L + i * barW;
          const y = py(q);
          return <rect key={i} x={x + barW * 0.16} y={y} width={barW * 0.68} height={B - y} rx={barW * 0.28} fill={tier(q)} />;
        })}

        {/* baseline */}
        <line x1={L} y1={B} x2={R} y2={B} stroke="oklch(0.85 0.06 350)" strokeWidth="1" />

        {/* period markers */}
        <text x={L} y={B + 15} textAnchor="start" fontSize="10">✿</text>
        <text x={L} y={B + 15 + 9} textAnchor="start" fontSize="7.5" fill="oklch(0.6 0.14 350 / 0.75)">period</text>
        <text x={R} y={B + 15} textAnchor="end" fontSize="10">✿</text>
      </svg>

      {/* quality key */}
      <div className="mt-3 flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5">
        {[["Rested", good], ["In-between", okay], ["Restless", poor]].map(([label, c]) => (
          <span key={label} className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-rose">
            <span className="h-3 w-3 shrink-0 rounded-[5px]" style={{ background: c }} />
            {label}
          </span>
        ))}
      </div>
      <p className="mt-2 text-center text-[11px] leading-5 text-rose/60">
        Tracked night after night, a rhythm appears: sleep often dips in the days before your period. Logged beside your mood and symptoms, the pattern becomes yours to see — and to prepare for.
      </p>
    </figure>
  );
}

export default SleepQualityChart;
