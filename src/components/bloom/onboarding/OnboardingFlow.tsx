import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ChevronRight, Search, Sparkles } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { DEFAULT_CYCLE_SETTINGS, writeCycleSettings } from "../cyclePhase";
import { CuteToolIcon } from "../CuteToolIcon";
import { isToolVisited } from "../visitedTools";
import { BloomBubbles } from "../BloomBubbles";
import { DatePicker } from "./DatePicker";
import {
  GOALS,
  ONBOARDING_TOOLS,
  PHASE_COPY,
  TEASERS,
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

// Glassmorphism bottom sheet — rises over a blurred view of the app behind it,
// frosted glass surface with a soft top sheen, drifting bubbles and a drag handle.
function OnboardingSheet({ children }: { children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-[100]">
      <div className="absolute inset-0 bg-[#831843]/25 backdrop-blur-sm" />
      <div className="absolute inset-x-0 bottom-0 mx-auto flex h-[85vh] w-full max-w-sm flex-col overflow-hidden rounded-t-[2rem] border-t border-white/60 bg-white/75 shadow-[0_-20px_60px_-15px_oklch(0.62_0.24_0_/_0.45)] backdrop-blur-xl animate-bloom-sheet-rise">
        <BloomBubbles count={6} className="opacity-60" />
        <div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-20 bg-gradient-to-b from-white/70 via-white/20 to-transparent" />
        <div className="flex shrink-0 justify-center pt-3 pb-1">
          <div className="h-1.5 w-10 rounded-full bg-hotpink/25" />
        </div>
        <div className="relative min-h-0 flex-1 overflow-hidden">{children}</div>
      </div>
    </div>
  );
}

// The bloom flower from the app logo, isolated so it can spin on its own.
function BloomFlower({ size = 48, className = "" }: { size?: number; className?: string }) {
  return (
    <svg viewBox="0 0 512 512" width={size} height={size} className={className} aria-hidden="true">
      <ellipse cx="256" cy="161" rx="48" ry="95" fill="currentColor" />
      <ellipse cx="256" cy="161" rx="48" ry="95" fill="currentColor" transform="rotate(60 256 256)" />
      <ellipse cx="256" cy="161" rx="48" ry="95" fill="currentColor" transform="rotate(120 256 256)" />
      <ellipse cx="256" cy="161" rx="48" ry="95" fill="currentColor" transform="rotate(180 256 256)" />
      <ellipse cx="256" cy="161" rx="48" ry="95" fill="currentColor" transform="rotate(240 256 256)" />
      <ellipse cx="256" cy="161" rx="48" ry="95" fill="currentColor" transform="rotate(300 256 256)" />
      <circle cx="256" cy="256" r="44" fill="#FFD9EC" />
    </svg>
  );
}

// Cycle Tracker as the "brain" of the reveal — the other tools orbit around it,
// pulsing gently to show it's the one organising everything else.
function CycleBrainMedallion({ size = 104 }: { size?: number }) {
  return (
    <span className="relative grid place-items-center" style={{ width: size, height: size }}>
      <span className="animate-pulse-ring pointer-events-none absolute inset-0 rounded-[1.75rem] border-2 border-hotpink/50" />
      <span className="animate-pulse-ring pointer-events-none absolute inset-0 rounded-[1.75rem] border-2 border-hotpink/50" style={{ animationDelay: "1.2s" }} />
      <span className="animate-pulse-ring pointer-events-none absolute inset-0 rounded-[1.75rem] border-2 border-hotpink/50" style={{ animationDelay: "2.4s" }} />
      <span className="clay-blob relative grid h-full w-full place-items-center rounded-[1.75rem] text-white shadow-xl shadow-hotpink/40">
        <CuteToolIcon slug="cycle" className="h-12 w-12" />
      </span>
    </span>
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
      <BloomFlower size={132} className="text-hotpink animate-bloom-flower-spin drop-shadow-[0_8px_20px_oklch(0.65_0.27_350_/_0.35)]" />
      <h1 className="font-script mt-5 text-4xl tracking-wide text-hotpink">Bloomzein</h1>
      <p className="mt-2 text-sm font-light text-rose/70">Your cycle. Your life. All connected.</p>
      <button
        type="button"
        onClick={onNext}
        className="bloom-luxury-btn animate-cta-pulse mt-10 w-full max-w-xs px-8 py-3.5 text-base font-medium text-white"
      >
        Get started
      </button>
      <p className="mt-4 flex items-center gap-1.5 text-xs text-rose/50">
        <Sparkles className="h-3.5 w-3.5" strokeWidth={1.8} /> Set up your space in under a minute
      </p>
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
    <div className="flex h-full flex-col">
      <div className="shrink-0 px-6 pt-6">
        <ProgressDots active={2} onBack={onBack} />
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-4">
        <h2 className="font-script mt-5 animate-question-pop text-2xl text-hotpink">Tell me about your cycle</h2>
        <p className="mt-1 text-sm font-light text-rose/70">Just 3 things — that's all Bloomzein needs to personalise everything</p>

        <p className="mt-5 animate-question-pop text-sm font-medium text-rose" style={{ animationDelay: "0.1s" }}>When did your last period start?</p>
        <DatePicker value={cycleData.lastPeriod} max={todayISO()} onChange={(iso) => setCycleData((c) => ({ ...c, lastPeriod: iso }))} />

        {preview && (
          <div className={`mt-4 animate-in fade-in duration-400 rounded-2xl p-4 ${onboardingPhaseMeta(preview.phase).color}`}>
            <div className="flex items-center justify-between">
              <span className="rounded-full bg-white/60 px-3 py-1 text-xs font-medium">{PHASE_COPY[preview.phase].label}</span>
              <span className="text-xs font-medium">Day {preview.day} of cycle</span>
            </div>
            <p className="mt-2 text-sm font-light">{PHASE_COPY[preview.phase].description}</p>
          </div>
        )}

        <div className="mt-5">
          <p className="animate-question-pop text-sm font-medium text-rose" style={{ animationDelay: "0.2s" }}>How many days does your cycle usually last?</p>
          <Stepper value={cycleData.cycleLength} min={21} max={35} onChange={(v) => setCycleData((c) => ({ ...c, cycleLength: v }))} />
        </div>

        <div className="mt-5">
          <p className="animate-question-pop text-sm font-medium text-rose" style={{ animationDelay: "0.3s" }}>How many days does your period last?</p>
          <Stepper value={cycleData.periodDuration} min={2} max={10} onChange={(v) => setCycleData((c) => ({ ...c, periodDuration: v }))} />
        </div>
      </div>

      <div className="shrink-0 px-6 pb-6 pt-2">
        <button
          type="button"
          onClick={onNext}
          disabled={!cycleData.lastPeriod}
          className={`bloom-luxury-btn w-full px-8 py-3.5 text-base font-medium text-white disabled:pointer-events-none disabled:opacity-40 ${cycleData.lastPeriod ? "animate-cta-pulse" : ""}`}
        >
          Continue
        </button>
      </div>
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
    <div className="flex h-full flex-col">
      <div className="shrink-0 px-6 pt-6">
        <ProgressDots active={3} onBack={onBack} />
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-4">
        <h2 className="font-script mt-5 animate-question-pop text-2xl text-hotpink">What do you want to focus on first?</h2>
        <p className="mt-1 text-sm font-light text-rose/70">You'll have access to everything — this is just your starting point</p>

        <div className="mt-5 flex flex-col gap-3">
          {GOALS.map((g, i) => {
            const Icon = g.icon;
            const selected = goal === g.key;
            return (
              <button
                key={g.key}
                type="button"
                onClick={() => setGoal(g.key)}
                style={{ animationDelay: `${i * 0.08}s` }}
                className={`bloom-pearl-card pearl-sheen flex min-h-[80px] animate-question-pop items-center gap-4 rounded-3xl p-4 text-left transition-all duration-300 ${
                  selected ? "border-2 border-hotpink bg-blush" : "border-2 border-transparent"
                }`}
              >
                <span className="clay-blob grid h-[52px] w-[52px] shrink-0 place-items-center rounded-2xl text-white">
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
      </div>

      <div className="shrink-0 px-6 pb-6 pt-2">
        <button
          type="button"
          onClick={onNext}
          disabled={!goal}
          className={`bloom-luxury-btn w-full px-8 py-3.5 text-base font-medium text-white disabled:pointer-events-none disabled:opacity-40 ${goal ? "animate-cta-pulse" : ""}`}
        >
          Let's go
        </button>
      </div>
    </div>
  );
}

// ── Screen 4 — The reveal ───────────────────────────────────────────
const ORBIT_SIZE = 260;
const ORBIT_RADIUS = 100;
const ORBIT_ORDER = ["workout", "diet", "meals", "reminders", "diaries", "yoga", "budget"];
const ORBIT_POSITIONS = ORBIT_ORDER.map((_, i) => {
  const angle = (Math.PI * 2 * i) / ORBIT_ORDER.length; // 0 = top, clockwise
  return { x: Math.round(Math.sin(angle) * ORBIT_RADIUS), y: Math.round(-Math.cos(angle) * ORBIT_RADIUS) };
});
const ORBIT_CENTER = ORBIT_SIZE / 2;

function Screen4({ onNext }: { onNext: () => void }) {
  const [ctaVisible, setCtaVisible] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setCtaVisible(true), 3200);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="flex h-full flex-col items-center justify-center px-6 text-center">
      <div className="relative" style={{ width: ORBIT_SIZE, height: ORBIT_SIZE }}>
        {/* Big soft pink circles drifting behind the orbit, for depth and life */}
        <div className="pointer-events-none absolute -inset-6 -z-10 rounded-full bg-hotpink/10 animate-bloom-float" />
        <div className="pointer-events-none absolute inset-8 -z-10 rounded-full bg-hotpink/10 animate-bloom-float" style={{ animationDelay: "1.5s" }} />

        {/* The Cycle Tracker sits at the center as the brain organising every tool */}
        <div className="absolute inset-0 flex items-center justify-center animate-onboarding-icon-pop">
          <CycleBrainMedallion size={104} />
        </div>

        {/* Tools and their connector lines slowly revolve around the cycle tracker together */}
        <div className="absolute inset-0 animate-orbit-spin">
          <svg viewBox={`0 0 ${ORBIT_SIZE} ${ORBIT_SIZE}`} className="absolute inset-0 h-full w-full">
            {ORBIT_POSITIONS.map((pos, i) => (
              <line
                key={i}
                x1={ORBIT_CENTER}
                y1={ORBIT_CENTER}
                x2={ORBIT_CENTER + pos.x}
                y2={ORBIT_CENTER + pos.y}
                stroke="var(--hotpink)"
                strokeOpacity="0.35"
                strokeWidth="2"
                strokeLinecap="round"
                strokeDasharray="2 6"
                className="animate-flow-dash"
              />
            ))}
          </svg>

          {ORBIT_ORDER.map((key, i) => {
            const tool = ONBOARDING_TOOLS.find((t) => t.key === key)!;
            const pos = ORBIT_POSITIONS[i];
            return (
              <div
                key={key}
                className="absolute grid h-12 w-12 place-items-center rounded-full bg-white text-hotpink shadow-md animate-onboarding-icon-pop animate-orbit-counter-spin"
                style={{
                  left: `calc(50% + ${pos.x}px - 24px)`,
                  top: `calc(50% + ${pos.y}px - 24px)`,
                  animationDelay: `${0.6 + i * 0.15}s, 0s`,
                }}
              >
                <CuteToolIcon slug={tool.slug} className="h-6 w-6" />
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-2 animate-onboarding-text">
        <p className="font-script text-2xl text-hotpink">Your cycle is the brain.</p>
        <p className="mt-1 text-sm font-light text-rose/70">Bloomzein is setting up the right plan for your phase, everywhere.</p>
      </div>

      {ctaVisible && (
        <button
          type="button"
          onClick={onNext}
          className="bloom-luxury-btn animate-cta-pulse mt-8 animate-in fade-in duration-400 px-8 py-3.5 text-base font-medium text-white"
        >
          Discover my space
        </button>
      )}
    </div>
  );
}

// ── Screen 5 — Tool cards home ──────────────────────────────────────
// A personalised variant of the Tools index page (/app/tools): same hero
// header, search bar and pearl tool cards, but blurbs are swapped for
// phase-aware teasers and the goal-matched tool is pinned first with a
// "Recommended" badge. Tapping any card or "Explore all tools" finishes
// onboarding and hands off to the real Tools/tool pages, where the
// teasers disappear and the normal blurbs return.
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
    <div className="relative min-h-screen animate-fade-in px-4 pt-6 pb-10 sm:px-6">
      <BloomBubbles count={10} />

      <header className="relative mb-5 sm:mb-7">
        <h1 className="font-script text-3xl sm:text-5xl text-hotpink leading-none flex items-center gap-2">
          Welcome to your space <span aria-hidden>🌸</span>
        </h1>
        {phase && meta && (
          <p className="mt-1.5 text-xs sm:text-sm text-rose/80">
            You're in your{" "}
            <span className={`rounded-full px-2 py-0.5 text-[11px] sm:text-xs font-medium ${meta.color}`}>
              {PHASE_COPY[phase].label.replace(" phase", "")}
            </span>
            {day ? ` — day ${day} of your cycle` : ""}
          </p>
        )}

        <div className="mt-3 sm:mt-4 relative max-w-md">
          <Search className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-rose/60" strokeWidth={1.8} />
          <div className="w-full rounded-full bg-white/90 backdrop-blur pl-11 pr-11 py-2 sm:py-3 text-sm text-rose/50 border border-petal/60">
            What would help you bloom today?
          </div>
          <Sparkles className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-hotpink/70" strokeWidth={1.8} />
        </div>
      </header>

      <section className="relative">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-script text-2xl sm:text-3xl text-hotpink leading-none">Your Bloom Tools 🌸</h2>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:gap-4">
          {ordered.map((key, i) => {
            const tool = ONBOARDING_TOOLS.find((t) => t.key === key)!;
            const recommended = tool.slug === recommendedSlug;
            const explored = isToolVisited(tool.slug);
            const teaser = phase ? TEASERS[key][phase] : "";
            return (
              <button
                key={key}
                type="button"
                onClick={() => onEnter(toolHref(tool.slug))}
                style={{ animationDelay: `${i * 0.06}s, ${(i % 6) * 1.4}s` }}
                className={`bloom-pearl-card pearl-sheen group relative block overflow-hidden rounded-3xl p-4 sm:p-5 text-left transition hover:-translate-y-0.5 animate-card-vibrate ${
                  recommended ? "ring-2 ring-hotpink" : !explored ? "opacity-70" : ""
                }`}
              >
                <div
                  className="pointer-events-none absolute -right-6 -bottom-6 h-28 w-28 sm:h-32 sm:w-32 -z-10 rounded-full"
                  style={{ background: "radial-gradient(circle, oklch(0.75 0.18 350 / 0.18), transparent 70%)" }}
                />

                <div className="flex items-start justify-between">
                  <span
                    className={`animate-icon-breathe grid h-12 w-12 sm:h-14 sm:w-14 place-items-center rounded-2xl text-white shrink-0 ${
                      explored || recommended ? "clay-blob" : "grayscale opacity-60 clay-blob"
                    }`}
                  >
                    <CuteToolIcon slug={tool.slug} className="h-7 w-7 sm:h-8 sm:w-8 drop-shadow-[0_2px_3px_oklch(0.4_0.22_350/0.3)]" />
                  </span>
                  <ChevronRight className="h-4 w-4 sm:h-5 sm:w-5 animate-chevron-glow" strokeWidth={2} />
                </div>

                <h3 className="mt-3 sm:mt-4 font-bold text-sm sm:text-base text-[#831843] leading-snug">{toolLabel(tool.slug)}</h3>
                <p className="mt-0.5 sm:mt-1 text-[11px] sm:text-sm font-semibold text-hotpink leading-snug line-clamp-2">{teaser}</p>

                {recommended ? (
                  <span className="mt-3 inline-flex items-center gap-1 rounded-full bg-hotpink/10 text-hotpink text-[9px] sm:text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 border border-hotpink/20">
                    <Sparkles className="h-2.5 w-2.5" strokeWidth={2} /> Recommended
                  </span>
                ) : !explored ? (
                  <span className="mt-3 inline-flex items-center gap-1 rounded-full bg-rose/10 text-rose/60 text-[9px] sm:text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 border border-rose/15">
                    Not explored yet
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      </section>

      <div className="mt-6 flex justify-center">
        <button type="button" onClick={() => onEnter("/app/tools")} className="bloom-luxury-btn inline-flex items-center gap-1.5 px-6 py-2.5 text-sm font-medium text-white">
          Explore all tools <ChevronRight className="h-4 w-4" strokeWidth={2.5} />
        </button>
      </div>
    </div>
  );
}

// ── Main flow ────────────────────────────────────────────────────────
export function OnboardingFlow({ children }: { children: React.ReactNode }) {
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

  if (screen === 5) {
    return <Screen5 phase={phase} goal={goal} cycleData={cycleData} onEnter={finish} />;
  }

  const transitionClass =
    direction === "forward"
      ? "animate-in fade-in slide-in-from-right-10 duration-400 ease-in-out"
      : "animate-in fade-in slide-in-from-left-10 duration-400 ease-in-out";

  return (
    <>
      <div className="pointer-events-none select-none blur-sm">{children}</div>
      <OnboardingSheet>
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
          {screen === 4 && <Screen4 onNext={() => goTo(5, "forward")} />}
        </div>
      </OnboardingSheet>
    </>
  );
}
