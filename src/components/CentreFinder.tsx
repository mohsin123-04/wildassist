"use client";

import { useState } from "react";
import {
  ONTARIO_CENTRES,
  rankCentres,
  type Centre,
  type RankedCentre,
} from "@/lib/centres";
import type { AnimalType } from "@/lib/triage";

type Status = "idle" | "locating" | "ranked" | "denied";

export default function CentreFinder({ animal }: { animal: AnimalType }) {
  const [status, setStatus] = useState<Status>("idle");
  const [centres, setCentres] = useState<(Centre | RankedCentre)[]>([]);

  function findNearest() {
    if (!("geolocation" in navigator)) {
      showAll();
      return;
    }
    setStatus("locating");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCentres(
          rankCentres(pos.coords.latitude, pos.coords.longitude, animal)
        );
        setStatus("ranked");
      },
      () => showAll(),
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 }
    );
  }

  function showAll() {
    setCentres([...ONTARIO_CENTRES].sort((a, b) => a.name.localeCompare(b.name)));
    setStatus("denied");
  }

  return (
    <div className="rounded-2xl border border-emerald-200 bg-white p-5">
      <h2 className="font-semibold">Find a wildlife centre</h2>

      {status === "idle" && (
        <>
          <p className="mt-1 text-sm text-zinc-600">
            Share your location and we&apos;ll sort Ontario centres by how close
            they are to you.
          </p>
          <button
            onClick={findNearest}
            className="mt-3 inline-flex h-11 items-center justify-center rounded-full bg-emerald-600 px-6 font-medium text-white transition-colors hover:bg-emerald-700"
          >
            Find nearest centre
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
              className="rounded-xl border border-black/5 bg-zinc-50 p-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-medium">{c.name}</p>
                  <p className="text-sm text-zinc-500">{c.town}</p>
                </div>
                {"distanceKm" in c && (
                  <span className="shrink-0 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-800">
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
