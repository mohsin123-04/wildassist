"use client";

import { MapContainer, TileLayer, CircleMarker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import type { CaseRow } from "./CaseList";

const VERDICT_COLOR: Record<CaseRow["verdict"], string> = {
  help: "#e11d48",
  leave: "#059669",
  uncertain: "#d97706",
};

export default function CasesMap({
  cases,
  center,
}: {
  cases: CaseRow[];
  center: [number, number];
}) {
  const located = cases.filter((c) => c.lat != null && c.lng != null);

  return (
    <div className="h-[440px] w-full overflow-hidden rounded-2xl border border-black/5">
      <MapContainer
        center={center}
        zoom={9}
        scrollWheelZoom={false}
        className="h-full w-full"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {located.map((c) => (
          <CircleMarker
            key={c.id}
            center={[c.lat!, c.lng!]}
            radius={9}
            pathOptions={{
              color: "#ffffff",
              weight: 2,
              fillColor: VERDICT_COLOR[c.verdict],
              fillOpacity: 0.9,
            }}
          >
            <Popup>
              <div className="text-sm">
                <p className="font-semibold capitalize">
                  {c.animal} · {c.verdict}
                </p>
                <p>{c.title ?? c.situation.replace(/-/g, " ")}</p>
                <p className="text-zinc-500">{c.status.replace(/_/g, " ")}</p>
              </div>
            </Popup>
          </CircleMarker>
        ))}
      </MapContainer>
      {located.length === 0 && (
        <p className="p-4 text-center text-sm text-zinc-500">
          No cases with a location to map yet.
        </p>
      )}
    </div>
  );
}
