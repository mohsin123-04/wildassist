-- Case audit trail: log every case status change (who + when).
-- Additive and backwards-compatible. Run once in the Supabase SQL editor.

create table if not exists public.case_events (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null
    references public.cases(id) on delete cascade,
  actor_id uuid,
  actor_name text,
  from_status text,
  to_status text not null,
  created_at timestamptz not null default now()
);

create index if not exists case_events_case_idx
  on public.case_events (case_id, created_at);

create or replace function public.audit_case_status()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status is distinct from old.status then
    insert into public.case_events
      (case_id, actor_id, actor_name, from_status, to_status)
    values (
      new.id,
      auth.uid(),
      coalesce(
        (select full_name from public.profiles
           where id = auth.uid()),
        new.driver_name
      ),
      old.status,
      new.status
    );
  end if;
  return new;
end;
$$;

drop trigger if exists case_status_audit on public.cases;

create trigger case_status_audit
  after update on public.cases
  for each row
  execute function public.audit_case_status();

alter table public.case_events enable row level security;

drop policy if exists "read events for visible cases"
  on public.case_events;

create policy "read events for visible cases"
  on public.case_events for select
  using (
    exists (
      select 1 from public.cases c
      where c.id = case_events.case_id
        and public.staff_can_see_case(c.centre_id, c.lat, c.lng)
    )
  );
