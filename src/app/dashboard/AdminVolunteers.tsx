"use client";

import { useEffect, useState } from "react";
import { HeartHandshake, ChevronDown } from "lucide-react";
import { flash } from "@/lib/flash";

type Vol = {
  id: string;
  full_name: string | null;
  volunteer_approved: boolean;
  created_at: string;
  phone: string | null;
  city: string | null;
  province: string | null;
  country: string | null;
};

export default function AdminVolunteers() {
  const [vols, setVols] = useState<Vol[]>([]);
  const [open, setOpen] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function load() {
    const r = await fetch("/api/admin/volunteers");
    const d = await r.json();
    if (Array.isArray(d.volunteers)) {
      // Pending approvals first (the only actionable rows), then by name.
      const sorted = [...d.volunteers].sort((a: Vol, b: Vol) => {
        if (a.volunteer_approved !== b.volunteer_approved) {
          return a.volunteer_approved ? 1 : -1;
        }
        return (a.full_name ?? "").localeCompare(b.full_name ?? "");
      });
      setVols(sorted);
    }
  }
  useEffect(() => {
    load();
  }, []);

  async function setApproved(userId: string, approved: boolean) {
    setBusyId(userId);
    try {
      const r = await fetch("/api/admin/volunteers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, approved }),
      });
      if (!r.ok) {
        const d = await r.json().catch(() => ({}));
        flash(d.error ?? "Couldn't update the volunteer.");
      } else {
        flash(approved ? "Volunteer approved" : "Volunteer access revoked");
      }
    } finally {
      setBusyId(null);
      load();
    }
  }

  const pending = vols.filter((v) => !v.volunteer_approved).length;

  return (
    <div className="mb-5 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between text-left"
      >
        <span className="flex items-center gap-2 text-sm font-medium text-zinc-900">
          <HeartHandshake className="h-4 w-4 text-zinc-400" aria-hidden />
          Volunteers ({vols.length})
          {pending > 0 && (
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700">
              {pending} pending
            </span>
          )}
        </span>
        <ChevronDown
          aria-hidden
          className={`h-4 w-4 text-zinc-400 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="mt-3">
          <p className="mb-3 text-sm leading-6 text-zinc-600">
            Approve volunteers before they can see and claim transport jobs. This
            protects finders&apos; contact details and animal locations.
          </p>
          {vols.length === 0 ? (
            <p className="text-sm text-zinc-500">No volunteers yet.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {vols.map((v) => {
                const location = [v.city, v.province, v.country]
                  .filter(Boolean)
                  .join(", ");
                return (
                <li
                  key={v.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2"
                >
                  <span className="min-w-0 text-sm">
                    <span className="flex items-center gap-2">
                      <span className="font-medium text-zinc-900">
                        {v.full_name || "Unnamed volunteer"}
                      </span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                          v.volunteer_approved
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-amber-100 text-amber-700"
                        }`}
                      >
                        {v.volunteer_approved ? "approved" : "pending"}
                      </span>
                    </span>
                    {(v.phone || location) && (
                      <span className="mt-0.5 block text-xs text-zinc-500">
                        {v.phone && (
                          <a
                            href={`tel:${v.phone.replace(/[^0-9+]/g, "")}`}
                            className="font-medium text-emerald-700 underline underline-offset-2"
                          >
                            {v.phone}
                          </a>
                        )}
                        {v.phone && location && " · "}
                        {location}
                      </span>
                    )}
                  </span>
                  {v.volunteer_approved ? (
                    <button
                      onClick={() => setApproved(v.id, false)}
                      disabled={busyId === v.id}
                      className="rounded-full border border-zinc-200 px-3 py-1 text-xs font-medium text-zinc-600 transition-colors hover:bg-white disabled:opacity-50"
                    >
                      Revoke
                    </button>
                  ) : (
                    <button
                      onClick={() => setApproved(v.id, true)}
                      disabled={busyId === v.id}
                      className="rounded-full bg-zinc-900 px-3 py-1 text-xs font-semibold text-white transition-colors hover:bg-zinc-800 disabled:opacity-50"
                    >
                      Approve
                    </button>
                  )}
                </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
