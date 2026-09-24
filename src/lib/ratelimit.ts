import { createAdminClient } from "@/lib/supabase/server";

/** Best-effort client IP from the proxy headers. */
export function clientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for") ?? "";
  return fwd.split(",")[0].trim() || "unknown";
}

/**
 * Returns true if the request is allowed, false if the caller has exceeded
 * `max` requests in the `windowSec` window for this bucket. Backed by an atomic
 * Postgres function. Fails OPEN (allows) if the limiter itself errors, so a
 * limiter outage never blocks legitimate users.
 */
export async function rateLimit(
  bucket: string,
  max: number,
  windowSec: number
): Promise<boolean> {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return true;
  try {
    const admin = createAdminClient();
    const { data, error } = await admin.rpc("check_rate_limit", {
      p_bucket: bucket,
      p_max: max,
      p_window: windowSec,
    });
    if (error) return true; // fail open
    return data === true;
  } catch {
    return true; // fail open
  }
}

/** Standard 429 response for a blocked request. */
export function tooMany(retrySec = 60) {
  return Response.json(
    { error: "Too many requests. Please slow down and try again shortly." },
    { status: 429, headers: { "Retry-After": String(retrySec) } }
  );
}
