
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  ArrowLeft, ArrowRight, Sparkles, Play, Pause, SkipForward, X, Eye, EyeOff,
  Clock, Heart, Moon, Sun, Sparkle, Activity, CircleDot, Volume2, VolumeX,
  Bell, Languages, Music, Calendar, Flame, ChevronRight, ChevronLeft,
  GraduationCap, BookOpen, Headphones, Flower, BellRing, Info, Utensils, RotateCcw,
  Trash2, CircleCheck, Circle,
} from "lucide-react";
import { BloomBubbles } from "@/components/bloom/BloomBubbles";
import { subscribeToPush, syncScheduledNotifications, getCurrentUserId, type ScheduledNotificationInput } from "@/lib/push";
import { readCyclePhase, toYogaPhase, hasCycleSettings, type CyclePhase } from "@/components/bloom/cyclePhase";
import { CyclePhasePill } from "@/components/bloom/CyclePhasePill";
import { readLaunch, LAUNCH_YOGA_KEY } from "@/components/bloom/phasePlan";
import { readTodayWaterCount, readFuelInPlan, writeFuelInPlan, incrementYogaSession, logYogaSession, readYogaStreak, readYogaSessionCount, resetToolState, readYogaPlanDays } from "@/lib/crossToolData";
import { isGuided } from "@/lib/guidedSetup";
import { SpotlightCoach } from "@/components/bloom/SpotlightCoach";
import { todayISO, isYesterday } from "@/lib/localDate";
import { LevelStreak } from "@/components/bloom/LevelStreak";
import { flushCloudSync } from "@/lib/cloudSync";
import { HydrationNudge } from "@/components/bloom/HydrationNudge";
import { readDietProfile } from "@/components/bloom/recipes/data";
import { FuelCard, yogaIntensity, normalizePhase } from "@/components/bloom/trainingFuel";
import { PickerField } from "@/components/bloom/PickerField";
import { YogaOnboarding, type YogaTourTab } from "@/components/bloom/YogaOnboarding";
import { DIARY_STORAGE_KEY, type DiaryEntry } from "./app.tools.diary";

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
  cues: Record<Lang, string>;
  audioUrl?: string; // future custom voice — left empty; TTS reads cue
  floorOnly?: boolean; // safe for beginner audio sessions
}

const P = (p: Pose) => p;

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
];

const POSE_BY_SLUG: Record<string, Pose> = POSES.reduce((acc, p) => { acc[p.slug] = p; return acc; }, {} as Record<string, Pose>);

// ===================== INTENTIONS / FLOWS =====================

type Intention = "morning" | "stress" | "sleep" | "release" | "cycle" | "strength";
type Phase = "menstrual" | "follicular" | "ovulation" | "luteal";

const INTENTIONS: { id: Intention; label: string; icon: typeof Sun; tagline: string }[] = [
  { id: "morning", label: "Morning energy", icon: Sun, tagline: "wake up the body, light up the day" },
  { id: "stress", label: "Stress relief", icon: Heart, tagline: "soft, slow, exhale the day away" },
  { id: "sleep", label: "Sleep prep", icon: Moon, tagline: "gentle floor flow into deep rest" },
  { id: "release", label: "Emotional release", icon: Sparkle, tagline: "open hips & heart, let it move" },
  { id: "cycle", label: "Cycle sync", icon: Flower, tagline: "match today's phase" },
  { id: "strength", label: "Strength", icon: Activity, tagline: "build steady, mindful power" },
];

const PHASE_SLUGS: Record<Phase, string[]> = {
  menstrual: ["easy-seat", "cat-cow", "childs-pose", "reclined-bound-angle", "butterfly", "supine-twist", "knees-to-chest", "legs-up-wall", "savasana"],
  follicular: ["easy-seat", "cat-cow", "downward-dog", "low-lunge", "warrior-1", "cobra", "childs-pose", "savasana"],
  ovulation: ["easy-seat", "cat-cow", "downward-dog", "warrior-2", "triangle", "chair", "tree", "bridge", "savasana"],
  luteal: ["easy-seat", "cat-cow", "low-lunge", "seated-forward-fold", "head-to-knee", "wide-leg-fold", "supine-twist", "legs-up-wall", "savasana"],
};

const INTENTION_MAIN: Record<Exclude<Intention, "cycle">, string[]> = {
  morning: ["mountain", "forward-fold", "downward-dog", "low-lunge", "warrior-1", "warrior-2", "triangle", "cobra"],
  stress: ["cat-cow", "childs-pose", "low-lunge", "seated-forward-fold", "supine-twist", "legs-up-wall"],
  sleep: ["reclined-bound-angle", "knees-to-chest", "supine-twist", "legs-up-wall"],
  release: ["low-lunge", "pigeon", "butterfly", "cobra", "bridge", "childs-pose"],
  strength: ["chair", "plank", "boat", "warrior-2", "bridge", "side-plank"],
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
};

// Maps a scheduled focus label to a runnable flow (intention + duration + image),
// so a day in the plan can be started in one tap.
const FOCUS_META: Record<string, { intention: Intention; duration: number; image: string; blurb: string }> = {
  "Morning energy":     { intention: "morning",  duration: 15, image: "/images/pose-mountain.webp",              blurb: "Wake the body, light up the day" },
  "Stress relief":      { intention: "stress",   duration: 15, image: "/images/pose-childs-pose.webp",           blurb: "Soft, slow — exhale the day away" },
  "Sleep prep":         { intention: "sleep",    duration: 20, image: "/images/pose-legs-up-wall.webp",          blurb: "Gentle floor flow into deep rest" },
  "Cycle sync":         { intention: "cycle",    duration: 20, image: "/images/pose-reclined-bound-angle.webp",  blurb: "Matched to today's phase" },
  "Strength":           { intention: "strength", duration: 25, image: "/images/pose-plank.webp",                 blurb: "Build steady, mindful power" },
  "Emotional release":  { intention: "release",  duration: 20, image: "/images/pose-pigeon.webp",                blurb: "Open hips & heart, let it move" },
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
];

// ── Recorded pose narration + audio-driven timing ───────────────────────────
// Every pose plays its OWN recorded narration (no robotic text-to-speech). Its
// on-screen hold is that audio's real length rounded UP to the next clean 5s, so
// the voice is never cut off. Poses missing a recording fall back to a default
// hold and stay silent. (Measured from the uploaded files.)
const POSE_HOLD: Record<string, number> = {
  "easy-seat": 50, "cat-cow": 50, "childs-pose": 60, "seated-twist": 105, "low-lunge": 105,
  "butterfly": 75, "pigeon": 110, "garland": 105, "mountain": 80, "forward-fold": 65,
  "downward-dog": 75, "warrior-1": 95, "warrior-2": 110, "triangle": 105, "chair": 65,
  "tree": 95, "half-moon": 110, "cobra": 80, "camel": 95, "seated-forward-fold": 85,
  "head-to-knee": 75, "wide-leg-fold": 100, "reclined-bound-angle": 110, "knees-to-chest": 105,
  "supine-twist": 120, "legs-up-wall": 120, "savasana": 105, "plank": 115, "boat": 85, "side-plank": 110,
  "bridge": 85,
};
const poseAudioUrl = (slug: string): string | undefined =>
  POSE_HOLD[slug] != null ? `/audio/yoga/${slug}.mp3` : undefined;
const holdOf = (slug: string, fallback = 45): number => POSE_HOLD[slug] ?? fallback;

// ── Background music (a continuous, looping bed). "Windsong" is the fullest
// track and also powers the eyes-closed music-only experience.
const MUSIC: Record<string, string> = {
  Weightless: "/audio/music/weightless.mp3",
  Renewal: "/audio/music/renewal.mp3",
  Windsong: "/audio/music/windsong.mp3",
};

function buildFlow(opts: {
  intention: Intention; level: Level; durationMin: number; phase: Phase; mode: Mode;
}): Pose[] {
  const { intention, level, durationMin, phase, mode } = opts;
  const warmup = ["easy-seat", "cat-cow", "childs-pose"];
  const cooldown = ["seated-forward-fold", "supine-twist"];
  const rest = ["savasana"];

  let main: string[];
  if (intention === "cycle") main = PHASE_SLUGS[phase];
  else main = INTENTION_MAIN[intention];

  // Beginner audio-only safety: drop non-floor poses
  const audioBeginner = mode === "audio" && level === "Beginner";
  const safe = (slugs: string[]) =>
    audioBeginner ? slugs.filter((s) => POSE_BY_SLUG[s]?.floorOnly) : slugs;

  // Level filter: beginner avoids "Advanced"
  const byLevel = (slugs: string[]) => slugs.filter((s) => {
    const lv = POSE_BY_SLUG[s]?.level;
    if (level === "Beginner") return lv !== "Advanced";
    if (level === "Intermediate") return lv !== "Advanced" || Math.random() > 0.6;
    return true;
  });

  // Duration budgeting — each pose now lasts its own narration length, so we add
  // main poses until the running total (warm-up + these + cool-down + rest) is
  // about the chosen minutes, rather than a fixed pose count.
  const warm = safe(warmup);
  const cool = safe(cooldown);
  const target = durationMin * 60;
  const fixed = [...warm, ...cool, ...rest].reduce((a, s) => a + holdOf(s), 0);
  let budget = target - fixed;
  const chosenMain: string[] = [];
  for (const s of safe(byLevel(main))) {
    if (budget <= 0) break;
    chosenMain.push(s);
    budget -= holdOf(s);
  }
  if (chosenMain.length === 0) {
    const pool = safe(byLevel(main));
    if (pool.length) chosenMain.push(pool[0]); // always at least one main pose
  }

  const composed: string[] = [...warm, ...chosenMain, ...cool, ...rest];
  // dedupe while preserving order
  const seen = new Set<string>();
  return composed
    .filter((s) => POSE_BY_SLUG[s] && !seen.has(s) && (seen.add(s), true))
    .map((s) => POSE_BY_SLUG[s]);
}

/** Real session length (seconds) = sum of each pose's own hold. */
function flowTotalSeconds(flow: Pose[]): number {
  return flow.reduce((a, p) => a + holdOf(p.slug), 0);
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

  // Reset to INHALE every time a new pose starts or session resumes
  useEffect(() => {
    setTick(0);
    setPhase("inhale");
    setPhaseProgress(0);
    if (running && !muted) { playBreathTone("inhale"); onPhase?.("inhale"); }
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
            if (posInPhase === 0 && !muted) { playBreathTone(step.phase); onPhase?.(step.phase); }
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
  | { kind: "plan" }
  | { kind: "setup"; preset?: { intention: Intention; durationMin: number } }
  | { kind: "session"; flow: Pose[]; lang: Lang; mode: Mode; intention: Intention; hold: number; durationMin: number; sound: string }
  | { kind: "summary"; flow: Pose[]; intention: Intention; durationMin: number; moodBefore?: string; moodAfter?: string };

export default function YogaPage() {
  const [onboarded, setOnboarded] = useState(false);
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [view, setView] = useState<View>({ kind: "plan" });
  const [lowWater, setLowWater] = useState(false);

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
    setLowWater(readTodayWaterCount() < 3);
    const refresh = () => setLowWater(readTodayWaterCount() < 3);
    window.addEventListener("storage", refresh);
    return () => window.removeEventListener("storage", refresh);
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
  const isTabbed = view.kind === "plan" || view.kind === "home" || view.kind === "library";
  const tourVisible = showTour || (hydrated && !tourDone && isTabbed);

  return (
    <div className="relative animate-fade-in">
      <BloomBubbles count={10} />

      {guidedDone && (
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

      <a href="/app/tools" className="mb-3 inline-flex items-center gap-1 text-sm text-rose hover:text-hotpink">
        <ArrowLeft className="h-4 w-4" /> All tools
      </a>

      {(view.kind === "home" || view.kind === "library" || view.kind === "plan") && (
        <YogaHero
          active={view.kind}
          onDiscover={() => setView({ kind: "home" })}
          onLibrary={() => { setView({ kind: "library" }); advanceStep(Math.max(step, 1) as 1|2|3); }}
          onMyPlan={() => setView({ kind: "plan" })}
          onTryFlow={() => setView({ kind: "setup" })}
          onGuide={() => setShowTour(true)}
        />
      )}

      {/* Hydration nudge — under the hero; shown when fewer than 3 glasses
          logged today. Dismissible via the ✕ button or by swiping it away. */}
      {lowWater && (
        <HydrationNudge
          storageKey="bloom:hydrate-nudge-yoga"
          className="mt-3 bg-gradient-to-r from-sky-50 to-blue-50 border-blue-100/80"
          icon={<Info className="h-4 w-4" strokeWidth={1.8} />}
          title="Hydrate before your flow ✿"
          body="You've logged fewer than 3 glasses today. Staying hydrated makes yoga more comfortable and effective."
        />
      )}

      {view.kind === "home" && (
        <YogaHome
          onboarded={onboarded}
          step={step}
          onBegin={beginNow}
          onLibrary={() => { setView({ kind: "library" }); advanceStep(Math.max(step, 1) as 1|2|3); }}
          onSetup={(preset) => setView({ kind: "setup", preset })}
          onStepGoTo={(s) => advanceStep(s)}
          onApplyPlan={(p) => {
            try {
              localStorage.setItem(SCHEDULE_KEY, JSON.stringify({ ...p.focus }));
              window.dispatchEvent(new Event("bloom:yoga-updated"));
            } catch {}
            setView({ kind: "plan" });
          }}
        />
      )}

      {view.kind === "library" && <Library onTryFlow={() => setView({ kind: "setup" })} />}

      {view.kind === "plan" && (
        <PlanPage onSetup={(preset) => setView({ kind: "setup", preset })} />
      )}

      {view.kind === "setup" && (
        <Setup
          preset={view.preset}
          onBack={() => setView({ kind: "home" })}
          onStart={(cfg) => {
            const flow = buildFlow(cfg);
            setView({ kind: "session", flow, lang: cfg.lang, mode: cfg.mode, intention: cfg.intention, hold: holdSecondsFor(cfg.durationMin, cfg.level), durationMin: cfg.durationMin, sound: cfg.sound });
          }}
        />
      )}

      {view.kind === "session" && (
        <SessionPlayer
          flow={view.flow}
          lang={view.lang}
          mode={view.mode}
          hold={view.hold}
          sound={view.sound}
          onExit={() => setView({ kind: "home" })}
          onDone={() => setView({ kind: "summary", flow: view.flow, intention: view.intention, durationMin: view.durationMin })}
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

const HERO_CONTENT: Record<"home" | "library" | "plan", { title: string; subtitle: string }> = {
  home: { title: "Yoga Flows", subtitle: "guided breath, gentle movement — your softest practice." },
  library: { title: "Learn the poses", subtitle: "Tap any pose to read how to enter it and find your breath." },
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
function YogaPhaseSyncPill() {
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
  return (
    <button
      onClick={onSync}
      disabled={synced}
      title={!known ? "Set up your cycle to sync your plan" : synced ? `In sync with your ${meta.label} phase ✿` : `Tap to sync your week to your ${meta.label} phase`}
      className={["inline-flex shrink-0 items-center gap-1 rounded-full border border-petal/60 bg-white/85 pl-1.5 pr-2 py-1 text-[11px] font-bold leading-none transition",
        synced ? "text-hotpink" : "text-rose/45 hover:text-hotpink active:scale-95"].join(" ")}
    >
      {synced ? <CircleCheck className="h-3.5 w-3.5" strokeWidth={2.4} /> : <Circle className="h-3.5 w-3.5" strokeWidth={2} />}
      {synced ? "In sync" : "Sync"}
    </button>
  );
}

function YogaHero({
  active, onDiscover, onLibrary, onMyPlan, onTryFlow, onGuide, onReset,
}: {
  active: "home" | "library" | "plan";
  onDiscover: () => void;
  onLibrary: () => void;
  onMyPlan: () => void;
  onTryFlow: () => void;
  onGuide?: () => void;
  onReset?: () => void;
}) {
  const tabClass = (isActive: boolean) =>
    [
      "rounded-full px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-bold transition",
      isActive ? "bg-hotpink text-white shadow-md shadow-hotpink/30" : "text-white",
    ].join(" ");

  const { title, subtitle } = HERO_CONTENT[active];

  return (
    <div className="relative w-full rounded-3xl overflow-hidden border border-petal/60 shadow-xl shadow-rose/10 mb-2 animate-card-pop-in">
      <img src="/images/yoga-hero.webp" alt="Yoga Flows" className="absolute inset-0 h-full w-full object-cover object-[center_20%]" />
      <div className="absolute inset-0 bg-gradient-to-r from-hotpink/70 via-hotpink/15 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent" />
      <div className="absolute top-2 right-2 z-10 flex items-center gap-1.5">
        {onReset && (
          <button
            onClick={onReset}
            aria-label="Reset tool"
            title="Reset — preview the first-time experience"
            className="inline-flex items-center gap-1 rounded-full bg-white/20 backdrop-blur-md border border-white/40 px-2.5 py-1.5 text-[11px] sm:text-xs text-white/90 font-semibold transition hover:bg-white/30 active:scale-95"
          >
            <RotateCcw className="h-3 w-3" /> Reset
          </button>
        )}
        {onGuide && (
          <button
            onClick={onGuide}
            className="inline-flex items-center gap-1 rounded-full bg-white/25 backdrop-blur-md border border-white/50 px-3 py-1.5 text-[11px] sm:text-xs text-white font-semibold transition hover:bg-white/35 active:scale-95"
          >
            <Sparkles className="h-3 w-3" /> Guide
          </button>
        )}
      </div>
      <div className="relative flex flex-col justify-between gap-2 p-3 sm:p-4 min-h-[128px] sm:min-h-[150px] lg:min-h-[188px]">
        <div key={active} className="animate-scale-in">
          <div className="max-w-[72%]">
            <p className="mb-1 inline-flex w-fit items-center gap-1 rounded-full bg-white/25 px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.15em] text-white backdrop-blur-sm" style={{ textShadow: "0 1px 4px rgba(0,0,0,0.35)" }}>
              <Flower className="h-2.5 w-2.5" strokeWidth={2.5} /> Yoga
            </p>
            <h1 className="font-script text-3xl sm:text-5xl lg:text-6xl text-white leading-none" style={{ textShadow: "0 2px 8px rgba(0,0,0,0.28)" }}>{title}</h1>
            <p className="mt-0.5 text-xs sm:text-sm font-medium leading-snug text-white/95" style={{ textShadow: "0 1px 6px rgba(0,0,0,0.35)" }}>{subtitle}</p>
          </div>
          <CyclePhasePill className="mt-1 ring-1 ring-white/50" />
        </div>
        <div className="flex justify-center">
          <div className="inline-flex rounded-full bg-white/20 backdrop-blur-md border border-white/40 p-0.5 sm:p-1">
            <button data-tour="yg-tab-plan" onClick={onMyPlan} className={tabClass(active === "plan")}>My Plan</button>
            <button data-tour="yg-tab-discover" onClick={onDiscover} className={tabClass(active === "home")}>Discover</button>
            <button data-tour="yg-tab-library" onClick={onLibrary} className={tabClass(active === "library")}>Library</button>
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
  onboarded, step, onBegin, onLibrary, onSetup, onStepGoTo, onApplyPlan,
}: {
  onboarded: boolean; step: 1|2|3;
  onBegin: () => void; onLibrary: () => void;
  onSetup: (preset?: { intention: Intention; durationMin: number }) => void;
  onStepGoTo: (s: 1|2|3) => void;
  onApplyPlan: (p: YogaProgram) => void;
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

      {/* CURATED PLANS — themed weekly plans you can apply in one tap */}
      <CuratedPlans onApply={onApplyPlan} />

      {/* FLOW SESSIONS — by moment / by intention carousels */}
      <FlowSessionsSection onStart={(intention, durationMin) => onSetup({ intention, durationMin })} />
    </div>
  );
}

// ===================== MY PLAN =====================

function PlanPage({ onSetup }: { onSetup: (preset?: { intention: Intention; durationMin: number }) => void }) {
  const { streak, phaseSuggestion } = useYogaPhaseAndStreak();

  return (
    <div className="space-y-4 yoga-fade">
      {/* TODAY HERO + WEEK (day by day, tappable to start) */}
      <Organizer phase={phaseSuggestion.phase} onStart={(intention, durationMin) => onSetup({ intention, durationMin })} />

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
  return (
    <button
      onClick={onClick}
      className="relative overflow-hidden rounded-2xl text-left transition active:scale-95 animate-scale-in hover-scale group"
      style={{ animationDelay: `${index * 60}ms`, aspectRatio: '3/4' }}
    >
      <img
        src={preset.image} alt="" loading="lazy"
        className="absolute inset-0 h-full w-full object-cover object-top transition duration-300 group-hover:scale-105"
      />
      {/* subtle vignette so text is always readable */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-transparent" />
      {/* Duration badge */}
      <span className="absolute top-1.5 right-1.5 rounded-full bg-black/40 px-2 py-0.5 text-[10px] font-semibold text-white">
        {preset.duration} min
      </span>
      {/* Glass label strip */}
      <div
        className="absolute bottom-0 left-0 right-0 px-2 py-2.5 text-center"
        style={{
          background: 'rgba(255,255,255,0.20)',
          borderTop: '1px solid rgba(255,255,255,0.28)',
        }}
      >
        <p className="text-[10px] font-bold leading-tight text-white drop-shadow">{preset.label}</p>
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

      <div key={tab} className="mt-4 grid grid-cols-3 gap-2 lg:grid-cols-4">
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
              onClick={() => setConfirm(p)}
              className="group w-full text-left flex items-stretch overflow-hidden rounded-3xl border border-petal/60 bg-white/90 shadow-sm hover:shadow-xl hover:-translate-y-0.5 transition animate-scale-in"
              style={{ animationDelay: `${i * 70}ms` }}
            >
              <div className="relative w-28 sm:w-36 shrink-0 overflow-hidden">
                <img src={p.image} alt="" className="absolute inset-0 h-full w-full object-cover object-top transition-transform duration-500 group-hover:scale-105" loading="lazy" />
                <div className="absolute inset-0 bg-gradient-to-r from-black/10 to-black/35" />
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
  const realPhase = readCyclePhase();
  const fuelPhase = normalizePhase(
    realPhase && realPhase !== "any" ? realPhase : phase === "menstrual" ? "period" : phase,
  );
  // Shared preference: show recovery meals inside the plan, or keep it simple.
  const [fuelInPlan, setFuelInPlan] = useState(() => readFuelInPlan());
  const toggleFuel = () => { const v = !fuelInPlan; setFuelInPlan(v); writeFuelInPlan(v); };

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
    setEditing(true); // land in the editor to fine-tune the suggested week
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
          body: `Your ${focus.toLowerCase()} flow is waiting — ${reminder} 🧘`,
          data: { url: "/app/tools/yoga", kind: "yoga" },
        });
      }
      if (cancelled) return;
      syncScheduledNotifications("yoga", items);
    })();
    return () => { cancelled = true; };
  }, [schedule, reminder]);

  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const options = [null, "Morning energy", "Stress relief", "Sleep prep", "Cycle sync", "Strength", "Emotional release"];
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
      <section className="animate-scale-in rounded-3xl bg-white/85 backdrop-blur border border-petal/60 p-4 sm:p-5">
        <div className="flex items-center justify-between gap-3 flex-wrap mb-3">
          <div className="flex items-center gap-2 min-w-0">
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-wider text-rose/60">Your soft week</p>
              <h2 className="font-script text-2xl text-hotpink leading-none">Plan & start</h2>
            </div>
            <LevelStreak variant="chip" streak={readYogaStreak().count} />
            <YogaPhaseSyncPill />
          </div>
          <div className="flex items-center gap-2">
            <label className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-rose">
              <BellRing className="h-3.5 w-3.5" />
              <input type="time" value={reminder} onChange={(e) => updateReminder(e.target.value)}
                className="rounded-full bg-blush/60 border border-petal/60 px-2.5 py-1 text-[11px] font-semibold text-rose outline-none focus:ring-2 focus:ring-hotpink/30" />
            </label>
            <button onClick={() => setEditing((v) => !v)} className={["rounded-full px-3 py-1 text-[11px] font-bold border transition", editing ? "bg-hotpink text-white border-hotpink" : "bg-white/90 text-hotpink border-petal/60"].join(" ")}>
              {editing ? "Done" : "Edit"}
            </button>
            <button onClick={resetYogaTool} title="Reset — preview the first-time experience" className="inline-flex items-center gap-1 rounded-full px-3 py-1 text-[11px] font-bold border border-petal/50 bg-white/70 text-rose/50 hover:text-hotpink transition">
              <Trash2 className="h-3 w-3" /> Reset
            </button>
          </div>
        </div>

        {/* Soft badge — this week is tuned to her diet goal (from Diet), until she edits it */}
        {tunedGoal && !editing && (
          <div className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-rose-50 border border-rose-200/80 px-2.5 py-1 text-[10.5px] font-bold text-rose-500">
            <Sparkles className="h-3 w-3" strokeWidth={2.4} /> Tuned to your {goalWord(tunedGoal)} goal
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
            <button onClick={syncToCycle} className="w-full rounded-2xl bg-gradient-to-r from-hotpink/15 to-petal/30 border border-petal/60 p-3.5 flex items-center gap-3 text-left transition hover:-translate-y-0.5 active:scale-[0.99]">
              <span className="clay-blob grid h-10 w-10 shrink-0 place-items-center rounded-full text-white animate-icon-breathe"><Flower className="h-5 w-5" strokeWidth={1.8} /></span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-rose">Sync to my cycle</p>
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
                      <p className="text-[11px] text-rose/60 leading-snug truncate">{meta.blurb} · {durations[d] ?? meta.duration} min</p>
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
                          <p className="text-[11px] text-rose/70 leading-snug">{meta.blurb} · {durations[d] ?? meta.duration} min</p>
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
            <p className="text-[11px] sm:text-xs text-rose/60 mt-0.5">Tap any pose to learn how to enter it and find your breath.</p>
          </div>
          <span className="shrink-0 rounded-full bg-blush/70 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-hotpink">{filtered.length} poses</span>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1.5 scrollbar-none">
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
          <img src={pose.image} alt={pose.name} loading="lazy" width={1024} height={1024} className="h-full w-full object-contain bg-[oklch(0.96_0.04_350)]" />
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
const SOUNDS = ["Renewal", "Weightless", "Windsong"] as const;
const DEFAULT_SOUND: typeof SOUNDS[number] = "Renewal"; // meditation bed, default for programs

function YogaPlanSetup({ onBack, onCreate }: {
  onBack: () => void;
  onCreate: (level: Level, goal: YogaGoal, days: number) => void;
}) {
  const [level, setLevel] = useState<Level>(() => readYogaProfileLevel());
  const [goal, setGoal] = useState<YogaGoal>("calm");
  const [days, setDays] = useState(3);
  return (
    <div className="space-y-3.5 animate-fade-in">
      <div>
        <h3 className="font-script text-xl text-hotpink leading-none mb-0.5">Build your own week ✿</h3>
        <p className="text-[12px] text-rose/70">Set your level &amp; focus — we&apos;ll lay out a week you can fine-tune.</p>
      </div>
      <PickGroup label="Your level" icon={GraduationCap}>
        {LEVELS.map((lv) => <Chip key={lv} active={level === lv} onClick={() => setLevel(lv)}>{lv}</Chip>)}
      </PickGroup>
      <PickGroup label="What do you want?" icon={Heart}>
        {YOGA_GOALS.map((g) => <Chip key={g.key} active={goal === g.key} onClick={() => setGoal(g.key)}>{g.label}</Chip>)}
      </PickGroup>
      <PickGroup label="Days per week" icon={Calendar}>
        {[2, 3, 4, 5].map((d) => <Chip key={d} active={days === d} onClick={() => setDays(d)}>{d} days</Chip>)}
      </PickGroup>
      <div className="flex items-center gap-2 pt-1">
        <button onClick={onBack} className="rounded-full bg-white/85 px-4 py-2 text-xs font-semibold text-rose border border-petal/60">Back</button>
        <button onClick={() => onCreate(level, goal, days)} className="flex-1 bloom-luxury-btn py-2.5 text-sm font-bold text-white inline-flex items-center justify-center gap-2">
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
  const [durationMin, setDuration] = useState(preset?.durationMin ?? 20);
  const [intention, setIntention] = useState<Intention>(preset?.intention ?? "morning");
  const [level, setLevel] = useState<Level>(() => readYogaProfileLevel());
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
        {DURATIONS.map((d) => (
          <Chip key={d} active={durationMin === d} onClick={() => setDuration(d)}>{d} min</Chip>
        ))}
      </PickGroup>

      <PickGroup label="Intention" icon={Heart}>
        {INTENTIONS.map((i) => {
          const Ico = i.icon;
          return (
            <Chip key={i.id} active={intention === i.id} onClick={() => setIntention(i.id)}>
              <Ico className="h-3.5 w-3.5 mr-1" /> {i.label}
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
        {LEVELS.map((lv) => (
          <Chip key={lv} active={level === lv} onClick={() => setLevel(lv)}>{lv}</Chip>
        ))}
      </PickGroup>

      <PickGroup label="Language" icon={Languages}>
        {LANGS.map((l) => (
          <Chip key={l.id} active={lang === l.id} onClick={() => setLang(l.id)}>{l.label}</Chip>
        ))}
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
          onClick={() => onStart({ durationMin, intention, level, lang, sound, mode, phase })}
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

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} className={[
      "inline-flex items-center rounded-full px-3 py-1.5 text-xs font-semibold border transition",
      active ? "bg-hotpink text-white border-transparent shadow-md shadow-hotpink/30"
             : "bg-white/90 text-rose border-petal/60 hover:bg-blush/60",
    ].join(" ")}>{children}</button>
  );
}

// ===================== SESSION PLAYER =====================

function SessionPlayer({
  flow, lang, mode, hold, sound, onExit, onDone,
}: {
  flow: Pose[]; lang: Lang; mode: Mode; hold: number; sound: string; onExit: () => void; onDone: () => void;
}) {
  const [idx, setIdx] = useState(0);
  const [running, setRunning] = useState(false);
  const pose = flow[idx];
  // Each pose lasts its OWN recorded-narration length (rounded up); poses with
  // no recording fall back to the uniform hold.
  const poseHold = holdOf(pose?.slug ?? "", hold);
  const [remaining, setRemaining] = useState(() => holdOf(flow[0]?.slug ?? "", hold));
  const [muted, setMuted] = useState(false);
  const [peek, setPeek] = useState(false);
  const { speak, stop } = useSpeaker();
  const langBcp = LANGS.find((l) => l.id === lang)?.bcp || "en-US";
  // Gentle spoken breath cue ("Inhale" / "Exhale") synced to the breath ring.
  const onBreathPhase = (p: BreathPhase) => {
    if (muted || p === "hold") return;
    speak(BREATH_LABEL[lang][p], langBcp, { rate: 0.8, pitch: 1, volume: 0.9 });
  };
  const { phase: breathPhase, phaseProgress: breathProgress } = useBreathPacer(running, muted, idx, onBreathPhase);
  const wakeLockRef = useRef<any>(null);
  const narrationRef = useRef<HTMLAudioElement | null>(null); // current pose voice
  const musicRef = useRef<HTMLAudioElement | null>(null);     // looping background bed
  const lastPlayedIdx = useRef<number>(-1);
  const midIdx = Math.floor(flow.length / 2);

  const stopAllAudio = () => {
    try { narrationRef.current?.pause(); } catch {}
    try { musicRef.current?.pause(); } catch {}
    stop();
  };

  // Start/stop everything with one user gesture (reliable autoplay).
  const togglePlay = () => {
    setRunning((r) => {
      const next = !r;
      if (next) { try { if (!muted) musicRef.current?.play().catch(() => {}); } catch {} }
      else { stopAllAudio(); }
      return next;
    });
  };

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
    const url = poseAudioUrl(pose.slug);
    if (!url) return;
    const a = new Audio(url);
    narrationRef.current = a;
    const t = setTimeout(() => { a.play().catch(() => {}); }, isNewPose ? 500 : 0);
    return () => clearTimeout(t);
  }, [idx, muted, running]);

  // Background music — ONE looping element for the whole session so it plays
  // continuously and repeats seamlessly (never cropped between poses).
  useEffect(() => {
    const src = MUSIC[sound] || MUSIC[DEFAULT_SOUND];
    const a = new Audio(src);
    a.loop = true;
    a.volume = 0.35; // sits softly under the voice
    a.preload = "auto";
    musicRef.current = a;
    // If the practice is already running when the track changes, keep playing.
    if (running && !muted) a.play().catch(() => {});
    return () => { try { a.pause(); } catch {} musicRef.current = null; };
  }, [sound]);

  // Start/stop the music with play state + mute (position is preserved on pause).
  useEffect(() => {
    const a = musicRef.current;
    if (!a) return;
    if (running && !muted) a.play().catch(() => {});
    else a.pause();
  }, [running, muted, sound]);

  // Timer — counts down THIS pose's own hold (its narration length rounded up).
  useEffect(() => {
    if (!running) return;
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
  }, [idx, running, poseHold]);

  function finishSession() {
    stopAllAudio();
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
    const practiceMin = Math.max(5, Math.round(flowTotalSeconds(flow) / 60));
    logYogaSession(practiceMin, readDietProfile().weight);
    onDone();
  }

  if (!pose) return null;

  const progress = ((idx + 1) / flow.length) * 100;
  const dim = mode === "audio" && !peek;

  return createPortal(
    <div className="fixed inset-0 z-[60] bg-blush/95 backdrop-blur flex flex-col p-3 sm:p-4"
      style={{ paddingTop: "max(0.75rem, env(safe-area-inset-top))", paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}>
      {/* TOP BAR */}
      <div className="flex items-center justify-between gap-3 mb-2 shrink-0">
        <button onClick={() => { stopAllAudio(); onExit(); }} className="inline-flex items-center gap-1 rounded-full bg-white/90 px-3 py-1.5 text-xs font-semibold text-rose border border-petal/60">
          <X className="h-3.5 w-3.5" /> End
        </button>
        <div className="flex-1 max-w-md mx-auto h-1.5 bg-petal/40 rounded-full overflow-hidden">
          <div className="h-full bg-hotpink transition-all" style={{ width: `${progress}%` }} />
        </div>
        <div className="flex items-center gap-1.5">
          <button onClick={() => setMuted((m) => { const n = !m; if (n) stopAllAudio(); return n; })}
            className="inline-flex items-center gap-1 rounded-full bg-white/90 px-2.5 py-1.5 text-xs font-semibold text-rose border border-petal/60">
            {muted ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
          </button>
        </div>
      </div>

      <div className={["flex-1 min-h-0 flex flex-col rounded-3xl border border-petal/60 overflow-hidden shadow-xl shadow-rose/10 transition",
        dim ? "bg-rose/95 text-white" : "bg-white/90 backdrop-blur"].join(" ")}>
        {/* IMAGE / PACER — flexes to fill the free space */}
        <div className={["relative flex-1 min-h-0", dim ? "bg-rose/95" : "bg-blush/40"].join(" ")}>
          {!dim ? (
            <>
              <img src={pose.image} alt={pose.name} className="absolute inset-0 w-full h-full object-contain bg-[oklch(0.96_0.04_350)]" />
              <div className="absolute bottom-2 right-2 sm:bottom-3 sm:right-3">
                <BreathPacer phase={breathPhase} phaseProgress={breathProgress} lang={lang} dim={false} />
              </div>
            </>
          ) : (
            // Eyes-closed: pose faintly visible behind, pacer front and center
            <div className="relative w-full h-full grid place-items-center">
              <img
                src={pose.image}
                alt=""
                aria-hidden
                className="absolute inset-0 w-full h-full object-contain"
                style={{ opacity: 0.12, filter: "blur(2px) saturate(0.5)" }}
              />
              <div className="absolute inset-0 bg-rose/80" />
              <div className="relative z-10">
                <BreathPacer phase={breathPhase} phaseProgress={breathProgress} lang={lang} dim={true} />
              </div>
            </div>
          )}
        </div>

        {/* TEXT */}
        <div className={["shrink-0 p-3 sm:p-5", dim ? "text-white" : ""].join(" ")}>
          <div className="flex items-end justify-between gap-3 flex-wrap">
            <div>
              <p className={["text-[10px] font-bold uppercase tracking-wider", dim ? "text-white/60" : "text-rose/60"].join(" ")}>
                Pose {idx + 1} of {flow.length}
              </p>
              <h3 className={["font-script text-3xl sm:text-5xl leading-none", dim ? "text-white" : "text-hotpink"].join(" ")}>
                {pose.name}
              </h3>
              {pose.sanskrit && <p className={["text-xs italic", dim ? "text-white/70" : "text-rose/60"].join(" ")}>{pose.sanskrit}</p>}
            </div>
            <div className={["text-right", dim ? "text-white/90" : "text-rose"].join(" ")}>
              <p className="text-xs font-bold uppercase tracking-wider opacity-75">hold</p>
              <p className="text-3xl font-bold tabular-nums">{remaining}s</p>
            </div>
          </div>

          <p dir={lang === "ar" ? "rtl" : "ltr"} className={["mt-2 text-xs sm:text-base leading-snug line-clamp-2", dim ? "text-white/90" : "text-rose/90"].join(" ")}>
            {pose.cues[lang]}
          </p>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button onClick={togglePlay}
              className="bloom-luxury-btn inline-flex items-center gap-2 px-4 py-2 text-sm font-bold text-white">
              {running ? <><Pause className="h-4 w-4" /> Pause</> : <><Play className="h-4 w-4" />{idx === 0 && remaining === poseHold ? "Start" : "Resume"}</>}
            </button>
            <button onClick={() => setIdx((i) => Math.max(0, i - 1))}
              className="inline-flex items-center gap-1 rounded-full bg-white/90 px-3 py-2 text-xs font-semibold text-rose border border-petal/60">
              <ChevronLeft className="h-3.5 w-3.5" /> Prev
            </button>
            <button onClick={() => {
              if (idx + 1 >= flow.length) finishSession();
              else setIdx((i) => i + 1);
            }}
              className="inline-flex items-center gap-1 rounded-full bg-white/90 px-3 py-2 text-xs font-semibold text-rose border border-petal/60">
              Next <SkipForward className="h-3.5 w-3.5" />
            </button>
            {mode === "audio" && (
              <button onClick={() => setPeek((p) => !p)}
                className="ml-auto inline-flex items-center gap-1 rounded-full bg-white/90 px-3 py-2 text-xs font-semibold text-rose border border-petal/60">
                {peek ? <><EyeOff className="h-3.5 w-3.5" /> Hide</> : <><Eye className="h-3.5 w-3.5" /> Peek</>}
              </button>
            )}
            <button onClick={() => { playBell(); }}
              className="inline-flex items-center gap-1 rounded-full bg-white/90 px-3 py-2 text-xs font-semibold text-rose border border-petal/60">
              <Bell className="h-3.5 w-3.5" /> Bell
            </button>
          </div>
        </div>
      </div>
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
        html: `<p>🧘🏻‍♀️ ${note.trim()} (${durationMin}m)</p>`,
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

  let streakCount = 0;
  try { streakCount = (JSON.parse(localStorage.getItem(STREAK_KEY) || "{}")?.count) || 0; } catch {}

  return (
    <div className="relative space-y-4 yoga-fade">
      <BloomBubbles count={14} />
      <div className="relative rounded-3xl bg-white/95 backdrop-blur border border-petal/60 p-5 sm:p-7 text-center shadow-md animate-scale-in">
        <span className="clay-blob animate-selected-glow mx-auto grid place-items-center rounded-full text-white" style={{ width: "4.5rem", height: "4.5rem" }}>
          <Flower className="h-9 w-9 animate-icon-breathe" strokeWidth={1.5} />
        </span>
        <h2 className="font-script text-4xl sm:text-5xl text-hotpink mt-3 animate-text-pop">You bloomed.</h2>
        <p className="text-xs text-rose/60 italic mt-1">Your breath, your body, your quiet hour.</p>
        <div className="mt-4 grid grid-cols-3 gap-2.5">
          <div className="rounded-2xl bg-blush/60 border border-petal/50 p-2.5">
            <p className="font-script text-2xl text-hotpink leading-none">{durationMin}</p>
            <p className="mt-1 text-[10px] font-semibold uppercase tracking-wide text-rose/60">min</p>
          </div>
          <div className="rounded-2xl bg-blush/60 border border-petal/50 p-2.5">
            <p className="font-script text-2xl text-hotpink leading-none">{flow.length}</p>
            <p className="mt-1 text-[10px] font-semibold uppercase tracking-wide text-rose/60">poses</p>
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

      <div className="flex flex-wrap gap-2 justify-end">
        <button onClick={onHome} className="rounded-full bg-white/85 px-4 py-2 text-xs font-semibold text-rose border border-petal/60">Home</button>
        <button onClick={onAgain} className="bloom-luxury-btn px-4 py-2 text-xs font-semibold text-white">Practice again</button>
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