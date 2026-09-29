import { NextResponse, type NextRequest } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";

const BUCKET = "case-images";

/**
 * GET /api/case-image/[id]
 * Serves a case's animal photo to staff only. Authorization is enforced by RLS:
 * we SELECT the case with the caller's own session, so only a signed-in staff
 * member who can see the case (their centre / area / unassigned) gets the row
 * (→ else 404), then we redirect to a short-lived signed URL. Legacy photos
 * stored as full public URLs pass straight through.
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

  // RLS gate: only returns a row if this staff member can see the case.
  const { data: c } = await supabase
    .from("cases")
    .select("photo_url")
    .eq("id", id)
    .maybeSingle();
  if (!c?.photo_url) return new NextResponse("Not found", { status: 404 });

  if (/^https?:\/\//.test(c.photo_url)) {
    return NextResponse.redirect(c.photo_url);
  }

  const admin = createAdminClient();
  const { data, error } = await admin.storage
    .from(BUCKET)
    .createSignedUrl(c.photo_url, 300);
  if (error || !data?.signedUrl) {
    return new NextResponse("Not found", { status: 404 });
  }
  return NextResponse.redirect(data.signedUrl);
}
