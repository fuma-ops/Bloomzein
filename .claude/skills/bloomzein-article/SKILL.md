---
name: bloomzein-article
description: >-
  Write, revise, and ship editorial articles for the Bloomzein "Read" library
  (the in-app wellness magazine for women). Use this skill whenever the task
  touches Bloomzein Read content — "write the next batch", "add articles",
  produce cycle / nutrition / beauty / sleep / mental-wellness / yoga reads,
  choose or improve article titles, wire in tool cards or charts, or run the
  review-and-publish flow. Trigger it even when the user doesn't say "article"
  but clearly wants Read-page content or a content batch. It covers title craft
  (high-search-volume SEO + curiosity), the article body format and
  @tool/@read/@chart directives, the code-split content architecture, and the
  build → screenshot → PR → merge ship workflow.
---

# Bloomzein article

Bloomzein is a premium editorial wellness app for women. The **Read** tab is its
in-app magazine. Articles do three jobs at once: teach something genuinely
useful, make her *want* to keep reading, and quietly market Bloomzein's own
tools (Cycle Tracker, Meals Planner, Diary, Yoga, Movement) so reading turns
into using the app. Everything here exists to serve those three jobs.

Work in **batches of 5**. New articles ship in `status: "review"` so the user
reviews them on the live site, then validates (publish) or comments (revise).

## The loop at a glance

1. **Pick the batch** — usually the next topic group from the user's master
   list in `references/content-backlog.md`, or a thin/empty category. Anchor
   every title to what women actually search for — see `references/title-craft.md`.
2. **Write the bodies** — full Bloom structure, tool cards, cross-links, and a
   chart where a visual makes the idea land. See `references/article-format.md`.
3. **Add them to the catalogue + a content chunk** — via the batch script.
   See `references/architecture.md`.
4. **Build + screenshot-verify** one article, then **ship** (commit → rebase
   onto main → PR → squash-merge). See `references/ship-workflow.md`.
5. **Hand back to the user for review.** They validate or comment; publish the
   validated ones (remove `status: "review"`) and revise the rest.

Read the relevant reference file before doing that step — they hold the exact
formats, file paths, and gotchas that make the difference between a build that
passes and one that doesn't.

## Titles come first, and they must be searched

This is the part that's easy to get wrong. A beautiful article with a title
nobody searches for is a tree falling in an empty forest. **Every title must be
built on a phrase real women actually type into a search bar** — "why am I so
tired all the time", "how to stop overthinking", "anxiety before period",
"signs of low iron" — and then shaped into something curious enough that she
can't not tap it. High search volume gets her *to* the page; curiosity gets her
*into* it. You need both, in that order.

`references/title-craft.md` is the heart of this skill — read it before naming
anything. Do not invent clever titles from imagination; start from search
demand and earn the cleverness on top.

## What makes a Bloomzein article good

- **A hook that opens a loop.** The first lines name a feeling she recognises
  ("You fall asleep just fine. That's the strange part.") and promise a reason
  she doesn't have yet. Every section should end pointing at the next.
- **One genuinely useful idea per section**, explained with *why*, not just
  what. She should finish feeling she understands her own body better.
- **Warm, premium, plain-spoken voice.** Short sentences. No jargon walls, no
  hype, no shame. Talk to her like a knowledgeable friend, not a brochure.
- **The tools appear as help, not ads.** A `@tool` card belongs where the reader
  would genuinely benefit ("track this alongside your cycle") — never bolted on.
- **It connects to the rest of the library.** One or two `@read` cross-links to
  related articles so one read becomes three (time-on-page is the whole game).
- **It can sell, honestly.** Shopping/aesthetic pieces implicitly recommend
  products via `@product` affiliate cards (with a required "affiliate"
  disclosure tag). Recommend only what genuinely helps, make the product the
  natural next step, and keep the article useful even if she buys nothing.
- **A chart when a visual truly helps.** Hormone curves, a sleep hypnogram, a
  monthly tracker — see the `@chart` directives. Don't force one.
- **The Bloom close.** Reflection → Tips → Today's Bloom → Reminder. This
  signature ending is what makes it feel like Bloomzein and not a blog.

## Cross-tool data contract (read before you invent numbers)

Bloomzein is premium: a number, phase, meal, or weight must be identical in
every tool that shows it. Articles rarely compute data, but if one references a
phase, a calorie figure, or a plan, it must match the app's canonical helpers —
never a private copy. The project's root `CLAUDE.md` is the authority; skim its
"Cross-tool data contract" section if an article starts asserting app data.

## Reference files

- `references/content-backlog.md` — the user's master topic list to work
  through in batches, with the category mapping for each topic group.
- `references/title-craft.md` — **read first.** The high-SEO + curiosity title
  system: how to source search demand, the title patterns that convert, the
  balance between searchable and beautiful, worked examples, and pitfalls.
- `references/article-format.md` — the body markdown dialect, the Bloom section
  structure, and the `@tool` / `@read` / `@chart` directives with the exact keys
  that exist.
- `references/architecture.md` — where articles live (catalogue vs. code-split
  bodies), the ID scheme, category registration, and the phase-tag contract.
- `references/ship-workflow.md` — build, screenshot-verify, and the exact
  git/PR/merge sequence, plus the review-and-publish loop.
- `scripts/new_batch.py` — a template generator that appends 5 bodies to a
  category content file and prints the catalogue entries to paste in. Copy it
  per batch and fill in the `ARTS` list.
