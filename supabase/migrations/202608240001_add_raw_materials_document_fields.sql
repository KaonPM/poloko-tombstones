-- Keep memorial documents simple while allowing raw-material quotations and
-- proforma invoices to record the measurements needed for stone supply.

alter table public.poloko_quotes
  add column if not exists document_type text not null default 'Memorial'
  check (document_type in ('Memorial', 'Raw Materials'));

alter table public.poloko_quote_items
  add column if not exists material text,
  add column if not exists dimensions text,
  add column if not exists square_meters numeric(12, 3),
  add column if not exists kilograms numeric(12, 3);
