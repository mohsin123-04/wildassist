import { createClient, createAdminClient } from "@/lib/supabase/server";

/** The signed-in user's profile, if they manage a centre. */
async function requireManager() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in", status: 401 as const };
  const { data: profile } = await supabase
    .from("profiles")
    .select("centre_id, role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "manager" || !profile.centre_id) {
    return { error: "Managers only", status: 403 as const };
  }
  return { userId: user.id, centreId: profile.centre_id };
}

/** GET /api/team, roster of the signed-in user's centre (any member can view). */
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Not signed in" }, { status: 401 });

  const { data: me } = await supabase
    .from("profiles")
    .select("centre_id, role, title")
    .eq("id", user.id)
    .single();
  if (!me?.centre_id) {
    return Response.json({ error: "No centre", status: 400 }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data } = await admin
    .from("profiles")
    .select("id, full_name, role, title")
    .eq("centre_id", me.centre_id)
    .order("role");

  return Response.json({
    members: data ?? [],
    me: user.id,
    canManage: me.role === "manager",
  });
}

/** POST /api/team  { targetId, action: 'promote'|'demote'|'remove' } */
export async function POST(req: Request) {
  const ctx = await requireManager();
  if ("error" in ctx) return Response.json({ error: ctx.error }, { status: ctx.status });

  let body: { targetId?: string; action?: "promote" | "demote" | "remove" };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid request" }, { status: 400 });
  }
  const { targetId, action } = body;
  if (!targetId || !action) {
    return Response.json({ error: "Missing fields" }, { status: 400 });
  }

  const admin = createAdminClient();

  // Target must belong to this centre.
  const { data: target } = await admin
    .from("profiles")
    .select("id, role, centre_id")
    .eq("id", targetId)
    .single();
  if (!target || target.centre_id !== ctx.centreId) {
    return Response.json({ error: "Not a member of your centre" }, { status: 400 });
  }

  // Don't let the centre lose its last manager.
  if ((action === "demote" || action === "remove") && target.role === "manager") {
    const { count } = await admin
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("centre_id", ctx.centreId)
      .eq("role", "manager");
    if ((count ?? 0) <= 1) {
      return Response.json(
        { error: "A centre needs at least one manager. Promote someone first." },
        { status: 400 }
      );
    }
  }

  let update: Record<string, unknown>;
  if (action === "promote") update = { role: "manager" };
  else if (action === "demote") update = { role: "staff" };
  else update = { role: "staff", centre_id: null };

  const { error } = await admin.from("profiles").update(update).eq("id", targetId);
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ ok: true });
}
