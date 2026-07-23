import type { LucideIcon } from "lucide-react";
import {
  Flame, Activity, Zap, Wind, Footprints, Sparkles, Sparkle, Dumbbell, Waves, Moon,
  BatteryLow, Battery, BatteryMedium,
} from "lucide-react";
import type { CyclePhase } from "../cyclePhase";

/* ==================== TYPES ==================== */

export type Zone = "glutes" | "core" | "arms" | "back" | "legs" | "full-body";
export type WorkoutIntention = "tonify" | "strengthen" | "stretch" | "recover";
export type Level = "Beginner" | "Intermediate" | "Advanced";
export type Equipment = "none" | "mat" | "bands" | "dumbbells" | "gym";
export type Goal = "energy" | "tonify" | "strengthen" | "flexibility";
export type EnergyLevel = "exhausted" | "normal" | "good" | "fire";

export interface WorkoutProfile {
  level: Level;
  goal: Goal;
  equipment: Equipment;
  daysPerWeek: 2 | 3 | 4 | 5;
}

export interface Exercise {
  slug: string;
  name: string;
  /** Placeholder path — image to be supplied later by FZ and attached by filename. */
  image: string;
  muscles: string;
  /** Spoken coaching clip for this move ("/audio/workout-{slug}.mp3"). Optional
   *  — the player just stays silent if a move has no recording yet. */
  audio?: string;
  /** True for one-sided moves (a leg/arm/side at a time). The session then
   *  trains BOTH sides: side 1 → "switch sides" cue → side 2, so no session
   *  ever leaves one side untrained. */
  unilateral?: boolean;
}

/** Session-level cues (not tied to one exercise). */
export const WORKOUT_REST_AUDIO = "/audio/workout-rest.mp3";
export const WORKOUT_SWITCH_AUDIO = "/audio/workout-switch.mp3";

/* ==================== ZONES ====================
   Zone image naming convention: /images/zone-{key}.webp (square, 800x800) */

export const ZONES: { key: Zone; label: string; icon: LucideIcon; image: string }[] = [
  { key: "glutes", label: "Glutes", icon: Flame, image: "/images/zone-glutes.webp" },
  { key: "core", label: "Abs & Core", icon: Activity, image: "/images/zone-core.webp" },
  { key: "arms", label: "Arms & Shoulders", icon: Zap, image: "/images/zone-arms.webp" },
  { key: "back", label: "Back", icon: Wind, image: "/images/zone-back.webp" },
  { key: "legs", label: "Legs & Thighs", icon: Footprints, image: "/images/zone-legs.webp" },
  { key: "full-body", label: "Full Body", icon: Sparkles, image: "/images/zone-full-body.webp" },
];

/* ==================== HERO IMAGES ====================
   Wide banner images (1600x900, 16:9). Displayed responsively with object-cover. */

export const HERO_IMAGES = {
  discover: "/images/workout-hero-discover.webp",
  program: "/images/workout-hero-program.webp",
  library: "/images/workout-hero-library.webp",
  bestShape: "/images/workout-hero-bestshape.webp",
  session: "/images/workout-hero-session.webp",
};

/* ==================== INTENTIONS ==================== */

export const WORKOUT_INTENTIONS: { key: WorkoutIntention; label: string; desc: string; icon: LucideIcon }[] = [
  { key: "tonify", label: "Tonify", desc: "Pilates-style, banded, isometric — sculpting without bulk", icon: Sparkle },
  { key: "strengthen", label: "Strengthen", desc: "Weighted, resistance, bodyweight intensity — building strength", icon: Dumbbell },
  { key: "stretch", label: "Stretch", desc: "Mobility, flexibility, lengthening — recovery-adjacent", icon: Waves },
  { key: "recover", label: "Recover", desc: "Gentle movement, yin, breathwork — rest day sessions", icon: Moon },
];

/* ==================== EXERCISES ====================
   Image naming convention: /images/workout-{slug}.webp
   Real photography, clean & bright, works cropped to 16:9 and square. */

const E = (slug: string, name: string, muscles: string, opts?: { audio?: boolean; uni?: boolean }): Exercise => ({
  slug, name, muscles, image: `/images/workout-${slug}.webp`,
  ...(opts?.audio ? { audio: `/audio/workout-${slug}.mp3` } : {}),
  ...(opts?.uni ? { unilateral: true } : {}),
});

export const EXERCISES: Record<string, Exercise> = {
  // Glutes — every move has a spoken audio cue; one-sided moves are marked
  // unilateral so the session trains both sides with a switch cue between.
  "sumo-squat": E("sumo-squat", "Sumo Squat", "Glutes, inner thighs, quads", { audio: true }),
  "hip-thrust": E("hip-thrust", "Hip Thrust", "Glutes, hamstrings", { audio: true }),
  "donkey-kicks": E("donkey-kicks", "Donkey Kicks", "Glutes", { audio: true, uni: true }),
  "glute-bridge": E("glute-bridge", "Glute Bridge", "Glutes, hamstrings, core", { audio: true }),
  "clamshells": E("clamshells", "Clamshells", "Glutes, hip stabilizers", { audio: true, uni: true }),
  "fire-hydrants": E("fire-hydrants", "Fire Hydrants", "Glutes, hip abductors", { audio: true, uni: true }),
  "side-lying-leg-raises": E("side-lying-leg-raises", "Side-Lying Leg Raises", "Outer glutes, hips", { audio: true, uni: true }),
  "bulgarian-split-squat": E("bulgarian-split-squat", "Bulgarian Split Squat", "Glutes, quads, balance", { audio: true, uni: true }),
  "romanian-deadlift": E("romanian-deadlift", "Romanian Deadlift", "Glutes, hamstrings, back", { audio: true }),
  "weighted-hip-thrust": E("weighted-hip-thrust", "Weighted Hip Thrust", "Glutes, hamstrings", { audio: true }),
  "step-ups": E("step-ups", "Step-Ups", "Glutes, quads", { audio: true, uni: true }),
  "squat-jump": E("squat-jump", "Squat Jump", "Glutes, quads, power", { audio: true }),
  "kettlebell-swing": E("kettlebell-swing", "Kettlebell Swing", "Glutes, hamstrings, core", { audio: true }),
  "pigeon-pose": E("pigeon-pose", "Pigeon Pose", "Glutes, outer hips", { audio: true, uni: true }),
  "figure-four-stretch": E("figure-four-stretch", "Figure-Four Stretch", "Glutes, outer hips", { audio: true, uni: true }),
  "low-lunge-hip-flexor": E("low-lunge-hip-flexor", "Low Lunge Hip Flexor Stretch", "Hip flexors, glutes", { audio: true, uni: true }),
  "butterfly-seated": E("butterfly-seated", "Seated Butterfly Stretch", "Inner thighs, hips", { audio: true }),
  "supine-twist": E("supine-twist", "Supine Twist", "Glutes, lower back, spine", { audio: true, uni: true }),
  "hip-circles": E("hip-circles", "Gentle Hip Circles", "Hips, glutes (mobility)", { audio: true }),
  "reclined-butterfly": E("reclined-butterfly", "Reclined Butterfly", "Inner thighs, hips (rest)", { audio: true }),
  "foam-roll-glutes": E("foam-roll-glutes", "Foam Roll: Glutes", "Glutes (release)", { audio: true, uni: true }),

  // Core
  "dead-bug": E("dead-bug", "Dead Bug", "Deep core, coordination"),
  "bird-dog": E("bird-dog", "Bird Dog", "Core, back, balance"),
  "pilates-hundred": E("pilates-hundred", "Pilates Hundred", "Deep core, breath control"),
  "leg-raises": E("leg-raises", "Leg Raises", "Lower abs"),
  "scissor-kicks": E("scissor-kicks", "Scissor Kicks", "Lower abs, hip flexors"),
  "plank-hold": E("plank-hold", "Plank Hold", "Core, shoulders"),
  "side-plank": E("side-plank", "Side Plank", "Obliques, core"),
  "crunch": E("crunch", "Crunch", "Upper abs"),
  "bicycle-crunch": E("bicycle-crunch", "Bicycle Crunch", "Abs, obliques"),
  "mountain-climbers": E("mountain-climbers", "Mountain Climbers", "Core, shoulders, cardio"),
  "hollow-body-hold": E("hollow-body-hold", "Hollow Body Hold", "Deep core"),
  "russian-twist": E("russian-twist", "Russian Twist", "Obliques, core"),
  "hanging-knee-raise": E("hanging-knee-raise", "Hanging Knee Raise", "Lower abs, grip"),
  "cobra-pose": E("cobra-pose", "Cobra Pose", "Abs (lengthen), spine"),
  "seated-side-bend": E("seated-side-bend", "Seated Side Bend", "Obliques, sides"),
  "supine-spinal-twist": E("supine-spinal-twist", "Supine Spinal Twist", "Spine, core (release)"),
  "diaphragmatic-breathing": E("diaphragmatic-breathing", "Diaphragmatic Breathing", "Deep core, calm"),
  "pelvic-floor-release": E("pelvic-floor-release", "Pelvic Floor Release", "Pelvic floor, core (rest)"),
  "cat-cow": E("cat-cow", "Cat-Cow", "Spine, core, back (mobility)"),
  "childs-pose": E("childs-pose", "Child's Pose", "Hips, back (rest)"),

  // Arms & Shoulders
  "tricep-dips": E("tricep-dips", "Tricep Dips", "Triceps, shoulders"),
  "lateral-raises": E("lateral-raises", "Lateral Raises", "Shoulders"),
  "front-raises": E("front-raises", "Front Raises", "Front shoulders"),
  "banded-bicep-curl": E("banded-bicep-curl", "Banded Bicep Curl", "Biceps"),
  "shoulder-circles": E("shoulder-circles", "Shoulder Circles", "Shoulders (mobility)"),
  "push-up-knees": E("push-up-knees", "Push-Up on Knees", "Chest, arms, core"),
  "push-up": E("push-up", "Push-Up", "Chest, arms, core"),
  "overhead-press": E("overhead-press", "Overhead Press", "Shoulders, arms"),
  "arnold-press": E("arnold-press", "Arnold Press", "Shoulders, arms"),
  "tricep-overhead-extension": E("tricep-overhead-extension", "Tricep Overhead Extension", "Triceps"),
  "hammer-curl": E("hammer-curl", "Hammer Curl", "Biceps, forearms"),
  "diamond-push-up": E("diamond-push-up", "Diamond Push-Up", "Triceps, chest"),
  "cross-body-shoulder-stretch": E("cross-body-shoulder-stretch", "Cross-Body Shoulder Stretch", "Shoulders"),
  "overhead-tricep-stretch": E("overhead-tricep-stretch", "Overhead Tricep Stretch", "Triceps, shoulders"),
  "chest-opener": E("chest-opener", "Chest Opener Stretch", "Chest, shoulders"),
  "doorway-stretch": E("doorway-stretch", "Doorway Stretch", "Chest, shoulders"),
  "neck-rolls": E("neck-rolls", "Neck Rolls", "Neck (release)"),
  "shoulder-rolls": E("shoulder-rolls", "Shoulder Rolls", "Shoulders (release)"),
  "wrist-circles": E("wrist-circles", "Wrist Circles", "Wrists, forearms"),
  "gentle-arm-swings": E("gentle-arm-swings", "Gentle Arm Swings", "Arms, shoulders (mobility)"),

  // Back
  "superman-hold": E("superman-hold", "Superman Hold", "Lower back, glutes"),
  "reverse-snow-angel": E("reverse-snow-angel", "Reverse Snow Angel", "Upper back, shoulders"),
  "banded-row": E("banded-row", "Banded Row", "Mid back, lats"),
  "wall-angels": E("wall-angels", "Wall Angels", "Upper back, posture"),
  "back-extension": E("back-extension", "Back Extension", "Lower back"),
  "bent-over-row": E("bent-over-row", "Bent-Over Row", "Back, biceps"),
  "deadlift": E("deadlift", "Deadlift", "Back, glutes, hamstrings"),
  "lat-pulldown-band": E("lat-pulldown-band", "Banded Lat Pulldown", "Lats, back"),
  "pull-up": E("pull-up", "Pull-Up", "Back, biceps"),
  "renegade-row": E("renegade-row", "Renegade Row", "Back, core, arms"),
  "thread-the-needle": E("thread-the-needle", "Thread the Needle", "Upper back, shoulders (release)"),
  "seated-forward-fold": E("seated-forward-fold", "Seated Forward Fold", "Back, hamstrings (release)"),
  "thoracic-rotation": E("thoracic-rotation", "Thoracic Rotation", "Upper back, spine"),
  "foam-roll-thoracic": E("foam-roll-thoracic", "Foam Roll: Upper Back", "Upper back (release)"),
  "supported-fish-pose": E("supported-fish-pose", "Supported Fish Pose", "Chest, upper back (rest)"),

  // Legs & Thighs
  "inner-thigh-squeeze": E("inner-thigh-squeeze", "Inner Thigh Squeeze", "Inner thighs"),
  "curtsy-lunge": E("curtsy-lunge", "Curtsy Lunge", "Glutes, inner thighs"),
  "side-lunge": E("side-lunge", "Side Lunge", "Inner thighs, quads"),
  "standing-leg-circles": E("standing-leg-circles", "Standing Leg Circles", "Hips, balance"),
  "squat": E("squat", "Squat", "Quads, glutes, hamstrings"),
  "walking-lunge": E("walking-lunge", "Walking Lunge", "Quads, glutes"),
  "jump-squat": E("jump-squat", "Jump Squat", "Legs, power"),
  "wall-sit": E("wall-sit", "Wall Sit", "Quads (isometric)"),
  "single-leg-deadlift": E("single-leg-deadlift", "Single-Leg Deadlift", "Hamstrings, balance"),
  "standing-quad-stretch": E("standing-quad-stretch", "Standing Quad Stretch", "Quads"),
  "seated-hamstring-stretch": E("seated-hamstring-stretch", "Seated Hamstring Stretch", "Hamstrings"),
  "lizard-lunge": E("lizard-lunge", "Lizard Lunge", "Hip flexors, inner thighs"),
  "it-band-stretch": E("it-band-stretch", "IT Band Stretch", "Outer thigh, hips"),
  "legs-up-wall": E("legs-up-wall", "Legs-Up-the-Wall", "Legs, circulation (rest)"),
  "gentle-calf-raises": E("gentle-calf-raises", "Gentle Calf Raises", "Calves"),
  "reclined-hamstring-stretch": E("reclined-hamstring-stretch", "Reclined Hamstring Stretch", "Hamstrings (release)"),

  // Full Body
  "pilates-circuit": E("pilates-circuit", "Full-Body Pilates Circuit", "Full body, core"),
  "banded-total-body": E("banded-total-body", "Banded Total Body", "Full body"),
  "low-impact-cardio-sculpt": E("low-impact-cardio-sculpt", "Low-Impact Cardio Sculpt", "Full body, cardio"),
  "hiit-circuit": E("hiit-circuit", "HIIT Circuit", "Full body, cardio"),
  "functional-training": E("functional-training", "Functional Training Flow", "Full body"),
  "strength-circuit": E("strength-circuit", "Strength Circuit (Push/Pull/Squat/Hinge)", "Full body strength"),
  "full-body-flow": E("full-body-flow", "Full-Body Flow", "Full body (mobility)"),
  "sun-salutation-adapted": E("sun-salutation-adapted", "Sun Salutation (Adapted)", "Full body (mobility)"),
  "morning-mobility-routine": E("morning-mobility-routine", "Morning Mobility Routine", "Full body (mobility)"),
  "yin-sequence": E("yin-sequence", "Yin Sequence", "Full body (deep release)"),
  "body-scan-stretch": E("body-scan-stretch", "Body Scan Stretch", "Full body (rest)"),
  "full-body-foam-roll": E("full-body-foam-roll", "Full-Body Foam Roll", "Full body (release)"),
};

// One-sided moves in the OTHER zones (glutes are flagged inline above). Marking
// them here means the "train both sides" switch logic covers every program, so
// no session ever leaves one side untrained. Audio for these comes later.
const UNILATERAL_SLUGS = [
  // core
  "side-plank", "supine-spinal-twist", "seated-side-bend",
  // arms
  "cross-body-shoulder-stretch", "overhead-tricep-stretch",
  // back
  "thread-the-needle", "thoracic-rotation",
  // legs
  "curtsy-lunge", "side-lunge", "standing-leg-circles", "standing-quad-stretch",
  "lizard-lunge", "it-band-stretch", "single-leg-deadlift", "reclined-hamstring-stretch",
];
for (const slug of UNILATERAL_SLUGS) { if (EXERCISES[slug]) EXERCISES[slug].unilateral = true; }

/* ==================== ZONE × INTENTION → EXERCISES ==================== */

export const ZONE_INTENTION_EXERCISES: Record<string, string[]> = {
  "glutes-tonify": ["sumo-squat", "hip-thrust", "donkey-kicks", "glute-bridge", "clamshells", "fire-hydrants", "side-lying-leg-raises"],
  "glutes-strengthen": ["bulgarian-split-squat", "romanian-deadlift", "weighted-hip-thrust", "step-ups", "squat-jump", "kettlebell-swing"],
  "glutes-stretch": ["pigeon-pose", "figure-four-stretch", "low-lunge-hip-flexor", "butterfly-seated", "supine-twist"],
  "glutes-recover": ["hip-circles", "childs-pose", "reclined-butterfly", "foam-roll-glutes"],

  "core-tonify": ["dead-bug", "bird-dog", "pilates-hundred", "leg-raises", "scissor-kicks", "plank-hold", "side-plank"],
  "core-strengthen": ["crunch", "bicycle-crunch", "mountain-climbers", "hollow-body-hold", "russian-twist", "hanging-knee-raise"],
  "core-stretch": ["cat-cow", "cobra-pose", "seated-side-bend", "supine-spinal-twist"],
  "core-recover": ["diaphragmatic-breathing", "cat-cow", "childs-pose", "pelvic-floor-release"],

  "arms-tonify": ["tricep-dips", "lateral-raises", "front-raises", "banded-bicep-curl", "shoulder-circles", "push-up-knees"],
  "arms-strengthen": ["push-up", "overhead-press", "arnold-press", "tricep-overhead-extension", "hammer-curl", "diamond-push-up"],
  "arms-stretch": ["cross-body-shoulder-stretch", "overhead-tricep-stretch", "chest-opener", "doorway-stretch"],
  "arms-recover": ["neck-rolls", "shoulder-rolls", "wrist-circles", "gentle-arm-swings"],

  "back-tonify": ["superman-hold", "reverse-snow-angel", "banded-row", "wall-angels", "back-extension"],
  "back-strengthen": ["bent-over-row", "deadlift", "lat-pulldown-band", "pull-up", "renegade-row"],
  "back-stretch": ["childs-pose", "thread-the-needle", "seated-forward-fold", "cat-cow", "thoracic-rotation"],
  "back-recover": ["foam-roll-thoracic", "back-extension", "supported-fish-pose"],

  "legs-tonify": ["inner-thigh-squeeze", "curtsy-lunge", "side-lunge", "sumo-squat", "standing-leg-circles"],
  "legs-strengthen": ["squat", "walking-lunge", "jump-squat", "wall-sit", "single-leg-deadlift"],
  "legs-stretch": ["standing-quad-stretch", "seated-hamstring-stretch", "lizard-lunge", "it-band-stretch"],
  "legs-recover": ["legs-up-wall", "gentle-calf-raises", "reclined-hamstring-stretch"],

  "full-body-tonify": ["pilates-circuit", "banded-total-body", "low-impact-cardio-sculpt"],
  "full-body-strengthen": ["hiit-circuit", "functional-training", "strength-circuit"],
  "full-body-stretch": ["full-body-flow", "sun-salutation-adapted", "morning-mobility-routine"],
  "full-body-recover": ["yin-sequence", "body-scan-stretch", "full-body-foam-roll"],
};

/* ==================== ZONE → ALL EXERCISES (for Library) ==================== */

export const ZONE_EXERCISES: Record<Zone, Exercise[]> = (() => {
  const out = {} as Record<Zone, Exercise[]>;
  for (const zone of ["glutes", "core", "arms", "back", "legs", "full-body"] as Zone[]) {
    const seen = new Set<string>();
    const list: Exercise[] = [];
    for (const intention of ["tonify", "strengthen", "stretch", "recover"] as WorkoutIntention[]) {
      for (const slug of ZONE_INTENTION_EXERCISES[`${zone}-${intention}`] ?? []) {
        if (seen.has(slug)) continue;
        seen.add(slug);
        list.push(EXERCISES[slug]);
      }
    }
    out[zone] = list;
  }
  return out;
})();

/* ==================== SESSION NAMES ==================== */

const SESSION_NAMES: Record<string, string> = {
  "glutes-tonify": "Glute Spark", "glutes-strengthen": "Power Glutes", "glutes-stretch": "Hip Release", "glutes-recover": "Soft Glute Reset",
  "core-tonify": "Core Sculpt", "core-strengthen": "Core Power", "core-stretch": "Spine & Core Stretch", "core-recover": "Gentle Core Reset",
  "arms-tonify": "Arm Sculpt", "arms-strengthen": "Arms & Shoulders Power", "arms-stretch": "Upper Body Release", "arms-recover": "Shoulder Reset",
  "back-tonify": "Back Activation", "back-strengthen": "Back Power", "back-stretch": "Back Release", "back-recover": "Back Reset",
  "legs-tonify": "Legs Sculpt", "legs-strengthen": "Legs Power", "legs-stretch": "Legs Release", "legs-recover": "Legs Reset",
  "full-body-tonify": "Full Body Sculpt", "full-body-strengthen": "Full Body Power", "full-body-stretch": "Full Body Flow", "full-body-recover": "Full Body Reset",
};

/* ==================== PHASE OPTIMIZATION ==================== */

export const PHASE_OPTIMAL: Record<WorkoutIntention, CyclePhase[]> = {
  tonify: ["follicular", "fertile"],
  strengthen: ["follicular", "ovulation"],
  stretch: ["luteal", "period"],
  recover: ["period", "luteal"],
};

/* ==================== SESSION BUILDER ==================== */

export type StepKind = "warmup" | "work" | "cooldown" | "switch";

/** One timed step in a session — its own work/rest, label and optional rep target. */
export interface SessionStep {
  exercise: Exercise;
  kind: StepKind;
  workSec: number;
  restSec: number;
  label: string;       // "Warm-up", "Round 2 · Move 1/4", "Cool-down", "Switch sides"
  repTarget?: string;  // coaching target shown to the user ("10–12 reps", "Hold")
  /** Rep count to pace: the player counts 1→reps over `workSec` (a beat each rep).
   *  0/undefined = a timed hold (stretch / warm-up / cool-down / switch). */
  reps?: number;
  /** For one-sided moves: which side this step trains (a "switch" step sits between). */
  side?: "first" | "second";
}

// Round UP to a clean multiple of 5s (min 5) — every timer is a 5s number.
const ceil5 = (n: number) => Math.max(5, Math.ceil(n / 5) * 5);
// A small gap after a spoken clip so it's NEVER cut off (the yoga rule).
const AUDIO_TAIL = 1.6;

// Measured length (seconds) of each move's spoken clip — a step's timer is
// never shorter than its clip + tail, so audio is never cropped.
const AUDIO_SEC: Record<string, number> = {
  "foam-roll-glutes": 13.6, "hip-thrust": 13.1, "romanian-deadlift": 12.5,
  "bulgarian-split-squat": 12.0, "hip-circles": 11.9, "sumo-squat": 11.8,
  "reclined-butterfly": 11.7, "supine-twist": 11.5, "pigeon-pose": 11.3,
  "butterfly-seated": 11.2, "kettlebell-swing": 11.2, "low-lunge-hip-flexor": 11.2,
  "fire-hydrants": 11.1, "clamshells": 10.6, "figure-four-stretch": 10.6,
  "squat-jump": 10.6, "side-lying-leg-raises": 10.4, "childs-pose": 10.2,
  "glute-bridge": 10.2, "step-ups": 10.2, "donkey-kicks": 10.1, "weighted-hip-thrust": 10.0,
};
const moveAudioSec = (slug: string) => AUDIO_SEC[slug] ?? 0;

/** A short reposition window between the two sides — no spoken cue here, just
 *  the music keeps playing while you switch. */
export const SWITCH_SEC = 10;

// Rep-driven work: reps × a controlled tempo, so a "15-rep" move really lasts
// long enough to do 15 controlled reps — the timer follows the reps, not a
// blank countdown. Rep counts are chosen so reps × tempo is a clean 5s number,
// giving an exact whole-second beat per rep.
const REP_TEMPO: Record<WorkoutIntention, number> = { tonify: 3, strengthen: 5, stretch: 0, recover: 0 };
const REP_COUNT: Record<Level, Record<WorkoutIntention, number>> = {
  Beginner:     { tonify: 10, strengthen: 8,  stretch: 0, recover: 0 },
  Intermediate: { tonify: 15, strengthen: 10, stretch: 0, recover: 0 },
  Advanced:     { tonify: 20, strengthen: 12, stretch: 0, recover: 0 },
};
// Stretch / recover moves are timed HOLDS, not reps.
const HOLD_SEC: Record<Level, number> = { Beginner: 30, Intermediate: 35, Advanced: 40 };

/** Audio-safe work time: >= the move's spoken clip + tail, rounded up to 5s. */
export const audioSafeSec = (slug: string, base: number) => ceil5(Math.max(base, moveAudioSec(slug) + AUDIO_TAIL));

/** Push one move into a step list. One-sided moves are split into
 *  side 1 → "switch sides" cue → side 2, so both sides are always trained, and
 *  the work time is audio-safe & 5s-aligned. Shared by free-plan AND program
 *  sessions so both get the rep pacer + switch. */
export function pushMove(
  steps: SessionStep[], ex: Exercise, kind: StepKind,
  workSec: number, restSec: number, label: string, repTarget: string | undefined, reps: number,
) {
  const w = audioSafeSec(ex.slug, workSec);
  const r = restSec > 0 ? ceil5(restSec) : 0;
  if (ex.unilateral) {
    steps.push({ exercise: ex, kind, workSec: w, restSec: 0, label: `${label} · 1st side`, repTarget, reps, side: "first" });
    steps.push({ exercise: ex, kind: "switch", workSec: SWITCH_SEC, restSec: 0, label: "Switch sides", repTarget: "other side", side: "second" });
    steps.push({ exercise: ex, kind, workSec: w, restSec: r, label: `${label} · 2nd side`, repTarget, reps, side: "second" });
  } else {
    steps.push({ exercise: ex, kind, workSec: w, restSec: r, label, repTarget, reps });
  }
}

export interface WorkoutSession {
  id: string;
  zone: Zone;
  intention: WorkoutIntention;
  name: string;
  level: Level;
  durationMin: number;
  /** Structured, ordered steps: warm-up → circuit rounds → cool-down. */
  steps: SessionStep[];
  rounds: number;
  /** Back-compat: the unique main-work exercises (used by previews/snapshots). */
  exercises: Exercise[];
  workSec: number;
  restSec: number;
  phaseOptimal: CyclePhase[];
  intensityNote: string | null;
  structureNote: string;
}

const TIMING: Record<WorkoutIntention, { workSec: number; restSec: number }> = {
  tonify: { workSec: 40, restSec: 15 },
  strengthen: { workSec: 45, restSec: 20 },
  stretch: { workSec: 30, restSec: 10 },
  recover: { workSec: 45, restSec: 10 },
};

// Phase-aware intensity: longer work / shorter rest when energy is naturally
// higher (follicular, ovulation), gentler pacing with longer rests during
// period and luteal. "any"/"fertile" stay at baseline.
export const PHASE_INTENSITY: Record<CyclePhase, { workMult: number; restMult: number; note: string | null }> = {
  period: { workMult: 0.85, restMult: 1.3, note: "Paced gently for your period — shorter work sets, longer rests" },
  follicular: { workMult: 1.05, restMult: 0.9, note: "Tuned up for your follicular phase — push a little harder" },
  fertile: { workMult: 1, restMult: 1, note: null },
  ovulation: { workMult: 1.15, restMult: 0.85, note: "Peak intensity for your ovulation phase — make it count" },
  luteal: { workMult: 0.9, restMult: 1.15, note: "Slightly softer for your luteal phase — extra rest between sets" },
  any: { workMult: 1, restMult: 1, note: null },
};

// Level shapes the work itself, not just the duration: higher levels train
// longer sets, rest a touch less, and run more circuit rounds.
const LEVEL_TUNING: Record<Level, { workMult: number; restMult: number; rounds: number; repLabel: Record<WorkoutIntention, string> }> = {
  Beginner:     { workMult: 0.9,  restMult: 1.15, rounds: 1, repLabel: { tonify: "10–12 reps", strengthen: "8–10 reps", stretch: "ease in & hold", recover: "slow & gentle" } },
  Intermediate: { workMult: 1.0,  restMult: 1.0,  rounds: 2, repLabel: { tonify: "12–15 reps", strengthen: "10–12 reps", stretch: "hold & breathe", recover: "settle & soften" } },
  Advanced:     { workMult: 1.1,  restMult: 0.85, rounds: 3, repLabel: { tonify: "15–20 reps", strengthen: "12–15 reps", stretch: "deepen & hold", recover: "fully release" } },
};

// ── Equipment awareness ──────────────────────────────────────────────────────
// Availability tiers — a user with a higher tier can do everything below it.
const EQUIP_RANK: Record<Equipment, number> = { none: 0, mat: 1, bands: 2, dumbbells: 3, gym: 4 };

/** Infer what a move needs from its slug (no per-exercise data to maintain). */
function equipmentNeeded(slug: string): Equipment {
  if (/pull-up|kettlebell/.test(slug)) return "gym";
  if (/banded|^band|lat-pulldown-band/.test(slug)) return "bands";
  if (/weighted|deadlift|overhead-press|arnold-press|hammer-curl|lateral-raises|front-raises|bent-over-row|renegade-row|tricep-overhead-extension/.test(slug)) return "dumbbells";
  if (/foam-roll/.test(slug)) return "mat";
  return "none";
}
function equipmentAllows(have: Equipment, slug: string): boolean {
  return EQUIP_RANK[have] >= EQUIP_RANK[equipmentNeeded(slug)];
}

// ── Warm-up & cool-down pools (all bodyweight, no equipment) ─────────────────
const WARMUP_UPPER = ["shoulder-circles", "gentle-arm-swings", "wall-angels"];
const WARMUP_LOWER = ["hip-circles", "cat-cow", "standing-leg-circles"];
const COOLDOWN_UPPER = ["cross-body-shoulder-stretch", "overhead-tricep-stretch", "childs-pose"];
const COOLDOWN_LOWER = ["figure-four-stretch", "seated-hamstring-stretch", "childs-pose"];
const UPPER_ZONES: Zone[] = ["arms", "back"];

function pick<T>(arr: T[], n: number): T[] { return arr.slice(0, Math.max(0, n)); }

export function buildSession(
  zone: Zone,
  intention: WorkoutIntention,
  durationMin: 10 | 20 | 30,
  level: Level,
  phase: CyclePhase = "any",
  equipment: Equipment = "gym",
): WorkoutSession {
  const key = `${zone}-${intention}`;
  const allSlugs = ZONE_INTENTION_EXERCISES[key] ?? [];

  // 1. Equipment-aware pool (fall back to the full pool if filtering is too strict).
  const filtered = allSlugs.filter((s) => equipmentAllows(equipment, s));
  const pool = filtered.length >= 3 ? filtered : allSlugs;

  // 2. Timing — REP-DRIVEN so the timer follows the reps. A work step lasts
  //    reps × tempo (a clean 5s number), but never less than its spoken clip +
  //    tail, so audio is never cropped. Rest is 5s-aligned and never shorter
  //    than the rest clip. (Phase tweaks the REST, not the rep count, so the
  //    target stays a clean, followable number.)
  const base = TIMING[intention];
  const ph = PHASE_INTENSITY[phase];
  const lv = LEVEL_TUNING[level];
  const reps = REP_COUNT[level][intention];               // 0 → timed hold
  const tempo = REP_TEMPO[intention];
  const repWork = reps > 0 ? reps * tempo : HOLD_SEC[level];
  const workFor = (slug: string) => ceil5(Math.max(repWork, moveAudioSec(slug) + AUDIO_TAIL));
  const holdWork = (slug: string) => ceil5(Math.max(30, moveAudioSec(slug) + AUDIO_TAIL));
  const restSec = ceil5(Math.max(base.restSec * ph.restMult * lv.restMult, 6.6 + AUDIO_TAIL));
  const workSec = repWork; // representative (used by previews)
  const repTargetStr = reps > 0 ? `${reps} reps` : "Hold & breathe";

  // 3. Warm-up & cool-down (skip warm-up for pure recover/stretch — they're gentle already).
  const isUpper = UPPER_ZONES.includes(zone);
  const gentle = intention === "recover" || intention === "stretch";
  const warmSlugs = gentle ? [] : pick(isUpper ? WARMUP_UPPER : WARMUP_LOWER, durationMin >= 20 ? 2 : 1);
  const coolSlugs = pick(isUpper ? COOLDOWN_UPPER : COOLDOWN_LOWER, durationMin >= 20 ? 2 : 1);

  // 4. Main circuit — distinct moves per round scale with duration, then repeat
  //    as proper rounds (a circuit), never random duplicates.
  const perRound = Math.min(pool.length, durationMin <= 10 ? 4 : durationMin <= 20 ? 5 : 6);
  const distinct = pool.slice(0, perRound);

  // Fit rounds to the remaining time budget after warm-up/cool-down.
  // One-sided moves cost ~2× (both sides + the switch cue), so account for that.
  const costOf = (w: number, r: number, uni: boolean) => (uni ? 2 * w + SWITCH_SEC + r : w + r);
  const warmCost = warmSlugs.reduce((a, s) => a + costOf(holdWork(s), 10, !!EXERCISES[s]?.unilateral), 0);
  const coolCost = coolSlugs.reduce((a, s) => a + costOf(holdWork(s), 5, !!EXERCISES[s]?.unilateral), 0);
  const mainBudget = durationMin * 60 - warmCost - coolCost;
  const perRoundCost = distinct.reduce((a, s) => a + costOf(workFor(s), restSec, !!EXERCISES[s]?.unilateral), 0);
  const fitRounds = Math.max(1, Math.round(mainBudget / Math.max(1, perRoundCost)));
  const rounds = Math.min(Math.max(lv.rounds, 1), Math.max(1, fitRounds) + 1, 5);

  // 5. Assemble ordered steps. One-sided moves become: side 1 → "switch sides"
  //    cue → side 2, so the session never trains only one side, and each side
  //    gets its own full paced window.
  const steps: SessionStep[] = [];
  const pushStep = (ex: Exercise, kind: StepKind, w: number, r: number, label: string, repTarget?: string, stepReps = 0) => {
    if (ex.unilateral) {
      steps.push({ exercise: ex, kind, workSec: w, restSec: 0, label: `${label} · 1st side`, repTarget, reps: stepReps, side: "first" });
      steps.push({ exercise: ex, kind: "switch", workSec: SWITCH_SEC, restSec: 0, label: "Switch sides", repTarget: "other side", side: "second" });
      steps.push({ exercise: ex, kind, workSec: w, restSec: r, label: `${label} · 2nd side`, repTarget, reps: stepReps, side: "second" });
    } else {
      steps.push({ exercise: ex, kind, workSec: w, restSec: r, label, repTarget, reps: stepReps });
    }
  };
  warmSlugs.forEach((s) => pushStep(EXERCISES[s], "warmup", holdWork(s), 10, "Warm-up", "loosen up"));
  for (let r = 0; r < rounds; r++) {
    distinct.forEach((s, i) => pushStep(
      EXERCISES[s], "work", workFor(s), restSec,
      rounds > 1 ? `Round ${r + 1} · Move ${i + 1}/${distinct.length}` : `Move ${i + 1}/${distinct.length}`,
      repTargetStr, reps,
    ));
  }
  coolSlugs.forEach((s) => pushStep(EXERCISES[s], "cooldown", holdWork(s), 5, "Cool-down", "breathe & release"));

  const structureNote = [
    warmSlugs.length ? `${warmSlugs.length}-move warm-up` : null,
    `${rounds} round${rounds > 1 ? "s" : ""} × ${distinct.length} moves`,
    coolSlugs.length ? `${coolSlugs.length}-move cool-down` : null,
  ].filter(Boolean).join(" · ");

  return {
    id: `${key}-${durationMin}-${level}-${phase}-${equipment}`,
    zone, intention, level, durationMin,
    name: SESSION_NAMES[key] ?? `${zone} · ${intention}`,
    steps, rounds,
    exercises: distinct.map((s) => EXERCISES[s]),
    workSec, restSec,
    phaseOptimal: PHASE_OPTIMAL[intention],
    intensityNote: ph.note,
    structureNote,
  };
}

/* ==================== ENERGY CHECK ==================== */

export const ENERGY_OPTIONS: { key: EnergyLevel; label: string; icon: LucideIcon }[] = [
  { key: "exhausted", label: "Exhausted", icon: BatteryLow },
  { key: "normal", label: "Normal", icon: Battery },
  { key: "good", label: "Good", icon: BatteryMedium },
  { key: "fire", label: "On fire", icon: Flame },
];

/* ==================== WEEKLY CHALLENGE ==================== */

export const WEEKLY_CHALLENGES: Record<Exclude<CyclePhase, "any">, { title: string; target: number }> = {
  period: { title: "Do one recovery session before the end of the week", target: 1 },
  follicular: { title: "Try one new session category this week", target: 1 },
  fertile: { title: "Complete 3 full sessions this week", target: 3 },
  ovulation: { title: "Complete 3 full sessions this week", target: 3 },
  luteal: { title: "5 min gentle stretch every morning this week", target: 5 },
};

/* ==================== BADGES ==================== */

export interface Badge {
  id: string;
  label: string;
  type: "consistency" | "phase" | "zone";
}

export const BADGES: Badge[] = [
  { id: "first-session", label: "First session", type: "consistency" },
  { id: "streak-7", label: "7-day streak", type: "consistency" },
  { id: "weekly-warrior", label: "Monthly warrior", type: "consistency" },
  { id: "first-period-session", label: "First menstrual session", type: "phase" },
  { id: "luteal-legend", label: "Luteal legend", type: "phase" },
  { id: "ovulation-fire", label: "Ovulation fire", type: "phase" },
  { id: "glutes-queen", label: "Glutes queen", type: "zone" },
  { id: "core-crusher", label: "Core crusher", type: "zone" },
  { id: "full-body-week", label: "Full body week", type: "zone" },
];

/* ==================== BEST SHAPE CALCULATOR ====================
   Flat-design body type illustrations (no photos).
   Image naming convention: /images/bodytype-{key}.svg (flat, line-art) */

export type BodyType = "pear" | "hourglass" | "rectangle" | "apple" | "inverted-triangle";

export const BODY_TYPES: Record<BodyType, { label: string; image: string; photo: string; strengths: string; recommended: WorkoutIntention[] }> = {
  pear: {
    label: "Pear", image: "/images/bodytype-pear.svg", photo: "/images/body-pear.webp",
    strengths: "Strong legs and glutes — natural power in your lower body.",
    recommended: ["strengthen", "tonify"],
  },
  hourglass: {
    label: "Hourglass", image: "/images/bodytype-hourglass.svg", photo: "/images/body-hourglass.webp",
    strengths: "Balanced strength throughout — great at full-body flows.",
    recommended: ["tonify", "stretch"],
  },
  rectangle: {
    label: "Rectangle", image: "/images/bodytype-rectangle.svg", photo: "/images/body-rectangle.webp",
    strengths: "Efficient, athletic build — responds fast to strength work.",
    recommended: ["strengthen", "tonify"],
  },
  apple: {
    label: "Apple", image: "/images/bodytype-apple.svg", photo: "/images/body-apple.webp",
    strengths: "Strong core and upper body — a natural base for stability work.",
    recommended: ["tonify", "stretch"],
  },
  "inverted-triangle": {
    label: "Inverted Triangle", image: "/images/bodytype-inverted-triangle.svg", photo: "/images/body-inverted-triangle.webp",
    strengths: "Strong shoulders and back — built for pulling movements.",
    recommended: ["stretch", "recover"],
  },
};
