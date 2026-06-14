import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, X, Flower2, Bell } from "lucide-react";
import { CuteTimePicker } from "./CutePicker";

export type TrackerMode = "protection" | "conception";
export type ContraceptiveMethod = "pill" | "patch" | "ring";

export interface CycleSettings {
  lastPeriodStart: Date;
  cycleLength: number;
  periodLength: number;
  trackerMode: TrackerMode;
  contraceptiveReminder: boolean;
  contraceptiveMethod: ContraceptiveMethod;
  reminderHour: string; // "HH:MM"
  deviceNotifications: boolean;
}

interface Props {
  open: boolean;
  onClose: () => void;
  initial: CycleSettings;
  onSave: (s: CycleSettings) => void;
}

const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];

function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export function PeriodSetup({ open, onClose, initial, onSave }: Props) {
  const [draft, setDraft] = useState<CycleSettings>(initial);
  const [cursor, setCursor] = useState(new Date(initial.lastPeriodStart.getFullYear(), initial.lastPeriodStart.getMonth(), 1));

  useEffect(() => {
    if (open) {
      setDraft(initial);
      setCursor(new Date(initial.lastPeriodStart.getFullYear(), initial.lastPeriodStart.getMonth(), 1));
    }
  }, [open, initial]);

  if (!open) return null;

  const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
  const startWeekday = first.getDay();
  const totalDays = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate();
  const prevMonthDays = new Date(cursor.getFullYear(), cursor.getMonth(), 0).getDate();

  const cells: { date: Date; outside: boolean }[] = [];
  for (let i = startWeekday - 1; i >= 0; i--) {
    cells.push({ date: new Date(cursor.getFullYear(), cursor.getMonth() - 1, prevMonthDays - i), outside: true });
  }
  for (let d = 1; d <= totalDays; d++) cells.push({ date: new Date(cursor.getFullYear(), cursor.getMonth(), d), outside: false });
  let next = 1;
  while (cells.length % 7 !== 0) cells.push({ date: new Date(cursor.getFullYear(), cursor.getMonth() + 1, next++), outside: true });

  function update<K extends keyof CycleSettings>(k: K, v: CycleSettings[K]) {
    setDraft((d) => ({ ...d, [k]: v }));
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-rose/15 backdrop-blur-[2px] p-0 sm:items-center sm:p-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full sm:max-w-sm max-h-[94vh] overflow-y-auto rounded-t-[1.5rem] sm:rounded-[1.5rem] bg-white/55 backdrop-blur-xl p-3.5 shadow-2xl shadow-hotpink/20 animate-scale-in"
      >
        <button onClick={onClose} className="absolute right-3 top-3 grid h-7 w-7 place-items-center rounded-full bg-blush/80 text-rose hover:bg-petal">
          <X className="h-3.5 w-3.5" />
        </button>

        <h3 className="text-center font-script text-xl text-hotpink">Period Setup ✿</h3>

        <div className="mt-2 rounded-xl bg-blush/50 p-2 text-center text-[11px] text-rose">
          <Flower2 className="inline h-3.5 w-3.5 text-hotpink mr-1" />
          Select your <span className="font-semibold text-hotpink">last period start</span> date:
        </div>

        {/* Calendar */}
        <div className="mt-2 rounded-xl bg-white/70 p-1.5 shadow-inner ring-1 ring-petal/60">
          <div className="flex items-center justify-between px-1">
            <button onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))} className="grid h-5 w-5 place-items-center rounded-full text-rose hover:bg-blush">
              <ChevronLeft className="h-3 w-3" />
            </button>
            <div className="font-script text-sm text-hotpink">{MONTHS[cursor.getMonth()]} {cursor.getFullYear()}</div>
            <button onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))} className="grid h-5 w-5 place-items-center rounded-full text-rose hover:bg-blush">
              <ChevronRight className="h-3 w-3" />
            </button>
          </div>
          <div className="mt-0.5 grid grid-cols-7 text-center text-[8px] font-bold text-rose">
            {WEEKDAYS.map((d) => <div key={d}>{d}</div>)}
          </div>
          <div className="mt-0.5 grid grid-cols-7 gap-0.5">
            {cells.map((c, i) => {
              const selected = sameDay(c.date, draft.lastPeriodStart);
              return (
                <button
                  key={i}
                  onClick={() => update("lastPeriodStart", c.date)}
                  className={[
                    "aspect-square rounded-full text-[10px] font-semibold transition",
                    selected ? "bg-hotpink text-white shadow-md scale-105" : c.outside ? "text-rose/40 hover:bg-blush" : "text-rose hover:bg-blush",
                  ].join(" ")}
                >
                  {c.date.getDate()}
                </button>
              );
            })}
          </div>
        </div>

        {/* Cycle length + Period length side by side */}
        <div className="mt-2 grid grid-cols-2 gap-2">
          <Section label="Cycle Length">
            <Slider min={21} max={35} value={draft.cycleLength} onChange={(v) => update("cycleLength", v)} suffix="d" />
          </Section>
          <Section label="Period Length">
            <Slider min={2} max={10} value={draft.periodLength} onChange={(v) => update("periodLength", v)} suffix="d" />
          </Section>
        </div>

        <Section label="Tracker Mode">
          <div className="grid grid-cols-2 gap-1.5 rounded-full bg-blush/70 p-1">
            {(["protection","conception"] as TrackerMode[]).map((m) => (
              <button
                key={m}
                onClick={() => update("trackerMode", m)}
                className={[
                  "rounded-full py-1.5 text-[11px] font-semibold transition",
                  draft.trackerMode === m ? "bg-hotpink text-white shadow" : "text-rose",
                ].join(" ")}
              >
                {m === "protection" ? "Protection 🛡️" : "Conception 🌷"}
              </button>
            ))}
          </div>
        </Section>

        <Section label="Contraceptive Method">
          <div className="grid grid-cols-3 gap-1.5">
            {(["pill","patch","ring"] as ContraceptiveMethod[]).map((m) => (
              <button
                key={m}
                onClick={() => update("contraceptiveMethod", m)}
                className={[
                  "rounded-xl py-1.5 text-[11px] font-semibold capitalize transition",
                  draft.contraceptiveMethod === m ? "bg-hotpink text-white shadow" : "bg-blush/70 text-rose",
                ].join(" ")}
              >
                {m}
              </button>
            ))}
          </div>
        </Section>

        <Section label="Contraceptive Reminder">
          <ToggleRow
            label="Remind to check or take contraception"
            checked={draft.contraceptiveReminder}
            onChange={(v) => update("contraceptiveReminder", v)}
          />
        </Section>

        <Section label="Reminder Hour">
          <div className="flex items-center justify-between rounded-xl bg-blush/70 px-3 py-2">
            <span className="inline-flex items-center gap-1.5 text-[11px] text-rose"><Bell className="h-3.5 w-3.5" /> Daily notify hour</span>
            <CuteTimePicker value={draft.reminderHour} onChange={(v) => update("reminderHour", v)} />
          </div>
        </Section>

        <Section label="Device Notifications">
          <ToggleRow
            label="Alert on phone, tablet, laptop"
            checked={draft.deviceNotifications}
            onChange={(v) => update("deviceNotifications", v)}
          />
        </Section>

        <button
          onClick={() => { onSave(draft); onClose(); }}
          className="bloom-luxury-btn mt-3 w-full py-2.5 text-sm font-semibold text-white"
        >
          Save Period
        </button>
      </div>
    </div>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mt-2">
      <p className="mb-1 text-[9px] font-bold tracking-widest text-rose">{label.toUpperCase()}</p>
      {children}
    </div>
  );
}

function Slider({ min, max, value, onChange, suffix }: { min: number; max: number; value: number; onChange: (v: number) => void; suffix?: string }) {
  return (
    <div className="flex items-center gap-2">
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-1.5 flex-1 cursor-pointer appearance-none rounded-full bg-blush accent-hotpink"
      />
      <span className="min-w-[40px] rounded-full bg-blush px-2 py-0.5 text-center text-[11px] font-bold text-hotpink">
        {value}{suffix}
      </span>
    </div>
  );
}

function ToggleRow({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between rounded-xl bg-blush/70 px-3 py-2">
      <span className="text-[11px] font-semibold text-rose">{label}</span>
      <button
        onClick={() => onChange(!checked)}
        className={[
          "relative h-5 w-9 shrink-0 rounded-full transition",
          checked ? "bg-hotpink" : "bg-petal",
        ].join(" ")}
      >
        <span
          className={[
            "absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all",
            checked ? "left-[18px]" : "left-0.5",
          ].join(" ")}
        />
      </button>
    </div>
  );
}
