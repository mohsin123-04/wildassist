import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import CentreOnboarding from "./CentreOnboarding";
import CaseList, { type CaseRow } from "./CaseList";
import SignOutButton from "./SignOutButton";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("centre_id, full_name")
    .eq("id", user.id)
    .single();

  // Staff hasn't linked a centre yet: show onboarding.
  if (!profile?.centre_id) {
    const { data: centres } = await supabase
      .from("centres")
      .select("id, name, town")
      .order("name");

    return (
      <main className="animate-in mx-auto flex w-full max-w-xl flex-1 flex-col px-5 py-8">
        <Header email={user.email} />
        <CentreOnboarding centres={centres ?? []} />
      </main>
    );
  }

  const { data: centre } = await supabase
    .from("centres")
    .select("name, town")
    .eq("id", profile.centre_id)
    .single();

  const { data: cases } = await supabase
    .from("cases")
    .select("id, created_at, animal, situation, verdict, title, status")
    .eq("centre_id", profile.centre_id)
    .order("created_at", { ascending: false });

  return (
    <main className="animate-in mx-auto flex w-full max-w-2xl flex-1 flex-col px-5 py-8">
      <Header email={user.email} />
      <div className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-wide text-emerald-600">
          Centre dashboard
        </p>
        <h1 className="mt-1 font-display text-2xl font-semibold tracking-tight text-emerald-950">
          {centre?.name ?? "Your centre"}
        </h1>
        <p className="mt-1 text-zinc-600">
          Incoming cases routed to you from the public triage tool.
        </p>
      </div>
      <CaseList initialCases={(cases ?? []) as CaseRow[]} />
    </main>
  );
}

function Header({ email }: { email?: string }) {
  return (
    <div className="mb-6 flex items-center justify-between border-b border-black/5 pb-4">
      <p className="text-sm text-zinc-500">{email}</p>
      <SignOutButton />
    </div>
  );
}
