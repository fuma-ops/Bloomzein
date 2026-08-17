-- ============================================================================
-- Bloomzein — harden error_logs inserts
-- ----------------------------------------------------------------------------
-- error_logs previously allowed ANONYMOUS inserts (INSERT policy with
-- `with check (true)`), which is a spam/abuse vector: anyone with the public
-- anon key could script unlimited rows to bloat the table and usage.
--
-- This restricts inserts to AUTHENTICATED users only (the `authenticated`
-- role). Reads stay closed (no SELECT policy → not readable via the API;
-- only the service role / dashboard can read them). No data is exposed by
-- this change — it only narrows who may write.
--
-- Note: errors thrown BEFORE a user logs in will no longer be logged to the
-- cloud. That's the intended trade-off for closing the spam vector.
-- ============================================================================

alter table public.error_logs enable row level security;

-- Remove the old "anyone can log an error" permissive insert policy.
drop policy if exists "anyone can log an error" on public.error_logs;

-- Only signed-in users may insert an error row.
drop policy if exists "authenticated can log an error" on public.error_logs;
create policy "authenticated can log an error"
  on public.error_logs for insert
  to authenticated
  with check (true);
