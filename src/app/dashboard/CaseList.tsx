"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { Bird, MapPin, Car, Phone, MessageSquare } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { flash } from "@/lib/flash";
import { haversineKm } from "@/lib/centres";
import ShareCase from "@/components/ShareCase";
import CaseTimeline from "@/components/CaseTimeline";
import CaseNotes from "@/components/CaseNotes";
import LocalTime from "@/components/LocalTime";

/** "3h ago", "2d ago", etc. */
function timeAgo(iso: string): string {
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.round(hrs / 24)}d ago`;
}

/** Short distance label, e.g. "150 m away" or "1.3 km away". */
function fmtDistance(km: number): string {
  return km < 1 ? `${Math.round(km * 1000)} m away` : `${km.toFixed(1)} km away`;
}

const CasesMap = dynamic(() => import("./CasesMap"), {
  ssr: false,
  loading: () => (
    <div className="flex h-[440px] items-center justify-center rounded-2xl border border-zinc-200 bg-white text-sm text-zinc-500">
      Loading map…
    </div>
  ),
});

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
  photo_url: string | null;
  driver_id: string | null;
  driver_name: string | null;
  driver_phone?: string | null;
  duplicate_of: string | null;
  assigned_to: string | null;
};

type Teammate = { id: string; full_name: string | null; role: string };

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
  myId,
  myName,
  centreNames,
  centre,
  isAdmin = false,
}: {
  initialCases: CaseRow[];
  myCentreId: string;
  myId: string;
  myName: string;
  centreNames: Record<string, string>;
  centre: [number, number];
  isAdmin?: boolean;
}) {
  const [cases, setCases] = useState<CaseRow[]>(initialCases);
  const [tab, setTab] = useState<Tab>("area");
  const [teammates, setTeammates] = useState<Teammate[]>([]);

  // Roster for assigning cases to a specific person.
  useEffect(() => {
    fetch("/api/team")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d?.members && setTeammates(d.members))
      .catch(() => {});
  }, []);

  // Viewing the dashboard marks all current cases as seen (clears the bell).
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) return;
      supabase
        .from("profiles")
        .update({ last_seen_cases: new Date().toISOString() })
        .eq("id", data.user.id)
        .then(() => window.dispatchEvent(new Event("cases-seen")));
    });
  }, []);

  // Live updates: merge remote case changes so two staff working at once don't
  // clobber each other or see stale status/ownership. Only cases already loaded
  // (and thus RLS-visible) are touched, so this is safe regardless of realtime
  // RLS config. New cases still surface via the notification bell / reload.
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("dashboard-cases")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "cases" },
        (payload) => {
          const row = payload.new as Partial<CaseRow> & { id: string };
          setCases((cs) =>
            cs.map((c) => (c.id === row.id ? { ...c, ...row } : c))
          );
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Deep link: /dashboard?case=<id> reveals and scrolls to that specific case
  // (e.g. from a "shared case" message). Runs once, once cases are present.
  const deepLinked = useRef(false);
  useEffect(() => {
    if (deepLinked.current) return;
    const id = new URLSearchParams(window.location.search).get("case");
    if (id && cases.some((c) => c.id === id)) {
      deepLinked.current = true;
      goToCase(id);
    }
  }, [cases]);

  const [statusFilter, setStatusFilter] = useState<"all" | CaseRow["status"]>(
    "all"
  );
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [claimingId, setClaimingId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [sortBy, setSortBy] = useState<"newest" | "oldest" | "urgent">("newest");
  const [view, setView] = useState<"list" | "map">("list");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [mineOnly, setMineOnly] = useState(false);

  const teammateName = useMemo(
    () => Object.fromEntries(teammates.map((t) => [t.id, t.full_name || "A teammate"])),
    [teammates]
  );

  async function assignCase(id: string, assigned_to: string | null) {
    const previous = cases;
    setCases((cs) => cs.map((c) => (c.id === id ? { ...c, assigned_to } : c)));
    const { error } = await createClient()
      .from("cases")
      .update({ assigned_to })
      .eq("id", id);
    if (error) setCases(previous);
  }

  const areaCases = cases.filter((c) => c.centre_id !== null);
  const unassignedCases = cases.filter((c) => c.centre_id === null);
  const tabCases = tab === "area" ? areaCases : unassignedCases;

  const stats = useMemo(() => {
    return {
      total: cases.length,
      open: cases.filter((c) => c.status !== "closed").length,
      needsHelp: cases.filter(
        (c) => c.verdict === "help" && c.status !== "closed"
      ).length,
      unassigned: unassignedCases.length,
    };
  }, [cases, unassignedCases.length]);

  const q = query.trim().toLowerCase();
  const fromMs = dateFrom ? new Date(dateFrom).getTime() : null;
  // Include the whole "to" day (up to 23:59).
  const toMs = dateTo ? new Date(dateTo).getTime() + 24 * 60 * 60 * 1000 : null;
  const filtered = tabCases
    .filter((c) => statusFilter === "all" || c.status === statusFilter)
    .filter((c) => !mineOnly || c.assigned_to === myId)
    .filter((c) => {
      const t = new Date(c.created_at).getTime();
      if (fromMs != null && t < fromMs) return false;
      if (toMs != null && t >= toMs) return false;
      return true;
    })
    .filter((c) => {
      if (!q) return true;
      return [c.animal, c.title, c.description, c.reporter_name]
        .filter(Boolean)
        .some((v) => (v as string).toLowerCase().includes(q));
    })
    .sort((a, b) => {
      if (sortBy === "urgent") {
        const rank = (c: CaseRow) =>
          c.verdict === "help" && c.status !== "closed" ? 0 : 1;
        if (rank(a) !== rank(b)) return rank(a) - rank(b);
      }
      const ta = new Date(a.created_at).getTime();
      const tb = new Date(b.created_at).getTime();
      return sortBy === "oldest" ? ta - tb : tb - ta;
    });

  function exportCsv() {
    const header = [
      "id",
      "reported_at",
      "animal",
      "situation",
      "assessment",
      "status",
      "title",
      "description",
      "reporter_name",
      "reporter_phone",
      "lat",
      "lng",
      "centre",
    ];
    const esc = (v: unknown) => {
      const s = v == null ? "" : String(v);
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    // Human-readable, cross-referenceable row: real id, centre name (not slug),
    // and the situation with its hyphens removed.
    const row = (c: CaseRow) => [
      c.id,
      c.created_at,
      c.animal,
      c.situation.replace(/-/g, " "),
      c.verdict,
      c.status,
      c.title ?? "",
      c.description ?? "",
      c.reporter_name ?? "",
      c.reporter_phone ?? "",
      c.lat ?? "",
      c.lng ?? "",
      c.centre_id ? (centreNames[c.centre_id] ?? c.centre_id) : "",
    ];
    const rows = [
      header.join(","),
      ...filtered.map((c) => row(c).map(esc).join(",")),
    ];
    const blob = new Blob([rows.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `wildassist-cases-${tab}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

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

  async function dismissDuplicate(id: string) {
    const previous = cases;
    setCases((cs) =>
      cs.map((c) => (c.id === id ? { ...c, duplicate_of: null } : c))
    );
    const { error } = await createClient()
      .from("cases")
      .update({ duplicate_of: null })
      .eq("id", id);
    if (error) setCases(previous);
  }

  // Reveal a specific case (e.g. the original a duplicate points to). It may live
  // in the other tab or be hidden by filters, so switch to its tab and clear
  // anything that would hide it, then expand and scroll to it.
  function goToCase(id: string) {
    const target = cases.find((c) => c.id === id);
    if (!target) return;
    setTab(target.centre_id !== null ? "area" : "unassigned");
    setStatusFilter("all");
    setQuery("");
    setDateFrom("");
    setDateTo("");
    setMineOnly(false);
    setView("list");
    setExpandedId(id);
    setTimeout(() => {
      document
        .getElementById(`case-${id}`)
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 60);
  }

  // Merge a duplicate into its original: copy the second reporter's contact and
  // details onto the original as a note (so nothing is lost), then close the dup.
  async function mergeAndClose(c: CaseRow, orig: CaseRow) {
    if (savingId === c.id) return;
    setSavingId(c.id); // claim the lock immediately so a double-click can't double-insert
    const parts = [
      `Merged from a duplicate report made ${timeAgo(c.created_at)} (${new Date(
        c.created_at
      ).toLocaleString()}).`,
    ];
    const contact = [c.reporter_name, c.reporter_phone].filter(Boolean).join(" · ");
    if (contact) parts.push(`Reporter: ${contact}`);
    if (c.description) parts.push(`They reported: ${c.description}`);
    if (c.lat != null && c.lng != null) {
      parts.push(
        `Location: https://www.openstreetmap.org/?mlat=${c.lat}&mlon=${c.lng}#map=16/${c.lat}/${c.lng}`
      );
    }
    const body = parts.join("\n");
    const { error } = await createClient()
      .from("case_notes")
      .insert({ case_id: orig.id, author_id: myId, author_name: myName, body });
    if (error) {
      setSavingId(null);
      flash("Couldn't save the merge note — case not closed.");
      return;
    }
    await updateStatus(c.id, "closed"); // manages savingId itself
    flash("Merged into the original and closed.");
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
        <Stat label={isAdmin ? "All cases" : "In your area"} value={areaCases.length} />
        <Stat label="Open" value={stats.open} accent="text-emerald-700" />
        <Stat label="Needs help" value={stats.needsHelp} accent="text-rose-700" />
        <Stat label="Unassigned" value={stats.unassigned} accent="text-amber-600" />
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        <Tab active={tab === "area"} onClick={() => setTab("area")}>
          {isAdmin ? "All assigned" : "In your area"} ({areaCases.length})
        </Tab>
        <Tab active={tab === "unassigned"} onClick={() => setTab("unassigned")}>
          Unassigned ({unassignedCases.length})
        </Tab>
      </div>

      {/* Search / sort / export */}
      <div className="flex flex-wrap items-center gap-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Search cases"
          placeholder="Search animal, title, description, reporter…"
          className="h-10 min-w-0 flex-1 rounded-xl border border-zinc-200 bg-white px-4 text-sm outline-none transition-colors focus:border-zinc-400 focus:ring-4 focus:ring-zinc-900/5"
        />
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
          aria-label="Sort cases"
          className="h-10 rounded-xl border border-zinc-200 bg-white px-3 text-sm text-zinc-700 outline-none focus:border-emerald-400"
        >
          <option value="newest">Newest first</option>
          <option value="oldest">Oldest first</option>
          <option value="urgent">Most urgent</option>
        </select>
        <button
          onClick={exportCsv}
          disabled={filtered.length === 0}
          className="inline-flex h-10 items-center justify-center rounded-xl border border-zinc-200 bg-white px-4 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 disabled:opacity-50"
        >
          Export CSV
        </button>
        <div className="flex h-10 overflow-hidden rounded-xl border border-zinc-200">
          {(["list", "map"] as const).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`px-3 text-sm font-medium capitalize transition-colors ${
                view === v
                  ? "bg-zinc-900 text-white"
                  : "bg-white text-zinc-600 hover:bg-zinc-50"
              }`}
            >
              {v}
            </button>
          ))}
        </div>
      </div>

      {/* Date range + assignment filter */}
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <label className="flex items-center gap-1.5 text-zinc-500">
          From
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            aria-label="Reported from date"
            className="h-9 rounded-lg border border-zinc-200 bg-white px-2 text-zinc-700 outline-none focus:border-emerald-400"
          />
        </label>
        <label className="flex items-center gap-1.5 text-zinc-500">
          to
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            aria-label="Reported to date"
            className="h-9 rounded-lg border border-zinc-200 bg-white px-2 text-zinc-700 outline-none focus:border-emerald-400"
          />
        </label>
        {(dateFrom || dateTo) && (
          <button
            onClick={() => {
              setDateFrom("");
              setDateTo("");
            }}
            className="text-xs font-medium text-zinc-500 underline underline-offset-2 hover:text-zinc-800"
          >
            Clear dates
          </button>
        )}
        <Chip active={mineOnly} onClick={() => setMineOnly((v) => !v)}>
          Assigned to me
        </Chip>
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

      {/* List or map */}
      {view === "map" ? (
        <CasesMap cases={filtered} center={centre} />
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-zinc-200 bg-white/50 p-10 text-center">
          <Bird className="mx-auto h-8 w-8 text-zinc-300" aria-hidden />
          <p className="mt-2 font-medium text-zinc-900">Nothing here</p>
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
                id={`case-${c.id}`}
                className={`rounded-2xl border bg-white shadow-sm scroll-mt-24 ${
                  c.verdict === "help" && c.status !== "closed"
                    ? "border-zinc-200 border-l-4 border-l-rose-400"
                    : "border-zinc-200"
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
                      <span className="text-sm font-medium capitalize text-zinc-900">
                        {c.animal}
                      </span>
                      {otherCentre && (
                        <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-600">
                          {otherCentre}
                        </span>
                      )}
                      {c.centre_id === null && (
                        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
                          unassigned
                        </span>
                      )}
                      {c.duplicate_of && (
                        <span className="rounded-full bg-orange-100 px-2 py-0.5 text-xs font-medium text-orange-700">
                          possible duplicate
                        </span>
                      )}
                      {c.assigned_to && (
                        <span className="rounded-full bg-sky-100 px-2 py-0.5 text-xs font-medium text-sky-700">
                          {c.assigned_to === myId
                            ? "you"
                            : teammateName[c.assigned_to] ?? "assigned"}
                        </span>
                      )}
                    </div>
                    <p className="mt-1.5 text-sm text-zinc-700">
                      {c.title ?? c.situation.replace(/-/g, " ")}
                    </p>
                    <p className="mt-1 text-xs text-zinc-500">
                      <LocalTime iso={c.created_at} />
                    </p>
                  </div>
                  <span
                    aria-hidden
                    className={`mt-1 shrink-0 text-lg leading-none text-zinc-500 transition-transform ${expanded ? "rotate-180" : ""}`}
                  >
                    ▾
                  </span>
                </button>

                {expanded && (
                  <div className="border-t border-zinc-100 px-4 py-3">
                    {c.duplicate_of && (
                      <div
                        role="alert"
                        className="mb-3 rounded-xl border border-orange-200 bg-orange-50 p-3 text-sm"
                      >
                        <p className="font-medium text-orange-900">
                          Possible duplicate
                        </p>
                        {(() => {
                          const orig = cases.find(
                            (x) => x.id === c.duplicate_of
                          );
                          if (!orig)
                            return (
                              <p className="mt-0.5 leading-6 text-orange-800">
                                An earlier open report of the same animal was
                                made nearby.
                              </p>
                            );
                          const dist =
                            c.lat != null &&
                            c.lng != null &&
                            orig.lat != null &&
                            orig.lng != null
                              ? haversineKm(c.lat, c.lng, orig.lat, orig.lng)
                              : null;
                          return (
                            <>
                              <p className="mt-0.5 leading-6 text-orange-800">
                                Looks like the same{" "}
                                <span className="capitalize">
                                  {orig.animal.toLowerCase()}
                                </span>{" "}
                                already reported {timeAgo(orig.created_at)}
                                {dist != null
                                  ? `, ${fmtDistance(dist)}`
                                  : ""}
                                {orig.title ? ` — "${orig.title}"` : ""}.
                              </p>
                              <div className="mt-2 flex flex-wrap gap-2">
                                <button
                                  onClick={() => mergeAndClose(c, orig)}
                                  disabled={savingId === c.id}
                                  title="Copy this reporter's contact and details onto the original, then close this one"
                                  className="inline-flex h-8 items-center justify-center rounded-lg bg-orange-600 px-3 text-xs font-semibold text-white transition-colors hover:bg-orange-700 disabled:opacity-50"
                                >
                                  {savingId === c.id ? "Merging…" : "Merge & close"}
                                </button>
                                <button
                                  onClick={() => dismissDuplicate(c.id)}
                                  className="inline-flex h-8 items-center justify-center rounded-lg border border-orange-200 px-3 text-xs font-medium text-orange-700 transition-colors hover:bg-orange-100"
                                >
                                  Not a duplicate
                                </button>
                                <button
                                  onClick={() => goToCase(orig.id)}
                                  className="inline-flex h-8 items-center justify-center rounded-lg border border-orange-200 px-3 text-xs font-medium text-orange-700 transition-colors hover:bg-orange-100"
                                >
                                  View original
                                </button>
                              </div>
                            </>
                          );
                        })()}
                      </div>
                    )}
                    {c.photo_url && (
                      <a
                        href={`/api/case-image/${c.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mb-3 block"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={`/api/case-image/${c.id}`}
                          alt="Reported animal"
                          className="max-h-52 w-full rounded-xl object-cover"
                        />
                      </a>
                    )}
                    {c.description && (
                      <div className="mb-3">
                        <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
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
                          className="inline-flex items-center gap-1.5 text-sm font-medium text-emerald-700 underline underline-offset-2"
                        >
                          <MapPin className="h-4 w-4" aria-hidden /> View reported location
                        </a>
                      ) : (
                        <span className="text-sm text-zinc-500">
                          No location shared
                        </span>
                      )}

                      {c.centre_id === null && myCentreId ? (
                        <button
                          onClick={() => claim(c.id)}
                          disabled={claimingId === c.id}
                          className="ml-auto inline-flex h-9 items-center justify-center rounded-xl bg-zinc-900 px-4 text-sm font-medium text-white transition-colors hover:bg-zinc-800 disabled:opacity-50"
                        >
                          {claimingId === c.id ? "Claiming…" : "Claim for my centre"}
                        </button>
                      ) : c.centre_id === null ? (
                        <span className="ml-auto text-sm text-zinc-500">
                          Unassigned
                        </span>
                      ) : (
                        <label className="ml-auto flex items-center gap-2 text-sm text-zinc-500">
                          Status
                          <select
                            value={c.status}
                            disabled={savingId === c.id}
                            onChange={(e) =>
                              updateStatus(c.id, e.target.value as CaseRow["status"])
                            }
                            className="rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-sm text-zinc-800 outline-none focus:border-emerald-400 disabled:opacity-50"
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

                    {c.driver_name && (
                      <div className="mt-3 rounded-xl bg-emerald-50 px-3 py-2.5 text-sm text-emerald-900">
                        <div className="flex items-center gap-2">
                          <Car className="h-4 w-4 shrink-0" aria-hidden />
                          <span>
                            Being transported by{" "}
                            <span className="font-medium">
                              {c.driver_name}
                            </span>
                          </span>
                        </div>
                        {c.driver_id && (
                          <div className="mt-2 flex flex-wrap gap-2">
                            {c.driver_phone && (
                              <a
                                href={`tel:${c.driver_phone.replace(/[^0-9+]/g, "")}`}
                                className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-emerald-200 bg-white px-3 text-xs font-medium text-emerald-800 transition-colors hover:bg-emerald-50"
                              >
                                <Phone className="h-3.5 w-3.5" aria-hidden /> Call driver
                              </a>
                            )}
                            <a
                              href={`/messages?dm=${c.driver_id}`}
                              className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-emerald-200 bg-white px-3 text-xs font-medium text-emerald-800 transition-colors hover:bg-emerald-50"
                            >
                              <MessageSquare className="h-3.5 w-3.5" aria-hidden /> Message driver
                            </a>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Reporter contact */}
                    <div className="mt-4 border-t border-zinc-100 pt-3">
                      <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
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
                        <p className="mt-1 text-sm text-zinc-500">
                          The finder didn&apos;t leave contact details.
                        </p>
                      )}
                    </div>

                    {/* Assignment */}
                    {teammates.length > 0 && (
                      <div className="mt-4 border-t border-zinc-100 pt-3">
                        <label
                          htmlFor={`assign-${c.id}`}
                          className="text-xs font-semibold uppercase tracking-wide text-zinc-500"
                        >
                          Assigned to
                        </label>
                        <select
                          id={`assign-${c.id}`}
                          value={c.assigned_to ?? ""}
                          onChange={(e) =>
                            assignCase(c.id, e.target.value || null)
                          }
                          className="mt-1 block h-10 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm text-zinc-700 outline-none focus:border-emerald-400"
                        >
                          <option value="">Unassigned</option>
                          {teammates.map((t) => (
                            <option key={t.id} value={t.id}>
                              {t.full_name || "A teammate"}
                              {t.id === myId ? " (me)" : ""}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    {/* Notes log */}
                    <CaseNotes
                      caseId={c.id}
                      myId={myId}
                      myName={myName}
                      legacyNote={c.staff_notes}
                    />

                    {/* Share to team */}
                    <div className="mt-4 border-t border-zinc-100 pt-3">
                      <ShareCase caseId={c.id} />
                    </div>

                    {/* Status history */}
                    <CaseTimeline caseId={c.id} reportedAt={c.created_at} />
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
  accent = "text-zinc-900",
}: {
  label: string;
  value: number;
  accent?: string;
}) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
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
          ? "bg-zinc-900 text-white"
          : "border border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50"
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
          ? "bg-zinc-900 text-white"
          : "border border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50"
      }`}
    >
      {children}
    </button>
  );
}
