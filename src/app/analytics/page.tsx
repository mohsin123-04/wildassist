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
};

type EventRow = { case_id: string; to_status: string; created_at: string };

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

export default async function AnalyticsPage() {
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
      .select("id, created_at, animal, situation, verdict, status"),
    supabase
      .from("case_events")
      .select("case_id, to_status, created_at"),
  ]);
  const cases = (rows ?? []) as Row[];
  const events = (eventRows ?? []) as EventRow[];

  // --- aggregates ---
  const now = Date.now();
  const weekMs = 7 * 24 * 60 * 60 * 1000;
  const thisWeek = cases.filter(
    (c) => now - new Date(c.created_at).getTime() < weekMs
  ).length;
  const lastWeek = cases.filter((c) => {
    const age = now - new Date(c.created_at).getTime();
    return age >= weekMs && age < 2 * weekMs;
  }).length;
  const closed = cases.filter((c) => c.status === "closed").length;
  const needsHelpOpen = cases.filter(
    (c) => c.verdict === "help" && c.status !== "closed"
  ).length;

  // Daily intake, last 14 days.
  const days: { label: string; count: number }[] = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date(now - i * 24 * 60 * 60 * 1000);
    const key = d.toISOString().slice(0, 10);
    const count = cases.filter(
      (c) => c.created_at.slice(0, 10) === key
    ).length;
    days.push({ label: d.toLocaleDateString([], { day: "numeric" }), count });
  }
  const maxDay = Math.max(1, ...days.map((d) => d.count));

  const countBy = (key: keyof Row, labelFn?: (v: string) => string) => {
    const m: Record<string, number> = {};
    for (const c of cases) m[c[key]] = (m[c[key]] ?? 0) + 1;
    return Object.entries(m)
      .map(([k, v]) => ({ label: labelFn ? labelFn(k) : k, value: v }))
      .sort((a, b) => b.value - a.value);
  };

  const byAnimal = countBy("animal").slice(0, 6);
  const bySituation = countBy("situation", (v) => SITUATION_LABEL[v] ?? v).slice(0, 6);

  const wowChange =
    lastWeek === 0 ? null : Math.round(((thisWeek - lastWeek) / lastWeek) * 100);

  // Response time: from a case being reported to its first pickup (the earliest
  // "in_transit" or "at_centre" event). Uses the audit trail.
  const reportedAt: Record<string, number> = {};
  for (const c of cases) reportedAt[c.id] = new Date(c.created_at).getTime();
  const firstResponse: Record<string, number> = {};
  for (const e of events) {
    if (e.to_status !== "in_transit" && e.to_status !== "at_centre") continue;
    const t = new Date(e.created_at).getTime();
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
    <main className="animate-in mx-auto flex w-full max-w-3xl flex-1 flex-col px-5 py-8">
      <div className="mb-6 flex items-center justify-between">
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
          className="rounded-xl border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
        >
          Dashboard
        </Link>
      </div>

      {cases.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-zinc-200 bg-zinc-50/50 p-10 text-center text-sm text-zinc-500">
          No cases yet, so there is nothing to chart. Reports will show up here as
          they come in.
        </div>
      ) : (
        <div className="flex flex-col gap-5">
          {/* Stat cards */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat label="Total cases" value={cases.length} />
            <Stat
              label="This week"
              value={thisWeek}
              sub={
                wowChange === null
                  ? undefined
                  : `${wowChange >= 0 ? "+" : ""}${wowChange}% vs last week`
              }
              subUp={wowChange !== null && wowChange >= 0}
            />
            <Stat label="Open, needs help" value={needsHelpOpen} accent="text-rose-600" />
            <Stat
              label="Resolved"
              value={`${Math.round((closed / cases.length) * 100)}%`}
              accent="text-emerald-700"
            />
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
              Intake, last 14 days
            </h2>
            <div className="mt-4 flex h-32 items-end gap-1.5">
              {days.map((d, i) => (
                <div key={i} className="flex flex-1 flex-col items-center gap-1">
                  <div
                    className="w-full rounded-t bg-emerald-500/80"
                    style={{ height: `${(d.count / maxDay) * 100}%` }}
                    title={`${d.count}`}
                  />
                  <span className="text-[10px] text-zinc-400">{d.label}</span>
                </div>
              ))}
            </div>
          </section>

          <div className="grid gap-5 sm:grid-cols-2">
            <BarPanel title="By animal" rows={byAnimal} />
            <BarPanel title="By situation" rows={bySituation} />
          </div>
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
