/**
 * Build-time aggregator of every long-form article body.
 *
 * The live app deliberately code-splits bodies per category (see registry.ts)
 * so the client never downloads the whole 180+ library at once. This module is
 * the opposite on purpose: it eagerly merges every category map into one
 * `Record<articleId, markdown>` for the BUILD ONLY. It is imported solely by
 * prerender.ts (via vite.config.ts) to bake article text into static HTML — it
 * is never imported by any client component, so it never enters the app bundle.
 */
import cycle from "./cycle";
import nutrition from "./nutrition";
import beauty from "./beauty";
import yoga from "./yoga";
import softLiving from "./soft-living";
import sleep from "./sleep";
import herbalWellness from "./herbal-wellness";
import journaling from "./journaling";
import mentalWellness from "./mental-wellness";
import cleanGirl from "./clean-girl";
import lifestyle from "./lifestyle";
import originals from "./originals";

export const ALL_BODIES: Record<string, string> = {
  ...cycle,
  ...nutrition,
  ...beauty,
  ...yoga,
  ...softLiving,
  ...sleep,
  ...herbalWellness,
  ...journaling,
  ...mentalWellness,
  ...cleanGirl,
  ...lifestyle,
  ...originals,
};
