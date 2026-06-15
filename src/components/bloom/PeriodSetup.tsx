import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, X, Flower2, Bell, Sparkles, ChevronDown, Droplet } from "lucide-react";
import { CuteTimePicker } from "./CutePicker";
import { phaseForDay } from "./cyclePhase";

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
const TODAY = new Date(2026, 5, 14); // demo "today", matches CycleTracker

function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export function PeriodSetup({ open, onClose, initial, onSave }: Props) {
  const [draft, setDraft] = useState<CycleSettings>(initial);
  const [cursor, setCursor] = useState(new Date(initial.lastPeriodStart.getFullYear(), initial.lastPeriodStart.getMonth(), 1));
  const [showScrollHint, setShowScrollHint] = useState(true);
  // Tracks which settings the user has touched this session, so each one
  // glows ("set me up") until configured, then calms down — guiding the user.
  const [touched, setTouched] = useState<Set<string>>(new Set());
  const scrollRef = useRef<HTMLDivElement>(null);
  const saveRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (open) {
      setDraft(initial);
      setCursor(new Date(initial.lastPeriodStart.getFullYear(), initial.lastPeriodStart.getMonth(), 1));
      setShowScrollHint(true);
      setTouched(new Set());
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
    setTouched((t) => {
      if (t.has(k as string)) return t;
      const n = new Set(t);
      n.add(k as string);
      return n;
    });
  }

  const isSet = (k: keyof CycleSettings) => touched.has(k as string);

  // After picking the reminder hour, glide down to the Save button so it's
  // right there to tap — no hunting for it.
  function scrollToSave() {
    requestAnimationFrame(() => {
      saveRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
    });
  }

  function handleScroll() {
    const el = scrollRef.current;
    if (!el) return;
    setShowScrollHint(el.scrollTop + el.clientHeight < el.scrollHeight - 12);
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-rose/15 p-3 backdrop-blur-[2px] animate-fade-in sm:p-4"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative flex w-full max-w-[22rem] flex-col overflow-hidden rounded-[1.75rem] bg-white/95 shadow-2xl shadow-hotpink/20 backdrop-blur-xl animate-scale-in sm:max-w-md"
        style={{ maxHeight: "min(90dvh, 760px)" }}
      >
        <button onClick={onClose} className="absolute right-3 top-3 z-10 grid h-7 w-7 place-items-center rounded-full bg-blush/80 text-rose hover:bg-petal">
          <X className="h-3.5 w-3.5" />
        </button>

        <div ref={scrollRef} onScroll={handleScroll} className="no-scrollbar scroll-smooth overflow-y-auto overscroll-contain p-3.5 sm:p-5">
          <h3 className="animate-fade-in text-center font-script text-xl text-hotpink">Period Setup ✿</h3>

          <div className={`animate-scale-in mt-2 rounded-xl bg-blush/50 p-2 text-center text-[11px] text-rose ${!isSet("lastPeriodStart") ? "animate-selected-glow" : ""}`} style={{ animationDelay: "40ms" }}>
            <Flower2 className="mr-1 inline h-3.5 w-3.5 animate-bloom-sparkle text-hotpink" />
            Tap your <span className="font-semibold text-hotpink">last period start</span> date:
          </div>

          {/* Bouncing pointer guiding the eye down to the calendar — only until a date is chosen */}
          {!isSet("lastPeriodStart") && (
            <div className="flex justify-center">
              <ChevronDown className="h-4 w-4 animate-bounce text-hotpink/70" />
            </div>
          )}

          {/* Calendar — simplified: only period range, ovulation day & today */}
          <div className={`animate-scale-in mt-2 rounded-xl bg-white/90 p-1.5 shadow-inner ring-1 ring-petal/60 ${!isSet("lastPeriodStart") ? "animate-hint-glow" : ""}`} style={{ animationDelay: "80ms" }}>
            <div className="flex items-center justify-between px-1">
              <button onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))} className="hover-scale grid h-5 w-5 place-items-center rounded-full text-rose hover:bg-blush">
                <ChevronLeft className="h-3 w-3" />
              </button>
              <div className="font-script text-sm text-hotpink">{MONTHS[cursor.getMonth()]} {cursor.getFullYear()}</div>
              <button onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))} className="hover-scale grid h-5 w-5 place-items-center rounded-full text-rose hover:bg-blush">
                <ChevronRight className="h-3 w-3" />
              </button>
            </div>
            <div className="mt-0.5 grid grid-cols-7 text-center text-[8px] font-bold text-rose">
              {WEEKDAYS.map((d) => <div key={d}>{d}</div>)}
            </div>
            <div className="mt-0.5 grid grid-cols-7 gap-0.5">
              {cells.map((c, i) => {
                const phase = phaseForDay(c.date, draft);
                const isPeriod = phase === "period";
                const isOvulation = phase === "ovulation";
                const isToday = sameDay(c.date, TODAY);
                return (
                  <button
                    key={i}
                    onClick={() => update("lastPeriodStart", c.date)}
                    className={[
                      "relative flex aspect-square items-center justify-center rounded-full text-[10px] font-semibold transition-all duration-200 active:scale-90",
                      isPeriod
                        ? "animate-scale-in bg-gradient-to-br from-[#FFC2D6] to-[#FF9EBB] text-white shadow-sm"
                        : isOvulation
                          ? "bg-gradient-to-br from-violet-100 to-fuchsia-100 text-violet-500 ring-2 ring-violet-200"
                          : c.outside
                            ? "text-rose/30 hover:bg-blush"
                            : "text-rose hover:bg-blush",
                      isToday ? "animate-selected-glow ring-1 ring-hotpink/40" : "",
                    ].join(" ")}
                  >
                    {c.date.getDate()}
                    {isPeriod && (
                      <span className="absolute -bottom-0.5 -right-0.5 grid h-3.5 w-3.5 place-items-center rounded-full bg-white shadow-sm">
                        <Droplet className="h-2 w-2 fill-red-500 text-red-500" />
                      </span>
                    )}
                    {isOvulation && (
                      <span className="absolute -bottom-0.5 -right-0.5 grid h-3.5 w-3.5 place-items-center rounded-full bg-white shadow-sm">
                        <Sparkles className="h-2 w-2 fill-violet-400 text-violet-400" />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
            {/* Tiny legend — only what matters */}
            <div className="mt-2 flex items-center justify-center gap-3 text-[9px] font-bold text-rose/80">
              <span className="inline-flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-gradient-to-br from-[#FFC2D6] to-[#FF9EBB]" /> Period</span>
              <span className="inline-flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-gradient-to-br from-violet-100 to-fuchsia-100 ring-2 ring-violet-200" /> Ovulation</span>
              <span className="inline-flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full ring-2 ring-hotpink/60 shadow-[0_0_6px_1px_rgba(236,72,153,0.4)]" /> Today</span>
            </div>
          </div>

          {/* Cycle length + Period length side by side */}
          <div className="animate-scale-in mt-2 grid grid-cols-2 gap-2" style={{ animationDelay: "120ms" }}>
            <Section label="Cycle Length" glow={!isSet("cycleLength")}>
              <Slider min={21} max={35} value={draft.cycleLength} onChange={(v) => update("cycleLength", v)} suffix="d" />
            </Section>
            <Section label="Period Length" glow={!isSet("periodLength")}>
              <Slider min={2} max={10} value={draft.periodLength} onChange={(v) => update("periodLength", v)} suffix="d" />
            </Section>
          </div>

          <div className="animate-scale-in" style={{ animationDelay: "160ms" }}>
            <Section label="Tracker Mode" glow={!isSet("trackerMode")}>
              <div className="grid grid-cols-2 gap-1.5 rounded-full bg-blush/70 p-1">
                {(["protection","conception"] as TrackerMode[]).map((m) => (
                  <button
                    key={m}
                    onClick={() => update("trackerMode", m)}
                    className={[
                      "hover-scale rounded-full py-1.5 text-[11px] font-semibold transition",
                      draft.trackerMode === m ? "bg-hotpink text-white shadow" : "text-rose",
                    ].join(" ")}
                  >
                    {m === "protection" ? "Protection 🛡️" : "Conception 🌷"}
                  </button>
                ))}
              </div>
            </Section>
          </div>

          <div className="animate-scale-in" style={{ animationDelay: "200ms" }}>
            <Section label="Contraceptive Method" glow={!isSet("contraceptiveMethod")}>
              <div className="grid grid-cols-3 gap-1.5">
                {(["pill","patch","ring"] as ContraceptiveMethod[]).map((m) => (
                  <button
                    key={m}
                    onClick={() => update("contraceptiveMethod", m)}
                    className={[
                      "hover-scale rounded-xl py-1.5 text-[11px] font-semibold capitalize transition",
                      draft.contraceptiveMethod === m ? "bg-hotpink text-white shadow" : "bg-blush/70 text-rose",
                    ].join(" ")}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </Section>
          </div>

          <div className="animate-scale-in" style={{ animationDelay: "240ms" }}>
            <Section label="Contraceptive Reminder" glow={!isSet("contraceptiveReminder")}>
              <ToggleRow
                label="Remind to check or take contraception"
                checked={draft.contraceptiveReminder}
                onChange={(v) => update("contraceptiveReminder", v)}
              />
            </Section>
          </div>

          <div className="animate-scale-in" style={{ animationDelay: "280ms" }}>
            <Section label="Reminder Hour" glow={!isSet("reminderHour")}>
              <div className="flex items-center justify-between rounded-xl bg-blush/70 px-3 py-2">
                <span className="inline-flex items-center gap-1.5 text-[11px] text-rose"><Bell className="h-3.5 w-3.5" /> Daily notify hour</span>
                <CuteTimePicker value={draft.reminderHour} onChange={(v) => { update("reminderHour", v); scrollToSave(); }} />
              </div>
            </Section>
          </div>

          <div className="animate-scale-in" style={{ animationDelay: "320ms" }}>
            <Section label="Device Notifications" glow={!isSet("deviceNotifications")}>
              <ToggleRow
                label="Alert on phone, tablet, laptop"
                checked={draft.deviceNotifications}
                onChange={(v) => update("deviceNotifications", v)}
              />
            </Section>
          </div>

          <button
            ref={saveRef}
            onClick={() => { onSave(draft); onClose(); }}
            className="bloom-luxury-btn hover-scale animate-cta-bounce mt-3 w-full py-2.5 text-sm font-semibold text-white"
          >
            <Sparkles className="mr-1 inline h-3.5 w-3.5 animate-bloom-sparkle" />
            Save Period
          </button>
        </div>

        {/* Smart scroll guide — gently bounces while there's more to see */}
        {showScrollHint && (
          <div className="pointer-events-none absolute inset-x-0 bottom-0 flex justify-center bg-gradient-to-t from-white/95 to-transparent pb-1 pt-6">
            <ChevronDown className="h-4 w-4 animate-bounce text-hotpink" />
          </div>
        )}
      </div>
    </div>
  );
}

function Section({ label, children, glow }: { label: string; children: React.ReactNode; glow?: boolean }) {
  return (
    <div className="mt-2">
      <p className="mb-1 flex items-center gap-1.5 text-[9px] font-bold tracking-widest text-rose">
        {label.toUpperCase()}
        {glow && (
          <span className="inline-flex items-center gap-0.5 rounded-full bg-hotpink/10 px-1.5 py-0.5 text-[8px] font-bold tracking-wider text-hotpink">
            <Sparkles className="h-2 w-2 animate-bloom-sparkle" /> SET ME UP
          </span>
        )}
      </p>
      <div className={`rounded-2xl border border-transparent transition-shadow ${glow ? "animate-hint-glow" : ""}`}>
        {children}
      </div>
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
