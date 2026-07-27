# Article format — body dialect, structure, directives

Bodies are written in a light markdown dialect parsed by
`src/components/bloom/read/ArticleBody.tsx`. Author the body as one string; the
reader renders the `# Headline` in the hero (not the flow) and the `*dek*` as
the subtitle.

## The markdown dialect

```
# Headline                     → shown in the hero, not the body
*dek line in italics*          → subtitle (kept out of body flow)
## Section Heading             → section (also appears in "On this page")
### Sub-heading                → smaller heading
Paragraph text.                → body paragraph; **bold** and *italic* inline
- item                         → bullet list
> callout text                 → soft highlighted callout box
---                            → soft flower divider
@tool <key> | text             → in-article tool card (see keys below)
@product <key> | text          → affiliate product card (see below)
@read <articleId> | text       → cross-link card to another article
@chart <key>                   → renders an illustrative chart (see keys below)
```

Notes that matter:
- The **first body paragraph** gets a script drop-cap automatically — make it a
  strong, recognisable hook.
- Consecutive sentence-paragraphs are coalesced to ~220-char paragraphs, so it's
  fine (and idiomatic) to write one sentence per line for rhythm.
- Directives (`@tool`, `@read`, `@chart`) must each sit on their **own line**.
  The `|` separates key from copy; `@chart` takes no copy (a trailing `|` is
  fine and ignored).

## The Bloom structure (every article)

Order, using `##` headings:

1. **Hook intro** (no heading) — 3–5 short paragraphs opening the loop.
2. **3–6 body sections** (`## ...`) — one idea each, explained with *why*. Weave
   `@tool`, `@read`, and an optional `@chart` in where they genuinely help.
3. **## Bloom Reflection** — the emotional reframe; what this means for her.
4. **## Bloom Tips** — a bulleted, skimmable action list.
5. **## Today's Bloom** — one tiny thing to do today.
6. **## Bloom Reminder** — a short, warm closing line (rendered large + script).

These four "Bloom" sections get signature card treatments automatically — just
use the exact headings.

## Tool card keys (`@tool <key> | copy`)

Only these keys exist (defined in `ArticleBody.tsx` `TOOLS`). Using another key
renders nothing:

| key       | tool             | good for |
|-----------|------------------|----------|
| `cycle`   | Cycle Tracker    | anything phase/hormone/symptom tracking |
| `diary`   | Diary            | journaling, brain-dumps, mood, overthinking |
| `mood`    | Mood & Journal   | mood tracking (alias of diary) |
| `meals`   | Meals Planner    | what to eat, meal planning |
| `diet`    | Cycle Nutrition  | eating with the cycle |
| `yoga`    | Yoga             | gentle movement, evening flows |
| `workout` | Movement         | training, strength, energy |

Write the copy as a soft invitation that reads as help:
`@tool cycle | Log how you sleep beside your mood and symptoms, and watch the pattern surface — open your Cycle Tracker`

## Affiliate product cards (`@product <key> | copy`)

Some articles (beauty, clean-girl, fashion, lifestyle) implicitly recommend
products the reader can buy through an affiliate link. Keys are defined in
`src/lib/affiliateProducts.ts` (`PRODUCTS`); the card renders a shop tile with
the product name, a persuasive line, a **"Shop"** link, and — always — a small
**"affiliate" disclosure tag**. That tag is legally required (FTC) and, kept
soft, reads as honesty rather than a hard sell. Never remove it.

`@product vitcSerum | The lit-from-within step most routines quietly skip.`

If the copy is omitted, the product's own `blurb` is used. Real affiliate URLs
are filled into each product's `href` later; until then they point to `#`, so
nothing breaks. To recommend something new, add it to `PRODUCTS` first.

**Placement is everything — this is the lesson a reader taught us with a "0".**
Product cards scattered through the body make the whole article read as an ad
and kill the immersion. So:

- **In the body, mention products only *implicitly*, woven into the sensation** —
  "something cool glides over her face", "a few drops of a brightening serum",
  "a light veil of clean scent". No `@product` cards mid-article.
- **Gather every `@product` card into ONE short section near the end** — call it
  "The Edit" (or "The Morning Edit", etc.). Introduce it in a soft line, then
  list the few things quietly worth owning. That's the only place cards appear.
- **Recommend honestly.** Only what genuinely serves her, named as a *type* she'd
  benefit from; the article must be worth reading even if she buys nothing.
  Four or five in the closing edit is plenty; more reads as a catalogue.

## Cross-link cards (`@read <id> | copy`)

Link to a real article ID that exists in the catalogue. The copy should tease
the linked piece and end with a `→`:
`@read SP013 | Sleeping worse right before your period? Here's what your hormones are doing →`

Aim for 1–2 per article. Prefer same-phase or same-theme articles so the chain
feels intentional.

## Charts (`@chart <key>`)

Existing chart components (in `src/components/bloom/read/`), wired in
`ArticleBody.tsx`:

- `@chart hormones` — estrogen & progesterone across the four phases
  (`HormoneChart.tsx`).
- `@chart sleep-stages` — one night's hypnogram through the ~90-min cycles
  (`SleepStagesChart.tsx`).
- `@chart sleep-quality` — a month of daily sleep-quality bars with the
  pre-period dip (`SleepQualityChart.tsx`).

To add a **new** chart: create a component next to those, add its key to the
`case "chart"` switch in `ArticleBody.tsx`, and import it. Match the existing
aesthetic — a rounded `figure`, a script `figcaption`, a legend, and a short
explainer line under the SVG. Keep it illustrative (hand-tuned for
understanding), not clinical. Only add a chart when a visual genuinely makes the
idea land harder than words.

## Length & voice

- ~750–1,500 words. Deeper, more medical topics run longer (name real
  conditions, explain mechanisms) — that depth is a feature, not padding.
- Short sentences. Warm, plain, premium. Explain the *why*. No shame, no hype.
- Bold sparingly (it renders as an accent colour). Italics for the soft asides.
