"use client";

import { useEffect, useState } from "react";
import { Users, ChevronDown } from "lucide-react";

type Member = {
  id: string;
  full_name: string | null;
  role: string;
  title: string | null;
};

const ROLE_BADGE: Record<string, string> = {
  manager: "bg-emerald-100 text-emerald-700",
  admin: "bg-violet-100 text-violet-700",
  staff: "bg-stone-100 text-stone-600",
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
    <div className="mb-5 rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between text-left"
      >
        <span className="flex items-center gap-2 text-sm font-medium text-stone-900">
          <Users className="h-4 w-4 text-stone-400" aria-hidden />
          Your team ({members.length})
        </span>
        <ChevronDown
          aria-hidden
          className={`h-4 w-4 text-stone-400 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="mt-3">
          <p className="text-sm leading-6 text-stone-500">
            {canManage
              ? "Everyone at your centre. Promote a colleague to co-manager, or remove someone who has left."
              : `Everyone at your centre. ${managers} manager${managers === 1 ? "" : "s"} can manage the team and join code.`}
          </p>
          {error && <p className="mt-2 text-sm text-rose-700">{error}</p>}

          <ul className="mt-3 flex flex-col gap-2">
            {members.map((m) => {
              const isMe = m.id === me;
              const isManager = m.role === "manager";
              const name = m.full_name || "Unnamed";
              return (
                <li
                  key={m.id}
                  className="flex items-center gap-3 rounded-xl border border-stone-200 bg-white px-3 py-2.5"
                >
                  <span
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${
                      isManager
                        ? "bg-emerald-700 text-white"
                        : "bg-stone-200 text-stone-600"
                    }`}
                  >
                    {name.charAt(0).toUpperCase()}
                  </span>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="truncate text-sm font-medium text-stone-900">
                        {name}
                      </span>
                      {isMe && (
                        <span className="shrink-0 rounded-lg bg-stone-900 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
                          You
                        </span>
                      )}
                    </div>
                    <p className="truncate text-xs text-stone-500">
                      {m.title ||
                        m.role.charAt(0).toUpperCase() + m.role.slice(1)}
                    </p>
                  </div>

                  {!canManage && (
                    <span
                      className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold capitalize ${ROLE_BADGE[m.role] ?? "bg-stone-100 text-stone-600"}`}
                    >
                      {m.role}
                    </span>
                  )}

                  {canManage && (
                    <span className="flex shrink-0 gap-1.5">
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
          ? "border-rose-200 text-rose-700 hover:bg-rose-50"
          : "border-stone-200 text-stone-700 hover:bg-stone-50"
      }`}
    >
      {label}
    </button>
  );
}
