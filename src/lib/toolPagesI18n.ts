// =============================================================================
// French + Arabic versions of the public tool landing pages (/fr/tools/<slug>,
// /ar/tools/<slug>). English stays the source in toolPages.ts; this file only
// carries the translated copy, keyed by the same slugs.
//
// IMPORTANT: keep this free of React/asset imports — vite.config imports it
// (through toolPages.ts) at build time for the prerenderer and the sitemap.
// =============================================================================

import type { ToolFaq, ToolSection } from "./toolPages";

export type ToolLang = "en" | "fr" | "ar";
export const TOOL_LANGS: ToolLang[] = ["en", "fr", "ar"];

export type ToolCopy = {
  name: string;
  metaTitle: string;
  metaDescription: string;
  h1: string;
  intro: string;
  sections: ToolSection[];
  faqs: ToolFaq[];
};

/** UI strings shared by every tool page (header, CTAs, headings, footer). */
export type ToolUi = {
  home: string;
  tools: string;
  start: string;
  startFree: string;
  open: (name: string) => string;
  faq: string;
  more: string;
  footerTitle: string;
  footerText: string;
  read: string;
  privacy: string;
  notFound: string;
  back: string;
  appNote: string;
};

export const TOOL_UI: Record<ToolLang, ToolUi> = {
  en: {
    home: "Home", tools: "Tools", start: "Start Blooming", startFree: "Start Blooming — free",
    open: (n) => `Open ${n}`, faq: "Frequently asked questions", more: "Explore more tools",
    footerTitle: "Your softest era starts here ✿",
    footerText: "Cycle, meals, movement, mind and life — one beautiful app, synced to your body.",
    read: "Read", privacy: "Privacy", notFound: "Tool not found", back: "Back to Bloomzein", appNote: "",
  },
  fr: {
    home: "Accueil", tools: "Outils", start: "Commencer", startFree: "Commencer — gratuit",
    open: (n) => `Ouvrir ${n}`, faq: "Questions fréquentes", more: "Découvre d’autres outils",
    footerTitle: "Ta plus belle version commence ici ✿",
    footerText: "Cycle, repas, sport, mental et quotidien : une seule belle appli, synchronisée avec ton corps.",
    read: "Lire", privacy: "Confidentialité", notFound: "Outil introuvable", back: "Retour à Bloomzein",
    appNote: "L’application est pour l’instant en anglais ; elle arrive bientôt en français.",
  },
  ar: {
    home: "الرئيسية", tools: "الأدوات", start: "ابدئي الآن", startFree: "ابدئي مجانًا",
    open: (n) => `افتحي ${n}`, faq: "أسئلة شائعة", more: "اكتشفي أدوات أخرى",
    footerTitle: "أجمل نسخة منكِ تبدأ من هنا ✿",
    footerText: "الدورة، الوجبات، الرياضة، الراحة النفسية والحياة اليومية: تطبيق واحد جميل يتناغم مع جسمك.",
    read: "اقرئي", privacy: "الخصوصية", notFound: "الأداة غير موجودة", back: "العودة إلى Bloomzein",
    appNote: "التطبيق متاح حاليًا باللغة الإنجليزية، والنسخة العربية قادمة قريبًا.",
  },
};

export const TOOL_COPY: Record<"fr" | "ar", Record<string, ToolCopy>> = {
  fr: {
    "cycle-tracker": {
      name: "Suivi du cycle",
      metaTitle: "Appli de suivi du cycle et des règles — Bloomzein",
      metaDescription: "Suis ton cycle et tes règles, connais ta phase du moment et reçois chaque jour des conseils pour ton énergie, ton humeur et tes symptômes. Gratuit sur Bloomzein.",
      h1: "Suivi du cycle et des règles",
      intro: "Avec Bloomzein, tu notes tes règles en quelques secondes et tu comprends tout ton mois, pas seulement les jours de saignement. Tu vois ta phase actuelle (menstruelle, folliculaire, ovulatoire, lutéale), ce qui t’attend, et des conseils doux pour ton énergie, tes envies et ton humeur.",
      sections: [
        { h: "Connais ta phase chaque jour", p: "Vois exactement où tu en es dans ton cycle et ce que cela signifie pour ton corps : ton énergie, tes séances et tes repas prennent enfin du sens." },
        { h: "Note règles et symptômes en un geste", p: "Enregistre tes règles, ton flux, tes symptômes et ton humeur d’un simple toucher. Bloomzein apprend ton rythme et prévoit tes prochaines règles et ta fenêtre de fertilité." },
        { h: "Tous les outils suivent ton cycle", p: "Ton cycle alimente toute l’appli : repas, sport, yoga et soins s’adaptent automatiquement à ta phase. Une seule source de vérité pour ton corps." },
      ],
      faqs: [
        { q: "Le suivi du cycle est-il gratuit ?", a: "Oui. Tu peux suivre ton cycle, tes règles et tes symptômes gratuitement dans Bloomzein. L’abonnement Bloom+ ajoute les programmes complets, les rapports et une expérience sans publicité." },
        { q: "L’appli prévoit-elle mes prochaines règles ?", a: "Oui. Bloomzein apprend la durée de ton cycle, prévoit tes prochaines règles et ta fenêtre de fertilité, et s’ajuste à chaque nouvelle saisie." },
        { q: "Quelles sont les quatre phases du cycle ?", a: "Menstruelle, folliculaire, ovulatoire et lutéale. Chacune influence ton énergie, ton humeur, tes envies et tes entraînements, et Bloomzein t’accompagne dans les quatre." },
      ],
    },
    "meal-planner": {
      name: "Planificateur de repas",
      metaTitle: "Planificateur de repas selon le cycle — Bloomzein",
      metaDescription: "Une semaine de repas qui se planifie toute seule, avec des recettes adaptées à ta phase et une liste de courses automatique, selon ton cycle et ton objectif. Essaie Bloomzein gratuitement.",
      h1: "Planificateur de repas synchronisé avec ton cycle",
      intro: "Fini le « qu’est-ce qu’on mange ? ». Le planificateur de Bloomzein te prépare une semaine équilibrée et gourmande, avec des recettes adaptées à ta phase, tes objectifs de calories et de macros, et une liste de courses qui s’écrit toute seule.",
      sections: [
        { h: "Une semaine entière, planifiée pour toi", p: "Petits-déjeuners, déjeuners, dîners et collations adaptés à ton corps : nourrissants, beaux et sans effort." },
        { h: "Des recettes selon ta phase", p: "Mange ce dont ton corps a vraiment besoin : riche en fer pendant tes règles, plus de protéines quand ton énergie monte, léger et hydratant en phase lutéale." },
        { h: "La liste de courses en un geste", p: "Ton planning devient automatiquement une liste de courses claire : les courses prennent quelques minutes, pas des heures." },
      ],
      faqs: [
        { q: "Le planning de repas suit-il mon cycle ?", a: "Oui. Les recettes s’adaptent à ta phase et à ton objectif (perdre, maintenir ou prendre du poids)." },
        { q: "Puis-je voir les calories et les macros ?", a: "Oui. Bloomzein affiche des objectifs de calories et de macros ajustés à ton profil, ton cycle et ton activité, calculés par un seul moteur nutritionnel." },
        { q: "Est-ce gratuit ?", a: "Tu peux découvrir les repas gratuitement. La semaine planifiée automatiquement et la liste de courses font partie de Bloom+." },
      ],
    },
    "diet-nutrition": {
      name: "Nutrition",
      metaTitle: "Calories et macros pour les femmes — Bloomzein",
      metaDescription: "Des objectifs de calories et de macros qui suivent ton cycle, ton activité et ton objectif, avec ton bilan énergétique et une date réaliste pour l’atteindre. La nutrition simplifiée avec Bloomzein.",
      h1: "Suivi nutrition : calories et macros",
      intro: "Comprends enfin tes chiffres. L’outil nutrition de Bloomzein te donne des objectifs de calories et de macros qui s’adaptent à ton cycle, à ton entraînement et à ton objectif, avec un bilan énergétique clair et un calendrier réaliste.",
      sections: [
        { h: "Des objectifs faits pour ton corps", p: "Un seul moteur calcule tes calories et tes macros à partir de ton profil, de ta phase et de ton activité : pas de chiffres génériques." },
        { h: "Ton bilan énergétique, visible", p: "Vois chaque jour ce que tu manges et ce que tu dépenses, et comment cela te rapproche de ton objectif." },
        { h: "Un calendrier réaliste", p: "Sache quand tu atteindras ton objectif à un rythme sain et durable, et ajuste quand tu veux." },
      ],
      faqs: [
        { q: "Comment mes calories sont-elles calculées ?", a: "Bloomzein utilise un seul calcul du métabolisme de base à partir de ton âge, ton poids, ta taille, ton objectif et ton activité, puis l’adapte à ta phase et à tes entraînements." },
        { q: "Est-ce relié au planificateur de repas ?", a: "Oui. Tes objectifs nutritionnels et le planificateur de repas partagent les mêmes chiffres : tous les outils sont d’accord." },
      ],
    },
    "workout-programs": {
      name: "Programmes sportifs",
      metaTitle: "Entraînements selon le cycle pour les femmes — Bloomzein",
      metaDescription: "Renforcement, HIIT et mobilité qui s’intensifient ou ralentissent selon ton cycle. Des programmes à faire à la maison, adaptés à ton énergie. Essaie Bloomzein gratuitement.",
      h1: "Programmes d’entraînement selon ton cycle",
      intro: "Bouge avec ton énergie, pas contre elle. Les séances de Bloomzein (renforcement, HIIT, mobilité) montent en intensité quand tu es au top et ralentissent quand tu as besoin de repos, selon ta phase. Guidées, faciles à faire chez toi.",
      sections: [
        { h: "Entraîne-toi selon ta phase", p: "Donne tout pendant tes phases d’énergie, récupère pendant les autres. Respecter ton corps donne de meilleurs résultats, avec moins d’épuisement." },
        { h: "De 5 minutes à la séance complète", p: "Une remise en forme rapide ou un programme complet : choisis ce qui va avec ta journée, avec des mouvements guidés." },
        { h: "Alimentation et récupération intégrées", p: "Les jours d’entraînement ajustent ta nutrition pour bien récupérer, en lien avec ton planning de repas." },
      ],
      faqs: [
        { q: "Faut-il du matériel ou une salle ?", a: "Non. La plupart des séances se font à la maison, avec peu ou pas de matériel." },
        { q: "Comment les séances suivent-elles mon cycle ?", a: "Bloomzein lit ta phase actuelle et propose la bonne intensité : du renforcement quand ton énergie monte, des mouvements plus doux pendant tes règles." },
      ],
    },
    yoga: {
      name: "Yoga",
      metaTitle: "Yoga selon le cycle pour les femmes — Bloomzein",
      metaDescription: "Des séances de yoga adaptées à ton cycle, de 5 minutes à la séance complète, pour apaiser les douleurs de règles et retrouver ton éclat. Yoga doux et guidé avec Bloomzein.",
      h1: "Yoga adapté à ton cycle",
      intro: "Un yoga qui te rejoint là où tu es. Les séances de Bloomzein vont de 5 minutes à la séance complète : apaiser les crampes pendant tes règles, te dynamiser quand ton énergie monte, t’aider à te détendre en phase lutéale.",
      sections: [
        { h: "Une séance pour chaque phase et chaque humeur", p: "Douce, réparatrice ou tonique : la bonne séance selon ce que ressent ton corps aujourd’hui." },
        { h: "Apaiser crampes et tensions", p: "Des enchaînements adaptés à ta phase pour soulager les douleurs de règles, relâcher les tensions et mieux te reposer." },
        { h: "Séances courtes ou complètes", p: "Pas le temps ? 5 minutes, ça compte. Plus de temps ? Enchaîne une séance complète." },
      ],
      faqs: [
        { q: "Le yoga convient-il aux débutantes ?", a: "Oui. Les séances sont guidées et adaptables, de la grande débutante à la plus expérimentée." },
        { q: "Le yoga peut-il soulager les douleurs de règles ?", a: "Un yoga doux et adapté à ta phase peut aider beaucoup de femmes à soulager crampes et tensions. Bloomzein te propose la séance qui convient à ta phase." },
      ],
    },
    "meditation-breathwork": {
      name: "Méditation et respiration",
      metaTitle: "Méditation et exercices de respiration — Bloomzein",
      metaDescription: "Des exercices de respiration guidés (4-7-8, respiration carrée, calme ou énergie) pour apaiser le stress, l’anxiété et mieux dormir. Gratuit sur Bloomzein.",
      h1: "Méditation et respiration",
      intro: "Retrouve ton calme en quelques minutes. L’outil de respiration de Bloomzein te guide dans des exercices apaisants (4-7-8, respiration carrée, souffle calme ou énergisant) avec un lotus animé, un minuteur et des repères doux contre le stress, l’anxiété et les troubles du sommeil.",
      sections: [
        { h: "Des respirations guidées", p: "Suis le lotus : inspire, retiens, expire. Le 4-7-8 pour dormir, la respiration carrée pour te concentrer, un souffle apaisant contre l’anxiété." },
        { h: "Une pause douce chaque jour", p: "Une séance de 2, 5 ou 10 minutes pour ralentir, faire baisser le stress et revenir à l’instant présent, quand tu en as besoin." },
        { h: "Pensée pour ton cycle", p: "Un rituel apaisant pour les jours de fatigue, les crampes et les pensées qui tournent en boucle." },
      ],
      faqs: [
        { q: "Qu’est-ce que la respiration 4-7-8 ?", a: "Une technique apaisante : inspire 4 secondes, retiens 7 secondes, expire 8 secondes. Elle aide à ralentir le cœur et à se détendre avant de dormir. Bloomzein te guide pas à pas." },
        { q: "L’outil de respiration est-il gratuit ?", a: "Oui. La respiration guidée est gratuite dans Bloomzein. Bloom+ ajoute plus de séances et supprime la publicité." },
        { q: "La respiration aide-t-elle contre l’anxiété et pour le sommeil ?", a: "Une respiration lente et guidée peut calmer le système nerveux et aider beaucoup de personnes à se détendre et à s’endormir plus facilement." },
      ],
    },
    journal: {
      name: "Journal intime",
      metaTitle: "Journal d’humeur et de bien-être pour femmes — Bloomzein",
      metaDescription: "Un espace doux pour écrire tes humeurs et tes émotions, et voir apparaître des tendances au fil de ton cycle. Journal de bien-être gratuit sur Bloomzein.",
      h1: "Journal d’humeur et de bien-être",
      intro: "Un endroit doux pour chaque émotion. Le journal de Bloomzein te laisse écrire librement et suivre ton humeur, puis révèle des tendances au fil de ton cycle, pour mieux te comprendre chaque mois.",
      sections: [
        { h: "Écris à ta façon", p: "Beaucoup ou peu, comme tu veux. Pas de pression, pas de jugement : juste un espace calme et joli, rien qu’à toi." },
        { h: "Vois tes tendances d’humeur", p: "Note ce que tu ressens et vois apparaître des tendances selon tes phases : les jours difficiles surprennent moins." },
        { h: "Relié à ton cycle", p: "Ton humeur est mise en lien avec ta phase, pour mieux comprendre ce que tu ressens." },
      ],
      faqs: [
        { q: "Mon journal est-il privé ?", a: "Oui. Tes notes sont liées à ton compte. Tu peux supprimer une note ou tout ton compte quand tu veux." },
        { q: "Mon humeur est-elle suivie dans le temps ?", a: "Oui. Bloomzein affiche ton humeur au fil de ton cycle pour repérer tes tendances en douceur." },
      ],
    },
    "budget-planner": {
      name: "Budget",
      metaTitle: "Budget bien-être pour les femmes — Bloomzein",
      metaDescription: "Un planificateur de budget doux et mignon pour prendre soin de toi sans stress financier. Gratuit sur Bloomzein.",
      h1: "Planificateur de budget bien-être",
      intro: "Prends soin de toi sans stress d’argent. Le planificateur de budget de Bloomzein t’aide à prévoir tes dépenses calmement, pour que prendre soin de toi ne fasse jamais exploser ton budget.",
      sections: [
        { h: "Planifie tes dépenses plaisir", p: "Fixe des budgets simples pour ce qui compte (bien-être, beauté, alimentation) et vois où va ton argent." },
        { h: "Reste dans tes moyens", p: "Garde des soins abordables mois après mois, sans culpabilité ni surcharge." },
      ],
      faqs: [
        { q: "Le planificateur de budget est-il gratuit ?", a: "Oui. Tu peux planifier ton budget gratuitement dans Bloomzein. Bloom+ supprime la publicité et débloque les rapports." },
      ],
    },
  },
  ar: {
    "cycle-tracker": {
      name: "متابعة الدورة",
      metaTitle: "تطبيق متابعة الدورة الشهرية للنساء — Bloomzein",
      metaDescription: "تابعي دورتك الشهرية، واعرفي مرحلتك الحالية، واحصلي يوميًا على نصائح لطاقتك ومزاجك وأعراضك. مجانًا على Bloomzein.",
      h1: "متابعة الدورة الشهرية",
      intro: "مع Bloomzein تسجّلين دورتك في ثوانٍ وتفهمين شهرك كله، لا أيام الحيض فقط. تعرفين مرحلتك الحالية (الحيض، الجريبية، الإباضة، الأصفرية) وما ينتظركِ، مع نصائح لطيفة يومية لطاقتك ورغباتك ومزاجك.",
      sections: [
        { h: "اعرفي مرحلتك كل يوم", p: "اعرفي بدقة أين أنتِ من دورتك وماذا يعني ذلك لجسمك، فتصبح طاقتك وتمارينك ووجباتك مفهومة بدل أن تبدو عشوائية." },
        { h: "سجّلي الدورة والأعراض بلمسة", p: "سجّلي دورتك وكمية النزيف والأعراض والمزاج بلمسة واحدة. يتعلّم Bloomzein إيقاعك ويتوقّع موعد دورتك القادمة وفترة الخصوبة." },
        { h: "كل الأدوات تتبع دورتك", p: "دورتك هي محور التطبيق: الوجبات والتمارين واليوغا والعناية الذاتية تتكيّف تلقائيًا مع مرحلتك." },
      ],
      faqs: [
        { q: "هل متابعة الدورة مجانية؟", a: "نعم. يمكنكِ متابعة دورتك وأعراضك مجانًا في Bloomzein. اشتراك Bloom+ يضيف البرامج الكاملة والتقارير وتجربة بلا إعلانات." },
        { q: "هل يتوقّع التطبيق موعد دورتي القادمة؟", a: "نعم. يتعلّم Bloomzein طول دورتك ويتوقّع موعد الدورة القادمة وفترة الخصوبة، ويتحدّث مع كل تسجيل جديد." },
        { q: "ما هي مراحل الدورة الأربع؟", a: "مرحلة الحيض، والمرحلة الجريبية، ومرحلة الإباضة، والمرحلة الأصفرية. كل مرحلة تؤثّر في طاقتك ومزاجك ورغباتك وتمارينك، وBloomzein يرافقكِ فيها كلها." },
      ],
    },
    "meal-planner": {
      name: "مخطّط الوجبات",
      metaTitle: "مخطّط وجبات حسب الدورة الشهرية — Bloomzein",
      metaDescription: "أسبوع كامل من الوجبات يُخطَّط تلقائيًا، بوصفات تناسب مرحلتك وقائمة تسوّق جاهزة، حسب دورتك وهدفك. جرّبي Bloomzein مجانًا.",
      h1: "مخطّط وجبات يتناغم مع دورتك",
      intro: "لا مزيد من سؤال «ماذا نأكل اليوم؟». يعدّ لكِ مخطّط Bloomzein أسبوعًا متوازنًا ولذيذًا، بوصفات تناسب مرحلتك، وأهداف للسعرات والعناصر الغذائية، وقائمة تسوّق تُكتب وحدها.",
      sections: [
        { h: "أسبوع كامل مخطّط لكِ", p: "فطور وغداء وعشاء ووجبات خفيفة تناسب جسمك: مغذّية وشهية وبلا عناء." },
        { h: "وصفات حسب مرحلتك", p: "كُلي ما يحتاجه جسمك فعلًا: أطعمة غنية بالحديد أثناء الحيض، وبروتين أكثر عند ارتفاع الطاقة، وأطعمة خفيفة ومرطّبة في المرحلة الأصفرية." },
        { h: "قائمة التسوّق بلمسة واحدة", p: "يتحوّل برنامجك تلقائيًا إلى قائمة تسوّق مرتّبة، فيستغرق التسوّق دقائق لا ساعات." },
      ],
      faqs: [
        { q: "هل يتبع برنامج الوجبات دورتي؟", a: "نعم. تتكيّف الوصفات مع مرحلتك ومع هدفك (إنقاص الوزن أو المحافظة عليه أو زيادته)." },
        { q: "هل يمكنني رؤية السعرات والعناصر الغذائية؟", a: "نعم. يعرض Bloomzein أهداف السعرات والبروتين والكربوهيدرات والدهون حسب ملفك ودورتك ونشاطك، بمحرّك تغذية واحد." },
        { q: "هل هو مجاني؟", a: "يمكنكِ اكتشاف الوجبات مجانًا. أما الأسبوع المخطّط تلقائيًا وقائمة التسوّق فهما ضمن اشتراك Bloom+." },
      ],
    },
    "diet-nutrition": {
      name: "التغذية",
      metaTitle: "حساب السعرات والعناصر الغذائية للنساء — Bloomzein",
      metaDescription: "أهداف سعرات وعناصر غذائية تتكيّف مع دورتك ونشاطك وهدفك، مع توازن الطاقة وموعد واقعي لبلوغ هدفك. التغذية ببساطة مع Bloomzein.",
      h1: "متابعة التغذية: السعرات والعناصر الغذائية",
      intro: "افهمي أرقامك أخيرًا. تمنحكِ أداة التغذية في Bloomzein أهدافًا للسعرات والعناصر الغذائية تتكيّف مع دورتك وتمارينك وهدفك، مع توازن طاقة واضح وجدول زمني واقعي.",
      sections: [
        { h: "أهداف تناسب جسمك", p: "محرّك واحد يحسب سعراتك وعناصرك الغذائية من ملفك ومرحلتك ونشاطك، بلا أرقام عامة." },
        { h: "توازن الطاقة أمام عينيكِ", p: "شاهدي يوميًا ما تأكلينه مقابل ما تحرقينه، وكيف يقرّبكِ ذلك من هدفك." },
        { h: "جدول زمني واقعي", p: "اعرفي متى تبلغين هدفك بوتيرة صحية ومستدامة، وعدّلي متى شئتِ." },
      ],
      faqs: [
        { q: "كيف تُحسب سعراتي؟", a: "يعتمد Bloomzein حسابًا واحدًا لمعدل الأيض الأساسي انطلاقًا من عمرك ووزنك وطولك وهدفك ونشاطك، ثم يكيّفه مع مرحلتك وتمارينك." },
        { q: "هل ترتبط بمخطّط الوجبات؟", a: "نعم. أهدافك الغذائية ومخطّط الوجبات يستعملان الأرقام نفسها، فتتّفق كل الأدوات." },
      ],
    },
    "workout-programs": {
      name: "برامج التمارين",
      metaTitle: "تمارين رياضية حسب الدورة للنساء — Bloomzein",
      metaDescription: "تمارين القوة والتمارين المتقطعة عالية الشدة والمرونة، تشتدّ وتهدأ حسب دورتك. برامج منزلية تناسب طاقتك. جرّبي Bloomzein مجانًا.",
      h1: "برامج تمارين تتناغم مع دورتك",
      intro: "تحرّكي مع طاقتك لا ضدّها. تمارين Bloomzein (القوة، التمارين المتقطعة عالية الشدة، المرونة) تشتدّ حين تكونين في أوج قوتك وتهدأ حين تحتاجين إلى الراحة، حسب مرحلتك. موجّهة وسهلة في البيت.",
      sections: [
        { h: "تمرّني حسب مرحلتك", p: "اجتهدي في مراحل الطاقة المرتفعة واستعيدي قوتك في المراحل الأخرى. احترام جسمك يعطي نتائج أفضل وإرهاقًا أقل." },
        { h: "من 5 دقائق إلى حصة كاملة", p: "تمرين سريع أو برنامج كامل: اختاري ما يناسب يومك، بحركات موجّهة وواضحة." },
        { h: "التغذية والتعافي مدمجان", p: "أيام التمرين تعدّل تغذيتك لتتعافي جيدًا، بالتنسيق مع برنامج وجباتك." },
      ],
      faqs: [
        { q: "هل أحتاج إلى معدات أو قاعة رياضة؟", a: "لا. معظم التمارين منزلية وتحتاج إلى معدات قليلة أو لا شيء." },
        { q: "كيف تتناسب التمارين مع دورتي؟", a: "يقرأ Bloomzein مرحلتك الحالية ويقترح الشدة المناسبة: تمارين قوة عند ارتفاع الطاقة، وحركات ألطف أثناء الحيض." },
      ],
    },
    yoga: {
      name: "اليوغا",
      metaTitle: "يوغا حسب الدورة الشهرية للنساء — Bloomzein",
      metaDescription: "حصص يوغا تناسب دورتك، من 5 دقائق إلى حصة كاملة، لتخفيف آلام الدورة واستعادة إشراقتك. يوغا لطيفة وموجّهة مع Bloomzein.",
      h1: "يوغا تتناغم مع دورتك",
      intro: "يوغا تلاقيكِ حيث أنتِ. حصص Bloomzein تمتد من 5 دقائق إلى حصة كاملة: تهدّئ التقلّصات أثناء الحيض، وتنشّطكِ عند ارتفاع الطاقة، وتساعدكِ على الاسترخاء في المرحلة الأصفرية.",
      sections: [
        { h: "حصة لكل مرحلة ولكل مزاج", p: "لطيفة أو مريحة أو منشّطة: الحصة المناسبة لما يشعر به جسمك اليوم." },
        { h: "تخفيف التقلّصات والتوتر", p: "تسلسلات تناسب مرحلتك لتخفيف آلام الدورة وإرخاء التوتر والراحة بشكل أفضل." },
        { h: "حصص قصيرة أو كاملة", p: "لا وقت لديكِ؟ خمس دقائق تكفي. لديكِ وقت أكثر؟ تابعي حصة كاملة." },
      ],
      faqs: [
        { q: "هل اليوغا مناسبة للمبتدئات؟", a: "نعم. الحصص موجّهة وقابلة للتكييف، من المبتدئة تمامًا إلى صاحبة الخبرة." },
        { q: "هل تساعد اليوغا على تخفيف آلام الدورة؟", a: "قد تساعد اليوغا اللطيفة المناسبة للمرحلة كثيرًا من النساء على تخفيف التقلّصات والتوتر. يقترح Bloomzein الحصة المناسبة لمرحلتك." },
      ],
    },
    "meditation-breathwork": {
      name: "التأمل والتنفّس",
      metaTitle: "التأمل وتمارين التنفّس — Bloomzein",
      metaDescription: "تمارين تنفّس موجّهة (4-7-8، التنفّس المربّع، تنفّس مهدّئ أو منشّط) لتخفيف التوتر والقلق ونوم أفضل. مجانًا على Bloomzein.",
      h1: "التأمل والتنفّس",
      intro: "استعيدي هدوءكِ في دقائق. ترشدكِ أداة التنفّس في Bloomzein إلى تمارين مهدّئة (4-7-8، التنفّس المربّع، تنفّس هادئ أو منشّط) مع زهرة لوتس متحرّكة ومؤقّت وإشارات لطيفة للتوتر والقلق والنوم.",
      sections: [
        { h: "تنفّس موجّه", p: "اتبعي اللوتس: شهيق، ثم حبس النفس، ثم زفير. تنفّس 4-7-8 للنوم، والتنفّس المربّع للتركيز، وتنفّس مهدّئ للقلق." },
        { h: "استراحة لطيفة كل يوم", p: "حصة من دقيقتين أو 5 أو 10 دقائق لتبطئي وتخفّفي التوتر وتعودي إلى اللحظة الحاضرة متى احتجتِ." },
        { h: "مصمّمة لدورتك", p: "طقس مهدّئ لأيام التعب والتقلّصات والأفكار المزدحمة." },
      ],
      faqs: [
        { q: "ما هو تنفّس 4-7-8؟", a: "تقنية مهدّئة: شهيق لمدة 4 ثوانٍ، ثم حبس النفس 7 ثوانٍ، ثم زفير لمدة 8 ثوانٍ. تساعد على إبطاء نبض القلب والاسترخاء قبل النوم، وBloomzein يرشدكِ خطوة بخطوة." },
        { q: "هل أداة التنفّس مجانية؟", a: "نعم. التنفّس الموجّه مجاني في Bloomzein. اشتراك Bloom+ يضيف حصصًا أكثر ويزيل الإعلانات." },
        { q: "هل تساعد تمارين التنفّس على تخفيف القلق وتحسين النوم؟", a: "التنفّس البطيء الموجّه قد يهدّئ الجهاز العصبي ويساعد كثيرًا من الناس على الاسترخاء والنوم بسهولة أكبر." },
      ],
    },
    journal: {
      name: "المذكّرات",
      metaTitle: "مذكّرات المزاج والعافية للنساء — Bloomzein",
      metaDescription: "مساحة لطيفة لتدوين مزاجك ومشاعرك، ومتابعة أنماطها عبر دورتك. مذكّرات عافية مجانية على Bloomzein.",
      h1: "مذكّرات المزاج والعافية",
      intro: "مكان لطيف لكل شعور. تتيح لكِ مذكّرات Bloomzein الكتابة بحرية ومتابعة مزاجك، ثم تكشف لكِ أنماطه عبر دورتك، لتفهمي نفسك أكثر كل شهر.",
      sections: [
        { h: "اكتبي على طريقتك", p: "اكتبي كثيرًا أو قليلًا كما تشائين. بلا ضغط ولا أحكام: مساحة هادئة وجميلة لكِ وحدك." },
        { h: "تابعي أنماط مزاجك", p: "سجّلي ما تشعرين به وشاهدي الأنماط تظهر حسب مراحلك، فلا تفاجئكِ الأيام الصعبة." },
        { h: "مرتبطة بدورتك", p: "يُربط مزاجك بمرحلتك، لتفهمي مشاعرك بلطف." },
      ],
      faqs: [
        { q: "هل مذكّراتي خاصة؟", a: "نعم. ملاحظاتك مرتبطة بحسابك، ويمكنكِ حذف أي ملاحظة أو حذف حسابك بالكامل متى شئتِ." },
        { q: "هل يُتابَع مزاجي مع الوقت؟", a: "نعم. يعرض Bloomzein مزاجك عبر دورتك لتكتشفي أنماطك بهدوء." },
      ],
    },
    "budget-planner": {
      name: "الميزانية",
      metaTitle: "مخطّط ميزانية العناية الذاتية للنساء — Bloomzein",
      metaDescription: "مخطّط ميزانية هادئ وأنيق يجعل عنايتك بنفسك مستدامة، بلا ضغط مالي. مجانًا على Bloomzein.",
      h1: "مخطّط ميزانية العناية الذاتية",
      intro: "اعتني بنفسك بلا قلق مالي. يساعدكِ مخطّط الميزانية في Bloomzein على تنظيم مصاريفك بهدوء، حتى لا تُرهق العناية بنفسك ميزانيتك أبدًا.",
      sections: [
        { h: "خطّطي لمصاريفك", p: "حدّدي ميزانيات بسيطة لما يهمّك (العافية، الجمال، الطعام) واعرفي أين يذهب مالك." },
        { h: "ابقي في حدود إمكانياتك", p: "حافظي على عناية ميسورة شهرًا بعد شهر، بلا شعور بالذنب أو إرهاق." },
      ],
      faqs: [
        { q: "هل مخطّط الميزانية مجاني؟", a: "نعم. يمكنكِ تخطيط ميزانيتك مجانًا في Bloomzein. اشتراك Bloom+ يزيل الإعلانات ويفتح التقارير." },
      ],
    },
  },
};
