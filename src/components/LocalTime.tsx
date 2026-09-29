"use client";

import { useEffect, useState } from "react";

/**
 * Renders a timestamp in the viewer's local time WITHOUT a hydration mismatch.
 * The server (Node/UTC) and the browser (local timezone) format the same instant
 * differently, which trips React's hydration check when the value is in the SSR
 * HTML. So we render a deterministic UTC string on the server and first client
 * render (identical → no mismatch), then swap to local time after mount.
 */
export default function LocalTime({
  iso,
  options,
}: {
  iso: string;
  options?: Intl.DateTimeFormatOptions;
}) {
  const [text, setText] = useState(() =>
    new Date(iso).toLocaleString("en-US", { ...options, timeZone: "UTC" })
  );
  useEffect(() => {
    setText(new Date(iso).toLocaleString(undefined, options));
  }, [iso, options]);
  return <span suppressHydrationWarning>{text}</span>;
}
