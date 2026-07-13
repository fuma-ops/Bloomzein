import { useEffect } from "react";
import { Sun, CalendarDays, LayoutGrid, BookOpen, ShoppingBag, User, type LucideIcon } from "lucide-react";
import { BloomLogo } from "./BloomLogo";
import { AppIcon } from "./AppIcon";
import { BloomBackground } from "./BloomBackground";
import { PaywallHost } from "./premium/PremiumKit";
import { PeriodConfirm } from "./cycle/PeriodConfirm";
import { applyPhaseTheme, PHASE_THEME_UPDATED } from "@/lib/phaseTheme";
import { PLAN_UPDATED } from "@/lib/entitlements";

interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
}

const NAV: NavItem[] = [
  { to: "/app/today", label: "Today", icon: Sun },
  { to: "/app/calendar", label: "Calendar", icon: CalendarDays },
  { to: "/app/tools", label: "Tools", icon: LayoutGrid },
  { to: "/app/read", label: "Read", icon: BookOpen },
  { to: "/app/shop", label: "Shop", icon: ShoppingBag },
  { to: "/app/me", label: "Me", icon: User },
];

export function AppShell({ children, currentPath }: { children: React.ReactNode; currentPath: string }) {
  const isActive = (to: string) => currentPath === to || currentPath.startsWith(to + "/");

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
      <BloomBackground />

      {/* Desktop / Tablet sidebar */}
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-60 flex-col justify-between border-r border-[#EC4899]/15 bg-white/70 p-5 backdrop-blur md:flex md:w-20 lg:w-60">
        <div>
          <div className="mb-8 px-1">
            <div className="lg:block hidden"><BloomLogo /></div>
            <div className="lg:hidden">
              <a href="/" aria-label="Bloomzein home">
                <AppIcon size={38} />
              </a>
            </div>
          </div>
          <nav className="flex flex-col gap-1">
            {NAV.map((item) => {
              const active = isActive(item.to);
              return (
                <a
                  key={item.to}
                  href={item.to}
                  className={`flex items-center gap-3 rounded-full px-3 py-2.5 text-sm font-semibold transition ${
                    active
                      ? "bg-[#EC4899] text-white shadow-md shadow-[#EC4899]/30"
                      : "text-[#831843] hover:bg-blush"
                  }`}
                >
                  <item.icon className="h-5 w-5 shrink-0" />
                  <span className="hidden lg:inline">{item.label}</span>
                </a>
              );
            })}
          </nav>
        </div>
        <p className="hidden px-2 font-script text-sm text-[#831843] lg:block">stay soft, bloom on ✿</p>
      </aside>

      {/* Mobile Top App Bar */}
      <header className="fixed top-0 left-0 right-0 z-40 flex h-14 items-center justify-between border-b border-[#EC4899]/10 bg-white/85 px-4 py-2 backdrop-blur md:hidden">
        <div className="scale-90 origin-left">
          <BloomLogo />
        </div>
        <p className="font-script text-sm text-[#831843]">stay soft, bloom on ✿</p>
      </header>

      {/* Main container */}
      <main className="min-h-screen pt-14 pb-24 md:pt-0 md:ml-20 md:pb-10 lg:ml-60 overflow-x-hidden relative">
        <div className="mx-auto max-w-6xl px-3 py-3 sm:px-6 sm:py-5 lg:px-8 lg:py-6 min-w-0">
          {children}
        </div>
      </main>

      {/* App-wide Bloom+ paywall — opened from any gated action */}
      <PaywallHost />

      {/* App-wide period-start confirmation — when her period is due/overdue we ask
          "did it start today?" on ANY page, not only Today/Cycle, so she can't miss it */}
      <PeriodConfirm />

      {/* Mobile bottom nav */}
      <nav className="fixed inset-x-3 bottom-3 z-50 flex items-center justify-around rounded-full border border-[#EC4899]/15 bg-white/95 px-2 py-2 shadow-xl shadow-rose/20 backdrop-blur md:hidden">
        {NAV.map((item) => {
          const active = isActive(item.to);
          return (
            <a
              key={item.to}
              href={item.to}
              className={`flex flex-col items-center gap-0.5 rounded-full px-3 py-1.5 text-[10px] font-semibold transition ${
                active ? "bg-[#EC4899] text-white" : "text-[#831843]"
              }`}
            >
              <item.icon className="h-5 w-5" />
              <span>{item.label}</span>
            </a>
          );
        })}
      </nav>
    </div>
  );
}
