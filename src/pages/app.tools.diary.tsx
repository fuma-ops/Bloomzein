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
   DASHBOARD — luxury 3-panel journal layout
   ============================================================ */
function DiaryDashboard({
  entries, onNew, onEdit, onDelete,
}: {
  entries: DiaryEntry[];
  onNew: () => void;
  onEdit: (e: DiaryEntry) => void;
  onDelete: (id: string) => void;
}) {
  const streak = useMemo(() => computeStreak(entries), [entries]);
  const affirmation = todayAffirmation();
  const bloomTip = todayBloomTip();
  const todayEntry = entries.find((e) => e.date === todayISO());
  const recent = entries.slice(0, 3);

  return (
    <div className="relative">
      {/* Floating decorative orbs */}
      <img src="/images/landing-orb-flower.png" alt="" aria-hidden
        className="pointer-events-none select-none absolute -top-10 -right-6 w-52 opacity-[0.07] rotate-12 hidden lg:block"
      />
      <img src="/images/landing-orb-mind.png" alt="" aria-hidden
        className="pointer-events-none select-none absolute top-1/2 -left-10 w-40 opacity-[0.05] hidden lg:block"
      />

      <div className="grid gap-5 lg:grid-cols-4 lg:gap-6 lg:items-start">

        {/* ── Left sidebar ── */}
        <aside className="hidden lg:flex flex-col gap-4 lg:col-span-1">
          <TodayPhaseCard style={{ animationDelay: "60ms" }} />
          <BloomTipCard tip={bloomTip} style={{ animationDelay: "120ms" }} />
          <JournalGoalsCard entries={entries} style={{ animationDelay: "180ms" }} />
        </aside>

        {/* ── Center ── */}
        <main className="flex flex-col gap-4 lg:col-span-2">
          <OpenJournal entries={entries} todayEntry={todayEntry} onNew={onNew} style={{ animationDelay: "0ms" }} />
          <div className="grid grid-cols-3 gap-3">
            <StreakStatCard streak={streak} style={{ animationDelay: "200ms" }} />
            <TodayMoodCard todayEntry={todayEntry} style={{ animationDelay: "240ms" }} />
            <TotalEntriesCard count={entries.length} style={{ animationDelay: "280ms" }} />
          </div>
          <DiaryQuoteStrip />
        </main>

        {/* ── Right sidebar ── */}
        <aside className="flex flex-col gap-4 lg:col-span-1">
          <AffirmationCard affirmation={affirmation} style={{ animationDelay: "80ms" }} />
          {recent.length > 0 ? (
            <RecentMemoriesCard entries={recent} onEdit={onEdit} style={{ animationDelay: "140ms" }} />
          ) : (
            <MobileTipCard tip={bloomTip} style={{ animationDelay: "140ms" }} />
          )}
        </aside>

      </div>
    </div>
  );
}

/* ── Open Journal ── */
function OpenJournal({
  entries, todayEntry, onNew, style,
}: {
  entries: DiaryEntry[];
  todayEntry?: DiaryEntry;
  onNew: () => void;
  style?: CSSProperties;
}) {
  const latest = entries[0];
  const today = new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });

  return (
    <div
      className="animate-scale-in overflow-hidden rounded-[1.75rem] shadow-[0_20px_40px_rgba(255,105,180,.12),_0_8px_20px_rgba(255,255,255,.8)_inset] border border-petal/40"
      style={style}
    >
      {/* Hero image */}
      <div className="relative h-40 sm:h-48 overflow-hidden">
        <img
          src="/images/cycle-journal-hero.webp"
          alt="Journal"
          className="w-full h-full object-cover object-top"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#FFF8F3] via-[#FFF8F3]/40 to-transparent" />
        <div className="absolute bottom-4 left-5 right-5">
          <p className="font-script text-2xl text-hotpink drop-shadow-sm">{today}</p>
          <p className="mt-0.5 text-[11px] font-semibold text-rose/60">
            {entries.length > 0
              ? `${entries.length} memor${entries.length === 1 ? "y" : "ies"} written`
              : "Begin your story ✿"}
          </p>
        </div>
      </div>

      {/* Two-page spread */}
      <div className="flex min-h-[190px] bg-[#FFFCF9]">

        {/* Left page */}
        <div className="flex-1 p-5 relative overflow-hidden">
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.03]"
            style={{
              backgroundImage: "repeating-linear-gradient(to bottom, transparent, transparent 27px, #EC4899 27px, #EC4899 28px)",
              backgroundPositionY: "40px",
            }}
          />
          <div className="relative z-10">
            <p className="font-script text-base text-rose/50 mb-2.5">Recent moods…</p>
            <div className="flex gap-1.5 flex-wrap">
              {entries.slice(0, 12).map((e, i) => {
                const M = moodMeta(e.mood);
                return (
                  <span
                    key={e.id}
                    title={`${e.date}: ${M.label}`}
                    className="h-6 w-6 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{
                      background: "linear-gradient(135deg, #FF2F92, #E6007A)",
                      opacity: Math.max(0.25, 1 - i * 0.07),
                    }}
                  >
                    <M.Icon className="h-3 w-3 text-white" strokeWidth={2} />
                  </span>
                );
              })}
              {entries.length === 0 && (
                <p className="text-xs text-rose/40 italic">Write your first entry ✿</p>
              )}
            </div>

            <div className="mt-4 pt-3 border-t border-petal/30">
              <Quote className="h-3.5 w-3.5 text-hotpink/30 mb-1.5" strokeWidth={1.5} />
              <p className="text-[11px] text-rose/60 leading-relaxed italic">
                "She remembered who she was,<br />and the game changed."
              </p>
              <p className="mt-1 text-[10px] text-rose/40">— Lalah Delia</p>
            </div>
          </div>
        </div>

        {/* Spine */}
        <div className="w-4 flex-shrink-0 bg-gradient-to-r from-[#F8C8D8]/60 via-[#F5B5C8]/90 to-[#F8C8D8]/60 shadow-[inset_2px_0_4px_rgba(255,105,180,.15),_inset_-2px_0_4px_rgba(255,105,180,.15)]" />

        {/* Right page */}
        <div className="flex-1 p-5 relative overflow-hidden">
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.03]"
            style={{
              backgroundImage: "repeating-linear-gradient(to bottom, transparent, transparent 27px, #EC4899 27px, #EC4899 28px)",
              backgroundPositionY: "40px",
            }}
          />
          <div className="relative z-10">
            {latest ? (
              <>
                <MoodEntryHeader entry={latest} />
                <div
                  className="mt-2.5 text-[11px] text-rose/70 leading-relaxed line-clamp-4"
                  style={{ fontFamily: fontFamilyFor(latest.font) }}
                  dangerouslySetInnerHTML={{ __html: latest.html }}
                />
                <button
                  onClick={onNew}
                  className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-hotpink/25 bg-hotpink/10 px-3 py-1.5 text-[11px] font-semibold text-hotpink hover:bg-hotpink hover:text-white transition animate-card-breathe"
                >
                  <Edit3 className="h-3 w-3" strokeWidth={2} />
                  {todayEntry ? "Edit today's entry" : "Write today's entry"}
                </button>
              </>
            ) : (
              <div className="flex h-full flex-col items-center justify-center py-4 text-center">
                <BookHeart className="h-7 w-7 text-hotpink/40 mb-2" strokeWidth={1.5} />
                <p className="font-script text-xl text-hotpink">Begin your story</p>
                <p className="mt-1 text-xs text-rose/60 max-w-[16ch] leading-relaxed">
                  Your first entry is waiting to be written.
                </p>
                <button
                  onClick={onNew}
                  className="bloom-luxury-btn mt-3 inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white animate-card-breathe"
                >
                  <Plus className="h-3.5 w-3.5" strokeWidth={2} /> Write first entry
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function MoodEntryHeader({ entry }: { entry: DiaryEntry }) {
  const M = moodMeta(entry.mood);
  return (
    <div className="flex items-center gap-2">
      <span className="h-7 w-7 rounded-full flex items-center justify-center bg-gradient-to-br from-hotpink to-magenta text-white shadow-sm flex-shrink-0">
        <M.Icon className="h-3.5 w-3.5" strokeWidth={1.8} />
      </span>
      <div className="min-w-0">
        <h4 className="text-xs font-bold text-rose truncate">{entry.title || "Untitled"}</h4>
        <p className="text-[10px] text-rose/50">{fmtDate(entry.date)}</p>
      </div>
    </div>
  );
}

/* ── Stats row ── */
function StreakStatCard({ streak, style }: { streak: number; style?: CSSProperties }) {
  return (
    <div
      className="animate-scale-in rounded-2xl bg-gradient-to-br from-[#FFF0F6] to-[#FFE0EE] border border-petal/40 p-4 text-center shadow-sm"
      style={style}
    >
      <Flame className="h-5 w-5 text-hotpink mx-auto" strokeWidth={1.8} />
      <p className="mt-1 text-2xl font-bold text-hotpink leading-none">{streak}</p>
      <p className="mt-0.5 text-[10px] font-semibold text-rose/60">day streak</p>
    </div>
  );
}

function TodayMoodCard({ todayEntry, style }: { todayEntry?: DiaryEntry; style?: CSSProperties }) {
  const M = todayEntry ? moodMeta(todayEntry.mood) : null;
  return (
    <div
      className="animate-scale-in rounded-2xl bg-gradient-to-br from-[#FFF8F3] to-[#F8E4EA] border border-petal/40 p-4 text-center shadow-sm"
      style={style}
    >
      {M ? (
        <>
          <M.Icon className="h-5 w-5 text-hotpink mx-auto" strokeWidth={1.8} />
          <p className="mt-1 text-xs font-bold text-rose leading-none">{M.label}</p>
          <p className="mt-0.5 text-[10px] font-semibold text-rose/60">today</p>
        </>
      ) : (
        <>
          <Heart className="h-5 w-5 text-petal mx-auto" strokeWidth={1.8} />
          <p className="mt-1 text-[11px] font-semibold text-rose/50 leading-snug">How do<br />you feel?</p>
        </>
      )}
    </div>
  );
}

function TotalEntriesCard({ count, style }: { count: number; style?: CSSProperties }) {
  return (
    <div
      className="animate-scale-in rounded-2xl bg-gradient-to-br from-[#F5EEFF] to-[#EAE0FB] border border-purple-100/60 p-4 text-center shadow-sm"
      style={style}
    >
      <Sparkles className="h-5 w-5 text-purple-400 mx-auto" strokeWidth={1.8} />
      <p className="mt-1 text-2xl font-bold text-purple-600 leading-none">{count}</p>
      <p className="mt-0.5 text-[10px] font-semibold text-purple-400">entries</p>
    </div>
  );
}

/* ── Left panel ── */
function TodayPhaseCard({ style }: { style?: CSSProperties }) {
  const cycleDay = ((new Date().getDate() - 1) % 28) + 1;
  const phase =
    cycleDay <= 5 ? "Menstrual" : cycleDay <= 13 ? "Follicular" : cycleDay <= 15 ? "Ovulatory" : "Luteal";
  const phaseEmoji = { Menstrual: "🌑", Follicular: "🌱", Ovulatory: "✨", Luteal: "🌙" }[phase];
  const phaseText = {
    Menstrual: "Rest, reflect, and restore. Your body is renewing itself.",
    Follicular: "Energy rises! New ideas and fresh starts feel natural now.",
    Ovulatory: "You're radiant — perfect time to connect and express yourself.",
    Luteal: "Slow down and turn inward. Nourish yourself gently.",
  }[phase];

  return (
    <div className="animate-scale-in overflow-hidden rounded-2xl border border-petal/40 shadow-sm" style={style}>
      <div className="relative h-24 overflow-hidden">
        <img src="/images/today-hero.png" alt="" className="w-full h-full object-cover object-center" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#FFF8F3]/95 via-[#FFF8F3]/40 to-transparent" />
        <div className="absolute bottom-2 left-3">
          <p className="text-xs font-bold text-rose">{phaseEmoji} Cycle day {cycleDay}</p>
          <p className="text-[11px] font-semibold text-hotpink">{phase} phase</p>
        </div>
      </div>
      <div className="bg-[#FFFCF9] px-3.5 py-3">
        <p className="text-[11px] text-rose/70 leading-relaxed">{phaseText}</p>
      </div>
    </div>
  );
}

function BloomTipCard({ tip, style }: { tip: string; style?: CSSProperties }) {
  return (
    <div
      className="animate-scale-in rounded-2xl border border-petal/40 bg-gradient-to-br from-[#FFF8F3] to-[#F8E4EA] shadow-sm p-4"
      style={style}
    >
      <div className="flex items-center gap-2 mb-2">
        <span className="h-7 w-7 rounded-full bg-hotpink/10 flex items-center justify-center flex-shrink-0">
          <Sparkles className="h-3.5 w-3.5 text-hotpink" strokeWidth={1.8} />
        </span>
        <p className="text-xs font-bold text-rose">Bloom Tip</p>
      </div>
      <p className="text-[11px] text-rose/70 leading-relaxed">{tip}</p>
    </div>
  );
}

function JournalGoalsCard({ entries, style }: { entries: DiaryEntry[]; style?: CSSProperties }) {
  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - now.getDay());
  weekStart.setHours(0, 0, 0, 0);

  const thisWeek = entries.filter((e) => new Date(e.date + "T00:00:00") >= weekStart).length;
  const thisMonth = entries.filter((e) => e.date.slice(0, 7) === todayISO().slice(0, 7)).length;

  const goals = [
    { label: "Write 3× this week", done: thisWeek >= 3, progress: `${Math.min(thisWeek, 3)}/3` },
    { label: "Capture a cherished memory", done: thisMonth >= 1 },
    { label: "Track your energy levels", done: false },
  ];

  return (
    <div
      className="animate-scale-in rounded-2xl border border-petal/40 bg-[#FFFCF9] shadow-sm p-4"
      style={style}
    >
      <div className="flex items-center gap-2 mb-3">
        <span className="h-7 w-7 rounded-full bg-blush flex items-center justify-center flex-shrink-0">
          <BookHeart className="h-3.5 w-3.5 text-hotpink" strokeWidth={1.8} />
        </span>
        <p className="text-xs font-bold text-rose">Journal Goals</p>
      </div>
      <ul className="flex flex-col gap-2">
        {goals.map((g, i) => (
          <li key={i} className="flex items-center gap-2 text-[11px] text-rose/70">
            <span
              className={[
                "h-4 w-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center",
                g.done ? "border-hotpink bg-hotpink" : "border-petal/60",
              ].join(" ")}
            >
              {g.done && <span className="h-1.5 w-1.5 rounded-full bg-white" />}
            </span>
            <span className={g.done ? "line-through opacity-60" : ""}>{g.label}</span>
            {!g.done && "progress" in g && (
              <span className="ml-auto text-hotpink font-semibold">{(g as { progress: string }).progress}</span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ── Right panel ── */
function AffirmationCard({ affirmation, style }: { affirmation: string; style?: CSSProperties }) {
  return (
    <div className="animate-scale-in overflow-hidden rounded-2xl border border-petal/40 shadow-sm" style={style}>
      <div className="relative h-28 overflow-hidden">
        <img src="/images/tools-hero-affirmation.png" alt="" className="w-full h-full object-cover object-center" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#FFF8F3]/95 via-transparent to-transparent" />
      </div>
      <div className="bg-[#FFFCF9] p-4">
        <div className="flex items-start gap-2">
          <Quote className="h-4 w-4 text-hotpink/40 flex-shrink-0 mt-0.5" strokeWidth={1.5} />
          <p className="text-[11px] text-rose/80 leading-relaxed italic">{affirmation}</p>
        </div>
        <p className="mt-2 text-[10px] font-bold text-hotpink tracking-wide uppercase">Daily Affirmation</p>
      </div>
    </div>
  );
}

function RecentMemoriesCard({
  entries, onEdit, style,
}: { entries: DiaryEntry[]; onEdit: (e: DiaryEntry) => void; style?: CSSProperties }) {
  const memoryImages = ["/images/blog-1.png", "/images/blog-2.png", "/images/blog-3.png"];
  return (
    <div className="animate-scale-in rounded-2xl border border-petal/40 bg-[#FFFCF9] shadow-sm p-4" style={style}>
      <div className="flex items-center gap-2 mb-3">
        <span className="h-7 w-7 rounded-full bg-blush flex items-center justify-center flex-shrink-0">
          <BookOpen className="h-3.5 w-3.5 text-hotpink" strokeWidth={1.8} />
        </span>
        <p className="text-xs font-bold text-rose">Recent Memories</p>
      </div>
      <div className="flex flex-col gap-2.5">
        {entries.map((entry, i) => {
          const M = moodMeta(entry.mood);
          return (
            <button
              key={entry.id}
              onClick={() => onEdit(entry)}
              className="group flex items-start gap-2.5 rounded-xl p-1.5 text-left hover:bg-blush/30 transition w-full"
            >
              <div className="h-9 w-9 rounded-lg overflow-hidden flex-shrink-0">
                <img src={memoryImages[i % 3]} alt="" className="w-full h-full object-cover" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-rose truncate">{entry.title || "Untitled"}</p>
                <p className="text-[10px] text-rose/50">{fmtDate(entry.date)}</p>
                <div className="flex items-center gap-1 mt-0.5">
                  <M.Icon className="h-2.5 w-2.5 text-hotpink/60" strokeWidth={2} />
                  <span className="text-[10px] text-rose/50">{M.label}</span>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function MobileTipCard({ tip, style }: { tip: string; style?: CSSProperties }) {
  return (
    <div
      className="animate-scale-in lg:hidden rounded-2xl border border-petal/40 bg-gradient-to-br from-[#FFF8F3] to-[#F8E4EA] shadow-sm p-4"
      style={style}
    >
      <div className="flex items-center gap-2 mb-2">
        <span className="h-7 w-7 rounded-full bg-hotpink/10 flex items-center justify-center flex-shrink-0">
          <Sparkles className="h-3.5 w-3.5 text-hotpink" strokeWidth={1.8} />
        </span>
        <p className="text-xs font-bold text-rose">Bloom Tip</p>
      </div>
      <p className="text-[11px] text-rose/70 leading-relaxed">{tip}</p>
    </div>
  );
}

function DiaryQuoteStrip() {
  return (
    <div className="rounded-2xl bg-gradient-to-r from-hotpink/5 via-hotpink/10 to-hotpink/5 border border-petal/40 py-3.5 px-5 text-center animate-scale-in" style={{ animationDelay: "320ms" }}>
      <p className="font-script text-lg text-rose/70">
        <span className="text-hotpink">"</span>
        Every page you fill is a love letter to your future self.
        <span className="text-hotpink">"</span>
      </p>
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
