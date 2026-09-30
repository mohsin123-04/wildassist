"use client";

import { useEffect, useState } from "react";
import {
  rankCentres,
  FACILITY_TYPES,
  formatDistance,
  type Centre,
  type RankedCentre,
} from "@/lib/centres";
import type { AnimalType } from "@/lib/triage";

/**
 * Shows the closest facilities to the finder (rehab centres, vets, hotlines,
 * etc.) so they can reach the nearest help for immediate care, even though the
 * case itself is managed by the assigned rehabilitation centre.
 */
export default function NearbyHelp({
  lat,
  lng,
  animal,
  assignedId,
}: {
  lat: number;
  lng: number;
  animal: AnimalType;
  assignedId?: string | null;
}) {
  const [items, setItems] = useState<RankedCentre[]>([]);

  useEffect(() => {
    fetch("/api/centres")
      .then((r) => r.json())
      .then((d) => {
        const all = (d.centres ?? []) as Centre[];
        if (!all.length) return;
        setItems(rankCentres(lat, lng, animal, all).slice(0, 5));
      })
      .catch(() => {});
  }, [lat, lng, animal]);

  if (items.length === 0) return null;

  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
      <h2 className="font-display text-lg font-semibold tracking-tight text-stone-900">
        Help near you
      </h2>
      <p className="mt-1 text-sm leading-6 text-stone-500">
        For immediate help you can also contact one of the closest places below.
        Always call ahead before bringing an animal in.
      </p>

      <ul className="mt-4 flex flex-col gap-2.5">
        {items.map((c) => {
          const isAssigned = c.id === assignedId;
          const typeLabel =
            c.type && c.type !== "rehab_centre" ? FACILITY_TYPES[c.type] : null;
          return (
            <li
              key={c.id}
              className="rounded-xl border border-stone-200 bg-stone-50/60 p-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium text-stone-900">{c.name}</p>
                  <p className="text-sm text-stone-500">{c.town}</p>
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    {isAssigned && (
                      <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">
                        handling your report
                      </span>
                    )}
                    {typeLabel && (
                      <span className="rounded-full bg-stone-200 px-2 py-0.5 text-xs font-medium text-stone-600">
                        {typeLabel}
                      </span>
                    )}
                  </div>
                </div>
                <span className="shrink-0 rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-stone-600 ring-1 ring-stone-200">
                  {formatDistance(c.distanceKm, c.country)}
                </span>
              </div>
              {(c.phone || c.website) && (
                <div className="mt-2 flex flex-wrap gap-3 text-sm">
                  {c.phone && (
                    <a
                      href={`tel:${c.phone.replace(/[^0-9+]/g, "")}`}
                      className="font-medium text-emerald-700 underline underline-offset-2"
                    >
                      Call {c.phone}
                    </a>
                  )}
                  {c.website && (
                    <a
                      href={c.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-medium text-emerald-700 underline underline-offset-2"
                    >
                      Website
                    </a>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
