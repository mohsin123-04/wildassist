-- Photo sharing in messages. Additive. Run once in the SQL editor.

alter table public.messages
  add column if not exists image_url text;
