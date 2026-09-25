import { createClient, createAdminClient } from "@/lib/supabase/server";

/**
 * POST /api/share-case  { caseId, conversationId }
 * Posts a case as a card into a conversation the user belongs to, so a team can
 * coordinate a pickup ("who can drive this one?").
 */
export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Not signed in" }, { status: 401 });

  let body: { caseId?: string; conversationId?: string };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid request" }, { status: 400 });
  }
  const { caseId, conversationId } = body;
  if (!caseId || !conversationId) {
    return Response.json({ error: "Missing fields" }, { status: 400 });
  }

  // The user must belong to the target conversation.
  const { data: canAccess } = await supabase.rpc("can_access_conversation", {
    conv: conversationId,
  });
  if (canAccess !== true) {
    return Response.json({ error: "Not your conversation" }, { status: 403 });
  }

  const admin = createAdminClient();
  const { data: c } = await admin
    .from("cases")
    .select("id, animal, title, situation, status")
    .eq("id", caseId)
    .single();
  if (!c) return Response.json({ error: "Case not found" }, { status: 404 });

  const { data: prof } = await admin
    .from("profiles")
    .select("full_name")
    .eq("id", user.id)
    .single();

  const { error } = await admin.from("messages").insert({
    conversation_id: conversationId,
    sender_id: user.id,
    sender_name: prof?.full_name ?? "Someone",
    body: "Shared a case",
    case_ref: {
      id: c.id,
      animal: c.animal,
      title: c.title ?? c.situation.replace(/-/g, " "),
      status: c.status,
    },
  });
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ ok: true });
}
