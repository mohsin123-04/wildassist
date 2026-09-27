import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { sendEmail, newCaseEmail } from "../email";

describe("sendEmail()", () => {
  const realFetch = globalThis.fetch;
  beforeEach(() => {
    delete process.env.RESEND_API_KEY;
  });
  afterEach(() => {
    globalThis.fetch = realFetch;
    vi.restoreAllMocks();
  });

  it("no-ops (returns false) without an API key, and never calls fetch", async () => {
    const spy = vi.fn();
    globalThis.fetch = spy as unknown as typeof fetch;
    const ok = await sendEmail({ to: "a@b.com", subject: "x", html: "<p>x</p>" });
    expect(ok).toBe(false);
    expect(spy).not.toHaveBeenCalled();
  });

  it("posts to Resend when configured and returns success", async () => {
    process.env.RESEND_API_KEY = "test";
    const spy = vi.fn(async () => new Response(null, { status: 200 }));
    globalThis.fetch = spy as unknown as typeof fetch;
    const ok = await sendEmail({ to: ["a@b.com"], subject: "hi", html: "<p>hi</p>" });
    expect(ok).toBe(true);
    expect(spy).toHaveBeenCalledOnce();
    const [, init] = spy.mock.calls[0];
    expect(init.method).toBe("POST");
    expect(init.headers.Authorization).toBe("Bearer test");
  });

  it("returns false for an empty recipient list without calling fetch", async () => {
    process.env.RESEND_API_KEY = "test";
    const spy = vi.fn();
    globalThis.fetch = spy as unknown as typeof fetch;
    expect(await sendEmail({ to: [], subject: "x", html: "x" })).toBe(false);
    expect(spy).not.toHaveBeenCalled();
  });

  it("fails soft (returns false) when fetch throws", async () => {
    process.env.RESEND_API_KEY = "test";
    globalThis.fetch = (() => {
      throw new Error("network");
    }) as unknown as typeof fetch;
    expect(await sendEmail({ to: "a@b.com", subject: "x", html: "x" })).toBe(false);
  });
});

describe("newCaseEmail()", () => {
  it("builds a subject and body mentioning the centre, animal, and verdict", () => {
    const m = newCaseEmail({
      centreName: "Toronto Wildlife Centre",
      animal: "bird",
      title: "Hit a window",
      verdict: "help",
      dashboardUrl: "https://wildassist.vercel.app/dashboard",
    });
    expect(m.subject).toContain("Toronto Wildlife Centre");
    expect(m.subject).toContain("help");
    expect(m.html).toContain("Hit a window");
    expect(m.html).toContain("https://wildassist.vercel.app/dashboard");
    expect(m.text).toContain("bird");
  });
});
