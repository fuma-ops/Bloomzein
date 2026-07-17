import { Lock, Sparkles, ArrowRight, Heart } from "lucide-react";

/* ============================================================================
   Personalized Bloom preview — shown on Today until her world is fully set up.
   Instead of half-empty real sections, she sees a blurred, locked peek of the
   real Today she'll unlock, plus everything she'll receive — building desire
   and pulling her into the setup flow.
============================================================================ */

const PREVIEWS = [
  { l: "Today's Coach",   img: "/images/coach-bloom-hero.webp" },
  { l: "Today's Recipes", img: "/images/setup-meals.webp" },
  { l: "Your Energy",     img: "/images/setup-goal.webp" },
  { l: "Today's Yoga",    img: "/images/yoga-hero.webp" },
  { l: "Mood & Insights", img: "/images/setup-cycle.webp" },
];

const RECEIVE = [
  "Daily recipes", "AI coach", "Personalized yoga", "Daily inspiration", "Water reminders",
  "Weight forecast", "Shopping lists", "Cycle predictions", "Skin-care rituals", "Hair-care reminders",
];

export function PersonalizedBloomPreview() {
  const scrollToSetup = () => {
    try { document.querySelector("[data-next-step]")?.scrollIntoView({ behavior: "smooth", block: "center" }); } catch {}
  };
  return (
    <section className="mt-4 sm:mt-6 animate-card-pop-in" style={{ animationDelay: "60ms" }}>
      <div className="overflow-hidden rounded-[2rem] border border-white/70 bg-white/75 backdrop-blur-xl shadow-[0_20px_50px_rgba(219,39,119,0.12)]">
        {/* header */}
        <div className="flex items-center gap-2 px-5 sm:px-7 pt-5 pb-3">
          <Lock className="h-4 w-4 text-hotpink" strokeWidth={2.2} />
          <p className="text-[13px] sm:text-sm font-black text-hotpink">Your personalized Bloom world <span className="font-semibold text-rose/60">(unlocks after setup)</span></p>
        </div>

        {/* blurred locked previews */}
        <div className="px-4 sm:px-7 pb-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
            {PREVIEWS.map((p) => (
              <div key={p.l} className="relative aspect-[5/4] overflow-hidden rounded-2xl bg-blush">
                <img src={p.img} alt="" className="absolute inset-0 h-full w-full object-cover blur-[3px] scale-110" loading="lazy"
                  onError={(e) => { const el = e.currentTarget as HTMLImageElement; if (!el.src.endsWith("/images/meal-buddha.webp")) el.src = "/images/meal-buddha.webp"; }} />
                <div className="absolute inset-0 bg-gradient-to-t from-hotpink/45 via-white/20 to-white/10" />
                <span className="absolute left-2 top-2 grid h-6 w-6 place-items-center rounded-full bg-white/85 text-hotpink shadow-sm"><Lock className="h-3 w-3" strokeWidth={2.5} /></span>
                <span className="absolute inset-x-0 bottom-0 p-2 text-[11px] font-black text-white drop-shadow">{p.l}</span>
              </div>
            ))}
          </div>
        </div>

        {/* what she'll receive + CTA */}
        <div className="border-t border-petal/40 bg-gradient-to-br from-blush/40 via-white to-petal/25 px-5 sm:px-7 py-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
            <div className="min-w-0 flex-1">
              <p className="inline-flex items-center gap-1.5 font-script text-xl text-hotpink leading-none">After setup, you'll receive <Heart className="h-4 w-4 fill-hotpink text-hotpink" /></p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {RECEIVE.map((r) => (
                  <span key={r} className="inline-flex items-center gap-1 rounded-full bg-white/85 border border-petal/50 px-2.5 py-1 text-[10.5px] font-semibold text-magenta">
                    <Sparkles className="h-2.5 w-2.5 text-hotpink" strokeWidth={2.5} /> {r}
                  </span>
                ))}
              </div>
            </div>
            <button onClick={scrollToSetup}
              className="shrink-0 inline-flex flex-col items-center rounded-2xl bg-gradient-to-r from-hotpink to-magenta px-6 py-3 text-white shadow-lg shadow-hotpink/30 transition hover:brightness-105 active:scale-95 animate-cta-bounce">
              <span className="inline-flex items-center gap-2 text-sm font-black">Build My Bloom World <span>🌸</span></span>
              <span className="mt-0.5 inline-flex items-center gap-1 text-[10px] font-semibold text-white/85">It only takes 5 minutes <ArrowRight className="h-3 w-3" strokeWidth={2.5} /></span>
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
