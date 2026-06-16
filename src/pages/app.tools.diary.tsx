import { useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
import {
  ArrowLeft, Plus, Trash2, Edit3, X, BookHeart, Sparkles,
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

function loadEntries(): DiaryEntry[] {
  try {
    const raw = localStorage.getItem(DIARY_STORAGE_KEY);
    if (!raw) return [];
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

      <a href="/app/tools" className="mb-4 inline-flex items-center gap-1 text-sm text-[#831843] hover:text-[#EC4899] font-semibold">
        <ArrowLeft className="h-4 w-4" /> All tools
      </a>

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

        {/* ── Left: Today's Bloom ── */}
        <aside className="order-1 lg:col-span-2">
          <TodaysBloomCard cycleDay={cycleDay} phase={phase} style={{ animationDelay: "60ms" }} />
        </aside>

        {/* ── Center: Open Journal HERO (wider) ── */}
        <main className="order-2 lg:col-span-8 flex flex-col gap-4">
          <OpenJournal entries={entries} onSaveEntry={onSaveEntry} style={{ animationDelay: "0ms" }} />
          <JournalStatsRow streak={streak} todayEntry={todayEntry} phase={phase} style={{ animationDelay: "220ms" }} />
        </main>

        {/* ── Right: Affirmation + Memories ── */}
        <aside className="order-3 lg:col-span-2 flex flex-col gap-4">
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

/* ── Open Journal (HERO — luxury 3D flipbook) ── */
const JOURNAL_STYLES = `
  @keyframes bk-flip-out {
    0%   { transform: rotateY(0deg);   opacity: 1; }
    100% { transform: rotateY(-88deg); opacity: 0; }
  }
  @keyframes bk-flip-in {
    0%   { transform: rotateY(88deg);  opacity: 0; }
    100% { transform: rotateY(0deg);   opacity: 1; }
  }
  .bk-flip-out {
    animation: bk-flip-out 0.28s cubic-bezier(0.4,0,1,1) forwards;
    transform-origin: left center;
  }
  .bk-flip-in {
    animation: bk-flip-in 0.28s cubic-bezier(0,0,0.6,1) forwards;
    transform-origin: left center;
  }
  [contenteditable][data-ph]:empty::before {
    content: attr(data-ph);
    color: rgba(139,104,64,0.38);
    pointer-events: none;
    font-style: italic;
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
  const contentRef = useRef<HTMLDivElement>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout>>();
  const pageIndexRef = useRef(0);
  const todayEntryRef = useRef<DiaryEntry | undefined>(undefined);
  const touchStartX = useRef<number | null>(null);

  const todayISO_ = todayISO();
  const todayEntry = entries.find((e) => e.date === todayISO_);
  const isToday = pageIndex === 0;
  const maxPage = entries.length;
  const canFlipForward = pageIndex < maxPage;
  const canFlipBack = pageIndex > 0;

  pageIndexRef.current = pageIndex;
  todayEntryRef.current = todayEntry;

  const currentEntry = pageIndex === 0 ? todayEntry : entries[pageIndex - 1];
  const leftEntry = pageIndex === 0 ? undefined : (pageIndex === 1 ? todayEntry : entries[pageIndex - 2]);

  const todayLabel = new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });

  const rightDateLabel = currentEntry
    ? new Date(currentEntry.date + "T00:00:00").toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })
    : todayLabel;
  const leftDateLabel = leftEntry
    ? new Date(leftEntry.date + "T00:00:00").toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })
    : todayLabel;

  // Sync contenteditable only when page changes (not on every auto-save re-render)
  useEffect(() => {
    if (!contentRef.current) return;
    const e = pageIndexRef.current === 0 ? todayEntryRef.current : entries[pageIndexRef.current - 1];
    contentRef.current.innerHTML = e?.html ?? "";
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageIndex]);

  const saveCurrentContent = () => {
    if (!contentRef.current || pageIndexRef.current !== 0) return;
    const te = todayEntryRef.current;
    const label = new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });
    onSaveEntry({
      id: te?.id ?? crypto.randomUUID(),
      date: todayISO(),
      mood: te?.mood ?? "calm",
      title: te?.title || label,
      html: contentRef.current.innerHTML,
      theme: te?.theme ?? "sakura",
      font: te?.font ?? "caveat",
      createdAt: te?.createdAt ?? new Date().toISOString(),
    });
  };

  const handleInput = () => {
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(saveCurrentContent, 1200);
  };

  const flip = (dir: 1 | -1) => {
    const next = pageIndexRef.current + dir;
    if (next < 0 || next > entries.length) return;
    setFlipClass("bk-flip-out");
    setTimeout(() => {
      setPageIndex(next);
      setFlipClass("bk-flip-in");
      setTimeout(() => setFlipClass(""), 280);
    }, 280);
  };

  const onTouchStart = (e: React.TouchEvent) => { touchStartX.current = e.touches[0].clientX; };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    touchStartX.current = null;
    if (dx < -60) flip(1);
    else if (dx > 60) flip(-1);
  };

  const pageStyle = (side: "left" | "right"): React.CSSProperties => ({
    flex: 1,
    position: "relative",
    padding: "32px 28px 28px",
    background: side === "left"
      ? "linear-gradient(160deg, #FEFCF6 0%, #F8F4E8 60%, #FAF6EC 100%)"
      : "linear-gradient(160deg, #F8F4E8 0%, #FEFCF6 60%, #FAF8F0 100%)",
    boxShadow: side === "left"
      ? "inset -18px 0 44px rgba(0,0,0,0.058), inset 0 0 80px rgba(200,168,120,0.03)"
      : "inset 18px 0 44px rgba(0,0,0,0.058), inset 0 0 80px rgba(200,168,120,0.03)",
    overflow: "hidden",
  });

  const ruledLines: React.CSSProperties = {
    position: "absolute", inset: 0, opacity: 0.038, pointerEvents: "none",
    backgroundImage: "repeating-linear-gradient(to bottom, transparent, transparent 31px, #8B6840 31px, #8B6840 32px)",
    backgroundPositionY: "68px",
  };

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: JOURNAL_STYLES }} />
      <div className="animate-scale-in" style={style}>
        <div style={{ position: "relative" }}>
          {/* Stacked page depth shadows */}
          <div style={{ position: "absolute", left: 22, right: 22, top: 10, bottom: -6, borderRadius: 18, background: "#CDB488", opacity: 0.2, filter: "blur(5px)", zIndex: -2 }} />
          <div style={{ position: "absolute", left: 14, right: 14, top: 5, bottom: -3, borderRadius: 16, background: "#DEC8A0", opacity: 0.14, filter: "blur(2px)", zIndex: -1 }} />

          {/* 3D book container */}
          <div style={{ perspective: "2400px", perspectiveOrigin: "50% 40%" }}>
            <div
              style={{
                transform: "rotateX(3deg) rotateY(-5deg)",
                transformStyle: "preserve-3d",
                transition: "transform 0.4s ease",
                background: "linear-gradient(to bottom, #7A5025 0%, #A87840 18%, #CC9860 36%, #D8A870 50%, #C09050 64%, #A07030 82%, #7A5025 100%)",
                borderRadius: "3px 20px 20px 3px",
                padding: "10px 14px 10px 0",
                boxShadow: [
                  "-8px 12px 44px rgba(0,0,0,0.28)",
                  "10px 16px 60px rgba(0,0,0,0.16)",
                  "0 48px 88px rgba(255,105,180,0.07)",
                  "inset 0 1px 0 rgba(255,255,255,0.07)",
                ].join(", "),
              }}
              onTouchStart={onTouchStart}
              onTouchEnd={onTouchEnd}
            >
              {/* Left leather spine */}
              <div style={{
                position: "absolute", left: 0, top: 0, bottom: 0, width: 30,
                background: "linear-gradient(to right, #2E1200, #5A2C08, #8A5020, #6A3810, #2E1200)",
                boxShadow: "6px 0 16px rgba(0,0,0,0.32), inset 4px 0 8px rgba(255,200,100,0.05), inset -2px 0 4px rgba(0,0,0,0.35)",
                borderRadius: "3px 0 0 3px",
                zIndex: 10,
              }}>
                <div style={{ position: "absolute", top: "12%", left: "50%", transform: "translateX(-50%)", width: 1, height: "76%", background: "linear-gradient(to bottom, transparent, rgba(255,210,90,0.22), transparent)" }} />
              </div>

              {/* Pages spread */}
              <div style={{ marginLeft: 30, display: "flex", minHeight: 560 }}>

                {/* ── LEFT PAGE ── */}
                <div style={pageStyle("left")}>
                  <div style={ruledLines} />
                  <div style={{ position: "absolute", right: 0, top: 0, bottom: 0, width: 28, background: "linear-gradient(to left, rgba(0,0,0,0.055), transparent)", pointerEvents: "none" }} />
                  <img src="/images/landing-orb-flower.png" alt="" aria-hidden style={{ position: "absolute", top: -20, left: -20, width: 88, height: 88, opacity: 0.1, transform: "rotate(12deg)", objectFit: "contain", pointerEvents: "none" }} />
                  <img src="/images/landing-orb-flower.png" alt="" aria-hidden style={{ position: "absolute", bottom: -16, right: -8, width: 68, height: 68, opacity: 0.07, transform: "rotate(200deg)", objectFit: "contain", pointerEvents: "none" }} />

                  <div style={{ position: "relative", zIndex: 1, height: "100%", display: "flex", flexDirection: "column" }}>
                    <p style={{ fontFamily: "'Caveat', cursive", fontSize: 20, color: "#8B6840", lineHeight: 1.3, marginBottom: 4 }}>{leftDateLabel}</p>
                    <div style={{ height: 1, background: "linear-gradient(to right, rgba(139,104,64,0.32), rgba(200,168,122,0.44), transparent)", marginBottom: 16 }} />

                    {leftEntry ? (
                      <div style={{ flex: 1, fontFamily: "'Caveat', cursive", fontSize: 19, lineHeight: "32px", color: "#7A5530", overflow: "hidden" }}
                        dangerouslySetInnerHTML={{ __html: leftEntry.html || "<em style='color:rgba(139,104,64,0.38)'>Blank page…</em>" }} />
                    ) : (
                      <div style={{ flex: 1 }}>
                        <div style={{ marginBottom: 20 }}>
                          <span style={{ fontSize: 32, color: "rgba(255,47,146,0.2)", lineHeight: 1, display: "block", marginBottom: 4 }}>"</span>
                          <p style={{ fontFamily: "'Caveat', cursive", fontSize: 17, lineHeight: 1.65, color: "#7A5530", fontStyle: "italic", margin: 0 }}>
                            She remembered who she was,<br />and the game changed.
                          </p>
                          <p style={{ fontSize: 11, color: "#A08060", marginTop: 6 }}>— Lalah Delia</p>
                        </div>
                        {entries.length > 0 && (
                          <>
                            <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#A08060", marginBottom: 8 }}>Recent moods</p>
                            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                              {entries.slice(0, 12).map((e, i) => {
                                const M = moodMeta(e.mood);
                                return (
                                  <span key={e.id} title={`${e.date}: ${M.label}`}
                                    style={{ width: 26, height: 26, borderRadius: "50%", display: "inline-flex", alignItems: "center", justifyContent: "center", background: "linear-gradient(135deg,#FF2F92,#E6007A)", opacity: Math.max(0.2, 1 - i * 0.08) }}>
                                    <M.Icon style={{ width: 12, height: 12, color: "white" }} strokeWidth={2} />
                                  </span>
                                );
                              })}
                            </div>
                          </>
                        )}
                        {entries.length === 0 && (
                          <p style={{ fontFamily: "'Caveat', cursive", fontSize: 17, color: "#A08060" }}>Begin your story here ✿</p>
                        )}
                      </div>
                    )}

                    <p style={{ textAlign: "center", fontSize: 10, fontWeight: 600, color: "#C8A87A", marginTop: 12 }}>~ {pageIndex * 2 + 1} ~</p>
                  </div>
                </div>

                {/* ── CENTER SPINE FOLD ── */}
                <div style={{
                  flexShrink: 0, width: 26,
                  background: "linear-gradient(to right, #C0A880, #E4D0A4, #F2E4BC, #E4D0A4, #C0A880)",
                  boxShadow: "inset 4px 0 14px rgba(0,0,0,0.13), inset -4px 0 14px rgba(0,0,0,0.10)",
                }} />

                {/* ── RIGHT PAGE ── writing area */}
                <div
                  className={flipClass}
                  style={{
                    ...pageStyle("right"),
                    transformStyle: "preserve-3d",
                  }}
                >
                  <div style={ruledLines} />
                  <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 28, background: "linear-gradient(to right, rgba(0,0,0,0.055), transparent)", pointerEvents: "none" }} />
                  <img src="/images/landing-orb-flower.png" alt="" aria-hidden style={{ position: "absolute", top: -20, right: -20, width: 88, height: 88, opacity: 0.1, transform: "rotate(-12deg)", objectFit: "contain", pointerEvents: "none" }} />
                  <img src="/images/landing-orb-flower.png" alt="" aria-hidden style={{ position: "absolute", bottom: -16, left: -8, width: 68, height: 68, opacity: 0.07, transform: "rotate(15deg)", objectFit: "contain", pointerEvents: "none" }} />

                  <div style={{ position: "relative", zIndex: 1, height: "100%", display: "flex", flexDirection: "column" }}>
                    <p style={{ fontFamily: "'Caveat', cursive", fontSize: 22, color: "#8B6840", lineHeight: 1.3, marginBottom: 4 }}>{rightDateLabel}</p>
                    <div style={{ height: 1, background: "linear-gradient(to right, transparent, rgba(200,168,122,0.44), transparent)", marginBottom: 12 }} />

                    {isToday ? (
                      <div
                        ref={contentRef}
                        contentEditable
                        suppressContentEditableWarning
                        onInput={handleInput}
                        data-ph="Click here and start writing... let your thoughts flow ✿"
                        style={{
                          flex: 1,
                          fontFamily: "'Caveat', cursive",
                          fontSize: 21,
                          lineHeight: "32px",
                          color: "#3E2008",
                          outline: "none",
                          cursor: "text",
                          minHeight: 420,
                          wordBreak: "break-word",
                        }}
                      />
                    ) : (
                      <div
                        style={{
                          flex: 1,
                          fontFamily: "'Caveat', cursive",
                          fontSize: 21,
                          lineHeight: "32px",
                          color: "#3E2008",
                          overflow: "hidden",
                          minHeight: 420,
                        }}
                        dangerouslySetInnerHTML={{ __html: currentEntry?.html || "<em style='color:rgba(139,104,64,0.38)'>Blank page…</em>" }}
                      />
                    )}

                    <p style={{ textAlign: "center", fontSize: 10, fontWeight: 600, color: "#C8A87A", marginTop: 8 }}>~ {pageIndex * 2 + 2} ~</p>
                  </div>
                </div>

              </div>
            </div>
          </div>

          {/* Page navigation */}
          <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 18, marginTop: 22 }}>
            <button
              onClick={() => flip(-1)}
              disabled={!canFlipBack}
              style={{
                width: 42, height: 42, borderRadius: "50%", display: "inline-flex", alignItems: "center", justifyContent: "center",
                background: "rgba(255,255,255,0.9)", border: "1px solid rgba(232,213,180,0.7)",
                color: canFlipBack ? "#FF2F92" : "rgba(160,128,96,0.25)",
                boxShadow: canFlipBack ? "0 2px 12px rgba(0,0,0,0.1)" : "none",
                cursor: canFlipBack ? "pointer" : "not-allowed", transition: "all 0.2s",
              }}
            >
              <ChevronLeft style={{ width: 18, height: 18 }} strokeWidth={2.5} />
            </button>
            <span style={{ fontFamily: "'Caveat', cursive", fontSize: 17, color: "rgba(139,104,64,0.6)" }}>
              {pageIndex === 0 ? "today ✿" : `page ${pageIndex} of ${entries.length}`}
            </span>
            <button
              onClick={() => flip(1)}
              disabled={!canFlipForward}
              style={{
                width: 42, height: 42, borderRadius: "50%", display: "inline-flex", alignItems: "center", justifyContent: "center",
                background: "rgba(255,255,255,0.9)", border: "1px solid rgba(232,213,180,0.7)",
                color: canFlipForward ? "#FF2F92" : "rgba(160,128,96,0.25)",
                boxShadow: canFlipForward ? "0 2px 12px rgba(0,0,0,0.1)" : "none",
                cursor: canFlipForward ? "pointer" : "not-allowed", transition: "all 0.2s",
              }}
            >
              <ChevronRight style={{ width: 18, height: 18 }} strokeWidth={2.5} />
            </button>
          </div>
        </div>
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
  const phaseDesc: Record<string, string> = {
    Menstrual: "Rest, reflect, and restore. Your body is renewing itself.",
    Follicular: "Energy rises! New ideas and fresh starts feel natural now.",
    Ovulatory: "You're radiant — perfect time to connect and express yourself.",
    Luteal: "Slow down and turn inward. Nourish yourself gently.",
  };

  return (
    <div
      className="animate-scale-in overflow-hidden rounded-2xl shadow-sm"
      style={{ border: "1px solid rgba(232,213,180,0.65)", animationDelay: style?.animationDelay as string }}
    >
      {/* Hero image */}
      <div className="relative h-36 overflow-hidden">
        <img src="/images/tools-hero-journey.png" alt="" className="w-full h-full object-cover object-center" />
        <div className="absolute inset-0" style={{ background: "linear-gradient(to top, #FEFCF7 0%, rgba(254,252,247,0.5) 50%, transparent 100%)" }} />
      </div>

      {/* Content */}
      <div className="p-5" style={{ background: "#FEFCF7" }}>
        <div className="flex items-center gap-2 mb-4">
          <span className="text-hotpink text-lg">✿</span>
          <h3 className="font-script text-xl" style={{ color: "#8B6840" }}>Today's Bloom</h3>
        </div>

        {/* Cycle stats */}
        <div className="flex items-center gap-3 mb-4">
          <div className="text-center">
            <p className="text-3xl font-bold leading-none" style={{ color: "#FF2F92" }}>{cycleDay}</p>
            <p className="text-[9px] font-bold uppercase tracking-wider mt-0.5" style={{ color: "#A08060" }}>Cycle Day</p>
          </div>
          <div className="h-10 w-px" style={{ background: "rgba(232,213,180,0.8)" }} />
          <div>
            <p className="text-sm font-bold leading-none" style={{ color: "#6B4C30" }}>{phase}</p>
            <p className="text-[11px] mt-0.5" style={{ color: "#A08060" }}>phase</p>
          </div>
        </div>

        <p className="text-[11px] leading-relaxed mb-4" style={{ color: "#8B6840" }}>{phaseDesc[phase]}</p>

        {/* Divider */}
        <div className="h-px mb-4" style={{ background: "linear-gradient(to right, transparent, rgba(232,213,180,0.8), transparent)" }} />

        {/* Reflection prompt */}
        <div>
          <p className="text-[9px] font-bold uppercase tracking-wider mb-2" style={{ color: "#FF2F92" }}>Reflection Prompt</p>
          <p className="font-script text-[15px] leading-relaxed" style={{ color: "#6B4C30" }}>{prompt}</p>
        </div>
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
