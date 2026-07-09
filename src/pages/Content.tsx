import { useEffect, useState } from "react";
import { ArrowLeft, ChevronRight, BookOpen, HelpCircle, LifeBuoy, Send, Heart } from "lucide-react";
import { AppIcon } from "@/components/bloom/AppIcon";
import { supabase } from "@/lib/supabase";

/* ------------------------------------------------------------------ *
 * Public, indexable content pages — Help Center, Guides, FAQ.
 * These exist to (a) genuinely help users and (b) rank on Google for
 * women's-wellness / cycle-tracking searches. Each sets its own <title>
 * + meta description; the FAQ also emits FAQPage structured data.
 * ------------------------------------------------------------------ */

const SITE = "https://www.bloomzein.com";

/* ---------- SEO helpers ---------- */

function setMeta(key: string, value: string, property = false) {
  const attr = property ? "property" : "name";
  let el = document.head.querySelector(`meta[${attr}="${key}"]`) as HTMLMetaElement | null;
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute("content", value);
}

function useSeo(title: string, description: string, path: string) {
  useEffect(() => {
    const prevTitle = document.title;
    document.title = title;
    setMeta("description", description);
    setMeta("og:title", title, true);
    setMeta("og:description", description, true);
    setMeta("og:url", SITE + path, true);
    let canonical = document.head.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    const prevCanonical = canonical?.getAttribute("href") ?? null;
    if (!canonical) {
      canonical = document.createElement("link");
      canonical.setAttribute("rel", "canonical");
      document.head.appendChild(canonical);
    }
    canonical.setAttribute("href", SITE + path);
    return () => {
      document.title = prevTitle;
      if (prevCanonical) canonical?.setAttribute("href", prevCanonical);
    };
  }, [title, description, path]);
}

/** Injects a JSON-LD structured-data block (removed on unmount). */
function JsonLd({ data }: { data: object }) {
  useEffect(() => {
    const s = document.createElement("script");
    s.type = "application/ld+json";
    s.text = JSON.stringify(data);
    document.head.appendChild(s);
    return () => { document.head.removeChild(s); };
  }, [data]);
  return null;
}

/* ---------- shared shell ---------- */

function ContentShell({ eyebrow, title, subtitle, children }: {
  eyebrow: string; title: string; subtitle: string; children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#FFF5F9] text-[#4a2338]">
      <div className="mx-auto max-w-3xl px-5 py-10 sm:py-14">
        <a
          href="/"
          onClick={(e) => { if (typeof window !== "undefined" && window.history.length > 1) { e.preventDefault(); window.history.back(); } }}
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#9D5C7E] hover:text-[#EC4899] transition"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Bloomzein
        </a>
        <header className="mt-6 flex items-center gap-3">
          <AppIcon size={44} />
          <div>
            <p className="text-[11px] font-bold uppercase tracking-widest text-[#EC4899]">{eyebrow}</p>
            <h1 className="font-script text-3xl sm:text-4xl text-[#831843] leading-none">{title}</h1>
          </div>
        </header>
        <p className="mt-3 text-[15px] text-[#8a5c74] max-w-2xl">{subtitle}</p>
        <div className="mt-8 space-y-8 text-[14.5px] leading-relaxed text-[#5b3247]">{children}</div>
        <CTA />
        <ContentFooter />
      </div>
    </div>
  );
}

function CTA() {
  return (
    <div className="mt-12 rounded-3xl border border-[#F4C6DD] bg-gradient-to-br from-[#ffeaf5] to-[#ffd3ec] p-6 text-center">
      <h2 className="font-script text-2xl text-[#831843]">Start living in sync ✿</h2>
      <p className="mt-1 text-sm text-[#8a5c74] max-w-md mx-auto">Track your cycle, sync your meals and movement, and bloom all month — free to start.</p>
      <a href="/app/today" className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-[#EC4899] px-6 py-2.5 text-sm font-bold text-white shadow-md shadow-[#EC4899]/30 hover:bg-[#DB2777] transition">
        Start Blooming <ChevronRight className="h-4 w-4" />
      </a>
    </div>
  );
}

function ContentFooter() {
  return (
    <footer className="mt-10 border-t border-[#F4C6DD] pt-6 text-xs text-[#9D5C7E]">
      <div className="flex flex-wrap gap-x-4 gap-y-1">
        <a href="/help" className="font-semibold hover:text-[#EC4899]">Help Center</a>
        <a href="/guides" className="font-semibold hover:text-[#EC4899]">Guides</a>
        <a href="/faq" className="font-semibold hover:text-[#EC4899]">FAQ</a>
        <a href="/privacy" className="hover:text-[#EC4899]">Privacy</a>
        <a href="/terms" className="hover:text-[#EC4899]">Terms</a>
      </div>
      <p className="mt-3">© {new Date().getFullYear()} Bloomzein ✿</p>
    </footer>
  );
}

function H2({ children }: { children: React.ReactNode }) {
  return <h2 className="font-script text-2xl text-[#EC4899] leading-tight">{children}</h2>;
}
function H3({ children }: { children: React.ReactNode }) {
  return <h3 className="mt-4 text-[15px] font-bold text-[#831843]">{children}</h3>;
}
function P({ children }: { children: React.ReactNode }) {
  return <p className="mt-2">{children}</p>;
}
function A({ href, children }: { href: string; children: React.ReactNode }) {
  return <a href={href} className="font-semibold text-[#EC4899] hover:text-[#DB2777] underline">{children}</a>;
}

/* ---------- Contact form — keeps your email private ---------- */

/**
 * Paste your free Web3Forms access key here to have messages emailed
 * straight to your inbox (get one in ~1 min at https://web3forms.com —
 * enter bloomzeinapp@gmail.com, copy the access key). Your email address
 * is NEVER shown on the page; only this key is, which is safe to expose.
 * Until a key is set, every message is still saved privately to the
 * `contact_messages` table in your own Supabase project.
 */
const WEB3FORMS_KEY = "YOUR_WEB3FORMS_ACCESS_KEY";

function ContactForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;
    setStatus("sending");
    let ok = false;

    // 1) Email it to the owner via Web3Forms (once a key is configured).
    if (WEB3FORMS_KEY && !WEB3FORMS_KEY.startsWith("YOUR_")) {
      try {
        const r = await fetch("https://api.web3forms.com/submit", {
          method: "POST",
          headers: { "Content-Type": "application/json", Accept: "application/json" },
          body: JSON.stringify({
            access_key: WEB3FORMS_KEY,
            subject: "New Bloomzein message ✿",
            from_name: name || "Bloomzein visitor",
            name, email, message,
          }),
        });
        ok = r.ok;
      } catch { /* fall through to Supabase */ }
    }

    // 2) Always keep a private copy in your own database (nothing lost).
    try {
      const { error } = await supabase.from("contact_messages").insert({
        name: name.trim() || null,
        email: email.trim() || null,
        message: message.trim().slice(0, 4000),
      });
      if (!error) ok = true;
    } catch { /* ignore */ }

    setStatus(ok ? "sent" : "error");
  };

  if (status === "sent") {
    return (
      <div className="rounded-3xl border border-[#F4C6DD] bg-white p-6 text-center">
        <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-[#FCE7F3] text-[#EC4899]"><Heart className="h-6 w-6" /></div>
        <p className="mt-3 font-script text-2xl text-[#831843]">Message received ✿</p>
        <p className="mt-1 text-sm text-[#8a5c74]">Thank you for reaching out — we read every note and will get back to you{email ? ` at ${email}` : ""} soon. 🌸</p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="rounded-3xl border border-[#F4C6DD] bg-white p-5 sm:p-6">
      <p className="font-script text-2xl text-[#831843]">Say hi ✿</p>
      <p className="mt-0.5 mb-4 text-[13px] text-[#8a5c74]">Questions, feedback or a data request? Drop us a line — we'd love to hear from you.</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name (optional)"
          className="rounded-2xl border border-[#F4C6DD] bg-[#FFF5F9] px-4 py-2.5 text-sm text-[#5b3247] placeholder:text-[#c79bb2] outline-none focus:border-[#EC4899] transition" />
        <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder="Your email (so we can reply)"
          className="rounded-2xl border border-[#F4C6DD] bg-[#FFF5F9] px-4 py-2.5 text-sm text-[#5b3247] placeholder:text-[#c79bb2] outline-none focus:border-[#EC4899] transition" />
      </div>
      <textarea value={message} onChange={(e) => setMessage(e.target.value)} required rows={4} placeholder="How can we help? ✿"
        className="mt-3 w-full resize-none rounded-2xl border border-[#F4C6DD] bg-[#FFF5F9] px-4 py-2.5 text-sm text-[#5b3247] placeholder:text-[#c79bb2] outline-none focus:border-[#EC4899] transition" />
      {status === "error" && <p className="mt-2 text-xs font-semibold text-[#DB2777]">Something went wrong — please try again in a moment.</p>}
      <button type="submit" disabled={status === "sending"}
        className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-[#EC4899] px-5 py-2.5 text-sm font-bold text-white shadow-md shadow-[#EC4899]/30 hover:bg-[#DB2777] transition disabled:opacity-60">
        {status === "sending" ? "Sending…" : <>Send with love <Send className="h-4 w-4" /></>}
      </button>
    </form>
  );
}

/* ================================================================= *
 * HELP CENTER
 * ================================================================= */

export function HelpPage() {
  useSeo(
    "Help Center — Bloomzein cycle & wellness app",
    "Get help with Bloomzein: setting up cycle tracking, syncing meals and workouts to your phase, managing reminders, privacy, and your account.",
    "/help",
  );
  const topics = [
    { icon: BookOpen, title: "Getting started", body: "Create your free account, set your last period date and cycle length in the Cycle Tracker, and the whole app tunes itself to your phase — meals, workouts and insights included." },
    { icon: HelpCircle, title: "Cycle tracking", body: "Log your period, symptoms and mood. Bloomzein predicts your phases (menstrual, follicular, ovulatory, luteal) and shows what your body needs each day. It's an estimate — not for contraception." },
    { icon: LifeBuoy, title: "Meals, diet & workouts", body: "Pick a diet style and a weekly vibe; the Meal Planner builds a week that matches your diet and your cycle phase. Workouts and yoga adapt to your energy across the month." },
  ];
  return (
    <ContentShell eyebrow="Help Center" title="How can we help?" subtitle="Everything you need to get the most from Bloomzein — your all-in-one cycle tracking, nutrition and self-care app.">
      <div className="grid gap-3 sm:grid-cols-3">
        {topics.map((t) => (
          <div key={t.title} className="rounded-2xl border border-[#F4C6DD] bg-white p-4">
            <span className="grid h-10 w-10 place-items-center rounded-full bg-[#FCE7F3] text-[#EC4899]"><t.icon className="h-5 w-5" /></span>
            <h3 className="mt-2 font-bold text-[#831843]">{t.title}</h3>
            <p className="mt-1 text-[13px] text-[#8a5c74]">{t.body}</p>
          </div>
        ))}
      </div>

      <section>
        <H2>Setting up your account</H2>
        <P>Tap <A href="/app/today">Start Blooming</A> and create a free account with email or Google. Your cycle data, meal plans and logs sync securely across your devices when you're signed in, and are protected so only you can see them.</P>
      </section>

      <section>
        <H2>Using each tool</H2>
        <H3>Cycle Tracker</H3>
        <P>Set your last period start date and average cycle length. Bloomzein maps your four phases and updates every other tool to match. Update it any time your cycle shifts.</P>
        <H3>Meal Planner &amp; Diet</H3>
        <P>Choose your diet (Balanced, Mediterranean, High-Protein, Vegan and more) and a weekly vibe. Your plan is filtered to your diet <em>and</em> nudged toward your current phase, so you eat what supports you right now. See the <A href="/guides/eating-for-your-cycle">eating-for-your-cycle guide</A>.</P>
        <H3>Workout &amp; Yoga</H3>
        <P>Get movement matched to your energy — strength when you're rising, gentle flows when you need rest. See <A href="/guides/cycle-synced-workouts">cycle-synced workouts</A>.</P>
        <H3>Calendar</H3>
        <P>Your whole month in one soft view — see your cycle phases, planned meals, workouts and reminders side by side. Tap any day to see what's happening and plan ahead with your cycle in mind.</P>
        <H3>Budget, Diary &amp; Notes</H3>
        <P>Plan your spending, journal your mood, and set gentle reminders — all in the same soft, private space.</P>
      </section>

      <section>
        <H2>Notifications &amp; reminders</H2>
        <P>Enable reminders for hydration, medication and self-care in Notes &amp; Reminders. You're always in control — turn any of them off at any time.</P>
      </section>

      <section>
        <H2>Privacy &amp; your data</H2>
        <P>Your health data is yours. We never sell it and don't run advertising trackers. Read our <A href="/privacy">Privacy Policy</A>, or use the form below to access, export or delete your data.</P>
      </section>

      <section>
        <H2>Still need help?</H2>
        <P>We're a small team and we read every message. Send us a note and we'll get back to you.</P>
        <div className="mt-3"><ContactForm /></div>
      </section>
    </ContentShell>
  );
}

/* ================================================================= *
 * FAQ (with FAQPage structured data for Google rich results)
 * ================================================================= */

const FAQS: { q: string; a: string }[] = [
  { q: "Is Bloomzein free?", a: "Yes — you can create an account and use cycle tracking, meal planning, workouts, yoga, budgeting and journaling for free." },
  { q: "Is my health data private?", a: "Yes. Your cycle, weight, mood and other data are stored securely, protected so only your account can access them, and never sold. We don't run third-party advertising or analytics trackers." },
  { q: "Can I use Bloomzein for birth control?", a: "No. Cycle predictions are estimates to help you understand your body and are not a contraceptive method. Do not rely on the app to prevent or plan pregnancy — talk to a healthcare professional." },
  { q: "How does cycle syncing work?", a: "You enter your last period date and cycle length. Bloomzein estimates your four phases — menstrual, follicular, ovulatory and luteal — and tunes your meals, workouts and daily insights to what your body tends to need in each phase." },
  { q: "Does the meal planner really match my diet and my cycle?", a: "Yes. Your chosen diet (Balanced, Mediterranean, High-Protein, Vegan and more) filters which recipes can appear, and your selected cycle phase nudges the plan toward phase-supportive meals on top of that." },
  { q: "Does Bloomzein work offline?", a: "Yes. It's a Progressive Web App, so your data is cached on your device and the core experience works offline. Changes sync to the cloud the next time you're online and signed in." },
  { q: "Can I install it like an app?", a: "Yes. On your phone, open the site and choose “Add to Home Screen” (iPhone: the Share button; Android: the install prompt). It then opens full-screen like a native app." },
  { q: "Which devices are supported?", a: "Any modern browser on iOS, Android, or desktop. Sign in and your data follows you across all your devices." },
  { q: "How do I delete my account or data?", a: "Email us and we'll remove your data from our systems. You can also clear your logs from within the app." },
  { q: "Is Bloomzein medical advice?", a: "No. It's a wellness and self-tracking tool for general information. Always consult a qualified healthcare professional for medical decisions." },
];

export function FaqPage() {
  useSeo(
    "FAQ — Bloomzein cycle tracking & wellness app",
    "Answers to common questions about Bloomzein: is it free, is my health data private, how cycle syncing works, offline use, installing the app, and more.",
    "/faq",
  );
  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQS.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };
  return (
    <ContentShell eyebrow="FAQ" title="Frequently asked questions" subtitle="Quick answers about cycle tracking, your privacy, meal planning, offline use and getting started with Bloomzein.">
      <JsonLd data={faqSchema} />
      <div className="space-y-3">
        {FAQS.map((f) => (
          <details key={f.q} className="group rounded-2xl border border-[#F4C6DD] bg-white p-4 open:shadow-sm">
            <summary className="cursor-pointer list-none font-bold text-[#831843] flex items-center justify-between gap-3">
              {f.q}
              <ChevronRight className="h-4 w-4 shrink-0 text-[#EC4899] transition group-open:rotate-90" />
            </summary>
            <p className="mt-2 text-[14px] text-[#5b3247]">{f.a}</p>
          </details>
        ))}
      </div>
    </ContentShell>
  );
}

/* ================================================================= *
 * GUIDES — an index + individual SEO articles
 * ================================================================= */

type Guide = { slug: string; title: string; metaTitle: string; description: string; readMins: number; intro: string; sections: { h: string; p: string[] }[] };

export const GUIDES: Guide[] = [
  {
    slug: "cycle-syncing",
    title: "Cycle Syncing 101: living in sync with your menstrual cycle",
    metaTitle: "Cycle Syncing 101: How to Live in Sync With Your Cycle | Bloomzein",
    description: "A beginner's guide to cycle syncing — what the four menstrual phases mean and how to align your food, movement and energy with each one.",
    readMins: 6,
    intro: "Cycle syncing means adapting your food, movement, work and rest to the natural hormonal shifts of your menstrual cycle. Instead of expecting the same energy every day, you work with your body across four phases — and often feel steadier, stronger and less at war with yourself.",
    sections: [
      { h: "The four phases at a glance", p: [
        "Your cycle has four phases: menstrual, follicular, ovulatory and luteal. Each has a different hormonal profile, which affects your energy, mood, appetite and strength.",
        "Knowing roughly where you are lets you plan kindly — pushing when you're capable, resting when you need it, and eating for what your body is doing.",
      ] },
      { h: "Menstrual phase — rest & replenish", p: [
        "As your period begins, hormones are low and energy often dips. This is a time to slow down, keep warm, and replenish iron and magnesium with foods like leafy greens, lentils and dark chocolate.",
        "Gentle movement — walking, restorative yoga, mobility — usually feels better than intense training.",
      ] },
      { h: "Follicular phase — rise & build", p: [
        "After your period, estrogen climbs and so does your energy and motivation. It's a great window to start new things, train harder, and eat fresh, protein-rich, vibrant foods.",
      ] },
      { h: "Ovulatory phase — peak & connect", p: [
        "Around ovulation you're often at your most energetic and social. Channel it into your strongest workouts and lighter, fibre-rich meals with plenty of vegetables.",
      ] },
      { h: "Luteal phase — soften & steady", p: [
        "In the second half, progesterone rises and cravings are real. Complex carbs, magnesium and steady, comforting meals help smooth mood dips. Ease off high-intensity training toward the end and prioritise sleep.",
      ] },
      { h: "How Bloomzein does this for you", p: [
        "Set your cycle once and Bloomzein estimates your phase every day, then tunes your meal plan, workouts and daily insight to match — so you don't have to track it all in your head.",
      ] },
    ],
  },
  {
    slug: "eating-for-your-cycle",
    title: "Eating for your cycle: a phase-by-phase nutrition guide",
    metaTitle: "Eating for Your Cycle: Phase-by-Phase Nutrition Guide | Bloomzein",
    description: "What to eat in each phase of your menstrual cycle — iron for your period, protein as you rise, fibre at ovulation and complex carbs in your luteal phase.",
    readMins: 7,
    intro: "Your nutritional needs shift across your cycle. Eating with those shifts — rather than against them — can support your energy, mood and cravings. Here's a simple phase-by-phase approach.",
    sections: [
      { h: "Menstrual: iron, magnesium & warmth", p: [
        "You lose iron during your period, so lean into iron-rich foods (spinach, lentils, red meat if you eat it) with vitamin C to help absorption. Magnesium — from dark chocolate, nuts and seeds — can ease cramps and mood.",
        "Warm, cooked meals tend to feel more comforting than cold, raw ones.",
      ] },
      { h: "Follicular: fresh & protein-forward", p: [
        "Rising estrogen loves light, fresh foods and quality protein. Think eggs, fish, fermented foods, sprouts and colourful vegetables to fuel your climbing energy.",
      ] },
      { h: "Ovulatory: fibre & antioxidants", p: [
        "Support this peak with fibre-rich vegetables, whole grains and antioxidant-packed fruits. Lighter meals suit your higher energy.",
      ] },
      { h: "Luteal: complex carbs & steady blood sugar", p: [
        "Cravings peak here. Instead of fighting them, choose complex carbs (sweet potato, oats, quinoa), magnesium and healthy fats to keep blood sugar steady and mood even.",
      ] },
      { h: "Let the app plan it", p: [
        "In the Meal Planner, pick your diet and phase and Bloomzein builds a week of recipes that fit both — no spreadsheets required.",
      ] },
    ],
  },
  {
    slug: "cycle-synced-workouts",
    title: "Cycle-synced workouts: training with your hormones",
    metaTitle: "Cycle-Synced Workouts: Train With Your Hormones | Bloomzein",
    description: "How to match your workouts to your menstrual cycle — gentle movement on your period, strength as you rise, peak effort at ovulation, and easing off in your luteal phase.",
    readMins: 6,
    intro: "Training the same way all month ignores the fact that your strength, recovery and energy genuinely change across your cycle. Syncing your workouts can mean better results and fewer burnout weeks.",
    sections: [
      { h: "Menstrual: move gently", p: [
        "Low hormones mean lower energy for many. Walking, stretching, mobility and restorative yoga keep you moving without draining you.",
      ] },
      { h: "Follicular: build strength", p: [
        "Rising estrogen supports strength and stamina. This is a great time to progress your lifts, try new classes and push a little harder.",
      ] },
      { h: "Ovulatory: peak performance", p: [
        "You're often strongest and most powerful here — a window for your hardest sessions, HIIT or personal bests. Warm up well, as this is also when some are more injury-prone.",
      ] },
      { h: "Luteal: ease off & recover", p: [
        "As progesterone rises, prioritise steady-state cardio, lighter toning and recovery. Honour the fatigue toward the end and protect your sleep.",
      ] },
      { h: "Your plan, auto-adjusted", p: [
        "Bloomzein's Workout and Yoga tools suggest movement that fits your phase and energy, so you always know a sensible next session.",
      ] },
    ],
  },
];

export function GuidesIndexPage() {
  useSeo(
    "Guides — cycle syncing, nutrition & wellness | Bloomzein",
    "In-depth guides on cycle syncing, eating for your menstrual cycle, and cycle-synced workouts — practical, phase-by-phase advice for women's wellness.",
    "/guides",
  );
  return (
    <ContentShell eyebrow="Guides" title="Guides for living in sync" subtitle="Practical, phase-by-phase guides to help you understand your cycle and work with your body — not against it.">
      <div className="grid gap-4 sm:grid-cols-1">
        {GUIDES.map((g) => (
          <a key={g.slug} href={`/guides/${g.slug}`} className="block rounded-2xl border border-[#F4C6DD] bg-white p-5 hover:shadow-md hover:border-[#EC4899]/40 transition">
            <p className="text-[11px] font-bold uppercase tracking-widest text-[#EC4899]">{g.readMins} min read</p>
            <h2 className="mt-1 font-script text-2xl text-[#831843] leading-tight">{g.title}</h2>
            <p className="mt-1.5 text-[14px] text-[#8a5c74]">{g.description}</p>
            <span className="mt-2 inline-flex items-center gap-1 text-sm font-bold text-[#EC4899]">Read the guide <ChevronRight className="h-4 w-4" /></span>
          </a>
        ))}
      </div>
    </ContentShell>
  );
}

export function GuidePage({ slug }: { slug: string }) {
  const guide = GUIDES.find((g) => g.slug === slug);
  // Hooks must run unconditionally — fall back to sensible SEO if not found.
  useSeo(
    guide?.metaTitle ?? "Guide not found — Bloomzein",
    guide?.description ?? "Explore Bloomzein guides on cycle syncing, nutrition and movement.",
    `/guides/${slug}`,
  );
  if (!guide) {
    return (
      <ContentShell eyebrow="Guides" title="Guide not found" subtitle="That guide doesn't exist — browse all our guides instead.">
        <P><A href="/guides">← Back to all guides</A></P>
      </ContentShell>
    );
  }
  const articleSchema = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: guide.title,
    description: guide.description,
    author: { "@type": "Organization", name: "Bloomzein" },
    publisher: { "@type": "Organization", name: "Bloomzein" },
    mainEntityOfPage: `${SITE}/guides/${guide.slug}`,
  };
  return (
    <ContentShell eyebrow={`Guide · ${guide.readMins} min read`} title={guide.title} subtitle={guide.intro}>
      <JsonLd data={articleSchema} />
      <p className="text-sm"><A href="/guides">← All guides</A></p>
      {guide.sections.map((s) => (
        <section key={s.h}>
          <H2>{s.h}</H2>
          {s.p.map((para, i) => <P key={i}>{para}</P>)}
        </section>
      ))}
      <section>
        <H2>Related</H2>
        <ul className="mt-2 list-disc space-y-1 pl-5 marker:text-[#EC4899]">
          {GUIDES.filter((g) => g.slug !== guide.slug).map((g) => (
            <li key={g.slug}><A href={`/guides/${g.slug}`}>{g.title}</A></li>
          ))}
        </ul>
      </section>
    </ContentShell>
  );
}
