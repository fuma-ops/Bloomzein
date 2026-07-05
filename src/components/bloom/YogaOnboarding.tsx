import { SparkleOnboarding, type SparkleStep, type SparkleContent } from "./SparkleOnboarding";

/* Yoga "Your soft week" onboarding — the shared bright pink sparkle tour.
   Content + step anchors only; each step switches to its tab first. */

const CONTENT: SparkleContent = {
  eyebrow: "✦ your yoga ✦",
  titleLines: ["Breathe,", "bloom, flow"],
  subtitle: "A soft little tour of your week, your flows & your library.",
  ctaLabel: "Show me around",
  finaleLines: ["You're centered,", "gorgeous"],
  finaleSubtitle: "Roll out your mat. ✿",
};

export type YogaTourTab = "plan" | "discover" | "library";

export function YogaOnboarding({ onDone, onTab }: {
  onDone: () => void;
  onTab: (t: YogaTourTab) => void;
}) {
  const steps: SparkleStep[] = [
    { key: "plan",     selector: "[data-tour='yg-tab-plan']",     onEnter: () => onTab("plan"),     title: "Your soft week",       desc: "My Plan is your week of flows, day by day — tap Edit to hand-pick each day's focus and length, then tap a day to begin." },
    { key: "discover", selector: "[data-tour='yg-tab-discover']", onEnter: () => onTab("discover"), title: "A flow for right now",  desc: "Discover suggests a practice matched to your mood and cycle phase — start in one tap." },
    { key: "library",  selector: "[data-tour='yg-tab-library']",  onEnter: () => onTab("library"),  title: "Every pose, gently",    desc: "The Library shows each pose with cues and modifications, at your level." },
  ];
  return <SparkleOnboarding steps={steps} content={CONTENT} onDone={onDone} />;
}
