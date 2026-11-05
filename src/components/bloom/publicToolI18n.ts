// Strings for the public "magic first" widgets on /tools/<slug>, /fr/tools/<slug>
// and /ar/tools/<slug>. English is the original copy; FR uses "tu", AR is Modern
// Standard Arabic addressing the reader in the feminine.
import type { ToolLang } from "@/lib/toolPagesI18n";

export const LOCALE: Record<ToolLang, string> = { en: "en-US", fr: "fr-FR", ar: "ar-MA" };

type PhaseText = { period: string; follicular: string; fertile: string; ovulation: string; luteal: string };

export type PublicToolStrings = {
  createFree: string;
  phaseName: PhaseText;
  phaseWord: (name: string) => string;
  cycle: {
    title: string; lead: string; lastStart: string; cycleLen: string; periodLen: string;
    dayOf: (n: number) => string; insight: PhaseText;
    nextPeriod: string; today: string; inDays: (n: number) => string; ovulation: string; peak: string;
    fertile: string; higher: string; next3: string; saveTitle: string; saveText: string;
    saveDevice: string; savedDevice: string; savedNote: string;
  };
  cal: {
    title: string; lead: string; weight: string; height: string; age: string; activity: string;
    act: [string, string, string, string]; goal: string; goals: [string, string, string];
    daily: string; bmr: (bmr: number, tdee: number) => string; protein: string; carbs: string; fat: string;
    ctaTitle: string; ctaText: string;
  };
  breath: {
    title: string; lead: string; steps: [string, string, string]; ready: string; pause: string; start: string;
    done: (n: number) => string; ctaTitle: string; ctaText: string;
  };
  budget: {
    title: string; lead: string; income: string; needs: string; wants: string; savings: string;
    needsSub: string; wantsSub: string; savingsSub: string; ctaTitle: string; ctaText: string;
  };
  reveal: { lead: string; taste: string };
};

export const PT: Record<ToolLang, PublicToolStrings> = {
  en: {
    createFree: "Create my free account",
    phaseName: { period: "Period", follicular: "Follicular", fertile: "Fertile", ovulation: "Ovulation", luteal: "Luteal" },
    phaseWord: (n) => `${n} phase`,
    cycle: {
      title: "Calculate your cycle — free",
      lead: "Enter your last period and get your phase today, your fertile window, ovulation day and next period — instantly.",
      lastStart: "First day of last period", cycleLen: "Cycle length (days)", periodLen: "Period length (days)",
      dayOf: (n) => `Day ${n} of your cycle`,
      insight: {
        period: "Your body is resting and renewing. Be extra gentle today — cosy comfort, warm food and light movement.",
        follicular: "Energy is rising. A great window for fresh starts, focus and building momentum.",
        fertile: "You're glowing — a lovely time for connection, creativity and confidence.",
        ovulation: "You're at your peak. Channel this radiant energy into your boldest ideas.",
        luteal: "Energy is winding down. Prioritise rest, warm food and gentle self-care.",
      },
      nextPeriod: "Next period", today: "today", inDays: (n) => `in ${n} days`, ovulation: "Ovulation (est.)", peak: "peak fertility",
      fertile: "Fertile window", higher: "higher chance", next3: "Your next 3 periods",
      saveTitle: "Save your cycle & unlock everything ✿",
      saveText: "Create your free account to save this, get daily phase insights, and sync your meals, workouts and yoga to your cycle — automatically.",
      saveDevice: "Save on this device", savedDevice: "Saved on this device ✓",
      savedNote: "Saved here — it'll sync automatically when you create your account.",
    },
    cal: {
      title: "Your calories & macros — free",
      lead: "Clinically-standard Mifflin-St Jeor maths — the same engine Bloomzein uses inside the app.",
      weight: "Weight (kg)", height: "Height (cm)", age: "Age", activity: "Activity",
      act: ["Mostly resting", "Lightly active", "Active", "Very active"], goal: "Goal", goals: ["Lean out", "Maintain", "Build"],
      daily: "Daily target", bmr: (b, t) => `BMR ${b} · maintenance ~${t} kcal`, protein: "Protein", carbs: "Carbs", fat: "Fat",
      ctaTitle: "Turn this into a plan that fuels your cycle ✿",
      ctaText: "Create your free account to get phase-smart recipes, a weekly meal plan that writes itself, and targets that flex with your training.",
    },
    breath: {
      title: "Try the 4-7-8 breath — free",
      lead: "The calming breath for stress and sleep. Follow the petal: in for 4, hold for 7, out for 8.",
      steps: ["Breathe in", "Hold", "Breathe out"], ready: "Ready?", pause: "Pause", start: "Start breathing",
      done: (n) => `${n} breath${n > 1 ? "s" : ""} done ✿`,
      ctaTitle: "Breathe in sync with your cycle ✿",
      ctaText: "Create your free account for guided sessions, calming sounds, a timer and breathwork matched to your phase.",
    },
    budget: {
      title: "Plan your month — free",
      lead: "The gentle 50/30/20 rule: needs, wants and savings — worked out instantly from your monthly income.",
      income: "Monthly income", needs: "Needs", wants: "Wants", savings: "Savings",
      needsSub: "rent, bills, food", wantsSub: "fun, treats, glow", savingsSub: "future you",
      ctaTitle: "Make it a plan you actually keep ✿",
      ctaText: "Create your free account to set your own categories, track spending and get soft nudges when you're close to a limit.",
    },
    reveal: { lead: "Tap your current phase — Bloomzein tailors everything to where you are.", taste: "This is just a taste ✿" },
  },
  fr: {
    createFree: "Créer mon compte gratuit",
    phaseName: { period: "Menstruelle", follicular: "Folliculaire", fertile: "Fertile", ovulation: "Ovulation", luteal: "Lutéale" },
    phaseWord: (n) => `Phase ${n.toLowerCase()}`,
    cycle: {
      title: "Calcule ton cycle — gratuit",
      lead: "Indique le début de tes dernières règles et découvre tout de suite ta phase du jour, ta fenêtre de fertilité, ton jour d’ovulation et tes prochaines règles.",
      lastStart: "Premier jour des dernières règles", cycleLen: "Durée du cycle (jours)", periodLen: "Durée des règles (jours)",
      dayOf: (n) => `Jour ${n} de ton cycle`,
      insight: {
        period: "Ton corps se repose et se renouvelle. Sois très douce avec toi aujourd’hui : confort, repas chauds et mouvement léger.",
        follicular: "Ton énergie remonte. Un très bon moment pour commencer, te concentrer et avancer.",
        fertile: "Tu rayonnes : un beau moment pour les liens, la créativité et la confiance en toi.",
        ovulation: "Tu es à ton maximum. Mets cette belle énergie dans tes idées les plus audacieuses.",
        luteal: "Ton énergie redescend. Priorité au repos, aux repas chauds et aux petits soins.",
      },
      nextPeriod: "Prochaines règles", today: "aujourd’hui", inDays: (n) => `dans ${n} jours`, ovulation: "Ovulation (estimée)", peak: "fertilité maximale",
      fertile: "Fenêtre de fertilité", higher: "chances plus élevées", next3: "Tes 3 prochaines règles",
      saveTitle: "Enregistre ton cycle et débloque tout ✿",
      saveText: "Crée ton compte gratuit pour le garder, recevoir chaque jour des conseils selon ta phase et synchroniser automatiquement tes repas, ton sport et ton yoga avec ton cycle.",
      saveDevice: "Enregistrer sur cet appareil", savedDevice: "Enregistré sur cet appareil ✓",
      savedNote: "Enregistré ici : tout se synchronisera automatiquement quand tu créeras ton compte.",
    },
    cal: {
      title: "Tes calories et tes macros — gratuit",
      lead: "La formule de référence Mifflin-St Jeor, le même calcul que dans l’appli Bloomzein.",
      weight: "Poids (kg)", height: "Taille (cm)", age: "Âge", activity: "Activité",
      act: ["Plutôt au repos", "Peu active", "Active", "Très active"], goal: "Objectif", goals: ["Perdre du poids", "Maintenir", "Prendre du muscle"],
      daily: "Objectif quotidien", bmr: (b, t) => `Métabolisme de base ${b} · maintien ~${t} kcal`, protein: "Protéines", carbs: "Glucides", fat: "Lipides",
      ctaTitle: "Transforme ce calcul en plan adapté à ton cycle ✿",
      ctaText: "Crée ton compte gratuit pour obtenir des recettes adaptées à ta phase, une semaine de repas qui se planifie toute seule et des objectifs qui suivent ton entraînement.",
    },
    breath: {
      title: "Essaie la respiration 4-7-8 — gratuit",
      lead: "La respiration apaisante contre le stress et pour mieux dormir. Suis le pétale : inspire 4 secondes, retiens 7, expire 8.",
      steps: ["Inspire", "Retiens", "Expire"], ready: "Prête ?", pause: "Pause", start: "Commencer",
      done: (n) => `${n} respiration${n > 1 ? "s" : ""} terminée${n > 1 ? "s" : ""} ✿`,
      ctaTitle: "Respire au rythme de ton cycle ✿",
      ctaText: "Crée ton compte gratuit pour des séances guidées, des sons apaisants, un minuteur et des respirations adaptées à ta phase.",
    },
    budget: {
      title: "Planifie ton mois — gratuit",
      lead: "La règle douce 50/30/20 : besoins, envies et épargne, calculés tout de suite à partir de ton revenu mensuel.",
      income: "Revenu mensuel", needs: "Besoins", wants: "Envies", savings: "Épargne",
      needsSub: "loyer, factures, courses", wantsSub: "sorties, plaisirs, soins", savingsSub: "pour ton futur",
      ctaTitle: "Un budget que tu tiens vraiment ✿",
      ctaText: "Crée ton compte gratuit pour définir tes propres catégories, suivre tes dépenses et recevoir un petit rappel quand tu approches d’une limite.",
    },
    reveal: { lead: "Choisis ta phase actuelle : Bloomzein adapte tout à ton moment du cycle.", taste: "Ce n’est qu’un aperçu ✿" },
  },
  ar: {
    createFree: "أنشئي حسابك المجاني",
    phaseName: { period: "الحيض", follicular: "الجريبية", fertile: "الخصوبة", ovulation: "الإباضة", luteal: "الأصفرية" },
    phaseWord: (n) => `مرحلة ${n}`,
    cycle: {
      title: "احسبي دورتك مجانًا",
      lead: "أدخلي تاريخ بداية آخر دورة، واعرفي فورًا مرحلتك اليوم وفترة الخصوبة ويوم الإباضة وموعد دورتك القادمة.",
      lastStart: "أول يوم من آخر دورة", cycleLen: "طول الدورة (بالأيام)", periodLen: "مدة الحيض (بالأيام)",
      dayOf: (n) => `اليوم ${n} من دورتك`,
      insight: {
        period: "جسمك يرتاح ويتجدّد. كوني لطيفة جدًا مع نفسك: راحة وطعام دافئ وحركة خفيفة.",
        follicular: "طاقتك ترتفع. وقت مناسب للبدايات الجديدة والتركيز والتقدّم.",
        fertile: "أنتِ متألّقة: وقت جميل للتواصل والإبداع والثقة بالنفس.",
        ovulation: "أنتِ في ذروة طاقتك. وجّهي هذه الطاقة إلى أجرأ أفكارك.",
        luteal: "طاقتك تنخفض تدريجيًا. الأولوية للراحة والطعام الدافئ والعناية اللطيفة بنفسك.",
      },
      nextPeriod: "الدورة القادمة", today: "اليوم", inDays: (n) => (n === 1 ? "بعد يوم واحد" : n === 2 ? "بعد يومين" : n <= 10 ? `بعد ${n} أيام` : `بعد ${n} يومًا`), ovulation: "الإباضة (تقديرًا)", peak: "ذروة الخصوبة",
      fertile: "فترة الخصوبة", higher: "احتمال أعلى", next3: "مواعيد دوراتك الثلاث القادمة",
      saveTitle: "احفظي دورتك واستفيدي من كل شيء ✿",
      saveText: "أنشئي حسابك المجاني لحفظ هذه النتائج، والحصول يوميًا على نصائح حسب مرحلتك، ومزامنة وجباتك وتمارينك ويوغاك مع دورتك تلقائيًا.",
      saveDevice: "احفظي على هذا الجهاز", savedDevice: "تم الحفظ على هذا الجهاز ✓",
      savedNote: "تم الحفظ هنا، وستتم المزامنة تلقائيًا عند إنشاء حسابك.",
    },
    cal: {
      title: "سعراتك وعناصرك الغذائية مجانًا",
      lead: "معادلة Mifflin-St Jeor المعتمدة، وهي الحساب نفسه المستعمل داخل تطبيق Bloomzein.",
      weight: "الوزن (كغ)", height: "الطول (سم)", age: "العمر", activity: "النشاط",
      act: ["في راحة غالبًا", "نشاط خفيف", "نشيطة", "نشيطة جدًا"], goal: "الهدف", goals: ["إنقاص الوزن", "المحافظة", "بناء العضلات"],
      daily: "الهدف اليومي", bmr: (b, t) => `الأيض الأساسي ${b} · للمحافظة ~${t} سعرة`, protein: "بروتين", carbs: "كربوهيدرات", fat: "دهون",
      ctaTitle: "حوّلي هذا الحساب إلى برنامج يناسب دورتك ✿",
      ctaText: "أنشئي حسابك المجاني للحصول على وصفات تناسب مرحلتك، وأسبوع وجبات يُخطَّط تلقائيًا، وأهداف تتكيّف مع تمارينك.",
    },
    breath: {
      title: "جرّبي تنفّس 4-7-8 مجانًا",
      lead: "تنفّس مهدّئ للتوتر وللنوم. اتبعي البتلة: شهيق 4 ثوانٍ، حبس النفس 7، زفير 8.",
      steps: ["شهيق", "احبسي النفس", "زفير"], ready: "مستعدة؟", pause: "إيقاف مؤقت", start: "ابدئي التنفّس",
      done: (n) => `أكملتِ ${n} ${n === 1 ? "نفَسًا" : n === 2 ? "نفَسين" : n <= 10 ? "أنفاس" : "نفَسًا"} ✿`,
      ctaTitle: "تنفّسي على إيقاع دورتك ✿",
      ctaText: "أنشئي حسابك المجاني لحصص موجّهة وأصوات مهدّئة ومؤقّت وتمارين تنفّس تناسب مرحلتك.",
    },
    budget: {
      title: "خطّطي لشهرك مجانًا",
      lead: "قاعدة 50/30/20 البسيطة: الضروريات والكماليات والادّخار، محسوبة فورًا من دخلك الشهري.",
      income: "الدخل الشهري", needs: "الضروريات", wants: "الكماليات", savings: "الادّخار",
      needsSub: "الكراء، الفواتير، الطعام", wantsSub: "الترفيه، الهدايا، العناية", savingsSub: "لمستقبلك",
      ctaTitle: "ميزانية تلتزمين بها فعلًا ✿",
      ctaText: "أنشئي حسابك المجاني لتحديد فئاتك الخاصة، ومتابعة مصاريفك، وتلقّي تنبيه لطيف عند الاقتراب من الحدّ.",
    },
    reveal: { lead: "اختاري مرحلتك الحالية، وسيكيّف Bloomzein كل شيء حسب موقعك من الدورة.", taste: "هذه مجرّد لمحة ✿" },
  },
};

type Sample = { headline: string; items: string[] };
type PhaseKey = "period" | "follicular" | "ovulation" | "luteal";
export type RevealSet = { title: string; cta: string; byPhase: Record<PhaseKey, Sample> };

/** French + Arabic samples for PublicMagicReveal (English lives in the component). */
export const REVEAL_I18N: Record<"fr" | "ar", Record<string, RevealSet>> = {
  fr: {
    "meal-planner": {
      title: "Découvre une journée adaptée à ta phase — gratuit",
      cta: "Crée ton compte gratuit pour obtenir une semaine complète qui se planifie toute seule : recettes selon ta phase, liste de courses et objectifs qui suivent ton entraînement.",
      byPhase: {
        period: { headline: "Réconfortant et riche en fer", items: ["Petit-déjeuner : flocons d’avoine cacao et banane", "Déjeuner : soupe de lentilles aux épinards", "Dîner : saumon au gingembre, légumes verts et riz"] },
        follicular: { headline: "Léger, frais et énergisant", items: ["Petit-déjeuner : smoothie bowl protéiné aux fruits rouges", "Déjeuner : salade arc-en-ciel poulet et quinoa", "Dîner : tofu sauté et légumes croquants"] },
        ovulation: { headline: "Coloré et anti-inflammatoire", items: ["Petit-déjeuner : yaourt grec, graines et figues", "Déjeuner : poke bowl au saumon", "Dîner : poulet grillé et légumes rôtis"] },
        luteal: { headline: "Rassasiant, pour calmer les envies", items: ["Petit-déjeuner : poêlée de patate douce et œuf", "Déjeuner : wrap pois chiches et avocat", "Dîner : chili à la dinde et un carré de chocolat noir"] },
      },
    },
    "workout-programs": {
      title: "Découvre une séance adaptée à ta phase — gratuit",
      cta: "Crée ton compte gratuit pour des programmes complets qui s’intensifient quand tu es en forme et ralentissent quand tu en as besoin, semaine après semaine.",
      byPhase: {
        period: { headline: "Mobilité douce et marche", items: ["Mobilité 10 min", "Marche tranquille 20 min", "Étirements légers et respiration"] },
        follicular: { headline: "Renforcement", items: ["Squats gobelet 3×10", "Pompes 3×8", "Soulevés de terre roumains 3×10"] },
        ovulation: { headline: "Puissance maximale / HIIT", items: ["Sprints 8×20 s", "Squats sautés 4×12", "Kettlebell swings 4×15"] },
        luteal: { headline: "Régulier et doux", items: ["Circuit complet modéré", "Marche en pente 25 min", "Gainage et mobilité pour finir"] },
      },
    },
    yoga: {
      title: "Découvre une séance de yoga pour ta phase — gratuit",
      cta: "Crée ton compte gratuit pour des séances guidées selon ton cycle, de 5 minutes à la séance complète, pour apaiser les crampes ou retrouver ton éclat.",
      byPhase: {
        period: { headline: "Réparateur et apaisant", items: ["Posture de l’enfant : 2 min", "Torsion allongée : 1 min de chaque côté", "Jambes contre le mur : 5 min"] },
        follicular: { headline: "Séance énergisante", items: ["Salutations au soleil ×5", "Enchaînement du guerrier II", "Série de postures d’équilibre"] },
        ovulation: { headline: "Force et ouverture", items: ["Vinyasa dynamique", "Série de planches latérales", "Posture du danseur"] },
        luteal: { headline: "Ancrage et calme", items: ["Ouvertures de hanches douces", "Flexions avant", "Pont soutenu : 3 min"] },
      },
    },
    journal: {
      title: "Une question pour écrire, selon ton moment — gratuit",
      cta: "Crée ton compte gratuit pour écrire chaque jour, suivre ton humeur et voir tes tendances apparaître au fil de ton cycle.",
      byPhase: {
        period: { headline: "Repos et lâcher-prise", items: ["De quoi puis-je me libérer cette semaine ?", "Comment ai-je envie qu’on prenne soin de moi aujourd’hui ?", "Un petit réconfort que je vais m’offrir."] },
        follicular: { headline: "Rêver et planifier", items: ["Qu’est-ce que j’ai envie de commencer ?", "Un objectif que j’aimerais faire avancer.", "Vers quoi mon énergie m’attire-t-elle ?"] },
        ovulation: { headline: "Créer du lien et briller", items: ["À qui ai-je envie d’écrire ?", "Qu’est-ce qui me fait me sentir le plus moi-même ?", "Une idée audacieuse que je vais oser dire."] },
        luteal: { headline: "Prendre du recul en douceur", items: ["Qu’est-ce qui demande mon attention ?", "Où puis-je être moins exigeante avec moi ?", "Une chose dont je suis fière ce cycle-ci."] },
      },
    },
  },
  ar: {
    "meal-planner": {
      title: "اكتشفي يومًا من الوجبات يناسب مرحلتك مجانًا",
      cta: "أنشئي حسابك المجاني لتحصلي على أسبوع كامل يُخطَّط تلقائيًا: وصفات حسب مرحلتك، وقائمة تسوّق، وأهداف تتكيّف مع تمارينك.",
      byPhase: {
        period: { headline: "أطعمة دافئة غنية بالحديد", items: ["الفطور: شوفان بالكاكاو والموز", "الغداء: شوربة العدس بالسبانخ", "العشاء: سلمون بالزنجبيل مع خضار ورز"] },
        follicular: { headline: "خفيفة ومنعشة ومنشّطة", items: ["الفطور: وعاء سموذي بروتين بالتوت", "الغداء: سلطة ملوّنة بالدجاج والكينوا", "العشاء: توفو مقلي مع خضار مقرمشة"] },
        ovulation: { headline: "ملوّنة ومضادة للالتهاب", items: ["الفطور: زبادي يوناني مع بذور وتين", "الغداء: وعاء بوكي بالسلمون", "العشاء: دجاج مشوي مع خضار محمّصة"] },
        luteal: { headline: "مشبعة وتهدّئ الرغبة في السكريات", items: ["الفطور: بطاطا حلوة مع بيض", "الغداء: لفافة الحمص والأفوكادو", "العشاء: تشيلي الديك الرومي مع قطعة شوكولاتة داكنة"] },
      },
    },
    "workout-programs": {
      title: "اكتشفي حصة تمرين تناسب مرحلتك مجانًا",
      cta: "أنشئي حسابك المجاني لبرامج كاملة تشتدّ حين تكونين في كامل قوتك وتهدأ حين تحتاجين إلى الراحة، أسبوعًا بعد أسبوع.",
      byPhase: {
        period: { headline: "مرونة لطيفة ومشي", items: ["تمارين مرونة 10 دقائق", "مشي هادئ 20 دقيقة", "تمدّد خفيف وتنفّس"] },
        follicular: { headline: "بناء القوة", items: ["قرفصاء بالدمبل 3×10", "ضغط 3×8", "رفعة مميتة رومانية 3×10"] },
        ovulation: { headline: "ذروة القوة / تمارين متقطعة عالية الشدة", items: ["عدو سريع 8×20 ثانية", "قرفصاء مع قفز 4×12", "أرجحة الكيتلبيل 4×15"] },
        luteal: { headline: "ثابتة وداعمة", items: ["دائرة تمارين متوسطة لكامل الجسم", "مشي على منحدر 25 دقيقة", "ختام بتمارين البطن والمرونة"] },
      },
    },
    yoga: {
      title: "اكتشفي حصة يوغا تناسب مرحلتك مجانًا",
      cta: "أنشئي حسابك المجاني لحصص موجّهة حسب دورتك، من 5 دقائق إلى حصة كاملة، لتخفيف التقلّصات أو استعادة إشراقتك.",
      byPhase: {
        period: { headline: "مريحة ومهدّئة", items: ["وضعية الطفل: دقيقتان", "الالتواء مستلقية: دقيقة لكل جهة", "رفع الساقين على الحائط: 5 دقائق"] },
        follicular: { headline: "حصة منشّطة", items: ["تحية الشمس ×5", "تسلسل المحاربة 2", "سلسلة وضعيات التوازن"] },
        ovulation: { headline: "قوة وانفتاح", items: ["فينياسا ديناميكية", "سلسلة اللوح الجانبي", "وضعية الراقصة"] },
        luteal: { headline: "تثبيت وهدوء", items: ["فتح لطيف للورك", "انحناءات أمامية", "الجسر المدعوم: 3 دقائق"] },
      },
    },
    journal: {
      title: "سؤال للكتابة يناسب حالتك مجانًا",
      cta: "أنشئي حسابك المجاني لتكتبي يوميًا، وتتابعي مزاجك، وتري أنماطه تظهر عبر دورتك.",
      byPhase: {
        period: { headline: "راحة وتخلّص", items: ["ما الذي يمكنني التخلّي عنه هذا الأسبوع؟", "كيف أحبّ أن يُعتنى بي اليوم؟", "شيء صغير مريح سأقدّمه لنفسي."] },
        follicular: { headline: "حلم وتخطيط", items: ["ما الذي أتحمّس لبدئه؟", "هدف أحبّ أن أتقدّم فيه.", "إلى أين تأخذني طاقتي؟"] },
        ovulation: { headline: "تواصل وتألّق", items: ["مع من أرغب في التواصل؟", "ما الذي يجعلني أشعر بأنني على طبيعتي؟", "فكرة جريئة سأقولها بصوت عالٍ."] },
        luteal: { headline: "تأمّل ولين", items: ["ما الذي يطلب انتباهي؟", "أين يمكنني أن أخفّف من ضغطي على نفسي؟", "شيء أفخر به في هذه الدورة."] },
      },
    },
  },
};
