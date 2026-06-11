import { useEffect, useMemo, useState } from "react";
import {
  Search, ShoppingBag, Heart, Star, Plus, Minus, X, ArrowRight, Sparkles,
  Flower2, Gift, Percent, Crown,
} from "lucide-react";
import { BloomBubbles } from "@/components/bloom/BloomBubbles";

/* ---------- data ---------- */
type CatKey = "all" | "selfcare" | "beauty" | "cycle" | "active" | "accessories" | "premium";

const CATEGORIES: { key: Exclude<CatKey, "all">; label: string; img: string }[] = [
  { key: "selfcare",    label: "Self-care",   img: "/images/shop-cat-selfcare.jpg" },
  { key: "beauty",      label: "Beauty",      img: "/images/shop-cat-beauty.jpg" },
  { key: "cycle",       label: "Cycle Care",  img: "/images/shop-cat-cycle.jpg" },
  { key: "active",      label: "Activewear",  img: "/images/shop-cat-active.jpg" },
  { key: "accessories", label: "Accessories", img: "/images/shop-cat-accessories.jpg" },
  { key: "premium",     label: "Premium",     img: "/images/shop-cat-premium.jpg" },
];

interface Product {
  id: string;
  name: string;
  price: number;
  rating: number;
  cat: Exclude<CatKey, "all">;
  img: string;
  bestseller?: boolean;
}

const PRODUCTS: Product[] = [
  { id: "candle",   name: "Rose Glow Candle",    price: 28,  rating: 4.9, cat: "selfcare",    img: "/images/shop-p-candle.jpg",   bestseller: true },
  { id: "mask",     name: "Silk Sleep Mask",     price: 22,  rating: 4.8, cat: "selfcare",    img: "/images/shop-p-mask.jpg" },
  { id: "gloss",    name: "Pillow Lip Gloss",    price: 18,  rating: 4.7, cat: "beauty",      img: "/images/shop-p-gloss.jpg",    bestseller: true },
  { id: "serum",    name: "Rose Petal Serum",    price: 42,  rating: 4.9, cat: "beauty",      img: "/images/shop-p-serum.jpg" },
  { id: "heat",     name: "Cozy Heat Wrap",      price: 36,  rating: 4.8, cat: "cycle",       img: "/images/shop-p-heat.jpg",     bestseller: true },
  { id: "bottle",   name: "Bloom Water Bottle",  price: 24,  rating: 4.6, cat: "active",      img: "/images/shop-p-bottle.jpg" },
  { id: "leggings", name: "Soft Glow Leggings",  price: 58,  rating: 4.9, cat: "active",      img: "/images/shop-p-leggings.jpg", bestseller: true },
  { id: "clip",     name: "Pearl Hair Clip",     price: 14,  rating: 4.5, cat: "accessories", img: "/images/shop-p-clip.jpg" },
  { id: "planner",  name: "Bloom Daily Planner", price: 32,  rating: 5.0, cat: "premium",     img: "/images/shop-p-planner.jpg",  bestseller: true },
];

const MOODS: { label: string; img: string }[] = [
  { label: "Romanticize My Day", img: "/images/shop-cat-selfcare.jpg" },
  { label: "Cozy Evening",       img: "/images/shop-cat-premium.jpg" },
  { label: "Glow Up",            img: "/images/shop-cat-beauty.jpg" },
  { label: "PMS Comfort",        img: "/images/shop-cat-cycle.jpg" },
  { label: "Self-care Sunday",   img: "/images/shop-cat-accessories.jpg" },
];

const PERKS: { label: string; icon: typeof Gift }[] = [
  { label: "Premium products", icon: Gift },
  { label: "Exclusive content", icon: Sparkles },
  { label: "Excellent quality", icon: Star },
  { label: "Member discount", icon: Percent },
];

const STORAGE = { cart: "bloom:shop-cart", saved: "bloom:shop-saved" };

export default function ShopPage() {
  const [query, setQuery] = useState("");
  const [active, setActive] = useState<CatKey>("all");
  const [cart, setCart] = useState<Record<string, number>>({});
  const [saved, setSaved] = useState<Record<string, boolean>>({});
  const [open, setOpen] = useState(false);
  const [bumped, setBumped] = useState(false);

  useEffect(() => {
    try {
      setCart(JSON.parse(localStorage.getItem(STORAGE.cart) || "{}"));
      setSaved(JSON.parse(localStorage.getItem(STORAGE.saved) || "{}"));
    } catch {}
  }, []);
  useEffect(() => { try { localStorage.setItem(STORAGE.cart, JSON.stringify(cart)); } catch {} }, [cart]);
  useEffect(() => { try { localStorage.setItem(STORAGE.saved, JSON.stringify(saved)); } catch {} }, [saved]);

  const cartCount = useMemo(() => Object.values(cart).reduce((a, b) => a + b, 0), [cart]);
  const cartItems = useMemo(
    () => Object.entries(cart).map(([id, q]) => ({ p: PRODUCTS.find((x) => x.id === id)!, q })).filter((x) => x.p),
    [cart],
  );
  const subtotal = cartItems.reduce((s, { p, q }) => s + p.price * q, 0);

  const filtered = useMemo(() => {
    return PRODUCTS.filter((p) => (active === "all" || p.cat === active))
      .filter((p) => p.name.toLowerCase().includes(query.toLowerCase()));
  }, [query, active]);

  const recommended = PRODUCTS.filter((p) => p.bestseller);

  const add = (id: string) => {
    setCart((c) => ({ ...c, [id]: (c[id] || 0) + 1 }));
    setBumped(true);
    setTimeout(() => setBumped(false), 450);
  };
  const inc = (id: string) => setCart((c) => ({ ...c, [id]: (c[id] || 0) + 1 }));
  const dec = (id: string) => setCart((c) => {
    const n = (c[id] || 0) - 1;
    const next = { ...c };
    if (n <= 0) delete next[id]; else next[id] = n;
    return next;
  });
  const remove = (id: string) => setCart((c) => { const n = { ...c }; delete n[id]; return n; });
  const toggleSave = (id: string) => setSaved((s) => ({ ...s, [id]: !s[id] }));

  return (
    <div className="relative animate-fade-in">
      <BloomBubbles count={10} />

      {/* HERO */}
      <section className="relative animate-card-pop-in" style={{ animationDelay: "0ms" }}>
        <div className="pearl-frame relative overflow-hidden rounded-[1.75rem] sm:rounded-[2.5rem]">
          <img src="/images/shop-hero.png" alt="" className="animate-hero-breathe absolute inset-0 h-full w-full object-cover" referrerPolicy="no-referrer" />
          <div className="absolute inset-0 z-[1] bg-gradient-to-r from-white/90 via-white/55 to-transparent" />
          <div className="relative z-[2] px-4 py-6 sm:px-10 sm:py-14 max-w-md">
            <h1 className="font-script text-4xl sm:text-6xl lg:text-7xl text-hotpink leading-none flex items-center gap-2">
              Bloom Boutique <Sparkles className="h-6 w-6 sm:h-9 sm:w-9" strokeWidth={1.8} />
            </h1>
            <p className="mt-1.5 sm:mt-3 text-xs sm:text-base text-rose/90">Curated treasures for your softest era ✿</p>
            <p className="mt-1 sm:mt-2 text-[10px] sm:text-xs font-bold uppercase tracking-wider text-hotpink/80">
              Beauty • Wellness • Self-care • Cycle Care
            </p>
          </div>

          <button
            onClick={() => setOpen(true)}
            aria-label="Open cart"
            className={[
              "absolute top-3 right-3 sm:top-5 sm:right-5 z-[2] grid h-10 w-10 sm:h-12 sm:w-12 place-items-center rounded-full bg-white/90 border border-petal/60 text-hotpink shadow-md shadow-rose/20 backdrop-blur transition hover:-translate-y-0.5",
              bumped ? "animate-bloom-bounce" : "",
            ].join(" ")}
          >
            <ShoppingBag className="h-4 w-4 sm:h-5 sm:w-5" strokeWidth={1.8} />
            {cartCount > 0 && (
              <span className="absolute -right-1 -top-1 min-w-5 h-5 px-1 grid place-items-center rounded-full bg-hotpink text-white text-[10px] font-bold border-2 border-white">
                {cartCount}
              </span>
            )}
          </button>
        </div>
      </section>

      {/* SEARCH */}
      <section className="mt-3 sm:mt-5 animate-card-pop-in" style={{ animationDelay: "60ms" }}>
        <div className="relative">
          <Search className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-rose/60" strokeWidth={2} />
          <input
            id="search-boutique"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search the boutique…"
            className="w-full rounded-full bg-white/95 backdrop-blur border border-petal/60 pl-11 pr-4 py-2.5 sm:py-3 text-sm text-rose placeholder:text-rose/50 shadow-md shadow-rose/10 focus:outline-none focus:ring-4 focus:ring-hotpink/25 focus:border-hotpink transition"
          />
        </div>
      </section>

      {/* CATEGORIES */}
      <section className="mt-5 sm:mt-8 animate-card-pop-in" style={{ animationDelay: "120ms" }}>
        <SectionTitle hint={active === "all" ? "browse" : "filtering"}>Shop by category</SectionTitle>
        <div className="flex items-start gap-2.5 sm:gap-4 overflow-x-auto no-scrollbar animate-bloom-scroll-hint">
          <CategoryTile
            allMode
            active={active === "all"}
            onClick={() => setActive("all")}
          />
          {CATEGORIES.map((c) => (
            <CategoryTile
              key={c.key}
              label={c.label}
              img={c.img}
              active={active === c.key}
              onClick={() => setActive(c.key)}
            />
          ))}
        </div>
      </section>

      {/* RECOMMENDED FOR YOU */}
      <section className="mt-6 sm:mt-8 animate-card-pop-in" style={{ animationDelay: "180ms" }}>
        <SectionTitle hint="Why these picks →">Recommended for you</SectionTitle>
        <p className="-mt-1 mb-3 text-xs sm:text-sm text-rose/75">Curated based on your current phase ✿</p>
        <div className="grid grid-cols-3 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-4">
          {recommended.map((p) => (
            <ProductCard
              key={p.id}
              p={p}
              saved={!!saved[p.id]}
              qty={cart[p.id] || 0}
              onAdd={() => add(p.id)}
              onSave={() => toggleSave(p.id)}
            />
          ))}
        </div>
      </section>

      {/* BLOOM MEMBERSHIP */}
      <section className="mt-6 sm:mt-8 animate-card-pop-in" style={{ animationDelay: "240ms" }}>
        <div
          className="pearl-frame relative overflow-hidden rounded-[1.75rem] sm:rounded-[2.5rem] p-5 sm:p-9"
          style={{ background: "linear-gradient(135deg, #ff8ed1 0%, #ec4899 50%, #c2186e 100%)" }}
        >
          <div className="relative z-[2] flex items-center justify-between gap-4">
            <div className="max-w-xs">
              <span className="inline-flex items-center gap-1.5 text-[10px] sm:text-xs font-bold uppercase tracking-wider text-white">
                <Crown className="h-3.5 w-3.5 sm:h-4 sm:w-4" strokeWidth={2} /> Bloom Membership
              </span>
              <p className="mt-1.5 sm:mt-2 text-xs sm:text-sm text-white/95">Your soft life toolkit — save up to 30% & unlock everything.</p>
              <div className="mt-3 sm:mt-4 grid grid-cols-2 gap-x-3 gap-y-1.5 sm:gap-y-2">
                {PERKS.map((perk) => (
                  <span key={perk.label} className="inline-flex items-center gap-1.5 text-[10px] sm:text-xs font-semibold text-white">
                    <perk.icon className="h-3 w-3 sm:h-3.5 sm:w-3.5 shrink-0" strokeWidth={2} /> {perk.label}
                  </span>
                ))}
              </div>
              <button
                onClick={() => setActive("premium")}
                className="mt-3 sm:mt-5 inline-flex items-center gap-1.5 sm:gap-2 rounded-full bg-white text-hotpink font-bold text-xs sm:text-sm px-4 sm:px-5 py-2 sm:py-2.5 shadow-md shadow-rose/30 transition hover:-translate-y-0.5"
              >
                Join Blooming <ArrowRight className="h-3.5 w-3.5 sm:h-4 sm:w-4" strokeWidth={2.4} />
              </button>
            </div>
            <p className="hidden sm:block font-script text-7xl lg:text-8xl text-white/25 leading-none select-none shrink-0">Bloom</p>
          </div>
        </div>
      </section>

      {/* SHOP BY MOOD */}
      <section className="mt-6 sm:mt-8 animate-card-pop-in" style={{ animationDelay: "300ms" }}>
        <SectionTitle hint="View all →">Shop by mood</SectionTitle>
        <div className="relative -mx-3 sm:mx-0 px-3 sm:px-0">
          <div className="flex gap-3 sm:gap-4 overflow-x-auto no-scrollbar snap-x snap-mandatory pb-2">
            {MOODS.map((m) => (
              <div
                key={m.label}
                className="snap-start shrink-0 relative w-28 h-36 sm:w-40 sm:h-48 overflow-hidden rounded-2xl sm:rounded-3xl border border-petal/60 shadow-[0_10px_24px_-14px_oklch(0.7_0.18_350/0.3)]"
              >
                <img src={m.img} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover" referrerPolicy="no-referrer" />
                <div className="absolute inset-0 bg-gradient-to-t from-rose/80 via-rose/15 to-transparent" />
                <span className="absolute inset-x-2 bottom-2 sm:inset-x-3 sm:bottom-3 text-white font-semibold text-xs sm:text-sm leading-snug drop-shadow-[0_2px_6px_oklch(0_0_0/0.45)]">
                  {m.label}
                </span>
              </div>
            ))}
          </div>
          <div className="pointer-events-none absolute inset-y-0 left-0 w-6 bg-gradient-to-r from-blush sm:from-background to-transparent sm:hidden" />
          <div className="pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-l from-blush sm:from-background to-transparent" />
        </div>
      </section>

      {/* BEST SELLERS / FILTERED PRODUCTS */}
      <section className="mt-6 sm:mt-8 mb-2 animate-card-pop-in" style={{ animationDelay: "360ms" }}>
        <SectionTitle hint={`${filtered.length} items`}>
          {active === "all" ? "Best sellers" : CATEGORIES.find((c) => c.key === active)?.label}
        </SectionTitle>
        {filtered.length === 0 ? (
          <EmptyState
            title="Nothing matches yet"
            body="Try a different word or browse another category."
            cta="Clear filters"
            onCta={() => { setQuery(""); setActive("all"); }}
          />
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-4">
            {filtered.map((p) => (
              <ProductCard
                key={p.id}
                p={p}
                saved={!!saved[p.id]}
                qty={cart[p.id] || 0}
                onAdd={() => add(p.id)}
                onSave={() => toggleSave(p.id)}
              />
            ))}
          </div>
        )}
      </section>

      {/* CART PANEL */}
      <CartPanel
        open={open}
        onClose={() => setOpen(false)}
        items={cartItems}
        subtotal={subtotal}
        onInc={inc}
        onDec={dec}
        onRemove={remove}
      />
    </div>
  );
}

/* ---------- atoms ---------- */
function SectionTitle({ children, hint }: { children: React.ReactNode; hint?: string }) {
  return (
    <div className="mb-3 flex items-end justify-between gap-3">
      <h2 className="font-script text-3xl sm:text-4xl text-hotpink flex items-center gap-1.5">
        {children} <Sparkles className="h-4 w-4 sm:h-5 sm:w-5 text-hotpink/70" strokeWidth={1.8} />
      </h2>
      {hint && <span className="text-xs text-rose/70 shrink-0">{hint}</span>}
    </div>
  );
}

function CategoryTile(
  props: { allMode: true; active: boolean; onClick: () => void; label?: undefined; img?: undefined }
    | { allMode?: false; label: string; img: string; active: boolean; onClick: () => void },
) {
  const { active, onClick } = props;
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center gap-1 shrink-0 w-12 sm:w-16"
    >
      <span
        className={[
          "grid h-11 w-11 sm:h-14 sm:w-14 place-items-center overflow-hidden rounded-xl sm:rounded-2xl border-2 transition",
          active
            ? "border-hotpink ring-2 ring-hotpink/30 shadow-md shadow-hotpink/30"
            : "border-petal/60",
        ].join(" ")}
      >
        {props.allMode ? (
          <span className="grid h-full w-full place-items-center bg-blush/70 text-hotpink">
            <Flower2 className="h-5 w-5 sm:h-6 sm:w-6" strokeWidth={1.8} />
          </span>
        ) : (
          <img src={props.img} alt="" loading="lazy" className="h-full w-full object-cover" referrerPolicy="no-referrer" />
        )}
      </span>
      <span className="text-[9px] sm:text-[11px] font-semibold text-rose text-center leading-tight line-clamp-1 w-full">
        {props.allMode ? "All" : props.label}
      </span>
    </button>
  );
}

function ProductCard({
  p, saved, qty, onAdd, onSave,
}: { p: Product; saved: boolean; qty: number; onAdd: () => void; onSave: () => void }) {
  return (
    <div className="group flex flex-col overflow-hidden rounded-xl sm:rounded-3xl bg-white/90 backdrop-blur border border-petal/60 shadow-[0_10px_24px_-14px_oklch(0.7_0.18_350/0.3)] transition hover:-translate-y-1 hover:shadow-[0_18px_36px_-14px_oklch(0.7_0.22_350/0.45)]">
      <div className="relative aspect-square overflow-hidden">
        <img src={p.img} alt={p.name} loading="lazy" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" referrerPolicy="no-referrer" />
        <button
          onClick={onSave}
          aria-label={saved ? "Unsave" : "Save"}
          className={[
            "absolute top-1 right-1 sm:top-2 sm:right-2 grid h-5 w-5 sm:h-9 sm:w-9 place-items-center rounded-full border backdrop-blur transition",
            saved ? "bg-hotpink text-white border-hotpink shadow-md shadow-hotpink/40" : "bg-white/85 text-hotpink border-petal/60 hover:scale-105",
          ].join(" ")}
        >
          <Heart className="h-2.5 w-2.5 sm:h-4 sm:w-4" strokeWidth={1.8} fill={saved ? "currentColor" : "none"} />
        </button>
        {p.bestseller && (
          <span className="absolute top-1 left-1 sm:top-2 sm:left-2 inline-flex items-center gap-0.5 sm:gap-1 rounded-full bg-white/90 text-hotpink text-[7px] sm:text-[10px] font-bold uppercase tracking-wider px-1 sm:px-2 py-0.5 border border-petal/60">
            <Sparkles className="h-2 w-2 sm:h-3 sm:w-3" strokeWidth={2} /> <span className="hidden sm:inline">Loved</span>
          </span>
        )}
      </div>
      <div className="flex flex-col flex-1 p-1.5 sm:p-4 gap-0.5 sm:gap-0">
        <h3 className="font-semibold text-rose text-[10px] sm:text-sm leading-snug line-clamp-2">{p.name}</h3>
        <div className="mt-0.5 sm:mt-1 flex items-center gap-0.5 sm:gap-1 text-[9px] sm:text-xs text-rose/75">
          <Star className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-hotpink" strokeWidth={1.8} fill="currentColor" />
          {p.rating.toFixed(1)}
        </div>
        <div className="mt-auto pt-1 sm:pt-3 flex items-center justify-between gap-1">
          <span className="font-script text-base sm:text-2xl text-hotpink leading-none">${p.price}</span>
          <button
            onClick={onAdd}
            aria-label="Add to bag"
            className="bloom-luxury-btn relative inline-flex items-center justify-center gap-1 text-white text-[11px] sm:text-xs font-semibold h-6 w-6 sm:h-auto sm:w-auto sm:px-3 sm:py-1.5 rounded-full shrink-0"
          >
            <Plus className="h-3 w-3 sm:h-3.5 sm:w-3.5" strokeWidth={2.4} />
            <span className="hidden sm:inline">{qty > 0 ? `${qty}` : "Add"}</span>
            {qty > 0 && (
              <span className="sm:hidden absolute -top-1 -right-1 min-w-3.5 h-3.5 px-0.5 grid place-items-center rounded-full bg-white text-hotpink text-[8px] font-bold border border-hotpink">
                {qty}
              </span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

function EmptyState({ title, body, cta, onCta }: { title: string; body: string; cta: string; onCta: () => void }) {
  return (
    <div className="rounded-3xl bg-white/85 backdrop-blur p-8 text-center border border-petal/60">
      <p className="font-script text-3xl text-hotpink">{title}</p>
      <p className="mt-1 text-sm text-rose/80">{body}</p>
      <button
        onClick={onCta}
        className="bloom-luxury-btn mt-4 inline-flex items-center gap-2 text-white font-semibold text-sm px-5 py-2.5"
      >
        {cta}
      </button>
    </div>
  );
}

/* ---------- cart panel ---------- */
function CartPanel({
  open, onClose, items, subtotal, onInc, onDec, onRemove,
}: {
  open: boolean;
  onClose: () => void;
  items: { p: Product; q: number }[];
  subtotal: number;
  onInc: (id: string) => void;
  onDec: (id: string) => void;
  onRemove: (id: string) => void;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[60]">
      <button
        aria-label="Close cart"
        onClick={onClose}
        className="absolute inset-0 bg-rose/30 backdrop-blur-sm animate-fade-in"
      />
      <aside className="fixed right-0 top-0 h-full w-full sm:w-[26rem] bg-gradient-to-b from-blush/95 to-white/95 backdrop-blur-xl border-l border-petal/60 shadow-2xl shadow-rose/30 flex flex-col z-[60]">
        <header className="flex items-center justify-between px-5 py-4 border-b border-petal/50">
          <div>
            <h3 className="font-script text-3xl text-hotpink leading-none">Your bag</h3>
            <p className="text-xs text-rose/70">{items.length} {items.length === 1 ? "item" : "items"}</p>
          </div>
          <button onClick={onClose} aria-label="Close" className="grid h-9 w-9 place-items-center rounded-full bg-white/85 text-hotpink border border-petal/60 hover:scale-105 transition">
            <X className="h-4 w-4" strokeWidth={2} />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
          {items.length === 0 ? (
            <div className="rounded-3xl bg-white/85 p-8 text-center border border-petal/60 mt-6">
              <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-blush text-hotpink">
                <ShoppingBag className="h-6 w-6" strokeWidth={1.6} />
              </div>
              <p className="mt-3 font-script text-2xl text-hotpink">Your bag is empty</p>
              <p className="mt-1 text-sm text-rose/80">Find a little something to soften your day.</p>
              <button
                onClick={onClose}
                className="bloom-luxury-btn mt-4 inline-flex items-center gap-2 text-white font-semibold text-sm px-5 py-2.5"
              >
                Explore the shop <ArrowRight className="h-4 w-4" strokeWidth={2} />
              </button>
            </div>
          ) : (
            items.map(({ p, q }) => (
              <div key={p.id} className="flex gap-3 rounded-2xl bg-white/90 border border-petal/60 p-3">
                <img src={p.img} alt="" loading="lazy" className="h-20 w-20 rounded-xl object-cover" referrerPolicy="no-referrer" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="text-sm font-semibold text-rose leading-snug line-clamp-2">{p.name}</h4>
                    <button onClick={() => onRemove(p.id)} className="text-rose/60 hover:text-hotpink transition" aria-label="Remove">
                      <X className="h-4 w-4" strokeWidth={2} />
                    </button>
                  </div>
                  <div className="mt-2 flex items-center justify-between">
                    <div className="inline-flex items-center gap-1 rounded-full bg-blush border border-petal/60 p-0.5">
                      <button onClick={() => onDec(p.id)} aria-label="Decrease" className="grid h-6 w-6 place-items-center rounded-full text-hotpink hover:bg-white"><Minus className="h-3 w-3" strokeWidth={2} /></button>
                      <span className="text-xs font-bold text-rose w-5 text-center">{q}</span>
                      <button onClick={() => onInc(p.id)} aria-label="Increase" className="grid h-6 w-6 place-items-center rounded-full text-hotpink hover:bg-white"><Plus className="h-3 w-3" strokeWidth={2} /></button>
                    </div>
                    <span className="font-script text-xl text-hotpink leading-none">${p.price * q}</span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {items.length > 0 && (
          <footer className="border-t border-petal/50 px-5 py-4 space-y-3 bg-white/70">
            <div className="flex items-center justify-between text-sm text-rose/80">
              <span>Subtotal</span>
              <span className="font-semibold text-rose">${subtotal}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-script text-2xl text-hotpink leading-none">Total</span>
              <span className="font-script text-3xl text-hotpink leading-none">${subtotal}</span>
            </div>
            <button className="bloom-luxury-btn w-full inline-flex items-center justify-center gap-2 text-white font-semibold text-sm px-5 py-3">
              Checkout <ArrowRight className="h-4 w-4" strokeWidth={2} />
            </button>
            <p className="text-center text-[11px] text-rose/60">Soft & secure — no card needed for sample.</p>
          </footer>
        )}
      </aside>
    </div>
  );
}
