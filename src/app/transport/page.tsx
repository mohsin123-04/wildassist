import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import TransportList from "./TransportList";

export const dynamic = "force-dynamic";

export default async function TransportPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, full_name, volunteer_approved")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "volunteer") redirect("/dashboard");

  const firstName = (profile?.full_name ?? "").trim().split(" ")[0];

  const { data: centres } = await supabase.from("centres").select("id, name");
  const centreNames = Object.fromEntries(
    (centres ?? []).map((c) => [c.id, c.name])
  );

  return (
    <main className="animate-in mx-auto flex w-full max-w-2xl flex-1 flex-col px-5 py-8">
      <div className="mb-6">
        <p className="text-xs font-medium uppercase tracking-widest text-zinc-400">
          {firstName ? `Hi ${firstName}` : "Rescue volunteer"}
        </p>
        <h1 className="mt-1 font-display text-2xl font-semibold tracking-tight text-zinc-900">
          Transport requests
        </h1>
        <p className="mt-1 text-zinc-600">
          Injured animals that need a lift to a wildlife centre. Claim one you can
          drive, then mark it delivered.
        </p>
      </div>

      {profile?.volunteer_approved ? (
        <TransportList centreNames={centreNames} />
      ) : (
        <div className="rounded-2xl border border-zinc-200 bg-white p-8 text-center">
          <p className="text-2xl">⏳</p>
          <p className="mt-2 font-medium text-zinc-900">Approval pending</p>
          <p className="mx-auto mt-1 max-w-sm text-sm leading-6 text-zinc-500">
            Thanks for signing up to help. To protect the people and animals
            involved, transport jobs are only shown to approved volunteers. An
            administrator will review your account shortly.
          </p>
        </div>
      )}
    </main>
  );
}
