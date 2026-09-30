import { createClient, createAdminClient } from "@/lib/supabase/server";

/** GET /api/admin/centres, all centres with their codes + manager (admin only). */
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Not signed in" }, { status: 401 });

  const { data: me } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (me?.role !== "admin") {
    return Response.json({ error: "Admins only" }, { status: 403 });
  }

  const admin = createAdminClient();
  const { data: centres } = await admin
    .from("centres")
    .select("id, name, town, manager_email")
    .order("name");
  const { data: codes } = await admin.from("centre_codes").select("centre_id, code");

  const codeMap = Object.fromEntries(
    (codes ?? []).map((c) => [c.centre_id, c.code])
  );
  const rows = (centres ?? []).map((c) => ({
    ...c,
    code: codeMap[c.id] ?? null,
  }));

  return Response.json({ centres: rows });
}
