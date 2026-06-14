import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

function toISO(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

const WEEKDAYS = ["M", "T", "W", "T", "F", "S", "S"];

/** Compact calendar grid date picker, styled to match the app's pearl/petal palette instead of the native browser picker. */
export function DatePicker({ value, onChange, max }: { value: string | null; onChange: (iso: string) => void; max: string }) {
  const selected = value ? new Date(value + "T00:00:00") : null;
  const maxDate = new Date(max + "T00:00:00");
  const [viewDate, setViewDate] = useState(() => selected ?? maxDate);

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const startOffset = (firstDay.getDay() + 6) % 7; // Monday = 0
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [...Array(startOffset).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];

  const monthLabel = viewDate.toLocaleDateString("en", { month: "long", year: "numeric" });
  const nextMonth = new Date(year, month + 1, 1);

  const isFuture = (day: number) => new Date(year, month, day) > maxDate;
  const isSelected = (day: number) =>
    !!selected && selected.getFullYear() === year && selected.getMonth() === month && selected.getDate() === day;

  return (
    <div className="mt-2 rounded-2xl border border-petal bg-white/80 p-3">
      <div className="flex items-center justify-between px-1">
        <button
          type="button"
          onClick={() => setViewDate(new Date(year, month - 1, 1))}
          aria-label="Previous month"
          className="grid h-8 w-8 place-items-center rounded-full text-hotpink transition hover:bg-blush"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className="text-sm font-medium text-rose">{monthLabel}</span>
        <button
          type="button"
          onClick={() => setViewDate(nextMonth)}
          disabled={nextMonth > maxDate}
          aria-label="Next month"
          className="grid h-8 w-8 place-items-center rounded-full text-hotpink transition hover:bg-blush disabled:opacity-25"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
      <div className="mt-2 grid grid-cols-7 gap-1 text-center text-[11px] font-medium text-rose/50">
        {WEEKDAYS.map((d, i) => (
          <span key={i}>{d}</span>
        ))}
      </div>
      <div className="mt-1 grid grid-cols-7 gap-1">
        {cells.map((day, i) =>
          day === null ? (
            <span key={i} />
          ) : (
            <button
              key={i}
              type="button"
              disabled={isFuture(day)}
              onClick={() => onChange(toISO(new Date(year, month, day)))}
              className={`grid h-8 w-8 place-items-center rounded-full text-sm transition ${
                isSelected(day) ? "bg-hotpink font-semibold text-white" : "text-rose hover:bg-blush"
              } disabled:pointer-events-none disabled:opacity-25`}
            >
              {day}
            </button>
          )
        )}
      </div>
    </div>
  );
}
