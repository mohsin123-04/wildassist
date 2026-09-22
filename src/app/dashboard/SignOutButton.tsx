"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function SignOutButton() {
  const router = useRouter();

  async function signOut() {
    await createClient().auth.signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <button
      onClick={signOut}
      className="rounded-full border border-black/10 bg-white px-4 py-1.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-black/5"
    >
      Sign out
    </button>
  );
}
