/**
 * Affiliate product catalogue for in-article `@product` cards.
 *
 * Bloomzein's stance: we're not here to make her click — we're here to help her
 * NOT waste money. Every product answers seven honest questions (below), and we
 * say plainly when something is optional, when the cheap version is enough, and
 * when she should try the free routine first. That honesty is exactly why she
 * trusts us when we DO recommend a buy.
 *
 * Monetisation plugs in via `href` (drop real affiliate URLs there; `#` for now).
 * Product names are real, well-regarded proposals — swap for your own partners.
 * The card always shows an "affiliate" tag; that disclosure is required (FTC).
 */
export interface AffiliateProduct {
  name: string;
  type: string;
  /** Short one-liner (simple-card fallback / collapsed lead). */
  blurb: string;
  href: string;
  image?: string;
  price?: string;
  // ── the seven honest questions ──
  solves?: string;   // 1. What problem does this solve?
  why?: string;      // 2. Why did Bloomzein choose it over similar products?
  bestFor?: string;  // 3. Who is it best for?
  notFor?: string;   // 4. Who might not like it?
  actives?: string;  // 5. What ingredients / materials make it effective?
  results?: string;  // 6. What results can you realistically expect, and when?
  cheaper?: string;  // 7. Is there a cheaper alternative that works nearly as well?
  /** Plain-spoken "should you even buy this" line — often "skip unless…". */
  verdict?: string;
}

export const PRODUCTS: Record<string, AffiliateProduct> = {
  // ── Skin / glow ──
  waterBottle: {
    name: "Half-Gallon Time-Marked Bottle", type: "Hydration", price: "$15–35",
    blurb: "Makes drinking water automatic — the cheapest glow there is.",
    solves: "Forgetting to drink water, which shows up as flat, tired-looking skin and low energy.",
    why: "A large, time-marked bottle turns hydration into a visual cue instead of willpower.",
    bestFor: "Anyone who reaches 4 p.m. having barely drunk anything.",
    notFor: "People who already hydrate well — you genuinely don't need a special bottle.",
    actives: "No magic: just visible volume and hourly time markers that nudge you.",
    results: "Steadier energy and plumper-looking skin within days of actually hitting your intake.",
    cheaper: "Any bottle or a jug on your desk works. The habit is the point, not the bottle.",
    verdict: "Honestly optional. Buy it only if a nicer bottle makes you actually drink — otherwise save your money.",
    href: "#",
  },
  iceRoller: {
    name: "Stainless-Steel Ice Roller", type: "Cooling tool", price: "$10–20",
    blurb: "Cold that de-puffs a tired morning face in 60 seconds.",
    solves: "Morning puffiness and a dull, half-awake face.",
    why: "Cold triggers vasoconstriction — it shrinks the vessels behind puffiness fast, and a steel roller stays cold far longer than your hands.",
    bestFor: "Puffy-in-the-morning faces, allergy/sinus mornings, tired eyes.",
    notFor: "Rosacea or cold-sensitive skin — extreme cold can flare it.",
    actives: "Just cold plus gentle massage to move lymph fluid.",
    results: "Instant de-puff for a few hours. It's a temporary lift, not a permanent change.",
    cheaper: "A splash of cold water, or a spoon left in the fridge, gets ~80% of it for free.",
    verdict: "A nice-to-have, not a need. Skip it unless you're genuinely puffy most mornings.",
    href: "#",
  },
  guaSha: {
    name: "Gua Sha Stone", type: "Facial massage", price: "$12–25",
    blurb: "A calming ritual that drains puffiness and eases jaw tension.",
    solves: "Puffiness, held tension, and that 'my face looks tired' feeling.",
    why: "A weighted stone sweeps lymph toward drainage points with more control than fingers — and doubles as a calming ritual.",
    bestFor: "Puffy or tense faces, and people who enjoy a slow ritual.",
    notFor: "Active acne or rosacea, or anyone expecting 'sculpting' miracles — the lift is temporary.",
    actives: "Jade or rose-quartz stone + a facial oil for slip. It's technique, not ingredients.",
    results: "A temporary de-puff and relaxed jaw; consistency gives a subtle refresh, not a new face shape.",
    cheaper: "Your clean fingers do most of it for free — the stone is mostly reach and ritual.",
    verdict: "Buy it for the ritual, not for 'sculpting'. Skip if you won't use it consistently.",
    href: "#",
  },
  vitcSerum: {
    name: "La Roche-Posay Pure Vitamin C10", type: "Brightening serum", price: "~$40",
    blurb: "Stable 10% vitamin C that brightens and defends — pharmacy-priced.",
    solves: "Dullness, uneven tone, and early sun/pollution damage.",
    why: "We picked it for a stable 10% pure vitamin C with vitamin E and salicylic acid — effective, well-studied, and priced like a pharmacy product, not a luxury markup.",
    bestFor: "Dull or uneven skin that tolerates actives; most normal-to-oily types.",
    notFor: "Very sensitive or reactive skin — patch-test and start slow; vitamin C can sting.",
    actives: "10% L-ascorbic acid (antioxidant + brightening), vitamin E, salicylic acid (gentle smoothing).",
    results: "Brighter, more even tone in roughly 4–8 weeks of daily morning use. Not overnight.",
    cheaper: "The Ordinary Ascorbic Acid 8% (~$12) gets most of the benefit if you don't mind a grittier feel.",
    verdict: "Worth it if dullness bothers you — but do two weeks of just cleanse + SPF first; sometimes that's already enough.",
    href: "#",
  },
  moisturizer: {
    name: "CeraVe Moisturising Cream", type: "Moisturiser", price: "~$16",
    blurb: "Ceramides + hyaluronic acid that rebuild the barrier — for a coffee's price.",
    solves: "Tight, dehydrated skin and a weak barrier that goes red or flaky.",
    why: "One of the best-value products in all of skincare — three ceramides and hyaluronic acid, developed with dermatologists, for the price of a coffee round.",
    bestFor: "Normal, dry, or sensitive skin, and anyone whose barrier feels compromised.",
    notFor: "Very oily or acne-prone skin may find the cream rich — use the lotion version instead.",
    actives: "Ceramides 1/3/6-II (barrier repair) + hyaluronic acid (hydration) + slow-release MVE tech.",
    results: "Calmer, less-tight skin within days; a visibly stronger barrier over a few weeks.",
    cheaper: "This IS the cheap option that outperforms most luxury creams — don't upgrade unless you just want a nicer texture.",
    verdict: "One of the few near-universal buys. If you get a single product from this list, get this.",
    href: "#",
  },
  spf: {
    name: "Beauty of Joseon Relief Sun SPF50+", type: "Sunscreen", price: "~$18",
    blurb: "High protection, zero white cast — an SPF you'll actually re-wear.",
    solves: "Daily UV — the #1 cause of dullness, dark spots and ageing — without a greasy white cast.",
    why: "High protection in a lightweight, elegant formula people actually re-wear, at a fraction of luxury SPF prices.",
    bestFor: "Normal to dry skin; anyone who hates heavy or chalky sunscreens.",
    notFor: "Very oily skin may prefer a mattifying SPF; fragrance-sensitive skin should check the scent.",
    actives: "Broad-spectrum filters + niacinamide (calming, tone) + rice extract (soothing).",
    results: "Protection is immediate; the long game is skin that stays clearer and ages slower with daily use.",
    cheaper: "Any broad-spectrum SPF30+ you'll actually reapply beats a fancy one you skip.",
    verdict: "Non-negotiable to wear daily — but the brand matters far less than the habit. Buy the texture you'll never skip.",
    href: "#",
  },
  lipBalm: {
    name: "Laneige Lip Glowy Balm", type: "Lip care", price: "~$18",
    blurb: "A cult butter-rich balm with a your-lips-but-better sheen.",
    solves: "Dry, dull lips and the 'my-lips-but-better' finish without makeup.",
    why: "A cult balm that genuinely lasts — butter-rich and glossy without being sticky.",
    bestFor: "Anyone wanting care plus a soft sheen in one step; a bare-face finisher.",
    notFor: "People who dislike any shine, or want real pigment — this is sheer.",
    actives: "Murumuru + shea butter (occlusive moisture) + an antioxidant berry complex.",
    results: "Softer, glossier lips immediately; less chapping with regular use.",
    cheaper: "Vaseline or a $5 shea balm hydrates just as well — you're paying for the finish and feel.",
    verdict: "A treat, not a need. Lovely if you'll use it daily; a basic balm does the healing for less.",
    href: "#",
  },

  // ── Ritual / body ──
  silkPillow: {
    name: "Mulberry Silk Pillowcase", type: "Sleep & hair", price: "$20–60",
    blurb: "Less frizz and fewer creases — the habit that works while you sleep.",
    solves: "Morning frizz, sleep creases, and hair breakage from friction.",
    why: "Real mulberry silk lowers friction and pulls less moisture from skin and hair than cotton — a passive habit that works while you sleep.",
    bestFor: "Frizz-prone or curly hair, dry skin, anyone chasing fewer morning creases.",
    notFor: "People who run hot at night — silk is less breathable; satin sleeps cooler.",
    actives: "Mulberry silk, low-friction and moisture-retaining. Momme 19–25 is the durable sweet spot.",
    results: "Less frizz and fewer face creases from the first night; less breakage over weeks.",
    cheaper: "A polyester satin pillowcase (~$8) gives most of the friction benefit, minus silk's skin/temperature perks.",
    verdict: "Worth it if frizz or creases bug you. Try satin first — it's a cheap way to test the idea.",
    href: "#",
  },
  tongueScraper: {
    name: "Copper Tongue Scraper", type: "Oral care", price: "~$8",
    blurb: "The 10-second fix for morning breath brushing misses.",
    solves: "Morning breath and the film a toothbrush leaves behind on the tongue.",
    why: "A copper scraper removes the bacterial coating that causes most bad breath — something brushing does poorly.",
    bestFor: "Anyone wanting genuinely fresh breath; coffee and garlic lovers.",
    notFor: "Nobody, really — it's a small nicety, not life-changing.",
    actives: "Physical removal; copper is mildly antibacterial.",
    results: "Fresher breath and a cleaner-feeling mouth from day one.",
    cheaper: "The edge of a spoon works in a pinch; a $3 plastic scraper is fine too.",
    verdict: "Cheap and genuinely useful — one of the few small buys that just works.",
    href: "#",
  },
  bodyLotion: {
    name: "Nourishing Body Lotion", type: "Body care", price: "$10–20",
    blurb: "The base layer that makes any fragrance last hours longer.",
    solves: "Dry skin, and fragrance that fades by lunchtime.",
    why: "Moisturised skin holds scent far longer, so a good lotion is the base that makes any fragrance last.",
    bestFor: "Anyone with dry skin, or whose perfume disappears fast.",
    notFor: "Nobody, really — just match the richness to your skin.",
    actives: "Emollients + humectants (glycerin, shea). An unscented base layers cleanest under perfume.",
    results: "Softer skin immediately; noticeably longer-lasting fragrance.",
    cheaper: "A big tub of a basic cream (CeraVe / Nivea) does this for less than boutique lotions.",
    verdict: "The base layer is worth it, but the cheap tub works — save your money for the scent on top.",
    href: "#",
  },

  // ── Fragrance ──
  cleanPerfume: {
    name: "Clean Musk Eau de Parfum", type: "Fragrance", price: "varies",
    blurb: "The freshly-showered skin scent — soft, close, never loud.",
    solves: "Wanting to smell expensive-clean without a loud, cloying perfume.",
    why: "We lean to soft 'skin scent' musks — clean cotton, subtle warmth — that read as freshly showered rather than perfumed.",
    bestFor: "Anyone wanting a signature clean scent for everyday and the office.",
    notFor: "People who want a bold, long-lasting statement scent — skin musks are quiet by design.",
    actives: "Clean musks + cotton/soft-vanilla notes. Look for 'musk', 'cotton', 'skin' in the notes.",
    results: "A soft, close scent that lasts a few hours; reapply midday.",
    cheaper: "Clean-musk body sprays and dupes get ~90% of the effect for a fraction of designer prices.",
    verdict: "Don't overspend here — clean musks are one category where affordable versions genuinely rival designer.",
    href: "#",
  },
  hairMist: {
    name: "Hair & Body Mist", type: "Fragrance", price: "$15–30",
    blurb: "A light veil for a soft, all-day scent trail you can refresh.",
    solves: "Wanting scent that lasts all day without over-applying perfume to skin.",
    why: "Hair holds fragrance longer than skin, so a light mist gives a soft, all-day trail you can refresh.",
    bestFor: "Anyone wanting a subtle scent halo; people sensitive to strong perfume on skin.",
    notFor: "Dry or damaged hair — choose an alcohol-free mist to avoid drying it out.",
    actives: "Light fragrance in a hair-friendly, ideally alcohol-free conditioning base.",
    results: "A soft scent that lingers as you move; re-mist as needed.",
    cheaper: "Spritz your regular perfume onto your hairbrush (not directly) — a near-free version of the same trick.",
    verdict: "A lovely extra, not essential. Try the hairbrush trick before buying a dedicated mist.",
    href: "#",
  },

  // ── Hair ──
  clawClip: {
    name: "Matte Claw Clip", type: "Hair accessory", price: "$10–18",
    blurb: "The five-second effortless half-up that holds all day.",
    solves: "An effortless half-up or updo in seconds, with no heat or skill.",
    why: "A quality matte clip with real grip holds thick hair all day where cheap ones slip or snap.",
    bestFor: "Medium-to-thick hair; anyone wanting a five-second done look.",
    notFor: "Very fine or short hair may slip out — smaller clips work better.",
    actives: "A sturdy hinge + matte finish (which reads pricier than glossy plastic).",
    results: "Instant polished-casual style; all-day hold when sized to your hair.",
    cheaper: "Drugstore claw clips (~$4) work fine — you're mostly paying for finish and durability.",
    verdict: "You don't need the viral expensive brand. A sturdy $5 matte clip does the same job.",
    href: "#",
  },
  silkScrunchie: {
    name: "Silk Scrunchie", type: "Hair accessory", price: "$8–15",
    blurb: "Holds a ponytail without the crease or the breakage.",
    solves: "Ponytail creases and breakage from tight elastics.",
    why: "Silk glides instead of gripping, so it holds without denting or snapping hair.",
    bestFor: "Anyone who wears ponytails and buns; fragile or long hair.",
    notFor: "Very heavy hair may need a sturdier tie for a high, tight pony.",
    actives: "Mulberry silk over a soft elastic — low friction.",
    results: "No crease and less breakage from the very first use.",
    cheaper: "Satin scrunchies (~$3) give nearly the same friction benefit.",
    verdict: "Cheap either way — get satin if silk feels indulgent; both beat a snapping elastic.",
    href: "#",
  },
  slickKit: {
    name: "Edge Brush & Light-Hold Gel", type: "Hair styling", price: "~$15",
    blurb: "A clean, sleek finish with no crunch and no flyaways.",
    solves: "Flyaways and frizz when you want a sleek bun or pony.",
    why: "A fine boar-bristle brush plus a light gel smooths edges without the crunch or grease.",
    bestFor: "Anyone doing sleek-back styles; frizz-prone hair.",
    notFor: "Very curly hair may prefer a dedicated edge control; some gels flake if over-applied.",
    actives: "Boar bristle (smoothing) + a light-hold, non-flaking gel.",
    results: "A clean, sleek finish that lasts the day; flyaways tamed.",
    cheaper: "A clean toothbrush + a pea of any gel you own does the edges for basically free.",
    verdict: "The toothbrush trick genuinely works — only buy the kit if you do sleek styles often.",
    href: "#",
  },

  // ── Jewelry ──
  goldHoops: {
    name: "Gold Vermeil Huggie Hoops", type: "Jewelry", price: "$30–60",
    blurb: "The everyday hoop that elevates everything and never comes off.",
    solves: "The everyday earring that elevates any outfit and never needs taking off.",
    why: "Gold vermeil (thick gold over silver) resists tarnish and skin reactions far better than cheap plated brass, at a fraction of solid gold.",
    bestFor: "Daily wear, sensitive ears, and a capsule-jewellery starter.",
    notFor: "Anyone wanting an heirloom — vermeil wears over years, unlike solid gold.",
    actives: "Materials: 14k+ gold vermeil over sterling silver (2.5µm+ plating is the durable spec).",
    results: "A polished everyday look; vermeil holds up 1–3+ years of daily wear with care.",
    cheaper: "Stainless-steel gold-tone hoops (~$12) resist tarnish too, just with less warmth of colour.",
    verdict: "Vermeil is the sweet spot. Skip solid gold unless you want an heirloom; skip cheap plating that'll turn green.",
    href: "#",
  },
  daintyNecklace: {
    name: "Fine Gold Vermeil Chain", type: "Jewelry", price: "$35–70",
    blurb: "The delicate chain that quietly elevates a bare neckline.",
    solves: "The delicate finishing piece for a bare neckline, and effortless layering.",
    why: "A fine vermeil chain gives the quiet-luxury look without tarnishing green like cheap plate.",
    bestFor: "Minimal, everyday layering; sensitive skin.",
    notFor: "Anyone wanting a bold statement — this is deliberately subtle.",
    actives: "Gold vermeil over sterling; an adjustable length layers best.",
    results: "An instantly more 'finished' look; durable with off-in-the-shower care.",
    cheaper: "Gold-filled chains (~$15) are actually MORE durable than vermeil for less — the smart-money pick.",
    verdict: "Go gold-filled if you want maximum longevity for minimum spend; vermeil for a slightly finer look.",
    href: "#",
  },
  tennisBracelet: {
    name: "Fine CZ Tennis Bracelet", type: "Jewelry", price: "$25–80",
    blurb: "A thread of everyday sparkle that reads expensive, not costume.",
    solves: "A thread of everyday sparkle that reads expensive, not costume.",
    why: "A slim, well-set cubic-zirconia line gives the diamond-tennis look for a tiny fraction of the price.",
    bestFor: "Everyday elegance; dressing up a simple outfit.",
    notFor: "Anyone rough with jewellery — fine settings need care, and CZ isn't a diamond investment.",
    actives: "CZ stones in a gold-tone or silver setting; prong-set looks more real than cheap channel-set.",
    results: "An instant 'quietly rich' finish; lasts years with gentle wear.",
    cheaper: "A single fine chain bracelet (~$15) gives understated shine if a full tennis bracelet feels like a lot.",
    verdict: "Lovely and cheap for the look — just don't expect fine-jewellery durability at this price.",
    href: "#",
  },
  watch: {
    name: "Minimalist Mesh-Strap Watch", type: "Watch", price: "$60–150",
    blurb: "A slim, elegant watch that anchors the wrist and layers with a bracelet.",
    solves: "A bare, undefined wrist — a watch counts as jewellery and instantly reads 'put together'.",
    why: "A slim minimalist watch on a mesh or fine-link strap looks elegant, layers beautifully with a delicate bracelet, and quartz keeps it accurate with zero fuss.",
    bestFor: "Anyone who wants one wrist to look intentional, and likes function with the style.",
    notFor: "Anyone after an investment or heirloom watch — that's a completely different budget.",
    actives: "Quartz movement (accurate, low-maintenance); slim case, clean face, stainless-steel or mesh strap.",
    results: "An instantly more polished wrist; a decent quartz watch lasts years.",
    cheaper: "Fashion-brand quartz watches (Cluse / Daniel Wellington style, ~$60) or a vintage find give the same look for far less.",
    verdict: "Buy the look, not the label — a $60 minimalist quartz reads just as elegant as one ten times the price.",
    href: "#",
  },
  ring: {
    name: "Fine Gold Stacking Ring", type: "Jewelry", price: "$20–50",
    blurb: "A delicate everyday ring — the signature detail on your hands.",
    solves: "Bare, unfinished hands — a fine ring adds quiet character and becomes a signature.",
    why: "A slim gold band or small signet reads considered without shouting, and a skin-safe metal means you can wear it every day.",
    bestFor: "Anyone wanting one everyday ring, and stackers who like to build a hand over time.",
    notFor: "People rough on their hands (gym, cleaning) — fine rings scratch and bend.",
    actives: "Solid gold, vermeil, or gold-filled for daily wear; avoid cheap plate that discolours fingers.",
    results: "An instantly more considered hand; a piece you'll reach for daily for years.",
    cheaper: "Gold-filled stacking rings (~$15) wear beautifully for a fraction of solid gold.",
    verdict: "One fine ring you love beats a handful of trend rings — buy slowly, buy skin-safe.",
    href: "#",
  },
  signatureBracelet: {
    name: "Signature Fine Bracelet", type: "Jewelry", price: "$30–90",
    blurb: "One distinctive piece for your right wrist — your quiet signature.",
    solves: "Wanting one personal, non-matchy piece that feels like *you*, not a generic set.",
    why: "While your left wrist wears the watch, the right wears one distinctive fine bracelet — a bezel-set stone, a charm, an engraved bangle — that becomes your quiet signature.",
    bestFor: "Anyone who wants a personal, characterful piece; lovely as a gift-to-self.",
    notFor: "True minimalists who prefer a bare right hand — this is optional character, not a rule.",
    actives: "Skin-safe metal (vermeil / gold-filled / solid) plus one unique detail — a birthstone, an initial, a texture — that makes it yours.",
    results: "A wrist that feels personal rather than generic; a piece you rarely take off.",
    cheaper: "A gold-filled charm bracelet or a fine engraved bangle (~$25) carries the same signature feeling.",
    verdict: "The one place to let personality beat the 'rules' — pick what feels like you, at any budget.",
    href: "#",
  },
  hypoStuds: {
    name: "Titanium Hypoallergenic Studs", type: "Jewelry", price: "$15–40",
    blurb: "Sensitive-ear friendly studs you can wear (even sleep in) forever.",
    solves: "Earrings you can wear every day — even sleep in — without irritation or green lobes.",
    why: "Implant-grade titanium avoids the nickel that causes most sensitive-ear reactions.",
    bestFor: "Sensitive ears, and people who never want to take earrings out.",
    notFor: "Anyone wanting a bold look — these are deliberately tiny and plain.",
    actives: "Materials: surgical/implant-grade titanium (nickel-free) or solid 14k gold.",
    results: "All-day and overnight comfort with no reaction; effectively permanent wear.",
    cheaper: "Titanium studs (~$12) ARE the cheapest truly hypoallergenic option — even safer than gold plate for reactive ears.",
    verdict: "If your ears react to everything, titanium is the honest best buy — cheaper and safer than gold plate.",
    href: "#",
  },
};
