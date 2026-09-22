"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Spinner from "@/components/Spinner";

type CentreOption = { id: string; name: string; town: string };

export default function CentreOnboarding({
  centres,
}: {
  centres: CentreOption[];
}) {
  const router = useRouter();
  const [selected, setSelected] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    if (!selected) return;
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setError("Session expired. Please sign in again.");
      setLoading(false);
      return;
    }
    const { error } = await supabase
      .from("profiles")
      .update({ centre_id: selected })
      .eq("id", user.id);
    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }
    router.refresh();
  }

  return (
    <div className="rounded-3xl border border-black/5 bg-white p-7 shadow-sm">
      <h1 className="font-display text-2xl font-semibold tracking-tight text-emerald-950">
        Which centre are you with?
      </h1>
      <p className="mt-1 text-sm leading-6 text-zinc-600">
        Link your account to a centre to see the cases routed to it. (Demo step:
        in production this would be verified.)
      </p>

      <select
        value={selected}
        onChange={(e) => setSelected(e.target.value)}
        className="mt-5 h-11 w-full rounded-xl border border-black/10 bg-white px-3 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/20"
      >
        <option value="">Select a centre…</option>
        {centres.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name} ({c.town})
          </option>
        ))}
      </select>

      {error && <p className="mt-3 text-sm text-rose-600">{error}</p>}

      <button
        onClick={save}
        disabled={!selected || loading}
        className="mt-5 inline-flex h-11 items-center justify-center rounded-full bg-emerald-700 px-6 font-medium text-white shadow-sm transition-all hover:bg-emerald-800 active:scale-[0.98] disabled:opacity-50"
      >
        {loading ? <Spinner label="Saving…" /> : "Continue"}
      </button>
    </div>
  );
}
