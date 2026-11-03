import { describe, expect, it, vi } from "vitest";

import type {
  IssueCreationThreadGateway,
  IssueThreadEditGateway,
} from "../../utils/issues/creation-thread";
import {
  buildIssueCreationThreadPayload,
  createLiveIssueThreadEditGateway,
  deliverIssueCreationThread,
  syncIssueThread,
} from "../../utils/issues/creation-thread";

const discordApi = vi.hoisted(() => ({
  get: vi.fn((_route: string, _options?: unknown) =>
    Promise.resolve({ parent_id: "444444444444444444" }),
  ),
  patch: vi.fn((_route: string, _options?: unknown) => Promise.resolve({})),
  post: vi.fn((_route: string, _options?: unknown) =>
    Promise.resolve({ id: "777777777777777777" }),
  ),
}));
vi.mock("@forge/utils/discord", () => ({ api: discordApi }));

// Deliberately different from target.channelId so tests prove the edit uses
// the thread's real parent channel, not the team's current channel.
const parentChannelId = "444444444444444444";

const target = {
  assigneeDiscordUserIds: ["111111111111111111", "222222222222222222"],
  channelId: "333333333333333333",
  description: "Confirm the launch plan and owner handoffs.",
  dueAt: new Date("2026-08-12T03:00:00.000Z"),
  eventId: "44444444-4444-4444-8444-444444444444",
  id: "55555555-5555-4555-8555-555555555555",
  links: ["https://example.com/launch-plan"],
  name: "Launch planning",
  parentId: null,
  priority: "High",
  status: "Planning",
  teamColor: "#93ceff",
  teamDiscordRoleId: "666666666666666666",
  teamName: "Development Team",
  url: "https://blade.test/admin/issues/55555555-5555-4555-8555-555555555555",
} as const;

describe("issue creation Discord threads", () => {
  it("builds bounded thread content and pings only explicit assignees", () => {
    const payload = buildIssueCreationThreadPayload({
      ...target,
      description: `${"Long description. ".repeat(400)} @everyone <@999999999999999999>`,
      name: `${"Launch ".repeat(30)} @here`,
    });

    expect(Array.from(payload.threadName).length).toBeLessThanOrEqual(100);
    const starterEmbed = payload.starter.embeds[0];
    expect(payload.starter.content).toBe("");
    expect(starterEmbed).toMatchObject({
      color: 0x93ceff,
      url: target.url,
    });
    expect(typeof starterEmbed?.title).toBe("string");
    expect(starterEmbed?.description).not.toContain("Open in Blade");
    // TC-EDIT-NEG-001: the Blade overflow link is for edited embeds only.
    expect(starterEmbed?.description).not.toContain(
      "Full description in Blade",
    );
    expect(
      payload.messages.every(({ content }) => content.length <= 2_000),
    ).toBe(true);
    const embedText = [payload.starter, ...payload.messages]
      .flatMap(({ embeds }) => embeds)
      .flatMap((embed) => [
        embed.title ?? "",
        embed.description ?? "",
        ...(embed.fields?.flatMap((field) => [field.name, field.value]) ?? []),
      ])
      .join("\n");
    expect(
      `${embedText}\n${payload.messages.map(({ content }) => content).join("\n")}`,
    ).not.toMatch(/@everyone|<@999999999999999999>/);
    const starterFields = starterEmbed?.fields ?? [];
    expect(
      starterFields.some(
        (field) => field.name === "Team" && field.value === "Development Team",
      ),
    ).toBe(true);
    expect(
      starterFields.some(
        (field) => field.name === "Status" && field.value === "Planning",
      ),
    ).toBe(true);
    expect(payload.messages[0]?.embeds[0]).toMatchObject({
      title: "Description continued",
    });

    const audience = payload.messages.at(-1);
    expect(audience).toMatchObject({
      allowedMentions: {
        parse: [],
        users: ["111111111111111111", "222222222222222222"],
      },
      content: "cc: <@111111111111111111> <@222222222222222222>",
    });
    expect(audience?.allowedMentions).not.toHaveProperty("roles");
  });

  it("falls back to the owning Discord role for an unassigned issue", () => {
    const payload = buildIssueCreationThreadPayload({
      ...target,
      assigneeDiscordUserIds: [],
    });

    expect(payload.messages.at(-1)).toMatchObject({
      allowedMentions: {
        parse: [],
        roles: ["666666666666666666"],
      },
      content: "cc: <@&666666666666666666>",
    });
  });

  it("uses stable delivery keys and sends details inside the attached thread", async () => {
    const starterInputs: Parameters<
      IssueCreationThreadGateway["createStarterMessage"]
    >[0][] = [];
    const threadInputs: Parameters<
      IssueCreationThreadGateway["ensureThread"]
    >[0][] = [];
    const messageInputs: Parameters<
      IssueCreationThreadGateway["sendThreadMessage"]
    >[0][] = [];
    const gateway: IssueCreationThreadGateway = {
      createStarterMessage(input) {
        starterInputs.push(input);
        return Promise.resolve({ id: "777777777777777777" });
      },
      ensureThread(input) {
        threadInputs.push(input);
        return Promise.resolve();
      },
      sendThreadMessage(input) {
        messageInputs.push(input);
        return Promise.resolve();
      },
    };

    const first = await deliverIssueCreationThread(target, gateway);
    const second = await deliverIssueCreationThread(target, gateway);

    expect(first).toEqual({
      starterMessageId: "777777777777777777",
      threadId: "777777777777777777",
    });
    expect(second).toEqual(first);
    expect(starterInputs[0]?.message.nonce).toBe(
      starterInputs[1]?.message.nonce,
    );
    expect(threadInputs).toContainEqual({
      channelId: target.channelId,
      starterMessageId: "777777777777777777",
      threadName: target.name,
    });
    expect(messageInputs.length).toBeGreaterThan(0);
    expect(
      messageInputs.every((input) => input.threadId === "777777777777777777"),
    ).toBe(true);
  });
});

describe("issue Discord image references", () => {
  it("TC-IMG-001 replaces managed image markdown with a link to the issue", () => {
    const payload = buildIssueCreationThreadPayload({
      ...target,
      description:
        "Before\n\n![hamster](/_managed/issue-images/913555f6-8b56-49d1-9294-540a3a811d9e)\n\n![](/_managed/issue-images/913555f6-8b56-49d1-9294-540a3a811d9f)\n\n![*x*_y_](/_managed/issue-images/913555f6-8b56-49d1-9294-540a3a811da0)",
    });

    const description = payload.starter.embeds[0]?.description ?? "";
    expect(description).not.toContain("/_managed/");
    expect(description).toContain(`[🖼 Image: hamster](${target.url})`);
    expect(description).toContain(`[🖼 Image](${target.url})`);
    // Alt text is user input, so markdown in it must not format the link.
    expect(description).toContain(
      String.raw`[🖼 Image: \*x\*\_y\_]` + `(${target.url})`,
    );
  });
});

describe("issue Discord thread edit sync", () => {
  function recordingGateway({
    findStarterChannelId = () => Promise.resolve(parentChannelId),
  }: { findStarterChannelId?: () => Promise<string> } = {}) {
    const lookups: string[] = [];
    const messages: Parameters<
      IssueThreadEditGateway["sendThreadMessage"]
    >[0][] = [];
    const edits: Parameters<IssueThreadEditGateway["editStarterMessage"]>[0][] =
      [];
    const gateway: IssueThreadEditGateway = {
      editStarterMessage(input) {
        edits.push(input);
        return Promise.resolve();
      },
      findStarterChannelId(threadId) {
        lookups.push(threadId);
        return findStarterChannelId();
      },
      sendThreadMessage(input) {
        messages.push(input);
        return Promise.resolve();
      },
    };
    return { edits, gateway, lookups, messages };
  }

  it("TC-EDIT-001 edits the starter message in its thread's parent channel", async () => {
    const { edits, gateway, lookups } = recordingGateway();

    const result = await syncIssueThread(
      {
        after: { ...target, status: "Finished" },
        before: target,
        threadId: "777777777777777777",
      },
      gateway,
    );

    expect(result).toEqual({ status: "updated" });
    expect(lookups).toEqual(["777777777777777777"]);
    expect(edits).toHaveLength(1);
    expect(edits[0]).toMatchObject({
      allowedMentions: { parse: [] },
      channelId: parentChannelId,
      messageId: "777777777777777777",
    });
    expect(edits[0]?.embed.fields).toContainEqual({
      inline: true,
      name: "Status",
      value: "Finished",
    });
  });

  it("TC-EDIT-002 skips Discord when the rendered embed is unchanged", async () => {
    const { edits, gateway, lookups } = recordingGateway();
    // The router passes full issue targets; links live in a follow-up message.
    const relinked = { ...target, links: ["https://example.com/other"] };

    const result = await syncIssueThread(
      {
        after: relinked,
        before: target,
        threadId: "777777777777777777",
      },
      gateway,
    );

    expect(result).toEqual({ status: "unchanged" });
    expect(lookups).toEqual([]);
    expect(edits).toEqual([]);
  });

  it("TC-EDIT-003 links long descriptions back to Blade", async () => {
    const { edits, gateway } = recordingGateway();

    await syncIssueThread(
      {
        after: { ...target, description: "Long description. ".repeat(400) },
        before: target,
        threadId: "777777777777777777",
      },
      gateway,
    );

    const description = edits[0]?.embed.description ?? "";
    expect(description.length).toBeLessThanOrEqual(4_096);
    expect(description).toMatch(
      new RegExp(`\\[Full description in Blade\\]\\(${target.url}\\)$`),
    );
  });

  it("TC-EDIT-004 pings only newly added assignees in the thread", async () => {
    const { gateway, messages } = recordingGateway();

    await syncIssueThread(
      {
        after: {
          ...target,
          assigneeDiscordUserIds: [
            ...target.assigneeDiscordUserIds,
            "888888888888888888",
          ],
        },
        before: target,
        threadId: "777777777777777777",
      },
      gateway,
    );

    expect(messages).toHaveLength(1);
    expect(messages[0]).toMatchObject({
      message: {
        allowedMentions: { parse: [], users: ["888888888888888888"] },
        content: "cc: <@888888888888888888>",
      },
      threadId: "777777777777777777",
    });
  });

  it("TC-EDIT-005 pings a swapped-in assignee even when the embed is unchanged", async () => {
    const { edits, gateway, messages } = recordingGateway();

    const result = await syncIssueThread(
      {
        after: {
          ...target,
          assigneeDiscordUserIds: ["111111111111111111", "888888888888888888"],
        },
        before: target,
        threadId: "777777777777777777",
      },
      gateway,
    );

    expect(result).toEqual({ status: "updated" });
    expect(edits).toEqual([]);
    expect(messages).toHaveLength(1);
    expect(messages[0]?.message).toMatchObject({
      allowedMentions: { parse: [], users: ["888888888888888888"] },
      content: "cc: <@888888888888888888>",
    });
  });

  it("TC-EDIT-006 does not ping when assignees are only removed", async () => {
    const { gateway, messages } = recordingGateway();

    await syncIssueThread(
      {
        after: { ...target, assigneeDiscordUserIds: ["111111111111111111"] },
        before: target,
        threadId: "777777777777777777",
      },
      gateway,
    );

    expect(messages).toEqual([]);
  });

  it("TC-EDIT-007 still pings new assignees when the embed edit fails", async () => {
    const { gateway, messages } = recordingGateway({
      findStarterChannelId: () => Promise.reject(new Error("Unknown Message")),
    });

    await expect(
      syncIssueThread(
        {
          after: {
            ...target,
            assigneeDiscordUserIds: [
              ...target.assigneeDiscordUserIds,
              "888888888888888888",
            ],
            status: "Finished",
          },
          before: target,
          threadId: "777777777777777777",
        },
        gateway,
      ),
    ).rejects.toThrow("Unknown Message");
    expect(messages).toHaveLength(1);
  });

  it("TC-EDIT-008 bounds every live edit-sync Discord request with the abort signal", async () => {
    const signal = new AbortController().signal;
    const gateway = createLiveIssueThreadEditGateway(signal);

    await gateway.findStarterChannelId("777777777777777777");
    await gateway.editStarterMessage({
      allowedMentions: { parse: [] },
      channelId: parentChannelId,
      embed: {},
      messageId: "777777777777777777",
    });
    await gateway.sendThreadMessage({
      message: {
        allowedMentions: { parse: [] },
        content: "cc: <@888888888888888888>",
        embeds: [],
        nonce: "nonce",
      },
      threadId: "777777777777777777",
    });

    for (const call of [
      discordApi.get.mock.calls[0],
      discordApi.patch.mock.calls[0],
      discordApi.post.mock.calls[0],
    ]) {
      expect(call?.[1]).toMatchObject({ signal });
    }
  });
});
