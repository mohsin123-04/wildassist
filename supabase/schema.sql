-- WildAssist database schema
-- Run this in the Supabase SQL editor (Dashboard -> SQL Editor -> New query).
-- Safe to re-run: it drops and recreates policies.

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table if not exists public.centres (
  id        text primary key,
  name      text not null,
  town      text not null,
  lat       double precision not null,
  lng       double precision not null,
  takes     text[] not null default '{}',
  phone     text,
  website   text,
  notes     text,
  created_at timestamptz not null default now()
);

-- One profile per authenticated user. Links a staff member to their centre.
create table if not exists public.profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  full_name  text,
  role       text not null default 'staff' check (role in ('staff', 'admin')),
  centre_id  text references public.centres(id) on delete set null,
  created_at timestamptz not null default now()
);

-- A logged triage. Anyone can create one; centre staff read theirs.
create table if not exists public.cases (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  animal      text not null,
  situation   text not null,
  description text,
  verdict     text not null,
  title       text,
  lat         double precision,
  lng         double precision,
  centre_id   text references public.centres(id) on delete set null,
  status      text not null default 'reported'
                check (status in ('reported', 'in_transit', 'at_centre', 'closed'))
);

create index if not exists cases_centre_id_idx on public.cases (centre_id);
create index if not exists cases_created_at_idx on public.cases (created_at desc);

-- ---------------------------------------------------------------------------
-- Auto-create a profile when a new user signs up
-- ---------------------------------------------------------------------------

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, new.raw_user_meta_data ->> 'full_name');
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

alter table public.centres  enable row level security;
alter table public.profiles enable row level security;
alter table public.cases    enable row level security;

-- Centres: readable by everyone (public triage needs them).
drop policy if exists "centres are public" on public.centres;
create policy "centres are public"
  on public.centres for select
  using (true);

-- Profiles: a user can see and update only their own row.
drop policy if exists "own profile readable" on public.profiles;
create policy "own profile readable"
  on public.profiles for select
  using (auth.uid() = id);

drop policy if exists "own profile updatable" on public.profiles;
create policy "own profile updatable"
  on public.profiles for update
  using (auth.uid() = id);

-- Cases: anyone (even anonymous) can log one.
drop policy if exists "anyone can report a case" on public.cases;
create policy "anyone can report a case"
  on public.cases for insert
  with check (true);

-- Cases: staff can read cases assigned to their own centre.
drop policy if exists "staff read their centre cases" on public.cases;
create policy "staff read their centre cases"
  on public.cases for select
  using (
    centre_id in (
      select centre_id from public.profiles where id = auth.uid()
    )
  );

-- Cases: staff can update the status of their own centre's cases.
drop policy if exists "staff update their centre cases" on public.cases;
create policy "staff update their centre cases"
  on public.cases for update
  using (
    centre_id in (
      select centre_id from public.profiles where id = auth.uid()
    )
  );
