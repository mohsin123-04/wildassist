import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import CentreOnboarding from "./CentreOnboarding";
import CaseList, { type CaseRow } from "./CaseList";
import CentreCodePanel from "./CentreCodePanel";
import TeamPanel from "./TeamPanel";
import AdminCentres from "./AdminCentres";
import AdminVolunteers from "./AdminVolunteers";
import EnablePushCard from "@/components/EnablePushCard";

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

  // These two are independent (cases are filtered by RLS, not a centre id),
  // so fetch them concurrently to cut the dashboard's load time.
  // Load the full visible case set so the dashboard's client-side search,
  // filters, CSV export, and "view original" all operate on complete data.
  // (A row cap here would silently break those; proper server-side pagination
  // is the future fix once real volume warrants it. Analytics is separately
  // bounded since it aggregates far more rows.)
  const [{ data: allCentres }, { data: cases }] = await Promise.all([
    supabase.from("centres").select("id, name, town, lat, lng"),
    supabase
      .from("cases")
      .select(
        "id, created_at, animal, situation, verdict, title, status, description, lat, lng, reporter_name, reporter_phone, staff_notes, centre_id, photo_url, driver_id, driver_name, duplicate_of, assigned_to"
      )
      .order("created_at", { ascending: false }),
  ]);
  const centreNames = Object.fromEntries(
    (allCentres ?? []).map((c) => [c.id, c.name])
  );

  // Attach the assigned driver's phone so staff can call/text them directly.
  const driverIds = [
    ...new Set((cases ?? []).map((c) => c.driver_id).filter(Boolean)),
  ];
  if (driverIds.length) {
    const { data: drivers } = await supabase
      .from("profiles")
      .select("id, phone")
      .in("id", driverIds as string[]);
    const phoneById = Object.fromEntries(
      (drivers ?? []).map((d) => [d.id, d.phone])
    );
    for (const c of cases ?? []) {
      (c as CaseRow).driver_phone = phoneById[c.driver_id] ?? null;
    }
  }
  const centre = allCentres?.find((c) => c.id === profile.centre_id);

  return (
    <main className="animate-in mx-auto flex w-full max-w-2xl flex-1 flex-col px-5 py-8">
      <div className="mb-6">
        <p className="text-xs font-medium uppercase tracking-widest text-zinc-500">
          {isAdmin
            ? "Admin overview"
            : firstName
              ? `Welcome back, ${firstName}`
              : "Centre dashboard"}
        </p>
        <div className="mt-1 flex flex-wrap items-center gap-2.5">
          <h1 className="font-display text-2xl font-semibold tracking-tight text-zinc-900">
            {isAdmin ? "All cases" : (centre?.name ?? "Your centre")}
          </h1>
          <span
            className={`rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${
              isAdmin
                ? "bg-violet-100 text-violet-700"
                : isManager
                  ? "bg-emerald-100 text-emerald-700"
                  : "bg-zinc-100 text-zinc-600"
            }`}
          >
            {profile?.role ?? "staff"}
          </span>
        </div>
        <p className="mt-1 text-zinc-600">
          {isAdmin
            ? "Every reported case across all centres."
            : "Cases routed to you from the public triage tool."}
        </p>
      </div>
      <EnablePushCard />
      {isAdmin && <AdminCentres />}
      {(isAdmin || isManager) && <AdminVolunteers />}
      {isManager && <CentreCodePanel />}
      {!isAdmin && <TeamPanel />}
      <CaseList
        initialCases={(cases ?? []) as CaseRow[]}
        myCentreId={profile.centre_id ?? ""}
        myId={user.id}
        myName={profile.full_name ?? "A teammate"}
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
