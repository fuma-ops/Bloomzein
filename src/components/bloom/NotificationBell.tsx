// =============================================================================
// NotificationBell — social-media style notification centre.
// A bell button with an unread badge; tapping it opens a dropdown panel (portaled
// so it's never clipped) listing everything raised via notify() — profile ready,
// water, meals, reminders… Newest first, mark-all-read, per-item dismiss, clear.
// Lives in the Today hero's top-right corner. Responsive on phone/tablet/laptop.
// =============================================================================
import { useEffect, useLayoutEffect, useRef, useState, type MouseEvent as ReactMouseEvent } from "react";
import { createPortal } from "react-dom";
import { Bell, X, Sparkles, ChevronRight } from "lucide-react";
import { BloomFlower } from "./BloomFlower";
import {
  NOTIFS_UPDATED, readNotifications, markRead, markAllRead, removeNotification, clearNotifications,
  unreadCount, type StoredNotif,
} from "@/lib/notificationsStore";

// Everything on-brand pink — one soft-pink family across all tones.
const PINK_GRAD = "linear-gradient(150deg,#FF7EB6 0%,#EC4899 52%,#DB2777 100%)";
const TONE: Record<string, string> = {
  bloom: PINK_GRAD, success: PINK_GRAD, water: PINK_GRAD, reminder: PINK_GRAD, info: PINK_GRAD,
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

  // Square thumbnail (real photo) or a square pink badge — always square.
  const Thumb = (
    n.image ? (
      <span className="h-14 w-14 shrink-0 overflow-hidden rounded-2xl ring-2 ring-white shadow-[0_8px_18px_-7px_rgba(219,39,119,0.6)]">
        <img src={n.image} alt="" loading="lazy" referrerPolicy="no-referrer" className="h-full w-full object-cover" />
      </span>
    ) : (
      <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl text-white shadow-[0_8px_18px_-7px_rgba(219,39,119,0.65)]" style={{ background: grad }}>
        {emoji ? <span className="text-[22px] leading-none">{emoji}</span> : <BloomFlower size={24} petal="#FFFFFF" center="#FFE4F0" />}
      </span>
    )
  );

  const dismiss = (e: ReactMouseEvent) => { e.preventDefault(); e.stopPropagation(); removeNotification(n.id); };

  // Viewed items go quietly grey; unseen ones keep the pink card + accent bar.
  const base = `group relative flex items-center gap-3 overflow-hidden rounded-[1.15rem] border p-2.5 transition ${
    n.read
      ? "border-black/[0.05] bg-black/[0.02] opacity-70"
      : "border-white/70 bg-gradient-to-br from-white/85 to-blush/45 shadow-[0_10px_24px_-16px_rgba(219,39,119,0.55)]"
  } ${clickable ? "cursor-pointer hover:-translate-y-[1px] hover:shadow-[0_14px_28px_-14px_rgba(219,39,119,0.6)]" : ""}`;

  const inner = (
    <>
      {!n.read && <span className="absolute left-0 top-1/2 h-8 w-1 -translate-y-1/2 rounded-r-full bg-gradient-to-b from-[#FF7EB6] to-[#DB2777]" aria-hidden />}
      {Thumb}
      <div className="min-w-0 flex-1">
        <p className={`text-[13.5px] font-extrabold leading-tight ${n.read ? "text-rose/60" : "text-[#7a1247]"}`}>{n.title}</p>
        {n.body && <p className="mt-0.5 text-[11.5px] font-semibold leading-snug text-rose/65 line-clamp-2">{n.body}</p>}
        <p className="mt-1 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-rose/40">
          {timeAgo(n.ts)}
          {clickable && <span className="rounded-full bg-hotpink/12 px-1.5 py-0.5 text-hotpink/80">Tap to discover</span>}
        </p>
      </div>
      {clickable ? (
        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-hotpink/12 text-hotpink"><ChevronRight className="h-4 w-4" strokeWidth={2.6} /></span>
      ) : (
        <button onClick={dismiss} aria-label="Dismiss" className="shrink-0 rounded-full p-1 text-rose/35 transition hover:text-rose/70"><X className="h-4 w-4" /></button>
      )}
      {clickable && (
        <button onClick={dismiss} aria-label="Dismiss" className="absolute right-1.5 top-1.5 grid h-6 w-6 place-items-center rounded-full bg-white/85 text-rose/45 opacity-0 shadow-sm transition group-hover:opacity-100 hover:text-rose/80">
          <X className="h-3.5 w-3.5" />
        </button>
      )}
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
        className="relative grid h-10 w-10 place-items-center rounded-full text-white shadow-[0_8px_18px_-6px_rgba(219,39,119,0.85)] ring-2 ring-white/70 transition hover:brightness-105 active:scale-95"
        style={{ background: PINK_GRAD }}
      >
        <Bell className="h-5 w-5" strokeWidth={2.2} />
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-hotpink px-1 text-[10px] font-black leading-none text-white ring-2 ring-white">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && createPortal(
        <div ref={panelRef}
          className="fixed z-[210] w-[min(93vw,23rem)] overflow-hidden rounded-[1.6rem] border border-white/80 bg-white/95 shadow-[0_34px_70px_-22px_rgba(219,39,119,0.6)] ring-1 ring-hotpink/10 backdrop-blur-xl animate-scale-in"
          style={{ top: pos.top, right: pos.right, transformOrigin: "top right" }}
        >
          <style>{`
            .bz-notif-scroll{scrollbar-width:thin;scrollbar-color:#EC4899 rgba(236,72,153,0.12)}
            .bz-notif-scroll::-webkit-scrollbar{width:8px}
            .bz-notif-scroll::-webkit-scrollbar-track{background:rgba(236,72,153,0.10);border-radius:999px;margin:6px}
            .bz-notif-scroll::-webkit-scrollbar-thumb{background:linear-gradient(180deg,#FF7EB6,#EC4899 55%,#DB2777);border-radius:999px;border:2px solid transparent;background-clip:padding-box}
            .bz-notif-scroll::-webkit-scrollbar-thumb:hover{background:#DB2777}
          `}</style>
          <div className="flex items-center gap-2 border-b border-petal/25 bg-gradient-to-r from-blush/60 via-white/40 to-petal/40 px-4 py-3">
            <span className="grid h-9 w-9 place-items-center rounded-full text-white shadow-[0_6px_14px_-5px_rgba(219,39,119,0.8)]" style={{ background: PINK_GRAD }}><Bell className="h-4 w-4" strokeWidth={2.2} /></span>
            <div className="flex-1 leading-tight">
              <p className="text-[15px] font-extrabold text-[#7a1247]">Notifications</p>
              {unread > 0 && <p className="text-[11px] font-bold text-hotpink/80">{unread} new</p>}
            </div>
            {unread > 0 && <button onClick={markAllRead} className="rounded-full bg-hotpink/10 px-2.5 py-1 text-[11px] font-extrabold text-hotpink transition hover:bg-hotpink/15">Mark all read</button>}
            <button onClick={() => setOpen(false)} aria-label="Close" className="grid h-7 w-7 place-items-center rounded-full text-rose/45 transition hover:bg-rose/10 hover:text-rose/75"><X className="h-4 w-4" /></button>
          </div>

          {items.length === 0 ? (
            <div className="flex flex-col items-center gap-1.5 px-4 py-8 text-center">
              <span className="grid h-12 w-12 place-items-center rounded-full bg-blush/60"><Sparkles className="h-6 w-6 text-hotpink" strokeWidth={1.9} /></span>
              <p className="text-[12.5px] font-semibold text-rose/60">You're all caught up ✿<br />Your nudges &amp; wins will appear here 🌸</p>
            </div>
          ) : (
            <div className="bz-notif-scroll max-h-[min(70vh,27rem)] overflow-y-auto p-2.5">
              <ul className="space-y-2">{shown.map((n) => <Row key={n.id} n={n} onNavigate={() => setOpen(false)} />)}</ul>
              <div className="mt-2 flex items-center justify-between px-1">
                {items.length > 5 ? (
                  <button onClick={() => setExpanded((v) => !v)} className="text-[12px] font-extrabold text-hotpink transition hover:text-hotpink/70">
                    {expanded ? "Show less" : `Show all (${items.length})`}
                  </button>
                ) : <span />}
                <button onClick={clearNotifications} className="text-[11.5px] font-bold text-rose/45 transition hover:text-rose/75">Clear all</button>
              </div>
            </div>
          )}
        </div>,
        document.body,
      )}
    </>
  );
}
