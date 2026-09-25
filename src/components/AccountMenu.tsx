"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { flash } from "@/lib/flash";
import Avatar from "@/components/Avatar";

export default function AccountMenu() {
  const router = useRouter();
  // undefined = still checking, null = logged out, User = logged in
  const [user, setUser] = useState<User | null | undefined>(undefined);
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [centreName, setCentreName] = useState<string | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [msgUnread, setMsgUnread] = useState(0);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarColor, setAvatarColor] = useState<string | null>(null);
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
    await createClient().auth.signOut();
    setOpen(false);
    flash("You've been signed out");
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

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative flex items-center gap-2 rounded-full border border-black/5 bg-white py-1 pl-1 pr-2.5 shadow-sm transition-colors hover:bg-emerald-50"
      >
        {msgUnread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-rose-500 ring-2 ring-white" />
        )}
        <Avatar
          url={avatarUrl}
          name={displayName}
          email={email}
          color={avatarColor}
          size={28}
        />
        <span className="hidden max-w-[10rem] truncate text-sm font-medium text-emerald-950 sm:block">
          {label}
        </span>
        <span
          aria-hidden
          className={`text-base leading-none text-zinc-500 transition-transform ${open ? "rotate-180" : ""}`}
        >
          ▾
        </span>
      </button>

      {open && (
        <div className="absolute right-0 z-30 mt-2 w-60 overflow-hidden rounded-2xl border border-black/10 bg-white shadow-lg">
          <div className="border-b border-black/5 px-4 py-3">
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
                    {label}
                  </p>
                  {role && role !== "staff" && (
                    <span
                      className={`shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-semibold capitalize ${
                        role === "admin"
                          ? "bg-violet-100 text-violet-700"
                          : role === "manager"
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-zinc-100 text-zinc-600"
                      }`}
                    >
                      {role}
                    </span>
                  )}
                </div>
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
          {centreName && (
            <Link
              href="/messages"
              onClick={() => setOpen(false)}
              className="flex items-center justify-between px-4 py-2.5 text-sm text-zinc-700 transition-colors hover:bg-zinc-50"
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
              className="block px-4 py-2.5 text-sm text-zinc-700 transition-colors hover:bg-zinc-50"
            >
              Analytics
            </Link>
          )}
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
