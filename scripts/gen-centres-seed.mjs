// Generate an idempotent seed file for ALL centres from the live DB, so the full
// US + Canada dataset is reproducible from the repo (not just the live DB).
// Reads Supabase URL + service key from .env.local (never printed).
import { readFileSync, writeFileSync } from "node:fs";

const env = Object.fromEntries(
  readFileSync(new URL("../.env.local", import.meta.url), "utf8")
    .split("\n")
    .filter((l) => l && !l.startsWith("#") && l.includes("="))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, "")];
    })
);

const res = await fetch(
  `${env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/centres?select=id,name,town,lat,lng,takes,phone,website,notes,country,state&order=country.asc,state.asc,name.asc`,
  { headers: { apikey: env.SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}` } }
);
if (!res.ok) {
  console.error("FAILED", res.status, await res.text());
  process.exit(1);
}
const rows = await res.json();

const q = (v) => (v == null ? "null" : `'${String(v).replace(/'/g, "''")}'`);
const arr = (a) =>
  a == null ? "null" : `'{${a.map((x) => `"${String(x).replace(/"/g, '\\"')}"`).join(",")}}'`;
const num = (v) => (v == null ? "null" : String(v));

const values = rows
  .map(
    (r) =>
      `  (${q(r.id)}, ${q(r.name)}, ${q(r.town)}, ${num(r.lat)}, ${num(r.lng)}, ${arr(
        r.takes
      )}, ${q(r.phone)}, ${q(r.website)}, ${q(r.notes)}, ${q(r.country)}, ${q(r.state)})`
  )
  .join(",\n");

const sql = `-- FULL centre dataset: all wildlife centres, vets, and hotlines across the US and
-- Canada. Reproducible seed so a rebuilt DB gets every facility (supersedes the
-- Ontario-only seed.sql for full rebuilds). Re-runnable: upserts on id.
--
-- Data accuracy: every phone number here was verified against the facility's own
-- official source (org site or .gov/.state page) on 2026-09-28. Do not add or edit
-- a number without an official source — people call these in emergencies.
--
-- Regenerate from the live DB with: node scripts/gen-centres-seed.mjs
-- Total facilities: ${rows.length} (${rows.filter((r) => r.phone).length} with a phone number).

insert into public.centres (id, name, town, lat, lng, takes, phone, website, notes, country, state) values
${values}
on conflict (id) do update set
  name = excluded.name,
  town = excluded.town,
  lat = excluded.lat,
  lng = excluded.lng,
  takes = excluded.takes,
  phone = excluded.phone,
  website = excluded.website,
  notes = excluded.notes,
  country = excluded.country,
  state = excluded.state;
`;

writeFileSync(new URL("../supabase/seed-centres-full.sql", import.meta.url), sql);
console.error(`wrote supabase/seed-centres-full.sql (${rows.length} centres)`);
