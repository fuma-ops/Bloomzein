import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft, Play, Pause, RotateCcw, SkipForward, X, Trophy, CalendarHeart,
  Share2, BookHeart, Volume2, VolumeX, Sparkles, ChevronRight, Check, Wand2,
} from "lucide-react";
import { BloomBubbles } from "@/components/bloom/BloomBubbles";
import { type CyclePhase, PHASE_LABEL, readCyclePhase } from "@/components/bloom/cyclePhase";
import {
  ZONES, WORKOUT_INTENTIONS, ENERGY_OPTIONS, WEEKLY_CHALLENGES, BADGES, BODY_TYPES,
  PHASE_OPTIMAL, HERO_IMAGES, ZONE_EXERCISES, buildSession,
  type Zone, type WorkoutIntention, type Level, type Equipment, type Goal,
  type EnergyLevel, type WorkoutProfile, type WorkoutSession, type BodyType, type Exercise,
} from "@/components/bloom/workout/data";

// ===================== STORAGE =====================

const ONBOARD_KEY = "bloom:workout-onboarded";
const PROFILE_KEY = "bloom:workout-profile";
const ENERGY_KEY = "bloom:workout-energy";
const STREAK_KEY = "bloom:workout-streak";
const BADGES_KEY = "bloom:workout-badges";
const PROGRAM_KEY = "bloom:workout-program";
const PROGRAM_PHASE_KEY = "bloom:workout-program-phase";
const PROGRAM_BANNER_KEY = "bloom:workout-program-banner-seen";
const CHALLENGE_KEY = "bloom:workout-challenge";
const SOUND_KEY = "bloom:workout-sound";
const VOICE_KEY = "bloom:workout-voice";
export const WORKOUT_LOG_KEY = "bloom:workout-history";

const DEFAULT_PROFILE: WorkoutProfile = { level: "Beginner", goal: "energy", equipment: "none", daysPerWeek: 3 };

export interface HistoryEntry {
  date: string;
  zone: Zone;
  intention: WorkoutIntention;
  phase: CyclePhase;
  durationMin: number;
  calories: number;
  sessionName: string;
}

interface DayPlan { zone: Zone; intention: WorkoutIntention; durationMin: 10 | 20 | 30; }

function useLS<T>(key: string, initial: T): [T, (v: T | ((p: T) => T)) => void] {
  const [value, setValue] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(key);
      return raw ? (JSON.parse(raw) as T) : initial;
    } catch {
      return initial;
    }
  });
  useEffect(() => {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
  }, [key, value]);
  return [value, setValue];
}

function todayISO() { return new Date().toISOString().slice(0, 10); }
function isYesterday(iso: string) {
  const d = new Date(iso); const y = new Date(); y.setDate(y.getDate() - 1);
  return d.toISOString().slice(0, 10) === y.toISOString().slice(0, 10);
}

// ===================== SOUND LAYER =====================
// Soft bip at 3s, clear bip at 0, gentle chime at rest end. No external audio files needed.

function playTimerBip(loud: boolean) {
  try {
    const Ctx = (window.AudioContext || (window as any).webkitAudioContext);
    const ctx = new Ctx();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = "sine"; o.frequency.value = loud ? 880 : 660;
    g.gain.setValueAtTime(0.0001, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(loud ? 0.25 : 0.12, ctx.currentTime + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + (loud ? 0.5 : 0.3));
    o.connect(g); g.connect(ctx.destination);
    o.start(); o.stop(ctx.currentTime + (loud ? 0.6 : 0.4));
  } catch {}
}

function playRestChime() {
  try {
    const Ctx = (window.AudioContext || (window as any).webkitAudioContext);
    const ctx = new Ctx();
    [523.25, 659.25, 783.99].forEach((f, i) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = "sine"; o.frequency.value = f;
      g.gain.setValueAtTime(0.0001, ctx.currentTime + i * 0.08);
      g.gain.exponentialRampToValueAtTime(0.15, ctx.currentTime + i * 0.08 + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + i * 0.08 + 1.0);
      o.connect(g); g.connect(ctx.destination);
      o.start(ctx.currentTime + i * 0.08); o.stop(ctx.currentTime + i * 0.08 + 1.1);
    });
  } catch {}
}

function speakNext(text: string) {
  try {
    if (!("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "en-US"; u.rate = 0.95;
    window.speechSynthesis.speak(u);
  } catch {}
}

// ===================== HELPERS =====================

const CALORIES_PER_MIN: Record<WorkoutIntention, number> = {
  tonify: 4, strengthen: 6, stretch: 2.5, recover: 2,
};

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const ACTIVE_DAY_PATTERNS: Record<2 | 3 | 4 | 5, string[]> = {
  2: ["Mon", "Thu"],
  3: ["Mon", "Wed", "Fri"],
  4: ["Mon", "Tue", "Thu", "Fri"],
  5: ["Mon", "Tue", "Wed", "Thu", "Fri"],
};

function durationForLevel(level: Level): 10 | 20 | 30 {
  return level === "Beginner" ? 10 : level === "Intermediate" ? 20 : 30;
}

const INTENTION_ORDER: WorkoutIntention[] = ["tonify", "strengthen", "stretch", "recover"];

function pickIntentionForPhase(phase: CyclePhase, goal: Goal, idx: number): WorkoutIntention {
  const phaseFirst = INTENTION_ORDER.filter((i) => PHASE_OPTIMAL[i].includes(phase));
  const goalPick: WorkoutIntention = goal === "strengthen" ? "strengthen" : goal === "flexibility" ? "stretch" : "tonify";
  const pool = phaseFirst.length ? phaseFirst : INTENTION_ORDER;
  const candidates = pool.includes(goalPick) ? [goalPick, ...pool.filter((p) => p !== goalPick)] : pool;
  return candidates[idx % candidates.length];
}

const ZONE_ROTATION: Zone[] = ["full-body", "glutes", "core", "legs", "arms", "back"];

function generateWeeklyPlan(profile: WorkoutProfile, phase: CyclePhase): Record<string, DayPlan | null> {
  const activeDays = ACTIVE_DAY_PATTERNS[profile.daysPerWeek];
  const durationMin = durationForLevel(profile.level);
  const plan: Record<string, DayPlan | null> = {};
  let zi = 0, ii = 0;
  for (const d of DAYS) {
    if (activeDays.includes(d)) {
      const intention = pickIntentionForPhase(phase, profile.goal, ii++);
      const zone = ZONE_ROTATION[zi++ % ZONE_ROTATION.length];
      plan[d] = { zone, intention, durationMin };
    } else {
      plan[d] = null;
    }
  }
  return plan;
}

// ===================== EXERCISE PHOTO (with graceful placeholder) =====================

function ExercisePhoto({ exercise, zone, className }: { exercise: Exercise; zone?: Zone; className: string }) {
  const [broken, setBroken] = useState(false);
  const fallbackImage = zone ? ZONES.find((z) => z.key === zone)?.image : undefined;

  if (broken) {
    if (fallbackImage) {
      return <img src={fallbackImage} alt={exercise.name} className={className} />;
    }
    return (
      <div className={`${className} grid place-items-center bg-gradient-to-br from-blush/70 to-petal/50`}>
        <Sparkles className="h-10 w-10 text-hotpink/50" strokeWidth={1.5} />
      </div>
    );
  }
  return (
    <img
      src={exercise.image}
      alt={exercise.name}
      className={className}
      onError={() => setBroken(true)}
    />
  );
}

// ===================== HERO BANNER =====================

function HeroBanner({ src, title, subtitle }: { src: string; title: string; subtitle?: string }) {
  const [broken, setBroken] = useState(false);
  return (
    <div className="relative w-full aspect-[16/9] rounded-3xl overflow-hidden border border-petal/60 shadow-md shadow-rose/10 mb-4">
      {broken ? (
        <div className="absolute inset-0 bg-gradient-to-br from-blush/80 to-petal/60 grid place-items-center">
          <Sparkles className="h-10 w-10 text-hotpink/40" strokeWidth={1.5} />
        </div>
      ) : (
        <img src={src} alt={title} className="absolute inset-0 h-full w-full object-cover object-top" onError={() => setBroken(true)} />
      )}
      <div className="absolute inset-0 bg-gradient-to-r from-hotpink/65 via-hotpink/20 to-transparent" />
      <div className="absolute bottom-0 left-0 p-3 sm:p-5">
        <h2 className="font-script text-2xl sm:text-4xl text-white leading-tight drop-shadow-md max-w-[7rem] sm:max-w-[10rem]">{title}</h2>
        {subtitle && <p className="mt-1 text-xs italic leading-snug text-white/90 max-w-[8rem] sm:max-w-[11rem] drop-shadow">{subtitle}</p>}
      </div>
    </div>
  );
}

// ===================== HERO HEADER (Workout Programs + tabs, on image) =====================

const SECTION_META: Record<"discover" | "program" | "library", { title: string; subtitle: string }> = {
  discover: { title: "Discover", subtitle: "Explore sessions, mini-tools, and find what fits your day." },
  program: { title: "My Program", subtitle: "Your personalized weekly plan — built for you, adjustable anytime." },
  library: { title: "Library", subtitle: "Get familiar with every move — browse positions by zone." },
};

function HeroHeader({
  src,
  tab,
  onPickTab,
  sectionTitle,
  sectionSubtitle,
}: {
  src: string;
  tab: "discover" | "program" | "library";
  onPickTab: (t: "discover" | "program" | "library") => void;
  sectionTitle: string;
  sectionSubtitle: string;
}) {
  const [broken, setBroken] = useState(false);
  return (
    <div className="relative w-full aspect-[16/9] lg:aspect-[32/9] rounded-3xl overflow-hidden border border-petal/60 shadow-xl shadow-rose/10 mb-4 animate-hero-border-signal">
      {broken ? (
        <div className="absolute inset-0 bg-gradient-to-br from-blush/80 to-petal/60 grid place-items-center">
          <Sparkles className="h-10 w-10 text-hotpink/40" strokeWidth={1.5} />
        </div>
      ) : (
        <img src={src} alt={sectionTitle} className="absolute inset-0 h-full w-full object-cover object-top" onError={() => setBroken(true)} />
      )}
      <div className="absolute inset-0 bg-gradient-to-r from-hotpink/65 via-hotpink/20 to-transparent" />
      <div className="relative h-full flex flex-col justify-between p-3 sm:p-6">
        <div>
          <h2 className="font-script text-3xl sm:text-5xl text-white leading-tight drop-shadow-md max-w-[8rem] sm:max-w-[12rem]">{sectionTitle}</h2>
          <p className="mt-1 text-xs italic leading-snug text-white/90 max-w-[8rem] sm:max-w-[11rem] drop-shadow">{sectionSubtitle}</p>
        </div>
        <div className="flex justify-center">
          <div className="inline-flex flex-wrap justify-center rounded-full bg-white/20 backdrop-blur-md border border-white/40 p-1">
            {(["discover", "program", "library"] as const).map((t) => (
              <button
                key={t}
                onClick={() => onPickTab(t)}
                className={[
                  "rounded-full px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-bold transition",
                  tab === t ? "bg-hotpink text-white shadow-md shadow-hotpink/30" : "text-white",
                  t === "discover" && tab === "discover" ? "animate-tab-glow-hint" : "",
                ].join(" ")}
              >
                {t === "discover" ? "Discover" : t === "program" ? "My Program" : "Library"}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ===================== CIRCULAR TIMER =====================

function CircularTimer({ totalSec, remainingSec, size = 96 }: { totalSec: number; remainingSec: number; size?: number }) {
  const strokeWidth = Math.max(6, Math.round(size / 14));
  const r = size / 2 - strokeWidth;
  const c = 2 * Math.PI * r;
  const progress = totalSec > 0 ? remainingSec / totalSec : 0;
  const offset = c * (1 - progress);
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} stroke="oklch(0.92 0.04 350)" strokeWidth={strokeWidth} fill="none" />
        <circle
          cx={size / 2} cy={size / 2} r={r} stroke="oklch(0.65 0.24 350)" strokeWidth={strokeWidth} fill="none"
          strokeDasharray={c} strokeDashoffset={offset} strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 1s linear" }}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center">
        <span className="font-bold text-hotpink" style={{ fontSize: size * 0.32 }}>{remainingSec}</span>
      </div>
    </div>
  );
}

// ===================== PAGE =====================

type View =
  | { kind: "discover" }
  | { kind: "program" }
  | { kind: "library" }
  | { kind: "best-shape" }
  | { kind: "session-start"; session: WorkoutSession }
  | { kind: "session-active"; session: WorkoutSession }
  | { kind: "session-end"; session: WorkoutSession; elapsedSec: number };

export default function WorkoutPage() {
  const [onboarded, setOnboarded] = useLS<boolean>(ONBOARD_KEY, false);
  const [profile, setProfile] = useLS<WorkoutProfile>(PROFILE_KEY, DEFAULT_PROFILE);
  const [view, setView] = useState<View>({ kind: "discover" });
  const [tab, setTab] = useState<"discover" | "program" | "library">("discover");

  if (!onboarded) {
    return (
      <div className="relative animate-fade-in">
        <BloomBubbles count={10} />
        <a href="/app/tools" className="mb-3 inline-flex items-center gap-1 text-sm text-rose hover:text-hotpink">
          <ArrowLeft className="h-4 w-4" /> All tools
        </a>
        <SetupProfile
          initial={profile}
          onDone={(p) => { setProfile(p); setOnboarded(true); }}
        />
      </div>
    );
  }

  if (view.kind === "session-start") {
    return <SessionStart session={view.session} onStart={() => setView({ kind: "session-active", session: view.session })} onExit={() => setView({ kind: tab })} />;
  }
  if (view.kind === "session-active") {
    return (
      <SessionActive
        session={view.session}
        onExit={() => setView({ kind: tab })}
        onDone={(elapsedSec) => setView({ kind: "session-end", session: view.session, elapsedSec })}
      />
    );
  }
  if (view.kind === "session-end") {
    return (
      <SessionEnd
        session={view.session}
        elapsedSec={view.elapsedSec}
        onDone={() => setView({ kind: tab })}
      />
    );
  }

  return (
    <div className="relative animate-fade-in">
      <BloomBubbles count={10} />
      <a href="/app/tools" className="mb-3 inline-flex items-center gap-1 text-sm text-rose hover:text-hotpink">
        <ArrowLeft className="h-4 w-4" /> All tools
      </a>

      {(view.kind === "discover" || view.kind === "program" || view.kind === "library") && (
        <HeroHeader
          src={HERO_IMAGES[view.kind]}
          tab={tab}
          onPickTab={(t) => { setTab(t); setView({ kind: t }); }}
          sectionTitle={SECTION_META[view.kind].title}
          sectionSubtitle={SECTION_META[view.kind].subtitle}
        />
      )}

      {view.kind === "discover" && (
        <Discover
          profile={profile}
          onStartSession={(session) => setView({ kind: "session-start", session })}
          onBestShape={() => setView({ kind: "best-shape" })}
        />
      )}
      {view.kind === "best-shape" && (
        <BestShapeCalculator
          onBack={() => setView({ kind: "discover" })}
          onStartWith={(zone, intention) => {
            setView({ kind: "session-start", session: buildSession(zone, intention, durationForLevel(profile.level), profile.level, readCyclePhase() ?? "any") });
          }}
        />
      )}
      {view.kind === "program" && (
        <MyProgram profile={profile} onStartSession={(session) => setView({ kind: "session-start", session })} />
      )}
      {view.kind === "library" && <Library />}
    </div>
  );
}

// ===================== SETUP PROFILE =====================

function SetupProfile({ initial, onDone }: { initial: WorkoutProfile; onDone: (p: WorkoutProfile) => void }) {
  const [level, setLevel] = useState<Level>(initial.level);
  const [goal, setGoal] = useState<Goal>(initial.goal);
  const [equipment, setEquipment] = useState<Equipment>(initial.equipment);
  const [days, setDays] = useState<2 | 3 | 4 | 5>(initial.daysPerWeek);

  const Pill = ({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) => (
    <button
      onClick={onClick}
      className={[
        "rounded-full px-4 py-2 text-sm font-semibold border shadow-sm transition active:scale-95",
        active ? "bg-hotpink text-white border-transparent shadow-md shadow-hotpink/30" : "bg-white/85 text-rose border-petal/60 hover:border-hotpink/40 hover:shadow-md",
      ].join(" ")}
    >
      {label}
    </button>
  );

  return (
    <section className="rounded-3xl bg-white/85 backdrop-blur border border-petal/60 p-5 sm:p-7 shadow-xl shadow-rose/10">
      <h1 className="font-script text-4xl sm:text-5xl text-hotpink leading-none">Let's set you up</h1>
      <p className="mt-2 text-sm text-rose/80">Four quick questions — editable anytime in Me settings.</p>

      <div className="mt-6 space-y-5">
        <div>
          <p className="text-sm font-bold text-rose mb-2">Your level</p>
          <div className="flex flex-wrap gap-2">
            {(["Beginner", "Intermediate", "Advanced"] as Level[]).map((l) => (
              <Pill key={l} active={level === l} label={l} onClick={() => setLevel(l)} />
            ))}
          </div>
        </div>

        <div>
          <p className="text-sm font-bold text-rose mb-2">Your main goal</p>
          <div className="flex flex-wrap gap-2">
            {([
              { key: "energy", label: "Energy" },
              { key: "tonify", label: "Tonify" },
              { key: "strengthen", label: "Strengthen" },
              { key: "flexibility", label: "Flexibility" },
            ] as { key: Goal; label: string }[]).map((g) => (
              <Pill key={g.key} active={goal === g.key} label={g.label} onClick={() => setGoal(g.key)} />
            ))}
          </div>
        </div>

        <div>
          <p className="text-sm font-bold text-rose mb-2">Equipment available</p>
          <div className="flex flex-wrap gap-2">
            {([
              { key: "none", label: "Nothing" },
              { key: "mat", label: "Mat only" },
              { key: "bands", label: "Bands" },
              { key: "dumbbells", label: "Dumbbells" },
              { key: "gym", label: "Full gym" },
            ] as { key: Equipment; label: string }[]).map((e) => (
              <Pill key={e.key} active={equipment === e.key} label={e.label} onClick={() => setEquipment(e.key)} />
            ))}
          </div>
        </div>

        <div>
          <p className="text-sm font-bold text-rose mb-2">Days available per week</p>
          <div className="flex flex-wrap gap-2">
            {([2, 3, 4, 5] as const).map((d) => (
              <Pill key={d} active={days === d} label={d === 5 ? "5+" : String(d)} onClick={() => setDays(d)} />
            ))}
          </div>
        </div>
      </div>

      <button
        onClick={() => onDone({ level, goal, equipment, daysPerWeek: days })}
        className="bloom-luxury-btn mt-6 inline-flex items-center gap-2 px-6 py-3 text-sm font-bold text-white"
      >
        Start <ChevronRight className="h-4 w-4" />
      </button>
    </section>
  );
}

// ===================== DISCOVER =====================

function loadHistory(): HistoryEntry[] {
  try {
    const raw = localStorage.getItem(WORKOUT_LOG_KEY);
    return raw ? (JSON.parse(raw) as HistoryEntry[]) : [];
  } catch { return []; }
}

// Diary → Workout: cramps/tired/bloated logged today or yesterday suggest a
// gentler Recovery session over the default recommendation.
const DIARY_KEY = "bloom:diary";
const RECOVERY_MOODS = new Set(["cramps", "tired", "bloated"]);

function recentDiaryDistress(days = 2): boolean {
  try {
    const raw = localStorage.getItem(DIARY_KEY);
    if (!raw) return false;
    const entries = JSON.parse(raw) as { date?: string; mood?: string }[];
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - (days - 1));
    const cutoffISO = cutoff.toISOString().slice(0, 10);
    return entries.some((e) => !!e.date && e.date >= cutoffISO && RECOVERY_MOODS.has(e.mood ?? ""));
  } catch { return false; }
}

function unlockedBadges(history: HistoryEntry[], streak: { count: number }): Set<string> {
  const ids = new Set<string>();
  if (history.length >= 1) ids.add("first-session");
  if (streak.count >= 7) ids.add("streak-7");
  if (history.length >= 12) ids.add("weekly-warrior");
  if (history.some((h) => h.phase === "period")) ids.add("first-period-session");
  if (history.filter((h) => h.phase === "luteal").length >= 5) ids.add("luteal-legend");
  if (history.filter((h) => h.phase === "ovulation" || h.phase === "fertile").length >= 3) ids.add("ovulation-fire");
  if (history.filter((h) => h.zone === "glutes").length >= 5) ids.add("glutes-queen");
  if (history.filter((h) => h.zone === "core").length >= 5) ids.add("core-crusher");
  if (history.filter((h) => h.zone === "full-body").length >= 3) ids.add("full-body-week");
  return ids;
}

function Discover({ profile, onStartSession, onBestShape }: {
  profile: WorkoutProfile;
  onStartSession: (s: WorkoutSession) => void;
  onBestShape: () => void;
}) {
  const [phase, setPhase] = useState<CyclePhase>("any");
  const [energy, setEnergy] = useLS<{ date: string; level: EnergyLevel | null }>(ENERGY_KEY, { date: "", level: null });
  const [streak] = useLS<{ count: number; lastISO: string | null }>(STREAK_KEY, { count: 0, lastISO: null });
  const [zone, setZone] = useState<Zone | null>(null);
  const [intention, setIntention] = useState<WorkoutIntention | null>(null);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [suggestRecover, setSuggestRecover] = useState(false);
  const [recoveryReason, setRecoveryReason] = useState<"energy" | "diary" | null>(null);
  const [challenge, setChallenge] = useLS<{ phase: CyclePhase | "any"; weekStart: string; done: number }>(CHALLENGE_KEY, { phase: "any", weekStart: "", done: 0 });
  const intentionSectionRef = useRef<HTMLDivElement>(null);
  const sessionListRef = useRef<HTMLDivElement>(null);
  const zoneSectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setPhase(readCyclePhase() ?? "any");
  }, []);

  useEffect(() => {
    if (recentDiaryDistress()) {
      setSuggestRecover(true);
      setRecoveryReason("diary");
    }
  }, []);

  useEffect(() => {
    setSelectedSessionId(null);
  }, [intention]);

  // Auto-scroll to reveal the next step once a choice is made, so it's clear there's more to pick.
  useEffect(() => {
    const target = zone && intention ? sessionListRef.current : zone ? intentionSectionRef.current : null;
    if (target) {
      requestAnimationFrame(() => target.scrollIntoView({ behavior: "smooth", block: "start" }));
    }
  }, [zone, intention]);

  const todayEnergy = energy.date === todayISO() ? energy.level : null;

  const onPickEnergy = (level: EnergyLevel) => {
    setEnergy({ date: todayISO(), level });
    if (level === "exhausted" && (phase === "luteal" || phase === "period")) {
      setSuggestRecover(true);
      setRecoveryReason("energy");
    } else {
      setSuggestRecover(false);
      setRecoveryReason(null);
    }
  };

  const onPickZone = (z: Zone) => {
    setZone(z);
    if (suggestRecover) {
      setIntention("recover");
    } else {
      setIntention(null);
    }
    setSelectedSessionId(null);
  };

  const onPickSession = (session: WorkoutSession) => {
    setSelectedSessionId(session.id);
    setTimeout(() => onStartSession(session), 200);
  };

  const history = useMemo(() => loadHistory(), [zone, intention]);
  const badges = useMemo(() => unlockedBadges(history, streak), [history, streak]);

  // Weekly challenge — reset if a new week started
  const weekStart = useMemo(() => {
    const d = new Date();
    const day = d.getDay();
    const diff = (day === 0 ? -6 : 1) - day;
    d.setDate(d.getDate() + diff);
    return d.toISOString().slice(0, 10);
  }, []);
  useEffect(() => {
    if (challenge.weekStart !== weekStart || challenge.phase !== phase) {
      setChallenge({ phase, weekStart, done: 0 });
    }
  }, [phase, weekStart]);

  const challengeData = phase !== "any" ? WEEKLY_CHALLENGES[phase] : null;

  // sessions sorted with phase-optimal intention durations first
  const intentionList = useMemo(() => {
    if (!intention) return [];
    return ([10, 20, 30] as const).map((d) => buildSession(zone!, intention, d, profile.level, phase));
  }, [zone, intention, profile.level, phase]);

  return (
    <div className="space-y-4">

      {/* Energy Check */}
      <section className="rounded-3xl bg-white/85 backdrop-blur border border-petal/60 p-4 sm:p-5">
        <h2 className="font-script text-2xl text-hotpink leading-none mb-3 animate-text-pop">How's your energy today?</h2>
        <div className="grid grid-cols-4 gap-2">
          {ENERGY_OPTIONS.map((opt, i) => {
            const Icon = opt.icon;
            const active = todayEnergy === opt.key;
            return (
              <div key={opt.key} className="animate-card-pop-in" style={{ animationDelay: `${i * 0.06}s` }}>
              <button
                onClick={() => onPickEnergy(opt.key)}
                className={[
                  "w-full flex flex-col items-center gap-1.5 rounded-2xl border p-3 shadow-sm transition active:scale-95",
                  active ? "bg-blush/70 border-hotpink/40 shadow-md shadow-hotpink/15 animate-selected-glow" : "bg-white/70 border-petal/50 hover:border-hotpink/40 hover:shadow-md hover:-translate-y-0.5",
                  !todayEnergy ? "animate-hint-glow-delayed" : "",
                ].join(" ")}
              >
                <Icon className="h-5 w-5 text-hotpink" strokeWidth={1.8} />
                <span className="text-[11px] font-semibold text-rose text-center leading-tight">{opt.label}</span>
              </button>
              </div>
            );
          })}
        </div>
        {suggestRecover && (
          <div className="mt-3 rounded-2xl bg-blush/60 border border-petal/50 p-3">
            <p className="text-sm text-rose/85">
              {recoveryReason === "diary"
                ? "We noticed you logged cramps, fatigue or bloating recently — want a gentler Recovery session today?"
                : "Sounds like your body wants rest today — switch to a Recovery session?"}
            </p>
            <div className="mt-2 flex gap-2">
              <button
                onClick={() => zoneSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}
                className="bloom-luxury-btn px-4 py-1.5 text-xs font-bold text-white"
              >
                Yes, show recovery
              </button>
              <button onClick={() => setSuggestRecover(false)} className="rounded-full bg-white/90 px-4 py-1.5 text-xs font-semibold text-rose border border-petal/60">No, keep my plan</button>
            </div>
          </div>
        )}
      </section>

      {/* Body Focus */}
      <section ref={zoneSectionRef} className="rounded-3xl bg-white/85 backdrop-blur border border-petal/60 p-4 sm:p-6 scroll-mt-20">
        <h2 className="font-script text-2xl sm:text-3xl text-hotpink leading-none mb-3">What do you want to focus on?</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-3 grid-flow-row-dense">
          {ZONES.map((z, i) => {
            const active = zone === z.key;
            return (
              <div key={z.key} className="relative animate-card-pop-in" style={{ animationDelay: `${i * 0.06}s` }}>
                {active && (
                  <div className="absolute -inset-1.5 rounded-[1.4rem] bg-gradient-to-br from-hotpink/60 to-magenta/50 blur-md animate-bloom-pulse -z-10" />
                )}
                <button
                  onClick={() => onPickZone(z.key)}
                  className={[
                    "group relative aspect-square w-full rounded-2xl overflow-hidden border transition active:scale-95",
                    active
                      ? "bloom-shine border-white/70 shadow-[0_10px_28px_-8px_oklch(0.65_0.27_350/0.6)] ring-2 ring-hotpink/50"
                      : "border-white/40 shadow-[0_6px_18px_-10px_oklch(0.65_0.18_350/0.4)] hover:shadow-[0_10px_24px_-10px_oklch(0.65_0.22_350/0.5)] hover:-translate-y-0.5",
                    todayEnergy && !zone ? "animate-hint-glow" : "",
                  ].join(" ")}
                >
                  <ExercisePhoto exercise={{ slug: z.key, name: z.label, image: z.image, muscles: "" }} className="absolute inset-0 h-full w-full object-cover" />
                  {/* glossy sheen */}
                  <div className="absolute inset-x-0 top-0 h-2/5 bg-gradient-to-b from-white/45 via-white/10 to-transparent" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/10 to-transparent" />
                  {/* top edge highlight */}
                  <div className="absolute inset-x-0 top-0 h-px bg-white/60" />
                  <span className="absolute bottom-1.5 left-0 right-0 text-center text-[11px] sm:text-xs font-bold text-white drop-shadow leading-tight px-1">{z.label}</span>
                  {active && (
                    <span className="absolute top-1.5 right-1.5 grid h-5 w-5 sm:h-6 sm:w-6 place-items-center rounded-full bg-gradient-to-br from-white to-blush text-hotpink shadow-md ring-1 ring-white/70">
                      <Check className="h-3 w-3 sm:h-3.5 sm:w-3.5" strokeWidth={3} />
                    </span>
                  )}
                </button>
              </div>
            );
          })}
        </div>

        {zone && (
          <div ref={intentionSectionRef} className="mt-4 scroll-mt-20">
            <p className="text-sm font-bold text-rose mb-2">Pick an intention</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {WORKOUT_INTENTIONS.map((it) => {
                const Icon = it.icon;
                const active = intention === it.key;
                const optimal = phase !== "any" && PHASE_OPTIMAL[it.key].includes(phase);
                return (
                  <button
                    key={it.key}
                    onClick={() => setIntention(it.key)}
                    className={[
                      "flex flex-col items-start gap-1 rounded-2xl border p-3 text-left shadow-sm transition active:scale-95",
                      active
                        ? "bloom-shine bg-gradient-to-br from-hotpink to-magenta text-white border-transparent shadow-[0_8px_22px_-8px_oklch(0.65_0.27_350/0.6)] animate-selected-glow"
                        : "bg-white/70 border-petal/50 text-rose hover:border-hotpink/40 hover:shadow-md hover:-translate-y-0.5",
                      !intention ? "animate-hint-glow" : "",
                    ].join(" ")}
                  >
                    <span className="flex items-center gap-1.5">
                      <Icon className={["h-4 w-4", active ? "text-white" : "text-hotpink"].join(" ")} strokeWidth={1.8} />
                      <span className="text-sm font-bold">{it.label}</span>
                      {optimal && (
                        <span className={["ml-auto rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide", active ? "bg-white/20 text-white" : "bg-blush/70 text-hotpink"].join(" ")}>
                          {PHASE_LABEL[phase]}
                        </span>
                      )}
                    </span>
                    <span className={["text-[11px] leading-snug", active ? "text-white/85" : "text-rose/75"].join(" ")}>{it.desc}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {zone && intention && (
          <div ref={sessionListRef} className="mt-4 grid sm:grid-cols-3 gap-3 scroll-mt-20">
            {intentionList.map((session) => {
              const active = selectedSessionId === session.id;
              return (
              <button
                key={session.id}
                onClick={() => onPickSession(session)}
                className={[
                  "rounded-2xl sm:rounded-3xl bg-white/90 backdrop-blur border border-petal/60 overflow-hidden shadow-md shadow-rose/10 hover:-translate-y-0.5 hover:shadow-lg active:scale-95 transition text-left p-4",
                  active ? "animate-selected-glow" : "animate-hint-glow",
                ].join(" ")}
              >
                <p className="font-bold text-rose">{session.name}</p>
                <p className="mt-1 text-xs text-rose/70">{session.durationMin} min · {session.exercises.length} exercises · {session.level}</p>
                <p className="mt-0.5 text-[11px] text-rose/60">{session.workSec}s work / {session.restSec}s rest</p>
                {phase !== "any" && session.phaseOptimal.includes(phase) && (
                  <p className="mt-2 inline-flex items-center gap-1 rounded-full bg-blush/70 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-hotpink">
                    Optimized for your {PHASE_LABEL[phase].toLowerCase()} phase
                  </p>
                )}
                {session.intensityNote && (
                  <p className="mt-1.5 text-[11px] leading-snug text-rose/70">{session.intensityNote}</p>
                )}
              </button>
              );
            })}
          </div>
        )}
      </section>

      {/* Streak & Badges */}
      <section className="rounded-3xl bg-white/85 backdrop-blur border border-petal/60 p-4 sm:p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-script text-2xl text-hotpink leading-none">Streak & badges</h2>
          <p className="text-sm font-bold text-rose">{streak.count} day{streak.count === 1 ? "" : "s"} 🔥</p>
        </div>
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
          {BADGES.map((b) => {
            const unlocked = badges.has(b.id);
            return (
              <div
                key={b.id}
                className={[
                  "flex shrink-0 flex-col items-center gap-1.5 rounded-2xl border p-3 w-24 text-center transition",
                  unlocked ? "bg-blush/70 border-hotpink/40" : "bg-white/60 border-petal/40 opacity-50",
                ].join(" ")}
              >
                <Trophy className={["h-5 w-5", unlocked ? "text-hotpink" : "text-rose/50"].join(" ")} strokeWidth={1.8} />
                <span className="text-[10px] font-semibold text-rose leading-tight">{b.label}</span>
              </div>
            );
          })}
        </div>
      </section>

      {/* Weekly Challenge */}
      {challengeData && (
        <section className="rounded-3xl bg-white/85 backdrop-blur border border-petal/60 p-4 sm:p-5">
          <h2 className="font-script text-2xl text-hotpink leading-none mb-2">Weekly challenge</h2>
          <p className="text-sm text-rose/85 mb-3">{challengeData.title}</p>
          <div className="flex items-center gap-2">
            <div className="h-2 flex-1 rounded-full bg-blush/60 overflow-hidden">
              <div className="h-full bg-hotpink rounded-full transition-all" style={{ width: `${Math.min(100, (challenge.done / challengeData.target) * 100)}%` }} />
            </div>
            <span className="text-xs font-bold text-rose whitespace-nowrap">{challenge.done}/{challengeData.target}</span>
          </div>
          <button
            onClick={() => setChallenge((c) => ({ ...c, done: Math.min(challengeData.target, c.done + 1) }))}
            className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-white/90 px-4 py-1.5 text-xs font-semibold text-rose border border-petal/60"
          >
            <Check className="h-3.5 w-3.5" /> Mark done
          </button>
        </section>
      )}

      {/* Best Shape Calculator */}
      <section className="rounded-3xl bg-white/85 backdrop-blur border border-petal/60 p-4 sm:p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="font-script text-2xl text-hotpink leading-none mb-1">Best Shape Calculator</h2>
            <p className="text-sm text-rose/80">Discover your natural strengths — not numbers.</p>
          </div>
          <button onClick={onBestShape} className="bloom-luxury-btn shrink-0 inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white">
            <Wand2 className="h-3.5 w-3.5" /> Open
          </button>
        </div>
      </section>
    </div>
  );
}

// ===================== BEST SHAPE CALCULATOR =====================

function suggestBodyType(weightKg: number, heightCm: number): BodyType {
  const ratio = weightKg / (heightCm / 100);
  if (ratio < 25) return "rectangle";
  if (ratio < 30) return "hourglass";
  if (ratio < 35) return "pear";
  if (ratio < 40) return "apple";
  return "inverted-triangle";
}

function BestShapeCalculator({ onBack, onStartWith }: { onBack: () => void; onStartWith: (zone: Zone, intention: WorkoutIntention) => void }) {
  const [unit, setUnit] = useState<"metric" | "imperial">("metric");
  const [weight, setWeight] = useState("");
  const [height, setHeight] = useState("");
  const [selected, setSelected] = useState<BodyType | null>(null);

  const suggested = useMemo(() => {
    const w = parseFloat(weight), h = parseFloat(height);
    if (!w || !h) return null;
    const wKg = unit === "metric" ? w : w * 0.453592;
    const hCm = unit === "metric" ? h : h * 2.54;
    return suggestBodyType(wKg, hCm);
  }, [weight, height, unit]);

  const active = selected ?? suggested;
  const data = active ? BODY_TYPES[active] : null;

  return (
    <section className="rounded-3xl bg-white/85 backdrop-blur border border-petal/60 p-5 sm:p-7">
      <div className="flex items-center justify-between mb-3">
        <h1 className="font-script text-3xl sm:text-4xl text-hotpink leading-none">Best Shape Calculator</h1>
        <button onClick={onBack} className="rounded-full bg-white/85 px-3 py-1.5 text-xs font-semibold text-rose border border-petal/60">Back</button>
      </div>

      <HeroBanner src={HERO_IMAGES.bestShape} title="Know your strengths" subtitle="A gentle way to find the workouts that already suit your body." />

      <div className="rounded-2xl bg-blush/60 border border-petal/50 p-3 mb-4 text-sm text-rose/85">
        <p className="font-bold text-rose mb-1">How it works</p>
        <p>1. Enter your weight &amp; height, or simply tap the body shape that feels like yours.</p>
        <p>2. We'll show your natural strengths and the workout intentions that complement them.</p>
        <p>3. Tap "Start with this" to jump straight into a matching session — no numbers, no judgment.</p>
      </div>

      <div className="flex gap-2 mb-4">
        {(["metric", "imperial"] as const).map((u) => (
          <button
            key={u}
            onClick={() => setUnit(u)}
            className={["rounded-full px-3 py-1.5 text-xs font-semibold border shadow-sm transition active:scale-95", unit === u ? "bg-hotpink text-white border-transparent" : "bg-white/85 text-rose border-petal/60 hover:border-hotpink/40 hover:shadow-md"].join(" ")}
          >
            {u === "metric" ? "kg / cm" : "lb / in"}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3 mb-5">
        <div>
          <label className="text-xs font-bold text-rose">Weight ({unit === "metric" ? "kg" : "lb"})</label>
          <input value={weight} onChange={(e) => setWeight(e.target.value)} type="number" inputMode="decimal"
            className="mt-1 w-full rounded-xl bg-white/90 border border-petal/60 px-3 py-2 text-sm text-rose outline-none focus:ring-2 focus:ring-hotpink/30" />
        </div>
        <div>
          <label className="text-xs font-bold text-rose">Height ({unit === "metric" ? "cm" : "in"})</label>
          <input value={height} onChange={(e) => setHeight(e.target.value)} type="number" inputMode="decimal"
            className="mt-1 w-full rounded-xl bg-white/90 border border-petal/60 px-3 py-2 text-sm text-rose outline-none focus:ring-2 focus:ring-hotpink/30" />
        </div>
      </div>

      <p className="text-sm font-bold text-rose mb-2">Or simply pick what feels right</p>
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mb-5">
        {(Object.keys(BODY_TYPES) as BodyType[]).map((key) => {
          const bt = BODY_TYPES[key];
          const isActive = active === key;
          return (
            <button
              key={key}
              onClick={() => setSelected(key)}
              className={[
                "flex flex-col items-center gap-2 rounded-2xl border p-3 shadow-sm transition active:scale-95",
                isActive ? "bg-blush/70 border-hotpink/40 shadow-md shadow-hotpink/15" : "bg-white/70 border-petal/50 hover:border-hotpink/40 hover:shadow-md hover:-translate-y-0.5",
              ].join(" ")}
            >
              <ExercisePhoto exercise={{ slug: key, name: bt.label, image: bt.image, muscles: "" }} className="h-12 w-12 object-contain" />
              <span className="text-[11px] font-semibold text-rose text-center leading-tight">{bt.label}</span>
            </button>
          );
        })}
      </div>

      {data && (
        <div className="rounded-2xl bg-blush/60 border border-petal/50 p-4">
          <p className="font-bold text-rose mb-1">{data.label}</p>
          <p className="text-sm text-rose/85 mb-3">{data.strengths}</p>
          <p className="text-xs font-bold text-rose mb-2">Recommended intentions</p>
          <div className="flex flex-wrap gap-2 mb-3">
            {data.recommended.map((i) => (
              <span key={i} className="rounded-full bg-white/90 border border-petal/60 px-3 py-1 text-xs font-semibold text-rose">
                {WORKOUT_INTENTIONS.find((w) => w.key === i)?.label}
              </span>
            ))}
          </div>
          <button
            onClick={() => onStartWith("full-body", data.recommended[0])}
            className="bloom-luxury-btn inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white"
          >
            Start with this <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
    </section>
  );
}

// ===================== MY PROGRAM =====================

function MyProgram({ profile, onStartSession }: { profile: WorkoutProfile; onStartSession: (s: WorkoutSession) => void }) {
  const [phase, setPhase] = useState<CyclePhase>("any");
  const [program, setProgram] = useLS<Record<string, DayPlan | null> | null>(PROGRAM_KEY, null);
  const [programPhase, setProgramPhase] = useLS<CyclePhase | null>(PROGRAM_PHASE_KEY, null);
  const [bannerSeen, setBannerSeen] = useLS<boolean>(PROGRAM_BANNER_KEY, false);
  const [zoneFilter, setZoneFilter] = useState<Zone | "all">("all");
  const [intentionFilter, setIntentionFilter] = useState<WorkoutIntention | "all">("all");

  useEffect(() => { setPhase(readCyclePhase() ?? "any"); }, []);

  const validate = () => {
    setProgram(generateWeeklyPlan(profile, phase));
    setProgramPhase(phase);
    setBannerSeen(true);
  };
  const skip = () => setBannerSeen(true);

  const phaseChanged = !!program && programPhase !== null && programPhase !== phase;

  return (
    <div className="space-y-4">

      {!program && (
        <section className="rounded-3xl bg-white/85 backdrop-blur border border-petal/60 p-4 sm:p-5">
          <p className="font-bold text-rose mb-2">How My Program works</p>
          <ol className="space-y-1.5 text-sm text-rose/85 list-decimal list-inside">
            <li>We use your setup profile (level, goal, equipment, days/week) and your current cycle phase{phase !== "any" ? ` (${PHASE_LABEL[phase].toLowerCase()})` : ""}.</li>
            <li>We propose a full week — a zone &amp; intention for each active day, rest days for the rest.</li>
            <li>Tap <span className="font-bold">Validate</span> to accept it, <span className="font-bold">Adjust</span> to regenerate, or <span className="font-bold">Skip</span> to plan it yourself later.</li>
            <li>Tap any day's card to start that session. Use the filters to browse by zone, intention, or equipment.</li>
          </ol>
        </section>
      )}

      {!program && !bannerSeen && (
        <section className="rounded-3xl bg-white/85 backdrop-blur border border-petal/60 p-4 sm:p-5">
          <h2 className="font-script text-2xl text-hotpink leading-none mb-2">Your weekly plan is ready</h2>
          <p className="text-sm text-rose/85 mb-3">Based on your profile{phase !== "any" ? ` and your ${PHASE_LABEL[phase].toLowerCase()} phase` : ""}, here's a soft proposal for the week.</p>
          <div className="flex flex-wrap gap-2">
            <button onClick={validate} className="bloom-luxury-btn px-4 py-2 text-xs font-bold text-white">Validate</button>
            <button onClick={validate} className="rounded-full bg-white/90 px-4 py-2 text-xs font-semibold text-rose border border-petal/60">Adjust</button>
            <button onClick={skip} className="rounded-full bg-white/90 px-4 py-2 text-xs font-semibold text-rose border border-petal/60">Skip for now</button>
          </div>
        </section>
      )}

      {phaseChanged && (
        <section className="rounded-3xl bg-white/85 backdrop-blur border border-petal/60 p-4 sm:p-5">
          <p className="text-sm text-rose/85 mb-3">Your phase changed — want to update this week's intensity?</p>
          <div className="flex gap-2">
            <button onClick={validate} className="bloom-luxury-btn px-4 py-2 text-xs font-bold text-white">Yes, adjust</button>
            <button onClick={() => setProgramPhase(phase)} className="rounded-full bg-white/90 px-4 py-2 text-xs font-semibold text-rose border border-petal/60">Keep as is</button>
          </div>
        </section>
      )}

      {/* Filter bar */}
      <section className="rounded-3xl bg-white/85 backdrop-blur border border-petal/60 p-4 sm:p-5">
        <h2 className="font-script text-2xl sm:text-3xl text-hotpink leading-none mb-3">Your week</h2>
        <div className="flex flex-wrap gap-2 mb-2">
          <button onClick={() => setZoneFilter("all")} className={["rounded-full px-3 py-1.5 text-xs font-semibold border shadow-sm transition active:scale-95", zoneFilter === "all" ? "bg-hotpink text-white border-transparent" : "bg-white/85 text-rose border-petal/60 hover:border-hotpink/40 hover:shadow-md"].join(" ")}>All zones</button>
          {ZONES.map((z) => (
            <button key={z.key} onClick={() => setZoneFilter(z.key)} className={["rounded-full px-3 py-1.5 text-xs font-semibold border shadow-sm transition active:scale-95", zoneFilter === z.key ? "bg-hotpink text-white border-transparent" : "bg-white/85 text-rose border-petal/60 hover:border-hotpink/40 hover:shadow-md"].join(" ")}>{z.label}</button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => setIntentionFilter("all")} className={["rounded-full px-3 py-1.5 text-xs font-semibold border shadow-sm transition active:scale-95", intentionFilter === "all" ? "bg-hotpink text-white border-transparent" : "bg-white/85 text-rose border-petal/60 hover:border-hotpink/40 hover:shadow-md"].join(" ")}>All intentions</button>
          {WORKOUT_INTENTIONS.map((it) => (
            <button key={it.key} onClick={() => setIntentionFilter(it.key)} className={["rounded-full px-3 py-1.5 text-xs font-semibold border shadow-sm transition active:scale-95", intentionFilter === it.key ? "bg-hotpink text-white border-transparent" : "bg-white/85 text-rose border-petal/60 hover:border-hotpink/40 hover:shadow-md"].join(" ")}>{it.label}</button>
          ))}
        </div>

        {!program ? (
          <div className="mt-4 text-sm text-rose/70">
            <p className="mb-2">No plan yet — generate your personalized week in one tap.</p>
            <button onClick={validate} className="bloom-luxury-btn px-4 py-2 text-xs font-bold text-white">Generate my week</button>
          </div>
        ) : (
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-7 gap-2">
            {DAYS.map((d) => {
              const plan = program[d];
              const hidden = plan && ((zoneFilter !== "all" && plan.zone !== zoneFilter) || (intentionFilter !== "all" && plan.intention !== intentionFilter));
              return (
                <div key={d} className="rounded-2xl bg-blush/40 border border-petal/50 p-2 min-h-[110px] flex flex-col">
                  <p className="text-[11px] font-bold uppercase tracking-wide text-hotpink/70 mb-1">{d}</p>
                  {!plan ? (
                    <div className="flex-1 grid place-items-center text-[11px] font-semibold text-rose/50">Rest day</div>
                  ) : hidden ? (
                    <div className="flex-1 grid place-items-center text-[11px] text-rose/40">Filtered</div>
                  ) : (
                    <button
                      onClick={() => onStartSession(buildSession(plan.zone, plan.intention, plan.durationMin, profile.level, phase))}
                      className="flex-1 rounded-xl bg-white/90 border border-petal/60 p-2 text-left shadow-sm hover:-translate-y-0.5 hover:shadow-md hover:border-hotpink/40 active:scale-95 transition"
                    >
                      <p className="text-xs font-bold text-rose">{ZONES.find((z) => z.key === plan.zone)?.label}</p>
                      <p className="text-[11px] text-rose/70">{WORKOUT_INTENTIONS.find((i) => i.key === plan.intention)?.label}</p>
                      <p className="mt-1 text-[10px] text-rose/60">{plan.durationMin} min</p>
                      {phase !== "any" && PHASE_OPTIMAL[plan.intention].includes(phase) && (
                        <p className="mt-1 inline-block rounded-full bg-blush/70 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-hotpink">{PHASE_LABEL[phase]}</p>
                      )}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

// ===================== LIBRARY =====================

function Library() {
  const [zone, setZone] = useState<Zone>("glutes");
  const exercises = ZONE_EXERCISES[zone];

  return (
    <div className="space-y-4">

      <section className="rounded-3xl bg-white/85 backdrop-blur border border-petal/60 p-4 sm:p-6">
        <div className="flex flex-wrap gap-2 mb-4">
          {ZONES.map((z) => (
            <button
              key={z.key}
              onClick={() => setZone(z.key)}
              className={[
                "rounded-full px-3 py-1.5 text-xs font-semibold border shadow-sm transition active:scale-95",
                zone === z.key ? "bg-hotpink text-white border-transparent shadow-md shadow-hotpink/30" : "bg-white/85 text-rose border-petal/60 hover:border-hotpink/40 hover:shadow-md",
              ].join(" ")}
            >
              {z.label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {exercises.map((ex, i) => (
            <div
              key={ex.slug}
              className="rounded-2xl sm:rounded-3xl bg-white/90 backdrop-blur border border-petal/60 overflow-hidden shadow-md shadow-rose/10 animate-card-pop-in"
              style={{ animationDelay: `${i * 0.05}s` }}
            >
              <ExercisePhoto exercise={ex} zone={zone} className="aspect-square w-full object-cover" />
              <div className="p-2.5">
                <p className="text-sm font-bold text-rose leading-tight">{ex.name}</p>
                <p className="mt-0.5 text-[11px] text-rose/70 leading-snug">{ex.muscles}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

// ===================== SESSION MODE =====================

function SessionStart({ session, onStart, onExit }: { session: WorkoutSession; onStart: () => void; onExit: () => void }) {
  const [phase, setPhase] = useState<CyclePhase>("any");
  useEffect(() => { setPhase(readCyclePhase() ?? "any"); }, []);
  const zone = ZONES.find((z) => z.key === session.zone);
  const intention = WORKOUT_INTENTIONS.find((i) => i.key === session.intention);
  const first = session.exercises[0];

  return (
    <div className="fixed inset-0 z-[60] bg-blush/95 backdrop-blur grid place-items-center p-4 overflow-y-auto">
      <div className="relative w-full max-w-md rounded-3xl bg-white/95 border border-petal/60 shadow-2xl text-center overflow-hidden my-8">
        <ExercisePhoto exercise={first} zone={session.zone} className="w-full aspect-[16/9] object-cover" />
        <button onClick={onExit} className="absolute right-3 top-3 rounded-full bg-white/85 p-2 text-rose border border-petal/60"><X className="h-4 w-4" /></button>
        <div className="p-6 sm:p-8">
        <h1 className="font-script text-4xl text-hotpink leading-none mb-2">{session.name}</h1>
        <p className="text-sm text-rose/80 mb-4">{session.durationMin} min · {session.exercises.length} exercises · {session.level}</p>
        <div className="flex justify-center gap-2 mb-4">
          {zone && <span className="rounded-full bg-blush/70 px-3 py-1 text-xs font-semibold text-rose">{zone.label}</span>}
          {intention && <span className="rounded-full bg-blush/70 px-3 py-1 text-xs font-semibold text-rose">{intention.label}</span>}
        </div>
        {phase !== "any" && session.phaseOptimal.includes(phase) && (
          <p className="mb-4 text-xs font-bold uppercase tracking-wide text-hotpink">Optimized for your {PHASE_LABEL[phase].toLowerCase()} phase</p>
        )}
        <div className="rounded-2xl bg-blush/40 border border-petal/50 p-3 mb-4 text-left">
          <p className="text-[11px] font-bold uppercase tracking-wide text-hotpink/70 mb-1">First up</p>
          <p className="font-bold text-rose">{first.name}</p>
          <p className="text-xs text-rose/70">{first.muscles}</p>
        </div>
        <button onClick={onStart} className="bloom-luxury-btn inline-flex items-center gap-2 px-8 py-4 text-base font-bold text-white">
          <Play className="h-5 w-5" /> Start
        </button>
        </div>
      </div>
    </div>
  );
}

type ExercisePhase = "exercise" | "rest";

function SessionActive({ session, onExit, onDone }: {
  session: WorkoutSession;
  onExit: () => void;
  onDone: (elapsedSec: number) => void;
}) {
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<ExercisePhase>("exercise");
  const [remaining, setRemaining] = useState(session.workSec);
  const [paused, setPaused] = useState(false);
  const [sound, setSound] = useLS<boolean>(SOUND_KEY, true);
  const [voice] = useLS<boolean>(VOICE_KEY, false);
  const elapsedRef = useRef(0);

  const exercise = session.exercises[index];
  const next = session.exercises[index + 1];

  // Keep the screen awake for the duration of the workout.
  useEffect(() => {
    let lock: any = null;
    const requestLock = async () => {
      try {
        if ("wakeLock" in navigator) {
          lock = await (navigator as any).wakeLock.request("screen");
        }
      } catch {}
    };
    requestLock();
    const onVisibility = () => {
      if (document.visibilityState === "visible") requestLock();
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      if (lock) lock.release().catch(() => {});
    };
  }, []);

  useEffect(() => {
    if (paused) return;
    const t = setInterval(() => {
      elapsedRef.current += 1;
      setRemaining((r) => {
        const nr = r - 1;
        if (nr === 5 && phase === "exercise" && sound) playTimerBip(false);
        if (nr <= 0) {
          if (phase === "exercise") {
            if (sound) playTimerBip(true);
            if (index === session.exercises.length - 1) {
              onDone(elapsedRef.current);
              return 0;
            }
            setPhase("rest");
            if (sound) playRestChime();
            if (voice && next) speakNext(`Next up: ${next.name}`);
            return session.restSec;
          } else {
            setPhase("exercise");
            setIndex((i) => i + 1);
            return session.workSec;
          }
        }
        return nr;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [paused, phase, index, sound, voice, session, next]);

  const repeat = () => { setRemaining(phase === "exercise" ? session.workSec : session.restSec); };
  const skip = () => {
    if (phase === "exercise") {
      if (index === session.exercises.length - 1) { onDone(elapsedRef.current); return; }
      setPhase("rest"); setRemaining(session.restSec);
      if (voice && next) speakNext(`Next up: ${next.name}`);
    } else {
      setPhase("exercise"); setIndex((i) => i + 1); setRemaining(session.workSec);
    }
  };
  const skipRest = () => { setPhase("exercise"); setIndex((i) => i + 1); setRemaining(session.workSec); };

  const totalSec = phase === "exercise" ? session.workSec : session.restSec;

  return (
    <div className="fixed inset-0 z-[60] bg-blush/95 backdrop-blur flex flex-col">
      {/* Progress bar */}
      <div className="h-1.5 bg-white/60">
        <div className="h-full bg-hotpink transition-all" style={{ width: `${((index + (phase === "rest" ? 1 : 0)) / session.exercises.length) * 100}%` }} />
      </div>

      <div className="flex items-center justify-between p-3">
        <button onClick={onExit} className="rounded-full bg-white/90 p-2.5 sm:p-3 text-rose border border-petal/60"><X className="h-5 w-5 sm:h-6 sm:w-6" /></button>
        <p className="text-base sm:text-xl font-bold text-rose">{index + 1} / {session.exercises.length}</p>
        <button onClick={() => setSound((s) => !s)} className="rounded-full bg-white/90 p-2.5 sm:p-3 text-rose border border-petal/60">
          {sound ? <Volume2 className="h-5 w-5 sm:h-6 sm:w-6" /> : <VolumeX className="h-5 w-5 sm:h-6 sm:w-6" />}
        </button>
      </div>

      <div className="relative flex-1 flex flex-col items-center justify-center p-4 gap-4 overflow-y-auto">
        {phase === "exercise" && next && remaining > 0 && remaining <= 5 && (
          <div className="absolute top-3 right-3 z-10 flex items-center gap-3 rounded-2xl bg-white/95 border border-petal/60 shadow-lg p-3 sm:p-4 pr-4 sm:pr-6 animate-fade-in">
            <ExercisePhoto exercise={next} zone={session.zone} className="h-20 w-20 sm:h-28 sm:w-28 object-cover rounded-xl border border-petal/60" />
            <div className="text-left">
              <p className="text-xs sm:text-sm font-bold uppercase tracking-wide text-hotpink/70 leading-none">Next up</p>
              <p className="text-lg sm:text-2xl font-bold text-rose leading-tight mt-1">{next.name}</p>
            </div>
          </div>
        )}
        {phase === "exercise" ? (
          <>
            <ExercisePhoto exercise={exercise} zone={session.zone} className="w-full max-w-md mx-auto aspect-square object-cover rounded-3xl border border-petal/60 shadow-md" />
            <h2 className="font-script text-4xl sm:text-6xl text-hotpink leading-none text-center">{exercise.name}</h2>
            <p className="text-base sm:text-xl text-rose/70 text-center">{exercise.muscles}</p>
            <CircularTimer totalSec={totalSec} remainingSec={remaining} size={160} />
          </>
        ) : (
          <div className="w-full max-w-md rounded-3xl bg-white/90 border border-petal/60 p-6 sm:p-8 text-center shadow-md">
            <p className="text-sm sm:text-lg font-bold uppercase tracking-wide text-hotpink/70 mb-2">Rest</p>
            <CircularTimer totalSec={totalSec} remainingSec={remaining} size={140} />
            {next && (
              <div className="mt-4">
                <p className="text-sm sm:text-lg font-semibold text-rose/70 mb-2">Next up</p>
                <ExercisePhoto exercise={next} zone={session.zone} className="mx-auto h-24 w-24 sm:h-32 sm:w-32 object-cover rounded-2xl border border-petal/60" />
                <p className="mt-2 text-lg sm:text-2xl font-bold text-rose">{next.name}</p>
              </div>
            )}
            <button onClick={skipRest} className="mt-4 rounded-full bg-white/90 px-5 py-2 sm:px-6 sm:py-3 text-sm sm:text-base font-semibold text-rose border border-petal/60">Skip rest</button>
          </div>
        )}
      </div>

      {phase === "exercise" && (
        <div className="grid grid-cols-3 gap-2 p-3 bg-white/60">
          <button onClick={() => setPaused((p) => !p)} className="flex flex-col items-center gap-1 rounded-2xl bg-white/90 border border-petal/60 py-3 sm:py-4 text-sm sm:text-base font-semibold text-rose">
            {paused ? <Play className="h-5 w-5 sm:h-6 sm:w-6" /> : <Pause className="h-5 w-5 sm:h-6 sm:w-6" />} {paused ? "Resume" : "Pause"}
          </button>
          <button onClick={repeat} className="flex flex-col items-center gap-1 rounded-2xl bg-white/90 border border-petal/60 py-3 sm:py-4 text-sm sm:text-base font-semibold text-rose">
            <RotateCcw className="h-5 w-5 sm:h-6 sm:w-6" /> Repeat this
          </button>
          <button onClick={skip} className="flex flex-col items-center gap-1 rounded-2xl bg-white/90 border border-petal/60 py-3 sm:py-4 text-sm sm:text-base font-semibold text-rose">
            <SkipForward className="h-5 w-5 sm:h-6 sm:w-6" /> Skip
          </button>
        </div>
      )}
    </div>
  );
}

function SessionEnd({ session, elapsedSec, onDone }: { session: WorkoutSession; elapsedSec: number; onDone: () => void }) {
  const [streak, setStreak] = useLS<{ count: number; lastISO: string | null }>(STREAK_KEY, { count: 0, lastISO: null });
  const [unlockedNew, setUnlockedNew] = useState<string[]>([]);
  const calories = Math.round((elapsedSec / 60) * CALORIES_PER_MIN[session.intention]);
  const minutes = Math.floor(elapsedSec / 60);
  const seconds = elapsedSec % 60;

  useEffect(() => {
    const phase = readCyclePhase() ?? "any";
    const before = unlockedBadges(loadHistory(), streak);

    const history = loadHistory();
    const entry: HistoryEntry = {
      date: todayISO(), zone: session.zone, intention: session.intention, phase,
      durationMin: session.durationMin, calories, sessionName: session.name,
    };
    history.push(entry);
    try { localStorage.setItem(WORKOUT_LOG_KEY, JSON.stringify(history)); } catch {}

    setStreak((s) => {
      if (s.lastISO === todayISO()) return s;
      if (s.lastISO && isYesterday(s.lastISO)) return { count: s.count + 1, lastISO: todayISO() };
      return { count: 1, lastISO: todayISO() };
    });

    const after = unlockedBadges(history, { count: streak.lastISO === todayISO() ? streak.count : streak.count + 1 });
    setUnlockedNew([...after].filter((id) => !before.has(id)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const addToJournal = () => {
    try {
      const raw = localStorage.getItem("bloom:notes");
      const notes = raw ? JSON.parse(raw) : [];
      notes.unshift({
        id: `workout-${Date.now()}`,
        title: `${session.name} — completed`,
        text: `${session.durationMin} min · ${session.exercises.length} exercises · ~${calories} kcal · ${minutes}:${String(seconds).padStart(2, "0")}`,
        color: "sakura", tag: "Self-care", pinned: false, createdAt: new Date().toISOString(),
      });
      localStorage.setItem("bloom:notes", JSON.stringify(notes));
    } catch {}
    window.location.href = "/app/tools/notes";
  };

  const share = () => {
    const text = `I just completed "${session.name}" on Bloomzein 🌸 ${session.durationMin} min · ~${calories} kcal`;
    if (navigator.share) {
      navigator.share({ text }).catch(() => {});
    } else {
      navigator.clipboard?.writeText(text).catch(() => {});
    }
  };

  return (
    <div className="fixed inset-0 z-[60] bg-blush/95 backdrop-blur grid place-items-center p-4 overflow-y-auto">
      <div className="w-full max-w-md rounded-3xl bg-white/95 border border-petal/60 p-6 sm:p-8 shadow-2xl text-center my-8">
        <h1 className="font-script text-4xl text-hotpink leading-none mb-2">Beautifully done ✿</h1>
        <p className="text-sm text-rose/80 mb-4">{session.name}</p>

        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="rounded-2xl bg-blush/60 border border-petal/50 p-3">
            <p className="text-2xl font-bold text-hotpink">{minutes}:{String(seconds).padStart(2, "0")}</p>
            <p className="text-[11px] font-semibold text-rose/70">Total time</p>
          </div>
          <div className="rounded-2xl bg-blush/60 border border-petal/50 p-3">
            <p className="text-2xl font-bold text-hotpink">~{calories}</p>
            <p className="text-[11px] font-semibold text-rose/70">kcal (approx.)</p>
          </div>
        </div>

        {unlockedNew.length > 0 && (
          <div className="mb-4 rounded-2xl bg-blush/70 border border-hotpink/30 p-3 animate-fade-in">
            <p className="text-xs font-bold uppercase tracking-wide text-hotpink mb-1">New badge unlocked!</p>
            {unlockedNew.map((id) => (
              <p key={id} className="text-sm font-semibold text-rose flex items-center justify-center gap-1.5">
                <Trophy className="h-4 w-4 text-hotpink" /> {BADGES.find((b) => b.id === id)?.label}
              </p>
            ))}
          </div>
        )}

        <p className="mb-4 inline-flex items-center gap-1.5 text-xs font-semibold text-rose/70">
          <CalendarHeart className="h-3.5 w-3.5 text-hotpink" /> Added to your Bloom Calendar
        </p>

        <div className="flex flex-wrap justify-center gap-2 mb-4">
          <button onClick={addToJournal} className="inline-flex items-center gap-1.5 rounded-full bg-white/90 px-4 py-2 text-xs font-semibold text-rose border border-petal/60">
            <BookHeart className="h-3.5 w-3.5" /> Add to journal
          </button>
          <button onClick={share} className="inline-flex items-center gap-1.5 rounded-full bg-white/90 px-4 py-2 text-xs font-semibold text-rose border border-petal/60">
            <Share2 className="h-3.5 w-3.5" /> Share
          </button>
        </div>

        <button onClick={onDone} className="bloom-luxury-btn inline-flex items-center gap-2 px-8 py-3 text-sm font-bold text-white">
          Done
        </button>
      </div>
    </div>
  );
}
