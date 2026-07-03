import { SparkleOnboarding, type SparkleStep, type SparkleContent } from "./SparkleOnboarding";

/* Cycle Tracker "Meet your cycle" onboarding — bright pink sparkle tour.
   Just content + step anchors; the whole experience lives in SparkleOnboarding. */

const CONTENT: SparkleContent = {
  eyebrow: "✦ your cycle ✦",
  titleLines: ["Meet your", "cycle"],
  subtitle: "A soft little tour of your phases, your calendar & your daily glow.",
  ctaLabel: "Show me my bloom",
  finaleLines: ["You're in sync,", "gorgeous"],
  finaleSubtitle: "Your bloom is ready. ✿",
};

const STEPS: SparkleStep[] = [
  { key: "phase",     selector: "[data-tour='phase']",     title: "Your cycle, at a glance", desc: "This shows exactly where you are today — your phase, your day, your little journey." },
  { key: "today",     selector: "[data-tour='today']",     title: "Today's little wisdom",   desc: "Every day gets its own gentle insight, tuned to the phase you're in." },
  { key: "calendar",  selector: "[data-tour='calendar']",  title: "Your month in bloom",     desc: "Each day is softly coloured by its phase. Tap any day to peek inside." },
  { key: "checkin",   selector: "[data-tour='checkin']",   title: "Check in, beautifully",   desc: "Log your mood & symptoms in a tap — Bloom quietly learns your rhythm." },
  { key: "recommend", selector: "[data-tour='recommend']", title: "Matched to your phase",   desc: "Yoga, workouts & meals, picked for exactly how you feel right now." },
];

export function CycleOnboarding({ onDone }: { onDone: () => void }) {
  return <SparkleOnboarding steps={STEPS} content={CONTENT} onDone={onDone} />;
}
