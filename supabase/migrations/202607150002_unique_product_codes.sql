create sequence if not exists public.tombstone_product_code_seq;

-- Preserve the first occurrence of any existing code and regenerate duplicates.
with duplicate_codes as (
  select
    id,
    row_number() over (
      partition by upper(trim(product_code))
      order by created_at nulls last, id
    ) as duplicate_number
  from public.tombstone_products
  where product_code is not null and trim(product_code) <> ''
)
update public.tombstone_products as product
set product_code = null
from duplicate_codes
where product.id = duplicate_codes.id
  and duplicate_codes.duplicate_number > 1;

-- Continue after the highest existing PT-number so generated codes never collide.
do $$
declare
  highest_code bigint;
begin
  select coalesce(
    max((regexp_match(upper(product_code), '^PT-([0-9]+)$'))[1]::bigint),
    0
  )
  into highest_code
  from public.tombstone_products;

  if highest_code = 0 then
    perform setval('public.tombstone_product_code_seq', 1, false);
  else
    perform setval('public.tombstone_product_code_seq', highest_code, true);
  end if;
end;
$$;

update public.tombstone_products
set product_code = 'PT-' || lpad(nextval('public.tombstone_product_code_seq')::text, 5, '0')
where product_code is null or trim(product_code) = '';

create or replace function public.assign_tombstone_product_code()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.product_code is null or trim(new.product_code) = '' then
    new.product_code := 'PT-' || lpad(nextval('public.tombstone_product_code_seq')::text, 5, '0');
  end if;
  new.product_code := upper(trim(new.product_code));
  return new;
end;
$$;

drop trigger if exists assign_tombstone_product_code_trigger
  on public.tombstone_products;
create trigger assign_tombstone_product_code_trigger
before insert or update of product_code on public.tombstone_products
for each row execute function public.assign_tombstone_product_code();

create unique index if not exists tombstone_products_product_code_unique_idx
  on public.tombstone_products (upper(product_code));

alter table public.tombstone_products
  alter column product_code set not null;

