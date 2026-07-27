# Content backlog — the topic list to work through

The user supplied a master list of high-search, high-curiosity titles to
produce in batches of 5. Work through it, one batch (usually one topic group)
at a time, in `status: "review"`. These are shopping-and-aesthetic oriented, so
most carry implicit `@product` affiliate cards (see `article-format.md`).

## Category mapping (decided with the user)

The list's topics map onto the app taxonomy like this — **new** trend
categories get their own browse filter; the rest fold into existing ones:

| List topic | App category |
|------------|--------------|
| Clean Girl | **Clean Girl** (new) |
| Quiet Luxury | **Quiet Luxury** (new) |
| Fashion | **Fashion** (new) |
| Fragrance, Body Care, Hair, Makeup, Nails | Beauty |
| Dating | Relationships |
| Lifestyle, Wellness | Lifestyle |

Add a new category only when you're about to publish its first batch (so no
empty filters appear): extend `CATEGORIES`, `CAT_IMG`, and the Read page's
`FILTER_ICONS` (all exhaustive `Record<Category,…>` maps), then create the
content chunk + loader. Pick a 2-letter ID prefix — used so far: `CG`=Clean
Girl. Suggested: `QL`=Quiet Luxury, `FA`=Fashion.

## The list

**Fragrance** (→ Beauty): How to Make Your Perfume Last All Day · How to Smell
Expensive Without Buying Luxury Perfume · Why Your Perfume Disappears After One
Hour

**Body Care** (→ Beauty): How to Avoid Strawberry Legs Forever · The Correct Way
to Shave Without Razor Bumps · How to Prevent Ingrown Hairs Naturally · Why Your
Underarms Stay Dark (And What Actually Helps)

**Clean Girl** ✅ *(batch 7 — CG001–CG005, published/​in review)*: The Clean Girl
Morning Routine Everyone Is Copying · 15 Habits Every Clean Girl Does Every Day
· How to Smell Like a Clean Girl · The Hairstyles Every Clean Girl Loves · The
Jewelry Every Clean Girl Owns

**Quiet Luxury** (→ new): How to Look Expensive Without Spending More · The
Colors That Always Look Luxurious · The Fabrics That Instantly Upgrade Any
Outfit · The Quiet Luxury Checklist Every Woman Needs

**Fashion** (→ new): 10 Pieces Every Woman's Closet Should Include · How to
Match Colors Like a Stylist · Silver or Gold? Which Looks Better on Your Skin? ·
How to Wear Accessories Without Looking Overdone · The Rule That Makes Every
Outfit Look More Expensive · How to Build a Capsule Wardrobe You'll Actually Wear

**Hair** (→ Beauty): Which Haircut Fits Your Face Shape? · What Hair Color
Matches Your Skin Tone? · How to Make Thin Hair Look Thicker · The Hair Wash
Routine Hairdressers Recommend

**Makeup** (→ Beauty): The Correct Order for Your Skincare Products · The
Foundation Shade Most Women Get Wrong · The Lip Color That Makes Your Teeth Look
Whiter · The One Makeup Mistake That Makes You Look Older

**Nails** (→ Beauty): How to Match Your Nails With Every Outfit · Which Nail
Color Makes Your Hands Look Younger?

**Dating** (→ Relationships): How to Prepare for a First Date · What to Wear on a
First Date · The Small Details People Notice First About You · First Date Beauty
Timeline: 24 Hours Before

**Lifestyle** (→ Lifestyle): The Everything Shower Checklist · The Glow-Up
Checklist Before Any Big Event · The Secret to Always Smelling Fresh · The Beauty
Routine Before Vacation Photos

**Wellness** (→ Lifestyle): Why Some Women Always Look Put Together · The Glow-Up
Timeline: What Actually Changes in 30 Days · The Morning Habits That Make You
Look More Attractive · How to Wake Up Looking Fresh Every Morning

## Voice for this list — write it so she *feels* it

A reader gave the first draft of these a "0" and told us exactly why, and it's
the most important guidance in this file. These aspirational/beauty pieces live
or die on immersion, not information. Hold to this:

- **Open with a vivid, sensory portrait, not a thesis.** Make her *long* to be
  the girl in the article. Describe what she smells like, how her skin looks,
  the calm she moves with — second person, present, cinematic. The reader should
  want to step into the scene. (CG001's opening is the reference standard.)
- **Give a real secret.** Not "drink water, use SPF". A genuine insight she
  hasn't heard — e.g. *the effortless morning is built the night before.* If the
  article reveals nothing, it fails.
- **Describe the sensation of every step**, so reading it feels like living it.
  Warmth, scent, texture, the feeling of being cared-for. This is where the
  persuasion actually happens — she buys the *feeling*, and the products follow.
- **Stay tightly on the one topic.** A "morning routine" article is about the
  morning (and the night-before prep, the weekly reset) — not general skincare.
  Push adjacent topics out to sister articles with `@read`.
- **Products stay implicit in the body; all `@product` cards go in one closing
  "Edit".** See `article-format.md`. Peppering cards through the body is exactly
  what earned the "0".
- Still keep the searchable title (`title-craft.md`) and the Bloom close.
