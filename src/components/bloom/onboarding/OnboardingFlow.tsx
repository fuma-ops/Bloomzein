import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, ChevronRight, Search, Sparkles } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { DEFAULT_CYCLE_SETTINGS, writeCycleSettings } from "../cyclePhase";
import { CuteToolIcon } from "../CuteToolIcon";
import { isToolVisited } from "../visitedTools";
import { BloomBubbles } from "../BloomBubbles";
import { AnimatedWords } from "../AnimatedWords";
import { DatePicker } from "./DatePicker";
import {
  DIET_CONTENT,
  GOALS,
  GRATITUDE_PROMPTS,
  MOVEMENT_CONTENT,
  ONBOARDING_TOOLS,
  PHASE_COPY,
  TEASERS,
  WEEKLY_SUMMARY,
  YOGA_CONTENT,
  calcPhasePreview,
  onboardingPhaseMeta,
  proteinTarget,
  saveOnboardingGratitude,
  splitPipe,
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
        className="bloom-luxury-btn animate-cta-pulse mt-10 inline-flex w-full max-w-xs items-center justify-center gap-1.5 px-8 py-3.5 text-base font-medium text-white"
      >
        Get started <ChevronRight className="h-4 w-4 animate-arrow-nudge" strokeWidth={2.5} />
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

  // Guides the user through the 3 questions one at a time: as soon as one is
  // answered, we scroll to and spotlight the next one.
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const cycleLenRef = useRef<HTMLDivElement>(null);
  const periodLenRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (cycleData.lastPeriod && step === 1) {
      const t = setTimeout(() => setStep(2), 450);
      return () => clearTimeout(t);
    }
  }, [cycleData.lastPeriod, step]);

  useEffect(() => {
    if (step === 2) {
      cycleLenRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      const t = setTimeout(() => setStep(3), 1500);
      return () => clearTimeout(t);
    }
    if (step === 3) {
      periodLenRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [step]);

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

        <div
          ref={cycleLenRef}
          className={`mt-5 rounded-2xl p-3 -mx-3 transition-opacity duration-500 ${step >= 2 ? "opacity-100" : "opacity-30"} ${step === 2 ? "animate-question-pop" : ""}`}
        >
          <p className="text-sm font-medium text-rose">How many days does your cycle usually last?</p>
          <Stepper value={cycleData.cycleLength} min={21} max={35} onChange={(v) => setCycleData((c) => ({ ...c, cycleLength: v }))} />
        </div>

        <div
          ref={periodLenRef}
          className={`mt-5 rounded-2xl p-3 -mx-3 transition-opacity duration-500 ${step >= 3 ? "opacity-100" : "opacity-30"} ${step === 3 ? "animate-question-pop" : ""}`}
        >
          <p className="text-sm font-medium text-rose">How many days does your period last?</p>
          <Stepper value={cycleData.periodDuration} min={2} max={10} onChange={(v) => setCycleData((c) => ({ ...c, periodDuration: v }))} />
        </div>
      </div>

      <div className={`shrink-0 rounded-2xl px-6 pb-6 pt-2 ${step === 3 ? "animate-step-highlight" : ""}`}>
        <button
          type="button"
          onClick={onNext}
          disabled={!cycleData.lastPeriod}
          className={`bloom-luxury-btn inline-flex w-full items-center justify-center gap-1.5 px-8 py-3.5 text-base font-medium text-white disabled:pointer-events-none disabled:opacity-40 ${cycleData.lastPeriod ? "animate-cta-pulse" : ""}`}
        >
          Continue <ChevronRight className="h-4 w-4 animate-arrow-nudge" strokeWidth={2.5} />
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

        <div className="mt-4 flex flex-col gap-2.5">
          {GOALS.map((g, i) => {
            const Icon = g.icon;
            const selected = goal === g.key;
            return (
              <button
                key={g.key}
                type="button"
                onClick={() => setGoal(g.key)}
                style={{ animationDelay: `${i * 0.08}s` }}
                className={`bloom-pearl-card pearl-sheen flex min-h-[64px] animate-question-pop items-center gap-3 rounded-2xl p-3 text-left transition-all duration-300 ${
                  selected ? "border-2 border-hotpink bg-blush" : "border-2 border-transparent"
                }`}
              >
                <span className={`clay-blob grid h-11 w-11 shrink-0 place-items-center rounded-xl text-white animate-icon-breathe shadow-lg ${selected ? "shadow-hotpink/50" : "shadow-hotpink/25"}`}>
                  <Icon className="h-5 w-5" />
                </span>
                <span className="flex-1">
                  <span className="block text-sm font-medium text-rose">{g.title}</span>
                  <span className="block text-[12px] font-light text-rose/60 leading-snug">{g.subtitle}</span>
                </span>
                <ChevronRight className={`h-5 w-5 shrink-0 transition ${selected ? "text-hotpink" : "text-rose/30 animate-arrow-nudge"}`} />
              </button>
            );
          })}
        </div>
      </div>

      <div className={`shrink-0 rounded-2xl px-6 pb-6 pt-2 ${goal ? "animate-step-highlight" : ""}`}>
        <button
          type="button"
          onClick={onNext}
          disabled={!goal}
          className={`bloom-luxury-btn inline-flex w-full items-center justify-center gap-1.5 px-8 py-3.5 text-base font-medium text-white disabled:pointer-events-none disabled:opacity-40 ${goal ? "animate-cta-pulse" : ""}`}
        >
          Let's go <ChevronRight className="h-4 w-4 animate-arrow-nudge" strokeWidth={2.5} />
        </button>
      </div>
    </div>
  );
}

// ── Screen 4 — The post-choice reveal ───────────────────────────────
// Persistent top banner shown on every reveal screen: a soft phase-coloured
// pill whose phase name types itself out character by character.
function PhaseBanner({ phase, day }: { phase: OnboardingPhase; day: number | null }) {
  const meta = onboardingPhaseMeta(phase);
  const label = PHASE_COPY[phase].label;
  const [typed, setTyped] = useState("");
  const [showCursor, setShowCursor] = useState(true);

  useEffect(() => {
    setTyped("");
    setShowCursor(true);
    let i = 0;
    const interval = setInterval(() => {
      i++;
      setTyped(label.slice(0, i));
      if (i >= label.length) {
        clearInterval(interval);
        setTimeout(() => setShowCursor(false), 650);
      }
    }, 40);
    return () => clearInterval(interval);
  }, [label]);

  return (
    <div className="mt-3 flex justify-center">
      <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-[11px] font-medium ${meta.color}`}>
        Based on your cycle{day ? ` · Day ${day}` : ""} · {typed}
        {showCursor && <span className="animate-pulse">|</span>}
      </span>
    </div>
  );
}

// Small pulsing waveform used on session/workout cards to suggest "alive" content.
function PulseWaveform({ className = "" }: { className?: string }) {
  const heights = [40, 70, 100, 65, 90, 50, 80, 45, 75, 60];
  return (
    <div className={`flex items-end gap-1 ${className}`} aria-hidden="true">
      {heights.map((h, i) => (
        <span
          key={i}
          className="w-1.5 rounded-full bg-white/70 animate-icon-breathe"
          style={{ height: `${h}%`, animationDelay: `${i * 0.1}s` }}
        />
      ))}
    </div>
  );
}

interface Screen4Props {
  phase: OnboardingPhase;
  day: number | null;
  onNext: () => void;
  onEnter: (href: string) => void;
}

// "Enter Bloomzein" footer — only rendered once every card has had time to land.
function EnterBloomzeinFooter({ visible, onNext }: { visible: boolean; onNext: () => void }) {
  if (!visible) return null;
  return (
    <div className="shrink-0 px-6 pb-6 pt-2 animate-in fade-in zoom-in-95 duration-400">
      <button
        type="button"
        onClick={onNext}
        className="bloom-luxury-btn animate-cta-pulse inline-flex w-full items-center justify-center gap-1.5 px-8 py-3.5 text-base font-medium text-white active:scale-95"
      >
        Enter Bloomzein <ChevronRight className="h-4 w-4 animate-arrow-nudge" strokeWidth={2.5} />
      </button>
    </div>
  );
}

function useCtaDelay(cardCount: number) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), (cardCount - 1) * 200 + 600 + 400);
    return () => clearTimeout(t);
  }, [cardCount]);
  return visible;
}

// CHOICE 1 — "Feel better in my body" → hero yoga session + this week's flows.
function Screen4Yoga({ phase, day, onNext, onEnter }: Screen4Props) {
  const content = YOGA_CONTENT[phase];
  const [name, duration, tag] = splitPipe(content.session);
  const ctaVisible = useCtaDelay(1 + content.week.length);

  return (
    <div className="flex h-full flex-col">
      <div className="shrink-0 px-6 pt-6">
        <ProgressDots active={4} />
        <PhaseBanner phase={phase} day={day} />
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-4">
        <AnimatedWords text={content.headline} className="font-script mt-4 block text-2xl text-hotpink" />

        <div className="bloom-luxury-btn animate-spring-center hover-scale mt-4 p-5 text-white shadow-xl active:scale-95">
          <span className="inline-flex items-center gap-1 rounded-full bg-white/20 px-2.5 py-0.5 text-[11px] font-medium">{tag}</span>
          <h3 className="mt-2 text-xl font-semibold">{name}</h3>
          <p className="mt-0.5 text-sm font-light text-white/80">{duration}</p>
          <PulseWaveform className="mt-5 h-10" />
          <button
            type="button"
            onClick={() => onEnter("/app/tools/yoga")}
            className="animate-cta-pulse mt-5 inline-flex w-full items-center justify-center gap-1.5 rounded-2xl bg-white px-6 py-3 text-sm font-semibold text-hotpink active:scale-95"
          >
            Start this session <ChevronRight className="h-4 w-4" strokeWidth={2.5} />
          </button>
          <button
            type="button"
            onClick={() => onEnter("/app/tools/yoga")}
            className="mt-3 block w-full text-center text-xs font-medium text-white/85 underline-offset-2 hover:underline"
          >
            Discover the full Yoga library →
          </button>
        </div>

        <h4 className="mt-6 text-sm font-semibold text-rose">This week</h4>
        <div className="mt-2 flex flex-col gap-2">
          {content.week.map((item, i) => (
            <div
              key={item}
              style={{ animationDelay: `${0.2 + i * 0.2}s` }}
              className="bloom-pearl-card pearl-sheen animate-spring-left hover-scale flex items-center justify-between rounded-2xl p-3 active:scale-95"
            >
              <span className="text-sm text-rose">{item}</span>
              <span className="h-2 w-2 rounded-full bg-hotpink/60" />
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={() => onEnter("/app/tools/yoga")}
          className="mt-3 block w-full text-center text-xs font-medium text-hotpink underline-offset-2 hover:underline"
        >
          See full weekly plan →
        </button>
      </div>

      <EnterBloomzeinFooter visible={ctaVisible} onNext={onNext} />
    </div>
  );
}

// CHOICE 2 — "Eat better" → today's nutrition insight, 3 meals, protein target.
function Screen4Diet({ phase, day, onNext, onEnter, profile }: Screen4Props & { profile: { weight: number | null; weight_unit: "kg" | "lbs" } | null }) {
  const content = DIET_CONTENT[phase];
  const meals = [
    { label: "Breakfast", spring: "animate-spring-left", data: content.breakfast, delay: 0 },
    { label: "Lunch", spring: "animate-spring-right", data: content.lunch, delay: 0.2 },
    { label: "Dinner", spring: "animate-spring-bottom", data: content.dinner, delay: 0.4 },
  ];
  const [added, setAdded] = useState([false, false, false]);
  const ctaVisible = useCtaDelay(meals.length);
  const protein = proteinTarget(phase, profile?.weight, profile?.weight_unit);

  return (
    <div className="flex h-full flex-col">
      <div className="shrink-0 px-6 pt-6">
        <ProgressDots active={4} />
        <PhaseBanner phase={phase} day={day} />
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-4">
        <AnimatedWords text="Here's what your body needs today." className="font-script mt-4 block text-2xl text-hotpink" />
        <p className="mt-1.5 animate-fade-in text-sm font-light text-rose/70" style={{ animationDelay: "0.3s" }}>
          {content.insight}
        </p>

        <div className="mt-4 flex flex-col gap-2.5">
          {meals.map((meal, i) => {
            const [recipe, time, macro] = splitPipe(meal.data);
            return (
              <div
                key={meal.label}
                style={{ animationDelay: `${meal.delay}s` }}
                className={`bloom-pearl-card pearl-sheen ${meal.spring} hover-scale rounded-2xl p-4`}
              >
                <span className="rounded-full bg-blush px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-hotpink">{meal.label}</span>
                <h3 className="mt-2 text-sm font-semibold text-rose">{recipe}</h3>
                <p className="mt-0.5 text-xs font-light text-rose/60">{time} · {macro}</p>
                <button
                  type="button"
                  onClick={() => setAdded((a) => a.map((v, idx) => (idx === i ? !v : v)))}
                  className={`mt-3 inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-semibold transition active:scale-95 ${
                    added[i] ? "bg-hotpink/15 text-hotpink" : "animate-cta-pulse bg-hotpink text-white"
                  }`}
                >
                  {added[i] ? "Added to my plan ✓" : "Add to my plan"}
                </button>
              </div>
            );
          })}
        </div>

        <div className="bloom-pearl-card animate-fade-in mt-4 rounded-2xl p-4" style={{ animationDelay: "0.7s" }}>
          <p className="text-sm font-semibold text-rose">Today's protein target: {protein}g</p>
          <button
            type="button"
            onClick={() => onEnter("/app/tools/diet")}
            className="mt-1 text-xs font-medium text-hotpink underline-offset-2 hover:underline"
          >
            See how to reach it →
          </button>
        </div>

        <button
          type="button"
          onClick={() => onEnter("/app/tools/diet")}
          className="mt-3 block w-full text-center text-xs font-medium text-hotpink underline-offset-2 hover:underline"
        >
          Explore my full nutrition plan →
        </button>
      </div>

      <EnterBloomzeinFooter visible={ctaVisible} onNext={onNext} />
    </div>
  );
}

// CHOICE 3 — "Move more" → stacked workout / yoga complement / recovery meal.
function Screen4Movement({ phase, day, onNext, onEnter }: Screen4Props) {
  const content = MOVEMENT_CONTENT[phase];
  const [workoutName, workoutDuration, workoutTag] = splitPipe(content.workout);
  const [yogaName, yogaDuration, yogaTag] = splitPipe(content.yoga);
  const [mealName, mealTime, mealMacro] = splitPipe(content.meal);
  const ctaVisible = useCtaDelay(3);

  return (
    <div className="flex h-full flex-col">
      <div className="shrink-0 px-6 pt-6">
        <ProgressDots active={4} />
        <PhaseBanner phase={phase} day={day} />
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-4">
        <AnimatedWords text="Your week, all connected." className="font-script mt-4 block text-2xl text-hotpink" />

        <div className="mt-4 animate-spring-bottom bloom-luxury-btn hover-scale p-5 text-white shadow-xl active:scale-95">
          <span className="inline-flex items-center gap-1 rounded-full bg-white/20 px-2.5 py-0.5 text-[11px] font-medium">{workoutTag}</span>
          <h3 className="mt-2 text-xl font-semibold">{workoutName}</h3>
          <p className="mt-0.5 text-sm font-light text-white/80">{workoutDuration}</p>
          <p className="mt-2 text-xs font-light text-white/70">{content.zones}</p>
          <button
            type="button"
            onClick={() => onEnter("/app/tools/workout")}
            className="animate-cta-pulse mt-4 inline-flex w-full items-center justify-center gap-1.5 rounded-2xl bg-white px-6 py-3 text-sm font-semibold text-hotpink active:scale-95"
          >
            Start today's session <ChevronRight className="h-4 w-4" strokeWidth={2.5} />
          </button>
          <button
            type="button"
            onClick={() => onEnter("/app/tools/workout")}
            className="mt-3 block w-full text-center text-xs font-medium text-white/85 underline-offset-2 hover:underline"
          >
            Build my full program →
          </button>
        </div>

        <div
          style={{ animationDelay: "0.2s" }}
          className="bloom-pearl-card pearl-sheen animate-spring-bottom hover-scale -mt-3 rounded-2xl p-4 pt-6"
        >
          <span className="rounded-full bg-blush px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-hotpink">Yoga complement</span>
          <h3 className="mt-2 text-sm font-semibold text-rose">{yogaName}</h3>
          <p className="mt-0.5 text-xs font-light text-rose/60">{yogaDuration} · {yogaTag}</p>
          <p className="mt-1.5 text-xs font-light text-rose/70">Pairs perfectly with your workout this week</p>
          <button
            type="button"
            onClick={() => onEnter("/app/tools/yoga")}
            className="mt-3 text-xs font-medium text-hotpink underline-offset-2 hover:underline"
          >
            Explore Yoga flows →
          </button>
        </div>

        <div
          style={{ animationDelay: "0.4s" }}
          className="bloom-pearl-card pearl-sheen animate-spring-bottom hover-scale -mt-3 rounded-2xl p-4 pt-6"
        >
          <span className="rounded-full bg-blush px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-hotpink">Post-workout nutrition ↑</span>
          <h3 className="mt-2 text-sm font-semibold text-rose">{mealName}</h3>
          <p className="mt-0.5 text-xs font-light text-rose/60">{mealTime} · {mealMacro}</p>
          <button
            type="button"
            onClick={() => onEnter("/app/tools/diet")}
            className="mt-3 text-xs font-medium text-hotpink underline-offset-2 hover:underline"
          >
            See post-workout meals →
          </button>
        </div>

        <p className="mt-5 animate-fade-in text-center text-xs font-light italic text-rose/60" style={{ animationDelay: "0.8s" }}>
          Bloomzein connects these three so you never have to.
        </p>
      </div>

      <EnterBloomzeinFooter visible={ctaVisible} onNext={onNext} />
    </div>
  );
}

// CHOICE 4 — "Sync everything" → cycle anchor + every tool, gently overlapping.
function Screen4Sync({ phase, day, onNext, onEnter }: Screen4Props) {
  const meta = onboardingPhaseMeta(phase);
  const yoga = YOGA_CONTENT[phase];
  const movement = MOVEMENT_CONTENT[phase];
  const diet = DIET_CONTENT[phase];
  const [yogaName] = splitPipe(yoga.session);
  const [workoutName] = splitPipe(movement.workout);
  const [mealName] = splitPipe(diet.breakfast);
  const [gratitude, setGratitude] = useState("");
  const ctaVisible = useCtaDelay(6);

  return (
    <div
      className="animate-ambient-tint flex h-full flex-col"
      style={{ backgroundImage: "linear-gradient(135deg, oklch(0.97 0.03 350 / 0.7), oklch(0.96 0.05 280 / 0.5), oklch(0.97 0.04 30 / 0.6))" }}
    >
      <div className="shrink-0 px-6 pt-6">
        <ProgressDots active={4} />
        <PhaseBanner phase={phase} day={day} />
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-4">
        <AnimatedWords text="Everything in sync with you." className="font-script mt-4 block text-2xl text-hotpink" />

        {/* Cycle anchor — never moves, soft continuous glow */}
        <div className={`animate-spring-center animate-anchor-glow mt-4 rounded-3xl p-5 ${meta.color}`}>
          <span className="rounded-full bg-white/50 px-2.5 py-0.5 text-[11px] font-medium">{PHASE_COPY[phase].label}</span>
          {day && <p className="mt-2 text-sm font-semibold">Day {day} of your cycle</p>}
          <p className="mt-1 text-sm font-light">{PHASE_COPY[phase].description}</p>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2.5">
          <div style={{ animationDelay: "0.2s" }} className="bloom-pearl-card pearl-sheen animate-spring-left hover-scale rounded-2xl p-3 active:scale-95">
            <span className="rounded-full bg-blush px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-hotpink">Yoga</span>
            <h3 className="mt-1.5 text-xs font-semibold text-rose leading-snug">{yogaName}</h3>
            <button type="button" onClick={() => onEnter("/app/tools/yoga")} className="mt-2 text-[11px] font-medium text-hotpink underline-offset-2 hover:underline">
              Explore →
            </button>
          </div>

          <div style={{ animationDelay: "0.4s" }} className="bloom-pearl-card pearl-sheen animate-spring-right hover-scale rounded-2xl p-3 active:scale-95">
            <span className="rounded-full bg-blush px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-hotpink">Workout</span>
            <h3 className="mt-1.5 text-xs font-semibold text-rose leading-snug">{workoutName}</h3>
            <div className="mt-1.5 flex gap-1">
              {[0, 1, 2, 3, 4].map((i) => (
                <span key={i} className={`h-1.5 w-1.5 rounded-full ${i < 3 ? "bg-hotpink" : "bg-petal"}`} />
              ))}
            </div>
            <button type="button" onClick={() => onEnter("/app/tools/workout")} className="mt-2 text-[11px] font-medium text-hotpink underline-offset-2 hover:underline">
              Explore →
            </button>
          </div>

          <div style={{ animationDelay: "0.6s" }} className="bloom-pearl-card pearl-sheen animate-spring-bottom hover-scale rounded-2xl p-3 active:scale-95">
            <span className="rounded-full bg-blush px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-hotpink">Meals</span>
            <div className="mt-1.5 h-12 w-full animate-bloom-shimmer rounded-xl bg-petal/40" />
            <h3 className="mt-1.5 text-xs font-semibold text-rose leading-snug">{mealName}</h3>
            <button type="button" onClick={() => onEnter("/app/tools/diet")} className="mt-2 text-[11px] font-medium text-hotpink underline-offset-2 hover:underline">
              Explore →
            </button>
          </div>

          <div style={{ animationDelay: "0.8s" }} className="bloom-pearl-card pearl-sheen animate-spring-bottom hover-scale rounded-2xl p-3 active:scale-95">
            <span className="rounded-full bg-blush px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-hotpink">Gratitude</span>
            <p className="mt-1.5 text-xs font-light text-rose/70 leading-snug">{GRATITUDE_PROMPTS[phase]}</p>
            <textarea
              value={gratitude}
              onChange={(e) => setGratitude(e.target.value)}
              onBlur={() => saveOnboardingGratitude(gratitude)}
              placeholder="Write a few words…"
              rows={2}
              className="mt-2 w-full resize-none rounded-lg border border-petal/60 bg-white/70 p-1.5 text-[11px] text-rose placeholder:text-rose/40 focus:outline-none focus:ring-1 focus:ring-hotpink"
            />
            <button type="button" onClick={() => onEnter("/app/tools/diary")} className="mt-2 text-[11px] font-medium text-hotpink underline-offset-2 hover:underline">
              Open your Bloom Diary →
            </button>
          </div>
        </div>

        <div style={{ animationDelay: "1s" }} className="bloom-pearl-card pearl-sheen animate-spring-bottom hover-scale mt-2.5 rounded-2xl p-4 active:scale-95">
          <span className="rounded-full bg-blush px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-hotpink">Your week</span>
          <div className="mt-2 grid grid-cols-7 gap-1">
            {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => (
              <span key={i} className={`grid h-6 place-items-center rounded-full text-[10px] font-medium ${i === 0 ? meta.color : "bg-petal/40 text-rose/60"}`}>
                {d}
              </span>
            ))}
          </div>
          <p className="mt-2 text-xs font-light text-rose/70">{WEEKLY_SUMMARY[phase]}</p>
          <button
            type="button"
            onClick={() => onEnter("/app/tools/cycle")}
            className="animate-cta-pulse mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded-2xl bg-hotpink px-6 py-2.5 text-sm font-semibold text-white active:scale-95"
          >
            Validate my full week
          </button>
        </div>
      </div>

      <EnterBloomzeinFooter visible={ctaVisible} onNext={onNext} />
    </div>
  );
}

// Dispatches to the goal-matched reveal experience selected on Screen 3.
function Screen4({
  goal,
  phase,
  cycleData,
  onNext,
  onEnter,
  profile,
}: {
  goal: GoalKey | null;
  phase: OnboardingPhase | null;
  cycleData: OnboardingCycleData;
  onNext: () => void;
  onEnter: (href: string) => void;
  profile: { weight: number | null; weight_unit: "kg" | "lbs" } | null;
}) {
  const resolvedPhase = phase ?? "follicular";
  const day = cycleData.lastPeriod ? calcPhasePreview(cycleData.lastPeriod, cycleData.cycleLength, cycleData.periodDuration).day : null;

  switch (goal) {
    case "yoga":
      return <Screen4Yoga phase={resolvedPhase} day={day} onNext={onNext} onEnter={onEnter} />;
    case "diet":
      return <Screen4Diet phase={resolvedPhase} day={day} onNext={onNext} onEnter={onEnter} profile={profile} />;
    case "workout":
      return <Screen4Movement phase={resolvedPhase} day={day} onNext={onNext} onEnter={onEnter} />;
    default:
      return <Screen4Sync phase={resolvedPhase} day={day} onNext={onNext} onEnter={onEnter} />;
  }
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
  const { profile, updateProfile } = useAuth();
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
          {screen === 4 && (
            <Screen4
              goal={goal}
              phase={phase}
              cycleData={cycleData}
              onNext={() => goTo(5, "forward")}
              onEnter={finish}
              profile={profile ? { weight: profile.weight, weight_unit: profile.weight_unit } : null}
            />
          )}
        </div>
      </OnboardingSheet>
    </>
  );
}
