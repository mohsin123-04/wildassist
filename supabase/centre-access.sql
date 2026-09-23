-- Centre access control: join codes + lock down self-assignment.
-- Run in the Supabase SQL editor. Idempotent.

-- Secret per-centre join codes. RLS on with no policies => only the service
-- role (server side) can read them; anon/authenticated cannot.
create table if not exists public.centre_codes (
  centre_id text primary key references public.centres(id) on delete cascade,
  code text not null
);
alter table public.centre_codes enable row level security;

-- Demo codes. In production each centre would set and distribute its own.
insert into public.centre_codes (centre_id, code) values
  ('toronto-wildlife-centre','TWC-2026'),
  ('shades-of-hope','SOH-2026'),
  ('procyon-wildlife','PROC-2026'),
  ('sandy-pines','SANDY-2026'),
  ('aspen-valley','ASPEN-2026'),
  ('woodlands','WOOD-2026'),
  ('rideau-valley','RIDEAU-2026'),
  ('salthaven','SALT-2026')
on conflict (centre_id) do nothing;

-- Prevent a signed-in user from changing their own centre_id or role directly.
-- The verified /api/join-centre route uses the service role (auth.uid() is null),
-- which is allowed through.
create or replace function public.protect_profile_fields()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if (new.centre_id is distinct from old.centre_id
      or new.role is distinct from old.role)
     and auth.uid() is not null then
    raise exception 'centre and role can only be changed through a verified action';
  end if;
  return new;
end; $$;

drop trigger if exists profiles_protect_fields on public.profiles;
create trigger profiles_protect_fields
  before update on public.profiles
  for each row execute function public.protect_profile_fields();
