-- ============================================================================
-- Billing: lock down `plan` and track the Stripe customer.
--
--   * The old "own profile" policy was FOR ALL with check (auth.uid() = id) —
--     which let any logged-in user UPDATE their own row, including setting
--     plan = 'pro' for free. That defeats the paywall. We replace it with a
--     SELECT-only policy: a user can read their profile but never write it.
--     `plan` is now changed ONLY by the Stripe webhook, which uses the service
--     role and bypasses RLS. (The handle_new_user trigger still inserts the row,
--     and runs as definer, so signup is unaffected.)
--   * stripe_customer_id links a profile to its Stripe customer so subscription
--     webhooks (which carry the customer, not our user id) can find the user.
-- ============================================================================

alter table profiles add column if not exists stripe_customer_id text;
create index if not exists profiles_stripe_customer_id_idx
  on profiles (stripe_customer_id);

drop policy if exists "own profile" on profiles;

create policy "read own profile" on profiles
  for select using (auth.uid() = id);
