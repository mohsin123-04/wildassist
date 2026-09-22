import { NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

/**
 * PATCH /api/cases/[id]
 * Attaches the nearest centre (and the reporter's coordinates) to a case once
 * the finder resolves them. Server-side with the service role.
 * Body: { centreId, lat, lng }
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return Response.json({ ok: false, reason: "no-db" });
  }

  const { id } = await params;

  let body: { centreId?: string; lat?: number; lng?: number };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { centreId, lat, lng } = body;
  if (!centreId || typeof lat !== "number" || typeof lng !== "number") {
    return Response.json({ error: "Missing centre or coordinates" }, {
      status: 400,
    });
  }

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("cases")
    .update({ centre_id: centreId, lat, lng })
    .eq("id", id);

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
  return Response.json({ ok: true });
}
