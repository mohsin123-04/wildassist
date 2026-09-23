import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import TransportList, { type Job } from "./TransportList";

export const dynamic = "force-dynamic";

export default async function TransportPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, full_name")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "volunteer") redirect("/dashboard");

  const firstName = (profile?.full_name ?? "").trim().split(" ")[0];

  const { data: centres } = await supabase.from("centres").select("id, name");
  const centreNames = Object.fromEntries(
    (centres ?? []).map((c) => [c.id, c.name])
  );

  // RLS returns 'help' cases to volunteers; we want active transport jobs.
  const { data: jobs } = await supabase
    .from("cases")
    .select(
      "id, created_at, animal, title, description, lat, lng, status, driver_id, centre_id, reporter_name, reporter_phone"
    )
    .in("status", ["reported", "in_transit"])
    .not("lat", "is", null)
    .order("created_at", { ascending: false });

  return (
    <main className="animate-in mx-auto flex w-full max-w-2xl flex-1 flex-col px-5 py-8">
      <div className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-wide text-emerald-600">
          {firstName ? `Hi ${firstName}` : "Rescue volunteer"}
        </p>
        <h1 className="mt-1 font-display text-2xl font-semibold tracking-tight text-emerald-950">
          Transport requests
        </h1>
        <p className="mt-1 text-zinc-600">
          Injured animals that need a lift to a wildlife centre. Claim one you can
          drive, then mark it delivered.
        </p>
      </div>
      <TransportList
        initialJobs={(jobs ?? []) as Job[]}
        myId={user.id}
        centreNames={centreNames}
      />
    </main>
  );
}
