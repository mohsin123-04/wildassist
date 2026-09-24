-- WildAssist messaging: main channel + DMs + group chats.
-- Every line kept short to avoid paste corruption. Run the whole block.

create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  centre_id text references public.centres(id) on delete cascade,
  kind text not null default 'group',
  title text,
  created_by uuid,
  created_at timestamptz not null default now()
);

create table if not exists public.conversation_members (
  conversation_id uuid references public.conversations(id) on delete cascade,
  user_id uuid,
  primary key (conversation_id, user_id)
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid references public.conversations(id) on delete cascade,
  sender_id uuid,
  sender_name text,
  body text not null,
  created_at timestamptz not null default now()
);

create or replace function public.can_access_conversation(conv uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select
    exists (
      select 1 from conversations c
      where c.id = conv
        and c.kind = 'channel'
        and c.centre_id = (
          select centre_id from profiles where id = auth.uid()
        )
    )
    or exists (
      select 1 from conversation_members cm
      where cm.conversation_id = conv
        and cm.user_id = auth.uid()
    );
$$;

alter table public.conversations enable row level security;
alter table public.conversation_members enable row level security;
alter table public.messages enable row level security;

create policy "read conversations" on public.conversations
  for select using (public.can_access_conversation(id));

create policy "read conv members" on public.conversation_members
  for select using (public.can_access_conversation(conversation_id));

create policy "read messages" on public.messages
  for select using (public.can_access_conversation(conversation_id));

create policy "send messages" on public.messages
  for insert with check (
    sender_id = auth.uid()
    and public.can_access_conversation(conversation_id)
  );

alter publication supabase_realtime add table public.messages;
