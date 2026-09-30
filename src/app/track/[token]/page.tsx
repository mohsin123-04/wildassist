import Link from "next/link";
import { Phone, Globe } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/server";
import AutoRefresh from "./AutoRefresh";

export const dynamic = "force-dynamic";

type CaseRow = {
  id: string;
  animal: string;
  title: string | null;
  situation: string;
  status: "reported" | "in_transit" | "at_centre" | "closed";
  created_at: string;
  centre_id: string | null;
};

const STATUS_META: Record<
  CaseRow["status"],
  { label: string; blurb: string; dot: string; card: string }
> = {
  reported: {
    label: "Reported",
    blurb: "Your report has been received and shared with nearby help.",
    dot: "bg-amber-500",
    card: "border-amber-200 bg-amber-50",
  },
  in_transit: {
    label: "On the way",
    blurb: "A volunteer is transporting the animal to a wildlife centre.",
    dot: "bg-sky-500",
    card: "border-sky-200 bg-sky-50",
  },
  at_centre: {
    label: "In care",
    blurb: "The animal has arrived at the centre and is being looked after.",
    dot: "bg-emerald-500",
    card: "border-emerald-200 bg-emerald-50",
  },
  closed: {
    label: "Resolved",
    blurb: "This report has been closed. Thank you for helping.",
    dot: "bg-zinc-400",
    card: "border-zinc-200 bg-zinc-50",
  },
};

const STATUS_LABEL: Record<string, string> = {
  reported: "Reported",
  in_transit: "On the way",
  at_centre: "In care",
  closed: "Resolved",
};

function when(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default async function TrackPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const admin = createAdminClient();

  // Look up by the unguessable token (service role, but we only return
  // non-identifying fields below — no reporter details, location, or notes).
  const { data: c } = await admin
    .from("cases")
    .select("id, animal, title, situation, status, created_at, centre_id")
    .eq("track_token", token)
    .single<CaseRow>();

  if (!c) {
    return (
      <main className="mx-auto flex w-full max-w-lg flex-1 flex-col px-5 py-16 text-center">
        <h1 className="font-display text-2xl font-semibold text-zinc-900">
          Report not found
        </h1>
        <p className="mt-2 text-zinc-600">
          This tracking link doesn&apos;t match a report. Check that you copied
          the whole link.
        </p>
        <Link
          href="/triage"
          className="mx-auto mt-6 inline-flex h-11 items-center justify-center rounded-xl bg-zinc-900 px-6 text-sm font-semibold text-white transition-colors hover:bg-zinc-800"
        >
          Report an animal
        </Link>
      </main>
    );
  }

  let centre:
    | { name: string; town: string; phone: string | null; website: string | null }
    | null = null;
  if (c.centre_id) {
    const { data } = await admin
      .from("centres")
      .select("name, town, phone, website")
      .eq("id", c.centre_id)
      .single<{
        name: string;
        town: string;
        phone: string | null;
        website: string | null;
      }>();
    centre = data ?? null;
  }

  const { data: eventRows } = await admin
    .from("case_events")
    .select("to_status, created_at")
    .eq("case_id", c.id)
    .order("created_at", { ascending: true });

  // The report itself is the first point; then each status change.
  const timeline = [
    { label: "Reported", at: c.created_at },
    ...(eventRows ?? []).map((e) => ({
      label: STATUS_LABEL[e.to_status] ?? e.to_status,
      at: e.created_at,
    })),
  ];

  const meta = STATUS_META[c.status];

  return (
    <main className="animate-in mx-auto flex w-full max-w-lg flex-1 flex-col px-5 py-8">
      <p className="text-xs font-medium uppercase tracking-widest text-zinc-500">
        Report status
      </p>
      <h1 className="mt-2 font-display text-2xl font-semibold capitalize tracking-tight text-zinc-900">
        {c.animal}
        {c.title ? ` · ${c.title}` : ""}
      </h1>

      <div className={`mt-5 rounded-2xl border p-5 ${meta.card}`}>
        <span className="inline-flex items-center gap-2 rounded-full bg-white px-2.5 py-1 text-xs font-semibold uppercase tracking-wide text-zinc-700 ring-1 ring-black/5">
          <span aria-hidden className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
          {meta.label}
        </span>
        <p className="mt-3 leading-7 text-zinc-700">{meta.blurb}</p>
        {centre && (
          <p className="mt-2 text-sm text-zinc-600">
            Routed to <span className="font-medium">{centre.name}</span> in{" "}
            {centre.town}.
          </p>
        )}
        <AutoRefresh done={c.status === "closed"} />
      </div>

      {/* Reach the centre handling this animal, for status questions. */}
      {centre && (centre.phone || centre.website) && (
        <div className="mt-4 rounded-2xl border border-zinc-200 bg-white p-5">
          <h2 className="font-display text-base font-semibold text-zinc-900">
            Questions about this animal?
          </h2>
          <p className="mt-1 text-sm text-zinc-600">
            Contact {centre.name} directly. Please don&apos;t call for routine
            updates during busy intake hours.
          </p>
          <div className="mt-3 flex flex-wrap gap-2.5">
            {centre.phone && (
              <a
                href={`tel:${centre.phone.replace(/[^0-9+]/g, "")}`}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-emerald-700 px-5 text-sm font-semibold text-white transition-colors hover:bg-emerald-800"
              >
                <Phone className="h-4 w-4" aria-hidden /> Call {centre.phone}
              </a>
            )}
            {centre.website && (
              <a
                href={centre.website}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-zinc-200 bg-white px-5 text-sm font-semibold text-zinc-700 transition-colors hover:bg-zinc-50"
              >
                <Globe className="h-4 w-4" aria-hidden /> Visit website
              </a>
            )}
          </div>
        </div>
      )}

      <div className="mt-6">
        <h2 className="mb-2.5 font-display text-lg font-semibold tracking-tight text-zinc-900">
          Progress
        </h2>
        <ol className="flex flex-col gap-3">
          {timeline.map((p, i) => (
            <li key={i} className="flex gap-3">
              <div className="flex flex-col items-center">
                <span
                  className={`mt-1 h-2.5 w-2.5 rounded-full ${
                    i === timeline.length - 1 ? "bg-emerald-500" : "bg-zinc-300"
                  }`}
                />
                {i < timeline.length - 1 && (
                  <span className="w-px flex-1 bg-zinc-200" />
                )}
              </div>
              <div className="pb-0.5 text-sm">
                <span className="font-medium text-zinc-800">{p.label}</span>
                <span className="text-zinc-500"> · {when(p.at)}</span>
              </div>
            </li>
          ))}
        </ol>
      </div>

      <p className="mt-6 text-xs leading-5 text-zinc-500">
        This page updates on its own as the animal is helped — bookmark it to
        check back. For an urgent, life-threatening situation, call a wildlife
        rehabilitator or vet directly rather than waiting.
      </p>

      <div className="mt-8 flex flex-wrap gap-2.5">
        <Link
          href="/triage"
          className="inline-flex h-11 items-center justify-center rounded-xl bg-zinc-900 px-6 text-sm font-semibold text-white transition-colors hover:bg-zinc-800"
        >
          Report another animal
        </Link>
        <Link
          href="/emergency"
          className="inline-flex h-11 items-center justify-center rounded-xl border border-zinc-200 bg-white px-6 text-sm font-semibold text-zinc-700 transition-colors hover:bg-zinc-50"
        >
          Emergency basics
        </Link>
      </div>
    </main>
  );
}
