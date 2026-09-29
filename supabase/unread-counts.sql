-- Unread message counts computed in SQL (one row per conversation) instead of
-- pulling every message into the API to count in JS. Called by /api/conversations
-- with the caller's already-access-checked conversation ids, so it only counts.
-- Idempotent; run in the Supabase SQL editor. (Until it's applied, the API falls
-- back to the JS count automatically.)

create or replace function public.unread_counts(p_user uuid, p_conv uuid[])
returns table(conversation_id uuid, cnt bigint)
language sql stable security definer set search_path = public as $$
  select m.conversation_id, count(*)::bigint
  from public.messages m
  left join public.conversation_reads cr
    on cr.conversation_id = m.conversation_id and cr.user_id = p_user
  where m.conversation_id = any(p_conv)
    and m.sender_id is distinct from p_user
    and m.created_at > coalesce(cr.last_read, 'epoch'::timestamptz)
  group by m.conversation_id;
$$;
