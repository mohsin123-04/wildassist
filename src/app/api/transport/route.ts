import { createClient, createAdminClient } from "@/lib/supabase/server";

/**
 * POST /api/transport  { caseId, action }
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
    .select("role, full_name")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "volunteer") {
    return Response.json({ error: "Volunteers only" }, { status: 403 });
  }

  let body: { caseId?: string; action?: "claim" | "deliver" | "release" };
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
