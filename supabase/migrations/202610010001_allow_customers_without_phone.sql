-- A quotation may be prepared before a customer has provided a phone number.
alter table public.poloko_customers
  alter column phone drop not null;
