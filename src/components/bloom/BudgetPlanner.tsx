import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  Wallet, TrendingUp, TrendingDown, PiggyBank, Gem, Plus, Trash2,
  ChevronDown, ChevronLeft, ChevronRight, Check, Sparkles, X, Moon,
  Home as HomeIcon, ShoppingCart, GraduationCap, Car, Dumbbell, Zap, Droplets,
  Flame, Smartphone, Pill, Sparkle, Film, Shirt, Plane, Heart, UtensilsCrossed,
  Baby, PawPrint, Package, BookHeart, Target, Briefcase, Banknote,
  Building2, LineChart as LineIcon, Calendar, Download, Filter, ArrowUpRight,
  ArrowDownRight, ArrowRight, CheckCircle2, CircleDot, Coins, Receipt,
  Flag, FileBarChart, AlertTriangle, XCircle, type LucideIcon,
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

const BP_CYCLE_TIPS: Partial<Record<string, { emoji: string; headline: string; sub: string; grad: string }>> = {
  luteal:     { emoji: "🌙", headline: "Luteal phase — your inner PMS budget",  sub: "Budget a little extra self-care this week. Cravings are real.",       grad: "from-purple-50 to-pink-50" },
  period:     { emoji: "🌸", headline: "Period week — gentle care first",        sub: "Rest & warmth over everything. You deserve every cent of it.",         grad: "from-pink-50 to-rose-50" },
  follicular: { emoji: "🌱", headline: "Follicular — rising energy mode",        sub: "Great week for big financial decisions. Your mind is clear.",           grad: "from-emerald-50 to-pink-50" },
  ovulation:  { emoji: "✨", headline: "Ovulation peak — full power mode",       sub: "Your best week to tackle financial goals. Go for it.",                 grad: "from-yellow-50 to-pink-50" },
  fertile:    { emoji: "💐", headline: "Fertile window — peak vitality",         sub: "High energy, high clarity. Perfect week to review your budget.",        grad: "from-pink-50 to-purple-50" },
};

const HERO_CONFIG: Record<string, { title: string; sub: string }> = {
  Dashboard:       { title: "You're blooming",         sub: "Your budget. Your dreams. Your future." },
  Incomes:         { title: "Your income garden 🌱",   sub: "Grow every stream, bloom every month." },
  "Budget Setup":  { title: "Build your plan ✦",       sub: "A clear budget is your map to every dream." },
  "Savings Goals": { title: "Dream big, save smart 💎",sub: "Every dirham saved brings you closer." },
  Reports:         { title: "Know your numbers ✨",     sub: "Clarity is the first step to financial freedom." },
};

const GUIDE_STEPS = [
  {
    key: "income",
    tab: "Incomes" as TabKey,
    selector: "[data-tour='incomes-tab']",
    icon: "🌱",
    title: "Add your income",
    desc: "Your salary, freelance income, or any stream of money — this is where your garden gets its water.",
  },
  {
    key: "budget",
    tab: "Budget Setup" as TabKey,
    selector: "[data-tour='budget-tab']",
    icon: "✦",
    title: "Plan your budget",
    desc: "Pick life categories and set monthly amounts. A clear plan becomes your map to every dream.",
  },
  {
    key: "goals",
    tab: "Savings Goals" as TabKey,
    selector: "[data-tour='goals-tab']",
    icon: "💎",
    title: "Set your dream goals",
    desc: "Give your savings a name — a vacation, an emergency fund, a new chapter of life.",
  },
  {
    key: "spend",
    tab: "Dashboard" as TabKey,
    selector: "[data-tour='spend-fab']",
    icon: "🌸",
    title: "Log extra spends",
    desc: "Whenever you spend outside your plan, tap this button. Your dashboard adapts instantly.",
  },
] as const;

/* ============================================================
   TYPES
============================================================ */
interface Income { id: string; source: string; amount: number; frequency: Frequency; }
interface Budget { [catKey: string]: number; } // monthly amount per selected cat
interface Txn { id: string; date: string; catKey: string; amount: number; description: string; mood: MoodKey; type: "income" | "expense"; }
interface Goal { id: string; name: string; target: number; saved: number; monthly: number; }
interface Bill { id: string; name: string; due: string; amount: number; paid: boolean; }
interface CustomCat { key: string; label: string; emoji: string; group: Need; }
interface MonthPlan {
  incomes: Income[];
  budgetOverride: Record<string, number> | null;
  selectedCatsOverride: string[] | null;
  goalsOverride: Record<string, number> | null;
  activated: boolean;
}

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

function MiniRing({ pct, size = 96 }: { pct: number; size?: number }) {
  const sw = 10;
  const r = size / 2 - sw / 2 - 2;
  const c = 2 * Math.PI * r;
  const dash = `${(pct / 100) * c} ${c}`;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth={sw} />
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="white" strokeWidth={sw}
          strokeDasharray={dash} strokeLinecap="round" className="transition-all duration-700" />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-white">
        <div className="text-2xl font-extrabold leading-none">{Math.round(pct)}%</div>
        <div className="text-[8px] font-semibold opacity-75 leading-tight text-center mt-0.5">reached</div>
      </div>
    </div>
  );
}

function BudgetHistorique({ planned, extraTxns, currency, income }: {
  planned: number;
  extraTxns: { date: string; amount: number }[];
  currency: CurrencyKey;
  income: number;
}) {
  const now = new Date();
  const y = now.getFullYear(), mo = now.getMonth();
  const daysInMonth = new Date(y, mo + 1, 0).getDate();
  const today = now.getDate();
  const pad = (n: number) => String(n).padStart(2, "0");
  const isoDay = (d: number) => `${y}-${pad(mo + 1)}-${pad(d)}`;

  // Daily budget reference line (planned / days in month)
  const dailyBudget = planned / daysInMonth;

  // Spending curve = DAILY extra spends (not cumulative): 0 on no-spend days, amount on spend days
  const dailyByDay = Array.from({ length: daysInMonth }, (_, i) => {
    const iso = isoDay(i + 1);
    return extraTxns.filter(t => t.date === iso).reduce((s, t) => s + t.amount, 0);
  });

  // Fix scale: anchor Y-axis to dailyBudget so the budget line always sits at ~62% height.
  // Clamp curve display to maxY but show the true spend value in the label.
  const maxY = dailyBudget * 1.6;

  // Same compact dimensions as the Income vs Expenses bar chart (h-28 ≈ 112px)
  const W = 280, H = 100, pL = 8, pR = 8, pT = 18, pB = 20;
  const plotW = W - pL - pR, plotH = H - pT - pB;
  const xp = (d: number) => pL + ((d - 1) / Math.max(daysInMonth - 1, 1)) * plotW;
  const yp = (v: number) => pT + plotH - (v / maxY) * plotH;
  const baseline = pT + plotH;

  const smoothPath = (pts: [number, number][], closeFill = false) => {
    if (pts.length < 2) return "";
    let d = `M ${pts[0][0]} ${pts[0][1]}`;
    for (let i = 1; i < pts.length; i++) {
      const p0 = pts[Math.max(0, i - 2)];
      const p1 = pts[i - 1];
      const p2 = pts[i];
      const p3 = pts[Math.min(pts.length - 1, i + 1)];
      const cp1x = p1[0] + (p2[0] - p0[0]) / 6;
      const cp1y = p1[1] + (p2[1] - p0[1]) / 6;
      const cp2x = p2[0] - (p3[0] - p1[0]) / 6;
      const cp2y = p2[1] - (p3[1] - p1[1]) / 6;
      d += ` C ${cp1x.toFixed(2)} ${cp1y.toFixed(2)}, ${cp2x.toFixed(2)} ${cp2y.toFixed(2)}, ${p2[0].toFixed(2)} ${p2[1].toFixed(2)}`;
    }
    if (closeFill) d += ` L ${pts[pts.length - 1][0]} ${baseline} L ${pts[0][0]} ${baseline} Z`;
    return d;
  };

  const todayVal = dailyByDay[today - 1] ?? 0;
  // Clamp display values so spikes don't go off-chart; true value still shown in label
  const realPtsArr: [number, number][] = dailyByDay.slice(0, today).map((v, i) => [xp(i + 1), yp(Math.min(v, maxY))]);
  const todayX = xp(today);
  const todayY = yp(Math.min(todayVal, maxY));

  const budgetY = yp(dailyBudget);
  const isOverBudget = todayVal > dailyBudget;
  const totalMonthlySpend = planned + extraTxns.reduce((s, t) => s + t.amount, 0);
  const isOverIncome = income > 0 && totalMonthlySpend > income;

  // Clamp label X; position label below dot when dot is in upper 55% to avoid overlap with curve
  const todayLabelX = Math.max(pL + 28, Math.min(W - pR - 28, todayX));
  const labelBelow = todayY <= pT + plotH * 0.55;
  const todayLabelY = labelBelow
    ? Math.min(baseline - 4, todayY + 17)
    : Math.max(pT + 8, todayY - 13);

  // Top 3 spend days for labels — drawn last in SVG, never overlap the curve
  const topSpendDays = dailyByDay
    .map((amt, i) => ({ day: i + 1, amt }))
    .filter(d => d.day <= today && d.amt > 0)
    .sort((a, b) => b.amt - a.amt)
    .slice(0, 3)
    .sort((a, b) => a.day - b.day);


  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ height: 150 }} overflow="visible">
        <defs>
          <linearGradient id="shFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#FBCFE8" stopOpacity="0.65" />
            <stop offset="100%" stopColor="#FBCFE8" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="redChartBg" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#FEE2E2" stopOpacity="0.85" />
            <stop offset="100%" stopColor="#FEF2F2" stopOpacity="0.4" />
          </linearGradient>
          <linearGradient id="shLine" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#F9A8D4" />
            <stop offset="100%" stopColor="#EC4899" />
          </linearGradient>
          {/* Vertical gradient for the spend curve: light pink at 0, pink at budget, red above */}
          <linearGradient id="spendLineGrad" x1="0" y1={pT} x2="0" y2={baseline} gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#EF4444" />
            <stop offset={`${((budgetY - pT) / plotH * 100).toFixed(1)}%`} stopColor="#EC4899" />
            <stop offset="100%" stopColor="#FBCFE8" stopOpacity="0.7" />
          </linearGradient>
          {/* Danger gradient for over-budget zone: pink-poppy → red */}
          <linearGradient id="dangerFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#EF4444" stopOpacity="0.55" />
            <stop offset="100%" stopColor="#EC4899" stopOpacity="0.15" />
          </linearGradient>
          {/* Clip path: only the region ABOVE the budget line */}
          <clipPath id="aboveBudgetClip">
            <rect x={pL} y={pT} width={plotW} height={Math.max(0, budgetY - pT)} />
          </clipPath>
          <filter id="shGlow" x="-20%" y="-40%" width="140%" height="180%">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          <filter id="dangerGlow" x="-10%" y="-30%" width="120%" height="160%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>

        {/* red background when spending exceeds income */}
        {isOverIncome && (
          <rect x={0} y={0} width={W} height={H} rx="8" fill="url(#redChartBg)" />
        )}

        {/* subtle horizontal grid */}
        <line x1={pL} y1={yp(maxY * 0.5)} x2={W - pR} y2={yp(maxY * 0.5)} stroke={isOverIncome ? "#FECACA" : "#FCE7F3"} strokeWidth="0.8" />
        <line x1={pL} y1={baseline} x2={W - pR} y2={baseline} stroke={isOverIncome ? "#FECACA" : "#FCE7F3"} strokeWidth="1" />

        {/* today vertical marker */}
        <line x1={todayX} y1={pT} x2={todayX} y2={baseline}
          stroke="#EC4899" strokeWidth="1" strokeDasharray="3 3" opacity="0.35" />

        {/* gradient fill under curve */}
        {realPtsArr.length >= 2 && (
          <path d={smoothPath(realPtsArr, true)} fill="url(#shFill)" />
        )}

        {/* Danger zone fill — above budget line, below the spending curve */}
        {realPtsArr.length >= 2 && isOverBudget && (
          <path d={smoothPath(realPtsArr, true)} fill="url(#dangerFill)"
            clipPath="url(#aboveBudgetClip)" filter="url(#dangerGlow)" />
        )}

        {/* budget reference line — dashed (line only, label drawn last so it's always on top) */}
        <line x1={pL} y1={budgetY} x2={W - pR} y2={budgetY}
          stroke={isOverBudget ? "#F87171" : "#F9A8D4"} strokeWidth="2" strokeDasharray="6 4" />

        {/* spending curve — gradient: light pink at 0, pink at budget, red above */}
        {realPtsArr.length >= 2 && (
          <path d={smoothPath(realPtsArr)} fill="none"
            stroke="url(#spendLineGrad)"
            strokeWidth="3" strokeLinecap="round" filter="url(#shGlow)" />
        )}

        {/* today dot — prominent */}
        {realPtsArr.length > 0 && (
          <>
            <circle cx={todayX} cy={todayY} r="9" fill="#EC4899" opacity="0.12" />
            <circle cx={todayX} cy={todayY} r="5.5" fill="#EC4899" opacity="0.25" />
            <circle cx={todayX} cy={todayY} r="4" fill="#EC4899" stroke="white" strokeWidth="2" />
          </>
        )}


        {/* Top spend-day labels — pinned in top-padding zone, guaranteed above curve */}
        {topSpendDays.map((d, i) => {
          const cx = Math.max(pL + 28, Math.min(W - pR - 28, xp(d.day)));
          const dotY = yp(Math.min(d.amt, maxY));
          const isToday = d.day === today;
          const labelY = 6 + (i % 2) * 8;
          return (
            <g key={d.day}>
              {!isToday && (
                <>
                  <line x1={cx} y1={dotY - 3} x2={cx} y2={labelY + 2}
                    stroke="#EF4444" strokeWidth="0.75" strokeDasharray="2 2" opacity="0.45" />
                  <circle cx={cx} cy={dotY} r="2.5" fill="#EF4444" opacity="0.7" />
                </>
              )}
              <text x={cx} y={labelY} fontSize="6.5" fill="#EF4444"
                textAnchor="middle" fontWeight="700">{fmt(d.amt, currency)}</text>
            </g>
          );
        })}

        {/* Today value label */}
        {realPtsArr.length > 0 && (
          <>
            <rect x={todayLabelX - 32} y={todayLabelY - 8.5} width={64} height={11} rx="3" fill="white" fillOpacity="0.95" />
            <text x={todayLabelX} y={todayLabelY} fontSize="7.5" fill={isOverIncome ? "#EF4444" : "#EC4899"}
              textAnchor="middle" fontWeight="700">{fmt(todayVal, currency)}</text>
          </>
        )}

        {/* X axis labels */}
        <text x={xp(1)} y={H - 3} fontSize="8" fill="#C4A0B8" textAnchor="middle">1</text>
        {/* "Today" label at today's x position */}
        <text x={todayX} y={H - 3} fontSize="8" fill="#EC4899" textAnchor="middle" fontWeight="700">
          {today}
        </text>
        <text x={xp(daysInMonth)} y={H - 3} fontSize="8" fill="#C4A0B8" textAnchor="middle">
          {daysInMonth}
        </text>
      </svg>

      {/* legend */}
      <div className="flex items-center gap-4 mt-1.5 px-1">
        <div className="flex items-center gap-1.5">
          <svg width="18" height="8"><line x1="0" y1="4" x2="18" y2="4" stroke="#F9A8D4" strokeWidth="2" strokeDasharray="6 4" /></svg>
          <span className={`text-[10px] font-semibold ${isOverBudget ? "text-rose-500" : "text-[#9D5C7E]"}`}>
            Budget · {fmt(planned, currency)}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <svg width="18" height="8"><line x1="0" y1="4" x2="18" y2="4" stroke="#EC4899" strokeWidth="2.5" /></svg>
          <span className="text-[10px] font-semibold text-[#9D5C7E]">Spending</span>
        </div>
        <div className="flex items-center gap-1.5 ml-auto">
          <svg width="10" height="10"><circle cx="5" cy="5" r="4" fill="#EC4899" /></svg>
          <span className="text-[10px] font-semibold text-[#EC4899]">Today ({today})</span>
        </div>
      </div>

    </div>
  );
}

/* ============================================================
   MONTHLY PATTERNS CHART — 6-month bar chart with income line
============================================================ */
function MonthlyPatternsChart({ txns, plannedBudget, income, currency }: {
  txns: Txn[];
  plannedBudget: number;
  income: number;
  currency: CurrencyKey;
}) {
  const now = new Date();
  const months = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
    return { y: d.getFullYear(), m: d.getMonth(), label: d.toLocaleString("default", { month: "short" }), isCurrent: i === 5 };
  });

  const monthData = months.map(mo => {
    const extra = txns.filter(t => {
      const d = new Date(t.date);
      return t.type === "expense" && d.getFullYear() === mo.y && d.getMonth() === mo.m;
    }).reduce((s, t) => s + t.amount, 0);
    const totalSpend = plannedBudget + extra;
    return { ...mo, extra, totalSpend, isOver: income > 0 && totalSpend > income };
  });

  const W = 300, H = 110, pL = 8, pR = 8, pT = 28, pB = 20;
  const plotW = W - pL - pR, plotH = H - pT - pB;
  const maxVal = Math.max(income * 1.1, ...monthData.map(d => d.totalSpend), 1);
  const slotW = plotW / 6;
  const barW = Math.max(10, Math.floor(slotW * 0.52));
  const yp = (v: number) => pT + plotH - (v / maxVal) * plotH;
  const incomeY = income > 0 ? yp(income) : null;
  const plannedY = plannedBudget > 0 ? yp(plannedBudget) : null;

  // Smooth line connecting monthly totals
  const linePts: [number, number][] = monthData
    .filter(mo => mo.totalSpend > 0 || mo.isCurrent)
    .map((mo, _, arr) => {
      const i = months.findIndex(m => m.y === mo.y && m.m === mo.m);
      return [pL + i * slotW + slotW / 2, yp(mo.totalSpend)] as [number, number];
    });

  const smoothLine = (pts: [number, number][]) => {
    if (pts.length < 2) return "";
    let d = `M ${pts[0][0]} ${pts[0][1]}`;
    for (let i = 1; i < pts.length; i++) {
      const p0 = pts[Math.max(0, i - 2)], p1 = pts[i - 1], p2 = pts[i], p3 = pts[Math.min(pts.length - 1, i + 1)];
      const cp1x = p1[0] + (p2[0] - p0[0]) / 6, cp1y = p1[1] + (p2[1] - p0[1]) / 6;
      const cp2x = p2[0] - (p3[0] - p1[0]) / 6, cp2y = p2[1] - (p3[1] - p1[1]) / 6;
      d += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p2[0].toFixed(1)} ${p2[1].toFixed(1)}`;
    }
    return d;
  };

  return (
    <div className="animate-fade-in">
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ height: 145 }} overflow="visible">
        <defs>
          <linearGradient id="mpBarNorm" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#EC4899" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#F9A8D4" stopOpacity="0.35" />
          </linearGradient>
          <linearGradient id="mpBarOver" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#EF4444" stopOpacity="0.85" />
            <stop offset="100%" stopColor="#FCA5A5" stopOpacity="0.35" />
          </linearGradient>
          <filter id="mpGlow" x="-20%" y="-40%" width="140%" height="180%">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>

        {/* grid baseline */}
        <line x1={pL} y1={pT + plotH} x2={W - pR} y2={pT + plotH} stroke="#FCE7F3" strokeWidth="1" />

        {/* planned budget line */}
        {plannedY !== null && (
          <line x1={pL} y1={plannedY} x2={W - pR} y2={plannedY}
            stroke="#EC4899" strokeWidth="1" strokeDasharray="5 3" opacity="0.35" />
        )}

        {/* income line (line only — label drawn last) */}
        {incomeY !== null && (
          <line x1={pL} y1={incomeY} x2={W - pR} y2={incomeY}
            stroke="#10B981" strokeWidth="1.5" strokeDasharray="4 3" opacity="0.75" />
        )}

        {/* bars — rect only, labels drawn after trend line */}
        {monthData.map((mo, i) => {
          const barH = Math.max(2, (mo.totalSpend / maxVal) * plotH);
          const barX = pL + i * slotW + (slotW - barW) / 2;
          const barY = pT + plotH - barH;
          const cx = barX + barW / 2;
          return (
            <rect key={i} x={barX} y={barY} width={barW} height={barH} rx="3"
              fill={mo.isOver ? "url(#mpBarOver)" : "url(#mpBarNorm)"}
              style={{ opacity: mo.isCurrent ? 1 : 0.55 }}
              className="transition-all duration-500" />
          );
        })}

        {/* smooth trend line */}
        {linePts.length >= 2 && (
          <path d={smoothLine(linePts)} fill="none"
            stroke="#EC4899" strokeWidth="2" strokeLinecap="round" opacity="0.6"
            filter="url(#mpGlow)" />
        )}

        {/* dots on trend line */}
        {linePts.map(([x, y], i) => {
          const mo = monthData.filter(mo => mo.totalSpend > 0 || mo.isCurrent)[i];
          if (!mo) return null;
          return (
            <circle key={i} cx={x} cy={y} r={mo?.isCurrent ? 4.5 : 3}
              fill={mo?.isOver ? "#EF4444" : "#EC4899"}
              stroke="white" strokeWidth="1.5" style={{ opacity: mo?.isCurrent ? 1 : 0.6 }} />
          );
        })}

        {/* ALL text labels last — always rendered above bars, trend line, and dots */}
        {/* Income text */}
        {incomeY !== null && (
          <>
            <rect x={pL} y={incomeY - 11} width={36} height={10} rx="2.5" fill="white" fillOpacity="0.92" />
            <text x={pL + 2} y={incomeY - 3} fontSize="6.5" fill="#10B981" fontWeight="700">Income</text>
          </>
        )}
        {/* Bar value labels + month labels */}
        {monthData.map((mo, i) => {
          const barH = Math.max(2, (mo.totalSpend / maxVal) * plotH);
          const barX = pL + i * slotW + (slotW - barW) / 2;
          const barY = pT + plotH - barH;
          const cx = barX + barW / 2;
          const labelCx = Math.max(pL + 30, Math.min(W - pR - 30, cx));
          const showLabel = mo.isCurrent || mo.isOver;
          const labelY = Math.max(pT + 9, barY - 4);
          return (
            <g key={i} style={{ opacity: mo.isCurrent ? 1 : 0.55 }}>
              {showLabel && mo.totalSpend > 0 && (
                <>
                  <rect x={labelCx - 30} y={labelY - 8.5} width={60} height={10.5} rx="3" fill="white" fillOpacity="0.95" />
                  <text x={labelCx} y={labelY} fontSize="6.5" textAnchor="middle" fontWeight="700"
                    fill={mo.isOver ? "#EF4444" : "#EC4899"}>{fmt(mo.totalSpend, currency)}</text>
                </>
              )}
              <text x={cx} y={H - 3} fontSize="7.5" textAnchor="middle"
                fill={mo.isCurrent ? "#EC4899" : "#C4A0B8"}
                fontWeight={mo.isCurrent ? "700" : "400"}>{mo.label}</text>
            </g>
          );
        })}
      </svg>

      {/* legend */}
      <div className="flex items-center gap-4 mt-1 px-1">
        <div className="flex items-center gap-1.5">
          <div className="h-2.5 w-4 rounded-sm" style={{ background: "linear-gradient(to right, #EC4899, #F9A8D4)" }} />
          <span className="text-[10px] font-semibold text-[#9D5C7E]">Total spend</span>
        </div>
        {income > 0 && (
          <div className="flex items-center gap-1.5">
            <svg width="16" height="6"><line x1="0" y1="3" x2="16" y2="3" stroke="#10B981" strokeWidth="1.5" strokeDasharray="4 3" /></svg>
            <span className="text-[10px] font-semibold text-[#9D5C7E]">Income</span>
          </div>
        )}
        {plannedBudget > 0 && (
          <div className="flex items-center gap-1.5">
            <svg width="16" height="6"><line x1="0" y1="3" x2="16" y2="3" stroke="#EC4899" strokeWidth="1" strokeDasharray="5 3" opacity="0.5" /></svg>
            <span className="text-[10px] font-semibold text-[#9D5C7E]">Planned</span>
          </div>
        )}
        <span className="ml-auto text-[9px] text-[#C4A0B8]">approx · current plan</span>
      </div>
    </div>
  );
}

function BudgetSummaryChart({ totalPlanned, totalOverage, currency, income }: {
  totalPlanned: number;
  totalOverage: number;
  currency: CurrencyKey;
  income: number;
}) {
  const R = 44, ri = 22, cx = 56, cy = 56;
  const hasExtra = totalOverage > 0;
  const total = totalPlanned + totalOverage;
  const isOverIncome = income > 0 && total > income;
  const plannedSweep = hasExtra ? (totalPlanned / total) * Math.PI * 2 : Math.PI * 2 - 0.001;
  const extraSweep   = hasExtra ? (totalOverage / total) * Math.PI * 2 : 0;
  const a0 = -Math.PI / 2;

  const arcPath = (start: number, sweep: number) => {
    const end = start + sweep;
    const f = (n: number) => n.toFixed(1);
    const x1 = cx + R  * Math.cos(start),  y1 = cy + R  * Math.sin(start);
    const x2 = cx + R  * Math.cos(end),    y2 = cy + R  * Math.sin(end);
    const ix1= cx + ri * Math.cos(start),  iy1= cy + ri * Math.sin(start);
    const ix2= cx + ri * Math.cos(end),    iy2= cy + ri * Math.sin(end);
    const la = sweep > Math.PI ? 1 : 0;
    return `M ${f(ix1)} ${f(iy1)} L ${f(x1)} ${f(y1)} A ${R} ${R} 0 ${la} 1 ${f(x2)} ${f(y2)} L ${f(ix2)} ${f(iy2)} A ${ri} ${ri} 0 ${la} 0 ${f(ix1)} ${f(iy1)} Z`;
  };

  const plannedColor = isOverIncome ? "#EF4444" : "#EC4899";
  const extraColor   = isOverIncome ? "#F87171" : "#F9A8D4";

  return (
    <div className="flex flex-col items-center gap-3">
      <svg viewBox="0 0 112 112" width="108" height="108">
        {/* planned slice */}
        <path d={arcPath(a0, plannedSweep)} fill={plannedColor} stroke="white" strokeWidth="1.5" />
        {/* extra slice */}
        {hasExtra && (
          <path d={arcPath(a0 + plannedSweep, extraSweep)} fill={extraColor} stroke="white" strokeWidth="1.5" />
        )}
        {/* center label */}
        {isOverIncome ? (
          <>
            <text x={cx} y={cy - 5} textAnchor="middle" fontSize="7.5" fill="#EF4444" fontWeight="700">
              −{fmt(Math.abs(income - total), currency)}
            </text>
            <text x={cx} y={cy + 7} textAnchor="middle" fontSize="5.5" fill="#EF4444">over income ⚠</text>
          </>
        ) : hasExtra ? (
          <>
            <text x={cx} y={cy - 5} textAnchor="middle" fontSize="7.5" fill="#EC4899" fontWeight="700">
              +{fmt(totalOverage, currency)}
            </text>
            <text x={cx} y={cy + 7} textAnchor="middle" fontSize="5.5" fill="#9D5C7E">over budget</text>
          </>
        ) : (
          <>
            <text x={cx} y={cy - 5} textAnchor="middle" fontSize="7.5" fill="#831843" fontWeight="700">
              {fmt(totalPlanned, currency)}
            </text>
            <text x={cx} y={cy + 7} textAnchor="middle" fontSize="5.5" fill="#9D5C7E">on budget ✓</text>
          </>
        )}
      </svg>
      <div className="flex gap-8 justify-center">
        <div className="text-center">
          <div className="flex items-center justify-center gap-1.5 mb-0.5">
            <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ background: plannedColor }} />
            <span className={`text-[9px] font-bold tracking-widest ${isOverIncome ? "text-red-600" : "text-[#9D5C7E]"}`}>PLANNED</span>
          </div>
          <p className={`text-lg font-bold tabular-nums leading-none ${isOverIncome ? "text-red-600" : "text-[#EC4899]"}`}>{fmt(totalPlanned, currency)}</p>
        </div>
        <div className="text-center">
          <div className="flex items-center justify-center gap-1.5 mb-0.5">
            <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ background: extraColor }} />
            <span className={`text-[9px] font-bold tracking-widest ${isOverIncome ? "text-red-600" : "text-[#9D5C7E]"}`}>EXTRA</span>
          </div>
          <p className={`text-lg font-bold tabular-nums leading-none ${isOverIncome ? "text-red-500" : "text-[#F472B6]"}`}>
            {hasExtra ? `+${fmt(totalOverage, currency)}` : "—"}
          </p>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   ONBOARDING GUIDE
============================================================ */
function OnboardingGuide({ onDone, setTab }: {
  onDone: () => void;
  setTab: (t: TabKey) => void;
}) {
  const [phase, setPhase] = useState<"welcome" | "steps" | "finishing">("welcome");
  const [stepIdx, setStepIdx] = useState(0);
  const [spotRect, setSpotRect] = useState<DOMRect | null>(null);
  const [timerPct, setTimerPct] = useState(0);
  const [fadeIn, setFadeIn] = useState(false);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const autoRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stepIdxRef = useRef(stepIdx);
  stepIdxRef.current = stepIdx;

  const clearTimers = () => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    if (autoRef.current) { clearTimeout(autoRef.current); autoRef.current = null; }
  };

  useEffect(() => {
    const t = setTimeout(() => setFadeIn(true), 60);
    return () => clearTimeout(t);
  }, []);

  const particles = useMemo(() => Array.from({ length: 22 }, (_, i) => ({
    x: 3 + ((i * 19 + 7) % 94),
    y: ((i * 29 + 11) % 100),
    size: 3 + (i % 6),
    dur: 2.5 + (i % 4) * 0.85,
    delay: (i * 0.33) % 3.3,
    color: i % 4 === 0 ? '#EC4899' : i % 4 === 1 ? '#F9A8D4' : i % 4 === 2 ? '#C084FC' : 'rgba(255,255,255,0.55)',
  })), []);

  const finish = () => {
    clearTimers();
    setPhase("finishing");
    setTimeout(() => onDone(), 1300);
  };

  const advanceRef = useRef<() => void>(() => {});
  advanceRef.current = () => {
    clearTimers();
    if (stepIdxRef.current < GUIDE_STEPS.length - 1) {
      setStepIdx(stepIdxRef.current + 1);
    } else {
      finish();
    }
  };
  const advance = () => advanceRef.current();

  // Welcome: auto-advance after 5.5s
  useEffect(() => {
    if (phase !== "welcome") return;
    setTimerPct(0);
    const total = 5500, tick = 50;
    timerRef.current = setInterval(() => setTimerPct(p => Math.min(100, p + 100 / (total / tick))), tick);
    autoRef.current = setTimeout(() => { clearTimers(); setPhase("steps"); }, total);
    return clearTimers;
  }, [phase]);

  // Steps: switch tab → find element → spotlight + timer
  useEffect(() => {
    if (phase !== "steps") return;
    const s = GUIDE_STEPS[stepIdx];
    setTab(s.tab);
    setSpotRect(null);
    setTimerPct(0);
    clearTimers();

    const findTimeout = setTimeout(() => {
      const el = document.querySelector(s.selector);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
        setTimeout(() => {
          setSpotRect(el.getBoundingClientRect());
          const dur = 5000;
          timerRef.current = setInterval(() => setTimerPct(p => Math.min(100, p + 100 / (dur / 50))), 50);
          autoRef.current = setTimeout(() => advanceRef.current(), dur);
        }, 350);
      }
    }, 420);

    return () => { clearTimeout(findTimeout); clearTimers(); };
  }, [phase, stepIdx]); // eslint-disable-line

  const currentStep = GUIDE_STEPS[stepIdx];

  const tooltipPos = useMemo(() => {
    if (!spotRect) return null;
    const vp = { w: window.innerWidth, h: window.innerHeight };
    const cardW = Math.min(vp.w * 0.88, 340);
    const cardH = 195;
    let top: number, left: number;
    left = Math.max(12, Math.min(spotRect.left + spotRect.width / 2 - cardW / 2, vp.w - cardW - 12));
    const belowTop = spotRect.bottom + 14;
    const aboveTop = spotRect.top - cardH - 14;
    if (belowTop + cardH < vp.h - 12) {
      top = belowTop;
    } else if (aboveTop > 56) {
      top = aboveTop;
    } else {
      top = vp.h / 2 - cardH / 2;
      if (spotRect.left > vp.w / 2) left = 12;
    }
    return { top, left, width: cardW };
  }, [spotRect]);

  return createPortal(
    <>
      {/* ── WELCOME ── */}
      {phase === "welcome" && (
        <div className="fixed inset-0 z-[10000] flex flex-col items-center justify-center overflow-hidden select-none"
          style={{ background: 'radial-gradient(ellipse at 50% -8%, #C084FC 0%, #831843 35%, #480a28 65%, #0d0110 100%)' }}>

          {/* Ambient glow orb */}
          <div className="absolute pointer-events-none" style={{
            width: 480, height: 480,
            background: 'radial-gradient(circle, rgba(236,72,153,0.38) 0%, transparent 70%)',
            filter: 'blur(35px)',
            top: '50%', left: '50%',
            transform: 'translate(-50%,-50%)',
            animation: 'guideOrb 4s ease-in-out infinite alternate',
          }} />

          {/* Floating particles */}
          {particles.map((p, i) => (
            <div key={i} className="absolute rounded-full pointer-events-none" style={{
              width: p.size, height: p.size,
              background: p.color,
              opacity: 0.22,
              left: `${p.x}%`, top: `${p.y}%`,
              animation: `tourFloat ${p.dur}s ease-in-out ${p.delay}s infinite alternate`,
              filter: p.size > 5 ? 'blur(1px)' : 'none',
            }} />
          ))}

          {/* Content */}
          <div className={`relative z-10 flex flex-col items-center text-center px-8 max-w-sm transition-all duration-1000 ease-out ${fadeIn ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>

            <div className="text-[9px] font-bold tracking-[0.5em] text-white/30 uppercase mb-6">✦ bloomzein budget ✦</div>

            <h1 className="font-script leading-none mb-3" style={{
              fontSize: 'clamp(3.5rem,14vw,5.5rem)',
              color: 'white',
              textShadow: '0 0 55px rgba(236,72,153,1), 0 0 110px rgba(192,132,252,0.55), 0 2px 14px rgba(0,0,0,0.45)',
            }}>
              Welcome
            </h1>

            <p className="text-white/60 text-[13px] font-light leading-relaxed max-w-[250px] mb-9 italic"
              style={{ animation: 'fadeInUp 0.7s ease-out 0.5s both' }}>
              In 4 steps, your budget will be alive and blooming
            </p>

            {/* 4-step preview icons */}
            <div className="flex gap-4 mb-10">
              {GUIDE_STEPS.map((s, i) => (
                <div key={s.key} className="flex flex-col items-center gap-2"
                  style={{ animation: `fadeInUp 0.5s ease-out ${0.65 + i * 0.12}s both` }}>
                  <div className="flex items-center justify-center rounded-2xl border border-white/12"
                    style={{ width: 46, height: 46, fontSize: '1.3rem', background: 'rgba(255,255,255,0.07)', backdropFilter: 'blur(10px)', boxShadow: '0 4px 16px rgba(0,0,0,0.32), inset 0 1px 0 rgba(255,255,255,0.08)' }}>
                    {s.icon}
                  </div>
                  <span className="text-white/30 text-[9px] font-bold tracking-widest">{i + 1}</span>
                </div>
              ))}
            </div>

            {/* CTA */}
            <button
              onClick={() => { clearTimers(); setPhase("steps"); }}
              className="flex items-center gap-2 px-8 py-3.5 rounded-full text-white font-bold text-[15px] active:scale-95 transition-transform"
              style={{
                background: 'linear-gradient(135deg, #BE185D 0%, #EC4899 55%, #F472B6 100%)',
                boxShadow: '0 8px 32px rgba(236,72,153,0.58), 0 0 0 1px rgba(255,255,255,0.08)',
                animation: 'ctaBreathe 2.5s ease-in-out infinite',
              }}>
              Begin your journey
              <ArrowRight className="h-4 w-4 shrink-0" strokeWidth={2.5} />
            </button>

            {/* Auto-timer bar */}
            <div className="mt-6 w-32">
              <div className="h-[2px] bg-white/10 rounded-full overflow-hidden">
                <div className="h-full bg-white/28 rounded-full" style={{ width: `${timerPct}%`, transition: 'none' }} />
              </div>
              <p className="text-white/18 text-[10px] text-center mt-1.5">starting automatically…</p>
            </div>

            <button onClick={finish} className="mt-4 text-white/18 text-[11px] hover:text-white/45 transition-colors font-light">
              skip guide
            </button>
          </div>
        </div>
      )}

      {/* ── STEPS ── */}
      {phase === "steps" && (
        <>
          {/* Transparent click-catcher — advances on tap anywhere outside the tooltip */}
          <div className="fixed inset-0 cursor-pointer" style={{ zIndex: 9998 }} onClick={advance} />

          {/* Spotlight ring — box-shadow creates the dark overlay; interior is transparent so the button shows through */}
          {spotRect && (
            <div className="fixed pointer-events-none" style={{
              zIndex: 10001,
              top: spotRect.top - 10,
              left: spotRect.left - 10,
              width: spotRect.width + 20,
              height: spotRect.height + 20,
              borderRadius: Math.min(spotRect.height * 0.55, 24),
              border: '3px solid rgba(236,72,153,1)',
              animation: 'spotPulse 2s ease-in-out infinite',
            }} />
          )}

          {/* Tooltip card */}
          {tooltipPos && (
            <div className="fixed" style={{ zIndex: 10002, top: tooltipPos.top, left: tooltipPos.left, width: tooltipPos.width }}>
              <div className="rounded-[1.5rem] border border-pink-200/40 p-5" style={{
                background: 'rgba(255,255,255,0.97)',
                backdropFilter: 'blur(24px)',
                boxShadow: '0 24px 64px rgba(0,0,0,0.48), 0 0 0 1px rgba(236,72,153,0.07)',
                animation: 'guideCardIn 0.38s cubic-bezier(0.34,1.56,0.64,1) both',
              }}>

                {/* Step counter + progress dots */}
                <div className="flex items-center justify-between mb-4">
                  <span className="text-[10px] font-black tracking-[0.3em] text-[#9D5C7E]">
                    STEP {stepIdx + 1} / {GUIDE_STEPS.length}
                  </span>
                  <div className="flex gap-1.5 items-center">
                    {GUIDE_STEPS.map((_, i) => (
                      <div key={i} className="rounded-full" style={{
                        width: i === stepIdx ? 18 : 6,
                        height: 6,
                        background: i <= stepIdx ? '#EC4899' : '#FCE7F3',
                        transition: 'all 0.35s ease',
                      }} />
                    ))}
                  </div>
                </div>

                {/* Icon + text */}
                <div className="flex gap-3 items-start mb-4">
                  <div className="shrink-0 w-10 h-10 rounded-xl flex items-center justify-center text-xl border" style={{ background: 'linear-gradient(135deg,#FDF2F8,#FCE7F3)', borderColor: 'rgba(236,72,153,0.15)' }}>
                    {currentStep.icon}
                  </div>
                  <div>
                    <h3 className="font-bold text-[#831843] text-[14px] leading-tight mb-1">{currentStep.title}</h3>
                    <p className="text-[#9D5C7E] text-[12px] leading-relaxed">{currentStep.desc}</p>
                  </div>
                </div>

                {/* Timer bar */}
                <div className="h-[3px] bg-pink-100 rounded-full overflow-hidden mb-4">
                  <div className="h-full rounded-full" style={{ background: 'linear-gradient(90deg,#BE185D,#EC4899,#F472B6)', width: `${timerPct}%`, transition: 'none' }} />
                </div>

                {/* Buttons */}
                <div className="flex items-center justify-between">
                  <button onClick={finish} className="text-[#C4B0BE] text-[11px] hover:text-[#9D5C7E] transition-colors px-1 py-1">
                    skip guide
                  </button>
                  <button onClick={advance}
                    className="flex items-center gap-1.5 px-5 py-2.5 rounded-full text-white text-[13px] font-bold active:scale-95 transition-transform"
                    style={{ background: 'linear-gradient(135deg,#BE185D 0%,#EC4899 100%)', boxShadow: '0 4px 16px rgba(236,72,153,0.42)' }}>
                    {stepIdx < GUIDE_STEPS.length - 1 ? (
                      <><span>Next</span><ArrowRight className="h-3.5 w-3.5" /></>
                    ) : (
                      <><Sparkles className="h-3.5 w-3.5" /><span>Start blooming</span></>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* ── FINISHING ── */}
      {phase === "finishing" && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center" style={{ background: 'radial-gradient(ellipse at center, #831843 0%, #0d0110 100%)', animation: 'guideFadeOut 1.3s ease-in-out forwards' }}>
          <div className="text-center" style={{ animation: 'fadeInUp 0.5s ease-out both' }}>
            <div className="text-6xl mb-4">🌸</div>
            <h2 className="font-script text-5xl text-white mb-2" style={{ textShadow: '0 0 35px rgba(236,72,153,0.85)' }}>
              You&apos;re all set!
            </h2>
            <p className="text-white/50 text-sm">Your financial garden is ready to bloom.</p>
          </div>
        </div>
      )}
    </>,
    document.body
  );
}

/* ============================================================
   MAIN COMPONENT
============================================================ */
export function BudgetPlanner() {
  const [onboarded, setOnboarded] = useLocal<boolean>("bp:onboarded", false);
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
  const [months, setMonths] = useLocal<Record<string, MonthPlan>>("bp:months", {});
  const [showExtraSpend, setShowExtraSpend] = useState(false);
  const [showMonthPicker, setShowMonthPicker] = useState(false);

  // Month navigation (global — affects all tabs)
  const _now = new Date();
  const [month, setMonth] = useState({ y: _now.getFullYear(), m: _now.getMonth() });
  const monthKey = `${month.y}-${String(month.m + 1).padStart(2, "0")}`;
  const nowKey   = `${_now.getFullYear()}-${String(_now.getMonth() + 1).padStart(2, "0")}`;
  const viewMode: "past" | "present" | "future" =
    monthKey < nowKey ? "past" : monthKey > nowKey ? "future" : "present";
  const monthPlan  = months[monthKey];
  const isPlanning = viewMode === "future" && !monthPlan?.activated;

  // Progressive: find last consecutive planned month, next available = +1
  const nextPlannableKey = (() => {
    let last = { y: _now.getFullYear(), m: _now.getMonth() };
    for (let i = 1; i <= 24; i++) {
      const d = new Date(_now.getFullYear(), _now.getMonth() + i, 1);
      const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      if (months[k]?.activated) last = { y: d.getFullYear(), m: d.getMonth() };
      else break;
    }
    const d = new Date(last.y, last.m + 1, 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  })();

  // Reset a planned month + all consecutive planned months after it
  function resetPlannedMonth(fromKey: string) {
    setMonths(prev => {
      const updated = { ...prev };
      Object.keys(updated).forEach(k => { if (k >= fromKey) delete updated[k]; });
      return updated;
    });
  }

  // Second source of truth — no overlap with base plan
  const viewIncomes      = viewMode === "present" ? incomes      : (monthPlan?.incomes             ?? incomes);
  const viewBudget       = viewMode === "present" ? budget       : (monthPlan?.budgetOverride       ?? budget);
  const viewSelectedCats = viewMode === "present" ? selectedCats : (monthPlan?.selectedCatsOverride ?? selectedCats);
  const viewGoals = useMemo(() => {
    if (viewMode === "present") return goals;

    return goals.map(g => {
      const monthlyOverride = monthPlan?.goalsOverride?.[g.id] ?? g.monthly;

      if (viewMode === "past") {
        // Past: only override monthly, leave saved as-is (historical total unknown)
        return { ...g, monthly: monthlyOverride };
      }

      // Future: project saved = current + every activated month's contribution up to viewed month
      let projected = g.saved;
      const [nowY0, nowM1] = nowKey.split("-").map(Number);
      let y = nowY0, m0 = nowM1 - 1; // m0 is 0-indexed
      for (let i = 0; i < 24; i++) {
        const next = new Date(y, m0 + 1, 1);
        y = next.getFullYear(); m0 = next.getMonth();
        const k = `${y}-${String(m0 + 1).padStart(2, "0")}`;
        const planK = months[k];
        const contrib = planK?.goalsOverride?.[g.id] ?? g.monthly;
        if (planK?.activated || k === monthKey) projected += contrib;
        if (k === monthKey) break;
      }
      return { ...g, monthly: monthlyOverride, saved: projected };
    });
  }, [goals, monthPlan, viewMode, monthKey, nowKey, months]);
  const [showGuide, setShowGuide] = useState(false);

  // State lifted from DashboardTab for hero placement before the tab bar
  const [viewPeriod, setViewPeriod] = useState<"week"|"month">("month");
  const [cyclePhase, setCyclePhase] = useState<CyclePhase | null>(null);
  const [goalIdx, setGoalIdx] = useState(0);
  useEffect(() => { if (hasCycleSettings()) setCyclePhase(readCyclePhase()); }, []);

  const tabScrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = tabScrollRef.current;
    if (!el || window.innerWidth >= 1024) return;
    const t = setTimeout(() => {
      el.scrollTo({ left: 55, behavior: "smooth" });
      setTimeout(() => el.scrollTo({ left: 0, behavior: "smooth" }), 450);
    }, 700);
    return () => clearTimeout(t);
  }, []);

  const clampedHeroGoalIdx = viewGoals.length > 0 ? Math.min(goalIdx, viewGoals.length - 1) : 0;
  const heroGoalPct = (() => { const g = viewGoals[clampedHeroGoalIdx]; return g?.target > 0 ? Math.min(100, (g.saved / g.target) * 100) : 0; })();
  const cycleTip = cyclePhase && cyclePhase !== "any" ? BP_CYCLE_TIPS[cyclePhase] : undefined;
  const weekBand = useMemo(() => Array.from({ length: 7 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (6 - i));
    const iso = d.toISOString().slice(0, 10);
    const spent = txns.filter(t => t.date === iso && t.type === "expense").reduce((s, t) => s + t.amount, 0);
    return { iso, label: ["S","M","T","W","T","F","S"][d.getDay()], spent, isToday: i === 6 };
  }), [txns]);

  const allCats: Cat[] = useMemo(() => [
    ...DEFAULT_CATS,
    ...customCats.map(c => ({ ...c, Icon: Package })),
  ], [customCats]);

  const totalIncome = useMemo(() => viewIncomes.reduce((s, i) => s + toMonthly(i), 0), [viewIncomes]);

  // Effective expenses: committed plan + actual transactions for the viewed month
  const totalExpenses = useMemo(() => {
    const budgetedKeys = viewSelectedCats.filter(k => (viewBudget[k] ?? 0) > 0);
    const plannedTotal = budgetedKeys.reduce((s, k) => s + (viewBudget[k] ?? 0), 0);
    const actualTotal = txns
      .filter(t => t.type === "expense" && new Date(t.date).getFullYear() === month.y && new Date(t.date).getMonth() === month.m)
      .reduce((s, t) => s + t.amount, 0);
    return plannedTotal + actualTotal;
  }, [txns, viewSelectedCats, viewBudget, month]);

  const totalSavings = totalIncome - totalExpenses;
  const totalBalance = totalIncome - totalExpenses;

  // Auto-show when nothing is set up; also show on manual trigger via "Guide" button
  const hasSetup = incomes.length > 0 || selectedCats.some(k => (budget[k] ?? 0) > 0);
  const guideVisible = showGuide || (!onboarded && !hasSetup);

  function seedDemoData() {
    if (hasSetup && !window.confirm("Replace your current data with demo data?")) return;
    setCurrency("MAD");
    setIncomes([
      { id: "di1", source: "Salary – Tech Company", amount: 9500, frequency: "Monthly" },
      { id: "di2", source: "Freelance Design", amount: 2800, frequency: "Monthly" },
      { id: "di3", source: "Rental Income", amount: 1500, frequency: "Monthly" },
    ]);
    setSelectedCats(["rent","food","transp","elec","phone","health","rest","shop"]);
    setBudget({ rent: 3200, food: 1500, transp: 600, elec: 300, phone: 250, health: 300, rest: 700, shop: 900 });
    setGoals([
      { id: "dg1", name: "Emergency Fund 🌿", target: 20000, saved: 6500, monthly: 1200 },
      { id: "dg2", name: "Morocco Road Trip ✈️", target: 8000, saved: 2400, monthly: 600 },
      { id: "dg3", name: "New MacBook 💻", target: 12000, saved: 3800, monthly: 800 },
    ]);
    setTxns([
      // June 2026
      { id: "dt1",  date: "2026-06-03", catKey: "food",   amount: 340,  description: "Extra groceries & snacks",       mood: "planned",   type: "expense" },
      { id: "dt2",  date: "2026-06-07", catKey: "rest",   amount: 580,  description: "Anniversary dinner",             mood: "necessary", type: "expense" },
      { id: "dt3",  date: "2026-06-11", catKey: "shop",   amount: 1450, description: "Summer clothes haul",            mood: "impulsive", type: "expense" },
      { id: "dt4",  date: "2026-06-15", catKey: "health", amount: 320,  description: "Pharmacy run",                   mood: "necessary", type: "expense" },
      { id: "dt5",  date: "2026-06-18", catKey: "enter",  amount: 200,  description: "Cinema + dinner",                mood: "planned",   type: "expense" },
      { id: "dt6",  date: "2026-06-21", catKey: "transp", amount: 120,  description: "Ride-sharing this week",         mood: "necessary", type: "expense" },
      // May 2026
      { id: "dt7",  date: "2026-05-04", catKey: "food",   amount: 210,  description: "Farmers market haul",            mood: "planned",   type: "expense" },
      { id: "dt8",  date: "2026-05-09", catKey: "shop",   amount: 1200, description: "Shoes & bag",                    mood: "impulsive", type: "expense" },
      { id: "dt9",  date: "2026-05-14", catKey: "rest",   amount: 470,  description: "Friends birthday brunch",        mood: "necessary", type: "expense" },
      { id: "dt10", date: "2026-05-20", catKey: "self",   amount: 400,  description: "Spa & massage day",              mood: "planned",   type: "expense" },
      { id: "dt11", date: "2026-05-25", catKey: "enter",  amount: 280,  description: "Concert night",                  mood: "planned",   type: "expense" },
      { id: "dt12", date: "2026-05-29", catKey: "travel", amount: 650,  description: "Weekend getaway deposit",        mood: "impulsive", type: "expense" },
      // April 2026
      { id: "dt13", date: "2026-04-02", catKey: "food",   amount: 180,  description: "Easter special groceries",       mood: "planned",   type: "expense" },
      { id: "dt14", date: "2026-04-10", catKey: "travel", amount: 3200, description: "Trip to Marrakech 🌴",           mood: "impulsive", type: "expense" },
      { id: "dt15", date: "2026-04-18", catKey: "shop",   amount: 870,  description: "Spring wardrobe refresh",        mood: "impulsive", type: "expense" },
      { id: "dt16", date: "2026-04-24", catKey: "health", amount: 250,  description: "Dental checkup",                 mood: "necessary", type: "expense" },
      // March 2026
      { id: "dt17", date: "2026-03-05", catKey: "rest",   amount: 320,  description: "Work team dinner",               mood: "necessary", type: "expense" },
      { id: "dt18", date: "2026-03-12", catKey: "health", amount: 480,  description: "Doctor + pharmacy",              mood: "necessary", type: "expense" },
      { id: "dt19", date: "2026-03-19", catKey: "enter",  amount: 190,  description: "Movie & events",                 mood: "planned",   type: "expense" },
      { id: "dt20", date: "2026-03-26", catKey: "shop",   amount: 2100, description: "Ramadan shopping",               mood: "necessary", type: "expense" },
      // February 2026
      { id: "dt21", date: "2026-02-10", catKey: "food",   amount: 290,  description: "Valentine's dinner ingredients", mood: "planned",   type: "expense" },
      { id: "dt22", date: "2026-02-14", catKey: "rest",   amount: 850,  description: "Valentine's romantic dinner",    mood: "impulsive", type: "expense" },
      { id: "dt23", date: "2026-02-22", catKey: "shop",   amount: 600,  description: "Winter sale picks",              mood: "impulsive", type: "expense" },
    ]);
    setBills([
      { id: "db1", name: "Monthly Rent",    due: "2026-07-01", amount: 3200, paid: false },
      { id: "db2", name: "Internet & Phone",due: "2026-06-28", amount: 250,  paid: false },
      { id: "db3", name: "Electricity",     due: "2026-07-05", amount: 300,  paid: false },
      { id: "db4", name: "Water Bill",      due: "2026-06-30", amount: 180,  paid: false },
    ]);
    setOnboarded(true);
    setTab("Dashboard");
  }

  return (
    <div data-bp>
      {guideVisible && (
        <OnboardingGuide
          onDone={() => { setOnboarded(true); setShowGuide(false); }}
          setTab={setTab}
        />
      )}

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

      {/* Hero — always visible, content adapts per tab */}
      {(() => {
        const hc = HERO_CONFIG[tab] ?? HERO_CONFIG.Dashboard;
        const isDash = tab === "Dashboard";
        return (
          <div className="relative overflow-hidden rounded-[1.75rem] border border-pink-200/60 shadow-xl">
            <img src="/images/budget-hero.png" alt="" className="absolute inset-0 h-full w-full object-cover object-center" />
            <div className="absolute inset-0" style={{ background: "linear-gradient(100deg, rgba(236,72,153,0.90) 0%, rgba(236,72,153,0.68) 50%, rgba(236,72,153,0.20) 80%, transparent 100%)" }} />
            <div className={["relative z-10 flex items-center justify-between gap-3 p-4 sm:p-5 lg:p-5", isDash ? "min-h-[120px] sm:min-h-[140px]" : "min-h-[88px] sm:min-h-[100px]"].join(" ")}>
              <div className="max-w-[65%]">
                <h2 className="font-script text-2xl sm:text-3xl text-white leading-tight" style={{ textShadow: '0 2px 8px rgba(0,0,0,0.18)' }}>
                  {hc.title}
                </h2>
                {isDash && cycleTip ? (
                  <div className="mt-1 space-y-0.5">
                    <div className="inline-flex items-center gap-1.5">
                      <span className="text-sm leading-none" style={{ filter: 'drop-shadow(0 1px 3px rgba(0,0,0,0.2))' }}>{cycleTip.emoji}</span>
                      <span className="text-[11px] font-bold text-white tracking-wide" style={{ textShadow: '0 1px 4px rgba(0,0,0,0.25)' }}>{cycleTip.headline}</span>
                    </div>
                    <p className="text-[10px] text-white/85 italic leading-snug pl-0.5">{cycleTip.sub}</p>
                  </div>
                ) : (
                  <p className="mt-0.5 text-[11px] sm:text-xs text-white/90">{hc.sub}</p>
                )}
                <div className="mt-2 flex items-center gap-2">
                  {isDash && (
                    <button onClick={() => setShowMonthPicker(true)}
                      className="inline-flex items-center gap-1.5 rounded-full bg-white/25 backdrop-blur-md border border-white/50 px-3 py-1.5 text-xs text-white font-semibold transition hover:bg-white/35 active:scale-95">
                      <Calendar className="h-3 w-3" />
                      {viewMode === "present"
                        ? "Ce mois"
                        : new Date(month.y, month.m, 1).toLocaleString("default", { month: "short", year: "numeric" })}
                      {viewMode === "future" && <span className="text-[9px] font-bold text-white/80">{monthPlan?.activated ? " ✓" : " ✦"}</span>}
                      <ChevronDown className="h-3 w-3 opacity-70" />
                    </button>
                  )}
                  <button onClick={() => setShowCurrencyPicker(true)}
                    className="inline-flex items-center gap-1 rounded-full bg-white/25 backdrop-blur-md border border-white/50 px-3 py-1.5 text-xs text-white font-semibold transition hover:bg-white/35 active:scale-95">
                    <Coins className="h-3 w-3" />
                    {CURRENCIES[currency].symbol}
                  </button>
                  <button onClick={() => setShowGuide(true)}
                    className="inline-flex items-center gap-1 rounded-full bg-white/25 backdrop-blur-md border border-white/50 px-3 py-1.5 text-xs text-white font-semibold transition hover:bg-white/35 active:scale-95">
                    <Sparkles className="h-3 w-3" />
                    Guide
                  </button>
                  <button onClick={seedDemoData}
                    className="inline-flex items-center gap-1 rounded-full bg-white/15 backdrop-blur-md border border-white/30 px-3 py-1.5 text-xs text-white/80 font-semibold transition hover:bg-white/25 hover:text-white active:scale-95">
                    ✦ Demo
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Tabs */}
      <div className="sticky top-14 md:top-0 z-30 py-2">
        <div className="relative">
          <div ref={tabScrollRef} className="flex gap-1.5 overflow-x-auto no-scrollbar px-1">
            {TABS.map((t) => {
              const active = tab === t;
              const tourAttr =
                t === "Incomes" ? "incomes-tab" :
                t === "Budget Setup" ? "budget-tab" :
                t === "Savings Goals" ? "goals-tab" : undefined;
              return (
                <button
                  key={t}
                  data-tour={tourAttr}
                  onClick={() => setTab(t)}
                  className={[
                    "shrink-0 rounded-full px-4 py-1.5 text-xs font-semibold whitespace-nowrap transition-all duration-200 border-[0.5px]",
                    active
                      ? "bg-[#EC4899] text-white shadow-md shadow-pink-400/40 border-transparent scale-[1.02]"
                      : "bg-white/70 backdrop-blur text-[#9D5C7E] border-pink-300/50 hover:bg-white/90",
                  ].join(" ")}
                >
                  {t}
                </button>
              );
            })}
          </div>
          {/* right-edge fade — hints at horizontal scroll on mobile/tablet */}
          <div className="pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-l from-[#FDF2F8] to-transparent lg:hidden" />
        </div>
      </div>

      {/* Tab content */}
      <div className="relative">
        <div key={tab} className={`mt-2 animate-fade-in transition-opacity duration-300 ${isPlanning ? "opacity-40 pointer-events-none select-none" : ""}`}>
          {tab === "Dashboard" && (
              <DashboardTab
                currency={currency}
                totalIncome={totalIncome}
                totalExpenses={totalExpenses}
                totalSavings={totalSavings}
                totalBalance={totalBalance}
                txns={txns} setTxns={setTxns}
                budget={viewBudget} setBudget={setBudget}
                selectedCats={viewSelectedCats} setSelectedCats={setSelectedCats}
                allCats={allCats}
                goals={viewGoals}
                bills={bills}
                setTab={setTab}
                incomes={viewIncomes}
                onCurrencyClick={() => setShowCurrencyPicker(true)}
                viewPeriod={viewPeriod}
                setViewPeriod={setViewPeriod}
                goalIdx={goalIdx}
                setGoalIdx={setGoalIdx}
                month={month}
                viewMode={viewMode}
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
                setTxns={setTxns}
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
                incomes={viewIncomes}
                budget={viewBudget}
                selectedCats={viewSelectedCats}
                month={month}
                setMonth={setMonth}
              />
            )}
        </div>

        {/* Planning overlay — for future months not yet activated */}
        {isPlanning && (
          <PlanningOverlay
            key={monthKey}
            month={month}
            monthKey={monthKey}
            months={months}
            setMonths={setMonths}
            incomes={incomes}
            budget={budget}
            selectedCats={selectedCats}
            goals={goals}
            allCats={allCats}
            currency={currency}
          />
        )}
      </div>

      {/* Month picker modal */}
      {showMonthPicker && (
        <MonthPickerModal
          month={month}
          setMonth={m => { setMonth(m); setShowMonthPicker(false); }}
          onClose={() => setShowMonthPicker(false)}
          months={months}
          nowKey={nowKey}
          nextPlannableKey={nextPlannableKey}
        />
      )}

      {/* Past month read-only banner */}
      {viewMode === "past" && (
        <div className="mt-3 flex items-center gap-2 rounded-2xl bg-pink-50 border border-pink-200/60 px-4 py-2.5">
          <Calendar className="h-4 w-4 text-[#9D5C7E] shrink-0" />
          <p className="text-xs text-[#9D5C7E] font-semibold">Historique — lecture seule. Dépenses non modifiables.</p>
          <button onClick={() => setMonth({ y: _now.getFullYear(), m: _now.getMonth() })}
            className="ml-auto shrink-0 text-[10px] font-bold text-[#EC4899] hover:underline whitespace-nowrap">
            Mois en cours ›
          </button>
        </div>
      )}

      {/* Activated future month — show plan info + reset */}
      {viewMode === "future" && monthPlan?.activated && (() => {
        const monthName = new Date(month.y, month.m, 1).toLocaleString("default", { month: "long", year: "numeric" });
        // Count how many months after this one are also planned (will also be reset)
        const cascade = Object.keys(months).filter(k => k > monthKey && months[k]?.activated).length;
        return (
          <div className="mt-3 flex items-center gap-2 rounded-2xl bg-violet-50 border border-violet-200/60 px-4 py-2.5">
            <Flag className="h-4 w-4 text-violet-500 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs text-violet-700 font-semibold truncate">
                {monthName} · Planifié ✓
              </p>
              {cascade > 0 && (
                <p className="text-[10px] text-violet-500">
                  + {cascade} mois suivant{cascade > 1 ? "s" : ""} planifié{cascade > 1 ? "s" : ""}
                </p>
              )}
            </div>
            <button
              onClick={() => {
                const label = cascade > 0
                  ? `Réinitialiser ${monthName} et les ${cascade} mois planifié${cascade > 1 ? "s" : ""} après ?`
                  : `Réinitialiser le plan de ${monthName} ?`;
                if (window.confirm(label)) resetPlannedMonth(monthKey);
              }}
              className="ml-2 shrink-0 inline-flex items-center gap-1 text-[10px] font-bold text-rose-500 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-full px-2.5 py-1 transition active:scale-95 whitespace-nowrap">
              <XCircle className="h-3 w-3" /> Réinitialiser
            </button>
          </div>
        );
      })()}

      {/* ✦ GLOBAL CTA FAB — only on current month */}
      {viewMode === "present" && <button
        data-tour="spend-fab"
        onClick={() => setShowExtraSpend(true)}
        className="fixed bottom-20 right-4 z-30 flex items-center gap-2 rounded-full bg-[#EC4899] text-white shadow-xl shadow-pink-400/40 hover:bg-[#DB2777] transition active:scale-95 px-5 h-14"
        style={{ animation: 'ctaBreathe 2.8s ease-in-out infinite' }}
        aria-label="Add spend"
      >
        <Plus className="h-5 w-5" strokeWidth={2.5} />
        <span className="text-sm font-bold">Spend</span>
      </button>}

      <ExtraSpendModal
        open={showExtraSpend}
        onClose={() => setShowExtraSpend(false)}
        onSave={txnData => setTxns(prev => [{ id: uid(), ...txnData }, ...prev])}
        allCats={allCats}
        setCustomCats={setCustomCats}
        currency={currency}
      />

      <style>{`
        [data-bp] *::-webkit-scrollbar { display: none; }
        [data-bp] * { scrollbar-width: none; -ms-overflow-style: none; }

        @keyframes tourFloat {
          from { transform: translateY(0px) scale(1); opacity: 0.22; }
          to   { transform: translateY(-20px) scale(1.1); opacity: 0.1; }
        }
        @keyframes guideOrb {
          from { transform: translate(-50%,-50%) scale(1);   opacity: 0.18; }
          to   { transform: translate(-50%,-50%) scale(1.35); opacity: 0.38; }
        }
        @keyframes spotPulse {
          0%,100% {
            box-shadow: 0 0 0 9999px rgba(5,1,13,0.87), 0 0 22px 6px rgba(236,72,153,0.55);
            border-color: rgba(236,72,153,0.92);
          }
          50% {
            box-shadow: 0 0 0 9999px rgba(5,1,13,0.87), 0 0 44px 14px rgba(236,72,153,0.82);
            border-color: rgba(236,72,153,1);
          }
        }
        @keyframes guideCardIn {
          from { transform: scale(0.86) translateY(10px); opacity: 0; }
          to   { transform: scale(1)    translateY(0);    opacity: 1; }
        }
        @keyframes guideFadeOut {
          0%   { opacity: 1; }
          55%  { opacity: 1; }
          100% { opacity: 0; pointer-events: none; }
        }
        @keyframes fadeInUp {
          from { transform: translateY(14px); opacity: 0; }
          to   { transform: translateY(0);    opacity: 1; }
        }
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

function StatCards({ income, plannedBudget, goalsMonthly, realExpenses, goalsSaved, balance, currency }: {
  income: number; plannedBudget: number; goalsMonthly: number; realExpenses: number; goalsSaved: number; balance: number; currency: CurrencyKey;
}) {
  const totalSpend = plannedBudget + goalsMonthly + realExpenses;
  const surplus = income - totalSpend;
  const isOverIncome = income > 0 && surplus < 0;

  const cards = [
    {
      label: "Income Garden",
      v: income,
      sub: "your monthly earnings",
      bg: isOverIncome ? "from-red-100 to-rose-100" : "from-pink-50 to-rose-50",
      badge: income > 0
        ? surplus >= 0
          ? { text: `Balance = ${fmt(surplus, currency)}`, color: "text-emerald-600 bg-emerald-100" }
          : { text: `⚠ −${fmt(Math.abs(surplus), currency)}`, color: "text-red-700 bg-red-100" }
        : null,
    },
    {
      label: "Planned Budget",
      v: plannedBudget + goalsMonthly,
      sub: goalsMonthly > 0
        ? `${fmt(plannedBudget, currency)} budget + ${fmt(goalsMonthly, currency)} goals`
        : "committed this month",
      bg: "from-fuchsia-50 to-purple-50",
      badge: null,
    },
    {
      label: "Real Spending Petals",
      v: plannedBudget + goalsMonthly + realExpenses,
      sub: "extra spends this month",
      bg: isOverIncome ? "from-red-100 to-rose-100" : "from-rose-50 to-pink-50",
      badge: null,
      planSub: fmt(plannedBudget + goalsMonthly, currency),
      extraAmt: realExpenses > 0 ? fmt(realExpenses, currency) : null,
    },
    {
      label: "Savings Bloom",
      v: goalsSaved,
      sub: "saved across all goals",
      bg: "from-emerald-50 to-teal-50",
      numColor: "text-emerald-600",
      badge: null,
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3 animate-fade-in">
      {cards.map((it) => (
        <Card key={it.label} className={`relative overflow-hidden hover:-translate-y-1 bg-gradient-to-br ${it.bg}`}>
          <div className="text-[9px] sm:text-[10px] font-bold tracking-widest text-[#9D5C7E] uppercase leading-tight">{it.label}</div>
          <div className={`mt-1 font-script text-2xl sm:text-3xl font-extrabold leading-none ${"numColor" in it ? it.numColor : "text-[#EC4899]"}`}>
            <StatNumber value={it.v} currency={currency} />
          </div>
          {"planSub" in it ? (
            <div className="mt-0.5 flex items-center flex-wrap gap-x-0.5 text-[9px] text-[#9D5C7E] leading-tight">
              {it.extraAmt && <span className="text-rose-500">{it.extraAmt} extra</span>}
              {it.extraAmt && <span className="text-[#9D5C7E]">+</span>}
              <span className="text-[#9D5C7E]">{it.planSub} planned</span>
            </div>
          ) : it.badge ? (
            <span className={`mt-0.5 inline-block text-[9px] font-bold rounded-full px-1.5 py-0.5 leading-tight ${it.badge.color}`}>
              {it.badge.text}
            </span>
          ) : (
            <div className="mt-0.5 text-[9px] text-[#9D5C7E] leading-tight">{it.sub}</div>
          )}
        </Card>
      ))}
    </div>
  );
}

/* ============================================================
   EXTRA SPEND MODAL — centered popup with full form
============================================================ */
function ExtraSpendModal({ open, onClose, onSave, allCats, setCustomCats, currency }: {
  open: boolean; onClose: () => void;
  onSave: (txn: { amount: number; catKey: string; description: string; date: string; mood: MoodKey; type: "expense" }) => void;
  allCats: Cat[]; setCustomCats: (v: CustomCat[] | ((p: CustomCat[]) => CustomCat[])) => void;
  currency: CurrencyKey;
}) {
  const [amount, setAmount] = useState("");
  const [catKey, setCatKey] = useState(allCats[0]?.key ?? "food");
  const [desc, setDesc] = useState("");
  const [date, setDate] = useState(todayISO());
  const [mood, setMood] = useState<MoodKey>("planned");
  const [saved, setSaved] = useState(false);
  const [showAddCat, setShowAddCat] = useState(false);
  const [newCatLabel, setNewCatLabel] = useState("");
  const [newCatEmoji, setNewCatEmoji] = useState("💰");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setAmount(""); setDesc(""); setSaved(false); setShowAddCat(false);
      setDate(todayISO()); setNewCatLabel(""); setNewCatEmoji("💰");
      setTimeout(() => inputRef.current?.focus(), 80);
    }
  }, [open]);

  function handleSave() {
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) return;
    onSave({ amount: amt, catKey, description: desc, date, mood, type: "expense" });
    setSaved(true);
    setTimeout(() => { onClose(); setSaved(false); setAmount(""); setDesc(""); }, 1300);
  }

  function addCustomCat() {
    if (!newCatLabel.trim()) return;
    const key = `custom_${Date.now()}`;
    setCustomCats(prev => [...prev, { key, label: newCatLabel.trim(), emoji: newCatEmoji, group: "need" as Need }]);
    setCatKey(key);
    setShowAddCat(false);
    setNewCatLabel(""); setNewCatEmoji("💰");
  }

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center px-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-sm rounded-[2rem] bg-white border-2 border-pink-200/70 shadow-2xl shadow-pink-300/30 animate-scale-in overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-pink-100 shrink-0">
          <div className="flex items-center gap-2">
            <div className="grid h-8 w-8 place-items-center rounded-xl bg-[#EC4899]/10 text-[#EC4899]">
              <Plus className="h-4 w-4" />
            </div>
            <h3 className="font-script text-2xl text-[#831843]">Extra Spend ✿</h3>
          </div>
          <button onClick={onClose} className="grid h-8 w-8 place-items-center rounded-full bg-pink-50 hover:bg-pink-100 text-[#9D5C7E] transition">
            <X className="h-4 w-4" />
          </button>
        </div>

        {saved ? (
          <div className="py-12 flex flex-col items-center gap-3 animate-fade-in">
            <div className="grid h-16 w-16 place-items-center rounded-full bg-emerald-500 text-white shadow-lg shadow-emerald-300/40 animate-scale-in">
              <Check className="h-8 w-8" strokeWidth={3} />
            </div>
            <p className="font-script text-3xl text-[#831843]">Saved ✿</p>
            <p className="text-sm text-[#9D5C7E]">{CURRENCIES[currency].symbol}{amount} · {allCats.find(c => c.key === catKey)?.label ?? catKey}</p>
          </div>
        ) : (
          <div className="px-5 py-4 space-y-4 max-h-[78vh] overflow-y-auto">
            {/* Categories grid — pick first */}
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-[#9D5C7E] mb-2">Category</p>
              <div className="grid grid-cols-4 gap-2 max-h-44 overflow-y-auto pr-0.5">
                {allCats.map(c => (
                  <button key={c.key} onClick={() => setCatKey(c.key)}
                    className={[
                      "flex flex-col items-center gap-0.5 rounded-xl py-2 px-1 border transition-all duration-150 text-center",
                      c.key === catKey
                        ? "bg-[#EC4899] text-white border-transparent shadow-md shadow-pink-400/30 scale-[1.04]"
                        : "bg-pink-50/80 text-[#9D5C7E] border-pink-100 hover:border-pink-300"
                    ].join(" ")}>
                    <span className="text-base">{c.emoji}</span>
                    <span className="text-[9px] font-semibold leading-tight line-clamp-2">{c.label}</span>
                  </button>
                ))}
                <button onClick={() => setShowAddCat(v => !v)}
                  className="flex flex-col items-center gap-0.5 rounded-xl py-2 px-1 border border-dashed border-pink-300 bg-pink-50/40 text-[#EC4899] transition-all hover:bg-pink-100">
                  <span className="text-base font-bold">+</span>
                  <span className="text-[9px] font-semibold">New</span>
                </button>
              </div>
            </div>

            {/* Add new category inline form */}
            {showAddCat && (
              <div className="rounded-2xl border border-pink-200 bg-pink-50/60 p-3 space-y-2 animate-fade-in">
                <p className="text-[10px] font-bold uppercase tracking-widest text-[#9D5C7E]">New Category</p>
                <div className="flex gap-2">
                  <input value={newCatEmoji} onChange={e => setNewCatEmoji(e.target.value)} maxLength={2}
                    className="w-12 rounded-xl bg-white border border-pink-200 text-center text-lg p-2 outline-none focus:ring-1 focus:ring-pink-400" />
                  <input value={newCatLabel} onChange={e => setNewCatLabel(e.target.value)} placeholder="Category name"
                    className="flex-1 rounded-xl bg-white border border-pink-200 px-3 py-2 text-sm font-medium text-[#831843] outline-none focus:ring-1 focus:ring-pink-400" />
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setShowAddCat(false)} className="flex-1 rounded-xl border border-pink-200 py-1.5 text-xs font-semibold text-[#9D5C7E]">Cancel</button>
                  <button onClick={addCustomCat} className="flex-1 rounded-xl bg-[#EC4899] text-white py-1.5 text-xs font-bold hover:bg-[#DB2777] transition">Add</button>
                </div>
              </div>
            )}

            {/* Amount */}
            <div className="flex items-center gap-2 rounded-2xl bg-pink-50/80 border border-pink-200/60 px-4 focus-within:ring-2 focus-within:ring-pink-400/50">
              <span className="text-xl font-bold text-[#EC4899] shrink-0">{CURRENCIES[currency].symbol}</span>
              <input
                ref={inputRef} type="number" inputMode="decimal" value={amount}
                onChange={e => setAmount(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleSave()} placeholder="0.00"
                className="flex-1 bg-transparent py-3.5 text-2xl font-bold text-[#831843] placeholder:text-pink-200 outline-none"
              />
            </div>

            {/* Date */}
            <PinkDatePicker value={date} onChange={setDate} className="w-full" />

            {/* Mood / Spend type */}
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-[#9D5C7E] mb-2">Spend type</p>
              <div className="flex gap-2">
                {MOODS.map(m => (
                  <button key={m.key} onClick={() => setMood(m.key)}
                    className={[
                      "flex-1 flex items-center justify-center gap-1 rounded-xl py-2 text-[10px] font-bold border transition-all",
                      mood === m.key
                        ? "bg-[#EC4899]/10 border-[#EC4899]/40 text-[#EC4899]"
                        : "bg-white border-pink-200/60 text-[#9D5C7E] hover:border-pink-300"
                    ].join(" ")}>
                    <m.Icon className="h-3.5 w-3.5" /> {m.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Description */}
            <Input placeholder="What did you spend on? (optional)" value={desc} onChange={e => setDesc(e.target.value)} />

            {/* Save button */}
            <button
              onClick={handleSave} disabled={!amount || parseFloat(amount) <= 0}
              className="w-full bloom-luxury-btn py-3.5 text-base font-bold text-white rounded-2xl disabled:opacity-40 transition-all"
              style={{ animation: amount && parseFloat(amount) > 0 ? 'ctaBreathe 2.8s ease-in-out infinite' : 'none' }}
            >
              Save Spend ✿
            </button>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}

/* ============================================================
   MONTH PICKER MODAL
============================================================ */
const MONTH_ABBR = ["Jan","Fév","Mar","Avr","Mai","Jun","Jul","Aoû","Sep","Oct","Nov","Déc"];

function MonthPickerModal({
  month, setMonth, onClose, months, nowKey, nextPlannableKey,
}: {
  month: { y: number; m: number };
  setMonth: (v: { y: number; m: number }) => void;
  onClose: () => void;
  months: Record<string, MonthPlan>;
  nowKey: string;
  nextPlannableKey: string;
}) {
  const [pickerYear, setPickerYear] = useState(month.y);
  const selectedKey = `${month.y}-${String(month.m + 1).padStart(2, "0")}`;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4"
      style={{ background: "rgba(253,242,248,0.75)", backdropFilter: "blur(6px)" }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="w-full max-w-xs bg-white rounded-3xl shadow-2xl border border-pink-200 overflow-hidden"
        style={{ animation: "fadeIn 0.25s ease-out" }}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-2">
          <h2 className="text-base font-bold text-[#831843]">Choisir un mois</h2>
          <button onClick={onClose} className="text-[#9D5C7E] hover:text-[#831843] transition">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Year navigation */}
        <div className="flex items-center justify-between px-5 pb-3">
          <button onClick={() => setPickerYear(y => y - 1)}
            className="rounded-full p-1.5 hover:bg-pink-50 text-[#9D5C7E] transition active:scale-95">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="text-sm font-bold text-[#831843]">{pickerYear}</span>
          <button onClick={() => setPickerYear(y => y + 1)}
            className="rounded-full p-1.5 hover:bg-pink-50 text-[#9D5C7E] transition active:scale-95">
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        {/* Month grid */}
        <div className="grid grid-cols-3 gap-2 px-4 pb-5">
          {MONTH_ABBR.map((name, m) => {
            const k = `${pickerYear}-${String(m + 1).padStart(2, "0")}`;
            const isPast       = k < nowKey;
            const isCurrent    = k === nowKey;
            const isActivated  = !!months[k]?.activated;
            const isNextPlan   = k === nextPlannableKey;
            const isSelected   = k === selectedKey;
            const isLocked     = !isPast && !isCurrent && !isActivated && !isNextPlan;

            let cls = "rounded-2xl py-2.5 flex flex-col items-center gap-0.5 text-xs font-bold transition active:scale-95 ";
            let badge = "";

            if (isLocked) {
              cls += "bg-gray-100 text-gray-400 cursor-not-allowed opacity-50";
              badge = "🔒";
            } else if (isCurrent) {
              cls += "bg-[#EC4899] text-white shadow-md shadow-pink-300/50";
              badge = "●";
            } else if (isActivated) {
              cls += "bg-violet-100 text-violet-700 hover:bg-violet-200";
              badge = "✓";
            } else if (isNextPlan) {
              cls += "bg-violet-50 text-violet-600 border-2 border-dashed border-violet-400 hover:bg-violet-100";
              badge = "✦";
            } else {
              // past
              cls += "bg-pink-50 text-[#9D5C7E] hover:bg-pink-100";
              badge = "";
            }

            if (isSelected && !isLocked) cls += " ring-2 ring-offset-1 ring-[#EC4899]";

            return (
              <button key={m} disabled={isLocked}
                onClick={() => setMonth({ y: pickerYear, m })}
                className={cls}>
                <span>{name}</span>
                {badge && <span className="text-[9px] leading-none opacity-80">{badge}</span>}
              </button>
            );
          })}
        </div>

        {/* Legend */}
        <div className="flex items-center flex-wrap gap-x-3 gap-y-1 px-5 pb-4 border-t border-pink-100 pt-3">
          <span className="flex items-center gap-1 text-[10px] text-[#9D5C7E]">
            <span className="inline-block w-2.5 h-2.5 rounded-full bg-[#EC4899]" /> En cours
          </span>
          <span className="flex items-center gap-1 text-[10px] text-[#9D5C7E]">
            <span className="inline-block w-2.5 h-2.5 rounded-full bg-violet-200" /> Planifié ✓
          </span>
          <span className="flex items-center gap-1 text-[10px] text-[#9D5C7E]">
            <span className="inline-block w-2.5 h-2.5 rounded-full border-2 border-dashed border-violet-400" /> Planifier ✦
          </span>
        </div>
      </div>
    </div>,
    document.body
  );
}

/* ============================================================
   PLANNING OVERLAY — future month not yet activated
============================================================ */
function PlanningOverlay({
  month, monthKey, months, setMonths,
  incomes, budget, selectedCats, goals, allCats, currency,
}: {
  month: { y: number; m: number };
  monthKey: string;
  months: Record<string, MonthPlan>;
  setMonths: (v: Record<string, MonthPlan> | ((p: Record<string, MonthPlan>) => Record<string, MonthPlan>)) => void;
  incomes: Income[]; budget: Budget; selectedCats: string[];
  goals: Goal[]; allCats: Cat[]; currency: CurrencyKey;
}) {
  const existing = months[monthKey];
  const [draftIncomes, setDraftIncomes] = useState<Income[]>(() => existing?.incomes ?? incomes);
  const [sameBudget, setSameBudget] = useState(!existing?.budgetOverride);
  const [draftBudget, setDraftBudget] = useState<Record<string, number>>(() => existing?.budgetOverride ?? { ...budget });
  const [draftGoals, setDraftGoals] = useState<Record<string, number>>(
    () => existing?.goalsOverride ?? Object.fromEntries(goals.map(g => [g.id, g.monthly]))
  );

  const monthName = new Date(month.y, month.m, 1).toLocaleString("default", { month: "long", year: "numeric" });
  const totalInc  = draftIncomes.reduce((s, i) => s + toMonthly(i), 0);
  const totalBudg = selectedCats.filter(k => (sameBudget ? budget[k] : draftBudget[k]) ?? 0 > 0)
    .reduce((s, k) => s + ((sameBudget ? budget[k] : draftBudget[k]) ?? 0), 0);
  const totalGoal = goals.reduce((s, g) => s + (draftGoals[g.id] ?? g.monthly), 0);
  const balance   = totalInc - totalBudg - totalGoal;

  function activate() {
    setMonths(prev => ({
      ...prev,
      [monthKey]: {
        incomes: draftIncomes,
        budgetOverride: sameBudget ? null : draftBudget,
        selectedCatsOverride: null,
        goalsOverride: draftGoals,
        activated: true,
      },
    }));
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 px-4 pb-8 overflow-y-auto"
      style={{ background: "rgba(253,242,248,0.6)", backdropFilter: "blur(6px)" }}>
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-pink-200 overflow-hidden"
        style={{ animation: "fadeIn 0.35s ease-out" }}>

        {/* Header */}
        <div className="p-5" style={{ background: "linear-gradient(135deg,#EC4899 0%,#8B5CF6 100%)" }}>
          <p className="text-[10px] font-bold uppercase tracking-widest text-white/70">✦ Planning mode</p>
          <h2 className="font-script text-2xl text-white mt-0.5">{monthName}</h2>
          <p className="text-xs text-white/80 mt-1">Confirme ou ajuste ton plan avant de commencer ce mois</p>
          <div className={`mt-3 flex items-center gap-2 rounded-2xl px-3 py-2 ${balance >= 0 ? "bg-white/20" : "bg-red-400/30"}`}>
            <span className="text-xs font-semibold text-white/80">Solde prévu</span>
            <span className={`ml-auto text-sm font-bold tabular-nums ${balance >= 0 ? "text-white" : "text-red-200"}`}>
              {balance >= 0 ? "+" : ""}{fmt(balance, currency)}
            </span>
          </div>
        </div>

        <div className="divide-y divide-pink-100">
          {/* Incomes */}
          <div className="p-4 space-y-3">
            <p className="text-[10px] font-bold uppercase tracking-widest text-[#9D5C7E] flex items-center gap-1.5">
              <Wallet className="h-3 w-3" /> Revenus · {fmt(totalInc, currency)}
            </p>
            {draftIncomes.map((inc, i) => (
              <div key={inc.id} className="flex items-center gap-2">
                <span className="flex-1 text-[11px] font-semibold text-[#831843] truncate">{inc.source}</span>
                <div className="flex items-center gap-1 shrink-0">
                  <input type="number" min={0} value={inc.amount}
                    onChange={e => {
                      const next = [...draftIncomes];
                      next[i] = { ...inc, amount: Math.max(0, Number(e.target.value)) };
                      setDraftIncomes(next);
                    }}
                    className="w-24 rounded-xl border border-pink-200 bg-pink-50 px-2 py-1 text-right text-xs font-bold text-[#831843] focus:outline-none focus:border-[#EC4899]"
                  />
                  <span className="text-[10px] text-[#9D5C7E] w-5">{CURRENCIES[currency].symbol}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Budget */}
          <div className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-bold uppercase tracking-widest text-[#9D5C7E] flex items-center gap-1.5">
                <Receipt className="h-3 w-3" /> Budget · {fmt(totalBudg, currency)}
              </p>
              <button onClick={() => setSameBudget(v => !v)}
                className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold transition ${sameBudget ? "bg-emerald-100 text-emerald-700" : "bg-violet-100 text-violet-700"}`}>
                {sameBudget ? <><Check className="h-3 w-3" /> Même plan</> : <><Sparkles className="h-3 w-3" /> Ajuster</>}
              </button>
            </div>
            {sameBudget ? (
              <p className="text-[10px] text-[#9D5C7E] italic">
                {selectedCats.filter(k => (budget[k] ?? 0) > 0).length} catégories reconduites sans changement
              </p>
            ) : selectedCats.filter(k => (budget[k] ?? 0) > 0).map(k => {
              const cat = allCats.find(c => c.key === k);
              return (
                <div key={k} className="flex items-center gap-2">
                  <span className="text-sm shrink-0">{cat?.emoji ?? "💰"}</span>
                  <span className="flex-1 text-[11px] font-semibold text-[#831843] truncate">{cat?.label ?? k}</span>
                  <div className="flex items-center gap-1 shrink-0">
                    <input type="number" min={0} value={draftBudget[k] ?? 0}
                      onChange={e => setDraftBudget(prev => ({ ...prev, [k]: Math.max(0, Number(e.target.value)) }))}
                      className="w-24 rounded-xl border border-pink-200 bg-pink-50 px-2 py-1 text-right text-xs font-bold text-[#831843] focus:outline-none focus:border-[#EC4899]"
                    />
                    <span className="text-[10px] text-[#9D5C7E] w-5">{CURRENCIES[currency].symbol}</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Goals */}
          {goals.length > 0 && (
            <div className="p-4 space-y-3">
              <p className="text-[10px] font-bold uppercase tracking-widest text-[#9D5C7E] flex items-center gap-1.5">
                <Flag className="h-3 w-3" /> Objectifs · {fmt(totalGoal, currency)}/mo
              </p>
              {goals.map(g => (
                <div key={g.id} className="flex items-center gap-2">
                  <span className="flex-1 text-[11px] font-semibold text-[#831843] truncate">{g.name}</span>
                  <div className="flex items-center gap-1 shrink-0">
                    <input type="number" min={0} value={draftGoals[g.id] ?? g.monthly}
                      onChange={e => setDraftGoals(prev => ({ ...prev, [g.id]: Math.max(0, Number(e.target.value)) }))}
                      className="w-24 rounded-xl border border-violet-200 bg-violet-50 px-2 py-1 text-right text-xs font-bold text-violet-700 focus:outline-none focus:border-violet-500"
                    />
                    <span className="text-[10px] text-[#9D5C7E]">/mo</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-gradient-to-b from-white to-pink-50/50">
          <button onClick={activate}
            className="bloom-luxury-btn w-full py-3.5 text-white font-bold text-sm rounded-2xl flex items-center justify-center gap-2">
            <Check className="h-4 w-4" />
            Activer {monthName} ✦
          </button>
          <p className="text-center text-[10px] text-[#9D5C7E] mt-2 opacity-70">
            Modifiable à tout moment depuis les onglets Revenus, Budget Setup et Objectifs
          </p>
        </div>
      </div>
    </div>,
    document.body
  );
}

/* ============================================================
   DASHBOARD TAB
============================================================ */
function DashboardTab(props: {
  currency: CurrencyKey;
  totalIncome: number; totalExpenses: number; totalSavings: number; totalBalance: number;
  txns: Txn[]; setTxns: (v: Txn[] | ((p: Txn[]) => Txn[])) => void;
  budget: Budget; setBudget: (v: Budget | ((p: Budget) => Budget)) => void;
  selectedCats: string[]; setSelectedCats: (v: string[] | ((p: string[]) => string[])) => void;
  allCats: Cat[];
  goals: Goal[]; bills: Bill[]; setTab: (t: TabKey) => void;
  incomes: Income[]; onCurrencyClick: () => void;
  viewPeriod: "week"|"month"; setViewPeriod: React.Dispatch<React.SetStateAction<"week"|"month">>;
  goalIdx: number; setGoalIdx: React.Dispatch<React.SetStateAction<number>>;
  month: { y: number; m: number };
  viewMode: "past" | "present" | "future";
}) {
  const { currency, totalIncome, totalExpenses, totalSavings, totalBalance,
    txns, setTxns, selectedCats, setSelectedCats, allCats, goals, setTab, incomes,
    budget, setBudget, onCurrencyClick,
    viewPeriod, setViewPeriod, goalIdx, setGoalIdx, month, viewMode } = props;

  const [setupDismissed, setSetupDismissed] = useLocal<boolean>("bp:setup-dismissed", false);

  const steps = [
    { key: "income", label: "Add your income",      hint: "Tell Bloom how much you earn each month",       done: incomes.length > 0,                                                 tab: "Incomes"       as TabKey, Icon: Wallet },
    { key: "setup",  label: "Set up your budget",   hint: "Pick spending categories & set monthly limits", done: selectedCats.length > 0 && Object.values(budget).some(v => v > 0), tab: "Budget Setup"  as TabKey, Icon: Receipt },
    { key: "goals",  label: "Add a savings goal",   hint: "A vacation, an emergency fund — dream big",     done: goals.length > 0,                                                   tab: "Savings Goals" as TabKey, Icon: Flag },
    { key: "track",  label: "Log your extra spends", hint: "Record any extra or unplanned expenses",        done: txns.filter(t => t.type === "expense").length > 0,              tab: "Reports"       as TabKey, Icon: FileBarChart },
  ];
  const completed = steps.filter(s => s.done).length;
  const nextStep  = steps.find(s => !s.done);
  const allDone   = completed === steps.length;

  const goalTouchX = useRef<number | null>(null);
  const [budgetShowAll, setBudgetShowAll] = useState(false);

  // === WEEK vs MONTH FILTER ===
  const filteredTxns = useMemo(() => {
    if (viewPeriod === "month") return txns;
    const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - 6); cutoff.setHours(0, 0, 0, 0);
    return txns.filter(t => new Date(t.date + "T00:00:00") >= cutoff);
  }, [txns, viewPeriod]);

  // Transactions for the viewed month
  const monthTxns = useMemo(() => {
    return txns.filter(t => {
      const d = new Date(t.date + "T00:00:00");
      return d.getFullYear() === month.y && d.getMonth() === month.m;
    });
  }, [txns, month]);

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

  // Effective totals for insights — use committed budget model
  // goals.monthly is real committed money (like rent) and must be part of planned spend
  const plannedTotal   = selectedCats.filter(k => (budget[k] ?? 0) > 0).reduce((s, k) => s + (budget[k] ?? 0), 0);
  const goalsMonthly   = goals.reduce((s, g) => s + (g.monthly ?? 0), 0);
  const extraLogged    = monthTxns.filter(t => t.type === "expense").reduce((s, t) => s + t.amount, 0);
  const effectiveSpend = plannedTotal + goalsMonthly + extraLogged;
  const effectiveSave  = totalIncome > 0 ? totalIncome - effectiveSpend : 0;

  // Story insights reflecting actual budget state
  const insights = useMemo(() => {
    const r: { icon: string; main: string; sub: string }[] = [];
    if (totalIncome > 0 && effectiveSpend > totalIncome)
      r.push({ icon: "💗", main: "Over income this month", sub: `Committed ${fmt(effectiveSpend, currency)} vs ${fmt(totalIncome, currency)} income — review your plan 🌸` });
    else if (extraLogged > 0)
      r.push({ icon: "🌸", main: `+${fmt(extraLogged, currency)} in extra spends`, sub: effectiveSave > 0 ? `${fmt(effectiveSave, currency)} still available` : "Budget is tight — take a soft pause ✿" });
    else if (plannedTotal > 0)
      r.push({ icon: "🌷", main: `${fmt(plannedTotal, currency)} committed`, sub: effectiveSave > 0 ? `${fmt(effectiveSave, currency)} available after plan` : "Income fully allocated" });
    if (goals.length > 0)
      r.push({ icon: "✨", main: `${goals.length} savings goal${goals.length > 1 ? "s" : ""} in progress`, sub: "You are amazing!" });
    if (r.length === 0)
      r.push({ icon: "🌸", main: "Start tracking to see your story", sub: "bloom here ✿" });
    return r.slice(0, 3);
  }, [effectiveSpend, extraLogged, effectiveSave, plannedTotal, goals, totalIncome, currency]);

  // Goals carousel (keep names: Income Garden, etc.)
  const clampedGoalIdx = goals.length > 0 ? Math.min(goalIdx, goals.length - 1) : 0;

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
  return (
    <div className="space-y-3 sm:space-y-4 animate-fade-in">

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
            <p className="text-[11px] text-emerald-600">Log extra spends to track what you bought on top of your plan.</p>
          </div>
          <button
            onClick={() => setSetupDismissed(true)}
            className="grid h-8 w-8 place-items-center rounded-full hover:bg-emerald-100 text-emerald-600 transition shrink-0"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* ③ STAT CARDS */}
      {(() => {
        const plannedBudget = selectedCats.filter(k => (budget[k] ?? 0) > 0).reduce((s, k) => s + (budget[k] ?? 0), 0);
        const realExpenses  = monthTxns.filter(t => t.type === "expense").reduce((s, t) => s + t.amount, 0);
        const goalsSaved    = goals.reduce((s, g) => s + (g.saved ?? 0), 0);
        return (
          <StatCards
            income={totalIncome}
            plannedBudget={plannedBudget}
            goalsMonthly={goalsMonthly}
            realExpenses={realExpenses}
            goalsSaved={goalsSaved}
            balance={totalBalance}
            currency={currency}
          />
        );
      })()}

      {/* ③b BUDGET VS REALITY */}
      {(() => {
        const budgetedCats = selectedCats.filter(k => (budget[k] ?? 0) > 0);
        if (budgetedCats.length === 0 && goalsMonthly === 0) return null;
        const totalPlanned = budgetedCats.reduce((s, k) => s + (budget[k] ?? 0), 0) + goalsMonthly;
        // EXTRA = ALL actual logged transactions (every "+ Spend" is extra on top of committed plan)
        const totalOverage = monthTxns.filter(t => t.type === "expense").reduce((s, t) => s + t.amount, 0);
        return (
          <Card>
            <div className="flex items-center justify-between mb-4">
              <h3 className="flex items-center gap-1.5 text-sm font-bold text-[#831843]">
                <Receipt className="h-4 w-4 text-[#EC4899]" strokeWidth={1.6} /> Budget vs Reality
              </h3>
              <button onClick={() => setTab("Budget Setup")} className="text-xs font-semibold text-[#EC4899] hover:underline inline-flex items-center gap-0.5">
                Edit <ChevronRight className="h-3 w-3" />
              </button>
            </div>
            <BudgetSummaryChart totalPlanned={totalPlanned} totalOverage={totalOverage} currency={currency} income={totalIncome} />

            {/* Per-category budget bars */}
            {(() => {
              const visibleBudgeted = budgetShowAll ? budgetedCats : budgetedCats.slice(0, 5);
              const unplanned = monthTxns
                .filter(t => t.type === "expense" && !budgetedCats.includes(t.catKey))
                .reduce<Record<string, number>>((acc, t) => { acc[t.catKey] = (acc[t.catKey] ?? 0) + t.amount; return acc; }, {});
              const unplannedEntries = Object.entries(unplanned);
              return (
                <div className="mt-4 space-y-3">
                  {visibleBudgeted.map(k => {
                    const cat = allCats.find(c => c.key === k);
                    const planned = budget[k] ?? 0;
                    const actual = monthTxns.filter(t => t.type === "expense" && t.catKey === k).reduce((s, t) => s + t.amount, 0);
                    // planned = committed/already spent → any logged extra = over budget
                    const isOver = actual > 0;
                    const overflowPct = planned > 0 ? Math.min(100, (actual / planned) * 100) : 0;
                    const status = actual > 0 ? "over" : null;
                    return (
                      <div key={k}>
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className="text-sm shrink-0">{cat?.emoji ?? "💰"}</span>
                            <span className="text-[11px] font-semibold text-[#831843] truncate">{cat?.label ?? k}</span>
                            {status === "over" && <span className="shrink-0 text-[9px] font-bold text-rose-600 bg-rose-100 rounded-full px-1.5 py-0.5">Over</span>}
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0 ml-2 tabular-nums">
                            {actual > 0 && (
                              <span className="text-[11px] font-bold text-rose-500">
                                +{fmt(actual, currency)} /
                              </span>
                            )}
                            <span className="text-[11px] font-semibold text-[#9D5C7E]">{fmt(planned, currency)}</span>
                          </div>
                        </div>
                        {/* Single bar: planned (hot pink) + extra (rose/red) side by side */}
                        {(() => {
                          const total = planned + actual;
                          const plannedPct = total > 0 ? (planned / total) * 100 : 100;
                          const extraPct   = total > 0 ? (actual  / total) * 100 : 0;
                          return (
                            <div className="flex h-3.5 rounded-full overflow-hidden">
                              <div className="h-full transition-all duration-700"
                                style={{ width: `${plannedPct}%`, background: "linear-gradient(90deg,#C084FC,#EC4899)" }} />
                              {actual > 0 && (
                                <div className="h-full transition-all duration-700"
                                  style={{ width: `${extraPct}%`, background: "linear-gradient(90deg,#F9A8D4,#F43F5E)" }} />
                              )}
                            </div>
                          );
                        })()}
                      </div>
                    );
                  })}

                  {budgetedCats.length > 5 && (
                    <button onClick={() => setBudgetShowAll(v => !v)}
                      className="w-full text-center text-xs font-bold text-[#EC4899] hover:underline py-0.5">
                      {budgetShowAll ? "Show less ↑" : `Show all ${budgetedCats.length} categories ↓`}
                    </button>
                  )}

                  {unplannedEntries.length > 0 && (
                    <div className="pt-2 border-t border-pink-100 space-y-3">
                      <p className="text-[9px] font-bold uppercase tracking-widest text-[#9D5C7E]">Unplanned spends</p>
                      {(() => {
                        const maxUnplanned = Math.max(...unplannedEntries.map(([, v]) => v), 1);
                        return unplannedEntries.map(([k, amt]) => {
                          const cat = allCats.find(c => c.key === k);
                          const pct = Math.min(100, (amt / maxUnplanned) * 100);
                          return (
                            <div key={k}>
                              <div className="flex items-center justify-between mb-1">
                                <div className="flex items-center gap-1.5 min-w-0">
                                  <span className="text-sm shrink-0">{cat?.emoji ?? "💰"}</span>
                                  <span className="text-[11px] font-semibold text-[#831843] truncate">{cat?.label ?? k}</span>
                                  <span className="shrink-0 text-[9px] font-bold text-[#EC4899] bg-pink-100 rounded-full px-1.5 py-0.5">New</span>
                                </div>
                                <span className="text-[11px] font-bold text-[#EC4899] tabular-nums shrink-0 ml-2">{fmt(amt, currency)}</span>
                              </div>
                              <div className="relative h-3.5 rounded-full overflow-hidden bg-pink-200/60">
                                <div className="absolute inset-y-0 left-0 rounded-full transition-all duration-700"
                                  style={{ width: `${pct}%`, background: "linear-gradient(90deg,#F9A8D4,#EC4899)" }} />
                              </div>
                            </div>
                          );
                        });
                      })()}
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Savings Goals bars — after category bars */}
            {goals.length > 0 && (
              <div className="mt-4 space-y-3">
                <div className="border-t border-pink-100 mb-3" />
                <p className="text-[9px] font-bold uppercase tracking-widest text-[#9D5C7E] flex items-center gap-1.5">
                  <Flag className="h-3 w-3" /> Savings Goals
                </p>
                {goals.map(g => {
                  const pct = g.target > 0 ? Math.min(100, (g.saved / g.target) * 100) : 0;
                  return (
                    <div key={g.id}>
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="shrink-0 text-[9px] font-bold text-violet-600 bg-violet-100 rounded-full px-1.5 py-0.5">{Math.round(pct)}%</span>
                          <span className="text-[11px] font-semibold text-[#831843] truncate">{g.name}</span>
                        </div>
                        <div className="flex items-center gap-0.5 shrink-0 ml-2 tabular-nums text-[11px]">
                          <span className="font-bold text-violet-600">{fmt(g.monthly, currency)}/mo</span>
                          <span className="text-[#9D5C7E] mx-0.5">·</span>
                          <span className="text-[#9D5C7E]">{fmt(g.target, currency)} goal</span>
                        </div>
                      </div>
                      <div className="relative h-3.5 rounded-full overflow-hidden bg-violet-100/50">
                        <div className="absolute inset-y-0 left-0 rounded-full transition-all duration-700"
                          style={{ width: `${pct}%`, background: "linear-gradient(90deg,#C084FC,#8B5CF6)" }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        );
      })()}

      {/* ③c SPENDING CATEGORIES */}
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
            {catSpend.length > 0 && (
              <button onClick={() => setTab("Reports")} className="text-xs font-semibold text-[#EC4899] hover:underline inline-flex items-center gap-0.5">
                See all <ChevronRight className="h-3 w-3" />
              </button>
            )}
          </div>
        </div>
        {catSpend.length > 0 ? (
          <div className="flex gap-3 overflow-x-auto pb-2">
            {catSpend.slice(0, 6).map(({ key, cat, amount: amt }) => {
              const plannedAmt = budget[key] ?? 0;
              const extra = monthTxns.filter(t => t.type === "expense" && t.catKey === key).reduce((s, t) => s + t.amount, 0);
              const isOver = plannedAmt > 0 && extra > 0;
              const isUnplanned = plannedAmt === 0;
              const overPct = isOver ? Math.round((extra / plannedAmt) * 100) : 0;
              const pinkPct = isOver ? (plannedAmt / (plannedAmt + extra)) * 100 : 100;
              return (
                <div key={key} className="shrink-0 flex flex-col items-center gap-1 w-16">
                  <div className={["grid h-11 w-11 place-items-center rounded-2xl text-xl shadow-sm border",
                    isOver ? "bg-rose-50 border-rose-200" : isUnplanned ? "bg-amber-50 border-amber-200" : "bg-pink-50 border-pink-100"
                  ].join(" ")}>
                    {cat?.emoji ?? "💰"}
                  </div>
                  <p className="text-[9px] font-semibold text-[#831843] text-center leading-tight line-clamp-2 w-full">{cat?.label ?? key}</p>
                  {/* two-part bar */}
                  <div className="flex w-full h-1.5 rounded-full overflow-hidden bg-pink-100">
                    {isUnplanned
                      ? <div className="h-full w-full rounded-full" style={{ background: "linear-gradient(90deg,#FCD34D,#F59E0B)" }} />
                      : <>
                          <div className="h-full transition-all duration-700"
                            style={{ width: `${pinkPct}%`, background: "linear-gradient(90deg,#C084FC,#EC4899)", borderRadius: isOver ? "9999px 0 0 9999px" : "9999px" }} />
                          {isOver && <div className="h-full flex-1 rounded-r-full" style={{ background: "linear-gradient(90deg,#FCA5A5,#EF4444)" }} />}
                        </>}
                  </div>
                  <p className={["text-[9px] font-bold", isOver ? "text-rose-500" : isUnplanned ? "text-amber-500" : "text-emerald-600"].join(" ")}>
                    {isUnplanned ? "New" : isOver ? `+${overPct}%` : "✓ Plan"}
                  </p>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex items-center gap-3 py-1">
            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#EC4899]/10 text-[#EC4899]">
              <ArrowDownRight className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-[#831843]">Log your first spend ✿</p>
              <p className="text-[11px] text-[#9D5C7E]">Track where your money goes — every spend counts</p>
            </div>
            <button onClick={() => setTab("Reports")} className="shrink-0 text-xs font-bold text-[#EC4899] hover:underline">
              Add
            </button>
          </div>
        )}
      </Card>

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
                    style={{ background: "linear-gradient(135deg, #BE185D 0%, #EC4899 35%, #F472B6 65%, #C084FC 100%)" }}>
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
                      <MiniRing pct={pct} size={88} />
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
                  style={{ background: "linear-gradient(135deg, #BE185D 0%, #EC4899 35%, #F472B6 65%, #C084FC 100%)" }}>
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


      {/* ⑥ THIS MONTH'S STORY + INCOME VS EXPENSES */}
      {(() => {
        const storyOver = totalIncome > 0 && effectiveSpend > totalIncome;
        const expenseBarColor = storyOver ? "#EF4444" : "#F9A8D4";
        const ringTone = storyOver ? "#EF4444" : "#EC4899";
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className={storyOver ? "bg-gradient-to-br from-red-50 to-rose-100 border-red-200" : ""}>
              <h3 className="flex items-center gap-1.5 text-sm font-bold text-[#831843] mb-3">
                <Sparkles className={`h-4 w-4 ${storyOver ? "text-red-500" : "text-[#EC4899]"}`} strokeWidth={1.6} />
                {viewPeriod === "week" ? "This week's story" : "This month's story"}
              </h3>
              <ul className="space-y-3">
                {insights.map((ins, i) => (
                  <li key={i} className="flex items-start gap-2.5">
                    <span className="text-base leading-none mt-0.5 shrink-0">{ins.icon}</span>
                    <div>
                      <p className={`text-sm font-semibold leading-snug ${storyOver && i === 0 ? "text-red-700" : "text-[#831843]"}`}>{ins.main}</p>
                      <p className={`text-[11px] ${storyOver && i === 0 ? "text-red-500" : "text-[#9D5C7E]"}`}>{ins.sub}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </Card>

            <Card className={storyOver ? "bg-gradient-to-br from-red-50 to-rose-100 border-red-200" : ""}>
              <div className="flex items-center justify-between mb-3">
                <h3 className={`text-sm font-bold ${storyOver ? "text-red-700" : "text-[#831843]"}`}>Income vs Expenses</h3>
                <div className="flex items-center gap-2 text-[10px] text-[#9D5C7E] font-semibold">
                  <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-[#EC4899] inline-block" /> Income</span>
                  <span className="flex items-center gap-1">
                    <span className="h-2 w-2 rounded-full inline-block transition-colors duration-500" style={{ background: expenseBarColor }} /> Expenses
                  </span>
                </div>
              </div>
              {totalIncome === 0 && effectiveSpend === 0 ? (
                <EmptyState Icon={TrendingUp} text="Add income and log expenses to see comparison." compact />
              ) : (
                <div className="flex items-center gap-4">
                  <div className="flex-1 flex items-end gap-3">
                    {(["income", "expenses"] as const).map(type => {
                      const val = type === "income" ? totalIncome : effectiveSpend;
                      const maxVal = Math.max(totalIncome, effectiveSpend, 1);
                      const barPx = Math.max(4, Math.round((val / maxVal) * 80));
                      const barColor = type === "income" ? "#EC4899" : expenseBarColor;
                      return (
                        <div key={type} className="flex-1 flex flex-col items-center gap-1">
                          <span className={`text-[10px] font-bold ${storyOver && type === "expenses" ? "text-red-700" : "text-[#831843]"}`}>{fmt(val, currency)}</span>
                          <div className="relative w-full" style={{ height: 80 }}>
                            <div className="absolute bottom-0 left-0 right-0 rounded-t-xl transition-all duration-700"
                              style={{ height: barPx, background: barColor }} />
                          </div>
                          <span className={`text-[10px] font-semibold capitalize ${storyOver && type === "expenses" ? "text-red-500" : "text-[#9D5C7E]"}`}>{type}</span>
                        </div>
                      );
                    })}
                  </div>
                  {totalIncome > 0 && (
                    <div className="shrink-0 text-center">
                      <HealthRing
                        pct={Math.min(100, (effectiveSpend / totalIncome) * 100)}
                        label=""
                        tone={ringTone}
                        size={120}
                      />
                      <p className={`text-[10px] font-semibold -mt-2 ${storyOver ? "text-red-500" : "text-[#9D5C7E]"}`}>of income spent</p>
                    </div>
                  )}
                </div>
              )}
            </Card>
          </div>
        );
      })()}

      {/* SPENDING HISTORY */}
      {(() => {
        const budgetedCats = selectedCats.filter(k => (budget[k] ?? 0) > 0);
        const totalPlanned = budgetedCats.reduce((s, k) => s + (budget[k] ?? 0), 0) + goalsMonthly;
        if (totalPlanned === 0) return null;
        return (
          <Card>
            <div className="flex items-center justify-between mb-3">
              <h3 className="flex items-center gap-1.5 text-sm font-bold text-[#831843]">
                <TrendingUp className="h-4 w-4 text-[#EC4899]" strokeWidth={1.6} />
                Spending History
              </h3>
              <span className="text-[10px] text-[#9D5C7E] font-semibold">
                {new Date().toLocaleString("default", { month: "long", year: "numeric" })}
              </span>
            </div>
            <BudgetHistorique
              planned={totalPlanned}
              extraTxns={monthTxns.filter(t => t.type === "expense")}
              currency={currency}
              income={totalIncome}
            />
          </Card>
        );
      })()}

      {/* 6-MONTH OVERVIEW */}
      {(txns.length > 0 || totalIncome > 0 || selectedCats.some(k => (budget[k] ?? 0) > 0)) && (() => {
        const plannedBudget = selectedCats.filter(k => (budget[k] ?? 0) > 0).reduce((s, k) => s + (budget[k] ?? 0), 0);
        return (
          <Card>
            <div className="flex items-center justify-between mb-3">
              <h3 className="flex items-center gap-1.5 text-sm font-bold text-[#831843]">
                <TrendingUp className="h-4 w-4 text-[#EC4899]" strokeWidth={1.6} />
                6-Month Overview
              </h3>
              <span className="text-[10px] text-[#9D5C7E] font-semibold">spend vs income trend</span>
            </div>
            <MonthlyPatternsChart
              txns={txns}
              plannedBudget={plannedBudget + goalsMonthly}
              income={totalIncome}
              currency={currency}
            />
          </Card>
        );
      })()}

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
      <div className="flex justify-end">
        <PrimaryBtn onClick={add}><Plus className="h-4 w-4" /> Add Income</PrimaryBtn>
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
  setTxns: (v: Txn[]) => void;
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
        <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-1.5">
          {allCats.map(c => {
            const on = selectedCats.includes(c.key);
            return (
              <button key={c.key} onClick={() => toggle(c.key)}
                className={[
                  "flex flex-col items-center gap-0.5 rounded-xl p-1.5 sm:p-2.5 lg:p-2 text-sm font-semibold transition-all duration-200 border-[0.5px]",
                  on ? "bg-[#EC4899] text-white border-transparent shadow-md shadow-pink-400/30 scale-[1.02]"
                     : "bg-white/80 text-[#831843] border-pink-300/40 hover:bg-pink-50",
                ].join(" ")}
              >
                <c.Icon className={`h-4 w-4 sm:h-5 sm:w-5 ${on ? "text-white" : "text-[#EC4899]"}`} strokeWidth={1.6} />
                <span className="text-center leading-tight text-[9px] sm:text-[11px]">{c.label}</span>
              </button>
            );
          })}
          <button onClick={() => setShowCustom(v => !v)}
            className="flex flex-col items-center justify-center gap-0.5 rounded-xl p-1.5 sm:p-2.5 text-sm font-semibold border-[0.5px] border-dashed border-pink-400/60 text-[#EC4899] bg-pink-50/40 hover:bg-pink-100">
            <Plus className="h-4 w-4 sm:h-5 sm:w-5" />
            <span className="text-[9px] sm:text-[11px]">Custom</span>
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
            <button
              onClick={() => { if (window.confirm("Reset everything? This will clear your budget setup AND all recorded transactions.")) { setBudget({}); setSelectedCats([]); props.setTxns([]); } }}
              className="text-xs font-semibold text-[#9D5C7E] border border-pink-200 rounded-full px-3 py-1.5 hover:bg-pink-50 transition active:scale-95">
              Reset
            </button>
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
                <li key={k} className="flex items-center gap-2 rounded-xl bg-pink-50/40 px-2.5 py-2">
                  <c.Icon className="h-4 w-4 shrink-0 text-[#EC4899]" strokeWidth={1.6} />
                  <span className="flex-1 min-w-0 truncate text-xs sm:text-sm font-semibold text-[#831843]">{c.label}</span>
                  <div className="w-20 sm:w-28 shrink-0">
                    <Input type="number" value={budget[k] || ""} placeholder="0"
                      onChange={(e) => setBudget(prev => ({ ...prev, [k]: parseFloat(e.target.value) || 0 }))} />
                  </div>
                  {sugg > 0 && (
                    <span className="shrink-0 text-[10px] font-bold text-[#EC4899] hidden sm:block whitespace-nowrap">
                      {fmt(sugg, currency)}
                    </span>
                  )}
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
      <div className="flex justify-end">
        <PrimaryBtn onClick={() => setShowAdd(v => !v)}><Plus className="h-4 w-4" /> Add Goal</PrimaryBtn>
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
  incomes: Income[]; budget: Budget; selectedCats: string[];
  month: { y: number; m: number };
  setMonth: (v: { y: number; m: number } | ((p: { y: number; m: number }) => { y: number; m: number })) => void;
}) {
  const { txns, setTxns, bills, setBills, allCats, currency, incomes, budget, selectedCats, month, setMonth } = props;
  const [sortBy, setSortBy] = useState<"date" | "amount">("date");
  const [filterCat, setFilterCat] = useState("");
  const [filterMood, setFilterMood] = useState("");

  type LKind = "income" | "planned" | "extra";
  interface LedgerRow {
    id: string; kind: LKind; date: string; catKey: string;
    amount: number; description: string; mood?: MoodKey; type: "income" | "expense";
  }

  const ledger = useMemo((): LedgerRow[] => {
    const monthFirst = `${month.y}-${String(month.m + 1).padStart(2, "0")}-01`;
    const rows: LedgerRow[] = [];
    incomes.forEach(inc => rows.push({
      id: `vi_${inc.id}`, kind: "income", date: monthFirst,
      catKey: "__income__", amount: toMonthly(inc), description: inc.source, type: "income",
    }));
    selectedCats.forEach(k => {
      const amt = budget[k] ?? 0;
      if (amt > 0) rows.push({
        id: `vb_${k}`, kind: "planned", date: monthFirst,
        catKey: k, amount: amt, description: "Planned budget", type: "expense",
      });
    });
    txns.forEach(t => {
      const d = new Date(t.date);
      if (d.getFullYear() === month.y && d.getMonth() === month.m)
        rows.push({ id: t.id, kind: "extra", date: t.date, catKey: t.catKey, amount: t.amount, description: t.description, mood: t.mood, type: t.type });
    });
    let list = rows;
    if (filterCat) list = list.filter(e => e.catKey === filterCat);
    if (filterMood) list = list.filter(e => e.kind !== "extra" || e.mood === filterMood);
    list.sort((a, b) => sortBy === "amount" ? b.amount - a.amount : (a.date < b.date ? 1 : -1));
    return list;
  }, [txns, month, sortBy, filterCat, filterMood, incomes, budget, selectedCats]);

  const ledgerStats = useMemo(() => {
    const incomeTotal = incomes.reduce((s, inc) => s + toMonthly(inc), 0);
    const plannedTotal = selectedCats.reduce((s, k) => s + (budget[k] ?? 0), 0);
    const extraTotal = txns.filter(t => {
      const d = new Date(t.date);
      return d.getFullYear() === month.y && d.getMonth() === month.m && t.type === "expense";
    }).reduce((s, t) => s + t.amount, 0);
    return { incomeTotal, plannedTotal, extraTotal };
  }, [incomes, selectedCats, budget, txns, month]);

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
      <div className="flex items-center justify-end gap-2">
        <button onClick={() => shiftMonth(-1)} className="grid h-8 w-8 place-items-center rounded-full bg-[#FCE7F3] text-[#9D5C7E] hover:bg-pink-200 transition">
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className="text-sm font-semibold text-[#831843] min-w-[100px] text-center">
          {new Date(month.y, month.m).toLocaleString(undefined, { month: "long", year: "numeric" })}
        </span>
        <button onClick={() => shiftMonth(1)} className="grid h-8 w-8 place-items-center rounded-full bg-[#FCE7F3] text-[#9D5C7E] hover:bg-pink-200 transition">
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      <Card>
        <div className="flex items-center justify-between gap-2 mb-2">
          <h3 className="font-script text-xl text-[#831843]">All Operations</h3>
          <span className="text-[10px] font-semibold text-[#9D5C7E]">{ledger.length} operation{ledger.length !== 1 ? "s" : ""}</span>
        </div>

        {/* Monthly summary chips */}
        <div className="flex gap-2 flex-wrap mb-3">
          <div className="flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-1">
            <ArrowUpRight className="h-3 w-3 text-emerald-600" />
            <span className="text-[10px] font-bold text-emerald-700">{fmt(ledgerStats.incomeTotal, currency)}</span>
            <span className="text-[9px] text-emerald-500">income</span>
          </div>
          <div className="flex items-center gap-1 rounded-full bg-violet-50 border border-violet-200 px-2.5 py-1">
            <span className="text-[9px] text-violet-500">✦</span>
            <span className="text-[10px] font-bold text-violet-700">{fmt(ledgerStats.plannedTotal, currency)}</span>
            <span className="text-[9px] text-violet-500">planned</span>
          </div>
          <div className="flex items-center gap-1 rounded-full bg-rose-50 border border-rose-200 px-2.5 py-1">
            <ArrowDownRight className="h-3 w-3 text-rose-500" />
            <span className="text-[10px] font-bold text-rose-700">{fmt(ledgerStats.extraTotal, currency)}</span>
            <span className="text-[9px] text-rose-400">extra</span>
          </div>
        </div>

        {/* filters — single scrollable row */}
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar mb-3 pb-0.5">
          <div className="shrink-0 w-28">
            <PinkSelect value={sortBy} onChange={(v) => setSortBy(v as "date" | "amount")}
              options={[{ value: "date", label: "Sort: Date" }, { value: "amount", label: "Sort: Amount" }]} />
          </div>
          <div className="shrink-0 w-32">
            <PinkSelect value={filterCat} onChange={setFilterCat}
              options={[
                { value: "", label: "All operations" },
                ...(incomes.length > 0 ? [{ value: "__income__", label: "💰 Income" }] : []),
                ...allCats.map(c => ({ value: c.key, label: c.label })),
              ]} />
          </div>
          <div className="shrink-0 w-24">
            <PinkSelect value={filterMood} onChange={setFilterMood}
              options={[{ value: "", label: "All moods" }, ...MOODS.map(m => ({ value: m.key, label: m.label }))]} />
          </div>
        </div>

        {ledger.length === 0 ? (
          <EmptyState Icon={Receipt} title="No operations this month" text="Add income, set up your budget, or log a spend to see all operations here." />
        ) : (
          <ul className="divide-y divide-pink-100">
            {ledger.map(entry => {
              const c = allCats.find(x => x.key === entry.catKey);
              const mood = entry.mood ? MOODS.find(m => m.key === entry.mood) : undefined;
              const isIncome = entry.kind === "income";
              const isPlanned = entry.kind === "planned";
              const isExtra = entry.kind === "extra";
              const iconBg = isIncome ? "bg-emerald-100" : isPlanned ? "bg-violet-100" : "bg-pink-100";
              const iconColor = isIncome ? "text-emerald-600" : isPlanned ? "text-violet-500" : "text-[#EC4899]";
              const amtColor = isIncome ? "text-emerald-700" : isPlanned ? "text-violet-700" : "text-[#831843]";
              return (
                <li key={entry.id} className="flex items-center gap-2.5 py-2.5">
                  <div className={`shrink-0 grid h-8 w-8 place-items-center rounded-full ${iconBg}`}>
                    {isIncome
                      ? <Wallet className={`h-4 w-4 ${iconColor}`} strokeWidth={1.6} />
                      : c ? <c.Icon className={`h-4 w-4 ${iconColor}`} strokeWidth={1.6} />
                        : <Wallet className={`h-4 w-4 ${iconColor}`} strokeWidth={1.6} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-xs font-bold text-[#831843] truncate">
                        {isIncome ? entry.description : (c?.label ?? entry.catKey)}
                      </span>
                      {isIncome && (
                        <span className="shrink-0 inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[9px] font-semibold border bg-emerald-50 text-emerald-700 border-emerald-200">
                          <ArrowUpRight className="h-2.5 w-2.5" />Income
                        </span>
                      )}
                      {isPlanned && (
                        <span className="shrink-0 inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[9px] font-semibold border bg-violet-50 text-violet-600 border-violet-200">
                          ✦ Planned
                        </span>
                      )}
                      {isExtra && mood && (
                        <span className={`shrink-0 inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[9px] font-semibold border ${mood.tone}`}>
                          <mood.Icon className="h-2.5 w-2.5" />{mood.label}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="text-[10px] text-[#9D5C7E]">{entry.date}</span>
                      {isPlanned && <span className="text-[9px] text-violet-400">· monthly allocation</span>}
                      {isExtra && entry.description && <span className="text-[10px] text-[#9D5C7E] truncate">· {entry.description}</span>}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-0.5 shrink-0">
                    <span className={`text-sm font-bold ${amtColor}`}>
                      {isIncome ? "+" : "-"}{fmt(entry.amount, currency)}
                    </span>
                    <div className="flex items-center gap-1.5">
                      {isExtra && (
                        <span className="inline-flex items-center text-rose-500 text-[9px] font-semibold gap-0.5">
                          <ArrowDownRight className="h-2.5 w-2.5" />Extra
                        </span>
                      )}
                      {isExtra && (
                        <button onClick={() => setTxns(prev => prev.filter(x => x.id !== entry.id))} className="text-rose-400 hover:text-rose-600 transition">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
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