"use client";

import { useEffect, useState } from "react";
import { BellRing, X } from "lucide-react";
import { flash } from "@/lib/flash";

const DISMISS_KEY = "wa_push_dismissed";

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + padding).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

/**
 * Slim dashboard banner inviting staff to turn on push notifications for new
 * cases. Hidden when push is unsupported, already enabled, blocked, or
 * dismissed. The actual notification is sent server-side when a case routes.
 */
export default function EnablePushCard() {
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      if (
        typeof window === "undefined" ||
        !("serviceWorker" in navigator) ||
        !("PushManager" in window) ||
        !("Notification" in window) ||
        Notification.permission === "denied" ||
        !process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ||
        localStorage.getItem(DISMISS_KEY)
      ) {
        return;
      }
      try {
        const reg = await navigator.serviceWorker.ready;
        const existing = await reg.pushManager.getSubscription();
        if (active && !existing) setShow(true);
      } catch {
        // no SW → no banner
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  async function enable() {
    setBusy(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setShow(false);
        return;
      }
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(
          process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!
        ) as unknown as BufferSource,
      });
      const json = sub.toJSON();
      const res = await fetch("/api/push", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ endpoint: sub.endpoint, keys: json.keys }),
      });
      if (!res.ok) throw new Error("register failed");
      flash("Notifications on. You'll hear about new cases.");
      setShow(false);
    } catch {
      flash("Couldn't turn on notifications.");
    } finally {
      setBusy(false);
    }
  }

  if (!show) return null;

  return (
    <div className="mb-5 flex items-center gap-3 border-l-2 border-l-emerald-500 bg-emerald-50/50 px-4 py-3">
      <BellRing className="h-5 w-5 shrink-0 text-emerald-700" aria-hidden />
      <p className="min-w-0 flex-1 text-sm text-emerald-900">
        Get a notification the moment a new case is routed to your centre,
        even when this tab is closed.
      </p>
      <button
        onClick={enable}
        disabled={busy}
        className="inline-flex h-9 shrink-0 items-center justify-center rounded-xl bg-emerald-700 px-4 text-sm font-semibold text-white transition-colors hover:bg-emerald-800 disabled:opacity-50"
      >
        {busy ? "Enabling…" : "Enable"}
      </button>
      <button
        onClick={() => {
          localStorage.setItem(DISMISS_KEY, "1");
          setShow(false);
        }}
        aria-label="Dismiss"
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-emerald-700 transition-colors hover:bg-emerald-100"
      >
        <X className="h-4 w-4" aria-hidden />
      </button>
    </div>
  );
}
