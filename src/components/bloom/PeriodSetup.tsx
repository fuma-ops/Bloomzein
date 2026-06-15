import { useEffect, useRef, useState } from "react";
import { X, Flower2, Bell, Sparkles, ChevronDown, ChevronUp } from "lucide-react";
import { CuteTimePicker } from "./CutePicker";
import { DatePicker } from "./onboarding/DatePicker";

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

function toISO(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function PeriodSetup({ open, onClose, initial, onSave }: Props) {
  const [draft, setDraft] = useState<CycleSettings>(initial);
  const [showScrollHint, setShowScrollHint] = useState(true);
  // Tracks which settings the user has touched this session, so each one
  // glows ("set me up") until configured, then calms down — guiding the user.
  const [touched, setTouched] = useState<Set<string>>(new Set());
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      setDraft(initial);
      setShowScrollHint(true);
      setTouched(new Set());
    }
  }, [open, initial]);

  if (!open) return null;

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

        <div className="relative min-h-0 flex-1">
        <div ref={scrollRef} onScroll={handleScroll} className="no-scrollbar scroll-smooth h-full overflow-y-auto overscroll-contain p-3.5 sm:p-5">
          <h3 className="animate-fade-in text-center font-script text-xl text-hotpink">Period Setup ✿</h3>

          <div className={`animate-scale-in mt-3 rounded-xl bg-blush/50 p-2 text-center text-[11px] text-rose ${!isSet("lastPeriodStart") ? "animate-soft-glow" : ""}`} style={{ animationDelay: "40ms" }}>
            <Flower2 className="mr-1 inline h-3.5 w-3.5 animate-bloom-sparkle text-hotpink" />
            Tap your <span className="font-semibold text-hotpink">last period start</span> date:
          </div>

          {/* Calendar left, cycle/period length sliders stacked right — saves vertical space for the rest */}
          <div className="animate-scale-in mt-3 grid grid-cols-5 gap-2" style={{ animationDelay: "120ms" }}>
            <div className="col-span-3">
              <DatePicker
                value={toISO(draft.lastPeriodStart)}
                onChange={(iso) => update("lastPeriodStart", new Date(iso + "T00:00:00"))}
                max={toISO(new Date())}
              />
            </div>
            <div className="col-span-2 flex flex-col gap-2">
              <Section label="Cycle Length" glow={!isSet("cycleLength")}>
                <Stepper min={21} max={35} value={draft.cycleLength} onChange={(v) => update("cycleLength", v)} suffix="d" />
              </Section>
              <Section label="Period Length" glow={!isSet("periodLength")}>
                <Stepper min={2} max={10} value={draft.periodLength} onChange={(v) => update("periodLength", v)} suffix="d" />
              </Section>
            </div>
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
                <CuteTimePicker value={draft.reminderHour} onChange={(v) => update("reminderHour", v)} />
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

        </div>

        {/* Smart scroll guide — gently bounces while there's more to see */}
        {showScrollHint && (
          <div className="pointer-events-none absolute inset-x-0 bottom-0 flex justify-center bg-gradient-to-t from-white/95 to-transparent pb-1 pt-6">
            <ChevronDown className="h-4 w-4 animate-bounce text-hotpink" />
          </div>
        )}
        </div>

        {/* Save bar — always visible, no scrolling needed */}
        <div className="shrink-0 border-t border-petal/40 bg-white/95 p-3 sm:p-4">
          <button
            onClick={() => { onSave(draft); onClose(); }}
            className="bloom-luxury-btn hover-scale animate-cta-bounce w-full py-2.5 text-sm font-semibold text-white"
          >
            <Sparkles className="mr-1 inline h-3.5 w-3.5 animate-bloom-sparkle" />
            Save Period
          </button>
        </div>
      </div>
    </div>
  );
}

function Section({ label, children, glow }: { label: string; children: React.ReactNode; glow?: boolean }) {
  return (
    <div className="mt-2">
      <p className="mb-1 flex flex-wrap items-center gap-1 text-[9px] font-bold tracking-widest text-rose">
        {label.toUpperCase()}
        {glow && (
          <span className="inline-flex items-center gap-0.5 whitespace-nowrap rounded-full bg-hotpink/10 px-1.5 py-0.5 text-[8px] font-bold tracking-wider text-hotpink">
            <Sparkles className="h-2 w-2 animate-bloom-sparkle" /> SET UP
          </span>
        )}
      </p>
      <div className={`rounded-2xl border border-transparent transition-shadow ${glow ? "animate-soft-hint-glow" : ""}`}>
        {children}
      </div>
    </div>
  );
}

function Stepper({ min, max, value, onChange, suffix }: { min: number; max: number; value: number; onChange: (v: number) => void; suffix?: string }) {
  return (
    <div className="flex items-center justify-between rounded-xl bg-blush/70 px-2.5 py-1">
      <span className="text-sm font-bold text-hotpink">{value}{suffix}</span>
      <div className="flex flex-col">
        <button
          type="button"
          onClick={() => onChange(Math.min(max, value + 1))}
          disabled={value >= max}
          aria-label="Increase"
          className="grid h-4 w-6 place-items-center text-hotpink transition active:scale-90 disabled:opacity-30"
        >
          <ChevronUp className="h-3 w-3" />
        </button>
        <button
          type="button"
          onClick={() => onChange(Math.max(min, value - 1))}
          disabled={value <= min}
          aria-label="Decrease"
          className="grid h-4 w-6 place-items-center text-hotpink transition active:scale-90 disabled:opacity-30"
        >
          <ChevronDown className="h-3 w-3" />
        </button>
      </div>
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
