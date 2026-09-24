import { createClient, createAdminClient } from "@/lib/supabase/server";

/** Admins and centre managers can review and approve volunteers. */
async function requireApprover() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in", status: 401 as const };
  const { data: me } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (me?.role !== "admin" && me?.role !== "manager") {
    return { error: "Not allowed", status: 403 as const };
  }
  return { ok: true as const };
}

/** GET /api/admin/volunteers — all volunteers with approval status. */
export async function GET() {
  const ctx = await requireApprover();
  if ("error" in ctx) return Response.json({ error: ctx.error }, { status: ctx.status });

  const admin = createAdminClient();
  const { data } = await admin
    .from("profiles")
    .select("id, full_name, volunteer_approved, created_at")
    .eq("role", "volunteer")
    .order("volunteer_approved")
    .order("created_at", { ascending: false });

  return Response.json({ volunteers: data ?? [] });
}

/** POST /api/admin/volunteers  { userId, approved } — approve or revoke. */
export async function POST(req: Request) {
  const ctx = await requireApprover();
  if ("error" in ctx) return Response.json({ error: ctx.error }, { status: ctx.status });

  let body: { userId?: string; approved?: boolean };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid request" }, { status: 400 });
  }
  if (!body.userId || typeof body.approved !== "boolean") {
    return Response.json({ error: "Missing fields" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from("profiles")
    .update({ volunteer_approved: body.approved })
    .eq("id", body.userId)
    .eq("role", "volunteer");
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ ok: true });
}
