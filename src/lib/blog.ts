/**
 * Public blog — SEO layer over the Read library.
 *
 * The article catalogue (`ARTICLES` in readsData) powers BOTH the in-app Read
 * experience (behind /app/, blocked from crawlers) AND the public blog at
 * /blog/<slug> (crawlable + in the sitemap). This module is the single source
 * of the slug ↔ article mapping so the routes, the blog pages and the sitemap
 * generator all agree.
 *
 * Slugs are derived from the title (stable, human-readable URLs) with a
 * uniqueness guard, computed once over ARTICLES in catalogue order.
 *
 * IMPORTANT: keep this module free of asset/React imports — vite.config.ts
 * imports it at build time to emit sitemap.xml.
 */
import { ARTICLES, articleById, type Article } from "./readsData";

/** title → url slug (ascii, lowercase, hyphenated). */
export function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9\s-]/g, " ")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "") || "article";
}

// Build the slug maps once, in catalogue order, deduping collisions so every
// article gets a unique, stable URL.
const _slugById = new Map<string, string>();
const _idBySlug = new Map<string, string>();
{
  const used = new Set<string>();
  for (const a of ARTICLES) {
    const base = slugify(a.title);
    let slug = base;
    let n = 2;
    while (used.has(slug)) slug = `${base}-${n++}`;
    used.add(slug);
    _slugById.set(a.id, slug);
    _idBySlug.set(slug, a.id);
  }
}

/** The public URL slug for an article. */
export function articleSlug(a: Article): string {
  return _slugById.get(a.id) ?? slugify(a.title);
}

/** Resolve a blog slug back to its article (undefined if unknown). */
export function articleBySlug(slug: string): Article | undefined {
  const id = _idBySlug.get(slug);
  return id ? articleById(id) : undefined;
}

/** Every public blog path — consumed by the sitemap generator. */
export function blogPaths(): string[] {
  return ARTICLES.map((a) => `/blog/${articleSlug(a)}`);
}
