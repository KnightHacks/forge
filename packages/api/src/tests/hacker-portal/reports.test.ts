import { beforeEach, describe, expect, it, vi } from "vitest";

import type { HackerPortalContext } from "../../hacker-portal/trpc";
import { reportIssue } from "../../hacker-portal/reports";

const mocks = vi.hoisted(() => ({
  post: vi.fn(),
  settings: vi.fn(),
  application: vi.fn(),
  event: vi.fn(),
  user: vi.fn(),
  recent: vi.fn(),
  updated: vi.fn(),
  transactionCommitted: false,
}));
vi.mock("@forge/utils/discord", () => ({ api: { post: mocks.post } }));
vi.mock("../../hacker-portal/data", () => ({
  loadParticipantApplication: mocks.application,
  requirePortalHackathon: mocks.event,
}));
vi.mock("@forge/db/client", () => ({
  db: {
    query: {
      User: { findFirst: mocks.user },
      Hackathon: { findFirst: mocks.settings },
    },
    transaction: async (work: (tx: object) => Promise<object>) => {
      const selectQuery = {
        from: () => selectQuery,
        where: () => selectQuery,
        limit: mocks.recent,
      };
      const insertQuery = {
        values: () => insertQuery,
        onConflictDoNothing: () => insertQuery,
        returning: () => Promise.resolve([{ id: "report-command" }]),
      };
      const result = await work({
        execute: vi.fn(),
        insert: () => insertQuery,
        select: () => selectQuery,
      });
      mocks.transactionCommitted = true;
      return result;
    },
    update: () => ({ set: () => ({ where: mocks.updated }) }),
  },
}));

const context: HackerPortalContext = {
  client: {
    id: "portal",
    clientId: "public-client",
    hackathonId: "event",
    origin: "https://2026.knighthacks.org",
    enabled: true,
  },
  session: {
    id: "session",
    clientRecordId: "portal",
    betterAuthSessionId: "blade-session",
    userId: "hacker",
    hackathonId: "event",
  },
  headers: new Headers(),
  requestId: "test",
};
const input = {
  description: "The elevator is broken @everyone",
  idempotencyKey: "report-1",
};

describe("hacker issue reports", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.application.mockResolvedValue({ status: "confirmed" });
    mocks.event.mockResolvedValue({ displayName: "Knight Hacks IX" });
    mocks.user.mockResolvedValue({
      name: "Hacker",
      discordUserId: "123456789012345678",
    });
    mocks.settings.mockResolvedValue({
      issueReportsChannelId: "234567890123456789",
      issueReportsRoleId: "345678901234567890",
    });
    mocks.recent.mockResolvedValue([]);
    mocks.updated.mockResolvedValue([]);
    mocks.transactionCommitted = false;
    mocks.post.mockResolvedValue({ id: "message" });
  });
  it("delivers the report with server-derived event/reporter and suppresses mentions", async () => {
    mocks.post.mockImplementationOnce(() => {
      expect(mocks.transactionCommitted).toBe(true);
      return Promise.resolve({ id: "message" });
    });
    await expect(reportIssue(context, input)).resolves.toEqual({
      submitted: true,
    });
    expect(mocks.post.mock.calls[0]?.[0]).toBe(
      "/channels/234567890123456789/messages",
    );
    const request: unknown = mocks.post.mock.calls[0]?.[1];
    expect(request).toMatchObject({
      body: {
        content: "<@&345678901234567890>",
        allowed_mentions: { parse: [], roles: ["345678901234567890"] },
        enforce_nonce: true,
        embeds: [{ description: input.description }],
      },
    });
  });
  it("does not claim success when the channel is missing or Discord rejects delivery", async () => {
    mocks.settings.mockResolvedValueOnce({
      issueReportsChannelId: null,
      issueReportsRoleId: null,
    });
    await expect(reportIssue(context, input)).rejects.toThrow("not configured");
    expect(mocks.post).not.toHaveBeenCalled();
    mocks.post.mockRejectedValueOnce(new Error("403"));
    await expect(reportIssue(context, input)).rejects.toThrow(
      "could not be delivered",
    );
  });
  it("sends without a ping when no role is configured", async () => {
    mocks.settings.mockResolvedValueOnce({
      issueReportsChannelId: "234567890123456789",
      issueReportsRoleId: null,
    });
    await reportIssue(context, input);
    const request: unknown = mocks.post.mock.calls[0]?.[1];
    expect(request).toMatchObject({
      body: { allowed_mentions: { parse: [], roles: [] } },
    });
  });
  it("rejects unauthenticated/non-participant reports and enforces the report limit", async () => {
    await expect(
      reportIssue({ ...context, session: null }, input),
    ).rejects.toThrow("Sign in");
    mocks.application.mockResolvedValueOnce(null);
    await expect(reportIssue(context, input)).rejects.toThrow("Apply");
    mocks.recent.mockResolvedValue(
      Array.from({ length: 6 }, (_, id) => ({ id })),
    );
    await expect(reportIssue(context, input)).rejects.toThrow("five reports");
    expect(mocks.post).not.toHaveBeenCalled();
  });
});
