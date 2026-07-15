create extension if not exists pgcrypto;

create table if not exists public.poloko_payments (
  id uuid primary key default gen_random_uuid(),
  quote_id uuid not null references public.poloko_quotes(id) on delete cascade,
  amount numeric(12, 2) not null check (amount > 0),
  payment_type text not null check (payment_type in ('Deposit', 'Progress', 'Balance', 'Refund')),
  payment_method text not null check (payment_method in ('Cash', 'EFT', 'Card', 'Other')),
  reference text,
  paid_at date not null default current_date,
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists poloko_payments_quote_id_idx
  on public.poloko_payments(quote_id);

create table if not exists public.poloko_orders (
  id uuid primary key default gen_random_uuid(),
  quote_id uuid not null unique references public.poloko_quotes(id) on delete restrict,
  customer_id uuid not null references public.poloko_customers(id) on delete restrict,
  order_number text not null unique,
  status text not null default 'Confirmed' check (
    status in (
      'Confirmed',
      'Design Approval',
      'Material Preparation',
      'Cutting',
      'Engraving',
      'Assembly',
      'Quality Check',
      'Manufactured'
    )
  ),
  due_date date,
  design_notes text,
  production_notes text,
  manufactured_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

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

