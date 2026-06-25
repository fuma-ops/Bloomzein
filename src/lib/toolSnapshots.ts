import { useEffect, useState } from "react";
import { Pill, BookHeart, Wallet, Dumbbell, Flower2, type LucideIcon } from "lucide-react";
import { DIARY_STORAGE_KEY, moodMeta } from "@/pages/app.tools.diary";
import { readWorkoutStreak, readYogaStreak } from "@/lib/crossToolData";

export interface ToolSnapshot {
  slug: string;
  label: string;
  value: string;
  note: string;
  href: string;
  Icon: LucideIcon;
}

type Provider = () => ToolSnapshot | null;

function readJSON<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Each provider reads its tool's own storage and returns a small summary card,
 * or null to stay hidden. Add a tool here once and it appears on Today & Me automatically.
 */
const SNAPSHOT_PROVIDERS: Provider[] = [
  () => {
    const reminders = readJSON<{ id: string; title: string; date: string; time: string; done: boolean }[]>("bloom:reminders", []);
    const due = reminders.filter((r) => !r.done && r.date <= todayISO());
    const next = [...due].sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time))[0];
    return {
      slug: "notes",
      label: "Reminders",
      value: due.length > 0 ? `${due.length} due` : "All clear",
      note: next ? `${next.title} — at ${next.time}` : "No nudges today 🌸",
      href: "/app/tools/notes",
      Icon: Pill,
    };
  },
  () => {
    const entries = readJSON<{ id: string; date: string; mood: string; createdAt: string }[]>(DIARY_STORAGE_KEY, []);
    if (entries.length === 0) {
      return {
        slug: "diary",
        label: "Dreamy Diary",
        value: "No entries yet",
        note: "Start your softest little journal ✿",
        href: "/app/tools/diary",
        Icon: BookHeart,
      };
    }
    const latest = [...entries].sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
    const mood = moodMeta(latest.mood);
    return {
      slug: "diary",
      label: "Dreamy Diary",
      value: `${entries.length} ${entries.length === 1 ? "entry" : "entries"}`,
      note: `Last mood: ${mood.label}`,
      href: "/app/tools/diary",
      Icon: BookHeart,
    };
  },
  () => {
    const txns = readJSON<{ id: string; date: string; amount: number; type: "income" | "expense" }[]>("bp:txns", []);
    if (txns.length === 0) return null;
    const month = todayISO().slice(0, 7);
    const spentThisMonth = txns
      .filter((t) => t.type === "expense" && t.date.startsWith(month))
      .reduce((sum, t) => sum + t.amount, 0);
    return {
      slug: "budget",
      label: "Budget",
      value: `$${Math.round(spentThisMonth)}`,
      note: "spent this month",
      href: "/budget",
      Icon: Wallet,
    };
  },
  () => {
    const { count } = readWorkoutStreak();
    if (count === 0) return null;
    return {
      slug: "workout",
      label: "Workout",
      value: `${count} day streak`,
      note: count >= 3 ? "You're on fire 🔥 keep going!" : "Great start — keep showing up ✿",
      href: "/app/tools/workout",
      Icon: Dumbbell,
    };
  },
  () => {
    const { count } = readYogaStreak();
    if (count === 0) return null;
    return {
      slug: "yoga",
      label: "Yoga",
      value: `${count} day streak`,
      note: count >= 3 ? "Your flow is beautiful 🌸" : "Your practice is blooming ✿",
      href: "/app/tools/yoga",
      Icon: Flower2,
    };
  },
];

const REFRESH_EVENTS = ["storage", "bloom:diary-updated", "bloom:notes-updated", "bloom:budget-updated", "bloom:workout-updated", "bloom:yoga-updated"];

export function useToolSnapshots(): ToolSnapshot[] {
  const [snapshots, setSnapshots] = useState<ToolSnapshot[]>([]);

  useEffect(() => {
    const compute = () => {
      setSnapshots(SNAPSHOT_PROVIDERS.map((p) => p()).filter((s): s is ToolSnapshot => s !== null));
    };
    compute();
    REFRESH_EVENTS.forEach((evt) => window.addEventListener(evt, compute));
    return () => REFRESH_EVENTS.forEach((evt) => window.removeEventListener(evt, compute));
  }, []);

  return snapshots;
}
