"use client";

import { useEffect, useRef, useState } from "react";
import { Check } from "lucide-react";

/** Global toast host. Shows messages sent via flash() from anywhere. */
export default function Toast() {
  const [message, setMessage] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function show(msg: string) {
    setMessage(msg);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setMessage(null), 3200);
    try {
      sessionStorage.removeItem("wa_flash");
    } catch {
      // ignore
    }
  }

  useEffect(() => {
    // Pending flash from a full reload.
    try {
      const pending = sessionStorage.getItem("wa_flash");
      if (pending) show(pending);
    } catch {
      // ignore
    }
    function onFlash(e: Event) {
      show((e as CustomEvent).detail as string);
    }
    window.addEventListener("wa-flash", onFlash);
    return () => window.removeEventListener("wa-flash", onFlash);
  }, []);

  if (!message) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-5 z-50 flex justify-center px-4"
    >
      <div className="animate-in flex items-center gap-2.5 rounded-full border border-stone-800 bg-forest-900 px-4 py-2.5 text-sm font-medium text-white shadow-lg">
        <span
          aria-hidden
          className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 text-white"
        >
          <Check className="h-3 w-3" />
        </span>
        {message}
      </div>
    </div>
  );
}
