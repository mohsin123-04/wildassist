"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";

const CENTRE_ROLES = ["staff", "manager", "admin"];

/**
 * Header bell showing how many cases have arrived (in the staff member's
 * visible set, via RLS) since they last viewed the dashboard. Updates live
 * through Supabase Realtime.
 */
export default function NotificationBell({
  initialUser,
  initialShow = false,
}: {
  // Seeded from the server so the bell doesn't pop in after mount and shift the
  // account pill beside it.
  initialUser?: { id: string } | null;
  initialShow?: boolean;
} = {}) {
  const [user, setUser] = useState<User | null | undefined>(
    initialUser === undefined ? undefined : (initialUser as unknown as User | null)
  );
  const [show, setShow] = useState(initialShow);
  const [count, setCount] = useState(0);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => setUser(data.user ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) =>
      setUser(session?.user ?? null)
    );
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) {
      setShow(false);
      return;
    }
    const supabase = createClient();
    let active = true;

    async function refresh() {
      const { data: profile } = await supabase
        .from("profiles")
        .select("role, last_seen_cases")
        .eq("id", user!.id)
        .single();
      if (!active) return;
      if (!profile || !CENTRE_ROLES.includes(profile.role)) {
        setShow(false);
        return;
      }
      setShow(true);
      const { count: c } = await supabase
        .from("cases")
        .select("id", { count: "exact", head: true })
        .gt("created_at", profile.last_seen_cases ?? new Date(0).toISOString());
      if (active) setCount(c ?? 0);
    }

    refresh();

    // Live updates: any new case in the user's visible set bumps the count.
    const channel = supabase
      .channel("cases-activity")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "cases" },
        () => refresh()
      )
      .subscribe();

    // Reset when the dashboard marks cases as seen.
    const onSeen = () => setCount(0);
    window.addEventListener("cases-seen", onSeen);

    return () => {
      active = false;
      supabase.removeChannel(channel);
      window.removeEventListener("cases-seen", onSeen);
    };
  }, [user]);

  if (!show) return null;

  return (
    <Link
      href="/dashboard"
      aria-label={`${count} new cases`}
      className="relative flex h-9 w-9 items-center justify-center rounded-full border border-stone-200 bg-white text-stone-600 transition-colors hover:bg-emerald-50"
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-5 w-5"
        aria-hidden
      >
        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
        <path d="M13.73 21a2 2 0 0 1-3.46 0" />
      </svg>
      {count > 0 && (
        <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 px-1 text-xs font-semibold text-white">
          {count > 9 ? "9+" : count}
        </span>
      )}
    </Link>
  );
}
