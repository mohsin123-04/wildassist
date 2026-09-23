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
  reporter_name: string | null;
  reporter_phone: string | null;
  staff_notes: string | null;
  centre_id: string | null;
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

type Tab = "area" | "unassigned";

export default function CaseList({
  initialCases,
  myCentreId,
  centreNames,
}: {
  initialCases: CaseRow[];
  myCentreId: string;
  centreNames: Record<string, string>;
}) {
  const [cases, setCases] = useState<CaseRow[]>(initialCases);
  const [tab, setTab] = useState<Tab>("area");
  const [statusFilter, setStatusFilter] = useState<"all" | CaseRow["status"]>(
    "all"
  );
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [noteDrafts, setNoteDrafts] = useState<Record<string, string>>({});
  const [savingNoteId, setSavingNoteId] = useState<string | null>(null);
  const [claimingId, setClaimingId] = useState<string | null>(null);

  const areaCases = cases.filter((c) => c.centre_id !== null);
  const unassignedCases = cases.filter((c) => c.centre_id === null);
  const tabCases = tab === "area" ? areaCases : unassignedCases;

  const stats = useMemo(() => {
    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    return {
      total: cases.length,
      open: cases.filter((c) => c.status !== "closed").length,
      needsHelp: cases.filter(
        (c) => c.verdict === "help" && c.status !== "closed"
      ).length,
      unassigned: unassignedCases.length,
    };
  }, [cases, unassignedCases.length]);

  const filtered =
    statusFilter === "all"
      ? tabCases
      : tabCases.filter((c) => c.status === statusFilter);

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

  async function saveNotes(id: string) {
    const notes = noteDrafts[id] ?? "";
    setSavingNoteId(id);
    const { error } = await createClient()
      .from("cases")
      .update({ staff_notes: notes.trim() || null })
      .eq("id", id);
    setSavingNoteId(null);
    if (!error) {
      setCases((cs) =>
        cs.map((c) =>
          c.id === id ? { ...c, staff_notes: notes.trim() || null } : c
        )
      );
    }
  }

  async function claim(id: string) {
    setClaimingId(id);
    const { error } = await createClient()
      .from("cases")
      .update({ centre_id: myCentreId })
      .eq("id", id);
    setClaimingId(null);
    if (!error) {
      setCases((cs) =>
        cs.map((c) => (c.id === id ? { ...c, centre_id: myCentreId } : c))
      );
      setExpandedId(null);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="In your area" value={areaCases.length} />
        <Stat label="Open" value={stats.open} accent="text-emerald-700" />
        <Stat label="Needs help" value={stats.needsHelp} accent="text-rose-600" />
        <Stat label="Unassigned" value={stats.unassigned} accent="text-amber-600" />
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        <Tab active={tab === "area"} onClick={() => setTab("area")}>
          In your area ({areaCases.length})
        </Tab>
        <Tab active={tab === "unassigned"} onClick={() => setTab("unassigned")}>
          Unassigned ({unassignedCases.length})
        </Tab>
      </div>

      {/* Status filters */}
      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
        <Chip active={statusFilter === "all"} onClick={() => setStatusFilter("all")}>
          All
        </Chip>
        {STATUSES.map((s) => (
          <Chip
            key={s.value}
            active={statusFilter === s.value}
            onClick={() => setStatusFilter(s.value)}
          >
            {s.label}
          </Chip>
        ))}
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-black/10 bg-white/50 p-10 text-center">
          <p className="text-3xl">🕊️</p>
          <p className="mt-2 font-medium text-emerald-950">Nothing here</p>
          <p className="mt-1 text-sm text-zinc-500">
            {tab === "unassigned"
              ? "No unassigned cases right now."
              : "No cases in your area match this filter."}
          </p>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {filtered.map((c) => {
            const expanded = expandedId === c.id;
            const isMine = c.centre_id === myCentreId;
            const otherCentre =
              c.centre_id && !isMine ? centreNames[c.centre_id] : null;
            return (
              <li
                key={c.id}
                className={`rounded-2xl border bg-white shadow-sm ${
                  c.verdict === "help" && c.status !== "closed"
                    ? "border-black/5 border-l-4 border-l-rose-400"
                    : "border-black/5"
                }`}
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
                      {otherCentre && (
                        <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-500">
                          {otherCentre}
                        </span>
                      )}
                      {c.centre_id === null && (
                        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
                          unassigned
                        </span>
                      )}
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
                          Reporter&apos;s description
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

                      {c.centre_id === null ? (
                        <button
                          onClick={() => claim(c.id)}
                          disabled={claimingId === c.id}
                          className="ml-auto inline-flex h-9 items-center justify-center rounded-full bg-emerald-700 px-4 text-sm font-medium text-white transition-colors hover:bg-emerald-800 disabled:opacity-50"
                        >
                          {claimingId === c.id ? "Claiming…" : "Claim for my centre"}
                        </button>
                      ) : (
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
                      )}
                    </div>

                    {/* Reporter contact */}
                    <div className="mt-4 border-t border-black/5 pt-3">
                      <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
                        Reported by
                      </p>
                      {c.reporter_name || c.reporter_phone ? (
                        <p className="mt-1 text-sm text-zinc-700">
                          {c.reporter_name && <span>{c.reporter_name}</span>}
                          {c.reporter_name && c.reporter_phone && " · "}
                          {c.reporter_phone && (
                            <a
                              href={`tel:${c.reporter_phone.replace(/[^0-9+]/g, "")}`}
                              className="font-medium text-emerald-700 underline underline-offset-2"
                            >
                              {c.reporter_phone}
                            </a>
                          )}
                        </p>
                      ) : (
                        <p className="mt-1 text-sm text-zinc-400">
                          The finder didn&apos;t leave contact details.
                        </p>
                      )}
                    </div>

                    {/* Staff notes */}
                    <div className="mt-4 border-t border-black/5 pt-3">
                      <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
                        Staff notes
                      </p>
                      <textarea
                        rows={2}
                        value={noteDrafts[c.id] ?? c.staff_notes ?? ""}
                        onChange={(e) =>
                          setNoteDrafts((d) => ({ ...d, [c.id]: e.target.value }))
                        }
                        placeholder="Add an internal note (e.g. volunteer driver assigned, ETA 3pm)."
                        className="mt-1 w-full resize-none rounded-xl border border-black/10 bg-white p-3 text-sm outline-none transition-colors focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/20"
                      />
                      <button
                        onClick={() => saveNotes(c.id)}
                        disabled={
                          savingNoteId === c.id ||
                          (noteDrafts[c.id] ?? c.staff_notes ?? "") ===
                            (c.staff_notes ?? "")
                        }
                        className="mt-2 inline-flex h-9 items-center justify-center rounded-full bg-emerald-700 px-4 text-sm font-medium text-white transition-colors hover:bg-emerald-800 disabled:opacity-50"
                      >
                        {savingNoteId === c.id ? "Saving…" : "Save note"}
                      </button>
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

function Tab({
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
      className={`rounded-xl px-4 py-2 text-sm font-medium transition-colors ${
        active
          ? "bg-emerald-700 text-white"
          : "border border-black/10 bg-white text-zinc-600 hover:bg-black/5"
      }`}
    >
      {children}
    </button>
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
          ? "bg-emerald-100 text-emerald-800"
          : "border border-black/10 bg-white text-zinc-600 hover:bg-black/5"
      }`}
    >
      {children}
    </button>
  );
}
