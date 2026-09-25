import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
  createAdminClient: vi.fn(() => ({})),
}));

import { POST } from "./route";
import { createClient } from "@/lib/supabase/server";

// Fake the auth'd client: `user` is who getUser() returns, `canAccess` is the
// can_access_conversation RPC result.
function mockClient(opts: { user: unknown; canAccess?: boolean }) {
  (createClient as Mock).mockResolvedValue({
    auth: { getUser: async () => ({ data: { user: opts.user } }) },
    rpc: async () => ({ data: opts.canAccess ?? null }),
  });
}

const post = (body: unknown) =>
  POST(
    new Request("http://test/api/share-case", {
      method: "POST",
      body: JSON.stringify(body),
    })
  );

beforeEach(() => vi.clearAllMocks());

describe("POST /api/share-case guards", () => {
  it("401s when not signed in", async () => {
    mockClient({ user: null });
    expect((await post({ caseId: "c1", conversationId: "v1" })).status).toBe(401);
  });

  it("400s when caseId or conversationId is missing", async () => {
    mockClient({ user: { id: "u1" } });
    expect((await post({ caseId: "c1" })).status).toBe(400);
    expect((await post({ conversationId: "v1" })).status).toBe(400);
  });

  it("403s when the user is not a member of the target conversation", async () => {
    mockClient({ user: { id: "u1" }, canAccess: false });
    const res = await post({ caseId: "c1", conversationId: "v1" });
    expect(res.status).toBe(403);
  });
});
