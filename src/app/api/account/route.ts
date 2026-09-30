import { createClient, createAdminClient } from "@/lib/supabase/server";

/**
 * DELETE /api/account, permanently deletes the signed-in user's account.
 * The profile row cascades via the foreign key on auth.users.
 */
export async function DELETE() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Not signed in" }, { status: 401 });

  const admin = createAdminClient();
  // Best-effort cleanup of avatar files.
  await admin.storage
    .from("avatars")
    .remove([
      `${user.id}/avatar.png`,
      `${user.id}/avatar.jpg`,
      `${user.id}/avatar.webp`,
    ]);

  const { error } = await admin.auth.admin.deleteUser(user.id);
  if (error) return Response.json({ error: error.message }, { status: 500 });

  return Response.json({ ok: true });
}
