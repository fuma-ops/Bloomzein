import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";

/* ============================================================
   HydrationNudge — a soft, dismissible "drink water" banner.

   Removable two ways:
   • tap the ✕ button, or
   • swipe it horizontally off the screen.

   The dismissal is remembered for the rest of the day (keyed by
   storageKey + today's date), so it won't nag again until tomorrow —
   when, if you're still under your water goal, it reappears fresh.
============================================================ */
export function HydrationNudge({
  storageKey,
  className = "",
  icon,
  title,
  body,
}: {
  /** Stable key per surface, e.g. "bloom:hydrate-nudge-yoga". */
  storageKey: string;
  /** Extra classes for the banner shell (gradient bg + border colour). */
  className?: string;
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  const dayKey = `${storageKey}:${new Date().toISOString().slice(0, 10)}`;
  const [dismissed, setDismissed] = useState(false);
  const [dx, setDx] = useState(0);
  const [exiting, setExiting] = useState(false);
  const startX = useRef<number | null>(null);
  const dragging = useRef(false);

  // Hide immediately if it was already dismissed today.
  useEffect(() => {
    try { if (localStorage.getItem(dayKey)) setDismissed(true); } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const remember = () => { try { localStorage.setItem(dayKey, "1"); } catch {} };

  const dismiss = (dir: number) => {
    dragging.current = false;
    startX.current = null;
    setExiting(true);
    setDx(dir * (typeof window !== "undefined" ? window.innerWidth : 400));
    remember();
    // unmount after the slide-out finishes
    setTimeout(() => setDismissed(true), 240);
  };

  const onPointerDown = (e: React.PointerEvent) => {
    startX.current = e.clientX;
    dragging.current = true;
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragging.current || startX.current == null) return;
    setDx(e.clientX - startX.current);
  };
  const onPointerUp = () => {
    if (!dragging.current) return;
    dragging.current = false;
    if (Math.abs(dx) > 90) dismiss(dx > 0 ? 1 : -1);
    else setDx(0); // not far enough → snap back
    startX.current = null;
  };

  if (dismissed) return null;

  const opacity = exiting ? 0 : Math.max(0, 1 - Math.abs(dx) / 260);

  return (
    <div
      className={`relative mb-3 flex items-center gap-3 rounded-3xl border px-4 py-3 pr-2 animate-fade-in select-none touch-pan-y ${className}`}
      style={{
        transform: `translateX(${dx}px)`,
        opacity,
        transition: dragging.current ? "none" : "transform 240ms ease, opacity 240ms ease",
        cursor: dragging.current ? "grabbing" : undefined,
      }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      <span className="clay-blob grid h-9 w-9 shrink-0 place-items-center rounded-full text-white">
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-bold text-hotpink leading-tight">{title}</p>
        <p className="text-[11px] text-rose/70 leading-snug">{body}</p>
      </div>
      <a
        href="/app/today#hydration"
        onClick={(e) => e.stopPropagation()}
        className="shrink-0 text-[10px] font-bold text-hotpink underline underline-offset-2"
      >
        Log it
      </a>
      <button
        type="button"
        aria-label="Dismiss"
        onClick={(e) => { e.stopPropagation(); dismiss(1); }}
        onPointerDown={(e) => e.stopPropagation()}
        className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-rose/50 transition hover:bg-white/60 hover:text-hotpink active:scale-90"
      >
        <X className="h-3.5 w-3.5" strokeWidth={2.2} />
      </button>
    </div>
  );
}
