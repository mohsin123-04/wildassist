import { redirect } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Car,
  MapPin,
  MessageSquare,
  Phone,
  User,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import CaseTimeline from "@/components/CaseTimeline";
import CaseNotes from "@/components/CaseNotes";
import LocalTime from "@/components/LocalTime";
import CaseStatusControl from "./CaseStatusControl";

export const dynamic = "force-dynamic";

const VERDICT_BADGE: Record<string, string> = {
  help: "bg-rose-100 text-rose-700",
  uncertain: "bg-amber-100 text-amber-700",
  leave: "bg-emerald-100 text-emerald-800",
};

/**
 * Full-page view of a single case, a shareable, roomier alternative to the
 * inline dashboard expansion. Access control is RLS: the case is fetched with
 * the viewer's own session, so staff outside its area simply get "not found".
 */
export default async function CasePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
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
  if (profile?.role === "volunteer") redirect("/transport");

  const { data: c } = await supabase
    .from("cases")
    .select(
      "id, created_at, animal, situation, verdict, title, status, description, lat, lng, reporter_name, reporter_phone, staff_notes, centre_id, photo_url, driver_id, driver_name, duplicate_of, assigned_to"
    )
    .eq("id", id)
    .maybeSingle();

  if (!c) {
    return (
      <main className="mx-auto flex w-full max-w-lg flex-1 flex-col px-5 py-16 text-center">
        <h1 className="font-display text-2xl font-semibold text-stone-900">
          Case not found
        </h1>
        <p className="mt-2 text-stone-600">
          It may have been removed, or it&apos;s outside your centre&apos;s area.
        </p>
        <Link
          href="/dashboard"
          className="mx-auto mt-6 inline-flex h-11 items-center justify-center rounded-xl bg-forest-900 px-6 text-sm font-semibold text-white transition-colors hover:bg-forest-800"
        >
          Back to dashboard
        </Link>
      </main>
    );
  }

  const [{ data: centre }, { data: driver }] = await Promise.all([
    c.centre_id
      ? supabase.from("centres").select("name, town").eq("id", c.centre_id).single()
      : Promise.resolve({ data: null }),
    c.driver_id
      ? supabase.from("profiles").select("phone").eq("id", c.driver_id).single()
      : Promise.resolve({ data: null }),
  ]);

  return (
    <main className="animate-in mx-auto w-full max-w-3xl flex-1 px-5 py-8">
      <Link
        href="/dashboard"
        className="inline-flex w-fit items-center gap-1 text-sm font-medium text-stone-500 transition-colors hover:text-stone-900"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden /> Dashboard
      </Link>

      {/* Header */}
      <div className="mt-4 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${VERDICT_BADGE[c.verdict] ?? "bg-stone-100 text-stone-600"}`}
            >
              {c.verdict}
            </span>
            {c.duplicate_of && (
              <Link
                href={`/case/${c.duplicate_of}`}
                className="rounded-full bg-orange-100 px-2.5 py-0.5 text-xs font-medium text-orange-700 hover:bg-orange-200"
              >
                possible duplicate, view original
              </Link>
            )}
          </div>
          <h1 className="mt-2 font-display text-2xl font-semibold capitalize tracking-tight text-stone-900">
            {c.animal}
            {c.title ? ` · ${c.title}` : ""}
          </h1>
          <p className="mt-1 text-sm text-stone-600">
            {c.situation.replace(/-/g, " ")} · reported{" "}
            <LocalTime iso={c.created_at} />
            {centre ? ` · routed to ${centre.name}` : " · unassigned"}
          </p>
        </div>
        <CaseStatusControl caseId={c.id} initialStatus={c.status} />
      </div>

      {/* Photo */}
      {c.photo_url && (
        <a
          href={`/api/case-image/${c.id}`}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-5 block"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`/api/case-image/${c.id}`}
            alt="Reported animal"
            className="max-h-96 w-full rounded-2xl border border-stone-200 object-cover"
          />
        </a>
      )}

      {/* Details */}
      <div className="mt-5 grid gap-5 sm:grid-cols-2">
        <section className="rounded-2xl border border-stone-200 bg-white p-5">
          <h2 className="font-display text-base font-semibold text-stone-900">
            Report
          </h2>
          <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-stone-700">
            {c.description || "No description provided."}
          </p>
          {c.lat != null && c.lng != null && (
            <a
              href={`https://www.openstreetmap.org/?mlat=${c.lat}&mlon=${c.lng}#map=15/${c.lat}/${c.lng}`}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-emerald-700 underline underline-offset-2"
            >
              <MapPin className="h-4 w-4" aria-hidden /> View reported location
            </a>
          )}
        </section>

        <section className="rounded-2xl border border-stone-200 bg-white p-5">
          <h2 className="font-display text-base font-semibold text-stone-900">
            People
          </h2>
          <div className="mt-2 flex flex-col gap-3 text-sm">
            <div className="flex items-center gap-2 text-stone-700">
              <User className="h-4 w-4 shrink-0 text-stone-400" aria-hidden />
              <span>
                {c.reporter_name || "Anonymous reporter"}
                {c.reporter_phone && (
                  <>
                    {" · "}
                    <a
                      href={`tel:${c.reporter_phone.replace(/[^0-9+]/g, "")}`}
                      className="font-medium text-emerald-700 underline underline-offset-2"
                    >
                      {c.reporter_phone}
                    </a>
                  </>
                )}
              </span>
            </div>
            {c.driver_name && (
              <div className="flex items-center gap-2 text-stone-700">
                <Car className="h-4 w-4 shrink-0 text-stone-400" aria-hidden />
                <span>
                  {c.driver_name} (driver)
                  {driver?.phone && (
                    <>
                      {" · "}
                      <a
                        href={`tel:${driver.phone.replace(/[^0-9+]/g, "")}`}
                        className="font-medium text-emerald-700 underline underline-offset-2"
                      >
                        <Phone className="mr-0.5 inline h-3.5 w-3.5" aria-hidden />
                        call
                      </a>
                      {" · "}
                      <a
                        href={`/messages?dm=${c.driver_id}`}
                        className="font-medium text-emerald-700 underline underline-offset-2"
                      >
                        <MessageSquare
                          className="mr-0.5 inline h-3.5 w-3.5"
                          aria-hidden
                        />
                        message
                      </a>
                    </>
                  )}
                </span>
              </div>
            )}
            {centre && (
              <p className="text-stone-500">
                Routed to <span className="font-medium text-stone-700">{centre.name}</span>{" "}
                in {centre.town}.
              </p>
            )}
          </div>
        </section>
      </div>

      {/* Notes + timeline */}
      <div className="mt-5 rounded-2xl border border-stone-200 bg-white p-5">
        <CaseNotes
          caseId={c.id}
          myId={user.id}
          myName={profile?.full_name ?? "A teammate"}
          legacyNote={c.staff_notes}
        />
        <CaseTimeline caseId={c.id} reportedAt={c.created_at} />
      </div>
    </main>
  );
}
