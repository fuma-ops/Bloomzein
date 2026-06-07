import { useEffect, useState, useMemo } from "react";
import { 
  ArrowLeft, Search, Pin, PinOff, Plus, Minus, Trash2, Edit3, CheckCircle2,
  Sparkles, Bell, BellRing, Smartphone, Check, Calendar, Clock,
  Heart, Palette, Tag, AlertCircle, X, ChevronDown, ChevronUp, RotateCcw,
  Pill, Users, Sparkle, Cake, Stethoscope, Plane, Briefcase, CalendarClock, type LucideIcon
} from "lucide-react";
import { CuteDatePicker } from "@/components/bloom/CuteDatePicker";
import { CuteTimePicker } from "@/components/bloom/CutePicker";
import { BloomBubbles } from "@/components/bloom/BloomBubbles";

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

type ReminderKind = "medication" | "birthday" | "event";

interface Reminder {
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
  createdAt: string;
}

const NOTE_COLORS = [
  { key: "sakura", label: "Sakura Blush", bg: "bg-[#FFF0F6]/95", border: "border-[#FBCFE8]", text: "text-[#831843]", accent: "#EC4899" },
  { key: "lavender", label: "Lavender Glow", bg: "bg-[#F3E8FF]/95", border: "border-[#D8B4FE]", text: "text-[#5B21B6]", accent: "#8B5CF6" },
  { key: "mint", label: "Mint Whisper", bg: "bg-[#ECFDF5]/95", border: "border-[#A7F3D0]", text: "text-[#065F46]", accent: "#10B981" },
  { key: "lemon", label: "Lemon Custard", bg: "bg-[#FEFCE8]/95", border: "border-[#FDE047]", text: "text-[#854D0E]", accent: "#EAB308" },
  { key: "peach", label: "Peach Cream", bg: "bg-[#FFF5F5]/95", border: "border-[#FECACA]", text: "text-[#9C4221]", accent: "#F97316" },
];

const NOTE_TAGS = ["Self-care", "Ideas", "To-do", "Love", "Other"];

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

const STORAGE_KEYS = {
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

  // Welcome state (Guided Start)
  const [welcomed, setWelcomed] = useState<boolean>(() => {
    try {
      const val = localStorage.getItem(STORAGE_KEYS.welcomed);
      return val === "true";
    } catch {
      return false;
    }
  });

  // Notification Permissions state
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

  // PWA banner state
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
  // event & birthday date
  const [remDate, setRemDate] = useState(() => todayStr());
  const [remIsRange, setRemIsRange] = useState(false);
  const [remEndDate, setRemEndDate] = useState("");
  const [remHasTime, setRemHasTime] = useState(false);
  const [remTime, setRemTime] = useState("09:00");
  // medication recurrence
  const [remTimes, setRemTimes] = useState<string[]>(["09:00"]);
  const [remEveryDay, setRemEveryDay] = useState(true);
  const [remWeekdays, setRemWeekdays] = useState<number[]>([]);
  // shared anticipation
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

  // Completed section collapsed state
  const [doneCollapsed, setDoneCollapsed] = useState(true);

  // In-app alert banner
  const [activeAlert, setActiveAlert] = useState<{ id: string; title: string; category: string } | null>(null);

  // Sparkle animation triggers
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

    // Reset Form
    setNoteTitle("");
    setNoteText("");
    setNoteColor("sakura");
    setNoteTag("Self-care");
    setShowNoteForm(false);

    // Anim
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

  const handleSaveReminder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!remTitle.trim()) return;
    if (remKind === "event" && remIsRange && remEndDate && remEndDate < remDate) return;

    // A reminder is only useful if we can actually nudge the user — ask right
    // when she creates one (a real user gesture), not just on a banner she may dismiss.
    if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "default") {
      Notification.requestPermission().then((perm) => {
        setNotifPermission(perm);
        setPromptNotif(false);
        try { localStorage.setItem(STORAGE_KEYS.permissionDismissed, "true"); } catch {}
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

    // Anim
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

  const handleToggleReminderDone = (id: string) => {
    setReminders((prev) =>
      prev.map((r) => (r.id === id && r.kind === "event" ? { ...r, done: !r.done } : r))
    );
    // Visual sparkle confirmation
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

  // Smart Reminder Checker Loop — understands medication recurrence, yearly birthdays,
  // one-off/range events, and "remind me X days before" anticipation for all of them.
  useEffect(() => {
    const fireAlert = (rem: Reminder, body: string) => {
      if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
        try {
          new Notification("BloomyGirl Nudge ✿", { body: `${body} 💕`, icon: "/images/me-avatar.png" });
        } catch (e) {
          console.error("Browser notification failed to fire:", e);
        }
      }
      setActiveAlert({ id: rem.id, title: rem.title, category: rem.kind === "event" ? rem.category : rem.kind });
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
            if (rem.notifiedKey === key) return rem;
            changed = true;
            fireAlert(rem, `Time to take ${rem.title} · ${dueSlot}`);
            return { ...rem, notifiedKey: key };
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

    // Initial check, then every 30s
    checkReminders();
    const interval = setInterval(checkReminders, 30000);
    return () => clearInterval(interval);
  }, []);

  /* ============================================================
     MEMOIZED SELECTIONS & FILTERING
     ============================================================ */
  const filteredNotes = useMemo(() => {
    let list = notes;

    // Search query Filter
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (n) =>
          n.title.toLowerCase().includes(q) ||
          n.text.toLowerCase().includes(q) ||
          n.tag.toLowerCase().includes(q)
      );
    }

    // Tag filter
    if (selectedTag !== "All") {
      list = list.filter((n) => n.tag === selectedTag);
    }

    // Sort: pinned to the top, then newest created date first
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

  return (
    <div className="relative animate-fade-in min-h-screen">
      <BloomBubbles count={12} />

      {/* HEADER PAGE */}
      <header className="mb-4 sm:mb-6">
        <div className="flex items-center gap-1.5 text-xs text-rose/70 font-semibold mb-2">
          <a href="/app/tools" className="hover:text-hotpink flex items-center gap-1 transition">
            <ArrowLeft className="h-3 w-3" /> All tools
          </a>
          <span>/</span>
          <span className="text-hotpink">Notes & Reminders</span>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-script text-4xl sm:text-6xl text-hotpink leading-none">Notes & Reminders</h1>
            <p className="mt-1 text-xs sm:text-sm text-rose/80">Scribble thoughts, set dreamy nudges ✿</p>
          </div>
          {justSaved && (
            <span className="flex items-center gap-1 bg-white/95 px-3 py-1.5 rounded-full text-xs font-bold text-hotpink border border-pink-200 animate-scale-in">
              <Sparkles className="h-3.5 w-3.5 text-hotpink animate-spin" /> Saved!
            </span>
          )}
        </div>
      </header>

      {/* IN-APP INLINE REALTIME MODAL ALERT */}
      {activeAlert && (
        <div className="fixed inset-x-4 top-16 z-50 md:left-auto md:right-4 md:w-96 rounded-3xl bg-white border border-pink-200 p-5 shadow-2xl animate-bloom-bounce">
          <div className="flex items-start gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-hotpink/10 text-hotpink animate-pulse">
              <BellRing className="h-5 w-5" />
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-wider text-hotpink">Gentle Bloom Nudge</p>
              <h4 className="font-semibold text-rose text-sm truncate">{activeAlert.title}</h4>
              <p className="text-xs text-rose/70 mt-0.5">It's time to bloom! 💕</p>
              <div className="flex gap-2 mt-4">
                <button
                  onClick={() => {
                    handleToggleReminderDone(activeAlert.id);
                    setActiveAlert(null);
                  }}
                  className="px-3 py-1.5 bg-hotpink text-white text-xs font-bold rounded-full hover:bg-magenta transition flex-1"
                >
                  Mark done ✿
                </button>
                <button
                  onClick={() => setActiveAlert(null)}
                  className="px-3 py-1.5 bg-blush text-hotpink text-xs font-bold rounded-full hover:bg-petal transition"
                >
                  Dismiss
                </button>
              </div>
            </div>
            <button onClick={() => setActiveAlert(null)} className="text-rose/40 hover:text-rose transition">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* THE PWA BANNER & GENTLE PROMPTS */}
      <div className="flex flex-col gap-3 mb-6">
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
                  <button
                    onClick={handleRequestNotifPermission}
                    className="px-3 py-1.5 bg-hotpink text-white text-[10px] font-bold rounded-full hover:bg-magenta transition shadow-md shadow-pink-300"
                  >
                    Enable Nudges ✿
                  </button>
                  <button
                    onClick={handleDismissNotifPrompt}
                    className="px-3 py-1.5 bg-white/75 text-rose text-[10px] font-bold rounded-full hover:bg-white transition"
                  >
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

      {/* GUIDED START FIRST VISIT */}
      {!welcomed && (
        <div className="mb-6 rounded-[1.75rem] border border-[#EC4899]/20 bg-white/90 backdrop-blur p-5 sm:p-6 shadow-md animate-fade-in">
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
              <button
                onClick={handleStartHere}
                className="mt-4 px-4 py-1.5 bg-hotpink text-white rounded-full text-xs font-bold shadow-md shadow-hotpink/20 hover:bg-magenta transition"
              >
                Start Here ✿
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PILL-TAB MENU HEADER Toggle (Sticky tab list matching cycle/budget app tracker) */}
      <div className="sticky top-0 z-30 -mx-3 px-3 py-2 border-b border-pink-200/20 bg-[#FFF0F6]/85 backdrop-blur-md flex justify-between items-center mb-5 md:static md:-mx-0 md:px-0 md:bg-transparent md:border-b-0">
        <div className="inline-flex rounded-full bg-white/90 p-1 border border-petal/60 shadow-sm">
          <button
            onClick={() => setTab("notes")}
            className={[
              "rounded-full px-5 py-1.5 text-xs font-bold transition-all duration-200",
              tab === "notes" ? "bg-hotpink text-white shadow-md shadow-pink-300/30" : "text-rose/80 hover:bg-blush"
            ].join(" ")}
          >
            ✿ Notes
          </button>
          <button
            onClick={() => setTab("reminders")}
            className={[
              "rounded-full px-5 py-1.5 text-xs font-bold transition-all duration-200",
              tab === "reminders" ? "bg-hotpink text-white shadow-md shadow-pink-300/30" : "text-rose/80 hover:bg-blush"
            ].join(" ")}
          >
            ⏰ Reminders
          </button>
        </div>

        <div>
          {tab === "notes" && (
            <button
              onClick={() => {
                setEditingNoteId(null);
                setNoteTitle("");
                setNoteText("");
                setNoteColor("sakura");
                setNoteTag("Self-care");
                setShowNoteForm((v) => !v);
              }}
              className="inline-flex items-center gap-1.5 rounded-full bg-hotpink px-4 py-1.5 text-xs font-bold text-white shadow-md hover:bg-magenta hover:scale-105 transition"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>{showNoteForm ? "Close Form" : "New Note"}</span>
            </button>
          )}
          {tab === "reminders" && (
            <button
              onClick={() => {
                resetReminderForm();
                setShowReminderForm((v) => {
                  const next = !v;
                  if (
                    next &&
                    typeof window !== "undefined" &&
                    "Notification" in window &&
                    Notification.permission === "default"
                  ) {
                    setPromptNotif(true);
                  }
                  return next;
                });
              }}
              className="inline-flex items-center gap-1.5 rounded-full bg-hotpink px-4 py-1.5 text-xs font-bold text-white shadow-md hover:bg-magenta hover:scale-105 transition"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>{showReminderForm ? "Close Form" : "New Reminder"}</span>
            </button>
          )}
        </div>
      </div>

      {/* CONTENT SWITCHER (with smooth fades) */}
      <div className="transition-all duration-300">
        
        {/* ==================== NOTES TAB ==================== */}
        {tab === "notes" && (
          <div className="animate-fade-in space-y-5">
            {/* INLINE FORM FOR NEW / EDIT NOTE */}
            {showNoteForm && (
              <form
                onSubmit={handleSaveNote}
                className="rounded-3xl border border-pink-200/50 bg-white/95 p-5 shadow-xl shadow-rose/10 animate-bloom-bounce"
              >
                <div className="flex justify-between items-center mb-3">
                  <h3 className="font-script text-2xl text-hotpink">
                    {editingNoteId ? "Edit sticky note ✿" : "Create beautiful note ✿"}
                  </h3>
                  <button
                    type="button"
                    onClick={() => setShowNoteForm(false)}
                    className="p-1 text-rose/50 hover:text-rose transition"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <div className="space-y-3">
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-rose/60 mb-1">
                      Title
                    </label>
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
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-rose/60 mb-1">
                      Your thoughts
                    </label>
                    <textarea
                      required
                      rows={3}
                      value={noteText}
                      onChange={(e) => setNoteText(e.target.value)}
                      placeholder="Scribble down your self-care routine, ideas, dreams..."
                      className="w-full rounded-xl bg-white px-3 py-2 text-sm text-[#831843] placeholder:text-[#9D5C7E]/40 border border-pink-200 outline-none transition focus:ring-2 focus:ring-hotpink/20"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-rose/60 mb-1">
                        Category Tag
                      </label>
                      <select
                        value={noteTag}
                        onChange={(e) => setNoteTag(e.target.value)}
                        className="w-full rounded-xl bg-white px-3 py-2 text-sm text-[#831843] border border-pink-200 outline-none transition focus:ring-2 focus:ring-hotpink/20"
                      >
                        {NOTE_TAGS.map((t) => (
                          <option key={t} value={t}>
                            {t}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-rose/60 mb-1">
                        Paper shade
                      </label>
                      <div className="flex gap-1.5 py-1 flex-wrap">
                        {NOTE_COLORS.map((c) => (
                          <button
                            key={c.key}
                            type="button"
                            onClick={() => setNoteColor(c.key)}
                            aria-label={c.label}
                            title={c.label}
                            style={{ backgroundColor: c.accent }}
                            className={[
                              "h-5 w-5 rounded-full ring-offset-1 transition hover:scale-110",
                              noteColor === c.key ? "ring-2 ring-hotpink" : "ring-0"
                            ].join(" ")}
                          />
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-3">
                    <button
                      type="button"
                      onClick={() => setShowNoteForm(false)}
                      className="px-4 py-2 rounded-full border border-pink-200 text-xs font-bold text-rose/70 hover:bg-blush transition"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2 rounded-full bg-hotpink text-white text-xs font-bold hover:bg-magenta transition shadow-md shadow-pink-300"
                    >
                      Save note ✿
                    </button>
                  </div>
                </div>
              </form>
            )}

            {/* SEARCH & ACCORDION PILL TAG FILTERS */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between bg-white/90 backdrop-blur rounded-2xl p-3 border border-pink-100 shadow-sm">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-rose/40" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search in notes..."
                  className="w-full bg-transparent pl-10 pr-3.5 py-1.5 text-xs text-[#831843] placeholder:text-[#9D5C7E]/40 outline-none border-b border-transparent focus:border-hotpink/40"
                />
              </div>

              {/* Tag filters pill menu */}
              <div className="flex gap-1.5 overflow-x-auto scrollbar-none pb-0.5 whitespace-nowrap px-1">
                {["All", ...NOTE_TAGS].map((t) => (
                  <button
                    key={t}
                    onClick={() => setSelectedTag(t)}
                    className={[
                      "px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wide transition border",
                      selectedTag === t
                        ? "bg-hotpink text-white border-transparent"
                        : "bg-blush text-hotpink border-pink-100 hover:bg-white"
                    ].join(" ")}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {/* NOTES GRID */}
            {filteredNotes.length === 0 ? (
              <div className="rounded-[2rem] bg-white/70 border border-petal/40 p-8 text-center animate-fade-in flex flex-col items-center justify-center">
                <p className="text-sm text-rose">
                  {notes.length === 0 ? "You don't have any sticky notes yet." : "No notes match your filters!"}
                </p>
                <button
                  onClick={() => setShowNoteForm(true)}
                  className="mt-4 px-4 py-2 bg-hotpink text-white rounded-full text-xs font-bold inline-flex items-center gap-1 hover:bg-magenta hover:scale-105 transition shadow-md shadow-pink-200"
                >
                  <Plus className="h-3.5 w-3.5" /> + New note
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 md:grid-cols-3 sm:gap-4 lg:grid-cols-3">
                {filteredNotes.map((note) => {
                  const shade = NOTE_COLORS.find((col) => col.key === note.color) || NOTE_COLORS[0];
                  return (
                    <div
                      key={note.id}
                      className={[
                        "group relative rounded-3xl border p-4 sm:p-5 flex flex-col justify-between shadow-sm transition hover:shadow-md hover:-translate-y-1 duration-200 animate-scale-in",
                        shade.bg,
                        shade.border
                      ].join(" ")}
                    >
                      {/* Note Header / Pins */}
                      <div>
                        <div className="flex items-start justify-between gap-1.5">
                          <h4 className={["font-script text-xl leading-tight truncate flex-1", shade.text].join(" ")}>
                            {note.title}
                          </h4>
                          <div className="flex gap-1 items-center shrink-0">
                            {/* Pin Button */}
                            <button
                              onClick={() => handleTogglePin(note.id)}
                              className="p-1 rounded-full text-rose/40 hover:text-hotpink transition hover:bg-white"
                              title={note.pinned ? "Unpin note" : "Pin note"}
                            >
                              {note.pinned ? (
                                <Pin className="h-3.5 w-3.5 text-hotpink" fill="currentColor" />
                              ) : (
                                <PinOff className="h-3.5 w-3.5 text-rose/30 opacity-0 group-hover:opacity-100 transition" />
                              )}
                            </button>
                          </div>
                        </div>

                        {/* Note category text */}
                        <span className="inline-block mt-1 text-[9px] font-bold uppercase tracking-wider text-rose/50 bg-white/70 px-2 py-0.5 rounded-full border border-pink-100">
                          {note.tag}
                        </span>

                        {/* Body text */}
                        <p className="mt-3 text-xs text-rose/90 font-medium whitespace-pre-wrap leading-relaxed line-clamp-6">
                          {note.text}
                        </p>
                      </div>

                      {/* Footer actions of Note */}
                      <div className="mt-4 pt-3 border-t border-pink-200/15 flex items-center justify-between">
                        <span className="text-[9px] text-rose/50 font-bold tracking-tight">
                          {new Date(note.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                        </span>
                        <div className="flex gap-1">
                          <button
                            onClick={() => handleEditNote(note)}
                            className="p-1 rounded-full bg-white/50 text-rose hover:text-hotpink hover:bg-white transition"
                            title="Edit"
                          >
                            <Edit3 className="h-3 w-3" />
                          </button>
                          <button
                            onClick={() => handleDeleteNote(note.id)}
                            className="p-1 rounded-full bg-white/50 text-rose hover:text-[#F87171] hover:bg-white transition"
                            title="Delete"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ==================== REMINDERS TAB ==================== */}
        {tab === "reminders" && (
          <div className="animate-fade-in space-y-5">
            {/* INLINE SMART FORM FOR NEW / EDIT REMINDER */}
            {showReminderForm && (
              <form
                onSubmit={handleSaveReminder}
                className="rounded-3xl border border-pink-200/50 bg-white/95 p-5 shadow-xl shadow-rose/10 animate-bloom-bounce space-y-4"
              >
                <div className="flex justify-between items-center">
                  <h3 className="font-script text-2xl text-hotpink">
                    {editingReminderId ? "Edit gorgeous Reminder ✿" : "Set a smart nudge ✿"}
                  </h3>
                  <button
                    type="button"
                    onClick={() => setShowReminderForm(false)}
                    className="p-1 text-rose/50 hover:text-rose transition"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <div className="space-y-4">
                  {/* Kind selector */}
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-rose/60 mb-1.5">
                      What kind of reminder? ✿
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      {KIND_OPTIONS.map((k) => (
                        <button
                          key={k.key}
                          type="button"
                          onClick={() => setRemKind(k.key)}
                          className={[
                            "flex items-center gap-2 rounded-2xl border px-3 py-2.5 text-left transition",
                            remKind === k.key
                              ? "border-hotpink bg-hotpink/10 shadow-sm"
                              : "border-pink-200 bg-white hover:bg-blush",
                          ].join(" ")}
                        >
                          <span className={["grid h-8 w-8 shrink-0 place-items-center rounded-xl", remKind === k.key ? "bg-hotpink text-white" : "bg-blush text-hotpink"].join(" ")}>
                            <k.Icon className="h-4 w-4" strokeWidth={1.8} />
                          </span>
                          <span className="min-w-0">
                            <span className="block text-xs font-bold text-rose">{k.emoji} {k.label}</span>
                            <span className="block text-[10px] text-rose/50 truncate">{k.hint}</span>
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Title */}
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
                            : "e.g. Dentist appointment, Team meeting, Beach vacation..."
                      }
                      className="w-full rounded-xl bg-white px-3 py-2 text-sm text-[#831843] placeholder:text-[#9D5C7E]/40 border border-pink-200 outline-none transition focus:ring-2 focus:ring-hotpink/20"
                    />
                  </div>

                  {/* ===== Medication fields ===== */}
                  {remKind === "medication" && (
                    <>
                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-rose/60 mb-1.5">
                          Time(s) of day ✿
                        </label>
                        <div className="flex flex-wrap items-center gap-2">
                          {remTimes.map((t, i) => (
                            <div key={i} className="flex items-center gap-1">
                              <CuteTimePicker
                                value={t}
                                onChange={(v) => setRemTimes((prev) => prev.map((x, idx) => (idx === i ? v : x)))}
                              />
                              {remTimes.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => setRemTimes((prev) => prev.filter((_, idx) => idx !== i))}
                                  className="grid h-6 w-6 place-items-center rounded-full bg-blush text-rose/60 hover:text-hotpink hover:bg-petal transition"
                                  title="Remove this time"
                                >
                                  <Minus className="h-3 w-3" />
                                </button>
                              )}
                            </div>
                          ))}
                          <button
                            type="button"
                            onClick={() => setRemTimes((prev) => [...prev, "09:00"])}
                            className="inline-flex items-center gap-1 rounded-full bg-blush px-3 py-1.5 text-[11px] font-bold text-hotpink hover:bg-petal transition"
                          >
                            <Plus className="h-3 w-3" /> Add another time
                          </button>
                        </div>
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-rose/60 mb-1.5">
                          How often? ✿
                        </label>
                        <div className="inline-flex rounded-full bg-white p-1 border border-pink-200/70">
                          <button
                            type="button"
                            onClick={() => setRemEveryDay(true)}
                            className={["rounded-full px-4 py-1.5 text-xs font-bold transition", remEveryDay ? "bg-hotpink text-white shadow-sm" : "text-rose/70 hover:bg-blush"].join(" ")}
                          >
                            Every day
                          </button>
                          <button
                            type="button"
                            onClick={() => setRemEveryDay(false)}
                            className={["rounded-full px-4 py-1.5 text-xs font-bold transition", !remEveryDay ? "bg-hotpink text-white shadow-sm" : "text-rose/70 hover:bg-blush"].join(" ")}
                          >
                            Choose days
                          </button>
                        </div>

                        {!remEveryDay && (
                          <div className="mt-2.5 flex flex-wrap gap-1.5">
                            {WEEKDAYS.map((wd) => {
                              const active = remWeekdays.includes(wd.key);
                              return (
                                <button
                                  key={wd.key}
                                  type="button"
                                  title={wd.label}
                                  onClick={() =>
                                    setRemWeekdays((prev) => (active ? prev.filter((d) => d !== wd.key) : [...prev, wd.key].sort()))
                                  }
                                  className={[
                                    "grid h-8 w-8 place-items-center rounded-full text-xs font-bold border transition",
                                    active ? "bg-hotpink text-white border-hotpink shadow-sm" : "bg-white text-rose/60 border-pink-200 hover:bg-blush",
                                  ].join(" ")}
                                >
                                  {wd.short}
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </>
                  )}

                  {/* ===== Birthday fields ===== */}
                  {remKind === "birthday" && (
                    <>
                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-rose/60 mb-1">
                          Birthday date ✿
                        </label>
                        <CuteDatePicker value={remDate} onChange={(v) => setRemDate(v || todayStr())} />
                        <p className="mt-1.5 text-[10px] text-rose/50 leading-snug">
                          🎂 We'll remind you every year on this day, forever — the year you pick is only used to celebrate the right age.
                        </p>
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-rose/60 mb-1">
                          Anticipation — give yourself time to prepare ✿
                        </label>
                        <select
                          value={remLeadDays}
                          onChange={(e) => setRemLeadDays(parseInt(e.target.value, 10))}
                          className="w-full sm:w-auto rounded-xl bg-white px-3 py-2 text-sm text-[#831843] border border-pink-200 outline-none transition focus:ring-2 focus:ring-hotpink/20"
                        >
                          {LEAD_OPTIONS.map((o) => (
                            <option key={o.value} value={o.value}>{o.label}</option>
                          ))}
                        </select>
                      </div>
                    </>
                  )}

                  {/* ===== Event / appointment fields ===== */}
                  {remKind === "event" && (
                    <>
                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-rose/60 mb-1">
                          Category
                        </label>
                        <select
                          value={remCategory}
                          onChange={(e) => setRemCategory(e.target.value)}
                          className="w-full rounded-xl bg-white px-3 py-2 text-sm text-[#831843] border border-pink-200 outline-none transition focus:ring-2 focus:ring-hotpink/20"
                        >
                          {EVENT_CATEGORIES.map((c) => (
                            <option key={c.key} value={c.key}>{c.label}</option>
                          ))}
                        </select>
                      </div>

                      <label className="flex items-center gap-2 text-xs font-semibold text-rose/70">
                        <input
                          type="checkbox"
                          checked={remIsRange}
                          onChange={(e) => setRemIsRange(e.target.checked)}
                          className="h-4 w-4 rounded accent-hotpink"
                        />
                        This spans multiple days (like a vacation)
                      </label>

                      <div className={["grid gap-3", remIsRange ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-1"].join(" ")}>
                        <div>
                          <label className="block text-[10px] font-bold uppercase tracking-wider text-rose/60 mb-1">
                            {remIsRange ? "Starts ✿" : "Date ✿"}
                          </label>
                          <CuteDatePicker value={remDate} onChange={(v) => setRemDate(v || todayStr())} />
                        </div>
                        {remIsRange && (
                          <div>
                            <label className="block text-[10px] font-bold uppercase tracking-wider text-rose/60 mb-1">
                              Ends ✿
                            </label>
                            <CuteDatePicker value={remEndDate} onChange={setRemEndDate} placeholder="Pick the end date" />
                          </div>
                        )}
                      </div>

                      <div>
                        <label className="flex items-center gap-2 text-xs font-semibold text-rose/70 mb-1.5">
                          <input
                            type="checkbox"
                            checked={remHasTime}
                            onChange={(e) => setRemHasTime(e.target.checked)}
                            className="h-4 w-4 rounded accent-hotpink"
                          />
                          Add a specific time
                        </label>
                        {remHasTime && <CuteTimePicker value={remTime} onChange={setRemTime} />}
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-rose/60 mb-1">
                          Anticipation — get a heads-up before it happens ✿
                        </label>
                        <select
                          value={remLeadDays}
                          onChange={(e) => setRemLeadDays(parseInt(e.target.value, 10))}
                          className="w-full sm:w-auto rounded-xl bg-white px-3 py-2 text-sm text-[#831843] border border-pink-200 outline-none transition focus:ring-2 focus:ring-hotpink/20"
                        >
                          {LEAD_OPTIONS.map((o) => (
                            <option key={o.value} value={o.value}>{o.label}</option>
                          ))}
                        </select>
                      </div>
                    </>
                  )}

                  <div className="flex justify-end gap-2 pt-3">
                    <button
                      type="button"
                      onClick={() => setShowReminderForm(false)}
                      className="px-4 py-2 rounded-full border border-pink-200 text-xs font-bold text-rose/70 hover:bg-blush transition"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2 rounded-full bg-hotpink text-white text-xs font-bold hover:bg-magenta transition shadow-md shadow-pink-300"
                    >
                      Save Reminder ✿
                    </button>
                  </div>
                </div>
              </form>
            )}

            {/* UPCOMING REMINDERS HEADER */}
            <div className="bg-white/95 backdrop-blur rounded-[2rem] border border-pink-200/50 p-4 sm:p-6 shadow-sm">
              <h3 className="font-script text-2xl sm:text-3xl text-hotpink mb-4">Upcoming Nudges</h3>

              {sortedReminders.length === 0 ? (
                <div className="py-8 text-center animate-fade-in flex flex-col items-center justify-center">
                  <p className="text-xs sm:text-sm text-rose italic">All clear! No upcoming reminders due.</p>
                  <button
                    onClick={() => setShowReminderForm(true)}
                    className="mt-4 px-4 py-2 bg-hotpink text-white rounded-full text-xs font-bold inline-flex items-center gap-1 hover:bg-magenta hover:scale-105 transition shadow-md shadow-pink-200"
                  >
                    <Plus className="h-3.5 w-3.5" /> + New reminder
                  </button>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {sortedReminders.map((rem) => (
                    <ReminderRow
                      key={rem.id}
                      rem={rem}
                      onToggleDone={() => handleToggleReminderDone(rem.id)}
                      onEdit={() => handleEditReminder(rem)}
                      onDelete={() => handleDeleteReminder(rem.id)}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* COMPLETED / DONE SECTION (Collapsible) */}
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
                      <div
                        key={rem.id}
                        className="flex items-center justify-between rounded-xl bg-white/60 p-2.5 px-3 border border-pink-200/20 shadow-sm transition animate-scale-in"
                      >
                        <div className="flex items-center gap-3.5 min-w-0 opacity-60">
                          <button
                            type="button"
                            onClick={() => handleToggleReminderDone(rem.id)}
                            className="p-1 h-5 w-5 shrink-0 rounded-full bg-hotpink text-white flex items-center justify-center transition"
                            title="Undo completion"
                          >
                            <Check className="h-3 w-3 text-white" strokeWidth={3} />
                          </button>

                          <div className="min-w-0">
                            <h4 className="font-semibold text-rose text-xs line-through truncate leading-normal">
                              {rem.title}
                            </h4>
                            <p className="text-[9px] text-rose/50 mt-0.5 font-semibold">
                              completed ✿ {prettyDate(rem.date)}{rem.time ? ` @ ${rem.time}` : ""}
                            </p>
                          </div>
                        </div>

                        <button
                          onClick={() => handleDeleteReminder(rem.id)}
                          className="p-1 text-rose/50 hover:text-[#F87171] transition"
                          title="Delete"
                        >
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

function ReminderRow({
  rem, onToggleDone, onEdit, onDelete,
}: {
  rem: Reminder;
  onToggleDone: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const visual = reminderVisual(rem);
  const age = turningAge(rem);

  return (
    <div className="group flex items-center justify-between rounded-2xl border border-pink-100 bg-white p-3 sm:px-4 shadow-sm transition hover:shadow duration-150 animate-scale-in">
      <div className="flex items-center gap-3 min-w-0">
        {rem.kind === "event" ? (
          <button
            type="button"
            onClick={onToggleDone}
            className="p-1 h-6 w-6 shrink-0 rounded-full border border-pink-200 hover:border-hotpink hover:bg-pink-50 flex items-center justify-center transition"
            title="Mark as done"
          >
            <div className="h-4 w-4 rounded-full border border-transparent hover:bg-hotpink/10" />
          </button>
        ) : (
          <span className={["grid h-7 w-7 shrink-0 place-items-center rounded-full", visual.color].join(" ")}>
            <visual.Icon className="h-3.5 w-3.5" strokeWidth={1.8} />
          </span>
        )}

        <div className="min-w-0">
          <h4 className="font-semibold text-rose text-xs sm:text-sm truncate">
            {rem.title}
            {age !== null && <span className="ml-1.5 font-bold text-hotpink">· turning {age} ✿</span>}
          </h4>

          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 mt-1 text-[10px] text-rose/60 font-bold">
            {rem.kind === "medication" ? (
              <>
                <span className="flex items-center gap-1 text-purple-600 shrink-0">
                  <Clock className="h-3 w-3" />
                  {[...rem.times].sort().join(" · ")}
                </span>
                <span className="text-emerald-600 font-extrabold shrink-0 flex items-center gap-1">
                  <RotateCcw className="h-2.5 w-2.5" />
                  {weekdaysLabel(rem.weekdays)}
                </span>
              </>
            ) : (
              <>
                <span className="flex items-center gap-1 text-hotpink shrink-0">
                  <Calendar className="h-3 w-3" />
                  {rem.kind === "birthday"
                    ? prettyMonthDay(rem.date)
                    : rem.endDate
                      ? `${prettyDate(rem.date)} → ${prettyDate(rem.endDate)}`
                      : prettyDate(rem.date)}
                </span>
                {rem.time && (
                  <span className="flex items-center gap-1 text-purple-600 shrink-0">
                    <Clock className="h-3 w-3" />
                    {rem.time}
                  </span>
                )}
                {rem.kind === "birthday" && (
                  <span className="text-emerald-600 font-extrabold shrink-0 flex items-center gap-1">
                    <RotateCcw className="h-2.5 w-2.5" /> every year
                  </span>
                )}
                {rem.leadDays > 0 && (
                  <span className="text-amber-600 font-extrabold shrink-0 flex items-center gap-1">
                    <Bell className="h-2.5 w-2.5" /> nudge {rem.leadDays}d before
                  </span>
                )}
              </>
            )}
            <span className={["px-2 py-0.5 rounded-full uppercase text-[9px] shrink-0 flex items-center gap-1", visual.color].join(" ")}>
              <visual.Icon className="h-2.5 w-2.5" />
              {visual.label}
            </span>
          </div>
        </div>
      </div>

      <div className="flex gap-1 shrink-0 ml-1.5 opacity-60 group-hover:opacity-100 transition">
        <button
          onClick={onEdit}
          className="p-1.5 rounded-full bg-blush text-rose hover:text-hotpink hover:bg-petal transition"
          title="Edit"
        >
          <Edit3 className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={onDelete}
          className="p-1.5 rounded-full bg-blush text-rose hover:text-[#F87171] hover:bg-petal transition"
          title="Delete"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
