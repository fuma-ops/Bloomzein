import { useEffect, useRef, useState } from "react";
import { Globe, Check } from "lucide-react";
import { SITE_LANGS, SITE_LANG_LABEL, SITE_LANG_SHORT, getSiteLang, localizedPath, setSiteLang, type SiteLang } from "@/lib/siteLang";

/** 🌐 language picker (EN / Français / العربية) — used on every page. */
export function LanguageButton({ className = "", compact = false, current }: { className?: string; compact?: boolean; current?: SiteLang }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const lang = current ?? getSiteLang();
  // Public page that only exists in English for now (help, pricing, legal…): say so.
  const path = typeof window !== "undefined" ? window.location.pathname : "/";
  const englishOnly = !path.startsWith("/app") && !path.startsWith("/onboarding") && localizedPath(path, "fr") === null;
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);
  return (
    <div ref={ref} className={`relative ${className}`}>
      <button type="button" onClick={() => setOpen((v) => !v)} aria-haspopup="listbox" aria-expanded={open} aria-label="Language / Langue / اللغة"
        className="inline-flex h-10 items-center gap-1.5 rounded-full border-2 border-[#F9A8D4] bg-white/75 px-3 text-[13px] font-extrabold text-[#E6007E] backdrop-blur transition hover:scale-105 hover:shadow-md active:scale-95">
        <Globe className="h-4 w-4" />
        {!compact && <span>{SITE_LANG_SHORT[lang]}</span>}
      </button>
      {open && (
        <ul role="listbox" className="absolute end-0 z-50 mt-2 min-w-[9.5rem] overflow-hidden rounded-2xl border border-white bg-white/95 p-1.5 shadow-xl backdrop-blur animate-scale-in">
          {SITE_LANGS.map((l) => (
            <li key={l}>
              <button type="button" role="option" aria-selected={l === lang} dir={l === "ar" ? "rtl" : "ltr"}
                onClick={() => { setOpen(false); if (l !== lang) setSiteLang(l); }}
                className={`flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2 text-sm font-bold transition active:scale-95 ${l === lang ? "bg-[#FDE7F2] text-[#E6007E]" : "text-[#7A1440] hover:bg-[#FFF0F6]"}`}>
                {SITE_LANG_LABEL[l]}
                {l === lang && <Check className="h-4 w-4" />}
              </button>
            </li>
          ))}
          {englishOnly && (
            <li className="mt-1 border-t border-[#FDE7F2] px-3 pb-1 pt-2 text-[11px] font-semibold leading-snug text-[#A2657F]">
              {lang === "ar" ? "هذه الصفحة بالإنجليزية حاليا." : lang === "fr" ? "Cette page n'existe qu'en anglais pour l'instant." : "This page is in English only for now."}
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
