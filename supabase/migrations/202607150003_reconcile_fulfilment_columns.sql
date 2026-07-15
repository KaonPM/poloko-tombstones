-- Reconcile older installations where these tables already existed before
-- the fulfilment migration. CREATE TABLE IF NOT EXISTS does not add columns.

alter table public.poloko_payments
  add column if not exists quote_id uuid,
  add column if not exists amount numeric(12, 2),
  add column if not exists payment_type text default 'Deposit',
  add column if not exists payment_method text default 'EFT',
  add column if not exists reference text,
  add column if not exists paid_at date default current_date,
  add column if not exists notes text,
  add column if not exists created_at timestamptz default now();

alter table public.poloko_orders
  add column if not exists quote_id uuid,
  add column if not exists customer_id uuid,
  add column if not exists order_number text,
  add column if not exists status text default 'Confirmed',
  add column if not exists due_date date,
  add column if not exists design_notes text,
  add column if not exists production_notes text,
  add column if not exists manufactured_at timestamptz,
  add column if not exists created_at timestamptz default now(),
  add column if not exists updated_at timestamptz default now();

create index if not exists poloko_payments_quote_id_idx
  on public.poloko_payments(quote_id);

create index if not exists poloko_orders_status_idx
  on public.poloko_orders(status);

alter table public.poloko_payments enable row level security;
alter table public.poloko_orders enable row level security;

drop policy if exists "Authenticated users manage payments" on public.poloko_payments;
create policy "Authenticated users manage payments"
  on public.poloko_payments for all to authenticated
  using (true) with check (true);

drop policy if exists "Authenticated users manage orders" on public.poloko_orders;
create policy "Authenticated users manage orders"
  on public.poloko_orders for all to authenticated
  using (true) with check (true);
