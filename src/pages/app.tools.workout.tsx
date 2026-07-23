import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  ArrowLeft, Play, Pause, RotateCcw, SkipForward, SkipBack, X, Trophy, CalendarHeart,
  Share2, BookHeart, Volume2, VolumeX, Sparkles, ChevronRight, ChevronLeft, ChevronUp, Check, Wand2,
  Dumbbell, Clock, Timer, Flame, ShieldCheck, Gauge, ChevronDown, Utensils, Pencil, Trash2,
  CircleCheck, Circle, Heart, Lightbulb, Target, Activity,
} from "lucide-react";
import { type CyclePhase, PHASE_LABEL, readCyclePhase, hasCycleSettings } from "@/components/bloom/cyclePhase";
import { CyclePhasePill } from "@/components/bloom/CyclePhasePill";
import { readLaunch, LAUNCH_WORKOUT_KEY } from "@/components/bloom/phasePlan";
import { readFuelInPlan, writeFuelInPlan, readWorkoutStreak, readWorkoutSessionCount, resetToolState, readWorkoutPlanDays, readMovementLevel } from "@/lib/crossToolData";
import { isGuided } from "@/lib/guidedSetup";
import { useGuided, guidedNudge, GuidedFinishBar, GuidedFocusHero } from "@/components/bloom/GuidedFocus";
import { isPremium, openPaywall } from "@/lib/entitlements";
import { SpotlightCoach } from "@/components/bloom/SpotlightCoach";
import { LevelStreak } from "@/components/bloom/LevelStreak";
import { BloomFlower } from "@/components/bloom/BloomFlower";
import { flushCloudSync } from "@/lib/cloudSync";
import { todayISO, isYesterday } from "@/lib/localDate";
import { readDietProfile } from "@/components/bloom/recipes/data";
import { FuelCard, workoutIntensity, normalizePhase, type Intensity } from "@/components/bloom/trainingFuel";
import { PickerField } from "@/components/bloom/PickerField";
import { WorkoutOnboarding, type WorkoutTourTab } from "@/components/bloom/WorkoutOnboarding";
import {
  ZONES, WORKOUT_INTENTIONS, ENERGY_OPTIONS, WEEKLY_CHALLENGES, BADGES, BODY_TYPES,
  PHASE_OPTIMAL, HERO_IMAGES, ZONE_EXERCISES, buildSession, EXERCISES,
  type Zone, type WorkoutIntention, type Level, type Equipment, type Goal,
  type EnergyLevel, type WorkoutProfile, type WorkoutSession, type BodyType, type Exercise,
  type SessionStep, WORKOUT_REST_AUDIO, WORKOUT_SWITCH_AUDIO, pushMove,
} from "@/components/bloom/workout/data";
import {
  PROGRAMS, getProgram, computeWeekSession, weekMeta, sessionVolume,
  type Program, type ProgramSession,
} from "@/components/bloom/workout/programs";
import { getCoaching } from "@/components/bloom/workout/coaching";

// ===================== STORAGE =====================

const ONBOARD_KEY = "bloom:workout-onboarded";
const TOUR_KEY = "bloom:workout-tour-done";

/** Reset the Workout tool to its first-time state (with a confirm). Shared by
 *  the hero and the My-Plan controls. */
async function resetWorkoutTool() {
  if (window.confirm("Reset the Workout tool to a fresh start? This clears your plan, sessions and progress here so you can see the first-time experience.")) {
    resetToolState("workout");
    await flushCloudSync(); // push the deletions before reload, else cloud restores them
    window.location.reload();
  }
}
const PROFILE_KEY = "bloom:workout-profile";
const ENERGY_KEY = "bloom:workout-energy";
const STREAK_KEY = "bloom:workout-streak";
const BADGES_KEY = "bloom:workout-badges";
export const PROGRAM_KEY = "bloom:workout-program";
export const PROGRAM_PHASE_KEY = "bloom:workout-program-phase";
export const WORKOUT_PLAN_GOAL_KEY = "bloom:workout-plan-goal";
const PROGRAM_BANNER_KEY = "bloom:workout-program-banner-seen";
const CHALLENGE_KEY = "bloom:workout-challenge";
const SOUND_KEY = "bloom:workout-sound";  // master: all sound on/off
const VOICE_KEY = "bloom:workout-voice";  // spoken move cues on/off
const MUSIC_KEY = "bloom:workout-music";  // background track index (into WORKOUT_MUSIC)
const MUSIC_LABELS = ["Power Session", "Aetherium Pulse", "Sands of Time", "Sleek Alignment"];
export const WORKOUT_LOG_KEY = "bloom:workout-history";

export const DEFAULT_WORKOUT_PROFILE: WorkoutProfile = { level: "Beginner", goal: "energy", equipment: "none", daysPerWeek: 3 };
const DEFAULT_PROFILE = DEFAULT_WORKOUT_PROFILE;

export interface HistoryEntry {
  date: string;
  zone: Zone;
  intention: WorkoutIntention;
  phase: CyclePhase;
  durationMin: number;
  calories: number;
  sessionName: string;
}

interface DayPlan { zone: Zone; intention: WorkoutIntention; durationMin: 10 | 20 | 30; }

function useLS<T>(key: string, initial: T): [T, (v: T | ((p: T) => T)) => void] {
  const [value, setValue] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(key);
      return raw ? (JSON.parse(raw) as T) : initial;
    } catch {
      return initial;
    }
  });
  useEffect(() => {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
  }, [key, value]);
  return [value, setValue];
}


// ===================== SOUND LAYER =====================
// A single shared AudioContext drives the timer's rhythm (a soft tick every
// second, a louder countdown in the final 3s, a clear tone when a move ends).
// Real spoken cues come from the per-move mp3s (no browser speech synthesis).

let _actx: AudioContext | null = null;
function audioCtx(): AudioContext | null {
  try {
    if (!_actx) { const Ctx = (window.AudioContext || (window as any).webkitAudioContext); _actx = new Ctx(); }
    if (_actx.state === "suspended") _actx.resume().catch(() => {});
    return _actx;
  } catch { return null; }
}
function tone(freq: number, peak: number, dur: number, type: OscillatorType = "sine") {
  const ctx = audioCtx(); if (!ctx) return;
  try {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.value = freq;
    const t = ctx.currentTime;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(ctx.destination);
    o.start(t); o.stop(t + dur + 0.05);
  } catch {}
}
// Timer rhythm — the tone grows louder & higher as a move nears its end, so the
// user feels the rhythm and knows the finish is coming.
type Tick = "soft" | "count" | "end" | "restEnd";
function playTick(level: Tick) {
  if (level === "soft") tone(440, 0.05, 0.06);
  else if (level === "count") tone(760, 0.22, 0.15);
  else if (level === "end") tone(940, 0.32, 0.45);
  else if (level === "restEnd") [523.25, 659.25, 783.99].forEach((f, i) => setTimeout(() => tone(f, 0.16, 0.8), i * 80));
}

// Background music — royalty-free loops; missing files fail silently. One loop
// plays for the WHOLE session (never swapped or restarted), at a CONSTANT
// volume that is never ducked, so the music stays coherent and always heard.
const WORKOUT_MUSIC = [
  "/audio/workout-music-1.mp3", // Power Session Warm-Up
  "/audio/workout-music-2.mp3", // Aetherium Pulse
  "/audio/workout-music-3.mp3", // Sands of Time
  "/audio/workout-music-4.mp3", // Sleek Alignment
];
const MUSIC_VOL = 0.44;  // steady bed, always audible
const CUE_VOL = 0.32;    // spoken cue sits well UNDER the music (quieter for recording)

// Play a spoken cue mp3 (per-move / rest / switch) UNDER the music. The music is
// NOT ducked — it keeps its steady volume — so it stays coherent all session.
function playCue(src: string | undefined, cueEl: HTMLAudioElement | null) {
  if (!cueEl || !src) return;
  try {
    cueEl.src = src;
    cueEl.currentTime = 0;
    cueEl.volume = CUE_VOL;
    cueEl.play().catch(() => {});
  } catch {}
}

// ===================== HELPERS =====================

// Real energy expenditure: MET × 3.5 × bodyweight(kg) / 200 = kcal/min.
// MET values follow the Compendium of Physical Activities for each intention.
const MET_BY_INTENTION: Record<WorkoutIntention, number> = {
  tonify: 5.0,      // general resistance / toning circuit
  strengthen: 6.0,  // vigorous resistance training
  stretch: 2.5,     // stretching / mobility
  recover: 2.3,     // light restorative movement
};

/** kcal burned for a session, scaled by the user's real bodyweight. */
function sessionCalories(intention: WorkoutIntention, elapsedSec: number): number {
  const weight = readDietProfile().weight || 65;
  const kcalPerMin = (MET_BY_INTENTION[intention] * 3.5 * weight) / 200;
  return Math.round((elapsedSec / 60) * kcalPerMin);
}

/** Expected kcal for a PLANNED session of `durationMin` — same MET engine as the
 *  live burn, so the plan estimate and the logged burn stay consistent. */
function plannedCalories(intention: WorkoutIntention, durationMin: number): number {
  return sessionCalories(intention, durationMin * 60);
}

/** A planned program session only carries a title/focus → intensity; map that to
 *  the nearest MET intention so we can still estimate its burn. */
const MET_INTENTION_FOR_INTENSITY: Record<Intensity, WorkoutIntention> = {
  strong: "strengthen", moderate: "tonify", gentle: "stretch",
};

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const ACTIVE_DAY_PATTERNS: Record<2 | 3 | 4 | 5, string[]> = {
  2: ["Mon", "Thu"],
  3: ["Mon", "Wed", "Fri"],
  4: ["Mon", "Tue", "Thu", "Fri"],
  5: ["Mon", "Tue", "Wed", "Thu", "Fri"],
};

function durationForLevel(level: Level): 10 | 20 | 30 {
  return level === "Beginner" ? 10 : level === "Intermediate" ? 20 : 30;
}

const INTENTION_ORDER: WorkoutIntention[] = ["tonify", "strengthen", "stretch", "recover"];

// Interleaves lower / core / full-body / upper so consecutive sessions never
// hammer the same area — the balanced split premium apps use.
const SMART_ZONE_CYCLE: Zone[] = ["glutes", "core", "full-body", "legs", "arms", "back"];

const mod = (n: number, m: number) => ((n % m) + m) % m;

// A well-spread set of distinct zones for the week, rotated by `seed`.
function buildZoneWeek(n: number, seed: number): Zone[] {
  const start = mod(seed, SMART_ZONE_CYCLE.length);
  return Array.from({ length: n }, (_, i) => SMART_ZONE_CYCLE[(start + i) % SMART_ZONE_CYCLE.length]);
}

// A phase-aware, goal-biased, varied intention for each active day. Period &
// luteal weeks always get a restorative day so the plan honours the body.
function buildIntentionWeek(phase: CyclePhase, goal: Goal, n: number, seed: number): WorkoutIntention[] {
  const phaseFirst = INTENTION_ORDER.filter((i) => PHASE_OPTIMAL[i].includes(phase));
  const goalPick: WorkoutIntention = goal === "strengthen" ? "strengthen" : goal === "flexibility" ? "stretch" : "tonify";
  const pool = phaseFirst.length ? phaseFirst : INTENTION_ORDER;
  const ordered = pool.includes(goalPick) ? [goalPick, ...pool.filter((p) => p !== goalPick)] : pool;
  const out = Array.from({ length: n }, (_, i) => ordered[mod(i + seed, ordered.length)]);
  if ((phase === "period" || phase === "luteal") && n >= 2 && !out.includes("recover")) {
    out[n - 1] = "recover";
  }
  return out;
}

export function generateWeeklyPlan(profile: WorkoutProfile, phase: CyclePhase, seed = 0): Record<string, DayPlan | null> {
  const activeDays = ACTIVE_DAY_PATTERNS[profile.daysPerWeek];
  const durationMin = durationForLevel(profile.level);
  const zones = buildZoneWeek(activeDays.length, seed);
  const intentions = buildIntentionWeek(phase, profile.goal, activeDays.length, seed);
  const plan: Record<string, DayPlan | null> = {};
  let k = 0;
  for (const d of DAYS) {
    if (activeDays.includes(d)) {
      plan[d] = { zone: zones[k], intention: intentions[k], durationMin };
      k++;
    } else {
      plan[d] = null;
    }
  }
  return plan;
}

// ===================== EXERCISE PHOTO (with graceful placeholder) =====================

function ExercisePhoto({ exercise, zone, className }: { exercise: Exercise; zone?: Zone; className: string }) {
  const [broken, setBroken] = useState(false);
  const fallbackImage = zone ? ZONES.find((z) => z.key === zone)?.image : undefined;

  if (broken) {
    if (fallbackImage) {
      return <img src={fallbackImage} alt={exercise.name} className={className} />;
    }
    return (
      <div className={`${className} grid place-items-center bg-gradient-to-br from-blush/70 to-petal/50`}>
        <Sparkles className="h-10 w-10 text-hotpink/50" strokeWidth={1.5} />
      </div>
    );
  }
  return (
    <img
      src={exercise.image}
      alt={exercise.name}
      className={className}
      onError={() => setBroken(true)}
    />
  );
}

// ===================== HERO BANNER =====================

function HeroBanner({ src, title, subtitle }: { src: string; title: string; subtitle?: string }) {
  const [broken, setBroken] = useState(false);
  return (
    <div className="relative w-full aspect-[16/9] rounded-3xl overflow-hidden border border-petal/60 shadow-md shadow-rose/10 mb-4">
      {broken ? (
        <div className="absolute inset-0 bg-gradient-to-br from-blush/80 to-petal/60 grid place-items-center">
          <Sparkles className="h-10 w-10 text-hotpink/40" strokeWidth={1.5} />
        </div>
      ) : (
        <img src={src} alt={title} className="absolute inset-0 h-full w-full object-cover object-top" onError={() => setBroken(true)} />
      )}
      <div className="absolute inset-0 bg-gradient-to-r from-hotpink/65 via-hotpink/20 to-transparent" />
      <div className="absolute top-0 left-0 p-3 sm:p-5">
        <h2 className="font-script text-xl sm:text-3xl lg:text-4xl text-white leading-tight drop-shadow-md">{title}</h2>
        {subtitle && <p className="mt-1 text-[10px] sm:text-xs italic leading-snug text-white/90 max-w-[7rem] sm:max-w-[9rem] drop-shadow">{subtitle}</p>}
      </div>
    </div>
  );
}

// ===================== HERO HEADER (Workout Programs + tabs, on image) =====================

const SECTION_META: Record<"discover" | "programs" | "program" | "library", { title: string; subtitle: string }> = {
  program: { title: "My Plan", subtitle: "Your week, day by day." },
  discover: { title: "Discover", subtitle: "A one-off session for today." },
  programs: { title: "Programs", subtitle: "Structured multi-week journeys." },
  library: { title: "Library", subtitle: "Every move, explained." },
};

type WorkoutTab = "discover" | "programs" | "program" | "library";

const WORKOUT_PHASE_META: Record<Exclude<CyclePhase, "any">, { emoji: string; label: string }> = {
  period: { emoji: "🌙", label: "Menstrual" },
  follicular: { emoji: "🌱", label: "Follicular" },
  fertile: { emoji: "🌷", label: "Fertile" },
  ovulation: { emoji: "🌸", label: "Ovulatory" },
  luteal: { emoji: "🍂", label: "Luteal" },
};

/** Hero pill: names the cycle phase and shows whether My Plan was built for the
 *  current phase (bloom:workout-program-phase); tapping regenerates the week for
 *  the phase (or opens cycle setup if the cycle isn't tracked yet). */
function WorkoutPhaseSyncPill({ variant = "pill" }: { variant?: "pill" | "tile" }) {
  const [, force] = useState(0);
  useEffect(() => {
    const r = () => force((t) => t + 1);
    window.addEventListener("storage", r);
    window.addEventListener("bloom:workout-updated", r);
    return () => { window.removeEventListener("storage", r); window.removeEventListener("bloom:workout-updated", r); };
  }, []);
  const phase = readCyclePhase();
  const known = hasCycleSettings() && phase != null && phase !== "any";
  const meta = phase && phase !== "any" ? WORKOUT_PHASE_META[phase] : { emoji: "🌸", label: "" };
  let program: unknown = null, programPhase: CyclePhase | null = null;
  try { const v = localStorage.getItem(PROGRAM_KEY); program = v && v !== "null" ? JSON.parse(v) : null; } catch { program = null; }
  try { const v = localStorage.getItem(PROGRAM_PHASE_KEY); programPhase = v ? JSON.parse(v) : null; } catch { programPhase = null; }
  const synced = known && !!program && programPhase === phase;
  const onSync = () => {
    if (!known) { window.location.href = "/app/calendar"; return; }
    let profile = DEFAULT_PROFILE;
    try { const v = localStorage.getItem(PROFILE_KEY); if (v) profile = JSON.parse(v); } catch { profile = DEFAULT_PROFILE; }
    const plan = generateWeeklyPlan(profile, phase as CyclePhase, Math.floor(Math.random() * 10000));
    try {
      localStorage.setItem(PROGRAM_KEY, JSON.stringify(plan));
      localStorage.setItem(PROGRAM_PHASE_KEY, JSON.stringify(phase));
      window.dispatchEvent(new Event("storage"));
      window.dispatchEvent(new Event("bloom:workout-updated"));
    } catch {}
    force((t) => t + 1);
  };
  const tTitle = !known ? "Set up your cycle to sync your plan" : synced ? `In sync with your ${meta.label} phase ✿` : `Tap to sync your week to your ${meta.label} phase`;
  if (variant === "tile") {
    return (
      <button onClick={onSync} disabled={synced} title={tTitle}
        className={["rounded-2xl border border-petal/60 bg-white/95 p-2.5 flex flex-col items-center justify-center text-center gap-1 transition", synced ? "" : "hover:border-hotpink/40 active:scale-95"].join(" ")}>
        <span className={["grid h-8 w-8 place-items-center rounded-full", synced ? "bg-blush text-hotpink" : "bg-rose/10 text-rose/45"].join(" ")}>
          {synced ? <CircleCheck className="h-4 w-4" strokeWidth={2.4} /> : <Circle className="h-4 w-4" strokeWidth={2} />}
        </span>
        <span className="text-[8.5px] font-bold uppercase tracking-wider text-rose/55 leading-none">Sync</span>
        <span className={["text-[12.5px] font-black leading-tight", synced ? "text-hotpink" : "text-rose/45"].join(" ")}>{synced ? "In sync" : "Sync now"}</span>
      </button>
    );
  }
  return (
    <button
      onClick={onSync}
      disabled={synced}
      title={tTitle}
      className={["inline-flex shrink-0 items-center gap-1 rounded-full border border-petal/60 bg-white/85 pl-1.5 pr-2 py-1 text-[11px] font-bold leading-none transition",
        synced ? "text-hotpink" : "text-rose/45 hover:text-hotpink active:scale-95"].join(" ")}
    >
      {synced ? <CircleCheck className="h-3.5 w-3.5" strokeWidth={2.4} /> : <Circle className="h-3.5 w-3.5" strokeWidth={2} />}
      {synced ? "In sync" : "Sync"}
    </button>
  );
}

function HeroHeader({
  src,
  tab,
  onPickTab,
  sectionTitle,
  sectionSubtitle,
  onGuide,
  onReset,
}: {
  src: string;
  tab: WorkoutTab;
  onPickTab: (t: WorkoutTab) => void;
  sectionTitle: string;
  sectionSubtitle: string;
  onGuide?: () => void;
  onReset?: () => void;
}) {
  const [broken, setBroken] = useState(false);
  return (
    <div className="relative isolate min-h-[118px] sm:min-h-[168px] -mt-1 sm:-mt-5 lg:-mt-6 mb-2 animate-card-pop-in">
      {/* base pink wash */}
      <div aria-hidden className="pointer-events-none absolute left-1/2 -translate-x-1/2 w-screen -top-8 -z-20 h-[500px] bg-gradient-to-b from-[#FFD3E8] via-[#FFE4F1] to-transparent" />
      {/* photo — dissolves toward the bottom into the page */}
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 -translate-x-1/2 w-screen -top-8 -z-10 h-[300px] overflow-hidden"
        style={{ WebkitMaskImage: "linear-gradient(to bottom, #000 0%, #000 28%, transparent 80%)", maskImage: "linear-gradient(to bottom, #000 0%, #000 28%, transparent 80%)" }}
      >
        {broken ? (
          <div className="absolute inset-0 bg-gradient-to-br from-blush/80 to-petal/60 grid place-items-center">
            <Sparkles className="h-10 w-10 text-hotpink/40" strokeWidth={1.5} />
          </div>
        ) : (
          <img src={src} alt="" className="animate-hero-breathe h-full w-full object-cover object-[70%_18%]" onError={() => setBroken(true)} />
        )}
        <div className="absolute inset-0 bg-gradient-to-r from-[#FFE4F1] via-[#FFE4F1]/55 to-transparent" />
      </div>

      <div className="absolute top-1 right-0 z-[2] flex items-center gap-1.5">
        {onReset && (
          <button
            onClick={onReset}
            aria-label="Reset tool"
            title="Reset — preview the first-time experience"
            className="inline-flex items-center gap-1 rounded-full bg-white/70 backdrop-blur border border-petal/60 px-2.5 py-1.5 text-[11px] sm:text-xs text-hotpink font-semibold transition hover:bg-white active:scale-95 shadow-sm shadow-hotpink/10"
          >
            <RotateCcw className="h-3 w-3" /> Reset
          </button>
        )}
        {onGuide && (
          <button
            onClick={onGuide}
            className="inline-flex items-center gap-1 rounded-full bg-white/70 backdrop-blur border border-petal/60 px-3 py-1.5 text-[11px] sm:text-xs text-hotpink font-semibold transition hover:bg-white active:scale-95 shadow-sm shadow-hotpink/10"
          >
            <Sparkles className="h-3 w-3" /> Guide
          </button>
        )}
      </div>
      <div className="relative z-[1] flex flex-col gap-3 sm:gap-4 pt-1 pb-1">
        <div>
          <h2 className="font-script text-3xl sm:text-5xl lg:text-6xl text-hotpink leading-none drop-shadow-[0_2px_6px_oklch(1_0_0/0.55)]">{sectionTitle}</h2>
          <p className="mt-0.5 font-script text-lg sm:text-2xl leading-tight text-rose/90">{sectionSubtitle}</p>
          <CyclePhasePill className="mt-1.5" />
        </div>
        <div className="flex">
          <div className="inline-flex flex-wrap rounded-full bg-white/70 backdrop-blur border border-petal/60 p-0.5 sm:p-1 shadow-sm shadow-hotpink/10">
            {(["program", "discover", "programs", "library"] as const).map((t) => (
              <button
                key={t}
                data-tour={`wk-tab-${t}`}
                onClick={() => onPickTab(t)}
                className={[
                  "rounded-full px-2.5 sm:px-4 py-1 sm:py-1.5 text-xs sm:text-sm font-bold transition",
                  tab === t ? "bg-hotpink text-white shadow-md shadow-hotpink/30" : "text-rose hover:text-hotpink",
                ].join(" ")}
              >
                {t === "program" ? "My Plan" : t === "discover" ? "Discover" : t === "programs" ? "Programs" : "Library"}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ===================== CIRCULAR TIMER =====================

function CircularTimer({ totalSec, remainingSec, size = 96, rep, repTotal }: {
  totalSec: number; remainingSec: number; size?: number;
  /** When set, the circle shows the live REP count (big) over `repTotal`, with
   *  the ring tracking time — so the rep counter lives inside the circle. */
  rep?: number; repTotal?: number;
}) {
  const strokeWidth = Math.max(6, Math.round(size / 14));
  const r = size / 2 - strokeWidth;
  const c = 2 * Math.PI * r;
  const progress = totalSec > 0 ? remainingSec / totalSec : 0;
  const offset = c * (1 - progress);
  const showReps = rep != null && repTotal != null && repTotal > 0;
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} stroke="oklch(0.92 0.04 350)" strokeWidth={strokeWidth} fill="none" />
        <circle
          cx={size / 2} cy={size / 2} r={r} stroke="oklch(0.65 0.24 350)" strokeWidth={strokeWidth} fill="none"
          strokeDasharray={c} strokeDashoffset={offset} strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 1s linear" }}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center leading-none">
        {showReps ? (
          <div className="text-center">
            {/* keyed by rep so it POPS on every beat */}
            <span key={rep} className="block font-black text-hotpink tabular-nums animate-wk-rep-pop" style={{ fontSize: size * 0.34 }}>{rep}</span>
            <span className="block font-bold text-rose/55 tabular-nums" style={{ fontSize: size * 0.13, marginTop: size * 0.01 }}>of {repTotal} reps</span>
          </div>
        ) : (
          <span className="font-bold text-hotpink" style={{ fontSize: size * 0.32 }}>{remainingSec}</span>
        )}
      </div>
    </div>
  );
}

// ===================== PAGE =====================

type View =
  | { kind: "discover" }
  | { kind: "programs" }
  | { kind: "program" }
  | { kind: "library" }
  | { kind: "best-shape" }
  | { kind: "program-detail"; programId: string }
  | { kind: "program-session"; programId: string; week: number; sessionIndex: number; returnTo?: "detail" | "plan" }
  | { kind: "session-start"; session: WorkoutSession; programRef?: ProgramRef; returnTo?: WorkoutTab }
  | { kind: "session-active"; session: WorkoutSession; programRef?: ProgramRef; returnTo?: WorkoutTab }
  | { kind: "session-end"; session: WorkoutSession; elapsedSec: number; programRef?: ProgramRef; returnTo?: WorkoutTab };

type ProgramRef = { programId: string; week: number; sessionIndex: number };

export default function WorkoutPage() {
  const [onboarded, setOnboarded] = useLS<boolean>(ONBOARD_KEY, false);
  const [profile, setProfile] = useLS<WorkoutProfile>(PROFILE_KEY, DEFAULT_PROFILE);
  const [view, setView] = useState<View>({ kind: "program" });
  const [tab, setTab] = useState<WorkoutTab>("program");
  // Guided-setup focus mode: narrow hero + her week + one "Finish on Today" action.
  const guided = useGuided();
  const cyclePhaseNow = readCyclePhase();
  const guidedPhaseLabel = cyclePhaseNow && cyclePhaseNow !== "any" ? PHASE_LABEL[cyclePhaseNow] : undefined;
  // Guided sparkle tour — auto on first visit (after profile setup), replayable.
  const [tourDone, setTourDone] = useLS<boolean>(TOUR_KEY, false);
  const [showTour, setShowTour] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => { setHydrated(true); }, []);
  const goTourTab = (t: WorkoutTourTab) => { setTab(t); setView({ kind: t }); };

  // Guided setup: any plan commit dispatches "bloom:workout-updated"; the first
  // time a plan exists while she's in the guided flow, celebrate and hand back.
  const [guidedDone, setGuidedDone] = useState(false);
  const guidedShownRef = useRef(false);
  useEffect(() => {
    const onUpdate = () => {
      if (guidedShownRef.current) return;
      if (isGuided() && readWorkoutPlanDays().length > 0) { guidedShownRef.current = true; setGuidedDone(true); }
    };
    window.addEventListener("bloom:workout-updated", onUpdate);
    return () => window.removeEventListener("bloom:workout-updated", onUpdate);
  }, []);

  // While guided, keep her on My Plan — never the discover/programs/library browser.
  useEffect(() => {
    if (guided && (view.kind === "discover" || view.kind === "programs" || view.kind === "library")) {
      setTab("program"); setView({ kind: "program" });
    }
  }, [guided, view.kind]);

  useEffect(() => {
    // Deep-link from Today / Cycle: build the prescribed session and open its
    // preview straight away.
    const launch = readLaunch<{ zone: string; intention: string }>(LAUNCH_WORKOUT_KEY);
    if (launch) {
      const s = buildSession(launch.zone as Zone, launch.intention as WorkoutIntention, durationForLevel(profile.level), profile.level, readCyclePhase() ?? "any", profile.equipment);
      setView({ kind: "session-start", session: s });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!onboarded) {
    return (
      <div className="relative animate-fade-in">
        <SetupProfile
          initial={profile}
          onDone={(p) => {
            setProfile(p);
            setOnboarded(true);
            // After the questions she lands on her (empty) plan to CHOOSE a program
            // or generate a week herself — we never auto-pick a plan for her. The
            // celebration then appears only once she's committed her own choice.
          }}
        />
      </div>
    );
  }

  if (view.kind === "session-start") {
    return <SessionStart session={view.session} onStart={() => setView({ kind: "session-active", session: view.session, programRef: view.programRef, returnTo: view.returnTo })} onExit={() => setView({ kind: view.returnTo ?? tab })} />;
  }
  if (view.kind === "session-active") {
    return (
      <SessionActive
        session={view.session}
        onExit={() => setView({ kind: view.returnTo ?? tab })}
        onDone={(elapsedSec) => setView({ kind: "session-end", session: view.session, elapsedSec, programRef: view.programRef, returnTo: view.returnTo })}
      />
    );
  }
  if (view.kind === "session-end") {
    return (
      <SessionEnd
        session={view.session}
        elapsedSec={view.elapsedSec}
        programRef={view.programRef}
        onDone={() => setView({ kind: view.returnTo ?? tab })}
      />
    );
  }
  if (view.kind === "program-detail") {
    return (
      <ProgramDetail
        programId={view.programId}
        onBack={() => setView({ kind: "programs" })}
        onOpenSession={(week, sessionIndex) => setView({ kind: "program-session", programId: view.programId, week, sessionIndex, returnTo: "detail" })}
        onMakeMyPlan={() => { setTab("program"); setView({ kind: "program" }); }}
      />
    );
  }
  if (view.kind === "program-session") {
    const psView = view;
    return (
      <ProgramSessionView
        programId={psView.programId}
        week={psView.week}
        sessionIndex={psView.sessionIndex}
        onBack={() => psView.returnTo === "plan"
          ? setView({ kind: "program" })
          : setView({ kind: "program-detail", programId: psView.programId })}
        onStartTimer={(session) => setView({
          kind: "session-start",
          session,
          programRef: { programId: psView.programId, week: psView.week, sessionIndex: psView.sessionIndex },
          returnTo: psView.returnTo === "plan" ? "program" : "programs",
        })}
      />
    );
  }

  const tourVisible = showTour || (hydrated && onboarded && !tourDone);

  return (
    <div className="relative animate-fade-in">

      {guidedDone && (
        <SpotlightCoach
          targetId="workout-week-plan"
          step={4} total={5}
          title="Your workout week ✿"
          message="Your strength week, day by day. Tap any day to tweak it."
          extra={
            <p className="mt-3 text-[11.5px] font-semibold leading-snug text-rose/75">
              Do you want to set up your <b className="text-hotpink">yoga flow</b> now to balance your training?
            </p>
          }
          primaryLabel="Set up my yoga flow →"
          onPrimary={() => { window.location.href = "/app/tools/yoga?setup=1"; }}
          secondaryLabel="Stay & tweak my plan"
          onClose={() => setGuidedDone(false)}
        />
      )}

      {tourVisible && !isGuided() && (
        <WorkoutOnboarding
          onTab={goTourTab}
          onDone={() => { setTourDone(true); setShowTour(false); }}
        />
      )}

      {/* Redundant on phones (the bottom nav has "Tools"), and it left an empty
          band above the hero — show it only from tablet up. */}
      <a href="/app/tools" className="mb-3 hidden md:inline-flex items-center gap-1 text-sm text-rose hover:text-hotpink">
        <ArrowLeft className="h-4 w-4" /> All tools
      </a>

      {guided && (view.kind === "discover" || view.kind === "programs" || view.kind === "program" || view.kind === "library") && (
        <>
          <GuidedFocusHero label="Movement" phaseLabel={guidedPhaseLabel} image={HERO_IMAGES.program} />
          <GuidedFinishBar toolLabel="Movement" phaseLabel={guidedPhaseLabel} hint="Your strength week is set — tap any day to tweak it." className="mb-3" />
        </>
      )}

      {!guided && (view.kind === "discover" || view.kind === "programs" || view.kind === "program" || view.kind === "library") && (
        <HeroHeader
          src={view.kind === "programs" ? HERO_IMAGES.bestShape : HERO_IMAGES[view.kind]}
          tab={tab}
          onPickTab={(t) => { setTab(t); setView({ kind: t }); }}
          sectionTitle={SECTION_META[view.kind].title}
          sectionSubtitle={SECTION_META[view.kind].subtitle}
          onGuide={() => setShowTour(true)}
        />
      )}

      {view.kind === "discover" && (
        <Discover
          profile={profile}
          onStartSession={(session) => setView({ kind: "session-start", session })}
          onBestShape={() => setView({ kind: "best-shape" })}
          onGoToPlan={() => { setTab("program"); setView({ kind: "program" }); }}
        />
      )}
      {view.kind === "programs" && (
        <ProgramsView onOpen={(programId) => setView({ kind: "program-detail", programId })} />
      )}
      {view.kind === "best-shape" && (
        <BestShapeCalculator
          onBack={() => setView({ kind: "discover" })}
          onStartWith={(zone, intention) => {
            setView({ kind: "session-start", session: buildSession(zone, intention, durationForLevel(profile.level), profile.level, readCyclePhase() ?? "any", profile.equipment) });
          }}
        />
      )}
      {view.kind === "program" && (
        <MyProgram
          profile={profile}
          onStartSession={(session) => setView({ kind: "session-start", session })}
          onOpenProgramSession={(programId, week, sessionIndex) => setView({ kind: "program-session", programId, week, sessionIndex, returnTo: "plan" })}
          onBrowsePrograms={() => { if (guided) return guidedNudge(); setTab("programs"); setView({ kind: "programs" }); }}
        />
      )}
      {view.kind === "library" && <Library />}
    </div>
  );
}

// ===================== FLAGSHIP PROGRAMS =====================

const LEVEL_LABEL: Record<Level, string> = { Beginner: "Beginner", Intermediate: "Intermediate", Advanced: "Advanced" };
const EQUIP_LABEL: Record<Equipment, string> = { none: "No equipment", mat: "Mat", bands: "Bands", dumbbells: "Dumbbells", gym: "Full gym" };

// Track which (program · week · session) sessions the user has completed.
const PROGRAM_PROGRESS_KEY = "bloom:workout-program-progress";
type ProgramProgress = Record<string, string[]>; // programId -> ["w1s0", ...]

function sessionTag(week: number, sessionIndex: number) { return `w${week}s${sessionIndex}`; }

function loadProgramProgress(): ProgramProgress {
  try { return JSON.parse(localStorage.getItem(PROGRAM_PROGRESS_KEY) || "{}"); } catch { return {}; }
}

// The program the user has chosen as their active plan (drives "My Plan").
const ACTIVE_PROGRAM_KEY = "bloom:workout-active-program";
interface ActiveProgram { programId: string; week: number; startedISO: string; }

function loadActiveProgram(): ActiveProgram | null {
  try { return JSON.parse(localStorage.getItem(ACTIVE_PROGRAM_KEY) || "null"); } catch { return null; }
}
function saveActiveProgram(a: ActiveProgram | null) {
  try {
    if (a) localStorage.setItem(ACTIVE_PROGRAM_KEY, JSON.stringify(a));
    else localStorage.removeItem(ACTIVE_PROGRAM_KEY);
  } catch {}
}

// Estimate a work-timer duration for a rep prescription so program sessions can
// run in the same chrono player as Discover ("30s" → 30s, "10–12 reps" → ~30s,
// "Hold" → 40s).
function repsToSeconds(reps: string): number {
  const secMatch = reps.match(/(\d+)\s*s\b/);
  if (secMatch) return Math.min(90, Math.max(15, parseInt(secMatch[1], 10)));
  const n = parseInt(reps, 10);
  if (isNaN(n)) return 40;
  return Math.min(75, Math.max(25, Math.round((n * 3) / 5) * 5));
}

/** A numeric rep count for the pacer (0 = a timed hold like "30s"). */
function repsToCount(reps: string): number {
  if (/\d+\s*s\b/.test(reps)) return 0;      // time-based hold, not reps
  const n = parseInt(reps, 10);
  return isNaN(n) ? 0 : n;
}

// Convert a structured program session into a timed WorkoutSession (steps) so it
// plays in the SessionActive chrono with the same warm-up → work → cool-down feel.
function programToTimerSession(program: Program, week: number, sessionIndex: number): WorkoutSession {
  const ps = computeWeekSession(program, sessionIndex, week);
  const steps: SessionStep[] = [];
  for (const block of ps.blocks) {
    const kind = block.kind === "warmup" ? "warmup" : block.kind === "cooldown" ? "cooldown" : "work";
    const rounds = block.rounds ?? 1;
    for (let r = 0; r < rounds; r++) {
      for (const ex of block.exercises) {
        const exercise = EXERCISES[ex.slug];
        if (!exercise) continue;
        for (let setNum = 0; setNum < ex.sets; setNum++) {
          const labelParts: string[] = [];
          if (block.kind === "warmup") labelParts.push("Warm-up");
          else if (block.kind === "cooldown") labelParts.push("Cool-down");
          else {
            if (rounds > 1) labelParts.push(`Round ${r + 1}/${rounds}`);
            if (ex.sets > 1) labelParts.push(`Set ${setNum + 1}/${ex.sets}`);
            if (!labelParts.length) labelParts.push(block.label);
          }
          // Same rich step model as free sessions: audio-safe timing, a rep
          // count for the pacer, and one-sided moves split into side 1 → switch
          // → side 2 (so the rep counter + switch show in programs too).
          pushMove(steps, exercise, kind, repsToSeconds(ex.reps), ex.restSec, labelParts.join(" · "), ex.reps, repsToCount(ex.reps));
        }
      }
    }
  }
  const distinct: Exercise[] = [];
  const seen = new Set<string>();
  steps.forEach((s) => { if (s.kind === "work" && !seen.has(s.exercise.slug)) { seen.add(s.exercise.slug); distinct.push(s.exercise); } });

  return {
    id: `prog-${program.id}-w${week}-s${sessionIndex}`,
    zone: "full-body", intention: "strengthen",
    name: `${program.title} — ${ps.title}`,
    level: program.level, durationMin: ps.estMinutes,
    steps, rounds: 1, exercises: distinct,
    workSec: steps[0]?.workSec ?? 40, restSec: steps[0]?.restSec ?? 20,
    phaseOptimal: [], intensityNote: null,
    structureNote: ps.focus,
  };
}

function ProgramsView({ onOpen }: { onOpen: (programId: string) => void }) {
  const progress = loadProgramProgress();
  const activeId = loadActiveProgram()?.programId ?? null;
  const guided = useGuided();
  return (
    <div className="animate-fade-in">
      <p className="mb-3 text-sm text-rose/80">
        Real coaching, not random sessions — each program builds week over week with
        progressive overload, warm-ups, cool-downs and cycle-synced effort. ✿
      </p>
      <div className="space-y-3">
        {PROGRAMS.map((p, i) => {
          const done = (progress[p.id] ?? []).length;
          const total = p.weeks * p.template.length;
          const pct = total > 0 ? Math.round((done / total) * 100) : 0;
          const isActive = activeId === p.id;
          return (
            <button
              key={p.id}
              onClick={() => { if (guided) return guidedNudge(); onOpen(p.id); }}
              className={[
                "group w-full text-left flex items-stretch overflow-hidden rounded-3xl border bg-white/90 shadow-sm hover:shadow-xl hover:-translate-y-0.5 transition animate-scale-in",
                isActive ? "border-hotpink/60 ring-1 ring-hotpink/30" : "border-petal/60",
              ].join(" ")}
              style={{ animationDelay: `${i * 70}ms` }}
            >
              {/* Photo — left */}
              <div className="relative w-28 sm:w-40 shrink-0 overflow-hidden">
                <img src={p.image} alt="" className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" loading="lazy" />
                <div className="absolute inset-0 bg-gradient-to-r from-black/10 to-black/35" />
                <span className={[
                  "absolute top-2 left-2 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide shadow-sm",
                  p.tier === "premium" ? "bg-hotpink/90 text-white" : "bg-white/90 text-hotpink",
                ].join(" ")}>
                  {p.tier === "premium" ? <><Sparkles className="h-2.5 w-2.5" /> Premium</> : "Free"}
                </span>
                {pct > 0 && (
                  <div className="absolute bottom-0 inset-x-0 px-2 pb-2">
                    <div className="h-1.5 rounded-full bg-white/40 overflow-hidden">
                      <div className="h-full bg-hotpink transition-all" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                )}
              </div>

              {/* Info — right */}
              <div className="flex-1 min-w-0 p-3 sm:p-3.5 flex flex-col">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex flex-wrap gap-1.5">
                    <span className="rounded-full bg-blush/70 text-hotpink text-[9px] font-bold uppercase tracking-wide px-2 py-0.5">{p.weeks} weeks</span>
                    {p.phaseSynced && <span className="rounded-full bg-blush/70 text-hotpink text-[9px] font-bold uppercase tracking-wide px-2 py-0.5">Cycle-synced</span>}
                  </div>
                  {isActive && <span className="shrink-0 rounded-full bg-hotpink text-white text-[9px] font-bold uppercase tracking-wide px-2 py-0.5">Your plan</span>}
                </div>
                <h3 className="mt-1 font-script text-2xl text-hotpink leading-none">{p.title}</h3>
                <p className="mt-1 text-[11px] text-rose/75 leading-snug line-clamp-2">{p.tagline}</p>
                <div className="mt-auto pt-2 flex flex-wrap items-center gap-1.5">
                  <Tag icon={<Gauge className="h-3 w-3" />}>{LEVEL_LABEL[p.level]}</Tag>
                  <Tag icon={<Dumbbell className="h-3 w-3" />}>{EQUIP_LABEL[p.equipment]}</Tag>
                  <Tag icon={<CalendarHeart className="h-3 w-3" />}>{p.daysPerWeek}×/week</Tag>
                  <ChevronRight className="h-4 w-4 text-rose/35 ml-auto shrink-0 group-hover:text-hotpink/70 transition" />
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function Tag({ icon, children }: { icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-blush/70 text-rose/80 text-[10px] font-semibold px-2 py-0.5">
      {icon}{children}
    </span>
  );
}

function ProgramDetail({ programId, onBack, onOpenSession, onMakeMyPlan }: {
  programId: string;
  onBack: () => void;
  onOpenSession: (week: number, sessionIndex: number) => void;
  onMakeMyPlan: () => void;
}) {
  const program = getProgram(programId);
  const [week, setWeek] = useState(1);
  const [active, setActive] = useState(() => loadActiveProgram());
  const [confirmReplace, setConfirmReplace] = useState(false);
  const phase = readCyclePhase() ?? "any";
  if (!program) return null;

  const isMyPlan = active?.programId === program.id;

  // Is there an existing plan that this would replace?
  const hasFreestyle = (() => { try { const v = localStorage.getItem(PROGRAM_KEY); return !!v && v !== "null"; } catch { return false; } })();
  const replacesExisting = (!!active && active.programId !== program.id) || hasFreestyle;

  const commitPlan = () => {
    if (!isPremium()) { openPaywall("workout"); return; } // Bloom+ gate: enrolling a program is premium
    // One plan at a time: enrolling a program clears any freestyle week.
    try { localStorage.removeItem(PROGRAM_KEY); localStorage.removeItem(PROGRAM_PHASE_KEY); } catch {}
    saveActiveProgram({ programId: program.id, week: 1, startedISO: todayISO() });
    setActive(loadActiveProgram());
    setConfirmReplace(false);
    onMakeMyPlan();
    // Signal every tool (and the guided celebration) that a workout plan now exists.
    try { window.dispatchEvent(new Event("bloom:workout-updated")); } catch {}
  };
  const makeMyPlan = () => { if (replacesExisting) setConfirmReplace(true); else commitPlan(); };

  const progress = loadProgramProgress();
  const doneSet = new Set(progress[program.id] ?? []);
  const meta = weekMeta(program, week);

  return (
    <div className="relative animate-fade-in">
      <button onClick={onBack} className="mb-3 inline-flex items-center gap-1 text-sm text-rose hover:text-hotpink">
        <ArrowLeft className="h-4 w-4" /> Programs
      </button>

      {/* Hero */}
      <div className="relative aspect-[16/9] sm:aspect-[2/1] rounded-3xl overflow-hidden border border-petal/60 shadow-xl mb-4">
        <img src={program.image} alt="" className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-4">
          <div className="flex gap-1.5 mb-1.5">
            <span className="rounded-full bg-hotpink text-white text-[10px] font-bold uppercase tracking-wide px-2 py-0.5">{program.weeks} weeks</span>
            {program.phaseSynced && <span className="rounded-full bg-white/90 text-hotpink text-[10px] font-bold uppercase tracking-wide px-2 py-0.5">Cycle-synced</span>}
          </div>
          <h1 className="font-script text-3xl sm:text-5xl text-white leading-none drop-shadow">{program.title}</h1>
          <p className="mt-1 text-xs sm:text-sm text-white/90 italic max-w-md drop-shadow">{program.tagline}</p>
        </div>
      </div>

      {/* What you'll get */}
      <div className="rounded-3xl bg-white/85 border border-petal/60 p-4 mb-3 shadow-sm">
        <h2 className="font-script text-2xl text-hotpink leading-none mb-2">What you'll get</h2>
        <ul className="space-y-1.5">
          {program.promise.map((b) => (
            <li key={b} className="flex items-start gap-2 text-sm text-rose/85">
              <Check className="h-4 w-4 text-hotpink shrink-0 mt-0.5" strokeWidth={3} /> {b}
            </li>
          ))}
        </ul>
        <div className="mt-3 flex flex-wrap gap-1.5">
          <Tag icon={<Gauge className="h-3 w-3" />}>{LEVEL_LABEL[program.level]}</Tag>
          <Tag icon={<Dumbbell className="h-3 w-3" />}>{EQUIP_LABEL[program.equipment]}</Tag>
          <Tag icon={<CalendarHeart className="h-3 w-3" />}>{program.daysPerWeek}×/week</Tag>
        </div>
        <p className="mt-3 text-xs text-rose/70"><span className="font-bold text-rose">Who it's for:</span> {program.whoFor}</p>
        {isMyPlan && (
          <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-blush/50 border border-petal/60 px-3 py-1">
            <Check className="h-3.5 w-3.5 text-hotpink shrink-0" strokeWidth={3} />
            <p className="text-[11px] font-bold text-hotpink">This is your active plan ✿</p>
          </div>
        )}
      </div>

      {/* Why it works */}
      <div className="rounded-3xl bg-blush/40 border border-petal/50 p-4 mb-4">
        <h2 className="font-script text-2xl text-hotpink leading-none mb-2 flex items-center gap-1.5">
          <ShieldCheck className="h-5 w-5" strokeWidth={1.8} /> Why it works
        </h2>
        <ul className="space-y-1.5">
          {program.whyItWorks.map((b) => (
            <li key={b} className="flex items-start gap-2 text-xs sm:text-sm text-rose/80">
              <Sparkles className="h-3.5 w-3.5 text-hotpink shrink-0 mt-0.5" /> {b}
            </li>
          ))}
        </ul>
      </div>

      {/* Week selector */}
      <div className="mb-3">
        <h2 className="font-script text-2xl text-hotpink leading-none mb-2">Your {program.weeks}-week journey</h2>
        <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {Array.from({ length: program.weeks }, (_, i) => i + 1).map((w) => {
            const wmeta = weekMeta(program, w);
            const active = w === week;
            return (
              <button
                key={w}
                onClick={() => setWeek(w)}
                className={[
                  "shrink-0 rounded-2xl px-3 py-2 text-center transition border",
                  active ? "bg-hotpink text-white border-hotpink shadow-md shadow-hotpink/30" : "bg-white/80 text-rose border-petal/60 hover:border-hotpink/40",
                ].join(" ")}
              >
                <p className="text-[9px] font-bold uppercase tracking-wide opacity-80">Week</p>
                <p className="font-script text-xl leading-none">{w}</p>
                {wmeta.isDeload && <p className="text-[8px] font-bold uppercase">Deload</p>}
              </button>
            );
          })}
        </div>
      </div>

      {/* Week theme */}
      <div className="rounded-2xl bg-gradient-to-r from-petal/40 to-blush/40 border border-petal/50 p-3 mb-3">
        <p className="text-[10px] font-bold uppercase tracking-wider text-hotpink">{meta.theme}{meta.isDeload ? " · recovery week" : ""}</p>
        <p className="text-xs text-rose/80 leading-snug mt-0.5">{meta.note}</p>
      </div>

      {/* Sessions for the selected week */}
      <div className="space-y-2.5">
        {program.template.map((_, sIdx) => {
          const s = computeWeekSession(program, sIdx, week);
          const isDone = doneSet.has(sessionTag(week, sIdx));
          const tip = phase !== "any" ? s.phaseTips?.[phase] : undefined;
          return (
            <button
              key={sIdx}
              onClick={() => onOpenSession(week, sIdx)}
              className="w-full text-left rounded-3xl bg-white/85 border border-petal/60 p-3.5 shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition flex items-center gap-3"
            >
              <span className={[
                "grid h-11 w-11 shrink-0 place-items-center rounded-full",
                isDone ? "bg-hotpink text-white" : "bg-blush text-hotpink",
              ].join(" ")}>
                {isDone ? <Check className="h-5 w-5" strokeWidth={3} /> : <Dumbbell className="h-5 w-5" strokeWidth={1.8} />}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-rose leading-tight">{s.title}</p>
                <p className="text-[11px] text-rose/65 leading-snug">{s.focus}</p>
                <div className="mt-1 flex flex-wrap items-center gap-1.5">
                  <Tag icon={<Clock className="h-3 w-3" />}>{s.estMinutes} min</Tag>
                  <Tag icon={<Flame className="h-3 w-3" />}>~{plannedCalories(MET_INTENTION_FOR_INTENSITY[workoutIntensity(s.title, s.focus)], s.estMinutes)} kcal</Tag>
                  <Tag icon={<Dumbbell className="h-3 w-3" />}>{sessionVolume(s)} sets</Tag>
                  {tip && <span className="text-[9px] font-bold uppercase tracking-wide text-hotpink">✿ {PHASE_LABEL[phase]} tip</span>}
                </div>
              </div>
              <ChevronRight className="h-5 w-5 text-rose/40 shrink-0" />
            </button>
          );
        })}
      </div>

      {/* Sticky primary CTA — always reachable while scrolling */}
      <div className="sticky bottom-3 z-20 mt-4 pb-1">
        {isMyPlan ? (
          <button onClick={onMakeMyPlan} className="bloom-luxury-btn w-full inline-flex items-center justify-center gap-2 py-3.5 text-sm font-bold text-white shadow-xl shadow-hotpink/30">
            <CalendarHeart className="h-4 w-4" strokeWidth={2} /> Go to My Plan
          </button>
        ) : (
          <button onClick={makeMyPlan} className="bloom-luxury-btn animate-cta-bounce w-full inline-flex items-center justify-center gap-2 py-3.5 text-sm font-bold text-white shadow-xl shadow-hotpink/30">
            <CalendarHeart className="h-4 w-4" strokeWidth={2} /> Make this my plan
          </button>
        )}
      </div>

      {/* Confirm: replacing an existing plan — portaled so it's always centered
          in the viewport (never trapped/cropped by a transformed ancestor). */}
      {confirmReplace && createPortal(
        <div className="fixed inset-0 z-[80] bg-black/40 backdrop-blur-sm grid place-items-center overflow-y-auto p-4 animate-fade-in" onClick={() => setConfirmReplace(false)}>
          <div className="w-full max-w-xs my-auto rounded-3xl bg-white/97 border border-petal/60 shadow-2xl p-5 text-center animate-scale-in" onClick={(e) => e.stopPropagation()}>
            <p className="font-script text-2xl text-hotpink leading-none mb-2">Replace your plan?</p>
            <p className="text-sm text-rose/80 mb-4">Making <span className="font-bold">{program.title}</span> your plan will replace your current weekly plan.</p>
            <div className="flex gap-2">
              <button onClick={() => setConfirmReplace(false)} className="flex-1 rounded-full bg-white/90 border border-petal/60 py-2.5 text-sm font-semibold text-rose">Cancel</button>
              <button onClick={commitPlan} className="flex-1 bloom-luxury-btn py-2.5 text-sm font-bold text-white">Replace</button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

function ProgramSessionView({ programId, week, sessionIndex, onBack, onStartTimer }: {
  programId: string;
  week: number;
  sessionIndex: number;
  onBack: () => void;
  onStartTimer: (session: WorkoutSession) => void;
}) {
  const program = getProgram(programId);
  const phase = readCyclePhase() ?? "any";
  const [completed, setCompleted] = useState(false);

  if (!program) return null;
  const session = computeWeekSession(program, sessionIndex, week);
  const tip = phase !== "any" ? session.phaseTips?.[phase] : undefined;
  const meta = weekMeta(program, week);

  const startTimer = () => onStartTimer(programToTimerSession(program, week, sessionIndex));

  const markComplete = () => {
    if (completed) return;
    setCompleted(true);
    // 1. record program-level progress
    try {
      const prog = loadProgramProgress();
      const list = new Set(prog[program.id] ?? []);
      list.add(sessionTag(week, sessionIndex));
      prog[program.id] = [...list];
      localStorage.setItem(PROGRAM_PROGRESS_KEY, JSON.stringify(prog));
    } catch {}
    // 2. log to shared workout history (feeds Today/Me streaks & snapshots)
    try {
      const raw = localStorage.getItem(WORKOUT_LOG_KEY);
      const history = raw ? JSON.parse(raw) : [];
      history.push({
        date: todayISO(),
        zone: "full-body",
        intention: "strengthen",
        phase,
        durationMin: session.estMinutes,
        calories: Math.round(session.estMinutes * 6),
        sessionName: `${program.title} — ${session.title}`,
      });
      localStorage.setItem(WORKOUT_LOG_KEY, JSON.stringify(history));
      window.dispatchEvent(new Event("bloom:workout-updated"));
    } catch {}
    // 3. bump streak
    try {
      const raw = localStorage.getItem(STREAK_KEY);
      const s = raw ? JSON.parse(raw) : { count: 0, lastISO: null };
      if (s.lastISO !== todayISO()) {
        const next = s.lastISO && isYesterday(s.lastISO) ? { count: s.count + 1, lastISO: todayISO() } : { count: 1, lastISO: todayISO() };
        localStorage.setItem(STREAK_KEY, JSON.stringify(next));
      }
    } catch {}
  };

  return (
    <div className="relative animate-fade-in">
      <button onClick={onBack} className="mb-3 inline-flex items-center gap-1 text-sm text-rose hover:text-hotpink">
        <ArrowLeft className="h-4 w-4" /> {program.title}
      </button>

      {/* Session header */}
      <div className="rounded-3xl bg-gradient-to-br from-hotpink/15 to-petal/30 border border-petal/60 p-4 mb-3">
        <p className="text-[10px] font-bold uppercase tracking-wider text-hotpink">Week {week} · {meta.theme}</p>
        <h1 className="font-script text-3xl text-hotpink leading-none mt-0.5">{session.title}</h1>
        <p className="text-xs text-rose/75 mt-1">{session.focus}</p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          <Tag icon={<Clock className="h-3 w-3" />}>{session.estMinutes} min</Tag>
          <Tag icon={<Flame className="h-3 w-3" />}>~{plannedCalories(MET_INTENTION_FOR_INTENSITY[workoutIntensity(session.title, session.focus)], session.estMinutes)} kcal</Tag>
          <Tag icon={<Flame className="h-3 w-3" />}>{sessionVolume(session)} working sets</Tag>
        </div>
      </div>

      {/* Cycle-sync tip */}
      {tip && (
        <div className="rounded-2xl bg-white/85 border border-petal/60 p-3 mb-3 flex items-start gap-2.5">
          <span className="clay-blob grid h-8 w-8 shrink-0 place-items-center rounded-full text-white">
            <Sparkles className="h-4 w-4" strokeWidth={1.8} />
          </span>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-hotpink">{PHASE_LABEL[phase]} phase tip</p>
            <p className="text-xs text-rose/80 leading-snug">{tip}</p>
          </div>
        </div>
      )}

      {/* Blocks */}
      <div className="space-y-4">
        {session.blocks.map((block, bIdx) => (
          <div key={bIdx}>
            <div className="flex items-center justify-between mb-1.5">
              <h2 className="font-script text-2xl text-hotpink leading-none">{block.label}</h2>
              {(block.rounds ?? 1) > 1 && (
                <span className="rounded-full bg-hotpink text-white text-[10px] font-bold uppercase tracking-wide px-2.5 py-1">
                  {block.rounds} rounds
                </span>
              )}
            </div>
            <div className="space-y-2">
              {block.exercises.map((ex, eIdx) => {
                const meta = EXERCISES[ex.slug];
                return (
                  <div key={eIdx} className="rounded-2xl bg-white/85 border border-petal/50 overflow-hidden flex">
                    <div className="relative w-20 sm:w-24 shrink-0 overflow-hidden bg-blush/40">
                      {meta?.image && <img src={meta.image} alt="" className="h-full w-full object-cover" loading="lazy" />}
                    </div>
                    <div className="flex-1 min-w-0 p-2.5">
                      <p className="text-sm font-bold text-rose leading-tight">{meta?.name ?? ex.slug}</p>
                      <div className="mt-1 flex flex-wrap items-center gap-1.5">
                        <span className="rounded-full bg-hotpink/90 text-white text-[10px] font-bold px-2 py-0.5">{ex.sets} × {ex.reps}</span>
                        {ex.tempo && <Tag icon={<Gauge className="h-3 w-3" />}>tempo {ex.tempo}</Tag>}
                        {ex.restSec > 0 && <Tag icon={<Timer className="h-3 w-3" />}>{ex.restSec}s rest</Tag>}
                      </div>
                      {ex.loadNote && <p className="mt-1 text-[10px] text-hotpink font-semibold leading-snug">⚖ {ex.loadNote}</p>}
                      {ex.cues.length > 0 && (
                        <ul className="mt-1 space-y-0.5">
                          {ex.cues.map((c) => (
                            <li key={c} className="text-[10px] text-rose/65 leading-snug flex items-start gap-1">
                              <span className="text-hotpink">·</span> {c}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Primary: start the guided chrono session (same player as Discover) */}
      <button
        onClick={startTimer}
        className="mt-5 w-full bloom-luxury-btn animate-cta-bounce rounded-full py-3.5 text-sm font-bold text-white flex items-center justify-center gap-2"
      >
        <Play className="h-5 w-5" fill="currentColor" strokeWidth={0} /> Start guided session
      </button>

      {/* Secondary: quick-log without the timer */}
      <button
        onClick={markComplete}
        disabled={completed}
        className={[
          "mt-2 w-full rounded-full py-2.5 text-sm font-semibold transition flex items-center justify-center gap-2 border",
          completed ? "bg-blush/50 text-hotpink border-petal/60" : "bg-white/90 text-rose border-petal/60 hover:border-hotpink/40",
        ].join(" ")}
      >
        {completed ? <><Check className="h-4 w-4" strokeWidth={3} /> Logged as done ✿</> : <>Mark done without timer</>}
      </button>
      {completed && (
        <button onClick={onBack} className="mt-2 w-full text-center text-sm font-semibold text-hotpink">
          Back to my plan
        </button>
      )}
    </div>
  );
}

// ===================== SETUP PROFILE =====================

function SetupProfile({ initial, onDone }: { initial: WorkoutProfile; onDone: (p: WorkoutProfile) => void }) {
  const [level, setLevel] = useState<Level>(initial.level);
  const [goal, setGoal] = useState<Goal>(initial.goal);
  const [equipment, setEquipment] = useState<Equipment>(initial.equipment);
  const [days, setDays] = useState<2 | 3 | 4 | 5>(initial.daysPerWeek);

  const Pill = ({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) => (
    <button
      onClick={onClick}
      className={[
        "rounded-full px-3.5 py-1.5 text-[13px] font-semibold border shadow-sm transition active:scale-95",
        active ? "bg-hotpink text-white border-transparent shadow-md shadow-hotpink/30" : "bg-white/85 text-rose border-petal/60 hover:border-hotpink/40 hover:shadow-md",
      ].join(" ")}
    >
      {label}
    </button>
  );

  return (
    <div className="animate-fade-in">
      {/* Compact hero — same photo banner every workout tab uses, so setup feels
          like part of the tool, not a bare form. */}
      <div className="relative w-full overflow-hidden rounded-3xl border border-petal/60 shadow-md shadow-rose/10 mb-3 animate-card-pop-in">
        <img src={HERO_IMAGES.program} alt="" className="absolute inset-0 h-full w-full object-cover object-top" onError={(e) => { (e.target as HTMLImageElement).style.opacity = "0"; }} />
        <div className="absolute inset-0 bg-gradient-to-r from-hotpink/80 via-hotpink/30 to-transparent" />
        <div className="relative z-10 px-4 py-4 sm:px-5 sm:py-5 max-w-[72%] min-h-[92px] sm:min-h-[110px] flex flex-col justify-center">
          <p className="mb-1 inline-flex w-fit items-center gap-1 rounded-full bg-white/25 px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.15em] text-white backdrop-blur-sm" style={{ textShadow: "0 1px 4px rgba(0,0,0,0.35)" }}>
            <Dumbbell className="h-2.5 w-2.5" strokeWidth={2.5} /> Workout
          </p>
          <h1 className="font-script text-2xl sm:text-4xl text-white leading-none" style={{ textShadow: "0 2px 8px rgba(0,0,0,0.28)" }}>Let's set you up ✿</h1>
          <p className="mt-1 text-[11px] sm:text-sm font-medium text-white/95 leading-snug" style={{ textShadow: "0 1px 6px rgba(0,0,0,0.35)" }}>Four quick questions — editable anytime in Me.</p>
        </div>
      </div>

      <section className="rounded-3xl bg-white/85 backdrop-blur border border-petal/60 p-4 shadow-xl shadow-rose/10">
        <div className="space-y-3.5">
          <div className="animate-card-pop-in" style={{ animationDelay: "60ms" }}>
            <p className="text-[13px] font-bold text-rose mb-1.5">Your level</p>
            <div className="flex flex-wrap gap-1.5">
              {(["Beginner", "Intermediate", "Advanced"] as Level[]).map((l) => (
                <Pill key={l} active={level === l} label={l} onClick={() => setLevel(l)} />
              ))}
            </div>
          </div>

          <div className="animate-card-pop-in" style={{ animationDelay: "120ms" }}>
            <p className="text-[13px] font-bold text-rose mb-1.5">Your main goal</p>
            <div className="flex flex-wrap gap-1.5">
              {([
                { key: "energy", label: "Energy" },
                { key: "tonify", label: "Tonify" },
                { key: "strengthen", label: "Strengthen" },
                { key: "flexibility", label: "Flexibility" },
              ] as { key: Goal; label: string }[]).map((g) => (
                <Pill key={g.key} active={goal === g.key} label={g.label} onClick={() => setGoal(g.key)} />
              ))}
            </div>
          </div>

          <div className="animate-card-pop-in" style={{ animationDelay: "180ms" }}>
            <p className="text-[13px] font-bold text-rose mb-1.5">Equipment available</p>
            <div className="flex flex-wrap gap-1.5">
              {([
                { key: "none", label: "Nothing" },
                { key: "mat", label: "Mat only" },
                { key: "bands", label: "Bands" },
                { key: "dumbbells", label: "Dumbbells" },
                { key: "gym", label: "Full gym" },
              ] as { key: Equipment; label: string }[]).map((e) => (
                <Pill key={e.key} active={equipment === e.key} label={e.label} onClick={() => setEquipment(e.key)} />
              ))}
            </div>
          </div>

          <div className="animate-card-pop-in" style={{ animationDelay: "240ms" }}>
            <p className="text-[13px] font-bold text-rose mb-1.5">Days available per week</p>
            <div className="flex flex-wrap gap-1.5">
              {([2, 3, 4, 5] as const).map((d) => (
                <Pill key={d} active={days === d} label={d === 5 ? "5+" : String(d)} onClick={() => setDays(d)} />
              ))}
            </div>
          </div>
        </div>

        <button
          onClick={() => onDone({ level, goal, equipment, daysPerWeek: days })}
          className="bloom-luxury-btn mt-5 inline-flex items-center gap-2 px-6 py-2.5 text-sm font-bold text-white"
        >
          Start <ChevronRight className="h-4 w-4" />
        </button>
      </section>
    </div>
  );
}

// ===================== DISCOVER =====================

function loadHistory(): HistoryEntry[] {
  try {
    const raw = localStorage.getItem(WORKOUT_LOG_KEY);
    return raw ? (JSON.parse(raw) as HistoryEntry[]) : [];
  } catch { return []; }
}

// Diary → Workout: cramps/tired/bloated logged today or yesterday suggest a
// gentler Recovery session over the default recommendation.
const DIARY_KEY = "bloom:diary";
const RECOVERY_MOODS = new Set(["cramps", "tired", "bloated"]);

function recentDiaryDistress(days = 2): boolean {
  try {
    const raw = localStorage.getItem(DIARY_KEY);
    if (!raw) return false;
    const entries = JSON.parse(raw) as { date?: string; mood?: string }[];
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - (days - 1));
    const cutoffISO = cutoff.toISOString().slice(0, 10);
    return entries.some((e) => !!e.date && e.date >= cutoffISO && RECOVERY_MOODS.has(e.mood ?? ""));
  } catch { return false; }
}

function unlockedBadges(history: HistoryEntry[], streak: { count: number }): Set<string> {
  const ids = new Set<string>();
  if (history.length >= 1) ids.add("first-session");
  if (streak.count >= 7) ids.add("streak-7");
  if (history.length >= 12) ids.add("weekly-warrior");
  if (history.some((h) => h.phase === "period")) ids.add("first-period-session");
  if (history.filter((h) => h.phase === "luteal").length >= 5) ids.add("luteal-legend");
  if (history.filter((h) => h.phase === "ovulation" || h.phase === "fertile").length >= 3) ids.add("ovulation-fire");
  if (history.filter((h) => h.zone === "glutes").length >= 5) ids.add("glutes-queen");
  if (history.filter((h) => h.zone === "core").length >= 5) ids.add("core-crusher");
  if (history.filter((h) => h.zone === "full-body").length >= 3) ids.add("full-body-week");
  return ids;
}

function Discover({ profile, onStartSession, onBestShape, onGoToPlan }: {
  profile: WorkoutProfile;
  onStartSession: (s: WorkoutSession) => void;
  onBestShape: () => void;
  onGoToPlan: () => void;
}) {
  const [phase, setPhase] = useState<CyclePhase>("any");
  const [energy, setEnergy] = useLS<{ date: string; level: EnergyLevel | null }>(ENERGY_KEY, { date: "", level: null });
  const [streak] = useLS<{ count: number; lastISO: string | null }>(STREAK_KEY, { count: 0, lastISO: null });
  const [zone, setZone] = useState<Zone | null>(null);
  const [intention, setIntention] = useState<WorkoutIntention | null>(null);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [suggestRecover, setSuggestRecover] = useState(false);
  const [recoveryReason, setRecoveryReason] = useState<"energy" | "diary" | null>(null);
  const [challenge, setChallenge] = useLS<{ phase: CyclePhase | "any"; weekStart: string; done: number }>(CHALLENGE_KEY, { phase: "any", weekStart: "", done: 0 });
  const intentionSectionRef = useRef<HTMLDivElement>(null);
  const sessionListRef = useRef<HTMLDivElement>(null);
  const zoneSectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setPhase(readCyclePhase() ?? "any");
  }, []);

  useEffect(() => {
    if (recentDiaryDistress()) {
      setSuggestRecover(true);
      setRecoveryReason("diary");
    }
  }, []);

  useEffect(() => {
    setSelectedSessionId(null);
  }, [intention]);

  // Auto-scroll to reveal the next step once a choice is made, so it's clear there's more to pick.
  useEffect(() => {
    const target = zone && intention ? sessionListRef.current : zone ? intentionSectionRef.current : null;
    if (target) {
      requestAnimationFrame(() => target.scrollIntoView({ behavior: "smooth", block: "start" }));
    }
  }, [zone, intention]);

  const todayEnergy = energy.date === todayISO() ? energy.level : null;

  const onPickEnergy = (level: EnergyLevel) => {
    setEnergy({ date: todayISO(), level });
    if (level === "exhausted" && (phase === "luteal" || phase === "period")) {
      setSuggestRecover(true);
      setRecoveryReason("energy");
    } else {
      setSuggestRecover(false);
      setRecoveryReason(null);
    }
  };

  const onPickZone = (z: Zone) => {
    setZone(z);
    if (suggestRecover) {
      setIntention("recover");
    } else {
      setIntention(null);
    }
    setSelectedSessionId(null);
  };

  const onPickSession = (session: WorkoutSession) => {
    setSelectedSessionId(session.id);
    setTimeout(() => onStartSession(session), 200);
  };

  const history = useMemo(() => loadHistory(), [zone, intention]);
  const badges = useMemo(() => unlockedBadges(history, streak), [history, streak]);

  // Weekly challenge — reset if a new week started
  const weekStart = useMemo(() => {
    const d = new Date();
    const day = d.getDay();
    const diff = (day === 0 ? -6 : 1) - day;
    d.setDate(d.getDate() + diff);
    return d.toISOString().slice(0, 10);
  }, []);
  useEffect(() => {
    if (challenge.weekStart !== weekStart || challenge.phase !== phase) {
      setChallenge({ phase, weekStart, done: 0 });
    }
  }, [phase, weekStart]);

  const challengeData = phase !== "any" ? WEEKLY_CHALLENGES[phase] : null;

  // sessions sorted with phase-optimal intention durations first
  const intentionList = useMemo(() => {
    if (!intention) return [];
    return ([10, 20, 30] as const).map((d) => buildSession(zone!, intention, d, profile.level, phase, profile.equipment));
  }, [zone, intention, profile.level, phase]);

  return (
    <div className="space-y-2">

      {/* Quick context: this is a one-off; the plan lives in My Plan */}
      <button onClick={onGoToPlan} className="w-full flex items-center gap-2 rounded-2xl bg-blush/40 border border-petal/50 px-3 py-2 text-left transition hover:bg-blush/60 active:scale-[0.99]">
        <CalendarHeart className="h-4 w-4 text-hotpink shrink-0" strokeWidth={1.8} />
        <p className="flex-1 text-[11px] text-rose/75 leading-snug">A quick one-off session. Want your structured weekly plan instead?</p>
        <span className="text-[11px] font-bold text-hotpink shrink-0">My Plan →</span>
      </button>

      {/* Energy Check */}
      <section className="rounded-3xl bg-white/85 backdrop-blur border border-petal/60 p-3 sm:p-4">
        <h2 className="font-script text-xl text-hotpink leading-none mb-2 animate-text-pop">How's your energy today?</h2>
        <div className="grid grid-cols-4 gap-1.5">
          {ENERGY_OPTIONS.map((opt, i) => {
            const Icon = opt.icon;
            const active = todayEnergy === opt.key;
            return (
              <div key={opt.key} className="animate-card-pop-in" style={{ animationDelay: `${i * 0.06}s` }}>
              <button
                onClick={() => onPickEnergy(opt.key)}
                className={[
                  "w-full flex flex-col items-center gap-1 rounded-2xl border p-2 shadow-sm transition active:scale-95",
                  active ? "bg-blush/70 border-hotpink/40 shadow-md shadow-hotpink/15 animate-selected-glow" : "bg-white/70 border-petal/50 hover:border-hotpink/40 hover:shadow-md hover:-translate-y-0.5",
                  !todayEnergy ? "animate-hint-glow-delayed" : "",
                ].join(" ")}
              >
                <Icon className="h-4 w-4 text-hotpink" strokeWidth={1.8} />
                <span className="text-[10px] font-semibold text-rose text-center leading-tight">{opt.label}</span>
              </button>
              </div>
            );
          })}
        </div>
        {suggestRecover && (
          <div className="mt-3 rounded-2xl bg-blush/60 border border-petal/50 p-3">
            <p className="text-sm text-rose/85">
              {recoveryReason === "diary"
                ? "We noticed you logged cramps, fatigue or bloating recently — want a gentler Recovery session today?"
                : "Sounds like your body wants rest today — switch to a Recovery session?"}
            </p>
            <div className="mt-2 flex gap-2">
              <button
                onClick={() => zoneSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}
                className="bloom-luxury-btn px-4 py-1.5 text-xs font-bold text-white"
              >
                Yes, show recovery
              </button>
              <button onClick={() => setSuggestRecover(false)} className="rounded-full bg-white/90 px-4 py-1.5 text-xs font-semibold text-rose border border-petal/60">No, keep my plan</button>
            </div>
          </div>
        )}
      </section>

      {/* Body Focus */}
      <section ref={zoneSectionRef} className="rounded-3xl bg-white/85 backdrop-blur border border-petal/60 p-3 sm:p-4 scroll-mt-20">
        <h2 className="font-script text-xl sm:text-2xl text-hotpink leading-none mb-2">What do you want to focus on?</h2>
        <div className="grid grid-cols-3 lg:grid-cols-6 gap-1.5 sm:gap-2 grid-flow-row-dense">
          {ZONES.map((z, i) => {
            const active = zone === z.key;
            return (
              <div key={z.key} className="relative animate-card-pop-in" style={{ animationDelay: `${i * 0.06}s` }}>
                {active && (
                  <div className="absolute -inset-1.5 rounded-[1.4rem] bg-gradient-to-br from-hotpink/60 to-magenta/50 blur-md animate-bloom-pulse -z-10" />
                )}
                <button
                  onClick={() => onPickZone(z.key)}
                  className={[
                    "group relative aspect-square w-full rounded-2xl overflow-hidden border transition active:scale-95",
                    active
                      ? "bloom-shine border-white/70 shadow-[0_10px_28px_-8px_oklch(0.65_0.27_350/0.6)] ring-2 ring-hotpink/50"
                      : "border-white/40 shadow-[0_6px_18px_-10px_oklch(0.65_0.18_350/0.4)] hover:shadow-[0_10px_24px_-10px_oklch(0.65_0.22_350/0.5)] hover:-translate-y-0.5",
                    todayEnergy && !zone ? "animate-hint-glow" : "",
                  ].join(" ")}
                >
                  <ExercisePhoto exercise={{ slug: z.key, name: z.label, image: z.image, muscles: "" }} className="absolute inset-0 h-full w-full object-cover" />
                  {/* glossy sheen */}
                  <div className="absolute inset-x-0 top-0 h-2/5 bg-gradient-to-b from-white/45 via-white/10 to-transparent" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/10 to-transparent" />
                  {/* top edge highlight */}
                  <div className="absolute inset-x-0 top-0 h-px bg-white/60" />
                  <span className="absolute bottom-1 left-0 right-0 text-center text-[9px] sm:text-[11px] font-bold text-white drop-shadow leading-tight px-0.5 break-words hyphens-auto">{z.label}</span>
                  {active && (
                    <span className="absolute top-1.5 right-1.5 grid h-5 w-5 sm:h-6 sm:w-6 place-items-center rounded-full bg-gradient-to-br from-white to-blush text-hotpink shadow-md ring-1 ring-white/70">
                      <Check className="h-3 w-3 sm:h-3.5 sm:w-3.5" strokeWidth={3} />
                    </span>
                  )}
                </button>
              </div>
            );
          })}
        </div>

        {zone && (
          <div ref={intentionSectionRef} className="mt-3 scroll-mt-20">
            <p className="text-xs font-bold text-rose mb-1.5">Pick an intention</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
              {WORKOUT_INTENTIONS.map((it) => {
                const Icon = it.icon;
                const active = intention === it.key;
                const optimal = phase !== "any" && PHASE_OPTIMAL[it.key].includes(phase);
                return (
                  <button
                    key={it.key}
                    onClick={() => setIntention(it.key)}
                    className={[
                      "flex flex-col items-start gap-0.5 rounded-2xl border p-2 text-left shadow-sm transition active:scale-95",
                      active
                        ? "bloom-shine bg-gradient-to-br from-hotpink to-magenta text-white border-transparent shadow-[0_8px_22px_-8px_oklch(0.65_0.27_350/0.6)] animate-selected-glow"
                        : "bg-white/70 border-petal/50 text-rose hover:border-hotpink/40 hover:shadow-md hover:-translate-y-0.5",
                      !intention ? "animate-hint-glow" : "",
                    ].join(" ")}
                  >
                    <span className="flex flex-wrap items-center gap-1 min-w-0">
                      <Icon className={["h-3.5 w-3.5 shrink-0", active ? "text-white" : "text-hotpink"].join(" ")} strokeWidth={1.8} />
                      <span className="text-xs font-bold leading-tight">{it.label}</span>
                      {optimal && (
                        <span className={["shrink-0 rounded-full px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wide", active ? "bg-white/20 text-white" : "bg-blush/70 text-hotpink"].join(" ")}>
                          {PHASE_LABEL[phase]}
                        </span>
                      )}
                    </span>
                    <span className={["text-[11px] leading-snug", active ? "text-white/85" : "text-rose/75"].join(" ")}>{it.desc}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {zone && intention && (
          <div ref={sessionListRef} className="mt-3 space-y-2 scroll-mt-20">
            <p className="text-[11px] font-bold uppercase tracking-wider text-rose/50">Pick your length</p>
            {intentionList.map((session) => {
              const active = selectedSessionId === session.id;
              const optimal = phase !== "any" && session.phaseOptimal.includes(phase);
              return (
              <button
                key={session.id}
                onClick={() => onPickSession(session)}
                className={[
                  "w-full flex items-center gap-3 rounded-2xl bg-white/90 backdrop-blur border p-2.5 shadow-sm hover:-translate-y-0.5 hover:shadow-lg active:scale-[0.99] transition text-left",
                  active ? "border-hotpink/60 ring-1 ring-hotpink/30 animate-selected-glow" : "border-petal/60",
                ].join(" ")}
              >
                {/* Duration badge — left */}
                <div className="shrink-0 w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-br from-blush/80 to-petal/60 grid place-content-center text-center border border-petal/50">
                  <p className="font-script text-2xl sm:text-3xl text-hotpink leading-none">{session.durationMin}</p>
                  <p className="text-[8px] font-bold uppercase tracking-wider text-rose/60">min</p>
                </div>
                {/* Info — right */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <p className="text-sm font-bold text-rose leading-tight">{session.name}</p>
                    {optimal && <span className="rounded-full bg-blush/70 px-2 py-0.5 text-[8px] font-bold uppercase tracking-wide text-hotpink">{PHASE_LABEL[phase]} ✿</span>}
                  </div>
                  <p className="mt-0.5 text-[11px] font-semibold text-hotpink/70 leading-snug">{session.structureNote}</p>
                  <p className="text-[10px] text-rose/55">{session.level} · {session.workSec}s work / {session.restSec}s rest</p>
                </div>
                <span className="shrink-0 grid h-9 w-9 place-items-center rounded-full bg-hotpink text-white shadow-sm shadow-hotpink/30">
                  <Play className="h-4 w-4" fill="currentColor" strokeWidth={0} />
                </span>
              </button>
              );
            })}
          </div>
        )}
      </section>

      {/* Streak & Badges */}
      <section className="rounded-3xl bg-white/85 backdrop-blur border border-petal/60 p-3 sm:p-4">
        <div className="flex items-center justify-between mb-2">
          <h2 className="font-script text-xl text-hotpink leading-none">Streak & badges</h2>
          <p className="text-sm font-bold text-rose">{streak.count} day{streak.count === 1 ? "" : "s"} 🔥</p>
        </div>
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
          {BADGES.map((b) => {
            const unlocked = badges.has(b.id);
            return (
              <div
                key={b.id}
                className={[
                  "flex shrink-0 flex-col items-center gap-1.5 rounded-2xl border p-3 w-24 text-center transition",
                  unlocked ? "bg-blush/70 border-hotpink/40" : "bg-white/60 border-petal/40 opacity-50",
                ].join(" ")}
              >
                <Trophy className={["h-5 w-5", unlocked ? "text-hotpink" : "text-rose/50"].join(" ")} strokeWidth={1.8} />
                <span className="text-[10px] font-semibold text-rose leading-tight">{b.label}</span>
              </div>
            );
          })}
        </div>
      </section>

      {/* Weekly Challenge */}
      {challengeData && (
        <section className="rounded-3xl bg-white/85 backdrop-blur border border-petal/60 p-4 sm:p-5">
          <h2 className="font-script text-2xl text-hotpink leading-none mb-2">Weekly challenge</h2>
          <p className="text-sm text-rose/85 mb-3">{challengeData.title}</p>
          <div className="flex items-center gap-2">
            <div className="h-2 flex-1 rounded-full bg-blush/60 overflow-hidden">
              <div className="h-full bg-hotpink rounded-full transition-all" style={{ width: `${Math.min(100, (challenge.done / challengeData.target) * 100)}%` }} />
            </div>
            <span className="text-xs font-bold text-rose whitespace-nowrap">{challenge.done}/{challengeData.target}</span>
          </div>
          <button
            onClick={() => setChallenge((c) => ({ ...c, done: Math.min(challengeData.target, c.done + 1) }))}
            className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-white/90 px-4 py-1.5 text-xs font-semibold text-rose border border-petal/60"
          >
            <Check className="h-3.5 w-3.5" /> Mark done
          </button>
        </section>
      )}

      {/* Best Shape Calculator */}
      <section className="rounded-3xl bg-white/85 backdrop-blur border border-petal/60 p-4 sm:p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="font-script text-2xl text-hotpink leading-none mb-1">Best Shape Calculator</h2>
            <p className="text-sm text-rose/80">Discover your natural strengths — not numbers.</p>
          </div>
          <button onClick={onBestShape} className="bloom-luxury-btn shrink-0 inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white">
            <Wand2 className="h-3.5 w-3.5" /> Open
          </button>
        </div>
      </section>
    </div>
  );
}

// ===================== BEST SHAPE CALCULATOR =====================

function suggestBodyType(weightKg: number, heightCm: number): BodyType {
  const ratio = weightKg / (heightCm / 100);
  if (ratio < 25) return "rectangle";
  if (ratio < 30) return "hourglass";
  if (ratio < 35) return "pear";
  if (ratio < 40) return "apple";
  return "inverted-triangle";
}

function BestShapeCalculator({ onBack, onStartWith }: { onBack: () => void; onStartWith: (zone: Zone, intention: WorkoutIntention) => void }) {
  const [unit, setUnit] = useState<"metric" | "imperial">("metric");
  const [weight, setWeight] = useState("");
  const [height, setHeight] = useState("");
  const [step, setStep] = useState<1 | 2>(1);
  const [selected, setSelected] = useState<BodyType | null>(null);
  const propositionRef = useRef<HTMLDivElement>(null);

  const suggested = useMemo(() => {
    const w = parseFloat(weight), h = parseFloat(height);
    if (!w || !h) return null;
    const wKg = unit === "metric" ? w : w * 0.453592;
    const hCm = unit === "metric" ? h : h * 2.54;
    return suggestBodyType(wKg, hCm);
  }, [weight, height, unit]);

  const active = selected ?? (step === 2 ? suggested : null);
  const data = active ? BODY_TYPES[active] : null;

  useEffect(() => {
    if (!active) return;
    const t = setTimeout(() => {
      propositionRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }, 180);
    return () => clearTimeout(t);
  }, [active]);

  return (
    <div className="space-y-3">
      {/* Hero — same aspect as workout, title inside */}
      <div className="relative w-full aspect-[8/3] rounded-3xl overflow-hidden border border-petal/60 shadow-xl shadow-rose/10 animate-card-pop-in">
        <img src={HERO_IMAGES.bestShape} alt="Best Shape Calculator" className="absolute inset-0 h-full w-full object-cover object-top" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
        <div className="absolute inset-0 bg-gradient-to-r from-hotpink/70 via-hotpink/20 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent" />
        <div className="absolute inset-0 flex flex-col justify-between p-3 sm:p-5">
          <div className="animate-scale-in">
            <h1 className="font-script text-2xl sm:text-4xl lg:text-5xl xl:text-6xl text-white leading-none drop-shadow-md">Best Shape Calculator</h1>
            <p className="mt-0.5 text-xs sm:text-sm lg:text-base italic text-white/85 max-w-[10rem] sm:max-w-xs lg:max-w-sm drop-shadow leading-snug">Know your strengths. Find what already works for you.</p>
          </div>
          <button onClick={onBack} className="self-end rounded-full bg-white/20 backdrop-blur-md border border-white/40 px-3 py-1 text-xs font-semibold text-white transition active:scale-95">
            ← Back
          </button>
        </div>
      </div>

      {/* Step 1 — basics */}
      <div className="rounded-3xl bg-white/85 backdrop-blur border border-petal/60 p-4 animate-scale-in">
        <p className="text-[10px] font-bold uppercase tracking-wider text-rose/50 mb-0.5">Step 1</p>
        <h2 className="font-script text-xl text-hotpink leading-none mb-3">Your basics</h2>

        <div className="flex gap-2 mb-3">
          {(["metric", "imperial"] as const).map((u) => (
            <button key={u} onClick={() => setUnit(u)}
              className={["rounded-full px-3 py-1 text-xs font-semibold border transition active:scale-95",
                unit === u ? "bg-hotpink text-white border-transparent shadow-sm" : "bg-white/85 text-rose border-petal/60"].join(" ")}
            >
              {u === "metric" ? "kg / cm" : "lb / in"}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-3 mb-4">
          <div>
            <label className="text-xs font-bold text-rose">Weight ({unit === "metric" ? "kg" : "lb"})</label>
            <input value={weight} onChange={(e) => setWeight(e.target.value)} type="number" inputMode="decimal"
              className="mt-1 w-full rounded-xl bg-white/90 border border-petal/60 px-3 py-2 text-sm text-rose outline-none focus:ring-2 focus:ring-hotpink/30" />
          </div>
          <div>
            <label className="text-xs font-bold text-rose">Height ({unit === "metric" ? "cm" : "in"})</label>
            <input value={height} onChange={(e) => setHeight(e.target.value)} type="number" inputMode="decimal"
              className="mt-1 w-full rounded-xl bg-white/90 border border-petal/60 px-3 py-2 text-sm text-rose outline-none focus:ring-2 focus:ring-hotpink/30" />
          </div>
        </div>

        <button onClick={() => setStep(2)}
          className="bloom-luxury-btn animate-cta-bounce inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white">
          Next — pick your shape <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Step 2 — shape picker + inline proposition */}
      {step === 2 && (
        <div className="rounded-3xl bg-white/85 backdrop-blur border border-petal/60 p-4 animate-scale-in">
          <p className="text-[10px] font-bold uppercase tracking-wider text-rose/50 mb-0.5">Step 2</p>
          <h2 className="font-script text-xl text-hotpink leading-none mb-1">Your shape</h2>
          <p className="text-xs text-rose/70 mb-3 leading-snug">
            {suggested
              ? `Based on your numbers we suggest ${BODY_TYPES[suggested].label} — tap another if it feels more like you.`
              : "Tap the shape that feels most like you."}
          </p>

          {(() => {
            const keys = Object.keys(BODY_TYPES) as BodyType[];
            const activeIndex = active ? keys.indexOf(active) : -1;
            const activeRow = activeIndex >= 0 ? Math.floor(activeIndex / 2) : -1;
            return (
              <div className="grid grid-cols-2 gap-2">
                {keys.flatMap((key, i) => {
                  const bt = BODY_TYPES[key];
                  const isActive = active === key;
                  const row = Math.floor(i / 2);
                  const isLastInRow = i % 2 === 1 || i === keys.length - 1;
                  const items: React.ReactNode[] = [
                    <button key={key} onClick={() => setSelected(isActive ? null : key)}
                      className={["flex flex-col items-center gap-1 rounded-2xl border overflow-hidden shadow-sm transition active:scale-95",
                        isActive ? "bg-blush/70 border-hotpink/40 shadow-md shadow-hotpink/15 animate-selected-glow" : "bg-white/70 border-petal/50 hover:border-hotpink/40 hover:shadow-md hover:-translate-y-0.5"].join(" ")}
                    >
                      <div className="w-full aspect-square overflow-hidden">
                        <img src={bt.photo} alt={bt.label} className="w-full h-full object-contain object-center" />
                      </div>
                      <span className="text-[10px] font-semibold text-rose text-center leading-tight pb-2 px-1">{bt.label}</span>
                    </button>
                  ];
                  if (isLastInRow && row === activeRow && data) {
                    items.push(
                      <div key={`prop-${active}`} ref={propositionRef} className="col-span-2 rounded-2xl bg-blush/60 border border-petal/50 p-3 animate-scale-in">
                        <div className="flex gap-3 mb-3">
                          <div className="w-20 shrink-0 rounded-xl overflow-hidden border border-petal/50">
                            <img src={data.photo} alt={data.label} className="w-full h-full object-contain object-center" />
                          </div>
                          <div className="flex flex-col justify-center min-w-0">
                            <p className="font-bold text-rose mb-1">{data.label}</p>
                            <p className="text-xs text-rose/85 mb-2 leading-snug">{data.strengths}</p>
                            <p className="text-[10px] font-bold text-rose mb-1.5">Recommended</p>
                            <div className="flex flex-wrap gap-1.5">
                              {data.recommended.map((rec) => (
                                <span key={rec} className="rounded-full bg-white/90 border border-petal/60 px-2.5 py-0.5 text-[10px] font-semibold text-rose">
                                  {WORKOUT_INTENTIONS.find((w) => w.key === rec)?.label}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>
                        <button onClick={() => onStartWith("full-body", data.recommended[0])}
                          className="bloom-luxury-btn animate-cta-bounce inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white">
                          Start with this <ChevronRight className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    );
                  }
                  return items;
                })}
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
}

// ===================== MY PROGRAM =====================

function MyProgram({ profile, onStartSession, onOpenProgramSession, onBrowsePrograms }: {
  profile: WorkoutProfile;
  onStartSession: (s: WorkoutSession) => void;
  onOpenProgramSession: (programId: string, week: number, sessionIndex: number) => void;
  onBrowsePrograms: () => void;
}) {
  const [phase, setPhase] = useState<CyclePhase>("any");
  const [program, setProgram] = useLS<Record<string, DayPlan | null> | null>(PROGRAM_KEY, null);
  const [programPhase, setProgramPhase] = useLS<CyclePhase | null>(PROGRAM_PHASE_KEY, null);
  const [active, setActive] = useState(() => loadActiveProgram());
  const [confirmFreestyle, setConfirmFreestyle] = useState(false);
  const [seed, setSeed] = useLS<number>("bloom:workout-freestyle-seed", 0);

  useEffect(() => { setPhase(readCyclePhase() ?? "any"); }, []);

  // Re-read the plan when it changes elsewhere (e.g. the hero's "sync to phase"
  // pill regenerates the week) so the grid reflects it live.
  useEffect(() => {
    const reload = () => {
      try { const v = localStorage.getItem(PROGRAM_KEY); setProgram(v && v !== "null" ? JSON.parse(v) : null); } catch {}
      try { const v = localStorage.getItem(PROGRAM_PHASE_KEY); setProgramPhase(v ? JSON.parse(v) : null); } catch {}
    };
    window.addEventListener("bloom:workout-updated", reload);
    return () => window.removeEventListener("bloom:workout-updated", reload);
  }, [setProgram, setProgramPhase]);

  // Body goal drives which recovery meals we surface after each session.
  const goal = readDietProfile().goal;
  // Shared preference: show recovery meals inside the plan, or keep it simple.
  const [fuelInPlan, setFuelInPlan] = useState(() => readFuelInPlan());
  const toggleFuel = () => { const v = !fuelInPlan; setFuelInPlan(v); writeFuelInPlan(v); };

  // Build-your-own-week: hand-pick a zone/intensity/duration per day.
  const [editing, setEditing] = useState(false);

  // "Goal-tuned" marker: set when we auto-generate the week to her diet goal,
  // cleared the moment she hand-edits it. Drives the soft badge + change warning.
  const [tunedGoal, setTunedGoal] = useState<string | null>(() => { try { return localStorage.getItem(WORKOUT_PLAN_GOAL_KEY); } catch { return null; } });
  const markTuned = () => { const g = readDietProfile().goal; try { localStorage.setItem(WORKOUT_PLAN_GOAL_KEY, g); } catch {} setTunedGoal(g); };
  const clearTuned = () => { try { localStorage.removeItem(WORKOUT_PLAN_GOAL_KEY); } catch {} setTunedGoal(null); };
  // A pending "this will change your plan" confirmation.
  const [confirmChange, setConfirmChange] = useState<null | { title: string; body: string; onYes: () => void }>(null);

  const activeProgram = active ? getProgram(active.programId) : null;
  const source: "program" | "freestyle" | "none" = activeProgram ? "program" : program ? "freestyle" : "none";

  // Coming from the Diet coach ("Set my workouts") → generate a proposed,
  // phase-aware week on arrival so she lands on a real plan, not an empty tool.
  useEffect(() => {
    try {
      if (!localStorage.getItem("bloom:workout-autoplan")) return;
      localStorage.removeItem("bloom:workout-autoplan");
      if (activeProgram || program) return; // never overwrite an existing plan
      const ph = readCyclePhase() ?? "any";
      setProgram(generateWeeklyPlan(profile, ph, seed + 1));
      setProgramPhase(ph);
      setSeed(seed + 1);
      markTuned();
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const todayKey = DAYS[(new Date().getDay() + 6) % 7]; // Mon..Sun

  // Start a blank custom week (leaves any active program) and open the editor.
  const buildMyOwn = () => {
    if (activeProgram) { saveActiveProgram(null); setActive(null); }
    const empty: Record<string, DayPlan | null> = {};
    DAYS.forEach((d) => { empty[d] = null; });
    setProgram(empty);
    setProgramPhase(phase);
    setEditing(true);
    clearTuned(); // hand-built → no longer auto-tuned
  };
  const clearWeek = () => {
    const empty: Record<string, DayPlan | null> = {};
    DAYS.forEach((d) => { empty[d] = null; });
    setProgram(empty);
    clearTuned();
  };
  const setDayPlan = (d: string, dp: DayPlan | null) => {
    const next = { ...(program ?? {}), [d]: dp };
    setProgram(next);
    clearTuned(); // a hand edit means it's her own plan now
    // useLS persists in an effect (deferred), so write + signal synchronously
    // here — the guided celebration reads the plan the instant this fires.
    try { localStorage.setItem(PROGRAM_KEY, JSON.stringify(next)); window.dispatchEvent(new Event("bloom:workout-updated")); } catch {}
  };

  // Generate a freestyle week (replaces an active program after confirmation).
  // The seed advances each time so "Regenerate" always yields a fresh, varied
  // — but still smart — week rather than the same deterministic plan.
  const generateFreestyle = () => {
    if (!isPremium()) { openPaywall("workout"); return; } // Bloom+ gate
    if (activeProgram) { saveActiveProgram(null); setActive(null); }
    const nextSeed = seed + 1;
    const wk = generateWeeklyPlan(profile, phase, nextSeed);
    setProgram(wk);
    setProgramPhase(phase);
    setSeed(nextSeed);
    setConfirmFreestyle(false);
    markTuned(); // a fresh generated week is tuned to her goal again
    // useLS persists in an effect (deferred) — write + signal synchronously so
    // the guided celebration sees the fresh plan immediately.
    try { localStorage.setItem(PROGRAM_KEY, JSON.stringify(wk)); window.dispatchEvent(new Event("bloom:workout-updated")); } catch {}
  };
  const goalWord = (g: string) => (g === "lose" ? "lean" : g === "gain" ? "build" : "maintain");
  // Regenerate replaces the whole week → always warn first.
  const onGenerateClick = () => {
    if (activeProgram) { setConfirmFreestyle(true); return; }
    if (!program) { generateFreestyle(); return; } // no plan yet → just build it
    setConfirmChange({
      title: "Regenerate your week?",
      body: `This replaces your current plan with a fresh week tuned to your ${goalWord(readDietProfile().goal)} goal. Your Diet calorie target updates to match.`,
      onYes: generateFreestyle,
    });
  };
  // Editing a goal-tuned week makes it her own → warn it drops the auto-tuning.
  const onEditClick = () => {
    if (tunedGoal) {
      setConfirmChange({
        title: "Customise this week?",
        body: `Editing makes it your own plan — it will no longer auto-follow your ${goalWord(tunedGoal)} goal, and your Diet calorie target updates to match your new week.`,
        onYes: () => { setEditing(true); clearTuned(); },
      });
    } else {
      setEditing(true);
    }
  };

  // ── Program → day mapping (sessions spread smartly across the week) ──────────
  const progDoneSet = activeProgram ? new Set(loadProgramProgress()[activeProgram.id] ?? []) : new Set<string>();
  const week = active?.week ?? 1;
  const programDay: Record<string, number | null> = {};
  if (activeProgram) {
    const activeDays = ACTIVE_DAY_PATTERNS[(activeProgram.daysPerWeek as 2 | 3 | 4 | 5)] ?? ACTIVE_DAY_PATTERNS[3];
    DAYS.forEach((d) => { programDay[d] = null; });
    activeDays.forEach((d, i) => { if (i < activeProgram.template.length) programDay[d] = i; });
  }
  const weekComplete = activeProgram ? activeProgram.template.every((_, i) => progDoneSet.has(sessionTag(week, i))) : false;
  const overallDone = activeProgram ? (loadProgramProgress()[activeProgram.id] ?? []).length : 0;
  const overallTotal = activeProgram ? activeProgram.weeks * activeProgram.template.length : 0;
  const wMeta = activeProgram ? weekMeta(activeProgram, week) : null;


  return (
    <div className="space-y-4">

      {/* ── Plan header — compact, image LEFT · content RIGHT (no full-width banner) ── */}
      {source === "program" && activeProgram && (
        <section className="rounded-3xl bg-white/95 backdrop-blur-md border border-petal/60 shadow-sm overflow-hidden">
          <div className="flex">
            <div className="relative w-24 sm:w-28 shrink-0 self-stretch overflow-hidden">
              <img src={activeProgram.image} alt="" className="absolute inset-0 h-full w-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/45 to-transparent" />
            </div>
            <div className="flex-1 min-w-0 p-3 sm:p-3.5 space-y-2">
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-wider text-hotpink">My plan · Week {week} of {activeProgram.weeks}{wMeta?.isDeload ? " · recovery" : ""}</p>
                <h2 className="font-script text-xl sm:text-2xl text-hotpink leading-none">{activeProgram.title}</h2>
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-rose/60">{wMeta?.theme}</p>
                  <p className="text-[10px] font-semibold text-rose/60">{overallDone}/{overallTotal} done</p>
                </div>
                <div className="h-1.5 rounded-full bg-blush overflow-hidden">
                  <div className="h-full bg-hotpink transition-all" style={{ width: `${overallTotal ? Math.round((overallDone / overallTotal) * 100) : 0}%` }} />
                </div>
              </div>
              {/* Week chips */}
              <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                {Array.from({ length: activeProgram.weeks }, (_, i) => i + 1).map((w) => (
                  <button key={w} onClick={() => { const next = { ...active!, week: w }; saveActiveProgram(next); setActive(next); }}
                    className={["shrink-0 rounded-xl px-2.5 py-1 text-[11px] font-bold border transition", w === week ? "bg-hotpink text-white border-hotpink" : "bg-white/80 text-rose border-petal/60 hover:border-hotpink/40"].join(" ")}>W{w}</button>
                ))}
              </div>
            </div>
          </div>
          {/* Status — the same four elegant tiles, full width (Goal · Level · Streak · Progress) */}
          <div className="px-3.5 pb-3.5 pt-0.5 space-y-2.5">
            <div className="grid grid-cols-4 gap-2">
              <div className="rounded-2xl border border-petal/60 bg-white/95 p-2.5 flex flex-col items-center justify-center text-center gap-1">
                <span className="grid h-8 w-8 place-items-center rounded-full bg-blush text-hotpink"><Sparkles className="h-4 w-4" strokeWidth={2.2} /></span>
                <span className="text-[8.5px] font-bold uppercase tracking-wider text-rose/55 leading-none">Goal</span>
                <span className="text-[12.5px] font-black text-hotpink leading-tight">{goalWord(readDietProfile().goal).charAt(0).toUpperCase() + goalWord(readDietProfile().goal).slice(1)}</span>
              </div>
              <div className="rounded-2xl border border-petal/60 bg-white/95 p-2.5 flex flex-col items-center justify-center text-center gap-1">
                <span className="grid h-8 w-8 place-items-center rounded-full bg-gradient-to-br from-hotpink to-rose text-white"><BloomFlower size={15} /></span>
                <span className="text-[8.5px] font-bold uppercase tracking-wider text-rose/55 leading-none">Level</span>
                <span className="text-[12.5px] font-black text-hotpink leading-tight">Lvl {readMovementLevel().level}</span>
              </div>
              <div className="rounded-2xl border border-petal/60 bg-white/95 p-2.5 flex flex-col items-center justify-center text-center gap-1">
                <span className="grid h-8 w-8 place-items-center rounded-full bg-blush text-hotpink"><Flame className="h-4 w-4" fill={readWorkoutStreak().count > 0 ? "currentColor" : "none"} strokeWidth={2} /></span>
                <span className="text-[8.5px] font-bold uppercase tracking-wider text-rose/55 leading-none">Streak</span>
                <span className="text-[12.5px] font-black text-hotpink leading-tight">{readWorkoutStreak().count}{readWorkoutStreak().count === 1 ? " day" : " days"}</span>
              </div>
              <div className="rounded-2xl border border-petal/60 bg-white/95 p-2.5 flex flex-col items-center justify-center text-center gap-1">
                <span className="grid h-8 w-8 place-items-center rounded-full bg-blush text-hotpink"><Trophy className="h-4 w-4" strokeWidth={2} /></span>
                <span className="text-[8.5px] font-bold uppercase tracking-wider text-rose/55 leading-none">Progress</span>
                <span className="text-[12.5px] font-black text-hotpink leading-tight">{overallDone}/{overallTotal}</span>
              </div>
            </div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <button onClick={onBrowsePrograms} className="rounded-full border border-petal/60 bg-white/90 px-3 py-1.5 text-[11px] font-bold text-hotpink transition hover:border-hotpink/40 active:scale-95">Change program</button>
              <button onClick={buildMyOwn} className="rounded-full border border-petal/60 bg-white/90 px-3 py-1.5 text-[11px] font-bold text-hotpink transition hover:border-hotpink/40 active:scale-95">Build my own</button>
              <button onClick={() => { saveActiveProgram(null); setActive(null); }} className="rounded-full border border-petal/50 bg-white/70 px-3 py-1.5 text-[11px] font-bold text-rose/50 transition hover:text-hotpink active:scale-95">Leave</button>
              <button onClick={toggleFuel} title={fuelInPlan ? "Recovery meals shown in plan" : "Show recovery meals in the plan"} className={["ml-auto grid h-8 w-8 place-items-center rounded-full border transition active:scale-90", fuelInPlan ? "bg-hotpink border-hotpink text-white" : "border-petal/60 bg-white/85 text-rose/45 hover:text-hotpink"].join(" ")}><Utensils className="h-3.5 w-3.5" /></button>
            </div>
          </div>
        </section>
      )}

      {source === "freestyle" && (
        <section className="rounded-2xl bg-white/95 backdrop-blur-md border border-petal/60 shadow-sm px-3.5 py-3">
          {/* Header — title + compact actions moved up to the top-right */}
          <div className="flex items-center gap-2">
            <span className="clay-blob grid h-8 w-8 shrink-0 place-items-center rounded-full text-white"><CalendarHeart className="h-4 w-4" strokeWidth={1.8} /></span>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-bold text-rose leading-tight truncate">My plan · {editing ? "Edit your week" : tunedGoal ? "Goal-tuned week" : "Custom week"}</p>
              <p className="text-[10.5px] text-rose/65 leading-snug truncate">{editing ? "Pick a zone, feel & length for each day." : phase !== "any" ? `${PHASE_LABEL[phase]} phase` : "Your weekly plan"}</p>
            </div>
            {editing ? (
              <div className="flex items-center gap-1.5 shrink-0">
                <button onClick={clearWeek} className="rounded-full bg-white/90 border border-petal/60 px-3 py-1 text-[11px] font-bold text-rose/60 hover:text-hotpink">Clear</button>
                <button onClick={() => setEditing(false)} className="rounded-full bg-hotpink text-white px-3.5 py-1 text-[11px] font-bold shadow-sm">Done</button>
              </div>
            ) : (
              <div className="flex items-center gap-1 shrink-0">
                <button onClick={onEditClick} title="Edit your week" className="grid h-8 w-8 place-items-center rounded-full border border-petal/60 bg-white/85 text-hotpink transition hover:border-hotpink/40 active:scale-90"><Pencil className="h-3.5 w-3.5" /></button>
                <button onClick={onGenerateClick} title="Regenerate your week" className="grid h-8 w-8 place-items-center rounded-full border border-petal/60 bg-white/85 text-hotpink transition hover:border-hotpink/40 active:scale-90"><RotateCcw className="h-3.5 w-3.5" /></button>
                <button onClick={resetWorkoutTool} title="Reset — preview the first-time experience" className="grid h-8 w-8 place-items-center rounded-full border border-petal/50 bg-white/70 text-rose/45 transition hover:text-hotpink active:scale-90"><Trash2 className="h-3.5 w-3.5" /></button>
                <button onClick={toggleFuel} title={fuelInPlan ? "Recovery meals shown in plan" : "Show recovery meals in the plan"} className={["grid h-8 w-8 place-items-center rounded-full border transition active:scale-90", fuelInPlan ? "bg-hotpink border-hotpink text-white" : "border-petal/60 bg-white/85 text-rose/45 hover:text-hotpink"].join(" ")}><Utensils className="h-3.5 w-3.5" /></button>
              </div>
            )}
          </div>
          {/* Status — Goal · Level · Streak · Sync, as four bigger tiles */}
          {!editing && (
            <div className="mt-3 grid grid-cols-4 gap-2">
              <div className="rounded-2xl border border-petal/60 bg-white/95 p-2.5 flex flex-col items-center justify-center text-center gap-1">
                <span className="grid h-8 w-8 place-items-center rounded-full bg-blush text-hotpink"><Sparkles className="h-4 w-4" strokeWidth={2.2} /></span>
                <span className="text-[8.5px] font-bold uppercase tracking-wider text-rose/55 leading-none">Goal</span>
                <span className="text-[12.5px] font-black text-hotpink leading-tight">{tunedGoal ? (goalWord(tunedGoal).charAt(0).toUpperCase() + goalWord(tunedGoal).slice(1)) : "Free"}</span>
              </div>
              <div className="rounded-2xl border border-petal/60 bg-white/95 p-2.5 flex flex-col items-center justify-center text-center gap-1">
                <span className="grid h-8 w-8 place-items-center rounded-full bg-gradient-to-br from-hotpink to-rose text-white"><BloomFlower size={15} /></span>
                <span className="text-[8.5px] font-bold uppercase tracking-wider text-rose/55 leading-none">Level</span>
                <span className="text-[12.5px] font-black text-hotpink leading-tight">Lvl {readMovementLevel().level}</span>
              </div>
              <div className="rounded-2xl border border-petal/60 bg-white/95 p-2.5 flex flex-col items-center justify-center text-center gap-1">
                <span className="grid h-8 w-8 place-items-center rounded-full bg-blush text-hotpink"><Flame className="h-4 w-4" fill={readWorkoutStreak().count > 0 ? "currentColor" : "none"} strokeWidth={2} /></span>
                <span className="text-[8.5px] font-bold uppercase tracking-wider text-rose/55 leading-none">Streak</span>
                <span className="text-[12.5px] font-black text-hotpink leading-tight">{readWorkoutStreak().count}{readWorkoutStreak().count === 1 ? " day" : " days"}</span>
              </div>
              <WorkoutPhaseSyncPill variant="tile" />
            </div>
          )}
        </section>
      )}

      {/* ── Empty state — choose how to plan ────────────────────────────────── */}
      {source === "none" && (
        <section className={["rounded-3xl bg-white/95 backdrop-blur-md border border-petal/60 shadow-sm shadow-hotpink/10 p-4 sm:p-5 space-y-3", isGuided() ? "animate-section-attention" : ""].join(" ")}>
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h2 className="font-script text-2xl text-hotpink leading-none mb-1">Set up your weekly plan ✿</h2>
              <p className="text-sm text-rose/80">Choose one — your sessions appear day by day below, ready to start.</p>
            </div>
            <LevelStreak variant="chip" streak={readWorkoutStreak().count} />
          </div>
          <button onClick={onBrowsePrograms} className="w-full rounded-2xl bg-gradient-to-r from-hotpink/15 to-petal/30 border border-petal/60 p-3.5 flex items-center gap-3 text-left transition hover:-translate-y-0.5 active:scale-[0.99]">
            <span className="clay-blob grid h-10 w-10 shrink-0 place-items-center rounded-full text-white animate-icon-breathe"><Trophy className="h-5 w-5" strokeWidth={1.8} /></span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-rose">Follow a flagship program</p>
              <p className="text-[11px] text-rose/70 leading-snug">A structured multi-week journey, spread smartly across your week.</p>
            </div>
            <ChevronRight className="h-5 w-5 text-hotpink shrink-0" />
          </button>
          <button onClick={onGenerateClick} className="w-full rounded-2xl bg-white/90 border border-petal/60 p-3.5 flex items-center gap-3 text-left transition hover:-translate-y-0.5 active:scale-[0.99]">
            <span className="clay-blob grid h-10 w-10 shrink-0 place-items-center rounded-full text-white"><CalendarHeart className="h-5 w-5" strokeWidth={1.8} /></span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-rose">Generate a freestyle week</p>
              <p className="text-[11px] text-rose/70 leading-snug">One-tap auto plan from your level, goal, days/week and phase.</p>
            </div>
            <ChevronRight className="h-5 w-5 text-hotpink shrink-0" />
          </button>
          <button onClick={buildMyOwn} className="w-full rounded-2xl bg-white/90 border border-petal/60 p-3.5 flex items-center gap-3 text-left transition hover:-translate-y-0.5 active:scale-[0.99]">
            <span className="clay-blob grid h-10 w-10 shrink-0 place-items-center rounded-full text-white"><Dumbbell className="h-5 w-5" strokeWidth={1.8} /></span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-rose">Build my own week</p>
              <p className="text-[11px] text-rose/70 leading-snug">Hand-pick each day — e.g. glutes Mon, legs Wed, abs Fri.</p>
            </div>
            <ChevronRight className="h-5 w-5 text-hotpink shrink-0" />
          </button>
        </section>
      )}

      {/* ── The week, day by day — image LEFT · info RIGHT (vignette, not banner) ── */}
      {source !== "none" && (
        <section id="workout-week-plan" className="rounded-3xl bg-white/95 backdrop-blur-md border border-petal/60 shadow-sm shadow-hotpink/10 p-3 sm:p-4">
          {/* Edit-mode instruction — helps first-timers build their own week */}
          {editing && source === "freestyle" && (
            <div className="mb-2.5 flex items-start gap-2 rounded-2xl bg-blush/50 border border-petal/60 px-3.5 py-2.5 animate-fade-in">
              <Sparkles className="h-3.5 w-3.5 shrink-0 mt-0.5 text-hotpink" strokeWidth={2} />
              <p className="text-[11px] text-rose/80 leading-snug">
                Tap any day to pick its <b className="font-bold text-hotpink">zone</b>, <b className="font-bold text-hotpink">feel</b> &amp; <b className="font-bold text-hotpink">length</b>. Choose <b className="font-bold text-hotpink">Rest day</b> to clear one. Tap <b className="font-bold text-hotpink">Done</b> when it's yours.
              </p>
            </div>
          )}
          <div className="flex flex-col gap-2.5">
            {DAYS.map((d) => {
              const isToday = d === todayKey;
              const sIdx = source === "program" ? programDay[d] : null;
              const freeplan = source === "freestyle" ? program?.[d] ?? null : null;
              const hasSession = sIdx !== null && sIdx !== undefined || !!freeplan;

              // EDIT MODE — hand-pick zone · feel · length for this day
              if (editing && source === "freestyle") {
                const fp = freeplan;
                return (
                  <div key={d} className="rounded-2xl border border-petal/50 bg-white/70 p-2.5">
                    <div className="flex items-center gap-2">
                      <div className="w-9 shrink-0 text-center">
                        <p className={["text-[10px] font-bold uppercase tracking-wide", isToday ? "text-hotpink" : "text-rose/50"].join(" ")}>{d}</p>
                      </div>
                      <PickerField
                        title="Choose a zone"
                        className="flex-1 min-w-0"
                        value={fp?.zone ?? "rest"}
                        options={[{ value: "rest", label: "Rest day" }, ...ZONES.map((z) => ({ value: z.key, label: z.label }))]}
                        onChange={(z) => {
                          if (z === "rest") setDayPlan(d, null);
                          else setDayPlan(d, { zone: z as Zone, intention: fp?.intention ?? "tonify", durationMin: fp?.durationMin ?? 20 });
                        }}
                      />
                    </div>
                    {fp && (
                      <div className="mt-1.5 flex items-center gap-2 pl-11">
                        <PickerField
                          title="How should it feel?"
                          className="flex-1 min-w-0"
                          value={fp.intention}
                          options={WORKOUT_INTENTIONS.map((i) => ({ value: i.key, label: i.label }))}
                          onChange={(v) => setDayPlan(d, { ...fp, intention: v as WorkoutIntention })}
                        />
                        <PickerField
                          title="How long?"
                          className="w-[5.6rem] shrink-0"
                          value={String(fp.durationMin)}
                          options={[10, 20, 30].map((m) => ({ value: String(m), label: `${m} min` }))}
                          onChange={(v) => setDayPlan(d, { ...fp, durationMin: Number(v) as 10 | 20 | 30 })}
                        />
                      </div>
                    )}
                  </div>
                );
              }

              // Program session for the day
              let title = "", sub = "", mins = 0, done = false, onTap: (() => void) | null = null;
              let intensity: Intensity = "moderate";
              let image: string = HERO_IMAGES.session;
              let burnIntention: WorkoutIntention = "tonify";
              if (source === "program" && activeProgram && sIdx !== null && sIdx !== undefined) {
                const s = computeWeekSession(activeProgram, sIdx, week);
                title = s.title; sub = s.focus; mins = s.estMinutes;
                done = progDoneSet.has(sessionTag(week, sIdx));
                onTap = () => onOpenProgramSession(activeProgram.id, week, sIdx);
                intensity = workoutIntensity(s.title, s.focus);
                burnIntention = MET_INTENTION_FOR_INTENSITY[intensity];
                image = activeProgram.image;
              } else if (freeplan) {
                title = ZONES.find((z) => z.key === freeplan.zone)?.label ?? freeplan.zone;
                sub = WORKOUT_INTENTIONS.find((i) => i.key === freeplan.intention)?.label ?? "";
                mins = freeplan.durationMin;
                onTap = () => onStartSession(buildSession(freeplan.zone, freeplan.intention, freeplan.durationMin, profile.level, phase, profile.equipment));
                intensity = workoutIntensity(freeplan.intention, title);
                burnIntention = freeplan.intention;
                image = ZONES.find((z) => z.key === freeplan.zone)?.image ?? HERO_IMAGES.session;
              }

              const showFuel = fuelInPlan && hasSession && !done;

              // Rest day → simple compact row
              if (!hasSession) {
                return (
                  <div key={d} className="flex items-center gap-3 rounded-2xl border border-petal/50 bg-white/60 p-2.5">
                    <div className="w-11 shrink-0 text-center">
                      <p className={["text-[10px] font-bold uppercase tracking-wide", isToday ? "text-hotpink" : "text-rose/50"].join(" ")}>{d}</p>
                      {isToday && <p className="text-[8px] font-bold uppercase text-hotpink">Today</p>}
                    </div>
                    <div className="flex-1 text-[12px] font-semibold text-rose/45">Rest day ✿</div>
                  </div>
                );
              }

              // Session day → image LEFT, info (+ optional meals) RIGHT
              return (
                <div key={d} className={["flex rounded-2xl border overflow-hidden transition",
                  isToday ? "border-hotpink/60 shadow-md shadow-hotpink/10" : "border-petal/50"].join(" ")}>
                  {/* LEFT — session vignette (full height), tappable to start */}
                  <button onClick={onTap ?? undefined} className="relative w-24 sm:w-28 shrink-0 self-stretch overflow-hidden text-left active:scale-[0.99] transition">
                    <img src={image} alt="" className="absolute inset-0 h-full w-full object-cover object-center" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/10 to-transparent" />
                    <span className="absolute top-1.5 left-1.5 text-[9px] font-bold uppercase tracking-wide text-white/95 bg-black/35 rounded-full px-1.5 py-0.5">{d}{isToday ? " ·today" : ""}</span>
                    <span className={["absolute bottom-1.5 right-1.5 grid h-7 w-7 place-items-center rounded-full bg-white text-hotpink shadow", isToday && !done ? "animate-soft-zoom" : ""].join(" ")}>
                      {done ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : <Play className="h-3.5 w-3.5" fill="currentColor" strokeWidth={0} />}
                    </span>
                  </button>

                  {/* RIGHT — session title + (optional) meals */}
                  <div className="flex-1 min-w-0 bg-white/70">
                    <button onClick={onTap ?? undefined} className="block w-full text-left px-3 py-2.5 active:scale-[0.99] transition">
                      <p className={["text-sm font-bold leading-tight text-rose truncate", done ? "line-through text-rose/45" : ""].join(" ")}>{title}</p>
                      <p className="text-[11px] text-rose/60 leading-snug truncate">{sub}{mins ? ` · ${mins} min` : ""}{mins ? <> · <span className="font-semibold text-hotpink/80">~{plannedCalories(burnIntention, mins)} kcal</span></> : ""}</p>
                    </button>
                    {showFuel && (
                      <div className="border-t border-petal/50 bg-gradient-to-br from-blush/45 to-petal/20 p-2">
                        <FuelCard
                          ctx={{ goal, phase: normalizePhase(phase), kind: "workout", intensity, activityLabel: title }}
                          day={d}
                          heading={`After your ${title}`}
                          embedded
                        />
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Program week complete → advance */}
          {source === "program" && activeProgram && weekComplete && week < activeProgram.weeks && (
            <button onClick={() => { const next = { ...active!, week: week + 1 }; saveActiveProgram(next); setActive(next); }}
              className="bloom-luxury-btn animate-cta-bounce mt-3 w-full inline-flex items-center justify-center gap-2 py-3 text-sm font-bold text-white">
              <Trophy className="h-4 w-4" strokeWidth={2} /> Week {week} done — start Week {week + 1}
            </button>
          )}
          {source === "program" && activeProgram && weekComplete && week === activeProgram.weeks && (
            <div className="mt-3 rounded-2xl bg-gradient-to-r from-hotpink/15 to-petal/30 border border-petal/60 p-3 text-center">
              <p className="font-script text-xl text-hotpink leading-none">Program complete ✿</p>
              <p className="text-xs text-rose/75 mt-1">You finished all {activeProgram.weeks} weeks. Incredible work.</p>
            </div>
          )}
        </section>
      )}

      {/* ── Confirm: freestyle replaces an active program — portaled & centered ── */}
      {confirmChange && createPortal(
        <div className="fixed inset-0 z-[80] bg-black/40 backdrop-blur-sm grid place-items-center overflow-y-auto p-4 animate-fade-in" onClick={() => setConfirmChange(null)}>
          <div className="w-full max-w-xs my-auto rounded-3xl bg-white/97 border border-petal/60 shadow-2xl p-5 text-center animate-scale-in" onClick={(e) => e.stopPropagation()}>
            <p className="font-script text-2xl text-hotpink leading-none mb-2">{confirmChange.title}</p>
            <p className="text-sm text-rose/80 mb-4">{confirmChange.body}</p>
            <div className="flex gap-2">
              <button onClick={() => setConfirmChange(null)} className="flex-1 rounded-full bg-white/90 border border-petal/60 py-2.5 text-sm font-semibold text-rose">Cancel</button>
              <button onClick={() => { const a = confirmChange.onYes; setConfirmChange(null); a(); }} className="flex-1 bloom-luxury-btn py-2.5 text-sm font-bold text-white">Continue</button>
            </div>
          </div>
        </div>,
        document.body
      )}
      {confirmFreestyle && activeProgram && createPortal(
        <div className="fixed inset-0 z-[80] bg-black/40 backdrop-blur-sm grid place-items-center overflow-y-auto p-4 animate-fade-in" onClick={() => setConfirmFreestyle(false)}>
          <div className="w-full max-w-xs my-auto rounded-3xl bg-white/97 border border-petal/60 shadow-2xl p-5 text-center animate-scale-in" onClick={(e) => e.stopPropagation()}>
            <p className="font-script text-2xl text-hotpink leading-none mb-2">Replace your plan?</p>
            <p className="text-sm text-rose/80 mb-4">A freestyle week will replace your <span className="font-bold">{activeProgram.title}</span> plan. Your program progress is kept if you come back to it.</p>
            <div className="flex gap-2">
              <button onClick={() => setConfirmFreestyle(false)} className="flex-1 rounded-full bg-white/90 border border-petal/60 py-2.5 text-sm font-semibold text-rose">Cancel</button>
              <button onClick={generateFreestyle} className="flex-1 bloom-luxury-btn py-2.5 text-sm font-bold text-white">Replace</button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

// ===================== LIBRARY =====================

function Library() {
  const [zone, setZone] = useState<Zone>("glutes");
  const exercises = ZONE_EXERCISES[zone];
  const zoneMeta = ZONES.find((z) => z.key === zone);

  return (
    <div className="space-y-4">

      <section className="rounded-3xl bg-white/85 backdrop-blur border border-petal/60 p-4 sm:p-6">
        {/* Header */}
        <div className="flex items-end justify-between gap-3 mb-3">
          <div>
            <h2 className="font-script text-2xl sm:text-3xl text-hotpink leading-none">Move Library ✿</h2>
            <p className="text-[11px] sm:text-xs text-rose/60 mt-0.5">Tap any move for a how-to, form cues & the mistake to avoid.</p>
          </div>
          <span className="shrink-0 rounded-full bg-blush/70 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-hotpink">{exercises.length} moves</span>
        </div>

        {/* Zone chips with icons */}
        <div className="flex gap-1.5 overflow-x-auto pb-1.5 mb-4 scrollbar-none -mx-1 px-1">
          {ZONES.map((z) => {
            const Icon = z.icon;
            const active = zone === z.key;
            return (
              <button
                key={z.key}
                onClick={() => setZone(z.key)}
                className={[
                  "shrink-0 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold border shadow-sm transition active:scale-95",
                  active ? "bg-hotpink text-white border-transparent shadow-md shadow-hotpink/30" : "bg-white/85 text-rose border-petal/60 hover:border-hotpink/40 hover:shadow-md",
                ].join(" ")}
              >
                <Icon className={["h-3.5 w-3.5", active ? "text-white" : "text-hotpink"].join(" ")} strokeWidth={1.8} />
                {z.label}
              </button>
            );
          })}
        </div>

        <p className="mb-3 text-[11px] font-bold uppercase tracking-wider text-hotpink/60">{zoneMeta?.label}</p>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {exercises.map((ex, i) => (
            <ExerciseLibraryCard key={ex.slug} exercise={ex} zone={zone} index={i} />
          ))}
        </div>
      </section>
    </div>
  );
}

function ExerciseLibraryCard({ exercise, zone, index }: { exercise: Exercise; zone: Zone; index: number }) {
  const [open, setOpen] = useState(false);
  const coaching = getCoaching(exercise.slug);
  return (
    <div
      className={[
        "rounded-2xl sm:rounded-3xl bg-white/90 backdrop-blur border overflow-hidden shadow-md shadow-rose/10 animate-card-pop-in transition",
        open ? "border-hotpink/50 shadow-lg col-span-2 sm:col-span-3 lg:col-span-4" : "border-petal/60 hover:-translate-y-1 hover:shadow-lg",
      ].join(" ")}
      style={{ animationDelay: `${index * 0.05}s` }}
    >
      <button onClick={() => setOpen((v) => !v)} className="block w-full text-left active:scale-[0.99] transition">
        <div className={open ? "flex items-stretch gap-3" : ""}>
          <div className={open ? "w-32 sm:w-44 shrink-0" : ""}>
            <ExercisePhoto exercise={exercise} zone={zone} className="aspect-square w-full object-cover" />
          </div>
          <div className={open ? "flex-1 min-w-0 py-3 pr-3 flex flex-col justify-center" : "p-2.5"}>
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-sm font-bold text-rose leading-tight">{exercise.name}</p>
                <p className="mt-0.5 text-[11px] text-rose/70 leading-snug">{exercise.muscles}</p>
              </div>
              {open
                ? <ChevronDown className="h-4 w-4 text-hotpink shrink-0 rotate-180 transition" strokeWidth={2.5} />
                : <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-blush/70 text-hotpink"><ChevronDown className="h-3.5 w-3.5" strokeWidth={2.5} /></span>}
            </div>
            {open && coaching && (
              <p className="mt-2 hidden sm:block text-xs text-rose/85 leading-snug">{coaching.howTo}</p>
            )}
          </div>
        </div>
      </button>

      {open && coaching && (
        <div className="border-t border-petal/40 px-3 sm:px-4 py-3 animate-fade-in space-y-3">
          <p className="sm:hidden text-xs text-rose/85 leading-snug">{coaching.howTo}</p>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-hotpink mb-1">Form cues</p>
            <ul className="grid sm:grid-cols-2 gap-x-4 gap-y-1">
              {coaching.cues.map((c) => (
                <li key={c} className="flex items-start gap-2 text-xs text-rose/85 leading-snug">
                  <Check className="h-3.5 w-3.5 text-hotpink shrink-0 mt-0.5" strokeWidth={3} /> {c}
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-2xl bg-blush/50 border border-petal/50 px-3 py-2">
            <p className="text-[10px] font-bold uppercase tracking-wider text-hotpink mb-0.5">Avoid this</p>
            <p className="text-xs text-rose/80 leading-snug">{coaching.mistake}</p>
          </div>
        </div>
      )}
    </div>
  );
}

// ===================== SESSION MODE =====================

function SessionStart({ session, onStart, onExit }: { session: WorkoutSession; onStart: () => void; onExit: () => void }) {
  const [phase, setPhase] = useState<CyclePhase>("any");
  const [voice, setVoice] = useLS<boolean>(VOICE_KEY, true);
  const [musicTrack, setMusicTrack] = useLS<number>(MUSIC_KEY, 0);
  useEffect(() => { setPhase(readCyclePhase() ?? "any"); }, []);
  const zone = ZONES.find((z) => z.key === session.zone);
  const intention = WORKOUT_INTENTIONS.find((i) => i.key === session.intention);
  const first = session.exercises[0];
  const warmCount = session.steps.filter((s) => s.kind === "warmup").length;
  const coolCount = session.steps.filter((s) => s.kind === "cooldown").length;

  // Unique moves across the whole session (warm-up → work → cool-down), in order.
  const uniqueMoves = (() => {
    const seen = new Set<string>();
    return session.steps.filter((s) => { if (seen.has(s.exercise.slug)) return false; seen.add(s.exercise.slug); return true; });
  })();

  return (
    <div className="fixed inset-0 z-[60] bg-blush/95 backdrop-blur grid place-items-start sm:place-items-center p-3 sm:p-4 overflow-y-auto" style={{ paddingTop: "max(0.75rem, env(safe-area-inset-top))" }}>
      <div className="relative w-full max-w-md rounded-3xl bg-white/97 border border-petal/60 shadow-2xl overflow-hidden my-4 sm:my-8 animate-scale-in">
        {/* Hero */}
        <div className="relative aspect-[16/10] overflow-hidden">
          <ExercisePhoto exercise={first} zone={session.zone} className="absolute inset-0 h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-black/10" />
          <button onClick={onExit} aria-label="Close" className="absolute right-3 top-3 rounded-full bg-white/90 p-2 text-rose border border-petal/60 active:scale-90"><X className="h-4 w-4" /></button>
          {phase !== "any" && session.phaseOptimal.includes(phase) && (
            <span className="absolute top-3 left-3 rounded-full bg-hotpink/90 text-white text-[9px] font-bold uppercase tracking-wide px-2.5 py-1 shadow-sm">✿ {PHASE_LABEL[phase]} optimized</span>
          )}
          <div className="absolute bottom-0 inset-x-0 p-4">
            <div className="flex flex-wrap gap-1.5 mb-1.5">
              {zone && <span className="rounded-full bg-white/90 text-hotpink text-[9px] font-bold uppercase tracking-wide px-2 py-0.5">{zone.label}</span>}
              {intention && <span className="rounded-full bg-white/90 text-hotpink text-[9px] font-bold uppercase tracking-wide px-2 py-0.5">{intention.label}</span>}
            </div>
            <h1 className="font-script text-3xl sm:text-4xl text-white leading-none drop-shadow">{session.name}</h1>
            <p className="text-[11px] sm:text-xs text-white/90 mt-1 drop-shadow">{session.durationMin} min · {session.level} · {session.structureNote}</p>
          </div>
        </div>

        <div className="p-4 sm:p-5 space-y-4">
          {/* What's inside */}
          <div className="rounded-2xl bg-blush/40 border border-petal/50 p-3 text-left">
            <p className="text-[11px] font-bold uppercase tracking-wide text-hotpink/70 mb-1.5">What's inside</p>
            <ul className="space-y-1 text-xs text-rose/80">
              {warmCount > 0 && <li className="flex items-center gap-2"><span className="grid h-5 w-5 place-items-center rounded-full bg-petal/60 text-hotpink text-[10px] font-bold">1</span> Warm-up · {warmCount} move{warmCount > 1 ? "s" : ""}</li>}
              <li className="flex items-center gap-2"><span className="grid h-5 w-5 place-items-center rounded-full bg-hotpink text-white text-[10px] font-bold">{warmCount > 0 ? 2 : 1}</span> {session.rounds} round{session.rounds > 1 ? "s" : ""} × {session.exercises.length} moves · {session.workSec}s work / {session.restSec}s rest</li>
              {coolCount > 0 && <li className="flex items-center gap-2"><span className="grid h-5 w-5 place-items-center rounded-full bg-petal/60 text-hotpink text-[10px] font-bold">{warmCount > 0 ? 3 : 2}</span> Cool-down · {coolCount} stretch{coolCount > 1 ? "es" : ""}</li>}
            </ul>
          </div>

          {/* Moves preview */}
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wide text-hotpink/70 mb-2">The moves · {uniqueMoves.length}</p>
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
              {uniqueMoves.map((s, i) => (
                <div key={`${s.exercise.slug}-${i}`} className="shrink-0 w-20 text-center">
                  <div className="relative h-20 w-20 rounded-2xl overflow-hidden border border-petal/50">
                    <ExercisePhoto exercise={s.exercise} zone={session.zone} className="h-full w-full object-cover" />
                    {s.kind !== "work" && (
                      <span className="absolute bottom-0 inset-x-0 bg-black/55 text-white text-[7px] font-bold uppercase tracking-wide py-0.5">{s.kind === "warmup" ? "Warm-up" : "Cool-down"}</span>
                    )}
                  </div>
                  <p className="mt-1 text-[9px] font-semibold text-rose/75 leading-tight line-clamp-2">{s.exercise.name}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Sound — choose the background music and turn voice coaching on/off */}
          <div className="rounded-2xl bg-white border border-petal/50 p-3 text-left space-y-2.5">
            <button onClick={() => setVoice((v) => !v)} className="w-full flex items-center justify-between gap-3 active:scale-[0.99] transition">
              <span className="flex items-center gap-2 text-xs font-bold text-rose">
                {voice ? <Volume2 className="h-4 w-4 text-hotpink" /> : <VolumeX className="h-4 w-4 text-rose/40" />} Voice coaching cues
              </span>
              <span className={["relative h-5 w-9 shrink-0 rounded-full transition-colors", voice ? "bg-hotpink" : "bg-rose/25"].join(" ")}>
                <span className="absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all" style={{ left: voice ? "1.125rem" : "0.125rem" }} />
              </span>
            </button>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wide text-rose/45 mb-1.5">Background music</p>
              <div className="flex flex-wrap gap-1.5">
                {MUSIC_LABELS.map((label, i) => (
                  <button key={i} onClick={() => setMusicTrack(i)}
                    className={["rounded-full px-2.5 py-1 text-[11px] font-bold border transition active:scale-95",
                      i === musicTrack ? "bg-hotpink text-white border-hotpink shadow-sm shadow-hotpink/30" : "bg-white text-rose border-petal/60 hover:border-hotpink/40"].join(" ")}>
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <button onClick={onStart} className="bloom-luxury-btn animate-cta-bounce w-full inline-flex items-center justify-center gap-2 py-3.5 text-base font-bold text-white">
            <Play className="h-5 w-5" fill="currentColor" strokeWidth={0} /> Start session
          </button>
        </div>
      </div>
    </div>
  );
}

type ExercisePhase = "exercise" | "rest";

// Falling flower petals — a soft Bloomzein celebration over the whole screen.
function PetalBurst({ count = 18, z = 70 }: { count?: number; z?: number }) {
  const petals = useMemo(() => Array.from({ length: count }, () => ({
    left: Math.random() * 100,
    delay: Math.random() * 0.7,
    dur: 2.6 + Math.random() * 2.2,
    size: 12 + Math.random() * 20,
    rot: Math.random() * 360,
    color: Math.random() > 0.5 ? "#EC4899" : Math.random() > 0.5 ? "#F9A8D4" : "#FBCFE8",
    char: ["✿", "❀", "🌸"][Math.floor(Math.random() * 3)],
  })), [count]);
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 overflow-hidden" style={{ zIndex: z }}>
      {petals.map((p, i) => (
        <span key={i} className="absolute -top-6" style={{
          left: `${p.left}%`, fontSize: p.size, color: p.color, lineHeight: 1,
          transform: `rotate(${p.rot}deg)`,
          animation: `wk-petal-fall ${p.dur}s linear ${p.delay}s forwards`,
        }}>{p.char}</span>
      ))}
    </div>
  );
}

/** A cute Bloomzein intro: the flower blooms in, a warm line, then 3·2·1·GO. */
function BloomIntro({ title, count }: { title: string; count: number | "go" | null }) {
  return (
    <div className="absolute inset-0 z-[30] grid place-items-center bg-gradient-to-b from-hotpink/92 via-hotpink/80 to-[#DB2777]/92 backdrop-blur-sm text-center px-6">
      {count == null ? (
        <div className="animate-wk-bloom-in">
          <span className="clay-blob mx-auto grid h-24 w-24 sm:h-28 sm:w-28 place-items-center rounded-[1.75rem] text-white shadow-2xl">
            <BloomFlower size={54} />
          </span>
          <p className="mt-4 font-script text-4xl sm:text-5xl text-white leading-none drop-shadow">Let's bloom ✿</p>
          <p className="mt-1.5 text-sm sm:text-base font-bold text-white/90 drop-shadow">{title}</p>
        </div>
      ) : (
        <span key={String(count)} className="animate-wk-count-in font-script text-white leading-none drop-shadow-[0_4px_16px_rgba(0,0,0,0.35)]"
          style={{ fontSize: count === "go" ? "6rem" : "9rem" }}>
          {count === "go" ? "GO ✿" : count}
        </span>
      )}
    </div>
  );
}

// ── Live-session content + dashboard pieces ─────────────────────────────────
// Warm lines the Bloom Coach speaks (rotate through the session, stable per step).
const WK_COACH_LINES = [
  "You've got this — control the movement and breathe. 💗",
  "Beautiful form! Squeeze at the top and stay tall. ✨",
  "Great job! Slow and steady — you're doing amazing. 🌸",
  "Keep breathing, keep blooming. So strong. ✿",
  "Lift with control and own every rep. You glow. 🌷",
];
// Affirmations for the banner across the photo.
const WK_AFFIRMATIONS = [
  "Every repetition is a promise you keep to yourself. ✨",
  "Soft body, strong spirit — you're blooming. 🌸",
  "This is your time. Breathe deep and rise. ✿",
  "Strong is the softest thing you can be. 💗",
  "One move closer to the woman you're becoming. 🌷",
];
// Emphasis weights for the muscle-target bars (primary → supporting muscles).
const WK_MT_PCT = [88, 64, 46, 34];
const WK_FAV_KEY = "bloom:workout-favorites";

/** Split "Glutes, hamstrings, core (mobility)" → ["Glutes","hamstrings","core"]. */
function parseMuscles(s: string): string[] {
  return s.replace(/\(.*?\)/g, "").split(/[,/]/).map((m) => m.trim()).filter(Boolean);
}
const cap = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

/** A soft translucent glass panel — the building block for every side card. */
function GlassCard({ icon: Icon, title, children, className = "", delay = 0 }: {
  icon?: any; title?: string; children: React.ReactNode; className?: string; delay?: number;
}) {
  return (
    <div
      className={["rounded-[1.5rem] bg-white/65 backdrop-blur-md border border-white/70 shadow-[0_10px_30px_rgba(236,72,153,0.13)] p-3.5 sm:p-4 animate-fade-in", className].join(" ")}
      style={{ animationDelay: `${delay}ms` }}
    >
      {title && (
        <p className="flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-[0.16em] text-hotpink/70 mb-3">
          {Icon && <span className="grid h-6 w-6 place-items-center rounded-full bg-hotpink/12 text-hotpink"><Icon className="h-3.5 w-3.5" /></span>}
          {title}
        </p>
      )}
      {children}
    </div>
  );
}

/** The big circular progress ring — shows the live rep count (or seconds on a
 *  hold / rest) with a soft pink track, matching the reference dashboard. */
function RepRing({ rep, total, seconds, percent, size = 168, label }: {
  rep?: number; total?: number; seconds?: number; percent: number; size?: number; label: string;
}) {
  const stroke = Math.max(8, Math.round(size / 15));
  const r = size / 2 - stroke;
  const c = 2 * Math.PI * r;
  const off = c * (1 - Math.min(1, Math.max(0, percent)));
  const showReps = rep != null && total != null && total > 0;
  return (
    <div className="relative mx-auto" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} stroke="oklch(0.93 0.035 350)" strokeWidth={stroke} fill="none" />
        <circle cx={size / 2} cy={size / 2} r={r} stroke="oklch(0.65 0.24 350)" strokeWidth={stroke} fill="none"
          strokeDasharray={c} strokeDashoffset={off} strokeLinecap="round" style={{ transition: "stroke-dashoffset 1s linear" }} />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center leading-none px-2">
        <div>
          <p className="text-[9px] font-extrabold uppercase tracking-[0.18em] text-hotpink/70">{showReps ? "Rep" : label}</p>
          {showReps ? (
            <p className="mt-1 whitespace-nowrap">
              <span key={rep} className="font-black text-rose tabular-nums animate-wk-rep-pop" style={{ fontSize: size * 0.3 }}>{rep}</span>
              <span className="font-bold text-rose/45 tabular-nums" style={{ fontSize: size * 0.16 }}> / {total}</span>
            </p>
          ) : (
            <p className="mt-1 font-black text-rose tabular-nums" style={{ fontSize: size * 0.32 }}>{seconds}</p>
          )}
          <p className="mt-1 text-[9px] font-extrabold uppercase tracking-[0.13em] text-hotpink">{Math.round(percent * 100)}% <span className="text-hotpink/55">complete</span></p>
        </div>
      </div>
    </div>
  );
}

/** Today's-focus + muscle-target + coach-tip cards (shared by the rails so the
 *  desktop, tablet and phone layouts all read from one place). */
function FocusCard({ primary, zone, delay }: { primary: string; zone?: Zone; delay?: number }) {
  return (
    <GlassCard icon={Target} title="Today's focus" delay={delay}>
      <div className="flex items-center gap-3">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-petal to-hotpink/70 text-white shadow-sm"><Flame className="h-5 w-5" /></span>
        <div className="min-w-0">
          <p className="font-script text-2xl text-hotpink leading-none truncate">{cap(primary)}</p>
          <p className="text-[11px] font-semibold text-rose/60">Primary muscles</p>
        </div>
      </div>
    </GlassCard>
  );
}
function MuscleTargetCard({ muscles, delay }: { muscles: string[]; delay?: number }) {
  const list = (muscles.length ? muscles : ["Full body"]).slice(0, 4);
  return (
    <GlassCard icon={Activity} title="Muscle target" delay={delay}>
      <div className="space-y-2.5">
        {list.map((m, i) => (
          <div key={m + i}>
            <div className="flex items-center justify-between text-[11px] font-bold text-rose mb-1">
              <span className="truncate">{cap(m)}</span>
              <span className="text-hotpink tabular-nums">{WK_MT_PCT[i] ?? 30}%</span>
            </div>
            <div className="h-2 rounded-full bg-hotpink/10 overflow-hidden">
              <div className="h-full rounded-full bg-gradient-to-r from-petal to-hotpink transition-all duration-700" style={{ width: `${WK_MT_PCT[i] ?? 30}%` }} />
            </div>
          </div>
        ))}
      </div>
    </GlassCard>
  );
}
function CoachTipCard({ tip, delay }: { tip: string; delay?: number }) {
  if (!tip) return null;
  return (
    <GlassCard icon={Lightbulb} title="Coach tip" delay={delay}>
      <p className="text-[13px] leading-snug font-medium text-rose/85">{tip}</p>
    </GlassCard>
  );
}
function NextUpCard({ next, zone, reps, delay }: { next: Exercise; zone?: Zone; reps?: string; delay?: number }) {
  return (
    <GlassCard icon={ChevronRight} title="Next up" delay={delay}>
      <div className="flex items-center gap-3">
        <ExercisePhoto exercise={next} zone={zone} className="h-14 w-14 shrink-0 object-cover rounded-2xl border border-petal/60" />
        <div className="min-w-0">
          <p className="text-sm font-bold text-rose leading-tight truncate">{next.name}</p>
          {reps && <p className="text-[11px] font-semibold text-hotpink mt-0.5">{reps}</p>}
        </div>
      </div>
    </GlassCard>
  );
}
function FormReminderCard({ cues, delay }: { cues: string[]; delay?: number }) {
  if (!cues.length) return null;
  return (
    <GlassCard icon={ShieldCheck} title="Form reminder" delay={delay}>
      <ul className="space-y-2">
        {cues.map((c, i) => (
          <li key={i} className="flex items-start gap-2 text-[12px] font-medium text-rose/85 leading-snug">
            <span className="mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full bg-hotpink text-white"><Check className="h-2.5 w-2.5" strokeWidth={3} /></span>
            {c}
          </li>
        ))}
      </ul>
    </GlassCard>
  );
}

/** One control in the glossy bottom bar (Previous / Skip / Voice / Favorite). */
function WkCtrl({ icon: Icon, label, onClick, active, disabled }: {
  icon: any; label: string; onClick: () => void; active?: boolean; disabled?: boolean;
}) {
  return (
    <button onClick={onClick} disabled={disabled} aria-label={label}
      className="flex flex-col items-center gap-1 px-1 sm:px-2 disabled:opacity-40 active:scale-90 transition">
      <span className={["grid h-10 w-10 sm:h-11 sm:w-11 place-items-center rounded-full border transition",
        active ? "bg-hotpink text-white border-hotpink shadow-md" : "bg-white/70 border-white/70 text-rose"].join(" ")}>
        <Icon className={["h-5 w-5", active && label === "Favorite" ? "fill-current" : ""].join(" ")} />
      </span>
      <span className="text-[10px] sm:text-[11px] font-semibold text-rose/80">{label}</span>
    </button>
  );
}

function SessionActive({ session, onExit, onDone }: {
  session: WorkoutSession;
  onExit: () => void;
  onDone: (elapsedSec: number) => void;
}) {
  const steps = session.steps;
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<ExercisePhase>("exercise");
  const [remaining, setRemaining] = useState(steps[0]?.workSec ?? session.workSec);
  const [paused, setPaused] = useState(false);
  const [starting, setStarting] = useState(true);             // cute intro / 3·2·1
  const [intro, setIntro] = useState<number | "go" | null>(null); // countdown digit
  const [goFlash, setGoFlash] = useState(0);                  // "GO ✿" flash key per move
  const [celebrate, setCelebrate] = useState(false);         // petal burst on milestones
  const [sound, setSound] = useLS<boolean>(SOUND_KEY, true);   // master mute
  const [voice, setVoice] = useLS<boolean>(VOICE_KEY, true);   // spoken cues on/off
  const [musicTrack] = useLS<number>(MUSIC_KEY, 0);           // chosen background track
  const [favs, setFavs] = useLS<string[]>(WK_FAV_KEY, []);    // saved moves (heart)
  const elapsedRef = useRef(0);
  const audioRef = useRef<HTMLAudioElement>(null);
  const cueRef = useRef<HTMLAudioElement>(null); // spoken per-move / rest cues
  // The user's chosen background track — one coherent bed for the whole session.
  const musicSrc = WORKOUT_MUSIC[musicTrack] ?? WORKOUT_MUSIC[0];

  const step = steps[index];
  const nextStepObj = steps[index + 1];
  const exercise = step.exercise;
  const next = nextStepObj?.exercise;

  // Scan the current photo for its baked-in magenta muscle-glow, so we can pulse
  // ONLY that spot (and size the overlay box to the image, since it's contained).
  const [glow, setGlow] = useState<{ cx: number; cy: number; r: number; aspect: number } | null>(null);
  useEffect(() => {
    let cancelled = false;
    setGlow(null);
    const img = new Image();
    img.onload = () => {
      try {
        const W = 140, H = Math.max(1, Math.round(140 * img.naturalHeight / img.naturalWidth));
        const c = document.createElement("canvas"); c.width = W; c.height = H;
        const g = c.getContext("2d", { willReadFrequently: true }); if (!g) return;
        g.drawImage(img, 0, 0, W, H);
        const px = g.getImageData(0, 0, W, H).data;
        // Weighted centroid of the magenta muscle-highlight. Brightness SQUARED
        // so the brightest glow wins over the flatter pink mat/outfit. Try a
        // strict pass first, then a softer one so subtler photos still light up.
        const find = (magT: number, rT: number, brT: number) => {
          let sx = 0, sy = 0, sw = 0; const pts: [number, number, number][] = [];
          for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
            const i = (y * W + x) * 4, R = px[i], Gr = px[i + 1], B = px[i + 2];
            const magenta = R - Gr, bright = (R + B) / 2;
            if (magenta > magT && R > rT && B > 120 && bright > brT) {
              const w = (magenta - magT) * (bright / 255) * (bright / 255);
              sx += x * w; sy += y * w; sw += w; pts.push([x, y, w]);
            }
          }
          if (sw < 12 || pts.length < 8) return null;
          const cx = sx / sw, cy = sy / sw;
          let vr = 0, vw = 0; for (const [x, y, w] of pts) { vr += w * ((x - cx) ** 2 + (y - cy) ** 2); vw += w; }
          return { cx: cx / W, cy: cy / H, r: Math.min(0.26, Math.max(0.14, Math.sqrt(vr / vw) / W)) };
        };
        if (cancelled) return;
        const hit = find(92, 205, 190) ?? find(62, 190, 168);
        if (!hit) { setGlow(null); return; }
        setGlow({ ...hit, aspect: img.naturalWidth / img.naturalHeight });
      } catch { if (!cancelled) setGlow(null); }
    };
    img.onerror = () => { if (!cancelled) setGlow(null); };
    img.src = exercise.image;
    return () => { cancelled = true; };
  }, [exercise.image]);

  // Background music — plays while a move is running and sound is on; pauses on
  // pause/mute. play() is allowed because the session started from a tap.
  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    a.volume = MUSIC_VOL;
    if (sound && !paused) a.play().catch(() => {});
    else a.pause();
  }, [sound, paused]);

  // Cute Bloomzein entry: the flower blooms in, then 3 · 2 · 1 · GO, then start.
  useEffect(() => {
    let cancelled = false;
    const frames: { c: number | "go" | null; t: number }[] = [
      { c: null, t: 1400 }, { c: 3, t: 750 }, { c: 2, t: 750 }, { c: 1, t: 750 }, { c: "go", t: 650 },
    ];
    let i = 0;
    const run = () => {
      if (cancelled) return;
      if (i >= frames.length) { setStarting(false); setIntro(null); return; }
      const f = frames[i]; setIntro(f.c);
      if (sound && typeof f.c === "number") playTick("count");
      if (sound && f.c === "go") playTick("end");
      i++; window.setTimeout(run, f.t);
    };
    const s = window.setTimeout(run, 250);
    return () => { cancelled = true; window.clearTimeout(s); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Spoken cue at the start of a step: the "switch sides" cue on a switch step,
  // or the move's own cue when a move STARTS (not on its 2nd side). Waits for
  // the intro to finish so the first cue lands on the first real move.
  useEffect(() => {
    if (starting || !sound || !voice || phase !== "exercise") return;
    if (step.kind === "switch") playCue(WORKOUT_SWITCH_AUDIO, cueRef.current);
    else if (step.side !== "second") playCue(exercise.audio, cueRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, starting]);

  // A "GO ✿" flash when a work move begins (not the first — the intro's GO
  // covers that) + a soft petal celebration each time a side is completed.
  useEffect(() => {
    if (starting) return;
    if (step.kind === "work") setGoFlash((k) => k + 1);
    if (step.kind === "switch") {
      setCelebrate(true);
      const t = window.setTimeout(() => setCelebrate(false), 1900);
      return () => window.clearTimeout(t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, starting]);

  // Keep the screen awake for the duration of the workout.
  useEffect(() => {
    let lock: any = null;
    const requestLock = async () => {
      try {
        if ("wakeLock" in navigator) {
          lock = await (navigator as any).wakeLock.request("screen");
        }
      } catch {}
    };
    requestLock();
    const onVisibility = () => {
      if (document.visibilityState === "visible") requestLock();
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      if (lock) lock.release().catch(() => {});
    };
  }, []);

  useEffect(() => {
    if (paused || starting) return;
    const t = setInterval(() => {
      elapsedRef.current += 1;
      setRemaining((r) => {
        const nr = r - 1;
        // Rhythm. On a rep-based work step, beat once PER REP (so you can follow
        // "1…2…3…" to the target); the last 3 reps ring louder. On holds / switch
        // / rest, tick down the final 3 seconds so the finish is felt.
        if (sound && nr > 0) {
          const reps = phase === "exercise" ? (step.reps ?? 0) : 0;
          if (reps > 0) {
            const repSec = step.workSec / reps;
            const repNow = Math.min(reps, Math.floor((step.workSec - nr) / repSec) + 1);
            const repPrev = Math.min(reps, Math.floor((step.workSec - r) / repSec) + 1);
            if (repNow > repPrev) playTick(repNow > reps - 3 ? "count" : "soft");
          } else if (nr <= 3) {
            playTick("count"); // final-3 countdown on holds / switch / rest
          }
        }
        if (nr <= 0) {
          if (phase === "exercise") {
            if (sound) playTick("end");
            if (index === steps.length - 1) { onDone(elapsedRef.current); return 0; }
            if (step.restSec > 0) {
              setPhase("rest");
              if (sound && voice) playCue(WORKOUT_REST_AUDIO, cueRef.current);
              return step.restSec;
            }
            // No rest here (side 1 → switch cue, or switch → side 2): flow straight on.
            setPhase("exercise"); setIndex((i) => i + 1);
            return nextStepObj?.workSec ?? step.workSec;
          }
          // Rest finished → next move.
          if (sound) playTick("restEnd");
          setPhase("exercise"); setIndex((i) => i + 1);
          return nextStepObj?.workSec ?? step.workSec;
        }
        return nr;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [paused, starting, phase, index, sound, voice, session, next, step, nextStepObj, steps.length]);

  const repeat = () => { setRemaining(phase === "exercise" ? step.workSec : step.restSec); };
  const skip = () => {
    if (phase === "exercise") {
      if (index === steps.length - 1) { onDone(elapsedRef.current); return; }
      if (step.restSec > 0) {
        setPhase("rest"); setRemaining(step.restSec);
        if (sound && voice) playCue(WORKOUT_REST_AUDIO, cueRef.current);
      } else {
        setPhase("exercise"); setIndex((i) => i + 1); setRemaining(nextStepObj?.workSec ?? step.workSec);
      }
    } else {
      setPhase("exercise"); setIndex((i) => i + 1); setRemaining(nextStepObj?.workSec ?? step.workSec);
    }
  };
  const skipRest = () => { setPhase("exercise"); setIndex((i) => i + 1); setRemaining(nextStepObj?.workSec ?? step.workSec); };
  const prev = () => {
    if (phase === "rest") { setPhase("exercise"); setRemaining(step.workSec); return; }
    if (index === 0) { setRemaining(step.workSec); return; }
    const pi = index - 1;
    setIndex(pi); setPhase("exercise"); setRemaining(steps[pi].workSec);
  };
  const isFav = favs.includes(exercise.slug);
  const toggleFav = () => setFavs((f) => f.includes(exercise.slug) ? f.filter((s) => s !== exercise.slug) : [...f, exercise.slug]);

  const totalSec = phase === "exercise" ? step.workSec : step.restSec;
  // Live rep count for a rep-based work step (paces "1…2…3…" to the target).
  const stepReps = step.reps ?? 0;
  const currentRep = phase === "exercise" && stepReps > 0
    ? Math.min(stepReps, Math.max(1, Math.floor((step.workSec - remaining) / (step.workSec / stepReps)) + 1))
    : 0;

  // ── Dashboard content, derived from the current move ──────────────────────
  const isSwitch = step.kind === "switch";
  const muscleList = parseMuscles(exercise.muscles);
  const primaryMuscle = muscleList[0] ?? "Full body";
  const coaching = getCoaching(exercise.slug);
  const coachTip = coaching?.howTo ?? "";
  const formCues = coaching?.cues ?? [];
  const coachLine = WK_COACH_LINES[index % WK_COACH_LINES.length];
  const affirmation = WK_AFFIRMATIONS[index % WK_AFFIRMATIONS.length];
  const nextReps = nextStepObj
    ? (nextStepObj.reps ? `${nextStepObj.reps} reps` : nextStepObj.repTarget ?? nextStepObj.exercise.muscles)
    : "";
  // Ring fill: rep progress on a rep move, else time elapsed on holds / rest.
  const ringPct = phase === "exercise" && stepReps > 0
    ? currentRep / stepReps
    : totalSec > 0 ? 1 - remaining / totalSec : 0;
  const ringLabel = phase === "rest" ? "Rest" : isSwitch ? "Switch" : step.kind === "warmup" ? "Warm-up" : step.kind === "cooldown" ? "Cool-down" : "Seconds";

  // The glossy bottom control bar — Previous · Pause · Skip · Voice · Favorite —
  // rendered inside the centre column on tablet/desktop and pinned to the bottom
  // on phones. Same frosted-glass treatment as every side card.
  const controlBar = (
    <div className="mx-auto w-full max-w-xl flex items-center justify-around gap-1 rounded-[1.6rem] bg-white/65 backdrop-blur-md border border-white/70 shadow-[0_10px_30px_rgba(236,72,153,0.16)] px-2 sm:px-4 py-2 sm:py-2.5">
      <WkCtrl icon={SkipBack} label="Previous" onClick={prev} disabled={index === 0 && phase === "exercise"} />
      <button onClick={() => setPaused((p) => !p)} aria-label={paused ? "Resume" : "Pause"} className="flex flex-col items-center gap-1 active:scale-95 transition">
        <span className="grid h-14 w-14 sm:h-16 sm:w-16 place-items-center rounded-full bg-gradient-to-br from-petal to-hotpink text-white shadow-[0_8px_24px_rgba(236,72,153,0.5)] animate-selected-glow">
          {paused ? <Play className="h-7 w-7 sm:h-8 sm:w-8 fill-current" /> : <Pause className="h-7 w-7 sm:h-8 sm:w-8 fill-current" />}
        </span>
        <span className="text-[10px] sm:text-[11px] font-bold text-hotpink">{paused ? "Resume" : "Pause"}</span>
      </button>
      <WkCtrl icon={SkipForward} label="Skip" onClick={phase === "rest" ? skipRest : skip} />
      <WkCtrl icon={voice ? Volume2 : VolumeX} label="Voice" active={voice} onClick={() => setVoice((v) => !v)} />
      <WkCtrl icon={Heart} label="Favorite" active={isFav} onClick={toggleFav} />
    </div>
  );

  return createPortal(
    <div className="fixed inset-0 z-[60] flex flex-col bg-gradient-to-br from-[oklch(0.97_0.02_350)] via-[oklch(0.95_0.045_350)] to-[oklch(0.91_0.07_345)]" style={{ paddingTop: "env(safe-area-inset-top)", paddingBottom: "env(safe-area-inset-bottom)" }}>
      {/* soft floral glow so the pink room feels alive behind the glass */}
      <div aria-hidden className="pointer-events-none absolute inset-0 opacity-70" style={{ background: "radial-gradient(60% 45% at 82% 12%, oklch(0.9 0.09 350 / 0.5), transparent 70%), radial-gradient(50% 40% at 12% 88%, oklch(0.9 0.08 345 / 0.45), transparent 70%)" }} />

      {/* Background music loop (controlled by the sound toggle) */}
      <audio ref={audioRef} src={musicSrc} loop preload="auto" />
      {/* Spoken cue channel — per-move / rest / switch recordings */}
      <audio ref={cueRef} preload="none" />

      {/* Cute Bloomzein entry (blooms in → 3·2·1·GO) */}
      {starting && <BloomIntro title={session.name} count={intro} />}
      {/* Soft petal celebration when a side completes */}
      {celebrate && <PetalBurst count={12} z={40} />}
      {/* Brand watermark — every screenshot reads as Bloomzein */}
      <div aria-hidden className="pointer-events-none absolute bottom-1.5 left-3 z-[15] inline-flex items-center gap-1.5 rounded-full bg-white/55 backdrop-blur px-2 py-0.5 text-hotpink/80 font-script text-sm leading-none shadow-sm">
        <BloomFlower size={13} /> Bloomzein
      </div>

      {/* ── Top bar: close · session progress · sound ── */}
      <header className="relative z-10 flex items-center gap-3 px-3 sm:px-5 py-2.5 shrink-0">
        <button onClick={onExit} aria-label="Close" className="grid h-10 w-10 sm:h-11 sm:w-11 shrink-0 place-items-center rounded-full bg-white/70 backdrop-blur-md text-rose border border-white/70 shadow-sm active:scale-90 transition"><X className="h-5 w-5" /></button>
        <div className="flex-1 min-w-0">
          <p className="text-center text-[9px] sm:text-[10px] font-extrabold uppercase tracking-[0.22em] text-hotpink/70 mb-1">Session progress</p>
          <div className="flex items-center gap-2.5">
            <div className="h-2 flex-1 rounded-full bg-white/60 overflow-hidden shadow-inner">
              <div className="h-full rounded-full bg-gradient-to-r from-petal to-hotpink transition-all duration-500" style={{ width: `${((index + (phase === "rest" ? 1 : 0)) / steps.length) * 100}%` }} />
            </div>
            <span className="text-xs sm:text-sm font-extrabold text-rose tabular-nums shrink-0">{index + 1} / {steps.length}</span>
          </div>
        </div>
        <button onClick={() => setSound((s) => !s)} aria-label="Sound" className="grid h-10 w-10 sm:h-11 sm:w-11 shrink-0 place-items-center rounded-full bg-white/70 backdrop-blur-md text-rose border border-white/70 shadow-sm active:scale-90 transition">
          {sound ? <Volume2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5" />}
        </button>
      </header>

      {/* ── Smart-responsive dashboard ──────────────────────────────────────
          phone: single scrolling column · tablet: centre + right rail ·
          desktop: left rail + centre + right rail (the reference layout). */}
      <main className="relative z-10 flex-1 min-h-0 grid grid-cols-1 md:grid-cols-[1fr_15rem] lg:grid-cols-[13.5rem_1fr_16.5rem] gap-3 px-3 sm:px-5 pb-2 overflow-y-auto md:overflow-hidden">

        {/* LEFT RAIL — desktop only */}
        <aside className="hidden lg:flex flex-col gap-3 min-h-0 overflow-y-auto pr-0.5">
          <FocusCard primary={primaryMuscle} zone={session.zone} delay={40} />
          <MuscleTargetCard muscles={muscleList} delay={120} />
          <CoachTipCard tip={coachTip} delay={200} />
        </aside>

        {/* CENTRE STAGE */}
        <section className="relative min-h-0 flex flex-col gap-2">
          {/* Title + muscle tags */}
          <div className="shrink-0">
            <h2 className="font-script text-[1.75rem] sm:text-4xl lg:text-5xl text-hotpink leading-none">
              {phase === "rest" ? "Rest & breathe" : isSwitch ? "Switch sides" : exercise.name}
            </h2>
            <div className="mt-1 h-1 w-24 rounded-full bg-gradient-to-r from-hotpink to-transparent" />
            {phase !== "rest" && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {muscleList.slice(0, 3).map((m, i) => (
                  <span key={m + i} className="rounded-full bg-white/60 backdrop-blur border border-white/70 px-2.5 py-0.5 text-[11px] font-semibold text-hotpink">{cap(m)}</span>
                ))}
                {step.side && !isSwitch && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-hotpink/12 border border-hotpink/25 px-2.5 py-0.5 text-[11px] font-bold text-hotpink">
                    <RotateCcw className="h-3 w-3" /> {step.side === "first" ? "1st side" : "2nd side"}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Stage: the photo (exercise) or the rest card */}
          {phase === "exercise" ? (
            <div className="relative w-full aspect-[4/5] sm:aspect-[16/10] md:aspect-auto md:flex-1 md:min-h-0 rounded-[1.75rem] overflow-hidden border border-white/60 shadow-lg bg-[oklch(0.96_0.04_350)]">
              {/* Inner box sized to the CONTAINED image so the glow + arrows line up. */}
              <div key={index} className="absolute inset-0 m-auto animate-fade-in"
                style={glow ? { aspectRatio: String(glow.aspect), maxWidth: "100%", maxHeight: "100%" } : { inset: 0 } as any}>
                <ExercisePhoto exercise={exercise} zone={session.zone} className={["absolute inset-0 w-full h-full object-contain",
                  isSwitch ? "scale-x-[-1]" : (!paused ? "animate-wk-ken-burns" : "")].join(" ")} />

                {/* "GO ✿" flash at the start of a work move */}
                {goFlash > 0 && step.kind === "work" && (
                  <div key={goFlash} aria-hidden className="pointer-events-none absolute inset-0 z-20 grid place-items-center">
                    <span className="animate-wk-go-flash font-script text-6xl sm:text-8xl text-white drop-shadow-[0_3px_14px_rgba(219,39,119,0.55)]">GO ✿</span>
                  </div>
                )}

                {/* Switch-sides overlay */}
                {isSwitch && (
                  <div className="absolute inset-0 z-20 grid place-items-center bg-hotpink/45 backdrop-blur-[2px]">
                    <div className="text-center px-4 animate-scale-in">
                      <RotateCcw className="mx-auto h-12 w-12 sm:h-16 sm:w-16 text-white animate-spin drop-shadow" strokeWidth={2.6} style={{ animationDuration: "1.4s" }} />
                      <p className="mt-2 font-script text-3xl sm:text-5xl text-white leading-none drop-shadow-[0_2px_6px_rgba(0,0,0,0.35)]">Switch sides!</p>
                      <p className="mt-1 text-sm sm:text-lg font-bold text-white/95 drop-shadow">Now the other side ✿</p>
                    </div>
                  </div>
                )}

                {/* Muscle glow — pulses ONLY over the worked muscle */}
                {glow && !paused && !isSwitch && (
                  <>
                    <div aria-hidden className="pointer-events-none absolute animate-muscle-pulse rounded-full"
                      style={{ left: `${glow.cx * 100}%`, top: `${glow.cy * 100}%`, width: `${glow.r * 240}%`, aspectRatio: "1",
                        background: "radial-gradient(circle, oklch(0.72 0.3 350 / 0.95) 0%, oklch(0.72 0.3 350 / 0.4) 35%, transparent 70%)", mixBlendMode: "screen" }} />
                    <div aria-hidden className="pointer-events-none absolute animate-muscle-ring rounded-full"
                      style={{ left: `${glow.cx * 100}%`, top: `${glow.cy * 100}%`, width: `${glow.r * 240}%`, aspectRatio: "1",
                        border: "3px solid oklch(0.75 0.32 350 / 0.95)", boxShadow: "0 0 18px oklch(0.72 0.3 350 / 0.7), inset 0 0 12px oklch(0.72 0.3 350 / 0.5)" }} />
                  </>
                )}

                {/* Energy arrows — gentle marching glide so the photo feels alive */}
                {!paused && !isSwitch && (
                  <>
                    <div aria-hidden className="pointer-events-none absolute left-1.5 sm:left-3 top-1/2 -translate-y-1/2 flex flex-col gap-1 text-hotpink/80 drop-shadow-[0_0_6px_oklch(0.72_0.26_350/0.6)]">
                      {[0, 1, 2].map((i) => <ChevronRight key={i} className="h-6 w-6 sm:h-8 sm:w-8 animate-arrow-r" style={{ animationDelay: `${i * 0.22}s` }} strokeWidth={2.6} />)}
                    </div>
                    <div aria-hidden className="pointer-events-none absolute right-1.5 sm:right-3 top-1/2 -translate-y-1/2 flex flex-col gap-1 text-hotpink/80 drop-shadow-[0_0_6px_oklch(0.72_0.26_350/0.6)]">
                      {[0, 1, 2].map((i) => <ChevronLeft key={i} className="h-6 w-6 sm:h-8 sm:w-8 animate-arrow-l" style={{ animationDelay: `${i * 0.22}s` }} strokeWidth={2.6} />)}
                    </div>
                  </>
                )}
              </div>

              {/* Bloom Coach speech bubble (over the photo, top-left) */}
              {!isSwitch && (
                <div className="absolute top-3 left-3 z-[25] max-w-[13rem] sm:max-w-[15rem] rounded-2xl rounded-bl-md bg-white/70 backdrop-blur-md border border-white/70 shadow-[0_10px_30px_rgba(236,72,153,0.16)] px-3 py-2 animate-fade-in">
                  <p className="flex items-center gap-1.5 text-[11px] font-extrabold text-hotpink"><BloomFlower size={13} /> Bloom Coach</p>
                  <p className="mt-0.5 text-[11.5px] sm:text-xs font-medium text-rose/85 leading-snug">{coachLine}</p>
                </div>
              )}

              {/* Compact rep ring — phones only (desktop/tablet use the right rail) */}
              <div className="md:hidden absolute top-3 right-3 z-[25] rounded-full bg-white/70 backdrop-blur-md border border-white/70 shadow-[0_8px_24px_rgba(236,72,153,0.18)] p-1.5">
                <RepRing size={82} percent={ringPct} label={ringLabel}
                  rep={stepReps > 0 && !isSwitch ? currentRep : undefined}
                  total={stepReps > 0 && !isSwitch ? stepReps : undefined}
                  seconds={remaining} />
              </div>

              {/* Affirmation banner (over the photo, bottom) */}
              <div className="absolute inset-x-3 bottom-2.5 z-[25] mx-auto max-w-md rounded-full bg-white/65 backdrop-blur-md border border-white/70 shadow-[0_8px_24px_rgba(236,72,153,0.16)] px-3.5 py-1.5 text-center animate-fade-in">
                <p className="text-[11px] sm:text-[12.5px] font-semibold text-rose/85 leading-snug truncate">{affirmation}</p>
              </div>
            </div>
          ) : (
            <div className="relative w-full md:flex-1 md:min-h-0 grid place-items-center rounded-[1.75rem] border border-white/60 shadow-lg bg-white/55 backdrop-blur-md p-5 sm:p-7">
              <div className="text-center">
                <p className="text-sm sm:text-lg font-bold uppercase tracking-wide text-hotpink/70">Rest</p>
                <p className="text-[11px] sm:text-xs text-rose/55 mb-4">Breathe in… and out. ✿</p>
                <RepRing size={150} percent={ringPct} seconds={remaining} label="Rest" />
                {next && (
                  <div className="mt-5 mx-auto max-w-xs">
                    <p className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-hotpink/60 mb-2">Coming up{nextStepObj?.label ? ` · ${nextStepObj.label}` : ""}</p>
                    <div className="flex items-center gap-3 rounded-2xl bg-white/70 backdrop-blur border border-white/70 p-2.5 text-left">
                      <ExercisePhoto exercise={next} zone={session.zone} className="h-16 w-16 shrink-0 object-cover rounded-xl border border-petal/60" />
                      <div className="flex-1 min-w-0">
                        <p className="text-base font-bold text-rose leading-tight">{next.name}</p>
                        {nextReps && <span className="mt-0.5 inline-block text-[11px] font-semibold text-hotpink">{nextReps}</span>}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Phone-only info cards (rails are hidden below md) */}
          <div className="md:hidden grid grid-cols-1 gap-3">
            <MuscleTargetCard muscles={muscleList} />
            <CoachTipCard tip={coachTip} />
            <FormReminderCard cues={formCues} />
          </div>

          {/* Control bar — inside the centre column on tablet/desktop */}
          <div className="hidden md:block shrink-0 pt-1">{controlBar}</div>
        </section>

        {/* RIGHT RAIL — tablet + desktop */}
        <aside className="hidden md:flex flex-col gap-3 min-h-0 overflow-y-auto pr-0.5">
          <GlassCard className="!py-4" delay={40}>
            <RepRing size={168} percent={ringPct} label={ringLabel}
              rep={stepReps > 0 && !isSwitch && phase === "exercise" ? currentRep : undefined}
              total={stepReps > 0 && !isSwitch && phase === "exercise" ? stepReps : undefined}
              seconds={remaining} />
          </GlassCard>
          {next && <NextUpCard next={next} zone={session.zone} reps={nextReps} delay={120} />}
          <FormReminderCard cues={formCues} delay={200} />
          {/* Tablet gets the focus/muscle/tip cards here (no left rail below lg) */}
          <div className="lg:hidden flex flex-col gap-3">
            <MuscleTargetCard muscles={muscleList} delay={260} />
            <CoachTipCard tip={coachTip} delay={320} />
          </div>
        </aside>
      </main>

      {/* Control bar — pinned to the bottom on phones */}
      <div className="md:hidden relative z-10 shrink-0 px-3 pb-2 pt-1">{controlBar}</div>
    </div>,
    document.body
  );
}

function SessionEnd({ session, elapsedSec, programRef, onDone }: { session: WorkoutSession; elapsedSec: number; programRef?: ProgramRef; onDone: () => void }) {
  const [streak, setStreak] = useLS<{ count: number; lastISO: string | null }>(STREAK_KEY, { count: 0, lastISO: null });
  const [unlockedNew, setUnlockedNew] = useState<string[]>([]);
  const calories = sessionCalories(session.intention, elapsedSec);
  const minutes = Math.floor(elapsedSec / 60);
  const seconds = elapsedSec % 60;

  useEffect(() => {
    const phase = readCyclePhase() ?? "any";
    const before = unlockedBadges(loadHistory(), streak);

    // If this was a program session, mark it complete in the program tracker.
    if (programRef) {
      try {
        const prog = loadProgramProgress();
        const list = new Set(prog[programRef.programId] ?? []);
        list.add(sessionTag(programRef.week, programRef.sessionIndex));
        prog[programRef.programId] = [...list];
        localStorage.setItem(PROGRAM_PROGRESS_KEY, JSON.stringify(prog));
      } catch {}
    }

    const history = loadHistory();
    const entry: HistoryEntry = {
      date: todayISO(), zone: session.zone, intention: session.intention, phase,
      durationMin: session.durationMin, calories, sessionName: session.name,
    };
    history.push(entry);
    try {
      localStorage.setItem(WORKOUT_LOG_KEY, JSON.stringify(history));
      window.dispatchEvent(new Event("bloom:workout-updated"));
    } catch {}

    setStreak((s) => {
      if (s.lastISO === todayISO()) return s;
      if (s.lastISO && isYesterday(s.lastISO)) return { count: s.count + 1, lastISO: todayISO() };
      return { count: 1, lastISO: todayISO() };
    });

    const after = unlockedBadges(history, { count: streak.lastISO === todayISO() ? streak.count : streak.count + 1 });
    setUnlockedNew([...after].filter((id) => !before.has(id)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const addToJournal = () => {
    try {
      const raw = localStorage.getItem("bloom:notes");
      const notes = raw ? JSON.parse(raw) : [];
      notes.unshift({
        id: `workout-${Date.now()}`,
        title: `${session.name} — completed`,
        text: `${session.durationMin} min · ${session.exercises.length} exercises · ~${calories} kcal · ${minutes}:${String(seconds).padStart(2, "0")}`,
        color: "sakura", tag: "Self-care", pinned: false, createdAt: new Date().toISOString(),
      });
      localStorage.setItem("bloom:notes", JSON.stringify(notes));
    } catch {}
    window.location.href = "/app/tools/notes";
  };

  const share = () => {
    const text = `I just completed "${session.name}" on Bloomzein 🌸 ${session.durationMin} min · ~${calories} kcal`;
    if (navigator.share) {
      navigator.share({ text }).catch(() => {});
    } else {
      navigator.clipboard?.writeText(text).catch(() => {});
    }
  };

  // Streak the user is on AFTER this session (stable regardless of effect timing).
  const today = todayISO();
  const displayStreak = streak.lastISO === today
    ? streak.count
    : streak.lastISO && isYesterday(streak.lastISO) ? streak.count + 1 : 1;

  const CHEERS = [
    "Your body just thanked you.",
    "Strong, soft, and showing up — that's you.",
    "Every session is a petal in your bloom.",
    "Consistency looks beautiful on you.",
    "You moved with your body today, not against it.",
  ];
  const cheer = CHEERS[displayStreak % CHEERS.length];
  const totalReps = session.steps.filter((s) => s.kind === "work" && (s.reps ?? 0) > 0).reduce((a, s) => a + (s.reps as number), 0);
  const hadSwitches = session.steps.some((s) => s.kind === "switch");

  return (
    <div className="fixed inset-0 z-[60] bg-blush/95 backdrop-blur grid place-items-start sm:place-items-center p-4 overflow-y-auto" style={{ paddingTop: "max(1rem, env(safe-area-inset-top))" }}>
      {/* Celebration petals rain over the whole finish screen */}
      <PetalBurst count={26} z={55} />
      <div className="relative w-full max-w-md rounded-3xl bg-white/96 border border-petal/60 p-6 sm:p-8 shadow-2xl text-center my-6 sm:my-8 animate-scale-in">
        {/* Celebration ring */}
        <div className="mx-auto mb-3 relative grid place-items-center">
          <span className="clay-blob animate-selected-glow grid h-20 w-20 sm:h-24 sm:w-24 place-items-center rounded-full text-white">
            <Trophy className="h-9 w-9 sm:h-11 sm:w-11 animate-icon-breathe" strokeWidth={1.6} />
          </span>
        </div>

        <h1 className="font-script text-4xl sm:text-5xl text-hotpink leading-none mb-1 animate-text-pop">You bloomed today ✿</h1>
        <p className="text-sm text-rose/80">{session.name}</p>
        <p className="mt-1 text-xs text-rose/60 italic">{cheer}</p>
        {(totalReps > 0 || hadSwitches) && (
          <p className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-hotpink/10 border border-hotpink/20 px-3 py-1 text-[11px] font-bold text-hotpink">
            {hadSwitches && <>Both sides trained ✓</>}{hadSwitches && totalReps > 0 && " · "}{totalReps > 0 && <>~{totalReps} reps done</>}
          </p>
        )}

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2.5 my-5">
          <div className="rounded-2xl bg-blush/60 border border-petal/50 p-3">
            <p className="font-script text-2xl text-hotpink leading-none">{minutes}:{String(seconds).padStart(2, "0")}</p>
            <p className="mt-1 text-[10px] font-semibold uppercase tracking-wide text-rose/60">Time</p>
          </div>
          <div className="rounded-2xl bg-blush/60 border border-petal/50 p-3">
            <p className="font-script text-2xl text-hotpink leading-none">~{calories}</p>
            <p className="mt-1 text-[10px] font-semibold uppercase tracking-wide text-rose/60">kcal</p>
          </div>
          <div className="rounded-2xl bg-gradient-to-br from-hotpink/15 to-petal/40 border border-petal/60 p-3 animate-selected-glow">
            <p className="font-script text-2xl text-hotpink leading-none">{displayStreak}</p>
            <p className="mt-1 text-[10px] font-semibold uppercase tracking-wide text-rose/60">day streak</p>
          </div>
        </div>

        {unlockedNew.length > 0 && (
          <div className="mb-4 rounded-2xl bg-blush/70 border border-hotpink/30 p-3 animate-fade-in">
            <p className="text-xs font-bold uppercase tracking-wide text-hotpink mb-1">New badge unlocked! ✨</p>
            {unlockedNew.map((id) => (
              <p key={id} className="text-sm font-semibold text-rose flex items-center justify-center gap-1.5">
                <Trophy className="h-4 w-4 text-hotpink" /> {BADGES.find((b) => b.id === id)?.label}
              </p>
            ))}
          </div>
        )}

        <p className="mb-4 inline-flex items-center gap-1.5 text-xs font-semibold text-rose/70">
          <CalendarHeart className="h-3.5 w-3.5 text-hotpink" /> Logged to your Bloom Calendar{programRef ? " & program" : ""}
        </p>

        <div className="flex flex-wrap justify-center gap-2 mb-4">
          <button onClick={addToJournal} className="inline-flex items-center gap-1.5 rounded-full bg-white/90 px-4 py-2 text-xs font-semibold text-rose border border-petal/60 active:scale-95 transition">
            <BookHeart className="h-3.5 w-3.5" /> Add to journal
          </button>
          <button onClick={share} className="inline-flex items-center gap-1.5 rounded-full bg-white/90 px-4 py-2 text-xs font-semibold text-rose border border-petal/60 active:scale-95 transition">
            <Share2 className="h-3.5 w-3.5" /> Share
          </button>
        </div>

        <button onClick={onDone} className="bloom-luxury-btn w-full inline-flex items-center justify-center gap-2 py-3.5 text-sm font-bold text-white">
          {programRef ? "Back to my plan" : "Done"} <ChevronRight className="h-4 w-4" strokeWidth={2.5} />
        </button>
      </div>
    </div>
  );
}
