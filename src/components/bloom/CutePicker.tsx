import { useEffect, useRef, useState } from "react";
import { Clock, ChevronUp, ChevronDown, Check } from "lucide-react";

interface TimePickerProps {
  value: string; // "HH:MM"
  onChange: (v: string) => void;
}

/** Cute pink time picker — replaces the native browser time input. */
export function CuteTimePicker({ value, onChange }: TimePickerProps) {
  const [open, setOpen] = useState(false);
  const [openUpward, setOpenUpward] = useState(false);
  const [h, setH] = useState<number>(() => parseInt(value.split(":")[0] ?? "21", 10));
  const [m, setM] = useState<number>(() => parseInt(value.split(":")[1] ?? "0", 10));
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const [hh, mm] = value.split(":").map((n) => parseInt(n, 10));
    if (!Number.isNaN(hh)) setH(hh);
    if (!Number.isNaN(mm)) setM(mm);
  }, [value]);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const toggleOpen = () => {
    if (!open && rootRef.current) {
      const rect = rootRef.current.getBoundingClientRect();
      const POPOVER_HEIGHT = 230;
      setOpenUpward(window.innerHeight - rect.bottom < POPOVER_HEIGHT && rect.top > POPOVER_HEIGHT);
    }
    setOpen((v) => !v);
  };

  function pad(n: number) {
    return String(n).padStart(2, "0");
  }

  function commit(nh = h, nm = m) {
    onChange(`${pad(nh)}:${pad(nm)}`);
  }

  function nudgeH(d: number) {
    const nh = (h + d + 24) % 24;
    setH(nh);
    commit(nh, m);
  }
  function nudgeM(d: number) {
    const nm = (m + d + 60) % 60;
    setM(nm);
    commit(h, nm);
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={toggleOpen}
        className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-sm font-bold text-hotpink ring-1 ring-petal shadow-sm hover:scale-105 transition"
      >
        <Clock className="h-4 w-4" />
        {pad(h)}:{pad(m)}
      </button>

      {open && (
        <div
          className={`absolute right-0 z-20 rounded-3xl bg-white/95 backdrop-blur-xl p-4 shadow-2xl shadow-hotpink/20 ring-1 ring-petal animate-scale-in ${
            openUpward ? "bottom-full mb-2" : "top-full mt-2"
          }`}
        >
          <p className="mb-2 text-center text-[10px] font-bold tracking-widest text-rose">PICK A TIME ✿</p>
          <div className="flex items-center gap-2">
            <Wheel value={h} pad={pad} onUp={() => nudgeH(1)} onDown={() => nudgeH(-1)} max={23} onSet={(n) => { setH(n); commit(n, m); }} />
            <span className="font-script text-3xl text-hotpink">:</span>
            <Wheel value={m} pad={pad} onUp={() => nudgeM(5)} onDown={() => nudgeM(-5)} max={59} onSet={(n) => { setM(n); commit(h, n); }} />
          </div>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="mt-3 inline-flex w-full items-center justify-center gap-1 rounded-full bg-hotpink px-3 py-1.5 text-xs font-bold text-white hover:bg-magenta transition"
          >
            <Check className="h-3 w-3" /> Done
          </button>
        </div>
      )}
    </div>
  );
}

function Wheel({
  value, pad, onUp, onDown, max, onSet,
}: {
  value: number;
  pad: (n: number) => string;
  onUp: () => void;
  onDown: () => void;
  max: number;
  onSet: (n: number) => void;
}) {
  return (
    <div className="flex flex-col items-center">
      <button type="button" onClick={onUp} className="grid h-7 w-12 place-items-center rounded-t-2xl bg-blush text-hotpink hover:bg-petal transition">
        <ChevronUp className="h-4 w-4" />
      </button>
      <input
        type="number"
        min={0}
        max={max}
        value={pad(value)}
        onChange={(e) => {
          const n = Math.max(0, Math.min(max, parseInt(e.target.value || "0", 10)));
          onSet(n);
        }}
        className="h-12 w-12 bg-white text-center font-script text-3xl text-hotpink ring-1 ring-petal focus:outline-none focus:ring-2 focus:ring-hotpink [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
      />
      <button type="button" onClick={onDown} className="grid h-7 w-12 place-items-center rounded-b-2xl bg-blush text-hotpink hover:bg-petal transition">
        <ChevronDown className="h-4 w-4" />
      </button>
    </div>
  );
}