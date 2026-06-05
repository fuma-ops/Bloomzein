import {
  Wallet,
  Flower,
  Footprints,
  BookHeart,
  CalendarHeart,
  Newspaper,
  UtensilsCrossed,
  type LucideIcon,
} from "lucide-react";

export interface Tool {
  slug: string;
  label: string;
  icon: LucideIcon;
  blurb: string;
}

export const TOOLS: Tool[] = [
  { slug: "budget", label: "Budget Planner", icon: Wallet, blurb: "Plan your soft-girl spending." },
  { slug: "meals", label: "Meal Planner", icon: UtensilsCrossed, blurb: "Glow-up your week, plate by plate." },
  { slug: "yoga", label: "Yoga Flows", icon: Flower, blurb: "Gentle flows for every mood." },
  { slug: "steps", label: "Steps Tracker", icon: Footprints, blurb: "Walk it out, queen." },
  { slug: "diary", label: "Dreamy Diary", icon: BookHeart, blurb: "Your softest little journal." },
  { slug: "cycle", label: "Cycle Tracker", icon: CalendarHeart, blurb: "Bloom in sync with you." },
  { slug: "blog", label: "Bloom Blog", icon: Newspaper, blurb: "Feel-good reads, daily." },
];