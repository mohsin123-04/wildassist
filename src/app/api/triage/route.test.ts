import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the rate limiter so we control allow/deny without touching Supabase.
// (Mocking the whole module also keeps next/headers out of the test.)
vi.mock("@/lib/ratelimit", () => ({
  rateLimit: vi.fn(async () => true),
  clientIp: () => "test-ip",
  tooMany: () =>
    Response.json({ error: "Too many requests" }, { status: 429 }),
}));

import { POST } from "./route";
import { rateLimit } from "@/lib/ratelimit";

const post = (body: unknown) =>
  POST(
    new Request("http://test/api/triage", {
      method: "POST",
      body: typeof body === "string" ? body : JSON.stringify(body),
    }) as never
  );

beforeEach(() => {
  vi.mocked(rateLimit).mockResolvedValue(true);
  // No LLM key -> the endpoint uses the deterministic rules path.
  delete process.env.GROQ_API_KEY;
});

describe("POST /api/triage", () => {
  it("returns 429 when rate limited", async () => {
    vi.mocked(rateLimit).mockResolvedValueOnce(false);
    const res = await post({ animal: "bird", situation: "bleeding" });
    expect(res.status).toBe(429);
  });

  it("returns 400 for an invalid JSON body", async () => {
    const res = await post("not json");
    expect(res.status).toBe(400);
  });

  it("returns 400 for a missing or unknown animal/situation", async () => {
    expect((await post({ situation: "bleeding" })).status).toBe(400);
    expect((await post({ animal: "dragon", situation: "bleeding" })).status).toBe(400);
    expect((await post({ animal: "bird", situation: "abducted" })).status).toBe(400);
  });

  it("returns a rules-based recommendation for a valid request", async () => {
    const res = await post({ animal: "bird", situation: "bleeding" });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.source).toBe("rules");
    expect(data.verdict).toBe("help");
    expect(Array.isArray(data.steps)).toBe(true);
    expect(data.steps.length).toBeGreaterThan(0);
  });

  it("carries the rules verdict for a leave-it-alone case", async () => {
    const res = await post({ animal: "mammal", situation: "looks-fine-worried" });
    const data = await res.json();
    expect(data.verdict).toBe("leave");
    expect(data.showContactCentre).toBe(false);
  });
});
