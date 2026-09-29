import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AnalyticsClient from "./AnalyticsClient";

export const dynamic = "force-dynamic";

export default async function AnalyticsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, centre_id")
    .eq("id", user.id)
    .single();

  const isAdmin = profile?.role === "admin";
  if (profile?.role === "volunteer" || (!profile?.centre_id && !isAdmin)) {
    redirect("/dashboard");
  }

  // Fetch the raw data once (RLS-scoped to what this user can see); all the
  // windowing/aggregation happens in the browser so range + month switching is
  // instant. At large scale this would move to a server-side aggregate.
  const [{ data: cases }, { data: events }, cn] = await Promise.all([
    supabase
      .from("cases")
      .select(
        "id, created_at, animal, situation, verdict, status, centre_id, duplicate_of"
      ),
    supabase.from("case_events").select("case_id, to_status, created_at"),
    isAdmin
      ? supabase.from("centres").select("id, name")
      : Promise.resolve({ data: [] as { id: string; name: string }[] }),
  ]);

  const centreNames = Object.fromEntries(
    ((cn?.data ?? []) as { id: string; name: string }[]).map((c) => [c.id, c.name])
  );

  return (
    <AnalyticsClient
      cases={cases ?? []}
      events={events ?? []}
      centreNames={centreNames}
      isAdmin={isAdmin}
    />
  );
}
