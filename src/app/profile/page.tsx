import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ProfileForm from "./ProfileForm";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, role, centre_id")
    .eq("id", user.id)
    .single();

  const { data: centres } = await supabase
    .from("centres")
    .select("id, name, town")
    .order("name");

  return (
    <main className="animate-in mx-auto flex w-full max-w-lg flex-1 flex-col px-5 py-8">
      <div className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-wide text-emerald-600">
          Account
        </p>
        <h1 className="mt-1 font-display text-2xl font-semibold tracking-tight text-emerald-950">
          Your profile
        </h1>
        <p className="mt-1 text-zinc-600">
          Update your name and the centre your account is linked to.
        </p>
      </div>

      <ProfileForm
        email={user.email ?? ""}
        role={profile?.role ?? "staff"}
        initialName={profile?.full_name ?? ""}
        initialCentreId={profile?.centre_id ?? ""}
        centres={centres ?? []}
      />
    </main>
  );
}
