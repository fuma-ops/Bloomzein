// App translations. English is the source: tr("Today") returns the French or
// Arabic text for the chosen site language (src/lib/siteLang.ts), or the English
// string when no translation exists. The dictionary is loaded in main.tsx BEFORE
// the app modules are imported, so tr() also works at module level (data arrays).
// Changing language reloads the page (setSiteLang), so nothing has to re-render.
import { getSiteLang, type SiteLang } from "@/lib/siteLang";

export const LANG: SiteLang = getSiteLang();
export const RTL = LANG === "ar";
/** Locale for dates (Arabic month/day names with Latin digits, as used in Morocco). */
export const DATE_LOCALE = LANG === "fr" ? "fr-FR" : LANG === "ar" ? "ar-MA-u-nu-latn" : "en-US";
let dict: Record<string, string> = {};
const cap = (x: string) => x.charAt(0).toUpperCase() + x.slice(1);
/** Month names in the site language. English keeps the given list unchanged. */
export function localMonths(en: readonly string[], style: "long" | "short"): string[] {
  if (LANG === "en") return [...en];
  const f = new Intl.DateTimeFormat(DATE_LOCALE, { month: style });
  return Array.from({ length: 12 }, (_, m) => cap(f.format(new Date(2026, m, 1))));
}
/** Weekday labels in the site language, same order as `en` (Sunday- or Monday-first). */
export function localWeekdays(en: readonly string[], style: "narrow" | "short", mondayFirst = false): string[] {
  if (LANG === "en") return [...en];
  const f = new Intl.DateTimeFormat(DATE_LOCALE, { weekday: style });
  // 2026-11-01 is a Sunday.
  return Array.from({ length: 7 }, (_, i) => cap(f.format(new Date(2026, 10, 1 + (mondayFirst ? (i + 1) % 7 : i)))));
}


const norm = (s: string) => s.replace(/\s+/g, " ").trim();

/** Translate an English UI string. `{name}` placeholders are filled from `vars`. */
export function tr(en: string, vars?: Record<string, string | number>): string {
  let out = LANG === "en" ? en : dict[en] ?? dict[norm(en)] ?? en;
  // Inserted values are translated too when they are known UI words (e.g. a phase name).
  if (vars) for (const k in vars) { const v = vars[k]; const sv = typeof v === "string" && LANG !== "en" ? dict[v] ?? v : String(v); out = out.split(`{${k}}`).join(sv); }
  return out;
}

/** Loads the dictionary and sets <html lang/dir> + Arabic fonts. Call before importing App. */
export async function loadI18n(): Promise<void> {
  const html = document.documentElement;
  html.lang = LANG;
  html.dir = RTL ? "rtl" : "ltr";
  if (LANG === "en") return;
  try {
    dict = LANG === "fr" ? (await import("./fr")).default : (await import("./ar")).default;
  } catch { dict = {}; }
  if (RTL && !document.getElementById("bz-ar-fonts")) {
    const l = document.createElement("link");
    l.id = "bz-ar-fonts"; l.rel = "stylesheet";
    l.href = "https://fonts.googleapis.com/css2?family=Amiri:wght@700&family=Aref+Ruqaa:wght@700&family=Tajawal:wght@400;500;700;800&display=swap";
    document.head.appendChild(l);
  }
}

/** Translate a value rendered from data ({item.label}); non-strings pass through unchanged. */
export function trx<T>(v: T): T {
  return (typeof v === "string" && LANG !== "en" ? (tr(v) as unknown as T) : v);
}
