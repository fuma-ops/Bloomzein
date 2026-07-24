import { useEffect } from "react";
import { Sparkles } from "lucide-react";
import { BloomLogo } from "./BloomLogo";
import { AppIcon } from "./AppIcon";
import { BloomBackground } from "./BloomBackground";
import { BloomNavIcon, type NavSlug } from "./BloomNavIcon";
import { PaywallHost } from "./premium/PremiumKit";
import { applyPhaseTheme, PHASE_THEME_UPDATED } from "@/lib/phaseTheme";
import { PLAN_UPDATED, usePremium } from "@/lib/entitlements";

interface NavItem {
  to: string;
  label: string;
  slug: NavSlug;
  /** Coming-soon tab (Shop) — flagged with a soft "soon" hint. */
  soon?: boolean;
  /** Leads to the Bloom+ upgrade area — hinted with a sparkle for free users. */
  plus?: boolean;
}

const NAV: NavItem[] = [
  { to: "/app/today", label: "Today", slug: "today" },
  { to: "/app/calendar", label: "Calendar", slug: "calendar" },
  { to: "/app/tools", label: "Tools", slug: "tools" },
  { to: "/app/read", label: "Read", slug: "read" },
  { to: "/app/shop", label: "Shop", slug: "shop", soon: true },
  { to: "/app/me", label: "Me", slug: "me", plus: true },
];

// Mobile bottom bar stays uncrowded: 5 primary tabs (Shop lives in the sidebar
// and the Tools grid, so it's dropped here for bigger touch targets).
const MOBILE_NAV = NAV.filter((n) => n.slug !== "shop");

/** Small gold sparkle / "soon" markers that sit on an icon disc. */
function IconBadges({ item, free }: { item: NavItem; free: boolean }) {
  return (
    <>
      {item.soon && (
        <span className="absolute -top-1 -right-1 grid h-4 min-w-4 place-items-center rounded-full bg-amber-400 px-1 text-[7px] font-bold uppercase leading-none text-white shadow ring-2 ring-white">
          soon
        </span>
      )}
      {item.plus && free && (
        <span
          className="absolute -top-1 -right-1 grid h-4 w-4 place-items-center rounded-full text-white shadow ring-2 ring-white animate-icon-breathe"
          style={{ background: "linear-gradient(135deg,#F6D68B,#B76E79)" }}
        >
          <Sparkles className="h-2.5 w-2.5" strokeWidth={2.4} />
        </span>
      )}
    </>
  );
}

export function AppShell({ children, currentPath }: { children: React.ReactNode; currentPath: string }) {
  const isActive = (to: string) => currentPath === to || currentPath.startsWith(to + "/");
  const premium = usePremium();
  const free = !premium;

  // Living phase theme (Bloom+): tint the app to the current cycle phase.
  // Re-applies on route change + when plan / phase / setting changes.
  useEffect(() => {
    applyPhaseTheme();
    const r = () => applyPhaseTheme();
    window.addEventListener(PLAN_UPDATED, r);
    window.addEventListener(PHASE_THEME_UPDATED, r);
    window.addEventListener("storage", r);
    window.addEventListener("bloom:today-updated", r);
    return () => {
      window.removeEventListener(PLAN_UPDATED, r);
      window.removeEventListener(PHASE_THEME_UPDATED, r);
      window.removeEventListener("storage", r);
      window.removeEventListener("bloom:today-updated", r);
    };
  }, [currentPath]);

  return (
    <div className="min-h-screen bg-background overflow-x-hidden relative">
      {/* Living phase theme (Bloom+): a soft ambient colour wash per cycle phase */}
      <div className="phase-wash pointer-events-none fixed inset-0 z-0" aria-hidden />
      <BloomBackground />

      {/* ── Desktop / Tablet sidebar ─────────────────────────────────────────── */}
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-60 flex-col justify-between border-r border-[#EC4899]/12 bg-white/70 p-4 backdrop-blur-xl md:flex md:w-20 lg:w-60 shadow-[8px_0_40px_-24px_oklch(0.6_0.2_350/0.5)]">
        <div>
          <div className="mb-6 px-1">
            <div className="lg:block hidden"><BloomLogo /></div>
            <div className="lg:hidden flex justify-center">
              <a href="/" aria-label="Bloomzein home" className="transition hover:scale-105 active:scale-95">
                <AppIcon size={38} />
              </a>
            </div>
          </div>
          <nav className="flex flex-col gap-1.5">
            {NAV.map((item, i) => {
              const active = isActive(item.to);
              return (
                <a
                  key={item.to}
                  href={item.to}
                  aria-label={item.label}
                  aria-current={active ? "page" : undefined}
                  style={{ animationDelay: `${i * 55}ms` }}
                  className={`group animate-fade-in relative flex items-center gap-3 rounded-2xl px-2 py-1.5 transition-all duration-200 hover:scale-[1.02] active:scale-[0.97] ${
                    active
                      ? "bg-gradient-to-r from-[#EC4899]/14 via-[#B76E79]/8 to-transparent"
                      : "hover:bg-blush/50"
                  }`}
                >
                  {/* Icon disc — glossy icon pops on a white/gradient tile */}
                  <span
                    className={`relative grid h-11 w-11 shrink-0 place-items-center rounded-2xl transition-all duration-200 group-hover:scale-105 ${
                      active
                        ? "bg-white shadow-md ring-1 ring-[#EC4899]/25 animate-selected-glow"
                        : "bg-white/70 ring-1 ring-[#EC4899]/10"
                    }`}
                  >
                    <BloomNavIcon slug={item.slug} className={`transition-all duration-200 ${active ? "h-8 w-8" : "h-7 w-7 opacity-90 group-hover:opacity-100"}`} />
                    <IconBadges item={item} free={free} />
                  </span>

                  {/* lg: inline label */}
                  <span className={`hidden lg:inline text-sm font-semibold transition-colors ${active ? "text-hotpink" : "text-[#831843]"}`}>
                    {item.label}
                  </span>
                  {item.soon && <span className="hidden lg:inline rounded-full bg-amber-100 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-amber-600">soon</span>}

                  {/* md (icon-only rail): floating tooltip on hover */}
                  <span className="lg:hidden pointer-events-none absolute left-full ml-3 z-30 whitespace-nowrap rounded-xl bg-[#831843] px-2.5 py-1 text-xs font-semibold text-white opacity-0 shadow-lg transition-all duration-150 group-hover:opacity-100 group-hover:translate-x-0 -translate-x-1">
                    {item.label}{item.soon ? " · soon" : ""}
                  </span>
                </a>
              );
            })}
          </nav>
        </div>
        <p className="hidden px-2 font-script text-sm text-[#831843] lg:block">stay soft, bloom on ✿</p>
      </aside>

      {/* ── Mobile Top App Bar ───────────────────────────────────────────────── */}
      <header className="fixed top-0 left-0 right-0 z-40 flex h-14 items-center justify-between border-b border-[#EC4899]/10 bg-white/85 px-4 py-2 backdrop-blur-xl md:hidden">
        <div className="scale-90 origin-left">
          <BloomLogo />
        </div>
        <p className="font-script text-sm text-[#831843]">stay soft, bloom on ✿</p>
      </header>

      {/* ── Main container ───────────────────────────────────────────────────── */}
      <main className="min-h-screen pt-14 pb-28 md:pt-0 md:ml-20 md:pb-10 lg:ml-60 overflow-x-hidden relative">
        <div className="mx-auto max-w-6xl px-3 py-3 sm:px-6 sm:py-5 lg:px-8 lg:py-6 min-w-0">
          {children}
        </div>
      </main>

      {/* App-wide Bloom+ paywall — opened from any gated action */}
      <PaywallHost />

      {/* ── Mobile bottom nav — floating frosted pill, 5 primary tabs ─────────── */}
      <nav className="fixed inset-x-3 bottom-3 z-50 flex items-center justify-around rounded-[1.75rem] border border-white/60 bg-white/85 px-1.5 py-1.5 shadow-[0_18px_45px_-18px_oklch(0.55_0.2_350/0.6)] backdrop-blur-xl md:hidden">
        {MOBILE_NAV.map((item, i) => {
          const active = isActive(item.to);
          return (
            <a
              key={item.to}
              href={item.to}
              aria-label={item.label}
              aria-current={active ? "page" : undefined}
              style={{ animationDelay: `${i * 45}ms` }}
              className="group animate-fade-in relative flex flex-1 flex-col items-center gap-0.5 py-1 transition active:scale-90"
            >
              <span
                className={`relative grid h-10 w-10 place-items-center rounded-2xl transition-all duration-200 ${
                  active
                    ? "-translate-y-1 bg-gradient-to-br from-white to-[#FFE4F1] shadow-md ring-1 ring-[#EC4899]/25 animate-selected-glow"
                    : "group-hover:scale-105"
                }`}
              >
                <BloomNavIcon slug={item.slug} className={`transition-all duration-200 ${active ? "h-8 w-8" : "h-7 w-7 opacity-80 group-active:opacity-100"}`} />
                <IconBadges item={item} free={free} />
              </span>
              <span className={`text-[10px] leading-none transition-colors ${active ? "font-bold text-hotpink" : "font-semibold text-[#831843]/75"}`}>
                {item.label}
              </span>
            </a>
          );
        })}
      </nav>
    </div>
  );
}
