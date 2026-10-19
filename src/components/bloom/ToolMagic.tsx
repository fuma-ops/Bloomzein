// Picks the right "magic first" widget for each public /tools/<slug> page.
// Every tool shows something real and usable before asking for an account.
import { PublicCycleCalculator } from "./PublicCycleCalculator";
import { PublicCalorieCalculator } from "./PublicCalorieCalculator";
import { PublicBreathingOrb } from "./PublicBreathingOrb";
import { PublicBudgetCalculator } from "./PublicBudgetCalculator";
import { PublicMagicReveal } from "./PublicMagicReveal";

export function ToolMagic({ slug }: { slug: string }) {
  switch (slug) {
    case "cycle-tracker":
      return <PublicCycleCalculator />;
    case "diet-nutrition":
      return <PublicCalorieCalculator />;
    case "meditation-breathwork":
      return <PublicBreathingOrb />;
    case "budget-planner":
      return <PublicBudgetCalculator />;
    case "meal-planner":
    case "workout-programs":
    case "yoga":
    case "journal":
      return <PublicMagicReveal slug={slug} />;
    default:
      return null;
  }
}
