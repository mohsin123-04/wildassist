import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import MessagesClient, { type Member } from "./MessagesClient";

export const dynamic = "force-dynamic";

export default async function MessagesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: me } = await supabase
    .from("profiles")
    .select("centre_id, full_name, role")
    .eq("id", user.id)
    .single();

  if (!me?.centre_id) {
    return (
      <main className="animate-in mx-auto flex w-full max-w-xl flex-1 flex-col px-5 py-10">
        <h1 className="font-display text-2xl font-semibold tracking-tight text-zinc-900">
          Messages
        </h1>
        <p className="mt-2 text-zinc-500">
          Messaging is for centre teams. Join a centre to chat with your
          colleagues.
        </p>
        <Link
          href="/dashboard"
          className="mt-5 inline-flex h-11 w-fit items-center justify-center rounded-xl bg-zinc-900 px-6 text-sm font-semibold text-white hover:bg-zinc-800"
        >
          Go to dashboard
        </Link>
      </main>
    );
  }

  const { data: members } = await supabase
    .from("profiles")
    .select("id, full_name, role")
    .eq("centre_id", me.centre_id)
    .neq("id", user.id)
    .order("full_name");

  const { data: centre } = await supabase
    .from("centres")
    .select("name")
    .eq("id", me.centre_id)
    .single();

  return (
    <main className="animate-in mx-auto flex w-full max-w-2xl flex-1 flex-col px-5 py-8">
      <div className="mb-5">
        <p className="text-xs font-medium uppercase tracking-widest text-zinc-400">
          {centre?.name ?? "Your centre"}
        </p>
        <h1 className="mt-1 font-display text-2xl font-semibold tracking-tight text-zinc-900">
          Messages
        </h1>
      </div>
      <MessagesClient
        centreId={me.centre_id}
        myId={user.id}
        myName={me.full_name ?? "You"}
        members={(members ?? []) as Member[]}
      />
    </main>
  );
}
