-- ============================================================================
-- Bloom+ — support the Paddle customer portal (self-service manage/cancel).
-- ----------------------------------------------------------------------------
-- The portal is minted per Paddle CUSTOMER, so we must remember each user's
-- Paddle customer id (captured from webhook events). `occurred_at` lets the
-- webhook ignore out-of-order deliveries (Paddle is at-least-once and unordered).
-- Still webhook-only writes; RLS from the earlier migration is unchanged.
-- ============================================================================

alter table public.subscriptions
  add column if not exists paddle_customer_id text,       -- Paddle "ctm_…" id
  add column if not exists occurred_at        timestamptz; -- event time (ordering guard)
