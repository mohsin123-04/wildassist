import { createClient, createAdminClient } from "@/lib/supabase/server";

type Row = { id: string; kind: string; title: string | null };

async function ctx() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in", status: 401 as const };
  const { data: profile } = await supabase
    .from("profiles")
    .select("centre_id, full_name")
    .eq("id", user.id)
    .single();
  if (!profile?.centre_id) {
    return { error: "No centre", status: 400 as const };
  }
  return { userId: user.id, name: profile.full_name ?? "You", centreId: profile.centre_id };
}

/**
 * GET /api/conversations — the user's conversations (main channel + DMs +
 * groups) with display labels, plus the centre's members for starting new ones.
 */
export async function GET() {
  const c = await ctx();
  if ("error" in c) return Response.json({ error: c.error }, { status: c.status });

  const admin = createAdminClient();

  // Ensure the centre has a main channel.
  let { data: channel } = await admin
    .from("conversations")
    .select("id")
    .eq("centre_id", c.centreId)
    .eq("kind", "channel")
    .maybeSingle();
  if (!channel) {
    const { data: created } = await admin
      .from("conversations")
      .insert({ centre_id: c.centreId, kind: "channel", title: "Main channel" })
      .select("id")
      .single();
    channel = created;
  }

  // Centre members (for labels + starting conversations).
  const { data: members } = await admin
    .from("profiles")
    .select("id, full_name, role")
    .eq("centre_id", c.centreId);
  const nameOf = Object.fromEntries(
    (members ?? []).map((m) => [m.id, m.full_name || "Unnamed"])
  );

  // Conversations I belong to (dms + groups).
  const { data: myConvIds } = await admin
    .from("conversation_members")
    .select("conversation_id")
    .eq("user_id", c.userId);
  const ids = (myConvIds ?? []).map((r) => r.conversation_id);

  let mine: Row[] = [];
  const memberMap: Record<string, string[]> = {};
  if (ids.length) {
    const { data: convs } = await admin
      .from("conversations")
      .select("id, kind, title")
      .in("id", ids);
    mine = (convs ?? []) as Row[];
    const { data: cm } = await admin
      .from("conversation_members")
      .select("conversation_id, user_id")
      .in("conversation_id", ids);
    for (const r of cm ?? []) {
      (memberMap[r.conversation_id] ??= []).push(r.user_id);
    }
  }

  const conversations = [
    { id: channel!.id, kind: "channel", label: "Main channel" },
    ...mine.map((conv) => {
      if (conv.kind === "dm") {
        const other = (memberMap[conv.id] ?? []).find((u) => u !== c.userId);
        return { id: conv.id, kind: "dm", label: other ? nameOf[other] : "Direct message" };
      }
      return { id: conv.id, kind: "group", label: conv.title || "Group" };
    }),
  ];

  return Response.json({
    conversations,
    members: (members ?? []).filter((m) => m.id !== c.userId),
    me: c.userId,
  });
}

/**
 * POST /api/conversations
 *  - { dmWith }               → find-or-create a 1:1 DM
 *  - { title, memberIds[] }   → create a named group
 */
export async function POST(req: Request) {
  const c = await ctx();
  if ("error" in c) return Response.json({ error: c.error }, { status: c.status });

  let body: { dmWith?: string; title?: string; memberIds?: string[] };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid request" }, { status: 400 });
  }

  const admin = createAdminClient();

  // Validate every target is a member of the same centre.
  const targets = body.dmWith ? [body.dmWith] : body.memberIds ?? [];
  if (targets.length) {
    const { data: valid } = await admin
      .from("profiles")
      .select("id")
      .eq("centre_id", c.centreId)
      .in("id", targets);
    if ((valid?.length ?? 0) !== targets.length) {
      return Response.json({ error: "Members must be in your centre" }, {
        status: 400,
      });
    }
  }

  // DM: reuse an existing 1:1 if present.
  if (body.dmWith) {
    const { data: myDms } = await admin
      .from("conversation_members")
      .select("conversation_id, conversations!inner(kind)")
      .eq("user_id", c.userId);
    for (const row of myDms ?? []) {
      const kind = (row.conversations as unknown as { kind: string }).kind;
      if (kind !== "dm") continue;
      const { data: pair } = await admin
        .from("conversation_members")
        .select("user_id")
        .eq("conversation_id", row.conversation_id);
      const users = (pair ?? []).map((p) => p.user_id);
      if (users.length === 2 && users.includes(body.dmWith)) {
        return Response.json({ id: row.conversation_id });
      }
    }
    const { data: conv } = await admin
      .from("conversations")
      .insert({ centre_id: c.centreId, kind: "dm", created_by: c.userId })
      .select("id")
      .single();
    await admin.from("conversation_members").insert([
      { conversation_id: conv!.id, user_id: c.userId },
      { conversation_id: conv!.id, user_id: body.dmWith },
    ]);
    return Response.json({ id: conv!.id });
  }

  // Group.
  const title = (body.title ?? "").trim() || "Group";
  const ids = Array.from(new Set([c.userId, ...(body.memberIds ?? [])]));
  if (ids.length < 3) {
    return Response.json({ error: "Pick at least two teammates" }, { status: 400 });
  }
  const { data: conv } = await admin
    .from("conversations")
    .insert({ centre_id: c.centreId, kind: "group", title, created_by: c.userId })
    .select("id")
    .single();
  await admin
    .from("conversation_members")
    .insert(ids.map((user_id) => ({ conversation_id: conv!.id, user_id })));
  return Response.json({ id: conv!.id });
}
