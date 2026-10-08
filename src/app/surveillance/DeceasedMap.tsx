"use client";

import { MapContainer, TileLayer, CircleMarker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import type { DeceasedCase } from "./SurveillanceList";

const FLAG_COLORS: Record<string, string> = {
  "avian-flu": "#d97706",
  "rabies": "#e11d48",
  "cwd": "#ea580c",
  "die-off": "#dc2626",
};

function dotColor(flags: string[] | null): string {
  if (!flags?.length) return "#78716c";
  if (flags.includes("die-off")) return FLAG_COLORS["die-off"];
  if (flags.includes("rabies")) return FLAG_COLORS["rabies"];
  if (flags.includes("cwd")) return FLAG_COLORS["cwd"];
  if (flags.includes("avian-flu")) return FLAG_COLORS["avian-flu"];
  return "#78716c";
}

export default function DeceasedMap({
  cases,
  center,
}: {
  cases: DeceasedCase[];
  center: [number, number];
}) {
  const located = cases.filter((c) => c.lat != null && c.lng != null);

  return (
    <div className="h-[360px] w-full overflow-hidden rounded-2xl border border-stone-200">
      <MapContainer
        center={center}
        zoom={located.length ? 7 : 4}
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
              fillColor: dotColor(c.surveillance),
              fillOpacity: 0.9,
            }}
          >
            <Popup>
              <div className="text-sm">
                <p className="font-semibold capitalize">{c.animal}</p>
                <p>{c.title ?? c.situation.replace(/-/g, " ")}</p>
                {c.surveillance?.length ? (
                  <p className="mt-1 text-stone-500">
                    {c.surveillance.join(", ")}
                  </p>
                ) : null}
              </div>
            </Popup>
          </CircleMarker>
        ))}
      </MapContainer>
      {located.length === 0 && (
        <p className="p-4 text-center text-sm text-stone-500">
          No geo-located reports to display.
        </p>
      )}
    </div>
  );
}
