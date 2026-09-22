"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export type CaseRow = {
  id: string;
  created_at: string;
  animal: string;
  situation: string;
  verdict: "leave" | "help" | "uncertain";
  title: string | null;
  status: "reported" | "in_transit" | "at_centre" | "closed";
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

export default function CaseList({
  initialCases,
}: {
  initialCases: CaseRow[];
}) {
  const [cases, setCases] = useState<CaseRow[]>(initialCases);
  const [savingId, setSavingId] = useState<string | null>(null);

  async function updateStatus(id: string, status: CaseRow["status"]) {
    const previous = cases;
    setCases((cs) => cs.map((c) => (c.id === id ? { ...c, status } : c)));
    setSavingId(id);
    const { error } = await createClient()
      .from("cases")
      .update({ status })
      .eq("id", id);
    setSavingId(null);
    if (error) setCases(previous); // revert on failure
  }

  if (cases.length === 0) {
    return (
      <div className="rounded-3xl border border-dashed border-black/10 bg-white/50 p-10 text-center">
        <p className="text-3xl">🕊️</p>
        <p className="mt-2 font-medium text-emerald-950">No cases yet</p>
        <p className="mt-1 text-sm text-zinc-500">
          When someone near you reports an animal and picks your centre, it will
          appear here.
        </p>
      </div>
    );
  }

  return (
    <ul className="flex flex-col gap-3">
      {cases.map((c) => (
        <li
          key={c.id}
          className="rounded-2xl border border-black/5 bg-white p-4 shadow-sm"
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
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

            <select
              value={c.status}
              disabled={savingId === c.id}
              onChange={(e) =>
                updateStatus(c.id, e.target.value as CaseRow["status"])
              }
              className="shrink-0 rounded-lg border border-black/10 bg-white px-2.5 py-1.5 text-sm outline-none focus:border-emerald-400 disabled:opacity-50"
            >
              {STATUSES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
        </li>
      ))}
    </ul>
  );
}
