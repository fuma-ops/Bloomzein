import { useState } from "react";
import { Play, Flower, Dumbbell } from "lucide-react";
import { BloomzeinIntro } from "@/components/bloom/BloomzeinIntro";

/**
 * Preview / tuning page for the cinematic brand intro. Play it, feel the motion,
 * then it gets wired into session start. Real assets (your Scene-1 art + the 5s
 * yoga clip) drop into `sceneSrc` / `videoSrc`; placeholders keep it alive now.
 */
export default function IntroPreviewPage() {
  const [play, setPlay] = useState(() => {
    try { return new URLSearchParams(window.location.search).get("play") === "1"; } catch { return false; }
  });
  const [channel, setChannel] = useState<"Yoga" | "Workout">("Yoga");

  const cfg = channel === "Yoga"
    ? { title: "Morning Energy Flow", meta: "15 Minutes", pillars: ["Awaken", "Stretch", "Bloom"] }
    : { title: "Full-Body Sculpt", meta: "20 Minutes", pillars: ["Warm up", "Burn", "Bloom"] };

  return (
    <div className="animate-fade-in max-w-3xl mx-auto">
      <div className="mb-5">
        <h1 className="font-script text-4xl text-[#B21E6F]">Brand intro ✿</h1>
        <p className="text-[#9D5C7E] text-sm mt-1 max-w-xl">
          A ~5s cinematic opener — glassmorphism sakura, drifting petals &amp; bokeh, layered parallax,
          the handwritten wordmark writing itself, then the session title dissolving into the first frame.
          It plays at session start so your screen-recording captures it. Your Scene-1 art and the 5s
          yoga clip drop in behind; audio (the sting) plugs in when ready.
        </p>
      </div>

      <div className="inline-flex items-center gap-1 rounded-full bg-white/70 border border-hotpink/20 p-1 mb-5">
        {(["Yoga", "Workout"] as const).map((c) => (
          <button key={c} onClick={() => setChannel(c)}
            className={["inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-bold transition",
              channel === c ? "bg-gradient-to-br from-petal to-hotpink text-white shadow" : "text-hotpink"].join(" ")}>
            {c === "Yoga" ? <Flower className="h-4 w-4" /> : <Dumbbell className="h-4 w-4" />} {c}
          </button>
        ))}
      </div>

      <button onClick={() => setPlay(true)}
        className="inline-flex items-center gap-2 rounded-full bg-gradient-to-br from-petal to-hotpink text-white text-base font-bold px-6 py-3 shadow-lg shadow-hotpink/30 active:scale-95 transition animate-selected-glow">
        <Play className="h-5 w-5" /> Play the {channel} intro
      </button>
      <p className="text-xs text-[#9D5C7E] mt-3">Move your mouse during playback — the layers follow it (parallax). Tap to skip.</p>

      {play && (
        <BloomzeinIntro
          channel={channel}
          sessionTitle={cfg.title}
          sessionMeta={cfg.meta}
          pillars={cfg.pillars}
          onDone={() => setPlay(false)}
        />
      )}
    </div>
  );
}
