import { Droplet, Bell, BellOff, Settings2, Sparkles, Brain, Dumbbell, Heart, Lightbulb, Clock } from "lucide-react";
import { PHASE_LABEL, type CyclePhase } from "@/components/bloom/cyclePhase";

/* ============================================================================
   Daily Hydration — a phase-aware, motivational hydration dashboard for Today.
   Every message adapts to where she is in her cycle; every number is real
   (glasses she's actually logged), so it always agrees with the rest of Today.
============================================================================ */

const L_PER_GLASS = 0.25; // a glass ≈ 250 ml → the default 8-glass goal is a clean 2.0 L

type Phase = Exclude<CyclePhase, "any">;

// Phase-flavoured "why hydration matters today" + benefit emphasis.
const PHASE_HYDRATION: Record<Phase, { body: string; benefits: { skin: number; focus: number; muscle: number; energy: number } }> = {
  period:     { body: "Gentle hydration eases cramps and bloating and replaces the fluids you lose — sip warm water often and be kind to yourself.", benefits: { skin: 55, focus: 50, muscle: 45, energy: 50 } },
  follicular: { body: "Your energy is rising! Staying hydrated helps your muscles perform better and keeps your skin naturally glowing.",              benefits: { skin: 70, focus: 60, muscle: 40, energy: 65 } },
  fertile:    { body: "Water supports healthy cervical fluid and steady energy in your fertile window — keep your bottle close today.",                benefits: { skin: 68, focus: 62, muscle: 55, energy: 70 } },
  ovulation:  { body: "Your fluid needs peak around ovulation — a couple of extra glasses keep your energy and skin at their very best.",              benefits: { skin: 72, focus: 65, muscle: 60, energy: 75 } },
  luteal:     { body: "Water fights bloating and eases PMS fatigue — herbal teas count too. A steady sip-all-day rhythm feels best now.",              benefits: { skin: 60, focus: 55, muscle: 50, energy: 55 } },
};

const DID_YOU_KNOW = [
  "Even mild dehydration can reduce concentration and energy.",
  "Your skin is about 64% water — steady sipping keeps it plump and glowing.",
  "Water helps flush the bloat that comes with hormonal shifts.",
  "Staying hydrated can ease the headaches that show up before your period.",
  "A glass of water when you wake gently kick-starts your metabolism.",
];

function fmtAgo(ts: number | null): string {
  if (!ts) return "not yet today";
  const min = Math.max(0, Math.round((Date.now() - ts) / 60000));
  if (min < 1) return "just now";
  if (min < 60) return `${min} min ago`;
  const h = Math.round(min / 60);
  return `${h} hour${h === 1 ? "" : "s"} ago`;
}

// Small progress bar used by the benefit cards.
function BenefitBar({ Icon, label, pct }: { Icon: typeof Heart; label: string; pct: number }) {
  return (
    <div className="rounded-2xl bg-white/70 border border-petal/50 p-3">
      <Icon className="h-6 w-6 text-hotpink" strokeWidth={1.8} />
      <p className="mt-2 text-[12px] font-bold text-[#831843] leading-tight">{label}</p>
      <div className="mt-1.5 h-1.5 rounded-full bg-petal/30 overflow-hidden">
        <div className="h-full rounded-full bg-gradient-to-r from-hotpink to-[#DB2777] transition-all duration-700" style={{ width: `${pct}%` }} />
      </div>
      <p className="mt-1 text-[11px] font-black text-hotpink tabular-nums">{pct}%</p>
    </div>
  );
}

// A little pink progress ring (Bloom Level).
function MiniRing({ pct, children }: { pct: number; children: React.ReactNode }) {
  const C = 2 * Math.PI * 15.9;
  return (
    <div className="relative h-[68px] w-[68px] shrink-0">
      <svg viewBox="0 0 36 36" className="h-full w-full -rotate-90">
        <circle cx="18" cy="18" r="15.9" fill="none" stroke="#FBD3E6" strokeWidth="3.2" />
        <circle cx="18" cy="18" r="15.9" fill="none" stroke="url(#hyd-mini-grad)" strokeWidth="3.2" strokeLinecap="round"
          strokeDasharray={`${C}`} strokeDashoffset={C * (1 - Math.max(0, Math.min(100, pct)) / 100)}
          style={{ transition: "stroke-dashoffset 1s ease" }} />
        <defs><linearGradient id="hyd-mini-grad" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#F472B6" /><stop offset="1" stopColor="#DB2777" /></linearGradient></defs>
      </svg>
      <div className="absolute inset-0 grid place-items-center">{children}</div>
    </div>
  );
}

export function HydrationDashboard({
  phase, cycleReady, count, goal, onTapGlass, onDrinkGlass,
  remindersEnabled, reminderBusy, onToggleReminders, onOpenSettings,
  lastGlassAt, bloomPercent, highlight,
}: {
  phase: Phase;
  cycleReady: boolean;
  count: number;
  goal: number;
  onTapGlass: (idx: number) => void;
  onDrinkGlass: () => void;
  remindersEnabled: boolean;
  reminderBusy: boolean;
  onToggleReminders: () => void;
  onOpenSettings: () => void;
  lastGlassAt: number | null;
  bloomPercent: number;
  highlight?: boolean;
}) {
  const pct        = goal > 0 ? Math.min(100, Math.round((count / goal) * 100)) : 0;
  const doneL      = (count * L_PER_GLASS).toFixed(1);
  const totalL     = (goal * L_PER_GLASS).toFixed(1);
  const remaining  = Math.max(0, goal - count);
  const remainingL = (remaining * L_PER_GLASS).toFixed(1);
  const reached    = count >= goal;
  const C          = 2 * Math.PI * 15.9;

  const ph = PHASE_HYDRATION[phase];
  const benefits = ph.benefits;

  // Motivational headline scales with progress.
  const motivTitle =
    reached      ? "Goal reached — beautiful! 🎉" :
    pct >= 75    ? "Almost there! 🌟" :
    pct >= 45    ? "You're halfway there! 💖" :
    pct > 0      ? "Lovely start! 🌸" :
                   "Let's begin — one sip at a time 💧";
  const motivBody = reached
    ? "You've hit your water goal today. Your body — and your glow — thank you."
    : `Your body still needs about ${remainingL}L today. Keep going, you're doing amazing!`;

  // Coach nudge.
  const coachBody = reached
    ? "You're fully hydrated — carry that glow through the rest of your day! 💧"
    : "Drinking one glass now will help you stay energized for the rest of your day! 💧";

  // Rotating "did you know" — stable per calendar day (no random flicker).
  const dayIdx = Math.floor(Date.now() / 864e5);
  const fact = DID_YOU_KNOW[dayIdx % DID_YOU_KNOW.length];

  // Next-reminder estimate — spread remaining glasses over the rest of the day.
  const nowH = new Date().getHours();
  const endH = 21;
  const nextReminder = remaining > 0 ? Math.max(20, Math.round(((Math.max(1, endH - nowH)) * 60) / remaining)) : 0;

  return (
    <section id="hydration" className={["mt-4 sm:mt-6 animate-card-pop-in", highlight ? "animate-attention-squeeze" : ""].join(" ")} style={{ animationDelay: "180ms" }}>
      <div className="relative overflow-hidden rounded-[1.9rem] border border-petal/60 bg-gradient-to-br from-blush/50 via-white to-petal/30 shadow-[0_16px_40px_rgba(219,39,119,0.12)]">
        {/* Bloomzein bottle photo — a soft, faded BACKGROUND for the whole card
            (behind a pink-white scrim so every number & card stays readable). */}
        <img src="/images/hydration-bottle.webp" alt="" aria-hidden className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-[0.16]" loading="lazy" />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/88 via-white/82 to-petal/45" />

        <div className="relative p-4 sm:p-6">
          {/* ── Header ── */}
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 className="inline-flex items-center gap-2 font-script text-[1.9rem] sm:text-4xl text-hotpink leading-none">Daily Hydration <span className="text-2xl">🌸</span></h2>
              <p className="mt-1.5 text-[12px] sm:text-sm text-rose/70 leading-snug max-w-sm">
                Water is self-care. Every sip helps you feel your best, <span className="font-bold text-hotpink">inside</span> and <span className="font-bold text-hotpink">out</span>.
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <button onClick={onToggleReminders} disabled={reminderBusy} aria-label={remindersEnabled ? "Disable reminders" : "Enable reminders"} title={remindersEnabled ? "Reminders on — tap to turn off" : "Get gentle water reminders"}
                className={["grid h-9 w-9 place-items-center rounded-full bg-white/80 border border-petal/50 text-hotpink shadow-sm transition disabled:opacity-60 active:scale-90", remindersEnabled ? "animate-icon-breathe" : "opacity-80"].join(" ")}>
                {remindersEnabled ? <Bell className="h-4 w-4" strokeWidth={2} /> : <BellOff className="h-4 w-4" strokeWidth={2} />}
              </button>
              <button onClick={onOpenSettings} aria-label="Water goal settings" className="grid h-9 w-9 place-items-center rounded-full bg-white/80 border border-petal/50 text-hotpink shadow-sm transition active:scale-90">
                <Settings2 className="h-4 w-4" strokeWidth={2} />
              </button>
            </div>
          </div>

          {/* ── Body: ring & glasses (left) · info (right) ── */}
          <div className="mt-4 grid gap-4 lg:grid-cols-2 items-start">
            {/* LEFT — big ring + glasses */}
            <div>
              <div className="mx-auto relative h-[220px] w-[220px] sm:h-[248px] sm:w-[248px]">
                {/* Clean soft-white disc inside the ring so the % stays crisp over
                    the card's photo background — the ring itself stays bold. */}
                <div className="absolute inset-[9%] rounded-full bg-white/70 backdrop-blur-[2px] shadow-inner ring-1 ring-inset ring-white/70" />
                <svg viewBox="0 0 36 36" className="relative h-full w-full -rotate-90">
                  <circle cx="18" cy="18" r="15.9" fill="none" stroke="#FBD3E6" strokeWidth="3" />
                  <circle cx="18" cy="18" r="15.9" fill="none" stroke="url(#hyd-ring-grad)" strokeWidth="3" strokeLinecap="round"
                    strokeDasharray={`${C}`} strokeDashoffset={C * (1 - pct / 100)}
                    style={{ transition: "stroke-dashoffset 1.2s cubic-bezier(0.22,1,0.36,1)", filter: "drop-shadow(0 2px 6px rgba(219,39,119,0.4))" }} />
                  <defs><linearGradient id="hyd-ring-grad" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#F472B6" /><stop offset="1" stopColor="#DB2777" /></linearGradient></defs>
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                  <Droplet className="h-8 w-8 text-hotpink/80 mb-0.5" strokeWidth={1.5} fill="rgba(244,114,182,0.25)" />
                  <p className="font-script text-5xl sm:text-6xl text-hotpink leading-none">{pct}%</p>
                  <p className="mt-1 text-[13px] font-bold text-[#831843]">{count} of {goal} glasses</p>
                  <p className="text-[12px] font-bold text-rose/70"><span className="text-hotpink">{doneL} L</span> / {totalL} L</p>
                </div>
              </div>

              {/* Glasses row */}
              <div className="mt-4">
                <p className="inline-flex items-center gap-1.5 text-[13px] font-black text-[#831843]"><Droplet className="h-4 w-4 text-hotpink" fill="currentColor" strokeWidth={1.5} /> Today's glasses</p>
                <div className="mt-2 flex flex-wrap items-end gap-1.5">
                  {Array.from({ length: goal }).map((_, i) => (
                    <button key={i} onClick={() => onTapGlass(i)} aria-label={i < count ? `Glass ${i + 1} filled` : `Fill glass ${i + 1}`} className="flex flex-col items-center gap-0.5 active:scale-90 transition-transform">
                      <Droplet className={["h-7 w-7 transition", i < count ? "text-hotpink" : "text-petal/60"].join(" ")} fill="currentColor" strokeWidth={1.4} />
                      <span className={["text-[9px] font-bold tabular-nums", i < count ? "text-hotpink" : "text-rose/40"].join(" ")}>{i + 1}</span>
                    </button>
                  ))}
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-2xl bg-white/70 border border-petal/50 px-3 py-2 text-[11px] font-semibold text-rose/70">
                  <span className="inline-flex items-center gap-1.5"><Clock className="h-3.5 w-3.5 text-hotpink" strokeWidth={2} /> Last glass: <span className="text-[#831843]">{fmtAgo(lastGlassAt)}</span></span>
                  <span className="text-petal">·</span>
                  <span>{remindersEnabled ? <>Next reminder in <span className="text-hotpink">{nextReminder} min</span></> : "Reminders off"}</span>
                </div>
              </div>
            </div>

            {/* RIGHT — motivation · phase · benefits · coach */}
            <div className="space-y-3">
              {/* Motivational */}
              <div className="flex items-center gap-3 rounded-2xl bg-white/75 border border-petal/50 p-3">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-blush text-hotpink"><Droplet className="h-5 w-5" fill="currentColor" strokeWidth={1.4} /></span>
                <div className="min-w-0">
                  <p className="text-[14px] font-black text-hotpink leading-tight">{motivTitle}</p>
                  <p className="mt-0.5 text-[12px] text-[#831843] leading-snug">{motivBody}</p>
                </div>
              </div>

              {/* Why hydration matters — phase aware */}
              <div>
                <p className="inline-flex items-center gap-1.5 text-[13px] font-black text-[#831843] mb-1.5"><Sparkles className="h-4 w-4 text-hotpink" strokeWidth={2} /> Why hydration matters today</p>
                <div className="relative overflow-hidden rounded-2xl bg-white/75 border border-petal/50 p-3">
                  <img src="/images/me/energy-botanical.webp" alt="" className="pointer-events-none absolute -right-4 -bottom-4 h-24 w-24 object-contain opacity-40" loading="lazy" />
                  <div className="relative">
                    <p className="text-[13px] font-black text-hotpink">{cycleReady ? `You're in your ${PHASE_LABEL[phase]} Phase` : "Set up your cycle to personalise this"}</p>
                    <p className="mt-1 text-[12px] text-[#831843] leading-snug max-w-sm">{cycleReady ? ph.body : "Once your cycle is set, we'll tailor every hydration tip to your exact phase."}</p>
                  </div>
                </div>
              </div>

              {/* Benefits */}
              <div>
                <p className="inline-flex items-center gap-1.5 text-[13px] font-black text-[#831843] mb-1.5"><Sparkles className="h-4 w-4 text-hotpink" strokeWidth={2} /> Today's hydration benefits</p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <BenefitBar Icon={Sparkles} label="Skin glow"       pct={benefits.skin} />
                  <BenefitBar Icon={Brain}    label="Better focus"    pct={benefits.focus} />
                  <BenefitBar Icon={Dumbbell} label="Muscle recovery" pct={benefits.muscle} />
                  <BenefitBar Icon={Heart}    label="More energy"     pct={benefits.energy} />
                </div>
              </div>

              {/* Coach + Drink a glass */}
              <div className="flex items-center gap-3 rounded-2xl bg-white/75 border border-petal/50 p-3">
                <div className="min-w-0 flex-1">
                  <p className="text-[12px] font-black text-hotpink inline-flex items-center gap-1.5"><span className="text-sm">🧚‍♀️</span> Bloomzein Coach</p>
                  <p className="mt-0.5 text-[12px] text-[#831843] leading-snug">{coachBody}</p>
                </div>
                <button onClick={onDrinkGlass} disabled={reached}
                  className="shrink-0 inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-hotpink to-magenta px-4 py-2.5 text-[12.5px] font-bold text-white shadow-md shadow-hotpink/25 transition hover:brightness-105 active:scale-95 disabled:opacity-60 animate-selected-glow">
                  {reached ? "All done ✿" : "Drink a Glass"} <Droplet className="h-4 w-4" fill="currentColor" strokeWidth={1.4} />
                </button>
              </div>
            </div>
          </div>

          {/* ── Footer: did-you-know · bloom level ── */}
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="flex items-start gap-3 rounded-2xl bg-white/70 border border-petal/50 p-3">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-blush text-hotpink"><Lightbulb className="h-4 w-4" strokeWidth={2} /></span>
              <div className="min-w-0">
                <p className="text-[12px] font-black text-hotpink">Did you know?</p>
                <p className="mt-0.5 text-[12px] text-[#831843] leading-snug">{fact}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-2xl bg-white/70 border border-petal/50 p-3">
              <div className="min-w-0 flex-1">
                <p className="text-[12px] font-black text-hotpink">Bloom Level</p>
                <p className="mt-0.5 text-[12px] text-[#831843] leading-snug">Keep blooming every day with healthy habits.</p>
              </div>
              <MiniRing pct={bloomPercent}>
                <span className="font-script text-lg text-hotpink leading-none">{bloomPercent}%</span>
              </MiniRing>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
