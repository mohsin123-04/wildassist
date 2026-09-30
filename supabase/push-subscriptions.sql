-- Web-push subscriptions: lets a staff member's installed app receive a
-- notification when a new case is routed to their centre. One row per
-- browser/device subscription. Idempotent; run in the Supabase SQL editor.
--
-- RLS is enabled with NO policies: only the service role (server API) can
-- read or write, so endpoints/keys are never exposed to other users.

create table if not exists public.push_subscriptions (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  endpoint   text not null unique,
  p256dh     text not null,
  auth       text not null,
  created_at timestamptz not null default now()
);

create index if not exists push_subscriptions_user_idx
  on public.push_subscriptions (user_id);

alter table public.push_subscriptions enable row level security;
