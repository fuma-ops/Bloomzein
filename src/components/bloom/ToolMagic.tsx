// Picks the right "magic first" widget for each public /tools/<slug> page.
// Every tool shows something real and usable before asking for an account.
import { PublicCycleCalculator } from "./PublicCycleCalculator";
import { PublicCalorieCalculator } from "./PublicCalorieCalculator";
import { PublicBreathingOrb } from "./PublicBreathingOrb";
import { PublicBudgetCalculator } from "./PublicBudgetCalculator";
import { PublicMagicReveal } from "./PublicMagicReveal";
import type { ToolLang } from "@/lib/toolPagesI18n";

export function ToolMagic({ slug, lang = "en" }: { slug: string; lang?: ToolLang }) {
  switch (slug) {
    case "cycle-tracker":
      return <PublicCycleCalculator lang={lang} />;
    case "diet-nutrition":
      return <PublicCalorieCalculator lang={lang} />;
    case "meditation-breathwork":
      return <PublicBreathingOrb lang={lang} />;
    case "budget-planner":
      return <PublicBudgetCalculator lang={lang} />;
    case "meal-planner":
    case "workout-programs":
    case "yoga":
    case "journal":
      return <PublicMagicReveal slug={slug} lang={lang} />;
    default:
      return null;
  }
}
