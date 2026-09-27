"use client";

import { useEffect, useRef, useState } from "react";
import { flash } from "@/lib/flash";

type Conversation = { id: string; kind: string; label: string };

/** Lets a staff member share a case into one of their team conversations. */
export default function ShareCase({ caseId }: { caseId: string }) {
  const [open, setOpen] = useState(false);
  const [convs, setConvs] = useState<Conversation[]>([]);
  const [loaded, setLoaded] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close on click outside or Escape.
  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

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

  function share(conversationId: string, label: string) {
    // Close instantly for a snappy feel; the toast confirms the result.
    setOpen(false);
    fetch("/api/share-case", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ caseId, conversationId }),
    })
      .then((r) =>
        flash(r.ok ? `Shared to ${label}` : "Couldn't share. Please try again.")
      )
      .catch(() => flash("Couldn't share. Please try again."));
  }

  return (
    <div className="relative inline-block" ref={menuRef}>
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
              convs.map((c) => (
                <button
                  key={c.id}
                  onClick={() => share(c.id, c.label)}
                  className="flex w-full items-center px-3 py-2 text-left text-sm text-zinc-700 transition-colors hover:bg-zinc-50"
                >
                  <span className="truncate">
                    {c.kind === "channel" ? "# " : ""}
                    {c.label}
                  </span>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
