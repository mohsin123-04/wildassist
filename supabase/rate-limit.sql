-- Rate limiting store + atomic check. Short lines to avoid paste corruption.

create table if not exists public.rate_limits (
  bucket text primary key,
  count int not null default 0,
  reset_at timestamptz not null
);

-- RLS on with no policies: only the security-definer function / service role
-- can touch this table; clients cannot read or write it directly.
alter table public.rate_limits enable row level security;

create or replace function public.check_rate_limit(
  p_bucket text,
  p_max int,
  p_window int
) returns boolean
language plpgsql security definer set search_path = public as $$
declare
  v_count int;
  v_reset timestamptz;
begin
  select count, reset_at into v_count, v_reset
    from rate_limits where bucket = p_bucket for update;

  if not found or v_reset < now() then
    insert into rate_limits (bucket, count, reset_at)
      values (p_bucket, 1, now() + make_interval(secs => p_window))
      on conflict (bucket) do update
        set count = 1, reset_at = now() + make_interval(secs => p_window);
    return true;
  end if;

  if v_count >= p_max then
    return false;
  end if;

  update rate_limits set count = count + 1 where bucket = p_bucket;
  return true;
end;
$$;
