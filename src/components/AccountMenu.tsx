"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Download } from "lucide-react";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import Avatar from "@/components/Avatar";
import { useExportApi } from "@/lib/exportStore";

export type HeaderProfile = {
  full_name: string | null;
  role: string | null;
  avatar_url: string | null;
  avatar_color: string | null;
  centreName: string | null;
};

export default function AccountMenu({
  light = false,
  initialUser,
  initialProfile = null,
}: {
  light?: boolean;
  // Seeded from the server so the pill paints correct on first render (no
  // placeholder-to-pill jump). undefined = not provided, null = logged out.
  initialUser?: { id: string; email: string | null } | null;
  initialProfile?: HeaderProfile | null;
}) {
  // undefined = still checking, null = logged out, User = logged in
  const [user, setUser] = useState<User | null | undefined>(
    initialUser === undefined ? undefined : (initialUser as unknown as User | null)
  );
  const [displayName, setDisplayName] = useState<string | null>(
    initialProfile?.full_name ?? null
  );
  const [centreName, setCentreName] = useState<string | null>(
    initialProfile?.centreName ?? null
  );
  const [role, setRole] = useState<string | null>(initialProfile?.role ?? null);
  const [msgUnread, setMsgUnread] = useState(0);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(
    initialProfile?.avatar_url ?? null
  );
  const [avatarColor, setAvatarColor] = useState<string | null>(
    initialProfile?.avatar_color ?? null
  );
  // Whether the profile has resolved, so we can show a skeleton while it loads
  // instead of briefly exposing the raw email in the pill. Seeded true when the
  // server already provided the profile.
  const [profileLoaded, setProfileLoaded] = useState(!!initialProfile);
  const [reload, setReload] = useState(0);
  const [open, setOpen] = useState(false);
  // "export" = the nested CSV-export page of the menu (only reachable on the
  // dashboard, which publishes the export via the shared store).
  const [menuView, setMenuView] = useState<"main" | "export">("main");
  const exportApi = useExportApi();
  const menuRef = useRef<HTMLDivElement>(null);

  // Always reopen the menu on its main page.
  useEffect(() => {
    if (!open) setMenuView("main");
  }, [open]);

  useEffect(() => {
    const supabase = createClient();

    supabase.auth.getUser().then(({ data }) => setUser(data.user ?? null));

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (!session?.user) {
        setCentreName(null);
        setDisplayName(null);
        setAvatarUrl(null);
        setAvatarColor(null);
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
      .select("full_name, role, avatar_url, avatar_color, centres(name)")
      .eq("id", user.id)
      .single()
      .then(({ data }) => {
        setDisplayName(data?.full_name ?? null);
        setRole(data?.role ?? null);
        setAvatarUrl(data?.avatar_url ?? null);
        setAvatarColor(data?.avatar_color ?? null);
        const centres = data?.centres as
          | { name: string }
          | { name: string }[]
          | null;
        const name = Array.isArray(centres) ? centres[0]?.name : centres?.name;
        setCentreName(name ?? null);
        setProfileLoaded(true);
      });
  }, [user, reload]);

  // Unread message count for the Messages link.
  useEffect(() => {
    if (!user || !centreName) return;
    const supabase = createClient();
    let active = true;

    async function refreshUnread() {
      const r = await fetch("/api/conversations");
      if (!r.ok || !active) return;
      const d = await r.json();
      setMsgUnread(d.totalUnread ?? 0);
    }
    refreshUnread();

    const onRead = () => refreshUnread();
    window.addEventListener("messages-read", onRead);

    const channel = supabase
      .channel("account-msgs")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        (payload) => {
          const m = payload.new as { sender_id: string | null };
          if (m.sender_id !== user!.id) setMsgUnread((n) => n + 1);
        }
      )
      .subscribe();

    return () => {
      active = false;
      window.removeEventListener("messages-read", onRead);
      supabase.removeChannel(channel);
    };
  }, [user, centreName]);

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
    setOpen(false);
    await createClient().auth.signOut();
    // Hard navigation gives a clean slate: the header remounts already
    // signed-out instead of showing the account pill and flipping to "Staff
    // login" once the sign-out event propagates. Avoids the logout flicker.
    window.location.assign("/");
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
        className={
          light
            ? "whitespace-nowrap rounded-full border border-white/25 bg-white/10 px-3.5 py-1.5 text-sm font-medium text-white backdrop-blur transition-colors hover:bg-white/20"
            : "whitespace-nowrap rounded-full border border-emerald-200 bg-white px-3.5 py-1.5 text-sm font-medium text-emerald-800 transition-colors hover:bg-emerald-50"
        }
      >
        Staff login
      </Link>
    );
  }

  const email = user.email ?? "Account";
  // The pill never shows the raw email: the member's name if known, a skeleton
  // while the profile is still resolving, or a neutral fallback for the rare
  // account with no name set. (Email stays in the dropdown below.)
  const pillLabel = displayName || (profileLoaded ? "Account" : null);

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative flex items-center gap-2 rounded-full border border-stone-200 bg-white py-1 pl-1 pr-2.5 shadow-sm transition-colors hover:bg-emerald-50"
      >
        {msgUnread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-rose-500 ring-2 ring-white" />
        )}
        {displayName || profileLoaded ? (
          <Avatar
            url={avatarUrl}
            name={displayName}
            email={displayName ? null : email}
            color={avatarColor}
            size={28}
          />
        ) : (
          <span
            aria-hidden
            className="h-7 w-7 shrink-0 animate-pulse rounded-full bg-stone-200"
          />
        )}
        <span className="hidden max-w-[10rem] truncate text-sm font-medium text-emerald-950 sm:block">
          {pillLabel ?? (
            <span
              aria-hidden
              className="inline-block h-3 w-16 animate-pulse rounded bg-stone-200 align-middle"
            />
          )}
        </span>
        <span
          aria-hidden
          className={`text-base leading-none text-stone-500 transition-transform ${open ? "rotate-180" : ""}`}
        >
          ▾
        </span>
      </button>

      {open && (
        <div className="absolute right-0 z-30 mt-2 w-60 overflow-hidden rounded-xl border border-stone-200 bg-white shadow-lg">
          {menuView === "export" && exportApi ? (
            <>
              <button
                onClick={() => setMenuView("main")}
                className="flex w-full items-center gap-1 border-b border-stone-100 px-4 py-2.5 text-left text-sm font-medium text-stone-500 transition-colors hover:text-stone-800"
              >
                <span aria-hidden>‹</span> Back
              </button>
              <div className="p-2">
                <p className="px-2 pb-1 text-[0.7rem] font-semibold uppercase tracking-[0.1em] text-stone-400">
                  All or filtered
                </p>
                {(
                  [
                    ["all", "Everything", "Every case you can see"],
                    ["view", "Current view", "Matches your filters"],
                  ] as const
                ).map(([scope, label, desc]) => (
                  <ExportRow
                    key={scope}
                    label={label}
                    desc={desc}
                    count={exportApi.counts[scope]}
                    onClick={() => {
                      exportApi.run(scope);
                      setOpen(false);
                    }}
                  />
                ))}
                <p className="mt-2 border-t border-stone-100 px-2 pb-1 pt-2 text-[0.7rem] font-semibold uppercase tracking-[0.1em] text-stone-400">
                  By time period
                </p>
                {(
                  [
                    ["week", "This week", "Reported since Monday"],
                    ["month", "This month", "Reported this month"],
                    ["year", "This year", "Reported this year"],
                  ] as const
                ).map(([scope, label, desc]) => (
                  <ExportRow
                    key={scope}
                    label={label}
                    desc={desc}
                    count={exportApi.counts[scope]}
                    onClick={() => {
                      exportApi.run(scope);
                      setOpen(false);
                    }}
                  />
                ))}
              </div>
            </>
          ) : (
            <>
          <div className="border-b border-stone-100 px-4 py-3">
            <div className="flex items-center gap-2.5">
              <Avatar
                url={avatarUrl}
                name={displayName}
                email={email}
                color={avatarColor}
                size={36}
              />
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <p className="truncate text-sm font-medium text-emerald-950">
                    {displayName || email}
                  </p>
                  {role && role !== "staff" && (
                    <span
                      className={`shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-semibold capitalize ${
                        role === "admin"
                          ? "bg-violet-100 text-violet-700"
                          : role === "manager"
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-stone-100 text-stone-600"
                      }`}
                    >
                      {role}
                    </span>
                  )}
                </div>
                <p className="truncate text-xs text-stone-500">
                  {displayName ? email : (centreName ?? "No centre linked yet")}
                </p>
              </div>
            </div>
          </div>
          <Link
            href="/dashboard"
            onClick={() => setOpen(false)}
            className="block px-4 py-2.5 text-sm text-stone-700 transition-colors hover:bg-stone-50"
          >
            Dashboard
          </Link>
          {centreName && (
            <Link
              href="/messages"
              onClick={() => setOpen(false)}
              className="flex items-center justify-between px-4 py-2.5 text-sm text-stone-700 transition-colors hover:bg-stone-50"
            >
              Messages
              {msgUnread > 0 && (
                <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 px-1 text-xs font-semibold text-white">
                  {msgUnread > 9 ? "9+" : msgUnread}
                </span>
              )}
            </Link>
          )}
          {(centreName || role === "admin") && (
            <Link
              href="/analytics"
              onClick={() => setOpen(false)}
              className="block px-4 py-2.5 text-sm text-stone-700 transition-colors hover:bg-stone-50"
            >
              Analytics
            </Link>
          )}
          <Link
            href="/profile"
            onClick={() => setOpen(false)}
            className="block px-4 py-2.5 text-sm text-stone-700 transition-colors hover:bg-stone-50"
          >
            Profile
          </Link>
          {exportApi && (
            <button
              onClick={() => setMenuView("export")}
              className="flex w-full items-center justify-between px-4 py-2.5 text-sm text-stone-700 transition-colors hover:bg-stone-50"
            >
              <span className="inline-flex items-center gap-2">
                <Download className="h-4 w-4 text-stone-400" aria-hidden />
                Export cases
              </span>
              <span aria-hidden className="text-stone-400">
                ›
              </span>
            </button>
          )}
          <button
            onClick={signOut}
            className="block w-full px-4 py-2.5 text-left text-sm text-rose-700 transition-colors hover:bg-rose-50"
          >
            Sign out
          </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function ExportRow({
  label,
  desc,
  count,
  onClick,
}: {
  label: string;
  desc: string;
  count: number;
  onClick: () => void;
}) {
  const disabled = count === 0;
  return (
    <button
      disabled={disabled}
      onClick={onClick}
      className={`flex w-full items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-left transition-colors ${
        disabled ? "cursor-not-allowed opacity-40" : "hover:bg-stone-50"
      }`}
    >
      <span className="min-w-0">
        <span className="block text-sm text-stone-800">{label}</span>
        <span className="block text-xs text-stone-500">{desc}</span>
      </span>
      <span className="shrink-0 text-xs font-medium tabular-nums text-stone-400">
        {count}
      </span>
    </button>
  );
}
