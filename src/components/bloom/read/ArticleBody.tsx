import { Fragment, type ReactNode } from "react";
import { Sparkles, Flower2, Sun, Quote } from "lucide-react";

/**
 * Renders a Bloomzein article body written in a light markdown dialect:
 *   # Headline            → editorial headline (rendered in the hero, not here)
 *   *dek line*            → subtitle (kept out of the body flow)
 *   ## Section            → section heading (anchored, appears in "On this page")
 *   ### Sub-section       → smaller heading
 *   - item                → list
 *   > quote               → soft "callout" box
 *   ---                   → soft divider
 *   paragraph text        → body paragraph (**bold**, *italic* inline)
 *
 * The first body paragraph opens with a script drop-cap. The four recurring
 * "Bloom" sections get signature card treatments: Reflection, Tips, Today's
 * Bloom, Reminder.
 */

const BLOOM_BLOCKS: Record<string, { icon: typeof Sparkles; label: string }> = {
  "bloom reflection": { icon: Flower2, label: "Bloom Reflection" },
  "bloom tips": { icon: Sparkles, label: "Bloom Tips" },
  "today's bloom": { icon: Sun, label: "Today's Bloom" },
  "todays bloom": { icon: Sun, label: "Today's Bloom" },
  "bloom reminder": { icon: Quote, label: "Bloom Reminder" },
};

type Block =
  | { kind: "h2"; text: string; id: string }
  | { kind: "h3"; text: string }
  | { kind: "p"; text: string }
  | { kind: "ul"; items: string[] }
  | { kind: "callout"; text: string }
  | { kind: "hr" }
  | { kind: "bloom"; key: string; label: string; id: string; body: Block[] };

export type ArticleSection = { id: string; label: string; bloom?: boolean };
export type ParsedArticle = { headline: string; dek: string; sections: ArticleSection[]; blocks: Block[] };

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

function slugify(s: string): string {
  return s.toLowerCase().replace(/[^\w\s-]/g, "").trim().replace(/\s+/g, "-").slice(0, 48) || "section";
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

/* ── markdown → parsed article ── */
export function parseArticle(md: string): ParsedArticle {
  const lines = md.replace(/\r\n/g, "\n").split("\n");
  const blocks: Block[] = [];
  const sections: ArticleSection[] = [];
  const usedIds = new Set<string>();
  let headline = "";
  let dek = "";
  let seenHeadline = false;
  let i = 0;

  const uniqueId = (base: string) => {
    let id = base, n = 2;
    while (usedIds.has(id)) id = `${base}-${n++}`;
    usedIds.add(id);
    return id;
  };
  const isBloom = (t: string) => BLOOM_BLOCKS[t.trim().toLowerCase().replace(/[?:.]$/, "")];

  while (i < lines.length) {
    const raw = lines[i];
    const line = raw.trim();
    if (!line) { i++; continue; }

    // headline (kept out of the body — the reader shows it in the hero)
    if (line.startsWith("# ") && !line.startsWith("## ")) {
      headline = line.slice(2).trim();
      seenHeadline = true;
      i++;
      let j = i;
      while (j < lines.length && !lines[j].trim()) j++;
      const next = lines[j]?.trim() ?? "";
      if (/^\*[^*].*\*$/.test(next)) { dek = next.slice(1, -1).trim(); i = j + 1; }
      continue;
    }

    if (line.startsWith("### ")) { blocks.push({ kind: "h3", text: line.slice(4).trim() }); i++; continue; }

    if (line.startsWith("## ")) {
      const text = line.slice(3).trim();
      const bloom = isBloom(text);
      if (bloom) {
        i++;
        const inner: string[] = [];
        while (i < lines.length) {
          const l = lines[i].trim();
          if (l.startsWith("## ") || l === "---") break;
          inner.push(lines[i]);
          i++;
        }
        const id = uniqueId(slugify(bloom.label));
        sections.push({ id, label: bloom.label, bloom: true });
        blocks.push({ kind: "bloom", key: bloom.label, label: bloom.label, id, body: parseSimple(inner) });
        continue;
      }
      const id = uniqueId(slugify(text));
      sections.push({ id, label: text });
      blocks.push({ kind: "h2", text, id });
      i++;
      continue;
    }

    if (line === "---") { blocks.push({ kind: "hr" }); i++; continue; }

    // blockquote → callout (collect consecutive "> " lines)
    if (line.startsWith(">")) {
      const buf: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith(">")) {
        buf.push(lines[i].trim().replace(/^>\s?/, ""));
        i++;
      }
      blocks.push({ kind: "callout", text: buf.join(" ").trim() });
      continue;
    }

    if (line.startsWith("- ") || line.startsWith("* ")) {
      const items: string[] = [];
      while (i < lines.length && /^[-*]\s+/.test(lines[i].trim())) {
        items.push(lines[i].trim().replace(/^[-*]\s+/, ""));
        i++;
      }
      blocks.push({ kind: "ul", items });
      continue;
    }

    if (!seenHeadline && /^\*[^*].*\*$/.test(line)) { dek = line.slice(1, -1).trim(); i++; continue; }

    blocks.push({ kind: "p", text: line });
    i++;
  }
  return { headline, dek, sections, blocks };
}

/* ── renderers ── */
function DropCapParagraph({ text, k }: { text: string; k: string }) {
  const first = text.charAt(0);
  const rest = text.slice(1);
  return (
    <p className="mt-1 text-[15px] sm:text-[17px] leading-8 text-rose/90">
      <span className="float-left mr-2 mt-1 font-script text-6xl sm:text-7xl leading-[0.75] text-hotpink">{first}</span>
      {inline(rest, k)}
    </p>
  );
}

function BloomCard({ block, index }: { block: Extract<Block, { kind: "bloom" }>; index: number }) {
  const meta = BLOOM_BLOCKS[block.label.toLowerCase()];
  const Icon = meta?.icon ?? Sparkles;
  const isReminder = block.label === "Bloom Reminder";
  const isToday = block.label === "Today's Bloom";

  const shell = isReminder
    ? "bg-gradient-to-br from-hotpink/12 via-petal/25 to-blush/40 border-hotpink/30"
    : isToday
    ? "bg-gradient-to-br from-blush/60 to-white/80 border-hotpink/25"
    : "bg-white/85 border-petal/60";

  return (
    <section
      id={block.id}
      style={{ animationDelay: `${Math.min(index, 4) * 60}ms`, scrollMarginTop: "5rem" }}
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
          if (b.kind !== "p") return null;
          if (isReminder) {
            return <p key={k} className="font-script text-2xl sm:text-3xl leading-snug text-rose">{inline(b.text, k)}</p>;
          }
          return <p key={k} className={[bi === 0 ? "mt-1" : "mt-3", "text-[15px] leading-7 text-rose/90"].join(" ")}>{inline(b.text, k)}</p>;
        })}
      </div>
    </section>
  );
}

export function ArticleBody({ parsed }: { parsed: ParsedArticle }) {
  let firstParaSeen = false;
  return (
    <div>
      {parsed.blocks.map((b, i) => {
        const k = `b${i}`;
        switch (b.kind) {
          case "h2":
            return <h2 key={k} id={b.id} style={{ scrollMarginTop: "5rem" }} className="mt-10 font-serif text-2xl sm:text-[1.75rem] font-semibold text-rose leading-snug">{b.text}</h2>;
          case "h3":
            return <h3 key={k} className="mt-6 font-serif text-lg sm:text-xl font-semibold text-hotpink">{b.text}</h3>;
          case "p": {
            if (!firstParaSeen) { firstParaSeen = true; return <DropCapParagraph key={k} text={b.text} k={k} />; }
            return <p key={k} className="mt-4 text-[15px] sm:text-[17px] leading-8 text-rose/90">{inline(b.text, k)}</p>;
          }
          case "callout":
            return (
              <blockquote key={k} className="my-6 flex gap-3 rounded-2xl border border-hotpink/25 bg-gradient-to-br from-blush/55 to-white/70 p-4 sm:p-5 backdrop-blur shadow-[0_10px_28px_-18px_oklch(0.6_0.22_350/0.4)]">
                <Flower2 className="mt-0.5 h-5 w-5 shrink-0 text-hotpink" strokeWidth={1.8} />
                <p className="font-serif text-[15px] sm:text-lg italic leading-7 text-rose">{inline(b.text, k)}</p>
              </blockquote>
            );
          case "ul":
            return (
              <ul key={k} className="mt-4 space-y-2.5">
                {b.items.map((it, ii) => (
                  <li key={`${k}-${ii}`} className="flex gap-2.5 text-[15px] sm:text-[17px] leading-7 text-rose/90">
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
