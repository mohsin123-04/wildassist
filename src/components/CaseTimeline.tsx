"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type CaseEvent = {
  id: string;
  from_status: string | null;
  to_status: string;
  actor_name: string | null;
  created_at: string;
};

const STATUS_LABEL: Record<string, string> = {
  reported: "Reported",
  in_transit: "In transit",
  at_centre: "At centre",
  closed: "Closed",
};

function when(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

/**
 * Read-only history of a case's status changes (who + when), newest last.
 * Loads lazily when the case detail is expanded. The events are written by a
 * database trigger, so this reflects every change regardless of who made it.
 */
export default function CaseTimeline({
  caseId,
  reportedAt,
}: {
  caseId: string;
  reportedAt: string;
}) {
  const [events, setEvents] = useState<CaseEvent[] | null>(null);

  useEffect(() => {
    let active = true;
    createClient()
      .from("case_events")
      .select("id, from_status, to_status, actor_name, created_at")
      .eq("case_id", caseId)
      .order("created_at", { ascending: true })
      .then(({ data }) => {
        if (active) setEvents((data ?? []) as CaseEvent[]);
      });
    return () => {
      active = false;
    };
  }, [caseId]);

  // The report itself is the first point on the timeline (from created_at).
  const points = [
    { key: "reported", label: "Reported", actor: null as string | null, at: reportedAt },
    ...(events ?? []).map((e) => ({
      key: e.id,
      label: STATUS_LABEL[e.to_status] ?? e.to_status,
      actor: e.actor_name,
      at: e.created_at,
    })),
  ];

  return (
    <div className="mt-4 border-t border-zinc-100 pt-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
        History
      </p>
      {events === null ? (
        <p className="mt-2 text-sm text-zinc-400">Loading…</p>
      ) : (
        <ol className="mt-2 flex flex-col gap-3">
          {points.map((p, i) => (
            <li key={p.key} className="flex gap-3">
              <div className="flex flex-col items-center">
                <span
                  className={`mt-1 h-2.5 w-2.5 rounded-full ${
                    i === points.length - 1 ? "bg-emerald-500" : "bg-zinc-300"
                  }`}
                />
                {i < points.length - 1 && (
                  <span className="w-px flex-1 bg-zinc-200" />
                )}
              </div>
              <div className="pb-0.5 text-sm">
                <span className="font-medium text-zinc-800">{p.label}</span>
                <span className="text-zinc-400"> · {when(p.at)}</span>
                {p.actor && (
                  <span className="block text-xs text-zinc-500">
                    by {p.actor}
                  </span>
                )}
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
