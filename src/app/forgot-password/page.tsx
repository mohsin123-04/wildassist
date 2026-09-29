"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Bird } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import Spinner from "@/components/Spinner";

const inputClass =
  "h-11 w-full rounded-xl border border-zinc-200 bg-white px-4 outline-none transition-colors focus:border-zinc-400 focus:ring-4 focus:ring-zinc-900/5";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expired, setExpired] = useState(false);

  // Arrived here from an invalid/expired reset link (/auth/confirm redirect).
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("error") === "expired") {
      setExpired(true);
    }
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const redirectTo = `${window.location.origin}/reset-password`;
    const { error } = await createClient().auth.resetPasswordForEmail(email, {
      redirectTo,
    });
    setBusy(false);
    if (error) {
      setError(error.message);
      return;
    }
    // Always show success (don't reveal whether an account exists).
    setSent(true);
  }

  return (
    <main className="animate-in mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-5 py-12">
      <div className="rounded-2xl border border-zinc-200 bg-white p-7">
        <div className="flex items-center gap-2">
          <span
            aria-hidden
            className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-600 text-white"
          >
            <Bird className="h-5 w-5" />
          </span>
          <h1 className="font-display text-2xl font-semibold tracking-tight text-zinc-900">
            Reset your password
          </h1>
        </div>

        {sent ? (
          <div className="mt-4">
            <p className="text-sm leading-6 text-zinc-600">
              If an account exists for{" "}
              <span className="font-medium text-zinc-800">{email}</span>, we&apos;ve
              sent a link to reset your password. Check your inbox (and spam), then
              follow the link to set a new one.
            </p>
            <Link
              href="/login"
              className="mt-6 inline-flex text-sm font-medium text-emerald-600 underline underline-offset-4 hover:text-emerald-700"
            >
              Back to sign in
            </Link>
          </div>
        ) : (
          <>
            {expired && (
              <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                That reset link was invalid or has expired. Request a new one
                below.
              </p>
            )}
            <p className="mt-2 text-sm leading-6 text-zinc-600">
              Enter the email for your account and we&apos;ll send you a link to
              choose a new password.
            </p>
            <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
              <input
                className={inputClass}
                type="email"
                required
                aria-label="Email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              {error && (
                <p role="alert" className="text-sm text-rose-600">
                  {error}
                </p>
              )}
              <button
                type="submit"
                disabled={busy}
                className="inline-flex h-11 items-center justify-center rounded-xl bg-zinc-900 px-6 text-sm font-semibold text-white shadow-sm transition-all hover:bg-zinc-800 active:scale-[0.98] disabled:opacity-60"
              >
                {busy ? <Spinner label="Sending…" /> : "Send reset link"}
              </button>
            </form>

            <Link
              href="/login"
              className="mt-4 inline-flex text-sm text-emerald-600 underline underline-offset-4 hover:text-emerald-900"
            >
              Back to sign in
            </Link>
          </>
        )}
      </div>
    </main>
  );
}
