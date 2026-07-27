import { describe, expect, it } from "vitest";

import {
  discordArchiveChannelInputSchema,
  discordArchiveHealthInputSchema,
  discordArchiveMessageInputSchema,
  discordSnowflakeSchema,
} from "../discord-archive";

const message = {
  applicationId: null,
  attachments: [
    {
      contentType: "image/png",
      filename: "diagram.png",
      height: 720,
      id: "111111111111111114",
      size: 12_345,
      url: "https://cdn.discordapp.com/attachments/a/b/diagram.png",
      width: 1280,
    },
  ],
  authorAvatarUrl: null,
  authorDiscordUserId: "111111111111111113",
  authorIsBot: false,
  authorLabel: "Member",
  channelId: "111111111111111112",
  components: [],
  content: "hello archive",
  createdAt: new Date("2026-07-26T12:00:00.000Z"),
  editedAt: null,
  embeds: [],
  flags: "0",
  guildId: "111111111111111111",
  id: "999999999999999999",
  mentionEveryone: false,
  mentionedRoleIds: [],
  mentionedUserIds: [],
  messageType: 0,
  pinned: false,
  poll: null,
  replyToMessageId: null,
  stickers: [],
  webhookId: null,
} as const;

describe("Discord archive contracts", () => {
  it("TC-001 preserves snowflakes above the safe integer range", () => {
    expect(discordSnowflakeSchema.parse("999999999999999999")).toBe(
      "999999999999999999",
    );
    // The literal is deliberately past Number.MAX_SAFE_INTEGER: this asserts the
    // schema rejects numeric snowflakes precisely because JavaScript cannot hold
    // one. Formatting it as a safe number would delete the case being tested.
    // eslint-disable-next-line no-loss-of-precision
    expect(() => discordSnowflakeSchema.parse(999999999999999999)).toThrow();
    expect(() => discordSnowflakeSchema.parse("not-a-snowflake")).toThrow();
  });

  it("TC-002 accepts the bounded current-state projection", () => {
    expect(discordArchiveMessageInputSchema.parse(message)).toEqual(message);
    expect(
      discordArchiveChannelInputSchema.parse({
        archived: false,
        discordUpdatedAt: new Date("2026-07-26T12:00:00.000Z"),
        guildId: message.guildId,
        id: message.channelId,
        isPrivateThread: false,
        isThread: false,
        locked: false,
        name: "general",
        parentId: null,
        topic: null,
        type: 0,
      }),
    ).toMatchObject({ name: "general", type: 0 });
  });

  it("TC-003 rejects raw payloads and oversized content metadata", () => {
    expect(() =>
      discordArchiveMessageInputSchema.parse({
        ...message,
        raw: { token: "no" },
      }),
    ).toThrow();
    expect(() =>
      discordArchiveMessageInputSchema.parse({
        ...message,
        attachments: Array.from({ length: 101 }, (_, index) => ({
          ...message.attachments[0],
          id: String(111111111111111114n + BigInt(index)),
        })),
      }),
    ).toThrow();
    expect(() =>
      discordArchiveMessageInputSchema.parse({
        ...message,
        content: "x".repeat(40_001),
      }),
    ).toThrow();
  });

  it("TC-031 bounds archive health pagination", () => {
    expect(discordArchiveHealthInputSchema.parse({})).toEqual({ limit: 50 });
    expect(() =>
      discordArchiveHealthInputSchema.parse({ limit: 101 }),
    ).toThrow();
    expect(() =>
      discordArchiveHealthInputSchema.parse({ search: "x".repeat(101) }),
    ).toThrow();
  });
});
