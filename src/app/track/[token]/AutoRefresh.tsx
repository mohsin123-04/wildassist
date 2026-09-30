"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";

/**
 * Keeps the public tracking page live: re-fetches the server component on a
 * gentle interval (and when the tab regains focus) so a reporter watching the
 * page sees status changes without a manual reload. Pauses while hidden to
 * avoid needless requests. Closed reports stop polling.
 */
export default function AutoRefresh({ done }: { done: boolean }) {
  const router = useRouter();
  const [justUpdated, setJustUpdated] = useState(false);

  useEffect(() => {
    if (done) return;
    let timer: ReturnType<typeof setInterval> | null = null;

    const refresh = () => {
      if (document.visibilityState === "visible") router.refresh();
    };
    const start = () => {
      if (!timer) timer = setInterval(refresh, 30000);
    };
    const stop = () => {
      if (timer) {
        clearInterval(timer);
        timer = null;
      }
    };
    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        router.refresh();
        start();
      } else {
        stop();
      }
    };

    start();
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      stop();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [done, router]);

  // Brief "checking…" pulse so the live behaviour is visible, not silent.
  useEffect(() => {
    if (done) return;
    const t = setInterval(() => {
      setJustUpdated(true);
      setTimeout(() => setJustUpdated(false), 1200);
    }, 30000);
    return () => clearInterval(t);
  }, [done]);

  if (done) return null;

  return (
    <p className="mt-4 inline-flex items-center gap-1.5 text-xs text-zinc-400">
      <RefreshCw
        className={`h-3 w-3 ${justUpdated ? "animate-spin text-emerald-500" : ""}`}
        aria-hidden
      />
      {justUpdated ? "Checking for updates…" : "Updates automatically"}
    </p>
  );
}
