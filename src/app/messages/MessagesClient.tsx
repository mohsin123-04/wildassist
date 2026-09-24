"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export type Member = { id: string; full_name: string | null; role: string };

type Message = {
  id: string;
  sender_id: string | null;
  sender_name: string | null;
  recipient_id: string | null;
  body: string;
  created_at: string;
};

const MAIN = "main";

export default function MessagesClient({
  centreId,
  myId,
  myName,
  members,
}: {
  centreId: string;
  myId: string;
  myName: string;
  members: Member[];
}) {
  const [selected, setSelected] = useState<string>(MAIN); // "main" or a member id
  const [messages, setMessages] = useState<Message[]>([]);
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const selectedRef = useRef(selected);
  selectedRef.current = selected;

  const supabase = createClient();

  function belongsToOpen(m: Message): boolean {
    if (selectedRef.current === MAIN) return m.recipient_id === null;
    const other = selectedRef.current;
    return (
      (m.sender_id === myId && m.recipient_id === other) ||
      (m.sender_id === other && m.recipient_id === myId)
    );
  }

  async function loadMessages() {
    let query = supabase
      .from("messages")
      .select("id, sender_id, sender_name, recipient_id, body, created_at")
      .order("created_at", { ascending: true });

    if (selected === MAIN) {
      query = query.is("recipient_id", null);
    } else {
      query = query.or(
        `and(sender_id.eq.${myId},recipient_id.eq.${selected}),and(sender_id.eq.${selected},recipient_id.eq.${myId})`
      );
    }
    const { data } = await query;
    setMessages((data ?? []) as Message[]);
  }

  useEffect(() => {
    loadMessages();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected]);

  // Realtime: new messages in this centre bump the open conversation.
  useEffect(() => {
    const channel = supabase
      .channel("messages")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `centre_id=eq.${centreId}`,
        },
        (payload) => {
          const m = payload.new as Message;
          if (belongsToOpen(m)) {
            setMessages((prev) =>
              prev.some((x) => x.id === m.id) ? prev : [...prev, m]
            );
          }
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [centreId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function send() {
    const text = body.trim();
    if (!text) return;
    setSending(true);
    setBody("");
    await supabase.from("messages").insert({
      centre_id: centreId,
      sender_id: myId,
      sender_name: myName,
      recipient_id: selected === MAIN ? null : selected,
      body: text,
    });
    setSending(false);
  }

  const conversations = [
    { key: MAIN, label: "Main channel", sub: "Everyone at your centre" },
    ...members.map((m) => ({
      key: m.id,
      label: m.full_name || "Unnamed",
      sub: "Direct message",
    })),
  ];
  const activeLabel =
    conversations.find((c) => c.key === selected)?.label ?? "Main channel";

  return (
    <div className="flex flex-col gap-3">
      {/* Conversation switcher */}
      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
        {conversations.map((c) => (
          <button
            key={c.key}
            onClick={() => setSelected(c.key)}
            className={`flex shrink-0 items-center gap-2 rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors ${
              selected === c.key
                ? "border-zinc-900 bg-zinc-900 text-white"
                : "border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50"
            }`}
          >
            {c.key === MAIN ? "# " : ""}
            {c.label}
          </button>
        ))}
      </div>

      {/* Thread */}
      <div className="flex h-[26rem] flex-col rounded-2xl border border-zinc-200 bg-white">
        <div className="flex-1 space-y-3 overflow-y-auto p-4">
          {messages.length === 0 ? (
            <div className="flex h-full items-center justify-center text-center text-sm text-zinc-400">
              {selected === MAIN
                ? "No messages yet. Say hello to your team."
                : `Start a conversation with ${activeLabel}.`}
            </div>
          ) : (
            messages.map((m) => {
              const mine = m.sender_id === myId;
              return (
                <div
                  key={m.id}
                  className={`flex flex-col ${mine ? "items-end" : "items-start"}`}
                >
                  {!mine && selected === MAIN && (
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

        {/* Composer */}
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
            placeholder={`Message ${selected === MAIN ? "the team" : activeLabel}…`}
            className="h-10 flex-1 rounded-xl border border-zinc-200 bg-white px-4 text-sm outline-none transition-colors focus:border-zinc-400 focus:ring-4 focus:ring-zinc-900/5"
          />
          <button
            onClick={send}
            disabled={sending || !body.trim()}
            className="inline-flex h-10 items-center justify-center rounded-xl bg-zinc-900 px-5 text-sm font-semibold text-white transition-colors hover:bg-zinc-800 disabled:opacity-50"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
