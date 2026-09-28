-- Duplicate-report detection.
-- When a new report matches an open case for the same kind of animal, nearby and
-- recent (see src/lib/dedup.ts), the API stores the original's id here so staff
-- can merge or dismiss instead of dispatching twice. NULL = not a duplicate.
--
-- Additive and idempotent: safe to run on prod even though the column was added
-- ad-hoc earlier — this just captures it as a migration for reproducibility.

alter table public.cases
  add column if not exists duplicate_of uuid references public.cases(id) on delete set null;

-- Speeds up "find the original" lookups and duplicate filtering.
create index if not exists cases_duplicate_of_idx
  on public.cases (duplicate_of)
  where duplicate_of is not null;
