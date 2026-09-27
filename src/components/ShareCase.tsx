"use client";

import { useEffect, useRef, useState } from "react";
import { flash } from "@/lib/flash";

type Conversation = { id: string; kind: string; label: string };

/** Lets a staff member share a case into one of their team conversations. */
export default function ShareCase({ caseId }: { caseId: string }) {
  const [open, setOpen] = useState(false);
  const [convs, setConvs] = useState<Conversation[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [sharedTo, setSharedTo] = useState<Set<string>>(new Set());
  const [busyId, setBusyId] = useState<string | null>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (closeTimer.current) clearTimeout(closeTimer.current);
    },
    []
  );

  async function toggle() {
    const next = !open;
    setOpen(next);
    if (next && !loaded) {
      const r = await fetch("/api/conversations");
      const d = await r.json();
      setConvs(d.conversations ?? []);
      setLoaded(true);
    }
  }

  async function share(conversationId: string, label: string) {
    setBusyId(conversationId);
    const r = await fetch("/api/share-case", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ caseId, conversationId }),
    });
    setBusyId(null);
    if (r.ok) {
      setSharedTo((s) => new Set(s).add(conversationId));
      flash(`Shared to ${label}`);
      // Briefly show the "Shared" state, then close the menu on its own.
      closeTimer.current = setTimeout(() => setOpen(false), 850);
    }
  }

  return (
    <div className="relative inline-block">
      <button
        onClick={toggle}
        className="inline-flex h-9 items-center justify-center rounded-xl border border-zinc-200 px-3 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50"
      >
        Share to team
      </button>
      {open && (
        <div className="absolute left-0 z-20 mt-2 w-60 overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-lg">
          <p className="border-b border-zinc-100 px-3 py-2 text-xs font-medium uppercase tracking-wide text-zinc-400">
            Share into
          </p>
          <div className="max-h-56 overflow-y-auto py-1">
            {convs.length === 0 ? (
              <p className="px-3 py-2 text-sm text-zinc-400">
                {loaded ? "No conversations." : "Loading…"}
              </p>
            ) : (
              convs.map((c) => {
                const done = sharedTo.has(c.id);
                return (
                  <button
                    key={c.id}
                    onClick={() => !done && share(c.id, c.label)}
                    disabled={busyId === c.id || done}
                    className="flex w-full items-center justify-between px-3 py-2 text-left text-sm text-zinc-700 transition-colors hover:bg-zinc-50 disabled:opacity-60"
                  >
                    <span className="truncate">
                      {c.kind === "channel" ? "# " : ""}
                      {c.label}
                    </span>
                    {done ? (
                      <span className="text-xs font-medium text-emerald-600">
                        Shared
                      </span>
                    ) : busyId === c.id ? (
                      <span className="text-xs text-zinc-400">…</span>
                    ) : null}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
