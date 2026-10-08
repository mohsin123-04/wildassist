-- Add the 'surveillance' role for wildlife health officers who monitor deceased
-- animal reports. Idempotent; safe to run on prod and staging.

-- 1. Extend the role check constraint.
alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles add constraint profiles_role_check
  check (role in ('staff', 'manager', 'admin', 'volunteer', 'surveillance'));

-- 2. RLS: surveillance users can read all deceased cases (no centre scope needed).
--    Existing policies (staff read area cases) are unaffected; Postgres ORs policies.
drop policy if exists "surveillance read deceased cases" on public.cases;
create policy "surveillance read deceased cases" on public.cases for select
  using (
    kind = 'deceased'
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'surveillance'
    )
  );
