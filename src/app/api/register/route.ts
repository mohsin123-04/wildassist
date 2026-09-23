import { createAdminClient } from "@/lib/supabase/server";

/**
 * POST /api/register  { userId, role }
 * Sets the role chosen at signup. Only allowed to set 'staff' or 'volunteer'
 * (never 'admin'), and only on a fresh default profile (role still 'staff' and
 * no centre linked), so it can't be used to flip established accounts.
 */
export async function POST(req: Request) {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return Response.json({ ok: false, reason: "no-db" });
  }

  let body: { userId?: string; role?: string };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid request" }, { status: 400 });
  }

  const { userId, role } = body;
  if (!userId || (role !== "staff" && role !== "volunteer")) {
    return Response.json({ error: "Invalid role" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from("profiles")
    .update({ role })
    .eq("id", userId)
    .eq("role", "staff")
    .is("centre_id", null);

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ ok: true });
}
