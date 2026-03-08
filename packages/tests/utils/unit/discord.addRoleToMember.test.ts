import { Routes } from "discord-api-types/v10";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { DISCORD } from "@forge/consts";

// Mock the REST client
const mockPut = vi.fn();
const mockDelete = vi.fn();
const mockGet = vi.fn();
const mockPost = vi.fn();

vi.mock("@discordjs/rest", () => ({
  REST: vi.fn().mockImplementation(() => ({
    put: mockPut,
    delete: mockDelete,
    get: mockGet,
    post: mockPost,
    setToken: vi.fn().mockReturnThis(),
  })),
}));

describe("discord.addRoleToMember", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should call Discord API to add role to member", async () => {
    const { addRoleToMember } = await import("@forge/utils/discord");

    const discordUserId = "123456789012345678";
    const roleId = "987654321098765432";

    await addRoleToMember(discordUserId, roleId);

    expect(mockPut).toHaveBeenCalledWith(
      Routes.guildMemberRole(DISCORD.KNIGHTHACKS_GUILD, discordUserId, roleId),
    );
  });

  it("should use the correct guild ID (dev guild when not in production)", async () => {
    const { addRoleToMember } = await import("@forge/utils/discord");

    const discordUserId = "123456789012345678";
    const roleId = "987654321098765432";

    await addRoleToMember(discordUserId, roleId);

    // Verify it uses the dev guild (which is the default when IS_PROD is false)
    expect(mockPut).toHaveBeenCalledWith(
      Routes.guildMemberRole(
        DISCORD.DEV_KNIGHTHACKS_GUILD,
        discordUserId,
        roleId,
      ),
    );
  });
});
