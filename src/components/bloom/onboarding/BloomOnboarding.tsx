import { useState, useEffect, type ReactNode } from "react";
import {
  ChevronLeft, ArrowRight, Heart, Dumbbell, Salad, Fish, Beef, Sprout, Utensils,
  Footprints, BarChart3, Star, Scale, Ruler, Cake, Minus, Plus, Check, Bell, Clock,
  Smartphone, Tablet, Laptop, Pill, Sparkles, CalendarHeart, ChevronRight, Circle,
  Moon, CalendarDays, Cloud, Smile, CloudRain, Battery, Droplets, Lock, Flower2, Flame,
  Play, Brain, Zap, Pencil, X, Timer, Gauge, Users,
} from "lucide-react";
import { BloomFlower } from "../BloomFlower";
import { useAuth } from "@/contexts/AuthContext";
import {
  writeCycleSettings, DEFAULT_CYCLE_SETTINGS, readCyclePhase,
} from "../cyclePhase";
import type { ContraceptiveMethod } from "../PeriodSetup";
import {
  updateDietProfile, DIET_SETUP_KEY, RECIPES, recipeImageSrc, type DietGoal, type DietRegime, type DietType,
} from "../recipes/data";
import { computeTargets } from "@/lib/nutritionTargets";
import type { WorkoutProfile, Level, Goal as WorkoutGoal } from "../workout/data";
import {
  WORKOUT_PROFILE_KEY, WORKOUT_PROGRAM_KEY, YOGA_SCHEDULE_KEY, YOGA_FOCUS,
  TODAY_WATER_KEY, writeTodayMood, toggleSymptomForDay, SYMPTOM_OPTIONS,
} from "@/lib/crossToolData";
import { setSleepQuality, setSleepHours } from "@/lib/sleepLog";
import { todayISO } from "@/lib/localDate";
import { openCheckout } from "@/lib/paddle";
import { setOnboarded, endGuide } from "@/lib/guidedSetup";

/* ══════════════════════════════════════════════════════════════════════════
   Bloomzein onboarding — the full "Let's make Bloomzein yours" post-signup flow.
   Collects every question the Today setup needs + a first daily check-in, sets
   up EVERY tool from her answers, teases the personalized plan, then presents
   Bloom+ — before dropping her on a Today that's already logged & planned.
   Design mirrors the welcome pages (Playfair serif + script, luxe pink CTA).
   ══════════════════════════════════════════════════════════════════════════ */

const SERIF = '"Playfair Display", Georgia, serif';

// ── answer model ────────────────────────────────────────────────────────────
type FoodStyle = "balanced" | "mediterranean" | "high-protein" | "plant-based" | "flexible";
interface Answers {
  lastPeriod: Date; cycleLength: number; periodLength: number;
  weight: number; height: number; age: number; targetWeight: number;
  goal: DietGoal; foodStyle: FoodStyle; level: Level | "custom";
  contraceptive: ContraceptiveMethod; reminderTime: string; notifications: boolean;
  mood: string; symptoms: string[]; sleepQ: number; sleepH: number; water: number;
}
const DEFAULT_ANSWERS: Answers = {
  lastPeriod: new Date(), cycleLength: 28, periodLength: 5,
  weight: 65, height: 165, age: 30, targetWeight: 60,
  goal: "lose", foodStyle: "balanced", level: "Beginner" as Level,
  contraceptive: "pill", reminderTime: "20:00", notifications: true,
  mood: "happy", symptoms: [], sleepQ: 4, sleepH: 7, water: 4,
};

const FOOD_MAP: Record<FoodStyle, { dietType: DietType; regime: DietRegime }> = {
  balanced: { dietType: "omnivore", regime: "balanced" },
  mediterranean: { dietType: "omnivore", regime: "mediterranean" },
  "high-protein": { dietType: "omnivore", regime: "high-protein" },
  "plant-based": { dietType: "vegan", regime: "vegan" },
  flexible: { dietType: "omnivore", regime: "balanced" },
};
const GOAL_TO_WORKOUT: Record<DietGoal, WorkoutGoal> = { lose: "tonify", maintain: "energy", gain: "strengthen" };
const YOGA_SEED: Record<string, string | null> = {
  Mon: "Cycle sync", Tue: null, Wed: "Stress relief", Thu: null, Fri: "Full-body flow", Sat: null, Sun: "Sleep prep",
};

// ── option data ─────────────────────────────────────────────────────────────
const GOALS: { key: DietGoal; title: string; desc: string; Icon: typeof Heart }[] = [
  { key: "lose", title: "Lose weight", desc: "Feel lighter, stronger and more confident in your body.", Icon: Sparkles },
  { key: "maintain", title: "Maintain", desc: "Keep your balance and feel good in your body.", Icon: Heart },
  { key: "gain", title: "Gain & tone", desc: "Build a stronger, healthier and more toned you.", Icon: Dumbbell },
];
const FOODS: { key: FoodStyle; title: string; desc: string; Icon: typeof Heart }[] = [
  { key: "balanced", title: "Balanced", desc: "A mix of everything. Simple, nutritious and sustainable.", Icon: Salad },
  { key: "mediterranean", title: "Mediterranean", desc: "Fresh, colorful and inspired by Mediterranean cuisine.", Icon: Fish },
  { key: "high-protein", title: "High-Protein", desc: "Focus on protein to help you feel full and build lean muscle.", Icon: Beef },
  { key: "plant-based", title: "Plant-Based", desc: "Mostly plant-based meals with no meat or fish.", Icon: Sprout },
  { key: "flexible", title: "Flexible", desc: "I like variety and don't follow a specific style.", Icon: Utensils },
];
const LEVELS: { key: Level | "custom"; title: string; desc: string; Icon: typeof Heart }[] = [
  { key: "Beginner" as Level, title: "Beginner", desc: "I'm new to exercise or getting back into it.", Icon: Footprints },
  { key: "Intermediate" as Level, title: "Intermediate", desc: "I exercise sometimes and want to be more consistent.", Icon: Dumbbell },
  { key: "Advanced" as Level, title: "Advanced", desc: "I exercise regularly and want to level up.", Icon: BarChart3 },
  { key: "custom", title: "Custom", desc: "I prefer to set my own plan later.", Icon: Star },
];
const MOODS: { key: string; label: string; Icon: typeof Heart }[] = [
  { key: "calm", label: "Calm", Icon: Cloud }, { key: "happy", label: "Happy", Icon: Smile },
  { key: "energetic", label: "Energetic", Icon: Sparkles }, { key: "sensitive", label: "Sensitive", Icon: Heart },
  { key: "sad", label: "Sad", Icon: CloudRain }, { key: "tired", label: "Tired", Icon: Battery },
];

// per-phase copy for the personalized plan reveal
const PHASE_INFO: Record<string, { title: string; blurb: string; feels: { Icon: typeof Heart; l: string }[]; quote: string }> = {
  menstrual: {
    title: "Menstrual Phase",
    blurb: "Your body is resting and renewing. Honour it with gentle movement, warmth and nourishing food — rest is productive too.",
    feels: [{ Icon: Battery, l: "Low Energy" }, { Icon: Heart, l: "Reflective" }, { Icon: Moon, l: "Need Rest" }, { Icon: Droplets, l: "Cramps" }],
    quote: "This is your reset week — slow down, keep warm and be extra kind to yourself.",
  },
  follicular: {
    title: "Follicular Phase",
    blurb: "Your energy is rising, your mood is brighter and your body is ready to build. It's the perfect time to focus on strength, healthy habits and progress towards your goals.",
    feels: [{ Icon: Zap, l: "High Energy" }, { Icon: Smile, l: "Positive Mood" }, { Icon: Brain, l: "Better Focus" }, { Icon: Heart, l: "Rising Libido" }],
    quote: "This week, you're likely to feel more motivated, confident and productive. Use this energy to move your body, nourish yourself and go after your goals!",
  },
  ovulatory: {
    title: "Ovulatory Phase",
    blurb: "You're at your peak — energy, confidence and strength are high. Channel it into your boldest workouts and your brightest social days.",
    feels: [{ Icon: Flame, l: "Peak Energy" }, { Icon: Smile, l: "Confident" }, { Icon: Sparkles, l: "Social" }, { Icon: Heart, l: "High Libido" }],
    quote: "You're glowing this week — take on challenges, connect with people and enjoy feeling your strongest.",
  },
  luteal: {
    title: "Luteal Phase",
    blurb: "Your energy is winding down as your body prepares to rest. Focus on steady movement, magnesium-rich food and calming self-care.",
    feels: [{ Icon: Battery, l: "Winding Down" }, { Icon: CloudRain, l: "Moodier" }, { Icon: Droplets, l: "Cravings" }, { Icon: Moon, l: "Slower" }],
    quote: "Be gentle with yourself this week — steady habits, cozy self-care and good food keep you balanced.",
  },
};

const QUESTION_STEPS = ["cycle", "about", "goal", "food", "fitness", "prefs", "checkin"] as const;

// ══ shared chrome ══════════════════════════════════════════════════════════
// Motifs behind everything (fixed, full-bleed on every breakpoint).
function Motifs() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 overflow-hidden">
      {[["8%", "18%", 26, 0.10], ["86%", "30%", 34, 0.09], ["12%", "72%", 30, 0.08], ["90%", "82%", 22, 0.10]].map(([l, t, s, o], i) => (
        <Heart key={i} className="absolute" fill="#EC4899"
          style={{ left: l as string, top: t as string, width: s as number, height: s as number, opacity: o as number, transform: `rotate(${i * 24 - 20}deg)` }} />
      ))}
    </div>
  );
}
// Desktop-only left hero panel — turns the onboarding into a large, screen-
// filling two-panel frame on laptop (like the welcome), while phone/tablet keep
// the single-column layout untouched (everything here is `lg:`-only).
function HeroPanel({ tagline }: { tagline: string }) {
  return (
    <div className="hidden md:relative md:flex md:flex-1 md:min-h-[30rem] lg:min-h-[34rem] md:flex-col md:justify-end md:overflow-hidden md:p-7 lg:p-9 xl:p-12">
      <img src="/images/page-bg-today-morning.webp" alt="" className="absolute inset-0 h-full w-full object-cover object-[62%_18%]" />
      <div className="absolute inset-0" style={{ background: "linear-gradient(180deg, rgba(255,236,246,0.15) 0%, rgba(160,20,90,0.15) 45%, rgba(140,15,80,0.5) 100%)" }} />
      <div className="relative">
        <div className="inline-flex items-center gap-2"><span className="font-script text-[2rem] lg:text-[2.4rem] xl:text-[3rem] leading-none text-white drop-shadow-[0_2px_10px_rgba(120,8,60,0.5)]">Bloomzein</span><BloomFlower size={28} petal="#FFFFFF" center="#EC4899" /></div>
        <p className="mt-1 text-[14px] xl:text-[16px] font-bold text-white/90 drop-shadow">stay soft, bloom on.</p>
        <p className="mt-5 font-script text-[1.5rem] lg:text-[1.9rem] xl:text-[2.5rem] leading-tight text-white drop-shadow-[0_2px_12px_rgba(120,8,60,0.55)]">{tagline} ♡</p>
      </div>
    </div>
  );
}
// The screen frame: single scrolling column on phone/tablet; a big centered
// two-panel card (hero + content) on laptop.
function Frame({ children }: { children: ReactNode }) {
  return (
    <div className="fixed inset-0 z-[95] overflow-y-auto flex justify-center md:items-center lg:items-start"
      style={{ background: "radial-gradient(120% 90% at 50% 0%, #FFF0F7 0%, #FFE0EF 42%, #FCC7E1 100%)" }}>
      <Motifs />
      {/* tablet & laptop: a centered two-panel card whose HEIGHT follows the content
          (no inner scrollbar), grows with the screen, and puts the photo on the right.
          Phone keeps the single full-bleed scrolling column. */}
      <div className="relative flex min-h-full w-full max-w-md flex-col md:min-h-0 md:my-[4vh] md:h-auto md:w-[92vw] md:max-w-[50rem] lg:max-w-[82rem] xl:max-w-[94rem] 2xl:max-w-[108rem] md:flex-row-reverse md:overflow-hidden md:rounded-[2.5rem] md:bg-white/45 md:shadow-[0_30px_90px_rgba(236,72,153,0.22)] md:ring-1 md:ring-white/60 md:backdrop-blur-sm">
        {children}
      </div>
    </div>
  );
}

function Shell({ step, total, onBack, footer, children }: {
  step: number | null; total: number; onBack?: () => void; footer: string; children: ReactNode;
}) {
  return (
    <Frame>
      <HeroPanel tagline="A few little steps to a life that feels like you" />
      <div className="relative flex flex-1 flex-col px-5 pb-8 md:flex-none md:w-[26rem] md:px-8 md:py-8 lg:w-[38rem] xl:w-[42rem] lg:px-10 lg:py-9"
        style={{ paddingTop: "max(1rem, env(safe-area-inset-top))" }}>
        <div className="flex items-center justify-between py-2">
          {onBack ? <button onClick={onBack} className="inline-flex items-center gap-1 text-hotpink font-bold active:scale-95 transition"><ChevronLeft className="h-5 w-5" /> Back</button> : <span className="w-14" />}
          <div className="text-center leading-none">
            <div className="inline-flex items-center gap-1.5"><span className="font-script text-2xl text-hotpink leading-none">Bloomzein</span><BloomFlower size={18} petal="#EC4899" center="#FFFFFF" /></div>
            <p className="mt-0.5 text-[11px] font-bold text-hotpink/80">stay soft, bloom on.</p>
          </div>
          {step !== null ? <span className="w-14 text-right text-[13px] font-bold text-hotpink/60 tabular-nums">{step + 1}/{total}</span> : <span className="w-14" />}
        </div>
        {step !== null && (
          <div className="mt-1 mb-4 flex items-center gap-1.5">
            {Array.from({ length: total }).map((_, i) => (
              <div key={i} className="flex flex-1 items-center gap-1.5">
                <span className={["grid h-3.5 w-3.5 shrink-0 place-items-center rounded-full transition-all", i <= step ? "bg-hotpink shadow-[0_2px_8px_rgba(236,72,153,0.5)]" : "bg-white/70 ring-1 ring-hotpink/25"].join(" ")}>
                  {i < step && <Check className="h-2 w-2 text-white" strokeWidth={4} />}
                </span>
                {i < total - 1 && <span className={["h-[3px] flex-1 rounded-full", i < step ? "bg-hotpink" : "bg-white/60"].join(" ")} />}
              </div>
            ))}
          </div>
        )}
        <div className="flex-1">{children}</div>
        <div className="mt-6 flex items-end justify-between">
          <p className="font-script text-lg text-hotpink/80 leading-tight max-w-[9rem]">{footer} ♡</p>
          <div className="inline-flex items-center gap-1.5 md:hidden"><BloomFlower size={18} petal="#EC4899" center="#FFFFFF" /><span className="text-[11px] font-bold text-hotpink/80">stay soft, bloom on.</span></div>
        </div>
      </div>
    </Frame>
  );
}

function Eyebrow({ children }: { children: ReactNode }) {
  return <p className="text-[13px] font-extrabold uppercase tracking-[0.22em] text-hotpink/70">{children}</p>;
}
function Title({ serif, script }: { serif: string; script: string }) {
  return (
    <h1 className="mt-1 leading-[0.95]">
      <span className="block text-[2.15rem] font-bold text-[#7a1247]" style={{ fontFamily: SERIF }}>{serif}</span>
      <span className="inline-flex items-end gap-1.5 font-script text-[2.3rem] text-hotpink leading-[0.9]">{script} <Heart className="mb-1 h-6 w-6 text-hotpink" strokeWidth={2.4} /></span>
    </h1>
  );
}
function Sub({ children }: { children: ReactNode }) { return <p className="mt-1.5 text-[14px] leading-snug text-rose/70">{children}</p>; }

function OptionCard({ Icon, title, desc, selected, onClick }: { Icon: typeof Heart; title: string; desc: string; selected: boolean; onClick: () => void; }) {
  return (
    <button onClick={onClick} className={["group flex w-full items-center gap-3 rounded-[1.25rem] border p-2.5 text-left transition active:scale-[0.99]", selected ? "border-hotpink bg-white ring-2 ring-hotpink/30 shadow-[0_8px_24px_rgba(236,72,153,0.16)]" : "border-white/70 bg-white/70 hover:bg-white/90"].join(" ")}>
      <span className={["grid h-11 w-11 shrink-0 place-items-center rounded-full", selected ? "bg-hotpink/15" : "bg-hotpink/10"].join(" ")}><Icon className="h-6 w-6 text-hotpink" strokeWidth={1.9} /></span>
      <span className="min-w-0 flex-1"><span className="block text-[16px] font-extrabold text-hotpink leading-tight">{title}</span><span className="mt-0.5 block text-[12.5px] leading-snug text-rose/75">{desc}</span></span>
      <span className={["grid h-5 w-5 shrink-0 place-items-center rounded-full border-2", selected ? "border-hotpink" : "border-hotpink/40"].join(" ")}>{selected && <span className="h-2.5 w-2.5 rounded-full bg-hotpink" />}</span>
    </button>
  );
}
function Stepper({ Icon, label, desc, value, unit, min, max, step = 1, onChange }: { Icon: typeof Heart; label: string; desc: string; value: number; unit: string; min: number; max: number; step?: number; onChange: (v: number) => void; }) {
  return (
    <div className="rounded-[1.25rem] border border-white/70 bg-white/70 p-3">
      <div className="flex items-start gap-2.5"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-hotpink/10"><Icon className="h-5 w-5 text-hotpink" strokeWidth={1.9} /></span><div className="flex-1"><p className="text-[14px] font-extrabold text-hotpink leading-tight">{label}</p><p className="mt-0.5 text-[11.5px] leading-snug text-rose/70">{desc}</p></div></div>
      <div className="mt-2.5 flex items-center justify-between rounded-full bg-white/80 p-1 ring-1 ring-hotpink/15">
        <button onClick={() => onChange(Math.max(min, value - step))} className="grid h-8 w-8 place-items-center rounded-full bg-hotpink/10 text-hotpink active:scale-90 transition"><Minus className="h-4 w-4" strokeWidth={3} /></button>
        <span className="text-[17px] font-extrabold text-rose tabular-nums">{value} {unit}</span>
        <button onClick={() => onChange(Math.min(max, value + step))} className="grid h-8 w-8 place-items-center rounded-full bg-hotpink text-white active:scale-90 transition"><Plus className="h-4 w-4" strokeWidth={3} /></button>
      </div>
    </div>
  );
}
function ContinueBtn({ onClick, label = "Continue" }: { onClick: () => void; label?: string }) {
  return <button onClick={onClick} className="bloom-luxury-btn animate-cta-bounce mt-4 flex w-full items-center justify-center gap-2 py-3 text-[16px] font-bold text-white">{label} <ArrowRight className="h-5 w-5" /></button>;
}
function MiniCalendar({ value, onPick }: { value: Date; onPick: (d: Date) => void }) {
  const [view, setView] = useState(new Date(value.getFullYear(), value.getMonth(), 1));
  const y = view.getFullYear(), m = view.getMonth();
  const first = new Date(y, m, 1).getDay();
  const days = new Date(y, m + 1, 0).getDate();
  const cells: (number | null)[] = [...Array(first).fill(null), ...Array.from({ length: days }, (_, i) => i + 1)];
  const label = view.toLocaleString("en-US", { month: "long", year: "numeric" });
  const isToday = (d: number) => { const t = new Date(); return t.getFullYear() === y && t.getMonth() === m && t.getDate() === d; };
  const sel = (d: number) => value.getFullYear() === y && value.getMonth() === m && value.getDate() === d;
  return (
    <div className="rounded-2xl bg-white/85 p-3 ring-1 ring-hotpink/15">
      <div className="flex items-center justify-between px-1"><button onClick={() => setView(new Date(y, m - 1, 1))} className="grid h-8 w-8 place-items-center rounded-full text-hotpink active:scale-90"><ChevronLeft className="h-5 w-5" /></button><span className="text-[15px] font-extrabold text-rose">{label}</span><button onClick={() => setView(new Date(y, m + 1, 1))} className="grid h-8 w-8 place-items-center rounded-full text-hotpink active:scale-90"><ChevronRight className="h-5 w-5" /></button></div>
      <div className="mt-2 grid grid-cols-7 gap-0.5 text-center text-[10px] font-bold uppercase text-hotpink/50">{["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => <span key={d}>{d.slice(0, 3)}</span>)}</div>
      <div className="mt-1 grid grid-cols-7 gap-0.5">{cells.map((d, i) => d === null ? <span key={i} /> : (
        <button key={i} onClick={() => onPick(new Date(y, m, d))} className={["mx-auto grid h-9 w-9 place-items-center rounded-full text-[14px] font-semibold transition", sel(d) ? "bg-hotpink text-white shadow-[0_3px_10px_rgba(236,72,153,0.5)]" : isToday(d) ? "text-hotpink ring-1 ring-hotpink/40" : "text-rose/80 hover:bg-hotpink/10"].join(" ")}>{d}</button>
      ))}</div>
    </div>
  );
}

// ══ "plan ready" celebration ═════════════════════════════════════════════════
// A one-shot, cute-but-premium moment when the Personalized Plan reveal appears:
// a soft confetti of hearts & blossoms rains down and a glowing "Waaw — your
// plan is ready!" notification pops in the centre, then gently bows out. Purely
// decorative (pointer-events:none), so it never blocks the plan underneath.
function PlanReadyCelebration() {
  const GLYPHS = ["♥", "✿", "❀", "✦", "❤"];
  const COLORS = ["#EC4899", "#DB2777", "#F472B6", "#F9A8D4", "#FBBF24", "#FCA5C4"];
  const pieces = Array.from({ length: 30 }, (_, i) => ({
    i,
    left: Math.round(Math.random() * 100),
    delay: +(Math.random() * 0.6).toFixed(2),
    dur: +(2.4 + Math.random() * 1.8).toFixed(2),
    size: 11 + Math.round(Math.random() * 16),
    rot: Math.round((Math.random() * 2 - 1) * 540),
    drift: Math.round((Math.random() * 2 - 1) * 60),
    color: COLORS[i % COLORS.length],
    glyph: GLYPHS[i % GLYPHS.length],
  }));
  return (
    <div className="pointer-events-none fixed inset-0 z-[120] overflow-hidden" aria-hidden>
      <style>{`
        @keyframes bz-confetti-fall{
          0%{transform:translate3d(0,-14vh,0) rotate(0);opacity:0}
          9%{opacity:1}
          100%{transform:translate3d(var(--bz-dx),112vh,0) rotate(var(--bz-rot));opacity:0}}
        @keyframes bz-cel-pop{
          0%{transform:translate(-50%,0) scale(.62);opacity:0}
          52%{transform:translate(-50%,0) scale(1.06);opacity:1}
          72%{transform:translate(-50%,0) scale(.99);opacity:1}
          86%{transform:translate(-50%,0) scale(1);opacity:1}
          100%{transform:translate(-50%,-14px) scale(.97);opacity:0}}
        @keyframes bz-cel-badge{0%,100%{transform:scale(1)}50%{transform:scale(1.09)}}
        @keyframes bz-cel-ring{0%{transform:scale(.5);opacity:.5}100%{transform:scale(2.6);opacity:0}}
        @keyframes bz-cel-spark{0%,100%{opacity:.35;transform:scale(.8)}50%{opacity:1;transform:scale(1.15)}}
        @media (prefers-reduced-motion:reduce){
          .bz-cel-piece{display:none}
          .bz-cel-toast{animation:bz-cel-pop .01s forwards!important}}
      `}</style>
      {pieces.map((p) => (
        <span
          key={p.i}
          className="bz-cel-piece"
          style={{
            position: "absolute", left: `${p.left}%`, top: 0, fontSize: `${p.size}px`,
            lineHeight: 1, color: p.color, willChange: "transform, opacity",
            filter: "drop-shadow(0 2px 3px rgba(219,39,119,.25))",
            ["--bz-dx" as string]: `${p.drift}px`, ["--bz-rot" as string]: `${p.rot}deg`,
            animation: `bz-confetti-fall ${p.dur}s cubic-bezier(.3,.55,.4,1) ${p.delay}s forwards`,
          }}
        >
          {p.glyph}
        </span>
      ))}

      <div
        className="bz-cel-toast absolute left-1/2 top-[24%] w-[min(88vw,24rem)] rounded-[1.9rem] border border-white/80 bg-white/85 px-6 py-6 text-center shadow-[0_28px_70px_-24px_rgba(219,39,119,.7)] backdrop-blur-md"
        style={{ animation: "bz-cel-pop 3s cubic-bezier(.16,.7,.2,1) .1s forwards" }}
      >
        <span className="relative mx-auto mb-3 grid h-16 w-16 place-items-center">
          <span className="absolute inset-0 rounded-full bg-hotpink/30" style={{ animation: "bz-cel-ring 1.4s ease-out .15s 2" }} />
          <span
            className="relative grid h-16 w-16 place-items-center rounded-full text-white shadow-[0_12px_28px_-8px_rgba(219,39,119,.9)]"
            style={{ background: "linear-gradient(150deg,#FF7EB6 0%,#EC4899 48%,#DB2777 100%)", animation: "bz-cel-badge 1.8s ease-in-out infinite" }}
          >
            <Sparkles className="h-8 w-8" strokeWidth={2} />
          </span>
        </span>
        <p className="font-script text-[2.1rem] leading-none text-hotpink">Waaw!</p>
        <p className="mt-1.5 text-[1.05rem] font-extrabold text-[#7a1247]">Your plan is ready ✨</p>
        <p className="mx-auto mt-1 max-w-[17rem] text-[12.5px] font-semibold leading-snug text-rose/70">
          Everything's set up just for you — your cycle, meals, movement &amp; mind, all in bloom 🌸
        </p>
      </div>
    </div>
  );
}

// ══ main component ══════════════════════════════════════════════════════════
export function BloomOnboarding({ onDone, preview = false }: { onDone: () => void; preview?: boolean }) {
  const { user, updateProfile } = useAuth();
  const [a, setA] = useState<Answers>(DEFAULT_ANSWERS);
  const [stage, setStage] = useState<string>("welcome");
  const [billing, setBilling] = useState<"monthly" | "annual">("annual");
  const [summary, setSummary] = useState<{ kcal: number; meals: number; sample: string[] }>({ kcal: 0, meals: 0, sample: [] });
  const [recipe, setRecipe] = useState<(typeof RECIPES)[number] | null>(null);
  // One-shot "plan ready" celebration: fire the moment the Personalized Plan
  // reveal (stage "previews") first appears, then let it bow out on its own.
  const [celebrate, setCelebrate] = useState(false);
  const [celebrated, setCelebrated] = useState(false);
  useEffect(() => {
    if (stage === "previews" && !celebrated) {
      setCelebrated(true);
      setCelebrate(true);
      const t = window.setTimeout(() => setCelebrate(false), 3400);
      return () => window.clearTimeout(t);
    }
  }, [stage, celebrated]);
  const patch = (p: Partial<Answers>) => setA((x) => ({ ...x, ...p }));
  const qIndex = QUESTION_STEPS.indexOf(stage as typeof QUESTION_STEPS[number]);
  const total = QUESTION_STEPS.length;
  const go = (s: string) => { setStage(s); try { window.scrollTo(0, 0); } catch { /* ignore */ } };

  // ── save EVERYTHING (this is the whole point) ──────────────────────────────
  async function applySetup() {
    if (preview) {
      const bmr = 10 * a.weight + 6.25 * a.height - 5 * a.age - 161;
      const adj = a.goal === "lose" ? -0.15 : a.goal === "gain" ? 0.1 : 0;
      setSummary({ kcal: Math.round(bmr * 1.375 * (1 + adj)), meals: 28, sample: RECIPES.slice(0, 3).map((r) => r.name) });
      return;
    }
    writeCycleSettings({ ...DEFAULT_CYCLE_SETTINGS, lastPeriodStart: a.lastPeriod, cycleLength: a.cycleLength, periodLength: a.periodLength, contraceptiveMethod: a.contraceptive, contraceptiveReminder: true, reminderHour: a.reminderTime, deviceNotifications: a.notifications, trackerMode: "protection" });
    try { await updateProfile({ setup_done: true, age: a.age, weight: a.weight, weight_unit: "kg" }); } catch { /* offline ok */ }
    const food = FOOD_MAP[a.foodStyle];
    updateDietProfile({ goal: a.goal, weight: a.weight, heightCm: a.height, age: a.age, targetWeight: a.goal === "maintain" ? a.weight : a.targetWeight, dietType: food.dietType, regime: food.regime });
    try { localStorage.setItem(DIET_SETUP_KEY, JSON.stringify(true)); } catch { /* ignore */ }
    const level: Level = a.level === "custom" ? ("Beginner" as Level) : a.level;
    const wprofile: WorkoutProfile = { level, goal: GOAL_TO_WORKOUT[a.goal], equipment: "none", daysPerWeek: 3 };
    try { localStorage.setItem(WORKOUT_PROFILE_KEY, JSON.stringify(wprofile)); } catch { /* ignore */ }
    const phase = readCyclePhase() ?? "follicular";
    try { const { generateWeeklyPlan } = await import("@/pages/app.tools.workout"); localStorage.setItem(WORKOUT_PROGRAM_KEY, JSON.stringify(generateWeeklyPlan(wprofile, phase as never))); } catch { /* ignore */ }
    try { localStorage.setItem(YOGA_SCHEDULE_KEY, JSON.stringify(YOGA_SEED)); } catch { /* ignore */ }
    let meals = 0, sample: string[] = [];
    try { const { seedMealMonthFromProfile } = await import("@/pages/app.tools.meals"); const r = seedMealMonthFromProfile(); meals = r.meals; sample = r.sample; } catch { /* ignore */ }
    // first daily check-in → Today opens already logged
    const iso = todayISO();
    try { writeTodayMood(a.mood); } catch { /* ignore */ }
    try { a.symptoms.forEach((s) => toggleSymptomForDay(iso, s)); } catch { /* ignore */ }
    try { setSleepQuality(iso, a.sleepQ); if (a.sleepH) setSleepHours(iso, a.sleepH); } catch { /* ignore */ }
    try { localStorage.setItem(TODAY_WATER_KEY, JSON.stringify({ date: iso, count: a.water })); } catch { /* ignore */ }
    let kcal = 0; try { kcal = Math.round(computeTargets(true).calories); } catch { /* ignore */ }
    setOnboarded(); endGuide();
    try { window.dispatchEvent(new Event("storage")); } catch { /* ignore */ }
    setSummary({ kcal, meals, sample });
  }

  // ── WELCOME (custom hero) ──────────────────────────────────────────────────
  if (stage === "welcome") {
    const tools = [{ Icon: Moon, l: "Cycle" }, { Icon: Dumbbell, l: "Workout" }, { Icon: Salad, l: "Meals" }, { Icon: Heart, l: "Mind" }, { Icon: CalendarDays, l: "Life" }];
    const checks = ["Personalized to your cycle", "Practical and easy to follow", "Tailored to your goals", "Made for real life", "All in one place", "You can always adjust later"];
    return (
      <Frame>
        <HeroPanel tagline="A life that feels like you" />
        <div className="relative flex flex-1 flex-col md:flex-none md:w-[26rem] lg:w-[38rem] xl:w-[42rem]">
          {/* phone-only hero band — replaced by the left HeroPanel on tablet & laptop */}
          <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-[52vh] min-h-[360px] overflow-hidden md:hidden">
            <img src="/images/page-bg-today-morning.webp" alt="" className="absolute inset-0 h-full w-full object-cover object-[68%_20%]" />
            <div className="absolute inset-0" style={{ background: "linear-gradient(105deg, rgba(255,236,246,0.92) 0%, rgba(255,224,239,0.62) 38%, rgba(255,214,235,0.12) 62%, transparent 82%)" }} />
            <div className="absolute inset-x-0 bottom-0 h-40" style={{ background: "linear-gradient(180deg, transparent, #FFE7F2 78%, #FFECF5 100%)" }} />
          </div>
          <div className="relative px-5 pb-8 md:px-8 md:py-7 lg:px-9 lg:py-8" style={{ paddingTop: "max(1.25rem, env(safe-area-inset-top))" }}>
            <div className="inline-flex items-center gap-1.5 md:hidden"><span className="font-script text-[2rem] leading-none text-hotpink">Bloomzein</span><BloomFlower size={22} petal="#EC4899" center="#FFFFFF" /></div>
            <p className="mt-0.5 text-[13px] font-bold text-hotpink/85 md:hidden">stay soft, bloom on.</p>
            <h1 className="mt-6 leading-[0.9] md:mt-0"><span className="block text-[3rem] font-bold text-[#7a1247]" style={{ fontFamily: SERIF }}>Let's make</span><span className="inline-flex items-end gap-2 text-[3rem] font-bold text-[#7a1247]" style={{ fontFamily: SERIF }}>this yours. <Heart className="mb-2 h-8 w-8 text-hotpink" strokeWidth={2.4} /></span></h1>
            <p className="mt-3 max-w-[19rem] text-[16px] leading-snug text-[#a3316f] md:max-w-none">A few little questions and Bloomzein will build <b className="font-extrabold text-[#7a1247]">your personalized world</b> — around your body, your goals and your everyday life.</p>
            <div className="mt-8 flex justify-between gap-1 md:mt-6">{tools.map((t) => (<div key={t.l} className="flex flex-col items-center gap-1.5"><span className="grid h-14 w-14 place-items-center rounded-full bg-white/85 shadow-[0_8px_20px_rgba(236,72,153,0.18)] ring-1 ring-white/70"><t.Icon className="h-6 w-6 text-hotpink" strokeWidth={1.9} /></span><span className="font-script text-[15px] text-hotpink">{t.l}</span></div>))}</div>
            <div className="mt-6 rounded-[1.6rem] bg-white/70 p-4 shadow-[0_12px_34px_rgba(236,72,153,0.14)] ring-1 ring-white/70">
              <p className="inline-flex items-center gap-1.5 font-script text-[1.4rem] text-hotpink leading-none">A life that feels like you <Heart className="h-5 w-5 text-hotpink" strokeWidth={2.4} /></p>
              <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2.5">{checks.map((c) => (<div key={c} className="flex items-start gap-1.5"><span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-hotpink/15"><Check className="h-3 w-3 text-hotpink" strokeWidth={4} /></span><span className="text-[13px] font-semibold leading-snug text-rose/85">{c}</span></div>))}</div>
            </div>
            <button onClick={() => go("cycle")} className="bloom-luxury-btn animate-cta-bounce mt-6 flex w-full items-center justify-center gap-2.5 py-4 text-[19px] font-bold text-white"><Sparkles className="h-5 w-5" /> Let's bloom <ArrowRight className="h-5 w-5" /></button>
            <p className="mt-2.5 text-center text-[12px] font-semibold text-hotpink/70">Takes about 2 minutes • You can change everything later</p>
          </div>
        </div>
      </Frame>
    );
  }

  if (stage === "cycle") return (
    <Shell step={qIndex} total={total} onBack={() => go("welcome")} footer="Small steps a brighter you">
      <Eyebrow>Your cycle</Eyebrow><Title serif="Let's get to know" script="your cycle" />
      <Sub>A few details to understand your cycle and create a plan that fits you.</Sub>
      <div className="mt-3 space-y-2.5">
        <div className="rounded-[1.4rem] border border-white/70 bg-white/70 p-3.5"><p className="text-[15px] font-extrabold text-hotpink leading-tight">When did your last period start?</p><p className="mb-2.5 mt-0.5 text-[12px] text-rose/70">Tap the date on the calendar.</p><MiniCalendar value={a.lastPeriod} onPick={(d) => patch({ lastPeriod: d })} /></div>
        <Stepper Icon={CalendarHeart} label="How long is your cycle?" desc="From the first day of your period to the day before the next." value={a.cycleLength} unit="days" min={21} max={40} onChange={(v) => patch({ cycleLength: v })} />
        <Stepper Icon={Heart} label="How long does your period last?" desc="The number of days you typically have bleeding." value={a.periodLength} unit="days" min={2} max={10} onChange={(v) => patch({ periodLength: v })} />
      </div><ContinueBtn onClick={() => go("about")} />
    </Shell>
  );

  if (stage === "about") return (
    <Shell step={qIndex} total={total} onBack={() => go("cycle")} footer="Same girl brighter days ahead">
      <Eyebrow>About you</Eyebrow><Title serif="Tell us a little" script="about you" />
      <Sub>These details help us create a plan that fits your body and your goals.</Sub>
      <div className="mt-3 space-y-2.5">
        <Stepper Icon={Scale} label="What's your weight?" desc="This helps us personalize your nutrition and workout plan." value={a.weight} unit="kg" min={35} max={200} onChange={(v) => patch({ weight: v })} />
        <Stepper Icon={Ruler} label="What's your height?" desc="This helps us calculate your energy needs accurately." value={a.height} unit="cm" min={130} max={210} onChange={(v) => patch({ height: v })} />
        <Stepper Icon={Cake} label="What's your age?" desc="Your age helps us personalize your experience even better." value={a.age} unit="years" min={13} max={90} onChange={(v) => patch({ age: v })} />
      </div><ContinueBtn onClick={() => go("goal")} />
    </Shell>
  );

  if (stage === "goal") return (
    <Shell step={qIndex} total={total} onBack={() => go("about")} footer="Same girl brighter days ahead">
      <Eyebrow>Your goal</Eyebrow><Title serif="What are you" script="blooming toward?" />
      <Sub>Choose your main goal so we can create a personalized nutrition and workout plan for you.</Sub>
      <div className="mt-3 space-y-2">{GOALS.map((g) => <OptionCard key={g.key} {...g} selected={a.goal === g.key} onClick={() => patch({ goal: g.key, targetWeight: g.key === "lose" ? Math.max(35, a.weight - 5) : g.key === "gain" ? Math.min(200, a.weight + 5) : a.weight })} />)}</div>
      {a.goal !== "maintain" && (
        <div className="mt-2.5">
          <Stepper Icon={Star} label="Your target weight"
            desc={a.goal === "lose" ? "Where you'd love to be — we'll get you there at a healthy, steady pace." : "Your goal weight — we'll build you up gradually and sustainably."}
            value={a.targetWeight} unit="kg"
            min={a.goal === "lose" ? 35 : a.weight + 1} max={a.goal === "lose" ? a.weight - 1 : 200}
            onChange={(v) => patch({ targetWeight: v })} />
          <p className="mt-1.5 px-1 text-[12px] font-semibold text-hotpink/70">
            {Math.abs(a.weight - a.targetWeight)} kg to {a.goal === "lose" ? "lose" : "gain"} · about {Math.max(1, Math.ceil(Math.abs(a.weight - a.targetWeight) / 0.5))} weeks at a healthy pace.
          </p>
        </div>
      )}
      <ContinueBtn onClick={() => go("food")} />
    </Shell>
  );

  if (stage === "food") return (
    <Shell step={qIndex} total={total} onBack={() => go("goal")} footer="Small choices Big changes">
      <Eyebrow>Your food style</Eyebrow><Title serif="How do you" script="like to eat?" />
      <Sub>Choose the style that fits you best. You can always change this later.</Sub>
      <div className="mt-3 space-y-2">{FOODS.map((f) => <OptionCard key={f.key} {...f} selected={a.foodStyle === f.key} onClick={() => patch({ foodStyle: f.key })} />)}</div>
      <ContinueBtn onClick={() => go("fitness")} />
    </Shell>
  );

  if (stage === "fitness") return (
    <Shell step={qIndex} total={total} onBack={() => go("food")} footer="Small steps Big results">
      <Eyebrow>Your fitness</Eyebrow><Title serif="What's your" script="fitness level?" />
      <Sub>This helps us create a workout plan that fits you and your goals.</Sub>
      <div className="mt-3 space-y-2">{LEVELS.map((l) => <OptionCard key={String(l.key)} {...l} selected={a.level === l.key} onClick={() => patch({ level: l.key })} />)}</div>
      <ContinueBtn onClick={() => go("prefs")} />
    </Shell>
  );

  if (stage === "prefs") {
    const methods: { key: ContraceptiveMethod; label: string; Icon: typeof Heart }[] = [{ key: "pill", label: "Pill", Icon: Pill }, { key: "patch", label: "Patch", Icon: Circle }, { key: "ring", label: "Ring", Icon: Circle }];
    const times = ["07:00", "08:00", "12:00", "18:00", "20:00", "21:00"];
    return (
      <Shell step={qIndex} total={total} onBack={() => go("fitness")} footer="Small choices Big changes">
        <Eyebrow>Your cycle</Eyebrow><Title serif="A few" script="preferences" />
        <Sub>Help us personalize your experience with a few more details.</Sub>
        <div className="mt-3 space-y-2.5">
          <div className="rounded-[1.4rem] border border-white/70 bg-white/70 p-3.5"><p className="text-[15px] font-extrabold text-hotpink leading-tight">Do you use a contraceptive method?</p><p className="mb-2.5 mt-0.5 text-[12px] text-rose/70">This helps us give you more accurate insights.</p>
            <div className="grid grid-cols-3 gap-2">{methods.map((m) => (<button key={m.key} onClick={() => patch({ contraceptive: m.key })} className={["flex flex-col items-center gap-1.5 rounded-2xl border py-3 transition active:scale-95", a.contraceptive === m.key ? "border-hotpink bg-hotpink/10 ring-1 ring-hotpink/30" : "border-white/70 bg-white/60"].join(" ")}><m.Icon className="h-5 w-5 text-hotpink" strokeWidth={2} /><span className="text-[13px] font-bold text-rose/85">{m.label}</span></button>))}</div>
          </div>
          <div className="rounded-[1.4rem] border border-white/70 bg-white/70 p-3.5"><div className="flex items-start gap-3"><span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-hotpink/10"><Bell className="h-5 w-5 text-hotpink" strokeWidth={2} /></span><div className="flex-1"><p className="text-[15px] font-extrabold text-hotpink leading-tight">When would you like your daily reminder?</p><p className="mt-0.5 text-[12px] text-rose/70">We'll remind you about your cycle, self-care and more.</p></div></div>
            <div className="mt-3 flex flex-wrap gap-2">{times.map((t) => (<button key={t} onClick={() => patch({ reminderTime: t })} className={["inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-[13px] font-bold transition active:scale-95", a.reminderTime === t ? "border-hotpink bg-hotpink text-white" : "border-hotpink/30 bg-white/70 text-rose/80"].join(" ")}><Clock className="h-3.5 w-3.5" /> {t}</button>))}</div>
          </div>
          <div className="rounded-[1.4rem] border border-white/70 bg-white/70 p-3.5"><p className="text-[15px] font-extrabold text-hotpink leading-tight">Would you like Bloomzein to send notifications?</p><p className="mb-2.5 mt-0.5 text-[12px] text-rose/70">Get reminders and personalized tips on your devices.</p>
            <button onClick={() => patch({ notifications: !a.notifications })} className="flex w-full items-center justify-between rounded-xl bg-white/80 px-3 py-2.5 ring-1 ring-hotpink/15"><span className="text-[13px] font-bold text-rose/85">Yes, send me notifications</span><span className={["relative h-6 w-11 rounded-full transition-colors", a.notifications ? "bg-hotpink" : "bg-rose/25"].join(" ")}><span className="absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all" style={{ left: a.notifications ? "1.375rem" : "0.125rem" }} /></span></button>
            <div className="mt-2.5 grid grid-cols-3 gap-2">{[{ Icon: Smartphone, l: "Phone" }, { Icon: Tablet, l: "Tablet" }, { Icon: Laptop, l: "Laptop" }].map((d) => (<div key={d.l} className={["flex flex-col items-center gap-1 rounded-2xl py-2.5 transition", a.notifications ? "bg-hotpink/10" : "bg-white/50 opacity-60"].join(" ")}><d.Icon className="h-5 w-5 text-hotpink" strokeWidth={2} /><span className="text-[11px] font-bold text-rose/80">{d.l}</span></div>))}</div>
          </div>
        </div>
        <ContinueBtn onClick={() => go("checkin")} />
      </Shell>
    );
  }

  // ── CHECK-IN (mood · symptoms · sleep · water → Today opens logged) ─────────
  if (stage === "checkin") {
    const toggleSym = (s: string) => patch({ symptoms: a.symptoms.includes(s) ? a.symptoms.filter((x) => x !== s) : [...a.symptoms, s] });
    return (
      <Shell step={qIndex} total={total} onBack={() => go("prefs")} footer="Check in, beautifully">
        <Eyebrow>Today's check-in</Eyebrow><Title serif="How are you" script="feeling today?" />
        <Sub>One last little check-in — your Today will open already tuned to how you feel.</Sub>
        <div className="mt-3 space-y-2.5">
          <div className="rounded-[1.4rem] border border-white/70 bg-white/70 p-3.5"><p className="text-[14px] font-extrabold text-hotpink">Your mood</p>
            <div className="mt-2.5 grid grid-cols-3 gap-2">{MOODS.map((m) => (<button key={m.key} onClick={() => patch({ mood: m.key })} className={["flex flex-col items-center gap-1 rounded-2xl py-2.5 transition active:scale-95", a.mood === m.key ? "bg-hotpink/12 ring-1 ring-hotpink/35" : "bg-white/60"].join(" ")}><m.Icon className="h-5 w-5 text-hotpink" strokeWidth={2} /><span className="text-[12px] font-bold text-rose/85">{m.label}</span></button>))}</div>
          </div>
          <div className="rounded-[1.4rem] border border-white/70 bg-white/70 p-3.5"><p className="text-[14px] font-extrabold text-hotpink">Any symptoms? <span className="font-semibold text-rose/60">(optional)</span></p>
            <div className="mt-2.5 flex flex-wrap gap-2">{SYMPTOM_OPTIONS.map((s) => (<button key={s} onClick={() => toggleSym(s)} className={["rounded-full border px-3 py-1.5 text-[13px] font-bold transition active:scale-95", a.symptoms.includes(s) ? "border-hotpink bg-hotpink text-white" : "border-hotpink/30 bg-white/70 text-rose/80"].join(" ")}>{s}</button>))}</div>
          </div>
          <div className="rounded-[1.4rem] border border-white/70 bg-white/70 p-3.5"><div className="flex items-center gap-2"><Moon className="h-5 w-5 text-hotpink" /><p className="text-[14px] font-extrabold text-hotpink">How did you sleep?</p></div>
            <div className="mt-2.5 flex items-center justify-between">{[1, 2, 3, 4, 5].map((n) => (<button key={n} onClick={() => patch({ sleepQ: n })} className={["grid h-10 w-10 place-items-center rounded-full transition active:scale-90", n <= a.sleepQ ? "bg-hotpink text-white" : "bg-white/70 text-hotpink/40 ring-1 ring-hotpink/20"].join(" ")}><Star className="h-5 w-5" fill={n <= a.sleepQ ? "currentColor" : "none"} /></button>))}</div>
            <div className="mt-3"><Stepper Icon={Clock} label="Hours slept" desc="Roughly how many hours last night." value={a.sleepH} unit="h" min={3} max={12} onChange={(v) => patch({ sleepH: v })} /></div>
          </div>
          <div className="rounded-[1.4rem] border border-white/70 bg-white/70 p-3.5"><div className="flex items-center gap-2"><Droplets className="h-5 w-5 text-hotpink" /><p className="text-[14px] font-extrabold text-hotpink">Water so far today</p></div>
            <div className="mt-2.5 flex items-center justify-between rounded-full bg-white/80 p-1.5 ring-1 ring-hotpink/15"><button onClick={() => patch({ water: Math.max(0, a.water - 1) })} className="grid h-9 w-9 place-items-center rounded-full bg-hotpink/10 text-hotpink active:scale-90"><Minus className="h-4 w-4" strokeWidth={3} /></button><span className="text-[17px] font-extrabold text-rose">{a.water} glasses</span><button onClick={() => patch({ water: Math.min(12, a.water + 1) })} className="grid h-9 w-9 place-items-center rounded-full bg-hotpink text-white active:scale-90"><Plus className="h-4 w-4" strokeWidth={3} /></button></div>
          </div>
        </div>
        <ContinueBtn onClick={async () => { go("building"); await applySetup(); go("previews"); }} label="Build my world" />
      </Shell>
    );
  }

  if (stage === "building") return (
    <Shell step={null} total={total} footer="Building your world">
      <div className="grid min-h-[60vh] place-items-center text-center"><div><span className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-white/70 animate-card-breathe"><BloomFlower size={56} petal="#EC4899" center="#FFFFFF" className="animate-[spin_9s_linear_infinite]" /></span><p className="mt-4 font-script text-3xl text-hotpink">Building your world…</p><p className="mt-1 text-[14px] text-rose/70">Syncing your cycle, meals & movement ✿</p></div></div>
    </Shell>
  );

  // ── PERSONALIZED PLAN reveal (full-width dashboard) ────────────────────────
  if (stage === "previews") {
    // cycle phase (real when set; computed in the write-free preview)
    const compPhase = (() => {
      const day0 = Math.floor((Date.now() - a.lastPeriod.getTime()) / 864e5);
      const d = (((day0 % a.cycleLength) + a.cycleLength) % a.cycleLength) + 1;
      const ov = Math.round(a.cycleLength / 2);
      return { key: d <= a.periodLength ? "menstrual" : d < ov - 1 ? "follicular" : d <= ov + 1 ? "ovulatory" : "luteal", day: d };
    })();
    const phaseKey = ((readCyclePhase() as string | null) ?? compPhase.key) as keyof typeof PHASE_INFO;
    const info = PHASE_INFO[phaseKey] ?? PHASE_INFO.follicular;
    const fmt = (dt: Date) => dt.toLocaleString("en-US", { month: "short", day: "numeric" });
    const range = `${fmt(new Date())} – ${fmt(new Date(Date.now() + 6 * 864e5))}`;
    // goal (based on the target weight the user actually chose)
    const goalLabel = a.goal === "lose" ? "Lose weight" : a.goal === "gain" ? "Gain & tone" : "Maintain";
    const isMaintain = a.goal === "maintain";
    const goalWeight = isMaintain ? a.weight : a.targetWeight;
    const diffKg = Math.abs(a.weight - goalWeight);
    const weeks = Math.max(1, Math.ceil(diffKg / 0.5));
    const weekLbl = `${weeks} week${weeks === 1 ? "" : "s"} to go`;
    // nutrition
    const kcal = summary.kcal || 1500;
    const carbs = Math.round((kcal * 0.4) / 4), protein = Math.round((kcal * 0.3) / 4), fats = Math.round((kcal * 0.3) / 9);
    // meals
    const pickMeal = (t: string) => RECIPES.find((r) => r.mealType === t);
    const meals = [
      { label: "Breakfast", r: pickMeal("breakfast") }, { label: "Lunch", r: pickMeal("lunch") },
      { label: "Snack", r: pickMeal("snack") }, { label: "Dinner", r: pickMeal("dinner") },
    ].filter((m) => m.r);
    const workouts = [
      { img: "/images/workout-hero-session.webp", name: "Full Body Strength", min: "30 min" },
      { img: "/images/workout-hero-program.webp", name: "Glutes & Core", min: "25 min" },
      { img: "/images/workout-hero-bestshape.webp", name: "Pilates Flow", min: "20 min" },
    ];
    const yoga = [
      { img: YOGA_FOCUS["Full-body flow"]?.image, name: "Energizing Flow", min: "15 min" },
      { img: YOGA_FOCUS["Stress relief"]?.image, name: "Upper Body Stretch", min: "10 min" },
      { img: YOGA_FOCUS["Cycle sync"]?.image, name: "Hip Opener", min: "12 min" },
    ];
    const todaysFocus = ["Nourish your body with whole foods", "Do your yoga flow", "Drink at least 2L of water", "Take your vitamins", "Be kind to yourself ♡"];
    const selfCare = ["5 min morning journal", "Breathing exercise", "Skincare routine", "Quality sleep (7–8h)", "Gratitude practice"];
    const CARD = "rounded-[1.5rem] bg-white/72 p-4 shadow-[0_12px_30px_rgba(236,72,153,0.12)] ring-1 ring-white/70 backdrop-blur-sm sm:p-5";
    const LINK = "inline-flex items-center gap-1 rounded-full bg-hotpink/10 px-3 py-1.5 text-[12.5px] font-extrabold text-hotpink";
    const Tick = () => <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-hotpink"><Check className="h-3 w-3 text-white" strokeWidth={4} /></span>;
    const VideoThumb = ({ img, name, min }: { img?: string; name: string; min: string }) => (
      <div className="min-w-0">
        <div className="relative aspect-[3/4] overflow-hidden rounded-2xl ring-1 ring-white/70">
          {img && <img src={img} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover" />}
          <span className="absolute inset-0 grid place-items-center"><span className="grid h-9 w-9 place-items-center rounded-full bg-white/85 shadow"><Play className="h-4 w-4 translate-x-[1px] fill-hotpink text-hotpink" /></span></span>
        </div>
        <p className="mt-1.5 truncate text-[13px] font-extrabold text-rose">{name}</p>
        <p className="text-[11.5px] font-semibold text-hotpink/70">{min}</p>
      </div>
    );

    return (
      <div className="fixed inset-0 z-[95] overflow-y-auto" style={{ background: "radial-gradient(120% 90% at 50% 0%, #FFF0F7 0%, #FFE0EF 42%, #FCC7E1 100%)" }}>
        <Motifs />
        {celebrate && <PlanReadyCelebration />}
        <div className="relative mx-auto max-w-6xl px-4 pb-28 sm:px-6 lg:px-8" style={{ paddingTop: "max(1rem, env(safe-area-inset-top))" }}>
          {/* header */}
          <div className="flex items-center justify-between gap-3 py-1">
            <button onClick={() => go("checkin")} className="inline-flex items-center gap-1 font-bold text-hotpink active:scale-95"><ChevronLeft className="h-5 w-5" /> Back</button>
            <div className="text-center leading-none"><div className="inline-flex items-center gap-1.5"><span className="font-script text-2xl text-hotpink leading-none">Bloomzein</span><BloomFlower size={18} petal="#EC4899" center="#FFFFFF" /></div><p className="mt-0.5 text-[11px] font-bold text-hotpink/80">stay soft, bloom on.</p></div>
            <p className="hidden font-script text-[1.15rem] text-hotpink md:inline-flex md:items-center md:gap-1">A healthier, happier you <Heart className="h-4 w-4 fill-hotpink" /></p>
          </div>

          {/* title */}
          <div className="mt-4 lg:mt-6">
            <h1 className="leading-[0.95]"><span className="block text-[2.2rem] font-bold text-[#7a1247] sm:text-[2.7rem] lg:text-[3.2rem]" style={{ fontFamily: SERIF }}>Here's your</span><span className="inline-flex items-end gap-2 font-script text-[2.4rem] text-hotpink sm:text-[3rem] lg:text-[3.6rem] leading-[0.85]">Personalized Plan <Heart className="mb-1 h-8 w-8 fill-hotpink" /></span></h1>
            <p className="mt-2 max-w-xl text-[14px] leading-snug text-rose/70 sm:text-[15px]">Tailored to your cycle, your goals and your life. Everything you need to feel your best — body, mind and soul.</p>
          </div>

          {/* phase + how you might feel */}
          <div className="mt-5 grid gap-4 lg:grid-cols-[1.35fr_1fr]">
            <div className={CARD}>
              <div className="flex items-start gap-3">
                <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-hotpink/12"><Sprout className="h-6 w-6 text-hotpink" strokeWidth={1.9} /></span>
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-bold text-rose/70">You're in your</p>
                  <p className="font-script text-[1.9rem] leading-none text-hotpink">{info.title}</p>
                  <p className="mt-1 text-[12.5px] font-extrabold text-hotpink/80">Day {compPhase.day} of {a.cycleLength} · {range}</p>
                </div>
                <p className="hidden shrink-0 font-script text-[1.1rem] text-hotpink sm:block">A fresh<br />new you ♡</p>
              </div>
              <p className="mt-3 text-[13.5px] leading-snug text-rose/80">{info.blurb}</p>
              <button onClick={() => go("pricing")} className={`${LINK} mt-3 active:scale-95`}>Learn more about this phase <ArrowRight className="h-3.5 w-3.5" /></button>
            </div>
            <div className={CARD}>
              <p className="text-[16px] font-extrabold text-hotpink">How you might feel</p>
              <div className="mt-3 grid grid-cols-4 gap-2">{info.feels.map((f) => (<div key={f.l} className="flex flex-col items-center gap-1.5 text-center"><span className="grid h-11 w-11 place-items-center rounded-full bg-hotpink/12"><f.Icon className="h-5 w-5 text-hotpink" strokeWidth={2} /></span><span className="text-[11.5px] font-bold leading-tight text-rose/80">{f.l}</span></div>))}</div>
              <div className="mt-3 rounded-2xl bg-hotpink/8 p-3"><p className="text-[12.5px] leading-snug text-rose/80"><span className="font-script text-xl text-hotpink">“</span>{info.quote}</p></div>
            </div>
          </div>

          {/* goal · nutrition · today's focus */}
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className={CARD}>
              <div className="flex items-center justify-between"><div className="flex items-center gap-2.5"><span className="grid h-10 w-10 place-items-center rounded-full bg-hotpink/12"><Scale className="h-5 w-5 text-hotpink" strokeWidth={2} /></span><div><p className="text-[12.5px] font-bold text-rose/60">Your goal</p><p className="text-[17px] font-extrabold text-hotpink leading-tight">{goalLabel}</p></div></div><button onClick={() => go("goal")} className="inline-flex items-center gap-1 text-[12px] font-bold text-hotpink/70 active:scale-95"><Pencil className="h-3.5 w-3.5" /> Edit</button></div>
              {isMaintain ? (
                <>
                  <p className="mt-2.5 text-[12.5px] leading-snug text-rose/75">You're maintaining a healthy balance — no restriction needed. We'll keep your nutrition and movement steady so you feel your best every day.</p>
                  <div className="mt-3 flex items-center gap-2.5 rounded-2xl bg-hotpink/8 p-3"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-hotpink/15"><Heart className="h-5 w-5 fill-hotpink text-hotpink" /></span><div><p className="text-[15px] font-extrabold leading-tight text-hotpink">Maintain {a.weight} kg</p><p className="text-[12px] font-semibold text-rose/70">You're right where you want to be 🌸</p></div></div>
                </>
              ) : (
                <>
                  <p className="mt-2.5 text-[12.5px] leading-snug text-rose/75">You're on track! Based on your profile, a healthy pace is <b className="text-hotpink">0.5 kg per week</b>.</p>
                  <div className="mt-3 flex items-end justify-between"><p className="text-[22px] font-extrabold leading-none text-hotpink">{diffKg} kg<span className="text-[13px] font-bold text-rose/60"> to {a.goal === "gain" ? "gain" : "lose"}</span></p><p className="text-right text-[12px] font-semibold text-rose/60">{weekLbl}<br />(estimated)</p></div>
                  <div className="mt-2.5 flex items-center gap-2"><span className="text-[11px] font-bold text-rose/60">{a.weight}kg</span><div className="relative h-2.5 flex-1 overflow-hidden rounded-full bg-hotpink/12"><div className="absolute inset-y-0 left-0 rounded-full bg-hotpink" style={{ width: "8%" }} /></div><span className="text-[11px] font-bold text-hotpink">{goalWeight}kg</span></div>
                  <div className="mt-1.5 flex justify-between text-[12px] font-semibold text-rose/70"><span>Current: {a.weight} kg</span><span>Goal: {goalWeight} kg</span></div>
                </>
              )}
            </div>
            <div className={CARD}>
              <div className="flex items-center gap-2.5"><span className="grid h-10 w-10 place-items-center rounded-full bg-hotpink/12"><Utensils className="h-5 w-5 text-hotpink" strokeWidth={2} /></span><div><p className="text-[12.5px] font-bold text-rose/60">Your daily nutrition</p><p className="leading-none"><span className="text-[22px] font-extrabold text-hotpink">{kcal.toLocaleString()}</span> <span className="text-[13px] font-bold text-rose/70">kcal</span></p></div></div>
              <p className="mt-1 text-[12px] font-semibold text-rose/60">Your recommended intake today</p>
              <div className="mt-3 flex h-2.5 overflow-hidden rounded-full"><span className="bg-hotpink" style={{ width: "40%" }} /><span className="bg-pink-400" style={{ width: "30%" }} /><span className="bg-rose-300" style={{ width: "30%" }} /></div>
              <div className="mt-2.5 grid grid-cols-3 divide-x divide-hotpink/15 text-center">
                {[["40%", "Carbs", `${carbs} g`], ["30%", "Protein", `${protein} g`], ["30%", "Fats", `${fats} g`]].map(([p, l, g]) => (<div key={l} className="px-1"><p className="text-[13px] font-extrabold text-hotpink">{p}</p><p className="text-[11px] font-semibold text-rose/60">{l}</p><p className="text-[14px] font-extrabold text-rose">{g}</p></div>))}
              </div>
              <button onClick={() => go("pricing")} className={`${LINK} mt-3 active:scale-95`}>See why this is right for you <ArrowRight className="h-3.5 w-3.5" /></button>
            </div>
            <div className={CARD}>
              <div className="flex items-center gap-2.5"><span className="grid h-10 w-10 place-items-center rounded-full bg-hotpink/12"><Star className="h-5 w-5 text-hotpink" strokeWidth={2} /></span><p className="text-[17px] font-extrabold text-hotpink">Today's focus</p></div>
              <div className="mt-3 space-y-2">{todaysFocus.map((t) => (<div key={t} className="flex items-start gap-2"><Tick /><span className="text-[13px] font-semibold leading-snug text-rose/85">{t}</span></div>))}</div>
            </div>
          </div>

          {/* meals */}
          <div className={`${CARD} mt-4`}>
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5"><span className="grid h-10 w-10 place-items-center rounded-full bg-hotpink/12"><Salad className="h-5 w-5 text-hotpink" strokeWidth={2} /></span><div><p className="text-[17px] font-extrabold text-hotpink leading-tight">Your meals for today</p><p className="text-[12px] font-semibold text-rose/65">Delicious, balanced meals — <b className="text-hotpink">{kcal.toLocaleString()} kcal</b> total</p></div></div>
              <button onClick={() => go("pricing")} className={`${LINK} hidden active:scale-95 sm:inline-flex`}>View full meal plan <ArrowRight className="h-3.5 w-3.5" /></button>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-4">{meals.map((m) => (
              <div key={m.label} className="overflow-hidden rounded-2xl bg-white/70 ring-1 ring-white/70">
                <div className="relative aspect-[4/3] overflow-hidden"><img src={recipeImageSrc(m.r!)} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover" /><span className="absolute right-1.5 top-1.5 rounded-full bg-white/90 px-2 py-0.5 text-[11px] font-extrabold text-hotpink">{m.r!.macros.calories} kcal</span></div>
                <div className="p-2.5"><p className="text-[11px] font-bold uppercase tracking-wide text-hotpink/70">{m.label}</p><p className="text-[13.5px] font-extrabold leading-tight text-rose">{m.r!.name}</p><p className="mt-0.5 line-clamp-2 text-[11.5px] leading-snug text-rose/65">{m.r!.ingredients.slice(0, 4).map((i) => i.name).join(", ")}</p><button onClick={() => setRecipe(m.r!)} className="mt-2 inline-flex items-center gap-1 text-[12px] font-extrabold text-hotpink active:scale-95">View recipe <ArrowRight className="h-3.5 w-3.5" /></button></div>
              </div>
            ))}</div>
          </div>

          {/* workouts · yoga · mind */}
          <div className="mt-4 grid gap-4 lg:grid-cols-3">
            <div className={CARD}>
              <div className="flex items-center gap-2.5"><span className="grid h-10 w-10 place-items-center rounded-full bg-hotpink/12"><Dumbbell className="h-5 w-5 text-hotpink" strokeWidth={2} /></span><div><p className="text-[16px] font-extrabold text-hotpink leading-tight">Your workouts</p><p className="text-[11.5px] font-semibold text-rose/65">3 sessions this week · 30–40 min</p></div></div>
              <div className="mt-3 grid grid-cols-3 gap-2">{workouts.map((w) => <VideoThumb key={w.name} {...w} />)}</div>
              <button onClick={() => go("pricing")} className={`${LINK} mt-3 w-full justify-center active:scale-95`}>View your weekly plan <ArrowRight className="h-3.5 w-3.5" /></button>
            </div>
            <div className={CARD}>
              <div className="flex items-center gap-2.5"><span className="grid h-10 w-10 place-items-center rounded-full bg-hotpink/12"><Flower2 className="h-5 w-5 text-hotpink" strokeWidth={2} /></span><div><p className="text-[16px] font-extrabold text-hotpink leading-tight">Your yoga flow</p><p className="text-[11.5px] font-semibold text-rose/65">Recommended for your phase</p></div></div>
              <div className="mt-3 grid grid-cols-3 gap-2">{yoga.map((y) => <VideoThumb key={y.name} {...y} />)}</div>
              <button onClick={() => go("pricing")} className={`${LINK} mt-3 w-full justify-center active:scale-95`}>View all yoga flows <ArrowRight className="h-3.5 w-3.5" /></button>
            </div>
            <div className={CARD}>
              <div className="flex items-center gap-2.5"><span className="grid h-10 w-10 place-items-center rounded-full bg-hotpink/12"><Heart className="h-5 w-5 fill-hotpink text-hotpink" strokeWidth={2} /></span><p className="text-[16px] font-extrabold text-hotpink">Mind &amp; self-care</p></div>
              <div className="mt-3 space-y-2">{selfCare.map((t) => (<div key={t} className="flex items-start gap-2"><Tick /><span className="text-[13px] font-semibold leading-snug text-rose/85">{t}</span></div>))}</div>
              <button onClick={() => go("pricing")} className={`${LINK} mt-3 w-full justify-center active:scale-95`}>Add to my calendar <ArrowRight className="h-3.5 w-3.5" /></button>
            </div>
          </div>

          {/* footer CTA */}
          <div className="mt-7 flex flex-col items-center gap-3">
            <div className="flex w-full items-center justify-center gap-5">
              <p className="hidden shrink-0 font-script text-2xl leading-[0.9] text-hotpink/80 sm:block">Small steps<br />Big results ♡</p>
              <button onClick={() => go("pricing")} className="bloom-luxury-btn animate-cta-bounce flex w-full max-w-md items-center justify-center gap-2.5 py-4 text-[19px] font-bold text-white">Looks amazing! Let's go <ArrowRight className="h-5 w-5" /></button>
              <p className="hidden shrink-0 font-script text-2xl leading-[0.9] text-hotpink/80 sm:block">You're doing<br />amazing ♡</p>
            </div>
            <p className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-hotpink/70"><Lock className="h-3.5 w-3.5" /> You can always adjust your plan later</p>
          </div>
        </div>

        {/* cute recipe pop-up */}
        {recipe && (
          <div className="fixed inset-0 z-[120] flex items-end justify-center sm:items-center sm:p-4" onClick={() => setRecipe(null)}>
            <div className="absolute inset-0 bg-[#7a1247]/45 backdrop-blur-sm animate-fade-in" />
            <div className="relative flex max-h-[92vh] w-full max-w-md flex-col overflow-hidden rounded-t-[1.75rem] bg-white shadow-[0_-10px_50px_rgba(122,18,71,0.3)] animate-scale-in sm:rounded-[1.75rem]" onClick={(e) => e.stopPropagation()}>
              <div className="relative shrink-0">
                <img src={recipeImageSrc(recipe)} alt="" className="aspect-[16/10] w-full object-cover" />
                <div className="absolute inset-0" style={{ background: "linear-gradient(180deg, transparent 50%, rgba(122,18,71,0.55) 100%)" }} />
                <button onClick={() => setRecipe(null)} aria-label="Close" className="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full bg-white/90 text-hotpink shadow active:scale-90"><X className="h-5 w-5" strokeWidth={2.5} /></button>
                <span className="absolute left-3 top-3 rounded-full bg-white/90 px-2.5 py-1 text-[12px] font-extrabold text-hotpink">{recipe.macros.calories} kcal</span>
                <div className="absolute inset-x-4 bottom-2.5"><p className="text-[11px] font-bold uppercase tracking-wide text-white/85">{recipe.mealType}</p><p className="font-script text-[1.8rem] leading-none text-white drop-shadow-[0_2px_10px_rgba(122,18,71,0.6)]">{recipe.name}</p></div>
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto p-4">
                <div className="flex flex-wrap gap-2">
                  <span className="inline-flex items-center gap-1 rounded-full bg-hotpink/10 px-2.5 py-1 text-[12px] font-bold text-hotpink"><Timer className="h-3.5 w-3.5" /> {recipe.prepTime + recipe.cookTime} min</span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-hotpink/10 px-2.5 py-1 text-[12px] font-bold capitalize text-hotpink"><Gauge className="h-3.5 w-3.5" /> {recipe.difficulty}</span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-hotpink/10 px-2.5 py-1 text-[12px] font-bold text-hotpink"><Users className="h-3.5 w-3.5" /> {recipe.servings} serving{recipe.servings === 1 ? "" : "s"}</span>
                </div>
                <div className="mt-3 grid grid-cols-4 gap-2 text-center">
                  {([["kcal", recipe.macros.calories], ["Protein", `${recipe.macros.protein}g`], ["Carbs", `${recipe.macros.carbs}g`], ["Fats", `${recipe.macros.fat}g`]] as [string, string | number][]).map(([l, v]) => (<div key={l} className="rounded-xl bg-hotpink/8 py-1.5"><p className="text-[14px] font-extrabold text-hotpink">{v}</p><p className="text-[10.5px] font-semibold text-rose/60">{l}</p></div>))}
                </div>
                <p className="mt-4 text-[14px] font-extrabold text-hotpink">Ingredients</p>
                <ul className="mt-1.5 space-y-1.5">{recipe.ingredients.map((ing, i) => (<li key={i} className="flex items-start gap-2 text-[13px] text-rose/85"><span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-hotpink" /><span><b className="font-bold text-rose">{ing.quantity}</b> {ing.name}</span></li>))}</ul>
                <p className="mt-4 text-[14px] font-extrabold text-hotpink">How to make it</p>
                <ol className="mt-1.5 space-y-2">{recipe.steps.map((s, i) => (<li key={i} className="flex gap-2.5 text-[13px] leading-snug text-rose/85"><span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-hotpink text-[11px] font-extrabold text-white">{i + 1}</span><span>{s}</span></li>))}</ol>
              </div>
              <div className="shrink-0 border-t border-hotpink/10 p-3" style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}>
                <button onClick={() => go("pricing")} className="bloom-luxury-btn flex w-full items-center justify-center gap-2 py-3 text-[15px] font-bold text-white">Unlock all recipes <ArrowRight className="h-4 w-4" /></button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ── PRICING (Bloom+) ───────────────────────────────────────────────────────
  if (stage === "pricing") {
    const features = [
      { Icon: Flower2, t: "Cycle tracking that syncs every tool to your phase" },
      { Icon: Utensils, t: "Your whole week of meals, auto-planned & shoppable" },
      { Icon: Dumbbell, t: "Full workout & yoga programs matched to your cycle" },
      { Icon: Flame, t: "Energy engine — daily target, macros & goal timeline" },
      { Icon: CalendarDays, t: "A big calendar & life organizer for your month" },
      { Icon: Sparkles, t: "Long-term mood, health & progress insights" },
    ];
    const finish = () => { if (!preview) setOnboarded(); onDone(); };
    const startTrial = () => {
      if (preview) { onDone(); return; }
      setOnboarded();
      openCheckout(billing, { userId: user?.id, email: user?.email }).catch(() => { /* overlay failed — she stays, can Continue free */ });
    };
    const Plan = ({ id, name, price, per, badge }: { id: "monthly" | "annual"; name: string; price: string; per: string; badge?: string }) => (
      <button onClick={() => setBilling(id)} className={["relative rounded-[1.3rem] p-3 text-center transition active:scale-[0.98]", billing === id ? "bg-white ring-2 ring-hotpink shadow-[0_10px_28px_rgba(236,72,153,0.2)]" : "bg-white/75 ring-1 ring-hotpink/15"].join(" ")}>
        {badge && <span className="absolute -top-2 left-1/2 -translate-x-1/2 rounded-full bg-hotpink px-2 py-0.5 text-[10px] font-black text-white">{badge}</span>}
        <p className="text-[12px] font-extrabold text-rose/70">{name}</p>
        <p className="mt-0.5 text-[1.7rem] font-extrabold leading-none text-hotpink">{price}</p>
        <p className="text-[11px] font-semibold text-rose/60">{per}</p>
      </button>
    );
    return (
      <Frame>
        <HeroPanel tagline="Your whole world, unlocked" />
        <div className="relative flex flex-1 flex-col px-5 pb-6 md:flex-none md:w-[26rem] md:px-8 md:py-8 lg:w-[38rem] xl:w-[42rem] lg:px-10 lg:py-9" style={{ paddingTop: "max(1rem, env(safe-area-inset-top))" }}>
          <button onClick={() => go("previews")} className="inline-flex items-center gap-1 text-hotpink font-bold active:scale-95"><ChevronLeft className="h-5 w-5" /> Back</button>
          <div className="mt-2 text-center">
            <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl text-white shadow-md" style={{ background: "linear-gradient(135deg,#B76E79,#EC4899)" }}><Sparkles className="h-6 w-6" /></span>
            <p className="mt-2 text-[11px] font-black uppercase tracking-[0.22em]" style={{ color: "#B76E79" }}>Bloom+ Premium</p>
            <h1 className="mt-0.5 leading-[0.95]"><span className="block text-[1.9rem] font-bold text-[#7a1247]" style={{ fontFamily: SERIF }}>Your whole world,</span><span className="font-script text-[2.1rem] text-hotpink">unlocked ♡</span></h1>
            <p className="mx-auto mt-1.5 max-w-[20rem] text-[13px] leading-snug text-rose/75">Everything you just set up — cycle, meals, movement, energy & more. Start with a <b className="text-hotpink">3-day free trial</b>, cancel anytime.</p>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2.5">
            <Plan id="monthly" name="Monthly" price="$9.99" per="per month" />
            <Plan id="annual" name="Yearly" price="$59" per="per year" badge="SAVE 51%" />
          </div>
          <div className="mt-3 rounded-[1.4rem] bg-white/70 p-3.5 ring-1 ring-white/70"><div className="space-y-2">{features.map((f) => (<div key={f.t} className="flex items-start gap-2.5"><span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-hotpink/12"><f.Icon className="h-3 w-3 text-hotpink" strokeWidth={2.2} /></span><span className="text-[12.5px] font-semibold leading-snug text-rose/85">{f.t}</span></div>))}</div></div>
          <button onClick={startTrial} className="bloom-luxury-btn animate-cta-bounce mt-4 flex w-full items-center justify-center gap-2.5 py-3.5 text-[17px] font-bold text-white"><Sparkles className="h-5 w-5" /> Start 3-day free trial</button>
          <button onClick={finish} className="mt-2 w-full rounded-2xl border border-hotpink/30 bg-white/60 py-2.5 text-[14px] font-bold text-hotpink active:scale-[0.99] transition">Continue with the free version</button>
          <p className="mt-2 flex items-center justify-center gap-1.5 text-center text-[11px] font-semibold text-rose/60"><Check className="h-3.5 w-3.5 text-emerald-500" strokeWidth={3} /> 3-day free trial · cancel anytime · no hidden fees</p>
        </div>
      </Frame>
    );
  }

  return null;
}

export default BloomOnboarding;
