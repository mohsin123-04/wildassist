import { useSyncExternalStore } from "react";

export type PresetScope = "all" | "view" | "week" | "month" | "year";
export type ExportScope = PresetScope | "custom" | "selected";

/** A case, lightweight, for the in-dialog "pick specific cases" checklist. */
export type ExportCase = { id: string; label: string; when: string };

export type ExportApi = {
  /** How many cases each preset scope would export, for the live counts. */
  counts: Record<PresetScope, number>;
  /** The visible cases, for the "pick specific cases" checklist in the dialog. */
  cases: ExportCase[];
  /** How many cases fall in a custom date range (yyyy-mm-dd; either may be ""). */
  countForRange: (from: string, to: string) => number;
  /** Run the export (downloads the CSV + shows a toast). Pass a custom range's
   *  from/to dates, or the ids picked for a manual selection. */
  run: (
    scope: ExportScope,
    opts?: { range?: { from: string; to: string }; ids?: string[] }
  ) => void;
};

/**
 * Tiny shared store so the global account menu (in the header) can offer "Export
 * cases" that's driven by the dashboard's CaseList — the only place with the
 * case data, filters, and manual selection. CaseList publishes an ExportApi
 * while mounted; the menu / selection bar read it. The dialog's open state also
 * lives here so it can be opened from either the account menu or the dashboard
 * selection bar.
 */
let current: ExportApi | null = null;
const apiListeners = new Set<() => void>();

export function setExportApi(api: ExportApi | null) {
  current = api;
  apiListeners.forEach((l) => l());
}

function subscribeApi(cb: () => void) {
  apiListeners.add(cb);
  return () => {
    apiListeners.delete(cb);
  };
}

export function useExportApi() {
  return useSyncExternalStore(
    subscribeApi,
    () => current,
    () => null
  );
}

// --- Dialog open state (shared so either entry point can open it) -----------
let dialogOpen = false;
let dialogInitialScope: ExportScope | null = null;
const dialogListeners = new Set<() => void>();

export function openExportDialog(initialScope: ExportScope | null = null) {
  if (!current) return; // nothing to export (not on the dashboard)
  dialogOpen = true;
  dialogInitialScope = initialScope;
  dialogListeners.forEach((l) => l());
}

export function closeExportDialog() {
  dialogOpen = false;
  dialogListeners.forEach((l) => l());
}

function subscribeDialog(cb: () => void) {
  dialogListeners.add(cb);
  return () => {
    dialogListeners.delete(cb);
  };
}

export function useExportDialogOpen() {
  const open = useSyncExternalStore(
    subscribeDialog,
    () => dialogOpen,
    () => false
  );
  return { open, initialScope: dialogInitialScope };
}
