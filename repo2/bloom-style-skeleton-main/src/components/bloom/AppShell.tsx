import { Link, Outlet, useRouterState } from "@tanstack/react-router";
import { Sun, LayoutGrid, BookOpen, ShoppingBag, User, type LucideIcon } from "lucide-react";
import { BloomLogo } from "./BloomLogo";
import { BloomBackground } from "./BloomBackground";

interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
}

const NAV: NavItem[] = [
  { to: "/app/today", label: "Today", icon: Sun },
  { to: "/app/tools", label: "Tools", icon: LayoutGrid },
  { to: "/app/read", label: "Read", icon: BookOpen },
  { to: "/app/shop", label: "Shop", icon: ShoppingBag },
  { to: "/app/me", label: "Me", icon: User },
];

export function AppShell() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isActive = (to: string) => pathname === to || pathname.startsWith(to + "/");

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      <BloomBackground />

      {/* Desktop / Tablet sidebar */}
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-60 flex-col justify-between border-r border-petal/60 bg-white/70 p-5 backdrop-blur md:flex md:w-20 lg:w-60">
        <div>
          <div className="mb-8 px-1">
            <div className="lg:block hidden"><BloomLogo /></div>
            <div className="lg:hidden grid h-10 w-10 place-items-center rounded-full bg-blush text-hotpink">
              <Link to="/" aria-label="Bloom home">
                <span className="font-script text-2xl">B</span>
              </Link>
            </div>
          </div>
          <nav className="flex flex-col gap-1">
            {NAV.map((item) => {
              const active = isActive(item.to);
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={[
                    "flex items-center gap-3 rounded-full px-3 py-2.5 text-sm font-semibold transition",
                    active
                      ? "bg-hotpink text-white shadow-md shadow-hotpink/30"
                      : "text-rose hover:bg-blush",
                  ].join(" ")}
                >
                  <item.icon className="h-5 w-5 shrink-0" />
                  <span className="hidden lg:inline">{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>
        <p className="hidden px-2 font-script text-sm text-rose lg:block">stay soft, bloom on 🌸</p>
      </aside>

      {/* Main */}
      <main className="min-h-screen pb-24 md:ml-20 md:pb-10 lg:ml-60 overflow-x-hidden">
        <div className="mx-auto max-w-6xl px-3 py-3 sm:px-6 sm:py-5 lg:px-8 lg:py-6 min-w-0">
          <Outlet />
        </div>
      </main>

      {/* Mobile bottom nav */}
      <nav className="fixed inset-x-3 bottom-3 z-30 flex items-center justify-around rounded-full border border-petal/60 bg-white/95 px-2 py-2 shadow-xl shadow-rose/20 backdrop-blur md:hidden">
        {NAV.map((item) => {
          const active = isActive(item.to);
          return (
            <Link
              key={item.to}
              to={item.to}
              className={[
                "flex flex-col items-center gap-0.5 rounded-full px-3 py-1.5 text-[10px] font-semibold transition",
                active ? "bg-hotpink text-white" : "text-rose",
              ].join(" ")}
            >
              <item.icon className="h-5 w-5" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}