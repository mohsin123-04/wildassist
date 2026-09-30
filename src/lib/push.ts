/**
 * Web-push delivery. Dormant until the VAPID env vars are set; every failure is
 * swallowed so a push problem can never break a request path (same fail-open
 * philosophy as email and the rate limiter). Expired/revoked subscriptions
 * (404/410 from the push service) are deleted so the table self-cleans.
 */

import webpush from "web-push";
import { createAdminClient } from "@/lib/supabase/server";

export interface PushPayload {
  title: string;
  body: string;
  /** Same-site path to open when the notification is clicked. */
  url: string;
}

function configured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY &&
      process.env.VAPID_PRIVATE_KEY &&
      process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

/** Send a notification to every registered device of the given users. */
export async function sendPushToUsers(
  userIds: string[],
  payload: PushPayload
): Promise<void> {
  if (!configured() || userIds.length === 0) return;
  try {
    webpush.setVapidDetails(
      process.env.VAPID_SUBJECT || "mailto:admin@wildassist.app",
      process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
      process.env.VAPID_PRIVATE_KEY!
    );

    const admin = createAdminClient();
    const { data: subs } = await admin
      .from("push_subscriptions")
      .select("id, endpoint, p256dh, auth")
      .in("user_id", userIds);
    if (!subs || subs.length === 0) return;

    const body = JSON.stringify(payload);
    const dead: string[] = [];
    await Promise.all(
      subs.map(async (s) => {
        try {
          await webpush.sendNotification(
            { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
            body,
            { TTL: 60 * 60 }
          );
        } catch (e) {
          const code = (e as { statusCode?: number }).statusCode;
          if (code === 404 || code === 410) dead.push(s.id);
        }
      })
    );
    if (dead.length) {
      await admin.from("push_subscriptions").delete().in("id", dead);
    }
  } catch {
    // Never let push problems affect the caller.
  }
}
