"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Download, X } from "lucide-react";
import type { ExportApi, ExportScope } from "@/lib/exportStore";

const GROUPS: {
  group: string;
  items: { scope: ExportScope; label: string; desc: string }[];
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
  onClose,
}: {
  api: ExportApi;
  onClose: () => void;
}) {
  // Default to "Current view" when it has cases, otherwise "Everything".
  const [scope, setScope] = useState<ExportScope>(
    api.counts.view > 0 ? "view" : "all"
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const selectedCount = api.counts[scope];
  const filename = `wildassist-cases-${scope}.csv`;

  function download() {
    if (selectedCount === 0) return;
    api.run(scope);
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
