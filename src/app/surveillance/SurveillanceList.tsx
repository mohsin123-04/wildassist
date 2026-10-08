"use client";

import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { Download } from "lucide-react";
import { ANIMAL_TYPES } from "@/lib/triage";

const DeceasedMap = dynamic(() => import("./DeceasedMap"), { ssr: false });

export type DeceasedCase = {
  id: string;
  animal: string;
  title: string | null;
  situation: string;
  lat: number | null;
  lng: number | null;
  surveillance: string[] | null;
  created_at: string;
  status: string;
};

const FLAGS = [
  { value: "avian-flu", label: "Avian flu", color: "bg-amber-100 text-amber-800 border-amber-200" },
  { value: "rabies", label: "Rabies vector", color: "bg-rose-100 text-rose-700 border-rose-200" },
  { value: "cwd", label: "CWD", color: "bg-orange-100 text-orange-700 border-orange-200" },
  { value: "die-off", label: "Die-off", color: "bg-red-100 text-red-700 border-red-200" },
];

const FLAG_MAP = Object.fromEntries(FLAGS.map((f) => [f.value, f]));

function chipClass(base: string, active: boolean) {
  return `rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${base} ${
    active ? "opacity-100 ring-2 ring-offset-1 ring-stone-400" : "opacity-70 hover:opacity-100"
  }`;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-CA", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default function SurveillanceList({ cases }: { cases: DeceasedCase[] }) {
  const [flagFilter, setFlagFilter] = useState<string | null>(null);
  const [animalFilter, setAnimalFilter] = useState<string | null>(null);

  const presentAnimals = useMemo(
    () => ANIMAL_TYPES.filter((a) => cases.some((c) => c.animal === a.value)),
    [cases]
  );

  const filtered = useMemo(
    () =>
      cases.filter((c) => {
        if (flagFilter && !(c.surveillance ?? []).includes(flagFilter)) return false;
        if (animalFilter && c.animal !== animalFilter) return false;
        return true;
      }),
    [cases, flagFilter, animalFilter]
  );

  const center = useMemo<[number, number]>(() => {
    const located = filtered.filter((c) => c.lat && c.lng);
    if (!located.length) return [56, -96];
    return [
      located.reduce((s, c) => s + c.lat!, 0) / located.length,
      located.reduce((s, c) => s + c.lng!, 0) / located.length,
    ];
  }, [filtered]);

  function exportCsv() {
    const header = ["Date", "Animal", "Disease flags", "Lat", "Lng", "Title"];
    const rows = filtered.map((c) => [
      new Date(c.created_at).toISOString().split("T")[0],
      c.animal,
      (c.surveillance ?? []).join("; "),
      c.lat ?? "",
      c.lng ?? "",
      c.title ?? c.situation.replace(/-/g, " "),
    ]);
    const csv = [header, ...rows]
      .map((r) =>
        r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")
      )
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `wildassist-surveillance-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // Summary counts
  const flagCounts = useMemo(
    () =>
      Object.fromEntries(
        FLAGS.map((f) => [
          f.value,
          cases.filter((c) => (c.surveillance ?? []).includes(f.value)).length,
        ])
      ),
    [cases]
  );

  return (
    <div className="flex flex-col gap-6">
      {/* Summary stat tiles */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {FLAGS.map((f) => (
          <button
            key={f.value}
            onClick={() => setFlagFilter(flagFilter === f.value ? null : f.value)}
            className={`rounded-xl border p-3 text-left transition-colors ${
              flagFilter === f.value
                ? "border-stone-300 bg-muted"
                : "border-stone-200 bg-white hover:bg-stone-50"
            }`}
          >
            <span className="block font-display text-2xl font-semibold tabular-nums text-stone-900">
              {flagCounts[f.value]}
            </span>
            <span className="mt-0.5 block text-xs font-medium text-stone-500">
              {f.label}
            </span>
          </button>
        ))}
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={() => { setFlagFilter(null); setAnimalFilter(null); }}
          className={`rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${
            !flagFilter && !animalFilter
              ? "border-stone-400 bg-stone-100 text-stone-800"
              : "border-stone-200 text-stone-500 hover:border-stone-300 hover:text-stone-700"
          }`}
        >
          All reports
        </button>
        {FLAGS.map((f) => (
          <button
            key={f.value}
            onClick={() => setFlagFilter(flagFilter === f.value ? null : f.value)}
            className={chipClass(f.color, flagFilter === f.value)}
          >
            {f.label}
          </button>
        ))}
        {presentAnimals.length > 1 && (
          <>
            <span className="h-4 w-px bg-stone-200" aria-hidden />
            {presentAnimals.map((a) => (
              <button
                key={a.value}
                onClick={() => setAnimalFilter(animalFilter === a.value ? null : a.value)}
                className={`rounded-full border px-3 py-1 text-xs font-semibold transition-colors capitalize ${
                  animalFilter === a.value
                    ? "border-stone-400 bg-stone-100 text-stone-800"
                    : "border-stone-200 text-stone-500 hover:border-stone-300 hover:text-stone-700"
                }`}
              >
                {a.label}
              </button>
            ))}
          </>
        )}
        <button
          onClick={exportCsv}
          className="ml-auto inline-flex items-center gap-1.5 rounded-full border border-stone-200 px-3 py-1 text-xs font-semibold text-stone-600 transition-colors hover:border-stone-300 hover:bg-stone-50"
        >
          <Download className="h-3.5 w-3.5" aria-hidden />
          Export CSV
        </button>
      </div>

      {/* Map */}
      <DeceasedMap cases={filtered} center={center} />

      {/* Case list */}
      {filtered.length === 0 ? (
        <p className="py-12 text-center text-sm text-stone-500">
          No reports match the current filters.
        </p>
      ) : (
        <>
          {/* Table header */}
          <div className="grid grid-cols-[1fr_auto] gap-2 border-b border-stone-200 pb-2 text-xs font-semibold uppercase tracking-wide text-stone-400 sm:grid-cols-[6rem_1fr_auto]">
            <span className="hidden sm:block">Date</span>
            <span>Animal / flags</span>
            <span className="text-right">Location</span>
          </div>
          <ul className="flex flex-col divide-y divide-stone-100">
            {filtered.map((c, i) => (
              <CaseRow key={c.id} c={c} alt={i % 2 === 1} />
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

function CaseRow({ c, alt }: { c: DeceasedCase; alt: boolean }) {
  const animalLabel =
    ANIMAL_TYPES.find((a) => a.value === c.animal)?.label ?? c.animal;

  return (
    <li
      className={`grid grid-cols-[1fr_auto] gap-x-4 gap-y-0.5 rounded-lg px-2 py-3 sm:grid-cols-[6rem_1fr_auto] ${
        alt ? "bg-muted/60" : ""
      }`}
    >
      <span className="hidden self-center text-xs text-stone-500 sm:block">
        {formatDate(c.created_at)}
      </span>

      <div className="flex min-w-0 flex-col gap-1">
        <p className="text-sm font-medium capitalize text-stone-900">
          {animalLabel}
          {c.title ? (
            <span className="ml-1.5 font-normal text-stone-500">
              · {c.title}
            </span>
          ) : null}
        </p>
        <div className="flex flex-wrap gap-1.5">
          <span className="text-xs text-stone-400 sm:hidden">
            {formatDate(c.created_at)}
          </span>
          {(c.surveillance ?? []).map((flag) => {
            const meta = FLAG_MAP[flag];
            return meta ? (
              <span
                key={flag}
                className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${meta.color}`}
              >
                {meta.label}
              </span>
            ) : null;
          })}
        </div>
      </div>

      <span className="self-center text-right text-xs text-stone-500">
        {c.lat && c.lng
          ? `${c.lat.toFixed(2)}, ${c.lng.toFixed(2)}`
          : "No location"}
      </span>
    </li>
  );
}
