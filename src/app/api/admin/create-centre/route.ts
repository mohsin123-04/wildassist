import { createClient, createAdminClient } from "@/lib/supabase/server";
import type { AnimalType } from "@/lib/triage";

function genCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = crypto.getRandomValues(new Uint8Array(6));
  const s = Array.from(bytes, (b) => chars[b % chars.length]).join("");
  return `${s.slice(0, 3)}-${s.slice(3)}`;
}

function slugify(name: string): string {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40) || "centre"
  );
}

const VALID_TAKES: AnimalType[] = ["bird", "mammal", "reptile", "amphibian", "fish"];

/**
 * POST /api/admin/create-centre  (admin only)
 * Body: { name, address, takes[], phone?, website?, managerEmail? }
 * Geocodes the address, creates the centre + a join code, and records the
 * designated manager's email.
 */
export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Not signed in" }, { status: 401 });

  const { data: me } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (me?.role !== "admin") {
    return Response.json({ error: "Admins only" }, { status: 403 });
  }

  let body: {
    name?: string;
    address?: string;
    takes?: string[];
    phone?: string;
    website?: string;
    managerEmail?: string;
    type?: string;
    directoryOnly?: boolean;
  };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid request" }, { status: 400 });
  }

  const name = body.name?.trim();
  const address = body.address?.trim();
  if (!name || !address) {
    return Response.json({ error: "Name and address are required" }, {
      status: 400,
    });
  }
  const takes = (body.takes ?? []).filter((t): t is AnimalType =>
    VALID_TAKES.includes(t as AnimalType)
  );

  // Geocode the address (OpenStreetMap Nominatim, free, no key).
  let lat: number, lng: number, town: string;
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=ca&q=${encodeURIComponent(
        address
      )}`,
      { headers: { "User-Agent": "WildAssist/1.0 (wildlife rescue app)" } }
    );
    const results = await res.json();
    if (!Array.isArray(results) || results.length === 0) {
      return Response.json(
        { error: "Couldn't find that address. Try adding the city and province." },
        { status: 400 }
      );
    }
    lat = parseFloat(results[0].lat);
    lng = parseFloat(results[0].lon);
    // Use the first part of the display name as a short town label.
    const parts = String(results[0].display_name).split(",");
    town = (parts[1] ?? parts[0] ?? "").trim();
  } catch {
    return Response.json({ error: "Address lookup failed. Try again." }, {
      status: 502,
    });
  }

  const admin = createAdminClient();

  // Unique id from the name.
  let id = slugify(name);
  const { data: existing } = await admin
    .from("centres")
    .select("id")
    .eq("id", id)
    .maybeSingle();
  if (existing) id = `${id}-${genCode().replace("-", "").slice(0, 4).toLowerCase()}`;

  const VALID_TYPES = [
    "rehab_centre",
    "vet",
    "animal_hospital",
    "humane_society",
    "hotline",
    "sanctuary",
  ];
  const type = VALID_TYPES.includes(body.type ?? "")
    ? body.type
    : "rehab_centre";
  const directoryOnly = body.directoryOnly === true;

  const { error: insErr } = await admin.from("centres").insert({
    id,
    name,
    town: town || address,
    lat,
    lng,
    takes,
    phone: body.phone?.trim() || null,
    website: body.website?.trim() || null,
    // Directory listings have no accounts, so no manager.
    manager_email: directoryOnly
      ? null
      : body.managerEmail?.trim().toLowerCase() || null,
    type,
    directory_only: directoryOnly,
  });
  if (insErr) return Response.json({ error: insErr.message }, { status: 500 });

  // Directory listings do not get a join code (no staff accounts).
  let code: string | null = null;
  if (!directoryOnly) {
    code = genCode();
    await admin.from("centre_codes").upsert({ centre_id: id, code });
  }

  return Response.json({ id, name, town, lat, lng, code, directoryOnly });
}
