import { afterEach, describe, expect, it, vi } from "vitest";

import { listmonkHttpTransport } from "../index";

vi.mock("../env", () => ({
  env: {
    LISTMONK_FROM_EMAIL: "sender@example.test",
    LISTMONK_TOKEN: "synthetic-token",
    LISTMONK_URL: "https://provider.example.test",
    LISTMONK_USER: "synthetic-user",
    NODE_ENV: "test",
  },
}));

afterEach(() => vi.unstubAllGlobals());

describe("provider request deadlines", () => {
  it.each([
    "/api/subscribers",
    "/api/campaigns/7/status",
    "/api/lists",
    "/api/templates",
    "/api/tx",
  ])("bounds %s requests", async (path) => {
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockResolvedValue(new Response(JSON.stringify({ data: true })));
    vi.stubGlobal("fetch", fetch);
    await listmonkHttpTransport({ method: "GET", path });
    expect(fetch.mock.calls[0]?.[1]?.signal).toBeInstanceOf(AbortSignal);
  });
});
