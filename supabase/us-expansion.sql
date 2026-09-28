-- North America expansion: country + state/province on facilities so the app
-- can serve the US and Canada. Additive. Run once in the SQL editor.

alter table public.centres
  add column if not exists country text;

alter table public.centres
  add column if not exists state text;

-- Everything seeded so far is Canadian.
update public.centres
  set country = 'Canada'
  where country is null;
