import { SparkleOnboarding, type SparkleStep, type SparkleContent } from "./SparkleOnboarding";

/* Workout "Move with your body" onboarding — the shared bright pink sparkle
   tour. Content + step anchors only; the whole experience lives in
   SparkleOnboarding. Each step switches to its tab before spotlighting it. */

const CONTENT: SparkleContent = {
  eyebrow: "✦ your training ✦",
  titleLines: ["Move with", "your body"],
  subtitle: "A soft little tour of your plan, sessions, programs & moves.",
  ctaLabel: "Show me around",
  finaleLines: ["You're ready,", "gorgeous"],
  finaleSubtitle: "Let's get moving. ✿",
};

export type WorkoutTourTab = "program" | "discover" | "programs" | "library";

export function WorkoutOnboarding({ onDone, onTab }: {
  onDone: () => void;
  onTab: (t: WorkoutTourTab) => void;
}) {
  const steps: SparkleStep[] = [
    { key: "plan",     selector: "[data-tour='wk-tab-program']",  onEnter: () => onTab("program"),  title: "Your week, your way", desc: "My Plan is your training week, day by day — tap any session to start it. Follow a program, auto-generate, or build your own." },
    { key: "discover", selector: "[data-tour='wk-tab-discover']", onEnter: () => onTab("discover"), title: "A session, right now",  desc: "Discover gives you a one-off workout matched to today's energy and your cycle phase." },
    { key: "programs", selector: "[data-tour='wk-tab-programs']", onEnter: () => onTab("programs"), title: "Guided journeys",       desc: "Programs are multi-week plans that build toward a goal, spread smartly across your week." },
    { key: "library",  selector: "[data-tour='wk-tab-library']",  onEnter: () => onTab("library"),  title: "Every move, explained", desc: "The Library shows each exercise with form cues and the mistake to avoid." },
  ];
  return <SparkleOnboarding steps={steps} content={CONTENT} onDone={onDone} />;
}
