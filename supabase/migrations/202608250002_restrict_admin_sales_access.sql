-- Restrict sensitive sales and fulfilment records to the designated Poloko
-- Tombstones administrator. This is deliberately email-specific rather than
-- granting every authenticated Supabase user access.

-- Existing operational tables created before this migration.
alter table public.poloko_customers enable row level security;
alter table public.poloko_leads enable row level security;
alter table public.poloko_quotes enable row level security;
alter table public.poloko_quote_items enable row level security;
alter table public.poloko_payments enable row level security;
alter table public.poloko_orders enable row level security;
alter table public.poloko_activity_log enable row level security;
alter table public.tombstone_products enable row level security;

create policy "Poloko admin manages customers"
  on public.poloko_customers for all to authenticated
  using ((auth.jwt() ->> 'email') = 'info@polokotombstones.co.za')
  with check ((auth.jwt() ->> 'email') = 'info@polokotombstones.co.za');

create policy "Poloko admin manages leads"
  on public.poloko_leads for all to authenticated
  using ((auth.jwt() ->> 'email') = 'info@polokotombstones.co.za')
  with check ((auth.jwt() ->> 'email') = 'info@polokotombstones.co.za');

create policy "Poloko admin manages quotes"
  on public.poloko_quotes for all to authenticated
  using ((auth.jwt() ->> 'email') = 'info@polokotombstones.co.za')
  with check ((auth.jwt() ->> 'email') = 'info@polokotombstones.co.za');

create policy "Poloko admin manages quote items"
  on public.poloko_quote_items for all to authenticated
  using ((auth.jwt() ->> 'email') = 'info@polokotombstones.co.za')
  with check ((auth.jwt() ->> 'email') = 'info@polokotombstones.co.za');

-- Replace the older policy that allowed every authenticated account to manage
-- payment and production data.
drop policy if exists "Authenticated users manage payments" on public.poloko_payments;
drop policy if exists "Poloko admin manages payments" on public.poloko_payments;
create policy "Poloko admin manages payments"
  on public.poloko_payments for all to authenticated
  using ((auth.jwt() ->> 'email') = 'info@polokotombstones.co.za')
  with check ((auth.jwt() ->> 'email') = 'info@polokotombstones.co.za');

drop policy if exists "Authenticated users manage orders" on public.poloko_orders;
drop policy if exists "Poloko admin manages orders" on public.poloko_orders;
create policy "Poloko admin manages orders"
  on public.poloko_orders for all to authenticated
  using ((auth.jwt() ->> 'email') = 'info@polokotombstones.co.za')
  with check ((auth.jwt() ->> 'email') = 'info@polokotombstones.co.za');

drop policy if exists "Authenticated users view activity" on public.poloko_activity_log;
drop policy if exists "Poloko admin views activity" on public.poloko_activity_log;
create policy "Poloko admin views activity"
  on public.poloko_activity_log for select to authenticated
  using ((auth.jwt() ->> 'email') = 'info@polokotombstones.co.za');

-- Keep the public catalogue readable, but only the administrator may alter it.
drop policy if exists "Poloko admin inserts products" on public.tombstone_products;
create policy "Poloko admin inserts products"
  on public.tombstone_products for insert to authenticated
  with check ((auth.jwt() ->> 'email') = 'info@polokotombstones.co.za');

drop policy if exists "Poloko admin updates products" on public.tombstone_products;
create policy "Poloko admin updates products"
  on public.tombstone_products for update to authenticated
  using ((auth.jwt() ->> 'email') = 'info@polokotombstones.co.za')
  with check ((auth.jwt() ->> 'email') = 'info@polokotombstones.co.za');

drop policy if exists "Poloko admin deletes products" on public.tombstone_products;
create policy "Poloko admin deletes products"
  on public.tombstone_products for delete to authenticated
  using ((auth.jwt() ->> 'email') = 'info@polokotombstones.co.za');
