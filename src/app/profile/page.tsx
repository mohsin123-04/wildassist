import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Avatar from "@/components/Avatar";
import ProfileForm from "./ProfileForm";
import AppearanceSection from "./AppearanceSection";
import SecuritySection from "./SecuritySection";
import DangerSection from "./DangerSection";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, title, phone, bio, role, centre_id, avatar_url, avatar_color")
    .eq("id", user.id)
    .single();

  const { data: centres } = await supabase
    .from("centres")
    .select("id, name, town")
    .order("name");

  const centreName =
    centres?.find((c) => c.id === profile?.centre_id)?.name ?? null;

  return (
    <main className="animate-in mx-auto flex w-full max-w-lg flex-1 flex-col gap-5 px-5 py-8">
      {/* Identity header */}
      <div className="flex items-center gap-4">
        <Avatar
          url={profile?.avatar_url}
          name={profile?.full_name}
          email={user.email}
          color={profile?.avatar_color}
          size={64}
        />
        <div className="min-w-0">
          <h1 className="truncate font-display text-2xl font-semibold tracking-tight text-emerald-950">
            {profile?.full_name || "Your profile"}
          </h1>
          <p className="truncate text-sm text-zinc-600">
            {[profile?.title, centreName].filter(Boolean).join(" · ") ||
              "Wildlife centre staff"}
          </p>
        </div>
        <span className="ml-auto shrink-0 self-start rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold capitalize text-emerald-800">
          {profile?.role ?? "staff"}
        </span>
      </div>

      <ProfileForm
        initialName={profile?.full_name ?? ""}
        initialTitle={profile?.title ?? ""}
        initialPhone={profile?.phone ?? ""}
        initialBio={profile?.bio ?? ""}
      />

      <AppearanceSection
        initialUrl={profile?.avatar_url ?? null}
        initialColor={profile?.avatar_color ?? null}
        name={profile?.full_name}
        email={user.email}
      />

      <SecuritySection email={user.email ?? ""} />

      <DangerSection />
    </main>
  );
}
