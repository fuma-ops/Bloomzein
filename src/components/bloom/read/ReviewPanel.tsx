import { useEffect, useState } from "react";
import { ClipboardCheck, Copy, Check, PenLine } from "lucide-react";
import { ARTICLES, type Article } from "@/lib/readsData";

/**
 * Editorial review panel — shown on articles with status "review". The reviewer
 * leaves a comment or ticks "Validate", then taps "Copy feedback for Claude" to
 * bundle every review article's verdict into one block to paste back in chat.
 * (The app can't send comments to Claude directly, so the clipboard is the
 * bridge.) Once Claude publishes an article, its status flips and this panel
 * disappears.
 */
const KEY = (id: string) => `bloom:review:${id}`;
type ReviewState = { comment: string; validated: boolean };

function readState(id: string): ReviewState {
  try {
    const raw = localStorage.getItem(KEY(id));
    if (raw) { const p = JSON.parse(raw); return { comment: p.comment ?? "", validated: !!p.validated }; }
  } catch {}
  return { comment: "", validated: false };
}
function writeState(id: string, s: ReviewState) {
  try { localStorage.setItem(KEY(id), JSON.stringify(s)); } catch {}
}

export function ReviewPanel({ article }: { article: Article }) {
  const [comment, setComment] = useState("");
  const [validated, setValidated] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const s = readState(article.id);
    setComment(s.comment);
    setValidated(s.validated);
  }, [article.id]);

  const persist = (c: string, v: boolean) => {
    setComment(c); setValidated(v);
    writeState(article.id, { comment: c, validated: v });
  };

  const copyFeedback = () => {
    const reviewing = ARTICLES.filter((a) => a.status === "review");
    const blocks = reviewing.map((a) => {
      const s = readState(a.id);
      const verdict = s.validated ? "VALIDATE ✓ — publish as-is" : s.comment ? "NEEDS CHANGES" : "— not reviewed yet";
      return `• ${a.id} — "${a.title}"\n  ${verdict}${s.comment ? `\n  Comment: ${s.comment}` : ""}`;
    });
    const text = "Bloomzein article review\n\n" + blocks.join("\n\n");
    const done = () => { setCopied(true); setTimeout(() => setCopied(false), 1800); };
    if (navigator.clipboard?.writeText) navigator.clipboard.writeText(text).then(done, done);
    else done();
  };

  return (
    <div className="relative z-[2] mt-3 rounded-[1.5rem] border-2 border-dashed border-hotpink/45 bg-white/80 backdrop-blur p-4 sm:p-5 shadow-[0_12px_34px_-20px_oklch(0.6_0.22_350/0.4)]">
      <div className="flex items-center gap-2">
        <span className="grid h-7 w-7 place-items-center rounded-full bg-hotpink text-white animate-selected-glow">
          <PenLine className="h-4 w-4" strokeWidth={2} />
        </span>
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-hotpink/80">Review mode</p>
          <p className="text-xs text-rose/70">Validate to publish, or leave a note and I'll revise it.</p>
        </div>
        {validated && (
          <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-hotpink/10 px-2.5 py-1 text-[11px] font-bold text-hotpink">
            <Check className="h-3.5 w-3.5" strokeWidth={2.4} /> Validated
          </span>
        )}
      </div>

      <textarea
        value={comment}
        onChange={(e) => persist(e.target.value, validated)}
        placeholder="What would make this better? (leave blank if it's perfect)"
        rows={2}
        className="mt-3 w-full resize-y rounded-2xl border border-petal/60 bg-white/90 px-3.5 py-2.5 text-sm text-rose placeholder:text-rose/45 outline-none transition focus:ring-4 focus:ring-hotpink/15 focus:border-hotpink"
      />

      <div className="mt-2.5 flex flex-wrap items-center gap-2">
        <button
          onClick={() => persist(comment, !validated)}
          className={[
            "inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-bold transition active:scale-95 border",
            validated
              ? "bg-white text-hotpink border-hotpink/40 hover:bg-blush/50"
              : "bg-hotpink text-white border-hotpink shadow-md shadow-hotpink/30",
          ].join(" ")}
        >
          <ClipboardCheck className="h-4 w-4" strokeWidth={2} />
          {validated ? "Undo validate" : "Validate ✓"}
        </button>

        <button
          onClick={copyFeedback}
          className="inline-flex items-center gap-1.5 rounded-full bg-white/85 px-3.5 py-1.5 text-xs font-bold text-hotpink border border-petal/60 hover:bg-white transition active:scale-95"
        >
          {copied ? <Check className="h-4 w-4" strokeWidth={2.4} /> : <Copy className="h-4 w-4" strokeWidth={2} />}
          {copied ? "Copied — paste to Claude" : "Copy feedback for Claude"}
        </button>
      </div>
    </div>
  );
}

export default ReviewPanel;
