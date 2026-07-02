import { useEffect, useState } from "react";
import {
  Pencil, Sparkles, Droplet, Flame, Wallet,
  Heart, BookOpen, Flower2, Target, ChevronRight,
  User, Crown, Bell, Settings as SettingsIcon, Shield, LifeBuoy, LogOut, RotateCcw,
  ArrowRight, Moon, Star, Smile, Dumbbell, PenLine, Check, Sprout, Wind,
} from "lucide-react";
import { BloomBubbles } from "@/components/bloom/BloomBubbles";
import { useAuth } from "@/contexts/AuthContext";
import { useToolSnapshots } from "@/lib/toolSnapshots";
import { readCyclePhase, PHASE_LABEL, type CyclePhase } from "@/components/bloom/cyclePhase";

// ── Real data helpers ─────────────────────────────────────────────────────────
function readJSON<T>(key: string, fb: T): T {
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fb; } catch { return fb; }
}
function last7ISO(): string[] {
  const out: string[] = [];
  const now = new Date();
  for (let i = 0; i < 7; i++) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
    out.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`);
  }
  return out;
}

const PHASE_DESC: Record<Exclude<CyclePhase, "any">, string> = {
  period:     "Rest and renew — your body is doing powerful work.",
  follicular: "Fresh energy is rising. A great day to begin.",
  fertile:    "You're glowing — bright, open and magnetic.",
  ovulation:  "Peak energy. Channel it into something bold.",
  luteal:     "Wind down gently — softness is your strength.",
};

interface MeStats {
  phase: Exclude<CyclePhase, "any"> | null;
  streak: number;
  moodDays: number; moveDays: number; journalCount: number;
  waterToday: number; waterGoal: number;
  weekDots: boolean[];
  level: number; pct: number;
}

function computeMeStats(): MeStats {
  const days = last7ISO();
  const daySet = new Set(days);
  const todayISO = days[0];

  const moodLog = readJSON<Record<string, string>>("bloom:mood-log-v2", {});
  const todayMood = (() => { try { return localStorage.getItem("bloom:today-mood"); } catch { return null; } })();
  const moodDays = days.filter((d) => moodLog[d] || (d === todayISO && todayMood)).length;

  const workoutHist = readJSON<{ date: string }[]>("bloom:workout-history", []);
  const yoga = readJSON<{ count: number; lastISO: string | null }>("bloom:yoga-streak", { count: 0, lastISO: null });
  const moveSet = new Set(workoutHist.filter((h) => daySet.has(h.date)).map((h) => h.date));
  if (yoga.lastISO && daySet.has(yoga.lastISO)) moveSet.add(yoga.lastISO);

  const diary = readJSON<{ date: string }[]>("bloom:diary", []);
  const journalCount = diary.filter((e) => daySet.has(e.date)).length;

  const water = readJSON<{ date: string; count: number }>("bloom:today-water", { date: "", count: 0 });
  const waterGoal = (() => { const g = Number(localStorage.getItem("bloom:today-water-goal")); return g > 0 ? g : 8; })();
  const waterToday = water.date === todayISO ? water.count : 0;

  const streak = (() => { const s = Number(localStorage.getItem("bloom:streak-days")); return s > 0 ? s : 0; })();

  // A day "blooms" if she logged a mood, moved, or journaled. Ordered Mon→Sun-ish (oldest→newest).
  const weekDots = [...days].reverse().map((d) => !!moodLog[d] || moveSet.has(d) || diary.some((e) => e.date === d));

  // Level grows with total real activity — honest, not decorative.
  const total = Object.keys(moodLog).length + workoutHist.length + diary.length + yoga.count;
  const level = Math.floor(total / 12) + 1;
  const pct = Math.round(((total % 12) / 12) * 100);

  const phase = readCyclePhase();
  return {
    phase: phase && phase !== "any" ? phase : null,
    streak, moodDays, moveDays: moveSet.size, journalCount,
    waterToday, waterGoal, weekDots, level, pct,
  };
}

/** Shared, bidirectional with the Diet tool — drives the "tailored for you" recommendations. */
const ME_GOAL_KEY = "bloom:me-goal";
type MeGoal = "lose" | "maintain" | "gain";
const GOAL_OPTIONS: { key: MeGoal; label: string; Icon: typeof Heart }[] = [
  { key: "lose", label: "Lose weight", Icon: Wind },
  { key: "maintain", label: "Feel balanced", Icon: Heart },
  { key: "gain", label: "Gain strength", Icon: Sprout },
];

function SectionTitle({ children, hint }: { children: React.ReactNode; hint?: string }) {
  return (
    <div className="mb-3 flex items-end justify-between gap-3">
      <h2 className="font-script text-3xl sm:text-4xl text-hotpink">{children}</h2>
      {hint && <span className="text-xs text-rose/70 shrink-0">{hint}</span>}
    </div>
  );
}

function PrimaryBtn({ children, href }: { children: React.ReactNode; href: string }) {
  return (
    <a
      href={href}
      className="bloom-luxury-btn inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white"
    >
      {children}
    </a>
  );
}

/* ---------- Sample data ---------- */
const favorites = [
  { title: "Cycle syncing 101", tag: "Wellness", img: "/images/read-cycle.png", href: "/app/read" },
  { title: "Soft girl morning ritual", tag: "Lifestyle", img: "/images/read-selfcare.png", href: "/app/read" },
  { title: "Pink budgeting that works", tag: "Money", img: "/images/read-money.png", href: "/budget" },
];

const goals = [
  { title: "Drink 2L water daily", pct: 72 },
  { title: "Save $500 this month", pct: 45 },
  { title: "Yoga 4x a week", pct: 60 },
];

const achievements = [
  { label: "First Bloom", Icon: Flower2 },
  { label: "Journal Lover", Icon: BookOpen },
  { label: "Hydration Queen", Icon: Droplet },
  { label: "Cycle Master", Icon: Moon },
  { label: "Self Care Star", Icon: Star },
];

const settingsGroups: { items: { Icon: typeof User; label: string; href?: string }[]; danger?: boolean }[] = [
  {
    items: [
      { Icon: User, label: "Account & profile" },
      { Icon: Crown, label: "Bloom Premium" },
      { Icon: Bell, label: "Notifications & reminders" },
      { Icon: SettingsIcon, label: "Preferences" },
      { Icon: Shield, label: "Privacy & data" },
      { Icon: LifeBuoy, label: "Help & support" },
      { Icon: RotateCcw, label: "Replay welcome tour" },
    ],
  },
  { items: [{ Icon: LogOut, label: "Log out" }], danger: true },
];

export default function MePage() {
  const { profile, user, signOut, updateProfile } = useAuth();
  const displayName = profile?.name || user?.email?.split("@")[0] || "Bloom girl";
  const snapshots = useToolSnapshots();

  // Lets you re-trigger the new-user onboarding popup at any time, for testing.
  async function replayOnboarding() {
    try {
      localStorage.removeItem("bloomzein_onboarding");
      localStorage.removeItem("bloomzein_visited_tools");
    } catch {}
    await updateProfile({ setup_done: false });
    window.location.href = "/app/today";
  }

  const [goal, setGoal] = useState<MeGoal>("maintain");
  const [stats, setStats] = useState<MeStats | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  useEffect(() => {
    try {
      const g = localStorage.getItem(ME_GOAL_KEY);
      if (g === "lose" || g === "maintain" || g === "gain") setGoal(g);
    } catch {}
    setStats(computeMeStats());
  }, []);

  const memberSince = (() => {
    const iso = profile?.created_at;
    if (!iso) return null;
    try { return new Date(iso).toLocaleDateString("en-US", { month: "long", year: "numeric" }); } catch { return null; }
  })();

  function chooseGoal(g: MeGoal) {
    setGoal(g);
    try { localStorage.setItem(ME_GOAL_KEY, g); } catch {}
  }

  return (
    <div className="relative animate-fade-in">
      <BloomBubbles count={10} />

      {/* HERO */}
      <section className="relative animate-card-pop-in" style={{ animationDelay: "0ms" }}>
        <div
          className="pearl-frame relative overflow-hidden rounded-[1.75rem] sm:rounded-[2.5rem] p-4 sm:p-8"
          style={{ background: "linear-gradient(135deg, #ffeaf5 0%, #ffd3ec 55%, #ffc0e3 100%)" }}
        >
          <div className="relative z-[2] flex items-center gap-3 sm:gap-6">
            <div className="relative shrink-0">
              <div className="absolute -inset-1 rounded-full bg-white/70 blur-md" />
              <img
                src="/images/me-avatar.png"
                alt="Your avatar"
                className="relative h-16 w-16 sm:h-28 sm:w-28 rounded-full border-2 sm:border-4 border-white object-cover shadow-xl shadow-hotpink/30"
                referrerPolicy="no-referrer"
              />
              <button onClick={() => setEditOpen(true)} aria-label="Edit profile" className="absolute -bottom-1 -right-1 grid h-6 w-6 sm:h-8 sm:w-8 place-items-center rounded-full bg-white text-hotpink border border-petal/60 shadow-md transition hover:scale-105 active:scale-95">
                <Pencil className="h-3 w-3 sm:h-3.5 sm:w-3.5" strokeWidth={1.8} />
              </button>
            </div>

            <div className="flex-1 min-w-0">
              <h1 className="font-script text-2xl sm:text-5xl text-hotpink leading-none flex items-center gap-1.5">
                Hey, {displayName}! <Sparkles className="h-4 w-4 sm:h-7 sm:w-7" strokeWidth={1.8} />
              </h1>
              <span className="mt-1.5 sm:mt-2 inline-flex items-center gap-1 rounded-full bg-white/80 px-2 py-0.5 text-[9px] sm:text-[11px] font-bold uppercase tracking-wider text-hotpink border border-petal/60">
                <Sparkles className="h-2.5 w-2.5 sm:h-3 sm:w-3" strokeWidth={2} /> Soft Soul
              </span>
              {memberSince && <p className="mt-1 sm:mt-1.5 text-[10px] sm:text-xs text-rose/80">Blooming since {memberSince} ✿</p>}

              <div className="mt-2 sm:mt-3 max-w-xs">
                <div className="flex items-center justify-between text-[10px] sm:text-xs font-bold text-hotpink">
                  <span>Level {stats?.level ?? 1}</span>
                  <span>{stats?.pct ?? 0}%</span>
                </div>
                <div className="mt-1 h-2 sm:h-2.5 w-full rounded-full bg-white/70 border border-petal/60 overflow-hidden">
                  <div className="h-full rounded-full bg-gradient-to-r from-hotpink to-magenta transition-all duration-700" style={{ width: `${stats?.pct ?? 0}%` }} />
                </div>
                <p className="mt-1 text-[9px] sm:text-[11px] text-rose/70">{100 - (stats?.pct ?? 0)}% to next bloom</p>
              </div>

              <button onClick={() => setEditOpen(true)} className="mt-2.5 sm:mt-4 inline-flex items-center gap-1.5 rounded-full bg-white/90 px-3 py-1.5 sm:px-4 sm:py-2 text-[11px] sm:text-xs font-semibold text-hotpink shadow-md transition hover:bg-white hover:-translate-y-0.5 active:scale-95">
                <Pencil className="h-3 w-3 sm:h-3.5 sm:w-3.5" strokeWidth={1.8} /> Edit profile
              </button>
            </div>

            <div className="hidden sm:flex shrink-0 items-center justify-center">
              <div className="clay-blob pearl-sheen animate-icon-breathe grid h-24 w-24 sm:h-32 sm:w-32 place-items-center rounded-full text-white">
                <Flower2 className="h-12 w-12 sm:h-16 sm:w-16 drop-shadow-[0_2px_4px_oklch(0.4_0.22_350/0.3)]" strokeWidth={1.5} />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* JOURNEY */}
      <section className="mt-5 sm:mt-8 animate-card-pop-in" style={{ animationDelay: "60ms" }}>
        <SectionTitle hint="this week">Your Bloom journey</SectionTitle>
        <div className="grid grid-cols-2 gap-2.5 sm:gap-4 sm:grid-cols-4">
          {stats?.phase ? (
            <JourneyCard
              index={0}
              Icon={Droplet}
              eyebrow="Cycle Phase"
              title={`${PHASE_LABEL[stats.phase]} Phase`}
              desc={PHASE_DESC[stats.phase]}
            />
          ) : (
            <a href="/app/tools/cycle" className="block">
              <JourneyCard index={0} Icon={Droplet} eyebrow="Cycle Phase" title="Set up ✿" desc="Tap to sync your cycle." />
            </a>
          )}
          <JourneyCard
            index={1}
            Icon={Flame}
            eyebrow="Bloom Streak"
            title={`${stats?.streak ?? 0} ${(stats?.streak ?? 0) === 1 ? "day" : "days"}`}
            desc={(stats?.streak ?? 0) > 0 ? "Keep the soft momentum going ✿" : "Log something today to begin."}
            extra={<WeekDots filled={stats?.weekDots ?? [false, false, false, false, false, false, false]} />}
          />
          {snapshots.map((s, i) => (
            <JourneyCard key={s.slug} index={i + 2} Icon={s.Icon} eyebrow={s.label} title={s.value} desc={s.note} />
          ))}
        </div>
      </section>

      {/* THIS WEEK'S BLOOM */}
      <section className="mt-5 sm:mt-8 animate-card-pop-in" style={{ animationDelay: "120ms" }}>
        <SectionTitle>This week's bloom</SectionTitle>
        <div className="bloom-pearl-card pearl-sheen rounded-2xl sm:rounded-3xl p-4 sm:p-6 flex flex-col sm:flex-row items-center gap-4 sm:gap-6">
          <div className="flex-1 w-full grid grid-cols-2 gap-3 sm:gap-5">
            <WeeklyMetric Icon={Smile} label="Mood" value={stats?.moodDays ?? 0} total={7} unit="days" />
            <WeeklyMetric Icon={Droplet} label="Water" value={stats?.waterToday ?? 0} total={stats?.waterGoal ?? 8} unit="today" />
            <WeeklyMetric Icon={Dumbbell} label="Movement" value={stats?.moveDays ?? 0} total={7} unit="days" />
            <WeeklyMetric Icon={PenLine} label="Journal" value={stats?.journalCount ?? 0} total={7} unit="entries" />
          </div>
          <div className="clay-blob pearl-sheen grid h-28 w-28 sm:h-36 sm:w-36 shrink-0 place-items-center rounded-full text-white text-center px-5">
            <div>
              <Heart className="mx-auto h-7 w-7 sm:h-9 sm:w-9 mb-1.5 drop-shadow-[0_2px_4px_oklch(0.4_0.22_350/0.3)]" strokeWidth={1.8} fill="currentColor" />
              <p className="font-script text-sm sm:text-base leading-tight drop-shadow-[0_1px_2px_oklch(0.4_0.22_350/0.3)]">
                You're doing amazing, keep blooming!
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ACHIEVEMENTS */}
      <section className="mt-5 sm:mt-8 animate-card-pop-in" style={{ animationDelay: "180ms" }}>
        <SectionTitle hint="View all →">Achievements</SectionTitle>
        <div className="flex gap-3 sm:gap-5 overflow-x-auto no-scrollbar pb-1">
          {achievements.map((a, i) => (
            <div
              key={a.label}
              style={{ animationDelay: `${i * 60}ms` }}
              className="flex flex-col items-center gap-1.5 sm:gap-2 shrink-0 w-16 sm:w-20 animate-card-pop-in"
            >
              <span className="clay-blob animate-icon-breathe grid h-12 w-12 sm:h-16 sm:w-16 place-items-center rounded-full text-white">
                <a.Icon className="h-5 w-5 sm:h-7 sm:w-7" strokeWidth={1.6} />
              </span>
              <span className="text-[10px] sm:text-xs font-semibold text-rose text-center leading-tight">{a.label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* FAVORITES */}
      <section className="mt-5 sm:mt-8 animate-card-pop-in" style={{ animationDelay: "240ms" }}>
        <SectionTitle hint="View all →">Favorites & saved</SectionTitle>
        <div className="flex gap-3 sm:gap-4 overflow-x-auto no-scrollbar snap-x snap-mandatory pb-1">
          {favorites.map((f, i) => (
            <a
              key={f.title}
              href={f.href}
              style={{ animationDelay: `${i * 60}ms` }}
              className="snap-start shrink-0 w-40 sm:w-56 bloom-pearl-card pearl-sheen rounded-2xl sm:rounded-3xl overflow-hidden animate-card-pop-in transition hover:-translate-y-0.5"
            >
              <div className="relative h-24 sm:h-32 overflow-hidden">
                <img src={f.img} alt="" className="h-full w-full object-cover" loading="lazy" referrerPolicy="no-referrer" />
              </div>
              <div className="p-2.5 sm:p-3.5">
                <p className="text-xs sm:text-sm font-semibold text-rose leading-snug line-clamp-2">{f.title}</p>
                <span className="mt-1.5 inline-flex items-center rounded-full bg-blush text-hotpink text-[9px] sm:text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 border border-petal/60">
                  {f.tag}
                </span>
              </div>
            </a>
          ))}
        </div>
      </section>

      {/* GOALS */}
      <section className="mt-5 sm:mt-8 animate-card-pop-in" style={{ animationDelay: "300ms" }}>
        <SectionTitle hint="syncs with Diet">My goals & intentions</SectionTitle>
        <div className="bloom-pearl-card pearl-sheen rounded-2xl sm:rounded-3xl p-4 sm:p-5 mb-3">
          <div className="flex items-center gap-2 text-rose">
            <span className="grid h-8 w-8 place-items-center rounded-full bg-blush text-hotpink">
              <Target className="h-4 w-4" strokeWidth={1.6} />
            </span>
            <span className="text-sm font-semibold">Wellness goal</span>
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2">
            {GOAL_OPTIONS.map(({ key, label, Icon }) => (
              <button
                key={key}
                onClick={() => chooseGoal(key)}
                className={[
                  "flex flex-col items-center gap-1.5 rounded-2xl p-2.5 text-center transition-all duration-200 active:scale-95",
                  goal === key ? "bg-hotpink/10 ring-2 ring-hotpink" : "bg-blush/60 hover:bg-petal/70",
                ].join(" ")}
              >
                <span className={[
                  "grid h-8 w-8 place-items-center rounded-full",
                  goal === key ? "bg-hotpink text-white" : "bg-white text-hotpink ring-1 ring-petal",
                ].join(" ")}>
                  <Icon className="h-4 w-4" strokeWidth={1.8} />
                </span>
                <span className={`text-[10px] font-semibold ${goal === key ? "text-hotpink" : "text-rose"}`}>{label}</span>
              </button>
            ))}
          </div>
          <p className="mt-2.5 text-[11px] text-rose/70">This tailors your Diet plan's portions & recipe picks ✿</p>
        </div>
        {goals.length === 0 ? (
          <EmptyCard text="Set your first intention" cta="Create a goal" href="/app/tools" Icon={Target} />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {goals.map((g) => (
              <div key={g.title} className="bloom-pearl-card pearl-sheen rounded-2xl sm:rounded-3xl p-4 sm:p-5">
                <div className="flex items-center gap-2 text-rose">
                  <span className="grid h-8 w-8 place-items-center rounded-full bg-blush text-hotpink">
                    <Target className="h-4 w-4" strokeWidth={1.6} />
                  </span>
                  <span className="text-sm font-semibold">{g.title}</span>
                </div>
                <div className="mt-3 h-2 rounded-full bg-blush overflow-hidden">
                  <div className="h-full rounded-full bg-gradient-to-r from-hotpink to-magenta transition-all duration-700" style={{ width: `${g.pct}%` }} />
                </div>
                <div className="mt-1.5 flex items-center justify-between text-[11px] text-rose/70">
                  <span>{g.pct}% there</span>
                  <span className="font-script text-base text-hotpink">keep blooming ✿</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* SETTINGS */}
      <section className="mt-5 sm:mt-8 mb-4 animate-card-pop-in" style={{ animationDelay: "360ms" }}>
        <SectionTitle>Settings</SectionTitle>
        <div className="space-y-3">
          {settingsGroups.map((group, gi) => (
            <div
              key={gi}
              className="bloom-pearl-card pearl-sheen rounded-2xl sm:rounded-3xl overflow-hidden"
            >
              {group.items.map((item, i) => (
                <button
                  key={item.label}
                  onClick={
                    item.label === "Log out"
                      ? () => signOut()
                      : item.label === "Replay welcome tour"
                      ? () => replayOnboarding()
                      : undefined
                  }
                  className={[
                    "flex w-full items-center gap-3 px-4 py-3.5 text-left transition hover:bg-blush/60",
                    i > 0 ? "border-t border-petal/40" : "",
                    group.danger ? "text-magenta" : "text-rose",
                  ].join(" ")}
                >
                  <span className={[
                    "grid h-9 w-9 place-items-center rounded-full",
                    group.danger ? "bg-magenta/10 text-magenta" : "bg-blush text-hotpink",
                  ].join(" ")}>
                    <item.Icon className="h-4 w-4" strokeWidth={1.6} />
                  </span>
                  <span className="flex-1 text-sm font-semibold">{item.label}</span>
                  {!group.danger && <ChevronRight className="h-4 w-4 text-rose/50" strokeWidth={1.6} />}
                </button>
              ))}
            </div>
          ))}
        </div>
        <p className="mt-6 text-center font-script text-lg text-rose/70">stay soft, bloom on ✿</p>
      </section>

      {editOpen && (
        <EditProfileModal
          initialName={profile?.name ?? ""}
          initialAge={profile?.age ?? null}
          initialWeight={profile?.weight ?? null}
          initialUnit={profile?.weight_unit ?? "kg"}
          onClose={() => setEditOpen(false)}
          onSave={updateProfile}
        />
      )}
    </div>
  );
}

function EditProfileModal({
  initialName, initialAge, initialWeight, initialUnit, onClose, onSave,
}: {
  initialName: string; initialAge: number | null; initialWeight: number | null; initialUnit: "kg" | "lbs";
  onClose: () => void;
  onSave: (patch: { name?: string | null; age?: number | null; weight?: number | null; weight_unit?: "kg" | "lbs" }) => Promise<{ error: string | null }>;
}) {
  const [name, setName] = useState(initialName);
  const [age, setAge] = useState(initialAge != null ? String(initialAge) : "");
  const [weight, setWeight] = useState(initialWeight != null ? String(initialWeight) : "");
  const [unit, setUnit] = useState<"kg" | "lbs">(initialUnit);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const save = async () => {
    setSaving(true); setErr(null);
    const { error } = await onSave({
      name: name.trim() || null,
      age: age ? Math.max(0, Math.min(120, parseInt(age, 10))) : null,
      weight: weight ? Math.max(0, parseFloat(weight)) : null,
      weight_unit: unit,
    });
    setSaving(false);
    if (error) setErr(error); else onClose();
  };

  return (
    <div className="fixed inset-0 z-[70] bg-black/40 backdrop-blur-sm grid place-items-center p-4 animate-fade-in" onClick={onClose}>
      <div className="w-full max-w-sm rounded-3xl bg-white/97 border border-petal/60 shadow-2xl p-5 sm:p-6 animate-scale-in" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-script text-3xl text-hotpink leading-none">Edit profile ✿</h2>
          <button onClick={onClose} aria-label="Close" className="grid h-8 w-8 place-items-center rounded-full bg-blush text-rose/70 active:scale-90"><ChevronRight className="h-4 w-4 rotate-90" /></button>
        </div>
        <label className="block mb-3">
          <span className="text-[11px] font-bold uppercase tracking-wider text-rose/60">Name</span>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name"
            className="mt-1 w-full rounded-2xl bg-white border border-petal/60 px-3 py-2.5 text-sm text-rose outline-none focus:ring-2 focus:ring-hotpink/30" />
        </label>
        <div className="grid grid-cols-2 gap-3 mb-3">
          <label className="block">
            <span className="text-[11px] font-bold uppercase tracking-wider text-rose/60">Age</span>
            <input value={age} onChange={(e) => setAge(e.target.value.replace(/\D/g, ""))} inputMode="numeric" placeholder="—"
              className="mt-1 w-full rounded-2xl bg-white border border-petal/60 px-3 py-2.5 text-sm text-rose outline-none focus:ring-2 focus:ring-hotpink/30" />
          </label>
          <label className="block">
            <span className="text-[11px] font-bold uppercase tracking-wider text-rose/60">Weight</span>
            <div className="mt-1 flex items-stretch rounded-2xl border border-petal/60 overflow-hidden bg-white">
              <input value={weight} onChange={(e) => setWeight(e.target.value.replace(/[^\d.]/g, ""))} inputMode="decimal" placeholder="—"
                className="flex-1 min-w-0 px-3 py-2.5 text-sm text-rose outline-none" />
              <button onClick={() => setUnit(unit === "kg" ? "lbs" : "kg")} className="px-2.5 text-xs font-bold text-hotpink bg-blush/60 border-l border-petal/60">{unit}</button>
            </div>
          </label>
        </div>
        {err && <p className="text-[11px] text-magenta mb-2">{err}</p>}
        <button onClick={save} disabled={saving} className="bloom-luxury-btn w-full inline-flex items-center justify-center gap-2 py-3 text-sm font-bold text-white disabled:opacity-60">
          {saving ? "Saving…" : <><Check className="h-4 w-4" strokeWidth={3} /> Save changes</>}
        </button>
        <p className="mt-2 text-center text-[10px] text-rose/50">Syncs to your Diet plan & profile ✿</p>
      </div>
    </div>
  );
}

/* ---------- Sub components ---------- */
function JourneyCard({
  Icon, eyebrow, title, desc, extra, index,
}: { Icon: typeof Heart; eyebrow: string; title: string; desc: string; extra?: React.ReactNode; index: number }) {
  return (
    <div
      style={{ animationDelay: `${index * 60}ms` }}
      className="bloom-pearl-card pearl-sheen rounded-2xl sm:rounded-3xl p-3.5 sm:p-5 animate-card-pop-in"
    >
      <span className="clay-blob grid h-9 w-9 sm:h-11 sm:w-11 place-items-center rounded-xl sm:rounded-2xl text-white shrink-0">
        <Icon className="h-4 w-4 sm:h-5 sm:w-5" strokeWidth={1.8} />
      </span>
      <p className="mt-2.5 sm:mt-3 text-[9px] sm:text-xs font-bold uppercase tracking-wider text-rose/60">{eyebrow}</p>
      <p className="mt-0.5 font-script text-lg sm:text-2xl text-hotpink leading-tight">{title}</p>
      <p className="mt-1 text-[10px] sm:text-xs text-rose/70 leading-snug">{desc}</p>
      {extra}
    </div>
  );
}

function WeekDots({ filled }: { filled: boolean[] }) {
  const labels = ["M", "T", "W", "T", "F", "S", "S"];
  return (
    <div className="mt-2 flex items-center gap-1">
      {labels.map((l, i) => (
        <span
          key={i}
          className={[
            "grid h-4 w-4 sm:h-5 sm:w-5 place-items-center rounded-full text-[7px] sm:text-[9px] font-bold",
            filled[i] ? "bg-hotpink text-white" : "bg-blush text-rose/40",
          ].join(" ")}
        >
          {filled[i] ? <Check className="h-2.5 w-2.5" strokeWidth={3} /> : l}
        </span>
      ))}
    </div>
  );
}

function WeeklyMetric({ Icon, label, value, total, unit }: { Icon: typeof Heart; label: string; value: number; total: number; unit: string }) {
  const pct = Math.round((value / total) * 100);
  return (
    <div>
      <div className="flex items-center gap-1.5 text-rose/80">
        <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-hotpink" strokeWidth={1.8} />
        <span className="text-[11px] sm:text-xs font-semibold">{label}</span>
      </div>
      <div className="mt-1.5 h-1.5 sm:h-2 w-full rounded-full bg-blush overflow-hidden">
        <div className="h-full rounded-full bg-gradient-to-r from-hotpink to-magenta" style={{ width: `${pct}%` }} />
      </div>
      <p className="mt-1 text-[10px] sm:text-[11px] text-rose/70">{value}/{total} {unit}</p>
    </div>
  );
}

function EmptyCard({ text, cta, href, Icon }: { text: string; cta: string; href: string; Icon: typeof Heart }) {
  return (
    <div className="bloom-pearl-card pearl-sheen rounded-2xl sm:rounded-3xl p-8 text-center">
      <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-blush text-hotpink">
        <Icon className="h-5 w-5" strokeWidth={1.6} />
      </span>
      <p className="mt-3 text-sm text-rose">{text}</p>
      <div className="mt-3 flex justify-center"><PrimaryBtn href={href}>{cta} <ArrowRight className="h-3 w-3" strokeWidth={2} /></PrimaryBtn></div>
    </div>
  );
}
