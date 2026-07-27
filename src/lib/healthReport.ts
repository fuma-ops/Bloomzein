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

  const weeklyRows = h.movement.weekly
    .map(
      (w) =>
        `<tr><td>${esc(w.label)}</td><td>${w.sessions}</td><td>${w.kcal.toLocaleString()}</td></tr>`,
    )
    .join("");

  const symptomRows = h.symptoms.byLabel.length
    ? h.symptoms.byLabel
        .map(
          (s) =>
            `<tr><td>${esc(s.label)}</td><td>${s.count} day${s.count === 1 ? "" : "s"}</td></tr>`,
        )
        .join("")
    : `<tr><td colspan="2" class="muted">None logged</td></tr>`;

  const moodRows = h.mood.byMood.length
    ? h.mood.byMood
        .map(
          (m) =>
            `<tr><td>${esc(titleCase(m.label))}</td><td>${m.count} day${m.count === 1 ? "" : "s"}</td></tr>`,
        )
        .join("")
    : `<tr><td colspan="2" class="muted">None logged</td></tr>`;

  const wRecent = h.weight.series.slice(-12);
  const weightRows = wRecent.length
    ? wRecent.map((w) => `<tr><td>${esc(prettyDate(w.date))}</td><td>${w.kg} kg</td></tr>`).join("")
    : `<tr><td colspan="2" class="muted">None logged</td></tr>`;

  const changeStr =
    h.weight.changeKg == null ? "—" : `${h.weight.changeKg > 0 ? "+" : ""}${h.weight.changeKg} kg`;

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
  footer { margin-top: 30px; border-top: 1px solid var(--line); padding-top: 12px; font-size: 11.5px; color: var(--muted); }
  @media (max-width: 620px) { .tiles { grid-template-columns: repeat(2, 1fr); } .two { grid-template-columns: 1fr; } }
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

    <section>
      <h2>Movement &amp; calories burned</h2>
      <div class="two">
        <table>
          ${row("Workout sessions", String(h.movement.workouts))}
          ${row("Yoga flows", String(h.movement.yoga))}
          ${row("Active days", String(h.movement.activeDays))}
          ${row("Calories burned (total)", `${h.movement.totalKcal.toLocaleString()} kcal`)}
          ${row("— from workouts", `${h.movement.workoutKcal.toLocaleString()} kcal`)}
          ${row("— from yoga", `${h.movement.yogaKcal.toLocaleString()} kcal`)}
        </table>
        <table class="data">
          <thead><tr><th>Week of</th><th>Sessions</th><th>kcal</th></tr></thead>
          <tbody>${weeklyRows}</tbody>
        </table>
      </div>
    </section>

    <section>
      <div class="two">
        <div>
          <h2>Symptoms logged</h2>
          <table class="data"><thead><tr><th>Symptom</th><th>Frequency</th></tr></thead><tbody>${symptomRows}</tbody></table>
          <p class="muted" style="font-size:12px;margin-top:8px">${h.symptoms.total} entries across ${h.symptoms.days} day${h.symptoms.days === 1 ? "" : "s"}.</p>
        </div>
        <div>
          <h2>Mood logged</h2>
          <table class="data"><thead><tr><th>Mood</th><th>Frequency</th></tr></thead><tbody>${moodRows}</tbody></table>
          <p class="muted" style="font-size:12px;margin-top:8px">${h.mood.days} day${h.mood.days === 1 ? "" : "s"} logged${h.mood.avgScore != null ? ` · average positivity ${h.mood.avgScore} / 5` : ""}.</p>
        </div>
      </div>
    </section>

    <section>
      <h2>Weight</h2>
      <div class="two">
        <table>
          ${row("Goal", titleCase(h.weight.goal))}
          ${row("Starting weight", h.weight.startKg != null ? `${h.weight.startKg} kg` : "—")}
          ${row("Current weight", h.weight.currentKg != null ? `${h.weight.currentKg} kg` : "—")}
          ${row("Change", changeStr)}
          ${row("Target", h.weight.targetKg != null ? `${h.weight.targetKg} kg` : "—")}
        </table>
        <table class="data"><thead><tr><th>Date</th><th>Weight</th></tr></thead><tbody>${weightRows}</tbody></table>
      </div>
    </section>

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
  const html = buildReportHTML(h, userName);
  triggerDownload(
    new Blob([html], { type: "text/html;charset=utf-8" }),
    `bloomzein-wellness-summary-${stamp()}.html`,
  );
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

  h.movement.weekly.forEach((w) =>
    push("burn_week", w.weekStartISO, w.kcal, `${w.sessions} sessions`),
  );
  push("movement_summary", "workouts", h.movement.workouts);
  push("movement_summary", "yoga_flows", h.movement.yoga);
  push("movement_summary", "total_kcal", h.movement.totalKcal);

  h.symptoms.byLabel.forEach((s) => push("symptom", s.label, s.count, "days logged"));
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
