"use client";

import { Fragment, useEffect, useRef, useState } from "react";
import { Users, Camera, Search } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { flash } from "@/lib/flash";

type Member = { id: string; full_name: string | null; role: string };
type Conversation = { id: string; kind: string; label: string; unread?: number };
type CaseRef = {
  id: string;
  animal: string;
  title: string;
  status?: string;
};
type Message = {
  id: string;
  conversation_id: string;
  sender_id: string | null;
  sender_name: string | null;
  body: string;
  created_at: string;
  case_ref?: CaseRef | null;
  edited_at?: string | null;
  deleted_at?: string | null;
  image_url?: string | null;
};

/** Whether two timestamps fall on the same calendar day. */
function sameDay(a: string, b: string): boolean {
  const x = new Date(a);
  const y = new Date(b);
  return (
    x.getFullYear() === y.getFullYear() &&
    x.getMonth() === y.getMonth() &&
    x.getDate() === y.getDate()
  );
}

/** "Today", "Yesterday", or a dated label for day separators. */
function dayLabel(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const dayMs = 24 * 60 * 60 * 1000;
  const diffDays = Math.floor((startOfToday.getTime() - d.getTime()) / dayMs);
  if (sameDay(iso, now.toISOString())) return "Today";
  if (diffDays >= 0 && diffDays < 1) return "Yesterday";
  const y = new Date(now.getTime() - dayMs);
  if (sameDay(iso, y.toISOString())) return "Yesterday";
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: d.getFullYear() === now.getFullYear() ? undefined : "numeric",
  });
}

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
  const [creating, setCreating] = useState(false);
  const [unread, setUnread] = useState<Record<string, number>>({});
  const [newMenu, setNewMenu] = useState<null | "menu" | "group">(null);
  const [mobileThread, setMobileThread] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [typingNames, setTypingNames] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [convQuery, setConvQuery] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const atBottomRef = useRef(true);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const newMenuRef = useRef<HTMLDivElement>(null);
  const selectedRef = useRef<string | null>(null);
  selectedRef.current = selected;
  const convIdsRef = useRef<string[]>([]);

  // Close the "+" new-conversation dropdown on outside click / Escape. Scoped
  // to the small menu only, not the full group-creation form.
  useEffect(() => {
    if (newMenu !== "menu") return;
    function onDown(e: MouseEvent) {
      if (newMenuRef.current && !newMenuRef.current.contains(e.target as Node)) {
        setNewMenu(null);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setNewMenu(null);
    }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [newMenu]);
  // Broadcast channel for "is typing" pings on the open conversation.
  const typingChanRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const typingTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const lastTypingSent = useRef(0);
  const markReadTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Clear the badge immediately, but debounce the DB write so a burst of
  // incoming messages doesn't fire one upsert each.
  function markRead(convId: string) {
    setUnread((u) => (u[convId] ? { ...u, [convId]: 0 } : u));
    if (markReadTimer.current) clearTimeout(markReadTimer.current);
    markReadTimer.current = setTimeout(async () => {
      await supabase.from("conversation_reads").upsert(
        {
          conversation_id: convId,
          user_id: myId,
          last_read: new Date().toISOString(),
        },
        { onConflict: "conversation_id,user_id" }
      );
      window.dispatchEvent(new Event("messages-read"));
    }, 1500);
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
  }, []);

  // Deep link from the dashboard: /messages?dm=<userId> opens (or creates) that DM.
  useEffect(() => {
    const dm = new URLSearchParams(window.location.search).get("dm");
    if (dm) {
      startDm(dm);
      window.history.replaceState(null, "", "/messages");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!selected) return;
    supabase
      .from("messages")
      .select("id, conversation_id, sender_id, sender_name, body, created_at, case_ref, edited_at, deleted_at, image_url")
      .eq("conversation_id", selected)
      .order("created_at", { ascending: true })
      .then(({ data }) => setMessages((data ?? []) as Message[]));
    markRead(selected);
    setEditingId(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected]);

  // Typing indicator: a lightweight realtime broadcast channel per conversation
  // (no database writes). Names auto-expire a few seconds after the last ping.
  useEffect(() => {
    if (!selected) return;
    setTypingNames([]);
    const chan = supabase.channel(`typing:${selected}`, {
      config: { broadcast: { self: false } },
    });
    chan
      .on("broadcast", { event: "typing" }, ({ payload }) => {
        const name = (payload?.name as string) || "";
        if (!name) return;
        setTypingNames((prev) => (prev.includes(name) ? prev : [...prev, name]));
        clearTimeout(typingTimers.current[name]);
        typingTimers.current[name] = setTimeout(() => {
          setTypingNames((prev) => prev.filter((n) => n !== name));
        }, 3500);
      })
      .subscribe();
    typingChanRef.current = chan;
    return () => {
      supabase.removeChannel(chan);
      typingChanRef.current = null;
      Object.values(typingTimers.current).forEach(clearTimeout);
      typingTimers.current = {};
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected]);

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
            if (!convIdsRef.current.includes(m.conversation_id)) {
              loadConversations();
            } else {
              setUnread((u) => ({
                ...u,
                [m.conversation_id]: (u[m.conversation_id] ?? 0) + 1,
              }));
            }
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "messages" },
        (payload) => {
          // Edits and soft-deletes arrive as UPDATEs; reflect them live.
          const m = payload.new as Message;
          if (m.conversation_id === selectedRef.current) {
            setMessages((prev) =>
              prev.map((x) => (x.id === m.id ? { ...x, ...m } : x))
            );
          }
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Switching conversations should always land at the newest message.
  useEffect(() => {
    atBottomRef.current = true;
  }, [selected]);

  // Auto-scroll only when the reader is already at the bottom or just sent a
  // message, don't yank someone who has scrolled up to read older messages.
  useEffect(() => {
    const last = messages[messages.length - 1];
    if (last?.sender_id === myId || atBottomRef.current) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, myId]);

  async function send(imageUrl?: string) {
    const text = body.trim();
    if ((!text && !imageUrl) || !selected) return;
    setBody("");
    // Optimistic: show it instantly, then reconcile with the saved row.
    const tempId = `temp-${Date.now()}`;
    const optimistic: Message = {
      id: tempId,
      conversation_id: selected,
      sender_id: myId,
      sender_name: myName,
      body: text,
      created_at: new Date().toISOString(),
      image_url: imageUrl ?? null,
    };
    setMessages((prev) => [...prev, optimistic]);
    const { data } = await supabase
      .from("messages")
      .insert({
        conversation_id: selected,
        sender_id: myId,
        sender_name: myName,
        body: text,
        image_url: imageUrl ?? null,
      })
      .select("id, conversation_id, sender_id, sender_name, body, created_at, case_ref, edited_at, deleted_at, image_url")
      .single();
    if (data) {
      setMessages((prev) =>
        prev.some((x) => x.id === data.id)
          ? prev.filter((x) => x.id !== tempId)
          : prev.map((x) => (x.id === tempId ? (data as Message) : x))
      );
    }
  }

  async function onPickPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-picking the same file
    if (!file || !selected) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const r = await fetch("/api/message-photo", { method: "POST", body: fd });
      const d = await r.json().catch(() => ({}));
      if (r.ok && d.path) await send(d.path);
      else flash(d.error ?? "Couldn't upload the image.");
    } catch {
      flash("Couldn't upload the image.");
    } finally {
      setUploading(false);
    }
  }

  function notifyTyping() {
    const now = Date.now();
    if (now - lastTypingSent.current < 2000) return; // throttle
    lastTypingSent.current = now;
    typingChanRef.current?.send({
      type: "broadcast",
      event: "typing",
      payload: { name: myName },
    });
  }

  function startEdit(m: Message) {
    setEditingId(m.id);
    setEditText(m.body);
  }

  async function saveEdit(id: string) {
    const text = editText.trim();
    if (!text) return;
    const edited_at = new Date().toISOString();
    setMessages((prev) =>
      prev.map((x) => (x.id === id ? { ...x, body: text, edited_at } : x))
    );
    setEditingId(null);
    await supabase
      .from("messages")
      .update({ body: text, edited_at })
      .eq("id", id)
      .eq("sender_id", myId);
  }

  async function deleteMessage(id: string) {
    const deleted_at = new Date().toISOString();
    // Redact the content, not just flag it, otherwise the original body is
    // still readable via the raw table (RLS returns soft-deleted rows).
    const redaction = { deleted_at, body: "", image_url: null, case_ref: null };
    setMessages((prev) =>
      prev.map((x) => (x.id === id ? { ...x, ...redaction } : x))
    );
    await supabase
      .from("messages")
      .update(redaction)
      .eq("id", id)
      .eq("sender_id", myId);
  }

  function openConversation(id: string) {
    setSelected(id);
    setMobileThread(true);
  }

  async function startDm(memberId: string) {
    if (creating) return;
    setCreating(true);
    setNewMenu(null);
    try {
      const r = await fetch("/api/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dmWith: memberId }),
      });
      const d = await r.json();
      if (d.id) {
        await loadConversations(d.id);
        setMobileThread(true);
      }
    } finally {
      setCreating(false);
    }
  }

  async function createGroup(title: string, memberIds: string[]) {
    if (creating) return;
    setCreating(true);
    setNewMenu(null);
    try {
      const r = await fetch("/api/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, memberIds }),
      });
      const d = await r.json();
      if (d.id) {
        await loadConversations(d.id);
        setMobileThread(true);
      }
    } finally {
      setCreating(false);
    }
  }

  const active = conversations.find((c) => c.id === selected);

  return (
    <div className="flex h-[75vh] min-h-[28rem] overflow-hidden rounded-2xl border border-zinc-200 bg-white sm:h-[32rem] sm:min-h-0">
      {/* Sidebar */}
      <aside
        className={`w-full flex-col border-r border-zinc-200 sm:flex sm:w-64 ${
          mobileThread ? "hidden" : "flex"
        }`}
      >
        <div
          ref={newMenuRef}
          className="relative flex items-center justify-between border-b border-zinc-200 px-3 py-2.5"
        >
          <span className="text-sm font-semibold text-zinc-900">Conversations</span>
          <button
            onClick={() => setNewMenu(newMenu ? null : "menu")}
            className="flex h-7 w-7 items-center justify-center rounded-lg border border-zinc-200 text-lg text-zinc-600 hover:bg-zinc-50"
            aria-label="New conversation"
          >
            +
          </button>
          {newMenu === "menu" && (
            <div className="absolute right-2 top-11 z-20 w-56 overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-lg">
              <button
                onClick={() => setNewMenu("group")}
                className="flex w-full items-center gap-2 border-b border-zinc-100 px-3 py-2.5 text-left text-sm font-medium text-emerald-700 hover:bg-zinc-50"
              >
                <Users className="h-4 w-4" aria-hidden /> New group chat
              </button>
              <p className="px-3 py-1.5 text-xs font-medium uppercase tracking-wide text-zinc-500">
                Direct message
              </p>
              <div className="max-h-48 overflow-y-auto pb-1">
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
            </div>
          )}
        </div>

        {conversations.length > 5 && (
          <div className="border-b border-zinc-200 p-2">
            <div className="relative">
              <Search
                className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-400"
                aria-hidden
              />
              <input
                value={convQuery}
                onChange={(e) => setConvQuery(e.target.value)}
                placeholder="Search conversations"
                aria-label="Search conversations"
                className="w-full rounded-lg border border-zinc-200 bg-white py-1.5 pl-8 pr-2 text-sm outline-none transition-colors focus:border-zinc-400"
              />
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-2">
          {(() => {
            const q = convQuery.trim().toLowerCase();
            const shown = q
              ? conversations.filter((c) => c.label.toLowerCase().includes(q))
              : conversations;
            if (shown.length === 0) {
              return (
                <p className="px-2.5 py-6 text-center text-sm text-zinc-500">
                  No conversations match “{convQuery.trim()}”.
                </p>
              );
            }
            return shown.map((c) => {
            const n = unread[c.id] ?? 0;
            const isSel = selected === c.id;
            return (
              <button
                key={c.id}
                onClick={() => openConversation(c.id)}
                className={`mb-1 flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition-colors ${
                  isSel ? "bg-emerald-700 text-white" : "text-zinc-700 hover:bg-zinc-100"
                }`}
              >
                <ConvIcon kind={c.kind} label={c.label} selected={isSel} />
                <span className="min-w-0 flex-1 truncate text-sm font-medium">
                  {c.label}
                </span>
                {n > 0 && !isSel && (
                  <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 px-1 text-xs font-semibold text-white">
                    {n > 9 ? "9+" : n}
                  </span>
                )}
              </button>
            );
            });
          })()}
        </div>
      </aside>

      {/* Thread */}
      <section
        className={`flex-1 flex-col ${mobileThread ? "flex" : "hidden sm:flex"}`}
      >
        {newMenu === "group" ? (
          <GroupCreator
            members={members}
            onCancel={() => setNewMenu(null)}
            onCreate={createGroup}
          />
        ) : (
          <>
            <div className="flex items-center gap-2 border-b border-zinc-200 px-4 py-2.5">
              <button
                onClick={() => setMobileThread(false)}
                className="text-sm text-zinc-500 hover:text-zinc-900 sm:hidden"
                aria-label="Back"
              >
                ←
              </button>
              <p className="truncate text-sm font-semibold text-zinc-900">
                {active ? `${active.kind === "channel" ? "# " : ""}${active.label}` : "Select a conversation"}
              </p>
            </div>

            <div
              ref={listRef}
              onScroll={(e) => {
                const el = e.currentTarget;
                atBottomRef.current =
                  el.scrollHeight - el.scrollTop - el.clientHeight < 120;
              }}
              className="flex-1 space-y-3 overflow-y-auto p-4"
            >
              {messages.length === 0 ? (
                <div className="flex h-full items-center justify-center text-center text-sm text-zinc-500">
                  {active?.kind === "channel"
                    ? "No messages yet. Say hello to your team."
                    : "Start the conversation."}
                </div>
              ) : (
                messages.map((m, i) => {
                  const mine = m.sender_id === myId;
                  const prev = messages[i - 1];
                  const showDay = !prev || !sameDay(prev.created_at, m.created_at);
                  return (
                    <Fragment key={m.id}>
                      {showDay && (
                        <div className="flex justify-center py-1">
                          <span className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-[11px] font-medium text-zinc-600">
                            {dayLabel(m.created_at)}
                          </span>
                        </div>
                      )}
                      <div
                        className={`group flex flex-col ${mine ? "items-end" : "items-start"}`}
                      >
                      {!mine && active?.kind !== "dm" && (
                        <span className="mb-0.5 px-1 text-xs font-medium text-zinc-500">
                          {m.sender_name || "Someone"}
                        </span>
                      )}
                      {m.deleted_at ? (
                        <div className="max-w-[80%] rounded-2xl bg-zinc-50 px-3.5 py-2 text-sm italic leading-6 text-zinc-500">
                          This message was deleted
                        </div>
                      ) : editingId === m.id ? (
                        <div className="flex w-full max-w-[85%] flex-col gap-2">
                          <textarea
                            value={editText}
                            aria-label="Edit message"
                            onChange={(e) => setEditText(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" && !e.shiftKey) {
                                e.preventDefault();
                                saveEdit(m.id);
                              }
                              if (e.key === "Escape") setEditingId(null);
                            }}
                            rows={2}
                            autoFocus
                            className="w-full resize-none rounded-xl border border-zinc-300 bg-white p-2.5 text-sm text-zinc-800 outline-none focus:border-zinc-400 focus:ring-4 focus:ring-zinc-900/5"
                          />
                          <div className="flex gap-2">
                            <button
                              onClick={() => saveEdit(m.id)}
                              className="inline-flex h-8 items-center rounded-lg bg-emerald-700 px-3 text-xs font-semibold text-white hover:bg-emerald-800"
                            >
                              Save
                            </button>
                            <button
                              onClick={() => setEditingId(null)}
                              className="inline-flex h-8 items-center rounded-lg border border-zinc-200 px-3 text-xs font-medium text-zinc-600 hover:bg-zinc-50"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : m.case_ref ? (
                        <a
                          href={`/case/${m.case_ref.id}`}
                          className="block max-w-[85%] rounded-2xl border border-zinc-200 bg-white p-3 text-left shadow-sm transition-colors hover:bg-zinc-50"
                        >
                          <span className="text-xs font-medium uppercase tracking-wide text-emerald-700">
                            Shared case
                          </span>
                          <span className="mt-0.5 block text-sm font-medium capitalize text-zinc-900">
                            {m.case_ref.animal} · {m.case_ref.title}
                          </span>
                          <span className="mt-1 inline-block text-xs text-zinc-500">
                            View in dashboard →
                          </span>
                        </a>
                      ) : m.image_url ? (
                        <div className="flex max-w-[80%] flex-col gap-1">
                          {m.id.startsWith("temp-") ? (
                            <div className="flex h-40 w-56 items-center justify-center rounded-2xl bg-zinc-100 text-sm text-zinc-500">
                              Sending photo…
                            </div>
                          ) : (
                            <a
                              href={`/api/message-image/${m.id}`}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={`/api/message-image/${m.id}`}
                                alt="Shared photo"
                                className="max-h-64 w-full rounded-2xl object-cover"
                              />
                            </a>
                          )}
                          {m.body && (
                            <div
                              className={`rounded-2xl px-3.5 py-2 text-sm leading-6 ${
                                mine
                                  ? "rounded-br-md bg-emerald-700 text-white"
                                  : "rounded-bl-md bg-zinc-100 text-zinc-800"
                              }`}
                            >
                              {m.body}
                            </div>
                          )}
                        </div>
                      ) : (
                        <div
                          className={`max-w-[80%] rounded-2xl px-3.5 py-2 text-sm leading-6 ${
                            mine
                              ? "rounded-br-md bg-emerald-700 text-white"
                              : "rounded-bl-md bg-zinc-100 text-zinc-800"
                          }`}
                        >
                          {m.body}
                        </div>
                      )}
                      <div className="mt-0.5 flex items-center gap-2 px-1">
                        <span className="text-[10px] text-zinc-500">
                          {new Date(m.created_at).toLocaleTimeString([], {
                            hour: "numeric",
                            minute: "2-digit",
                          })}
                          {m.edited_at && !m.deleted_at ? " · edited" : ""}
                        </span>
                        {mine && !m.deleted_at && !m.case_ref && editingId !== m.id && (
                          <span className="flex gap-1.5 opacity-0 transition-opacity group-hover:opacity-100">
                            <button
                              onClick={() => startEdit(m)}
                              className="text-[10px] font-medium text-zinc-500 hover:text-zinc-700"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => deleteMessage(m.id)}
                              className="text-[10px] font-medium text-zinc-500 hover:text-rose-700"
                            >
                              Delete
                            </button>
                          </span>
                        )}
                      </div>
                      </div>
                    </Fragment>
                  );
                })
              )}
              <div ref={bottomRef} />
            </div>

            <div
              role="status"
              aria-live="polite"
              className="h-4 px-4 text-xs italic text-zinc-500"
            >
              {typingNames.length > 0 &&
                (typingNames.length === 1
                  ? `${typingNames[0]} is typing…`
                  : `${typingNames.length} people are typing…`)}
            </div>

            <div className="flex items-center gap-2 border-t border-zinc-200 p-3">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
                onChange={onPickPhoto}
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={!selected || uploading}
                aria-label="Attach a photo"
                title="Attach a photo"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-zinc-200 text-lg text-zinc-500 transition-colors hover:bg-zinc-50 disabled:opacity-50"
              >
                {uploading ? (
                  <span className="text-sm text-zinc-500">…</span>
                ) : (
                  <Camera className="h-5 w-5" aria-hidden />
                )}
              </button>
              <input
                value={body}
                aria-label="Type a message"
                onChange={(e) => {
                  setBody(e.target.value);
                  notifyTyping();
                }}
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
                onClick={() => send()}
                disabled={!body.trim() || !selected}
                className="inline-flex h-10 items-center justify-center rounded-xl bg-emerald-700 px-5 text-sm font-semibold text-white transition-colors hover:bg-emerald-800 disabled:opacity-50"
              >
                Send
              </button>
            </div>
          </>
        )}
      </section>
    </div>
  );
}

function ConvIcon({
  kind,
  label,
  selected,
}: {
  kind: string;
  label: string;
  selected: boolean;
}) {
  const base = "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold";
  if (kind === "channel")
    return (
      <span className={`${base} ${selected ? "bg-white/15 text-white" : "bg-zinc-200 text-zinc-600"}`}>
        #
      </span>
    );
  if (kind === "group")
    return (
      <span className={`${base} ${selected ? "bg-white/15 text-white" : "bg-zinc-200 text-zinc-600"}`}>
        <Users className="h-3.5 w-3.5" aria-hidden />
      </span>
    );
  return (
    <span className={`${base} ${selected ? "bg-white/15 text-white" : "bg-emerald-100 text-emerald-700"}`}>
      {label.charAt(0).toUpperCase()}
    </span>
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
    <div className="flex-1 overflow-y-auto p-5">
      <p className="text-sm font-semibold text-zinc-900">New group chat</p>
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Group name (e.g. Weekend drivers)"
        className="mt-3 h-10 w-full rounded-xl border border-zinc-200 px-4 text-sm outline-none focus:border-zinc-400 focus:ring-4 focus:ring-zinc-900/5"
      />
      <p className="mt-4 text-xs font-medium uppercase tracking-wide text-zinc-500">
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
      <div className="mt-5 flex gap-2">
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
      <p className="mt-2 text-xs text-zinc-500">Pick at least two teammates.</p>
    </div>
  );
}
