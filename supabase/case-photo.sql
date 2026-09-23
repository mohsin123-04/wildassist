-- Adds a photo attachment to cases. Run in the Supabase SQL editor.
alter table public.cases add column if not exists photo_url text;
