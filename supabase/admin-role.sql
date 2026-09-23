-- Admin role: admins can see (and update) every case province-wide.
-- Run in the Supabase SQL editor. Replaces the area-only visibility function.

create or replace function public.staff_can_see_case(
  c_centre text, c_lat double precision, c_lng double precision
) returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from profiles p
    left join centres ce on ce.id = p.centre_id
    where p.id = auth.uid() and (
      p.role = 'admin'                           -- admins see everything
      or (p.centre_id is not null and (
        c_centre = p.centre_id
        or c_centre is null
        or (c_lat is not null and c_lng is not null and ce.lat is not null
            and public.km_between(c_lat, c_lng, ce.lat, ce.lng) <= 150)
      ))
    )
  );
$$;
