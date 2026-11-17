import { tr, trx } from "@/i18n";
import type { ReactNode } from "react";

export function PageHeader({ title, emoji, children }: { title: string; emoji?: ReactNode; children?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <h1 className="font-script text-5xl text-hotpink">
        {trx(title)} {emoji && <span className="ms-1 text-3xl">{trx(emoji)}</span>}
      </h1>
      {children}
    </div>
  );
}

export function ComingSoonCard({ label = "Coming soon" }: { label?: string }) {
  return (
    <div className="rounded-[2rem] bg-white/85 p-10 text-center shadow-xl shadow-rose/10 backdrop-blur">
      <p className="font-script text-4xl text-hotpink">{trx(label)}</p>
      <p className="mt-2 text-sm text-rose/80">{tr("we're styling something soft for you ✿")}</p>
    </div>
  );
}