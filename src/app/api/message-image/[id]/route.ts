import { NextResponse, type NextRequest } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";

const BUCKET = "chat-images";

/**
 * GET /api/message-image/[id]
 * Serves a chat message's private image. Authorization is enforced by RLS: we
 * SELECT the message with the caller's own session, so a non-member simply can't
 * read the row (→ 404). Members get a redirect to a short-lived signed URL.
 * Legacy messages whose image_url is a full public URL pass straight through.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new NextResponse("Unauthorized", { status: 401 });

  // RLS gate: only returns a row if the caller can access the conversation.
  const { data: msg } = await supabase
    .from("messages")
    .select("image_url")
    .eq("id", id)
    .maybeSingle();
  if (!msg?.image_url) return new NextResponse("Not found", { status: 404 });

  // Legacy images stored as public URLs — redirect as-is.
  if (/^https?:\/\//.test(msg.image_url)) {
    return NextResponse.redirect(msg.image_url);
  }

  const admin = createAdminClient();
  const { data, error } = await admin.storage
    .from(BUCKET)
    .createSignedUrl(msg.image_url, 300);
  if (error || !data?.signedUrl) {
    return new NextResponse("Not found", { status: 404 });
  }
  return NextResponse.redirect(data.signedUrl);
}
