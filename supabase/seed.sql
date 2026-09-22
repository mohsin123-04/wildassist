-- Seed Ontario wildlife centres. Run after schema.sql.
-- Re-runnable: upserts on id.

insert into public.centres (id, name, town, lat, lng, takes, phone, website, notes) values
  ('toronto-wildlife-centre', 'Toronto Wildlife Centre', 'Toronto (Downsview Park)', 43.7315, -79.476, '{bird,mammal,reptile}', '416-631-0662', 'https://www.torontowildlifecentre.com', 'Canada''s largest wildlife centre. Operates a wildlife hotline.'),
  ('shades-of-hope', 'Shades of Hope Wildlife Refuge', 'Pefferlaw', 44.323, -79.183, '{bird,mammal,reptile}', null, 'https://www.shadesofhope.ca', null),
  ('procyon-wildlife', 'Procyon Wildlife', 'Beeton', 44.082, -79.79, '{mammal}', null, 'https://procyonwildlife.com', null),
  ('sandy-pines', 'Sandy Pines Wildlife Centre', 'Napanee', 44.25, -76.95, '{bird,mammal,reptile}', null, 'https://sandypineswildlife.org', null),
  ('aspen-valley', 'Aspen Valley Wildlife Sanctuary', 'Rosseau (Muskoka)', 45.19, -79.55, '{mammal}', null, 'https://aspenvalley.ca', null),
  ('woodlands', 'Woodlands Wildlife Sanctuary', 'Minden', 44.925, -78.72, '{mammal}', null, 'https://www.woodlandswildlife.ca', null),
  ('rideau-valley', 'Rideau Valley Wildlife Sanctuary', 'Oxford Mills (near Ottawa)', 44.98, -75.68, '{bird,mammal,reptile}', null, 'https://www.rideauvalleywildlife.ca', null),
  ('salthaven', 'Salthaven Wildlife Rehabilitation & Education Centre', 'Mount Brydges (near London)', 42.9, -81.48, '{bird,mammal,reptile}', null, 'https://www.salthaven.org', null)
on conflict (id) do update set
  name = excluded.name,
  town = excluded.town,
  lat = excluded.lat,
  lng = excluded.lng,
  takes = excluded.takes,
  phone = excluded.phone,
  website = excluded.website,
  notes = excluded.notes;
