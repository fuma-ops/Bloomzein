import { useState } from "react";
import { ShoppingBag, ArrowRight, ChevronDown, Check, Wallet } from "lucide-react";
import type { AffiliateProduct } from "@/lib/affiliateProducts";

/**
 * The Bloomzein product card — an *honest review*, not an ad.
 *
 * Collapsed, it shows what the product solves and a plain-spoken verdict (often
 * "you don't need this unless…"). Expanded, it answers the seven questions every
 * recommendation should answer: what it solves, why we chose it, who it's for,
 * who won't like it, the actives, realistic results + timeframe, and the cheaper
 * alternative. The goal is to help her *not waste money* — which is exactly why
 * she trusts the recommendation when we do make one.
 *
 * Products with the structured review fields render this rich card; anything
 * still on the simple `blurb` model renders the compact fallback.
 */
export function ProductCard({ product, lead }: { product: AffiliateProduct; lead?: string }) {
  const [open, setOpen] = useState(false);
  const rich = !!(product.solves || product.why || product.actives);

  const Shell = ({ children }: { children: React.ReactNode }) => (
    <div className="my-6 overflow-hidden rounded-[1.4rem] border border-amber-300/50 bg-gradient-to-br from-amber-50/80 via-white/85 to-rose-50/50 backdrop-blur shadow-[0_14px_34px_-18px_oklch(0.7_0.12_70/0.5)]">
      {children}
    </div>
  );

  const Tile = () => (
    <span className="relative grid h-16 w-16 sm:h-[4.5rem] sm:w-[4.5rem] shrink-0 place-items-center overflow-hidden rounded-[1.1rem] bg-gradient-to-br from-amber-100 to-rose-100 shadow-md shadow-amber-200/40">
      {product.image ? (
        <img src={product.image} alt="" className="h-full w-full object-cover" loading="lazy" referrerPolicy="no-referrer" />
      ) : (
        <ShoppingBag className="h-7 w-7 text-amber-500" strokeWidth={1.6} />
      )}
    </span>
  );

  const ShopLink = () => (
    <a
      href={product.href}
      target="_blank"
      rel="nofollow sponsored noopener noreferrer"
      className="mt-1 inline-flex items-center gap-1 text-[11px] font-bold text-amber-600 opacity-90 transition hover:opacity-100"
    >
      Shop{product.price ? ` · ${product.price}` : ""} <ArrowRight className="h-3 w-3" strokeWidth={2.4} />
    </a>
  );

  // Simple fallback for products without the honest-review fields yet.
  if (!rich) {
    return (
      <Shell>
        <a href={product.href} target="_blank" rel="nofollow sponsored noopener noreferrer" className="group flex items-stretch gap-3.5 p-2.5 sm:p-3">
          <Tile />
          <span className="flex min-w-0 flex-1 flex-col justify-center py-0.5">
            <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-[0.14em] text-amber-600/80">
              {product.type}
              <span className="ml-1 rounded-full bg-amber-100 px-1.5 py-px text-[8px] font-semibold uppercase tracking-wide text-amber-600/90">affiliate</span>
            </span>
            <span className="mt-0.5 block text-[14px] sm:text-[15px] font-semibold text-rose leading-snug">{product.name}</span>
            <span className="mt-0.5 block text-[12px] text-rose/70 leading-snug">{lead || product.blurb}</span>
            <span className="mt-1 inline-flex items-center gap-1 text-[11px] font-bold text-amber-600 opacity-90">
              Shop <ArrowRight className="h-3 w-3" strokeWidth={2.4} />
            </span>
          </span>
        </a>
      </Shell>
    );
  }

  const Row = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <div className="grid grid-cols-[5.5rem_1fr] gap-2 py-1.5">
      <span className="text-[10px] font-bold uppercase tracking-[0.1em] text-amber-600/80 pt-0.5">{label}</span>
      <span className="text-[12.5px] leading-6 text-rose/85">{children}</span>
    </div>
  );

  return (
    <Shell>
      {/* header — always visible */}
      <div className="flex items-stretch gap-3.5 p-2.5 sm:p-3">
        <Tile />
        <div className="flex min-w-0 flex-1 flex-col justify-center py-0.5">
          <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-[0.14em] text-amber-600/80">
            {product.type}
            <span className="ml-1 rounded-full bg-amber-100 px-1.5 py-px text-[8px] font-semibold uppercase tracking-wide text-amber-600/90">affiliate</span>
          </span>
          <span className="mt-0.5 block text-[14px] sm:text-[15px] font-semibold text-rose leading-snug">{product.name}</span>
          {product.solves && <span className="mt-0.5 block text-[12px] text-rose/70 leading-snug">{product.solves}</span>}
          <ShopLink />
        </div>
      </div>

      {/* honest verdict — the "should you even buy this" line */}
      {product.verdict && (
        <div className="mx-2.5 mb-2 flex items-start gap-1.5 rounded-xl bg-amber-100/50 px-3 py-2 sm:mx-3">
          <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600" strokeWidth={2.4} />
          <span className="text-[12px] font-medium leading-5 text-rose/85">{product.verdict}</span>
        </div>
      )}

      {/* expander */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-center gap-1 border-t border-amber-200/50 py-2 text-[11px] font-bold uppercase tracking-wide text-amber-600/90 transition hover:bg-amber-50/60"
      >
        {open ? "Hide the details" : "The honest word"}
        <ChevronDown className={["h-3.5 w-3.5 transition-transform", open ? "rotate-180" : ""].join(" ")} strokeWidth={2.4} />
      </button>

      {open && (
        <div className="border-t border-amber-200/50 px-3 pb-3 pt-1 sm:px-4">
          {product.solves && <Row label="Solves">{product.solves}</Row>}
          {product.why && <Row label="Why this">{product.why}</Row>}
          {product.bestFor && <Row label="Best for">{product.bestFor}</Row>}
          {product.notFor && <Row label="Not for">{product.notFor}</Row>}
          {product.actives && <Row label="What works">{product.actives}</Row>}
          {product.results && <Row label="Expect">{product.results}</Row>}
          {product.cheaper && (
            <div className="mt-1.5 flex items-start gap-1.5 rounded-xl bg-rose-50/70 px-3 py-2">
              <Wallet className="mt-0.5 h-3.5 w-3.5 shrink-0 text-rose/70" strokeWidth={2} />
              <span className="text-[12px] leading-5 text-rose/85"><span className="font-semibold">Cheaper option:</span> {product.cheaper}</span>
            </div>
          )}
        </div>
      )}
    </Shell>
  );
}

export default ProductCard;
