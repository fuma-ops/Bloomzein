-- ============================================================================
-- Bloomzein — cloud sync foundation
-- ----------------------------------------------------------------------------
-- A single per-user key/value store that mirrors every `bloom:*` localStorage
-- key to the cloud. Each tool keeps writing localStorage exactly as before;
-- the client-side sync engine (src/lib/cloudSync.ts) pushes/pulls rows here so
-- data follows the user across devices. Last-write-wins per key, resolved by
-- `updated_at`.
-- ============================================================================

create table if not exists public.user_data (
  user_id    uuid        not null references auth.users (id) on delete cascade,
  key        text        not null,
  value      text,                                  -- raw localStorage string (already JSON in most tools)
  updated_at timestamptz not null default now(),
  primary key (user_id, key)
);

-- Fast "give me everything for this user" pull on login.
create index if not exists user_data_user_id_idx on public.user_data (user_id);

-- ----------------------------------------------------------------------------
-- Row Level Security — a user may only ever see/touch their own rows.
-- ----------------------------------------------------------------------------
alter table public.user_data enable row level security;

drop policy if exists "user_data_select_own" on public.user_data;
create policy "user_data_select_own"
  on public.user_data for select
  using (auth.uid() = user_id);

drop policy if exists "user_data_insert_own" on public.user_data;
create policy "user_data_insert_own"
  on public.user_data for insert
  with check (auth.uid() = user_id);

drop policy if exists "user_data_update_own" on public.user_data;
create policy "user_data_update_own"
  on public.user_data for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "user_data_delete_own" on public.user_data;
create policy "user_data_delete_own"
  on public.user_data for delete
  using (auth.uid() = user_id);
