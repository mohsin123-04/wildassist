"use client";

import { useEffect, useState } from "react";

export default function CentreCodePanel() {
  const [code, setCode] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    fetch("/api/centre-code")
      .then((r) => r.json())
      .then((d) => setCode(d.code ?? null))
      .catch(() => {});
  }, []);

  async function regenerate() {
    setBusy(true);
    const res = await fetch("/api/centre-code", { method: "POST" });
    const d = await res.json();
    setBusy(false);
    setConfirming(false);
    if (d.code) setCode(d.code);
  }

  function copy() {
    if (!code) return;
    navigator.clipboard?.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="mb-5 rounded-2xl border border-black/5 bg-white p-4 shadow-sm">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between text-left"
      >
        <span className="text-sm font-medium text-emerald-950">
          Invite staff to your centre
        </span>
        <span
          aria-hidden
          className={`text-xl leading-none text-zinc-500 transition-transform ${open ? "rotate-180" : ""}`}
        >
          ▾
        </span>
      </button>

      {open && (
        <div className="mt-3">
          <p className="text-sm leading-6 text-zinc-600">
            Share this join code with colleagues at your centre. They enter it
            when they sign up as staff.
          </p>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <code className="rounded-lg bg-emerald-50 px-3 py-2 font-mono text-lg font-semibold tracking-wider text-emerald-800">
              {code ?? "…"}
            </code>
            <button
              onClick={copy}
              disabled={!code}
              className="inline-flex h-9 items-center justify-center rounded-full border border-black/10 px-4 text-sm font-medium text-zinc-700 transition-colors hover:bg-black/5 disabled:opacity-50"
            >
              {copied ? "Copied" : "Copy"}
            </button>
          </div>

          <div className="mt-3">
            {!confirming ? (
              <button
                onClick={() => setConfirming(true)}
                className="text-sm font-medium text-zinc-500 underline underline-offset-2 hover:text-zinc-800"
              >
                Regenerate code
              </button>
            ) : (
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <span className="text-zinc-600">
                  This invalidates the old code. Continue?
                </span>
                <button
                  onClick={regenerate}
                  disabled={busy}
                  className="inline-flex h-8 items-center justify-center rounded-full bg-rose-600 px-4 font-medium text-white transition-colors hover:bg-rose-700 disabled:opacity-50"
                >
                  {busy ? "Working…" : "Regenerate"}
                </button>
                <button
                  onClick={() => setConfirming(false)}
                  className="text-zinc-500 hover:text-zinc-800"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
