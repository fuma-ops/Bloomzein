
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  ArrowLeft, ArrowRight, Sparkles, Play, Pause, SkipForward, X, Eye, EyeOff, Video, Search,
  Clock, Heart, Moon, Sun, Sparkle, Activity, CircleDot, Volume2, VolumeX,
  Bell, Languages, Music, Calendar, Flame, ChevronRight, ChevronLeft, ChevronDown,
  GraduationCap, BookOpen, Headphones, Flower, BellRing, Info, Utensils, RotateCcw, Lock,
  Trash2, CircleCheck, Circle, Tv, Wind, Waves, Gauge, type LucideIcon,
} from "lucide-react";
import { BloomBubbles } from "@/components/bloom/BloomBubbles";
import { subscribeToPush, syncScheduledNotifications, getCurrentUserId, type ScheduledNotificationInput } from "@/lib/push";
import { readCyclePhase, toYogaPhase, hasCycleSettings, PHASE_LABEL, type CyclePhase } from "@/components/bloom/cyclePhase";
import { CyclePhasePill } from "@/components/bloom/CyclePhasePill";
import { AnimatedWords } from "@/components/bloom/AnimatedWords";
import { BloomzeinIntro } from "@/components/bloom/BloomzeinIntro";
import { useAuth } from "@/contexts/AuthContext";
import { readLaunch, LAUNCH_YOGA_KEY } from "@/components/bloom/phasePlan";
import { readFuelInPlan, writeFuelInPlan, incrementYogaSession, logYogaSession, yogaSessionKcal, readYogaStreak, readYogaSessionCount, resetToolState, readYogaPlanDays, readMovementLevel, yogaFocusImage } from "@/lib/crossToolData";
import { isGuided } from "@/lib/guidedSetup";
import { useGuided, guidedNudge, GuidedFinishBar, GuidedFocusHero } from "@/components/bloom/GuidedFocus";
import { SpotlightCoach } from "@/components/bloom/SpotlightCoach";
import { todayISO, isYesterday } from "@/lib/localDate";
import { BloomFlower } from "@/components/bloom/BloomFlower";
import { flushCloudSync } from "@/lib/cloudSync";
import { readDietProfile } from "@/components/bloom/recipes/data";
import { FuelCard, yogaIntensity, normalizePhase } from "@/components/bloom/trainingFuel";
import { PickerField } from "@/components/bloom/PickerField";
import { YogaOnboarding, type YogaTourTab } from "@/components/bloom/YogaOnboarding";
import { DIARY_STORAGE_KEY, type DiaryEntry } from "./app.tools.diary";
import { isPremium, openPaywall, usePremium } from "@/lib/entitlements";

// ===================== DATA =====================

type Level = "Beginner" | "Intermediate" | "Advanced";
type Lang = "en" | "fr" | "ar";
type Mode = "visual" | "audio";

interface Pose {
  slug: string;
  name: string;
  sanskrit?: string;
  group: "Breathing" | "Warm-up" | "Hips" | "Standing" | "Balance" | "Backbends" | "Forward folds" | "Restorative" | "Strength";
  level: Level;
  image: string;
  /** Silent, seamless-loop demo clip shown during a FLOW only ("/videos/pose-{slug}.mp4").
   *  The library and all previews keep the still `image`. */
  video?: string;
  /** Clean still frame from the clip — used as the video poster. */
  poster?: string;
  /** A held pose: its clip plays once and settles on the last (pose) frame
   *  instead of looping — same treatment as a workout "hold". */
  hold?: boolean;
  /** The clip is baked as a boomerang (forward+reverse) so it ping-pong loops
   *  smoothly with no cut — same as a workout "boomerang". Such clips have no
   *  intro dissolve, so the player must not skip into them. */
  boomerang?: boolean;
  cues: Record<Lang, string>;
  audioUrl?: string; // future custom voice — left empty; TTS reads cue
  floorOnly?: boolean; // safe for beginner audio sessions
  switchStep?: boolean; // synthetic "other side" step for a one-sided pose
}

/** Poses with a looping demo clip attached. Video plays only inside a flow;
 *  the library and previews keep the still image. */
const YOGA_VIDEO_SLUGS = new Set<string>([
  "box-breathing", "alternate-nostril", "reclined-bound-angle", "supported-bridge", "gate-pose",
  "pyramid", "side-plank", "dead-bug", "reclined-figure-four", "happy-baby",
  "sphinx", "wide-legged-forward-fold", "goddess", "standing-side-stretch", "bird-dog",
  "thread-the-needle", "cat-cow", "neck-shoulder-rolls", "savasana", "legs-up-wall",
  "frog", "knees-to-chest", "seated-wide-leg-fold", "head-to-knee", "seated-forward-fold",
  "bridge", "cobra", "chair", "downward-dog", "forward-fold",
  "mountain", "butterfly", "low-lunge", "seated-twist", "childs-pose",
  "easy-seat", "supported-savasana",
  "boat", "eagle", "extended-side-angle", "fish", "forearm-plank",
  "high-lunge", "hollow-hold", "lizard", "locust", "plank",
  "reverse-plank", "standing-figure-four", "tree", "upward-dog", "warrior-2",
  "banana-pose", "bow", "camel", "chaturanga", "cow-face",
  "crescent-twist", "dancer", "garland", "half-moon", "pigeon",
  "revolved-triangle", "triangle", "warrior-3",
  "supine-twist", // genuine yoga clip now shipped (replaces the old workout copy)
]);

/** Poses whose clip should play once and settle on the last (pose) frame,
 *  instead of looping — the yoga equivalent of a workout "hold". Filled in as
 *  poses are validated; empty means every clip keeps its gentle loop for now. */
const YOGA_HOLD_SLUGS = new Set<string>([]);

/** Poses whose clip is baked as a boomerang (forward+reverse) so it ping-pong
 *  loops with no cut — the yoga equivalent of a workout "boomerang". For the
 *  review pass every pose clip is a boomerang (play back) so each can be
 *  verified; individual poses get re-classified (hold / trim) from there. */
const YOGA_BOOMERANG_SLUGS = new Set<string>(YOGA_VIDEO_SLUGS);

const P = (p: Pose): Pose => ({
  ...p,
  ...(YOGA_VIDEO_SLUGS.has(p.slug)
    ? { video: `/videos/pose-${p.slug}.mp4`, poster: `/images/pose-${p.slug}-still.webp` }
    : {}),
  ...(YOGA_HOLD_SLUGS.has(p.slug) ? { hold: true } : {}),
  ...(YOGA_BOOMERANG_SLUGS.has(p.slug) ? { boomerang: true } : {}),
});

export const POSES: Pose[] = [
  P({ slug: "easy-seat", name: "Easy Seat", sanskrit: "Sukhasana", group: "Breathing", level: "Beginner", image: "/images/pose-easy-seat.webp", floorOnly: true,
    cues: {
      en: "Come to a comfortable cross-legged seat. Lengthen your spine, soften your shoulders, rest your hands on your knees. Breathe in slowly through the nose, and out through the nose.",
      fr: "Installe-toi en tailleur, dos long, épaules relâchées, mains sur les genoux. Inspire lentement par le nez, expire par le nez.",
      ar: "اجلسي متربعةً بثبات، أطيلي العمود الفقري، أرخي الكتفين، وضعي يديكِ على ركبتيكِ. شهيق بطيء من الأنف، ثم زفير من الأنف.",
    }}),
  P({ slug: "cat-cow", name: "Cat-Cow", group: "Warm-up", level: "Beginner", image: "/images/pose-cat-cow.webp", floorOnly: true,
    cues: {
      en: "On your hands and knees, inhale and drop the belly, lift the chest and gaze. Exhale, round the spine, tuck the chin. Flow gently with your breath.",
      fr: "À quatre pattes. Inspire en creusant le dos et en levant le regard. Expire en arrondissant le dos, menton rentré. Suis ton souffle.",
      ar: "على يديكِ وركبتيكِ. شهيق مع خفض البطن ورفع الصدر والنظر، ثم زفير مع تقويس الظهر وضم الذقن. تدفّقي مع التنفس.",
    }}),
  P({ slug: "childs-pose", name: "Child's Pose", sanskrit: "Balasana", group: "Warm-up", level: "Beginner", image: "/images/pose-childs-pose.webp", floorOnly: true,
    cues: {
      en: "Knees wide, big toes touching. Sit back on your heels and fold forward, forehead to the mat, arms long. Soften here. Let the breath move into the back of your body.",
      fr: "Genoux écartés, gros orteils joints. Assieds-toi sur les talons, plie-toi en avant, front au sol, bras allongés. Respire dans le dos.",
      ar: "افتحي الركبتين وضمّي الإبهامين. اجلسي على الكعبين، انحني للأمام، الجبهة على البساط، والذراعان ممدودتان. تنفّسي في ظهرك.",
    }}),
  P({ slug: "seated-twist", name: "Seated Twist", group: "Warm-up", level: "Beginner", image: "/images/pose-seated-twist.webp", floorOnly: true,
    cues: {
      en: "Sit tall, cross-legged. Inhale, lift through the crown. Exhale, twist gently to the right, one hand behind you, one on the opposite knee. Hold, then return and switch sides.",
      fr: "Assise en tailleur, dos long. Inspire en t'allongeant. Expire en torsadant doucement à droite. Tiens, puis change de côté.",
      ar: "اجلسي متربعة بظهر طويل. شهيق ثم زفير مع التواء لطيف لليمين. ثبّتي، ثم بدّلي.",
    }}),
  P({ slug: "low-lunge", name: "Low Lunge", sanskrit: "Anjaneyasana", group: "Hips", level: "Beginner", image: "/images/pose-low-lunge.webp",
    cues: {
      en: "Step the right foot forward, knee over ankle. Lower the left knee. Sweep the arms overhead and open the chest. Sink the hips gently. Breathe slow and deep.",
      fr: "Pied droit devant, genou au-dessus de la cheville. Pose le genou gauche. Bras vers le ciel, poitrine ouverte. Souffle profondément.",
      ar: "اخطي بالقدم اليمنى للأمام، والركبة فوق الكاحل. أنزلي الركبة اليسرى. ارفعي الذراعين، افتحي الصدر، تنفّسي بعمق.",
    }}),
  P({ slug: "butterfly", name: "Butterfly", sanskrit: "Baddha Konasana", group: "Hips", level: "Beginner", image: "/images/pose-butterfly.webp", floorOnly: true,
    cues: {
      en: "Sit tall, soles of the feet together, knees fall open like wings. Hold your feet. Let the breath soften the hips with every exhale.",
      fr: "Assise droite, plantes des pieds jointes, genoux ouverts. Tiens tes pieds. À chaque expir, les hanches se relâchent.",
      ar: "اجلسي بظهر مستقيم، باطنا القدمين ملتقيان والركبتان مفتوحتان. أمسكي قدميكِ. مع كل زفير، يلين الورك.",
    }}),
  P({ slug: "pigeon", name: "Pigeon Pose", group: "Hips", level: "Intermediate", image: "/images/pose-pigeon.webp",
    cues: {
      en: "From all fours, bring the right shin forward, back leg long. Square the hips, lengthen the spine, and gently fold over the front leg. Breathe into the hip.",
      fr: "Depuis quatre pattes, amène le tibia droit devant, jambe arrière allongée. Plie-toi doucement sur la jambe avant. Respire dans la hanche.",
      ar: "من وضع الأطراف الأربع، قدّمي الساق اليمنى وامديها للخلف. ساوي الوركين وانحني فوق الساق الأمامية. تنفّسي في الورك.",
    }}),
  P({ slug: "garland", name: "Garland", sanskrit: "Malasana", group: "Hips", level: "Intermediate", image: "/images/pose-garland.webp",
    cues: {
      en: "Feet a little wider than hips, sink into a deep squat. Hands at heart, elbows press knees open. Lift the chest, lengthen the spine.",
      fr: "Pieds un peu plus larges que les hanches, accroupis-toi profondément. Mains au cœur, coudes ouvrent les genoux. Poitrine haute.",
      ar: "افتحي القدمين قليلاً، انزلي في القرفصاء العميق. اليدان أمام القلب، المرفقان يفتحان الركبتين. ارفعي الصدر.",
    }}),
  P({ slug: "mountain", name: "Mountain", sanskrit: "Tadasana", group: "Standing", level: "Beginner", image: "/images/pose-mountain.webp",
    cues: {
      en: "Stand tall, feet rooted. Crown lifts, shoulders soften, arms long by your sides. Feel grounded and steady, like a mountain.",
      fr: "Debout, pieds ancrés. La couronne s'élève, les épaules se relâchent. Sens-toi stable comme une montagne.",
      ar: "قفي بثبات، القدمان متجذرتان، التاج يرتفع، الكتفان مرتاحان. اشعري بالقوة كجبل.",
    }}),
  P({ slug: "forward-fold", name: "Forward Fold", group: "Standing", level: "Beginner", image: "/images/pose-forward-fold.webp",
    cues: {
      en: "From standing, hinge at the hips and fold forward. Knees soft. Let the head hang heavy. Release the spine with every exhale.",
      fr: "Debout, plie-toi à partir des hanches. Genoux souples, tête lourde. À chaque expir, relâche la colonne.",
      ar: "من الوقوف، انحني من الوركين للأمام. ركبتان مرنتان، الرأس ثقيلة. مع كل زفير، حرّري العمود الفقري.",
    }}),
  P({ slug: "downward-dog", name: "Downward Dog", group: "Standing", level: "Beginner", image: "/images/pose-downward-dog.webp",
    cues: {
      en: "Hands shoulder-width, feet hip-width. Lift the hips up and back into an inverted V. Press the floor away, lengthen the spine. Pedal the feet if you like.",
      fr: "Mains largeur des épaules, pieds largeur des hanches. Hanches vers le ciel en V renversé. Allonge la colonne. Pédale si tu veux.",
      ar: "اليدان بعرض الكتفين، القدمان بعرض الورك. ارفعي الوركين لأعلى وللخلف على شكل حرف V مقلوب. أطيلي العمود الفقري.",
    }}),
  P({ slug: "warrior-1", name: "Warrior I", sanskrit: "Virabhadrasana I", group: "Standing", level: "Intermediate", image: "/images/pose-warrior-1.webp",
    cues: {
      en: "Right foot forward, knee over ankle. Back foot angled, heel grounded. Hips face forward. Reach the arms straight up. Strong and steady.",
      fr: "Pied droit devant, genou aligné. Pied arrière incliné, talon ancré. Hanches face devant. Bras vers le ciel. Forte et stable.",
      ar: "القدم اليمنى للأمام، الركبة فوق الكاحل. القدم الخلفية مائلة والكعب راسخ. الوركان للأمام. ارفعي الذراعين. قوية وثابتة.",
    }}),
  P({ slug: "warrior-2", name: "Warrior II", group: "Standing", level: "Intermediate", image: "/images/pose-warrior-2.webp",
    cues: {
      en: "Step the feet wide. Front knee bends over the ankle, back leg straight. Open the arms parallel to the floor, gaze over the front hand. Roar quietly inside.",
      fr: "Pieds bien écartés. Genou avant plié, jambe arrière tendue. Bras parallèles au sol, regard sur la main avant.",
      ar: "افتحي القدمين على نطاق واسع. الركبة الأمامية مثنية، الساق الخلفية ممدودة. الذراعان موازيتان للأرض، النظر فوق اليد الأمامية.",
    }}),
  P({ slug: "triangle", name: "Triangle", group: "Standing", level: "Intermediate", image: "/images/pose-triangle.webp",
    cues: {
      en: "Legs wide and straight. Front foot turned out. Reach forward over the front leg, then hand to shin or block. Top arm reaches to the sky. Open the chest.",
      fr: "Jambes écartées, tendues. Pied avant tourné. Tends vers l'avant, main sur le tibia. Bras du haut vers le ciel. Ouvre la poitrine.",
      ar: "ساقان مفتوحتان ومستقيمتان، القدم الأمامية للخارج. امتدّي للأمام، اليد على الساق، والذراع العلوية للسماء. افتحي الصدر.",
    }}),
  P({ slug: "chair", name: "Chair", sanskrit: "Utkatasana", group: "Strength", level: "Beginner", image: "/images/pose-chair.webp",
    cues: {
      en: "Feet together. Bend the knees as if sitting back in an invisible chair. Weight in the heels. Arms reach up alongside the ears. Strong legs, calm breath.",
      fr: "Pieds joints. Plie les genoux comme assise sur une chaise invisible. Poids dans les talons. Bras le long des oreilles.",
      ar: "القدمان معاً. اثني الركبتين كأنكِ تجلسين على كرسي خفي. الوزن على الكعبين. الذراعان للأعلى بجانب الأذنين.",
    }}),
  P({ slug: "tree", name: "Tree", sanskrit: "Vrksasana", group: "Balance", level: "Intermediate", image: "/images/pose-tree.webp",
    cues: {
      en: "Stand tall. Shift weight to the left foot. Place the right foot on the inner calf or thigh (never the knee). Hands at heart. Find a steady gaze.",
      fr: "Debout. Transfère le poids à gauche. Pied droit contre le mollet ou la cuisse (jamais le genou). Mains au cœur. Regard fixe.",
      ar: "قفي بثبات. انقلي الوزن لليسار. ضعي القدم اليمنى على باطن الساق أو الفخذ (ليس الركبة). اليدان أمام القلب.",
    }}),
  P({ slug: "half-moon", name: "Half Moon", group: "Balance", level: "Advanced", image: "/images/pose-half-moon.webp",
    cues: {
      en: "From Triangle, bend the front knee, walk the fingertips forward. Float the back leg up parallel to the floor. Stack the hips, top arm to the sky. Bright and open.",
      fr: "Depuis la triangle, plie le genou avant, avance les doigts. Décolle la jambe arrière, parallèle au sol. Empile les hanches.",
      ar: "من المثلث، اثني الركبة الأمامية وتقدّمي بأصابع اليد. ارفعي الساق الخلفية موازية للأرض. كدّسي الوركين.",
    }}),
  P({ slug: "cobra", name: "Cobra", group: "Backbends", level: "Beginner", image: "/images/pose-cobra.webp", floorOnly: true,
    cues: {
      en: "Lie face down. Hands under the shoulders, elbows hugged in. Press the tops of the feet down, lift the chest. Keep the shoulders soft and away from the ears.",
      fr: "Allongée sur le ventre. Mains sous les épaules. Appuie les pieds, soulève la poitrine. Épaules basses, loin des oreilles.",
      ar: "استلقي على بطنكِ. اليدان تحت الكتفين. اضغطي بأعلى القدمين، ارفعي الصدر. الكتفان مرتاحان بعيداً عن الأذنين.",
    }}),
  P({ slug: "bridge", name: "Bridge", group: "Backbends", level: "Beginner", image: "/images/pose-bridge.webp", floorOnly: true,
    cues: {
      en: "Lie on your back, knees bent, feet flat. Press into the feet to lift the hips. Roll the shoulders under, breathe into the front body. Open the chest.",
      fr: "Sur le dos, genoux pliés, pieds à plat. Pousse pour lever les hanches. Rentre les épaules dessous. Ouvre la poitrine.",
      ar: "استلقي على ظهرك، الركبتان مثنيتان والقدمان مسطحتان. اضغطي بالقدمين لرفع الوركين. افتحي الصدر.",
    }}),
  P({ slug: "camel", name: "Camel", sanskrit: "Ustrasana", group: "Backbends", level: "Advanced", image: "/images/pose-camel.webp",
    cues: {
      en: "Kneel, hips over knees. Hands on the low back. Lift the chest up and back, then reach for the heels if it feels safe. Open the heart, soften the throat.",
      fr: "À genoux, hanches au-dessus des genoux. Mains au bas du dos. Lève la poitrine, puis attrape les talons si tu peux. Ouvre le cœur.",
      ar: "اركعي، الوركان فوق الركبتين. اليدان أسفل الظهر. ارفعي الصدر للأعلى وللخلف، ثم اتجهي للكعبين إن أمكن. افتحي القلب.",
    }}),
  P({ slug: "seated-forward-fold", name: "Seated Forward Fold", sanskrit: "Paschimottanasana", group: "Forward folds", level: "Beginner", image: "/images/pose-seated-forward-fold.webp", floorOnly: true,
    cues: {
      en: "Sit with legs long. Inhale, lengthen the spine. Exhale and fold forward from the hips. Hands to shins or feet. Soften, breathe, surrender.",
      fr: "Assise, jambes tendues. Inspire, allonge le dos. Expire, plie-toi en avant. Mains sur les tibias ou les pieds.",
      ar: "اجلسي والساقان ممدودتان. شهيق وأطيلي العمود. زفير وانحني للأمام من الوركين. اليدان على الساقين أو القدمين.",
    }}),
  P({ slug: "head-to-knee", name: "Head-to-Knee", sanskrit: "Janu Sirsasana", group: "Forward folds", level: "Beginner", image: "/images/pose-head-to-knee.webp", floorOnly: true,
    cues: {
      en: "Extend the right leg, bend the left knee, sole to inner right thigh. Fold over the long leg. Soften the neck. Switch sides.",
      fr: "Jambe droite tendue, genou gauche plié, plante sur la cuisse droite. Plie-toi sur la jambe longue. Change de côté.",
      ar: "مدّي الساق اليمنى، اثني الركبة اليسرى وضعي القدم على باطن الفخذ. انحني فوق الساق الممدودة. بدّلي.",
    }}),
  P({ slug: "wide-leg-fold", name: "Wide-Leg Fold", group: "Forward folds", level: "Beginner", image: "/images/pose-wide-leg-fold.webp",
    cues: {
      en: "Step the feet wide, toes slightly in. Hinge at the hips and fold forward. Hands to the mat or hold the elbows. Let the head be heavy.",
      fr: "Pieds bien écartés, orteils légèrement vers l'intérieur. Plie-toi depuis les hanches. Mains au sol ou aux coudes.",
      ar: "افتحي القدمين، الأصابع للداخل قليلاً. انحني من الوركين للأمام. اليدان على البساط أو على المرفقين.",
    }}),
  P({ slug: "reclined-bound-angle", name: "Reclined Bound Angle", group: "Restorative", level: "Beginner", image: "/images/pose-reclined-bound-angle.webp", floorOnly: true,
    cues: {
      en: "Lie on your back. Bring the soles of the feet together and let the knees fall open. Arms relaxed by your sides. Rest here, soften the belly.",
      fr: "Sur le dos. Plantes des pieds jointes, genoux ouverts. Bras le long du corps. Repose-toi, ventre doux.",
      ar: "استلقي على ظهركِ. ضمّي باطني القدمين واترك الركبتين تنفتحان. الذراعان مرتاحان. استريحي وأرخي البطن.",
    }}),
  P({ slug: "knees-to-chest", name: "Knees-to-Chest", group: "Restorative", level: "Beginner", image: "/images/pose-knees-to-chest.webp", floorOnly: true,
    cues: {
      en: "Lie on your back. Hug both knees gently into your chest. Rock side to side if it feels good. Massage the lower back.",
      fr: "Sur le dos. Serre doucement les genoux contre la poitrine. Berce-toi de côté à côté si tu veux. Masse le bas du dos.",
      ar: "استلقي على ظهرك. عانقي الركبتين برفق على الصدر. تمايلي يمنة ويسرة، ودلّكي أسفل الظهر.",
    }}),
  P({ slug: "supine-twist", name: "Supine Twist", group: "Restorative", level: "Beginner", image: "/images/pose-supine-twist.webp", floorOnly: true,
    cues: {
      en: "On your back, arms out like a T. Draw the knees in, then let them fall to the right. Turn your head left. Long, soft breaths. Switch sides.",
      fr: "Sur le dos, bras en T. Genoux pliés, laisse-les tomber à droite. Regarde à gauche. Respiration longue. Change de côté.",
      ar: "على ظهرك، الذراعان على شكل حرف T. اثني الركبتين ثم أنزليهما لليمين. أديري الرأس لليسار. أنفاس طويلة، ثم بدّلي.",
    }}),
  P({ slug: "legs-up-wall", name: "Legs-Up-the-Wall", group: "Restorative", level: "Beginner", image: "/images/pose-legs-up-wall.webp", floorOnly: true,
    cues: {
      en: "Lie back and rest your legs straight up against a wall. Arms relaxed, palms up. Stay for several breaths and let everything melt down.",
      fr: "Allonge-toi, jambes droites contre le mur. Bras détendus, paumes vers le haut. Plusieurs respirations, tout se relâche.",
      ar: "استلقي وأسندي الساقين على الحائط. الذراعان مرتاحان، الراحتان للأعلى. عدة أنفاس، واتركي كل شيء يذوب.",
    }}),
  P({ slug: "savasana", name: "Savasana", sanskrit: "Corpse Pose", group: "Restorative", level: "Beginner", image: "/images/pose-savasana.webp", floorOnly: true,
    cues: {
      en: "Lie completely flat. Legs slightly apart, arms by your sides with palms up. Close the eyes. Let go of effort. Just breathe and receive.",
      fr: "Allonge-toi à plat. Jambes légèrement écartées, bras le long du corps, paumes ouvertes. Ferme les yeux. Lâche tout effort.",
      ar: "استلقي بلطف. الساقان متباعدتان قليلاً، والذراعان بجانبك والراحتان للأعلى. أغمضي عينيكِ، وتخلّي عن أي مجهود.",
    }}),
  P({ slug: "plank", name: "Plank", group: "Strength", level: "Intermediate", image: "/images/pose-plank.webp",
    cues: {
      en: "Hands under shoulders, legs long. One straight line from crown to heels. Hug the belly in, breathe steadily. Strong everywhere.",
      fr: "Mains sous les épaules, jambes tendues. Une ligne droite du sommet aux talons. Engage le ventre, respire.",
      ar: "اليدان تحت الكتفين، الساقان ممدودتان. خط مستقيم من التاج إلى الكعبين. شدّي البطن وتنفّسي.",
    }}),
  P({ slug: "boat", name: "Boat", sanskrit: "Navasana", group: "Strength", level: "Intermediate", image: "/images/pose-boat.webp",
    cues: {
      en: "Sit, lean back slightly, lift the feet. Shins parallel to the floor, or legs straight if you can. Arms reach forward. Long spine, strong core.",
      fr: "Assise, penche-toi un peu en arrière, soulève les pieds. Tibias parallèles, ou jambes tendues. Bras devant. Dos long.",
      ar: "اجلسي ومالي للخلف قليلاً، ارفعي القدمين. الساقان موازيتان للأرض أو ممدودتان. الذراعان للأمام، عمود طويل.",
    }}),
  P({ slug: "side-plank", name: "Side Plank", group: "Strength", level: "Advanced", image: "/images/pose-side-plank.webp",
    cues: {
      en: "From plank, roll onto the right hand, stack the feet. Lift the hips, reach the left arm up. Strong line, steady breath. Switch sides.",
      fr: "Depuis la planche, roule sur la main droite, empile les pieds. Lève les hanches, bras gauche au ciel. Change de côté.",
      ar: "من البلانك، استديري على اليد اليمنى وكدّسي القدمين. ارفعي الوركين، الذراع اليسرى للسماء. بدّلي.",
    }}),

  // ───────── Library expansion (+39) ─────────
  // Warm-up
  P({ slug: "neck-shoulder-rolls", name: "Neck & Shoulder Rolls", group: "Warm-up", level: "Beginner", image: "/images/pose-neck-shoulder-rolls.webp", floorOnly: true,
    cues: {
      en: "Sit tall and soften the jaw. Slowly circle the shoulders back a few times, then forward. Let the head drift ear toward shoulder, and roll it slowly through centre to the other side. Move with your breath, unhurried.",
      fr: "Assise, dos long, mâchoire détendue. Roule les épaules en arrière, puis en avant. Laisse la tête aller d'une oreille à l'épaule, puis roule lentement de l'autre côté. Suis ton souffle.",
      ar: "اجلسي بظهر طويل وأرخي الفك. أديري الكتفين للخلف ثم للأمام. أميلي الرأس نحو الكتف، ثم أديريها ببطء إلى الجهة الأخرى. تحرّكي مع أنفاسك.",
    }}),
  P({ slug: "thread-the-needle", name: "Thread the Needle", group: "Warm-up", level: "Beginner", image: "/images/pose-thread-the-needle.webp", floorOnly: true,
    cues: {
      en: "From all fours, reach the right arm up, then thread it under the left, shoulder and cheek resting on the mat. Let the left hand stay planted or reach overhead. Breathe into the space between the shoulder blades.",
      fr: "À quatre pattes, lève le bras droit, puis glisse-le sous le gauche, épaule et joue au sol. Respire entre les omoplates.",
      ar: "من الأطراف الأربع، ارفعي الذراع اليمنى ثم مرّريها تحت اليسرى، الكتف والخد على البساط. تنفّسي بين لوحي الكتف.",
    }}),
  P({ slug: "bird-dog", name: "Bird Dog", group: "Warm-up", level: "Beginner", image: "/images/pose-bird-dog.webp", floorOnly: true,
    cues: {
      en: "On all fours, wrists under shoulders, knees under hips. Reach the right arm forward and the left leg back, long and level. Keep the belly drawn in and the hips steady. Hold, then lower with control.",
      fr: "À quatre pattes, poignets sous les épaules. Tends le bras droit devant et la jambe gauche derrière, à l'horizontale. Ventre engagé, hanches stables. Tiens, puis repose.",
      ar: "على الأطراف الأربع، الرسغان تحت الكتفين. مدّي الذراع اليمنى للأمام والساق اليسرى للخلف. اسحبي البطن وثبّتي الوركين. ثبّتي ثم انزلي بتحكّم.",
    }}),
  P({ slug: "standing-side-stretch", name: "Standing Side Stretch", group: "Warm-up", level: "Beginner", image: "/images/pose-standing-side-stretch.webp",
    cues: {
      en: "Stand tall and sweep both arms overhead. Clasp the hands, and on an exhale lean gently to the right, opening the left side of the waist. Keep both feet grounded. Breathe into the long side body.",
      fr: "Debout, lève les bras. Joins les mains et, à l'expir, penche-toi doucement à droite, ouvrant le côté gauche. Pieds ancrés. Respire dans le flanc allongé.",
      ar: "قفي وارفعي الذراعين. شبّكي اليدين، ومع الزفير مِيلي بلطف لليمين لتفتحي الجنب الأيسر. القدمان راسختان. تنفّسي في الجانب الممتد.",
    }}),

  // Standing
  P({ slug: "high-lunge", name: "High Lunge", sanskrit: "Ashta Chandrasana", group: "Standing", level: "Intermediate", image: "/images/pose-high-lunge.webp",
    cues: {
      en: "Step the right foot forward, back heel lifted high. Bend the front knee over the ankle, back leg strong and straight. Sweep the arms overhead, lengthen the spine, and lift the chest. Steady and bright.",
      fr: "Pied droit devant, talon arrière levé. Genou avant plié, jambe arrière tendue. Bras vers le ciel, poitrine haute. Stable et lumineuse.",
      ar: "القدم اليمنى للأمام، الكعب الخلفي مرفوع. اثني الركبة الأمامية، الساق الخلفية قوية. ارفعي الذراعين، أطيلي العمود، ارفعي الصدر.",
    }}),
  P({ slug: "crescent-twist", name: "Twisted Crescent Lunge", sanskrit: "Parivrtta Anjaneyasana", group: "Standing", level: "Advanced", image: "/images/pose-crescent-twist.webp",
    cues: {
      en: "From a high lunge with the right foot forward, bring the hands to heart. Exhale and hook the left elbow outside the right knee, twisting from the belly. Press the palms together, open the chest, and gaze past the top shoulder.",
      fr: "Depuis la fente haute pied droit devant, mains au cœur. À l'expir, accroche le coude gauche à l'extérieur du genou droit, torsion depuis le ventre. Paumes jointes, poitrine ouverte.",
      ar: "من الاندفاع العالي والقدم اليمنى أماماً، اليدان أمام القلب. مع الزفير، ثبّتي المرفق الأيسر خارج الركبة اليمنى مع الالتفاف من البطن. اضغطي الكفّين وافتحي الصدر.",
    }}),
  P({ slug: "extended-side-angle", name: "Extended Side Angle", sanskrit: "Utthita Parsvakonasana", group: "Standing", level: "Intermediate", image: "/images/pose-extended-side-angle.webp",
    cues: {
      en: "From Warrior II with the right knee bent, lower the right forearm onto the thigh, or the hand to the floor. Reach the left arm over the ear, drawing one long line from the back heel to the fingertips. Open the chest to the sky.",
      fr: "Depuis le Guerrier II genou droit plié, pose l'avant-bras droit sur la cuisse. Tends le bras gauche au-dessus de l'oreille, une longue ligne du talon aux doigts. Ouvre la poitrine.",
      ar: "من المحارب الثاني والركبة اليمنى مثنية، أنزلي الساعد الأيمن على الفخذ. مدّي الذراع اليسرى فوق الأذن في خط طويل من الكعب للأصابع. افتحي الصدر.",
    }}),
  P({ slug: "pyramid", name: "Pyramid Pose", sanskrit: "Parsvottanasana", group: "Standing", level: "Intermediate", image: "/images/pose-pyramid.webp",
    cues: {
      en: "Step the feet a leg's length apart, both hips facing the front foot. Keep the front leg straight, hinge at the hips, and fold over the front thigh with a long spine. Let the head release toward the shin.",
      fr: "Pieds écartés, hanches vers le pied avant. Jambe avant tendue, plie-toi depuis les hanches sur la cuisse, dos long. Laisse la tête descendre.",
      ar: "افتحي القدمين بطول الساق، الوركان نحو القدم الأمامية. الساق الأمامية ممدودة، انحني من الوركين فوق الفخذ بعمود طويل. أرخي الرأس.",
    }}),
  P({ slug: "revolved-triangle", name: "Revolved Triangle", sanskrit: "Parivrtta Trikonasana", group: "Standing", level: "Advanced", image: "/images/pose-revolved-triangle.webp",
    cues: {
      en: "From a short stance with the right foot forward, lengthen the spine and place the left hand to the floor or a block outside the front foot. Twist open, reaching the right arm to the sky. Keep both legs strong and the hips level.",
      fr: "Pied droit devant, dos long, main gauche au sol à l'extérieur du pied. Torsion ouverte, bras droit au ciel. Jambes fortes, hanches à niveau.",
      ar: "القدم اليمنى للأمام، أطيلي العمود وضعي اليد اليسرى على الأرض خارج القدم. التفّي وافتحي الذراع اليمنى للسماء. الساقان قويتان والوركان مستويان.",
    }}),
  P({ slug: "goddess", name: "Goddess Pose", sanskrit: "Utkata Konasana", group: "Standing", level: "Beginner", image: "/images/pose-goddess.webp",
    cues: {
      en: "Step the feet wide, toes turned out. Bend the knees and sink the hips down toward knee height, knees tracking over the toes. Lift the chest, and either cactus the arms or rest the hands at heart. Feel strong and rooted.",
      fr: "Pieds larges, orteils vers l'extérieur. Plie les genoux et descends les hanches, genoux vers les orteils. Poitrine haute, bras en cactus. Forte et ancrée.",
      ar: "افتحي القدمين والأصابع للخارج. اثني الركبتين وانزلي بالوركين، الركبتان فوق الأصابع. ارفعي الصدر والذراعين. قوية وراسخة.",
    }}),
  P({ slug: "wide-legged-forward-fold", name: "Wide-Legged Forward Fold", sanskrit: "Prasarita Padottanasana", group: "Standing", level: "Beginner", image: "/images/pose-wide-legged-forward-fold.webp",
    cues: {
      en: "Step the feet wide and parallel. Hinge at the hips and fold forward, hands to the floor between the feet. Let the crown of the head release toward the mat and the neck stay soft. Breathe into the backs of the legs.",
      fr: "Pieds larges et parallèles. Plie-toi depuis les hanches, mains au sol entre les pieds. Laisse la tête descendre, nuque souple. Respire dans l'arrière des jambes.",
      ar: "افتحي القدمين متوازيتين. انحني من الوركين، اليدان على الأرض بين القدمين. أرخي التاج نحو البساط والرقبة لينة. تنفّسي في مؤخرة الساقين.",
    }}),

  // Balance
  P({ slug: "warrior-3", name: "Warrior III", sanskrit: "Virabhadrasana III", group: "Balance", level: "Advanced", image: "/images/pose-warrior-3.webp",
    cues: {
      en: "From standing, shift your weight onto the right foot. Hinge forward and float the left leg back until the body forms one long line, parallel to the floor. Reach the arms forward or back alongside the body. Fix your gaze and breathe.",
      fr: "Debout, poids sur le pied droit. Penche-toi et lève la jambe gauche jusqu'à une ligne parallèle au sol. Bras devant ou le long du corps. Fixe le regard.",
      ar: "قفي وانقلي الوزن على القدم اليمنى. مِيلي للأمام وارفعي الساق اليسرى حتى يصبح الجسم خطاً موازياً للأرض. مدّي الذراعين. ثبّتي النظر وتنفّسي.",
    }}),
  P({ slug: "eagle", name: "Eagle Pose", sanskrit: "Garudasana", group: "Balance", level: "Intermediate", image: "/images/pose-eagle.webp",
    cues: {
      en: "Bend the knees softly. Cross the right thigh over the left, hooking the foot if it's available. Wrap the left arm under the right, palms reaching toward each other. Sink and lift at once, drawing everything to the midline.",
      fr: "Genoux fléchis. Croise la cuisse droite sur la gauche, puis le bras gauche sous le droit, paumes vers l'autre. Descends et grandis vers l'axe central.",
      ar: "اثني الركبتين. تقاطعي الفخذ الأيمن فوق الأيسر، ثم الذراع الأيسر تحت الأيمن، الكفّان نحو بعضهما. انزلي وارتفعي نحو المنتصف.",
    }}),
  P({ slug: "dancer", name: "Dancer's Pose", sanskrit: "Natarajasana", group: "Balance", level: "Advanced", image: "/images/pose-dancer.webp",
    cues: {
      en: "Standing on the right foot, bend the left knee and catch the inside of the left ankle behind you. Reach the right arm forward, then press the foot into the hand and lift the chest, blooming open. Keep the gaze soft and steady.",
      fr: "Sur le pied droit, plie le genou gauche et attrape la cheville. Tends le bras droit devant, presse le pied dans la main et ouvre la poitrine. Regard doux.",
      ar: "قفي على القدم اليمنى، اثني الركبة اليسرى وأمسكي الكاحل خلفك. مدّي الذراع اليمنى، ادفعي القدم في اليد وافتحي الصدر. نظرة هادئة.",
    }}),
  P({ slug: "standing-figure-four", name: "Standing Figure Four", group: "Balance", level: "Intermediate", image: "/images/pose-standing-figure-four.webp",
    cues: {
      en: "Standing on the left foot, cross the right ankle over the left thigh, flexing the foot. Sit the hips back and down as if into a chair, keeping the chest lifted. Hands come to heart. Breathe into the outer right hip.",
      fr: "Sur le pied gauche, croise la cheville droite sur la cuisse gauche, pied flex. Assieds-toi en arrière comme sur une chaise, poitrine haute. Respire dans la hanche.",
      ar: "قفي على القدم اليسرى، ضعي الكاحل الأيمن فوق الفخذ الأيسر. اجلسي بالوركين للخلف كأنكِ على كرسي، الصدر مرفوع. تنفّسي في الورك.",
    }}),

  // Backbends
  P({ slug: "sphinx", name: "Sphinx Pose", sanskrit: "Salamba Bhujangasana", group: "Backbends", level: "Beginner", image: "/images/pose-sphinx.webp", floorOnly: true,
    cues: {
      en: "Lie on your belly and set the forearms on the mat, elbows under the shoulders. Press down and lift the chest into a gentle backbend. Draw the shoulders away from the ears and lengthen the low back. Soft and steady.",
      fr: "Sur le ventre, avant-bras au sol, coudes sous les épaules. Appuie et soulève la poitrine en douceur. Épaules loin des oreilles, bas du dos long.",
      ar: "استلقي على البطن، الساعدان على البساط والمرفقان تحت الكتفين. اضغطي وارفعي الصدر بلطف. أبعدي الكتفين عن الأذنين وأطيلي أسفل الظهر.",
    }}),
  P({ slug: "locust", name: "Locust Pose", sanskrit: "Salabhasana", group: "Backbends", level: "Intermediate", image: "/images/pose-locust.webp", floorOnly: true,
    cues: {
      en: "Lie on your belly, arms alongside the body, palms down. On an inhale, lift the chest, arms, and legs away from the floor, reaching back through the toes. Keep the neck long and the glutes soft. Breathe steadily.",
      fr: "Sur le ventre, bras le long du corps. À l'inspir, soulève poitrine, bras et jambes. Nuque longue, fessiers relâchés. Respire régulièrement.",
      ar: "على البطن، الذراعان بجانب الجسم. مع الشهيق ارفعي الصدر والذراعين والساقين عن الأرض. الرقبة طويلة والأرداف لينة. تنفّسي بثبات.",
    }}),
  P({ slug: "bow", name: "Bow Pose", sanskrit: "Dhanurasana", group: "Backbends", level: "Advanced", image: "/images/pose-bow.webp", floorOnly: true,
    cues: {
      en: "On your belly, bend both knees and reach back to catch the ankles. Kick the feet into the hands to lift the chest and thighs, rocking gently on the belly. Breathe into the front of the body. Release slowly.",
      fr: "Sur le ventre, plie les genoux et attrape les chevilles. Pousse les pieds dans les mains pour soulever poitrine et cuisses. Respire dans l'avant du corps.",
      ar: "على البطن، اثني الركبتين وأمسكي الكاحلين. ادفعي القدمين في اليدين لرفع الصدر والفخذين. تنفّسي في مقدمة الجسم، ثم انزلي ببطء.",
    }}),
  P({ slug: "upward-dog", name: "Upward-Facing Dog", sanskrit: "Urdhva Mukha Svanasana", group: "Backbends", level: "Intermediate", image: "/images/pose-upward-dog.webp",
    cues: {
      en: "From lying face down, place the hands beside the ribs and press into them, straightening the arms and lifting the chest and thighs off the mat. Roll the shoulders back and down, and lengthen the neck. Only the hands and tops of the feet touch.",
      fr: "À plat ventre, mains près des côtes. Pousse, tends les bras et soulève poitrine et cuisses. Épaules en arrière, nuque longue. Seuls mains et dessus des pieds au sol.",
      ar: "من الاستلقاء على الوجه، ضعي اليدين قرب الأضلاع واضغطي، مدّي الذراعين وارفعي الصدر والفخذين. أرجعي الكتفين للخلف وأطيلي الرقبة.",
    }}),
  P({ slug: "fish", name: "Fish Pose", sanskrit: "Matsyasana", group: "Backbends", level: "Intermediate", image: "/images/pose-fish.webp", floorOnly: true,
    cues: {
      en: "Lie on your back, hands tucked under the hips, palms down. Press into the forearms to lift the chest high, and let the crown of the head rest lightly on the mat. Open the throat and heart, and breathe into the chest. Come up with care.",
      fr: "Sur le dos, mains sous les hanches. Appuie sur les avant-bras pour lever la poitrine, sommet de la tête posé. Ouvre la gorge et le cœur. Remonte avec soin.",
      ar: "على الظهر، اليدان تحت الوركين. اضغطي على الساعدين لرفع الصدر عالياً، وضعي تاج الرأس برفق على البساط. افتحي الحلق والقلب، ثم انهضي بعناية.",
    }}),

  // Hips
  P({ slug: "lizard", name: "Lizard Pose", sanskrit: "Utthan Pristhasana", group: "Hips", level: "Intermediate", image: "/images/pose-lizard.webp",
    cues: {
      en: "From a low lunge with the right foot forward, walk the foot to the outer edge of the mat and bring both hands inside the front foot. Stay on the hands, or lower to the forearms. Let the front hip open and breathe low and slow.",
      fr: "Depuis la fente basse pied droit, amène le pied vers le bord du tapis, mains à l'intérieur. Reste sur les mains ou descends sur les avant-bras. Ouvre la hanche.",
      ar: "من الاندفاع المنخفض والقدم اليمنى أماماً، حرّكي القدم لحافة البساط واليدين داخلها. ابقي على اليدين أو انزلي للساعدين. افتحي الورك وتنفّسي ببطء.",
    }}),
  P({ slug: "happy-baby", name: "Happy Baby", sanskrit: "Ananda Balasana", group: "Hips", level: "Beginner", image: "/images/pose-happy-baby.webp", floorOnly: true,
    cues: {
      en: "Lie on your back and draw both knees toward the armpits. Hold the outer edges of the feet, soles facing up, and gently rock side to side. Let the low back soften into the mat. Breathe and release the hips.",
      fr: "Sur le dos, ramène les genoux vers les aisselles. Attrape l'extérieur des pieds, plantes vers le ciel, berce doucement. Bas du dos relâché.",
      ar: "على الظهر، اسحبي الركبتين نحو الإبطين. أمسكي حواف القدمين للأعلى، وتمايلي بلطف. أرخي أسفل الظهر في البساط.",
    }}),
  P({ slug: "cow-face", name: "Cow Face Pose", sanskrit: "Gomukhasana", group: "Hips", level: "Intermediate", image: "/images/pose-cow-face.webp", floorOnly: true,
    cues: {
      en: "Sit and stack the right knee over the left, feet beside the hips. Reach the right arm up and bend it down the back; sweep the left arm behind to clasp the fingers, or use a strap. Lift the chest tall and breathe.",
      fr: "Assise, empile le genou droit sur le gauche, pieds près des hanches. Bras droit en haut plié dans le dos, bras gauche en bas pour joindre les doigts. Poitrine haute.",
      ar: "اجلسي وكدّسي الركبة اليمنى فوق اليسرى، القدمان بجانب الوركين. الذراع اليمنى للأعلى ثنياً خلف الظهر، واليسرى من الأسفل لتشبيك الأصابع. ارفعي الصدر.",
    }}),
  P({ slug: "frog", name: "Frog Pose", sanskrit: "Mandukasana", group: "Hips", level: "Advanced", image: "/images/pose-frog.webp", floorOnly: true,
    cues: {
      en: "From all fours, widen the knees out to the sides, inner ankles and shins on the mat, feet flexed. Lower onto the forearms and let the hips sink back gently. This is intense — go slow, breathe deep, and never force it.",
      fr: "À quatre pattes, écarte les genoux, chevilles et tibias au sol, pieds flex. Descends sur les avant-bras, hanches en arrière. Va doucement, respire, ne force pas.",
      ar: "من الأطراف الأربع، افتحي الركبتين للجانبين، الكاحلان والساقان على البساط. انزلي للساعدين وأرخي الوركين للخلف. ببطء وتنفّس عميق، دون إجبار.",
    }}),
  P({ slug: "reclined-figure-four", name: "Reclined Figure Four", group: "Hips", level: "Beginner", image: "/images/pose-reclined-figure-four.webp", floorOnly: true,
    cues: {
      en: "Lie on your back, knees bent. Cross the right ankle over the left thigh, flexing the foot. Thread the hands behind the left thigh and gently draw the legs toward you. Keep the head heavy and breathe into the outer hip.",
      fr: "Sur le dos, genoux pliés. Croise la cheville droite sur la cuisse gauche, pied flex. Attrape derrière la cuisse gauche et ramène doucement. Respire dans la hanche.",
      ar: "على الظهر، الركبتان مثنيتان. ضعي الكاحل الأيمن فوق الفخذ الأيسر. شبّكي اليدين خلف الفخذ الأيسر واسحبي بلطف نحوك. تنفّسي في الورك.",
    }}),

  // Strength / core
  P({ slug: "forearm-plank", name: "Forearm Plank", group: "Strength", level: "Intermediate", image: "/images/pose-forearm-plank.webp", floorOnly: true,
    cues: {
      en: "Set the forearms on the mat, elbows under the shoulders, and step back into a straight line from heels to crown. Draw the belly in, tuck the tailbone gently, and press the floor away. Breathe steadily and hold strong.",
      fr: "Avant-bras au sol, coudes sous les épaules, corps en ligne des talons à la tête. Ventre engagé, coccyx rentré. Respire et tiens fort.",
      ar: "الساعدان على البساط والمرفقان تحت الكتفين، الجسم خط مستقيم من الكعبين للتاج. اسحبي البطن وثبّتي. تنفّسي بثبات واثبتي بقوة.",
    }}),
  P({ slug: "chaturanga", name: "Low Plank", sanskrit: "Chaturanga Dandasana", group: "Strength", level: "Advanced", image: "/images/pose-chaturanga.webp",
    cues: {
      en: "From a high plank, shift forward onto the toes and lower halfway down, elbows hugging the ribs at ninety degrees. Keep the body one firm line and the shoulders level with the elbows. Hold a breath, then flow on.",
      fr: "Depuis la planche haute, avance sur les orteils et descends à mi-chemin, coudes serrés à angle droit. Corps en ligne. Tiens un souffle, puis continue.",
      ar: "من البلانك العالي، تقدّمي على الأصابع وانزلي للنصف، المرفقان قرب الأضلاع بزاوية قائمة. الجسم خط ثابت. اثبتي نفَساً ثم تابعي.",
    }}),
  P({ slug: "dead-bug", name: "Dead Bug", group: "Strength", level: "Beginner", image: "/images/pose-dead-bug.webp", floorOnly: true,
    cues: {
      en: "Lie on your back, arms reaching to the ceiling, knees stacked over the hips at ninety degrees. Press the low back into the mat. Slowly lower the right arm and left leg, then return, and switch. Move with control and steady breath.",
      fr: "Sur le dos, bras au plafond, genoux au-dessus des hanches. Bas du dos au sol. Descends lentement bras droit et jambe gauche, reviens, alterne. Contrôle et souffle.",
      ar: "على الظهر، الذراعان للأعلى والركبتان فوق الوركين بزاوية قائمة. اضغطي أسفل الظهر في البساط. أنزلي ببطء الذراع اليمنى والساق اليسرى، ثم بدّلي. بتحكّم وتنفّس.",
    }}),
  P({ slug: "hollow-hold", name: "Hollow Body Hold", group: "Strength", level: "Intermediate", image: "/images/pose-hollow-hold.webp", floorOnly: true,
    cues: {
      en: "Lie on your back and press the low back firmly into the mat. Lift the head, shoulders, arms, and legs a few inches off the floor, reaching long in both directions. Keep the belly drawn in and the breath calm. Hold your strong little boat.",
      fr: "Sur le dos, bas du dos bien au sol. Soulève tête, épaules, bras et jambes, allonge dans les deux sens. Ventre engagé, souffle calme.",
      ar: "على الظهر، اضغطي أسفل الظهر بقوة في البساط. ارفعي الرأس والكتفين والذراعين والساقين قليلاً، ممتدة في الاتجاهين. اسحبي البطن والنفَس هادئ.",
    }}),
  P({ slug: "modified-side-plank", name: "Modified Side Plank", group: "Strength", level: "Beginner", image: "/images/pose-modified-side-plank.webp", floorOnly: true,
    cues: {
      en: "From your right forearm with the bottom knee down, stack the shoulder over the elbow and lift the hips into a gentle side line. Reach the top arm to the sky and open the chest. Steady breath — then switch sides.",
      fr: "Sur l'avant-bras droit, genou du bas au sol, épaule au-dessus du coude, lève les hanches. Bras du haut au ciel. Souffle stable, puis change de côté.",
      ar: "على الساعد الأيمن والركبة السفلية على الأرض، الكتف فوق المرفق وارفعي الوركين بلطف. الذراع العليا للسماء وافتحي الصدر. تنفّس ثابت، ثم بدّلي.",
    }}),
  P({ slug: "reverse-plank", name: "Reverse Plank", sanskrit: "Purvottanasana", group: "Strength", level: "Intermediate", image: "/images/pose-reverse-plank.webp", floorOnly: true,
    cues: {
      en: "Sit with the legs long and place the hands behind the hips, fingers pointing forward. Press down and lift the hips high, reaching the toes toward the floor. Open the chest and let the head drop back if it feels good. Breathe into the whole front line.",
      fr: "Assise jambes longues, mains derrière les hanches, doigts en avant. Appuie et lève les hanches, orteils vers le sol. Ouvre la poitrine. Respire dans toute la face avant.",
      ar: "اجلسي والساقان ممدودتان، اليدان خلف الوركين والأصابع للأمام. اضغطي وارفعي الوركين عالياً، الأصابع نحو الأرض. افتحي الصدر وتنفّسي في الجهة الأمامية.",
    }}),

  // Forward folds
  P({ slug: "seated-wide-leg-fold", name: "Seated Wide-Leg Fold", sanskrit: "Upavistha Konasana", group: "Forward folds", level: "Intermediate", image: "/images/pose-seated-wide-leg-fold.webp", floorOnly: true,
    cues: {
      en: "Sit and open the legs wide, toes and knees pointing up. Sit tall through the spine, then walk the hands forward and fold from the hips, keeping the chest long. Go only as far as the breath stays smooth.",
      fr: "Assise, jambes bien écartées, orteils vers le ciel. Grandis la colonne, avance les mains et plie-toi depuis les hanches, poitrine longue. Reste où le souffle est fluide.",
      ar: "اجلسي وافتحي الساقين، الأصابع والركبتان للأعلى. أطيلي العمود، امشي باليدين للأمام وانحني من الوركين، الصدر ممتد. توقّفي حيث يبقى النفَس سلساً.",
    }}),
  P({ slug: "ragdoll", name: "Ragdoll Fold", group: "Forward folds", level: "Beginner", image: "/images/pose-ragdoll.webp",
    cues: {
      en: "From standing, feet hip-width, fold forward and bend the knees generously. Take hold of opposite elbows and let the head and neck hang completely heavy. Sway a little side to side, releasing the whole spine.",
      fr: "Debout, pieds largeur des hanches, plie-toi et fléchis bien les genoux. Attrape les coudes opposés, tête lourde. Balance-toi doucement, relâche la colonne.",
      ar: "من الوقوف والقدمان بعرض الورك، انحني واثني الركبتين جيداً. أمسكي المرفقين المتقابلين وأرخي الرأس تماماً. تمايلي قليلاً وحرّري العمود.",
    }}),
  P({ slug: "gate-pose", name: "Gate Pose", sanskrit: "Parighasana", group: "Forward folds", level: "Beginner", image: "/images/pose-gate-pose.webp", floorOnly: true,
    cues: {
      en: "Kneel, then extend the right leg out to the side, foot flat, toes forward. Rest the right hand lightly on the leg and sweep the left arm up and over, opening the left side of the body. Breathe into the long side waist. Then switch.",
      fr: "À genoux, tends la jambe droite sur le côté, pied à plat. Main droite sur la jambe, bras gauche par-dessus, ouvre le côté gauche. Respire dans le flanc. Puis change.",
      ar: "اركعي ثم مدّي الساق اليمنى للجانب، القدم مسطحة. اليد اليمنى على الساق، والذراع اليسرى للأعلى وفوق، لتفتحي الجنب الأيسر. تنفّسي في الخصر، ثم بدّلي.",
    }}),

  // Restorative
  P({ slug: "supported-bridge", name: "Supported Bridge", group: "Restorative", level: "Beginner", image: "/images/pose-supported-bridge.webp", floorOnly: true,
    cues: {
      en: "Lie on your back, knees bent, feet flat. Lift the hips and slide a block or cushion under the sacrum, then rest your whole weight down onto it. Let the arms fall open and the breath slow. Stay and be held.",
      fr: "Sur le dos, genoux pliés, pieds à plat. Lève les hanches, glisse un bloc ou coussin sous le sacrum, puis repose-toi dessus. Bras ouverts, souffle lent.",
      ar: "على الظهر، الركبتان مثنيتان والقدمان مسطحتان. ارفعي الوركين وضعي وسادة تحت العجز، ثم أرخي وزنك عليها. الذراعان مفتوحتان والنفَس بطيء.",
    }}),
  P({ slug: "banana-pose", name: "Banana Pose", group: "Restorative", level: "Beginner", image: "/images/pose-banana-pose.webp", floorOnly: true,
    cues: {
      en: "Lie on your back and walk both feet and the upper body over to the right, keeping the hips grounded, so the body curves like a crescent. Clasp the hands overhead if it feels good. Breathe into the long stretched left side. Then switch.",
      fr: "Sur le dos, déplace les pieds et le buste vers la droite, hanches ancrées, corps en croissant. Mains au-dessus de la tête. Respire dans le côté gauche étiré. Puis change.",
      ar: "على الظهر، حرّكي القدمين والجذع نحو اليمين، الوركان ثابتان، فيتقوّس الجسم كالهلال. شبّكي اليدين فوق الرأس. تنفّسي في الجانب الأيسر الممتد، ثم بدّلي.",
    }}),
  P({ slug: "supported-savasana", name: "Supported Rest", group: "Restorative", level: "Beginner", image: "/images/pose-supported-savasana.webp", floorOnly: true,
    cues: {
      en: "Lie down and slide a bolster or rolled blanket under the knees, and a soft layer under the head. Let the feet fall open, palms face up, and the whole body grow heavy. There is nothing to do now but breathe and be.",
      fr: "Allonge-toi, un traversin sous les genoux et un soutien sous la tête. Pieds ouverts, paumes vers le ciel, corps lourd. Rien à faire — respire et sois.",
      ar: "استلقي وضعي وسادة تحت الركبتين وطبقة ناعمة تحت الرأس. أرخي القدمين والكفّين للأعلى، والجسم يثقل. لا شيء تفعلينه سوى التنفّس والحضور.",
    }}),

  // Breathing
  P({ slug: "alternate-nostril", name: "Alternate Nostril Breath", sanskrit: "Nadi Shodhana", group: "Breathing", level: "Beginner", image: "/images/pose-alternate-nostril.webp", floorOnly: true,
    cues: {
      en: "Sit tall and rest the left hand on the knee. With the right thumb, gently close the right nostril and breathe in through the left. Close the left, release the right, and breathe out. Continue, guiding the breath slow and even through one nostril at a time.",
      fr: "Assise, dos long, main gauche sur le genou. Pouce droit ferme la narine droite, inspire à gauche. Ferme à gauche, ouvre à droite, expire. Continue, souffle lent et régulier.",
      ar: "اجلسي بظهر طويل واليد اليسرى على الركبة. بالإبهام الأيمن أغلقي المنخر الأيمن وشهيق من اليسار. أغلقي اليسار وافتحي اليمين وزفير. تابعي ببطء وانتظام.",
    }}),
  P({ slug: "box-breathing", name: "Box Breathing", sanskrit: "Sama Vritti", group: "Breathing", level: "Beginner", image: "/images/pose-box-breathing.webp", floorOnly: true,
    cues: {
      en: "Sit comfortably and let the eyes close. Breathe in for a count of four, hold gently for four, breathe out for four, and stay empty for four. Keep each side of the breath even and smooth, like tracing the four sides of a square.",
      fr: "Assise confortablement, yeux fermés. Inspire sur quatre temps, retiens quatre, expire quatre, reste vide quatre. Chaque côté du souffle égal, comme les côtés d'un carré.",
      ar: "اجلسي مرتاحة وأغمضي العينين. شهيق أربع عدّات، احبسي أربعاً، زفير أربعاً، وابقي فارغة أربعاً. اجعلي كل جانب من النفَس متساوياً كأضلاع المربّع.",
    }}),
];

const POSE_BY_SLUG: Record<string, Pose> = POSES.reduce((acc, p) => { acc[p.slug] = p; return acc; }, {} as Record<string, Pose>);

// ===================== INTENTIONS / FLOWS =====================

type Intention = "morning" | "stress" | "sleep" | "release" | "cycle" | "strength" | "core" | "balance" | "backcare" | "fullbody";
type Phase = "menstrual" | "follicular" | "ovulation" | "luteal";

const INTENTIONS: { id: Intention; label: string; icon: typeof Sun; tagline: string }[] = [
  { id: "morning", label: "Morning energy", icon: Sun, tagline: "wake up the body, light up the day" },
  { id: "stress", label: "Stress relief", icon: Heart, tagline: "soft, slow, exhale the day away" },
  { id: "sleep", label: "Sleep prep", icon: Moon, tagline: "gentle floor flow into deep rest" },
  { id: "release", label: "Emotional release", icon: Sparkle, tagline: "open hips & heart, let it move" },
  { id: "cycle", label: "Cycle sync", icon: Flower, tagline: "match today's phase" },
  { id: "strength", label: "Strength", icon: Activity, tagline: "build steady, mindful power" },
  { id: "fullbody", label: "Full-body flow", icon: Sun, tagline: "one flowing practice, head to toe" },
  { id: "core", label: "Core & abs", icon: CircleDot, tagline: "steady, mindful core strength" },
  { id: "balance", label: "Balance & focus", icon: Sparkle, tagline: "steady the body, quiet the mind" },
  { id: "backcare", label: "Back & neck relief", icon: Heart, tagline: "unwind desk-day tension" },
];

// Main-pose POOLS (ordered as a sensible flow). buildFlow picks a varied subset
// each session so daily practice never repeats. Warm-up / cool-down / rest are
// added separately from their own rotating pools.
const PHASE_SLUGS: Record<Phase, string[]> = {
  // menstrual — gentle, grounding, restorative
  menstrual: ["cat-cow", "childs-pose", "reclined-bound-angle", "butterfly", "happy-baby", "reclined-figure-four", "supine-twist", "knees-to-chest", "banana-pose", "legs-up-wall"],
  // follicular — fresh energy building
  follicular: ["downward-dog", "low-lunge", "high-lunge", "warrior-1", "warrior-2", "triangle", "cobra", "tree", "bridge", "chair"],
  // ovulation — peak, strong & open
  ovulation: ["downward-dog", "warrior-2", "extended-side-angle", "triangle", "half-moon", "goddess", "chair", "tree", "dancer", "boat", "camel", "bridge"],
  // luteal — slowing down, hips & folds
  luteal: ["cat-cow", "low-lunge", "lizard", "seated-forward-fold", "head-to-knee", "wide-leg-fold", "seated-wide-leg-fold", "gate-pose", "supine-twist", "reclined-figure-four", "legs-up-wall"],
};

const INTENTION_MAIN: Record<Exclude<Intention, "cycle">, string[]> = {
  morning: ["mountain", "standing-side-stretch", "forward-fold", "high-lunge", "warrior-1", "warrior-2", "triangle", "extended-side-angle", "downward-dog", "cobra", "upward-dog", "chair", "tree", "warrior-3"],
  stress: ["cat-cow", "childs-pose", "thread-the-needle", "low-lunge", "forward-fold", "seated-forward-fold", "gate-pose", "supine-twist", "reclined-figure-four", "banana-pose", "legs-up-wall"],
  sleep: ["reclined-bound-angle", "happy-baby", "knees-to-chest", "reclined-figure-four", "supine-twist", "banana-pose", "supported-bridge", "legs-up-wall"],
  release: ["low-lunge", "lizard", "pigeon", "butterfly", "frog", "cow-face", "gate-pose", "sphinx", "cobra", "bridge", "camel", "fish", "supine-twist"],
  strength: ["chair", "goddess", "warrior-2", "high-lunge", "plank", "forearm-plank", "chaturanga", "side-plank", "modified-side-plank", "boat", "hollow-hold", "dead-bug", "bird-dog", "reverse-plank", "bridge", "locust"],
  fullbody: ["mountain", "forward-fold", "high-lunge", "warrior-1", "warrior-2", "extended-side-angle", "triangle", "downward-dog", "plank", "cobra", "pigeon", "bridge", "seated-forward-fold", "supine-twist"],
  core: ["cat-cow", "bird-dog", "dead-bug", "plank", "forearm-plank", "hollow-hold", "boat", "side-plank", "modified-side-plank", "reverse-plank", "bridge", "knees-to-chest", "supine-twist"],
  balance: ["mountain", "tree", "standing-figure-four", "eagle", "warrior-3", "dancer", "half-moon", "chair", "goddess", "forward-fold"],
  backcare: ["neck-shoulder-rolls", "cat-cow", "childs-pose", "thread-the-needle", "sphinx", "cobra", "bird-dog", "low-lunge", "supine-twist", "reclined-figure-four", "knees-to-chest", "legs-up-wall"],
};

// ===================== FLOW SESSION PRESETS (carousels) =====================

interface SessionPreset { label: string; image: string; duration: number; intention: Intention }

const MOMENT_SESSIONS: SessionPreset[] = [
  { label: "Morning wake-up", image: "/images/pose-mountain.webp", duration: 10, intention: "morning" },
  { label: "Pre-workout", image: "/images/pose-warrior-2.webp", duration: 15, intention: "strength" },
  { label: "Post-workout", image: "/images/pose-pigeon.webp", duration: 15, intention: "release" },
  { label: "Lunch break", image: "/images/pose-cat-cow.webp", duration: 10, intention: "stress" },
  { label: "Evening wind-down", image: "/images/pose-legs-up-wall.webp", duration: 20, intention: "sleep" },
];

const INTENTION_SESSIONS: SessionPreset[] = [
  { label: "Energise", image: "/images/pose-warrior-1.webp", duration: 20, intention: "morning" },
  { label: "Restore", image: "/images/pose-reclined-bound-angle.webp", duration: 20, intention: "sleep" },
  { label: "Strengthen", image: "/images/pose-plank.webp", duration: 30, intention: "strength" },
  { label: "Release", image: "/images/pose-pigeon.webp", duration: 15, intention: "release" },
  { label: "Ground", image: "/images/pose-mountain.webp", duration: 10, intention: "morning" },
  { label: "Flow", image: "/images/pose-downward-dog.webp", duration: 30, intention: "stress" },
];

// Default weekly plan suggested per cycle phase — Mon..Sun, null = rest day.
// The user can always change it; this just pre-fills the organizer sensibly.
const PHASE_DEFAULT_PLAN: Record<Phase, (string | null)[]> = {
  menstrual:  ["Cycle sync", "Sleep prep", null, "Cycle sync", "Sleep prep", null, "Cycle sync"],
  follicular: ["Morning energy", "Strength", "Morning energy", null, "Strength", "Morning energy", null],
  ovulation:  ["Strength", "Morning energy", "Strength", "Morning energy", null, "Strength", null],
  luteal:     ["Stress relief", "Cycle sync", "Sleep prep", "Stress relief", "Cycle sync", null, "Sleep prep"],
};

// Image + duration preview shown under each organizer day once a focus is picked.
const FOCUS_PREVIEW: Record<string, { image: string; duration: string }> = {
  "Morning energy": { image: "/images/pose-mountain.webp", duration: "10-20 min" },
  "Stress relief":  { image: "/images/pose-childs-pose.webp", duration: "15 min" },
  "Sleep prep":     { image: "/images/pose-legs-up-wall.webp", duration: "10-20 min" },
  "Cycle sync":     { image: "/images/pose-reclined-bound-angle.webp", duration: "15-20 min" },
  "Strength":       { image: "/images/pose-plank.webp", duration: "20-30 min" },
  "Core & abs":         { image: "/images/pose-boat.webp", duration: "15-25 min" },
  "Balance & focus":    { image: "/images/pose-tree.webp", duration: "15-25 min" },
  "Back & neck relief": { image: "/images/pose-cat-cow.webp", duration: "10-15 min" },
  "Full-body flow":     { image: "/images/pose-downward-dog.webp", duration: "25-35 min" },
};

// Maps a scheduled focus label to a runnable flow (intention + duration + image),
// so a day in the plan can be started in one tap.
// Images come from the canonical YOGA_FOCUS map (crossToolData) so Today, the
// Calendar and this tool always show the SAME picture per focus.
const FOCUS_META: Record<string, { intention: Intention; duration: number; image: string; blurb: string }> = {
  "Morning energy":     { intention: "morning",  duration: 15, image: yogaFocusImage("Morning energy"),     blurb: "Wake the body, light up the day" },
  "Stress relief":      { intention: "stress",   duration: 15, image: yogaFocusImage("Stress relief"),      blurb: "Soft, slow — exhale the day away" },
  "Sleep prep":         { intention: "sleep",    duration: 20, image: yogaFocusImage("Sleep prep"),         blurb: "Gentle floor flow into deep rest" },
  "Cycle sync":         { intention: "cycle",    duration: 20, image: yogaFocusImage("Cycle sync"),         blurb: "Matched to today's phase" },
  "Strength":           { intention: "strength", duration: 25, image: yogaFocusImage("Strength"),           blurb: "Build steady, mindful power" },
  "Emotional release":  { intention: "release",  duration: 20, image: yogaFocusImage("Emotional release"),  blurb: "Open hips & heart, let it move" },
  "Core & abs":         { intention: "core",     duration: 20, image: yogaFocusImage("Core & abs"),         blurb: "Steady, mindful core strength" },
  "Balance & focus":    { intention: "balance",  duration: 20, image: yogaFocusImage("Balance & focus"),    blurb: "Steady the body, quiet the mind" },
  "Back & neck relief": { intention: "backcare", duration: 15, image: yogaFocusImage("Back & neck relief"), blurb: "Unwind desk-day tension" },
  "Full-body flow":     { intention: "fullbody", duration: 30, image: yogaFocusImage("Full-body flow"),     blurb: "One flowing practice, head to toe" },
};

// ── Curated weekly plans (yoga "programs") ──────────────────────────────────
// Each applies a themed 7-day focus schedule to My Plan in one tap, reusing the
// same schedule + Today-hero infrastructure.
interface YogaProgram {
  id: string;
  title: string;
  tagline: string;
  image: string;
  promise: string[];
  whoFor: string;
  focus: Record<string, string | null>; // Mon..Sun → FOCUS_META key or null (rest)
}

const YOGA_PROGRAMS: YogaProgram[] = [
  {
    id: "calm-reset",
    title: "7-Day Calm Reset",
    tagline: "Unwind the nervous system, sleep deeper.",
    image: "/images/pose-legs-up-wall.webp",
    promise: ["Daily soft flows to lower stress", "A gentle wind-down before sleep", "A calm, sustainable rhythm"],
    whoFor: "Frazzled, over-stretched, or struggling to switch off at night.",
    focus: { Mon: "Stress relief", Tue: "Sleep prep", Wed: null, Thu: "Stress relief", Fri: "Sleep prep", Sat: null, Sun: "Stress relief" },
  },
  {
    id: "morning-glow",
    title: "Morning Glow Week",
    tagline: "Wake up bright, move with energy.",
    image: "/images/pose-warrior-1.webp",
    promise: ["Energizing morning flows", "Build steady, mindful strength", "Start every day lighter"],
    whoFor: "You want to begin your days with movement and momentum.",
    focus: { Mon: "Morning energy", Tue: "Strength", Wed: "Morning energy", Thu: null, Fri: "Strength", Sat: "Morning energy", Sun: null },
  },
  {
    id: "cycle-synced",
    title: "Cycle-Synced Week",
    tagline: "Move with your hormones, not against them.",
    image: "/images/pose-reclined-bound-angle.webp",
    promise: ["Flows matched to each phase", "Honour your low-energy days", "Feel more in tune with your body"],
    whoFor: "You want your practice to follow your cycle's natural rhythm.",
    focus: { Mon: "Cycle sync", Tue: "Stress relief", Wed: null, Thu: "Cycle sync", Fri: "Sleep prep", Sat: null, Sun: "Cycle sync" },
  },
  {
    id: "flex-release",
    title: "Flexibility & Release",
    tagline: "Open tight hips, release held tension.",
    image: "/images/pose-pigeon.webp",
    promise: ["Deep hip & heart openers", "Release stored tension", "Greater ease of movement"],
    whoFor: "Tight hips, a stiff back, or a lot of sitting.",
    focus: { Mon: "Emotional release", Tue: "Stress relief", Wed: "Emotional release", Thu: null, Fri: "Cycle sync", Sat: "Emotional release", Sun: null },
  },
  {
    id: "strong-sculpted",
    title: "Strong & Sculpted",
    tagline: "Build lean strength, mindfully.",
    image: "/images/pose-plank.webp",
    promise: ["Sculpt core, glutes & arms", "Steady, functional strength", "Feel powerful in your body"],
    whoFor: "You want to tone and build strength without the gym.",
    focus: { Mon: "Strength", Tue: "Core & abs", Wed: null, Thu: "Strength", Fri: "Full-body flow", Sat: "Core & abs", Sun: null },
  },
  {
    id: "core-foundations",
    title: "Core Foundations",
    tagline: "A strong, stable centre in one week.",
    image: "/images/pose-boat.webp",
    promise: ["A strong, controlled core", "Better posture & stability", "Protect your lower back"],
    whoFor: "You want deep-core strength and a supported back.",
    focus: { Mon: "Core & abs", Tue: "Back & neck relief", Wed: null, Thu: "Core & abs", Fri: "Balance & focus", Sat: null, Sun: "Core & abs" },
  },
  {
    id: "desk-reset",
    title: "Desk Reset",
    tagline: "Undo the day's sitting, one flow at a time.",
    image: "/images/pose-cat-cow.webp",
    promise: ["Unwind neck & shoulder knots", "Free a stiff lower back", "Move easily again"],
    whoFor: "Long hours at a desk, a tight neck, or an achy back.",
    focus: { Mon: "Back & neck relief", Tue: "Stress relief", Wed: "Back & neck relief", Thu: null, Fri: "Back & neck relief", Sat: "Sleep prep", Sun: null },
  },
  {
    id: "total-body-balance",
    title: "Total-Body Balance",
    tagline: "One well-rounded practice, head to toe.",
    image: "/images/pose-warrior-3.webp",
    promise: ["A complete full-body flow", "Steady balance & focus", "Well-rounded every week"],
    whoFor: "You want one balanced routine that trains the whole body.",
    focus: { Mon: "Full-body flow", Tue: "Balance & focus", Wed: null, Thu: "Full-body flow", Fri: "Morning energy", Sat: "Balance & focus", Sun: null },
  },
];

// ── Recorded pose narration + audio-driven timing ───────────────────────────
// Every pose plays its OWN recorded narration (no robotic text-to-speech). Its
// on-screen hold is that audio's real length rounded UP to the next clean 5s, so
// the voice is never cut off. Poses missing a recording fall back to a default
// hold and stay silent. (Measured from the uploaded files.)
const POSE_HOLD: Record<string, number> = {
  "easy-seat": 50, "cat-cow": 120, "childs-pose": 60, "seated-twist": 105, "low-lunge": 105,
  "butterfly": 75, "pigeon": 110, "garland": 105, "mountain": 80, "forward-fold": 65,
  "downward-dog": 75, "warrior-1": 95, "warrior-2": 110, "triangle": 105, "chair": 65,
  "tree": 95, "half-moon": 110, "cobra": 80, "camel": 95, "seated-forward-fold": 85,
  "head-to-knee": 75, "wide-leg-fold": 100, "reclined-bound-angle": 110, "knees-to-chest": 105,
  "supine-twist": 120, "legs-up-wall": 120, "savasana": 105, "plank": 115, "boat": 85, "side-plank": 110,
  "bridge": 85,
  // Library expansion — estimated holds until each recording is measured.
  "neck-shoulder-rolls": 85, "thread-the-needle": 50, "bird-dog": 95, "standing-side-stretch": 100,
  "high-lunge": 90, "crescent-twist": 115, "extended-side-angle": 110, "pyramid": 115, "revolved-triangle": 105,
  "goddess": 105, "wide-legged-forward-fold": 100, "warrior-3": 105, "eagle": 120, "dancer": 50,
  "standing-figure-four": 100, "sphinx": 85, "locust": 100, "bow": 125, "upward-dog": 70, "fish": 100,
  "lizard": 105, "happy-baby": 75, "cow-face": 100, "frog": 115, "reclined-figure-four": 120,
  "forearm-plank": 105, "chaturanga": 90, "dead-bug": 85, "hollow-hold": 105, "modified-side-plank": 140,
  "reverse-plank": 75, "seated-wide-leg-fold": 80, "ragdoll": 90, "gate-pose": 115, "supported-bridge": 105,
  "banana-pose": 120, "supported-savasana": 100, "alternate-nostril": 130, "box-breathing": 90,
};
const poseAudioUrl = (slug: string): string | undefined =>
  POSE_HOLD[slug] != null ? `/audio/yoga/${slug}.mp3` : undefined;
const holdOf = (slug: string, fallback = 45): number => POSE_HOLD[slug] ?? fallback;

// ── One-sided poses — each needs a short second-side step. After side one, we
// insert an "other side" step that plays the switch-side voice and holds 20s.
const TWO_SIDED = new Set<string>([
  "seated-twist", "low-lunge", "pigeon", "warrior-1", "warrior-2", "triangle",
  "tree", "half-moon", "head-to-knee", "supine-twist", "side-plank",
  // expansion
  "thread-the-needle", "bird-dog", "standing-side-stretch", "high-lunge", "crescent-twist",
  "extended-side-angle", "pyramid", "revolved-triangle", "warrior-3", "eagle", "dancer",
  "standing-figure-four", "lizard", "cow-face", "reclined-figure-four", "modified-side-plank",
  "gate-pose", "banana-pose",
]);
const SWITCH_AUDIO = "/audio/yoga/switch-sides.mp3";
const SWITCH_HOLD = 35; // seconds on the second side (clip is ~15s, leaving room to hold the shape)
// After the narration finishes, hold the pose this many extra seconds with just
// the music, so she can settle into the shape before moving on.
const POSE_TAIL_SEC = 10;
const SWITCH_CUES: Record<Lang, string> = {
  en: "Gently release the pose. Take a slow breath in, and softly come onto your other side. Ease into the shape, lengthen your spine, and let your shoulders soften. Stay here — breathing deep, and slow.",
  fr: "Relâche doucement la posture. Inspire lentement, et passe en douceur de l'autre côté. Installe-toi, allonge la colonne, relâche les épaules. Reste ici — respire, profondément et lentement.",
  ar: "حرّري الوضعية بلطف. خذي شهيقاً بطيئاً، وانتقلي بهدوء إلى الجهة الأخرى. استقري في الوضعية، أطيلي العمود الفقري، وأرخي كتفيكِ. ابقي هنا — تنفّسي بعمق وببطء.",
};
/** A synthetic "other side" step built from a one-sided pose. */
const makeSwitchStep = (p: Pose): Pose => ({ ...p, slug: `${p.slug}__side2`, switchStep: true, cues: SWITCH_CUES });
/** This step's hold in seconds: narration length + a 10s music-only tail;
 *  switch steps are a fixed 20s. */
const poseHoldSec = (p: Pose): number => (p.switchStep ? SWITCH_HOLD : holdOf(p.slug) + POSE_TAIL_SEC);
/** The audio a step should play. */
const poseAudioFor = (p: Pose): string | undefined => (p.switchStep ? SWITCH_AUDIO : poseAudioUrl(p.slug));

// ── Music-only guided holds (record experiment) ─────────────────────────────
// When a flow is filmed music-only (no voice), the on-screen ring + pose name +
// "up next" are the ONLY guide, so each hold follows real yoga timing rather
// than narration length. Kept short and logical: gentle restorative holds, a
// longer final rest, brief second sides — a "10 min" flow really lands ~7–8 min.
const GUIDE_HOLD_DEFAULT = 40;
const GUIDE_HOLD: Record<string, number> = {
  "easy-seat": 30, "box-breathing": 40, "alternate-nostril": 40, "neck-shoulder-rolls": 30,
  "cat-cow": 35, "childs-pose": 40, "thread-the-needle": 30, "bird-dog": 30, "standing-side-stretch": 30,
  "reclined-bound-angle": 45, "knees-to-chest": 35, "happy-baby": 35, "banana-pose": 40,
  "legs-up-wall": 60, "supine-twist": 30, "seated-forward-fold": 40, "reclined-figure-four": 40,
  "butterfly": 40, "low-lunge": 35, "pigeon": 45, "gate-pose": 35, "sphinx": 35, "cobra": 30, "bridge": 35,
  "savasana": 60, "supported-savasana": 60,
};
/** This step's hold when the session is filmed music-only. */
const guideHoldSec = (p: Pose): number =>
  p.switchStep ? 20 : (GUIDE_HOLD[p.slug] ?? GUIDE_HOLD_DEFAULT);

// ── End-of-flow outro ───────────────────────────────────────────────────────
// A gentle closing track that plays as a flow finishes, so a session never just
// cuts to silence — it softly announces the end. One suitable outro per session
// intention. Kept at module scope so it survives the player unmounting into the
// summary screen (and so a new session can stop a lingering one).
const END_OUTRO: Record<Intention, string> = {
  morning: "morning-glow", cycle: "cycle-synced", release: "flex-release",
  strength: "strong-sculpted", core: "core-foundations", backcare: "desk-reset",
  fullbody: "total-body-balance", balance: "total-body-balance",
  stress: "deep-relief", sleep: "deep-relief",
};
const endOutroUrl = (i: Intention) => `/audio/yoga/end/${END_OUTRO[i]}.mp3`;
let endOutroEl: HTMLAudioElement | null = null;
function stopEndOutro() { try { endOutroEl?.pause(); } catch {} endOutroEl = null; }
/** Immersive full-screen so the flow fills the TV cleanly when the screen/tab is
 *  cast or mirrored (Chromecast / AirPlay). Toggles on/off. */
function toggleFullscreen() {
  const d = document as any;
  try {
    if (!d.fullscreenElement && !d.webkitFullscreenElement) {
      const el = d.documentElement as any;
      (el.requestFullscreen || el.webkitRequestFullscreen)?.call(el);
    } else {
      (d.exitFullscreen || d.webkitExitFullscreen)?.call(d);
    }
  } catch {}
}
/** Linearly ramp an audio element's volume to a target over `ms`. */
function fadeAudioTo(el: HTMLAudioElement, target: number, ms: number, done?: () => void) {
  const steps = 24;
  const start = el.volume;
  const dv = (target - start) / steps;
  const dt = Math.max(16, ms / steps);
  let n = 0;
  const iv = setInterval(() => {
    n++;
    try { el.volume = Math.max(0, Math.min(1, start + dv * n)); } catch {}
    if (n >= steps) { clearInterval(iv); done?.(); }
  }, dt);
}

// ONE continuous music bed for a whole flow — started when the flow opens (during
// the intro) and adopted by the player, so the music never stops-and-restarts at
// the first pose. Kept at module scope so it survives the intro→player hand-off.
let flowBedEl: HTMLAudioElement | null = null;
function startFlowBed(sound: string): HTMLAudioElement {
  if (!flowBedEl) {
    flowBedEl = new Audio(MUSIC[sound] || MUSIC[DEFAULT_SOUND]);
    flowBedEl.loop = true;
    flowBedEl.preload = "auto";
  }
  return flowBedEl;
}
function stopFlowBed() { try { flowBedEl?.pause(); } catch {} flowBedEl = null; }
/** Play the outro for this intention — fades in, and gently fades itself out after
 *  a short window so a long track never hijacks the next screen. */
function playEndOutro(intention: Intention, onEnded?: () => void) {
  stopEndOutro();
  let fired = false;
  const fire = () => { if (!fired) { fired = true; onEnded?.(); } };
  try {
    const a = new Audio(endOutroUrl(intention));
    a.volume = 0; a.preload = "auto";
    endOutroEl = a;
    a.play().then(() => fadeAudioTo(a, 0.85, 1400)).catch(() => fire());
    // Let the outro play to its natural end — never cropped mid-sentence.
    a.addEventListener("ended", () => { if (endOutroEl === a) endOutroEl = null; fire(); });
    a.addEventListener("error", () => fire());
  } catch { fire(); }
}

// ── Background music (a continuous, looping bed). "Windsong" is the fullest
// track and also powers the eyes-closed music-only experience.
const MUSIC: Record<string, string> = {
  Weightless: "/audio/music/weightless.mp3",
  Renewal: "/audio/music/renewal.mp3",
  Windsong: "/audio/music/windsong.mp3",
  Forest: "/audio/music/forest.mp3",
};

// Rotating warm-up / cool-down / rest pools — each session pulls a varied set so
// daily practice never feels identical.
const WARMUP_POOL = ["neck-shoulder-rolls", "cat-cow", "childs-pose", "thread-the-needle", "bird-dog", "standing-side-stretch"];
const COOLDOWN_POOL = ["seated-forward-fold", "supine-twist", "reclined-figure-four", "happy-baby", "gate-pose", "banana-pose"];
const REST_POOL = ["savasana", "supported-savasana"];
// Gentler intentions get a shorter main set.
const GENTLE = new Set<Intention>(["sleep", "stress", "backcare"]);

function shuffle<T>(a: T[]): T[] {
  const b = [...a];
  for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; }
  return b;
}
/** Pick `keep` items from an ordered pool at random, PRESERVING order — variety
 *  without breaking a sensible sequence. */
function pickVaried(pool: string[], keep: number): string[] {
  if (pool.length <= keep) return pool;
  return shuffle(pool.map((_, i) => i)).slice(0, keep).sort((a, b) => a - b).map((i) => pool[i]);
}

function buildFlow(opts: {
  intention: Intention; level: Level; durationMin: number; phase: Phase; mode: Mode;
}): Pose[] {
  const { intention, level, durationMin, phase, mode } = opts;

  // Beginner audio-only safety: drop non-floor poses
  const audioBeginner = mode === "audio" && level === "Beginner";
  const safe = (slugs: string[]) =>
    audioBeginner ? slugs.filter((s) => POSE_BY_SLUG[s]?.floorOnly) : slugs;

  // Level filter: beginners avoid "Advanced"; advanced practitioners pull harder.
  const byLevel = (slugs: string[]) => slugs.filter((s) => {
    const lv = POSE_BY_SLUG[s]?.level;
    if (level === "Beginner") return lv !== "Advanced";
    if (level === "Intermediate") return lv !== "Advanced" || Math.random() > 0.5;
    return true;
  });

  const mainPool = intention === "cycle" ? PHASE_SLUGS[phase] : INTENTION_MAIN[intention];

  // Real length of one step: narration + music tail, plus the second-side step
  // for one-sided poses. Used to size the flow to the chosen duration so a
  // "10 min" session really is ~10 min, not a fixed ~25.
  const stepSec = (slug: string) =>
    holdOf(slug) + POSE_TAIL_SEC + (TWO_SIDED.has(slug) ? SWITCH_HOLD : 0);

  // Honour the chosen minutes. Every step's hold is locked to its narration
  // length (so audio is never cropped), so we can't shrink poses — instead we
  // fit the RIGHT NUMBER of them into the time budget, and on short sessions we
  // prefer shorter-audio poses so a "10 min" flow holds 3–4 varied poses rather
  // than 1–2 long ones that overshoot.
  const budget = durationMin * 60;
  const stepCap = durationMin <= 12 ? 110 : durationMin <= 20 ? 150 : Infinity;
  const affordable = (slugs: string[]) => {
    const fit = slugs.filter((s) => stepSec(s) <= stepCap);
    return fit.length ? fit : slugs; // never empty out a pool
  };

  // Structure scales with length: short sessions get a lighter warm-up / cool-down.
  const framingN = durationMin <= 12 ? 1 : durationMin >= 40 ? 3 : 2;

  // Endpoints we always keep: a grounding seated breath to open, a rest to close.
  const ground = "easy-seat";
  const restCand = safe(REST_POOL).length ? safe(REST_POOL) : ["savasana"];
  const rest = [...restCand].sort((a, b) => stepSec(a) - stepSec(b))[0]; // shortest rest

  const used = new Set<string>([ground, rest]);
  let spent = stepSec(ground) + stepSec(rest);
  // Greedily take up to `max` poses from an ordered candidate list, always
  // keeping the first `min` (so `main` is never empty) and otherwise only
  // adding a pose while it still fits the remaining time budget.
  const take = (cands: string[], min: number, max: number): string[] => {
    const out: string[] = [];
    for (const s of cands) {
      if (out.length >= max) break;
      if (used.has(s)) continue;
      const cost = stepSec(s);
      if (out.length >= min && spent + cost > budget) continue;
      out.push(s); used.add(s); spent += cost;
    }
    return out;
  };

  // Reserve one warm-up so even a short flow opens gently, fill the middle with
  // the main pool (at least one pose), then cool down with whatever time is left.
  const mainMax = GENTLE.has(intention) ? 9 : 14;
  const warm = take(pickVaried(affordable(safe(WARMUP_POOL)), framingN), 0, framingN);
  const main = take(pickVaried(affordable(safe(byLevel(mainPool))), mainPool.length), 1, mainMax);
  const cool = take(pickVaried(affordable(safe(COOLDOWN_POOL)), framingN), 0, framingN);

  const composed = [ground, ...warm, ...main, ...cool, rest];
  // dedupe while preserving order
  const seen = new Set<string>();
  const poses = composed
    .filter((s) => POSE_BY_SLUG[s] && !seen.has(s) && (seen.add(s), true))
    .map((s) => POSE_BY_SLUG[s]);
  // After each one-sided pose, add a short "other side" step.
  const withSides: Pose[] = [];
  for (const p of poses) {
    withSides.push(p);
    if (TWO_SIDED.has(p.slug)) withSides.push(makeSwitchStep(p));
  }
  return withSides;
}

/* ===================== TITLED FLOW LIBRARY =====================
   Curated, FIXED sequences with searchable titles. One entry powers BOTH a
   browsable in-app flow AND a ready-to-film YouTube video. The generator above
   (buildFlow) stays untouched for the user's own personalized/parametered flow. */
export type NamedFlow = {
  slug: string; title: string; intention: Intention; phase?: Phase;
  durationMin: number; level: Level; blurb: string; tags: string[];
  poses: string[]; thumb?: string;
  /** One practical, expert-teacher tip shown on the flow card (when to practise,
   *  how to breathe, what to watch for) — the "coach's note" for this flow. */
  advice?: string;
};
export const YOGA_FLOWS: NamedFlow[] = [
  // — Cycle (the niche) —
  { slug: "period-cramps", title: "Yoga for Period Cramps", intention: "cycle", phase: "menstrual", durationMin: 15, level: "Beginner",
    blurb: "Gentle holds to soften cramps and ease the low belly.", tags: ["period", "cramps", "menstrual", "gentle", "PMS"],
    poses: ["easy-seat", "cat-cow", "childs-pose", "reclined-bound-angle", "knees-to-chest", "supine-twist", "happy-baby", "banana-pose", "legs-up-wall", "savasana"],
    advice: "Keep everything gentle and skip anything that strains the belly. Breathe slowly into the low belly to warm and relax the cramping muscles — warmth and calm, never force." },
  { slug: "pms-relief", title: "PMS Relief Yoga", intention: "cycle", phase: "luteal", durationMin: 15, level: "Beginner",
    blurb: "Calm the mood swings and release tension before your period.", tags: ["PMS", "luteal", "calm", "mood", "hormones"],
    poses: ["easy-seat", "cat-cow", "childs-pose", "low-lunge", "pigeon", "seated-forward-fold", "supine-twist", "reclined-bound-angle", "legs-up-wall", "savasana"],
    advice: "Practise in the evening when symptoms peak. Move slowly and let long, slow exhales settle the mood — the aim is to down-shift, not to push." },
  { slug: "bloating-digestion", title: "Yoga for Bloating & Digestion", intention: "release", durationMin: 10, level: "Beginner",
    blurb: "Twists and folds to ease a bloated, heavy belly.", tags: ["bloating", "digestion", "gut", "twist", "period"],
    poses: ["easy-seat", "cat-cow", "knees-to-chest", "seated-twist", "supine-twist", "seated-forward-fold", "childs-pose", "legs-up-wall", "savasana"],
    advice: "Best on an empty-ish stomach — 2–3 h after eating, never right after a big meal. Make each exhale longer than the inhale to switch on 'rest & digest', and let the twists gently wring the belly." },
  { slug: "follicular-energy", title: "Follicular Phase Energy Yoga", intention: "cycle", phase: "follicular", durationMin: 20, level: "Intermediate",
    blurb: "Build gentle heat as your energy rises after your period.", tags: ["follicular", "energy", "flow", "strength"],
    poses: ["easy-seat", "cat-cow", "downward-dog", "low-lunge", "warrior-1", "warrior-2", "triangle", "tree", "bridge", "seated-forward-fold", "savasana"],
    advice: "Your energy is climbing after your period — this is the phase to build a little heat. Take the standing poses with strong, steady legs and enjoy feeling capable again." },
  { slug: "ovulation-glow", title: "Ovulation Glow Flow", intention: "cycle", phase: "ovulation", durationMin: 20, level: "Intermediate",
    blurb: "Your strongest phase — open, energize and glow.", tags: ["ovulation", "energy", "glow", "strength"],
    poses: ["easy-seat", "cat-cow", "downward-dog", "high-lunge", "warrior-2", "extended-side-angle", "triangle", "goddess", "tree", "bridge", "savasana"],
    advice: "Your peak-energy phase — go for the fuller expression of each pose. Keep the breath smooth and even as the shapes get bigger and juicier." },
  { slug: "luteal-calm", title: "Luteal Phase Calm Yoga", intention: "cycle", phase: "luteal", durationMin: 15, level: "Beginner",
    blurb: "Wind down as your energy dips before your period.", tags: ["luteal", "calm", "restorative", "hormones"],
    poses: ["easy-seat", "cat-cow", "childs-pose", "low-lunge", "pigeon", "butterfly", "seated-twist", "reclined-bound-angle", "legs-up-wall", "savasana"],
    advice: "Energy naturally dips before your period — honour it. Hold longer, breathe slower, and don't chase depth. This is a practice of letting go." },
  // — Time & mood —
  { slug: "morning-wake-up", title: "Morning Wake-Up Yoga", intention: "morning", durationMin: 10, level: "Beginner",
    blurb: "A bright 10 minutes to wake the body and mind.", tags: ["morning", "wake up", "energy", "beginner"],
    poses: ["easy-seat", "cat-cow", "downward-dog", "forward-fold", "low-lunge", "cobra", "mountain", "standing-side-stretch", "seated-twist", "childs-pose", "savasana"],
    advice: "Do it right after waking, before screens. Breathe big and full and let the poses build a little heat — think of it as opening the curtains on your body." },
  { slug: "bedtime-sleep", title: "Bedtime Yoga for Better Sleep", intention: "sleep", durationMin: 15, level: "Beginner",
    blurb: "Slow, floor-based holds to melt into deep rest.", tags: ["sleep", "bedtime", "night", "wind down", "insomnia"],
    poses: ["easy-seat", "childs-pose", "cat-cow", "seated-forward-fold", "reclined-bound-angle", "supine-twist", "knees-to-chest", "happy-baby", "legs-up-wall", "banana-pose", "savasana"],
    advice: "Dim the lights and do this in bed or beside it. Everything stays slow and floor-based — nothing should raise your heart rate. Let savasana melt straight into sleep." },
  { slug: "stress-relief", title: "Stress Relief Yoga", intention: "stress", durationMin: 10, level: "Beginner",
    blurb: "Let the shoulders drop and the breath slow down.", tags: ["stress", "relax", "tension", "calm"],
    poses: ["easy-seat", "neck-shoulder-rolls", "cat-cow", "childs-pose", "thread-the-needle", "low-lunge", "seated-forward-fold", "supine-twist", "savasana"],
    advice: "Make every exhale longer than the inhale — that's the switch that calms the nervous system. Consciously soften the jaw and the space between your brows." },
  { slug: "anxiety-breathe", title: "Yoga for Anxiety · Calm & Breathe", intention: "stress", durationMin: 10, level: "Beginner",
    blurb: "Breathwork and grounding holds to settle a racing mind.", tags: ["anxiety", "breathe", "calm", "grounding"],
    poses: ["easy-seat", "box-breathing", "alternate-nostril", "childs-pose", "cat-cow", "reclined-bound-angle", "legs-up-wall", "savasana"],
    advice: "Start with the breathwork and don't rush it — the poses are just here to keep you grounded. Whenever the mind races, come back to counting the breath." },
  // — Body targets —
  { slug: "lower-back", title: "Yoga for Lower Back Pain", intention: "backcare", durationMin: 12, level: "Beginner",
    blurb: "Soothe and mobilize a tight, achy lower back.", tags: ["back pain", "lower back", "spine", "relief"],
    poses: ["easy-seat", "cat-cow", "childs-pose", "sphinx", "cobra", "knees-to-chest", "supine-twist", "bridge", "thread-the-needle", "savasana"],
    advice: "Move only within a pain-free range — a gentle stretch, never a sharp pinch. Keep the belly lightly drawn in to support the spine, and back off any pose that hurts." },
  { slug: "neck-shoulders-desk", title: "Desk Break · Neck & Shoulder Yoga", intention: "backcare", durationMin: 5, level: "Beginner",
    blurb: "A 5-minute reset for a stiff neck and shoulders at your desk.", tags: ["neck", "shoulders", "desk", "office", "quick"],
    poses: ["neck-shoulder-rolls", "seated-twist", "standing-side-stretch", "thread-the-needle", "cat-cow", "childs-pose"],
    advice: "Do it right at your desk, no need to change clothes. Drop the shoulders away from the ears and move slowly — quality of movement over range." },
  { slug: "hip-openers", title: "Hip-Opening Yoga", intention: "release", durationMin: 15, level: "Intermediate",
    blurb: "Deep, patient holds to open tight hips.", tags: ["hips", "hip openers", "flexibility", "release"],
    poses: ["easy-seat", "cat-cow", "low-lunge", "lizard", "pigeon", "garland", "butterfly", "cow-face", "happy-baby", "reclined-figure-four", "savasana"],
    advice: "Hips hold tension and emotion — go slow, hold each shape for several breaths, and let it melt open. Never force a hip; breathe into the resistance instead." },
  { slug: "flexibility-hamstrings", title: "Yoga for Flexibility & Hamstrings", intention: "fullbody", durationMin: 15, level: "Beginner",
    blurb: "Lengthen the backs of the legs and the whole spine.", tags: ["flexibility", "hamstrings", "stretch", "splits"],
    poses: ["easy-seat", "cat-cow", "downward-dog", "forward-fold", "ragdoll", "low-lunge", "pyramid", "seated-forward-fold", "head-to-knee", "wide-legged-forward-fold", "savasana"],
    advice: "Warm up first — never stretch cold hamstrings hard. Micro-bend the knees and hinge from the hips, not the low back. Flexibility comes from consistency, not force." },
  { slug: "core-power", title: "Core Power Yoga", intention: "core", durationMin: 15, level: "Intermediate",
    blurb: "Build a strong, steady centre.", tags: ["core", "abs", "strength", "power"],
    poses: ["easy-seat", "cat-cow", "bird-dog", "plank", "forearm-plank", "dead-bug", "hollow-hold", "boat", "modified-side-plank", "bridge", "savasana"],
    advice: "Keep the low back gently pressing down and breathe steadily — never hold your breath. Stop a hold when your form breaks, not when you're wrecked. Bridge at the end un-rounds the spine." },
  { slug: "balance-focus", title: "Balance & Focus Yoga", intention: "balance", durationMin: 12, level: "Intermediate",
    blurb: "Steady standing shapes to sharpen focus.", tags: ["balance", "focus", "standing", "stability"],
    poses: ["easy-seat", "mountain", "tree", "eagle", "standing-figure-four", "high-lunge", "chair", "goddess", "savasana"],
    advice: "Fix your gaze on one still point (a drishti) to steady each balance — wobbling is part of it, just breathe and reset. Practise when you're alert, not exhausted." },
  { slug: "full-body-beginner", title: "Full-Body Beginner Yoga · 10 Min", intention: "fullbody", durationMin: 10, level: "Beginner",
    blurb: "A friendly all-round flow for total beginners.", tags: ["beginner", "full body", "10 minute", "gentle"],
    poses: ["easy-seat", "cat-cow", "downward-dog", "forward-fold", "low-lunge", "warrior-2", "triangle", "tree", "bridge", "seated-twist", "savasana"],
    advice: "There's no 'perfect' shape — just move with your breath and go where it feels good. Rest in child's pose any time you need a pause." },
  { slug: "morning-stretch-5", title: "5-Minute Morning Stretch", intention: "morning", durationMin: 5, level: "Beginner",
    blurb: "The quickest way to un-stiffen and start your day.", tags: ["morning", "quick", "5 minute", "stretch"],
    poses: ["easy-seat", "cat-cow", "downward-dog", "forward-fold", "standing-side-stretch", "seated-twist", "childs-pose"],
    advice: "Five minutes is enough to un-stiffen — do it before coffee. Yawn, stretch big, and don't worry about doing it 'right'." },
];

/** Build a fixed titled flow: resolve slugs → poses, add the "other side" step
 *  after each one-sided pose (same treatment as buildFlow). No randomness — the
 *  filmed video always matches what the app plays. */
export function buildNamedFlow(poseSlugs: string[]): Pose[] {
  const seen = new Set<string>();
  const poses = poseSlugs
    .filter((s) => POSE_BY_SLUG[s] && !seen.has(s) && (seen.add(s), true))
    .map((s) => POSE_BY_SLUG[s]);
  const withSides: Pose[] = [];
  for (const p of poses) {
    withSides.push(p);
    if (TWO_SIDED.has(p.slug)) withSides.push(makeSwitchStep(p));
  }
  return withSides;
}

/** Real session length (seconds) = sum of each pose's own hold. */
function flowTotalSeconds(flow: Pose[]): number {
  return flow.reduce((a, p) => a + poseHoldSec(p), 0);
}

function holdSecondsFor(durationMin: number, level: Level) {
  // Approximate per-pose hold so total ~= durationMin
  const base = durationMin <= 10 ? 30 : durationMin <= 20 ? 40 : durationMin <= 30 ? 45 : durationMin <= 45 ? 50 : 60;
  return level === "Beginner" ? base + 10 : level === "Advanced" ? Math.max(25, base - 10) : base;
}

// ===================== I18N STRINGS =====================

const LANGS: { id: Lang; label: string; bcp: string }[] = [
  { id: "en", label: "English", bcp: "en-US" },
  { id: "fr", label: "Français", bcp: "fr-FR" },
  { id: "ar", label: "العربية", bcp: "ar-SA" },
];

const ENCOURAGE: Record<Lang, string> = {
  en: "You're doing beautifully. Stay with your breath.",
  fr: "Tu fais magnifiquement bien. Reste avec ta respiration.",
  ar: "أنتِ تقومين بعمل رائع. ابقي مع أنفاسكِ.",
};
const CLOSING: Record<Lang, string> = {
  en: "Bring the hands to your heart. Thank you for showing up for yourself today. Namaste.",
  fr: "Mains au cœur. Merci d'avoir pris ce temps pour toi. Namaste.",
  ar: "ضعي يديكِ على قلبكِ. شكراً لكِ على هذا الوقت الذي منحتيه لنفسكِ.",
};

// ===================== STORAGE / STATE KEYS =====================

const ONBOARD_KEY = "bloom:yoga-onboarded";
const YOGA_TOUR_KEY = "bloom:yoga-tour-done";

/** Reset the Yoga tool to its first-time state (with a confirm). Shared by the
 *  hero and the plan controls. */
async function resetYogaTool() {
  if (window.confirm("Reset the Yoga tool to a fresh start? This clears your week, sessions and progress here so you can see the first-time experience.")) {
    resetToolState("yoga");
    await flushCloudSync(); // push the deletions before reload, else cloud restores them
    window.location.reload();
  }
}
const STEP_KEY = "bloom:yoga-step"; // 1 learn, 2 visual, 3 audio
const STREAK_KEY = "bloom:yoga-streak";
export const SCHEDULE_KEY = "bloom:yoga-schedule";
export const REMINDER_KEY = "bloom:yoga-reminder";
export const YOGA_DURATIONS_KEY = "bloom:yoga-durations";

// Reminder time options for the on-brand picker (05:00–22:00, every 15 min).
const REMINDER_TIME_OPTIONS = (() => {
  const out: { value: string; label: string }[] = [];
  for (let h = 5; h <= 22; h++) for (const m of [0, 15, 30, 45]) {
    const value = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
    const ampm = h < 12 ? "AM" : "PM";
    const h12 = h % 12 === 0 ? 12 : h % 12;
    out.push({ value, label: `${h12}:${String(m).padStart(2, "0")} ${ampm}` });
  }
  return out;
})();
const fmtReminder = (v: string) => REMINDER_TIME_OPTIONS.find((o) => o.value === v)?.label ?? v;
export const YOGA_PROFILE_KEY = "bloom:yoga-profile";
interface Streak { count: number; lastISO: string | null; }

// What the user wants from yoga — used when building a custom week + stored as
// a preference (level also becomes the default for every session she starts).
type YogaGoal = "calm" | "strength" | "flexibility" | "energy";
const YOGA_GOALS: { key: YogaGoal; label: string; focuses: string[] }[] = [
  { key: "calm",        label: "Calm & restore",  focuses: ["Stress relief", "Sleep prep"] },
  { key: "strength",    label: "Strength & tone", focuses: ["Strength", "Morning energy"] },
  { key: "flexibility", label: "Flexibility",     focuses: ["Stress relief", "Cycle sync"] },
  { key: "energy",      label: "Energy & focus",  focuses: ["Morning energy", "Strength"] },
];
const YOGA_DAY_PATTERNS: Record<number, string[]> = {
  2: ["Mon", "Thu"],
  3: ["Mon", "Wed", "Fri"],
  4: ["Mon", "Tue", "Thu", "Fri"],
  5: ["Mon", "Tue", "Wed", "Thu", "Fri"],
};
function readYogaProfileLevel(): Level {
  try { const p = JSON.parse(localStorage.getItem(YOGA_PROFILE_KEY) || "null"); return p?.level ?? "Beginner"; }
  catch { return "Beginner"; }
}

/** Maps the app-wide 5-phase cycle to Yoga's 4-phase model.
 *  Delegates to the canonical mapping (single source) — the fertile window
 *  now resolves to ovulation, consistent with Meals & training. */
function mapToYogaPhase(p: CyclePhase | null): Phase {
  return toYogaPhase(p);
}

function fmtLocalDate(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function addDays(d: Date, n: number) {
  const next = new Date(d);
  next.setDate(next.getDate() + n);
  return next;
}
const YOGA_PUSH_SYNC_WINDOW_DAYS = 14;
// JS getDay(): 0=Sun..6=Sat — map to the Mon-first labels used by the schedule grid.
const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// ===================== TTS HOOK =====================

function useSpeaker() {
  const [supported, setSupported] = useState(false);
  useEffect(() => { setSupported(typeof window !== "undefined" && "speechSynthesis" in window); }, []);
  const speak = (text: string, langBcp: string, opts?: { rate?: number; pitch?: number; volume?: number }) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    try {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = langBcp;
      u.rate = opts?.rate ?? 0.92;
      u.pitch = opts?.pitch ?? 1;
      u.volume = opts?.volume ?? 1;
      window.speechSynthesis.speak(u);
    } catch {}
  };
  const stop = () => { try { window.speechSynthesis.cancel(); } catch {} };
  return { supported, speak, stop };
}

function playBell() {
  try {
    const Ctx = (window.AudioContext || (window as any).webkitAudioContext);
    const ctx = new Ctx();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = "sine"; o.frequency.value = 880;
    g.gain.setValueAtTime(0.0001, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.25, ctx.currentTime + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 1.4);
    o.connect(g); g.connect(ctx.destination);
    o.start(); o.stop(ctx.currentTime + 1.5);
  } catch {}
}

/** A soft, short "tick" — the get-ready countdown beep before a recording starts. */
function playTick(freq = 640) {
  try {
    const Ctx = (window.AudioContext || (window as any).webkitAudioContext);
    const ctx = new Ctx();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = "sine"; o.frequency.value = freq;
    g.gain.setValueAtTime(0.0001, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.16, ctx.currentTime + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.18);
    o.connect(g); g.connect(ctx.destination);
    o.start(); o.stop(ctx.currentTime + 0.2);
  } catch {}
}

// ===================== BREATH PACER =====================

type BreathPhase = "inhale" | "hold" | "exhale";
const BREATH_CYCLE: { phase: BreathPhase; dur: number }[] = [
  { phase: "inhale", dur: 4 },
  { phase: "hold",   dur: 2 },
  { phase: "exhale", dur: 6 },
];
const BREATH_TOTAL = BREATH_CYCLE.reduce((s, c) => s + c.dur, 0); // 12s

function playBreathTone(phase: BreathPhase) {
  try {
    const Ctx = (window.AudioContext || (window as any).webkitAudioContext);
    const ctx = new Ctx();
    const g = ctx.createGain();
    g.connect(ctx.destination);
    if (phase === "inhale") {
      const o = ctx.createOscillator();
      o.type = "sine";
      o.frequency.setValueAtTime(396, ctx.currentTime);
      o.frequency.linearRampToValueAtTime(528, ctx.currentTime + 0.8);
      g.gain.setValueAtTime(0.0001, ctx.currentTime);
      g.gain.linearRampToValueAtTime(0.18, ctx.currentTime + 0.15);
      g.gain.linearRampToValueAtTime(0.0001, ctx.currentTime + 1.0);
      o.connect(g); o.start(); o.stop(ctx.currentTime + 1.1);
    } else if (phase === "hold") {
      const o = ctx.createOscillator();
      o.type = "sine"; o.frequency.value = 528;
      g.gain.setValueAtTime(0.0001, ctx.currentTime);
      g.gain.linearRampToValueAtTime(0.14, ctx.currentTime + 0.05);
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.7);
      o.connect(g); o.start(); o.stop(ctx.currentTime + 0.8);
    } else {
      const o = ctx.createOscillator();
      o.type = "sine";
      o.frequency.setValueAtTime(440, ctx.currentTime);
      o.frequency.linearRampToValueAtTime(380, ctx.currentTime + 1.6);
      g.gain.setValueAtTime(0.0001, ctx.currentTime);
      g.gain.linearRampToValueAtTime(0.08, ctx.currentTime + 0.3);
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 1.8);
      o.connect(g); o.start(); o.stop(ctx.currentTime + 1.9);
    }
  } catch {}
}

function useBreathPacer(running: boolean, muted: boolean, poseIdx: number, onPhase?: (p: BreathPhase) => void) {
  const [tick, setTick] = useState(0);
  const [phase, setPhase] = useState<BreathPhase>("inhale");
  const [phaseProgress, setPhaseProgress] = useState(0);

  // Reset to INHALE every time a new pose starts or session resumes.
  // Breath guidance is VISUAL only — no tone, no voice.
  useEffect(() => {
    setTick(0);
    setPhase("inhale");
    setPhaseProgress(0);
    onPhase?.("inhale");
  }, [poseIdx, running]);

  useEffect(() => {
    if (!running) return;
    const interval = setInterval(() => {
      setTick((t) => {
        const next = (t + 1) % BREATH_TOTAL;
        let acc = 0;
        for (const step of BREATH_CYCLE) {
          if (next < acc + step.dur) {
            const posInPhase = next - acc;
            setPhase(step.phase);
            setPhaseProgress(posInPhase / step.dur);
            if (posInPhase === 0) onPhase?.(step.phase);
            break;
          }
          acc += step.dur;
        }
        return next;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [running, muted, poseIdx]);

  return { phase, phaseProgress };
}

const BREATH_LABEL: Record<Lang, Record<BreathPhase, string>> = {
  en: { inhale: "Inhale", hold: "Hold", exhale: "Exhale" },
  fr: { inhale: "Inspirez", hold: "Retenez", exhale: "Expirez" },
  ar: { inhale: "شهيق", hold: "احبسي", exhale: "زفير" },
};

function BreathPacer({ phase, phaseProgress, lang, dim }: {
  phase: BreathPhase; phaseProgress: number; lang: Lang; dim: boolean;
}) {
  const scale = phase === "inhale" ? 0.7 + phaseProgress * 0.3
    : phase === "exhale" ? 1.0 - phaseProgress * 0.3 : 1.0;
  const bgColor = dim ? `rgba(255,255,255,${0.15 + scale * 0.1})` : `oklch(0.92 0.08 350 / ${0.4 + scale * 0.2})`;
  const borderColor = dim ? "rgba(255,255,255,0.45)" : "oklch(0.72 0.22 350 / 0.7)";
  const glow = dim
    ? `0 0 ${10 + scale * 14}px rgba(255,255,255,${0.1 + scale * 0.15})`
    : `0 0 ${10 + scale * 14}px oklch(0.72 0.25 350 / ${0.2 + scale * 0.35})`;

  return (
    <div className="flex flex-col items-center gap-1">
      <div
        className="grid place-items-center rounded-full border-2"
        style={{
          width: 64, height: 64,
          transform: `scale(${scale})`,
          transition: "transform 1s ease-in-out, box-shadow 1s ease-in-out",
          background: bgColor,
          borderColor,
          boxShadow: glow,
        }}
      >
        <span className={["text-[9px] font-bold uppercase tracking-widest text-center leading-tight px-1",
          dim ? "text-white/90" : "text-hotpink"].join(" ")}>
          {BREATH_LABEL[lang][phase]}
        </span>
      </div>
    </div>
  );
}

// ===================== PAGE =====================

type View =
  | { kind: "home" }
  | { kind: "library" }
  | { kind: "flows" }
  | { kind: "plan" }
  | { kind: "setup"; preset?: { intention: Intention; durationMin: number } }
  | { kind: "session"; flow: Pose[]; lang: Lang; mode: Mode; intention: Intention; hold: number; durationMin: number; sound: string; title?: string; record?: boolean; silentGuide?: boolean }
  | { kind: "summary"; flow: Pose[]; intention: Intention; durationMin: number; title?: string; moodBefore?: string; moodAfter?: string };

export default function YogaPage() {
  const [onboarded, setOnboarded] = useState(false);
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [view, setView] = useState<View>({ kind: "plan" });
  // Guided-setup focus mode: strip the tool to a narrow hero + her week + one
  // "Finish on Today" action; no tabs/programs to wander into.
  const guided = useGuided();
  const cyclePhaseNow = readCyclePhase();
  const guidedPhaseLabel = cyclePhaseNow && cyclePhaseNow !== "any" ? PHASE_LABEL[cyclePhaseNow] : undefined;

  // Guided setup: any schedule commit dispatches "bloom:yoga-updated"; the first
  // time a plan exists while she's in the guided flow, celebrate and hand back.
  const [guidedDone, setGuidedDone] = useState(false);
  const guidedShownRef = useRef(false);
  useEffect(() => {
    const onUpdate = () => {
      if (guidedShownRef.current) return;
      if (isGuided() && readYogaPlanDays().length > 0) { guidedShownRef.current = true; setGuidedDone(true); }
    };
    window.addEventListener("bloom:yoga-updated", onUpdate);
    return () => window.removeEventListener("bloom:yoga-updated", onUpdate);
  }, []);
  // While guided, keep her on her week — never the home/library/programs browser.
  useEffect(() => {
    if (guided && (view.kind === "home" || view.kind === "library")) setView({ kind: "plan" });
  }, [guided, view.kind]);
  // Guided sparkle tour — auto on first visit, replayable via the hero Guide chip.
  const [tourDone, setTourDone] = useState(false);
  const [showTour, setShowTour] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const goTourTab = (t: YogaTourTab) => setView({ kind: t === "discover" ? "home" : t === "library" ? "library" : "plan" });

  useEffect(() => {
    try {
      setOnboarded(localStorage.getItem(ONBOARD_KEY) === "1");
      setTourDone(localStorage.getItem(YOGA_TOUR_KEY) === "1");
      const s = Number(localStorage.getItem(STEP_KEY) || "1");
      if ([1,2,3].includes(s)) setStep(s as 1|2|3);
    } catch {}
    setHydrated(true);
    // Guided hand-off from the workout step (?setup=1): land her on her (empty)
    // plan to CHOOSE — sync to her cycle, pick a curated plan, or build her own.
    // We never auto-pick for her; the celebration appears only once she commits a
    // plan, which is what makes her movement step complete.
    let setupDeepLink = false;
    try {
      if (new URLSearchParams(window.location.search).get("setup") === "1") {
        setupDeepLink = true;
        setOnboarded(true);
        setView({ kind: "plan" });
      }
    } catch {}
    // Deep-link from Today / Cycle: build the prescribed flow and drop straight
    // into the session player — not the setup screen — so a planned flow starts
    // with one tap. Uses the user's saved level + current phase; sensible
    // defaults for the rest.
    const launch = setupDeepLink ? null : readLaunch<{ intention: string; durationMin: number }>(LAUNCH_YOGA_KEY);
    if (launch) {
      const intention = launch.intention as Intention;
      const durationMin = launch.durationMin;
      const level = readYogaProfileLevel();
      const phase = mapToYogaPhase(readCyclePhase());
      const mode: Mode = "visual";
      const lang: Lang = "en";
      const flow = buildFlow({ intention, level, durationMin, phase, mode });
      setView({ kind: "session", flow, lang, mode, intention, hold: holdSecondsFor(durationMin, level), durationMin, sound: DEFAULT_SOUND });
    }
  }, []);

  const advanceStep = (next: 1|2|3) => {
    setStep(next);
    try { localStorage.setItem(STEP_KEY, String(next)); } catch {}
  };

  const beginNow = () => {
    try { localStorage.setItem(ONBOARD_KEY, "1"); } catch {}
    setOnboarded(true);
    setView({ kind: "library" });
    advanceStep(1);
  };

  const finishTour = () => {
    try { localStorage.setItem(YOGA_TOUR_KEY, "1"); } catch {}
    setTourDone(true);
    setShowTour(false);
  };
  const isTabbed = view.kind === "plan" || view.kind === "home" || view.kind === "library" || view.kind === "flows";
  const tourVisible = showTour || (hydrated && !tourDone && isTabbed);

  return (
    <div className="relative animate-fade-in">
      <BloomBubbles count={10} />

      {guidedDone && !guided && (
        <SpotlightCoach
          targetId="yoga-week-plan"
          step={4} total={5}
          title="Your yoga week ✿"
          message="Your soft week, day by day. Tap any day to change its flow."
          extra={
            <p className="mt-3 text-[11.5px] font-semibold leading-snug text-rose/75">
              Ready to head back and finish setting up the rest of your day on <b className="text-hotpink">Today</b>?
            </p>
          }
          primaryLabel="Finish on Today →"
          onPrimary={() => { window.location.href = "/app/today"; }}
          secondaryLabel="Stay & tweak my plan"
          onClose={() => setGuidedDone(false)}
        />
      )}

      {tourVisible && !isGuided() && <YogaOnboarding onTab={goTourTab} onDone={finishTour} />}

      {/* Redundant on phones (the bottom nav has "Tools"), and it left an empty
          band above the hero — show it only from tablet up. */}
      <a href="/app/tools" className="mb-3 hidden md:inline-flex items-center gap-1 text-sm text-rose hover:text-hotpink">
        <ArrowLeft className="h-4 w-4" /> All tools
      </a>

      {guided && (view.kind === "home" || view.kind === "library" || view.kind === "plan") && (
        <>
          <GuidedFocusHero label="Yoga" phaseLabel={guidedPhaseLabel} image="/images/yoga-hero.webp" />
          <GuidedFinishBar toolLabel="Yoga" phaseLabel={guidedPhaseLabel} hint="Your soft week is set — tap any day to tweak its flow." className="mb-3" />
        </>
      )}

      {!guided && (view.kind === "home" || view.kind === "library" || view.kind === "flows" || view.kind === "plan") && (
        <YogaHero
          active={view.kind}
          onDiscover={() => setView({ kind: "home" })}
          onLibrary={() => { setView({ kind: "library" }); advanceStep(Math.max(step, 1) as 1|2|3); }}
          onFlows={() => setView({ kind: "flows" })}
          onMyPlan={() => setView({ kind: "plan" })}
          onTryFlow={() => setView({ kind: "setup" })}
          onGuide={() => setShowTour(true)}
        />
      )}

      {view.kind === "flows" && (
        <div className="space-y-6 yoga-fade">
          {/* Titled, ready-made flows (searchable) */}
          <FlowLibrary
            onStart={(f, record) => {
              if (!isPremium() && f.level !== "Beginner") { openPaywall("yoga"); return; }
              setView({ kind: "session", flow: buildNamedFlow(f.poses), lang: "en", mode: "visual",
                intention: f.intention, hold: holdSecondsFor(f.durationMin, f.level), durationMin: f.durationMin,
                sound: DEFAULT_SOUND, title: f.title, record,
                // Experiment: film Period Cramps music-only (no voice), short holds,
                // the on-screen ring/pose-name/up-next as the sole guide. If it
                // performs, drop the slug check to generalize to every REC.
                silentGuide: !!record && f.slug === "period-cramps" });
            }}
          />
          {/* Flow sessions — find your moment (quick presets → customize) */}
          <FlowSessionsSection onStart={(intention, durationMin) => { if (!isPremium()) { openPaywall("yoga"); return; } setView({ kind: "setup", preset: { intention, durationMin } }); }} />
          {/* Curated plans — a week, set for you */}
          <CuratedPlans onApply={(p) => {
            try { localStorage.setItem(SCHEDULE_KEY, JSON.stringify({ ...p.focus })); window.dispatchEvent(new Event("bloom:yoga-updated")); } catch {}
            setView({ kind: "plan" });
          }} />
        </div>
      )}

      {view.kind === "home" && (
        <YogaHome
          onboarded={onboarded}
          step={step}
          onBegin={beginNow}
          onLibrary={() => { setView({ kind: "library" }); advanceStep(Math.max(step, 1) as 1|2|3); }}
          onSetup={(preset) => setView({ kind: "setup", preset })}
          onStepGoTo={(s) => advanceStep(s)}
        />
      )}

      {view.kind === "library" && <Library onTryFlow={() => setView({ kind: "setup" })} />}

      {view.kind === "plan" && (
        <PlanPage
          onSetup={(preset) => setView({ kind: "setup", preset })}
          onQuickStart={(intention, durationMin) => {
            // Free plan: tapping a flow in the plan goes STRAIGHT to the player —
            // don't re-show the (locked) setup screen.
            const cfg = { intention, durationMin, level: "Beginner" as Level, lang: "en" as Lang, sound: DEFAULT_SOUND, mode: "visual" as Mode, phase: mapToYogaPhase(readCyclePhase()) };
            const flow = buildFlow(cfg);
            setView({ kind: "session", flow, lang: cfg.lang, mode: cfg.mode, intention: cfg.intention, hold: holdSecondsFor(cfg.durationMin, cfg.level), durationMin: cfg.durationMin, sound: cfg.sound });
          }}
        />
      )}

      {view.kind === "setup" && (
        <Setup
          preset={view.preset}
          onBack={() => setView({ kind: "home" })}
          onStart={(cfg) => {
            // Free plan can build & do only Beginner flows (the free "build my own
            // week" path); every other level is Bloom+.
            if (!isPremium() && cfg.level !== "Beginner") { openPaywall("yoga"); return; }
            const flow = buildFlow(cfg);
            setView({ kind: "session", flow, lang: cfg.lang, mode: cfg.mode, intention: cfg.intention, hold: holdSecondsFor(cfg.durationMin, cfg.level), durationMin: cfg.durationMin, sound: cfg.sound });
          }}
        />
      )}

      {view.kind === "session" && (
        <SessionWithIntro
          flow={view.flow}
          lang={view.lang}
          mode={view.mode}
          hold={view.hold}
          sound={view.sound}
          intention={view.intention}
          durationMin={view.durationMin}
          title={view.title}
          record={view.record}
          silentGuide={view.silentGuide}
          onExit={() => setView({ kind: view.title ? "flows" : "home" })}
          onDone={() => setView({ kind: "summary", flow: view.flow, intention: view.intention, durationMin: view.durationMin, title: view.title })}
        />
      )}

      {view.kind === "summary" && (
        <Summary
          flow={view.flow}
          intention={view.intention}
          durationMin={view.durationMin}
          onHome={() => setView({ kind: "home" })}
          onAgain={() => setView({ kind: "setup" })}
        />
      )}

      <style>{`
        @keyframes yoga-fade { from { opacity: 0; transform: translateY(10px);} to { opacity: 1; transform: translateY(0);} }
        .yoga-fade { animation: yoga-fade 0.5s cubic-bezier(0.2, 0.8, 0.2, 1) both; }
        @keyframes breath-pace {
          0%   { transform: scale(0.7); box-shadow: 0 0 0 0 oklch(0.75 0.22 350 / 0.45); }
          50%  { transform: scale(1.18); box-shadow: 0 0 0 30px oklch(0.75 0.22 350 / 0); }
          100% { transform: scale(0.7); box-shadow: 0 0 0 0 oklch(0.75 0.22 350 / 0.45); }
        }
        .breath-pacer { animation: breath-pace 8s ease-in-out infinite; }
      `}</style>
    </div>
  );
}

// ===================== HERO (shared, stays visible across tabs) =====================

const HERO_CONTENT: Record<"home" | "library" | "flows" | "plan", { title: string; subtitle: string }> = {
  home: { title: "Yoga Flows", subtitle: "guided breath, gentle movement — your softest practice." },
  library: { title: "Learn the poses", subtitle: "Tap any pose to read how to enter it and find your breath." },
  flows: { title: "Flow Library", subtitle: "ready-made flows for every need — pick a title and press play." },
  plan: { title: "Your soft week", subtitle: "your personalized plan, gently synced to your cycle." },
};

const YOGA_PHASE_META: Record<Phase, { emoji: string; label: string }> = {
  menstrual: { emoji: "🌙", label: "Menstrual" },
  follicular: { emoji: "🌱", label: "Follicular" },
  ovulation: { emoji: "🌸", label: "Ovulatory" },
  luteal: { emoji: "🍂", label: "Luteal" },
};

/** Hero pill: names the cycle phase and shows whether the yoga week matches the
 *  phase-recommended plan; tapping syncs the week to the phase (or opens cycle
 *  setup if the cycle isn't tracked yet). Self-contained — reads/writes the same
 *  bloom:yoga-schedule the My Plan tab uses. */
function YogaPhaseSyncPill({ variant = "pill" }: { variant?: "pill" | "tile" }) {
  const [, force] = useState(0);
  useEffect(() => {
    const r = () => force((t) => t + 1);
    window.addEventListener("storage", r);
    window.addEventListener("bloom:yoga-updated", r);
    return () => { window.removeEventListener("storage", r); window.removeEventListener("bloom:yoga-updated", r); };
  }, []);
  const known = hasCycleSettings();
  const phase = mapToYogaPhase(readCyclePhase());
  const meta = YOGA_PHASE_META[phase];
  const WEEK = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const rec = PHASE_DEFAULT_PLAN[phase];
  let schedule: Record<string, string | null> = {};
  try { schedule = JSON.parse(localStorage.getItem(SCHEDULE_KEY) || "{}"); } catch { schedule = {}; }
  const synced = known && WEEK.every((d, i) => (schedule[d] ?? null) === rec[i]);
  const onSync = () => {
    if (!isPremium()) { openPaywall("yoga"); return; } // cycle-sync is Bloom+
    if (!known) { window.location.href = "/app/calendar"; return; }
    const next: Record<string, string | null> = {};
    WEEK.forEach((d, i) => { next[d] = rec[i]; });
    try {
      localStorage.setItem(SCHEDULE_KEY, JSON.stringify(next));
      window.dispatchEvent(new Event("storage"));
      window.dispatchEvent(new Event("bloom:yoga-updated"));
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

/** One flow card — Curated-plans shape: a tall image strip on the left (so the
 *  whole pose fits, sides cropped not head/legs) + content on the right, with the
 *  Coach's note tucked into a collapsible toggle so cards stay compact. */
function FlowCard({ f, index, onStart, isOwner }: { f: NamedFlow; index: number; onStart: (f: NamedFlow, record?: boolean) => void; isOwner?: boolean }) {
  const [open, setOpen] = useState(false);
  const thumb = POSE_BY_SLUG[f.thumb ?? f.poses[Math.floor(f.poses.length / 2)]]?.image;
  const plusLocked = f.level !== "Beginner" && !isPremium();
  return (
    <div
      style={{ animationDelay: `${index * 40}ms` }}
      className="group flex flex-col overflow-hidden rounded-3xl border border-petal/60 bg-white/95 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg hover:shadow-hotpink/15 animate-scale-in"
    >
      <div className="flex items-stretch">
        {/* Tall image strip (left) — whole pose fits; cover crops the sides. */}
        <button onClick={() => onStart(f)} aria-label={`Start ${f.title}`} className="relative w-24 sm:w-28 shrink-0 self-stretch overflow-hidden bg-blush">
          {thumb && <img src={thumb} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover object-center transition-transform duration-500 group-hover:scale-105" />}
          <div className="absolute inset-0 bg-gradient-to-r from-black/5 to-black/25" />
          {plusLocked && <span className="absolute left-1.5 top-1.5 inline-flex items-center gap-1 rounded-full bg-white/90 px-1.5 py-0.5 text-[8px] font-black uppercase tracking-wide text-hotpink shadow-sm"><Lock className="h-2.5 w-2.5" strokeWidth={2.6} /> Plus</span>}
        </button>
        {/* Content (right). */}
        <div className="flex-1 min-w-0 p-3 flex flex-col">
          <div className="flex flex-wrap items-center gap-1.5 text-[9.5px] font-bold uppercase tracking-wide text-rose/55">
            <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" />{f.durationMin} min</span>
            <span>·</span><span>{f.level}</span>
            {f.phase && <span className="text-hotpink">{YOGA_PHASE_META[f.phase].emoji} {YOGA_PHASE_META[f.phase].label}</span>}
          </div>
          <button onClick={() => onStart(f)} className="text-left">
            <h3 className="mt-0.5 font-script text-xl text-hotpink leading-tight line-clamp-2 group-hover:text-rose transition-colors">{f.title}</h3>
          </button>
          <p className="mt-0.5 text-[11px] text-rose/65 leading-snug line-clamp-1">{f.blurb}</p>
          <div className="mt-auto pt-2 flex items-center justify-between gap-2">
            {f.advice ? (
              <button onClick={() => setOpen((o) => !o)} aria-expanded={open}
                className="inline-flex items-center gap-1 rounded-full bg-blush/60 border border-petal/50 px-2 py-1 text-[10px] font-bold text-hotpink active:scale-95 transition">
                <Sparkle className="h-3 w-3" /> Coach's note <ChevronDown className={["h-3 w-3 transition-transform", open ? "rotate-180" : ""].join(" ")} strokeWidth={2.4} />
              </button>
            ) : <span />}
            <div className="flex shrink-0 items-center gap-1.5">
              {isOwner && (
                <button onClick={() => onStart(f, true)}
                  title="Record: start this flow straight into presentation mode, playing"
                  className="inline-flex items-center gap-1 rounded-full bg-red-600 text-white px-2.5 h-9 text-[10px] font-black tracking-wide shadow-md shadow-red-600/40 active:scale-90 transition">
                  <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" /> REC
                </button>
              )}
              <button onClick={() => onStart(f)} aria-label={`Start ${f.title}`}
                className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-hotpink text-white shadow-md shadow-hotpink/30 active:scale-90 transition">
                <Play className="h-4 w-4 ml-0.5" fill="currentColor" strokeWidth={0} />
              </button>
            </div>
          </div>
        </div>
      </div>
      {/* Collapsible Coach's note. */}
      {open && f.advice && (
        <div className="px-3 pb-3 animate-fade-in">
          <div className="flex items-start gap-1.5 rounded-2xl bg-blush/40 border border-petal/50 px-2.5 py-2">
            <Sparkle className="h-3.5 w-3.5 shrink-0 mt-0.5 text-hotpink" />
            <p className="text-[11px] leading-snug text-rose/75">{f.advice}</p>
          </div>
        </div>
      )}
    </div>
  );
}

/** Searchable grid of titled, ready-made flows (YOGA_FLOWS). Each card launches a
 *  fixed curated sequence — the same one every time, so it doubles as YouTube content. */
function FlowLibrary({ onStart }: { onStart: (f: NamedFlow, record?: boolean) => void }) {
  const { user } = useAuth();
  const isOwner = user?.email === "khfuma@gmail.com"; // private one-tap record launcher
  const [q, setQ] = useState("");
  const terms = q.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const list = YOGA_FLOWS.filter((f) => {
    if (!terms.length) return true;
    const hay = `${f.title} ${f.blurb} ${f.tags.join(" ")} ${f.level}`.toLowerCase();
    return terms.every((t) => hay.includes(t));
  });
  return (
    <div className="yoga-fade mt-3">
      <div className="mb-3">
        <p className="text-[10px] font-bold uppercase tracking-wider text-rose/60">Flow library</p>
        <h2 className="font-script text-2xl sm:text-3xl text-hotpink leading-none">press play, we'll guide you</h2>
        <p className="mt-1 text-[11px] sm:text-xs text-rose/65">Ready-made flows for every need — search a title and start.</p>
      </div>
      <div className="relative mb-4 max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-rose/40" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search flows — period, sleep, back, energy…"
          className="w-full rounded-full border border-petal/60 bg-white/90 pl-9 pr-4 py-2.5 text-sm text-rose placeholder:text-rose/40 outline-none focus:border-hotpink/50 focus:ring-2 focus:ring-hotpink/20"
        />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 items-start">
        {list.map((f, i) => <FlowCard key={f.slug} f={f} index={i} onStart={onStart} isOwner={isOwner} />)}
      </div>
      {!list.length && <p className="text-center text-sm text-rose/50 py-8">No flow matches “{q}” — try “period”, “sleep”, “back”…</p>}
    </div>
  );
}

function YogaHero({
  active, onDiscover, onLibrary, onFlows, onMyPlan, onTryFlow, onGuide, onReset,
}: {
  active: "home" | "library" | "flows" | "plan";
  onDiscover: () => void;
  onLibrary: () => void;
  onFlows: () => void;
  onMyPlan: () => void;
  onTryFlow: () => void;
  onGuide?: () => void;
  onReset?: () => void;
}) {
  const tabClass = (isActive: boolean) =>
    [
      "rounded-full px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-bold transition",
      isActive ? "bg-hotpink text-white shadow-md shadow-hotpink/30" : "text-rose hover:text-hotpink",
    ].join(" ");

  const { title, subtitle } = HERO_CONTENT[active];

  return (
    <div className="relative isolate min-h-[118px] sm:min-h-[168px] -mt-1 sm:-mt-5 lg:-mt-6 mb-2 animate-card-pop-in">
      {/* base pink wash */}
      <div aria-hidden className="pointer-events-none absolute left-1/2 -translate-x-1/2 w-screen -top-8 -z-20 h-[500px] bg-gradient-to-b from-[#FFD3E8] via-[#FFE4F1] to-transparent" />
      {/* photo — dissolves toward the bottom into the page */}
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 -translate-x-1/2 w-screen -top-8 -z-10 h-[320px] overflow-hidden"
        style={{ WebkitMaskImage: "linear-gradient(to bottom, #000 0%, #000 30%, transparent 84%)", maskImage: "linear-gradient(to bottom, #000 0%, #000 30%, transparent 84%)" }}
      >
        <img src="/images/yoga-hero.webp" alt="" className="animate-hero-breathe h-full w-full object-cover object-[70%_24%]" referrerPolicy="no-referrer" />
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
        <div key={active} className="animate-scale-in">
          <div className="max-w-[66%]">
            <p className="mb-1 inline-flex w-fit items-center gap-1 rounded-full bg-white/75 backdrop-blur border border-petal/60 px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.15em] text-hotpink">
              <Flower className="h-2.5 w-2.5" strokeWidth={2.5} /> Yoga
            </p>
            <h1 className="font-script text-3xl sm:text-5xl lg:text-6xl text-hotpink leading-none drop-shadow-[0_2px_6px_oklch(1_0_0/0.55)]">{title}</h1>
            <p className="mt-0.5 font-script text-lg sm:text-2xl leading-tight text-rose/90">{subtitle}</p>
          </div>
          <CyclePhasePill className="mt-1.5" />
        </div>
        <div className="flex">
          <div className="inline-flex rounded-full bg-white/70 backdrop-blur border border-petal/60 p-0.5 sm:p-1 shadow-sm shadow-hotpink/10">
            <button data-tour="yg-tab-plan" onClick={onMyPlan} className={tabClass(active === "plan")}>My Plan</button>
            <button data-tour="yg-tab-flows" onClick={onFlows} className={tabClass(active === "flows")}>Flows</button>
            <button data-tour="yg-tab-discover" onClick={onDiscover} className={tabClass(active === "home")}>Discover</button>
            <button data-tour="yg-tab-library" onClick={() => { if (!isPremium()) { openPaywall("yoga"); return; } onLibrary(); }} className={tabClass(active === "library")}>Library{!isPremium() && <Lock className="inline h-3 w-3 ml-1 -mt-0.5 text-[#B76E79]" strokeWidth={2.4} />}</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ===================== HOME =====================

function useYogaPhaseAndStreak() {
  const [streak, setStreak] = useState<Streak>({ count: 0, lastISO: null });
  const [phase, setPhase] = useState<Phase | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STREAK_KEY);
      if (raw) setStreak(JSON.parse(raw));
    } catch {}
    setPhase(mapToYogaPhase(readCyclePhase()));
  }, []);

  const phaseSuggestion = useMemo(() => {
    const p: Phase = phase ?? "follicular";
    const labels: Record<Phase, string> = {
      menstrual: "Gentle restorative — hip openers, no inversions.",
      follicular: "Energizing — sun salutations, warrior flow.",
      ovulation: "Powerful — balance & strength.",
      luteal: "Slow & grounding — forward folds.",
    };
    return { phase: p, label: labels[p] };
  }, [phase]);

  return { streak, phaseSuggestion };
}

function YogaHome({
  onboarded, step, onBegin, onLibrary, onSetup, onStepGoTo,
}: {
  onboarded: boolean; step: 1|2|3;
  onBegin: () => void; onLibrary: () => void;
  onSetup: (preset?: { intention: Intention; durationMin: number }) => void;
  onStepGoTo: (s: 1|2|3) => void;
}) {
  return (
    <div className="space-y-2 yoga-fade">
      {/* WELCOME / THREE SOFT STEPS — its own clean card, below the hero */}
      <section className="animate-scale-in rounded-3xl bg-white/85 backdrop-blur border border-petal/60 p-3">
        {!onboarded ? (
          <div className="animate-scale-in rounded-2xl bg-blush/60 p-4 border border-petal/50">
            <p className="text-sm font-semibold text-rose">New here? Welcome.</p>
            <p className="mt-1 text-xs text-rose/80">We'll guide you in 3 calm steps: learn the poses → flow with visuals → close your eyes for an audio practice.</p>
            <button
              onClick={onBegin}
              className="bloom-luxury-btn hover-scale animate-cta-bounce mt-4 inline-flex items-center gap-2 px-5 py-3 text-sm font-bold text-white"
            >
              <Sparkles className="h-4 w-4 animate-bloom-sparkle" /> Start Here
            </button>
          </div>
        ) : null}

        <div className="mt-4 flex items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-rose/60">Your path</p>
            <h2 className="font-script text-xl sm:text-2xl leading-none text-hotpink">three soft steps</h2>
          </div>
          <span className="text-xs text-rose/70">Step {step} of 3</span>
        </div>

        <div className="mt-2 grid grid-cols-3 gap-1.5">
          <StepCard index={0} active={step === 1} done={step > 1} icon={BookOpen}
            title="Learn the poses" cta="Open library" onClick={() => { onLibrary(); onStepGoTo(2); }} />
          <StepCard index={1} active={step === 2} done={step > 2} icon={GraduationCap}
            title="Try a guided flow" cta="Start short flow" onClick={() => { onSetup(); }} />
          <StepCard index={2} active={step === 3} done={false} icon={Headphones}
            title="Eyes-closed audio" cta="Audio session" onClick={() => { onSetup(); }} />
        </div>
      </section>

      {/* Curated plans & Flow sessions now live on the Flows tab (see FlowLibrary). */}
    </div>
  );
}

// ===================== MY PLAN =====================

function PlanPage({ onSetup, onQuickStart }: {
  onSetup: (preset?: { intention: Intention; durationMin: number }) => void;
  onQuickStart: (intention: Intention, durationMin: number) => void;
}) {
  const { streak, phaseSuggestion } = useYogaPhaseAndStreak();
  // Free users go straight to the player from a plan flow; premium keeps the setup.
  const startFlow = (intention: Intention, durationMin: number) =>
    isPremium() ? onSetup({ intention, durationMin }) : onQuickStart(intention, durationMin);

  return (
    <div className="space-y-4 yoga-fade">
      {/* TODAY HERO + WEEK (day by day, tappable to start) */}
      <Organizer phase={phaseSuggestion.phase} onStart={startFlow} />

      {/* SAFETY */}
      <p className="animate-scale-in text-[11px] sm:text-xs text-rose/70 italic px-1 inline-flex items-start gap-1.5" style={{ animationDelay: "640ms" }}>
        <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" />
        Listen to your body, ease off if anything hurts, and check with your doctor if pregnant or injured.
      </p>
    </div>
  );
}

function StepCard({
  index, active, done, icon: Icon, title, cta, onClick,
}: { index: number; active: boolean; done: boolean; icon: typeof Sun; title: string; cta: string; onClick: () => void; }) {
  const [showTip, setShowTip] = useState(false);
  const tipTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const openTip  = () => { if (tipTimeout.current) clearTimeout(tipTimeout.current); setShowTip(true); };
  const closeTip = (delay = 0) => {
    tipTimeout.current = setTimeout(() => setShowTip(false), delay);
  };

  return (
    <div className="relative">
      <button
        onClick={onClick}
        onMouseEnter={openTip}
        onMouseLeave={() => closeTip(120)}
        onTouchStart={openTip}
        onTouchEnd={() => closeTip(1600)}
        style={{ animationDelay: `${index * 80}ms` }}
        className={[
          "hover-scale animate-scale-in w-full flex flex-col items-center gap-1.5 rounded-2xl border px-2 py-2.5 text-center transition active:scale-95",
          active ? "bg-blush/70 border-hotpink/40 shadow-md shadow-hotpink/15"
                 : done ? "bg-white/70 border-petal/50 opacity-70"
                        : "bg-white/70 border-petal/50",
        ].join(" ")}
      >
        <span
          className={["grid h-8 w-8 shrink-0 place-items-center rounded-full",
            active ? "bg-hotpink text-white" : done ? "bg-petal text-rose" : "bg-white text-rose border border-petal"].join(" ")}
          style={active ? { animation: "bloom-pulse 2.4s ease-in-out infinite", animationPlayState: showTip ? "paused" : "running" } : undefined}
        >
          {done ? <span className="text-sm font-bold">✓</span> : <Icon className="h-3.5 w-3.5" strokeWidth={1.8} />}
        </span>
        <p className="text-[9px] font-bold text-rose leading-tight line-clamp-2 w-full">{title}</p>
      </button>

      {showTip && (
        <div
          className="pointer-events-none absolute bottom-[calc(100%+7px)] left-1/2 z-30 -translate-x-1/2 animate-fade-in"
          aria-hidden
        >
          <div className="min-w-[110px] max-w-[160px] rounded-xl border border-pink-100 bg-white/98 px-3 py-2 text-center shadow-xl backdrop-blur-md">
            <p className="text-[11px] font-bold leading-tight text-rose">{title}</p>
            <p className="mt-1 inline-flex items-center gap-0.5 text-[10px] font-semibold text-hotpink">
              {cta} <ChevronRight className="h-3 w-3" />
            </p>
          </div>
          <div className="absolute left-1/2 top-full h-0 w-0 -translate-x-1/2 border-x-[5px] border-t-[6px] border-x-transparent border-t-white" />
        </div>
      )}
    </div>
  );
}

// ===================== FLOW SESSIONS (grid presentation) =====================

function SessionCard({ preset, index, onClick }: { preset: SessionPreset; index: number; onClick: () => void }) {
  // Same Curated-plans / FlowCard shape: a tall image strip on the left + content
  // on the right, so the whole page reads as one harmonious set of cards.
  return (
    <button
      onClick={onClick}
      style={{ animationDelay: `${index * 60}ms` }}
      className="group flex items-stretch overflow-hidden rounded-3xl border border-petal/60 bg-white/95 shadow-sm text-left transition hover:-translate-y-0.5 hover:shadow-lg hover:shadow-hotpink/15 active:scale-[0.99] animate-scale-in"
    >
      <div className="relative w-24 sm:w-28 shrink-0 self-stretch overflow-hidden bg-blush">
        <img src={preset.image} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover object-center transition-transform duration-500 group-hover:scale-105" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/5 to-black/25" />
      </div>
      <div className="flex-1 min-w-0 p-3 flex flex-col">
        <p className="inline-flex items-center gap-1 text-[9.5px] font-bold uppercase tracking-wide text-rose/55"><Clock className="h-3 w-3" />{preset.duration} min</p>
        <h3 className="mt-0.5 font-script text-xl text-hotpink leading-tight line-clamp-2 group-hover:text-rose transition-colors">{preset.label}</h3>
        <span className="mt-auto pt-2 inline-flex items-center gap-1 self-start rounded-full bg-blush/60 border border-petal/50 px-2.5 py-1 text-[10px] font-bold text-hotpink">
          Start <Play className="h-3 w-3" fill="currentColor" strokeWidth={0} />
        </span>
      </div>
    </button>
  );
}

function FlowSessionsSection({ onStart }: { onStart: (intention: Intention, durationMin: number) => void }) {
  const [tab, setTab] = useState<"moment" | "intention">("moment");
  const sessions = tab === "moment" ? MOMENT_SESSIONS : INTENTION_SESSIONS;

  return (
    <section className="animate-scale-in rounded-3xl bg-white/85 backdrop-blur border border-petal/60 p-4 sm:p-6" style={{ animationDelay: "160ms" }}>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-rose/60">Flow sessions</p>
          <h2 className="font-script text-2xl sm:text-3xl text-hotpink leading-none">find your moment</h2>
        </div>
        <div className="inline-flex rounded-full bg-blush/60 border border-petal/60 p-1">
          {(["moment", "intention"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={[
                "rounded-full px-3 sm:px-4 py-1.5 text-xs font-bold transition",
                tab === t ? "bg-hotpink text-white shadow-md shadow-hotpink/30" : "text-rose",
              ].join(" ")}
            >
              {t === "moment" ? "By moment" : "By intention"}
            </button>
          ))}
        </div>
      </div>

      <div key={tab} className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 items-start">
        {sessions.map((s, i) => (
          <SessionCard key={s.label} preset={s} index={i} onClick={() => onStart(s.intention, s.duration)} />
        ))}
      </div>
    </section>
  );
}

// ===================== CURATED PLANS (yoga programs) =====================

function CuratedPlans({ onApply }: { onApply: (p: YogaProgram) => void }) {
  const [confirm, setConfirm] = useState<YogaProgram | null>(null);
  const guided = useGuided();
  return (
    <section className="animate-scale-in rounded-3xl bg-white/85 backdrop-blur border border-petal/60 p-4 sm:p-6" style={{ animationDelay: "220ms" }}>
      <div className="mb-3">
        <p className="text-[10px] font-bold uppercase tracking-wider text-rose/60">Curated plans</p>
        <h2 className="font-script text-2xl sm:text-3xl text-hotpink leading-none">a week, set for you</h2>
        <p className="mt-1 text-[11px] sm:text-xs text-rose/65">Pick a themed week — we'll lay it across your days, ready to start.</p>
      </div>
      <div className="space-y-3">
        {YOGA_PROGRAMS.map((p, i) => {
          const dayCount = Object.values(p.focus).filter(Boolean).length;
          return (
            <button
              key={p.id}
              onClick={() => { if (guided) return guidedNudge(); if (!isPremium()) { openPaywall("yoga"); return; } setConfirm(p); }}
              className="group w-full text-left flex items-stretch overflow-hidden rounded-3xl border border-petal/60 bg-white/90 shadow-sm hover:shadow-xl hover:-translate-y-0.5 transition animate-scale-in"
              style={{ animationDelay: `${i * 70}ms` }}
            >
              <div className="relative w-28 sm:w-36 shrink-0 overflow-hidden">
                <img src={p.image} alt="" className="absolute inset-0 h-full w-full object-cover object-center bg-[oklch(0.96_0.04_350)] transition-transform duration-500 group-hover:scale-105" loading="lazy" />
                <div className="absolute inset-0 bg-gradient-to-r from-black/10 to-black/35" />
                <span className="absolute top-2 left-2 z-10 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white shadow-sm" style={{ background: "linear-gradient(135deg,#B76E79,#EC4899)" }}><Lock className="h-2.5 w-2.5" strokeWidth={2.6} /> Bloom+</span>
              </div>
              <div className="flex-1 min-w-0 p-3 sm:p-3.5 flex flex-col">
                <span className="self-start rounded-full bg-blush/70 text-hotpink text-[9px] font-bold uppercase tracking-wide px-2 py-0.5">{dayCount} days / week</span>
                <h3 className="mt-1 font-script text-2xl text-hotpink leading-none">{p.title}</h3>
                <p className="mt-1 text-[11px] text-rose/75 leading-snug line-clamp-2">{p.tagline}</p>
                <span className="mt-auto pt-2 inline-flex items-center gap-1 text-[11px] font-bold text-hotpink">Set as my week <ChevronRight className="h-3.5 w-3.5" /></span>
              </div>
            </button>
          );
        })}
      </div>

      {confirm && createPortal(
        <div className="fixed inset-0 z-[80] bg-black/40 backdrop-blur-sm grid place-items-center overflow-y-auto p-4 animate-fade-in" onClick={() => setConfirm(null)}>
          <div className="w-full max-w-xs my-auto rounded-3xl bg-white/97 border border-petal/60 shadow-2xl overflow-hidden animate-scale-in" onClick={(e) => e.stopPropagation()}>
            <img src={confirm.image} alt="" className="h-28 w-full object-cover object-top" />
            <div className="p-5 text-center">
              <p className="font-script text-2xl text-hotpink leading-none mb-1">{confirm.title}</p>
              <p className="text-xs text-rose/75 mb-2">{confirm.tagline}</p>
              <ul className="text-left space-y-1 mb-3">
                {confirm.promise.map((b) => (
                  <li key={b} className="flex items-start gap-1.5 text-[11px] text-rose/80"><Sparkles className="h-3 w-3 text-hotpink shrink-0 mt-0.5" /> {b}</li>
                ))}
              </ul>
              <p className="text-[11px] text-rose/60 mb-4">This replaces your current weekly plan.</p>
              <div className="flex gap-2">
                <button onClick={() => setConfirm(null)} className="flex-1 rounded-full bg-white/90 border border-petal/60 py-2.5 text-sm font-semibold text-rose">Cancel</button>
                <button onClick={() => { onApply(confirm); setConfirm(null); }} className="flex-1 bloom-luxury-btn py-2.5 text-sm font-bold text-white">Set as my week</button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </section>
  );
}

// ===================== STREAK + CYCLE SYNC CARDS =====================

function StreakCard({ streak }: { streak: Streak }) {
  return (
    <div className="pearl-frame bloom-pearl-card animate-scale-in animate-card-breathe relative overflow-hidden rounded-3xl p-4 sm:p-5">
      <div className="relative z-10 flex items-center gap-3">
        <span className="animate-icon-wiggle grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-hotpink text-white shadow-lg shadow-hotpink/30">
          <Flame className="h-6 w-6" strokeWidth={1.8} />
        </span>
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-rose/60">Streak</p>
          <p className="font-script text-2xl text-hotpink leading-none">{streak.count} days blooming</p>
        </div>
      </div>
      <p className="relative z-10 mt-2 text-xs text-rose/75">{streak.count === 0 ? "Your first session begins your streak." : "Keep the soft momentum going."}</p>
    </div>
  );
}

const PHASE_SYNC_IMAGE: Record<Phase, string> = {
  menstrual: "/images/pose-reclined-bound-angle.webp",
  follicular: "/images/pose-warrior-1.webp",
  ovulation: "/images/pose-tree.webp",
  luteal: "/images/pose-seated-forward-fold.webp",
};

function CycleSyncCard({ phase, label, onClick }: { phase: Phase; label: string; onClick: () => void }) {
  return (
    <div className="pearl-frame animate-scale-in relative isolate flex min-h-[10rem] flex-col overflow-hidden rounded-3xl" style={{ animationDelay: "80ms" }}>
      <img src={PHASE_SYNC_IMAGE[phase]} alt="" className="absolute inset-0 -z-10 h-full w-full object-cover" />
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-white/95 via-white/80 to-white/20" />
      <div className="relative z-10 flex h-full flex-col p-4 sm:p-5">
        <div className="flex items-center gap-3">
          <span className="animate-bloom-pulse grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-hotpink text-white"><Flower className="h-5 w-5" strokeWidth={1.8} /></span>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-hotpink">Cycle sync — {phase}</p>
            <p className="text-sm font-bold text-rose leading-snug">{label}</p>
          </div>
        </div>
        <button
          onClick={onClick}
          className="bloom-luxury-btn hover-scale animate-cta-bounce mt-auto inline-flex w-fit items-center gap-1 px-3.5 py-1.5 text-xs font-semibold text-white"
        >
          Practice for today <ArrowRight className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
}

function Organizer({ phase, onStart }: { phase: Phase; onStart: (intention: Intention, durationMin: number) => void }) {
  const [schedule, setSchedule] = useState<Record<string, string | null>>({});
  const [durations, setDurations] = useState<Record<string, number>>({});
  const [reminder, setReminder] = useState("07:30");
  const [editing, setEditing] = useState(false);
  const [buildStep, setBuildStep] = useState(false); // "Build my own" → level/goal setup first
  // "Goal-tuned" marker — set by Diet when it lays down this week; cleared once
  // she edits / re-syncs / builds her own, so the badge persists until she changes it.
  const [tunedGoal, setTunedGoal] = useState<string | null>(() => { try { return localStorage.getItem("bloom:yoga-plan-goal"); } catch { return null; } });
  const clearYogaTuned = () => { try { localStorage.removeItem("bloom:yoga-plan-goal"); } catch {} setTunedGoal(null); };
  const goalWord = (g: string) => (g === "lose" ? "lean" : g === "gain" ? "build" : "maintain");

  // Cross-tool fuel: her body goal + real cycle phase decide the meals we
  // suggest after each planned flow (falls back to the yoga phase suggestion).
  const goal = readDietProfile().goal;
  const weight = readDietProfile().weight; // for each planned flow's expected burn
  const realPhase = readCyclePhase();
  const fuelPhase = normalizePhase(
    realPhase && realPhase !== "any" ? realPhase : phase === "menstrual" ? "period" : phase,
  );
  // Shared preference: show recovery meals inside the plan, or keep it simple.
  const [fuelInPlan, setFuelInPlan] = useState(() => readFuelInPlan());
  const toggleFuel = () => { if (!isPremium()) { openPaywall("yoga"); return; } const v = !fuelInPlan; setFuelInPlan(v); writeFuelInPlan(v); };

  useEffect(() => {
    try {
      const raw = localStorage.getItem(SCHEDULE_KEY);
      if (raw) setSchedule(JSON.parse(raw));
      // else: leave the week empty — a first-time user chooses "Sync to my
      // cycle" or "Build my own week" from the empty state below.
      const r = localStorage.getItem(REMINDER_KEY); if (r) setReminder(r);
      const dr = localStorage.getItem(YOGA_DURATIONS_KEY); if (dr) setDurations(JSON.parse(dr));
    } catch {}
  }, [phase]);

  // Re-read the schedule when it changes elsewhere (e.g. the hero's "sync to
  // phase" pill) so the week grid reflects it live.
  useEffect(() => {
    const reload = () => { try { const raw = localStorage.getItem(SCHEDULE_KEY); setSchedule(raw ? JSON.parse(raw) : {}); } catch {} };
    window.addEventListener("bloom:yoga-updated", reload);
    return () => window.removeEventListener("bloom:yoga-updated", reload);
  }, []);

  // Fill the week with flows matched to the current cycle phase (opt-in).
  const syncToCycle = () => {
    if (!isPremium()) { openPaywall("yoga"); return; } // cycle-sync is Bloom+
    const dayList = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    const plan = PHASE_DEFAULT_PLAN[phase];
    const next: Record<string, string | null> = {};
    dayList.forEach((d, i) => { next[d] = plan[i] ?? null; });
    setSchedule(next);
    try { localStorage.setItem(SCHEDULE_KEY, JSON.stringify(next)); window.dispatchEvent(new Event("bloom:yoga-updated")); } catch {}
    askForNotifications();
    clearYogaTuned(); // cycle-sync is her choice, not the Diet goal plan
  };

  // "Build my own" → save level/goal, lay out a week from those, open the editor.
  const createOwnWeek = (level: Level, gGoal: YogaGoal, daysPerWeek: number) => {
    try { localStorage.setItem(YOGA_PROFILE_KEY, JSON.stringify({ level, goal: gGoal })); } catch {}
    const activeDays = YOGA_DAY_PATTERNS[daysPerWeek] ?? YOGA_DAY_PATTERNS[3];
    const focuses = YOGA_GOALS.find((g) => g.key === gGoal)?.focuses ?? ["Stress relief"];
    const next: Record<string, string | null> = {};
    ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].forEach((d) => { next[d] = null; });
    activeDays.forEach((d, i) => { next[d] = focuses[i % focuses.length]; });
    setSchedule(next);
    try { localStorage.setItem(SCHEDULE_KEY, JSON.stringify(next)); window.dispatchEvent(new Event("bloom:yoga-updated")); } catch {}
    askForNotifications();
    setBuildStep(false);
    setEditing(false); // land straight on the plan (img 3) — no need to tap Done
    clearYogaTuned(); // her own build → no longer the Diet goal plan
  };

  // A schedule is only useful if we can actually nudge her — ask right when
  // she picks a practice day (a real user gesture), not via a banner she may dismiss.
  const askForNotifications = () => {
    if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "default") {
      Notification.requestPermission().then((perm) => {
        if (perm === "granted") subscribeToPush().catch(() => {});
      });
    }
  };

  const update = (day: string, val: string | null) => {
    const next = { ...schedule, [day]: val };
    setSchedule(next);
    try { localStorage.setItem(SCHEDULE_KEY, JSON.stringify(next)); window.dispatchEvent(new Event("bloom:yoga-updated")); } catch {}
    clearYogaTuned(); // a hand edit means it's her own week now
    if (val) askForNotifications();
  };
  const setDuration = (day: string, n: number) => {
    const next = { ...durations, [day]: n };
    setDurations(next);
    try { localStorage.setItem(YOGA_DURATIONS_KEY, JSON.stringify(next)); } catch {}
  };
  const updateReminder = (v: string) => {
    setReminder(v);
    try { localStorage.setItem(REMINDER_KEY, v); } catch {}
    askForNotifications();
  };

  // Keep the shared `scheduled_notifications` table in sync with this weekly
  // schedule, so the backend (Edge Function + cron) can nudge her even while
  // the app is closed. No-ops silently when signed out.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const userId = await getCurrentUserId();
      if (cancelled || !userId) {
        if (!cancelled) syncScheduledNotifications("yoga", []);
        return;
      }
      const [hh, mm] = reminder.split(":").map((n) => parseInt(n, 10));
      const today = new Date();
      const items: ScheduledNotificationInput[] = [];
      for (let i = 0; i < YOGA_PUSH_SYNC_WINDOW_DAYS; i++) {
        const day = addDays(today, i);
        const label = WEEKDAY_LABELS[day.getDay()];
        const focus = schedule[label];
        if (!focus) continue;
        const fireAt = new Date(day.getFullYear(), day.getMonth(), day.getDate(), hh || 0, mm || 0);
        if (fireAt < today) continue;
        const dateStr = fmtLocalDate(day);
        items.push({
          dedupeKey: `session:${dateStr}`,
          fireAt: fireAt.toISOString(),
          title: "Yoga time ✿",
          body: `Your ${focus.toLowerCase()} flow is waiting — ${fmtReminder(reminder)} 🧘`,
          data: { url: "/app/tools/yoga", kind: "yoga" },
        });
      }
      if (cancelled) return;
      syncScheduledNotifications("yoga", items);
    })();
    return () => { cancelled = true; };
  }, [schedule, reminder]);

  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const options = [null, "Morning energy", "Stress relief", "Sleep prep", "Cycle sync", "Strength", "Core & abs", "Balance & focus", "Full-body flow", "Emotional release", "Back & neck relief"];
  const todayKey = WEEKDAY_LABELS[new Date().getDay()];
  const weekEmpty = days.every((d) => !schedule[d]);

  const startFocus = (focus: string | null | undefined, day?: string) => {
    if (!focus) return;
    const meta = FOCUS_META[focus];
    if (meta) onStart(meta.intention, (day ? durations[day] : undefined) ?? meta.duration);
  };

  return (
    <div className="space-y-4">
      {/* ── The week, day by day — starts right under the hero ──────────────── */}
      <section className="animate-scale-in rounded-3xl bg-white/95 backdrop-blur-md border border-petal/60 shadow-sm shadow-hotpink/10 p-4 sm:p-5">
        {/* Header — title + setting CTAs (reminder · Edit · Reset), moved up */}
        <div className="flex items-center justify-between gap-3 flex-wrap mb-3">
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-wider text-rose/60">Your soft week</p>
            <h2 className="font-script text-2xl text-hotpink leading-none">Plan & start</h2>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <PickerField
              variant="pill"
              icon={BellRing}
              title="Reminder time"
              value={reminder}
              options={REMINDER_TIME_OPTIONS}
              onChange={updateReminder}
            />
            <button onClick={() => { if (!editing && !isPremium()) { openPaywall("yoga"); return; } setEditing((v) => !v); }} className={["rounded-full px-3 py-1.5 text-[11px] font-bold border transition active:scale-95", editing ? "bg-hotpink text-white border-hotpink" : "bg-white/90 text-hotpink border-petal/60 hover:border-hotpink/40"].join(" ")}>
              {editing ? "Done" : "Edit"}
            </button>
            <button onClick={resetYogaTool} title="Reset — preview the first-time experience" className="grid h-8 w-8 place-items-center rounded-full border border-petal/50 bg-white/70 text-rose/45 transition hover:text-hotpink active:scale-90"><Trash2 className="h-3.5 w-3.5" /></button>
          </div>
        </div>

        {/* Status — Goal · Level · Streak · Sync, four bigger tiles (persist under the plan/program card) */}
        {!editing && (
          <div className="mb-3 grid grid-cols-4 gap-2">
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
              <span className="grid h-8 w-8 place-items-center rounded-full bg-blush text-hotpink"><Flame className="h-4 w-4" fill={readYogaStreak().count > 0 ? "currentColor" : "none"} strokeWidth={2} /></span>
              <span className="text-[8.5px] font-bold uppercase tracking-wider text-rose/55 leading-none">Streak</span>
              <span className="text-[12.5px] font-black text-hotpink leading-tight">{readYogaStreak().count}{readYogaStreak().count === 1 ? " day" : " days"}</span>
            </div>
            <YogaPhaseSyncPill variant="tile" />
          </div>
        )}

        {/* Edit-mode instruction — helps first-timers build their own week */}
        {editing && (
          <div className="mb-3 flex items-start gap-2 rounded-2xl bg-blush/50 border border-petal/60 px-3.5 py-2.5 animate-fade-in">
            <Sparkles className="h-3.5 w-3.5 shrink-0 mt-0.5 text-hotpink" strokeWidth={2} />
            <p className="text-[11px] text-rose/80 leading-snug">
              Tap any day to choose its <b className="font-bold text-hotpink">focus</b> and <b className="font-bold text-hotpink">length</b>. Pick <b className="font-bold text-hotpink">Rest day</b> to clear one. Tap <b className="font-bold text-hotpink">Done</b> when your week feels right.
            </p>
          </div>
        )}

        {/* Fuel toggle — meals in the plan, or just the flows (once a week exists) */}
        {!editing && !weekEmpty && (
          <button
            onClick={toggleFuel}
            className="w-full flex items-center gap-3 rounded-2xl border border-petal/60 bg-white/85 px-3.5 py-2.5 mb-3 text-left active:scale-[0.99] transition"
          >
            <span className={["grid h-8 w-8 shrink-0 place-items-center rounded-full", fuelInPlan ? "bg-hotpink text-white" : "bg-blush text-hotpink"].join(" ")}>
              <Utensils className="h-4 w-4" strokeWidth={1.9} />
            </span>
            <span className="flex-1 min-w-0">
              <span className="block text-[12px] font-bold text-rose leading-tight">Recovery meals in plan</span>
              <span className="block text-[10.5px] text-rose/60 leading-snug">{fuelInPlan ? "Each flow shows what to eat after ✿" : "Plan shows flows only"}</span>
            </span>
            <span className={["relative h-5 w-9 shrink-0 rounded-full transition-colors", fuelInPlan ? "bg-hotpink" : "bg-rose/25"].join(" ")}>
              <span className="absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all" style={{ left: fuelInPlan ? "1.125rem" : "0.125rem" }} />
            </span>
          </button>
        )}

        {/* Build my own → level/goal setup first, then the editor */}
        {!editing && buildStep ? (
          <YogaPlanSetup onBack={() => setBuildStep(false)} onCreate={createOwnWeek} />
        ) : /* Empty week (first-time / after reset) → choose how to start */
        !editing && weekEmpty ? (
          <div className={["space-y-2.5", isGuided() ? "animate-section-attention" : ""].join(" ")}>
            <div>
              <h3 className="font-script text-xl text-hotpink leading-none mb-0.5">Set up your soft week ✿</h3>
              <p className="text-[12px] text-rose/70">Choose how to start — you can always change it.</p>
            </div>
            {/* FREE Bloom plan — a gentle 2-day Calm & Restore week so free users
                can finish setup without hitting the wall. */}
            {!isPremium() && (
              <button onClick={() => createOwnWeek("Beginner", "calm", 2)} className="w-full rounded-2xl bg-gradient-to-r from-hotpink/15 to-petal/30 border border-hotpink/45 p-3.5 flex items-center gap-3 text-left transition hover:-translate-y-0.5 active:scale-[0.99] animate-selected-glow">
                <span className="clay-blob grid h-10 w-10 shrink-0 place-items-center rounded-full text-white animate-icon-breathe"><Sparkles className="h-5 w-5" strokeWidth={1.8} /></span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-rose flex items-center gap-1.5">Free starter week <span className="rounded-full bg-hotpink/15 text-hotpink text-[8px] font-black uppercase tracking-wide px-1.5 py-0.5">Free</span></p>
                  <p className="text-[11px] text-rose/70 leading-snug">A gentle 2-day Calm &amp; Restore week — yours on Bloom.</p>
                </div>
                <ChevronRight className="h-5 w-5 text-hotpink shrink-0" />
              </button>
            )}
            <button onClick={syncToCycle} className="w-full rounded-2xl bg-gradient-to-r from-hotpink/15 to-petal/30 border border-petal/60 p-3.5 flex items-center gap-3 text-left transition hover:-translate-y-0.5 active:scale-[0.99]">
              <span className="clay-blob grid h-10 w-10 shrink-0 place-items-center rounded-full text-white animate-icon-breathe"><Flower className="h-5 w-5" strokeWidth={1.8} /></span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-rose flex items-center gap-1.5">Sync to my cycle {!isPremium() && <span className="inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[8px] font-black uppercase tracking-wide text-white" style={{ background: "linear-gradient(135deg,#B76E79,#EC4899)" }}><Lock className="h-2 w-2" strokeWidth={3} /> Bloom+</span>}</p>
                <p className="text-[11px] text-rose/70 leading-snug">Auto-fill the week with flows matched to your {phase} phase.</p>
              </div>
              <ChevronRight className="h-5 w-5 text-hotpink shrink-0" />
            </button>
            <button onClick={() => setBuildStep(true)} className="w-full rounded-2xl bg-white/90 border border-petal/60 p-3.5 flex items-center gap-3 text-left transition hover:-translate-y-0.5 active:scale-[0.99]">
              <span className="clay-blob grid h-10 w-10 shrink-0 place-items-center rounded-full text-white"><Sparkles className="h-5 w-5" strokeWidth={1.8} /></span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-rose">Build my own week</p>
                <p className="text-[11px] text-rose/70 leading-snug">Pick your level &amp; goal, then fine-tune each day's focus &amp; length.</p>
              </div>
              <ChevronRight className="h-5 w-5 text-hotpink shrink-0" />
            </button>
          </div>
        ) : (
        <div id="yoga-week-plan" className="flex flex-col gap-2.5">
          {days.map((d) => {
            const focus = schedule[d];
            const meta = focus ? FOCUS_META[focus] : null;
            const isToday = d === todayKey;
            const showFuel = fuelInPlan && !!focus && !!meta;

            // Editing → hand-pick focus + length per day (app-styled pickers)
            if (editing) {
              return (
                <div key={d} className="rounded-2xl border border-petal/50 bg-white/70 p-2.5">
                  <div className="flex items-center gap-2">
                    <div className="w-9 shrink-0 text-center">
                      <p className={["text-[10px] font-bold uppercase tracking-wide", isToday ? "text-hotpink" : "text-rose/50"].join(" ")}>{d}</p>
                      {isToday && <p className="text-[8px] font-bold uppercase text-hotpink">Today</p>}
                    </div>
                    <PickerField
                      title="Choose a focus"
                      className="flex-1 min-w-0"
                      value={focus ?? "rest"}
                      options={options.map((o) => ({ value: o ?? "rest", label: o ?? "Rest day" }))}
                      onChange={(v) => update(d, v === "rest" ? null : v)}
                    />
                  </div>
                  {focus && meta && (
                    <div className="mt-1.5 pl-11">
                      <PickerField
                        title="How long?"
                        className="w-[6.5rem]"
                        value={String(durations[d] ?? meta.duration)}
                        options={[10, 15, 20, 25, 30].map((m) => ({ value: String(m), label: `${m} min` }))}
                        onChange={(v) => setDuration(d, Number(v))}
                      />
                    </div>
                  )}
                </div>
              );
            }

            // Rest day → simple compact row
            if (!focus || !meta) {
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

            // Flow day → meals OFF: small thumbnail (full image) + title; meals ON: full-section photo background
            return (
              <div key={d} className={["rounded-2xl border overflow-hidden transition",
                isToday ? "border-hotpink/60 shadow-md shadow-hotpink/10" : "border-petal/50"].join(" ")}>
                {!showFuel ? (
                  // Small left thumbnail showing the WHOLE image (not cropped) + title beside it
                  <button onClick={() => startFocus(focus, d)} className="flex items-center gap-3 p-2.5 w-full text-left bg-white/70 active:scale-[0.99] transition hover:bg-blush/25">
                    <div className="relative shrink-0 w-20 h-20 rounded-xl overflow-hidden grid place-items-center bg-gradient-to-br from-blush/60 to-petal/40">
                      <img src={meta.image} alt="" className="h-full w-full object-contain" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={["text-[10px] font-bold uppercase tracking-wide", isToday ? "text-hotpink" : "text-rose/50"].join(" ")}>{d}{isToday ? " · Today" : ""}</p>
                      <p className="text-sm sm:text-base font-bold leading-tight text-hotpink truncate">{focus}</p>
                      <p className="text-[11px] text-rose/60 leading-snug truncate">{meta.blurb} · {durations[d] ?? meta.duration} min · <span className="font-semibold text-hotpink/80">~{yogaSessionKcal(durations[d] ?? meta.duration, weight)} kcal</span></p>
                    </div>
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-hotpink text-white shadow-md shadow-hotpink/30"><Play className="h-3.5 w-3.5" fill="currentColor" strokeWidth={0} /></span>
                  </button>
                ) : (
                  // Meals on → one big photo behind the whole day: visible left, veiled content right
                  <div className="relative">
                    <img src={meta.image} alt="" className="absolute inset-0 h-full w-full object-cover object-center" />
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent from-[26%] via-white/45 to-white/70" />
                    <div className="relative z-10 flex items-stretch">
                      <button onClick={() => startFocus(focus, d)} aria-label={`Start ${focus}`}
                        className="relative w-[30%] sm:w-[25%] shrink-0 flex flex-col justify-between p-2.5 text-left active:scale-[0.98] transition">
                        <span className="w-fit rounded-full bg-black/40 backdrop-blur-sm px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">{d}{isToday ? " · Today" : ""}</span>
                        <span className="grid h-9 w-9 place-items-center rounded-full bg-white text-hotpink shadow-lg shadow-hotpink/30"><Play className="h-3.5 w-3.5" fill="currentColor" strokeWidth={0} /></span>
                      </button>
                      <div className="flex-1 min-w-0 bg-white/60 backdrop-blur-md p-2.5 sm:p-3">
                        <div className="mb-1.5">
                          <p className="text-sm sm:text-base font-bold leading-tight text-hotpink">{focus}</p>
                          <p className="text-[11px] text-rose/70 leading-snug">{meta.blurb} · {durations[d] ?? meta.duration} min · <span className="font-semibold text-hotpink">~{yogaSessionKcal(durations[d] ?? meta.duration, weight)} kcal</span></p>
                        </div>
                        <FuelCard
                          ctx={{ goal, phase: fuelPhase, kind: "yoga", intensity: yogaIntensity(focus), activityLabel: focus }}
                          day={d}
                          heading={`After your ${focus}`}
                          embedded
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
        )}
      </section>
    </div>
  );
}

// ===================== LIBRARY =====================

function Library({ onTryFlow }: { onTryFlow: () => void }) {
  const [active, setActive] = useState<Level>("Beginner");
  const filtered = useMemo(() => POSES.filter((p) => p.level === active), [active]);

  return (
    <div className="relative space-y-4 yoga-fade">
      <section className="rounded-3xl bg-white/85 backdrop-blur border border-petal/60 p-4 sm:p-5">
        <div className="flex items-end justify-between gap-3 mb-3">
          <div>
            <h2 className="font-script text-2xl sm:text-3xl text-hotpink leading-none">Pose Library ✿</h2>
            <p className="text-[11px] sm:text-xs text-rose/60 mt-0.5">
              Tap any pose to learn how to enter it and find your breath.
            </p>
          </div>
          <span className="shrink-0 rounded-full bg-blush/70 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-hotpink">{filtered.length} poses</span>
        </div>

        <div className="mt-1 flex gap-2 overflow-x-auto pb-1.5 scrollbar-none">
          {(["Beginner","Intermediate","Advanced"] as Level[]).map((lv) => (
            <button key={lv} onClick={() => setActive(lv)}
              className={[
                "shrink-0 rounded-full px-4 py-1.5 text-xs font-bold border transition active:scale-95",
                active === lv ? "bg-hotpink text-white border-transparent shadow-md shadow-hotpink/30" : "bg-white/85 text-rose border-petal/60 hover:border-hotpink/40",
              ].join(" ")}>
              {lv}
            </button>
          ))}
        </div>
      </section>

      <div key={active} className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
        {filtered.map((p, i) => <PoseCard key={p.slug} pose={p} index={i} />)}
      </div>

      {/* Floating "Try a flow" FAB — bottom-right, soft pink glow */}
      <button
        onClick={onTryFlow}
        className="hover-scale animate-selected-glow fixed bottom-20 right-4 z-40 inline-flex items-center gap-1.5 rounded-full bg-hotpink px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-hotpink/40 transition active:scale-95"
      >
        <Sparkle className="h-3.5 w-3.5" /> Try a flow
      </button>
    </div>
  );
}

function PoseCard({ pose, index }: { pose: Pose; index: number }) {
  const [open, setOpen] = useState(false);
  return (
    <div
      className="hover-scale animate-scale-in rounded-2xl sm:rounded-3xl bg-white/90 backdrop-blur border border-petal/60 overflow-hidden shadow-md shadow-rose/10 hover:-translate-y-0.5 hover:shadow-lg transition"
      style={{ animationDelay: `${(index % 8) * 60}ms` }}
    >
      <button onClick={() => setOpen((v) => !v)} className="block w-full text-left">
        <div className="aspect-square bg-blush/40">
          <img src={pose.image} alt={pose.name} loading="lazy" width={1024} height={1024} onError={(e) => { e.currentTarget.style.visibility = "hidden"; }} className="h-full w-full object-contain bg-[oklch(0.96_0.04_350)]" />
        </div>
        <div className="p-3">
          <p className="text-sm font-bold text-rose leading-tight">{pose.name}</p>
          {pose.sanskrit && <p className="text-[10px] italic text-rose/60 leading-tight">{pose.sanskrit}</p>}
          <p className="mt-1 text-[10px] uppercase tracking-wider font-bold text-hotpink/70">{pose.group}</p>
        </div>
      </button>
      {open && (
        <div className="px-3 pb-3 text-xs text-rose/85 leading-snug border-t border-petal/40 pt-2">
          {pose.cues.en}
        </div>
      )}
    </div>
  );
}

// ===================== SETUP =====================

const DURATIONS = [10, 20, 30, 45, 60];
const LEVELS: Level[] = ["Beginner", "Intermediate", "Advanced"];
const SOUNDS = ["Renewal", "Weightless", "Windsong", "Forest"] as const;
const DEFAULT_SOUND: typeof SOUNDS[number] = "Renewal"; // meditation bed, default for programs

function YogaPlanSetup({ onBack, onCreate }: {
  onBack: () => void;
  onCreate: (level: Level, goal: YogaGoal, days: number) => void;
}) {
  const premium = usePremium();
  // Free plan can build ONLY: Beginner · Calm & restore · 2 days.
  const [level, setLevel] = useState<Level>(() => (premium ? readYogaProfileLevel() : "Beginner"));
  const [goal, setGoal] = useState<YogaGoal>("calm");
  const [days, setDays] = useState(premium ? 3 : 2);
  const freeCombo = level === "Beginner" && goal === "calm" && days === 2;
  const lockLevel = (lv: Level) => !premium && lv !== "Beginner";
  const lockGoal = (k: YogaGoal) => !premium && k !== "calm";
  const lockDays = (d: number) => !premium && d !== 2;
  return (
    <div className="space-y-3.5 animate-fade-in">
      <div>
        <h3 className="font-script text-xl text-hotpink leading-none mb-0.5">Build your own week ✿</h3>
        <p className="text-[12px] text-rose/70">Set your level &amp; focus — we&apos;ll lay out a week you can fine-tune.</p>
      </div>
      <PickGroup label="Your level" icon={GraduationCap}>
        {LEVELS.map((lv) => { const lk = lockLevel(lv); return (
          <Chip key={lv} active={level === lv} onClick={() => { if (lk) { openPaywall("yoga"); return; } setLevel(lv); }}>
            {lv}{lk && <Lock className="ml-1 h-3 w-3 text-[#B76E79]" strokeWidth={2.4} />}
          </Chip>
        ); })}
      </PickGroup>
      <PickGroup label="What do you want?" icon={Heart}>
        {YOGA_GOALS.map((g) => { const lk = lockGoal(g.key); return (
          <Chip key={g.key} active={goal === g.key} onClick={() => { if (lk) { openPaywall("yoga"); return; } setGoal(g.key); }}>
            {g.label}{lk && <Lock className="ml-1 h-3 w-3 text-[#B76E79]" strokeWidth={2.4} />}
          </Chip>
        ); })}
      </PickGroup>
      <PickGroup label="Days per week" icon={Calendar}>
        {[2, 3, 4, 5].map((d) => { const lk = lockDays(d); return (
          <Chip key={d} active={days === d} onClick={() => { if (lk) { openPaywall("yoga"); return; } setDays(d); }}>
            {d} days{lk && <Lock className="ml-1 h-3 w-3 text-[#B76E79]" strokeWidth={2.4} />}
          </Chip>
        ); })}
      </PickGroup>
      <div className="flex items-center gap-2 pt-1">
        <button onClick={onBack} className="rounded-full bg-white/85 px-4 py-2 text-xs font-semibold text-rose border border-petal/60">Back</button>
        <button onClick={() => { if (!premium && !freeCombo) { openPaywall("yoga"); return; } onCreate(level, goal, days); }} className="flex-1 bloom-luxury-btn py-2.5 text-sm font-bold text-white inline-flex items-center justify-center gap-2">
          Create my week <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

function Setup({
  onBack, onStart, preset,
}: {
  onBack: () => void;
  onStart: (cfg: { durationMin: number; intention: Intention; level: Level; lang: Lang; sound: typeof SOUNDS[number]; mode: Mode; phase: Phase }) => void;
  preset?: { intention: Intention; durationMin: number };
}) {
  const premium = usePremium();
  // Free plan can build only: 10 min · Morning energy · Beginner.
  const [durationMin, setDuration] = useState(preset?.durationMin ?? (premium ? 20 : 10));
  const [intention, setIntention] = useState<Intention>(preset?.intention ?? "morning");
  const [level, setLevel] = useState<Level>(() => (premium ? readYogaProfileLevel() : "Beginner"));
  const [lang, setLang] = useState<Lang>("en");
  const [sound, setSound] = useState<typeof SOUNDS[number]>(DEFAULT_SOUND);
  const [mode, setMode] = useState<Mode>("visual");
  const [phase, setPhase] = useState<Phase>("follicular");

  useEffect(() => {
    setPhase(mapToYogaPhase(readCyclePhase()));
  }, []);

  useEffect(() => {
    // Friendly nudge for beginners
    if (level === "Beginner" && mode === "audio") {
      // allowed — but the flow builder restricts to safe floor poses
    }
  }, [level, mode]);

  return (
    <div className="space-y-4 yoga-fade">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-rose/60">Set the mood</p>
          <h2 className="font-script text-3xl sm:text-5xl text-hotpink leading-none">Your session</h2>
          <p className="text-xs sm:text-sm text-rose/80 mt-1">Pick what feels right — we'll shape the flow for you.</p>
        </div>
        <button onClick={onBack} className="rounded-full bg-white/85 px-3 py-1.5 text-xs font-semibold text-rose border border-petal/60">Back</button>
      </div>

      <PickGroup label="Duration" icon={Clock}>
        {DURATIONS.map((d) => { const lk = !premium && d !== 10; return (
          <Chip key={d} active={durationMin === d} onClick={() => { if (lk) { openPaywall("yoga"); return; } setDuration(d); }}>{d} min{lk && <Lock className="ml-1 h-3 w-3 text-[#B76E79]" strokeWidth={2.4} />}</Chip>
        ); })}
      </PickGroup>

      <PickGroup label="Intention" icon={Heart}>
        {INTENTIONS.map((i) => {
          const Ico = i.icon;
          const lk = !premium && i.id !== "morning";
          return (
            <Chip key={i.id} active={intention === i.id} onClick={() => { if (lk) { openPaywall("yoga"); return; } setIntention(i.id); }}>
              <Ico className="h-3.5 w-3.5 mr-1" /> {i.label}{lk && <Lock className="ml-1 h-3 w-3 text-[#B76E79]" strokeWidth={2.4} />}
            </Chip>
          );
        })}
      </PickGroup>

      {intention === "cycle" && (
        <PickGroup label="Today's phase" icon={Flower}>
          {(["menstrual","follicular","ovulation","luteal"] as Phase[]).map((p) => (
            <Chip key={p} active={phase === p} onClick={() => setPhase(p)}>{p}</Chip>
          ))}
        </PickGroup>
      )}

      <PickGroup label="Level" icon={GraduationCap}>
        {LEVELS.map((lv) => { const lk = !premium && lv !== "Beginner"; return (
          <Chip key={lv} active={level === lv} onClick={() => { if (lk) { openPaywall("yoga"); return; } setLevel(lv); }}>{lv}{lk && <Lock className="ml-1 h-3 w-3 text-[#B76E79]" strokeWidth={2.4} />}</Chip>
        ); })}
      </PickGroup>

      <PickGroup label="Language" icon={Languages}>
        {LANGS.map((l) => {
          const soon = l.id !== "en"; // narration is English for now
          return (
            <Chip key={l.id} active={lang === l.id} disabled={soon} onClick={() => setLang(l.id)}>
              {l.label}{soon ? " · soon" : ""}
            </Chip>
          );
        })}
      </PickGroup>

      <PickGroup label="Background sound" icon={Music}>
        {SOUNDS.map((s) => (
          <Chip key={s} active={sound === s} onClick={() => setSound(s)}>{s}</Chip>
        ))}
      </PickGroup>

      <PickGroup label="Mode" icon={Eye}>
        <Chip active={mode === "visual"} onClick={() => setMode("visual")}><Eye className="h-3.5 w-3.5 mr-1" /> Guided + visuals</Chip>
        <Chip active={mode === "audio"} onClick={() => setMode("audio")}><Headphones className="h-3.5 w-3.5 mr-1" /> Audio only (eyes closed)</Chip>
      </PickGroup>

      {level === "Beginner" && mode === "visual" && (
        <div className="rounded-2xl bg-blush/60 border border-petal/50 p-3 text-xs text-rose/85">
          <span className="font-bold">New to yoga?</span> Start with visuals — close your eyes once the poses feel familiar.
        </div>
      )}
      {level === "Beginner" && mode === "audio" && (
        <div className="rounded-2xl bg-blush/60 border border-petal/50 p-3 text-xs text-rose/85">
          Audio session will stay on simple floor poses — child's pose, cat-cow, gentle twists and breathing. Safe & soft.
        </div>
      )}

      <div className="pt-2 flex justify-end">
        <button
          onClick={() => { if (!premium && (durationMin !== 10 || intention !== "morning" || level !== "Beginner")) { openPaywall("yoga"); return; } onStart({ durationMin, intention, level, lang, sound, mode, phase }); }}
          className="bloom-luxury-btn inline-flex items-center gap-2 px-6 py-3 text-sm font-bold text-white"
        >
          <Play className="h-4 w-4" /> Begin practice
        </button>
      </div>
    </div>
  );
}

function PickGroup({ label, icon: Icon, children }: { label: string; icon: typeof Sun; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl bg-white/85 backdrop-blur border border-petal/60 p-3 sm:p-4">
      <p className="text-[10px] font-bold uppercase tracking-wider text-rose/60 flex items-center gap-1.5 mb-2">
        <Icon className="h-3.5 w-3.5" /> {label}
      </p>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

function Chip({ active, onClick, children, disabled }: { active: boolean; onClick: () => void; children: React.ReactNode; disabled?: boolean }) {
  return (
    <button onClick={disabled ? undefined : onClick} disabled={disabled} className={[
      "inline-flex items-center rounded-full px-3 py-1.5 text-xs font-semibold border transition",
      disabled ? "bg-white/50 text-rose/40 border-petal/40 cursor-not-allowed"
        : active ? "bg-hotpink text-white border-transparent shadow-md shadow-hotpink/30"
                 : "bg-white/90 text-rose border-petal/60 hover:bg-blush/60",
    ].join(" ")}>{children}</button>
  );
}

// ===================== SESSION PLAYER =====================

// ── Time-of-day session skins ───────────────────────────────────────────────
// The guided player re-tones itself by time of day (and always night for a
// sleep flow) so an evening practice *feels* like night. Photos are re-toned
// with brightness + a colour overlay — never hue-rotated, which muddies skin
// tones. Auto by default, with a Day/Night manual override.
type DayPart = "dawn" | "day" | "dusk" | "night";
type SkinPref = "auto" | "day" | "night";
const YOGA_SKIN_KEY = "bloom:yoga-skin";
const YOGA_SPEED_KEY = "bloom:yoga-speed";
const YOGA_VOICE_KEY = "bloom:yoga-voice-vol";
const YOGA_MUSIC_KEY = "bloom:yoga-music-vol";
function clockDayPart(d = new Date()): DayPart {
  const h = d.getHours();
  if (h >= 5 && h < 9) return "dawn";
  if (h >= 9 && h < 17) return "day";
  if (h >= 17 && h < 20) return "dusk";
  return "night";
}
function resolveDayPart(intention: Intention, pref: SkinPref): DayPart {
  if (pref === "day" || pref === "night") return pref;
  if (intention === "sleep") return "night";
  return clockDayPart();
}
interface SessionSkin {
  frame: string; card: string; stage: string; imgFilter: string;
  overlay: string; veil: string; ripple: string; panel: string; ink: string; inkSoft: string;
}
const SESSION_SKINS: Record<DayPart, SessionSkin> = {
  dawn: {
    frame: "linear-gradient(180deg,#FFF3EE,#FFE6EE)", card: "rgba(255,251,251,0.92)",
    stage: "rgba(255,236,231,0.45)", imgFilter: "saturate(1.05) brightness(1.03)",
    overlay: "linear-gradient(180deg,rgba(255,201,150,0.16),transparent 45%,rgba(255,170,190,0.14))",
    veil: "rgba(255,241,236,0.22)", ripple: "244,146,110", panel: "rgba(255,251,251,0.92)",
    ink: "#db2777", inkSoft: "rgba(190,24,93,0.62)",
  },
  day: {
    frame: "rgba(252,231,243,0.95)", card: "rgba(255,255,255,0.90)",
    stage: "rgba(252,231,243,0.40)", imgFilter: "none", overlay: "transparent",
    veil: "rgba(252,231,243,0.25)", ripple: "236,72,153", panel: "transparent",
    ink: "#db2777", inkSoft: "rgba(190,24,93,0.60)",
  },
  dusk: {
    frame: "linear-gradient(180deg,#3b2742,#5c2f4c)", card: "rgba(54,36,60,0.66)",
    stage: "rgba(54,36,60,0.5)", imgFilter: "brightness(0.86) saturate(0.96)",
    overlay: "linear-gradient(180deg,rgba(255,150,90,0.16),transparent 42%,rgba(120,60,120,0.34))",
    veil: "rgba(66,38,66,0.28)", ripple: "255,178,138", panel: "rgba(46,29,52,0.68)",
    ink: "#ffe6f2", inkSoft: "rgba(255,222,236,0.72)",
  },
  night: {
    frame: "linear-gradient(180deg,#171030,#221846)", card: "rgba(28,22,58,0.62)",
    stage: "rgba(18,14,40,0.5)", imgFilter: "brightness(0.64) saturate(0.85) contrast(1.03)",
    overlay: "radial-gradient(120% 90% at 50% 18%,rgba(90,100,190,0.20),transparent 55%),linear-gradient(180deg,rgba(20,20,60,0.42),rgba(18,14,44,0.55))",
    veil: "rgba(20,16,46,0.34)", ripple: "170,182,255", panel: "rgba(22,17,46,0.68)",
    ink: "#ece8ff", inkSoft: "rgba(220,216,255,0.68)",
  },
};

// ── Session copy — the floating glass panels read from these (one source each) ──
const FLOW_META: Record<Intention, { title: string; tagline: string; focus: string[]; feel: { icon: LucideIcon; label: string }[] }> = {
  morning:  { title: "Morning Energy Flow", tagline: "Awaken. Stretch. Bloom.", focus: ["Full Body", "Flexibility", "Energy"], feel: [{ icon: Flame, label: "More energized" }, { icon: Sparkles, label: "Better focus" }, { icon: Flower, label: "Less stiffness" }, { icon: Heart, label: "Calmer mind" }] },
  stress:   { title: "Stress Relief Flow", tagline: "Soften. Slow. Let go.", focus: ["Breath", "Release", "Calm"], feel: [{ icon: Wind, label: "Slower breath" }, { icon: Flower, label: "Less tension" }, { icon: Heart, label: "Calmer mind" }, { icon: Sparkles, label: "More at ease" }] },
  sleep:    { title: "Wind-Down Flow", tagline: "Unwind. Settle. Rest.", focus: ["Gentle", "Restore", "Sleep"], feel: [{ icon: Moon, label: "Sleepy & soft" }, { icon: Wind, label: "Slower mind" }, { icon: Flower, label: "Less tension" }, { icon: Heart, label: "Ready to rest" }] },
  release:  { title: "Deep Release Flow", tagline: "Open. Breathe. Release.", focus: ["Hips", "Tension", "Space"], feel: [{ icon: Waves, label: "Looser body" }, { icon: Flower, label: "Less tension" }, { icon: Wind, label: "More space" }, { icon: Sparkles, label: "Lighter" }] },
  cycle:    { title: "Cycle-Sync Flow", tagline: "Honour your phase today.", focus: ["Gentle", "Hormone-kind", "Balance"], feel: [{ icon: Heart, label: "More balanced" }, { icon: Flower, label: "Less cramping" }, { icon: Wind, label: "Softer mood" }, { icon: Sparkles, label: "Cared for" }] },
  strength: { title: "Strength Flow", tagline: "Build heat. Grow steady.", focus: ["Full Body", "Strength", "Stamina"], feel: [{ icon: Flame, label: "Stronger" }, { icon: Activity, label: "More toned" }, { icon: Sparkles, label: "Energized" }, { icon: Heart, label: "Empowered" }] },
  core:     { title: "Core Flow", tagline: "Centre. Steady. Strong.", focus: ["Core", "Stability", "Control"], feel: [{ icon: Flame, label: "Stronger core" }, { icon: Activity, label: "Steadier" }, { icon: Sparkles, label: "Energized" }, { icon: Heart, label: "Grounded" }] },
  balance:  { title: "Balance Flow", tagline: "Focus. Ground. Rise.", focus: ["Balance", "Focus", "Grace"], feel: [{ icon: Sparkles, label: "Sharper focus" }, { icon: Activity, label: "Steadier" }, { icon: Flower, label: "More graceful" }, { icon: Heart, label: "Calmer mind" }] },
  backcare: { title: "Back-Care Flow", tagline: "Ease. Lengthen. Relieve.", focus: ["Spine", "Relief", "Mobility"], feel: [{ icon: Waves, label: "Looser back" }, { icon: Flower, label: "Less ache" }, { icon: Wind, label: "More mobile" }, { icon: Heart, label: "Relieved" }] },
  fullbody: { title: "Full-Body Flow", tagline: "Move. Stretch. Glow.", focus: ["Full Body", "Flexibility", "Flow"], feel: [{ icon: Activity, label: "More mobile" }, { icon: Sparkles, label: "Energized" }, { icon: Flower, label: "Less stiffness" }, { icon: Heart, label: "Calmer mind" }] },
};

/** A short, warm benefit line per pose family — for the right-side POSE panel. */
const GROUP_BENEFIT: Record<Pose["group"], string> = {
  Breathing: "Calms the nervous system and steadies the breath.",
  "Warm-up": "Wakes the spine and gently eases the body in.",
  Hips: "Opens tight hips and releases held tension.",
  Standing: "Builds strength, balance and steady energy.",
  Balance: "Sharpens focus and steadies the mind.",
  Backbends: "Opens the chest and energizes the spine.",
  "Forward folds": "Lengthens the back and calms the mind.",
  Restorative: "Deep rest — lets the body fully soften.",
  Strength: "Builds heat and full-body strength.",
};

const FLOW_QUOTES = [
  "Movement is medicine. You're choosing you today.",
  "Breath by breath, you soften into strength.",
  "This is your time — nothing else to be.",
  "Every pose is a small act of self-love.",
  "You are allowed to slow all the way down.",
  "Come home to your body.",
];
const FLOW_MANTRAS = [
  "Inhale confidence. Exhale doubt.",
  "Inhale calm. Exhale tension.",
  "I am exactly where I need to be.",
  "Softer. Slower. Deeper.",
  "I breathe, I bloom.",
  "Grounded, open, at ease.",
];

/** Circular HOLD timer — the arc fills as the pose's hold elapses. */
function HoldRing({ remaining, total, ink, inkSoft }: { remaining: number; total: number; ink: string; inkSoft: string }) {
  const R = 46;
  const C = 2 * Math.PI * R;
  const elapsed = total > 0 ? Math.min(1, Math.max(0, (total - remaining) / total)) : 0;
  // Unique gradient id per instance — the desktop + mobile rings both mount, and a
  // shared id would make `url(#…)` resolve to the wrong (hidden) one, dropping the pink.
  const gid = useId().replace(/:/g, "") + "-hold";
  return (
    <div className="relative grid place-items-center h-[104px] w-[104px] sm:h-[128px] sm:w-[128px]">
      <svg viewBox="0 0 108 108" className="absolute inset-0 h-full w-full -rotate-90">
        <circle cx="54" cy="54" r={R} fill="none" stroke="currentColor" strokeWidth="7" className="text-white/35" />
        <circle cx="54" cy="54" r={R} fill="none" stroke={`url(#${gid})`} strokeWidth="7" strokeLinecap="round"
          strokeDasharray={C} strokeDashoffset={C * (1 - elapsed)} className="transition-[stroke-dashoffset] duration-1000 ease-linear" />
        <defs>
          <linearGradient id={gid} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#F9A8D4" /><stop offset="100%" stopColor="#EC4899" />
          </linearGradient>
        </defs>
      </svg>
      <div className="text-center leading-none" style={{ color: ink }}>
        <p className="text-[8px] sm:text-[9px] font-bold uppercase tracking-[0.2em]" style={{ color: inkSoft }}>Hold</p>
        <p className="text-2xl sm:text-3xl font-bold tabular-nums">{remaining}s</p>
        <p className="text-[8px] sm:text-[9px] font-semibold uppercase tracking-wider" style={{ color: inkSoft }}>of {total}s</p>
      </div>
    </div>
  );
}

/** Plays the cinematic Bloomzein intro (title + duration) once, then hands off
 *  to the live session — so every recorded flow opens on the brand. */
function SessionWithIntro({ durationMin, title, ...player }: {
  flow: Pose[]; lang: Lang; mode: Mode; hold: number; sound: string; intention: Intention; durationMin: number; title?: string; record?: boolean; silentGuide?: boolean; onExit: () => void; onDone: () => void;
}) {
  // Recording (REC) skips the cinematic Bloomzein intro entirely — the video
  // opens straight on the first pose, where the player's own "get ready" chrono
  // (2s, big-centre → glides to its corner) takes over as the opener.
  const [introDone, setIntroDone] = useState(!!player.record);
  const meta = FLOW_META[player.intention] ?? FLOW_META.morning;
  // Start ONE continuous music bed the moment the flow opens (during the intro),
  // and let the player adopt it — so the music plays through the intro and keeps
  // going into the flow, never stopping/restarting at the first pose.
  useEffect(() => {
    const bed = startFlowBed(player.sound);
    bed.volume = 0;
    bed.play().then(() => fadeAudioTo(bed, 0.72, 1600)).catch(() => {});
    return () => { stopFlowBed(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  // The player mounts UNDER the intro from the start, so its first pose is fully
  // painted before the intro dissolves — no white flash at the hand-off.
  return (
    <>
      <SessionPlayer {...player} />
      {!introDone && (
        <BloomzeinIntro
          channel="Yoga"
          sessionTitle={title ?? meta.title}
          sessionMeta={`${durationMin} Minutes`}
          pillars={meta.focus}
          onDone={() => setIntroDone(true)}
        />
      )}
    </>
  );
}

function SessionPlayer({
  flow, lang, mode, hold, sound, intention, onExit, onDone, record, silentGuide,
}: {
  flow: Pose[]; lang: Lang; mode: Mode; hold: number; sound: string; intention: Intention; onExit: () => void; onDone: () => void; record?: boolean; silentGuide?: boolean;
}) {
  // Music-only guided session (record experiment): the on-screen ring/pose-name/
  // "up next" pace the flow, so holds follow real yoga timing instead of the
  // voice-narration length. One helper feeds the timer, the ring and the labels.
  const holdFor = (p: Pose): number => (silentGuide ? guideHoldSec(p) : poseHoldSec(p));
  const [skinPref, setSkinPref] = useState<SkinPref>(() => {
    try { return (localStorage.getItem(YOGA_SKIN_KEY) as SkinPref) || "auto"; } catch { return "auto"; }
  });
  const cycleSkin = () => setSkinPref((p) => {
    const next: SkinPref = p === "auto" ? "day" : p === "day" ? "night" : "auto";
    try { localStorage.setItem(YOGA_SKIN_KEY, next); } catch {}
    return next;
  });
  const [idx, setIdx] = useState(0);
  const [running, setRunning] = useState(false);
  const pose = flow[idx];
  // Each pose lasts its OWN recorded-narration length (rounded up); poses with
  // no recording fall back to the uniform hold.
  const poseHold = pose ? holdFor(pose) : hold;
  // Whole-session length under the active timing model (guided vs narration).
  const flowTotalSec = flow.reduce((a, p) => a + holdFor(p), 0);
  // Pose numbering counts real poses only (switch-side steps don't add to it).
  const realTotal = flow.filter((p) => !p.switchStep).length;
  const stepNum = flow.slice(0, idx + 1).filter((p) => !p.switchStep).length;
  const [remaining, setRemaining] = useState(() => (flow[0] ? holdFor(flow[0]) : hold));
  const [finished, setFinished] = useState(false); // holds the last pose with a soft "The End" while the outro plays
  const [muted, setMuted] = useState(false);
  const [peek, setPeek] = useState(false);
  const [breathOpen, setBreathOpen] = useState(false); // centered breath-guide overlay (from the "Breath" control)
  const [tvHint, setTvHint] = useState(false); // brief "cast your tab" guide after going full-screen
  // "Get ready" chrono shown at the very start of a recording: a soft 2s countdown
  // that zooms in big + centred, then gently glides to the ring's corner as the
  // first hold begins. Non-record sessions skip straight to "done".
  const [chrono, setChrono] = useState<number | null>(record ? 5 : null);
  const [chronoPhase, setChronoPhase] = useState<"in" | "count" | "fly" | "done">(record ? "in" : "done");
  // Playback speed for the pose clip — yoga wants a calm, slow pace. 0.7× default.
  const [speed, setSpeed] = useState<number>(() => { try { return Number(localStorage.getItem(YOGA_SPEED_KEY)) || 0.7; } catch { return 0.7; } });
  const [showSpeed, setShowSpeed] = useState(false);
  // Presentation / filming mode: hides every app control, plays hands-free, and
  // shows the Bloomzein watermark — a clean stage to screen-record for YouTube.
  const [present, setPresent] = useState(false);
  const [chromeShow, setChromeShow] = useState(true); // the Exit affordance auto-hides
  const { user: authUser } = useAuth();
  const isOwner = authUser?.email === "khfuma@gmail.com"; // private one-tap record button
  useEffect(() => {
    if (!present) return;
    let t: ReturnType<typeof setTimeout>;
    const ping = () => { setChromeShow(true); clearTimeout(t); t = setTimeout(() => setChromeShow(false), 2600); };
    ping();
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setPresent(false); };
    window.addEventListener("mousemove", ping);
    window.addEventListener("touchstart", ping);
    window.addEventListener("keydown", onKey);
    return () => { clearTimeout(t); window.removeEventListener("mousemove", ping); window.removeEventListener("touchstart", ping); window.removeEventListener("keydown", onKey); };
  }, [present]);
  // Independent voice + music levels, adjustable from a little sound panel.
  const [voiceVol, setVoiceVol] = useState<number>(() => { try { const v = localStorage.getItem(YOGA_VOICE_KEY); return v == null ? 0.8 : Number(v); } catch { return 0.8; } });
  const [musicVol, setMusicVol] = useState<number>(() => { try { const v = localStorage.getItem(YOGA_MUSIC_KEY); return v == null ? 0.72 : Number(v); } catch { return 0.72; } });
  const [showVolume, setShowVolume] = useState(false);
  // Pose photo load state — show a soft placeholder until it's ready (and if a
  // slow/failed mobile load never arrives) so the frame is never a blank box.
  const [imgReady, setImgReady] = useState(false);
  const [videoBroken, setVideoBroken] = useState(false);
  useEffect(() => { setImgReady(false); setVideoBroken(false); }, [idx]);
  const narrationRef = useRef<HTMLAudioElement | null>(null); // current pose voice
  const musicRef = useRef<HTMLAudioElement | null>(null);     // looping background bed
  const flowVideoRef = useRef<HTMLVideoElement | null>(null); // the pose clip
  // Keep the pose clip playing at the chosen calm speed (re-applied per pose,
  // since a fresh <video> resets to 1×). Persist the choice.
  useEffect(() => {
    try { localStorage.setItem(YOGA_SPEED_KEY, String(speed)); } catch {}
    const v = flowVideoRef.current; if (v) try { v.playbackRate = speed; } catch {}
  }, [speed, idx, imgReady]);
  // Live-apply + persist the two volumes as the sliders move (honour mute).
  useEffect(() => {
    try { localStorage.setItem(YOGA_MUSIC_KEY, String(musicVol)); } catch {}
    const m = musicRef.current; if (m) try { m.volume = muted ? 0 : musicVol; } catch {}
  }, [musicVol, muted]);
  useEffect(() => {
    try { localStorage.setItem(YOGA_VOICE_KEY, String(voiceVol)); } catch {}
    const nrt = narrationRef.current; if (nrt) try { nrt.volume = muted ? 0 : voiceVol; } catch {}
  }, [voiceVol, muted]);
  const { stop } = useSpeaker();
  const langBcp = LANGS.find((l) => l.id === lang)?.bcp || "en-US";
  // Breath cue is VISUAL only (the ring + label) — no spoken voice.
  const { phase: breathPhase, phaseProgress: breathProgress } = useBreathPacer(running, muted, idx);
  const wakeLockRef = useRef<any>(null);

  // "TV": go full-screen so the flow fills the whole screen cleanly, then show a
  // short guide reminding her to cast/mirror the tab (Chromecast / AirPlay) — that
  // mirrors the entire app *and its sound* to the TV, which works everywhere (no
  // in-app cast receiver needed). The hint auto-dismisses.
  const shareToTV = () => {
    toggleFullscreen();
    setTvHint(true);
    window.setTimeout(() => setTvHint(false), 6500);
  };
  const lastPlayedIdx = useRef<number>(-1);
  const introShownRef = useRef(false); // 5s music-only intro before the first pose's voice
  const midIdx = Math.floor(flow.length / 2);

  const stopAllAudio = () => {
    try { narrationRef.current?.pause(); } catch {}
    try { musicRef.current?.pause(); } catch {}
    stopEndOutro();
    stop();
  };

  // If a previous session's outro is still fading out when a new session opens,
  // silence it so the two never overlap.
  useEffect(() => { stopEndOutro(); }, []);

  // Create + play the music element SYNCHRONOUSLY inside this click (not in an
  // effect/updater, which mobile browsers treat as "not a user gesture" and
  // block). The narration voice is handled by its own effect on `running`.
  const ensureMusic = () => {
    // Adopt the continuous bed started at flow open (intro) so it never restarts.
    if (!musicRef.current) { musicRef.current = startFlowBed(sound); musicRef.current.loop = true; }
    return musicRef.current;
  };
  // Mute/unmute that also pauses or gently resumes the music bed.
  const setMuteState = (n: boolean) => {
    setMuted(n);
    if (n) stopAllAudio();
    else if (running) { try { const m = ensureMusic(); m.volume = 0; m.play().then(() => fadeAudioTo(m, musicVol, 1000)).catch(() => {}); } catch {} }
  };
  const togglePlay = () => {
    const next = !running;
    if (next) {
      if (!muted) {
        try {
          const m = ensureMusic();
          // The bed is already playing from the intro — just settle its volume
          // (no restart). Only fade-from-silence if it was actually paused.
          if (m.paused) { m.volume = 0; m.play().then(() => fadeAudioTo(m, musicVol, 1600)).catch(() => {}); }
          else fadeAudioTo(m, musicVol, 800);
        } catch {}
      }
    }
    else { stopAllAudio(); }
    setRunning(next);
  };

  // Launched via the REC button: enter presentation mode and start playing on
  // mount (behind the intro), so when the intro dissolves it's already recording-ready.
  const recAppliedRef = useRef(false);
  useEffect(() => {
    if (!record || recAppliedRef.current) return;
    recAppliedRef.current = true;
    setChromeShow(true);
    setPresent(true);
    if (!running) togglePlay();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [record]);

  // "Get ready" chrono: zoom in (in) → count 2·1 (count) → glide to corner (fly) →
  // done. Soft ticks pace it; the first hold's timer waits until it's "done".
  useEffect(() => {
    if (!record) return;
    playTick(620);
    const tin = setTimeout(() => setChronoPhase("count"), 440);
    let n = 5;
    const iv = setInterval(() => {
      n -= 1;
      if (n >= 1) { playTick(620); setChrono(n); return; }
      playTick(920); // final "go" tick
      clearInterval(iv);
      setChrono(null);
      setChronoPhase("fly");
      setTimeout(() => setChronoPhase("done"), 640);
    }, 1000);
    return () => { clearInterval(iv); clearTimeout(tin); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [record]);

  // Wake Lock so audio mode keeps screen / audio alive
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        // @ts-ignore
        if ("wakeLock" in navigator) {
          // @ts-ignore
          wakeLockRef.current = await navigator.wakeLock.request("screen");
        }
      } catch {}
    })();
    return () => {
      cancelled = true;
      try { wakeLockRef.current?.release?.(); } catch {}
    };
  }, []);

  // Play THIS pose's recorded narration (no robotic text-to-speech). A soft bell
  // marks the transition, then the voice plays; the previous voice is stopped so
  // two never overlap. Poses without a recording simply stay silent.
  useEffect(() => {
    if (!pose) return;
    try { narrationRef.current?.pause(); } catch {}
    narrationRef.current = null;
    const isNewPose = lastPlayedIdx.current !== idx;
    lastPlayedIdx.current = idx;
    // Nothing plays until the practice is actually running (after Start).
    if (!running || muted) return;
    if (isNewPose) playBell();
    // Music-only guided session: no spoken narration — a soft transition bell
    // marks each pose change, and the visual ring/labels do the coaching.
    if (silentGuide) return;
    const url = poseAudioFor(pose);
    if (!url) return;
    const a = new Audio(url);
    a.volume = voiceVol; // her chosen voice level (music still breathes underneath)
    narrationRef.current = a;
    // First pose of the session: hold the narration ~5s so she can settle in and
    // notice the background music before the voice begins.
    const firstIntro = idx === 0 && !introShownRef.current;
    if (firstIntro) introShownRef.current = true;
    const delay = firstIntro ? 5000 : isNewPose ? 500 : 0;
    const t = setTimeout(() => { a.play().catch(() => {}); }, delay);
    return () => clearTimeout(t);
  }, [idx, muted, running]);

  // One looping music element for the whole session (created lazily in the Start
  // gesture via ensureMusic). It plays continuously and repeats seamlessly; here
  // we only stop it when the player unmounts.
  useEffect(() => () => {
    // Leaving the player must silence EVERYTHING — music, narration, the end
    // outro (module-level) and any speech — so no audio ever lingers behind.
    try { musicRef.current?.pause(); } catch {}
    musicRef.current = null;
    try { narrationRef.current?.pause(); } catch {}
    stopEndOutro();
    try { window.speechSynthesis?.cancel(); } catch {}
  }, []);

  // Timer — counts down THIS pose's own hold (its narration length rounded up).
  useEffect(() => {
    if (!running || chronoPhase !== "done") return; // wait out the get-ready chrono
    setRemaining(poseHold);
    const t = setInterval(() => {
      setRemaining((r) => {
        if (r <= 1) {
          clearInterval(t);
          // advance
          setTimeout(() => {
            setIdx((i) => {
              if (i + 1 >= flow.length) {
                finishSession();
                return i;
              }
              return i + 1;
            });
          }, 300);
          return 0;
        }
        return r - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [idx, running, poseHold, chronoPhase]);

  function finishSession() {
    // Gentle close instead of an abrupt cut: stop the voice, fade the music down,
    // and play a soft end-of-flow outro that continues over the summary screen so
    // she's always told the flow has ended.
    setRunning(false);
    setFinished(true); // keep the last pose on screen with a soft "The End"
    try { narrationRef.current?.pause(); } catch {}
    stop();
    // Keep the background music playing at the SAME flow volume under the outro —
    // no fade-down — so the close feels continuous, not cut short. The music only
    // stops when the player unmounts (on hand-off to the summary).
    // Hold the soft "The End" over the last pose until the outro finishes fully
    // (never cropped), THEN reveal the celebration/summary.
    let handed = false;
    const hand = () => { if (!handed) { handed = true; onDone(); } };
    if (record) {
      // Owner recording: keep the branded Bloomzein outro on screen over the last
      // pose (washed soft pink) and NEVER cut the meditation "namaste" close —
      // hand off only once that audio has played to its natural end (with a
      // minimum hold so the visual reveal always completes), THEN fade the music
      // bed down softly. Nothing is cropped.
      const MIN_OUTRO_MS = 16000; // long enough for get-app → cards activate → subscribe → like to fully play
      const startedAt = Date.now();
      const closeOut = () => {
        try { const m = musicRef.current; if (m) fadeAudioTo(m, 0, 1900); } catch {}
        window.setTimeout(hand, 2000);
      };
      const tryClose = () => {
        const elapsed = Date.now() - startedAt;
        if (elapsed >= MIN_OUTRO_MS) closeOut();
        else window.setTimeout(closeOut, MIN_OUTRO_MS - elapsed);
      };
      if (!muted) playEndOutro(intention, tryClose); // tryClose fires when the audio ENDS — never cropped
      else window.setTimeout(closeOut, MIN_OUTRO_MS);
    } else if (!muted) playEndOutro(intention, hand);
    else window.setTimeout(hand, 6000);
    window.setTimeout(hand, 90000); // last-resort safety net, long enough to never cut the outro
    // streak
    try {
      const raw = localStorage.getItem(STREAK_KEY);
      const prev: Streak = raw ? JSON.parse(raw) : { count: 0, lastISO: null };
      const today = todayISO();
      let next: Streak;
      if (prev.lastISO === today) next = prev;
      else if (prev.lastISO && isYesterday(prev.lastISO)) next = { count: prev.count + 1, lastISO: today };
      else next = { count: 1, lastISO: today };
      localStorage.setItem(STREAK_KEY, JSON.stringify(next));
      window.dispatchEvent(new Event("bloom:yoga-updated"));
    } catch {}
    incrementYogaSession(); // feeds the movement level (logical, real count)
    // Log the flow's calories so yoga counts toward the daily energy balance.
    const practiceMin = Math.max(5, Math.round(flowTotalSec / 60));
    logYogaSession(practiceMin, readDietProfile().weight);
  }

  if (!pose) return null;

  const progress = ((idx + 1) / flow.length) * 100;
  const dim = mode === "audio" && !peek;
  const dayPart = resolveDayPart(intention, skinPref);
  const skin = SESSION_SKINS[dayPart];
  const isDark = dayPart === "night" || dayPart === "dusk";

  const meta = FLOW_META[intention] ?? FLOW_META.morning;
  const quote = FLOW_QUOTES[stepNum % FLOW_QUOTES.length];
  const mantra = FLOW_MANTRAS[stepNum % FLOW_MANTRAS.length];
  const benefit = GROUP_BENEFIT[pose.group];
  const nextPose = flow[idx + 1];
  // Frosted glass — tinted to the current skin so every panel melts into the
  // scene (blended, premium) instead of sitting on top of it as a hard card.
  const glass = isDark
    ? "bg-white/10 backdrop-blur-xl border border-white/15 shadow-lg shadow-black/25"
    : "bg-white/40 backdrop-blur-xl border border-white/60 shadow-lg shadow-rose/10";
  const glassBtn = isDark
    ? "bg-white/15 backdrop-blur-md border border-white/25 text-white active:scale-95 transition"
    : "bg-white/55 backdrop-blur-md border border-white/70 text-rose active:scale-95 transition";

  return createPortal(
    <div className="fixed inset-0 z-[60] overflow-hidden transition-[background] duration-1000"
      style={{ background: skin.frame }}>
      <style>{`.yoga-vol-slider{-webkit-appearance:none;appearance:none;height:7px;border-radius:9999px;accent-color:#EC4899;background:rgba(236,72,153,0.18);outline:none;cursor:pointer}
        .yoga-vol-slider::-webkit-slider-thumb{-webkit-appearance:none;height:18px;width:18px;border-radius:9999px;background:#EC4899;border:3px solid #fff;box-shadow:0 2px 8px rgba(236,72,153,0.45);cursor:pointer;transition:transform .12s}
        .yoga-vol-slider::-webkit-slider-thumb:active{transform:scale(1.18)}
        .yoga-vol-slider::-moz-range-thumb{height:16px;width:16px;border-radius:9999px;background:#EC4899;border:3px solid #fff;box-shadow:0 2px 8px rgba(236,72,153,0.45);cursor:pointer}
        @keyframes bzPoseFade{from{opacity:0}to{opacity:1}}
        .bz-pose-fade{animation:bzPoseFade 1400ms ease-in-out both}
        @keyframes bzSpin{to{transform:rotate(360deg)}}
        @keyframes bzOutroUp{from{opacity:0;transform:translateY(26px)}to{opacity:1;transform:none}}
        .bz-outro-up{animation:bzOutroUp 1100ms cubic-bezier(.16,.84,.34,1) both}
        @keyframes bzBreathe{0%,100%{transform:scale(1)}50%{transform:scale(1.09)}}
        @keyframes bzPetalRise{0%{transform:translateY(30px) rotate(0deg);opacity:0}18%{opacity:.55}100%{transform:translateY(-140px) rotate(180deg);opacity:0}}
        @keyframes bzCardPop{0%{opacity:0;transform:translateY(16px) scale(.7)}60%{opacity:1;transform:translateY(-3px) scale(1.06)}100%{opacity:1;transform:translateY(0) scale(1)}}
        .bz-card-pop{animation:bzCardPop 700ms cubic-bezier(.18,.9,.34,1.2) both}
        @keyframes bzFloat{0%,100%{transform:translateY(0)}50%{transform:translateY(-9px)}}
        @keyframes bzClickCursor{0%{opacity:0;transform:translate(170px,-200px) scale(1)}12%{opacity:1;transform:translate(150px,-180px) scale(1)}40%{transform:translate(46px,-104px) scale(1)}45%{transform:translate(46px,-104px) scale(.78)}51%{transform:translate(46px,-104px) scale(1)}84%{transform:translate(2px,2px) scale(1)}90%{transform:translate(2px,2px) scale(.78)}96%{transform:translate(2px,2px) scale(1)}100%{opacity:1;transform:translate(2px,2px) scale(1)}}
        @keyframes bzHeartBurst{0%{opacity:0;transform:translate(0,0) scale(.4)}18%{opacity:1}100%{opacity:0;transform:translate(var(--dx,0px),-96px) scale(1.15)}}
        @keyframes bzPressRing{0%{opacity:.55;transform:translate(-50%,-50%) scale(.55)}100%{opacity:0;transform:translate(-50%,-50%) scale(1.7)}}
        @keyframes bzCursor3{0%{opacity:0;transform:translate(150px,-150px) scale(1)}10%{opacity:1}26%{transform:translate(2px,-88px) scale(1)}30%{transform:translate(2px,-88px) scale(.76)}34%{transform:translate(2px,-88px) scale(1)}56%{transform:translate(2px,2px) scale(1)}60%{transform:translate(2px,2px) scale(.76)}64%{transform:translate(2px,2px) scale(1)}86%{transform:translate(2px,72px) scale(1)}90%{transform:translate(2px,72px) scale(.76)}94%{transform:translate(2px,72px) scale(1)}100%{opacity:1;transform:translate(2px,72px) scale(1)}}
        @keyframes bzHeartFloat{0%{opacity:0;transform:translate(0,0) scale(.5)}20%{opacity:.95}100%{opacity:0;transform:translate(var(--dx,0px),-120px) scale(1)}}
        @keyframes bzFadeUpSm{0%{opacity:0;transform:translate(-50%,8px) scale(.9)}100%{opacity:1;transform:translate(-50%,0) scale(1)}}
        @keyframes bzFadeIn{from{opacity:0;transform:scale(.94)}to{opacity:1;transform:scale(1)}}
        @keyframes bzChronoIn{0%{opacity:0;transform:scale(2.4)}100%{opacity:1;transform:scale(1)}}
        @keyframes bzChronoPulse{0%,100%{transform:scale(1)}50%{transform:scale(1.09)}}
        @keyframes bzChronoFly{0%{opacity:1;transform:translate(0,0) scale(1)}100%{opacity:0;transform:translate(38vw,-40vh) scale(.42)}}
        @keyframes bzPoseIn{0%{opacity:0;transform:translateY(12px) scale(.9)}55%{opacity:1;transform:translateY(-2px) scale(1.06)}100%{opacity:1;transform:translateY(0) scale(1)}}
        @keyframes bzNextIn{0%{opacity:0;transform:translateY(10px) scale(.95)}60%{transform:translateY(-2px) scale(1.03)}100%{opacity:1;transform:translateY(0) scale(1)}}`}</style>

      {/* "Get ready" chrono — the recording's opener: zooms in big + centred,
          softly counts 2·1 with a tick, then glides toward the ring's corner as
          the first hold starts. Record mode only. */}
      {chronoPhase !== "done" && (
        <div className="pointer-events-none fixed inset-0 z-[60] grid place-items-center">
          <div
            className="flex flex-col items-center justify-center text-center h-60 w-60 rounded-full bg-white/15 backdrop-blur-md border border-white/45 shadow-[0_14px_60px_rgba(236,72,153,0.38)]"
            style={{
              animation:
                chronoPhase === "in" ? "bzChronoIn 440ms cubic-bezier(.16,.84,.34,1) both"
                : chronoPhase === "fly" ? "bzChronoFly 640ms cubic-bezier(.5,0,.2,1) forwards"
                : "bzChronoPulse 1s ease-in-out infinite",
            }}>
            <span className="font-script text-[6.5rem] leading-[0.75] text-hotpink drop-shadow-[0_2px_14px_rgba(255,255,255,0.75)]">{chrono ?? "✿"}</span>
            <span className="mt-2 text-xs font-bold uppercase tracking-[0.3em] text-hotpink/80">get ready</span>
          </div>
        </div>
      )}

      {/* ===================== FULL-BLEED STAGE — the pose fills the whole
          screen; every panel floats over it, blended. ===================== */}
      <div className="absolute inset-0" style={{ background: skin.stage }}>
        {/* Soft placeholder while the media loads — never a blank box. */}
        <div aria-hidden className={["absolute inset-0 grid place-items-center bg-[oklch(0.96_0.04_350)] animate-card-breathe transition-opacity duration-700", imgReady ? "opacity-0" : "opacity-100"].join(" ")}>
          <Flower className="h-16 w-16 text-hotpink/25" strokeWidth={1.5} />
        </div>
        {/* Hypnotic ripples underneath the blurred photo — soft ambient motion. */}
        {Array.from({ length: 8 }).map((_, i) => (
          <span
            key={i}
            aria-hidden
            className="pointer-events-none absolute left-1/2 top-1/2 w-[46%] aspect-square rounded-full animate-ripple"
            style={{
              animationDelay: `${-i * 2.4}s`,
              background:
                `radial-gradient(circle, transparent 42%, rgba(${skin.ripple},0.30) 62%, rgba(${skin.ripple},0.40) 74%, rgba(${skin.ripple},0.26) 84%, transparent 97%)`,
            }}
          />
        ))}
        {/* Blurred cover fill of the same photo — softly breathing, bleeds to every
            edge so the sharp pose blends seamlessly into the scene. */}
        <img
          key={idx + "-bg"}
          src={pose.image}
          alt=""
          aria-hidden
          onLoad={() => setImgReady(true)}
          className={["absolute inset-0 w-full h-full object-cover animate-ambient-breathe transition-opacity ease-in-out duration-[1600ms] will-change-transform", imgReady ? "opacity-90" : "opacity-0"].join(" ")}
          style={{ filter: `blur(26px) saturate(1.2) ${skin.imgFilter === "none" ? "" : skin.imgFilter}` }}
        />
        {/* Skin-tinted veil + time-of-day mood wash. */}
        <div aria-hidden className="absolute inset-0 transition-colors duration-1000" style={{ background: skin.veil }} />
        <div aria-hidden className="pointer-events-none absolute inset-0 transition-opacity duration-1000" style={{ background: skin.overlay }} />
        {/* Night sky — soft drifting stars behind the pose. */}
        {dayPart === "night" && (
          <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
            {([[6,18,2.5,0,8],[10,72,2,2.5,9.5],[14,45,2,5,8.5],[8,88,1.5,1.2,10],[20,10,2,3.8,9],[16,60,2.5,6.2,8],[24,80,1.5,0.6,10.5],[12,32,1.5,4.5,9],[26,52,2,7,8.5],[5,55,1.5,2,11],[80,20,2,1.5,9],[86,68,2.5,4,8],[78,42,1.5,6.5,10],[90,85,2,0.3,9.5],[83,12,1.5,3,10.5],[88,55,2,5.5,8.5]] as const).map(([t, l, s, d, dur], i) => (
              <span
                key={i}
                className="absolute rounded-full animate-twinkle"
                style={{
                  top: `${t}%`, left: `${l}%`, width: `${s}px`, height: `${s}px`,
                  background: "rgba(255,255,255,0.95)",
                  boxShadow: "0 0 6px 1.5px rgba(200,212,255,0.85)",
                  animationDelay: `${d}s`, animationDuration: `${dur}s`,
                }}
              />
            ))}
          </div>
        )}
        {/* The sharp pose — big, whole, centred. The still is ALWAYS the base
            layer (so the pose appears instantly and never blanks if the clip is
            slow or fails to load); the flow clip plays on top when it's ready. */}
        <img
          key={idx + "-sharp"}
          src={pose.image}
          alt={pose.name}
          onLoad={() => setImgReady(true)}
          onError={() => setImgReady(false)}
          className={["bz-pose-fade absolute inset-0 w-full h-full object-cover object-center drop-shadow-[0_10px_40px_rgba(236,72,153,0.20)]", pose.switchStep ? "scale-x-[-1]" : ""].join(" ")}
          style={{ filter: skin.imgFilter === "none" ? undefined : skin.imgFilter }}
        />
        {pose.video && !videoBroken && (
          <video
            key={idx + "-clip"}
            ref={flowVideoRef}
            src={pose.video}
            poster={pose.poster ?? pose.image}
            autoPlay loop={!pose.hold} muted playsInline preload="auto"
            aria-label={pose.name}
            onError={() => setVideoBroken(true)}
            className={["bz-pose-fade absolute inset-0 w-full h-full object-cover object-center drop-shadow-[0_10px_40px_rgba(236,72,153,0.20)]", pose.switchStep ? "scale-x-[-1]" : ""].join(" ")}
            style={{ filter: skin.imgFilter === "none" ? undefined : skin.imgFilter }}
          />
        )}
        {/* Gentle "other side" cue at the start of a second-side step. */}
        {pose.switchStep && (holdFor(pose) - remaining) < 2.6 && (
          <div className="pointer-events-none absolute inset-0 z-20 grid place-items-center animate-fade-in">
            <div className="text-center px-5 py-3 rounded-[1.5rem] bg-white/70 backdrop-blur-md border border-white/70 shadow-lg animate-scale-in">
              <div className="text-3xl sm:text-4xl text-hotpink animate-spin" style={{ animationDuration: "1.8s" }}>↺</div>
              <p className="mt-1 font-script text-2xl sm:text-3xl text-hotpink leading-none">Other side</p>
              <p className="text-[11px] font-semibold text-rose/70">ease gently over ✿</p>
            </div>
          </div>
        )}
        {/* Preload the next pose so transitions stay instant. */}
        {nextPose && <img src={nextPose.image} alt="" aria-hidden className="hidden" />}
      </div>

      {/* Soft focus vignette so floating text always stays legible over bright poses. */}
      <div aria-hidden className="pointer-events-none absolute inset-0"
        style={{ background: isDark
          ? "radial-gradient(130% 90% at 50% 42%, transparent 52%, rgba(0,0,0,0.32))"
          : "radial-gradient(130% 90% at 50% 42%, transparent 58%, rgba(120,40,80,0.12))" }} />

      {/* Audio eyes-closed mode — pose fades back, breath pacer front & centre. */}
      {dim && (
        <div className="absolute inset-0 z-30 grid place-items-center" style={{ background: "rgba(120,30,70,0.82)" }}>
          <BreathPacer phase={breathPhase} phaseProgress={breathProgress} lang={lang} dim={true} />
        </div>
      )}

      {/* Breath-guide overlay — opened from the "Breath" control. */}
      {breathOpen && !dim && (
        <div onClick={() => setBreathOpen(false)}
          className="absolute inset-0 z-40 grid place-items-center animate-fade-in cursor-pointer"
          style={{ background: isDark ? "rgba(18,14,40,0.55)" : "rgba(255,241,246,0.55)", backdropFilter: "blur(4px)" }}>
          <BreathPacer phase={breathPhase} phaseProgress={breathProgress} lang={lang} dim={isDark} />
        </div>
      )}

      {/* Soft "The End" — a faded wash over the last pose while the outro plays. */}
      {finished && !record && (
        <div
          onClick={() => { stopAllAudio(); onDone(); }}
          className="absolute inset-0 z-[70] grid place-items-center animate-fade-in cursor-pointer"
          style={{ background: "linear-gradient(160deg, oklch(0.9 0.07 350 / 0.5), oklch(0.82 0.11 345 / 0.46))", backdropFilter: "blur(1.5px)" }}
        >
          <div className="text-center animate-scale-in px-6">
            <p className="animate-wk-end-breathe font-script text-white leading-none drop-shadow-[0_6px_30px_oklch(0.5_0.28_350/0.8)]" style={{ fontSize: "clamp(3rem, 14vw, 8rem)" }}>The&nbsp;End&nbsp;✿</p>
            <p className="mt-3 font-semibold uppercase tracking-[0.34em] text-white/85 text-xs sm:text-sm">Namaste</p>
          </div>
        </div>
      )}

      {/* ===== BLOOMZEIN FLOW OUTRO — the branded "wow" close, captured straight
          into the recording (owner REC only). Center stack; the bottom-right
          quadrant is kept intentionally clear as the YouTube end-screen zone. ===== */}
      {finished && record && (
        <div
          className="absolute inset-0 z-[80] overflow-hidden animate-fade-in"
          style={{ background: "linear-gradient(165deg, oklch(0.94 0.06 350 / 0.44), oklch(0.85 0.12 346 / 0.5) 55%, oklch(0.79 0.14 344 / 0.56))" }}
        >
          {/* Soft center glow — keeps the wordmark legible without blurring the
              whole scene, so the woman/pose still reads clearly behind. */}
          <div aria-hidden className="pointer-events-none absolute inset-0" style={{ background: "radial-gradient(52% 44% at 50% 46%, rgba(255,255,255,0.55), transparent 72%)" }} />
          {/* ambient drifting petals — soft continuous motion, never a static frame */}
          {Array.from({ length: 12 }).map((_, i) => (
            <span
              key={i}
              aria-hidden
              className="pointer-events-none absolute rounded-full"
              style={{
                left: `${(i * 8.3 + 5) % 96}%`,
                bottom: "-6%",
                width: `${10 + (i % 4) * 5}px`,
                height: `${10 + (i % 4) * 5}px`,
                background: "radial-gradient(circle at 35% 30%, #fff, #F9A8D4 70%, #EC4899)",
                filter: "blur(0.3px)",
                opacity: 0,
                animation: `bzPetalRise ${8 + (i % 5) * 1.6}s ease-in-out ${i * 0.7}s infinite`,
              }}
            />
          ))}

          {/* App-preview cards — the SAME rich image cards as the welcome screen.
              They stay HIDDEN until the cursor taps "get the app" (~7s), then
              cascade in one-by-one — the "you activated something" effect. Bottom
              rows sit higher so nothing feels cropped. */}
          {[
            { t: "Understand your rhythm", img: "/images/setup-cycle.webp", Icon: CircleDot, side: "left", top: "6%", edge: "2.5%", d: 7.0 },
            { t: "Move your body", img: "/images/workout-hero-session.webp", Icon: Activity, side: "left", top: "30%", edge: "5%", d: 7.5 },
            { t: "Nourish yourself", img: "/images/setup-meals.webp", Icon: Utensils, side: "left", top: "53%", edge: "2%", d: 8.0 },
            { t: "Build better habits", img: "/images/setup-goal.webp", Icon: CircleCheck, side: "left", top: "72%", edge: "6%", d: 8.5 },
            { t: "Clear your mind", img: "/images/welcome-mind.webp", Icon: Moon, side: "right", top: "7%", edge: "3%", d: 7.25 },
            { t: "Feel more in control", img: "/images/read-money.webp", Icon: Sparkles, side: "right", top: "30%", edge: "5%", d: 7.75 },
            { t: "Remember what matters", img: "/images/welcome-remember.webp", Icon: Calendar, side: "right", top: "53%", edge: "2%", d: 8.25 },
            { t: "Take care of yourself", img: "/images/read-selfcare.webp", Icon: Waves, side: "right", top: "72%", edge: "6%", d: 8.75 },
          ].map((c, i) => {
            const Icon = c.Icon;
            return (
              // Outer wrapper floats gently (continuous bob); inner card pops in.
              <div
                key={c.t}
                className="hidden md:block absolute z-[6]"
                style={{ [c.side]: c.edge, top: c.top, animation: `bzFloat ${4.5 + (i % 4) * 0.8}s ease-in-out ${0.3 + i * 0.35}s infinite` } as React.CSSProperties}
              >
                <article
                  className="w-[9.5rem] lg:w-44 rounded-2xl bg-white/85 backdrop-blur-md border border-white/80 shadow-xl shadow-rose/15 overflow-hidden bz-card-pop"
                  style={{ animationDelay: `${c.d}s` }}
                >
                  <div className="flex items-center gap-2 px-2.5 pt-2.5 pb-1.5">
                    <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-gradient-to-br from-hotpink to-[#BE185D] text-white shadow-sm"><Icon className="h-3.5 w-3.5" strokeWidth={2.4} /></span>
                    <b className="text-[12px] leading-tight text-rose">{c.t}</b>
                  </div>
                  <div className="mx-2.5 mb-2.5 h-16 lg:h-20 rounded-xl overflow-hidden bg-blush">
                    <img src={c.img} alt="" loading="lazy" className="h-full w-full object-cover" />
                  </div>
                </article>
              </div>
            );
          })}

          <div className="absolute inset-0 grid place-items-center px-8 text-center">
            <div className="-mt-[2vh] flex flex-col items-center">
              {/* "Session complete" — a calm, unmistakable close marker */}
              <span className="inline-flex items-center gap-2 rounded-full bg-white/80 backdrop-blur-md border border-white/80 px-4 py-1.5 text-hotpink font-bold text-[13px] shadow-lg shadow-rose/15 bz-outro-up"
                style={{ animationDelay: "0.2s" }}>
                <CircleCheck className="h-4 w-4" strokeWidth={2.6} /> Session complete
              </span>

              {/* brand bloom — all-pink flower, breathing + rotating */}
              <span className="mt-[1.6vh] grid place-items-center bz-outro-up" style={{ animationDelay: "0.6s", animation: "bzBreathe 4.6s ease-in-out infinite", filter: "drop-shadow(0 8px 26px rgba(190,24,93,0.35))" }}>
                <BloomFlower size={120} petal="#EC4899" center="#BE185D" style={{ animation: "bzSpin 16s linear infinite" }} />
              </span>

              {/* BIG script wordmark — matches the welcome-screen logo font */}
              <p className="mt-[1.4vh] font-script leading-none text-hotpink bz-outro-up" style={{ animationDelay: "1s", fontSize: "clamp(3.6rem,12vw,8rem)", textShadow: "0 2px 22px rgba(255,255,255,0.8)" }}>
                Bloomzein
              </p>
              <p className="mt-[1vh] font-semibold tracking-wide text-rose/85 bz-outro-up" style={{ animationDelay: "1.6s", fontSize: "clamp(0.9rem,2.5vw,1.25rem)", textShadow: "0 1px 8px rgba(255,255,255,0.7)" }}>
                stay soft, bloom on. ✿
              </p>

              {/* session stats — a soft sense of accomplishment, meditation close */}
              <p className="mt-[1.2vh] font-bold uppercase tracking-[0.16em] text-hotpink/80 bz-outro-up" style={{ animationDelay: "1.9s", fontSize: "clamp(0.62rem,1.6vw,0.8rem)", textShadow: "0 1px 6px rgba(255,255,255,0.7)" }}>
                {Math.max(1, Math.round(flowTotalSec / 60))} min · {realTotal} poses · Namaste ✿
              </p>

              {/* reworded closing line — sits under the brand (moved down) */}
              <p className="mt-[1.8vh] font-script text-rose leading-none bz-outro-up" style={{ animationDelay: "2.2s", fontSize: "clamp(1.5rem,4.4vw,2.9rem)", textShadow: "0 2px 16px rgba(255,255,255,0.6)" }}>
                You showed up for yourself today ✿
              </p>

              {/* call to action — get the app (catchy: gradient pill, sparkle icon,
                  script font). The cursor taps this to "activate" the cards. */}
              <span className="relative mt-[2.6vh] inline-flex items-center gap-2.5 rounded-full text-white bz-outro-up shadow-xl shadow-hotpink/40 px-6 py-3"
                style={{ animationDelay: "3s", background: "linear-gradient(90deg, #FB7EA8, #EC4899)" }}>
                <Sparkles className="h-5 w-5 shrink-0" strokeWidth={2.2} />
                <span className="font-script leading-none" style={{ fontSize: "clamp(1.4rem,4.2vw,2.1rem)", textShadow: "0 2px 10px rgba(120,8,60,0.3)" }}>Get the Bloomzein app ✿</span>
              </span>

              {/* Subscribe → Subscribed, a Like button, gentle hearts, and the cute
                  cursor that clicks through it all — the "wow" that nudges viewers. */}
              <div className="relative mt-[2.6vh] bz-outro-up" style={{ animationDelay: "3.6s" }}>
                {/* button + its "Subscribed" overlay breathe together */}
                <div className="relative inline-block align-middle" style={{ animation: "bzBreathe 2.4s ease-in-out infinite" }}>
                  <span className="inline-flex items-center gap-3 rounded-full px-8 py-3.5 text-white shadow-xl shadow-hotpink/45"
                    style={{ background: "linear-gradient(90deg, #EC4899, #BE185D)" }}>
                    <Heart className="h-6 w-6 shrink-0" fill="currentColor" strokeWidth={0} />
                    <span className="font-script leading-none" style={{ fontSize: "clamp(1.7rem,5vw,2.8rem)", textShadow: "0 2px 12px rgba(120,8,60,0.35)" }}>Subscribe</span>
                    <span className="font-semibold tracking-wide leading-tight" style={{ fontSize: "clamp(0.78rem,1.9vw,1rem)" }}>for a new<br />flow every week ♡</span>
                  </span>
                  {/* the button turns into "Subscribed" once clicked (~9s) */}
                  <span aria-hidden className="absolute inset-0 flex items-center justify-center gap-2.5 rounded-full text-white"
                    style={{ background: "linear-gradient(90deg, #DB2777, #9D174D)", opacity: 0, animation: "bzFadeIn 500ms ease-out 9s both" }}>
                    <CircleCheck className="h-7 w-7 shrink-0" strokeWidth={2.6} />
                    <span className="font-script leading-none" style={{ fontSize: "clamp(1.7rem,5vw,2.8rem)", textShadow: "0 2px 12px rgba(120,8,60,0.35)" }}>Subscribed</span>
                  </span>
                </div>

                {/* Like button below — the cursor taps it (~11.1s) */}
                <span className="absolute left-1/2 -translate-x-1/2 top-full mt-3 inline-flex items-center gap-1.5 rounded-full bg-white/85 backdrop-blur-md border border-white/80 px-4 py-1.5 text-hotpink font-bold text-[13px] shadow-lg shadow-rose/15 bz-outro-up"
                  style={{ animationDelay: "7.4s" }}>
                  <Heart className="h-4 w-4" fill="currentColor" strokeWidth={0} /> Like
                </span>

                {/* a FEW cute hearts float up gently after the Like tap (~11.1s) */}
                {[-26, -8, 12, 28].map((dx, i) => (
                  <span key={i} aria-hidden className="pointer-events-none absolute left-1/2 top-full mt-6 text-hotpink"
                    style={{ ["--dx" as string]: `${dx}px`, fontSize: "18px", animation: `bzHeartFloat 2.4s ease-out ${11.1 + i * 0.22}s both` }}>♥</span>
                ))}

                {/* the cute pink cursor — taps get-the-app, clicks Subscribe, then Like */}
                <span aria-hidden className="pointer-events-none absolute left-1/2 top-1/2 z-[95]" style={{ animation: "bzCursor3 7s cubic-bezier(.5,0,.25,1) 4.8s both", filter: "drop-shadow(0 3px 6px rgba(120,8,60,0.4))" }}>
                  <svg width="38" height="42" viewBox="0 0 38 42" fill="none">
                    <path d="M6 4 L6 33 L13.5 25.5 L19 39 L25 36 L19.5 22.5 L31 22 Z" fill="#fff" stroke="#EC4899" strokeWidth="2.6" strokeLinejoin="round" />
                  </svg>
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TV guide — after full-screen, remind her to cast/mirror the whole tab. */}
      {tvHint && (
        <div className="fixed inset-x-0 top-4 z-[80] flex justify-center px-4 animate-fade-in pointer-events-none">
          <div onClick={() => setTvHint(false)}
            className="pointer-events-auto max-w-sm rounded-2xl bg-white/95 backdrop-blur-md px-4 py-3 shadow-lg border border-petal/60 text-center cursor-pointer">
            <p className="flex items-center justify-center gap-1.5 text-sm font-bold text-rose">
              <Tv className="h-4 w-4" /> Sur la TV
            </p>
            <p className="mt-1 text-xs leading-snug text-rose/70">
              Recopie l'onglet / l'écran (Chromecast · AirPlay) — tout le flow <em>et le son</em> passent sur ta TV.
            </p>
          </div>
        </div>
      )}

      {/* ===================== TOP BAR ===================== */}
      {!present && !finished && (
      <div className="absolute inset-x-0 top-0 z-20 flex items-start justify-between gap-2 sm:gap-3 px-3 sm:px-5 pb-2"
        style={{ paddingTop: "max(0.75rem, env(safe-area-inset-top))" }}>
        <button onClick={() => { stopAllAudio(); onExit(); }}
          className={["inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-semibold", glassBtn].join(" ")}>
          <X className="h-3.5 w-3.5" /> End
        </button>
        {/* Desktop keeps the progress in the bar; mobile moves it below (see mobile block). */}
        <div className="hidden lg:block flex-1 max-w-md mx-auto mt-1">
          <p className="text-center text-[9px] font-bold uppercase tracking-[0.28em] mb-1" style={{ color: skin.inkSoft }}>Flow progress</p>
          <div className="relative h-1.5 rounded-full overflow-hidden" style={{ background: isDark ? "rgba(255,255,255,0.22)" : "rgba(255,255,255,0.55)" }}>
            <div className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-petal to-hotpink transition-all duration-500" style={{ width: `${progress}%` }} />
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="hidden sm:block text-[11px] font-bold tabular-nums self-center mr-1" style={{ color: skin.ink }}>{stepNum} / {realTotal}</span>
          <button onClick={shareToTV} title="Plein écran — puis recopie l'onglet sur la TV (Chromecast / AirPlay)"
            className={["grid h-9 w-9 place-items-center rounded-full", glassBtn].join(" ")}>
            <Tv className="h-4 w-4" />
          </button>
          <button onClick={cycleSkin} title={`Theme: ${skinPref === "auto" ? `auto (${dayPart})` : skinPref}`}
            className={["inline-flex items-center gap-1 rounded-full px-2.5 h-9 text-[10px] font-bold uppercase tracking-wide", glassBtn].join(" ")}>
            {isDark ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
            {skinPref === "auto" && <span className="opacity-70">auto</span>}
          </button>
          <button onClick={() => { setShowSpeed((s) => !s); setShowVolume(false); }} title="Playback speed"
            className={["inline-flex items-center gap-1 rounded-full px-2.5 h-9 text-[11px] font-bold tabular-nums", showSpeed ? "ring-2 ring-hotpink/50 " : "", glassBtn].join(" ")}>
            <Gauge className="h-4 w-4" />{speed}×
          </button>
          <button onClick={() => { setShowVolume((s) => !s); setShowSpeed(false); }} title="Sound levels"
            className={["grid h-9 w-9 place-items-center rounded-full", showVolume ? "ring-2 ring-hotpink/50 " : "", glassBtn].join(" ")}>
            {muted || (voiceVol === 0 && musicVol === 0) ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
          </button>
          <button onClick={() => { setShowSpeed(false); setShowVolume(false); if (!running) togglePlay(); setChromeShow(true); setPresent(true); }}
            title="Presentation mode — hide controls & show the logo (for recording)"
            className={["grid h-9 w-9 place-items-center rounded-full", glassBtn].join(" ")}>
            <Video className="h-4 w-4" />
          </button>
          {isOwner && (
            <button onClick={() => { setShowSpeed(false); setShowVolume(false); if (!running) togglePlay(); setChromeShow(true); setPresent(true); try { toggleFullscreen(); } catch {} }}
              title="Record for YouTube — presentation mode, play & fullscreen in one tap"
              className="inline-flex items-center gap-1 rounded-full bg-red-600 text-white px-3 h-9 text-[11px] font-black tracking-wide shadow-md shadow-red-600/30 active:scale-95 transition">
              <Video className="h-4 w-4" /> REC
            </button>
          )}
        </div>
      </div>
      )}

      {/* Tap-away catcher for the top-right popovers */}
      {(showSpeed || showVolume) && (
        <div className="fixed inset-0 z-30" onClick={() => { setShowSpeed(false); setShowVolume(false); }} />
      )}

      {/* ===================== SPEED SELECTOR (popover) ===================== */}
      {showSpeed && (
        <div className={["absolute right-4 sm:right-5 top-16 sm:top-20 z-40 w-44 rounded-2xl p-3 animate-scale-in", glass].join(" ")}>
          <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: skin.inkSoft }}>
            <Gauge className="h-3.5 w-3.5" /> Pace
          </p>
          <div className="grid grid-cols-3 gap-1.5">
            {[0.5, 0.7, 1].map((s) => (
              <button key={s} onClick={() => { setSpeed(s); }}
                className={["rounded-xl py-2 text-sm font-bold tabular-nums transition active:scale-95",
                  speed === s ? "bg-gradient-to-br from-petal to-hotpink text-white shadow-md shadow-hotpink/25" : glassBtn].join(" ")}>
                {s}×
              </button>
            ))}
          </div>
          <p className="mt-2 text-[10px] leading-snug text-center" style={{ color: skin.inkSoft }}>Slower = calmer, breath-paced</p>
        </div>
      )}

      {/* ===================== SOUND LEVELS (popover) ===================== */}
      {showVolume && (
        <div className={["absolute right-4 sm:right-5 top-16 sm:top-20 z-40 w-64 rounded-2xl p-4 animate-scale-in", glass].join(" ")}>
          <div className="flex items-center justify-between mb-3">
            <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider" style={{ color: skin.inkSoft }}>
              <Music className="h-3.5 w-3.5" /> Sound
            </p>
            <button onClick={() => setMuteState(!muted)}
              className={["inline-flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-bold uppercase tracking-wide", glassBtn].join(" ")}>
              {muted ? <><VolumeX className="h-3 w-3" /> Muted</> : <><Volume2 className="h-3 w-3" /> On</>}
            </button>
          </div>
          {([
            { label: "Voice", Icon: Headphones, val: voiceVol, set: setVoiceVol },
            { label: "Music", Icon: Music, val: musicVol, set: setMusicVol },
          ] as const).map(({ label, Icon, val, set }) => (
            <div key={label} className="mb-3 last:mb-0">
              <div className="flex items-center justify-between text-[11px] font-semibold mb-1" style={{ color: skin.ink }}>
                <span className="flex items-center gap-1.5"><Icon className="h-3.5 w-3.5" style={{ color: "#EC4899" }} /> {label}</span>
                <span className="tabular-nums" style={{ color: skin.inkSoft }}>{Math.round(val * 100)}%</span>
              </div>
              <input type="range" min={0} max={1} step={0.01} value={val}
                onChange={(e) => { if (muted) setMuteState(false); set(Number(e.target.value)); }}
                className="yoga-vol-slider w-full"
                style={{ accentColor: "#EC4899", opacity: muted ? 0.5 : 1 }} />
            </div>
          ))}
        </div>
      )}

      {/* ===================== LEFT RAIL (desktop) ===================== */}
      {/* On very wide / foldable screens the rail hugs a centred ~96rem frame
          instead of the raw viewport edge, so panels stay grouped, not scattered. */}
      {!dim && !finished && (
        <div className="hidden lg:flex flex-col gap-3 absolute top-20 w-64 z-20" style={{ left: "max(1.25rem, calc((100vw - 96rem) / 2))" }}>
          <div className={["rounded-3xl p-4 animate-fade-in", glass].join(" ")}>
            <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider" style={{ color: skin.inkSoft }}>
              <Flower className="h-3.5 w-3.5" /> Today's Flow
            </p>
            <div style={{ color: skin.ink }}>
              <AnimatedWords text={meta.title} stagger={90} className="font-script text-3xl leading-tight mt-1 block" />
            </div>
            <p className="text-sm mt-1" style={{ color: skin.inkSoft }}>{meta.tagline}</p>
            <div className="my-3 h-px" style={{ background: isDark ? "rgba(255,255,255,0.14)" : "rgba(190,24,93,0.14)" }} />
            <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: skin.inkSoft }}>Focus</p>
            <p className="text-sm font-semibold" style={{ color: skin.ink }}>{meta.focus.join(" · ")}</p>
          </div>
          <div className={["rounded-3xl p-4 animate-fade-in", glass].join(" ")} style={{ animationDelay: "80ms" }}>
            <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: skin.inkSoft }}>How you may feel</p>
            <p className="text-sm font-semibold mb-2" style={{ color: skin.ink }}>After this flow</p>
            <ul className="space-y-1.5">
              {meta.feel.map(({ icon: Icon, label }, i) => (
                <li key={i} className="flex items-center gap-2 text-sm animate-fade-in" style={{ color: skin.ink, animationDelay: `${150 + i * 70}ms` }}>
                  <Icon className="h-3.5 w-3.5 shrink-0" style={{ color: "#EC4899" }} /> {label}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* ===================== RIGHT RAIL (desktop only) ============ */}
      {!dim && !finished && (
        <div className="hidden lg:flex absolute top-24 sm:top-28 z-20 flex-col items-end gap-3" style={{ right: "max(1.25rem, calc((100vw - 96rem) / 2))" }}>
          <div className={["hidden lg:block w-64 rounded-3xl p-4 animate-fade-in", glass].join(" ")}>
            <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider" style={{ color: skin.inkSoft }}>
              <Activity className="h-3.5 w-3.5" /> Pose
            </p>
            <h3 key={idx} className="font-script text-2xl leading-tight mt-0.5" style={{ color: skin.ink, animation: "bzPoseIn 620ms cubic-bezier(.18,.9,.34,1.2) both" }}>{pose.name}{pose.switchStep ? " ↺" : ""}</h3>
            {pose.sanskrit && <p className="text-xs italic" style={{ color: skin.inkSoft }}>{pose.sanskrit}</p>}
            <div className="my-2.5 h-px" style={{ background: isDark ? "rgba(255,255,255,0.14)" : "rgba(190,24,93,0.14)" }} />
            <p className="text-sm leading-snug" style={{ color: skin.inkSoft }}>{benefit}</p>
          </div>
          <div className={["rounded-full p-1.5 animate-scale-in", glass].join(" ")}>
            <HoldRing remaining={remaining} total={poseHold} ink={skin.ink} inkSoft={skin.inkSoft} />
          </div>
          {nextPose && (
            <div key={`${idx}:${chronoPhase}`} className={["hidden lg:block w-64 rounded-3xl p-3", glass].join(" ")}
              style={{ animation: "bzNextIn 640ms cubic-bezier(.18,.9,.34,1.2) both" }}>
              <p className="text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color: skin.inkSoft }}>Up next</p>
              <div className="flex items-center gap-3">
                <img src={nextPose.poster ?? nextPose.image} alt="" className="h-14 w-20 rounded-xl object-cover shrink-0 border border-white/50" />
                <div className="min-w-0">
                  <p className="font-semibold text-sm truncate" style={{ color: skin.ink }}>{nextPose.name}</p>
                  <p className="text-xs" style={{ color: skin.inkSoft }}>{holdFor(nextPose)}s</p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ===================== MOBILE: Up-next + ring row, then a slim progress bar ===================== */}
      {!dim && !finished && (
        <div className="lg:hidden absolute inset-x-3 z-20 flex flex-col gap-2"
          style={{ top: "calc(max(0.75rem, env(safe-area-inset-top)) + 2.9rem)" }}>
          <div className="flex items-center gap-2.5">
            {nextPose ? (
              <div key={`${idx}:${chronoPhase}`} className={["flex-1 min-w-0 rounded-2xl p-2 flex items-center gap-2.5", glass].join(" ")}
                style={{ animation: "bzNextIn 640ms cubic-bezier(.18,.9,.34,1.2) both" }}>
                <img src={nextPose.poster ?? nextPose.image} alt="" className="h-14 w-16 rounded-xl object-cover shrink-0 border border-white/50" />
                <div className="min-w-0">
                  <p className="text-[9px] font-bold uppercase tracking-wider" style={{ color: skin.inkSoft }}>Up next</p>
                  <p className="font-semibold text-sm leading-tight truncate" style={{ color: skin.ink }}>{nextPose.name}</p>
                  <p className="text-[11px]" style={{ color: skin.inkSoft }}>{holdFor(nextPose)}s</p>
                </div>
              </div>
            ) : <div className="flex-1" />}
            <div className={["rounded-full p-1 shrink-0 animate-scale-in", glass].join(" ")}>
              <HoldRing remaining={remaining} total={poseHold} ink={skin.ink} inkSoft={skin.inkSoft} />
            </div>
          </div>
          <div className={["flex items-center gap-2 rounded-full px-3 py-1.5 animate-fade-in", glass].join(" ")}>
            <span className="text-[9px] font-bold uppercase tracking-[0.2em] shrink-0" style={{ color: skin.inkSoft }}>Flow</span>
            <div className="relative h-1 flex-1 rounded-full overflow-hidden" style={{ background: isDark ? "rgba(255,255,255,0.22)" : "rgba(255,255,255,0.55)" }}>
              <div className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-petal to-hotpink transition-all duration-500" style={{ width: `${progress}%` }} />
            </div>
            <span className="text-[10px] font-bold tabular-nums shrink-0" style={{ color: skin.ink }}>{stepNum}/{realTotal}</span>
          </div>
        </div>
      )}

      {/* ===================== FLOW QUOTE (bottom-right, tablet+) ========== */}
      {!dim && !finished && (
        <div className="hidden md:block absolute bottom-3 z-10 w-60 lg:w-64 pointer-events-none" style={{ right: "max(1rem, calc((100vw - 96rem) / 2))" }}>
          <div key={idx} className={["rounded-2xl px-4 py-3 text-center animate-fade-in", glass].join(" ")}>
            <p className="font-script text-lg leading-snug" style={{ color: skin.ink }}>“{quote}”</p>
          </div>
        </div>
      )}

      {/* ===================== POSE NAME (mobile) ===================== */}
      {!dim && !finished && (
        <div className="lg:hidden absolute left-4 right-4 bottom-36 z-20 pointer-events-none">
          <div key={idx} className="animate-pose-in">
            <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: skin.inkSoft }}>
              Pose {stepNum} of {realTotal}{pose.switchStep ? " · other side" : ""}
            </p>
            <h3 className="font-script text-4xl leading-none" style={{ color: skin.ink, animation: "bzPoseIn 640ms cubic-bezier(.18,.9,.34,1.2) both" }}>{pose.name}{pose.switchStep ? " ↺" : ""}</h3>
            {pose.sanskrit && <p className="text-xs italic" style={{ color: skin.inkSoft }}>{pose.sanskrit}</p>}
          </div>
        </div>
      )}

      {/* ===================== CONTROLS + MANTRA (bottom-left on desktop) === */}
      <div className="absolute bottom-0 inset-x-0 lg:inset-x-auto lg:left-[max(1.25rem,calc((100vw_-_96rem)/2))] z-20 flex flex-col items-center lg:items-start gap-2 px-3"
        style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}>
        {!present && !finished && (
        <div className={["flex items-center gap-1.5 sm:gap-2 rounded-full p-1.5 animate-fade-in", glass].join(" ")}>
          <button onClick={() => setIdx((i) => Math.max(0, i - 1))}
            className={["inline-flex items-center gap-1 rounded-full px-3 py-2 text-xs font-semibold", glassBtn].join(" ")}>
            <ChevronLeft className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Previous</span>
          </button>
          <button onClick={togglePlay}
            className="relative grid h-14 w-14 place-items-center rounded-full bg-gradient-to-br from-petal to-hotpink text-white shadow-lg shadow-hotpink/30 animate-selected-glow active:scale-95 transition">
            {running ? <Pause className="h-6 w-6" /> : <Play className="h-6 w-6 ml-0.5" />}
            <span className="absolute -bottom-4 text-[9px] font-bold uppercase tracking-wide" style={{ color: skin.inkSoft }}>{running ? "Pause" : (idx === 0 && remaining === poseHold ? "Start" : "Resume")}</span>
          </button>
          <button onClick={() => { if (idx + 1 >= flow.length) finishSession(); else setIdx((i) => i + 1); }}
            className={["inline-flex items-center gap-1 rounded-full px-3 py-2 text-xs font-semibold", glassBtn].join(" ")}>
            <span className="hidden sm:inline">Next</span> <SkipForward className="h-3.5 w-3.5" />
          </button>
          {mode === "audio" ? (
            <button onClick={() => setPeek((p) => !p)}
              className={["inline-flex items-center gap-1 rounded-full px-3 py-2 text-xs font-semibold", glassBtn].join(" ")}>
              {peek ? <><EyeOff className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Hide</span></> : <><Eye className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Peek</span></>}
            </button>
          ) : (
            <button onClick={() => setBreathOpen((b) => !b)}
              className={["inline-flex items-center gap-1 rounded-full px-3 py-2 text-xs font-semibold", glassBtn].join(" ")}>
              <Waves className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Breath</span>
            </button>
          )}
        </div>
        )}
        {!present && !finished && (
        <div className={["w-full max-w-lg lg:w-[26rem] rounded-full px-4 py-2 text-center lg:text-left animate-fade-in", glass].join(" ")}>
          <p className="flex items-center justify-center lg:justify-start gap-2 text-sm font-medium" style={{ color: skin.ink }}>
            <Flower className="h-3.5 w-3.5 shrink-0" style={{ color: "#EC4899" }} /> {mantra}
          </p>
        </div>
        )}
      </div>

      {/* ===================== PRESENTATION MODE ===================== */}
      {present && (
        <>
          {/* Flow progress — kept, slim, across the top. */}
          <div className="pointer-events-none absolute inset-x-0 top-0 z-30 px-6 pt-4 sm:pt-5">
            <div className="relative mx-auto h-1.5 max-w-3xl rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.30)" }}>
              <div className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-petal to-hotpink transition-all duration-500" style={{ width: `${progress}%` }} />
            </div>
          </div>

          {/* Brand logo — bottom-left, stacked (flower · Bloomzein · tagline). The
              flower breathes (zoom in/out); colours use the player's soft pink. */}
          <div className="pointer-events-none absolute bottom-5 left-6 z-30 flex items-center gap-2.5 animate-fade-in">
            <span className="grid place-items-center" style={{ filter: "drop-shadow(0 2px 10px rgba(255,255,255,0.5))" }}>
              <BloomFlower size={64} petal="#EC4899" center="#BE185D" style={{ animation: "bzSpin 14s linear infinite" }} />
            </span>
            <div className="leading-none">
              <p className="font-script text-3xl leading-none text-hotpink" style={{ textShadow: "0 1px 10px rgba(255,255,255,0.85), 0 2px 4px rgba(255,255,255,0.55)" }}>Bloomzein</p>
              <p className="mt-1 text-[11px] font-semibold tracking-wide text-rose/85" style={{ textShadow: "0 1px 6px rgba(255,255,255,0.75)" }}>stay soft, bloom on. ✿</p>
            </div>
          </div>

          {/* Exit — auto-hides after a moment; move the mouse or press Esc to bring it back. */}
          <button
            onClick={() => setPresent(false)}
            title="Exit presentation mode (Esc)"
            className={["absolute top-6 right-4 z-40 inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-semibold transition-opacity duration-500", glassBtn, chromeShow ? "opacity-100" : "opacity-0 pointer-events-none"].join(" ")}
          >
            <X className="h-3.5 w-3.5" /> Exit
          </button>
        </>
      )}
    </div>,
    document.body
  );

}

// ===================== SUMMARY =====================

const MOODS = [
  { id: "tense", label: "tense" },
  { id: "tired", label: "tired" },
  { id: "ok", label: "okay" },
  { id: "calm", label: "calm" },
  { id: "light", label: "light" },
];

function Summary({
  flow, intention, durationMin, onHome, onAgain,
}: { flow: Pose[]; intention: Intention; durationMin: number; onHome: () => void; onAgain: () => void }) {
  const [before, setBefore] = useState<string | null>(null);
  const [after, setAfter] = useState<string | null>(null);
  const [rating, setRating] = useState<number>(0);
  const [note, setNote] = useState("");
  const [saved, setSaved] = useState(false);

  const saveDiaryNote = () => {
    if (!note.trim()) return;
    try {
      const raw = localStorage.getItem(DIARY_STORAGE_KEY);
      const entries: DiaryEntry[] = raw ? JSON.parse(raw) : [];
      const now = new Date();
      const moodMap: Record<string, string> = { tense: "sensitive", tired: "tired", ok: "calm", calm: "calm", light: "energetic" };
      entries.unshift({
        id: String(Date.now()),
        date: fmtLocalDate(now),
        mood: moodMap[after ?? ""] ?? "calm",
        title: `Yoga · ${INTENTIONS.find(i => i.id === intention)?.label ?? "Practice"}`,
        html: `<p>🧘🏻‍♀️ ${note.trim()} (${realMin}m)</p>`,
        theme: "sakura",
        font: "quicksand",
        createdAt: now.toISOString(),
      });
      localStorage.setItem(DIARY_STORAGE_KEY, JSON.stringify(entries));
      window.dispatchEvent(new Event("bloom:diary-updated"));
      setSaved(true);
    } catch {}
  };

  const intentionLabel = INTENTIONS.find((i) => i.id === intention)?.label || "Practice";
  // The exact time she just practiced (sum of every step incl. both sides).
  const realMin = Math.max(1, Math.round(flowTotalSeconds(flow) / 60));
  const realPoses = flow.filter((p) => !p.switchStep).length;
  const kcal = yogaSessionKcal(realMin, readDietProfile().weight);

  let streakCount = 0;
  try { streakCount = (JSON.parse(localStorage.getItem(STREAK_KEY) || "{}")?.count) || 0; } catch {}

  // Match the celebration to the mode she practiced in (night → calm & dim,
  // day → soft & bright), reading the same saved skin preference as the flow.
  let skinPref: SkinPref = "auto";
  try { const s = localStorage.getItem(YOGA_SKIN_KEY); if (s === "day" || s === "night" || s === "auto") skinPref = s; } catch {}
  const dayPart = resolveDayPart(intention, skinPref);
  const skin = SESSION_SKINS[dayPart];
  const isDark = dayPart === "night" || dayPart === "dusk";

  return (
    <div className={["relative yoga-fade rounded-[2rem] overflow-hidden p-4 sm:p-6 shadow-lg shadow-rose/10 transition-[background] duration-700", isDark ? "yoga-sum-dark" : ""].join(" ")}
      style={{ background: skin.frame }}>
      {isDark && (
        <style>{`
          .yoga-sum-dark .text-hotpink { color: ${skin.ink} !important; }
          .yoga-sum-dark .text-rose, .yoga-sum-dark .text-rose\\/60, .yoga-sum-dark .text-rose\\/70 { color: ${skin.inkSoft} !important; }
          .yoga-sum-dark section, .yoga-sum-dark .sum-hero { background: ${skin.card} !important; border-color: rgba(255,255,255,0.16) !important; }
          .yoga-sum-dark .bg-blush\\/60, .yoga-sum-dark .bg-blush\\/70, .yoga-sum-dark .bg-white, .yoga-sum-dark .bg-white\\/85, .yoga-sum-dark .bg-white\\/95 { background: rgba(255,255,255,0.10) !important; }
        `}</style>
      )}
      <BloomBubbles count={14} />
      <div className="relative z-10 space-y-4">
      <div className="relative rounded-3xl bg-white/95 backdrop-blur border border-petal/60 p-5 sm:p-7 text-center shadow-md animate-scale-in">
        <span className="clay-blob animate-selected-glow mx-auto grid place-items-center rounded-full text-white" style={{ width: "4.5rem", height: "4.5rem" }}>
          <Flower className="h-9 w-9 animate-icon-breathe" strokeWidth={1.5} />
        </span>
        <h2 className="font-script text-4xl sm:text-5xl text-hotpink mt-3 animate-text-pop">You bloomed.</h2>
        <p className="text-xs text-rose/60 italic mt-1">Your breath, your body, your quiet hour.</p>
        <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <div className="rounded-2xl bg-blush/60 border border-petal/50 p-2.5">
            <p className="font-script text-2xl text-hotpink leading-none">{realMin}</p>
            <p className="mt-1 text-[10px] font-semibold uppercase tracking-wide text-rose/60">min</p>
          </div>
          <div className="rounded-2xl bg-blush/60 border border-petal/50 p-2.5">
            <p className="font-script text-2xl text-hotpink leading-none">{realPoses}</p>
            <p className="mt-1 text-[10px] font-semibold uppercase tracking-wide text-rose/60">poses</p>
          </div>
          <div className="rounded-2xl bg-blush/60 border border-petal/50 p-2.5">
            <p className="font-script text-2xl text-hotpink leading-none">{kcal}</p>
            <p className="mt-1 text-[10px] font-semibold uppercase tracking-wide text-rose/60">kcal</p>
          </div>
          <div className="rounded-2xl bg-gradient-to-br from-hotpink/15 to-petal/40 border border-petal/60 p-2.5 animate-selected-glow">
            <p className="font-script text-2xl text-hotpink leading-none">{streakCount}</p>
            <p className="mt-1 text-[10px] font-semibold uppercase tracking-wide text-rose/60">day streak</p>
          </div>
        </div>
        <p className="mt-3 text-[11px] font-semibold text-rose/60">{intentionLabel}</p>
      </div>

      <section className="rounded-3xl bg-white/85 backdrop-blur border border-petal/60 p-4 sm:p-5">
        <p className="text-[10px] font-bold uppercase tracking-wider text-rose/60">Mood</p>
        <h3 className="font-script text-2xl text-hotpink leading-none">before → after</h3>
        <div className="mt-2 grid sm:grid-cols-2 gap-3">
          <MoodPicker label="Before" value={before} onChange={setBefore} />
          <MoodPicker label="After" value={after} onChange={setAfter} />
        </div>
      </section>

      <section className="rounded-3xl bg-white/85 backdrop-blur border border-petal/60 p-4 sm:p-5">
        <p className="text-[10px] font-bold uppercase tracking-wider text-rose/60">How did that feel?</p>
        <div className="mt-2 flex gap-2">
          {[1,2,3,4,5].map((n) => (
            <button key={n} onClick={() => setRating(n)}
              className={["h-9 w-9 rounded-full border text-sm font-bold transition",
                rating >= n ? "bg-hotpink text-white border-transparent" : "bg-white text-rose border-petal/60"].join(" ")}>
              {n}
            </button>
          ))}
        </div>
      </section>

      <section className="rounded-3xl bg-white/85 backdrop-blur border border-petal/60 p-4 sm:p-5">
        <p className="text-[10px] font-bold uppercase tracking-wider text-rose/60">Save a note?</p>
        <p className="text-xs text-rose/70 mb-2">It'll land softly in your Dreamy Diary.</p>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={3}
          placeholder="one sweet line about your practice…"
          className="w-full rounded-2xl bg-white/95 border border-petal/60 p-3 text-sm text-rose placeholder:text-rose/40 outline-none focus:ring-4 focus:ring-hotpink/20"
        />
        <div className="mt-2 flex items-center gap-2">
          <button onClick={saveDiaryNote} disabled={!note.trim() || saved}
            className="bloom-luxury-btn inline-flex items-center gap-1 px-4 py-2 text-xs font-semibold text-white disabled:opacity-60">
            <Heart className="h-3.5 w-3.5" /> {saved ? "Saved" : "Save to diary"}
          </button>
          {saved && <span className="text-xs text-rose/70">a soft little memory ✿</span>}
        </div>
      </section>

      <section className="rounded-3xl bg-white/85 backdrop-blur border border-petal/60 p-4 sm:p-5">
        <p className="text-[10px] font-bold uppercase tracking-wider text-rose/60">Poses done</p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {flow.map((p) => (
            <span key={p.slug} className="rounded-full bg-blush/70 text-rose text-[11px] font-semibold px-2.5 py-1 border border-petal/50">{p.name}</span>
          ))}
        </div>
      </section>

      {/* Inline styles so the day/night recolor rules never wash these out. */}
      <div className="flex items-center justify-center gap-3 pt-1">
        <button onClick={onHome}
          style={{ background: isDark ? "rgba(255,255,255,0.16)" : "rgba(255,255,255,0.92)", color: isDark ? "#fff" : "#db2777", border: `1px solid ${isDark ? "rgba(255,255,255,0.4)" : "rgba(244,194,214,0.7)"}` }}
          className="rounded-full px-6 py-2.5 text-sm font-bold active:scale-95 transition shadow-sm">Home</button>
        <button onClick={onAgain} className="bloom-luxury-btn px-6 py-2.5 text-sm font-bold text-white">Practice again</button>
      </div>
      </div>
    </div>
  );
}

function MoodPicker({ label, value, onChange }: { label: string; value: string | null; onChange: (v: string) => void }) {
  return (
    <div>
      <p className="text-xs font-semibold text-rose mb-1">{label}</p>
      <div className="flex flex-wrap gap-1.5">
        {MOODS.map((m) => (
          <button key={m.id} onClick={() => onChange(m.id)}
            className={["rounded-full px-3 py-1.5 text-xs font-semibold border transition",
              value === m.id ? "bg-hotpink text-white border-transparent" : "bg-white text-rose border-petal/60"].join(" ")}>
            {m.label}
          </button>
        ))}
      </div>
    </div>
  );
}