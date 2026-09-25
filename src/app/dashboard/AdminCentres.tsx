"use client";

import { useEffect, useState } from "react";
import Spinner from "@/components/Spinner";
import { FACILITY_TYPES, type FacilityType } from "@/lib/centres";

type CentreRow = {
  id: string;
  name: string;
  town: string;
  manager_email: string | null;
  code: string | null;
};

const SPECIES = ["bird", "mammal", "reptile", "amphibian", "fish"] as const;

const inputClass =
  "h-11 w-full rounded-xl border border-zinc-200 bg-white px-4 outline-none transition-colors focus:border-zinc-400 focus:ring-4 focus:ring-zinc-900/5";

export default function AdminCentres() {
  const [centres, setCentres] = useState<CentreRow[]>([]);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [takes, setTakes] = useState<string[]>(["bird", "mammal", "reptile"]);
  const [phone, setPhone] = useState("");
  const [website, setWebsite] = useState("");
  const [managerEmail, setManagerEmail] = useState("");
  const [type, setType] = useState<FacilityType>("rehab_centre");
  const [directoryOnly, setDirectoryOnly] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<{
    name: string;
    code: string | null;
  } | null>(null);

  async function load() {
    const r = await fetch("/api/admin/centres");
    const d = await r.json();
    if (Array.isArray(d.centres)) setCentres(d.centres);
  }
  useEffect(() => {
    load();
  }, []);

  function toggleSpecies(s: string) {
    setTakes((t) => (t.includes(s) ? t.filter((x) => x !== s) : [...t, s]));
  }

  async function submit() {
    setBusy(true);
    setError(null);
    setCreated(null);
    const r = await fetch("/api/admin/create-centre", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        address,
        takes,
        phone,
        website,
        managerEmail,
        type,
        directoryOnly,
      }),
    });
    const d = await r.json();
    setBusy(false);
    if (!r.ok) {
      setError(d.error ?? "Could not create centre");
      return;
    }
    setCreated({ name: d.name, code: d.code });
    setName("");
    setAddress("");
    setPhone("");
    setWebsite("");
    setManagerEmail("");
    load();
  }

  return (
    <div className="mb-5 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between text-left"
      >
        <span className="text-sm font-medium text-zinc-900">
          Centres ({centres.length})
        </span>
        <span
          aria-hidden
          className={`text-xl leading-none text-zinc-500 transition-transform ${open ? "rotate-180" : ""}`}
        >
          ▾
        </span>
      </button>

      {open && (
        <div className="mt-4 flex flex-col gap-5">
          {/* Add form */}
          <div>
            <p className="mb-2 text-sm font-medium text-zinc-700">Add a centre</p>
            <div className="flex flex-col gap-3">
              <input
                className={inputClass}
                placeholder="Centre name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
              <input
                className={inputClass}
                placeholder="Address (street, city, province)"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
              />
              <div className="grid gap-3 sm:grid-cols-2">
                <select
                  className={inputClass + " px-3"}
                  value={type}
                  onChange={(e) => setType(e.target.value as FacilityType)}
                >
                  {Object.entries(FACILITY_TYPES).map(([v, label]) => (
                    <option key={v} value={v}>
                      {label}
                    </option>
                  ))}
                </select>
                <label className="flex h-11 items-center gap-2 rounded-xl border border-zinc-200 bg-white px-4 text-sm text-zinc-700">
                  <input
                    type="checkbox"
                    checked={directoryOnly}
                    onChange={(e) => setDirectoryOnly(e.target.checked)}
                    className="h-4 w-4 accent-emerald-600"
                  />
                  Directory listing only
                </label>
              </div>
              {directoryOnly && (
                <p className="text-xs text-zinc-500">
                  A directory listing has no staff accounts or dashboard. It is
                  shown to finders as a nearby contact and does not receive cases.
                </p>
              )}
              <div className="flex flex-wrap gap-2">
                {SPECIES.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => toggleSpecies(s)}
                    className={`rounded-full border px-3 py-1.5 text-sm font-medium capitalize transition-colors ${
                      takes.includes(s)
                        ? "border-emerald-500 bg-emerald-50 text-emerald-800"
                        : "border-zinc-200 bg-white text-zinc-500"
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <input
                  className={inputClass}
                  placeholder="Phone (optional)"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
                <input
                  className={inputClass}
                  placeholder="Website (optional)"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                />
              </div>
              <input
                className={inputClass}
                type="email"
                placeholder="Manager's email (they become manager on signup)"
                value={managerEmail}
                onChange={(e) => setManagerEmail(e.target.value)}
              />

              {error && <p className="text-sm text-rose-600">{error}</p>}
              {created && (
                <p className="rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
                  Created <span className="font-semibold">{created.name}</span>.
                  {created.code ? (
                    <>
                      {" "}
                      Join code:{" "}
                      <span className="font-mono font-semibold">
                        {created.code}
                      </span>
                    </>
                  ) : (
                    " Added as a directory listing."
                  )}
                </p>
              )}

              <button
                onClick={submit}
                disabled={busy || !name.trim() || !address.trim()}
                className="inline-flex h-11 w-fit items-center justify-center rounded-xl bg-zinc-900 px-6 font-medium text-white shadow-sm transition-colors hover:bg-zinc-800 disabled:opacity-50"
              >
                {busy ? <Spinner label="Creating…" /> : "Create centre"}
              </button>
            </div>
          </div>

          {/* Existing centres */}
          <div>
            <p className="mb-2 text-sm font-medium text-zinc-700">All centres</p>
            <ul className="flex flex-col gap-2">
              {centres.map((c) => (
                <li
                  key={c.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-zinc-200 bg-[var(--background)] px-3 py-2 text-sm"
                >
                  <span>
                    <span className="font-medium text-zinc-900">{c.name}</span>
                    <span className="text-zinc-500"> · {c.town}</span>
                    {c.manager_email && (
                      <span className="text-zinc-400"> · mgr {c.manager_email}</span>
                    )}
                  </span>
                  {c.code && (
                    <span className="rounded-md bg-emerald-100 px-2 py-0.5 font-mono text-xs font-semibold text-emerald-800">
                      {c.code}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
