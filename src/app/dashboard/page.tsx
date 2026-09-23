import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import CentreOnboarding from "./CentreOnboarding";
import CaseList, { type CaseRow } from "./CaseList";
import CentreCodePanel from "./CentreCodePanel";
import TeamPanel from "./TeamPanel";
import AdminCentres from "./AdminCentres";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("centre_id, full_name, role")
    .eq("id", user.id)
    .single();

  const firstName = (profile?.full_name ?? "").trim().split(" ")[0];
  const isAdmin = profile?.role === "admin";
  const isManager = profile?.role === "manager";

  // Volunteers have their own transport view.
  if (profile?.role === "volunteer") redirect("/transport");

  // Non-admin staff who haven't linked a centre yet: show onboarding.
  if (!profile?.centre_id && !isAdmin) {
    const { data: centres } = await supabase
      .from("centres")
      .select("id, name, town")
      .order("name");

    return (
      <main className="animate-in mx-auto flex w-full max-w-xl flex-1 flex-col px-5 py-8">
        <CentreOnboarding centres={centres ?? []} />
      </main>
    );
  }

  const { data: allCentres } = await supabase
    .from("centres")
    .select("id, name, town, lat, lng");
  const centreNames = Object.fromEntries(
    (allCentres ?? []).map((c) => [c.id, c.name])
  );
  const centre = allCentres?.find((c) => c.id === profile.centre_id);

  // RLS returns cases in the staff member's area plus all unassigned cases.
  const { data: cases } = await supabase
    .from("cases")
    .select(
      "id, created_at, animal, situation, verdict, title, status, description, lat, lng, reporter_name, reporter_phone, staff_notes, centre_id, photo_url, driver_name"
    )
    .order("created_at", { ascending: false });

  return (
    <main className="animate-in mx-auto flex w-full max-w-2xl flex-1 flex-col px-5 py-8">
      <div className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-wide text-emerald-600">
          {isAdmin
            ? "Admin overview"
            : firstName
              ? `Welcome back, ${firstName}`
              : "Centre dashboard"}
        </p>
        <h1 className="mt-1 font-display text-2xl font-semibold tracking-tight text-emerald-950">
          {isAdmin ? "All Ontario cases" : (centre?.name ?? "Your centre")}
        </h1>
        <p className="mt-1 text-zinc-600">
          {isAdmin
            ? "Every reported case across all centres."
            : "Cases routed to you from the public triage tool."}
        </p>
      </div>
      {isAdmin && <AdminCentres />}
      {isManager && <CentreCodePanel />}
      {isManager && <TeamPanel />}
      <CaseList
        initialCases={(cases ?? []) as CaseRow[]}
        myCentreId={profile.centre_id ?? ""}
        centreNames={centreNames}
        isAdmin={isAdmin}
        centre={
          centre?.lat != null && centre?.lng != null
            ? [centre.lat, centre.lng]
            : [44.0, -79.4]
        }
      />
    </main>
  );
}
