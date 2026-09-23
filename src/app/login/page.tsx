"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import Spinner from "@/components/Spinner";

type Mode = "signin" | "signup";
type Role = "staff" | "volunteer";

const inputClass =
  "h-11 w-full rounded-xl border border-black/10 bg-white px-4 outline-none transition-colors focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/20";

const ROLES: { value: Role; icon: string; title: string; desc: string }[] = [
  {
    value: "staff",
    icon: "🏥",
    title: "Wildlife centre staff",
    desc: "See and manage cases for your centre. You'll need your centre's join code.",
  },
  {
    value: "volunteer",
    icon: "🚗",
    title: "Rescue volunteer",
    desc: "Help transport injured animals from where they're found to a centre.",
  },
];

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("signin");
  const [role, setRole] = useState<Role>("staff");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function routeByRole() {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return router.push("/dashboard");
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();
    router.push(profile?.role === "volunteer" ? "/transport" : "/dashboard");
    router.refresh();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setNotice(null);
    setLoading(true);
    const supabase = createClient();

    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { full_name: name } },
        });
        if (error) throw error;
        if (data.user) {
          await fetch("/api/register", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ userId: data.user.id, role }),
          });
        }
        if (data.session) {
          await routeByRole();
        } else {
          setNotice(
            "Account created. Check your inbox to confirm your email, then sign in."
          );
          setMode("signin");
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        await routeByRole();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="animate-in mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-5 py-12">
      <div className="rounded-3xl border border-black/5 bg-white p-7 shadow-sm">
        <div className="flex items-center gap-2">
          <span
            aria-hidden
            className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-100 text-lg"
          >
            🦉
          </span>
          <h1 className="font-display text-2xl font-semibold tracking-tight text-emerald-950">
            {mode === "signin" ? "Sign in" : "Create your account"}
          </h1>
        </div>
        <p className="mt-2 text-sm leading-6 text-zinc-600">
          WildAssist accounts are for{" "}
          <span className="font-medium text-zinc-800">
            wildlife centre staff and rescue volunteers
          </span>
          . Found an animal?{" "}
          <Link
            href="/triage"
            className="font-medium text-emerald-700 underline underline-offset-2"
          >
            You don&apos;t need an account, just report it.
          </Link>
        </p>

        <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
          {mode === "signup" && (
            <>
              <div className="grid gap-2.5">
                {ROLES.map((r) => (
                  <button
                    type="button"
                    key={r.value}
                    onClick={() => setRole(r.value)}
                    className={`flex items-start gap-3 rounded-2xl border p-3.5 text-left transition-all ${
                      role === r.value
                        ? "border-emerald-500 bg-emerald-50 ring-1 ring-emerald-500/30"
                        : "border-black/10 bg-white hover:border-emerald-300"
                    }`}
                  >
                    <span aria-hidden className="text-xl">
                      {r.icon}
                    </span>
                    <span>
                      <span className="block text-sm font-semibold text-emerald-950">
                        {r.title}
                      </span>
                      <span className="mt-0.5 block text-xs leading-5 text-zinc-500">
                        {r.desc}
                      </span>
                    </span>
                  </button>
                ))}
              </div>
              <input
                className={inputClass}
                placeholder="Your name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </>
          )}

          <input
            className={inputClass}
            type="email"
            required
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <input
            className={inputClass}
            type="password"
            required
            minLength={6}
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          {error && <p className="text-sm text-rose-600">{error}</p>}
          {notice && <p className="text-sm text-emerald-700">{notice}</p>}

          <button
            type="submit"
            disabled={loading}
            className="mt-1 inline-flex h-11 items-center justify-center rounded-full bg-emerald-700 px-6 font-medium text-white shadow-sm transition-all hover:bg-emerald-800 active:scale-[0.98] disabled:opacity-60"
          >
            {loading ? (
              <Spinner label="Please wait…" />
            ) : mode === "signin" ? (
              "Sign in"
            ) : (
              "Create account"
            )}
          </button>
        </form>

        <button
          onClick={() => {
            setMode(mode === "signin" ? "signup" : "signin");
            setError(null);
            setNotice(null);
          }}
          className="mt-4 text-sm text-emerald-700 underline underline-offset-4 hover:text-emerald-900"
        >
          {mode === "signin"
            ? "New here? Create an account"
            : "Already have an account? Sign in"}
        </button>
      </div>

      <Link
        href="/"
        className="mt-6 text-center text-sm text-zinc-500 hover:text-zinc-800"
      >
        ← Back to WildAssist
      </Link>
    </main>
  );
}
