-- Adds reporter contact + staff notes to cases, making the dashboard actionable.
-- Run in the Supabase SQL editor. Idempotent.

alter table public.cases
  add column if not exists reporter_name  text,
  add column if not exists reporter_phone text,
  add column if not exists staff_notes    text;
