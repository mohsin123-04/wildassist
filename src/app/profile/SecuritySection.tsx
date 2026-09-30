"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Spinner from "@/components/Spinner";

const inputClass =
  "h-11 w-full rounded-xl border border-stone-200 bg-white px-4 outline-none transition-colors focus:border-stone-400 focus:ring-4 focus:ring-stone-900/5";

export default function SecuritySection({ email }: { email: string }) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [pwBusy, setPwBusy] = useState(false);
  const [pwMsg, setPwMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const [newEmail, setNewEmail] = useState("");
  const [emailBusy, setEmailBusy] = useState(false);
  const [emailMsg, setEmailMsg] = useState<{ ok: boolean; text: string } | null>(
    null
  );

  async function changePassword() {
    if (password.length < 6) {
      setPwMsg({ ok: false, text: "Password must be at least 6 characters." });
      return;
    }
    if (password !== confirm) {
      setPwMsg({ ok: false, text: "Passwords don't match." });
      return;
    }
    setPwBusy(true);
    setPwMsg(null);
    const { error } = await createClient().auth.updateUser({ password });
    setPwBusy(false);
    if (error) {
      setPwMsg({ ok: false, text: error.message });
      return;
    }
    setPassword("");
    setConfirm("");
    setPwMsg({ ok: true, text: "Password updated." });
  }

  async function changeEmail() {
    if (!newEmail.includes("@")) {
      setEmailMsg({ ok: false, text: "Enter a valid email." });
      return;
    }
    setEmailBusy(true);
    setEmailMsg(null);
    const { error } = await createClient().auth.updateUser({ email: newEmail });
    setEmailBusy(false);
    if (error) {
      setEmailMsg({ ok: false, text: error.message });
      return;
    }
    setEmailMsg({
      ok: true,
      text: "Check your inbox to confirm the new email address.",
    });
    setNewEmail("");
  }

  return (
    <section className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
      <h2 className="font-display text-lg font-semibold text-stone-900">
        Security
      </h2>

      {/* Change password */}
      <div className="mt-5 flex flex-col gap-3">
        <p className="text-sm font-medium text-stone-700">Change password</p>
        <input
          className={inputClass}
          type="password"
          placeholder="New password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <input
          className={inputClass}
          type="password"
          placeholder="Confirm new password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
        />
        {pwMsg && (
          <p className={`text-sm ${pwMsg.ok ? "text-emerald-700" : "text-rose-700"}`}>
            {pwMsg.text}
          </p>
        )}
        <button
          onClick={changePassword}
          disabled={pwBusy || !password}
          className="inline-flex h-10 w-fit items-center justify-center rounded-xl bg-forest-900 px-5 text-sm font-medium text-white transition-colors hover:bg-forest-800 disabled:opacity-50"
        >
          {pwBusy ? <Spinner label="Updating…" /> : "Update password"}
        </button>
      </div>

      <hr className="my-6 border-stone-100" />

      {/* Change email */}
      <div className="flex flex-col gap-3">
        <p className="text-sm font-medium text-stone-700">Change email</p>
        <p className="text-sm text-stone-500">Current: {email}</p>
        <input
          className={inputClass}
          type="email"
          placeholder="New email address"
          value={newEmail}
          onChange={(e) => setNewEmail(e.target.value)}
        />
        {emailMsg && (
          <p className={`text-sm ${emailMsg.ok ? "text-emerald-700" : "text-rose-700"}`}>
            {emailMsg.text}
          </p>
        )}
        <button
          onClick={changeEmail}
          disabled={emailBusy || !newEmail}
          className="inline-flex h-10 w-fit items-center justify-center rounded-xl border border-stone-200 px-5 text-sm font-medium text-stone-700 transition-colors hover:bg-stone-50 disabled:opacity-50"
        >
          {emailBusy ? <Spinner label="Sending…" /> : "Update email"}
        </button>
      </div>
    </section>
  );
}
