import { useState } from "react";
import { Play, Sparkles, Dumbbell, Flower } from "lucide-react";
import { BloomzeinIntro, INTRO_MODEL_KEY, type IntroModel } from "@/components/bloom/BloomzeinIntro";

const MODELS: { id: IntroModel; name: string; vibe: string; note: string }[] = [
  { id: 1, name: "Sparkle Dream", vibe: "Glam · floral collage · sparkle", note: "The full Barbie wow — drifting photo collage, wordmark with a gleam sweep, sparkles. Great default for both channels." },
  { id: 2, name: "Soft Bloom", vibe: "Calm · airy · spa", note: "Minimal & serene — a flower blooms open behind the logo. Best fit for the Yoga channel." },
  { id: 3, name: "Glam Pop", vibe: "Punchy · saturated · bouncy", note: "Energetic — collage snaps in with a bounce, pulsing rings. Best fit for the Workout channel." },
];

function initialPlay(): IntroModel | null {
  try { const n = Number(new URLSearchParams(window.location.search).get("play")); return n === 1 || n === 2 || n === 3 ? (n as IntroModel) : null; } catch { return null; }
}

export default function IntroPreviewPage() {
  const [play, setPlay] = useState<IntroModel | null>(initialPlay);
  const [channel, setChannel] = useState<"Yoga" | "Workout">("Yoga");
  const [chosen, setChosen] = useState<IntroModel>(() => {
    try { return (Number(localStorage.getItem(INTRO_MODEL_KEY)) as IntroModel) || 1; } catch { return 1; }
  });
  const choose = (id: IntroModel) => { setChosen(id); try { localStorage.setItem(INTRO_MODEL_KEY, String(id)); } catch {} };

  return (
    <div className="animate-fade-in max-w-4xl mx-auto">
      <div className="mb-5">
        <h1 className="font-script text-4xl text-[#B21E6F]">Brand intro ✿</h1>
        <p className="text-[#9D5C7E] text-sm mt-1">Preview the three openers, then pick the one to keep. It plays for ~4–5s at the start of every session so your screen-recording captures it automatically. Audio drops in once you send the sting.</p>
      </div>

      {/* channel toggle */}
      <div className="inline-flex items-center gap-1 rounded-full bg-white/70 border border-hotpink/20 p-1 mb-5">
        {(["Yoga", "Workout"] as const).map((c) => (
          <button key={c} onClick={() => setChannel(c)}
            className={["inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-bold transition",
              channel === c ? "bg-gradient-to-br from-petal to-hotpink text-white shadow" : "text-hotpink"].join(" ")}>
            {c === "Yoga" ? <Flower className="h-4 w-4" /> : <Dumbbell className="h-4 w-4" />} {c}
          </button>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {MODELS.map((m) => (
          <div key={m.id}
            className={["rounded-3xl p-5 border bg-white/70 backdrop-blur-xl transition hover-scale",
              chosen === m.id ? "border-hotpink ring-2 ring-hotpink/40" : "border-white/60"].join(" ")}>
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-hotpink/70">Model {m.id}</span>
              {chosen === m.id && <span className="text-[10px] font-bold uppercase tracking-wider text-hotpink">✓ Kept</span>}
            </div>
            <h3 className="font-script text-2xl text-[#B21E6F] mt-1">{m.name}</h3>
            <p className="text-[11px] font-bold uppercase tracking-wide text-[#9D5C7E]">{m.vibe}</p>
            <p className="text-sm text-[#7c5069] mt-2 leading-snug min-h-[3.5rem]">{m.note}</p>
            <div className="flex items-center gap-2 mt-3">
              <button onClick={() => setPlay(m.id)}
                className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-br from-petal to-hotpink text-white text-sm font-bold px-4 py-2 shadow active:scale-95 transition">
                <Play className="h-4 w-4" /> Play
              </button>
              <button onClick={() => choose(m.id)}
                className={["inline-flex items-center gap-1.5 rounded-full text-sm font-bold px-3 py-2 border transition active:scale-95",
                  chosen === m.id ? "border-hotpink text-hotpink bg-hotpink/5" : "border-hotpink/30 text-hotpink"].join(" ")}>
                <Sparkles className="h-4 w-4" /> Keep
              </button>
            </div>
          </div>
        ))}
      </div>

      {play != null && (
        <BloomzeinIntro model={play} channel={channel} onDone={() => setPlay(null)} />
      )}
    </div>
  );
}
