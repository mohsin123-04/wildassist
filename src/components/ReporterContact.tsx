"use client";

import { useState } from "react";
import Spinner from "@/components/Spinner";

/**
 * Optional: lets the person who found the animal share their contact so the
 * centre can follow up. Saves onto the already-logged case.
 */
export default function ReporterContact({ caseId }: { caseId: string | null }) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  if (!caseId) return null;

  async function share() {
    if (!phone.trim() && !name.trim()) return;
    setSaving(true);
    try {
      await fetch(`/api/cases/${caseId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reporterName: name, reporterPhone: phone }),
      });
      setSaved(true);
    } catch {
      // best-effort
    } finally {
      setSaving(false);
    }
  }

  if (saved) {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-sm text-emerald-900">
        Thanks. We've shared your contact with the centre so they can follow up.
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
      <h2 className="font-display text-lg font-semibold text-zinc-900">
        Want the centre to reach you?
      </h2>
      <p className="mt-1 text-sm leading-6 text-zinc-600">
        Optional. Share your contact so staff can follow up about this animal.
      </p>
      <div className="mt-3 flex flex-col gap-2.5 sm:flex-row">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Your name"
          className="h-11 flex-1 rounded-xl border border-black/10 bg-white px-4 outline-none transition-colors focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/20"
        />
        <input
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="Phone or email"
          className="h-11 flex-1 rounded-xl border border-black/10 bg-white px-4 outline-none transition-colors focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/20"
        />
      </div>
      <button
        onClick={share}
        disabled={saving || (!name.trim() && !phone.trim())}
        className="mt-3 inline-flex h-10 items-center justify-center rounded-xl bg-emerald-600 px-5 text-sm font-medium text-white transition-colors hover:bg-emerald-700 disabled:opacity-50"
      >
        {saving ? <Spinner label="Sharing…" /> : "Share my contact"}
      </button>
    </div>
  );
}
