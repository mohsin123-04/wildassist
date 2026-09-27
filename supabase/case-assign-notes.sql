-- Case assignment + running notes log. Additive. Run once in the SQL editor.

-- Who on the team owns this case (nullable; a centre teammate).
alter table public.cases
  add column if not exists assigned_to uuid;

-- A running, append-only log of staff notes (replaces the single textarea).
create table if not exists public.case_notes (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null
    references public.cases(id) on delete cascade,
  author_id uuid,
  author_name text,
  body text not null,
  created_at timestamptz not null default now()
);

create index if not exists case_notes_case_idx
  on public.case_notes (case_id, created_at);

alter table public.case_notes enable row level security;

-- Read notes for any case you can already see.
drop policy if exists "read notes for visible cases"
  on public.case_notes;

create policy "read notes for visible cases"
  on public.case_notes for select
  using (
    exists (
      select 1 from public.cases c
      where c.id = case_notes.case_id
        and public.staff_can_see_case(c.centre_id, c.lat, c.lng)
    )
  );

-- Add a note (as yourself) to any case you can see.
drop policy if exists "add notes to visible cases"
  on public.case_notes;

create policy "add notes to visible cases"
  on public.case_notes for insert
  with check (
    author_id = auth.uid()
    and exists (
      select 1 from public.cases c
      where c.id = case_notes.case_id
        and public.staff_can_see_case(c.centre_id, c.lat, c.lng)
    )
  );
