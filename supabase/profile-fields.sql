-- Adds richer profile fields. Run in the Supabase SQL editor.
-- Re-runnable (idempotent).

alter table public.profiles
  add column if not exists title        text,
  add column if not exists phone        text,
  add column if not exists bio          text,
  add column if not exists avatar_url   text,
  add column if not exists avatar_color text;
