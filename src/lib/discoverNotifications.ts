// =============================================================================
// BLOOMZEIN — "discover your tools" notifications (one-shot, for new users)
// -----------------------------------------------------------------------------
// Seeds a set of catchy, curious notifications that introduce the tools a new
// user hasn't explored yet (yoga, workout, diet, budget, reminders, journaling),
// each with a real photo and a deep-link. Tapping one (in the NotificationBell)
// opens the tool and marks that notification as viewed (greyed), so unseen ones
// stay highlighted. Seeded once per device, only after onboarding.
// =============================================================================
import { isOnboarded } from "./guidedSetup";
import { addNotifications } from "./notificationsStore";
import type { NotifyOptions } from "./notify";

const SEEDED_KEY = "bloom:discover-seeded";

// Curiosity-first copy: introduce the feature AND make her want to tap.
const DISCOVER: NotifyOptions[] = [
  {
    title: "Flows that match your phase 🧘‍♀️",
    body: "Did you know your body wants different movement each week? Discover cycle-synced yoga.",
    href: "/app/tools/yoga", image: "/images/flagship-yoga.webp", tone: "bloom",
  },
  {
    title: "Train with your energy, not against it 💪",
    body: "Your strength rises and dips across your cycle — see workouts built around it.",
    href: "/app/tools/workout", image: "/images/flagship-workout.webp", tone: "bloom",
  },
  {
    title: "Your real numbers, finally 🍽️",
    body: "Calories & macros that flex with your phase and training. Curious what yours are?",
    href: "/app/tools/diet", image: "/images/grid-diet.webp", tone: "success",
  },
  {
    title: "Pretty budgeting that actually works 💸",
    body: "Track your money the soft-girl way — goals, insights and a calmer wallet.",
    href: "/budget", image: "/images/read-money.webp", tone: "reminder",
  },
  {
    title: "Never drop a thing 🔔",
    body: "Gentle nudges for water, meds, movement and me-time. Set yours in a tap.",
    href: "/app/tools/notes", image: "/images/grid-notes.webp", tone: "reminder",
  },
  {
    title: "A soft place for every feeling 📖",
    body: "Journal your mood and watch gentle patterns bloom, day by day.",
    href: "/app/tools/diary", image: "/images/diary-hero.webp", tone: "info",
  },
];

/** Seed the discover notifications once (after onboarding). No-op otherwise. */
export function seedDiscoverNotifications(): void {
  try {
    if (!isOnboarded()) return;
    if (localStorage.getItem(SEEDED_KEY)) return;
    localStorage.setItem(SEEDED_KEY, "1");
  } catch { return; }
  addNotifications(DISCOVER);
}
