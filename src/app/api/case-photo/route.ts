import { createAdminClient } from "@/lib/supabase/server";
import { rateLimit, clientIp, tooMany } from "@/lib/ratelimit";

const ALLOWED = ["image/png", "image/jpeg", "image/webp"];
const MAX_BYTES = 5 * 1024 * 1024; // 5 MB

/**
 * POST /api/case-photo  (multipart form with `file`)
 * Uploads a photo of a found animal to the PRIVATE case-images bucket and
 * returns its storage path (not a URL). The path is stored on the case; the
 * photo is then only viewable by staff through /api/case-image/[id], which
 * checks case visibility and returns a short-lived signed URL. Public upload
 * (reporters aren't signed in); uses the service role.
 */
export async function POST(req: Request) {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return Response.json({ ok: false, reason: "no-db" });
  }
  if (!(await rateLimit(`photo:${clientIp(req)}`, 10, 60))) return tooMany();

  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return Response.json({ error: "No file" }, { status: 400 });
  }
  if (!ALLOWED.includes(file.type)) {
    return Response.json({ error: "Use a PNG, JPG, or WebP image" }, {
      status: 400,
    });
  }
  if (file.size > MAX_BYTES) {
    return Response.json({ error: "Image must be under 5 MB" }, { status: 400 });
  }

  const ext =
    file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
  // Unpredictable path; no user id since reporters are anonymous.
  const path = `${crypto.randomUUID()}.${ext}`;
  const bytes = new Uint8Array(await file.arrayBuffer());

  const admin = createAdminClient();
  const { error } = await admin.storage
    .from("case-images")
    .upload(path, bytes, { contentType: file.type, upsert: false });
  if (error) return Response.json({ error: error.message }, { status: 500 });

  // Return the storage path — the photo is private, served via a signed URL.
  return Response.json({ path });
}
