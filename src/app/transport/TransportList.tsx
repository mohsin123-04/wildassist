"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { Inbox, Navigation, CheckCircle2 } from "lucide-react";
import { flash } from "@/lib/flash";

/**
 * Turn-by-turn directions link that opens the device's native maps app
 * (Google Maps on Android/web, Apple Maps on iOS) with navigation to the
 * pickup, starting from the driver's current location.
 */
function directionsUrl(lat: number, lng: number): string {
  if (typeof navigator !== "undefined" && /iPhone|iPad|iPod/.test(navigator.userAgent)) {
    return `https://maps.apple.com/?daddr=${lat},${lng}&dirflg=d`;
  }
  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=driving`;
}

function shortWhen(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

const TransportMap = dynamic(() => import("./TransportMap"), {
  ssr: false,
  loading: () => (
    <div className="flex h-[340px] items-center justify-center rounded-2xl border border-stone-200 bg-white text-sm text-stone-500">
      Loading map…
    </div>
  ),
});

export type Job = {
  id: string;
  created_at: string;
  animal: string;
  title: string | null;
  status: "reported" | "in_transit" | "at_centre" | "closed";
  lat: number | null;
  lng: number | null;
  centre_id: string | null;
  distanceKm: number | null;
  // Only present on the volunteer's own claimed jobs:
  reporter_name?: string | null;
  reporter_phone?: string | null;
};

export default function TransportList({
  centreNames,
}: {
  centreNames: Record<string, string>;
}) {
  const [available, setAvailable] = useState<Job[]>([]);
  const [mine, setMine] = useState<Job[]>([]);
  const [completed, setCompleted] = useState<Job[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    if (!("geolocation" in navigator)) {
      load(null);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (p) => {
        const c = { lat: p.coords.latitude, lng: p.coords.longitude };
        setCoords(c);
        load(c);
      },
      () => load(null),
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 }
    );
  }, []);

  // Keep the map/list live: refresh periodically and when the tab regains focus.
  // These are BACKGROUND refreshes — they update the data in place and must not
  // flip the full-screen loading state, or the map would blank out and rebuild
  // on every tick. Focus refreshes are throttled so rapid tab switching doesn't
  // spam the endpoint.
  useEffect(() => {
    const id = setInterval(() => load(coords, true), 45000);
    let lastFocusRefresh = 0;
    const onFocus = () => {
      const now = Date.now();
      if (now - lastFocusRefresh < 30000) return;
      lastFocusRefresh = now;
      load(coords, true);
    };
    window.addEventListener("focus", onFocus);
    return () => {
      clearInterval(id);
      window.removeEventListener("focus", onFocus);
    };
  }, [coords]);

  async function load(
    c: { lat: number; lng: number } | null,
    background = false
  ) {
    // Only the first/explicit load shows the full-screen placeholder; background
    // refreshes update the lists in place so the map stays put.
    if (!background) setLoading(true);
    const q = c ? `?lat=${c.lat}&lng=${c.lng}` : "";
    try {
      const r = await fetch(`/api/transport/jobs${q}`);
      const d = await r.json();
      setAvailable(d.available ?? []);
      setMine(d.mine ?? []);
      setCompleted(d.completed ?? []);
    } catch {
      // leave empty
    } finally {
      if (!background) setLoading(false);
    }
  }

  async function act(id: string, action: "claim" | "deliver" | "release") {
    setBusyId(id);
    try {
      const res = await fetch("/api/transport", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          caseId: id,
          action,
          lat: coords?.lat,
          lng: coords?.lng,
        }),
      });
      if (res.ok) {
        await load(coords, true);
      } else {
        const d = await res.json().catch(() => ({}));
        flash(d.error ?? "That didn't work. Please try again.");
      }
    } catch {
      flash("Network problem. Please try again.");
    } finally {
      setBusyId(null);
    }
  }

  if (loading) {
    return (
      <div className="rounded-2xl border border-stone-200 bg-white p-8 text-center text-sm text-stone-500">
        Finding transport requests near you…
      </div>
    );
  }

  const hasMappable =
    coords != null ||
    [...mine, ...available].some((j) => j.lat != null && j.lng != null);

  return (
    <div className="flex flex-col gap-6">
      {hasMappable && (
        <div>
          <TransportMap coords={coords} available={available} mine={mine} />
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-stone-500">
            <Legend color="#2563eb" label="You" />
            <Legend color="#059669" label="Your pickups" />
            <Legend color="#e11d48" label="Available nearby" />
          </div>
        </div>
      )}

      <Section title={`Your pickups (${mine.length})`}>
        {mine.length === 0 ? (
          <Empty text="You haven't claimed any pickups yet." />
        ) : (
          mine.map((j) => (
            <JobCard
              key={j.id}
              job={j}
              centreName={j.centre_id ? centreNames[j.centre_id] : null}
              showContact
              actions={
                <>
                  <button
                    onClick={() => act(j.id, "deliver")}
                    disabled={busyId === j.id}
                    className="inline-flex h-9 items-center justify-center rounded-xl bg-forest-900 px-4 text-sm font-medium text-white transition-colors hover:bg-forest-800 disabled:opacity-50"
                  >
                    Mark delivered
                  </button>
                  <button
                    onClick={() => act(j.id, "release")}
                    disabled={busyId === j.id}
                    className="inline-flex h-9 items-center justify-center rounded-xl border border-stone-200 px-4 text-sm font-medium text-stone-600 transition-colors hover:bg-stone-50 disabled:opacity-50"
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
          <Empty text="No animals need transport near you right now. Check back soon." />
        ) : (
          available.map((j) => (
            <JobCard
              key={j.id}
              job={j}
              centreName={j.centre_id ? centreNames[j.centre_id] : null}
              actions={
                <button
                  onClick={() => act(j.id, "claim")}
                  disabled={busyId === j.id}
                  className="inline-flex h-9 items-center justify-center rounded-xl bg-forest-900 px-5 text-sm font-medium text-white transition-colors hover:bg-forest-800 disabled:opacity-50"
                >
                  {busyId === j.id ? "Claiming…" : "Claim pickup"}
                </button>
              }
            />
          ))
        )}
      </Section>

      {completed.length > 0 && (
        <div>
          <button
            onClick={() => setShowHistory((v) => !v)}
            className="flex items-center gap-2 text-sm font-medium text-stone-600 transition-colors hover:text-stone-900"
          >
            <CheckCircle2 className="h-4 w-4 text-emerald-600" aria-hidden />
            {completed.length} pickup{completed.length === 1 ? "" : "s"}{" "}
            delivered
            <span className="text-stone-400">{showHistory ? "▲" : "▼"}</span>
          </button>
          {showHistory && (
            <ul className="mt-3 flex flex-col gap-2">
              {completed.map((j) => (
                <li
                  key={j.id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-stone-200 bg-white px-4 py-2.5 text-sm"
                >
                  <span className="min-w-0 truncate">
                    <span className="font-medium capitalize text-stone-800">
                      {j.animal}
                    </span>
                    {j.centre_id && centreNames[j.centre_id] && (
                      <span className="text-stone-500">
                        {" "}
                        → {centreNames[j.centre_id]}
                      </span>
                    )}
                  </span>
                  <span className="shrink-0 text-xs text-stone-400">
                    {shortWhen(j.created_at)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        className="h-2.5 w-2.5 rounded-full"
        style={{ backgroundColor: color }}
      />
      {label}
    </span>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="mb-2.5 font-display text-lg font-semibold tracking-tight text-stone-900">
        {title}
      </h2>
      <div className="flex flex-col gap-3">{children}</div>
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-stone-200 bg-stone-50/50 p-10 text-center">
      <Inbox className="mx-auto h-8 w-8 text-stone-300" aria-hidden />
      <p className="mt-2 text-sm text-stone-500">{text}</p>
    </div>
  );
}

function JobCard({
  job,
  centreName,
  showContact,
  actions,
}: {
  job: Job;
  centreName: string | null;
  showContact?: boolean;
  actions: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-4">
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium capitalize text-stone-900">
          {job.animal}
        </span>
        {job.distanceKm != null && (
          <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700">
            {Math.round(job.distanceKm)} km away
          </span>
        )}
      </div>
      <p className="mt-1 text-sm text-stone-700">
        {job.title ?? "Injured animal needs transport"}
      </p>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
        {job.lat != null && job.lng != null && (
          <a
            href={directionsUrl(job.lat, job.lng)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 font-medium text-emerald-700 underline underline-offset-2"
          >
            <Navigation className="h-3.5 w-3.5" aria-hidden /> Directions
          </a>
        )}
        {centreName && <span className="text-stone-500">→ {centreName}</span>}
        {showContact && job.reporter_phone && (
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
