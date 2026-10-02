"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Spinner from "@/components/Spinner";

const inputClass =
  "h-11 w-full rounded-xl border border-stone-200 bg-white px-4 outline-none transition-colors focus:border-stone-400 focus:ring-4 focus:ring-stone-900/5";

export default function ProfileForm({
  initialName,
  initialTitle,
  initialPhone,
  initialBio,
}: {
  initialName: string;
  initialTitle: string;
  initialPhone: string;
  initialBio: string;
}) {
  const router = useRouter();
  const [name, setName] = useState(initialName);
  const [title, setTitle] = useState(initialTitle);
  const [phone, setPhone] = useState(initialPhone);
  const [bio, setBio] = useState(initialBio);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const dirty =
    name !== initialName ||
    title !== initialTitle ||
    phone !== initialPhone ||
    bio !== initialBio;

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
      .update({
        full_name: name.trim() || null,
        title: title.trim() || null,
        phone: phone.trim() || null,
        bio: bio.trim() || null,
      })
      .eq("id", user.id);
    setSaving(false);
    if (error) {
      setError(error.message);
      return;
    }
    setSaved(true);
    window.dispatchEvent(new Event("profile-updated"));
    router.refresh();
  }

  return (
    <section>
      <h2 className="font-display text-lg font-semibold text-stone-900">
        Profile
      </h2>
      <p className="mt-0.5 text-sm text-stone-500">
        How you appear to your centre team.
      </p>

      <div className="mt-5 flex flex-col gap-4">
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-stone-700">Display name</span>
          <input
            className={inputClass}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Alex Rivera"
          />
        </label>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-stone-700">
              Role / title
            </span>
            <input
              className={inputClass}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Rehabilitator"
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-stone-700">Phone</span>
            <input
              className={inputClass}
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="e.g. 416-555-0199"
            />
          </label>
        </div>

        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-stone-700">Bio</span>
          <textarea
            rows={3}
            className="w-full resize-none rounded-xl border border-stone-200 bg-white p-4 outline-none transition-colors focus:border-stone-400 focus:ring-4 focus:ring-stone-900/5"
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="A sentence about you and your work at the centre."
          />
        </label>
      </div>

      {error && <p className="mt-4 text-sm text-rose-700">{error}</p>}
      {saved && !dirty && (
        <p className="mt-4 text-sm text-emerald-700">Saved.</p>
      )}

      <button
        onClick={save}
        disabled={saving || !dirty}
        className="mt-5 inline-flex h-11 items-center justify-center rounded-xl bg-forest-900 px-6 font-medium text-white shadow-sm transition-all hover:bg-forest-800 active:scale-[0.98] disabled:opacity-50"
      >
        {saving ? <Spinner label="Saving…" /> : "Save changes"}
      </button>
    </section>
  );
}
