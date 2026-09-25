/**
 * Show a brief toast message. Works across client navigation (custom event)
 * and full reloads (sessionStorage fallback). Call from client components.
 */
export function flash(message: string) {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem("wa_flash", message);
  } catch {
    // ignore
  }
  window.dispatchEvent(new CustomEvent("wa-flash", { detail: message }));
}
