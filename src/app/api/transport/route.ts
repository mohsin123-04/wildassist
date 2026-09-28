import { createClient, createAdminClient } from "@/lib/supabase/server";
import { haversineKm } from "@/lib/centres";

// Matches the browse-feed radius in /api/transport/jobs.
const CLAIM_RADIUS_KM = 100;

/**
 * POST /api/transport  { caseId, action, lat?, lng? }
 * Volunteer transport actions. Verified server-side (service role) so a
 * volunteer can only claim/deliver/release, not edit arbitrary case fields.
 *  - claim:   assign myself as driver, mark in transit
 *  - deliver: mark delivered to the centre (at_centre)
 *  - release: drop the job so another volunteer can take it
 */
export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Not signed in" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, full_name, volunteer_approved")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "volunteer") {
    return Response.json({ error: "Volunteers only" }, { status: 403 });
  }
  if (!profile.volunteer_approved) {
    return Response.json(
      { error: "Your volunteer account is pending approval." },
      { status: 403 }
    );
  }

  let body: {
    caseId?: string;
    action?: "claim" | "deliver" | "release";
    lat?: number;
    lng?: number;
  };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid request" }, { status: 400 });
  }
  const { caseId, action } = body;
  if (!caseId || !action) {
    return Response.json({ error: "Missing fields" }, { status: 400 });
  }

  const admin = createAdminClient();
  let query;

  if (action === "claim") {
    // A claim is only allowed from within the volunteer's area (same radius as
    // the browse feed), so a volunteer can't grab a case anywhere in the country
    // by id to harvest the finder's contact details.
    if (typeof body.lat !== "number" || typeof body.lng !== "number") {
      return Response.json(
        { error: "Turn on location to claim a pickup." },
        { status: 400 }
      );
    }
    const { data: target } = await admin
      .from("cases")
      .select("lat, lng")
      .eq("id", caseId)
      .single();
    if (
      target?.lat != null &&
      target?.lng != null &&
      haversineKm(body.lat, body.lng, target.lat, target.lng) > CLAIM_RADIUS_KM
    ) {
      return Response.json(
        { error: "That pickup is outside your area." },
        { status: 403 }
      );
    }
    query = admin
      .from("cases")
      .update({
        driver_id: user.id,
        driver_name: profile.full_name ?? "A volunteer",
        status: "in_transit",
      })
      .eq("id", caseId)
      .eq("verdict", "help")
      .is("driver_id", null);
  } else if (action === "deliver") {
    query = admin
      .from("cases")
      .update({ status: "at_centre" })
      .eq("id", caseId)
      .eq("driver_id", user.id);
  } else if (action === "release") {
    query = admin
      .from("cases")
      .update({ driver_id: null, driver_name: null, status: "reported" })
      .eq("id", caseId)
      .eq("driver_id", user.id);
  } else {
    return Response.json({ error: "Unknown action" }, { status: 400 });
  }

  const { error } = await query;
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ ok: true });
}
