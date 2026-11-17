// Home page copy in English, French and Arabic (written for each language, not
// word-for-word). Order of `flagship`, `grid`, `features`, `nav` and `footer`
// matches the arrays in Landing.tsx.
import type { SiteLang } from "@/lib/siteLang";

export interface LandingCopy {
  heroAlt: string;
  kicker: string;
  h1: [string, string, string];
  sub: string;
  cta: string;
  ctaShort: string;
  preparing: string;
  download: string;
  everything: string;
  allInOne: string;
  signoff: [string, string];
  signoffRight: [string, string];
  introKicker: string;
  introTitle: string;
  introBody: [string, string, string]; // before / emphasised / after
  explore: string;
  moreKicker: string;
  moreTitle: string;
  ctaTitle: string;
  ctaBody: string;
  noCard: string;
  footerTag: string;
  madeWith: string;
  ios: [string, string, string];
  features: string[];
  nav: string[];
  footer: string[];
  flagship: { kicker: string; title: string; body: string }[];
  grid: { kicker: string; body: string }[];
}

export const LANDING_COPY: Record<SiteLang, LandingCopy> = {
  en: {
    heroAlt: "A woman practising cycle-synced yoga at home",
    kicker: "Your cycle-synced companion 🌸",
    h1: ["A happier,", "healthier you", "in every phase"],
    sub: "Workouts, yoga, meal plans, cycle tracking, journaling and more — all in one beautifully simple app.",
    cta: "Start Blooming — free",
    ctaShort: "Start Blooming",
    preparing: "Preparing…",
    download: "Download App",
    everything: "Everything you need",
    allInOne: "All in one place",
    signoff: ["Small steps", "Big results"],
    signoffRight: ["More energy. A calmer mind.", "A stronger, happier you."],
    introKicker: "Everything, connected",
    introTitle: "Ten tools. One you.",
    introBody: ["No more juggling six apps that don't talk to each other. Bloomzein reads your cycle once and quietly tunes", "everything", "— so your whole day just fits."],
    explore: "Explore",
    moreKicker: "And so much more",
    moreTitle: "Your whole life, in bloom.",
    ctaTitle: "Bloom with your cycle, not against it.",
    ctaBody: "Join the women turning their rhythm into their superpower — one gentle, beautiful day at a time.",
    noCard: "No credit card · Cancel anytime 🌸",
    footerTag: "Cycle tracking, nutrition, fitness & self-care — designed for your body, mind & life.",
    madeWith: "Made with love",
    ios: ["On iPhone:", "Share", "Add to Home Screen"],
    features: ["Workouts", "Yoga", "Meal Plans", "Cycle Tracking", "Journaling", "Habits", "Water", "Budget"],
    nav: ["Home", "Features", "How It Works", "Read", "Plans", "About"],
    footer: ["Read", "Pricing", "Privacy", "Terms", "Refunds", "Help", "FAQ"],
    flagship: [
      { kicker: "Cycle sync", title: "Know your body like never before.", body: "Track your cycle once and watch every tool adapt to your phase — automatically. Your energy, cravings and mood, finally decoded." },
      { kicker: "Yoga studio", title: "Flows that meet you where you are.", body: "Cycle-aware yoga, guided and beautiful — from 5-minute resets to full classes that soften cramps or wake up your glow." },
      { kicker: "Workouts", title: "Move with your energy, not against it.", body: "Strength, HIIT and mobility that rise when you're powerful and rest when you're not — perfectly matched to your phase." },
      { kicker: "Meals & recipes", title: "Eat exactly what your body's asking for.", body: "Phase-smart recipes and a weekly meal plan that writes itself — nourishing, gorgeous, and effortless." },
    ],
    grid: [
      { kicker: "Today", body: "One calm home screen that pulls it all together each morning." },
      { kicker: "Calendar", body: "Every phase, symptom and plan on one gorgeous calendar." },
      { kicker: "Diet & nutrition", body: "Calorie & macro targets that flex with your training and phase." },
      { kicker: "Dreamy diary", body: "Journal your mood and let gentle patterns reveal themselves." },
      { kicker: "Notes & reminders", body: "Gentle nudges for water, meds, movement and me-time." },
      { kicker: "Budget", body: "A calm, cute budget that keeps your self-care sustainable." },
      { kicker: "Bloom coach", body: "Personalized guidance that connects every tool for you." },
      { kicker: "Read", body: "A magazine of cycle, beauty, sleep & mind reads." },
    ],
  },
  fr: {
    heroAlt: "Une femme fait une séance de yoga adaptée à son cycle chez elle",
    kicker: "Ton alliée, au rythme de ton cycle 🌸",
    h1: ["Plus heureuse,", "plus en forme", "à chaque phase"],
    sub: "Sport, yoga, menus, suivi du cycle, journal et bien plus : tout dans une seule appli, simple et jolie.",
    cta: "Commencer gratuitement",
    ctaShort: "Commencer",
    preparing: "Préparation…",
    download: "Télécharger l'appli",
    everything: "Tout ce qu'il te faut",
    allInOne: "Au même endroit",
    signoff: ["Petits pas", "Grands effets"],
    signoffRight: ["Plus d'énergie. L'esprit plus léger.", "Toi, en plus forte et plus heureuse."],
    introKicker: "Tout est relié",
    introTitle: "Dix outils. Une seule toi.",
    introBody: ["Fini de jongler entre six applis qui ne se parlent pas. Bloomzein lit ton cycle une fois, puis ajuste", "tout", "en douceur, pour que ta journée tombe juste."],
    explore: "Découvrir",
    moreKicker: "Et ce n'est pas tout",
    moreTitle: "Toute ta vie, en fleur.",
    ctaTitle: "Avance avec ton cycle, pas contre lui.",
    ctaBody: "Rejoins les femmes qui font de leur rythme une force, un jour doux après l'autre.",
    noCard: "Sans carte bancaire · Annulable à tout moment 🌸",
    footerTag: "Suivi du cycle, nutrition, sport et soin de soi, pensés pour ton corps, ton esprit et ta vie.",
    madeWith: "Fait avec amour",
    ios: ["Sur iPhone :", "Partager", "Sur l'écran d'accueil"],
    features: ["Sport", "Yoga", "Menus", "Cycle", "Journal", "Habitudes", "Eau", "Budget"],
    nav: ["Accueil", "Fonctions", "Comment ça marche", "À lire", "Offres", "À propos"],
    footer: ["À lire", "Tarifs", "Confidentialité", "Conditions", "Remboursements", "Aide", "FAQ"],
    flagship: [
      { kicker: "Synchro du cycle", title: "Comprends enfin ton corps.", body: "Renseigne ton cycle une fois : chaque outil s'adapte ensuite à ta phase, tout seul. Ton énergie, tes envies, ton humeur, enfin lisibles." },
      { kicker: "Studio de yoga", title: "Des séances qui partent de là où tu en es.", body: "Un yoga guidé qui tient compte de ton cycle : de la pause de 5 minutes au cours complet, pour calmer les crampes ou retrouver ton éclat." },
      { kicker: "Entraînements", title: "Bouge avec ton énergie, pas contre elle.", body: "Renforcement, HIIT et mobilité : on monte d'un cran quand tu es en forme, on lève le pied quand ton corps le demande. Toujours calé sur ta phase." },
      { kicker: "Repas et recettes", title: "Mange ce dont ton corps a vraiment besoin.", body: "Des recettes pensées pour chaque phase et un menu de la semaine qui se prépare tout seul. Bon, beau, et sans prise de tête." },
    ],
    grid: [
      { kicker: "Aujourd'hui", body: "Un écran d'accueil calme qui rassemble tout, chaque matin." },
      { kicker: "Calendrier", body: "Tes phases, tes symptômes et tes programmes sur un seul calendrier." },
      { kicker: "Alimentation", body: "Des objectifs de calories et de macros qui suivent ton sport et ta phase." },
      { kicker: "Journal", body: "Note ton humeur et laisse les tendances apparaître d'elles-mêmes." },
      { kicker: "Notes et rappels", body: "De petits rappels pour l'eau, les médicaments, le sport et le temps pour toi." },
      { kicker: "Budget", body: "Un budget simple pour prendre soin de toi sans te ruiner." },
      { kicker: "Coach Bloom", body: "Des conseils personnalisés qui font le lien entre tous tes outils." },
      { kicker: "À lire", body: "Un magazine sur le cycle, la beauté, le sommeil et le moral." },
    ],
  },
  ar: {
    heroAlt: "امرأة تمارس اليوغا في بيتها بما يناسب دورتها",
    kicker: "رفيقتك على إيقاع دورتك 🌸",
    h1: ["أكثر سعادة،", "وأكثر صحة", "في كل مرحلة"],
    sub: "تمارين، يوغا، وجبات، متابعة الدورة، يوميات وأكثر، كلها في تطبيق واحد بسيط وجميل.",
    cta: "ابدئي مجانا",
    ctaShort: "ابدئي الآن",
    preparing: "لحظة من فضلك…",
    download: "حمّلي التطبيق",
    everything: "كل ما تحتاجينه",
    allInOne: "في مكان واحد",
    signoff: ["خطوات صغيرة", "ونتائج كبيرة"],
    signoffRight: ["طاقة أكثر وبال أهدأ.", "وأنتِ أقوى وأسعد."],
    introKicker: "كل شيء مترابط",
    introTitle: "عشر أدوات، وأنتِ في قلبها.",
    introBody: ["لا داعي للتنقل بين ستة تطبيقات لا يعرف أحدها شيئا عن الآخر. يقرأ Bloomzein دورتك مرة واحدة، ثم يضبط", "كل شيء", "بهدوء حتى ينسجم يومك كله."],
    explore: "اكتشفي",
    moreKicker: "وهناك المزيد",
    moreTitle: "حياتك كلها تزهر.",
    ctaTitle: "عيشي مع دورتك، لا ضدها.",
    ctaBody: "انضمي إلى نساء جعلن من إيقاعهن مصدر قوة، يوما هادئا بعد يوم.",
    noCard: "دون بطاقة بنكية · يمكنك الإلغاء متى شئت 🌸",
    footerTag: "متابعة الدورة والتغذية والرياضة والعناية بالنفس، صُممت لجسدك وذهنك وحياتك.",
    madeWith: "صُنع بحب",
    ios: ["على iPhone:", "مشاركة", "إضافة إلى الشاشة الرئيسية"],
    features: ["تمارين", "يوغا", "وجبات", "الدورة", "يوميات", "عادات", "الماء", "الميزانية"],
    nav: ["الرئيسية", "المزايا", "كيف يعمل", "اقرئي", "الباقات", "من نحن"],
    footer: ["اقرئي", "الأسعار", "الخصوصية", "الشروط", "الاسترجاع", "المساعدة", "الأسئلة الشائعة"],
    flagship: [
      { kicker: "تزامن الدورة", title: "اعرفي جسدك كما لم تعرفيه من قبل.", body: "سجّلي دورتك مرة واحدة، وكل أداة تتكيف بعدها مع مرحلتك من تلقاء نفسها. طاقتك ورغباتك ومزاجك، أخيرا صارت مفهومة." },
      { kicker: "استوديو اليوغا", title: "حصص تبدأ من حيث أنتِ.", body: "يوغا موجّهة تراعي دورتك: من استراحة خمس دقائق إلى حصة كاملة، لتخفيف التقلصات أو لاستعادة إشراقتك." },
      { kicker: "التمارين", title: "تحركي مع طاقتك، لا ضدها.", body: "تقوية وHIIT ومرونة: نرفع الإيقاع حين تكونين في أحسن حال، ونخففه حين يطلب جسدك الراحة. دائما حسب مرحلتك." },
      { kicker: "الوجبات والوصفات", title: "كلي ما يحتاجه جسدك فعلا.", body: "وصفات تناسب كل مرحلة، وخطة وجبات أسبوعية تُحضَّر وحدها. مغذية وجميلة ودون تعب." },
    ],
    grid: [
      { kicker: "اليوم", body: "شاشة رئيسية هادئة تجمع لك كل شيء كل صباح." },
      { kicker: "التقويم", body: "مراحلك وأعراضك وبرامجك في تقويم واحد." },
      { kicker: "التغذية", body: "أهداف السعرات والعناصر الغذائية تتغير مع تمارينك ومرحلتك." },
      { kicker: "اليوميات", body: "دوّني مزاجك واتركي الأنماط تظهر وحدها." },
      { kicker: "ملاحظات وتذكيرات", body: "تذكيرات لطيفة للماء والدواء والحركة ووقتك الخاص." },
      { kicker: "الميزانية", body: "ميزانية بسيطة لتعتني بنفسك دون أن تُرهقي جيبك." },
      { kicker: "مدربة Bloom", body: "نصائح شخصية تربط بين كل أدواتك." },
      { kicker: "اقرئي", body: "مجلة عن الدورة والجمال والنوم والحالة النفسية." },
    ],
  },
};
