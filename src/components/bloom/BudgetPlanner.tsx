import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  Wallet, TrendingUp, TrendingDown, PiggyBank, Gem, Plus, Trash2,
  ChevronDown, ChevronLeft, ChevronRight, Check, Sparkles, X, Moon,
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
import { readCyclePhase, hasCycleSettings, type CyclePhase } from "./cyclePhase";

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
      className={`rounded-2xl bg-white/85 backdrop-blur p-2.5 sm:p-4 lg:p-5 shadow-[0_8px_24px_-12px_rgba(236,72,153,0.25)] border-[0.5px] border-pink-300/30 transition-all duration-200 ${className}`}
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

function PinkSelect({ value, onChange, options, placeholder = "Select..." }: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const selected = options.find(o => o.value === value);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-full flex items-center justify-between rounded-xl bg-white/80 px-3 py-2 text-sm text-[#831843] border-[0.5px] border-pink-300/40 hover:border-pink-400 transition text-left"
      >
        <span className="truncate">{selected?.label ?? placeholder}</span>
        <ChevronDown className="h-3.5 w-3.5 text-[#9D5C7E] shrink-0 ml-2" />
      </button>
      {open && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center" onClick={() => setOpen(false)}>
          <div className="relative w-full max-w-sm mx-4 mb-4 sm:mb-0 rounded-[2rem] bg-white border-2 border-pink-200/70 shadow-2xl shadow-pink-300/30 animate-scale-in flex flex-col max-h-[85vh]" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-pink-100 shrink-0">
              <h3 className="font-script text-2xl text-[#831843]">Choose ✿</h3>
              <button onClick={() => setOpen(false)} className="grid h-8 w-8 place-items-center rounded-full bg-pink-50 hover:bg-pink-100 text-[#9D5C7E] hover:text-hotpink transition">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="px-3 py-3 overflow-y-auto flex-1 min-h-0 space-y-1">
              {options.map(o => {
                const active = o.value === value;
                return (
                  <button key={o.value} onClick={() => { onChange(o.value); setOpen(false); }}
                    className={["w-full flex items-center justify-between px-4 py-3 rounded-2xl transition active:scale-[0.98]",
                      active ? "bg-hotpink/10 border border-hotpink/30" : "hover:bg-pink-50 border border-transparent"].join(" ")}>
                    <span className={["text-sm font-semibold", active ? "text-[#831843]" : "text-[#9D5C7E]"].join(" ")}>{o.label}</span>
                    {active && <Check className="h-4 w-4 text-[#EC4899]" strokeWidth={2.5} />}
                  </button>
                );
              })}
            </div>
            <div className="px-5 pb-5 pt-2 shrink-0">
              <button onClick={() => setOpen(false)} className="bloom-luxury-btn w-full py-2.5 text-sm font-bold text-white">
                Done ✿
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}

function PinkDatePicker({ value, onChange, className = "" }: {
  value: string; onChange: (v: string) => void; className?: string;
}) {
  const [open, setOpen] = useState(false);
  const todayObj = new Date(); todayObj.setHours(0,0,0,0);
  const todayStr = todayObj.toISOString().slice(0,10);
  const base = value ? new Date(value + "T00:00:00") : todayObj;
  const [view, setView] = useState({ y: base.getFullYear(), m: base.getMonth() });

  function openPicker() {
    const d = value ? new Date(value + "T00:00:00") : todayObj;
    setView({ y: d.getFullYear(), m: d.getMonth() });
    setOpen(true);
  }

  const display = value
    ? new Date(value + "T00:00:00").toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" })
    : "Select date";

  const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
  const DAY_HDR = ["Mo","Tu","We","Th","Fr","Sa","Su"];

  const firstOfMonth = new Date(view.y, view.m, 1);
  const offset = (firstOfMonth.getDay() + 6) % 7;
  const daysInMonth = new Date(view.y, view.m + 1, 0).getDate();
  const cells = Array.from({ length: Math.ceil((offset + daysInMonth) / 7) * 7 }, (_, i) => {
    const d = new Date(view.y, view.m, 1 - offset + i);
    const iso = d.toISOString().slice(0,10);
    return { d, iso, inMonth: d.getMonth() === view.m, isToday: iso === todayStr, isSelected: iso === value };
  });

  return (
    <>
      <button type="button" onClick={openPicker}
        className={`flex items-center gap-2 rounded-xl bg-white/80 px-3 py-2 text-sm text-[#831843] border-[0.5px] border-pink-300/40 hover:border-pink-400 transition text-left ${className}`}>
        <Calendar className="h-3.5 w-3.5 text-[#EC4899] shrink-0" />
        <span className="flex-1 truncate">{display}</span>
      </button>
      {open && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center" onClick={() => setOpen(false)}>
          <div className="relative w-full max-w-sm mx-4 mb-4 sm:mb-0 rounded-[2rem] bg-white border-2 border-pink-200/70 shadow-2xl shadow-pink-300/30 animate-scale-in overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-pink-100">
              <h3 className="font-script text-2xl text-[#831843]">Pick a date ✿</h3>
              <button onClick={() => setOpen(false)} className="grid h-8 w-8 place-items-center rounded-full bg-pink-50 hover:bg-pink-100 text-[#9D5C7E] transition"><X className="h-4 w-4" /></button>
            </div>
            <div className="flex items-center justify-between px-5 py-3">
              <button onClick={() => setView(v => { const d = new Date(v.y, v.m-1); return {y:d.getFullYear(),m:d.getMonth()}; })}
                className="grid h-8 w-8 place-items-center rounded-full bg-pink-50 hover:bg-pink-100 text-[#9D5C7E] transition">
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="font-semibold text-sm text-[#831843]">{MONTHS[view.m]} {view.y}</span>
              <button onClick={() => setView(v => { const d = new Date(v.y, v.m+1); return {y:d.getFullYear(),m:d.getMonth()}; })}
                className="grid h-8 w-8 place-items-center rounded-full bg-pink-50 hover:bg-pink-100 text-[#9D5C7E] transition">
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
            <div className="grid grid-cols-7 px-4 pb-1">
              {DAY_HDR.map(d => <div key={d} className="text-center text-[10px] font-bold text-[#C4A0CE] pb-1">{d}</div>)}
            </div>
            <div className="grid grid-cols-7 px-4 pb-5 gap-y-0.5">
              {cells.map(({ iso, d, inMonth, isToday, isSelected }) => (
                <button key={iso} onClick={() => { if (inMonth) { onChange(iso); setOpen(false); } }}
                  className={["h-9 w-9 mx-auto rounded-full text-sm font-semibold transition-all duration-150",
                    isSelected ? "bg-[#EC4899] text-white shadow-md shadow-pink-400/30 scale-105"
                    : isToday ? "bg-pink-100 text-[#EC4899] ring-1 ring-[#EC4899]/50"
                    : inMonth ? "hover:bg-pink-50 text-[#831843] active:scale-95"
                    : "text-[#C4A0CE] opacity-40 pointer-events-none"].join(" ")}>
                  {d.getDate()}
                </button>
              ))}
            </div>
            <div className="px-5 pb-5 flex gap-2">
              <button onClick={() => { onChange(todayStr); setOpen(false); }}
                className="flex-1 rounded-full bg-pink-50 py-2 text-xs font-semibold text-[#9D5C7E] hover:bg-pink-100 transition border border-pink-200/60">
                Today
              </button>
              <button onClick={() => setOpen(false)} className="flex-1 bloom-luxury-btn py-2 text-sm font-bold text-white">Done ✿</button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
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

function HealthRing({ pct, label, tone, size = 150 }: { pct: number; label: string; tone: string; size?: number }) {
  const r = size/2 - 12, c = 2 * Math.PI * r;
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
          {label && <div className="text-xs font-semibold text-[#9D5C7E]">{label}</div>}
        </div>
      </div>
    </div>
  );
}

function MiniRing({ pct, size = 100 }: { pct: number; size?: number }) {
  const r = size / 2 - 8, c = 2 * Math.PI * r;
  const dash = `${(pct / 100) * c} ${c}`;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="9" />
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="white" strokeWidth="9"
          strokeDasharray={dash} strokeLinecap="round" className="transition-all duration-700" />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center text-white">
        <div>
          <div className="text-xl sm:text-2xl font-extrabold leading-none">{Math.round(pct)}%</div>
          <div className="text-[9px] sm:text-[10px] font-semibold opacity-80 leading-tight">of your goal<br/>reached</div>
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
    <>
      {/* Custom pink currency picker modal */}
      {showCurrencyPicker && createPortal(
        <div
          className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center"
          onClick={() => setShowCurrencyPicker(false)}
        >
          <div
            className="relative w-full max-w-sm mx-4 mb-4 sm:mb-0 rounded-[2rem] bg-white border-2 border-pink-200/70 shadow-2xl shadow-pink-300/30 overflow-hidden animate-scale-in"
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
        </div>,
        document.body
      )}

      {/* Tabs */}
      <div className="sticky top-14 md:top-0 z-30 -mx-3 sm:-mx-6 lg:-mx-8 px-3 sm:px-6 lg:px-8 py-1.5 backdrop-blur bg-white/40">
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
      <div key={tab} className="mt-2 animate-fade-in">
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
              onCurrencyClick={() => setShowCurrencyPicker(true)}
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

      <style>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </>
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
  const spendScale = income > 0 ? Math.min(2.0, 1 + (expenses / income) * 0.7) : 1;
  const saveScale  = income > 0 && savings > 0 ? Math.min(1.7, 1 + (savings / income) * 0.5) : Math.max(0.7, 1);
  const items = [
    { label: "Income Garden",   emoji: "🌷", v: income,   sub: "your monthly earnings",  bg: "from-pink-50 to-rose-50",     emojiScale: 1.0 },
    { label: "Spending Petals", emoji: "🛍️", v: expenses, sub: "this month's spends",    bg: "from-fuchsia-50 to-pink-50",  emojiScale: spendScale },
    { label: "Savings Bloom",   emoji: "🌸", v: savings,  sub: "building your future",   bg: "from-purple-50 to-pink-50",   emojiScale: saveScale },
    { label: "Dream Balance",   emoji: "💎", v: balance,  sub: "your available balance",  bg: "from-rose-50 to-fuchsia-50",  emojiScale: balance > 0 ? 1.15 : 0.85 },
  ];
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3 animate-fade-in">
      {items.map((it) => (
        <Card key={it.label} className={`relative overflow-hidden hover:-translate-y-1 bg-gradient-to-br ${it.bg}`}>
          <div className="absolute -top-3 -right-3 text-5xl select-none pointer-events-none opacity-20 transition-transform duration-500"
            style={{ transform: `scale(${it.emojiScale})`, transformOrigin: "top right" }}>
            {it.emoji}
          </div>
          <div className="text-[9px] sm:text-[10px] font-bold tracking-widest text-[#9D5C7E] uppercase leading-tight">{it.label}</div>
          <div className="mt-1 font-script text-lg sm:text-2xl font-extrabold leading-none text-[#EC4899]">
            <StatNumber value={it.v} currency={currency} />
          </div>
          <div className="mt-1 text-[9px] sm:text-[10px] text-[#9D5C7E] leading-tight">{it.sub}</div>
        </Card>
      ))}
    </div>
  );
}

/* ============================================================
   QUICK ADD SHEET — glassmorphism bottom sheet, 3-tap UX
============================================================ */
function QuickAddSheet({ open, onClose, onSave, allCats, selectedCats, currency }: {
  open: boolean; onClose: () => void;
  onSave: (amount: number, catKey: string) => void;
  allCats: Cat[]; selectedCats: string[]; currency: CurrencyKey;
}) {
  const [amount, setAmount] = useState("");
  const [catKey, setCatKey] = useState(selectedCats[0] ?? allCats[0]?.key ?? "food");
  const [saved, setSaved]   = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const cats = (selectedCats.length ? selectedCats : allCats.map(c => c.key))
    .map(k => allCats.find(c => c.key === k)).filter(Boolean) as Cat[];

  useEffect(() => {
    if (open) { setAmount(""); setSaved(false); setTimeout(() => inputRef.current?.focus(), 80); }
  }, [open]);

  function handleSave() {
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) return;
    onSave(amt, catKey);
    setSaved(true);
    setTimeout(() => { onClose(); setSaved(false); setAmount(""); }, 1300);
  }

  return (
    <>
      {open && <div className="fixed inset-0 z-40 bg-transparent" onClick={onClose} />}
      <div className={["fixed inset-x-0 bottom-0 z-50 transition-transform duration-300 ease-out will-change-transform",
        open ? "translate-y-0" : "translate-y-full"].join(" ")}>
        <div className="mx-auto max-w-lg rounded-t-[2rem] bg-white/92 backdrop-blur-xl border-t border-pink-200/60 shadow-2xl shadow-pink-300/30 px-5 pt-2 pb-safe">
          <div className="mx-auto mb-4 h-1 w-12 rounded-full bg-pink-200" />
          {saved ? (
            <div className="py-10 flex flex-col items-center gap-3 animate-fade-in">
              <div className="grid h-16 w-16 place-items-center rounded-full bg-emerald-500 text-white shadow-lg shadow-emerald-300/40 animate-scale-in">
                <Check className="h-8 w-8" strokeWidth={3} />
              </div>
              <p className="font-script text-3xl text-[#831843]">Logged ✿</p>
              <p className="text-sm text-[#9D5C7E]">{CURRENCIES[currency].symbol}{amount} · {allCats.find(c => c.key === catKey)?.label}</p>
            </div>
          ) : (
            <>
              <p className="text-[10px] font-bold uppercase tracking-widest text-[#9D5C7E] mb-3">Quick add</p>
              <div className="relative mb-3">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xl font-bold text-[#EC4899]">{CURRENCIES[currency].symbol}</span>
                <input ref={inputRef} type="number" inputMode="decimal" value={amount} onChange={e => setAmount(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handleSave()} placeholder="0.00"
                  className="w-full rounded-2xl bg-pink-50/80 border border-pink-200/60 pl-10 pr-4 py-4 text-3xl font-bold text-[#831843] placeholder:text-pink-200 outline-none focus:ring-2 focus:ring-pink-400/50" />
              </div>
              <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar mb-4">
                {cats.slice(0, 8).map(c => (
                  <button key={c.key} onClick={() => setCatKey(c.key)}
                    className={["shrink-0 flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold border transition-all duration-150",
                      c.key === catKey
                        ? "bg-[#EC4899] text-white border-transparent shadow-md shadow-pink-400/30 scale-[1.05]"
                        : "bg-pink-50 text-[#9D5C7E] border-pink-200/60"].join(" ")}>
                    <span>{c.emoji}</span>{c.label}
                  </button>
                ))}
              </div>
              <button onClick={handleSave} disabled={!amount || parseFloat(amount) <= 0}
                className="w-full bloom-luxury-btn py-4 text-base font-bold text-white rounded-2xl disabled:opacity-40 transition-all"
                style={{ animation: amount && parseFloat(amount) > 0 ? 'ctaBreathe 2.8s ease-in-out infinite' : 'none' }}>
                Log ✿
              </button>
              <div className="h-6" />
            </>
          )}
        </div>
      </div>
    </>
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
  incomes: Income[]; onCurrencyClick: () => void;
}) {
  const { currency, totalIncome, totalExpenses, totalSavings, totalBalance,
    txns, setTxns, selectedCats, allCats, goals, setTab, incomes, budget, onCurrencyClick } = props;

  const [setupDismissed, setSetupDismissed] = useLocal<boolean>("bp:setup-dismissed", false);

  const steps = [
    { key: "income", label: "Add your income",      hint: "Tell Bloom how much you earn each month",       done: incomes.length > 0,                                                 tab: "Incomes"       as TabKey, Icon: Wallet },
    { key: "setup",  label: "Set up your budget",   hint: "Pick spending categories & set monthly limits", done: selectedCats.length > 0 && Object.values(budget).some(v => v > 0), tab: "Budget Setup"  as TabKey, Icon: Receipt },
    { key: "goals",  label: "Add a savings goal",   hint: "A vacation, an emergency fund — dream big",     done: goals.length > 0,                                                   tab: "Savings Goals" as TabKey, Icon: Flag },
    { key: "track",  label: "Log your first spend", hint: "Track where your money actually goes",          done: txns.length > 0,                                                    tab: "Reports"       as TabKey, Icon: FileBarChart },
  ];
  const completed = steps.filter(s => s.done).length;
  const nextStep  = steps.find(s => !s.done);
  const allDone   = completed === steps.length;

  // View period toggle: week ↔ month
  const [viewPeriod, setViewPeriod] = useState<"week" | "month">("month");

  // Goals carousel
  const [goalIdx, setGoalIdx] = useState(0);
  const goalTouchX = useRef<number | null>(null);

  // Quick add sheet
  const [showQuickAdd, setShowQuickAdd] = useState(false);

  // Cycle phase (read-only from Cycle Tracker)
  const [cyclePhase, setCyclePhase] = useState<CyclePhase | null>(null);
  useEffect(() => { if (hasCycleSettings()) setCyclePhase(readCyclePhase()); }, []);

  // Inline detailed form state
  const [amount, setAmount]   = useState("");
  const [catKey, setCatKey]   = useState(selectedCats[0] ?? allCats[0]?.key ?? "food");
  const [desc, setDesc]       = useState("");
  const [date, setDate]       = useState(todayISO());
  const [mood, setMood]       = useState<MoodKey>("planned");
  const [showCatModal, setShowCatModal]   = useState(false);
  const [showMoodModal, setShowMoodModal] = useState(false);
  const [txnSaved, setTxnSaved] = useState(false);

  const catOptions = selectedCats.length ? selectedCats : allCats.map(c => c.key);
  const currentCat = allCats.find(c => c.key === catKey);
  const currentMood = MOODS.find(m => m.key === mood)!;

  function addTxn() {
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) return;
    setTxns(prev => [{ id: uid(), amount: amt, catKey, description: desc, date, mood, type: "expense" }, ...prev]);
    setAmount(""); setDesc("");
    setTxnSaved(true);
    setTimeout(() => setTxnSaved(false), 1500);
  }

  // === WEEK vs MONTH FILTER ===
  const filteredTxns = useMemo(() => {
    if (viewPeriod === "month") return txns;
    const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - 6); cutoff.setHours(0, 0, 0, 0);
    return txns.filter(t => new Date(t.date + "T00:00:00") >= cutoff);
  }, [txns, viewPeriod]);

  // Current calendar-month transactions — used for Budget Plan bars regardless of the week/month toggle
  const monthTxns = useMemo(() => {
    const now = new Date();
    return txns.filter(t => {
      const d = new Date(t.date + "T00:00:00");
      return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
    });
  }, [txns]);

  // 7-day band
  const weekBand = useMemo(() => Array.from({ length: 7 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (6 - i));
    const iso = d.toISOString().slice(0, 10);
    const spent = txns.filter(t => t.date === iso && t.type === "expense").reduce((s, t) => s + t.amount, 0);
    return { iso, label: ["S", "M", "T", "W", "T", "F", "S"][d.getDay()], spent, isToday: i === 6 };
  }), [txns]);

  // Spending by category (filtered)
  const catSpend = useMemo(() => {
    const byCat: Record<string, number> = {};
    filteredTxns.filter(t => t.type === "expense").forEach(t => {
      byCat[t.catKey] = (byCat[t.catKey] ?? 0) + t.amount;
    });
    const total = Object.values(byCat).reduce((s, v) => s + v, 0) || 1;
    return Object.entries(byCat)
      .sort(([, a], [, b]) => b - a)
      .map(([k, v]) => ({ key: k, cat: allCats.find(c => c.key === k), amount: v, pct: Math.round((v / total) * 100) }));
  }, [filteredTxns, allCats]);

  // Filtered totals for insights
  const filteredExpenses = filteredTxns.filter(t => t.type === "expense").reduce((s, t) => s + t.amount, 0);
  const filteredSavings  = totalIncome > 0 ? totalIncome - filteredExpenses : 0;

  // Story insights — warm, never red
  const insights = useMemo(() => {
    const r: { icon: string; main: string; sub: string }[] = [];
    if (totalIncome > 0 && filteredExpenses > totalIncome)
      r.push({ icon: "💗", main: "Take a soft pause this month", sub: "A little over budget — you've totally got this 🌸" });
    else if (filteredSavings > 0)
      r.push({ icon: "🌸", main: `You saved ${fmt(filteredSavings, currency)}`, sub: "Keep growing!" });
    const planned  = filteredTxns.filter(t => t.mood === "planned").length;
    const impulsive = filteredTxns.filter(t => t.mood === "impulsive").length;
    if (filteredTxns.length > 0 && planned >= impulsive)
      r.push({ icon: "🌷", main: "You spent mindfully", sub: "Great choice!" });
    else if (filteredTxns.length > 0 && impulsive > planned)
      r.push({ icon: "🌸", main: "Some unplanned spends", sub: "Soft pause next time — no stress ✿" });
    if (goals.length > 0)
      r.push({ icon: "✨", main: `${goals.length} savings goal${goals.length > 1 ? "s" : ""} in progress`, sub: "You are amazing!" });
    if (r.length === 0)
      r.push({ icon: "🌸", main: "Start tracking to see your story", sub: "bloom here ✿" });
    return r.slice(0, 3);
  }, [filteredSavings, filteredExpenses, filteredTxns, goals, totalIncome, currency]);

  // Cycle tips
  const CYCLE_TIPS: Partial<Record<string, { emoji: string; headline: string; sub: string; grad: string }>> = {
    luteal:     { emoji: "🌙", headline: "Luteal phase — your inner PMS budget",  sub: "Budget a little extra self-care this week. Cravings are real.",       grad: "from-purple-50 to-pink-50" },
    period:     { emoji: "🌸", headline: "Period week — gentle care first",        sub: "Rest & warmth over everything. You deserve every cent of it.",         grad: "from-pink-50 to-rose-50" },
    follicular: { emoji: "🌱", headline: "Follicular — rising energy mode",        sub: "Great week for big financial decisions. Your mind is clear.",           grad: "from-emerald-50 to-pink-50" },
    ovulation:  { emoji: "✨", headline: "Ovulation peak — full power mode",       sub: "Your best week to tackle financial goals. Go for it.",                 grad: "from-yellow-50 to-pink-50" },
    fertile:    { emoji: "💐", headline: "Fertile window — peak vitality",         sub: "High energy, high clarity. Perfect week to review your budget.",        grad: "from-pink-50 to-purple-50" },
  };

  // Goals carousel (keep names: Income Garden, etc.)
  const clampedGoalIdx = goals.length > 0 ? Math.min(goalIdx, goals.length - 1) : 0;
  const heroGoal       = goals[clampedGoalIdx];
  const heroGoalPct    = heroGoal?.target > 0 ? Math.min(100, (heroGoal.saved / heroGoal.target) * 100) : 0;

  // Meal plan sync hint
  const mealEstimate = useMemo(() => estimateWeeklyGroceryCost(), []);

  // ── ONBOARDING (no income) ──
  if (incomes.length === 0) {
    return (
      <div className="space-y-3 animate-fade-in">
        <Card className="relative overflow-hidden">
          <div className="pointer-events-none absolute -top-12 -right-12 h-48 w-48 rounded-full bg-pink-200/40 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-8 -left-8 h-36 w-36 rounded-full bg-purple-200/30 blur-2xl" />
          <div className="relative">
            <span className="inline-flex items-center gap-1 rounded-full bg-pink-100 px-3 py-1 text-[11px] font-bold tracking-widest text-[#9D5C7E]">
              <Sparkles className="h-3 w-3 text-[#EC4899]" /> WELCOME TO YOUR BUDGET
            </span>
            <h2 className="mt-2 font-script text-3xl sm:text-5xl text-[#831843] leading-tight">Let's bloom your budget ✿</h2>
            <p className="mt-2 text-sm text-[#9D5C7E] max-w-lg leading-relaxed">
              Four gentle steps and you're set. Bloom guides you from your first paycheck to your dream savings goal — no spreadsheets, no stress.
            </p>
            <div className="mt-5 flex items-center gap-3">
              <div className="flex-1 h-2.5 rounded-full bg-pink-100 overflow-hidden">
                <div className="h-full rounded-full transition-all duration-700"
                  style={{ width: `${(completed / steps.length) * 100}%`, background: "linear-gradient(90deg,#C084FC,#EC4899)" }} />
              </div>
              <span className="shrink-0 text-xs font-bold tracking-widest text-[#9D5C7E]">{completed}/{steps.length} done</span>
            </div>
            <div className="mt-6">
              <PrimaryBtn onClick={() => setTab("Incomes")}
                className="bloom-luxury-btn text-sm sm:text-base px-6 py-3 shadow-lg shadow-pink-400/40"
                style={{ animation: 'ctaBreathe 2.8s ease-in-out infinite' }}>
                <Wallet className="h-4 w-4" /> Start — Add your income <ArrowRight className="h-4 w-4" />
              </PrimaryBtn>
            </div>
          </div>
        </Card>
        <Card>
          <h3 className="text-[10px] font-bold tracking-widest text-[#9D5C7E] mb-4 uppercase">Your 4-step path</h3>
          <ol className="space-y-2.5">
            {steps.map((s, i) => {
              const isNext = s === nextStep;
              return (
                <li key={s.key}
                  className={["flex items-center gap-3 rounded-2xl px-4 py-3.5 transition-all duration-300 border-[0.5px]",
                    s.done ? "bg-emerald-50/80 border-emerald-200/60"
                    : isNext ? "bg-gradient-to-r from-pink-50 to-purple-50/50 border-pink-300/60 shadow-sm"
                    : "bg-white/60 border-pink-100/60"].join(" ")}>
                  <div className={["grid h-10 w-10 shrink-0 place-items-center rounded-2xl transition-all duration-300",
                    s.done ? "bg-emerald-500 text-white" : isNext ? "bg-[#EC4899] text-white shadow-md shadow-pink-400/30" : "bg-pink-100 text-[#C4A0CE]"].join(" ")}>
                    {s.done ? <Check className="h-5 w-5" strokeWidth={2.5} /> : <s.Icon className="h-4 w-4" strokeWidth={1.8} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[9px] font-bold tracking-widest text-[#C4A0CE] uppercase">Step {i + 1}</div>
                    <div className={["text-sm font-semibold truncate", s.done ? "text-emerald-700 line-through decoration-emerald-300/60" : "text-[#831843]"].join(" ")}>{s.label}</div>
                    {!s.done && <div className="text-[10px] text-[#9D5C7E] mt-0.5 leading-snug">{s.hint}</div>}
                  </div>
                  {isNext && (
                    <button onClick={() => setTab(s.tab)}
                      className="shrink-0 inline-flex items-center gap-1 rounded-full bg-[#EC4899] px-3 py-1.5 text-xs font-bold text-white shadow-md shadow-pink-400/30 hover:bg-[#DB2777] transition active:scale-95">
                      Go <ArrowRight className="h-3 w-3" />
                    </button>
                  )}
                  {s.done && <span className="shrink-0 text-[11px] font-bold text-emerald-600">✓ Done</span>}
                </li>
              );
            })}
          </ol>
        </Card>
      </div>
    );
  }

  // ── FULL DASHBOARD ──
  const cycleTip = cyclePhase && cyclePhase !== "any" ? CYCLE_TIPS[cyclePhase] : undefined;

  return (
    <div className="space-y-3 sm:space-y-4 animate-fade-in">

      {/* ① HERO — always first */}
      <div className="relative overflow-hidden rounded-[1.75rem] border border-pink-200/60 shadow-xl">
        <img src="/images/budget-hero.png" alt="" className="absolute inset-0 h-full w-full object-cover object-center" />
        <div className="absolute inset-0" style={{ background: "linear-gradient(100deg, rgba(236,72,153,0.90) 0%, rgba(236,72,153,0.68) 50%, rgba(236,72,153,0.20) 80%, transparent 100%)" }} />
        <div className="relative z-10 flex items-center justify-between gap-3 p-4 sm:p-6 lg:p-5 min-h-[130px] sm:min-h-[150px] lg:min-h-[130px]">
          <div className="max-w-[60%]">
            <h2 className="font-script text-3xl sm:text-4xl text-white leading-tight" style={{ textShadow: '0 2px 8px rgba(0,0,0,0.18)' }}>
              You're blooming ✿
            </h2>

            {/* Phase badge — integrates cycle insight directly, no white card */}
            {cycleTip ? (
              <div className="mt-1.5 space-y-0.5">
                <div className="inline-flex items-center gap-1.5">
                  <span className="text-sm leading-none" style={{ filter: 'drop-shadow(0 1px 3px rgba(0,0,0,0.2))' }}>{cycleTip.emoji}</span>
                  <span className="text-[11px] sm:text-xs font-bold text-white tracking-wide" style={{ textShadow: '0 1px 4px rgba(0,0,0,0.25)' }}>{cycleTip.headline}</span>
                </div>
                <p className="text-[10px] sm:text-[11px] text-white/85 italic leading-snug pl-0.5" style={{ textShadow: '0 1px 3px rgba(0,0,0,0.20)' }}>{cycleTip.sub}</p>
              </div>
            ) : (
              <p className="mt-1 text-xs sm:text-sm text-white/90">Your budget. Your dreams. Your future.</p>
            )}

            {/* Week / Month toggle + Currency button */}
            <div className="mt-2.5 flex items-center gap-2">
              <button
                onClick={() => setViewPeriod(v => v === "week" ? "month" : "week")}
                className="inline-flex items-center gap-1.5 rounded-full bg-white/25 backdrop-blur-md border border-white/50 px-3 py-1.5 text-xs text-white font-semibold transition hover:bg-white/35 active:scale-95">
                <Calendar className="h-3 w-3" />
                {viewPeriod === "week" ? "This week" : "This month"}
                <ChevronDown className="h-3 w-3 opacity-70" />
              </button>
              <button
                onClick={onCurrencyClick}
                className="inline-flex items-center gap-1 rounded-full bg-white/25 backdrop-blur-md border border-white/50 px-3 py-1.5 text-xs text-white font-semibold transition hover:bg-white/35 active:scale-95">
                <Coins className="h-3 w-3" />
                {CURRENCIES[currency].symbol}
              </button>
            </div>

            {/* 7-day band — visible in week mode */}
            {viewPeriod === "week" && (
              <div className="flex gap-1 mt-2.5">
                {weekBand.map(d => (
                  <div key={d.iso} className={["flex-1 flex flex-col items-center gap-0.5 py-1.5 rounded-xl transition",
                    d.isToday ? "bg-white/30" : ""].join(" ")}>
                    <span className="text-[9px] font-bold text-white/80 leading-none">{d.label}</span>
                    <span className={["h-1.5 w-1.5 rounded-full", d.spent > 0 ? "bg-white" : "bg-white/30"].join(" ")} />
                    {d.spent > 0 && (
                      <span className="text-[8px] font-bold text-white/90">{CURRENCIES[currency].symbol}{Math.round(d.spent)}</span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
          <MiniRing pct={heroGoalPct} size={110} />
        </div>
      </div>

      {/* ② SPENDING CATEGORIES — right after hero */}
      {catSpend.length > 0 && (
        <Card>
          <div className="flex items-center justify-between mb-3">
            <h3 className="flex items-center gap-1.5 text-sm font-bold text-[#831843]">
              <Sparkles className="h-4 w-4 text-[#EC4899]" strokeWidth={1.6} /> Spending Categories
            </h3>
            <div className="flex items-center gap-2">
              {mealEstimate && !budget["food"] && (
                <button onClick={() => setTab("Budget Setup")}
                  className="inline-flex items-center gap-0.5 text-[10px] font-bold text-[#EC4899] hover:underline">
                  <UtensilsCrossed className="h-3 w-3" /> Sync meals
                </button>
              )}
              <button onClick={() => setTab("Reports")} className="text-xs font-semibold text-[#EC4899] hover:underline inline-flex items-center gap-0.5">
                See all <ChevronRight className="h-3 w-3" />
              </button>
            </div>
          </div>
          <div className="flex gap-4 overflow-x-auto pb-2 no-scrollbar">
            {catSpend.slice(0, 6).map(({ key, cat, amount: amt, pct }) => (
              <div key={key} className="shrink-0 flex flex-col items-center gap-1.5 w-16">
                <div className="grid h-12 w-12 place-items-center rounded-2xl bg-pink-50 border border-pink-100 text-2xl shadow-sm">
                  {cat?.emoji ?? "💰"}
                </div>
                <p className="text-[10px] font-semibold text-[#831843] text-center leading-tight line-clamp-2 w-full">{cat?.label ?? key}</p>
                <p className="text-[11px] font-bold text-[#EC4899]">{fmt(amt, currency)}</p>
                <div className="w-full h-1.5 rounded-full bg-pink-100 overflow-hidden">
                  <div className="h-full rounded-full bg-[#EC4899] transition-all duration-700" style={{ width: `${pct}%` }} />
                </div>
                <p className="text-[9px] text-[#9D5C7E] font-semibold">{pct}%</p>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Smart guide banner */}
      {!allDone && nextStep && (
        <div className="relative overflow-hidden rounded-2xl border border-pink-200/60 bg-gradient-to-r from-pink-50 via-white to-purple-50/40 px-4 py-4 shadow-sm">
          <div className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-pink-200/30 blur-2xl" />
          <div className="relative flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-3 min-w-0">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-[#EC4899] text-white shadow-md shadow-pink-400/30"
                style={{ animation: 'ctaBreathe 2.8s ease-in-out infinite' }}>
                <nextStep.Icon className="h-4 w-4" strokeWidth={1.8} />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-wider text-[#9D5C7E]">Next step · {completed}/{steps.length} done</p>
                <p className="text-sm font-bold text-[#831843] truncate">{nextStep.label}</p>
                <p className="text-[11px] text-[#9D5C7E] leading-snug">{nextStep.hint}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <div className="hidden sm:flex gap-1">
                {steps.map(s => (
                  <div key={s.key} className={["h-2 rounded-full transition-all duration-300",
                    s.done ? "w-2 bg-emerald-400" : s === nextStep ? "w-4 bg-[#EC4899]" : "w-2 bg-pink-200"].join(" ")} />
                ))}
              </div>
              <PrimaryBtn onClick={() => setTab(nextStep.tab)}>
                {nextStep.label} <ArrowRight className="h-3.5 w-3.5" />
              </PrimaryBtn>
            </div>
          </div>
        </div>
      )}
      {allDone && !setupDismissed && (
        <div className="rounded-2xl border border-emerald-200/60 bg-emerald-50/60 px-4 py-3 flex items-center gap-3">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-emerald-500 text-white shadow-sm shrink-0">
            <Check className="h-5 w-5" strokeWidth={2.5} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-emerald-800">Setup complete — you're blooming! 🌸</p>
            <p className="text-[11px] text-emerald-600">Keep logging your daily spends to see your budget shine.</p>
          </div>
          <button
            onClick={() => setSetupDismissed(true)}
            className="grid h-8 w-8 place-items-center rounded-full hover:bg-emerald-100 text-emerald-600 transition shrink-0"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* ③ STAT CARDS — names kept: Income Garden / Spending Petals / Savings Bloom / Dream Balance */}
      <StatCards income={totalIncome} expenses={totalExpenses} savings={totalSavings} balance={totalBalance} currency={currency} />

      {/* ③b BUDGET PLAN — always visible once budget is configured */}
      {(() => {
        const budgetedCats = selectedCats.filter(k => (budget[k] ?? 0) > 0);
        if (budgetedCats.length === 0) return null;
        const visible = budgetedCats.slice(0, 5);
        const extra = budgetedCats.length - visible.length;
        return (
          <Card>
            <div className="flex items-center justify-between mb-3">
              <h3 className="flex items-center gap-1.5 text-sm font-bold text-[#831843]">
                <Receipt className="h-4 w-4 text-[#EC4899]" strokeWidth={1.6} /> Budget Plan
              </h3>
              <button onClick={() => setTab("Budget Setup")} className="text-xs font-semibold text-[#EC4899] hover:underline inline-flex items-center gap-0.5">
                Edit <ChevronRight className="h-3 w-3" />
              </button>
            </div>
            <div className="space-y-2.5">
              {visible.map(k => {
                const cat = allCats.find(c => c.key === k);
                const budgeted = budget[k] ?? 0;
                const spent = monthTxns.filter(t => t.type === "expense" && t.catKey === k).reduce((s, t) => s + t.amount, 0);
                const pct = budgeted > 0 ? Math.min(100, (spent / budgeted) * 100) : 0;
                const barColor = pct >= 90
                  ? "linear-gradient(90deg,#F9A8D4,#EC4899)"
                  : "linear-gradient(90deg,#C084FC,#EC4899)";
                return (
                  <div key={k} className="flex items-center gap-3">
                    <span className="text-lg shrink-0 leading-none">{cat?.emoji ?? "💰"}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-baseline mb-1 gap-2">
                        <span className="text-xs font-semibold text-[#831843] truncate">{cat?.label ?? k}</span>
                        <span className="text-[10px] text-[#9D5C7E] shrink-0 tabular-nums">{fmt(spent, currency)} / {fmt(budgeted, currency)}</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-pink-100 overflow-hidden">
                        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: barColor }} />
                      </div>
                    </div>
                    <span className="text-[10px] font-bold text-[#9D5C7E] shrink-0 w-7 text-right">{Math.round(pct)}%</span>
                  </div>
                );
              })}
            </div>
            {extra > 0 && (
              <button onClick={() => setTab("Budget Setup")} className="mt-2.5 text-xs text-[#EC4899] font-semibold hover:underline">
                +{extra} more {extra === 1 ? "category" : "categories"}
              </button>
            )}
          </Card>
        );
      })()}

      {/* ④ MY DREAM GOALS — 3D carousel on mobile · up-to-3 grid on desktop */}
      {goals.length > 0 ? (
        <>
          {/* ── Mobile 3D coverflow carousel ── */}
          <div
            className="relative lg:hidden"
            style={{ height: 178, perspective: "1200px" }}
            onTouchStart={e => { goalTouchX.current = e.touches[0].clientX; }}
            onTouchEnd={e => {
              if (goalTouchX.current === null) return;
              const delta = e.changedTouches[0].clientX - goalTouchX.current;
              if (Math.abs(delta) > 40) setGoalIdx(p => delta < 0 ? Math.min(goals.length - 1, p + 1) : Math.max(0, p - 1));
              goalTouchX.current = null;
            }}
          >
            {goals.map((goal, i) => {
              let pos = i - clampedGoalIdx;
              if (Math.abs(pos) > 1) return null;
              const isCenter = pos === 0;
              const pct = goal.target > 0 ? Math.min(100, (goal.saved / goal.target) * 100) : 0;
              return (
                <div key={goal.id}
                  onClick={() => !isCenter && setGoalIdx(i)}
                  className="absolute left-1/2 top-1/2 w-[84%] transition-all duration-500 ease-out"
                  style={{
                    transform: `translate(-50%, -50%) translateX(${pos * 90}%) scale(${isCenter ? 1 : 0.83}) rotateY(${pos * -26}deg)`,
                    zIndex: isCenter ? 20 : 10,
                    opacity: isCenter ? 1 : 0.55,
                    transformStyle: "preserve-3d",
                    cursor: isCenter ? "default" : "pointer",
                  }}>
                  <div className="relative overflow-hidden rounded-[1.5rem] shadow-lg"
                    style={{ background: "linear-gradient(135deg, #FF6EB4 0%, #FF99CC 35%, #FFB6D9 65%, #FFD6EC 100%)" }}>
                    <div className="flex items-center justify-between gap-3 p-4">
                      <div className="flex-1 min-w-0">
                        <p className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-widest text-white/80">
                          <Sparkles className="h-2.5 w-2.5" /> Dream Goal
                        </p>
                        <h3 className="font-script text-xl text-white mt-0.5 leading-tight truncate">{goal.name}</h3>
                        <p className="text-xs text-white/90 mt-0.5">{fmt(goal.saved, currency)} / {fmt(goal.target, currency)}</p>
                        <div className="mt-2 h-2 rounded-full bg-white/30 overflow-hidden max-w-[160px]">
                          <div className="h-full rounded-full bg-white transition-all duration-700" style={{ width: `${pct}%` }} />
                        </div>
                        <p className="mt-1 text-[10px] font-bold text-white/90">{Math.round(pct)}% completed</p>
                      </div>
                      <MiniRing pct={pct} size={72} />
                    </div>
                  </div>
                </div>
              );
            })}
            <button onClick={() => setGoalIdx(p => Math.max(0, p - 1))} disabled={clampedGoalIdx === 0}
              className="absolute left-0 top-1/2 z-30 -translate-y-1/2 grid h-8 w-8 place-items-center rounded-full bg-white/60 text-[#9D5C7E] shadow-md backdrop-blur-sm transition disabled:opacity-0 hover:bg-white/90 active:scale-95">
              <ChevronLeft className="h-4 w-4" strokeWidth={2.5} />
            </button>
            <button onClick={() => setGoalIdx(p => Math.min(goals.length - 1, p + 1))} disabled={clampedGoalIdx === goals.length - 1}
              className="absolute right-0 top-1/2 z-30 -translate-y-1/2 grid h-8 w-8 place-items-center rounded-full bg-white/60 text-[#9D5C7E] shadow-md backdrop-blur-sm transition disabled:opacity-0 hover:bg-white/90 active:scale-95">
              <ChevronRight className="h-4 w-4" strokeWidth={2.5} />
            </button>
            {goals.length > 1 && (
              <div className="absolute bottom-1 left-1/2 -translate-x-1/2 flex gap-1.5 z-30">
                {goals.map((_, i) => (
                  <button key={i} onClick={() => setGoalIdx(i)}
                    className={["h-1.5 rounded-full transition-all duration-300 bg-[#EC4899]",
                      i === clampedGoalIdx ? "w-4" : "w-1.5 opacity-40"].join(" ")} />
                ))}
              </div>
            )}
          </div>

          {/* ── Desktop grid: 1 / 2 / 3 columns ── */}
          <div className={["hidden lg:grid gap-4",
            goals.length === 1 ? "lg:grid-cols-1 max-w-md" :
            goals.length === 2 ? "lg:grid-cols-2" : "lg:grid-cols-3"].join(" ")}>
            {goals.map(goal => {
              const pct = goal.target > 0 ? Math.min(100, (goal.saved / goal.target) * 100) : 0;
              return (
                <div key={goal.id} className="relative overflow-hidden rounded-[1.5rem] shadow-lg"
                  style={{ background: "linear-gradient(135deg, #FF6EB4 0%, #FF99CC 35%, #FFB6D9 65%, #FFD6EC 100%)" }}>
                  <div className="flex items-center justify-between gap-3 p-5">
                    <div className="flex-1 min-w-0">
                      <p className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-white/80">
                        <Sparkles className="h-3 w-3" /> Dream Goal
                      </p>
                      <h3 className="font-script text-2xl text-white mt-0.5 leading-tight truncate">{goal.name}</h3>
                      <p className="text-sm text-white/90 mt-0.5">{fmt(goal.saved, currency)} / {fmt(goal.target, currency)}</p>
                      <div className="mt-2.5 h-2 rounded-full bg-white/30 overflow-hidden">
                        <div className="h-full rounded-full bg-white transition-all duration-700" style={{ width: `${pct}%` }} />
                      </div>
                      <p className="mt-1 text-[11px] font-bold text-white/90">{Math.round(pct)}% completed</p>
                    </div>
                    <MiniRing pct={pct} size={80} />
                  </div>
                </div>
              );
            })}
          </div>
        </>
      ) : (
        <Card className="border-dashed border-pink-300/50 text-center py-5 bg-gradient-to-br from-pink-50 to-rose-50">
          <p className="font-script text-2xl text-[#831843]">Add your first dream goal ✿</p>
          <p className="text-xs text-[#9D5C7E] mt-1">A vacation, an emergency fund — dream big</p>
          <PrimaryBtn onClick={() => setTab("Savings Goals")} className="mt-3">
            <Flag className="h-4 w-4" /> Add Goal
          </PrimaryBtn>
        </Card>
      )}


      {/* ⑥ THIS MONTH'S STORY (warm — never red) + INCOME VS EXPENSES */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <h3 className="flex items-center gap-1.5 text-sm font-bold text-[#831843] mb-3">
            <Sparkles className="h-4 w-4 text-[#EC4899]" strokeWidth={1.6} />
            {viewPeriod === "week" ? "This week's story" : "This month's story"}
          </h3>
          <ul className="space-y-3">
            {insights.map((ins, i) => (
              <li key={i} className="flex items-start gap-2.5">
                <span className="text-base leading-none mt-0.5 shrink-0">{ins.icon}</span>
                <div>
                  <p className="text-sm font-semibold text-[#831843] leading-snug">{ins.main}</p>
                  <p className="text-[11px] text-[#9D5C7E]">{ins.sub}</p>
                </div>
              </li>
            ))}
          </ul>
        </Card>

        <Card>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-[#831843]">Income vs Expenses</h3>
            <div className="flex items-center gap-2 text-[10px] text-[#9D5C7E] font-semibold">
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-[#EC4899] inline-block" /> Income</span>
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-[#F9A8D4] inline-block" /> Expenses</span>
            </div>
          </div>
          {totalIncome === 0 && totalExpenses === 0 ? (
            <EmptyState Icon={TrendingUp} text="Add income and log expenses to see comparison." compact />
          ) : (
            <div className="flex items-center gap-4">
              <div className="flex-1 flex items-end gap-3 h-28">
                {(["income", "expenses"] as const).map(type => {
                  const val = type === "income" ? totalIncome : filteredExpenses;
                  const maxVal = Math.max(totalIncome, filteredExpenses, 1);
                  const h = Math.max(8, (val / maxVal) * 100);
                  return (
                    <div key={type} className="flex-1 flex flex-col items-center justify-end gap-1 h-full">
                      <span className="text-[10px] font-bold text-[#831843]">{fmt(val, currency)}</span>
                      <div className="w-full rounded-t-xl transition-all duration-700"
                        style={{ height: `${h}%`, background: type === "income" ? "#EC4899" : "#F9A8D4" }} />
                      <span className="text-[10px] text-[#9D5C7E] font-semibold capitalize">{type}</span>
                    </div>
                  );
                })}
              </div>
              {totalIncome > 0 && (
                <div className="shrink-0 text-center">
                  <HealthRing
                    pct={Math.min(100, (filteredExpenses / totalIncome) * 100)}
                    label=""
                    tone="#EC4899"
                    size={120}
                  />
                  <p className="text-[10px] text-[#9D5C7E] font-semibold -mt-2">of income spent</p>
                </div>
              )}
            </div>
          )}
        </Card>
      </div>

      {/* Detailed log form */}
      {txns.length > 0 && (
        <Card>
          <div className="flex items-center gap-2 mb-4">
            <div className="grid h-8 w-8 place-items-center rounded-xl bg-[#EC4899]/10 text-[#EC4899]">
              <Plus className="h-4 w-4" />
            </div>
            <h3 className="font-script text-2xl text-[#831843]">Log a spend</h3>
          </div>
          <AddTxnForm amount={amount} setAmount={setAmount} catKey={catKey} setCatKey={setCatKey}
            desc={desc} setDesc={setDesc} date={date} setDate={setDate} mood={mood} setMood={setMood}
            catOptions={catOptions} allCats={allCats} currentCat={currentCat} currentMood={currentMood}
            showCatModal={showCatModal} setShowCatModal={setShowCatModal}
            showMoodModal={showMoodModal} setShowMoodModal={setShowMoodModal}
            txnSaved={txnSaved} addTxn={addTxn} currency={currency} />
        </Card>
      )}

      {/* Category picker modal */}
      {showCatModal && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center" onClick={() => setShowCatModal(false)}>
          <div className="relative w-full max-w-sm mx-4 mb-4 sm:mb-0 rounded-[2rem] bg-white border-2 border-pink-200/70 shadow-2xl shadow-pink-300/30 animate-scale-in overflow-hidden flex flex-col max-h-[85vh]" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-pink-100 shrink-0">
              <h3 className="font-script text-2xl text-[#831843]">Category ✿</h3>
              <button onClick={() => setShowCatModal(false)} className="grid h-8 w-8 place-items-center rounded-full bg-pink-50 text-rose/50 hover:text-hotpink transition"><X className="h-4 w-4" /></button>
            </div>
            <div className="px-3 py-3 overflow-y-auto flex-1 min-h-0 space-y-1">
              {catOptions.map(k => {
                const c = allCats.find(x => x.key === k);
                const active = k === catKey;
                return (
                  <button key={k} onClick={() => { setCatKey(k); setShowCatModal(false); }}
                    className={["w-full flex items-center justify-between px-4 py-3 rounded-2xl transition active:scale-[0.98]",
                      active ? "bg-hotpink/10 border border-hotpink/30" : "hover:bg-pink-50 border border-transparent"].join(" ")}>
                    <span className="flex items-center gap-2 text-sm font-semibold text-[#831843]">
                      <span className="text-base">{c?.emoji ?? "💰"}</span>{c?.label ?? k}
                    </span>
                    {active && <Check className="h-4 w-4 text-[#EC4899]" strokeWidth={2.5} />}
                  </button>
                );
              })}
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Mood picker modal */}
      {showMoodModal && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center" onClick={() => setShowMoodModal(false)}>
          <div className="relative w-full max-w-sm mx-4 mb-4 sm:mb-0 rounded-[2rem] bg-white border-2 border-pink-200/70 shadow-2xl shadow-pink-300/30 animate-scale-in overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-pink-100">
              <h3 className="font-script text-2xl text-[#831843]">Spend type ✿</h3>
              <button onClick={() => setShowMoodModal(false)} className="grid h-8 w-8 place-items-center rounded-full bg-pink-50 text-rose/50 hover:text-hotpink transition"><X className="h-4 w-4" /></button>
            </div>
            <div className="px-3 py-3 space-y-1">
              {MOODS.map(m => (
                <button key={m.key} onClick={() => { setMood(m.key); setShowMoodModal(false); }}
                  className={["w-full flex items-center justify-between px-4 py-3 rounded-2xl transition",
                    mood === m.key ? "bg-hotpink/10 border border-hotpink/30" : "hover:bg-pink-50 border border-transparent"].join(" ")}>
                  <span className={["inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-bold border", m.tone].join(" ")}>
                    <m.Icon className="h-3.5 w-3.5" /> {m.label}
                  </span>
                  {mood === m.key && <Check className="h-4 w-4 text-[#EC4899]" strokeWidth={2.5} />}
                </button>
              ))}
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ③ QUICK ADD FAB */}
      <button
        onClick={() => setShowQuickAdd(true)}
        className="fixed bottom-20 right-4 z-30 grid h-14 w-14 place-items-center rounded-full bg-[#EC4899] text-white shadow-xl shadow-pink-400/40 hover:bg-[#DB2777] transition active:scale-95"
        style={{ animation: 'ctaBreathe 2.8s ease-in-out infinite' }}
        aria-label="Quick add expense"
      >
        <Plus className="h-6 w-6" strokeWidth={2.5} />
      </button>

      {/* Quick Add Sheet */}
      <QuickAddSheet
        open={showQuickAdd}
        onClose={() => setShowQuickAdd(false)}
        onSave={(amt, cat) => {
          setTxns(prev => [{ id: uid(), amount: amt, catKey: cat, description: "", date: todayISO(), mood: "planned" as MoodKey, type: "expense" }, ...prev]);
        }}
        allCats={allCats}
        selectedCats={catOptions}
        currency={currency}
      />
    </div>
  );
}

/* Extracted Add Transaction form — used in two places */
function AddTxnForm({ amount, setAmount, catKey, setCatKey, desc, setDesc, date, setDate, mood, setMood,
  catOptions, allCats, currentCat, currentMood, showCatModal, setShowCatModal,
  showMoodModal, setShowMoodModal, txnSaved, addTxn, currency }: {
  amount: string; setAmount: (v: string) => void;
  catKey: string; setCatKey: (v: string) => void;
  desc: string; setDesc: (v: string) => void;
  date: string; setDate: (v: string) => void;
  mood: MoodKey; setMood: (v: MoodKey) => void;
  catOptions: string[]; allCats: Cat[];
  currentCat: Cat | undefined; currentMood: typeof MOODS[number];
  showCatModal: boolean; setShowCatModal: (v: boolean) => void;
  showMoodModal: boolean; setShowMoodModal: (v: boolean) => void;
  txnSaved: boolean; addTxn: () => void; currency: CurrencyKey;
}) {
  return (
    <div className="space-y-3">
      {/* Amount row */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-[#EC4899]">{CURRENCIES[currency].symbol}</span>
          <Input type="number" placeholder="0.00" value={amount} onChange={e => setAmount(e.target.value)}
            className="pl-7 text-lg font-bold" onKeyDown={e => e.key === "Enter" && addTxn()} />
        </div>
        <PinkDatePicker value={date} onChange={setDate} className="w-36 shrink-0" />
      </div>
      {/* Category + Mood */}
      <div className="flex gap-2">
        <button onClick={() => setShowCatModal(true)}
          className="flex-1 flex items-center gap-2 rounded-xl bg-white/80 px-3 py-2 text-sm text-[#831843] border-[0.5px] border-pink-300/40 hover:border-pink-400 transition text-left">
          <span className="text-base">{currentCat?.emoji ?? "💰"}</span>
          <span className="flex-1 truncate font-medium">{currentCat?.label ?? catKey}</span>
          <ChevronDown className="h-3.5 w-3.5 text-[#9D5C7E] shrink-0" />
        </button>
        <button onClick={() => setShowMoodModal(true)}
          className={["flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold border transition shrink-0", currentMood.tone].join(" ")}>
          <currentMood.Icon className="h-3.5 w-3.5" /> {currentMood.label}
          <ChevronDown className="h-3 w-3 opacity-60" />
        </button>
      </div>
      {/* Description */}
      <Input placeholder="What did you spend on? (optional)" value={desc} onChange={e => setDesc(e.target.value)} />
      {/* Save */}
      <div className="flex items-center justify-between pt-1">
        {txnSaved ? (
          <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 animate-fade-in">
            <Check className="h-4 w-4" /> Saved ✿
          </span>
        ) : <span />}
        <PrimaryBtn onClick={addTxn} disabled={!amount || parseFloat(amount) <= 0}>
          <Plus className="h-4 w-4" /> Save spend
        </PrimaryBtn>
      </div>
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
    <div className="space-y-3 sm:space-y-4">
      <div className="flex items-end justify-between gap-3">
        <h2 className="font-script text-3xl sm:text-4xl text-[#831843] flex items-center gap-2"><Wallet className="h-6 w-6 sm:h-7 sm:w-7 text-[#EC4899]" strokeWidth={1.6} /> My Income Sources</h2>
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
                <div className="sm:col-span-4">
                  <PinkSelect value={i.source} onChange={(v) => update(i.id, { source: v })}
                    options={INCOME_SOURCES.map(s => ({ value: s, label: s }))} />
                </div>
                <Input type="number" value={i.amount || ""} onChange={(e) => update(i.id, { amount: parseFloat(e.target.value) || 0 })}
                  placeholder="Amount" className="sm:col-span-3" />
                <div className="sm:col-span-3">
                  <PinkSelect value={i.frequency} onChange={(v) => update(i.id, { frequency: v as Frequency })}
                    options={FREQUENCIES.map(f => ({ value: f, label: f }))} />
                </div>
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
    <div className="space-y-3 sm:space-y-4 lg:space-y-5">
      <h2 className="font-script text-3xl sm:text-4xl text-[#831843] flex items-center gap-2"><Receipt className="h-6 w-6 sm:h-7 sm:w-7 text-[#EC4899]" strokeWidth={1.6} /> Set Up Your Expenses</h2>

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
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
          {allCats.map(c => {
            const on = selectedCats.includes(c.key);
            return (
              <button key={c.key} onClick={() => toggle(c.key)}
                className={[
                  "flex flex-col items-center gap-1 rounded-2xl p-2 sm:p-3 lg:p-2 text-sm font-semibold transition-all duration-200 border-[0.5px]",
                  on ? "bg-[#EC4899] text-white border-transparent shadow-md shadow-pink-400/30 scale-[1.02]"
                     : "bg-white/80 text-[#831843] border-pink-300/40 hover:bg-pink-50",
                ].join(" ")}
              >
                <c.Icon className={`h-5 w-5 sm:h-6 sm:w-6 ${on ? "text-white" : "text-[#EC4899]"}`} strokeWidth={1.6} />
                <span className="text-center leading-tight text-[11px] sm:text-xs">{c.label}</span>
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
            <div className="sm:col-span-3">
              <PinkSelect value={customGroup} onChange={(v) => setCustomGroup(v as Need)}
                options={[{ value: "need", label: "Need" }, { value: "want", label: "Want" }, { value: "savings", label: "Savings" }]} />
            </div>
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
    <div className="space-y-3 sm:space-y-4">
      <div className="flex items-end justify-between gap-3">
        <h2 className="font-script text-3xl sm:text-4xl text-[#831843] flex items-center gap-2"><Flag className="h-6 w-6 sm:h-7 sm:w-7 text-[#EC4899]" strokeWidth={1.6} /> My Goals</h2>
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
    <div className="space-y-3 sm:space-y-4 lg:space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h2 className="font-script text-3xl sm:text-4xl text-[#831843] flex items-center gap-2"><FileBarChart className="h-6 w-6 sm:h-7 sm:w-7 text-[#EC4899]" strokeWidth={1.6} /> My Reports</h2>
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
            <div className="w-32">
              <PinkSelect value={sortBy} onChange={(v) => setSortBy(v as "date" | "amount")}
                options={[{ value: "date", label: "Sort: Date" }, { value: "amount", label: "Sort: Amount" }]} />
            </div>
            <div className="w-36">
              <PinkSelect value={filterCat} onChange={setFilterCat}
                options={[{ value: "", label: "All categories" }, ...allCats.map(c => ({ value: c.key, label: c.label }))]} />
            </div>
            <div className="w-28">
              <PinkSelect value={filterMood} onChange={setFilterMood}
                options={[{ value: "", label: "All moods" }, ...MOODS.map(m => ({ value: m.key, label: m.label }))]} />
            </div>
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
            <div className="sm:col-span-3"><PinkDatePicker value={bDate} onChange={setBDate} className="w-full" /></div>
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