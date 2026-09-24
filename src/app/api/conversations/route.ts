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

  const convList = [
    { id: channel!.id, kind: "channel", label: "Main channel" },
    ...mine.map((conv) => {
      if (conv.kind === "dm") {
        const other = (memberMap[conv.id] ?? []).find((u) => u !== c.userId);
        return { id: conv.id, kind: "dm", label: other ? nameOf[other] : "Direct message" };
      }
      return { id: conv.id, kind: "group", label: conv.title || "Group" };
    }),
  ];

  // Unread counts: messages newer than the user's last_read, not sent by them.
  const allIds = convList.map((c2) => c2.id);
  const { data: reads } = await admin
    .from("conversation_reads")
    .select("conversation_id, last_read")
    .eq("user_id", c.userId)
    .in("conversation_id", allIds);
  const lastRead: Record<string, string> = {};
  for (const r of reads ?? []) lastRead[r.conversation_id] = r.last_read;

  const { data: msgs } = await admin
    .from("messages")
    .select("conversation_id, sender_id, created_at")
    .in("conversation_id", allIds);

  const unread: Record<string, number> = {};
  for (const m of msgs ?? []) {
    if (m.sender_id === c.userId) continue;
    const lr = lastRead[m.conversation_id];
    if (!lr || new Date(m.created_at) > new Date(lr)) {
      unread[m.conversation_id] = (unread[m.conversation_id] ?? 0) + 1;
    }
  }

  const conversations = convList.map((cv) => ({ ...cv, unread: unread[cv.id] ?? 0 }));
  const totalUnread = Object.values(unread).reduce((a, b) => a + b, 0);

  return Response.json({
    conversations,
    members: (members ?? []).filter((m) => m.id !== c.userId),
    me: c.userId,
    totalUnread,
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

  // DM: race-proof via a canonical dm_key (sorted pair). A duplicate can't be
  // created because dm_key is unique; concurrent taps resolve to the same row.
  if (body.dmWith) {
    const dmKey = [c.userId, body.dmWith].sort().join(":");
    const { data: conv } = await admin
      .from("conversations")
      .upsert(
        { centre_id: c.centreId, kind: "dm", created_by: c.userId, dm_key: dmKey },
        { onConflict: "dm_key" }
      )
      .select("id")
      .single();
    await admin
      .from("conversation_members")
      .upsert(
        [
          { conversation_id: conv!.id, user_id: c.userId },
          { conversation_id: conv!.id, user_id: body.dmWith },
        ],
        { onConflict: "conversation_id,user_id", ignoreDuplicates: true }
      );
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
