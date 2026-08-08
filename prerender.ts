/**
 * Build-time prerenderer — the SEO fix for a client-rendered SPA.
 *
 * Problem it solves: Bloomzein is a Vite SPA. With Vercel's catch-all rewrite to
 * /index.html, EVERY public URL used to return the same empty shell — the same
 * homepage <title>, the same homepage <link rel="canonical">, and an empty
 * <div id="root"> with zero article text. Google therefore folded every article
 * into the homepage ("Duplicate / Alternate page with proper canonical tag") and
 * left the rest "Crawled – currently not indexed".
 *
 * What this plugin does: after the normal SPA build, for every public route it
 * writes a real static HTML file into dist/ (e.g. dist/blog/<slug>/index.html)
 * that carries:
 *   • the page's own <title> + <meta description>
 *   • a SELF-referencing <link rel="canonical">
 *   • correct Open Graph / Twitter tags + JSON-LD structured data
 *   • the full article/guide/FAQ TEXT baked into <div id="root"> as semantic HTML
 *   • the exact same hashed <script>/<link> tags as index.html, so the live SPA
 *     still boots and hydrates on top for real users.
 *
 * Vercel serves an existing static file before applying the SPA rewrite, so
 * crawlers get fully-formed, unique, indexable HTML while users keep the app.
 *
 * It reads the SAME data the app renders (readsData, seoContent, article bodies)
 * so the prerendered HTML can never drift from what the SPA shows.
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import type { Plugin } from "vite";
import { ARTICLES, articlesByCategory, type Article } from "./src/lib/readsData";
import { articleSlug, articleBySlug } from "./src/lib/blog";
import { GUIDES, FAQS } from "./src/lib/seoContent";
import { ALL_BODIES } from "./src/content/reads/allBodies";

const SITE = "https://www.bloomzein.com";
const DEFAULT_OG_IMAGE = `${SITE}/images/landing-hero.webp`;
const BLOG_PUBLISHED = "2026-01-15T00:00:00Z";
const BLOG_MODIFIED = "2026-08-01T00:00:00Z";

/* ---------- tiny HTML utilities ---------- */

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Inline markdown → HTML: **bold**, *italic*, [text](href). Text is escaped. */
function inline(text: string): string {
  // Pull out links first so their inner text still gets bold/italic handling.
  const parts: string[] = [];
  const linkRe = /\[([^\]]+)\]\(([^)]+)\)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = linkRe.exec(text))) {
    parts.push(emphasis(text.slice(last, m.index)));
    const href = m[2].trim();
    const safeHref = /^(https?:|\/|mailto:)/i.test(href) ? href : "#";
    parts.push(`<a href="${esc(safeHref)}">${emphasis(m[1])}</a>`);
    last = m.index + m[0].length;
  }
  parts.push(emphasis(text.slice(last)));
  return parts.join("");
}

function emphasis(text: string): string {
  let out = esc(text);
  out = out.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  out = out.replace(/(^|[^*])\*([^*]+)\*/g, "$1<em>$2</em>");
  return out;
}

/**
 * Article/guide markdown → clean semantic HTML for crawlers.
 * Handles the app's dialect: #/##/### headings, - / * lists, > callouts, ---
 * dividers, and skips interactive @tool/@read/@product/@chart directives (they
 * hydrate client-side; their prose value is nil for SEO).
 */
function bodyToHtml(md: string, opts: { skipH1?: boolean } = {}): string {
  const lines = md.replace(/\r\n/g, "\n").split("\n");
  const out: string[] = [];
  let para: string[] = [];
  const flushPara = () => {
    if (para.length) {
      out.push(`<p>${inline(para.join(" "))}</p>`);
      para = [];
    }
  };
  let i = 0;
  let seenH1 = false;
  while (i < lines.length) {
    const line = lines[i].trim();
    if (!line) { flushPara(); i++; continue; }

    if (line.startsWith("# ") && !line.startsWith("## ")) {
      flushPara();
      seenH1 = true;
      if (!opts.skipH1) out.push(`<h1>${inline(line.slice(2).trim())}</h1>`);
      i++;
      // Skip an immediately-following *italic dek* line.
      let j = i;
      while (j < lines.length && !lines[j].trim()) j++;
      if (/^\*[^*].*\*$/.test(lines[j]?.trim() || "")) i = j + 1;
      continue;
    }
    if (line.startsWith("### ")) { flushPara(); out.push(`<h3>${inline(line.slice(4).trim())}</h3>`); i++; continue; }
    if (line.startsWith("## ")) { flushPara(); out.push(`<h2>${inline(line.slice(3).trim())}</h2>`); i++; continue; }
    if (line === "---") { flushPara(); out.push("<hr />"); i++; continue; }

    // Interactive directives — no crawlable prose, skip.
    if (/^@(tool|read|product|chart|img|video)\b/.test(line)) { flushPara(); i++; continue; }

    if (line.startsWith(">")) {
      flushPara();
      const buf: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith(">")) {
        buf.push(lines[i].trim().replace(/^>\s?/, ""));
        i++;
      }
      out.push(`<blockquote>${inline(buf.join(" "))}</blockquote>`);
      continue;
    }

    if (/^[-*]\s+/.test(line)) {
      flushPara();
      const items: string[] = [];
      while (i < lines.length && /^[-*]\s+/.test(lines[i].trim())) {
        items.push(lines[i].trim().replace(/^[-*]\s+/, ""));
        i++;
      }
      out.push(`<ul>${items.map((it) => `<li>${inline(it)}</li>`).join("")}</ul>`);
      continue;
    }

    // A stray *dek* line before the first heading — drop it.
    if (!seenH1 && /^\*[^*].*\*$/.test(line)) { i++; continue; }

    para.push(line);
    i++;
  }
  flushPara();
  return out.join("\n");
}

/* ---------- head-tag rewriting on the built index.html template ---------- */

type Meta = {
  title: string;
  description: string;
  path: string;
  image?: string;
  ogType?: "website" | "article";
  jsonLd?: object[];
  bodyHtml: string;
};

function setTag(html: string, re: RegExp, replacement: string): string {
  return re.test(html) ? html.replace(re, replacement) : html;
}

function render(template: string, m: Meta): string {
  const url = SITE + m.path;
  const image = m.image ?? DEFAULT_OG_IMAGE;
  const ogType = m.ogType ?? (m.path.startsWith("/blog/") || m.path.startsWith("/guides/") ? "article" : "website");
  let html = template;

  html = setTag(html, /<title>[\s\S]*?<\/title>/, `<title>${esc(m.title)}</title>`);
  html = setTag(html, /<meta\s+name="description"[^>]*>/, `<meta name="description" content="${esc(m.description)}" />`);
  html = setTag(html, /<link\s+rel="canonical"[^>]*>/, `<link rel="canonical" href="${esc(url)}" />`);
  html = setTag(html, /<meta\s+property="og:type"[^>]*>/, `<meta property="og:type" content="${ogType}" />`);
  html = setTag(html, /<meta\s+property="og:title"[^>]*>/, `<meta property="og:title" content="${esc(m.title)}" />`);
  html = setTag(html, /<meta\s+property="og:description"[^>]*>/, `<meta property="og:description" content="${esc(m.description)}" />`);
  html = setTag(html, /<meta\s+property="og:url"[^>]*>/, `<meta property="og:url" content="${esc(url)}" />`);
  html = setTag(html, /<meta\s+property="og:image"[^>]*>/, `<meta property="og:image" content="${esc(image)}" />`);
  html = setTag(html, /<meta\s+name="twitter:title"[^>]*>/, `<meta name="twitter:title" content="${esc(m.title)}" />`);
  html = setTag(html, /<meta\s+name="twitter:description"[^>]*>/, `<meta name="twitter:description" content="${esc(m.description)}" />`);
  html = setTag(html, /<meta\s+name="twitter:image"[^>]*>/, `<meta name="twitter:image" content="${esc(image)}" />`);

  if (m.jsonLd?.length) {
    const blocks = m.jsonLd
      .map((d) => `<script type="application/ld+json">${JSON.stringify(d)}</script>`)
      .join("\n    ");
    html = html.replace("</head>", `    ${blocks}\n  </head>`);
  }

  // Bake the content into #root. React's createRoot() will replace this on
  // hydration for real users; crawlers read it directly from the response.
  html = html.replace(
    /<div id="root">\s*<\/div>/,
    `<div id="root"><main class="prerender-seo">${m.bodyHtml}</main></div>`,
  );
  return html;
}

/* ---------- per-route content builders ---------- */

function articleMeta(a: Article): Meta {
  const slug = articleSlug(a);
  const md = ALL_BODIES[a.id];
  const bodyText = md
    ? bodyToHtml(md.trimStart().startsWith("# ") ? md : `# ${a.title}\n\n${md}`, { skipH1: false })
    : `<h1>${esc(a.title)}</h1><p>${inline(a.excerpt)}</p>`;
  const related = articlesByCategory(a.category)
    .filter((r) => r.id !== a.id)
    .slice(0, 6)
    .map((r) => `<li><a href="/blog/${articleSlug(r)}">${esc(r.title)}</a></li>`)
    .join("");
  const bodyHtml =
    `<article>${bodyText}` +
    (related ? `<section><h2>More in ${esc(a.category)}</h2><ul>${related}</ul></section>` : "") +
    `</article>`;
  return {
    title: `${a.title} | Bloomzein`,
    description: a.excerpt,
    path: `/blog/${slug}`,
    image: SITE + a.image,
    ogType: "article",
    bodyHtml,
    jsonLd: [
      {
        "@context": "https://schema.org",
        "@type": "Article",
        headline: a.title,
        description: a.excerpt,
        image: SITE + a.image,
        articleSection: a.category,
        datePublished: BLOG_PUBLISHED,
        dateModified: BLOG_MODIFIED,
        author: { "@type": "Organization", name: "Bloomzein", url: SITE },
        publisher: {
          "@type": "Organization",
          name: "Bloomzein",
          logo: { "@type": "ImageObject", url: DEFAULT_OG_IMAGE },
        },
        mainEntityOfPage: `${SITE}/blog/${slug}`,
      },
    ],
  };
}

function blogIndexMeta(): Meta {
  const cards = ARTICLES.map(
    (a) =>
      `<li><a href="/blog/${articleSlug(a)}"><h2>${esc(a.title)}</h2><p>${esc(a.excerpt)}</p></a></li>`,
  ).join("");
  return {
    title: "Blog — cycle, nutrition, beauty & soft-living articles | Bloomzein",
    description:
      "Soft, cycle-aware wellness articles: hormones and your cycle, eating by phase, beauty, yoga, sleep, journaling and gentle living — from Bloomzein.",
    path: "/blog",
    ogType: "website",
    bodyHtml: `<h1>Read</h1><p>Soft reads for your softest era.</p><ul>${cards}</ul>`,
  };
}

function guideMeta(g: (typeof GUIDES)[number]): Meta {
  const sections = g.sections
    .map((s) => `<section><h2>${esc(s.h)}</h2>${s.p.map((p) => `<p>${inline(p)}</p>`).join("")}</section>`)
    .join("");
  return {
    title: g.metaTitle,
    description: g.description,
    path: `/guides/${g.slug}`,
    ogType: "article",
    bodyHtml: `<article><h1>${esc(g.title)}</h1><p>${inline(g.intro)}</p>${sections}</article>`,
    jsonLd: [
      {
        "@context": "https://schema.org",
        "@type": "Article",
        headline: g.title,
        description: g.description,
        author: { "@type": "Organization", name: "Bloomzein" },
        publisher: { "@type": "Organization", name: "Bloomzein" },
        mainEntityOfPage: `${SITE}/guides/${g.slug}`,
      },
    ],
  };
}

function guidesIndexMeta(): Meta {
  const cards = GUIDES.map(
    (g) => `<li><a href="/guides/${g.slug}"><h2>${esc(g.title)}</h2><p>${esc(g.description)}</p></a></li>`,
  ).join("");
  return {
    title: "Guides — cycle syncing, nutrition & wellness | Bloomzein",
    description:
      "In-depth guides on cycle syncing, eating for your menstrual cycle, and cycle-synced workouts — practical, phase-by-phase advice for women's wellness.",
    path: "/guides",
    ogType: "website",
    bodyHtml: `<h1>Guides for living in sync</h1><ul>${cards}</ul>`,
  };
}

function faqMeta(): Meta {
  const items = FAQS.map((f) => `<section><h2>${esc(f.q)}</h2><p>${esc(f.a)}</p></section>`).join("");
  return {
    title: "FAQ — Bloomzein cycle tracking & wellness app",
    description:
      "Answers to common questions about Bloomzein: is it free, is my health data private, how cycle syncing works, offline use, installing the app, and more.",
    path: "/faq",
    ogType: "website",
    bodyHtml: `<h1>Frequently asked questions</h1>${items}`,
    jsonLd: [
      {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: FAQS.map((f) => ({
          "@type": "Question",
          name: f.q,
          acceptedAnswer: { "@type": "Answer", text: f.a },
        })),
      },
    ],
  };
}

function helpMeta(): Meta {
  return {
    title: "Help Center — Bloomzein cycle & wellness app",
    description:
      "Get help with Bloomzein: setting up cycle tracking, syncing meals and workouts to your phase, managing reminders, privacy, and your account.",
    path: "/help",
    ogType: "website",
    bodyHtml:
      `<h1>How can we help?</h1>` +
      `<p>Everything you need to get the most from Bloomzein — your all-in-one cycle tracking, nutrition and self-care app.</p>` +
      `<section><h2>Getting started</h2><p>Create your free account, set your last period date and cycle length in the Cycle Tracker, and the whole app tunes itself to your phase — meals, workouts and insights included.</p></section>` +
      `<section><h2>Cycle tracking</h2><p>Log your period, symptoms and mood. Bloomzein predicts your phases (menstrual, follicular, ovulatory, luteal) and shows what your body needs each day.</p></section>` +
      `<section><h2>Meals, diet &amp; workouts</h2><p>Pick a diet style and a weekly vibe; the Meal Planner builds a week that matches your diet and your cycle phase. Workouts and yoga adapt to your energy across the month.</p></section>`,
  };
}

function homeMeta(): Meta {
  return {
    title: "Bloomzein — your softest era starts here",
    description:
      "Bloomzein is the all-in-one wellness app for your cycle, nutrition, movement, mind and life — beautifully organized and synced to your body. Your softest era starts here.",
    path: "/",
    ogType: "website",
    bodyHtml:
      `<h1>Bloomzein — your softest era starts here</h1>` +
      `<p>The all-in-one wellness app for your cycle, nutrition, movement, mind and life — synced to your body. Track your cycle, sync your meals and movement, and bloom all month.</p>` +
      `<p><a href="/blog">Read the blog</a> · <a href="/guides">Guides</a> · <a href="/faq">FAQ</a></p>`,
    jsonLd: [
      {
        "@context": "https://schema.org",
        "@type": "WebSite",
        name: "Bloomzein",
        url: SITE,
      },
      {
        "@context": "https://schema.org",
        "@type": "Organization",
        name: "Bloomzein",
        url: SITE,
        logo: DEFAULT_OG_IMAGE,
      },
    ],
  };
}

/* ---------- the plugin ---------- */

export function prerenderPlugin(): Plugin {
  return {
    name: "bloomzein-prerender",
    apply: "build",
    // Run after Vite has written dist/index.html and all assets.
    closeBundle() {
      const outDir = "dist";
      const templatePath = join(outDir, "index.html");
      let template: string;
      try {
        template = readFileSync(templatePath, "utf8");
      } catch {
        this.warn?.("prerender: dist/index.html not found — skipping");
        return;
      }

      const pages: Meta[] = [
        homeMeta(),
        blogIndexMeta(),
        ...ARTICLES.map((a) => articleMeta(a)),
        guidesIndexMeta(),
        ...GUIDES.map((g) => guideMeta(g)),
        faqMeta(),
        helpMeta(),
      ];

      let written = 0;
      for (const p of pages) {
        const html = render(template, p);
        // "/" → dist/index.html ; "/blog/x" → dist/blog/x/index.html
        const rel = p.path === "/" ? "index.html" : `${p.path.replace(/^\//, "")}/index.html`;
        const dest = join(outDir, rel);
        mkdirSync(dirname(dest), { recursive: true });
        writeFileSync(dest, html);
        written++;
      }
      // Sanity: articleBySlug must resolve every emitted blog slug.
      const orphan = ARTICLES.find((a) => !articleBySlug(articleSlug(a)));
      if (orphan) this.warn?.(`prerender: slug map inconsistent for ${orphan.id}`);

      // eslint-disable-next-line no-console
      console.log(`\n✓ prerendered ${written} static HTML pages for SEO`);
    },
  };
}
