import { useEffect, useMemo, useState } from "react";
import {
  Sparkles, Wallet,
  ChevronRight, Camera, Trash2,
  User, Crown, Bell, Shield, LifeBuoy, LogOut, RotateCcw,
  Check, Inbox, Eye,
} from "lucide-react";

/** Only this account sees the private admin inbox link. */
const ADMIN_EMAIL = "bloomzeinapp@gmail.com";
import { BloomBubbles } from "@/components/bloom/BloomBubbles";
import { BloomFlower } from "@/components/bloom/BloomFlower";
import { DiscoverBloomPlus, ManageSubscription, PlanToggle, PlusLock } from "@/components/bloom/premium/PremiumKit";
import { HealthHistoryPanel } from "@/components/bloom/me/HealthHistory";
import { CyclePhasePill } from "@/components/bloom/CyclePhasePill";
import { hasCycleSettings } from "@/components/bloom/cyclePhase";
import { computeHealthHistory, type HealthHistory } from "@/lib/healthHistory";
import { useAuth } from "@/contexts/AuthContext";
import { RECIPES } from "@/components/bloom/recipes/data";
import { stampTodayWater } from "@/lib/dailyLog";
import { seedEmma, clearEmma } from "@/lib/seedEmma";
import { resetEverything } from "@/lib/crossToolData";
import { isOwnerEmail } from "@/lib/entitlements";
import { readAvatar, setAvatar, fileToAvatarDataUrl, AVATAR_EVENT } from "@/lib/profileAvatar";

// Time-of-day hero photo — the same blended scene as the Today page, so Me
// opens on the same immersive surface.
function heroBgForNow(): string {
  return new Date().getHours() < 17
    ? "/images/page-bg-today-morning.webp"
    : "/images/page-bg-today-evening.webp";
}

/**
 * One honest "Overall wellness" score (0–100) from everything she's really
 * logged — mood, sleep, how much she moves each week, and cycle regularity.
 * Averaged so no single dimension dominates; mapped to a friendly tier.
 */
function wellnessScore(h: HealthHistory): { score: number; label: string; cls: string } {
  const parts: number[] = [];
  if (h.mood.avgScore != null) parts.push((h.mood.avgScore / 5) * 100);
  if (h.sleep.avgQuality != null) parts.push((h.sleep.avgQuality / 5) * 100);
  const wk = h.movement.weekly;
  const wkAvg = wk.length ? wk.reduce((s, w) => s + w.sessions, 0) / wk.length : 0;
  parts.push(Math.min(100, (wkAvg / 4) * 100)); // ~4 sessions/week reads as full
  parts.push(h.cycle.regularity === "regular" ? 100 : h.cycle.regularity === "learning" ? 72 : 60);
  const score = parts.length ? Math.round(parts.reduce((a, b) => a + b, 0) / parts.length) : 0;
  // All tiers stay on-brand pink — a bold hotpink chip at the top, soft blush
  // below; no off-palette colours.
  const t =
    score >= 85
      ? { label: "Excellent", cls: "bg-hotpink text-white shadow-sm shadow-hotpink/30" }
      : score >= 70
        ? { label: "Great", cls: "bg-blush text-hotpink border border-hotpink/25" }
        : score >= 55
          ? { label: "Good", cls: "bg-blush text-hotpink border border-petal/60" }
          : score >= 40
            ? { label: "Fair", cls: "bg-blush text-hotpink border border-petal/60" }
            : { label: "Building", cls: "bg-blush text-hotpink border border-petal/60" };
  return { score, ...t };
}

// ── Real data helpers ─────────────────────────────────────────────────────────
function readJSON<T>(key: string, fb: T): T {
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fb; } catch { return fb; }
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

type SettingAction = "edit" | "logout" | "replay" | "reset" | "preview-first-time";
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
  // Owner-only (khfuma@gmail.com): a one-tap way to see exactly what a brand-new
  // user meets — the welcome cinematic + re-triggered onboarding.
  const isOwner = isOwnerEmail(user?.email);
  const ownerItems: SettingItem[] = [
    ...(isAdmin ? [{ Icon: Inbox, label: "Messages", href: "/admin" } as SettingItem] : []),
    ...(isOwner ? [{ Icon: Eye, label: "Preview first-time (new user)", action: "preview-first-time" } as SettingItem] : []),
  ];
  const groups: { items: SettingItem[]; danger?: boolean }[] = ownerItems.length
    ? [
        { items: [...ownerItems, ...settingsGroups[0].items] },
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

  // Owner preview: replay the brand-new-user first impression — the welcome
  // cinematic + every tool's onboarding/tour + the "day 1" counter — WITHOUT
  // deleting real logs. (Use "Start fresh" below for a truly empty world.)
  async function previewFirstTime() {
    const flags = [
      "bloomzein_onboarding", "bloomzein_visited_tools",
      "bloom:first-seen", "bloom:setup-guide",
      "bloom:cycle-onboarded", "bloom:diet-onboarded", "bloom:diet-setup-complete",
      "bloom:meals-onboarded", "bloom:notes-welcomed",
      "bloom:workout-onboarded", "bloom:workout-tour-done",
      "bloom:yoga-onboarded", "bloom:yoga-tour-done",
    ];
    try { flags.forEach((k) => localStorage.removeItem(k)); } catch {}
    await updateProfile({ setup_done: false }); // AuthGate replays the welcome cinematic
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

  const [editOpen, setEditOpen] = useState(false);
  const [favs, setFavs] = useState<{ items: FavItem[]; isReal: boolean }>({ items: CURATED_READS, isReal: false });
  const [avatar, setAvatarState] = useState<string | null>(null);
  useEffect(() => {
    stampTodayWater(); // keep the hydration history current for the dashboard
    setFavs(readFavorites());
    setAvatarState(readAvatar());
    const r = () => setAvatarState(readAvatar());
    window.addEventListener(AVATAR_EVENT, r);
    window.addEventListener("storage", r);
    return () => {
      window.removeEventListener(AVATAR_EVENT, r);
      window.removeEventListener("storage", r);
    };
  }, []);

  // Add / change the on-device profile photo from a picked file.
  const onPickAvatar = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-picking the same file
    if (!file) return;
    try {
      setAvatar(await fileToAvatarDataUrl(file));
    } catch {
      /* ignore an unreadable image */
    }
  };

  // Real hero read-outs — same blended Today background; an honest phase pill and
  // an "Overall wellness" score composed from everything she's logged.
  const heroBg = useMemo(heroBgForNow, []);
  const cycleReady = useMemo(hasCycleSettings, []);
  const hist = useMemo(() => computeHealthHistory(8), []);
  const wellness = useMemo(() => wellnessScore(hist), [hist]);

  const memberSince = (() => {
    const iso = profile?.created_at;
    if (!iso) return null;
    try {
      return new Date(iso).toLocaleDateString("en-US", { month: "long", year: "numeric" });
    } catch {
      return null;
    }
  })();

  // The hero read-outs — rendered once, placed beside the flower on desktop and
  // stacked full-width under the flower+greeting row on phone.
  const heroDetail = (
    <>
      {cycleReady && <CyclePhasePill />}
      {memberSince && (
        <p className="mt-1.5 inline-block rounded-full bg-white/75 px-2 py-0.5 text-[10px] sm:text-xs text-rose/80">
          Blooming since {memberSince} ✿
        </p>
      )}
      {/* Overall wellness — compact: label · score · tier on one row, a slim
          pink bar under. Frosted-glass so the photo glows through. */}
      <div className="mt-2 sm:mt-3 max-w-xs rounded-2xl bg-white/45 backdrop-blur-md border border-white/60 px-3 py-1.5 shadow-sm shadow-hotpink/10">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-rose/60">Overall wellness</span>
          <div className="flex items-center gap-1.5">
            <span className="text-[13px] sm:text-base font-black text-magenta tabular-nums leading-none">
              {wellness.score}<span className="text-[8px] font-bold text-rose/45">/100</span>
            </span>
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-black ${wellness.cls}`}>{wellness.label}</span>
          </div>
        </div>
        <div className="mt-1 h-1.5 w-full rounded-full bg-white/60 overflow-hidden">
          <div className="h-full rounded-full bg-gradient-to-r from-hotpink to-magenta transition-all duration-700" style={{ width: `${wellness.score}%` }} />
        </div>
      </div>
    </>
  );

  // Marketing demo controls — only when the URL carries ?demo (invisible to
  // normal users). Load the "Emma" hero account to film the tour, or clear it.
  const demoMode = typeof window !== "undefined" && new URLSearchParams(window.location.search).has("demo");

  return (
    <div className="relative isolate animate-fade-in">
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

      {/* HERO — same full-bleed blended background as the Today page: a base pink
          wash + a time-of-day photo that alpha-dissolves into the page, with a
          soft left wash keeping the greeting crisp. The avatar photo is replaced
          by the brand's logo flower in strong pink. */}
      <div aria-hidden className="pointer-events-none absolute left-1/2 -translate-x-1/2 w-screen -top-8 -z-20 h-[620px] bg-gradient-to-b from-[#FFD3E8] via-[#FFE4F1] to-transparent" />
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 -translate-x-1/2 w-screen -top-8 -z-10 h-[460px] sm:h-[540px] overflow-hidden"
        style={{
          WebkitMaskImage: "linear-gradient(to bottom, #000 0%, #000 45%, transparent 100%)",
          maskImage: "linear-gradient(to bottom, #000 0%, #000 45%, transparent 100%)",
        }}
      >
        <img src={heroBg} alt="" className="animate-hero-breathe h-full w-full object-cover object-[88%_26%] sm:object-[84%_26%] lg:object-[78%_22%]" referrerPolicy="no-referrer" />
        {/* Light left wash only — just enough to soften the corner behind the
            greeting; every read-out below carries its own frosted backing, so the
            photo stays clearly visible instead of being washed flat. */}
        <div className="absolute inset-0 bg-[radial-gradient(115%_110%_at_0%_30%,rgba(255,237,246,0.8)_0%,rgba(255,231,244,0.32)_34%,transparent_56%)] sm:bg-[radial-gradient(120%_115%_at_0%_42%,rgba(255,228,241,0.9)_0%,rgba(255,228,241,0.45)_28%,transparent_52%)]" />
        <div className="absolute inset-y-0 right-0 w-24 bg-gradient-to-l from-[#FFE4F1]/70 to-transparent" />
      </div>

      <BloomBubbles count={10} />

      <section className="relative z-[1] animate-card-pop-in" style={{ animationDelay: "0ms" }}>
        <div className="flex items-center gap-3 sm:items-start sm:gap-6">
          {/* Medallion — her own photo if she's added one (kept on this device),
              otherwise the brand flower. Tap to add / change it. */}
          <label
            className="group relative shrink-0 cursor-pointer"
            title="Add a profile photo — saved on this device only"
          >
            <div className="absolute -inset-1 rounded-full bg-white/70 blur-md" />
            <div className="relative grid h-16 w-16 sm:h-28 sm:w-28 place-items-center overflow-hidden rounded-full border-2 sm:border-4 border-white bg-gradient-to-br from-hotpink to-magenta shadow-xl shadow-hotpink/30 animate-icon-breathe">
              {avatar ? (
                <img src={avatar} alt="Your profile" className="h-full w-full object-cover" />
              ) : (
                <>
                  <BloomFlower size={40} petal="#FFFFFF" center="#FFD9EC" className="sm:hidden" />
                  <BloomFlower size={68} petal="#FFFFFF" center="#FFD9EC" className="hidden sm:block" />
                </>
              )}
            </div>
            {/* camera badge — hints the medallion is tappable */}
            <span className="absolute -bottom-0.5 -right-0.5 grid h-6 w-6 sm:h-8 sm:w-8 place-items-center rounded-full border border-petal/60 bg-white text-hotpink shadow-md transition group-hover:scale-110 group-active:scale-95">
              <Camera className="h-3 w-3 sm:h-4 sm:w-4" strokeWidth={2} />
            </span>
            <input type="file" accept="image/*" className="sr-only" onChange={onPickAvatar} />
          </label>

          <div className="flex-1 min-w-0">
            <h1
              className="font-script text-[2.1rem] sm:text-6xl text-hotpink leading-none flex items-center gap-1.5"
              style={{ textShadow: "0 1px 2px rgba(255,255,255,0.98), 0 2px 10px rgba(255,255,255,0.9), 0 0 22px rgba(255,255,255,0.75)" }}
            >
              Hey, {displayName}! <Sparkles className="h-5 w-5 sm:h-8 sm:w-8" strokeWidth={1.8} />
            </h1>
            {/* Desktop: read-outs sit beside the flower */}
            <div className="mt-2 hidden sm:block">{heroDetail}</div>
          </div>
        </div>

        {/* Phone: read-outs stacked full-width UNDER the flower + greeting row,
            so the space beside the flower is filled and nothing is stranded. */}
        <div className="mt-3 sm:hidden">{heroDetail}</div>
      </section>

      {/* YOUR HISTORY — Bloom+ (every real logged event + doctor-shareable report) */}
      <div className="mt-5 sm:mt-8">
        <PlusLock feature="me" title="Your history & report" blurb="Every real thing you've logged — cycle regularity, calories burned, symptoms, mood & weight — from day one, downloadable as a report for your doctor." minH="min-h-[300px]">
          <HealthHistoryPanel userName={displayName} />
        </PlusLock>
      </div>

      {/* BLOOM+ — premium status (+ a dev-only plan switch, hidden in production) */}
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
          <ManageSubscription />
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
                  : item.action === "preview-first-time" ? () => previewFirstTime()
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
  const [avatar, setAv] = useState<string | null>(() => readAvatar());
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const pickPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      const url = await fileToAvatarDataUrl(file);
      setAvatar(url);
      setAv(url);
    } catch {
      /* ignore */
    }
  };
  const removePhoto = () => {
    setAvatar(null);
    setAv(null);
  };

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

        {/* Profile photo — stored on this device only */}
        <div className="mb-4 flex items-center gap-3">
          <label className="group relative shrink-0 cursor-pointer" title="Change photo">
            <div className="grid h-16 w-16 place-items-center overflow-hidden rounded-full border-2 border-white bg-gradient-to-br from-hotpink to-magenta shadow-md shadow-hotpink/25">
              {avatar ? <img src={avatar} alt="Your profile" className="h-full w-full object-cover" /> : <BloomFlower size={34} petal="#FFFFFF" center="#FFD9EC" />}
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 grid h-6 w-6 place-items-center rounded-full border border-petal/60 bg-white text-hotpink shadow group-hover:scale-110 transition">
              <Camera className="h-3 w-3" strokeWidth={2} />
            </span>
            <input type="file" accept="image/*" className="sr-only" onChange={pickPhoto} />
          </label>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <label className="inline-flex cursor-pointer items-center gap-1 rounded-full bg-blush px-3 py-1.5 text-[11px] font-bold text-hotpink active:scale-95">
                <Camera className="h-3.5 w-3.5" strokeWidth={2} /> {avatar ? "Change" : "Add photo"}
                <input type="file" accept="image/*" className="sr-only" onChange={pickPhoto} />
              </label>
              {avatar && (
                <button onClick={removePhoto} className="inline-flex items-center gap-1 rounded-full border border-petal/60 px-3 py-1.5 text-[11px] font-bold text-rose/70 active:scale-95">
                  <Trash2 className="h-3.5 w-3.5" strokeWidth={2} /> Remove
                </button>
              )}
            </div>
            <p className="mt-1 text-[10px] text-rose/55 leading-tight">Saved on this device only — never uploaded ✿</p>
          </div>
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
