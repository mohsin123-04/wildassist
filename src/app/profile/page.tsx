import { redirect } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Building2,
  CalendarDays,
  Mail,
  Phone,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import Avatar from "@/components/Avatar";
import ProfileForm from "./ProfileForm";
import AppearanceSection from "./AppearanceSection";
import SecuritySection from "./SecuritySection";
import DangerSection from "./DangerSection";

export const dynamic = "force-dynamic";

const SECTIONS = [
  { id: "profile", label: "Profile" },
  { id: "appearance", label: "Appearance" },
  { id: "security", label: "Security" },
  { id: "danger", label: "Danger zone", danger: true },
];

export default async function ProfilePage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, title, phone, bio, role, centre_id, avatar_url, avatar_color")
    .eq("id", user.id)
    .single();

  const { data: centres } = await supabase
    .from("centres")
    .select("id, name, town")
    .order("name");

  const centreName =
    centres?.find((c) => c.id === profile?.centre_id)?.name ?? null;

  const isVolunteer = profile?.role === "volunteer";
  const backHref = isVolunteer ? "/transport" : "/dashboard";
  const backLabel = isVolunteer ? "Transport" : "Dashboard";

  // Server-rendered once (RSC), so a fixed locale keeps it deterministic.
  const joined = user.created_at
    ? new Date(user.created_at).toLocaleDateString("en-US", {
        month: "long",
        year: "numeric",
      })
    : null;

  return (
    <main className="animate-in mx-auto w-full max-w-4xl flex-1 px-5 py-8">
      <Link
        href={backHref}
        className="inline-flex w-fit items-center gap-1 text-sm font-medium text-zinc-500 transition-colors hover:text-zinc-900"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden /> {backLabel}
      </Link>

      {/* Identity header: banner band + overlapping avatar + meta */}
      <div className="mt-4 overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
        <div className="h-24 bg-emerald-700 sm:h-28" aria-hidden />
        <div className="px-5 pb-5 sm:px-8 sm:pb-6">
          <div className="-mt-11 flex items-end justify-between gap-4 sm:-mt-12">
            <div className="h-fit w-fit shrink-0 rounded-full bg-white ring-4 ring-white">
              <Avatar
                url={profile?.avatar_url}
                name={profile?.full_name}
                email={user.email}
                color={profile?.avatar_color}
                size={88}
              />
            </div>
            <span className="mb-1 shrink-0 rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold capitalize text-emerald-800">
              {profile?.role ?? "staff"}
            </span>
          </div>

          <div className="mt-3 min-w-0">
            <h1 className="truncate font-display text-2xl font-semibold tracking-tight text-zinc-900">
              {profile?.full_name || "Your profile"}
            </h1>
            <p className="truncate text-sm text-zinc-600">
              {[profile?.title, centreName].filter(Boolean).join(" · ") ||
                (isVolunteer ? "Rescue volunteer" : "Wildlife centre staff")}
            </p>
          </div>

          <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm text-zinc-600">
            {user.email && (
              <span className="inline-flex min-w-0 items-center gap-1.5">
                <Mail className="h-4 w-4 shrink-0 text-zinc-400" aria-hidden />
                <span className="truncate">{user.email}</span>
              </span>
            )}
            {profile?.phone && (
              <span className="inline-flex items-center gap-1.5">
                <Phone className="h-4 w-4 shrink-0 text-zinc-400" aria-hidden />
                {profile.phone}
              </span>
            )}
            {centreName && (
              <span className="inline-flex items-center gap-1.5">
                <Building2 className="h-4 w-4 shrink-0 text-zinc-400" aria-hidden />
                {centreName}
              </span>
            )}
            {joined && (
              <span className="inline-flex items-center gap-1.5">
                <CalendarDays className="h-4 w-4 shrink-0 text-zinc-400" aria-hidden />
                Joined {joined}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Section nav (sidebar on desktop, horizontal pills on mobile) + content */}
      <div className="mt-6 flex flex-col gap-6 lg:flex-row lg:items-start">
        <nav
          aria-label="Profile sections"
          className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-1 lg:sticky lg:top-20 lg:w-44 lg:shrink-0 lg:flex-col lg:pb-0"
        >
          {SECTIONS.map((s) => (
            <a
              key={s.id}
              href={`#${s.id}`}
              className={`whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                s.danger
                  ? "text-rose-700 hover:bg-rose-50"
                  : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
              }`}
            >
              {s.label}
            </a>
          ))}
        </nav>

        <div className="flex min-w-0 flex-1 flex-col gap-5">
          <div id="profile" className="scroll-mt-24">
            <ProfileForm
              initialName={profile?.full_name ?? ""}
              initialTitle={profile?.title ?? ""}
              initialPhone={profile?.phone ?? ""}
              initialBio={profile?.bio ?? ""}
            />
          </div>
          <div id="appearance" className="scroll-mt-24">
            <AppearanceSection
              initialUrl={profile?.avatar_url ?? null}
              initialColor={profile?.avatar_color ?? null}
              name={profile?.full_name}
              email={user.email}
            />
          </div>
          <div id="security" className="scroll-mt-24">
            <SecuritySection email={user.email ?? ""} />
          </div>
          <div id="danger" className="scroll-mt-24">
            <DangerSection />
          </div>
        </div>
      </div>
    </main>
  );
}
