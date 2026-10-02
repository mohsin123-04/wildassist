import { redirect } from "next/navigation";
import { Clock } from "lucide-react";
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
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-clay-600">
          {firstName ? `Hi ${firstName}` : "Rescue volunteer"}
        </p>
        <h1 className="mt-1 font-display text-2xl font-semibold tracking-tight text-stone-900">
          Transport requests
        </h1>
        <p className="mt-1 text-stone-600">
          Injured animals that need a lift to a wildlife centre. Claim one you can
          drive, then mark it delivered.
        </p>
      </div>

      {profile?.volunteer_approved ? (
        <TransportList centreNames={centreNames} />
      ) : (
        <div className="border-t border-stone-200/70 pt-8">
          <div className="mx-auto max-w-md text-center">
            <span className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-amber-100 text-amber-700">
              <Clock className="h-5 w-5" aria-hidden />
            </span>
            <p className="mt-4 font-display text-lg font-semibold tracking-tight text-stone-900">
              You&apos;re almost ready to help
            </p>
            <p className="mt-2 text-sm leading-6 text-stone-600">
              Thanks for signing up to drive for wildlife. Because transport
              requests include animal locations and finders&apos; contact
              details, a wildlife centre reviews new volunteers first. This
              usually happens within a day or two.
            </p>
          </div>

          <div className="mx-auto mt-6 max-w-md">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-clay-600">
              What happens next
            </p>
            <ol className="mt-2 flex flex-col gap-2 text-sm text-stone-700">
              <li className="flex gap-2.5">
                <span className="font-mono text-xs text-emerald-700">01</span>
                A centre reviews and approves your account.
              </li>
              <li className="flex gap-2.5">
                <span className="font-mono text-xs text-emerald-700">02</span>
                You&apos;ll see injured animals near you that need a lift.
              </li>
              <li className="flex gap-2.5">
                <span className="font-mono text-xs text-emerald-700">03</span>
                Claim a pickup, drive it to the centre, mark it delivered.
              </li>
            </ol>
          </div>
        </div>
      )}
    </main>
  );
}
