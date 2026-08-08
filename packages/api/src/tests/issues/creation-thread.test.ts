import { describe, expect, it } from "vitest";

import type { IssueCreationThreadGateway } from "../../utils/issues/creation-thread";
import {
  buildIssueCreationThreadPayload,
  deliverIssueCreationThread,
} from "../../utils/issues/creation-thread";

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
