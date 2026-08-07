-- ============================================================================
-- Bloomzein — Bloom+ subscriptions (Lemon Squeezy)
-- ----------------------------------------------------------------------------
-- One row per user, written ONLY by the Lemon Squeezy webhook (service role).
-- The client reads its own row to know whether Bloom+ is active. Users can read
-- their row but cannot write it — so no one can grant themselves premium by
-- editing localStorage / user_data. The webhook is the single source of truth.
-- ============================================================================

create table if not exists public.subscriptions (
  user_id             uuid        primary key references auth.users (id) on delete cascade,
  status              text        not null default 'none',   -- active | on_trial | past_due | cancelled | expired | paused | none
  ls_subscription_id  text,                                  -- Lemon Squeezy subscription id
  variant_id          text,                                  -- which plan (monthly/annual variant)
  renews_at           timestamptz,
  ends_at             timestamptz,                           -- when access actually ends (after cancel)
  updated_at          timestamptz not null default now()
);

alter table public.subscriptions enable row level security;

-- A user may READ their own subscription…
drop policy if exists "subscriptions_select_own" on public.subscriptions;
create policy "subscriptions_select_own"
  on public.subscriptions for select
  using (auth.uid() = user_id);

-- …but there are deliberately NO insert/update/delete policies for users.
-- Only the service role (the webhook) writes here, and it bypasses RLS.
