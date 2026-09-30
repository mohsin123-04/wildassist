"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Note = {
  id: string;
  author_name: string | null;
  body: string;
  created_at: string;
};

function when(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

/**
 * A running, append-only log of staff notes on a case (who wrote what, when),
 * loaded lazily when the case is expanded. Replaces the single overwrite-able
 * textarea so context accumulates instead of getting clobbered.
 */
export default function CaseNotes({
  caseId,
  myId,
  myName,
  legacyNote,
}: {
  caseId: string;
  myId: string;
  myName: string;
  legacyNote?: string | null;
}) {
  const [notes, setNotes] = useState<Note[] | null>(null);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    createClient()
      .from("case_notes")
      .select("id, author_name, body, created_at")
      .eq("case_id", caseId)
      .order("created_at", { ascending: true })
      .then(({ data }) => {
        if (active) setNotes((data ?? []) as Note[]);
      });
    return () => {
      active = false;
    };
  }, [caseId]);

  async function add() {
    const body = draft.trim();
    if (!body || saving) return;
    setSaving(true);
    const { data } = await createClient()
      .from("case_notes")
      .insert({ case_id: caseId, author_id: myId, author_name: myName, body })
      .select("id, author_name, body, created_at")
      .single();
    setSaving(false);
    if (data) {
      setNotes((n) => [...(n ?? []), data as Note]);
      setDraft("");
    }
  }

  return (
    <div className="mt-4 border-t border-stone-100 pt-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">
        Notes
      </p>

      <div className="mt-2 flex flex-col gap-2">
        {legacyNote && (
          <div className="rounded-xl bg-stone-50 p-2.5 text-sm text-stone-700">
            <p className="text-[11px] font-medium text-stone-500">Earlier note</p>
            <p className="mt-0.5 whitespace-pre-wrap leading-6">{legacyNote}</p>
          </div>
        )}
        {notes === null ? (
          <p className="text-sm text-stone-500">Loading…</p>
        ) : notes.length === 0 && !legacyNote ? (
          <p className="text-sm text-stone-500">No notes yet.</p>
        ) : (
          notes.map((n) => (
            <div key={n.id} className="rounded-xl bg-stone-50 p-2.5 text-sm text-stone-700">
              <p className="text-[11px] font-medium text-stone-500">
                {n.author_name || "A teammate"}
                <span className="text-stone-500"> · {when(n.created_at)}</span>
              </p>
              <p className="mt-0.5 whitespace-pre-wrap leading-6">{n.body}</p>
            </div>
          ))
        )}
      </div>

      <textarea
        rows={2}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        aria-label="Add a note"
        placeholder="Add a note (e.g. volunteer driver assigned, ETA 3pm)."
        className="mt-2 w-full resize-none rounded-xl border border-stone-200 bg-white p-3 text-sm outline-none transition-colors focus:border-stone-400 focus:ring-4 focus:ring-stone-900/5"
      />
      <button
        onClick={add}
        disabled={saving || !draft.trim()}
        className="mt-2 inline-flex h-9 items-center justify-center rounded-xl bg-stone-900 px-4 text-sm font-medium text-white transition-colors hover:bg-stone-800 disabled:opacity-50"
      >
        {saving ? "Adding…" : "Add note"}
      </button>
    </div>
  );
}
