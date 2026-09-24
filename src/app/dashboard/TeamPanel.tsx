"use client";

import { useEffect, useState } from "react";

type Member = {
  id: string;
  full_name: string | null;
  role: string;
  title: string | null;
};

const ROLE_BADGE: Record<string, string> = {
  manager: "bg-emerald-100 text-emerald-700",
  admin: "bg-violet-100 text-violet-700",
  staff: "bg-zinc-100 text-zinc-600",
};

export default function TeamPanel() {
  const [members, setMembers] = useState<Member[]>([]);
  const [me, setMe] = useState<string | null>(null);
  const [canManage, setCanManage] = useState(false);
  const [open, setOpen] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const r = await fetch("/api/team");
    const d = await r.json();
    if (Array.isArray(d.members)) setMembers(d.members);
    setMe(d.me ?? null);
    setCanManage(!!d.canManage);
  }

  useEffect(() => {
    load();
  }, []);

  async function act(targetId: string, action: "promote" | "demote" | "remove") {
    setBusyId(targetId);
    setError(null);
    const r = await fetch("/api/team", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ targetId, action }),
    });
    const d = await r.json();
    setBusyId(null);
    if (!r.ok) {
      setError(d.error ?? "Action failed");
      return;
    }
    await load();
  }

  const managers = members.filter((m) => m.role === "manager").length;

  return (
    <div className="mb-5 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between text-left"
      >
        <span className="text-sm font-medium text-zinc-900">
          Your team ({members.length})
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
          <p className="text-sm leading-6 text-zinc-500">
            {canManage
              ? "Everyone at your centre. Promote a colleague to co-manager, or remove someone who has left."
              : `Everyone at your centre. ${managers} manager${managers === 1 ? "" : "s"} can manage the team and join code.`}
          </p>
          {error && <p className="mt-2 text-sm text-rose-600">{error}</p>}

          <ul className="mt-3 flex flex-col gap-2">
            {members.map((m) => {
              const isMe = m.id === me;
              const isManager = m.role === "manager";
              return (
                <li
                  key={m.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2"
                >
                  <span className="flex items-center gap-2 text-sm">
                    <span className="font-medium text-zinc-900">
                      {m.full_name || "Unnamed"}
                    </span>
                    {m.title && (
                      <span className="text-xs text-zinc-400">{m.title}</span>
                    )}
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-semibold ${ROLE_BADGE[m.role] ?? "bg-zinc-100 text-zinc-600"}`}
                    >
                      {m.role}
                    </span>
                    {isMe && <span className="text-xs text-zinc-400">you</span>}
                  </span>

                  {canManage && (
                    <span className="flex gap-2">
                      {isManager ? (
                        <ActionBtn
                          onClick={() => act(m.id, "demote")}
                          disabled={busyId === m.id}
                          label="Make staff"
                        />
                      ) : (
                        <ActionBtn
                          onClick={() => act(m.id, "promote")}
                          disabled={busyId === m.id}
                          label="Make manager"
                        />
                      )}
                      {!isMe && (
                        <ActionBtn
                          onClick={() => act(m.id, "remove")}
                          disabled={busyId === m.id}
                          label="Remove"
                          danger
                        />
                      )}
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}

function ActionBtn({
  onClick,
  disabled,
  label,
  danger,
}: {
  onClick: () => void;
  disabled: boolean;
  label: string;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors disabled:opacity-50 ${
        danger
          ? "border-rose-200 text-rose-600 hover:bg-rose-50"
          : "border-zinc-200 text-zinc-700 hover:bg-zinc-50"
      }`}
    >
      {label}
    </button>
  );
}
