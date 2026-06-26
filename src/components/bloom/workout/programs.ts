// =============================================================================
// BLOOM & ZEIN — FLAGSHIP TRAINING PROGRAMS
// -----------------------------------------------------------------------------
// These are structured, multi-week, sellable programs — the premium layer that
// sits on top of the ad-hoc session generator in ./data.ts.
//
// What makes them world-class (and worth paying for):
//   1. PROGRESSIVE OVERLOAD — every week is computed from a base template plus a
//      periodization rule (volume/intensity climbs, with planned deload weeks).
//   2. REAL PRESCRIPTION — sets × reps × tempo × rest × load guidance, not just a
//      timer. The same movement is prescribed differently as the weeks progress.
//   3. STRUCTURE — every session is bookended by a warm-up and a cool-down.
//   4. COACHING — concrete form cues on every exercise.
//   5. CYCLE-SYNC — per-session guidance that adapts effort to the user's phase
//      (this is the differentiator most paid programs do NOT have).
//
// Exercise `slug`s reference EXERCISES in ./data.ts so names/images/muscles are
// shared — no duplication.
// =============================================================================

import type { Equipment, Goal, Level } from "./data";
import type { CyclePhase } from "../cyclePhase";

/* ==================== TYPES ==================== */

/** A single prescribed movement inside a session block. */
export interface ProgramExercise {
  slug: string;            // → EXERCISES[slug] for name / image / muscles
  sets: number;
  /** Reps as a coachable string: "12", "10–12", "30s", "8 each side". */
  reps: string;
  tempo?: string;          // e.g. "3-1-1" (eccentric-pause-concentric)
  restSec: number;
  cues: string[];          // 2–3 concrete form cues
  loadNote?: string;       // load/intensity guidance
}

export type BlockKind = "warmup" | "main" | "finisher" | "cooldown";

export interface ProgramBlock {
  kind: BlockKind;
  label: string;
  /** Repeat the whole block N times (circuits). Defaults to 1. */
  rounds?: number;
  exercises: ProgramExercise[];
}

export interface ProgramSession {
  day: number;             // ordinal within the training week
  title: string;           // "Lower A — Glute Focus"
  focus: string;           // one-line summary
  estMinutes: number;
  /** Cycle-sync coaching shown when the user is in a given phase. */
  phaseTips?: Partial<Record<Exclude<CyclePhase, "any">, string>>;
  blocks: ProgramBlock[];
}

/** How the program gets harder over time. Applied to the base template. */
export interface Progression {
  /** Extra sets added to MAIN-block exercises by 1-indexed week. */
  addSetsByWeek: number[];
  /** Reps multiplier per week (e.g. 1.0, 1.1 …) applied to numeric reps. */
  repsMultByWeek: number[];
  /** Rest reduction (sec) applied to MAIN blocks per week. */
  restCutByWeek: number[];
  /** 1-indexed weeks that are DELOAD weeks (volume pulled back to recover). */
  deloadWeeks: number[];
  /** One-line note describing the focus of each week. */
  weekThemes: { theme: string; note: string }[];
}

export interface Program {
  id: string;
  title: string;
  tagline: string;
  goal: Goal;
  level: Level;
  equipment: Equipment;
  weeks: number;
  daysPerWeek: number;
  image: string;
  tier: "free" | "premium";
  /** Sales framing — what the buyer walks away with. */
  promise: string[];
  whoFor: string;
  whyItWorks: string[];
  phaseSynced: boolean;
  /** Base (week-1) session templates. Later weeks are computed from these. */
  template: ProgramSession[];
  progression: Progression;
}

/* ==================== SHARED WARM-UP / COOL-DOWN ==================== */

const WARMUP_LOWER: ProgramBlock = {
  kind: "warmup", label: "Warm-up (3–4 min)", rounds: 1,
  exercises: [
    { slug: "hip-circles", sets: 1, reps: "8 each way", restSec: 0, cues: ["Slow, controlled circles", "Hands on hips, soft knees"] },
    { slug: "glute-bridge", sets: 1, reps: "12", restSec: 0, cues: ["Squeeze glutes at the top", "Ribs down, no arching"] },
    { slug: "standing-leg-circles", sets: 1, reps: "6 each leg", restSec: 0, cues: ["Stand tall, brace core", "Small to large circles"] },
  ],
};

const WARMUP_UPPER: ProgramBlock = {
  kind: "warmup", label: "Warm-up (3–4 min)", rounds: 1,
  exercises: [
    { slug: "shoulder-circles", sets: 1, reps: "10 each way", restSec: 0, cues: ["Big, slow circles", "Relax the neck"] },
    { slug: "wall-angels", sets: 1, reps: "10", restSec: 0, cues: ["Low back stays on the wall", "Slide arms, don't force"] },
    { slug: "gentle-arm-swings", sets: 1, reps: "30s", restSec: 0, cues: ["Loose and rhythmic", "Open the chest"] },
  ],
};

const WARMUP_FULL: ProgramBlock = {
  kind: "warmup", label: "Warm-up (4 min)", rounds: 1,
  exercises: [
    { slug: "cat-cow", sets: 1, reps: "8", restSec: 0, cues: ["Move with your breath", "Articulate each vertebra"] },
    { slug: "hip-circles", sets: 1, reps: "8 each way", restSec: 0, cues: ["Controlled, full range", "Soft knees"] },
    { slug: "shoulder-circles", sets: 1, reps: "10 each way", restSec: 0, cues: ["Relax the neck", "Big slow circles"] },
  ],
};

const COOLDOWN_LOWER: ProgramBlock = {
  kind: "cooldown", label: "Cool-down (4 min)", rounds: 1,
  exercises: [
    { slug: "figure-four-stretch", sets: 1, reps: "45s each", restSec: 0, cues: ["Breathe into the glute", "Keep the back flat"] },
    { slug: "seated-hamstring-stretch", sets: 1, reps: "45s each", restSec: 0, cues: ["Hinge from the hips", "Don't round the spine"] },
    { slug: "childs-pose", sets: 1, reps: "60s", restSec: 0, cues: ["Sink the hips back", "Long, slow exhales"] },
  ],
};

const COOLDOWN_UPPER: ProgramBlock = {
  kind: "cooldown", label: "Cool-down (4 min)", rounds: 1,
  exercises: [
    { slug: "cross-body-shoulder-stretch", sets: 1, reps: "40s each", restSec: 0, cues: ["Gentle pull, no pinching", "Shoulder down away from ear"] },
    { slug: "overhead-tricep-stretch", sets: 1, reps: "40s each", restSec: 0, cues: ["Elbow points up", "Breathe and soften"] },
    { slug: "childs-pose", sets: 1, reps: "60s", restSec: 0, cues: ["Reach the arms long", "Relax the upper back"] },
  ],
};

const COOLDOWN_FULL: ProgramBlock = {
  kind: "cooldown", label: "Cool-down (4–5 min)", rounds: 1,
  exercises: [
    { slug: "supine-twist", sets: 1, reps: "45s each", restSec: 0, cues: ["Both shoulders stay down", "Exhale to deepen"] },
    { slug: "seated-forward-fold", sets: 1, reps: "60s", restSec: 0, cues: ["Lead with the chest", "Let the neck go"] },
    { slug: "childs-pose", sets: 1, reps: "60s", restSec: 0, cues: ["Sink and breathe", "Soften the jaw"] },
  ],
};

/* ==================== PROGRESSION PRESETS ==================== */

// Classic 8-week strength block: build for 2 weeks, deload, build, peak, deload.
const PROG_8WK_STRENGTH: Progression = {
  addSetsByWeek:   [0, 0, 1, 1, 2, 1, 2, 2],
  repsMultByWeek:  [1, 1.08, 1, 1.08, 1.15, 1, 1.12, 1.2],
  restCutByWeek:   [0, 0, 0, 5, 5, 0, 10, 10],
  deloadWeeks:     [6],
  weekThemes: [
    { theme: "Foundation", note: "Groove the movements — own your form before you add load." },
    { theme: "Foundation+", note: "Same lifts, a touch more volume. Last 2 reps should feel earned." },
    { theme: "Build", note: "Volume climbs (+1 set). Pick a load that challenges those last reps." },
    { theme: "Build+", note: "More reps, slightly less rest. This is where strength is made." },
    { theme: "Peak", note: "Highest volume of the block. Bring intent to every set." },
    { theme: "Deload", note: "Planned recovery — volume pulled back so you adapt and come back stronger." },
    { theme: "Realise", note: "Heavier, denser work. You'll feel how far you've come." },
    { theme: "Peak Finish", note: "Top of the mountain — your strongest, densest week. Finish proud." },
  ],
};

// 6-week tone/build: progressive density, single deload.
const PROG_6WK_BUILD: Progression = {
  addSetsByWeek:   [0, 0, 1, 1, 2, 1],
  repsMultByWeek:  [1, 1.1, 1.05, 1.15, 1.2, 1],
  restCutByWeek:   [0, 0, 5, 5, 10, 0],
  deloadWeeks:     [6],
  weekThemes: [
    { theme: "Foundation", note: "Learn the tempo. Control beats speed." },
    { theme: "Build", note: "More reps under control — feel the target muscle work." },
    { theme: "Build+", note: "Extra set, tighter rest. Density goes up." },
    { theme: "Push", note: "Higher reps, shorter rest. Stay strict." },
    { theme: "Peak", note: "Most work of the block. Quality every rep." },
    { theme: "Deload", note: "Soft week — recover, restore, lock in the gains." },
  ],
};

// 4-week intro / cycle-synced: gentle ramp, no deload (it's short & sustainable).
const PROG_4WK_GENTLE: Progression = {
  addSetsByWeek:   [0, 0, 1, 1],
  repsMultByWeek:  [1, 1.1, 1.1, 1.2],
  restCutByWeek:   [0, 0, 5, 5],
  deloadWeeks:     [],
  weekThemes: [
    { theme: "Meet your body", note: "Slow and kind. Build the habit, learn the moves." },
    { theme: "Find your rhythm", note: "A little more volume — notice what your body can do." },
    { theme: "Grow", note: "First real step up. You're stronger than week one." },
    { theme: "Bloom", note: "Your fullest week. Celebrate how far you've come." },
  ],
};

/* ==================== THE PROGRAMS ==================== */

export const PROGRAMS: Program[] = [
  // ---------------------------------------------------------------------------
  {
    id: "glute-builder-8",
    title: "8-Week Glute Builder",
    tagline: "Sculpt, lift and strengthen — the science-backed glute block.",
    goal: "strengthen", level: "Intermediate", equipment: "dumbbells",
    weeks: 8, daysPerWeek: 3, image: "/images/workout-hero-bestshape.webp",
    tier: "premium",
    promise: [
      "Visibly stronger, rounder glutes in 8 weeks",
      "A real progressive-overload plan — no guesswork",
      "Hip-hinge & squat mastery with coached form",
    ],
    whoFor: "You've trained a little and want a structured plan that actually builds your glutes.",
    whyItWorks: [
      "Hits the glutes through their two key jobs: hip extension (thrusts, hinges) and abduction (banded work).",
      "Progressive overload week-over-week is the single biggest driver of shape change — it's built in.",
      "A deload at week 6 lets your muscles supercompensate so weeks 7–8 are your strongest.",
    ],
    phaseSynced: true,
    template: [
      {
        day: 1, title: "Lower A — Hinge Focus", focus: "Posterior chain: glutes & hamstrings", estMinutes: 35,
        phaseTips: {
          period: "Low energy is normal — drop a set and keep loads light. Moving gently still counts.",
          ovulation: "Peak power phase — this is the day to go for your heaviest hip thrust.",
          luteal: "Slightly longer rests today. Honour the extra fatigue.",
        },
        blocks: [
          WARMUP_LOWER,
          {
            kind: "main", label: "Strength", rounds: 1,
            exercises: [
              { slug: "hip-thrust", sets: 3, reps: "10–12", tempo: "2-2-1", restSec: 75, cues: ["Chin tucked, ribs down", "Drive through heels", "Full glute squeeze at top, pause 1s"], loadNote: "Pick a load where reps 11–12 are genuinely hard." },
              { slug: "romanian-deadlift", sets: 3, reps: "10", tempo: "3-1-1", restSec: 75, cues: ["Soft knees, hips travel back", "Bar/weights close to legs", "Feel the hamstring stretch, then squeeze up"], loadNote: "Stop each set 1–2 reps before form breaks." },
              { slug: "bulgarian-split-squat", sets: 3, reps: "8 each leg", tempo: "2-1-1", restSec: 60, cues: ["Front shin vertical", "Sink straight down", "Weight in the front heel"] },
            ],
          },
          {
            kind: "finisher", label: "Burnout", rounds: 2,
            exercises: [
              { slug: "glute-bridge", sets: 1, reps: "20", restSec: 30, cues: ["Constant tension", "Don't rest at the bottom"] },
              { slug: "clamshells", sets: 1, reps: "15 each side", restSec: 30, cues: ["Hips stacked, no rolling back", "Slow open and close"] },
            ],
          },
          COOLDOWN_LOWER,
        ],
      },
      {
        day: 2, title: "Lower B — Squat & Abduction", focus: "Quads, glute medius, shape", estMinutes: 35,
        phaseTips: {
          follicular: "Energy is rising — add a little load to your sumo squat today.",
          period: "Keep it light and flowing; skip the jump variations if you're crampy.",
        },
        blocks: [
          WARMUP_LOWER,
          {
            kind: "main", label: "Strength", rounds: 1,
            exercises: [
              { slug: "sumo-squat", sets: 3, reps: "12", tempo: "3-1-1", restSec: 60, cues: ["Toes out ~30°", "Knees track over toes", "Chest tall the whole way"], loadNote: "Hold a single dumbbell at chest height (goblet)." },
              { slug: "step-ups", sets: 3, reps: "10 each leg", restSec: 60, cues: ["Whole foot on the step", "Drive through the top heel", "Control the way down"] },
              { slug: "fire-hydrants", sets: 3, reps: "15 each side", restSec: 45, cues: ["Keep the core braced", "Lift to hip height, no higher", "Slow and deliberate"] },
            ],
          },
          {
            kind: "finisher", label: "Burnout", rounds: 2,
            exercises: [
              { slug: "donkey-kicks", sets: 1, reps: "15 each side", restSec: 30, cues: ["Flex the foot, press the ceiling", "Squeeze at the top"] },
              { slug: "side-lying-leg-raises", sets: 1, reps: "15 each side", restSec: 30, cues: ["Lead with the heel", "Don't rock the hips"] },
            ],
          },
          COOLDOWN_LOWER,
        ],
      },
      {
        day: 3, title: "Lower C — Power & Pump", focus: "Explosive glutes + high-rep finish", estMinutes: 35,
        phaseTips: {
          ovulation: "Green light for power — make the kettlebell swings snappy.",
          luteal: "Swap the swing for extra hip thrusts if power feels off today.",
          period: "Rest day permission granted if you need it — come back tomorrow.",
        },
        blocks: [
          WARMUP_LOWER,
          {
            kind: "main", label: "Strength", rounds: 1,
            exercises: [
              { slug: "weighted-hip-thrust", sets: 4, reps: "8", tempo: "2-2-1", restSec: 90, cues: ["Heaviest lift of the week", "Pause 2s at the top", "Brace before every rep"], loadNote: "Go heavier than Day 1 — this is your strength day." },
              { slug: "kettlebell-swing", sets: 3, reps: "12", restSec: 60, cues: ["Hinge, don't squat", "Snap the hips to float the bell", "Arms are just ropes"] },
              { slug: "curtsy-lunge", sets: 3, reps: "10 each leg", restSec: 60, cues: ["Step back and across", "Keep hips square", "Push through the front heel"] },
            ],
          },
          {
            kind: "finisher", label: "Pump", rounds: 3,
            exercises: [
              { slug: "glute-bridge", sets: 1, reps: "15", restSec: 25, cues: ["Squeeze, squeeze, squeeze", "No rest at the bottom"] },
            ],
          },
          COOLDOWN_LOWER,
        ],
      },
    ],
    progression: PROG_8WK_STRENGTH,
  },

  // ---------------------------------------------------------------------------
  {
    id: "strong-core-6",
    title: "6-Week Strong Core",
    tagline: "A genuinely strong, stable midsection — built from the inside out.",
    goal: "tonify", level: "Beginner", equipment: "mat",
    weeks: 6, daysPerWeek: 3, image: "/images/workout-hero-session.png",
    tier: "premium",
    promise: [
      "Deep-core strength that protects your back",
      "Visible definition through progressive volume",
      "Anti-rotation & anti-extension training the right way",
    ],
    whoFor: "Anyone who wants a strong core foundation — postpartum-friendly pacing, beginner-safe.",
    whyItWorks: [
      "Trains all four jobs of the core: brace, anti-extension, anti-rotation, flexion — not just crunches.",
      "Starts with deep-core control (dead bug, bird dog) before loaded flexion, protecting your spine.",
      "Volume rises weekly so the core keeps adapting instead of plateauing.",
    ],
    phaseSynced: true,
    template: [
      {
        day: 1, title: "Core A — Brace & Stabilise", focus: "Deep core control", estMinutes: 22,
        phaseTips: {
          period: "Gentle is perfect today — deep breathing into the plank counts.",
          luteal: "If bloated, shorten the holds and focus on breathing.",
        },
        blocks: [
          WARMUP_FULL,
          {
            kind: "main", label: "Stability circuit", rounds: 3,
            exercises: [
              { slug: "dead-bug", sets: 1, reps: "8 each side", tempo: "slow", restSec: 20, cues: ["Low back glued to floor", "Opposite arm & leg", "Exhale as you extend"] },
              { slug: "bird-dog", sets: 1, reps: "8 each side", restSec: 20, cues: ["Reach long, don't rush", "Hips stay level", "Pause 1s at full extension"] },
              { slug: "plank-hold", sets: 1, reps: "25s", restSec: 30, cues: ["Straight line head to heels", "Squeeze glutes & quads", "Don't let hips sag"] },
            ],
          },
          COOLDOWN_FULL,
        ],
      },
      {
        day: 2, title: "Core B — Anti-Rotation", focus: "Obliques & rotational strength", estMinutes: 22,
        phaseTips: {
          follicular: "Energy's up — add a slow tempo to your side planks.",
          ovulation: "Strong day — push the hollow hold a few seconds longer.",
        },
        blocks: [
          WARMUP_FULL,
          {
            kind: "main", label: "Oblique circuit", rounds: 3,
            exercises: [
              { slug: "side-plank", sets: 1, reps: "20s each side", restSec: 25, cues: ["Stack the shoulders & hips", "Lift the hips high", "Reach the top arm up"] },
              { slug: "russian-twist", sets: 1, reps: "16 total", tempo: "controlled", restSec: 25, cues: ["Rotate from the ribs", "Heels light or lifted", "Don't fling — control"] },
              { slug: "bicycle-crunch", sets: 1, reps: "12 each side", restSec: 30, cues: ["Elbow to opposite knee", "Slow, no neck pulling", "Fully extend the other leg"] },
            ],
          },
          COOLDOWN_FULL,
        ],
      },
      {
        day: 3, title: "Core C — Strength & Flexion", focus: "Full-core integration", estMinutes: 24,
        phaseTips: {
          period: "Skip the mountain climbers if crampy — hold a plank instead.",
          luteal: "Lower the rounds if energy dips; consistency over intensity.",
        },
        blocks: [
          WARMUP_FULL,
          {
            kind: "main", label: "Core strength", rounds: 3,
            exercises: [
              { slug: "hollow-body-hold", sets: 1, reps: "20s", restSec: 25, cues: ["Low back pressed down", "Arms & legs long", "Lower until you feel the core, not the back"] },
              { slug: "leg-raises", sets: 1, reps: "12", tempo: "3-0-1", restSec: 25, cues: ["Lower slowly", "Hands under hips if needed", "No arching"] },
              { slug: "pilates-hundred", sets: 1, reps: "100 pumps", restSec: 30, cues: ["Small fast arm pumps", "Breathe in 5, out 5", "Chin off chest, gaze to navel"] },
            ],
          },
          {
            kind: "finisher", label: "Cardio core", rounds: 2,
            exercises: [
              { slug: "mountain-climbers", sets: 1, reps: "30s", restSec: 30, cues: ["Hips low & level", "Quick light feet", "Shoulders over wrists"] },
            ],
          },
          COOLDOWN_FULL,
        ],
      },
    ],
    progression: PROG_6WK_BUILD,
  },

  // ---------------------------------------------------------------------------
  {
    id: "cycle-reset-4",
    title: "4-Week Cycle-Synced Reset",
    tagline: "Train with your hormones, not against them. No equipment.",
    goal: "energy", level: "Beginner", equipment: "none",
    weeks: 4, daysPerWeek: 3, image: "/images/workout-hero-discover.png",
    tier: "free",
    promise: [
      "A full-body habit you can actually keep",
      "Movement matched to each cycle phase",
      "Zero equipment — do it anywhere",
    ],
    whoFor: "New to training, coming back after a break, or wanting a gentle phase-aware restart.",
    whyItWorks: [
      "Each session adapts effort to your phase — harder when energy is naturally high, restorative when it's low.",
      "Full-body, bodyweight basics build a foundation without overwhelming you.",
      "A sustainable 3-days-a-week rhythm beats an intense plan you quit in week two.",
    ],
    phaseSynced: true,
    template: [
      {
        day: 1, title: "Full Body Flow A", focus: "Bodyweight basics, head to toe", estMinutes: 20,
        phaseTips: {
          period: "Restorative pace today. Fewer rounds, longer breaths — showing up is the win.",
          follicular: "Energy rising — add a round if you feel good.",
          ovulation: "Strongest phase — make the squats deep and the push-ups full.",
          luteal: "Steady and kind. Don't chase intensity, chase consistency.",
        },
        blocks: [
          WARMUP_FULL,
          {
            kind: "main", label: "Full-body circuit", rounds: 3,
            exercises: [
              { slug: "squat", sets: 1, reps: "12", tempo: "2-1-1", restSec: 30, cues: ["Sit back & down", "Knees track over toes", "Chest proud"] },
              { slug: "push-up-knees", sets: 1, reps: "8–10", restSec: 30, cues: ["Hands under shoulders", "Lower with control", "Body in one line"] },
              { slug: "glute-bridge", sets: 1, reps: "15", restSec: 30, cues: ["Squeeze at the top", "Ribs down"] },
              { slug: "dead-bug", sets: 1, reps: "8 each side", restSec: 30, cues: ["Low back stays down", "Slow & controlled"] },
            ],
          },
          COOLDOWN_FULL,
        ],
      },
      {
        day: 2, title: "Full Body Flow B", focus: "Lunges, pushing & core", estMinutes: 20,
        phaseTips: {
          period: "Swap lunges for glute bridges if you're low — listen in.",
          ovulation: "Add tempo to the lunges; you've got the power today.",
        },
        blocks: [
          WARMUP_FULL,
          {
            kind: "main", label: "Full-body circuit", rounds: 3,
            exercises: [
              { slug: "walking-lunge", sets: 1, reps: "10 each leg", restSec: 30, cues: ["Long step", "Back knee toward floor", "Push through front heel"] },
              { slug: "side-lunge", sets: 1, reps: "8 each side", restSec: 30, cues: ["Sit into one hip", "Other leg straight", "Chest up"] },
              { slug: "plank-hold", sets: 1, reps: "25s", restSec: 30, cues: ["One straight line", "Brace the belly", "Breathe"] },
              { slug: "bird-dog", sets: 1, reps: "8 each side", restSec: 30, cues: ["Reach long", "Hips level"] },
            ],
          },
          COOLDOWN_FULL,
        ],
      },
      {
        day: 3, title: "Full Body Flow C", focus: "Light cardio + strength blend", estMinutes: 22,
        phaseTips: {
          period: "Skip the squat jumps — keep both feet grounded today.",
          follicular: "Great day to try the jumps if you feel springy.",
          ovulation: "Bring intensity — this is your peak-energy window.",
          luteal: "Drop a round if you need to. Soft strength still builds strength.",
        },
        blocks: [
          WARMUP_FULL,
          {
            kind: "main", label: "Strength + cardio", rounds: 3,
            exercises: [
              { slug: "squat", sets: 1, reps: "15", restSec: 30, cues: ["Full depth", "Drive up through heels"] },
              { slug: "mountain-climbers", sets: 1, reps: "30s", restSec: 30, cues: ["Light quick feet", "Hips low"] },
              { slug: "push-up-knees", sets: 1, reps: "10", restSec: 30, cues: ["Control down", "Full lockout up"] },
              { slug: "wall-sit", sets: 1, reps: "30s", restSec: 30, cues: ["Thighs parallel", "Back flat on wall", "Breathe through it"] },
            ],
          },
          COOLDOWN_FULL,
        ],
      },
    ],
    progression: PROG_4WK_GENTLE,
  },

  // ---------------------------------------------------------------------------
  {
    id: "upper-sculpt-8",
    title: "8-Week Upper Body Sculpt",
    tagline: "Toned arms, strong back, beautiful posture.",
    goal: "tonify", level: "Intermediate", equipment: "dumbbells",
    weeks: 8, daysPerWeek: 3, image: "/images/workout-hero-library.png",
    tier: "premium",
    promise: [
      "Defined shoulders & arms without bulk",
      "A genuinely stronger back & better posture",
      "Push/pull balance that keeps shoulders healthy",
    ],
    whoFor: "You want sculpted, strong upper-body definition with structured progression.",
    whyItWorks: [
      "Balances pushing and pulling so shoulders stay healthy and posture improves.",
      "Moderate loads with rising volume drive tone (definition) without heavy bulking.",
      "Built-in deload at week 6 keeps the shoulders fresh for a strong finish.",
    ],
    phaseSynced: true,
    template: [
      {
        day: 1, title: "Push — Shoulders & Chest", focus: "Pressing strength & shape", estMinutes: 32,
        phaseTips: {
          ovulation: "Peak strength — reach for a heavier overhead press.",
          period: "Lighten the loads, keep the reps smooth. No need to push.",
        },
        blocks: [
          WARMUP_UPPER,
          {
            kind: "main", label: "Push strength", rounds: 1,
            exercises: [
              { slug: "overhead-press", sets: 3, reps: "10", tempo: "2-1-1", restSec: 60, cues: ["Ribs down, glutes tight", "Press in a straight line", "Don't lean back"], loadNote: "Last 2 reps should be challenging but clean." },
              { slug: "push-up", sets: 3, reps: "8–12", restSec: 60, cues: ["Body in one line", "Elbows ~45°", "Full range"], loadNote: "Drop to knees to keep form once it breaks down." },
              { slug: "lateral-raises", sets: 3, reps: "12–15", tempo: "2-1-2", restSec: 45, cues: ["Lead with the elbows", "Stop at shoulder height", "No swinging"], loadNote: "Lighter than you think — control is everything." },
            ],
          },
          {
            kind: "finisher", label: "Shoulder burn", rounds: 2,
            exercises: [
              { slug: "front-raises", sets: 1, reps: "15", restSec: 30, cues: ["Thumbs up", "Stop at eye line"] },
            ],
          },
          COOLDOWN_UPPER,
        ],
      },
      {
        day: 2, title: "Pull — Back & Biceps", focus: "Posture & pulling strength", estMinutes: 32,
        phaseTips: {
          follicular: "Rising energy — add a rep or two to your rows.",
          luteal: "Longer rests are fine. Keep the rows strict.",
        },
        blocks: [
          WARMUP_UPPER,
          {
            kind: "main", label: "Pull strength", rounds: 1,
            exercises: [
              { slug: "bent-over-row", sets: 3, reps: "10–12", tempo: "2-1-2", restSec: 60, cues: ["Flat back, hinge forward", "Pull to the hip", "Squeeze shoulder blades"], loadNote: "Heavier here than your press — back is strong." },
              { slug: "superman-hold", sets: 3, reps: "20s", restSec: 45, cues: ["Lift chest & thighs", "Long through the crown", "Squeeze the glutes"] },
              { slug: "hammer-curl", sets: 3, reps: "12", tempo: "2-1-2", restSec: 45, cues: ["Elbows pinned to sides", "No swinging", "Full squeeze at top"] },
            ],
          },
          {
            kind: "finisher", label: "Posture finisher", rounds: 2,
            exercises: [
              { slug: "reverse-snow-angel", sets: 1, reps: "12", restSec: 30, cues: ["Palms down, lift arms", "Squeeze upper back"] },
            ],
          },
          COOLDOWN_UPPER,
        ],
      },
      {
        day: 3, title: "Arms & Core Sculpt", focus: "Definition & midline", estMinutes: 30,
        phaseTips: {
          ovulation: "Strong day — superset with little rest for a real pump.",
          period: "Keep it light and flowing; this is a feel-good session.",
        },
        blocks: [
          WARMUP_UPPER,
          {
            kind: "main", label: "Arm sculpt", rounds: 3,
            exercises: [
              { slug: "tricep-dips", sets: 1, reps: "10–12", restSec: 40, cues: ["Elbows point back", "Chest up", "Lower with control"] },
              { slug: "banded-bicep-curl", sets: 1, reps: "15", restSec: 40, cues: ["Slow on the way down", "Elbows still"] },
              { slug: "arnold-press", sets: 1, reps: "10", restSec: 40, cues: ["Rotate as you press", "Smooth path", "Don't shrug"] },
              { slug: "plank-hold", sets: 1, reps: "30s", restSec: 40, cues: ["One line", "Brace hard"] },
            ],
          },
          COOLDOWN_UPPER,
        ],
      },
    ],
    progression: PROG_8WK_STRENGTH,
  },

  // ---------------------------------------------------------------------------
  {
    id: "total-tone-6",
    title: "6-Week Total Body Tone",
    tagline: "Lean, strong and sculpted — full body, three days a week.",
    goal: "tonify", level: "Intermediate", equipment: "bands",
    weeks: 6, daysPerWeek: 3, image: "/images/workout-hero-program.png",
    tier: "premium",
    promise: [
      "Full-body definition in six focused weeks",
      "Efficient 30-minute sessions that fit real life",
      "Bands-only — travel-friendly and joint-kind",
    ],
    whoFor: "You want an efficient, do-anywhere plan that tones everything with minimal kit.",
    whyItWorks: [
      "Full-body sessions 3×/week hit each muscle group twice — the sweet spot for tone.",
      "Resistance bands keep constant tension, which is brilliant for muscular endurance & shape.",
      "Rising density (more work, less rest) drives the lean, toned look.",
    ],
    phaseSynced: true,
    template: [
      {
        day: 1, title: "Total Body A", focus: "Squat, push, pull, core", estMinutes: 30,
        phaseTips: {
          ovulation: "Strongest phase — shorten rests and chase the pump.",
          period: "Add rest between rounds, keep the bands light.",
        },
        blocks: [
          WARMUP_FULL,
          {
            kind: "main", label: "Full-body circuit", rounds: 3,
            exercises: [
              { slug: "sumo-squat", sets: 1, reps: "15", tempo: "2-1-1", restSec: 30, cues: ["Band above knees", "Push knees out", "Deep & tall"] },
              { slug: "banded-row", sets: 1, reps: "15", restSec: 30, cues: ["Pull to the ribs", "Squeeze the back", "Slow release"] },
              { slug: "push-up", sets: 1, reps: "10", restSec: 30, cues: ["Full range", "One line"] },
              { slug: "side-plank", sets: 1, reps: "20s each", restSec: 30, cues: ["Hips high", "Stack shoulders"] },
            ],
          },
          COOLDOWN_FULL,
        ],
      },
      {
        day: 2, title: "Total Body B", focus: "Hinge, shoulders, glutes", estMinutes: 30,
        phaseTips: {
          follicular: "Energy climbing — add a round if you've got it.",
          luteal: "Steady density; don't force the pace today.",
        },
        blocks: [
          WARMUP_FULL,
          {
            kind: "main", label: "Full-body circuit", rounds: 3,
            exercises: [
              { slug: "romanian-deadlift", sets: 1, reps: "12", tempo: "3-1-1", restSec: 30, cues: ["Hips back", "Bands/weights close", "Hamstring stretch then squeeze"] },
              { slug: "lateral-raises", sets: 1, reps: "15", restSec: 30, cues: ["Lead with elbows", "Stop at shoulder height"] },
              { slug: "clamshells", sets: 1, reps: "15 each", restSec: 30, cues: ["Band above knees", "Hips stacked"] },
              { slug: "dead-bug", sets: 1, reps: "8 each", restSec: 30, cues: ["Back glued down", "Slow"] },
            ],
          },
          COOLDOWN_FULL,
        ],
      },
      {
        day: 3, title: "Total Body C", focus: "Conditioning + sculpt", estMinutes: 30,
        phaseTips: {
          ovulation: "Bring intensity — this is your conditioning peak.",
          period: "Swap squat jumps for tempo squats; keep both feet down.",
          luteal: "Lower the rounds if you're tired. Soft strength still counts.",
        },
        blocks: [
          WARMUP_FULL,
          {
            kind: "main", label: "Conditioning circuit", rounds: 3,
            exercises: [
              { slug: "jump-squat", sets: 1, reps: "12", restSec: 30, cues: ["Land soft & quiet", "Sink then explode", "Knees out"] },
              { slug: "renegade-row", sets: 1, reps: "8 each", restSec: 30, cues: ["Wide feet for stability", "Hips don't twist", "Row to the hip"] },
              { slug: "curtsy-lunge", sets: 1, reps: "10 each", restSec: 30, cues: ["Step back & across", "Hips square"] },
              { slug: "bicycle-crunch", sets: 1, reps: "12 each", restSec: 30, cues: ["Slow rotation", "No neck pull"] },
            ],
          },
          COOLDOWN_FULL,
        ],
      },
    ],
    progression: PROG_6WK_BUILD,
  },

  // ---------------------------------------------------------------------------
  {
    id: "foundations-4",
    title: "4-Week Beginner Foundations",
    tagline: "Brand new to training? Start here. Gentle, safe, no equipment.",
    goal: "energy", level: "Beginner", equipment: "none",
    weeks: 4, daysPerWeek: 2, image: "/images/workout-hero-bestshape.png",
    tier: "free",
    promise: [
      "Master the 6 fundamental movements safely",
      "Build the confidence (and habit) to keep going",
      "Just 2 short days a week — totally doable",
    ],
    whoFor: "Complete beginners who want to start the right way, without intimidation.",
    whyItWorks: [
      "Teaches the foundational patterns — squat, hinge, push, pull, brace, lunge — before any intensity.",
      "Two short sessions a week makes the habit stick without burning you out.",
      "Slow tempos build control and body-awareness that everything else is built on.",
    ],
    phaseSynced: true,
    template: [
      {
        day: 1, title: "Foundations A", focus: "Squat, push & brace", estMinutes: 18,
        phaseTips: {
          period: "Take it gently — even one round is a real win this week.",
          ovulation: "Feeling strong? Add a round and slow your tempo.",
        },
        blocks: [
          WARMUP_FULL,
          {
            kind: "main", label: "Learn the basics", rounds: 2,
            exercises: [
              { slug: "squat", sets: 1, reps: "10", tempo: "3-1-1", restSec: 40, cues: ["Sit back like into a chair", "Heels stay down", "Stand tall & squeeze"] },
              { slug: "push-up-knees", sets: 1, reps: "6–8", restSec: 40, cues: ["Hands under shoulders", "Lower slowly", "Keep a straight line"] },
              { slug: "glute-bridge", sets: 1, reps: "12", restSec: 40, cues: ["Feet flat", "Squeeze at the top"] },
              { slug: "plank-hold", sets: 1, reps: "20s", restSec: 40, cues: ["Forearms down", "Brace the belly", "Don't hold your breath"] },
            ],
          },
          COOLDOWN_FULL,
        ],
      },
      {
        day: 2, title: "Foundations B", focus: "Hinge, lunge & core", estMinutes: 18,
        phaseTips: {
          period: "Skip the lunge if your balance feels off — repeat the bridge instead.",
          follicular: "Energy lifting — try one more round than last time.",
        },
        blocks: [
          WARMUP_FULL,
          {
            kind: "main", label: "Learn the basics", rounds: 2,
            exercises: [
              { slug: "romanian-deadlift", sets: 1, reps: "10", tempo: "3-1-1", restSec: 40, cues: ["Soft knees", "Hips travel back", "Feel the hamstrings"], loadNote: "Bodyweight or light household weights to learn the hinge." },
              { slug: "walking-lunge", sets: 1, reps: "8 each leg", restSec: 40, cues: ["Step long", "Back knee down", "Front heel drives up"] },
              { slug: "bird-dog", sets: 1, reps: "8 each side", restSec: 40, cues: ["Reach opposite arm & leg", "Hips stay level"] },
              { slug: "dead-bug", sets: 1, reps: "8 each side", restSec: 40, cues: ["Low back down", "Move slowly"] },
            ],
          },
          COOLDOWN_FULL,
        ],
      },
    ],
    progression: PROG_4WK_GENTLE,
  },
];

/* ==================== WEEK COMPUTATION (progressive overload) ==================== */

/** Parse the leading integer from a reps string ("10–12" → 10, "30s" → 30). */
function leadingNumber(reps: string): number | null {
  const m = reps.match(/\d+/);
  return m ? parseInt(m[0], 10) : null;
}

/** Apply a reps multiplier while preserving the original format/suffix. */
function scaleReps(reps: string, mult: number): string {
  if (mult === 1) return reps;
  // Range like "10–12" or "10-12"
  const range = reps.match(/^(\d+)\s*[–-]\s*(\d+)(.*)$/);
  if (range) {
    const lo = Math.round(parseInt(range[1], 10) * mult);
    const hi = Math.round(parseInt(range[2], 10) * mult);
    return `${lo}–${hi}${range[3]}`;
  }
  // Single number with optional suffix like "30s", "8 each side", "100 pumps"
  const single = reps.match(/^(\d+)(.*)$/);
  if (single) {
    const n = Math.round(parseInt(single[1], 10) * mult);
    return `${n}${single[2]}`;
  }
  return reps; // non-numeric ("slow", "controlled") — leave as-is
}

const clampIdx = (arr: number[], week: number) =>
  arr.length ? arr[Math.min(week - 1, arr.length - 1)] ?? 0 : 0;

/**
 * Compute a concrete session for a given 1-indexed week by applying the
 * program's progression to its base template. Warm-up and cool-down blocks are
 * never overloaded; deload weeks pull main volume back to ~60%.
 */
export function computeWeekSession(program: Program, sessionIndex: number, week: number): ProgramSession {
  const base = program.template[sessionIndex];
  if (!base) throw new Error(`No template session ${sessionIndex} in ${program.id}`);

  const p = program.progression;
  const isDeload = p.deloadWeeks.includes(week);

  const addSets = isDeload ? -1 : clampIdx(p.addSetsByWeek, week);
  const repsMult = isDeload ? 0.7 : (p.repsMultByWeek[Math.min(week - 1, p.repsMultByWeek.length - 1)] ?? 1);
  const restCut = isDeload ? -10 : clampIdx(p.restCutByWeek, week);

  const blocks: ProgramBlock[] = base.blocks.map((block) => {
    if (block.kind === "warmup" || block.kind === "cooldown") return block;
    return {
      ...block,
      exercises: block.exercises.map((ex) => {
        const sets = Math.max(1, ex.sets + (block.kind === "main" ? addSets : 0));
        const reps = leadingNumber(ex.reps) !== null ? scaleReps(ex.reps, repsMult) : ex.reps;
        const restSec = Math.max(15, ex.restSec - (block.kind === "main" ? restCut : 0));
        return { ...ex, sets, reps, restSec };
      }),
    };
  });

  return { ...base, blocks };
}

/** Metadata for a given week (theme + what changed). */
export function weekMeta(program: Program, week: number): { theme: string; note: string; isDeload: boolean } {
  const t = program.progression.weekThemes[Math.min(week - 1, program.progression.weekThemes.length - 1)]
    ?? { theme: `Week ${week}`, note: "" };
  return { ...t, isDeload: program.progression.deloadWeeks.includes(week) };
}

/** Total prescribed work sets in a computed session (warm-up/cool-down excluded). */
export function sessionVolume(session: ProgramSession): number {
  return session.blocks
    .filter((b) => b.kind === "main" || b.kind === "finisher")
    .reduce((sum, b) => sum + (b.rounds ?? 1) * b.exercises.reduce((s, e) => s + e.sets, 0), 0);
}

export function getProgram(id: string): Program | undefined {
  return PROGRAMS.find((p) => p.id === id);
}
