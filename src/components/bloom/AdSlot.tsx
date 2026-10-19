// AdSlot — a single Google AdSense unit that only shows for FREE users.
// Renders nothing for Bloom+ (premium) users, and nothing until a real slot id
// is configured in src/lib/ads.ts — so it's safe to place before ad units exist.
import { useEffect, useRef } from "react";
import { usePremium } from "@/lib/entitlements";
import { AD_CLIENT } from "@/lib/ads";

declare global {
  interface Window { adsbygoogle?: unknown[] }
}

export function AdSlot({ slot, format = "auto", className = "", label = true }: {
  slot: string;
  format?: string;
  className?: string;
  label?: boolean;
}) {
  const premium = usePremium();
  const pushed = useRef(false);

  useEffect(() => {
    if (premium || !slot || pushed.current) return;
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
      pushed.current = true;
    } catch { /* adsbygoogle not ready / blocked — ignore */ }
  }, [premium, slot]);

  // No ads for premium users, and nothing until a slot id is set.
  if (premium || !slot) return null;

  return (
    <div className={`my-6 overflow-hidden rounded-2xl ${className}`}>
      {label && <p className="mb-1 text-center text-[10px] font-semibold uppercase tracking-wider text-rose/40">Advertisement</p>}
      <ins
        className="adsbygoogle"
        style={{ display: "block" }}
        data-ad-client={AD_CLIENT}
        data-ad-slot={slot}
        data-ad-format={format}
        data-full-width-responsive="true"
      />
    </div>
  );
}
