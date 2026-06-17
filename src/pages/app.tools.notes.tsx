import { useEffect, useState, useMemo } from "react";
import {
  ArrowLeft, Search, Pin, PinOff, Plus, Minus, Trash2, Edit3, CheckCircle2,
  Sparkles, Bell, BellRing, Smartphone, Check, Calendar, Clock,
  Heart, Palette, Tag, AlertCircle, X, ChevronDown, ChevronUp, RotateCcw,
  Pill, Users, Sparkle, Cake, Stethoscope, Plane, Briefcase, CalendarClock,
  Droplets, Dumbbell, Moon, type LucideIcon
} from "lucide-react";
import { CuteDatePicker } from "@/components/bloom/CuteDatePicker";
import { CuteTimePicker } from "@/components/bloom/CutePicker";
import { BloomBubbles } from "@/components/bloom/BloomBubbles";
import {
  subscribeToPush,
  syncScheduledNotifications,
  cancelScheduledNotifications,
  fetchMedicationAcks,
  getCurrentUserId,
  doseConfirmToken,
  type ScheduledNotificationInput,
} from "@/lib/push";

/* ============================================================
   TYPES & CONSTANTS
   ============================================================ */
interface Note {
  id: string;
  title: string;
  text: string;
  color: string; // Background color key
  tag: string;   // Self-care, Ideas, To-do, Love, Other
  pinned: boolean;
  createdAt: string;
}

export type ReminderKind = "medication" | "birthday" | "event";

export interface Reminder {
  id: string;
  kind: ReminderKind;
  title: string;
  category: string;       // event sub-category — ignored for medication & birthday
  date: string;           // "YYYY-MM-DD" — anchor date (event start / birthday month+day reference)
  endDate?: string;       // event range end, e.g. vacations
  time?: string;          // "HH:MM" — single time of day for events & birthdays
  times: string[];        // medication time slots, e.g. ["09:00", "21:00"]
  weekdays: number[];     // medication recurrence days, 0=Sun..6=Sat — empty means every day
  leadDays: number;       // 0 = remind on the day only; >0 also nudge this many days ahead
  done: boolean;          // only meaningful for one-off events
  notifiedKey?: string;   // dedupe key for the last alert fired
  takenKey?: string;      // medication only — dedupe key of the slot last confirmed "taken"
  medAlarm?: { key: string; lastNudgeAt: string }; // medication only — active alarm awaiting confirmation, re-nudges every MED_ALARM_INTERVAL_MIN
  createdAt: string;
}

const NOTE_COLORS = [
  { key: "sakura",   label: "Sakura Blush",   bg: "bg-[#FFF0F6]",   border: "border-[#FBCFE8]", text: "text-[#831843]", body: "text-[#9D5C7E]/80", accent: "#EC4899", dark: false, bloom: "🌸" },
  { key: "lavender", label: "Lavender Glow",  bg: "bg-[#F3E8FF]",   border: "border-[#D8B4FE]", text: "text-[#5B21B6]", body: "text-[#7C3AED]/70", accent: "#8B5CF6", dark: false, bloom: "💜" },
  { key: "mint",     label: "Mint Whisper",   bg: "bg-[#ECFDF5]",   border: "border-[#A7F3D0]", text: "text-[#065F46]", body: "text-[#065F46]/70", accent: "#10B981", dark: false, bloom: "🍃" },
  { key: "lemon",    label: "Lemon Custard",  bg: "bg-[#FEFCE8]",   border: "border-[#FDE047]", text: "text-[#854D0E]", body: "text-[#854D0E]/70", accent: "#EAB308", dark: false, bloom: "✨" },
  { key: "peach",    label: "Peach Cream",    bg: "bg-[#FFF5F5]",   border: "border-[#FECACA]", text: "text-[#9C4221]", body: "text-[#9C4221]/70", accent: "#F97316", dark: false, bloom: "🌺" },
  { key: "midnight", label: "Midnight Bloom", bg: "bg-gradient-to-br from-[#9D174D] to-[#6D28D9]", border: "border-[#BE185D]", text: "text-white", body: "text-white/75", accent: "#EC4899", dark: true, bloom: "🌙" },
];

const TAG_EMOJI: Record<string, string> = {
  "Self-care": "🌸",
  "Ideas":     "💡",
  "To-do":     "✅",
  "Love":      "💕",
  "Other":     "✨",
};

const NOTE_TAGS = ["Self-care", "Ideas", "To-do", "Love", "Other"];

const MOOD_OPTIONS = [
  { emoji: "😊", label: "Happy",     color: "sakura"   },
  { emoji: "😌", label: "Calm",      color: "lavender" },
  { emoji: "💪", label: "Energized", color: "mint"     },
  { emoji: "😔", label: "Low",       color: "peach"    },
  { emoji: "😤", label: "Stressed",  color: "peach"    },
  { emoji: "💕", label: "Loved",     color: "sakura"   },
  { emoji: "🌟", label: "Grateful",  color: "lemon"    },
  { emoji: "😴", label: "Tired",     color: "midnight" },
];

const QUICK_SUGGESTIONS: { Icon: LucideIcon; label: string; kind: ReminderKind; title: string; times?: string[] }[] = [
  { Icon: Pill,      label: "Daily Vitamins",  kind: "medication", title: "Daily Vitamins",   times: ["09:00"] },
  { Icon: Cake,      label: "Mom's Birthday",  kind: "birthday",   title: "Mom's Birthday" },
  { Icon: Droplets,  label: "Drink Water",     kind: "medication", title: "Drink Water",      times: ["08:00", "12:00", "18:00"] },
  { Icon: Dumbbell,  label: "Morning Workout", kind: "medication", title: "Morning Workout",  times: ["07:00"] },
  { Icon: Pill,      label: "Evening Meds",    kind: "medication", title: "Evening Meds",     times: ["21:00"] },
  { Icon: Moon,      label: "Bedtime Routine", kind: "medication", title: "Bedtime Routine",  times: ["22:00"] },
];

const EXAMPLE_NOTES: Omit<Note, "id" | "createdAt">[] = [
  { title: "Morning Self-care ✿", text: "• Face wash & moisturize\n• 10 min meditation\n• Drink lemon water\n• Gratitude journal 🌸", color: "sakura",   tag: "Self-care", pinned: true },
  { title: "App Ideas 💡",        text: "• Mood tracker with music\n• Daily affirmation widget\n• Bloom journal premium\n• Sleep quality tracker", color: "lavender", tag: "Ideas",     pinned: false },
  { title: "This Week ✅",        text: "[ ] Book dentist appointment\n[ ] Call mom on Sunday\n[x] Start new journal\n[ ] Buy face masks",      color: "mint",     tag: "To-do",    pinned: false },
  { title: "Love Notes 💕",       text: "I am worthy of love and kindness.\nI choose joy every single day.\nI am becoming the best version of me.\n💕 You are enough.", color: "sakura", tag: "Love", pinned: false },
  { title: "Midnight Dreams 🌙",  text: "One day I'll travel to Japan in spring, walk under cherry blossoms, write in a little cafe by the river...", color: "midnight", tag: "Other", pinned: false },
];

function parseTodoItems(text: string): { checked: boolean; label: string; lineIndex: number }[] {
  const result: { checked: boolean; label: string; lineIndex: number }[] = [];
  text.split("\n").forEach((line, i) => {
    if (line.startsWith("[x] ") || line.startsWith("[X] ")) result.push({ checked: true,  label: line.slice(4), lineIndex: i });
    else if (line.startsWith("[ ] "))                        result.push({ checked: false, label: line.slice(4), lineIndex: i });
  });
  return result;
}

function isTodoNote(note: Note) {
  const lines = note.text.split("\n").filter((l) => l.trim());
  return note.tag === "To-do" && lines.length > 0 && lines.every((l) => /^\[[ xX]\] /.test(l));
}

const KIND_OPTIONS: { key: ReminderKind; label: string; emoji: string; Icon: LucideIcon; hint: string }[] = [
  { key: "medication", label: "Medication", emoji: "💊", Icon: Pill, hint: "Pills, vitamins & daily habits" },
  { key: "event", label: "Appointment & events", emoji: "📅", Icon: CalendarClock, hint: "Meetings, doctor visits, vacations…" },
  { key: "birthday", label: "Birthday", emoji: "🎂", Icon: Cake, hint: "Repeats every year, forever ✿" },
];

const EVENT_CATEGORIES = [
  { key: "appointment", label: "Appointment", Icon: Stethoscope, color: "text-sky-600 bg-sky-50" },
  { key: "meeting", label: "Meeting", Icon: Briefcase, color: "text-indigo-600 bg-indigo-50" },
  { key: "vacation", label: "Vacation", Icon: Plane, color: "text-amber-600 bg-amber-50" },
  { key: "social", label: "Social", Icon: Users, color: "text-purple-600 bg-purple-50" },
  { key: "chore", label: "Chore", Icon: Sparkle, color: "text-amber-600 bg-amber-50" },
  { key: "other", label: "Other", Icon: Heart, color: "text-rose-600 bg-rose-50" },
];

const WEEKDAYS = [
  { key: 0, short: "S", label: "Sunday" },
  { key: 1, short: "M", label: "Monday" },
  { key: 2, short: "T", label: "Tuesday" },
  { key: 3, short: "W", label: "Wednesday" },
  { key: 4, short: "T", label: "Thursday" },
  { key: 5, short: "F", label: "Friday" },
  { key: 6, short: "S", label: "Saturday" },
];

/** Medication nudges repeat like an alarm — every N minutes — until marked "Taken". */
const MED_ALARM_INTERVAL_MIN = 15;
/** How many backend follow-up pushes to pre-schedule per dose (in case the app stays closed) — original + this many. */
const MED_ALARM_FOLLOWUPS = 3;

const LEAD_OPTIONS = [
  { value: 0, label: "On the day" },
  { value: 1, label: "1 day before" },
  { value: 2, label: "2 days before" },
  { value: 3, label: "3 days before" },
  { value: 7, label: "1 week before" },
];

/* ---- date helpers (local, no timezone surprises) ---- */
function pad2(n: number) {
  return String(n).padStart(2, "0");
}
function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}
function parseLocalDate(s?: string): Date | null {
  if (!s) return null;
  const [y, m, d] = s.split("-").map((n) => parseInt(n, 10));
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}
function fmtLocalDate(d: Date) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}
function addDays(d: Date, n: number) {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}
function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}
function prettyDate(s?: string) {
  const d = parseLocalDate(s);
  if (!d) return "";
  return d.toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" });
}
function prettyMonthDay(s?: string) {
  const d = parseLocalDate(s);
  if (!d) return "";
  return d.toLocaleDateString(undefined, { day: "numeric", month: "long" });
}

/** Soonest relevant calendar date (today or future) — drives sorting & notification badges. */
function nextOccurrence(rem: Reminder, from: Date = new Date()): Date | null {
  const today = startOfDay(from);

  if (rem.kind === "medication") {
    for (let i = 0; i < 14; i++) {
      const d = addDays(today, i);
      if (rem.weekdays.length === 0 || rem.weekdays.includes(d.getDay())) return d;
    }
    return null;
  }

  if (rem.kind === "birthday") {
    const ref = parseLocalDate(rem.date);
    if (!ref) return null;
    let next = new Date(today.getFullYear(), ref.getMonth(), ref.getDate());
    if (next < today) next = new Date(today.getFullYear() + 1, ref.getMonth(), ref.getDate());
    return next;
  }

  const start = parseLocalDate(rem.date);
  if (!start) return null;
  const end = parseLocalDate(rem.endDate) || start;
  if (start <= today && today <= end) return today;
  return start;
}

const PUSH_SYNC_WINDOW_DAYS = 35;

type FireItem = { dedupeKey: string; fireAt: Date; body: string; data?: Record<string, unknown> };

function upcomingFires(rem: Reminder, from: Date, userId: string | null): FireItem[] {
  if (rem.kind === "event" && rem.done) return [];
  const today = startOfDay(from);
  const horizon = addDays(today, PUSH_SYNC_WINDOW_DAYS);
  const out: FireItem[] = [];

  if (rem.kind === "medication") {
    const slots = rem.times.length ? rem.times : ["09:00"];
    for (let i = 0; i < PUSH_SYNC_WINDOW_DAYS; i++) {
      const day = addDays(today, i);
      if (rem.weekdays.length > 0 && !rem.weekdays.includes(day.getDay())) continue;
      for (const slot of slots) {
        const [hh, mm] = slot.split(":").map((n) => parseInt(n, 10));
        const base = new Date(day.getFullYear(), day.getMonth(), day.getDate(), hh || 0, mm || 0);
        const doseKey = `${fmtLocalDate(day)}|${slot}`;
        const dedupePrefix = `${rem.id}:${doseKey}`;
        const data = userId
          ? {
              url: "/app/tools/notes",
              kind: "medication" as const,
              reminderId: rem.id,
              doseKey,
              dedupePrefix,
              confirmToken: doseConfirmToken(userId, rem.id, doseKey),
            }
          : undefined;
        for (let n = 0; n <= MED_ALARM_FOLLOWUPS; n++) {
          const fireAt = new Date(base.getTime() + n * MED_ALARM_INTERVAL_MIN * 60000);
          if (fireAt < from) continue;
          const body =
            n === 0
              ? `Time to take ${rem.title} · ${slot} 💊`
              : `Still waiting — take your ${rem.title} (${slot}) 💊`;
          out.push({ dedupeKey: `${doseKey}|${n}`, fireAt, body, data });
        }
      }
    }
    return out;
  }

  const occurrence = nextOccurrence(rem, from);
  if (!occurrence || occurrence > horizon) return out;

  const time = rem.time || "09:00";
  const [hh, mm] = time.split(":").map((n) => parseInt(n, 10));
  const occStr = fmtLocalDate(occurrence);
  const dueAt = new Date(occurrence.getFullYear(), occurrence.getMonth(), occurrence.getDate(), hh || 0, mm || 0);
  const label = rem.kind === "birthday" ? `${rem.title}'s birthday is today 🎂` : `${rem.title} is today`;
  if (dueAt >= from) out.push({ dedupeKey: `due:${occStr}`, fireAt: dueAt, body: `${label} 💕` });

  if (rem.leadDays > 0) {
    const lead = addDays(occurrence, -rem.leadDays);
    const leadAt = new Date(lead.getFullYear(), lead.getMonth(), lead.getDate(), hh || 0, mm || 0);
    if (leadAt >= from && leadAt <= horizon) {
      out.push({
        dedupeKey: `lead:${fmtLocalDate(lead)}`,
        fireAt: leadAt,
        body: `${rem.title} is coming up in ${rem.leadDays} day${rem.leadDays > 1 ? "s" : ""} 💕`,
      });
    }
  }

  return out;
}

/** Age the person turns on their next birthday occurrence — null if no birth year was given. */
function turningAge(rem: Reminder): number | null {
  if (rem.kind !== "birthday") return null;
  const ref = parseLocalDate(rem.date);
  const next = nextOccurrence(rem);
  if (!ref || !next || ref.getFullYear() < 1900) return null;
  return next.getFullYear() - ref.getFullYear();
}

function reminderVisual(rem: Reminder): { Icon: LucideIcon; color: string; label: string } {
  if (rem.kind === "medication") return { Icon: Pill, color: "text-emerald-600 bg-emerald-50", label: "Medication" };
  if (rem.kind === "birthday") return { Icon: Cake, color: "text-pink-600 bg-pink-50", label: "Birthday" };
  const cat = EVENT_CATEGORIES.find((c) => c.key === rem.category);
  return cat ? { Icon: cat.Icon, color: cat.color, label: cat.label } : { Icon: Heart, color: "text-hotpink bg-blush", label: "Event" };
}

function weekdaysLabel(days: number[]) {
  if (days.length === 0) return "Every day";
  if (days.length === 1) return `Every ${WEEKDAYS[days[0]].label}`;
  return days.map((d) => WEEKDAYS[d].label.slice(0, 3)).join(", ");
}

function reminderCardStyle(rem: Reminder) {
  if (rem.kind === "medication") return { bg: "bg-[#ECFDF5]", border: "border-[#A7F3D0]", text: "text-[#065F46]", body: "text-[#065F46]/70", bloom: "🍃" };
  if (rem.kind === "birthday")   return { bg: "bg-[#FFF0F6]", border: "border-[#FBCFE8]", text: "text-[#831843]", body: "text-[#9D5C7E]/80", bloom: "🎂" };
  const cat = rem.category;
  if (cat === "appointment") return { bg: "bg-[#EFF6FF]", border: "border-[#BFDBFE]", text: "text-[#1E40AF]", body: "text-[#1E40AF]/70", bloom: "🌸" };
  if (cat === "meeting")     return { bg: "bg-[#F3E8FF]", border: "border-[#D8B4FE]", text: "text-[#5B21B6]", body: "text-[#7C3AED]/70", bloom: "💜" };
  if (cat === "vacation")    return { bg: "bg-[#FEFCE8]", border: "border-[#FDE047]", text: "text-[#854D0E]", body: "text-[#854D0E]/70", bloom: "✈️" };
  if (cat === "social")      return { bg: "bg-[#FAF5FF]", border: "border-[#E9D5FF]", text: "text-[#6B21A8]", body: "text-[#7E22CE]/70", bloom: "🎉" };
  return { bg: "bg-[#FFF5F5]", border: "border-[#FECACA]", text: "text-[#9C4221]", body: "text-[#9C4221]/70", bloom: "🌺" };
}

export const STORAGE_KEYS = {
  notes: "bloom:notes",
  reminders: "bloom:reminders",
  welcomed: "bloom:notes-welcomed",
  permissionDismissed: "bloom:notif-dismissed",
  pwaDismissed: "bloom:pwa-dismissed",
};

export default function NotesPage() {
  const [tab, setTab] = useState<"notes" | "reminders">("notes");

  // Notes state
  const [notes, setNotes] = useState<Note[]>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.notes);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  // Reminders state
  const [reminders, setReminders] = useState<Reminder[]>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.reminders);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  const [welcomed, setWelcomed] = useState<boolean>(() => {
    try {
      const val = localStorage.getItem(STORAGE_KEYS.welcomed);
      return val === "true";
    } catch {
      return false;
    }
  });

  const [notifPermission, setNotifPermission] = useState<NotificationPermission>(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      return Notification.permission;
    }
    return "default";
  });

  const [promptNotif, setPromptNotif] = useState<boolean>(() => {
    try {
      if (typeof window === "undefined" || !("Notification" in window)) return false;
      const dismissed = localStorage.getItem(STORAGE_KEYS.permissionDismissed);
      return dismissed !== "true" && Notification.permission === "default";
    } catch {
      return false;
    }
  });

  const [promptPwa, setPromptPwa] = useState<boolean>(() => {
    try {
      const dismissed = localStorage.getItem(STORAGE_KEYS.pwaDismissed);
      return dismissed !== "true";
    } catch {
      return true;
    }
  });

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTag, setSelectedTag] = useState<string>("All");

  // Form states (Notes)
  const [showNoteForm, setShowNoteForm] = useState(false);
  const [showMoodPicker, setShowMoodPicker] = useState(false);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [noteTitle, setNoteTitle] = useState("");
  const [noteText, setNoteText] = useState("");
  const [noteColor, setNoteColor] = useState("sakura");
  const [noteTag, setNoteTag] = useState("Self-care");

  // Form states (Reminders)
  const [showReminderForm, setShowReminderForm] = useState(false);
  const [editingReminderId, setEditingReminderId] = useState<string | null>(null);
  const [remKind, setRemKind] = useState<ReminderKind>("medication");
  const [remTitle, setRemTitle] = useState("");
  const [remCategory, setRemCategory] = useState("appointment");
  const [remDate, setRemDate] = useState(() => todayStr());
  const [remIsRange, setRemIsRange] = useState(false);
  const [remEndDate, setRemEndDate] = useState("");
  const [remHasTime, setRemHasTime] = useState(false);
  const [remTime, setRemTime] = useState("09:00");
  const [remTimes, setRemTimes] = useState<string[]>(["09:00"]);
  const [remEveryDay, setRemEveryDay] = useState(true);
  const [remWeekdays, setRemWeekdays] = useState<number[]>([]);
  const [remLeadDays, setRemLeadDays] = useState(0);

  const resetReminderForm = () => {
    setEditingReminderId(null);
    setRemKind("medication");
    setRemTitle("");
    setRemCategory("appointment");
    setRemDate(todayStr());
    setRemIsRange(false);
    setRemEndDate("");
    setRemHasTime(false);
    setRemTime("09:00");
    setRemTimes(["09:00"]);
    setRemEveryDay(true);
    setRemWeekdays([]);
    setRemLeadDays(0);
  };

  const [doneCollapsed, setDoneCollapsed] = useState(true);
  const [activeAlert, setActiveAlert] = useState<{ id: string; title: string; category: string; kind: ReminderKind; medKey?: string } | null>(null);
  const [justSaved, setJustSaved] = useState(false);

  /* ============================================================
     MUTATION FUNCTIONS & PERSISTENCE
     ============================================================ */
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.notes, JSON.stringify(notes));
  }, [notes]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.reminders, JSON.stringify(reminders));
  }, [reminders]);

  const handleStartHere = () => {
    setWelcomed(true);
    localStorage.setItem(STORAGE_KEYS.welcomed, "true");
  };

  const handleSaveNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteTitle.trim() && !noteText.trim()) return;

    if (editingNoteId) {
      setNotes((prev) =>
        prev.map((n) =>
          n.id === editingNoteId
            ? { ...n, title: noteTitle, text: noteText, color: noteColor, tag: noteTag }
            : n
        )
      );
      setEditingNoteId(null);
    } else {
      const newNote: Note = {
        id: Math.random().toString(36).slice(2, 10),
        title: noteTitle,
        text: noteText,
        color: noteColor,
        tag: noteTag,
        pinned: false,
        createdAt: new Date().toISOString(),
      };
      setNotes((prev) => [newNote, ...prev]);
    }

    setNoteTitle("");
    setNoteText("");
    setNoteColor("sakura");
    setNoteTag("Self-care");
    setShowNoteForm(false);
    setJustSaved(true);
    setTimeout(() => setJustSaved(false), 1000);
  };

  const handleEditNote = (note: Note) => {
    setEditingNoteId(note.id);
    setNoteTitle(note.title);
    setNoteText(note.text);
    setNoteColor(note.color);
    setNoteTag(note.tag);
    setShowNoteForm(true);
  };

  const handleDeleteNote = (id: string) => {
    if (confirm("Are you sure you want to delete this note?")) {
      setNotes((prev) => prev.filter((n) => n.id !== id));
      if (editingNoteId === id) {
        setEditingNoteId(null);
        setNoteTitle("");
        setNoteText("");
      }
    }
  };

  const handleTogglePin = (id: string) => {
    setNotes((prev) =>
      prev.map((n) => (n.id === id ? { ...n, pinned: !n.pinned } : n))
    );
  };

  const handleSeedExamples = () => {
    const now = new Date().toISOString();
    setNotes(EXAMPLE_NOTES.map((n) => ({ ...n, id: Math.random().toString(36).slice(2, 10), createdAt: now })));
  };

  const handleToggleTodoItem = (noteId: string, lineIndex: number) => {
    setNotes((prev) =>
      prev.map((n) => {
        if (n.id !== noteId) return n;
        const lines = n.text.split("\n");
        const line = lines[lineIndex];
        if (line.startsWith("[x] ") || line.startsWith("[X] ")) lines[lineIndex] = "[ ] " + line.slice(4);
        else if (line.startsWith("[ ] "))                        lines[lineIndex] = "[x] " + line.slice(4);
        return { ...n, text: lines.join("\n") };
      })
    );
  };

  const applyQuickSuggestion = (s: (typeof QUICK_SUGGESTIONS)[0]) => {
    setTab("reminders");
    resetReminderForm();
    setRemKind(s.kind);
    setRemTitle(s.title);
    if (s.kind === "medication" && s.times) setRemTimes(s.times);
    setShowReminderForm(true);
  };

  const handleSaveReminder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!remTitle.trim()) return;
    if (remKind === "event" && remIsRange && remEndDate && remEndDate < remDate) return;

    if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "default") {
      Notification.requestPermission().then((perm) => {
        setNotifPermission(perm);
        setPromptNotif(false);
        try { localStorage.setItem(STORAGE_KEYS.permissionDismissed, "true"); } catch {}
        if (perm === "granted") subscribeToPush().catch(() => {});
      });
    }

    let payload: Omit<Reminder, "id" | "done" | "notifiedKey" | "createdAt">;

    if (remKind === "medication") {
      const times = remTimes.filter(Boolean);
      payload = {
        kind: "medication",
        title: remTitle.trim(),
        category: "medication",
        date: todayStr(),
        time: undefined,
        endDate: undefined,
        times: times.length ? times : ["09:00"],
        weekdays: remEveryDay ? [] : remWeekdays,
        leadDays: 0,
      };
    } else if (remKind === "birthday") {
      payload = {
        kind: "birthday",
        title: remTitle.trim(),
        category: "birthday",
        date: remDate,
        time: undefined,
        endDate: undefined,
        times: [],
        weekdays: [],
        leadDays: remLeadDays,
      };
    } else {
      payload = {
        kind: "event",
        title: remTitle.trim(),
        category: remCategory,
        date: remDate,
        endDate: remIsRange && remEndDate ? remEndDate : undefined,
        time: remHasTime ? remTime : undefined,
        times: [],
        weekdays: [],
        leadDays: remLeadDays,
      };
    }

    if (editingReminderId) {
      setReminders((prev) =>
        prev.map((r) => (r.id === editingReminderId ? { ...r, ...payload, done: false, notifiedKey: undefined } : r))
      );
    } else {
      setReminders((prev) => [
        ...prev,
        { id: Math.random().toString(36).slice(2, 10), done: false, createdAt: new Date().toISOString(), ...payload },
      ]);
    }

    resetReminderForm();
    setShowReminderForm(false);
    setJustSaved(true);
    setTimeout(() => setJustSaved(false), 1000);
  };

  const handleEditReminder = (rem: Reminder) => {
    setEditingReminderId(rem.id);
    setRemKind(rem.kind);
    setRemTitle(rem.title);
    setRemCategory(rem.kind === "event" ? rem.category : "appointment");
    setRemDate(rem.date);
    setRemIsRange(!!rem.endDate);
    setRemEndDate(rem.endDate || "");
    setRemHasTime(!!rem.time);
    setRemTime(rem.time || "09:00");
    setRemTimes(rem.times.length ? rem.times : ["09:00"]);
    setRemEveryDay(rem.weekdays.length === 0);
    setRemWeekdays(rem.weekdays);
    setRemLeadDays(rem.leadDays);
    setShowReminderForm(true);
  };

  const handleDeleteReminder = (id: string) => {
    if (confirm("Delete this reminder?")) {
      setReminders((prev) => prev.filter((r) => r.id !== id));
      if (editingReminderId === id) {
        setEditingReminderId(null);
        setRemTitle("");
      }
    }
  };

  const handleMarkMedicationTaken = (id: string, key: string) => {
    setReminders((prev) =>
      prev.map((r) => (r.id === id && r.kind === "medication" ? { ...r, takenKey: key, medAlarm: undefined } : r))
    );
    setJustSaved(true);
    setTimeout(() => setJustSaved(false), 800);
    cancelScheduledNotifications("reminders", `${id}:${key}`).catch(() => {});
  };

  const handleToggleReminderDone = (id: string) => {
    setReminders((prev) =>
      prev.map((r) => (r.id === id && r.kind === "event" ? { ...r, done: !r.done } : r))
    );
    setJustSaved(true);
    setTimeout(() => setJustSaved(false), 800);
  };

  /* ============================================================
     NOTIFICATIONS & TICKS ENGINE
     ============================================================ */
  const handleRequestNotifPermission = async () => {
    if (typeof window !== "undefined" && "Notification" in window) {
      const perm = await Notification.requestPermission();
      setNotifPermission(perm);
      setPromptNotif(false);
      try {
        localStorage.setItem(STORAGE_KEYS.permissionDismissed, "true");
      } catch {}
      if (perm === "granted") subscribeToPush().catch(() => {});
    }
  };

  const handleDismissNotifPrompt = () => {
    setPromptNotif(false);
    try {
      localStorage.setItem(STORAGE_KEYS.permissionDismissed, "true");
    } catch {}
  };

  const handleDismissPwaPrompt = () => {
    setPromptPwa(false);
    try {
      localStorage.setItem(STORAGE_KEYS.pwaDismissed, "true");
    } catch {}
  };

  useEffect(() => {
    const fireAlert = (rem: Reminder, body: string, medKey?: string) => {
      if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
        try {
          new Notification("BloomyGirl Nudge ✿", { body: `${body} 💕`, icon: "/images/me-avatar.png" });
        } catch (e) {
          console.error("Browser notification failed to fire:", e);
        }
      }
      setActiveAlert({ id: rem.id, title: rem.title, category: rem.kind === "event" ? rem.category : rem.kind, kind: rem.kind, medKey });
    };

    const checkReminders = () => {
      const now = new Date();
      const todayString = todayStr();
      const currentTime = `${pad2(now.getHours())}:${pad2(now.getMinutes())}`;

      setReminders((prev) => {
        let changed = false;
        const nextList = prev.map((rem) => {
          if (rem.kind === "event" && rem.done) return rem;

          if (rem.kind === "medication") {
            const isActiveDay = rem.weekdays.length === 0 || rem.weekdays.includes(now.getDay());
            if (!isActiveDay) return rem;
            const dueSlot = [...rem.times].sort().find((t) => t <= currentTime);
            if (!dueSlot) return rem;
            const key = `${todayString}|${dueSlot}`;
            if (rem.takenKey === key) return rem;

            if (!rem.medAlarm || rem.medAlarm.key !== key) {
              changed = true;
              fireAlert(rem, `Time to take ${rem.title} · ${dueSlot}`, key);
              return { ...rem, notifiedKey: key, medAlarm: { key, lastNudgeAt: now.toISOString() } };
            }
            const minsSinceLastNudge = (now.getTime() - new Date(rem.medAlarm.lastNudgeAt).getTime()) / 60000;
            if (minsSinceLastNudge < MED_ALARM_INTERVAL_MIN) return rem;
            changed = true;
            fireAlert(rem, `Still waiting — take your ${rem.title} (${dueSlot})`, key);
            return { ...rem, medAlarm: { key, lastNudgeAt: now.toISOString() } };
          }

          const occurrence = nextOccurrence(rem, now);
          if (!occurrence) return rem;
          const occStr = fmtLocalDate(occurrence);
          const leadStr = rem.leadDays > 0 ? fmtLocalDate(addDays(occurrence, -rem.leadDays)) : null;
          const dueTime = rem.time || "00:00";

          let matchKey: string | null = null;
          let label = "";
          if (occStr === todayString && currentTime >= dueTime) {
            matchKey = `due:${occStr}`;
            label = rem.kind === "birthday" ? `${rem.title}'s birthday is today` : `${rem.title} is today`;
          } else if (leadStr === todayString) {
            matchKey = `lead:${leadStr}`;
            label = `${rem.title} is coming up in ${rem.leadDays} day${rem.leadDays > 1 ? "s" : ""}`;
          }

          if (!matchKey || rem.notifiedKey === matchKey) return rem;
          changed = true;
          fireAlert(rem, label);
          return { ...rem, notifiedKey: matchKey };
        });
        return changed ? nextList : prev;
      });
    };

    checkReminders();
    const interval = setInterval(checkReminders, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const userId = await getCurrentUserId();
      if (cancelled) return;
      const items: ScheduledNotificationInput[] = reminders.flatMap((rem) =>
        upcomingFires(rem, new Date(), userId).map((fire) => ({
          dedupeKey: `${rem.id}:${fire.dedupeKey}`,
          fireAt: fire.fireAt.toISOString(),
          title: "BloomyGirl Nudge ✿",
          body: fire.body,
          data: fire.data ?? { url: "/app/tools/notes", reminderId: rem.id },
        }))
      );
      syncScheduledNotifications("reminders", items);
    })();
    return () => {
      cancelled = true;
    };
  }, [reminders]);

  useEffect(() => {
    let stopped = false;
    const reconcile = async () => {
      const acked = await fetchMedicationAcks();
      if (stopped || acked.size === 0) return;
      setReminders((prev) => {
        let changed = false;
        const next = prev.map((r) => {
          if (r.kind !== "medication") return r;
          const pendingKey = r.medAlarm?.key;
          if (pendingKey && acked.has(`${r.id}|${pendingKey}`) && r.takenKey !== pendingKey) {
            changed = true;
            return { ...r, takenKey: pendingKey, medAlarm: undefined };
          }
          return r;
        });
        return changed ? next : prev;
      });
    };
    reconcile();
    const interval = setInterval(reconcile, 30000);
    return () => {
      stopped = true;
      clearInterval(interval);
    };
  }, []);

  /* ============================================================
     MEMOIZED SELECTIONS & FILTERING
     ============================================================ */
  const filteredNotes = useMemo(() => {
    let list = notes;
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (n) =>
          n.title.toLowerCase().includes(q) ||
          n.text.toLowerCase().includes(q) ||
          n.tag.toLowerCase().includes(q)
      );
    }
    if (selectedTag !== "All") {
      list = list.filter((n) => n.tag === selectedTag);
    }
    return [...list].sort((a, b) => {
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [notes, searchQuery, selectedTag]);

  const sortedReminders = useMemo(() => {
    const now = new Date();
    return reminders
      .filter((r) => !(r.kind === "event" && r.done))
      .map((r) => ({ rem: r, next: nextOccurrence(r, now) }))
      .filter((x): x is { rem: Reminder; next: Date } => x.next !== null)
      .sort((a, b) => {
        const diff = a.next.getTime() - b.next.getTime();
        if (diff !== 0) return diff;
        const at = a.rem.kind === "medication" ? [...a.rem.times].sort()[0] || "" : a.rem.time || "";
        const bt = b.rem.kind === "medication" ? [...b.rem.times].sort()[0] || "" : b.rem.time || "";
        return at.localeCompare(bt);
      })
      .map((x) => x.rem);
  }, [reminders]);

  const completedReminders = useMemo(() => {
    return reminders.filter((r) => r.kind === "event" && r.done);
  }, [reminders]);

  /* ============================================================
     RENDER
     ============================================================ */
  return (
    <div className="relative animate-fade-in min-h-screen">
      <BloomBubbles count={12} />

      {/* IN-APP ALERT */}
      {activeAlert && (
        <div className="fixed inset-x-4 top-16 z-50 md:left-auto md:right-4 md:w-96 rounded-3xl bg-white border border-pink-200 p-5 shadow-2xl animate-bloom-bounce">
          <div className="flex items-start gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-hotpink/10 text-hotpink animate-pulse">
              <BellRing className="h-5 w-5" />
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-wider text-hotpink">Gentle Bloom Nudge</p>
              <h4 className="font-semibold text-rose text-sm truncate">{activeAlert.title}</h4>
              <p className="text-xs text-rose/70 mt-0.5">
                {activeAlert.kind === "medication" ? "Like an alarm — it'll keep nudging you until you confirm 💊" : "It's time to bloom! 💕"}
              </p>
              <div className="flex gap-2 mt-4">
                {activeAlert.kind === "medication" ? (
                  <>
                    <button
                      onClick={() => {
                        if (activeAlert.medKey) handleMarkMedicationTaken(activeAlert.id, activeAlert.medKey);
                        setActiveAlert(null);
                      }}
                      className="bloom-luxury-btn px-3 py-1.5 text-xs font-bold text-white flex-1"
                    >
                      Taken ✓
                    </button>
                    <button
                      onClick={() => setActiveAlert(null)}
                      className="px-3 py-1.5 bg-blush text-hotpink text-xs font-bold rounded-full hover:bg-petal transition"
                    >
                      Snooze {MED_ALARM_INTERVAL_MIN}m
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => { handleToggleReminderDone(activeAlert.id); setActiveAlert(null); }}
                      className="bloom-luxury-btn px-3 py-1.5 text-xs font-bold text-white flex-1"
                    >
                      Mark done ✿
                    </button>
                    <button
                      onClick={() => setActiveAlert(null)}
                      className="px-3 py-1.5 bg-blush text-hotpink text-xs font-bold rounded-full hover:bg-petal transition"
                    >
                      Dismiss
                    </button>
                  </>
                )}
              </div>
            </div>
            <button onClick={() => setActiveAlert(null)} className="text-rose/40 hover:text-rose transition">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* BANNERS */}
      <div className="flex flex-col gap-3 mb-4">
        {promptPwa && (
          <div className="relative overflow-hidden rounded-[1.25rem] border border-petal/60 bg-white/90 backdrop-blur p-4 shadow-[0_10px_20px_-10px_rgba(236,72,153,0.15)] animate-fade-in">
            <div className="flex items-start gap-3.5">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#FFF0F6] text-[#EC4899] border border-pink-200">
                <Smartphone className="h-4 w-4" />
              </span>
              <div className="flex-1 text-left">
                <h4 className="text-xs font-bold text-[#831843]">Remind you on your lockscreen?</h4>
                <p className="text-[11px] text-[#9D5C7E] mt-0.5 leading-snug">
                  Add BloomyGirl to your phone's home screen as an app to receive self-care nudges even when closed.
                </p>
              </div>
              <button onClick={handleDismissPwaPrompt} className="text-[#9D5C7E]/40 hover:text-[#9D5C7E] transition self-start p-1">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}
        {promptNotif && (
          <div className="relative overflow-hidden rounded-[1.25rem] border border-pink-200/50 bg-[#FCE7F3] p-4 shadow-[0_10px_20px_-10px_rgba(236,72,153,0.15)] animate-fade-in">
            <div className="flex items-start gap-3.5">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white text-[#EC4899] shadow-sm">
                <Bell className="h-4 w-4" />
              </span>
              <div className="flex-1 text-left">
                <h4 className="text-xs font-bold text-[#831843]">Enable lovely desktop notification nudges? 💕</h4>
                <p className="text-[11px] text-[#9D5C7E] mt-0.5 leading-snug">
                  Allow BloomyGirl to send gentle reminders while the tab is open.
                </p>
                <div className="mt-3 flex gap-2">
                  <button onClick={handleRequestNotifPermission} className="bloom-luxury-btn px-3 py-1.5 text-[10px] font-bold text-white">
                    Enable Nudges ✿
                  </button>
                  <button onClick={handleDismissNotifPrompt} className="px-3 py-1.5 bg-white/75 text-rose text-[10px] font-bold rounded-full hover:bg-white transition">
                    Later
                  </button>
                </div>
              </div>
              <button onClick={handleDismissNotifPrompt} className="text-[#9D5C7E]/40 hover:text-[#9D5C7E] transition self-start p-1">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* WELCOME */}
      {!welcomed && (
        <div className="mb-4 rounded-[1.75rem] border border-[#EC4899]/20 bg-white/90 backdrop-blur p-5 sm:p-6 shadow-md animate-fade-in">
          <div className="flex items-start gap-4">
            <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-[#EC4899] to-[#DB2777] text-white">
              <Heart className="h-5 w-5 text-white" />
            </div>
            <div>
              <h3 className="font-script text-2xl text-[#EC4899]">Welcome back, beautiful!</h3>
              <p className="mt-1.5 text-xs sm:text-sm text-[#831843] leading-relaxed">
                Welcome to your little corner of peace. Here you can write down sweet thoughts, dump feelings,
                or set gorgeous nudges. Pinned notes float to the top so you can easily view your vision.
              </p>
              <button onClick={handleStartHere} className="bloom-luxury-btn mt-4 px-4 py-1.5 text-xs font-bold text-white">
                Start Here ✿
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PAGE HEADER */}
      <header className="mb-6">
        <div className="flex items-center gap-1.5 text-xs text-rose/70 font-semibold mb-2">
          <a href="/app/tools" className="hover:text-hotpink flex items-center gap-1 transition">
            <ArrowLeft className="h-3 w-3" /> All Apps
          </a>
          <span>/</span>
          <span className="text-hotpink">Notes & Reminders</span>
        </div>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="font-script text-4xl sm:text-5xl text-hotpink leading-none flex items-center gap-2">
              Notes & Reminders
              <Sparkles className="h-6 w-6 text-amber-400 shrink-0" />
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-rose/80">Scribble thoughts, let dreams nudge ✿</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {justSaved && (
              <span className="flex items-center gap-1 bg-white/95 px-3 py-1.5 rounded-full text-xs font-bold text-hotpink border border-pink-200 animate-scale-in">
                <Sparkles className="h-3.5 w-3.5 text-hotpink animate-spin" /> Saved!
              </span>
            )}
            <button className="hidden sm:flex items-center gap-1.5 px-4 py-2 rounded-full border border-pink-200 bg-white/80 text-xs font-bold text-rose/70 hover:bg-blush transition">
              <Palette className="h-3.5 w-3.5" /> Customize
            </button>
            <button
              onClick={() => {
                setEditingNoteId(null);
                setNoteTitle("");
                setNoteText("");
                setNoteColor("sakura");
                setNoteTag("Self-care");
                setShowNoteForm(true);
                setTab("notes");
              }}
              className="bloom-luxury-btn inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white"
            >
              <Plus className="h-3.5 w-3.5" /> Add Note
            </button>
          </div>
        </div>
      </header>

      {/* TWO-COLUMN LAYOUT */}
      <div className="lg:grid lg:grid-cols-5 lg:gap-6 lg:items-start">

        {/* ── LEFT COLUMN (60%) ── */}
        <div className="lg:col-span-3 space-y-4">

          {/* TAB BAR + SEARCH */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="inline-flex rounded-full bg-white/90 p-1 border border-petal/60 shadow-sm">
              <button
                onClick={() => setTab("notes")}
                className={[
                  "rounded-full px-5 py-1.5 text-xs font-bold transition-all duration-200",
                  tab === "notes" ? "bg-hotpink text-white shadow-md shadow-pink-300/30" : "text-rose/80 hover:bg-blush",
                ].join(" ")}
              >
                ✿ Notes
              </button>
              <button
                onClick={() => setTab("reminders")}
                className={[
                  "rounded-full px-5 py-1.5 text-xs font-bold transition-all duration-200",
                  tab === "reminders" ? "bg-hotpink text-white shadow-md shadow-pink-300/30" : "text-rose/80 hover:bg-blush",
                ].join(" ")}
              >
                ⏰ Reminders
              </button>
            </div>

            <div className="relative flex-1 min-w-[130px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-rose/40 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search notes..."
                className="w-full bg-white/90 border border-pink-200 rounded-full pl-9 pr-4 py-2 text-xs text-[#831843] placeholder:text-[#9D5C7E]/40 outline-none focus:ring-2 focus:ring-hotpink/20 transition"
              />
            </div>

            {tab === "reminders" && (
              <button
                onClick={() => { resetReminderForm(); setShowReminderForm((v) => !v); }}
                className="bloom-luxury-btn inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white"
              >
                <Plus className="h-3.5 w-3.5" /> New Reminder
              </button>
            )}
          </div>

          {/* FILTER CHIPS — notes tab */}
          {tab === "notes" && (
            <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-0.5 flex-wrap">
              {["All", ...NOTE_TAGS].map((t) => (
                <button
                  key={t}
                  onClick={() => setSelectedTag(t)}
                  className={[
                    "inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-[10px] font-bold border transition whitespace-nowrap",
                    selectedTag === t
                      ? "bg-hotpink text-white border-transparent shadow-sm"
                      : "bg-white text-rose/70 border-pink-200 hover:bg-blush",
                  ].join(" ")}
                >
                  {t}
                  {t !== "All" && <ChevronDown className="h-2.5 w-2.5 opacity-60" />}
                </button>
              ))}
              <button className="ml-auto inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-[10px] font-bold border border-pink-200 bg-white text-rose/70 hover:bg-blush transition whitespace-nowrap">
                <Tag className="h-3 w-3" /> Filter
              </button>
            </div>
          )}

          {/* NOTE FORM */}
          {tab === "notes" && showNoteForm && (
            <form
              onSubmit={handleSaveNote}
              className="rounded-3xl border border-pink-200/50 bg-white/95 p-5 shadow-xl shadow-rose/10 animate-bloom-bounce"
            >
              <div className="flex justify-between items-center mb-3">
                <h3 className="font-script text-2xl text-hotpink">
                  {editingNoteId ? "Edit sticky note ✿" : "Create beautiful note ✿"}
                </h3>
                <button type="button" onClick={() => setShowNoteForm(false)} className="p-1 text-rose/50 hover:text-rose transition">
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-rose/60 mb-1">Title</label>
                  <input
                    type="text"
                    required
                    value={noteTitle}
                    onChange={(e) => setNoteTitle(e.target.value)}
                    placeholder="Title of note..."
                    className="w-full rounded-xl bg-white px-3 py-2 text-sm text-[#831843] placeholder:text-[#9D5C7E]/40 border border-pink-200 outline-none transition focus:ring-2 focus:ring-hotpink/20"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-rose/60 mb-1">Your thoughts</label>
                  <textarea
                    required
                    rows={3}
                    value={noteText}
                    onChange={(e) => setNoteText(e.target.value)}
                    placeholder={
                      noteTag === "To-do"
                        ? "[ ] Do something nice\n[ ] Take a walk\n[x] Drink water today"
                        : noteTag === "Ideas"
                        ? "💡 What if we built...\n✦ A new approach to...\n✦ Brainstorm freely..."
                        : noteTag === "Love"
                        ? "I am worthy of love...\nI choose joy today...\n💕 You are enough."
                        : "Scribble down your self-care routine, ideas, dreams..."
                    }
                    className="w-full rounded-xl bg-white px-3 py-2 text-sm text-[#831843] placeholder:text-[#9D5C7E]/40 border border-pink-200 outline-none transition focus:ring-2 focus:ring-hotpink/20"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-rose/60 mb-1">Category Tag</label>
                    <select
                      value={noteTag}
                      onChange={(e) => setNoteTag(e.target.value)}
                      className="w-full rounded-xl bg-white px-3 py-2 text-sm text-[#831843] border border-pink-200 outline-none transition focus:ring-2 focus:ring-hotpink/20"
                    >
                      {NOTE_TAGS.map((t) => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-rose/60 mb-1">Paper shade</label>
                    <div className="flex gap-1.5 py-1 flex-wrap">
                      {NOTE_COLORS.map((c) => (
                        <button
                          key={c.key}
                          type="button"
                          onClick={() => setNoteColor(c.key)}
                          aria-label={c.label}
                          title={c.label}
                          style={{ backgroundColor: c.accent }}
                          className={["h-5 w-5 rounded-full ring-offset-1 transition hover:scale-110", noteColor === c.key ? "ring-2 ring-hotpink" : "ring-0"].join(" ")}
                        />
                      ))}
                    </div>
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-3">
                  <button type="button" onClick={() => setShowNoteForm(false)} className="px-4 py-2 rounded-full border border-pink-200 text-xs font-bold text-rose/70 hover:bg-blush transition">
                    Cancel
                  </button>
                  <button type="submit" className="bloom-luxury-btn px-5 py-2 text-xs font-bold text-white">
                    Save note ✿
                  </button>
                </div>
              </div>
            </form>
          )}

          {/* REMINDER FORM */}
          {tab === "reminders" && showReminderForm && (
            <form
              onSubmit={handleSaveReminder}
              className="rounded-3xl border border-pink-200/50 bg-white/95 p-5 shadow-xl shadow-rose/10 animate-bloom-bounce space-y-4"
            >
              <div className="flex justify-between items-center">
                <h3 className="font-script text-2xl text-hotpink">
                  {editingReminderId ? "Edit gorgeous Reminder ✿" : "Set a smart nudge ✿"}
                </h3>
                <button type="button" onClick={() => setShowReminderForm(false)} className="p-1 text-rose/50 hover:text-rose transition">
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-rose/60 mb-1.5">What kind of reminder? ✿</label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {KIND_OPTIONS.map((k) => (
                      <button
                        key={k.key}
                        type="button"
                        onClick={() => setRemKind(k.key)}
                        className={["flex items-center gap-2 rounded-2xl border px-3 py-2.5 text-left transition", remKind === k.key ? "border-hotpink bg-hotpink/10 shadow-sm" : "border-pink-200 bg-white hover:bg-blush"].join(" ")}
                      >
                        <span className={["grid h-8 w-8 shrink-0 place-items-center rounded-xl", remKind === k.key ? "bg-hotpink text-white" : "bg-blush text-hotpink"].join(" ")}>
                          <k.Icon className="h-4 w-4" strokeWidth={1.8} />
                        </span>
                        <span className="min-w-0">
                          <span className="block text-xs font-bold text-rose">{k.label}</span>
                          <span className="block text-[10px] text-rose/50 truncate">{k.hint}</span>
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-rose/60 mb-1">
                    {remKind === "medication" ? "Medication or habit name" : remKind === "birthday" ? "Whose birthday?" : "Title"}
                  </label>
                  <input
                    type="text"
                    required
                    value={remTitle}
                    onChange={(e) => setRemTitle(e.target.value)}
                    placeholder={
                      remKind === "medication"
                        ? "e.g. Vitamin D, Iron pills, Allergy meds..."
                        : remKind === "birthday"
                          ? "e.g. Mom's birthday, Lina's birthday..."
                          : "e.g. Dentist appointment, Team meeting..."
                    }
                    className="w-full rounded-xl bg-white px-3 py-2 text-sm text-[#831843] placeholder:text-[#9D5C7E]/40 border border-pink-200 outline-none transition focus:ring-2 focus:ring-hotpink/20"
                  />
                </div>

                {remKind === "medication" && (
                  <>
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-rose/60 mb-1.5">Time(s) of day ✿</label>
                      <div className="flex flex-wrap items-center gap-2">
                        {remTimes.map((t, i) => (
                          <div key={i} className="flex items-center gap-1">
                            <CuteTimePicker value={t} onChange={(v) => setRemTimes((prev) => prev.map((x, idx) => (idx === i ? v : x)))} />
                            {remTimes.length > 1 && (
                              <button type="button" onClick={() => setRemTimes((prev) => prev.filter((_, idx) => idx !== i))} className="grid h-6 w-6 place-items-center rounded-full bg-blush text-rose/60 hover:text-hotpink hover:bg-petal transition">
                                <Minus className="h-3 w-3" />
                              </button>
                            )}
                          </div>
                        ))}
                        <button type="button" onClick={() => setRemTimes((prev) => [...prev, "09:00"])} className="inline-flex items-center gap-1 rounded-full bg-blush px-3 py-1.5 text-[11px] font-bold text-hotpink hover:bg-petal transition">
                          <Plus className="h-3 w-3" /> Add another time
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-rose/60 mb-1.5">How often? ✿</label>
                      <div className="inline-flex rounded-full bg-white p-1 border border-pink-200/70">
                        <button type="button" onClick={() => setRemEveryDay(true)} className={["rounded-full px-4 py-1.5 text-xs font-bold transition", remEveryDay ? "bg-hotpink text-white shadow-sm" : "text-rose/70 hover:bg-blush"].join(" ")}>Every day</button>
                        <button type="button" onClick={() => setRemEveryDay(false)} className={["rounded-full px-4 py-1.5 text-xs font-bold transition", !remEveryDay ? "bg-hotpink text-white shadow-sm" : "text-rose/70 hover:bg-blush"].join(" ")}>Choose days</button>
                      </div>
                      {!remEveryDay && (
                        <div className="mt-2.5 flex flex-wrap gap-1.5">
                          {WEEKDAYS.map((wd) => {
                            const active = remWeekdays.includes(wd.key);
                            return (
                              <button key={wd.key} type="button" title={wd.label} onClick={() => setRemWeekdays((prev) => (active ? prev.filter((d) => d !== wd.key) : [...prev, wd.key].sort()))} className={["grid h-8 w-8 place-items-center rounded-full text-xs font-bold border transition", active ? "bg-hotpink text-white border-hotpink shadow-sm" : "bg-white text-rose/60 border-pink-200 hover:bg-blush"].join(" ")}>
                                {wd.short}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </>
                )}

                {remKind === "birthday" && (
                  <>
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-rose/60 mb-1">Birthday date ✿</label>
                      <CuteDatePicker value={remDate} onChange={(v) => setRemDate(v || todayStr())} />
                      <p className="mt-1.5 text-[10px] text-rose/50 leading-snug">🎂 We'll remind you every year on this day, forever.</p>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-rose/60 mb-1">Anticipation ✿</label>
                      <select value={remLeadDays} onChange={(e) => setRemLeadDays(parseInt(e.target.value, 10))} className="w-full sm:w-auto rounded-xl bg-white px-3 py-2 text-sm text-[#831843] border border-pink-200 outline-none transition focus:ring-2 focus:ring-hotpink/20">
                        {LEAD_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                      </select>
                    </div>
                  </>
                )}

                {remKind === "event" && (
                  <>
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-rose/60 mb-1">Category</label>
                      <select value={remCategory} onChange={(e) => setRemCategory(e.target.value)} className="w-full rounded-xl bg-white px-3 py-2 text-sm text-[#831843] border border-pink-200 outline-none transition focus:ring-2 focus:ring-hotpink/20">
                        {EVENT_CATEGORIES.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
                      </select>
                    </div>
                    <label className="flex items-center gap-2 text-xs font-semibold text-rose/70">
                      <input type="checkbox" checked={remIsRange} onChange={(e) => setRemIsRange(e.target.checked)} className="h-4 w-4 rounded accent-hotpink" />
                      This spans multiple days (like a vacation)
                    </label>
                    <div className={["grid gap-3", remIsRange ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-1"].join(" ")}>
                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-rose/60 mb-1">{remIsRange ? "Starts ✿" : "Date ✿"}</label>
                        <CuteDatePicker value={remDate} onChange={(v) => setRemDate(v || todayStr())} />
                      </div>
                      {remIsRange && (
                        <div>
                          <label className="block text-[10px] font-bold uppercase tracking-wider text-rose/60 mb-1">Ends ✿</label>
                          <CuteDatePicker value={remEndDate} onChange={setRemEndDate} placeholder="Pick the end date" />
                        </div>
                      )}
                    </div>
                    <div>
                      <label className="flex items-center gap-2 text-xs font-semibold text-rose/70 mb-1.5">
                        <input type="checkbox" checked={remHasTime} onChange={(e) => setRemHasTime(e.target.checked)} className="h-4 w-4 rounded accent-hotpink" />
                        Add a specific time
                      </label>
                      {remHasTime && <CuteTimePicker value={remTime} onChange={setRemTime} />}
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-rose/60 mb-1">Anticipation ✿</label>
                      <select value={remLeadDays} onChange={(e) => setRemLeadDays(parseInt(e.target.value, 10))} className="w-full sm:w-auto rounded-xl bg-white px-3 py-2 text-sm text-[#831843] border border-pink-200 outline-none transition focus:ring-2 focus:ring-hotpink/20">
                        {LEAD_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                      </select>
                    </div>
                  </>
                )}

                <div className="flex justify-end gap-2 pt-3">
                  <button type="button" onClick={() => setShowReminderForm(false)} className="px-4 py-2 rounded-full border border-pink-200 text-xs font-bold text-rose/70 hover:bg-blush transition">Cancel</button>
                  <button type="submit" className="bloom-luxury-btn px-5 py-2 text-xs font-bold text-white">Save Reminder ✿</button>
                </div>
              </div>
            </form>
          )}

          {/* MOOD PICKER */}
          {tab === "notes" && showMoodPicker && (
            <div className="rounded-3xl border border-pink-200/50 bg-white/95 p-5 shadow-xl shadow-rose/10 animate-bloom-bounce">
              <div className="flex justify-between items-center mb-3">
                <h3 className="font-script text-2xl text-hotpink">How are you feeling? 💕</h3>
                <button type="button" onClick={() => setShowMoodPicker(false)} className="p-1 text-rose/50 hover:text-rose transition">
                  <X className="h-4 w-4" />
                </button>
              </div>
              <p className="text-[11px] text-rose/60 mb-3">Tap a mood — we'll save it as a quick note so you can track how you feel ✿</p>
              <div className="grid grid-cols-4 gap-2">
                {MOOD_OPTIONS.map((m) => (
                  <button
                    key={m.label}
                    onClick={() => {
                      const newNote: Note = {
                        id: Math.random().toString(36).slice(2, 10),
                        title: `${m.emoji} ${m.label}`,
                        text: `Feeling ${m.label.toLowerCase()} today 💕`,
                        color: m.color,
                        tag: "Self-care",
                        pinned: false,
                        createdAt: new Date().toISOString(),
                      };
                      setNotes((prev) => [newNote, ...prev]);
                      setShowMoodPicker(false);
                      setJustSaved(true);
                      setTimeout(() => setJustSaved(false), 1000);
                    }}
                    className="flex flex-col items-center gap-1.5 p-3 rounded-2xl bg-[#FFF0F6]/50 hover:bg-[#FFF0F6] border border-pink-100 hover:border-pink-200 transition active:scale-95"
                  >
                    <span className="text-2xl leading-none">{m.emoji}</span>
                    <span className="text-[9px] font-bold text-rose/70">{m.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ── NOTES MASONRY ── */}
          {tab === "notes" && (
            <div className="animate-fade-in">
              {filteredNotes.length === 0 ? (
                <div className="rounded-[2rem] bg-white/70 border border-petal/40 p-8 text-center flex flex-col items-center justify-center">
                  <span className="text-4xl mb-2">{selectedTag !== "All" ? (TAG_EMOJI[selectedTag] || "🌸") : "🌸"}</span>
                  <p className="text-sm text-rose font-medium">
                    {notes.length === 0
                      ? "Your canvas is empty — start writing ✿"
                      : selectedTag !== "All"
                      ? `No ${selectedTag} notes yet`
                      : "No notes match your filters!"}
                  </p>
                  {selectedTag === "Love" && (
                    <p className="text-xs text-rose/60 mt-1 max-w-[220px] leading-relaxed">
                      Love notes are your affirmations — little reminders that you are enough 💕
                    </p>
                  )}
                  {selectedTag === "Ideas" && (
                    <p className="text-xs text-rose/60 mt-1 max-w-[220px] leading-relaxed">
                      Dump your wildest ideas here — big dreams, random sparks, anything 💡
                    </p>
                  )}
                  <div className="flex gap-2 mt-4 flex-wrap justify-center">
                    <button
                      onClick={() => { setNoteTag(selectedTag !== "All" ? selectedTag : "Self-care"); setShowNoteForm(true); }}
                      className="bloom-luxury-btn px-4 py-2 text-xs font-bold text-white inline-flex items-center gap-1"
                    >
                      <Plus className="h-3.5 w-3.5" /> New note
                    </button>
                    {notes.length === 0 ? (
                      <button
                        onClick={handleSeedExamples}
                        className="px-4 py-2 rounded-full border border-pink-200 text-xs font-bold text-rose/70 hover:bg-blush transition"
                      >
                        Try all examples ✿
                      </button>
                    ) : selectedTag !== "All" && EXAMPLE_NOTES.find((n) => n.tag === selectedTag) && (
                      <button
                        onClick={() => {
                          const ex = EXAMPLE_NOTES.find((n) => n.tag === selectedTag);
                          if (ex) setNotes((prev) => [{ ...ex, id: Math.random().toString(36).slice(2, 10), createdAt: new Date().toISOString() }, ...prev]);
                        }}
                        className="px-4 py-2 rounded-full border border-pink-200 text-xs font-bold text-rose/70 hover:bg-blush transition"
                      >
                        Add {selectedTag} example ✿
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <>
                  <div className="columns-2 lg:columns-3 gap-3">
                    {filteredNotes.map((note, idx) => {
                      const shade = NOTE_COLORS.find((col) => col.key === note.color) || NOTE_COLORS[0];
                      const tagEmoji = TAG_EMOJI[note.tag] || "✨";
                      return (
                        <div
                          key={note.id}
                          className="break-inside-avoid mb-3 group"
                          style={{ animationDelay: `${idx * 60}ms` }}
                        >
                          <div
                            onClick={() => handleEditNote(note)}
                            className={[
                              "relative rounded-3xl border p-4 flex flex-col gap-2 shadow-sm transition hover:shadow-lg hover:-translate-y-1 duration-200 animate-scale-in overflow-hidden cursor-pointer",
                              shade.bg,
                              shade.border,
                            ].join(" ")}
                          >
                            {/* Cherry blossom corner decorator */}
                            <span className="absolute -top-2 -right-2 text-6xl pointer-events-none select-none rotate-12 leading-none"
                              style={{ opacity: shade.dark ? 0.18 : 0.13 }}>
                              🌸
                            </span>

                            {/* Top row: emoji + date + pin */}
                            <div className="flex items-start justify-between relative z-10">
                              <div className="flex items-center gap-1.5">
                                <span className="text-sm leading-none">{tagEmoji}</span>
                                <span className={["text-[9px] font-bold tracking-tight leading-none mt-0.5", shade.dark ? "text-white/50" : "text-rose/50"].join(" ")}>
                                  {new Date(note.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                                  {" · "}
                                  {new Date(note.createdAt).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}
                                </span>
                              </div>
                              <button
                                onClick={(e) => { e.stopPropagation(); handleTogglePin(note.id); }}
                                className={["p-1 rounded-full transition shrink-0", shade.dark ? "text-white/30 hover:text-white" : "text-rose/30 hover:text-hotpink hover:bg-white/60"].join(" ")}
                                title={note.pinned ? "Unpin" : "Pin"}
                              >
                                {note.pinned ? (
                                  <Pin className={["h-3 w-3", shade.dark ? "text-white" : "text-hotpink"].join(" ")} fill="currentColor" />
                                ) : (
                                  <PinOff className="h-3 w-3 opacity-0 group-hover:opacity-100 transition" />
                                )}
                              </button>
                            </div>

                            {/* Title */}
                            <h4 className={["font-script text-xl leading-tight relative z-10", shade.text].join(" ")}>
                              {note.title}
                            </h4>

                            {/* Body */}
                            {isTodoNote(note) ? (
                              <div className="space-y-1.5 relative z-10">
                                {parseTodoItems(note.text).map((item) => (
                                  <button
                                    key={item.lineIndex}
                                    onClick={(e) => { e.stopPropagation(); handleToggleTodoItem(note.id, item.lineIndex); }}
                                    className="flex items-start gap-2 w-full text-left"
                                  >
                                    <span className={["mt-0.5 h-3.5 w-3.5 shrink-0 rounded border-2 flex items-center justify-center transition", item.checked ? "bg-current border-current" : "border-current/40"].join(" ")} style={{ color: shade.accent ?? "#EC4899" }}>
                                      {item.checked && <Check className="h-2 w-2 text-white" strokeWidth={3} />}
                                    </span>
                                    <span className={["text-xs leading-relaxed transition", shade.body, item.checked ? "line-through opacity-40" : ""].join(" ")}>
                                      {item.label}
                                    </span>
                                  </button>
                                ))}
                              </div>
                            ) : (
                              <p className={["text-xs font-medium whitespace-pre-wrap leading-relaxed line-clamp-5 relative z-10", shade.body].join(" ")}>
                                {note.tag === "Ideas" && "💡 "}
                                {note.tag === "Love" && "💕 "}
                                {note.text}
                              </p>
                            )}

                            {/* Footer */}
                            <div className={["flex items-center justify-between mt-1 pt-2 border-t relative z-10", shade.dark ? "border-white/10" : "border-pink-200/25"].join(" ")}>
                              <span className={["inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border", shade.dark ? "text-white/60 bg-white/10 border-white/10" : "text-rose/50 bg-white/70 border-pink-100"].join(" ")}>
                                {tagEmoji} {note.tag}
                              </span>
                              <div className="flex gap-1">
                                <button
                                  onClick={(e) => { e.stopPropagation(); handleEditNote(note); }}
                                  className={["p-1 rounded-full transition", shade.dark ? "bg-white/10 text-white hover:bg-white/25" : "bg-white/60 text-rose hover:text-hotpink hover:bg-white"].join(" ")}
                                  title="Edit"
                                >
                                  <Edit3 className="h-3 w-3" />
                                </button>
                                <button
                                  onClick={(e) => { e.stopPropagation(); handleDeleteNote(note.id); }}
                                  className={["p-1 rounded-full transition", shade.dark ? "bg-white/10 text-white hover:bg-red-400/30" : "bg-white/60 text-rose hover:text-[#F87171] hover:bg-white"].join(" ")}
                                  title="Delete"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div className="text-center mt-1">
                    <button
                      onClick={() => setSelectedTag("All")}
                      className="text-xs text-hotpink font-bold hover:underline transition"
                    >
                      View all notes →
                    </button>
                  </div>
                </>
              )}
            </div>
          )}

          {/* ── REMINDERS TAB ── */}
          {tab === "reminders" && (
            <div className="animate-fade-in space-y-4">
              {sortedReminders.length === 0 ? (
                <div className="rounded-[2rem] bg-white/70 border border-petal/40 p-8 text-center flex flex-col items-center justify-center">
                  <span className="text-4xl mb-2">🌸</span>
                  <p className="text-sm text-rose italic">All clear! No upcoming nudges.</p>
                  <button
                    onClick={() => setShowReminderForm(true)}
                    className="bloom-luxury-btn mt-4 px-4 py-2 text-xs font-bold text-white inline-flex items-center gap-1"
                  >
                    <Plus className="h-3.5 w-3.5" /> + New reminder
                  </button>
                </div>
              ) : (
                <>
                  <div className="columns-2 lg:columns-3 gap-3">
                    {sortedReminders.map((rem, idx) => {
                      const style = reminderCardStyle(rem);
                      const visual = reminderVisual(rem);
                      const age = turningAge(rem);
                      const dateLabel = rem.kind === "medication"
                        ? [...rem.times].sort().join(" · ")
                        : rem.kind === "birthday"
                          ? prettyMonthDay(rem.date)
                          : rem.endDate
                            ? `${prettyDate(rem.date)} → ${prettyDate(rem.endDate)}`
                            : prettyDate(rem.date);
                      return (
                        <div key={rem.id} className="break-inside-avoid mb-3 group" style={{ animationDelay: `${idx * 60}ms` }}>
                          <div onClick={() => handleEditReminder(rem)} className={["relative rounded-3xl border p-4 flex flex-col gap-2 shadow-sm transition hover:shadow-lg hover:-translate-y-1 duration-200 animate-scale-in overflow-hidden cursor-pointer", style.bg, style.border].join(" ")}>
                            {/* Cherry blossom decorator */}
                            <span className="absolute -top-2 -right-2 text-6xl opacity-10 pointer-events-none select-none rotate-12 leading-none">🌸</span>

                            {/* Top: kind emoji + date */}
                            <div className="flex items-start justify-between relative z-10">
                              <div className="flex items-center gap-1.5">
                                <span className="text-sm leading-none">{style.bloom}</span>
                                <span className={["text-[9px] font-bold tracking-tight leading-none mt-0.5", style.body].join(" ")}>
                                  {dateLabel}
                                </span>
                              </div>
                              {rem.kind === "event" && (
                                <button
                                  onClick={(e) => { e.stopPropagation(); handleToggleReminderDone(rem.id); }}
                                  className="h-5 w-5 shrink-0 rounded-full border-2 border-current opacity-40 hover:opacity-100 transition flex items-center justify-center"
                                  style={{ color: "currentColor" }}
                                  title="Mark done"
                                />
                              )}
                            </div>

                            {/* Title */}
                            <h4 className={["font-script text-xl leading-tight relative z-10", style.text].join(" ")}>
                              {rem.title}
                              {age !== null && <span className="font-normal text-sm ml-1">· turning {age} ✿</span>}
                            </h4>

                            {/* Detail line */}
                            <p className={["text-xs font-medium leading-relaxed relative z-10", style.body].join(" ")}>
                              {rem.kind === "medication"
                                ? `${weekdaysLabel(rem.weekdays)} · ${rem.times.length} dose${rem.times.length > 1 ? "s" : ""}/day`
                                : rem.kind === "birthday"
                                  ? "Repeats every year 🎂"
                                  : rem.time
                                    ? `${rem.time}${rem.leadDays > 0 ? ` · ${rem.leadDays}d heads-up` : ""}`
                                    : rem.leadDays > 0
                                      ? `${rem.leadDays}d heads-up`
                                      : visual.label}
                            </p>

                            {/* Footer */}
                            <div className={["flex items-center justify-between mt-1 pt-2 border-t relative z-10 border-current/10"].join(" ")}>
                              <span className={["inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full", visual.color].join(" ")}>
                                <visual.Icon className="h-2.5 w-2.5" /> {visual.label}
                              </span>
                              <div className="flex gap-1">
                                <button onClick={(e) => { e.stopPropagation(); handleEditReminder(rem); }} className="p-1 rounded-full bg-white/60 text-rose hover:text-hotpink hover:bg-white transition" title="Edit">
                                  <Edit3 className="h-3 w-3" />
                                </button>
                                <button onClick={(e) => { e.stopPropagation(); handleDeleteReminder(rem.id); }} className="p-1 rounded-full bg-white/60 text-rose hover:text-[#F87171] hover:bg-white transition" title="Delete">
                                  <Trash2 className="h-3 w-3" />
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
              {completedReminders.length > 0 && (
                <div className="overflow-hidden rounded-[2rem] border border-pink-100 bg-white/70 shadow-sm animate-fade-in">
                  <button
                    type="button"
                    onClick={() => setDoneCollapsed(!doneCollapsed)}
                    className="w-full flex items-center justify-between px-5 py-4 hover:bg-white/40 transition text-left"
                  >
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-5 w-5 text-hotpink" />
                      <span className="font-script text-xl sm:text-2xl text-hotpink">
                        Completed reminders ({completedReminders.length})
                      </span>
                    </div>
                    {doneCollapsed ? <ChevronDown className="h-4 w-4 text-hotpink" /> : <ChevronUp className="h-4 w-4 text-hotpink" />}
                  </button>
                  {!doneCollapsed && (
                    <div className="p-4 sm:p-5 border-t border-pink-200/20 bg-white/45 space-y-2">
                      {completedReminders.map((rem) => (
                        <div key={rem.id} className="flex items-center justify-between rounded-xl bg-white/60 p-2.5 px-3 border border-pink-200/20 shadow-sm transition animate-scale-in">
                          <div className="flex items-center gap-3.5 min-w-0 opacity-60">
                            <button type="button" onClick={() => handleToggleReminderDone(rem.id)} className="p-1 h-5 w-5 shrink-0 rounded-full bg-hotpink text-white flex items-center justify-center transition" title="Undo completion">
                              <Check className="h-3 w-3 text-white" strokeWidth={3} />
                            </button>
                            <div className="min-w-0">
                              <h4 className="font-semibold text-rose text-xs line-through truncate leading-normal">{rem.title}</h4>
                              <p className="text-[9px] text-rose/50 mt-0.5 font-semibold">completed ✿ {prettyDate(rem.date)}{rem.time ? ` @ ${rem.time}` : ""}</p>
                            </div>
                          </div>
                          <button onClick={() => handleDeleteReminder(rem.id)} className="p-1 text-rose/50 hover:text-[#F87171] transition" title="Delete">
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── RIGHT PANEL (40%) ── */}
        <aside className="hidden lg:flex lg:col-span-2 lg:sticky lg:top-4 flex-col gap-4 mt-0">

          {/* QUICK CAPTURE */}
          <div className="rounded-3xl bg-white/95 border border-pink-200/60 p-4 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-[#831843]">Quick Capture</h3>
              <Edit3 className="h-4 w-4 text-rose/30" />
            </div>
            <div className="grid grid-cols-4 gap-2">
              {[
                { icon: Edit3,    label: "Note",    color: "bg-[#FCE7F3] text-hotpink",      onClick: () => { setTab("notes"); setEditingNoteId(null); setNoteTitle(""); setNoteText(""); setNoteColor("sakura"); setNoteTag("Self-care"); setShowNoteForm(true); setShowMoodPicker(false); } },
                { icon: Bell,     label: "Remind",  color: "bg-[#FBCFE8] text-[#DB2777]",    onClick: () => { setTab("reminders"); resetReminderForm(); setShowReminderForm(true); } },
                { icon: Heart,    label: "Mood",    color: "bg-[#F9A8D4] text-[#BE185D]",    onClick: () => { setTab("notes"); setShowMoodPicker(true); setShowNoteForm(false); } },
                { icon: Sparkles, label: "Insight", color: "bg-[#EC4899]/20 text-[#9D174D]", onClick: () => { setTab("notes"); setNoteTag("Ideas"); setShowNoteForm(true); setShowMoodPicker(false); } },
              ].map(({ icon: Icon, label, color, onClick }) => (
                <button
                  key={label}
                  onClick={onClick}
                  className="flex flex-col items-center gap-1.5 p-2.5 rounded-2xl bg-[#FFF0F6]/50 hover:bg-[#FFF0F6] border border-pink-100/60 hover:border-pink-200 transition active:scale-95"
                >
                  <span className={["grid h-8 w-8 place-items-center rounded-xl", color].join(" ")}>
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="text-[9px] font-bold text-rose/70">{label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* NOTES THIS WEEK */}
          <div className="rounded-3xl bg-white/95 border border-pink-200/60 p-4 shadow-sm">
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-sm font-bold text-[#831843]">Notes This Week</h3>
              <span className="text-[10px] font-bold text-hotpink bg-pink-50 px-2 py-0.5 rounded-full border border-pink-100">
                {notes.filter((n) => {
                  const d = new Date(n.createdAt);
                  const weekAgo = new Date();
                  weekAgo.setDate(weekAgo.getDate() - 7);
                  return d >= weekAgo;
                }).length} notes
              </span>
            </div>
            <svg viewBox="0 0 160 44" className="w-full h-11 mt-2" preserveAspectRatio="none">
              <defs>
                <linearGradient id="sparkGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#EC4899" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="#EC4899" stopOpacity="0" />
                </linearGradient>
              </defs>
              <path
                d="M0,38 C18,34 30,24 50,26 C70,28 85,12 105,10 C120,8 140,18 160,14"
                fill="none"
                stroke="#EC4899"
                strokeWidth="2"
                strokeLinecap="round"
              />
              <path
                d="M0,38 C18,34 30,24 50,26 C70,28 85,12 105,10 C120,8 140,18 160,14 L160,44 L0,44 Z"
                fill="url(#sparkGrad)"
              />
            </svg>
            <div className="flex justify-between mt-1">
              {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => (
                <span key={i} className="text-[9px] text-rose/40 font-bold">{d}</span>
              ))}
            </div>
          </div>

          {/* PINNED REMINDERS */}
          <div className="rounded-3xl bg-white/95 border border-pink-200/60 p-4 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-[#831843]">Pinned Reminders</h3>
              <button
                onClick={() => setTab("reminders")}
                className="text-[10px] text-hotpink font-bold hover:underline transition"
              >
                View All
              </button>
            </div>
            {sortedReminders.length === 0 ? (
              <div className="py-4 text-center">
                <p className="text-[11px] text-rose/50">No upcoming reminders</p>
                <button
                  onClick={() => { setTab("reminders"); resetReminderForm(); setShowReminderForm(true); }}
                  className="mt-2 text-[10px] text-hotpink font-bold hover:underline"
                >
                  + Add reminder
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {sortedReminders.slice(0, 4).map((rem) => {
                  const visual = reminderVisual(rem);
                  const gradients = [
                    "from-[#FCE7F3] to-[#FFF0F6]",
                    "from-[#EDE9FE] to-[#F3E8FF]",
                    "from-[#D1FAE5] to-[#ECFDF5]",
                    "from-[#FEF3C7] to-[#FEFCE8]",
                  ];
                  const gi = sortedReminders.indexOf(rem) % gradients.length;
                  return (
                    <div
                      key={rem.id}
                      className={["rounded-2xl bg-gradient-to-br p-3 border border-pink-100/80 flex flex-col gap-1.5 relative overflow-hidden transition hover:-translate-y-0.5 hover:shadow-sm", gradients[gi]].join(" ")}
                    >
                      <span className="absolute top-1 right-1 text-2xl opacity-15 pointer-events-none select-none">🌸</span>
                      <span className={["grid h-7 w-7 place-items-center rounded-xl text-xs shrink-0", visual.color].join(" ")}>
                        <visual.Icon className="h-3.5 w-3.5" strokeWidth={1.8} />
                      </span>
                      <p className="text-[10px] font-bold text-[#831843] leading-tight line-clamp-2 pr-2">{rem.title}</p>
                      <p className="text-[9px] text-rose/60 font-semibold truncate">
                        {rem.kind === "medication"
                          ? [...rem.times].sort()[0]
                          : rem.kind === "birthday"
                            ? prettyMonthDay(rem.date)
                            : prettyDate(rem.date)}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* QUICK SUGGESTIONS */}
          <div className="rounded-3xl bg-white/95 border border-pink-200/60 p-4 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-bold text-[#831843]">Quick Reminder Ideas ✿</h3>
              <Bell className="h-4 w-4 text-rose/30" />
            </div>
            <p className="text-[10px] text-rose/50 mb-3">Tap to instantly pre-fill a reminder</p>
            <div className="space-y-1.5">
              {QUICK_SUGGESTIONS.map((s) => (
                <button
                  key={s.label}
                  onClick={() => applyQuickSuggestion(s)}
                  className="w-full flex items-center gap-2.5 p-2 rounded-2xl bg-[#FFF0F6]/60 hover:bg-[#FFF0F6] border border-pink-100 hover:border-pink-200 transition active:scale-95 text-left"
                >
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-[#FCE7F3] to-[#FBCFE8] text-hotpink border border-pink-200/50">
                    <s.Icon className="h-3.5 w-3.5" />
                  </span>
                  <span className="text-[11px] font-bold text-[#831843] truncate flex-1">{s.label}</span>
                  <Plus className="h-3 w-3 text-hotpink shrink-0" />
                </button>
              ))}
            </div>
          </div>

          {/* YOUR THOUGHTS */}
          <div className="rounded-3xl bg-gradient-to-br from-[#F9A8D4] via-[#FCE7F3] to-[#DDD6FE] border border-pink-200/60 p-5 shadow-sm relative overflow-hidden">
            <div className="absolute -bottom-3 -right-3 text-8xl opacity-20 pointer-events-none select-none rotate-[-20deg] leading-none">🌸</div>
            <div className="absolute top-2 right-2 text-3xl opacity-25 pointer-events-none select-none">🌷</div>
            <p className="text-[10px] font-bold text-white/70 uppercase tracking-widest mb-1 relative z-10">Your Thoughts</p>
            <p className="text-sm font-bold text-white leading-snug relative z-10">
              Your thoughts shape the world you live in.
            </p>
            <p className="text-[11px] text-white/80 mt-1 leading-relaxed relative z-10">Choose the beautiful life ✨</p>
            {notes.length > 0 && (
              <div className="mt-3 p-2.5 rounded-2xl bg-white/25 border border-white/30 relative z-10">
                <p className="text-[10px] text-white/80 line-clamp-2 italic">"{notes[0].text}"</p>
                <p className="text-[9px] text-white font-bold mt-1 opacity-90">{notes[0].title}</p>
              </div>
            )}
            <button
              onClick={() => {
                setEditingNoteId(null);
                setNoteTitle("");
                setNoteText("");
                setNoteColor("sakura");
                setNoteTag("Self-care");
                setShowNoteForm(true);
                setTab("notes");
              }}
              className="mt-3 bg-white/30 hover:bg-white/50 transition border border-white/40 text-white px-3 py-1.5 text-[10px] font-bold rounded-full relative z-10"
            >
              + Add thought
            </button>
          </div>
        </aside>
      </div>

      {/* MOBILE / TABLET QUICK PANEL (hidden on desktop) */}
      <div className="lg:hidden mt-6 space-y-4">
        {/* Mood Picker for mobile */}
        {showMoodPicker && (
          <div className="rounded-3xl border border-pink-200/50 bg-white/95 p-4 shadow-xl animate-bloom-bounce">
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-script text-xl text-hotpink">How are you feeling? 💕</h3>
              <button type="button" onClick={() => setShowMoodPicker(false)} className="p-1 text-rose/50 hover:text-rose transition"><X className="h-4 w-4" /></button>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {MOOD_OPTIONS.map((m) => (
                <button
                  key={m.label}
                  onClick={() => {
                    const newNote: Note = {
                      id: Math.random().toString(36).slice(2, 10),
                      title: `${m.emoji} ${m.label}`,
                      text: `Feeling ${m.label.toLowerCase()} today 💕`,
                      color: m.color,
                      tag: "Self-care",
                      pinned: false,
                      createdAt: new Date().toISOString(),
                    };
                    setNotes((prev) => [newNote, ...prev]);
                    setShowMoodPicker(false);
                    setJustSaved(true);
                    setTimeout(() => setJustSaved(false), 1000);
                  }}
                  className="flex flex-col items-center gap-1 p-2.5 rounded-2xl bg-[#FFF0F6]/50 hover:bg-[#FFF0F6] border border-pink-100 transition active:scale-95"
                >
                  <span className="text-xl leading-none">{m.emoji}</span>
                  <span className="text-[9px] font-bold text-rose/70">{m.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Quick Capture strip */}
        <div className="rounded-3xl bg-white/95 border border-pink-200/60 p-4 shadow-sm">
          <h3 className="text-xs font-bold text-[#831843] mb-3">Quick Capture</h3>
          <div className="flex gap-2 overflow-x-auto scrollbar-none pb-1">
            {[
              { icon: Edit3,    label: "Note",    color: "bg-[#FCE7F3] text-hotpink",      onClick: () => { setTab("notes"); setEditingNoteId(null); setNoteTitle(""); setNoteText(""); setNoteColor("sakura"); setNoteTag("Self-care"); setShowNoteForm(true); setShowMoodPicker(false); } },
              { icon: Bell,     label: "Remind",  color: "bg-[#FBCFE8] text-[#DB2777]",    onClick: () => { setTab("reminders"); resetReminderForm(); setShowReminderForm(true); } },
              { icon: Heart,    label: "Mood",    color: "bg-[#F9A8D4] text-[#BE185D]",    onClick: () => { setTab("notes"); setShowMoodPicker(true); setShowNoteForm(false); } },
              { icon: Sparkles, label: "Insight", color: "bg-[#EC4899]/20 text-[#9D174D]", onClick: () => { setTab("notes"); setNoteTag("Ideas"); setShowNoteForm(true); setShowMoodPicker(false); } },
            ].map(({ icon: Icon, label, color, onClick }) => (
              <button
                key={label}
                onClick={onClick}
                className="flex flex-col items-center gap-1.5 p-3 rounded-2xl bg-[#FFF0F6]/50 hover:bg-[#FFF0F6] border border-pink-100 transition active:scale-95 shrink-0 min-w-[64px]"
              >
                <span className={["grid h-8 w-8 place-items-center rounded-xl", color].join(" ")}>
                  <Icon className="h-4 w-4" />
                </span>
                <span className="text-[9px] font-bold text-rose/70">{label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Quick Reminder Ideas strip */}
        <div className="rounded-3xl bg-white/95 border border-pink-200/60 p-4 shadow-sm">
          <h3 className="text-xs font-bold text-[#831843] mb-3">Quick Reminder Ideas ✿</h3>
          <div className="flex gap-2 overflow-x-auto scrollbar-none pb-1">
            {QUICK_SUGGESTIONS.map((s) => (
              <button
                key={s.label}
                onClick={() => applyQuickSuggestion(s)}
                className="flex flex-col items-center gap-1.5 px-3 py-2.5 rounded-2xl bg-[#FFF0F6]/80 border border-pink-100 hover:border-pink-200 transition active:scale-95 shrink-0"
              >
                <span className="grid h-8 w-8 place-items-center rounded-xl bg-gradient-to-br from-[#FCE7F3] to-[#FBCFE8] text-hotpink border border-pink-200/50">
                  <s.Icon className="h-4 w-4" />
                </span>
                <span className="text-[9px] font-bold text-rose/70 whitespace-nowrap">{s.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes bloom-bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-3px); }
        }
        .animate-bloom-bounce {
          animation: bloom-bounce 3.5s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}

