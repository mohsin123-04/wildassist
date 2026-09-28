import { NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

/**
 * PATCH /api/cases/[id]
 * Public, server-side (service role) partial update of a case the visitor just
 * created: the nearest centre + coordinates, and/or their contact details so
 * the centre can follow up. Ownership is proven by the case's track_token (the
 * unguessable token handed to the finder at report time), so a caller can only
 * update their own report, not an arbitrary case by id.
 * Body (all optional except token): { token, centreId, lat, lng, reporterName, reporterPhone }
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return Response.json({ ok: false, reason: "no-db" });
  }

  const { id } = await params;

  let body: {
    token?: string;
    centreId?: string;
    lat?: number;
    lng?: number;
    reporterName?: string;
    reporterPhone?: string;
  };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const supabase = createAdminClient();

  // Prove ownership: the token must match this case's track_token.
  if (!body.token) {
    return Response.json({ error: "Missing token" }, { status: 401 });
  }
  const { data: owned } = await supabase
    .from("cases")
    .select("id")
    .eq("id", id)
    .eq("track_token", body.token)
    .maybeSingle();
  if (!owned) {
    return Response.json({ error: "Not authorized" }, { status: 403 });
  }

  const update: Record<string, unknown> = {};
  if (typeof body.centreId === "string") update.centre_id = body.centreId;
  if (typeof body.lat === "number") update.lat = body.lat;
  if (typeof body.lng === "number") update.lng = body.lng;
  if (typeof body.reporterName === "string")
    update.reporter_name = body.reporterName.trim().slice(0, 120) || null;
  if (typeof body.reporterPhone === "string")
    update.reporter_phone = body.reporterPhone.trim().slice(0, 60) || null;

  if (Object.keys(update).length === 0) {
    return Response.json({ error: "Nothing to update" }, { status: 400 });
  }

  const { error } = await supabase.from("cases").update(update).eq("id", id);

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
  return Response.json({ ok: true });
}
