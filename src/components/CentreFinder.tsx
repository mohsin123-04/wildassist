"use client";

import { useEffect, useState } from "react";
import {
  ONTARIO_CENTRES,
  rankCentres,
  FACILITY_TYPES,
  type Centre,
  type RankedCentre,
} from "@/lib/centres";
import type { AnimalType } from "@/lib/triage";

type Status = "idle" | "locating" | "ranked" | "denied";

export default function CentreFinder({
  animal,
  caseId,
}: {
  animal: AnimalType;
  caseId?: string | null;
}) {
  const [status, setStatus] = useState<Status>("idle");
  const [centres, setCentres] = useState<(Centre | RankedCentre)[]>([]);
  const [allCentres, setAllCentres] = useState<Centre[]>(ONTARIO_CENTRES);

  // Load centres from the database (falls back to the seed list on the server).
  useEffect(() => {
    fetch("/api/centres")
      .then((r) => r.json())
      .then((d) => {
        if (Array.isArray(d.centres) && d.centres.length) setAllCentres(d.centres);
      })
      .catch(() => {});
  }, []);

  // Attach the nearest centre + reporter coordinates to the logged case.
  function attachCentreToCase(centreId: string, lat: number, lng: number) {
    if (!caseId) return;
    fetch(`/api/cases/${caseId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ centreId, lat, lng }),
    }).catch(() => {});
  }

  function findNearest() {
    if (!("geolocation" in navigator)) {
      showAll();
      return;
    }
    setStatus("locating");

    const onOk = (pos: GeolocationPosition) => {
      const ranked = rankCentres(
        pos.coords.latitude,
        pos.coords.longitude,
        animal,
        allCentres
      );
      setCentres(ranked);
      setStatus("ranked");
      if (ranked[0]) {
        attachCentreToCase(
          ranked[0].id,
          pos.coords.latitude,
          pos.coords.longitude
        );
      }
    };

    // Quick attempt, then a longer high-accuracy retry before giving up.
    navigator.geolocation.getCurrentPosition(
      onOk,
      () =>
        navigator.geolocation.getCurrentPosition(onOk, () => showAll(), {
          enableHighAccuracy: true,
          timeout: 25000,
          maximumAge: 0,
        }),
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 300000 }
    );
  }

  function showAll() {
    setCentres([...allCentres].sort((a, b) => a.name.localeCompare(b.name)));
    setStatus("denied");
  }

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
      <h2 className="font-display text-lg font-semibold text-zinc-900">
        Find a wildlife centre
      </h2>

      {status === "idle" && (
        <>
          <p className="mt-1 text-sm leading-6 text-zinc-600">
            Share your location and we&apos;ll sort centres by how close they are
            to you.
          </p>
          <button
            onClick={findNearest}
            className="mt-4 inline-flex h-11 items-center justify-center rounded-xl bg-emerald-600 px-6 font-medium text-white shadow-sm transition-all hover:bg-emerald-700 active:scale-[0.98]"
          >
            📍 Find nearest centre
          </button>
        </>
      )}

      {status === "locating" && (
        <p className="mt-3 text-sm text-zinc-600">Getting your location…</p>
      )}

      {status === "denied" && (
        <p className="mt-1 text-sm text-amber-700">
          We couldn&apos;t get your location, so here are all the centres we know
          of. Call ahead before bringing an animal in.
        </p>
      )}

      {(status === "ranked" || status === "denied") && (
        <ul className="mt-4 flex flex-col gap-3">
          {centres.map((c) => (
            <li
              key={c.id}
              className="rounded-2xl border border-black/5 bg-[var(--background)] p-3.5"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium text-zinc-900">{c.name}</p>
                  <p className="text-sm text-zinc-500">{c.town}</p>
                  {c.type && c.type !== "rehab_centre" && (
                    <span className="mt-1 inline-block rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-600">
                      {FACILITY_TYPES[c.type]}
                    </span>
                  )}
                </div>
                {"distanceKm" in c && (
                  <span className="shrink-0 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-800">
                    {Math.round(c.distanceKm)} km
                  </span>
                )}
              </div>
              <div className="mt-2 flex flex-wrap gap-3 text-sm">
                {c.phone && (
                  <a
                    href={`tel:${c.phone.replace(/[^0-9+]/g, "")}`}
                    className="font-medium text-emerald-700 underline underline-offset-2"
                  >
                    {c.phone}
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
            </li>
          ))}
        </ul>
      )}

      <p className="mt-4 text-xs leading-5 text-zinc-400">
        Distances are approximate (straight-line) and this list may be
        incomplete. Always call a centre before transporting an animal.
      </p>
    </div>
  );
}
