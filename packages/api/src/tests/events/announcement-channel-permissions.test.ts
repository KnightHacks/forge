import type { APIOverwrite } from "discord-api-types/v10";
import {
  ChannelType,
  OverwriteType,
  PermissionFlagsBits,
  Routes,
} from "discord-api-types/v10";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { liveRoleDiscordGateway } from "../../utils/roles/discord-gateway";

const guildId = "990000000000000501";
const channelId = "990000000000000502";
const botId = "990000000000000503";
const roleId = "990000000000000504";
const required =
  PermissionFlagsBits.ViewChannel |
  PermissionFlagsBits.SendMessages |
  PermissionFlagsBits.EmbedLinks;
const { get } = vi.hoisted(() => ({ get: vi.fn() }));
vi.mock("@forge/utils/discord", () => ({
  api: { get },
  addRoleToMember: vi.fn(),
  removeRoleFromMember: vi.fn(),
}));
vi.mock("@forge/utils/discord-config", () => ({
  getKnightHacksGuildId: () => Promise.resolve("990000000000000501"),
}));

function overwrite(
  id: string,
  deny: bigint,
  allow = 0n,
  type: OverwriteType = OverwriteType.Role,
): APIOverwrite {
  return { id, deny: deny.toString(), allow: allow.toString(), type };
}

function fixture({
  overwrites = [],
  permissions = required,
  type = ChannelType.GuildText,
  guild = guildId,
}: {
  overwrites?: APIOverwrite[];
  permissions?: bigint;
  type?: ChannelType;
  guild?: string;
} = {}) {
  const channel = {
    id: channelId,
    guild_id: guild,
    name: "announcements",
    type,
    permission_overwrites: overwrites,
  };
  get.mockImplementation((route: string) => {
    if (route === Routes.channel(channelId)) return Promise.resolve(channel);
    if (route === Routes.guildChannels(guildId))
      return Promise.resolve([channel]);
    if (route === Routes.user()) return Promise.resolve({ id: botId });
    if (route === Routes.guildMember(guildId, botId))
      return Promise.resolve({ user: { id: botId }, roles: [roleId] });
    if (route === Routes.guildRoles(guildId))
      return Promise.resolve([
        { id: guildId, permissions: permissions.toString() },
        { id: roleId, permissions: "0" },
      ]);
    throw new Error(`Unexpected Discord route: ${route}`);
  });
}

describe("announcement channel bot permissions", () => {
  beforeEach(() => {
    get.mockReset();
    fixture();
  });

  it.each([
    [
      "missing base Send Messages",
      { permissions: PermissionFlagsBits.ViewChannel },
    ],
    [
      "missing base Embed Links",
      {
        permissions:
          PermissionFlagsBits.ViewChannel | PermissionFlagsBits.SendMessages,
      },
    ],
    [
      "bot role denies Embed Links",
      { overwrites: [overwrite(roleId, PermissionFlagsBits.EmbedLinks)] },
    ],
    [
      "member denies Embed Links",
      {
        overwrites: [
          overwrite(
            botId,
            PermissionFlagsBits.EmbedLinks,
            0n,
            OverwriteType.Member,
          ),
        ],
      },
    ],
    [
      "everyone denies View Channel",
      { overwrites: [overwrite(guildId, PermissionFlagsBits.ViewChannel)] },
    ],
    [
      "bot role denies Send Messages",
      { overwrites: [overwrite(roleId, PermissionFlagsBits.SendMessages)] },
    ],
    [
      "role denial beats everyone allowance",
      {
        overwrites: [
          overwrite(guildId, 0n, required),
          overwrite(roleId, PermissionFlagsBits.SendMessages),
        ],
      },
    ],
    [
      "member denial beats role allowance",
      {
        overwrites: [
          overwrite(roleId, 0n, required),
          overwrite(
            botId,
            PermissionFlagsBits.SendMessages,
            0n,
            OverwriteType.Member,
          ),
        ],
      },
    ],
    ["channel belongs to another guild", { guild: "990000000000000599" }],
    ["voice channel", { type: ChannelType.GuildVoice }],
  ])("rejects and omits a channel when %s", async (_name, settings) => {
    fixture(settings);
    await expect(
      liveRoleDiscordGateway.validateTextChannel?.(channelId, {
        requireSendPermission: true,
      }),
    ).resolves.toBe(false);
    await expect(
      liveRoleDiscordGateway.getGuildTextChannels?.({
        requireSendPermission: true,
      }),
    ).resolves.toEqual([]);
  });

  it.each([
    ["base permissions", {}],
    ["announcement channel", { type: ChannelType.GuildAnnouncement }],
    [
      "role allowance after everyone denial",
      {
        overwrites: [
          overwrite(guildId, required),
          overwrite(roleId, 0n, required),
        ],
      },
    ],
    [
      "member allowance after role denial",
      {
        overwrites: [
          overwrite(roleId, required),
          overwrite(botId, 0n, required, OverwriteType.Member),
        ],
      },
    ],
    [
      "administrator bypasses overwrites",
      {
        permissions: PermissionFlagsBits.Administrator,
        overwrites: [overwrite(botId, required, 0n, OverwriteType.Member)],
      },
    ],
  ])("accepts a writable channel with %s", async (_name, settings) => {
    fixture(settings);
    await expect(
      liveRoleDiscordGateway.validateTextChannel?.(channelId, {
        requireSendPermission: true,
      }),
    ).resolves.toBe(true);
    await expect(
      liveRoleDiscordGateway.getGuildTextChannels?.({
        requireSendPermission: true,
      }),
    ).resolves.toEqual([{ id: channelId, name: "announcements" }]);
    expect(get).toHaveBeenCalledWith(Routes.guildMember(guildId, botId));
  });

  it("preserves ordinary channel validation for existing callers", async () => {
    fixture({ permissions: 0n });
    await expect(
      liveRoleDiscordGateway.validateTextChannel?.(channelId),
    ).resolves.toBe(true);
    await expect(
      liveRoleDiscordGateway.getGuildTextChannels?.(),
    ).resolves.toEqual([{ id: channelId, name: "announcements" }]);
    expect(get).not.toHaveBeenCalledWith(Routes.user());
  });

  it("rejects when bot membership cannot be read", async () => {
    get.mockRejectedValue(new Error("Discord unavailable"));
    await expect(
      liveRoleDiscordGateway.validateTextChannel?.(channelId, {
        requireSendPermission: true,
      }),
    ).resolves.toBe(false);
  });
});
