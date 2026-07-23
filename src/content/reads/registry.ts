/**
 * Lazy loader for long-form article bodies.
 *
 * Bodies are grouped into one module per category and code-split by Vite, so a
 * reader only downloads the category they open — the 180+ article library never
 * enters the main bundle. Short legacy reads carry their body inline on the
 * catalogue entry; `loadArticleBody` returns that immediately when present.
 *
 * To add a category's content: create `src/content/reads/<slug>.ts` exporting a
 * default `Record<articleId, markdownBody>` and register its loader below.
 */
import type { Article, Category } from "@/lib/readsData";

type BodyMap = Record<string, string>;
type Loader = () => Promise<{ default: BodyMap }>;

/** Only categories that already have a content chunk are listed. */
const LOADERS: Partial<Record<Category, Loader>> = {
  "Cycle & Hormones": () => import("./cycle"),
  Beauty: () => import("./beauty"),
  Yoga: () => import("./yoga"),
  "Soft Living": () => import("./soft-living"),
  Sleep: () => import("./sleep"),
  "Herbal Wellness": () => import("./herbal-wellness"),
  Journaling: () => import("./journaling"),
  "Bloomzein Originals": () => import("./originals"),
};

const cache = new Map<Category, BodyMap>();

/**
 * Resolve an article's body. Returns the inline body for legacy reads, the
 * lazily-imported markdown for long-form reads, or `null` if none exists yet.
 */
export async function loadArticleBody(article: Article): Promise<string | null> {
  if (article.body) return article.body;
  const cached = cache.get(article.category);
  if (cached) return cached[article.id] ?? null;
  const loader = LOADERS[article.category];
  if (!loader) return null;
  try {
    const mod = await loader();
    cache.set(article.category, mod.default);
    return mod.default[article.id] ?? null;
  } catch {
    return null;
  }
}
