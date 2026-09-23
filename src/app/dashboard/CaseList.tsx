"use client";

import { useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export type CaseRow = {
  id: string;
  created_at: string;
  animal: string;
  situation: string;
  verdict: "leave" | "help" | "uncertain";
  title: string | null;
  status: "reported" | "in_transit" | "at_centre" | "closed";
  description: string | null;
  lat: number | null;
  lng: number | null;
};

const STATUSES: { value: CaseRow["status"]; label: string }[] = [
  { value: "reported", label: "Reported" },
  { value: "in_transit", label: "In transit" },
  { value: "at_centre", label: "At centre" },
  { value: "closed", label: "Closed" },
];

const VERDICT_BADGE: Record<CaseRow["verdict"], string> = {
  help: "bg-rose-100 text-rose-700",
  leave: "bg-emerald-100 text-emerald-700",
  uncertain: "bg-amber-100 text-amber-700",
};

type Filter = "all" | CaseRow["status"];

export default function CaseList({ initialCases }: { initialCases: CaseRow[] }) {
  const [cases, setCases] = useState<CaseRow[]>(initialCases);
  const [filter, setFilter] = useState<Filter>("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);

  const stats = useMemo(() => {
    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    return {
      total: cases.length,
      open: cases.filter((c) => c.status !== "closed").length,
      needsHelp: cases.filter(
        (c) => c.verdict === "help" && c.status !== "closed"
      ).length,
      thisWeek: cases.filter((c) => new Date(c.created_at).getTime() >= weekAgo)
        .length,
    };
  }, [cases]);

  const filtered =
    filter === "all" ? cases : cases.filter((c) => c.status === filter);

  async function updateStatus(id: string, status: CaseRow["status"]) {
    const previous = cases;
    setCases((cs) => cs.map((c) => (c.id === id ? { ...c, status } : c)));
    setSavingId(id);
    const { error } = await createClient()
      .from("cases")
      .update({ status })
      .eq("id", id);
    setSavingId(null);
    if (error) setCases(previous);
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Total" value={stats.total} />
        <Stat label="Open" value={stats.open} accent="text-emerald-700" />
        <Stat label="Needs help" value={stats.needsHelp} accent="text-rose-600" />
        <Stat label="This week" value={stats.thisWeek} />
      </div>

      {/* Filters */}
      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
        <Chip active={filter === "all"} onClick={() => setFilter("all")}>
          All
        </Chip>
        {STATUSES.map((s) => (
          <Chip
            key={s.value}
            active={filter === s.value}
            onClick={() => setFilter(s.value)}
          >
            {s.label}
          </Chip>
        ))}
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-black/10 bg-white/50 p-10 text-center">
          <p className="text-3xl">🕊️</p>
          <p className="mt-2 font-medium text-emerald-950">
            {cases.length === 0 ? "No cases yet" : "Nothing here"}
          </p>
          <p className="mt-1 text-sm text-zinc-500">
            {cases.length === 0
              ? "When someone near you reports an animal and picks your centre, it will appear here."
              : "No cases match this filter."}
          </p>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {filtered.map((c) => {
            const expanded = expandedId === c.id;
            return (
              <li
                key={c.id}
                className="rounded-2xl border border-black/5 bg-white shadow-sm"
              >
                <button
                  onClick={() => setExpandedId(expanded ? null : c.id)}
                  className="flex w-full items-start justify-between gap-3 p-4 text-left"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-semibold ${VERDICT_BADGE[c.verdict]}`}
                      >
                        {c.verdict}
                      </span>
                      <span className="text-sm font-medium capitalize text-emerald-950">
                        {c.animal}
                      </span>
                    </div>
                    <p className="mt-1.5 text-sm text-zinc-700">
                      {c.title ?? c.situation.replace(/-/g, " ")}
                    </p>
                    <p className="mt-1 text-xs text-zinc-400">
                      {new Date(c.created_at).toLocaleString()}
                    </p>
                  </div>
                  <span
                    aria-hidden
                    className={`mt-1 shrink-0 text-zinc-400 transition-transform ${expanded ? "rotate-180" : ""}`}
                  >
                    ▾
                  </span>
                </button>

                {expanded && (
                  <div className="border-t border-black/5 px-4 py-3">
                    {c.description && (
                      <div className="mb-3">
                        <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
                          Reporter's description
                        </p>
                        <p className="mt-1 text-sm leading-6 text-zinc-700">
                          {c.description}
                        </p>
                      </div>
                    )}
                    <div className="flex flex-wrap items-center gap-4">
                      {c.lat != null && c.lng != null ? (
                        <a
                          href={`https://www.openstreetmap.org/?mlat=${c.lat}&mlon=${c.lng}#map=14/${c.lat}/${c.lng}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm font-medium text-emerald-700 underline underline-offset-2"
                        >
                          📍 View reported location
                        </a>
                      ) : (
                        <span className="text-sm text-zinc-400">
                          No location shared
                        </span>
                      )}

                      <label className="ml-auto flex items-center gap-2 text-sm text-zinc-500">
                        Status
                        <select
                          value={c.status}
                          disabled={savingId === c.id}
                          onChange={(e) =>
                            updateStatus(c.id, e.target.value as CaseRow["status"])
                          }
                          className="rounded-lg border border-black/10 bg-white px-2.5 py-1.5 text-sm text-zinc-800 outline-none focus:border-emerald-400 disabled:opacity-50"
                        >
                          {STATUSES.map((s) => (
                            <option key={s.value} value={s.value}>
                              {s.label}
                            </option>
                          ))}
                        </select>
                      </label>
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  accent = "text-emerald-950",
}: {
  label: string;
  value: number;
  accent?: string;
}) {
  return (
    <div className="rounded-2xl border border-black/5 bg-white p-4 shadow-sm">
      <p className={`font-display text-2xl font-semibold ${accent}`}>{value}</p>
      <p className="mt-0.5 text-xs text-zinc-500">{label}</p>
    </div>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`shrink-0 rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors ${
        active
          ? "bg-emerald-700 text-white"
          : "border border-black/10 bg-white text-zinc-600 hover:bg-black/5"
      }`}
    >
      {children}
    </button>
  );
}
