"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Avatar, { AVATAR_COLORS } from "@/components/Avatar";
import Spinner from "@/components/Spinner";

export default function AppearanceSection({
  initialUrl,
  initialColor,
  name,
  email,
}: {
  initialUrl: string | null;
  initialColor: string | null;
  name?: string | null;
  email?: string | null;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [url, setUrl] = useState<string | null>(initialUrl);
  const [color, setColor] = useState<string>(initialColor || AVATAR_COLORS[0]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function upload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    setError(null);
    const form = new FormData();
    form.append("file", file);
    const res = await fetch("/api/avatar", { method: "POST", body: form });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) {
      setError(data.error ?? "Upload failed");
      return;
    }
    setUrl(data.url);
    window.dispatchEvent(new Event("profile-updated"));
    router.refresh();
  }

  async function removePhoto() {
    setBusy(true);
    setError(null);
    await fetch("/api/avatar", { method: "DELETE" });
    setBusy(false);
    setUrl(null);
    window.dispatchEvent(new Event("profile-updated"));
    router.refresh();
  }

  async function pickColor(c: string) {
    setColor(c);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from("profiles").update({ avatar_color: c }).eq("id", user.id);
    window.dispatchEvent(new Event("profile-updated"));
    router.refresh();
  }

  return (
    <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
      <h2 className="font-display text-lg font-semibold text-zinc-900">
        Appearance
      </h2>
      <p className="mt-0.5 text-sm text-zinc-500">
        Upload a photo, or pick a color for your initials.
      </p>

      <div className="mt-5 flex items-center gap-4">
        <Avatar url={url} name={name} email={email} color={color} size={64} />
        <div className="flex flex-wrap gap-2">
          <input
            ref={inputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="hidden"
            onChange={upload}
          />
          <button
            onClick={() => inputRef.current?.click()}
            disabled={busy}
            className="inline-flex h-10 items-center justify-center rounded-xl bg-zinc-900 px-5 text-sm font-medium text-white transition-colors hover:bg-zinc-800 disabled:opacity-50"
          >
            {busy ? <Spinner label="Working…" /> : "Upload photo"}
          </button>
          {url && (
            <button
              onClick={removePhoto}
              disabled={busy}
              className="inline-flex h-10 items-center justify-center rounded-xl border border-zinc-200 px-5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 disabled:opacity-50"
            >
              Remove
            </button>
          )}
        </div>
      </div>

      <div className="mt-5">
        <p className="mb-2 text-sm font-medium text-zinc-700">Initials color</p>
        <div className="flex flex-wrap gap-2.5">
          {AVATAR_COLORS.map((c) => (
            <button
              key={c}
              onClick={() => pickColor(c)}
              aria-label={`Use ${c}`}
              style={{ backgroundColor: c }}
              className={`h-8 w-8 rounded-full transition-transform hover:scale-110 ${
                color === c ? "ring-2 ring-offset-2 ring-zinc-900" : ""
              }`}
            />
          ))}
        </div>
      </div>

      {error && <p className="mt-4 text-sm text-rose-700">{error}</p>}
      <p className="mt-3 text-xs text-zinc-500">
        PNG, JPG, or WebP, up to 2 MB.
      </p>
    </section>
  );
}
