
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft, ArrowRight, Sparkles, Play, Pause, SkipForward, X, Eye, EyeOff,
  Clock, Heart, Moon, Sun, Sparkle, Activity, CircleDot, Volume2, VolumeX,
  Bell, Languages, Music, Calendar, Flame, ChevronRight, ChevronLeft,
  GraduationCap, BookOpen, Headphones, Flower, BellRing, Info,
} from "lucide-react";
import { BloomBubbles } from "@/components/bloom/BloomBubbles";
import { subscribeToPush, syncScheduledNotifications, getCurrentUserId, type ScheduledNotificationInput } from "@/lib/push";

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
  P({ slug: "easy-seat", name: "Easy Seat", sanskrit: "Sukhasana", group: "Breathing", level: "Beginner", image: "/images/pose-easy-seat.png", floorOnly: true,
    cues: {
      en: "Come to a comfortable cross-legged seat. Lengthen your spine, soften your shoulders, rest your hands on your knees. Breathe in slowly through the nose, and out through the nose.",
      fr: "Installe-toi en tailleur, dos long, épaules relâchées, mains sur les genoux. Inspire lentement par le nez, expire par le nez.",
      ar: "اجلسي متربعةً بثبات، أطيلي العمود الفقري، أرخي الكتفين، وضعي يديكِ على ركبتيكِ. شهيق بطيء من الأنف، ثم زفير من الأنف.",
    }}),
  P({ slug: "cat-cow", name: "Cat-Cow", group: "Warm-up", level: "Beginner", image: "/images/pose-cat-cow.png", floorOnly: true,
    cues: {
      en: "On your hands and knees, inhale and drop the belly, lift the chest and gaze. Exhale, round the spine, tuck the chin. Flow gently with your breath.",
      fr: "À quatre pattes. Inspire en creusant le dos et en levant le regard. Expire en arrondissant le dos, menton rentré. Suis ton souffle.",
      ar: "على يديكِ وركبتيكِ. شهيق مع خفض البطن ورفع الصدر والنظر، ثم زفير مع تقويس الظهر وضم الذقن. تدفّقي مع التنفس.",
    }}),
  P({ slug: "childs-pose", name: "Child's Pose", sanskrit: "Balasana", group: "Warm-up", level: "Beginner", image: "/images/pose-childs-pose.png", floorOnly: true,
    cues: {
      en: "Knees wide, big toes touching. Sit back on your heels and fold forward, forehead to the mat, arms long. Soften here. Let the breath move into the back of your body.",
      fr: "Genoux écartés, gros orteils joints. Assieds-toi sur les talons, plie-toi en avant, front au sol, bras allongés. Respire dans le dos.",
      ar: "افتحي الركبتين وضمّي الإبهامين. اجلسي على الكعبين، انحني للأمام، الجبهة على البساط، والذراعان ممدودتان. تنفّسي في ظهرك.",
    }}),
  P({ slug: "seated-twist", name: "Seated Twist", group: "Warm-up", level: "Beginner", image: "/images/pose-seated-twist.png", floorOnly: true,
    cues: {
      en: "Sit tall, cross-legged. Inhale, lift through the crown. Exhale, twist gently to the right, one hand behind you, one on the opposite knee. Hold, then return and switch sides.",
      fr: "Assise en tailleur, dos long. Inspire en t'allongeant. Expire en torsadant doucement à droite. Tiens, puis change de côté.",
      ar: "اجلسي متربعة بظهر طويل. شهيق ثم زفير مع التواء لطيف لليمين. ثبّتي، ثم بدّلي.",
    }}),
  P({ slug: "low-lunge", name: "Low Lunge", sanskrit: "Anjaneyasana", group: "Hips", level: "Beginner", image: "/images/pose-low-lunge.png",
    cues: {
      en: "Step the right foot forward, knee over ankle. Lower the left knee. Sweep the arms overhead and open the chest. Sink the hips gently. Breathe slow and deep.",
      fr: "Pied droit devant, genou au-dessus de la cheville. Pose le genou gauche. Bras vers le ciel, poitrine ouverte. Souffle profondément.",
      ar: "اخطي بالقدم اليمنى للأمام، والركبة فوق الكاحل. أنزلي الركبة اليسرى. ارفعي الذراعين، افتحي الصدر، تنفّسي بعمق.",
    }}),
  P({ slug: "butterfly", name: "Butterfly", sanskrit: "Baddha Konasana", group: "Hips", level: "Beginner", image: "/images/pose-butterfly.png", floorOnly: true,
    cues: {
      en: "Sit tall, soles of the feet together, knees fall open like wings. Hold your feet. Let the breath soften the hips with every exhale.",
      fr: "Assise droite, plantes des pieds jointes, genoux ouverts. Tiens tes pieds. À chaque expir, les hanches se relâchent.",
      ar: "اجلسي بظهر مستقيم، باطنا القدمين ملتقيان والركبتان مفتوحتان. أمسكي قدميكِ. مع كل زفير، يلين الورك.",
    }}),
  P({ slug: "pigeon", name: "Pigeon Pose", group: "Hips", level: "Intermediate", image: "/images/pose-pigeon.png",
    cues: {
      en: "From all fours, bring the right shin forward, back leg long. Square the hips, lengthen the spine, and gently fold over the front leg. Breathe into the hip.",
      fr: "Depuis quatre pattes, amène le tibia droit devant, jambe arrière allongée. Plie-toi doucement sur la jambe avant. Respire dans la hanche.",
      ar: "من وضع الأطراف الأربع، قدّمي الساق اليمنى وامديها للخلف. ساوي الوركين وانحني فوق الساق الأمامية. تنفّسي في الورك.",
    }}),
  P({ slug: "garland", name: "Garland", sanskrit: "Malasana", group: "Hips", level: "Intermediate", image: "/images/pose-garland.png",
    cues: {
      en: "Feet a little wider than hips, sink into a deep squat. Hands at heart, elbows press knees open. Lift the chest, lengthen the spine.",
      fr: "Pieds un peu plus larges que les hanches, accroupis-toi profondément. Mains au cœur, coudes ouvrent les genoux. Poitrine haute.",
      ar: "افتحي القدمين قليلاً، انزلي في القرفصاء العميق. اليدان أمام القلب، المرفقان يفتحان الركبتين. ارفعي الصدر.",
    }}),
  P({ slug: "mountain", name: "Mountain", sanskrit: "Tadasana", group: "Standing", level: "Beginner", image: "/images/pose-mountain.png",
    cues: {
      en: "Stand tall, feet rooted. Crown lifts, shoulders soften, arms long by your sides. Feel grounded and steady, like a mountain.",
      fr: "Debout, pieds ancrés. La couronne s'élève, les épaules se relâchent. Sens-toi stable comme une montagne.",
      ar: "قفي بثبات، القدمان متجذرتان، التاج يرتفع، الكتفان مرتاحان. اشعري بالقوة كجبل.",
    }}),
  P({ slug: "forward-fold", name: "Forward Fold", group: "Standing", level: "Beginner", image: "/images/pose-forward-fold.png",
    cues: {
      en: "From standing, hinge at the hips and fold forward. Knees soft. Let the head hang heavy. Release the spine with every exhale.",
      fr: "Debout, plie-toi à partir des hanches. Genoux souples, tête lourde. À chaque expir, relâche la colonne.",
      ar: "من الوقوف، انحني من الوركين للأمام. ركبتان مرنتان، الرأس ثقيلة. مع كل زفير، حرّري العمود الفقري.",
    }}),
  P({ slug: "downward-dog", name: "Downward Dog", group: "Standing", level: "Beginner", image: "/images/pose-downward-dog.png",
    cues: {
      en: "Hands shoulder-width, feet hip-width. Lift the hips up and back into an inverted V. Press the floor away, lengthen the spine. Pedal the feet if you like.",
      fr: "Mains largeur des épaules, pieds largeur des hanches. Hanches vers le ciel en V renversé. Allonge la colonne. Pédale si tu veux.",
      ar: "اليدان بعرض الكتفين، القدمان بعرض الورك. ارفعي الوركين لأعلى وللخلف على شكل حرف V مقلوب. أطيلي العمود الفقري.",
    }}),
  P({ slug: "warrior-1", name: "Warrior I", sanskrit: "Virabhadrasana I", group: "Standing", level: "Intermediate", image: "/images/pose-warrior-1.png",
    cues: {
      en: "Right foot forward, knee over ankle. Back foot angled, heel grounded. Hips face forward. Reach the arms straight up. Strong and steady.",
      fr: "Pied droit devant, genou aligné. Pied arrière incliné, talon ancré. Hanches face devant. Bras vers le ciel. Forte et stable.",
      ar: "القدم اليمنى للأمام، الركبة فوق الكاحل. القدم الخلفية مائلة والكعب راسخ. الوركان للأمام. ارفعي الذراعين. قوية وثابتة.",
    }}),
  P({ slug: "warrior-2", name: "Warrior II", group: "Standing", level: "Intermediate", image: "/images/pose-warrior-2.png",
    cues: {
      en: "Step the feet wide. Front knee bends over the ankle, back leg straight. Open the arms parallel to the floor, gaze over the front hand. Roar quietly inside.",
      fr: "Pieds bien écartés. Genou avant plié, jambe arrière tendue. Bras parallèles au sol, regard sur la main avant.",
      ar: "افتحي القدمين على نطاق واسع. الركبة الأمامية مثنية، الساق الخلفية ممدودة. الذراعان موازيتان للأرض، النظر فوق اليد الأمامية.",
    }}),
  P({ slug: "triangle", name: "Triangle", group: "Standing", level: "Intermediate", image: "/images/pose-triangle.png",
    cues: {
      en: "Legs wide and straight. Front foot turned out. Reach forward over the front leg, then hand to shin or block. Top arm reaches to the sky. Open the chest.",
      fr: "Jambes écartées, tendues. Pied avant tourné. Tends vers l'avant, main sur le tibia. Bras du haut vers le ciel. Ouvre la poitrine.",
      ar: "ساقان مفتوحتان ومستقيمتان، القدم الأمامية للخارج. امتدّي للأمام، اليد على الساق، والذراع العلوية للسماء. افتحي الصدر.",
    }}),
  P({ slug: "chair", name: "Chair", sanskrit: "Utkatasana", group: "Strength", level: "Beginner", image: "/images/pose-chair.png",
    cues: {
      en: "Feet together. Bend the knees as if sitting back in an invisible chair. Weight in the heels. Arms reach up alongside the ears. Strong legs, calm breath.",
      fr: "Pieds joints. Plie les genoux comme assise sur une chaise invisible. Poids dans les talons. Bras le long des oreilles.",
      ar: "القدمان معاً. اثني الركبتين كأنكِ تجلسين على كرسي خفي. الوزن على الكعبين. الذراعان للأعلى بجانب الأذنين.",
    }}),
  P({ slug: "tree", name: "Tree", sanskrit: "Vrksasana", group: "Balance", level: "Intermediate", image: "/images/pose-tree.png",
    cues: {
      en: "Stand tall. Shift weight to the left foot. Place the right foot on the inner calf or thigh (never the knee). Hands at heart. Find a steady gaze.",
      fr: "Debout. Transfère le poids à gauche. Pied droit contre le mollet ou la cuisse (jamais le genou). Mains au cœur. Regard fixe.",
      ar: "قفي بثبات. انقلي الوزن لليسار. ضعي القدم اليمنى على باطن الساق أو الفخذ (ليس الركبة). اليدان أمام القلب.",
    }}),
  P({ slug: "half-moon", name: "Half Moon", group: "Balance", level: "Advanced", image: "/images/pose-half-moon.png",
    cues: {
      en: "From Triangle, bend the front knee, walk the fingertips forward. Float the back leg up parallel to the floor. Stack the hips, top arm to the sky. Bright and open.",
      fr: "Depuis la triangle, plie le genou avant, avance les doigts. Décolle la jambe arrière, parallèle au sol. Empile les hanches.",
      ar: "من المثلث، اثني الركبة الأمامية وتقدّمي بأصابع اليد. ارفعي الساق الخلفية موازية للأرض. كدّسي الوركين.",
    }}),
  P({ slug: "cobra", name: "Cobra", group: "Backbends", level: "Beginner", image: "/images/pose-cobra.png", floorOnly: true,
    cues: {
      en: "Lie face down. Hands under the shoulders, elbows hugged in. Press the tops of the feet down, lift the chest. Keep the shoulders soft and away from the ears.",
      fr: "Allongée sur le ventre. Mains sous les épaules. Appuie les pieds, soulève la poitrine. Épaules basses, loin des oreilles.",
      ar: "استلقي على بطنكِ. اليدان تحت الكتفين. اضغطي بأعلى القدمين، ارفعي الصدر. الكتفان مرتاحان بعيداً عن الأذنين.",
    }}),
  P({ slug: "bridge", name: "Bridge", group: "Backbends", level: "Beginner", image: "/images/pose-bridge.png", floorOnly: true,
    cues: {
      en: "Lie on your back, knees bent, feet flat. Press into the feet to lift the hips. Roll the shoulders under, breathe into the front body. Open the chest.",
      fr: "Sur le dos, genoux pliés, pieds à plat. Pousse pour lever les hanches. Rentre les épaules dessous. Ouvre la poitrine.",
      ar: "استلقي على ظهرك، الركبتان مثنيتان والقدمان مسطحتان. اضغطي بالقدمين لرفع الوركين. افتحي الصدر.",
    }}),
  P({ slug: "camel", name: "Camel", sanskrit: "Ustrasana", group: "Backbends", level: "Advanced", image: "/images/pose-camel.png",
    cues: {
      en: "Kneel, hips over knees. Hands on the low back. Lift the chest up and back, then reach for the heels if it feels safe. Open the heart, soften the throat.",
      fr: "À genoux, hanches au-dessus des genoux. Mains au bas du dos. Lève la poitrine, puis attrape les talons si tu peux. Ouvre le cœur.",
      ar: "اركعي، الوركان فوق الركبتين. اليدان أسفل الظهر. ارفعي الصدر للأعلى وللخلف، ثم اتجهي للكعبين إن أمكن. افتحي القلب.",
    }}),
  P({ slug: "seated-forward-fold", name: "Seated Forward Fold", sanskrit: "Paschimottanasana", group: "Forward folds", level: "Beginner", image: "/images/pose-seated-forward-fold.png", floorOnly: true,
    cues: {
      en: "Sit with legs long. Inhale, lengthen the spine. Exhale and fold forward from the hips. Hands to shins or feet. Soften, breathe, surrender.",
      fr: "Assise, jambes tendues. Inspire, allonge le dos. Expire, plie-toi en avant. Mains sur les tibias ou les pieds.",
      ar: "اجلسي والساقان ممدودتان. شهيق وأطيلي العمود. زفير وانحني للأمام من الوركين. اليدان على الساقين أو القدمين.",
    }}),
  P({ slug: "head-to-knee", name: "Head-to-Knee", sanskrit: "Janu Sirsasana", group: "Forward folds", level: "Beginner", image: "/images/pose-head-to-knee.png", floorOnly: true,
    cues: {
      en: "Extend the right leg, bend the left knee, sole to inner right thigh. Fold over the long leg. Soften the neck. Switch sides.",
      fr: "Jambe droite tendue, genou gauche plié, plante sur la cuisse droite. Plie-toi sur la jambe longue. Change de côté.",
      ar: "مدّي الساق اليمنى، اثني الركبة اليسرى وضعي القدم على باطن الفخذ. انحني فوق الساق الممدودة. بدّلي.",
    }}),
  P({ slug: "wide-leg-fold", name: "Wide-Leg Fold", group: "Forward folds", level: "Beginner", image: "/images/pose-wide-leg-fold.png",
    cues: {
      en: "Step the feet wide, toes slightly in. Hinge at the hips and fold forward. Hands to the mat or hold the elbows. Let the head be heavy.",
      fr: "Pieds bien écartés, orteils légèrement vers l'intérieur. Plie-toi depuis les hanches. Mains au sol ou aux coudes.",
      ar: "افتحي القدمين، الأصابع للداخل قليلاً. انحني من الوركين للأمام. اليدان على البساط أو على المرفقين.",
    }}),
  P({ slug: "reclined-bound-angle", name: "Reclined Bound Angle", group: "Restorative", level: "Beginner", image: "/images/pose-reclined-bound-angle.png", floorOnly: true,
    cues: {
      en: "Lie on your back. Bring the soles of the feet together and let the knees fall open. Arms relaxed by your sides. Rest here, soften the belly.",
      fr: "Sur le dos. Plantes des pieds jointes, genoux ouverts. Bras le long du corps. Repose-toi, ventre doux.",
      ar: "استلقي على ظهركِ. ضمّي باطني القدمين واترك الركبتين تنفتحان. الذراعان مرتاحان. استريحي وأرخي البطن.",
    }}),
  P({ slug: "knees-to-chest", name: "Knees-to-Chest", group: "Restorative", level: "Beginner", image: "/images/pose-knees-to-chest.png", floorOnly: true,
    cues: {
      en: "Lie on your back. Hug both knees gently into your chest. Rock side to side if it feels good. Massage the lower back.",
      fr: "Sur le dos. Serre doucement les genoux contre la poitrine. Berce-toi de côté à côté si tu veux. Masse le bas du dos.",
      ar: "استلقي على ظهرك. عانقي الركبتين برفق على الصدر. تمايلي يمنة ويسرة، ودلّكي أسفل الظهر.",
    }}),
  P({ slug: "supine-twist", name: "Supine Twist", group: "Restorative", level: "Beginner", image: "/images/pose-supine-twist.png", floorOnly: true,
    cues: {
      en: "On your back, arms out like a T. Draw the knees in, then let them fall to the right. Turn your head left. Long, soft breaths. Switch sides.",
      fr: "Sur le dos, bras en T. Genoux pliés, laisse-les tomber à droite. Regarde à gauche. Respiration longue. Change de côté.",
      ar: "على ظهرك، الذراعان على شكل حرف T. اثني الركبتين ثم أنزليهما لليمين. أديري الرأس لليسار. أنفاس طويلة، ثم بدّلي.",
    }}),
  P({ slug: "legs-up-wall", name: "Legs-Up-the-Wall", group: "Restorative", level: "Beginner", image: "/images/pose-legs-up-wall.png", floorOnly: true,
    cues: {
      en: "Lie back and rest your legs straight up against a wall. Arms relaxed, palms up. Stay for several breaths and let everything melt down.",
      fr: "Allonge-toi, jambes droites contre le mur. Bras détendus, paumes vers le haut. Plusieurs respirations, tout se relâche.",
      ar: "استلقي وأسندي الساقين على الحائط. الذراعان مرتاحان، الراحتان للأعلى. عدة أنفاس، واتركي كل شيء يذوب.",
    }}),
  P({ slug: "savasana", name: "Savasana", sanskrit: "Corpse Pose", group: "Restorative", level: "Beginner", image: "/images/pose-savasana.png", floorOnly: true,
    cues: {
      en: "Lie completely flat. Legs slightly apart, arms by your sides with palms up. Close the eyes. Let go of effort. Just breathe and receive.",
      fr: "Allonge-toi à plat. Jambes légèrement écartées, bras le long du corps, paumes ouvertes. Ferme les yeux. Lâche tout effort.",
      ar: "استلقي بلطف. الساقان متباعدتان قليلاً، والذراعان بجانبك والراحتان للأعلى. أغمضي عينيكِ، وتخلّي عن أي مجهود.",
    }}),
  P({ slug: "plank", name: "Plank", group: "Strength", level: "Intermediate", image: "/images/pose-plank.png",
    cues: {
      en: "Hands under shoulders, legs long. One straight line from crown to heels. Hug the belly in, breathe steadily. Strong everywhere.",
      fr: "Mains sous les épaules, jambes tendues. Une ligne droite du sommet aux talons. Engage le ventre, respire.",
      ar: "اليدان تحت الكتفين، الساقان ممدودتان. خط مستقيم من التاج إلى الكعبين. شدّي البطن وتنفّسي.",
    }}),
  P({ slug: "boat", name: "Boat", sanskrit: "Navasana", group: "Strength", level: "Intermediate", image: "/images/pose-boat.png",
    cues: {
      en: "Sit, lean back slightly, lift the feet. Shins parallel to the floor, or legs straight if you can. Arms reach forward. Long spine, strong core.",
      fr: "Assise, penche-toi un peu en arrière, soulève les pieds. Tibias parallèles, ou jambes tendues. Bras devant. Dos long.",
      ar: "اجلسي ومالي للخلف قليلاً، ارفعي القدمين. الساقان موازيتان للأرض أو ممدودتان. الذراعان للأمام، عمود طويل.",
    }}),
  P({ slug: "side-plank", name: "Side Plank", group: "Strength", level: "Advanced", image: "/images/pose-side-plank.png",
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

  // Duration scaling
  let mainCount = 4;
  if (durationMin >= 20) mainCount = 6;
  if (durationMin >= 30) mainCount = 8;
  if (durationMin >= 45) mainCount = 10;
  if (durationMin >= 60) mainCount = 12;

  const composed: string[] = [
    ...safe(warmup),
    ...safe(byLevel(main)).slice(0, mainCount),
    ...safe(cooldown),
    ...rest,
  ];
  // dedupe while preserving order
  const seen = new Set<string>();
  return composed
    .filter((s) => POSE_BY_SLUG[s] && !seen.has(s) && (seen.add(s), true))
    .map((s) => POSE_BY_SLUG[s]);
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
const STEP_KEY = "bloom:yoga-step"; // 1 learn, 2 visual, 3 audio
const STREAK_KEY = "bloom:yoga-streak";
export const SCHEDULE_KEY = "bloom:yoga-schedule";
export const REMINDER_KEY = "bloom:yoga-reminder";
const DIARY_KEY = "bloom:diary-entries";
const CYCLE_PHASE_KEY = "bloom:cycle-phase"; // optional, read-only

interface Streak { count: number; lastISO: string | null; }

function todayISO() { return new Date().toISOString().slice(0, 10); }
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
function isYesterday(iso: string) {
  const d = new Date(iso); const y = new Date(); y.setDate(y.getDate() - 1);
  return d.toISOString().slice(0,10) === y.toISOString().slice(0,10);
}

// ===================== TTS HOOK =====================

function useSpeaker() {
  const [supported, setSupported] = useState(false);
  useEffect(() => { setSupported(typeof window !== "undefined" && "speechSynthesis" in window); }, []);
  const speak = (text: string, langBcp: string, opts?: { rate?: number; pitch?: number }) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    try {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = langBcp;
      u.rate = opts?.rate ?? 0.92;
      u.pitch = opts?.pitch ?? 1;
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

// ===================== PAGE =====================

type View =
  | { kind: "home" }
  | { kind: "library" }
  | { kind: "setup" }
  | { kind: "session"; flow: Pose[]; lang: Lang; mode: Mode; intention: Intention; hold: number; durationMin: number }
  | { kind: "summary"; flow: Pose[]; intention: Intention; durationMin: number; moodBefore?: string; moodAfter?: string };

export default function YogaPage() {
  const [onboarded, setOnboarded] = useState(false);
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [view, setView] = useState<View>({ kind: "home" });

  useEffect(() => {
    try {
      setOnboarded(localStorage.getItem(ONBOARD_KEY) === "1");
      const s = Number(localStorage.getItem(STEP_KEY) || "1");
      if ([1,2,3].includes(s)) setStep(s as 1|2|3);
    } catch {}
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

  return (
    <div className="relative animate-fade-in">
      <BloomBubbles count={10} />

      <a href="/app/tools" className="mb-3 inline-flex items-center gap-1 text-sm text-rose hover:text-hotpink">
        <ArrowLeft className="h-4 w-4" /> All tools
      </a>

      {view.kind === "home" && (
        <YogaHome
          onboarded={onboarded}
          step={step}
          onBegin={beginNow}
          onLibrary={() => { setView({ kind: "library" }); advanceStep(Math.max(step, 1) as 1|2|3); }}
          onSetup={() => setView({ kind: "setup" })}
          onStepGoTo={(s) => advanceStep(s)}
        />
      )}

      {view.kind === "library" && (
        <Library onBack={() => setView({ kind: "home" })} onSetup={() => setView({ kind: "setup" })} />
      )}

      {view.kind === "setup" && (
        <Setup
          onBack={() => setView({ kind: "home" })}
          onStart={(cfg) => {
            const flow = buildFlow(cfg);
            setView({ kind: "session", flow, lang: cfg.lang, mode: cfg.mode, intention: cfg.intention, hold: holdSecondsFor(cfg.durationMin, cfg.level), durationMin: cfg.durationMin });
          }}
        />
      )}

      {view.kind === "session" && (
        <SessionPlayer
          flow={view.flow}
          lang={view.lang}
          mode={view.mode}
          hold={view.hold}
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

// ===================== HOME =====================

function YogaHome({
  onboarded, step, onBegin, onLibrary, onSetup, onStepGoTo,
}: {
  onboarded: boolean; step: 1|2|3;
  onBegin: () => void; onLibrary: () => void; onSetup: () => void; onStepGoTo: (s: 1|2|3) => void;
}) {
  const [streak, setStreak] = useState<Streak>({ count: 0, lastISO: null });
  const [phase, setPhase] = useState<Phase | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STREAK_KEY);
      if (raw) setStreak(JSON.parse(raw));
    } catch {}
    try {
      const p = localStorage.getItem(CYCLE_PHASE_KEY);
      if (p === "menstrual" || p === "follicular" || p === "ovulation" || p === "luteal") setPhase(p);
    } catch {}
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

  return (
    <div className="space-y-4 sm:space-y-6 yoga-fade">
      {/* HEADER + HERO */}
      <header className="grid gap-4 sm:gap-6 lg:grid-cols-[1.1fr_1fr] items-stretch">
        <div className="relative overflow-hidden rounded-3xl bg-white/85 backdrop-blur border border-petal/60 p-5 sm:p-7 shadow-xl shadow-rose/10">
          <h1 className="font-script text-4xl sm:text-6xl text-hotpink leading-none">Yoga Flows</h1>
          <p className="mt-2 text-sm sm:text-base text-rose/80">guided breath, gentle movement — your softest practice.</p>

          {!onboarded ? (
            <div className="mt-4 sm:mt-6 rounded-2xl bg-blush/60 p-4 border border-petal/50">
              <p className="text-sm font-semibold text-rose">New here? Welcome.</p>
              <p className="text-xs text-rose/80 mt-1">We'll guide you in 3 calm steps: learn the poses → flow with visuals → close your eyes for an audio practice.</p>
              <button
                onClick={onBegin}
                className="mt-4 inline-flex items-center gap-2 rounded-full bloom-button-gradient px-5 py-3 text-sm font-bold text-white shadow-xl"
              >
                <Sparkles className="h-4 w-4" /> Start Here
              </button>
            </div>
          ) : (
            <div className="mt-4 flex flex-wrap gap-2">
              <button onClick={onSetup} className="inline-flex items-center gap-2 rounded-full bloom-button-gradient px-4 py-2.5 text-sm font-bold text-white shadow-lg">
                <Play className="h-4 w-4" /> Start a session
              </button>
              <button onClick={onLibrary} className="inline-flex items-center gap-2 rounded-full bg-white/90 px-4 py-2.5 text-sm font-semibold text-rose border border-petal/60">
                <BookOpen className="h-4 w-4" /> Pose library
              </button>
            </div>
          )}
        </div>

        <div className="relative overflow-hidden rounded-3xl border border-petal/60 shadow-xl shadow-rose/10 min-h-[180px]">
          <img src="/images/yoga-hero.png" alt="Soft pink yoga moment" className="absolute inset-0 h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-blush/60 via-transparent to-transparent" />
        </div>
      </header>

      {/* GUIDED STEPS */}
      <section className="rounded-3xl bg-white/85 backdrop-blur border border-petal/60 p-4 sm:p-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-rose/60">Your path</p>
            <h2 className="font-script text-2xl sm:text-3xl text-hotpink leading-none">three soft steps</h2>
          </div>
          <span className="text-xs text-rose/70">Step {step} of 3</span>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <StepCard n={1} active={step === 1} done={step > 1} icon={BookOpen}
            title="Learn the poses" desc="A visual library — names, breath, and how to enter each pose."
            cta="Open library" onClick={() => { onLibrary(); onStepGoTo(2); }} />
          <StepCard n={2} active={step === 2} done={step > 2} icon={GraduationCap}
            title="Try a guided flow" desc="A short session with visuals + voice — pose by pose."
            cta="Start short flow" onClick={() => { onSetup(); }} />
          <StepCard n={3} active={step === 3} done={false} icon={Headphones}
            title="Eyes-closed audio" desc="When poses feel familiar, close your eyes and let the voice lead."
            cta="Audio session" onClick={() => { onSetup(); }} />
        </div>
      </section>

      {/* STREAK + CYCLE SUGGESTION */}
      <section className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-3xl bg-white/85 backdrop-blur border border-petal/60 p-4 sm:p-5">
          <div className="flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-hotpink text-white"><Flame className="h-5 w-5" strokeWidth={1.8} /></span>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-rose/60">Streak</p>
              <p className="font-script text-2xl text-hotpink leading-none">{streak.count} days blooming</p>
            </div>
          </div>
          <p className="mt-2 text-xs text-rose/75">{streak.count === 0 ? "Your first session begins your streak." : "Keep the soft momentum going."}</p>
        </div>
        <div className="rounded-3xl bg-white/85 backdrop-blur border border-petal/60 p-4 sm:p-5">
          <div className="flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-hotpink text-white"><Flower className="h-5 w-5" strokeWidth={1.8} /></span>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-rose/60">Cycle sync — {phaseSuggestion.phase}</p>
              <p className="text-sm font-semibold text-rose leading-snug">{phaseSuggestion.label}</p>
            </div>
          </div>
          <button
            onClick={onSetup}
            className="mt-3 inline-flex items-center gap-1 rounded-full bg-hotpink px-3.5 py-1.5 text-xs font-semibold text-white shadow-md"
          >
            Practice for today <ArrowRight className="h-3 w-3" />
          </button>
        </div>
      </section>

      {/* ORGANIZER */}
      <Organizer />

      {/* SAFETY */}
      <p className="text-[11px] sm:text-xs text-rose/70 italic px-1 inline-flex items-start gap-1.5">
        <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" />
        Listen to your body, ease off if anything hurts, and check with your doctor if pregnant or injured.
      </p>
    </div>
  );
}

function StepCard({
  n, active, done, icon: Icon, title, desc, cta, onClick,
}: { n: number; active: boolean; done: boolean; icon: typeof Sun; title: string; desc: string; cta: string; onClick: () => void; }) {
  return (
    <div className={[
      "rounded-2xl p-3.5 sm:p-4 border transition",
      active ? "bg-blush/70 border-hotpink/40 shadow-lg shadow-hotpink/15"
             : done ? "bg-white/70 border-petal/50 opacity-80"
                    : "bg-white/70 border-petal/50",
    ].join(" ")}>
      <div className="flex items-center gap-2">
        <span className={["grid h-9 w-9 place-items-center rounded-full text-sm font-bold",
          active ? "bg-hotpink text-white" : done ? "bg-petal text-rose" : "bg-white text-rose border border-petal"].join(" ")}>
          {done ? "✓" : n}
        </span>
        <Icon className="h-4 w-4 text-hotpink" strokeWidth={1.8} />
        <p className="text-sm font-bold text-rose">{title}</p>
      </div>
      <p className="mt-2 text-xs text-rose/75 leading-snug">{desc}</p>
      <button onClick={onClick}
        className={["mt-3 inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-semibold shadow",
          active ? "bg-hotpink text-white shadow-hotpink/30" : "bg-white text-hotpink border border-petal/60"].join(" ")}>
        {cta} <ChevronRight className="h-3 w-3" />
      </button>
    </div>
  );
}

function Organizer() {
  const [schedule, setSchedule] = useState<Record<string, string | null>>({});
  const [reminder, setReminder] = useState("07:30");

  useEffect(() => {
    try {
      const raw = localStorage.getItem(SCHEDULE_KEY); if (raw) setSchedule(JSON.parse(raw));
      const r = localStorage.getItem(REMINDER_KEY); if (r) setReminder(r);
    } catch {}
  }, []);

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
    try { localStorage.setItem(SCHEDULE_KEY, JSON.stringify(next)); } catch {}
    if (val) askForNotifications();
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
  const options = [null, "Morning energy", "Stress relief", "Sleep prep", "Cycle sync", "Strength"];

  return (
    <section className="rounded-3xl bg-white/85 backdrop-blur border border-petal/60 p-4 sm:p-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-rose/60">Organizer</p>
          <h2 className="font-script text-2xl sm:text-3xl text-hotpink leading-none">your soft week</h2>
        </div>
        <label className="inline-flex items-center gap-2 text-xs font-semibold text-rose">
          <BellRing className="h-3.5 w-3.5" /> Reminder
          <input type="time" value={reminder} onChange={(e) => updateReminder(e.target.value)}
            className="rounded-full bg-blush/60 border border-petal/60 px-3 py-1 text-xs font-semibold text-rose outline-none focus:ring-2 focus:ring-hotpink/30" />
        </label>
      </div>
      <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
        {days.map((d) => (
          <div key={d} className="rounded-2xl bg-blush/40 border border-petal/50 p-2">
            <p className="text-[10px] font-bold uppercase tracking-wider text-rose/70 mb-1">{d}</p>
            <select
              value={schedule[d] ?? ""}
              onChange={(e) => update(d, e.target.value || null)}
              className="w-full rounded-lg bg-white/90 border border-petal/60 px-2 py-1.5 text-[11px] font-semibold text-rose outline-none focus:ring-2 focus:ring-hotpink/30"
            >
              {options.map((o) => <option key={o ?? "rest"} value={o ?? ""}>{o ?? "Rest"}</option>)}
            </select>
          </div>
        ))}
      </div>
    </section>
  );
}

// ===================== LIBRARY =====================

function Library({ onBack, onSetup }: { onBack: () => void; onSetup: () => void }) {
  const [active, setActive] = useState<Level>("Beginner");
  const filtered = useMemo(() => POSES.filter((p) => p.level === active), [active]);

  return (
    <div className="space-y-4 yoga-fade">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-rose/60">Step 1</p>
          <h2 className="font-script text-3xl sm:text-5xl text-hotpink leading-none">Learn the poses</h2>
          <p className="text-xs sm:text-sm text-rose/80 mt-1">Tap any pose to read how to enter it and find your breath.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={onBack} className="rounded-full bg-white/85 px-3 py-1.5 text-xs font-semibold text-rose border border-petal/60">Home</button>
          <button onClick={onSetup} className="rounded-full bg-hotpink px-3 py-1.5 text-xs font-semibold text-white shadow-md">Next: try a flow</button>
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {(["Beginner","Intermediate","Advanced"] as Level[]).map((lv) => (
          <button key={lv} onClick={() => setActive(lv)}
            className={[
              "shrink-0 rounded-full px-4 py-1.5 text-xs font-semibold border transition",
              active === lv ? "bg-hotpink text-white border-transparent shadow-md shadow-hotpink/30" : "bg-white/85 text-rose border-petal/60",
            ].join(" ")}>
            {lv}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
        {filtered.map((p) => <PoseCard key={p.slug} pose={p} />)}
      </div>
    </div>
  );
}

function PoseCard({ pose }: { pose: Pose }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-2xl sm:rounded-3xl bg-white/90 backdrop-blur border border-petal/60 overflow-hidden shadow-md shadow-rose/10 hover:-translate-y-0.5 hover:shadow-lg transition">
      <button onClick={() => setOpen((v) => !v)} className="block w-full text-left">
        <div className="aspect-square bg-blush/40">
          <img src={pose.image} alt={pose.name} loading="lazy" width={1024} height={1024} className="h-full w-full object-cover" referrerPolicy="no-referrer" />
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
const SOUNDS = ["Silence", "Rain", "Singing bowls", "Forest"] as const;

function Setup({
  onBack, onStart,
}: {
  onBack: () => void;
  onStart: (cfg: { durationMin: number; intention: Intention; level: Level; lang: Lang; sound: typeof SOUNDS[number]; mode: Mode; phase: Phase }) => void;
}) {
  const [durationMin, setDuration] = useState(20);
  const [intention, setIntention] = useState<Intention>("morning");
  const [level, setLevel] = useState<Level>("Beginner");
  const [lang, setLang] = useState<Lang>("en");
  const [sound, setSound] = useState<typeof SOUNDS[number]>("Silence");
  const [mode, setMode] = useState<Mode>("visual");
  const [phase, setPhase] = useState<Phase>("follicular");

  useEffect(() => {
    try {
      const p = localStorage.getItem(CYCLE_PHASE_KEY);
      if (p === "menstrual" || p === "follicular" || p === "ovulation" || p === "luteal") setPhase(p);
    } catch {}
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
          className="inline-flex items-center gap-2 rounded-full bloom-button-gradient px-6 py-3 text-sm font-bold text-white shadow-xl"
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
  flow, lang, mode, hold, onExit, onDone,
}: {
  flow: Pose[]; lang: Lang; mode: Mode; hold: number; onExit: () => void; onDone: () => void;
}) {
  const [idx, setIdx] = useState(0);
  const [running, setRunning] = useState(true);
  const [remaining, setRemaining] = useState(hold);
  const [muted, setMuted] = useState(false);
  const [peek, setPeek] = useState(false);
  const { supported, speak, stop } = useSpeaker();
  const wakeLockRef = useRef<any>(null);
  const lastSpokenIdx = useRef<number>(-1);
  const langBcp = LANGS.find((l) => l.id === lang)?.bcp || "en-US";
  const pose = flow[idx];
  const midIdx = Math.floor(flow.length / 2);

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

  // Speak pose cue on idx change
  useEffect(() => {
    if (!pose || muted) return;
    if (lastSpokenIdx.current === idx) return;
    lastSpokenIdx.current = idx;

    playBell();
    const intro = `${pose.name}. `;
    const text = intro + pose.cues[lang];

    // Future: if pose.audioUrl exists, play it instead.
    if (pose.audioUrl) {
      try {
        const a = new Audio(pose.audioUrl);
        a.play().catch(() => speak(text, langBcp));
      } catch { speak(text, langBcp); }
    } else if (supported) {
      // small delay so bell finishes
      const t = setTimeout(() => speak(text, langBcp), 600);
      return () => clearTimeout(t);
    }

    // Mid-session encouragement
    if (idx === midIdx && idx !== 0 && idx !== flow.length - 1) {
      setTimeout(() => { if (!muted) speak(ENCOURAGE[lang], langBcp, { rate: 0.88 }); }, 4000);
    }
    // Closing affirmation on last pose
    if (idx === flow.length - 1) {
      setTimeout(() => { if (!muted) speak(CLOSING[lang], langBcp, { rate: 0.85 }); }, 4000);
    }
  }, [idx, pose, muted, lang]);

  // Timer
  useEffect(() => {
    if (!running) return;
    setRemaining(hold);
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
  }, [idx, running, hold]);

  function finishSession() {
    stop();
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
    } catch {}
    onDone();
  }

  if (!pose) return null;

  const progress = ((idx + 1) / flow.length) * 100;
  const dim = mode === "audio" && !peek;

  return (
    <div className={["yoga-fade", dim ? "" : ""].join(" ")}>
      {/* TOP BAR */}
      <div className="flex items-center justify-between gap-3 mb-3">
        <button onClick={() => { stop(); onExit(); }} className="inline-flex items-center gap-1 rounded-full bg-white/90 px-3 py-1.5 text-xs font-semibold text-rose border border-petal/60">
          <X className="h-3.5 w-3.5" /> End
        </button>
        <div className="flex-1 max-w-md mx-auto h-1.5 bg-petal/40 rounded-full overflow-hidden">
          <div className="h-full bg-hotpink transition-all" style={{ width: `${progress}%` }} />
        </div>
        <div className="flex items-center gap-1.5">
          <button onClick={() => setMuted((m) => { const n = !m; if (n) stop(); return n; })}
            className="inline-flex items-center gap-1 rounded-full bg-white/90 px-2.5 py-1.5 text-xs font-semibold text-rose border border-petal/60">
            {muted ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
          </button>
        </div>
      </div>

      <div className={["rounded-3xl border border-petal/60 overflow-hidden shadow-xl shadow-rose/10 transition",
        dim ? "bg-rose/95 text-white" : "bg-white/90 backdrop-blur"].join(" ")}>
        {/* IMAGE / PACER */}
        <div className={["relative", dim ? "bg-rose/95" : "bg-blush/40"].join(" ")}>
          {!dim ? (
            <img src={pose.image} alt={pose.name} className="w-full aspect-[4/3] sm:aspect-[16/9] object-cover" referrerPolicy="no-referrer" />
          ) : (
            <div className="w-full aspect-[4/3] sm:aspect-[16/9] grid place-items-center relative">
              <div className="breath-pacer h-28 w-28 sm:h-40 sm:w-40 rounded-full bg-white/20 border border-white/40 grid place-items-center text-white">
                <CircleDot className="h-7 w-7 opacity-80" strokeWidth={1.5} />
              </div>
              <p className="absolute bottom-3 text-[11px] font-semibold uppercase tracking-wider text-white/70">breathe with the circle</p>
            </div>
          )}
        </div>

        {/* TEXT */}
        <div className={["p-4 sm:p-6", dim ? "text-white" : ""].join(" ")}>
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

          <p dir={lang === "ar" ? "rtl" : "ltr"} className={["mt-3 text-sm sm:text-base leading-relaxed", dim ? "text-white/90" : "text-rose/90"].join(" ")}>
            {pose.cues[lang]}
          </p>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <button onClick={() => setRunning((r) => !r)}
              className="inline-flex items-center gap-2 rounded-full bg-hotpink px-4 py-2 text-sm font-bold text-white shadow-md shadow-hotpink/30">
              {running ? <><Pause className="h-4 w-4" /> Pause</> : <><Play className="h-4 w-4" /> Resume</>}
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
    </div>
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
      const raw = localStorage.getItem(DIARY_KEY);
      const arr = raw ? JSON.parse(raw) : [];
      arr.unshift({
        id: Date.now(),
        date: new Date().toISOString(),
        text: `🧘🏻‍♀️ ${note.trim()} (yoga · ${INTENTIONS.find(i=>i.id===intention)?.label} · ${durationMin}m)`,
      });
      localStorage.setItem(DIARY_KEY, JSON.stringify(arr));
      setSaved(true);
    } catch {}
  };

  const intentionLabel = INTENTIONS.find((i) => i.id === intention)?.label || "Practice";

  return (
    <div className="space-y-4 yoga-fade">
      <div className="rounded-3xl bg-white/90 backdrop-blur border border-petal/60 p-5 sm:p-7 text-center">
        <Sparkles className="h-6 w-6 text-hotpink mx-auto" />
        <h2 className="font-script text-4xl sm:text-5xl text-hotpink mt-1">You bloomed.</h2>
        <p className="text-sm text-rose/80 mt-1">{intentionLabel} · {durationMin} min · {flow.length} poses</p>
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
            className="inline-flex items-center gap-1 rounded-full bg-hotpink px-4 py-2 text-xs font-semibold text-white shadow-md disabled:opacity-60">
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
        <button onClick={onAgain} className="rounded-full bg-hotpink px-4 py-2 text-xs font-semibold text-white shadow-md">Practice again</button>
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