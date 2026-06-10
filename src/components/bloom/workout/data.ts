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
}

/* ==================== ZONES ====================
   Zone image naming convention: /images/zone-{key}.jpg (square, 800x800) */

export const ZONES: { key: Zone; label: string; icon: LucideIcon; image: string }[] = [
  { key: "glutes", label: "Glutes", icon: Flame, image: "/images/zone-glutes.png" },
  { key: "core", label: "Abs & Core", icon: Activity, image: "/images/zone-core.jpg" },
  { key: "arms", label: "Arms & Shoulders", icon: Zap, image: "/images/zone-arms.png" },
  { key: "back", label: "Back", icon: Wind, image: "/images/zone-back.png" },
  { key: "legs", label: "Legs & Thighs", icon: Footprints, image: "/images/zone-legs.png" },
  { key: "full-body", label: "Full Body", icon: Sparkles, image: "/images/zone-full-body.png" },
];

/* ==================== HERO IMAGES ====================
   Wide banner images (1600x900, 16:9). Displayed responsively with object-cover. */

export const HERO_IMAGES = {
  discover: "/images/workout-hero-discover.jpg",
  program: "/images/workout-hero-program.jpg",
  library: "/images/workout-hero-library.jpg",
  bestShape: "/images/workout-hero-bestshape.jpg",
  session: "/images/workout-hero-session.jpg",
};

/* ==================== INTENTIONS ==================== */

export const WORKOUT_INTENTIONS: { key: WorkoutIntention; label: string; desc: string; icon: LucideIcon }[] = [
  { key: "tonify", label: "Tonify", desc: "Pilates-style, banded, isometric — sculpting without bulk", icon: Sparkle },
  { key: "strengthen", label: "Strengthen", desc: "Weighted, resistance, bodyweight intensity — building strength", icon: Dumbbell },
  { key: "stretch", label: "Stretch", desc: "Mobility, flexibility, lengthening — recovery-adjacent", icon: Waves },
  { key: "recover", label: "Recover", desc: "Gentle movement, yin, breathwork — rest day sessions", icon: Moon },
];

/* ==================== EXERCISES ====================
   Image naming convention: /images/workout-{slug}.jpg
   Real photography, clean & bright, works cropped to 16:9 and square. */

const E = (slug: string, name: string, muscles: string): Exercise => ({
  slug, name, muscles, image: `/images/workout-${slug}.jpg`,
});

export const EXERCISES: Record<string, Exercise> = {
  // Glutes
  "sumo-squat": E("sumo-squat", "Sumo Squat", "Glutes, inner thighs, quads"),
  "hip-thrust": E("hip-thrust", "Hip Thrust", "Glutes, hamstrings"),
  "donkey-kicks": E("donkey-kicks", "Donkey Kicks", "Glutes"),
  "glute-bridge": E("glute-bridge", "Glute Bridge", "Glutes, hamstrings, core"),
  "clamshells": E("clamshells", "Clamshells", "Glutes, hip stabilizers"),
  "fire-hydrants": E("fire-hydrants", "Fire Hydrants", "Glutes, hip abductors"),
  "side-lying-leg-raises": E("side-lying-leg-raises", "Side-Lying Leg Raises", "Outer glutes, hips"),
  "bulgarian-split-squat": E("bulgarian-split-squat", "Bulgarian Split Squat", "Glutes, quads, balance"),
  "romanian-deadlift": E("romanian-deadlift", "Romanian Deadlift", "Glutes, hamstrings, back"),
  "weighted-hip-thrust": E("weighted-hip-thrust", "Weighted Hip Thrust", "Glutes, hamstrings"),
  "step-ups": E("step-ups", "Step-Ups", "Glutes, quads"),
  "squat-jump": E("squat-jump", "Squat Jump", "Glutes, quads, power"),
  "kettlebell-swing": E("kettlebell-swing", "Kettlebell Swing", "Glutes, hamstrings, core"),
  "pigeon-pose": E("pigeon-pose", "Pigeon Pose", "Glutes, outer hips"),
  "figure-four-stretch": E("figure-four-stretch", "Figure-Four Stretch", "Glutes, outer hips"),
  "low-lunge-hip-flexor": E("low-lunge-hip-flexor", "Low Lunge Hip Flexor Stretch", "Hip flexors, glutes"),
  "butterfly-seated": E("butterfly-seated", "Seated Butterfly Stretch", "Inner thighs, hips"),
  "supine-twist": E("supine-twist", "Supine Twist", "Glutes, lower back, spine"),
  "hip-circles": E("hip-circles", "Gentle Hip Circles", "Hips, glutes (mobility)"),
  "reclined-butterfly": E("reclined-butterfly", "Reclined Butterfly", "Inner thighs, hips (rest)"),
  "foam-roll-glutes": E("foam-roll-glutes", "Foam Roll: Glutes", "Glutes (release)"),

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

export interface WorkoutSession {
  id: string;
  zone: Zone;
  intention: WorkoutIntention;
  name: string;
  level: Level;
  durationMin: number;
  exercises: Exercise[];
  workSec: number;
  restSec: number;
  phaseOptimal: CyclePhase[];
}

const TIMING: Record<WorkoutIntention, { workSec: number; restSec: number }> = {
  tonify: { workSec: 40, restSec: 15 },
  strengthen: { workSec: 45, restSec: 20 },
  stretch: { workSec: 30, restSec: 10 },
  recover: { workSec: 45, restSec: 10 },
};

export function buildSession(zone: Zone, intention: WorkoutIntention, durationMin: 10 | 20 | 30, level: Level): WorkoutSession {
  const key = `${zone}-${intention}`;
  const slugs = ZONE_INTENTION_EXERCISES[key] ?? [];
  const { workSec, restSec } = TIMING[intention];
  const cycleSec = workSec + restSec;
  const count = Math.max(3, Math.min(slugs.length, Math.round((durationMin * 60) / cycleSec)));
  // round-robin so short sessions still get variety across the available pool
  const exercises: Exercise[] = [];
  for (let i = 0; i < count; i++) exercises.push(EXERCISES[slugs[i % slugs.length]]);

  return {
    id: `${key}-${durationMin}`,
    zone, intention, level, durationMin,
    name: SESSION_NAMES[key] ?? `${zone} · ${intention}`,
    exercises, workSec, restSec,
    phaseOptimal: PHASE_OPTIMAL[intention],
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

export const BODY_TYPES: Record<BodyType, { label: string; image: string; strengths: string; recommended: WorkoutIntention[] }> = {
  pear: {
    label: "Pear", image: "/images/bodytype-pear.svg",
    strengths: "Strong legs and glutes — natural power in your lower body.",
    recommended: ["strengthen", "tonify"],
  },
  hourglass: {
    label: "Hourglass", image: "/images/bodytype-hourglass.svg",
    strengths: "Balanced strength throughout — great at full-body flows.",
    recommended: ["tonify", "stretch"],
  },
  rectangle: {
    label: "Rectangle", image: "/images/bodytype-rectangle.svg",
    strengths: "Efficient, athletic build — responds fast to strength work.",
    recommended: ["strengthen", "tonify"],
  },
  apple: {
    label: "Apple", image: "/images/bodytype-apple.svg",
    strengths: "Strong core and upper body — a natural base for stability work.",
    recommended: ["tonify", "stretch"],
  },
  "inverted-triangle": {
    label: "Inverted Triangle", image: "/images/bodytype-inverted-triangle.svg",
    strengths: "Strong shoulders and back — built for pulling movements.",
    recommended: ["stretch", "recover"],
  },
};
