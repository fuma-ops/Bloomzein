import { useEffect, useState } from "react";
import {
  Sparkles, Wallet,
  ChevronRight,
  User, Crown, Bell, Shield, LifeBuoy, LogOut, RotateCcw,
  Check, Inbox,
} from "lucide-react";

/** Only this account sees the private admin inbox link. */
const ADMIN_EMAIL = "bloomzeinapp@gmail.com";
import { BloomBubbles } from "@/components/bloom/BloomBubbles";
import { DiscoverBloomPlus, PlanToggle } from "@/components/bloom/premium/PremiumKit";
import { CyclePhasePill } from "@/components/bloom/CyclePhasePill";
import { useAuth } from "@/contexts/AuthContext";
import { RECIPES } from "@/components/bloom/recipes/data";
import { ConsistencyDashboard } from "@/components/bloom/me/ConsistencyDashboard";
import { stampTodayWater } from "@/lib/dailyLog";
import { seedEmma, clearEmma } from "@/lib/seedEmma";
import { resetEverything } from "@/lib/crossToolData";

// ── Real data helpers ─────────────────────────────────────────────────────────
function readJSON<T>(key: string, fb: T): T {
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fb; } catch { return fb; }
}

interface MeStats { level: number; pct: number }

/** Level & progress grow with total real activity — honest, not decorative. */
function computeMeStats(): MeStats {
  const moodLog = readJSON<Record<string, string>>("bloom:mood-log-v2", {});
  const workoutHist = readJSON<unknown[]>("bloom:workout-history", []);
  const diary = readJSON<unknown[]>("bloom:diary", []);
  const yoga = readJSON<{ count: number }>("bloom:yoga-streak", { count: 0 });

  const total =
    Object.keys(moodLog).length +
    (Array.isArray(workoutHist) ? workoutHist.length : 0) +
    (Array.isArray(diary) ? diary.length : 0) +
    (yoga?.count || 0);

  return { level: Math.floor(total / 12) + 1, pct: Math.round(((total % 12) / 12) * 100) };
}

function SectionTitle({ children, hint }: { children: React.ReactNode; hint?: string }) {
  return (
    <div className="mb-3 flex items-end justify-between gap-3">
      <h2 className="font-script text-3xl sm:text-4xl text-hotpink">{children}</h2>
      {hint && <span className="text-xs text-rose/70 shrink-0">{hint}</span>}
    </div>
  );
}

/* ---------- Favorites — real saved recipes, else curated reads ---------- */
type FavItem = { title: string; tag: string; img: string; href: string };
const CURATED_READS: FavItem[] = [
  { title: "Cycle syncing 101", tag: "Wellness", img: "/images/read-cycle.webp", href: "/app/read" },
  { title: "Soft girl morning ritual", tag: "Lifestyle", img: "/images/read-selfcare.webp", href: "/app/read" },
  { title: "Pink budgeting that works", tag: "Money", img: "/images/read-money.webp", href: "/budget" },
];
function readFavorites(): { items: FavItem[]; isReal: boolean } {
  const favIds = readJSON<string[]>("bloom:meals-favorites", []);
  const ratings = readJSON<Record<string, string>>("bloom:meals-ratings", {});
  const lovedIds = Object.entries(ratings).filter(([, v]) => v === "love").map(([k]) => k);
  const ids = [...new Set([...(Array.isArray(favIds) ? favIds : []), ...lovedIds])];
  const recs = ids.map((id) => RECIPES.find((r) => r.id === id)).filter(Boolean) as (typeof RECIPES)[number][];
  if (!recs.length) return { items: CURATED_READS, isReal: false };
  return {
    isReal: true,
    items: recs.slice(0, 8).map((r) => ({
      title: r.name,
      tag: r.mealType,
      img: r.photo ? `/images/recipes/${r.photo}` : "/images/meal-buddha.webp",
      href: "/app/tools/meals",
    })),
  };
}

type SettingAction = "edit" | "logout" | "replay" | "reset";
type SettingItem = { Icon: typeof User; label: string; href?: string; action?: SettingAction; soon?: boolean };
const settingsGroups: { items: SettingItem[]; danger?: boolean }[] = [
  {
    items: [
      { Icon: User, label: "Account & profile", action: "edit" },
      { Icon: Bell, label: "Notifications & reminders", href: "/app/tools/notes" },
      { Icon: Wallet, label: "Budget & money", href: "/budget" },
      { Icon: Crown, label: "Bloom Premium", soon: true },
      { Icon: Shield, label: "Privacy & data", href: "/privacy" },
      { Icon: LifeBuoy, label: "Help & support", href: "/help" },
      { Icon: RotateCcw, label: "Replay welcome tour", action: "replay" },
    ],
  },
  {
    items: [
      { Icon: RotateCcw, label: "Start fresh — reset my whole world", action: "reset" },
      { Icon: LogOut, label: "Log out", action: "logout" },
    ],
    danger: true,
  },
];

export default function MePage() {
  const { profile, user, signOut, updateProfile } = useAuth();
  const displayName = profile?.name || user?.email?.split("@")[0] || "Bloom girl";

  // Add the private "Messages" inbox link only for the admin account.
  const isAdmin = user?.email === ADMIN_EMAIL;
  const groups: { items: SettingItem[]; danger?: boolean }[] = isAdmin
    ? [
        { items: [{ Icon: Inbox, label: "Messages", href: "/admin" }, ...settingsGroups[0].items] },
        ...settingsGroups.slice(1),
      ]
    : settingsGroups;

  // Lets you re-trigger the new-user onboarding popup at any time, for testing.
  async function replayOnboarding() {
    try {
      localStorage.removeItem("bloomzein_onboarding");
      localStorage.removeItem("bloomzein_visited_tools");
    } catch {}
    await updateProfile({ setup_done: false });
    window.location.href = "/app/today";
  }

  // Wipes every on-device Bloom key so Today (and every tool) shows the true
  // brand-new-user experience — nothing pre-filled, ready to set up from scratch.
  function resetWorld() {
    const ok = window.confirm(
      "Start fresh? This clears your cycle, meals, movement, mood, water, budget and every tool's data on this device so you can set up your Bloom world from scratch. This can't be undone."
    );
    if (!ok) return;
    resetEverything();
    window.location.href = "/app/today";
  }

  const [stats, setStats] = useState<MeStats | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [favs, setFavs] = useState<{ items: FavItem[]; isReal: boolean }>({ items: CURATED_READS, isReal: false });
  useEffect(() => {
    stampTodayWater(); // keep the hydration history current for the dashboard
    setStats(computeMeStats());
    setFavs(readFavorites());
  }, []);

  const memberSince = (() => {
    const iso = profile?.created_at;
    if (!iso) return null;
    try { return new Date(iso).toLocaleDateString("en-US", { month: "long", year: "numeric" }); } catch { return null; }
  })();

  // Marketing demo controls — only when the URL carries ?demo (invisible to
  // normal users). Load the "Emma" hero account to film the tour, or clear it.
  const demoMode = typeof window !== "undefined" && new URLSearchParams(window.location.search).has("demo");

  return (
    <div className="relative animate-fade-in">
      <BloomBubbles count={10} />

      {demoMode && (
        <div className="mb-4 flex flex-wrap items-center gap-2 rounded-2xl border border-petal/60 bg-white/90 p-3 shadow-sm">
          <span className="text-xs font-bold uppercase tracking-wider text-hotpink">Demo</span>
          <button
            onClick={() => { seedEmma(); window.location.href = "/app/today"; }}
            className="rounded-full bg-gradient-to-r from-hotpink to-magenta px-3 py-1.5 text-xs font-bold text-white active:scale-95"
          >🌸 Seed Emma</button>
          <button
            onClick={() => { clearEmma(); window.location.reload(); }}
            className="rounded-full border border-petal/60 bg-blush px-3 py-1.5 text-xs font-bold text-hotpink active:scale-95"
          >Clear demo</button>
          <span className="text-[10px] text-rose/60">Tip: set your profile name to “Emma” for the film.</span>
        </div>
      )}

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
                src="/images/me-avatar.webp"
                alt="Your avatar"
                className="relative h-16 w-16 sm:h-28 sm:w-28 rounded-full border-2 sm:border-4 border-white object-cover shadow-xl shadow-hotpink/30"
                referrerPolicy="no-referrer"
              />
            </div>

            <div className="flex-1 min-w-0">
              <h1 className="font-script text-2xl sm:text-5xl text-hotpink leading-none flex items-center gap-1.5">
                Hey, {displayName}! <Sparkles className="h-4 w-4 sm:h-7 sm:w-7" strokeWidth={1.8} />
              </h1>
              <span className="mt-1.5 sm:mt-2 inline-flex items-center gap-1 rounded-full bg-white/80 px-2 py-0.5 text-[9px] sm:text-[11px] font-bold uppercase tracking-wider text-hotpink border border-petal/60">
                <Sparkles className="h-2.5 w-2.5 sm:h-3 sm:w-3" strokeWidth={2} /> Soft Soul
              </span>
              <div className="mt-1.5"><CyclePhasePill /></div>
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
            </div>
          </div>
        </div>
      </section>

      {/* CONSISTENCY DASHBOARD */}
      <ConsistencyDashboard />

      {/* BLOOM+ — discover premium, and a dev switch to feel both experiences */}
      <section className="mt-5 sm:mt-8 animate-card-pop-in" style={{ animationDelay: "40ms" }}>
        <SectionTitle hint="your plan">Bloom+</SectionTitle>
        <div className="space-y-3">
          <DiscoverBloomPlus />
          <PlanToggle />
        </div>
      </section>

      {/* FAVORITES */}
      <section className="mt-5 sm:mt-8 animate-card-pop-in" style={{ animationDelay: "60ms" }}>
        <SectionTitle hint={favs.isReal ? "your saved recipes" : "picked for you"}>Favorites & saved</SectionTitle>
        <div className="flex gap-3 sm:gap-4 overflow-x-auto no-scrollbar snap-x snap-mandatory pb-1">
          {favs.items.map((f, i) => (
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

      {/* SETTINGS */}
      <section className="mt-5 sm:mt-8 mb-4 animate-card-pop-in" style={{ animationDelay: "180ms" }}>
        <SectionTitle>Settings</SectionTitle>
        <div className="space-y-3">
          {groups.map((group, gi) => (
            <div
              key={gi}
              className="bloom-pearl-card pearl-sheen rounded-2xl sm:rounded-3xl overflow-hidden"
            >
              {group.items.map((item, i) => {
                const cls = [
                  "flex w-full items-center gap-3 px-4 py-3.5 text-left transition hover:bg-blush/60",
                  i > 0 ? "border-t border-petal/40" : "",
                  group.danger ? "text-magenta" : "text-rose",
                  item.soon ? "opacity-70" : "",
                ].join(" ");
                const inner = (
                  <>
                    <span className={["grid h-9 w-9 place-items-center rounded-full", group.danger ? "bg-magenta/10 text-magenta" : "bg-blush text-hotpink"].join(" ")}>
                      <item.Icon className="h-4 w-4" strokeWidth={1.6} />
                    </span>
                    <span className="flex-1 text-sm font-semibold">{item.label}</span>
                    {item.soon
                      ? <span className="rounded-full bg-blush text-hotpink text-[9px] font-bold uppercase tracking-wide px-2 py-0.5">Soon</span>
                      : !group.danger && <ChevronRight className="h-4 w-4 text-rose/50" strokeWidth={1.6} />}
                  </>
                );
                if (item.href) return <a key={item.label} href={item.href} className={cls}>{inner}</a>;
                const onClick = item.action === "logout" ? () => signOut()
                  : item.action === "replay" ? () => replayOnboarding()
                  : item.action === "reset" ? () => resetWorld()
                  : item.action === "edit" ? () => setEditOpen(true)
                  : undefined;
                return <button key={item.label} onClick={onClick} disabled={item.soon} className={cls}>{inner}</button>;
              })}
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
