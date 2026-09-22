"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import Spinner from "@/components/Spinner";

type CentreOption = { id: string; name: string; town: string };

export default function ProfileForm({
  email,
  role,
  initialName,
  initialCentreId,
  centres,
}: {
  email: string;
  role: string;
  initialName: string;
  initialCentreId: string;
  centres: CentreOption[];
}) {
  const router = useRouter();
  const [name, setName] = useState(initialName);
  const [centreId, setCentreId] = useState(initialCentreId);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const dirty = name !== initialName || centreId !== initialCentreId;

  async function save() {
    setSaving(true);
    setSaved(false);
    setError(null);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setError("Session expired. Please sign in again.");
      setSaving(false);
      return;
    }
    const { error } = await supabase
      .from("profiles")
      .update({ full_name: name.trim() || null, centre_id: centreId || null })
      .eq("id", user.id);
    setSaving(false);
    if (error) {
      setError(error.message);
      return;
    }
    setSaved(true);
    // Tell the account menu to refresh its display, and re-render server data.
    window.dispatchEvent(new Event("profile-updated"));
    router.refresh();
  }

  const initial = (name || email).charAt(0).toUpperCase();

  return (
    <div className="flex flex-col gap-5">
      <div className="rounded-3xl border border-black/5 bg-white p-6 shadow-sm">
        {/* Identity header */}
        <div className="flex items-center gap-3 border-b border-black/5 pb-5">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-600 text-lg font-semibold text-white">
            {initial}
          </span>
          <div className="min-w-0">
            <p className="truncate font-medium text-emerald-950">
              {name || "Unnamed staff"}
            </p>
            <p className="truncate text-sm text-zinc-500">{email}</p>
          </div>
          <span className="ml-auto shrink-0 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold capitalize text-emerald-800">
            {role}
          </span>
        </div>

        {/* Fields */}
        <div className="mt-5 flex flex-col gap-4">
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-zinc-700">Display name</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Alex Rivera"
              className="h-11 rounded-xl border border-black/10 bg-white px-4 outline-none transition-colors focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/20"
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-zinc-700">
              Linked centre
            </span>
            <select
              value={centreId}
              onChange={(e) => setCentreId(e.target.value)}
              className="h-11 rounded-xl border border-black/10 bg-white px-3 outline-none transition-colors focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/20"
            >
              <option value="">No centre linked</option>
              {centres.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.town})
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-zinc-700">Email</span>
            <input
              value={email}
              disabled
              className="h-11 cursor-not-allowed rounded-xl border border-black/5 bg-zinc-50 px-4 text-zinc-500"
            />
          </label>
        </div>

        {error && <p className="mt-4 text-sm text-rose-600">{error}</p>}
        {saved && !dirty && (
          <p className="mt-4 text-sm text-emerald-700">Saved.</p>
        )}

        <button
          onClick={save}
          disabled={saving || !dirty}
          className="mt-5 inline-flex h-11 items-center justify-center rounded-full bg-emerald-700 px-6 font-medium text-white shadow-sm transition-all hover:bg-emerald-800 active:scale-[0.98] disabled:opacity-50"
        >
          {saving ? <Spinner label="Saving…" /> : "Save changes"}
        </button>
      </div>

      <Link
        href="/dashboard"
        className="self-start text-sm font-medium text-emerald-700 underline underline-offset-4 hover:text-emerald-900"
      >
        Go to dashboard
      </Link>
    </div>
  );
}
