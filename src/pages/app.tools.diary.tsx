import { useEffect, useMemo, useRef, useState, useCallback } from "react";

/* ─── Types & persistence ─────────────────────────────────────────── */

export interface DiaryEntry {
  id: string;
  date: string;        // YYYY-MM-DD
  mood: string;
  title: string;
  html: string;
  theme: string;
  font: string;
  createdAt: string;
  images?: string[];   // base64 compressed photos
}

export const DIARY_STORAGE_KEY = "bloom:diary";

// Backward-compat export used by toolSnapshots
export function moodMeta(key: string): { label: string } {
  const known = ["Calm","Happy","Energetic","Sensitive","Dreamy","Tired"];
  const match = known.find((n) => n.toLowerCase() === key.toLowerCase());
  return { label: match ?? key };
}

function loadEntries(): DiaryEntry[] {
  try {
    const raw = localStorage.getItem(DIARY_STORAGE_KEY);
    if (!raw) return [sampleEntry()];
    return (JSON.parse(raw) as DiaryEntry[]).map((e) => ({
      id: e.id,
      date: e.date,
      mood: e.mood ?? "Calm",
      title: e.title ?? "",
      html: e.html ?? "",
      theme: e.theme ?? "sakura",
      font: e.font ?? "caveat",
      createdAt: e.createdAt,
      images: e.images ?? [],
    }));
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

function sampleEntry(): DiaryEntry {
  const today = new Date().toISOString().slice(0, 10);
  return {
    id: "bloom-sample-001",
    date: today,
    mood: "Calm",
    title: "Thursday's glow",
    html: "<p>Today started with the softest light coming through my window. I feel grateful for small things.</p>",
    theme: "sakura",
    font: "caveat",
    createdAt: new Date().toISOString(),
    images: [],
  };
}

function compressImage(file: File, maxPx = 640): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
        const r = Math.min(maxPx / img.width, maxPx / img.height, 1);
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(img.width * r);
        canvas.height = Math.round(img.height * r);
        canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", 0.75));
      };
      img.src = ev.target?.result as string;
    };
    reader.readAsDataURL(file);
  });
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function fmtDate(iso: string) {
  return new Date(iso + "T00:00:00").toLocaleDateString(undefined, {
    weekday: "long", day: "numeric", month: "long",
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

/* ─── Design data ─────────────────────────────────────────────────── */

const MOOD_DATA = [
  { name: "Calm",      tint: "#FBCFE8",
    icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round"><path d="M7 15.5h8.4a3.2 3.2 0 0 0 .2-6.4A4.6 4.6 0 0 0 7 9 3 3 0 0 0 7 15.5Z"/></svg> },
  { name: "Happy",     tint: "#FCD9A0",
    icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round"><circle cx="12" cy="12" r="8.4"/><path d="M8.8 13.6c.8 1.1 1.9 1.6 3.2 1.6s2.4-.5 3.2-1.6"/><circle cx="9.4" cy="10" r=".85" fill="currentColor" stroke="none"/><circle cx="14.6" cy="10" r=".85" fill="currentColor" stroke="none"/></svg> },
  { name: "Energetic", tint: "#F9A8D4",
    icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round"><path d="M13 3 6 13h4.4l-1 8 7.6-11H12l1-7Z"/></svg> },
  { name: "Sensitive", tint: "#F5C6E0",
    icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round"><path d="M12 20S4.5 15 4.5 9.8A3.7 3.7 0 0 1 12 7a3.7 3.7 0 0 1 7.5 2.8C19.5 15 12 20 12 20Z"/></svg> },
  { name: "Dreamy",    tint: "#E2D2FB",
    icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round"><path d="M20.5 14.6A7.5 7.5 0 1 1 10.8 5a6 6 0 0 0 9.7 9.6Z"/><path d="M17.5 4l.6 1.4 1.4.6-1.4.6-.6 1.4-.6-1.4-1.4-.6 1.4-.6Z"/></svg> },
  { name: "Tired",     tint: "#DAD7F2",
    icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round"><path d="M5 10.6c2 2.6 4.8 3.9 7 3.9s5-1.3 7-3.9"/><path d="M7.4 14l-1 1.9M12 15.1v2M16.6 14l1 1.9"/></svg> },
];

const PROMPT_DATA = [
  { text: "What made you smile today?",       icon: "sun",    tint: "#FFF4D9", ic: "#E0A53B" },
  { text: "A feeling you want to release",    icon: "leaf",   tint: "#E4F6EC", ic: "#3FAE7E" },
  { text: "Something you are grateful for",   icon: "heart",  tint: "#FCE4EE", ic: "#DB2777" },
  { text: "A dream from last night",          icon: "moon",   tint: "#EEE7FF", ic: "#7C5AA6" },
  { text: "A small win to celebrate",         icon: "star",   tint: "#FDE8F2", ic: "#EC4899" },
  { text: "How does your body feel today?",   icon: "cloud",  tint: "#E9F1FF", ic: "#5B7FC2" },
];

const PROMPT_ICONS: Record<string, React.ReactNode> = {
  sun:   <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round"><circle cx="12" cy="12" r="4"/><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M18.4 5.6 17 7M7 17l-1.4 1.4"/></svg>,
  leaf:  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round"><path d="M5 19c0-8 6-13 14-13 0 8-6 13-14 13Z"/><path d="M5 19c3-4 6-6 10-7.5"/></svg>,
  heart: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round"><path d="M12 20S4.5 15 4.5 9.8A3.7 3.7 0 0 1 12 7a3.7 3.7 0 0 1 7.5 2.8C19.5 15 12 20 12 20Z"/></svg>,
  moon:  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round"><path d="M20.5 14.6A7.5 7.5 0 1 1 10.8 5a6 6 0 0 0 9.7 9.6Z"/></svg>,
  star:  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round"><path d="M12 3.5l2.4 5 5.5.7-4 3.8 1 5.4-4.9-2.7-4.9 2.7 1-5.4-4-3.8 5.5-.7 2.4-5Z"/></svg>,
  cloud: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round"><path d="M7 17h9.5a3.2 3.2 0 0 0 .3-6.4A4.7 4.7 0 0 0 7 10.5 3.2 3.2 0 0 0 7 17Z"/></svg>,
};

const STICKER_ICONS: Record<string, React.ReactNode> = {
  flower:    <svg width="24" height="24" viewBox="0 0 24 24"><ellipse cx="12" cy="6.2" rx="2.6" ry="3.6" fill="#F472B6"/><ellipse cx="12" cy="17.8" rx="2.6" ry="3.6" fill="#F472B6"/><ellipse cx="6.2" cy="12" rx="3.6" ry="2.6" fill="#F472B6"/><ellipse cx="17.8" cy="12" rx="3.6" ry="2.6" fill="#F472B6"/><circle cx="12" cy="12" r="2.6" fill="#F9C784"/></svg>,
  heart:     <svg width="22" height="22" viewBox="0 0 24 24"><path d="M12 20S4.5 15 4.5 9.8A3.7 3.7 0 0 1 12 7a3.7 3.7 0 0 1 7.5 2.8C19.5 15 12 20 12 20Z" fill="#F472B6"/></svg>,
  star:      <svg width="22" height="22" viewBox="0 0 24 24"><path d="M12 3l2.5 5.5 6 .6-4.5 4 1.3 5.9L12 21l-5.3 3 1.3-5.9-4.5-4 6-.6Z" fill="#F9C784"/></svg>,
  moon:      <svg width="22" height="22" viewBox="0 0 24 24"><path d="M20.5 14.6A7.5 7.5 0 1 1 10.8 5a6 6 0 0 0 9.7 9.6Z" fill="#C4A4FC"/></svg>,
  sun:       <svg width="22" height="22" viewBox="0 0 24 24"><circle cx="12" cy="12" r="4" fill="#F9C784"/><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M18.4 5.6 17 7M7 17l-1.4 1.4" stroke="#F9C784" strokeWidth="1.7" strokeLinecap="round"/></svg>,
  butterfly: <svg width="22" height="22" viewBox="0 0 24 24"><path d="M12 12C9 6 3 6 3.5 11c.4 4 6 3 8.5 1Z" fill="#F9A8D4"/><path d="M12 12c3-6 9-6 8.5-1-.4 4-6 3-8.5 1Z" fill="#F472B6"/><path d="M12 7v9" stroke="#9D5C7E" strokeWidth="1.4" strokeLinecap="round"/></svg>,
};

const BOOK_COVERS: Record<string, string> = {
  Rose:  "linear-gradient(150deg,#F9A8D4 0%,#EC4899 45%,#BE185D 100%)",
  Plum:  "linear-gradient(150deg,#D8B4FE 0%,#C084FC 45%,#9333EA 100%)",
  Peach: "linear-gradient(150deg,#FDBA74 0%,#F472B6 55%,#DB2777 100%)",
};

const MEM_TINTS = [
  { bg: "#FCE4EE", tape: "rgba(244,114,182,.45)", fp: "#F472B6", fc: "#F9C784", tag: "#DB2777" },
  { bg: "#EEE7FF", tape: "rgba(196,164,252,.5)",  fp: "#C4A4FC", fc: "#FBCFE8", tag: "#7C5AA6" },
  { bg: "#FFEFD9", tape: "rgba(251,186,116,.5)",  fp: "#FBBA74", fc: "#F472B6", tag: "#C77C2A" },
  { bg: "#E4F6EC", tape: "rgba(126,202,185,.5)",  fp: "#7ECAB9", fc: "#F9C784", tag: "#3F9E7E" },
];
const MEM_ROTS = [-2.5, 2, -1.6, 1.4];

/* ─── CSS keyframes + utilities ───────────────────────────────────── */

const DIARY_CSS = `
  @keyframes dd-floaty   { 0%,100%{ transform:translateY(0) translateX(0) } 50%{ transform:translateY(-26px) translateX(12px) } }
  @keyframes dd-floaty2  { 0%,100%{ transform:translateY(0) translateX(0) } 50%{ transform:translateY(24px) translateX(-14px) } }
  @keyframes dd-twinkle  { 0%,100%{ opacity:.1;transform:scale(.4) } 50%{ opacity:1;transform:scale(1) } }
  @keyframes dd-rise     { 0%{ transform:translateY(40px) rotate(0deg);opacity:0 } 12%{ opacity:.85 } 100%{ transform:translateY(-150px) rotate(40deg);opacity:0 } }
  @keyframes dd-breathe  { 0%,100%{ transform:scale(1);opacity:.55 } 50%{ transform:scale(1.16);opacity:.85 } }
  @keyframes dd-spin3dA  { 0%{ transform:rotateX(22deg) rotateY(0deg) } 100%{ transform:rotateX(22deg) rotateY(360deg) } }
  @keyframes dd-spin3dB  { 0%{ transform:rotateX(-18deg) rotateY(360deg) } 100%{ transform:rotateX(-18deg) rotateY(0deg) } }
  @keyframes dd-drift    { 0%{ transform:translate(0,0) } 33%{ transform:translate(28px,-22px) } 66%{ transform:translate(-20px,18px) } 100%{ transform:translate(0,0) } }
  @keyframes dd-drift2   { 0%{ transform:translate(0,0) } 50%{ transform:translate(-30px,-26px) } 100%{ transform:translate(0,0) } }
  @keyframes dd-ribbon   { 0%,100%{ transform:translateX(-50%) rotate(-1.5deg) } 50%{ transform:translateX(-50%) rotate(1.5deg) } }
  @keyframes dd-glow     { 0%,100%{ box-shadow:0 8px 22px rgba(219,39,119,.32) } 50%{ box-shadow:0 16px 44px rgba(219,39,119,.6) } }
  @keyframes dd-shimmer  { 0%,100%{ filter:drop-shadow(0 2px 10px rgba(236,72,153,.25)) } 50%{ filter:drop-shadow(0 4px 20px rgba(236,72,153,.5)) } }
  @keyframes dd-hint     { 0%,100%{ transform:translateY(0) } 50%{ transform:translateY(4px) } }
  @keyframes dd-toast    { from{ opacity:0;transform:translateX(-50%) translateY(8px) scale(.92) } to{ opacity:1;transform:translateX(-50%) translateY(0) scale(1) } }
  @keyframes dd-mic      { 0%,100%{ box-shadow:0 0 0 0 rgba(219,39,119,.5) } 50%{ box-shadow:0 0 0 7px rgba(219,39,119,0) } }
  @keyframes dd-hintfade { from{ opacity:0 } to{ opacity:1 } }
  @keyframes dd-pagehint { 0%,100%{ opacity:0;transform:translateX(-50%) translateY(0) } 15%,85%{ opacity:1 } 50%{ transform:translateX(-50%) translateY(-5px) } }
  @keyframes dd-mood-bounce { 0%,100%{ transform:scale(1);filter:drop-shadow(0 4px 12px rgba(219,39,119,.35)) } 45%{ transform:translateY(-5px) scale(1.12);filter:drop-shadow(0 10px 22px rgba(219,39,119,.65)) } }
  .dd-tool{ transition:all .2s ease; }
  .dd-tool:hover{ filter:brightness(1.05); transform:translateY(-1px); }
  .dd-mem:hover{ transform:rotate(0deg) translateY(-5px) !important; box-shadow:0 20px 36px rgba(131,24,67,.2) !important; }
  .dd-prompt:hover{ transform:translateY(-3px) rotate(-.5deg); box-shadow:0 16px 30px rgba(236,72,153,.2); }
  .dd-textarea::-webkit-scrollbar{ display:none }
  .dd-textarea{ scrollbar-width:none;-ms-overflow-style:none; }
  .dd-item .dd-del{ opacity:0;transition:opacity .18s ease; }
  .dd-item:hover .dd-del{ opacity:1; }
`;

/* ─── Mood fallback for memories ─────────────────────────────────── */

function MemFallback({ mood, tint }: { mood: string; tint: string }) {
  const icons: Record<string, React.ReactNode> = {
    Calm: (
      <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.4} strokeLinecap="round">
        <path d="M7 15.5h8.4a3.2 3.2 0 0 0 .2-6.4A4.6 4.6 0 0 0 7 9 3 3 0 0 0 7 15.5Z"/><path d="M5 20h14M8 20v2M16 20v2"/>
      </svg>
    ),
    Happy: (
      <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.4} strokeLinecap="round">
        <circle cx="12" cy="12" r="8"/><path d="M8.8 13.6c.8 1.1 1.9 1.6 3.2 1.6s2.4-.5 3.2-1.6"/>
        <circle cx="9.4" cy="10" r=".85" fill="currentColor" stroke="none"/>
        <circle cx="14.6" cy="10" r=".85" fill="currentColor" stroke="none"/>
      </svg>
    ),
    Energetic: (
      <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.4} strokeLinecap="round">
        <path d="M13 3 6 13h4.4l-1 8 7.6-11H12l1-7Z"/>
      </svg>
    ),
    Sensitive: (
      <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.4} strokeLinecap="round">
        <path d="M12 20S4.5 15 4.5 9.8A3.7 3.7 0 0 1 12 7a3.7 3.7 0 0 1 7.5 2.8C19.5 15 12 20 12 20Z"/>
      </svg>
    ),
    Dreamy: (
      <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.4} strokeLinecap="round">
        <path d="M20.5 14.6A7.5 7.5 0 1 1 10.8 5a6 6 0 0 0 9.7 9.6Z"/>
        <path d="M17.5 4l.6 1.4 1.4.6-1.4.6-.6 1.4-.6-1.4-1.4-.6 1.4-.6Z"/>
      </svg>
    ),
    Tired: (
      <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.4} strokeLinecap="round">
        <path d="M5 10.6c2 2.6 4.8 3.9 7 3.9s5-1.3 7-3.9"/><path d="M7.4 14l-1 1.9M12 15.1v2M16.6 14l1 1.9"/>
      </svg>
    ),
  };
  return (
    <div style={{ width:"100%", height:"100%", display:"grid", placeItems:"center", background:`linear-gradient(135deg,rgba(255,255,255,.5),${tint}55)`, borderRadius:8 }}>
      <div style={{ opacity:.5, color:"#9D5C7E" }}>{icons[mood] ?? icons["Calm"]}</div>
    </div>
  );
}

/* ─── Small SVG helpers ───────────────────────────────────────────── */

function Flower({ size, pc, cc }: { size: number; pc: string; cc: string }) {
  const petals = [0, 72, 144, 216, 288].map((a) => (
    <ellipse key={a} cx={32} cy={16} rx={8.5} ry={14} fill={pc} transform={`rotate(${a} 32 32)`} />
  ));
  return (
    <svg width={size} height={size} viewBox="0 0 64 64">
      {petals}
      <circle cx={32} cy={32} r={8} fill={cc} />
    </svg>
  );
}

function MemFlower({ pc, fc }: { pc: string; fc: string }) {
  const petals = [0, 72, 144, 216, 288].map((a) => (
    <ellipse key={a} cx={12} cy={5} rx={2.6} ry={4.2} fill={pc} transform={`rotate(${a} 12 12)`} />
  ));
  return (
    <svg width={24} height={24} viewBox="0 0 24 24">
      {petals}
      <circle cx={12} cy={12} r={3} fill={fc} />
    </svg>
  );
}

/* ─── DiaryBookPage — the 6 inner page contents ──────────────────── */

interface DragItem {
  id: number;
  type: "photo" | "sticker";
  icon?: string;
  x: number;
  y: number;
  src?: string; // for photos
}

interface DiaryBookPageProps {
  idx: number;
  mood: string;
  draft: string;
  onDraft: (txt: string) => void;
  onSave: (photos: string[]) => void;
  onPhotoRequest: () => void;
  viewEntry?: DiaryEntry | null;
  onClearView?: () => void;
}

function DiaryBookPage({ idx, mood, draft, onDraft, onSave, onPhotoRequest, viewEntry, onClearView }: DiaryBookPageProps) {
  const [items, setItems] = useState<DragItem[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [listening, setListening] = useState(false);
  const [micLabel, setMicLabel] = useState("Listening…");
  const [focused, setFocused] = useState(false);
  const [nextId, setNextId] = useState(1);
  const [pageFull, setPageFull] = useState(false);
  const canvasRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ id: number; dx: number; dy: number } | null>(null);
  const recRef = useRef<any>(null);
  const textRef = useRef<HTMLTextAreaElement>(null);

  const addPhoto = (src: string) => {
    setItems((p) => [...p, { id: nextId, type: "photo", x: 140 + (p.length * 16) % 70, y: 18 + (p.length * 22) % 80, src }]);
    setNextId((n) => n + 1);
  };
  const addSticker = (icon: string) => {
    setItems((p) => [...p, { id: nextId, type: "sticker", icon, x: 160 + (p.length * 18) % 60, y: 12 + (p.length * 24) % 80 }]);
    setNextId((n) => n + 1);
    setPickerOpen(false);
  };
  const deleteItem = (id: number) => setItems((p) => p.filter((i) => i.id !== id));

  const onPointerDown = useCallback((id: number, e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest("button")) return;
    e.preventDefault();
    const it = items.find((i) => i.id === id);
    if (!it || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    dragRef.current = { id, dx: e.clientX - (rect.left + it.x), dy: e.clientY - (rect.top + it.y) };
    const onMove = (ev: PointerEvent) => {
      if (!dragRef.current || !canvasRef.current) return;
      const r = canvasRef.current.getBoundingClientRect();
      const x = Math.max(-8, Math.min(r.width - 44, ev.clientX - r.left - dragRef.current.dx));
      const y = Math.max(-8, Math.min(r.height - 30, ev.clientY - r.top - dragRef.current.dy));
      setItems((p) => p.map((i) => i.id === dragRef.current!.id ? { ...i, x, y } : i));
    };
    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      dragRef.current = null;
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  }, [items]);

  const toggleMic = () => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) {
      setListening(true); setMicLabel("Voice not supported");
      setTimeout(() => setListening(false), 2000);
      return;
    }
    if (recRef.current && listening) { try { recRef.current.stop(); } catch {} return; }
    const rec = new SR();
    rec.lang = "en-US"; rec.interimResults = false; rec.continuous = false;
    rec.onresult = (ev: any) => {
      let t = "";
      for (let i = 0; i < ev.results.length; i++) t += ev.results[i][0].transcript;
      const cur = draft || "";
      const sep = cur && !/\s$/.test(cur) ? " " : "";
      onDraft(cur + sep + t);
    };
    rec.onend = () => setListening(false);
    rec.onerror = () => setListening(false);
    recRef.current = rec;
    setListening(true); setMicLabel("Listening…");
    try { rec.start(); } catch { setListening(false); }
  };

  useEffect(() => () => { if (recRef.current) { try { recRef.current.stop(); } catch {} } }, []);

  const showHint = !draft.length && !focused;

  const toolBtn = (
    onClick: () => void, title: string, active?: boolean, children?: React.ReactNode
  ) => (
    <button
      className="dd-tool"
      onClick={onClick} title={title}
      style={{
        width: 32, height: 32, border: "none", cursor: "pointer", borderRadius: 10,
        display: "grid", placeItems: "center",
        background: active ? "linear-gradient(135deg,#F472B6,#DB2777)" : "rgba(252,231,243,.9)",
        color: active ? "#fff" : "#DB2777",
        animation: active ? "dd-mic 1.2s ease-in-out infinite" : "none",
      }}
    >{children}</button>
  );

  /* ── Page 0: Writing surface ── */
  if (idx === 0) {
    /* Read-only view when a past entry is selected */
    if (viewEntry) {
      return (
        <div style={{ height: "100%", display: "flex", flexDirection: "column", padding: "18px 22px 16px", fontFamily: "'Quicksand',sans-serif" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, flexShrink: 0 }}>
            <div>
              <div style={{ fontFamily: "'Dancing Script',cursive", fontWeight: 700, fontSize: 20, color: "#DB2777", lineHeight: 1 }}>{fmtDate(viewEntry.date)}</div>
              <span style={{ display: "inline-block", marginTop: 3, fontSize: 11, fontWeight: 700, color: "#9D5C7E", background: "rgba(236,72,153,.1)", padding: "2px 10px", borderRadius: 999 }}>{viewEntry.mood}</span>
            </div>
            <button onClick={onClearView} style={{ flexShrink: 0, border: "none", cursor: "pointer", padding: "7px 14px", borderRadius: 999, background: "linear-gradient(135deg,#F472B6,#DB2777)", color: "#fff", fontFamily: "'Quicksand'", fontWeight: 700, fontSize: 12, boxShadow: "0 4px 10px rgba(219,39,119,.3)" }}>
              + New entry
            </button>
          </div>
          <div className="dd-textarea" style={{ flex: 1, overflowY: "auto", marginTop: 12, fontFamily: "'Caveat',cursive", fontSize: 21, lineHeight: "30px", color: "#831843" }}>
            <div dangerouslySetInnerHTML={{ __html: viewEntry.html }} />
            {viewEntry.images?.[0] && (
              <img src={viewEntry.images[0]} style={{ display: "block", width: "100%", maxHeight: 130, objectFit: "cover", borderRadius: 8, marginTop: 12, boxShadow: "0 6px 18px rgba(131,24,67,.18)" }} alt="" />
            )}
          </div>
        </div>
      );
    }

    /* Write mode */
    return (
      <div data-nodrag="1" style={{ height: "100%", display: "flex", flexDirection: "column", padding: "22px 24px 18px", fontFamily: "'Quicksand',sans-serif" }}>
        {/* Top bar */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexShrink: 0 }}>
          <div style={{ fontFamily: "'Dancing Script',cursive", fontWeight: 700, fontSize: 22, color: "#DB2777" }}>
            {new Date().toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" })}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
            {toolBtn(onPhotoRequest, "Add a photo", false,
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><path d="M4 8.5h2.5L8 6.5h8l1.5 2H20v11H4Z"/><circle cx="12" cy="13.5" r="3.2"/></svg>
            )}
            {toolBtn(() => setPickerOpen((p) => !p), "Add a sticker", false,
              <svg width="18" height="18" viewBox="0 0 24 24"><ellipse cx="12" cy="6.2" rx="2.6" ry="3.6" fill="currentColor"/><ellipse cx="12" cy="17.8" rx="2.6" ry="3.6" fill="currentColor"/><ellipse cx="6.2" cy="12" rx="3.6" ry="2.6" fill="currentColor"/><ellipse cx="17.8" cy="12" rx="3.6" ry="2.6" fill="currentColor"/><circle cx="12" cy="12" r="2.6" fill="#F9C784"/></svg>
            )}
            {toolBtn(toggleMic, "Voice to text", listening,
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5.5 11.5a6.5 6.5 0 0 0 13 0M12 18v3"/></svg>
            )}
          </div>
        </div>

        {/* Sticker picker */}
        {pickerOpen && (
          <div style={{ marginTop: 10, flexShrink: 0, display: "flex", flexWrap: "wrap", gap: 8, padding: "10px 12px", borderRadius: 14, background: "rgba(255,253,249,.96)", border: "1px solid rgba(236,72,153,.18)", boxShadow: "0 10px 24px rgba(131,24,67,.16)" }}>
            {Object.keys(STICKER_ICONS).map((k) => (
              <button key={k} className="dd-tool" onClick={() => addSticker(k)} style={{ width: 34, height: 34, border: "none", cursor: "pointer", borderRadius: 9, background: "transparent", display: "grid", placeItems: "center" }}>
                {STICKER_ICONS[k]}
              </button>
            ))}
          </div>
        )}

        {/* Textarea — hidden scrollbar, fills remaining space */}
        <div style={{ position: "relative", flex: 1, marginTop: 12 }}>
          <textarea
            className="dd-textarea"
            ref={textRef}
            value={draft}
            onChange={(e) => {
              onDraft(e.target.value);
              setPageFull(e.target.scrollHeight > e.target.clientHeight + 4);
            }}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            style={{ position: "absolute", inset: 0, zIndex: 2, width: "100%", height: "100%", resize: "none", border: "none", outline: "none", background: "transparent", fontFamily: "'Caveat',cursive", fontSize: 22, lineHeight: "30px", color: "#831843", overflowY: "auto" }}
          />
          {showHint && (
            <div style={{ position: "absolute", top: 0, left: 0, zIndex: 1, pointerEvents: "none", fontFamily: "'Caveat',cursive", fontSize: 22, lineHeight: "30px", color: "#C9A6B8", animation: "dd-hintfade .4s ease" }}>
              Tap here and let your thoughts bloom…
            </div>
          )}
          {/* Page-full hint */}
          {pageFull && (
            <div style={{ position: "absolute", bottom: 4, left: "50%", zIndex: 3, pointerEvents: "none", whiteSpace: "nowrap", display: "flex", alignItems: "center", gap: 6, padding: "5px 14px", borderRadius: 999, background: "rgba(219,39,119,.85)", color: "#fff", fontFamily: "'Quicksand'", fontWeight: 700, fontSize: 12, animation: "dd-pagehint 2.8s ease-in-out infinite" }}>
              turn the page ✿
            </div>
          )}
          {/* Mic listening pill */}
          {listening && (
            <div style={{ position: "absolute", bottom: 6, left: "50%", transform: "translateX(-50%)", zIndex: 4, display: "flex", alignItems: "center", gap: 8, padding: "7px 15px", borderRadius: 999, background: "rgba(219,39,119,.95)", color: "#fff", fontFamily: "'Quicksand'", fontWeight: 700, fontSize: 12, boxShadow: "0 8px 18px rgba(219,39,119,.4)" }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#fff", display: "inline-block", animation: "dd-mic 1.2s ease-in-out infinite" }} />
              {micLabel}
            </div>
          )}
        </div>

        {/* Photos + stickers strip — below text, never overlapping */}
        {items.length > 0 && (
          <div className="dd-textarea" style={{ flexShrink: 0, marginTop: 8, display: "flex", gap: 8, overflowX: "auto", padding: "6px 2px 4px", alignItems: "flex-end" }}>
            {items.map((it) => (
              <div key={it.id} className="dd-item" style={{ position: "relative", flexShrink: 0 }}>
                <button className="dd-del" onClick={() => deleteItem(it.id)} style={{ position: "absolute", top: -7, right: -7, zIndex: 6, width: 18, height: 18, border: "none", cursor: "pointer", borderRadius: "50%", background: "rgba(219,39,119,.92)", color: "#fff", display: "grid", placeItems: "center", fontSize: 10, fontWeight: 700, lineHeight: 1 }}>✕</button>
                {it.type === "photo" && it.src && (
                  <img src={it.src} alt="diary photo" style={{ display: "block", width: 72, height: 56, objectFit: "cover", borderRadius: 8, boxShadow: "0 4px 14px rgba(131,24,67,.22)", transform: `rotate(${(it.id % 3 - 1) * 2.5}deg)` }} />
                )}
                {it.type === "sticker" && it.icon && (
                  <div style={{ width: 44, height: 44, display: "grid", placeItems: "center", filter: "drop-shadow(0 2px 5px rgba(131,24,67,.2))" }}>
                    {STICKER_ICONS[it.icon]}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        <button
          onClick={() => onSave(items.filter((i) => i.type === "photo" && i.src).map((i) => i.src!))}
          data-nodrag="1"
          style={{ alignSelf: "flex-start", marginTop: 8, flexShrink: 0, border: "none", cursor: "pointer", padding: "9px 20px", borderRadius: 999, background: "linear-gradient(135deg,#F472B6,#DB2777)", color: "#fff", fontFamily: "'Quicksand'", fontWeight: 700, fontSize: 13, boxShadow: "0 6px 14px rgba(219,39,119,.3)" }}
        >
          Save entry ✿
        </button>

        {/* Hidden file input for photo */}
        <input
          id="dd-photo-input"
          type="file"
          accept="image/*"
          style={{ display: "none" }}
          onChange={async (e) => {
            const f = e.target.files?.[0];
            if (!f) return;
            const src = await compressImage(f);
            addPhoto(src);
            e.target.value = "";
          }}
        />
      </div>
    );
  }

  /* ── Page 1: Today's whisper ── */
  if (idx === 1) return (
    <div style={{ padding: "30px 28px", position: "relative", height: "100%" }}>
      <div style={{ fontFamily: "'Quicksand'", fontWeight: 700, fontSize: 10.5, letterSpacing: ".14em", textTransform: "uppercase", color: "#C58CA8" }}>Today's whisper</div>
      <div style={{ marginTop: 22, fontFamily: "'Caveat',cursive", fontSize: 30, lineHeight: 1.3, color: "#831843", maxWidth: 230 }}>I am worthy of love, rest, and all beautiful things.</div>
      <div style={{ marginTop: 16, fontFamily: "'Caveat',cursive", fontSize: 18, color: "#B07291" }}>— breathe, you are blooming</div>
      {/* pressed flower motif */}
      <div style={{ position: "absolute", right: 28, bottom: 34, width: 42, height: 42, display: "grid", placeItems: "center" }}>
        {[0, 72, 144, 216, 288].map((a) => (
          <span key={a} style={{ position: "absolute", width: 16, height: 16, borderRadius: "60% 40%", background: "rgba(244,114,182,.5)", transform: `rotate(${a}deg) translateY(-11px)` }} />
        ))}
        <span style={{ position: "absolute", width: 13, height: 13, borderRadius: "50%", background: "#F9C784" }} />
      </div>
    </div>
  );

  /* ── Page 2: Memory ── */
  if (idx === 2) return (
    <div style={{ padding: "30px 28px" }}>
      <div style={{ fontFamily: "'Quicksand'", fontWeight: 700, fontSize: 10.5, letterSpacing: ".14em", textTransform: "uppercase", color: "#C58CA8" }}>A memory to keep</div>
      <div style={{ margin: "18px auto 0", width: "max-content", transform: "rotate(-3deg)", padding: "8px 8px 24px", background: "#fffdf9", borderRadius: 3, boxShadow: "0 10px 22px rgba(131,24,67,.22)" }}>
        <div style={{ width: 150, height: 116, background: "linear-gradient(135deg,#FBE3F5,#FCE4EE)", borderRadius: 2, display: "grid", placeItems: "center" }}>
          <span style={{ fontFamily: "'Caveat',cursive", fontSize: 13, color: "#C9A6B8" }}>drop a photo</span>
        </div>
        <div style={{ textAlign: "center", fontFamily: "'Caveat',cursive", fontSize: 16, color: "#9D5C7E", marginTop: 4 }}>the day I felt free ♡</div>
      </div>
    </div>
  );

  /* ── Page 3: Gratitudes ── */
  if (idx === 3) return (
    <div style={{ padding: "30px 28px", position: "relative", height: "100%" }}>
      <div style={{ fontFamily: "'Quicksand'", fontWeight: 700, fontSize: 10.5, letterSpacing: ".14em", textTransform: "uppercase", color: "#C58CA8" }}>Three soft gratitudes</div>
      <div style={{ marginTop: 18, display: "flex", flexDirection: "column", gap: 15 }}>
        {[
          { text: "slow morning light", checked: true },
          { text: "a friend who listens", checked: true },
          { text: "add your own…", checked: false, placeholder: true },
        ].map((item, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 11 }}>
            <span style={{ width: 20, height: 20, borderRadius: 6, border: item.checked ? "1.8px solid #F472B6" : "1.8px dashed rgba(236,72,153,.4)", display: "grid", placeItems: "center", color: "#DB2777", fontSize: 13, flex: "0 0 auto" }}>
              {item.checked ? "✓" : ""}
            </span>
            <span style={{ fontFamily: "'Caveat',cursive", fontSize: 21, color: item.placeholder ? "#C9A6B8" : "#9D5C7E" }}>{item.text}</span>
          </div>
        ))}
      </div>
      <div style={{ position: "absolute", right: 26, bottom: 30, transform: "rotate(10deg)", width: 42, height: 42, background: "#fffdf9", borderRadius: 4, boxShadow: "0 5px 12px rgba(131,24,67,.18)", display: "grid", placeItems: "center" }}>
        <svg width="23" height="23" viewBox="0 0 24 24"><path d="M12 20S4.5 15 4.5 9.8A3.7 3.7 0 0 1 12 7a3.7 3.7 0 0 1 7.5 2.8C19.5 15 12 20 12 20Z" fill="#F472B6"/></svg>
      </div>
    </div>
  );

  /* ── Page 4: Reflection & mood ── */
  if (idx === 4) return (
    <div style={{ padding: "30px 28px" }}>
      <div style={{ fontFamily: "'Quicksand'", fontWeight: 700, fontSize: 10.5, letterSpacing: ".14em", textTransform: "uppercase", color: "#C58CA8" }}>Reflection &amp; mood</div>
      <div style={{ marginTop: 16, fontFamily: "'Caveat',cursive", fontSize: 24, lineHeight: 1.2, color: "#831843" }}>What is your inner voice whispering tonight?</div>
      <div style={{ marginTop: 14, fontSize: 11.5, color: "#9D5C7E", fontFamily: "'Quicksand'", fontWeight: 600 }}>
        Today you feel <strong style={{ color: "#DB2777" }}>{mood}</strong>
      </div>
      <div style={{ marginTop: 14, width: "max-content", transform: "rotate(3deg)", padding: "7px 7px 20px", background: "#fffdf9", borderRadius: 3, boxShadow: "0 8px 16px rgba(131,24,67,.2)" }}>
        <div style={{ width: 120, height: 90, background: "linear-gradient(135deg,#FBE3F5,#FCE4EE)", borderRadius: 2, display: "grid", placeItems: "center" }}>
          <span style={{ fontFamily: "'Caveat',cursive", fontSize: 12, color: "#C9A6B8" }}>add a photo</span>
        </div>
      </div>
    </div>
  );

  /* ── Page 5: Closing ── */
  return (
    <div style={{ height: "100%", padding: "30px 28px", display: "flex", alignItems: "center", justifyContent: "center", textAlign: "center" }}>
      <div style={{ fontFamily: "'Caveat',cursive", fontSize: 25, color: "#B07291" }}>see you tomorrow,<br />bloom ✿</div>
    </div>
  );
}

/* ─── Main DiaryPage component ────────────────────────────────────── */

export default function DiaryPage() {
  // Persistent entries
  const [entries, setEntries] = useState<DiaryEntry[]>(() => loadEntries());
  const [search, setSearch] = useState("");

  // Book state
  const [open, setOpen] = useState(false);
  const [pg, setPg] = useState(0);
  const [tilt, setTilt] = useState(0);
  const [narrow, setNarrow] = useState(() => typeof window !== "undefined" && window.innerWidth < 860);
  const [mobile, setMobile] = useState(() => typeof window !== "undefined" && window.innerWidth < 768);

  // UI state
  const [mood, setMood] = useState("Calm");
  const [draft, setDraft] = useState("");
  const [savedCount, setSavedCount] = useState(0);
  const [moodOpen, setMoodOpen] = useState(false);
  const [toast, setToast] = useState(false);

  const [viewEntry, setViewEntry] = useState<DiaryEntry | null>(null);

  const tiltTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const bookRef = useRef<HTMLDivElement>(null);

  // Derived
  const cycleDay = ((new Date().getDate() - 1) % 28) + 1;
  const phase = cycleDay <= 5 ? "Menstrual" : cycleDay <= 13 ? "Follicular" : cycleDay <= 15 ? "Ovulatory" : "Luteal";
  const streak = useMemo(() => computeStreak(entries), [entries]);
  const moodTint = MOOD_DATA.find((m) => m.name === mood)?.tint ?? "#FBCFE8";

  useEffect(() => { saveEntries(entries); }, [entries]);
  useEffect(() => {
    const onResize = () => {
      setNarrow(window.innerWidth < 860);
      setMobile(window.innerWidth < 768);
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const turn = (dir: number) => {
    if (!open) { setOpen(true); return; }
    const totalPgs = 6;
    let next: number;
    if (narrow) {
      next = Math.min(totalPgs - 1, Math.max(0, pg + dir));
    } else {
      const sp = Math.floor(pg / 2);
      next = Math.min(2, Math.max(0, sp + dir)) * 2;
    }
    if (next === pg) return;
    setPg(next);
    setTilt(dir > 0 ? -11 : 11);
    if (tiltTimerRef.current) clearTimeout(tiltTimerRef.current);
    tiltTimerRef.current = setTimeout(() => setTilt(0), 70);
  };

  const openAtPage = (idx: number, seedDraft?: string) => {
    setViewEntry(null);
    setOpen(true);
    setPg(idx);
    if (seedDraft !== undefined) setDraft(seedDraft);
  };

  const openMemory = (entry: DiaryEntry) => {
    setViewEntry(entry);
    setOpen(true);
    setPg(0);
    setTimeout(() => {
      bookRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 80);
  };

  const onSave = (photos: string[]) => {
    if (!draft.trim()) return;
    const entry: DiaryEntry = {
      id: `diary-${Date.now()}`,
      date: todayISO(),
      mood,
      title: draft.trim().slice(0, 60) || "Diary entry",
      html: `<p>${draft.replace(/\n/g, "</p><p>")}</p>`,
      theme: "sakura",
      font: "caveat",
      createdAt: new Date().toISOString(),
      images: photos,
    };
    setEntries((prev) => [entry, ...prev]);
    setDraft("");
    setSavedCount((c) => c + 1);
    setToast(true);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToast(false), 1800);
  };

  useEffect(() => () => {
    if (tiltTimerRef.current) clearTimeout(tiltTimerRef.current);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
  }, []);

  const spread = Math.floor(pg / 2);
  const atStart = pg <= 0;
  const atEnd = narrow ? pg >= 5 : spread >= 2;
  const dots = narrow ? 6 : 3;
  const activeDot = narrow ? pg : spread;

  const coverBg = BOOK_COVERS.Rose;

  const filteredMems = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return entries.slice(0, 8);
    return entries.filter((e) => (e.title + " " + e.mood).toLowerCase().includes(q)).slice(0, 8);
  }, [entries, search]);

  return (
    <div style={{ fontFamily: "'Quicksand',sans-serif", color: "#831843" }}>
      <style>{DIARY_CSS}</style>

        {/* ── HERO ── */}
        <div style={{ position: "relative", borderRadius: 28, overflow: "hidden", marginBottom: 24, padding: "28px 26px 22px", background: "linear-gradient(150deg,rgba(255,255,255,.92),rgba(252,228,241,.78))", border: "1px solid rgba(236,72,153,.16)", boxShadow: "0 22px 54px rgba(236,72,153,.18)", backdropFilter: "blur(12px)" }}>
          {/* Mood ambient glow */}
          <div style={{ position: "absolute", inset: 0, pointerEvents: "none", background: `radial-gradient(ellipse 80% 65% at 85% 50%,${moodTint}66,transparent 70%)`, transition: "background 1.2s ease" }} />
          {/* Title + CTA row */}
          <div style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 14 }}>
            <h1 style={{ margin: 0, fontFamily: "'Dancing Script',cursive", fontWeight: 700, fontSize: "clamp(34px,6vw,50px)", lineHeight: 1, color: "#DB2777", animation: "dd-shimmer 5s ease-in-out infinite" }}>
              Dreamy Diary <span style={{ fontFamily: "'Quicksand'", fontSize: "clamp(18px,3vw,26px)" }}>✿</span>
            </h1>

            {/* Desktop: full pill button */}
            {!mobile && (
              <button onClick={() => openAtPage(0)} style={{ flexShrink: 0, border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 8, padding: "11px 20px", borderRadius: 999, background: "linear-gradient(135deg,#F472B6,#DB2777)", color: "#fff", fontFamily: "'Quicksand'", fontWeight: 700, fontSize: 14, animation: "dd-glow 3.4s ease-in-out infinite", boxShadow: "0 8px 22px rgba(219,39,119,.32)" }}>
                <span style={{ fontSize: 17, lineHeight: 0 }}>+</span> New entry
              </button>
            )}

            {/* Mobile: circular mood picker button */}
            {mobile && (
              <div style={{ position: "relative", flexShrink: 0 }}>
                <button
                  onClick={() => setMoodOpen((o) => !o)}
                  style={{ width: 46, height: 46, borderRadius: "50%", border: "3px solid rgba(255,255,255,.9)", cursor: "pointer", background: moodTint, display: "grid", placeItems: "center", color: "#DB2777", animation: "dd-mood-bounce 2.6s ease-in-out infinite", transition: "background .6s ease" }}
                  aria-label="Select mood"
                >
                  {MOOD_DATA.find((m) => m.name === mood)?.icon}
                </button>

                {/* Mood popover */}
                {moodOpen && (
                  <>
                    {/* backdrop to close on outside tap */}
                    <div onClick={() => setMoodOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 18 }} />
                    <div style={{ position: "absolute", top: 54, right: 0, zIndex: 19, background: "rgba(255,255,255,.97)", borderRadius: 20, border: "1px solid rgba(236,72,153,.18)", boxShadow: "0 18px 40px rgba(219,39,119,.22)", padding: "10px 8px", display: "flex", flexDirection: "column", gap: 5, minWidth: 158 }}>
                      {MOOD_DATA.map((m) => {
                        const sel = m.name === mood;
                        return (
                          <button key={m.name} onClick={() => { setMood(m.name); setMoodOpen(false); }} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", borderRadius: 999, border: "none", cursor: "pointer", fontFamily: "'Quicksand'", fontWeight: 600, fontSize: 13, background: sel ? "linear-gradient(135deg,#F472B6,#DB2777)" : m.tint, color: sel ? "#fff" : "#831843", transition: "all .2s ease" }}>
                            {m.icon} {m.name}
                          </button>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Cycle ring + Today's Bloom */}
          <div style={{ display: "flex", alignItems: "center", gap: 18, flexWrap: "wrap", marginTop: 22 }}>
            <div style={{ position: "relative", width: 68, height: 68, borderRadius: "50%", background: `conic-gradient(#EC4899 0% ${(cycleDay / 28) * 100}%, rgba(236,72,153,.18) ${(cycleDay / 28) * 100}% 100%)`, display: "grid", placeItems: "center", flex: "0 0 auto", boxShadow: "0 6px 20px rgba(236,72,153,.28)" }}>
              <div style={{ width: 52, height: 52, borderRadius: "50%", background: "rgba(255,255,255,.9)", display: "grid", placeItems: "center" }}>
                <span style={{ fontFamily: "'Quicksand'", fontWeight: 700, fontSize: 22, color: "#EC4899" }}>{cycleDay}</span>
              </div>
            </div>
            <div style={{ flex: 1, minWidth: 140 }}>
              <div style={{ fontFamily: "'Dancing Script',cursive", fontSize: 25, color: "#DB2777", lineHeight: 1 }}>Today's Bloom</div>
              <div style={{ fontSize: 13, color: "#9D5C7E", marginTop: 5 }}>
                <strong style={{ color: "#831843" }}>Day {cycleDay} · {phase} phase</strong> — soft, reflective energy. Honor your need for rest today. ✿
              </div>
            </div>
          </div>

          {/* How are you feeling — compact strip (tablet/desktop only) */}
          {!mobile && <div style={{ position: "relative", marginTop: 16, paddingTop: 14, borderTop: "1px dashed rgba(236,72,153,.2)" }}>
            <div style={{ fontSize: 10, letterSpacing: ".13em", textTransform: "uppercase", color: "#B07291", fontWeight: 700, marginBottom: 8 }}>How are you feeling?</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {MOOD_DATA.map((m) => {
                const sel = m.name === mood;
                return (
                  <button key={m.name} onClick={() => setMood(m.name)} style={{ cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 5, padding: "6px 11px 6px 9px", borderRadius: 999, fontFamily: "'Quicksand',sans-serif", fontWeight: 600, fontSize: 12, transition: "all .25s ease", lineHeight: 1, border: sel ? "1px solid transparent" : "1px solid rgba(236,72,153,.15)", background: sel ? "linear-gradient(135deg,#F472B6,#DB2777)" : "rgba(255,255,255,.75)", color: sel ? "#fff" : "#9D5C7E", boxShadow: sel ? "0 6px 14px rgba(219,39,119,.28)" : "0 2px 6px rgba(236,72,153,.07)" }}>
                    {m.icon}{m.name}
                  </button>
                );
              })}
            </div>
          </div>}
        </div>

        {/* ── Bloom + Book column ── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <div ref={bookRef} style={{ order: 1, display: "flex", flexDirection: "column", alignItems: "center" }}>
            <div style={{ position: "relative", display: "flex", alignItems: "center", gap: 14, maxWidth: "100%" }}>

              {/* Prev arrow */}
              <button onClick={() => turn(-1)} style={{ flex: "0 0 auto", width: 46, height: 46, borderRadius: "50%", border: "none", cursor: "pointer", display: "grid", placeItems: "center", background: "rgba(255,255,255,.92)", color: "#DB2777", boxShadow: "0 10px 24px rgba(236,72,153,.28)", transition: "transform .2s ease, opacity .3s ease", opacity: (open && !atStart) ? 1 : 0.35 }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round"><path d="M15 5l-7 7 7 7"/></svg>
              </button>

              {/* Stage */}
              <div style={{ position: "relative", width: narrow ? "min(360px, 90vw)" : "min(560px, 78vw)", height: narrow ? "clamp(420px,92vw,520px)" : "clamp(370px,54vw,460px)" }}>
                {/* Rose edge/binding */}
                <div style={{ position: "absolute", inset: "-14px -12px -16px -12px", borderRadius: 16, background: coverBg, boxShadow: "0 34px 70px rgba(190,24,93,.36), inset 0 2px 6px rgba(255,255,255,.4)", zIndex: 0 }} />

                {/* Pages wrapper */}
                <div style={{ position: "absolute", inset: 0, zIndex: 1, transform: `perspective(1600px) rotateY(${tilt}deg)`, transformOrigin: tilt < 0 ? "left center" : "right center", transition: "transform .5s cubic-bezier(.2,.8,.2,1)" }}>
                  {/* Desktop: two-page spread */}
                  {!narrow && (
                    <>
                      <div onClick={() => turn(-1)} style={{ position: "absolute", top: 0, left: 0, width: "50%", height: "100%", borderRadius: "8px 3px 3px 8px", overflow: "hidden", background: "repeating-linear-gradient(transparent 0 28px,rgba(157,92,126,.12) 28px 29px),linear-gradient(180deg,#FCF6EE,#F7EBDD)", boxShadow: "inset -22px 0 34px -26px rgba(131,24,67,.5)" }}>
                        <div style={{ position: "absolute", inset: 0 }}>
                          <DiaryBookPage idx={spread * 2} mood={mood} draft={draft} onDraft={setDraft} onSave={onSave} onPhotoRequest={() => document.getElementById("dd-photo-input")?.click()} viewEntry={spread === 0 ? viewEntry : null} onClearView={() => { setViewEntry(null); setDraft(""); }} />
                        </div>
                        <div style={{ position: "absolute", left: 16, bottom: 12, fontFamily: "'Quicksand'", fontSize: 10, color: "#C58CA8", zIndex: 2 }}>· {spread * 2 + 1} ·</div>
                      </div>
                      {/* Spine */}
                      <div style={{ position: "absolute", top: 6, bottom: 6, left: "50%", transform: "translateX(-50%)", width: 16, zIndex: 3, background: "linear-gradient(90deg,rgba(131,24,67,.18),rgba(131,24,67,.03) 42%,rgba(255,255,255,.5) 50%,rgba(131,24,67,.03) 58%,rgba(131,24,67,.18))", boxShadow: "0 0 14px rgba(131,24,67,.18)" }} />
                      <div onClick={() => turn(1)} style={{ position: "absolute", top: 0, right: 0, width: "50%", height: "100%", borderRadius: "3px 8px 8px 3px", overflow: "hidden", background: "repeating-linear-gradient(transparent 0 28px,rgba(157,92,126,.1) 28px 29px),linear-gradient(180deg,#FCF6EE,#F7EBDD)", boxShadow: "inset 22px 0 34px -26px rgba(131,24,67,.5)" }}>
                        <div style={{ position: "absolute", inset: 0 }}>
                          <DiaryBookPage idx={spread * 2 + 1} mood={mood} draft={draft} onDraft={setDraft} onSave={onSave} onPhotoRequest={() => document.getElementById("dd-photo-input")?.click()} viewEntry={null} onClearView={() => { setViewEntry(null); setDraft(""); }} />
                        </div>
                        <div style={{ position: "absolute", right: 16, bottom: 12, fontFamily: "'Quicksand'", fontSize: 10, color: "#C58CA8", zIndex: 2 }}>· {spread * 2 + 2} ·</div>
                      </div>
                    </>
                  )}
                  {/* Mobile: single page */}
                  {narrow && (
                    <div onClick={() => turn(1)} style={{ position: "absolute", inset: 0, borderRadius: 8, overflow: "hidden", background: "repeating-linear-gradient(transparent 0 28px,rgba(157,92,126,.11) 28px 29px),linear-gradient(180deg,#FCF6EE,#F7EBDD)", boxShadow: "inset 0 0 30px -18px rgba(131,24,67,.4)" }}>
                      <div style={{ position: "absolute", inset: 0 }}>
                        <DiaryBookPage idx={pg} mood={mood} draft={draft} onDraft={setDraft} onSave={onSave} onPhotoRequest={() => document.getElementById("dd-photo-input")?.click()} viewEntry={pg === 0 ? viewEntry : null} onClearView={() => { setViewEntry(null); setDraft(""); }} />
                      </div>
                      <div style={{ position: "absolute", right: 16, bottom: 12, fontFamily: "'Quicksand'", fontSize: 10, color: "#C58CA8", zIndex: 2 }}>· {pg + 1} / 6 ·</div>
                    </div>
                  )}
                </div>

                {/* Ribbon */}
                <div style={{ position: "absolute", top: -4, left: "50%", transform: "translateX(-50%)", width: 13, height: 130, background: "linear-gradient(180deg,#DB2777,#BE185D)", borderRadius: "0 0 3px 3px", boxShadow: "0 6px 12px rgba(190,24,93,.4)", zIndex: 4, animation: "dd-ribbon 6s ease-in-out infinite" }} />

                {/* Cover */}
                <div onClick={() => !open && setOpen(true)} style={{ position: "absolute", inset: "-14px -12px -16px -12px", borderRadius: 16, zIndex: 7, display: "grid", placeItems: "center", cursor: open ? "default" : "pointer", background: coverBg, boxShadow: "0 38px 76px rgba(190,24,93,.42),inset 0 2px 8px rgba(255,255,255,.45)", transform: open ? "rotateY(-24deg) scale(.97)" : "none", transformOrigin: "left center", opacity: open ? 0 : 1, pointerEvents: open ? "none" : "auto", transition: "opacity .7s ease,transform .8s cubic-bezier(.6,.02,.2,1)" }}>
                  <div style={{ position: "absolute", inset: 14, border: "1.5px solid rgba(255,255,255,.45)", borderRadius: 12 }} />
                  {/* Clasp */}
                  <div style={{ position: "absolute", right: -2, top: "50%", transform: "translateY(-50%)", width: 24, height: 50, borderRadius: "8px 4px 4px 8px", background: "linear-gradient(90deg,#FCE7F3,#F9A8D4)", boxShadow: "0 4px 10px rgba(131,24,67,.35)" }} />
                  <div style={{ textAlign: "center", color: "#fff", padding: "0 18px" }}>
                    <div style={{ fontSize: 40, marginBottom: 4, textShadow: "0 4px 14px rgba(131,24,67,.4)" }}>✿</div>
                    <div style={{ fontFamily: "'Dancing Script',cursive", fontWeight: 700, fontSize: 40, lineHeight: 1, textShadow: "0 4px 16px rgba(131,24,67,.45)" }}>Dreamy Diary</div>
                    <div style={{ marginTop: 18, display: "inline-flex", alignItems: "center", gap: 8, padding: "9px 18px", borderRadius: 999, background: "rgba(255,255,255,.9)", color: "#DB2777", fontFamily: "'Quicksand'", fontWeight: 700, fontSize: 13, boxShadow: "0 8px 18px rgba(131,24,67,.25)", animation: "dd-hint 2.2s ease-in-out infinite" }}>
                      Tap to open ✿
                    </div>
                  </div>
                </div>

                {/* Close button */}
                {open && (
                  <button onClick={() => setOpen(false)} style={{ position: "absolute", top: -12, right: -12, zIndex: 8, width: 34, height: 34, border: "none", cursor: "pointer", borderRadius: "50%", background: "#fff", color: "#DB2777", boxShadow: "0 6px 16px rgba(236,72,153,.3)", display: "grid", placeItems: "center", fontSize: 16, fontWeight: 700 }}>✕</button>
                )}

                {/* Save toast */}
                {toast && (
                  <div style={{ position: "absolute", bottom: 14, left: "50%", transform: "translateX(-50%)", zIndex: 9, padding: "9px 18px", borderRadius: 999, background: "rgba(126,202,185,.95)", color: "#fff", fontFamily: "'Quicksand'", fontWeight: 700, fontSize: 13, boxShadow: "0 8px 20px rgba(126,202,185,.5)", animation: "dd-toast .3s ease" }}>
                    Saved to your diary ✨
                  </div>
                )}
              </div>

              {/* Next arrow */}
              <button onClick={() => turn(1)} style={{ flex: "0 0 auto", width: 46, height: 46, borderRadius: "50%", border: "none", cursor: "pointer", display: "grid", placeItems: "center", background: "rgba(255,255,255,.92)", color: "#DB2777", boxShadow: "0 10px 24px rgba(236,72,153,.28)", transition: "transform .2s ease, opacity .3s ease", opacity: (open && !atEnd) ? 1 : 0.35 }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round"><path d="M9 5l7 7-7 7"/></svg>
              </button>
            </div>

            {/* Dots + guide */}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, marginTop: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                {Array.from({ length: dots }).map((_, i) => (
                  <span key={i} style={{ display: "inline-block", width: i === activeDot ? 22 : 8, height: 8, borderRadius: 999, background: i === activeDot ? "linear-gradient(90deg,#F472B6,#DB2777)" : "rgba(236,72,153,.28)", transition: "all .3s ease" }} />
                ))}
              </div>
              <div style={{ fontFamily: "'Caveat',cursive", fontSize: 18, color: "#B07291" }}>
                {!open ? "tap the cover to open your diary ✿" : pg === 0 ? "your page is ready — just start writing ✿" : "use the ‹ › arrows to turn the page"}
              </div>
            </div>
          </div>
        </div>

        {/* ── Prompts to bloom ── */}
        <div style={{ marginTop: 24, borderRadius: 22, padding: "20px 22px", background: "linear-gradient(150deg,rgba(255,255,255,.88),rgba(251,207,232,.5))", border: "1px solid rgba(236,72,153,.15)", boxShadow: "0 16px 36px rgba(236,72,153,.13)", backdropFilter: "blur(8px)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
            <span style={{ fontFamily: "'Dancing Script',cursive", fontSize: 25, color: "#DB2777" }}>Prompts to bloom</span>
            <span style={{ fontSize: 16 }}>✿</span>
          </div>
          <div style={{ fontSize: 12.5, color: "#9D5C7E", marginBottom: 14 }}>Not sure what to write? Tap a prompt and a fresh page opens for you.</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 12 }}>
            {PROMPT_DATA.map((p) => (
              <button key={p.text} className="dd-prompt" onClick={() => openAtPage(0, p.text + "\n")} style={{ display: "flex", alignItems: "center", gap: 11, padding: "13px 15px", borderRadius: 16, border: "1px solid rgba(236,72,153,.12)", cursor: "pointer", transition: "transform .25s ease, box-shadow .25s ease", boxShadow: "0 6px 16px rgba(236,72,153,.08)", background: p.tint }}>
                <span style={{ flex: "0 0 auto", width: 36, height: 36, borderRadius: 11, display: "grid", placeItems: "center", background: "#fff", color: p.ic, boxShadow: "0 3px 8px rgba(131,24,67,.12)" }}>
                  {PROMPT_ICONS[p.icon]}
                </span>
                <span style={{ fontFamily: "'Caveat',cursive", fontSize: 20, color: "#831843", lineHeight: 1.15, textAlign: "left" }}>{p.text}</span>
              </button>
            ))}
          </div>
        </div>

        {/* ── Recent memories ── */}
        <div style={{ marginTop: 24, borderRadius: 22, padding: "20px 22px", background: "rgba(255,255,255,.82)", border: "1px solid rgba(236,72,153,.15)", boxShadow: "0 16px 36px rgba(236,72,153,.13)", backdropFilter: "blur(8px)" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
            <div style={{ fontFamily: "'Dancing Script',cursive", fontSize: 25, color: "#DB2777" }}>Recent memories</div>
            <div style={{ display: "flex", alignItems: "center", gap: 7, padding: "7px 13px", borderRadius: 999, background: "rgba(252,231,243,.7)", border: "1px solid rgba(236,72,153,.16)", minWidth: 170 }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#DB2777" strokeWidth={2} strokeLinecap="round" style={{ flex: "0 0 auto" }}><circle cx="11" cy="11" r="6.5"/><path d="M16 16l4 4"/></svg>
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="search memories…" style={{ border: "none", outline: "none", background: "transparent", width: "100%", fontFamily: "'Quicksand'", fontWeight: 600, fontSize: 12.5, color: "#831843" }} />
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(190px,1fr))", gap: 18 }}>
            {filteredMems.map((entry, i) => {
              const t = MEM_TINTS[i % MEM_TINTS.length];
              const rot = MEM_ROTS[i % MEM_ROTS.length];
              return (
                <div key={entry.id} className="dd-mem" onClick={() => openMemory(entry)} style={{ position: "relative", display: "flex", flexDirection: "column", padding: "14px 13px 13px", borderRadius: "4px 14px 6px 16px", boxShadow: "0 10px 24px rgba(131,24,67,.13)", cursor: "pointer", transition: "transform .25s ease, box-shadow .25s ease", background: t.bg, transform: `rotate(${rot}deg)` }}>
                  {/* Flower top-right */}
                  <div style={{ position: "absolute", top: 8, right: 10, width: 24, height: 24, opacity: .9 }}>
                    <MemFlower pc={t.fp} fc={t.fc} />
                  </div>
                  {/* Tape */}
                  <div style={{ position: "absolute", top: -9, left: "50%", transform: "translateX(-50%) rotate(-3deg)", width: 48, height: 16, background: t.tape, boxShadow: "0 2px 5px rgba(131,24,67,.16)" }} />
                  {/* Photo or cute fallback */}
                  <div style={{ marginTop: 4, width: "100%", height: 96, borderRadius: 8, overflow: "hidden" }}>
                    {entry.images?.[0]
                      ? <img src={entry.images[0]} style={{ width: "100%", height: "100%", objectFit: "cover" }} alt="" />
                      : <MemFallback mood={entry.mood} tint={t.fp} />
                    }
                  </div>
                  <div style={{ marginTop: 10, fontFamily: "'Caveat',cursive", fontSize: 21, color: "#831843", lineHeight: 1.05 }}>{entry.title}</div>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 3 }}>
                    <span style={{ fontSize: 11, color: "#9D5C7E", fontWeight: 600 }}>
                      {new Date(entry.date + "T00:00:00").toLocaleDateString(undefined, { day: "numeric", month: "short" })}
                    </span>
                    <span style={{ fontSize: 10.5, fontWeight: 700, color: t.tag, background: "rgba(255,255,255,.85)", padding: "3px 9px", borderRadius: 999 }}>
                      {entry.mood}
                    </span>
                  </div>
                </div>
              );
            })}
            {filteredMems.length === 0 && (
              <div style={{ gridColumn: "1/-1", textAlign: "center", padding: 18, fontFamily: "'Caveat',cursive", fontSize: 19, color: "#C9A6B8" }}>
                no memories match — but tomorrow is a fresh page ✿
              </div>
            )}
          </div>
        </div>

        {/* ── Charms row ── */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(190px,1fr))", gap: 18, marginTop: 22 }}>
          {/* Writing streak */}
          <div style={{ borderRadius: 20, padding: "16px 20px", background: "rgba(255,255,255,.8)", border: "1px solid rgba(236,72,153,.15)", boxShadow: "0 12px 28px rgba(236,72,153,.11)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <div style={{ fontSize: 10.5, letterSpacing: ".12em", textTransform: "uppercase", color: "#B07291", fontWeight: 700 }}>Writing streak</div>
              <div style={{ fontFamily: "'Dancing Script',cursive", fontSize: 28, color: "#831843", lineHeight: 1.1 }}>Day {Math.max(1, streak + savedCount)}</div>
              <div style={{ fontSize: 11.5, color: "#9D5C7E" }}>keep your soft habit ✿</div>
            </div>
            <div style={{ position: "relative", width: 40, height: 40, flex: "0 0 auto" }}>
              <div style={{ position: "absolute", left: 18, bottom: 0, width: 3, height: 26, background: "#7ECAB9", borderRadius: 2 }} />
              <div style={{ position: "absolute", left: 11, top: 2, width: 18, height: 18, borderRadius: "50% 0", background: "radial-gradient(circle at 40% 40%,#F9A8D4,#EC4899)", boxShadow: "0 4px 10px rgba(236,72,153,.3)" }} />
            </div>
          </div>
          {/* Current mood */}
          <div style={{ borderRadius: 20, padding: "16px 20px", background: "rgba(255,255,255,.8)", border: "1px solid rgba(236,72,153,.15)", boxShadow: "0 12px 28px rgba(236,72,153,.11)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <div style={{ fontSize: 10.5, letterSpacing: ".12em", textTransform: "uppercase", color: "#B07291", fontWeight: 700 }}>Current mood</div>
              <div style={{ fontFamily: "'Dancing Script',cursive", fontSize: 28, color: "#831843", lineHeight: 1.1 }}>{mood}</div>
              <div style={{ fontSize: 11.5, color: "#9D5C7E" }}>the diary glows with you</div>
            </div>
            <div style={{ width: 38, height: 38, borderRadius: "50%", background: moodTint, boxShadow: "0 6px 16px rgba(236,72,153,.3),inset 0 0 0 4px rgba(255,255,255,.6)", transition: "background 1s ease", flex: "0 0 auto" }} />
          </div>
          {/* Current phase */}
          <div style={{ borderRadius: 20, padding: "16px 20px", background: "rgba(255,255,255,.8)", border: "1px solid rgba(236,72,153,.15)", boxShadow: "0 12px 28px rgba(236,72,153,.11)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <div style={{ fontSize: 10.5, letterSpacing: ".12em", textTransform: "uppercase", color: "#B07291", fontWeight: 700 }}>Current phase</div>
              <div style={{ fontFamily: "'Dancing Script',cursive", fontSize: 28, color: "#831843", lineHeight: 1.1 }}>{phase}</div>
              <div style={{ fontSize: 11.5, color: "#9D5C7E" }}>honor your need for rest</div>
            </div>
            <div style={{ width: 38, height: 38, borderRadius: "50%", background: `conic-gradient(#F9C784 0% ${(cycleDay / 28) * 100}%,rgba(249,199,132,.25) ${(cycleDay / 28) * 100}% 100%)`, boxShadow: "inset 0 0 0 4px rgba(255,255,255,.6)", flex: "0 0 auto" }} />
          </div>
        </div>

      {/* ── Mobile FAB ── */}
      {mobile && (
        <button
          onClick={() => openAtPage(0)}
          style={{ position: "fixed", bottom: 82, right: 20, zIndex: 49, width: 56, height: 56, borderRadius: "50%", border: "none", cursor: "pointer", background: "linear-gradient(135deg,#F472B6,#DB2777)", color: "#fff", fontSize: 30, lineHeight: 1, display: "grid", placeItems: "center", boxShadow: "0 8px 24px rgba(219,39,119,.45)", animation: "dd-glow 3.4s ease-in-out infinite" }}
          aria-label="New diary entry"
        >+</button>
      )}

    </div>
  );
}
