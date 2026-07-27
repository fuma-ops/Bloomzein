/**
 * Affiliate product catalogue for in-article `@product` cards.
 *
 * Articles recommend a product *type* persuasively; the card shows the name,
 * a one-line reason, and a "Shop" button. Monetisation plugs in here: drop your
 * real affiliate URLs (Amazon Associates, brand programs, …) into each `href`.
 * Until then they point to "#", so nothing 404s and the cards render fully.
 *
 * The card always shows a small "affiliate" tag — that disclosure is required
 * (FTC) and, done softly, it reads as honesty rather than a hard sell. Don't
 * remove it.
 *
 * To add a product: give it a stable key and fill the fields. Reference it from
 * an article body with:  @product <key> | one persuasive line (optional)
 * If the line is omitted, `blurb` is used.
 */
export interface AffiliateProduct {
  /** Short product name, shown bold. */
  name: string;
  /** Small eyebrow label — the product *type*, e.g. "Vitamin C Serum". */
  type: string;
  /** One-line why-it's-worth-it, used when the @product line gives no text. */
  blurb: string;
  /** Affiliate link. Replace "#" with your real tagged URL. */
  href: string;
  /** Optional product image (URL or data URI). Falls back to a shop-icon tile. */
  image?: string;
}

export const PRODUCTS: Record<string, AffiliateProduct> = {
  // ── Skin / glow ──
  iceRoller:     { name: "Facial Ice Roller",        type: "Cooling tool",     blurb: "De-puffs and wakes tired skin in 60 seconds flat.", href: "#" },
  guaSha:        { name: "Gua Sha Stone",            type: "Facial massage",   blurb: "Two minutes of sculpting that drains overnight puffiness.", href: "#" },
  vitcSerum:     { name: "Vitamin C Serum",          type: "Brightening serum",blurb: "The lit-from-within step most routines quietly skip.", href: "#" },
  spf:           { name: "Invisible Daily SPF",      type: "Sunscreen",        blurb: "The one anti-ageing step dermatologists agree on — weightless, no white cast.", href: "#" },
  lipBalm:       { name: "Tinted Lip Balm",          type: "Lip care",         blurb: "Your-lips-but-better colour that never looks like effort.", href: "#" },

  // ── Ritual / body ──
  waterBottle:   { name: "Half-Gallon Water Bottle", type: "Hydration",        blurb: "The clean-girl accessory that actually earns its place.", href: "#" },
  silkPillow:    { name: "Silk Pillowcase",          type: "Sleep & hair",     blurb: "Fewer creases, less frizz, kinder to skin while you sleep.", href: "#" },
  tongueScraper: { name: "Tongue Scraper",           type: "Oral care",        blurb: "The 10-second ritual behind genuinely fresh breath.", href: "#" },
  bodyLotion:    { name: "Nourishing Body Lotion",   type: "Body care",        blurb: "Layer under fragrance and your scent lasts hours longer.", href: "#" },

  // ── Fragrance ──
  cleanPerfume:  { name: "Clean Eau de Parfum",      type: "Fragrance",        blurb: "Soft musk and clean cotton — the freshly-showered skin scent.", href: "#" },
  hairMist:      { name: "Hair & Body Mist",         type: "Fragrance",        blurb: "A light veil you can re-spritz all day without overwhelming.", href: "#" },

  // ── Hair ──
  clawClip:      { name: "Matte Claw Clip",          type: "Hair accessory",   blurb: "The effortless half-up twist in a single click.", href: "#" },
  silkScrunchie: { name: "Silk Scrunchie",           type: "Hair accessory",   blurb: "Holds all day without the crease or the breakage.", href: "#" },
  slickKit:      { name: "Slick-Back Brush & Gel",   type: "Hair styling",     blurb: "The clean, sleek bun — minus the flyaways.", href: "#" },

  // ── Jewelry ──
  goldHoops:     { name: "Gold Huggie Hoops",        type: "Jewelry",          blurb: "The everyday hoop that quietly goes with everything.", href: "#" },
  daintyNecklace:{ name: "Dainty Layering Necklace", type: "Jewelry",          blurb: "The delicate chain that elevates a bare neckline.", href: "#" },
  tennisBracelet:{ name: "Tennis Bracelet",          type: "Jewelry",          blurb: "A thread of sparkle that reads quietly expensive.", href: "#" },
  hypoStuds:     { name: "Hypoallergenic Studs",     type: "Jewelry",          blurb: "Sensitive-ear friendly, and they never turn your lobes green.", href: "#" },
};
