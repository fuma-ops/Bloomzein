import {
  Wallet,
  Flower,
  BookHeart,
  CalendarHeart,
  UtensilsCrossed,
  Notebook,
  Dumbbell,
  Apple,
  type LucideIcon,
} from "lucide-react";

export interface Tool {
  slug: string;
  label: string;
  icon: LucideIcon;
  blurb: string;
}

export const TOOLS: Tool[] = [
  { slug: "notes", label: "Notes & Reminders", icon: Notebook, blurb: "Scribble thoughts, set dreamy nudges." },
  { slug: "budget", label: "Budget Planner", icon: Wallet, blurb: "Plan your soft-girl spending." },
  { slug: "meals", label: "Meal Planner", icon: UtensilsCrossed, blurb: "Glow-up your week, plate by plate." },
  { slug: "diet", label: "Diet Tool", icon: Apple, blurb: "Nourish your bloom, one bite at a time." },
  { slug: "yoga", label: "Yoga Flows", icon: Flower, blurb: "Gentle flows for every mood." },
  { slug: "workout", label: "Workout Programs", icon: Dumbbell, blurb: "Move with strength, on your terms." },
  { slug: "diary", label: "Dreamy Diary", icon: BookHeart, blurb: "Your softest little journal." },
  { slug: "cycle", label: "Cycle Tracker", icon: CalendarHeart, blurb: "Bloom in sync with you." },
];