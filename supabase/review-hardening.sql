-- Hardening from the 2026-09-29 deep feature review. Idempotent; run in the
-- Supabase SQL editor. Safe on prod (additive + policy replacements).

-- ============================================================================
-- 1. CRITICAL: block volunteers from self-approving.
-- The protect_profile_fields trigger guarded role + centre_id but NOT
-- volunteer_approved, so a pending volunteer could UPDATE their own profile
-- (via the anon client) to set volunteer_approved = true and gain access to
-- reporter PII + pickups. Approvals go through /api/admin/volunteers using the
-- service role (auth.uid() is null), which is still allowed.
-- ============================================================================

-- Ensure the column exists (added ad-hoc in prod; captured here for rebuilds).
alter table public.profiles
  add column if not exists volunteer_approved boolean not null default false;

create or replace function public.protect_profile_fields()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if (new.centre_id is distinct from old.centre_id
      or new.role is distinct from old.role
      or new.volunteer_approved is distinct from old.volunteer_approved)
     and auth.uid() is not null then
    raise exception 'centre, role, and approval can only be changed through a verified action';
  end if;
  return new;
end; $$;

-- ============================================================================
-- 2. HIGH: stop cross-centre case writes.
-- "staff update area cases" let staff UPDATE any case within 150 km, including
-- another centre's assigned cases (edit PII, reassign centre_id). Restrict
-- WRITES to a staffer's own centre or unassigned cases; admins keep full write.
-- (Reads are unchanged: staff still SEE their whole area.)
-- ============================================================================

create or replace function public.staff_can_write_case(c_centre text)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from profiles p
    where p.id = auth.uid() and (
      p.role = 'admin'
      or (p.centre_id is not null
          and (c_centre is null or c_centre = p.centre_id))
    )
  );
$$;

drop policy if exists "staff update area cases" on public.cases;
drop policy if exists "staff write own or unassigned cases" on public.cases;
create policy "staff write own or unassigned cases" on public.cases for update
  using (public.staff_can_write_case(centre_id))
  with check (public.staff_can_write_case(centre_id));

-- ============================================================================
-- 3. Reproducibility: columns/constraints added ad-hoc in prod.
-- ============================================================================

-- messages.case_ref (shared-case cards) — used by the app, never migrated.
alter table public.messages
  add column if not exists case_ref jsonb;

-- profiles.role must permit all four roles the app uses.
alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles add constraint profiles_role_check
  check (role in ('staff', 'manager', 'admin', 'volunteer'));

-- ============================================================================
-- 4. Redact already-deleted message content (new deletes are redacted in code).
-- ============================================================================

update public.messages
set body = '', image_url = null, case_ref = null
where deleted_at is not null
  and (body <> '' or image_url is not null or case_ref is not null);

-- ============================================================================
-- 5. LOW: keep a message pinned to its conversation/sender on edit.
-- The "edit own messages" policy allowed a sender to move their message to a
-- different conversation_id. Lock identity fields on update.
-- ============================================================================

create or replace function public.lock_message_identity()
returns trigger language plpgsql as $$
begin
  if new.conversation_id is distinct from old.conversation_id
     or new.sender_id is distinct from old.sender_id then
    raise exception 'a message cannot change its conversation or sender';
  end if;
  return new;
end; $$;

drop trigger if exists messages_lock_identity on public.messages;
create trigger messages_lock_identity
  before update on public.messages
  for each row execute function public.lock_message_identity();
