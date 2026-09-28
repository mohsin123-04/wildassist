-- Whether a facility can accept rabies-vector species (raccoons, bats, skunks,
-- foxes), which need special permits many rehabbers don't have. Additive.
-- true = accepts them, false = does not, null = unknown. Run once.

alter table public.centres
  add column if not exists rabies_vector boolean;
