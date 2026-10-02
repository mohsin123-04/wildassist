import { useSyncExternalStore } from "react";

export type ExportScope = "all" | "view" | "week" | "month" | "year";

export type ExportApi = {
  /** How many cases each scope would export, for the menu's live counts. */
  counts: Record<ExportScope, number>;
  /** Run the export for a scope (downloads the CSV + shows a toast). */
  run: (scope: ExportScope) => void;
};

/**
 * Tiny shared store so the global account menu (in the header) can offer "Export
 * cases" that's driven by the dashboard's CaseList — which is the only place
 * that has the case data + active filters. The dashboard publishes an ExportApi
 * while it's mounted; the menu reads it and only shows Export when it exists.
 */
let current: ExportApi | null = null;
const listeners = new Set<() => void>();

export function setExportApi(api: ExportApi | null) {
  current = api;
  listeners.forEach((l) => l());
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

function getSnapshot() {
  return current;
}

function getServerSnapshot() {
  return null;
}

export function useExportApi() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
