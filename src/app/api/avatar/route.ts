import { createClient, createAdminClient } from "@/lib/supabase/server";

const ALLOWED = ["image/png", "image/jpeg", "image/webp"];
const MAX_BYTES = 2 * 1024 * 1024; // 2 MB

/**
 * POST /api/avatar  (multipart form with `file`)
 * Uploads the signed-in user's avatar to Supabase Storage and saves the URL.
 */
export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Not signed in" }, { status: 401 });

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
    return Response.json({ error: "Image must be under 2 MB" }, { status: 400 });
  }

  const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
  const path = `${user.id}/avatar.${ext}`;
  const bytes = new Uint8Array(await file.arrayBuffer());

  const admin = createAdminClient();
  const { error: upErr } = await admin.storage
    .from("avatars")
    .upload(path, bytes, { contentType: file.type, upsert: true });
  if (upErr) return Response.json({ error: upErr.message }, { status: 500 });

  const { data: pub } = admin.storage.from("avatars").getPublicUrl(path);
  // Cache-bust so the new image shows immediately.
  const url = `${pub.publicUrl}?v=${Date.now()}`;

  const { error: dbErr } = await admin
    .from("profiles")
    .update({ avatar_url: url })
    .eq("id", user.id);
  if (dbErr) return Response.json({ error: dbErr.message }, { status: 500 });

  return Response.json({ url });
}

/** DELETE /api/avatar — removes the avatar photo, falling back to initials. */
export async function DELETE() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Not signed in" }, { status: 401 });

  const admin = createAdminClient();
  await admin.storage
    .from("avatars")
    .remove([`${user.id}/avatar.png`, `${user.id}/avatar.jpg`, `${user.id}/avatar.webp`]);
  await admin.from("profiles").update({ avatar_url: null }).eq("id", user.id);

  return Response.json({ ok: true });
}
