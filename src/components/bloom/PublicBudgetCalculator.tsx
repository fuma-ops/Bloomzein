// Public, functional budget planner for the /tools/budget-planner SEO landing.
// A real 50/30/20 split a visitor can use immediately, then a CTA to create a
// free account for the full budget tool (categories, tracking, soft nudges).
import { useMemo, useState } from "react";
import { Sparkles, Home, Heart, PiggyBank } from "lucide-react";
import type { ToolLang } from "@/lib/toolPagesI18n";
import { PT, LOCALE } from "./publicToolI18n";

const moneyWith = (loc: string | undefined) => (n: number) => n.toLocaleString(loc, { maximumFractionDigits: 0 });

export function PublicBudgetCalculator({ lang = "en" }: { lang?: ToolLang }) {
  const T = PT[lang], G = T.budget;
  const money = moneyWith(lang === "en" ? undefined : LOCALE[lang]);
  const [income, setIncome] = useState(2000);

  const split = useMemo(() => ({
    needs: Math.round(income * 0.5),
    wants: Math.round(income * 0.3),
    savings: Math.round(income * 0.2),
  }), [income]);

  return (
    <section className="rounded-[1.75rem] border border-petal/60 bg-white/80 p-5 shadow-[0_18px_50px_-30px_rgba(236,72,153,0.5)] sm:p-7">
      <div className="flex items-center gap-2">
        <span className="grid h-9 w-9 place-items-center rounded-full bg-hotpink/12 text-hotpink"><PiggyBank className="h-5 w-5" strokeWidth={2} /></span>
        <h2 className={lang === "ar" ? "text-xl font-extrabold text-hotpink sm:text-2xl" : "font-script text-2xl text-hotpink sm:text-3xl"}>{G.title}</h2>
      </div>
      <p className="mt-1 text-[13px] text-rose/70">{G.lead}</p>

      <label className="mt-5 block">
        <span className="text-[11px] font-bold uppercase tracking-wide text-rose/55">{G.income}</span>
        <input type="number" min={0} value={income} onChange={(e) => setIncome(Math.max(0, +e.target.value))}
          className="mt-1 w-full rounded-2xl border border-petal/60 bg-white px-3 py-2.5 text-[16px] font-bold text-[#831843] outline-none focus:border-hotpink" />
      </label>

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <Slice Icon={Home} label={G.needs} pct="50%" value={money(split.needs)} sub={G.needsSub} />
        <Slice Icon={Heart} label={G.wants} pct="30%" value={money(split.wants)} sub={G.wantsSub} />
        <Slice Icon={PiggyBank} label={G.savings} pct="20%" value={money(split.savings)} sub={G.savingsSub} />
      </div>

      <div className="mt-4 rounded-2xl bg-gradient-to-br from-hotpink to-[#db2777] p-5 text-center text-white">
        <p className={lang === "ar" ? "text-xl font-extrabold" : "font-script text-2xl"}>{G.ctaTitle}</p>
        <p className="mx-auto mt-1 max-w-sm text-[13px] text-white/90">{G.ctaText}</p>
        <a href="/onboarding" className="mt-3 inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-[15px] font-bold text-hotpink transition hover:bg-white/90">
          <Sparkles className="h-4 w-4" /> {T.createFree}
        </a>
      </div>
    </section>
  );
}

function Slice({ Icon, label, pct, value, sub }: { Icon: typeof Home; label: string; pct: string; value: string; sub: string }) {
  return (
    <div className="rounded-2xl border border-petal/50 bg-white/75 p-4 text-center">
      <Icon className="mx-auto h-5 w-5 text-hotpink" strokeWidth={2.1} />
      <p className="mt-1 text-[10px] font-bold uppercase tracking-wide text-rose/55">{label} · {pct}</p>
      <p className="mt-0.5 text-[20px] font-black text-[#831843]">{value}</p>
      <p className="text-[11px] font-semibold text-rose/55">{sub}</p>
    </div>
  );
}
