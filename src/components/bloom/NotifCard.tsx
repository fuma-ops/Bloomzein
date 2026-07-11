import type { ReactNode } from "react";
import { X } from "lucide-react";

/**
 * THE "notif style" — the one canonical soft in-context notice:
 * a dashed-border card on a translucent white fill, a round pink icon on the
 * left, a bold hotpink title with an optional muted body, an optional action on
 * the right, and an optional X to dismiss. Reuse this everywhere a gentle little
 * notification is shown so they ALL match exactly.
 */
export function NotifCard({
  icon,
  title,
  body,
  action,
  onDismiss,
  className = "",
}: {
  icon: ReactNode;
  title: ReactNode;
  body?: ReactNode;
  action?: ReactNode;
  onDismiss?: () => void;
  className?: string;
}) {
  return (
    <div className={`flex items-center gap-3 rounded-2xl border border-dashed border-hotpink/40 bg-white/70 p-3.5 animate-fade-in ${className}`}>
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-hotpink/10 text-hotpink">{icon}</span>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-bold text-hotpink leading-tight">{title}</div>
        {body && <div className="mt-0.5 text-[11.5px] text-rose/65 leading-snug">{body}</div>}
      </div>
      {action}
      {onDismiss && (
        <button
          onClick={onDismiss}
          aria-label="Dismiss"
          className="shrink-0 grid h-6 w-6 place-items-center rounded-full text-rose/40 transition hover:bg-blush hover:text-hotpink active:scale-90"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
