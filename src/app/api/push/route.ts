import { createClient, createAdminClient } from "@/lib/supabase/server";
import { rateLimit, clientIp, tooMany } from "@/lib/ratelimit";

/**
 * POST /api/push   { endpoint, keys: { p256dh, auth } }  → register this device
 * DELETE /api/push { endpoint }                          → unregister it
 * Signed-in users only; subscriptions are stored against the session user, so
 * one user can never register (or remove) a device for someone else.
 */
export async function POST(req: Request) {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return Response.json({ ok: false, reason: "no-db" });
  }
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Not signed in" }, { status: 401 });
  if (!(await rateLimit(`push:${clientIp(req)}`, 10, 60))) return tooMany();

  let body: { endpoint?: string; keys?: { p256dh?: string; auth?: string } };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid request" }, { status: 400 });
  }
  const { endpoint, keys } = body;
  if (
    typeof endpoint !== "string" ||
    !/^https:\/\//.test(endpoint) ||
    endpoint.length > 1000 ||
    typeof keys?.p256dh !== "string" ||
    typeof keys?.auth !== "string"
  ) {
    return Response.json({ error: "Invalid subscription" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { error } = await admin.from("push_subscriptions").upsert(
    {
      user_id: user.id,
      endpoint,
      p256dh: keys.p256dh.slice(0, 300),
      auth: keys.auth.slice(0, 100),
    },
    { onConflict: "endpoint" }
  );
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ ok: true });
}

export async function DELETE(req: Request) {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return Response.json({ ok: false, reason: "no-db" });
  }
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Not signed in" }, { status: 401 });

  let body: { endpoint?: string };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid request" }, { status: 400 });
  }
  if (typeof body.endpoint !== "string") {
    return Response.json({ error: "Invalid request" }, { status: 400 });
  }

  const admin = createAdminClient();
  await admin
    .from("push_subscriptions")
    .delete()
    .eq("endpoint", body.endpoint)
    .eq("user_id", user.id);
  return Response.json({ ok: true });
}
