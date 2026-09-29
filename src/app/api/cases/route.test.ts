import { describe, it, expect, vi, beforeEach } from "vitest";

// Rate limiter mocked so we control allow/deny (and keep next/headers out).
vi.mock("@/lib/ratelimit", () => ({
  rateLimit: vi.fn(async () => true),
  clientIp: () => "test-ip",
  tooMany: () => Response.json({ error: "Too many requests" }, { status: 429 }),
}));

// Admin Supabase client mock. hoisted() lets the factory reference the fn.
const { insertSingle } = vi.hoisted(() => ({ insertSingle: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({
  createAdminClient: () => ({
    from: () => ({
      insert: () => ({ select: () => ({ single: insertSingle }) }),
    }),
  }),
}));

// Email is best-effort; keep it inert.
vi.mock("@/lib/email", () => ({
  sendEmail: vi.fn(async () => false),
  newCaseEmail: () => ({ subject: "", html: "", text: "" }),
}));

import { POST } from "./route";
import { rateLimit } from "@/lib/ratelimit";

const post = (body: unknown) =>
  POST(
    new Request("http://test/api/cases", {
      method: "POST",
      body: typeof body === "string" ? body : JSON.stringify(body),
    }) as never
  );

// No lat/lng → routing and dedup are skipped, so only the insert path runs.
const validBody = { animal: "raccoon", situation: "bleeding", verdict: "help" };

beforeEach(() => {
  vi.mocked(rateLimit).mockResolvedValue(true);
  insertSingle.mockResolvedValue({ data: { id: "case-123" }, error: null });
  process.env.SUPABASE_SERVICE_ROLE_KEY = "test-key";
});

describe("POST /api/cases", () => {
  it("no-ops when the DB isn't configured", async () => {
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    const res = await post(validBody);
    expect(await res.json()).toEqual({ ok: false, reason: "no-db" });
  });

  it("returns 429 when rate limited", async () => {
    vi.mocked(rateLimit).mockResolvedValueOnce(false);
    expect((await post(validBody)).status).toBe(429);
  });

  it("returns 400 for invalid JSON", async () => {
    expect((await post("not json")).status).toBe(400);
  });

  it("returns 400 for invalid case data", async () => {
    // missing animal
    expect((await post({ situation: "bleeding", verdict: "help" })).status).toBe(400);
    // unknown situation
    expect(
      (await post({ animal: "raccoon", situation: "abducted", verdict: "help" })).status
    ).toBe(400);
    // invalid verdict
    expect(
      (await post({ animal: "raccoon", situation: "bleeding", verdict: "banana" })).status
    ).toBe(400);
  });

  it("creates a case with no coords (no routing) and returns id + track token", async () => {
    const res = await post(validBody);
    expect(res.status).toBe(200);
    const d = await res.json();
    expect(d.id).toBe("case-123");
    expect(d.centre).toBeNull();
    expect(d.routingNote).toBeNull();
    expect(typeof d.trackToken).toBe("string");
    expect(d.trackToken.length).toBeGreaterThan(0);
  });

  it("returns 500 when the insert fails", async () => {
    insertSingle.mockResolvedValueOnce({ data: null, error: { message: "boom" } });
    expect((await post(validBody)).status).toBe(500);
  });
});
