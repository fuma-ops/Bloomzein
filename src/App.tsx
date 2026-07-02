import { useEffect, useState } from "react";
import Landing from "./pages/Landing";
import ToolsIndex from "./pages/app.tools.index";
import BudgetPage from "./pages/budget";
import YogaPage from "./pages/app.tools.yoga";
import MealsPage from "./pages/app.tools.meals";
import DietPage from "./pages/app.tools.diet";
import WorkoutPage from "./pages/app.tools.workout";
import TodayPage from "./pages/app.today";
import ReadPage from "./pages/app.read";
import ShopPage from "./pages/app.shop";
import MePage from "./pages/app.me";
import NotesPage from "./pages/app.tools.notes";
import CalendarPage from "./pages/app.calendar";
import DiaryPage from "./pages/app.tools.diary";
import { AppShell } from "./components/bloom/AppShell";
import { InstallPrompt } from "./components/bloom/InstallPrompt";
import { AuthProvider } from "./contexts/AuthContext";
import { AuthGate } from "./components/bloom/AuthGate";
import { ErrorBoundary } from "./components/bloom/ErrorBoundary";
import { ArrowLeft } from "lucide-react";
import { ComingSoonCard, PageHeader } from "./components/bloom/PageHeader";
import { TOOLS } from "./components/bloom/tools";
import { CycleTracker } from "./components/bloom/CycleTracker";
import { markToolVisited } from "./components/bloom/visitedTools";

function AppContent() {
  const [path, setPath] = useState(window.location.pathname);

  useEffect(() => {
    const handlePopState = () => setPath(window.location.pathname);
    window.addEventListener("popstate", handlePopState);
    
    // Intercept link clicks to enable SPA routing
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const link = target.closest("a");
      if (link && link.href) {
        const url = new URL(link.href);
        const isInternal = url.origin === window.location.origin;
        const isHash = url.hash !== "" && url.pathname === window.location.pathname;

        if (isInternal && !isHash) {
          e.preventDefault();
          const newPath = url.pathname;
          if (newPath !== window.location.pathname) {
            window.history.pushState({}, "", newPath);
            setPath(newPath);
            window.scrollTo(0, 0);
          }
        }
      }
    };
    window.addEventListener("click", handleClick);
    
    return () => {
      window.removeEventListener("popstate", handlePopState);
      window.removeEventListener("click", handleClick);
    };
  }, []);

  // Redirect /app or /app/ to /app/today
  useEffect(() => {
    if (path === "/app" || path === "/app/") {
      window.history.replaceState({}, "", "/app/today");
      setPath("/app/today");
    }
  }, [path]);

  // Track which tools the user has opened, so the Tools page can highlight what's still unexplored
  useEffect(() => {
    if (path === "/budget") {
      markToolVisited("budget");
    } else if (path.startsWith("/app/tools/") && path !== "/app/tools/") {
      markToolVisited(path.split("/").pop()!);
    }
  }, [path]);

  // Landing page remains standalone (no AppShell layout)
  if (path === "/" || path === "/index.html") {
    return <Landing />;
  }

  // Inside-App routes wrapped with the interactive Navigation Menu & Sidebar (AppShell)
  let content = null;

  if (path === "/app/today") {
    content = <TodayPage />;
  } else if (path === "/app/calendar") {
    content = <CalendarPage />;
  } else if (path === "/app/tools" || path === "/app/tools/") {
    content = <ToolsIndex />;
  } else if (path === "/app/read") {
    content = <ReadPage />;
  } else if (path === "/app/shop") {
    content = <ShopPage />;
  } else if (path === "/app/me") {
    content = <MePage />;
  } else if (path === "/app/tools/yoga") {
    content = <YogaPage />;
  } else if (path === "/app/tools/meals") {
    content = <MealsPage />;
  } else if (path === "/app/tools/diet") {
    content = <DietPage />;
  } else if (path === "/app/tools/workout") {
    content = <WorkoutPage />;
  } else if (path === "/app/tools/notes") {
    content = <NotesPage />;
  } else if (path === "/app/tools/diary") {
    content = <DiaryPage />;
  } else if (path === "/budget" || path === "/app/tools/budget") {
    content = <BudgetPage />;
  } else if (path === "/app/tools/cycle") {
    content = (
      <div className="animate-fade-in">
        <CycleTracker />
      </div>
    );
  } else if (path.startsWith("/app/tools/")) {
    const slug = path.split("/").pop();
    const tool = TOOLS.find((t) => t.slug === slug);
    if (tool) {
      const Icon = tool.icon;
      content = (
        <div className="animate-fade-in">
          <a href="/app/tools" className="mb-4 inline-flex items-center gap-1 text-sm text-[#831843] hover:text-[#EC4899] font-semibold">
            <ArrowLeft className="h-4 w-4" /> All tools
          </a>
          <PageHeader title={tool.label} emoji="✿">
            <span className="grid h-12 w-12 place-items-center rounded-full bg-[#EC4899] text-white shadow-md">
              <Icon className="h-5 w-5" />
            </span>
          </PageHeader>
          <ComingSoonCard />
        </div>
      );
    }
  }

  if (content) {
    // Today, Calendar, Tools and Me require an account — Shop and Read stay public for visibility/SEO
    const isProtected = path === "/app/today" || path === "/app/calendar" || path === "/app/me" || path.startsWith("/app/tools") || path === "/budget";
    return (
      <>
        <AppShell currentPath={path}>
          {/* key={path} resets the boundary on navigation so one bad page never traps the user */}
          <ErrorBoundary key={path}>
            {isProtected ? <AuthGate>{content}</AuthGate> : content}
          </ErrorBoundary>
        </AppShell>
        <InstallPrompt />
      </>
    );
  }

  // Fallback 404 screen
  return (
    <div className="min-h-screen bg-[#FFF0F6] flex flex-col items-center justify-center p-4 text-center">
      <h1 className="font-script text-4xl text-[#EC4899] mb-4">404 - Not Found</h1>
      <p className="text-[#831843] mb-6">Oops! We couldn't find this soft corner of our app.</p>
      <a href="/" className="px-6 py-2.5 bg-[#EC4899] text-white rounded-full font-semibold shadow-md shadow-[#EC4899]/30 transition hover:bg-[#DB2777]">
        Go Home
      </a>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
