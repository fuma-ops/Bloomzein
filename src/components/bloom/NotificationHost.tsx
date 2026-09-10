// =============================================================================
// NotificationHost — renders the in-app toast stack raised via notify().
// Mounted ONCE in AppShell. Toasts slide in from the top (top-centre on phone,
// top-right on desktop), auto-dismiss, and can be tapped to close. On its first
// mount it also fires the one-time "welcome, you're all set" toast queued by the
// onboarding flow (via sessionStorage) — which only lands once the app shell,
// and therefore this host, is actually mounted.
// =============================================================================
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { BloomFlower } from "./BloomFlower";
import { NOTIFY_EVENT, notify, type NotifyOptions } from "@/lib/notify";

type Item = NotifyOptions & { id: number };

/** sessionStorage key: a JSON NotifyOptions the onboarding flow leaves for the
 *  host to raise once the app (and this host) is mounted. */
export const WELCOME_TOAST_KEY = "bloom:welcome-toast";

const TONE: Record<string, { grad: string; emoji: string }> = {
  bloom:    { grad: "linear-gradient(150deg,#FF7EB6 0%,#EC4899 50%,#DB2777 100%)", emoji: "" },
  success:  { grad: "linear-gradient(150deg,#F871B0 0%,#EC4899 100%)", emoji: "✨" },
  water:    { grad: "linear-gradient(150deg,#7DD3FC 0%,#38BDF8 55%,#0EA5E9 100%)", emoji: "💧" },
  reminder: { grad: "linear-gradient(150deg,#FBBF24 0%,#F59E0B 100%)", emoji: "🔔" },
  info:     { grad: "linear-gradient(150deg,#C4B5FD 0%,#A78BFA 100%)", emoji: "💜" },
};

export function NotificationHost() {
  const [items, setItems] = useState<Item[]>([]);
  const idRef = useRef(1);

  const dismiss = (id: number) => setItems((xs) => xs.filter((x) => x.id !== id));

  useEffect(() => {
    const onNotify = (e: Event) => {
      const d = (e as CustomEvent<NotifyOptions>).detail;
      if (!d?.title) return;
      const id = idRef.current++;
      setItems((xs) => [...xs, { ...d, id }].slice(-4)); // keep at most 4 on screen
      const dur = d.duration ?? 4200;
      if (dur > 0) window.setTimeout(() => setItems((xs) => xs.filter((x) => x.id !== id)), dur);
    };
    window.addEventListener(NOTIFY_EVENT, onNotify as EventListener);

    // One-time welcome toast queued by onboarding — fire it now that we're mounted.
    try {
      const raw = sessionStorage.getItem(WELCOME_TOAST_KEY);
      if (raw) {
        sessionStorage.removeItem(WELCOME_TOAST_KEY);
        const opts = JSON.parse(raw) as NotifyOptions;
        // small delay so it lands after the page paints, not mid-transition
        window.setTimeout(() => notify(opts), 650);
      }
    } catch { /* ignore */ }

    return () => window.removeEventListener(NOTIFY_EVENT, onNotify as EventListener);
  }, []);

  if (typeof document === "undefined") return null;

  return createPortal(
    <div className="pointer-events-none fixed inset-x-0 top-0 z-[200] flex flex-col items-center gap-2 px-3 sm:items-end sm:pr-4"
         style={{ paddingTop: "max(0.75rem, env(safe-area-inset-top))" }}>
      <style>{`@keyframes bz-toast-in{0%{opacity:0;transform:translateY(-16px) scale(.95)}60%{transform:translateY(0) scale(1.01)}100%{opacity:1;transform:none}}`}</style>
      {items.map((it) => {
        const tone = TONE[it.tone ?? "bloom"] ?? TONE.bloom;
        return (
          <div
            key={it.id}
            role="status"
            onClick={() => dismiss(it.id)}
            className="pointer-events-auto flex w-full max-w-[24rem] cursor-pointer items-start gap-3 rounded-[1.35rem] border border-white/80 bg-white/90 px-3.5 py-3 shadow-[0_22px_48px_-18px_rgba(219,39,119,0.55)] ring-1 ring-white/70 backdrop-blur-md"
            style={{ animation: "bz-toast-in .5s cubic-bezier(.16,.7,.2,1)" }}
          >
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-white shadow-[0_8px_18px_-6px_rgba(219,39,119,0.85)]"
                  style={{ background: tone.grad }}>
              {it.icon
                ? <span className="text-[18px] leading-none">{it.icon}</span>
                : tone.emoji
                  ? <span className="text-[18px] leading-none">{tone.emoji}</span>
                  : <BloomFlower size={20} petal="#FFFFFF" center="#FFE4F0" />}
            </span>
            <div className="min-w-0 flex-1 pt-0.5">
              <p className="text-[14px] font-extrabold leading-tight text-[#7a1247]">{it.title}</p>
              {it.body && <p className="mt-0.5 text-[12.5px] font-semibold leading-snug text-rose/70">{it.body}</p>}
            </div>
            <button className="-mr-1 shrink-0 rounded-full p-1 text-rose/40 transition hover:text-rose/70" aria-label="Dismiss">
              <X className="h-4 w-4" />
            </button>
          </div>
        );
      })}
    </div>,
    document.body,
  );
}
