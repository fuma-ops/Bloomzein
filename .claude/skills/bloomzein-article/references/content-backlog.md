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

## Voice for this list

These are catchy, aspirational, list-and-how-to pieces — lighter than the
hormone/medical articles, but hold the same standards: a hook that opens a loop,
one idea per section, each section ending pointing at the next, and the full
Bloom close. The persuasion goal is real: the reader should finish *convinced*
and reach for a recommended product — so make the product genuinely the natural
next step, never a bolted-on ad. Keep the searchable phrase in the title (see
`title-craft.md`) even on the trend-driven ones.
