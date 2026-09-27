/**
 * Transactional email via Resend's HTTP API. This is dormant until
 * RESEND_API_KEY is set: sendEmail() then simply returns false and the app runs
 * exactly as before. All failures are swallowed so email can never break a
 * request path (same fail-open philosophy as the rate limiter and LLM).
 */

const RESEND_URL = "https://api.resend.com/emails";

export async function sendEmail(opts: {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
}): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return false; // not configured yet: no-op

  // Resend's shared sandbox sender works with no domain setup; override with a
  // verified domain via EMAIL_FROM once you have one.
  const from = process.env.EMAIL_FROM || "WildAssist <onboarding@resend.dev>";
  const to = Array.isArray(opts.to) ? opts.to : [opts.to];
  if (to.length === 0) return false;

  try {
    const res = await fetch(RESEND_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        from,
        to,
        subject: opts.subject,
        html: opts.html,
        ...(opts.text ? { text: opts.text } : {}),
      }),
      signal: AbortSignal.timeout(8000),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/** Build the "new case routed to your centre" email. */
export function newCaseEmail(args: {
  centreName: string;
  animal: string;
  title: string | null;
  verdict: string;
  dashboardUrl: string;
}): { subject: string; html: string; text: string } {
  const what = `${args.animal}${args.title ? ` - ${args.title}` : ""}`;
  const subject = `New ${args.verdict} case routed to ${args.centreName}`;
  const text = `A new case has been routed to ${args.centreName}.

${what}
Assessment: ${args.verdict}

Open your dashboard to review it: ${args.dashboardUrl}

You are receiving this because you are a staff member at ${args.centreName} on WildAssist.`;
  const html = `<div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;max-width:520px;margin:0 auto;color:#18181b">
  <h2 style="font-size:18px;margin:0 0 4px">New case at ${args.centreName}</h2>
  <p style="color:#52525b;margin:0 0 16px">A report from the public triage tool has been routed to your centre.</p>
  <div style="border:1px solid #e4e4e7;border-radius:12px;padding:16px;margin-bottom:16px">
    <p style="margin:0;font-weight:600;text-transform:capitalize">${what}</p>
    <p style="margin:6px 0 0;color:#52525b">Assessment: ${args.verdict}</p>
  </div>
  <a href="${args.dashboardUrl}" style="display:inline-block;background:#059669;color:#fff;text-decoration:none;padding:10px 18px;border-radius:10px;font-weight:600">Open dashboard</a>
  <p style="color:#a1a1aa;font-size:12px;margin-top:20px">You are receiving this because you are a staff member at ${args.centreName} on WildAssist.</p>
</div>`;
  return { subject, html, text };
}
