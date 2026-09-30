"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bird, Siren } from "lucide-react";
import AccountMenu, { type HeaderProfile } from "@/components/AccountMenu";
import NotificationBell from "@/components/NotificationBell";

// Routes whose top section is a dark hero, the header floats transparent over
// them at the top of the page, then turns solid once you scroll past the hero.
const DARK_HERO_ROUTES = new Set(["/"]);
const CENTRE_ROLES = ["staff", "manager", "admin"];

export default function SiteHeader({
  initialUser = null,
  initialProfile = null,
}: {
  initialUser?: { id: string; email: string | null } | null;
  initialProfile?: HeaderProfile | null;
}) {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 48);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const overDark = DARK_HERO_ROUTES.has(pathname) && !scrolled;

  return (
    <header
      className={`sticky top-0 z-30 transition-colors duration-300 ${
        overDark
          ? "border-b border-transparent bg-transparent"
          : "border-b border-black/5 bg-cream/80 backdrop-blur-xl"
      }`}
    >
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-5 py-3.5">
        <Link
          href="/"
          className={`group flex items-center gap-2.5 font-display text-lg font-medium tracking-tight transition-colors ${
            overDark ? "text-cream" : "text-stone-900"
          }`}
        >
          <span
            aria-hidden
            className={`flex h-8 w-8 items-center justify-center rounded-xl shadow-sm transition-colors ${
              overDark
                ? "bg-white/15 text-cream ring-1 ring-white/25 backdrop-blur"
                : "bg-emerald-700 text-white"
            }`}
          >
            <Bird className="h-4 w-4" />
          </span>
          <span>WildAssist</span>
        </Link>

        <div className="flex items-center gap-1.5">
          <Link
            href="/emergency"
            className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-semibold transition-colors ${
              overDark
                ? "border border-white/25 bg-white/10 text-white backdrop-blur hover:bg-white/20"
                : "border border-rose-200 bg-rose-50 text-rose-700 hover:border-rose-300 hover:bg-rose-100"
            }`}
          >
            <Siren className="h-4 w-4" aria-hidden />
            Emergency
          </Link>
          <NotificationBell
            initialUser={initialUser}
            initialShow={
              !!initialUser && CENTRE_ROLES.includes(initialProfile?.role ?? "")
            }
          />
          <AccountMenu
            light={overDark}
            initialUser={initialUser}
            initialProfile={initialProfile}
          />
        </div>
      </div>
    </header>
  );
}
