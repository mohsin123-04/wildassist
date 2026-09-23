import { createClient, createAdminClient } from "@/lib/supabase/server";

// Readable code, no ambiguous characters (0/O, 1/I).
function genCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = crypto.getRandomValues(new Uint8Array(6));
  const s = Array.from(bytes, (b) => chars[b % chars.length]).join("");
  return `${s.slice(0, 3)}-${s.slice(3)}`;
}

async function centreOfUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in", status: 401 as const };
  const { data: profile } = await supabase
    .from("profiles")
    .select("centre_id")
    .eq("id", user.id)
    .single();
  if (!profile?.centre_id)
    return { error: "You aren't linked to a centre", status: 400 as const };
  return { centreId: profile.centre_id };
}

/** GET /api/centre-code — the signed-in staff member's centre join code. */
export async function GET() {
  const ctx = await centreOfUser();
  if ("error" in ctx) return Response.json({ error: ctx.error }, { status: ctx.status });

  const admin = createAdminClient();
  const { data } = await admin
    .from("centre_codes")
    .select("code")
    .eq("centre_id", ctx.centreId)
    .single();

  if (data?.code) return Response.json({ code: data.code });

  // No code yet: create one.
  const code = genCode();
  await admin.from("centre_codes").upsert({ centre_id: ctx.centreId, code });
  return Response.json({ code });
}

/** POST /api/centre-code — regenerate the join code. */
export async function POST() {
  const ctx = await centreOfUser();
  if ("error" in ctx) return Response.json({ error: ctx.error }, { status: ctx.status });

  const admin = createAdminClient();
  const code = genCode();
  const { error } = await admin
    .from("centre_codes")
    .upsert({ centre_id: ctx.centreId, code });
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ code });
}
