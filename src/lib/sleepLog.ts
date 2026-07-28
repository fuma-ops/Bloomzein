/**
 * Sleep log — the ONE source of truth for "how did she sleep last night".
 * Mirrors the mood / symptom / period logs: a single store keyed by LOCAL ISO
 * date (the morning she wakes), so the Today card, the Me · history charts, the
 * report and the seed all read/write through here and can never disagree.
 *
 * Each night stores a quality rating (1..5, the quick daily tap) and an OPTIONAL
 * number of hours. Quality is what the charts plot (bounded, like mood); hours
 * is the clinically useful extra shown in readouts and the doctor report.
 */
import { todayISO } from "@/lib/localDate";

export const SLEEP_LOG_KEY = "bloom:sleep-log-v2";
export const SLEEP_EVENT = "bloom:sleep-updated";

export interface SleepEntry {
  q: number; // quality 1..5
  h?: number; // hours slept (optional)
}

/** The five quick quality taps (1..5), from roughest to best. */
export const SLEEP_OPTIONS: { q: number; label: string; emoji: string }[] = [
  { q: 1, label: "Rough", emoji: "😴" },
  { q: 2, label: "Poor", emoji: "🥱" },
  { q: 3, label: "OK", emoji: "😐" },
  { q: 4, label: "Good", emoji: "🙂" },
  { q: 5, label: "Great", emoji: "✨" },
];

export const sleepQualityLabel = (q: number): string =>
  SLEEP_OPTIONS.find((o) => o.q === q)?.label ?? "—";

const fire = () => {
  try {
    window.dispatchEvent(new Event(SLEEP_EVENT));
    window.dispatchEvent(new Event("storage"));
  } catch {
    /* ignore */
  }
};

export function readSleepLog(): Record<string, SleepEntry> {
  try {
    const raw = JSON.parse(localStorage.getItem(SLEEP_LOG_KEY) || "{}");
    return raw && typeof raw === "object" ? (raw as Record<string, SleepEntry>) : {};
  } catch {
    return {};
  }
}

/** The entry for one LOCAL date (defaults to today), or null if unlogged. */
export function readSleepForDay(iso: string = todayISO()): SleepEntry | null {
  const e = readSleepLog()[iso];
  return e && typeof e.q === "number" ? e : null;
}

function write(log: Record<string, SleepEntry>): void {
  try {
    localStorage.setItem(SLEEP_LOG_KEY, JSON.stringify(log));
  } catch {
    /* ignore */
  }
  fire();
}

/** Set (or clear, by re-tapping the same value) the quality for a date. */
export function setSleepQuality(iso: string, q: number): void {
  const log = readSleepLog();
  const cur = log[iso];
  if (cur?.q === q && cur.h == null) {
    delete log[iso]; // re-tapping the same rating with no hours clears the night
  } else {
    log[iso] = { ...cur, q };
  }
  write(log);
}

/** Set (or clear with null) the hours for a date; keeps the quality if present. */
export function setSleepHours(iso: string, hours: number | null): void {
  const log = readSleepLog();
  const cur = log[iso];
  if (hours == null) {
    if (cur) {
      const { h: _h, ...rest } = cur;
      void _h;
      log[iso] = rest as SleepEntry;
    }
  } else {
    log[iso] = { q: cur?.q ?? 3, h: Math.max(0, Math.round(hours * 2) / 2) };
  }
  write(log);
}
