import { beforeEach, describe, expect, it, vi } from "vitest";

import { db } from "@forge/db/client";

import {
  dispatchFormCallbackExecution,
  enqueueConfiguredFormCallbacks,
} from "../../utils/forms/database-callbacks";

const mocks = vi.hoisted(() => ({
  update: vi.fn(),
  select: vi.fn(),
  insert: vi.fn(),
  member: vi.fn(),
  post: vi.fn<
    (
      route: string,
      request: {
        body: {
          content: string;
          nonce: string;
          enforce_nonce: boolean;
          allowed_mentions: { parse: string[] };
        };
      },
    ) => Promise<unknown>
  >(),
  channel: vi.fn(),
}));

vi.mock("@forge/db/client", () => ({
  db: {
    update: mocks.update,
    select: mocks.select,
    insert: mocks.insert,
    query: { Member: { findFirst: mocks.member } },
  },
}));
vi.mock("@forge/utils/discord", () => ({ api: { post: mocks.post } }));
vi.mock("@forge/utils/discord-config", () => ({
  getDiscordConfigId: mocks.channel,
}));
vi.mock("../../utils/roles/discord-gateway", () => ({
  liveRoleDiscordGateway: {},
}));

const executionId = "30000000-0000-4000-8000-000000000201";
const execution = {
  id: executionId,
  callbackSlug: "recruiting.notify",
  input: {
    memberId: "20000000-0000-4000-8000-000000000201",
    note: "Synthetic test note",
  },
};

function mockUpdate(rows: unknown[]) {
  const set = vi.fn(() => ({
    where: vi.fn(() => ({ returning: vi.fn().mockResolvedValue(rows) })),
  }));
  mocks.update.mockReturnValueOnce({ set });
  return set;
}

describe("recruiting Discord delivery boundary", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.member.mockResolvedValue({
      id: execution.input.memberId,
      firstName: "Test",
      lastName: "Member",
      email: "synthetic@example.invalid",
    });
    mocks.channel.mockResolvedValue("100000000000000001");
  });

  it("[TC-002, TC-004] enqueues mapped input for a new response before dispatching", async () => {
    mocks.select.mockReturnValue({
      from: () => ({
        where: () =>
          Promise.resolve([
            {
              id: "configuration-1",
              callbackSlug: "recruiting.notify",
              mappings: [
                {
                  inputKey: "memberId",
                  source: { kind: "system", value: "member_id" },
                },
                {
                  inputKey: "note",
                  source: {
                    kind: "question",
                    questionId: "10000000-0000-4000-8000-000000000201",
                  },
                },
              ],
            },
          ]),
      }),
    });
    const values = vi.fn((value: Record<string, unknown>) => ({
      returning: () => Promise.resolve([{ ...execution, ...value }]),
    }));
    mocks.insert.mockReturnValue({ values });
    const rows = await enqueueConfiguredFormCallbacks({
      database: db,
      formId: "form-1",
      responseId: "response-1",
      userId: "user-1",
      submittedAt: new Date("2026-08-01T12:00:00Z"),
      answers: {
        "10000000-0000-4000-8000-000000000201": "Synthetic test note",
      },
    });
    expect(values).toHaveBeenCalledWith({
      callbackSlug: "recruiting.notify",
      configurationId: "configuration-1",
      input: execution.input,
      lastError: null,
      responseId: "response-1",
      status: "pending",
    });
    expect(mocks.post).not.toHaveBeenCalled();
    mockUpdate(rows);
    mockUpdate([{ id: executionId }]);
    await expect(dispatchFormCallbackExecution(executionId)).resolves.toEqual({
      status: "succeeded",
    });
    expect(mocks.post).toHaveBeenCalledTimes(1);
  });

  it("[TC-004] does not enqueue or send without active configuration", async () => {
    mocks.select.mockReturnValue({
      from: () => ({ where: () => Promise.resolve([]) }),
    });
    await expect(
      enqueueConfiguredFormCallbacks({
        database: db,
        formId: "form-1",
        responseId: "response-1",
        userId: "user-1",
        submittedAt: new Date("2026-08-01T12:00:00Z"),
        answers: {},
      }),
    ).resolves.toEqual([]);
    expect(mocks.insert).not.toHaveBeenCalled();
    expect(mocks.post).not.toHaveBeenCalled();
  });

  it("[TC-002] sends a provider-compliant nonce through the actual dispatcher", async () => {
    mockUpdate([execution]);
    const complete = mockUpdate([{ id: executionId }]);
    mocks.post.mockImplementation(
      (_route: string, request: { body: { nonce: string } }) => {
        if (request.body.nonce.length > 25)
          return Promise.reject(new Error("NONCE_TYPE_TOO_LONG"));
        return Promise.resolve({});
      },
    );

    await expect(dispatchFormCallbackExecution(executionId)).resolves.toEqual({
      status: "succeeded",
    });
    expect(mocks.channel).toHaveBeenCalledWith("recruiting_channel");
    const call = mocks.post.mock.calls[0];
    if (!call) throw new Error("Expected one provider request");
    const [route, request] = call;
    expect(route).toBe("/channels/100000000000000001/messages");
    expect(request.body.allowed_mentions).toEqual({ parse: [] });
    expect(request.body.enforce_nonce).toBe(true);
    expect(request.body.nonce).toMatch(/^[A-Za-z0-9_-]{22}$/);
    expect(request.body.content).toContain("Synthetic test note");
    expect(complete).toHaveBeenCalledWith(
      expect.objectContaining({ status: "succeeded", leaseToken: null }),
    );
  });

  it("[TC-003] records provider failure and reuses the nonce on retry", async () => {
    mockUpdate([execution]);
    const failed = mockUpdate([{ id: executionId }]);
    mockUpdate([execution]);
    mockUpdate([{ id: executionId }]);
    mocks.post
      .mockRejectedValueOnce(new Error("Provider unavailable"))
      .mockResolvedValueOnce({});
    await expect(dispatchFormCallbackExecution(executionId)).resolves.toEqual({
      status: "failed",
      error: "Provider unavailable",
    });
    expect(failed).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "failed",
        lastError: "Provider unavailable",
      }),
    );
    await expect(dispatchFormCallbackExecution(executionId)).resolves.toEqual({
      status: "succeeded",
    });
    expect(mocks.post.mock.calls[0]?.[1]).toEqual(
      mocks.post.mock.calls[1]?.[1],
    );
  });

  it("[TC-003] does not send when the database refuses the claim", async () => {
    mockUpdate([]);
    await expect(
      dispatchFormCallbackExecution(executionId),
    ).resolves.toBeNull();
    expect(mocks.post).not.toHaveBeenCalled();
  });

  it("[TC-001] rejects malformed execution identity before sending", async () => {
    mockUpdate([{ ...execution, id: "invalid" }]);
    mockUpdate([{ id: "invalid" }]);
    await expect(
      dispatchFormCallbackExecution("invalid"),
    ).resolves.toMatchObject({ status: "failed" });
    expect(mocks.post).not.toHaveBeenCalled();
  });

  it("[TC-003] does not report success after a lost completion lease", async () => {
    mockUpdate([execution]);
    mockUpdate([]);
    await expect(dispatchFormCallbackExecution(executionId)).resolves.toEqual({
      status: "superseded",
    });
  });
});
