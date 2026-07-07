/**
 * Local-date helpers — a wellness app's "today" is the user's LOCAL calendar
 * day, never UTC. Using UTC made a late-night workout (in a timezone far from
 * UTC) log under the "next" or "previous" day, so its burned calories didn't
 * match "today". Everything that stamps or compares a day should use these.
 */

/** Today as YYYY-MM-DD in the user's local timezone. */
export function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Format any Date as YYYY-MM-DD in local time. */
export function localDateISO(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** True if the given local YYYY-MM-DD string is yesterday (for streaks). */
export function isYesterday(iso: string): boolean {
  const y = new Date();
  y.setDate(y.getDate() - 1);
  return iso === localDateISO(y);
}
