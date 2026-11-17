import { tr } from "@/i18n";
import { SparkleOnboarding, type SparkleStep, type SparkleContent } from "./SparkleOnboarding";

/* Cycle Tracker "Meet your cycle" onboarding — bright pink sparkle tour.
   Just content + step anchors; the whole experience lives in SparkleOnboarding. */

const CONTENT: SparkleContent = {
  eyebrow: "✦ your cycle ✦",
  titleLines: ["Meet your", "cycle"],
  subtitle: tr("A soft little tour of your phases, your calendar & your daily glow."),
  ctaLabel: "Show me my bloom",
  finaleLines: ["You're in sync,", "gorgeous"],
  finaleSubtitle: "Your bloom is ready. ✿",
};

const STEPS: SparkleStep[] = [
  { key: "phase",     selector: "[data-tour='phase']",     title: tr("Your cycle, at a glance"), desc: tr("This shows exactly where you are today — your phase, your day, your little journey.") },
  { key: "today",     selector: "[data-tour='today']",     title: tr("Today's little wisdom"),   desc: tr("Every day gets its own gentle insight, tuned to the phase you're in.") },
  { key: "calendar",  selector: "[data-tour='calendar']",  title: tr("Your month in bloom"),     desc: tr("Every day blooms into its phase colour — tap any day to peek at what's planned.") },
  { key: "checkin",   selector: "[data-tour='checkin']",   title: tr("Check in, beautifully"),   desc: tr("Log your mood & body on Today in a tap — Bloom quietly learns your rhythm.") },
  { key: "recommend", selector: "[data-tour='recommend']", title: tr("Matched to your phase"),   desc: tr("Yoga, workouts & meals, picked for exactly how you feel right now.") },
];

export function CycleOnboarding({ onDone }: { onDone: () => void }) {
  return <SparkleOnboarding steps={STEPS} content={CONTENT} onDone={onDone} />;
}
