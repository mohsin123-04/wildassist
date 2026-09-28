"use client";

import { Download, Printer } from "lucide-react";

/** Export / print toolbar for the analytics page. The CSV content is authored
 *  server-side and passed in as rows, so it always matches what's on screen. */
export default function AnalyticsActions({
  rows,
  filename,
}: {
  rows: (string | number)[][];
  filename: string;
}) {
  function exportCsv() {
    const csv = rows
      .map((r) =>
        r
          .map((cell) => {
            const s = String(cell ?? "");
            return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
          })
          .join(",")
      )
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="no-print flex gap-2">
      <button
        onClick={exportCsv}
        className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-3 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50"
      >
        <Download className="h-4 w-4" aria-hidden /> CSV
      </button>
      <button
        onClick={() => window.print()}
        className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-3 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50"
      >
        <Printer className="h-4 w-4" aria-hidden /> Print
      </button>
    </div>
  );
}
