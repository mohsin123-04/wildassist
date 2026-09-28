import { NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { SITUATIONS, type AnimalType } from "@/lib/triage";
import { rankCentres, type Centre } from "@/lib/centres";
import { rateLimit, clientIp, tooMany } from "@/lib/ratelimit";
import { sendEmail, newCaseEmail } from "@/lib/email";
import { findDuplicate, DUP_WINDOW_HOURS } from "@/lib/dedup";

type Admin = ReturnType<typeof createAdminClient>;

// Routing model switch. While this is a demo/portfolio project (access isn't
// sold yet), route to every seeded org so the map stays populated. Flip to true
// to gate routing on real onboarding (org has staff) once access is a paid
// product — see the routing block below.
const ROUTE_ONLY_ONBOARDED = false;

// When ROUTE_ONLY_ONBOARDED is true, don't route to a participant further than
// this. Matches the area a staff member can see (staff_can_see_case, 150 km).
const ROUTE_RADIUS_KM = 150;

/**
 * Email the staff at the centre a new case was routed to. Best-effort: any
 * failure (including no RESEND_API_KEY) is swallowed so it never affects the
 * report being saved. "leave" cases need no action, so they are skipped.
 */
async function notifyCentreStaff(
  admin: Admin,
  centre: { id: string; name: string },
  info: { animal: string; title: string | null; verdict: string },
  origin: string
) {
  try {
    if (info.verdict === "leave") return;
    const { data: staff } = await admin
      .from("profiles")
      .select("id")
      .eq("centre_id", centre.id);
    if (!staff || staff.length === 0) return;

    const emails = (
      await Promise.all(
        staff.map(async (s) => {
          const { data } = await admin.auth.admin.getUserById(s.id);
          return data.user?.email ?? null;
        })
      )
    ).filter((e): e is string => !!e);
    if (emails.length === 0) return;

    const { subject, html, text } = newCaseEmail({
      centreName: centre.name,
      animal: info.animal,
      title: info.title,
      verdict: info.verdict,
      dashboardUrl: `${origin}/dashboard`,
    });
    await sendEmail({ to: emails, subject, html, text });
  } catch {
    // Never let notification problems affect the response.
  }
}

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
  if (!(await rateLimit(`cases:${clientIp(req)}`, 30, 60))) return tooMany();

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

  // Auto-route a report to the nearest organization when we have coordinates.
  //
  // Two models, switched by ROUTE_ONLY_ONBOARDED:
  //  - false (current, demo/pre-sales): any org that isn't a directory-only
  //    listing can receive cases, so the seeded centres keep routing populated.
  //  - true (once access is a paid product): only orgs that have actually
  //    onboarded (have staff) receive cases, and only within ROUTE_RADIUS_KM.
  //    Then an unclaimed centre is treated the same as a vet or hotline: shown
  //    to the finder for reference, not auto-assigned. Flip the one flag.
  let assignedCentre: Pick<
    Centre,
    "id" | "name" | "town" | "phone" | "website"
  > | null = null;
  if (typeof lat === "number" && typeof lng === "number") {
    let claimedIds: string[] | null = null;
    if (ROUTE_ONLY_ONBOARDED) {
      const { data: staffRows } = await supabase
        .from("profiles")
        .select("centre_id")
        .not("centre_id", "is", null);
      claimedIds = [
        ...new Set(
          (staffRows ?? []).map((p) => p.centre_id).filter((id): id is string => !!id)
        ),
      ];
    }

    if (!ROUTE_ONLY_ONBOARDED || (claimedIds && claimedIds.length)) {
      let q = supabase
        .from("centres")
        .select("id, name, town, lat, lng, takes, phone, website")
        .neq("directory_only", true);
      if (ROUTE_ONLY_ONBOARDED && claimedIds) q = q.in("id", claimedIds);
      const { data: centres } = await q;
      const participants = (centres ?? []).filter(
        (c) => c.lat != null && c.lng != null
      );
      if (participants.length) {
        const ranked = rankCentres(lat, lng, category, participants as Centre[]);
        const top = ranked[0];
        const inRange = !ROUTE_ONLY_ONBOARDED || top.distanceKm <= ROUTE_RADIUS_KM;
        if (top && inRange) {
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
  }

  // Possible duplicate: an open report of the same kind of animal, nearby, in
  // the recent window. Fuzzy animal matching (so "baby raccoon" matches
  // "raccoon") and the radius/window live in lib/dedup. Flag it so staff can
  // merge or dismiss rather than dispatching twice for one animal.
  let duplicateOf: string | null = null;
  if (typeof lat === "number" && typeof lng === "number") {
    const since = new Date(
      Date.now() - DUP_WINDOW_HOURS * 60 * 60 * 1000
    ).toISOString();
    const { data: recent } = await supabase
      .from("cases")
      .select("id, animal, lat, lng")
      .neq("status", "closed")
      .gte("created_at", since)
      .not("lat", "is", null);
    duplicateOf = findDuplicate(
      { lat, lng, animal: animal!.trim() },
      recent ?? []
    );
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
      duplicate_of: duplicateOf,
    })
    .select("id")
    .single();

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  // Let the receiving centre's staff know (dormant without RESEND_API_KEY).
  if (assignedCentre) {
    await notifyCentreStaff(
      supabase,
      { id: assignedCentre.id, name: assignedCentre.name },
      { animal: animal!.trim(), title: title ?? null, verdict: verdict! },
      req.nextUrl.origin
    );
  }

  return Response.json({ id: data.id, centre: assignedCentre });
}
