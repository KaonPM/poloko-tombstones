-- Bridge the original payment/order schema to the current admin workflow
-- without deleting or renaming existing columns.

alter table public.poloko_payments
  add column if not exists amount numeric(12, 2),
  add column if not exists reference text,
  add column if not exists paid_at date;

update public.poloko_payments
set
  amount = coalesce(amount, amount_paid),
  reference = coalesce(reference, receipt_number),
  paid_at = coalesce(paid_at, created_at::date)
where amount is null
   or reference is null
   or paid_at is null;

alter table public.poloko_payments
  alter column amount set not null,
  alter column paid_at set default current_date,
  alter column paid_at set not null,
  alter column receipt_number set default (
    'PAY-' || to_char(current_date, 'YYYY') || '-' ||
    upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10))
  );

create or replace function public.sync_poloko_payment_columns()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.receipt_number is null or trim(new.receipt_number) = '' then
    new.receipt_number :=
      'PAY-' || to_char(current_date, 'YYYY') || '-' ||
      upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10));
  end if;

  if tg_op = 'INSERT' then
    new.amount := coalesce(new.amount, new.amount_paid);
    new.amount_paid := coalesce(new.amount_paid, new.amount);
  else
    if new.amount is distinct from old.amount
       and new.amount_paid is not distinct from old.amount_paid then
      new.amount_paid := new.amount;
    elsif new.amount_paid is distinct from old.amount_paid
       and new.amount is not distinct from old.amount then
      new.amount := new.amount_paid;
    else
      new.amount := coalesce(new.amount, new.amount_paid);
      new.amount_paid := coalesce(new.amount_paid, new.amount);
    end if;
  end if;

  new.paid_at := coalesce(new.paid_at, current_date);
  return new;
end;
$$;

drop trigger if exists sync_poloko_payment_columns_trigger
  on public.poloko_payments;
create trigger sync_poloko_payment_columns_trigger
before insert or update of amount, amount_paid, receipt_number, paid_at
on public.poloko_payments
for each row execute function public.sync_poloko_payment_columns();

alter table public.poloko_orders
  add column if not exists due_date date,
  add column if not exists design_notes text,
  add column if not exists production_notes text,
  add column if not exists manufactured_at timestamptz,
  add column if not exists updated_at timestamptz default now();

update public.poloko_orders
set
  status = case when status = 'Deposit Paid' then 'Confirmed' else status end,
  production_notes = coalesce(production_notes, notes),
  manufactured_at = case
    when status = 'Manufactured' then coalesce(manufactured_at, now())
    else manufactured_at
  end,
  updated_at = coalesce(updated_at, now());

alter table public.poloko_orders
  alter column status set default 'Confirmed',
  alter column updated_at set default now();

