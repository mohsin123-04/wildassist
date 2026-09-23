"use client";

import { useEffect, useState } from "react";
import { haversineKm } from "@/lib/centres";

export type Job = {
  id: string;
  created_at: string;
  animal: string;
  title: string | null;
  description: string | null;
  lat: number | null;
  lng: number | null;
  status: "reported" | "in_transit" | "at_centre" | "closed";
  driver_id: string | null;
  centre_id: string | null;
  reporter_name: string | null;
  reporter_phone: string | null;
};

export default function TransportList({
  initialJobs,
  myId,
  centreNames,
}: {
  initialJobs: Job[];
  myId: string;
  centreNames: Record<string, string>;
}) {
  const [jobs, setJobs] = useState<Job[]>(initialJobs);
  const [me, setMe] = useState<{ lat: number; lng: number } | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    if (!("geolocation" in navigator)) return;
    navigator.geolocation.getCurrentPosition(
      (p) => setMe({ lat: p.coords.latitude, lng: p.coords.longitude }),
      () => {},
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 }
    );
  }, []);

  function distanceKm(j: Job): number | null {
    if (!me || j.lat == null || j.lng == null) return null;
    return haversineKm(me.lat, me.lng, j.lat, j.lng);
  }

  function sortByDistance(list: Job[]) {
    return [...list].sort((a, b) => {
      const da = distanceKm(a);
      const db = distanceKm(b);
      if (da == null || db == null) return 0;
      return da - db;
    });
  }

  const mine = sortByDistance(
    jobs.filter((j) => j.driver_id === myId && j.status === "in_transit")
  );
  const available = sortByDistance(
    jobs.filter((j) => j.driver_id === null && j.status === "reported")
  );

  async function act(id: string, action: "claim" | "deliver" | "release") {
    setBusyId(id);
    const res = await fetch("/api/transport", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ caseId: id, action }),
    });
    setBusyId(null);
    if (!res.ok) return;
    setJobs((js) =>
      js.map((j) => {
        if (j.id !== id) return j;
        if (action === "claim")
          return { ...j, driver_id: myId, status: "in_transit" };
        if (action === "deliver") return { ...j, status: "at_centre" };
        return { ...j, driver_id: null, status: "reported" };
      })
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <Section title={`Your pickups (${mine.length})`}>
        {mine.length === 0 ? (
          <Empty text="You haven't claimed any pickups yet." />
        ) : (
          mine.map((j) => (
            <JobCard
              key={j.id}
              job={j}
              distance={distanceKm(j)}
              centreName={j.centre_id ? centreNames[j.centre_id] : null}
              actions={
                <>
                  <button
                    onClick={() => act(j.id, "deliver")}
                    disabled={busyId === j.id}
                    className="inline-flex h-9 items-center justify-center rounded-full bg-emerald-700 px-4 text-sm font-medium text-white transition-colors hover:bg-emerald-800 disabled:opacity-50"
                  >
                    Mark delivered
                  </button>
                  <button
                    onClick={() => act(j.id, "release")}
                    disabled={busyId === j.id}
                    className="inline-flex h-9 items-center justify-center rounded-full border border-black/10 px-4 text-sm font-medium text-zinc-600 transition-colors hover:bg-black/5 disabled:opacity-50"
                  >
                    Release
                  </button>
                </>
              }
            />
          ))
        )}
      </Section>

      <Section title={`Available nearby (${available.length})`}>
        {available.length === 0 ? (
          <Empty text="No animals need transport right now. Check back soon." />
        ) : (
          available.map((j) => (
            <JobCard
              key={j.id}
              job={j}
              distance={distanceKm(j)}
              centreName={j.centre_id ? centreNames[j.centre_id] : null}
              actions={
                <button
                  onClick={() => act(j.id, "claim")}
                  disabled={busyId === j.id}
                  className="inline-flex h-9 items-center justify-center rounded-full bg-emerald-700 px-5 text-sm font-medium text-white transition-colors hover:bg-emerald-800 disabled:opacity-50"
                >
                  {busyId === j.id ? "Claiming…" : "Claim pickup"}
                </button>
              }
            />
          ))
        )}
      </Section>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <h2 className="mb-2.5 font-display text-lg font-semibold text-emerald-950">
        {title}
      </h2>
      <div className="flex flex-col gap-3">{children}</div>
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-black/10 bg-white/50 p-6 text-center text-sm text-zinc-500">
      {text}
    </div>
  );
}

function JobCard({
  job,
  distance,
  centreName,
  actions,
}: {
  job: Job;
  distance: number | null;
  centreName: string | null;
  actions: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-black/5 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium capitalize text-emerald-950">
              {job.animal}
            </span>
            {distance != null && (
              <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-800">
                {Math.round(distance)} km away
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-zinc-700">
            {job.title ?? "Injured animal needs transport"}
          </p>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
        {job.lat != null && job.lng != null && (
          <a
            href={`https://www.openstreetmap.org/?mlat=${job.lat}&mlon=${job.lng}#map=15/${job.lat}/${job.lng}`}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-emerald-700 underline underline-offset-2"
          >
            📍 Pickup location
          </a>
        )}
        {centreName && <span className="text-zinc-500">→ {centreName}</span>}
        {job.reporter_phone && (
          <a
            href={`tel:${job.reporter_phone.replace(/[^0-9+]/g, "")}`}
            className="font-medium text-emerald-700 underline underline-offset-2"
          >
            Call {job.reporter_name ?? "finder"}
          </a>
        )}
      </div>

      <div className="mt-3 flex flex-wrap gap-2">{actions}</div>
    </div>
  );
}
