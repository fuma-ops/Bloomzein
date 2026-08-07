import { useEffect } from "react";
import { Flower2, CalendarDays, LayoutGrid, BookOpen, ShoppingBag, User, Sparkles, type LucideIcon } from "lucide-react";
import { BloomLogo } from "./BloomLogo";
import { AppIcon } from "./AppIcon";
import { BloomBackground } from "./BloomBackground";
import { PaywallHost, PlusReturn } from "./premium/PremiumKit";
import { applyPhaseTheme, PHASE_THEME_UPDATED } from "@/lib/phaseTheme";
import { PLAN_UPDATED, usePremium } from "@/lib/entitlements";

interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  /** Coming-soon tab (Shop) — flagged with a soft "soon" hint. */
  soon?: boolean;
  /** Leads to the Bloom+ upgrade area — hinted with a sparkle for free users. */
  plus?: boolean;
}

// Grouped so the sidebar shows clean dividers: primary tools · shop · account.
const NAV_GROUPS: NavItem[][] = [
  [
    { to: "/app/today", label: "Today", icon: Flower2 },
    { to: "/app/calendar", label: "Calendar", icon: CalendarDays },
    { to: "/app/tools", label: "Tools", icon: LayoutGrid },
    { to: "/app/read", label: "Read", icon: BookOpen },
  ],
  [{ to: "/app/shop", label: "Shop", icon: ShoppingBag, soon: true }],
  [{ to: "/app/me", label: "Me", icon: User, plus: true }],
];
const NAV = NAV_GROUPS.flat();
// Mobile bottom bar stays uncrowded: 5 primary tabs (Shop lives in the sidebar).
const MOBILE_NAV = NAV.filter((n) => n.to !== "/app/shop");

const ACTIVE_TILE = "bg-gradient-to-br from-[#F9A8D4] via-[#EC4899] to-[#B76E79] text-white shadow-[0_8px_20px_-6px_rgba(236,72,153,0.7)]";
const IDLE_TILE = "bg-white text-[#EC4899] shadow-[0_4px_12px_-4px_rgba(236,72,153,0.35)]";

/** Small gold sparkle / "soon" markers that sit on an icon tile. */
function TileBadges({ item, free }: { item: NavItem; free: boolean }) {
  return (
    <>
      {item.soon && (
        <span className="absolute -top-1.5 -right-1.5 grid h-4 min-w-4 place-items-center rounded-full bg-amber-400 px-1 text-[7px] font-bold uppercase leading-none text-white shadow ring-2 ring-white">
          soon
        </span>
      )}
      {item.plus && free && (
        <span
          className="absolute -top-1.5 -right-1.5 grid h-4 w-4 place-items-center rounded-full text-white shadow ring-2 ring-white animate-icon-breathe"
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
  const free = !usePremium();

  // Living phase theme (Bloom+): tint the app to the current cycle phase.
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

  let idx = 0; // running index for entrance stagger across groups

  return (
    <div className="min-h-screen bg-background overflow-x-hidden relative">
      {/* Living phase theme (Bloom+): a soft ambient colour wash per cycle phase */}
      <div className="phase-wash pointer-events-none fixed inset-0 z-0" aria-hidden />
      <BloomBackground />

      {/* ── Desktop sidebar (lg+ only) — tablets & phones use the bottom nav ──── */}
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-60 flex-col justify-between border-r border-[#EC4899]/12 bg-white/55 p-4 backdrop-blur-xl lg:flex lg:w-60 shadow-[8px_0_40px_-24px_oklch(0.6_0.2_350/0.5)]">
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
            {NAV_GROUPS.map((group, gi) => (
              <div key={gi} className="flex flex-col gap-1.5">
                {gi > 0 && <div className="mx-2 my-1 border-t border-[#EC4899]/12" />}
                {group.map((item) => {
                  const active = isActive(item.to);
                  const Icon = item.icon;
                  const delay = idx++ * 55;
                  return (
                    <a
                      key={item.to}
                      href={item.to}
                      aria-label={item.label}
                      aria-current={active ? "page" : undefined}
                      style={{ animationDelay: `${delay}ms` }}
                      className={`group animate-fade-in relative flex items-center gap-3 rounded-[1.35rem] px-2 py-1.5 transition-all duration-200 hover:scale-[1.02] active:scale-[0.97] ${
                        active
                          ? "bg-white/70 backdrop-blur ring-1 ring-white/70 shadow-[0_12px_30px_-10px_rgba(236,72,153,0.55)] animate-selected-glow"
                          : "hover:bg-white/40"
                      }`}
                    >
                      {/* Icon tile — white by default, pink-gradient when active */}
                      <span className={`relative grid h-11 w-11 shrink-0 place-items-center rounded-[16px] transition-all duration-200 group-hover:scale-105 ${active ? ACTIVE_TILE : IDLE_TILE}`}>
                        <Icon className="h-[22px] w-[22px]" strokeWidth={active ? 2.4 : 2} />
                        <TileBadges item={item} free={free} />
                      </span>

                      {/* lg: inline label */}
                      <span className={`hidden lg:inline text-[15px] transition-colors ${active ? "font-bold text-hotpink" : "font-semibold text-[#831843]"}`}>
                        {item.label}
                      </span>
                      {item.soon && <span className="hidden lg:inline rounded-full bg-amber-100 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-amber-600">soon</span>}

                      {/* md (icon-only rail): floating tooltip on hover */}
                      <span className="lg:hidden pointer-events-none absolute left-full ml-3 z-30 whitespace-nowrap rounded-xl bg-[#831843] px-2.5 py-1 text-xs font-semibold text-white opacity-0 shadow-lg transition-all duration-150 -translate-x-1 group-hover:translate-x-0 group-hover:opacity-100">
                        {item.label}{item.soon ? " · soon" : ""}
                      </span>
                    </a>
                  );
                })}
              </div>
            ))}
          </nav>
        </div>
        <p className="hidden px-2 font-script text-sm text-[#831843] lg:block">stay soft, bloom on ✿</p>
      </aside>

      {/* ── Phone + Tablet Top App Bar (below lg) ────────────────────────────── */}
      <header className="fixed top-0 left-0 right-0 z-40 flex h-14 items-center justify-between border-b border-[#EC4899]/10 bg-white/85 px-4 py-2 backdrop-blur-xl lg:hidden">
        <div className="scale-90 origin-left">
          <BloomLogo />
        </div>
        <p className="font-script text-sm text-[#831843]">stay soft, bloom on ✿</p>
      </header>

      {/* ── Main container ───────────────────────────────────────────────────── */}
      <main className="min-h-screen pt-14 pb-28 lg:pt-0 lg:ml-60 lg:pb-10 overflow-x-hidden relative">
        <div className="mx-auto max-w-6xl px-3 py-3 sm:px-6 sm:py-5 lg:px-8 lg:py-6 min-w-0">
          {children}
        </div>
      </main>

      {/* App-wide Bloom+ paywall — opened from any gated action */}
      <PaywallHost />
      <PlusReturn />

      {/* ── Phone + Tablet bottom nav — a premium centred floating frosted pill,
             5 primary tabs (Shop lives in the desktop sidebar) ────────────────── */}
      <nav className="fixed bottom-3 left-1/2 z-50 flex w-[calc(100%-1.5rem)] max-w-md -translate-x-1/2 items-center justify-around rounded-[1.9rem] border border-white/70 bg-white/80 px-1.5 py-1.5 shadow-[0_22px_55px_-18px_oklch(0.55_0.2_350/0.65)] ring-1 ring-hotpink/10 backdrop-blur-2xl lg:hidden">
        {MOBILE_NAV.map((item, i) => {
          const active = isActive(item.to);
          const Icon = item.icon;
          return (
            <a
              key={item.to}
              href={item.to}
              aria-label={item.label}
              aria-current={active ? "page" : undefined}
              style={{ animationDelay: `${i * 45}ms` }}
              className="group animate-fade-in relative flex flex-1 flex-col items-center gap-1 py-1 transition active:scale-90"
            >
              <span
                className={`relative grid h-10 w-10 place-items-center rounded-[15px] transition-all duration-200 ${
                  active ? `-translate-y-1 ${ACTIVE_TILE} animate-selected-glow` : "text-[#EC4899] group-hover:scale-105"
                }`}
              >
                <Icon className="h-[22px] w-[22px]" strokeWidth={active ? 2.4 : 2} />
                <TileBadges item={item} free={free} />
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
