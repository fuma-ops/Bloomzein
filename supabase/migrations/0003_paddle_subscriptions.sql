-- ============================================================================
-- Bloomzein — Bloom+ subscriptions: switch billing provider to Paddle Billing.
-- ----------------------------------------------------------------------------
-- Reuses the existing public.subscriptions table (still one row per user,
-- written ONLY by the webhook / service role — the single source of truth for
-- premium). We add the Paddle identifiers alongside the old Lemon Squeezy ones
-- so nothing is lost and any pre-migration rows keep resolving.
--
--   status values (Paddle): active | trialing | past_due | paused | canceled
--   active | trialing  ⇒  Bloom+ is on.
-- ============================================================================

alter table public.subscriptions
  add column if not exists paddle_subscription_id text,  -- Paddle "sub_…" id
  add column if not exists price_id               text;  -- which plan ("pri_…")

-- RLS is unchanged: users may READ their own row (policy from 0002), and there
-- are still no user insert/update/delete policies — only the webhook writes.
