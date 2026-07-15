create table if not exists public.poloko_activity_log (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null,
  entity_id uuid not null,
  action text not null,
  old_status text,
  new_status text,
  description text not null,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now()
);

create index if not exists poloko_activity_log_created_at_idx
  on public.poloko_activity_log(created_at desc);
create index if not exists poloko_activity_log_entity_idx
  on public.poloko_activity_log(entity_type, entity_id);

alter table public.poloko_activity_log enable row level security;
drop policy if exists "Authenticated users view activity" on public.poloko_activity_log;
create policy "Authenticated users view activity"
  on public.poloko_activity_log for select to authenticated using (true);

create or replace function public.log_poloko_admin_activity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  entity_label text := tg_table_name;
  old_state text;
  new_state text;
begin
  if tg_op = 'UPDATE' then
    old_state := to_jsonb(old)->>'status';
    new_state := to_jsonb(new)->>'status';
    if old_state is not distinct from new_state then return new; end if;
  else
    new_state := to_jsonb(new)->>'status';
  end if;

  insert into public.poloko_activity_log (
    entity_type, entity_id, action, old_status, new_status, description
  ) values (
    entity_label,
    new.id,
    lower(tg_op),
    old_state,
    new_state,
    case
      when tg_op = 'INSERT' then entity_label || ' created'
      else entity_label || ' status changed from ' || coalesce(old_state, 'none') || ' to ' || coalesce(new_state, 'none')
    end
  );
  return new;
end;
$$;

do $$
declare table_name text;
begin
  foreach table_name in array array['poloko_leads', 'poloko_quotes', 'poloko_payments', 'poloko_orders']
  loop
    execute format('drop trigger if exists log_admin_activity on public.%I', table_name);
    execute format('create trigger log_admin_activity after insert or update on public.%I for each row execute function public.log_poloko_admin_activity()', table_name);
  end loop;
end;
$$;

