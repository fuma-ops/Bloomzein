/**
 * Health report — turns the composed HealthHistory into two shareable artifacts:
 *   • a self-contained, print-optimised HTML report (open → "Save as PDF"), and
 *   • a CSV of the underlying real events.
 *
 * Both are generated client-side from data she already logged — nothing leaves
 * the device unless she chooses to share the file. The report is framed as a
 * personal wellness summary, NOT a medical record or diagnosis.
 */
import { prettyDate, titleCase, type HealthHistory } from "@/lib/healthHistory";

/* ---------- small utils ---------- */

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

const stamp = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const REGULARITY_TEXT: Record<HealthHistory["cycle"]["regularity"], string> = {
  regular: "Regular — recent cycle lengths vary by 3 days or less.",
  irregular: "Irregular — recent cycle lengths vary by more than 3 days.",
  learning: "Still learning — log at least two period starts to assess regularity.",
};

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const shortDay = (iso: string) => {
  const d = new Date(iso + "T00:00:00");
  return `${d.getDate()} ${MONTHS[d.getMonth()]}`;
};

/* ---------- static SVG chart builders (mirror the in-app interactive charts) ---------- */

interface Pt {
  label: string;
  value: number;
  faded?: boolean;
}

function svgBars(pts: Pt[], hex: string): string {
  if (!pts.length) return `<div class="empty">No data logged</div>`;
  const W = 360,
    H = 132,
    padX = 6,
    padT = 14,
    padB = 20;
  const max = Math.max(1, ...pts.map((p) => p.value));
  const n = pts.length;
  const bw = (W - padX * 2) / n;
  const gap = n > 40 ? 0.6 : 2;
  const bars = pts
    .map((p, i) => {
      const bh = Math.max(p.value > 0 ? 3 : 1, (p.value / max) * (H - padT - padB));
      const x = padX + i * bw + gap / 2;
      const y = H - padB - bh;
      return `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${Math.max(0.5, bw - gap).toFixed(1)}" height="${bh.toFixed(1)}" rx="2" fill="${hex}"${p.faded ? ' opacity="0.4"' : ""}/>`;
    })
    .join("");
  const last =
    n > 1
      ? `<text x="${W - padX}" y="${H - 5}" text-anchor="end" class="axl">${esc(pts[n - 1].label)}</text>`
      : "";
  return `<svg viewBox="0 0 ${W} ${H}" class="chart" role="img">${bars}<text x="${padX}" y="${H - 5}" class="axl">${esc(pts[0].label)}</text>${last}</svg>`;
}

function svgLine(pts: Pt[], hex: string, yMin?: number, yMax?: number): string {
  if (pts.length < 2) return `<div class="empty">Not enough points</div>`;
  const W = 360,
    H = 132,
    pad = 12,
    padB = 20;
  const vals = pts.map((p) => p.value);
  const lo = yMin ?? Math.min(...vals);
  const hi = yMax ?? Math.max(...vals);
  const span = hi - lo || 1;
  const x = (i: number) => pad + (i / (pts.length - 1)) * (W - pad * 2);
  const y = (v: number) => pad + (1 - (v - lo) / span) * (H - pad - padB);
  const d = pts
    .map((p, i) => `${i ? "L" : "M"} ${x(i).toFixed(1)} ${y(p.value).toFixed(1)}`)
    .join(" ");
  const dots = pts
    .map(
      (p, i) =>
        `<circle cx="${x(i).toFixed(1)}" cy="${y(p.value).toFixed(1)}" r="2.4" fill="${hex}"/>`,
    )
    .join("");
  return `<svg viewBox="0 0 ${W} ${H}" class="chart" role="img"><path d="${d}" fill="none" stroke="${hex}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>${dots}<text x="${pad}" y="${H - 5}" class="axl">${esc(pts[0].label)}</text><text x="${W - pad}" y="${H - 5}" text-anchor="end" class="axl">${esc(pts[pts.length - 1].label)}</text></svg>`;
}

/** A chart + its interpretation + a full detail table (the tap-only data, on paper). */
function chartBlock(
  title: string,
  svg: string,
  interpretation: string,
  tableHead: string,
  tableRows: string,
): string {
  return `<section>
      <h2>${esc(title)}</h2>
      <div class="chartgrid">
        <div class="chartcol">${svg}<p class="interp">${esc(interpretation)}</p></div>
        <div class="tablecol"><table class="data"><thead>${tableHead}</thead><tbody>${tableRows || `<tr><td class="muted">None logged</td></tr>`}</tbody></table></div>
      </div>
    </section>`;
}

/* ---------- HTML report ---------- */

export function buildReportHTML(h: HealthHistory, userName: string): string {
  const range = h.trackingSince
    ? `${prettyDate(h.trackingSince)} → ${prettyDate(stamp())}  ·  ${h.daysTracked} day${h.daysTracked === 1 ? "" : "s"}`
    : "No data logged yet";

  const row = (label: string, value: string) =>
    `<tr><th>${esc(label)}</th><td>${esc(value)}</td></tr>`;

  const cycleStarts = h.cycle.starts.length
    ? h.cycle.starts.map((s) => prettyDate(s)).join(", ")
    : "—";

  // ── chart points + full detail tables (the tap-only data, on paper) ──
  // One calm rose for bars, one muted berry for lines — matches the in-app charts.
  const C1 = "#e07aab",
    C2 = "#c85d95",
    C3 = "#e07aab",
    C4 = "#e07aab";

  const cyclePts = h.cycle.cycles.map((c) => ({
    label: c.monthLabel,
    value: c.lengthDays,
    faded: c.ongoing,
  }));
  const cycleRows = h.cycle.cycles
    .map(
      (c) =>
        `<tr><td>${esc(prettyDate(c.startISO))}</td><td>${esc(prettyDate(c.endISO))}</td><td>${c.lengthDays}d${c.ongoing ? " *" : ""}</td></tr>`,
    )
    .join("");

  const weightPts = h.weight.series.map((w) => ({ label: shortDay(w.date), value: w.kg }));
  const weightRows = h.weight.series
    .map((w) => `<tr><td>${esc(prettyDate(w.date))}</td><td>${w.kg} kg</td></tr>`)
    .join("");

  const woPts = h.movement.workoutDaily.map((d) => ({ label: shortDay(d.date), value: d.kcal }));
  const woRows = h.movement.workoutDaily
    .map(
      (d) =>
        `<tr><td>${esc(prettyDate(d.date))}</td><td>${d.kcal} kcal</td><td>${d.sessions}</td></tr>`,
    )
    .join("");
  const ygPts = h.movement.yogaDaily.map((d) => ({ label: shortDay(d.date), value: d.kcal }));
  const ygRows = h.movement.yogaDaily
    .map(
      (d) =>
        `<tr><td>${esc(prettyDate(d.date))}</td><td>${d.kcal} kcal</td><td>${d.sessions}</td></tr>`,
    )
    .join("");

  const moodPts = h.mood.series.map((m) => ({ label: shortDay(m.date), value: m.score }));
  const moodRows = h.mood.series
    .map(
      (m) =>
        `<tr><td>${esc(prettyDate(m.date))}</td><td>${esc(titleCase(m.mood))}</td><td>${m.score}/5</td></tr>`,
    )
    .join("");

  const byPhaseRows = h.byPhase
    .map(
      (p) =>
        `<tr><td>${esc(p.label)}</td><td>${p.moodAvg != null ? `${p.moodAvg}/5` : "—"}</td><td>${p.burnKcal ? p.burnKcal.toLocaleString() + " kcal" : "—"}</td><td>${p.sessions || "—"}</td><td>${p.symptomDays || "—"}</td></tr>`,
    )
    .join("");

  const sxPts = h.symptoms.daily.map((s) => ({ label: shortDay(s.date), value: s.labels.length }));
  const sxRows = h.symptoms.daily
    .map((s) => `<tr><td>${esc(prettyDate(s.date))}</td><td>${esc(s.labels.join(", "))}</td></tr>`)
    .join("");

  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Bloomzein — Wellness Summary</title>
<style>
  :root { --pink:#db2777; --ink:#3f1230; --muted:#9b6b83; --line:#f3d6e6; --wash:#fff5fa; }
  * { box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; color: var(--ink); margin: 0; background: #fff; line-height: 1.5; }
  .wrap { max-width: 820px; margin: 0 auto; padding: 32px 28px 60px; }
  .bar { position: sticky; top: 0; display: flex; gap: 10px; justify-content: flex-end; padding: 12px 0; background: #fff; }
  button { font: inherit; font-weight: 700; border: 0; border-radius: 999px; padding: 10px 18px; cursor: pointer; }
  .print { background: var(--pink); color: #fff; }
  .print:hover { filter: brightness(1.05); }
  header.rep { border-bottom: 2px solid var(--line); padding-bottom: 16px; margin-bottom: 22px; }
  .brand { font-size: 13px; font-weight: 800; letter-spacing: .12em; text-transform: uppercase; color: var(--pink); }
  h1 { font-size: 26px; margin: 6px 0 4px; }
  .sub { color: var(--muted); font-size: 13.5px; }
  .disc { background: var(--wash); border: 1px solid var(--line); border-radius: 12px; padding: 12px 14px; font-size: 12.5px; color: var(--muted); margin: 18px 0 26px; }
  section { margin: 0 0 26px; break-inside: avoid; }
  h2 { font-size: 16px; color: var(--pink); border-bottom: 1px solid var(--line); padding-bottom: 6px; margin: 0 0 12px; }
  .tiles { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; }
  .tile { border: 1px solid var(--line); border-radius: 12px; padding: 12px 14px; }
  .tile .n { font-size: 22px; font-weight: 800; color: var(--pink); }
  .tile .l { font-size: 11.5px; color: var(--muted); text-transform: uppercase; letter-spacing: .04em; }
  table { width: 100%; border-collapse: collapse; font-size: 13.5px; }
  th, td { text-align: left; padding: 7px 10px; border-bottom: 1px solid var(--line); vertical-align: top; }
  th { color: var(--muted); font-weight: 600; width: 42%; }
  table.data th { color: var(--ink); font-weight: 700; width: auto; }
  .verdict { display: inline-block; font-weight: 800; padding: 4px 12px; border-radius: 999px; font-size: 13px; }
  .reg { background: #dcfce7; color: #166534; }
  .irr { background: #fef3c7; color: #92400e; }
  .lea { background: var(--wash); color: var(--muted); }
  .muted { color: var(--muted); }
  .two { display: grid; grid-template-columns: 1fr 1fr; gap: 22px; }
  .chartgrid { display: grid; grid-template-columns: 1.15fr 1fr; gap: 20px; align-items: start; }
  .chart { width: 100%; height: auto; border: 1px solid var(--line); border-radius: 10px; background: var(--wash); }
  .axl { font-size: 8px; fill: var(--muted); font-weight: 600; }
  .interp { font-size: 12px; color: var(--ink); font-style: italic; margin: 8px 2px 0; }
  .tablecol table { font-size: 12px; }
  .empty { padding: 22px; text-align: center; color: var(--muted); border: 1px dashed var(--line); border-radius: 10px; font-size: 12px; }
  .note { font-size: 12px; color: var(--muted); margin: 0 0 22px; }
  footer { margin-top: 30px; border-top: 1px solid var(--line); padding-top: 12px; font-size: 11.5px; color: var(--muted); }
  @media (max-width: 620px) { .tiles { grid-template-columns: repeat(2, 1fr); } .two, .chartgrid { grid-template-columns: 1fr; } }
  @media print { .bar { display: none; } .wrap { padding: 0; max-width: none; } body { font-size: 12px; } }
</style></head>
<body>
  <div class="wrap">
    <div class="bar"><button class="print" onclick="window.print()">Print / Save as PDF</button></div>

    <header class="rep">
      <div class="brand">Bloomzein · Personal Wellness Summary</div>
      <h1>${esc(userName || "My")} wellness summary</h1>
      <div class="sub">Tracking period: ${esc(range)}</div>
      <div class="sub">Generated ${esc(prettyDate(stamp()))}</div>
    </header>

    <div class="disc"><strong>Please note:</strong> This is a personal wellness summary generated from data ${esc(userName || "the user")} logged in the Bloomzein app. It reflects self-recorded activity, symptoms and measurements — it is not a medical record, diagnosis, or clinical advice.</div>

    <p class="note">Each chart below is interactive in the app — tapping a point reveals that day's details. In this printed copy those details are listed in full in the table beside every chart, so nothing is hidden.</p>

    <section>
      <h2>At a glance</h2>
      <div class="tiles">
        <div class="tile"><div class="n">${h.cycle.cyclesMeasured}</div><div class="l">Cycles measured</div></div>
        <div class="tile"><div class="n">${h.movement.totalSessions}</div><div class="l">Sessions done</div></div>
        <div class="tile"><div class="n">${h.movement.totalKcal.toLocaleString()}</div><div class="l">Calories burned</div></div>
        <div class="tile"><div class="n">${h.weight.currentKg != null ? h.weight.currentKg + " kg" : "—"}</div><div class="l">Current weight</div></div>
      </div>
    </section>

    <section>
      <h2>Cycle rhythm</h2>
      <p><span class="verdict ${h.cycle.regularity === "regular" ? "reg" : h.cycle.regularity === "irregular" ? "irr" : "lea"}">${esc(h.cycle.regularity.toUpperCase())}</span></p>
      <p class="muted" style="font-size:13px;margin-top:8px">${esc(REGULARITY_TEXT[h.cycle.regularity])}</p>
      <table>
        ${row("Confirmed period starts", String(h.cycle.count))}
        ${row("Cycles measured", String(h.cycle.cyclesMeasured))}
        ${row("Average cycle length", h.cycle.avgLength != null ? `${h.cycle.avgLength} days` : "—")}
        ${row("Recent cycle lengths", h.cycle.recentLengths.length ? h.cycle.recentLengths.map((d) => `${d}d`).join(", ") : "—")}
        ${row("Most recent start", prettyDate(h.cycle.lastStart))}
        ${row("All confirmed starts", cycleStarts)}
      </table>
    </section>

    ${chartBlock(
      "Cycle by cycle",
      svgBars(cyclePts, C1),
      h.patterns.cycle,
      "<tr><th>Start</th><th>End</th><th>Length</th></tr>",
      cycleRows,
    )}

    <section>
      <h2>Your cycle × your body</h2>
      <p class="interp" style="margin:0 0 10px">${esc(h.patterns.combined)}</p>
      <table class="data">
        <thead><tr><th>Phase</th><th>Avg mood</th><th>Burn</th><th>Sessions</th><th>Symptom days</th></tr></thead>
        <tbody>${byPhaseRows || `<tr><td class="muted">Not enough logged yet</td></tr>`}</tbody>
      </table>
    </section>

    <section>
      <h2>Movement summary</h2>
      <table>
        ${row("Workout sessions", String(h.movement.workouts))}
        ${row("Yoga flows", String(h.movement.yoga))}
        ${row("Active days", String(h.movement.activeDays))}
        ${row("Calories burned (total)", `${h.movement.totalKcal.toLocaleString()} kcal`)}
        ${row("— from workouts", `${h.movement.workoutKcal.toLocaleString()} kcal`)}
        ${row("— from yoga", `${h.movement.yogaKcal.toLocaleString()} kcal`)}
      </table>
    </section>

    ${chartBlock(
      "Workout burn (per day)",
      svgBars(woPts, C1),
      h.patterns.workout,
      "<tr><th>Date</th><th>Burned</th><th>Sessions</th></tr>",
      woRows,
    )}

    ${chartBlock(
      "Yoga burn (per day)",
      svgBars(ygPts, C3),
      h.patterns.yoga,
      "<tr><th>Date</th><th>Burned</th><th>Flows</th></tr>",
      ygRows,
    )}

    ${chartBlock(
      "Weight (per weigh-in)",
      svgLine(weightPts, C2),
      h.patterns.weight,
      "<tr><th>Date</th><th>Weight</th></tr>",
      weightRows,
    )}

    ${chartBlock(
      "Mood over time",
      svgLine(moodPts, C2, 1, 5),
      h.patterns.mood,
      "<tr><th>Date</th><th>Mood</th><th>Score</th></tr>",
      moodRows,
    )}

    ${chartBlock(
      "Symptoms (per day)",
      svgBars(sxPts, C4),
      h.patterns.symptoms,
      "<tr><th>Date</th><th>Symptoms logged</th></tr>",
      sxRows,
    )}

    <section>
      <h2>Nourishment</h2>
      <table>
        ${row("Days meals logged", String(h.nourish.daysLogged))}
        ${row("Total meals logged", String(h.nourish.mealsLogged))}
        ${row("Days with a full 3 meals", String(h.nourish.daysFullLogged))}
      </table>
    </section>

    <footer>Generated by Bloomzein from self-logged data. Not a medical device. For any health concern, please consult a qualified professional.</footer>
  </div>
</body></html>`;
}

/** Download the printable HTML report (open it → "Save as PDF" to share). */
export function downloadHealthReport(h: HealthHistory, userName: string): void {
  let html = "";
  try {
    html = buildReportHTML(h, userName);
  } catch {
    // Never fail silently on the primary CTA — a minimal fallback still opens.
    html = `<!doctype html><meta charset="utf-8"><title>Bloomzein — Wellness Summary</title><body style="font-family:sans-serif;padding:24px;color:#831843">Your wellness summary couldn't be built from the current data. Please try again after logging a little more.</body>`;
  }
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const filename = `bloomzein-wellness-summary-${stamp()}.html`;
  // Primary: open the self-contained report in a new tab so she can read it and
  // "Save as PDF" — this works where a forced file download is blocked (installed
  // PWA, iOS Safari). Fall back to a real download if the tab is blocked.
  try {
    const url = URL.createObjectURL(blob);
    const win = window.open(url, "_blank");
    if (!win) {
      URL.revokeObjectURL(url);
      triggerDownload(blob, filename);
    } else {
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    }
  } catch {
    triggerDownload(blob, filename);
  }
}

/* ---------- CSV export (raw real events, long format) ---------- */

export function buildReportCSV(h: HealthHistory): string {
  const rows: string[][] = [["category", "date_or_key", "value", "detail"]];
  const push = (c: string, k: string, v: string | number, d = "") =>
    rows.push([c, k, String(v), d]);

  h.cycle.starts.forEach((s, i) => push("cycle_start", s, i + 1, "confirmed period start"));
  h.cycle.recentLengths.forEach((d, i) =>
    push("cycle_length", `#${i + 1}`, d, "days between starts"),
  );
  push("cycle_summary", "regularity", h.cycle.regularity);
  if (h.cycle.avgLength != null) push("cycle_summary", "avg_length_days", h.cycle.avgLength);

  h.cycle.cycles.forEach((c) =>
    push(
      "cycle",
      c.startISO,
      c.lengthDays,
      `${c.startISO}→${c.endISO}${c.ongoing ? " (ongoing)" : ""}`,
    ),
  );
  h.movement.workoutDaily.forEach((d) =>
    push("workout_burn", d.date, d.kcal, `${d.sessions} sessions`),
  );
  h.movement.yogaDaily.forEach((d) => push("yoga_burn", d.date, d.kcal, `${d.sessions} flows`));
  push("movement_summary", "workouts", h.movement.workouts);
  push("movement_summary", "yoga_flows", h.movement.yoga);
  push("movement_summary", "total_kcal", h.movement.totalKcal);

  h.symptoms.daily.forEach((s) =>
    push("symptom_day", s.date, s.labels.length, s.labels.join("; ")),
  );
  h.mood.series.forEach((m) => push("mood", m.date, m.mood, `score ${m.score}`));
  h.weight.series.forEach((w) => push("weight", w.date, w.kg, "kg"));

  push("nourish", "days_logged", h.nourish.daysLogged);
  push("nourish", "meals_logged", h.nourish.mealsLogged);

  return rows
    .map((r) =>
      r.map((cell) => (/[",\n]/.test(cell) ? `"${cell.replace(/"/g, '""')}"` : cell)).join(","),
    )
    .join("\n");
}

/** Download the raw real-events CSV (for a spreadsheet or a clinician's records). */
export function downloadHealthCSV(h: HealthHistory): void {
  triggerDownload(
    new Blob([buildReportCSV(h)], { type: "text/csv;charset=utf-8" }),
    `bloomzein-health-data-${stamp()}.csv`,
  );
}
