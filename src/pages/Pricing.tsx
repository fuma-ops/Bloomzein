import { ArrowLeft, Check, Crown, Sparkles, Utensils, Flame, Dumbbell, Flower2, CalendarDays, Wallet, NotebookPen, Bell } from "lucide-react";
import { AppIcon } from "@/components/bloom/AppIcon";

/* ------------------------------------------------------------------ *
 * Public pricing page — the single place where Bloom+ plans and prices
 * are visible without signing in. Linked from the marketing footer and
 * used for Paddle's "pricing page URL". Kept static + plain so it always
 * renders (no auth, no Paddle.js needed just to see the prices).
 * ------------------------------------------------------------------ */

const GOLD = "#B76E79";

const FEATURES = [
  { Icon: Flower2, text: "Cycle tracking that syncs every tool to your current phase" },
  { Icon: Utensils, text: "Your whole week of meals, auto-planned & shoppable" },
  { Icon: Dumbbell, text: "Full workout & yoga programs, matched to your cycle phase" },
  { Icon: Flame, text: "Energy engine — daily target, macros, eat-back & goal timeline" },
  { Icon: CalendarDays, text: "A big calendar & life organizer for your whole month" },
  { Icon: Wallet, text: "Budget planner to keep your money picture in one place" },
  { Icon: NotebookPen, text: "Notes & a daily diary for reflections and tracking" },
  { Icon: Bell, text: "Smart reminders for your cycle, meds, water & habits" },
  { Icon: Sparkles, text: "Long-term mood, health & progress insights from day one" },
];

function PlanCard({
  name, price, period, note, highlight, badge,
}: {
  name: string; price: string; period: string; note: string; highlight?: boolean; badge?: string;
}) {
  return (
    <div
      className={[
        "relative flex-1 rounded-3xl border p-6 text-center transition",
        highlight ? "border-hotpink shadow-lg shadow-hotpink/10" : "border-petal/60",
      ].join(" ")}
      style={{ background: highlight ? "linear-gradient(160deg,#FFF1F6,#FFFFFF)" : "#FFFFFF" }}
    >
      {badge && (
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-wide text-white" style={{ background: GOLD }}>
          {badge}
        </span>
      )}
      <p className="text-[11px] font-bold uppercase tracking-widest text-rose/50">{name}</p>
      <p className="mt-2 font-black text-4xl text-hotpink leading-none">
        {price}
        <span className="text-sm font-bold text-rose/50">/{period}</span>
      </p>
      <p className="mt-1.5 text-[12px] text-rose/70">{note}</p>
      <a
        href="/app"
        className="bloom-luxury-btn mt-5 inline-flex w-full items-center justify-center gap-1.5 rounded-full py-3 text-sm font-bold text-white"
      >
        <Sparkles className="h-4 w-4" strokeWidth={2} /> Start 7-day free trial
      </a>
    </div>
  );
}

export function PricingPage() {
  return (
    <div className="min-h-screen bg-[#FFF5F9] text-[#4a2338]">
      <div className="mx-auto max-w-3xl px-5 py-10 sm:py-14">
        <a
          href="/"
          onClick={(e) => { if (typeof window !== "undefined" && window.history.length > 1) { e.preventDefault(); window.history.back(); } }}
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#9D5C7E] hover:text-[#EC4899] transition"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Bloomzein
        </a>

        <header className="mt-6 text-center">
          <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl text-white" style={{ background: `linear-gradient(135deg, ${GOLD}, #EC4899)` }}>
            <Crown className="h-7 w-7" strokeWidth={1.8} />
          </span>
          <p className="mt-3 text-[11px] font-black uppercase tracking-[0.2em]" style={{ color: GOLD }}>Bloom+ Premium</p>
          <h1 className="mt-1 font-script text-4xl sm:text-5xl text-[#831843] leading-none">Simple, honest pricing</h1>
          <p className="mx-auto mt-3 max-w-md text-[14px] text-rose/75 leading-relaxed">
            Bloomzein is your all-in-one wellness companion &amp; life organizer — cycle, meals,
            movement, budget, calendar, notes and reminders in one place. <b>Bloom+</b> unlocks the
            full experience. Start with a <b>7-day free trial</b>, cancel anytime.
          </p>
        </header>

        <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-stretch">
          <PlanCard name="Monthly" price="$9.99" period="month" note="Billed monthly · cancel anytime" />
          <PlanCard name="Yearly" price="$59" period="year" note="Billed yearly · best value" highlight badge="Save 51%" />
        </div>

        <section className="mt-10">
          <h2 className="text-center font-script text-2xl text-[#EC4899]">Everything Bloomzein brings together</h2>
          <ul className="mx-auto mt-4 max-w-md space-y-2.5">
            {FEATURES.map(({ Icon, text }) => (
              <li key={text} className="flex items-start gap-3 text-[14px] leading-snug text-[#5b3247]">
                <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-hotpink/10 text-hotpink"><Icon className="h-3.5 w-3.5" strokeWidth={2.2} /></span>
                {text}
              </li>
            ))}
          </ul>
        </section>

        <p className="mt-10 text-center text-[12px] text-rose/60">
          Prices in USD; your local currency and taxes are shown at checkout. Payments are securely
          processed by <b>Paddle</b>, our Merchant of Record.
        </p>
        <p className="mt-2 flex items-center justify-center gap-1.5 text-[12px] text-rose/60">
          <Check className="h-3.5 w-3.5 text-emerald-500" strokeWidth={3} /> 7-day free trial · cancel anytime · no hidden fees
        </p>

        <footer className="mt-12 border-t border-[#F4C6DD] pt-6 text-center text-xs text-[#9D5C7E]">
          <div className="flex flex-wrap justify-center gap-x-4 gap-y-1">
            <a href="/privacy" className="font-semibold hover:text-[#EC4899]">Privacy Policy</a>
            <a href="/terms" className="font-semibold hover:text-[#EC4899]">Terms of Service</a>
            <a href="/refund" className="font-semibold hover:text-[#EC4899]">Refund &amp; Cancellation</a>
            <a href="/help" className="hover:text-[#EC4899]">Contact</a>
          </div>
          <p className="mt-3">© {new Date().getFullYear()} Bloomzein. Made with care for your softest era. ✿</p>
        </footer>
      </div>
    </div>
  );
}
