import { createClient, createAdminClient } from "@/lib/supabase/server";
import { rateLimit, clientIp, tooMany } from "@/lib/ratelimit";

/**
 * POST /api/register  { userId, role, phone?, city?, province?, country? }
 * Sets the role chosen at signup and, for volunteers, their contact and
 * location details. Only allowed to set 'staff' or 'volunteer' (never 'admin'),
 * and only on a fresh default profile (role still 'staff' and no centre linked),
 * so it can't be used to flip established accounts.
 *
 * Called during signup, sometimes before the email is confirmed (no session
 * yet), so it can't hard-require auth. Defenses: rate limiting, and — when the
 * caller IS authenticated — they may only register their own account.
 */
export async function POST(req: Request) {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return Response.json({ ok: false, reason: "no-db" });
  }
  if (!(await rateLimit(`register:${clientIp(req)}`, 10, 300))) return tooMany();

  let body: {
    userId?: string;
    role?: string;
    phone?: string;
    city?: string;
    province?: string;
    country?: string;
  };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid request" }, { status: 400 });
  }

  const { userId, role } = body;
  if (!userId || (role !== "staff" && role !== "volunteer")) {
    return Response.json({ error: "Invalid role" }, { status: 400 });
  }

  // If the caller has a session, they may only register their own account.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user && user.id !== userId) {
    return Response.json({ error: "Not allowed" }, { status: 403 });
  }

  const update: Record<string, unknown> = { role };
  if (role === "volunteer") {
    const clean = (v?: string) => v?.trim().slice(0, 120) || null;
    update.phone = clean(body.phone);
    update.city = clean(body.city);
    update.province = clean(body.province);
    update.country = clean(body.country);
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from("profiles")
    .update(update)
    .eq("id", userId)
    .eq("role", "staff")
    .is("centre_id", null);

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ ok: true });
}
