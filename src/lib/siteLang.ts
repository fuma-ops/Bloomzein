// Site language (EN / FR / AR) — one source of truth for the language button.
// Priority: URL prefix (/fr, /ar, /fr/tools/…, /ar/tools/…) → saved choice
// (localStorage "bloom:lang") → English. Arabic pages are RTL.
import { toolPageUrl } from "@/lib/toolPages";

export type SiteLang = "en" | "fr" | "ar";
export const SITE_LANGS: SiteLang[] = ["en", "fr", "ar"];
export const SITE_LANG_LABEL: Record<SiteLang, string> = { en: "English", fr: "Français", ar: "العربية" };
export const SITE_LANG_SHORT: Record<SiteLang, string> = { en: "EN", fr: "FR", ar: "ع" };
const KEY = "bloom:lang";

export function langFromPath(path: string): SiteLang | null {
  const m = path.match(/^\/(fr|ar)(?:\/|$)/);
  return m ? (m[1] as SiteLang) : null;
}

export function getSiteLang(path: string = typeof window !== "undefined" ? window.location.pathname : "/"): SiteLang {
  const fromUrl = langFromPath(path);
  if (fromUrl) return fromUrl;
  try {
    const v = localStorage.getItem(KEY);
    if (v === "en" || v === "fr" || v === "ar") return v;
  } catch { /* storage blocked */ }
  return "en";
}

/** Where the current page lives in another language (null = no translated version). */
export function localizedPath(path: string, lang: SiteLang): string | null {
  const tool = path.match(/^\/(?:(?:fr|ar)\/)?tools\/([^/]+)\/?$/);
  if (tool) return toolPageUrl(decodeURIComponent(tool[1]), lang);
  if (path === "/" || path === "/fr" || path === "/ar" || path === "/fr/" || path === "/ar/") return lang === "en" ? "/" : `/${lang}`;
  return null;
}

/** Saves the choice, then opens the translated page (or reloads the current one). */
export function setSiteLang(lang: SiteLang) {
  try { localStorage.setItem(KEY, lang); } catch { /* storage blocked */ }
  const path = window.location.pathname;
  const target = localizedPath(path, lang);
  if (target && target !== path) window.location.assign(target + window.location.search + window.location.hash);
  else window.location.reload();
}
