import { NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { SITUATIONS, type AnimalType } from "@/lib/triage";
import { rankCentres, type Centre } from "@/lib/centres";

/**
 * POST /api/cases
 * Logs a completed triage as a case. Writes go through the server (service
 * role) so the public never touches the database directly. When coordinates are
 * provided, the case is auto-routed to the nearest suitable centre.
 * Body: { animal, category?, situation, description?, verdict, title?, lat?, lng?, photoUrl? }
 * Returns: { id, centre } where centre is the assigned centre (or null).
 */
export async function POST(req: NextRequest) {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return Response.json({ ok: false, reason: "no-db" });
  }

  let body: {
    animal?: string;
    category?: AnimalType;
    situation?: string;
    description?: string;
    verdict?: string;
    title?: string;
    lat?: number;
    lng?: number;
    photoUrl?: string;
  };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const {
    animal,
    category,
    situation,
    description = "",
    verdict,
    title,
    lat,
    lng,
    photoUrl,
  } = body;

  const animalOk =
    typeof animal === "string" && animal.trim().length > 0 && animal.length <= 60;
  const situationOk = SITUATIONS.some((s) => s.value === situation);
  const verdictOk = ["leave", "help", "uncertain"].includes(verdict ?? "");
  if (!animalOk || !situationOk || !verdictOk) {
    return Response.json({ error: "Invalid case data" }, { status: 400 });
  }

  const supabase = createAdminClient();

  // Auto-route to the nearest suitable centre when we have coordinates.
  let assignedCentre: Pick<
    Centre,
    "id" | "name" | "town" | "phone" | "website"
  > | null = null;
  if (typeof lat === "number" && typeof lng === "number") {
    const { data: centres } = await supabase
      .from("centres")
      .select("id, name, town, lat, lng, takes, phone, website");
    if (centres && centres.length) {
      const ranked = rankCentres(lat, lng, category, centres as Centre[]);
      const top = ranked[0];
      if (top) {
        assignedCentre = {
          id: top.id,
          name: top.name,
          town: top.town,
          phone: top.phone,
          website: top.website,
        };
      }
    }
  }

  const { data, error } = await supabase
    .from("cases")
    .insert({
      animal: animal!.trim(),
      situation,
      description,
      verdict,
      title,
      lat: typeof lat === "number" ? lat : null,
      lng: typeof lng === "number" ? lng : null,
      centre_id: assignedCentre?.id ?? null,
      photo_url: typeof photoUrl === "string" ? photoUrl : null,
    })
    .select("id")
    .single();

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
  return Response.json({ id: data.id, centre: assignedCentre });
}
