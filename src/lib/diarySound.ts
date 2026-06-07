let sharedCtx: AudioContext | null = null;

function getContext(): AudioContext | null {
  try {
    const Ctor = window.AudioContext || (window as any).webkitAudioContext;
    if (!Ctor) return null;
    if (!sharedCtx) sharedCtx = new Ctor();
    if (sharedCtx.state === "suspended") sharedCtx.resume();
    return sharedCtx;
  } catch {
    return null;
  }
}

/** Synthesizes a soft paper-page-turn whoosh — no audio asset needed. */
export function playPageFlipSound() {
  const ctx = getContext();
  if (!ctx) return;

  const duration = 0.28;
  const bufferSize = Math.floor(ctx.sampleRate * duration);
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    const decay = Math.exp(-i / (bufferSize * 0.35));
    data[i] = (Math.random() * 2 - 1) * decay;
  }

  const noise = ctx.createBufferSource();
  noise.buffer = buffer;

  const filter = ctx.createBiquadFilter();
  filter.type = "highpass";
  filter.frequency.setValueAtTime(900, ctx.currentTime);
  filter.frequency.exponentialRampToValueAtTime(2200, ctx.currentTime + duration);

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.16, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

  noise.connect(filter).connect(gain).connect(ctx.destination);
  noise.start();
  noise.stop(ctx.currentTime + duration);
}
