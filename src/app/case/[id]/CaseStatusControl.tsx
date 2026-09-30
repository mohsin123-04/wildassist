"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { flash } from "@/lib/flash";

const STATUSES = [
  { value: "reported", label: "Reported" },
  { value: "in_transit", label: "In transit" },
  { value: "at_centre", label: "At centre" },
  { value: "closed", label: "Closed" },
] as const;
type Status = (typeof STATUSES)[number]["value"];

/** Optimistic status select for the case page (audit trail via DB trigger). */
export default function CaseStatusControl({
  caseId,
  initialStatus,
}: {
  caseId: string;
  initialStatus: Status;
}) {
  const router = useRouter();
  const [status, setStatus] = useState<Status>(initialStatus);
  const [saving, setSaving] = useState(false);

  async function update(next: Status) {
    const previous = status;
    setStatus(next);
    setSaving(true);
    const { error } = await createClient()
      .from("cases")
      .update({ status: next })
      .eq("id", caseId);
    setSaving(false);
    if (error) {
      setStatus(previous);
      flash("Couldn't update the status.");
      return;
    }
    flash("Status updated.");
    router.refresh();
  }

  return (
    <label className="flex items-center gap-2 text-sm text-stone-600">
      Status
      <select
        value={status}
        disabled={saving}
        onChange={(e) => update(e.target.value as Status)}
        className="rounded-lg border border-stone-200 bg-white px-2.5 py-1.5 text-sm text-stone-800 outline-none focus:border-emerald-400 disabled:opacity-50"
      >
        {STATUSES.map((s) => (
          <option key={s.value} value={s.value}>
            {s.label}
          </option>
        ))}
      </select>
    </label>
  );
}
