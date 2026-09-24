"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Member = { id: string; full_name: string | null; role: string };
type Conversation = { id: string; kind: string; label: string; unread?: number };
type Message = {
  id: string;
  conversation_id: string;
  sender_id: string | null;
  sender_name: string | null;
  body: string;
  created_at: string;
};

export default function MessagesClient({
  myId,
  myName,
}: {
  myId: string;
  myName: string;
}) {
  const supabase = createClient();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [body, setBody] = useState("");
  const [composer, setComposer] = useState<null | "menu" | "group">(null);
  const [creating, setCreating] = useState(false);
  const [unread, setUnread] = useState<Record<string, number>>({});
  const bottomRef = useRef<HTMLDivElement>(null);
  const selectedRef = useRef<string | null>(null);
  selectedRef.current = selected;
  const convIdsRef = useRef<string[]>([]);

  async function markRead(convId: string) {
    setUnread((u) => ({ ...u, [convId]: 0 }));
    await supabase.from("conversation_reads").upsert(
      {
        conversation_id: convId,
        user_id: myId,
        last_read: new Date().toISOString(),
      },
      { onConflict: "conversation_id,user_id" }
    );
    // Keep the header's unread badge in sync.
    window.dispatchEvent(new Event("messages-read"));
  }

  async function loadConversations(pick?: string) {
    const r = await fetch("/api/conversations");
    const d = await r.json();
    const convs: Conversation[] = d.conversations ?? [];
    setConversations(convs);
    setMembers(d.members ?? []);
    convIdsRef.current = convs.map((c) => c.id);
    setUnread(Object.fromEntries(convs.map((c) => [c.id, c.unread ?? 0])));
    setSelected((cur) => pick ?? cur ?? convs[0]?.id ?? null);
  }

  useEffect(() => {
    loadConversations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!selected) return;
    supabase
      .from("messages")
      .select("id, conversation_id, sender_id, sender_name, body, created_at")
      .eq("conversation_id", selected)
      .order("created_at", { ascending: true })
      .then(({ data }) => setMessages((data ?? []) as Message[]));
    markRead(selected);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected]);

  // Realtime: RLS only delivers messages in conversations I can access.
  useEffect(() => {
    const channel = supabase
      .channel("messages")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        (payload) => {
          const m = payload.new as Message;
          if (m.conversation_id === selectedRef.current) {
            setMessages((prev) =>
              prev.some((x) => x.id === m.id) ? prev : [...prev, m]
            );
            if (m.sender_id !== myId) markRead(m.conversation_id);
          } else if (m.sender_id !== myId) {
            // A new message in another conversation: bump its unread badge.
            if (!convIdsRef.current.includes(m.conversation_id)) {
              loadConversations(); // a new DM/group someone started with me
            } else {
              setUnread((u) => ({
                ...u,
                [m.conversation_id]: (u[m.conversation_id] ?? 0) + 1,
              }));
            }
          }
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function send() {
    const text = body.trim();
    if (!text || !selected) return;
    setBody("");
    await supabase.from("messages").insert({
      conversation_id: selected,
      sender_id: myId,
      sender_name: myName,
      body: text,
    });
  }

  async function startDm(memberId: string) {
    if (creating) return;
    setCreating(true);
    setComposer(null);
    try {
      const r = await fetch("/api/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dmWith: memberId }),
      });
      const d = await r.json();
      if (d.id) await loadConversations(d.id);
    } finally {
      setCreating(false);
    }
  }

  async function createGroup(title: string, memberIds: string[]) {
    if (creating) return;
    setCreating(true);
    setComposer(null);
    try {
      const r = await fetch("/api/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, memberIds }),
      });
      const d = await r.json();
      if (d.id) await loadConversations(d.id);
    } finally {
      setCreating(false);
    }
  }

  const active = conversations.find((c) => c.id === selected);
  const iconFor = (kind: string) =>
    kind === "channel" ? "# " : kind === "group" ? "👥 " : "";

  return (
    <div className="flex flex-col gap-3">
      {/* Conversation switcher + New */}
      <div className="flex items-center gap-2">
        <div className="-mx-1 flex flex-1 gap-2 overflow-x-auto px-1 pb-1">
          {conversations.map((c) => {
            const n = unread[c.id] ?? 0;
            return (
              <button
                key={c.id}
                onClick={() => setSelected(c.id)}
                className={`flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors ${
                  selected === c.id
                    ? "border-zinc-900 bg-zinc-900 text-white"
                    : "border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50"
                }`}
              >
                <span>
                  {iconFor(c.kind)}
                  {c.label}
                </span>
                {n > 0 && selected !== c.id && (
                  <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 px-1 text-xs font-semibold text-white">
                    {n > 9 ? "9+" : n}
                  </span>
                )}
              </button>
            );
          })}
        </div>
        <div className="relative">
          <button
            onClick={() => setComposer(composer ? null : "menu")}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-zinc-200 bg-white text-lg text-zinc-600 hover:bg-zinc-50"
            aria-label="New conversation"
          >
            +
          </button>
          {composer === "menu" && (
            <div className="absolute right-0 z-20 mt-2 w-56 overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-lg">
              <p className="border-b border-zinc-100 px-3 py-2 text-xs font-medium uppercase tracking-wide text-zinc-400">
                Direct message
              </p>
              <div className="max-h-40 overflow-y-auto">
                {members.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => startDm(m.id)}
                    className="block w-full px-3 py-2 text-left text-sm text-zinc-700 hover:bg-zinc-50"
                  >
                    {m.full_name || "Unnamed"}
                  </button>
                ))}
              </div>
              <button
                onClick={() => setComposer("group")}
                className="block w-full border-t border-zinc-100 px-3 py-2.5 text-left text-sm font-medium text-emerald-700 hover:bg-zinc-50"
              >
                👥 New group chat
              </button>
            </div>
          )}
        </div>
      </div>

      {composer === "group" && (
        <GroupCreator
          members={members}
          onCancel={() => setComposer(null)}
          onCreate={createGroup}
        />
      )}

      {/* Thread */}
      <div className="flex h-[26rem] flex-col rounded-2xl border border-zinc-200 bg-white">
        <div className="flex-1 space-y-3 overflow-y-auto p-4">
          {messages.length === 0 ? (
            <div className="flex h-full items-center justify-center text-center text-sm text-zinc-400">
              {active?.kind === "channel"
                ? "No messages yet. Say hello to your team."
                : `Start the conversation${active ? ` in ${active.label}` : ""}.`}
            </div>
          ) : (
            messages.map((m) => {
              const mine = m.sender_id === myId;
              return (
                <div
                  key={m.id}
                  className={`flex flex-col ${mine ? "items-end" : "items-start"}`}
                >
                  {!mine && active?.kind !== "dm" && (
                    <span className="mb-0.5 px-1 text-xs font-medium text-zinc-500">
                      {m.sender_name || "Someone"}
                    </span>
                  )}
                  <div
                    className={`max-w-[80%] rounded-2xl px-3.5 py-2 text-sm leading-6 ${
                      mine
                        ? "rounded-br-md bg-zinc-900 text-white"
                        : "rounded-bl-md bg-zinc-100 text-zinc-800"
                    }`}
                  >
                    {m.body}
                  </div>
                  <span className="mt-0.5 px-1 text-[10px] text-zinc-400">
                    {new Date(m.created_at).toLocaleTimeString([], {
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
              );
            })
          )}
          <div ref={bottomRef} />
        </div>

        <div className="flex items-center gap-2 border-t border-zinc-200 p-3">
          <input
            value={body}
            onChange={(e) => setBody(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            placeholder={`Message ${active?.label ?? "…"}`}
            disabled={!selected}
            className="h-10 flex-1 rounded-xl border border-zinc-200 bg-white px-4 text-sm outline-none transition-colors focus:border-zinc-400 focus:ring-4 focus:ring-zinc-900/5 disabled:opacity-50"
          />
          <button
            onClick={send}
            disabled={!body.trim() || !selected}
            className="inline-flex h-10 items-center justify-center rounded-xl bg-zinc-900 px-5 text-sm font-semibold text-white transition-colors hover:bg-zinc-800 disabled:opacity-50"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}

function GroupCreator({
  members,
  onCancel,
  onCreate,
}: {
  members: Member[];
  onCancel: () => void;
  onCreate: (title: string, memberIds: string[]) => void;
}) {
  const [title, setTitle] = useState("");
  const [picked, setPicked] = useState<string[]>([]);
  const toggle = (id: string) =>
    setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-4">
      <p className="text-sm font-medium text-zinc-900">New group chat</p>
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Group name (e.g. Weekend drivers)"
        className="mt-3 h-10 w-full rounded-xl border border-zinc-200 px-4 text-sm outline-none focus:border-zinc-400 focus:ring-4 focus:ring-zinc-900/5"
      />
      <p className="mt-3 text-xs font-medium uppercase tracking-wide text-zinc-400">
        Add teammates
      </p>
      <div className="mt-2 flex flex-wrap gap-2">
        {members.map((m) => (
          <button
            key={m.id}
            onClick={() => toggle(m.id)}
            className={`rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
              picked.includes(m.id)
                ? "border-zinc-900 bg-zinc-900 text-white"
                : "border-zinc-200 text-zinc-600 hover:bg-zinc-50"
            }`}
          >
            {m.full_name || "Unnamed"}
          </button>
        ))}
      </div>
      <div className="mt-4 flex gap-2">
        <button
          onClick={() => onCreate(title, picked)}
          disabled={picked.length < 2}
          className="inline-flex h-10 items-center justify-center rounded-xl bg-zinc-900 px-5 text-sm font-semibold text-white hover:bg-zinc-800 disabled:opacity-50"
        >
          Create group
        </button>
        <button
          onClick={onCancel}
          className="inline-flex h-10 items-center justify-center rounded-xl border border-zinc-200 px-5 text-sm font-medium text-zinc-600 hover:bg-zinc-50"
        >
          Cancel
        </button>
      </div>
      <p className="mt-2 text-xs text-zinc-400">Pick at least two teammates.</p>
    </div>
  );
}
