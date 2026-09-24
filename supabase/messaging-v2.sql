-- Messaging hardening: race-proof DMs + unread tracking.
-- Short lines to avoid paste corruption. Run the whole block.

-- A canonical key for a 1:1 DM (sorted pair of user ids) so a duplicate
-- DM can never be created, even with concurrent requests.
alter table public.conversations
  add column if not exists dm_key text;

create unique index if not exists conversations_dm_key_idx
  on public.conversations (dm_key);

-- Per-user read state for unread badges.
create table if not exists public.conversation_reads (
  conversation_id uuid references public.conversations(id) on delete cascade,
  user_id uuid,
  last_read timestamptz not null default now(),
  primary key (conversation_id, user_id)
);

alter table public.conversation_reads enable row level security;

create policy "own reads select" on public.conversation_reads
  for select using (user_id = auth.uid());

create policy "own reads insert" on public.conversation_reads
  for insert with check (user_id = auth.uid());

create policy "own reads update" on public.conversation_reads
  for update using (user_id = auth.uid());
