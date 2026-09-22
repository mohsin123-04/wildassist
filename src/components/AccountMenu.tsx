"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";

export default function AccountMenu() {
  const router = useRouter();
  // undefined = still checking, null = logged out, User = logged in
  const [user, setUser] = useState<User | null | undefined>(undefined);
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [centreName, setCentreName] = useState<string | null>(null);
  const [reload, setReload] = useState(0);
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const supabase = createClient();

    supabase.auth.getUser().then(({ data }) => setUser(data.user ?? null));

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (!session?.user) {
        setCentreName(null);
        setDisplayName(null);
      }
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  // Refresh the menu's display when the profile page saves changes.
  useEffect(() => {
    function bump() {
      setReload((n) => n + 1);
    }
    window.addEventListener("profile-updated", bump);
    return () => window.removeEventListener("profile-updated", bump);
  }, []);

  // Load the display name and linked centre for the menu.
  useEffect(() => {
    if (!user) return;
    const supabase = createClient();
    supabase
      .from("profiles")
      .select("full_name, centres(name)")
      .eq("id", user.id)
      .single()
      .then(({ data }) => {
        setDisplayName(data?.full_name ?? null);
        const centres = data?.centres as
          | { name: string }
          | { name: string }[]
          | null;
        const name = Array.isArray(centres) ? centres[0]?.name : centres?.name;
        setCentreName(name ?? null);
      });
  }, [user, reload]);

  // Close the dropdown on outside click.
  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  async function signOut() {
    await createClient().auth.signOut();
    setOpen(false);
    router.push("/");
    router.refresh();
  }

  // Still checking: reserve space to avoid layout shift.
  if (user === undefined) {
    return <div className="h-8 w-8" aria-hidden />;
  }

  // Logged out.
  if (user === null) {
    return (
      <Link
        href="/login"
        className="rounded-full border border-emerald-200 bg-white px-3.5 py-1.5 text-sm font-medium text-emerald-800 transition-colors hover:bg-emerald-50"
      >
        Staff login
      </Link>
    );
  }

  const email = user.email ?? "Account";
  const label = displayName || email;
  const initial = label.charAt(0).toUpperCase();

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 rounded-full border border-black/5 bg-white py-1 pl-1 pr-2.5 shadow-sm transition-colors hover:bg-emerald-50"
      >
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-600 text-sm font-semibold text-white">
          {initial}
        </span>
        <span className="hidden max-w-[10rem] truncate text-sm font-medium text-emerald-950 sm:block">
          {label}
        </span>
        <span
          aria-hidden
          className={`text-xs text-zinc-400 transition-transform ${open ? "rotate-180" : ""}`}
        >
          ▾
        </span>
      </button>

      {open && (
        <div className="absolute right-0 z-30 mt-2 w-60 overflow-hidden rounded-2xl border border-black/10 bg-white shadow-lg">
          <div className="border-b border-black/5 px-4 py-3">
            <div className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-600 text-base font-semibold text-white">
                {initial}
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-emerald-950">
                  {label}
                </p>
                <p className="truncate text-xs text-zinc-500">
                  {displayName ? email : (centreName ?? "No centre linked yet")}
                </p>
              </div>
            </div>
          </div>
          <Link
            href="/dashboard"
            onClick={() => setOpen(false)}
            className="block px-4 py-2.5 text-sm text-zinc-700 transition-colors hover:bg-zinc-50"
          >
            Dashboard
          </Link>
          <Link
            href="/profile"
            onClick={() => setOpen(false)}
            className="block px-4 py-2.5 text-sm text-zinc-700 transition-colors hover:bg-zinc-50"
          >
            Profile
          </Link>
          <button
            onClick={signOut}
            className="block w-full px-4 py-2.5 text-left text-sm text-rose-600 transition-colors hover:bg-rose-50"
          >
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}
