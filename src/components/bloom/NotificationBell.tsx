// =============================================================================
// NotificationBell — social-media style notification centre.
// A bell button with an unread badge; tapping it opens a dropdown panel (portaled
// so it's never clipped) listing everything raised via notify() — profile ready,
// water, meals, reminders… Newest first, mark-all-read, per-item dismiss, clear.
// Lives in the Today hero's top-right corner. Responsive on phone/tablet/laptop.
// =============================================================================
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Bell, X, Sparkles } from "lucide-react";
import { BloomFlower } from "./BloomFlower";
import {
  NOTIFS_UPDATED, readNotifications, markRead, markAllRead, removeNotification, clearNotifications,
  unreadCount, type StoredNotif,
} from "@/lib/notificationsStore";

const TONE: Record<string, string> = {
  bloom:    "linear-gradient(150deg,#FF7EB6 0%,#EC4899 50%,#DB2777 100%)",
  success:  "linear-gradient(150deg,#F871B0 0%,#EC4899 100%)",
  water:    "linear-gradient(150deg,#7DD3FC 0%,#38BDF8 55%,#0EA5E9 100%)",
  reminder: "linear-gradient(150deg,#FBBF24 0%,#F59E0B 100%)",
  info:     "linear-gradient(150deg,#C4B5FD 0%,#A78BFA 100%)",
};
const EMOJI: Record<string, string> = { success: "✨", water: "💧", reminder: "🔔", info: "💜" };

function timeAgo(ts: number): string {
  const s = Math.max(0, Math.floor((Date.now() - ts) / 1000));
  if (s < 60) return "just now";
  const m = Math.floor(s / 60); if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60); if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24); if (d < 7) return `${d}d ago`;
  return new Date(ts).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function Row({ n, onNavigate }: { n: StoredNotif; onNavigate: () => void }) {
  const grad = TONE[n.tone ?? "bloom"] ?? TONE.bloom;
  const emoji = n.icon ?? EMOJI[n.tone ?? ""];
  const clickable = !!n.href;

  const Thumb = (
    n.image ? (
      <span className="h-11 w-11 shrink-0 overflow-hidden rounded-xl ring-1 ring-white/60 shadow-[0_5px_12px_-5px_rgba(219,39,119,0.7)]">
        <img src={n.image} alt="" loading="lazy" referrerPolicy="no-referrer" className="h-full w-full object-cover" />
      </span>
    ) : (
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-white shadow-[0_6px_14px_-5px_rgba(219,39,119,0.8)]" style={{ background: grad }}>
        {emoji ? <span className="text-[16px] leading-none">{emoji}</span> : <BloomFlower size={17} petal="#FFFFFF" center="#FFE4F0" />}
      </span>
    )
  );

  // Viewed items go quietly grey; unseen ones stay pink + carry a dot.
  const base = `group relative flex items-start gap-2.5 rounded-2xl px-2.5 py-2.5 transition ${
    n.read ? "bg-black/[0.03] opacity-70" : "bg-blush/45"
  } ${clickable ? "cursor-pointer hover:bg-blush/60" : ""}`;

  const inner = (
    <>
      {!n.read && <span className="absolute left-1 top-1/2 h-1.5 w-1.5 -translate-y-1/2 rounded-full bg-hotpink" aria-hidden />}
      {Thumb}
      <div className="min-w-0 flex-1 pt-0.5">
        <p className={`text-[13.5px] font-extrabold leading-tight ${n.read ? "text-rose/70" : "text-[#7a1247]"}`}>{n.title}</p>
        {n.body && <p className="mt-0.5 text-[12px] font-semibold leading-snug text-rose/70">{n.body}</p>}
        <p className="mt-0.5 flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-wide text-rose/45">
          {timeAgo(n.ts)}{clickable && <span className="text-hotpink/70">· Tap to discover ›</span>}
        </p>
      </div>
      <button
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); removeNotification(n.id); }}
        aria-label="Dismiss"
        className="-mr-0.5 mt-0.5 shrink-0 rounded-full p-1 text-rose/35 transition hover:text-rose/70"
      >
        <X className="h-4 w-4" />
      </button>
    </>
  );

  if (clickable) {
    return (
      <li>
        <a href={n.href} onClick={() => { markRead(n.id); onNavigate(); }} className={`${base} no-underline`}>{inner}</a>
      </li>
    );
  }
  return <li className={base}>{inner}</li>;
}

export function NotificationBell() {
  const [items, setItems] = useState<StoredNotif[]>(() => readNotifications());
  const [unread, setUnread] = useState<number>(() => unreadCount());
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; right: number }>({ top: 0, right: 0 });

  useEffect(() => {
    const sync = () => { setItems(readNotifications()); setUnread(unreadCount()); };
    window.addEventListener(NOTIFS_UPDATED, sync);
    window.addEventListener("storage", sync);
    return () => { window.removeEventListener(NOTIFS_UPDATED, sync); window.removeEventListener("storage", sync); };
  }, []);

  // Position the portaled panel just under the bell, right-aligned to it.
  useLayoutEffect(() => {
    if (!open) return;
    const place = () => {
      const r = btnRef.current?.getBoundingClientRect();
      if (r) setPos({ top: r.bottom + 8, right: Math.max(8, window.innerWidth - r.right) });
    };
    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => { window.removeEventListener("resize", place); window.removeEventListener("scroll", place, true); };
  }, [open]);

  // Close on outside click / Escape.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (panelRef.current?.contains(t) || btnRef.current?.contains(t)) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onDown); document.removeEventListener("keydown", onKey); };
  }, [open]);

  // Opening does NOT mark everything read — each notification greys out only once
  // she actually taps it (so unseen tools stay highlighted).
  const toggle = () => setOpen((o) => !o);

  const shown = expanded ? items : items.slice(0, 5);

  return (
    <>
      <button
        ref={btnRef}
        onClick={toggle}
        aria-label="Notifications"
        aria-expanded={open}
        className="relative grid h-10 w-10 place-items-center rounded-full border border-white/60 bg-white/70 text-hotpink shadow-md backdrop-blur transition hover:bg-white/85 active:scale-95"
      >
        <Bell className="h-5 w-5" strokeWidth={2} />
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-hotpink px-1 text-[10px] font-black leading-none text-white ring-2 ring-white">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && createPortal(
        <div ref={panelRef}
          className="fixed z-[210] w-[min(92vw,22rem)] overflow-hidden rounded-[1.5rem] border border-white/80 bg-white/95 shadow-[0_28px_60px_-20px_rgba(219,39,119,0.55)] backdrop-blur-md animate-scale-in"
          style={{ top: pos.top, right: pos.right, transformOrigin: "top right" }}
        >
          <div className="flex items-center gap-2 border-b border-petal/30 px-4 py-3">
            <span className="grid h-8 w-8 place-items-center rounded-full bg-hotpink/12"><Bell className="h-4 w-4 text-hotpink" strokeWidth={2} /></span>
            <p className="flex-1 text-[15px] font-extrabold text-[#7a1247]">Notifications</p>
            {unread > 0 && <button onClick={markAllRead} className="text-[11.5px] font-bold text-hotpink transition hover:text-hotpink/70">Mark read</button>}
            {items.length > 0 && <button onClick={clearNotifications} className="text-[11.5px] font-bold text-rose/50 transition hover:text-rose/80">Clear all</button>}
            <button onClick={() => setOpen(false)} aria-label="Close" className="grid h-7 w-7 place-items-center rounded-full text-rose/40 transition hover:bg-rose/10 hover:text-rose/70"><X className="h-4 w-4" /></button>
          </div>

          {items.length === 0 ? (
            <div className="flex flex-col items-center gap-1.5 px-4 py-8 text-center">
              <span className="grid h-12 w-12 place-items-center rounded-full bg-blush/60"><Sparkles className="h-6 w-6 text-hotpink" strokeWidth={1.9} /></span>
              <p className="text-[12.5px] font-semibold text-rose/60">You're all caught up ✿<br />Your nudges &amp; wins will appear here 🌸</p>
            </div>
          ) : (
            <div className="max-h-[min(70vh,26rem)] overflow-y-auto p-2.5">
              <ul className="space-y-1.5">{shown.map((n) => <Row key={n.id} n={n} onNavigate={() => setOpen(false)} />)}</ul>
              {items.length > 5 && (
                <button onClick={() => setExpanded((v) => !v)} className="mt-2 w-full rounded-xl py-1.5 text-[12px] font-extrabold text-hotpink transition hover:bg-hotpink/8">
                  {expanded ? "Show less" : `Show all (${items.length})`}
                </button>
              )}
            </div>
          )}
        </div>,
        document.body,
      )}
    </>
  );
}
