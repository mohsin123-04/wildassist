import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import SurveillanceList, { type DeceasedCase } from "./SurveillanceList";

export const dynamic = "force-dynamic";

export default async function SurveillancePage() {
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

  if (profile?.role !== "surveillance") redirect("/dashboard");

  const firstName = (profile?.full_name ?? "").trim().split(" ")[0];

  const { data: cases } = await supabase
    .from("cases")
    .select("id, animal, title, situation, lat, lng, surveillance, created_at, status")
    .eq("kind", "deceased")
    .order("created_at", { ascending: false })
    .limit(500);

  const totalReports = cases?.length ?? 0;
  const flaggedCount = (cases ?? []).filter(
    (c) => (c.surveillance ?? []).length > 0
  ).length;

  return (
    <main className="animate-in mx-auto flex w-full max-w-7xl flex-1 flex-col px-5 py-8">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-clay-600">
            {firstName ? `Hi ${firstName}` : "Wildlife health officer"}
          </p>
          <h1 className="mt-1 font-display text-2xl font-semibold tracking-tight text-stone-900">
            Deceased wildlife reports
          </h1>
          <p className="mt-1 text-stone-600">
            Public submissions logged for disease surveillance and die-off
            monitoring across the US and Canada.
          </p>
        </div>

        <div className="flex gap-4">
          <div className="text-right">
            <p className="font-display text-2xl font-semibold tabular-nums text-stone-900">
              {totalReports}
            </p>
            <p className="text-xs text-stone-500">Total reports</p>
          </div>
          <div className="text-right">
            <p className="font-display text-2xl font-semibold tabular-nums text-stone-900">
              {flaggedCount}
            </p>
            <p className="text-xs text-stone-500">With disease flags</p>
          </div>
        </div>
      </div>

      <SurveillanceList cases={(cases ?? []) as DeceasedCase[]} />
    </main>
  );
}
