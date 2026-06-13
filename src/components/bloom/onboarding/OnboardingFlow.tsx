import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ChevronRight } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { DEFAULT_CYCLE_SETTINGS, writeCycleSettings } from "../cyclePhase";
import {
  GOALS,
  ONBOARDING_TOOLS,
  PHASE_COPY,
  TEASERS,
  appPhaseToOnboarding,
  calcPhasePreview,
  onboardingPhaseMeta,
  toolHref,
  toolLabel,
  writeOnboardingState,
  type GoalKey,
  type OnboardingCycleData,
  type OnboardingPhase,
} from "./onboardingData";

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

// Soft organic bloom/petal shape — reused on the welcome screen and as the
// reveal animation's central anchor (Screen 1 + Screen 4 of the onboarding doc).
function BloomShape({ size = 220, gradId = "welcome" }: { size?: number; gradId?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 200 200">
      <defs>
        <linearGradient id={`bloomShapeGrad-${gradId}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="oklch(0.92 0.08 70)" />
          <stop offset="100%" stopColor="oklch(0.7 0.26 350)" />
        </linearGradient>
      </defs>
      <path
        d="M100,20 C140,18 178,45 180,90 C182,135 150,178 100,180 C50,182 18,140 20,95 C22,50 60,22 100,20 Z"
        fill={`url(#bloomShapeGrad-${gradId})`}
        opacity="0.85"
      />
    </svg>
  );
}

function ProgressDots({ active, onBack }: { active: number; onBack?: () => void }) {
  return (
    <div className="flex items-center justify-between">
      {onBack ? (
        <button
          type="button"
          onClick={onBack}
          aria-label="Back"
          className="grid h-9 w-9 place-items-center rounded-full bg-white/70 text-rose transition hover:bg-white"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
      ) : (
        <div className="h-9 w-9" />
      )}
      <div className="flex items-center gap-1.5">
        {[1, 2, 3, 4, 5].map((i) => (
          <span
            key={i}
            className={`h-1.5 rounded-full transition-all duration-400 ${i === active ? "w-5 bg-hotpink" : "w-1.5 bg-petal"}`}
          />
        ))}
      </div>
      <div className="h-9 w-9" />
    </div>
  );
}

function Stepper({ value, min, max, onChange }: { value: number; min: number; max: number; onChange: (v: number) => void }) {
  return (
    <div className="mt-2 flex items-center justify-center gap-6">
      <button
        type="button"
        onClick={() => onChange(Math.max(min, value - 1))}
        disabled={value <= min}
        className="grid h-10 w-10 place-items-center rounded-full bg-white/80 border border-petal text-lg font-medium text-hotpink transition active:scale-95 disabled:opacity-30"
      >
        −
      </button>
      <span className="font-script w-12 text-center text-3xl text-hotpink">{value}</span>
      <button
        type="button"
        onClick={() => onChange(Math.min(max, value + 1))}
        disabled={value >= max}
        className="grid h-10 w-10 place-items-center rounded-full bg-white/80 border border-petal text-lg font-medium text-hotpink transition active:scale-95 disabled:opacity-30"
      >
        +
      </button>
    </div>
  );
}

// ── Screen 1 — Welcome ──────────────────────────────────────────────
function Screen1({ onNext }: { onNext: () => void }) {
  return (
    <div className="flex h-full flex-col items-center justify-center px-6 text-center">
      <BloomShape size={220} gradId="welcome" />
      <h1 className="font-script mt-6 text-5xl tracking-wide text-hotpink">Bloomzein</h1>
      <p className="mt-2 text-sm font-light text-rose/70">Your cycle. Your life. All connected.</p>
      <button
        type="button"
        onClick={onNext}
        className="bloom-luxury-btn mt-10 w-full max-w-xs px-8 py-3.5 text-base font-medium text-white"
      >
        Get started
      </button>
      <p className="mt-4 text-xs text-rose/50">No account needed to start</p>
    </div>
  );
}

// ── Screen 2 — Cycle setup ──────────────────────────────────────────
function Screen2({
  cycleData,
  setCycleData,
  setPhase,
  onNext,
  onBack,
}: {
  cycleData: OnboardingCycleData;
  setCycleData: (fn: (c: OnboardingCycleData) => OnboardingCycleData) => void;
  setPhase: (p: OnboardingPhase) => void;
  onNext: () => void;
  onBack: () => void;
}) {
  const preview = useMemo(
    () => (cycleData.lastPeriod ? calcPhasePreview(cycleData.lastPeriod, cycleData.cycleLength, cycleData.periodDuration) : null),
    [cycleData.lastPeriod, cycleData.cycleLength, cycleData.periodDuration]
  );

  useEffect(() => {
    if (preview) setPhase(preview.phase);
  }, [preview?.phase]);

  return (
    <div className="flex h-full flex-col overflow-y-auto px-6 pt-6 pb-8">
      <ProgressDots active={2} onBack={onBack} />

      <h2 className="font-script mt-6 text-3xl text-hotpink">Tell me about your cycle</h2>
      <p className="mt-1 text-sm font-light text-rose/70">Just 3 things — that's all Bloomzein needs to personalise everything</p>

      <label className="mt-6 block text-sm font-medium text-rose">
        When did your last period start?
        <input
          type="date"
          required
          max={todayISO()}
          value={cycleData.lastPeriod ?? ""}
          onChange={(e) => setCycleData((c) => ({ ...c, lastPeriod: e.target.value }))}
          className="mt-2 w-full rounded-2xl border border-petal bg-white/80 px-4 py-3 text-sm font-normal text-rose outline-none transition focus:border-hotpink focus:ring-4 focus:ring-hotpink/15"
        />
      </label>

      {preview && (
        <div className={`mt-4 animate-in fade-in duration-400 rounded-2xl p-4 ${onboardingPhaseMeta(preview.phase).color}`}>
          <div className="flex items-center justify-between">
            <span className="rounded-full bg-white/60 px-3 py-1 text-xs font-medium">{PHASE_COPY[preview.phase].label}</span>
            <span className="text-xs font-medium">Day {preview.day} of cycle</span>
          </div>
          <p className="mt-2 text-sm font-light">{PHASE_COPY[preview.phase].description}</p>
        </div>
      )}

      <div className="mt-6">
        <p className="text-sm font-medium text-rose">How many days does your cycle usually last?</p>
        <Stepper value={cycleData.cycleLength} min={21} max={35} onChange={(v) => setCycleData((c) => ({ ...c, cycleLength: v }))} />
      </div>

      <div className="mt-6">
        <p className="text-sm font-medium text-rose">How many days does your period last?</p>
        <Stepper value={cycleData.periodDuration} min={2} max={10} onChange={(v) => setCycleData((c) => ({ ...c, periodDuration: v }))} />
      </div>

      <button
        type="button"
        onClick={onNext}
        disabled={!cycleData.lastPeriod}
        className="bloom-luxury-btn mt-8 px-8 py-3.5 text-base font-medium text-white disabled:pointer-events-none disabled:opacity-40"
      >
        Continue
      </button>
    </div>
  );
}

// ── Screen 3 — Goal selection ───────────────────────────────────────
function Screen3({
  goal,
  setGoal,
  onNext,
  onBack,
}: {
  goal: GoalKey | null;
  setGoal: (g: GoalKey) => void;
  onNext: () => void;
  onBack: () => void;
}) {
  return (
    <div className="flex h-full flex-col overflow-y-auto px-6 pt-6 pb-8">
      <ProgressDots active={3} onBack={onBack} />

      <h2 className="font-script mt-6 text-3xl text-hotpink">What do you want to focus on first?</h2>
      <p className="mt-1 text-sm font-light text-rose/70">You'll have access to everything — this is just your starting point</p>

      <div className="mt-6 flex flex-col gap-3">
        {GOALS.map((g) => {
          const Icon = g.icon;
          const selected = goal === g.key;
          return (
            <button
              key={g.key}
              type="button"
              onClick={() => setGoal(g.key)}
              className={`flex min-h-[88px] items-center gap-4 rounded-3xl bg-white/85 p-4 text-left shadow-md transition-all duration-300 ${
                selected ? "border-2 border-hotpink bg-blush" : "border-2 border-transparent"
              }`}
            >
              <span className="grid h-[52px] w-[52px] shrink-0 place-items-center rounded-2xl bg-petal text-hotpink">
                <Icon className="h-6 w-6" />
              </span>
              <span className="flex-1">
                <span className="block text-base font-medium text-rose">{g.title}</span>
                <span className="block text-[13px] font-light text-rose/60">{g.subtitle}</span>
              </span>
              <ChevronRight className={`h-5 w-5 shrink-0 transition ${selected ? "text-hotpink" : "text-rose/30"}`} />
            </button>
          );
        })}
      </div>

      <button
        type="button"
        onClick={onNext}
        disabled={!goal}
        className="bloom-luxury-btn mt-8 px-8 py-3.5 text-base font-medium text-white disabled:pointer-events-none disabled:opacity-40"
      >
        Let's go
      </button>
    </div>
  );
}

// ── Screen 4 — The reveal ───────────────────────────────────────────
const ORBIT_RADIUS = 120;
const ORBIT_ORDER = ["workout", "diet", "meals", "calendar", "reminders", "diaries", "yoga", "budget"];
const ORBIT_POSITIONS = ORBIT_ORDER.map((_, i) => {
  const angle = (Math.PI * 2 * i) / ORBIT_ORDER.length; // 0 = top, clockwise
  return { x: Math.round(Math.sin(angle) * ORBIT_RADIUS), y: Math.round(-Math.cos(angle) * ORBIT_RADIUS) };
});

function Screen4({ phase, onNext }: { phase: OnboardingPhase | null; onNext: () => void }) {
  const [ctaVisible, setCtaVisible] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setCtaVisible(true), 3200);
    return () => clearTimeout(t);
  }, []);

  const meta = phase ? onboardingPhaseMeta(phase) : null;

  return (
    <div className="flex h-full flex-col items-center justify-center px-6 text-center">
      <div className="relative" style={{ width: 320, height: 320 }}>
        <svg viewBox="0 0 320 320" className="absolute inset-0 h-full w-full">
          {ORBIT_POSITIONS.map((pos, i) => (
            <line
              key={i}
              x1="160"
              y1="160"
              x2={160 + pos.x}
              y2={160 + pos.y}
              stroke="oklch(0.62 0.24 0 / 0.3)"
              strokeWidth="1.5"
              strokeDasharray="200"
              strokeDashoffset="200"
              className="animate-onboarding-line"
            />
          ))}
        </svg>

        <div className="absolute inset-0 flex items-center justify-center animate-onboarding-shape">
          <BloomShape size={120} gradId="reveal" />
        </div>
        {meta && phase && (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className={`animate-onboarding-badge whitespace-nowrap rounded-full px-3 py-1 text-xs font-medium ${meta.color}`}>
              {PHASE_COPY[phase].label}
            </span>
          </div>
        )}

        {ORBIT_ORDER.map((key, i) => {
          const tool = ONBOARDING_TOOLS.find((t) => t.key === key)!;
          const pos = ORBIT_POSITIONS[i];
          const Icon = tool.icon;
          return (
            <div
              key={key}
              className="absolute grid h-10 w-10 place-items-center rounded-full bg-white text-hotpink shadow-md animate-onboarding-icon"
              style={
                {
                  left: `calc(50% + ${pos.x}px - 20px)`,
                  top: `calc(50% + ${pos.y}px - 20px)`,
                  animationDelay: `${0.6 + i * 0.15}s`,
                  "--fly-x": `${-pos.x}px`,
                  "--fly-y": `${-pos.y}px`,
                } as React.CSSProperties
              }
            >
              <Icon className="h-5 w-5" />
            </div>
          );
        })}
      </div>

      <div className="mt-2 animate-onboarding-text">
        <p className="font-script text-2xl text-hotpink">Bloomzein is ready.</p>
        <p className="mt-1 text-sm font-light text-rose/70">Everything adapts to you automatically.</p>
      </div>

      {ctaVisible && (
        <button
          type="button"
          onClick={onNext}
          className="bloom-luxury-btn mt-8 animate-in fade-in duration-400 px-8 py-3.5 text-base font-medium text-white"
        >
          Discover my space
        </button>
      )}
    </div>
  );
}

// ── Screen 5 — Tool cards home ──────────────────────────────────────
const CARD_ORDER = ["workout", "diet", "meals", "yoga", "calendar", "diaries", "reminders", "budget"];

function Screen5({
  phase,
  goal,
  cycleData,
  onEnter,
}: {
  phase: OnboardingPhase | null;
  goal: GoalKey | null;
  cycleData: OnboardingCycleData;
  onEnter: (href: string) => void;
}) {
  const day = cycleData.lastPeriod ? calcPhasePreview(cycleData.lastPeriod, cycleData.cycleLength, cycleData.periodDuration).day : null;
  const meta = phase ? onboardingPhaseMeta(phase) : null;
  const recommendedSlug = GOALS.find((g) => g.key === goal)?.toolSlug;

  const ordered = useMemo(() => {
    const keys = [...CARD_ORDER];
    const recommendedKey = ONBOARDING_TOOLS.find((t) => t.slug === recommendedSlug)?.key;
    if (recommendedKey) {
      const idx = keys.indexOf(recommendedKey);
      if (idx > 0) {
        keys.splice(idx, 1);
        keys.unshift(recommendedKey);
      }
    }
    return keys;
  }, [recommendedSlug]);

  return (
    <div className="flex h-full flex-col overflow-y-auto bg-[#FFF0F6] px-5 pt-8 pb-10 animate-in fade-in duration-400">
      <h1 className="font-script text-3xl text-hotpink">Welcome to your space 🌸</h1>
      {phase && meta && (
        <p className="mt-1.5 text-sm font-light text-rose/70">
          You're in your{" "}
          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${meta.color}`}>{PHASE_COPY[phase].label.replace(" phase", "")}</span>
          {day ? ` — day ${day} of your cycle` : ""}
        </p>
      )}

      <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {ordered.map((key) => {
          const tool = ONBOARDING_TOOLS.find((t) => t.key === key)!;
          const Icon = tool.icon;
          const recommended = tool.slug === recommendedSlug;
          const teaser = phase ? TEASERS[key][phase] : "";
          return (
            <button
              key={key}
              type="button"
              onClick={() => onEnter(toolHref(tool.slug))}
              className={`relative flex min-h-[88px] items-center gap-4 rounded-3xl bg-white p-5 text-left shadow-md transition active:scale-[0.98] ${
                recommended ? "border-2 border-hotpink" : ""
              }`}
            >
              {recommended && (
                <span className="absolute right-4 top-4 rounded-full bg-hotpink/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-hotpink">
                  Recommended
                </span>
              )}
              <span className="grid h-[52px] w-[52px] shrink-0 place-items-center rounded-2xl bg-petal text-hotpink">
                <Icon className="h-6 w-6" />
              </span>
              <span className="flex-1 pr-4">
                <span className="block text-base font-medium text-rose">{toolLabel(tool.slug)}</span>
                <span className="mt-0.5 block text-[13px] font-light leading-snug text-rose/60 line-clamp-2">{teaser}</span>
              </span>
              <ChevronRight className="h-5 w-5 shrink-0 text-rose/30" />
            </button>
          );
        })}
      </div>

      <button type="button" onClick={() => onEnter("/app/tools")} className="mt-6 text-center text-xs font-medium text-rose/50 underline-offset-2 hover:text-hotpink hover:underline">
        Explore all tools
      </button>
    </div>
  );
}

// ── Main flow ────────────────────────────────────────────────────────
export function OnboardingFlow() {
  const { updateProfile } = useAuth();
  const [screen, setScreen] = useState(1);
  const [direction, setDirection] = useState<"forward" | "back">("forward");
  const [cycleData, setCycleData] = useState<OnboardingCycleData>({ lastPeriod: null, cycleLength: 28, periodDuration: 5 });
  const [goal, setGoal] = useState<GoalKey | null>(null);
  const [phase, setPhase] = useState<OnboardingPhase | null>(null);

  const goTo = (n: number, dir: "forward" | "back") => {
    setDirection(dir);
    setScreen(n);
  };

  const finish = (href: string) => {
    if (cycleData.lastPeriod) {
      writeCycleSettings({
        ...DEFAULT_CYCLE_SETTINGS,
        lastPeriodStart: new Date(cycleData.lastPeriod),
        cycleLength: cycleData.cycleLength,
        periodLength: cycleData.periodDuration,
      });
    }
    writeOnboardingState({ complete: true, cycleData, goal, phase });
    updateProfile({ setup_done: true }).finally(() => {
      window.location.href = href;
    });
  };

  const transitionClass =
    direction === "forward"
      ? "animate-in fade-in slide-in-from-right-10 duration-400 ease-in-out"
      : "animate-in fade-in slide-in-from-left-10 duration-400 ease-in-out";

  return (
    <div className="fixed inset-0 z-[100] bg-[#FFF0F6] overflow-hidden">
      <div key={screen} className={`absolute inset-0 ${transitionClass}`}>
        {screen === 1 && <Screen1 onNext={() => goTo(2, "forward")} />}
        {screen === 2 && (
          <Screen2
            cycleData={cycleData}
            setCycleData={setCycleData}
            setPhase={setPhase}
            onNext={() => goTo(3, "forward")}
            onBack={() => goTo(1, "back")}
          />
        )}
        {screen === 3 && <Screen3 goal={goal} setGoal={setGoal} onNext={() => goTo(4, "forward")} onBack={() => goTo(2, "back")} />}
        {screen === 4 && <Screen4 phase={phase} onNext={() => goTo(5, "forward")} />}
        {screen === 5 && <Screen5 phase={phase} goal={goal} cycleData={cycleData} onEnter={finish} />}
      </div>
    </div>
  );
}
