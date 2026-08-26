-- The formal quotation workflow stores a validity/terms note with each quote.
-- Older live schemas may not yet have this column.

alter table public.poloko_quotes
  add column if not exists notes text;
