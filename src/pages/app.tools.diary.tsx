import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft, Plus, Trash2, Edit3, X, BookHeart, Sparkles,
  Cloud, Smile, Heart, CloudRain, Battery, Activity, Droplet,
  Calendar,
} from "lucide-react";
import { BloomBubbles } from "@/components/bloom/BloomBubbles";
import { PageHeader } from "@/components/bloom/PageHeader";

export interface DiaryEntry {
  id: string;
  date: string; // YYYY-MM-DD
  mood: string;
  title: string;
  text: string;
  createdAt: string;
}

export const DIARY_STORAGE_KEY = "bloom:diary";

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

export function moodMeta(key: string) {
  return DIARY_MOODS.find((m) => m.key === key) ?? DIARY_MOODS[0];
}

function loadEntries(): DiaryEntry[] {
  try {
    const raw = localStorage.getItem(DIARY_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
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
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

export default function DiaryPage() {
  const [entries, setEntries] = useState<DiaryEntry[]>(() => loadEntries());
  const [composing, setComposing] = useState(false);
  const [editing, setEditing] = useState<DiaryEntry | null>(null);

  useEffect(() => {
    saveEntries(entries);
  }, [entries]);

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
        <button
          onClick={() => setComposing(true)}
          className="inline-flex items-center gap-1.5 rounded-full bg-hotpink px-4 py-2 text-xs font-semibold text-white shadow-md shadow-hotpink/30 transition hover:scale-[1.03] hover:bg-magenta"
        >
          <Plus className="h-3.5 w-3.5" strokeWidth={2} /> New entry
        </button>
      </PageHeader>

      {sorted.length === 0 ? (
        <div className="rounded-[2rem] bg-white/85 backdrop-blur p-10 text-center shadow-xl shadow-rose/10 border border-petal/50">
          <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-blush text-hotpink">
            <BookHeart className="h-6 w-6" strokeWidth={1.6} />
          </span>
          <p className="mt-3 font-script text-3xl text-hotpink">Your softest little journal</p>
          <p className="mt-1.5 text-sm text-rose/80">Write down how today felt — your future self will love reading it back.</p>
          <button
            onClick={() => setComposing(true)}
            className="mt-5 inline-flex items-center gap-1.5 rounded-full bg-hotpink px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-hotpink/30 transition hover:scale-[1.03] hover:bg-magenta"
          >
            <Plus className="h-4 w-4" strokeWidth={2} /> Write your first entry
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {sorted.map((entry) => {
            const mood = moodMeta(entry.mood);
            return (
              <div
                key={entry.id}
                className="group rounded-3xl bg-white/85 backdrop-blur p-5 border border-petal/50 shadow-[0_8px_24px_-12px_oklch(0.7_0.18_350/0.3)] transition hover:-translate-y-0.5"
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
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
                    <button
                      onClick={() => setEditing(entry)}
                      className="grid h-8 w-8 place-items-center rounded-full text-rose/60 hover:text-hotpink hover:bg-blush transition"
                    >
                      <Edit3 className="h-3.5 w-3.5" strokeWidth={1.8} />
                    </button>
                    <button
                      onClick={() => deleteEntry(entry.id)}
                      className="grid h-8 w-8 place-items-center rounded-full text-rose/60 hover:text-magenta hover:bg-magenta/10 transition"
                    >
                      <Trash2 className="h-3.5 w-3.5" strokeWidth={1.8} />
                    </button>
                  </div>
                </div>
                <p className="mt-3 text-sm text-rose/80 leading-relaxed whitespace-pre-wrap line-clamp-6">{entry.text}</p>
              </div>
            );
          })}
        </div>
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

function DiaryComposer({
  initial, onClose, onSave,
}: { initial?: DiaryEntry; onClose: () => void; onSave: (entry: DiaryEntry) => void }) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [text, setText] = useState(initial?.text ?? "");
  const [mood, setMood] = useState(initial?.mood ?? "calm");
  const [date, setDate] = useState(initial?.date ?? todayISO());

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    onSave({
      id: initial?.id ?? crypto.randomUUID(),
      date,
      mood,
      title: title.trim(),
      text: text.trim(),
      createdAt: initial?.createdAt ?? new Date().toISOString(),
    });
  };

  return (
    <div className="fixed inset-0 z-[100] grid place-items-center bg-[#831843]/40 backdrop-blur-sm p-4 animate-fade-in">
      <div className="relative w-full max-w-lg rounded-[2rem] bg-white shadow-2xl shadow-[#EC4899]/30 border border-[#EC4899]/15 p-6 max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 grid h-8 w-8 place-items-center rounded-full text-[#9D5C7E] hover:text-[#EC4899] hover:bg-[#FBCFE8] transition"
        >
          <X className="h-4 w-4" />
        </button>

        <h2 className="font-script text-3xl text-[#831843]">{initial ? "Edit entry" : "New entry"} ✿</h2>

        <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-3">
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

          <div>
            <label className="text-xs font-semibold text-rose/70">Title (optional)</label>
            <input
              type="text"
              placeholder="A little headline for today…"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="mt-1 w-full rounded-2xl border border-[#EC4899]/20 bg-[#FFF0F6]/60 px-4 py-2.5 text-sm text-[#831843] placeholder:text-[#9D5C7E]/70 outline-none focus:border-[#EC4899] transition"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-rose/70">What's on your heart?</label>
            <textarea
              required
              rows={6}
              placeholder="Write freely — this space is just for you…"
              value={text}
              onChange={(e) => setText(e.target.value)}
              className="mt-1 w-full rounded-2xl border border-[#EC4899]/20 bg-[#FFF0F6]/60 px-4 py-2.5 text-sm text-[#831843] placeholder:text-[#9D5C7E]/70 outline-none focus:border-[#EC4899] transition resize-none"
            />
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
