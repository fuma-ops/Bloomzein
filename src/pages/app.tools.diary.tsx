import { useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
import {
  Plus, Trash2, Edit3, X, BookHeart, Sparkles,
  Cloud, Smile, Heart, CloudRain, Battery, Activity, Droplet,
  Calendar, List, LayoutGrid, BookOpen, ChevronLeft, ChevronRight, Printer,
  Flame, Quote,
} from "lucide-react";
import { BloomBubbles } from "@/components/bloom/BloomBubbles";
import { PageHeader } from "@/components/bloom/PageHeader";
import { DiaryRichEditor, DIARY_FONTS, fontFamilyFor } from "@/components/bloom/DiaryRichEditor";
import { playPageFlipSound } from "@/lib/diarySound";

export interface DiaryEntry {
  id: string;
  date: string; // YYYY-MM-DD
  mood: string;
  title: string;
  html: string;
  theme: string;
  font: string;
  createdAt: string;
}

export const DIARY_STORAGE_KEY = "bloom:diary";
const VIEW_STORAGE_KEY = "bloom:diary-view";

export const DIARY_MOODS = [
  { key: "calm", label: "Calm", Icon: Cloud },
  { key: "happy", label: "Happy", Icon: Smile },
  { key: "energetic", label: "Energetic", Icon: Sparkles },
  { key: "sensitive", label: "Sensitive", Icon: Heart },
  { key: "sad", label: "Sad", Icon: CloudRain },
  { key: "tired", label: "Tired", Icon: Battery },
  { key: "cramps", label: "Cramps", Icon: Activity },
  { key: "bloated", label: "Bloated", Icon: Droplet },
] as const;

export const DIARY_THEMES = [
  { key: "sakura", label: "Sakura Blush", page: "from-[#FFF0F6] to-[#FFE0EE]", ring: "ring-pink-200", accent: "#EC4899", chip: "bg-[#FBCFE8]" },
  { key: "lavender", label: "Lavender Glow", page: "from-[#F5EEFF] to-[#EAE0FB]", ring: "ring-purple-200", accent: "#8B5CF6", chip: "bg-[#DDD6FE]" },
  { key: "mint", label: "Mint Whisper", page: "from-[#ECFDF5] to-[#DEFAEC]", ring: "ring-emerald-200", accent: "#10B981", chip: "bg-[#BBF7D0]" },
  { key: "lemon", label: "Lemon Custard", page: "from-[#FEFCE8] to-[#FCF6D6]", ring: "ring-yellow-200", accent: "#EAB308", chip: "bg-[#FDE68A]" },
  { key: "peach", label: "Peach Cream", page: "from-[#FFF5F5] to-[#FFE9E2]", ring: "ring-orange-200", accent: "#F97316", chip: "bg-[#FED7AA]" },
] as const;

export function moodMeta(key: string) {
  return DIARY_MOODS.find((m) => m.key === key) ?? DIARY_MOODS[0];
}

export function themeMeta(key: string) {
  return DIARY_THEMES.find((t) => t.key === key) ?? DIARY_THEMES[0];
}

function sampleEntry(): DiaryEntry {
  const today = new Date().toISOString().slice(0, 10);
  return {
    id: "bloom-sample-001",
    date: today,
    mood: "happy",
    title: "A gentle morning ✿",
    html: `<p>Today started with the softest light coming through my window. I made chamomile tea and sat quietly for a few minutes before the day began.</p><p>I feel grateful — for small things mostly. The way the cherry blossoms are blooming. A kind message from a friend. The simple fact that I woke up today.</p><p>My intention: stay present, choose softness, and do at least one thing just for me. 🌸</p>`,
    theme: "sakura",
    font: "caveat",
    createdAt: new Date().toISOString(),
  };
}

function loadEntries(): DiaryEntry[] {
  try {
    const raw = localStorage.getItem(DIARY_STORAGE_KEY);
    if (!raw) return [sampleEntry()];
    const parsed = JSON.parse(raw);
    return (parsed as any[]).map((e) => ({
      id: e.id,
      date: e.date,
      mood: e.mood ?? "calm",
      title: e.title ?? "",
      html: e.html ?? (e.text ? escapeHtml(e.text).replace(/\n/g, "<br/>") : ""),
      theme: e.theme ?? "sakura",
      font: e.font ?? "quicksand",
      createdAt: e.createdAt,
    }));
  } catch {
    return [];
  }
}

function escapeHtml(s: string) {
  const div = document.createElement("div");
  div.textContent = s;
  return div.innerHTML;
}

function plainTextOf(html: string) {
  const div = document.createElement("div");
  div.innerHTML = html;
  return (div.textContent || "").trim();
}

function saveEntries(entries: DiaryEntry[]) {
  try {
    localStorage.setItem(DIARY_STORAGE_KEY, JSON.stringify(entries));
    window.dispatchEvent(new Event("bloom:diary-updated"));
  } catch {}
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function fmtDate(iso: string) {
  return new Date(iso + "T00:00:00").toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

function computeStreak(entries: DiaryEntry[]): number {
  const dates = new Set(entries.map((e) => e.date));
  let streak = 0;
  const d = new Date(todayISO() + "T00:00:00");
  while (dates.has(d.toISOString().slice(0, 10))) {
    streak++;
    d.setDate(d.getDate() - 1);
  }
  return streak;
}

const AFFIRMATIONS = [
  "I am enough. I am worthy. I am loved.",
  "My feelings are valid, and I honor them.",
  "I release what no longer serves me.",
  "I bloom where I am planted.",
  "Softness is my strength.",
  "I am the author of my own story.",
  "Today I choose peace and joy.",
  "I am worthy of love, rest, and all beautiful things.",
  "My sensitivity is a superpower.",
  "I flow with life's changes gracefully.",
  "I celebrate my progress, not just my destination.",
  "I am allowed to take up space.",
  "With each breath, I grow stronger.",
  "I trust the journey, even the uncertain parts.",
  "I lead with kindness, starting with myself.",
];

const BLOOM_TIPS = [
  "Morning pages: 3 stream-of-consciousness pages before checking your phone.",
  "Try the gratitude sandwich: start and end each entry with something you're thankful for.",
  "Draw your feelings today — sometimes a doodle says more than words.",
  "Write a letter to your future self. What do you hope she knows?",
  "Track your energy throughout the day — patterns emerge beautifully.",
  "Light a candle and write in silence for 10 minutes. Notice what surfaces.",
  "Re-read your entries from last month — notice how far you've come.",
];

function todayAffirmation() {
  const d = new Date();
  return AFFIRMATIONS[(d.getDay() + d.getDate()) % AFFIRMATIONS.length];
}

function todayBloomTip() {
  const d = new Date();
  return BLOOM_TIPS[(d.getDate() + d.getMonth()) % BLOOM_TIPS.length];
}

type ViewMode = "dashboard" | "list" | "grid" | "book";

export default function DiaryPage() {
  const [entries, setEntries] = useState<DiaryEntry[]>(() => loadEntries());
  const [composing, setComposing] = useState(false);
  const [editing, setEditing] = useState<DiaryEntry | null>(null);
  const [view, setView] = useState<ViewMode>(() => {
    try { return (localStorage.getItem(VIEW_STORAGE_KEY) as ViewMode) || "dashboard"; } catch { return "dashboard"; }
  });

  useEffect(() => { saveEntries(entries); }, [entries]);
  useEffect(() => { try { localStorage.setItem(VIEW_STORAGE_KEY, view); } catch {} }, [view]);

  const sorted = useMemo(
    () => [...entries].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [entries]
  );

  const upsertEntry = (entry: DiaryEntry) => {
    setEntries((prev) => {
      const exists = prev.some((e) => e.id === entry.id);
      return exists ? prev.map((e) => (e.id === entry.id ? entry : e)) : [entry, ...prev];
    });
    setComposing(false);
    setEditing(null);
  };

  const deleteEntry = (id: string) => {
    setEntries((prev) => prev.filter((e) => e.id !== id));
  };

  return (
    <div className="relative animate-fade-in">
      <BloomBubbles count={10} />

      <PageHeader title="Dreamy Diary" emoji="✿">
        <div className="flex items-center gap-2">
          <ViewSwitcher view={view} onChange={setView} />
          <button
            onClick={() => setComposing(true)}
            className="bloom-luxury-btn inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white"
          >
            <Plus className="h-3.5 w-3.5" strokeWidth={2} /> New entry
          </button>
        </div>
      </PageHeader>

      {view === "dashboard" ? (
        <DiaryDashboard
          entries={sorted}
          onNew={() => setComposing(true)}
          onSaveEntry={upsertEntry}
          onEdit={setEditing}
          onDelete={deleteEntry}
        />
      ) : sorted.length === 0 ? (
        <EmptyDiary onStart={() => setComposing(true)} />
      ) : view === "list" ? (
        <ListView entries={sorted} onEdit={setEditing} onDelete={deleteEntry} />
      ) : view === "grid" ? (
        <GridView entries={sorted} onEdit={setEditing} onDelete={deleteEntry} />
      ) : (
        <BookView entries={sorted} onEdit={setEditing} onDelete={deleteEntry} />
      )}

      {(composing || editing) && (
        <DiaryComposer
          initial={editing ?? undefined}
          onClose={() => { setComposing(false); setEditing(null); }}
          onSave={upsertEntry}
        />
      )}
    </div>
  );
}

/* ============================================================
   DASHBOARD — luxury open journal experience
   ============================================================ */

const REFLECTION_PROMPTS: Record<string, string> = {
  Menstrual: "What does your body need most right now?",
  Follicular: "What new possibility is calling to you?",
  Ovulatory: "How do you want to share yourself with the world today?",
  Luteal: "What wisdom is your inner voice whispering?",
};

function DiaryDashboard({
  entries, onNew, onSaveEntry, onEdit,
}: {
  entries: DiaryEntry[];
  onNew: () => void;
  onSaveEntry: (entry: DiaryEntry) => void;
  onEdit: (e: DiaryEntry) => void;
  onDelete: (id: string) => void;
}) {
  const streak = useMemo(() => computeStreak(entries), [entries]);
  const affirmation = todayAffirmation();
  const todayEntry = entries.find((e) => e.date === todayISO());
  const recent = entries.slice(0, 3);
  const cycleDay = ((new Date().getDate() - 1) % 28) + 1;
  const phase = cycleDay <= 5 ? "Menstrual" : cycleDay <= 13 ? "Follicular" : cycleDay <= 15 ? "Ovulatory" : "Luteal";

  return (
    <div className="relative">
      <FloatingAtmosphere />

      <div className="grid gap-5 lg:grid-cols-12 lg:gap-6 lg:items-start">

        {/* ── Left: Today's Bloom — first on desktop, below journal on mobile ── */}
        <aside className="order-3 lg:order-1 lg:col-span-2">
          <TodaysBloomCard cycleDay={cycleDay} phase={phase} style={{ animationDelay: "60ms" }} />
        </aside>

        {/* ── Center: Open Journal HERO (wider) — always first on mobile ── */}
        <main className="order-1 lg:order-2 lg:col-span-8 flex flex-col gap-4">
          <OpenJournal entries={entries} onSaveEntry={onSaveEntry} style={{ animationDelay: "0ms" }} />
          <JournalStatsRow streak={streak} todayEntry={todayEntry} phase={phase} style={{ animationDelay: "220ms" }} />
        </main>

        {/* ── Right: Affirmation + Memories ── */}
        <aside className="order-4 lg:order-3 lg:col-span-2 flex flex-col gap-4">
          <DailyAffirmationCard affirmation={affirmation} style={{ animationDelay: "80ms" }} />
          {recent.length > 0 && (
            <RecentMemoriesCard entries={recent} onEdit={onEdit} style={{ animationDelay: "160ms" }} />
          )}
        </aside>

      </div>
    </div>
  );
}

/* ── Floating atmosphere ── */
function FloatingAtmosphere() {
  return (
    <div className="pointer-events-none select-none absolute inset-0 overflow-hidden -z-10" aria-hidden>
      <img src="/images/landing-orb-flower.png" alt=""
        className="absolute -top-8 right-6 w-44 opacity-[0.07] rotate-12 animate-pulse hidden lg:block"
        style={{ animationDuration: "7s" }}
      />
      <img src="/images/landing-orb-life.png" alt=""
        className="absolute bottom-16 -left-8 w-36 opacity-[0.05] -rotate-6 animate-pulse hidden lg:block"
        style={{ animationDuration: "9s", animationDelay: "2s" }}
      />
      <img src="/images/landing-orb-mind.png" alt=""
        className="absolute top-1/3 right-0 w-24 opacity-[0.04] animate-pulse hidden lg:block"
        style={{ animationDuration: "11s", animationDelay: "1s" }}
      />
      {[3, 2.5, 2, 3, 2, 2.5].map((size, i) => (
        <div
          key={i}
          className="absolute rounded-full bg-hotpink animate-pulse hidden lg:block"
          style={{
            width: `${size}px`, height: `${size}px`,
            top: `${6 + i * 14}%`, right: `${1 + i * 7}%`,
            opacity: 0.06 + i * 0.01,
            animationDuration: `${4 + i}s`,
            animationDelay: `${i * 0.7}s`,
          }}
        />
      ))}
    </div>
  );
}

/* ── Open Journal (HERO — dreamy book image frame + HTML overlay) ── */
const JOURNAL_STYLES = `
  @keyframes bk-flip-out {
    0%   { transform: rotateY(0deg);   opacity: 1; }
    100% { transform: rotateY(-88deg); opacity: 0; }
  }
  @keyframes bk-flip-in {
    0%   { transform: rotateY(88deg);  opacity: 0; }
    100% { transform: rotateY(0deg);   opacity: 1; }
  }
  @keyframes bk-hint {
    0%   { transform: rotateY(0deg); }
    45%  { transform: rotateY(-24deg); opacity: 0.88; }
    100% { transform: rotateY(0deg); opacity: 1; }
  }
  .bk-flip-out { animation: bk-flip-out 0.28s cubic-bezier(0.4,0,1,1) forwards; transform-origin: left center; }
  .bk-flip-in  { animation: bk-flip-in  0.28s cubic-bezier(0,0,0.6,1) forwards; transform-origin: left center; }
  .bk-hint     { animation: bk-hint 0.9s ease-in-out 1.4s 1 forwards; transform-origin: left center; }
  [contenteditable][data-ph]:empty::before {
    content: attr(data-ph);
    color: rgba(190,110,140,0.4);
    pointer-events: none;
    font-style: italic;
  }
  .diary-overlay::-webkit-scrollbar { width: 3px; }
  .diary-overlay::-webkit-scrollbar-thumb { background: rgba(200,100,140,0.25); border-radius: 2px; }
  .diary-book-wrap { cursor: grab; touch-action: pan-y; }
  .diary-book-wrap:active { cursor: grabbing; }
  .diary-book-desktop { width: 100%; display: block; pointer-events: none; }
  .diary-book-mobile  { width: 100%; display: none;  pointer-events: none; }
  .diary-flip-arrow {
    position: absolute; top: 50%; transform: translateY(-50%); z-index: 10;
    width: 36px; height: 36px; border-radius: 50%;
    background: rgba(255,210,225,0.75); backdrop-filter: blur(8px);
    border: 1.5px solid rgba(200,88,122,0.45);
    display: flex; align-items: center; justify-content: center;
    color: #C8587A; cursor: pointer;
    transition: opacity 0.2s, transform 0.15s, background 0.15s;
    box-shadow: 0 2px 12px rgba(200,88,122,0.18);
  }
  .diary-flip-arrow:hover:not(:disabled) { background: rgba(255,180,210,0.92); transform: translateY(-50%) scale(1.1); }
  .diary-flip-arrow:active:not(:disabled) { transform: translateY(-50%) scale(0.93); }
  .diary-flip-arrow:disabled { opacity: 0.22; cursor: default; }
  /* ── Phone & Tablet: image as background, floating cream paper on top ── */
  @media (max-width: 1023px) {
    .diary-book-desktop { display: none !important; }
    .diary-book-mobile  { display: none !important; }
    .diary-book-wrap {
      background-image: url('/images/diary-bg-floral.png');
      background-size: cover;
      background-position: center top;
      overflow: visible;
      aspect-ratio: 3 / 4;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }
    .diary-left-page { display: none !important; }
    .diary-right-page {
      position: relative !important;
      top: auto !important; left: auto !important; right: auto !important;
      width: 84% !important;
      height: auto !important;
      min-height: 420px;
      padding: 22px 24px 18px !important;
      background:
        repeating-linear-gradient(
          transparent,
          transparent 27px,
          rgba(200,140,160,0.13) 27px,
          rgba(200,140,160,0.13) 28px
        ),
        #FFF9F2 !important;
      border-radius: 4px 12px 12px 4px !important;
      box-shadow:
        -4px 0 8px rgba(200,88,122,0.08),
        0 12px 48px rgba(0,0,0,0.18),
        0 3px 16px rgba(200,88,122,0.14),
        inset 0 1px 0 rgba(255,255,255,0.9) !important;
      overflow: visible !important;
    }
  }
  @media (min-width: 1024px) {
    .diary-book-desktop { display: block !important; }
    .diary-book-mobile  { display: none  !important; }
  }
`;

function OpenJournal({
  entries, onSaveEntry, style,
}: {
  entries: DiaryEntry[];
  onSaveEntry: (entry: DiaryEntry) => void;
  style?: CSSProperties;
}) {
  const [pageIndex, setPageIndex] = useState(0);
  const [flipClass, setFlipClass] = useState("");
  const [hintDone, setHintDone] = useState(false);
  const [selectedMood, setSelectedMood] = useState<string>(() => {
    const todayEntry = entries.find((e) => e.date === todayISO());
    return todayEntry?.mood ?? "calm";
  });
  const selectedMoodRef = useRef(selectedMood);
  const titleRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout>>();
  const pageIndexRef = useRef(0);
  const todayEntryRef = useRef<DiaryEntry | undefined>(undefined);
  const pointerStartX = useRef<number | null>(null);
  const pointerHasDragged = useRef(false);

  selectedMoodRef.current = selectedMood;
  const todayISO_ = todayISO();
  const todayEntry = entries.find((e) => e.date === todayISO_);
  const pastEntries = entries.filter((e) => e.date !== todayISO_);

  const BLANK_PAGES = 5; // extra blank pages beyond existing entries
  const isToday = pageIndex === 0;
  const canFlipForward = pageIndex < pastEntries.length + BLANK_PAGES;
  const canFlipBack = pageIndex > 0;

  pageIndexRef.current = pageIndex;
  todayEntryRef.current = todayEntry;

  const currentEntry: DiaryEntry | undefined = isToday ? todayEntry : pastEntries[pageIndex - 1];
  const leftEntry: DiaryEntry | undefined = pageIndex === 0 ? undefined : (pageIndex === 1 ? todayEntry : pastEntries[pageIndex - 2]);

  // Always English dates
  const fmtLong = (iso: string) =>
    new Date(iso + "T00:00:00").toLocaleDateString("en-US", { weekday: "long", day: "numeric", month: "long" });
  const todayLabel = new Date().toLocaleDateString("en-US", { weekday: "long", day: "numeric", month: "long" });

  const rightDateLabel = isToday ? todayLabel : (currentEntry ? fmtLong(currentEntry.date) : "");
  const leftDateLabel  = pageIndex === 0 ? todayLabel : (leftEntry ? fmtLong(leftEntry.date) : "");

  // Clear hint animation once
  useEffect(() => {
    const t = setTimeout(() => setHintDone(true), 2400);
    return () => clearTimeout(t);
  }, []);

  // Sync editable fields + mood when navigating pages
  useEffect(() => {
    if (pageIndex !== 0) return;
    if (titleRef.current) titleRef.current.textContent = todayEntryRef.current?.title || "";
    if (bodyRef.current)  bodyRef.current.innerHTML   = todayEntryRef.current?.html  ?? "";
    const m = todayEntryRef.current?.mood ?? "calm";
    setSelectedMood(m);
    selectedMoodRef.current = m;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageIndex]);

  const saveCurrentContent = () => {
    if (pageIndexRef.current !== 0) return;
    const te = todayEntryRef.current;
    const label = new Date().toLocaleDateString("en-US", { weekday: "long", day: "numeric", month: "long" });
    onSaveEntry({
      id: te?.id ?? crypto.randomUUID(),
      date: todayISO(),
      mood: selectedMoodRef.current,
      title: titleRef.current?.textContent?.trim() || label,
      html: bodyRef.current?.innerHTML ?? "",
      theme: te?.theme ?? "sakura",
      font: te?.font ?? "caveat",
      createdAt: te?.createdAt ?? new Date().toISOString(),
    });
  };

  const handleInput = () => {
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(saveCurrentContent, 1200);
  };

  const handleMoodChange = (key: string) => {
    setSelectedMood(key);
    selectedMoodRef.current = key;
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(saveCurrentContent, 400);
  };

  const flip = (dir: 1 | -1) => {
    const next = pageIndexRef.current + dir;
    if (next < 0 || next > pastEntries.length + BLANK_PAGES) return;
    setHintDone(true);
    setFlipClass("bk-flip-out");
    setTimeout(() => {
      setPageIndex(next);
      setFlipClass("bk-flip-in");
      setTimeout(() => setFlipClass(""), 280);
    }, 280);
  };

  // Unified pointer events — works for both mouse and touch
  const onPointerDown = (e: React.PointerEvent) => {
    pointerStartX.current = e.clientX;
    pointerHasDragged.current = false;
    // Only capture when NOT on a text-editing area so contenteditable still works
    const tgt = e.target as HTMLElement;
    if (!tgt.isContentEditable && !tgt.closest?.('[contenteditable]')) {
      try { (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); } catch {}
    }
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (pointerStartX.current === null) return;
    if (Math.abs(e.clientX - pointerStartX.current) > 8) pointerHasDragged.current = true;
  };
  const onPointerUp = (e: React.PointerEvent) => {
    if (pointerStartX.current === null) return;
    const dx = e.clientX - pointerStartX.current;
    const dragged = pointerHasDragged.current;
    pointerStartX.current = null;
    pointerHasDragged.current = false;
    if (!dragged) return;
    if (dx < -60) flip(1);
    else if (dx > 60) flip(-1);
  };
  const onPointerCancel = () => { pointerStartX.current = null; pointerHasDragged.current = false; };

  const HW    = "'Caveat', cursive";
  const PINK  = "#C8587A";
  const DEEP  = "#7A1835";
  const BODY  = "#5A2030";
  const MUTED = "#B08090";

  const rightPageClass = ["diary-right-page", flipClass, !hintDone ? "bk-hint" : ""].filter(Boolean).join(" ");

  const CurrentMoodIcon = (moodMeta(isToday ? selectedMood : (currentEntry?.mood ?? "calm"))).Icon;
  const LeftMoodIcon = leftEntry ? (moodMeta(leftEntry.mood)).Icon : null;

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: JOURNAL_STYLES }} />
      <div className="animate-scale-in" style={style}>

        {/* Rounded card wrapper */}
        <div style={{
          borderRadius: 20,
          overflow: "hidden",
          boxShadow: "0 4px 32px rgba(200,88,122,0.1), 0 1px 4px rgba(200,88,122,0.08)",
        }}>
          <div
            className="diary-book-wrap"
            style={{ position: "relative" }}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerCancel}
          >
            {/* Desktop: two-page open book */}
            <img src="/images/dreamy-book.png"        alt="" aria-hidden draggable={false} className="diary-book-desktop" />
            {/* Phone/tablet: single-page portrait notebook */}
            <img src="/images/dreamy-book-mobile.png" alt="" aria-hidden draggable={false} className="diary-book-mobile" />

            {/* Flip arrows */}
            <button
              className="diary-flip-arrow"
              style={{ left: "2%" }}
              disabled={!canFlipBack}
              onClick={() => flip(-1)}
              onPointerDown={e => e.stopPropagation()}
            >
              <ChevronLeft style={{ width: 18, height: 18 }} strokeWidth={2.5} />
            </button>
            <button
              className="diary-flip-arrow"
              style={{ right: "2%" }}
              disabled={!canFlipForward}
              onClick={() => flip(1)}
              onPointerDown={e => e.stopPropagation()}
            >
              <ChevronRight style={{ width: 18, height: 18 }} strokeWidth={2.5} />
            </button>

            {/* LEFT PAGE — text starts close to spine (small right padding) */}
            <div className="diary-left-page" style={{
              position: "absolute",
              top: "10%", left: "10%", width: "38%", height: "78%",
              padding: "3% 2% 3% 3%",
              boxSizing: "border-box",
              display: "flex", flexDirection: "column",
              overflow: "hidden",
            }}>
              {/* Date + mood icon */}
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: "3%", flexShrink: 0 }}>
                <p style={{ fontFamily: HW, fontSize: "clamp(12px,2.3vw,18px)", color: PINK, fontWeight: 600, lineHeight: 1.2 }}>
                  {leftDateLabel}
                </p>
                {LeftMoodIcon && (
                  <span style={{
                    width: 22, height: 22, borderRadius: "50%", flexShrink: 0,
                    background: "rgba(200,88,122,0.12)", border: `1px solid ${PINK}33`,
                    display: "inline-flex", alignItems: "center", justifyContent: "center", color: PINK,
                  }}>
                    <LeftMoodIcon style={{ width: 12, height: 12 }} strokeWidth={2} />
                  </span>
                )}
              </div>
              <div style={{ height: 1, background: `linear-gradient(to right, ${PINK}44, ${PINK}66, transparent)`, marginBottom: "4%", flexShrink: 0 }} />

              {leftEntry ? (
                <div style={{ flex: 1, overflow: "hidden" }}>
                  {leftEntry.title && (
                    <p style={{ fontFamily: HW, fontSize: "clamp(13px,2.4vw,19px)", color: DEEP, lineHeight: 1.2, marginBottom: "3%" }}>
                      {leftEntry.title}
                    </p>
                  )}
                  <div
                    className="diary-overlay"
                    style={{ fontFamily: HW, fontSize: "clamp(11px,1.9vw,15px)", lineHeight: 1.65, color: BODY, overflow: "hidden", maxHeight: "82%" }}
                    dangerouslySetInnerHTML={{ __html: leftEntry.html || `<em style="color:${MUTED}">Blank page…</em>` }}
                  />
                </div>
              ) : (
                <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
                  <div style={{ marginBottom: "8%" }}>
                    <span style={{ fontFamily: HW, fontSize: "clamp(20px,3.2vw,30px)", color: `${PINK}2A`, lineHeight: 1, display: "block" }}>"</span>
                    <p style={{ fontFamily: HW, fontSize: "clamp(10px,1.8vw,14px)", lineHeight: 1.65, color: BODY, fontStyle: "italic", margin: "2px 0 4px" }}>
                      She remembered who she was,<br />and the game changed.
                    </p>
                    <p style={{ fontFamily: HW, fontSize: "clamp(9px,1.4vw,11px)", color: MUTED }}>— Lalah Delia</p>
                  </div>
                  {entries.length > 0 && (
                    <>
                      <p style={{ fontSize: "clamp(7px,1vw,9px)", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: MUTED, marginBottom: "4%" }}>Recent moods</p>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "clamp(3px,0.5vw,5px)" }}>
                        {entries.slice(0, 10).map((e, i) => {
                          const M = moodMeta(e.mood);
                          return (
                            <span key={e.id} title={`${e.date}: ${M.label}`} style={{
                              width: "clamp(17px,2.4vw,21px)", height: "clamp(17px,2.4vw,21px)",
                              borderRadius: "50%", display: "inline-flex", alignItems: "center", justifyContent: "center",
                              background: `rgba(200,88,122,${Math.max(0.18, 0.82 - i * 0.08)})`,
                            }}>
                              <M.Icon style={{ width: "55%", height: "55%", color: "white" }} strokeWidth={2} />
                            </span>
                          );
                        })}
                      </div>
                    </>
                  )}
                  {entries.length === 0 && (
                    <p style={{ fontFamily: HW, fontSize: "clamp(12px,1.9vw,15px)", color: MUTED }}>Begin your story here ✨</p>
                  )}
                </div>
              )}
              <p style={{ fontFamily: HW, fontSize: "clamp(8px,1.1vw,10px)", textAlign: "center", color: `${PINK}55`, marginTop: "auto", paddingTop: "2%", flexShrink: 0 }}>
                ~ {pageIndex * 2 + 1} ~
              </p>
            </div>

            {/* RIGHT PAGE — text starts close to spine (small left padding) */}
            <div
              className={rightPageClass}
              style={{
                position: "absolute",
                top: "10%", right: "10%", width: "38%", height: "78%",
                padding: "3% 3% 3% 2%",
                boxSizing: "border-box",
                display: "flex", flexDirection: "column",
                overflow: "hidden",
                transformStyle: "preserve-3d",
              }}
            >
              {/* Date + selected mood icon */}
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: "3%", flexShrink: 0 }}>
                <p style={{ fontFamily: HW, fontSize: "clamp(12px,2.3vw,18px)", color: PINK, fontWeight: 600, lineHeight: 1.2 }}>
                  {rightDateLabel}
                </p>
                <span style={{
                  width: 22, height: 22, borderRadius: "50%", flexShrink: 0,
                  background: "rgba(200,88,122,0.15)", border: `1px solid ${PINK}44`,
                  display: "inline-flex", alignItems: "center", justifyContent: "center", color: PINK,
                }}>
                  <CurrentMoodIcon style={{ width: 12, height: 12 }} strokeWidth={2} />
                </span>
              </div>
              <div style={{ height: 1, background: `linear-gradient(to right, transparent, ${PINK}66, transparent)`, marginBottom: "3%", flexShrink: 0 }} />

              {/* Title */}
              {isToday ? (
                <div
                  ref={titleRef}
                  contentEditable
                  suppressContentEditableWarning
                  onInput={handleInput}
                  data-ph="Give this page a title…"
                  style={{
                    fontFamily: HW, fontSize: "clamp(14px,2.6vw,21px)",
                    color: DEEP, lineHeight: 1.2,
                    outline: "none", cursor: "text",
                    marginBottom: "3%", flexShrink: 0,
                    minHeight: "1.3em", wordBreak: "break-word",
                  }}
                />
              ) : (
                <p style={{ fontFamily: HW, fontSize: "clamp(14px,2.6vw,21px)", color: DEEP, lineHeight: 1.2, marginBottom: "3%", flexShrink: 0, minHeight: "1.3em" }}>
                  {currentEntry?.title || ""}
                </p>
              )}

              <div style={{ height: 1, background: `linear-gradient(to right, ${PINK}1A, ${PINK}33, transparent)`, marginBottom: "4%", flexShrink: 0 }} />

              {/* Body */}
              {isToday ? (
                <div
                  ref={bodyRef}
                  contentEditable
                  suppressContentEditableWarning
                  onInput={handleInput}
                  data-ph="Start writing here… let your thoughts flow ✨"
                  className="diary-overlay"
                  style={{
                    flex: 1,
                    fontFamily: HW, fontSize: "clamp(12px,2vw,17px)",
                    lineHeight: 1.65, color: BODY,
                    outline: "none", cursor: "text",
                    wordBreak: "break-word", overflowY: "auto",
                  }}
                />
              ) : (
                <div
                  className="diary-overlay"
                  style={{
                    flex: 1,
                    fontFamily: HW, fontSize: "clamp(12px,2vw,17px)",
                    lineHeight: 1.65, color: BODY, overflowY: "auto",
                  }}
                  dangerouslySetInnerHTML={{ __html: currentEntry?.html || `<em style="color:${MUTED}">Blank page…</em>` }}
                />
              )}

              <p style={{ fontFamily: HW, fontSize: "clamp(8px,1.1vw,10px)", textAlign: "center", color: `${PINK}55`, marginTop: "3%", flexShrink: 0 }}>
                ~ {pageIndex * 2 + 2} ~
              </p>
            </div>
          </div>
        </div>

        {/* ── Mood selector — pink glassmorphism circles, just below the book ── */}
        {isToday && (
          <div style={{
            display: "flex", justifyContent: "center", flexWrap: "wrap", gap: 8,
            marginTop: 14, padding: "10px 16px",
            borderRadius: 16,
            background: "rgba(255,182,206,0.18)",
            backdropFilter: "blur(10px)",
            border: "1px solid rgba(255,150,180,0.22)",
            boxShadow: "0 2px 16px rgba(200,88,122,0.06), inset 0 1px 0 rgba(255,255,255,0.6)",
          }}>
            {DIARY_MOODS.map((m) => {
              const active = selectedMood === m.key;
              return (
                <button
                  key={m.key}
                  onClick={() => handleMoodChange(m.key)}
                  title={m.label}
                  style={{
                    width: 42, height: 42, borderRadius: "50%",
                    background: active
                      ? "linear-gradient(135deg, #D4618A, #C8587A)"
                      : "rgba(255,210,225,0.55)",
                    backdropFilter: "blur(12px)",
                    border: active
                      ? "2px solid #C8587A"
                      : "1px solid rgba(255,150,180,0.45)",
                    cursor: "pointer",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    color: active ? "white" : "#C8587A",
                    boxShadow: active
                      ? "0 4px 16px rgba(200,88,122,0.4), inset 0 1px 0 rgba(255,255,255,0.25)"
                      : "0 2px 8px rgba(200,88,122,0.08), inset 0 1px 0 rgba(255,255,255,0.7)",
                    transition: "all 0.18s ease",
                    transform: active ? "scale(1.12)" : "scale(1)",
                    flexShrink: 0,
                  }}
                >
                  <m.Icon style={{ width: 18, height: 18 }} strokeWidth={active ? 2 : 1.7} />
                </button>
              );
            })}
          </div>
        )}

        {/* Page label */}
        <p style={{ textAlign: "center", fontFamily: HW, fontSize: "clamp(13px,1.9vw,16px)", color: `${PINK}88`, marginTop: 10 }}>
          {pageIndex === 0 ? "today ✨" : `page ${pageIndex} of ${pastEntries.length}`}
        </p>

      </div>
    </>
  );
}

function MoodChip({ moodKey, date }: { moodKey: string; date: string }) {
  const M = moodMeta(moodKey);
  return (
    <div className="flex items-center gap-2 mt-1.5">
      <span
        className="inline-flex items-center gap-1 text-[10px] px-2.5 py-0.5 rounded-full font-semibold"
        style={{ background: "rgba(255,47,146,0.1)", color: "#FF2F92" }}
      >
        <M.Icon className="h-2.5 w-2.5" strokeWidth={2} /> {M.label}
      </span>
      <span className="text-[10px]" style={{ color: "#A08060" }}>{fmtDate(date)}</span>
    </div>
  );
}

/* ── Journal stats row (below book) ── */
function JournalStatsRow({
  streak, todayEntry, phase, style,
}: { streak: number; todayEntry?: DiaryEntry; phase: string; style?: CSSProperties }) {
  const M = todayEntry ? moodMeta(todayEntry.mood) : null;
  const cards = [
    {
      emoji: "🌸",
      label: "Writing Streak",
      value: <><Flame className="h-4 w-4 inline mr-1" style={{ color: "#FF2F92" }} strokeWidth={1.8} />{streak} days</>,
    },
    {
      emoji: "💖",
      label: "Current Mood",
      value: M ? <><M.Icon className="h-4 w-4 inline mr-1" style={{ color: "#FF2F92" }} strokeWidth={1.8} />{M.label}</> : <span className="opacity-40">···</span>,
    },
    {
      emoji: "🌙",
      label: "Current Phase",
      value: <span className="text-sm leading-tight">{phase}</span>,
    },
  ];

  return (
    <div className="grid grid-cols-3 gap-3 animate-scale-in" style={style}>
      {cards.map((c, i) => (
        <div
          key={i}
          className="rounded-xl p-3 text-center shadow-sm"
          style={{
            background: "#FEFCF7",
            border: "1px solid rgba(232,213,180,0.7)",
            animationDelay: `${220 + i * 40}ms`,
          }}
        >
          <p className="text-[9px] font-bold uppercase tracking-wider mb-1" style={{ color: "#A08060" }}>{c.label}</p>
          <p className="font-script text-[17px] leading-snug" style={{ color: "#6B4C30" }}>{c.value}</p>
          <span className="text-sm">{c.emoji}</span>
        </div>
      ))}
    </div>
  );
}

/* ── Today's Bloom (single left card) ── */
function TodaysBloomCard({ cycleDay, phase, style }: { cycleDay: number; phase: string; style?: CSSProperties }) {
  const prompt = REFLECTION_PROMPTS[phase] ?? "What does your heart need today?";

  return (
    <div
      className="animate-scale-in rounded-2xl shadow-sm"
      style={{ border: "1px solid rgba(232,213,180,0.65)", background: "#FEFCF7", animationDelay: style?.animationDelay as string }}
    >
      <div className="p-3">
        <div className="flex items-center gap-1.5 mb-2.5">
          <span className="text-hotpink text-base">✿</span>
          <h3 className="font-script text-lg" style={{ color: "#8B6840" }}>Today's Bloom</h3>
        </div>

        <div className="flex items-center gap-3 mb-2.5">
          <div className="text-center">
            <p className="text-2xl font-bold leading-none" style={{ color: "#FF2F92" }}>{cycleDay}</p>
            <p className="text-[8px] font-bold uppercase tracking-wider mt-0.5" style={{ color: "#A08060" }}>Cycle Day</p>
          </div>
          <div className="h-7 w-px" style={{ background: "rgba(232,213,180,0.8)" }} />
          <div>
            <p className="text-xs font-bold leading-none" style={{ color: "#6B4C30" }}>{phase}</p>
            <p className="text-[9px] mt-0.5" style={{ color: "#A08060" }}>phase</p>
          </div>
        </div>

        <div className="h-px mb-2.5" style={{ background: "linear-gradient(to right, transparent, rgba(232,213,180,0.8), transparent)" }} />

        <p className="text-[8px] font-bold uppercase tracking-wider mb-1" style={{ color: "#FF2F92" }}>Reflection</p>
        <p className="font-script text-[13px] leading-snug" style={{ color: "#6B4C30" }}>{prompt}</p>
      </div>
    </div>
  );
}

/* ── Daily Affirmation (right column, large) ── */
function DailyAffirmationCard({ affirmation, style }: { affirmation: string; style?: CSSProperties }) {
  return (
    <div
      className="animate-scale-in overflow-hidden rounded-2xl shadow-sm"
      style={{ border: "1px solid rgba(232,213,180,0.65)", animationDelay: style?.animationDelay as string }}
    >
      <div className="relative h-40 overflow-hidden">
        <img src="/images/tools-hero-affirmation.png" alt="" className="w-full h-full object-cover object-center" />
        <div className="absolute inset-0" style={{ background: "linear-gradient(to top, #FEFCF7 0%, rgba(254,252,247,0.3) 55%, transparent 100%)" }} />
      </div>
      <div className="p-5" style={{ background: "#FEFCF7" }}>
        <p className="text-[9px] font-bold uppercase tracking-wider mb-3" style={{ color: "#FF2F92" }}>Daily Affirmation</p>
        <div className="relative pl-4">
          <Quote className="absolute -top-0.5 left-0 h-4 w-4 opacity-20" style={{ color: "#FF2F92" }} strokeWidth={1.5} />
          <p className="font-script text-[17px] leading-relaxed italic" style={{ color: "#6B4C30" }}>
            {affirmation}
          </p>
        </div>
      </div>
    </div>
  );
}

/* ── Recent Memories ── */
function RecentMemoriesCard({
  entries, onEdit, style,
}: { entries: DiaryEntry[]; onEdit: (e: DiaryEntry) => void; style?: CSSProperties }) {
  const memoryImages = ["/images/blog-1.png", "/images/blog-2.png", "/images/blog-3.png"];
  return (
    <div
      className="animate-scale-in rounded-2xl p-5 shadow-sm"
      style={{ background: "#FEFCF7", border: "1px solid rgba(232,213,180,0.65)", animationDelay: style?.animationDelay as string }}
    >
      <p className="text-[9px] font-bold uppercase tracking-wider mb-4" style={{ color: "#FF2F92" }}>Recent Memories ✿</p>
      <div className="flex flex-col gap-3">
        {entries.map((entry, i) => {
          const M = moodMeta(entry.mood);
          return (
            <button key={entry.id} onClick={() => onEdit(entry)}
              className="group flex items-start gap-3 rounded-xl p-2 text-left transition w-full"
              style={{ background: "transparent" }}
              onMouseEnter={e => (e.currentTarget.style.background = "rgba(232,213,180,0.25)")}
              onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
            >
              <div className="h-12 w-12 rounded-xl overflow-hidden flex-shrink-0"
                style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.08)" }}>
                <img src={memoryImages[i % 3]} alt="" className="w-full h-full object-cover" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold truncate" style={{ color: "#6B4C30" }}>{entry.title || "Untitled"}</p>
                <p className="text-[10px] mt-0.5" style={{ color: "#A08060" }}>{fmtDate(entry.date)}</p>
                <span
                  className="mt-1 inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-semibold"
                  style={{ background: "rgba(255,47,146,0.09)", color: "#FF2F92" }}
                >
                  <M.Icon className="h-2.5 w-2.5" strokeWidth={2} /> {M.label}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ============================================================
   EMPTY STATE
   ============================================================ */
function EmptyDiary({ onStart }: { onStart: () => void }) {
  return (
    <div className="rounded-[2rem] bg-white/85 backdrop-blur p-10 text-center shadow-xl shadow-rose/10 border border-petal/50">
      <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-blush text-hotpink">
        <BookHeart className="h-6 w-6" strokeWidth={1.6} />
      </span>
      <p className="mt-3 font-script text-3xl text-hotpink">Your softest little journal</p>
      <p className="mt-1.5 text-sm text-rose/80">Write down how today felt — your future self will love reading it back.</p>
      <button
        onClick={onStart}
        className="bloom-luxury-btn mt-5 inline-flex items-center gap-1.5 px-5 py-2.5 text-sm font-semibold text-white"
      >
        <Plus className="h-4 w-4" strokeWidth={2} /> Write your first entry
      </button>
    </div>
  );
}

/* ============================================================
   VIEW SWITCHER
   ============================================================ */
function ViewSwitcher({ view, onChange }: { view: ViewMode; onChange: (v: ViewMode) => void }) {
  const opts: { key: ViewMode; label: string; Icon: typeof List }[] = [
    { key: "dashboard", label: "Journal", Icon: BookHeart },
    { key: "list", label: "List", Icon: List },
    { key: "grid", label: "Pinned", Icon: LayoutGrid },
    { key: "book", label: "Book", Icon: BookOpen },
  ];
  return (
    <div className="inline-flex items-center gap-0.5 rounded-full border border-petal/60 bg-white/80 p-1">
      {opts.map((o) => {
        const active = view === o.key;
        return (
          <button
            key={o.key}
            onClick={() => onChange(o.key)}
            title={o.label}
            className={[
              "inline-flex items-center gap-1 rounded-full px-2.5 py-1.5 text-[11px] font-semibold transition",
              active ? "bg-hotpink text-white shadow-sm shadow-hotpink/30" : "text-rose/70 hover:bg-blush",
            ].join(" ")}
          >
            <o.Icon className="h-3.5 w-3.5" strokeWidth={1.8} />
            <span className="hidden sm:inline">{o.label}</span>
          </button>
        );
      })}
    </div>
  );
}

/* ============================================================
   LIST VIEW
   ============================================================ */
function ListView({
  entries, onEdit, onDelete,
}: { entries: DiaryEntry[]; onEdit: (e: DiaryEntry) => void; onDelete: (id: string) => void }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {entries.map((entry) => {
        const mood = moodMeta(entry.mood);
        const theme = themeMeta(entry.theme);
        return (
          <div
            key={entry.id}
            className={`group rounded-3xl bg-gradient-to-br ${theme.page} p-5 border border-petal/50 shadow-[0_8px_24px_-12px_oklch(0.7_0.18_350/0.3)] transition hover:-translate-y-0.5`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-hotpink to-magenta text-white shadow-md shadow-hotpink/30">
                  <mood.Icon className="h-4.5 w-4.5" strokeWidth={1.6} />
                </span>
                <div>
                  <h3 className="text-sm font-bold text-rose">{entry.title || "Untitled"}</h3>
                  <span className="inline-flex items-center gap-1 text-[11px] text-rose/60">
                    <Calendar className="h-3 w-3" strokeWidth={1.8} /> {fmtDate(entry.date)} · {mood.label}
                  </span>
                </div>
              </div>
              <EntryActions entry={entry} onEdit={onEdit} onDelete={onDelete} />
            </div>
            <p
              style={{ fontFamily: fontFamilyFor(entry.font) }}
              className="mt-3 text-sm text-rose/80 leading-relaxed line-clamp-6"
              dangerouslySetInnerHTML={{ __html: entry.html }}
            />
          </div>
        );
      })}
    </div>
  );
}

/* ============================================================
   GRID / PINNED VIEW
   ============================================================ */
const PIN_ROTATIONS = ["-rotate-2", "rotate-1", "-rotate-1", "rotate-2", "rotate-0", "-rotate-3"];

function GridView({
  entries, onEdit, onDelete,
}: { entries: DiaryEntry[]; onEdit: (e: DiaryEntry) => void; onDelete: (id: string) => void }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5 sm:gap-6 pt-2">
      {entries.map((entry, i) => {
        const mood = moodMeta(entry.mood);
        const theme = themeMeta(entry.theme);
        const rotate = PIN_ROTATIONS[i % PIN_ROTATIONS.length];
        return (
          <div key={entry.id} className={`group relative ${rotate} hover:rotate-0 transition-transform duration-300`}>
            <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 z-10 flex h-5 w-5 items-center justify-center rounded-full bg-magenta shadow-md shadow-magenta/40 ring-2 ring-white">
              <span className="h-1.5 w-1.5 rounded-full bg-white/90" />
            </span>
            <div className={`rounded-2xl bg-gradient-to-br ${theme.page} ring-1 ${theme.ring} p-4 shadow-[0_10px_24px_-10px_oklch(0.7_0.18_350/0.4)] transition hover:shadow-[0_16px_32px_-10px_oklch(0.7_0.22_350/0.5)]`}>
              <div className="flex items-center justify-between">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/70 text-hotpink">
                  <mood.Icon className="h-3.5 w-3.5" strokeWidth={1.7} />
                </span>
                <div className="opacity-0 group-hover:opacity-100 transition">
                  <EntryActions entry={entry} onEdit={onEdit} onDelete={onDelete} compact />
                </div>
              </div>
              <h3 className="mt-2 text-xs font-bold text-rose truncate">{entry.title || "Untitled"}</h3>
              <p
                style={{ fontFamily: fontFamilyFor(entry.font) }}
                className="mt-1 text-[11px] text-rose/75 leading-snug line-clamp-4"
                dangerouslySetInnerHTML={{ __html: entry.html }}
              />
              <p className="mt-2 text-[10px] font-semibold text-rose/50">{fmtDate(entry.date)}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ============================================================
   BOOK VIEW — swipeable pages with a soft page-flip sound
   ============================================================ */
function BookView({
  entries, onEdit, onDelete,
}: { entries: DiaryEntry[]; onEdit: (e: DiaryEntry) => void; onDelete: (id: string) => void }) {
  const [index, setIndex] = useState(0);
  const [dragX, setDragX] = useState(0);
  const dragging = useRef(false);
  const startX = useRef(0);

  const clampedIndex = Math.min(index, entries.length - 1);
  const entry = entries[clampedIndex];
  const mood = moodMeta(entry.mood);
  const theme = themeMeta(entry.theme);

  const goTo = (next: number) => {
    if (next < 0 || next >= entries.length || next === clampedIndex) return;
    playPageFlipSound();
    setIndex(next);
  };

  const onPointerDown = (e: React.PointerEvent) => {
    dragging.current = true;
    startX.current = e.clientX;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragging.current) return;
    setDragX(e.clientX - startX.current);
  };
  const endDrag = () => {
    if (!dragging.current) return;
    dragging.current = false;
    if (dragX < -70) goTo(clampedIndex + 1);
    else if (dragX > 70) goTo(clampedIndex - 1);
    setDragX(0);
  };

  return (
    <div className="flex flex-col items-center pt-2">
      <div
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerLeave={endDrag}
        style={{ transform: `translateX(${dragX}px) rotate(${dragX / 40}deg)`, touchAction: "pan-y" }}
        className="relative w-full max-w-xl select-none cursor-grab active:cursor-grabbing transition-transform"
      >
        <div className={`absolute inset-x-3 -bottom-3 h-full rounded-[1.75rem] bg-gradient-to-br ${theme.page} opacity-60 -z-10 blur-[1px]`} />
        <div className={`relative rounded-[1.75rem] bg-gradient-to-br ${theme.page} ring-1 ${theme.ring} border border-white/70 p-6 sm:p-8 shadow-[0_24px_48px_-18px_oklch(0.6_0.2_350/0.45)] min-h-[420px] flex flex-col`}>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2.5">
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-hotpink to-magenta text-white shadow-md shadow-hotpink/30">
                <mood.Icon className="h-5 w-5" strokeWidth={1.6} />
              </span>
              <div>
                <h3 className="font-script text-2xl text-hotpink leading-none">{entry.title || "Untitled"}</h3>
                <span className="inline-flex items-center gap-1 mt-1 text-[11px] text-rose/60">
                  <Calendar className="h-3 w-3" strokeWidth={1.8} /> {fmtDate(entry.date)} · {mood.label}
                </span>
              </div>
            </div>
            <EntryActions entry={entry} onEdit={onEdit} onDelete={onDelete} />
          </div>

          <div className="mt-4 h-px w-full bg-gradient-to-r from-transparent via-hotpink/25 to-transparent" />

          <div
            style={{ fontFamily: fontFamilyFor(entry.font) }}
            className="diary-page-content mt-4 flex-1 overflow-y-auto text-[15px] text-rose/85 leading-relaxed pr-1"
            dangerouslySetInnerHTML={{ __html: entry.html || "<span class='opacity-50'>This page is blank…</span>" }}
          />

          <p className="mt-4 text-center text-[11px] font-semibold text-rose/40">
            page {clampedIndex + 1} of {entries.length}
          </p>
        </div>
      </div>

      {/* Navigation */}
      <div className="mt-5 flex items-center gap-4">
        <button
          onClick={() => goTo(clampedIndex - 1)}
          disabled={clampedIndex === 0}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-white/85 border border-petal/50 text-hotpink shadow-sm transition hover:-translate-x-0.5 disabled:opacity-30 disabled:hover:translate-x-0"
        >
          <ChevronLeft className="h-4.5 w-4.5" strokeWidth={2} />
        </button>
        <span className="font-script text-lg text-rose/60">swipe to turn the page ✿</span>
        <button
          onClick={() => goTo(clampedIndex + 1)}
          disabled={clampedIndex === entries.length - 1}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-white/85 border border-petal/50 text-hotpink shadow-sm transition hover:translate-x-0.5 disabled:opacity-30 disabled:hover:translate-x-0"
        >
          <ChevronRight className="h-4.5 w-4.5" strokeWidth={2} />
        </button>
      </div>
    </div>
  );
}

/* ============================================================
   PER-ENTRY ACTIONS (edit / print / delete)
   ============================================================ */
function EntryActions({
  entry, onEdit, onDelete, compact,
}: { entry: DiaryEntry; onEdit: (e: DiaryEntry) => void; onDelete: (id: string) => void; compact?: boolean }) {
  const printEntry = () => {
    const mood = moodMeta(entry.mood);
    const theme = themeMeta(entry.theme);
    const win = window.open("", "_blank", "width=720,height=900");
    if (!win) return;
    win.document.write(`<!doctype html><html><head><meta charset="utf-8" />
      <title>${escapeHtml(entry.title || "Diary entry")}</title>
      <style>
        @page { margin: 28mm 22mm; }
        body { font-family: 'Quicksand', sans-serif; color: #831843; padding: 24px; }
        h1 { font-family: 'Caveat', cursive; font-size: 40px; color: ${theme.accent}; margin: 0 0 4px; }
        .meta { font-size: 12px; color: #9D5C7E; margin-bottom: 18px; }
        .content { font-family: ${fontFamilyFor(entry.font)}; font-size: 15px; line-height: 1.7; }
        hr { border: none; border-top: 1px solid ${theme.accent}33; margin: 16px 0; }
      </style>
      </head><body>
        <h1>${escapeHtml(entry.title || "Untitled")}</h1>
        <p class="meta">${fmtDate(entry.date)} · ${mood.label}</p>
        <hr />
        <div class="content">${entry.html}</div>
      </body></html>`);
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 300);
  };

  return (
    <div className={["flex items-center gap-1", compact ? "" : "opacity-0 group-hover:opacity-100 transition"].join(" ")}>
      <button
        onClick={printEntry}
        title="Print or save as PDF"
        className="flex h-8 w-8 items-center justify-center rounded-full text-rose/60 hover:text-hotpink hover:bg-blush transition"
      >
        <Printer className="h-3.5 w-3.5" strokeWidth={1.8} />
      </button>
      <button
        onClick={() => onEdit(entry)}
        title="Edit"
        className="flex h-8 w-8 items-center justify-center rounded-full text-rose/60 hover:text-hotpink hover:bg-blush transition"
      >
        <Edit3 className="h-3.5 w-3.5" strokeWidth={1.8} />
      </button>
      <button
        onClick={() => onDelete(entry.id)}
        title="Delete"
        className="flex h-8 w-8 items-center justify-center rounded-full text-rose/60 hover:text-magenta hover:bg-magenta/10 transition"
      >
        <Trash2 className="h-3.5 w-3.5" strokeWidth={1.8} />
      </button>
    </div>
  );
}

/* ============================================================
   COMPOSER
   ============================================================ */
function DiaryComposer({
  initial, onClose, onSave,
}: { initial?: DiaryEntry; onClose: () => void; onSave: (entry: DiaryEntry) => void }) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [html, setHtml] = useState(initial?.html ?? "");
  const [mood, setMood] = useState(initial?.mood ?? "calm");
  const [theme, setTheme] = useState(initial?.theme ?? "sakura");
  const [font, setFont] = useState(initial?.font ?? "quicksand");
  const [date, setDate] = useState(initial?.date ?? todayISO());

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!plainTextOf(html)) return;
    onSave({
      id: initial?.id ?? crypto.randomUUID(),
      date, mood, theme, font,
      title: title.trim(),
      html,
      createdAt: initial?.createdAt ?? new Date().toISOString(),
    });
  };

  return (
    <div className="fixed inset-0 z-[100] grid place-items-center bg-[#831843]/40 backdrop-blur-sm p-4 animate-fade-in">
      <div className="relative w-full max-w-lg rounded-[2rem] bg-white shadow-2xl shadow-[#EC4899]/30 border border-[#EC4899]/15 p-6 max-h-[92vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full text-[#9D5C7E] hover:text-[#EC4899] hover:bg-[#FBCFE8] transition"
        >
          <X className="h-4 w-4" />
        </button>

        <h2 className="font-script text-3xl text-[#831843]">{initial ? "Edit entry" : "New entry"} ✿</h2>

        <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-rose/70">Date</label>
              <input
                type="date"
                value={date}
                max={todayISO()}
                onChange={(e) => setDate(e.target.value)}
                className="mt-1 w-full rounded-2xl border border-[#EC4899]/20 bg-[#FFF0F6]/60 px-4 py-2.5 text-sm text-[#831843] outline-none focus:border-[#EC4899] transition"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-rose/70">Title (optional)</label>
              <input
                type="text"
                placeholder="A little headline…"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="mt-1 w-full rounded-2xl border border-[#EC4899]/20 bg-[#FFF0F6]/60 px-4 py-2.5 text-sm text-[#831843] placeholder:text-[#9D5C7E]/70 outline-none focus:border-[#EC4899] transition"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-rose/70">How were you feeling?</label>
            <div className="mt-1.5 grid grid-cols-4 gap-2">
              {DIARY_MOODS.map((m) => {
                const active = mood === m.key;
                return (
                  <button
                    type="button"
                    key={m.key}
                    onClick={() => setMood(m.key)}
                    className={[
                      "flex flex-col items-center gap-1 rounded-2xl p-2 border transition",
                      active ? "bg-hotpink/10 border-hotpink/30" : "bg-transparent border-transparent hover:bg-blush/60",
                    ].join(" ")}
                  >
                    <span className={[
                      "flex h-9 w-9 items-center justify-center rounded-full transition",
                      active ? "bg-gradient-to-br from-hotpink to-magenta text-white shadow-md shadow-hotpink/40" : "bg-blush text-hotpink",
                    ].join(" ")}>
                      <m.Icon className="h-4 w-4" strokeWidth={1.6} />
                    </span>
                    <span className={["text-[10px] font-semibold", active ? "text-hotpink" : "text-rose"].join(" ")}>{m.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-rose/70">Page color</label>
              <div className="mt-1.5 flex flex-wrap gap-2">
                {DIARY_THEMES.map((t) => (
                  <button
                    type="button"
                    key={t.key}
                    title={t.label}
                    onClick={() => setTheme(t.key)}
                    className={[
                      "h-8 w-8 rounded-full border-2 transition",
                      `bg-gradient-to-br ${t.page}`,
                      theme === t.key ? "border-hotpink scale-110" : "border-white/70 hover:scale-105",
                    ].join(" ")}
                  />
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-rose/70">Writing font</label>
              <select
                value={font}
                onChange={(e) => setFont(e.target.value)}
                className="mt-1.5 w-full rounded-2xl border border-[#EC4899]/20 bg-[#FFF0F6]/60 px-3 py-2 text-sm text-[#831843] outline-none focus:border-[#EC4899] transition cursor-pointer"
                style={{ fontFamily: fontFamilyFor(font) }}
              >
                {DIARY_FONTS.map((f) => (
                  <option key={f.key} value={f.key} style={{ fontFamily: f.family }}>{f.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-rose/70">What's on your heart?</label>
            <div className="mt-1.5">
              <DiaryRichEditor
                html={html}
                onChange={setHtml}
                fontKey={font}
                placeholder="Write freely, or tap Speak to dictate your entry…"
              />
            </div>
            <p className="mt-1 text-[11px] text-rose/50">Select text to bold, underline, highlight, recolor, or change its font ✿</p>
          </div>

          <button
            type="submit"
            className="mt-1 rounded-full bg-[#EC4899] px-4 py-2.5 text-sm font-bold text-white shadow-md shadow-[#EC4899]/30 hover:bg-[#DB2777] transition"
          >
            {initial ? "Save changes" : "Save entry"}
          </button>
        </form>
      </div>
    </div>
  );
}
