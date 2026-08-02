import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, ChevronRight, BookOpen, HelpCircle, LifeBuoy, Send, Heart,
  Search, Clock, ArrowRight, Flower2, Sparkles, Salad, CookingPot, Gem,
  PersonStanding, Feather, Brain, Moon, Leaf, HeartHandshake, NotebookPen, Compass, Star,
  PiggyBank, Droplets } from "lucide-react";
import { AppIcon } from "@/components/bloom/AppIcon";
import { supabase } from "@/lib/supabase";
import { ARTICLES, FILTERS, IMG, articlesByCategory, articleById, type Filter, type Article } from "@/lib/readsData";
import { articleSlug, articleBySlug } from "@/lib/blog";
import { loadArticleBody } from "@/content/reads/registry";
import { ArticleBody, parseArticle } from "@/components/bloom/read/ArticleBody";

/** @read cross-links on the public blog resolve to /blog/<slug> (crawlable),
 *  not the in-app reader. */
const blogReadHref = (id: string) => {
  const a = articleById(id);
  return a ? `/blog/${articleSlug(a)}` : "/blog";
};

/* ------------------------------------------------------------------ *
 * Public, indexable content pages — Help Center, Guides, FAQ.
 * These exist to (a) genuinely help users and (b) rank on Google for
 * women's-wellness / cycle-tracking searches. Each sets its own <title>
 * + meta description; the FAQ also emits FAQPage structured data.
 * ------------------------------------------------------------------ */

const SITE = "https://www.bloomzein.com";
/* Article publish/modified dates for structured data. Bloomzein reads are
 * evergreen wellness content; these give Google a stable date signal. */
const BLOG_PUBLISHED = "2026-01-15T00:00:00Z";
const BLOG_MODIFIED = "2026-08-01T00:00:00Z";

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

const DEFAULT_OG_IMAGE = SITE + "/images/landing-hero.webp";

function useSeo(title: string, description: string, path: string, image = DEFAULT_OG_IMAGE) {
  useEffect(() => {
    const prevTitle = document.title;
    document.title = title;
    setMeta("description", description);
    setMeta("og:title", title, true);
    setMeta("og:description", description, true);
    setMeta("og:url", SITE + path, true);
    setMeta("og:image", image, true);
    setMeta("og:type", path.startsWith("/blog/") ? "article" : "website", true);
    setMeta("twitter:card", "summary_large_image");
    setMeta("twitter:title", title);
    setMeta("twitter:description", description);
    setMeta("twitter:image", image);
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

/* ================================================================= *
 * BLOG — public, indexable articles (SEO surface over the Read library)
 *
 * Same catalogue as the in-app Read page (behind /app/, blocked from crawlers),
 * published here on crawlable /blog/<slug> URLs — and wearing the SAME design as
 * the app's Read page: photo hero, search, category filters, article cards and
 * the magazine reader. The difference is public plumbing: real <a> links (not
 * in-app open state), canonical + Article JSON-LD, and no auth-only bits
 * (saved/recommended/phase).
 * ================================================================= */

/* Compact labels + per-category icons for the filter row (mirrors app.read). */
const FILTER_LABELS: Partial<Record<Filter, string>> = {
  "Cycle & Hormones": "Cycle",
  "Mental Wellness": "Mind",
  "Soft Living": "Soft Living",
  "Herbal Wellness": "Herbal",
  "Bloomzein Originals": "Originals",
};
const filterLabel = (f: Filter) => FILTER_LABELS[f] ?? f;
const FILTER_ICONS: Record<Filter, typeof Sparkles> = {
  All: Sparkles,
  "Cycle & Hormones": Flower2,
  Nutrition: Salad,
  Recipes: CookingPot,
  Beauty: Gem,
  Yoga: PersonStanding,
  "Soft Living": Feather,
  "Mental Wellness": Brain,
  Sleep: Moon,
  "Herbal Wellness": Leaf,
  Relationships: HeartHandshake,
  Journaling: NotebookPen,
  Money: PiggyBank,
  "Clean Girl": Droplets,
  Lifestyle: Compass,
  "Bloomzein Originals": Star,
};

/* Public top bar — logo home + Start Blooming CTA (blog has no AppShell). */
function BlogTopBar() {
  return (
    <div className="sticky top-0 z-30 border-b border-petal/40 bg-white/70 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-2.5 sm:px-6">
        <a href="/" className="flex items-center gap-2">
          <AppIcon size={30} />
          <span className="font-script text-xl text-hotpink">Bloomzein</span>
        </a>
        <a href="/app/today" className="bloom-luxury-btn hover-scale inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-bold text-white">
          Start Blooming <ArrowRight className="h-3.5 w-3.5" />
        </a>
      </div>
    </div>
  );
}

function TopicBadge({ topic }: { topic: string }) {
  return (
    <span className="inline-block rounded-full bg-white/85 backdrop-blur px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-hotpink border border-petal/60">
      {topic}
    </span>
  );
}
function ReadTime({ minutes, light }: { minutes: number; light?: boolean }) {
  return (
    <span className={["inline-flex items-center gap-1 text-[11px] font-semibold", light ? "text-white/95" : "text-rose/70"].join(" ")}>
      <Clock className="h-3 w-3" strokeWidth={1.8} /> {minutes} min
    </span>
  );
}
/** Count a "1.9k" figure up from zero the first time it scrolls in. */
function useCountUp(target: string, duration = 1200) {
  const parsed = useMemo(() => {
    const m = target.trim().match(/^([\d.]+)\s*([a-zA-Z]*)$/);
    if (!m) return null;
    const numStr = m[1];
    return { value: parseFloat(numStr), decimals: numStr.includes(".") ? numStr.split(".")[1].length : 0, suffix: m[2] };
  }, [target]);
  const ref = useRef<HTMLSpanElement>(null);
  const [val, setVal] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!parsed || !el) return;
    let raf = 0;
    const obs = new IntersectionObserver((entries) => {
      if (!entries[0].isIntersecting) return;
      obs.disconnect();
      const start = performance.now();
      const tick = (now: number) => {
        const t = Math.min(1, (now - start) / duration);
        setVal(parsed.value * (1 - Math.pow(1 - t, 3)));
        if (t < 1) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    }, { threshold: 0.5 });
    obs.observe(el);
    return () => { obs.disconnect(); cancelAnimationFrame(raf); };
  }, [parsed, duration]);
  return { ref, display: parsed ? val.toFixed(parsed.decimals) + parsed.suffix : target };
}
function BloomCount({ count, light }: { count: string; light?: boolean }) {
  const { ref, display } = useCountUp(count);
  return (
    <span ref={ref} className={["inline-flex items-center gap-1 text-[11px] font-semibold tabular-nums", light ? "text-white/95" : "text-rose/70"].join(" ")}>
      <Flower2 className="h-3 w-3" strokeWidth={1.8} /> {display}
    </span>
  );
}

/** Article card — same look as the app's, but a real <a> link for crawlers. */
function BlogCard({ article, index = 0 }: { article: Article; index?: number }) {
  return (
    <a
      href={`/blog/${articleSlug(article)}`}
      style={{ animationDelay: `${index * 0.06}s` }}
      className="group relative block text-left overflow-hidden rounded-2xl sm:rounded-3xl border border-petal/60 bg-white/85 backdrop-blur shadow-[0_8px_24px_-12px_oklch(0.7_0.18_350/0.3)] transition hover:-translate-y-1 hover:shadow-[0_18px_36px_-14px_oklch(0.7_0.22_350/0.45)] animate-card-pop-in"
    >
      <div className="relative h-28 sm:h-44 overflow-hidden">
        <img src={article.image} alt={article.title} className="block h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" loading="lazy" referrerPolicy="no-referrer" />
        <div className="absolute top-2 left-2 sm:top-3 sm:left-3"><TopicBadge topic={article.category} /></div>
      </div>
      <div className="p-3 sm:p-5">
        <h2 className="text-sm sm:text-base font-bold text-rose leading-snug line-clamp-2">{article.title}</h2>
        <p className="mt-1 sm:mt-1.5 text-xs sm:text-sm text-rose/75 line-clamp-2 hidden sm:block">{article.excerpt}</p>
        <div className="mt-2 sm:mt-3 flex items-center justify-between">
          <span className="flex items-center gap-2"><ReadTime minutes={article.minutes} /><BloomCount count={article.blooms} /></span>
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-hotpink opacity-0 group-hover:opacity-100 transition">
            Read <ArrowRight className="h-3 w-3" strokeWidth={2} />
          </span>
        </div>
      </div>
    </a>
  );
}

export function BlogIndexPage() {
  useSeo(
    "Blog — cycle, nutrition, beauty & soft-living articles | Bloomzein",
    "Soft, cycle-aware wellness articles: hormones and your cycle, eating by phase, beauty, yoga, sleep, journaling and gentle living — from Bloomzein.",
    "/blog",
  );
  const [query, setQuery] = useState("");
  const [topic, setTopic] = useState<Filter>("All");
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return ARTICLES.filter((a) => {
      const matchTopic = topic === "All" || a.category === topic;
      const matchQ = !q || a.title.toLowerCase().includes(q) || a.category.toLowerCase().includes(q) || a.excerpt.toLowerCase().includes(q);
      return matchTopic && matchQ;
    });
  }, [query, topic]);

  return (
    <div className="min-h-screen bg-[#FFF0F6] text-rose">
      <BlogTopBar />
      <div className="relative isolate mx-auto max-w-5xl px-3 pb-16 sm:px-6 lg:px-8">
        {/* Hero photo as a blended full-bleed background — same technique as Read. */}
        <div
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-0 -z-10 h-[540px] w-screen -translate-x-1/2 overflow-hidden"
          style={{
            WebkitMaskImage: "linear-gradient(to bottom, #000 0%, #000 45%, transparent 100%)",
            maskImage: "linear-gradient(to bottom, #000 0%, #000 45%, transparent 100%)",
          }}
        >
          <img src={IMG.featured} alt="" className="animate-hero-breathe h-full w-full object-cover object-[55%_32%] origin-bottom scale-[1.22] sm:scale-100" referrerPolicy="no-referrer" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#FFE4F1]/90 via-[#FFE4F1]/25 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[#FFF0F6]" />
        </div>

        {/* HERO title */}
        <section className="relative z-[1] max-w-[80%] pt-5 pb-1 sm:max-w-md sm:pt-9">
          <h1 className="animate-fade-in font-script text-[3.25rem] leading-[0.9] text-hotpink drop-shadow-[0_2px_6px_oklch(1_0_0/0.55)] sm:text-6xl lg:text-7xl">Read</h1>
          <p className="animate-fade-in mt-1 font-script text-xl leading-tight text-rose/90 sm:text-2xl" style={{ animationDelay: "150ms" }}>
            soft reads for <br className="sm:hidden" />your softest era ✿
          </p>
        </section>

        {/* SEARCH + FILTERS */}
        <div className="relative z-[2] mx-auto mt-4 max-w-3xl rounded-[1.75rem] border border-white/60 bg-white/50 p-2.5 shadow-[0_22px_55px_-26px_oklch(0.55_0.2_350/0.55)] backdrop-blur-xl animate-card-pop-in sm:p-3.5">
          <div className="relative">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-hotpink" strokeWidth={2.2} />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="What would you like to bloom into today?"
              className="w-full rounded-full border border-petal/50 bg-white/85 py-2.5 pl-11 pr-4 text-sm text-rose outline-none backdrop-blur transition placeholder:text-rose/50 focus:border-hotpink focus:ring-4 focus:ring-hotpink/20 sm:py-3"
            />
          </div>
          <div className="mt-2.5 flex items-center gap-2 overflow-x-auto no-scrollbar pb-0.5">
            {FILTERS.filter((f) => f === "All" || ARTICLES.some((a) => a.category === f)).map((t) => {
              const active = topic === t;
              const Icon = FILTER_ICONS[t] ?? Sparkles;
              return (
                <button
                  key={t}
                  onClick={() => setTopic(t)}
                  className={[
                    "shrink-0 inline-flex items-center gap-1.5 rounded-full border py-1.5 pl-2.5 pr-3 text-xs font-semibold whitespace-nowrap transition active:scale-95 sm:text-[13px]",
                    t === "All" ? "sticky left-0 z-[1]" : "",
                    active
                      ? "border-hotpink bg-hotpink text-white shadow-md shadow-hotpink/30 animate-selected-glow"
                      : "border-petal/60 bg-white/85 text-rose hover:bg-blush/70",
                  ].join(" ")}
                >
                  <Icon className="h-3.5 w-3.5 shrink-0" strokeWidth={2} />
                  {filterLabel(t)}
                </button>
              );
            })}
          </div>
        </div>

        {/* GRID */}
        <section className="mt-6">
          {filtered.length === 0 ? (
            <div className="rounded-3xl border border-petal/50 bg-white/85 p-10 text-center backdrop-blur">
              <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-blush text-hotpink">
                <BookOpen className="h-5 w-5" strokeWidth={1.6} />
              </span>
              <p className="mt-3 text-sm text-rose">{query ? `No articles matching "${query}".` : "No articles in this topic yet."}</p>
              <button
                onClick={() => { setQuery(""); setTopic("All"); }}
                className="bloom-luxury-btn mt-3 inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white"
              >
                See all articles <ArrowRight className="h-3 w-3" strokeWidth={2} />
              </button>
            </div>
          ) : (
            <div key={topic + query} className="grid grid-cols-2 gap-3 animate-fade-in sm:gap-5 lg:grid-cols-3">
              {filtered.map((a, i) => <BlogCard key={a.id} article={a} index={i} />)}
            </div>
          )}
        </section>

        <CTA />
      </div>
    </div>
  );
}

/* Self-contained article-body renderer — a tiny markdown dialect, with NO
   app-component imports, so the public blog never depends on an auth-gated
   shared chunk (that dependency was crashing the deployed page with React #130).
   Produces clean semantic HTML (h2/h3/p/ul/blockquote) for SEO. */
function renderInline(text: string, keyBase: string): React.ReactNode[] {
  const out: React.ReactNode[] = [];
  const re = /(\*\*[^*]+\*\*|\*[^*]+\*)/g;
  let last = 0, i = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(<span key={`${keyBase}-t${i}`}>{text.slice(last, m.index)}</span>);
    const tok = m[0];
    if (tok.startsWith("**")) out.push(<strong key={`${keyBase}-b${i}`} className="font-semibold text-rose">{tok.slice(2, -2)}</strong>);
    else out.push(<em key={`${keyBase}-i${i}`} className="italic">{tok.slice(1, -1)}</em>);
    last = m.index + tok.length;
    i++;
  }
  if (last < text.length) out.push(<span key={`${keyBase}-t${i}`}>{text.slice(last)}</span>);
  return out;
}

type Blk =
  | { t: "h2" | "h3" | "p" | "quote"; text: string }
  | { t: "ul"; items: string[] }
  | { t: "hr" };

function parseBlogBody(md: string): { headline: string; blocks: Blk[] } {
  const lines = md.replace(/\r\n/g, "\n").split("\n");
  const blocks: Blk[] = [];
  let headline = "";
  let seenHeadline = false;
  let para: string[] = [];
  const flush = () => { if (para.length) { blocks.push({ t: "p", text: para.join(" ") }); para = []; } };
  let i = 0;
  while (i < lines.length) {
    const line = lines[i].trim();
    if (!line) { flush(); i++; continue; }
    if (line.startsWith("# ") && !line.startsWith("## ")) {
      headline = line.slice(2).trim();
      seenHeadline = true;
      flush();
      i++;
      let j = i;
      while (j < lines.length && !lines[j].trim()) j++;
      if (/^\*[^*].*\*$/.test(lines[j]?.trim() || "")) i = j + 1;
      continue;
    }
    if (line.startsWith("### ")) { flush(); blocks.push({ t: "h3", text: line.slice(4).trim() }); i++; continue; }
    if (line.startsWith("## ")) { flush(); blocks.push({ t: "h2", text: line.slice(3).trim() }); i++; continue; }
    if (line === "---") { flush(); blocks.push({ t: "hr" }); i++; continue; }
    if (line.startsWith(">")) {
      flush();
      const buf: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith(">")) { buf.push(lines[i].trim().replace(/^>\s?/, "")); i++; }
      blocks.push({ t: "quote", text: buf.join(" ") });
      continue;
    }
    if (/^[-*]\s+/.test(line)) {
      flush();
      const items: string[] = [];
      while (i < lines.length && /^[-*]\s+/.test(lines[i].trim())) { items.push(lines[i].trim().replace(/^[-*]\s+/, "")); i++; }
      blocks.push({ t: "ul", items });
      continue;
    }
    if (!seenHeadline && /^\*[^*].*\*$/.test(line)) { i++; continue; } // stray dek before headline
    para.push(line);
    i++;
  }
  flush();
  return { headline, blocks };
}

function BlogArticleBody({ md }: { md: string }) {
  const { blocks } = useMemo(() => parseBlogBody(md), [md]);
  let firstPara = true;
  return (
    <div>
      {blocks.map((b, i) => {
        const k = `b${i}`;
        if (b.t === "h2") return <h2 key={k} className="mt-10 mb-1 font-script text-3xl leading-tight text-hotpink sm:text-4xl">{b.text}</h2>;
        if (b.t === "h3") return <h3 key={k} className="mt-6 font-script text-2xl leading-tight text-hotpink">{b.text}</h3>;
        if (b.t === "hr") return (
          <div key={k} className="my-8 flex items-center justify-center gap-2 text-hotpink/60">
            <span className="h-px w-12 bg-petal/70" />✿<span className="h-px w-12 bg-petal/70" />
          </div>
        );
        if (b.t === "quote") return (
          <blockquote key={k} className="my-6 rounded-2xl border border-hotpink/25 bg-gradient-to-br from-blush/55 to-white/70 p-4 text-[15px] italic leading-7 text-rose sm:p-5 sm:text-lg">
            {renderInline(b.text, k)}
          </blockquote>
        );
        if (b.t === "ul") return (
          <ul key={k} className="mt-4 space-y-2.5">
            {b.items.map((it, ii) => (
              <li key={`${k}-${ii}`} className="flex gap-2.5 text-[15px] leading-7 text-rose/90 sm:text-[17px]">
                <span className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-hotpink" />
                <span>{renderInline(it, `${k}-${ii}`)}</span>
              </li>
            ))}
          </ul>
        );
        if (firstPara) {
          firstPara = false;
          return (
            <p key={k} className="mt-1 text-[15px] leading-8 text-rose/90 sm:text-[17px]">
              <span className="float-left mr-2.5 mt-1.5 font-script text-6xl leading-[0.7] text-hotpink sm:text-7xl">{b.text.charAt(0)}</span>
              {renderInline(b.text.slice(1), k)}
            </p>
          );
        }
        return <p key={k} className="mt-4 text-[15px] leading-8 text-rose/90 sm:text-[17px]">{renderInline(b.text, k)}</p>;
      })}
    </div>
  );
}

export function BlogArticlePage({ slug }: { slug: string }) {
  const article = articleBySlug(slug);
  useSeo(
    article ? `${article.title} | Bloomzein` : "Article not found — Bloomzein",
    article?.excerpt ?? "Read soft, cycle-aware wellness articles on Bloomzein.",
    `/blog/${slug}`,
    article ? SITE + article.image : undefined,
  );

  const [md, setMd] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let alive = true;
    setLoading(true);
    setMd(null);
    if (!article) { setLoading(false); return; }
    try { window.scrollTo({ top: 0 }); } catch { /* ignore */ }
    loadArticleBody(article).then((body) => {
      if (!alive) return;
      // Legacy short reads return a bare paragraph — wrap so every article
      // renders through one path with a leading headline.
      const text = !body
        ? `# ${article.title}\n\n*${article.excerpt}*\n\nThis story is coming soon.`
        : body.trimStart().startsWith("# ")
        ? body
        : `# ${article.title}\n\n*${article.excerpt}*\n\n${body}`;
      setMd(text);
      setLoading(false);
    });
    return () => { alive = false; };
  }, [article]);

  if (!article) {
    return (
      <div className="min-h-screen bg-[#FFF0F6] text-rose">
        <BlogTopBar />
        <div className="mx-auto max-w-3xl px-5 py-20 text-center">
          <h1 className="font-script text-4xl text-hotpink">Article not found</h1>
          <p className="mt-2 text-sm text-rose/80">That article doesn't exist — browse all our articles instead.</p>
          <a href="/blog" className="bloom-luxury-btn mt-5 inline-flex items-center gap-1.5 px-5 py-2.5 text-sm font-bold text-white">
            <ArrowLeft className="h-4 w-4" /> All articles
          </a>
        </div>
      </div>
    );
  }

  const related = articlesByCategory(article.category).filter((a) => a.id !== article.id).slice(0, 6);
  const heroFade = "linear-gradient(to bottom, #000 0%, #000 42%, transparent 100%)";
  const articleSchema = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: article.title,
    description: article.excerpt,
    image: SITE + article.image,
    articleSection: article.category,
    datePublished: BLOG_PUBLISHED,
    dateModified: BLOG_MODIFIED,
    author: { "@type": "Organization", name: "Bloomzein", url: SITE },
    publisher: {
      "@type": "Organization",
      name: "Bloomzein",
      logo: { "@type": "ImageObject", url: SITE + "/images/landing-hero.webp" },
    },
    mainEntityOfPage: `${SITE}/blog/${slug}`,
  };

  return (
    <div className="min-h-screen bg-[#FFF0F6] text-rose">
      <BlogTopBar />
      <article className="relative isolate mx-auto max-w-5xl animate-fade-in px-3 pb-16 sm:px-6 lg:px-8">
        <JsonLd data={articleSchema} />

        {/* HERO IMAGE — full-bleed blended background with a pink wash for the title. */}
        <div
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-0 -z-10 h-[26rem] w-screen -translate-x-1/2 overflow-hidden sm:h-[30rem] lg:h-[34rem]"
          style={{ WebkitMaskImage: heroFade, maskImage: heroFade }}
        >
          <img src={article.image} alt={article.title} className="animate-hero-breathe h-full w-full object-cover object-center" referrerPolicy="no-referrer" />
          <div className="absolute inset-0 sm:hidden" style={{ background: "linear-gradient(to right, rgba(226,46,134,0.97) 0%, rgba(226,46,134,0.93) 42%, rgba(226,46,134,0.55) 62%, rgba(226,46,134,0) 80%)" }} />
          <div className="absolute inset-0 hidden sm:block" style={{ background: "linear-gradient(to right, rgba(226,46,134,0.97) 0%, rgba(226,46,134,0.9) 26%, rgba(226,46,134,0.5) 41%, rgba(226,46,134,0) 58%)" }} />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[#FFF0F6]/70" />
        </div>

        {/* back to blog */}
        <div className="relative z-[1] flex items-center gap-2 pt-3">
          <a href="/blog" className="inline-flex items-center gap-1.5 rounded-full border border-white/70 bg-white/80 px-3 py-1.5 text-xs font-semibold text-hotpink shadow-sm backdrop-blur transition hover:bg-white active:scale-95">
            <ArrowLeft className="h-3.5 w-3.5" strokeWidth={1.8} /> Back to Blog
          </a>
        </div>

        {/* HERO TITLE over the pink-washed image */}
        <header className="relative z-[1] flex min-h-[11rem] max-w-[14rem] flex-col justify-center pb-3 sm:min-h-[13rem] sm:max-w-[22rem] lg:min-h-[15rem] lg:max-w-[25rem]">
          <h1 className="font-script text-[2.15rem] leading-[1.0] text-white sm:text-5xl lg:text-[3.5rem]" style={{ textShadow: "0 2px 16px rgba(140,18,74,0.55), 0 1px 2px rgba(140,18,74,0.45)" }}>
            {article.title}
          </h1>
          <div className="mt-3 flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:gap-2.5" style={{ filter: "drop-shadow(0 1px 5px rgba(140,18,74,0.4))" }}>
            <TopicBadge topic={article.category} />
            <div className="flex items-center gap-2.5">
              <ReadTime minutes={article.minutes} light />
              <BloomCount count={article.blooms} light />
            </div>
          </div>
        </header>

        {/* BODY — single readable column, white article card */}
        <div className="relative z-[1] mx-auto mt-4 max-w-3xl">
          <div className="relative overflow-hidden rounded-[1.75rem] border border-petal/50 bg-white/92 p-5 shadow-[0_18px_50px_-28px_oklch(0.6_0.22_350/0.4)] backdrop-blur sm:p-8 lg:p-9">
            {loading || !md ? (
              <div className="animate-pulse space-y-4 py-2" aria-hidden>
                <div className="h-4 w-2/3 rounded-full bg-petal/30" />
                <div className="mt-8 space-y-3">
                  {Array.from({ length: 7 }).map((_, i) => (
                    <div key={i} className="h-3.5 rounded-full bg-petal/25" style={{ width: `${92 - (i % 3) * 12}%` }} />
                  ))}
                </div>
              </div>
            ) : (
              <ArticleBody parsed={parseArticle(md)} readHref={blogReadHref} />
            )}
          </div>

          {related.length > 0 && (
            <section className="mt-10">
              <h2 className="font-script text-2xl text-hotpink sm:text-3xl">More in {article.category} ✿</h2>
              <div className="mt-4 grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-3">
                {related.map((a, i) => <BlogCard key={a.id} article={a} index={i} />)}
              </div>
            </section>
          )}

          <CTA />
        </div>
      </article>
    </div>
  );
}
