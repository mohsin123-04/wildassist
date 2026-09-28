import { createClient, createAdminClient } from "@/lib/supabase/server";

// Readable code, no ambiguous characters (0/O, 1/I). 8 chars over a 32-symbol
// alphabet is ~40 bits; combined with the join rate limit that's ample. (The
// alphabet has 32 symbols and a byte has 256 values, so b % 32 is unbiased.)
function genCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = crypto.getRandomValues(new Uint8Array(8));
  const s = Array.from(bytes, (b) => chars[b % chars.length]).join("");
  return `${s.slice(0, 4)}-${s.slice(4)}`;
}

async function centreOfUser() {
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
  if (!profile?.centre_id)
    return { error: "You aren't linked to a centre", status: 400 as const };
  if (profile.role !== "manager")
    return {
      error: "Only a centre manager can manage the join code",
      status: 403 as const,
    };
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
