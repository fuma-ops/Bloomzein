import { Fragment, type ReactNode } from "react";
import { Sparkles, Flower2, Sun, Quote } from "lucide-react";

/**
 * Renders a Bloomzein article body written in a light markdown dialect:
 *   # Headline            → editorial headline
 *   *dek line*            → subtitle under the headline
 *   ## Section            → section heading
 *   ### Sub-section       → smaller heading
 *   - item                → list
 *   ---                   → soft divider
 *   paragraph text        → body paragraph (**bold**, *italic* inline)
 *
 * The four recurring "Bloom" sections get their own signature treatments so an
 * article looks unmistakably Bloomzein: Reflection, Tips, Today's Bloom, Reminder.
 */

const BLOOM_BLOCKS: Record<string, { icon: typeof Sparkles; label: string }> = {
  "bloom reflection": { icon: Flower2, label: "Bloom Reflection" },
  "bloom tips": { icon: Sparkles, label: "Bloom Tips" },
  "today's bloom": { icon: Sun, label: "Today's Bloom" },
  "todays bloom": { icon: Sun, label: "Today's Bloom" },
  "bloom reminder": { icon: Quote, label: "Bloom Reminder" },
};

type Block =
  | { kind: "headline"; text: string }
  | { kind: "dek"; text: string }
  | { kind: "h2"; text: string }
  | { kind: "h3"; text: string }
  | { kind: "p"; text: string }
  | { kind: "ul"; items: string[] }
  | { kind: "hr" }
  | { kind: "bloom"; key: string; label: string; body: Block[] };

/* ── inline **bold** / *italic* ── */
function inline(text: string, keyBase: string): ReactNode[] {
  const out: ReactNode[] = [];
  const re = /(\*\*[^*]+\*\*|\*[^*]+\*)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(<Fragment key={`${keyBase}-t${i}`}>{text.slice(last, m.index)}</Fragment>);
    const tok = m[0];
    if (tok.startsWith("**")) out.push(<strong key={`${keyBase}-b${i}`} className="font-semibold text-rose">{tok.slice(2, -2)}</strong>);
    else out.push(<em key={`${keyBase}-i${i}`} className="italic">{tok.slice(1, -1)}</em>);
    last = m.index + tok.length;
    i++;
  }
  if (last < text.length) out.push(<Fragment key={`${keyBase}-t${i}`}>{text.slice(last)}</Fragment>);
  return out;
}

/* ── markdown → blocks ── */
function parse(md: string): Block[] {
  const lines = md.replace(/\r\n/g, "\n").split("\n");
  const blocks: Block[] = [];
  let i = 0;
  let seenHeadline = false;

  const isBloom = (t: string) => BLOOM_BLOCKS[t.trim().toLowerCase().replace(/[?:.]$/, "")];

  while (i < lines.length) {
    const raw = lines[i];
    const line = raw.trim();
    if (!line) { i++; continue; }

    // headline
    if (line.startsWith("# ") && !line.startsWith("## ")) {
      blocks.push({ kind: "headline", text: line.slice(2).trim() });
      seenHeadline = true;
      i++;
      // an immediately following *dek* line
      let j = i;
      while (j < lines.length && !lines[j].trim()) j++;
      const next = lines[j]?.trim() ?? "";
      if (/^\*[^*].*\*$/.test(next)) {
        blocks.push({ kind: "dek", text: next.slice(1, -1).trim() });
        i = j + 1;
      }
      continue;
    }

    // headings (## / ###)
    if (line.startsWith("### ")) { blocks.push({ kind: "h3", text: line.slice(4).trim() }); i++; continue; }
    if (line.startsWith("## ")) {
      const text = line.slice(3).trim();
      const bloom = isBloom(text);
      if (bloom) {
        // collect this bloom block until the next ## / --- (end of block)
        i++;
        const inner: string[] = [];
        while (i < lines.length) {
          const l = lines[i].trim();
          if (l.startsWith("## ") || l === "---") break;
          inner.push(lines[i]);
          i++;
        }
        blocks.push({ kind: "bloom", key: bloom.label, label: bloom.label, body: parseSimple(inner) });
        continue;
      }
      blocks.push({ kind: "h2", text });
      i++;
      continue;
    }

    // divider
    if (line === "---") { blocks.push({ kind: "hr" }); i++; continue; }

    // list
    if (line.startsWith("- ") || line.startsWith("* ")) {
      const items: string[] = [];
      while (i < lines.length && /^[-*]\s+/.test(lines[i].trim())) {
        items.push(lines[i].trim().replace(/^[-*]\s+/, ""));
        i++;
      }
      blocks.push({ kind: "ul", items });
      continue;
    }

    // stray dek before headline seen
    if (!seenHeadline && /^\*[^*].*\*$/.test(line)) {
      blocks.push({ kind: "dek", text: line.slice(1, -1).trim() });
      i++;
      continue;
    }

    // paragraph
    blocks.push({ kind: "p", text: line });
    i++;
  }
  return blocks;
}

/** Parser for the inside of a Bloom block (no nested bloom/headline). */
function parseSimple(lines: string[]): Block[] {
  const blocks: Block[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i].trim();
    if (!line) { i++; continue; }
    if (line.startsWith("- ") || line.startsWith("* ")) {
      const items: string[] = [];
      while (i < lines.length && /^[-*]\s+/.test(lines[i].trim())) {
        items.push(lines[i].trim().replace(/^[-*]\s+/, ""));
        i++;
      }
      blocks.push({ kind: "ul", items });
      continue;
    }
    blocks.push({ kind: "p", text: line });
    i++;
  }
  return blocks;
}

/* ── renderers ── */
function Paragraph({ text, k }: { text: string; k: string }) {
  return <p className="mt-4 text-[15px] sm:text-base leading-7 sm:leading-8 text-rose/90">{inline(text, k)}</p>;
}

function BloomCard({ block, index }: { block: Extract<Block, { kind: "bloom" }>; index: number }) {
  const meta = BLOOM_BLOCKS[block.label.toLowerCase()];
  const Icon = meta?.icon ?? Sparkles;
  const isReminder = block.label === "Bloom Reminder";
  const isToday = block.label === "Today's Bloom";
  const isTips = block.label === "Bloom Tips";

  const shell = isReminder
    ? "bg-gradient-to-br from-hotpink/12 via-petal/25 to-blush/40 border-hotpink/30"
    : isToday
    ? "bg-gradient-to-br from-blush/60 to-white/80 border-hotpink/25"
    : "bg-white/85 border-petal/60";

  return (
    <section
      // Bloom cards sit deep in the article; cap the entrance delay so
      // `fill-mode: backwards` doesn't hold them invisible for seconds.
      style={{ animationDelay: `${Math.min(index, 4) * 60}ms` }}
      className={[
        "animate-card-pop-in mt-8 rounded-[1.75rem] border p-5 sm:p-7 backdrop-blur",
        "shadow-[0_12px_34px_-18px_oklch(0.6_0.22_350/0.35)]",
        shell,
      ].join(" ")}
    >
      <div className="flex items-center gap-2">
        <span className={[
          "grid h-8 w-8 place-items-center rounded-full",
          isReminder || isToday ? "bg-hotpink text-white animate-selected-glow" : "bg-blush text-hotpink",
        ].join(" ")}>
          <Icon className="h-4 w-4" strokeWidth={1.9} />
        </span>
        <h3 className="font-script text-2xl sm:text-3xl text-hotpink leading-none">{block.label}</h3>
      </div>

      <div className={isReminder ? "mt-3" : "mt-2"}>
        {block.body.map((b, bi) => {
          const k = `${block.key}-${bi}`;
          if (b.kind === "ul") {
            return (
              <ul key={k} className="mt-3 space-y-2.5">
                {b.items.map((it, ii) => (
                  <li key={`${k}-${ii}`} className="flex gap-2.5 text-[15px] leading-7 text-rose/90">
                    <Flower2 className="mt-1 h-4 w-4 shrink-0 text-hotpink" strokeWidth={1.8} />
                    <span>{inline(it, `${k}-${ii}`)}</span>
                  </li>
                ))}
              </ul>
            );
          }
          if (isReminder) {
            return (
              <p key={k} className="font-script text-2xl sm:text-3xl leading-snug text-rose">
                {inline(b.text, k)}
              </p>
            );
          }
          return <p key={k} className={[bi === 0 ? "mt-1" : "mt-3", "text-[15px] leading-7 text-rose/90"].join(" ")}>{inline(b.text, k)}</p>;
        })}
      </div>
      {isTips ? <div className="mt-1" /> : null}
    </section>
  );
}

export function ArticleBody({ markdown }: { markdown: string }) {
  const blocks = parse(markdown);
  return (
    <div>
      {blocks.map((b, i) => {
        const k = `b${i}`;
        switch (b.kind) {
          case "headline":
            return (
              <h1 key={k} className="mt-2 font-script text-4xl sm:text-5xl lg:text-6xl text-hotpink leading-[1.05]">
                {b.text}
              </h1>
            );
          case "dek":
            return <p key={k} className="mt-3 text-base sm:text-lg text-rose/80 italic leading-relaxed">{inline(b.text, k)}</p>;
          case "h2":
            return <h2 key={k} className="mt-9 font-serif text-xl sm:text-2xl font-bold text-rose leading-snug">{b.text}</h2>;
          case "h3":
            return <h3 key={k} className="mt-6 text-base sm:text-lg font-bold text-hotpink">{b.text}</h3>;
          case "p":
            return <Paragraph key={k} text={b.text} k={k} />;
          case "ul":
            return (
              <ul key={k} className="mt-4 space-y-2.5">
                {b.items.map((it, ii) => (
                  <li key={`${k}-${ii}`} className="flex gap-2.5 text-[15px] sm:text-base leading-7 text-rose/90">
                    <span className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-hotpink" />
                    <span>{inline(it, `${k}-${ii}`)}</span>
                  </li>
                ))}
              </ul>
            );
          case "hr":
            return (
              <div key={k} className="my-8 flex items-center justify-center gap-2 text-petal">
                <span className="h-px w-12 bg-petal/70" />
                <Flower2 className="h-3.5 w-3.5 text-hotpink/60" strokeWidth={1.8} />
                <span className="h-px w-12 bg-petal/70" />
              </div>
            );
          case "bloom":
            return <BloomCard key={k} block={b} index={i} />;
        }
      })}
    </div>
  );
}

export default ArticleBody;
