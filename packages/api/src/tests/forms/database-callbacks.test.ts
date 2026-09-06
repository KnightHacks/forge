import { beforeEach, describe, expect, it, vi } from "vitest";

import { db } from "@forge/db/client";

import {
  dispatchFormCallbackExecution,
  enqueueConfiguredFormCallbacks,
} from "../../utils/forms/database-callbacks";
import { formCallbackRouter } from "../../utils/forms/procedures";

const mocks = vi.hoisted(() => ({
  update: vi.fn(),
  select: vi.fn(),
  insert: vi.fn(),
  member: vi.fn(),
  role: vi.fn(),
  post: vi.fn<
    (
      route: string,
      request: {
        body: {
          allowed_mentions: { parse: string[]; roles: string[] };
          content: string;
          embeds: unknown[];
          nonce: string;
          enforce_nonce: boolean;
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
    query: {
      Member: { findFirst: mocks.member },
      Roles: { findFirst: mocks.role },
    },
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
    email: "synthetic@example.invalid",
    gradTerm: "Spring",
    gradYear: 2028,
    major: "Computer Science",
    name: "Test Member",
    team: "Outreach",
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
      id: "20000000-0000-4000-8000-000000000201",
      firstName: "Test",
      lastName: "Member",
      email: "synthetic@example.invalid",
    });
    mocks.role.mockResolvedValue({ teamHexcodeColor: "#88fea1" });
    mocks.channel.mockImplementation((key: string) =>
      Promise.resolve(
        key === "recruiting_channel"
          ? "100000000000000001"
          : "100000000000000002",
      ),
    );
  });

  it("[TC-015] rejects direct callers without an internal execution context", async () => {
    const caller = formCallbackRouter.createCaller({
      headers: new Headers(),
      session: null,
      source: "test",
    });

    await expect(
      caller.notifyRecruiting(execution.input),
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    expect(mocks.post).not.toHaveBeenCalled();
  });

  it("[TC-002, TC-004] enqueues mapped input for a new response before dispatching", async () => {
    mocks.select.mockReturnValueOnce({
      from: () => ({
        where: () =>
          Promise.resolve([
            {
              id: "configuration-1",
              callbackSlug: "recruiting.notify",
              mappings: [
                {
                  inputKey: "name",
                  source: { kind: "respondent", value: "respondent_name" },
                },
                {
                  inputKey: "email",
                  source: {
                    kind: "respondent",
                    value: "respondent_email",
                  },
                },
                {
                  inputKey: "major",
                  source: {
                    kind: "question",
                    questionId: "10000000-0000-4000-8000-000000000201",
                  },
                },
                {
                  inputKey: "gradTerm",
                  source: { kind: "fixed", value: "Spring" },
                },
                {
                  inputKey: "gradYear",
                  source: { kind: "fixed", value: "2028" },
                },
                {
                  inputKey: "team",
                  source: { kind: "fixed", value: "Outreach" },
                },
              ],
            },
          ]),
      }),
    });
    mocks.select.mockReturnValueOnce({
      from: () => ({
        innerJoin: () => ({
          where: () =>
            Promise.resolve([
              {
                authUserId: "40000000-0000-4000-8000-000000000201",
                discordUserId: "123456789012345678",
                email: "synthetic@example.invalid",
                firstName: "Test",
                lastName: "Member",
                memberId: "20000000-0000-4000-8000-000000000201",
              },
            ]),
        }),
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
        "10000000-0000-4000-8000-000000000201": "Computer Science",
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
    expect(mocks.channel).toHaveBeenCalledWith("outreach_director_role");
    const call = mocks.post.mock.calls[0];
    if (!call) throw new Error("Expected one provider request");
    const [route, request] = call;
    expect(route).toBe("/channels/100000000000000001/messages");
    expect(request.body.allowed_mentions).toEqual({
      parse: [],
      roles: ["100000000000000002"],
    });
    expect(request.body.enforce_nonce).toBe(true);
    expect(request.body.nonce).toMatch(/^[A-Za-z0-9_-]{22}$/);
    expect(request.body.content).toContain("New Applicant for Outreach");
    expect(request.body.embeds).toHaveLength(1);
    const embed = request.body.embeds[0] as {
      color: number;
      description: string;
      fields: { inline: boolean; name: string; value: string }[];
      footer: { text: string };
      title: string;
    };
    expect(embed).toMatchObject({
      color: 0x88fea1,
      description:
        "A new applicant is interested in joining the **Outreach** team.\n\nPlease see details below:",
      fields: [
        { inline: true, name: "Name", value: "Test Member" },
        {
          inline: true,
          name: "Email",
          value: "synthetic@example.invalid",
        },
        { inline: true, name: "Major", value: "Computer Science" },
        { inline: true, name: "Grad Term", value: "Spring" },
        { inline: true, name: "Grad Year", value: "2028" },
        { inline: true, name: "Team", value: "Outreach" },
      ],
      title: "Test Member's Application",
    });
    expect(embed.footer.text).toMatch(/^Submitted at: /);
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
    expect(mocks.post.mock.calls[0]?.[1].body.nonce).toBe(
      mocks.post.mock.calls[1]?.[1].body.nonce,
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
