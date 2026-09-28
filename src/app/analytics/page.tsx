import { redirect } from "next/navigation";
import Link from "next/link";
import { X } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { SITUATIONS } from "@/lib/triage";
import AnalyticsActions from "@/components/AnalyticsActions";

export const dynamic = "force-dynamic";

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
  { key: "7d", label: "7 days", days: 7 },
  { key: "30d", label: "30 days", days: 30 },
  { key: "all", label: "All time", days: null as number | null },
];

const STATUS_META = [
  { key: "reported", label: "Reported", color: "bg-zinc-400" },
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

/** Human-friendly duration from milliseconds. */
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

const SITUATION_LABEL: Record<string, string> = Object.fromEntries(
  SITUATIONS.map((s) => [s.value, s.label])
);

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string; animal?: string; status?: string }>;
}) {
  const sp = await searchParams;
  const range = RANGES.find((r) => r.key === sp.range) ?? RANGES[1];
  const animalFilter = sp.animal || null;
  const statusFilter =
    sp.status && STATUS_LABEL[sp.status] ? sp.status : null;

  // Build a URL that preserves the current filters, overriding the given keys.
  const hrefWith = (over: Partial<Record<"range" | "animal" | "status", string | null>>) => {
    const params = new URLSearchParams();
    const r = over.range !== undefined ? over.range : range.key;
    const a = over.animal !== undefined ? over.animal : animalFilter;
    const s = over.status !== undefined ? over.status : statusFilter;
    if (r) params.set("range", r);
    if (a) params.set("animal", a);
    if (s) params.set("status", s);
    const q = params.toString();
    return q ? `/analytics?${q}` : "/analytics";
  };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, centre_id")
    .eq("id", user.id)
    .single();

  const isAdmin = profile?.role === "admin";
  if (profile?.role === "volunteer" || (!profile?.centre_id && !isAdmin)) {
    redirect("/dashboard");
  }

  const [{ data: rows }, { data: eventRows }] = await Promise.all([
    supabase
      .from("cases")
      .select("id, created_at, animal, situation, verdict, status, centre_id, duplicate_of"),
    supabase.from("case_events").select("case_id, to_status, created_at"),
  ]);
  const all = (rows ?? []) as Row[];
  const events = (eventRows ?? []) as EventRow[];

  let centreNames: Record<string, string> = {};
  if (isAdmin && all.length) {
    const { data: cn } = await supabase.from("centres").select("id, name");
    centreNames = Object.fromEntries((cn ?? []).map((c) => [c.id, c.name]));
  }

  // --- windowing + drill-down filters ---
  const now = Date.now();
  const at = (iso: string) => new Date(iso).getTime();
  const windowMs = range.days ? range.days * DAY : null;
  const earliest = all.length
    ? Math.min(...all.map((c) => at(c.created_at)))
    : now - 30 * DAY;
  const startMs = windowMs ? now - windowMs : earliest;

  const matchFilter = (c: Row) =>
    (!animalFilter || c.animal === animalFilter) &&
    (!statusFilter || c.status === statusFilter);

  const windowed = all.filter((c) => at(c.created_at) >= startMs);
  const cases = windowed.filter(matchFilter);

  let changePct: number | null = null;
  if (windowMs) {
    const prevStart = startMs - windowMs;
    const prevCount = all.filter(
      (c) =>
        at(c.created_at) >= prevStart &&
        at(c.created_at) < startMs &&
        matchFilter(c)
    ).length;
    changePct =
      prevCount === 0 ? null : Math.round(((cases.length - prevCount) / prevCount) * 100);
  }

  const closed = cases.filter((c) => c.status === "closed").length;
  const dupCount = cases.filter((c) => c.duplicate_of).length;
  const dupPct = cases.length ? Math.round((dupCount / cases.length) * 100) : 0;

  // Live queue: current open cases (ignores the range; respects the animal filter).
  const openQueue = all.filter(
    (c) => c.status !== "closed" && (!animalFilter || c.animal === animalFilter)
  );
  const needsHelpOpen = openQueue.filter((c) => c.verdict === "help").length;
  const openAges = openQueue.map((c) => now - at(c.created_at));
  const oldestOpen = openAges.length ? Math.max(...openAges) : null;
  const medianOpenAge = openAges.length ? median(openAges) : null;

  // Response time per case: report → first pickup ("in_transit"/"at_centre").
  // Resolution time per case: report → first "closed" event.
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

  // Intake + response-time buckets: daily for short spans, weekly when long.
  const spanDays = Math.max(1, Math.ceil((now - startMs) / DAY));
  const weekly = spanDays > 45;
  const step = weekly ? 7 * DAY : DAY;
  const buckets: { label: string; count: number; medianResp: number | null }[] = [];
  for (let t = weekly ? startMs : now - (spanDays - 1) * DAY; t <= now; t += step) {
    const bEnd = t + step;
    const inBucket = cases.filter(
      (c) => at(c.created_at) >= t && at(c.created_at) < bEnd
    );
    const resp = inBucket
      .map((c) => caseResponse[c.id])
      .filter((v): v is number => v !== undefined);
    buckets.push({
      label: new Date(t).toLocaleDateString(
        [],
        weekly ? { month: "short", day: "numeric" } : { day: "numeric" }
      ),
      count: inBucket.length,
      medianResp: resp.length ? median(resp) : null,
    });
  }
  const maxBucket = Math.max(1, ...buckets.map((d) => d.count));
  const maxResp = Math.max(1, ...buckets.map((d) => d.medianResp ?? 0));
  const hasRespTrend = buckets.some((d) => d.medianResp !== null);
  const labelEvery = Math.ceil(buckets.length / 12);

  // Breakdowns.
  const countBy = (
    key: "animal" | "situation" | "centre_id",
    labelFn?: (v: string) => string
  ) => {
    const m: Record<string, number> = {};
    for (const c of cases) {
      const raw = c[key];
      if (raw == null) continue;
      m[raw] = (m[raw] ?? 0) + 1;
    }
    return Object.entries(m)
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

  // Busiest day of week (Mon–Sun) across the filtered set.
  const dowCounts = WEEKDAYS.map((label, i) => {
    const jsDay = (i + 1) % 7; // Mon=1..Sun=0
    return {
      key: label,
      label,
      value: cases.filter((c) => new Date(c.created_at).getDay() === jsDay).length,
    };
  });

  // Resolution time by animal: median report → closed, per animal.
  const resByAnimal: Record<string, number[]> = {};
  for (const c of cases) {
    const closedAt = firstClosed[c.id];
    if (closedAt === undefined) continue;
    const d = closedAt - at(c.created_at);
    if (d < 0) continue;
    (resByAnimal[c.animal] ??= []).push(d);
  }
  const resolutionByAnimal = Object.entries(resByAnimal)
    .map(([k, arr]) => ({ key: k, label: k, value: median(arr) }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 6);

  // CSV rows (mirrors what's on screen).
  const csvRows: (string | number)[][] = [
    ["WildAssist analytics"],
    ["Range", range.label],
    ...(animalFilter ? [["Animal filter", animalFilter]] : []),
    ...(statusFilter ? [["Status filter", STATUS_LABEL[statusFilter]]] : []),
    [],
    ["Cases", cases.length],
    ["Resolved %", cases.length ? Math.round((closed / cases.length) * 100) : 0],
    ["Open, needs help (now)", needsHelpOpen],
    ["Pickup rate %", respondedPct],
    ["Possible duplicates", `${dupCount} (${dupPct}%)`],
    ["Median response", medianResponse !== null ? formatDuration(medianResponse) : "n/a"],
    ["Oldest open case", oldestOpen !== null ? formatDuration(oldestOpen) : "n/a"],
    ["Median open age", medianOpenAge !== null ? formatDuration(medianOpenAge) : "n/a"],
    [],
    ["Status", "Count"],
    ...statusSegments.map((s) => [s.label, s.value]),
    [],
    ["Outcome", "Count"],
    ...verdictSegments.map((v) => [v.label, v.value]),
    [],
    ["Animal", "Count"],
    ...byAnimal.map((r) => [r.label, r.value]),
    [],
    ["Situation", "Count"],
    ...bySituation.map((r) => [r.label, r.value]),
    ...(isAdmin
      ? [[], ["Centre", "Count"], ...byCentre.map((r) => [r.label, r.value])]
      : []),
  ];

  return (
    <main className="animate-in mx-auto flex w-full max-w-4xl flex-1 flex-col px-5 py-8">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-widest text-zinc-400">
            {isAdmin ? "Nationwide" : "Your area"}
          </p>
          <h1 className="mt-1 font-display text-2xl font-semibold tracking-tight text-zinc-900">
            Analytics
          </h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <AnalyticsActions rows={csvRows} filename={`wildassist-analytics-${range.key}.csv`} />
          <Link
            href="/dashboard"
            className="no-print rounded-xl border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50"
          >
            Dashboard
          </Link>
        </div>
      </div>

      {/* Range selector */}
      <div className="no-print mb-4 inline-flex gap-1 self-start rounded-xl border border-zinc-200 bg-white p-1">
        {RANGES.map((r) => (
          <Link
            key={r.key}
            href={hrefWith({ range: r.key })}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
              r.key === range.key
                ? "bg-zinc-900 text-white"
                : "text-zinc-600 hover:bg-zinc-50"
            }`}
          >
            {r.label}
          </Link>
        ))}
      </div>

      {/* Active drill-down filters */}
      {(animalFilter || statusFilter) && (
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-zinc-400">Filtered by</span>
          {animalFilter && (
            <Link
              href={hrefWith({ animal: null })}
              className="inline-flex items-center gap-1 rounded-full border border-zinc-300 bg-white px-2.5 py-1 text-xs font-medium capitalize text-zinc-700 hover:bg-zinc-50"
            >
              {animalFilter}
              <X className="h-3 w-3" aria-hidden />
            </Link>
          )}
          {statusFilter && (
            <Link
              href={hrefWith({ status: null })}
              className="inline-flex items-center gap-1 rounded-full border border-zinc-300 bg-white px-2.5 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
            >
              {STATUS_LABEL[statusFilter]}
              <X className="h-3 w-3" aria-hidden />
            </Link>
          )}
        </div>
      )}

      {cases.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-zinc-200 bg-zinc-50/50 p-10 text-center text-sm text-zinc-500">
          No cases match this view. Try a wider range or clearing filters — new
          reports will show up here as they come in.
        </div>
      ) : (
        <div className="flex flex-col gap-5">
          {/* Stat cards */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat
              label={range.days ? `Cases, last ${range.label.toLowerCase()}` : "Cases, all time"}
              value={cases.length}
              sub={
                changePct === null
                  ? undefined
                  : `${changePct >= 0 ? "+" : ""}${changePct}% vs previous ${range.label.toLowerCase()}`
              }
              subUp={changePct !== null && changePct >= 0}
            />
            <Stat
              label="Resolved"
              value={`${Math.round((closed / cases.length) * 100)}%`}
              accent="text-emerald-700"
            />
            <Stat label="Open, needs help (now)" value={needsHelpOpen} accent="text-rose-600" />
            <Stat label="Pickup rate" value={`${respondedPct}%`} />
          </div>

          {dupCount > 0 && (
            <p className="-mt-1 text-xs text-zinc-500">
              <span className="font-medium text-orange-600">{dupCount}</span>{" "}
              possible duplicate{dupCount === 1 ? "" : "s"} flagged ({dupPct}% of
              cases) — merge or dismiss them on the dashboard.
            </p>
          )}

          {/* Backlog aging */}
          <section className="rounded-2xl border border-zinc-200 bg-white p-5">
            <h2 className="font-display text-base font-semibold text-zinc-900">
              Open queue
            </h2>
            <p className="mt-0.5 text-xs text-zinc-500">
              How long cases have been waiting right now
            </p>
            {openQueue.length === 0 ? (
              <p className="mt-3 text-sm text-emerald-700">
                Nothing open — the queue is clear.
              </p>
            ) : (
              <div className="mt-3 flex flex-wrap items-baseline gap-x-8 gap-y-3">
                <Metric big value={String(openQueue.length)} label="cases open" />
                <Metric
                  big
                  value={oldestOpen !== null ? formatDuration(oldestOpen) : "—"}
                  label="oldest waiting"
                  accent={oldestOpen !== null && oldestOpen > 3 * DAY ? "text-rose-600" : "text-zinc-900"}
                />
                <Metric
                  big
                  value={medianOpenAge !== null ? formatDuration(medianOpenAge) : "—"}
                  label="median age"
                />
              </div>
            )}
          </section>

          {/* Status + Verdict breakdowns */}
          <div className="grid gap-5 sm:grid-cols-2">
            {!statusFilter && (
              <section className="rounded-2xl border border-zinc-200 bg-white p-5">
                <h2 className="font-display text-base font-semibold text-zinc-900">
                  Case status
                </h2>
                <p className="mt-0.5 text-xs text-zinc-500">
                  Where cases stand · click to filter
                </p>
                <SegBar
                  segments={statusSegments}
                  total={cases.length}
                  hrefFor={(key) => hrefWith({ status: key })}
                />
              </section>
            )}
            <section className="rounded-2xl border border-zinc-200 bg-white p-5">
              <h2 className="font-display text-base font-semibold text-zinc-900">
                Triage outcome
              </h2>
              <p className="mt-0.5 text-xs text-zinc-500">
                What WildAssist advised finders
              </p>
              <SegBar segments={verdictSegments} total={cases.length} />
            </section>
          </div>

          {/* Response time */}
          <section className="rounded-2xl border border-zinc-200 bg-white p-5">
            <h2 className="font-display text-base font-semibold text-zinc-900">
              Response time
            </h2>
            {medianResponse === null ? (
              <p className="mt-2 text-sm text-zinc-400">
                Not enough data yet. This shows the typical time from a report to
                its first pickup once cases start moving.
              </p>
            ) : (
              <div className="mt-3 flex items-baseline gap-8">
                <Metric
                  big
                  value={formatDuration(medianResponse)}
                  label="median, report to first pickup"
                />
                <Metric
                  big
                  accent="text-emerald-700"
                  value={`${respondedPct}%`}
                  label={`picked up (${responseMs.length} of ${cases.length})`}
                />
              </div>
            )}
          </section>

          {/* Response time trend */}
          {hasRespTrend && (
            <TimeChart
              title="Response time trend"
              subtitle={`Median report to first pickup, per ${weekly ? "week" : "day"} · shorter is better`}
              caption={`Peak ${formatDuration(maxResp)}`}
              barClass="bg-sky-400/80"
              bars={buckets.map((d, i) => ({
                heightPct:
                  d.medianResp !== null
                    ? Math.max(6, (d.medianResp / maxResp) * 100)
                    : 0,
                title: d.medianResp !== null ? formatDuration(d.medianResp) : "no pickups",
                label: i % labelEvery === 0 ? d.label : "",
              }))}
            />
          )}

          {/* Daily intake */}
          <TimeChart
            title={`Intake, ${range.label.toLowerCase()}`}
            subtitle={weekly ? "Reports per week" : "Reports per day"}
            caption={`Peak ${maxBucket} in a ${weekly ? "week" : "day"}`}
            barClass="bg-emerald-500/80"
            bars={buckets.map((d, i) => ({
              heightPct: d.count ? Math.max(6, (d.count / maxBucket) * 100) : 0,
              title: `${d.count}`,
              label: i % labelEvery === 0 ? d.label : "",
            }))}
          />

          <div className="grid gap-5 sm:grid-cols-2">
            {!animalFilter && (
              <BarPanel
                title="By animal"
                subtitle="Click to filter"
                rows={byAnimal}
                hrefFor={(key) => hrefWith({ animal: key })}
              />
            )}
            <BarPanel title="By situation" rows={bySituation} />
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <BarPanel title="Busiest days" rows={dowCounts} />
            {resolutionByAnimal.length > 0 && (
              <BarPanel
                title="Resolution time by animal"
                subtitle="Median report to closed"
                rows={resolutionByAnimal}
                format={formatDuration}
              />
            )}
          </div>

          {isAdmin && byCentre.length > 0 && (
            <BarPanel title="By centre" rows={byCentre} />
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
  accent = "text-zinc-900",
}: {
  label: string;
  value: number | string;
  sub?: string;
  subUp?: boolean;
  accent?: string;
}) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-4">
      <p className={`font-display text-2xl font-semibold ${accent}`}>{value}</p>
      <p className="mt-0.5 text-xs text-zinc-500">{label}</p>
      {sub && (
        <p className={`mt-1 text-xs ${subUp ? "text-emerald-600" : "text-rose-600"}`}>
          {sub}
        </p>
      )}
    </div>
  );
}

function Metric({
  value,
  label,
  accent = "text-zinc-900",
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
      <p className="mt-0.5 text-xs text-zinc-500">{label}</p>
    </div>
  );
}

function SegBar({
  segments,
  total,
  hrefFor,
}: {
  segments: { key: string; label: string; value: number; color: string }[];
  total: number;
  hrefFor?: (key: string) => string;
}) {
  return (
    <div className="mt-4">
      <div className="flex h-3 w-full overflow-hidden rounded-full bg-zinc-100">
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
              {s.label} <span className="font-medium text-zinc-900">{s.value}</span>
            </>
          );
          return hrefFor ? (
            <Link
              key={s.key}
              href={hrefFor(s.key)}
              className="flex items-center gap-1.5 rounded-md px-1 text-xs text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900"
            >
              {inner}
            </Link>
          ) : (
            <span key={s.key} className="flex items-center gap-1.5 px-1 text-xs text-zinc-600">
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
    <section className="rounded-2xl border border-zinc-200 bg-white p-5">
      <h2 className="font-display text-base font-semibold text-zinc-900">{title}</h2>
      {subtitle && <p className="mt-0.5 text-xs text-zinc-500">{subtitle}</p>}
      <div className="mt-4 flex h-32 items-end gap-1 border-b border-zinc-200">
        {bars.map((b, i) => (
          <div key={i} className="flex h-full flex-1 items-end">
            <div className="flex h-full w-full items-end rounded-t bg-zinc-50">
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
          <span key={i} className="flex-1 text-center text-[10px] text-zinc-400">
            {b.label}
          </span>
        ))}
      </div>
      {caption && <p className="mt-1 text-xs text-zinc-400">{caption}</p>}
    </section>
  );
}

function BarPanel({
  title,
  subtitle,
  rows,
  format,
  hrefFor,
}: {
  title: string;
  subtitle?: string;
  rows: { key?: string; label: string; value: number }[];
  format?: (v: number) => string;
  hrefFor?: (key: string) => string;
}) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <section className="rounded-2xl border border-zinc-200 bg-white p-5">
      <h2 className="font-display text-base font-semibold text-zinc-900">{title}</h2>
      {subtitle && <p className="mt-0.5 text-xs text-zinc-500">{subtitle}</p>}
      <div className="mt-4 flex flex-col gap-2.5">
        {rows.map((r) => {
          const body = (
            <>
              <span className="w-28 shrink-0 truncate text-sm capitalize text-zinc-600">
                {r.label}
              </span>
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-zinc-100">
                <div
                  className="h-full rounded-full bg-emerald-500"
                  style={{ width: `${(r.value / max) * 100}%` }}
                />
              </div>
              <span className="shrink-0 text-right text-sm font-medium text-zinc-700">
                {format ? format(r.value) : r.value}
              </span>
            </>
          );
          return hrefFor && r.key ? (
            <Link
              key={r.label}
              href={hrefFor(r.key)}
              className="-mx-1 flex items-center gap-3 rounded-lg px-1 py-0.5 hover:bg-zinc-50"
            >
              {body}
            </Link>
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
