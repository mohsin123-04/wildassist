import { NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { SITUATIONS, type AnimalType } from "@/lib/triage";
import { rankCentres, haversineKm, type Centre } from "@/lib/centres";
import { rateLimit, clientIp, tooMany } from "@/lib/ratelimit";
import { sendEmail, newCaseEmail } from "@/lib/email";
import { sendPushToUsers } from "@/lib/push";
import { findDuplicate, DUP_WINDOW_HOURS } from "@/lib/dedup";
import { detectDanger } from "@/lib/safety";

type Admin = ReturnType<typeof createAdminClient>;

// Human, plural category names for the "why this facility" explanation.
const CATEGORY_PLURAL: Record<string, string> = {
  bird: "birds",
  mammal: "mammals",
  reptile: "reptiles",
  amphibian: "amphibians",
  fish: "fish",
};

// Routing model switch. While this is a demo/portfolio project (access isn't
// sold yet), route to every seeded org so the map stays populated. Flip to true
// to gate routing on real onboarding (org has staff) once access is a paid
// product — see the routing block below.
const ROUTE_ONLY_ONBOARDED = false;

// When ROUTE_ONLY_ONBOARDED is true, don't route to a participant further than
// this. Matches the area a staff member can see (staff_can_see_case, 150 km).
const ROUTE_RADIUS_KM = 150;

/**
 * Notify the staff at the centre a new case was routed to — web push to their
 * registered devices, plus email when configured. Best-effort: any failure
 * (including missing keys) is swallowed so it never affects the report being
 * saved. "leave" cases need no action, so they are skipped.
 */
async function notifyCentreStaff(
  admin: Admin,
  centre: { id: string; name: string },
  info: { animal: string; title: string | null; verdict: string; caseId: string },
  origin: string
) {
  try {
    if (info.verdict === "leave") return;
    const { data: staff } = await admin
      .from("profiles")
      .select("id")
      .eq("centre_id", centre.id);
    if (!staff || staff.length === 0) return;
    const staffIds = staff.map((s) => s.id);

    // Push to every registered device (works even with email dormant).
    await sendPushToUsers(staffIds, {
      title: `New ${info.verdict === "help" ? "urgent " : ""}case: ${info.animal}`,
      body: `${info.title ?? "A new report"} — routed to ${centre.name}. Tap to open.`,
      url: `/dashboard?case=${info.caseId}`,
    });

    const emails = (
      await Promise.all(
        staffIds.map(async (id) => {
          const { data } = await admin.auth.admin.getUserById(id);
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

  // Coerce and cap free-text/URL fields — this endpoint is public, so never
  // trust the client to send well-typed or bounded values.
  const safeDescription =
    typeof description === "string" ? description.slice(0, 2000) : "";
  const safeTitle =
    typeof title === "string" ? title.trim().slice(0, 200) || null : null;
  // Accept either a legacy https URL or a private-bucket storage path
  // (e.g. "<uuid>.jpg" from /api/case-photo). Reject anything else.
  const safePhotoUrl =
    typeof photoUrl === "string" &&
    (/^https:\/\//.test(photoUrl) ||
      /^[a-zA-Z0-9][a-zA-Z0-9._/-]{0,200}\.(png|jpe?g|webp)$/i.test(photoUrl))
      ? photoUrl.slice(0, 300)
      : null;

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
  // A short, honest explanation of the routing choice, shown to the finder.
  let routingNote: string | null = null;
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
        .select("id, name, town, lat, lng, takes, phone, website, rabies_vector")
        .neq("directory_only", true);
      if (ROUTE_ONLY_ONBOARDED && claimedIds) q = q.in("id", claimedIds);
      const { data: centres } = await q;
      const allParticipants = (centres ?? []).filter(
        (c) => c.lat != null && c.lng != null
      );

      // Rabies-vector species (raccoon, bat, skunk, fox) need special permits.
      // Exclude facilities that have said they can't take them; keep unknowns
      // (they get a "call ahead" caveat below).
      const isRabiesVector = !!detectDanger(animal!.trim())?.rabiesVector;
      let participants = allParticipants;
      if (isRabiesVector) {
        const eligible = allParticipants.filter(
          (c) => (c as { rabies_vector?: boolean | null }).rabies_vector !== false
        );
        if (eligible.length) participants = eligible;
      }

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

          // Truthful explanation: look at the ACTUAL closest facility overall.
          // If the chosen one isn't the closest, say why the closest was passed
          // over (can't take this species, or can't take rabies vectors).
          const catP = CATEGORY_PLURAL[category ?? ""] ?? "this animal";
          const topRV = (top as { rabies_vector?: boolean | null }).rabies_vector;
          const nearestOverall = allParticipants
            .map((c) => ({ c, d: haversineKm(lat, lng, c.lat!, c.lng!) }))
            .reduce((a, b) => (b.d < a.d ? b : a)).c;
          const closerExists = nearestOverall.id !== top.id;
          const catKnown = !!category && category !== "unsure";
          const takesCat = (c: { takes?: string[] | null }) =>
            !catKnown || (c.takes ?? []).includes(category as string);
          const nearestTakesCat = takesCat(nearestOverall);
          // Whether the CHOSEN facility actually lists this category. If no
          // nearby facility does, rankCentres ranks them all equally and top is
          // just the closest — so we must not claim it "can take" the animal.
          const topTakesCat = takesCat(top as { takes?: string[] | null });
          const nearestRV = (nearestOverall as { rabies_vector?: boolean | null })
            .rabies_vector;

          if (closerExists && isRabiesVector && nearestRV === false) {
            routingNote = `A closer facility can't take rabies-vector animals like this one, so this went to ${top.name}, the nearest one that can.`;
          } else if (closerExists && !nearestTakesCat && topTakesCat) {
            routingNote = `The closest wildlife facility doesn't take ${catP}, so this went to ${top.name}, the nearest one that does.`;
          } else if (topTakesCat) {
            routingNote = `${top.name} is the nearest wildlife facility that can take ${catP}.`;
          } else {
            routingNote = `No nearby facility lists ${catP}, so this went to ${top.name}, the closest wildlife facility — please call ahead to confirm they can help.`;
          }

          // If we're not certain the chosen facility can take this rabies-vector
          // animal, tell the finder to call ahead.
          if (isRabiesVector && topRV !== true) {
            routingNote +=
              " Because this animal can carry rabies, please call ahead to confirm they can take it before bringing it in.";
          }
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

  // Unguessable token so the finder can follow their report without an account.
  const trackToken = crypto.randomUUID();

  const { data, error } = await supabase
    .from("cases")
    .insert({
      animal: animal!.trim(),
      situation,
      description: safeDescription,
      verdict,
      title: safeTitle,
      lat: typeof lat === "number" ? lat : null,
      lng: typeof lng === "number" ? lng : null,
      centre_id: assignedCentre?.id ?? null,
      photo_url: safePhotoUrl,
      duplicate_of: duplicateOf,
      track_token: trackToken,
    })
    .select("id")
    .single();

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  // Let the receiving centre's staff know (push to registered devices; email
  // too once RESEND_API_KEY is configured).
  if (assignedCentre) {
    await notifyCentreStaff(
      supabase,
      { id: assignedCentre.id, name: assignedCentre.name },
      {
        animal: animal!.trim(),
        title: safeTitle,
        verdict: verdict!,
        caseId: data.id,
      },
      req.nextUrl.origin
    );
  }

  return Response.json({
    id: data.id,
    centre: assignedCentre,
    routingNote,
    trackToken,
  });
}
