import {
  Wallet,
  Flower,
  BookHeart,
  CalendarHeart,
  CalendarDays,
  UtensilsCrossed,
  Notebook,
  type LucideIcon,
} from "lucide-react";

export interface Tool {
  slug: string;
  label: string;
  icon: LucideIcon;
  blurb: string;
}

export const TOOLS: Tool[] = [
  { slug: "calendar", label: "Bloom Calendar", icon: CalendarDays, blurb: "Your whole soft life, in one glance." },
  { slug: "notes", label: "Notes & Reminders", icon: Notebook, blurb: "Scribble thoughts, set dreamy nudges." },
  { slug: "budget", label: "Budget Planner", icon: Wallet, blurb: "Plan your soft-girl spending." },
  { slug: "meals", label: "Meal Planner", icon: UtensilsCrossed, blurb: "Glow-up your week, plate by plate." },
  { slug: "yoga", label: "Yoga Flows", icon: Flower, blurb: "Gentle flows for every mood." },
  { slug: "diary", label: "Dreamy Diary", icon: BookHeart, blurb: "Your softest little journal." },
  { slug: "cycle", label: "Cycle Tracker", icon: CalendarHeart, blurb: "Bloom in sync with you." },
];