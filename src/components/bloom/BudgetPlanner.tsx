import { useEffect, useMemo, useState } from "react";
import {
  Wallet, TrendingUp, TrendingDown, PiggyBank, Gem, Plus, Trash2,
  ChevronDown, ChevronLeft, ChevronRight, Check, Sparkles, X,
  Home as HomeIcon, ShoppingCart, GraduationCap, Car, Dumbbell, Zap, Droplets,
  Flame, Smartphone, Pill, Sparkle, Film, Shirt, Plane, Heart, UtensilsCrossed,
  Baby, PawPrint, Package, BookHeart, Target, Briefcase, Banknote,
  Building2, LineChart as LineIcon, Calendar, Download, Filter, ArrowUpRight,
  ArrowDownRight, ArrowRight, CheckCircle2, CircleDot, Coins, Receipt,
  Flag, FileBarChart, type LucideIcon,
} from "lucide-react";
import { KawaiiBackground } from "./KawaiiBackground";
import { BudgetBubbles } from "./BudgetBubbles";
import { estimateWeeklyGroceryCost } from "./mealsBudget";

/* ============================================================
   TOKENS / CONSTANTS
============================================================ */
const CURRENCIES = {
  MAD: { symbol: "DH", name: "Moroccan Dirham" },
  EUR: { symbol: "€",  name: "Euro" },
  USD: { symbol: "$",  name: "US Dollar" },
  GBP: { symbol: "£",  name: "British Pound" },
  AED: { symbol: "د.إ", name: "UAE Dirham" },
  CAD: { symbol: "C$", name: "Canadian Dollar" },
} as const;
type CurrencyKey = keyof typeof CURRENCIES;

const TABS = [
  "Dashboard", "Incomes", "Budget Setup", "Savings Goals", "Reports",
] as const;
type TabKey = typeof TABS[number];

type Need = "need" | "want" | "savings";

interface Cat { key: string; label: string; Icon: LucideIcon; emoji: string; group: Need; }

const DEFAULT_CATS: Cat[] = [
  { key: "rent",    label: "Rent/Mortgage",      Icon: HomeIcon,        emoji: "🏠", group: "need" },
  { key: "food",    label: "Food & Groceries",   Icon: ShoppingCart,    emoji: "🛒", group: "need" },
  { key: "edu",     label: "Education",          Icon: GraduationCap,   emoji: "🎓", group: "need" },
  { key: "transp",  label: "Transport",          Icon: Car,             emoji: "🚗", group: "need" },
  { key: "gym",     label: "Gym & Sport",        Icon: Dumbbell,        emoji: "💪", group: "want" },
  { key: "elec",    label: "Electricity",        Icon: Zap,             emoji: "⚡", group: "need" },
  { key: "water",   label: "Water",              Icon: Droplets,        emoji: "💧", group: "need" },
  { key: "gas",     label: "Gas",                Icon: Flame,           emoji: "🔥", group: "need" },
  { key: "phone",   label: "Phone & Internet",   Icon: Smartphone,      emoji: "📱", group: "want" },
  { key: "health",  label: "Health & Pharmacy",  Icon: Pill,            emoji: "💊", group: "need" },
  { key: "beauty",  label: "Beauty & Skincare",  Icon: Sparkle,         emoji: "💅", group: "want" },
  { key: "enter",   label: "Entertainment",      Icon: Film,            emoji: "🎬", group: "want" },
  { key: "shop",    label: "Shopping & Clothing",Icon: Shirt,           emoji: "👗", group: "want" },
  { key: "travel",  label: "Travel & Vacation",  Icon: Plane,           emoji: "✈️", group: "want" },
  { key: "self",    label: "Self-care & Wellness",Icon: Heart,          emoji: "🌸", group: "want" },
  { key: "rest",    label: "Restaurants & Dining",Icon: UtensilsCrossed,emoji: "🍽️", group: "want" },
  { key: "kids",    label: "Kids & Family",      Icon: Baby,            emoji: "👶", group: "need" },
  { key: "pets",    label: "Pets",               Icon: PawPrint,        emoji: "🐾", group: "want" },
  { key: "other",   label: "Divers/Other",       Icon: Package,         emoji: "📦", group: "need" },
];

const INCOME_SOURCES = ["Salary","Freelance","Business","Rental","Investment","Side hustle","Other"];
const FREQUENCIES = ["Monthly","Weekly","Bi-weekly","One-time"] as const;
type Frequency = typeof FREQUENCIES[number];

const MOODS = [
  { key: "planned",   label: "Planned",   Icon: Target,       tone: "bg-mint/30 text-emerald-700 border-emerald-200" },
  { key: "necessary", label: "Necessary", Icon: CheckCircle2, tone: "bg-pink-100 text-hotpink border-pink-200" },
  { key: "impulsive", label: "Impulsive", Icon: Zap,          tone: "bg-rose-100 text-magenta border-rose-200" },
] as const;
type MoodKey = typeof MOODS[number]["key"];

const PRESET_GOALS = ["Emergency Fund","Vacation","New Device","Investment","Wedding","Home","Education","Car"];

/* ============================================================
   TYPES
============================================================ */
interface Income { id: string; source: string; amount: number; frequency: Frequency; }
interface Budget { [catKey: string]: number; } // monthly amount per selected cat
interface Txn { id: string; date: string; catKey: string; amount: number; description: string; mood: MoodKey; type: "income" | "expense"; }
interface Goal { id: string; name: string; target: number; saved: number; monthly: number; }
interface Bill { id: string; name: string; due: string; amount: number; paid: boolean; }
interface CustomCat { key: string; label: string; emoji: string; group: Need; }

/* ============================================================
   PERSISTENCE
============================================================ */
function useLocal<T>(key: string, initial: T): [T, (v: T | ((p: T) => T)) => void] {
  const [v, setV] = useState<T>(() => {
    if (typeof window === "undefined") return initial;
    try {
      const raw = localStorage.getItem(key);
      return raw ? (JSON.parse(raw) as T) : initial;
    } catch { return initial; }
  });
  useEffect(() => {
    try { localStorage.setItem(key, JSON.stringify(v)); } catch {}
  }, [key, v]);
  return [v, setV];
}

/* ============================================================
   HELPERS
============================================================ */
const uid = () => Math.random().toString(36).slice(2, 10);
const todayISO = () => new Date().toISOString().slice(0, 10);

function fmt(n: number, c: CurrencyKey) {
  const sym = CURRENCIES[c].symbol;
  const rounded = Math.round(n * 100) / 100;
  return `${sym} ${rounded.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

function toMonthly(i: Income): number {
  switch (i.frequency) {
    case "Monthly":   return i.amount;
    case "Weekly":    return i.amount * (52 / 12);
    case "Bi-weekly": return i.amount * (26 / 12);
    case "One-time":  return i.amount / 12;
  }
}

function daysUntil(dateISO: string): number {
  const d = new Date(dateISO + "T00:00:00");
  const t = new Date(); t.setHours(0,0,0,0);
  return Math.round((d.getTime() - t.getTime()) / 86400000);
}

/* ============================================================
   ATOMIC UI
============================================================ */
function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-2xl bg-white/85 backdrop-blur p-3 sm:p-5 shadow-[0_8px_24px_-12px_rgba(236,72,153,0.25)] border-[0.5px] border-pink-300/30 transition-all duration-200 ${className}`}
    >
      {children}
    </div>
  );
}

function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`w-full rounded-xl bg-white/80 px-3 py-2 text-sm text-[#831843] placeholder:text-[#C4A0CE] border-[0.5px] border-pink-300/40 outline-none transition focus:ring-2 focus:ring-pink-400/50 focus:border-pink-400 ${props.className ?? ""}`}
    />
  );
}

function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className="relative">
      <select
        {...props}
        className={`appearance-none w-full rounded-xl bg-white/80 pl-3 pr-8 py-2 text-sm text-[#831843] border-[0.5px] border-pink-300/40 outline-none transition focus:ring-2 focus:ring-pink-400/50 focus:border-pink-400 ${props.className ?? ""}`}
      />
      <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-[#9D5C7E]" />
    </div>
  );
}

function PrimaryBtn({ children, ...rest }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...rest}
      className={`inline-flex items-center justify-center gap-1.5 rounded-full bg-[#EC4899] px-4 py-2 text-sm font-semibold text-white shadow-md shadow-pink-400/30 transition hover:scale-[1.03] hover:bg-[#DB2777] active:scale-95 disabled:opacity-50 disabled:hover:scale-100 ${rest.className ?? ""}`}
    >
      {children}
    </button>
  );
}

function GhostBtn({ children, ...rest }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...rest}
      className={`inline-flex items-center justify-center gap-1.5 rounded-full bg-[#FCE7F3] px-4 py-2 text-sm font-semibold text-[#9D5C7E] border-[0.5px] border-pink-400/30 transition hover:bg-pink-200 active:scale-95 ${rest.className ?? ""}`}
    >
      {children}
    </button>
  );
}

/* ============================================================
   CHARTS (pure SVG)
============================================================ */
function Donut({ data, total, currency, size = 180 }: {
  data: { label: string; value: number; color: string }[];
  total: number; currency: CurrencyKey; size?: number;
}) {
  const r = size / 2 - 16, c = 2 * Math.PI * r;
  let acc = 0;
  const sum = data.reduce((s, d) => s + d.value, 0) || 1;
  return (
    <div className="flex flex-col items-center">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#FCE7F3" strokeWidth="18" />
        {data.map((d, i) => {
          const len = (d.value / sum) * c;
          const dash = `${len} ${c - len}`;
          const offset = -acc;
          acc += len;
          return (
            <circle key={i} cx={size/2} cy={size/2} r={r} fill="none"
              stroke={d.color} strokeWidth="18" strokeDasharray={dash}
              strokeDashoffset={offset} strokeLinecap="round" className="transition-all duration-500" />
          );
        })}
      </svg>
      <div className="-mt-[60%] mb-[20%] text-center pointer-events-none">
        <div className="text-[10px] font-bold tracking-widest text-[#9D5C7E]">TOTAL</div>
        <div className="font-script text-3xl text-[#831843]">{fmt(total, currency)}</div>
      </div>
    </div>
  );
}

function LineChart({ points }: { points: number[] }) {
  const w = 320, h = 140, pad = 20;
  const max = Math.max(...points, 1);
  const step = (w - pad * 2) / Math.max(points.length - 1, 1);
  const path = points.map((v, i) => {
    const x = pad + i * step;
    const y = h - pad - (v / max) * (h - pad * 2);
    return `${i === 0 ? "M" : "L"} ${x} ${y}`;
  }).join(" ");
  const area = `${path} L ${pad + (points.length - 1) * step} ${h - pad} L ${pad} ${h - pad} Z`;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-auto">
      <defs>
        <linearGradient id="bp-grad" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#EC4899" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#EC4899" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill="url(#bp-grad)" />
      <path d={path} fill="none" stroke="#EC4899" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      {points.map((v, i) => {
        const x = pad + i * step;
        const y = h - pad - (v / max) * (h - pad * 2);
        return <circle key={i} cx={x} cy={y} r="4" fill="#EC4899" />;
      })}
      {["W1","W2","W3","W4"].map((l, i) => (
        <text key={l} x={pad + i * step} y={h - 4} fontSize="10" fill="#9D5C7E" textAnchor="middle">{l}</text>
      ))}
    </svg>
  );
}

function HealthRing({ pct, label, tone }: { pct: number; label: string; tone: string }) {
  const size = 150, r = size/2 - 12, c = 2 * Math.PI * r;
  const dash = `${(pct / 100) * c} ${c}`;
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#FCE7F3" strokeWidth="12" />
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={tone} strokeWidth="12"
          strokeDasharray={dash} strokeLinecap="round" className="transition-all duration-700" />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">
        <div>
          <div className="text-3xl font-bold" style={{ color: tone }}>{Math.round(pct)}%</div>
          <div className="text-xs font-semibold text-[#9D5C7E]">{label}</div>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   MAIN COMPONENT
============================================================ */
export function BudgetPlanner() {
  const [tab, setTab] = useLocal<TabKey>("bp:tab", "Dashboard");
  const [currency, setCurrency] = useLocal<CurrencyKey>("bp:currency", "USD");
  const [showCurrencyPicker, setShowCurrencyPicker] = useState(false);
  const [incomes, setIncomes] = useLocal<Income[]>("bp:incomes", []);
  const [customCats, setCustomCats] = useLocal<CustomCat[]>("bp:customCats", []);
  const [selectedCats, setSelectedCats] = useLocal<string[]>("bp:selectedCats", ["rent","food","transp","elec"]);
  const [budget, setBudget] = useLocal<Budget>("bp:budget", {});
  const [txns, setTxns] = useLocal<Txn[]>("bp:txns", []);
  const [goals, setGoals] = useLocal<Goal[]>("bp:goals", []);
  const [bills, setBills] = useLocal<Bill[]>("bp:bills", []);

  const allCats: Cat[] = useMemo(() => [
    ...DEFAULT_CATS,
    ...customCats.map(c => ({ ...c, Icon: Package })),
  ], [customCats]);

  const totalIncome = useMemo(() => incomes.reduce((s, i) => s + toMonthly(i), 0), [incomes]);
  const totalExpenses = useMemo(
    () => txns.filter(t => t.type === "expense").reduce((s, t) => s + t.amount, 0),
    [txns],
  );
  const totalSavings = totalIncome - totalExpenses;
  const totalBalance = useMemo(
    () => txns.reduce((s, t) => s + (t.type === "income" ? t.amount : -t.amount), 0) + totalIncome,
    [txns, totalIncome],
  );

  return (
    <div
      className="relative min-h-screen overflow-hidden"
      style={{
        background:
          "radial-gradient(circle at 20% 10%, #FFE4F1 0%, transparent 55%), radial-gradient(circle at 85% 80%, #FBCFE8 0%, transparent 50%), linear-gradient(180deg, #FFF5FA 0%, #FFE9F3 100%)",
      }}
    >
      <BudgetBubbles />
      <KawaiiBackground count={8} />

      {/* Custom pink currency picker modal */}
      {showCurrencyPicker && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
          onClick={() => setShowCurrencyPicker(false)}
        >
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />
          <div
            className="relative w-full max-w-sm mx-4 mb-4 sm:mb-0 rounded-[2rem] bg-white border border-pink-200/60 shadow-2xl shadow-pink-300/30 overflow-hidden animate-scale-in"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-pink-100">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-hotpink">Currency</p>
                <h3 className="font-script text-2xl text-[#831843] leading-tight">Choose your currency ✿</h3>
              </div>
              <button
                onClick={() => setShowCurrencyPicker(false)}
                className="grid h-8 w-8 place-items-center rounded-full bg-pink-50 text-rose/50 hover:text-hotpink hover:bg-pink-100 transition"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            {/* Options */}
            <div className="px-3 py-3 space-y-1">
              {(Object.keys(CURRENCIES) as CurrencyKey[]).map((k) => {
                const active = k === currency;
                return (
                  <button
                    key={k}
                    onClick={() => { setCurrency(k); setShowCurrencyPicker(false); }}
                    className={[
                      "w-full flex items-center justify-between px-4 py-3 rounded-2xl transition active:scale-[0.98]",
                      active
                        ? "bg-hotpink/10 border border-hotpink/30"
                        : "hover:bg-pink-50 border border-transparent",
                    ].join(" ")}
                  >
                    <span className={["font-semibold text-sm", active ? "text-[#831843]" : "text-[#9D5C7E]"].join(" ")}>
                      {k} — {CURRENCIES[k].symbol}
                      <span className="ml-2 text-xs font-normal opacity-70">{CURRENCIES[k].name}</span>
                    </span>
                    <span className={[
                      "grid h-5 w-5 place-items-center rounded-full border-2 transition",
                      active ? "border-hotpink bg-hotpink" : "border-pink-300",
                    ].join(" ")}>
                      {active && <Check className="h-3 w-3 text-white" strokeWidth={3} />}
                    </span>
                  </button>
                );
              })}
            </div>
            <div className="px-5 pb-5 pt-2">
              <button
                onClick={() => setShowCurrencyPicker(false)}
                className="bloom-luxury-btn w-full py-2.5 text-sm font-bold text-white"
              >
                Done ✿
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="relative mx-auto max-w-6xl px-3 sm:px-6 lg:px-8 py-3 sm:py-6">
        {/* Hero */}
        <div className="relative w-full aspect-[8/3] rounded-3xl overflow-hidden border border-pink-200/60 shadow-xl shadow-pink-200/40 mb-3 animate-hero-border-signal">
          <img src="/images/budget-hero.png" alt="Budget" className="absolute inset-0 h-full w-full object-cover object-center" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#EC4899]/70 via-[#EC4899]/20 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/25 via-transparent to-transparent" />
          <div className="absolute inset-0 flex flex-col justify-between p-3 sm:p-5">
            <div className="animate-scale-in">
              <h1 className="font-script text-2xl sm:text-4xl lg:text-5xl xl:text-6xl text-white leading-none drop-shadow-md">Budget</h1>
              <p className="mt-0.5 text-xs sm:text-sm lg:text-base italic text-white/90 max-w-[10rem] sm:max-w-xs lg:max-w-sm drop-shadow leading-snug">Soft, smart money planning — your way.</p>
            </div>
            {/* Currency selector inside hero — custom pink picker */}
            <div className="self-end relative">
              <button
                onClick={() => setShowCurrencyPicker(true)}
                className="inline-flex items-center gap-1.5 rounded-full bg-white/20 backdrop-blur-md border border-white/40 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-white/30 active:scale-95"
              >
                {currency} — {CURRENCIES[currency].symbol}
                <ChevronDown className="h-3.5 w-3.5 opacity-80" strokeWidth={2.5} />
              </button>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="sticky top-0 z-30 -mx-3 sm:-mx-6 lg:-mx-8 px-3 sm:px-6 lg:px-8 py-1.5 backdrop-blur bg-transparent">
          <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
            {TABS.map((t) => {
              const active = tab === t;
              return (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={[
                    "shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold whitespace-nowrap transition-all duration-200 border-[0.5px]",
                    active
                      ? "bg-[#EC4899] text-white shadow-md shadow-pink-400/40 border-transparent scale-[1.02]"
                      : "bg-[#FCE7F3] text-[#9D5C7E] border-pink-400/30 hover:bg-pink-200",
                  ].join(" ")}
                >
                  {t}
                </button>
              );
            })}
          </div>
        </div>

        {/* Tab content */}
        <div key={tab} className="mt-3 animate-fade-in">
          {tab === "Dashboard" && (
            <DashboardTab
              currency={currency}
              totalIncome={totalIncome}
              totalExpenses={totalExpenses}
              totalSavings={totalSavings}
              totalBalance={totalBalance}
              txns={txns} setTxns={setTxns}
              budget={budget}
              selectedCats={selectedCats}
              allCats={allCats}
              goals={goals}
              bills={bills}
              setTab={setTab}
              incomes={incomes}
            />
          )}
          {tab === "Incomes" && (
            <IncomesTab incomes={incomes} setIncomes={setIncomes} currency={currency} setTab={setTab} />
          )}
          {tab === "Budget Setup" && (
            <BudgetSetupTab
              allCats={allCats}
              selectedCats={selectedCats} setSelectedCats={setSelectedCats}
              budget={budget} setBudget={setBudget}
              customCats={customCats} setCustomCats={setCustomCats}
              currency={currency}
              totalIncome={totalIncome}
              setTab={setTab}
              suggestion={(catKey) => suggestionFor(catKey, totalIncome, selectedCats, allCats)}
            />
          )}
          {tab === "Savings Goals" && (
            <GoalsTab goals={goals} setGoals={setGoals} currency={currency} setTab={setTab} />
          )}
          {tab === "Reports" && (
            <ReportsTab
              txns={txns} setTxns={setTxns}
              bills={bills} setBills={setBills}
              allCats={allCats}
              currency={currency}
            />
          )}
        </div>
      </div>

      <style>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
}

/* ============================================================
   TOP STAT CARDS
============================================================ */
function useCountUp(target: number, duration = 900) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    let raf = 0;
    const start = performance.now();
    const from = 0;
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setVal(from + (target - from) * eased);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return val;
}

function StatNumber({ value, currency }: { value: number; currency: CurrencyKey }) {
  const v = useCountUp(value);
  return <>{fmt(v, currency)}</>;
}

function StatCards({ income, expenses, savings, balance, currency }: {
  income: number; expenses: number; savings: number; balance: number; currency: CurrencyKey;
}) {
  const items = [
    { label: "Total Income",   v: income,   Icon: Wallet,       tone: "bg-pink-50 text-[#EC4899]" },
    { label: "Total Expenses", v: expenses, Icon: TrendingDown, tone: "bg-pink-50 text-[#EC4899]" },
    { label: "Total Savings",  v: savings,  Icon: PiggyBank,    tone: "bg-pink-50 text-[#EC4899]" },
    { label: "Total Balance",  v: balance,  Icon: Gem,          tone: "bg-pink-50 text-[#EC4899]" },
  ];
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3 animate-fade-in">
      {items.map((it) => (
        <Card key={it.label} className="hover:-translate-y-1">
          <div className={`grid h-8 w-8 place-items-center rounded-full ${it.tone}`}>
            <it.Icon className="h-4 w-4" strokeWidth={1.6} />
          </div>
          <div
            className="mt-2 text-xl sm:text-2xl font-extrabold tracking-tight font-script leading-none text-[#EC4899]"
            style={{ textShadow: "0 1px 2px rgba(255,255,255,0.9)" }}
          >
            <StatNumber value={it.v} currency={currency} />
          </div>
          <div
            className="mt-0.5 text-[9px] sm:text-[10px] font-extrabold tracking-widest text-[#BE185D]"
            style={{ textShadow: "0 1px 2px rgba(255,255,255,0.8)" }}
          >
            {it.label.toUpperCase()}
          </div>
        </Card>
      ))}
    </div>
  );
}

/* ============================================================
   DASHBOARD TAB
============================================================ */
function DashboardTab(props: {
  currency: CurrencyKey;
  totalIncome: number; totalExpenses: number; totalSavings: number; totalBalance: number;
  txns: Txn[]; setTxns: (v: Txn[] | ((p: Txn[]) => Txn[])) => void;
  budget: Budget; selectedCats: string[]; allCats: Cat[];
  goals: Goal[]; bills: Bill[]; setTab: (t: TabKey) => void;
  incomes: Income[];
}) {
  const { currency, totalIncome, totalExpenses, totalSavings, totalBalance,
    txns, setTxns, selectedCats, allCats, goals, bills, setTab,
    incomes, budget } = props;

  // Donut data: expense totals by category
  const donutData = useMemo(() => {
    const byCat: Record<string, number> = {};
    txns.filter(t => t.type === "expense").forEach(t => {
      byCat[t.catKey] = (byCat[t.catKey] ?? 0) + t.amount;
    });
    const palette = ["#EC4899","#F472B6","#FB7185","#F9A8D4","#C026D3","#E11D48","#FBCFE8","#A21CAF"];
    return Object.entries(byCat).map(([k, v], i) => {
      const cat = allCats.find(c => c.key === k);
      return { label: cat?.label ?? k, value: v, color: palette[i % palette.length] };
    });
  }, [txns, allCats]);

  // Weekly trend (current month)
  const trend = useMemo(() => {
    const buckets = [0, 0, 0, 0];
    const now = new Date();
    txns.filter(t => t.type === "expense").forEach(t => {
      const d = new Date(t.date);
      if (d.getMonth() !== now.getMonth() || d.getFullYear() !== now.getFullYear()) return;
      const wk = Math.min(3, Math.floor((d.getDate() - 1) / 7));
      buckets[wk] += t.amount;
    });
    return buckets;
  }, [txns]);

  // Health
  const savingsPct = totalIncome > 0 ? (totalSavings / totalIncome) * 100 : 0;
  const health = savingsPct > 20
    ? { tone: "#16A34A", label: "Healthy", tip: "Beautiful! You're saving with intention 🌿" }
    : savingsPct >= 10
      ? { tone: "#F59E0B", label: "Watch Out", tip: "Almost there — trim a want category this week 🌷" }
      : { tone: "#EF4444", label: "Over Budget", tip: "Take a soft pause and review your wants 💗" };

  // Inline add txn
  const [amount, setAmount] = useState("");
  const [catKey, setCatKey] = useState(selectedCats[0] ?? allCats[0].key);
  const [desc, setDesc] = useState("");
  const [date, setDate] = useState(todayISO());
  const [mood, setMood] = useState<MoodKey>("planned");

  function addTxn() {
    const amt = parseFloat(amount);
    if (!amt) return;
    setTxns(prev => [{ id: uid(), amount: amt, catKey, description: desc, date, mood, type: "expense" }, ...prev]);
    setAmount(""); setDesc("");
  }

  const steps = [
    { key: "income", label: "Add your income",            done: incomes.length > 0,                                                            tab: "Incomes"           as TabKey, Icon: Wallet },
    { key: "setup",  label: "Set up your budget",         done: selectedCats.length > 0 && Object.values(budget).some(v => v > 0),             tab: "Budget Setup"      as TabKey, Icon: Receipt },
    { key: "goals",  label: "Add a savings goal",         done: goals.length > 0,                                                               tab: "Savings Goals"     as TabKey, Icon: Flag },
    { key: "track",  label: "Track your spending",        done: txns.length > 0,                                                                tab: "Reports"           as TabKey, Icon: FileBarChart },
  ];
  const completed = steps.filter(s => s.done).length;
  const nextStep = steps.find(s => !s.done);
  const hasAnyData =
    incomes.length > 0 ||
    txns.length > 0 ||
    goals.length > 0 ||
    bills.length > 0 ||
    Object.values(budget).some(v => v > 0);

  if (!hasAnyData) {
    return (
      <div className="space-y-5">
        <Card className="relative overflow-hidden">
          <div className="pointer-events-none absolute -top-10 -right-10 h-40 w-40 rounded-full bg-pink-200/50 blur-2xl" />
          <div className="relative">
            <span className="inline-flex items-center gap-1 rounded-full bg-pink-100 px-3 py-1 text-[11px] font-bold tracking-widest text-[#9D5C7E]">
              <Sparkles className="h-3 w-3 text-[#EC4899]" /> WELCOME
            </span>
            <h2 className="mt-3 font-script text-4xl sm:text-5xl text-[#831843] leading-tight">
              Let's set up your soft budget
            </h2>
            <p className="mt-2 text-sm text-[#9D5C7E] max-w-lg">
              Five gentle steps and you're done. Bloom will guide you the whole way — no pressure, no spreadsheets.
            </p>

            <div className="mt-4 flex items-center gap-3">
              <div className="flex-1 h-2 rounded-full bg-pink-100 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${(completed / steps.length) * 100}%`,
                    background: "linear-gradient(90deg,#C084FC,#EC4899)",
                  }}
                />
              </div>
              <span className="text-xs font-bold tracking-widest text-[#9D5C7E]">
                {completed}/{steps.length}
              </span>
            </div>

            <div className="mt-5">
              <PrimaryBtn
                onClick={() => nextStep && setTab(nextStep.tab)}
                className="text-base px-6 py-3 shadow-lg shadow-pink-400/40 animate-pulse"
              >
                <Sparkles className="h-4 w-4" />
                {completed === 0 ? "Start Here" : `Continue: ${nextStep?.label}`}
                <ArrowRight className="h-4 w-4" />
              </PrimaryBtn>
            </div>
          </div>
        </Card>

        <Card>
          <h3 className="text-xs font-bold tracking-widest text-[#9D5C7E] mb-3">YOUR PATH</h3>
          <ol className="space-y-2">
            {steps.map((s, i) => {
              const isNext = !s.done && s === nextStep;
              return (
                <li
                  key={s.key}
                  className={[
                    "flex items-center gap-3 rounded-2xl px-3 py-3 transition-all border-[0.5px]",
                    s.done
                      ? "bg-emerald-50/70 border-emerald-200/60"
                      : isNext
                        ? "bg-pink-50 border-pink-300/60 shadow-sm"
                        : "bg-white/70 border-pink-200/40",
                  ].join(" ")}
                >
                  <div
                    className={[
                      "grid h-9 w-9 shrink-0 place-items-center rounded-full",
                      s.done
                        ? "bg-emerald-500 text-white"
                        : isNext
                          ? "bg-[#EC4899] text-white"
                          : "bg-pink-100 text-[#9D5C7E]",
                    ].join(" ")}
                  >
                    {s.done ? <Check className="h-5 w-5" /> : <s.Icon className="h-4 w-4" strokeWidth={1.8} />}
                  </div>
                  <div className="flex-1">
                    <div className="text-[10px] font-bold tracking-widest text-[#9D5C7E]">
                      STEP {i + 1}
                    </div>
                    <div className={`text-sm font-semibold ${s.done ? "text-emerald-700 line-through decoration-emerald-300" : "text-[#831843]"}`}>
                      {s.label}
                    </div>
                  </div>
                  {isNext && (
                    <button
                      onClick={() => setTab(s.tab)}
                      className="inline-flex items-center gap-1 rounded-full bg-[#EC4899] px-3 py-1.5 text-xs font-semibold text-white shadow-md shadow-pink-400/30 hover:bg-[#DB2777] transition active:scale-95"
                    >
                      Go <ArrowRight className="h-3 w-3" />
                    </button>
                  )}
                  {s.done && (
                    <span className="text-[11px] font-semibold text-emerald-700">Done</span>
                  )}
                </li>
              );
            })}
          </ol>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <StatCards income={totalIncome} expenses={totalExpenses} savings={totalSavings} balance={totalBalance} currency={currency} />

      {/* Overview: donut + trend */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-script text-3xl text-[#831843]">Expense Breakdown</h3>
            <PiggyBank className="h-5 w-5 text-[#EC4899]" />
          </div>
          {donutData.length === 0 ? (
            <EmptyState Icon={PiggyBank} text="No expenses yet — log one below to see the breakdown." />
          ) : (
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <Donut data={donutData} total={totalExpenses} currency={currency} />
              <ul className="flex-1 space-y-1.5 w-full">
                {donutData.map(d => (
                  <li key={d.label} className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2 text-[#831843]">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ background: d.color }} />
                      {d.label}
                    </span>
                    <span className="text-[#9D5C7E]">{Math.round((d.value / totalExpenses) * 100)}%</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Card>

        <Card>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-script text-3xl text-[#831843]">Spending Trend</h3>
            <LineIcon className="h-5 w-5 text-[#EC4899]" />
          </div>
          <LineChart points={trend} />
        </Card>
      </div>

      {/* Bills + Goals preview + Health */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-script text-2xl text-[#831843]">Upcoming Bills</h3>
            <button onClick={() => setTab("Reports")} className="text-xs font-semibold text-[#EC4899] hover:underline">View all</button>
          </div>
          {bills.length === 0 ? <EmptyState Icon={Calendar} text="No bills yet." compact /> : (
            <ul className="space-y-2">
              {bills.slice(0, 3).map(b => {
                const d = daysUntil(b.due);
                const status = b.paid ? { l: "Paid 💚", c: "bg-emerald-100 text-emerald-700" }
                  : d < 0 ? { l: "Overdue 🔴", c: "bg-red-100 text-red-700" }
                  : { l: "Upcoming 🟡", c: "bg-amber-100 text-amber-700" };
                return (
                  <li key={b.id} className="flex items-center justify-between rounded-xl bg-pink-50/60 px-3 py-2 text-sm">
                    <div>
                      <div className="font-semibold text-[#831843]">{b.name}</div>
                      <div className="text-xs text-[#9D5C7E]">in {d} days · {fmt(b.amount, currency)}</div>
                    </div>
                    <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${status.c}`}>{status.l}</span>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        <Card>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-script text-2xl text-[#831843]">Top Goals</h3>
            <button onClick={() => setTab("Savings Goals")} className="text-xs font-semibold text-[#EC4899] hover:underline">View all</button>
          </div>
          {goals.length === 0 ? <EmptyState Icon={Flag} text="No goals yet." compact /> : (
            <ul className="space-y-3">
              {goals.slice(0, 3).map(g => {
                const p = Math.min(100, (g.saved / g.target) * 100);
                return (
                  <li key={g.id}>
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-semibold text-[#831843]">{g.name}</span>
                      <span className="text-[#9D5C7E]">{Math.round(p)}%</span>
                    </div>
                    <div className="mt-1 h-2 rounded-full bg-pink-100 overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${p}%`, background: "linear-gradient(90deg,#C084FC,#EC4899)" }} />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        <Card className="flex flex-col items-center text-center">
          <h3 className="font-script text-2xl text-[#831843] mb-2">Budget Health</h3>
          <HealthRing pct={Math.max(0, Math.min(100, savingsPct))} label={health.label} tone={health.tone} />
          <p className="mt-3 text-xs text-[#9D5C7E]">{health.tip}</p>
        </Card>
      </div>

      {/* Inline Add Transaction */}
      <Card>
        <div className="flex items-center gap-2 mb-3">
          <Plus className="h-4 w-4 text-[#EC4899]" />
          <h3 className="font-script text-3xl text-[#831843]">Add Transaction</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
          <Input type="number" placeholder="Amount" value={amount} onChange={(e) => setAmount(e.target.value)} className="lg:col-span-1" />
          <Select value={catKey} onChange={(e) => setCatKey(e.target.value)} className="lg:col-span-1">
            {(selectedCats.length ? selectedCats : allCats.map(c => c.key)).map(k => {
              const c = allCats.find(x => x.key === k);
              return <option key={k} value={k}>{c?.label}</option>;
            })}
          </Select>
          <Input placeholder="Description (optional)" value={desc} onChange={(e) => setDesc(e.target.value)} className="lg:col-span-2" />
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="lg:col-span-1" />
          <Select value={mood} onChange={(e) => setMood(e.target.value as MoodKey)} className="lg:col-span-1">
            {MOODS.map(m => <option key={m.key} value={m.key}>{m.label}</option>)}
          </Select>
        </div>
        <div className="mt-3 flex justify-end">
          <PrimaryBtn onClick={addTxn}><Plus className="h-4 w-4" /> Save Transaction</PrimaryBtn>
        </div>
      </Card>
    </div>
  );
}

/* ============================================================
   INCOMES TAB
============================================================ */
function IncomesTab({ incomes, setIncomes, currency, setTab }: {
  incomes: Income[]; setIncomes: (v: Income[] | ((p: Income[]) => Income[])) => void;
  currency: CurrencyKey; setTab: (t: TabKey) => void;
}) {
  const total = incomes.reduce((s, i) => s + toMonthly(i), 0);
  function add() {
    setIncomes(prev => [...prev, { id: uid(), source: "Salary", amount: 0, frequency: "Monthly" }]);
  }
  function update(id: string, patch: Partial<Income>) {
    setIncomes(prev => prev.map(i => i.id === id ? { ...i, ...patch } : i));
  }
  function remove(id: string) {
    setIncomes(prev => prev.filter(i => i.id !== id));
  }

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between gap-3">
        <h2 className="font-script text-4xl text-[#831843] flex items-center gap-2"><Wallet className="h-7 w-7 text-[#EC4899]" strokeWidth={1.6} /> My Income Sources</h2>
        <PrimaryBtn onClick={add}><Plus className="h-4 w-4" /> Add Income Source</PrimaryBtn>
      </div>

      {incomes.length === 0 ? (
        <Card>
          <EmptyState
            Icon={Coins}
            title="Let's add your first income source"
            text="Tell Bloom what you earn so it can plan a soft, smart budget for you."
            cta={{ label: "Add Income", onClick: add }}
          />
        </Card>
      ) : (
        <Card>
          <ul className="space-y-3">
            {incomes.map(i => (
              <li key={i.id} className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center rounded-xl bg-pink-50/40 p-3">
                <Select value={i.source} onChange={(e) => update(i.id, { source: e.target.value })} className="sm:col-span-4">
                  {INCOME_SOURCES.map(s => <option key={s} value={s}>{s}</option>)}
                </Select>
                <Input type="number" value={i.amount || ""} onChange={(e) => update(i.id, { amount: parseFloat(e.target.value) || 0 })}
                  placeholder="Amount" className="sm:col-span-3" />
                <Select value={i.frequency} onChange={(e) => update(i.id, { frequency: e.target.value as Frequency })} className="sm:col-span-3">
                  {FREQUENCIES.map(f => <option key={f} value={f}>{f}</option>)}
                </Select>
                <div className="sm:col-span-2 flex items-center justify-between sm:justify-end gap-2">
                  <span className="text-xs text-[#9D5C7E]">≈ {fmt(toMonthly(i), currency)}/mo</span>
                  <button onClick={() => remove(i.id)} className="grid h-9 w-9 place-items-center rounded-full bg-rose-100 text-rose-600 hover:bg-rose-200 transition">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
          <div className="mt-4 flex items-center justify-between rounded-2xl bg-gradient-to-r from-pink-100 to-rose-100 px-4 py-3">
            <span className="font-semibold text-[#831843]">Total Monthly Income</span>
            <span className="font-script text-3xl text-[#EC4899]">{fmt(total, currency)}</span>
          </div>
        </Card>
      )}

      {total > 0 && (
        <Card className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-gradient-to-br from-pink-50 to-rose-50 border-pink-300/40">
          <div>
            <p className="text-xs font-bold tracking-widest text-[#9D5C7E]">NICE WORK</p>
            <p className="font-script text-2xl text-[#831843] leading-tight">Income added — let's plan your budget.</p>
          </div>
          <PrimaryBtn onClick={() => setTab("Budget Setup")} className="shadow-lg shadow-pink-400/40">
            Next: Budget Setup <ArrowRight className="h-4 w-4" />
          </PrimaryBtn>
        </Card>
      )}
    </div>
  );
}

/* ============================================================
   BUDGET SETUP TAB
============================================================ */
function suggestionFor(catKey: string, totalIncome: number, selectedCats: string[], allCats: Cat[]): number {
  if (totalIncome <= 0) return 0;
  const cat = allCats.find(c => c.key === catKey);
  if (!cat) return 0;
  const pool = cat.group === "need" ? totalIncome * 0.5 : cat.group === "want" ? totalIncome * 0.3 : totalIncome * 0.2;
  const sameGroup = selectedCats.filter(k => allCats.find(c => c.key === k)?.group === cat.group).length || 1;
  return Math.round(pool / sameGroup);
}

function BudgetSetupTab(props: {
  allCats: Cat[]; selectedCats: string[]; setSelectedCats: (v: string[] | ((p: string[]) => string[])) => void;
  budget: Budget; setBudget: (v: Budget | ((p: Budget) => Budget)) => void;
  customCats: CustomCat[]; setCustomCats: (v: CustomCat[] | ((p: CustomCat[]) => CustomCat[])) => void;
  currency: CurrencyKey;
  totalIncome: number;
  setTab: (t: TabKey) => void;
  suggestion: (catKey: string) => number;
}) {
  const { allCats, selectedCats, setSelectedCats, budget, setBudget, customCats, setCustomCats, currency, totalIncome, setTab, suggestion } = props;
  const [showCustom, setShowCustom] = useState(false);
  const [customName, setCustomName] = useState("");
  const [customEmoji, setCustomEmoji] = useState("✨");
  const [customGroup, setCustomGroup] = useState<Need>("want");
  const [saved, setSaved] = useState(false);

  function toggle(k: string) {
    setSelectedCats(prev => prev.includes(k) ? prev.filter(x => x !== k) : [...prev, k]);
  }
  function addCustom() {
    const name = customName.trim();
    if (!name) return;
    const key = "cu-" + uid();
    setCustomCats(prev => [...prev, { key, label: name, emoji: customEmoji, group: customGroup }]);
    setSelectedCats(prev => [...prev, key]);
    setCustomName(""); setCustomEmoji("✨");
  }
  function save() {
    setSaved(true);
    setTimeout(() => setSaved(false), 1600);
  }

  function applySuggestions() {
    setBudget(prev => {
      const next = { ...prev };
      selectedCats.forEach(k => { const s = suggestion(k); if (s > 0) next[k] = s; });
      return next;
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 1600);
  }

  const hasAmounts = selectedCats.length > 0 && Object.values(budget).some(v => v > 0);

  const mealEstimate = useMemo(() => estimateWeeklyGroceryCost(), []);

  function useMealEstimate() {
    if (!mealEstimate) return;
    setSelectedCats(prev => prev.includes("food") ? prev : [...prev, "food"]);
    setBudget(prev => ({ ...prev, food: mealEstimate.monthly }));
    setSaved(true);
    setTimeout(() => setSaved(false), 1600);
  }

  return (
    <div className="space-y-5">
      <h2 className="font-script text-4xl text-[#831843] flex items-center gap-2"><Receipt className="h-7 w-7 text-[#EC4899]" strokeWidth={1.6} /> Set Up Your Expenses</h2>

      {mealEstimate && (
        <Card className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-gradient-to-br from-pink-50 to-rose-50 border-pink-300/40">
          <div>
            <p className="text-xs font-bold tracking-widest text-[#9D5C7E]">FROM YOUR MEAL PLAN</p>
            <p className="font-script text-2xl text-[#831843] leading-tight">
              Your {mealEstimate.mealCount}-meal weekly plan is about {fmt(mealEstimate.weekly, currency)}/week in groceries
            </p>
            <p className="text-xs text-[#9D5C7E] mt-1">≈ {fmt(mealEstimate.monthly, currency)}/month — a rough estimate based on each recipe's cost level.</p>
          </div>
          <GhostBtn onClick={useMealEstimate}><UtensilsCrossed className="h-4 w-4" /> Use for Food budget</GhostBtn>
        </Card>
      )}

      <Card>
        <h3 className="text-xs font-bold tracking-widest text-[#9D5C7E] mb-3">STEP 1 · CHOOSE CATEGORIES</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {allCats.map(c => {
            const on = selectedCats.includes(c.key);
            return (
              <button key={c.key} onClick={() => toggle(c.key)}
                className={[
                  "flex flex-col items-center gap-1 rounded-2xl p-3 text-sm font-semibold transition-all duration-200 border-[0.5px]",
                  on ? "bg-[#EC4899] text-white border-transparent shadow-md shadow-pink-400/30 scale-[1.02]"
                     : "bg-white/80 text-[#831843] border-pink-300/40 hover:bg-pink-50",
                ].join(" ")}
              >
                <c.Icon className={`h-6 w-6 ${on ? "text-white" : "text-[#EC4899]"}`} strokeWidth={1.6} />
                <span className="text-center leading-tight text-xs">{c.label}</span>
              </button>
            );
          })}
          <button onClick={() => setShowCustom(v => !v)}
            className="flex flex-col items-center justify-center gap-1 rounded-2xl p-3 text-sm font-semibold border-[0.5px] border-dashed border-pink-400/60 text-[#EC4899] bg-pink-50/40 hover:bg-pink-100">
            <Plus className="h-5 w-5" /> Custom
          </button>
        </div>

        {showCustom && (
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-12 gap-3 rounded-2xl bg-pink-50/60 p-3">
            <Input placeholder="Category name" value={customName} onChange={(e) => setCustomName(e.target.value)} className="sm:col-span-5" />
            <Input placeholder="Emoji" maxLength={2} value={customEmoji} onChange={(e) => setCustomEmoji(e.target.value)} className="sm:col-span-2" />
            <Select value={customGroup} onChange={(e) => setCustomGroup(e.target.value as Need)} className="sm:col-span-3">
              <option value="need">Need</option>
              <option value="want">Want</option>
              <option value="savings">Savings</option>
            </Select>
            <PrimaryBtn onClick={addCustom} className="sm:col-span-2"><Plus className="h-4 w-4" /> Add</PrimaryBtn>
          </div>
        )}
      </Card>

      <Card>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-bold tracking-widest text-[#9D5C7E]">STEP 2 · SET AMOUNTS</h3>
          <div className="flex items-center gap-2">
            {saved && <span className="text-xs font-semibold text-emerald-700 inline-flex items-center gap-1"><Check className="h-3 w-3" /> Saved</span>}
            <PrimaryBtn onClick={save}>Save Budget</PrimaryBtn>
          </div>
        </div>
        {selectedCats.length === 0 ? (
          <EmptyState Icon={Sparkles} title="Pick a few categories above" text="Tap any category card to add it to your monthly budget." />
        ) : (
          <ul className="space-y-2">
            {selectedCats.map(k => {
              const c = allCats.find(x => x.key === k);
              if (!c) return null;
              const sugg = suggestion(k);
              return (
                <li key={k} className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center rounded-xl bg-pink-50/40 px-3 py-2">
                  <div className="sm:col-span-5 flex items-center gap-2">
                    <c.Icon className="h-5 w-5 text-[#EC4899]" strokeWidth={1.6} />
                    <span className="font-semibold text-[#831843]">{c.label}</span>
                  </div>
                  <div className="sm:col-span-4">
                    <Input type="number" value={budget[k] || ""} placeholder="0"
                      onChange={(e) => setBudget(prev => ({ ...prev, [k]: parseFloat(e.target.value) || 0 }))} />
                  </div>
                  <div className="sm:col-span-3 text-xs text-[#9D5C7E]">
                    {sugg > 0 && <>Recommended: <span className="font-semibold text-[#EC4899]">{fmt(sugg, currency)}</span></>}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      {hasAmounts && (
        <Card className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-gradient-to-br from-pink-50 to-rose-50 border-pink-300/40">
          <div>
            <p className="text-xs font-bold tracking-widest text-[#9D5C7E]">BUDGET SET</p>
            <p className="font-script text-2xl text-[#831843] leading-tight">Now set a sweet little savings goal.</p>
          </div>
          <PrimaryBtn onClick={() => setTab("Savings Goals")} className="shadow-lg shadow-pink-400/40">
            Next: Savings Goals <ArrowRight className="h-4 w-4" />
          </PrimaryBtn>
        </Card>
      )}

      {totalIncome > 0 && selectedCats.length > 0 && (
        <Card>
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <h3 className="font-script text-2xl text-[#831843]">Smart Suggestion · 50/30/20</h3>
              <p className="text-xs text-[#9D5C7E]">Let Bloom auto-fill your amounts based on your income.</p>
            </div>
            <GhostBtn onClick={applySuggestions}><Sparkles className="h-4 w-4" /> Apply Suggested Amounts</GhostBtn>
          </div>
        </Card>
      )}
    </div>
  );
}


/* ============================================================
   SAVINGS GOALS TAB
============================================================ */
function GoalsTab({ goals, setGoals, currency, setTab }: {
  goals: Goal[]; setGoals: (v: Goal[] | ((p: Goal[]) => Goal[])) => void;
  currency: CurrencyKey; setTab: (t: TabKey) => void;
}) {
  const [showAdd, setShowAdd] = useState(false);
  const [name, setName] = useState("");
  const [target, setTarget] = useState("");
  const [monthly, setMonthly] = useState("");

  function add(prefName?: string) {
    const n = (prefName ?? name).trim();
    if (!n) return;
    setGoals(prev => [...prev, { id: uid(), name: n, target: parseFloat(target) || 0, saved: 0, monthly: parseFloat(monthly) || 0 }]);
    setName(""); setTarget(""); setMonthly(""); setShowAdd(false);
  }
  function update(id: string, patch: Partial<Goal>) {
    setGoals(prev => prev.map(g => g.id === id ? { ...g, ...patch } : g));
  }
  function remove(id: string) { setGoals(prev => prev.filter(g => g.id !== id)); }

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between gap-3">
        <h2 className="font-script text-4xl text-[#831843] flex items-center gap-2"><Flag className="h-7 w-7 text-[#EC4899]" strokeWidth={1.6} /> My Goals</h2>
        <PrimaryBtn onClick={() => setShowAdd(v => !v)}><Plus className="h-4 w-4" /> Add New Goal</PrimaryBtn>
      </div>

      <Card>
        <h3 className="text-xs font-bold tracking-widest text-[#9D5C7E] mb-2">QUICK ADD</h3>
        <div className="flex flex-wrap gap-2">
          {PRESET_GOALS.map(p => (
            <button key={p} onClick={() => add(p)}
              className="rounded-full bg-[#FCE7F3] px-3 py-1.5 text-xs font-semibold text-[#9D5C7E] border-[0.5px] border-pink-400/30 hover:bg-pink-200 transition">
              + {p}
            </button>
          ))}
        </div>

        {showAdd && (
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-12 gap-3 rounded-2xl bg-pink-50/60 p-3">
            <Input placeholder="Goal name" value={name} onChange={(e) => setName(e.target.value)} className="sm:col-span-5" />
            <Input type="number" placeholder="Target amount" value={target} onChange={(e) => setTarget(e.target.value)} className="sm:col-span-3" />
            <Input type="number" placeholder="Monthly saving" value={monthly} onChange={(e) => setMonthly(e.target.value)} className="sm:col-span-2" />
            <PrimaryBtn onClick={() => add()} className="sm:col-span-2">Add</PrimaryBtn>
          </div>
        )}
      </Card>

      {goals.length === 0 ? (
        <Card>
          <EmptyState
            Icon={Flag}
            title="Set your first savings goal"
            text="Pick a preset above or open the form to dream up your own."
            cta={{ label: "Add a Goal", onClick: () => setShowAdd(true) }}
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {goals.map(g => {
            const pct = Math.min(100, g.target > 0 ? (g.saved / g.target) * 100 : 0);
            const remaining = Math.max(0, g.target - g.saved);
            const months = g.monthly > 0 ? Math.ceil(remaining / g.monthly) : null;
            const status = pct >= 100 ? { l: "Achieved", c: "bg-pink-100 text-hotpink" }
              : g.saved > 0 ? { l: "On Track", c: "bg-emerald-100 text-emerald-700" }
              : { l: "Not Started", c: "bg-slate-100 text-slate-600" };
            return (
              <Card key={g.id}>
                <div className="flex items-start justify-between gap-2">
                  <input value={g.name} onChange={(e) => update(g.id, { name: e.target.value })}
                    className="bg-transparent font-script text-2xl text-[#831843] outline-none focus:bg-pink-50 rounded px-1" />
                  <button onClick={() => remove(g.id)} className="grid h-8 w-8 place-items-center rounded-full bg-rose-100 text-rose-600 hover:bg-rose-200 transition">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                <span className={`inline-block mt-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${status.c}`}>{status.l}</span>
                <div className="mt-3 relative h-3 rounded-full bg-pink-100 overflow-hidden">
                  <div className="h-full rounded-full transition-all duration-700"
                    style={{ width: `${pct}%`, background: "linear-gradient(90deg,#C084FC,#EC4899)" }} />
                  <span className="absolute inset-0 text-center text-[10px] font-bold text-[#831843] leading-3 pt-0.5">{Math.round(pct)}%</span>
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2 text-sm">
                  <label className="block">
                    <span className="text-[10px] tracking-widest text-[#9D5C7E]">SAVED</span>
                    <Input type="number" value={g.saved || ""} onChange={(e) => update(g.id, { saved: parseFloat(e.target.value) || 0 })} />
                  </label>
                  <label className="block">
                    <span className="text-[10px] tracking-widest text-[#9D5C7E]">TARGET</span>
                    <Input type="number" value={g.target || ""} onChange={(e) => update(g.id, { target: parseFloat(e.target.value) || 0 })} />
                  </label>
                  <label className="block">
                    <span className="text-[10px] tracking-widest text-[#9D5C7E]">MONTHLY</span>
                    <Input type="number" value={g.monthly || ""} onChange={(e) => update(g.id, { monthly: parseFloat(e.target.value) || 0 })} />
                  </label>
                </div>
                <p className="mt-2 text-xs text-[#9D5C7E]">
                  {months !== null
                    ? <>At this rate you'll reach it in <span className="font-semibold text-[#EC4899]">{months} months</span>.</>
                    : "Set a monthly amount to estimate timing."}
                </p>
              </Card>
            );
          })}
        </div>
      )}

      {goals.length > 0 && (
        <Card className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-gradient-to-br from-pink-50 to-rose-50 border-pink-300/40">
          <div>
            <p className="text-xs font-bold tracking-widest text-[#9D5C7E]">DREAM LOCKED IN</p>
            <p className="font-script text-2xl text-[#831843] leading-tight">Final step — track your spending.</p>
          </div>
          <PrimaryBtn onClick={() => setTab("Reports")} className="shadow-lg shadow-pink-400/40">
            Next: Reports <ArrowRight className="h-4 w-4" />
          </PrimaryBtn>
        </Card>
      )}
    </div>
  );
}

/* ============================================================
   REPORTS TAB
============================================================ */
function ReportsTab(props: {
  txns: Txn[]; setTxns: (v: Txn[] | ((p: Txn[]) => Txn[])) => void;
  bills: Bill[]; setBills: (v: Bill[] | ((p: Bill[]) => Bill[])) => void;
  allCats: Cat[]; currency: CurrencyKey;
}) {
  const { txns, setTxns, bills, setBills, allCats, currency } = props;
  const now = new Date();
  const [month, setMonth] = useState({ y: now.getFullYear(), m: now.getMonth() });
  const [sortBy, setSortBy] = useState<"date" | "amount">("date");
  const [filterCat, setFilterCat] = useState("");
  const [filterMood, setFilterMood] = useState("");

  const filtered = useMemo(() => {
    let list = txns.filter(t => {
      const d = new Date(t.date);
      return d.getFullYear() === month.y && d.getMonth() === month.m;
    });
    if (filterCat) list = list.filter(t => t.catKey === filterCat);
    if (filterMood) list = list.filter(t => t.mood === filterMood);
    list.sort((a, b) => sortBy === "amount" ? b.amount - a.amount : (a.date < b.date ? 1 : -1));
    return list;
  }, [txns, month, sortBy, filterCat, filterMood]);

  function shiftMonth(dir: -1 | 1) {
    setMonth(({ y, m }) => {
      const d = new Date(y, m + dir, 1);
      return { y: d.getFullYear(), m: d.getMonth() };
    });
  }

  function exportCSV() {
    const rows = [["Date","Type","Category","Description","Amount","Mood"]];
    txns.forEach(t => {
      const c = allCats.find(x => x.key === t.catKey);
      rows.push([t.date, t.type, c?.label ?? t.catKey, t.description, String(t.amount), t.mood]);
    });
    download("transactions.csv", rows.map(r => r.map(csv).join(",")).join("\n"));
  }
  function exportSummary() {
    const income = txns.filter(t => t.type === "income").reduce((s,t) => s + t.amount, 0);
    const expense = txns.filter(t => t.type === "expense").reduce((s,t) => s + t.amount, 0);
    const rows = [
      ["Metric","Amount"],
      ["Total Income", String(income)],
      ["Total Expenses", String(expense)],
      ["Net Savings", String(income - expense)],
    ];
    download("budget-summary.csv", rows.map(r => r.map(csv).join(",")).join("\n"));
  }

  // Bills inline form
  const [billOpen, setBillOpen] = useState(false);
  const [bName, setBName] = useState("");
  const [bDate, setBDate] = useState(todayISO());
  const [bAmt, setBAmt] = useState("");

  function addBill() {
    if (!bName || !bAmt) return;
    setBills(prev => [...prev, { id: uid(), name: bName, due: bDate, amount: parseFloat(bAmt) || 0, paid: false }]);
    setBName(""); setBAmt(""); setBDate(todayISO()); setBillOpen(false);
  }
  function toggleBill(id: string) { setBills(prev => prev.map(b => b.id === id ? { ...b, paid: !b.paid } : b)); }
  function removeBill(id: string) { setBills(prev => prev.filter(b => b.id !== id)); }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h2 className="font-script text-4xl text-[#831843] flex items-center gap-2"><FileBarChart className="h-7 w-7 text-[#EC4899]" strokeWidth={1.6} /> My Reports</h2>
        <div className="flex items-center gap-2">
          <button onClick={() => shiftMonth(-1)} className="grid h-9 w-9 place-items-center rounded-full bg-[#FCE7F3] text-[#9D5C7E] hover:bg-pink-200 transition">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="font-semibold text-[#831843] min-w-[110px] text-center">
            {new Date(month.y, month.m).toLocaleString(undefined, { month: "long", year: "numeric" })}
          </span>
          <button onClick={() => shiftMonth(1)} className="grid h-9 w-9 place-items-center rounded-full bg-[#FCE7F3] text-[#9D5C7E] hover:bg-pink-200 transition">
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      <Card>
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <h3 className="font-script text-2xl text-[#831843]">Transactions</h3>
          <div className="flex flex-wrap gap-2">
            <Select value={sortBy} onChange={(e) => setSortBy(e.target.value as any)}>
              <option value="date">Sort: Date</option>
              <option value="amount">Sort: Amount</option>
            </Select>
            <Select value={filterCat} onChange={(e) => setFilterCat(e.target.value)}>
              <option value="">All categories</option>
              {allCats.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
            </Select>
            <Select value={filterMood} onChange={(e) => setFilterMood(e.target.value)}>
              <option value="">All moods</option>
              {MOODS.map(m => <option key={m.key} value={m.key}>{m.label}</option>)}
            </Select>
          </div>
        </div>
        {filtered.length === 0 ? (
          <EmptyState Icon={Receipt} title="No transactions yet" text="Head to the Dashboard to log your first expense for this month." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-[11px] tracking-widest text-[#9D5C7E]">
                <tr><th className="py-2">DATE</th><th>CATEGORY</th><th>DESCRIPTION</th><th>MOOD</th><th>TYPE</th><th className="text-right">AMOUNT</th><th></th></tr>
              </thead>
              <tbody>
                {filtered.map(t => {
                  const c = allCats.find(x => x.key === t.catKey);
                  const mood = MOODS.find(m => m.key === t.mood)!;
                  return (
                    <tr key={t.id} className="border-t border-pink-100">
                      <td className="py-2 text-[#831843]">{t.date}</td>
                      <td className="text-[#831843]">{c?.label}</td>
                      <td className="text-[#9D5C7E]">{t.description || "—"}</td>
                      <td><span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold border ${mood.tone}`}><mood.Icon className="h-3 w-3" /> {mood.label}</span></td>
                      <td>{t.type === "income"
                        ? <span className="inline-flex items-center text-emerald-700 text-xs font-semibold"><ArrowUpRight className="h-3 w-3" /> Income</span>
                        : <span className="inline-flex items-center text-rose-700 text-xs font-semibold"><ArrowDownRight className="h-3 w-3" /> Expense</span>}</td>
                      <td className="text-right font-semibold text-[#831843]">{fmt(t.amount, currency)}</td>
                      <td className="text-right">
                        <button onClick={() => setTxns(prev => prev.filter(x => x.id !== t.id))} className="text-rose-500 hover:text-rose-700">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Bills */}
      <Card>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-script text-2xl text-[#831843]">Upcoming Bills</h3>
          <GhostBtn onClick={() => setBillOpen(v => !v)}><Plus className="h-4 w-4" /> Add Bill</GhostBtn>
        </div>
        {billOpen && (
          <div className="mb-3 grid grid-cols-1 sm:grid-cols-12 gap-3 rounded-2xl bg-pink-50/60 p-3">
            <Input placeholder="Bill name" value={bName} onChange={(e) => setBName(e.target.value)} className="sm:col-span-4" />
            <Input type="date" value={bDate} onChange={(e) => setBDate(e.target.value)} className="sm:col-span-3" />
            <Input type="number" placeholder="Amount" value={bAmt} onChange={(e) => setBAmt(e.target.value)} className="sm:col-span-3" />
            <PrimaryBtn onClick={addBill} className="sm:col-span-2">Add</PrimaryBtn>
          </div>
        )}
        {bills.length === 0 ? (
          <EmptyState
            Icon={Calendar}
            title="No upcoming bills"
            text="Add a bill so Bloom can remind you before it's due."
            cta={{ label: "Add a Bill", onClick: () => setBillOpen(true) }}
          />
        ) : (
          <ul className="space-y-2">
            {bills.map(b => {
              const d = daysUntil(b.due);
              const status = b.paid ? { l: "Paid", c: "bg-emerald-100 text-emerald-700" }
                : d < 0 ? { l: "Overdue", c: "bg-red-100 text-red-700" }
                : { l: "Upcoming", c: "bg-amber-100 text-amber-700" };
              return (
                <li key={b.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-pink-50/40 px-3 py-2">
                  <div>
                    <div className="font-semibold text-[#831843]">{b.name}</div>
                    <div className="text-xs text-[#9D5C7E]">{b.due} · in {d} days · {fmt(b.amount, currency)}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${status.c}`}>{status.l}</span>
                    <button onClick={() => toggleBill(b.id)} className="rounded-full bg-[#EC4899] text-white text-xs font-semibold px-3 py-1 hover:bg-[#DB2777]">
                      {b.paid ? "Mark Unpaid" : "Mark as Paid"}
                    </button>
                    <button onClick={() => removeBill(b.id)} className="grid h-7 w-7 place-items-center rounded-full bg-rose-100 text-rose-600 hover:bg-rose-200">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      <Card>
        <h3 className="font-script text-2xl text-[#831843] mb-3">Export</h3>
        <div className="flex flex-wrap gap-2">
          <PrimaryBtn onClick={exportCSV}><Download className="h-4 w-4" /> Export to CSV</PrimaryBtn>
          <GhostBtn onClick={exportSummary}><Download className="h-4 w-4" /> Export Budget Summary</GhostBtn>
        </div>
      </Card>
    </div>
  );
}

/* ============================================================
   EMPTY + UTIL
============================================================ */
function EmptyState({
  Icon = Sparkles,
  title,
  text,
  cta,
  compact,
}: {
  Icon?: LucideIcon;
  title?: string;
  text: string;
  cta?: { label: string; onClick: () => void };
  compact?: boolean;
}) {
  return (
    <div className={`text-center ${compact ? "py-4" : "py-8"}`}>
      <div
        className={`mx-auto mb-3 grid place-items-center rounded-full bg-pink-100 text-[#EC4899] ${
          compact ? "h-10 w-10" : "h-14 w-14"
        }`}
      >
        <Icon className={compact ? "h-5 w-5" : "h-7 w-7"} strokeWidth={1.6} />
      </div>
      {title && (
        <p className="font-script text-2xl text-[#831843] leading-tight">{title}</p>
      )}
      <p className="mt-1 text-sm text-[#9D5C7E] max-w-md mx-auto">{text}</p>
      {cta && (
        <div className="mt-3">
          <PrimaryBtn onClick={cta.onClick}>
            <Plus className="h-4 w-4" /> {cta.label}
          </PrimaryBtn>
        </div>
      )}
    </div>
  );
}

function csv(v: string) {
  if (/[",\n]/.test(v)) return `"${v.replace(/"/g, '""')}"`;
  return v;
}
function download(name: string, body: string) {
  const blob = new Blob([body], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}