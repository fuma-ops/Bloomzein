import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft, Plus, Trash2, Edit3, X, BookHeart, Sparkles,
  Cloud, Smile, Heart, CloudRain, Battery, Activity, Droplet,
  Calendar, List, LayoutGrid, BookOpen, ChevronLeft, ChevronRight, Printer,
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
    // Gracefully upgrade entries saved before rich-text/themes existed
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

type ViewMode = "list" | "grid" | "book";

export default function DiaryPage() {
  const [entries, setEntries] = useState<DiaryEntry[]>(() => loadEntries());
  const [composing, setComposing] = useState(false);
  const [editing, setEditing] = useState<DiaryEntry | null>(null);
  const [view, setView] = useState<ViewMode>(() => {
    try { return (localStorage.getItem(VIEW_STORAGE_KEY) as ViewMode) || "list"; } catch { return "list"; }
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
            className="inline-flex items-center gap-1.5 rounded-full bg-hotpink px-4 py-2 text-xs font-semibold text-white shadow-md shadow-hotpink/30 transition hover:scale-[1.03] hover:bg-magenta"
          >
            <Plus className="h-3.5 w-3.5" strokeWidth={2} /> New entry
          </button>
        </div>
      </PageHeader>

      {sorted.length === 0 ? (
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
   EMPTY STATE
   ============================================================ */
function EmptyDiary({ onStart }: { onStart: () => void }) {
  return (
    <div className="rounded-[2rem] bg-white/85 backdrop-blur p-10 text-center shadow-xl shadow-rose/10 border border-petal/50">
      <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-blush text-hotpink">
        <BookHeart className="h-6 w-6" strokeWidth={1.6} />
      </span>
      <p className="mt-3 font-script text-3xl text-hotpink">Your softest little journal</p>
      <p className="mt-1.5 text-sm text-rose/80">Write down how today felt — your future self will love reading it back.</p>
      <button
        onClick={onStart}
        className="mt-5 inline-flex items-center gap-1.5 rounded-full bg-hotpink px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-hotpink/30 transition hover:scale-[1.03] hover:bg-magenta"
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
                <span className="grid h-10 w-10 place-items-center rounded-full bg-gradient-to-br from-hotpink to-magenta text-white shadow-md shadow-hotpink/30">
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
            <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 z-10 grid h-5 w-5 place-items-center rounded-full bg-magenta shadow-md shadow-magenta/40 ring-2 ring-white">
              <span className="h-1.5 w-1.5 rounded-full bg-white/90" />
            </span>
            <div className={`rounded-2xl bg-gradient-to-br ${theme.page} ring-1 ${theme.ring} p-4 shadow-[0_10px_24px_-10px_oklch(0.7_0.18_350/0.4)] transition hover:shadow-[0_16px_32px_-10px_oklch(0.7_0.22_350/0.5)]`}>
              <div className="flex items-center justify-between">
                <span className="grid h-8 w-8 place-items-center rounded-full bg-white/70 text-hotpink">
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
              <span className="grid h-11 w-11 place-items-center rounded-full bg-gradient-to-br from-hotpink to-magenta text-white shadow-md shadow-hotpink/30">
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
          className="grid h-10 w-10 place-items-center rounded-full bg-white/85 border border-petal/50 text-hotpink shadow-sm transition hover:-translate-x-0.5 disabled:opacity-30 disabled:hover:translate-x-0"
        >
          <ChevronLeft className="h-4.5 w-4.5" strokeWidth={2} />
        </button>
        <span className="font-script text-lg text-rose/60">swipe to turn the page ✿</span>
        <button
          onClick={() => goTo(clampedIndex + 1)}
          disabled={clampedIndex === entries.length - 1}
          className="grid h-10 w-10 place-items-center rounded-full bg-white/85 border border-petal/50 text-hotpink shadow-sm transition hover:translate-x-0.5 disabled:opacity-30 disabled:hover:translate-x-0"
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
        className="grid h-8 w-8 place-items-center rounded-full text-rose/60 hover:text-hotpink hover:bg-blush transition"
      >
        <Printer className="h-3.5 w-3.5" strokeWidth={1.8} />
      </button>
      <button
        onClick={() => onEdit(entry)}
        title="Edit"
        className="grid h-8 w-8 place-items-center rounded-full text-rose/60 hover:text-hotpink hover:bg-blush transition"
      >
        <Edit3 className="h-3.5 w-3.5" strokeWidth={1.8} />
      </button>
      <button
        onClick={() => onDelete(entry.id)}
        title="Delete"
        className="grid h-8 w-8 place-items-center rounded-full text-rose/60 hover:text-magenta hover:bg-magenta/10 transition"
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
          className="absolute right-4 top-4 grid h-8 w-8 place-items-center rounded-full text-[#9D5C7E] hover:text-[#EC4899] hover:bg-[#FBCFE8] transition"
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
                      "grid h-9 w-9 place-items-center rounded-full transition",
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
