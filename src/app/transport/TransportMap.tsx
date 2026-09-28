"use client";

import { MapContainer, TileLayer, CircleMarker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import type { Job } from "./TransportList";

/**
 * Live map of transport work: the volunteer's own position, the pickups they've
 * claimed (emerald), and available pickups nearby (rose). Re-renders whenever
 * the parent reloads the job lists, so it stays current.
 */
export default function TransportMap({
  coords,
  available,
  mine,
}: {
  coords: { lat: number; lng: number } | null;
  available: Job[];
  mine: Job[];
}) {
  const located = [...mine, ...available].filter(
    (j) => j.lat != null && j.lng != null
  );

  const center: [number, number] = coords
    ? [coords.lat, coords.lng]
    : located.length
      ? [located[0].lat!, located[0].lng!]
      : [44.0, -79.4];
  const zoom = coords || located.length ? 11 : 7;

  const mineIds = new Set(mine.map((j) => j.id));

  return (
    <div className="h-[340px] w-full overflow-hidden rounded-2xl border border-zinc-200">
      <MapContainer
        center={center}
        zoom={zoom}
        scrollWheelZoom={false}
        className="h-full w-full"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {coords && (
          <CircleMarker
            center={[coords.lat, coords.lng]}
            radius={8}
            pathOptions={{
              color: "#ffffff",
              weight: 2,
              fillColor: "#2563eb",
              fillOpacity: 1,
            }}
          >
            <Popup>You are here</Popup>
          </CircleMarker>
        )}

        {located.map((j) => {
          const isMine = mineIds.has(j.id);
          return (
            <CircleMarker
              key={j.id}
              center={[j.lat!, j.lng!]}
              radius={9}
              pathOptions={{
                color: "#ffffff",
                weight: 2,
                fillColor: isMine ? "#059669" : "#e11d48",
                fillOpacity: 0.9,
              }}
            >
              <Popup>
                <div className="text-sm">
                  <p className="font-semibold capitalize">{j.animal}</p>
                  <p>{j.title ?? "Injured animal needs transport"}</p>
                  {j.distanceKm != null && (
                    <p className="text-zinc-500">
                      {Math.round(j.distanceKm)} km away
                      {isMine ? " · your pickup" : ""}
                    </p>
                  )}
                  <a
                    href={`https://www.openstreetmap.org/?mlat=${j.lat}&mlon=${j.lng}#map=15/${j.lat}/${j.lng}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-emerald-600 underline underline-offset-2"
                  >
                    Open in maps
                  </a>
                </div>
              </Popup>
            </CircleMarker>
          );
        })}
      </MapContainer>
    </div>
  );
}
