import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { SITUATIONS } from "@/lib/triage";

export const dynamic = "force-dynamic";

type Row = {
  id: string;
  created_at: string;
  animal: string;
  situation: string;
  verdict: string;
  status: string;
  centre_id: string | null;
};

type EventRow = { case_id: string; to_status: string; created_at: string };

const DAY = 24 * 60 * 60 * 1000;

const RANGES = [
  { key: "7d", label: "7 days", days: 7 },
  { key: "30d", label: "30 days", days: 30 },
  { key: "all", label: "All time", days: null as number | null },
];

const STATUS_META = [
  { key: "reported", label: "Reported", color: "bg-zinc-400", dot: "bg-zinc-400" },
  { key: "in_transit", label: "In transit", color: "bg-amber-400", dot: "bg-amber-400" },
  { key: "at_centre", label: "At centre", color: "bg-sky-400", dot: "bg-sky-400" },
  { key: "closed", label: "Closed", color: "bg-emerald-500", dot: "bg-emerald-500" },
];

const VERDICT_META = [
  { key: "help", label: "Needs help", color: "bg-rose-400", dot: "bg-rose-400" },
  { key: "uncertain", label: "Uncertain", color: "bg-amber-400", dot: "bg-amber-400" },
  { key: "leave", label: "Leave it be", color: "bg-emerald-500", dot: "bg-emerald-500" },
];

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
  searchParams: Promise<{ range?: string }>;
}) {
  const { range: rangeParam } = await searchParams;
  const range = RANGES.find((r) => r.key === rangeParam) ?? RANGES[1];

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
      .select("id, created_at, animal, situation, verdict, status, centre_id"),
    supabase.from("case_events").select("case_id, to_status, created_at"),
  ]);
  const all = (rows ?? []) as Row[];
  const events = (eventRows ?? []) as EventRow[];

  // Centre names (admins get a per-centre breakdown).
  let centreNames: Record<string, string> = {};
  if (isAdmin && all.length) {
    const { data: cn } = await supabase.from("centres").select("id, name");
    centreNames = Object.fromEntries((cn ?? []).map((c) => [c.id, c.name]));
  }

  // --- windowing ---
  const now = Date.now();
  const at = (iso: string) => new Date(iso).getTime();
  const windowMs = range.days ? range.days * DAY : null;
  const earliest = all.length
    ? Math.min(...all.map((c) => at(c.created_at)))
    : now - 30 * DAY;
  const startMs = windowMs ? now - windowMs : earliest;

  const cases = all.filter((c) => at(c.created_at) >= startMs);

  // Change vs the previous equal window (only meaningful for fixed windows).
  let changePct: number | null = null;
  if (windowMs) {
    const prevStart = startMs - windowMs;
    const prevCount = all.filter(
      (c) => at(c.created_at) >= prevStart && at(c.created_at) < startMs
    ).length;
    changePct =
      prevCount === 0 ? null : Math.round(((cases.length - prevCount) / prevCount) * 100);
  }

  const closed = cases.filter((c) => c.status === "closed").length;
  // Live queue count — current open needs-help, regardless of range.
  const needsHelpOpen = all.filter(
    (c) => c.verdict === "help" && c.status !== "closed"
  ).length;

  // Intake buckets: daily for short spans, weekly when the span is long.
  const spanDays = Math.max(1, Math.ceil((now - startMs) / DAY));
  const weekly = spanDays > 45;
  const step = weekly ? 7 * DAY : DAY;
  const buckets: { label: string; count: number }[] = [];
  for (let t = weekly ? startMs : now - (spanDays - 1) * DAY; t <= now; t += step) {
    const bEnd = t + step;
    const count = cases.filter((c) => at(c.created_at) >= t && at(c.created_at) < bEnd).length;
    buckets.push({
      label: new Date(t).toLocaleDateString(
        [],
        weekly ? { month: "short", day: "numeric" } : { day: "numeric" }
      ),
      count,
    });
  }
  const maxBucket = Math.max(1, ...buckets.map((d) => d.count));
  const labelEvery = Math.ceil(buckets.length / 12);

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
      .map(([k, v]) => ({ label: labelFn ? labelFn(k) : k, value: v }))
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

  // Response time: report → first pickup ("in_transit"/"at_centre"), for cases in range.
  const inRange = new Set(cases.map((c) => c.id));
  const reportedAt: Record<string, number> = {};
  for (const c of cases) reportedAt[c.id] = at(c.created_at);
  const firstResponse: Record<string, number> = {};
  for (const e of events) {
    if (!inRange.has(e.case_id)) continue;
    if (e.to_status !== "in_transit" && e.to_status !== "at_centre") continue;
    const t = at(e.created_at);
    if (firstResponse[e.case_id] === undefined || t < firstResponse[e.case_id]) {
      firstResponse[e.case_id] = t;
    }
  }
  const responseMs = Object.entries(firstResponse)
    .filter(([id]) => reportedAt[id] !== undefined)
    .map(([id, t]) => t - reportedAt[id])
    .filter((ms) => ms >= 0);
  const medianResponse = responseMs.length ? median(responseMs) : null;
  const respondedPct = cases.length
    ? Math.round((responseMs.length / cases.length) * 100)
    : 0;

  return (
    <main className="animate-in mx-auto flex w-full max-w-4xl flex-1 flex-col px-5 py-8">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-widest text-zinc-400">
            {isAdmin ? "Nationwide" : "Your area"}
          </p>
          <h1 className="mt-1 font-display text-2xl font-semibold tracking-tight text-zinc-900">
            Analytics
          </h1>
        </div>
        <Link
          href="/dashboard"
          className="rounded-xl border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50"
        >
          Dashboard
        </Link>
      </div>

      {/* Range selector */}
      <div className="mb-6 inline-flex gap-1 self-start rounded-xl border border-zinc-200 bg-white p-1">
        {RANGES.map((r) => (
          <Link
            key={r.key}
            href={`/analytics?range=${r.key}`}
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

      {cases.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-zinc-200 bg-zinc-50/50 p-10 text-center text-sm text-zinc-500">
          No cases in this range yet, so there is nothing to chart. Try a wider
          range, or reports will show up here as they come in.
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
            <Stat
              label="Open, needs help (now)"
              value={needsHelpOpen}
              accent="text-rose-600"
            />
            <Stat
              label="Pickup rate"
              value={`${respondedPct}%`}
              accent="text-zinc-900"
            />
          </div>

          {/* Status + Verdict breakdowns */}
          <div className="grid gap-5 sm:grid-cols-2">
            <section className="rounded-2xl border border-zinc-200 bg-white p-5">
              <h2 className="font-display text-base font-semibold text-zinc-900">
                Case status
              </h2>
              <p className="mt-0.5 text-xs text-zinc-500">Where cases stand now</p>
              <SegBar segments={statusSegments} total={cases.length} />
            </section>
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
              <div className="mt-3 flex items-baseline gap-6">
                <div>
                  <p className="font-display text-3xl font-semibold text-zinc-900">
                    {formatDuration(medianResponse)}
                  </p>
                  <p className="mt-0.5 text-xs text-zinc-500">
                    Median, report to first pickup
                  </p>
                </div>
                <div>
                  <p className="font-display text-3xl font-semibold text-emerald-700">
                    {respondedPct}%
                  </p>
                  <p className="mt-0.5 text-xs text-zinc-500">
                    Picked up ({responseMs.length} of {cases.length})
                  </p>
                </div>
              </div>
            )}
          </section>

          {/* Daily intake */}
          <section className="rounded-2xl border border-zinc-200 bg-white p-5">
            <h2 className="font-display text-base font-semibold text-zinc-900">
              Intake, {range.label.toLowerCase()}
              {weekly && (
                <span className="ml-2 text-xs font-normal text-zinc-400">
                  (weekly)
                </span>
              )}
            </h2>
            <div className="mt-4 flex h-32 items-end gap-1">
              {buckets.map((d, i) => (
                <div key={i} className="flex flex-1 flex-col items-center gap-1">
                  <div
                    className="w-full rounded-t bg-emerald-500/80"
                    style={{ height: `${(d.count / maxBucket) * 100}%` }}
                    title={`${d.count}`}
                  />
                  <span className="text-[10px] text-zinc-400">
                    {i % labelEvery === 0 ? d.label : ""}
                  </span>
                </div>
              ))}
            </div>
          </section>

          <div className="grid gap-5 sm:grid-cols-2">
            <BarPanel title="By animal" rows={byAnimal} />
            <BarPanel title="By situation" rows={bySituation} />
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

function SegBar({
  segments,
  total,
}: {
  segments: { label: string; value: number; color: string; dot: string }[];
  total: number;
}) {
  return (
    <div className="mt-4">
      <div className="flex h-3 w-full overflow-hidden rounded-full bg-zinc-100">
        {segments.map(
          (s) =>
            s.value > 0 && (
              <div
                key={s.label}
                className={s.color}
                style={{ width: `${(s.value / total) * 100}%` }}
                title={`${s.label}: ${s.value}`}
              />
            )
        )}
      </div>
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5">
        {segments.map((s) => (
          <div
            key={s.label}
            className="flex items-center gap-1.5 text-xs text-zinc-600"
          >
            <span className={`h-2 w-2 rounded-full ${s.dot}`} />
            {s.label}{" "}
            <span className="font-medium text-zinc-900">{s.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function BarPanel({
  title,
  rows,
}: {
  title: string;
  rows: { label: string; value: number }[];
}) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <section className="rounded-2xl border border-zinc-200 bg-white p-5">
      <h2 className="font-display text-base font-semibold text-zinc-900">{title}</h2>
      <div className="mt-4 flex flex-col gap-2.5">
        {rows.map((r) => (
          <div key={r.label} className="flex items-center gap-3">
            <span className="w-28 shrink-0 truncate text-sm capitalize text-zinc-600">
              {r.label}
            </span>
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-zinc-100">
              <div
                className="h-full rounded-full bg-emerald-500"
                style={{ width: `${(r.value / max) * 100}%` }}
              />
            </div>
            <span className="w-6 shrink-0 text-right text-sm font-medium text-zinc-700">
              {r.value}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
