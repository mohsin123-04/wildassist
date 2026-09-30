"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ChevronLeft, ChevronRight, X } from "lucide-react";
import { SITUATIONS } from "@/lib/triage";
import AnalyticsActions from "@/components/AnalyticsActions";

type Row = {
  id: string;
  created_at: string;
  animal: string;
  situation: string;
  verdict: string;
  status: string;
  centre_id: string | null;
  duplicate_of: string | null;
};
type EventRow = { case_id: string; to_status: string; created_at: string };

const DAY = 24 * 60 * 60 * 1000;

const RANGES = [
  { key: "week", label: "Week" },
  { key: "month", label: "Month" },
  { key: "year", label: "Year" },
  { key: "all", label: "All time" },
] as const;
type RangeKey = (typeof RANGES)[number]["key"];

const STATUS_META = [
  { key: "reported", label: "Reported", color: "bg-stone-400" },
  { key: "in_transit", label: "In transit", color: "bg-amber-400" },
  { key: "at_centre", label: "At centre", color: "bg-sky-400" },
  { key: "closed", label: "Closed", color: "bg-emerald-500" },
];
const STATUS_LABEL: Record<string, string> = Object.fromEntries(
  STATUS_META.map((s) => [s.key, s.label])
);
const VERDICT_META = [
  { key: "help", label: "Needs help", color: "bg-rose-400" },
  { key: "uncertain", label: "Uncertain", color: "bg-amber-400" },
  { key: "leave", label: "Leave it be", color: "bg-emerald-500" },
];
const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const SITUATION_LABEL: Record<string, string> = Object.fromEntries(
  SITUATIONS.map((s) => [s.value, s.label])
);

function formatDuration(ms: number): string {
  if (ms < 60 * 60 * 1000) return `${Math.max(1, Math.round(ms / 60000))} min`;
  if (ms < 48 * 60 * 60 * 1000) return `${(ms / 3_600_000).toFixed(1)} h`;
  return `${(ms / 86_400_000).toFixed(1)} d`;
}
function median(nums: number[]): number {
  const s = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

export default function AnalyticsClient({
  cases: all,
  events,
  centreNames,
  isAdmin,
}: {
  cases: Row[];
  events: EventRow[];
  centreNames: Record<string, string>;
  isAdmin: boolean;
}) {
  // Everything renders client-side (so range/month switching is instant and
  // there's no date/locale hydration mismatch). Gate on mount; the route's
  // loading.tsx covers the initial data fetch.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const [now] = useState(() => Date.now());

  const [rangeKey, setRangeKey] = useState<RangeKey>("month");
  const [anchorMs, setAnchorMs] = useState(() => Date.now());
  const [animalFilter, setAnimalFilter] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string | null>(null);

  // Compute the active calendar window [startMs, endMs) + the comparison window.
  const win = useMemo(() => {
    const a = new Date(anchorMs);
    const cap = (end: number) => Math.min(end, now + 1);
    if (rangeKey === "week") {
      const dow = (a.getDay() + 6) % 7; // Monday = 0
      const start = new Date(a.getFullYear(), a.getMonth(), a.getDate() - dow).getTime();
      const end = start + 7 * DAY;
      const fmt = (t: number) =>
        new Date(t).toLocaleDateString(undefined, { month: "short", day: "numeric" });
      return {
        startMs: start,
        endMs: cap(end),
        windowLabel: `${fmt(start)} – ${fmt(end - DAY)}`,
        prevLabel: "previous week",
        prevStartMs: start - 7 * DAY,
        prevEndMs: start,
        navigable: true,
      };
    }
    if (rangeKey === "month") {
      const start = new Date(a.getFullYear(), a.getMonth(), 1).getTime();
      const end = new Date(a.getFullYear(), a.getMonth() + 1, 1).getTime();
      return {
        startMs: start,
        endMs: cap(end),
        windowLabel: new Date(start).toLocaleDateString(undefined, {
          month: "long",
          year: "numeric",
        }),
        prevLabel: "previous month",
        prevStartMs: new Date(a.getFullYear(), a.getMonth() - 1, 1).getTime(),
        prevEndMs: start,
        navigable: true,
      };
    }
    if (rangeKey === "year") {
      const start = new Date(a.getFullYear(), 0, 1).getTime();
      const end = new Date(a.getFullYear() + 1, 0, 1).getTime();
      return {
        startMs: start,
        endMs: cap(end),
        windowLabel: String(a.getFullYear()),
        prevLabel: "previous year",
        prevStartMs: new Date(a.getFullYear() - 1, 0, 1).getTime(),
        prevEndMs: start,
        navigable: true,
      };
    }
    const earliest = all.length
      ? Math.min(...all.map((c) => +new Date(c.created_at)))
      : now - 30 * DAY;
    return {
      startMs: earliest,
      endMs: now + 1,
      windowLabel: "all time",
      prevLabel: null as string | null,
      prevStartMs: null as number | null,
      prevEndMs: null as number | null,
      navigable: false,
    };
  }, [rangeKey, anchorMs, now, all]);

  const m = useMemo(() => {
    const { startMs, endMs, prevStartMs, prevEndMs } = win;
    const at = (iso: string) => new Date(iso).getTime();
    const match = (c: Row) =>
      (!animalFilter || c.animal === animalFilter) &&
      (!statusFilter || c.status === statusFilter);
    const cases = all.filter((c) => {
      const t = at(c.created_at);
      return t >= startMs && t < endMs && match(c);
    });

    let changePct: number | null = null;
    if (prevStartMs != null && prevEndMs != null) {
      const prevCount = all.filter((c) => {
        const t = at(c.created_at);
        return t >= prevStartMs && t < prevEndMs && match(c);
      }).length;
      changePct =
        prevCount === 0
          ? null
          : Math.round(((cases.length - prevCount) / prevCount) * 100);
    }

    const closed = cases.filter((c) => c.status === "closed").length;
    const dupCount = cases.filter((c) => c.duplicate_of).length;
    const dupPct = cases.length ? Math.round((dupCount / cases.length) * 100) : 0;

    const openQueue = all.filter(
      (c) => c.status !== "closed" && (!animalFilter || c.animal === animalFilter)
    );
    const needsHelpOpen = openQueue.filter((c) => c.verdict === "help").length;
    const openAges = openQueue.map((c) => now - at(c.created_at));
    const oldestOpen = openAges.length ? Math.max(...openAges) : null;
    const medianOpenAge = openAges.length ? median(openAges) : null;

    const inRange = new Set(cases.map((c) => c.id));
    const reportedAt: Record<string, number> = {};
    for (const c of cases) reportedAt[c.id] = at(c.created_at);
    const firstResponse: Record<string, number> = {};
    const firstClosed: Record<string, number> = {};
    for (const e of events) {
      if (!inRange.has(e.case_id)) continue;
      const t = at(e.created_at);
      if (e.to_status === "in_transit" || e.to_status === "at_centre") {
        if (firstResponse[e.case_id] === undefined || t < firstResponse[e.case_id])
          firstResponse[e.case_id] = t;
      }
      if (e.to_status === "closed") {
        if (firstClosed[e.case_id] === undefined || t < firstClosed[e.case_id])
          firstClosed[e.case_id] = t;
      }
    }
    const caseResponse: Record<string, number> = {};
    for (const [id, t] of Object.entries(firstResponse)) {
      const d = t - reportedAt[id];
      if (reportedAt[id] !== undefined && d >= 0) caseResponse[id] = d;
    }
    const responseMs = Object.values(caseResponse);
    const medianResponse = responseMs.length ? median(responseMs) : null;
    const respondedPct = cases.length
      ? Math.round((responseMs.length / cases.length) * 100)
      : 0;

    // Bucket size follows the span: days → weeks → calendar months, so a year
    // reads as 12 monthly bars instead of 52 slivers.
    const spanDays = Math.max(1, Math.ceil((endMs - startMs) / DAY));
    const bucketUnit: "day" | "week" | "month" =
      spanDays > 180 ? "month" : spanDays > 45 ? "week" : "day";
    const bounds: number[] = [];
    if (bucketUnit === "month") {
      const s = new Date(startMs);
      let t = new Date(s.getFullYear(), s.getMonth(), 1).getTime();
      while (t < endMs) {
        bounds.push(Math.max(t, startMs));
        const d = new Date(t);
        t = new Date(d.getFullYear(), d.getMonth() + 1, 1).getTime();
      }
    } else {
      const step = bucketUnit === "week" ? 7 * DAY : DAY;
      for (let t = startMs; t < endMs; t += step) bounds.push(t);
    }
    const buckets: { label: string; count: number; medianResp: number | null }[] =
      [];
    for (let i = 0; i < bounds.length; i++) {
      const t = bounds[i];
      const bEnd = bounds[i + 1] ?? endMs;
      const inB = cases.filter((c) => {
        const x = at(c.created_at);
        return x >= t && x < bEnd;
      });
      const resp = inB
        .map((c) => caseResponse[c.id])
        .filter((v): v is number => v !== undefined);
      buckets.push({
        label: new Date(t).toLocaleDateString(
          [],
          bucketUnit === "month"
            ? { month: "short" }
            : bucketUnit === "week"
              ? { month: "short", day: "numeric" }
              : { day: "numeric" }
        ),
        count: inB.length,
        medianResp: resp.length ? median(resp) : null,
      });
    }
    const maxBucket = Math.max(1, ...buckets.map((d) => d.count));
    const maxResp = Math.max(1, ...buckets.map((d) => d.medianResp ?? 0));
    const hasRespTrend = buckets.some((d) => d.medianResp !== null);
    const labelEvery = Math.max(1, Math.ceil(buckets.length / 12));

    const countBy = (
      key: "animal" | "situation" | "centre_id",
      labelFn?: (v: string) => string
    ) => {
      const mm: Record<string, number> = {};
      for (const c of cases) {
        const raw = c[key];
        if (raw == null) continue;
        mm[raw] = (mm[raw] ?? 0) + 1;
      }
      return Object.entries(mm)
        .map(([k, v]) => ({ key: k, label: labelFn ? labelFn(k) : k, value: v }))
        .sort((a, b) => b.value - a.value);
    };
    const byAnimal = countBy("animal").slice(0, 6);
    const bySituation = countBy("situation", (v) => SITUATION_LABEL[v] ?? v).slice(0, 6);
    const byCentre = isAdmin
      ? countBy("centre_id", (id) => centreNames[id] ?? "Unknown centre").slice(0, 8)
      : [];
    const statusSegments = STATUS_META.map((s) => ({
      ...s,
      value: cases.filter((c) => c.status === s.key).length,
    }));
    const verdictSegments = VERDICT_META.map((v) => ({
      ...v,
      value: cases.filter((c) => c.verdict === v.key).length,
    }));
    const dowCounts = WEEKDAYS.map((label, i) => {
      const jsDay = (i + 1) % 7;
      return {
        key: label,
        label,
        value: cases.filter((c) => new Date(c.created_at).getDay() === jsDay).length,
      };
    });
    const resByAnimal: Record<string, number[]> = {};
    for (const c of cases) {
      const ca = firstClosed[c.id];
      if (ca === undefined) continue;
      const d = ca - at(c.created_at);
      if (d < 0) continue;
      (resByAnimal[c.animal] ??= []).push(d);
    }
    const resolutionByAnimal = Object.entries(resByAnimal)
      .map(([k, arr]) => ({ key: k, label: k, value: median(arr) }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);

    return {
      cases,
      changePct,
      closed,
      dupCount,
      dupPct,
      openQueue,
      needsHelpOpen,
      oldestOpen,
      medianOpenAge,
      responseMs,
      medianResponse,
      respondedPct,
      buckets,
      maxBucket,
      maxResp,
      hasRespTrend,
      labelEvery,
      bucketUnit,
      byAnimal,
      bySituation,
      byCentre,
      statusSegments,
      verdictSegments,
      dowCounts,
      resolutionByAnimal,
    };
  }, [all, events, centreNames, isAdmin, win, now, animalFilter, statusFilter]);

  const csvRows = useMemo<(string | number)[][]>(
    () => [
      ["WildAssist analytics"],
      ["Range", win.windowLabel],
      ...(animalFilter ? [["Animal filter", animalFilter]] : []),
      ...(statusFilter ? [["Status filter", STATUS_LABEL[statusFilter]]] : []),
      [],
      ["Cases", m.cases.length],
      ["Resolved %", m.cases.length ? Math.round((m.closed / m.cases.length) * 100) : 0],
      ["Open, needs help (now)", m.needsHelpOpen],
      ["Pickup rate %", m.respondedPct],
      ["Possible duplicates", `${m.dupCount} (${m.dupPct}%)`],
      ["Median response", m.medianResponse !== null ? formatDuration(m.medianResponse) : "n/a"],
      ["Oldest open case", m.oldestOpen !== null ? formatDuration(m.oldestOpen) : "n/a"],
      ["Median open age", m.medianOpenAge !== null ? formatDuration(m.medianOpenAge) : "n/a"],
      [],
      ["Status", "Count"],
      ...m.statusSegments.map((s) => [s.label, s.value]),
      [],
      ["Outcome", "Count"],
      ...m.verdictSegments.map((v) => [v.label, v.value]),
      [],
      ["Animal", "Count"],
      ...m.byAnimal.map((r) => [r.label, r.value]),
      [],
      ["Situation", "Count"],
      ...m.bySituation.map((r) => [r.label, r.value]),
      ...(isAdmin
        ? [[], ["Centre", "Count"], ...m.byCentre.map((r) => [r.label, r.value])]
        : []),
    ],
    [m, win.windowLabel, animalFilter, statusFilter, isAdmin]
  );

  const nextDisabled = win.endMs > now; // already viewing the current period
  const stepPeriod = (delta: number) =>
    setAnchorMs((cur) => {
      const a = new Date(cur);
      if (rangeKey === "week") return cur + delta * 7 * DAY;
      if (rangeKey === "month")
        return new Date(a.getFullYear(), a.getMonth() + delta, 1).getTime();
      if (rangeKey === "year")
        return new Date(a.getFullYear() + delta, 0, 1).getTime();
      return cur;
    });

  if (!mounted) {
    return (
      <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col px-5 py-8">
        <div className="h-3 w-20 animate-pulse rounded bg-stone-100" />
        <div className="mt-2 h-7 w-32 animate-pulse rounded bg-stone-200" />
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-20 animate-pulse rounded-2xl border border-stone-200 bg-white" />
          ))}
        </div>
        <div className="mt-5 h-48 animate-pulse rounded-2xl border border-stone-200 bg-white" />
      </main>
    );
  }

  return (
    <main className="animate-in mx-auto flex w-full max-w-4xl flex-1 flex-col px-5 py-8">
      <Link
        href="/dashboard"
        className="no-print mb-4 inline-flex w-fit items-center gap-1 text-sm font-medium text-stone-500 transition-colors hover:text-stone-900"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden /> Dashboard
      </Link>
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-widest text-stone-500">
            {isAdmin ? "Nationwide" : "Your area"}
          </p>
          <h1 className="mt-1 font-display text-2xl font-semibold tracking-tight text-stone-900">
            Analytics
          </h1>
        </div>
        <AnalyticsActions
          rows={csvRows}
          filename={`wildassist-analytics-${win.windowLabel.replace(/[^a-z0-9]+/gi, "-")}.csv`}
        />
      </div>

      {/* Range selector */}
      <div className="no-print mb-4 inline-flex gap-1 self-start rounded-xl border border-stone-200 bg-white p-1">
        {RANGES.map((r) => (
          <button
            key={r.key}
            onClick={() => setRangeKey(r.key)}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
              r.key === rangeKey
                ? "bg-stone-900 text-white"
                : "text-stone-600 hover:bg-stone-50"
            }`}
          >
            {r.label}
          </button>
        ))}
      </div>

      {/* Period navigator (week / month / year) */}
      {win.navigable && (
        <div className="no-print mb-4 flex items-center gap-2">
          <button
            onClick={() => stepPeriod(-1)}
            aria-label={`Previous ${rangeKey}`}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-stone-200 bg-white text-stone-600 transition-colors hover:bg-stone-50"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="min-w-[10rem] text-center font-display text-base font-semibold text-stone-900">
            {win.windowLabel}
          </span>
          <button
            onClick={() => stepPeriod(1)}
            disabled={nextDisabled}
            aria-label={`Next ${rangeKey}`}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-stone-200 bg-white text-stone-600 transition-colors hover:bg-stone-50 disabled:opacity-40"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Active drill-down filters */}
      {(animalFilter || statusFilter) && (
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-stone-500">Filtered by</span>
          {animalFilter && (
            <button
              onClick={() => setAnimalFilter(null)}
              className="inline-flex items-center gap-1 rounded-full border border-stone-300 bg-white px-2.5 py-1 text-xs font-medium capitalize text-stone-700 hover:bg-stone-50"
            >
              {animalFilter}
              <X className="h-3 w-3" aria-hidden />
            </button>
          )}
          {statusFilter && (
            <button
              onClick={() => setStatusFilter(null)}
              className="inline-flex items-center gap-1 rounded-full border border-stone-300 bg-white px-2.5 py-1 text-xs font-medium text-stone-700 hover:bg-stone-50"
            >
              {STATUS_LABEL[statusFilter]}
              <X className="h-3 w-3" aria-hidden />
            </button>
          )}
        </div>
      )}

      {m.cases.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-stone-200 bg-stone-50/50 p-10 text-center text-sm text-stone-500">
          No cases in {win.windowLabel}. Try a wider range or clearing filters.
        </div>
      ) : (
        <div className="flex flex-col gap-5">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat
              label={`Cases, ${win.windowLabel}`}
              value={m.cases.length}
              sub={
                m.changePct === null
                  ? undefined
                  : `${m.changePct >= 0 ? "+" : ""}${m.changePct}% vs ${win.prevLabel}`
              }
              subUp={m.changePct !== null && m.changePct >= 0}
            />
            <Stat
              label="Resolved"
              value={`${Math.round((m.closed / m.cases.length) * 100)}%`}
              accent="text-emerald-700"
            />
            <Stat label="Open, needs help (now)" value={m.needsHelpOpen} accent="text-rose-700" />
            <Stat label="Pickup rate" value={`${m.respondedPct}%`} />
          </div>

          {m.dupCount > 0 && (
            <p className="-mt-1 text-xs text-stone-500">
              <span className="font-medium text-orange-600">{m.dupCount}</span>{" "}
              possible duplicate{m.dupCount === 1 ? "" : "s"} flagged ({m.dupPct}% of
              cases), merge or dismiss them on the dashboard.
            </p>
          )}

          <section className="rounded-2xl border border-stone-200 bg-white p-5">
            <h2 className="font-display text-base font-semibold text-stone-900">Open queue</h2>
            <p className="mt-0.5 text-xs text-stone-500">
              How long cases have been waiting right now
            </p>
            {m.openQueue.length === 0 ? (
              <p className="mt-3 text-sm text-emerald-700">Nothing open. The queue is clear.</p>
            ) : (
              <div className="mt-3 flex flex-wrap items-baseline gap-x-8 gap-y-3">
                <Metric big value={String(m.openQueue.length)} label="cases open" />
                <Metric
                  big
                  value={m.oldestOpen !== null ? formatDuration(m.oldestOpen) : "N/A"}
                  label="oldest waiting"
                  accent={m.oldestOpen !== null && m.oldestOpen > 3 * DAY ? "text-rose-700" : "text-stone-900"}
                />
                <Metric
                  big
                  value={m.medianOpenAge !== null ? formatDuration(m.medianOpenAge) : "N/A"}
                  label="median age"
                />
              </div>
            )}
          </section>

          <div className="grid gap-5 sm:grid-cols-2">
            {!statusFilter && (
              <section className="rounded-2xl border border-stone-200 bg-white p-5">
                <h2 className="font-display text-base font-semibold text-stone-900">Case status</h2>
                <p className="mt-0.5 text-xs text-stone-500">Where cases stand · click to filter</p>
                <SegBar segments={m.statusSegments} total={m.cases.length} onSelect={setStatusFilter} />
              </section>
            )}
            <section className="rounded-2xl border border-stone-200 bg-white p-5">
              <h2 className="font-display text-base font-semibold text-stone-900">Triage outcome</h2>
              <p className="mt-0.5 text-xs text-stone-500">What WildAssist advised finders</p>
              <SegBar segments={m.verdictSegments} total={m.cases.length} />
            </section>
          </div>

          <section className="rounded-2xl border border-stone-200 bg-white p-5">
            <h2 className="font-display text-base font-semibold text-stone-900">Response time</h2>
            {m.medianResponse === null ? (
              <p className="mt-2 text-sm text-stone-500">
                Not enough data yet. This shows the typical time from a report to its
                first pickup once cases start moving.
              </p>
            ) : (
              <div className="mt-3 flex items-baseline gap-8">
                <Metric big value={formatDuration(m.medianResponse)} label="median, report to first pickup" />
                <Metric
                  big
                  accent="text-emerald-700"
                  value={`${m.respondedPct}%`}
                  label={`picked up (${m.responseMs.length} of ${m.cases.length})`}
                />
              </div>
            )}
          </section>

          {m.hasRespTrend && (
            <TimeChart
              title="Response time trend"
              subtitle={`Median report to first pickup, per ${m.bucketUnit} · shorter is better`}
              caption={`Peak ${formatDuration(m.maxResp)}`}
              barClass="bg-sky-400/80"
              bars={m.buckets.map((d, i) => ({
                heightPct: d.medianResp !== null ? Math.max(6, (d.medianResp / m.maxResp) * 100) : 0,
                title: d.medianResp !== null ? formatDuration(d.medianResp) : "no pickups",
                label: i % m.labelEvery === 0 ? d.label : "",
              }))}
            />
          )}

          <TimeChart
            title={`Intake · ${win.windowLabel}`}
            subtitle={`Reports per ${m.bucketUnit}`}
            caption={`Peak ${m.maxBucket} in a ${m.bucketUnit}`}
            barClass="bg-emerald-500/80"
            bars={m.buckets.map((d, i) => ({
              heightPct: d.count ? Math.max(6, (d.count / m.maxBucket) * 100) : 0,
              title: `${d.count}`,
              label: i % m.labelEvery === 0 ? d.label : "",
            }))}
          />

          <div className="grid gap-5 sm:grid-cols-2">
            {!animalFilter && (
              <BarPanel title="By animal" subtitle="Click to filter" rows={m.byAnimal} onSelect={setAnimalFilter} />
            )}
            <BarPanel title="By situation" rows={m.bySituation} />
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <BarPanel title="Busiest days" rows={m.dowCounts} />
            {m.resolutionByAnimal.length > 0 && (
              <BarPanel
                title="Resolution time by animal"
                subtitle="Median report to closed"
                rows={m.resolutionByAnimal}
                format={formatDuration}
              />
            )}
          </div>

          {isAdmin && m.byCentre.length > 0 && (
            <BarPanel title="By centre" rows={m.byCentre} />
          )}
        </div>
      )}
    </main>
  );
}

function Stat({
  label,
  value,
  sub,
  subUp,
  accent = "text-stone-900",
}: {
  label: string;
  value: number | string;
  sub?: string;
  subUp?: boolean;
  accent?: string;
}) {
  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-4">
      <p className={`font-display text-2xl font-semibold ${accent}`}>{value}</p>
      <p className="mt-0.5 text-xs text-stone-500">{label}</p>
      {sub && (
        <p className={`mt-1 text-xs ${subUp ? "text-emerald-700" : "text-rose-700"}`}>{sub}</p>
      )}
    </div>
  );
}

function Metric({
  value,
  label,
  accent = "text-stone-900",
  big,
}: {
  value: string;
  label: string;
  accent?: string;
  big?: boolean;
}) {
  return (
    <div>
      <p className={`font-display font-semibold ${big ? "text-3xl" : "text-xl"} ${accent}`}>
        {value}
      </p>
      <p className="mt-0.5 text-xs text-stone-500">{label}</p>
    </div>
  );
}

function SegBar({
  segments,
  total,
  onSelect,
}: {
  segments: { key: string; label: string; value: number; color: string }[];
  total: number;
  onSelect?: (key: string) => void;
}) {
  return (
    <div className="mt-4">
      <div className="flex h-3 w-full overflow-hidden rounded-full bg-stone-100">
        {segments.map(
          (s) =>
            s.value > 0 && (
              <div
                key={s.key}
                className={s.color}
                style={{ width: `${(s.value / total) * 100}%` }}
                title={`${s.label}: ${s.value}`}
              />
            )
        )}
      </div>
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5">
        {segments.map((s) => {
          const inner = (
            <>
              <span className={`h-2 w-2 rounded-full ${s.color}`} />
              {s.label} <span className="font-medium text-stone-900">{s.value}</span>
            </>
          );
          return onSelect ? (
            <button
              key={s.key}
              onClick={() => onSelect(s.key)}
              className="flex items-center gap-1.5 rounded-md px-1 text-xs text-stone-600 hover:bg-stone-50 hover:text-stone-900"
            >
              {inner}
            </button>
          ) : (
            <span key={s.key} className="flex items-center gap-1.5 px-1 text-xs text-stone-600">
              {inner}
            </span>
          );
        })}
      </div>
    </div>
  );
}

function TimeChart({
  title,
  subtitle,
  caption,
  barClass,
  bars,
}: {
  title: string;
  subtitle?: string;
  caption?: string;
  barClass: string;
  bars: { heightPct: number; title: string; label: string }[];
}) {
  return (
    <section className="rounded-2xl border border-stone-200 bg-white p-5">
      <h2 className="font-display text-base font-semibold text-stone-900">{title}</h2>
      {subtitle && <p className="mt-0.5 text-xs text-stone-500">{subtitle}</p>}
      <div className="mt-4 flex h-32 items-end gap-1 border-b border-stone-200">
        {bars.map((b, i) => (
          <div key={i} className="flex h-full flex-1 items-end">
            <div className="flex h-full w-full items-end rounded-t bg-stone-50">
              <div
                className={`w-full rounded-t ${barClass}`}
                style={{ height: `${b.heightPct}%` }}
                title={b.title}
              />
            </div>
          </div>
        ))}
      </div>
      <div className="mt-1 flex gap-1">
        {bars.map((b, i) => (
          <span key={i} className="flex-1 text-center text-[10px] text-stone-500">
            {b.label}
          </span>
        ))}
      </div>
      {caption && <p className="mt-1 text-xs text-stone-500">{caption}</p>}
    </section>
  );
}

function BarPanel({
  title,
  subtitle,
  rows,
  format,
  onSelect,
}: {
  title: string;
  subtitle?: string;
  rows: { key?: string; label: string; value: number }[];
  format?: (v: number) => string;
  onSelect?: (key: string) => void;
}) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <section className="rounded-2xl border border-stone-200 bg-white p-5">
      <h2 className="font-display text-base font-semibold text-stone-900">{title}</h2>
      {subtitle && <p className="mt-0.5 text-xs text-stone-500">{subtitle}</p>}
      <div className="mt-4 flex flex-col gap-2.5">
        {rows.map((r) => {
          const body = (
            <>
              <span className="w-28 shrink-0 truncate text-sm capitalize text-stone-600">
                {r.label}
              </span>
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-stone-100">
                <div
                  className="h-full rounded-full bg-emerald-500"
                  style={{ width: `${(r.value / max) * 100}%` }}
                />
              </div>
              <span className="shrink-0 text-right text-sm font-medium text-stone-700">
                {format ? format(r.value) : r.value}
              </span>
            </>
          );
          return onSelect && r.key ? (
            <button
              key={r.label}
              onClick={() => onSelect(r.key as string)}
              className="-mx-1 flex items-center gap-3 rounded-lg px-1 py-0.5 text-left hover:bg-stone-50"
            >
              {body}
            </button>
          ) : (
            <div key={r.label} className="flex items-center gap-3">
              {body}
            </div>
          );
        })}
      </div>
    </section>
  );
}
