"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Spinner from "@/components/Spinner";

type CentreOption = { id: string; name: string; town: string };

export default function CentreOnboarding({
  centres,
}: {
  centres: CentreOption[];
}) {
  const router = useRouter();
  const [selected, setSelected] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function join() {
    if (!selected || !code.trim()) return;
    setLoading(true);
    setError(null);
    const res = await fetch("/api/join-centre", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ centreId: selected, code }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Could not join.");
      setLoading(false);
      return;
    }
    setLoading(false);
    router.refresh();
  }

  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-7 shadow-sm">
      <h1 className="font-display text-2xl font-semibold tracking-tight text-stone-900">
        Join your centre
      </h1>
      <p className="mt-1 text-sm leading-6 text-stone-600">
        Cases contain the contact details of people who reported animals, so
        access is protected. Enter the join code your centre gave you to see its
        cases.
      </p>

      <div className="mt-5 flex flex-col gap-3">
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-stone-700">Centre</span>
          <select
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
            className="h-11 w-full rounded-xl border border-stone-200 bg-white px-3 outline-none focus:border-stone-400 focus:ring-4 focus:ring-stone-900/5"
          >
            <option value="">Select a centre…</option>
            {centres.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.town})
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-stone-700">Join code</span>
          <input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="e.g. TWC-2026"
            className="h-11 w-full rounded-xl border border-stone-200 bg-white px-4 outline-none focus:border-stone-400 focus:ring-4 focus:ring-stone-900/5"
          />
        </label>
      </div>

      {error && <p className="mt-3 text-sm text-rose-700">{error}</p>}

      <button
        onClick={join}
        disabled={!selected || !code.trim() || loading}
        className="mt-5 inline-flex h-11 items-center justify-center rounded-xl bg-stone-900 px-6 font-medium text-white shadow-sm transition-all hover:bg-stone-800 active:scale-[0.98] disabled:opacity-50"
      >
        {loading ? <Spinner label="Joining…" /> : "Join centre"}
      </button>
    </div>
  );
}
