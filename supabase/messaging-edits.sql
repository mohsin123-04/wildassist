-- Message edit + soft delete. Additive and backwards-compatible.
-- Run once in the Supabase SQL editor.

alter table public.messages
  add column if not exists edited_at timestamptz;

alter table public.messages
  add column if not exists deleted_at timestamptz;

-- Let a sender edit or soft-delete their own messages (and nobody else's).
drop policy if exists "edit own messages" on public.messages;

create policy "edit own messages" on public.messages
  for update using (sender_id = auth.uid())
  with check (sender_id = auth.uid());
