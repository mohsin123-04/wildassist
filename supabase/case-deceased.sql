-- Deceased-animal reports.
-- A second KIND of case: not a rehab intake but a wildlife-health surveillance
-- report (dead bird -> possible avian flu, dead bat -> rabies, etc.). These
-- aren't routed to a rehab centre; they're logged with their location and any
-- surveillance flags from src/lib/surveillance.ts so staff see them as a
-- separate queue / map layer.
--
-- Additive and idempotent: safe to run on prod. Existing rows default to
-- 'rescue', so nothing about the live rescue flow changes.

alter table public.cases
  add column if not exists kind text not null default 'rescue';

alter table public.cases
  add column if not exists surveillance text[];

-- Lets the dashboard split rescue vs deceased queues cheaply.
create index if not exists cases_kind_idx
  on public.cases (kind);
