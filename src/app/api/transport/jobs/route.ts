import { NextRequest } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { haversineKm } from "@/lib/centres";

const RADIUS_KM = 100; // volunteers only see jobs within this range of them

/**
 * GET /api/transport/jobs?lat=&lng=
 * Approved volunteers only. Returns a minimal, area-scoped feed:
 *  - available: unclaimed help-cases near the volunteer, WITHOUT reporter PII
 *  - mine: the volunteer's own claimed jobs, WITH reporter contact (they need
 *    it to coordinate the pickup)
 */
export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Not signed in" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, volunteer_approved, full_name")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "volunteer") {
    return Response.json({ error: "Volunteers only" }, { status: 403 });
  }
  if (!profile.volunteer_approved) {
    return Response.json({ approved: false, available: [], mine: [] });
  }

  const admin = createAdminClient();

  // The volunteer's own claimed jobs (include reporter contact).
  const { data: mineRaw } = await admin
    .from("cases")
    .select(
      "id, created_at, animal, title, status, lat, lng, centre_id, reporter_name, reporter_phone"
    )
    .eq("driver_id", user.id)
    .in("status", ["in_transit"])
    .order("created_at", { ascending: false });

  // The volunteer's completed deliveries — a record of their contribution
  // (no reporter PII; the handoff is done).
  const { data: doneRaw } = await admin
    .from("cases")
    .select("id, created_at, animal, title, status, centre_id")
    .eq("driver_id", user.id)
    .in("status", ["at_centre", "closed"])
    .order("created_at", { ascending: false })
    .limit(30);

  // Available unclaimed jobs (NO reporter PII in the browse feed).
  const { data: availRaw } = await admin
    .from("cases")
    .select("id, created_at, animal, title, status, lat, lng, centre_id")
    .eq("verdict", "help")
    .eq("status", "reported")
    .is("driver_id", null)
    .not("lat", "is", null)
    .order("created_at", { ascending: false });

  // Area-scope the available feed to near the volunteer (if they shared location).
  const lat = parseFloat(req.nextUrl.searchParams.get("lat") ?? "");
  const lng = parseFloat(req.nextUrl.searchParams.get("lng") ?? "");
  const hasLoc = Number.isFinite(lat) && Number.isFinite(lng);

  const available = (availRaw ?? [])
    .map((c) => ({
      ...c,
      distanceKm:
        hasLoc && c.lat != null && c.lng != null
          ? haversineKm(lat, lng, c.lat, c.lng)
          : null,
    }))
    .filter((c) => (hasLoc ? (c.distanceKm ?? Infinity) <= RADIUS_KM : true))
    .sort((a, b) => (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity));

  const mine = (mineRaw ?? []).map((c) => ({
    ...c,
    distanceKm:
      hasLoc && c.lat != null && c.lng != null
        ? haversineKm(lat, lng, c.lat, c.lng)
        : null,
  }));

  const completed = (doneRaw ?? []).map((c) => ({ ...c, distanceKm: null }));

  return Response.json({ approved: true, available, mine, completed });
}
