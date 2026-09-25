-- Case audit trail: log every status change (who + when).
-- Additive and backwards-compatible. Run in the Supabase SQL editor.

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

-- Trigger: on any status change, record it. Runs security definer so it
-- writes regardless of who made the change (staff via RLS client, or a
-- volunteer/system change via the service role). Attributes the actor to the
-- signed-in user when known, else to the driver name set on the case.
create or replace function public.log_case_status_change()
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
  execute function public.log_case_status_change();

-- RLS: a user can read a case's events if they can see the case itself.
-- No insert policy: events are written only by the trigger above.
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
