import { createClient, createAdminClient } from "@/lib/supabase/server";

/**
 * POST /api/join-centre  { centreId, code }
 * Links the signed-in user to a centre, but only if they provide that centre's
 * secret join code. The code is checked server-side (service role); users can't
 * set their own centre_id directly (a DB trigger blocks that).
 */
export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Not signed in" }, { status: 401 });

  let body: { centreId?: string; code?: string };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid request" }, { status: 400 });
  }

  const { centreId, code } = body;
  if (!centreId || !code) {
    return Response.json({ error: "Pick a centre and enter its code." }, {
      status: 400,
    });
  }

  const admin = createAdminClient();
  const { data: row } = await admin
    .from("centre_codes")
    .select("code")
    .eq("centre_id", centreId)
    .single();

  if (!row || row.code.trim().toLowerCase() !== code.trim().toLowerCase()) {
    return Response.json(
      { error: "That code doesn't match this centre." },
      { status: 403 }
    );
  }

  // The person the admin designated as manager (by email) becomes manager on
  // join; everyone else joins as staff.
  const { data: centre } = await admin
    .from("centres")
    .select("manager_email")
    .eq("id", centreId)
    .single();
  const isDesignatedManager =
    !!centre?.manager_email &&
    !!user.email &&
    centre.manager_email.trim().toLowerCase() === user.email.toLowerCase();
  const role = isDesignatedManager ? "manager" : "staff";

  const { error } = await admin
    .from("profiles")
    .update({ centre_id: centreId, role })
    .eq("id", user.id);
  if (error) return Response.json({ error: error.message }, { status: 500 });

  return Response.json({ ok: true, role });
}
