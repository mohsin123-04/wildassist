import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";

vi.mock("@/lib/supabase/server", () => ({
  createAdminClient: vi.fn(),
}));

import { POST } from "./route";
import { createAdminClient } from "@/lib/supabase/server";

// Build a chainable Supabase mock for:
//   admin.from("profiles").update(...).eq(...).eq(...).is(...)
// and expose the leaf spies so tests can assert the WHERE clauses that enforce
// "only upgrade a fresh, unclaimed staff profile".
function mockAdmin(result: { error: unknown } = { error: null }) {
  const is = vi.fn().mockResolvedValue(result);
  const eqRole = vi.fn(() => ({ is }));
  const eqId = vi.fn(() => ({ eq: eqRole }));
  const update = vi.fn(() => ({ eq: eqId }));
  const from = vi.fn(() => ({ update }));
  (createAdminClient as Mock).mockReturnValue({ from });
  return { from, update, eqId, eqRole, is };
}

const post = (body: unknown) =>
  POST(
    new Request("http://test/api/register", {
      method: "POST",
      body: typeof body === "string" ? body : JSON.stringify(body),
    })
  );

beforeEach(() => {
  vi.clearAllMocks();
  process.env.SUPABASE_SERVICE_ROLE_KEY = "test-key";
});

describe("POST /api/register", () => {
  it("no-ops without a service role key", async () => {
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    const res = await post({ userId: "u1", role: "volunteer" });
    const data = await res.json();
    expect(data).toEqual({ ok: false, reason: "no-db" });
  });

  it("returns 400 for invalid JSON", async () => {
    mockAdmin();
    expect((await post("nope")).status).toBe(400);
  });

  it("rejects privilege escalation to admin (and any non-staff/volunteer role)", async () => {
    mockAdmin();
    expect((await post({ userId: "u1", role: "admin" })).status).toBe(400);
    expect((await post({ userId: "u1", role: "manager" })).status).toBe(400);
    expect((await post({ userId: "u1" })).status).toBe(400);
  });

  it("only updates a fresh staff profile with no centre (anti-hijack guard)", async () => {
    const m = mockAdmin();
    const res = await post({ userId: "u1", role: "staff" });
    expect(res.status).toBe(200);
    expect(m.from).toHaveBeenCalledWith("profiles");
    expect(m.eqId).toHaveBeenCalledWith("id", "u1");
    expect(m.eqRole).toHaveBeenCalledWith("role", "staff");
    expect(m.is).toHaveBeenCalledWith("centre_id", null);
  });

  it("saves trimmed, length-capped contact details for a volunteer", async () => {
    const m = mockAdmin();
    await post({
      userId: "u2",
      role: "volunteer",
      phone: "  416-555-0000  ",
      city: "Toronto",
      province: "ON",
      country: "Canada",
    });
    const update = m.update.mock.calls[0][0];
    expect(update.role).toBe("volunteer");
    expect(update.phone).toBe("416-555-0000");
    expect(update.city).toBe("Toronto");
  });

  it("stores null (not empty string) for blank volunteer fields", async () => {
    const m = mockAdmin();
    await post({ userId: "u3", role: "volunteer", phone: "   ", city: "" });
    const update = m.update.mock.calls[0][0];
    expect(update.phone).toBeNull();
    expect(update.city).toBeNull();
  });

  it("does not write contact fields for a staff signup", async () => {
    const m = mockAdmin();
    await post({ userId: "u4", role: "staff", phone: "416-555-0000" });
    const update = m.update.mock.calls[0][0];
    expect(update).toEqual({ role: "staff" });
    expect(update.phone).toBeUndefined();
  });

  it("returns 500 when the update errors", async () => {
    mockAdmin({ error: { message: "db down" } });
    const res = await post({ userId: "u5", role: "staff" });
    expect(res.status).toBe(500);
  });
});
