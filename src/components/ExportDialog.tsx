"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Check, Download, Search, X } from "lucide-react";
import type { ExportApi, ExportScope, PresetScope } from "@/lib/exportStore";

const GROUPS: {
  group: string;
  items: { scope: PresetScope; label: string; desc: string }[];
}[] = [
  {
    group: "All or filtered",
    items: [
      { scope: "all", label: "Everything", desc: "Every case you can see" },
      { scope: "view", label: "Current view", desc: "Matches your filters" },
    ],
  },
  {
    group: "By time period",
    items: [
      { scope: "week", label: "This week", desc: "Reported since Monday" },
      { scope: "month", label: "This month", desc: "Reported this month" },
      { scope: "year", label: "This year", desc: "Reported this year" },
    ],
  },
];

/**
 * Export cases as a CSV. A deliberate dialog (bottom sheet on mobile, centred
 * modal on desktop): pick a scope, see the count + filename, then Download.
 */
export default function ExportDialog({
  api,
  initialScope,
  onClose,
}: {
  api: ExportApi;
  initialScope?: ExportScope | null;
  onClose: () => void;
}) {
  // Honour an initial scope (e.g. "selected" from the dashboard selection bar),
  // else default to "Current view" when it has cases, otherwise "Everything".
  const [scope, setScope] = useState<ExportScope>(
    initialScope ?? (api.counts.view > 0 ? "view" : "all")
  );
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  // Hand-picked case ids + the picker's search box.
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [caseSearch, setCaseSearch] = useState("");

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const query = caseSearch.trim().toLowerCase();
  const shownCases = query
    ? api.cases.filter((c) => c.label.toLowerCase().includes(query))
    : api.cases;
  function togglePick(id: string) {
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const customRangeSet = Boolean(customFrom || customTo);
  const customCount = customRangeSet
    ? api.countForRange(customFrom, customTo)
    : 0;
  const selectedCount =
    scope === "custom"
      ? customCount
      : scope === "selected"
        ? picked.size
        : api.counts[scope];
  const filename =
    scope === "custom"
      ? `wildassist-cases-${
          customFrom && customTo
            ? `${customFrom}_to_${customTo}`
            : customFrom
              ? `from_${customFrom}`
              : customTo
                ? `to_${customTo}`
                : "custom"
        }.csv`
      : scope === "selected"
        ? "wildassist-cases-selected.csv"
        : `wildassist-cases-${scope}.csv`;

  function download() {
    if (selectedCount === 0) return;
    if (scope === "custom")
      api.run("custom", { range: { from: customFrom, to: customTo } });
    else if (scope === "selected") api.run("selected", { ids: [...picked] });
    else api.run(scope);
    onClose();
  }

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-stone-900/40 sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Export cases"
        onClick={(e) => e.stopPropagation()}
        className="animate-in w-full max-w-md rounded-t-2xl bg-white shadow-xl sm:rounded-2xl"
      >
        <div className="flex items-center justify-between border-b border-stone-100 px-5 py-4">
          <h2 className="font-display text-lg font-semibold text-stone-900">
            Export cases
          </h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-stone-500 transition-colors hover:bg-stone-100"
          >
            <X className="h-5 w-5" aria-hidden />
          </button>
        </div>

        <div className="max-h-[60vh] overflow-y-auto px-5 py-4">
          <p className="text-sm text-stone-600">
            Choose what to download as a CSV spreadsheet. The number is how many
            cases you&apos;ll get.
          </p>
          <div className="mt-4 space-y-4">
            {GROUPS.map((grp) => (
              <div key={grp.group}>
                <p className="text-[0.7rem] font-semibold uppercase tracking-[0.1em] text-stone-400">
                  {grp.group}
                </p>
                <div className="mt-1.5 flex flex-col gap-1.5">
                  {grp.items.map(({ scope: s, label, desc }) => {
                    const count = api.counts[s];
                    const disabled = count === 0;
                    const selected = scope === s;
                    return (
                      <button
                        key={s}
                        type="button"
                        disabled={disabled}
                        onClick={() => setScope(s)}
                        className={`flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition-colors ${
                          disabled
                            ? "cursor-not-allowed border-stone-200 opacity-40"
                            : selected
                              ? "border-forest-900 bg-forest-900/[0.04]"
                              : "border-stone-200 hover:bg-stone-50"
                        }`}
                      >
                        <span
                          aria-hidden
                          className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${
                            selected ? "border-forest-900" : "border-stone-300"
                          }`}
                        >
                          {selected && (
                            <span className="h-2 w-2 rounded-full bg-forest-900" />
                          )}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm font-medium text-stone-800">
                            {label}
                          </span>
                          <span className="block text-xs text-stone-500">
                            {desc}
                          </span>
                        </span>
                        <span className="shrink-0 text-xs font-medium tabular-nums text-stone-400">
                          {count}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}

            <div>
              <p className="text-[0.7rem] font-semibold uppercase tracking-[0.1em] text-stone-400">
                Custom range
              </p>
              <div className="mt-1.5">
                <button
                  type="button"
                  onClick={() => setScope("custom")}
                  className={`flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition-colors ${
                    scope === "custom"
                      ? "border-forest-900 bg-forest-900/[0.04]"
                      : "border-stone-200 hover:bg-stone-50"
                  }`}
                >
                  <span
                    aria-hidden
                    className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${
                      scope === "custom"
                        ? "border-forest-900"
                        : "border-stone-300"
                    }`}
                  >
                    {scope === "custom" && (
                      <span className="h-2 w-2 rounded-full bg-forest-900" />
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium text-stone-800">
                      Custom date range
                    </span>
                    <span className="block text-xs text-stone-500">
                      Pick your own From / To dates
                    </span>
                  </span>
                  {scope === "custom" && customRangeSet && (
                    <span className="shrink-0 text-xs font-medium tabular-nums text-stone-400">
                      {customCount}
                    </span>
                  )}
                </button>
                {scope === "custom" && (
                  <div className="mt-2 flex items-center gap-2 pl-7">
                    <input
                      type="date"
                      value={customFrom}
                      max={customTo || undefined}
                      onChange={(e) => setCustomFrom(e.target.value)}
                      aria-label="From date"
                      className="h-9 min-w-0 flex-1 rounded-lg border border-stone-200 bg-white px-2 text-sm text-stone-700 outline-none focus:border-emerald-400"
                    />
                    <span className="shrink-0 text-sm text-stone-400">to</span>
                    <input
                      type="date"
                      value={customTo}
                      min={customFrom || undefined}
                      onChange={(e) => setCustomTo(e.target.value)}
                      aria-label="To date"
                      className="h-9 min-w-0 flex-1 rounded-lg border border-stone-200 bg-white px-2 text-sm text-stone-700 outline-none focus:border-emerald-400"
                    />
                  </div>
                )}
              </div>
            </div>

            <div>
              <p className="text-[0.7rem] font-semibold uppercase tracking-[0.1em] text-stone-400">
                Specific cases
              </p>
              <div className="mt-1.5">
                <button
                  type="button"
                  onClick={() => setScope("selected")}
                  className={`flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition-colors ${
                    scope === "selected"
                      ? "border-forest-900 bg-forest-900/[0.04]"
                      : "border-stone-200 hover:bg-stone-50"
                  }`}
                >
                  <span
                    aria-hidden
                    className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${
                      scope === "selected"
                        ? "border-forest-900"
                        : "border-stone-300"
                    }`}
                  >
                    {scope === "selected" && (
                      <span className="h-2 w-2 rounded-full bg-forest-900" />
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium text-stone-800">
                      Pick specific cases
                    </span>
                    <span className="block text-xs text-stone-500">
                      Tick the exact cases you want
                    </span>
                  </span>
                  {scope === "selected" && picked.size > 0 && (
                    <span className="shrink-0 text-xs font-medium tabular-nums text-stone-400">
                      {picked.size}
                    </span>
                  )}
                </button>
                {scope === "selected" && (
                  <div className="mt-2">
                    <div className="relative">
                      <Search
                        className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400"
                        aria-hidden
                      />
                      <input
                        value={caseSearch}
                        onChange={(e) => setCaseSearch(e.target.value)}
                        placeholder="Search cases…"
                        aria-label="Search cases to export"
                        className="h-9 w-full rounded-lg border border-stone-200 bg-white pl-9 pr-3 text-sm outline-none focus:border-emerald-400"
                      />
                    </div>
                    <div className="mt-1.5 flex items-center justify-between px-0.5 text-xs">
                      <button
                        type="button"
                        onClick={() =>
                          setPicked(
                            (prev) =>
                              new Set([
                                ...prev,
                                ...shownCases.map((c) => c.id),
                              ])
                          )
                        }
                        className="font-medium text-forest-900 hover:underline"
                      >
                        Select all
                        {query
                          ? ` shown (${shownCases.length})`
                          : ` (${api.cases.length})`}
                      </button>
                      {picked.size > 0 && (
                        <button
                          type="button"
                          onClick={() => setPicked(new Set())}
                          className="font-medium text-stone-500 hover:underline"
                        >
                          Clear
                        </button>
                      )}
                    </div>
                    <div className="mt-1.5 max-h-44 overflow-y-auto rounded-xl border border-stone-200">
                      {shownCases.length === 0 ? (
                        <p className="px-3 py-6 text-center text-xs text-stone-400">
                          No cases match.
                        </p>
                      ) : (
                        shownCases.map((c, i) => {
                          const on = picked.has(c.id);
                          return (
                            <button
                              key={c.id}
                              type="button"
                              onClick={() => togglePick(c.id)}
                              className={`flex w-full items-center gap-2.5 px-3 py-2 text-left transition-colors hover:bg-stone-50 ${
                                i > 0 ? "border-t border-stone-100" : ""
                              }`}
                            >
                              <span
                                aria-hidden
                                className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors ${
                                  on
                                    ? "border-forest-900 bg-forest-900 text-white"
                                    : "border-stone-300 bg-white"
                                }`}
                              >
                                {on && <Check className="h-3 w-3" aria-hidden />}
                              </span>
                              <span className="min-w-0 flex-1 truncate text-sm text-stone-800">
                                {c.label}
                              </span>
                              <span className="shrink-0 text-[11px] text-stone-400">
                                {new Date(c.when).toLocaleDateString(undefined, {
                                  month: "short",
                                  day: "numeric",
                                })}
                              </span>
                            </button>
                          );
                        })
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
          <p className="mt-4 truncate rounded-lg bg-stone-50 px-3 py-2 text-xs text-stone-500">
            File: <span className="font-medium text-stone-700">{filename}</span>
          </p>
        </div>

        <div className="flex justify-end gap-2 border-t border-stone-100 px-5 py-4">
          <button
            onClick={onClose}
            className="inline-flex h-10 items-center justify-center rounded-xl border border-stone-200 px-4 text-sm font-medium text-stone-700 transition-colors hover:bg-stone-50"
          >
            Cancel
          </button>
          <button
            onClick={download}
            disabled={selectedCount === 0}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-forest-900 px-4 text-sm font-semibold text-white transition-colors hover:bg-forest-800 disabled:opacity-50"
          >
            <Download className="h-4 w-4" aria-hidden />
            Download CSV
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
