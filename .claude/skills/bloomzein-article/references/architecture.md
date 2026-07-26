# Architecture — where articles live

Two places, on purpose:

1. **The catalogue** — `src/lib/readsData.ts`. A light entry per article (id,
   title, excerpt, category, minutes, blooms, image, optional `phase`,
   optional `status`). This is the only part that ships in the main bundle, so
   the whole library can be browsed/searched without downloading every body.

2. **The body** — one code-split module per category in
   `src/content/reads/<slug>.ts`, exporting `default` a `Record<id, markdown>`.
   Loaded lazily by `src/content/reads/registry.ts` via `loadArticleBody`, so a
   reader only downloads the category they open.

A catalogue entry with no matching body (and no inline `body`) renders an empty
reader — a "mockup". Every real article needs **both** a catalogue entry and a
body in its category chunk.

## Catalogue entry shape

```ts
{ id: "MW001", title: "Why Am I So Tired All the Time?", category: "Mental Wellness",
  minutes: 6, blooms: "2.4k", image: CAT_IMG["Mental Wellness"], phase: "luteal", status: "review",
  excerpt: "One-to-two sentence dek that sells the click." },
```

- `minutes` ≈ words / 200 (min 3). `blooms` is a social-proof count like "2.4k".
- `image: CAT_IMG["<Category>"]` — the category hero fallback. Custom per-article
  heroes can drop in later as `/images/read-<id>.webp`.
- `phase` (optional): `"menstrual" | "follicular" | "ovulatory" | "luteal"`.
  Phase-tagged articles feed the "For your phase" carousels on Today and Diet —
  keep at least one real article per phase alive.
- `status: "review"` — new articles carry this until the user validates. Publish
  = delete the `, status: "review"`.

## ID scheme

Per-category prefixes, zero-padded: `CY`=Cycle, `NU`=Nutrition, `BE`=Beauty,
`SP`=Sleep, `YG`=Yoga, `HW`=Herbal Wellness, `JR`=Journaling, `SL`=Soft Living,
`BO`=Bloomzein Originals. New categories: pick a clear 2-letter prefix (e.g.
`MW`=Mental Wellness, `MO`=Money, `RE`=Recipes/Relationships — check for
clashes first with `grep -oE 'id: "[A-Z]+[0-9]+"' src/lib/readsData.ts`).
IDs are globally unique; keep bodies in their own category's chunk.

## Registering a new category chunk

`CATEGORIES` (14 of them) already exist in `readsData.ts`, and `CAT_IMG` /
the Read page's `FILTER_ICONS` are exhaustive `Record<Category, …>` maps — so a
category is browsable already. What a brand-new category needs is a **body
loader**. In `src/content/reads/registry.ts`, add to `LOADERS`:

```ts
"Mental Wellness": () => import("./mental-wellness"),
```

and create `src/content/reads/mental-wellness.ts`:

```ts
/* Mental Wellness — long-form article bodies (lazy-loaded). */
const bodies: Record<string, string> = {
};
export default bodies;
```

The batch script appends into that `bodies` object.

## Helpers you should reuse (never fork)

In `readsData.ts`: `articleById`, `readsForPhase`, `articlesByCategory`,
`relatedArticles`. The Read page and the Diet phase-carousel both read from
`ARTICLES` — don't compute a private article list elsewhere.

## Sanity checks before shipping a batch

- No duplicate IDs or titles:
  `grep -oE 'id: "[A-Z0-9a-z]+"' src/lib/readsData.ts | sort | uniq -d`
- Every new ID has a body in its category chunk.
- Every `@read` target ID actually exists.
- The category has a loader in `registry.ts`.
