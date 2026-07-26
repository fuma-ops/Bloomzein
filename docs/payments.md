# Payments & Subscription — Decision Note

**Status:** Planned (build after the 200 articles ship). Nothing wired yet.

## Fixed facts
- **Business location:** Morocco.
- **Model:** Free trial → paid (recurring subscription / abonnement).
- **Audience:** global (Morocco, France, US, …) — so tax compliance across countries matters.
- **Stack:** Vite + React 19 SPA, Supabase backend, Vercel hosting.

## The Morocco constraint
- A **Morocco-registered business cannot use Stripe directly.**
- Local gateway **CMI** is built for local `.ma` dirham payments — poor for
  international cards and recurring billing. Not suitable.

## Chosen direction: Merchant of Record (Path A)
Use a **Merchant of Record (MoR)** — **Lemon Squeezy** (preferred) or **Paddle**.

Why:
- They are the legal seller → **handle all VAT/tax worldwide** (incl. EU/France).
- Native **free trial + auto-charge + failed-payment retries (dunning)**.
- **Payout to Morocco** via **Payoneer or PayPal** (no foreign bank needed).
- ~5% + card fees — the tax handling is worth it at launch.

⚠️ **Verify Morocco seller eligibility at signup** — MoR seller-country policies
change. If Lemon Squeezy rejects Morocco, try Paddle, and vice versa.

### Alternative for later: Path B — US LLC → Stripe
If/when revenue justifies it: register a US LLC (doola / Firstbase / Stripe
Atlas, ~$300–500 to start) → unlocks Stripe + Mercury bank. Cheapest fees, best
DX, native Supabase integration. **Downside:** you must collect/remit VAT
yourself (needs a tax tool). Migrate to this only after launch traction.

## Free-trial mechanics (decided defaults)
- **Require card up front** (7-day trial → auto-charges). Higher conversion,
  less abuse. Recommended over no-card trials.
- **Send a "trial ends tomorrow" reminder email** before first charge
  (reduces chargebacks; expected in the EU). MoR handles this automatically.

## Implementation shape (when we build it)
1. **Subscribe** button → redirect to the MoR's hosted checkout
   (no card data touches our code → no PCI burden).
2. MoR **webhook** → a Supabase **Edge Function** upserts a `subscriptions` row:
   `user_id`, `status`, `trial_ends_at`, `current_period_end`, `plan`.
3. Gate premium features via **Row Level Security** + a `useSubscription()` hook
   that shows/hides paid tools based on `status`.
4. Reuse the existing Bloom+ gating spec (`docs/bloom-plus-gating-spec.md`) for
   which features sit behind the paywall.

## Next concrete step (for later)
1. Pick **Lemon Squeezy** (or Paddle) and create the seller account; confirm
   Morocco payout via Payoneer/PayPal.
2. Create the products: one plan with a 7-day trial (monthly + yearly prices).
3. Then the code (checkout redirect + webhook Edge Function + gating) can be
   built in one pass — only the API keys are needed from you.
