// Public, functional budget planner for the /tools/budget-planner SEO landing.
// A real 50/30/20 split a visitor can use immediately, then a CTA to create a
// free account for the full budget tool (categories, tracking, soft nudges).
import { useMemo, useState } from "react";
import { Sparkles, Home, Heart, PiggyBank } from "lucide-react";

const money = (n: number) => n.toLocaleString(undefined, { maximumFractionDigits: 0 });

export function PublicBudgetCalculator() {
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
        <h2 className="font-script text-2xl text-hotpink sm:text-3xl">Plan your month — free</h2>
      </div>
      <p className="mt-1 text-[13px] text-rose/70">The gentle 50/30/20 rule: needs, wants and savings — worked out instantly from your monthly income.</p>

      <label className="mt-5 block">
        <span className="text-[11px] font-bold uppercase tracking-wide text-rose/55">Monthly income</span>
        <input type="number" min={0} value={income} onChange={(e) => setIncome(Math.max(0, +e.target.value))}
          className="mt-1 w-full rounded-2xl border border-petal/60 bg-white px-3 py-2.5 text-[16px] font-bold text-[#831843] outline-none focus:border-hotpink" />
      </label>

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <Slice Icon={Home} label="Needs" pct="50%" value={money(split.needs)} sub="rent, bills, food" />
        <Slice Icon={Heart} label="Wants" pct="30%" value={money(split.wants)} sub="fun, treats, glow" />
        <Slice Icon={PiggyBank} label="Savings" pct="20%" value={money(split.savings)} sub="future you" />
      </div>

      <div className="mt-4 rounded-2xl bg-gradient-to-br from-hotpink to-[#db2777] p-5 text-center text-white">
        <p className="font-script text-2xl">Make it a plan you actually keep ✿</p>
        <p className="mx-auto mt-1 max-w-sm text-[13px] text-white/90">Create your free account to set your own categories, track spending and get soft nudges when you're close to a limit.</p>
        <a href="/onboarding" className="mt-3 inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-[15px] font-bold text-hotpink transition hover:bg-white/90">
          <Sparkles className="h-4 w-4" /> Create my free account
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
