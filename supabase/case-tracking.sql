-- Public report tracking: an unguessable token per case so the finder can
-- follow its status without an account. Additive. Run once in the SQL editor.

alter table public.cases
  add column if not exists track_token text;

create unique index if not exists cases_track_token_idx
  on public.cases (track_token);
