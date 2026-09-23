-- Area-based case visibility + unassigned safety net. Run in the SQL editor.
-- Staff see: their centre's cases, any case within 150 km of their centre,
-- and all unassigned cases (centre_id is null).

-- Great-circle distance in kilometres.
create or replace function public.km_between(
  lat1 double precision, lng1 double precision,
  lat2 double precision, lng2 double precision
) returns double precision language sql immutable as $$
  select 6371 * 2 * asin(sqrt(
    power(sin(radians(lat2 - lat1) / 2), 2) +
    cos(radians(lat1)) * cos(radians(lat2)) *
    power(sin(radians(lng2 - lng1) / 2), 2)
  ));
$$;

-- Whether the current signed-in staff member may see a given case.
create or replace function public.staff_can_see_case(
  c_centre text, c_lat double precision, c_lng double precision
) returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from profiles p
    left join centres ce on ce.id = p.centre_id
    where p.id = auth.uid() and p.centre_id is not null and (
      c_centre = p.centre_id
      or c_centre is null
      or (c_lat is not null and c_lng is not null and ce.lat is not null
          and public.km_between(c_lat, c_lng, ce.lat, ce.lng) <= 150)
    )
  );
$$;

drop policy if exists "staff read their centre cases" on public.cases;
create policy "staff read area cases" on public.cases for select
  using (public.staff_can_see_case(centre_id, lat, lng));

drop policy if exists "staff update their centre cases" on public.cases;
create policy "staff update area cases" on public.cases for update
  using (public.staff_can_see_case(centre_id, lat, lng))
  with check (public.staff_can_see_case(centre_id, lat, lng));
