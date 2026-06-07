import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react";
import { useSmartPopoverPosition } from "@/lib/useSmartPopover";

interface Props {
  value: string; // "YYYY-MM-DD"
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
}

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const WD = ["S", "M", "T", "W", "T", "F", "S"];
const POPOVER_SIZE = { width: 260, height: 360 };

function pad(n: number) {
  return String(n).padStart(2, "0");
}
function fmt(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
function parse(s: string): Date | null {
  if (!s) return null;
  const [y, m, d] = s.split("-").map((n) => parseInt(n, 10));
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}
function prettyShort(s: string) {
  const d = parse(s);
  if (!d) return "";
  return `${d.getDate()} ${MONTHS[d.getMonth()].slice(0, 3)}`;
}

export function CuteDatePicker({ value, onChange, placeholder = "Pick a date", className = "" }: Props) {
  const [open, setOpen] = useState(false);
  const initial = parse(value) || new Date();
  const [view, setView] = useState({ y: initial.getFullYear(), m: initial.getMonth() });
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverStyle = useSmartPopoverPosition(triggerRef, open, POPOVER_SIZE);

  useEffect(() => {
    const d = parse(value);
    if (d) setView({ y: d.getFullYear(), m: d.getMonth() });
  }, [value]);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      const target = e.target as Node;
      if (rootRef.current?.contains(target)) return;
      if ((e.target as HTMLElement)?.closest?.("[data-cute-date-popover]")) return;
      setOpen(false);
    }
    if (open) document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const first = new Date(view.y, view.m, 1);
  const startWeekday = first.getDay();
  const daysInMonth = new Date(view.y, view.m + 1, 0).getDate();
  const today = new Date();
  const selected = parse(value);

  const cells: (number | null)[] = [];
  for (let i = 0; i < startWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const shift = (delta: number) => {
    let m = view.m + delta;
    let y = view.y;
    if (m < 0) { m = 11; y--; }
    if (m > 11) { m = 0; y++; }
    setView({ y, m });
  };

  return (
    <div ref={rootRef} className={`relative w-full min-w-0 ${className}`}>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full inline-flex items-center gap-2 rounded-full bg-white/90 px-3 py-2 text-sm text-rose border border-petal/60 hover:bg-blush focus:outline-none focus:ring-2 focus:ring-hotpink/30"
      >
        <CalendarIcon className="h-4 w-4 text-hotpink shrink-0" strokeWidth={1.8} />
        <span className={`truncate ${value ? "text-rose font-semibold" : "text-rose/40"}`}>
          {value ? prettyShort(value) : placeholder}
        </span>
      </button>

      {open &&
        createPortal(
          <div
            data-cute-date-popover
            style={popoverStyle}
            className="rounded-3xl bg-white/95 backdrop-blur-xl p-3 shadow-2xl shadow-hotpink/20 ring-1 ring-petal animate-scale-in max-h-[calc(100vh-2rem)] overflow-y-auto"
          >
            <div className="flex items-center justify-between mb-2">
              <button type="button" onClick={() => shift(-1)} className="grid h-7 w-7 place-items-center rounded-full bg-blush text-hotpink hover:bg-petal">
                <ChevronLeft className="h-4 w-4" />
              </button>
              <p className="font-script text-xl text-hotpink leading-none">
                {MONTHS[view.m]} {view.y}
              </p>
              <button type="button" onClick={() => shift(1)} className="grid h-7 w-7 place-items-center rounded-full bg-blush text-hotpink hover:bg-petal">
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
            <div className="grid grid-cols-7 gap-0.5 text-center text-[10px] font-bold text-rose/60 mb-1">
              {WD.map((d, i) => <div key={i}>{d}</div>)}
            </div>
            <div className="grid grid-cols-7 gap-0.5">
              {cells.map((d, i) => {
                if (d === null) return <div key={i} />;
                const isToday =
                  today.getFullYear() === view.y &&
                  today.getMonth() === view.m &&
                  today.getDate() === d;
                const isSel =
                  selected &&
                  selected.getFullYear() === view.y &&
                  selected.getMonth() === view.m &&
                  selected.getDate() === d;
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => {
                      onChange(fmt(new Date(view.y, view.m, d)));
                      setOpen(false);
                    }}
                    className={[
                      "h-8 w-full rounded-full text-xs font-semibold transition",
                      isSel
                        ? "bg-hotpink text-white shadow shadow-hotpink/40"
                        : isToday
                          ? "bg-blush text-hotpink ring-1 ring-hotpink/40"
                          : "text-rose hover:bg-blush",
                    ].join(" ")}
                  >
                    {d}
                  </button>
                );
              })}
            </div>
            <div className="mt-2 flex items-center justify-between">
              <button
                type="button"
                onClick={() => { onChange(fmt(new Date())); setOpen(false); }}
                className="text-[11px] font-bold text-hotpink hover:underline"
              >
                Today
              </button>
              {value && (
                <button
                  type="button"
                  onClick={() => { onChange(""); setOpen(false); }}
                  className="text-[11px] font-bold text-rose/60 hover:text-hotpink"
                >
                  Clear
                </button>
              )}
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
