"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { flash } from "@/lib/flash";
import Spinner from "@/components/Spinner";
import { Bird, Building2, Car, type LucideIcon } from "lucide-react";

type Mode = "signin" | "signup";
type Role = "staff" | "volunteer";

const inputClass =
  "h-11 w-full rounded-xl border border-zinc-200 bg-white px-4 outline-none transition-colors focus:border-zinc-400 focus:ring-4 focus:ring-zinc-900/5";

const ROLES: { value: Role; Icon: LucideIcon; title: string; desc: string }[] = [
  {
    value: "staff",
    Icon: Building2,
    title: "Wildlife centre staff",
    desc: "See and manage cases for your centre. You'll need your centre's join code.",
  },
  {
    value: "volunteer",
    Icon: Car,
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
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("");
  const [province, setProvince] = useState("");
  const [country, setCountry] = useState("Canada");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // Landing "become a volunteer" link opens signup with the volunteer role.
  useEffect(() => {
    const p = new URLSearchParams(window.location.search).get("signup");
    if (p === "volunteer") {
      setMode("signup");
      setRole("volunteer");
    }
  }, []);

  function routeByRole() {
    // The dashboard redirects volunteers to /transport server-side, so we can
    // navigate straight there without extra round-trips to look up the role.
    router.replace("/dashboard");
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
            body: JSON.stringify({
              userId: data.user.id,
              role,
              ...(role === "volunteer"
                ? { phone, city, province, country }
                : {}),
            }),
          });
        }
        if (data.session) {
          flash("Welcome to WildAssist");
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
        flash("Signed in");
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
      <div className="rounded-2xl border border-zinc-200 bg-white p-7">
        <div className="flex items-center gap-2">
          <span
            aria-hidden
            className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-600 text-white"
          >
            <Bird className="h-5 w-5" />
          </span>
          <h1 className="font-display text-2xl font-semibold tracking-tight text-zinc-900">
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
            className="font-medium text-emerald-600 underline underline-offset-2 hover:text-emerald-700"
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
                        ? "border-zinc-900 bg-zinc-50 ring-1 ring-zinc-900"
                        : "border-zinc-200 bg-white hover:border-zinc-300"
                    }`}
                  >
                    <span
                      aria-hidden
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600"
                    >
                      <r.Icon className="h-5 w-5" />
                    </span>
                    <span>
                      <span className="block text-sm font-semibold text-zinc-900">
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
                aria-label="Your name"
                placeholder="Your name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
              {role === "volunteer" && (
                <div className="flex flex-col gap-3 rounded-2xl border border-zinc-200 bg-zinc-50/60 p-3.5">
                  <p className="text-xs font-medium text-zinc-500">
                    So a centre can verify and reach you about pickups.
                  </p>
                  <input
                    className={inputClass}
                    type="tel"
                    required
                    aria-label="Phone number"
                    placeholder="Phone number"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                  <input
                    className={inputClass}
                    required
                    aria-label="City or town"
                    placeholder="City / town"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <input
                      className={inputClass}
                      aria-label="Province or state"
                      placeholder="Province / state"
                      value={province}
                      onChange={(e) => setProvince(e.target.value)}
                    />
                    <input
                      className={inputClass}
                      aria-label="Country"
                      placeholder="Country"
                      value={country}
                      onChange={(e) => setCountry(e.target.value)}
                    />
                  </div>
                </div>
              )}
            </>
          )}

          <input
            className={inputClass}
            type="email"
            required
            aria-label="Email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <input
            className={inputClass}
            type="password"
            required
            minLength={6}
            aria-label="Password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          {error && (
            <p role="alert" className="text-sm text-rose-600">
              {error}
            </p>
          )}
          {notice && <p className="text-sm text-emerald-600">{notice}</p>}

          <button
            type="submit"
            disabled={loading}
            className="mt-1 inline-flex h-11 items-center justify-center rounded-xl bg-zinc-900 px-6 text-sm font-semibold text-white shadow-sm transition-all hover:bg-zinc-800 active:scale-[0.98] disabled:opacity-60"
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
          className="mt-4 text-sm text-emerald-600 underline underline-offset-4 hover:text-emerald-900"
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
