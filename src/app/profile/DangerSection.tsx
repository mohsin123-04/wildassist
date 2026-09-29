"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { flash } from "@/lib/flash";
import Spinner from "@/components/Spinner";

export default function DangerSection() {
  const router = useRouter();
  const [busy, setBusy] = useState<"out" | "delete" | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function signOutEverywhere() {
    setBusy("out");
    await createClient().auth.signOut({ scope: "global" });
    flash("Signed out on all devices");
    router.push("/");
    router.refresh();
  }

  async function deleteAccount() {
    setBusy("delete");
    setError(null);
    const res = await fetch("/api/account", { method: "DELETE" });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setError(d.error ?? "Could not delete account");
      setBusy(null);
      return;
    }
    await createClient().auth.signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <section className="rounded-2xl border border-rose-200 bg-rose-50/50 p-6">
      <h2 className="font-display text-lg font-semibold text-rose-900">
        Danger zone
      </h2>

      <div className="mt-4 flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-zinc-800">
              Sign out everywhere
            </p>
            <p className="text-sm text-zinc-500">
              Ends your session on all devices.
            </p>
          </div>
          <button
            onClick={signOutEverywhere}
            disabled={busy !== null}
            className="inline-flex h-10 items-center justify-center rounded-xl border border-zinc-200 bg-white px-5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 disabled:opacity-50"
          >
            {busy === "out" ? <Spinner label="Signing out…" /> : "Sign out all"}
          </button>
        </div>

        <hr className="border-rose-200" />

        <div>
          <p className="text-sm font-medium text-zinc-800">Delete account</p>
          <p className="text-sm text-zinc-500">
            Permanently removes your account and profile. This cannot be undone.
          </p>

          {!confirming ? (
            <button
              onClick={() => setConfirming(true)}
              className="mt-3 inline-flex h-10 items-center justify-center rounded-xl bg-rose-600 px-5 text-sm font-medium text-white transition-colors hover:bg-rose-700"
            >
              Delete my account
            </button>
          ) : (
            <div className="mt-3 flex flex-col gap-3 rounded-2xl border border-rose-200 bg-white p-4">
              <p className="text-sm text-zinc-700">
                Type <span className="font-semibold">DELETE</span> to confirm.
              </p>
              <input
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder="DELETE"
                className="h-10 rounded-xl border border-zinc-200 px-3 outline-none focus:border-rose-400"
              />
              {error && <p className="text-sm text-rose-700">{error}</p>}
              <div className="flex gap-2">
                <button
                  onClick={deleteAccount}
                  disabled={confirmText !== "DELETE" || busy !== null}
                  className="inline-flex h-10 items-center justify-center rounded-xl bg-rose-600 px-5 text-sm font-medium text-white transition-colors hover:bg-rose-700 disabled:opacity-50"
                >
                  {busy === "delete" ? (
                    <Spinner label="Deleting…" />
                  ) : (
                    "Permanently delete"
                  )}
                </button>
                <button
                  onClick={() => {
                    setConfirming(false);
                    setConfirmText("");
                    setError(null);
                  }}
                  className="inline-flex h-10 items-center justify-center rounded-xl border border-zinc-200 px-5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
