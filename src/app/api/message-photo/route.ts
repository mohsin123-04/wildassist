import { createClient, createAdminClient } from "@/lib/supabase/server";
import { rateLimit, clientIp, tooMany } from "@/lib/ratelimit";

const ALLOWED = ["image/png", "image/jpeg", "image/webp"];
const MAX_BYTES = 5 * 1024 * 1024; // 5 MB

/**
 * POST /api/message-photo  (multipart form with `file`)
 * Uploads a photo to Storage for use in a chat message and returns its public
 * URL. Signed-in users only (unlike the public case-photo upload).
 */
export async function POST(req: Request) {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return Response.json({ ok: false, reason: "no-db" });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Not signed in" }, { status: 401 });

  if (!(await rateLimit(`msgphoto:${clientIp(req)}`, 20, 60))) return tooMany();

  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return Response.json({ error: "No file" }, { status: 400 });
  }
  if (!ALLOWED.includes(file.type)) {
    return Response.json(
      { error: "Use a PNG, JPG, or WebP image" },
      { status: 400 }
    );
  }
  if (file.size > MAX_BYTES) {
    return Response.json({ error: "Image must be under 5 MB" }, { status: 400 });
  }

  const ext =
    file.type === "image/png"
      ? "png"
      : file.type === "image/webp"
        ? "webp"
        : "jpg";
  const path = `chat/${crypto.randomUUID()}.${ext}`;
  const bytes = new Uint8Array(await file.arrayBuffer());

  const admin = createAdminClient();
  const { error } = await admin.storage
    .from("case-photos")
    .upload(path, bytes, { contentType: file.type, upsert: false });
  if (error) return Response.json({ error: error.message }, { status: 500 });

  const { data } = admin.storage.from("case-photos").getPublicUrl(path);
  return Response.json({ url: data.publicUrl });
}
