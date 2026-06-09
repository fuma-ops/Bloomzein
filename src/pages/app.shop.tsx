import { useEffect, useMemo, useState } from "react";
import {
  Search, ShoppingBag, Heart, Star, Plus, Minus, X, ArrowRight, Sparkles,
} from "lucide-react";
import { BloomBubbles } from "@/components/bloom/BloomBubbles";

/* ---------- data ---------- */
type CatKey = "all" | "selfcare" | "beauty" | "cycle" | "active" | "accessories" | "premium";

const CATEGORIES: { key: Exclude<CatKey, "all">; label: string; img: string }[] = [
  { key: "selfcare",    label: "Self-care",   img: "https://images.pexels.com/photos/4608232/pexels-photo-4608232.jpeg?auto=compress&cs=tinysrgb&w=400" },
  { key: "beauty",      label: "Beauty",      img: "https://images.pexels.com/photos/3685530/pexels-photo-3685530.jpeg?auto=compress&cs=tinysrgb&w=400" },
  { key: "cycle",       label: "Cycle Care",  img: "https://images.pexels.com/photos/4226896/pexels-photo-4226896.jpeg?auto=compress&cs=tinysrgb&w=400" },
  { key: "active",      label: "Activewear",  img: "https://images.pexels.com/photos/4162489/pexels-photo-4162489.jpeg?auto=compress&cs=tinysrgb&w=400" },
  { key: "accessories", label: "Accessories", img: "https://images.pexels.com/photos/1152077/pexels-photo-1152077.jpeg?auto=compress&cs=tinysrgb&w=400" },
  { key: "premium",     label: "Bloom Premium", img: "https://images.pexels.com/photos/606540/pexels-photo-606540.jpeg?auto=compress&cs=tinysrgb&w=400" },
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
  { id: "candle",   name: "Rose Glow Candle",    price: 28,  rating: 4.9, cat: "selfcare",    img: "https://images.pexels.com/photos/4226893/pexels-photo-4226893.jpeg?auto=compress&cs=tinysrgb&w=400",   bestseller: true },
  { id: "mask",     name: "Silk Sleep Mask",     price: 22,  rating: 4.8, cat: "selfcare",    img: "https://images.pexels.com/photos/3820071/pexels-photo-3820071.jpeg?auto=compress&cs=tinysrgb&w=400" },
  { id: "gloss",    name: "Pillow Lip Gloss",    price: 18,  rating: 4.7, cat: "beauty",      img: "https://images.pexels.com/photos/2533483/pexels-photo-2533483.jpeg?auto=compress&cs=tinysrgb&w=400",    bestseller: true },
  { id: "serum",    name: "Rose Petal Serum",    price: 42,  rating: 4.9, cat: "beauty",      img: "https://images.pexels.com/photos/4041392/pexels-photo-4041392.jpeg?auto=compress&cs=tinysrgb&w=400" },
  { id: "heat",     name: "Cozy Heat Wrap",      price: 36,  rating: 4.8, cat: "cycle",       img: "https://images.pexels.com/photos/4226896/pexels-photo-4226896.jpeg?auto=compress&cs=tinysrgb&w=400",     bestseller: true },
  { id: "bottle",   name: "Bloom Water Bottle",  price: 24,  rating: 4.6, cat: "active",      img: "https://images.pexels.com/photos/4162489/pexels-photo-4162489.jpeg?auto=compress&cs=tinysrgb&w=400" },
  { id: "leggings", name: "Soft Glow Leggings",  price: 58,  rating: 4.9, cat: "active",      img: "https://images.pexels.com/photos/4162489/pexels-photo-4162489.jpeg?auto=compress&cs=tinysrgb&w=400", bestseller: true },
  { id: "clip",     name: "Pearl Hair Clip",     price: 14,  rating: 4.5, cat: "accessories", img: "https://images.pexels.com/photos/1152077/pexels-photo-1152077.jpeg?auto=compress&cs=tinysrgb&w=400" },
  { id: "planner",  name: "Bloom Daily Planner", price: 32,  rating: 5.0, cat: "premium",     img: "https://images.pexels.com/photos/5699456/pexels-photo-5699456.jpeg?auto=compress&cs=tinysrgb&w=400",  bestseller: true },
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

  const bestsellers = PRODUCTS.filter((p) => p.bestseller);

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
    <div className="relative">
      <BloomBubbles count={10} />

      {/* HEADER */}
      <section className="stagger sticky top-0 z-30 -mx-3 px-3 pt-2 pb-2 sm:static sm:mx-0 sm:px-0 sm:pt-0 sm:pb-0 bg-blush/70 sm:bg-transparent backdrop-blur-md sm:backdrop-blur-none" style={{ animationDelay: "0ms" }}>
        <div className="flex items-end justify-between gap-3">
          <div>
            <h1 className="font-script text-3xl sm:text-5xl lg:text-6xl text-hotpink leading-none">Shop</h1>
            <p className="mt-1 text-xs sm:text-base text-rose/85 italic">treat yourself, you deserve it ✿</p>
          </div>
          <button
            onClick={() => setOpen(true)}
            aria-label="Open cart"
            className={[
              "relative grid h-10 w-10 sm:h-12 sm:w-12 place-items-center rounded-full bg-white/90 border border-petal/60 text-hotpink shadow-md shadow-rose/20 backdrop-blur transition hover:-translate-y-0.5 shrink-0",
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

        <div className="mt-2 sm:mt-4 relative">
          <Search className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-rose/60" strokeWidth={2} />
          <input
            id="search-boutique"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search the boutique…"
            className="w-full rounded-full bg-white/90 backdrop-blur border border-petal/60 pl-11 pr-4 py-2 sm:py-3 text-sm text-rose placeholder:text-rose/50 shadow-sm focus:outline-none focus:ring-4 focus:ring-hotpink/25 focus:border-hotpink transition"
          />
        </div>
      </section>

      {/* CATEGORIES */}
      <section className="mt-3 sm:mt-8 stagger" style={{ animationDelay: "80ms" }}>
        <SectionTitle hint={active === "all" ? "browse" : "filtering"}>Shop by category</SectionTitle>
        <div className="grid grid-cols-4 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-3">
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

      {/* FEATURED BANNER */}
      <section className="mt-6 sm:mt-8 stagger" style={{ animationDelay: "160ms" }}>
        <div className="relative overflow-hidden rounded-[1.75rem] sm:rounded-[2.5rem] border border-petal/60 shadow-[0_20px_50px_-20px_oklch(0.6_0.27_350/0.45)]">
          <img src="https://images.pexels.com/photos/606540/pexels-photo-606540.jpeg?auto=compress&cs=tinysrgb&w=1200" alt="" className="absolute inset-0 h-full w-full object-cover" referrerPolicy="no-referrer" />
          <div className="absolute inset-0 bg-gradient-to-r from-white/85 via-white/40 to-transparent" />
          <div className="relative px-4 py-5 sm:px-12 sm:py-14 max-w-xl">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/85 backdrop-blur px-2.5 py-0.5 sm:px-3 sm:py-1 text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-hotpink border border-petal/60">
              <Sparkles className="h-3 w-3" strokeWidth={2} /> Limited offer
            </span>
            <h2 className="mt-2 sm:mt-3 font-script text-2xl sm:text-5xl text-hotpink leading-none drop-shadow-[0_2px_6px_oklch(1_0_0/0.5)]">
              Bloom Premium
            </h2>
            <p className="mt-1.5 sm:mt-3 text-xs sm:text-base text-rose/90">
              Unlock every tool, every planner — 20% off this week.
            </p>
            <button
              onClick={() => setActive("premium")}
              className="mt-3 sm:mt-5 inline-flex items-center gap-1.5 sm:gap-2 rounded-full bg-hotpink text-white font-semibold text-xs sm:text-sm px-3.5 py-1.5 sm:px-5 sm:py-2.5 shadow-md shadow-hotpink/40 hover:-translate-y-0.5 transition"
            >
              Shop premium — 20% off <ArrowRight className="h-3.5 w-3.5 sm:h-4 sm:w-4" strokeWidth={2} />
            </button>
          </div>
        </div>
      </section>

      {/* PRODUCT GRID */}
      <section className="mt-6 sm:mt-8 stagger" style={{ animationDelay: "240ms" }}>
        <SectionTitle hint={`${filtered.length} items`}>
          {active === "all" ? "All products" : CATEGORIES.find((c) => c.key === active)?.label}
        </SectionTitle>
        {filtered.length === 0 ? (
          <EmptyState
            title="Nothing matches yet"
            body="Try a different word or browse another category."
            cta="Clear filters"
            onCta={() => { setQuery(""); setActive("all"); }}
          />
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
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

      {/* BESTSELLERS */}
      <section className="mt-8 sm:mt-10 stagger" style={{ animationDelay: "320ms" }}>
        <SectionTitle hint="loved by the Bloom girls">For you</SectionTitle>
        <p className="-mt-1 mb-3 text-xs sm:text-sm text-rose/75">Soft picks our community can't stop adding to bag.</p>
        <div className="-mx-3 sm:mx-0 px-3 sm:px-0 flex gap-3 sm:gap-4 overflow-x-auto snap-x snap-mandatory pb-2">
          {bestsellers.map((p) => (
            <div key={p.id} className="snap-start shrink-0 w-40 sm:w-60">
              <ProductCard
                p={p}
                saved={!!saved[p.id]}
                qty={cart[p.id] || 0}
                onAdd={() => add(p.id)}
                onSave={() => toggleSave(p.id)}
                compact
              />
            </div>
          ))}
        </div>
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
      <h2 className="font-script text-3xl sm:text-4xl text-hotpink">{children}</h2>
      {hint && <span className="text-xs text-rose/70">{hint}</span>}
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
      className={[
        "relative overflow-hidden rounded-2xl sm:rounded-3xl border text-left transition hover:-translate-y-0.5",
        active
          ? "border-hotpink/70 ring-2 ring-hotpink/40 shadow-[0_14px_30px_-14px_oklch(0.7_0.27_350/0.5)]"
          : "border-petal/60 shadow-[0_8px_22px_-14px_oklch(0.7_0.18_350/0.3)]",
      ].join(" ")}
    >
      <div className="relative h-16 sm:h-28 w-full">
        {props.allMode ? (
          <div className="absolute inset-0 bg-gradient-to-br from-hotpink via-magenta to-hotpink" />
        ) : (
          <img src={props.img} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover" referrerPolicy="no-referrer" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-rose/70 via-rose/10 to-transparent" />
        <span className="absolute bottom-1.5 left-2 right-2 sm:bottom-2 sm:left-3 sm:right-3 text-white font-script text-sm sm:text-xl leading-tight drop-shadow-[0_2px_6px_oklch(0_0_0/0.45)]">
          {props.allMode ? "All" : props.label}
        </span>
      </div>
    </button>
  );
}

function ProductCard({
  p, saved, qty, onAdd, onSave, compact,
}: { p: Product; saved: boolean; qty: number; onAdd: () => void; onSave: () => void; compact?: boolean }) {
  return (
    <div className="group flex flex-col overflow-hidden rounded-2xl sm:rounded-3xl bg-white/90 backdrop-blur border border-petal/60 shadow-[0_10px_24px_-14px_oklch(0.7_0.18_350/0.3)] transition hover:-translate-y-1 hover:shadow-[0_18px_36px_-14px_oklch(0.7_0.22_350/0.45)]">
      <div className="relative aspect-square overflow-hidden">
        <img src={p.img} alt={p.name} loading="lazy" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" referrerPolicy="no-referrer" />
        <button
          onClick={onSave}
          aria-label={saved ? "Unsave" : "Save"}
          className={[
            "absolute top-1.5 right-1.5 sm:top-2 sm:right-2 grid h-8 w-8 sm:h-9 sm:w-9 place-items-center rounded-full border backdrop-blur transition",
            saved ? "bg-hotpink text-white border-hotpink shadow-md shadow-hotpink/40" : "bg-white/85 text-hotpink border-petal/60 hover:scale-105",
          ].join(" ")}
        >
          <Heart className="h-4 w-4" strokeWidth={1.8} fill={saved ? "currentColor" : "none"} />
        </button>
        {p.bestseller && (
          <span className="absolute top-1.5 left-1.5 sm:top-2 sm:left-2 inline-flex items-center gap-1 rounded-full bg-white/90 text-hotpink text-[9px] sm:text-[10px] font-bold uppercase tracking-wider px-1.5 sm:px-2 py-0.5 border border-petal/60">
            <Sparkles className="h-3 w-3" strokeWidth={2} /> Loved
          </span>
        )}
      </div>
      <div className={["flex flex-col flex-1", compact ? "p-2.5" : "p-3 sm:p-4"].join(" ")}>
        <h3 className="font-semibold text-rose text-xs sm:text-sm leading-snug line-clamp-2">{p.name}</h3>
        <div className="mt-1 flex items-center gap-1 text-[11px] sm:text-xs text-rose/75">
          <Star className="h-3 w-3 text-hotpink" strokeWidth={1.8} fill="currentColor" />
          {p.rating.toFixed(1)}
        </div>
        <div className="mt-2 sm:mt-3 flex items-center justify-between gap-1.5">
          <span className="font-script text-xl sm:text-2xl text-hotpink leading-none">${p.price}</span>
          <button
            onClick={onAdd}
            className="inline-flex items-center gap-1 rounded-full bg-hotpink text-white text-[11px] sm:text-xs font-semibold px-2.5 sm:px-3 py-1 sm:py-1.5 shadow-md shadow-hotpink/30 hover:-translate-y-0.5 transition"
          >
            <Plus className="h-3 w-3 sm:h-3.5 sm:w-3.5" strokeWidth={2.4} /> {qty > 0 ? `${qty}` : "Add"}
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
        className="mt-4 inline-flex items-center gap-2 rounded-full bg-hotpink text-white font-semibold text-sm px-5 py-2.5 shadow-md shadow-hotpink/30 hover:-translate-y-0.5 transition"
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
    <div className="fixed inset-0 z-50">
      <button
        aria-label="Close cart"
        onClick={onClose}
        className="absolute inset-0 bg-rose/30 backdrop-blur-sm animate-fade-in"
      />
      <aside className="fixed right-0 top-0 h-full w-full sm:w-[26rem] bg-gradient-to-b from-blush/95 to-white/95 backdrop-blur-xl border-l border-petal/60 shadow-2xl shadow-rose/30 flex flex-col z-50">
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
                className="mt-4 inline-flex items-center gap-2 rounded-full bg-hotpink text-white font-semibold text-sm px-5 py-2.5 shadow-md shadow-hotpink/30 hover:-translate-y-0.5 transition"
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
            <button className="w-full inline-flex items-center justify-center gap-2 rounded-full bg-hotpink text-white font-semibold text-sm px-5 py-3 shadow-md shadow-hotpink/40 hover:-translate-y-0.5 transition">
              Checkout <ArrowRight className="h-4 w-4" strokeWidth={2} />
            </button>
            <p className="text-center text-[11px] text-rose/60">Soft & secure — no card needed for sample.</p>
          </footer>
        )}
      </aside>
    </div>
  );
}
