/**
 * Build-time prerendering data for the public blog.
 *
 * The app is a client-rendered SPA, so a crawler/social scraper fetching
 * /blog/<slug> would otherwise get an empty shell. At build time we generate a
 * real HTML file per article (see the `prerender-blog` plugin in vite.config)
 * with the correct <title>/description/canonical/OpenGraph tags AND the article
 * text rendered as static HTML — so Google indexes the words and Facebook /
 * Pinterest / WhatsApp show the right title + image. React still boots and
 * replaces #root for the live reader experience.
 *
 * IMPORTANT: keep this free of React/asset imports — vite.config.ts imports it
 * at build time (same as the sitemap generator). Content modules below are pure
 * data (a Record<id, markdown>), so importing them here is safe.
 */
import { ARTICLES, CAT_IMG, type Article, type Category } from "./readsData";
import { articleSlug } from "./blog";

import cycle from "../content/reads/cycle";
import nutrition from "../content/reads/nutrition";
import beauty from "../content/reads/beauty";
import yoga from "../content/reads/yoga";
import softLiving from "../content/reads/soft-living";
import sleep from "../content/reads/sleep";
import herbal from "../content/reads/herbal-wellness";
import journaling from "../content/reads/journaling";
import mental from "../content/reads/mental-wellness";
import cleanGirl from "../content/reads/clean-girl";
import lifestyle from "../content/reads/lifestyle";
import originals from "../content/reads/originals";

const BODIES: Partial<Record<Category, Record<string, string>>> = {
  "Cycle & Hormones": cycle,
  Nutrition: nutrition,
  Beauty: beauty,
  Yoga: yoga,
  "Soft Living": softLiving,
  Sleep: sleep,
  "Herbal Wellness": herbal,
  Journaling: journaling,
  "Mental Wellness": mental,
  "Clean Girl": cleanGirl,
  Lifestyle: lifestyle,
  "Bloomzein Originals": originals,
};

function bodyFor(a: Article): string | null {
  if (a.body) return a.body;
  return BODIES[a.category]?.[a.id] ?? null;
}

const escapeHtml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const escapeAttr = (s: string) =>
  escapeHtml(s).replace(/"/g, "&quot;");

/** Render one line's **bold** / *italic* to safe HTML. */
function inlineToHtml(text: string): string {
  const re = /(\*\*[^*]+\*\*|\*[^*]+\*)/g;
  let out = "", last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    if (m.index > last) out += escapeHtml(text.slice(last, m.index));
    const tok = m[0];
    if (tok.startsWith("**")) out += `<strong>${escapeHtml(tok.slice(2, -2))}</strong>`;
    else out += `<em>${escapeHtml(tok.slice(1, -1))}</em>`;
    last = m.index + tok.length;
  }
  if (last < text.length) out += escapeHtml(text.slice(last));
  return out;
}

/** Port of parseBlogBody (Content.tsx) → a static HTML string. */
function bodyToHtml(md: string): string {
  const lines = md.replace(/\r\n/g, "\n").split("\n");
  const out: string[] = [];
  let para: string[] = [];
  const flush = () => { if (para.length) { out.push(`<p>${inlineToHtml(para.join(" "))}</p>`); para = []; } };
  let i = 0, seenHeadline = false;
  while (i < lines.length) {
    const line = lines[i].trim();
    if (!line) { flush(); i++; continue; }
    if (line.startsWith("# ") && !line.startsWith("## ")) {
      flush();
      // Demote the body's editorial headline to h2 — the article title above is
      // the page's single <h1>.
      out.push(`<h2>${inlineToHtml(line.slice(2).trim())}</h2>`);
      seenHeadline = true;
      i++;
      let j = i;
      while (j < lines.length && !lines[j].trim()) j++;
      if (/^\*[^*].*\*$/.test(lines[j]?.trim() || "")) i = j + 1;
      continue;
    }
    if (line.startsWith("### ")) { flush(); out.push(`<h3>${inlineToHtml(line.slice(4).trim())}</h3>`); i++; continue; }
    if (line.startsWith("## ")) { flush(); out.push(`<h2>${inlineToHtml(line.slice(3).trim())}</h2>`); i++; continue; }
    if (line === "---") { flush(); out.push("<hr />"); i++; continue; }
    if (line.startsWith(">")) {
      flush();
      const buf: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith(">")) { buf.push(lines[i].trim().replace(/^>\s?/, "")); i++; }
      out.push(`<blockquote>${inlineToHtml(buf.join(" "))}</blockquote>`);
      continue;
    }
    if (/^[-*]\s+/.test(line)) {
      flush();
      const items: string[] = [];
      while (i < lines.length && /^[-*]\s+/.test(lines[i].trim())) { items.push(lines[i].trim().replace(/^[-*]\s+/, "")); i++; }
      out.push(`<ul>${items.map((it) => `<li>${inlineToHtml(it)}</li>`).join("")}</ul>`);
      continue;
    }
    if (!seenHeadline && /^\*[^*].*\*$/.test(line)) { i++; continue; }
    para.push(line);
    i++;
  }
  flush();
  return out.join("\n");
}

export type BlogPage = {
  /** URL path, e.g. /blog/what-is-the-menstrual-cycle */
  urlPath: string;
  /** File to write under dist, e.g. blog/what-is-the-menstrual-cycle/index.html */
  filePath: string;
  title: string;
  description: string;
  imagePath: string;   // site-relative, e.g. /images/read-CY001.webp
  category: string;
  /** Static article HTML injected into #root for crawlers. */
  contentHtml: string;
};

/** Every article as a prerenderable page (used by vite.config's plugin). */
export function blogPages(): BlogPage[] {
  return ARTICLES.map((a) => {
    const slug = articleSlug(a);
    const md = bodyFor(a);
    const image = a.image || CAT_IMG[a.category] || "/images/read-featured.webp";
    const article =
      `<article>` +
      `<p class="kicker">${escapeHtml(a.category)}</p>` +
      `<h1>${escapeHtml(a.title)}</h1>` +
      `<p class="excerpt">${escapeHtml(a.excerpt)}</p>` +
      `<img src="${escapeAttr(image)}" alt="${escapeAttr(a.title)}" width="1200" height="675" />` +
      (md ? bodyToHtml(md) : "") +
      `</article>`;
    return {
      urlPath: `/blog/${slug}`,
      filePath: `blog/${slug}/index.html`,
      title: a.title,
      description: a.excerpt,
      imagePath: image,
      category: a.category,
      contentHtml: article,
    };
  });
}

/** The /blog index: heading + a crawlable link list of every article. */
export function blogIndexPage(): BlogPage {
  const links = ARTICLES.map((a) => `<li><a href="/blog/${articleSlug(a)}">${escapeHtml(a.title)}</a></li>`).join("");
  return {
    urlPath: "/blog",
    filePath: "blog/index.html",
    title: "The Bloomzein Read — cycle, nutrition, beauty & mind",
    description: "Beautifully written reads on your cycle, hormones, nutrition, beauty, sleep, movement and mind — from the Bloomzein wellness library.",
    imagePath: "/images/read-featured.webp",
    category: "Read",
    contentHtml: `<main><h1>The Bloomzein Read</h1><ul>${links}</ul></main>`,
  };
}
