// =============================================================================
// TodayNotifications — the in-app notification centre, shown inline on Today
// just under the "blooming day" header. Lists everything raised via notify()
// (profile ready, water, meals, reminders…), newest first, with unread count,
// mark-all-read, per-item dismiss, and a collapse toggle. Responsive: one clean
// card on phone, tablet and laptop.
// =============================================================================
import { useEffect, useState } from "react";
import { Bell, Check, ChevronDown, X, Sparkles } from "lucide-react";
import { BloomFlower } from "./BloomFlower";
import {
  NOTIFS_UPDATED, readNotifications, markAllRead, removeNotification, clearNotifications,
  type StoredNotif,
} from "@/lib/notificationsStore";

const COLLAPSE_KEY = "bloom:notifs-collapsed";

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

function Badge({ n }: { n: StoredNotif }) {
  const grad = TONE[n.tone ?? "bloom"] ?? TONE.bloom;
  const emoji = n.icon ?? EMOJI[n.tone ?? ""];
  return (
    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-white shadow-[0_6px_14px_-5px_rgba(219,39,119,0.8)]" style={{ background: grad }}>
      {emoji ? <span className="text-[16px] leading-none">{emoji}</span> : <BloomFlower size={17} petal="#FFFFFF" center="#FFE4F0" />}
    </span>
  );
}

export function TodayNotifications() {
  const [items, setItems] = useState<StoredNotif[]>(() => readNotifications());
  const [expanded, setExpanded] = useState(false);
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    try { return localStorage.getItem(COLLAPSE_KEY) === "1"; } catch { return false; }
  });

  useEffect(() => {
    const sync = () => setItems(readNotifications());
    window.addEventListener(NOTIFS_UPDATED, sync);
    window.addEventListener("storage", sync);
    return () => { window.removeEventListener(NOTIFS_UPDATED, sync); window.removeEventListener("storage", sync); };
  }, []);

  const unread = items.reduce((n, x) => n + (x.read ? 0 : 1), 0);
  const shown = expanded ? items : items.slice(0, 4);

  const toggleCollapse = () => {
    setCollapsed((c) => { const nv = !c; try { localStorage.setItem(COLLAPSE_KEY, nv ? "1" : "0"); } catch { /* */ } return nv; });
  };

  return (
    <section data-reveal className="relative z-[1] mt-3 sm:mt-4">
      <div className="rounded-[1.6rem] border border-white/70 bg-white/70 p-3.5 shadow-[0_12px_32px_rgba(236,72,153,0.12)] backdrop-blur-sm sm:p-4">
        {/* header */}
        <div className="flex items-center gap-2.5">
          <span className="relative grid h-9 w-9 shrink-0 place-items-center rounded-full bg-hotpink/12">
            <Bell className="h-4 w-4 text-hotpink" strokeWidth={2} />
            {unread > 0 && (
              <span className="absolute -right-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-hotpink px-1 text-[10px] font-black leading-none text-white ring-2 ring-white">
                {unread > 9 ? "9+" : unread}
              </span>
            )}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[15px] font-extrabold leading-tight text-[#7a1247]">Notifications</p>
            <p className="text-[11.5px] font-semibold text-rose/60">{unread > 0 ? `${unread} new` : "You're all caught up ✿"}</p>
          </div>
          {unread > 0 && (
            <button onClick={markAllRead} className="inline-flex items-center gap-1 rounded-full bg-hotpink/10 px-2.5 py-1 text-[11.5px] font-extrabold text-hotpink active:scale-95">
              <Check className="h-3.5 w-3.5" strokeWidth={3} /> Mark read
            </button>
          )}
          <button onClick={toggleCollapse} aria-label={collapsed ? "Expand" : "Collapse"}
            className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-hotpink/70 transition hover:bg-hotpink/10">
            <ChevronDown className={`h-4 w-4 transition-transform ${collapsed ? "-rotate-90" : ""}`} strokeWidth={2.4} />
          </button>
        </div>

        {/* list */}
        {!collapsed && (
          items.length === 0 ? (
            <div className="mt-3 flex flex-col items-center gap-1.5 py-4 text-center">
              <span className="grid h-11 w-11 place-items-center rounded-full bg-blush/60"><Sparkles className="h-5 w-5 text-hotpink" strokeWidth={1.9} /></span>
              <p className="text-[12.5px] font-semibold text-rose/60">Nothing yet — your gentle nudges,<br />reminders &amp; wins will appear here 🌸</p>
            </div>
          ) : (
            <>
              <ul className="mt-2.5 space-y-1.5">
                {shown.map((n) => (
                  <li key={n.id}
                    className={`flex items-start gap-2.5 rounded-2xl px-2.5 py-2.5 transition ${n.read ? "bg-white/40" : "bg-blush/40"}`}>
                    <Badge n={n} />
                    <div className="min-w-0 flex-1 pt-0.5">
                      <p className="text-[13.5px] font-extrabold leading-tight text-[#7a1247]">{n.title}</p>
                      {n.body && <p className="mt-0.5 text-[12px] font-semibold leading-snug text-rose/70">{n.body}</p>}
                      <p className="mt-0.5 text-[10.5px] font-bold uppercase tracking-wide text-rose/45">{timeAgo(n.ts)}</p>
                    </div>
                    <button onClick={() => removeNotification(n.id)} aria-label="Dismiss"
                      className="-mr-0.5 mt-0.5 shrink-0 rounded-full p-1 text-rose/35 transition hover:text-rose/70">
                      <X className="h-4 w-4" />
                    </button>
                  </li>
                ))}
              </ul>
              <div className="mt-2 flex items-center justify-between">
                {items.length > 4 ? (
                  <button onClick={() => setExpanded((v) => !v)} className="text-[12px] font-extrabold text-hotpink active:scale-95">
                    {expanded ? "Show less" : `Show all (${items.length})`}
                  </button>
                ) : <span />}
                <button onClick={clearNotifications} className="text-[11.5px] font-bold text-rose/45 transition hover:text-rose/70">Clear all</button>
              </div>
            </>
          )
        )}
      </div>
    </section>
  );
}
