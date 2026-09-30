"use client";

import { useState } from "react";
import { MapPin, Phone } from "lucide-react";
import { haversineKm, formatDistance, type Centre } from "@/lib/centres";
import Spinner from "@/components/Spinner";

type State =
  | { kind: "idle" }
  | { kind: "locating" }
  | { kind: "denied" }
  | { kind: "none" }
  | { kind: "found"; centre: Centre; km: number };

/**
 * One-tap "call the nearest wildlife centre" for the emergency page: locate,
 * pick the closest verified facility that has a phone number, and offer a
 * tel: button. Numbers come from the verified centres dataset.
 */
export default function NearestHelpButton() {
  const [state, setState] = useState<State>({ kind: "idle" });

  function find() {
    if (!("geolocation" in navigator)) {
      setState({ kind: "denied" });
      return;
    }
    setState({ kind: "locating" });
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const r = await fetch("/api/centres");
          const d = await r.json();
          const centres: Centre[] = (d.centres ?? []).filter(
            (c: Centre) => c.phone && c.lat != null && c.lng != null
          );
          if (!centres.length) {
            setState({ kind: "none" });
            return;
          }
          const { latitude, longitude } = pos.coords;
          let best = centres[0];
          let bestKm = Infinity;
          for (const c of centres) {
            const km = haversineKm(latitude, longitude, c.lat, c.lng);
            if (km < bestKm) {
              bestKm = km;
              best = c;
            }
          }
          setState({ kind: "found", centre: best, km: bestKm });
        } catch {
          setState({ kind: "none" });
        }
      },
      () => setState({ kind: "denied" }),
      { enableHighAccuracy: false, timeout: 12000, maximumAge: 300000 }
    );
  }

  if (state.kind === "found") {
    const { centre, km } = state;
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
        <p className="text-xs font-medium uppercase tracking-widest text-emerald-700">
          Nearest wildlife help
        </p>
        <p className="mt-1.5 font-display text-lg font-semibold text-zinc-900">
          {centre.name}
        </p>
        <p className="mt-0.5 flex items-center gap-1.5 text-sm text-zinc-600">
          <MapPin className="h-4 w-4 shrink-0 text-zinc-500" aria-hidden />
          {centre.town} · {formatDistance(km, centre.country)} away
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <a
            href={`tel:${centre.phone!.replace(/[^0-9+]/g, "")}`}
            className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-emerald-700 px-6 font-semibold text-white shadow-sm transition-all hover:bg-emerald-800 active:scale-[0.98]"
          >
            <Phone className="h-4 w-4" aria-hidden /> Call {centre.phone}
          </a>
          <button
            onClick={find}
            className="text-sm font-medium text-emerald-700 underline underline-offset-2 hover:text-emerald-800"
          >
            Re-check my location
          </button>
        </div>
        <p className="mt-3 text-xs text-zinc-500">
          Verified number. Hours vary — if there&apos;s no answer, use the guided
          report and the details still reach nearby help.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
      <p className="font-display text-lg font-semibold text-zinc-900">
        Need to talk to someone now?
      </p>
      <p className="mt-1 text-sm leading-6 text-zinc-600">
        We&apos;ll find the closest verified wildlife centre with a phone line, based
        on your location.
      </p>
      <button
        onClick={find}
        disabled={state.kind === "locating"}
        className="mt-3 inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-emerald-700 px-6 font-semibold text-white shadow-sm transition-all hover:bg-emerald-800 active:scale-[0.98] disabled:opacity-60"
      >
        {state.kind === "locating" ? (
          <Spinner label="Finding the nearest centre…" />
        ) : (
          <>
            <Phone className="h-4 w-4" aria-hidden /> Call the nearest wildlife
            centre
          </>
        )}
      </button>
      {state.kind === "denied" && (
        <p className="mt-3 text-sm text-rose-700">
          We couldn&apos;t get your location. You can still reach help through the
          guided report.
        </p>
      )}
      {state.kind === "none" && (
        <p className="mt-3 text-sm text-rose-700">
          Couldn&apos;t load the centre list — please try again in a moment.
        </p>
      )}
    </div>
  );
}
