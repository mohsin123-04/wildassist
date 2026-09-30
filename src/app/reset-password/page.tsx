"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Bird } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { flash } from "@/lib/flash";
import Spinner from "@/components/Spinner";

const inputClass =
  "h-11 w-full rounded-xl border border-stone-200 bg-white px-4 outline-none transition-colors focus:border-stone-400 focus:ring-4 focus:ring-stone-900/5";

type Ready = "checking" | "ready" | "invalid";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [ready, setReady] = useState<Ready>("checking");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // The recovery link establishes a temporary session (handled by the browser
  // client detecting the token in the URL). Wait for it before showing the form.
  useEffect(() => {
    const supabase = createClient();
    let settled = false;
    const markReady = () => {
      settled = true;
      setReady("ready");
    };

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) markReady();
    });

    supabase.auth.getSession().then(({ data }) => {
      if (data.session) markReady();
    });

    // If no session appears shortly, the link was invalid or expired.
    const t = setTimeout(() => {
      if (!settled) setReady("invalid");
    }, 2500);

    return () => {
      sub.subscription.unsubscribe();
      clearTimeout(t);
    };
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords don't match.");
      return;
    }
    setBusy(true);
    setError(null);
    const { error } = await createClient().auth.updateUser({ password });
    setBusy(false);
    if (error) {
      setError(error.message);
      return;
    }
    flash("Password updated. You're signed in.");
    router.replace("/dashboard");
  }

  return (
    <main className="animate-in mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-5 py-12">
      <div className="rounded-2xl border border-stone-200 bg-white p-7">
        <div className="flex items-center gap-2">
          <span
            aria-hidden
            className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-700 text-white"
          >
            <Bird className="h-5 w-5" />
          </span>
          <h1 className="font-display text-2xl font-semibold tracking-tight text-stone-900">
            Choose a new password
          </h1>
        </div>

        {ready === "checking" ? (
          <div className="mt-6">
            <Spinner label="Verifying your link…" />
          </div>
        ) : ready === "invalid" ? (
          <div className="mt-4">
            <p className="text-sm leading-6 text-stone-600">
              This reset link is invalid or has expired. Reset links are
              single-use and time-limited. Please request a new one.
            </p>
            <Link
              href="/forgot-password"
              className="mt-6 inline-flex text-sm font-medium text-emerald-700 underline underline-offset-4 hover:text-emerald-700"
            >
              Request a new link
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
            <input
              className={inputClass}
              type="password"
              required
              minLength={6}
              aria-label="New password"
              placeholder="New password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <input
              className={inputClass}
              type="password"
              required
              minLength={6}
              aria-label="Confirm new password"
              placeholder="Confirm new password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
            />
            {error && (
              <p role="alert" className="text-sm text-rose-700">
                {error}
              </p>
            )}
            <button
              type="submit"
              disabled={busy}
              className="inline-flex h-11 items-center justify-center rounded-xl bg-stone-900 px-6 text-sm font-semibold text-white shadow-sm transition-all hover:bg-stone-800 active:scale-[0.98] disabled:opacity-60"
            >
              {busy ? <Spinner label="Updating…" /> : "Update password"}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
